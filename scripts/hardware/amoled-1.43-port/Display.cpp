// =========================================================================
//  Display.cpp — Waveshare ESP32-S3-Touch-AMOLED-1.43 variant
// =========================================================================
//
//  Drop-in replacement for the LCD-1.28 src/hal/Display.cpp. Wraps a
//  custom LGFX class around the Bus_QSPI + Panel_SH8601 combination
//  that Waveshare's AMOLED-1.43 board ships with.
//
//  Architectural differences vs the LCD-1.28 build:
//
//    1. Bus: QSPI (4-line data) instead of vanilla SPI (1-line MOSI).
//       Throughput goes from ~30 MHz × 1 line = 30 Mbps to
//       ~80 MHz × 4 lines = 320 Mbps. The same 240×240 frame that
//       took ~40 ms now takes ~3-4 ms; 466×466 (3.8× pixels) takes
//       ~15 ms — comfortably within our 60 FPS budget.
//
//    2. Panel driver: LovyanGFX's built-in Panel_SH8601 covers the
//       SH8601/SH8601A/SH8601Z family (Waveshare ships whichever is
//       in stock; init sequence is identical for our purposes).
//
//    3. Power-on: AMOLED_EN (GPIO42) MUST be driven HIGH before the
//       panel responds to anything on the QSPI bus. The reset
//       sequence is: EN high → wait 100 ms → RST low 10 ms → RST
//       high → wait 200 ms → start init writes.
//
//    4. Brightness: AMOLED has no backlight LED. Brightness is set
//       via the SH8601 0x51 register (8-bit). The existing
//       Brightness.cpp's LEDC PWM path is replaced by a single
//       I2C-style command write — see setBrightness() below.
//
//    5. setSwapBytes: KEEP true. Same byte-order convention as the
//       LCD-1.28 build, which we rely on across the codebase for
//       screensaver decode + JPEG art blit.
//
//  Sprite allocation in PSRAM follows the same pattern as the LCD
//  build. At 466×466 RGB565 a single full-screen sprite is
//  466 × 466 × 2 = 434,312 bytes ≈ 425 KB. The R8 module's 8 MB OPI
//  PSRAM has plenty of headroom (~20× our largest sprite).
//
//  Build requirement:
//    Arduino IDE → Tools → PSRAM: "OPI PSRAM" (NOT QSPI). This is
//    the inverse of the LCD-1.28 build's setting; if you forget and
//    flash with QSPI selected on an R8 board, the panel inits but
//    Sprite::createSprite() returns null because heap_caps_malloc on
//    MALLOC_CAP_SPIRAM fails silently.
// =========================================================================

#include "Display.h"
#include "../Pins.h"
#include "../Config.h"

#define LGFX_USE_V1
#include <LovyanGFX.hpp>

namespace {

  // ---- Bus_QSPI configuration for SH8601 ----
  // The QSPI driver writes data nibbles on D0-D3 in 24-bit "QSPI
  // command" frames the SH8601 expects. Mode is 0 (CPOL=0, CPHA=0).
  class LGFX_AMOLED : public lgfx::LGFX_Device {
    lgfx::Bus_QSPI    _bus;
    lgfx::Panel_SH8601 _panel;
    // (No light instance — AMOLED brightness via panel register, not LEDC.)
   public:
    LGFX_AMOLED() {
      {
        auto cfg = _bus.config();
        cfg.spi_host    = SPI2_HOST;
        cfg.spi_mode    = 0;
        cfg.freq_write  = 80'000'000;     // 80 MHz — SH8601 max
        cfg.freq_read   = 20'000'000;     // unused for write-only panel
        cfg.pin_sclk    = pins::AMOLED_QSPI_CLK;
        cfg.pin_io0     = pins::AMOLED_QSPI_D0;
        cfg.pin_io1     = pins::AMOLED_QSPI_D1;
        cfg.pin_io2     = pins::AMOLED_QSPI_D2;
        cfg.pin_io3     = pins::AMOLED_QSPI_D3;
        cfg.dma_channel = SPI_DMA_CH_AUTO;
        _bus.config(cfg);
        _panel.setBus(&_bus);
      }
      {
        auto cfg = _panel.config();
        cfg.pin_cs           = pins::AMOLED_QSPI_CS;
        cfg.pin_rst          = pins::AMOLED_RST;
        cfg.pin_busy         = -1;
        cfg.panel_width      = cfg::LCD_W;     // 466
        cfg.panel_height     = cfg::LCD_H;     // 466
        cfg.offset_x         = 0;
        cfg.offset_y         = 0;
        cfg.offset_rotation  = 0;
        cfg.dummy_read_pixel = 8;
        cfg.dummy_read_bits  = 1;
        cfg.readable         = false;          // write-only saves a couple of bytes
        cfg.invert           = false;
        cfg.rgb_order        = false;          // BGR? verify on hardware
        cfg.dlen_16bit       = false;
        cfg.bus_shared       = false;
        _panel.config(cfg);
      }
      setPanel(&_panel);
    }
  };

