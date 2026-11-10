/** 플래시카드 복습 섬. <div class="fc" data-domain> 안의 JSON 항목을 읽어 큐를 돌린다. */
import type { Item } from '../core/items.ts';
import { DOMAIN_LANG, TYPE_LABEL } from '../core/items.ts';
import { buildQueue, newCard, review, newToday, type Grade } from '../core/srs.ts';
import { loadCards, loadReviews, loadSettings, loadAnswers, latestAnswer, saveCard, appendReview, usingMemoryFallback, requestPersistence } from '../core/storage.ts';
import { splitNote } from '../core/notes.ts';
import { speak } from '../core/audio.ts';

const GRADES: Array<{ g: Grade; label: string; sub: string; cls: string; key: string }> = [
  { g: 0, label: '다시', sub: '10분 뒤', cls: 'g0', key: '1' },
  { g: 1, label: '어려움', sub: '', cls: 'g1', key: '2' },
  { g: 2, label: '보통', sub: '', cls: 'g2', key: '3' },
  { g: 3, label: '쉬움', sub: '', cls: 'g3', key: '4' },
];

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string)); }

function describe(interval: number) {
  if (interval === 0) return '10분';
  if (interval < 30) return `${interval}일`;
  return `${Math.round(interval / 30)}개월`;
}

