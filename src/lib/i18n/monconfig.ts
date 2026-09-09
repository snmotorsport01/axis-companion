// MonitorConfig page — the AXIS Monitor's GaugeCfg editor (pages, layouts,
// per-page arc colour, units, brightness). Layout/face names, channel labels,
// PAGE tags and unit symbols stay as data (English) — see the page component.
import type { Row } from '../i18n';

export default {
  'monconfig.title':        { en: 'Gauge display', th: 'การแสดงผลเกจ', zh: '仪表显示', ja: 'ゲージ表示' },

  // ---- scan / connect ----
  'monconfig.scan_intro':   { en: "Choose what each of the gauge's four pages shows — the readouts, layout and arc colour. Connect your <b>AXIS Monitor</b> first.", th: 'เลือกสิ่งที่แต่ละหน้าทั้งสี่ของเกจจะแสดง — ค่าที่อ่าน เลย์เอาต์ และสีอาร์ค เชื่อมต่อ <b>AXIS Monitor</b> ก่อน', zh: '选择仪表四个页面各自显示的内容——读数、布局和弧形颜色。请先连接你的 <b>AXIS Monitor</b>。', ja: 'ゲージの4つの各ページに表示する内容 — 数値、レイアウト、アークの色 — を選びます。まず <b>AXIS Monitor</b> を接続してください。' },
  'monconfig.scanning':     { en: 'Scanning…', th: 'กำลังสแกน…', zh: '扫描中…', ja: 'スキャン中…' },
  'monconfig.scan_btn':     { en: 'Scan for AXIS Monitor', th: 'สแกนหา AXIS Monitor', zh: '扫描 AXIS Monitor', ja: 'AXIS Monitor をスキャン' },
  'monconfig.connecting':   { en: 'Connecting to monitor…', th: 'กำลังเชื่อมต่อมอนิเตอร์…', zh: '正在连接监视器…', ja: 'モニターに接続中…' },
  'monconfig.reading':      { en: 'Reading gauge display…', th: 'กำลังอ่านการแสดงผลเกจ…', zh: '正在读取仪表显示…', ja: 'ゲージ表示を読み込み中…' },
  'monconfig.no_monitor':   { en: 'No AXIS Monitor found nearby. Power it on and scan again.', th: 'ไม่พบ AXIS Monitor ในบริเวณใกล้เคียง เปิดเครื่องแล้วสแกนอีกครั้ง', zh: '附近未找到 AXIS Monitor。请开机后重新扫描。', ja: '近くに AXIS Monitor が見つかりません。電源を入れてもう一度スキャンしてください。' },
  'monconfig.ble_scan_failed': { en: 'BLE scan failed', th: 'สแกน BLE ล้มเหลว', zh: 'BLE 扫描失败', ja: 'BLE スキャンに失敗しました' },
  'monconfig.mon_disconnected': { en: 'Monitor disconnected.', th: 'มอนิเตอร์ถูกตัดการเชื่อมต่อ', zh: '监视器已断开连接。', ja: 'モニターの接続が切れました。' },
  'monconfig.connect_failed':  { en: 'Connect failed', th: 'เชื่อมต่อล้มเหลว', zh: '连接失败', ja: '接続に失敗しました' },
  'monconfig.reading_failed':  { en: 'Reading config failed', th: 'อ่านการตั้งค่าล้มเหลว', zh: '读取配置失败', ja: '設定の読み込みに失敗しました' },

  // ---- ready header ----
  'monconfig.demo':         { en: 'DEMO', th: 'เดโม', zh: '演示', ja: 'デモ' },
  'monconfig.connected':    { en: 'CONNECTED', th: 'เชื่อมต่อแล้ว', zh: '已连接', ja: '接続済み' },
  'monconfig.ready_intro':  { en: 'Each page is one screen on the gauge — pick its layout, its readouts and its arc colour.', th: 'แต่ละหน้าคือหนึ่งหน้าจอบนเกจ — เลือกเลย์เอาต์ ค่าที่อ่าน และสีอาร์คของหน้านั้น', zh: '每个页面就是仪表上的一屏——选择它的布局、读数和弧形颜色。', ja: '各ページはゲージ上の1画面です — そのレイアウト、数値、アークの色を選びます。' },
  'monconfig.demo_suffix':  { en: ' <b>Demo</b> — connect your AXIS Monitor to save.', th: ' <b>เดโม</b> — เชื่อมต่อ AXIS Monitor เพื่อบันทึก', zh: ' <b>演示</b> — 连接 AXIS Monitor 以保存。', ja: ' <b>デモ</b> — 保存するには AXIS Monitor を接続。' },

  // ---- colour swatches ----
  'monconfig.arc_colour':          { en: 'Arc colour', th: 'สีอาร์ค', zh: '弧形颜色', ja: 'アークの色' },
  'monconfig.long_needle_colour':  { en: 'Long-needle colour', th: 'สีเข็มยาว', zh: '长指针颜色', ja: '長針の色' },
  'monconfig.short_needle_colour': { en: 'Short-needle colour', th: 'สีเข็มสั้น', zh: '短指针颜色', ja: '短針の色' },
  'monconfig.tick2_colour':        { en: '2nd-value tick colour', th: 'สีขีดค่าที่สอง', zh: '第二数值刻度颜色', ja: '2番目の値の目盛りの色' },
  'monconfig.text_colour':         { en: 'Text colour', th: 'สีข้อความ', zh: '文字颜色', ja: '文字の色' },
  'monconfig.arc_colour_for':      { en: 'Arc colour for {name}', th: 'สีอาร์คสำหรับ {name}', zh: '{name} 的弧形颜色', ja: '{name} のアークの色' },
  'monconfig.second_needle_colour_for': { en: 'Second needle colour for {name}', th: 'สีเข็มที่สองสำหรับ {name}', zh: '{name} 的第二指针颜色', ja: '{name} の2番目の針の色' },
  'monconfig.text_colour_for':     { en: 'Text colour for {name}', th: 'สีข้อความสำหรับ {name}', zh: '{name} 的文字颜色', ja: '{name} の文字の色' },
  'monconfig.layout':              { en: 'Layout', th: 'เลย์เอาต์', zh: '布局', ja: 'レイアウト' },

  // ---- slot labels (per layout) ----
  'monconfig.slot_lit_ticks':    { en: 'Lit ticks', th: 'ขีดที่สว่าง', zh: '点亮的刻度', ja: '点灯目盛り' },
  'monconfig.slot_outer_tick':   { en: 'Outer tick (2nd value)', th: 'ขีดนอก (ค่าที่ 2)', zh: '外圈刻度（第 2 数值）', ja: '外側の目盛り（2番目の値）' },
  'monconfig.slot_long_needle':  { en: 'Long needle', th: 'เข็มยาว', zh: '长指针', ja: '長針' },
  'monconfig.slot_short_needle': { en: 'Short needle', th: 'เข็มสั้น', zh: '短指针', ja: '短針' },
  'monconfig.slot_big_value':    { en: 'Big value', th: 'ค่าหลัก', zh: '主数值', ja: '大きな値' },
  'monconfig.slot_support':      { en: 'Support {n}', th: 'ค่ารอง {n}', zh: '辅助 {n}', ja: 'サポート {n}' },
  'monconfig.slot_rpm_dot':      { en: 'RPM dot (tacho)', th: 'จุด RPM (วัดรอบ)', zh: 'RPM 点（转速表）', ja: 'RPM ドット（タコ）' },
  'monconfig.slot_energy_arc':   { en: 'Energy arc', th: 'อาร์คพลังงาน', zh: '能量弧', ja: 'エネルギーアーク' },
  'monconfig.slot_readout_main': { en: 'Readout — main', th: 'ค่าที่อ่าน — หลัก', zh: '读数 — 主', ja: '数値 — メイン' },
  'monconfig.slot_readout_sub':  { en: 'Readout — sub', th: 'ค่าที่อ่าน — รอง', zh: '读数 — 次', ja: '数値 — サブ' },
  'monconfig.slot_generic':      { en: 'Slot {n}', th: 'ช่อง {n}', zh: '插槽 {n}', ja: 'スロット {n}' },
  'monconfig.slot_needle_value': { en: 'Needle + value', th: 'เข็ม + ค่า', zh: '指针 + 数值', ja: '針 + 値' },
  'monconfig.slot_main_dial':    { en: 'Main dial', th: 'หน้าปัดหลัก', zh: '主表盘', ja: 'メインダイヤル' },
  'monconfig.slot_sub_dial':     { en: 'Sub-dial', th: 'หน้าปัดย่อย', zh: '子表盘', ja: 'サブダイヤル' },
  'monconfig.slot_bar':          { en: 'Bar {n}', th: 'แถบ {n}', zh: '条 {n}', ja: 'バー {n}' },
  'monconfig.slot_arc':          { en: 'Arc {n}', th: 'อาร์ค {n}', zh: '弧 {n}', ja: 'アーク {n}' },

  // ---- channel select / peak ----
  'monconfig.empty_option':   { en: '— empty —', th: '— ว่าง —', zh: '— 空 —', ja: '— なし —' },
  'monconfig.peak_redline':   { en: 'Peak / redline', th: 'พีค / เรดไลน์', zh: '峰值 / 红线', ja: 'ピーク / レッドライン' },
  'monconfig.zero_off':       { en: '0 = off', th: '0 = ปิด', zh: '0 = 关闭', ja: '0 = オフ' },
  'monconfig.off':            { en: 'off', th: 'ปิด', zh: '关闭', ja: 'オフ' },
  'monconfig.shift_light':    { en: 'Shift light', th: 'ไฟเปลี่ยนเกียร์', zh: '换挡灯', ja: 'シフトライト' },
  'monconfig.rpm_zero_off':   { en: 'RPM · 0 = off', th: 'RPM · 0 = ปิด', zh: 'RPM · 0 = 关闭', ja: 'RPM · 0 = オフ' },

  // ---- units ----
  'monconfig.units':      { en: 'Units', th: 'หน่วย', zh: '单位', ja: '単位' },
  'monconfig.metric':     { en: 'Metric', th: 'เมตริก', zh: '公制', ja: 'メートル法' },
  'monconfig.imperial':   { en: 'Imperial', th: 'อิมพีเรียล', zh: '英制', ja: 'ヤード・ポンド法' },

  // ---- pages / brightness ----
  'monconfig.remove_page':       { en: 'Remove page', th: 'ลบหน้า', zh: '删除页面', ja: 'ページを削除' },
  'monconfig.add_page':          { en: 'Add page', th: 'เพิ่มหน้า', zh: '添加页面', ja: 'ページを追加' },
  'monconfig.pages_one':         { en: '{n} page', th: '{n} หน้า', zh: '{n} 页', ja: '{n} ページ' },
  'monconfig.pages_other':       { en: '{n} pages', th: '{n} หน้า', zh: '{n} 页', ja: '{n} ページ' },
  'monconfig.screen_brightness': { en: 'Screen brightness', th: 'ความสว่างหน้าจอ', zh: '屏幕亮度', ja: '画面の明るさ' },

  // ---- save ----
  'monconfig.saving':            { en: 'Saving…', th: 'กำลังบันทึก…', zh: '保存中…', ja: '保存中…' },
  'monconfig.save_btn':          { en: 'Save to monitor', th: 'บันทึกไปที่มอนิเตอร์', zh: '保存到监视器', ja: 'モニターに保存' },
  'monconfig.saving_to_monitor': { en: 'Saving to the monitor…', th: 'กำลังบันทึกไปที่มอนิเตอร์…', zh: '正在保存到监视器…', ja: 'モニターに保存中…' },
  'monconfig.demo_save_note':    { en: 'Demo — connect your AXIS Monitor to save the gauge display.', th: 'เดโม — เชื่อมต่อ AXIS Monitor เพื่อบันทึกการแสดงผลเกจ', zh: '演示 — 连接你的 AXIS Monitor 以保存仪表显示。', ja: 'デモ — ゲージ表示を保存するには AXIS Monitor を接続してください。' },
  'monconfig.out_of_range':      { en: '✗ Some values are out of range — check the peak fields.', th: '✗ ค่าบางค่าเกินช่วงที่กำหนด — ตรวจสอบช่องพีค', zh: '✗ 部分数值超出范围 — 请检查峰值字段。', ja: '✗ 一部の値が範囲外です — ピーク欄を確認してください。' },
  'monconfig.saved_ok':          { en: '✓ Saved. Your gauge display is updated.', th: '✓ บันทึกแล้ว การแสดงผลเกจของคุณอัปเดตแล้ว', zh: '✓ 已保存。你的仪表显示已更新。', ja: '✓ 保存しました。ゲージ表示が更新されました。' },
  'monconfig.save_failed':       { en: 'Save failed', th: 'บันทึกล้มเหลว', zh: '保存失败', ja: '保存に失敗しました' },
} satisfies Record<string, Row>;
