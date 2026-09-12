import { apiRequest } from './api';

export function getWorkQueue() {
  return apiRequest('/api/work-queue');
}
