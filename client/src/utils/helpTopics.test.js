import assert from 'node:assert/strict';
import test from 'node:test';
import { getHelpTopicForPath, getVisibleHelpTopics } from '../components/help/helpTopics.js';

test('starts help on the section matching the current route', () => {
  assert.equal(getHelpTopicForPath('/agenda', 'receptionist'), 'agenda');
  assert.equal(getHelpTopicForPath('/patients/12', 'receptionist'), 'patients');
  assert.equal(getHelpTopicForPath('/unknown', 'receptionist'), 'dashboard');
});

test('hides settings help from dentists because settings are not in their navigation', () => {
  assert.equal(getVisibleHelpTopics('dentist').some((topic) => topic.id === 'settings'), false);
  assert.equal(getHelpTopicForPath('/settings', 'dentist'), 'dashboard');
});
