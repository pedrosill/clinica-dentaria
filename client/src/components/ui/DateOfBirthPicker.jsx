import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import useLanguage from '../../context/useLanguage';
import CalendarSelect from './CalendarSelect';

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
    ? new Date(`${value}T00:00:00`)
    : null;
}

function startOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function buildCalendarDays(month) {
  const firstDay = startOfMonth(month);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function buildYears(selectedDate, min, max) {
  const currentYear = new Date().getFullYear();
  const minYear = min ? new Date(`${min}T00:00:00`).getFullYear() : 1900;
  const maxYear = max ? new Date(`${max}T00:00:00`).getFullYear() : currentYear;
  const selectedYear = selectedDate?.getFullYear();
  const firstYear = Math.min(minYear, selectedYear || minYear);
  const lastYear = Math.max(maxYear, selectedYear || maxYear);

  return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index);
}

export default function DateOfBirthPicker({
  label,
  value,
  onChange,
  min = '1900-01-01',
  max = dateKey(new Date()),
  placeholder = 'Select a date',
  disabled = false,
  id,
  testId,
  className = '',
  clearable = false,
}) {
  const { t, locale } = useLanguage();
  const selectedDate = parseDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate || new Date()));
  const [draftValue, setDraftValue] = useState(value || '');
  const containerRef = useRef(null);
  const controlId = id || testId || (label ? `date-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const nextMonth = parseDate(value) || new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewMonth(startOfMonth(nextMonth));
  }, [isOpen, value]);

  useEffect(() => {
    // Keep the editable field aligned after a calendar selection or a form reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftValue(value || '');
  }, [value]);

  const days = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const years = useMemo(() => buildYears(selectedDate, min, max), [selectedDate, min, max]);
  const monthNames = useMemo(() => Array.from({ length: 12 }, (_, month) => (
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, month, 1))
  )), [locale]);
  const monthOptions = useMemo(() => monthNames.map((month, index) => ({
    value: index,
    label: month,
  })), [monthNames]);
  const yearOptions = useMemo(() => years.map((year) => ({
    value: year,
    label: String(year),
  })), [years]);
  const weekdayLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      return {
        label: new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(day),
        fullLabel: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(day),
      };
    });
  }, [locale]);

  function isDisabled(day) {
    const key = dateKey(day);
    return (min && key < min) || (max && key > max);
  }

  function moveMonth(amount) {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function chooseDate(day) {
    if (isDisabled(day)) return;
    onChange(dateKey(day));
    setIsOpen(false);
  }

  function chooseToday() {
    const today = new Date();
    if (!isDisabled(today)) chooseDate(today);
  }

  function openCalendar() {
    const bounds = containerRef.current?.getBoundingClientRect();
    const availableBelow = bounds ? window.innerHeight - bounds.bottom : window.innerHeight;
    const availableAbove = bounds?.top || 0;
    const requiredHeight = days.length === 35 ? 350 : 400;
    setOpenAbove(availableBelow < requiredHeight && availableAbove > availableBelow);
    setIsOpen(true);
  }

  function toggleCalendar() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    openCalendar();
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? <label htmlFor={controlId} className="text-sm font-medium text-slate-700">{label}</label> : null}
      <div ref={containerRef} className="relative">
        <div className="flex items-center rounded-2xl border border-slate-300 bg-slate-50 shadow-sm transition focus-within:border-teal-700 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-100">
          <input
            type="text"
            id={controlId}
            data-testid={testId}
            value={draftValue}
            placeholder={t(placeholder)}
            disabled={disabled}
            inputMode="numeric"
            autoComplete="off"
            onClick={openCalendar}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'ArrowDown') {
                event.preventDefault();
                openCalendar();
              }
              if (event.key === 'Escape') setIsOpen(false);
            }}
            onChange={(event) => {
              const nextValue = event.target.value;
              setDraftValue(nextValue);
              if (nextValue === '') {
                onChange('');
                return;
              }
              const nextDate = parseDate(nextValue);
              if (nextDate && !isDisabled(nextDate)) onChange(nextValue);
            }}
            onBlur={() => {
              if (draftValue !== (value || '')) setDraftValue(value || '');
            }}
            className={`min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 ${draftValue ? '' : 'placeholder:text-slate-500'}`}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          />
          <button type="button" disabled={disabled} onClick={toggleCalendar} className="px-4 py-3 text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-70" aria-label={t('Open calendar')} aria-haspopup="dialog" aria-expanded={isOpen}>▾</button>
        </div>

        {isOpen ? (
          <div className={`absolute left-0 z-30 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-300 bg-white p-4 shadow-lg ${openAbove ? 'bottom-full mb-2' : 'mt-2'}`} role="dialog" aria-label={label || placeholder}>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => moveMonth(-1)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label={t('Previous month')} data-testid={testId ? `${testId}-previous-month` : undefined}><ChevronLeft className="h-4 w-4" /></button>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                <CalendarSelect
                  label={t('Month')}
                  value={viewMonth.getMonth()}
                  onChange={(month) => setViewMonth((current) => new Date(current.getFullYear(), Number(month), 1))}
                  className="w-32 shrink-0"
                  data-testid={testId ? `${testId}-month` : undefined}
                  options={monthOptions}
                />
                <CalendarSelect
                  label={t('Year')}
                  value={viewMonth.getFullYear()}
                  onChange={(year) => setViewMonth((current) => new Date(Number(year), current.getMonth(), 1))}
                  className="w-24 shrink-0"
                  data-testid={testId ? `${testId}-year` : undefined}
                  options={yearOptions}
                  listClassName="max-h-56"
                />
              </div>
              <button type="button" onClick={() => moveMonth(1)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label={t('Next month')} data-testid={testId ? `${testId}-next-month` : undefined}><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-500">
              {weekdayLabels.map(({ label: weekday, fullLabel }, index) => <span key={`${fullLabel}-${index}`} aria-label={fullLabel} title={fullLabel}>{weekday}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = dateKey(day);
                const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
                const isSelected = key === value;
                return <button key={key} type="button" data-testid={testId ? `${testId}-${key}` : undefined} disabled={isDisabled(day)} onClick={() => chooseDate(day)} className={`rounded-lg px-1 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-25 ${isSelected ? 'bg-teal-700 font-semibold text-white' : isCurrentMonth ? 'text-slate-800 hover:bg-teal-50' : 'text-slate-400 hover:bg-slate-50'}`} aria-pressed={isSelected}>{day.getDate()}</button>;
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <button type="button" onClick={chooseToday} className="rounded-xl px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50">{t('Today')}</button>
              {clearable && value ? <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"><X className="h-3.5 w-3.5" />{t('Clear')}</button> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
