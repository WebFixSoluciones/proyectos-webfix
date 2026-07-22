import { collection, getDocs, query, orderBy, where, limit as fLimit } from 'firebase/firestore';

export async function getFlujoCaja(db, filtros = {}) {
  const q = query(collection(db, 'fin_movimientos'), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filtros.tipo && filtros.tipo !== 'all') items = items.filter(i => i.tipo === filtros.tipo);
  if (filtros.estado && filtros.estado !== 'all') items = items.filter(i => i.estado === filtros.estado);
  if (filtros.fechaDesde) items = items.filter(i => { const f = i.fecha?.toDate?.() || new Date(i.fecha); return f >= new Date(filtros.fechaDesde); });
  if (filtros.fechaHasta) items = items.filter(i => { const f = i.fecha?.toDate?.() || new Date(i.fecha); return f <= new Date(filtros.fechaHasta + 'T23:59:59'); });

  const activos = items.filter(i => i.estado !== 'anulado');
  const ingresos = activos.filter(i => i.tipo === 'ingreso').reduce((s, i) => s + (Number(i.monto) || 0), 0);
  const egresos = activos.filter(i => i.tipo === 'egreso').reduce((s, i) => s + (Number(i.monto) || 0), 0);

  const mensual = {};
  activos.forEach(i => {
    const f = i.fecha?.toDate?.() || new Date(i.fecha);
    const key = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    if (!mensual[key]) mensual[key] = { mes: key, ingresos: 0, egresos: 0, saldo: 0 };
    if (i.tipo === 'ingreso') mensual[key].ingresos += Number(i.monto) || 0;
    else mensual[key].egresos += Number(i.monto) || 0;
  });
  Object.values(mensual).forEach(m => { m.saldo = m.ingresos - m.egresos; });
  const serie = Object.values(mensual).sort((a, b) => a.mes.localeCompare(b.mes));

  return { totalIngresos: ingresos, totalEgresos: egresos, saldoNeto: ingresos - egresos, conteo: activos.length, serie };
}

export async function getAgingConsolidado(db, tipo = 'cxc', filtros = {}) {
  const col = tipo === 'cxp' ? 'fin_cxp' : 'fin_cxc';
  const q = query(collection(db, col), orderBy('factura.fecha', 'desc'));
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filtros.estado && filtros.estado !== 'all') items = items.filter(i => i.estado === filtros.estado);
  if (filtros.fechaDesde) items = items.filter(i => new Date(i.factura?.fecha?.toDate?.() || i.factura?.fecha) >= new Date(filtros.fechaDesde));
  if (filtros.fechaHasta) items = items.filter(i => new Date(i.factura?.fecha?.toDate?.() || i.factura?.fecha) <= new Date(filtros.fechaHasta + 'T23:59:59'));

  const ahora = Date.now();
  const aging = { '0-30': { count: 0, total: 0, items: [] }, '31-60': { count: 0, total: 0, items: [] }, '61-90': { count: 0, total: 0, items: [] }, '+90': { count: 0, total: 0, items: [] } };
  const activos = items.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado');

  activos.forEach(i => {
    const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento || i.factura?.fecha);
    const dias = Math.floor((ahora - fv.getTime()) / 86400000);
    const bucket = dias <= 30 ? '0-30' : dias <= 60 ? '31-60' : dias <= 90 ? '61-90' : '+90';
    aging[bucket].count++;
    aging[bucket].total += Number(i.saldoPendiente) || 0;
    aging[bucket].items.push({
      id: i.id,
      tercero: i.tercero?.nombre || '-',
      ruc: i.tercero?.ruc || '-',
      documento: `${i.factura?.tipo || ''} ${i.factura?.numero || ''}`.trim(),
      fecha: i.factura?.fecha?.toDate?.() || new Date(i.factura?.fecha),
      vencimiento: fv,
      monto: Number(i.factura?.montoTotal) || 0,
      saldo: Number(i.saldoPendiente) || 0,
      dias,
      estado: i.estado,
    });
  });

  const totalPendiente = activos.reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0);
  return { aging, totalPendiente, totalDocumentos: activos.length, tipo };
}

