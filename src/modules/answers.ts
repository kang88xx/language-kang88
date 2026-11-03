/** 면접 질문 상세: 내 답변 버전 저장 (localStorage 전용) */
import { loadAnswers, saveAnswer } from '../core/storage.ts';

const root = document.querySelector<HTMLElement>('[data-answer-for]');
if (root) {
  const qid = root.dataset.answerFor!;
  const ta = root.querySelector<HTMLTextAreaElement>('textarea')!;
  const list = root.querySelector<HTMLElement>('.versions')!;
  const btn = root.querySelector<HTMLButtonElement>('[data-save]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const fmt = (ts: number) => new Date(ts).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
  const render = () => {
    const vs = loadAnswers()[qid] ?? [];
    if (!ta.value && vs.length) ta.value = vs[vs.length - 1].text;
    list.innerHTML = vs.slice().reverse().map((v) => `<li><div class="small muted">${fmt(v.ts)}${v.selfScore != null ? ` · 자가평가 ${v.selfScore}` : ''}</div>${v.text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))}</li>`).join('') || '<li class="muted">저장된 답변이 없습니다.</li>';
  };
  btn.addEventListener('click', () => {
    const text = ta.value.trim();
    if (!text) return;
    saveAnswer(qid, { ts: Date.now(), text });
    status.textContent = '저장됨 (이 브라우저에만)';
    render();
  });
  render();
}
