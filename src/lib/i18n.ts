// ---------------------------------------------------------------------------
//  i18n — lightweight, dependency-free translation for the SN AXIS app.
//
//  Usage:  import { t } from '../lib/i18n';   t('home.connect_axis')
//  · t(key) reads store.lang (a $state) → reactive in rune templates; in the
//    legacy AxisShell it's read at render() time and setLang() calls render().
//  · Missing key OR missing language → falls back to English, so a page that
//    isn't translated yet still shows (English), never blank/crash.
//  · {var} placeholders: t('x', {n: 3}).
//
//  DICTIONARY IS AUTO-MERGED: every file in ./i18n/*.ts that `export default`s
//  a Record<string, Row> is picked up here via import.meta.glob — so adding a
//  page's translations is just dropping a new file in lib/i18n/, no edit here.
//  Keys are global (namespace them: 'looks.save', 'chan.170', …).
//
//  Languages: en (source/fallback), th, zh (Simplified), ja. Default en on a
//  fresh install; the user's pick is remembered in localStorage.
// ---------------------------------------------------------------------------
import { store } from './store.svelte';

export type Lang = 'en' | 'th' | 'zh' | 'ja';
export type Row = Partial<Record<Lang, string>>;   // en expected; others optional

export const LANGS: { code: Lang; native: string; label: string }[] = [
  { code: 'en', native: 'EN',     label: 'English'  },
  { code: 'th', native: 'ไทย',    label: 'Thai'     },
  { code: 'zh', native: '中文',   label: 'Chinese'  },
  { code: 'ja', native: '日本語', label: 'Japanese' },
];

// Merge every ./i18n/*.ts default export into one flat dictionary at build time.
const parts = import.meta.glob<{ default: Record<string, Row> }>('./i18n/*.ts', { eager: true });
const DICT: Record<string, Row> = {};
for (const m of Object.values(parts)) Object.assign(DICT, m.default);

const FALLBACK: Lang = 'en';

/** Translate a key for the current store.lang, falling back to English. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = (store.lang || FALLBACK) as Lang;
  const row = DICT[key];
  let s = (row && (row[lang] ?? row[FALLBACK])) ?? key;   // unknown key → echo the key (visible in dev)
  if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', String(vars[k]));
  return s;
}

/** True if a key exists in the dictionary (any language). Lets callers fall
 *  back to a non-i18n default (e.g. a channel's English label) instead of the
 *  raw key when no translation row was authored. */
export function has(key: string): boolean {
  return key in DICT;
}

/** Change language: update the store, persist, and reflect on <html data-lang>. */
export function setLang(l: Lang): void {
  store.lang = l;
  try { localStorage.setItem('axis.lang', l); } catch { /* private mode */ }
  try { document.documentElement.dataset.lang = l; } catch { /* SSR */ }
}

/** Read the saved language on boot (default en). Call once at app start. */
export function initLang(): void {
  let l: Lang = FALLBACK;
  try {
    const saved = localStorage.getItem('axis.lang') as Lang | null;
    if (saved && LANGS.some(x => x.code === saved)) l = saved;
  } catch { /* ignore */ }
  store.lang = l;
  try { document.documentElement.dataset.lang = l; } catch { /* ignore */ }
}
