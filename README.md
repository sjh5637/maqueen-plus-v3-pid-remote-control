# maqueenplustv3-remote

micro:bit **v2** + **Maqueen Plus V3**(DFRobot) 로봇을 **DFR0536 GamePad V3.0** 조정기로 라디오 조종하는 MakeCode 프로젝트.

엔코더 피드백 PI 제어로 직진 자동 보정, F버튼 캘리브레이션으로 바퀴 개체차 보정비 산출.

## 동작 개요

```
[조정기: GamePad + micro:bit v2]  --radio group 61 (6바이트 버퍼)-->  [본체: Maqueen Plus V3 + micro:bit v2]
  부팅 시 스틱 중심점 캘리브레이션                                     differential mix → 바퀴별 PI 제어
  Y축=비례 전/후진, X축=미세 조향                                     엔코더 실측 cm/s 추종
  A/B=턴 오프셋, E=LED, F=보정                                        수신 두절 1초 → 자동 정지
```

## 파일

| 파일 | 설명 |
|---|---|
| `body-receiver.ts` | 본체(수신) 코드 — Maqueen Plus V3 쪽 micro:bit 에 플래시 |
| `controller-gamepad.ts` | 조정기(송신) 코드 — GamePad 쪽 micro:bit 에 플래시 |
| `reference/maqueenPlusV2.ts` | 확장 라이브러리 소스 (API 참고용, 배포 대상 아님) |
| `docs/specs/` | 설계 스펙 |
| `docs/plans/` | 구현 계획 |
| `docs/makecode-compile-checklist.md` | MakeCode 붙여넣기 전 API 검증 체크리스트 |

## 환경 / 의존성

- MakeCode: https://makecode.microbit.org/ (JavaScript 탭에 코드 붙여넣기)
- 본체 확장: `maqueenPlusV2=github:DFRobot/pxt-DFRobot_MaqueenPlus_v20`
- GamePad 참고: https://wiki.dfrobot.com/dfr0536/ , https://github.com/DFRobot/DFR0536_GamePad_V3.0_WIKI_EN
- 참고: wiki에 GamePad **V3.0** 문서는 없음 (V2.0/V4.0만 있음) — E/F 버튼 핀(P15/P16)은 V4.0 핀맵 가정, 반응 없으면 상수 조정

## 라디오 프로토콜 (그룹 61, 6바이트 버퍼)

`[0]=cmd, [1..2]=int16LE v1, [3..4]=int16LE v2`

| cmd | v1 | v2 | 의미 |
|---|---|---|---|
| `'M'`(77) | base speed −255~255 | steer −255~255 | 조종 (steer 양수=좌회전) |
| `'L'`(76) | — | — | LED 토글 |
| `'C'`(67) | — | — | 직진 캘리브레이션 요청 |

## 조작 방법

| 입력 | 동작 |
|---|---|
| 스틱 위/아래 | 전진/후진 (중심에서 멀수록 빨라짐, 좌우로 치우쳐도 Y축 기준) |
| 스틱 좌/우 (주행 중) | 미세 조향 |
| A / B 버튼 | 좌/우 턴 (주행 중 = 아크 회전, 정지 중 = 제자리 스핀) |
| E 버튼 | LED 토글 |
| F 버튼 | 직진 캘리브레이션 (2초 전진 후 보정비 표시, 예: `#12` = 1.2배) |

부팅: 조정기는 스틱 중심점 측정(`CAL` → 중심값 표시), 본체는 I2C 초기화 후 스마일.

## 튜닝

각 코드 상단 `===== 튜닝 상수 =====` 블록에서 조정:
- 조정기: `DEADZONE`, `MAX_SPEED`, `TRIM_MAX`, `TURN_OFFSET`, `X_STICK_INVERT`
- 본체: `KP`, `KI`, `I_LIMIT`, `FF_GAIN`, `CAL_PWM`, `RX_TIMEOUT_MS` 등

## 알려진 제약

- 엔코더 속도 읽기 상한 51 cm/s (레지스터 0~255 ÷ 5) — 목표 속도는 이 이하에서 유효
- 후진 시 엔코더 부호는 미검증 (첫 실험에서 확인)
- 캘리브레이션은 F버튼으로 언제든 재실행 권장 (배터리 전압 변화 대응)

## 테스트 순서 (실플래시)

1. 조정기 부팅 → `CAL` → 중심값 표시 확인
2. 본체 플래시 → E버튼 LED 토글 확인
3. F버튼 → 전진 2초 후 보정비 표시 확인
4. 스틱 전진 → 직진성 확인, 손으로 바퀴 저항 시 속도 보상 확인 (PI 동작 증거)
5. A/B 아크·스핀, 조정기 전원 off 시 1초 내 자동 정지 확인
