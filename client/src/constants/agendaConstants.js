export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0');
  const minutes = String((index % 2) * 30).padStart(2, '0');
  return `${hours}:${minutes}`;
});
