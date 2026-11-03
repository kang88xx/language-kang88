import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCard, review, isDue, buildQueue, dueCount, newToday } from '../src/core/srs.ts';

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

test('new card is due immediately', () => {
  const c = newCard('zh:vocab:a', T0);
  assert.equal(isDue(c, T0), true);
  assert.equal(c.interval, 0);
});

test('good → 1d → 4d → ease×', () => {
  let c = review(newCard('x', T0), 2, T0);
  assert.equal(c.interval, 1);
  assert.equal(c.due, T0 + DAY);
  c = review(c, 2, c.due);
  assert.equal(c.interval, 4);
  const before = c.interval;
  c = review(c, 2, c.due);
  assert.equal(c.interval, Math.round(before * 2.5));
});

test('again resets interval, lowers ease, reschedules in 10 min', () => {
  let c = review(newCard('x', T0), 3, T0);
  c = review(c, 0, T0 + DAY);
  assert.equal(c.interval, 0);
  assert.equal(c.lapses, 1);
  assert.ok(Math.abs(c.ease - 2.45) < 1e-9); // 2.5 + 0.15(easy) - 0.2(again)
  assert.equal(c.due, T0 + DAY + 600_000);
});

test('ease never drops below 1.3', () => {
  let c = newCard('x', T0);
  for (let i = 0; i < 20; i++) c = review(c, 0, T0 + i);
  assert.equal(c.ease, 1.3);
});

test('queue: due first (oldest), then new up to limit', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const cards = {
    a: { ...newCard('a', T0), due: T0 - 2 * DAY },
    b: { ...newCard('b', T0), due: T0 + DAY }, // 아직
    c: { ...newCard('c', T0), due: T0 - DAY },
  };
  const q = buildQueue(items, cards, T0, 1);
  assert.deepEqual(q.map((i) => i.id), ['a', 'c', 'd']);
});

test('dueCount respects prefix', () => {
  const cards = [{ ...newCard('zh:1', T0) }, { ...newCard('en:1', T0) }, { ...newCard('zh:2', T0), due: T0 + DAY }];
  assert.equal(dueCount(cards, T0, 'zh:'), 1);
  assert.equal(dueCount(cards, T0), 2);
});

test('hard always grows the interval by at least one day', () => {
  let c = review(newCard('x', T0), 2, T0); // 1d
  c = review(c, 1, c.due);                 // 2d
  c = review(c, 1, c.due);
  assert.equal(c.interval, 3);
});

test('newToday counts only first-ever reviews that happened today', () => {
  const noon = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime(); })();
  const r = [
    { itemId: 'a', ts: noon - 3 * DAY, grade: 2 as const }, // 옛날 시작
    { itemId: 'a', ts: noon, grade: 2 as const },           // 오늘 복습이지만 새 카드 아님
    { itemId: 'b', ts: noon, grade: 2 as const },           // 오늘 새로 시작
  ];
  assert.equal(newToday(r, noon), 1);
});
