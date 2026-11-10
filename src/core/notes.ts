/** 수업 노트 텍스트 가공. `ko` 는 "번역. 해설 / 해설" 한 덩어리로 오므로, 카드에 쓰려면 번역과 해설을 나누고 앞면에서 정답 한자를 걷어내야 한다. DOM 의존 없음. */

const HAN = /[\u3400-\u9fff]/;
export const hasHan = (s: string): boolean => HAN.test(s);

/** 문장 끝(. ? !) 뒤가 공백·여는 괄호이거나 문자열 끝인 곳을 경계로, 앞에서 n문장과 나머지를 돌려준다. */
export function takeSentences(text: string, n: number): [head: string, rest: string] {
  const end = /[.?!]+['"’”)\]]*(?=\s|$|[(（])/g;
  let cut = 0;
  for (let i = 0; i < n; i++) {
    const m = end.exec(text);
    if (!m) return [text.trim(), ''];
    cut = m.index + m[0].length;
  }
  return [text.slice(0, cut).trim(), text.slice(cut).trim()];
}

/** 중국어 문장 수. 괄호 속 보충(（重新开始）)과 한자가 없는 조각은 세지 않는다. */
export function countZhSentences(zh: string): number {
  return zh.replace(/[（(][^（）()]*[）)]/g, '').split(/[。？！?!]+/).filter(hasHan).length;
}

/**
 * ko → 번역 / 해설.
 * `tr` 이 ko 의 앞부분과 정확히 일치하면 그 경계를 쓰고(content/zh/cards.json 의 수동 지정),
 * 아니면 중국어 문장 수만큼의 한국어 문장을 번역으로 본다.
 */
export function splitKo(ko: string, zh: string, tr?: string): { tr: string; note: string } {
  if (tr && ko.startsWith(tr)) return { tr, note: ko.slice(tr.length).trim() };
  const [head, rest] = takeSentences(ko, Math.max(1, countZhSentences(zh)));
  return { tr: head, note: rest };
}

/** 한자가 든 괄호 주석을 지운다. 앞면이 정답 일부를 미리 보여 주지 않게 하기 위함. */
export function stripHanParens(s: string): string {
  return s.replace(/\s*[（(][^（）()]*[\u3400-\u9fff][^（）()]*[）)]/g, '').trim();
}

/** 교정 노트 첫 문장이 한자 없는 한국어면 그것이 뜻이고("술을 너무 많이 마셨다. 수량 수식은…") 나머지가 해설이다. 어법 설명으로 시작하면 전체가 해설. */
export function splitMeaning(note: string): { meaning?: string; rest: string } {
  const [head, rest] = takeSentences(note, 1);
  return head && !hasHan(head) ? { meaning: head, rest } : { rest: note.trim() };
}

/** 해설을 ' / ' 로 나눈다. 괄호 안의 ' / ' 는 예문 나열이라 나누지 않는다. */
export function splitNote(note: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < note.length; i++) {
    const c = note[i];
    if (c === '(' || c === '（') depth++;
    else if (c === ')' || c === '）') depth = Math.max(0, depth - 1);
    else if (depth === 0 && c === '/' && note[i - 1] === ' ' && note[i + 1] === ' ') { out.push(note.slice(start, i)); start = i + 1; }
  }
  out.push(note.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}
