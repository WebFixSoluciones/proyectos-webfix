export default function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={`bg-surface-card border border-border-default rounded-card p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
