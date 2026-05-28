// =====================================================================
//  Global state — Svelte 5 runes, no external store library needed.
//  Persisted bits go through localStorage; transient state stays in memory.
// =====================================================================

import type { DeviceClient, DeviceInfo } from './api';

const LS_HOST_KEY = 'axis.host';

export type Page = 'connect' | 'dashboard' | 'tune' | 'ota' | 'calibrate' | 'live';

/**
 * True when the PWA is being served from the AXIS device itself (LittleFS via
 * the firmware's HTTP server), as opposed to the GitHub Pages mirror.
 *
 * `__DEVICE_BUILD__` is replaced at build time by Vite — see vite.config.ts.
 * That guarantees the device bundle behaves correctly even if a user later
 * proxies it through a different hostname.
 */
export const IS_DEVICE_BUILD =
  typeof __DEVICE_BUILD__ !== 'undefined' && __DEVICE_BUILD__;

class Store {
  page = $state<Page>(IS_DEVICE_BUILD ? 'dashboard' : 'connect');
  client = $state<DeviceClient | null>(null);
  info   = $state<DeviceInfo | null>(null);
  connected = $state(false);
  error  = $state<string | null>(null);

  // Saved host from last connect, for one-tap reconnect on next launch.
  lastHost = $state<string>(loadHost());

  setLastHost(h: string) {
    this.lastHost = h;
    try { localStorage.setItem(LS_HOST_KEY, h); } catch {}
  }

  goConnect()   { this.page = 'connect';   }
  goDashboard() { this.page = 'dashboard'; }
}

function loadHost(): string {
  try { return localStorage.getItem(LS_HOST_KEY) ?? ''; }
  catch { return ''; }
}

export const store = new Store();
