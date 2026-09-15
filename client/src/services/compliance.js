import { apiRequest } from './api';

export function getCompliance() {
  return apiRequest('/api/compliance');
}

export function getComplianceOwners() {
  return apiRequest('/api/compliance/owners');
}

export function updateComplianceItem(itemId, payload) {
  return apiRequest(`/api/compliance/${itemId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
