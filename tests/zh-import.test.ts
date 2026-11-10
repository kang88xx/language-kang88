import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferVocabDates, parseWord, buildZhContent, type SrcData } from '../scripts/zh-import.ts';
import { shortHash } from '../src/core/hash.ts';

test('inferVocabDates steps the year back where month-day jumps up (newest first)', () => {
  assert.deepEqual(inferVocabDates(['11-10', '10-29', '04-07'], '2026-11-10'), ['2026-11-10', '2026-10-29', '2026-04-07']);
  assert.deepEqual(inferVocabDates(['01-05', '01-04', '12-30', '11-10'], '2027-01-05'), ['2027-01-05', '2027-01-04', '2026-12-30', '2026-11-10']);
  // 한 해를 넘겨 같은 달이 두 번 나와도 순서로 구분한다 (2026-04 개강 ~ 2027-05 종료)
  assert.deepEqual(inferVocabDates(['05-03', '04-10', '12-30', '04-10', '04-07'], '2027-05-03'), ['2027-05-03', '2027-04-10', '2026-12-30', '2026-04-10', '2026-04-07']);
  // 새해 첫 수업에 단어가 없으면 가장 최신 단어는 작년 것
  assert.deepEqual(inferVocabDates(['12-30', '11-10'], '2027-01-04'), ['2026-12-30', '2026-11-10']);
  // 단어 날짜가 수업 기록일보다 하루 늦는 경우(10/29 단어 ↔ 10/28 수업)는 같은 해
  assert.deepEqual(inferVocabDates(['10-29', '10-28'], '2026-10-28'), ['2026-10-29', '2026-10-28']);
  // 그 하루가 해를 넘기면 다음 해 (12/31 수업의 단어가 01-01 로 적힘)
  assert.deepEqual(inferVocabDates(['01-01', '12-31', '12-30'], '2026-12-31'), ['2027-01-01', '2026-12-31', '2026-12-30']);
  // 연말 수업이라도 단어가 그날 것이면 그대로
  assert.deepEqual(inferVocabDates(['12-28', '12-01'], '2026-12-28'), ['2026-12-28', '2026-12-01']);
});

test('parseWord reads "한자 병음 뜻" and drops a leading [tag]', () => {
  assert.deepEqual(parseWord('一旦 yídàn 일단 ~하면'), { zh: '一旦', py: 'yídàn', ko: '일단 ~하면' });
  assert.deepEqual(parseWord('[10/29] 决心 juéxīn 결심(하다) (下决心 · 决心 + V)'), { zh: '决心', py: 'juéxīn', ko: '결심(하다) (下决心 · 决心 + V)' });
  assert.deepEqual(parseWord('长期 / 短期 chángqī / duǎnqī 장기 / 단기'), { zh: '长期 / 短期', py: 'chángqī / duǎnqī', ko: '장기 / 단기' });
  assert.deepEqual(parseWord('劳民伤财 láomín-shāngcái 국민 혹사, 재물 낭비'), { zh: '劳民伤财', py: 'láomín-shāngcái', ko: '국민 혹사, 재물 낭비' });
  assert.equal(parseWord('联合国 Liánhéguó UN'), null);        // 뜻이 영문자로 시작 → 경계를 알 수 없음
  assert.equal(parseWord('海力士半导体公司 SK하이닉스'), null); // 병음 없음
});

const src = (over: Partial<SrcData> = {}): SrcData => ({
  PROGRESS: { done: 2 }, CAL: [],
  LESSONS: [
    { date: '2027-01-05', day: '화', n: 2, pct: 2, theme: 't2', items: [{ gr: 'g', zh: '乙', py: 'yǐ', ko: '을.' }], words: ['一旦 yídàn 일단 ~하면', '[1/5] 新 xīn 새롭다'] },
    { date: '2026-12-30', day: '수', n: 1, pct: 1, theme: 't1', items: [{ ko: '창문은 擦 를 쓴다.', fix: { bad: '打扫窗户', good: '擦窗户' } }] },
  ],
  VOCAB: [['01-05', '新', 'xīn', '새롭다'], ['12-30', '旧', 'jiù', '낡다']],
  ...over,
});

