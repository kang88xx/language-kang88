import { exportAll, importAll, clearAll, loadCards, loadReviews, loadAnswers, loadSettings, loadMeta, markExported, requestPersistence, saveSettings, type Snapshot } from '../core/storage.ts';
import { voicesFor } from '../core/audio.ts';

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const status = $('[data-status]');
const say = (m: string) => { status.textContent = m; };

function stats() {
  $('[data-n-cards]').textContent = String(Object.keys(loadCards()).length);
  $('[data-n-reviews]').textContent = String(loadReviews().length);
  $('[data-n-answers]').textContent = String(Object.values(loadAnswers()).reduce((a, v) => a + v.length, 0));
  const last = loadMeta().lastExportAt;
  $('[data-last-export]').textContent = last ? new Date(last).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '아직 없음';
}
stats();

$('[data-export]').addEventListener('click', () => {
  const snap = exportAll();
  const blob = new Blob([JSON.stringify(snap, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `language-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  markExported(snap.exportedAt);
  void requestPersistence();
  stats(); say('내보냈습니다.');
});

$('[data-import]').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const mode = ($('[name=mode]') as unknown as HTMLSelectElement).value as 'merge' | 'replace';
  try {
    const snap = JSON.parse(await f.text()) as Snapshot;
    if (mode === 'replace' && !confirm('현재 브라우저의 진도를 파일 내용으로 완전히 바꿉니다. 계속할까요?')) return;
    importAll(snap, mode);
    stats(); say(`가져왔습니다 (${mode === 'merge' ? '병합' : '교체'}).`);
  } catch (err) { say(`가져오기 실패: ${(err as Error).message}`); }
});

$('[data-clear]').addEventListener('click', () => {
  if (confirm('이 브라우저의 모든 진도·면접 답변을 지웁니다. 먼저 내보내기를 했나요?')) { clearAll(); stats(); say('지웠습니다.'); }
});

const s = loadSettings();
const theme = $('[name=theme]') as unknown as HTMLSelectElement;
theme.value = s.theme ?? 'auto';
theme.addEventListener('change', () => { saveSettings({ theme: theme.value as never }); if (theme.value === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme.value; });
const newLimit = $('[name=newLimit]') as unknown as HTMLInputElement;
newLimit.value = String(s.newLimit ?? 20);
newLimit.addEventListener('change', () => saveSettings({ newLimit: Math.max(0, Number(newLimit.value) || 0) }));

function fillVoices() {
  for (const [name, lang, key] of [['voiceEn', 'en', 'voiceEn'], ['voiceZh', 'zh', 'voiceZh']] as const) {
    const sel = $(`[name=${name}]`) as unknown as HTMLSelectElement;
    const vs = voicesFor(lang);
    sel.innerHTML = '<option value="">브라우저 기본</option>' + vs.map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('');
    sel.value = loadSettings()[key] ?? '';
    sel.onchange = () => saveSettings({ [key]: sel.value });
  }
}
fillVoices();
if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = fillVoices;
