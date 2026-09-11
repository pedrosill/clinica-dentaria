import { apiRequest } from './api';

export function getUsers() {
  return apiRequest('/api/users');
}

export function createUser(payload) {
  return apiRequest('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function setUserActive(userId, isActive) {
  return apiRequest(`/api/users/${userId}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}
