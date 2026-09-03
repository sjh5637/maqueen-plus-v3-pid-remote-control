# PID 라디오 조종 구현 계획

> **For agentic workers:** 이 계획은 인라인 실행 대상 (하드웨어 전용 프로젝트, 사용자가 이미 구현 승인).

**Goal:** 조이스틱 비례 속도 + A/B 합산 턴 + 엔코더 PID 직진 보정 + F버튼 캘리브레이션 원격 조종 2종 완성

**Architecture:** 조정기(송신)는 6바이트 라디오 버퍼로 base/steer 전송. 본체(수신)는 differential mix로 바퀴별 목표 산출, 엔코더 실측과 PI 피드백 + 캘리브레이션 보정비 피드포워드로 구동.

**Tech Stack:** MakeCode Static TypeScript (micro:bit v2), 확장 `maqueenPlusV2` (본체만)

**Spec:** `docs/specs/2026-09-03-pid-remote-design.md`

## Global Constraints

- 라디오 그룹 61, 프로토콜: 6바이트 버퍼 `[0]=cmd('M'=77/'L'=76/'C'=67)`, `[1..2]`=int16LE v1, `[3..4]`=int16LE v2
- steer 양수 = 우바퀴 빨라짐 = 좌회전
- 조정기는 확장 라이브러리 미사용 (플레인 API만)
- 로컬 빌드 불가 → 검증은 스펙 대조 리뷰 + 사용자 실플래시
- enum 확인됨: `MyEnumSwitch.Close=0/Open=1`, `DirectionType2.Left=1/Right=2`, `MyEnumDir.Forward=0/Backward=1`

---

### Task 1: 조정기 (controller-gamepad.ts)

**Files:**
- Modify: `controller-gamepad.ts` (전면 교체)

**Interfaces:**
- Produces: `'M'(speed, steer)` / `'L'` / `'C'` 패킷 (본체 Task 2가 소비)

- [ ] 부팅: E/F 핀 풀업, 그룹 61, 스틱 중심점 32회 샘플 캘리브레이션 → 화면 표시
- [ ] 루프(20ms): E 토글 발사(500ms 디바운스), F 캘리브레이션 발사(2초 디바운스), A/B 턴 오프셋, Y축 비례 속도(데드존 60), X축 trim(전진 중만), `'M'` 전송
- [ ] 리뷰: 스펙 §조정기 대조, 상수 상단 노출 확인
- [ ] Commit

### Task 2: 본체 (body-receiver.ts)

**Files:**
- Modify: `body-receiver.ts` (전면 교체)

**Interfaces:**
- Consumes: Task 1 패킷
- Produces: 구동 출력 (`controlMotor`, `controlMotorStop`, `controlLED`)

- [ ] 수신 핸들러: cmd 3종 디스패치, 캘리브레이션 중 'M' 무시, lastRx 갱신
- [ ] `driveWheel(motor, dirType, target, integ, ratio)`: 목표 8PWM 미만 정지·적분 리셋, 그 외 PI+피드포워드 출력 (0~255 클램프)
- [ ] `runCalibration()`: CAL_PWM 2초 전진, 100ms 간격 속도 샘플 → ratioR=avgL/avgR 클램프 저장, 비프음, 보정비 표시
- [ ] 메인 루프(50ms): 캘리브레이션 요청 처리 → 수신 두절 1초 시 목표 0 → differential mix → 좌 ratio 1.0 / 우 ratioR 구동
- [ ] 리뷰: 스펙 §본체 대조 (PID식, 클램프, 타임아웃, LED 토글)
- [ ] Commit

### Task 3: 문서 갱신

- [ ] README 명령 테이블을 새 프로토콜/버튼 배치로 갱신, Commit
