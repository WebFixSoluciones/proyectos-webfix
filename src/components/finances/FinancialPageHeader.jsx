import { Info } from 'lucide-react';
import { UiIconBadge } from '../ui/UiIconBadge';

export default function FinancialPageHeader({ icon: Icon, title, description, badge, actions }) {
  return (
    <header className="erp-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 mb-4 border-b border-[#e3e3e3]">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <UiIconBadge icon={Icon} level="header" tone="brand" />}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1b] tracking-tight leading-tight" title={description || undefined}>
              {title}
            </h1>
            {badge && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f0fdf4] text-[#006a43] border border-[#b3f4cb]">
                {badge}
              </span>
            )}
            {description && (
              <span title={description} className="text-[#8a8a8a] hover:text-[#1b1b1b] cursor-help transition-colors">
                <Info size={14} />
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-[#696969] mt-0.5 truncate hidden sm:block">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </header>
  );
}
