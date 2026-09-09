// Devices page — knob / gauge / CAN-module cards. One namespace file;
// auto-merged by lib/i18n.ts via import.meta.glob. en = source/fallback.
// AXIS, Bluetooth, ESP-NOW, SoftAP, OBD-II, ECU, CAN-H/L, DTC, GPS, IMU,
// AMOLED and model numbers (GC9A01, dBm, MAC, RPM) are kept as-is per glossary.
import type { Row } from '../i18n';

export default {
  'devices.title':    { en: 'Devices', th: 'อุปกรณ์', zh: '设备', ja: 'デバイス' },
  'devices.back_pro': { en: 'Pro', th: 'ตั้งค่า', zh: '设置', ja: '設定' },

  // ---- shared status ----
  'devices.connected':     { en: 'CONNECTED', th: 'เชื่อมต่อแล้ว', zh: '已连接', ja: '接続済み' },
  'devices.offline':       { en: 'OFFLINE', th: 'ออฟไลน์', zh: '离线', ja: 'オフライン' },
  'devices.not_connected': { en: 'NOT CONNECTED', th: 'ยังไม่เชื่อมต่อ', zh: '未连接', ja: '未接続' },
  'devices.coming':        { en: 'COMING', th: 'เร็ว ๆ นี้', zh: '即将推出', ja: '近日公開' },

  // ---- knob card ----
  'devices.knob_name': { en: 'AXIS Knob', th: 'หัวเกียร์ AXIS', zh: 'AXIS 换挡头', ja: 'AXIS シフトノブ' },
  'devices.knob_sub':  { en: 'Smart shifter · GC9A01 1.28"', th: 'ชิฟเตอร์อัจฉริยะ · GC9A01 1.28"', zh: '智能换挡器 · GC9A01 1.28"', ja: 'スマートシフター · GC9A01 1.28"' },

  'devices.name':    { en: 'Name', th: 'ชื่อ', zh: '名称', ja: '名前' },
  'devices.version': { en: 'Version', th: 'เวอร์ชัน', zh: '版本', ja: 'バージョン' },
  'devices.build':   { en: 'Build', th: 'บิลด์', zh: '构建', ja: 'ビルド' },

  'devices.bt_unavailable': {
    en: "Bluetooth isn't available here. Turn it on to connect your AXIS, or explore the app with the live preview from the Connect screen.",
    th: 'Bluetooth ใช้งานไม่ได้ที่นี่ เปิดใช้งานเพื่อเชื่อมต่อ AXIS ของคุณ หรือสำรวจแอปด้วยตัวอย่างสดจากหน้าเชื่อมต่อ',
    zh: '此处无法使用 Bluetooth。开启它以连接你的 AXIS，或从连接页面用实时预览浏览应用。',
    ja: 'ここでは Bluetooth を利用できません。オンにして AXIS を接続するか、接続画面のライブプレビューでアプリをお試しください。',
  },
  'devices.scan_hint': {
    en: "Scan the airwaves for AXIS knobs nearby. They advertise on Bluetooth the moment they're powered on — no SoftAP join required.",
    th: 'สแกนหาหัวเกียร์ AXIS ที่อยู่ใกล้ ๆ อุปกรณ์จะกระจายสัญญาณผ่าน Bluetooth ทันทีที่เปิดเครื่อง — ไม่ต้องเข้าร่วม SoftAP',
    zh: '扫描附近的 AXIS 换挡头。它们一通电就会通过 Bluetooth 广播 — 无需加入 SoftAP。',
    ja: '近くの AXIS シフトノブをスキャンします。電源が入るとすぐに Bluetooth で発信します — SoftAP への参加は不要です。',
  },
  'devices.scanning': { en: 'SCANNING…', th: 'กำลังสแกน…', zh: '扫描中…', ja: 'スキャン中…' },
  'devices.scan_bt':  { en: 'SCAN BLUETOOTH', th: 'สแกน BLUETOOTH', zh: '扫描 BLUETOOTH', ja: 'BLUETOOTH をスキャン' },

  'devices.err_scan_failed':    { en: 'BLE scan failed', th: 'สแกน BLE ล้มเหลว', zh: 'BLE 扫描失败', ja: 'BLE スキャンに失敗しました' },
  'devices.err_connect_failed': { en: 'Connect failed', th: 'เชื่อมต่อล้มเหลว', zh: '连接失败', ja: '接続に失敗しました' },
  'devices.connecting':         { en: 'connecting…', th: 'กำลังเชื่อมต่อ…', zh: '连接中…', ja: '接続中…' },

  // ---- gauge card ----
  'devices.gauge_name': { en: 'AXIS Gauge', th: 'เกจ AXIS', zh: 'AXIS 仪表', ja: 'AXIS ゲージ' },
  'devices.gauge_sub':  { en: '1.75" round AMOLED · GPS + IMU', th: '1.75" AMOLED กลม · GPS + IMU', zh: '1.75" 圆形 AMOLED · GPS + IMU', ja: '1.75" 円形 AMOLED · GPS + IMU' },

  'devices.gauge_linked_note': {
    en: "Linked over ESP-NOW. Check the MAC matches your gauge so you're not reading another car's.",
    th: 'เชื่อมต่อผ่าน ESP-NOW ตรวจสอบว่า MAC ตรงกับเกจของคุณ เพื่อไม่ให้อ่านค่าจากรถคันอื่น',
    zh: '通过 ESP-NOW 连接。请检查 MAC 是否与你的仪表一致，以免读取到别人车的数据。',
    ja: 'ESP-NOW で接続中。MAC がお使いのゲージと一致しているか確認し、他の車のデータを読まないようにしてください。',
  },
  'devices.gauge_no_telem': {
    en: 'No gauge telemetry. Power on the AXIS gauge — it links to the knob automatically over ESP-NOW.',
    th: 'ไม่มีข้อมูลจากเกจ เปิดเครื่องเกจ AXIS — จะเชื่อมต่อกับหัวเกียร์อัตโนมัติผ่าน ESP-NOW',
    zh: '没有仪表遥测数据。打开 AXIS 仪表 — 它会通过 ESP-NOW 自动连接换挡头。',
    ja: 'ゲージのテレメトリがありません。AXIS ゲージの電源を入れてください — ESP-NOW で自動的にシフトノブに接続します。',
  },
  'devices.gauge_roadmap': {
    en: 'The AXIS Gauge is a dash-mounted display for speed, revs and more. Set its redline, shift light, warnings and colours below — it connects on its own over Bluetooth, no knob required.',
    th: 'เกจ AXIS คือจอแสดงผลติดแดชบอร์ดสำหรับความเร็ว รอบเครื่อง และอื่น ๆ ตั้งค่าเรดไลน์ ไฟเปลี่ยนเกียร์ การแจ้งเตือน และสีด้านล่าง — เชื่อมต่อได้เองผ่าน Bluetooth ไม่ต้องใช้หัวเกียร์',
    zh: 'AXIS 仪表是安装在仪表台上的显示器，可显示车速、转速等。在下方设置红线、换挡灯、警告和颜色 — 它通过 Bluetooth 自行连接，无需换挡头。',
    ja: 'AXIS ゲージは、速度や回転数などを表示するダッシュ取付ディスプレイです。下でレッドライン、シフトライト、警告、色を設定してください — Bluetooth で単独接続し、シフトノブは不要です。',
  },
  'devices.configure_gauge': { en: 'CONFIGURE GAUGE →', th: 'ตั้งค่าเกจ →', zh: '配置仪表 →', ja: 'ゲージを設定 →' },

  // ---- CAN module card ----
  'devices.can_name': { en: 'AXIS CAN Module', th: 'โมดูล CAN AXIS', zh: 'AXIS CAN 模块', ja: 'AXIS CAN モジュール' },
  'devices.can_sub':  { en: 'OBD-II + standalone ECU CAN-H/L', th: 'OBD-II + ECU แยก CAN-H/L', zh: 'OBD-II + 独立 ECU CAN-H/L', ja: 'OBD-II + スタンドアロン ECU CAN-H/L' },
  'devices.can_desc': {
    en: "Reads engine telemetry, drives the shift light, lets the knob virtual-switch your ECU's map / boost / launch. Local DTC dictionary so check-engine lights speak plain language without the cloud.",
    th: 'อ่านข้อมูลเครื่องยนต์ ควบคุมไฟเปลี่ยนเกียร์ ให้หัวเกียร์สลับแมป / บูสต์ / launch ของ ECU แบบเวอร์ชวล มีพจนานุกรม DTC ในตัว เพื่อให้ไฟเช็คเครื่องยนต์พูดภาษาเข้าใจง่ายโดยไม่ต้องใช้คลาวด์',
    zh: '读取发动机遥测数据，驱动换挡灯，让换挡头虚拟切换 ECU 的映射 / 增压 / 弹射起步。内置本地 DTC 字典，让发动机故障灯无需云端即可用通俗语言说明。',
    ja: 'エンジンのテレメトリを読み取り、シフトライトを駆動し、シフトノブから ECU のマップ / ブースト / ローンチを仮想スイッチできます。ローカル DTC 辞書を内蔵し、チェックエンジンランプをクラウドなしで分かりやすく表示します。',
  },
} satisfies Record<string, Row>;
