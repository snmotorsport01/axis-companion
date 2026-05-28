# axis-companion

Companion PWA for the [AXIS smart-knob shifter](https://github.com/snmotorsport01/smart_knob_shifter).
Connect over WiFi to tune, calibrate, OTA-update, and customise your device.

## Status (P1)

- ✅ Connect to a device running the firmware's `APP` mode (SoftAP + HTTP server).
- ✅ Live-poll `/api/info` from the dashboard.
- ⏳ P2: Tune (config sliders), OTA (firmware upload).
- ⏳ P3: Calibration viewer/editor.
- ⏳ P4: WebSocket telemetry stream.

## Stack

- Vite 5 + Svelte 5 (runes) + TypeScript
- `vite-plugin-pwa` (Workbox)
- No CSS framework — design tokens in `src/app.css`.

## Local development

```bash
# install Node 20+ first (e.g. via Homebrew: brew install node)
npm install
npm run dev      # http://localhost:5173/axis-companion/
```

Then on the device: 5-tap the main screen → `APP`. Scan the QR or connect
to the SSID shown, then type `192.168.4.1` in the PWA's IP field.

## Production build

```bash
npm run build    # output: ./dist
npm run preview  # serves the built site locally
```

## Deploy

Pushes to `main` build and deploy to GitHub Pages via the workflow in
`.github/workflows/deploy.yml`. Enable Pages in repo settings → Source =
"GitHub Actions". Live URL: <https://snmotorsport01.github.io/axis-companion>

## Folder layout

```
src/
  App.svelte            root, switches between pages
  main.ts               mount point
  app.css               design tokens
  lib/
    api.ts              fetch wrapper for /api/*
    store.svelte.ts     global state (Svelte 5 runes)
  pages/
    Connect.svelte      manual IP entry
    Dashboard.svelte    live /api/info display
public/
  favicon.svg
  manifest.webmanifest
  icons/                placeholder PNGs (generate from logo before release)
.github/workflows/
  deploy.yml            auto-deploy to GitHub Pages
```

## Icons (todo before first release)

Drop three PNGs in `public/icons/`:

| File | Size | Notes |
|---|---|---|
| `icon-192.png` | 192×192 | basic |
| `icon-512.png` | 512×512 | basic |
| `icon-512-maskable.png` | 512×512 | inside-safe-zone (Android adaptive) |

Until they exist, the manifest will 404 those entries — PWA still works,
just the home-screen icon will be the default.
