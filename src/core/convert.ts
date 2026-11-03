/** 도메인 콘텐츠 → 공통 Item 변환 (빌드 시) */
import type { Item } from './items.ts';
import { shortHash } from './hash.ts';

export function zhVocabItems(v: Array<{ id: string; date: string; zh: string; py: string; ko: string }>): Item[] {
  return v.map((w) => ({
    id: `zh:vocab:${w.id}`, domain: 'zh', type: 'vocab', front: w.zh, back: w.ko,
    extra: { pinyin: w.py, lang: 'zh-CN', frontLang: 'zh-CN' }, tags: [w.date.slice(5)], source: { date: w.date },
  }));
}

export function zhSentenceItems(lessons: Array<{ date: string; n: number; items: Array<{ gr: string; zh: string; py: string; ko: string }> }>): Item[] {
  const out: Item[] = [];
  for (const l of lessons) l.items.forEach((it) => it.zh && it.ko && out.push({
    id: `zh:sentence:${l.date}-${shortHash(it.zh)}`, domain: 'zh', type: 'sentence',
    front: it.ko.split(/\.\s|\. /)[0], back: it.zh,
    extra: { pinyin: it.py, note: it.gr, lang: 'zh-CN', frontLang: 'ko', backLang: 'zh-CN', speak: it.zh },
    tags: [`${l.n}회`], source: { date: l.date, lesson: l.n },
  }));
  return out;
}

export function zhFixItems(f: Array<{ id: string; date: string; wrong: string; right: string; note: string }>): Item[] {
  return f.map((x) => ({
    id: `zh:fix:${x.id}`, domain: 'zh', type: 'fix', front: `✗ ${x.wrong}`, back: `◯ ${x.right}`,
    extra: { note: x.note, lang: 'zh-CN', frontLang: 'zh-CN', backLang: 'zh-CN', speak: x.right }, tags: ['교정'], source: { date: x.date },
  }));
}

export function enVocabItems(v: Array<{ id: string; word: string; ipa?: string; ko: string; example?: string; tags: string[] }>): Item[] {
  return v.map((w) => ({
    id: `en:vocab:${w.id}`, domain: 'en', type: 'vocab', front: w.word, back: w.ko,
    extra: { ...(w.ipa ? { pinyin: w.ipa } : {}), ...(w.example ? { example: w.example } : {}), lang: 'en-US', frontLang: 'en' }, tags: w.tags,
  }));
}

export function enExpressionItems(v: Array<{ id: string; phrase: string; ko: string; example: string; tags: string[] }>): Item[] {
  return v.map((w) => ({
    id: `en:expression:${w.id}`, domain: 'en', type: 'expression', front: w.phrase, back: w.ko,
    extra: { example: w.example, lang: 'en-US', frontLang: 'en' }, tags: w.tags,
  }));
}

export function enSentenceItems(sets: Array<{ id: string; title: string; sentences: Array<{ en: string; ko: string }> }>): Item[] {
  const out: Item[] = [];
  for (const s of sets) s.sentences.forEach((x) => out.push({
    id: `en:sentence:${s.id}-${shortHash(x.en)}`, domain: 'en', type: 'sentence', front: x.ko, back: x.en,
    extra: { lang: 'en-US', frontLang: 'ko', backLang: 'en', speak: x.en }, tags: [s.title],
  }));
  return out;
}

export function interviewItems(qs: Array<{ id: string; q: string; category: string; lang: string; hint?: string; tags: string[] }>): Item[] {
  return qs.map((q) => ({
    id: `interview:question:${q.id}`, domain: 'interview', type: q.category, front: q.q,
    back: q.hint ?? '(힌트 없음) 질문 상세에서 모범답변을 작성해 두세요.',
    extra: { frontLang: q.lang === 'ko' ? 'ko' : q.lang === 'en' ? 'en' : 'zh-CN' }, tags: [q.lang, ...q.tags],
  }));
}
