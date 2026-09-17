import * as firestore from './financeStore.js';
import { roundMoney } from './paymentModel.js';
import { registrarAuditoria } from './auditService.js';
import { getAppId } from '../firebase.js';

function mapearMetodoPago(metodo) {
  const mapa = {
    'efectivo': 'efectivo',
    'transferencia': 'transferencia',
    'tarjeta': 'tarjeta_credito',
    'tarjeta_credito': 'tarjeta_credito',
    'tarjeta_debito': 'tarjeta_debito',
    'credito': 'efectivo',
    'combinado': 'efectivo',
    'cruce_cuentas': 'cruce_cuentas',
    'cheque': 'cheque',
  };
  return mapa[metodo] || 'efectivo';
}

function mapearVentaAMovimiento(venta) {
  const fecha = venta.date ? new Date(venta.date) : new Date();
  return {
    tipo: 'ingreso',
    fecha: fecha,
    fechaVencimiento: venta.fechaVencimiento ? new Date(venta.fechaVencimiento) : null,
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
  const fecha = compra.date ? new Date(compra.date) : new Date();
  return {
    tipo: 'egreso',
    fecha: fecha,
    fechaVencimiento: compra.fechaVencimiento ? new Date(compra.fechaVencimiento) : null,
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

async function sincronizarDocumento(data, db, usuario, venta, api = firestore) {
  const { doc, runTransaction, serverTimestamp } = api;
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
    const initialPaid = Number(data.paidAmount ?? (data.paymentStatus === 'pagado' ? total : 0));
    if (!Number.isFinite(initialPaid) || initialPaid < 0 || initialPaid > total + 0.01) throw new Error('El pago inicial no coincide con el total.');
    const splitPayments = data.paymentsBreakdown ? ['efectivo', 'transferencia', 'tarjeta'].filter(method => Number(data.paymentsBreakdown[method]) > 0).map(method => ({ id: 'origen:' + data.id + ':' + method, fecha: movData.fecha.toISOString(), monto: roundMoney(data.paymentsBreakdown[method]), metodoPago: mapearMetodoPago(method), referencia: data[method + 'Ref'] || '', movimientoId: movementId })) : null;
    if (splitPayments && Math.abs(roundMoney(splitPayments.reduce((sum, p) => sum + p.monto, 0)) - initialPaid) > 0.01) throw new Error('El desglose de pagos no coincide con el importe abonado.');
    const abonos = previous?.abonos || splitPayments || (initialPaid > 0 ? [{ id: 'origen:' + data.id, fecha: movData.fecha.toISOString(), monto: roundMoney(initialPaid), metodoPago: movData.metodoPago, referencia: data.transactionRef || '', movimientoId: movementId }] : []);
    const paid = roundMoney(abonos.reduce((sum, p) => sum + Number(p.monto || 0), 0));
    if (paid > total + 0.01) throw new Error('El total no puede ser inferior a los abonos ya registrados.');
    const saldoPendiente = Math.max(0, roundMoney(total - paid));
    const estado = previous?.estado === 'anulado' ? 'anulado' : saldoPendiente === 0 ? 'pagado' : paid > 0 ? 'parcial' : 'pendiente';
    const factura = { tipo: data.documentType || 'factura', numero: data.documentNumber || '', claveAcceso: data.claveAcceso || null, fecha: movData.fecha, fechaVencimiento: data.creditDueDate ? new Date(data.creditDueDate + 'T12:00:00') : movData.fechaVencimiento, montoTotal: total, baseImponible: Number(data.baseImponible || 0), iva: Number(data.ivaValor || 0), retencionFuente: Number(data.retencionFuente || 0), retencionIva: Number(data.retencionIva || 0) };
    tx.set(linkedRef, { tenantId: getAppId(), movimientoId: movementId, tercero: movData.tercero, factura, abonos, saldoPendiente, estado, notas: data.notas || '', creadoEn: previous?.creadoEn || serverTimestamp(), actualizadoEn: serverTimestamp() }, { merge: true });
    tx.set(movementRef, { ...movData, monto: total, pagos: abonos, saldoPendiente, estado, creadoPor: user.uid || '', creadoEn: movement.data()?.creadoEn || serverTimestamp(), actualizadoEn: serverTimestamp() }, { merge: true });
    return { movimientoId: movementId, [venta ? 'cxcId' : 'cxpId']: data.id };
  });
  if (api === firestore) registrarAuditoria(db, { coleccion: collection, documentoId: data.id, accion: 'sincronizar', usuario: user.uid, usuarioEmail: user.email, cambios: result, modulo: venta ? 'ventas' : 'compras' });
  return result;
}

export const sincronizarVenta = (venta, db, usuario, api) => sincronizarDocumento(venta, db, usuario, true, api);
export const sincronizarCompra = (compra, db, usuario, api) => sincronizarDocumento(compra, db, usuario, false, api);
