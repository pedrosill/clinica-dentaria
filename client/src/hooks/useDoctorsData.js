import { useEffect, useMemo, useState } from 'react';
import useLanguage from '../context/useLanguage';
import { API_BASE_URL } from '../constants/doctorsConstants';
import { matchesDoctorSearch } from '../utils/doctorsUtils';

export default function useDoctorsData(searchTerm) {
  const { t } = useLanguage();
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      try {
        setIsLoading(true);
        setPageError('');

        const response = await fetch(`${API_BASE_URL}/api/doctors`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load doctors');
        }

        const data = await response.json();

        if (!isMounted) return;

        setDoctors(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!isMounted) return;
        setPageError(error.message || t('Failed to load doctors'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => matchesDoctorSearch(doctor, searchTerm));
  }, [doctors, searchTerm]);

  return {
    doctors,
    setDoctors,
    filteredDoctors,
    isLoading,
    pageError,
  };
}
