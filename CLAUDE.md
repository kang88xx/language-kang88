# Language

개인 학습 사이트: 영어(`/en`) · 중국어(`/zh`) · 면접(`/interview`). 공통 복습 엔진 1개 + 도메인 모듈 3개. Astro 7 + TypeScript 정적 출력.

- 설계서: `PLAN.md` — 작업 전 반드시 읽을 것. 실행·구조·검증 방법은 `README.md`.
- 현재 상태 (2026-11-10): 프로토타입 + 홈/셸 리디자인(DESIGN.md) + 중국어 카드 품질 개선. 24페이지 빌드, 테스트 40개 통과, `npm run check` 0건, `npm run check:ui` 통과. Vercel 프로젝트 `language-kang88`(팀 kang88xxs-projects)에 `main` 자동 배포, https://study.kang88.io 연결 완료. `chinese.study.kang88.io` → `/zh` 리다이렉트는 아직 미적용(기존 프로젝트에 도메인이 남아 있고 그 사이트도 계속 갱신 중).
- 결정: 진도는 localStorage + JSON 내보내기 / 중국어 원본은 `../Chinese-class/site/data.js` 이고 **그 폴더는 수정하지 않는다**(2026-11-10 사용자 결정, 재등록으로 2027-05 까지 수업이 계속 들어옴). `npm run import:zh` 로 가져오며(현재 111회·188단어·26교정), 이쪽에서 필요한 가공은 import 스크립트와 `content/zh/cards.json`(손으로 관리하는 카드 보조 정보)에 둔다.
- 중국어 수업 추가: `npm run import:zh` → 출력된 새 카드 앞면 확인 → 번역이 잘렸거나 ⚠ 가 붙은 것만 `cards.json` 에 `tr`/`front` 추가 → `npm test`. 형식은 README.md.
- 환경 주의: `/mnt/j` 는 Windows 드라이브라 심볼릭 링크 불가 → `npm install --no-bin-links`, 스크립트는 `node node_modules/astro/bin/astro.mjs` 로 호출. `playwright-core` 는 이 기기에 설치된 Chromium 빌드(1248)에 맞춰 1.64.1 로 고정.
- 원칙: 면접 답변 등 개인정보는 콘텐츠 파일·저장소에 넣지 않고 localStorage 에만 둔다. 복습 로직(`src/core`)은 DOM 의존 없이 `node --test` 로 검증한다. 카드 ID(`zh:<type>:<date>-<hash>`)는 진도의 키라 바꾸지 않는다. 화면 변경 후 `npm run build && npm run check:ui` 로 가로 넘침·콘솔 오류·핵심 흐름을 확인한다.
- 다음 할 일: PLAN.md §7 2단계(영어 입력 큐), 3단계 보강(면접 카테고리 확정), 실제 영어 콘텐츠 채우기, `chinese.study.kang88.io` 도메인 이전 시점 결정, 홈 화면 설치(PWA) 여부 결정(PLAN.md §8).
