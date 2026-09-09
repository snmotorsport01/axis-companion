// Gauge setup page (GaugeSetup.svelte). Rune page → actual Unicode chars
// (— · ✓ ↺), {@html} not needed here (no real HTML tags in values).
import type { Row } from '../i18n';

export default {
  'gsetup.title':         { en: 'Gauge', th: 'เกจ', zh: '仪表', ja: 'ゲージ' },
  'gsetup.nav_devices':   { en: '‹ DEVICES', th: '‹ อุปกรณ์', zh: '‹ 设备', ja: '‹ デバイス' },
  'gsetup.nav_connect':   { en: '‹ CONNECT', th: '‹ เชื่อมต่อ', zh: '‹ 连接', ja: '‹ 接続' },

  'gsetup.bt_unavailable':  { en: "Bluetooth isn't available here. Turn it on to set up your AXIS Gauge.", th: 'Bluetooth ไม่พร้อมใช้งานที่นี่ เปิดใช้งานเพื่อตั้งค่า AXIS Gauge ของคุณ', zh: '此处无法使用 Bluetooth。请开启以设置你的 AXIS Gauge。', ja: 'ここでは Bluetooth を利用できません。オンにして AXIS Gauge を設定してください。' },
  'gsetup.bt_explore_hint': { en: 'To explore without hardware, start the live preview from the Connect screen — the gauge joins the same preview.', th: 'หากต้องการลองโดยไม่มีฮาร์ดแวร์ เริ่มพรีวิวสดจากหน้าเชื่อมต่อ — เกจจะเข้าร่วมพรีวิวเดียวกัน', zh: '想在没有硬件的情况下体验，请从连接页面启动实时预览——仪表会加入同一预览。', ja: 'ハードウェアなしで試すには、接続画面からライブプレビューを開始してください — ゲージが同じプレビューに参加します。' },

  'gsetup.connecting':     { en: 'Connecting to gauge…', th: 'กำลังเชื่อมต่อกับเกจ…', zh: '正在连接仪表…', ja: 'ゲージに接続中…' },
  'gsetup.reading_config': { en: 'Reading config…', th: 'กำลังอ่านการตั้งค่า…', zh: '正在读取配置…', ja: '設定を読み取り中…' },

  'gsetup.preview_live': { en: 'PREVIEW · live', th: 'พรีวิว · สด', zh: '预览 · 实时', ja: 'プレビュー · ライブ' },
  'gsetup.demo_banner':  { en: "Demo preview — changes here aren't saved. Connect an AXIS Gauge to keep them.", th: 'พรีวิวเดโม — การเปลี่ยนแปลงที่นี่ไม่ถูกบันทึก เชื่อมต่อ AXIS Gauge เพื่อเก็บไว้', zh: '演示预览——此处的更改不会保存。连接 AXIS Gauge 以保留它们。', ja: 'デモプレビュー — ここでの変更は保存されません。AXIS Gauge を接続して保持してください。' },

  'gsetup.calibration':     { en: 'Calibration', th: 'การปรับเทียบ', zh: '校准', ja: 'キャリブレーション' },
  'gsetup.badge_demo':      { en: 'DEMO', th: 'เดโม', zh: '演示', ja: 'デモ' },
  'gsetup.badge_connected': { en: 'CONNECTED', th: 'เชื่อมต่อแล้ว', zh: '已连接', ja: '接続済み' },

  'gsetup.redline':      { en: 'Redline', th: 'เรดไลน์', zh: '红线', ja: 'レッドライン' },
  'gsetup.redline_hint': { en: 'Full-scale RPM — the gauge sweeps to red here.', th: 'RPM สูงสุดของสเกล — เกจจะกวาดถึงแดงที่จุดนี้', zh: '满量程 RPM——仪表在此扫至红区。', ja: 'フルスケール RPM — ゲージはここで赤まで振れます。' },

  'gsetup.shift_light': { en: 'Shift light', th: 'ไฟชิฟต์', zh: '换挡灯', ja: 'シフトランプ' },
  'gsetup.shift_hint':  { en: 'Shift-light strobe point — knob + gauge flash together here.', th: 'จุดกะพริบไฟชิฟต์ — หัวเกียร์ + เกจกะพริบพร้อมกันที่นี่', zh: '换挡灯闪烁点——换挡头 + 仪表在此一起闪烁。', ja: 'シフトランプの点滅ポイント — シフトノブとゲージがここで一緒に点滅します。' },

  'gsetup.peak_hold':     { en: 'Peak hold', th: 'ค้างค่าพีค', zh: '峰值保持', ja: 'ピークホールド' },
  'gsetup.rolling':       { en: 'ROLLING', th: 'เลื่อนไหล', zh: '滚动', ja: 'ローリング' },
  'gsetup.hold':          { en: 'HOLD', th: 'ค้าง', zh: '保持', ja: 'ホールド' },
  'gsetup.peak_hold_on':  { en: 'Peaks stay until you reset them.', th: 'ค่าพีคจะคงอยู่จนกว่าคุณจะรีเซ็ต', zh: '峰值将保持，直到你重置。', ja: 'リセットするまでピークは保持されます。' },
  'gsetup.peak_hold_off': { en: 'Peaks fade ~3 s after the value drops.', th: 'ค่าพีคจะจางหายราว 3 วินาทีหลังค่าลดลง', zh: '数值下降后约 3 秒峰值淡出。', ja: '値が下がってから約 3 秒でピークが消えます。' },
  'gsetup.reset_peaks_btn': { en: 'RESET PEAK MARKERS', th: 'รีเซ็ตเครื่องหมายพีค', zh: '重置峰值标记', ja: 'ピークマーカーをリセット' },

  'gsetup.layout':      { en: 'Layout', th: 'เลย์เอาต์', zh: '布局', ja: 'レイアウト' },
  'gsetup.layout_hint': { en: 'Pick what each arc shows on every page — and give each arc its own colour (the swatch). ↺ resets an arc to the default gold.', th: 'เลือกสิ่งที่แต่ละอาร์กแสดงในทุกหน้า — และกำหนดสีของแต่ละอาร์ก (ช่องสี) ↺ รีเซ็ตอาร์กเป็นสีทองค่าเริ่มต้น', zh: '选择每个圆弧在各页面显示的内容——并为每个圆弧设定自己的颜色（色块）。↺ 将圆弧重置为默认金色。', ja: '各アークが各ページで表示する内容を選び — 各アークに独自の色（スウォッチ）を設定します。↺ でアークを既定のゴールドに戻します。' },
  'gsetup.page_n':        { en: 'Page {n}', th: 'หน้า {n}', zh: '第 {n} 页', ja: 'ページ {n}' },
  'gsetup.page_name_aria': { en: 'Page name', th: 'ชื่อหน้า', zh: '页面名称', ja: 'ページ名' },
  'gsetup.empty_option':  { en: '— empty —', th: '— ว่าง —', zh: '— 空 —', ja: '— 空 —' },
  'gsetup.no_data':       { en: ' — no data', th: ' — ไม่มีข้อมูล', zh: ' — 无数据', ja: ' — データなし' },
  'gsetup.arc_colour_title': { en: 'This arc’s colour', th: 'สีของอาร์กนี้', zh: '此圆弧的颜色', ja: 'このアークの色' },
  'gsetup.reset_gold_title': { en: 'Reset to default gold', th: 'รีเซ็ตเป็นสีทองค่าเริ่มต้น', zh: '重置为默认金色', ja: '既定のゴールドに戻す' },

  'gsetup.element_colours':      { en: 'Element colours', th: 'สีองค์ประกอบ', zh: '元素颜色', ja: '要素カラー' },
  'gsetup.element_colours_hint': { en: 'Shared chrome + typography across all pages.', th: 'กรอบและตัวอักษรที่ใช้ร่วมกันทุกหน้า', zh: '所有页面共用的框架与文字排版。', ja: 'すべてのページで共通のクロームと文字スタイル。' },

  'gsetup.warning_thresholds': { en: 'Warning thresholds', th: 'เกณฑ์เตือน', zh: '警告阈值', ja: '警告しきい値' },
  'gsetup.warning_hint':       { en: 'Channel turns red + flashes at or above these values.', th: 'ช่องจะเปลี่ยนเป็นสีแดงและกะพริบเมื่อถึงหรือเกินค่านี้', zh: '达到或超过这些值时通道变红并闪烁。', ja: 'これらの値以上でチャンネルが赤くなり点滅します。' },

  'gsetup.demo_note': { en: "Demo mode — part of your knob's demo session. Connect a real AXIS Gauge to save this setup to it.", th: 'โหมดเดโม — เป็นส่วนหนึ่งของเซสชันเดโมของหัวเกียร์ เชื่อมต่อ AXIS Gauge จริงเพื่อบันทึกการตั้งค่านี้ลงไป', zh: '演示模式——你换挡头演示会话的一部分。连接真正的 AXIS Gauge 以将此设置保存到它。', ja: 'デモモード — シフトノブのデモセッションの一部です。実際の AXIS Gauge を接続してこの設定を保存してください。' },
  // Demo → open the scan card to link a real gauge and save to it
  'gsetup.connect_gauge': { en: 'Connect a gauge', th: 'เชื่อมต่อเกจ', zh: '连接仪表', ja: 'ゲージを接続' },

  'gsetup.saving':        { en: 'SAVING…', th: 'กำลังบันทึก…', zh: '正在保存…', ja: '保存中…' },
  'gsetup.save_to_gauge': { en: 'SAVE TO GAUGE', th: 'บันทึกลงเกจ', zh: '保存到仪表', ja: 'ゲージに保存' },
  'gsetup.saved_btn':     { en: 'SAVED', th: 'บันทึกแล้ว', zh: '已保存', ja: '保存済み' },
  'gsetup.forget':        { en: 'Forget this gauge', th: 'ลืมเกจนี้', zh: '忘记此仪表', ja: 'このゲージを削除' },

  'gsetup.scan_intro':    { en: 'Connect to the AXIS Gauge over Bluetooth to set its redline, shift light, layout, colours and warnings. The gauge stores its own config.', th: 'เชื่อมต่อ AXIS Gauge ผ่าน Bluetooth เพื่อตั้งเรดไลน์ ไฟชิฟต์ เลย์เอาต์ สี และการเตือน เกจจะเก็บการตั้งค่าของตัวเอง', zh: '通过 Bluetooth 连接 AXIS Gauge 以设置其红线、换挡灯、布局、颜色和警告。仪表自行存储配置。', ja: 'Bluetooth で AXIS Gauge に接続し、レッドライン、シフトランプ、レイアウト、色、警告を設定します。ゲージは自身の設定を保存します。' },
  'gsetup.scanning':      { en: 'SCANNING…', th: 'กำลังสแกน…', zh: '正在扫描…', ja: 'スキャン中…' },
  'gsetup.scan_for_gauge': { en: 'SCAN FOR GAUGE', th: 'สแกนหาเกจ', zh: '扫描仪表', ja: 'ゲージをスキャン' },

  // script messages (status / error fallbacks)
  'gsetup.no_gauge_found':    { en: 'No AXIS Gauge found nearby. Power it on and scan again.', th: 'ไม่พบ AXIS Gauge ในบริเวณใกล้เคียง เปิดเครื่องแล้วสแกนอีกครั้ง', zh: '附近未找到 AXIS Gauge。请开机后重新扫描。', ja: '近くに AXIS Gauge が見つかりません。電源を入れて再度スキャンしてください。' },
  'gsetup.scan_failed':       { en: 'BLE scan failed', th: 'สแกน BLE ล้มเหลว', zh: 'BLE 扫描失败', ja: 'BLE スキャンに失敗しました' },
  'gsetup.gauge_disconnected': { en: 'Gauge disconnected.', th: 'เกจถูกตัดการเชื่อมต่อ', zh: '仪表已断开连接。', ja: 'ゲージの接続が切断されました。' },
  'gsetup.connect_failed':    { en: 'Connect failed — is the gauge powered on?', th: 'เชื่อมต่อล้มเหลว — เกจเปิดอยู่หรือไม่?', zh: '连接失败——仪表已开机吗？', ja: '接続に失敗しました — ゲージの電源は入っていますか？' },
  'gsetup.saved_ok':          { en: 'Saved to gauge ✓', th: 'บันทึกลงเกจแล้ว ✓', zh: '已保存到仪表 ✓', ja: 'ゲージに保存しました ✓' },
  'gsetup.save_failed':       { en: 'Save failed', th: 'บันทึกล้มเหลว', zh: '保存失败', ja: '保存に失敗しました' },
  'gsetup.peaks_cleared':     { en: 'Peak markers cleared ✓', th: 'ล้างเครื่องหมายพีคแล้ว ✓', zh: '峰值标记已清除 ✓', ja: 'ピークマーカーをクリアしました ✓' },
  'gsetup.reset_failed':      { en: 'Reset failed', th: 'รีเซ็ตล้มเหลว', zh: '重置失败', ja: 'リセットに失敗しました' },
} satisfies Record<string, Row>;
