export type Domain = 'zh' | 'en' | 'interview';

/** 복습 엔진이 보는 유일한 카드 형태. 도메인 콘텐츠는 빌드 시 toItems() 로 변환된다. */
export interface Item {
  id: string;
  domain: Domain;
  type: string;
  front: string;
  back: string;
  extra?: Record<string, string>;
  tags: string[];
  source?: { date?: string; lesson?: number; ref?: string };
}

/** 면접 질문 분류 */
export const CATEGORY_LABEL: Record<string, string> = { intro: '자기소개', career: '경력', tech: '기술', behavioral: '행동·상황', culture: '회사·문화' };
/** 면접 질문 언어 */
export const LANG_LABEL: Record<string, string> = { ko: '한국어', en: '영어', zh: '중국어' };
/** 복습 카드의 종류 칩. 면접 카드는 type 이 질문 분류다. */
export const TYPE_LABEL: Record<string, string> = { vocab: '단어', sentence: '문장', fix: '교정', expression: '표현', ...CATEGORY_LABEL };
export const DOMAIN_LABEL: Record<Domain, string> = { zh: '중국어', en: '영어', interview: '면접' };
export const DOMAIN_LANG: Record<Domain, string> = { zh: 'zh-CN', en: 'en-US', interview: 'ko-KR' };
