# MakeCode 붙여넣기 전 컴파일 검증 체크리스트

로컬 빌드가 불가능하므로(마이크로비트 하드웨어 전용) 코드를 사용자에게 넘기기 전에
아래 항목을 소스 대조로 전부 확인한다. **API 존재 여부를 추측으로 채우지 않는다.**

## 확인 순서

1. **확장 API**: `reference/maqueenPlusV2.ts` (github.com/dfrobot/pxt-DFRobot_MaqueenPlus_v20 의 `maqueenPlusV2.ts`)에서 함수·enum 실재 확인
2. **코어 API**: pxt-microbit 소스(github.com/microsoft/pxt-microbit)에서 확인
   - 라디오 버퍼: `pxt-common-packages/libs/radio/radio.ts`
   - 아이콘: `libs/core/icons.ts`
3. **기존 동작 코드 대조**: 사용자가 실제로 돌리던 코드에 있던 API는 안전. 없던 API만 집중 검증

## 2026-09-03 실제 발생한 에러 (같은 실수 반복 금지)

| 에러 | 원인 | 올바른 사용 |
|---|---|---|
| `Cannot find name 'MyEnumMotor'` 등 19개 | 확장 enum이 `namespace maqueenPlusV2` 안에 있어 bare 이름 불가 | 값·타입 위치 모두 `maqueenPlusV2.MyEnumMotor` 형태로 한정 |
| `radio.readBuffer is not a function` | 함수가 존재하지 않음 | 수신은 `radio.onReceivedBuffer(function (buf: Buffer) {...})` — 버퍼를 콜백 인자로 받음. `radio.sendBuffer(buf)`는 정상 존재 |
| `Property 'ArrowNorth' does not exist` | `IconNames`에 화살표 없음 | 화살표는 `ArrowNames` enum + `basic.showArrow(ArrowNames.North)` |

## 안전한 API 목록 (검증됨)

- 코어: `pins.createBuffer`, `Buffer.setNumber/getNumber`+`NumberFormat`, `pins.analogReadPin/digitalReadPin/setPull`,
  `input.runningTime/buttonIsPressed`, `basic.showString/showIcon/showArrow/forever/pause`, `music.playTone`,
  `Math.min/max/round/idiv`, `""+숫자` 문자열 결합
- 라디오: `radio.setGroup`, `radio.sendBuffer`, `radio.onReceivedBuffer(cb)`, `radio.sendString/onReceivedString`
- 확장(본체 전용): `maqueenPlusV2.I2CInit/controlMotor/controlMotorStop/controlLED/readRealTimeSpeed`,
  `maqueenPlusV2.MyEnumMotor/MyEnumDir/MyEnumLed/MyEnumSwitch/DirectionType2`

## 조정기 코드 특별 규칙

- 조정기는 확장 라이브러리 미설치 프로젝트 → `maqueenPlusV2.*` 참조 자체를 넣지 않는다
- 확장 없는 프로젝트에서 컴파일되는 것 = 코어 API만 사용
