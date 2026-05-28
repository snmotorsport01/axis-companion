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

export class DeviceClient {
  constructor(public readonly base: string) {}

  info(): Promise<DeviceInfo> {
    return fetchJson<DeviceInfo>(`${this.base}/api/info`);
  }
}
