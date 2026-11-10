/** SM-2 변형 간격반복. grade: 0 다시 · 1 어려움 · 2 보통 · 3 쉬움 */
export type Grade = 0 | 1 | 2 | 3;

export interface CardState {
  itemId: string;
  due: number;      // epoch ms
  interval: number; // days
  ease: number;     // 1.3 ~
  reps: number;
  lapses: number;
}

export interface Review { itemId: string; ts: number; grade: Grade }

const DAY = 86_400_000;
const MIN_EASE = 1.3;

export function newCard(itemId: string, now = Date.now()): CardState {
  return { itemId, due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

export function isDue(card: CardState, now = Date.now()): boolean {
  return card.due <= now;
}

export function review(card: CardState, grade: Grade, now = Date.now()): CardState {
  const next = { ...card, reps: card.reps + 1 };
  if (grade === 0) {
    next.lapses = card.lapses + 1;
    next.interval = 0;
    next.ease = Math.max(MIN_EASE, card.ease - 0.2);
    next.due = now + 10 * 60_000; // 10분 뒤 같은 세션에서 다시
    return next;
  }
  // 첫 간격도 평가마다 달라야 버튼이 구분된다: 어려움 1일 · 보통 2일 · 쉬움 4일
  if (card.interval === 0) next.interval = grade === 1 ? 1 : grade === 2 ? 2 : 4;
  else if (card.interval === 1) next.interval = grade === 1 ? 2 : grade === 2 ? 4 : 7;
  else next.interval = Math.max(card.interval + 1, Math.round(card.interval * (grade === 1 ? 1.2 : grade === 2 ? card.ease : card.ease * 1.3)));
  next.ease = Math.max(MIN_EASE, card.ease + (grade === 1 ? -0.15 : grade === 2 ? 0 : 0.15));
  next.due = now + next.interval * DAY;
  return next;
}

/** 오늘 복습 큐: due 카드(오래된 순) + 새 카드(newLimit 개) */
export function buildQueue<T extends { id: string }>(
  items: T[], cards: Record<string, CardState>, now = Date.now(), newLimit = 20,
): T[] {
  const due: Array<[T, number]> = [];
  const fresh: T[] = [];
  for (const it of items) {
    const c = cards[it.id];
    if (!c) fresh.push(it);
    else if (isDue(c, now)) due.push([it, c.due]);
  }
  due.sort((a, b) => a[1] - b[1]);
  return [...due.map(([it]) => it), ...fresh.slice(0, newLimit)];
}

/** 오늘 처음 복습한(새로 시작한) 카드 수 — 하루 새 카드 한도 계산용 */
export function newToday(reviews: Review[], now = Date.now()): number {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  const start = d.getTime();
  const seen = new Set<string>();
  let n = 0;
  for (const r of reviews) {
    if (seen.has(r.itemId)) continue;
    seen.add(r.itemId);
    if (r.ts >= start) n++;
  }
  return n;
}

export function dueCount(cards: Iterable<CardState>, now = Date.now(), prefix = ''): number {
  let n = 0;
  for (const c of cards) if (c.itemId.startsWith(prefix) && isDue(c, now)) n++;
  return n;
}
