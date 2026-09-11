import { apiRequest } from './api';

export async function getDoctors() {
  return apiRequest('/api/doctors');
}

export async function getDoctorById(doctorId) {
  return apiRequest(`/api/doctors/${doctorId}`);
}

export async function createDoctor(payload) {
  return apiRequest('/api/doctors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDoctor(doctorId, payload) {
  return apiRequest(`/api/doctors/${doctorId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteDoctor(doctorId) {
  return apiRequest(`/api/doctors/${doctorId}`, {
    method: 'DELETE',
  });
}
