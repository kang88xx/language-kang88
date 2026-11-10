import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearAll, saveCard, appendReview, saveAnswer, exportAll, importAll, loadCards, loadReviews, loadAnswers, loadMeta, latestAnswer, markExported, backupStatus } from '../src/core/storage.ts';
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

test('latestAnswer returns the last written answer, skipping practice memos', () => {
  assert.equal(latestAnswer(undefined), undefined);
  assert.equal(latestAnswer([{ ts: 1, text: '메모', selfScore: 2 }]), undefined);
  const list = [{ ts: 1, text: '답변 v1' }, { ts: 2, text: '답변 v2' }, { ts: 3, text: '버벅임', selfScore: 1 }];
  assert.equal(latestAnswer(list)?.text, '답변 v2');
});

test('backupStatus: due only when unsaved records have waited longer than the limit', () => {
  const DAY = 86_400_000, t0 = 1_700_000_000_000;
  assert.deepEqual(backupStatus(t0), { due: false, pending: 0, lastExportAt: undefined });
  appendReview({ itemId: 'zh:a', ts: t0, grade: 2 });
  saveAnswer('q', { ts: t0 + 1, text: 'a' });
  assert.equal(backupStatus(t0 + 6 * DAY).due, false);        // 첫 기록에서 아직 7일 안 됨
  assert.deepEqual(backupStatus(t0 + 8 * DAY), { due: true, pending: 2, lastExportAt: undefined });
  markExported(t0 + 8 * DAY);
  assert.deepEqual(backupStatus(t0 + 30 * DAY), { due: false, pending: 0, lastExportAt: t0 + 8 * DAY }); // 새 기록이 없으면 오래돼도 조용히
  appendReview({ itemId: 'zh:a', ts: t0 + 9 * DAY, grade: 2 });
  assert.equal(backupStatus(t0 + 10 * DAY).due, false);
  assert.deepEqual(backupStatus(t0 + 16 * DAY), { due: true, pending: 1, lastExportAt: t0 + 8 * DAY });
});

test('importing into an empty store counts as backed up until the file was made; export data never carries meta', () => {
  appendReview({ itemId: 'zh:a', ts: 10, grade: 2 });
  markExported(20);
  const snap = { ...exportAll(), exportedAt: 20 };
  assert.equal('meta' in snap, false);
  clearAll();
  assert.deepEqual(loadMeta(), {});
  importAll(snap); // merge 지만 비어 있던 저장소
  assert.equal(loadMeta().lastExportAt, 20);
  assert.equal(backupStatus(20 + 100 * 86_400_000).due, false);
  appendReview({ itemId: 'zh:a', ts: 30, grade: 2 });
  importAll({ ...snap, exportedAt: 99 }); // 기록이 있는 곳에 병합하면 백업 시각을 건드리지 않는다
  assert.equal(loadMeta().lastExportAt, 20);
});
