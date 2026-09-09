// Knob firmware (OTA) page. Rune page → actual chars; {@html} for <code>/<strong>.
import type { Row } from '../i18n';

export default {
  'ota.title':             { en: 'Knob firmware', th: 'เฟิร์มแวร์หัวเกียร์', zh: '换挡头固件', ja: 'シフトノブ ファームウェア' },

  // Status / error strings (surfaced via uploadErr / reconnectErr / mErr)
  'ota.cant_check':        { en: "Couldn't check for updates right now.", th: 'ตรวจหาอัปเดตไม่ได้ในตอนนี้', zh: '暂时无法检查更新。', ja: '今は更新を確認できません。' },
  'ota.upload_failed':     { en: 'upload failed', th: 'อัปโหลดล้มเหลว', zh: '上传失败', ja: 'アップロード失敗' },
  'ota.download_failed':   { en: 'Download failed: HTTP {status}', th: 'ดาวน์โหลดล้มเหลว: HTTP {status}', zh: '下载失败：HTTP {status}', ja: 'ダウンロード失敗: HTTP {status}' },
  'ota.install_failed':    { en: 'install failed', th: 'ติดตั้งล้มเหลว', zh: '安装失败', ja: 'インストール失敗' },
  'ota.lost_client':       { en: 'Lost client mid-reconnect', th: 'การเชื่อมต่อหลุดระหว่างเชื่อมต่อใหม่', zh: '重新连接时丢失连接', ja: '再接続中に接続が切れました' },
  'ota.reconnect_failed':  { en: "Couldn't reconnect automatically — open Devices and pair again.", th: 'เชื่อมต่อใหม่อัตโนมัติไม่ได้ — เปิดอุปกรณ์แล้วจับคู่อีกครั้ง', zh: '无法自动重新连接——打开设备并重新配对。', ja: '自動で再接続できませんでした — デバイスを開いて再度ペアリングしてください。' },

  // Release badge status labels
  'ota.status_preview':    { en: 'PREVIEW', th: 'พรีวิว', zh: '预览', ja: 'プレビュー' },
  'ota.status_stable':     { en: 'STABLE', th: 'เสถียร', zh: '稳定版', ja: '安定版' },
  'ota.status_available':  { en: 'AVAILABLE', th: 'พร้อมใช้', zh: '可用', ja: '利用可能' },

  // Current firmware card
  'ota.installed':         { en: 'Installed', th: 'ที่ติดตั้งอยู่', zh: '已安装', ja: 'インストール済み' },
  'ota.build':             { en: 'build {n}', th: 'บิลด์ {n}', zh: '版本 {n}', ja: 'ビルド {n}' },

  // Releases card
  'ota.releases':          { en: 'Releases', th: 'รุ่นที่ปล่อย', zh: '发布版本', ja: 'リリース' },
  'ota.checking':          { en: 'Checking…', th: 'กำลังตรวจ…', zh: '检查中…', ja: '確認中…' },
  'ota.refresh':           { en: 'Refresh', th: 'รีเฟรช', zh: '刷新', ja: '更新' },
  'ota.fetching':          { en: 'Fetching manifest…', th: 'กำลังดึงข้อมูลรุ่น…', zh: '正在获取清单…', ja: 'マニフェストを取得中…' },
  'ota.cant_reach':        { en: "Couldn't reach the update server. Please try again later.", th: 'เข้าถึงเซิร์ฟเวอร์อัปเดตไม่ได้ กรุณาลองใหม่อีกครั้งภายหลัง', zh: '无法连接更新服务器。请稍后再试。', ja: '更新サーバーに接続できません。後でもう一度お試しください。' },
  'ota.update_available':  { en: 'UPDATE AVAILABLE', th: 'มีอัปเดต', zh: '有可用更新', ja: '更新あり' },
  'ota.up_to_date':        { en: 'UP TO DATE', th: 'เป็นเวอร์ชันล่าสุด', zh: '已是最新', ja: '最新です' },

  // Install button + progress
  'ota.downloading':       { en: 'DOWNLOADING', th: 'กำลังดาวน์โหลด', zh: '下载中', ja: 'ダウンロード中' },
  'ota.flashing':          { en: 'INSTALLING', th: 'กำลังติดตั้ง', zh: '安装中', ja: 'インストール中' },
  'ota.preview_usb':       { en: 'Preview build', th: 'รุ่นพรีวิว', zh: '预览版', ja: 'プレビュー版' },
  'ota.already_installed': { en: 'Already installed', th: 'ติดตั้งแล้ว', zh: '已安装', ja: 'インストール済み' },
  'ota.install_update':    { en: 'INSTALL UPDATE', th: 'ติดตั้งอัปเดต', zh: '安装更新', ja: '更新をインストール' },
  'ota.install_n':         { en: 'INSTALL {n}', th: 'ติดตั้ง {n}', zh: '安装 {n}', ja: '{n} をインストール' },
  'ota.downloading_update':{ en: 'Downloading update…', th: 'กำลังดาวน์โหลดอัปเดต…', zh: '正在下载更新…', ja: '更新をダウンロード中…' },
  'ota.installing_keep':   { en: 'Installing — keep the app open, this takes a moment.', th: 'กำลังติดตั้ง — เปิดแอปค้างไว้ อาจใช้เวลาสักครู่', zh: '正在安装——请保持应用打开，这需要一点时间。', ja: 'インストール中 — アプリを開いたままにしてください。少し時間がかかります。' },
  'ota.update_complete':   { en: '✓ Update complete', th: '✓ อัปเดตเสร็จสิ้น', zh: '✓ 更新完成', ja: '✓ 更新完了' },
  'ota.rebooting_in':      { en: 'Device rebooting in {n}s…', th: 'อุปกรณ์จะรีบูตใน {n} วินาที…', zh: '设备将在 {n} 秒后重启…', ja: 'デバイスは {n} 秒後に再起動します…' },
  'ota.reconnecting':      { en: 'Reconnecting to the device…', th: 'กำลังเชื่อมต่อกับอุปกรณ์อีกครั้ง…', zh: '正在重新连接设备…', ja: 'デバイスに再接続中…' },
  'ota.binary_soon':       { en: 'No update is available for this device yet.', th: 'ยังไม่มีอัปเดตสำหรับอุปกรณ์นี้ในตอนนี้', zh: '此设备暂无可用更新。', ja: 'このデバイスに利用可能な更新はまだありません。' },

  // Local upload card ({@html} — contains <code>)
  'ota.local_upload':      { en: 'Local upload', th: 'อัปโหลดจากเครื่อง', zh: '本地上传', ja: 'ローカルアップロード' },
  'ota.local_upload_p':    { en: 'Pick an AXIS firmware file (<code>.bin</code>) and tap UPLOAD. The device will reboot into the new firmware once the transfer is complete.', th: 'เลือกไฟล์เฟิร์มแวร์ AXIS (<code>.bin</code>) แล้วแตะ UPLOAD อุปกรณ์จะรีบูตเข้าสู่เฟิร์มแวร์ใหม่เมื่อถ่ายโอนเสร็จ', zh: '选择一个 AXIS 固件文件 (<code>.bin</code>) 并点击 UPLOAD。传输完成后设备将重启进入新固件。', ja: 'AXIS ファームウェアファイル (<code>.bin</code>) を選んで UPLOAD をタップします。転送が完了するとデバイスは新しいファームウェアで再起動します。' },
  'ota.choose_bin':        { en: 'Choose .bin file', th: 'เลือกไฟล์ .bin', zh: '选择 .bin 文件', ja: '.bin ファイルを選択' },
  'ota.size':              { en: 'Size: {s}', th: 'ขนาด: {s}', zh: '大小：{s}', ja: 'サイズ: {s}' },
  'ota.flashed_rebooting': { en: '✓ Flashed. Device is rebooting…', th: '✓ แฟลชแล้ว อุปกรณ์กำลังรีบูต…', zh: '✓ 已刷写。设备正在重启…', ja: '✓ 書き込み完了。デバイスを再起動中…' },
  'ota.uploading':         { en: 'UPLOADING…', th: 'กำลังอัปโหลด…', zh: '上传中…', ja: 'アップロード中…' },
  'ota.upload_bin':        { en: 'UPLOAD .BIN', th: 'อัปโหลด .BIN', zh: '上传 .BIN', ja: '.BIN をアップロード' },

  // Heads-up card ({@html} — contains <strong>)
  'ota.heads_up':          { en: "<strong>Heads up:</strong> don't power-cycle the device during upload. If the transfer is interrupted, just open this screen again and re-upload — the device falls back to the previous firmware on failure.", th: '<strong>โปรดทราบ:</strong> อย่าปิด-เปิดไฟอุปกรณ์ระหว่างอัปโหลด หากการถ่ายโอนถูกขัดจังหวะ ให้เปิดหน้านี้อีกครั้งแล้วอัปโหลดใหม่ — อุปกรณ์จะย้อนกลับไปใช้เฟิร์มแวร์เดิมเมื่อล้มเหลว', zh: '<strong>注意：</strong>上传期间请勿给设备断电重启。如果传输中断，只需再次打开此界面并重新上传——失败时设备会回退到之前的固件。', ja: '<strong>ご注意:</strong> アップロード中はデバイスの電源を入れ直さないでください。転送が中断された場合は、この画面をもう一度開いて再アップロードしてください — 失敗時、デバイスは以前のファームウェアに戻ります。' },
} satisfies Record<string, Row>;
