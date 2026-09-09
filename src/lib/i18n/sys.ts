// System info page. Rune page → actual Unicode chars (— · % ° …), no HTML entities.
import type { Row } from '../i18n';

export default {
  'sys.title':        { en: 'System info', th: 'ข้อมูลระบบ', zh: '系统信息', ja: 'システム情報' },
  'sys.back_pro':     { en: 'Pro', th: 'โปร', zh: '专业', ja: 'プロ' },
  'sys.loading':      { en: 'Loading…', th: 'กำลังโหลด…', zh: '加载中…', ja: '読み込み中…' },

  // Shown when no device is paired (connect prompt instead of an endless spinner)
  'sys.connect_title':   { en: 'Connect your AXIS', th: 'เชื่อมต่อ AXIS ของคุณ', zh: '连接你的 AXIS', ja: 'AXIS を接続' },
  'sys.connect_body':    { en: 'Connect a device to see its live system info — firmware, memory, Wi-Fi, battery and more.', th: 'เชื่อมต่ออุปกรณ์เพื่อดูข้อมูลระบบแบบเรียลไทม์ — เฟิร์มแวร์ หน่วยความจำ Wi-Fi แบตเตอรี่ และอื่นๆ', zh: '连接设备以查看其实时系统信息——固件、内存、Wi-Fi、电池等。', ja: 'デバイスを接続してライブのシステム情報を表示 — ファームウェア、メモリ、Wi-Fi、バッテリーなど。' },
  'sys.back_to_connect': { en: '← Back to connect', th: '← กลับไปเชื่อมต่อ', zh: '← 返回连接', ja: '← 接続に戻る' },

  // status / error fallbacks
  'sys.err_load':     { en: 'load failed', th: 'โหลดล้มเหลว', zh: '加载失败', ja: '読み込み失敗' },
  'sys.err_reboot':   { en: 'reboot failed', th: 'รีสตาร์ทล้มเหลว', zh: '重启失败', ja: '再起動失敗' },
  'sys.err_factory':  { en: 'factory reset failed', th: 'รีเซ็ตโรงงานล้มเหลว', zh: '恢复出厂失败', ja: '工場出荷リセット失敗' },

  // confirm dialogs
  'sys.confirm_reboot':  { en: 'Restart the device? Active connections will drop.', th: 'รีสตาร์ทอุปกรณ์? การเชื่อมต่อที่ใช้งานอยู่จะหลุด', zh: '重启设备？当前连接将会断开。', ja: 'デバイスを再起動しますか？現在の接続は切断されます。' },
  'sys.confirm_factory': { en: 'Reset everything to factory defaults?\n\nThis clears: brand colours, device name, tunables, screensaver, Wi-Fi credentials, calibration.\n\nThe device will reboot.', th: 'รีเซ็ตทุกอย่างกลับเป็นค่าโรงงาน?\n\nจะล้าง: สีแบรนด์ ชื่ออุปกรณ์ ค่าที่ปรับได้ สกรีนเซฟเวอร์ ข้อมูล Wi-Fi การคาลิเบรต\n\nอุปกรณ์จะรีสตาร์ท', zh: '将所有内容恢复为出厂默认值？\n\n这将清除：品牌颜色、设备名称、可调参数、屏保、Wi-Fi 凭据、校准。\n\n设备将会重启。', ja: 'すべてを工場出荷時の設定にリセットしますか？\n\n次の項目が消去されます：ブランドカラー、デバイス名、調整値、スクリーンセーバー、Wi-Fi 認証情報、キャリブレーション。\n\nデバイスは再起動します。' },

  // Identity
  'sys.identity':     { en: 'Identity', th: 'ข้อมูลระบุตัวตน', zh: '身份标识', ja: '識別情報' },
  'sys.firmware':     { en: 'Firmware', th: 'เฟิร์มแวร์', zh: '固件', ja: 'ファームウェア' },
  'sys.hardware_id':  { en: 'Hardware ID', th: 'รหัสฮาร์ดแวร์', zh: '硬件 ID', ja: 'ハードウェア ID' },
  'sys.cpu':          { en: 'CPU', th: 'CPU', zh: 'CPU', ja: 'CPU' },
  'sys.uptime':       { en: 'Uptime', th: 'เวลาทำงาน', zh: '运行时间', ja: '稼働時間' },

  // Memory
  'sys.memory':       { en: 'Memory', th: 'หน่วยความจำ', zh: '内存', ja: 'メモリ' },
  'sys.heap_free':    { en: 'Heap (free)', th: 'ฮีป (ว่าง)', zh: '堆 (可用)', ja: 'ヒープ (空き)' },
  'sys.heap_min':     { en: 'Heap (min seen)', th: 'ฮีป (ต่ำสุดที่พบ)', zh: '堆 (最低值)', ja: 'ヒープ (最小値)' },
  'sys.psram_free':   { en: 'PSRAM (free)', th: 'PSRAM (ว่าง)', zh: 'PSRAM (可用)', ja: 'PSRAM (空き)' },
  'sys.flash':        { en: 'Flash', th: 'แฟลช', zh: '闪存', ja: 'フラッシュ' },
  'sys.psram_used':   { en: 'PSRAM {pct} used', th: 'PSRAM ใช้ไป {pct}', zh: 'PSRAM 已用 {pct}', ja: 'PSRAM 使用 {pct}' },

  // Wireless
  'sys.wireless':     { en: 'Wireless', th: 'ไร้สาย', zh: '无线', ja: '無線' },
  'sys.setup_ap':     { en: 'Setup AP', th: 'AP ตั้งค่า', zh: '设置 AP', ja: 'セットアップ AP' },
  'sys.client':       { en: 'client', th: 'เครื่อง', zh: '个客户端', ja: 'クライアント' },
  'sys.clients':      { en: 'clients', th: 'เครื่อง', zh: '个客户端', ja: 'クライアント' },
  'sys.ap_address':   { en: 'AP address', th: 'ที่อยู่ AP', zh: 'AP 地址', ja: 'AP アドレス' },
  'sys.home_wifi':    { en: 'Home Wi-Fi', th: 'Wi-Fi บ้าน', zh: '家庭 Wi-Fi', ja: 'ホーム Wi-Fi' },
  'sys.disconnected': { en: 'disconnected', th: 'ตัดการเชื่อมต่อ', zh: '已断开', ja: '未接続' },
  'sys.home_ip':      { en: 'Home IP', th: 'IP บ้าน', zh: '家庭 IP', ja: 'ホーム IP' },
  'sys.signal':       { en: 'Signal', th: 'สัญญาณ', zh: '信号', ja: '信号' },

  // Battery
  'sys.battery':      { en: 'Battery', th: 'แบตเตอรี่', zh: '电池', ja: 'バッテリー' },
  'sys.state':        { en: 'State', th: 'สถานะ', zh: '状态', ja: '状態' },
  'sys.charging':     { en: 'CHARGING', th: 'กำลังชาร์จ', zh: '充电中', ja: '充電中' },
  'sys.low':          { en: 'LOW', th: 'ต่ำ', zh: '电量低', ja: '低下' },
  'sys.voltage':      { en: 'Voltage', th: 'แรงดันไฟ', zh: '电压', ja: '電圧' },
  'sys.no_battery':   { en: 'No battery detected — running on USB.', th: 'ไม่พบแบตเตอรี่ — ใช้ไฟผ่าน USB', zh: '未检测到电池——通过 USB 供电。', ja: 'バッテリーが検出されません — USB で駆動中。' },

  // IMU (engineer diagnostics). Value lines are axis-symbol + unit only → en carries all langs.
  'sys.imu_raw':      { en: 'IMU (raw)', th: 'IMU (ดิบ)', zh: 'IMU (原始)', ja: 'IMU (生値)' },
  'sys.accel':        { en: 'Accel', th: 'ความเร่ง', zh: '加速度', ja: '加速度' },
  'sys.gyro':         { en: 'Gyro', th: 'ไจโร', zh: '陀螺仪', ja: 'ジャイロ' },
  'sys.tilt':         { en: 'Tilt', th: 'การเอียง', zh: '倾斜', ja: '傾き' },
  'sys.imu_accel_val':{ en: 'x {x}g · y {y}g · z {z}g' },
  'sys.imu_gyro_val': { en: 'x {x}° · y {y}° · z {z}° /s' },
  'sys.imu_tilt_val': { en: 'roll {roll}° · pitch {pitch}°', th: 'โรล {roll}° · พิตช์ {pitch}°', zh: '横滚 {roll}° · 俯仰 {pitch}°', ja: 'ロール {roll}° · ピッチ {pitch}°' },

  // Active mode
  'sys.active_mode':  { en: 'Active mode', th: 'โหมดที่ใช้งาน', zh: '当前模式', ja: '有効なモード' },
  'sys.mode':         { en: 'Mode', th: 'โหมด', zh: '模式', ja: 'モード' },
  'sys.gears':        { en: 'Gears', th: 'จำนวนเกียร์', zh: '挡位数', ja: 'ギア数' },

  // Actions
  'sys.actions':       { en: 'Actions', th: 'การทำงาน', zh: '操作', ja: '操作' },
  'sys.actions_hint':  { en: 'Restart keeps your settings. Factory reset clears everything.', th: 'รีสตาร์ทจะเก็บการตั้งค่าไว้ รีเซ็ตโรงงานจะล้างทุกอย่าง', zh: '重启会保留你的设置。恢复出厂会清除所有内容。', ja: '再起動は設定を保持します。工場出荷リセットはすべてを消去します。' },
  'sys.restart':       { en: 'RESTART', th: 'รีสตาร์ท', zh: '重启', ja: '再起動' },
  'sys.factory_reset': { en: 'FACTORY RESET', th: 'รีเซ็ตโรงงาน', zh: '恢复出厂', ja: '工場出荷リセット' },
  'sys.demo_hint':     { en: 'Available when an AXIS is connected.', th: 'ใช้งานได้เมื่อเชื่อมต่อ AXIS แล้ว', zh: '连接 AXIS 后可用。', ja: 'AXIS 接続時に利用できます。' },
} satisfies Record<string, Row>;
