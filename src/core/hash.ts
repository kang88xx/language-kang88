/** 콘텐츠 기반 안정 ID용 짧은 해시 (djb2, base36). import 스크립트도 이 함수를 쓴다 — 바꾸면 모든 카드 ID 가 바뀐다. */
export function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
