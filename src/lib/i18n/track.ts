// Track mode — phone-GPS lap timer + route recorder. One namespace file;
// auto-merged by lib/i18n.ts via import.meta.glob. en = source/fallback.
// Rune page → values are plain TEXT (actual Unicode glyphs, no HTML entities).
// "AXIS", "GPS", "GPX", "km", "km/h" are kept verbatim across languages.
import type { Row } from '../i18n';

export default {
  'track.title': { en: 'Track', th: 'แทร็ก', zh: '赛道', ja: 'トラック' },

  // ---- GPS status pill ----
  'track.acquiring': { en: 'Acquiring…', th: 'กำลังหาสัญญาณ…', zh: '定位中…', ja: '取得中…' },
  'track.gps_off':   { en: 'GPS off', th: 'GPS ปิด', zh: 'GPS 关闭', ja: 'GPS オフ' },

  // ---- flash banners ----
  'track.gps_unavailable': { en: 'GPS unavailable: {msg}', th: 'ใช้ GPS ไม่ได้: {msg}', zh: 'GPS 不可用：{msg}', ja: 'GPS を利用できません: {msg}' },
  'track.session_started': { en: 'Session started — drive to the start line', th: 'เริ่มเซสชันแล้ว — ขับไปที่เส้นสตาร์ท', zh: '已开始 — 驶向起跑线', ja: 'セッション開始 — スタートラインへ' },
  'track.waiting_gps':     { en: 'Waiting for GPS…', th: 'กำลังรอ GPS…', zh: '等待 GPS…', ja: 'GPS を待機中…' },
  'track.line_set':        { en: 'Start/finish line set — cross it to time laps', th: 'ตั้งเส้นสตาร์ท/ฟินิชแล้ว — ขับผ่านเพื่อจับเวลาต่อรอบ', zh: '起终点已设置 — 越过即计圈', ja: 'スタート/フィニッシュを設定 — 通過でラップ計測' },
  'track.session_ended':   { en: 'Session ended — {n} lap(s)', th: 'จบเซสชัน — {n} รอบ', zh: '已结束 — {n} 圈', ja: 'セッション終了 — {n} ラップ' },
  'track.export_failed':   { en: 'Export failed: {msg}', th: 'ส่งออกไม่สำเร็จ: {msg}', zh: '导出失败：{msg}', ja: 'エクスポート失敗: {msg}' },
  'track.lap_flash':       { en: 'Lap {n} — {time}', th: 'รอบ {n} — {time}', zh: '第 {n} 圈 — {time}', ja: 'ラップ {n} — {time}' },
  'track.best_tag':        { en: '  ★ best', th: '  ★ ดีที่สุด', zh: '  ★ 最佳', ja: '  ★ ベスト' },

  // ---- lap tiles ----
  'track.current_lap': { en: 'Current lap', th: 'รอบปัจจุบัน', zh: '当前圈', ja: '現在のラップ' },
  'track.last_lap':    { en: 'Last lap', th: 'รอบล่าสุด', zh: '上一圈', ja: '前のラップ' },
  'track.best_lap':    { en: 'Best lap', th: 'รอบดีที่สุด', zh: '最佳圈', ja: 'ベストラップ' },
  'track.laps':        { en: 'Laps', th: 'จำนวนรอบ', zh: '圈数', ja: 'ラップ数' },

  // ---- hints + line state ----
  'track.hint_idle':    { en: 'Mount your phone, get a clear view of the sky, then start a session. Your location is used only here and never leaves the device.', th: 'ยึดโทรศัพท์ให้มั่น ให้เห็นท้องฟ้าโล่ง แล้วเริ่มเซสชัน ตำแหน่งของคุณถูกใช้ที่นี่เท่านั้นและไม่ออกจากเครื่อง', zh: '固定好手机，确保能清楚看到天空，然后开始。你的位置仅在此使用，绝不离开设备。', ja: 'スマホを固定し、空が開けた場所でセッションを開始します。位置情報はここでのみ使用され、端末外に出ません。' },
  'track.hint_setline': { en: 'Drive across the start/finish line, then tap below at that spot. Each time you cross it again, a lap is timed — and sent to your gauge.', th: 'ขับผ่านเส้นสตาร์ท/ฟินิช แล้วแตะปุ่มด้านล่างตรงจุดนั้น ทุกครั้งที่ขับผ่านอีก จะจับเวลาต่อรอบ — และส่งไปที่เกจของคุณ', zh: '驶过起终点，然后在该位置点击下方按钮。之后每次越过都会计一圈 — 并发送到你的仪表。', ja: 'スタート/フィニッシュを通過し、その地点で下のボタンをタップします。以後通過するたびにラップを計測し — ゲージへ送信します。' },
  'track.hint_nolaps':  { en: 'No full laps recorded. Set the start/finish line and cross it at least twice next time.', th: 'ไม่มีรอบที่สมบูรณ์ ครั้งหน้าให้ตั้งเส้นสตาร์ท/ฟินิชแล้วขับผ่านอย่างน้อยสองครั้ง', zh: '未记录到完整圈。下次请设置起终点并至少越过两次。', ja: '完全なラップがありません。次回はスタート/フィニッシュを設定し、少なくとも2回通過してください。' },
  'track.line_ok':      { en: '◎ Start line set', th: '◎ ตั้งเส้นสตาร์ทแล้ว', zh: '◎ 起点已设置', ja: '◎ スタートライン設定済み' },
  'track.line_locking': { en: ' — drive off to lock its direction', th: ' — ขับออกเพื่อล็อกทิศทาง', zh: ' — 起步以锁定方向', ja: ' — 発進して方向を固定' },
  'track.move':         { en: 'move', th: 'ย้าย', zh: '移动', ja: '移動' },

  // ---- meta line ----
  'track.top_speed':  { en: 'top {n} km/h', th: 'สูงสุด {n} km/h', zh: '最高 {n} km/h', ja: '最高 {n} km/h' },
  'track.laps_count': { en: '{n} laps', th: '{n} รอบ', zh: '{n} 圈', ja: '{n} ラップ' },

  // ---- buttons ----
  'track.start':       { en: 'Start session', th: 'เริ่มเซสชัน', zh: '开始', ja: 'セッション開始' },
  'track.set_line':    { en: 'Set start / finish line', th: 'ตั้งเส้นสตาร์ท / ฟินิช', zh: '设置起终点', ja: 'スタート/フィニッシュを設定' },
  'track.finish':      { en: 'Finish session', th: 'จบเซสชัน', zh: '结束', ja: 'セッション終了' },
  'track.export':      { en: 'Export GPX', th: 'ส่งออก GPX', zh: '导出 GPX', ja: 'GPX を書き出し' },
  'track.exporting':   { en: 'Exporting…', th: 'กำลังส่งออก…', zh: '导出中…', ja: '書き出し中…' },
  'track.new_session': { en: 'New session', th: 'เซสชันใหม่', zh: '新会话', ja: '新規セッション' },
} satisfies Record<string, Row>;
