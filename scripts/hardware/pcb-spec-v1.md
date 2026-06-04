# AXIS Custom PCB v1.0 — Design Specification

For PCBway / JLCPCB / Seeed Fusion design-service request. Paste into
their intake form or attach as PDF.

---

## 1. Project Overview

**Product**: SN AXIS Smart Knob Shifter
**Description**: A precision IMU-driven shifter knob for sim-racing simulators and custom car interiors. Communicates with iPhone via BLE and provides tactile gear-shift detection via a 6-axis IMU.

**This project is a port of an off-the-shelf Waveshare board** to a custom PCB with a memory upgrade. All firmware, app, and protocol stacks already exist and target this exact hardware family.

**Reference board (current production)**: Waveshare ESP32-S3-Touch-LCD-1.28
URL: https://www.waveshare.com/wiki/ESP32-S3-Touch-LCD-1.28

**Goal**: Replicate this board's functionality on a custom 4-layer PCB,
swap the MCU module for a larger PSRAM variant, retain all other parts
where possible to keep firmware compatibility 1:1.

---

## 2. Form Factor

| Spec | Value |
|---|---|
| Shape | Circular (round) |
| Diameter | 40 mm (matches 1.28" display) |
| Layers | 4-layer |
| Min trace/space | 5/5 mil standard |
| Surface finish | ENIG (gold) — for AMOLED upgrade compatibility later |
| Solder mask | Matte black preferred |
| Silkscreen | White, includes "SN AXIS" logo on bottom side |

Single-side SMT assembly (top side) preferred for cost. Battery + USB-C
connector on bottom edge is OK if needed.

---

## 3. Bill of Materials (key components)

### 3.1 MCU module — UPGRADED from reference

| Spec | Value | Note |
|---|---|---|
| Module | **ESP32-S3-WROOM-1-N16R8** | 16 MB flash + 8 MB OPI PSRAM |
| Reference part | Espressif WROOM-1 series, FCC/CE/IC modular pre-certified | Don't substitute with bare chip |

Why this part: 16 MB flash gives us OTA + screensaver + future feature
headroom; 8 MB OPI PSRAM is 4× the current 2 MB QSPI on the R2 module,
needed for Music album-art cache, multi-screensaver buffer, and the
AMOLED upgrade path that's planned for v2.

**Module pre-certification**: This module ships with FCC ID
2AC7Z-ESP32S3WROOM1, ISED IC 21098-ESP32S3WROOM1, CE RED. As long as
the antenna is placed per Espressif's hardware design guide (keep-out
zone respected, no copper under the antenna trace), we inherit the
certification — no separate RF testing needed.

### 3.2 Display

| Spec | Value | Note |
|---|---|---|
| Display | **GC9A01 round LCD, 1.28", 240×240** | Same as Waveshare reference |
| Interface | SPI |
| Backlight | LED, PWM-controllable |
| Connector | 0.5 mm pitch FPC, 13-pin (industry-standard) |

The exact panel used by Waveshare is widely available on
LCSC / AliExpress under "GC9A01 1.28 inch round IPS". Any equivalent
13-pin FPC panel is fine.

### 3.3 Touch controller

| Spec | Value |
|---|---|
| Part | **CST816S** (I2C, capacitive, single-touch + gesture) |
| Interface | I2C @ 400 kHz |
| INT pin to MCU | Required |

### 3.4 IMU

| Spec | Value |
|---|---|
| Part | **QMI8658** (6-axis: accel + gyro) |
| Interface | I2C @ 400 kHz, same bus as touch |
| INT pin to MCU | Optional (we poll); a free GPIO is preferred for future motion-wake |

### 3.5 Power

| Spec | Value |
|---|---|
| Battery | Single-cell LiPo, JST PH 2.0 mm connector, 300–500 mAh suggested |
| Charge IC | **ETA6096** or equivalent (1A linear charger, USB-C input) |
| Boost / LDO | 3.3 V rail to MCU + display + IMU |
| Battery voltage divider | Connect to a free MCU ADC pin for battery-level read |

