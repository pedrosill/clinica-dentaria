import { useState } from 'react';
import { API_BASE_URL, DEFAULT_DOCTOR_FORM } from '../constants/doctorsConstants';

export default function useDoctorForm(setDoctors) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [form, setForm] = useState(DEFAULT_DOCTOR_FORM);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [doctorPendingDelete, setDoctorPendingDelete] = useState(null);

  function resetFormState() {
    setEditingDoctorId(null);
    setForm(DEFAULT_DOCTOR_FORM);
    setSubmitError('');
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleOpenCreateModal() {
    resetFormState();
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function handleOpenEditModal(doctor) {
    setEditingDoctorId(doctor.id);
    setForm({
      name: doctor.name || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      specialty: doctor.specialty || '',
    });
    setSubmitError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    resetFormState();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setSubmitError('Doctor name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSuccessMessage('');

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        specialty: form.specialty.trim(),
      };

      const response = await fetch(
        editingDoctorId
          ? `${API_BASE_URL}/api/doctors/${editingDoctorId}`
          : `${API_BASE_URL}/api/doctors`,
        {
          method: editingDoctorId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to save doctor');
      }

      if (editingDoctorId) {
        setDoctors((currentDoctors) =>
          currentDoctors.map((doctor) => (doctor.id === editingDoctorId ? data : doctor))
        );
        setSuccessMessage('Doctor updated successfully.');
      } else {
        setDoctors((currentDoctors) => [data, ...currentDoctors]);
        setSuccessMessage('Doctor created successfully.');
      }

      setIsModalOpen(false);
      resetFormState();
    } catch (error) {
      setSubmitError(error.message || 'Failed to save doctor');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenDeleteModal(doctor) {
    setDoctorPendingDelete(doctor);
    setSubmitError('');
    setSuccessMessage('');
    setIsDeleteModalOpen(true);
  }

  function handleCloseDeleteModal() {
    if (isSubmitting) return;
    setIsDeleteModalOpen(false);
    setDoctorPendingDelete(null);
  }

  async function handleDeleteDoctor() {
    if (!doctorPendingDelete?.id) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSuccessMessage('');

      const response = await fetch(`${API_BASE_URL}/api/doctors/${doctorPendingDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to delete doctor');
      }

      setDoctors((currentDoctors) =>
        currentDoctors.filter((doctor) => doctor.id !== doctorPendingDelete.id)
      );

      setSuccessMessage('Doctor deleted successfully.');
    } catch (error) {
      setSubmitError(error.message || 'Failed to delete doctor');
    } finally {
      setIsSubmitting(false);
      setIsDeleteModalOpen(false);
      setDoctorPendingDelete(null);
    }
  }

  return {
    form,
    editingDoctorId,
    isModalOpen,
    submitError,
    successMessage,
    isSubmitting,
    isDeleteModalOpen,
    doctorPendingDelete,
    handleChange,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
    handleSubmit,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleDeleteDoctor,
  };
}