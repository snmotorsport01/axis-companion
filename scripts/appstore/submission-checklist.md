# Submission checklist — top-down walkthrough

Walk this top-down once. Each step is a single, concrete action.
Strikethrough as you complete.

---

## 0. Prerequisites (one-time)

- [ ] Apple Developer Program enrolled. Team ID is **BPA82FXJ4L**.
      (Confirmed already wired into `ios/App/App.xcodeproj/project.pbxproj`.)
- [ ] `DEVELOPMENT_TEAM=BPA82FXJ4L` exported in your shell rc
      (`~/.zshrc` or `~/.bashrc`). `scripts/archive.sh` will fail
      fast without it.
- [ ] Xcode 15+ installed. `xcodebuild -version` should print
      `Xcode 15.x` or newer.

---

## 1. Verify the public URLs are live

Open each in any browser. Each must return a normal page within ~3 s.
Apple's listing validator fetches them; a 404 or hang blocks
submission.

- [ ] `https://snmotorsport01.github.io/axis-companion/privacy.html`
- [ ] `https://snmotorsport01.github.io/axis-companion/support.html`
- [ ] `https://snmotorsport01.github.io/axis-companion/firmware/index.json`
      (for in-app OTA — sanity check that the manifest still serves)

If the github.io site is slow to update after a push, wait for the
"pages-build-deployment" Action on the repo to finish, then re-check.

---

## 2. Create the app record in App Store Connect

