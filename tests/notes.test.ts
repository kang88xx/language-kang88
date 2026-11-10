import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeSentences, countZhSentences, splitKo, stripHanParens, splitMeaning, splitNote, hasHan } from '../src/core/notes.ts';
import { zhSentenceItems, zhFixItems } from '../src/core/convert.ts';
import { shortHash } from '../src/core/hash.ts';

test('takeSentences cuts after . ? ! only when followed by space or end', () => {
  assert.deepEqual(takeSentences('기온이 2~3도 내려갔지만 별 느낌이 없다.', 1), ['기온이 2~3도 내려갔지만 별 느낌이 없다.', '']);
  assert.deepEqual(takeSentences('네가 그들만큼 돈이 많다면 어떻게 쓸 거야? 가정 + 의문 질문 틀', 1), ['네가 그들만큼 돈이 많다면 어떻게 쓸 거야?', '가정 + 의문 질문 틀']);
  assert.deepEqual(takeSentences('많은 개미들이 털렸다. (被자문)', 1), ['많은 개미들이 털렸다.', '(被자문)']);
  assert.deepEqual(takeSentences('마침표 없는 글', 2), ['마침표 없는 글', '']);
  assert.deepEqual(takeSentences('환경이 필요하다.(远离 멀리하다) 해설', 1), ['환경이 필요하다.', '(远离 멀리하다) 해설']); // 띄어쓰기 없이 붙은 괄호 주석
  assert.deepEqual(takeSentences('예쁜 모양(양머리)을 만든다. 해설', 1), ['예쁜 모양(양머리)을 만든다.', '해설']);
});

test('countZhSentences ignores parenthetical glosses and non-Chinese fragments', () => {
  assert.equal(countZhSentences('去理发店剪头发。你要从头再来吗？（重新开始）'), 2);
  assert.equal(countZhSentences('你被割过韭菜吗？— 当然，搞投资的人都被割过韭菜。'), 2);
  assert.equal(countZhSentences('我觉得以后暴力事件会经常发生，因为贫富差异越来越（大）。'), 1);
  assert.equal(countZhSentences('寿命'), 1);
  assert.equal(countZhSentences('—'), 0);
});

test('splitKo: translation covers as many sentences as the Chinese has; an exact `tr` prefix overrides', () => {
  const zh2 = '怎么数字排毒？需要远离数字产品的环境。';
  const ko2 = '디지털 디톡스는 어떻게? 디지털 기기에서 멀리 떨어진 환경이 필요하다. (远离 멀리하다)';
  assert.deepEqual(splitKo(ko2, zh2), { tr: '디지털 디톡스는 어떻게? 디지털 기기에서 멀리 떨어진 환경이 필요하다.', note: '(远离 멀리하다)' });

  // 중국어는 한 문장인데 번역을 두 문장으로 푼 경우는 자동으로 알 수 없다 → cards.json 의 tr
  const zh1 = '能不能有点儿自知之明啊，就是因为你们离开了。';
  const ko1 = '주제 파악 좀 할 수 없겠니? (내가 떠나는 건) 바로 너희들 때문인데. 정반 의문으로 요청·질책';
  assert.equal(splitKo(ko1, zh1).tr, '주제 파악 좀 할 수 없겠니?');
  const tr = '주제 파악 좀 할 수 없겠니? (내가 떠나는 건) 바로 너희들 때문인데.';
  assert.deepEqual(splitKo(ko1, zh1, tr), { tr, note: '정반 의문으로 요청·질책' });
  // 원문이 바뀌어 tr 이 더는 앞부분이 아니면 자동 분리로 돌아간다
  assert.equal(splitKo('주제 파악 좀 해. 해설', zh1, tr).tr, '주제 파악 좀 해.');
});

test('stripHanParens removes only parentheticals that contain Chinese', () => {
  assert.equal(stripHanParens("'지갑님 잠시만요(钱包请等等)' 라는 이름의 미니프로그램"), "'지갑님 잠시만요' 라는 이름의 미니프로그램");
  assert.equal(stripHanParens('수건을 머리에 써서 예쁜 모양(양머리)을 만든다.'), '수건을 머리에 써서 예쁜 모양(양머리)을 만든다.');
});

