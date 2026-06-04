# AMOLED 1.43" port — Waveshare ESP32-S3-Touch-AMOLED-1.43

Drop-in port files for the AXIS firmware to flash on the Waveshare
ESP32-S3-Touch-AMOLED-1.43 dev board. Test bench for the Phase 3
"premium AMOLED + 16 MB PSRAM" upgrade before committing to a custom
PCB run.

Reference board: <https://www.waveshare.com/wiki/ESP32-S3-Touch-AMOLED-1.43>

## What changes vs the current LCD 1.28" build

| Aspect | Current (Waveshare LCD 1.28) | This port (AMOLED 1.43) |
|---|---|---|
| MCU | ESP32-S3R2 (16 MB flash + **2 MB QSPI** PSRAM) | ESP32-S3R8 (16 MB flash + **8 MB OPI** PSRAM) |
| Display chip | GC9A01 (SPI) | SH8601-class (**QSPI**) |
| Display size | 240 × 240 round | **466 × 466 round** (3.8× pixels) |
| Touch chip | CST816S | **FT3168** (rewrite needed) |
| IMU | QMI8658 | QMI8658 *(unchanged — driver reused 1:1)* |
| Bonus | — | PCF85063 RTC + TF card slot |

## What this folder contains

| File | Drop-in target | Note |
|---|---|---|
| `Pins.h` | `src/Pins.h` | Full pin map for the AMOLED board |
| `Display.cpp` | `src/hal/Display.cpp` | SH8601 QSPI driver via LovyanGFX `Panel_SH8601` |
| `Touch.cpp` | `src/hal/Touch.cpp` | FT3168 I2C driver (replaces CST816S logic) |
| `Config.patch` | apply to `src/Config.h` | `LCD_W`/`LCD_H` → 466, brightness curve, dead-band |

All other firmware files (App, Engine, BLE, Music, screens) work
unchanged because they read `cfg::LCD_W` / `cfg::LCD_H` and never
touch the display driver directly.

## How to use

1. **Order the board**: <https://www.waveshare.com/esp32-s3-touch-amoled-1.43.htm>
   (~$28-35; AliExpress or Amazon).

2. **In the firmware repo** (`smart_knob_shifter/`), back up current
   HAL files:
   ```
   cd src/hal
   mv Display.cpp Display.cpp.lcd128
   mv Touch.cpp Touch.cpp.lcd128
   cd ..
   mv Pins.h Pins.h.lcd128
   ```
3. **Drop these files in**:
   ```
   cp .../scripts/hardware/amoled-1.43-port/Pins.h         src/Pins.h
   cp .../scripts/hardware/amoled-1.43-port/Display.cpp    src/hal/Display.cpp
   cp .../scripts/hardware/amoled-1.43-port/Touch.cpp      src/hal/Touch.cpp
   ```
4. **Apply Config.patch** (manual — only a few lines change):
   ```
   See Config.patch in this folder for the exact diff.
   ```
5. **Arduino IDE settings** (key change is PSRAM mode):
   ```
   Board:           ESP32S3 Dev Module
   USB Mode:        Hardware CDC and JTAG
   CDC On Boot:     Enabled
   Flash Size:      16MB (128Mb)
   Partition:       Custom (use existing partitions.csv)
   PSRAM:           "OPI PSRAM"    ← changed from "QSPI PSRAM"
   ```
6. **Compile + flash**. First boot should show splash → BLE pair →
   normal AXIS UI at 466×466.

## Checklist for first-flash validation

- [ ] Splash renders sharp at 466×466 (no scaling artefacts)
- [ ] Gear digit (centre of main screen) is large and readable
- [ ] Touch responds across the whole disc (corners are dead — that's
      a round display thing, not a touch bug)
- [ ] Triple-tap touch lock works
- [ ] IMU calibrates + gear shifts trigger correctly (knob movement
      detects PRND / sequential / H-pattern as before)
- [ ] PWA pairs over BLE + telemetry stream flows
- [ ] Screensaver decodes — verify AXSV palette at the new resolution
- [ ] Battery indicator updates (BAT_ADC on GPIO4)
- [ ] USB-C charging works (red LED while charging, off when full)

## Known caveats

1. **AXSV screensaver format may need re-encoding at 466×466**. The
   current PWA encoder targets 240×240 (115,200 pixels). At 466×466
   (217,156 pixels) the packed AXSV blob grows ~3.8×, may exceed the
   3.9 MB LittleFS partition for animations >5 s. If so, raise to
   192-color palette OR downsample frames to 380×380 with a 43-px
   black border.

2. **Touch chip is FT3168, not CST816S**. The gesture-register
   shortcut we use on CST816S (single-byte read for swipe direction)
   doesn't exist on FT3168 — this port falls back to coordinate-based
   swipe detection. Feel should be identical from the user side; if
   tap-detection feels worse, the FT3168 driver may need a debounce
   tweak (see TODO in `Touch.cpp`).

3. **AMOLED burn-in risk** if you display a static gear digit for
   hours. The current screen-saver kicks in after 60 s of idle —
   keep that. For long sessions consider adding a "pixel shift" of
   ±1 px every 5 minutes to the main UI.

4. **AMOLED brightness curve is non-linear vs LCD**. Existing
   `Brightness.cpp` gamma curve targets LCD backlight LED — for
   AMOLED the same DAC value produces a brighter image AND the
   colour shifts darker as you dim. Recalibrate the curve once
   on hardware (~30 min visual tuning).

5. **PCF85063 RTC is bonus** — not used by AXIS firmware. Could be
   wired to `ScreenInfo` to show a real clock instead of just uptime,
   but that's a separate feature.

6. **TF card slot is bonus** — not used by AXIS firmware. Could be
   wired to allow large screensavers without using LittleFS, but
   that's also a separate feature.

## Build flag (future cleanup)

For production we'll want a single firmware source tree that supports
both LCD and AMOLED boards via a build flag:

```cpp
#define AXIS_BOARD_LCD_128    1  // Waveshare ESP32-S3-Touch-LCD-1.28
#define AXIS_BOARD_AMOLED_143 2  // Waveshare ESP32-S3-Touch-AMOLED-1.43

#ifndef AXIS_BOARD
  #define AXIS_BOARD AXIS_BOARD_LCD_128
#endif
```

This port is currently the "naive copy" approach. Once the AMOLED
build is proven, fold both back into one tree with `#ifdef` guards
so the same git commit serves both SKUs.
