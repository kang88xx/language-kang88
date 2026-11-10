// 빌드 결과(dist/)를 띄워 화면을 점검한다.
//   1) 모든 페이지 × 320/375/768/1024/1440px: 응답, 콘솔 오류, 가로 넘침
//   2) 핵심 흐름: 복습(단어·교정·문장 카드), 수업 검색, 면접 답변·연습, 백업 알림
// 사용: npm run build && npm run check:ui [-- --shots <폴더>]
// Chromium 이 없으면 먼저: node node_modules/playwright-core/cli.js install chromium
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { join, extname, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(join(dist, 'index.html'))) { console.error('dist/ 가 없습니다. 먼저 npm run build 를 실행하세요.'); process.exit(1); }
const shotsAt = process.argv.indexOf('--shots');
const shots = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer((req, res) => {
  let file = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(dist) || !existsSync(file)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const base = `http://127.0.0.1:${server.address().port}`;

const routes = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name === 'index.html') routes.push('/' + relative(dist, dir).split(sep).filter(Boolean).map((s) => s + '/').join(''));
  }
})(dist);
routes.sort();

const WIDTHS = [320, 375, 768, 1024, 1440];
const DAY = 86_400_000;
const failures = [];
const fail = (where, what) => { failures.push(`${where}: ${what}`); console.log(`  ✗ ${where}: ${what}`); };
let checks = 0;
const expect = (ok, where, what) => { checks++; if (!ok) fail(where, what); };

const browser = await chromium.launch();

/** 새 저장소로 시작하는 페이지. 우리 서버에서 난 콘솔 오류만 모은다(외부 글꼴 실패는 화면 문제가 아니다). */
async function open(width = 375, seed = {}) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, acceptDownloads: true });
  await context.addInitScript((data) => { for (const [k, v] of Object.entries(data)) if (localStorage.getItem(k) === null) localStorage.setItem(k, JSON.stringify(v)); }, seed);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && (m.location().url || base).startsWith(base)) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const go = async (path) => { const res = await page.goto(base + path, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready); return res; };
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const shot = async (name) => { if (shots) await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true }); };
  const store = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
  return { page, errors, go, overflow, shot, store, close: () => context.close() };
}
const hasHan = (s) => /[\u3400-\u9fff]/.test(s);

// ── 1) 모든 페이지 × 폭
console.log(`페이지 ${routes.length}개 × 폭 ${WIDTHS.length}개`);
{
  const t = await open(WIDTHS[0]);
  for (const route of routes) {
    t.errors.length = 0;
    const res = await t.go(route);
    expect(res?.ok(), route, `HTTP ${res?.status()}`);
    for (const width of WIDTHS) {
      await t.page.setViewportSize({ width, height: 800 });
      const over = await t.overflow();
      expect(over <= 1, `${route} @${width}`, `가로로 ${over}px 넘침`);
    }
    expect(t.errors.length === 0, route, `콘솔 오류: ${t.errors.join(' | ')}`);
  }
  await t.close();
}

// ── 2) 복습: 단어 카드 → 정답 → 평가
console.log('복습 흐름');
const farFuture = (ids) => Object.fromEntries(ids.map((id) => [id, { itemId: id, due: Date.now() + 365 * DAY, interval: 30, ease: 2.5, reps: 3, lapses: 0 }]));
let zhItems = [];
{
  const t = await open(375);
  await t.go('/zh/review/');
  zhItems = await t.page.evaluate(() => JSON.parse(document.querySelector('.fc script[type="application/json"]').textContent));
  const front = await t.page.textContent('.fc-front');
  expect(hasHan(front), 'zh 단어 카드', `앞면이 한자가 아님: ${front}`);
  expect((await t.page.textContent('.fc-card .chip-domain')) === '단어', 'zh 단어 카드', '종류 칩이 한국어가 아님');
  await t.page.keyboard.press('Space');
  await t.page.waitForSelector('.fc-back');
  const subs = await t.page.$$eval('.fc-grades small', (els) => els.map((e) => e.textContent.split(' · ')[0]));
  expect(new Set(subs).size === 4, 'zh 평가 버튼', `간격 표시가 겹침: ${subs.join(', ')}`);
  await t.shot('zh-vocab-revealed');
  await t.page.keyboard.press('3');
  expect((await t.page.textContent('.fc-prog')).startsWith('2 /'), 'zh 평가', '다음 카드로 넘어가지 않음');
  expect(Object.keys(await t.store('lang.v1.cards')).length === 1 && (await t.store('lang.v1.reviews')).length === 1, 'zh 평가', '카드·복습 기록이 1건씩 저장되지 않음');
  expect(t.errors.length === 0, 'zh 복습', `콘솔 오류: ${t.errors.join(' | ')}`);
  await t.close();
}

