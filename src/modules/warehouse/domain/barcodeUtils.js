/**
 * Capa de Dominio — Codificador Real de Códigos de Barra (Code 128B y EAN-13) en SVG puro.
 * Sin dependencias externas pesadas; escaneable por lectores láser USB/Bluetooth y cámaras móviles.
 * Usado en Diseñador de Etiquetas, RIDE SRI (Clave de Acceso 49 dígitos) y Tickets POS.
 */

// Patrones oficiales ISO/IEC 15417 Code 128 (valores 0..106)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const STOP = 106;

/**
 * Codifica cualquier texto ASCII imprimible (o cadena numérica larga como Clave de Acceso de 49 dígitos)
 * en secuencia de módulos binarios Code 128 (usa Start C para alta densidad en cadenas numéricas).
 */
export function encodeCode128Bars(rawValue) {
  const value = String(rawValue ?? '').trim();
  if (!value) return { bars: [], totalModules: 0, text: '' };

  const codes = [];
  const isAllDigits = /^\d+$/.test(value) && value.length >= 4;

  if (isAllDigits) {
    codes.push(START_C);
    let i = 0;
    while (i + 1 < value.length) {
      codes.push(Number.parseInt(value.slice(i, i + 2), 10));
      i += 2;
    }
    if (i < value.length) {
      codes.push(CODE_B);
      codes.push(value.charCodeAt(i) - 32);
    }
  } else {
    codes.push(START_B);
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      const val = code >= 32 && code <= 126 ? code - 32 : 0;
      codes.push(val);
    }
  }

  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  const bars = [];
  let cursor = 10; // quiet zone izquierda (10 módulos)
  for (const sym of codes) {
    const pattern = CODE128_PATTERNS[sym];
    if (!pattern) continue;
    for (let j = 0; j < pattern.length; j++) {
      const w = Number(pattern[j]);
      if (j % 2 === 0) {
        bars.push({ x: cursor, w });
      }
      cursor += w;
    }
  }

  return {
    bars,
    totalModules: cursor + 10, // quiet zone derecha (10 módulos)
    text: value
  };
}

/**
 * Calcula dígito verificador EAN-13 estándar y genera un código válido a partir de 12 dígitos.
 */
export function computeEan13CheckDigit(twelveDigits) {
  const clean = String(twelveDigits || '').replace(/\D/g, '').padStart(12, '0').slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(clean[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

export function generateInternalEan13(seed = '') {
  const digits = String(seed || '').replace(/\D/g, '');
  // Prefijo 200-299 reservado GS1 para uso interno comercial
  const base = (`200${digits}${Date.now().toString().slice(-9)}`).slice(0, 12).padEnd(12, '0');
  return base + computeEan13CheckDigit(base);
}

/**
 * Genera cadena SVG autocontenida (ideal para impresión de etiquetas y RIDE HTML/PDF).
 */
export function renderBarcodeSvgString(value, { height = 44, barColor = '#0f172a', showText = true } = {}) {
  const { bars, totalModules, text } = encodeCode128Bars(value);
  if (!totalModules) return '';
  const textHeight = showText ? 14 : 0;
  const totalHeight = height + textHeight;
  const rects = bars
    .map((b) => `<rect x="${b.x}" y="0" width="${b.w}" height="${height}" fill="${barColor}" />`)
    .join('');
  const label = showText
    ? `<text x="${totalModules / 2}" y="${height + 11}" text-anchor="middle" font-family="monospace" font-size="10" fill="${barColor}">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalHeight}" preserveAspectRatio="none" style="width:100%;height:${totalHeight}px;display:block">${rects}${label}</svg>`;
}
