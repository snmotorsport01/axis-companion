# App Privacy "nutrition label" — answers

ASC → App Privacy → "Get Started". A long form. Below is every question
and the correct answer for SN AXIS.

The short version: **"Data Not Collected"** for every category. That
is the strongest possible privacy statement on the store, and the
truthful one for this app. If anything below changes (e.g., you add
analytics or accounts later), you must come back and update.

---

## 1. Does this app collect data?

Answer: **No, we do not collect data from this app.**

ASC then walks you through a confirmation checklist. The exact wording
on Apple's side is:

> "I confirm that this app does not collect any of the following data
>  types from this app." [...]

Apple then enumerates each data category. Tick **all** of them (i.e.,
you are confirming none of them are collected). Categories include:

- Contact Info (name, email, phone, physical address, etc.) — **none**
- Health & Fitness — **none**
- Financial Info — **none**
- Location (precise or coarse) — **none**
- Sensitive Info — **none**
- Contacts — **none**
- User Content (photos, videos, audio, gameplay content, etc.) — **none**
- Browsing History — **none**
- Search History — **none**
- Identifiers (User ID, Device ID, advertising data) — **none**
- Purchases — **none**
- Usage Data — **none**
- Diagnostics (crash data, performance data, other diagnostic data) — **none**
- Other Data — **none**

---

## Edge-case justifications (for your reference)

If a reviewer questions any of the above, here is the rationale:

### Photo / Video selection (Screensaver page)

The user picks a file from their photo library via the browser's
`<input type=file>`. The file is processed in the WebKit web view —
resized, quantised to 128 colours, packed into AXSV format — and
transmitted to the AXIS device over Bluetooth. **It never reaches a
server we control.** Apple's "Data Collection" definition explicitly
excludes data that "stays on a user's device or is processed
ephemerally" — the photo handling satisfies that exclusion.

### BLE device ID stored in localStorage

The Bluetooth peer ID of the last-paired AXIS knob is stored in
`localStorage` so the next launch can re-pair quickly. This is local
storage on the user's own device; it is not a "User ID" or "Device
ID" in Apple's nutrition-label sense (those refer to advertising IDs
or persistent cross-app trackers) — it's a local convenience cache.

### Firmware-update HTTP request

The OTA page sends one HTTPS GET to
`snmotorsport01.github.io/axis-companion/firmware/index.json`. The
request carries only the IP address and user-agent that any HTTP
request carries. **We do not log or process those.** GitHub's own
server logs are outside our control and are subject to GitHub's own
privacy policy. This is equivalent to "your app uses a public CDN to
serve assets" — Apple does not require disclosure of CDN traffic.

### Diagnostic logs

The app does not crash-report. There is no SDK that sends crash data
or analytics. If the user shakes their phone to take a screenshot
with iOS's built-in tooling, that is an iOS feature unrelated to the
app.

---

## If you ever add analytics later

You will need to come back to App Privacy and add:

- **Identifiers → Device ID** (linked to user / used for analytics)
- **Diagnostics → Crash Data** and/or **Performance Data** (linked or
  unlinked depending on SDK)

Update the privacy policy and submit a new app version. The nutrition
label change does NOT require re-review — but the next build upload
will sync the new declaration.
