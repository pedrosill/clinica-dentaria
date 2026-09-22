/* ================================
   Base URL
================================ */
import { API_BASE_URL as configuredApiBaseUrl } from '../constants/apiBaseUrl';

const API_BASE_URL = configuredApiBaseUrl.replace(/\/$/, '');
const CSRF_ENDPOINT = '/api/auth/csrf';

let csrfToken;
let csrfTokenRequest;

function isStateChangingMethod(method) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase());
}

async function fetchCsrfToken() {
  const response = await fetch(`${API_BASE_URL}${CSRF_ENDPOINT}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.csrfToken) {
    throw new Error('Unable to initialise request protection. Please reload and try again.');
  }

  csrfToken = payload.csrfToken;
  return csrfToken;
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfTokenRequest) {
    csrfTokenRequest = fetchCsrfToken().finally(() => {
      csrfTokenRequest = null;
    });
  }

  return csrfTokenRequest;
}

/* ================================
   Request helper
================================ */
export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (isStateChangingMethod(options.method) && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', await getCsrfToken());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(headers.entries()),
    },
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
