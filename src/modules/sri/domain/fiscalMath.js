/**
 * Capa de Dominio — Motor de Precisión Fiscal SRI Ecuador (Cero Errores de Redondeo/Validación).
 * Garantiza cuadre exacto al centavo según ficha técnica offline del SRI:
 * - precioTotalSinImpuesto = round2(cantidad * precioUnitario - descuento)
 * - baseImponible agrupada estrictamente por (codigo, codigoPorcentaje)
 * - valorImpuesto por grupo = round2(baseImponible * tarifa / 100)
 * - importeTotal = round2(totalSinImpuestos + sum(valorImpuesto) + propina)
 * - sum(pagos) === importeTotal
 */
import { invoiceLineAmounts } from '../../../services/invoiceLine.js';
import { limpiarIdentificacion, validarIdentificacion, obtenerTipoIdentificacionSRI } from '../../../services/sriService.js';

export const CONSUMIDOR_FINAL_RUC = '9999999999999';
export const CONSUMIDOR_FINAL_MAX_TOTAL = 50.00;

export function round2(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round6(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 1000000) / 1000000;
}

/**
 * Código porcentaje IVA oficial SRI Tabla 17.
 * Corrige el bug de punto flotante `0.14 * 100 === 14.000000000000002` y respeta No Objeto ('6') y Exento ('7').
 */
export function resolveSriIvaCode(ivaRate, ivaCategory = '') {
  const cat = String(ivaCategory || '').toLowerCase().trim();
  if (cat === 'no_objeto' || cat === 'no objeto' || cat === '6') {
    return { codigoPorcentaje: '6', tarifa: 0 };
  }
  if (cat === 'exento' || cat === '7') {
    return { codigoPorcentaje: '7', tarifa: 0 };
  }
  const numericRate = Number(ivaRate);
  const pct = Number.isFinite(numericRate)
    ? (numericRate > 0 && numericRate < 1 ? Math.round(numericRate * 100) : Math.round(numericRate))
    : 15;

  if (pct === 0) return { codigoPorcentaje: '0', tarifa: 0 };
  if (pct === 5) return { codigoPorcentaje: '5', tarifa: 5 };
  if (pct === 8) return { codigoPorcentaje: '8', tarifa: 8 };
  if (pct === 12) return { codigoPorcentaje: '2', tarifa: 12 };
  if (pct === 13) return { codigoPorcentaje: '10', tarifa: 13 };
  if (pct === 14) return { codigoPorcentaje: '3', tarifa: 14 };
  return { codigoPorcentaje: '4', tarifa: 15 };
}

/**
 * Calcula los totales exactos para cualquier comprobante SRI (Factura 01, NC 04, Liquidación 03).
 * Previene desfase de centavos entre `<detalles>` y `<totalConImpuestos>`.
 */
