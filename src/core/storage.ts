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

/** 이 기기에만 해당하는 상태. 내보내기 파일에는 넣지 않는다. */
export interface Meta { lastExportAt?: number }

const K = {
  cards: 'lang.v1.cards',
  reviews: 'lang.v1.reviews',
  answers: 'lang.v1.interview.answers',
  settings: 'lang.v1.settings',
  meta: 'lang.v1.meta',
} as const;
const DAY = 86_400_000;

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
export const loadMeta = () => read<Meta>(K.meta, {});

/** 가장 최근에 '작성한' 답변. 연습 모드 메모(selfScore 가 붙은 항목)는 모범답변이 아니므로 건너뛴다. */
export function latestAnswer(list: AnswerVersion[] = []): AnswerVersion | undefined {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].selfScore == null) return list[i];
  return undefined;
}

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

/** 내보내기 파일을 내려보낼 때 호출한다. 브라우저는 저장이 끝났는지 알려 주지 않으므로, 내려보낸 시점을 백업 시각으로 본다. */
export function markExported(now = Date.now()): void {
  write(K.meta, { ...loadMeta(), lastExportAt: now });
}

/**
 * 백업 알림 판단. `pending` 은 마지막 내보내기 뒤에 생긴 복습·답변 수.
 * `due` 는 그런 기록이 있고, 마지막 내보내기(한 번도 없으면 가장 오래된 기록)로부터 `days` 일이 넘었는지.
 */
export function backupStatus(now = Date.now(), days = 7): { due: boolean; pending: number; lastExportAt?: number } {
  const last = loadMeta().lastExportAt;
  let pending = 0, oldest = Infinity;
  const see = (ts: number) => { if (ts > (last ?? 0)) { pending++; if (ts < oldest) oldest = ts; } };
  for (const r of loadReviews()) see(r.ts);
  for (const list of Object.values(loadAnswers())) for (const a of list) see(a.ts);
  return { due: pending > 0 && now - (last ?? oldest) > days * DAY, pending, lastExportAt: last };
}

/** 저장 공간이 부족해도 브라우저가 이 사이트 데이터를 먼저 지우지 않도록 보존을 요청한다. 지원하지 않거나 거절되면 false. */
export async function requestPersistence(): Promise<boolean> {
  try {
    const s = (globalThis as { navigator?: { storage?: { persisted?: () => Promise<boolean>; persist?: () => Promise<boolean> } } }).navigator?.storage;
    if (!s?.persist) return false;
    return (await s.persisted?.()) === true || (await s.persist());
  } catch { return false; }
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
  // 비어 있던 곳에 넣거나 통째로 바꾸면 이 기기의 내용은 그 파일과 같다 → 파일을 만든 시각까지는 백업된 것으로 본다
  if ((mode === 'replace' || (!loadReviews().length && !Object.keys(loadAnswers()).length)) && isNum(snap.exportedAt)) write(K.meta, { lastExportAt: snap.exportedAt });
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
