/** 면접 연습 모드: 필터 → 랜덤 질문 → 준비 → 답변 타이머 → (녹음) → 자가평가 → SRS */
import { newCard, review, type Grade } from '../core/srs.ts';
import { loadCards, loadAnswers, saveCard, appendReview, saveAnswer } from '../core/storage.ts';
import { startRecording, type Recorder } from '../core/audio.ts';

interface Q { id: string; q: string; category: string; lang: string; hint?: string; minutes: number; tags: string[] }
const CAT: Record<string, string> = { intro: '자기소개', career: '경력', tech: '기술', behavioral: '행동·상황', culture: '회사·문화' };

const root = document.querySelector<HTMLElement>('[data-practice]');
if (root) {
  const all: Q[] = JSON.parse(root.querySelector('script[type="application/json"]')!.textContent || '[]');
  const stage = root.querySelector<HTMLElement>('.stage')!;
  const catSel = root.querySelector<HTMLSelectElement>('[name=category]')!;
  const langSel = root.querySelector<HTMLSelectElement>('[name=lang]')!;
  const prepSel = root.querySelector<HTMLSelectElement>('[name=prep]')!;
  let pool: Q[] = [], cur: Q | null = null, timer: number | undefined, rec: Recorder | null = null, blobUrl = '', recToken = 0;
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const stop = () => { if (timer) clearInterval(timer); timer = undefined; };
  /** 질문 전환 시 타이머·마이크·이전 녹음 정리 */
  async function teardown() {
    stop(); recToken++;
    if (rec) { const r = rec; rec = null; r.stream.getTracks().forEach((t) => t.stop()); try { await r.stop(); } catch { /* already stopped */ } }
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = ''; }
  }

  function pick(): Q | null {
    const cards = loadCards();
    pool = all.filter((q) => (!catSel.value || q.category === catSel.value) && (!langSel.value || q.lang === langSel.value));
    if (!pool.length) return null;
    const now = Date.now();
    const due = pool.filter((q) => { const c = cards[q.id]; return !c || c.due <= now; });
    const from = due.length ? due : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  function countdown(sec: number, el: HTMLElement, onEnd: () => void) {
    stop();
    let left = sec;
    el.textContent = fmt(left);
    timer = window.setInterval(() => {
      left--; el.textContent = fmt(left);
      el.classList.toggle('warn', left <= 15);
      if (left <= 0) { stop(); onEnd(); }
    }, 1000);
  }

  async function showPrep() {
    await teardown();
    cur = pick();
    if (!cur) { stage.innerHTML = '<div class="empty">조건에 맞는 질문이 없습니다.</div>'; return; }
    const prep = Number(prepSel.value);
    stage.innerHTML = `<div class="card"><div class="chips"><span class="chip chip-domain">${CAT[cur.category] ?? cur.category}</span><span class="chip">${cur.lang}</span></div>
      <p class="q-big" lang="${cur.lang === 'ko' ? 'ko' : cur.lang === 'en' ? 'en' : 'zh-CN'}">${esc(cur.q)}</p>
      ${cur.hint ? `<p class="muted small">힌트: ${esc(cur.hint)}</p>` : ''}
      <p class="muted">생각 정리 시간</p><div class="timer" data-t></div>
      <div class="btn-row"><button class="btn btn-filled" data-start>바로 답변 시작</button><button class="btn btn-quiet" data-skip>다른 질문</button></div></div>`;
    const t = stage.querySelector<HTMLElement>('[data-t]')!;
    if (prep > 0) countdown(prep, t, showAnswer); else t.textContent = '—';
    stage.querySelector('[data-start]')!.addEventListener('click', showAnswer);
    stage.querySelector('[data-skip]')!.addEventListener('click', () => { showPrep(); });
  }

  function showAnswer() {
    if (!cur) return;
    stage.innerHTML = `<div class="card"><p class="q-big">${esc(cur.q)}</p>
      <p class="muted">답변 중 · 목표 ${cur.minutes}분</p><div class="timer" data-t></div>
      <div class="btn-row"><button class="btn btn-outlined" data-rec>● 녹음</button><button class="btn btn-filled" data-done>답변 끝</button></div>
      <audio controls class="hidden" style="margin-top:12px;width:100%"></audio></div>`;
    const t = stage.querySelector<HTMLElement>('[data-t]')!;
    countdown(Math.round(cur.minutes * 60), t, () => { t.textContent = '시간 초과'; });
    const recBtn = stage.querySelector<HTMLButtonElement>('[data-rec]')!;
    recBtn.addEventListener('click', async () => {
      if (!rec) {
        const token = ++recToken;
        recBtn.disabled = true;
        try {
          const r = await startRecording();
          if (token !== recToken || !stage.contains(recBtn)) { r.stream.getTracks().forEach((t) => t.stop()); return; } // 화면이 바뀐 뒤 늦게 허용됨
          rec = r; recBtn.textContent = '■ 녹음 정지'; recBtn.classList.add('btn-filled'); recBtn.disabled = false;
        } catch { recBtn.textContent = '마이크 사용 불가'; }
      } else { await finishRec(); recBtn.textContent = '● 다시 녹음'; recBtn.classList.remove('btn-filled'); }
    });
    stage.querySelector('[data-done]')!.addEventListener('click', async () => { stop(); await finishRec(); showGrade(); });
  }
  async function finishRec() {
    if (!rec) return;
    const blob = await rec.stop(); rec = null;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(blob);
  }

  function showGrade() {
    if (!cur) return;
    const prev = (loadAnswers()[cur.id] ?? []).slice(-1)[0];
    stage.innerHTML = `<div class="card"><p class="q-big">${esc(cur.q)}</p>
      ${blobUrl ? `<audio controls src="${blobUrl}" style="width:100%;margin:8px 0"></audio><p class="small muted">녹음은 저장되지 않고 이 화면을 떠나면 사라집니다.</p>` : ''}
      ${prev ? `<details><summary class="muted small">저장된 모범답변 보기</summary><p style="white-space:pre-wrap">${esc(prev.text)}</p></details>` : ''}
      <label class="small muted">메모 (선택, 이 브라우저에만 저장)</label><textarea data-note style="min-height:80px"></textarea>
      <p class="muted" style="margin-top:12px">얼마나 잘 답했나요?</p>
      <div class="fc-grades">
        <button class="btn g0" data-g="0">막힘<small>10분 뒤 다시</small></button>
        <button class="btn g1" data-g="1">버벅임<small></small></button>
        <button class="btn g2" data-g="2">괜찮음<small></small></button>
        <button class="btn g3" data-g="3">자신 있음<small></small></button>
      </div></div>`;
    stage.querySelectorAll<HTMLButtonElement>('[data-g]').forEach((b) => b.addEventListener('click', () => {
      const g = Number(b.dataset.g) as Grade;
      const now = Date.now();
      saveCard(review(loadCards()[cur!.id] ?? newCard(cur!.id, now), g, now));
      appendReview({ itemId: cur!.id, ts: now, grade: g });
      const note = stage.querySelector<HTMLTextAreaElement>('[data-note]')!.value.trim();
      if (note) saveAnswer(cur!.id, { ts: now, text: note, selfScore: g });
      showPrep();
    }));
  }

  root.querySelector('[data-begin]')!.addEventListener('click', showPrep);
}
