import { cn } from '../../lib/utils';

/**
 * Estándar oficial Brevo de pestañas y filtros segmentados (WebFix UI Kit v2).
 * Cada item: { id, label, count?, icon?, dotColor?, alert? }
 */
export function UiSegmentedTabs({ items = [], value, onChange, className }) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex flex-wrap items-center gap-1 bg-[#f4f4f5] p-1 rounded-[10px]', className)}
    >
      {items.map((tab) => {
        const active = value === tab.id;
        const TabIcon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={cn(
              'h-[30px] px-3 rounded-[8px] text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer select-none',
              active
                ? 'bg-[#e8fedf] text-[#004227] border-[#b3f4cb]'
                : 'bg-transparent text-[#5c5c5c] border-transparent hover:text-[#1b1b1b] hover:bg-white/75'
            )}
          >
            {tab.dotColor && (
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ backgroundColor: tab.dotColor }}
              />
            )}
            {TabIcon && <TabIcon size={13} strokeWidth={2} className="shrink-0" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-mono leading-none',
                  active
                    ? 'bg-[#004227] text-white'
                    : tab.alert
                      ? 'bg-[#ffe4ed] text-[#851b40]'
                      : 'bg-[#e3e3e3] text-[#474747]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default UiSegmentedTabs;
