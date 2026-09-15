import { postFinancialPayment } from './financialTransactions.js';
import { getAppId } from '../firebase.js';
import { collection, getDocs } from './financeStore.js';

const COLLECTION = 'fin_cxp';

export async function getCxP(db, filtros = {}) {
  const snap = await getDocs(collection(db, COLLECTION));
  const date = value => new Date(value?.toDate?.() || value || 0);
  return snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(i => {
    if (filtros.estado && filtros.estado !== 'all' && i.estado !== filtros.estado) return false;
    const search = (filtros.search || '').toLowerCase();
    if (search && ![i.tercero?.nombre, i.tercero?.ruc, i.factura?.numero].some(v => String(v || '').toLowerCase().includes(search))) return false;
    if (filtros.fechaDesde && date(i.factura?.fecha) < new Date(filtros.fechaDesde)) return false;
    if (filtros.fechaHasta && date(i.factura?.fecha) > new Date(filtros.fechaHasta + 'T23:59:59')) return false;
    return true;
  }).map(i => ({ ...i, diasVencido: i.factura?.fechaVencimiento ? Math.max(0, Math.floor((Date.now() - date(i.factura.fechaVencimiento).getTime()) / 86400000)) : 0 })).sort((a,b) => date(b.factura?.fecha) - date(a.factura?.fecha));
}

export async function registrarPago(db, cxpId, pago, usuario) {
  return postFinancialPayment(db, { collection: 'fin_cxp', id: cxpId }, pago, usuario, { tenantId: getAppId() });
}

export function getAging(items) {
  const ahora = Date.now();
  const aging = { '0-30': { count: 0, total: 0 }, '31-60': { count: 0, total: 0 }, '61-90': { count: 0, total: 0 }, '+90': { count: 0, total: 0 } };
  items.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado').forEach(i => {
    const d = (i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento || Date.now()));
    const dias = Math.floor((ahora - d.getTime()) / 86400000);
    const bucket = dias <= 30 ? '0-30' : dias <= 60 ? '31-60' : dias <= 90 ? '61-90' : '+90';
    aging[bucket].count++; aging[bucket].total += Number(i.saldoPendiente) || 0;
  });
  return aging;
}

export function getResumenCxP(items) {
  const activos = items.filter(i => i.estado !== 'anulado');
  return {
    totalObligaciones: activos.reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0),
    totalVencido: activos.filter(i => i.diasVencido > 0).reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0),
    totalPagado: activos.reduce((s, i) => s + ((i.abonos || []).reduce((a, b) => a + Number(b.monto), 0)), 0),
    totalFacturado: activos.reduce((s, i) => s + (Number(i.factura?.montoTotal) || 0), 0),
    totalRetencionFuente: activos.reduce((s, i) => s + (Number(i.factura?.retencionFuente) || 0), 0),
    totalRetencionIva: activos.reduce((s, i) => s + (Number(i.factura?.retencionIva) || 0), 0),
    conteo: activos.length,
  };
}