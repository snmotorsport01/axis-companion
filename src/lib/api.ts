// ============================================================
//  Device API client — fetch wrapper for the AXIS HTTP server.
// ============================================================

/** Shape of GET /api/info — keep in sync with firmware AxisServer.cpp. */
export interface DeviceInfo {
  name: string;
  version: string;
  /** Internal build tag (e.g. "v2.5.12"). Optional for backwards compat
   *  with devices on firmware < v2.5.12 that don't expose this yet. */
  build?: string;
  uptime_ms: number;
  free_heap: number;
  mode_id?: number;
  mode_name?: string;
  gear_count?: number;
  gear_index?: number;
  gear_label?: string;
  gear_frozen?: boolean;
}

// ============================================================
//  Release manifest — single source of truth for "latest firmware".
//  Hosted at <PWA origin>/firmware/index.json (e.g. github.io for the
//  web build; axis-companion repo's /public/firmware/ in source).
//
//  Entries with `url === null` are "preview" rows — listed so the
//  companion can show release notes, but install is blocked until a
//  binary is actually published.
// ============================================================
export interface ReleaseEntry {
  /** Public product label (e.g. "AXIS V1.0.0"). Stable across the V1 line. */
  version: string;
  /** Internal build tag (e.g. "v2.5.12"). Optional on legacy entries
   *  that predate the build field — those don't participate in
   *  "update available" detection. */
  build?: string;
  date: string;
  notes: string;
  /** Absolute or relative URL to the .bin. null = preview only. */
  url: string | null;
  size_bytes: number;
  status?: 'preview' | 'stable';
}

export interface ReleaseManifest {
  _schema: string;
  releases: ReleaseEntry[];
}

/** Where the companion fetches the firmware manifest from. Always an
 *  absolute https URL so the native iOS app (loaded from capacitor://
 *  localhost) can reach it the same way as the web PWA.
 *
 *  Owner is `snmotorsport01` (not `snmotorsports` — confused the brand
 *  name with the GitHub handle on first pass; the wrong URL returned a
 *  GitHub Pages "Site not found" page that the companion surfaced as
 *  "release load fail"). The repo's Pages site serves index.json with
 *  `access-control-allow-origin: *` so the capacitor://localhost
 *  webview's CORS check passes. */
export const MANIFEST_URL =
  'https://snmotorsport01.github.io/axis-companion/firmware/index.json';

export async function fetchReleaseManifest(
  timeoutMs = 8000
): Promise<ReleaseManifest> {
  // Cache-busting query so users don't get a stale manifest from an
  // intermediate proxy / browser cache the moment we publish an update.
  const url = `${MANIFEST_URL}?t=${Date.now()}`;
  return fetchJson<ReleaseManifest>(url, { timeoutMs });
}

const DEFAULT_TIMEOUT_MS = 4000;

async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {})
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(tid);
  }
}

/** Normalise user input (`192.168.4.1`, `http://...`, `axis.local`) into a base URL. */
export function normaliseHost(input: string): string {
  let s = input.trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  return s.replace(/\/+$/, '');
}

/** One tunable parameter's metadata + current value (see firmware /api/config). */
export interface TunableEntry {
  v:    number;
  min:  number;
  max:  number;
  def:  number;
  unit: string;        // "ms" | "g" | "dps" | "deg" | "" | "enum"
  // Only present when unit === "enum": display strings indexed by v.
  // The firmware uses underscored helper-array keys ("__transitionNames",
  // "__gearAnimNames") to ship these; they get attached here as `names`.
  names?: string[];
}

export type ConfigSnapshot = Record<string, TunableEntry>;

export interface WifiStatus {
  ssid:       string;
  configured: boolean;
  connected:  boolean;
  ip?:        string;
  rssi:       number;
}

