import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDashboardTodayAppointments,
  buildDashboardTodaySummary,
  buildDashboardUpcomingAppointments,
} from './dashboardUtils.js';

function localDateWithOffset(daysFromToday) {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + daysFromToday);

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function appointment(id, daysFromToday, time, status = 'scheduled') {
  return {
    id,
    date: `${localDateWithOffset(daysFromToday)}T00:00:00`,
    time,
    status,
  };
}

test('returns future active appointments in chronological order', () => {
  const appointments = [
    appointment(1, 3, '10:00'),
    appointment(2, 1, '15:00'),
    appointment(3, 1, '09:00', 'arrived'),
    appointment(4, -1, '09:00'),
    appointment(5, 2, '09:00', 'completed'),
    appointment(6, 2, '11:00', 'cancelled'),
  ];

  assert.deepEqual(
    buildDashboardUpcomingAppointments(appointments).map((item) => item.id),
    [3, 2, 1]
  );
});

test('limits the dashboard list to four appointments', () => {
  const appointments = [1, 2, 3, 4, 5].map((id) => appointment(id, id, '09:00'));

  assert.deepEqual(
    buildDashboardUpcomingAppointments(appointments).map((item) => item.id),
    [1, 2, 3, 4]
  );
});

test("builds today's appointments in time order without excluding completed visits", () => {
  const referenceDate = new Date(`${localDateWithOffset(0)}T12:00:00`);
  const appointments = [
    appointment(1, 0, '15:00'),
    appointment(2, -1, '10:00'),
    appointment(3, 0, '09:00', 'completed'),
    appointment(4, 0, '11:00', 'arrived'),
  ];

  assert.deepEqual(
    buildDashboardTodayAppointments(appointments, referenceDate).map((item) => item.id),
    [3, 4, 1]
  );
});

test('summarizes open and arrived appointments and prioritizes an arrived patient', () => {
  const referenceDate = new Date(`${localDateWithOffset(0)}T12:00:00`);
  const appointments = [
    appointment(1, 0, '15:00'),
    appointment(2, 0, '10:00', 'arrived'),
    appointment(3, 0, '09:00', 'completed'),
  ];

  assert.deepEqual(buildDashboardTodaySummary(appointments, referenceDate), {
    appointments: [appointments[2], appointments[1], appointments[0]],
    activeCount: 2,
    arrivedCount: 1,
    nextAppointment: appointments[1],
  });
});
