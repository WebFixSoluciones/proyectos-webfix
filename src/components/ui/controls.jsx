import { Children, Fragment, forwardRef, isValidElement, useState } from 'react';
import { Button, IconButton, Checkbox, Radio, Select, TextField, TextArea, Table } from '@radix-ui/themes';
import { cn } from '../../lib/utils';

// Keep native form events, names, validation and refs used by business modules.
export const UiButton = forwardRef(function UiButton({ className, children, type = 'button', iconOnly, variant = 'soft', style, ...props }, ref) {
  const Component = iconOnly ? IconButton : Button;
  const stacked = className?.split(/\s+/).includes('flex-col');
  return <Component ref={ref} type={type} variant={variant} className={className} style={{ ...(stacked ? { height: 'auto', minHeight: 'var(--space-8)', padding: 'var(--space-3)' } : {}), ...style }} {...props}>{children}</Component>;
});

export const UiInput = forwardRef(function UiInput({ className, type = 'text', size = '2', ...props }, ref) {
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
  return <TextField.Root ref={ref} type={type} size={['1', '2', '3'].includes(String(size)) ? String(size) : '2'} variant="surface" className={cn('w-full', className)} {...props} />;
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

export const UiTable = forwardRef(function UiTable({ className, ...props }, ref) {
  return <Table.Root ref={ref} size="2" variant="surface" className={className} {...props} />;
});
export const UiTableHeader = forwardRef(function UiTableHeader(props, ref) { return <Table.Header ref={ref} {...props} />; });
export const UiTableBody = forwardRef(function UiTableBody(props, ref) { return <Table.Body ref={ref} {...props} />; });
export const UiTableRow = forwardRef(function UiTableRow(props, ref) { return <Table.Row ref={ref} {...props} />; });
export const UiTableHead = forwardRef(function UiTableHead(props, ref) { return <Table.ColumnHeaderCell ref={ref} {...props} />; });
export const UiTableCell = forwardRef(function UiTableCell(props, ref) { return <Table.Cell ref={ref} {...props} />; });