export function mountReview(root: HTMLElement) {
  const items: Item[] = JSON.parse(root.querySelector('script[type="application/json"]')!.textContent || '[]');
  const settings = loadSettings();
  const domain = root.dataset.domain as keyof typeof DOMAIN_LANG;
  const newLimit = Math.max(0, (settings.newLimit ?? 20) - newToday(loadReviews()));
  const queue = buildQueue(items, loadCards(), Date.now(), newLimit);
  const total = queue.length;
  const moreCount = settings.newLimit || 20;
  let i = 0, done = 0, again = 0, revealed = false, askedPersist = false;

  const view = root.querySelector<HTMLElement>('.fc-view')!;

  function render() {
    if (i >= queue.length) {
      view.innerHTML = `<div class="fc-card"><div class="fc-front">오늘 복습 끝</div>
        <p class="muted">${done}장 복습 · 다시 ${again}장 · 전체 항목 ${items.length}개</p>
        <div class="fc-actions"><a class="btn btn-tonal" href="./">돌아가기</a><button class="btn btn-outlined" id="fc-more">새 카드 ${moreCount}장 더</button></div></div>`;
      view.querySelector('#fc-more')?.addEventListener('click', () => {
        const more = buildQueue(items, loadCards(), Date.now(), moreCount).filter((it) => !queue.includes(it));
        queue.push(...more); render();
      });
      return;
    }
    const it = queue[i];
    const card = loadCards()[it.id] ?? newCard(it.id);
    const lang = it.extra?.lang ?? DOMAIN_LANG[domain];
    const targetFront = (it.extra?.frontLang ?? lang) !== 'ko';
    const speakable = domain !== 'interview' && (revealed || targetFront);
    const frontLang = it.extra?.frontLang ?? lang;
    const x = it.extra ?? {};
    // 해설이 짧은 한 줄이면 바로 보여 주고, 길면 접어서 평가 버튼이 화면 밖으로 밀리지 않게 한다
    const notes = revealed && x.detail ? splitNote(x.detail) : [];
    const brief = notes.length === 1 && notes[0].length <= 48;
    // 면접 카드는 힌트만으로는 비교할 것이 없으니, 써 둔 답변이 있으면 함께 보여 준다
    const mine = revealed && domain === 'interview' ? latestAnswer(loadAnswers()[it.id]) : undefined;
    view.innerHTML = `
      <div class="fc-prog"><span>${i + 1} / ${queue.length}</span><span>${card.reps ? `${card.reps}회 복습 · 간격 ${describe(card.interval)}` : '새 카드'}</span></div>
      <div class="fc-card" aria-live="polite">
        <div class="chips"><span class="chip chip-domain">${esc(TYPE_LABEL[it.type] ?? it.type)}</span>${it.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>
        <div class="fc-front" lang="${frontLang}">${esc(it.front)}</div>
        ${revealed ? `<div class="fc-back" lang="${x.backLang ?? 'ko'}">${esc(it.back)}</div>
          ${x.wrong ? `<div class="fc-extra">✗ <span class="bad" lang="${x.backLang ?? lang}">${esc(x.wrong)}</span></div>` : ''}
          ${x.pinyin ? `<div class="fc-extra py">${esc(x.pinyin)}</div>` : ''}
          ${x.example ? `<div class="fc-extra" lang="${lang}">${esc(x.example)}</div>` : ''}
          ${x.note ? `<div class="fc-extra small">${esc(x.note)}</div>` : ''}
          ${brief ? `<div class="fc-extra small">${esc(notes[0])}</div>` : ''}
          ${notes.length && !brief ? `<details class="fc-more"><summary>해설</summary><ul>${notes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details>` : ''}
          ${mine ? `<details class="fc-more"><summary>내 답변</summary><p>${esc(mine.text)}</p></details>` : ''}
          ${domain === 'interview' && !mine ? `<a class="small" href="/interview/q/${encodeURIComponent(it.id.split(':').pop() ?? '')}/">답변 써 두기 →</a>` : ''}` : ''}
      </div>
      ${revealed
        ? `<div class="fc-grades">${GRADES.map((g) => `<button class="btn ${g.cls}" data-g="${g.g}">${g.label}<small>${g.sub || describe(review(card, g.g).interval)} · ${g.key}</small></button>`).join('')}</div>`
        : `<div class="fc-actions"><button class="btn btn-filled" id="fc-show">정답 보기 <small>(Space)</small></button>${speakable ? `<button class="btn btn-outlined" id="fc-say">🔊 듣기</button>` : ''}</div>`}
      ${revealed && speakable ? `<div class="fc-actions" style="margin-top:8px"><button class="btn btn-quiet btn-sm" id="fc-say">🔊 듣기</button></div>` : ''}
    `;
    view.querySelector('#fc-show')?.addEventListener('click', reveal);
    view.querySelector('#fc-say')?.addEventListener('click', () => say(it));
    view.querySelectorAll<HTMLButtonElement>('[data-g]').forEach((b) => b.addEventListener('click', () => grade(Number(b.dataset.g) as Grade)));
  }
  function say(it: Item) {
    const text = it.extra?.speak ?? it.front;
    const lang = it.extra?.lang ?? DOMAIN_LANG[domain];
    speak(text, lang, lang.startsWith('zh') ? settings.voiceZh : settings.voiceEn);
  }
  function warn(msg: string) {
    let b = root.querySelector<HTMLElement>('.fc-warn');
    if (!b) { b = document.createElement('div'); b.className = 'fc-warn card'; b.style.cssText = 'background:var(--red-soft);color:var(--red);margin-bottom:12px'; root.prepend(b); }
    b.textContent = msg;
  }
  if (usingMemoryFallback()) warn('이 브라우저는 localStorage 를 쓸 수 없어 진도가 페이지를 떠나면 사라집니다.');
  function reveal() { revealed = true; render(); }
  function grade(g: Grade) {
    const it = queue[i];
    const now = Date.now();
    const next = review(loadCards()[it.id] ?? newCard(it.id, now), g, now);
    const ok = saveCard(next) && appendReview({ itemId: it.id, ts: now, grade: g });
    if (!ok) warn('저장에 실패했습니다. 저장 공간이 가득 찼거나 브라우저가 저장을 막고 있습니다. 설정에서 내보내기를 해 두세요.');
    else if (!askedPersist) { askedPersist = true; void requestPersistence(); }
    done++;
    if (g === 0) { again++; queue.push(it); }
    i++; revealed = false; render();
  }
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || i >= queue.length) return;
    if (e.key === ' ' && !revealed) { e.preventDefault(); reveal(); }
    const g = GRADES.find((x) => x.key === e.key);
    if (g && revealed) grade(g.g);
  });
  if (!total) { view.innerHTML = '<div class="empty">복습할 항목이 없습니다.</div>'; return; }
  render();
}

document.querySelectorAll<HTMLElement>('.fc[data-domain]').forEach(mountReview);
