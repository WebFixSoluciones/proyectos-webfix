const variants = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-transparent text-text-primary border border-border-default hover:bg-primary-light',
  ghost: 'bg-transparent text-primary hover:bg-primary-light',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export default function Button({ variant = 'primary', size = 'md', disabled, className = '', children, ...rest }) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-btn transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
