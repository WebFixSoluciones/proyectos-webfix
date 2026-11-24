import * as firestore from './financeStore.js';
import { roundMoney } from './paymentModel.js';
import { registrarAuditoria } from './auditService.js';
import { getAppId } from '../firebase.js';

export function parsearFecha(fechaStr) {
  if (!fechaStr) return new Date();
  if (fechaStr instanceof Date) {
    return isNaN(fechaStr.getTime()) ? new Date() : fechaStr;
  }
  if (typeof fechaStr === 'string') {
    const trimmed = fechaStr.trim();
    // DD/MM/YYYY o DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(.*)$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      const rest = dmy[4] ? dmy[4].trim() : 'T12:00:00';
      const iso = `${year}-${month}-${day}${rest.startsWith('T') || rest.startsWith(' ') ? rest.trim() : 'T12:00:00'}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }
    const standard = new Date(trimmed);
    if (!isNaN(standard.getTime())) return standard;
  }
  return new Date();
}

function mapearMetodoPago(metodo) {
  const mapa = {
    'efectivo': 'efectivo',
    'transferencia': 'transferencia',
    'tarjeta': 'tarjeta_credito',
    'tarjeta_credito': 'tarjeta_credito',
    'tarjeta_debito': 'tarjeta_debito',
    'credito': 'credito',
    'combinado': 'combinado',
    'cruce_cuentas': 'cruce_cuentas',
    'cheque': 'cheque',
  };
  return mapa[metodo] || 'efectivo';
}

function mapearVentaAMovimiento(venta) {
  const fecha = parsearFecha(venta.date);
  return {
    tipo: 'ingreso',
    fecha: fecha,
    fechaVencimiento: venta.fechaVencimiento ? parsearFecha(venta.fechaVencimiento) : null,
    monto: Number(venta.total) || 0,
    metodoPago: mapearMetodoPago(venta.paymentMethod),
    documento: {
      tipo: venta.documentType || 'factura',
      numero: venta.documentNumber || '',
      claveAcceso: venta.claveAcceso || null,
      urlXml: venta.xmlUrl || null,
      urlPdf: venta.pdfUrl || null,
    },
    tercero: {
      id: venta.thirdPartyId || '',
      nombre: venta.clienteNombre || venta.thirdPartyName || venta.thirdParty?.name || 'CONSUMIDOR FINAL',
      ruc: venta.clienteRuc || venta.thirdPartyRuc || venta.thirdParty?.ruc || '9999999999999',
    },
    partidas: [{
      cuenta: '',
      categoria: 'ventas',
      descripcion: venta.descripcion || `Venta ${venta.documentType || 'factura'} ${venta.documentNumber || ''}`,
      baseImponible: Number(venta.baseImponible) || Number(venta.subtotal) || 0,
      iva: Number(venta.ivaValor) || 0,
      total: Number(venta.total) || 0,
      deducible: true,
    }],
    pagos: venta.paymentStatus === 'pagado' ? [{
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      fecha: fecha.toISOString(),
      monto: Number(venta.total) || 0,
      metodoPago: mapearMetodoPago(venta.paymentMethod),
      referencia: venta.transactionRef || '',
    }] : [],
    estado: venta.paymentStatus === 'pagado' ? 'pagado' : 'pendiente',
    sriStatus: venta.sriStatus || 'no_aplica',
    origen: venta.isPOS ? 'pos' : 'ventas',
    origenId: venta.id,
    notas: venta.notas || '',
    creadoPor: venta.creadoPor || '',
  };
}

function mapearCompraAMovimiento(compra) {
  const fecha = parsearFecha(compra.date);
  return {
    tipo: 'egreso',
    fecha: fecha,
    fechaVencimiento: compra.fechaVencimiento ? parsearFecha(compra.fechaVencimiento) : null,
    monto: Number(compra.total) || 0,
    metodoPago: mapearMetodoPago(compra.paymentMethod),
    documento: {
      tipo: compra.documentType || 'factura',
      numero: compra.documentNumber || '',
      claveAcceso: compra.claveAcceso || null,
      urlXml: compra.xmlUrl || null,
      urlPdf: compra.pdfUrl || null,
    },
    tercero: {
      id: compra.thirdPartyId || '',
      nombre: compra.proveedorNombre || compra.thirdPartyName || 'SIN PROVEEDOR',
      ruc: compra.proveedorRuc || compra.thirdPartyRuc || '9999999999999',
    },
    partidas: [{
      cuenta: '',
      categoria: compra.category || 'costos',
      descripcion: compra.descripcion || compra.description || `Compra ${compra.documentType || 'factura'} ${compra.documentNumber || ''}`,
      baseImponible: Number(compra.baseImponible) || Number(compra.subtotal) || 0,
      iva: Number(compra.ivaValor) || 0,
      retencionFuente: Number(compra.retencionFuente) || 0,
      retencionIva: Number(compra.retencionIva) || 0,
      total: Number(compra.total) || 0,
      deducible: true,
    }],
    pagos: compra.paymentStatus === 'pagado' ? [{
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      fecha: fecha.toISOString(),
      monto: Number(compra.total) || 0,
      metodoPago: mapearMetodoPago(compra.paymentMethod),
      referencia: compra.transactionRef || '',
    }] : [],
    estado: compra.paymentStatus === 'pagado' ? 'pagado' : 'pendiente',
    sriStatus: compra.sriStatus || 'no_aplica',
    origen: 'compras',
    origenId: compra.id,
    notas: compra.notas || '',
    creadoPor: compra.creadoPor || '',
  };
}

async function sincronizarDocumento(data, db, usuario, venta, api = firestore, options = {}) {
  const { doc, runTransaction, serverTimestamp } = api;
  const { allowInactiveBankFallback = false } = options || {};
  if (!data?.id || !db) throw new Error('Documento o empresa no disponible para sincronizar.');
  const user = usuario || { uid: '', email: '' };
  const collection = venta ? 'fin_cxc' : 'fin_cxp';
  const linkedRef = doc(db, collection, data.id);
  const movData = { ...(venta ? mapearVentaAMovimiento(data) : mapearCompraAMovimiento(data)), tenantId: getAppId() };
  const total = roundMoney(data.total);
  if (!Number.isFinite(total) || total <= 0) throw new Error('El total financiero debe ser mayor a cero.');
  const result = await runTransaction(db, async tx => {
    const linked = await tx.get(linkedRef);
    const previous = linked.data();
    const movementId = previous?.movimientoId || (venta ? 'venta_' : 'compra_') + data.id;
    const movementRef = doc(db, 'fin_movimientos', movementId);
    const movement = await tx.get(movementRef);
    const defaultBankId = data.cuentaBancariaId || data.transferenciaBankId || data.bankAccountId || '';
    const initialPaid = Number(data.paidAmount ?? (data.paymentStatus === 'pagado' ? total : 0));
    if (!Number.isFinite(initialPaid) || initialPaid < 0 || initialPaid > total + 0.01) throw new Error('El pago inicial no coincide con el total.');
    const splitPayments = data.paymentsBreakdown ? ['efectivo', 'transferencia', 'tarjeta'].filter(method => Number(data.paymentsBreakdown[method]) > 0).map(method => ({ id: 'origen:' + data.id + ':' + method, fecha: movData.fecha.toISOString(), monto: roundMoney(data.paymentsBreakdown[method]), metodoPago: mapearMetodoPago(method), referencia: data[method + 'Ref'] || data.paymentReferences?.[method + 'Ref'] || '', movimientoId: movementId })) : null;
    if (splitPayments && Math.abs(roundMoney(splitPayments.reduce((sum, p) => sum + p.monto, 0)) - initialPaid) > 0.01) throw new Error('El desglose de pagos no coincide con el importe abonado.');
    const abonos = previous?.abonos || splitPayments || (initialPaid > 0 ? [{ id: 'origen:' + data.id, fecha: movData.fecha.toISOString(), monto: roundMoney(initialPaid), metodoPago: movData.metodoPago, referencia: data.transactionRef || '', movimientoId: movementId }] : []);
    const paid = roundMoney(abonos.reduce((sum, p) => sum + Number(p.monto || 0), 0));
    if (paid > total + 0.01) throw new Error('El total no puede ser inferior a los abonos ya registrados.');
    const saldoPendiente = Math.max(0, roundMoney(total - paid));
    const estado = previous?.estado === 'anulado' ? 'anulado' : saldoPendiente === 0 ? 'pagado' : paid > 0 ? 'parcial' : 'pendiente';
    const factura = { tipo: data.documentType || 'factura', numero: data.documentNumber || '', claveAcceso: data.claveAcceso || null, fecha: movData.fecha, fechaVencimiento: data.creditDueDate ? parsearFecha(data.creditDueDate) : movData.fechaVencimiento, montoTotal: total, baseImponible: Number(data.baseImponible || 0), iva: Number(data.ivaValor || 0), retencionFuente: Number(data.retencionFuente || 0), retencionIva: Number(data.retencionIva || 0) };
    // Construir asientos bancarios/caja por cada canal de pago inmediato con cuenta destino
    const candidatePostings = [];
    const transferAmount = data.paymentsBreakdown
      ? roundMoney(data.paymentsBreakdown.transferencia || 0)
      : (data.paymentMethod === 'transferencia' ? roundMoney(initialPaid) : 0);
    if (!Number.isFinite(transferAmount) || transferAmount < 0 || transferAmount > initialPaid + 0.01) {
      throw new Error('El importe transferido no coincide con el pago.');
    }
    const transfBankId = data.transferenciaBankId || data.paymentReferences?.transferenciaBankId || defaultBankId;
    if (transferAmount > 0 && !transfBankId && !allowInactiveBankFallback) {
      throw new Error('Selecciona la cuenta bancaria de la transferencia.');
    }

    if (data.paymentsBreakdown) {
      const amtTransf = transferAmount;
      const amtTarjeta = roundMoney(data.paymentsBreakdown.tarjeta || 0);
      const amtEfectivo = roundMoney(data.paymentsBreakdown.efectivo || 0);
      const tarjetaBankId = data.tarjetaBankId || data.paymentReferences?.tarjetaBankId || '';
      const efectivoCajaId = data.efectivoCajaId || data.paymentReferences?.efectivoCajaId || '';
      if (amtTransf > 0 && transfBankId) {
        candidatePostings.push({
          docId: `mov_doc_${data.id}`,
          cuentaId: transfBankId,
          monto: amtTransf,
          metodoPago: 'transferencia',
          referencia: data.transferenciaRef || data.paymentReferences?.transferenciaRef || data.transactionRef || '',
        });
      }
      if (amtTarjeta > 0 && tarjetaBankId) {
        candidatePostings.push({
          docId: candidatePostings.length === 0 ? `mov_doc_${data.id}` : `mov_doc_${data.id}_tarjeta`,
          cuentaId: tarjetaBankId,
          monto: amtTarjeta,
          metodoPago: 'tarjeta_credito',
          referencia: data.tarjetaRef || data.paymentReferences?.tarjetaRef || data.transactionRef || '',
        });
      }
      if (amtEfectivo > 0 && efectivoCajaId) {
        candidatePostings.push({
          docId: candidatePostings.length === 0 ? `mov_doc_${data.id}` : `mov_doc_${data.id}_efectivo`,
          cuentaId: efectivoCajaId,
          monto: amtEfectivo,
          metodoPago: 'efectivo',
          referencia: data.transactionRef || '',
        });
      }
    } else if (defaultBankId && initialPaid > 0) {
      candidatePostings.push({
        docId: `mov_doc_${data.id}`,
        cuentaId: defaultBankId,
        monto: roundMoney(initialPaid),
        metodoPago: movData.metodoPago,
        referencia: data.transferenciaRef || data.transactionRef || '',
      });
    }

    // Leer todas las cuentas bancarias/caja ANTES de escribir en la transacción
    const uniqueBankIds = [...new Set(candidatePostings.map(p => p.cuentaId))];
    const bankSnaps = new Map();
    for (const bId of uniqueBankIds) {
      const bRef = doc(db, 'fin_bancos', bId);
      const bSnap = await tx.get(bRef);
      const isInactiveOrMissing = !bSnap?.exists?.() || bSnap.data()?.estado === 'inactivo' || (bSnap.data()?.estado && bSnap.data()?.estado !== 'activo');
      if (isInactiveOrMissing) {
        if (allowInactiveBankFallback) continue;
        throw new Error('La cuenta bancaria está inactiva o no existe.');
      }
      bankSnaps.set(bId, bRef);
    }
    const validPostings = candidatePostings.filter(p => bankSnaps.has(p.cuentaId));
    const primaryBankMovId = validPostings[0]?.docId || null;

    tx.set(linkedRef, { tenantId: getAppId(), movimientoId: movementId, tercero: movData.tercero, factura, abonos, saldoPendiente, estado, notas: data.notas || '', creadoEn: previous?.creadoEn || serverTimestamp(), actualizadoEn: serverTimestamp() }, { merge: true });
    tx.set(movementRef, { ...movData, monto: total, pagos: abonos, saldoPendiente, estado, ...(primaryBankMovId ? { conciliacionBancariaId: primaryBankMovId } : {}), creadoPor: user.uid || '', creadoEn: movement.data()?.creadoEn || serverTimestamp(), actualizadoEn: serverTimestamp() }, { merge: true });

    const touchedBankRefs = new Set();
    for (const posting of validPostings) {
      const bankMovRef = doc(db, 'fin_movimientos_bancarios', posting.docId);
      tx.set(bankMovRef, {
        cuentaId: posting.cuentaId,
        tipo: venta ? 'credito' : 'debito',
        monto: roundMoney(posting.monto),
        fecha: movData.fecha,
        descripcion: `${venta ? (data.isPOS ? 'Venta POS' : 'Venta') : 'Compra'} ${data.documentType || 'factura'} ${data.documentNumber || data.id} — ${movData.tercero.nombre}`,
        terceroNombre: movData.tercero.nombre,
        metodoPago: posting.metodoPago,
        origen: venta ? (data.isPOS ? 'pos' : 'ventas') : 'compras',
        referencia: posting.referencia,
        conciliado: true,
        movimientoId: movementId,
        origenId: data.id,
        estado: 'activo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      touchedBankRefs.add(posting.cuentaId);
    }
    for (const bId of touchedBankRefs) {
      tx.update(bankSnaps.get(bId), { updatedAt: serverTimestamp() });
    }

    return { movimientoId: movementId, [venta ? 'cxcId' : 'cxpId']: data.id };
  });
  if (api === firestore) registrarAuditoria(db, { coleccion: collection, documentoId: data.id, accion: 'sincronizar', usuario: user.uid, usuarioEmail: user.email, cambios: result, modulo: venta ? 'ventas' : 'compras' });
  return result;
}

export const sincronizarVenta = (venta, db, usuario, api, options) => sincronizarDocumento(venta, db, usuario, true, api, options);
export const sincronizarCompra = (compra, db, usuario, api, options) => sincronizarDocumento(compra, db, usuario, false, api, options);

/**
 * Determina si una transacción de `finances_transactions` debe estar reflejada
 * en el libro central `fin_movimientos`.
 */
export function esTransaccionSincronizable(tx) {
  if (!tx || !tx.id) return false;
  const total = roundMoney(tx.total);
  if (!Number.isFinite(total) || total <= 0) return false;

  const status = String(tx.status || '').toLowerCase();
  const sriStatus = String(tx.sriStatus || '').toLowerCase();
  if (status === 'anulado' || sriStatus === 'anulado' || sriStatus === 'borrador' || tx.isPreventa) {
    return false;
  }

  const docType = String(tx.documentType || 'factura').toLowerCase();
  const isEgreso = tx.type === 'egreso';
  if (isEgreso) {
    return !['cotizacion', 'proforma'].includes(docType);
  }

  // Ingresos (Ventas)
  if (docType === 'factura') {
    return sriStatus === 'autorizado';
  }
  if (docType === 'nota_venta') {
    return !['pendiente_sri', 'devuelto', 'no_autorizado', 'rechazado'].includes(sriStatus);
  }
  return false;
}

/**
 * Detecta qué transacciones válidas de `finances_transactions` aún no tienen su
 * registro correspondiente en `fin_movimientos`.
 */
export function detectarTransaccionesSinMovimiento(transactions = [], movimientos = []) {
  const existingOrigenIds = new Set();
  const existingMovIds = new Set();
  const existingClaves = new Set();

  for (const m of movimientos || []) {
    if (m.id) existingMovIds.add(String(m.id));
    if (m.origenId) existingOrigenIds.add(String(m.origenId));
    if (m.documento?.claveAcceso) existingClaves.add(String(m.documento.claveAcceso));
  }

  return (transactions || []).filter((tx) => {
    if (!esTransaccionSincronizable(tx)) return false;
    const txId = String(tx.id);
    if (existingOrigenIds.has(txId)) return false;
    if (existingMovIds.has(`venta_${txId}`) || existingMovIds.has(`compra_${txId}`)) return false;
    if (tx.claveAcceso && existingClaves.has(String(tx.claveAcceso))) return false;
    return true;
  });
}

/**
 * Sincroniza de forma idempotente todas las ventas autorizadas y compras vigentes
 * que falten en `fin_movimientos` (y sus CxC/CxP/bancos asociados).
 */
export async function sincronizarTransaccionesFaltantes(db, transactions = [], existingMovimientos = [], usuario = {}, api = firestore) {
  const pendientes = detectarTransaccionesSinMovimiento(transactions, existingMovimientos);
  let synced = 0;
  const errors = [];

  for (const tx of pendientes) {
    try {
      const isEgreso = tx.type === 'egreso';
      if (isEgreso) {
        await sincronizarCompra(tx, db, usuario, api, { allowInactiveBankFallback: true });
      } else {
        await sincronizarVenta(tx, db, usuario, api, { allowInactiveBankFallback: true });
      }
      synced += 1;
    } catch (err) {
      errors.push({
        id: tx.id,
        documentNumber: tx.documentNumber || tx.id,
        error: err?.message || 'Error al sincronizar',
      });
    }
  }

  return { totalChecked: pendientes.length, synced, errors };
}
