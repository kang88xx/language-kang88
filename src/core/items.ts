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

export const DOMAIN_LABEL: Record<Domain, string> = { zh: '중국어', en: '영어', interview: '면접' };
export const DOMAIN_LANG: Record<Domain, string> = { zh: 'zh-CN', en: 'en-US', interview: 'ko-KR' };
