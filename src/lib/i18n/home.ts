// Home tab + bottom nav + common strings. One namespace file; auto-merged by
// lib/i18n.ts via import.meta.glob. en = source/fallback.
import type { Row } from '../i18n';

export default {
  // ---- common ----
  'common.language': { en: 'Language', th: 'ภาษา', zh: '语言', ja: '言語' },

  // ---- bottom nav (OBD/DTC kept as industry acronyms in every language) ----
  'nav.home':   { en: 'home',   th: 'หน้าหลัก', zh: '主页',   ja: 'ホーム' },
  'nav.looks':  { en: 'looks',  th: 'สไตล์',    zh: '外观',   ja: '外観'   },
  'nav.store':  { en: 'store',  th: 'ร้านค้า',   zh: '商店',   ja: 'ストア' },
  'nav.dtc':    { en: 'dtc',    th: 'DTC',      zh: '故障码', ja: '診断'   },
  'nav.feel':   { en: 'feel',   th: 'ฟีล',      zh: '手感',   ja: 'フィール' },
  'nav.update': { en: 'update', th: 'อัปเดต',    zh: '更新',   ja: '更新'   },
  'nav.pro':    { en: 'settings', th: 'ตั้งค่า',   zh: '设置',   ja: '設定'   },

  // ---- home ----
  'home.your_axis':   { en: 'Your AXIS', th: 'AXIS ของคุณ', zh: '你的 AXIS', ja: 'あなたの AXIS' },
  'home.live':        { en: 'live', th: 'สด', zh: '在线', ja: 'ライブ' },
  'home.demo':        { en: 'demo', th: 'เดโม', zh: '演示', ja: 'デモ' },
  'home.demo_banner': {
    en: 'No AXIS connected yet. Explore the whole app with <b>sample data</b> &mdash; then connect your AXIS over Bluetooth to go live.',
    th: 'ยังไม่ได้เชื่อมต่อ AXIS ลองดูทั้งแอปด้วย<b>ข้อมูลตัวอย่าง</b> &mdash; แล้วค่อยเชื่อม AXIS ผ่านบลูทูธเพื่อใช้งานจริง',
    zh: '尚未连接 AXIS。用<b>示例数据</b>浏览整个应用 &mdash; 之后通过蓝牙连接 AXIS 即可实时使用。',
    ja: 'AXIS 未接続。<b>サンプルデータ</b>でアプリ全体を試せます &mdash; その後 Bluetooth で AXIS を接続するとライブに。',
  },
  'home.try_demo': { en: 'Explore with demo data', th: 'ลองใช้งานด้วยข้อมูลตัวอย่าง', zh: '用示例数据体验', ja: 'デモデータで試す' },
  'home.knob':  { en: 'Knob',  th: 'หัวเกียร์', zh: '换挡头', ja: 'シフトノブ' },
  'home.gauge': { en: 'Gauge', th: 'เกจ', zh: '仪表', ja: 'ゲージ' },
  'home.obd':   { en: 'OBD',   th: 'OBD', zh: 'OBD', ja: 'OBD' },

  'home.connected':           { en: 'CONNECTED', th: 'เชื่อมต่อแล้ว', zh: '已连接', ja: '接続済み' },
  'home.tap_connect':         { en: 'TAP TO CONNECT', th: 'แตะเพื่อเชื่อมต่อ', zh: '点击连接', ja: 'タップで接続' },
  'home.via_gauge':           { en: 'VIA GAUGE', th: 'ผ่านเกจ', zh: '通过仪表', ja: 'ゲージ経由' },
  'home.no_obd_module':       { en: 'NO OBD MODULE', th: 'ไม่มีโมดูล OBD', zh: '无 OBD 模块', ja: 'OBD モジュールなし' },
  'home.connect_gauge_first': { en: 'CONNECT GAUGE FIRST', th: 'เชื่อมต่อเกจก่อน', zh: '请先连接仪表', ja: '先にゲージを接続' },

  'home.lbl_gear':      { en: 'gear', th: 'เกียร์', zh: '挡位', ja: 'ギア' },
  'home.lbl_off':       { en: 'off', th: 'ปิด', zh: '关闭', ja: 'オフ' },
  'home.lbl_firmware':  { en: 'firmware', th: 'เฟิร์มแวร์', zh: '固件', ja: 'ファーム' },
  'home.lbl_checking':  { en: 'checking', th: 'กำลังตรวจ', zh: '检查中', ja: '確認中' },
  'home.lbl_no_faults': { en: 'no faults', th: 'ไม่มีปัญหา', zh: '无故障', ja: '異常なし' },
  'home.lbl_fault':     { en: 'fault', th: 'ปัญหา', zh: '故障', ja: '異常' },
  'home.lbl_faults':    { en: 'faults', th: 'ปัญหา', zh: '故障', ja: '異常' },
  'home.lbl_no_module': { en: 'no module', th: 'ไม่มีโมดูล', zh: '无模块', ja: 'モジュールなし' },
  'home.ok':            { en: 'OK', th: 'ปกติ', zh: '正常', ja: '正常' },

  'home.personal_best': { en: 'Personal best', th: 'สถิติส่วนตัว', zh: '个人最佳', ja: '自己ベスト' },
  'home.pb_sub':        { en: '0&ndash;100 KM/H &middot; TAP TO POST', th: '0&ndash;100 กม./ชม. &middot; แตะเพื่อโพสต์', zh: '0&ndash;100 KM/H &middot; 点击发布', ja: '0&ndash;100 KM/H &middot; タップで投稿' },
  'home.seconds':       { en: 'seconds', th: 'วินาที', zh: '秒', ja: '秒' },

  'home.community':     { en: 'Community', th: 'คอมมูนิตี้', zh: '社区', ja: 'コミュニティ' },
  'home.leaderboards':  { en: 'Leaderboards', th: 'กระดานผู้นำ', zh: '排行榜', ja: 'リーダーボード' },
  'home.lb_sub':        { en: 'YOUR CAR, YOUR TIMES &middot; BETA', th: 'รถของคุณ เวลาของคุณ &middot; เบต้า', zh: '你的车，你的成绩 &middot; 测试版', ja: 'あなたの車、あなたのタイム &middot; ベータ' },
  'home.open':          { en: 'open', th: 'เปิด', zh: '打开', ja: '開く' },

  'home.first_setup':   { en: 'First-time setup &amp; gear teach', th: 'ตั้งค่าครั้งแรก &amp; สอนเกียร์', zh: '首次设置和挡位学习', ja: '初回設定とギア学習' },
  'home.track':         { en: 'Track &middot; lap timer &amp; route', th: 'สนาม &middot; จับเวลาแลป &amp; เส้นทาง', zh: '赛道 &middot; 计圈和路线', ja: 'トラック &middot; ラップと走行ルート' },
  'home.analysis':      { en: 'Drive analysis &amp; graphs', th: 'วิเคราะห์การขับ &amp; กราฟ', zh: '驾驶分析和图表', ja: '走行解析とグラフ' },
  'home.shortcuts':     { en: 'Track shortcuts &middot; lap &amp; peaks', th: 'ทางลัดสนาม &middot; จับรอบ &amp; ค่าพีค', zh: '赛道快捷 &middot; 计圈和峰值', ja: 'トラックショートカット &middot; ラップとピーク' },
  'home.privacy_terms': { en: 'Privacy &amp; terms', th: 'ความเป็นส่วนตัว &amp; เงื่อนไข', zh: '隐私和条款', ja: 'プライバシーと規約' },
  'home.style_gauge':   { en: 'Style your gauge', th: 'แต่งเกจของคุณ', zh: '设计你的仪表', ja: 'ゲージをスタイリング' },
  'home.connect_axis':  { en: 'Connect your AXIS', th: 'เชื่อมต่อ AXIS', zh: '连接你的 AXIS', ja: 'AXIS を接続' },
} satisfies Record<string, Row>;
