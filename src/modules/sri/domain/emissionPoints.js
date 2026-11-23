/**
 * Capa de Dominio — Gestión Segura de Puntos de Emisión y Secuenciales SRI.
 * Aísla numeraciones por (ambiente, establecimiento, puntoEmision, docType) evitando
 * saltos entre Pruebas y Producción y bloqueando retrocesos accidentales de secuencial.
 */
import { padThreeDigitCode, isValidEmissionCode } from './fiscalMath.js';

export const SRI_DOC_CODES = {
  factura: '01',
  liquidacion: '03',
  nota_credito: '04',
  nota_debito: '05',
  guia_remision: '06',
  retencion: '07',
  nota_venta: 'NV'
};

export function buildEmissionSeriesKey({ ambiente = '1', estab = '001', ptoEmi = '001', docType = 'factura' }) {
  const amb = String(ambiente || '1') === '2' ? '2' : '1';
  const e = padThreeDigitCode(estab, '001');
  const p = padThreeDigitCode(ptoEmi, '001');
  const code = SRI_DOC_CODES[docType] || docType;
  return `${amb}_${e}_${p}_${code}`;
}

/**
 * Normaliza la lista de puntos de emisión de una empresa preservando la configuración
 * legacy (`establecimiento` y `puntoEmision` raíz en `finances_settings/config`).
 */
export function normalizeEmissionPoints(fiscalConfig = {}) {
  const defaultEstab = padThreeDigitCode(fiscalConfig.establecimiento, '001');
  const defaultPto = padThreeDigitCode(fiscalConfig.puntoEmision, '001');
  const existing = Array.isArray(fiscalConfig.puntosEmision) ? fiscalConfig.puntosEmision : [];

  const list = existing
    .filter((ep) => ep && (ep.estab || ep.establecimiento) && (ep.ptoEmi || ep.puntoEmision))
    .map((ep, idx) => {
      const estab = padThreeDigitCode(ep.estab || ep.establecimiento, defaultEstab);
      const ptoEmi = padThreeDigitCode(ep.ptoEmi || ep.puntoEmision, defaultPto);
      return {
        id: ep.id || `ep_${estab}_${ptoEmi}_${idx}`,
        estab,
        ptoEmi,
        label: String(ep.label || ep.nombre || `Caja ${estab}-${ptoEmi}`).trim(),
        branchName: String(ep.branchName || ep.sucursal || 'Matriz').trim(),
        active: ep.active !== false,
        locked: ep.locked === true,
        assignedUserIds: Array.isArray(ep.assignedUserIds) ? ep.assignedUserIds : [],
        isDefault: Boolean(ep.isDefault)
      };
    });

  const hasPrimary = list.some((ep) => ep.estab === defaultEstab && ep.ptoEmi === defaultPto);
  if (!hasPrimary) {
    list.unshift({
      id: `ep_${defaultEstab}_${defaultPto}`,
      estab: defaultEstab,
      ptoEmi: defaultPto,
      label: `Principal ${defaultEstab}-${defaultPto}`,
      branchName: 'Matriz',
      active: true,
      locked: false,
      assignedUserIds: [],
      isDefault: true
    });
  } else if (!list.some((ep) => ep.isDefault)) {
    const primary = list.find((ep) => ep.estab === defaultEstab && ep.ptoEmi === defaultPto);
    if (primary) primary.isDefault = true;
  }

  return list;
}

/**
 * Valida que no se retroceda un secuencial por debajo del último ya emitido/autorizado
 * en la misma serie `(ambiente, estab, ptoEmi, docType)`.
 */
export function validateSequentialChange({ currentFloor = 1, proposedNext = 1 }) {
  const floor = Math.max(1, Number.parseInt(currentFloor, 10) || 1);
  const next = Number.parseInt(proposedNext, 10);
  if (!Number.isInteger(next) || next < 1 || next > 999999999) {
    return { valid: false, message: 'El secuencial debe ser un número entero entre 1 y 999999999.' };
  }
  if (next < floor) {
    return {
      valid: false,
      message: `Bloqueado por seguridad SRI: no puedes retroceder el secuencial a ${String(next).padStart(9, '0')} porque ya existe un comprobante emitido hasta ${String(floor - 1).padStart(9, '0')} en esta serie.`
    };
  }
  if (next - floor > 50) {
    return {
      valid: true,
      warning: `Estás saltando ${next - floor} números en la secuencia (${String(floor).padStart(9, '0')} → ${String(next).padStart(9, '0')}). Confirma que sea intencional.`
    };
  }
  return { valid: true };
}

export function validateEmissionPointInput({ estab, ptoEmi, existingPoints = [], editingId = null }) {
  if (!isValidEmissionCode(estab)) {
    return { valid: false, message: 'El establecimiento debe tener 3 dígitos y ser distinto de 000 (ej. 001).' };
  }
  if (!isValidEmissionCode(ptoEmi)) {
    return { valid: false, message: 'El punto de emisión debe tener 3 dígitos y ser distinto de 000 (ej. 001).' };
  }
  const duplicate = existingPoints.some(
    (ep) => ep.estab === estab && ep.ptoEmi === ptoEmi && ep.id !== editingId
  );
  if (duplicate) {
    return { valid: false, message: `El punto de emisión ${estab}-${ptoEmi} ya está registrado.` };
  }
  return { valid: true };
}
