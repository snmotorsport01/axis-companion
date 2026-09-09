// MonitorOta page — one-tap firmware update for the AXIS Monitor + sensor.
// Version strings, ESP-NOW, Bluetooth, OBD, .app.bin/.bin stay as data.
import type { Row } from '../i18n';

export default {
  'monota.title':            { en: 'Firmware update', th: 'อัปเดตเฟิร์มแวร์', zh: '固件更新', ja: 'ファームウェア更新' },

  // scan / connect card
  'monota.intro':            { en: 'Keep your gauge and sensor current — one tap installs the latest firmware over Bluetooth. Connect your <b>AXIS Monitor</b> first.', th: 'อัปเดตเกจและเซนเซอร์ให้ทันสมัย — แตะครั้งเดียวติดตั้งเฟิร์มแวร์ล่าสุดผ่าน Bluetooth เชื่อมต่อ <b>AXIS Monitor</b> ก่อน', zh: '让你的仪表和传感器保持最新——一键通过 Bluetooth 安装最新固件。请先连接你的 <b>AXIS Monitor</b>。', ja: 'ゲージとセンサーを最新に保ちましょう — ワンタップで Bluetooth 経由で最新ファームウェアをインストールします。まず <b>AXIS Monitor</b> を接続してください。' },
  'monota.scanning':         { en: 'Scanning…', th: 'กำลังสแกน…', zh: '扫描中…', ja: 'スキャン中…' },
  'monota.scan_btn':         { en: 'Scan for AXIS Monitor', th: 'สแกนหา AXIS Monitor', zh: '扫描 AXIS Monitor', ja: 'AXIS Monitor をスキャン' },
  'monota.connecting':       { en: 'Connecting to monitor…', th: 'กำลังเชื่อมต่อมอนิเตอร์…', zh: '正在连接监视器…', ja: 'モニターに接続中…' },
  'monota.checking_updates': { en: 'Checking for updates…', th: 'กำลังตรวจหาอัปเดต…', zh: '正在检查更新…', ja: '更新を確認中…' },

  // ready card
  'monota.firmware':         { en: 'Firmware', th: 'เฟิร์มแวร์', zh: '固件', ja: 'ファームウェア' },
  'monota.demo':             { en: 'DEMO', th: 'เดโม', zh: '演示', ja: 'デモ' },
  'monota.connected':        { en: 'CONNECTED', th: 'เชื่อมต่อแล้ว', zh: '已连接', ja: '接続済み' },
  'monota.ready_intro':      { en: 'Your phone downloads the update and installs it on the gauge and OBD module automatically.', th: 'โทรศัพท์จะดาวน์โหลดอัปเดตและติดตั้งลงเกจกับโมดูล OBD ให้อัตโนมัติ', zh: '手机会下载更新并自动安装到仪表和 OBD 模块上。', ja: 'スマホが更新をダウンロードし、ゲージと OBD モジュールに自動でインストールします。' },
  'monota.demo_suffix':      { en: ' <b>Demo</b> — connect your AXIS Monitor to install.', th: ' <b>เดโม</b> — เชื่อมต่อ AXIS Monitor เพื่อติดตั้ง', zh: ' <b>演示</b> — 连接 AXIS Monitor 以安装。', ja: ' <b>デモ</b> — インストールするには AXIS Monitor を接続。' },

  // firmware rows
  'monota.row_gauge':        { en: 'Gauge (monitor)', th: 'เกจ (มอนิเตอร์)', zh: '仪表（监视器）', ja: 'ゲージ（モニター）' },
  'monota.row_sensor':       { en: 'Sensor (OBD reader)', th: 'เซนเซอร์ (ตัวอ่าน OBD)', zh: '传感器（OBD 读取器）', ja: 'センサー（OBD リーダー）' },
  'monota.unknown':          { en: 'unknown', th: 'ไม่ทราบ', zh: '未知', ja: '不明' },
  'monota.latest':           { en: 'latest', th: 'ล่าสุด', zh: '最新', ja: '最新' },
  'monota.update':           { en: 'Update', th: 'อัปเดต', zh: '更新', ja: '更新' },
  'monota.reinstall':        { en: 'Reinstall', th: 'ติดตั้งซ้ำ', zh: '重新安装', ja: '再インストール' },

  'monota.checking':         { en: 'Checking…', th: 'กำลังตรวจสอบ…', zh: '检查中…', ja: '確認中…' },
  'monota.check_again':      { en: 'Check again', th: 'ตรวจอีกครั้ง', zh: '再次检查', ja: '再確認' },

  // advanced: local .bin
  'monota.adv_summary':      { en: 'Advanced — install a .bin file', th: 'ขั้นสูง — ติดตั้งไฟล์ .bin', zh: '高级——安装 .bin 文件', ja: '詳細 — .bin ファイルをインストール' },
  'monota.adv_hint':         { en: 'Choose a firmware file and the device to install it on.', th: 'เลือกไฟล์เฟิร์มแวร์และอุปกรณ์ที่จะติดตั้ง', zh: '选择固件文件以及要安装到的设备。', ja: 'ファームウェアファイルとインストール先のデバイスを選択してください。' },
  'monota.opt_sensor':       { en: 'Sensor (node)', th: 'เซนเซอร์ (โหนด)', zh: '传感器（节点）', ja: 'センサー（ノード）' },
  'monota.opt_gauge':        { en: 'Gauge (monitor)', th: 'เกจ (มอนิเตอร์)', zh: '仪表（监视器）', ja: 'ゲージ（モニター）' },
  'monota.flash_file':       { en: 'Flash this file', th: 'แฟลชไฟล์นี้', zh: '刷写此文件', ja: 'このファイルを書き込む' },
  'monota.flashing_pct':     { en: 'Flashing… {pct}%', th: 'กำลังแฟลช… {pct}%', zh: '刷写中… {pct}%', ja: '書き込み中… {pct}%' },

  // status / errors
  'monota.no_monitor':       { en: 'No AXIS Monitor found nearby. Power it on and scan again.', th: 'ไม่พบ AXIS Monitor ในบริเวณใกล้เคียง เปิดเครื่องแล้วสแกนอีกครั้ง', zh: '附近未找到 AXIS Monitor。请开机后重新扫描。', ja: '近くに AXIS Monitor が見つかりません。電源を入れて再スキャンしてください。' },
  'monota.scan_failed':      { en: 'BLE scan failed', th: 'สแกน BLE ล้มเหลว', zh: 'BLE 扫描失败', ja: 'BLE スキャンに失敗しました' },
  'monota.disconnected':     { en: 'Monitor disconnected.', th: 'มอนิเตอร์ตัดการเชื่อมต่อแล้ว', zh: '监视器已断开连接。', ja: 'モニターが切断されました。' },
  'monota.connect_failed':   { en: 'Connect failed', th: 'เชื่อมต่อล้มเหลว', zh: '连接失败', ja: '接続に失敗しました' },
  'monota.load_err':         { en: "Couldn't load updates: {err}", th: 'โหลดอัปเดตไม่สำเร็จ: {err}', zh: '无法加载更新：{err}', ja: '更新を読み込めませんでした: {err}' },
  'monota.demo_install':     { en: 'Demo — connect your AXIS Monitor to install firmware.', th: 'เดโม — เชื่อมต่อ AXIS Monitor เพื่อติดตั้งเฟิร์มแวร์', zh: '演示——连接 AXIS Monitor 以安装固件。', ja: 'デモ — ファームウェアをインストールするには AXIS Monitor を接続してください。' },
  'monota.downloading':      { en: 'Downloading…', th: 'กำลังดาวน์โหลด…', zh: '下载中…', ja: 'ダウンロード中…' },
  'monota.flashing_gauge':   { en: 'Flashing gauge…', th: 'กำลังแฟลชเกจ…', zh: '正在刷写仪表…', ja: 'ゲージを書き込み中…' },
  'monota.flashing_sensor':  { en: 'Flashing sensor…', th: 'กำลังแฟลชเซนเซอร์…', zh: '正在刷写传感器…', ja: 'センサーを書き込み中…' },
  'monota.gauge_updated':    { en: '✓ Gauge updated — rebooting', th: '✓ อัปเดตเกจแล้ว — กำลังรีบูต', zh: '✓ 仪表已更新——正在重启', ja: '✓ ゲージを更新しました — 再起動中' },
  'monota.sensor_updated':   { en: '✓ Sensor updated — rebooting', th: '✓ อัปเดตเซนเซอร์แล้ว — กำลังรีบูต', zh: '✓ 传感器已更新——正在重启', ja: '✓ センサーを更新しました — 再起動中' },
  'monota.flashing':         { en: 'Flashing…', th: 'กำลังแฟลช…', zh: '刷写中…', ja: '書き込み中…' },
  'monota.tap_gauge':        { en: '👆 Tap your gauge to allow the update', th: '👆 แตะที่หน้าจอเกจเพื่ออนุญาตการอัปเดต', zh: '👆 点按你的仪表以允许更新', ja: '👆 ゲージをタップして更新を許可' },
  'monota.flashed':          { en: '✓ flashed — rebooting', th: '✓ แฟลชแล้ว — กำลังรีบูต', zh: '✓ 已刷写——正在重启', ja: '✓ 書き込み完了 — 再起動中' },
} satisfies Record<string, Row>;
