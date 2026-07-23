import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { crearMovimiento } from './movimientoService';
import { registrarAuditoria } from './auditService';

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
      nombre: venta.clienteNombre || venta.thirdPartyName || 'CONSUMIDOR FINAL',
      ruc: venta.clienteRuc || venta.thirdPartyRuc || '9999999999999',
    },
    partidas: [{
      cuenta: '',
      categoria: 'gastos_administrativos',
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

export async function sincronizarVenta(venta, db, usuario) {
  if (!venta || !venta.id || !db) return;

  const user = usuario || { uid: '', email: '' };

  try {
    const movData = mapearVentaAMovimiento(venta);
    const movimiento = await crearMovimiento(db, movData, user);

    const fecha = venta.date ? new Date(venta.date) : new Date();

    await setDoc(doc(db, 'fin_cxc', venta.id), {
      movimientoId: movimiento.id,
      tercero: {
        id: venta.thirdPartyId || '',
        nombre: venta.clienteNombre || venta.thirdPartyName || 'CONSUMIDOR FINAL',
        ruc: venta.clienteRuc || venta.thirdPartyRuc || '9999999999999',
      },
      factura: {
        tipo: venta.documentType || 'factura',
        numero: venta.documentNumber || '',
        claveAcceso: venta.claveAcceso || null,
        fecha: fecha,
        fechaVencimiento: venta.fechaVencimiento ? new Date(venta.fechaVencimiento) : null,
        montoTotal: Number(venta.total) || 0,
        iva: Number(venta.ivaValor) || 0,
      },
      abonos: venta.paymentStatus === 'pagado' ? [{
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        fecha: fecha.toISOString(),
        monto: Number(venta.total) || 0,
        metodoPago: mapearMetodoPago(venta.paymentMethod),
        referencia: venta.transactionRef || '',
        movimientoId: movimiento.id,
      }] : [],
      saldoPendiente: venta.paymentStatus === 'pagado' ? 0 : (Number(venta.total) || 0),
      estado: venta.paymentStatus === 'pagado' ? 'pagado' : 'pendiente',
      notas: venta.notas || '',
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });

    registrarAuditoria(db, {
      coleccion: 'fin_cxc',
      documentoId: venta.id,
      accion: 'crear',
      usuario: user.uid,
      usuarioEmail: user.email,
      cambios: { movimientoId: movimiento.id },
      modulo: 'ventas',
    });

    return { movimientoId: movimiento.id, cxcId: venta.id };
  } catch (e) {
    console.error('[integracionFinanzas] Error sincronizando venta:', e);
  }
}

export async function sincronizarCompra(compra, db, usuario) {
  if (!compra || !compra.id || !db) return;

  const user = usuario || { uid: '', email: '' };

  try {
    const movData = mapearCompraAMovimiento(compra);
    const movimiento = await crearMovimiento(db, movData, user);

    const fecha = compra.date ? new Date(compra.date) : new Date();

    await setDoc(doc(db, 'fin_cxp', compra.id), {
      movimientoId: movimiento.id,
      tercero: {
        id: compra.thirdPartyId || '',
        nombre: compra.proveedorNombre || compra.thirdPartyName || 'SIN PROVEEDOR',
        ruc: compra.proveedorRuc || compra.thirdPartyRuc || '9999999999999',
      },
      factura: {
        tipo: compra.documentType || 'factura',
        numero: compra.documentNumber || '',
        claveAcceso: compra.claveAcceso || null,
        fecha: fecha,
        fechaVencimiento: compra.fechaVencimiento ? new Date(compra.fechaVencimiento) : null,
        montoTotal: Number(compra.total) || 0,
        baseImponible: Number(compra.baseImponible) || Number(compra.subtotal) || 0,
        iva: Number(compra.ivaValor) || 0,
        retencionFuente: Number(compra.retencionFuente) || 0,
        retencionIva: Number(compra.retencionIva) || 0,
      },
      abonos: compra.paymentStatus === 'pagado' ? [{
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        fecha: fecha.toISOString(),
        monto: Number(compra.total) || 0,
        metodoPago: mapearMetodoPago(compra.paymentMethod),
        referencia: compra.transactionRef || '',
        movimientoId: movimiento.id,
      }] : [],
      saldoPendiente: compra.paymentStatus === 'pagado' ? 0 : (Number(compra.total) || 0),
      estado: compra.paymentStatus === 'pagado' ? 'pagado' : 'pendiente',
      notas: compra.notas || '',
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });

    registrarAuditoria(db, {
      coleccion: 'fin_cxp',
      documentoId: compra.id,
      accion: 'crear',
      usuario: user.uid,
      usuarioEmail: user.email,
      cambios: { movimientoId: movimiento.id },
      modulo: 'compras',
    });

    return { movimientoId: movimiento.id, cxpId: compra.id };
  } catch (e) {
    console.error('[integracionFinanzas] Error sincronizando compra:', e);
  }
}
