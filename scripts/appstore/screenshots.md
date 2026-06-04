# Screenshots — required sizes + shot list

ASC accepts up to 10 screenshots per device family. As of 2024 Apple
requires **two** device families at minimum:

| Device family            | Resolution     | Required? |
|--------------------------|----------------|-----------|
| iPhone 6.7" / 6.9"       | 1290 × 2796 px | YES        |
| iPhone 6.5"              | 1242 × 2688 px | YES        |
| iPad 13" (M4)            | 2064 × 2752 px | only if iPad listed |
| iPad 12.9"               | 2048 × 2732 px | only if iPad listed |

We list iPhone only (the app is iPhone-first; iPad works but layout
isn't tuned for it). So focus on:

1. **iPhone 6.7" / 6.9"** — 1290 × 2796 (Pro Max class)
2. **iPhone 6.5"** — 1242 × 2688 (XS Max / 11 Pro Max class)

Apple's reviewer hardware is usually a 6.5" iPhone, so 6.5" matters
even though 6.7" feels "newer".

---

## How to capture

Two options, in increasing order of trouble:

### Option A — capture from a real iPhone (recommended)

The fastest path if you own an iPhone Pro Max. iOS native
screenshots are already at the right resolution.

1. Build and install the app on your iPhone via Xcode (the
   `npm run sync:device && open ios/App.xcworkspace` path).
2. Walk through each screen below.
3. Press Side + Volume Up to capture. The screenshot lands in
   Photos → Screenshots at the native resolution.
4. AirDrop to your Mac. Rename per the convention in the shot list.

### Option B — Xcode simulator

Works if you don't own a Pro Max but matches the same pixel
dimensions Apple expects:

1. Open `ios/App.xcworkspace` in Xcode.
2. Pick a simulator from the device dropdown:
   - **iPhone 15 Pro Max** → 1290 × 2796
   - **iPhone 14 Plus** → 1284 × 2778 (close enough to 6.5" tier)
   - **iPhone Xs Max** → 1242 × 2688 (canonical 6.5")
3. Run the app (Cmd-R). Wait for it to launch.
4. Screenshot the simulator: `Cmd-S` saves a PNG to `~/Desktop`
   at the simulator's native resolution (no upscaling).

Both options produce App-Store-acceptable PNGs.

---

## Shot list — 6 frames (paste in this order)

This sequence walks a buyer from "what is this" to "how deep does
it go". Apple shows the first 3 frames as "preview screens" in
search results — front-load the visual punch.

1. **Devices.svelte** with the BLE scan result populated.
   *Hero shot — the moment of "oh, this connects to my knob".*

2. **Live.svelte** with a track of telemetry showing roll/pitch
   tilt, gear position, and the G-meter dot.
   *Shows the live-data depth — proves the app is real.*

3. **Brand.svelte** with the colour picker open + the device
   preview disc lit up to the right.
   *Customisation hook — the most "shareable" frame.*

4. **Tune.svelte** scrolled mid-page so the user can see the
   1-line-per-setting layout.
   *Justifies the price of the hardware — "look at all these
    knobs".*

5. **Screensaver.svelte** with a custom image loaded in the
   preview panel.
   *Differentiator — most accessory apps don't have a screensaver
    editor.*

6. **Ota.svelte** with the manifest loaded and a version row
   highlighted.
   *Closes the loop — the app maintains itself.*

If you want more frames, candidates: Calibrate.svelte (wizard step
3), Music.svelte once v2.6 is tested.

---

## File naming convention (helps when uploading)

Drag these into ASC in numeric order so the on-listing position
matches the shot list:

```
01-devices-1290x2796.png
02-live-1290x2796.png
03-brand-1290x2796.png
04-tune-1290x2796.png
05-screensaver-1290x2796.png
06-ota-1290x2796.png
```

Then a second set with the `-1242x2688` suffix for the 6.5" tier.
You can resample 1290×2796 → 1242×2688 in Preview (export as PNG,
specify dimensions), but Apple prefers a native capture per size —
capture once per simulator if you have time.

---

## Pre-flight checklist before uploading

- [ ] PNG, not JPEG. (ASC silently re-encodes JPEG and the result is
      sometimes lossy.)
- [ ] Status bar is **clean** — full battery, full bars, sensible
      time. Simulator usually shows "9:41" by default which is
      Apple's preferred fake-time; don't override it.
- [ ] No personal info visible (phone numbers in the contact card,
      etc.).
- [ ] No competitor app names visible if you screenshot a real
      device.
- [ ] At least the first 3 frames "tell a story" at thumbnail size
      — text bigger than 24 px or there's a strong dominant colour
      / shape.

If any frame has text overlay you added (callouts), use the same
brand accent (`#ffa500`) for the highlight stroke. Don't import
stock fonts — system font on the iPhone is fine and reads
authentic.
