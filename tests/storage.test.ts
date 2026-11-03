import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearAll, saveCard, appendReview, saveAnswer, exportAll, importAll, loadCards, loadReviews, loadAnswers } from '../src/core/storage.ts';
import { newCard, review } from '../src/core/srs.ts';

beforeEach(() => clearAll());

test('round trip export/import (replace)', () => {
  saveCard(newCard('zh:a', 1));
  appendReview({ itemId: 'zh:a', ts: 1, grade: 2 });
  saveAnswer('interview:q1', { ts: 5, text: 'hello' });
  const snap = exportAll();
  clearAll();
  assert.deepEqual(loadCards(), {});
  importAll(snap, 'replace');
  assert.deepEqual(loadCards(), snap.cards);
  assert.deepEqual(loadReviews(), snap.reviews);
  assert.deepEqual(loadAnswers(), snap.answers);
});

test('merge keeps the more advanced card and dedupes reviews/answers', () => {
  const base = newCard('zh:a', 1);
  saveCard(base);
  appendReview({ itemId: 'zh:a', ts: 1, grade: 2 });
  saveAnswer('q', { ts: 1, text: 'v1' });
  const advanced = review(base, 2, 2);
  importAll({ version: 1, exportedAt: 0, cards: { 'zh:a': advanced, 'en:b': newCard('en:b', 3) },
    reviews: [{ itemId: 'zh:a', ts: 1, grade: 2 }, { itemId: 'zh:a', ts: 2, grade: 2 }],
    answers: { q: [{ ts: 1, text: 'v1' }, { ts: 2, text: 'v2' }] }, settings: {} });
  assert.equal(loadCards()['zh:a'].reps, 1);
  assert.ok(loadCards()['en:b']);
  assert.equal(loadReviews().length, 2);
  assert.equal(loadAnswers().q.length, 2);
});

test('rejects unknown version', () => {
  assert.throws(() => importAll({ version: 2 } as never));
});

test('import rejects malformed snapshots before writing anything', () => {
  saveCard(newCard('zh:a', 1));
  assert.throws(() => importAll({ version: 1, exportedAt: 0, cards: { 'zh:b': {} as never }, reviews: [], answers: {}, settings: {} }), /cards/);
  assert.throws(() => importAll({ version: 1, exportedAt: 0, cards: {}, reviews: {} as never, answers: {}, settings: {} }), /reviews/);
  assert.throws(() => importAll({ version: 1, exportedAt: 0, cards: {}, reviews: [], answers: { q: 'x' as never }, settings: {} }), /answers/);
  assert.deepEqual(Object.keys(loadCards()), ['zh:a']);
});
