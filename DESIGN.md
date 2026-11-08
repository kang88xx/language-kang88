# Design

## Source of truth
- Status: Active. Updated: 2026-11-04.
- Surfaces: home dashboard, shared navigation and controls, Chinese/English study dashboards. Existing study routes inherit the shared visual system.
- Evidence: README.md, PLAN.md, CLAUDE.md, src/layouts/Base.astro, src/styles/{tokens,global}.css, src/pages, src/ui, src/modules/hub.ts, captured home baseline in artifacts/ui.
- Mobbin anchors inspected: [SchoolAI learning home](https://mobbin.com/screens/1726c613-9fba-46db-baa7-1ae6a530b8e9), [Magnific Academy](https://mobbin.com/screens/184b817c-1b7b-402a-94c0-7446612fc6bb). SchoolAI supplies a persistent left navigation and a leading study action; both separate featured learning from categorized content. Magnific is used for academy layout only, not its image-generation domain or branding. [SchoolAI session dashboard](https://mobbin.com/screens/1e4632b3-7192-445e-a6f4-955905044362) informs separation of activity summaries from study content.
- Search did not return a matching Duolingo web screen. Generic analytics results were discarded. No claims about unobserved products.
- Scope assumption: the user's request authorizes a coherent implemented redesign including the shared shell and tokens, without changing content, storage, or routes. Use one targeted direction rather than stopping for variant selection.

## Brand
A quiet personal study desk: clear Korean labels, generous spacing, restrained blue actions. Retain 學 study, Noto/Roboto fonts, red Chinese, blue English, purple interview identity, light/dark themes. Avoid gradients, decorative stock illustrations, fake progress, excessive pills and emoji chrome.

## Product goals
Make the next study action visible, allow direct access to each subject, and keep real learning history readable. Preserve search, review, attendance, TTS, interview answers and backup. No backend, accounts, dependency additions or content-authoring feature in this pass.

## Personas and jobs
A Korean-speaking individual studying Chinese and English and preparing interviews. Arrive, choose a subject or resume due reviews, complete a study action. Use desktop for focused study and phone for short review sessions.

## Information architecture
Desktop: persistent sidebar for home, three subjects and settings; contextual navigation above domain content. Mobile: compact header with visible domain links; current subject section navigation at the bottom. Home: page heading, primary review action and real summary, three study-space cards, 16-week activity history. Existing URLs remain unchanged.

## Design principles
One leading action, secondary information grouped by purpose, visible location and selected state, consistent components. Give study actions precedence over passive metrics. Preserve empty history as zero, never invented data. New home copy: 오늘의 학습, 나의 학습 공간, 학습 기록, and short action labels.

### Implementation moves
1. Promote review entry ahead of statistics: SchoolAI learning home featured action. Add a real review link and show the due count alongside it; retain all four metrics in a quieter summary. Select the subject with most due cards, otherwise start Chinese new-card learning. Selection and wording are local product judgment.
2. Separate navigation from content: SchoolAI and Magnific persistent sidebar. Replace desktop domain pills with sidebar destinations; preserve contextual routes. Mobile adaptation uses existing bottom navigation and visible domain links.
3. Give subject cards a consistent reading order: SchoolAI categorized content and Magnific course cards. Keep titles, content totals and due counts; group title, description, totals and entry action. No borrowed images or data.
4. Group activity history separately: SchoolAI session dashboard summary/content separation. Keep the 16-week heatmap, add readable date context and count legend. Exact heatmap placement and labels are local judgment.
5. Apply the same content hierarchy to domain dashboards, retaining attendance, lesson links and English sample-data notice. Reuse the same tokens and components.

## Visual language
Existing semantic color roles in tokens.css remain authoritative. Pale neutral page canvas, white bordered content surfaces, soft blue focus area, restrained shadows. Stronger title hierarchy, comfortable body line height, 4/8px spacing rhythm, 12–20px card corners. No animation beyond short control transitions. Native text subject marks and small consistent inline SVG navigation icons; no new package or font.

## Components
Base.astro owns sidebar/header/subnavigation/mobile navigation. tokens.css owns all colors, dimensions and type families; global.css owns shared cards, buttons, forms, lists and focus states. Home-specific dashboard styles live with its page. Existing .fc, .heat and data-* selectors remain browser module contracts. Home widgets derive only from existing localStorage records and content collections.

## Accessibility
Target WCAG AA text contrast, visible keyboard focus, skip link, meaningful landmark labels, aria-current, descriptive button labels, comfortably sized targets. Preserve language attributes and reduced-motion support. Heatmap has a text summary and individual dated cell titles. No information communicated exclusively through hue.

## Responsive behavior
Validate 320/375/768/1024/1440 widths. Sidebar appears at 1100px; smaller widths use compact top navigation and bottom section navigation. Home columns stack; subject cards become a single column on phones. Inputs and grids must shrink without page overflow. Bottom navigation reserves safe-area padding. No hover-only controls.

## Interaction states
Local stats start as a dash then update from browser storage. Empty history displays zeros and an invitation to start. Due reviews link to the most-due subject; if none are due, allow a new-card session. Existing filter empty/reset, review completion, answer-save feedback and import errors remain supported. All links use real routes; no decorative controls.

## Content voice
Concise Korean, concrete study terms. English only for established subject identity. Avoid developer paths and implementation instructions in primary study flows; retain existing content-maintenance information inside secondary disclosure when necessary. Never imply cloud sync.

## Implementation constraints
Astro 7.4.5, TypeScript and plain CSS/DOM modules. No new project dependencies. Core SRS, content and storage formats stay unchanged. Capture before/after desktop and mobile views; run core tests, build, responsive/console smoke and review/search/answer/settings interactions. Astro check is optional if its checker is unavailable; disclose a missing validation tool.

## Open questions
- [ ] Future English content-authoring workflow remains in PLAN.md; owner: product; no effect on this visual pass.

### Verification evidence
- Core regression tests: 16 passed. Production build: 24 pages.
- Changed hub TypeScript and its imports: strict `tsc --noEmit` passed using an existing cached compiler.
- Existing `npm run check` cannot perform the full Astro check because `@astrojs/check` is absent. No dependencies were installed or changed.
- Isolated-browser flow checks passed: empty/populated home and review routing, search/reset, month filter, review grading/keyboard/storage, answer versions, interview practice, theme persistence and JSON export.
- Built-site responsive checks: all 24 pages at 320/375/768/1024/1440px light plus eight representative routes at 375/1440px dark (136 combinations); no HTTP failures, page errors or page-level overflow. Physical microphone recording was not exercised.
- Final visual pass also checks heatmap weekday/cell row alignment. Local captures and the portable before/after board are under artifacts/ui.
