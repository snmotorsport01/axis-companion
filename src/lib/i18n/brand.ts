// Brand page — Wi-Fi + colours + animation/feel. One namespace file; auto-merged
// by lib/i18n.ts via import.meta.glob. en = source/fallback.
import type { Row } from '../i18n';

export default {
  // ---- page header ----
  'brand.title':    { en: 'Wi-Fi & colours', th: 'Wi-Fi และสี', zh: 'Wi-Fi 与颜色', ja: 'Wi-Fi とカラー' },
  'brand.back_pro': { en: 'Pro', th: 'ตั้งค่า', zh: '设置', ja: '設定' },

  // ---- gate / loading ----
  'brand.connect_first': {
    en: 'Connect your AXIS first to set its colours and Wi-Fi.',
    th: 'เชื่อมต่อ AXIS ของคุณก่อนเพื่อตั้งค่าสีและ Wi-Fi',
    zh: '请先连接你的 AXIS，才能设置颜色和 Wi-Fi。',
    ja: 'カラーと Wi-Fi を設定するには、まず AXIS を接続してください。',
  },
  'brand.go_connect': { en: 'Go to Connect →', th: 'ไปที่หน้าเชื่อมต่อ →', zh: '前往连接页 →', ja: '接続へ →' },
  'brand.loading':    { en: 'Loading…', th: 'กำลังโหลด…', zh: '加载中…', ja: '読み込み中…' },

  // ---- live preview ----
  'brand.preview_label': {
    en: 'PREVIEW · {mode} · not yet saved',
    th: 'ตัวอย่าง · {mode} · ยังไม่ได้บันทึก',
    zh: '预览 · {mode} · 尚未保存',
    ja: 'プレビュー · {mode} · 未保存',
  },
  'brand.preview_live': { en: 'live from device', th: 'สดจากอุปกรณ์', zh: '来自设备实时', ja: 'デバイスからライブ' },
  'brand.preview_demo': { en: 'demo cycle', th: 'วนเดโม', zh: '演示循环', ja: 'デモ循環' },
  'brand.demo':  { en: 'DEMO', th: 'เดโม', zh: '演示', ja: 'デモ' },
  'brand.live':  { en: 'LIVE', th: 'สด', zh: '实时', ja: 'ライブ' },
  'brand.present': { en: '⤢ PRESENT (record)', th: '⤢ นำเสนอ (บันทึกหน้าจอ)', zh: '⤢ 演示（录屏）', ja: '⤢ プレゼント（録画）' },
  'brand.close':   { en: '✕ CLOSE', th: '✕ ปิด', zh: '✕ 关闭', ja: '✕ 閉じる' },

  // ---- animation & feel ----
  'brand.feel_title': { en: 'Animation & feel', th: 'แอนิเมชันและฟีล', zh: '动画与手感', ja: 'アニメーションとフィール' },
  'brand.saved':      { en: 'saved', th: 'บันทึกแล้ว', zh: '已保存', ja: '保存しました' },
  'brand.def':        { en: 'def', th: 'ค่าเริ่มต้น', zh: '默认', ja: '既定' },

  'brand.feel_gearDwell_label':     { en: 'Gear shift delay', th: 'ดีเลย์การเปลี่ยนเกียร์', zh: '换挡延迟', ja: 'シフト遅延' },
  'brand.feel_gearAnim_label':      { en: 'Gear letter effect', th: 'เอฟเฟกต์ตัวอักษรเกียร์', zh: '挡位字母效果', ja: 'ギア文字エフェクト' },
  'brand.feel_transition_label':    { en: 'Screen change effect', th: 'เอฟเฟกต์เปลี่ยนหน้าจอ', zh: '切屏效果', ja: '画面切替エフェクト' },
  'brand.feel_pattern_label':       { en: 'Pattern effect speed', th: 'ความเร็วเอฟเฟกต์แพทเทิร์น', zh: '图案效果速度', ja: 'パターン効果の速さ' },
  'brand.feel_ssWake_label':        { en: 'Wake screensaver on motion', th: 'ปลุกสกรีนเซฟเวอร์เมื่อมีการเคลื่อนไหว', zh: '晃动唤醒屏保', ja: '動きでスクリーンセーバー解除' },

  'brand.feel_gearDwell_help': {
    en: 'How long the new position must stay still before locking in. Lower = faster reaction. Below ~80 ms is unreliable — small jitters slip through and the gear bounces back and forth.',
    th: 'ตำแหน่งใหม่ต้องนิ่งอยู่นานเท่าใดก่อนล็อก ค่ายิ่งต่ำ = ตอบสนองเร็วขึ้น ต่ำกว่า ~80 ms จะไม่เสถียร — การสั่นเล็กน้อยจะเล็ดลอดเข้ามาและเกียร์จะเด้งไปมา',
    zh: '新位置需要静止多久才锁定。数值越低 = 反应越快。低于约 80 ms 不可靠 — 细微抖动会漏过去，挡位会来回跳动。',
    ja: '新しい位置がロックされるまで静止しておく時間。低いほど反応が速くなります。約 80 ms を下回ると不安定 — わずかな揺れが通り抜けてギアが行ったり来たりします。',
  },
  'brand.feel_gearAnim_help': {
    en: 'How the big gear letter appears when you shift on the main screen.',
    th: 'ตัวอักษรเกียร์ตัวใหญ่ปรากฏอย่างไรเมื่อคุณเปลี่ยนเกียร์บนหน้าจอหลัก',
    zh: '在主屏换挡时，大挡位字母的出现方式。',
    ja: 'メイン画面でシフトしたときに大きなギア文字が現れる方法。',
  },
  'brand.feel_transition_help': {
    en: 'How pages animate when switching from one to another.',
    th: 'หน้าจอเคลื่อนไหวอย่างไรเมื่อสลับจากหน้าหนึ่งไปอีกหน้า',
    zh: '页面之间切换时的动画方式。',
    ja: 'ページを切り替えるときのアニメーション方法。',
  },
  'brand.feel_pattern_help': {
    en: 'How fast the glowing light runs through the gears on the H-pattern screen.',
    th: 'แสงเรืองวิ่งผ่านเกียร์บนหน้าจอ H-pattern เร็วแค่ไหน',
    zh: '在 H 型挡位屏上，发光沿挡位移动的速度。',
    ja: 'H パターン画面で光がギアを走り抜ける速さ。',
  },
  'brand.feel_ssWake_help': {
    en: 'When the logo screensaver is on, a firm wiggle of the knob exits it back to the last gear screen. Off by default — road vibration on rough roads can occasionally cross the wake threshold.',
    th: 'เมื่อสกรีนเซฟเวอร์โลโก้ทำงานอยู่ การขยับหัวเกียร์แรง ๆ จะออกกลับไปยังหน้าจอเกียร์ล่าสุด ปิดไว้เป็นค่าเริ่มต้น — แรงสั่นสะเทือนบนถนนขรุขระอาจเกินเกณฑ์การปลุกได้เป็นบางครั้ง',
    zh: '当徽标屏保开启时，用力晃动换挡头即可退出并返回上一个挡位画面。默认关闭 — 颠簸路面的震动偶尔会超过唤醒阈值。',
    ja: 'ロゴのスクリーンセーバー中に、シフトノブを強く揺らすと最後のギア画面に戻ります。既定はオフ — 荒れた路面の振動がまれに解除しきい値を超えることがあります。',
  },

  // ---- device name ----
  'brand.device_name': { en: 'Device name', th: 'ชื่ออุปกรณ์', zh: '设备名称', ja: 'デバイス名' },
  'brand.device_name_hint': {
    en: 'Shown on the INFO screen. Max {n} chars.',
    th: 'แสดงบนหน้าจอ INFO สูงสุด {n} ตัวอักษร',
    zh: '显示在 INFO 屏上。最多 {n} 个字符。',
    ja: 'INFO 画面に表示。最大 {n} 文字。',
  },

  // ---- accent colour ----
  'brand.accent_colour': { en: 'Accent colour', th: 'สีหลัก', zh: '强调色', ja: 'アクセントカラー' },
  'brand.accent_hint': {
    en: 'Default for every UI element. Customise per slot below.',
    th: 'ค่าเริ่มต้นสำหรับทุกองค์ประกอบ UI ปรับแต่งแยกแต่ละช่องด้านล่าง',
    zh: '所有 UI 元素的默认色。可在下方逐项自定义。',
    ja: 'すべての UI 要素の既定色。下で項目ごとにカスタマイズできます。',
  },

  // ---- per-element colours ----
  'brand.per_element':  { en: 'Per-element colours', th: 'สีแยกตามองค์ประกอบ', zh: '逐项颜色', ja: '要素ごとのカラー' },
  'brand.per_element_hint': {
    en: 'Each text style is its own colour — picks below override the static defaults completely.',
    th: 'ข้อความแต่ละสไตล์มีสีของตัวเอง — การเลือกด้านล่างจะแทนที่ค่าเริ่มต้นทั้งหมด',
    zh: '每种文本样式都有各自的颜色 — 下方的选择会完全覆盖静态默认值。',
    ja: '各テキストスタイルは独自のカラーを持ちます — 下の選択が既定値を完全に上書きします。',
  },
  'brand.slot_gear':  { en: 'Gear digit',    th: 'ตัวเลขเกียร์', zh: '挡位数字', ja: 'ギア数字' },
  'brand.slot_meter': { en: 'G-meter grid',  th: 'กริด G-meter', zh: 'G 值表格线', ja: 'G メーターの格子' },
  'brand.slot_name':  { en: 'Name footer',   th: 'ชื่อด้านล่าง', zh: '底部名称', ja: '下部の名称' },
  'brand.slot_fg':    { en: 'Titles + body', th: 'หัวข้อ + เนื้อหา', zh: '标题 + 正文', ja: 'タイトル + 本文' },
  'brand.slot_muted': { en: 'Hints / muted', th: 'คำแนะนำ / จาง', zh: '提示 / 弱化', ja: 'ヒント / 淡色' },
  'brand.slot_warn':  { en: 'Warnings',      th: 'คำเตือน', zh: '警告', ja: '警告' },

  // ---- action buttons ----
  'brand.reset':  { en: 'RESET', th: 'รีเซ็ต', zh: '重置', ja: 'リセット' },
  'brand.saving': { en: 'SAVING…', th: 'กำลังบันทึก…', zh: '保存中…', ja: '保存中…' },
  'brand.saved_btn': { en: 'SAVED', th: 'บันทึกแล้ว', zh: '已保存', ja: '保存済み' },
  'brand.apply':  { en: 'APPLY', th: 'ใช้งาน', zh: '应用', ja: '適用' },
  'brand.reset_confirm': {
    en: 'Reset device name and all colours to factory defaults?',
    th: 'รีเซ็ตชื่ออุปกรณ์และสีทั้งหมดเป็นค่าโรงงานหรือไม่?',
    zh: '将设备名称和所有颜色重置为出厂默认值？',
    ja: 'デバイス名とすべてのカラーを工場出荷時の設定に戻しますか？',
  },

  // ---- screensaver ----
  'brand.screensaver': { en: 'Screensaver', th: 'สกรีนเซฟเวอร์', zh: '屏保', ja: 'スクリーンセーバー' },
  'brand.ss_animated': {
    en: 'Animation · {frames} frames @ {fps} fps installed.',
    th: 'แอนิเมชัน · {frames} เฟรม @ {fps} fps ติดตั้งแล้ว',
    zh: '动画 · 已安装 {frames} 帧 @ {fps} fps。',
    ja: 'アニメーション · {frames} フレーム @ {fps} fps インストール済み。',
  },
  'brand.ss_still':  { en: 'Custom still image installed.', th: 'ติดตั้งภาพนิ่งที่กำหนดเองแล้ว', zh: '已安装自定义静态图片。', ja: 'カスタム静止画がインストール済み。' },
  'brand.ss_logo':   { en: 'Using the AXIS logo.', th: 'ใช้โลโก้ AXIS', zh: '正在使用 AXIS 徽标。', ja: 'AXIS ロゴを使用中。' },
  'brand.ss_open':   { en: 'OPEN SCREENSAVER →', th: 'เปิดสกรีนเซฟเวอร์ →', zh: '打开屏保 →', ja: 'スクリーンセーバーを開く →' },

  // ---- home wi-fi ----
  'brand.home_wifi': { en: 'Home Wi-Fi', th: 'Wi-Fi ที่บ้าน', zh: '家庭 Wi-Fi', ja: '自宅 Wi-Fi' },
  'brand.home_wifi_hint': {
    en: "Let the device join your home Wi-Fi so it can pull firmware updates from the internet itself. This is the most reliable way to OTA on iOS — your phone doesn't have to be the bridge.",
    th: 'ให้อุปกรณ์เชื่อมต่อ Wi-Fi ที่บ้านเพื่อดึงอัปเดตเฟิร์มแวร์จากอินเทอร์เน็ตด้วยตัวเอง นี่คือวิธี OTA ที่เชื่อถือได้ที่สุดบน iOS — โทรศัพท์ของคุณไม่ต้องเป็นตัวกลาง',
    zh: '让设备接入你的家庭 Wi-Fi，即可自行从互联网拉取固件更新。这是在 iOS 上最可靠的 OTA 方式 — 你的手机无需充当中转。',
    ja: 'デバイスを自宅 Wi-Fi に接続すると、インターネットから自分でファームウェア更新を取得できます。これは iOS で最も確実な OTA 方法です — スマホが橋渡し役になる必要はありません。',
  },
  'brand.wifi_checking':  { en: 'Checking…', th: 'กำลังตรวจสอบ…', zh: '检查中…', ja: '確認中…' },
  'brand.wifi_connected': { en: 'Connected · {ip}', th: 'เชื่อมต่อแล้ว · {ip}', zh: '已连接 · {ip}', ja: '接続済み · {ip}' },
  'brand.wifi_rssi':      { en: 'RSSI {rssi} dBm', th: 'RSSI {rssi} dBm', zh: 'RSSI {rssi} dBm', ja: 'RSSI {rssi} dBm' },
  'brand.wifi_saved_nc': {
    en: 'Saved but not connected (wrong pwd? out of range?)',
    th: 'บันทึกแล้วแต่ยังไม่เชื่อมต่อ (รหัสผ่านผิด? อยู่นอกระยะ?)',
    zh: '已保存但未连接（密码错误？超出范围？）',
    ja: '保存済みですが未接続（パスワード違い？圏外？）',
  },
  'brand.wifi_not_configured': { en: 'Not configured', th: 'ยังไม่ได้ตั้งค่า', zh: '未配置', ja: '未設定' },
  'brand.wifi_ssid':      { en: 'SSID', th: 'SSID', zh: 'SSID', ja: 'SSID' },
  'brand.wifi_ssid_ph':   { en: 'MyHomeWiFi', th: 'MyHomeWiFi', zh: 'MyHomeWiFi', ja: 'MyHomeWiFi' },
  'brand.wifi_password':  { en: 'Password', th: 'รหัสผ่าน', zh: '密码', ja: 'パスワード' },
  'brand.wifi_pass_ph': {
    en: '(unchanged — type to replace)',
    th: '(ไม่เปลี่ยน — พิมพ์เพื่อแทนที่)',
    zh: '（未更改 — 输入以替换）',
    ja: '（変更なし — 入力して置き換え）',
  },
  'brand.wifi_connect':   { en: 'CONNECT', th: 'เชื่อมต่อ', zh: '连接', ja: '接続' },

  // ---- error fallbacks ----
  'brand.err_load':  { en: 'load failed', th: 'โหลดล้มเหลว', zh: '加载失败', ja: '読み込みに失敗' },
  'brand.err_save':  { en: 'save failed', th: 'บันทึกล้มเหลว', zh: '保存失败', ja: '保存に失敗' },
  'brand.err_reset': { en: 'reset failed', th: 'รีเซ็ตล้มเหลว', zh: '重置失败', ja: 'リセットに失敗' },
} satisfies Record<string, Row>;
