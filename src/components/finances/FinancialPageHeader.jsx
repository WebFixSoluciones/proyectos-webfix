import { UiBox, UiHeading, UiText } from '../ui/layout';
import { Badge } from '../ui/badge';

export default function FinancialPageHeader({
  icon: Icon,
  title,
  description,
  badge,
  badgeColor = 'blue',
  actions
}) {
  return (
    <UiBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-1 border-b border-[var(--gray-a5)]">
      <UiBox className="flex items-center gap-3 min-w-0">
        {Icon && (
          <UiBox className="w-10 h-10 rounded-lg bg-[var(--accent-3)] text-[var(--accent-11)] flex items-center justify-center shrink-0 border border-[var(--accent-6)] shadow-xs">
            <Icon size={20} />
          </UiBox>
        )}
        <UiBox className="min-w-0">
          <UiBox className="flex items-center gap-2 flex-wrap">
            <UiHeading as="h2" size="4" weight="bold" color="gray" highContrast className="tracking-tight">
              {title}
            </UiHeading>
            {badge && (
              <Badge variant="soft" color={badgeColor} size="1">
                {badge}
              </Badge>
            )}
          </UiBox>
          {description && (
            <UiText as="p" size="1" color="gray" className="truncate mt-0.5">
              {description}
            </UiText>
          )}
        </UiBox>
      </UiBox>

      {actions && (
        <UiBox className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </UiBox>
      )}
    </UiBox>
  );
}
