#!/usr/bin/env node
/**
 * Estandariza el color primario: reemplaza tokens Tailwind de azul/índigo "de marca"
 * por los tokens --primary del sistema, preservando el peso visual.
 *
 * Uso: node scripts/primary-color-map.mjs <archivo> [<archivo> ...]
 *
 * - Reemplazo LITERAL por token completo, ordenado de más largo a más corto
 *   para no corromper subcadenas (ej. bg-blue-500 antes que bg-blue-50).
 * - Solo toca azul/índigo. Verde/rojo/amarillo no se tocan.
 * - NO usar en archivos con paletas (App.jsx USER_COLORS/COLUMN_COLORS): esos van a mano.
 */
import { readFileSync, writeFileSync } from 'node:fs';

// Mapa base por "rol" visual. Se expande a variantes de prefijo (hover:, focus:, dark:, group-hover:).
const MAP = {
  // --- Fondos sólidos de acción ---
  'bg-blue-900': 'bg-primary',
  'bg-blue-700': 'bg-primary-hover',
  'bg-blue-605': 'bg-primary',
  'bg-blue-600': 'bg-primary',
  'bg-blue-300': 'bg-primary',
  'bg-blue-500': 'bg-primary',
  'bg-blue-600/20': 'bg-primary/20',
  'bg-blue-650/35': 'bg-primary/35',
  'bg-blue-650/30': 'bg-primary/30',
  'bg-blue-650/20': 'bg-primary/20',
  'bg-blue-650/15': 'bg-primary/15',
  'bg-blue-500/10': 'bg-primary/10',
  'bg-blue-400/10': 'bg-primary/10',
  'bg-blue-950/30': 'bg-primary/25',
  // --- Fondos suaves (tints) ---
  'bg-blue-50': 'bg-primary-light',
  'bg-blue-50/80': 'bg-primary-light',
  'bg-blue-50/50': 'bg-primary-light',
  'bg-blue-50/40': 'bg-primary-light',
  'bg-blue-50/30': 'bg-primary-light',
  'bg-blue-50/20': 'bg-primary/5',
  'bg-blue-50/10': 'bg-primary/5',
  'bg-blue-50/5': 'bg-primary/5',
  'bg-blue-100': 'bg-primary/10',
  'bg-blue-200': 'bg-primary/15',
  'bg-blue-100/50': 'bg-primary/10',
  // --- Texto / iconos de acento ---
  'text-blue-800': 'text-primary',
  'text-blue-900': 'text-primary',
  'text-blue-950': 'text-primary',
  'text-blue-755': 'text-primary',
  'text-blue-750': 'text-primary',
  'text-blue-700': 'text-primary',
  'text-blue-650': 'text-primary',
  'text-blue-605': 'text-primary',
  'text-blue-600': 'text-primary',
  'text-blue-550': 'text-primary',
  'text-blue-500': 'text-primary',
  'text-blue-400': 'text-primary',
  'text-blue-305': 'text-primary',
  'text-blue-300': 'text-primary',
  // --- Bordes (tints faint → opacidad baja; sólidos → primary) ---
  'border-blue-100': 'border-primary/15',
  'border-blue-100/70': 'border-primary/15',
  'border-blue-100/55': 'border-primary/15',
  'border-blue-100/50': 'border-primary/10',
  'border-blue-150': 'border-primary/20',
  'border-blue-200': 'border-primary/25',
  'border-blue-300': 'border-primary/40',
  'border-blue-500': 'border-primary',
  'border-blue-600': 'border-primary',
  'border-blue-500/20': 'border-primary/20',
  'border-blue-500/30': 'border-primary/30',
  'border-blue-900/50': 'border-primary/40',
  // --- Focus / ring ---
  'focus:border-blue-600': 'focus:border-primary',
  'focus:border-blue-500': 'focus:border-primary',
  'focus:border-blue-500/50': 'focus:border-primary/50',
  'focus:ring-blue-650/40': 'focus:ring-primary/40',
  'focus:ring-blue-500': 'focus:ring-primary',
  'ring-blue-500': 'ring-primary',
  'ring-blue-600': 'ring-primary',
  // --- Sombra de marca ---
  'shadow-blue-950/20': 'shadow-primary/20',
  'shadow-blue-900/50': 'shadow-primary/40',
  'shadow-blue-900/10': 'shadow-primary/10',
  'shadow-blue-900/20': 'shadow-primary/20',
  'shadow-blue-500/30': 'shadow-primary/30',
  // --- Divide (separadores) ---
  'divide-blue-100/50': 'divide-primary/10',
  'divide-blue-100': 'divide-primary/15',
  // --- Gradientes de marca ---
  'from-blue-400': 'from-primary',
  'from-blue-500': 'from-primary',
  'from-blue-600': 'from-primary',
  'to-blue-500': 'to-primary-hover',
  'to-blue-600': 'to-primary-hover',
  'to-blue-900': 'to-primary',
  // --- Índigo usado como acento de marca ---
  'bg-indigo-500': 'bg-primary',
  'bg-indigo-600': 'bg-primary',
  'bg-indigo-100': 'bg-primary/10',
  'text-indigo-700': 'text-primary',
  'text-indigo-600': 'text-primary',
  'text-indigo-500': 'text-primary',
  'text-indigo-400': 'text-primary',
  'text-indigo-300': 'text-primary',
  'border-indigo-500': 'border-primary',
  'border-indigo-200': 'border-primary/25',
  'bg-indigo-200': 'bg-primary/15',
  'from-indigo-500': 'from-primary',
  'from-indigo-50': 'from-primary/10',
  'from-indigo-900/30': 'from-primary/30',
  'to-indigo-500': 'to-primary-hover',
  'to-indigo-600': 'to-primary-hover',
  'to-blue-50': 'to-primary/10',
};

// Variantes de hover: que aparecen en el código (mapear al destino con su prefijo)
const PREFIXES = ['hover:', 'focus:', 'group-hover:', 'dark:', 'active:', 'md:', 'lg:'];

// Construir el set completo de pares (incluye versiones con prefijo de cada token base)
const pairs = [];
for (const [from, to] of Object.entries(MAP)) {
  pairs.push([from, to]);
  // Evitar duplicar prefijos ya incluidos como clave (focus:border-blue-600, etc.)
  if (!from.includes(':')) {
    for (const p of PREFIXES) pairs.push([p + from, p + to]);
  }
}
// Orden por longitud de la clave, descendente (evita corromper subcadenas)
pairs.sort((a, b) => b[0].length - a[0].length);

let grandTotal = 0;
for (const file of process.argv.slice(2)) {
  let src = readFileSync(file, 'utf8');
  let count = 0;
  for (const [from, to] of pairs) {
    const parts = src.split(from);
    if (parts.length > 1) {
      count += parts.length - 1;
      src = parts.join(to);
    }
  }
  writeFileSync(file, src);
  grandTotal += count;
  console.log(`${file}: ${count} reemplazos`);
}
console.log(`TOTAL: ${grandTotal}`);
