// DFR0536 GamePad V3.0 조정기(송신) 코드 — MakeCode JavaScript
// 라디오 그룹 61, 조이스틱 + A/B 버튼으로 마퀸 조종

radio.setGroup(61)
// P13~P16: 패드 버튼 핀 (풀업 설정, 현재 코드에서는 미사용)
pins.setPull(DigitalPin.P13, PinPullMode.PullUp)
pins.setPull(DigitalPin.P14, PinPullMode.PullUp)
pins.setPull(DigitalPin.P15, PinPullMode.PullUp)
pins.setPull(DigitalPin.P16, PinPullMode.PullUp)
basic.showIcon(IconNames.Happy)
basic.forever(function () {
    if (input.buttonIsPressed(Button.B)) {
        radio.sendString("RR")
    } else if (input.buttonIsPressed(Button.A)) {
        radio.sendString("LL")
    } else {
        // P2 = 조이스틱 Y축(상하), P1 = 조이스틱 X축(좌우)
        if (pins.analogReadPin(AnalogReadWritePin.P2) > 800) {
            radio.sendString("F")
        } else if (pins.analogReadPin(AnalogReadWritePin.P2) < 50) {
            radio.sendString("B")
        } else if (pins.analogReadPin(AnalogReadWritePin.P1) < 475 && (pins.analogReadPin(AnalogReadWritePin.P2) > 100 && pins.analogReadPin(AnalogReadWritePin.P2) < 800)) {
            radio.sendString("L")
        } else if (pins.analogReadPin(AnalogReadWritePin.P1) > 525 && (pins.analogReadPin(AnalogReadWritePin.P2) > 100 && pins.analogReadPin(AnalogReadWritePin.P2) < 800)) {
            radio.sendString("R")
        } else if (pins.analogReadPin(AnalogReadWritePin.P1) < 450 && pins.analogReadPin(AnalogReadWritePin.P2) < 450) {
            // 대각선 영역 (전진+좌)
            radio.sendString("L")
        } else if (pins.analogReadPin(AnalogReadWritePin.P1) > 550 && pins.analogReadPin(AnalogReadWritePin.P2) < 450) {
            // 대각선 영역 (전진+우)
            radio.sendString("R")
        } else {
            radio.sendString("S")
        }
    }
})
