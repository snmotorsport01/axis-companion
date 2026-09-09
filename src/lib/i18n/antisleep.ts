// Anti-sleep & drowsiness page. One namespace file; auto-merged by lib/i18n.ts.
// en = source/fallback. Rune page → values are plain TEXT (real Unicode glyphs).
// "gyro", "km/h" kept verbatim.
import type { Row } from '../i18n';

export default {
  'antisleep.title':  { en: 'Anti-sleep', th: 'กันหลับใน', zh: '防瞌睡', ja: '居眠り防止' },
  'antisleep.connect': { en: 'Connect your AXIS gauge to set this up.', th: 'เชื่อมต่อเกจ AXIS ก่อนเพื่อตั้งค่า', zh: '先连接你的 AXIS 仪表以进行设置。', ja: '設定するには AXIS ゲージを接続してください。' },
  'antisleep.go_connect': { en: 'Go to connect', th: 'ไปหน้าเชื่อมต่อ', zh: '前往连接', ja: '接続画面へ' },
  'antisleep.reading': { en: 'Reading from the gauge…', th: 'กำลังอ่านจากเกจ…', zh: '正在从仪表读取…', ja: 'ゲージから読み取り中…' },
  'antisleep.saving':  { en: 'Saving…', th: 'กำลังบันทึก…', zh: '保存中…', ja: '保存中…' },
  'antisleep.saved':   { en: '✓ Saved to the gauge.', th: '✓ บันทึกลงเกจแล้ว', zh: '✓ 已保存到仪表。', ja: '✓ ゲージに保存しました。' },

  'antisleep.intro': { en: 'A full-screen reminder after a long stretch of driving, plus live drowsiness detection from the gauge’s motion sensor. A safety aid — not a substitute for real rest.', th: 'เตือนเต็มจอหลังขับต่อเนื่องนานๆ พร้อมตรวจจับอาการหลับในแบบสดจากเซ็นเซอร์การเคลื่อนไหวของเกจ เป็นตัวช่วยด้านความปลอดภัย ไม่ใช่สิ่งทดแทนการพักจริง', zh: '长时间驾驶后弹出全屏提醒，并通过仪表的运动传感器实时检测瞌睡。这是安全辅助，不能替代真正的休息。', ja: '長時間の運転後にフルスクリーンで注意を促し、ゲージのモーションセンサーで居眠りをリアルタイム検出します。安全補助であり、実際の休息の代わりにはなりません。' },

  'antisleep.enabled':      { en: 'Enabled', th: 'เปิดใช้งาน', zh: '启用', ja: '有効' },
  'antisleep.remind_after': { en: 'Remind after', th: 'เตือนหลังจาก', zh: '提醒时长', ja: 'この時間で通知' },
  'antisleep.count_above':  { en: 'Count driving above', th: 'นับการขับเกิน', zh: '计入车速高于', ja: 'この速度以上を計上' },
  'antisleep.rest_resets':  { en: 'Rest resets after', th: 'พักแล้วรีเซ็ตหลัง', zh: '停车重置时长', ja: 'この休憩でリセット' },
  'antisleep.snooze_tap':   { en: 'Snooze on tap', th: 'แตะเพื่อเลื่อน', zh: '点击后延后', ja: 'タップでスヌーズ' },
  'antisleep.h':   { en: 'h', th: 'ชม.', zh: '小时', ja: '時間' },
  'antisleep.min': { en: 'min', th: 'นาที', zh: '分钟', ja: '分' },
  'antisleep.kmh': { en: 'km/h', th: 'km/h', zh: 'km/h', ja: 'km/h' },

  'antisleep.drowsy_head': { en: 'Drowsiness detection', th: 'ตรวจจับหลับใน', zh: '瞌睡检测', ja: '居眠り検出' },
  'antisleep.drowsy_desc': { en: 'While you drive (from about 40 km/h) the gauge learns how you normally steer over the first ~10 minutes, then watches the car’s motion for the drowsy pattern — drifting, then a sharp correction — and pops a “Stay alert” warning.', th: 'ขณะขับ (ตั้งแต่ราว 40 km/h) เกจจะเรียนรู้การบังคับพวงมาลัยปกติของคุณใน ~10 นาทีแรก แล้วเฝ้าดูการเคลื่อนไหวของรถหารูปแบบหลับใน — ปล่อยไหลแล้วกระตุกแก้ — และเด้งเตือน “Stay alert”', zh: '在行驶中（约 40 km/h 以上），仪表会在最初约 10 分钟学习你平时的转向习惯，然后观察车辆运动中的瞌睡特征——先偏移再猛回正——并弹出“Stay alert”警告。', ja: '走行中（約 40 km/h 以上）に最初の約10分間で普段のハンドル操作を学習し、車の動きから居眠りの兆候（ふらつき→急な修正）を監視して“Stay alert”の警告を表示します。' },
  'antisleep.sensitivity': { en: 'Sensitivity', th: 'ความไว', zh: '灵敏度', ja: '感度' },
  'antisleep.auto_note':   { en: 'Fully automatic — it keeps learning your driving and calibrates itself. Nothing to set.', th: 'อัตโนมัติเต็มตัว — เรียนรู้การขับของคุณต่อเนื่องและปรับค่าเอง ไม่ต้องตั้งอะไร', zh: '全自动 — 持续学习你的驾驶习惯并自我校准，无需设置。', ja: '全自動 — あなたの運転を学習し続け、自動で調整します。設定は不要です。' },
  'antisleep.learning':    { en: 'Learning your baseline', th: 'กำลังเรียนรู้ค่าพื้นฐานของคุณ', zh: '正在学习你的基准', ja: 'あなたの基準を学習中' },
  'antisleep.drowsy_now':  { en: 'Drowsiness now', th: 'ระดับหลับในตอนนี้', zh: '当前瞌睡度', ja: '現在の居眠り度' },
  'antisleep.live_note':   { en: 'Updates live while driving (about 40 km/h+). Below that, the time-based reminder above still runs.', th: 'อัปเดตสดขณะขับ (ราว 40 km/h ขึ้นไป) ต่ำกว่านั้นตัวเตือนตามเวลาด้านบนยังทำงาน', zh: '行驶中实时更新（约 40 km/h 以上）。低于该速度时，上方的定时提醒仍然有效。', ja: '走行中（約 40 km/h 以上）にリアルタイム更新。それ未満では上の時間ベースの通知が機能します。' },

  'antisleep.save':     { en: 'Save to gauge', th: 'บันทึกลงเกจ', zh: '保存到仪表', ja: 'ゲージに保存' },
  'antisleep.aid_note': { en: 'A drowsy-driving aid — thresholds are conservative and being tuned. Always pull over when tired.', th: 'เป็นตัวช่วยกันหลับใน — ค่าตั้งไว้แบบระวังและกำลังปรับจูน เหนื่อยเมื่อไหร่ให้จอดพักเสมอ', zh: '防瞌睡辅助——阈值保守且仍在调校。疲劳时请务必靠边停车。', ja: '居眠り運転の補助です。しきい値は控えめで調整中です。眠いときは必ず停車してください。' },
} satisfies Record<string, Row>;
