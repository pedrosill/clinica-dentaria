import { useEffect, useRef, useState } from 'react';

export default function SelectDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  id,
  testId,
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const optionRefs = useRef([]);
  const controlId = id || testId || (label ? `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);

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

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = options.findIndex((option) => String(option.value) === String(value));
    const firstEnabledIndex = options.findIndex((option) => !option.disabled);
    optionRefs.current[selectedIndex >= 0 ? selectedIndex : firstEnabledIndex]?.focus();
  }, [isOpen, options, value]);

  const selectedLabel =
    options.find((option) => String(option.value) === String(value))?.label || placeholder;

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? <label htmlFor={controlId} className="text-sm font-medium text-slate-800">{label}</label> : null}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={controlId}
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false);
            if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !isOpen) {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          data-testid={testId || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-left text-sm text-slate-800 shadow-sm transition hover:bg-white focus:border-teal-700 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
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
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-lg" role="listbox" aria-label={label || ariaLabel || placeholder}>
            {options.map((option, index) => {
              const isSelected = String(option.value) === String(value);

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  ref={(element) => { optionRefs.current[index] = element; }}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setIsOpen(false);
                    }
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      const direction = event.key === 'ArrowDown' ? 1 : -1;
                      let nextIndex = index + direction;
                      while (nextIndex >= 0 && nextIndex < options.length && options[nextIndex].disabled) nextIndex += direction;
                      if (nextIndex >= 0 && nextIndex < options.length) optionRefs.current[nextIndex]?.focus();
                    }
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