test('splitMeaning: a Korean-only first sentence is the meaning; grammar notes are not', () => {
  assert.deepEqual(splitMeaning('술을 너무 많이 마셨다. 수량 수식은 목적어 앞 (太多的+명사).'), { meaning: '술을 너무 많이 마셨다.', rest: '수량 수식은 목적어 앞 (太多的+명사).' });
  assert.deepEqual(splitMeaning('창문은 擦(닦다)를 쓴다.'), { rest: '창문은 擦(닦다)를 쓴다.' });
  assert.deepEqual(splitMeaning(''), { rest: '' });
});

test('splitNote splits on " / " outside parentheses', () => {
  assert.deepEqual(splitNote('让 사역 / 通话 통화하다.'), ['让 사역', '通话 통화하다.']);
  assert.deepEqual(splitNote('뒤에 的 (死气沉沉的 / 乱七八糟的 / 红红的) / 没有活力·没有精神'), ['뒤에 的 (死气沉沉的 / 乱七八糟的 / 红红的)', '没有活力·没有精神']);
  assert.deepEqual(splitNote('8/11·9/9 에 이어 的话 3번째'), ['8/11·9/9 에 이어 的话 3번째']);
  assert.deepEqual(splitNote(''), []);
});

test('sentence cards: Korean prompt on the front, notes kept apart, non-sentences skipped', () => {
  const zh = '怎么数字排毒？需要远离数字产品的环境。';
  const lesson = { date: '2026-08-26', n: 75, items: [
    { gr: '怎么 + V', zh, py: 'zěnme', ko: '디지털 디톡스는 어떻게? 디지털 기기에서 멀리 떨어진 환경이 필요하다. (远离 멀리하다)' },
    { gr: '', zh: '—', py: '', ko: '강사평 내용 없음 (빈 메일).' },   // 빈 메일
    { gr: '', zh: '', py: '', ko: '창문은 擦(닦다)를 쓴다.' },        // 교정만 있는 항목
  ] };
  const items = zhSentenceItems([lesson]);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, `zh:sentence:2026-08-26-${shortHash(zh)}`);
  assert.equal(items[0].front, '디지털 디톡스는 어떻게? 디지털 기기에서 멀리 떨어진 환경이 필요하다.');
  assert.equal(items[0].back, zh);
  assert.equal(items[0].extra?.detail, '(远离 멀리하다)');
  assert.equal(items[0].extra?.note, '怎么 + V');
  assert.ok(!hasHan(items[0].front));

  const withFront = zhSentenceItems([lesson], { [`sentence:2026-08-26-${shortHash(zh)}`]: { front: '직접 쓴 앞면' } });
  assert.equal(withFront[0].front, '직접 쓴 앞면');
  assert.equal(withFront[0].extra?.detail, '(远离 멀리하다)');
});

test('fix cards ask in Korean when the meaning is known, and fall back to ✗ → ◯ otherwise', () => {
  const fixes = [
    { id: 'a', date: '2026-08-19', n: 71, wrong: '喝了酒太多了', right: '喝了太多的酒。', note: '술을 너무 많이 마셨다. 수량 수식은 목적어 앞.' },
    { id: 'b', date: '2026-04-13', wrong: '打扫窗户', right: '擦窗户', note: '창문은 擦(닦다)를 쓴다.' },
  ];
  const [auto, old] = zhFixItems(fixes);
  assert.deepEqual([auto.front, auto.back, auto.extra?.wrong, auto.extra?.frontLang], ['술을 너무 많이 마셨다.', '喝了太多的酒。', '喝了酒太多了', 'ko']);
  assert.deepEqual([auto.extra?.detail, auto.tags], ['수량 수식은 목적어 앞.', ['71회']]); // 뜻 문장은 앞면에 썼으니 해설에서 뺀다
  assert.deepEqual([old.front, old.back, old.extra?.wrong, old.extra?.detail, old.tags], ['✗ 打扫窗户', '◯ 擦窗户', undefined, '창문은 擦(닦다)를 쓴다.', []]);
  // 앞면을 직접 쓰면 노트는 한 글자도 버리지 않는다
  const [own] = zhFixItems(fixes, { 'fix:a': { front: '과음했다' } });
  assert.deepEqual([own.front, own.extra?.detail], ['과음했다', '술을 너무 많이 마셨다. 수량 수식은 목적어 앞.']);
  const [, asked] = zhFixItems(fixes, { 'fix:b': { front: '창문을 닦다' } });
  assert.deepEqual([asked.id, asked.front, asked.back, asked.extra?.wrong, asked.extra?.detail], ['zh:fix:b', '창문을 닦다', '擦窗户', '打扫窗户', '창문은 擦(닦다)를 쓴다.']);
});
