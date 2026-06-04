# App Review notes — for the Apple reviewer

This is the single highest-leverage thing for getting a Bluetooth-
dependent accessory app approved. The Apple reviewer will NOT have an
AXIS knob — they have an iPhone and a couple of generic Bluetooth
peripherals. If you don't explain how to evaluate the app without the
hardware, they'll likely reject under guideline **2.1 (Performance —
App Completeness)** with a note saying "we could not test the main
functionality of your app".

Paste the text below into ASC → App Information → **App Review
Information** → **Notes**. (Field accepts up to 4,000 chars; this is
~1,200.)

---

```
HARDWARE-FREE REVIEW PATH

SN AXIS is the controller app for the AXIS Smart Knob Shifter,
a Bluetooth Low Energy accessory built by SN Motorsports. Because the
reviewer is unlikely to have access to the physical device, we have
built a complete DEMO MODE that exercises every screen and gesture
without any hardware.

TO EVALUATE WITHOUT HARDWARE

1. Launch SN AXIS.
2. On the first screen ("Devices"), tap the "DEMO MODE" button at
   the bottom. (No Bluetooth permission is required for this path.)
3. The bottom navigation bar appears. Every tab is now interactive
   with representative demo data:
     • Dashboard — overview tiles
     • Live      — fake telemetry stream + G-meter
     • Tune      — full settings UI
     • Calibrate — wizard flow (the "capture" buttons no-op in demo)
     • Brand     — colour pickers + live preview disc on the right
     • Screensaver — pick a photo / GIF / short video; processed
                     locally in the browser. Save is no-op in demo
                     but the preview shows the converted output.
     • OTA       — firmware manifest read from our public GitHub
                   Pages URL is shown; INSTALL is no-op in demo
     • Sys       — version, WiFi, device info tiles
4. Long-press is mapped to "back". 5-tap is mapped to "menu". Both
   work in demo.

PRIVACY DECLARATIONS

  • Bluetooth — used to discover and connect to AXIS hardware. The
    app scans only for devices that advertise the AXIS GATT service
    UUID (7e1c0001-9b3a-4f8e-8a5b-9d2e1f3a7c6d). No other BLE
    peripheral is read or logged.

  • Local Network — used to talk to the AXIS captive portal
    (192.168.4.x) when the user wants to upload firmware over the
    knob's built-in soft-AP. iOS prompts the user on first use.

  • Photo Library — only accessed when the user taps "Choose photo /
    video" in the Screensaver page. The picked file is processed in
    the browser sandbox and uploaded to the AXIS device over
    Bluetooth. It is never uploaded to a server.

NO ACCOUNTS, NO ANALYTICS

There is nothing to sign in to. No data is sent to our servers. The
only network request the app makes is a public GET to
snmotorsport01.github.io/axis-companion/firmware/index.json to check
for firmware updates.

CONTACT

If anything is unclear, please email snmotorsport01@gmail.com — we
respond within a couple of hours during Bangkok business hours
(GMT+7).
```

---

## Demo account fields

The ASC review form has two fields:

- **Sign-In Required**: set to **No** — the app has no accounts.
- **User Name / Password**: leave **blank**.

## Notes for "Contact Information"

Set:

- **First Name** / **Last Name** — your real name (Apple needs this
  to identify the responsible party).
- **Phone Number** — your real number in international format
  (+66XXXXXXXXX). Apple has called us in the past when something
  was ambiguous; keep this reachable.
- **Email Address** — same as the privacy-policy / support email so
  you only have one inbox to watch during review.