  LGFX_AMOLED g_lgfx;
}

// =========================================================================
//  Public API — same signatures as the LCD-1.28 build
// =========================================================================
bool Display::begin() {
  // 1) Hard-power the panel via AMOLED_EN before any QSPI traffic.
  pinMode(pins::AMOLED_EN, OUTPUT);
  digitalWrite(pins::AMOLED_EN, HIGH);
  delay(100);

  // 2) LovyanGFX runs the SH8601 init sequence inside begin().
  if (!g_lgfx.begin()) {
    Serial.println("[Display] LGFX begin failed");
    return false;
  }

  g_lgfx.setRotation(0);
  g_lgfx.setSwapBytes(true);   // keep — matches screensaver + JPEG byte order
  g_lgfx.fillScreen(TFT_BLACK);

  // 3) Sprite for double-buffering. 425 KB lands in OPI PSRAM
  //    (free heap >7 MB at this point).
  spr_ = new LGFX_Sprite(&g_lgfx);
  spr_->setColorDepth(16);
  spr_->setPsram(true);
  if (!spr_->createSprite(cfg::LCD_W, cfg::LCD_H)) {
    Serial.printf("[Display] sprite alloc failed (%u bytes)\n",
                  (unsigned)(cfg::LCD_W * cfg::LCD_H * 2));
    delete spr_;
    spr_ = nullptr;
    return false;
  }
  spr_->setSwapBytes(true);

  Serial.printf("[Display] AMOLED %dx%d ready (sprite %u KB in PSRAM)\n",
                cfg::LCD_W, cfg::LCD_H,
                (unsigned)((cfg::LCD_W * cfg::LCD_H * 2) / 1024));
  return true;
}

LGFX_Sprite& Display::sprite() { return *spr_; }

void Display::push() {
  if (!spr_) return;
  spr_->pushSprite(0, 0);
}

// =========================================================================
//  Brightness — AMOLED reg 0x51 (8-bit, 0=off, 255=full)
// =========================================================================
//  AMOLED has no backlight; brightness is a panel-internal voltage
//  reference. LovyanGFX exposes writeCommand + writeData so we
//  bypass the existing Brightness.cpp's LEDC code with a one-shot
//  I2C-like write. Brightness.cpp should be patched to call this
//  function instead of ledcWrite() when AXIS_BOARD_AMOLED_143 is
//  set — see Config.patch in this folder.
// =========================================================================
void Display::setBrightness(uint8_t level) {
  g_lgfx.startWrite();
  g_lgfx.writeCommand(0x51);     // SH8601 "write display brightness"
  g_lgfx.writeData(level);
  g_lgfx.endWrite();
}

// =========================================================================
//  AMOLED power down (entered before deep sleep)
// =========================================================================
void Display::powerDown() {
  g_lgfx.startWrite();
  g_lgfx.writeCommand(0x28);     // display off
  g_lgfx.writeCommand(0x10);     // sleep in
  g_lgfx.endWrite();
  // Then drop the panel power rail. This kills the SH8601 entirely
  // — saves ~80 mA. Next wake will re-run begin().
  digitalWrite(pins::AMOLED_EN, LOW);
}
