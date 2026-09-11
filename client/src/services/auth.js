import { apiRequest } from './api';

export function changePassword(payload) {
  return apiRequest('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
