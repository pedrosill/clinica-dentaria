import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  FileText,
  Save,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import useAuth from '../../context/useAuth';
import {
  createClinicalNote,
  createTreatmentPlan,
  createTreatmentPlanItem,
  deleteToothChartEntry,
  saveToothChartEntry,
  updateClinicalNote,
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

const panelClass = 'rounded-3xl border border-slate-300 bg-white p-6 shadow-sm';

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

function formatAppointment(appointment) {
  const date = new Date(appointment.date);
  return `${new Intl.DateTimeFormat('en-GB').format(date)} · ${appointment.time} · ${appointment.treatmentType}`;
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
  const canManage = user?.role === 'admin' || user?.role === 'receptionist';
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
    if (!canManage) return;
    try {
      setIsSaving(true);
      clearFeedback();
      await action();
      showSuccess(successMessage);
    } catch (requestError) {
      setError(requestError.message || 'Unable to save clinical record');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    await runMutation(async () => {
      const profile = await updateClinicalProfile(patientId, profileForm);
      setClinicalRecord((current) => ({ ...current, profile }));
    }, 'Clinical profile saved.');
  }

  async function handleSaveTooth(event) {
    event.preventDefault();
    await runMutation(async () => {
      const entry = await saveToothChartEntry(patientId, {
        toothNumber: selectedTooth,
        surface: selectedSurface,
        ...toothForm,
      });
      setClinicalRecord((current) => ({
        ...current,
        toothChart: [
          ...(current.toothChart || []).filter((item) => item.id !== entry.id && !(item.toothNumber === entry.toothNumber && item.surface === entry.surface)),
          entry,
        ].sort((first, second) => first.toothNumber.localeCompare(second.toothNumber) || first.surface.localeCompare(second.surface)),
      }));
    }, `Tooth ${selectedTooth} chart updated.`);
  }

  async function handleRemoveTooth() {
    const entry = toothChart.find(
      (item) => item.toothNumber === selectedTooth && item.surface === selectedSurface
    );
    if (!entry) return;

    await runMutation(async () => {
      await deleteToothChartEntry(patientId, entry.id);
      setClinicalRecord((current) => ({
        ...current,
        toothChart: (current.toothChart || []).filter((item) => item.id !== entry.id),
      }));
      setToothForm({ condition: 'healthy', status: 'active', notes: '' });
    }, `Tooth ${selectedTooth} finding removed.`);
  }

  async function handleCreateNote(event) {
    event.preventDefault();
    if (!noteForm.chiefComplaint && !noteForm.clinicalFindings && !noteForm.diagnosis && !noteForm.treatmentPerformed) {
      setError('Add at least one clinical note field before saving.');
      return;
    }

    await runMutation(async () => {
      const note = await createClinicalNote(patientId, {
        ...noteForm,
        appointmentId: noteForm.appointmentId || null,
        status: 'draft',
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
    }, 'Clinical note saved as draft.');
  }

  async function handleFinalizeNote(note) {
    await runMutation(async () => {
      const updated = await updateClinicalNote(patientId, note.id, { ...note, status: 'final' });
      setClinicalRecord((current) => ({
        ...current,
        notes: current.notes.map((item) => item.id === updated.id ? updated : item),
      }));
    }, 'Clinical note finalized and locked.');
  }

  async function handleCreatePlan(event) {
    event.preventDefault();
    if (!planForm.title.trim()) {
      setError('Treatment plan title is required.');
      return;
    }

    await runMutation(async () => {
      const plan = await createTreatmentPlan(patientId, planForm);
      setClinicalRecord((current) => ({ ...current, treatmentPlans: [plan, ...(current.treatmentPlans || [])] }));
      setSelectedPlanId(String(plan.id));
      setPlanForm({ title: '', notes: '' });
    }, 'Treatment plan created.');
  }

  async function handlePlanStatus(status) {
    if (!selectedPlan) return;
    await runMutation(async () => {
      const updated = await updateTreatmentPlan(patientId, selectedPlan.id, {
        title: selectedPlan.title,
        notes: selectedPlan.notes,
        status,
      });
      setClinicalRecord((current) => ({
        ...current,
        treatmentPlans: current.treatmentPlans.map((plan) => plan.id === updated.id ? { ...plan, ...updated } : plan),
      }));
    }, 'Treatment plan status updated.');
  }

  async function handleCreatePlanItem(event) {
    event.preventDefault();
    if (!selectedPlan || !planItemForm.procedureName.trim()) {
      setError('Select a plan and enter a procedure name.');
      return;
    }

    await runMutation(async () => {
      const item = await createTreatmentPlanItem(patientId, selectedPlan.id, {
        ...planItemForm,
        toothNumber: planItemForm.toothNumber || null,
        surface: planItemForm.surface || null,
        priority: Number(planItemForm.priority),
      });
      setClinicalRecord((current) => ({
        ...current,
        treatmentPlans: current.treatmentPlans.map((plan) => plan.id === selectedPlan.id ? { ...plan, items: [...(plan.items || []), item] } : plan),
      }));
      setPlanItemForm({ procedureName: '', toothNumber: '', surface: '', priority: '1', notes: '' });
    }, 'Treatment plan item added.');
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
            <p className="text-sm font-semibold text-teal-800">Clinical workspace</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Clinical record</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Record medical context, tooth-level findings, clinical notes and planned care in one patient file.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-300">
            <Stethoscope className="h-4 w-4 text-teal-700" />
            {canManage ? 'Editable clinical workspace' : 'Read-only clinical workspace'}
          </div>
        </div>

        {message ? <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div> : null}
        {error ? <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
      </section>

      <section className={panelClass}>
        <div className="border-b border-slate-300 pb-4">
          <h3 className="text-lg font-semibold text-slate-950">Medical and dental context</h3>
          <p className="mt-1 text-sm text-slate-600">Keep important safety information visible before treatment.</p>
        </div>
        <form onSubmit={handleSaveProfile} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Allergies
            <textarea disabled={!canManage || isSaving} value={profileForm.allergies} onChange={(event) => setProfileForm((current) => ({ ...current, allergies: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder="Medication, latex or other allergies" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Current medication
            <textarea disabled={!canManage || isSaving} value={profileForm.medications} onChange={(event) => setProfileForm((current) => ({ ...current, medications: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder="Medication and dosage" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Medical conditions
            <textarea disabled={!canManage || isSaving} value={profileForm.medicalConditions} onChange={(event) => setProfileForm((current) => ({ ...current, medicalConditions: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder="Relevant conditions and precautions" />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Dental history and alerts
            <textarea disabled={!canManage || isSaving} value={profileForm.dentalNotes} onChange={(event) => setProfileForm((current) => ({ ...current, dentalNotes: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder="Previous dental history, anxieties or preferences" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Emergency contact
              <input disabled={!canManage || isSaving} value={profileForm.emergencyContactName} onChange={(event) => setProfileForm((current) => ({ ...current, emergencyContactName: event.target.value }))} className={inputClass} placeholder="Name" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Emergency phone
              <input disabled={!canManage || isSaving} value={profileForm.emergencyContactPhone} onChange={(event) => setProfileForm((current) => ({ ...current, emergencyContactPhone: event.target.value }))} className={inputClass} placeholder="Phone" />
            </label>
          </div>
          {canManage ? <button disabled={isSaving} type="submit" className="inline-flex w-fit items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-60"><Save className="h-4 w-4" />Save clinical profile</button> : null}
        </form>
      </section>

      <section className={panelClass}>
        <div className="border-b border-slate-300 pb-4">
          <h3 className="text-lg font-semibold text-slate-950">Interactive odontogram</h3>
          <p className="mt-1 text-sm text-slate-600">Select a tooth, choose a surface and record its current clinical finding.</p>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
            <div className="grid gap-5">
              {TOOTH_GROUPS.slice(0, 2).map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
                  <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                    {group.teeth.map((tooth) => {
                      const entries = getToothEntries(toothChart, tooth);
                      const color = entries[0] ? getConditionOption(entries[0].condition).color : 'bg-white text-slate-800 ring-slate-300';
                      return <button key={tooth} type="button" onClick={() => handleSelectTooth(tooth)} className={`relative flex h-12 items-center justify-center rounded-xl text-xs font-semibold ring-1 ring-inset transition hover:-translate-y-0.5 hover:shadow-sm ${color} ${selectedTooth === tooth ? 'outline outline-2 outline-teal-600 outline-offset-2' : ''}`} aria-label={`Tooth ${tooth}`}>{tooth}{entries.length > 1 ? <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-teal-700" /> : null}</button>;
                    })}
                  </div>
                </div>
              ))}
              <div className="border-t border-dashed border-slate-300 pt-5" />
              {TOOTH_GROUPS.slice(2).map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
                  <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                    {group.teeth.map((tooth) => {
                      const entries = getToothEntries(toothChart, tooth);
                      const color = entries[0] ? getConditionOption(entries[0].condition).color : 'bg-white text-slate-800 ring-slate-300';
                      return <button key={tooth} type="button" onClick={() => handleSelectTooth(tooth)} className={`relative flex h-12 items-center justify-center rounded-xl text-xs font-semibold ring-1 ring-inset transition hover:-translate-y-0.5 hover:shadow-sm ${color} ${selectedTooth === tooth ? 'outline outline-2 outline-teal-600 outline-offset-2' : ''}`} aria-label={`Tooth ${tooth}`}>{tooth}{entries.length > 1 ? <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-teal-700" /> : null}</button>;
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-300 pt-4">
              {CONDITION_OPTIONS.slice(0, 8).map((option) => <span key={option.value} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${option.color}`}>{option.label}</span>)}
            </div>
          </div>

          <form onSubmit={handleSaveTooth} className="rounded-2xl border border-slate-300 bg-white p-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-300 pb-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Selected tooth</p><p className="mt-1 text-2xl font-semibold text-slate-950">{selectedTooth}</p></div>
              {toothChart.some((item) => item.toothNumber === selectedTooth) ? <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">Charted</span> : null}
            </div>
            <div className="mt-4 space-y-4">
              <label className="block space-y-2 text-sm font-medium text-slate-700">Surface<select data-testid="tooth-surface" disabled={!canManage || isSaving} value={selectedSurface} onChange={(event) => setSelectedSurface(event.target.value)} className={inputClass}>{SURFACE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">Condition<select data-testid="tooth-condition" disabled={!canManage || isSaving} value={toothForm.condition} onChange={(event) => setToothForm((current) => ({ ...current, condition: event.target.value }))} className={inputClass}>{CONDITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">Status<select disabled={!canManage || isSaving} value={toothForm.status} onChange={(event) => setToothForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">Clinical note<textarea disabled={!canManage || isSaving} value={toothForm.notes} onChange={(event) => setToothForm((current) => ({ ...current, notes: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} placeholder="Finding, material, or follow-up" /></label>
              {canManage ? <div className="flex flex-wrap gap-2"><button disabled={isSaving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"><Save className="h-4 w-4" />Save finding</button><button disabled={isSaving || !toothChart.some((item) => item.toothNumber === selectedTooth && item.surface === selectedSurface)} type="button" onClick={handleRemoveTooth} className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />Remove</button></div> : null}
            </div>
          </form>
        </div>
      </section>

      <section className={panelClass}>
        <div className="flex items-start gap-3 border-b border-slate-300 pb-4"><FileText className="mt-0.5 h-5 w-5 text-teal-700" /><div><h3 className="text-lg font-semibold text-slate-950">Clinical notes</h3><p className="mt-1 text-sm text-slate-600">Draft notes can be edited; finalized notes are locked for record integrity.</p></div></div>
        {canManage ? <form onSubmit={handleCreateNote} className="mt-5 grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">Related appointment<select value={noteForm.appointmentId} onChange={(event) => setNoteForm((current) => ({ ...current, appointmentId: event.target.value }))} className={inputClass}><option value="">No linked appointment</option>{appointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{formatAppointment(appointment)}</option>)}</select></label>{[['chiefComplaint', 'Chief complaint'], ['clinicalFindings', 'Clinical findings'], ['diagnosis', 'Diagnosis'], ['treatmentPerformed', 'Treatment performed'], ['recommendations', 'Recommendations']].map(([field, label]) => <label key={field} className="space-y-2 text-sm font-medium text-slate-700 md:col-span-1">{label}<textarea value={noteForm[field]} onChange={(event) => setNoteForm((current) => ({ ...current, [field]: event.target.value }))} className={`${inputClass} min-h-24 resize-y`} /></label>)}<button disabled={isSaving} type="submit" className="inline-flex w-fit items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"><Save className="h-4 w-4" />Save draft note</button></form> : null}
        <div className="mt-6 space-y-3">{notes.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">No clinical notes recorded yet.</div> : notes.map((note) => <article key={note.id} className="rounded-2xl border border-slate-300 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">{note.appointment ? formatAppointment(note.appointment) : 'General clinical note'}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.createdAt))}{note.author?.displayName ? ` · ${note.author.displayName}` : ''}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${note.status === 'final' ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}`}>{note.status === 'final' ? 'Final' : 'Draft'}</span>{note.status !== 'final' && canManage ? <button disabled={isSaving} type="button" onClick={() => handleFinalizeNote(note)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" />Finalize</button> : null}</div></div><div className="mt-4 grid gap-3 text-sm md:grid-cols-2">{[['chiefComplaint', 'Chief complaint'], ['clinicalFindings', 'Findings'], ['diagnosis', 'Diagnosis'], ['treatmentPerformed', 'Treatment'], ['recommendations', 'Recommendations']].filter(([field]) => note[field]).map(([field, label]) => <div key={field}><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{note[field]}</p></div>)}</div></article>)}</div>
      </section>

      <section className={panelClass}>
        <div className="flex items-start gap-3 border-b border-slate-300 pb-4"><ClipboardList className="mt-0.5 h-5 w-5 text-teal-700" /><div><h3 className="text-lg font-semibold text-slate-950">Treatment plans</h3><p className="mt-1 text-sm text-slate-600">Organize recommended procedures and connect them to teeth before scheduling.</p></div></div>
        {canManage ? <form onSubmit={handleCreatePlan} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 space-y-2 text-sm font-medium text-slate-700">New plan title<input value={planForm.title} onChange={(event) => setPlanForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="e.g. Initial restorative plan" /></label><label className="flex-1 space-y-2 text-sm font-medium text-slate-700">Notes<input value={planForm.notes} onChange={(event) => setPlanForm((current) => ({ ...current, notes: event.target.value }))} className={inputClass} placeholder="Optional context" /></label><button disabled={isSaving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"><ClipboardList className="h-4 w-4" />Create plan</button></form> : null}
        {treatmentPlans.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">No treatment plans created yet.</div> : <div className="mt-5 grid gap-5 xl:grid-cols-[0.75fr_1.25fr]"><div className="space-y-2">{treatmentPlans.map((plan) => <button key={plan.id} type="button" onClick={() => setSelectedPlanId(String(plan.id))} className={`w-full rounded-2xl border p-4 text-left transition ${selectedPlan?.id === plan.id ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}><div className="flex items-start justify-between gap-3"><span className="font-semibold text-slate-950">{plan.title}</span><span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-300">{PLAN_STATUS_OPTIONS.find((option) => option.value === plan.status)?.label || plan.status}</span></div><p className="mt-2 text-xs text-slate-600">{plan.items?.length || 0} procedure{plan.items?.length === 1 ? '' : 's'}</p></button>)}</div><div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">{selectedPlan ? <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-3"><div><h4 className="font-semibold text-slate-950">{selectedPlan.title}</h4>{selectedPlan.notes ? <p className="mt-1 text-sm text-slate-600">{selectedPlan.notes}</p> : null}</div>{canManage ? <select disabled={isSaving} value={selectedPlan.status} onChange={(event) => handlePlanStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700">{PLAN_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : null}</div>{canManage ? <form onSubmit={handleCreatePlanItem} className="mt-4 grid gap-3 md:grid-cols-2"><label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">Procedure<input value={planItemForm.procedureName} onChange={(event) => setPlanItemForm((current) => ({ ...current, procedureName: event.target.value }))} className={inputClass} placeholder="e.g. Composite restoration" /></label><label className="space-y-2 text-sm font-medium text-slate-700">Tooth (optional)<input value={planItemForm.toothNumber} onChange={(event) => setPlanItemForm((current) => ({ ...current, toothNumber: event.target.value }))} className={inputClass} placeholder="e.g. 16" /></label><label className="space-y-2 text-sm font-medium text-slate-700">Surface<select value={planItemForm.surface} onChange={(event) => setPlanItemForm((current) => ({ ...current, surface: event.target.value }))} className={inputClass}><option value="">Not specified</option>{SURFACE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="space-y-2 text-sm font-medium text-slate-700">Priority<select value={planItemForm.priority} onChange={(event) => setPlanItemForm((current) => ({ ...current, priority: event.target.value }))} className={inputClass}>{[1, 2, 3, 4, 5].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label><label className="space-y-2 text-sm font-medium text-slate-700">Notes<input value={planItemForm.notes} onChange={(event) => setPlanItemForm((current) => ({ ...current, notes: event.target.value }))} className={inputClass} /></label><button disabled={isSaving} type="submit" className="inline-flex w-fit items-center gap-2 rounded-xl border border-teal-300 bg-white px-4 py-2.5 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-60"><ClipboardList className="h-4 w-4" />Add procedure</button></form> : null}<div className="mt-5 space-y-2">{selectedPlan.items?.length ? selectedPlan.items.map((item) => <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-900">{item.procedureName}{item.toothNumber ? ` · Tooth ${item.toothNumber}` : ''}{item.surface ? ` · ${item.surface}` : ''}</p>{item.notes ? <p className="mt-1 text-xs text-slate-600">{item.notes}</p> : null}</div><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-300">{PLAN_ITEM_STATUS_OPTIONS.find((option) => option.value === item.status)?.label || item.status}</span></div>) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">No procedures in this plan yet.</p>}</div></> : null}</div></div>}
      </section>
    </div>
  );
}
