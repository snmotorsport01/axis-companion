/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Build-time flag injected by vite.config.ts. `true` when the bundle is
// destined for the device's embedded HTTP server (served from same origin
// as /api/info); `false` for the GitHub Pages build.
declare const __DEVICE_BUILD__: boolean;

// gifenc ships no type declarations — used by lib/axsv.ts for the GIF export.
declare module 'gifenc';
