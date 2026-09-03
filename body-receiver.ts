// Maqueen Plus V2.0 본체(수신) 코드 — MakeCode JavaScript
// 확장: maqueenPlusV2=github:DFRobot/pxt-DFRobot_MaqueenPlus_v20
// 라디오 그룹 61, 수신 명령으로 모터/LED 제어

radio.onReceivedString(function (receivedString) {
    if (receivedString == "LL") {
        // 좌측 제자리 회전 (우측 전진, 좌측 후진)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, 150)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Backward, 20)
    } else if (receivedString == "RR") {
        // 우측 제자리 회전 (좌측 전진, 우측 후진)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Forward, 149)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Backward, 20)
    } else if (receivedString == "F") {
        // 전진 (좌50 / 우60 — 우측 약간 보정)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Forward, 50)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, 60)
    } else if (receivedString == "B") {
        // 후진
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Backward, 50)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Backward, 60)
    } else if (receivedString == "LEDL") {
        // 좌측 LED 켜기 (끄는 명령 없음)
        maqueenPlusV2.controlLED(maqueenPlusV2.MyEnumLed.LeftLed, maqueenPlusV2.MyEnumSwitch.Open)
    } else if (receivedString == "LEDR") {
        // 우측 LED 켜기
        maqueenPlusV2.controlLED(maqueenPlusV2.MyEnumLed.RightLed, maqueenPlusV2.MyEnumSwitch.Open)
    } else if (receivedString == "L") {
        // 좌회전 (우바퀴 빠르게)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Forward, 19)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, 200)
    } else if (receivedString == "R") {
        // 우회전 (좌바퀴 빠르게)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, 20)
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Forward, 199)
    } else {
        // "S" 포함 — 정지
        maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor)
    }
})

radio.setGroup(61)
maqueenPlusV2.I2CInit()
basic.showIcon(IconNames.Happy)
basic.forever(function () {

})
