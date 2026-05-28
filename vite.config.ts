import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this at <user>.github.io/axis-companion, so the
// build's asset URLs must be prefixed with the repo name.
const BASE = '/axis-companion/';

export default defineConfig({
  base: BASE,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'AXIS Companion',
        short_name: 'AXIS',
        description: 'Tune and update your AXIS smart-knob shifter.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // The device API is on a different origin (192.168.4.1) — never cache
        // its responses, always go to the network so we see live data.
        navigateFallback: BASE + 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/192\.168\.4\.1\//,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  }
});
