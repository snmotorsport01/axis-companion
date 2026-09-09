// Drivetrain page. Car/gearbox names + preset notes stay as data (English).
import type { Row } from '../i18n';

export default {
  'dt.title':       { en: 'Drivetrain', th: 'ระบบส่งกำลัง', zh: '传动系', ja: 'ドライブトレイン' },
  'dt.scan_intro':  { en: 'Pick your car so the gauge works out the gear from <b>your</b> gearbox — not a generic table. Connect your <b>AXIS Monitor</b> first.', th: 'เลือกรถของคุณ เพื่อให้เกจคำนวณเกียร์จาก<b>เกียร์ของคุณ</b>จริงๆ ไม่ใช่ตารางทั่วไป เชื่อมต่อ <b>AXIS Monitor</b> ก่อน', zh: '选择你的车，让仪表根据<b>你的</b>变速箱推算挡位，而非通用表格。请先连接你的 <b>AXIS Monitor</b>。', ja: '車を選ぶと、ゲージが汎用表ではなく<b>あなたの</b>ギアボックスからギアを算出します。まず <b>AXIS Monitor</b> を接続してください。' },
  'dt.scanning':    { en: 'Scanning…', th: 'กำลังสแกน…', zh: '扫描中…', ja: 'スキャン中…' },
  'dt.scan_btn':    { en: 'Scan for AXIS Monitor', th: 'สแกนหา AXIS Monitor', zh: '扫描 AXIS Monitor', ja: 'AXIS Monitor をスキャン' },
  'dt.connecting':  { en: 'Connecting to monitor…', th: 'กำลังเชื่อมต่อมอนิเตอร์…', zh: '正在连接监视器…', ja: 'モニターに接続中…' },
  'dt.reading':     { en: 'Reading config…', th: 'กำลังอ่านการตั้งค่า…', zh: '正在读取配置…', ja: '設定を読み込み中…' },

  'dt.your_car':    { en: 'Your car', th: 'รถของคุณ', zh: '你的车', ja: 'あなたの車' },
  'dt.demo':        { en: 'DEMO', th: 'เดโม', zh: '演示', ja: 'デモ' },
  'dt.connected':   { en: 'CONNECTED', th: 'เชื่อมต่อแล้ว', zh: '已连接', ja: '接続済み' },
  'dt.ready_intro': { en: 'Pick your car — the gear ratios and a base tyre size fill in. Adjust the tyre if yours differs.', th: 'เลือกรถของคุณ — อัตราทดเกียร์และขนาดยางพื้นฐานจะเติมให้ ปรับยางได้ถ้าของคุณต่าง', zh: '选择你的车——齿比和一个基础轮胎尺寸会自动填入。如你的轮胎不同请调整。', ja: '車を選ぶと、ギア比と基本のタイヤサイズが入力されます。異なる場合はタイヤを調整してください。' },
  'dt.demo_suffix': { en: ' <b>Demo</b> — connect your AXIS Monitor to save.', th: ' <b>เดโม</b> — เชื่อมต่อ AXIS Monitor เพื่อบันทึก', zh: ' <b>演示</b> — 连接 AXIS Monitor 以保存。', ja: ' <b>デモ</b> — 保存するには AXIS Monitor を接続。' },

  'dt.brand':       { en: 'Brand', th: 'ยี่ห้อ', zh: '品牌', ja: 'メーカー' },
  'dt.model':       { en: 'Model', th: 'รุ่น', zh: '车型', ja: 'モデル' },
  'dt.year_trim':   { en: 'Year / trim', th: 'ปี / รุ่นย่อย', zh: '年份 / 配置', ja: '年式 / グレード' },
  'dt.choose':      { en: 'Choose…', th: 'เลือก…', zh: '选择…', ja: '選択…' },
  'dt.n_speed':     { en: '{n}-speed', th: '{n} เกียร์', zh: '{n} 速', ja: '{n} 速' },
  'dt.no_gears':    { en: 'no fixed gears — the gauge shows “CVT”', th: 'ไม่มีเกียร์ตายตัว — เกจแสดง "CVT"', zh: '无固定挡位——仪表显示"CVT"', ja: '固定ギアなし — ゲージは「CVT」と表示' },

  'dt.tyre_size':   { en: 'Tyre size', th: 'ขนาดยาง', zh: '轮胎尺寸', ja: 'タイヤサイズ' },
  'dt.weight':      { en: 'Weight (kg)', th: 'น้ำหนัก (กก.)', zh: '重量 (kg)', ja: '重量 (kg)' },
  'dt.weight_hint': { en: 'incl. driver — used for Power/Torque', th: 'รวมคนขับ — ใช้คำนวณกำลัง/แรงบิด', zh: '含驾驶员——用于功率/扭矩', ja: '運転者含む — 出力/トルクに使用' },

  'dt.advanced':    { en: 'Advanced — enter values by hand', th: 'ขั้นสูง — กรอกค่าเอง', zh: '高级——手动输入数值', ja: '詳細 — 手動で値を入力' },
  'dt.redline':     { en: 'Redline (RPM)', th: 'เรดไลน์ (รอบ)', zh: '红线 (RPM)', ja: 'レッドライン (RPM)' },
  'dt.fwd_gears':   { en: 'Forward gears', th: 'จำนวนเกียร์เดินหน้า', zh: '前进挡数', ja: '前進ギア数' },
  'dt.gear_ratios': { en: 'Gear ratios', th: 'อัตราทดเกียร์', zh: '齿比', ja: 'ギア比' },
  'dt.final_drive': { en: 'Final drive', th: 'เฟืองท้าย', zh: '主减速比', ja: 'ファイナルドライブ' },
  'dt.hint':        { en: 'The gear is calculated from RPM + speed using these ratios, final drive and tyre size. If the gear reads a step high/low, nudge <b>Final drive</b>.', th: 'เกียร์คำนวณจากรอบ + ความเร็ว โดยใช้อัตราทด เฟืองท้าย และขนาดยาง ถ้าเกียร์อ่านสูง/ต่ำไปหนึ่งขั้น ให้ปรับ<b>เฟืองท้าย</b>', zh: '挡位由转速 + 车速，结合这些齿比、主减速比和轮胎尺寸计算得出。若挡位偏高/低一挡，微调<b>主减速比</b>。', ja: 'ギアは回転数 + 速度に、これらのギア比・ファイナル・タイヤサイズを用いて算出されます。ギアが1段ずれる場合は<b>ファイナルドライブ</b>を微調整してください。' },

  'dt.real_gear':       { en: 'Real gear (car model)', th: 'เกียร์จริง (รุ่นรถ)', zh: '真实挡位 (车型)', ja: '実ギア (車種)' },
  'dt.real_gear_intro': { en: 'Pick your car so the sensor reads the <b>real</b> P/R/N/D straight off the car’s computer — not just the calculated gear. Sent to the sensor and remembered.', th: 'เลือกรถของคุณ เพื่อให้เซนเซอร์อ่าน P/R/N/D <b>จริง</b> จากคอมพิวเตอร์ของรถโดยตรง ไม่ใช่แค่เกียร์ที่คำนวณ ส่งไปที่เซนเซอร์และจดจำไว้', zh: '选择你的车，让传感器直接从车辆电脑读取<b>真实</b>的 P/R/N/D，而不仅是计算挡位。会发送给传感器并记住。', ja: '車を選ぶと、センサーが計算ギアだけでなく、車のコンピューターから<b>実際</b>の P/R/N/D を直接読み取ります。センサーに送信され記憶されます。' },
  'dt.needs_scan_opt':  { en: ' (needs in-car scan)', th: ' (ต้องสแกนในรถ)', zh: '（需车内扫描）', ja: '（車内スキャンが必要）' },
  'dt.sending':         { en: 'Sending…', th: 'กำลังส่ง…', zh: '发送中…', ja: '送信中…' },
  'dt.connect_to_send': { en: 'Connect a monitor to send', th: 'เชื่อมต่อมอนิเตอร์เพื่อส่ง', zh: '连接监视器以发送', ja: '送信するにはモニターを接続' },
  'dt.send_sensor':     { en: 'Send to sensor', th: 'ส่งไปที่เซนเซอร์', zh: '发送到传感器', ja: 'センサーに送信' },

  'dt.saving_btn':   { en: 'Saving…', th: 'กำลังบันทึก…', zh: '保存中…', ja: '保存中…' },
  'dt.save_monitor': { en: 'Save to monitor', th: 'บันทึกลงมอนิเตอร์', zh: '保存到监视器', ja: 'モニターに保存' },
  // Offline picker → link a real monitor so edits can actually be saved
  'dt.connect_monitor': { en: 'Connect your AXIS Monitor to save', th: 'เชื่อมต่อ AXIS Monitor เพื่อบันทึก', zh: '连接你的 AXIS Monitor 以保存', ja: '保存するには AXIS Monitor を接続' },

  // script messages
  'dt.err_needs_scan':      { en: 'This car needs an in-car gear scan before it can be sent.', th: 'รถคันนี้ต้องสแกนเกียร์ในรถก่อนถึงจะส่งได้', zh: '此车需要先进行车内挡位扫描才能发送。', ja: 'この車は送信前に車内でのギアスキャンが必要です。' },
  'dt.connect_first':       { en: 'Connect your AXIS Monitor first.', th: 'เชื่อมต่อ AXIS Monitor ก่อน', zh: '请先连接你的 AXIS Monitor。', ja: 'まず AXIS Monitor を接続してください。' },
  'dt.gear_sent':           { en: '✓ Sent “{name}” — the sensor now decodes its real gear.', th: '✓ ส่ง "{name}" แล้ว — เซนเซอร์อ่านเกียร์จริงได้แล้ว', zh: '✓ 已发送"{name}"——传感器现在可解码其真实挡位。', ja: '✓「{name}」を送信 — センサーが実ギアを解読します。' },
  'dt.no_monitor':          { en: 'No AXIS Monitor found nearby. Power it on and scan again.', th: 'ไม่พบ AXIS Monitor ใกล้เคียง เปิดเครื่องแล้วสแกนใหม่', zh: '附近未找到 AXIS Monitor。开机后重新扫描。', ja: '近くに AXIS Monitor が見つかりません。電源を入れて再スキャンしてください。' },
  'dt.scan_failed':         { en: 'BLE scan failed', th: 'สแกน BLE ล้มเหลว', zh: 'BLE 扫描失败', ja: 'BLE スキャンに失敗' },
  'dt.monitor_disconnected':{ en: 'Monitor disconnected.', th: 'มอนิเตอร์หลุดการเชื่อมต่อ', zh: '监视器已断开。', ja: 'モニターが切断されました。' },
  'dt.connect_failed':      { en: 'Connect failed', th: 'เชื่อมต่อล้มเหลว', zh: '连接失败', ja: '接続に失敗' },
  'dt.read_failed':         { en: 'Reading config failed', th: 'อ่านการตั้งค่าล้มเหลว', zh: '读取配置失败', ja: '設定の読み込みに失敗' },
  'dt.demo_save':           { en: 'Demo mode — connect your AXIS Monitor to save this car.', th: 'โหมดเดโม — เชื่อมต่อ AXIS Monitor เพื่อบันทึกรถคันนี้', zh: '演示模式——连接 AXIS Monitor 以保存此车。', ja: 'デモモード — この車を保存するには AXIS Monitor を接続。' },
  'dt.out_of_range':        { en: '✗ Some values are out of range — check the Advanced fields.', th: '✗ ค่าบางค่าเกินช่วง — ตรวจในส่วนขั้นสูง', zh: '✗ 部分数值超出范围——请检查高级字段。', ja: '✗ 一部の値が範囲外です — 詳細フィールドを確認してください。' },
  'dt.saving':              { en: 'Saving to the monitor…', th: 'กำลังบันทึกลงมอนิเตอร์…', zh: '正在保存到监视器…', ja: 'モニターに保存中…' },
  'dt.saved':               { en: '✓ Saved. The gauge now computes the gear from this car.', th: '✓ บันทึกแล้ว เกจคำนวณเกียร์จากรถคันนี้แล้ว', zh: '✓ 已保存。仪表现在根据此车计算挡位。', ja: '✓ 保存しました。ゲージはこの車からギアを計算します。' },
  'dt.save_failed':         { en: 'Save failed', th: 'บันทึกล้มเหลว', zh: '保存失败', ja: '保存に失敗' },
} satisfies Record<string, Row>;
