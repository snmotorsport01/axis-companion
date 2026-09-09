// Calibrate page — phone-driven gear-calibration wizard for the AXIS knob.
// Firmware labels (P/R/N/D shorthand, "ZERO"/"PULL"), P/R/N/D, H-pattern and
// AXIS stay as data (English). Everything user-facing is translated.
import type { Row } from '../i18n';

export default {
  'cal.title':        { en: 'Re-teach gears', th: 'สอนเกียร์ใหม่', zh: '重新学习挡位', ja: 'ギアを再学習' },

  // ---- Error fallbacks (shown in the error card) ----
  'cal.err_load':     { en: 'load failed', th: 'โหลดไม่สำเร็จ', zh: '加载失败', ja: '読み込み失敗' },
  'cal.err_begin':    { en: 'begin failed', th: 'เริ่มไม่สำเร็จ', zh: '启动失败', ja: '開始に失敗' },
  'cal.err_capture':  { en: 'capture failed', th: 'จับค่าไม่สำเร็จ', zh: '采集失败', ja: '取得に失敗' },
  'cal.err_save':     { en: 'save failed', th: 'บันทึกไม่สำเร็จ', zh: '保存失败', ja: '保存に失敗' },
  'cal.err_abort':    { en: 'abort failed', th: 'ยกเลิกไม่สำเร็จ', zh: '中止失败', ja: '中止に失敗' },
  'cal.err_reset':    { en: 'reset failed', th: 'รีเซ็ตไม่สำเร็จ', zh: '重置失败', ja: 'リセットに失敗' },
  'cal.err_mode':     { en: 'mode switch failed', th: 'สลับโหมดไม่สำเร็จ', zh: '切换模式失败', ja: 'モード切替に失敗' },
  'cal.err_speed':    { en: 'speed switch failed', th: 'เปลี่ยนจำนวนเกียร์ไม่สำเร็จ', zh: '切换挡数失败', ja: '速数切替に失敗' },

  // ---- Confirm / toast ----
  'cal.confirm_abort': { en: 'Abort calibration? Captured steps will be discarded.', th: 'ยกเลิกการคาลิเบรต? ขั้นตอนที่จับค่าไว้จะถูกทิ้ง', zh: '中止校准？已采集的步骤将被丢弃。', ja: 'キャリブレーションを中止しますか？取得済みのステップは破棄されます。' },
  'cal.confirm_reset': { en: "Clear all calibration for this mode? You'll need to walk the wizard again.", th: 'ล้างการคาลิเบรตทั้งหมดของโหมดนี้? คุณจะต้องทำตามตัวช่วยใหม่อีกครั้ง', zh: '清除此模式的所有校准？你需要重新走一遍向导。', ja: 'このモードのキャリブレーションをすべて消去しますか？もう一度ウィザードを実行する必要があります。' },
  'cal.toast_cleared': { en: 'Calibration cleared', th: 'ล้างการคาลิเบรตแล้ว', zh: '校准已清除', ja: 'キャリブレーションを消去しました' },

  // ---- Phase names ----
  'cal.phase_idle':      { en: 'IDLE', th: 'ว่าง', zh: '空闲', ja: 'アイドル' },
  'cal.phase_hold':      { en: 'HOLD STILL', th: 'ถือนิ่งๆ', zh: '保持静止', ja: '静止して' },
  'cal.phase_capturing': { en: 'CAPTURING', th: 'กำลังจับค่า', zh: '采集中', ja: '取得中' },

  // ---- Gear-position labels (expanded from firmware shorthand) ----
  'cal.gear_n':   { en: 'Gear {n}', th: 'เกียร์ {n}', zh: '{n} 挡', ja: 'ギア {n}' },
  'cal.neutral':  { en: 'Neutral', th: 'เกียร์ว่าง', zh: '空挡', ja: 'ニュートラル' },
  'cal.park':     { en: 'Park', th: 'จอด', zh: '驻车', ja: 'パーキング' },
  'cal.reverse':  { en: 'Reverse', th: 'ถอยหลัง', zh: '倒挡', ja: 'リバース' },
  'cal.drive':    { en: 'Drive', th: 'เดินหน้า', zh: '前进', ja: 'ドライブ' },

  'cal.ready':      { en: 'READY', th: 'พร้อม', zh: '就绪', ja: '準備完了' },
  'cal.hint_save':  { en: 'Tap SAVE to write to the device.', th: 'แตะ บันทึก เพื่อเขียนลงอุปกรณ์', zh: '点击保存以写入设备。', ja: '保存をタップしてデバイスに書き込みます。' },

  // ---- Engine modes ----
  'cal.mode_auto':        { en: 'Auto', th: 'อัตโนมัติ', zh: '自动', ja: 'オート' },
  'cal.mode_auto_desc':   { en: 'Automatic — P / R / N / D, chosen by how you tilt the knob.', th: 'อัตโนมัติ — P / R / N / D เลือกจากการเอียงหัวเกียร์', zh: '自动 — P / R / N / D，由你倾斜换挡头的方式决定。', ja: 'オート — P / R / N / D、シフトノブの傾け方で選択。' },
  'cal.mode_seq':         { en: 'Sequential', th: 'ซีเควนเชียล', zh: '序列式', ja: 'シーケンシャル' },
  'cal.mode_seq_desc':    { en: 'Sequential — push to shift up, pull to shift down.', th: 'ซีเควนเชียล — ดันเพื่อขึ้นเกียร์ ดึงเพื่อลงเกียร์', zh: '序列式 — 前推升挡，后拉降挡。', ja: 'シーケンシャル — 押して上げ、引いて下げ。' },
  'cal.mode_manual':      { en: 'Manual', th: 'แมนนวล', zh: '手动', ja: 'マニュアル' },
  'cal.mode_manual_desc': { en: 'Manual — full H-pattern, like a traditional stick shift.', th: 'แมนนวล — H-pattern เต็มรูปแบบ เหมือนเกียร์กระปุกแบบดั้งเดิม', zh: '手动 — 完整 H 型换挡，像传统手动挡。', ja: 'マニュアル — フル H パターン、従来のスティックシフトのように。' },

  // ---- Connect prompt ----
  'cal.connect_title': { en: 'Connect your Knob', th: 'เชื่อมต่อหัวเกียร์', zh: '连接你的换挡头', ja: 'シフトノブを接続' },
  'cal.connect_body':  { en: "Gear calibration reads the Knob's motion, so pair it first.", th: 'การคาลิเบรตเกียร์อ่านการเคลื่อนไหวของหัวเกียร์ ให้จับคู่ก่อน', zh: '挡位校准需读取换挡头的运动，请先配对。', ja: 'ギアキャリブレーションはシフトノブの動きを読み取るため、先にペアリングしてください。' },
  'cal.back_to_connect': { en: '← Back to connect', th: '← กลับไปเชื่อมต่อ', zh: '← 返回连接', ja: '← 接続に戻る' },
  'cal.loading':       { en: 'Loading…', th: 'กำลังโหลด…', zh: '加载中…', ja: '読み込み中…' },

  // ---- Mode / gear-count picker ----
  'cal.gear_mode':    { en: 'Gear mode', th: 'โหมดเกียร์', zh: '挡位模式', ja: 'ギアモード' },
  'cal.gears_label':  { en: 'GEARS', th: 'จำนวนเกียร์', zh: '挡数', ja: 'ギア数' },
  'cal.gears_unit':   { en: 'gears', th: 'เกียร์', zh: '挡', ja: '速' },
  'cal.cal_step':     { en: 'calibration step', th: 'ขั้นตอนคาลิเบรต', zh: '个校准步骤', ja: '校正ステップ' },
  'cal.cal_steps':    { en: 'calibration steps', th: 'ขั้นตอนคาลิเบรต', zh: '个校准步骤', ja: '校正ステップ' },
  'cal.switching_mode':  { en: 'switching mode…', th: 'กำลังสลับโหมด…', zh: '切换模式中…', ja: 'モード切替中…' },
  'cal.switching_speed': { en: 'switching speed…', th: 'กำลังเปลี่ยนจำนวนเกียร์…', zh: '切换挡数中…', ja: '速数切替中…' },
  'cal.locked_active':   { en: 'locked while wizard active', th: 'ล็อกระหว่างตัวช่วยทำงาน', zh: '向导运行时已锁定', ja: 'ウィザード実行中はロック' },
  'cal.pick_pattern':    { en: 'Pick the gear pattern that matches your shifter, then tap BEGIN below. Hold the stick steady in each position the wizard asks for and tap CAPTURE — no need to touch the device.', th: 'เลือกรูปแบบเกียร์ที่ตรงกับคันเกียร์ของคุณ แล้วแตะ เริ่ม ด้านล่าง ถือคันเกียร์ให้นิ่งในแต่ละตำแหน่งที่ตัวช่วยขอ แล้วแตะ จับค่า — ไม่ต้องแตะที่อุปกรณ์', zh: '选择与你的换挡器匹配的挡位模式，然后点击下方的开始。在向导要求的每个位置保持杆稳定并点击采集 — 无需触碰设备。', ja: 'シフターに合うギアパターンを選び、下の開始をタップします。ウィザードが指示する各位置でノブを静止させ、取得をタップ — デバイスに触れる必要はありません。' },

  // ---- Wizard ----
  'cal.step_done':    { en: 'DONE', th: 'เสร็จ', zh: '完成', ja: '完了' },
  'cal.step_n':       { en: 'STEP {n} / {total}', th: 'ขั้นที่ {n} / {total}', zh: '步骤 {n} / {total}', ja: 'ステップ {n} / {total}' },
  'cal.holding_steady': { en: 'Holding steady…', th: 'กำลังถือนิ่ง…', zh: '保持稳定中…', ja: '静止を保持中…' },
  'cal.move_slower':    { en: 'Move slower — too much movement', th: 'ขยับช้าลง — เคลื่อนไหวมากเกินไป', zh: '放慢动作 — 移动过多', ja: 'ゆっくり動かして — 動きが多すぎます' },
  'cal.capturing':      { en: 'Capturing…', th: 'กำลังจับค่า…', zh: '采集中…', ja: '取得中…' },
  'cal.all_captured':   { en: 'All steps captured — tap SAVE.', th: 'จับค่าครบทุกขั้นแล้ว — แตะ บันทึก', zh: '所有步骤已采集 — 点击保存。', ja: '全ステップ取得完了 — 保存をタップ。' },
  'cal.hold_then_capture': { en: 'Hold the position, then tap CAPTURE.', th: 'ถือตำแหน่งไว้ แล้วแตะ จับค่า', zh: '保持位置，然后点击采集。', ja: '位置を保持して、取得をタップ。' },

  'cal.lean':   { en: 'Lean', th: 'เอียง', zh: '侧倾', ja: 'リーン' },
  'cal.tilt':   { en: 'Tilt', th: 'ก้มเงย', zh: '俯仰', ja: 'チルト' },
  'cal.yaw':    { en: 'Yaw', th: 'หันเห', zh: '偏航', ja: 'ヨー' },

  'cal.cancel':  { en: 'CANCEL', th: 'ยกเลิก', zh: '取消', ja: 'キャンセル' },
  'cal.save':    { en: 'SAVE', th: 'บันทึก', zh: '保存', ja: '保存' },
  'cal.capture': { en: 'CAPTURE', th: 'จับค่า', zh: '采集', ja: '取得' },

  // ---- Idle / begin ----
  'cal.begin':      { en: 'Begin', th: 'เริ่ม', zh: '开始', ja: '開始' },
  'cal.begin_body': { en: "This will switch the device's screen to the calibration wizard. You can step through all {n} positions from your phone — no need to tap the device.", th: 'การนี้จะสลับหน้าจออุปกรณ์ไปที่ตัวช่วยคาลิเบรต คุณทำครบทั้ง {n} ตำแหน่งจากโทรศัพท์ได้ — ไม่ต้องแตะที่อุปกรณ์', zh: '这会将设备屏幕切换到校准向导。你可以从手机逐步完成全部 {n} 个位置 — 无需触碰设备。', ja: 'デバイスの画面がキャリブレーションウィザードに切り替わります。全 {n} 個の位置を電話から順に進められます — デバイスに触れる必要はありません。' },
  'cal.begin_btn':  { en: 'BEGIN CALIBRATION', th: 'เริ่มคาลิเบรต', zh: '开始校准', ja: 'キャリブレーション開始' },
  'cal.no_capture': { en: 'This mode has no capture-based calibration.', th: 'โหมดนี้ไม่มีการคาลิเบรตแบบจับค่า', zh: '此模式没有基于采集的校准。', ja: 'このモードには取得ベースのキャリブレーションはありません。' },

  'cal.sensor_ref': { en: 'Sensor reference', th: 'ค่าอ้างอิงเซนเซอร์', zh: '传感器参考', ja: 'センサー基準値' },

  'cal.clear_btn':  { en: 'CLEAR CALIBRATION', th: 'ล้างการคาลิเบรต', zh: '清除校准', ja: 'キャリブレーション消去' },
} satisfies Record<string, Row>;
