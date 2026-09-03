# maqueenplustv3-remote

micro:bit + **Maqueen Plus V2.0**(DFRobot) 로봇을 **DFR0536 GamePad V3.0** 조정기로 라디오 조종하는 MakeCode 프로젝트.

## 동작 개요

```
[조정기: DFR0536 GamePad + micro:bit]  --radio group 61-->  [본체: Maqueen Plus V2.0 + micro:bit]
```

- 조종 방식: 조정기가 문자열 명령(`F`, `B`, `L`, `R`, `LL`, `RR`, `S`, `LEDL`, `LEDR`)을 라디오로 반복 송신
- 본체가 수신한 명령에 따라 모터/LED 제어
- 두 코드 모두 MakeCode(microbit) JavaScript로 작성, 사용자가 직접 https://makecode.microbit.org/ 에 붙여넣어 빌드·플래시

## 파일

| 파일 | 설명 |
|---|---|
| `body-receiver.ts` | 본체(수신) 코드 — Maqueen Plus V2.0 에 플래시 |
| `controller-gamepad.ts` | 조정기(송신) 코드 — GamePad 쪽 micro:bit 에 플래시 |

## 환경 / 의존성

- 하드웨어: micro:bit × 2, Maqueen Plus V2.0 확장보드, DFR0536 GamePad V3.0
- MakeCode 확장: `maqueenPlusV2=github:DFRobot/pxt-DFRobot_MaqueenPlus_v20`
  - 페이지: https://makecode.microbit.org/pkg/dfrobot/pxt-dfrobot_maqueenplus_v20
  - 소스: https://github.com/dfrobot/pxt-dfrobot_maqueenplus_v20
- GamePad 참고: https://wiki.dfrobot.com/dfr0536/ , https://github.com/DFRobot/DFR0536_GamePad_V3.0_WIKI_EN

## 라디오 명령 테이블 (그룹 61)

| 명령 | 동작 | 모터 좌/우 speed |
|---|---|---|
| `F` | 전진 | 전진 50 / 60 |
| `B` | 후진 | 후진 50 / 60 |
| `L` | 좌회전 | 전진 19 / 200 |
| `R` | 우회전 | 전진 199 / 20 |
| `LL` | 제자리 좌스핀 | 좌 후진 20 / 우 전진 150 |
| `RR` | 제자리 우스핀 | 좌 전진 149 / 우 후진 20 |
| `S` | 정지 | 전체 정지 |
| `LEDL` / `LEDR` | 좌/우 LED 켜기 | 끄기 명령 없음 |

조정기 입력 매핑: A버튼=`LL`, B버튼=`RR`, P2(조이스틱 Y) 상하=전후진, P1(조이스틱 X) 좌우=좌우회전. P13~P16 풀업 설정만 있고 미사용.

## 개선 후보 (메모)

- LED 끄기 명령 추가 (`LEDL_OFF` 등)
- 조이스틱 아날로그 값 → 모터 속도 비례 조종 (현재 5단계 고정 속도)
- 수신 두절 시 자동 정지 안전장치 (마지막 명령 계속 유지되는 문제)
- P13~P16 패드 버튼 활용
