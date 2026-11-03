import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortHash } from '../src/core/hash.ts';
import { zhVocabItems, zhSentenceItems } from '../src/core/convert.ts';

test('ids depend on content, not array position', () => {
  const a = zhVocabItems([{ id: `2026-10-29-${shortHash('决心')}`, date: '2026-10-29', zh: '决心', py: 'juéxīn', ko: '결심' }]);
  const b = zhVocabItems([{ id: 'x', date: '2026-10-28', zh: '其他', py: 'qítā', ko: '기타' }, { id: `2026-10-29-${shortHash('决心')}`, date: '2026-10-29', zh: '决心', py: 'juéxīn', ko: '결심' }]);
  assert.equal(a[0].id, b[1].id);
  const l = { date: '2026-10-30', n: 110, items: [{ gr: '', zh: '甲', py: '', ko: '갑.' }, { gr: '', zh: '乙', py: '', ko: '을.' }] };
  const s1 = zhSentenceItems([l]); const s2 = zhSentenceItems([{ ...l, items: [l.items[1], l.items[0]] }]);
  assert.equal(s1[1].id, s2[0].id);
});
