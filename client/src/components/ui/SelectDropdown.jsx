import { useEffect, useRef, useState } from 'react';

export default function SelectDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedLabel =
    options.find((option) => String(option.value) === String(value))?.label || placeholder;

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? <label className="text-sm font-medium text-slate-800">{label}</label> : null}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-left text-sm text-slate-800 shadow-sm transition hover:bg-white focus:border-teal-700 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="truncate">{selectedLabel}</span>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 shrink-0 text-slate-400 transition ${
              isOpen ? 'rotate-180' : ''
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 11.93 1.18l-4.18 3.32a.75.75 0 01-.93 0L5.25 8.41a.75.75 0 01-.02-1.2z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {isOpen ? (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-lg">
            {options.map((option) => {
              const isSelected = String(option.value) === String(value);

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onMouseDown={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected ? 'bg-slate-50 text-slate-950' : 'text-slate-800'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
