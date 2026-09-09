// Shortcuts page (lap timer + record + peaks). Rune page → real Unicode chars.
import type { Row } from '../i18n';

export default {
  'shortcuts.title':      { en: 'Track shortcuts', th: 'ทางลัดสนาม', zh: '赛道快捷', ja: 'トラックショートカット' },
  'shortcuts.live_note':  { en: 'Live from your AXIS Gauge — controls mirror the gauge and knob.', th: 'สดจาก AXIS Gauge — ปุ่มควบคุมตรงกับหน้าปัดและหัวเกียร์', zh: '实时来自你的 AXIS Gauge——控制与仪表和换挡头同步。', ja: 'AXIS Gauge からライブ — 操作はゲージとシフトノブと同期。' },
  'shortcuts.demo_note':  { en: 'Sample values — connect your AXIS Gauge to control laps, recording and peaks live.', th: 'ค่าตัวอย่าง — เชื่อมต่อ AXIS Gauge เพื่อควบคุมรอบ การอัด และค่าพีคแบบสด', zh: '示例数值——连接你的 AXIS Gauge 以实时控制圈速、录制和峰值。', ja: 'サンプル値 — AXIS Gauge を接続してラップ・録画・ピークをライブ操作。' },

  'shortcuts.start_lap':  { en: 'Start lap', th: 'เริ่มจับรอบ', zh: '开始计圈', ja: 'ラップ開始' },
  'shortcuts.split_lap':  { en: 'Split lap', th: 'ตัดรอบ', zh: '分段计圈', ja: 'ラップ計測' },
  'shortcuts.reset_lap':  { en: 'Reset lap timer', th: 'รีเซ็ตจับเวลารอบ', zh: '重置计圈', ja: 'ラップをリセット' },
  'shortcuts.start_rec':  { en: 'Start recording', th: 'เริ่มบันทึก', zh: '开始录制', ja: '記録を開始' },
  'shortcuts.stop_rec':   { en: 'Stop recording', th: 'หยุดบันทึก', zh: '停止录制', ja: '記録を停止' },
  'shortcuts.show_peaks': { en: 'Show peaks on gauge', th: 'แสดงค่าพีคบนหน้าปัด', zh: '在仪表显示峰值', ja: 'ゲージにピークを表示' },

  'shortcuts.lap_board':  { en: 'Lap board', th: 'กระดานรอบ', zh: '计圈板', ja: 'ラップボード' },
  'shortcuts.this_lap':   { en: 'This lap', th: 'รอบนี้', zh: '本圈', ja: '現在のラップ' },
  'shortcuts.last_lap':   { en: 'Last lap', th: 'รอบล่าสุด', zh: '上一圈', ja: '前のラップ' },
  'shortcuts.best_lap':   { en: 'Best lap', th: 'รอบดีสุด', zh: '最快圈', ja: 'ベストラップ' },

  'shortcuts.peaks':      { en: 'Session peaks', th: 'ค่าพีคของรอบขับ', zh: '本次峰值', ja: 'セッションピーク' },
  'shortcuts.top_speed':  { en: 'Top speed', th: 'ความเร็วสูงสุด', zh: '最高速度', ja: '最高速度' },
  'shortcuts.max_rpm':    { en: 'Max RPM', th: 'รอบสูงสุด', zh: '最高转速', ja: '最高回転数' },
  'shortcuts.max_boost':  { en: 'Max boost', th: 'บูสต์สูงสุด', zh: '最大增压', ja: '最大ブースト' },
  'shortcuts.peak_power': { en: 'Peak power', th: 'กำลังสูงสุด', zh: '峰值功率', ja: 'ピーク出力' },
  'shortcuts.peak_torque':{ en: 'Peak torque', th: 'แรงบิดสูงสุด', zh: '峰值扭矩', ja: 'ピークトルク' },
  'shortcuts.max_coolant':{ en: 'Max coolant', th: 'อุณหภูมิน้ำสูงสุด', zh: '最高水温', ja: '最高水温' },

  'shortcuts.connect_note': { en: 'Connect your AXIS Gauge to send these to the car. Lap timing is manual — no GPS.', th: 'เชื่อมต่อ AXIS Gauge เพื่อส่งคำสั่งไปที่รถ การจับรอบเป็นแบบกดเอง — ไม่ใช้ GPS', zh: '连接你的 AXIS Gauge 才能发送到车辆。计圈为手动——不使用 GPS。', ja: 'AXIS Gauge を接続すると車両へ送信できます。ラップ計測は手動 — GPS なし。' },
} satisfies Record<string, Row>;
