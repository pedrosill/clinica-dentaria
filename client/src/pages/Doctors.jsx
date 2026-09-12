import { useState } from 'react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import DoctorFormModal from '../components/doctors/DoctorFormModal';
import DoctorsHeader from '../components/doctors/DoctorsHeader';
import DoctorsListSection from '../components/doctors/DoctorsListSection';
import useDoctorsData from '../hooks/useDoctorsData';
import useDoctorForm from '../hooks/useDoctorForm';
import useAuth from '../context/useAuth';

export default function Doctors() {
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const canManageDoctors = user?.role === 'admin';

  const { setDoctors, filteredDoctors, isLoading, pageError } = useDoctorsData(searchTerm);

  const {
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
    handleCloseModal,
    handleSubmit,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleDeleteDoctor,
  } = useDoctorForm(setDoctors);

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-10 w-80 animate-pulse rounded-2xl bg-slate-100" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <DoctorsHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenCreateModal={handleOpenCreateModal}
        canManageDoctors={canManageDoctors}
      />

      {pageError ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {pageError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {submitError && !isModalOpen ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {submitError}
        </div>
      ) : null}

       <DoctorsListSection
        doctors={filteredDoctors}
        onOpenDeleteModal={handleOpenDeleteModal}
        canManageDoctors={canManageDoctors}
      />

      <DoctorFormModal
        isOpen={isModalOpen}
        editingDoctorId={editingDoctorId}
        form={form}
        submitError={submitError}
        isSubmitting={isSubmitting}
        onChange={handleChange}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Confirm doctor deletion"
        message={
          doctorPendingDelete
            ? `Are you sure you want to delete doctor: ${doctorPendingDelete.name}?`
            : 'Are you sure you want to delete this doctor?'
        }
        isSubmitting={isSubmitting}
        onCancel={handleCloseDeleteModal}
        onConfirm={handleDeleteDoctor}
      />
    </div>
  );
}
