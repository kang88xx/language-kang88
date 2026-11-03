// ../Chinese-class/site/data.js (PROGRESS, CAL, LESSONS, VOCAB) → content/zh/*.json
// 재실행 가능. 기존 파일은 덮어쓴다.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const shortHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = process.argv[2] ?? join(root, '..', 'Chinese-class', 'site', 'data.js');
const out = join(root, 'content', 'zh');

const code = readFileSync(src, 'utf8');
const data = vm.runInNewContext(`${code}\n;({ PROGRESS, CAL, LESSONS, VOCAB })`, {}, { filename: src });

const lessonsDir = join(out, 'lessons');
mkdirSync(lessonsDir, { recursive: true });
for (const f of readdirSync(lessonsDir)) if (f.endsWith('.json')) unlinkSync(join(lessonsDir, f));

const year = data.PROGRESS.start.slice(0, 4);
const fixes = [];
for (const l of data.LESSONS) {
  const lesson = {
    date: l.date, day: l.day, n: l.n, pct: l.pct, theme: l.theme,
    items: l.items.map((it) => ({ gr: it.gr, zh: it.zh, py: it.py, ko: it.ko, ...(it.fix ? { fix: it.fix } : {}) })),
    words: l.words ?? [],
  };
  writeFileSync(join(lessonsDir, `${l.date}.json`), JSON.stringify(lesson, null, 1) + '\n');
  for (const it of l.items) if (it.fix) fixes.push({ id: `${l.date}-${shortHash(it.fix.bad)}`, date: l.date, n: l.n, wrong: it.fix.bad, right: it.fix.good, note: it.ko ?? '' });
}

const vocab = data.VOCAB.map(([md, zh, py, ko]) => ({ id: `${year}-${md}-${shortHash(zh)}`, date: `${year}-${md}`, zh, py, ko }));
writeFileSync(join(out, 'vocab.json'), JSON.stringify(vocab, null, 1) + '\n');
writeFileSync(join(out, 'fixes.json'), JSON.stringify(fixes, null, 1) + '\n');
writeFileSync(join(out, 'calendar.json'), JSON.stringify({ progress: data.PROGRESS, months: data.CAL }, null, 1) + '\n');

console.log(`lessons ${data.LESSONS.length}, vocab ${vocab.length}, fixes ${fixes.length}, months ${data.CAL.length} → ${out}`);