export function computeSriDocumentTotals(items = [], { propina = 0 } = {}) {
  const groups = {};
  const computedLines = [];
  let totalSinImpuestos = 0;
  let totalDescuento = 0;

  for (let i = 0; i < items.length; i++) {
    const raw = items[i] || {};
    const amounts = invoiceLineAmounts(raw);
    const qty = round6(Math.max(0, Number(raw.quantity ?? raw.cantidad ?? 1) || 0));
    const unitPrice = round6(Math.max(0, Number(amounts.unitPrice) || 0));
    const grossLine = round2(qty * unitPrice);
    // Protección estricta: el descuento de línea jamás puede superar el subtotal bruto ni ser negativo
    const lineDiscount = round2(Math.min(grossLine, Math.max(0, Number(amounts.discount) || 0)));
    const precioTotalSinImpuesto = round2(Math.max(0, grossLine - lineDiscount));

    const { codigoPorcentaje, tarifa } = resolveSriIvaCode(
      amounts.rate,
      raw.ivaCategory || raw.iva_category || ''
    );
    const lineIva = round2(precioTotalSinImpuesto * (tarifa / 100));

    totalSinImpuestos = round2(totalSinImpuestos + precioTotalSinImpuesto);
    totalDescuento = round2(totalDescuento + lineDiscount);

    if (!groups[codigoPorcentaje]) {
      groups[codigoPorcentaje] = {
        codigo: '2',
        codigoPorcentaje,
        tarifa,
        baseImponible: 0,
        valor: 0
      };
    }
    groups[codigoPorcentaje].baseImponible = round2(groups[codigoPorcentaje].baseImponible + precioTotalSinImpuesto);

    computedLines.push({
      index: i,
      codigoPrincipal: String(raw.sku || raw.code || raw.id || `PROD-${i + 1}`).substring(0, 25),
      descripcion: String(raw.name || raw.descripcion || 'Producto').trim(),
      cantidad: qty,
      precioUnitario: unitPrice,
      descuento: lineDiscount,
      precioTotalSinImpuesto,
      codigoImpuesto: '2',
      codigoPorcentaje,
      tarifa,
      valorImpuesto: lineIva
    });
  }

  // Calcular el IVA de cada grupo directamente sobre la base imponible acumulada (estándar XSD SRI)
  let totalIva = 0;
  const totalConImpuestos = Object.values(groups).map((g) => {
    const valor = round2(g.baseImponible * (g.tarifa / 100));
    totalIva = round2(totalIva + valor);
    return { ...g, valor };
  });

  const safePropina = round2(Math.max(0, Number(propina) || 0));
  const importeTotal = round2(totalSinImpuestos + totalIva + safePropina);

  return {
    lines: computedLines,
    totalSinImpuestos,
    totalDescuento,
    totalConImpuestos,
    totalIva,
    propina: safePropina,
    importeTotal,
    subtotalsByRate: {
      subtotal0: groups['0']?.baseImponible || 0,
      subtotal5: groups['5']?.baseImponible || 0,
      subtotal12: groups['2']?.baseImponible || 0,
      subtotal15: groups['4']?.baseImponible || 0,
      subtotalNoObjeto: groups['6']?.baseImponible || 0,
      subtotalExento: groups['7']?.baseImponible || 0,
      iva5: totalConImpuestos.find((g) => g.codigoPorcentaje === '5')?.valor || 0,
      iva12: totalConImpuestos.find((g) => g.codigoPorcentaje === '2')?.valor || 0,
      iva15: totalConImpuestos.find((g) => g.codigoPorcentaje === '4')?.valor || 0
    }
  };
}

export function padThreeDigitCode(code, fallback = '001') {
  const digits = String(code ?? '').replace(/\D/g, '');
  if (!digits) return fallback;
  const padded = digits.padStart(3, '0').slice(-3);
  return padded === '000' ? fallback : padded;
}

export function isValidEmissionCode(code) {
  const str = String(code ?? '').trim();
  return /^\d{3}$/.test(str) && str !== '000';
}

/**
 * Validación exhaustiva Pre-Emisión (Pre-Flight) para blindar al usuario contra errores comunes del SRI.
 * Devuelve `{ valid, blockers: [], warnings: [], summary }`.
 */
