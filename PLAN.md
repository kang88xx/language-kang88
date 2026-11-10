# Language — 개인 학습 사이트 설계 (영어 · 중국어 · 면접)

작성일: 2026-11-03. 상태: 프로토타입 완성(0·1단계 + 2·3단계 뼈대). 실행·검증 방법은 README.md.
갱신 2026-11-10: 중국어 카드 품질 개선(번역·해설 분리, 교정 카드 방향 전환), 수강 재등록 반영, 타입 검사·화면 점검 스크립트 추가.
결정 사항: **Astro + TypeScript / 진도 저장은 localStorage + JSON 내보내기 / 기존 chinese.study.kang88.io 는 `/zh` 로 흡수.**

## 1. 목표

- 개인용. 영어·중국어 학습과 개인 면접 준비를 한 사이트에서 관리한다.
- 세 영역은 겉모습만 다르고 학습 원형이 같다: **항목(카드) → 복습 → 진도 기록**.
  따라서 사이트 3개가 아니라 **공통 엔진 1개 + 도메인 모듈 3개**로 만든다.
- 기존 `Chinese-class/site`(바닐라 HTML/JS, Vercel)의 기능과 데이터를 손실 없이 `/zh` 로 가져온다.

## 2. URL · 배포

| 경로 | 내용 |
|------|------|
| `/` | 허브. 도메인 3개 카드 + 오늘 복습해야 할 카드 수 + 스트릭 |
| `/zh/…` | 중국어: 대시보드(진도·출석달력), 수업기록, 단어장, 교정노트, 복습 |
| `/en/…` | 영어: 단어장, 표현(콜로케이션), 쉐도잉, 복습 |
| `/interview/…` | 면접: 질문 은행, 답변 작성, 연습 모드, 복습 |
| `/settings` | 진도 JSON 내보내기/가져오기, TTS 음성 선택, 테마 |

- 배포: Vercel, `main` 푸시 → 자동 배포. 도메인 `study.kang88.io` (kang88.io 는 Vercel DNS 와일드카드, 별도 설정 불필요).
- `chinese.study.kang88.io` 의 모든 경로 → `study.kang88.io/zh/` 영구 리다이렉트 (`vercel.json`). 기존 사이트는 루트 한 페이지뿐이라 루트도 함께 보낸다. 도메인을 이 프로젝트로 옮겨야 활성화된다.
- 면접 답변은 경력·개인정보가 포함되므로 **콘텐츠 파일에 넣지 않고 localStorage 에만 저장**한다. 사이트 자체는 공개 URL 이어도 질문 은행만 노출된다. 모범답변까지 파일로 관리하고 싶어지면 그때 Cloudflare Access(무료)를 앞에 둔다.

## 3. 기술 스택

