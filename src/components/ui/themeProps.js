// Combines conditional Radix properties and layout classes without recreating a CSS theme.
export function mergeThemeProps(...values) {
  const result = {};
  for (const value of values) {
    if (!value) continue;
    const { className, style, ...props } = value;
    Object.assign(result, props);
    if (className) result.className = [result.className, className].filter(Boolean).join(' ');
    if (style) result.style = { ...result.style, ...style };
  }
  return result;
}

export function resolveThemeProps(value) {
  return value && typeof value === 'object' ? value : { className: value || '' };
}
