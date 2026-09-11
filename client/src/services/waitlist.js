import { apiRequest } from './api';

export function getWaitlist({ status, patientId, limit = 100 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set('status', status);
  if (patientId !== undefined && patientId !== null) params.set('patientId', String(patientId));
  return apiRequest(`/api/waitlist?${params.toString()}`);
}

export function createPatientWaitlistEntry(patientId, payload) {
  return apiRequest(`/api/patients/${patientId}/waitlist`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateWaitlistStatus(entryId, status) {
  return apiRequest(`/api/waitlist/${entryId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
