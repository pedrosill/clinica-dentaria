import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function CalendarSelect({
  label,
  value,
  options,
  onChange,
  testId,
  className = '',
  listClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && !isOpen) {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid={testId}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm font-semibold capitalize text-slate-900 transition hover:border-slate-400 hover:bg-white focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
      >
        <span className="min-w-0 truncate">{selectedOption?.label || label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={label}
          className={`absolute left-0 top-full z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-300 bg-white p-1 shadow-lg ${listClassName}`}
        >
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-testid={testId ? `${testId}-${option.value}` : undefined}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm capitalize transition ${isSelected ? 'bg-teal-50 font-semibold text-teal-800' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
