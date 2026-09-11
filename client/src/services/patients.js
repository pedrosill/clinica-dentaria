const API_BASE_URL = 'http://localhost:5000';

export async function createPatient(payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to create patient');
  }

  return data;
}