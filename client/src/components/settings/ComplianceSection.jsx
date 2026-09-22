import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, CircleAlert, ClipboardCheck, ListChecks, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import useAuth from '../../context/useAuth';
import useLanguage from '../../context/useLanguage';
import { getCompliance, getComplianceOwners, updateComplianceItem } from '../../services/compliance';
import AnimatedDisclosure from '../ui/AnimatedDisclosure';

const stateLabels = {
  approved: 'Approved',
  passed: 'Automatic check passed',
  pending: 'Pending review',
  blocked: 'Needs correction',
  not_applicable: 'Not applicable',
  review: 'Needs operational review',
  manual: 'Manual evidence required',
  not_checked: 'Not checked',
};

const categoryLabels = {
  legal: 'Clinic and legal',
  privacy: 'Privacy and records',
  security: 'Security',
  continuity: 'Continuity',
  clinical: 'Clinical workflow',
  operations: 'Operations',
  governance: 'Governance',
};

const guidanceByCode = {
  clinic_identity: {
    objective: 'Create one verified clinic identity record and keep its registration evidence together.',
    steps: [
      'Confirm the legal name, address, NIPC/NIF, contacts, and ERS registration details.',
      'Add the applicable licence or registration references and check that they are current.',
      'Store the signed or official source reference in the evidence field and set the responsible person.',
    ],
    evidence: 'Clinic information sheet, ERS registration proof, applicable licences, and date of last review.',
    responsible: 'Clinic administrator, with clinical lead confirmation where the information affects clinical operation.',
  },
  responsibilities: {
    objective: 'Document who is responsible for data protection, privacy coordination, and clinical leadership.',
    steps: [
      'Name the person responsible for processing personal data and the privacy contact for requests.',
      'Record the clinical lead and define who can approve clinical and operational decisions.',
      'Review the names and contact channels whenever the clinic team changes.',
    ],
    evidence: 'Signed responsibility matrix, internal appointment record, or approved clinic policy.',
    responsible: 'Clinic administrator and clinical lead.',
  },
  privacy_notice: {
    objective: 'Make sure patients receive the approved privacy information through a traceable channel.',
    steps: [
      'Use the clinic-approved privacy notice and verify that its contact details are current.',
      'Decide when and how it is delivered to patients, including the paper workflow.',
      'Record the version, approval date, delivery channel, and where the final document is stored.',
    ],
    evidence: 'Approved privacy notice, version/date, delivery procedure, and sample patient-facing channel.',
    responsible: 'Privacy/data protection responsible person.',
  },
  processing_register: {
    objective: 'Keep a current register of the clinic’s personal-data processing activities.',
    steps: [
      'List the purposes, patient and staff data categories, recipients, systems, and access roles.',
      'Document retention periods, security measures, and any transfers or external processors.',
      'Review the register after a new feature, supplier, workflow, or data category is introduced.',
    ],
    evidence: 'Approved processing register with owner, review date, and linked supplier or system records.',
    responsible: 'Privacy/data protection responsible person, supported by the technical administrator.',
  },
  retention_schedule: {
    objective: 'Agree and document how long each relevant record is kept and what happens afterwards.',
    steps: [
      'List the record types used by the clinic, including clinical records, documents, audit logs, and requests.',
      'Obtain the clinic’s legal and clinical decision for each retention period and exception.',
      'Record review dates, legal holds, and the approved deletion or anonymisation procedure.',
    ],
    evidence: 'Approved retention schedule, decision record, and documented exceptions or holds.',
    responsible: 'Clinic administrator with clinical and legal/privacy input.',
  },
  access_matrix: {
    objective: 'Ensure every user has only the access needed for their daily responsibility.',
    steps: [
      'Review the secretary, clinical lead, and technical administrator permissions separately.',
      'Confirm who may view, create, edit, validate, export, or delete each sensitive record type.',
      'Remove unused accounts and repeat the review after role or staff changes.',
    ],
    evidence: 'Approved role-permission matrix, account review date, and list of exceptions.',
    responsible: 'Clinic administrator, with clinical lead approval for clinical access.',
  },
  mfa: {
    objective: 'Protect privileged and clinical-data accounts with multi-factor authentication.',
    steps: [
      'Enable MFA for administrators and any account with access to clinical data or exports.',
      'Test sign-in, recovery codes, account recovery, and session revocation for each privileged account.',
      'Record the completion date without storing MFA secrets or recovery codes in the app.',
    ],
    evidence: 'Account security review, test date, and list of accounts confirmed to use MFA.',
    responsible: 'Technical administrator, verified by the clinic administrator.',
  },
  https: {
    objective: 'Confirm that the clinic computers use a controlled local network and that the application is not exposed to the internet.',
    steps: [
      'Record the VM/server address and restrict access to the clinic computers and approved administrator channels.',
      'Check the VM, host firewall, router, and Docker port mapping so the application is not reachable from the internet.',
      'Use HTTPS for production traffic and record the certificate, renewal owner, and last network review.',
    ],
    evidence: 'VM/server address, firewall and router review, HTTPS configuration, local access test, and review date.',
    responsible: 'Technical administrator, verified by the clinic administrator.',
  },
  volume_encryption: {
    objective: 'Protect the database and private documents if the production host or disk is accessed offline.',
    steps: [
      'Identify the host, volumes, backups, and removable media that contain clinic data.',
      'Enable BitLocker or equivalent full-volume encryption and store recovery procedures securely.',
      'Test restart/recovery and document who can operate it without exposing the encryption keys.',
    ],
    evidence: 'Host encryption status, recovery procedure, scope of encrypted volumes, and verification date.',
    responsible: 'Technical administrator or hosting provider.',
  },
  private_documents: {
    objective: 'Keep uploaded documents outside the public web root with restricted access and traceability.',
    steps: [
      'Confirm the storage directory is private and cannot be opened through a guessed URL.',
      'Test download permissions for the secretary, clinical lead, and unauthorised user scenarios.',
      'Confirm documents are included in encrypted backups and that access is audited.',
    ],
    evidence: 'Storage path/configuration review, permission tests, backup inclusion, and review date.',
    responsible: 'Technical administrator, with clinic administrator verification.',
  },
  backup_schedule: {
    objective: 'Create recent encrypted backups and keep a separate copy that can be used after an incident.',
    steps: [
      'Schedule database and document backups at an interval suitable for the clinic workflow.',
      'Verify encryption, completion status, retention, and the external/secondary copy.',
      'Configure an alert or daily review so a failed backup is noticed promptly.',
    ],
    evidence: 'Latest backup status, schedule, encryption confirmation, secondary location, and review owner.',
    responsible: 'Technical administrator or hosting provider.',
  },
  restore_test: {
    objective: 'Prove that the clinic can restore its data and record how long the recovery takes.',
    steps: [
      'Choose a safe test environment and restore a recent backup without touching production data.',
      'Check users, appointments, patients, clinical records, documents, and audit history.',
      'Record the date, operator, RPO, RTO, result, and any corrective action.',
    ],
    evidence: 'Completed restore report with test environment, checks performed, timings, and result.',
    responsible: 'Technical administrator, with clinic administrator sign-off.',
  },
  clinical_migration: {
    objective: 'Move paper records into the app while preserving a clear transcription and clinical validation trail.',
    steps: [
      'Create the patient and transcribe only from the source paper record, keeping the transcription marked as draft.',
      'Record the source/date and flag uncertainties instead of silently guessing missing information.',
      'Ask the doctor to review and mark the transcription as validated before treating it as final clinical data.',
    ],
    evidence: 'Migration batch/list, source reference, transcription status, validation date, and doctor approval.',
    responsible: 'Secretary for transcription; clinical lead for validation.',
  },
  rights_requests: {
    objective: 'Handle access, correction, or deletion requests consistently and with identity verification.',
    steps: [
      'Define the intake channel and verify the requester’s identity before disclosing or changing data.',
      'Register the request, scope, owner, due date, response, and any reason for restriction or refusal.',
      'Use the application export/correction workflow and keep the final response and evidence together.',
    ],
    evidence: 'Approved procedure, request log example, identity-check method, and response template.',
    responsible: 'Privacy/data protection responsible person.',
  },
  incident_response: {
    objective: 'Give the clinic a repeatable response when data, accounts, devices, or availability are compromised.',
    steps: [
      'Define the reporting channel, first responder, containment steps, and escalation contacts.',
      'Record what happened, when it was detected, affected data, actions taken, and decisions made.',
      'Run a short exercise and update the procedure after incidents or major system changes.',
    ],
    evidence: 'Incident procedure, contact list, exercise record, and post-incident improvement log.',
    responsible: 'Clinic administrator with technical and clinical escalation contacts.',
  },
  deployment_approval: {
    objective: 'Capture the clinic’s approval that the production setup and operating procedures are ready.',
    steps: [
      'Review accounts, roles, MFA, HTTPS, private documents, backups, restore test, retention, and incident contacts.',
      'Record open risks and owners instead of approving an incomplete setup without qualification.',
      'Sign/date the deployment decision and repeat it after material infrastructure or workflow changes.',
    ],
    evidence: 'Deployment checklist, open-risk register, approval record, approver, and date.',
    responsible: 'Clinic administrator and clinical lead, with technical administrator input.',
  },
  processors_and_transfers: {
    objective: 'Registar quem trata dados pela clínica e onde esses dados são guardados.',
    steps: [
      'Liste cada fornecedor que acede a dados da clínica e a finalidade do acesso.',
      'Confirme a localização dos dados e as transferências para fora do Espaço Económico Europeu.',
      'Guarde o contrato ou decisão aplicável e reveja-o quando o fornecedor mudar.',
    ],
    evidence: 'Lista de fornecedores, contratos aplicáveis, localização dos dados e data de revisão.',
    responsible: 'Responsável pelo tratamento, com apoio técnico.',
  },
};

