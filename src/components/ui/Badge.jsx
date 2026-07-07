const statusStyles = {
  authorized: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  registered: 'bg-status-registered-bg text-status-registered-text border-status-registered-border',
  pending: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  rejected: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  draft: 'bg-status-draft-bg text-status-draft-text border-status-draft-border',
  cancelled: 'bg-status-cancelled-bg text-status-cancelled-text border-status-cancelled-border',
};

export default function Badge({ status = 'draft', className = '', children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-badge ${statusStyles[status] || statusStyles.draft} ${className}`}>
      {children}
    </span>
  );
}
