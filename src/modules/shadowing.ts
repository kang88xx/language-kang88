/** 쉐도잉: 문장별 TTS → 녹음 → 재생 비교. 한 번에 한 행만 녹음한다. */
import { startRecording, type Recorder } from '../core/audio.ts';

let rec: Recorder | null = null;
let owner: HTMLButtonElement | null = null;
let starting = false;

async function finish() {
  if (!rec || !owner) return;
  const r = rec, b = owner; rec = null; owner = null;
  const blob = await r.stop();
  const player = b.closest<HTMLElement>('.sent')!.querySelector<HTMLAudioElement>('audio')!;
  if (player.src) URL.revokeObjectURL(player.src);
  player.src = URL.createObjectURL(blob); player.classList.remove('hidden');
  b.textContent = '● 다시 녹음'; b.classList.remove('btn-filled');
}

document.addEventListener('click', async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-rec]');
  if (!b || starting) return;
  if (rec && owner === b) { await finish(); return; }
  if (rec) await finish(); // 다른 행이 녹음 중이면 먼저 마무리
  starting = true;
  try {
    rec = await startRecording(); owner = b;
    b.textContent = '■ 정지'; b.classList.add('btn-filled');
  } catch { b.textContent = '마이크 사용 불가'; b.disabled = true; }
  finally { starting = false; }
});
