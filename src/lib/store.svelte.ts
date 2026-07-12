// =====================================================================
//  Global state — Svelte 5 runes, no external store library needed.
//  Persisted bits go through localStorage; transient state stays in memory.
// =====================================================================

import type { DeviceClient, DeviceInfo } from './api';
import { MockClient } from './mockClient';
import type { GaugeBleClient } from './gaugeBleClient';
import type { MonitorBleClient } from './monitorCfg';

const LS_HOST_KEY = 'axis.host';

export type Page = 'connect' | 'tune' | 'ota' | 'calibrate'
                 | 'live' | 'brand' | 'sys' | 'screensaver' | 'devices'
                 | 'gaugesetup'
                 // v3.1 buyer-facing simple surface (Looks/Feel) + Pro door.
                 | 'looks' | 'feel' | 'pro'
                 // Diagnostics: fault codes, accel times, logs, bus capture.
                 | 'diag'
                 // Drivetrain: pick the car → per-car calc-gear on the monitor.
                 | 'drivetrain'
                 // Monitor firmware update + full gauge-display (GaugeCfg) editor.
                 | 'monota' | 'monconfig';

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

/**
 * True when running inside a Capacitor native wrapper (iOS/Android app).
 * Capacitor injects `window.Capacitor` synchronously before the app loads.
 *
 * Why this matters: the iOS/Android Capacitor app currently REUSES the
 * dist-device bundle (so base=`/` works for the capacitor://localhost
 * scheme) — which means IS_DEVICE_BUILD is also true there, even though
 * we're NOT actually hosted by the firmware. Auto-instantiating a client
 * at window.location.origin would point at capacitor://localhost and
 * every fetch would 404. Capacitor builds need the manual Connect flow
 * (or the DEMO MODE button) instead.
 */
export const IS_CAPACITOR =
  typeof (globalThis as any).Capacitor !== 'undefined';

class Store {
  // Live is now the landing page (was Dashboard). The companion app is meant
  // to feel like an instrument cluster — open it, see live data, with the
  // bottom nav as the navigation surface. Dashboard's tile grid was obsolete
  // for that pattern, so the page has been removed.
  // Auto-land on Live only when the PWA is actually served by the
  // firmware (real device embed). In a Capacitor wrapper there's no
  // device on the other end of capacitor://localhost — force the
  // Connect screen so the user can enter the AP IP or hit DEMO MODE.
  page = $state<Page>(IS_DEVICE_BUILD && !IS_CAPACITOR ? 'live' : 'connect');
  client = $state<DeviceClient | null>(null);
  info   = $state<DeviceInfo | null>(null);
  connected = $state(false);
  error  = $state<string | null>(null);

  // AXIS Gauge — a SEPARATE BLE peripheral from the knob, configured on the
  // Gauge Setup page. Held here (not page-local) so the link survives in-app
  // navigation, exactly like the knob's `client` — re-entering Gauge Setup
  // reuses it instead of re-scanning. Null until the user connects a gauge.
  gaugeClient = $state<GaugeBleClient | null>(null);

  // AXIS Monitor — the CAN monitor is its OWN BLE peripheral ("AXIS Monitor",
  // svc 7e1c0201), distinct from the knob and the gauge. The Drivetrain page
  // connects here to read/write the monitor's GaugeCfg (per-car calc-gear).
  // Held here so the link survives navigation. Null until connected.
  monClient = $state<MonitorBleClient | null>(null);

  // Saved host from last connect, for one-tap reconnect on next launch.
  lastHost = $state<string>(loadHost());

  setLastHost(h: string) {
    this.lastHost = h;
    try { localStorage.setItem(LS_HOST_KEY, h); } catch {}
  }

  /** True in DEMO MODE (the synthetic MockClient). Pages read this to hide
   *  device-only / destructive actions a hardware-less reviewer can't use. */
  get isDemo(): boolean { return this.client instanceof MockClient; }

  goConnect()   { this.page = 'connect';   }
  goLive()      { this.page = 'live';      }
}

function loadHost(): string {
  try { return localStorage.getItem(LS_HOST_KEY) ?? ''; }
  catch { return ''; }
}

export const store = new Store();
