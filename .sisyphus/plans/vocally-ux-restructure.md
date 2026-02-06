# Vocally UX Restructure Plan (v2)

> **Goal**: Voquill → Vocally 리브랜딩에 맞춰 데스크톱 앱의 UX 구성(레이아웃, 배치, 위계)을 개선한다. 대규모 리디자인 없이, 기존 MUI + 디자인 토큰 유지하면서 구조적 재배치에 집중.

## Scope

- **In scope**: 데스크톱 앱 구성 변경, 사용자에게 보이는 텍스트의 Vocally 브랜딩 통일
- **Out of scope**: 새로운 디자인 시스템 구축, MUI 탈피, 새 기능 추가, Rust 레이어 변경, 내부 식별자/이벤트명/DB 파일명(`voquill.db`) 변경

---

## Phase 1: 브랜딩 정리 (선행 작업)

**현재 문제**: 코드 내 "Voquill" 텍스트가 사용자에게 노출되는 곳이 다수 존재. 이후 Phase에서 새 코드 작성 시 네이밍 혼란 방지를 위해 먼저 정리.

### Task 1.1: 사용자 노출 텍스트 "Voquill" → "Vocally" 치환

**범위 정의**:

- **치환 대상**: UI에 렌더링되는 텍스트만 (defaultMessage, 제목, 설명문 등)
- **치환 제외**: 파일명(`VoquillCloudSetting.tsx` 등), 이벤트명(`voquill:google-auth`), Rust 상수, DB 파일명, 패키지명 — 이것들은 별도 마이그레이션 계획 필요
- **영향 파일 (데스크톱, 약 15개 .tsx)**: `VoquillCloudSetting.tsx`, `TermsNotice.tsx`, `MicrophoneDialog.tsx`, `UpdateDialog.tsx`, `UpgradePlanDialog.tsx`, `HomePage.tsx`("Voquill handles it") 등
- **영향 파일 (웹)**: 이미 대부분 "Vocally"로 변경됨, 메타데이터/OG 태그 최종 확인

### Task 1.2: i18n 동기화

- 텍스트 변경 후 `npm run i18n:extract` (데스크톱) 실행
- `npm run i18n:sync` 로 한국어 등 다른 locale 파일 업데이트
- 웹도 동일: `apps/web`에서 `npm run i18n:extract && npm run i18n:sync`

**검증**:

- `grep -r "Voquill" apps/desktop/src/ apps/web/src/ --include="*.tsx" --include="*.ts"` 결과에서 **사용자 노출 텍스트 0건**
- 내부 식별자(이벤트명, import 경로 등)는 남아있어도 OK
- i18n JSON 파일이 정상 생성됨

**난이도**: 소

---

## Phase 2: Sidebar 위계 정리

**현재 문제**: Home, History, Dictionary, Styles가 동등한 레벨 (+ 주석 처리된 Apps). 사용 빈도와 위계가 반영되지 않음.

### Task 2.1: 메뉴 그룹핑

**변경 내용**:

- **주요 메뉴**: Home, History (상단 그룹)
- **도구 메뉴**: Dictionary, Styles (하단 그룹)
- 두 그룹 사이에 MUI `Divider` 또는 8px spacing + 작은 라벨("Tools") 추가
- Settings는 기존처럼 하단 고정 유지
- 주석 처리된 Apps 항목: 현재 상태 유지 (추후 활성화 시 도구 그룹에 배치)

**파일 영향**:

- `apps/desktop/src/components/dashboard/DashboardMenu.tsx` — `navItems` 배열을 `primaryNavItems` + `toolNavItems`로 분리, 렌더링에 구분선 추가

**검증**:

- 사이드바에서 Home/History와 Dictionary/Styles 사이에 시각적 구분이 보임
- 모든 메뉴 항목 클릭 시 정상 라우팅
- sm 이하 breakpoint에서 sidebar 숨김 동작 유지

**난이도**: 소

---

## Phase 3: Home 페이지 재구성

**현재 문제**: Home이 "Welcome, {name}" + 월간 통계 + "Try it out" 텍스트 필드로 구성. 핵심 가치(음성→텍스트 결과)를 보여주지 못함.

### Task 3.1: "Try it out" 섹션 제거

**결정**: 제거한다. 이유: (1) 실제 음성 입력은 overlay/hotkey로 동작하므로 텍스트 필드는 실질적 가치 없음, (2) 공간을 더 유용한 정보에 할당.

**삭제 대상**: `HomePage.tsx`의 `<Section title="Try it out">` 블록 전체 (DictationInstruction + TextField)

### Task 3.2: 최근 트랜스크립션 미리보기 추가

**데이터 전략**: 새 state slice를 만들지 않는다. 기존 global store의 `transcriptionById` + `transcriptions.transcriptionIds`를 재활용.

**로딩 전략**: `HomeSideEffects.tsx`에서 `getTranscriptionRepo().listTranscriptions({ limit: 5 })`를 호출하고, 결과를 기존 `transcriptionById` map에 merge + 별도 `home.recentIds: string[]`만 추가.

**구체적 변경**:

1. `apps/desktop/src/state/app.state.ts`에 `home: { recentIds: string[] }` 추가 (최소한의 state)
2. `apps/desktop/src/components/home/HomeSideEffects.tsx`에 최근 트랜스크립션 로딩 로직 추가
3. 새 컴포넌트 `apps/desktop/src/components/home/RecentTranscriptions.tsx` — 최근 3~5개 트랜스크립션을 컴팩트 리스트로 표시, "View all" 링크로 `/dashboard/transcriptions` 이동
4. **빈 상태 처리**: 트랜스크립션 0건일 때 "Start dictating to see your history here" 메시지 표시