export interface BrandingSnapshot {
  name:                 string;
  accent565:            number;
  accent_hex:           string;
  max_name:             number;
  // v1.2.2+ per-element colour slots — fully independent. Each is
  // stored on its own in NVS; the PWA picks an editable colour per
  // slot without inheritance toggles.
  gear_hex:             string;
  meter_hex:            string;
  name_hex:             string;
  fg_hex:               string;
  muted_hex:            string;
  warn_hex:             string;
  screensaver:          boolean;
  screensaver_w:        number;
  screensaver_h:        number;
  screensaver_size:     number;     // expected raw bytes (W*H*2) for legacy
  screensaver_frames:   number;
  screensaver_fps:      number;
  screensaver_animated: boolean;
}

/** Detailed system snapshot for the SYS panel (see /api/sys). */
export interface SysSnapshot {
  version:        string;
  uptime_ms:      number;
  free_heap:      number;
  min_heap:       number;
  heap_size:      number;
  psram_size:     number;
  psram_free:     number;
  flash_size:     number;
  cpu_mhz:        number;
  mac:            string;
  ap_ssid?:       string;
  ap_ip?:         string;
  ap_clients?:    number;
  sta_connected:  boolean;
  sta_ssid?:      string;
  sta_ip?:        string;
  sta_rssi?:      number;
  mode_name?:     string;
  gear_count?:    number;
  imu?: {
    ax: number; ay: number; az: number;
    gx: number; gy: number; gz: number;
    roll: number; pitch: number;
  };
  battery?: {
    volts:    number;
    percent:  number;
    present:  boolean;
    charging: boolean;
    low:      boolean;
  };
}

export interface CalibSnapshot {
  mode_id:     number;
  mode_name:   string;
  gear_count:  number;
  calib_steps: number;
  steps:       Array<{ label: string; hint: string }>;
  imu_zero:    { roll: number; pitch: number; yaw: number };
}

export interface TelemetryFrame {
  t:      number;
  roll:   number;
  pitch:  number;
  gyro:   number;
  accel:  number;
  motion: boolean;
  gear:   number;
  label:  string;
  frozen: boolean;
}

// Firmware release-manifest flow (fetchReleaseManifest / resolveReleaseUrl /
// otaFromUrl / otaFromDevice) was removed when we moved to USB-flash as the
// primary install path. The OTA tab is now upload-only — the user picks a
// local .bin and streams it via DeviceClient.ota() below.

export class DeviceClient {
  constructor(public readonly base: string) {}

  info(): Promise<DeviceInfo>            { return fetchJson(`${this.base}/api/info`); }
  sys():  Promise<SysSnapshot>           { return fetchJson(`${this.base}/api/sys`);  }
  reboot():       Promise<{ ok: boolean }> { return fetchJson(`${this.base}/api/reboot`,        { method: 'POST' }); }
  factoryReset(): Promise<{ ok: boolean }> { return fetchJson(`${this.base}/api/factory-reset`, { method: 'POST' }); }

  config(): Promise<ConfigSnapshot>      { return fetchJson(`${this.base}/api/config`); }

