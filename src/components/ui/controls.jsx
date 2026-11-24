import { Children, Fragment, forwardRef, isValidElement, useState } from 'react';
import { Button, IconButton, Checkbox, Radio, Select, TextField, TextArea, Table } from '@radix-ui/themes';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Resuelve cualquier combinación de props nuevas (Brevo v2) o legadas (Radix)
 * al contrato único de 6 tonos semánticos y 3 tallas exactas (sm: 30px, md: 36px, lg: 42px).
 */
function resolveBrevoButtonVariant(variant, color, iconOnly) {
  const v = String(variant || 'secondary').toLowerCase();
  const c = String(color || '').toLowerCase();

  // Variantes explícitas Brevo v2
  if (['primary', 'brand', 'secondary', 'soft', 'soft-amber', 'danger', 'danger-solid', 'ghost'].includes(v)) {
    return v;
  }

  // Botones solo-ícono (tablas y modales): neutro limpio o destructivo rosa
  if (iconOnly) {
    if (c === 'red' || c === 'rose') return 'danger';
    if (v === 'solid' && c === 'green') return 'brand';
    if (v === 'solid') return 'primary';
    if (v === 'soft' && (c === 'green' || c === 'emerald')) return 'soft';
    if (v === 'soft' && c === 'amber') return 'soft-amber';
    return 'secondary';
  }

  // Mapeo desde variantes legadas de Radix (solid, soft, surface, outline, ghost)
  if (v === 'solid') {
    if (c === 'red' || c === 'rose') return 'danger-solid';
    if (c === 'green' || c === 'emerald') return 'brand';
    return 'primary';
  }
  if (v === 'soft') {
    if (c === 'red' || c === 'rose') return 'danger';
    if (c === 'amber') return 'soft-amber';
    if (c === 'gray' || c === 'slate') return 'secondary';
    return 'soft';
  }
  if (v === 'outline' || v === 'surface') {
    if (c === 'red' || c === 'rose') return 'danger';
    return 'secondary';
  }
  return 'secondary';
}

function resolveRadixPropsFromBrevo(wfVariant, size) {
  const sizeMap = { sm: '1', md: '2', lg: '3', '1': '1', '2': '2', '3': '3' };
  const radixSize = sizeMap[String(size || '2')] || '2';
  const wfSize = radixSize === '1' ? 'sm' : radixSize === '3' ? 'lg' : 'md';
  const radixVariant =
    wfVariant === 'primary' || wfVariant === 'brand' || wfVariant === 'danger-solid'
      ? 'solid'
      : wfVariant === 'soft' || wfVariant === 'soft-amber' || wfVariant === 'danger'
        ? 'soft'
        : wfVariant === 'ghost'
          ? 'ghost'
          : 'outline';
  return { radixSize, wfSize, radixVariant };
}

// Keep native form events, names, validation and refs used by business modules.
export const UiButton = forwardRef(function UiButton(
  { className, children, type = 'button', iconOnly, variant = 'soft', color, size = '2', style, asChild = false, ...props },
  ref
) {
  const Component = iconOnly ? IconButton : Button;
  const stacked = className?.split(/\s+/).includes('flex-col');
  const wfVariant = resolveBrevoButtonVariant(variant, color, Boolean(iconOnly));
  const { radixSize, wfSize, radixVariant } = resolveRadixPropsFromBrevo(wfVariant, size);

  return (
    <Component
      ref={ref}
      asChild={asChild}
      type={asChild ? undefined : type}
      variant={radixVariant}
      color={wfVariant === 'danger' || wfVariant === 'danger-solid' ? 'red' : wfVariant === 'brand' || wfVariant === 'soft' ? 'green' : 'gray'}
      size={radixSize}
      data-wf-button="true"
      data-wf-variant={wfVariant}
      data-wf-size={wfSize}
      data-wf-icon-only={iconOnly ? 'true' : undefined}
      className={cn(className)}
      style={{ ...(stacked ? { height: 'auto', minHeight: 'var(--space-8)', padding: 'var(--space-3)' } : {}), ...style }}
      {...props}
    >
      {children}
    </Component>
  );
});

/**
 * Botón estándar único de cierre de modales (32×32px, borde 1px, ícono X 16px).
 */
export const UiModalCloseButton = forwardRef(function UiModalCloseButton({ className, onClick, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label="Cerrar"
      className={cn(
        'w-8 h-8 rounded-[8px] border border-[#e3e3e3] bg-[#fafafa] hover:bg-[#efefef] text-[#474747] hover:text-[#1b1b1b] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer',
        className
      )}
      {...props}
    >
      <X size={16} strokeWidth={2} />
    </button>
  );
});

