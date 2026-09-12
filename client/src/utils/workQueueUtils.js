export function getWorkQueuePresentation(item, t) {
  const name = item.patient?.name || t('Unknown patient');
  const titleByType = {
    arrived_waiting: `${t('Start attendance')} · ${name}`,
    overdue_appointment: `${t('Review overdue appointment')} · ${name}`,
    incomplete_patient_contact: `${t('Complete contact details')} · ${name}`,
    overdue_recall: `${t('Overdue follow-up')} · ${name}`,
    recall_due: `${t('Follow-up due')} · ${name}`,
    urgent_waitlist: `${t('Review urgent request')} · ${name}`,
    transcription_validation: `${t('Validate transcription')} · ${name}`,
    compliance_review: t('Review compliance'),
  };
  const actionByType = {
    arrived_waiting: 'Open appointment',
    overdue_appointment: 'Review appointment',
    incomplete_patient_contact: 'Open patient',
    overdue_recall: 'Open follow-ups',
    recall_due: 'Open follow-ups',
    urgent_waitlist: 'Open waitlist',
    transcription_validation: 'Open patient record',
    compliance_review: 'Open compliance',
  };

  return {
    title: titleByType[item.type] || item.title,
    actionLabel: t(actionByType[item.type] || item.action?.label || 'Open'),
    reason: item.type === 'arrived_waiting'
      ? t('Patient is marked as arrived and should be attended.')
      : item.type === 'overdue_appointment'
        ? t('This appointment is past its scheduled start and needs a status update.')
        : item.type === 'transcription_validation'
      ? t('A paper transcription is waiting for the dentist’s validation.')
      : item.type === 'incomplete_patient_contact'
        ? t('This upcoming appointment is missing a phone number or email address.')
        : item.reason,
  };
}

export function formatQueueDueAt(value, locale = 'en-GB') {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
    new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
}
