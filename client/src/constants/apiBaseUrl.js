const developmentApiUrl = 'http://localhost:5000';

// Production builds are served by the API in the local Docker deployment, so
// an empty base keeps requests same-origin. Development keeps its separate Vite
// and API servers.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? developmentApiUrl : '');
