/** 목록 검색·필터. [data-filter-root] 안의 input[type=search] 와 select 가 [data-hay] 요소를 거른다. */
import { matchesAll } from '../core/search.ts';

for (const root of document.querySelectorAll<HTMLElement>('[data-filter-root]')) {
  const q = root.querySelector<HTMLInputElement>('input[type="search"]');
  const selects = [...root.querySelectorAll<HTMLSelectElement>('select[data-key]')];
  const rows = [...root.querySelectorAll<HTMLElement>('[data-hay]')];
  const count = root.querySelector<HTMLElement>('[data-count]') ?? document.querySelector<HTMLElement>('[data-count]');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const apply = () => {
    let n = 0;
    for (const r of rows) {
      const ok = matchesAll(r.dataset.hay ?? '', q?.value ?? '') && selects.every((s) => !s.value || r.dataset[s.dataset.key!] === s.value);
      r.classList.toggle('hidden', !ok);
      if (ok) n++;
    }
    if (count) count.textContent = String(n);
    empty?.classList.toggle('hidden', n > 0);
  };
  q?.addEventListener('input', apply);
  selects.forEach((s) => s.addEventListener('change', apply));
  root.querySelector('[data-reset]')?.addEventListener('click', () => { if (q) q.value = ''; selects.forEach((s) => (s.value = '')); apply(); });
  const url = new URL(location.href);
  if (q && url.searchParams.get('q')) q.value = url.searchParams.get('q')!;
  apply();
}
