/** 도메인 콘텐츠 → 공통 Item 변환 (빌드 시) */
import type { Item } from './items.ts';
import { LANG_LABEL } from './items.ts';
import { shortHash } from './hash.ts';
import { hasHan, splitKo, splitMeaning, stripHanParens } from './notes.ts';

/** content/zh/cards.json 한 줄. `tr`: ko 중 번역이 끝나는 곳(자동 분리가 틀릴 때), `front`: 번역 대신 쓸 앞면. */
export interface ZhCard { tr?: string; front?: string }
/** 키는 Item id 에서 'zh:' 를 뺀 값 — `sentence:<date>-<hash>` / `fix:<date>-<hash>` */
export type ZhCards = Record<string, ZhCard>;

export function zhVocabItems(v: Array<{ id: string; date: string; zh: string; py: string; ko: string }>): Item[] {
  return v.map((w) => ({
    id: `zh:vocab:${w.id}`, domain: 'zh', type: 'vocab', front: w.zh, back: w.ko,
    extra: { pinyin: w.py, lang: 'zh-CN', frontLang: 'zh-CN' }, tags: [w.date.slice(5)], source: { date: w.date },
  }));
}

export function zhSentenceItems(lessons: Array<{ date: string; n: number; items: Array<{ gr: string; zh: string; py: string; ko: string }> }>, cards: ZhCards = {}): Item[] {
  const out: Item[] = [];
  for (const l of lessons) for (const it of l.items) {
    if (!it.ko || !hasHan(it.zh)) continue; // 교정만 있는 항목, 빈 메일('—') 은 문장 카드가 아니다
    const key = `${l.date}-${shortHash(it.zh)}`;
    const card = cards[`sentence:${key}`];
    const { tr, note } = splitKo(it.ko, it.zh, card?.tr);
    out.push({
      id: `zh:sentence:${key}`, domain: 'zh', type: 'sentence',
      front: card?.front ?? stripHanParens(tr), back: it.zh,
      extra: { pinyin: it.py, note: it.gr, ...(note ? { detail: note } : {}), lang: 'zh-CN', frontLang: 'ko', backLang: 'zh-CN', speak: it.zh },
      tags: [`${l.n}회`], source: { date: l.date, lesson: l.n },
    });
  }
  return out;
}

/** 뜻을 알 수 있으면 '한국어 → 바른 표현' 으로 묻고 틀렸던 표현은 정답과 함께 보여 준다. 뜻이 없으면 예전처럼 ✗ → ◯. */
export function zhFixItems(f: Array<{ id: string; date: string; n?: number; wrong: string; right: string; note: string }>, cards: ZhCards = {}): Item[] {
  return f.map((x): Item => {
    const { meaning, rest } = splitMeaning(x.note);
    const own = cards[`fix:${x.id}`]?.front;
    const ask = own ?? meaning;
    const detail = own ? x.note.trim() : rest; // 노트의 뜻 문장을 그대로 앞면에 썼을 때만 해설에서 뺀다
    const base = { id: `zh:fix:${x.id}`, domain: 'zh' as const, type: 'fix', tags: x.n ? [`${x.n}회`] : [], source: { date: x.date, ...(x.n ? { lesson: x.n } : {}) } };
    const extra = { ...(detail ? { detail } : {}), lang: 'zh-CN', backLang: 'zh-CN', speak: x.right };
    if (ask) return { ...base, front: ask, back: x.right, extra: { ...extra, wrong: x.wrong, frontLang: 'ko' } };
    return { ...base, front: `✗ ${x.wrong}`, back: `◯ ${x.right}`, extra: { ...extra, frontLang: 'zh-CN' } };
  });
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
    extra: { frontLang: q.lang === 'ko' ? 'ko' : q.lang === 'en' ? 'en' : 'zh-CN' }, tags: [LANG_LABEL[q.lang] ?? q.lang, ...q.tags],
  }));
}
