import { useEffect, useState } from 'react';
import { getDoctors } from '../services/doctors';
import { getAppointmentReport } from '../services/reports';

const EMPTY_REPORT = {
  summary: { total: 0, byStatus: {} },
  rows: [],
  hasMore: false,
};

export default function useReportsData(filters) {
  const [doctors, setDoctors] = useState([]);
  const [report, setReport] = useState(EMPTY_REPORT);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let isMounted = true;

    getDoctors()
      .then((data) => {
        if (isMounted) setDoctors(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // The report remains usable when the optional doctor filter cannot load.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      setIsLoading(true);
      setPageError('');

      try {
        const data = await getAppointmentReport(filters);
        if (!isMounted) return;
        setReport({
          ...EMPTY_REPORT,
          ...data,
          summary: { ...EMPTY_REPORT.summary, ...(data?.summary || {}) },
          rows: Array.isArray(data?.rows) ? data.rows : [],
        });
      } catch (error) {
        if (isMounted) setPageError(error.message || 'Failed to load appointment report');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  return { doctors, report, isLoading, pageError };
}