export async function getReporteCartera(db, filtros = {}) {
  const q = query(collection(db, 'fin_cxc'), orderBy('factura.fecha', 'desc'));
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filtros.estado && filtros.estado !== 'all') items = items.filter(i => i.estado === filtros.estado);
  if (filtros.search) {
    const s = filtros.search.toLowerCase();
    items = items.filter(i => i.tercero?.nombre?.toLowerCase().includes(s) || i.tercero?.ruc?.includes(s));
  }
  if (filtros.fechaDesde) items = items.filter(i => new Date(i.factura?.fecha?.toDate?.() || i.factura?.fecha) >= new Date(filtros.fechaDesde));
  if (filtros.fechaHasta) items = items.filter(i => new Date(i.factura?.fecha?.toDate?.() || i.factura?.fecha) <= new Date(filtros.fechaHasta + 'T23:59:59'));

  const ahora = Date.now();
  const data = items.filter(i => i.estado !== 'anulado').map(i => {
    const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento);
    const dias = Math.floor((ahora - fv.getTime()) / 86400000);
    const totalAbonado = (i.abonos || []).reduce((s, a) => s + Number(a.monto), 0);
    return {
      id: i.id,
      cliente: i.tercero?.nombre || '-',
      ruc: i.tercero?.ruc || '-',
      documento: `${i.factura?.tipo || ''} ${i.factura?.numero || ''}`.trim(),
      fechaEmision: i.factura?.fecha?.toDate?.() || new Date(i.factura?.fecha),
      fechaVencimiento: fv,
      montoTotal: Number(i.factura?.montoTotal) || 0,
      abonado: totalAbonado,
      saldo: Number(i.saldoPendiente) || 0,
      diasVencido: dias,
      estado: i.estado,
    };
  });

  const totalCartera = data.reduce((s, i) => s + i.saldo, 0);
  const totalVencido = data.filter(i => i.diasVencido > 0 && i.estado !== 'pagado').reduce((s, i) => s + i.saldo, 0);
  const totalCobrado = data.reduce((s, i) => s + i.abonado, 0);

  const porCliente = {};
  data.filter(i => i.estado !== 'pagado').forEach(i => {
    if (!porCliente[i.cliente]) porCliente[i.cliente] = { cliente: i.cliente, ruc: i.ruc, facturas: 0, saldo: 0, vencido: 0 };
    porCliente[i.cliente].facturas++;
    porCliente[i.cliente].saldo += i.saldo;
    if (i.diasVencido > 0) porCliente[i.cliente].vencido += i.saldo;
  });

  return { items: data, totalCartera, totalVencido, totalCobrado, porCliente: Object.values(porCliente).sort((a, b) => b.saldo - a.saldo), conteo: data.length };
}

