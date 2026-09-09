// Analysis page (drive graphs + virtual dyno + PNG export). Rune page → real chars.
import type { Row } from '../i18n';

export default {
  'analysis.title':      { en: 'Analysis', th: 'วิเคราะห์การขับ', zh: '驾驶分析', ja: '走行解析' },
  'analysis.sample':     { en: 'Sample run', th: 'รอบตัวอย่าง', zh: '示例记录', ja: 'サンプル走行' },
  'analysis.reading':    { en: 'Reading your drive…', th: 'กำลังอ่านการขับ…', zh: '正在读取行驶…', ja: '走行を読み込み中…' },
  'analysis.demo_note':  { en: 'Sample drive — connect your AXIS Gauge to analyse your own recorded runs.', th: 'รอบตัวอย่าง — เชื่อมต่อ AXIS Gauge เพื่อวิเคราะห์รอบขับที่บันทึกเอง', zh: '示例行驶——连接你的 AXIS Gauge 以分析你自己记录的行驶。', ja: 'サンプル走行 — AXIS Gauge を接続すると、自分の記録した走行を解析できます。' },
  'analysis.live_note':  { en: 'From your latest recorded drive.', th: 'จากรอบขับที่บันทึกล่าสุด', zh: '来自你最近记录的行驶。', ja: '最新の記録走行より。' },

  // stat tiles
  'analysis.zero_hundred':{ en: '0–100 km/h', th: '0–100 กม./ชม.', zh: '0–100 km/h', ja: '0–100 km/h' },
  'analysis.top_speed':  { en: 'Top speed', th: 'ความเร็วสูงสุด', zh: '最高速度', ja: '最高速度' },
  'analysis.distance':   { en: 'Distance', th: 'ระยะทาง', zh: '距离', ja: '距離' },
  'analysis.peak_power': { en: 'Peak power', th: 'กำลังสูงสุด', zh: '峰值功率', ja: 'ピーク出力' },
  'analysis.peak_torque':{ en: 'Peak torque', th: 'แรงบิดสูงสุด', zh: '峰值扭矩', ja: 'ピークトルク' },
  'analysis.duration':   { en: 'Duration', th: 'ระยะเวลา', zh: '时长', ja: '時間' },

  // chart titles
  'analysis.speed_time': { en: 'Speed / time', th: 'ความเร็ว / เวลา', zh: '速度 / 时间', ja: '速度 / 時間' },
  'analysis.dist_time':  { en: 'Distance / time', th: 'ระยะทาง / เวลา', zh: '距离 / 时间', ja: '距離 / 時間' },
  'analysis.power':      { en: 'Power / RPM', th: 'กำลัง / รอบ', zh: '功率 / 转速', ja: '出力 / 回転数' },
  'analysis.torque':     { en: 'Torque / RPM', th: 'แรงบิด / รอบ', zh: '扭矩 / 转速', ja: 'トルク / 回転数' },
  'analysis.dyno_note':  { en: 'Virtual dyno — power & torque estimated from speed + weight physics (no bus torque signal needed). A repeatable pull, not a bench figure.', th: 'ไดโนเสมือน — กำลัง & แรงบิดประมาณจากความเร็ว + น้ำหนักด้วยฟิสิกส์ (ไม่ต้องมีสัญญาณแรงบิดจากบัส) เป็นค่าที่ทำซ้ำได้ ไม่ใช่ค่าไดโนจริง', zh: '虚拟测功——功率和扭矩由速度 + 重量物理估算（无需总线扭矩信号）。是可重复的拉测，而非台架数值。', ja: 'バーチャルダイノ — 出力とトルクは速度 + 重量の物理から推定（バスのトルク信号不要）。再現可能なプルであり、ベンチ実測値ではありません。' },

  'analysis.refresh':    { en: 'Pull latest drive', th: 'ดึงรอบล่าสุด', zh: '拉取最新行驶', ja: '最新走行を取得' },
  'analysis.export':     { en: 'Export PNG', th: 'ส่งออก PNG', zh: '导出 PNG', ja: 'PNG を書き出す' },
  'analysis.exporting':  { en: 'Exporting…', th: 'กำลังส่งออก…', zh: '导出中…', ja: '書き出し中…' },
  'analysis.export_video':{ en: 'Export gauge video', th: 'ส่งออกวิดีโอเกจ', zh: '导出仪表视频', ja: 'ゲージ動画を書き出す' },
  'analysis.recording':  { en: 'Recording… {pct}%', th: 'กำลังอัด… {pct}%', zh: '录制中… {pct}%', ja: '録画中… {pct}%' },
  'analysis.video_hint': { en: 'The gauge clip is re-rendered from your drive and recorded in real time — give it a few seconds.', th: 'คลิปเกจถูกเรนเดอร์ใหม่จากการขับของคุณและอัดแบบเรียลไทม์ — รอสักครู่', zh: '仪表片段根据你的行驶重新渲染并实时录制——请稍候几秒。', ja: 'ゲージのクリップは走行から再描画され、リアルタイムで録画されます — 数秒お待ちください。' },
} satisfies Record<string, Row>;
