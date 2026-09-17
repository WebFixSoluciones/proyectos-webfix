import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
function walk(node, fn) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(n => walk(n, fn)); fn(node); for (const [key, value] of Object.entries(node)) if (key !== 'loc') walk(value, fn); }
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { visit(file); continue; }
    if (!/\.(jsx|tsx)$/.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8'), counts = {}, edits = [];
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx', ...(file.endsWith('.tsx') ? ['typescript'] : [])] });
    walk(ast, n => { if (n.type === 'Identifier') counts[n.name] = (counts[n.name] || 0) + 1; });
    walk(ast, n => {
      if (n.type === 'VariableDeclaration' && n.declarations.length === 1) {
        const d = n.declarations[0];
        if (d.id.type === 'Identifier' && /Class$/.test(d.id.name) && counts[d.id.name] === 1 && ['StringLiteral', 'TemplateLiteral', 'ConditionalExpression'].includes(d.init?.type)) edits.push(n);
      }
    });
    let output = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + output.slice(edit.end);
    if (output !== source) fs.writeFileSync(file, output);
  }
}
visit('src');
