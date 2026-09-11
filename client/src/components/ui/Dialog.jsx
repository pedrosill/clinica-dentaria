import { useEffect, useRef } from 'react';

export default function Dialog({
  isOpen,
  onClose,
  isCloseDisabled = false,
  labelledBy,
  className = '',
  children,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isCloseDisabled) {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCloseDisabled, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className={className}
    >
      {children}
    </div>
  );
}
