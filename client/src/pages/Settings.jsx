import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import {
  createDoctor,
  deleteDoctor,
  getDoctors,
  updateDoctor,
} from '../services/doctors';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  nif: '',
};

export default function Settings() {
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let isMounted = true;

    async function loadDoctors() {
      try {
        setIsLoading(true);
        setPageError('');
        const data = await getDoctors();

        if (!isMounted) return;
        setDoctors(data);
      } catch (error) {
        if (!isMounted) return;
        setPageError(error.message || 'Failed to load doctors');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDoctors();

    return () => {
      isMounted = false;
    };
  }, []);

  const isEditing = useMemo(() => editingDoctorId !== null, [editingDoctorId]);

  function resetForm() {
    setEditingDoctorId(null);
    setForm(EMPTY_FORM);
    setSubmitError('');
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleEditDoctor(doctor) {
    setEditingDoctorId(doctor.id);
    setForm({
      name: doctor.name || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      nif: doctor.nif || '',
    });
    setSubmitError('');
    setSuccessMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setSubmitError('Name is required');
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
        nif: form.nif.trim(),
      };

      if (isEditing) {
        const updatedDoctor = await updateDoctor(editingDoctorId, payload);
        setDoctors((currentDoctors) =>
          currentDoctors.map((doctor) =>
            doctor.id === editingDoctorId ? updatedDoctor : doctor
          )
        );
        setSuccessMessage('Doctor updated successfully.');
      } else {
        const createdDoctor = await createDoctor(payload);
        setDoctors((currentDoctors) => [createdDoctor, ...currentDoctors]);
        setSuccessMessage('Doctor created successfully.');
      }

      resetForm();
    } catch (error) {
      setSubmitError(error.message || 'Failed to save doctor');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDoctor(doctorId) {
    try {
      setSubmitError('');
      setSuccessMessage('');
      await deleteDoctor(doctorId);
      setDoctors((currentDoctors) =>
        currentDoctors.filter((doctor) => doctor.id !== doctorId)
      );

      if (editingDoctorId === doctorId) {
        resetForm();
      }

      setSuccessMessage('Doctor deleted successfully.');
    } catch (error) {
      setSubmitError(error.message || 'Failed to delete doctor');
    }
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-10 w-64 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded-full bg-slate-100" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-medium text-teal-700">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Doctors
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Create, edit, and remove doctors in one simple list.
        </p>
      </section>

      {pageError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {isEditing ? 'Edit doctor' : 'New doctor'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Use the same doctor fields used by appointments.
            </p>
          </div>

          {isEditing ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              placeholder="Doctor name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              placeholder="doctor@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              placeholder="Phone number"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700">NIF</label>
            <input
              type="text"
              name="nif"
              value={form.nif}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              placeholder="Tax number"
            />
          </div>

          <div className="lg:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isSubmitting ? 'Saving...' : isEditing ? 'Save doctor' : 'Add doctor'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Doctor list</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage the doctors available in the clinic.
            </p>
          </div>
        </div>

        {doctors.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            No doctors found.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    NIF
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="bg-white">
                    <td className="px-4 py-4 text-sm font-medium text-slate-900">
                      {doctor.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {doctor.email || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {doctor.phone || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {doctor.nif || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditDoctor(doctor)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDoctor(doctor.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
