export default function Input({ label, error, className = '', ...rest }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <input
        className={`w-full px-3 py-2 text-base bg-white border rounded-input text-text-primary placeholder:text-text-muted transition-colors duration-150 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 ${error ? 'border-error' : 'border-border-default'} ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