export async function getReporteDeuda(db, filtros = {}) {
  const [prestamoSnap, tarjetaSnap, consumoSnap] = await Promise.all([
    getDocs(query(collection(db, 'fin_prestamos'), orderBy('createdAt', 'desc'))),
    getDocs(query(collection(db, 'fin_tarjetas'), orderBy('emisor', 'asc'))),
    getDocs(query(collection(db, 'fin_consumos_tarjeta'), orderBy('fecha', 'desc'))),
  ]);

  let prestamos = prestamoSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  let tarjetas = tarjetaSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  let consumos = consumoSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filtros.fechaDesde) {
    const fd = new Date(filtros.fechaDesde);
    prestamos = prestamos.filter(p => { const f = p.fechaDesembolso?.toDate?.() || new Date(p.fechaDesembolso); return f >= fd; });
    consumos = consumos.filter(c => { const f = c.fecha?.toDate?.() || new Date(c.fecha); return f >= fd; });
  }
  if (filtros.fechaHasta) {
    const fh = new Date(filtros.fechaHasta + 'T23:59:59');
    prestamos = prestamos.filter(p => { const f = p.fechaDesembolso?.toDate?.() || new Date(p.fechaDesembolso); return f <= fh; });
    consumos = consumos.filter(c => { const f = c.fecha?.toDate?.() || new Date(c.fecha); return f <= fh; });
  }

  const hoy = new Date();
  const deudaPrestamos = prestamos.filter(p => p.estado !== 'cancelado').map(p => {
    const cuotasVencidas = (p.cuotas || []).filter(c => {
      if (c.estado === 'pagado') return false;
      const fv = c.fechaVencimiento?.toDate?.() || new Date(c.fechaVencimiento);
      return fv < hoy;
    }).length;
    const cuotasPendientes = (p.cuotas || []).filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length;
    const totalPagado = (p.cuotas || []).reduce((s, c) => s + Number(c.pagadaCapital || 0) + Number(c.pagadaInteres || 0), 0);
    return {
      id: p.id,
      tipo: 'prestamo',
      entidad: p.entidad || '-',
      numero: p.numeroContrato || '-',
      montoOriginal: Number(p.montoDesembolsado) || 0,
      saldoPendiente: Number(p.saldoPendiente) || 0,
      totalPagado,
      cuotasPendientes,
      cuotasVencidas,
      estado: p.estado,
    };
  });

  const tarjetaMap = {};
  tarjetas.forEach(t => { tarjetaMap[t.id] = t; });
  const saldoPorTarjeta = {};
  consumos.forEach(c => {
    if (!saldoPorTarjeta[c.tarjetaId]) saldoPorTarjeta[c.tarjetaId] = { consumos: 0, pagos: 0 };
    if (c.tipo === 'consumo') saldoPorTarjeta[c.tarjetaId].consumos += Number(c.monto) || 0;
    if (c.tipo === 'pago') saldoPorTarjeta[c.tarjetaId].pagos += Number(c.monto) || 0;
  });

  const deudaTarjetas = tarjetas.filter(t => t.estado !== 'inactiva').map(t => {
    const saldos = saldoPorTarjeta[t.id] || { consumos: 0, pagos: 0 };
    const saldo = Math.max(0, saldos.consumos - saldos.pagos);
    const cuotasPendientes = consumos.filter(c => c.tarjetaId === t.id && c.tipo === 'consumo' && c.cuotas > 1 && (c.cuotasPagadas || 0) < c.cuotas).length;
    return {
      id: t.id,
      tipo: 'tarjeta',
      entidad: t.emisor || '-',
      numero: t.numero || '****',
      montoOriginal: Number(t.cupoTotal) || 0,
      saldoPendiente: saldo,
      totalPagado: saldos.pagos,
      cuotasPendientes,
      cuotasVencidas: 0,
      estado: t.estado,
    };
  });

  const deudaTotal = [...deudaPrestamos, ...deudaTarjetas].reduce((s, d) => s + d.saldoPendiente, 0);
  const totalPrestamos = deudaPrestamos.reduce((s, d) => s + d.saldoPendiente, 0);
  const totalTarjetas = deudaTarjetas.reduce((s, d) => s + d.saldoPendiente, 0);
  const totalCuotasVencidas = deudaPrestamos.reduce((s, d) => s + d.cuotasVencidas, 0);

  return { prestamos: deudaPrestamos, tarjetas: deudaTarjetas, deudaTotal, totalPrestamos, totalTarjetas, totalCuotasVencidas };
}

