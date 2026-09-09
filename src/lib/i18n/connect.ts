// Connect / pairing screen (BLE scan + DEMO scene picker). One namespace file;
// auto-merged by lib/i18n.ts via import.meta.glob. en = source/fallback.
// AXIS / Bluetooth / BLE kept verbatim in every language.
import type { Row } from '../i18n';

export default {
  // ---- header ----
  'connect.not_connected': { en: 'NOT CONNECTED', th: 'ยังไม่ได้เชื่อมต่อ', zh: '未连接', ja: '未接続' },

  // ---- BLE connect card ----
  'connect.connect_to_axis': { en: 'Connect to AXIS', th: 'เชื่อมต่อ AXIS', zh: '连接 AXIS', ja: 'AXIS に接続' },
  'connect.scanning':   { en: 'SCANNING…',  th: 'กำลังสแกน…',     zh: '扫描中…',   ja: 'スキャン中…' },
  'connect.connecting': { en: 'connecting…', th: 'กำลังเชื่อมต่อ…', zh: '连接中…',   ja: '接続中…' },
  'connect.signal_strong': { en: 'Strong', th: 'แรง', zh: '强',    ja: '強' },
  'connect.signal_good':   { en: 'Good',   th: 'ดี',  zh: '良好',  ja: '良好' },
  'connect.signal_weak':   { en: 'Weak',   th: 'อ่อน', zh: '弱',   ja: '弱' },
  'connect.looking': { en: 'Looking for AXIS…', th: 'กำลังค้นหา AXIS…', zh: '正在查找 AXIS…', ja: 'AXIS を検索中…' },
  'connect.none_found': {
    en: "No AXIS found nearby. Make sure it's powered on and close by, then tap Connect again — or try the live preview below.",
    th: 'ไม่พบ AXIS ในบริเวณใกล้เคียง ตรวจสอบว่าเปิดเครื่องและอยู่ใกล้ ๆ แล้วแตะเชื่อมต่ออีกครั้ง — หรือลองดูตัวอย่างสดด้านล่าง',
    zh: '附近未找到 AXIS。请确认已开机并靠近，然后再次点击连接 — 或试试下方的实时预览。',
    ja: '近くに AXIS が見つかりません。電源が入っていて近くにあることを確認し、もう一度「接続」をタップしてください — または下のライブプレビューをお試しください。',
  },

  // ---- AXIS Gauge card ----
  'connect.gauge_title': { en: 'AXIS Gauge', th: 'เกจ AXIS', zh: 'AXIS 仪表', ja: 'AXIS ゲージ' },
  'connect.gauge_desc': {
    en: "Set the gauge's redline, shift light, warnings and colours. Connects on its own — no knob required.",
    th: 'ตั้งค่าเรดไลน์ ไฟชิฟต์ การแจ้งเตือน และสีของเกจ เชื่อมต่อได้ด้วยตัวเอง — ไม่ต้องใช้หัวเกียร์',
    zh: '设置仪表的红线、换挡灯、警告和颜色。可独立连接 — 无需换挡头。',
    ja: 'ゲージのレッドライン、シフトライト、警告、色を設定します。単独で接続でき — シフトノブは不要です。',
  },
  'connect.gauge_setup': { en: 'Set up AXIS Gauge', th: 'ตั้งค่าเกจ AXIS', zh: '设置 AXIS 仪表', ja: 'AXIS ゲージを設定' },

  // ---- Bluetooth unavailable card ----
  'connect.bt_unavailable_title': { en: 'Bluetooth unavailable', th: 'Bluetooth ไม่พร้อมใช้งาน', zh: 'Bluetooth 不可用', ja: 'Bluetooth を利用できません' },
  'connect.bt_unavailable_desc': {
    en: "Bluetooth isn't available here. Turn it on to connect your AXIS — or explore the app with the live preview below.",
    th: 'Bluetooth ไม่พร้อมใช้งานที่นี่ เปิดใช้งานเพื่อเชื่อมต่อ AXIS ของคุณ — หรือสำรวจแอปด้วยตัวอย่างสดด้านล่าง',
    zh: '此处无法使用 Bluetooth。开启后即可连接你的 AXIS — 或用下方的实时预览体验应用。',
    ja: 'ここでは Bluetooth を利用できません。オンにして AXIS を接続してください — または下のライブプレビューでアプリをお試しください。',
  },

  // ---- DEMO scene picker ----
  'connect.demo_title': { en: 'Take a look around', th: 'ลองดูรอบ ๆ', zh: '四处看看', ja: 'ちょっと見てみる' },
  'connect.demo_desc': {
    en: 'No AXIS yet? Explore the full app with a live preview — pick a scene to start.',
    th: 'ยังไม่มี AXIS? สำรวจแอปทั้งหมดด้วยตัวอย่างสด — เลือกฉากเพื่อเริ่มต้น',
    zh: '还没有 AXIS？用实时预览体验完整应用 — 选择一个场景开始。',
    ja: 'まだ AXIS がありませんか？ライブプレビューでアプリを丸ごと体験 — シーンを選んで開始。',
  },

  // ---- DEMO scenes (SCENES ids from mockClient.ts; resolved reactively in template) ----
  'connect.scene_default_label': { en: 'Overview', th: 'ภาพรวม', zh: '概览', ja: '概要' },
  'connect.scene_default_hint':  { en: 'A tour of AXIS at an easy pace', th: 'ทัวร์ชม AXIS แบบสบาย ๆ', zh: '轻松浏览 AXIS', ja: 'ゆったりペースで AXIS を一巡' },
  'connect.scene_cruise_label':  { en: 'Highway cruising', th: 'ล่องทางหลวง', zh: '高速巡航', ja: '高速クルージング' },
  'connect.scene_cruise_hint':   { en: 'Steady highway speed, top gear', th: 'ความเร็วคงที่บนทางหลวง เกียร์สูงสุด', zh: '平稳的高速车速，最高挡', ja: '一定の高速走行、トップギア' },
  'connect.scene_spirited_label': { en: 'Spirited backroad', th: 'ซิ่งทางลัดเลาะ', zh: '激情山路', ja: '攻めのワインディング' },
  'connect.scene_spirited_hint':  { en: 'Twisty roads, quick shifts', th: 'ถนนคดเคี้ยว เปลี่ยนเกียร์รวดเร็ว', zh: '蜿蜒山路，快速换挡', ja: 'くねくね道、素早いシフト' },
  'connect.scene_track_label':   { en: 'Track day', th: 'วันลงสนาม', zh: '赛道日', ja: 'サーキット走行' },
  'connect.scene_track_hint':    { en: 'Hard cornering and braking', th: 'เข้าโค้งและเบรกหนัก', zh: '激烈过弯与制动', ja: 'ハードなコーナリングとブレーキ' },
  'connect.scene_stopgo_label':  { en: 'City traffic', th: 'รถติดในเมือง', zh: '城市拥堵', ja: '市街地の渋滞' },
  'connect.scene_stopgo_hint':   { en: 'Stop-and-go around town', th: 'หยุดแล้วไปทั่วเมือง', zh: '市区走走停停', ja: '街中のストップ＆ゴー' },
  'connect.scene_idle_label':    { en: 'Parked', th: 'จอดอยู่กับที่', zh: '驻车', ja: '駐車中' },
  'connect.scene_idle_hint':     { en: 'Engine idling, sitting still', th: 'เครื่องเดินเบา จอดนิ่ง', zh: '引擎怠速，静止不动', ja: 'エンジンアイドリング、静止' },

  // ---- thrown-error fallbacks ----
  'connect.err_scan_failed':    { en: 'BLE scan failed', th: 'สแกน BLE ล้มเหลว', zh: 'BLE 扫描失败', ja: 'BLE スキャンに失敗しました' },
  'connect.err_connect_failed': { en: 'Connect failed',  th: 'เชื่อมต่อล้มเหลว', zh: '连接失败',     ja: '接続に失敗しました' },
} satisfies Record<string, Row>;
