# SN AXIS — App Store 5.6 Remediation Checklist

Apple suspended SN AXIS under **Guideline 5.6 (Developer Code of Conduct)** — "not eligible for
resubmission." This record is dead; the work below prepares a **new app record** that clears the
quality bar. Source: multi-agent audit (58 verified findings). Test in **DEMO MODE on the smallest
supported iPhone (SE)** — that's what a hardware-less reviewer sees.

Status: **all 7 blockers + 5 highs done; mediums almost all done.** A few minor polish items remain
(listed at the bottom). Build is green (only pre-existing `axsv.ts` type errors remain), iOS synced.

## Blockers — ALL DONE
- [x] **B1 — Demo entry de-dev-tooled.** Connect "DEMO MODE — no device" dashed card → solid "Take a look around" product card; plain-language SCENES (Overview / Highway cruising / Spirited backroad / Track day / City traffic / Parked).
- [x] **B2 — MockClient stateful.** branding/screensaver/mode/gears persist; Save look shows "Saved ✓"; mode chips highlight; `build` field + `ota()` bump so the UPDATE flow works in demo.
- [x] **B3 — "Connect" no-hardware empty state.** Scan-with-no-result now shows "No AXIS found nearby… or try the live preview".
- [x] **B4 — Engineer surfaces gated on `store.isDemo`.** Sys RESTART/FACTORY disabled+noted in demo; OTA local-upload card hidden; destructive guards added.
- [x] **B5 — OTA reconnect crash fixed.** `attemptReconnect` guards `typeof connect !== 'function'` (MockClient/Wi-Fi) → clean simulated recovery, no 30 s red dead-end; demo install short-circuits the network; also cast the live BLE `connect()` (cleared the pre-existing type error).
- [x] **B6 — Calibrate SETUP font.** `.big-label` → `--font-mono` (no more garbled "Reverse").
- [x] **B7 — iPad mismatch.** `TARGETED_DEVICE_FAMILY="1"` (iPhone-only) + portrait-locked.

## High — ALL DONE
- [x] Live status pill → "Connected/Connecting…/Disconnected/Connection lost" (no raw WS states); dropped uppercase.
- [x] "⤢ PRESENT" dev screen-recording tool removed from GaugeSetup (button + overlay + state + CSS).
- [x] Pro sub-pages no longer dead-ends: PageHeader gained optional `title`+`back` ("‹ Pro"); Tune/Sys/Devices pass them; BottomNav keeps PRO (and LOOKS) lit for their sub-pages.
- [x] Placeholder identity → realistic: name "AXIS", version "v1.0.0", MAC `A0:B7:65:3C:1F:9E`, SSID `AXIS-7B3E`.
- [x] OTA live GitHub fetch + engineer changelog → demo serves a canned buyer-friendly manifest; friendly error copy; build tags hidden in demo.

## Medium — done
- [x] Live telemetry → "Lean/Tilt", dropped Gyro/Accel dps/g, "Live"/"Gear locked".
- [x] Embedded GaugeSetup (in Looks) hides calibration/layout/warnings — colours only.
- [x] Sim/"browser preview" dev copy replaced (Connect, GaugeSetup, Devices).
- [x] Screensaver: "‹ LOOKS" back button; lit LOOKS tab; "Save a copy" hidden in Capacitor (WKWebView no-op).
- [x] Devices: CAN-Module placeholder card hidden in demo; Gauge card drops the COMING contradiction (CONNECTED/NOT CONNECTED); coherent copy.
- [x] Sys engineer telemetry (Memory / CPU / raw-IMU) hidden in demo; RESTART/FACTORY disabled in demo.
- [x] Tune: brightness shows % (not "255.00"), step 1; `.def` contrast fixed; "Shift sensitivity" / "Shift detection window" relabels.

## Medium — remaining — NOW DONE
- [x] Calibrate: mode chips → "Auto / Sequential / Manual" + a visible one-line description (dropped the hover-only `title`, useless on iOS); "IMU zero" Roll/Pitch/Yaw card → "Sensor reference" Lean/Tilt/Yaw and hidden in demo; stripped "gyro … dps" + "Averaging IMU samples" jargon (→ "Holding steady…" / "Capturing…"); live readout R/P → Lean/Tilt.
- [x] Calibrate: "CLEAR CALIBRATION" now flashes a "Calibration cleared" toast (no more silent no-op).
- [x] GaugeSetup demo: "Demo preview — changes here aren't saved…" banner added directly under the preview.
- [x] app.css 480/640: **left intentional** — `#app` is the 640 shell; buyer form-pages use a 480 readable column. Neither cap is hit on iPhone (the only supported device after B7). Forcing 640 would over-widen the colour-picker rows. Not a bug.

## Minimum bar before resubmission — MET
1. ✅ No-hardware entry is a polished product, "Connect" has a guided empty state.
2. ✅ Demo primary actions work (Save look, screensaver, gauge, mode, UPDATE) — MockClient stateful.
3. ✅ No demo-reachable success/destructive dialog resolves against nothing; no reconnect crash.
4. ✅ No dev artifacts visible in demo (sim copy, PRESENT, placeholder MAC, raw WS, heap/IMU, .bin/USB/GitHub, changelog).
5. ✅ Every Pro sub-page has title + Back + a lit tab; SETUP Psionic font fixed.
6. ✅ iPad mismatch resolved (iPhone-only).

## Pre-resubmission pass 2 (2026-07-12) — NEW pages + purpose strings — DONE
Since pass 1, several Pro pages were added (Drivetrain, Diagnostics, Gauge display / MonitorConfig,
Firmware update / MonitorOta, per-arc GaugeSetup). Re-audited all against the 5.6 bar + fixed:
1. ✅ Drivetrain — had NO demo path (scan-only screen = the 5.6 cause); now renders the full 293-car
   picker in demo with a DEMO badge, Save shows a demo note. "(coming soon)" in the Real-gear picker
   reworded to "(needs in-car scan)".
2. ✅ MonitorConfig / MonitorOta — full editor + OTA render in demo (DEMO badge); NO network/flash/save
   in demo (MonitorOta uses a canned "up to date", MonitorConfig uses defaultCfg); Save/flash show a
   demo note. Each has PageHeader title+back (no dead-end), lit PRO tab (OWNED.pro).
3. ✅ Diagnostics — demo-safe: manual OBD-II code lookup is a pure offline feature; the device-half
   (read codes / accel / bus capture / logs) is gated behind {#if gauge} with a connect prompt.
4. ✅ Calibrate got title+back; Tune raw units (dps/g/0.50) → 0-100%; Connect dBm → Strong/Good/Weak;
   Screensaver "Quantising/16-bit" → "Optimising/best quality"; Brand fixed header + connect state + wired into Pro.
5. ✅ BLE purpose strings (NSBluetooth*UsageDescription) broadened from "AXIS knob" to the accurate
   "AXIS accessories (knob, gauge and CAN monitor)".
Verified: icon (1024 present) + LaunchScreen.storyboard present; iPhone-only + Portrait-only still set;
svelte-check clean (only pre-existing axsv.ts errors); build ok; iOS synced.
