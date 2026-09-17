import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
const excluded = new Set(['PublicRideView.jsx', 'RidePreviewModal.jsx']);
const colors = { emerald: 'green', success: 'green', green: 'green', red: 'red', error: 'red', primary: 'blue', info: 'blue', blue: 'blue', amber: 'amber', warning: 'amber', yellow: 'amber', purple: 'purple', orange: 'orange', violet: 'violet', sky: 'sky' };
function walk(node, fn, parent) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(n => walk(n, fn, parent)); fn(node, parent); Object.entries(node).forEach(([key,value]) => { if (key !== 'loc') walk(value, fn, node); }); }
const isVisual = value => /(?:^|\s)(?:bg-|text-(?:primary|success|error|warning|info|text-|green-|red-|blue-|amber-|yellow-|purple-|gray-|emerald-)|border-(?:border-|status-))/.test(value);
function presentation(value) {
  const style = {}, layout = [];
  for (const token of value.split(/\s+/).filter(Boolean)) {
    if (token.includes(':')) continue;
    const prefix = token.split('-')[0], rest = token.slice(prefix.length + 1);
    const color = /authorized|success/.test(rest) ? 'green' : /rejected|error/.test(rest) ? 'red' : /pending|warning/.test(rest) ? 'amber' : colors[rest.split('-')[0]] || 'gray';
    if (prefix === 'bg') style.backgroundColor = `var(--${color}-${/500|600|700/.test(rest) || ['primary', 'error'].includes(rest) ? 9 : 3})`;
    else if (prefix === 'text') style.color = `var(--${color}-11)`;
    else if (!/^(border|rounded|font|shadow|ring)/.test(token)) layout.push(token);
  }
  return { ...(Object.keys(style).length ? { style } : {}), ...(layout.length ? { className: layout.join(' ') } : {}) };
}
function apply(source, edits) { for (const e of edits.sort((a,b) => b.start - a.start)) source = source.slice(0,e.start) + e.text + source.slice(e.end); return source; }
function file(file) {
  if (excluded.has(path.basename(file)) || file.includes(`${path.sep}ui${path.sep}`)) return;
  let source = fs.readFileSync(file,'utf8');
  const plugins = ['jsx', ...(file.endsWith('.tsx') ? ['typescript'] : [])];
  let ast = parse(source,{ sourceType:'module',plugins }), edits=[];
  walk(ast, (n, parent) => {
    if (n.type !== 'StringLiteral' || !isVisual(n.value)) return;
    if (parent?.type === 'JSXAttribute' && parent.name.name !== 'color') return;
    const text = JSON.stringify(presentation(n.value));
    edits.push({start:n.start,end:n.end,text:parent?.type === 'JSXAttribute' ? `{${text}}` : text});
  });
  source = apply(source,edits); edits=[];
  ast = parse(source,{sourceType:'module',plugins});
  walk(ast,n => {
    if (n.type !== 'ObjectExpression' || n.properties.length !== 1) return;
    const p = n.properties[0];
    if (p.type === 'ObjectProperty' && (p.key.name || p.key.value) === 'className' && !['StringLiteral','TemplateLiteral'].includes(p.value.type)) {
      edits.push({start:n.start,end:n.end,text:`resolveThemeProps(${source.slice(p.value.start,p.value.end)})`});
    }
  });
  if (edits.length) {
    source = apply(source,edits);
    let relative = path.relative(path.dirname(file),'src/components/ui/themeProps').replaceAll('\\','/');
    if (!relative.startsWith('.')) relative='./'+relative;
    source=`import { resolveThemeProps } from '${relative}';\n`+source;
  }
  fs.writeFileSync(file,source);
}
function visit(dir) { for(const e of fs.readdirSync(dir,{withFileTypes:true})) {const p=path.join(dir,e.name); if(e.isDirectory())visit(p); else if(/\.(jsx|tsx)$/.test(p))file(p);} }
visit('src');
