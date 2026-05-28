// =====================================================================
//  Global state — Svelte 5 runes, no external store library needed.
//  Persisted bits go through localStorage; transient state stays in memory.
// =====================================================================

import type { DeviceClient, DeviceInfo } from './api';

const LS_HOST_KEY = 'axis.host';

export type Page = 'connect' | 'dashboard';

class Store {
  page = $state<Page>('connect');
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
