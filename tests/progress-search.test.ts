import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streak, heatmap, dayKey } from '../src/core/progress.ts';
import { matches, matchesAll, normalize } from '../src/core/search.ts';

const DAY = 86_400_000;
const noon = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime(); })();

test('streak counts consecutive days ending today or yesterday', () => {
  const r = (ts: number) => ({ itemId: 'x', ts, grade: 2 as const });
  assert.equal(streak([], noon), 0);
  assert.equal(streak([r(noon)], noon), 1);
  assert.equal(streak([r(noon - DAY), r(noon - 2 * DAY)], noon), 2);
  assert.equal(streak([r(noon - 2 * DAY)], noon), 0);
});

test('heatmap spans weeks*7 cells ending this Saturday', () => {
  const cells = heatmap([{ itemId: 'x', ts: noon, grade: 2 }], 4, noon);
  assert.equal(cells.length, 28);
  assert.equal(cells.find((c) => c.key === dayKey(noon))?.count, 1);
});

test('search ignores tones, case, spaces and punctuation', () => {
  assert.equal(normalize('Jiāo Jiē'), 'jiaojie');
  assert.ok(matches('交接 jiāojiē 인수인계(하다)', 'jiaojie'));
  assert.ok(matches('交接 jiāojiē 인수인계(하다)', '인수 인계'));
  assert.ok(matchesAll('从头再来 cóngtóu zài lái 처음부터', 'congtou 처음'));
  assert.ok(!matchesAll('从头再来', 'congtou 없음'));
});
