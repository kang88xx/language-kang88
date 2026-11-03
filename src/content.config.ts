import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const zhLessons = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/zh/lessons' }),
  schema: z.object({
    date: z.string(), day: z.string(), n: z.number(), pct: z.number(), theme: z.string(),
    items: z.array(z.object({
      gr: z.string().default(''), zh: z.string().default(''), py: z.string().default(''), ko: z.string().default(''),
      fix: z.object({ bad: z.string(), good: z.string() }).optional(),
    })),
    words: z.array(z.string()),
  }),
});

const zhVocab = defineCollection({
  loader: file('./content/zh/vocab.json'),
  schema: z.object({ id: z.string(), date: z.string(), zh: z.string(), py: z.string(), ko: z.string() }),
});

const zhFixes = defineCollection({
  loader: file('./content/zh/fixes.json'),
  schema: z.object({ id: z.string(), date: z.string(), n: z.number(), wrong: z.string(), right: z.string(), note: z.string() }),
});

const enVocab = defineCollection({
  loader: file('./content/en/vocab.json'),
  schema: z.object({ id: z.string(), word: z.string(), ipa: z.string().optional(), ko: z.string(), example: z.string().optional(), tags: z.array(z.string()).default([]), added: z.string() }),
});

const enExpressions = defineCollection({
  loader: file('./content/en/expressions.json'),
  schema: z.object({ id: z.string(), phrase: z.string(), ko: z.string(), example: z.string(), register: z.enum(['casual', 'business', 'neutral']).default('neutral'), tags: z.array(z.string()).default([]), added: z.string() }),
});

const enShadowing = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/en/shadowing' }),
  schema: z.object({ title: z.string(), source: z.string().optional(), sentences: z.array(z.object({ en: z.string(), ko: z.string() })) }),
});

const interviewQuestions = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/interview/questions' }),
  schema: z.object({
    q: z.string(),
    category: z.enum(['intro', 'career', 'tech', 'behavioral', 'culture']),
    lang: z.enum(['ko', 'en', 'zh']).default('ko'),
    tags: z.array(z.string()).default([]),
    star: z.boolean().default(false),
    hint: z.string().optional(),
    minutes: z.number().default(2),
  }),
});

export const collections = { zhLessons, zhVocab, zhFixes, enVocab, enExpressions, enShadowing, interviewQuestions };
