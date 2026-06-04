// =========================================================================
//  Touch.cpp — Waveshare ESP32-S3-Touch-AMOLED-1.43 (FT3168 variant)
// =========================================================================
//
//  Drop-in replacement for the LCD-1.28 src/hal/Touch.cpp. The chip
//  changes from CST816S to FT3168 — both single-touch capacitive,
//  both speak I2C, but the register map is different and FT3168
//  doesn't expose a one-byte "gesture register" the way CST816S
//  does. We fall back to coordinate-based gesture decoding (swipe
//  direction from start→end delta) which we already use in the
//  CST816S driver as the secondary path, so the user experience is
//  identical from frame N onward.
//
//  No INT pin on this board variant — we poll the FT3168 every loop
//  iteration. At 60 Hz render rate that's a single 7-byte I2C read
//  every ~16 ms — well under the 400 kHz bus budget.
//
//  FT3168 register map (relevant subset):
//    0x00  device mode (0 = normal)
//    0x01  gesture (always 0 on this board — fall through to coords)
//    0x02  number of touch points (0 or 1)
//    0x03  touch[0] X high (high 4 bits, low 4 bits = touch event bits)
//    0x04  touch[0] X low  (8-bit low)
//    0x05  touch[0] Y high
//    0x06  touch[0] Y low
//    0xA8  chip vendor ID
//    0xA3  firmware version
//
//  Coordinate range: X 0-465, Y 0-465 (matches AMOLED resolution).
//  Round display = corners aren't physically present; touch IC still
//  reports those coords but the user can't generate them.
// =========================================================================

#include "Touch.h"
#include "../Pins.h"
#include "../Config.h"
#include <Wire.h>

namespace {
  constexpr uint8_t FT3168_REG_TOUCHES = 0x02;
  constexpr uint8_t FT3168_REG_XH      = 0x03;

  // Multi-tap window — keep identical to CST816S driver so the user's
  // muscle memory carries across hardware variants.
  constexpr uint32_t TAP_TIMEOUT_MS    = 700;
  constexpr uint32_t LONGPRESS_MS      = 600;
  constexpr int      SWIPE_MIN_DELTA   = 30;   // px
  constexpr uint32_t SWIPE_MAX_MS      = 400;

  // FT3168 sometimes returns garbled bytes mid-touch — sanity-check
  // coords before we trust them. (Empirically; safer than not.)
  bool coordSane(int x, int y) {
    return x >= 0 && x < (int)cfg::LCD_W && y >= 0 && y < (int)cfg::LCD_H;
  }
}

bool Touch::begin() {
  Wire.begin(pins::I2C_SDA, pins::I2C_SCL, pins::I2C_HZ);

  // Probe — read FT3168 vendor ID register 0xA8 (should be 0x11)
  Wire.beginTransmission(pins::TOUCH_I2C_ADDR);
  Wire.write(0xA8);
  if (Wire.endTransmission(false) != 0) {
    Serial.println("[Touch] FT3168 probe failed");
    return false;
  }
  Wire.requestFrom(pins::TOUCH_I2C_ADDR, (uint8_t)1);
  uint8_t vendor = Wire.read();
  Serial.printf("[Touch] FT3168 vendor=0x%02X (expect 0x11)\n", vendor);
  return true;
}