### 3.6 USB

| Spec | Value |
|---|---|
| Connector | USB-C, female, SMD |
| Path | **Native ESP32-S3 USB-OTG (D+/D− to GPIO19/20)** — drop the CH343P USB-UART bridge that the reference board uses |

The reference Waveshare board uses a CH343P USB-UART because earlier
ESP32 chips don't have native USB. ESP32-S3 has native USB, so we save
$1 BOM and one chip footprint by going direct.

### 3.7 Misc

- **Boot button** on GPIO0 (small SMD tact, accessible through enclosure)
- **Reset button** on EN (small SMD tact)
- **Test points** for: 3V3, GND, GPIO0, EN, UART0 TX/RX (for factory provisioning)
- **Status LED** (optional): single small LED on a free GPIO

---

## 4. Pin Map (for firmware compatibility)

The firmware (axis-companion/smart_knob_shifter) currently maps GPIOs
per the Waveshare reference. The custom PCB should preserve these
exact assignments where possible, OR provide an updated pin map so we
can edit `src/Pins.h` once before manufacturing.

Current pin map (from Waveshare ESP32-S3-Touch-LCD-1.28):

| Signal | GPIO | Note |
|---|---|---|
| LCD SCLK | 10 | SPI clock |
| LCD MOSI | 11 | SPI data out |
| LCD CS | 9 | SPI chip select |
| LCD DC | 8 | data/command select |
| LCD RST | 14 | reset |
| LCD BLK | 2 | backlight (PWM via LEDC) |
| I2C SDA | 6 | shared touch + IMU |
| I2C SCL | 7 | shared touch + IMU |
| TOUCH INT | 5 | active-low interrupt |
| TOUCH RST | 13 | reset |
| BAT ADC | 1 | battery voltage read |
| USB D+ | 20 | native USB |
| USB D− | 19 | native USB |

Please follow this map; if any signal must move, flag it before
fabrication so we can patch firmware.

---

## 5. Manufacturing & quantity

**Quote requested for**:
- **100 units** (initial production batch)
- **500 units** (scale validation batch)

Both quotes should include:
- PCB fabrication
- Stencil
- SMT assembly (top side, all parts)
- Functional test (boot + USB enumeration check is enough)
- Packaging in ESD bag, no retail box

**Delivery target**: ~4 weeks from PO for first 100-unit batch.

**Geographic destination**: Bangkok, Thailand (DHL or FedEx air freight).

---

## 6. What we do NOT need from you

- Firmware (we maintain our own, fully working, MIT licensed internally)
- Enclosure / mechanical (separate project — we'll spec later)
- App / cloud (already shipped on App Store as "SN AXIS")
- Branding mockups (we provide silkscreen artwork once you confirm dimensions)
- RF re-certification (the WROOM-1 module's existing FCC/CE/IC cert carries forward, per Espressif)

---

## 7. What we DO need from you in the quote

1. **Unit cost** at 100 and 500 qty, fully assembled, in USD
2. **NRE / engineering cost** for the design work (schematic + layout)
3. **Lead time** for design (first prototype) and for each production batch
4. **Prototype fee** for 5 hand-soldered test units before batch
5. **DFM report** sample (so we can see how your team flags issues)
6. **Payment terms** (TT, escrow, milestone)
7. **MOQ** for any custom component (e.g., colour-matched LCD bezel)
8. **IP / NDA** — confirm you treat custom designs as work-for-hire,
   transferred fully to us on payment

---

## 8. Contact

**Project lead**: Siprach Charoensiri / SN Motorsports
**Email**: snmotorsport01@gmail.com
**App Store listing**: SN AXIS (live on iOS App Store, Bundle ID com.snmotorsports.axis)
**Reference firmware repo (private)**: available on request after NDA

---

*This spec is intentionally aligned 1:1 with an existing, shipping
product. The only spec change vs the reference is the MCU module
upgrade from -N4R2 / -N8R2 to -N16R8. All software is already
validated against this hardware family.*
