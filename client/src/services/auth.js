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

export function verifyMfa(payload) {
  return apiRequest('/api/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function requestPasswordRecovery(email) {
  return apiRequest('/api/auth/password/recovery/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(payload) {
  return apiRequest('/api/auth/password/recovery/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function setupMfa(payload) {
  return apiRequest('/api/auth/mfa/setup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function enableMfa(code) {
  return apiRequest('/api/auth/mfa/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function disableMfa(currentPassword) {
  return apiRequest('/api/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ currentPassword }),
  });
}
