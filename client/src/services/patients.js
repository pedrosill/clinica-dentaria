import { apiRequest } from './api';

export async function createPatient(payload) {
  return apiRequest('/api/patients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPatientConsents(patientId) {
  return apiRequest(`/api/patients/${patientId}/consents`);
}

export function createPatientConsent(patientId, payload) {
  return apiRequest(`/api/patients/${patientId}/consents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function withdrawPatientConsent(patientId, consentId) {
  return apiRequest(`/api/patients/${patientId}/consents/${consentId}/withdraw`, {
    method: 'POST',
  });
}

export function exportPatientRecord(patientId) {
  return apiRequest(`/api/patients/${patientId}/export`);
}
