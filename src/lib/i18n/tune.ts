// Fine-tuning (Tune) page. Rune page → t() renders as TEXT, use actual chars.
import type { Row } from '../i18n';

export default {
  'tune.title':   { en: 'Fine-tuning', th: 'ปรับจูนละเอียด', zh: '精细调校', ja: 'ファインチューニング' },
  'tune.loading': { en: 'Loading…', th: 'กำลังโหลด…', zh: '加载中…', ja: '読み込み中…' },

  // Shown when no knob is paired (connect prompt instead of an endless spinner)
  'tune.connect_title':   { en: 'Connect your Knob', th: 'เชื่อมต่อหัวเกียร์', zh: '连接你的换挡头', ja: 'シフトノブを接続' },
  'tune.connect_body':    { en: 'Connect your knob to fine-tune the feel — shift response, sensitivity, brightness and more.', th: 'เชื่อมต่อหัวเกียร์เพื่อปรับความรู้สึกในการใช้งาน — การตอบสนองการเปลี่ยนเกียร์ ความไว ความสว่าง และอื่นๆ', zh: '连接你的换挡头以精细调校手感——换挡响应、灵敏度、亮度等。', ja: 'シフトノブを接続してフィーリングを微調整 — シフト応答、感度、明るさなど。' },
  'tune.back_to_connect': { en: '← Back to connect', th: '← กลับไปเชื่อมต่อ', zh: '← 返回连接', ja: '← 接続に戻る' },
  'tune.def':     { en: 'def {v}', th: 'ค่าเริ่มต้น {v}', zh: '默认 {v}', ja: '既定 {v}' },

  // action buttons + confirm
  'tune.reset':   { en: 'RESET DEFAULTS', th: 'รีเซ็ตค่าเริ่มต้น', zh: '恢复默认', ja: 'デフォルトに戻す' },
  'tune.saving':  { en: 'SAVING…', th: 'กำลังบันทึก…', zh: '保存中…', ja: '保存中…' },
  'tune.save':    { en: 'SAVE', th: 'บันทึก', zh: '保存', ja: '保存' },
  'tune.saved':   { en: 'SAVED', th: 'บันทึกแล้ว', zh: '已保存', ja: '保存済み' },
  'tune.reset_confirm': {
    en: 'Restore all values to firmware defaults? (not saved until you tap SAVE)',
    th: 'คืนค่าทั้งหมดเป็นค่าเริ่มต้นของเฟิร์มแวร์? (ยังไม่บันทึกจนกว่าจะกดบันทึก)',
    zh: '将所有值恢复为固件默认值？（点击"保存"前不会保存）',
    ja: 'すべての値をファームウェアのデフォルトに戻しますか？（保存をタップするまで保存されません）',
  },

  // error fallbacks
  'tune.err_load':  { en: 'load failed', th: 'โหลดไม่สำเร็จ', zh: '加载失败', ja: '読み込みに失敗しました' },
  'tune.err_apply': { en: 'apply failed', th: 'ใช้ค่าไม่สำเร็จ', zh: '应用失败', ja: '適用に失敗しました' },
  'tune.err_save':  { en: 'save failed', th: 'บันทึกไม่สำเร็จ', zh: '保存失败', ja: '保存に失敗しました' },
  'tune.err_reset': { en: 'reset failed', th: 'รีเซ็ตไม่สำเร็จ', zh: '重置失败', ja: 'リセットに失敗しました' },

  // ── Tunable labels + help lines ──────────────────────────────────────────
  'tune.gearDwellMs.label': { en: 'Gear shift delay', th: 'ดีเลย์การเปลี่ยนเกียร์', zh: '换挡延迟', ja: 'ギア切り替え遅延' },
  'tune.gearDwellMs.help': {
    en: 'How long the new position must stay still before locking in. Lower = faster reaction. Going under ~120 ms is unreliable — small jitters slip through and the gear bounces back and forth.',
    th: 'ตำแหน่งใหม่ต้องนิ่งนานเท่าไรก่อนล็อกเข้าที่ ต่ำ = ตอบสนองเร็วขึ้น ต่ำกว่า ~120 ms จะไม่เสถียร — การสั่นเล็กน้อยจะหลุดผ่านและเกียร์เด้งไปมา',
    zh: '新位置需要静止多久才锁定。越低 = 反应越快。低于约 120 ms 会不稳定——微小抖动会漏过，挡位来回跳动。',
    ja: '新しい位置がロックされるまで静止していなければならない時間。低いほど反応が速い。約 120 ms を下回ると不安定になり — わずかな揺れがすり抜けてギアが行ったり来たりします。',
  },

  'tune.patternChaseMs.label': { en: 'Pattern Effect speed', th: 'ความเร็วเอฟเฟกต์แพทเทิร์น', zh: '图案效果速度', ja: 'パターン効果の速度' },
  'tune.patternChaseMs.help': {
    en: 'How fast the glowing light runs through the gears on the H-pattern screen.',
    th: 'แสงเรืองวิ่งผ่านเกียร์บนหน้าจอแบบ H-pattern เร็วแค่ไหน',
    zh: '发光灯在 H 型换挡图案屏幕上流过各挡位的速度。',
    ja: 'H パターン画面でギアを流れる光の速さ。',
  },

  'tune.intentGyroDps.label': { en: 'Shift sensitivity', th: 'ความไวการเปลี่ยนเกียร์', zh: '换挡灵敏度', ja: 'シフト感度' },
  'tune.intentGyroDps.help': {
    en: 'How sharp a knob movement is needed to register as a shift. Higher = ignores more car bumps and brake dive.',
    th: 'ต้องขยับหัวเกียร์แรงแค่ไหนจึงนับเป็นการเปลี่ยนเกียร์ สูง = เพิกเฉยแรงกระแทกจากถนนและการก้มหน้าเบรกได้มากขึ้น',
    zh: '需要多剧烈的换挡头动作才被识别为换挡。越高 = 越能忽略颠簸和刹车俯冲。',
    ja: 'シフトとして認識するのに必要なシフトノブの動きの鋭さ。高いほど路面の凹凸やブレーキ時の沈み込みを無視します。',
  },

  'tune.intentWindowMs.label': { en: 'Shift detection window', th: 'ช่วงตรวจจับการเปลี่ยนเกียร์', zh: '换挡检测窗口', ja: 'シフト検出ウィンドウ' },
  'tune.intentWindowMs.help': {
    en: 'After moving the knob, how long the device keeps accepting the new gear before timing out.',
    th: 'หลังขยับหัวเกียร์ อุปกรณ์จะรับเกียร์ใหม่ต่อไปนานแค่ไหนก่อนหมดเวลา',
    zh: '移动换挡头后，设备在超时前继续接受新挡位的时长。',
    ja: 'シフトノブを動かした後、タイムアウトするまで新しいギアを受け付ける時間。',
  },

  'tune.motionAccelDead.label': { en: 'Driving detect (shake)', th: 'ตรวจจับการขับ (สั่น)', zh: '行驶检测（震动）', ja: '走行検出（振動）' },
  'tune.motionAccelDead.help': {
    en: 'How much vibration counts as the car moving. Above this, shifts freeze to prevent road bumps from triggering them.',
    th: 'ต้องสั่นแค่ไหนจึงนับว่ารถกำลังเคลื่อนที่ เกินค่านี้ การเปลี่ยนเกียร์จะถูกล็อกเพื่อกันแรงกระแทกจากถนนมาสั่งงาน',
    zh: '多大的震动算作车辆行驶。超过此值时，换挡将冻结，以防止路面颠簸误触发。',
    ja: 'どの程度の振動を車が動いていると見なすか。これを超えると、路面の凹凸による誤作動を防ぐためシフトが停止します。',
  },

  'tune.motionGyroDead.label': { en: 'Driving detect (turn)', th: 'ตรวจจับการขับ (เลี้ยว)', zh: '行驶检测（转向）', ja: '走行検出（旋回）' },
  'tune.motionGyroDead.help': {
    en: 'How much turning counts as the car moving. Above this, shifts freeze for the same reason.',
    th: 'ต้องเลี้ยวแค่ไหนจึงนับว่ารถกำลังเคลื่อนที่ เกินค่านี้ การเปลี่ยนเกียร์จะถูกล็อกด้วยเหตุผลเดียวกัน',
    zh: '多大的转向算作车辆行驶。超过此值时，换挡将出于同样原因冻结。',
    ja: 'どの程度の旋回を車が動いていると見なすか。これを超えると、同じ理由でシフトが停止します。',
  },

  'tune.lpAlphaRp.label': { en: 'Tilt response', th: 'การตอบสนองการเอียง', zh: '倾斜响应', ja: '傾き応答' },
  'tune.lpAlphaRp.help': {
    en: 'Lower = smoother but laggy. Higher = snappy but more jittery.',
    th: 'ต่ำ = นุ่มนวลแต่หน่วง สูง = ตอบสนองไวแต่กระตุกมากขึ้น',
    zh: '越低 = 越平滑但有延迟。越高 = 越灵敏但更抖动。',
    ja: '低いほど滑らかだが遅延あり。高いほど機敏だが揺れが増える。',
  },

  'tune.seqTriggerDeg.label': { en: 'Sequential — shift angle', th: 'ซีเควนเชียล — มุมเปลี่ยนเกียร์', zh: '序列式 — 换挡角度', ja: 'シーケンシャル — シフト角度' },
  'tune.seqTriggerDeg.help': {
    en: 'Sequential mode only. How far to tilt the knob to count as an up/down shift.',
    th: 'เฉพาะโหมดซีเควนเชียล ต้องเอียงหัวเกียร์มากแค่ไหนจึงนับเป็นการเปลี่ยนขึ้น/ลง',
    zh: '仅序列式模式。换挡头需倾斜多少才算作升/降挡。',
    ja: 'シーケンシャルモードのみ。アップ/ダウンシフトと見なすためにシフトノブを傾ける角度。',
  },

  'tune.seqRearmDeg.label': { en: 'Sequential — return angle', th: 'ซีเควนเชียล — มุมกลับ', zh: '序列式 — 回位角度', ja: 'シーケンシャル — 戻り角度' },
  'tune.seqRearmDeg.help': {
    en: 'Sequential mode only. Knob must come back to within this angle before another shift can register.',
    th: 'เฉพาะโหมดซีเควนเชียล หัวเกียร์ต้องกลับมาอยู่ในมุมนี้ก่อนจึงจะนับการเปลี่ยนเกียร์ครั้งถัดไปได้',
    zh: '仅序列式模式。换挡头必须回到此角度以内，才能识别下一次换挡。',
    ja: 'シーケンシャルモードのみ。次のシフトを認識するには、シフトノブがこの角度内に戻る必要があります。',
  },

  'tune.seqCooldownMs.label': { en: 'Sequential — shift gap', th: 'ซีเควนเชียล — ระยะห่างการเปลี่ยนเกียร์', zh: '序列式 — 换挡间隔', ja: 'シーケンシャル — シフト間隔' },
  'tune.seqCooldownMs.help': {
    en: 'Sequential mode only. Shortest time allowed between two consecutive shifts.',
    th: 'เฉพาะโหมดซีเควนเชียล ระยะเวลาสั้นที่สุดที่ยอมให้ระหว่างการเปลี่ยนเกียร์สองครั้งติดกัน',
    zh: '仅序列式模式。两次连续换挡之间允许的最短时间。',
    ja: 'シーケンシャルモードのみ。連続する 2 回のシフト間で許される最短時間。',
  },

  'tune.brightFull.label': { en: 'Brightness while in use', th: 'ความสว่างขณะใช้งาน', zh: '使用时亮度', ja: '使用中の明るさ' },
  'tune.brightFull.help': {
    en: 'Screen brightness when you are actively using the device.',
    th: 'ความสว่างหน้าจอขณะที่คุณกำลังใช้งานอุปกรณ์',
    zh: '你正在使用设备时的屏幕亮度。',
    ja: 'デバイスを実際に使用しているときの画面の明るさ。',
  },

  'tune.brightDim.label': { en: 'Brightness when idle', th: 'ความสว่างเมื่อไม่ใช้งาน', zh: '空闲时亮度', ja: 'アイドル時の明るさ' },
  'tune.brightDim.help': {
    en: 'Screen brightness after a few seconds without interaction.',
    th: 'ความสว่างหน้าจอหลังจากไม่มีการโต้ตอบสองสามวินาที',
    zh: '几秒无操作后的屏幕亮度。',
    ja: '数秒間操作がないときの画面の明るさ。',
  },

  'tune.sleepAfterMs.label': { en: 'Screensaver delay', th: 'ดีเลย์สกรีนเซฟเวอร์', zh: '屏保延迟', ja: 'スクリーンセーバー遅延' },
  'tune.sleepAfterMs.help': {
    en: 'How long without input before the screensaver image / animation kicks in.',
    th: 'ต้องไม่มีการป้อนข้อมูลนานแค่ไหนก่อนภาพ/แอนิเมชันสกรีนเซฟเวอร์จะเริ่มทำงาน',
    zh: '无输入多久后屏保图像／动画启动。',
    ja: '入力がないまま何秒でスクリーンセーバーの画像／アニメーションが起動するか。',
  },

  'tune.transitionStyle.label': { en: 'Screen change effect', th: 'เอฟเฟกต์เปลี่ยนหน้าจอ', zh: '切换屏幕效果', ja: '画面切り替え効果' },
  'tune.transitionStyle.help': {
    en: 'How pages animate when switching from one to another.',
    th: 'หน้าจอเปลี่ยนภาพเคลื่อนไหวอย่างไรเมื่อสลับจากหน้าหนึ่งไปอีกหน้า',
    zh: '页面从一页切换到另一页时的动画方式。',
    ja: 'ページを切り替えるときのアニメーションの仕方。',
  },

  'tune.gearAnimStyle.label': { en: 'Gear letter effect', th: 'เอฟเฟกต์ตัวอักษรเกียร์', zh: '挡位字母效果', ja: 'ギア文字の効果' },
  'tune.gearAnimStyle.help': {
    en: 'How the big gear letter appears when you shift on the main screen.',
    th: 'ตัวอักษรเกียร์ตัวใหญ่ปรากฏอย่างไรเมื่อคุณเปลี่ยนเกียร์บนหน้าจอหลัก',
    zh: '在主屏幕换挡时，大号挡位字母的出现方式。',
    ja: 'メイン画面でシフトしたときに大きなギア文字が現れる仕方。',
  },
} satisfies Record<string, Row>;
