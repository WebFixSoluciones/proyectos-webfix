import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const excluded = new Set(['PublicRideView.jsx', 'RidePreviewModal.jsx']);
const palette = { primary: 'blue', accent: 'blue', emerald: 'green', success: 'green', green: 'green', red: 'red', error: 'red', rose: 'red', amber: 'amber', yellow: 'amber', warning: 'amber', orange: 'orange', blue: 'blue', info: 'blue', cyan: 'cyan', teal: 'teal', purple: 'purple', violet: 'violet', indigo: 'indigo', pink: 'pink', slate: 'gray', gray: 'gray', zinc: 'gray', neutral: 'gray' };
const textSizes = { xs: '1', sm: '2', base: '3', lg: '4', xl: '5', '2xl': '6', '3xl': '7', '4xl': '8', '5xl': '9' };
let files = 0, controls = 0;
function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(value => walk(value, fn));
  fn(node);
  Object.entries(node).forEach(([key, value]) => { if (key !== 'loc') walk(value, fn); });
}
function color(value) { return palette[value.split('-')[0]] || 'gray'; }
function propsFor(classes, kind) {
  const props = {}, style = {}, layout = [];
  const button = kind === 'UiButton' || kind === 'Button';
  const text = ['UiText', 'UiHeading', 'UiLabel'].includes(kind);
  const field = ['UiInput', 'Input', 'UiSelect', 'UiTextarea'].includes(kind);
  const native = !button && !text && !field;
  for (const token of classes.split(/\s+/).filter(Boolean)) {
    const base = token.split(':').at(-1);
    const state = token.includes(':');
    const visual = /^(bg-|text-|font-|border|rounded|shadow|ring|outline|backdrop-|blur|from-|via-|to-|tracking-|decoration-|divide-|placeholder|accent-|fill-|stroke-)/.test(base) || ['uppercase', 'lowercase', 'capitalize', 'normal-case', 'antialiased'].includes(base);
    if (state && visual) continue;
    if (/^text-(left|right|center|justify|ellipsis|wrap|nowrap|balance|pretty|clip)$/.test(base)) { layout.push(token); continue; }
    if (/^bg-/.test(base)) {
      const rawValue = base.slice(3);
      const value = rawValue.split('/')[0];
      const translucent = rawValue.includes('/') && Number(rawValue.split('/')[1]) <= 30;
      if (button) {
        props.variant = value === 'transparent' ? 'ghost' : value === 'white' ? 'surface' : translucent || /(?:light|muted|surface|-[123]00)/.test(value) ? 'soft' : 'solid';
        if (!['white', 'transparent'].includes(value)) props.color = color(value);
      } else if (native) {
        const scale = value.match(/-(\d+)$/)?.[1];
        style.backgroundColor = value === 'transparent' ? 'transparent' : rawValue.startsWith('black/') ? 'var(--black-a7)' : value === 'white' || value.includes('card') || value.includes('sidebar') ? 'var(--color-panel-solid)' : value === 'black' ? 'var(--gray-12)' : value.includes('surface') ? 'var(--gray-2)' : `var(--${color(value)}-${translucent ? 3 : scale ? Number(scale) >= 500 ? 9 : 3 : /light|muted/.test(value) ? 3 : color(value) === 'gray' ? 2 : 9})`;
      }
      continue;
    }
    if (/^text-/.test(base)) {
      const value = base.slice(5);
      if (textSizes[value]) {
        if (text) props.size = textSizes[value];
        else if (button || field) props.size = Number(textSizes[value]) <= 2 ? '2' : '3';
      } else if (!value.startsWith('[')) {
        if (text || button || field) {
          if (value !== 'white' && value !== 'current' && value !== 'inherit') props.color = color(value);
          if (['black', 'text-heading', 'text-primary'].includes(value) && text) props.highContrast = true;
        } else style.color = value === 'white' ? 'var(--color-background)' : value === 'current' ? 'currentColor' : `var(--${color(value)}-${/secondary|muted|-[456]00/.test(value) ? 11 : 12})`;
      }
      continue;
    }
    if (/^font-/.test(base)) {
      if (text) props.weight = /bold|black/.test(base) ? 'bold' : /medium|semibold/.test(base) ? 'medium' : 'regular';
      if (base === 'font-mono' && native) style.fontFamily = 'var(--code-font-family)';
      continue;
    }
    if (/^border($|-[btlrxy]$|-[0-9])/.test(base)) {
      if (button && !props.variant) props.variant = 'outline';
      if (native && kind !== 'UiCard' && !kind.startsWith('UiTable')) {
        const side = { b: 'Bottom', t: 'Top', l: 'Left', r: 'Right' }[base.split('-')[1]] || '';
        style['border' + side] = base === 'border-0' ? '0' : '1px solid var(--gray-a6)';
      }
      continue;
    }
    if (/^rounded/.test(base)) { if (native && kind !== 'UiCard') style.borderRadius = 'var(--radius-3)'; continue; }
    if (/^btn-/.test(base)) {
      props.variant = /primary|accent|blue/.test(base) ? 'solid' : /danger|destructive/.test(base) ? 'soft' : 'surface';
      props.color = /danger|destructive/.test(base) ? 'red' : 'blue';
      continue;
    }
    if (/^(glass|surface-|card-std|badge-status|label-field|heading-|modal-.*-std|font-monospace|mono-data|animate-pulse-glow)/.test(base)) continue;
    if (visual || ['filter', 'mix-blend-screen', 'transition-all', 'transition-colors'].includes(base)) continue;
    if ((button || field) && /^(p[xytrbl]?|h|min-h)-/.test(base)) continue;
    layout.push(token);
  }
  if (Object.keys(style).length) props.style = style;
  if (layout.length) props.className = layout.join(' ');
  return props;
}
function migrate(file) {
  if (excluded.has(path.basename(file))) return;
  const source = fs.readFileSync(file, 'utf8');
  if (/from ['"][^'"]*\/ui\/layout['"]/.test(source)) return;
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx', ...(file.endsWith('.tsx') ? ['typescript'] : [])] });
  const edits = [], imports = new Set();
  let needsMerge = false;
  const variables = new Map();
  walk(ast, node => { if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && /class|style/i.test(node.id.name)) variables.set(node.id.name, node.init); });
  function compile(node, kind, seen = new Set()) {
    if (!node) return '{}';
    if (node.type === 'StringLiteral') return JSON.stringify(propsFor(node.value, kind));
    if (node.type === 'TemplateLiteral') {
      const parts = node.quasis.map(q => JSON.stringify(propsFor(q.value.cooked || '', kind)));
      node.expressions.forEach(exp => parts.push(compile(exp, kind, seen)));
      needsMerge = true; return `mergeThemeProps(${parts.join(', ')})`;
    }
    if (node.type === 'ConditionalExpression') return `(${source.slice(node.test.start, node.test.end)} ? ${compile(node.consequent, kind, seen)} : ${compile(node.alternate, kind, seen)})`;
    if (node.type === 'LogicalExpression') return `(${source.slice(node.left.start, node.left.end)} ${node.operator} ${compile(node.right, kind, seen)})`;
    if (node.type === 'Identifier' && variables.has(node.name) && !seen.has(node.name)) return compile(variables.get(node.name), kind, new Set([...seen, node.name]));
    // Caller-supplied className is already restricted to layout by the caller migration.
    return `{ className: ${source.slice(node.start, node.end)} }`;
  }
  walk(ast, node => {
    if (node.type !== 'JSXElement' || node.openingElement.name.type !== 'JSXIdentifier') return;
    const opening = node.openingElement, original = opening.name.name;
    const attr = opening.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === 'className');
    let kind = original;
    if (original === 'div') kind = 'UiBox';
    if (original === 'span' || original === 'p') kind = 'UiText';
    if (/^h[1-6]$/.test(original)) kind = 'UiHeading';
    if (original === 'label') kind = 'UiLabel';
    const classSource = attr ? source.slice(attr.start, attr.end) : '';
    if (original === 'div' && /(?:card-std|surface-card|bg-white)/.test(classSource) && /\bborder\b|card-std/.test(classSource) && !/fixed|absolute|overflow/.test(classSource)) kind = 'UiCard';
    if (kind !== original) {
      imports.add(kind);
      edits.push({ start: opening.name.start, end: opening.name.end, text: kind + (original === 'p' || /^h[1-6]$/.test(original) ? ` as="${original}"` : '') });
      if (node.closingElement) edits.push({ start: node.closingElement.name.start, end: node.closingElement.name.end, text: kind });
    }
    if (attr) {
      const expr = attr.value.type === 'JSXExpressionContainer' ? attr.value.expression : attr.value;
      edits.push({ start: attr.start, end: attr.end, text: `{...${compile(expr, kind)}}` });
      controls++;
    }
    if (original === 'UiButton') {
      const children = node.children.filter(child => child.type !== 'JSXText' || child.value.trim());
      if (children.length === 1 && children[0].type === 'JSXElement' && /^[A-Z]/.test(children[0].openingElement.name.name || '') && !/^Ui/.test(children[0].openingElement.name.name)) {
        edits.push({ start: opening.name.end, end: opening.name.end, text: ' iconOnly' });
      }
    }
  });
  if (!edits.length) return;
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  let relative = path.relative(path.dirname(file), 'src/components/ui').replaceAll('\\', '/');
  if (!relative.startsWith('.')) relative = './' + relative;
  if (imports.size) output = `import { ${[...imports].join(', ')} } from '${relative}/layout';\n` + output;
  if (needsMerge) output = `import { mergeThemeProps } from '${relative}/themeProps';\n` + output;
  fs.writeFileSync(file, output);
  files++;
}
function directory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (file.replaceAll('\\', '/') !== 'src/components/ui') directory(file); }
    else if (/\.(jsx|tsx)$/.test(file)) migrate(file);
  }
}
directory('src');
console.log({ files, controls });