test('buildZhContent: stable ids, year crossing, and vocab filled in from lesson words', () => {
  const { lessons, vocab, fixes, calendar, added, unparsed, kept } = buildZhContent(src());
  assert.deepEqual(kept, []);
  assert.deepEqual(vocab.map((v) => v.id), [`2027-01-05-${shortHash('新')}`, `2027-01-05-${shortHash('一旦')}`, `2026-12-30-${shortHash('旧')}`]);
  assert.deepEqual(vocab[1], { id: `2027-01-05-${shortHash('一旦')}`, date: '2027-01-05', zh: '一旦', py: 'yídàn', ko: '일단 ~하면' });
  assert.deepEqual(added, ['2027-01-05 一旦']);
  assert.deepEqual(unparsed, []);
  assert.deepEqual(fixes, [{ id: `2026-12-30-${shortHash('打扫窗户')}`, date: '2026-12-30', n: 1, wrong: '打扫窗户', right: '擦窗户', note: '창문은 擦 를 쓴다.' }]);
  assert.deepEqual(lessons[1].items, [{ gr: undefined, zh: undefined, py: undefined, ko: '창문은 擦 를 쓴다.', fix: { bad: '打扫窗户', good: '擦窗户' } }]);
  assert.deepEqual(lessons[1].words, []);
  assert.deepEqual(calendar, { progress: { done: 2 }, months: [] });
});

test('buildZhContent refuses to guess years when VOCAB is not newest-first', () => {
  assert.throws(() => buildZhContent(src({ VOCAB: [['12-30', '旧', 'jiù', '낡다'], ['01-05', '新', 'xīn', '새롭다']] })), /최신순/);
});

test('words that cannot be parsed are reported, not silently dropped', () => {
  const { added, unparsed } = buildZhContent(src({ LESSONS: [{ date: '2027-01-05', day: '화', n: 2, pct: 2, theme: 't', items: [], words: ['联合国 Liánhéguó UN'] }], VOCAB: [['01-05', '新', 'xīn', '새롭다']] }));
  assert.deepEqual(added, []);
  assert.deepEqual(unparsed, ['2027-01-05 联合国 Liánhéguó UN']);
});

test('re-import keeps the id of a word already imported, even if its date moved in the source', () => {
  const first = buildZhContent(src()).vocab;
  const supplemented = first.find((v) => v.zh === '一旦')!.id; // 수업 단어에서 보충된 것: 2027-01-05-…
  // 원본이 나중에 一旦 를 VOCAB 에 다른 날짜로 넣고, 新 의 날짜도 고쳤다
  const moved = src({ VOCAB: [['01-06', '一旦', 'yídàn', '일단 ~하면'], ['01-04', '新', 'xīn', '새롭다'], ['12-30', '旧', 'jiù', '낡다']] });
  const again = buildZhContent(moved, first);
  assert.deepEqual(again.vocab.map((v) => [v.zh, v.id, v.date]), [
    ['一旦', supplemented, '2027-01-06'],
    ['新', `2027-01-05-${shortHash('新')}`, '2027-01-04'],
    ['旧', `2026-12-30-${shortHash('旧')}`, '2026-12-30'],
  ]);
  assert.equal(again.kept.length, 2);
  assert.deepEqual(again.added, []);
  // 처음 가져올 때(이전 파일 없음)는 원본 날짜 그대로
  assert.equal(buildZhContent(moved).vocab[0].id, `2027-01-06-${shortHash('一旦')}`);
  // 같은 한자가 두 번 있으면 어느 쪽인지 알 수 없으므로 손대지 않는다
  const twice = src({ VOCAB: [['01-05', '新', 'xīn', '새롭다'], ['12-30', '新', 'xīn', '새롭다(복습)']] });
  assert.deepEqual(buildZhContent(twice, first).vocab.filter((v) => v.zh === '新').map((v) => v.id), [`2027-01-05-${shortHash('新')}`, `2026-12-30-${shortHash('新')}`]);
});
