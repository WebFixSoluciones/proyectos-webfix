function Table({ children, className = '' }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-sm text-left ${className}`}>{children}</table>
    </div>
  );
}

function Head({ children, className = '' }) {
  return (
    <thead className={`bg-surface-sidebar text-text-secondary text-xs uppercase tracking-wider ${className}`}>
      {children}
    </thead>
  );
}

function Row({ children, className = '', ...rest }) {
  return (
    <tr className={`border-b border-border-default hover:bg-primary-light transition-colors duration-100 ${className}`} {...rest}>
      {children}
    </tr>
  );
}

function Cell({ children, header, className = '', ...rest }) {
  const Tag = header ? 'th' : 'td';
  return (
    <Tag className={`px-3 py-2.5 ${header ? 'font-medium' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

Table.Head = Head;
Table.Row = Row;
Table.Cell = Cell;

export default Table;