export const UiInput = forwardRef(function UiInput({ className, type = 'text', size = '2', iconPrefix, iconSuffix, children, ...props }, ref) {
  if (type === 'checkbox') {
    const { onChange, checked, defaultChecked, ...rest } = props;
    return <Checkbox ref={ref} className={className} checked={checked} defaultChecked={defaultChecked} {...rest} onCheckedChange={next => {
      const target = { name: props.name, value: props.value || 'on', type, checked: next === true };
      onChange?.({ target, currentTarget: target });
    }} />;
  }
  if (type === 'radio') return <Radio ref={ref} className={className} {...props} />;
  if (['file', 'range', 'color', 'hidden', 'submit', 'reset', 'button', 'image'].includes(type)) {
    return <input ref={ref} type={type} size={size} className={cn('webfix-native-input', className)} {...props} />;
  }
  const radixSize = ['1', '2', '3'].includes(String(size)) ? String(size) : '2';
  const hasExplicitWidth = typeof className === 'string' && /(?:^|\s)(?:[a-z]+:)?w-/.test(className);
  const defaultWidth = hasExplicitWidth ? '' : (type === 'date' ? 'w-auto min-w-[148px]' : 'w-full');
  if (iconPrefix || iconSuffix || children) {
    const cleanClassName = className ? className.replace(/\bpl-\d+\b/g, '').replace(/\bpr-\d+\b/g, '').trim() : className;
    let cleanProps = props;
    if (props.style && (props.style.paddingLeft || props.style.paddingRight)) {
      const restStyle = { ...props.style };
      delete restStyle.paddingLeft;
      delete restStyle.paddingRight;
      cleanProps = { ...props, style: restStyle };
    }
    return (
      <TextField.Root ref={ref} type={type} size={radixSize} variant="surface" className={cn(defaultWidth, cleanClassName)} {...cleanProps}>
        {iconPrefix && <TextField.Slot side="left">{iconPrefix}</TextField.Slot>}
        {children}
        {iconSuffix && <TextField.Slot side="right">{iconSuffix}</TextField.Slot>}
      </TextField.Root>
    );
  }
  return <TextField.Root ref={ref} type={type} size={radixSize} variant="surface" className={cn(defaultWidth, className)} {...props} />;
});

export const UiTextarea = forwardRef(function UiTextarea({ className, ...props }, ref) {
  return <TextArea ref={ref} size="2" variant="surface" className={className} {...props} />;
});

const emptyOption = '__webfix_empty_option__';
function collectOptions(children) {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement(child)) return [];
    if (child.type === Fragment) return collectOptions(child.props.children);
    if (child.type === 'optgroup') return collectOptions(child.props.children).map(option => ({ ...option, group: child.props.label, disabled: child.props.disabled || option.disabled }));
    if (child.type !== 'option') return [];
    return [{ value: String(child.props.value ?? child.props.children ?? ''), label: child.props.children, disabled: child.props.disabled }];
  });
}
export const UiSelect = forwardRef(function UiSelect({ className, children, value, defaultValue, onChange, name, required, disabled, multiple, size, ...props }, ref) {
  const options = collectOptions(children);
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? options[0]?.value ?? ''));
  // Listboxes with multiple selections remain native; Themes Select is single-value.
  if (multiple) return <select ref={ref} multiple name={name} value={value} defaultValue={defaultValue} onChange={onChange} required={required} disabled={disabled} className={className} {...props}>{children}</select>;
  const selected = String(value ?? internalValue);
  const selectedOption = options.find(option => option.value === selected);
  return <Select.Root name={name} required={required} disabled={disabled} size={['1', '2', '3'].includes(String(size)) ? String(size) : '2'} value={selected || emptyOption} onValueChange={next => {
    const result = next === emptyOption ? '' : next;
    setInternalValue(result);
    const target = { name, value: result, type: 'select-one' };
    onChange?.({ target, currentTarget: target });
  }}>
    <Select.Trigger ref={ref} className={className} {...props}>{selectedOption?.label ?? 'Seleccionar'}</Select.Trigger>
    <Select.Content position="popper" style={{ zIndex: 1000 }}>
      {options.map((option, index) => <Select.Item key={`${option.value}-${index}`} value={option.value || emptyOption} disabled={option.disabled}>{option.group ? `${option.group} · ` : ''}{option.label}</Select.Item>)}
    </Select.Content>
  </Select.Root>;
});

export const UiTable = forwardRef(function UiTable({ className, variant = "ghost", ...props }, ref) {
  return <Table.Root ref={ref} size="2" variant={variant} className={className} {...props} />;
});
export const UiTableHeader = forwardRef(function UiTableHeader(props, ref) { return <Table.Header ref={ref} {...props} />; });
export const UiTableBody = forwardRef(function UiTableBody(props, ref) { return <Table.Body ref={ref} {...props} />; });
export const UiTableRow = forwardRef(function UiTableRow(props, ref) { return <Table.Row ref={ref} {...props} />; });
export const UiTableHead = forwardRef(function UiTableHead(props, ref) { return <Table.ColumnHeaderCell ref={ref} {...props} />; });
export const UiTableCell = forwardRef(function UiTableCell(props, ref) { return <Table.Cell ref={ref} {...props} />; });
