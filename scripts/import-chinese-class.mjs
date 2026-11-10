// ../Chinese-class/site/data.js (PROGRESS, CAL, LESSONS, VOCAB) → content/zh/*.json
// 재실행 가능. 원본 폴더는 읽기만 한다. content/zh/cards.json(사람이 관리하는 카드 보조 정보)은 건드리지 않는다.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { buildZhContent } from './zh-import.ts';
import { zhSentenceItems, zhFixItems } from '../src/core/convert.ts';
import { hasHan } from '../src/core/notes.ts';
import { shortHash } from '../src/core/hash.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = process.argv[2] ?? join(root, '..', 'Chinese-class', 'site', 'data.js');
const out = join(root, 'content', 'zh');

const code = readFileSync(src, 'utf8');
const data = vm.runInNewContext(`${code}\n;({ PROGRESS, CAL, LESSONS, VOCAB })`, {}, { filename: src });
const vocabFile = join(out, 'vocab.json');
const prevVocab = existsSync(vocabFile) ? JSON.parse(readFileSync(vocabFile, 'utf8')) : [];
const { lessons, vocab, fixes, calendar, added, unparsed, kept } = buildZhContent(data, prevVocab);

const json = (x) => JSON.stringify(x, null, 1) + '\n';
const lessonsDir = join(out, 'lessons');
mkdirSync(lessonsDir, { recursive: true });
const before = new Map(readdirSync(lessonsDir).filter((f) => f.endsWith('.json')).map((f) => [f, readFileSync(join(lessonsDir, f), 'utf8')]));
const changed = new Set(); // 새로 들어오거나 내용이 바뀐 수업 날짜
for (const l of lessons) {
  const file = `${l.date}.json`, text = json(l);
  if (before.get(file) !== text) { writeFileSync(join(lessonsDir, file), text); changed.add(l.date); }
  before.delete(file);
}
for (const stale of before.keys()) unlinkSync(join(lessonsDir, stale));
writeFileSync(vocabFile, json(vocab));
writeFileSync(join(out, 'fixes.json'), json(fixes));
writeFileSync(join(out, 'calendar.json'), json(calendar));

console.log(`lessons ${lessons.length}, vocab ${vocab.length}, fixes ${fixes.length}, months ${data.CAL.length} → ${out}`);
if (added.length) console.log(`단어장 보충 (수업 단어인데 VOCAB 에 없음): ${added.join(', ')}`);
if (kept.length) console.log(`단어 ID 유지 (원본의 날짜가 달라졌지만 복습 진도를 잇기 위해 예전 ID 를 씀): ${kept.join(', ')}`);
if (unparsed.length) console.log(`⚠ 단어장에 없지만 형식을 읽지 못해 보충하지 못한 단어:\n  ${unparsed.join('\n  ')}`);

// 바뀐 수업의 카드 앞면을 보여 준다. 번역과 해설은 자동으로 나누므로 여기서 한 번 눈으로 확인한다.
const cardsFile = join(out, 'cards.json');
const overlay = existsSync(cardsFile) ? Object.fromEntries(JSON.parse(readFileSync(cardsFile, 'utf8')).map((c) => [c.id, c])) : {};
const items = [...zhSentenceItems(lessons, overlay), ...zhFixItems(fixes, overlay)];
const fresh = items.filter((i) => changed.has(i.source?.date));
if (fresh.length) {
  console.log(`\n바뀐 수업 ${changed.size}회의 카드 앞면 ${fresh.length}장 — 번역이 덜 잘렸거나 ⚠ 가 붙으면 content/zh/cards.json 에 tr/front 를 넣으세요:`);
  for (const i of fresh) {
    const warn = i.type === 'fix' ? (i.front.startsWith('✗') ? '⚠ 뜻 없음 ' : '') : (hasHan(i.front) ? '⚠ 앞면에 한자 ' : '');
    console.log(`  ${warn}${i.id.slice(3)} | ${i.front}  ⇐  ${i.back}`);
  }
}
const live = new Set(items.map((i) => i.id.slice(3)));
const orphans = Object.keys(overlay).filter((id) => !live.has(id));
const koOf = new Map(lessons.flatMap((l) => l.items.filter((it) => it.zh && it.ko).map((it) => [`sentence:${l.date}-${shortHash(it.zh)}`, it.ko])));
const drifted = Object.values(overlay).filter((c) => c.tr && koOf.has(c.id) && !koOf.get(c.id).startsWith(c.tr)).map((c) => c.id);
if (drifted.length) console.log(`\n⚠ cards.json 의 tr 이 원문 번역과 달라져 무시됨 (다시 맞춰 주세요):\n  ${drifted.join('\n  ')}`);
if (orphans.length) console.log(`\n⚠ cards.json 에 짝이 없는 항목 (원문 문장이 바뀌어 ID 가 달라짐):\n  ${orphans.join('\n  ')}`);
