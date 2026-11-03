import { speak } from '../core/audio.ts';
import { loadSettings } from '../core/storage.ts';
const s = loadSettings();
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-say]');
  if (!b) return;
  const lang = b.dataset.lang ?? 'en-US';
  speak(b.dataset.say!, lang, lang.startsWith('zh') ? s.voiceZh : s.voiceEn);
});
