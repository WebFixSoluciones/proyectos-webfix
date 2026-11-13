export default function FinancialPageHeader({ title, description, badge, actions }) {
  return (
    <header className="erp-page-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1 mb-4">
      <div className="flex min-w-0 items-center gap-2.5 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight" title={description || undefined}>
          {title}
        </h1>
        {badge && <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{badge}</span>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}
