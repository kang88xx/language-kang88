// 실제 content/zh 와 cards.json 의 정합성. 수업을 새로 가져온 뒤 카드가 어긋나면 여기서 드러난다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { zhVocabItems, zhSentenceItems, zhFixItems, type ZhCard } from '../src/core/convert.ts';
import { hasHan } from '../src/core/notes.ts';
import { shortHash } from '../src/core/hash.ts';

const root = new URL('../content/zh/', import.meta.url);
const read = (f: string) => JSON.parse(readFileSync(new URL(f, root), 'utf8'));
const lessons = readdirSync(new URL('lessons/', root)).filter((f) => f.endsWith('.json')).map((f) => read(`lessons/${f}`));
const vocab = read('vocab.json'), fixes = read('fixes.json');
const list: Array<ZhCard & { id: string }> = read('cards.json');
const cards = Object.fromEntries(list.map((c) => [c.id, c]));
const sentences = zhSentenceItems(lessons, cards), fixItems = zhFixItems(fixes, cards), words = zhVocabItems(vocab);

test('card ids are unique', () => {
  const ids = [...words, ...fixItems, ...sentences].map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(list.map((c) => c.id)).size, list.length);
});

test('every cards.json entry points at an existing card, and each tr still starts its translation', () => {
  const live = new Set([...sentences, ...fixItems].map((i) => i.id.slice('zh:'.length)));
  assert.deepEqual(list.filter((c) => !live.has(c.id)).map((c) => c.id), []);
  const ko = new Map<string, string>();
  for (const l of lessons) for (const it of l.items) if (it.zh && it.ko) ko.set(`sentence:${l.date}-${shortHash(it.zh)}`, it.ko);
  assert.deepEqual(list.filter((c) => c.tr && !ko.get(c.id)?.startsWith(c.tr)).map((c) => c.id), []);
  assert.deepEqual(list.filter((c) => c.id.startsWith('fix:') && !c.front).map((c) => c.id), []);
});

test('sentence cards: Korean prompt without Chinese, Chinese answer', () => {
  assert.ok(sentences.length > 250);
  assert.deepEqual(sentences.filter((i) => hasHan(i.front)).map((i) => `${i.id} ${i.front}`), []);
  assert.deepEqual(sentences.filter((i) => !i.front.trim() || !hasHan(i.back)).map((i) => i.id), []);
});

test('no sentence card swallowed its notes into the prompt', () => {
  const ko = new Map<string, string>();
  for (const l of lessons) for (const it of l.items) if (it.zh && it.ko) ko.set(`zh:sentence:${l.date}-${shortHash(it.zh)}`, it.ko);
  // 해설은 ' / ' 로 이어진다. 해설이 하나도 안 떨어져 나왔는데 원문에 ' / ' 가 있으면 번역 경계를 못 찾은 것이다.
  assert.deepEqual(sentences.filter((i) => !i.extra?.detail && ko.get(i.id)?.includes(' / ')).map((i) => `${i.id} ${i.front}`), []);
});

test('fix cards all ask in Korean (add a front to cards.json when a note has no usable meaning)', () => {
  assert.deepEqual(fixItems.filter((i) => i.front.startsWith('✗') || hasHan(i.front)).map((i) => `${i.id} ${i.front}`), []);
});

test('every lesson word is in the vocab list', () => {
  const known: string[] = vocab.map((v: { zh: string }) => v.zh);
  const missing = lessons.flatMap((l) => (l.words as string[]).map((w) => w.replace(/^\[[^\]]*\]\s*/, '')).filter((w) => !known.some((zh) => w === zh || w.startsWith(`${zh} `))));
  assert.deepEqual(missing, []);
});
