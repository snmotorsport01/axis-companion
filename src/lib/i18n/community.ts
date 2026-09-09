// Community / Leaderboards page. Run-kind labels (0-100, 60ft…) stay as-is.
import type { Row } from '../i18n';

export default {
  'community.title':      { en: 'Community', th: 'คอมมูนิตี้', zh: '社区', ja: 'コミュニティ' },
  'community.sub':        { en: 'Leaderboards · your car, your times', th: 'กระดานผู้นำ · รถคุณ เวลาคุณ', zh: '排行榜 · 你的车，你的成绩', ja: 'リーダーボード · あなたの車、あなたのタイム' },
  'community.loading':    { en: 'Loading…', th: 'กำลังโหลด…', zh: '加载中…', ja: '読み込み中…' },

  // auth
  'community.auth_intro': { en: 'Browse the boards freely. Sign in to post your times and climb the rankings.', th: 'ดูกระดานได้อิสระ เข้าสู่ระบบเพื่อโพสต์เวลาและไต่อันดับ', zh: '自由浏览排行榜。登录后即可发布成绩并冲榜。', ja: 'ボードは自由に閲覧できます。ログインしてタイムを投稿し、ランキングを上げましょう。' },
  'community.ph_password':{ en: 'password (6+ chars)', th: 'รหัสผ่าน (6+ ตัว)', zh: '密码（6+ 位）', ja: 'パスワード（6文字以上）' },
  'community.continue':   { en: 'Continue', th: 'ดำเนินต่อ', zh: '继续', ja: '続ける' },
  'community.new_here':   { en: 'New here? Just pick a password — your account is created automatically.', th: 'มาใหม่? แค่ตั้งรหัสผ่าน — ระบบสร้างบัญชีให้อัตโนมัติ', zh: '新用户？直接设置密码——账户会自动创建。', ja: '初めての方？パスワードを決めるだけ — アカウントは自動で作成されます。' },
  'community.forgot':     { en: 'Forgot password?', th: 'ลืมรหัสผ่าน?', zh: '忘记密码？', ja: 'パスワードをお忘れですか？' },

  // recovery
  'community.recovery_intro': { en: 'Set a new password for your account.', th: 'ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ', zh: '为你的账户设置新密码。', ja: 'アカウントの新しいパスワードを設定します。' },
  'community.ph_newpass':     { en: 'new password (6+ chars)', th: 'รหัสผ่านใหม่ (6+ ตัว)', zh: '新密码（6+ 位）', ja: '新しいパスワード（6文字以上）' },
  'community.save_newpass':   { en: 'Save new password', th: 'บันทึกรหัสผ่านใหม่', zh: '保存新密码', ja: '新しいパスワードを保存' },

  // profile
  'community.profile_intro': { en: 'One-time setup.', th: 'ตั้งค่าครั้งเดียว', zh: '一次性设置。', ja: '初回のみの設定。' },
  'community.handle':        { en: 'Handle', th: 'ชื่อผู้ใช้', zh: '昵称', ja: 'ハンドル名' },
  'community.your_car':      { en: 'Your car', th: 'รถของคุณ', zh: '你的车', ja: 'あなたの車' },
  'community.consent':       { en: 'Send me AXIS news & promotions', th: 'ส่งข่าวสาร & โปรโมชัน AXIS ให้ฉัน', zh: '向我发送 AXIS 新闻和促销', ja: 'AXIS のニュースやプロモーションを受け取る' },
  'community.save_continue': { en: 'Save & continue', th: 'บันทึก & ดำเนินต่อ', zh: '保存并继续', ja: '保存して続ける' },

  // ready
  'community.signed_in_as':  { en: 'Signed in as', th: 'เข้าสู่ระบบเป็น', zh: '已登录为', ja: 'ログイン中：' },
  'community.sign_out':      { en: 'sign out', th: 'ออกจากระบบ', zh: '退出登录', ja: 'ログアウト' },
  'community.your_best':     { en: 'Your best times', th: 'เวลาที่ดีที่สุดของคุณ', zh: '你的最佳成绩', ja: 'あなたのベストタイム' },
  'community.refresh':       { en: 'refresh', th: 'รีเฟรช', zh: '刷新', ja: '更新' },
  'community.connect_gauge': { en: 'Connect your gauge (AXIS tab) to pull your saved times automatically.', th: 'เชื่อมต่อเกจ (แท็บ AXIS) เพื่อดึงเวลาที่บันทึกไว้อัตโนมัติ', zh: '连接你的仪表（AXIS 标签页）以自动获取已保存的成绩。', ja: 'ゲージ（AXIS タブ）を接続すると、保存済みのタイムを自動で取得します。' },
  'community.reading':       { en: 'Reading times from your gauge…', th: 'กำลังอ่านเวลาจากเกจ…', zh: '正在从仪表读取成绩…', ja: 'ゲージからタイムを読み取り中…' },
  'community.no_runs':       { en: 'No saved runs yet — do an acceleration run on your gauge, then come back.', th: 'ยังไม่มีการวิ่งที่บันทึกไว้ — ลองวิ่งจับเวลาบนเกจ แล้วกลับมาใหม่', zh: '还没有保存的记录——先在仪表上做一次加速跑，然后回来。', ja: 'まだ保存された走行がありません — ゲージで加速走行をしてから戻ってください。' },
  'community.post':          { en: 'Post to leaderboard', th: 'โพสต์ขึ้นกระดาน', zh: '发布到排行榜', ja: 'リーダーボードに投稿' },
  'community.posting':       { en: 'Posting…', th: 'กำลังโพสต์…', zh: '发布中…', ja: '投稿中…' },
  'community.leaderboard':   { en: 'Leaderboard', th: 'กระดานผู้นำ', zh: '排行榜', ja: 'リーダーボード' },
  'community.no_times':      { en: 'No {label} times yet — be the first!', th: 'ยังไม่มีเวลา {label} — เป็นคนแรกเลย!', zh: '还没有 {label} 成绩——来当第一个吧！', ja: 'まだ {label} のタイムがありません — 一番乗りしよう！' },
  'community.no_times_car':  { en: 'No {label} times yet for {car} — be the first!', th: 'ยังไม่มีเวลา {label} สำหรับ {car} — เป็นคนแรกเลย!', zh: '{car} 还没有 {label} 成绩——来当第一个吧！', ja: '{car} の {label} タイムはまだありません — 一番乗りしよう！' },

  // account
  'community.delete_account':{ en: 'Delete my account', th: 'ลบบัญชีของฉัน', zh: '删除我的账户', ja: 'アカウントを削除' },
  'community.delete_warn':   { en: 'This permanently deletes your account and removes all your posted times. This can’t be undone.', th: 'จะลบบัญชีและเวลาที่โพสต์ทั้งหมดถาวร ย้อนกลับไม่ได้', zh: '这将永久删除你的账户并移除你发布的所有成绩。此操作无法撤销。', ja: 'アカウントと投稿したすべてのタイムを完全に削除します。元に戻せません。' },
  'community.delete_confirm':{ en: 'Delete permanently', th: 'ลบถาวร', zh: '永久删除', ja: '完全に削除' },
  'community.deleting':      { en: 'Deleting…', th: 'กำลังลบ…', zh: '删除中…', ja: '削除中…' },
  'community.cancel':        { en: 'Cancel', th: 'ยกเลิก', zh: '取消', ja: 'キャンセル' },

  // script messages
  'community.err_pass6':     { en: 'Password must be at least 6 characters', th: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว', zh: '密码至少需要 6 个字符', ja: 'パスワードは6文字以上必要です' },
  'community.err_email':     { en: 'Enter your email first', th: 'ใส่อีเมลก่อน', zh: '请先输入你的邮箱', ja: 'まずメールアドレスを入力してください' },
  'community.err_handle':    { en: 'Pick a handle (2+ chars)', th: 'ตั้งชื่อผู้ใช้ (2+ ตัว)', zh: '请设置昵称（2+ 字符）', ja: 'ハンドル名を決めてください（2文字以上）' },
  'community.info_pass_upd': { en: 'Password updated.', th: 'อัปเดตรหัสผ่านแล้ว', zh: '密码已更新。', ja: 'パスワードを更新しました。' },
  'community.info_reset':    { en: 'Password-reset link sent to {email}. Open it on this device to set a new password.', th: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ {email} แล้ว เปิดบนเครื่องนี้เพื่อตั้งรหัสใหม่', zh: '密码重置链接已发送至 {email}。在本设备上打开以设置新密码。', ja: 'パスワード再設定リンクを {email} に送信しました。このデバイスで開いて新しいパスワードを設定してください。' },
  'community.info_posted':   { en: 'Posted {label} {time}!', th: 'โพสต์ {label} {time} แล้ว!', zh: '已发布 {label} {time}！', ja: '{label} {time} を投稿しました！' },
  'community.info_deleted':  { en: 'Your account and all your times have been deleted.', th: 'ลบบัญชีและเวลาทั้งหมดของคุณแล้ว', zh: '你的账户和所有成绩已被删除。', ja: 'アカウントとすべてのタイムを削除しました。' },
} satisfies Record<string, Row>;
