import { apiRequest } from './api';

export function getLoginUsers() {
  return apiRequest('/api/auth/users');
}

export function changePassword(payload) {
  return apiRequest('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
