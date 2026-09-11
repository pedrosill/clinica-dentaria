/* ================================
   Base URL
================================ */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';

/* ================================
   Request helper
================================ */
export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (isJson && payload?.error) ||
      (isJson && payload?.message) ||
      'Request failed. Please try again.';
    throw new Error(message);
  }

  return payload;
}

/* ================================
   Utils
================================ */
export { API_BASE_URL };