Browser path:
[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Apps
→ **+** → **New App**

Fields to set on this first screen:

- **Platforms**: iOS (only)
- **Name**: `AXIS Companion`
- **Primary Language**: English (U.S.)
- **Bundle ID**: select `com.snmotorsports.axis`
  (If it's not in the dropdown, you need to register it first at
  [developer.apple.com/account/resources/identifiers/list](https://developer.apple.com/account/resources/identifiers/list)
  → **+** → App IDs → App. Pick "Bluetooth LE" + "Wireless
  Accessory Configuration" capabilities.)
- **SKU**: `AXIS-COMPANION-IOS` (internal — never shown to users)
- **User Access**: Full Access

Click **Create**. ASC opens the app's main page.

---

## 3. Fill in the listing

Each row below points to an ASC sidebar section + the field to set.
Open `scripts/appstore/metadata.md` in the editor and copy values
across.

### App Information (left sidebar)

- [ ] Subtitle → from metadata.md
- [ ] Privacy Policy URL → from metadata.md
- [ ] Category → Utilities / Sports (primary / secondary)
- [ ] Content Rights → "Does your app contain, show, or access
      third-party content?" — answer **No** (we don't show third-
      party content; firmware update fetch is OUR content via
      GitHub Pages).
- [ ] Age Rating → open the questionnaire, answer **None / No** to
      everything. Should land at **4+**.

### Pricing and Availability

- [ ] Price → Free (Tier 0)
- [ ] Availability → All countries (or restrict if there's a region
      where you can't ship the hardware).

### App Privacy (left sidebar)

- [ ] Click "Get Started" / "Edit" → walk the questionnaire using
      `nutrition-label.md`. Answer **No, we do not collect data**
      at the top question and confirm each category beneath.

### Version 1.0 (current version row)

- [ ] App Description → from metadata.md (paste the long block)
- [ ] Keywords → from metadata.md
- [ ] Support URL → from metadata.md
- [ ] Marketing URL → from metadata.md
- [ ] Promotional Text → from metadata.md
- [ ] Copyright → `© 2026 SN Motorsports`

- [ ] **App Review Information** (further down the v1.0 page):
      - Sign-In Required → **No**
      - Notes → paste from `review-notes.md`
      - Contact Information → your name / phone (intl. format) /
        email

- [ ] **Screenshots** → 6 PNGs at 1290 × 2796 (and ideally also 6
      at 1242 × 2688). Drag-drop into the appropriate device-size
      slots. See `screenshots.md`.

- [ ] **App Icon** → ASC reads this from the IPA upload, no manual
      upload needed. (Just verify after upload that the rendered
      icon matches what's in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.)

---

## 4. Build, archive, and upload

From the `axis-companion` repo root:

```bash
# Confirm you're on the right branch and clean
git status
# Should show clean working tree on main.

# Sanity check the web bundle for Capacitor builds without firmware/
npm run build:device
du -sh dist-device
# Should be under 1 MB (firmware/ trimmed).

# Run the archive script. Bumps CFBundleVersion, archives, exports
# IPA. Adds 'upload' arg to push directly to App Store Connect.
./scripts/archive.sh upload
```

The script will:
1. `npm run build:device` (refresh dist-device/)
2. `npx cap sync ios` (push to the Capacitor iOS shell)
3. Bump `CFBundleVersion` (build number) in Info.plist
4. `xcodebuild archive` to `build/AxisCompanion-<build>.xcarchive`
5. `xcodebuild -exportArchive` to `build/AxisCompanion-<build>.ipa`
6. `xcrun altool --upload-app` to App Store Connect

Expected runtime: ~3–6 minutes depending on Mac speed.

If something fails mid-archive: read the last 30 lines of stderr —
codesigning errors are common on first run. Solutions:

- "No profiles found" → open the project in Xcode (`open
  ios/App/App.xcworkspace`), select the App target, Signing &
  Capabilities → tick "Automatically manage signing" and pick the
  team. Xcode generates a profile; close Xcode and re-run
  `./scripts/archive.sh`.
- "Missing app icon" → confirm
  `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
  is present and 1024×1024.
- altool "Authentication failed" → either set `APPLE_ID` +
  `ASC_PASSWORD` env vars OR run `xcrun notarytool
  store-credentials axis-altool` once to bake an app-specific
  password into the keychain.

---

## 5. After upload — processing wait

App Store Connect:

- The build appears under **TestFlight → iOS Builds** within ~5–15
  minutes. Status starts at "Processing"; wait until it flips to
  "Ready to Submit" (the spinner disappears).
- If Apple's automated check flags the build with a warning (e.g.,
  "missing usage description"), it shows in the build row's "i"
  popover. Fix in the next archive, bump the build number, re-upload.

---

## 6. (Recommended) TestFlight internal test

Before submitting for App Store review, test on a real device once.

ASC → TestFlight → Internal Testing → add your Apple ID as an
internal tester. The app appears in the TestFlight iOS app on your
iPhone within ~30 minutes; install and run through the main flow:

- [ ] Devices screen renders
- [ ] DEMO MODE button works
- [ ] Bottom navigation works
- [ ] All tabs load without crash
- [ ] If you have an AXIS knob: pair, OTA install, brand customisation

Force-close the app and reopen — no crash.

If anything broken, fix locally, bump build, re-archive, re-upload.

---

## 7. Submit for App Store review

Once the build is "Ready to Submit" and TestFlight smoke-tested:

ASC → app's main page → **Version 1.0** → **Build** section → pick the
processed build → **Submit for Review** at the top.

Last questionnaire:
- Export Compliance: "Does your app use encryption?" — Apple already
  reads `ITSAppUsesNonExemptEncryption=false` from the build, so this
  screen should auto-fill. If it asks: **No** (we use only OS-provided
  encryption, which qualifies for the standard exemption).
- IDFA: "Does this app use the Advertising Identifier?" — **No**.

Click **Submit**. Status changes to **Waiting for Review**.

---

## 8. Review timeline + likely paths

Apple's typical timeline (mid-2024 onwards):

- **Waiting for Review** → 24–48 hours for first review of a new app.
- **In Review** → 30 min to a few hours, usually.
- **Approved** → goes live within ~1 hour, or at the date you set.

### If rejected

The two most common rejection reasons for accessory apps:

1. **2.1 — App Completeness**: "We couldn't test the main feature".
   → The Review Notes from `review-notes.md` should preempt this.
   If it still happens, reply via Resolution Center pointing to the
   DEMO MODE flow.

2. **5.1.1 — Privacy / Permissions**: "Your purpose string for X
   doesn't describe why you use that data."
   → All our `*UsageDescription` strings already explain the reason
   in plain English. If the reviewer wants more detail, update the
   string in `Info.plist` and re-archive.

Reply to rejection messages within 24 hours — Apple favours quick
back-and-forth and reviewers will often re-test the same day.

---

## 9. After approval

- [ ] Bump `MARKETING_VERSION` in `project.pbxproj` from `1.0` →
      `1.1` for the next release.
- [ ] Tag the commit: `git tag -a appstore-v1.0 -m "First App Store
      release"; git push origin appstore-v1.0`.
- [ ] Save the IPA somewhere durable
      (`build/AxisCompanion-<n>.ipa`) in case you need it.
- [ ] Update the README's badge: "Available on the App Store" → link
      to the listing.

Done. From here, follow the same loop for every release: bump
version → archive → upload → submit.
