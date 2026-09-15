import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import Dialog from '../ui/Dialog';
import useLanguage from '../../context/useLanguage';
import { getClinicalRecord } from '../../services/clinical';

const TOOTH_GROUPS = [
  { label: 'Upper right', teeth: ['18', '17', '16', '15', '14', '13', '12', '11'] },
  { label: 'Upper left', teeth: ['21', '22', '23', '24', '25', '26', '27', '28'] },
  { label: 'Lower left', teeth: ['38', '37', '36', '35', '34', '33', '32', '31'] },
  { label: 'Lower right', teeth: ['41', '42', '43', '44', '45', '46', '47', '48'] },
];

const CONDITION_STYLES = {
  healthy: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  caries: 'bg-rose-50 text-rose-800 ring-rose-200',
  restoration: 'bg-sky-50 text-sky-800 ring-sky-200',
  missing: 'bg-slate-200 text-slate-700 ring-slate-300',
  fracture: 'bg-amber-50 text-amber-800 ring-amber-200',
  crown: 'bg-violet-50 text-violet-800 ring-violet-200',
  implant: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  root_canal: 'bg-orange-50 text-orange-800 ring-orange-200',
  extraction_needed: 'bg-red-50 text-red-800 ring-red-200',
};

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

const CONDITION_LABELS = {
  healthy: 'Healthy',
  caries: 'Caries',
  restoration: 'Restoration',
  missing: 'Missing',
  fracture: 'Fracture',
  crown: 'Crown',
  implant: 'Implant',
  root_canal: 'Root canal',
  extraction_needed: 'Extraction needed',
  other: 'Other',
};

function getToothEntries(toothChart, toothNumber) {
  return toothChart.filter((entry) => entry.toothNumber === toothNumber);
}

function ToothGlyph({ condition = 'healthy', isLower = false }) {
  return (
    <svg viewBox="0 0 40 48" aria-hidden="true" className={`h-7 w-6 ${isLower ? 'rotate-180' : ''}`}>
      <path d="M10 5.5C13 2.5 27 2.5 30 5.5c3.8 3.8 2.1 10.8 1.6 16.1-.7 7.9-1.7 18.4-5.4 20.2-2.4 1.2-3.4-5.6-6.2-5.6s-3.8 6.8-6.2 5.6c-3.7-1.8-4.7-12.3-5.4-20.2C7.9 16.3 6.2 9.3 10 5.5Z" fill="#fff" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M13 8.5c3-2.3 11-2.3 14 0" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="18" r="5" fill={CONDITION_MARKERS[condition] || CONDITION_MARKERS.other} opacity="0.9" />
    </svg>
  );
}

export default function ToothPickerDialog({ isOpen, patientId, selectedTooth, onSelect, onClose }) {
  const { t } = useLanguage();
  const [toothChart, setToothChart] = useState([]);

  useEffect(() => {
    if (!isOpen || !patientId) return undefined;
    let isMounted = true;
    getClinicalRecord(patientId)
      .then((record) => {
        if (isMounted) setToothChart(record?.toothChart || []);
      })
      .catch(() => {
        if (isMounted) setToothChart([]);
      })

    return () => {
      isMounted = false;
    };
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  function chooseTooth(toothNumber) {
    const currentEntry = getToothEntries(toothChart, toothNumber)[0];
    onSelect({
      toothNumber,
      condition: currentEntry?.condition || '',
      status: currentEntry?.status || 'completed',
    });
    onClose();
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        labelledBy="tooth-picker-dialog-title"
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 id="tooth-picker-dialog-title" className="text-2xl font-semibold tracking-tight text-slate-950">
              {t('Select tooth')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t('Choose a tooth from the patient odontogram.')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100" aria-label={t('Close modal')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
            {TOOTH_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t(group.label)}</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {group.teeth.map((tooth) => {
                    const entries = getToothEntries(toothChart, tooth);
                    const condition = entries[0]?.condition;
                    const conditionLabel = CONDITION_LABELS[condition];
                    const style = CONDITION_STYLES[condition] || 'bg-white text-slate-800 ring-slate-300';
                    const isSelected = selectedTooth === tooth;
                    return (
                      <button
                        key={tooth}
                        type="button"
                        onClick={() => chooseTooth(tooth)}
                        className={`relative flex min-h-16 flex-col items-center justify-center rounded-xl px-2 py-2 text-sm font-semibold ring-1 ring-inset transition hover:-translate-y-0.5 hover:shadow-sm ${style} ${isSelected ? 'outline outline-2 outline-teal-600 outline-offset-2' : ''}`}
                        aria-label={`${t('Tooth')} ${tooth}${conditionLabel ? ` · ${t(conditionLabel)}` : ''}`}
                        aria-pressed={isSelected}
                      >
                        <ToothGlyph condition={condition} isLower={group.label.startsWith('Lower')} />
                        <span>{tooth}</span>
                        {conditionLabel ? <span className="mt-1 text-[10px] font-medium uppercase tracking-wide">{t(conditionLabel)}</span> : null}
                        {isSelected ? <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-teal-700" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-5">
              {Object.entries(CONDITION_LABELS).map(([condition, label]) => (
                <span key={condition} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${CONDITION_STYLES[condition] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CONDITION_MARKERS[condition] }} />
                  {t(label)}
                </span>
              ))}
            </div>
        </div>
      </Dialog>
    </div>
  );
}
