# Language

개인 학습 사이트: 영어(`/en`) · 중국어(`/zh`) · 면접(`/interview`). 공통 복습 엔진 1개 + 도메인 모듈 3개. Astro 7 + TypeScript 정적 출력.

- 설계서: `PLAN.md` — 작업 전 반드시 읽을 것. 실행·구조·검증 방법은 `README.md`.
- 현재 상태 (2026-11-08): 프로토타입 + 홈/셸 리디자인(DESIGN.md) 완료. 24페이지 빌드, core 단위 테스트 16개 통과. Vercel 프로젝트 `language-kang88`(팀 kang88xxs-projects)에 `main` 자동 배포, https://study.kang88.io 연결 완료. `chinese.study.kang88.io` → `/zh` 리다이렉트는 아직 미적용(기존 프로젝트에 도메인이 남아 있음).
- 결정: 진도는 localStorage + JSON 내보내기 / 기존 `../Chinese-class/site` 데이터는 `npm run import:zh` 로 이관(현재 110회·185단어·26교정) / `chinese.study.kang88.io` 는 `/zh` 로 리다이렉트 예정.
- 환경 주의: `/mnt/j` 는 Windows 드라이브라 심볼릭 링크 불가 → `npm install --no-bin-links`, 스크립트는 `node node_modules/astro/bin/astro.mjs` 로 호출.
- 원칙: 면접 답변 등 개인정보는 콘텐츠 파일·저장소에 넣지 않고 localStorage 에만 둔다. 복습 로직(`src/core`)은 DOM 의존 없이 `node --test` 로 검증한다. 화면 변경 후 375px 가로 넘침과 콘솔 오류를 Playwright 로 확인한다.
- 다음 할 일: PLAN.md §7 2단계(영어 입력 큐), 3단계 보강(면접 카테고리 확정), 실제 영어 콘텐츠 채우기, `chinese.study.kang88.io` 도메인을 `language-kang88` 프로젝트로 옮겨 리다이렉트 활성화.
