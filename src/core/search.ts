/** 한자·병음(성조 제거)·영문·한글 통합 검색용 정규화 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // 병음 성조 부호 제거
    .replace(/[ü]/g, 'u')
    .replace(/[\s　·,，。、.;:!?？！()（）"'“”‘’\-–—]/g, '');
}

export function matches(haystack: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return normalize(haystack).includes(q);
}

export function tokens(query: string): string[] {
  return query.split(/\s+/).map((t) => t.trim()).filter(Boolean);
}

/** 모든 토큰이 포함되어야 일치 */
export function matchesAll(haystack: string, query: string): boolean {
  const h = normalize(haystack);
  return tokens(query).every((t) => h.includes(normalize(t)));
}
