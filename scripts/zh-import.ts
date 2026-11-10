/** ../Chinese-class/site/data.js 의 원본 구조 → content/zh 파일 내용. 파일 입출력은 import-chinese-class.mjs 가 맡고, 여기는 순수 변환만 한다. */
import { shortHash } from '../src/core/hash.ts';

export interface SrcItem { gr?: string; zh?: string; py?: string; ko?: string; fix?: { bad: string; good: string } }
export interface SrcLesson { date: string; day: string; n: number; pct: number; theme: string; items: SrcItem[]; words?: string[] }
export interface SrcData { PROGRESS: unknown; CAL: unknown[]; LESSONS: SrcLesson[]; VOCAB: Array<[md: string, zh: string, py: string, ko: string]> }
export interface VocabEntry { id: string; date: string; zh: string; py: string; ko: string }

const DAY = 86_400_000;
const shift = (date: string, days: number) => new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);

/**
 * VOCAB 은 [MM-DD, …] 라 연도가 없다. 최신순으로 정렬돼 있으므로 뒤로 가다 월일이 커지는 곳에서 해가 바뀐다.
 * 수강이 해를 넘겨도(2026-11 ~ 2027-05) 날짜와, 날짜로 만드는 카드 ID 가 틀어지지 않게 한다.
 */
export function inferVocabDates(mds: string[], latestLesson: string): string[] {
  // 최신 단어는 최신 수업 무렵의 것이다. 수업 기록일보다 하루 이틀 늦게 적히기도 해서(10/29 단어 ↔ 10/28 수업) 7일의 여유를 두고,
  // 그 한도를 넘지 않는 가장 늦은 해에서 시작한다: 12/31 수업의 단어 01-01 은 다음 해, 새해 첫 수업에 단어가 없으면 12-30 은 작년.
  const limit = shift(latestLesson, 7);
  let year = Number(limit.slice(0, 4));
  return mds.map((md, i) => {
    if (i === 0) while (`${year}-${md}` > limit) year--;
    else if (md > mds[i - 1]) year--;
    return `${year}-${md}`;
  });
}

const LATIN = 'a-zA-Z\\u00c0-\\u024f\\u1e00-\\u1eff';
const WORD = new RegExp(`^(.+?)\\s+([${LATIN}](?:[${LATIN}\\s\\-/,'’·]*[${LATIN}])?)\\s+([^${LATIN}\\s].*)$`, 'u');
const untag = (s: string) => s.replace(/^\[[^\]]*\]\s*/, ''); // '[10/29] 决心 …' 의 머리표

/** 수업 단어 문자열 '流感 liúgǎn 독감 (…)' → { zh, py, ko }. 병음이 없거나 뜻이 영문자로 시작하면 null. */
export function parseWord(s: string): { zh: string; py: string; ko: string } | null {
  const m = untag(s).match(WORD);
  return m ? { zh: m[1], py: m[2], ko: m[3] } : null;
}

/** `prevVocab`: 지난번에 만든 vocab.json. 이미 있는 단어의 ID 를 유지하는 데 쓴다. */
export function buildZhContent(data: SrcData, prevVocab: VocabEntry[] = []) {
  const lessons = data.LESSONS.map((l) => ({
    date: l.date, day: l.day, n: l.n, pct: l.pct, theme: l.theme,
    items: l.items.map((it) => ({ gr: it.gr, zh: it.zh, py: it.py, ko: it.ko, ...(it.fix ? { fix: it.fix } : {}) })),
    words: l.words ?? [],
  }));

  const fixes: Array<{ id: string; date: string; n: number; wrong: string; right: string; note: string }> = [];
  for (const l of data.LESSONS) for (const it of l.items) {
    if (it.fix) fixes.push({ id: `${l.date}-${shortHash(it.fix.bad)}`, date: l.date, n: l.n, wrong: it.fix.bad, right: it.fix.good, note: it.ko ?? '' });
  }

  const lessonDates = data.LESSONS.map((l) => l.date).sort();
  const dates = inferVocabDates(data.VOCAB.map((v) => v[0]), lessonDates[lessonDates.length - 1]);
  const stray = dates.find((d) => d < shift(lessonDates[0], -7));
  if (stray) throw new Error(`VOCAB 이 최신순이 아니어서 연도를 정할 수 없습니다 (${stray} 가 첫 수업 ${lessonDates[0]} 보다 앞섬)`);
  const vocab: VocabEntry[] = data.VOCAB.map(([, zh, py, ko], i) => ({ id: `${dates[i]}-${shortHash(zh)}`, date: dates[i], zh, py, ko }));

  // 수업의 '오늘의 단어'에는 있는데 VOCAB 에 빠진 단어를 채운다. 원본은 고치지 않는다.
  const known = new Set(vocab.map((v) => v.zh));
  const added: string[] = [], unparsed: string[] = [];
  for (const l of data.LESSONS) for (const raw of l.words ?? []) {
    const s = untag(raw);
    if ([...known].some((zh) => s === zh || s.startsWith(`${zh} `))) continue;
    const w = parseWord(s);
    if (!w) { unparsed.push(`${l.date} ${raw}`); continue; }
    known.add(w.zh);
    vocab.push({ id: `${l.date}-${shortHash(w.zh)}`, date: l.date, ...w });
    added.push(`${l.date} ${w.zh}`);
  }
  vocab.sort((a, b) => b.date.localeCompare(a.date)); // 안정 정렬 — 같은 날짜 안에서는 원본 순서

  // ID 는 복습 진도의 키다. 원본에서 단어 날짜가 바뀌거나, 위에서 보충했던 단어가 나중에 VOCAB 에 다른 날짜로 들어와도 예전 ID 를 유지한다.
  // 같은 한자가 여러 번 있으면 어느 것인지 알 수 없으므로 건드리지 않는다.
  const tally = (list: VocabEntry[]) => list.reduce((m, v) => m.set(v.zh, (m.get(v.zh) ?? 0) + 1), new Map<string, number>());
  const before = tally(prevVocab), now = tally(vocab);
  const prevId = new Map(prevVocab.map((v) => [v.zh, v.id]));
  const kept: string[] = [];
  for (const v of vocab) {
    const old = prevId.get(v.zh);
    if (old && old !== v.id && before.get(v.zh) === 1 && now.get(v.zh) === 1) { kept.push(`${v.zh} ${old} (원본 날짜 ${v.date})`); v.id = old; }
  }

  return { lessons, vocab, fixes, calendar: { progress: data.PROGRESS, months: data.CAL }, added, unparsed, kept };
}
