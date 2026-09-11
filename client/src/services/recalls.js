import { apiRequest } from './api';

export function getRecalls({ status = 'open', patientId, limit = 100 } = {}) {
  const params = new URLSearchParams({ status, limit: String(limit) });
  if (patientId !== undefined && patientId !== null) params.set('patientId', String(patientId));
  return apiRequest(`/api/recalls?${params.toString()}`);
}

export function createPatientRecall(patientId, payload) {
  return apiRequest(`/api/patients/${patientId}/recalls`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRecallStatus(recallId, status) {
  return apiRequest(`/api/recalls/${recallId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