export async function getReporteImpuestos(db, filtros = {}) {
  const q = query(collection(db, 'fin_movimientos'), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filtros.fechaDesde) items = items.filter(i => { const f = i.fecha?.toDate?.() || new Date(i.fecha); return f >= new Date(filtros.fechaDesde); });
  if (filtros.fechaHasta) items = items.filter(i => { const f = i.fecha?.toDate?.() || new Date(i.fecha); return f <= new Date(filtros.fechaHasta + 'T23:59:59'); });

  const activos = items.filter(i => i.estado !== 'anulado');
  let baseImponibleVentas = 0, ivaVentas = 0, retFuenteVentas = 0, retIvaVentas = 0;
  let baseImponibleCompras = 0, ivaCompras = 0, retFuenteCompras = 0, retIvaCompras = 0;

  activos.forEach(m => {
    (m.partidas || []).forEach(p => {
      if (m.tipo === 'ingreso') {
        baseImponibleVentas += Number(p.baseImponible) || 0;
        ivaVentas += Number(p.iva) || 0;
        retFuenteVentas += Number(p.retencionFuente) || 0;
        retIvaVentas += Number(p.retencionIva) || 0;
      } else {
        baseImponibleCompras += Number(p.baseImponible) || 0;
        ivaCompras += Number(p.iva) || 0;
        retFuenteCompras += Number(p.retencionFuente) || 0;
        retIvaCompras += Number(p.retencionIva) || 0;
      }
    });
  });

  const ivaNeto = ivaVentas - ivaCompras;
  const retencionesNetas = (retFuenteVentas + retIvaVentas) - (retFuenteCompras + retIvaCompras);

  const mensual = {};
  activos.forEach(m => {
    const f = m.fecha?.toDate?.() || new Date(m.fecha);
    const key = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    if (!mensual[key]) mensual[key] = { mes: key, baseVentas: 0, ivaVentas: 0, baseCompras: 0, ivaCompras: 0, retVentas: 0, retCompras: 0 };
    (m.partidas || []).forEach(p => {
      if (m.tipo === 'ingreso') {
        mensual[key].baseVentas += Number(p.baseImponible) || 0;
        mensual[key].ivaVentas += Number(p.iva) || 0;
        mensual[key].retVentas += (Number(p.retencionFuente) || 0) + (Number(p.retencionIva) || 0);
      } else {
        mensual[key].baseCompras += Number(p.baseImponible) || 0;
        mensual[key].ivaCompras += Number(p.iva) || 0;
        mensual[key].retCompras += (Number(p.retencionFuente) || 0) + (Number(p.retencionIva) || 0);
      }
    });
  });

  return {
    baseImponibleVentas, ivaVentas, retFuenteVentas, retIvaVentas,
    baseImponibleCompras, ivaCompras, retFuenteCompras, retIvaCompras,
    ivaNeto, retencionesNetas,
    serieMensual: Object.values(mensual).sort((a, b) => a.mes.localeCompare(b.mes)),
  };
}

export async function getReporteAuditoria(db, filtros = {}) {
  const q = query(collection(db, 'fin_auditoria'), orderBy('fecha', 'desc'), fLimit(500));
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filtros.accion && filtros.accion !== 'all') items = items.filter(i => i.accion === filtros.accion);
  if (filtros.modulo && filtros.modulo !== 'all') items = items.filter(i => i.modulo === filtros.modulo);
  if (filtros.coleccion && filtros.coleccion !== 'all') items = items.filter(i => i.coleccion === filtros.coleccion);
  if (filtros.usuario) items = items.filter(i => i.usuarioEmail?.toLowerCase().includes(filtros.usuario.toLowerCase()));
  if (filtros.fechaDesde) items = items.filter(i => { const f = i.fecha?.toDate?.() || new Date(i.fecha); return f >= new Date(filtros.fechaDesde); });
  if (filtros.fechaHasta) items = items.filter(i => { const f = i.fecha?.toDate?.() || new Date(i.fecha); return f <= new Date(filtros.fechaHasta + 'T23:59:59'); });

  const porAccion = {};
  items.forEach(i => {
    const a = i.accion || 'otro';
    porAccion[a] = (porAccion[a] || 0) + 1;
  });

  const porModulo = {};
  items.forEach(i => {
    const m = i.modulo || 'general';
    porModulo[m] = (porModulo[m] || 0) + 1;
  });

  return {
    items: items.map(i => ({
      id: i.id,
      fecha: i.fecha?.toDate?.() || new Date(i.fecha),
      accion: i.accion,
      usuario: i.usuarioEmail || i.usuario || '-',
      coleccion: i.coleccion || '-',
      documentoId: i.documentoId || '-',
      modulo: i.modulo || '-',
      cambios: i.cambios,
    })),
    porAccion,
    porModulo,
    totalRegistros: items.length,
  };
}

export function exportarCSV(headers, rows, nombreArchivo) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportarPDF(titulo, contenido, nombreArchivo) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${titulo}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a;font-size:12px}
    h1{font-size:18px;margin-bottom:4px}
    .subtitle{color:#666;font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#f5f5f5;padding:6px 8px;text-align:left;border-bottom:2px solid #ddd;font-size:11px}
    td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}
    .kpi{display:inline-block;margin-right:16px;padding:8px 12px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px}
    .kpi-label{font-size:10px;color:#888}.kpi-value{font-size:16px;font-weight:bold}
    @media print{body{padding:12px}}
  </style></head><body>`);
  w.document.write(`<h1>${titulo}</h1><div class="subtitle">Generado: ${new Date().toLocaleString('es-EC')}</div>`);
  w.document.write(contenido);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(() => w.print(), 400);
}
