# 學 study — 개인 학습 사이트 (중국어 · 영어 · 면접)

Astro 정적 사이트. 공통 복습 엔진 1개(`src/core`) + 도메인 모듈 3개(`/zh`, `/en`, `/interview`).
설계와 로드맵은 `PLAN.md`, 작업 규칙은 `CLAUDE.md`.

## 실행

```sh
npm install --no-bin-links   # /mnt/j (Windows 드라이브) 는 심볼릭 링크를 못 만들어 --no-bin-links 필요
npm run dev                  # http://localhost:4321
npm run build && npm run preview
npm test                     # 단위 테스트 + content 정합성 (node --test, TS 직접 실행)
npm run check                # astro check 타입 검사
npm run check:ui             # 빌드 결과 화면 점검 (Playwright). 먼저 npm run build
npm run import:zh            # ../Chinese-class/site/data.js → content/zh/*.json 재이관 (원본은 읽기만)
```

## 구조

- `content/` 원본 데이터. `zh/` 는 import 스크립트 산출물(단 `zh/cards.json` 은 손으로 관리), `en/` 과 `interview/questions/*.md` 는 손으로 편집.
- `src/core/` DOM 없는 엔진: `srs.ts`(SM-2 변형), `storage.ts`(localStorage v1 + 내보내기/병합 + 백업 알림), `progress.ts`(스트릭·히트맵), `search.ts`(성조 무시 검색), `audio.ts`(TTS·녹음), `convert.ts`(콘텐츠 → 카드), `notes.ts`(수업 노트의 번역/해설 분리).
- `src/modules/` 브라우저 섬: `review.ts` 플래시카드, `practice.ts` 면접 연습, `answers.ts` 답변 버전, `filter.ts` 목록 검색, `settings.ts`, `shadowing.ts`, `hub.ts`.
- `src/pages/` 라우트, `src/ui/` 공통 컴포넌트, `src/styles/tokens.css` 디자인 토큰(기존 중국어 사이트 승계, 다크 모드 포함).

## 중국어 수업 추가

원본은 `../Chinese-class` 이고 이 저장소에서는 고치지 않습니다. 새 수업이 원본에 들어오면:

1. `npm run import:zh` — 바뀐 수업의 카드 앞면이 출력됩니다.
2. 앞면을 훑어봅니다. 수업 노트 `ko` 는 "번역. 해설 / 해설" 한 덩어리라, 중국어 문장 수만큼의 한국어 문장을 번역(앞면)으로 자동 분리합니다. 번역이 잘렸거나 `⚠` 가 붙은 카드만 `content/zh/cards.json` 에 적습니다.
   - `{ "id": "sentence:<date>-<hash>", "tr": "ko 의 앞부분 그대로, 번역이 끝나는 곳까지" }` — 분리 위치만 바로잡을 때
   - `{ "id": "sentence:…", "front": "새 앞면" }` — 번역이 중국어 일부를 빠뜨렸거나 정답 한자가 드러날 때
   - `{ "id": "fix:<date>-<hash>", "front": "한국어 뜻" }` — 교정 노트가 뜻이 아니라 어법 설명으로 시작할 때
3. `npm test` — 카드 ID 중복, `cards.json` 의 짝·경계, 앞면의 한자 노출을 검사합니다.

## 진도 데이터

모든 복습 기록과 면접 답변은 **이 브라우저의 localStorage** (`lang.v1.*`) 에만 저장됩니다. 다른 기기로 옮기려면 설정 → JSON 내보내기 → 가져오기(병합). 면접 답변은 저장소나 콘텐츠 파일에 넣지 않습니다. 내보내지 않은 기록이 7일 넘게 쌓이면 홈에 백업 알림이 뜹니다.

## 확인 방법

`npm test`, `npm run check`, 그리고 `npm run build && npm run check:ui`. 화면 점검은 모든 페이지를 320/375/768/1024/1440px 로 열어 가로 넘침·콘솔 오류를 보고, 단어·교정·문장 카드(정답 → 평가, 키보드 Space/1~4), 수업 검색, 면접 답변 저장과 복습 카드 표시, 연습 모드 한 바퀴, 백업 알림 → 내보내기를 실제로 눌러 봅니다. `-- --shots <폴더>` 를 붙이면 주요 화면을 PNG 로 남깁니다. Chromium 이 없으면 `node node_modules/playwright-core/cli.js install chromium`. 마이크 녹음(연습 모드·쉐도잉)과 TTS 는 자동 점검에 없으니 바꿨다면 직접 확인합니다.

## 배포

Vercel, `main` 푸시 시 자동. 도메인 `study.kang88.io`. `vercel.json` 의 리다이렉트는 `chinese.study.kang88.io` 를 이 프로젝트에 추가 도메인으로 붙였을 때 그 호스트의 모든 경로를 `/zh/` 로 보냅니다.
