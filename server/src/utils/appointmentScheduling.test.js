const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildAvailabilitySlots,
  getClinicDayBounds,
  SLOT_INTERVAL_MINUTES,
} = require('./appointmentScheduling');

function getSlots(duration, bookedAppointments = []) {
  const { clinicOpen, clinicClose } = getClinicDayBounds('2026-10-15');

  return buildAvailabilitySlots({
    clinicOpen,
    clinicClose,
    duration,
    bookedAppointments,
    now: new Date('2026-10-01T10:00:00'),
  });
}

function slotAt(time, duration) {
  const start = new Date(`2026-10-15T${time}:00`);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  return { start, end };
}

test('builds 30-minute slots from 08:00 through 19:30', () => {
  const slots = getSlots(30);

  assert.equal(SLOT_INTERVAL_MINUTES, 30);
  assert.equal(slots.length, 24);
  assert.equal(slots[0].time, '08:00');
  assert.equal(slots.at(-1).time, '19:30');
  assert.ok(slots.every((slot) => slot.status === 'free'));
  assert.ok(
    slots.every((slot) => Number(slot.time.slice(-2)) % SLOT_INTERVAL_MINUTES === 0)
  );
});

test('does not offer a duration that would finish after 20:00', () => {
  const slots = getSlots(60);

  assert.equal(slots.find((slot) => slot.time === '19:00').status, 'free');
  assert.equal(slots.find((slot) => slot.time === '19:30').status, 'unavailable');
  assert.deepEqual(
    slots.filter((slot) => slot.status === 'free').at(-1),
    { time: '19:00', status: 'free' }
  );
});

test('marks every overlapping start time as booked', () => {
  const slots = getSlots(30, [slotAt('09:00', 60)]);

  assert.equal(slots.find((slot) => slot.time === '08:30').status, 'free');
  assert.equal(slots.find((slot) => slot.time === '09:00').status, 'booked');
  assert.equal(slots.find((slot) => slot.time === '09:30').status, 'booked');
  assert.equal(slots.find((slot) => slot.time === '10:00').status, 'free');
});

test('allows a slot that starts exactly when the previous appointment ends', () => {
  const slots = getSlots(30, [slotAt('09:00', 30)]);

  assert.equal(slots.find((slot) => slot.time === '09:00').status, 'booked');
  assert.equal(slots.find((slot) => slot.time === '09:30').status, 'free');
});

test('marks same-day slots that have already started as unavailable', () => {
  const { clinicOpen, clinicClose } = getClinicDayBounds('2026-10-15');
  const slots = buildAvailabilitySlots({
    clinicOpen,
    clinicClose,
    duration: 30,
    now: new Date('2026-10-15T14:15:00'),
  });

  assert.equal(slots.find((slot) => slot.time === '14:00').status, 'unavailable');
  assert.equal(slots.find((slot) => slot.time === '14:30').status, 'free');
});
