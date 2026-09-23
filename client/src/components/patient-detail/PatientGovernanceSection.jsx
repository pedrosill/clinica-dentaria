import { useEffect, useState } from 'react';
import useAuth from '../../context/useAuth';
import useLanguage from '../../context/useLanguage';
import Dialog from '../ui/Dialog';
import {
  downloadPatientDocument,
  downloadPatientPrivacyNotice,
  exportPatientRecord,
  getPatientConsents,
  getPatientDocuments,
  getPatientPrivacyNotices,
  previewPatientPrivacyNotice,
  sendPatientPrivacyNotice,
  uploadPatientDocument,
  withdrawPatientConsent,
} from '../../services/patients';

function formatDate(value, locale) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PatientGovernanceSection({ patientId }) {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const canWrite = user?.role === 'admin' || user?.role === 'receptionist';
  const canManageConsent = user?.role === 'admin' || user?.role === 'dentist';
  const [consents, setConsents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [privacyNotice, setPrivacyNotice] = useState({ version: '1.0', deliveries: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    Promise.all([getPatientConsents(patientId), getPatientDocuments(patientId), getPatientPrivacyNotices(patientId)])
      .then(([consentData, documentData, privacyData]) => {
        if (!isMounted) return;
        setConsents(Array.isArray(consentData) ? consentData : []);
        setDocuments(Array.isArray(documentData) ? documentData : []);
        setPrivacyNotice(privacyData || { version: '1.0', deliveries: [] });
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message || t('Unable to load patient governance records.'));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [patientId, t]);

  async function handleDownloadPrivacyNotice() {
    setError(''); setMessage(''); setIsSubmitting(true);
    try {
      downloadBlob(await downloadPatientPrivacyNotice(patientId), `aviso-privacidade-${patientId}.pdf`);
      setMessage(t('Privacy notice downloaded.'));
    } catch (downloadError) {
      setError(downloadError.message || t('Unable to download the privacy notice.'));
    } finally { setIsSubmitting(false); }
  }

  async function handleOpenPrivacyPreview() {
    setError(''); setMessage(''); setIsSubmitting(true);
    try {
      setEmailPreview(await previewPatientPrivacyNotice(patientId));
      setIsPreviewOpen(true);
    } catch (previewError) {
      setError(previewError.message || t('Unable to prepare the privacy notice email.'));
    } finally { setIsSubmitting(false); }
  }

  async function handleConfirmSendPrivacyNotice() {
    setError(''); setMessage(''); setIsSubmitting(true);
    try {
      const delivery = await sendPatientPrivacyNotice(patientId);
      setPrivacyNotice((current) => ({ ...current, deliveries: [delivery, ...current.deliveries] }));
      setIsPreviewOpen(false);
      setEmailPreview(null);
      setMessage(t('Privacy notice sent by email.'));
    } catch (sendError) {
      setError(sendError.message || t('Unable to send the privacy notice email.'));
    } finally { setIsSubmitting(false); }
  }

  async function handleWithdraw(consentId) {
    if (!window.confirm(t('Withdraw this consent?'))) return;
    setError(''); setMessage(''); setIsSubmitting(true);
    try {
      const withdrawn = await withdrawPatientConsent(patientId, consentId);
      setConsents((current) => current.map((consent) => (consent.id === consentId ? withdrawn : consent)));
      setMessage(t('Consent withdrawn.'));
    } catch (withdrawError) {
      setError(withdrawError.message || t('Unable to withdraw consent.'));
    } finally { setIsSubmitting(false); }
  }

  async function handleExport() {
    setError(''); setMessage(''); setIsExporting(true);
    try {
      const payload = await exportPatientRecord(patientId);
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `patient-${patientId}-record.json`);
      setMessage(t('Structured patient record downloaded.'));
    } catch (exportError) {
      setError(exportError.message || t('Unable to export the patient record.'));
    } finally { setIsExporting(false); }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(''); setMessage(''); setIsSubmitting(true);
    try {
      const document = await uploadPatientDocument(patientId, file);
      setDocuments((current) => [document, ...current]);
      setMessage(t('Private document uploaded and encrypted by the storage boundary.'));
    } catch (uploadError) {
      setError(uploadError.message || t('Unable to upload the document.'));
    } finally { setIsSubmitting(false); }
  }

  async function handleDownload(fileDocument) {
    setError(''); setIsSubmitting(true);
    try { downloadBlob(await downloadPatientDocument(patientId, fileDocument.id), fileDocument.fileName); }
    catch (downloadError) { setError(downloadError.message || t('Unable to download the document.')); }
    finally { setIsSubmitting(false); }
  }

  function deliveryStatus(status) {
    if (status === 'acknowledged') return t('Acknowledged');
    if (status === 'objected') return t('Objection recorded');
    return t('Sent');
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{t('Patient data governance')}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t('Download the general privacy notice, send it by email, and keep the response history.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleDownloadPrivacyNotice} disabled={isSubmitting} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">{t('Download privacy notice')}</button>
          {canWrite ? <button type="button" onClick={handleOpenPrivacyPreview} disabled={isSubmitting} className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">{t('Send by email')}</button> : null}
          <button type="button" onClick={handleExport} disabled={isExporting} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">{isExporting ? t('Preparing export...') : t('Download JSON export')}</button>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p> : null}
      {message ? <p className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p> : null}

      <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-900">{t('General privacy notice')}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-teal-900">{t('This records delivery of the general notice and the patient response. It is not a substitute for a separate explicit consent when one is legally required.')}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-800">v{privacyNotice.version}</span>
        </div>
        {isLoading ? <p className="mt-3 text-sm text-slate-500">{t('Loading privacy notice history...')}</p> : null}
        {!isLoading && privacyNotice.deliveries.length === 0 ? <p className="mt-3 text-sm text-teal-800">{t('No privacy notice has been sent yet.')}</p> : null}
        <div className="mt-3 space-y-2">
          {privacyNotice.deliveries.map((delivery) => (
            <div key={delivery.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-100 bg-white px-3 py-3 text-sm">
              <div><p className="font-medium text-slate-900">{deliveryStatus(delivery.status)} · {delivery.email}</p><p className="mt-1 text-xs text-slate-600">{t('Sent')} {formatDate(delivery.sentAt, locale)}{delivery.acknowledgedAt ? ` · ${t('Acknowledged')} ${formatDate(delivery.acknowledgedAt, locale)}` : ''}{delivery.objectedAt ? ` · ${t('Objected')} ${formatDate(delivery.objectedAt, locale)}` : ''}</p></div>
              <span className="text-xs text-slate-500">{t('Valid until')} {formatDate(delivery.expiresAt, locale)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Optional consent history')}</h3>
        <p className="mt-1 text-sm text-slate-500">{t('The general notice is managed above. These are optional or legacy consent records kept for historical traceability.')}</p>
        {!isLoading && consents.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t('No optional consent records have been recorded.')}</p> : null}
        <div className="mt-3 space-y-3">
          {consents.map((consent) => (
            <div key={consent.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
              <div><p className="font-medium text-slate-900">{consent.purpose} <span className="font-normal text-slate-500">· v{consent.version}</span></p><p className="mt-1 text-sm text-slate-600">{consent.status === 'withdrawn' ? t('Withdrawn') : t('Granted')} · {formatDate(consent.grantedAt, locale)}{consent.withdrawnAt ? ` · ${t('withdrawn')} ${formatDate(consent.withdrawnAt, locale)}` : ''}</p></div>
              {canManageConsent && consent.status === 'granted' ? <button type="button" onClick={() => handleWithdraw(consent.id)} disabled={isSubmitting} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">{t('Withdraw')}</button> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7 border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Private documents')}</h3><p className="mt-1 text-sm text-slate-500">{t('Files stay outside the public web root and downloads are authenticated and audited.')}</p></div>{canWrite ? <label className="inline-flex cursor-pointer items-center rounded-xl bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800">{t('Upload document')}<input type="file" accept="application/pdf,image/jpeg,image/png,.docx" onChange={handleUpload} disabled={isSubmitting} className="sr-only" /></label> : null}</div>
        <div className="mt-3 space-y-2">{documents.length ? documents.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><div><p className="font-medium text-slate-800">{document.fileName}</p><p className="text-xs text-slate-500">{document.mimeType} · {Math.round(document.sizeBytes / 1024)} KB · SHA-256 {document.sha256 ? document.sha256.slice(0, 12) : 'stored'}</p></div><button type="button" onClick={() => handleDownload(document)} disabled={isSubmitting} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('Download')}</button></div>) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">{t('No private documents recorded.')}</p>}</div>
      </div>

      <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" hidden={!isPreviewOpen}>
        <Dialog
          isOpen={isPreviewOpen}
          onClose={() => { if (!isSubmitting) { setIsPreviewOpen(false); setEmailPreview(null); } }}
          isCloseDisabled={isSubmitting}
          labelledBy="privacy-email-preview-title"
          className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-xl md:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-teal-800">{t('Email preview')}</p>
              <h2 id="privacy-email-preview-title" className="mt-1 text-2xl font-semibold text-slate-950">{t('Review before sending')}</h2>
            </div>
            <button type="button" onClick={() => { setIsPreviewOpen(false); setEmailPreview(null); }} disabled={isSubmitting} className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100" aria-label={t('Close modal')}>×</button>
          </div>

          {emailPreview ? <div className="mt-6 space-y-5">
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('Recipient')}</p><p className="mt-1 break-all font-medium text-slate-900">{emailPreview.to}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('Subject')}</p><p className="mt-1 font-medium text-slate-900">{emailPreview.subject}</p></div>
            </div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('Email content')}</p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{emailPreview.text}</pre></div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">{t('Attachment')}</p><p className="mt-1 font-medium text-slate-900">{emailPreview.attachment.fileName}</p><p className="mt-1 text-xs text-slate-600">PDF · {Math.max(1, Math.ceil(emailPreview.attachment.sizeBytes / 1024))} KB</p></div><button type="button" onClick={handleDownloadPrivacyNotice} disabled={isSubmitting} className="rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100 disabled:opacity-60">{t('Download attachment')}</button></div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setIsPreviewOpen(false); setEmailPreview(null); }} disabled={isSubmitting} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100">{t('Cancel')}</button><button type="button" onClick={handleConfirmSendPrivacyNotice} disabled={isSubmitting} className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? t('Sending...') : t('Confirm and send')}</button></div>
          </div> : null}
        </Dialog>
      </div>
    </section>
  );
}
