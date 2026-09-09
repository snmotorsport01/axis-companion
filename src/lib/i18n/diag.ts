// Record log (Diagnostics) page. Rune page → actual chars, {@html} for <b>.
import type { Row } from '../i18n';

export default {
  'diag.title':         { en: 'Record log', th: 'บันทึกล็อก', zh: '记录日志', ja: 'ログ記録' },
  'diag.connect_intro': { en: 'Drive logs and best times are read from the car — connect your AXIS Gauge to use them.', th: 'ล็อกการขับและเวลาที่ดีที่สุด อ่านจากรถ — เชื่อมต่อ AXIS Gauge เพื่อใช้งาน', zh: '行驶日志和最佳成绩均从车辆读取——连接你的 AXIS Gauge 即可使用。', ja: '走行ログとベストタイムは車から読み取ります — AXIS Gauge を接続して使用してください。' },
  'diag.go_gauge':      { en: 'Go to Gauge →', th: 'ไปที่เกจ →', zh: '前往仪表 →', ja: 'ゲージへ →' },

  'diag.drivelog_sum':  { en: 'Drive log · data', th: 'ล็อกการขับ · ข้อมูล', zh: '行驶日志 · 数据', ja: '走行ログ · データ' },
  'diag.drivelog_p':    { en: 'Records your drive on the gauge when you tap <b>RECORD</b> in its menu. Pull it here to save a spreadsheet (CSV) of every reading over time.', th: 'บันทึกการขับบนเกจเมื่อคุณกด <b>RECORD</b> ในเมนู ดึงมาที่นี่เพื่อบันทึกเป็นสเปรดชีต (CSV) ของทุกค่าตามเวลา', zh: '当你在仪表菜单中点击 <b>RECORD</b> 时记录你的行驶。在此拉取以保存包含每个时刻读数的表格 (CSV)。', ja: 'ゲージのメニューで <b>RECORD</b> をタップすると走行を記録します。ここで取得し、時系列の全読み取り値を表計算 (CSV) として保存します。' },
  'diag.download_csv':  { en: 'Download CSV', th: 'ดาวน์โหลด CSV', zh: '下载 CSV', ja: 'CSV をダウンロード' },
  'diag.erase':         { en: 'Erase', th: 'ลบ', zh: '清除', ja: '消去' },
  'diag.pulling_pct':   { en: 'Pulling… {pct}%', th: 'กำลังดึง… {pct}%', zh: '拉取中… {pct}%', ja: '取得中… {pct}%' },

  'diag.buslog_sum':    { en: 'Bus log · CAN capture', th: 'ล็อกบัส · จับ CAN', zh: '总线日志 · CAN 捕获', ja: 'バスログ · CAN キャプチャ' },
  'diag.buslog_p':      { en: 'Records <b>every CAN frame</b> on the car’s OBD port to reverse-engineer signals. Start, drive, then download a <b>SavvyCAN CSV</b>. (Only OBD-port traffic — internal buses are gateway-isolated.)', th: 'บันทึก<b>ทุกเฟรม CAN</b> ที่พอร์ต OBD ของรถ เพื่อรีเวิร์สสัญญาณ เริ่ม ขับ แล้วดาวน์โหลด <b>SavvyCAN CSV</b> (เฉพาะทราฟฟิกพอร์ต OBD — บัสภายในถูกเกตเวย์กั้น)', zh: '记录车辆 OBD 端口上的<b>每一个 CAN 帧</b>以逆向信号。开始、驾驶，然后下载 <b>SavvyCAN CSV</b>。（仅 OBD 端口流量——内部总线被网关隔离。）', ja: '信号を解析するため、車の OBD ポートの<b>すべての CAN フレーム</b>を記録します。開始して走行し、<b>SavvyCAN CSV</b> をダウンロード。（OBD ポートのトラフィックのみ — 内部バスはゲートウェイで分離されています。）' },
  'diag.stop_capture':  { en: '● Stop capture', th: '● หยุดจับ', zh: '● 停止捕获', ja: '● キャプチャ停止' },
  'diag.start_capture': { en: 'Start capture', th: 'เริ่มจับ', zh: '开始捕获', ja: 'キャプチャ開始' },
  'diag.erase_capture': { en: 'Erase capture', th: 'ลบข้อมูลที่จับ', zh: '清除捕获', ja: 'キャプチャを消去' },

  'diag.nodelog_sum':   { en: 'Node log (diagnostics)', th: 'ล็อกโหนด (วินิจฉัย)', zh: '节点日志 (诊断)', ja: 'ノードログ (診断)' },
  'diag.nodelog_p':     { en: 'The CAN node’s captured diagnostic log — RE probes, bus events. Pull it as text.', th: 'ล็อกวินิจฉัยที่โหนด CAN จับไว้ — โพรบ RE, เหตุการณ์บัส ดึงมาเป็นข้อความ', zh: 'CAN 节点捕获的诊断日志——逆向探测、总线事件。以文本形式拉取。', ja: 'CAN ノードが記録した診断ログ — RE プローブ、バスイベント。テキストとして取得。' },
  'diag.download_txt':  { en: 'Download log (.txt)', th: 'ดาวน์โหลดล็อก (.txt)', zh: '下载日志 (.txt)', ja: 'ログをダウンロード (.txt)' },

  'diag.accel_sum':     { en: 'Acceleration times', th: 'เวลาอัตราเร่ง', zh: '加速成绩', ja: '加速タイム' },
  'diag.accel_p':       { en: 'Your best runs from the gauge’s <b>ACCEL TIMER</b> menu — saved on the gauge and read here.', th: 'การวิ่งที่ดีที่สุดจากเมนู <b>ACCEL TIMER</b> ของเกจ — บันทึกบนเกจและอ่านที่นี่', zh: '来自仪表 <b>ACCEL TIMER</b> 菜单的最佳成绩——保存在仪表上并在此读取。', ja: 'ゲージの <b>ACCEL TIMER</b> メニューのベスト走行 — ゲージに保存され、ここで読み取ります。' },
  'diag.refresh':       { en: 'Refresh', th: 'รีเฟรช', zh: '刷新', ja: '更新' },
  'diag.read_best':     { en: 'Read best times', th: 'อ่านเวลาที่ดีที่สุด', zh: '读取最佳成绩', ja: 'ベストタイムを読む' },
  'diag.by_speed':      { en: 'By speed', th: 'ตามความเร็ว', zh: '按速度', ja: '速度別' },
  'diag.by_distance':   { en: 'By distance', th: 'ตามระยะทาง', zh: '按距离', ja: '距離別' },
  'diag.no_runs':       { en: 'No runs saved yet — arm a run from the gauge’s ACCEL TIMER menu.', th: 'ยังไม่มีการวิ่งบันทึกไว้ — ตั้งการวิ่งจากเมนู ACCEL TIMER ของเกจ', zh: '还没有保存的记录——从仪表的 ACCEL TIMER 菜单准备一次跑测。', ja: 'まだ保存された走行がありません — ゲージの ACCEL TIMER メニューから走行を準備してください。' },

  // script messages
  'diag.reading':          { en: 'Reading…', th: 'กำลังอ่าน…', zh: '读取中…', ja: '読み取り中…' },
  'diag.frames_captured':  { en: '{n} frames captured', th: 'จับได้ {n} เฟรม', zh: '已捕获 {n} 帧', ja: '{n} フレーム取得' },
  'diag.stopping':         { en: 'Stopping…', th: 'กำลังหยุด…', zh: '停止中…', ja: '停止中…' },
  'diag.starting':         { en: 'Starting…', th: 'กำลังเริ่ม…', zh: '启动中…', ja: '開始中…' },
  'diag.capturing_msg':    { en: '● Capturing — drive, then Stop + Download.', th: '● กำลังจับ — ขับ แล้วหยุด + ดาวน์โหลด', zh: '● 捕获中——驾驶，然后停止 + 下载。', ja: '● キャプチャ中 — 走行後、停止＋ダウンロード。' },
  'diag.stopped':          { en: 'Stopped.', th: 'หยุดแล้ว', zh: '已停止。', ja: '停止しました。' },
  'diag.pulling_capture':  { en: 'Pulling capture…', th: 'กำลังดึงข้อมูลที่จับ…', zh: '正在拉取捕获…', ja: 'キャプチャを取得中…' },
  'diag.capture_empty':    { en: 'Capture was empty.', th: 'ข้อมูลที่จับว่างเปล่า', zh: '捕获为空。', ja: 'キャプチャは空でした。' },
  'diag.can_done':         { en: '✓ {frames} frames · {ids} IDs · {span}s — open in SavvyCAN', th: '✓ {frames} เฟรม · {ids} ID · {span}วิ — เปิดใน SavvyCAN', zh: '✓ {frames} 帧 · {ids} 个 ID · {span}秒——在 SavvyCAN 中打开', ja: '✓ {frames} フレーム · {ids} ID · {span}秒 — SavvyCAN で開く' },
  'diag.confirm_erase_can':{ en: 'Erase the captured CAN log on the gauge?', th: 'ลบล็อก CAN ที่จับไว้บนเกจ?', zh: '清除仪表上已捕获的 CAN 日志？', ja: 'ゲージの取得済み CAN ログを消去しますか？' },
  'diag.capture_erased':   { en: 'Capture erased.', th: 'ลบข้อมูลที่จับแล้ว', zh: '捕获已清除。', ja: 'キャプチャを消去しました。' },
  'diag.pulling':          { en: 'Pulling…', th: 'กำลังดึง…', zh: '拉取中…', ja: '取得中…' },
  'diag.no_node_log':      { en: 'No node log captured yet.', th: 'ยังไม่มีล็อกโหนดที่จับไว้', zh: '尚未捕获节点日志。', ja: 'ノードログはまだ記録されていません。' },
  'diag.node_saved':       { en: '✓ {n} bytes saved', th: '✓ บันทึก {n} ไบต์', zh: '✓ 已保存 {n} 字节', ja: '✓ {n} バイト保存' },
  'diag.confirm_erase_node':{ en: 'Erase the node log on the gauge?', th: 'ลบล็อกโหนดบนเกจ?', zh: '清除仪表上的节点日志？', ja: 'ゲージのノードログを消去しますか？' },
  'diag.node_erased':      { en: 'Node log erased.', th: 'ลบล็อกโหนดแล้ว', zh: '节点日志已清除。', ja: 'ノードログを消去しました。' },
  'diag.drive_saved':      { en: '✓ {n} samples saved', th: '✓ บันทึก {n} ตัวอย่าง', zh: '✓ 已保存 {n} 个采样', ja: '✓ {n} サンプル保存' },
  'diag.confirm_erase_drive':{ en: 'Erase the drive log on the gauge?', th: 'ลบล็อกการขับบนเกจ?', zh: '清除仪表上的行驶日志？', ja: 'ゲージの走行ログを消去しますか？' },
  'diag.drive_erased':     { en: 'Drive log erased.', th: 'ลบล็อกการขับแล้ว', zh: '行驶日志已清除。', ja: '走行ログを消去しました。' },
} satisfies Record<string, Row>;
