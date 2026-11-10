import { loadCards, loadReviews, backupStatus } from '../core/storage.ts';
import { dueCount } from '../core/srs.ts';
import { streak, heatmap } from '../core/progress.ts';
import { DOMAIN_LABEL, type Domain } from '../core/items.ts';

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
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  todayEl.textContent = String(reviews.filter((r) => r.ts >= d.getTime()).length);
}

// 기록은 이 브라우저에만 있으므로, 백업 없이 일주일 넘게 쌓이면 알려 준다
const notice = document.querySelector<HTMLElement>('[data-backup-notice]');
if (notice) {
  const b = backupStatus(now);
  if (b.due) {
    const days = b.lastExportAt ? Math.floor((now - b.lastExportAt) / 86_400_000) : 0;
    notice.querySelector('[data-backup-text]')!.textContent = b.lastExportAt
      ? `마지막 백업 후 ${days}일이 지났어요. 그 뒤의 학습 기록 ${b.pending}건은 이 브라우저에만 있어요.`
      : `백업한 기록이 아직 없어요. 학습 기록 ${b.pending}건이 이 브라우저에만 있어요.`;
    notice.classList.remove('hidden');
  }
}

const dateEl = document.querySelector<HTMLTimeElement>('[data-home-date]');
if (dateEl) {
  const date = new Date(now);
  dateEl.dateTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  dateEl.textContent = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
}

const reviewLink = document.querySelector<HTMLAnchorElement>('[data-review-start]');
if (reviewLink) {
  const domains: Domain[] = ['zh', 'en', 'interview'];
  const next = domains.reduce((best, domain) => dueCount(cards, now, `${domain}:`) > dueCount(cards, now, `${best}:`) ? domain : best, domains[0]);
  const due = dueCount(cards, now);
  reviewLink.href = `/${next}/review/`;
  const label = reviewLink.querySelector('[data-review-label]');
  if (label) label.textContent = `${DOMAIN_LABEL[next]} ${due ? '복습하기' : '학습 시작'}`;
  const description = document.querySelector('[data-review-description]');
  if (description && due) description.textContent = `${DOMAIN_LABEL[next]}부터 복습하며 배운 내용을 다시 떠올려 보세요.`;
  const caption = document.querySelector('[data-review-caption]');
  if (caption && !due) caption.textContent = '새 카드부터 시작';
}

const heat = document.querySelector<HTMLElement>('.heat');
if (heat) {
  const cells = heatmap(reviews, Number(heat.dataset.weeks ?? 16), now);
  heat.innerHTML = cells.map((c) => `<i data-l="${c.count === 0 ? 0 : c.count < 10 ? 1 : c.count < 30 ? 2 : 3}" title="${c.key}: ${c.count}회 복습"></i>`).join('');
  const total = cells.reduce((sum, cell) => sum + cell.count, 0);
  const days = cells.filter((cell) => cell.count > 0).length;
  heat.setAttribute('aria-label', `최근 ${heat.dataset.weeks ?? 16}주: ${days}일 학습, ${total}회 복습`);
  const summary = document.querySelector('[data-activity-summary]');
  if (summary && total) summary.textContent = `${days}일 동안 ${total}번 복습했어요.`;
  const months = document.querySelector('[data-heat-months]');
  if (months) {
    let previousMonth = '';
    months.replaceChildren(...cells.filter((_, i) => i % 7 === 0).map((cell) => {
      const label = document.createElement('span');
      const month = cell.key.slice(5, 7);
      if (month !== previousMonth) label.textContent = `${Number(month)}월`;
      previousMonth = month;
      return label;
    }));
  }
}