  patchConfig(patch: Record<string, number>): Promise<{ ok: boolean }> {
    return fetchJson(`${this.base}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
  }

  saveConfig():  Promise<{ ok: boolean }> { return fetchJson(`${this.base}/api/config/save`,  { method: 'POST' }); }
  resetConfig(): Promise<{ ok: boolean }> { return fetchJson(`${this.base}/api/config/reset`, { method: 'POST' }); }

  calibration(): Promise<CalibSnapshot>   { return fetchJson(`${this.base}/api/calibration`); }
  resetCalibration(): Promise<{ ok: boolean }> {
    return fetchJson(`${this.base}/api/calibration/reset`, { method: 'POST' });
  }

  branding(): Promise<BrandingSnapshot>   { return fetchJson(`${this.base}/api/branding`); }
  /**
   * Mutate branding. Any field can be omitted. Per-element slot hexes
   * (gear_hex/meter_hex/name_hex) accept "" to clear the override and
   * re-inherit from accent.
   */
  setBranding(patch: {
    name?:       string;
    accent_hex?: string;
    gear_hex?:   string;
    meter_hex?:  string;
    name_hex?:   string;
    fg_hex?:     string;
    muted_hex?:  string;
    warn_hex?:   string;
  }): Promise<{ ok: boolean }> {
    return fetchJson(`${this.base}/api/branding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
  }
  resetBranding(): Promise<{ ok: boolean }> {
    return fetchJson(`${this.base}/api/branding/reset`, { method: 'POST' });
  }

  /** Upload raw RGB565 little-endian pixels (W*H*2 bytes) as the screensaver.
   *  Handles a known iOS Safari quirk: large POSTs over the AXIS SoftAP
   *  sometimes finish the upload phase, the device commits to LittleFS,
   *  but Safari never delivers the response back to xhr.onload — the
   *  PWA then hangs on "UPLOADING…" forever even though the device is
   *  fine. We watch for the upload-body completing (`xhr.upload.onload`),
   *  give the server a 5 s grace window to send a response, and if it
   *  doesn't, assume success and resolve. The actual save state is
   *  visible by re-reading /api/branding right after. */
  async uploadScreensaver(
    bytes: Uint8Array,
    onProgress?: (frac: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.base}/api/branding/screensaver`);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.timeout = 60_000;   // hard upper bound — bail if nothing happens at all

      let uploadDone = false;
      let settled    = false;
      const finish = (cb: () => void) => { if (!settled) { settled = true; cb(); } };

      xhr.upload.onprogress = e => {
        if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.upload.onload = () => {
        // Body fully shipped to the device. Most browsers race on to
        // fire xhr.onload moments later — but iOS Safari sometimes
        // doesn't. Schedule a fallback: if onload hasn't fired in 5 s
        // we treat the upload as successful, since the device almost
        // certainly committed the bytes already.
        uploadDone = true;
        if (onProgress) onProgress(1);
        setTimeout(() => finish(resolve), 5000);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) finish(resolve);
        else finish(() => reject(new Error(`HTTP ${xhr.status} ${xhr.responseText}`)));
      };
      xhr.onerror = () => {
        // If the body finished cleanly, a "network error" here is just
        // the connection closing after a lost response — treat as ok.
        if (uploadDone) finish(resolve);
        else            finish(() => reject(new Error('upload network error')));
      };
      xhr.ontimeout = () => {
        if (uploadDone) finish(resolve);
        else            finish(() => reject(new Error('upload timeout')));
      };
      xhr.send(bytes.buffer as ArrayBuffer);
    });
  }

  clearScreensaver(): Promise<{ ok: boolean }> {
    return fetchJson(`${this.base}/api/branding/screensaver/clear`, { method: 'POST' });
  }

  /** Get device's home-WiFi station status. */
  wifi(): Promise<WifiStatus> { return fetchJson(`${this.base}/api/wifi`); }

  /** Update home-WiFi creds. Device starts associating immediately. */
  setWifi(ssid: string, password: string): Promise<{ ok: boolean }> {
    return fetchJson(`${this.base}/api/wifi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid, password })
    });
  }

  /** Stream a firmware .bin to /api/ota. onProgress reports 0..1. */
  async ota(file: File, onProgress?: (frac: number) => void): Promise<void> {
    // We use XMLHttpRequest specifically for upload progress events — fetch
    // doesn't expose them in browsers as of writing.
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('firmware', file, file.name);
      xhr.open('POST', `${this.base}/api/ota`);
      xhr.upload.onprogress = e => {
        if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`OTA failed: HTTP ${xhr.status} ${xhr.responseText}`));
      };
      xhr.onerror = () => reject(new Error('OTA network error'));
      xhr.send(form);
    });
  }

  /** Open a telemetry WebSocket. Caller is responsible for .close(). */
  openTelemetry(onFrame: (f: TelemetryFrame) => void, onError?: (e: Event) => void): WebSocket {
    // Translate http(s):// → ws(s):// against the same origin as the REST API.
    const wsBase = this.base.replace(/^http/, 'ws');
    const sock = new WebSocket(`${wsBase}/api/stream`);
    sock.onmessage = ev => {
      try { onFrame(JSON.parse(ev.data) as TelemetryFrame); }
      catch (e) { /* ignore malformed frame */ }
    };
    if (onError) sock.onerror = onError;
    return sock;
  }
}
