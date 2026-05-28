// ============================================================
//  Device API client — fetch wrapper for the AXIS HTTP server.
// ============================================================

/** Shape of GET /api/info — keep in sync with firmware AxisServer.cpp. */
export interface DeviceInfo {
  name: string;
  version: string;
  uptime_ms: number;
  free_heap: number;
  mode_id?: number;
  mode_name?: string;
  gear_count?: number;
  gear_index?: number;
  gear_label?: string;
  gear_frozen?: boolean;
}

const DEFAULT_TIMEOUT_MS = 4000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
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
  unit: string;
}

export type ConfigSnapshot = Record<string, TunableEntry>;

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

// ----- Firmware release manifest --------------------------------------
// Hosted on GitHub Pages alongside the PWA itself. The PWA fetches this
// (over cellular while the phone is also joined to AXIS Wi-Fi) and offers
// each entry as a one-tap install.
export interface ReleaseEntry {
  version:    string;       // e.g. "v0.3.0"
  date:       string;       // ISO date "2026-05-28"
  notes:      string;       // user-facing release notes (short)
  url:        string;       // absolute OR relative to manifest URL
  size_bytes: number;       // optional, used for progress
}
export interface ReleaseManifest {
  releases: ReleaseEntry[];
}

export const RELEASE_MANIFEST_URL =
  'https://snmotorsport01.github.io/axis-companion/firmware/index.json';

/** Fetch the latest release manifest from GitHub Pages. */
export async function fetchReleaseManifest(): Promise<ReleaseManifest> {
  const res = await fetch(RELEASE_MANIFEST_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
  return res.json() as Promise<ReleaseManifest>;
}

/** Resolve a possibly-relative release URL against the manifest's origin. */
export function resolveReleaseUrl(entry: ReleaseEntry): string {
  return new URL(entry.url, RELEASE_MANIFEST_URL).href;
}

export class DeviceClient {
  constructor(public readonly base: string) {}

  info(): Promise<DeviceInfo>            { return fetchJson(`${this.base}/api/info`); }
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

  /**
   * Download a firmware .bin from `url` (over the phone's internet
   * connection), then forward it to the device. Progress callback gets a
   * stage marker so the UI can show download vs upload phases distinctly.
   */
  async otaFromUrl(
    url: string,
    onProgress?: (frac: number, stage: 'download' | 'upload') => void
  ): Promise<void> {
    // ---- Download phase --------------------------------------------------
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok || !res.body) {
      throw new Error(`Download HTTP ${res.status}`);
    }
    const total = Number(res.headers.get('content-length') ?? '0');
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (onProgress && total) onProgress(received / total, 'download');
      }
    }
    // Reassemble into a File and reuse the existing upload path.
    const blob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' });
    const name = url.split('/').pop() || 'firmware.bin';
    const file = new File([blob], name, { type: 'application/octet-stream' });

    // ---- Upload phase ----------------------------------------------------
    await this.ota(file, p => onProgress?.(p, 'upload'));
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
