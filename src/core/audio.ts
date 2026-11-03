/** Web Speech TTS + MediaRecorder 래퍼. 브라우저 전용. */
export function speak(text: string, lang: string, voiceName?: string, rate = 0.95) {
  if (typeof speechSynthesis === 'undefined') return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = rate;
  if (voiceName) {
    const v = speechSynthesis.getVoices().find((x) => x.name === voiceName);
    if (v) u.voice = v;
  }
  speechSynthesis.speak(u);
  return true;
}

export function voicesFor(lang: string): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return [];
  const p = lang.slice(0, 2).toLowerCase();
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(p));
}

export interface Recorder { stop(): Promise<Blob>; stream: MediaStream }

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.start();
  return {
    stream,
    stop: () => new Promise<Blob>((resolve) => {
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolve(new Blob(chunks, { type: rec.mimeType })); };
      rec.stop();
    }),
  };
}
