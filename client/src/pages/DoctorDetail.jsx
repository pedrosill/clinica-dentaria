import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, Phone, Receipt, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDoctorById } from '../services/doctors';

function LoadingState() {
  return (
    <div className="w-full space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="h-4 w-32 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-9 w-80 animate-pulse rounded-2xl bg-slate-100" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded-full bg-slate-100" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
      </section>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm md:p-8">
      <p className="text-sm font-medium text-red-700">Unable to load doctor</p>
      <p className="mt-2 text-sm leading-6 text-red-600">{message}</p>
      <Link
        to="/doctors"
        className="mt-4 inline-flex items-center text-sm font-medium text-red-700 underline-offset-4 hover:underline"
      >
        Back to Doctors
      </Link>
    </section>
  );
}

export default function DoctorDetail() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDoctor() {
      try {
        setIsLoading(true);
        setPageError('');
        const data = await getDoctorById(doctorId);

        if (!isMounted) return;
        setDoctor(data);
      } catch (error) {
        if (!isMounted) return;
        setPageError(error.message || 'Failed to load doctor');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDoctor();

    return () => {
      isMounted = false;
    };
  }, [doctorId]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (pageError) {
    return <ErrorState message={pageError} />;
  }

  return (
    <div className="w-full space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
                return;
              }

              navigate('/doctors', { replace: true });
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div>
            <p className="text-sm font-medium text-teal-700">Doctor detail</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              {doctor.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review doctor contact and billing information.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <UserRound className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Doctor information
            </h2>
            <p className="text-sm text-slate-500">
              Basic details for this doctor record.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Name
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900">
              <UserRound className="h-4 w-4 text-slate-500" />
              {doctor.name}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Email
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900">
              <Mail className="h-4 w-4 text-slate-500" />
              {doctor.email || 'No email recorded'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Phone
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900">
              <Phone className="h-4 w-4 text-slate-500" />
              {doctor.phone || 'No phone recorded'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              NIF
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900">
              <Receipt className="h-4 w-4 text-slate-500" />
              {doctor.nif || 'No NIF recorded'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
