# 學 study — 개인 학습 사이트 (중국어 · 영어 · 면접)

Astro 정적 사이트. 공통 복습 엔진 1개(`src/core`) + 도메인 모듈 3개(`/zh`, `/en`, `/interview`).
설계와 로드맵은 `PLAN.md`, 작업 규칙은 `CLAUDE.md`.

## 실행

```sh
npm install --no-bin-links   # /mnt/j (Windows 드라이브) 는 심볼릭 링크를 못 만들어 --no-bin-links 필요
npm run dev                  # http://localhost:4321
npm run build && npm run preview
npm test                     # src/core 단위 테스트 (node --test, TS 직접 실행)
npm run import:zh            # ../Chinese-class/site/data.js → content/zh/*.json 재이관
```

## 구조

- `content/` 원본 데이터. `zh/` 는 import 스크립트 산출물, `en/` 과 `interview/questions/*.md` 는 손으로 편집.
- `src/core/` DOM 없는 엔진: `srs.ts`(SM-2 변형), `storage.ts`(localStorage v1 + 내보내기/병합), `progress.ts`(스트릭·히트맵), `search.ts`(성조 무시 검색), `audio.ts`(TTS·녹음), `convert.ts`(콘텐츠 → 카드).
- `src/modules/` 브라우저 섬: `review.ts` 플래시카드, `practice.ts` 면접 연습, `answers.ts` 답변 버전, `filter.ts` 목록 검색, `settings.ts`, `shadowing.ts`, `hub.ts`.
- `src/pages/` 라우트, `src/ui/` 공통 컴포넌트, `src/styles/tokens.css` 디자인 토큰(기존 중국어 사이트 승계, 다크 모드 포함).

## 진도 데이터

모든 복습 기록과 면접 답변은 **이 브라우저의 localStorage** (`lang.v1.*`) 에만 저장됩니다. 다른 기기로 옮기려면 설정 → JSON 내보내기 → 가져오기(병합). 면접 답변은 저장소나 콘텐츠 파일에 넣지 않습니다.

## 확인 방법

빌드 후 Playwright 로 16개 화면을 375px 에서 열어 가로 넘침·콘솔 오류를 확인하고, 플래시카드(정답 → 평가 → 다시 큐잉, 키보드 Space/1~4), 검색·월 필터, 답변 저장, 연습 모드 1사이클, 설정 집계를 점검합니다. 데스크톱 1280px 스크린샷도 함께 확인합니다.

## 배포

Vercel, `main` 푸시 시 자동. 도메인 `study.kang88.io`. `vercel.json` 의 리다이렉트는 `chinese.study.kang88.io` 를 이 프로젝트에 추가 도메인으로 붙였을 때 `/zh` 로 보냅니다.
