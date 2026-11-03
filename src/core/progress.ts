import type { Review } from './srs.ts';

const DAY = 86_400_000;

/** 로컬 날짜 키 YYYY-MM-DD */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function countByDay(reviews: Review[], prefix = ''): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of reviews) if (r.itemId.startsWith(prefix)) out[dayKey(r.ts)] = (out[dayKey(r.ts)] ?? 0) + 1;
  return out;
}

/** 오늘 또는 어제까지 이어진 연속 학습일 수 */
export function streak(reviews: Review[], now = Date.now()): number {
  const days = new Set(reviews.map((r) => dayKey(r.ts)));
  let cursor = now;
  if (!days.has(dayKey(cursor))) cursor -= DAY; // 오늘 아직 안 했으면 어제부터
  let n = 0;
  while (days.has(dayKey(cursor))) { n++; cursor -= DAY; }
  return n;
}

/** 최근 N주 히트맵 셀 (일요일 시작, 오래된 순) */
export function heatmap(reviews: Review[], weeks = 12, now = Date.now()): Array<{ key: string; count: number }> {
  const counts = countByDay(reviews);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const end = today.getTime() + (6 - today.getDay()) * DAY; // 이번 주 토요일
  const start = end - (weeks * 7 - 1) * DAY;
  const cells = [];
  for (let t = start; t <= end; t += DAY) {
    const key = dayKey(t);
    cells.push({ key, count: counts[key] ?? 0 });
  }
  return cells;
}
