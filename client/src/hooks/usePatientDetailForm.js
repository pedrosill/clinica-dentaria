import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import useLanguage from '../context/useLanguage';

function buildPatientForm(patient) {
  const dateOfBirth = patient?.dateOfBirth ? new Date(patient.dateOfBirth) : null;

  return {
    fullName: patient?.fullName || '',
    phone: patient?.phone || '',
    email: patient?.email || '',
    nif: patient?.nif || '',
    nationality: patient?.nationality?.toLowerCase() === 'portuguesa' ? 'Portuguese' : patient?.nationality || '',
    dateOfBirth: dateOfBirth && !Number.isNaN(dateOfBirth.getTime())
      ? `${dateOfBirth.getFullYear()}-${String(dateOfBirth.getMonth() + 1).padStart(2, '0')}-${String(dateOfBirth.getDate()).padStart(2, '0')}`
      : '',
  };
}

export default function usePatientDetailForm(patientId, patient, setPatient) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [form, setForm] = useState(() => buildPatientForm(patient));
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!patient) return;

    // Keep the form aligned with the latest server record after a save or reload.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(buildPatientForm(patient));
  }, [patient]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleStartEdit() {
    if (!patient) return;

    setForm(buildPatientForm(patient));
    setSubmitError('');
    setSuccessMessage('');
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setForm(buildPatientForm(patient));
    setSubmitError('');
    setSuccessMessage('');
    setIsEditing(false);
  }

  async function handleSavePatient(event) {
    event.preventDefault();

    if (!patientId) return;

    if (
      !form.fullName.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.nif.trim() ||
      !form.nationality.trim()
    ) {
      setSubmitError(t('Full name, phone, email, NIF and nationality are required'));
      return;
    }

    if (form.nationality.trim().toLowerCase() === 'portuguese' && !/^\d{9}$/.test(form.nif.trim())) {
      setSubmitError(t('Portuguese NIF must contain exactly 9 digits'));
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSuccessMessage('');

      const data = await apiRequest(`/api/patients/${patientId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          nif: form.nif.trim(),
          nationality: form.nationality.trim(),
          dateOfBirth: form.dateOfBirth || null,
        }),
      });

      setPatient(data);
      setForm(buildPatientForm(data));
      setIsEditing(false);
      setSuccessMessage(t('Patient updated successfully.'));
    } catch (error) {
      setSubmitError(error.message || t('Failed to update patient'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenDeleteModal() {
    setSubmitError('');
    setSuccessMessage('');
    setIsDeleteModalOpen(true);
  }

  function handleCloseDeleteModal() {
    if (isSubmitting) return;
    setIsDeleteModalOpen(false);
  }

  async function handleDeletePatient() {
    if (!patientId) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');
      await apiRequest(`/api/patients/${patientId}`, { method: 'DELETE' });
      setIsDeleteModalOpen(false);
      navigate('/patients');
    } catch (error) {
      setSubmitError(error.message || t('Failed to archive patient'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    isEditing,
    isSubmitting,
    submitError,
    successMessage,
    isDeleteModalOpen,
    handleChange,
    handleStartEdit,
    handleCancelEdit,
    handleSavePatient,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleDeletePatient,
  };
}
