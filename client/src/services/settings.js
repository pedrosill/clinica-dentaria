import { apiRequest } from './api';

export function getClinicSettings() {
  return apiRequest('/api/settings');
}

export function updateClinicSettings(payload) {
  return apiRequest('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function createClinicClosure(payload) {
  return apiRequest('/api/settings/closures', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteClinicClosure(closureId) {
  return apiRequest(`/api/settings/closures/${closureId}`, {
    method: 'DELETE',
  });
}

export function updateProviderSchedule(doctorId, payload) {
  return apiRequest(`/api/settings/providers/${doctorId}/schedule`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function createAppointmentType(payload) {
  return apiRequest('/api/settings/appointment-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAppointmentType(typeId, payload) {
  return apiRequest(`/api/settings/appointment-types/${typeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function archiveAppointmentType(typeId) {
  return apiRequest(`/api/settings/appointment-types/${typeId}`, {
    method: 'DELETE',
  });
}
