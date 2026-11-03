/** localStorage 어댑터. 모든 진도 쓰기는 여기만 거친다. 스키마 v1. */
import type { CardState, Review } from './srs.ts';

export interface AnswerVersion { ts: number; text: string; selfScore?: number }
export interface Settings { voiceEn?: string; voiceZh?: string; newLimit?: number; theme?: 'light' | 'dark' | 'auto' }

export interface Snapshot {
  version: 1;
  exportedAt: number;
  cards: Record<string, CardState>;
  reviews: Review[];
  answers: Record<string, AnswerVersion[]>;
  settings: Settings;
}

const K = {
  cards: 'lang.v1.cards',
  reviews: 'lang.v1.reviews',
  answers: 'lang.v1.interview.answers',
  settings: 'lang.v1.settings',
} as const;

type Backend = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

const memory = new Map<string, string>();
const memoryBackend: Backend = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

function backend(): Backend {
  try {
    const ls = (globalThis as { localStorage?: Backend }).localStorage;
    if (ls) { ls.setItem('lang.probe', '1'); ls.removeItem('lang.probe'); return ls; }
  } catch { /* private mode etc. */ }
  return memoryBackend;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = backend().getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
/** 마지막 쓰기 실패 여부. UI 는 이 값을 보고 경고를 띄운다. */
export let lastWriteFailed = false;
function write(key: string, value: unknown): boolean {
  try { backend().setItem(key, JSON.stringify(value)); lastWriteFailed = false; return true; }
  catch { lastWriteFailed = true; return false; }
}
export const usingMemoryFallback = () => backend() === memoryBackend;

export const loadCards = () => read<Record<string, CardState>>(K.cards, {});
export const loadReviews = () => read<Review[]>(K.reviews, []);
export const loadAnswers = () => read<Record<string, AnswerVersion[]>>(K.answers, {});
export const loadSettings = () => read<Settings>(K.settings, {});

export function saveCard(card: CardState): boolean {
  const cards = loadCards();
  cards[card.itemId] = card;
  return write(K.cards, cards);
}
export function appendReview(r: Review): boolean {
  const list = loadReviews();
  list.push(r);
  return write(K.reviews, list);
}
export function saveAnswer(questionId: string, v: AnswerVersion) {
  const all = loadAnswers();
  (all[questionId] ??= []).push(v);
  write(K.answers, all);
}
export function saveSettings(patch: Settings) {
  write(K.settings, { ...loadSettings(), ...patch });
}

export function exportAll(): Snapshot {
  return { version: 1, exportedAt: Date.now(), cards: loadCards(), reviews: loadReviews(), answers: loadAnswers(), settings: loadSettings() };
}

/** 병합 가져오기: 카드는 due 가 더 최신인 쪽, 리뷰는 (itemId, ts) 중복 제거, 답변은 ts 중복 제거 */
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isCard = (c: unknown): c is CardState => !!c && typeof c === 'object' && typeof (c as CardState).itemId === 'string'
  && isNum((c as CardState).due) && isNum((c as CardState).interval) && isNum((c as CardState).ease) && isNum((c as CardState).reps) && isNum((c as CardState).lapses);
const isReview = (r: unknown): r is Review => !!r && typeof r === 'object' && typeof (r as Review).itemId === 'string' && isNum((r as Review).ts) && [0, 1, 2, 3].includes((r as Review).grade);
const isAnswer = (a: unknown): a is AnswerVersion => !!a && typeof a === 'object' && isNum((a as AnswerVersion).ts) && typeof (a as AnswerVersion).text === 'string';

/** 가져오기 파일 형태 검증. 쓰기 전에 전부 확인해 부분 병합을 막는다. */
export function validateSnapshot(snap: unknown): asserts snap is Snapshot {
  const s = snap as Partial<Snapshot>;
  if (!s || typeof s !== 'object') throw new Error('JSON 객체가 아닙니다');
  if (s.version !== 1) throw new Error(`지원하지 않는 버전: ${String(s.version)}`);
  if (s.cards != null && (typeof s.cards !== 'object' || Array.isArray(s.cards) || !Object.entries(s.cards).every(([k, c]) => isCard(c) && c.itemId === k))) throw new Error('cards 형식 오류');
  if (s.reviews != null && (!Array.isArray(s.reviews) || !s.reviews.every(isReview))) throw new Error('reviews 형식 오류');
  if (s.answers != null && (typeof s.answers !== 'object' || Array.isArray(s.answers) || !Object.values(s.answers).every((l) => Array.isArray(l) && l.every(isAnswer)))) throw new Error('answers 형식 오류');
  if (s.settings != null && (typeof s.settings !== 'object' || Array.isArray(s.settings))) throw new Error('settings 형식 오류');
}

export function importAll(snap: Snapshot, mode: 'merge' | 'replace' = 'merge') {
  validateSnapshot(snap);
  if (mode === 'replace') {
    write(K.cards, snap.cards ?? {}); write(K.reviews, snap.reviews ?? []);
    write(K.answers, snap.answers ?? {}); write(K.settings, snap.settings ?? {});
    return;
  }
  const cards = loadCards();
  for (const [id, c] of Object.entries(snap.cards ?? {})) {
    const cur = cards[id];
    if (!cur || c.reps > cur.reps || (c.reps === cur.reps && c.due > cur.due)) cards[id] = c;
  }
  write(K.cards, cards);

  const seen = new Set(loadReviews().map((r) => `${r.itemId}|${r.ts}`));
  const reviews = loadReviews();
  for (const r of snap.reviews ?? []) if (!seen.has(`${r.itemId}|${r.ts}`)) { reviews.push(r); seen.add(`${r.itemId}|${r.ts}`); }
  reviews.sort((a, b) => a.ts - b.ts);
  write(K.reviews, reviews);

  const answers = loadAnswers();
  for (const [q, list] of Object.entries(snap.answers ?? {})) {
    const cur = answers[q] ?? [];
    const ts = new Set(cur.map((v) => v.ts));
    for (const v of list) if (!ts.has(v.ts)) cur.push(v);
    cur.sort((a, b) => a.ts - b.ts);
    answers[q] = cur;
  }
  write(K.answers, answers);
  write(K.settings, { ...loadSettings(), ...(snap.settings ?? {}) });
}

export function clearAll() {
  for (const k of Object.values(K)) backend().removeItem(k);
}
