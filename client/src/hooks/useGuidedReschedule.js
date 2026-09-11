import { useCallback, useState } from 'react';
import { API_BASE_URL } from '../constants/agendaConstants';

function getInitialDate(date, appointment) {
  return date || (appointment?.date ? String(appointment.date).slice(0, 10) : '');
}

export default function useGuidedReschedule({
  isOpen,
  appointment,
  date,
  duration,
}) {
  const [inspectedDate, setInspectedDate] = useState(() =>
    getInitialDate(date, appointment)
  );
  const [daySchedule, setDaySchedule] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const inspectDate = useCallback(
    async (nextDate) => {
      if (!isOpen || !appointment?.id || !nextDate) return;

      try {
        setIsLoading(true);
        setError('');

        const query = new URLSearchParams({
          date: nextDate,
          duration: String(duration || appointment.duration || 30),
        });
        const response = await fetch(
          `${API_BASE_URL}/api/appointments/${appointment.id}/reschedule-options?${query}`
        );
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || 'Failed to inspect doctor availability');
        }

        setDaySchedule(data);
      } catch (requestError) {
        setDaySchedule(null);
        setError(requestError.message || 'Failed to inspect doctor availability');
      } finally {
        setIsLoading(false);
      }
    },
    [appointment, duration, isOpen]
  );

  return {
    inspectedDate,
    setInspectedDate,
    daySchedule,
    isLoading,
    error,
    inspectDate,
  };
}