- **Astro 7 + TypeScript**, 정적 출력(`output: 'static'`).
- 콘텐츠: Astro **Content Collections** (`content/` 아래 md/json, zod 스키마로 검증).
- 상호작용 섬(island): 플래시카드·연습 모드·검색·달력만 클라이언트 스크립트. 프레임워크 없이 **바닐라 TS `<script>`** 로 시작하고, 상태가 복잡해지는 화면(면접 연습 모드)만 Preact 섬으로 올린다.
- 스타일: 기존 `styles.css` 의 Material 3 풍 디자인 토큰(`:root` 변수, 블루 #0b57d0, Roboto/Noto Sans KR/Noto Sans SC)을 `src/styles/tokens.css` 로 이관. CSS 프레임워크 없음. 화면 규칙은 `DESIGN.md`.
- 음성: Web Speech API `speechSynthesis` (en-US / zh-CN TTS), `MediaRecorder` (면접 녹음, 브라우저 메모리에만 두고 저장 안 함).
- 테스트: `npm test` (`node --test`, 코어 로직 + content 정합성), `npm run check` (`astro check` 타입 검사), `npm run check:ui` (Playwright: 전 페이지 × 320/375/768/1024/1440px 가로 넘침·콘솔 오류 + 복습·검색·면접 답변·백업 흐름).
- Node 22.23.4 이상 (로컬은 24). 테스트와 import 스크립트는 Node 의 TS 직접 실행에 기댄다. 런타임 의존성은 `astro` 하나, 나머지(`@astrojs/check`, `typescript`, `@types/node`, `playwright-core`)는 개발용.

## 4. 디렉터리

```
Language/
├─ content/                       # 원본 데이터. git 관리
│  ├─ zh/                         # cards.json 만 사람이 편집, 나머지는 import 스크립트 산출물
│  │  ├─ lessons/YYYY-MM-DD.json  # 수업 1회 (아래 §5)
│  │  ├─ vocab.json               # 누적 단어
│  │  ├─ calendar.json            # 출석달력 (PROGRESS + CAL)
│  │  ├─ fixes.json               # 교정노트 (✗ → ◯)
│  │  └─ cards.json               # 카드 보조 정보: 번역 경계(tr)·앞면(front). import 가 건드리지 않음
│  ├─ en/
│  │  ├─ vocab.json
│  │  ├─ expressions.json
│  │  └─ shadowing/*.json         # 문장 묶음
│  └─ interview/
│     └─ questions/*.md           # frontmatter: category, lang, tags, star
├─ src/
│  ├─ core/                       # 엔진. DOM 의존 없음, node --test 로 검증
│  │  ├─ items.ts                 # Item 타입, 도메인·카드 종류 이름
│  │  ├─ convert.ts               # 도메인 콘텐츠 → Item[]
│  │  ├─ notes.ts                 # 수업 노트 가공: 번역/해설 분리, 앞면 한자 제거
│  │  ├─ hash.ts                  # 콘텐츠 기반 안정 ID
│  │  ├─ srs.ts                   # SM-2 변형. grade 0~3 → interval/ease/due
│  │  ├─ progress.ts              # 스트릭, 히트맵, 도메인별 집계
│  │  ├─ storage.ts               # localStorage 어댑터 + 스키마 버전 + export/import + 백업 알림
│  │  ├─ search.ts                # 한자·병음·영문·한글 통합 검색(정규화, 성조 제거)
│  │  └─ audio.ts                 # TTS, 녹음 래퍼 (브라우저 전용)
│  ├─ modules/                    # 브라우저 섬: review, practice, answers, filter, shadowing, tts, hub, settings
│  ├─ ui/                         # 공통 컴포넌트: Flashcard, Search, Empty, Icon, nav.ts
│  ├─ styles/                     # tokens.css, global.css
│  ├─ content.config.ts           # 컬렉션 zod 스키마
│  ├─ layouts/
│  └─ pages/                      # index, zh/, en/, interview/, settings
├─ scripts/
│  ├─ import-chinese-class.mjs    # ../Chinese-class/site/data.js → content/zh (재실행 가능, 원본은 읽기만)
│  ├─ zh-import.ts                # 위 스크립트의 순수 변환부 (연도 추론, 단어 보충)
│  └─ check-ui.mjs                # 빌드 결과 화면 점검 (Playwright)
├─ tests/
├─ vercel.json                    # 리다이렉트
└─ PLAN.md, DESIGN.md, CLAUDE.md, README.md
```

## 5. 데이터 모델

### 5.1 공통 카드 (`Item`) — 복습 엔진이 보는 유일한 형태

```ts
type Domain = 'zh' | 'en' | 'interview';
interface Item {
  id: string;            // `${domain}:${type}:${slug}` 안정적 ID. 복습 기록의 키
  domain: Domain;
  type: string;          // zh: 'vocab'|'sentence'|'fix' / en: 'vocab'|'expression'|'sentence' / interview: 'question'
  front: string;         // 질문 면
  back: string;          // 답 면
  extra?: Record<string, string>; // zh: pinyin / en: ipa, example / interview: hint
  tags: string[];
  source?: { date?: string; lesson?: number; ref?: string };
}
```

도메인 콘텐츠(수업기록·질문 md 등)는 각자 풍부한 형태로 저장하고, 빌드 시 `toItems()` 로 `Item[]` 을 뽑아낸다. 복습 화면은 `Item` 만 안다.

### 5.2 복습 기록 (`Review`, localStorage)

```ts
interface Review { itemId: string; ts: number; grade: 0|1|2|3; }      // 로그(append-only)
interface CardState { itemId: string; due: number; interval: number; ease: number; reps: number; lapses: number; }
```

- localStorage 키: `lang.v1.reviews`, `lang.v1.cards`, `lang.v1.interview.answers`, `lang.v1.settings`, `lang.v1.meta`(이 기기의 마지막 내보내기 시각. 내보내기 파일에는 넣지 않는다).
- 백업 알림: 내보내지 않은 기록이 7일 넘게 쌓이면 허브에 알린다. 첫 저장 때 `navigator.storage.persist()` 로 보존을 요청한다.
- 모든 쓰기는 `storage.ts` 를 통해서만. 스키마 버전(`v1`)을 두고 마이그레이션 함수를 함께 둔다.
- `/settings` 에서 전체 JSON 내보내기/가져오기(병합: ts 기준 최신 우선). 기기 간 동기화는 이 수동 방식으로 시작하고, 불편해지면 Supabase 로 `storage.ts` 어댑터만 교체한다.

### 5.3 중국어 (`content/zh`) — 기존 `data.js` 와 1:1

- `lessons/YYYY-MM-DD.json`: `{ date, day, n, pct, theme, items: [{ gr, zh, py, ko }], words: string[] }` (현재 `LESSONS` 원소 그대로).
- `vocab.json`: `[{ date, zh, py, ko }]` (현재 `VOCAB` 4-튜플을 객체로).
- `calendar.json`: `{ progress: PROGRESS, months: CAL }`. 여러 수강권을 합칠 때는 `key` 를 `YYYY-MM` 으로 확장(기존 README 의 미해결 항목).
- `fixes.json`: 원본 항목의 `fix: { bad, good }` 를 `{ id, date, n, wrong, right, note }` 로 뽑는다.
- `vocab.json`: 원본 `VOCAB` 에 연도가 없어 최신순 정렬로 연도를 추론한다(해를 넘기는 수강 대비). 수업의 '오늘의 단어'에만 있고 `VOCAB` 에 빠진 단어는 import 가 채운다.
- 원본 `ko` 는 "번역. 해설 / 해설" 한 덩어리다. 카드에서는 `core/notes.ts` 가 중국어 문장 수만큼의 한국어 문장을 번역으로 보고 나머지를 해설로 나눈다. 자동 분리가 틀리거나 번역이 앞면으로 부족한 항목만 `cards.json` 에 적는다: `{ id: 'sentence:<date>-<hash>', tr?: 번역 경계(ko 의 앞부분 그대로), front?: 대신 쓸 앞면 }`, `{ id: 'fix:<date>-<hash>', front: 뜻 }`.
- `toItems()`: 단어 → `vocab` 카드(front 한자, back 뜻, extra.pinyin), 문장 → `sentence` 카드(front 한국어 번역, back 중국어, 해설은 접어서), 교정 → `fix` 카드(front 한국어 뜻, back 바른 표현 + 틀렸던 표현. 뜻을 알 수 없으면 ✗ → ◯). 한자가 없는 항목(빈 메일의 `—`)은 카드로 만들지 않는다.
- 수업 추가 절차: `npm run import:zh` → 출력되는 새 카드 앞면 확인 → 필요하면 `cards.json` 보완 → `npm test`(content 정합성 검사 포함).

### 5.4 영어 (`content/en`)

- `vocab.json`: `[{ word, ipa?, ko, example?, tags, added }]`
- `expressions.json`: `[{ phrase, ko, example, register?: 'casual'|'business', tags, added }]`
- `shadowing/*.json`: `{ title, source?, sentences: [{ en, ko }] }` — TTS 재생 → 녹음 → 반복.
- 입력은 초기에 파일 직접 편집. `/en/add` 폼은 localStorage 큐에 쌓고 `/settings` 에서 JSON 으로 내보내 content 에 붙이는 방식(백엔드 없이 입력 경로 확보).

### 5.5 면접 (`content/interview`)

- `questions/*.md` frontmatter: `{ q, category: 'intro'|'career'|'tech'|'behavioral'|'culture', lang: 'ko'|'en'|'zh', tags, star?: boolean, hint? }`. 본문은 답변 작성 가이드(공개 가능한 내용만).
- **내 답변은 localStorage** (`interview.answers[questionId] = [{ ts, text, selfScore }]`, 버전 누적). 콘텐츠 파일에 넣지 않는다.
- 연습 모드: 카테고리·언어 필터 → 랜덤 질문 → 준비 30초 → 답변 타이머(기본 2분) → 녹음(선택, 재생 후 폐기) → 자가평가 0~3 → SRS 에 반영.
- `lang: en|zh` 질문은 해당 어학 모듈 단어장과 태그로 연결(답변 중 쓴 표현을 `/en/vocab` 에 추가하는 버튼).

## 6. 공통 UI 규칙 (기존 사이트 승계)

- 상단 앱바 + 데스크톱 좌측 레일 / 모바일 하단 메뉴. 도메인 전환은 허브(`/`) 또는 앱바 드롭다운.
- 접근성: 모달 초점 순환·Escape·배경 `inert`, 건너뛰기 링크, `prefers-reduced-motion`, 중국어·영어 텍스트에 `lang` 속성, 대비 4.5:1 이상.
- 검색: 허브 검색은 세 도메인 통합, 모듈 내 검색은 해당 도메인만.

## 7. 단계

| 단계 | 내용 | 완료 기준 |
|------|------|-----------|
| 0 ✅ | Astro 스캐폴드, `core/` + 테스트, `styles/tokens.css` 이관, 허브 페이지 | `npm test` 통과, 빈 도메인 3개 라우팅 |
| 1 ✅ | `import-chinese-class.mjs` → `content/zh`, 중국어 4화면 이관, 복습 탭 추가 | 기존 사이트 기능 동등 + Playwright 검사 통과. 리다이렉트는 Vercel 도메인 연결 때 |
| 2 ◐ | 영어 모듈 (단어·표현·쉐도잉 완료 · **추가 큐 미구현**, 샘플 데이터만) | TTS 재생, 카드 복습, JSON 내보내기 |
| 3 ◐ | 면접 모듈 (질문 은행 → 답변 편집 → 연습 모드 → 녹음 완료 · 질문 9개 샘플) | 연습 1사이클 완주, 답변 버전 저장 |
| 4 | 선택: Supabase 어댑터, Cloudflare Access | — |

2026-11-10 보강(단계 번호와 무관): 문장·교정 카드 재설계, 면접 복습 카드에 내 답변 표시, 첫 복습 간격 차등(어려움 1일·보통 2일·쉬움 4일), 백업 알림, `npm run check` / `check:ui`.

## 8. 미결 항목

- ~~중국어 데이터의 지속 수집 경로~~ → 결정(2026-11-10): 재등록(2026-11-10 ~ 2027-05-03, 누적 회차로 이어 감). `Chinese-class` 는 계속 원본이며 **이 프로젝트에서 수정하지 않는다**. 새 수업은 `npm run import:zh` 로 가져오고, 이쪽에서 필요한 가공은 import 스크립트와 `content/zh/cards.json` 에 둔다.
- `chinese.study.kang88.io` 는 기존 사이트가 아직 매일 갱신·배포 중이다. 리다이렉트로 넘길 시점은 미정.
- 홈 화면 설치(PWA): iOS Safari 는 일정 기간 방문이 없으면 사이트 저장소를 지울 수 있고 홈 화면 앱은 예외로 알려져 있으나, 홈 화면 앱은 Safari 와 저장소가 분리된다. 주 사용 기기를 정한 뒤 판단.
- 영어 학습 소스가 무엇인지(교재·앱·회화 수업·기사) 정해지면 `content/en` 스키마와 입력 흐름을 조정.
- 면접 종류(국내 이직, 영어 면접, 기술 면접 비중)에 따라 카테고리 확정.