// 교정 카드: 한국어로 묻고, 정답과 함께 틀렸던 표현을 보여 준다
{
  const t = await open(320, { 'lang.v1.cards': farFuture(zhItems.filter((i) => i.type === 'vocab').map((i) => i.id)) });
  await t.go('/zh/review/');
  const front = await t.page.textContent('.fc-front');
  expect((await t.page.textContent('.fc-card .chip-domain')) === '교정' && !hasHan(front), 'zh 교정 카드', `앞면이 한국어 뜻이 아님: ${front}`);
  await t.page.click('#fc-show');
  expect(hasHan(await t.page.textContent('.fc-back')) && (await t.page.locator('.fc-card .bad').count()) === 1, 'zh 교정 카드', '정답·틀렸던 표현이 함께 보이지 않음');
  expect((await t.overflow()) <= 1, 'zh 교정 카드 @320', '가로 넘침');
  await t.shot('zh-fix-revealed');
  await t.close();
}

// 문장 카드: 번역만 앞면에, 해설은 접어 둔다
{
  const t = await open(320, { 'lang.v1.cards': farFuture(zhItems.filter((i) => i.type !== 'sentence').map((i) => i.id)), 'lang.v1.settings': { newLimit: 400 } });
  await t.go('/zh/review/');
  const total = zhItems.filter((i) => i.type === 'sentence').length;
  expect((await t.page.textContent('.fc-prog')).startsWith(`1 / ${total}`), 'zh 문장 카드', '문장 카드만 남지 않음');
  let withDetail = 0, worst = 0;
  for (let n = 0; n < total; n++) {
    const front = await t.page.textContent('.fc-front');
    if (hasHan(front)) fail('zh 문장 카드', `앞면에 한자: ${front}`);
    await t.page.keyboard.press('Space');
    const more = t.page.locator('.fc-card details.fc-more');
    if (await more.count()) { withDetail++; await more.locator('summary').click(); if (withDetail === 1) await t.shot('zh-sentence-detail'); }
    worst = Math.max(worst, await t.overflow());
    await t.page.keyboard.press('4');
  }
  checks += total;
  expect(worst <= 1, 'zh 문장 카드 @320', `해설을 편 상태에서 가로로 ${worst}px 넘침`);
  expect(withDetail > 80, 'zh 문장 카드', `해설이 있는 카드가 ${withDetail}장뿐`);
  expect((await t.page.textContent('.fc-front')) === '오늘 복습 끝', 'zh 문장 카드', '큐가 끝나지 않음');
  expect(t.errors.length === 0, 'zh 문장 복습', `콘솔 오류: ${t.errors.join(' | ')}`);
  await t.close();
}

// ── 3) 수업 기록 검색
console.log('검색 · 면접 · 백업');
{
  const t = await open(375);
  await t.go('/zh/lessons/');
  const all = await t.page.locator('details.lesson').count();
  await t.page.fill('input[type="search"]', 'jiaojie');
  const hit = await t.page.locator('details.lesson:not(.hidden)').count();
  expect(hit > 0 && hit < all, '수업 검색', `성조 없는 병음 검색 결과 ${hit}/${all}`);
  await t.page.click('[data-reset]');
  expect((await t.page.locator('details.lesson:not(.hidden)').count()) === all, '수업 검색', '초기화가 전체를 되돌리지 않음');
  await t.close();
}

// ── 4) 면접: 답변 저장 → 복습 카드에서 내 답변 확인. 연습 메모는 답변으로 취급하지 않는다.
{
  const t = await open(375);
  await t.go('/interview/review/');
  const [first, second] = await t.page.evaluate(() => JSON.parse(document.querySelector('.fc script[type="application/json"]').textContent));
  const slug = first.id.split(':').pop();
  await t.go(`/interview/q/${slug}/`);
  await t.page.fill('textarea', '점검용 답변 본문');
  await t.page.click('[data-save]');
  expect((await t.page.textContent('.versions')).includes('점검용 답변 본문'), '면접 답변', '저장한 버전이 목록에 없음');
  await t.page.evaluate((id) => { const k = 'lang.v1.interview.answers', a = JSON.parse(localStorage.getItem(k)); a[id].push({ ts: Date.now() + 1, text: '연습 메모', selfScore: 1 }); localStorage.setItem(k, JSON.stringify(a)); }, first.id);
  await t.page.reload();
  expect((await t.page.inputValue('textarea')) === '점검용 답변 본문', '면접 답변', '연습 메모가 답변 입력란을 덮어씀');
  await t.go('/interview/review/');
  await t.page.keyboard.press('Space');
  const mine = t.page.locator('.fc-card details.fc-more');
  expect((await mine.count()) === 1 && (await mine.locator('p').textContent()) === '점검용 답변 본문', '면접 복습', '써 둔 답변이 카드에 보이지 않음');
  await mine.locator('summary').click();
  await t.shot('interview-review-answer');
  await t.page.keyboard.press('3');
  await t.page.keyboard.press('Space');
  const link = t.page.locator('.fc-card a[href^="/interview/q/"]');
  expect((await link.count()) === 1 && (await link.getAttribute('href')) === `/interview/q/${second.id.split(':').pop()}/`, '면접 복습', '답변이 없는 카드에 작성 링크가 없음');
  expect(t.errors.length === 0, '면접', `콘솔 오류: ${t.errors.join(' | ')}`);
  await t.close();
}

