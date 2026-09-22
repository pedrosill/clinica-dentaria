export { API_BASE_URL } from './apiBaseUrl';

export const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0');
  const minutes = String((index % 2) * 30).padStart(2, '0');
  return `${hours}:${minutes}`;
});
