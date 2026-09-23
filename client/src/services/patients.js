import { apiRequest, API_BASE_URL } from './api';

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

export function getPatientPrivacyNotices(patientId) {
  return apiRequest(`/api/patients/${patientId}/privacy-notice`);
}

export function sendPatientPrivacyNotice(patientId) {
  return apiRequest(`/api/patients/${patientId}/privacy-notice/send`, { method: 'POST' });
}

export async function downloadPatientPrivacyNotice(patientId) {
  const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/privacy-notice.pdf`, { credentials: 'include' });
  if (!response.ok) throw new Error('Unable to download the privacy notice.');
  return response.blob();
}

export function exportPatientRecord(patientId) {
  return apiRequest(`/api/patients/${patientId}/export`);
}

export function getPatientDocuments(patientId) {
  return apiRequest(`/api/patients/${patientId}/documents`);
}

export function uploadPatientDocument(patientId, file) {
  return apiRequest(`/api/patients/${patientId}/documents/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': file.name, 'X-File-Type': file.type },
    body: file,
  });
}

export async function downloadPatientDocument(patientId, documentId) {
  const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/documents/${documentId}/content`, { credentials: 'include' });
  if (!response.ok) throw new Error('Unable to download the private document.');
  return response.blob();
}
