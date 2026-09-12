/* ================================
   Imports
================================ */
import { apiRequest } from './api';

/* ================================
   Appointments API
================================ */
export function getAppointments() {
  return apiRequest('/api/appointments');
}

export function createAppointment(data) {
  return apiRequest('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteAppointment(id) {
  return apiRequest(`/api/appointments/${id}`, {
    method: 'DELETE',
  });
}

export function sendAppointmentConfirmation(id) {
  return apiRequest(`/api/appointments/${id}/confirmation`, {
    method: 'POST',
  });
}
