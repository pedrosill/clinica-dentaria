import { apiRequest } from './api';

export function getAppointmentReport(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });

  return apiRequest(`/api/reports/appointments?${params.toString()}`);
}
