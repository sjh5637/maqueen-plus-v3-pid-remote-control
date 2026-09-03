/* Maqueen Plus V3 수신 본체 — micro:bit v2
 * 확장: maqueenPlusV2=github:DFRobot/pxt-DFRobot_MaqueenPlus_v20
 *
 * 엔코더 피드백 PI 제어 + 캘리브레이션 보정비 피드포워드로 직진 자동 보정
 * 수신 두절 1초 이상 시 자동 정지
 *
 * 프로토콜: 6바이트 버퍼 — [0]=cmd, [1..2]=int16LE v1, [3..4]=int16LE v2
 *   'M'(77): v1=base speed(-255~255), v2=steer(-255~255)  steer 양수=좌회전
 *   'L'(76): LED 토글 (좌/우 동시)
 *   'C'(67): 직진 캘리브레이션 요청
 */

// ===== 튜닝 상수 =====
const LOOP_MS = 50           // 제어 루프 주기 (ms)
const PWM_TO_CMS = 5         // PWM→cm/s 환산 (255 PWM ≈ 51 cm/s, 엔코더 상한)
const FF_GAIN = 5            // 피드포워드 게인: PWM per cm/s
const KP = 30                // 비례 게인 (PWM per cm/s 오차)
const KI = 8                 // 적분 게인
const I_LIMIT = 60           // 적분 클램프 (안티와인드업)
const RATIO_MIN = 0.7        // 캘리브레이션 보정비 하한
const RATIO_MAX = 1.4        // 캘리브레이션 보정비 상한
const CAL_PWM = 150          // 캘리브레이션 주행 PWM
const CAL_MS = 2000          // 캘리브레이션 주행 시간 (ms)
const CAL_SAMPLE_MS = 100    // 캘리브레이션 속도 샘플 간격
const RX_TIMEOUT_MS = 1000   // 수신 두절 자동 정지 기준
const STOP_THRESHOLD = 8     // 목표 PWM이 이 이하면 정지 취급

let base = 0                 // 전/후진 속도 (PWM, -255~255, + = 전진)
let steer = 0                // 조향 합산값 (PWM, 양수 = 좌회전)
let ledOn = false
let lastRx = 0               // 마지막 수신 시각 (0 = 아직 수신 없음)
let calibReq = false
let ratioR = 1.0             // 우바퀴 피드포워드 보정비 (캘리브레이션 결과)
let integL = 0
let integR = 0

function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v))
}

function applyLed(): void {
    const sw = ledOn ? MyEnumSwitch.Open : MyEnumSwitch.Close
    maqueenPlusV2.controlLED(MyEnumLed.LeftLed, sw)
    maqueenPlusV2.controlLED(MyEnumLed.RightLed, sw)
}

// 바퀴 1개 PI 제어 1스텝. 반환값: 갱신된 적분값
// target: PWM 목표(+ 전진 / - 후진), ratio: 피드포워드 보정비
function driveWheel(motor: MyEnumMotor, dirType: DirectionType2, target: number, integ: number, ratio: number): number {
    if (Math.abs(target) < STOP_THRESHOLD) {
        maqueenPlusV2.controlMotorStop(motor)
        return 0
    }
    const targetCms = Math.abs(target) / PWM_TO_CMS
    const err = targetCms - maqueenPlusV2.readRealTimeSpeed(dirType)
    integ = clamp(integ + err * (LOOP_MS / 1000), -I_LIMIT, I_LIMIT)
    const out = clamp(Math.round(FF_GAIN * targetCms * ratio + KP * err + KI * integ), 0, 255)
    maqueenPlusV2.controlMotor(motor, target > 0 ? MyEnumDir.Forward : MyEnumDir.Backward, out)
    return integ
}

// 캘리브레이션: 고정 PWM 전진 주행 중 좌/우 실측 속도 → 우바퀴 보정비 산출
function runCalibration(): void {
    basic.showIcon(IconNames.ArrowNorth)
    music.playTone(880, 200)
    maqueenPlusV2.controlMotor(MyEnumMotor.AllMotor, MyEnumDir.Forward, CAL_PWM)
    let sumL = 0
    let sumR = 0
    const n = CAL_MS / CAL_SAMPLE_MS
    for (let i = 0; i < n; i++) {
        basic.pause(CAL_SAMPLE_MS)
        sumL += maqueenPlusV2.readRealTimeSpeed(DirectionType2.Left)
        sumR += maqueenPlusV2.readRealTimeSpeed(DirectionType2.Right)
    }
    maqueenPlusV2.controlMotorStop(MyEnumMotor.AllMotor)
    const avgL = sumL / n
    const avgR = sumR / n
    if (avgR > 1) {
        ratioR = clamp(avgL / avgR, RATIO_MIN, RATIO_MAX)
    }
    base = 0
    steer = 0
    integL = 0
    integR = 0
    calibReq = false
    music.playTone(1320, 300)
    // 보정비 표시 (예: "#12" = 1.2배)
    basic.showString("#" + Math.round(ratioR * 10))
    basic.showIcon(IconNames.Happy)
}

radio.onDataReceived(function () {
    const buf = radio.readBuffer()
    if (buf.length < 6) {
        return
    }
    lastRx = input.runningTime()
    const cmd = buf.getNumber(NumberFormat.Int8LE, 0)
    if (cmd == 77) {                        // 'M' 조종
        if (!calibReq) {                    // 캘리브레이션 중에는 무시
            base = buf.getNumber(NumberFormat.Int16LE, 1)
            steer = buf.getNumber(NumberFormat.Int16LE, 3)
        }
    } else if (cmd == 76) {                 // 'L' LED 토글
        ledOn = !ledOn
        applyLed()
    } else if (cmd == 67) {                 // 'C' 캘리브레이션
        calibReq = true
    }
})

radio.setGroup(61)
maqueenPlusV2.I2CInit()
ratioR = 1.0
basic.showIcon(IconNames.Happy)

basic.forever(function () {
    if (calibReq) {
        runCalibration()
        return
    }
    // 수신 두절 안전 정지
    let b = base
    let s = steer
    if (lastRx == 0 || input.runningTime() - lastRx > RX_TIMEOUT_MS) {
        b = 0
        s = 0
    }
    // differential mix: steer 양수 = 우바퀴 빨라짐 = 좌회전
    const targetL = clamp(b - s, -255, 255)
    const targetR = clamp(b + s, -255, 255)
    integL = driveWheel(MyEnumMotor.LeftMotor, DirectionType2.Left, targetL, integL, 1.0)
    integR = driveWheel(MyEnumMotor.RightMotor, DirectionType2.Right, targetR, integR, ratioR)
    basic.pause(LOOP_MS)
})
