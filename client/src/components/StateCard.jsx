export default function StateCard({
  title,
  description,
  variant = 'empty',
  action,
  icon = null,
  className = '',
  centered = true,
}) {
  const variantStyles = {
    empty: 'border-slate-200 bg-slate-50',
    error: 'border-rose-200 bg-rose-50',
    loading: 'border-slate-200 bg-white',
  };

  const titleStyles = {
    empty: 'text-slate-900',
    error: 'text-rose-700',
    loading: 'text-slate-900',
  };

  const textStyles = {
    empty: 'text-slate-500',
    error: 'text-rose-600',
    loading: 'text-slate-500',
  };

  if (variant === 'loading') {
    return (
      <div className={`rounded-2xl border p-6 shadow-sm ${variantStyles.loading} ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-72 max-w-full rounded bg-slate-200" />
          <div className="mt-6 space-y-3">
            <div className="h-12 rounded-xl bg-slate-100" />
            <div className="h-12 rounded-xl bg-slate-100" />
            <div className="h-12 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm ${variantStyles[variant]} ${className}`}
    >
      <div className={centered ? 'text-center' : ''}>
        {icon ? <div className="mb-3 flex justify-center">{icon}</div> : null}
        <p className={`text-sm font-semibold ${titleStyles[variant]}`}>{title}</p>
        {description ? (
          <p className={`mt-1 text-sm ${textStyles[variant]}`}>{description}</p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}