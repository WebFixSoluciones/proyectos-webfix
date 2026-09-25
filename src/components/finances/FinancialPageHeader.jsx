import { Info } from 'lucide-react';

export default function FinancialPageHeader({
  icon: Icon,
  title,
  description,
  badge,
  badgeColor = 'blue',
  actions
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60">
            <Icon size={18} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none">
              {title}
            </h1>
            {badge && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                {badge}
              </span>
            )}
            {description && (
              <span title={description} className="text-slate-400 hover:text-slate-600 cursor-help transition-colors">
                <Info size={14} />
              </span>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
