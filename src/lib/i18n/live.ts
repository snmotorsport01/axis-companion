// Live telemetry page. One namespace file; auto-merged by lib/i18n.ts via
// import.meta.glob. en = source/fallback. Rune page → values are plain TEXT
// (actual Unicode glyphs, no HTML entities).
import type { Row } from '../i18n';

export default {
  // ---- connection status (header pill) ----
  'live.status_connected':    { en: 'Connected',     th: 'เชื่อมต่อแล้ว',   zh: '已连接',   ja: '接続済み' },
  'live.status_connecting':   { en: 'Connecting…',   th: 'กำลังเชื่อมต่อ…', zh: '连接中…',   ja: '接続中…' },
  'live.status_lost':         { en: 'Connection lost', th: 'การเชื่อมต่อหลุด', zh: '连接已断开', ja: '接続が切れました' },
  'live.status_disconnected': { en: 'Disconnected',  th: 'ไม่ได้เชื่อมต่อ', zh: '未连接',   ja: '未接続' },

  // ---- gauge shortcut (AXIS kept as product name) ----
  'live.gauge_link':      { en: 'AXIS Gauge',    th: 'AXIS เกจ',       zh: 'AXIS 仪表', ja: 'AXIS ゲージ' },
  'live.gauge_connected': { en: 'connected',     th: 'เชื่อมต่อแล้ว',   zh: '已连接',    ja: '接続済み' },
  'live.gauge_setup':     { en: 'tap to set up', th: 'แตะเพื่อตั้งค่า',  zh: '点击设置',  ja: 'タップで設定' },

  // ---- body ----
  'live.connecting':   { en: 'Connecting to your AXIS…', th: 'กำลังเชื่อมต่อกับ AXIS…', zh: '正在连接你的 AXIS…', ja: 'AXIS に接続中…' },
  'live.current_gear': { en: 'Current gear', th: 'เกียร์ปัจจุบัน', zh: '当前挡位', ja: '現在のギア' },

  'live.in_motion':   { en: 'In motion',  th: 'กำลังเคลื่อนที่', zh: '行驶中',   ja: '走行中' },
  'live.still':       { en: 'Still',       th: 'อยู่นิ่ง',       zh: '静止',     ja: '停止中' },
  'live.gear_locked': { en: 'Gear locked', th: 'ล็อกเกียร์',     zh: '挡位已锁', ja: 'ギアロック' },
  'live.live':        { en: 'Live',        th: 'สด',            zh: '实时',     ja: 'ライブ' },

  // ---- tilt card ----
  'live.tilt':    { en: 'Tilt', th: 'เอียง', zh: '倾斜', ja: '傾き' },
  'live.lean':    { en: 'Lean', th: 'เอน',   zh: '侧倾', ja: 'ロール' },
  'live.tilt_5s': { en: 'Tilt — last 5s', th: 'เอียง — 5 วิ ล่าสุด', zh: '倾斜 — 最近 5 秒', ja: '傾き — 直近 5 秒' },

  // ---- pause/resume (leading glyph kept) ----
  'live.resume': { en: 'RESUME', th: 'เล่นต่อ',       zh: '继续', ja: '再開' },
  'live.pause':  { en: 'PAUSE',  th: 'หยุดชั่วคราว', zh: '暂停', ja: '一時停止' },
} satisfies Record<string, Row>;
