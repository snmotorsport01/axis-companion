// Screensaver upload page. One namespace file; auto-merged by lib/i18n.ts via
// import.meta.glob. en = source/fallback. AXIS / Bluetooth / GIF / 4K / KB /
// fps kept verbatim across languages.
import type { Row } from '../i18n';

export default {
  // ---- header / intro ----
  'saver.title':   { en: 'Screensaver', th: 'สกรีนเซฟเวอร์', zh: '屏保', ja: 'スクリーンセーバー' },
  'saver.back_looks': { en: '‹ LOOKS', th: '‹ สไตล์', zh: '‹ 外观', ja: '‹ 外観' },
  'saver.loading': { en: 'Loading…', th: 'กำลังโหลด…', zh: '加载中…', ja: '読み込み中…' },
  'saver.intro': {
    en: 'Pick a photo, GIF or short video to play while your AXIS rests. It shows when the screen sleeps.',
    th: 'เลือกรูปภาพ GIF หรือวิดีโอสั้น ๆ ให้เล่นตอน AXIS ของคุณพัก จะแสดงเมื่อหน้าจอเข้าสู่โหมดพัก',
    zh: '选择一张照片、GIF 或短视频，在 AXIS 休息时播放。屏幕休眠时会显示。',
    ja: '写真、GIF、短い動画を選ぶと、AXIS の休止中に再生されます。画面がスリープすると表示されます。',
  },

  // ---- preview placeholder ----
  'saver.prev_loaded': {
    en: 'A screensaver is loaded on your AXIS',
    th: 'มีสกรีนเซฟเวอร์โหลดอยู่บน AXIS ของคุณแล้ว',
    zh: '你的 AXIS 上已加载屏保',
    ja: 'AXIS にスクリーンセーバーが読み込まれています',
  },
  'saver.prev_none': {
    en: 'Nothing picked yet',
    th: 'ยังไม่ได้เลือกอะไร',
    zh: '尚未选择任何内容',
    ja: 'まだ何も選ばれていません',
  },

  // ---- file picker ----
  'saver.file_choose': {
    en: 'Choose a photo, GIF or video',
    th: 'เลือกรูปภาพ GIF หรือวิดีโอ',
    zh: '选择照片、GIF 或视频',
    ja: '写真、GIF、動画を選ぶ',
  },

  // ---- quality chips ----
  'saver.quality':       { en: 'Quality', th: 'คุณภาพ', zh: '质量', ja: '画質' },
  'saver.chip_best':     { en: 'Best', th: 'ดีที่สุด', zh: '最佳', ja: '最高' },
  'saver.chip_balanced': { en: 'Balanced', th: 'สมดุล', zh: '均衡', ja: 'バランス' },
  'saver.chip_smaller':  { en: 'Smaller', th: 'เล็กกว่า', zh: '更小', ja: '小さめ' },
  'saver.hint_repick': {
    en: 'Re-pick the file to apply a new quality.',
    th: 'เลือกไฟล์ใหม่อีกครั้งเพื่อใช้คุณภาพใหม่',
    zh: '重新选择文件以应用新的质量设置。',
    ja: '新しい画質を適用するには、ファイルを選び直してください。',
  },
  'saver.hint_default': {
    en: 'Smaller files send faster over Bluetooth. Photos & video up to 4K work — AXIS shrinks them to fit.',
    th: 'ไฟล์ที่เล็กกว่าจะส่งผ่าน Bluetooth ได้เร็วกว่า รองรับรูปภาพและวิดีโอสูงสุด 4K — AXIS จะย่อขนาดให้พอดี',
    zh: '较小的文件通过 Bluetooth 发送更快。支持最高 4K 的照片和视频 — AXIS 会将其缩小以适配。',
    ja: 'ファイルが小さいほど Bluetooth での送信が速くなります。最大 4K の写真と動画に対応 — AXIS がサイズを調整します。',
  },

  // ---- progress ----
  'saver.sending': {
    en: 'Sending… {pct}%',
    th: 'กำลังส่ง… {pct}%',
    zh: '正在发送… {pct}%',
    ja: '送信中… {pct}%',
  },

  // ---- action buttons ----
  'saver.remove':    { en: 'Remove', th: 'ลบ', zh: '移除', ja: '削除' },
  'saver.save_copy': { en: 'Save a copy', th: 'บันทึกสำเนา', zh: '保存副本', ja: 'コピーを保存' },
  'saver.adding':    { en: 'Adding…', th: 'กำลังเพิ่ม…', zh: '正在添加…', ja: '追加中…' },
  'saver.add':       { en: 'Add to my AXIS', th: 'เพิ่มลง AXIS ของฉัน', zh: '添加到我的 AXIS', ja: 'AXIS に追加' },

  // ---- tips ----
  'saver.tips_summary': {
    en: 'Tips for the best loop',
    th: 'เคล็ดลับสำหรับลูปที่ดีที่สุด',
    zh: '获得最佳循环的小技巧',
    ja: '最適なループのコツ',
  },
  'saver.tip_gif': {
    en: "GIFs usually look best — they're made to loop.",
    th: 'GIF มักจะดูดีที่สุด — เพราะออกแบบมาให้วนซ้ำ',
    zh: 'GIF 通常效果最好 — 它们本就是为循环而生的。',
    ja: 'GIF が一番きれいに見えることが多いです — ループ用に作られているためです。',
  },
  'saver.tip_video': {
    en: 'Videos are auto-sampled into a short smooth loop.',
    th: 'วิดีโอจะถูกสุ่มตัวอย่างอัตโนมัติให้เป็นลูปสั้น ๆ ที่ลื่นไหล',
    zh: '视频会被自动采样成一段流畅的短循环。',
    ja: '動画は自動でサンプリングされ、短くなめらかなループになります。',
  },
  'saver.tip_size': {
    en: 'Any size up to 4K works; big files just take longer the first time.',
    th: 'รองรับทุกขนาดสูงสุด 4K ไฟล์ใหญ่แค่ใช้เวลานานขึ้นในครั้งแรก',
    zh: '支持最高 4K 的任意尺寸；大文件只是第一次处理时更耗时。',
    ja: '最大 4K までどんなサイズでも使えます。大きいファイルは初回だけ時間がかかります。',
  },
  'saver.tip_cut': {
    en: 'Avoid an abrupt cut right at the end of a clip.',
    th: 'หลีกเลี่ยงการตัดจบแบบกะทันหันตอนท้ายคลิป',
    zh: '避免在片段末尾出现突兀的剪切。',
    ja: 'クリップの終わりで急に切れないようにしましょう。',
  },

  // ---- status / encode messages ----
  'saver.msg_decode_gif':   { en: 'Decoding GIF…', th: 'กำลังถอดรหัส GIF…', zh: '正在解码 GIF…', ja: 'GIF をデコード中…' },
  'saver.msg_extract':      { en: 'Extracting frames…', th: 'กำลังดึงเฟรม…', zh: '正在提取帧…', ja: 'フレームを抽出中…' },
  'saver.msg_optimise':     { en: 'Optimising colours…', th: 'กำลังปรับแต่งสี…', zh: '正在优化颜色…', ja: '色を最適化中…' },
  'saver.msg_encoding_gif': { en: 'Encoding GIF…', th: 'กำลังเข้ารหัส GIF…', zh: '正在编码 GIF…', ja: 'GIF をエンコード中…' },
  'saver.msg_compress_vid': {
    en: 'Compressing video to GIF…',
    th: 'กำลังบีบอัดวิดีโอเป็น GIF…',
    zh: '正在将视频压缩为 GIF…',
    ja: '動画を GIF に圧縮中…',
  },
  'saver.msg_reencode': {
    en: 'Re-encoding GIF as screensaver…',
    th: 'กำลังเข้ารหัส GIF ใหม่เป็นสกรีนเซฟเวอร์…',
    zh: '正在将 GIF 重新编码为屏保…',
    ja: 'GIF をスクリーンセーバーとして再エンコード中…',
  },

  // quality labels shown inside the encode message
  'saver.label_high':   { en: 'HIGH', th: 'สูง', zh: '高', ja: '高' },
  'saver.label_medium': { en: 'MEDIUM', th: 'กลาง', zh: '中', ja: '中' },
  'saver.label_low':    { en: 'LOW', th: 'ต่ำ', zh: '低', ja: '低' },
  'saver.q_best_quality': { en: 'best quality', th: 'คุณภาพดีที่สุด', zh: '最佳质量', ja: '最高画質' },
  'saver.q_compressed':   { en: 'compressed', th: 'บีบอัด', zh: '已压缩', ja: '圧縮' },

  'saver.enc_gif': {
    en: '{kb} KB · animated GIF (seamless loop)',
    th: '{kb} KB · GIF เคลื่อนไหว (ลูปไร้รอยต่อ)',
    zh: '{kb} KB · 动态 GIF（无缝循环）',
    ja: '{kb} KB · アニメーション GIF（シームレスループ）',
  },
  'saver.enc_video': {
    en: '{kb} KB · {frames} frames @ {fps} fps · {label}',
    th: '{kb} KB · {frames} เฟรม @ {fps} fps · {label}',
    zh: '{kb} KB · {frames} 帧 @ {fps} fps · {label}',
    ja: '{kb} KB · {frames} フレーム @ {fps} fps · {label}',
  },
  'saver.enc_still': {
    en: '{kb} KB · still image · {q}',
    th: '{kb} KB · ภาพนิ่ง · {q}',
    zh: '{kb} KB · 静态图片 · {q}',
    ja: '{kb} KB · 静止画 · {q}',
  },
  'saver.enc_downloaded': {
    en: '{kb} KB · downloaded',
    th: '{kb} KB · ดาวน์โหลดแล้ว',
    zh: '{kb} KB · 已下载',
    ja: '{kb} KB · ダウンロード完了',
  },
  'saver.enc_compressed_ready': {
    en: '{kb} KB · from {gifKb} KB GIF · ready to upload',
    th: '{kb} KB · จาก GIF {gifKb} KB · พร้อมอัปโหลด',
    zh: '{kb} KB · 来自 {gifKb} KB GIF · 可以上传',
    ja: '{kb} KB · {gifKb} KB GIF から · アップロード準備完了',
  },

  // ---- errors / confirms ----
  'saver.err_zero_byte': {
    en: 'This file appears to be 0 bytes. If it has an iCloud ⬇ badge in Photos, your phone needs internet to download it first before AXIS can read the bytes.',
    th: 'ไฟล์นี้ดูเหมือนจะมีขนาด 0 ไบต์ หากมีไอคอน iCloud ⬇ ในแอปรูปภาพ โทรศัพท์ของคุณต้องเชื่อมต่ออินเทอร์เน็ตเพื่อดาวน์โหลดไฟล์ก่อน AXIS จึงจะอ่านข้อมูลได้',
    zh: '此文件似乎为 0 字节。如果它在照片中带有 iCloud ⬇ 标记，你的手机需要先联网下载，AXIS 才能读取数据。',
    ja: 'このファイルは 0 バイトのようです。写真アプリで iCloud ⬇ バッジが付いている場合、AXIS がデータを読み取る前に、スマートフォンをインターネットに接続してダウンロードする必要があります。',
  },
  'saver.err_conversion': {
    en: 'conversion failed', th: 'แปลงไฟล์ไม่สำเร็จ', zh: '转换失败', ja: '変換に失敗しました',
  },
  'saver.err_icloud_append': {
    en: '\n\nIf this is an iCloud photo, your phone needs internet to download it before AXIS can read it.',
    th: '\n\nหากนี่คือรูปภาพจาก iCloud โทรศัพท์ของคุณต้องเชื่อมต่ออินเทอร์เน็ตเพื่อดาวน์โหลดก่อน AXIS จึงจะอ่านได้',
    zh: '\n\n如果这是 iCloud 照片，你的手机需要联网下载后，AXIS 才能读取。',
    ja: '\n\nこれが iCloud の写真の場合、AXIS が読み取る前に、スマートフォンをインターネットに接続してダウンロードする必要があります。',
  },
  'saver.err_device_load': {
    en: "Device couldn't load the file: {detail}",
    th: 'อุปกรณ์โหลดไฟล์ไม่ได้: {detail}',
    zh: '设备无法加载文件：{detail}',
    ja: 'デバイスがファイルを読み込めませんでした: {detail}',
  },
  'saver.err_upload': {
    en: 'upload failed', th: 'อัปโหลดไม่สำเร็จ', zh: '上传失败', ja: 'アップロードに失敗しました',
  },
  'saver.err_clear': {
    en: 'clear failed', th: 'ล้างข้อมูลไม่สำเร็จ', zh: '清除失败', ja: 'クリアに失敗しました',
  },
  'saver.confirm_remove': {
    en: 'Remove the screensaver from the device?',
    th: 'ลบสกรีนเซฟเวอร์ออกจากอุปกรณ์หรือไม่',
    zh: '要从设备上移除屏保吗？',
    ja: 'デバイスからスクリーンセーバーを削除しますか？',
  },
  'saver.err_save_video_only': {
    en: 'Save as GIF only works for video sources.',
    th: 'บันทึกเป็น GIF ใช้ได้กับไฟล์วิดีโอเท่านั้น',
    zh: '保存为 GIF 仅适用于视频来源。',
    ja: 'GIF として保存できるのは動画ソースのみです。',
  },
  'saver.err_gif_export': {
    en: 'GIF export failed', th: 'ส่งออก GIF ไม่สำเร็จ', zh: 'GIF 导出失败', ja: 'GIF の書き出しに失敗しました',
  },
  'saver.err_compress_video_only': {
    en: 'Compress to GIF only works for video sources.',
    th: 'บีบอัดเป็น GIF ใช้ได้กับไฟล์วิดีโอเท่านั้น',
    zh: '压缩为 GIF 仅适用于视频来源。',
    ja: 'GIF への圧縮ができるのは動画ソースのみです。',
  },
  'saver.err_compression': {
    en: 'compression failed', th: 'บีบอัดไม่สำเร็จ', zh: '压缩失败', ja: '圧縮に失敗しました',
  },
} satisfies Record<string, Row>;
