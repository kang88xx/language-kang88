# Language — 개인 학습 사이트 설계 (영어 · 중국어 · 면접)

작성일: 2026-11-03. 상태: 프로토타입 완성(0·1단계 + 2·3단계 뼈대). 실행·검증 방법은 README.md.
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
- `chinese.study.kang88.io` → `study.kang88.io/zh` 301 리다이렉트 (`vercel.json`).
- 면접 답변은 경력·개인정보가 포함되므로 **콘텐츠 파일에 넣지 않고 localStorage 에만 저장**한다. 사이트 자체는 공개 URL 이어도 질문 은행만 노출된다. 모범답변까지 파일로 관리하고 싶어지면 그때 Cloudflare Access(무료)를 앞에 둔다.

## 3. 기술 스택

- **Astro 5 + TypeScript**, 정적 출력(`output: 'static'`).
- 콘텐츠: Astro **Content Collections** (`content/` 아래 md/json, zod 스키마로 검증).
- 상호작용 섬(island): 플래시카드·연습 모드·검색·달력만 클라이언트 스크립트. 프레임워크 없이 **바닐라 TS `<script>`** 로 시작하고, 상태가 복잡해지는 화면(면접 연습 모드)만 Preact 섬으로 올린다.
- 스타일: 기존 `styles.css` 의 Material 3 풍 디자인 토큰(`:root` 변수, 블루 #0b57d0, Roboto/Noto Sans KR/Noto Sans SC)을 `src/ui/tokens.css` 로 이관. CSS 프레임워크 없음.
- 음성: Web Speech API `speechSynthesis` (en-US / zh-CN TTS), `MediaRecorder` (면접 녹음, 브라우저 메모리에만 두고 저장 안 함).
- 테스트: `node --test` (코어 로직), Playwright (화면 4개 × 320/375/768/1024/1440px 가로 넘침·메뉴·모달 초점). 기존 QA 체크리스트를 그대로 승계.
- Node 24 (현재 설치됨).

## 4. 디렉터리

```
Language/
├─ content/                       # 원본 데이터. git 관리. 사람이나 스크립트가 편집
│  ├─ zh/
│  │  ├─ lessons/YYYY-MM-DD.json  # 수업 1회 (아래 §5)
│  │  ├─ vocab.json               # 누적 단어
│  │  ├─ calendar.json            # 출석달력 (PROGRESS + CAL)
│  │  └─ fixes.json               # 교정노트 (✗ → ◯)
│  ├─ en/
│  │  ├─ vocab.json
│  │  ├─ expressions.json
│  │  └─ shadowing/*.json         # 문장 묶음
│  └─ interview/
│     └─ questions/*.md           # frontmatter: category, lang, tags, star
├─ src/
│  ├─ core/                       # 도메인 무관 엔진. DOM 의존 없음, node --test 로 검증
│  │  ├─ srs.ts                   # SM-2 변형. grade 0~3 → interval/ease/due
│  │  ├─ progress.ts              # 스트릭, 히트맵, 도메인별 집계
│  │  ├─ storage.ts               # localStorage 어댑터 + 스키마 버전 + export/import
│  │  ├─ search.ts                # 한자·병음·영문·한글 통합 검색(정규화, 성조 제거)
│  │  └─ audio.ts                 # TTS, 녹음 래퍼
│  ├─ ui/                         # 공통 UI: tokens.css, Card, Modal, BottomNav, Heatmap, Flashcard
│  ├─ modules/
│  │  ├─ zh/                      # 달력, 수업기록 뷰, 교정노트
│  │  ├─ en/                      # 쉐도잉 뷰
│  │  └─ interview/               # 연습 모드(타이머·녹음·자가평가), 답변 편집기
│  ├─ content.config.ts           # 컬렉션 zod 스키마
│  ├─ layouts/
│  └─ pages/                      # index, zh/, en/, interview/, settings
├─ scripts/
│  └─ import-chinese-class.ts     # ../Chinese-class/site/data.js → content/zh/*.json (1회 + 재실행 가능)
├─ tests/
├─ vercel.json                    # 리다이렉트
└─ PLAN.md, CLAUDE.md
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

- localStorage 키: `lang.v1.reviews`, `lang.v1.cards`, `lang.v1.interview.answers`, `lang.v1.settings`.
- 모든 쓰기는 `storage.ts` 를 통해서만. 스키마 버전(`v1`)을 두고 마이그레이션 함수를 함께 둔다.
- `/settings` 에서 전체 JSON 내보내기/가져오기(병합: ts 기준 최신 우선). 기기 간 동기화는 이 수동 방식으로 시작하고, 불편해지면 Supabase 로 `storage.ts` 어댑터만 교체한다.

### 5.3 중국어 (`content/zh`) — 기존 `data.js` 와 1:1

- `lessons/YYYY-MM-DD.json`: `{ date, day, n, pct, theme, items: [{ gr, zh, py, ko }], words: string[] }` (현재 `LESSONS` 원소 그대로).
- `vocab.json`: `[{ date, zh, py, ko }]` (현재 `VOCAB` 4-튜플을 객체로).
- `calendar.json`: `{ progress: PROGRESS, months: CAL }`. 여러 수강권을 합칠 때는 `key` 를 `YYYY-MM` 으로 확장(기존 README 의 미해결 항목).
- `fixes.json`: 교정노트는 현재 `LESSONS.items.ko` 안의 "원문 … 교정" 서술에서 추출하는 방식이므로, 이관 때 `{ date, wrong, right, note }` 로 명시 데이터화한다.
- `toItems()`: 단어 → `vocab` 카드(front 한자, back 뜻, extra.pinyin), 문장 → `sentence` 카드(front 한국어, back 중국어+병음), 교정 → `fix` 카드(front ✗, back ◯).

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
| 0 ✅ | Astro 스캐폴드, `core/` + 테스트, `ui/tokens.css` 이관, 허브 페이지 | `npm test` 통과, 빈 도메인 3개 라우팅 |
| 1 ✅ | `import-chinese-class.mjs` → `content/zh`, 중국어 4화면 이관, 복습 탭 추가 | 기존 사이트 기능 동등 + Playwright 검사 통과. 리다이렉트는 Vercel 도메인 연결 때 |
| 2 ◐ | 영어 모듈 (단어·표현·쉐도잉 완료 · **추가 큐 미구현**, 샘플 데이터만) | TTS 재생, 카드 복습, JSON 내보내기 |
| 3 ◐ | 면접 모듈 (질문 은행 → 답변 편집 → 연습 모드 → 녹음 완료 · 질문 9개 샘플) | 연습 1사이클 완주, 답변 버전 저장 |
| 4 | 선택: Supabase 어댑터, Cloudflare Access | — |

## 8. 미결 항목

- 중국어 데이터의 **지속 수집 경로**: 현재 `Chinese-class/tools/fetch_mail.py` 가 md 와 `data.js` 를 만든다. 수강이 10/30 종료(재등록 미정)이므로 당장은 1회 이관으로 충분. 재등록하면 fetch 스크립트 출력 대상을 `Language/content/zh` 로 바꾼다.
- 영어 학습 소스가 무엇인지(교재·앱·회화 수업·기사) 정해지면 `content/en` 스키마와 입력 흐름을 조정.
- 면접 종류(국내 이직, 영어 면접, 기술 면접 비중)에 따라 카테고리 확정.