// 연습 모드 한 바퀴(녹음 없이): 질문 → 답변 → 써 둔 답변 확인 → 자가평가 → 저장
{
  const t = await open(375);
  await t.page.addInitScript(() => { Math.random = () => 0; }); // 첫 질문이 나오도록 고정
  await t.go('/interview/practice/');
  const q = await t.page.evaluate(() => JSON.parse(document.querySelector('[data-practice] script[type="application/json"]').textContent)[0]);
  await t.page.evaluate((id) => localStorage.setItem('lang.v1.interview.answers', JSON.stringify({ [id]: [{ ts: 1, text: '써 둔 답변' }, { ts: 2, text: '지난 연습 메모', selfScore: 1 }] })), q.id);
  await t.page.selectOption('[name=prep]', '0');
  await t.page.click('[data-begin]');
  await t.page.waitForSelector('.stage [data-start]');
  expect((await t.page.textContent('.stage .q-big')) === q.q, '면접 연습', '첫 질문이 나오지 않음');
  await t.page.click('[data-start]');
  await t.page.click('[data-done]');
  await t.page.waitForSelector('.stage [data-g]');
  expect((await t.page.textContent('.stage details p')) === '써 둔 답변', '면접 연습', '모범답변 자리에 연습 메모가 보임');
  await t.page.fill('[data-note]', '이번 메모');
  await t.page.click('[data-g="2"]');
  await t.page.waitForSelector('.stage [data-start]');
  const saved = (await t.store('lang.v1.interview.answers'))[q.id];
  expect((await t.store('lang.v1.cards'))[q.id]?.reps === 1 && saved.length === 3 && saved[2].selfScore === 2, '면접 연습', '평가·메모가 저장되지 않음');
  expect(t.errors.length === 0, '면접 연습', `콘솔 오류: ${t.errors.join(' | ')}`);
  await t.close();
}

// ── 5) 백업 알림: 일주일 넘게 백업 없이 쌓인 기록 → 홈에 알림 → 내보내면 사라짐
{
  const old = Date.now() - 10 * DAY;
  const t = await open(375, { 'lang.v1.reviews': [{ itemId: 'zh:vocab:x', ts: old, grade: 2 }], 'lang.v1.cards': { 'zh:vocab:x': { itemId: 'zh:vocab:x', due: old + DAY, interval: 1, ease: 2.5, reps: 1, lapses: 0 } } });
  await t.go('/');
  const notice = t.page.locator('[data-backup-notice]');
  expect(await notice.isVisible() && (await notice.textContent()).includes('백업한 기록이 아직 없어요'), '백업 알림', '오래된 미백업 기록이 있는데 알림이 없음');
  expect((await t.overflow()) <= 1, '백업 알림 @375', '가로 넘침');
  await t.shot('home-backup-notice');
  await notice.click();
  await t.page.waitForURL('**/settings/');
  expect((await t.page.textContent('[data-last-export]')) === '아직 없음', '설정', '내보낸 적이 없는데 시각이 표시됨');
  const [download] = await Promise.all([t.page.waitForEvent('download'), t.page.click('[data-export]')]);
  const snap = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(snap.version === 1 && snap.reviews.length === 1 && !('meta' in snap), '내보내기', '파일 내용이 예상과 다름');
  expect((await t.page.textContent('[data-last-export]')) !== '아직 없음', '설정', '내보낸 시각이 표시되지 않음');
  await t.go('/');
  expect(await notice.isHidden(), '백업 알림', '내보낸 뒤에도 알림이 남음');
  expect(t.errors.length === 0, '백업', `콘솔 오류: ${t.errors.join(' | ')}`);
  await t.close();
}
{
  const t = await open(375);
  await t.go('/');
  expect(await t.page.locator('[data-backup-notice]').isHidden(), '백업 알림', '기록이 없는데 알림이 보임');
  await t.close();
}

await browser.close();
server.close();
console.log(failures.length ? `\n실패 ${failures.length}건 / 확인 ${checks}건` : `\n확인 ${checks}건 모두 통과`);
process.exit(failures.length ? 1 : 0);