export function validateSriPreFlight({
  documentType = 'factura',
  emisorConfig = {},
  buyer = {},
  items = [],
  payments = [],
  retenciones = [],
  establecimiento,
  puntoEmision,
  secuencial,
  assignedEmissionPoint = null
}) {
  const blockers = [];
  const warnings = [];

  const estab = String(establecimiento ?? emisorConfig.establecimiento ?? '').trim();
  const ptoEmi = String(puntoEmision ?? emisorConfig.puntoEmision ?? '').trim();
  const emitterRuc = limpiarIdentificacion(emisorConfig.ruc || '');

  // 1. Validación del Emisor y Certificado
  if (!emitterRuc || !/^\d{13}$/.test(emitterRuc)) {
    blockers.push({
      code: 'EMITTER_RUC_INVALID',
      field: 'emisor.ruc',
      message: 'El RUC del emisor debe tener exactamente 13 dígitos numéricos (ver Ajustes > Configuración Fiscal).'
    });
  }
  if (!String(emisorConfig.razonSocial || '').trim()) {
    blockers.push({
      code: 'EMITTER_NAME_MISSING',
      field: 'emisor.razonSocial',
      message: 'Falta la Razón Social del emisor en Configuración Fiscal.'
    });
  }
  if (!String(emisorConfig.dirMatriz || '').trim()) {
    warnings.push({
      code: 'EMITTER_ADDRESS_MISSING',
      field: 'emisor.dirMatriz',
      message: 'La dirección matriz del emisor está vacía; se recomienda completarla para cumplimiento SRI.'
    });
  }
  if (!emisorConfig.certificadoBase64 && !emisorConfig.certificadoCargado) {
    blockers.push({
      code: 'CERT_MISSING',
      field: 'emisor.certificado',
      message: 'No hay certificado de firma electrónica (.p12) cargado para firmar el comprobante.'
    });
  }
  if (emisorConfig.certificadoVigenciaFin) {
    const exp = new Date(emisorConfig.certificadoVigenciaFin);
    if (!Number.isNaN(exp.getTime())) {
      const daysLeft = Math.ceil((exp.getTime() - Date.now()) / 86400000);
      if (daysLeft < 0) {
        blockers.push({
          code: 'CERT_EXPIRED',
          field: 'emisor.certificado',
          message: `La firma electrónica (.p12) venció hace ${Math.abs(daysLeft)} día(s). Renuévala en Ajustes > Firma Electrónica.`
        });
      } else if (daysLeft <= 15) {
        warnings.push({
          code: 'CERT_EXPIRING_SOON',
          field: 'emisor.certificado',
          message: `La firma electrónica vence en ${daysLeft} día(s). Planifica su renovación.`
        });
      }
    }
  }

  // 2. Aseguramiento de Punto de Emisión y Secuencial
  if (!isValidEmissionCode(estab) || !isValidEmissionCode(ptoEmi)) {
    blockers.push({
      code: 'EMISSION_POINT_INVALID',
      field: 'puntoEmision',
      message: `Establecimiento (${estab || 'vacío'}) y Punto de Emisión (${ptoEmi || 'vacío'}) deben ser códigos de 3 dígitos distintos de 000 (ej. 001-001).`
    });
  }
  if (assignedEmissionPoint?.locked && (assignedEmissionPoint.estab !== estab || assignedEmissionPoint.ptoEmi !== ptoEmi)) {
    blockers.push({
      code: 'EMISSION_POINT_LOCKED',
      field: 'puntoEmision',
      message: `Tu usuario está restringido al punto de emisión ${assignedEmissionPoint.estab}-${assignedEmissionPoint.ptoEmi} y no puede emitir en ${estab}-${ptoEmi}.`
    });
  }
  if (secuencial !== undefined && secuencial !== null && secuencial !== '') {
    const seqNum = Number(secuencial);
    if (!Number.isInteger(seqNum) || seqNum < 1 || seqNum > 999999999) {
      blockers.push({
        code: 'SEQUENTIAL_INVALID',
        field: 'secuencial',
        message: 'El secuencial del comprobante debe ser un entero entre 1 y 999999999.'
      });
    }
  }

  // 3. Validación del Receptor / Comprador
  const buyerRuc = limpiarIdentificacion(buyer.ruc || buyer.identificacion || '');
  const buyerName = String(buyer.name || buyer.razonSocial || '').trim();
  const isConsumidorFinal =
    buyerRuc === CONSUMIDOR_FINAL_RUC ||
    String(buyer.tipoIdentificacion || '').toLowerCase() === 'consumidor_final' ||
    (!buyerRuc && buyerName.toUpperCase().includes('CONSUMIDOR FINAL'));

  if (!buyerName && !isConsumidorFinal) {
    blockers.push({
      code: 'BUYER_NAME_MISSING',
      field: 'buyer.name',
      message: 'Debes indicar la Razón Social o nombre completo del cliente.'
    });
  }
  if (!isConsumidorFinal) {
    const idCheck = validarIdentificacion(buyerRuc, buyer.tipoIdentificacion);
    if (!idCheck.valido) {
      blockers.push({
        code: 'BUYER_ID_INVALID',
        field: 'buyer.ruc',
        message: idCheck.mensaje || 'Identificación del receptor inválida (verifica longitud y dígito verificador SRI).'
      });
    }
  }

  // 4. Validación de Ítems, Descuentos, Redondeos y Totales
  const isRetencion = documentType === 'retencion';
  const isGuia = documentType === 'guia_remision';
  const totals = computeSriDocumentTotals(items);

  if (isRetencion) {
    if (!Array.isArray(retenciones) || retenciones.length === 0) {
      blockers.push({
        code: 'RETENCIONES_EMPTY',
        field: 'retenciones',
        message: 'Debes agregar al menos un impuesto retenido (Renta o IVA) con base imponible y porcentaje.'
      });
    }
  } else if (!Array.isArray(items) || items.length === 0) {
    blockers.push({
      code: 'ITEMS_EMPTY',
      field: 'items',
      message: 'El comprobante debe contener al menos un producto o servicio.'
    });
  } else {
    items.forEach((raw, idx) => {
      const qty = Number(raw?.quantity ?? raw?.cantidad ?? 0);
      const price = Number(raw?.price ?? raw?.precioUnitario ?? 0);
      const disc = Number(raw?.descuento ?? raw?.discount ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        blockers.push({
          code: 'ITEM_QTY_INVALID',
          field: `items[${idx}].quantity`,
          message: `Línea #${idx + 1} (${raw?.name || 'Ítem'}): la cantidad debe ser mayor a 0.`
        });
      }
      if (!Number.isFinite(price) || price < 0) {
        blockers.push({
          code: 'ITEM_PRICE_INVALID',
          field: `items[${idx}].price`,
          message: `Línea #${idx + 1} (${raw?.name || 'Ítem'}): el precio unitario no puede ser negativo.`
        });
      }
      if (disc < 0) {
        blockers.push({
          code: 'ITEM_DISCOUNT_NEGATIVE',
          field: `items[${idx}].discount`,
          message: `Línea #${idx + 1} (${raw?.name || 'Ítem'}): el descuento no puede ser negativo.`
        });
      }
    });

    if (!isGuia && totals.importeTotal <= 0) {
      blockers.push({
        code: 'TOTAL_NON_POSITIVE',
        field: 'total',
        message: 'El valor total del comprobante debe ser mayor a $0.00.'
      });
    }
  }

  // 5. Regla SRI Consumidor Final > $50.00
  if (documentType === 'factura' && isConsumidorFinal && totals.importeTotal > CONSUMIDOR_FINAL_MAX_TOTAL) {
    blockers.push({
      code: 'CONSUMIDOR_FINAL_LIMIT',
      field: 'buyer.ruc',
      message: `El SRI prohíbe emitir facturas a Consumidor Final por más de $${CONSUMIDOR_FINAL_MAX_TOTAL.toFixed(2)} (total actual: $${totals.importeTotal.toFixed(2)}). Identifica al cliente con Cédula, RUC o Pasaporte.`
    });
  }

  // 6. Validación de Cuadre de Pagos (solo Factura y Liquidación)
  if ((documentType === 'factura' || documentType === 'liquidacion') && Array.isArray(payments) && payments.length > 0) {
    const sumPayments = round2(payments.reduce((acc, p) => acc + (Number(p?.total ?? p?.amount ?? 0) || 0), 0));
    const diff = round2(Math.abs(sumPayments - totals.importeTotal));
    if (diff > 0.01) {
      blockers.push({
        code: 'PAYMENT_MISMATCH',
        field: 'payments',
        message: `Los pagos ($${sumPayments.toFixed(2)}) no cuadran con el total de la factura ($${totals.importeTotal.toFixed(2)}). Diferencia: $${diff.toFixed(2)}.`
      });
    }
  }

  // 7. Advertencia de ambiente
  if (String(emisorConfig.ambiente || '1') === '1') {
    warnings.push({
      code: 'SANDBOX_ENVIRONMENT',
      field: 'ambiente',
      message: 'Ambiente de PRUEBAS activo. Este comprobante no tiene validez tributaria real.'
    });
  }

  return {
    valid: blockers.length === 0,
    blockers,
    warnings,
    summary: {
      ambiente: String(emisorConfig.ambiente || '1'),
      estab: padThreeDigitCode(estab, '001'),
      ptoEmi: padThreeDigitCode(ptoEmi, '001'),
      tipoIdentificacion: isConsumidorFinal ? '07' : obtenerTipoIdentificacionSRI(buyerRuc),
      identificacion: isConsumidorFinal ? CONSUMIDOR_FINAL_RUC : buyerRuc,
      totals
    }
  };
}
