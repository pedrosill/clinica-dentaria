import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  Edit3,
  FileText,
  Plus,
  Save,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import useAuth from '../../context/useAuth';
import useLanguage from '../../context/useLanguage';
import AnimatedDisclosure from '../ui/AnimatedDisclosure';
import SelectDropdown from '../ui/SelectDropdown';
import {
  createClinicalNote,
  createTreatmentPlan,
  createTreatmentPlanItem,
  deleteToothChartEntry,
  finalizeClinicalNote,
  saveToothChartEntry,
  updateClinicalProfile,
  updateTreatmentPlan,
} from '../../services/clinical';

const TOOTH_GROUPS = [
  { label: 'Upper right', teeth: ['18', '17', '16', '15', '14', '13', '12', '11'] },
  { label: 'Upper left', teeth: ['21', '22', '23', '24', '25', '26', '27', '28'] },
  { label: 'Lower left', teeth: ['38', '37', '36', '35', '34', '33', '32', '31'] },
  { label: 'Lower right', teeth: ['41', '42', '43', '44', '45', '46', '47', '48'] },
];

const SURFACE_OPTIONS = [
  { value: 'whole', label: 'Whole tooth' },
  { value: 'mesial', label: 'Mesial' },
  { value: 'distal', label: 'Distal' },
  { value: 'occlusal', label: 'Occlusal' },
  { value: 'incisal', label: 'Incisal' },
  { value: 'buccal', label: 'Buccal' },
  { value: 'lingual', label: 'Lingual' },
  { value: 'palatal', label: 'Palatal' },
];

