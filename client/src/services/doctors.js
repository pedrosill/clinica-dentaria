const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function parseResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

export async function getDoctors() {
  const response = await fetch(`${API_BASE_URL}/api/doctors`, { credentials: 'include' });
  return parseResponse(response, 'Failed to load doctors');
}

export async function getDoctorById(doctorId) {
  const response = await fetch(`${API_BASE_URL}/api/doctors/${doctorId}`, {
    credentials: 'include',
  });
  return parseResponse(response, 'Failed to load doctor');
}

export async function createDoctor(payload) {
  const response = await fetch(`${API_BASE_URL}/api/doctors`, {
    credentials: 'include',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to create doctor');
}

export async function updateDoctor(doctorId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/doctors/${doctorId}`, {
    credentials: 'include',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, 'Failed to update doctor');
}

export async function deleteDoctor(doctorId) {
  const response = await fetch(`${API_BASE_URL}/api/doctors/${doctorId}`, {
    credentials: 'include',
    method: 'DELETE',
  });

  return parseResponse(response, 'Failed to delete doctor');
}
