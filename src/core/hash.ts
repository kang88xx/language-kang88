/** 콘텐츠 기반 안정 ID용 짧은 해시 (djb2, base36). 같은 함수가 scripts/import-chinese-class.mjs 에도 있다. */
export function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