const CONDITION_OPTIONS = [
  { value: 'healthy', label: 'Healthy', color: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  { value: 'caries', label: 'Caries', color: 'bg-rose-100 text-rose-800 ring-rose-200' },
  { value: 'restoration', label: 'Restoration', color: 'bg-sky-100 text-sky-800 ring-sky-200' },
  { value: 'missing', label: 'Missing', color: 'bg-slate-200 text-slate-700 ring-slate-300' },
  { value: 'fracture', label: 'Fracture', color: 'bg-amber-100 text-amber-800 ring-amber-200' },
  { value: 'crown', label: 'Crown', color: 'bg-violet-100 text-violet-800 ring-violet-200' },
  { value: 'implant', label: 'Implant', color: 'bg-indigo-100 text-indigo-800 ring-indigo-200' },
  { value: 'root_canal', label: 'Root canal', color: 'bg-orange-100 text-orange-800 ring-orange-200' },
  { value: 'extraction_needed', label: 'Extraction needed', color: 'bg-red-100 text-red-800 ring-red-200' },
  { value: 'other', label: 'Other', color: 'bg-slate-100 text-slate-800 ring-slate-200' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active finding' },
  { value: 'planned', label: 'Treatment planned' },
  { value: 'completed', label: 'Completed' },
  { value: 'historical', label: 'Historical' },
];

const PLAN_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

const PLAN_ITEM_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100';

const panelClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

const CONDITION_MARKERS = {
  healthy: '#10b981',
  caries: '#f43f5e',
  restoration: '#0ea5e9',
  missing: '#64748b',
  fracture: '#f59e0b',
  crown: '#8b5cf6',
  implant: '#6366f1',
  root_canal: '#f97316',
  extraction_needed: '#dc2626',
  other: '#94a3b8',
};

function ToothGlyph({ condition = 'healthy', isLower = false }) {
  return (
    <svg
      viewBox="0 0 40 48"
      aria-hidden="true"
      className={`h-7 w-6 ${isLower ? 'rotate-180' : ''}`}
    >
      <path
        d="M10 5.5C13 2.5 27 2.5 30 5.5c3.8 3.8 2.1 10.8 1.6 16.1-.7 7.9-1.7 18.4-5.4 20.2-2.4 1.2-3.4-5.6-6.2-5.6s-3.8 6.8-6.2 5.6c-3.7-1.8-4.7-12.3-5.4-20.2C7.9 16.3 6.2 9.3 10 5.5Z"
        fill="#fff"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />
      <path d="M13 8.5c3-2.3 11-2.3 14 0" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="18" r="5" fill={CONDITION_MARKERS[condition] || CONDITION_MARKERS.other} opacity="0.9" />
    </svg>
  );
}

function emptyProfile() {
  return {
    allergies: '',
    medications: '',
    medicalConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    dentalNotes: '',
  };
}

function formatAppointment(appointment, locale = 'en-GB') {
  const date = new Date(appointment.date);
  return `${new Intl.DateTimeFormat(locale).format(date)} · ${appointment.time} · ${appointment.treatmentType}`;
}

function getToothEntries(toothChart, toothNumber) {
  return toothChart.filter((entry) => entry.toothNumber === toothNumber);
}

function getConditionOption(condition) {
  return CONDITION_OPTIONS.find((option) => option.value === condition) || CONDITION_OPTIONS.at(-1);
}

export default function ClinicalRecordSection({
  patientId,
  appointments = [],
  clinicalRecord,
  setClinicalRecord,
}) {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const dentistOwnsPatient = user?.role === 'dentist' && appointments.some(
    (appointment) => !appointment.archivedAt && Number(appointment.doctorId) === Number(user.doctorId)
  );
  const canManage = user?.role === 'admin' || user?.role === 'receptionist' || dentistOwnsPatient;
  const isTranscriber = user?.role === 'receptionist';
  const canValidate = user?.role === 'admin' || dentistOwnsPatient;
  const canFinalizeNote = (note) => note.transcriptionStatus === 'transcribed'
    ? user?.role === 'dentist' && dentistOwnsPatient
    : canValidate;
  const [profileForm, setProfileForm] = useState(emptyProfile());
  const [selectedTooth, setSelectedTooth] = useState('11');
  const [selectedSurface, setSelectedSurface] = useState('whole');
  const [toothForm, setToothForm] = useState({ condition: 'healthy', status: 'active', notes: '' });
  const [noteForm, setNoteForm] = useState({
    appointmentId: '',
    chiefComplaint: '',
    clinicalFindings: '',
    diagnosis: '',
    treatmentPerformed: '',
    recommendations: '',
  });
  const [planForm, setPlanForm] = useState({ title: '', notes: '' });
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planItemForm, setPlanItemForm] = useState({
    procedureName: '',
    toothNumber: '',
    surface: '',
    priority: '1',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const toothChart = useMemo(() => clinicalRecord?.toothChart || [], [clinicalRecord]);
  const notes = useMemo(() => clinicalRecord?.notes || [], [clinicalRecord]);
  const treatmentPlans = useMemo(() => clinicalRecord?.treatmentPlans || [], [clinicalRecord]);
  const selectedPlan = useMemo(
    () => treatmentPlans.find((plan) => String(plan.id) === String(selectedPlanId)) || treatmentPlans[0],
    [selectedPlanId, treatmentPlans]
  );

  useEffect(() => {
    if (!clinicalRecord) return;
    // Synchronize the editor when the patient record arrives or is refreshed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileForm({
      ...emptyProfile(),
      ...(clinicalRecord.profile || {}),
      emergencyContactName: clinicalRecord.profile?.emergencyContactName || '',
      emergencyContactPhone: clinicalRecord.profile?.emergencyContactPhone || '',
    });
    setSelectedPlanId((current) => current || String(clinicalRecord.treatmentPlans?.[0]?.id || ''));
  }, [clinicalRecord]);

  useEffect(() => {
    const entry = toothChart.find(
      (item) => item.toothNumber === selectedTooth && item.surface === selectedSurface
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToothForm({
      condition: entry?.condition || 'healthy',
      status: entry?.status || 'active',
      notes: entry?.notes || '',
    });
  }, [selectedSurface, selectedTooth, toothChart]);

  function clearFeedback() {
    setMessage('');
    setError('');
  }

  function showSuccess(text) {
    setError('');
    setMessage(text);
  }

  async function runMutation(action, successMessage) {
    if (!canManage) return false;
    try {
      setIsSaving(true);
      clearFeedback();
      await action();
      showSuccess(successMessage);
      return true;
    } catch (requestError) {
      setError(requestError.message || t('Unable to save clinical record'));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    const saved = await runMutation(async () => {
      const profile = await updateClinicalProfile(patientId, { ...profileForm, transcriptionMode: isTranscriber });
      setClinicalRecord((current) => ({ ...current, profile }));
    }, t('Clinical profile saved.'));
    if (saved) setEditingSection(null);
  }

  async function handleSaveTooth(event) {
    event.preventDefault();
    const saved = await runMutation(async () => {
      const entry = await saveToothChartEntry(patientId, {
        toothNumber: selectedTooth,
        surface: selectedSurface,
        ...toothForm,
        transcriptionMode: isTranscriber,
      });
      setClinicalRecord((current) => ({
        ...current,
        toothChart: [
          ...(current.toothChart || []).filter((item) => item.id !== entry.id && !(item.toothNumber === entry.toothNumber && item.surface === entry.surface)),
          entry,
        ].sort((first, second) => first.toothNumber.localeCompare(second.toothNumber) || first.surface.localeCompare(second.surface)),
      }));
    }, `${t('Tooth')} ${selectedTooth} ${t('chart updated.')}`);
    if (saved) setEditingSection(null);
  }

  async function handleRemoveTooth() {
    const entry = toothChart.find(
      (item) => item.toothNumber === selectedTooth && item.surface === selectedSurface
    );
    if (!entry) return;

    await runMutation(async () => {
      await deleteToothChartEntry(patientId, entry.id, { transcriptionMode: isTranscriber });
      setClinicalRecord((current) => ({
        ...current,
        toothChart: (current.toothChart || []).filter((item) => item.id !== entry.id),
      }));
      setToothForm({ condition: 'healthy', status: 'active', notes: '' });
    }, `${t('Tooth')} ${selectedTooth} ${t('finding removed.')}`);
  }

  async function handleCreateNote(event) {
    event.preventDefault();
    if (!noteForm.chiefComplaint && !noteForm.clinicalFindings && !noteForm.diagnosis && !noteForm.treatmentPerformed) {
      setError(t('Add at least one clinical note field before saving.'));
      return;
    }

    const saved = await runMutation(async () => {
      const note = await createClinicalNote(patientId, {
        ...noteForm,
        appointmentId: noteForm.appointmentId || null,
        status: 'draft',
        transcriptionMode: isTranscriber,
      });
      setClinicalRecord((current) => ({ ...current, notes: [note, ...(current.notes || [])] }));
      setNoteForm({
        appointmentId: '',
        chiefComplaint: '',
        clinicalFindings: '',
        diagnosis: '',
        treatmentPerformed: '',
        recommendations: '',
      });
    }, t('Clinical note saved as draft.'));
    if (saved) setEditingSection(null);
  }

  async function handleValidateNote(note) {
    await runMutation(async () => {
      const updated = await finalizeClinicalNote(patientId, note.id);
      setClinicalRecord((current) => ({
        ...current,
        notes: current.notes.map((item) => item.id === updated.id ? updated : item),
      }));
    }, t('Clinical note validated by the doctor and locked.'));
  }

  const handleFinalizeNote = handleValidateNote;

  async function handleCreatePlan(event) {
    event.preventDefault();
    if (!planForm.title.trim()) {
      setError(t('Treatment plan title is required.'));
      return;
    }

    const saved = await runMutation(async () => {
      const plan = await createTreatmentPlan(patientId, { ...planForm, transcriptionMode: isTranscriber });
      setClinicalRecord((current) => ({ ...current, treatmentPlans: [plan, ...(current.treatmentPlans || [])] }));
      setSelectedPlanId(String(plan.id));
      setPlanForm({ title: '', notes: '' });
    }, t('Treatment plan created.'));
    if (saved) setEditingSection(null);
  }

  async function handlePlanStatus(status) {
    if (!selectedPlan) return;
    await runMutation(async () => {
      const updated = await updateTreatmentPlan(patientId, selectedPlan.id, {
        title: selectedPlan.title,
        notes: selectedPlan.notes,
        status,
        transcriptionMode: isTranscriber,
      });
      setClinicalRecord((current) => ({
        ...current,
        treatmentPlans: current.treatmentPlans.map((plan) => plan.id === updated.id ? { ...plan, ...updated } : plan),
      }));
    }, t('Treatment plan status updated.'));
  }

  async function handleCreatePlanItem(event) {
    event.preventDefault();
    if (!selectedPlan || !planItemForm.procedureName.trim()) {
      setError(t('Select a plan and enter a procedure name.'));
      return;
    }

    await runMutation(async () => {
      const item = await createTreatmentPlanItem(patientId, selectedPlan.id, {
        ...planItemForm,
        toothNumber: planItemForm.toothNumber || null,
        surface: planItemForm.surface || null,
        priority: Number(planItemForm.priority),
        transcriptionMode: isTranscriber,
      });
      setClinicalRecord((current) => ({
        ...current,
        treatmentPlans: current.treatmentPlans.map((plan) => plan.id === selectedPlan.id ? { ...plan, items: [...(plan.items || []), item] } : plan),
      }));
      setPlanItemForm({ procedureName: '', toothNumber: '', surface: '', priority: '1', notes: '' });
    }, t('Treatment plan item added.'));
  }

  function handleSelectTooth(toothNumber) {
    setSelectedTooth(toothNumber);
    const existingEntry = getToothEntries(toothChart, toothNumber)[0];
    setSelectedSurface(existingEntry?.surface || 'whole');
  }

  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col gap-3 border-b border-slate-300 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-800">{t('Clinical workspace')}</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{t('Clinical record')}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {t('Record medical context, tooth-level findings, clinical notes and planned care in one patient file.')}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-300">
            <Stethoscope className="h-4 w-4 text-teal-700" />
            {isTranscriber ? t('Transcription workspace - doctor validation required') : canValidate ? t('Doctor validation enabled') : canManage ? t('Editable clinical workspace') : t('Read-only clinical workspace')}
          </div>
        </div>

        {message ? <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div> : null}
        {error ? <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
      </section>

      <section className={panelClass}>
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{t('Medical and dental context')}</h3>
            <p className="mt-1 text-sm text-slate-600">{t('Keep important safety information visible before treatment.')}</p>
          </div>
          {canManage ? <button type="button" onClick={() => setEditingSection(editingSection === 'medical' ? null : 'medical')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Edit3 className="h-4 w-4 text-teal-700" />{editingSection === 'medical' ? t('Close editor') : t('Edit medical context')}
          </button> : null}
        </div>
        <AnimatedDisclosure open={editingSection === 'medical' && canManage}>
          {editingSection === 'medical' && canManage ? <form onSubmit={handleSaveProfile} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            {t('Allergies')}
            <textarea disabled={!canManage || isSaving} value={profileForm.allergies} onChange={(event) => setProfileForm((current) => ({ ...current, allergies: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder={t('Medication, latex or other allergies')} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            {t('Current medication')}
            <textarea disabled={!canManage || isSaving} value={profileForm.medications} onChange={(event) => setProfileForm((current) => ({ ...current, medications: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder={t('Medication and dosage')} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            {t('Medical conditions')}
            <textarea disabled={!canManage || isSaving} value={profileForm.medicalConditions} onChange={(event) => setProfileForm((current) => ({ ...current, medicalConditions: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder={t('Relevant conditions and precautions')} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            {t('Dental history and alerts')}
            <textarea disabled={!canManage || isSaving} value={profileForm.dentalNotes} onChange={(event) => setProfileForm((current) => ({ ...current, dentalNotes: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder={t('Previous dental history, anxieties or preferences')} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              {t('Emergency contact')}
              <input disabled={!canManage || isSaving} value={profileForm.emergencyContactName} onChange={(event) => setProfileForm((current) => ({ ...current, emergencyContactName: event.target.value }))} className={inputClass} placeholder={t('Name')} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              {t('Emergency phone')}
              <input disabled={!canManage || isSaving} value={profileForm.emergencyContactPhone} onChange={(event) => setProfileForm((current) => ({ ...current, emergencyContactPhone: event.target.value }))} className={inputClass} placeholder={t('Phone')} />
            </label>
          </div>
          {canManage ? <button disabled={isSaving} type="submit" className="inline-flex w-fit items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-60"><Save className="h-4 w-4" />{t('Save clinical profile')}</button> : null}
        </form> : null}
        </AnimatedDisclosure>
        {editingSection !== 'medical' || !canManage ? <div className="mt-5 grid gap-x-6 gap-y-4 text-sm md:grid-cols-2">
          {[
            ['Allergies', profileForm.allergies],
            ['Current medication', profileForm.medications],
            ['Medical conditions', profileForm.medicalConditions],
            ['Dental history and alerts', profileForm.dentalNotes],
            ['Emergency contact', profileForm.emergencyContactName],
            ['Emergency phone', profileForm.emergencyContactPhone],
          ].map(([label, value]) => <div key={label} className="border-b border-slate-100 pb-3 last:border-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t(label)}</p>
            <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{value || t('Not recorded')}</p>
          </div>)}
        </div> : null}
      </section>

      <section className={panelClass}>
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{t('Interactive odontogram')}</h3>
            <p className="mt-1 text-sm text-slate-600">{t('Select a tooth, choose a surface and record its current clinical finding.')}</p>
          </div>
          {canManage ? <button type="button" onClick={() => setEditingSection(editingSection === 'odontogram' ? null : 'odontogram')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Edit3 className="h-4 w-4 text-teal-700" />{editingSection === 'odontogram' ? t('Close editor') : t('Edit odontogram')}
          </button> : null}
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
            <div className="grid gap-5">
              {TOOTH_GROUPS.slice(0, 2).map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t(group.label)}</p>
                  <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                    {group.teeth.map((tooth) => {
                      const entries = getToothEntries(toothChart, tooth);
                      const color = entries[0] ? getConditionOption(entries[0].condition).color : 'bg-white text-slate-800 ring-slate-300';
                      return <button key={tooth} type="button" onClick={() => handleSelectTooth(tooth)} className={`relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold ring-1 ring-inset transition hover:-translate-y-0.5 hover:shadow-sm ${color} ${selectedTooth === tooth ? 'outline outline-2 outline-teal-600 outline-offset-2' : ''}`} aria-label={`${t('Tooth')} ${tooth}`}><ToothGlyph condition={entries[0]?.condition} isLower={group.label.startsWith('Lower')} /><span>{tooth}</span>{entries.length > 1 ? <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-teal-700" /> : null}</button>;
                    })}
                  </div>
                </div>
              ))}
              <div className="border-t border-dashed border-slate-300 pt-5" />
              {TOOTH_GROUPS.slice(2).map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t(group.label)}</p>
                  <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                    {group.teeth.map((tooth) => {
                      const entries = getToothEntries(toothChart, tooth);
                      const color = entries[0] ? getConditionOption(entries[0].condition).color : 'bg-white text-slate-800 ring-slate-300';
                      return <button key={tooth} type="button" onClick={() => handleSelectTooth(tooth)} className={`relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold ring-1 ring-inset transition hover:-translate-y-0.5 hover:shadow-sm ${color} ${selectedTooth === tooth ? 'outline outline-2 outline-teal-600 outline-offset-2' : ''}`} aria-label={`${t('Tooth')} ${tooth}`}><ToothGlyph condition={entries[0]?.condition} isLower={group.label.startsWith('Lower')} /><span>{tooth}</span>{entries.length > 1 ? <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-teal-700" /> : null}</button>;
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-300 pt-4">
              {CONDITION_OPTIONS.slice(0, 8).map((option) => <span key={option.value} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${option.color}`}>{t(option.label)}</span>)}
            </div>
          </div>

          <AnimatedDisclosure open={editingSection === 'odontogram' && canManage}>
            {editingSection === 'odontogram' && canManage ? <form onSubmit={handleSaveTooth} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-300 pb-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">{t('Selected tooth')}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{selectedTooth}</p></div>
              {toothChart.some((item) => item.toothNumber === selectedTooth) ? <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">{t('Charted')}</span> : null}
            </div>
            <div className="mt-4 space-y-4">
              <SelectDropdown label={t('Surface')} value={selectedSurface} onChange={setSelectedSurface} testId="tooth-surface" disabled={!canManage || isSaving} options={SURFACE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))} />
              <SelectDropdown label={t('Condition')} value={toothForm.condition} onChange={(value) => setToothForm((current) => ({ ...current, condition: value }))} testId="tooth-condition" disabled={!canManage || isSaving} options={CONDITION_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))} />
              <SelectDropdown label={t('Status')} value={toothForm.status} onChange={(value) => setToothForm((current) => ({ ...current, status: value }))} disabled={!canManage || isSaving} options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))} />
              <label className="block space-y-2 text-sm font-medium text-slate-700">{t('Clinical note')}<textarea disabled={!canManage || isSaving} value={toothForm.notes} onChange={(event) => setToothForm((current) => ({ ...current, notes: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder={t('Finding, material, or follow-up')} /></label>
              {canManage ? <div className="flex flex-wrap gap-2"><button disabled={isSaving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"><Save className="h-4 w-4" />{t('Save finding')}</button><button disabled={isSaving || !toothChart.some((item) => item.toothNumber === selectedTooth && item.surface === selectedSurface)} type="button" onClick={handleRemoveTooth} className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />{t('Remove')}</button></div> : null}
            </div>
          </form> : null}
          </AnimatedDisclosure>
          {editingSection !== 'odontogram' || !canManage ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="border-b border-slate-200 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">{t('Selected tooth')}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{selectedTooth}</p>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {getToothEntries(toothChart, selectedTooth).length === 0 ? <p className="text-slate-600">{t('No findings recorded for this tooth.')}</p> : getToothEntries(toothChart, selectedTooth).map((entry) => <div key={entry.id} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-800">{t(SURFACE_OPTIONS.find((option) => option.value === entry.surface)?.label || entry.surface)}</span><span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${getConditionOption(entry.condition).color}`}>{t(getConditionOption(entry.condition).label)}</span></div>
                <p className="mt-1 text-slate-600">{entry.notes || t('No clinical note')}</p>
              </div>)}
            </div>
            {canManage ? <p className="mt-5 text-xs text-slate-500">{t('Select Edit odontogram to change findings.')}</p> : null}
          </div> : null}
        </div>
      </section>

      <section className={panelClass}>
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-teal-700" /><div><h3 className="text-lg font-semibold text-slate-950">{t('Clinical notes')}</h3><p className="mt-1 text-sm text-slate-600">{isTranscriber ? t('Paper records are transcribed as drafts and must be validated by the doctor.') : t('Draft notes can be edited; finalized notes are locked for record integrity.')}</p></div></div>{canManage ? <button type="button" onClick={() => setEditingSection(editingSection === 'notes' ? null : 'notes')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4 text-teal-700" />{editingSection === 'notes' ? t('Close editor') : t('Add clinical note')}</button> : null}</div>
        {canManage && editingSection === 'notes' ? <form onSubmit={handleCreateNote} className="mt-5 grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><SelectDropdown label={t('Related appointment')} value={noteForm.appointmentId} onChange={(value) => setNoteForm((current) => ({ ...current, appointmentId: value }))} options={[{ value: '', label: t('No linked appointment') }, ...appointments.map((appointment) => ({ value: String(appointment.id), label: formatAppointment(appointment, locale) }))]} /></div>{[['chiefComplaint', 'Chief complaint'], ['clinicalFindings', 'Clinical findings'], ['diagnosis', 'Diagnosis'], ['treatmentPerformed', 'Treatment performed'], ['recommendations', 'Recommendations']].map(([field, label]) => <label key={field} className="space-y-2 text-sm font-medium text-slate-700 md:col-span-1">{t(label)}<textarea value={noteForm[field]} onChange={(event) => setNoteForm((current) => ({ ...current, [field]: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} /></label>)}<button disabled={isSaving} type="submit" className="inline-flex w-fit items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"><Save className="h-4 w-4" />{t('Save draft note')}</button></form> : null}
        <div className="mt-6 space-y-3">{notes.length === 0 ? <div className="border-t border-dashed border-slate-300 pt-6 text-center text-sm text-slate-600">{t('No clinical notes recorded yet.')}</div> : notes.map((note) => <article key={note.id} className="border-t border-slate-200 py-4 first:border-t-0 first:pt-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">{note.appointment ? formatAppointment(note.appointment, locale) : t('General clinical note')}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.createdAt))}{note.author?.displayName ? ` · ${note.author.displayName}` : ''}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${note.status === 'final' ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}`}>{note.status === 'final' ? t('Final') : t('Draft')}</span>{note.status !== 'final' && canFinalizeNote(note) ? <button disabled={isSaving} type="button" onClick={() => handleFinalizeNote(note)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" />{t(note.transcriptionStatus === 'transcribed' ? 'Validate and close' : 'Finalize and close')}</button> : note.status !== 'final' && (isTranscriber || note.transcriptionStatus === 'transcribed') ? <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">{t('Awaiting doctor validation')}</span> : null}</div></div><div className="mt-4 grid gap-3 text-sm md:grid-cols-2">{[['chiefComplaint', 'Chief complaint'], ['clinicalFindings', 'Findings'], ['diagnosis', 'Diagnosis'], ['treatmentPerformed', 'Treatment'], ['recommendations', 'Recommendations']].filter(([field]) => note[field]).map(([field, label]) => <div key={field}><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t(label)}</p><p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{note[field]}</p></div>)}</div></article>)}</div>
      </section>

      <section className={panelClass}>
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><ClipboardList className="mt-0.5 h-5 w-5 text-teal-700" /><div><h3 className="text-lg font-semibold text-slate-950">{t('Treatment plans')}</h3><p className="mt-1 text-sm text-slate-600">{t('Organize recommended procedures and connect them to teeth before scheduling.')}</p></div></div>{canManage ? <button type="button" onClick={() => setEditingSection(editingSection === 'plans' ? null : 'plans')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4 text-teal-700" />{editingSection === 'plans' ? t('Close editor') : t('Edit treatment plans')}</button> : null}</div>
        {canManage && editingSection === 'plans' ? <form onSubmit={handleCreatePlan} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 space-y-2 text-sm font-medium text-slate-700">{t('New plan title')}<input value={planForm.title} onChange={(event) => setPlanForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder={t('e.g. Initial restorative plan')} /></label><label className="flex-1 space-y-2 text-sm font-medium text-slate-700">{t('Notes')}<input value={planForm.notes} onChange={(event) => setPlanForm((current) => ({ ...current, notes: event.target.value }))} className={inputClass} placeholder={t('Optional context')} /></label><button disabled={isSaving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"><ClipboardList className="h-4 w-4" />{t('Create plan')}</button></form> : null}
        {treatmentPlans.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">{t('No treatment plans created yet.')}</div> : <div className="mt-5 grid gap-5 xl:grid-cols-[0.75fr_1.25fr]"><div className="space-y-2">{treatmentPlans.map((plan) => <button key={plan.id} type="button" onClick={() => setSelectedPlanId(String(plan.id))} className={`w-full rounded-2xl border p-4 text-left transition ${selectedPlan?.id === plan.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}><div className="flex items-start justify-between gap-3"><span className="font-semibold text-slate-950">{plan.title}</span><span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{t(PLAN_STATUS_OPTIONS.find((option) => option.value === plan.status)?.label || plan.status)}</span></div><p className="mt-2 text-xs text-slate-600">{plan.items?.length || 0} {t(plan.items?.length === 1 ? 'procedure' : 'procedures')}</p></button>)}</div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">{selectedPlan ? <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3"><div><h4 className="font-semibold text-slate-950">{selectedPlan.title}</h4>{selectedPlan.notes ? <p className="mt-1 text-sm text-slate-600">{selectedPlan.notes}</p> : null}</div>{canManage && editingSection === 'plans' ? <SelectDropdown label={null} value={selectedPlan.status} onChange={handlePlanStatus} disabled={isSaving} className="min-w-40" options={PLAN_STATUS_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))} /> : <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{t(PLAN_STATUS_OPTIONS.find((option) => option.value === selectedPlan.status)?.label || selectedPlan.status)}</span>}</div>{canManage && editingSection === 'plans' ? <form onSubmit={handleCreatePlanItem} className="mt-4 grid gap-3 md:grid-cols-2"><label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">{t('Procedure')}<input value={planItemForm.procedureName} onChange={(event) => setPlanItemForm((current) => ({ ...current, procedureName: event.target.value }))} className={inputClass} placeholder={t('e.g. Composite restoration')} /></label><label className="space-y-2 text-sm font-medium text-slate-700">{t('Tooth (optional)')}<input value={planItemForm.toothNumber} onChange={(event) => setPlanItemForm((current) => ({ ...current, toothNumber: event.target.value }))} className={inputClass} placeholder="e.g. 16" /></label><div><SelectDropdown label={t('Surface')} value={planItemForm.surface} onChange={(value) => setPlanItemForm((current) => ({ ...current, surface: value }))} options={[{ value: '', label: t('Not specified') }, ...SURFACE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))]} /></div><SelectDropdown label={t('Priority')} value={planItemForm.priority} onChange={(value) => setPlanItemForm((current) => ({ ...current, priority: value }))} options={[1, 2, 3, 4, 5].map((priority) => ({ value: String(priority), label: String(priority) }))} /><label className="space-y-2 text-sm font-medium text-slate-700">{t('Notes')}<input value={planItemForm.notes} onChange={(event) => setPlanItemForm((current) => ({ ...current, notes: event.target.value }))} className={inputClass} /></label><button disabled={isSaving} type="submit" className="inline-flex w-fit items-center gap-2 rounded-xl border border-teal-300 bg-white px-4 py-2.5 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-60"><ClipboardList className="h-4 w-4" />{t('Add procedure')}</button></form> : null}<div className="mt-5 space-y-2">{selectedPlan.items?.length ? selectedPlan.items.map((item) => <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-900">{item.procedureName}{item.toothNumber ? ` · ${t('Tooth')} ${item.toothNumber}` : ''}{item.surface ? ` · ${t(item.surface)}` : ''}</p>{item.notes ? <p className="mt-1 text-xs text-slate-600">{item.notes}</p> : null}</div><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{t(PLAN_ITEM_STATUS_OPTIONS.find((option) => option.value === item.status)?.label || item.status)}</span></div>) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">{t('No procedures in this plan yet.')}</p>}</div></> : null}</div></div>}
      </section>
    </div>
  );
}
