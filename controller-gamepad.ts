/* Maqueen Plus V3 라디오 조종기 — DFR0536 GamePad V3.0 + micro:bit v2
 * 확장 라이브러리 불필요 (플레인 micro:bit API + radio)
 *
 * 입력: P1=스틱 X축(좌우), P2=스틱 Y축(상하)
 *       micro:bit A버튼=좌회전, B버튼=우회전
 *       P15(E버튼)=LED 토글, P16(F버튼)=직진 캘리브레이션
 *
 * 프로토콜: radio.sendBuffer 6바이트 — [0]=cmd, [1..2]=int16LE v1, [3..4]=int16LE v2
 *   'M'(77): v1=base speed(-255~255), v2=steer(-255~255)
 *   'L'(76): LED 토글
 *   'C'(67): 직진 캘리브레이션 요청
 * steer 양수 = 우바퀴 빨라짐 = 좌회전
 */

// ===== 튜닝 상수 =====
const DEADZONE = 60            // 스틱 중심 무시 범위 (조정기 부정확 대응)
const MAX_SPEED = 200          // 최대 기본 속도 (PWM 0~255)
const TRIM_MAX = 80            // X축 미세 조향 최대치 (PWM)
const TURN_OFFSET = 120        // A/B 버튼 턴 오프셋 (PWM)
const X_STICK_INVERT = false   // X축 방향이 거꾸로면 true로
const BTN_E = DigitalPin.P15   // LED 토글 버튼 (게임패드 V3.0 핀맵 미확인 — 반응 없으면 핀 번호 조정)
const BTN_F = DigitalPin.P16   // 캘리브레이션 버튼
const LOOP_MS = 20             // 송신 주기

let centerX = 512
let centerY = 512
let lastLedMs = 0
let lastCalMs = 0
let calibrating = false
let lastSentSpeed = 9999    // 진단용: 직전 출력값
let lastSentSteer = 9999

function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v))
}

function sendCmd(cmd: number, v1: number, v2: number): void {
    const buf = pins.createBuffer(6)
    buf.setNumber(NumberFormat.Int8LE, 0, cmd)
    buf.setNumber(NumberFormat.Int16LE, 1, v1)
    buf.setNumber(NumberFormat.Int16LE, 3, v2)
    radio.sendBuffer(buf)
}

// 부팅 직후 스틱 중심점 측정 (조정기 드리프트 대응) — 스틱에서 손 떼고 대기
function calibrateCenter(): void {
    basic.showString("CAL")
    let sx = 0
    let sy = 0
    for (let i = 0; i < 32; i++) {
        sx += pins.analogReadPin(AnalogReadWritePin.P1)
        sy += pins.analogReadPin(AnalogReadWritePin.P2)
        basic.pause(30)
    }
    centerX = sx / 32
    centerY = sy / 32
    basic.showString("X" + centerX)
    basic.showString("Y" + centerY)
}

radio.setGroup(61)
pins.setPull(BTN_E, PinPullMode.PullUp)
pins.setPull(BTN_F, PinPullMode.PullUp)
calibrateCenter()
basic.showIcon(IconNames.Yes)

basic.forever(function () {
    const now = input.runningTime()

    // E버튼: LED 토글 (디바운스)
    if (pins.digitalReadPin(BTN_E) == 0 && now - lastLedMs > 500) {
        lastLedMs = now
        sendCmd(76, 0, 0)
    }
    // F버튼: 캘리브레이션 요청 (디바운스 + 캘리브레이션 소요시간보다 긴 잠금)
    if (pins.digitalReadPin(BTN_F) == 0 && now - lastCalMs > 4000) {
        lastCalMs = now
        calibrating = true
        sendCmd(67, 0, 0)
    }
    if (calibrating && now - lastCalMs > 4500) {
        calibrating = false
    }

    // A/B 버튼: 턴 오프셋 (A=좌회전, B=우회전)
    let steer = 0
    if (input.buttonIsPressed(Button.A)) {
        steer = TURN_OFFSET
    } else if (input.buttonIsPressed(Button.B)) {
        steer = -TURN_OFFSET
    }

    // 스틱 Y축: 전/후진 속도 (좌우로 치우쳐도 Y값 기준으로만 판단)
    // 스틱 위 = 값이 커짐 (기존 검증된 코드 기준: P2 > 800 → 전진)
    const dy = pins.analogReadPin(AnalogReadWritePin.P2) - centerY   // 위 = 양수
    let speed = 0
    if (dy > DEADZONE) {
        speed = clamp(Math.round(dy / Math.max(centerY, 1) * MAX_SPEED), 0, MAX_SPEED)
    } else if (dy < -DEADZONE) {
        speed = -clamp(Math.round(-dy / Math.max(1023 - centerY, 1) * MAX_SPEED), 0, MAX_SPEED)
    }

    // 스틱 X축: 미세 조향 (전진/후진 중에만 적용)
    // 오른쪽 밀기 = 우회전 = steer 음수
    if (speed != 0) {
        const dx = pins.analogReadPin(AnalogReadWritePin.P1) - centerX   // 오른쪽 = 양수
        if (Math.abs(dx) > DEADZONE) {
            const s = clamp(Math.round(dx * TRIM_MAX / Math.max(centerX, 1)), -TRIM_MAX, TRIM_MAX)
            steer += X_STICK_INVERT ? s : -s
        }
    }

    // ===== 진단용 화면 표시 (원인 파악 후 제거 예정) =====
    // (0,2) 도트 = A 눌림, (4,2) 도트 = B 눌림
    // (2,0) 도트 = E핀 LOW, (2,4) 도트 = F핀 LOW (아무것도 안 눌렀는데 켜져 있으면 버튼 회로 반전)
    if (input.buttonIsPressed(Button.A)) {
        led.plot(0, 2)
    } else {
        led.unplot(0, 2)
    }
    if (input.buttonIsPressed(Button.B)) {
        led.plot(4, 2)
    } else {
        led.unplot(4, 2)
    }
    if (pins.digitalReadPin(BTN_E) == 0) {
        led.plot(2, 0)
    } else {
        led.unplot(2, 0)
    }
    if (pins.digitalReadPin(BTN_F) == 0) {
        led.plot(2, 4)
    } else {
        led.unplot(2, 4)
    }

    // ===== 진단용 USB 콘솔 출력 (값이 바뀔 때만) — 페어링 후 "데이터 보기"에서 확인 =====
    if (speed != lastSentSpeed || steer != lastSentSteer) {
        serial.writeLine("spd=" + speed + " steer=" + steer
            + " A=" + (input.buttonIsPressed(Button.A) ? 1 : 0)
            + " B=" + (input.buttonIsPressed(Button.B) ? 1 : 0)
            + " E=" + (pins.digitalReadPin(BTN_E) == 0 ? 1 : 0)
            + " F=" + (pins.digitalReadPin(BTN_F) == 0 ? 1 : 0))
        lastSentSpeed = speed
        lastSentSteer = steer
    }

    sendCmd(77, speed, steer)
    basic.pause(LOOP_MS)
})
