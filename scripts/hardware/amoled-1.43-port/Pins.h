#pragma once

// =========================================================================
//  Pins.h — Waveshare ESP32-S3-Touch-AMOLED-1.43 variant
//  Reference: https://www.waveshare.com/wiki/ESP32-S3-Touch-AMOLED-1.43
// =========================================================================
//  Drop-in replacement for the LCD-1.28 src/Pins.h. The Display + Touch
//  pin groups are completely different (QSPI vs SPI; FT3168 vs CST816S
//  on a different I2C bus). The IMU group reuses QMI8658 — only the
//  GPIO numbers and the shared I2C-bus assignment changes.
//
//  Anything not listed here is free GPIO and matches the schematic at
//  files.waveshare.com/wiki/ESP32-S3-Touch-AMOLED-1.43/...pdf
// =========================================================================

namespace pins {

  // ---- AMOLED display (QSPI — 4-line data) ----
  // SH8601-class panel via Bus_QSPI in LovyanGFX.
  constexpr int AMOLED_QSPI_CS   = 9;
  constexpr int AMOLED_QSPI_CLK  = 10;
  constexpr int AMOLED_QSPI_D0   = 11;
  constexpr int AMOLED_QSPI_D1   = 12;
  constexpr int AMOLED_QSPI_D2   = 13;
  constexpr int AMOLED_QSPI_D3   = 14;
  constexpr int AMOLED_RST       = 21;   // active-low panel reset
  constexpr int AMOLED_EN        = 42;   // power-rail enable (HIGH = panel on)

  // ---- I2C bus (shared: touch + IMU + RTC) ----
  // All three peripherals sit on the same I2C — addresses don't clash:
  //   FT3168 touch   0x38
  //   QMI8658 IMU    0x6B
  //   PCF85063 RTC   0x51
  constexpr int I2C_SDA          = 47;
  constexpr int I2C_SCL          = 48;
  constexpr uint32_t I2C_HZ      = 400'000;

  // ---- Touch (FT3168) ----
  // No dedicated INT pin exposed on this board — we poll via I2C.
  // RST is shared with the AMOLED reset on some Waveshare schematic
  // revisions; we leave the touch reset to power-on default.
  constexpr int TOUCH_I2C_ADDR   = 0x38;
  constexpr int TOUCH_INT        = -1;   // not connected; poll mode
  constexpr int TOUCH_RST        = -1;   // not separately addressable

  // ---- IMU (QMI8658) ----
  // INT1 wired to GPIO8 — keep available for future motion-wake from
  // sleep, but firmware currently polls (same behaviour as LCD-1.28).
  constexpr int IMU_I2C_ADDR     = 0x6B;
  constexpr int IMU_INT          = 8;

  // ---- RTC (PCF85063) — BONUS, not used by AXIS firmware yet ----
  constexpr int RTC_I2C_ADDR     = 0x51;
  constexpr int RTC_INT          = 15;

  // ---- USB (native ESP32-S3) ----
  constexpr int USB_DN           = 19;
  constexpr int USB_DP           = 20;

  // ---- Battery / charging ----
  constexpr int BAT_ADC          = 4;    // ADC1 channel for voltage divider
  // Battery voltage = ADC_reading × 3.3 / 4095 × 2.0 (divider ratio)

  // ---- Buttons ----
  constexpr int BUTTON_BOOT      = 0;    // shared with bootloader
  // No dedicated RESET button GPIO — the RESET button is wired to EN
  // (chip reset) and isn't software-readable.

  // ---- UART (debug serial) ----
  constexpr int UART_TX          = 43;
  constexpr int UART_RX          = 44;

  // ---- TF card (SPI) — BONUS, not used by AXIS firmware yet ----
  constexpr int SD_CS            = 38;
  constexpr int SD_MOSI          = 39;
  constexpr int SD_MISO          = 40;
  constexpr int SD_SCLK          = 41;

  // ---- Free GPIO for future use ----
  //   GPIO1, GPIO2, GPIO3, GPIO5, GPIO6, GPIO7, GPIO16, GPIO17, GPIO18,
  //   GPIO45, GPIO46
  // Avoid GPIO0 (boot), GPIO19/20 (USB), QSPI/I2C pins above.
}
