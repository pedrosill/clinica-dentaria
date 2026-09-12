import { apiRequest } from '../lib/api';

function clinicalPath(patientId, suffix = '') {
  return `/api/patients/${patientId}/clinical${suffix}`;
}

export function getClinicalRecord(patientId) {
  return apiRequest(clinicalPath(patientId));
}

export function updateClinicalProfile(patientId, payload) {
  return apiRequest(clinicalPath(patientId, '/profile'), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function saveToothChartEntry(patientId, payload) {
  return apiRequest(clinicalPath(patientId, '/teeth'), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteToothChartEntry(patientId, entryId, payload = {}) {
  return apiRequest(clinicalPath(patientId, `/teeth/${entryId}`), { method: 'DELETE', body: JSON.stringify(payload) });
}

export function createClinicalNote(patientId, payload) {
  return apiRequest(clinicalPath(patientId, '/notes'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateClinicalNote(patientId, noteId, payload) {
  return apiRequest(clinicalPath(patientId, `/notes/${noteId}`), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function validateClinicalNote(patientId, noteId) {
  return apiRequest(clinicalPath(patientId, `/notes/${noteId}/validate`), { method: 'POST', body: JSON.stringify({}) });
}

export function createTreatmentPlan(patientId, payload) {
  return apiRequest(clinicalPath(patientId, '/treatment-plans'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTreatmentPlan(patientId, planId, payload) {
  return apiRequest(clinicalPath(patientId, `/treatment-plans/${planId}`), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function createTreatmentPlanItem(patientId, planId, payload) {
  return apiRequest(clinicalPath(patientId, `/treatment-plans/${planId}/items`), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTreatmentPlanItem(patientId, itemId, payload) {
  return apiRequest(clinicalPath(patientId, `/treatment-plan-items/${itemId}`), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteTreatmentPlanItem(patientId, itemId) {
  return apiRequest(clinicalPath(patientId, `/treatment-plan-items/${itemId}`), { method: 'DELETE' });
}
