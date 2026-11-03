import { loadCards, loadReviews } from '../core/storage.ts';
import { dueCount } from '../core/srs.ts';
import { streak, heatmap } from '../core/progress.ts';

const cards = Object.values(loadCards());
const reviews = loadReviews();
const now = Date.now();
for (const el of document.querySelectorAll<HTMLElement>('[data-due]')) {
  el.textContent = String(dueCount(cards, now, el.dataset.due ? `${el.dataset.due}:` : ''));
}
const s = document.querySelector<HTMLElement>('[data-streak]');
if (s) s.textContent = String(streak(reviews, now));
const learned = document.querySelector<HTMLElement>('[data-learned]');
if (learned) learned.textContent = String(cards.length);
const todayEl = document.querySelector<HTMLElement>('[data-today]');
if (todayEl) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  todayEl.textContent = String(reviews.filter((r) => r.ts >= d.getTime()).length);
}
const heat = document.querySelector<HTMLElement>('.heat');
if (heat) {
  const cells = heatmap(reviews, Number(heat.dataset.weeks ?? 16), now);
  heat.innerHTML = cells.map((c) => `<i data-l="${c.count === 0 ? 0 : c.count < 10 ? 1 : c.count < 30 ? 2 : 3}" title="${c.key}: ${c.count}"></i>`).join('');
}
