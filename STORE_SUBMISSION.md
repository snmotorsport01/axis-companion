# SN AXIS — Store Submission Cheat-Sheet

Everything below is derived from the app as it actually behaves: **BLE-only to your own AXIS hardware, no account, no analytics, no ads, no third-party SDKs; GPS (Track mode) is processed on-device and never uploaded; VIN and location are never collected.** The in-app **Legal** page (Privacy + Terms, 4 languages) and the public page below say the same thing.

Last updated 2026-09-02 · Contact: **info@sn-motorsports.com**

---

## 1. Privacy Policy URL (paste into the consoles)

```
https://snmotorsport01.github.io/axis-companion/privacy.html
```

- Source file: `public/privacy.html` (ships with the **web** build → `base=/axis-companion/`).
- **Goes live when you deploy the web build** to the same github.io that already serves `firmware/index.json`.
- Apple: App Store Connect → your app → **App Privacy** → *Privacy Policy URL*. Also App Information → Privacy Policy.
- Google (only if/when Android ships): Play Console → **App content** → *Privacy policy*.

---

## 2. Apple — App Privacy ("Data Collection") → **Data Not Collected**

App Store Connect → App Privacy → *"Do you or your third-party partners collect data from this app?"* → **No**.

Why "No" is correct (Apple defines *collect* = transmitted off the device):
- No account, no sign-in, no analytics, no ads, no tracking SDK.
- Vehicle data (speed/RPM/temps/DTCs) is shown on the phone and **stays on the device**.
- **Location (Track mode)** is used on-device to time laps / draw the route and is **never uploaded** → not "collected."
- Firmware downloads from jsDelivr/GitHub carry **no personal info**.
- VIN is **never** read/stored/transmitted.

Result: the privacy label shows **"No Data Collected."**

**Info.plist usage strings — already present ✓** (no action):
- `NSBluetoothAlwaysUsageDescription`, `NSBluetoothPeripheralUsageDescription`
- `NSLocationWhenInUseUsageDescription` ("…stays on your device and is never uploaded")

⚠️ **Re-answer this only if the optional Community / leaderboard ships.** Then it becomes: collects **User Content** (the time + car model you submit) → *not linked to identity, not used for tracking*. Until Community is live, "No Data Collected" is accurate.

---

## 3. Google Play — Data Safety → only when Android ships

The app is **iOS-only right now**, so Data Safety isn't needed yet. When you publish on Play:

- *Does your app collect or share any of the required user data types?* → **No** (same reasoning as Apple).
- Data collected: **None** · Data shared: **None**.
- "Encrypted in transit" / "users can request deletion" → N/A (nothing is collected).
- Location: accessed for Track mode, **on-device only** → declare **not collected**.
- Android also needs the runtime permission rationale for BLE scan/location (the Android manifest gate noted in the store-compliance audit).

---

## 4. Other App Review notes (unchanged, for reference)

- **Guideline 5.2.1 (IP):** AXIS is SN Motorsports' own brand/hardware — attach the ownership declaration in App Review Notes if asked again.
- No login → no demo account needed. Reviewer can't pair real hardware, so include a short note: *"Requires SN AXIS Bluetooth hardware to show live data; UI and settings are fully browsable without it."*
- What ships in the next build alongside this: **Track i18n (4 languages)** and the **per-channel WARN config** (both code-complete, awaiting a device build).
