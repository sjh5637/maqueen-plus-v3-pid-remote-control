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
 *
 * 주의: 이 확장의 enum(MyEnumMotor 등)은 namespace 안에 있어서 반드시
 *       maqueenPlusV2.MyEnumMotor 형태로 한정해야 컴파일됨.
 */

// ===== 튜닝 상수 =====
const LOOP_MS = 50           // 제어 루프 주기 (ms)
const PWM_TO_CMS = 5         // PWM→cm/s 환산 (255 PWM ≈ 51 cm/s, 엔코더 상한)
const KP = 10                // 비례 게인 (PWM per cm/s 오차) — 너무 크면 뿜뿜 진동
const KI = 2                 // 적분 게인
const I_LIMIT = 40           // 적분 클램프 (안티와인드업)
const OUT_SLEW = 60          // 한 루프당 출력 PWM 변화 한도 (부드러운 가감속)
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
let outL = 0                // 슬루 제한용 직전 출력
let outR = 0
let lastShownSteer = 9999   // 진단용: 직전 콘솔 출력 steer 값

function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v))
}

function applyLed(): void {
    const sw = ledOn ? maqueenPlusV2.MyEnumSwitch.Open : maqueenPlusV2.MyEnumSwitch.Close
    maqueenPlusV2.controlLED(maqueenPlusV2.MyEnumLed.LeftLed, sw)
    maqueenPlusV2.controlLED(maqueenPlusV2.MyEnumLed.RightLed, sw)
}

// 바퀴 1개 PI 제어 1스텝 (적분/출력은 integL/R, outL/R 전역으로 관리)
// target: PWM 목표(+ 전진 / - 후진), ratio: 피드포워드 보정비, isLeft: 좌바퀴 여부
function driveWheel(motor: maqueenPlusV2.MyEnumMotor, dirType: maqueenPlusV2.DirectionType2, target: number, ratio: number, isLeft: boolean): void {
    if (Math.abs(target) < STOP_THRESHOLD) {
        maqueenPlusV2.controlMotorStop(motor)
        if (isLeft) { integL = 0; outL = 0 } else { integR = 0; outR = 0 }
        return
    }
    const targetCms = Math.abs(target) / PWM_TO_CMS
    const err = targetCms - maqueenPlusV2.readRealTimeSpeed(dirType)
    let integ = isLeft ? integL : integR
    integ = clamp(integ + err * (LOOP_MS / 1000), -I_LIMIT, I_LIMIT)
    // 피드포워드 = 목표 PWM 그대로 (PWM→속도 선형 가정), PI는 잔여 오차만 보정
    let out = Math.abs(target) * ratio + KP * err + KI * integ
    const prev = isLeft ? outL : outR
    out = clamp(out, prev - OUT_SLEW, prev + OUT_SLEW)
    out = clamp(Math.round(out), 0, 255)
    if (isLeft) { integL = integ; outL = out } else { integR = integ; outR = out }
    maqueenPlusV2.controlMotor(motor, target > 0 ? maqueenPlusV2.MyEnumDir.Forward : maqueenPlusV2.MyEnumDir.Backward, out)
}

// 캘리브레이션: 고정 PWM 전진 주행 중 좌/우 실측 속도 → 우바퀴 보정비 산출
function runCalibration(): void {
    basic.showArrow(ArrowNames.North)
    music.playTone(880, 200)
    maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.AllMotor, maqueenPlusV2.MyEnumDir.Forward, CAL_PWM)
    let sumL = 0
    let sumR = 0
    const n = CAL_MS / CAL_SAMPLE_MS
    for (let i = 0; i < n; i++) {
        basic.pause(CAL_SAMPLE_MS)
        sumL += maqueenPlusV2.readRealTimeSpeed(maqueenPlusV2.DirectionType2.Left)
        sumR += maqueenPlusV2.readRealTimeSpeed(maqueenPlusV2.DirectionType2.Right)
    }
    maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor)
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

radio.onReceivedBuffer(function (receivedBuffer: Buffer) {
    if (receivedBuffer.length < 6) {
        return
    }
    lastRx = input.runningTime()
    const cmd = receivedBuffer.getNumber(NumberFormat.Int8LE, 0)
    if (cmd == 77) {                        // 'M' 조종
        if (!calibReq) {                    // 캘리브레이션 중에는 무시
            base = receivedBuffer.getNumber(NumberFormat.Int16LE, 1)
            steer = receivedBuffer.getNumber(NumberFormat.Int16LE, 3)
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
    integL = driveWheel(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.DirectionType2.Left, targetL, 1.0, true)
    integR = driveWheel(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.DirectionType2.Right, targetR, ratioR, false)

    // ===== 진단용 USB 콘솔 출력 (값이 바뀔 때만) =====
    if (s != lastShownSteer) {
        lastShownSteer = s
        serial.writeLine("base=" + b + " steer=" + s + " L=" + targetL + " R=" + targetR)
    }

    basic.pause(LOOP_MS)
})
