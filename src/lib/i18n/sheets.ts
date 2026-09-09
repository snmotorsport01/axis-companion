// AxisShell popup sheets (connect / update / buy) + toast messages.
import type { Row } from '../i18n';

export default {
  // ---- toasts ----
  'toast.choose_gauge':      { en: 'Choose your AXIS gauge&hellip;', th: 'เลือกเกจ AXIS ของคุณ&hellip;', zh: '选择你的 AXIS 仪表&hellip;', ja: 'AXIS ゲージを選択&hellip;' },
  'toast.codes_cleared':     { en: 'Codes cleared', th: 'ล้างรหัสแล้ว', zh: '已清除故障码', ja: 'コードを消去しました' },
  'toast.clear_failed':      { en: 'Could not clear &mdash; try again', th: 'ล้างไม่สำเร็จ &mdash; ลองอีกครั้ง', zh: '清除失败 &mdash; 请重试', ja: '消去できません &mdash; 再試行してください' },
  'toast.read_failed':       { en: 'Could not read &mdash; is the gauge on?', th: 'อ่านไม่สำเร็จ &mdash; เปิดเกจอยู่ไหม?', zh: '读取失败 &mdash; 仪表开着吗？', ja: '読み取れません &mdash; ゲージは起動していますか？' },
  'toast.feel_saved':        { en: 'Feel saved', th: 'บันทึกฟีลแล้ว', zh: '已保存手感', ja: 'フィールを保存しました' },
  'toast.gauge_connected':   { en: 'Gauge connected', th: 'เชื่อมต่อเกจแล้ว', zh: '仪表已连接', ja: 'ゲージを接続しました' },
  'toast.knob_connected':    { en: 'Knob connected', th: 'เชื่อมต่อหัวเกียร์แล้ว', zh: '换挡头已连接', ja: 'シフトノブを接続しました' },
  'toast.knob_style_connect':{ en: 'Knob styling &mdash; connect the knob to apply', th: 'แต่งหัวเกียร์ &mdash; เชื่อมต่อหัวเกียร์เพื่อใช้งาน', zh: '换挡头样式 &mdash; 连接换挡头以应用', ja: 'シフトノブのスタイル &mdash; 適用するにはシフトノブを接続' },
  'toast.ready_teach':       { en: 'Ready to teach gears', th: 'พร้อมสอนเกียร์', zh: '准备学习挡位', ja: 'ギア学習の準備完了' },
  'toast.saved':             { en: 'Saved', th: 'บันทึกแล้ว', zh: '已保存', ja: '保存しました' },
  'toast.style_restored':    { en: 'Your style was restored to the gauge', th: 'คืนค่าสไตล์ลงเกจแล้ว', zh: '已将你的样式恢复到仪表', ja: 'スタイルをゲージに復元しました' },
  'toast.gauge_updated':     { en: 'Gauge updated &mdash; reconnect to restore your style', th: 'อัปเดตเกจแล้ว &mdash; เชื่อมต่อใหม่เพื่อคืนสไตล์', zh: '仪表已更新 &mdash; 重新连接以恢复样式', ja: 'ゲージを更新しました &mdash; 再接続してスタイルを復元' },
  'toast.node_updated':      { en: 'OBD module updated', th: 'อัปเดตโมดูล OBD แล้ว', zh: 'OBD 模块已更新', ja: 'OBD モジュールを更新しました' },
  'toast.saved_page':        { en: 'Saved page {n} to your gauge', th: 'บันทึกหน้า {n} ลงเกจแล้ว', zh: '已将页面 {n} 保存到仪表', ja: 'ページ {n} をゲージに保存しました' },
  'toast.saved_all':         { en: 'Saved all {n} pages to your gauge', th: 'บันทึกทั้ง {n} หน้าลงเกจแล้ว', zh: '已将全部 {n} 个页面保存到仪表', ja: '全 {n} ページをゲージに保存しました' },
  // prefixes (an error message from the system is appended after these)
  'toast.save_failed':       { en: 'Could not save &mdash; ', th: 'บันทึกไม่สำเร็จ &mdash; ', zh: '保存失败 &mdash; ', ja: '保存できません &mdash; ' },
  'toast.update_failed':     { en: 'Update failed &mdash; ', th: 'อัปเดตล้มเหลว &mdash; ', zh: '更新失败 &mdash; ', ja: '更新に失敗 &mdash; ' },
  'toast.check_failed':      { en: 'Couldn’t check updates &mdash; ', th: 'ตรวจอัปเดตไม่สำเร็จ &mdash; ', zh: '检查更新失败 &mdash; ', ja: '更新を確認できません &mdash; ' },
  'toast.face_setup':        { en: '{name} — set it up here', th: '{name} — ตั้งค่าที่นี่', zh: '{name} — 在此设置', ja: '{name} — ここで設定' },
  'toast.item_added':        { en: '{name} added — pick a face in Looks', th: 'เพิ่ม {name} แล้ว — เลือกหน้าปัดในสไตล์', zh: '已添加 {name} — 在外观中选择表盘', ja: '{name} を追加 — 外観でフェイスを選択' },

  // ---- shared sheet buttons ----
  'sheet.not_now':    { en: 'Not now', th: 'ไว้ก่อน', zh: '暂不', ja: '今はしない' },
  'sheet.done':       { en: 'Done', th: 'เสร็จ', zh: '完成', ja: '完了' },

  // ---- buy sheet ----
  'sheet.buy_eyebrow':      { en: 'Gauge face', th: 'หน้าปัดเกจ', zh: '仪表表盘', ja: 'ゲージ フェイス' },
  'sheet.buy_blurb_suffix': { en: '. Added to your faces so you can try it on the gauge &mdash; free while AXIS is in early access.', th: ' เพิ่มลงหน้าปัดของคุณเพื่อลองบนเกจ &mdash; ฟรีในช่วง AXIS early access', zh: '。已添加到你的表盘，可在仪表上试用 &mdash; AXIS 抢先体验期间免费。', ja: '。フェイスに追加され、ゲージで試せます &mdash; AXIS 早期アクセス中は無料。' },
  'sheet.free_to_try':      { en: 'FREE TO TRY', th: 'ลองใช้ฟรี', zh: '免费试用', ja: '無料で試す' },
  'sheet.add_try':          { en: 'Add to my faces', th: 'เพิ่มลงหน้าปัดของฉัน', zh: '添加到我的表盘', ja: 'マイフェイスに追加' },

  // ---- connect sheet ----
  'sheet.pair_bt':      { en: 'Pair over Bluetooth', th: 'จับคู่ผ่านบลูทูธ', zh: '通过蓝牙配对', ja: 'Bluetooth でペアリング' },
  'sheet.connected':    { en: 'Connected', th: 'เชื่อมต่อแล้ว', zh: '已连接', ja: '接続済み' },
  'sheet.connecting':   { en: 'Connecting&hellip;', th: 'กำลังเชื่อมต่อ&hellip;', zh: '连接中&hellip;', ja: '接続中&hellip;' },
  'sheet.connect_btn':  { en: 'Connect', th: 'เชื่อมต่อ', zh: '连接', ja: '接続' },
  'sheet.knob_sub':     { en: 'Shifter &middot; gear + feel', th: 'ตัวเปลี่ยนเกียร์ &middot; เกียร์ + ฟีล', zh: '换挡器 &middot; 挡位 + 手感', ja: 'シフター &middot; ギア + フィール' },
  'sheet.gauge_sub':    { en: 'Dash display &middot; OBD', th: 'จอหน้าปัด &middot; OBD', zh: '仪表显示 &middot; OBD', ja: 'ダッシュ表示 &middot; OBD' },
  'sheet.connect_note': { en: 'OBD fault codes &amp; live data read through the Gauge. Devices reconnect on their own next time.', th: 'รหัสปัญหา OBD &amp; ข้อมูลสดอ่านผ่านเกจ อุปกรณ์จะเชื่อมต่อเองในครั้งถัดไป', zh: 'OBD 故障码和实时数据通过仪表读取。设备下次会自动重连。', ja: 'OBD 故障コードとライブデータはゲージ経由で読み取ります。次回はデバイスが自動で再接続します。' },

  // ---- update sheet ----
  'sheet.update_eyebrow': { en: 'Firmware over Bluetooth', th: 'เฟิร์มแวร์ผ่านบลูทูธ', zh: '通过蓝牙更新固件', ja: 'Bluetooth 経由のファームウェア' },
  'sheet.update_title':   { en: 'Device updates', th: 'อัปเดตอุปกรณ์', zh: '设备更新', ja: 'デバイス更新' },
  'sheet.update_btn':     { en: 'Update', th: 'อัปเดต', zh: '更新', ja: '更新' },
  'sheet.update_note':    { en: 'Keep the device powered and the app open during a flash. The OBD module updates through the Gauge.', th: 'ให้อุปกรณ์มีไฟเลี้ยงและเปิดแอปไว้ระหว่างแฟลช โมดูล OBD อัปเดตผ่านเกจ', zh: '刷写时请保持设备供电并打开应用。OBD 模块通过仪表更新。', ja: '書き込み中はデバイスの電源を入れ、アプリを開いたままにしてください。OBD モジュールはゲージ経由で更新します。' },
  'sheet.updating':       { en: 'Updating&hellip;', th: 'กำลังอัปเดต&hellip;', zh: '更新中&hellip;', ja: '更新中&hellip;' },
} satisfies Record<string, Row>;
