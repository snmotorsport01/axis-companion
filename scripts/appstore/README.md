# App Store submission pack — SN AXIS

Everything you need to copy-paste into App Store Connect (ASC) to ship
SN AXIS to the App Store. Files in this folder:

- `metadata.md` — Text fields you paste into the ASC app listing (title,
  description, keywords, etc.).
- `review-notes.md` — App Review Information notes for the Apple
  reviewer team. Critical for a BLE-dependent app: explains how to use
  DEMO MODE so they don't reject for "couldn't test main feature".
- `nutrition-label.md` — App Privacy nutrition label answers. ASC asks
  ~20 questions; the answers here justify each one.
- `screenshots.md` — Required screenshot specs + a shot list so you
  don't have to guess what to capture or how to size them.
- `submission-checklist.md` — Step-by-step from "Apple Developer
  enrolled" to "Submit for Review". Walk it top-down once and the
  submission lands.

## Public URLs you'll need

These need to be live before you can fill out ASC. They land on GitHub
Pages automatically when `main` is pushed:

- Privacy Policy: `https://snmotorsport01.github.io/axis-companion/privacy.html`
- Support URL:    `https://snmotorsport01.github.io/axis-companion/support.html`
- Marketing URL (optional): `https://snmotorsport01.github.io/axis-companion/`

Verify each one loads in a browser before submission — Apple's URL
validator will reject the listing if any 404 or hang.
