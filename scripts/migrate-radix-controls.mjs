import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

// One-time JSX migration. Edit syntax nodes only: never HTML inside print templates.
const tags = { button: 'UiButton', input: 'UiInput', textarea: 'UiTextarea', select: 'UiSelect', table: 'UiTable', thead: 'UiTableHeader', tbody: 'UiTableBody', tr: 'UiTableRow', th: 'UiTableHead', td: 'UiTableCell' };
const printFiles = new Set(['PublicRideView.jsx', 'RidePreviewModal.jsx']);
const counts = {};
function visit(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => visit(n, fn)); return; }
  fn(node);
  for (const [key, value] of Object.entries(node)) if (key !== 'loc') visit(value, fn);
}
function migrate(file) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx', ...(file.endsWith('.tsx') ? ['typescript'] : [])] });
  const edits = [], used = new Set();
  visit(ast, node => {
    if (!['JSXOpeningElement', 'JSXClosingElement'].includes(node.type) || node.name.type !== 'JSXIdentifier') return;
    const name = node.name.name;
    if (!tags[name] || (printFiles.has(path.basename(file)) && ['table', 'thead', 'tbody', 'tr', 'th', 'td'].includes(name))) return;
    used.add(tags[name]);
    edits.push({ start: node.name.start, end: node.name.end, text: tags[name] });
    if (node.type === 'JSXOpeningElement') counts[name] = (counts[name] || 0) + 1;
  });
  if (!edits.length) return;
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  let relative = path.relative(path.dirname(file), 'src/components/ui/controls').replaceAll('\\', '/');
  if (!relative.startsWith('.')) relative = './' + relative;
  result = `import { ${[...used].join(', ')} } from '${relative}';\n` + result;
  if (result.includes("import { createPortal } from 'react-dom';")) {
    const portalPath = relative.replace(/controls$/, 'themePortal');
    result = result.replace("import { createPortal } from 'react-dom';", `import { createThemedPortal as createPortal } from '${portalPath}';`);
  }
  fs.writeFileSync(file, result);
}
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) { if (file.replaceAll('\\', '/') !== 'src/components/ui') walk(file); }
    else if (/\.(jsx|tsx)$/.test(file)) migrate(file);
  }
}
walk('src');
console.log(JSON.stringify(counts, null, 2));
