# 설계 스펙 — Maqueen Plus V3 라디오 조종 (PID + 하이브리드 보정)

날짜: 2026-09-03
하드웨어: micro:bit v2 × 2 (nRF52833, Cortex-M4 64MHz FPU, 128KB RAM), Maqueen Plus V3, DFR0536 GamePad V3.0
라디오: 그룹 61

## 목표

1. 엔코더 피드백 기반 직진 보정 (바퀴 개체차 자동 상쇄)
2. 아날로그 스틱: 전/후진만, 중심에서 멀어진 정도에 비례한 속도. 좌우로 치우쳐도 Y축 기준 전/후진
3. A/B 버튼: 스틱 값과 합산되는 턴 오프셋 (전진 중 = 아크 회전, 정지 중 = 제자리 스핀)
4. X축 아날로그 미세 조향 (steer 합산)
5. F버튼: 직진 캘리브레이션 (2초 전진 주행하며 좌/우 실측 → 피드포워드 보정비 산출)
6. E버튼: LED 토글
7. 조정기 부정확성 대응: 부팅 시 스틱 중심점 캘리브레이션 + 데드존
8. 안전: 수신 두절 1초 이상 시 자동 정지

## 라디오 프로토콜 (radio.sendBuffer / readBuffer, 6바이트)

| byte | cmd | 의미 |
|---|---|---|
| 0 | `'M'`(77) | 조종: int16LE @1 = base speed(−255~255), int16LE @3 = steer(−255~255) |
| 0 | `'L'`(76) | LED 토글 |
| 0 | `'C'`(67) | 캘리브레이션 시작 요청 |

steer 부호: 양수 = 우바퀴 빨라짐 = 좌로 휨/좌스핀.

## 조정기 (controller-gamepad.ts)

- 상수: `DEADZONE=60`, `MAX_SPEED=200`, `TRIM_MAX=80`, `TURN_OFFSET=120`, `X_STICK_INVERT=false`
- 부팅: 1초간 스틱 32회 샘플 → 중심점 centerX/centerY 산출, 화면에 표시
- 루프 (20ms):
  - A 버튼: steer += TURN_OFFSET / B 버튼: steer −= TURN_OFFSET (micro:bit 버튼, 기존 코드와 동일 매핑)
  - Y축: |y−centerY| ≤ DEADZONE → base=0. 위(값 작음) → 전진(+), 아래 → 후진(−). 비례 스케일
  - X축: |x−centerX| > DEADZONE 이고 base≠0일 때만 trim = 비례 ±TRIM_MAX
  - steer = trim + 버튼 오프셋 → `'M'` 패킷 전송
  - E(P15) 눌림: `'L'` 1회 전송 (디바운스)
  - F(P16) 눌림: `'C'` 1회 전송 (디바운스), 캘리브레이션 중 조종 무시

## 본체 (body-receiver.ts)

- 상수: `LOOP_MS=50`, `PWM_TO_CMS=5`(255PWM≈51cm/s 선형 근사), `KP=30`, `KI=8`, `I_LIMIT=60`, `FF_GAIN=5`, `RATIO_MIN=0.7`, `RATIO_MAX=1.4`, `CAL_PWM=150`, `CAL_MS=2000`, `RX_TIMEOUT_MS=1000`, `STOP_THRESHOLD=8`
- 수신: `radio.onDataReceived` → readBuffer → cmd 별 base/steer 갱신, LED 토글 플립, 캘리브레이션 플래그
- 제어 루프 (basic.forever + pause(50)):

```
매 50ms:
  if 수신 없음 1초↑ → 목표 0 (안전 정지)
  targetL = base − steer, targetR = base + steer  (±255 클램프)
  if 캘리브레이션 요청 중 → CAL_PWM 고정 전진 2초,
      좌/우 속도 100ms 간격 샘플 평균 → ratioR = avgL/avgR (클램프) 저장, ratioL=1.0
  각 바퀴:
    |target| < STOP_THRESHOLD → controlMotorStop, 적분 리셋
    err = |target|/PWM_TO_CMS − readRealTimeSpeed(바퀴)   (cm/s)
    integ += err·dt, ±I_LIMIT 클램프
    out = FF_GAIN·(|target|/PWM_TO_CMS)·(ratio) + KP·err + KI·integ  → 0~255 클램프
    controlMotor(방향(target 부호), out)
```

- LED: E버튼 토글 — 좌/우 LED 동시 ON/OFF
- 부저: v2 스피커, 캘리브레이션 시작/완료 비프음

## 실측·튜닝 필요값 (첫 테스트 대상)

- E/F 버튼 핀 (게임패드 V3.0 문서 부재 — V4.0 핀맵 C=P13, D=P14, E=P15, F=P16 가정)
- X축 방향 (밀었을 때 steer 부호) — `X_STICK_INVERT` 상수로 반전 가능
- KP/KI/FF_GAIN 초기치 — 현장 튜닝 전제, 상단 상수로 노출

## 테스트

로컬 빌드/실행 불가 (micro:bit 하드웨어 전용). 단계별 현장 테스트:
1. 조정기 부팅 → 중심점 표시 확인
2. 본체 단독: 캘리브레이션 실행 → 비프음/보정 동작 확인
3. F 수동 전진 → 손으로 바퀴 저항 시 속도 상승 확인 (PID 동작 증거)
4. 라디오 조종: 전진 직진성, A/B 아크/스핀, E LED, 수신 두절 자동 정지