Touch::Event Touch::poll() {
  // ---- 1. Read touch state from FT3168 ----
  Wire.beginTransmission(pins::TOUCH_I2C_ADDR);
  Wire.write(FT3168_REG_TOUCHES);
  if (Wire.endTransmission(false) != 0) return NONE;

  // 5 bytes from 0x02 → 0x06: count + 4 coord bytes
  Wire.requestFrom(pins::TOUCH_I2C_ADDR, (uint8_t)5);
  if (Wire.available() < 5) return NONE;
  uint8_t touches = Wire.read();
  uint8_t xh = Wire.read();
  uint8_t xl = Wire.read();
  uint8_t yh = Wire.read();
  uint8_t yl = Wire.read();

  bool pressed = (touches & 0x0F) > 0;
  int  x = -1, y = -1;
  if (pressed) {
    x = ((xh & 0x0F) << 8) | xl;
    y = ((yh & 0x0F) << 8) | yl;
    if (!coordSane(x, y)) pressed = false;
  }

  const uint32_t now = millis();

  // ---- 2. Same gesture-decode state machine as the CST816S driver ----
  // The actual TAP / LONGPRESS / SWIPE / TRIPLETAP logic mirrors the
  // LCD-1.28 driver byte-for-byte; only the input source (FT3168
  // coordinates) differs. Refer to the original Touch.cpp for the
  // detailed comments — duplicated here for completeness.

  // Deferred TRIPLETAP firing
  if (deferredEvent_ != NONE && now >= deferredDueMs_) {
    Event ev = deferredEvent_;
    deferredEvent_ = NONE;
    return ev;
  }

  if (pressed && !wasPressed_) {
    // Touch DOWN
    pressStart_ = now;
    longFired_  = false;
    pressStartX_ = x;
    pressStartY_ = y;
  } else if (!pressed && wasPressed_) {
    // Touch UP
    uint32_t held = now - pressStart_;
    int dx = pressStartX_ >= 0 ? (x_lastValid_ - pressStartX_) : 0;
    int dy = pressStartY_ >= 0 ? (y_lastValid_ - pressStartY_) : 0;

    wasPressed_ = false;
    if (longFired_) return NONE;     // already emitted LONGPRESS

    // Swipe?
    if (held <= SWIPE_MAX_MS) {
      if (abs(dx) > abs(dy) && abs(dx) >= SWIPE_MIN_DELTA) {
        return dx > 0 ? SWIPE_RIGHT : SWIPE_LEFT;
      }
      if (abs(dy) > abs(dx) && abs(dy) >= SWIPE_MIN_DELTA) {
        return dy > 0 ? SWIPE_DOWN : SWIPE_UP;
      }
    }

    // TAP / MULTITAP / TRIPLETAP counter
    tapCount_++;
    if (tapCount_ == 1) firstTapMs_ = now;
    lastTapMs_ = now;

    if (tapCount_ >= cfg::TOUCH_MULTITAP_COUNT &&
        (now - firstTapMs_) <= cfg::TOUCH_MULTITAP_WINDOW_MS) {
      tapCount_ = 0;
      return MULTITAP;
    }
    if (tapCount_ == 3 && (now - firstTapMs_) <= TAP_TIMEOUT_MS) {
      // TRIPLETAP defer — wait the rest of the window in case a 4th
      // tap arrives that would re-form as MULTITAP.
      deferredEvent_  = TRIPLETAP;
      deferredDueMs_  = firstTapMs_ + TAP_TIMEOUT_MS;
      return NONE;
    }
    return NONE;
  }

  if (pressed) {
    wasPressed_ = true;
    x_lastValid_ = x;
    y_lastValid_ = y;
    // LONGPRESS — fired once, doesn't repeat
    if (!longFired_ && (now - pressStart_) >= LONGPRESS_MS) {
      longFired_ = true;
      tapCount_  = 0;   // longpress cancels any pending tap count
      return LONGPRESS;
    }
  }

  // TAP timeout — if no further taps came within the multitap
  // window, emit the queued single tap. This is the path that fires
  // a "real" TAP at the user-facing event API.
  if (tapCount_ > 0 && (now - lastTapMs_) > TAP_TIMEOUT_MS) {
    Event ev = (tapCount_ == 1) ? TAP : NONE;
    tapCount_ = 0;
    return ev;
  }

  return NONE;
}

bool Touch::isPressed() {
  Wire.beginTransmission(pins::TOUCH_I2C_ADDR);
  Wire.write(FT3168_REG_TOUCHES);
  if (Wire.endTransmission(false) != 0) return false;
  Wire.requestFrom(pins::TOUCH_I2C_ADDR, (uint8_t)1);
  return Wire.available() && ((Wire.read() & 0x0F) > 0);
}
