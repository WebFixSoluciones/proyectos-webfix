import { cn } from '../../lib/utils';

const TONE_CLASSES = {
  brand: 'bg-[#e8fedf] text-[#004227] border-[#b3f4cb]',
  success: 'bg-[#f0fdf4] text-[#0b996f] border-[#b3f4cb]',
  neutral: 'bg-[#fafafa] text-[#1b1b1b] border-[#e3e3e3]',
  muted: 'bg-[#fafafa] text-[#696969] border-[#e3e3e3]',
  warning: 'bg-[#fcfbe7] text-[#866308] border-[#f0df8a]',
  danger: 'bg-[#fff0f5] text-[#851b40] border-[#fbc6d9]',
};

const LEVEL_STYLES = {
  header: { box: 'w-10 h-10 rounded-[10px]', iconSize: 19, strokeWidth: 2, defaultTone: 'brand' },
  modal: { box: 'w-9 h-9 rounded-[10px]', iconSize: 17, strokeWidth: 2, defaultTone: 'brand' },
  kpi: { box: 'w-9 h-9 rounded-[10px]', iconSize: 16, strokeWidth: 2, defaultTone: 'brand' },
  empty: { box: 'w-12 h-12 rounded-2xl', iconSize: 24, strokeWidth: 1.75, defaultTone: 'muted' },
};

/**
 * Estándar oficial Brevo de contenedores de íconos (WebFix UI Kit v2).
 * Reemplaza cajas negras sólidas e íconos sueltos con 4 niveles geométricos exactos.
 */
export function UiIconBadge({
  icon: Icon,
  level = 'kpi',
  tone,
  size,
  strokeWidth,
  className,
  children,
  ...props
}) {
  const cfg = LEVEL_STYLES[level] || LEVEL_STYLES.kpi;
  const resolvedTone = TONE_CLASSES[tone || cfg.defaultTone] || TONE_CLASSES.brand;
  const iconPx = size ?? cfg.iconSize;
  const iconStroke = strokeWidth ?? cfg.strokeWidth;

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center shrink-0 border',
        cfg.box,
        resolvedTone,
        className
      )}
      {...props}
    >
      {Icon ? <Icon size={iconPx} strokeWidth={iconStroke} /> : children}
    </div>
  );
}

export default UiIconBadge;
