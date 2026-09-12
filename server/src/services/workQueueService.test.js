const assert = require('node:assert/strict');
const test = require('node:test');
const { dateAtTime, localDateOnly, sortItems } = require('./workQueueService');

test('work queue uses local clinic dates and times', () => {
  const date = new Date(2026, 8, 12, 23, 45);
  assert.equal(localDateOnly(date), '2026-09-12');
  assert.equal(dateAtTime(date, '08:30').getHours(), 8);
  assert.equal(dateAtTime(date, '08:30').getMinutes(), 30);
});

test('work queue sorts urgent work before lower priority work deterministically', () => {
  const items = sortItems([
    { id: 'b', priority: 'normal', dueAt: '2026-09-12' },
    { id: 'c', priority: 'urgent', dueAt: '2026-09-13' },
    { id: 'a', priority: 'urgent', dueAt: '2026-09-12' },
  ]);

  assert.deepEqual(items.map((item) => item.id), ['a', 'c', 'b']);
});