function stateClass(state) {
  if (state === 'approved' || state === 'passed') return 'bg-emerald-50 text-emerald-800';
  if (state === 'blocked') return 'bg-red-50 text-red-800';
  return 'bg-amber-50 text-amber-800';
}

export default function ComplianceSection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [owners, setOwners] = useState([]);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [draft, setDraft] = useState({ manualState: 'pending', evidence: '', notes: '', ownerId: '', reviewDueAt: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [complianceItems, complianceOwners] = await Promise.all([getCompliance(), getComplianceOwners()]);
      setItems(complianceItems);
      setOwners(complianceOwners);
    } catch (requestError) {
      setError(requestError.message || t('Unable to load compliance checklist'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // Loading starts when the settings section mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const grouped = useMemo(
    () => items.reduce((groups, item) => {
      (groups[item.category] ||= []).push(item);
      return groups;
    }, {}),
    [items]
  );
  const canApprove = ['admin', 'dentist'].includes(user?.role);

  function getStateLabel(state) {
    return t(stateLabels[state] || state);
  }

  function startEdit(item) {
    setEditing(item.id);
    setExpanded(item.id);
    setDraft({
      manualState: item.manualState,
      evidence: item.evidence || '',
      notes: item.notes || '',
      ownerId: item.ownerId ? String(item.ownerId) : '',
      reviewDueAt: item.reviewDueAt ? String(item.reviewDueAt).slice(0, 10) : '',
    });
    setMessage('');
  }

  function toggleExpanded(itemId) {
    setExpanded((current) => (current === itemId ? null : itemId));
  }

  async function save(event, item) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await updateComplianceItem(item.id, { ...draft, ownerId: draft.ownerId || null, reviewDueAt: draft.reviewDueAt || null });
      setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
      setEditing(null);
      setMessage(t('Compliance record saved.'));
    } catch (requestError) {
      setError(requestError.message || t('Unable to save compliance record'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="clinic-panel rounded-2xl p-6 text-sm text-slate-600">{t('Loading compliance checklist...')}</section>;
  }

  return (
    <section className="clinic-panel rounded-2xl p-5 md:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t('Compliance checklist')}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{t('Record the status, evidence, responsible person, and approval for each control.')}</p>
          </div>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" />
          {t('Refresh')}
        </button>
      </div>

      {error ? <div role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {message ? <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      <div className="mt-5 space-y-6">
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">{t(categoryLabels[category] || category)}</h3>
            <div className="space-y-3">
              {categoryItems.map((item) => {
                const isEditing = editing === item.id;
                const isExpanded = expanded === item.id;
                const state = item.effectiveState;
                const guidance = guidanceByCode[item.code] || guidanceByCode.deployment_approval;

                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <button type="button" onClick={() => toggleExpanded(item.id)} aria-expanded={isExpanded} className="group flex min-w-0 flex-1 gap-3 text-left">
                        <div className="mt-0.5 shrink-0">
                          {state === 'approved' || state === 'passed' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <CircleAlert className="h-5 w-5 text-amber-600" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <h4 className="font-semibold text-slate-900">{item.title}</h4>
                            <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-teal-700' : ''}`} />
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stateClass(state)}`}>{getStateLabel(state)}</span>
                            {item.validationMode !== 'manual' ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{t('Automatic')}: {getStateLabel(item.automaticState)}</span> : null}
                            {item.owner ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{t('Responsible')}: {item.owner.displayName}</span> : null}
                            {item.reviewDueAt ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{t('Review')}: {String(item.reviewDueAt).slice(0, 10)}</span> : null}
                            {item.approvedBy ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{t('Approved by')} {item.approvedBy.displayName}</span> : null}
                          </div>
                        </div>
                      </button>
                      <button type="button" onClick={() => (isEditing ? setEditing(null) : startEdit(item))} aria-expanded={isEditing} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <ClipboardCheck className="h-4 w-4 text-teal-700" />
                        {isEditing ? t('Close editor') : t('Evidence / approval')}
                      </button>
                    </div>

                    <AnimatedDisclosure open={isExpanded || isEditing}>
                      {isExpanded || isEditing ? (
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <div className="rounded-2xl bg-teal-50/70 p-4">
                            <div className="flex items-start gap-3">
                              <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                              <div>
                                <h5 className="font-semibold text-slate-900">{t('Suggested procedure')}</h5>
                              </div>
                            </div>
                            <ol className="mt-4 grid gap-2 pl-5 text-sm leading-6 text-slate-700">
                              {guidance.steps.map((step) => <li key={step} className="pl-1">{t(step)}</li>)}
                            </ol>
                            <div className="mt-4 grid gap-3 border-t border-teal-100 pt-3 text-sm sm:grid-cols-2">
                              <div>
                                <p className="font-semibold text-slate-800">{t('Suggested evidence')}</p>
                                <p className="mt-1 leading-6 text-slate-600">{t(guidance.evidence)}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{t('Suggested responsible')}</p>
                                <p className="mt-1 leading-6 text-slate-600">{t(guidance.responsible)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </AnimatedDisclosure>

                    <AnimatedDisclosure open={isEditing}>
                      {isEditing ? (
                        <form onSubmit={(event) => save(event, item)} className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
                          <label className="text-sm font-medium text-slate-700">
                            {t('Manual state')}
                            <select className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" value={draft.manualState} onChange={(event) => setDraft({ ...draft, manualState: event.target.value })}>
                              <option value="pending">{t('Pending')}</option>
                              <option value="rejected">{t('Needs correction')}</option>
                              <option value="not_applicable">{t('Not applicable')}</option>
                              {canApprove ? <option value="approved">{t('Approved by me')}</option> : null}
                            </select>
                          </label>
                          <label className="text-sm font-medium text-slate-700">
                            {t('Responsible person')}
                            <select className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" value={draft.ownerId} onChange={(event) => setDraft({ ...draft, ownerId: event.target.value })}>
                              <option value="">{t('Not assigned')}</option>
                              {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.displayName}</option>)}
                            </select>
                          </label>
                          <label className="text-sm font-medium text-slate-700">
                            {t('Next review date')}
                            <input type="date" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" value={draft.reviewDueAt} onChange={(event) => setDraft({ ...draft, reviewDueAt: event.target.value })} />
                          </label>
                          <label className="text-sm font-medium text-slate-700">
                            {t('Evidence reference')}
                            <textarea className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5" value={draft.evidence} onChange={(event) => setDraft({ ...draft, evidence: event.target.value })} placeholder={t('Document name, location, date, or signed record')} />
                          </label>
                          <label className="text-sm font-medium text-slate-700">
                            {t('Notes')}
                            <textarea className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
                          </label>
                          <div className="flex gap-2">
                            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? t('Saving...') : t('Save')}</button>
                            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm">{t('Cancel')}</button>
                          </div>
                        </form>
                      ) : null}
                    </AnimatedDisclosure>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
