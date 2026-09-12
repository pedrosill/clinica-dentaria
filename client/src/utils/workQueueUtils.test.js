import test from 'node:test';
import assert from 'node:assert/strict';
import { formatQueueDueAt, getWorkQueuePresentation } from './workQueueUtils.js';

const t = (value) => value;

test('work queue creates a concise contextual title and action for an item', () => {
    const result = getWorkQueuePresentation({
      type: 'arrived_waiting',
      patient: { name: 'Ana Silva' },
      action: { label: 'Open appointment' },
    }, t);

    assert.equal(result.title, 'Start attendance · Ana Silva');
    assert.equal(result.actionLabel, 'Open appointment');
});

test('work queue formats date-only values without a UTC day shift', () => {
  assert.match(formatQueueDueAt('2026-09-12', 'en-GB'), /12/);
});
