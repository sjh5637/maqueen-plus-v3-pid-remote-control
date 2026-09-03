# CLAUDE.md — maqueenplustv3-remote

micro:bit + Maqueen Plus V2.0 + DFR0536 GamePad 원격 조종 프로젝트.

## 역할 분담 (중요)

- **사용자**: MakeCode(https://makecode.microbit.org/) JavaScript 탭에 코드를 직접 붙여넣고 다운로드/플래시
- **에이전트**: 이 폴더에서 코드 작성·분석. 빌드/업로드 불가 (하드웨어 빌드는 사용자 몫)

## 작성 규칙

- 코드는 MakeCode(Static TypeScript) 문법으로 작성 — 블록 에디터가 읽을 수 있는 표준 변환 가능한 형태 유지
- 확장 라이브러리: `maqueenPlusV2=github:DFRobot/pxt-DFRobot_MaqueenPlus_v20`
- 라디오 그룹: **61** (본체·조정기 동일)
- 조정기 쪽 코드는 확장 라이브러리 미포함 (플레인 micro:bit API + radio만 사용)

## 파일

| 파일 | 대상 하드웨어 | 용도 |
|---|---|---|
| `body-receiver.ts` | Maqueen Plus V2.0 쪽 micro:bit | 라디오 명령 수신 → 모터/LED 제어 |
| `controller-gamepad.ts` | DFR0536 GamePad 쪽 micro:bit | 조이스틱(P1/P2)·A/B버튼 → 명령 송신 |

## 참고 자료

- 확장 소스(main.ts): https://github.com/dfrobot/pxt-dfrobot_maqueenplus_v20/blob/master/main.ts
- GamePad wiki: https://wiki.dfrobot.com/dfr0536/
- GamePad GitHub: https://github.com/DFRobot/DFR0536_GamePad_V3.0_WIKI_EN

## 테스트

- 로컬 빌드 없음. 검증은 사용자가 MakeCode에 붙여넣고 시뮬레이터/실플래시로 확인
- 코드 수정 시: 이 폴더의 .ts 파일과 사용자가 붙여넣을 코드가 항상 동일하게 유지할 것