**중복 로딩 방지**: `transcriptionById`는 global map이므로 Home에서 로드한 데이터는 History 이동 시에도 유지됨. History 페이지의 `TranscriptionsSideEffects`는 전체 목록을 다시 로드하므로 충돌 없음 (전체 목록이 부분 목록을 상위집합으로 덮어씀).

### Task 3.3: 통계 + 레이아웃 조정

- 인사말 + 통계(`Stat` 컴포넌트 2개)를 한 줄로 컴팩트하게 배치
- 아래에 `RecentTranscriptions` 컴포넌트 배치
- 빠른 접근 카드는 **이번 scope에서 제외** (Quick-access cards for Dictionary/Styles는 데이터 정의가 불명확하고, 실질적 가치 대비 복잡도가 높음)

**파일 영향**:

- `apps/desktop/src/state/app.state.ts` — `home.recentIds` 추가
- `apps/desktop/src/components/home/HomePage.tsx` — Try it out 제거, RecentTranscriptions 추가
- `apps/desktop/src/components/home/HomeSideEffects.tsx` — 트랜스크립션 로딩 추가
- `apps/desktop/src/components/home/Stat.tsx` — 레이아웃 소폭 조정
- 신규: `apps/desktop/src/components/home/RecentTranscriptions.tsx`

**검증**:

- Home 진입 시 최근 트랜스크립션이 표시됨 (기존 기록이 있는 경우)
- 트랜스크립션 0건일 때 빈 상태 메시지 표시
- "View all" 클릭 시 History 페이지로 이동
- History 페이지 이동 후 데이터 정상 표시 (중복 로딩 없이)
- `npm run check-types` 통과

**난이도**: 중

---

## Phase 4: Settings 시각적 정리

**현재 문제**: Settings의 4개 섹션(General, Processing, Advanced, Danger Zone)이 플랫 리스트로 나열. 구분이 약하고 스캔하기 어려움.

### Task 4.1: 섹션 시각적 강화

**변경 내용**:

- 각 `Section`을 MUI `Paper variant="flat"` (기존 level1 배경) 으로 감싸서 카드 형태로 분리
- 섹션 간 spacing을 현재보다 넓게 (예: `mb: 4` → `mb: 6`)
- Processing 섹션 내 AI 관련 항목 3개 (AI transcription, AI post processing, Agent mode)를 하위 그룹으로 묶기 — MUI `Box`로 indent 또는 subtle background 차이

### Task 4.2: 자주 쓰는 설정 상단 배치

- General 섹션 내에서 순서 조정: Microphone → Hotkey shortcuts → Audio → App language → Start on startup → More settings
- 기존 순서: App language → Start on startup → Microphone → Audio → Hotkey shortcuts → More settings

**파일 영향**:

- `apps/desktop/src/components/settings/SettingsPage.tsx` — 섹션 래핑, 순서 조정
- `apps/desktop/src/components/common/Section.tsx` — 선택적으로 카드 스타일 variant 추가

**검증**:

- Settings 각 섹션이 시각적으로 구분된 카드로 표시
- AI 관련 설정 3개가 하나의 그룹으로 인식 가능
- Microphone, Hotkey가 General 섹션 상단에 위치
- 모든 기존 설정 항목이 정상 동작 (Dialog 열림/닫힘)
- `npm run check-types` 통과

**난이도**: 중

---

## 삭제된 항목

### ~~Header 마이크 컨트롤~~ (삭제)

- **사유**: "구성 변경"이 아닌 "새 기능" — Header에 현재 마이크 인식 기능이 없으므로 새 인터랙티브 컨트롤 + 새 state subscription 필요. 범위 위반.

### ~~Home 빠른 접근 카드~~ (삭제)

- **사유**: Dictionary 단어 수, Styles 설정 요약의 데이터 정의가 불명확. 실질적 가치 대비 구현 복잡도 높음. 추후 별도 계획.

---

## 실행 순서

| 순서 | Phase                  | 영향도 | 난이도 | 이유                                          |
| ---- | ---------------------- | ------ | ------ | --------------------------------------------- |
| 1    | Phase 1: 브랜딩 정리   | 소     | **소** | 선행 필수 — 이후 새 코드의 네이밍 일관성 확보 |
| 2    | Phase 2: Sidebar 위계  | 중     | **소** | 가장 작은 구조 변경, 즉각 효과                |
| 3    | Phase 3: Home 재구성   | **대** | **중** | 가장 큰 UX 개선, state 추가 포함              |
| 4    | Phase 4: Settings 정리 | 중     | **중** | 독립적, 시각적 개선                           |

## 리스크

| 리스크                        | 대응                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Home 트랜스크립션 로딩 타이밍 | `HomeSideEffects`에서 mount 시 로드, `transcriptionById` global map 재활용으로 cross-slice 충돌 방지 |
| 반응형 Sidebar                | sm 이하에서 sidebar 숨김 기존 동작 확인, 그룹핑이 모바일 drawer에도 적용되는지 테스트                |
| i18n 깨짐                     | Phase 1에서 텍스트 변경 후 반드시 extract + sync 실행                                                |
| Settings 리팩토링 영향        | 기존 Dialog 열기 로직은 변경하지 않음, 순서/래핑만 변경                                              |

---

_Created: 2026-02-06_
_Revised: 2026-02-06 (Momus review feedback 반영)_
_Status: Revised — ready for re-review_
