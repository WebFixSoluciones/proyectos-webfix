import { collection, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { registrarAuditoria } from './auditService';

const COLLECTION = 'fin_cxc';

export async function getCxC(db, filtros = {}) {
  try {
    const constraints = [orderBy('factura.fecha', 'desc')];
    if (filtros.estado && filtros.estado !== 'all') constraints.push(where('estado', '==', filtros.estado));
    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (filtros.search) {
      const s = filtros.search.toLowerCase();
      items = items.filter(i => i.tercero?.nombre?.toLowerCase().includes(s) || i.tercero?.ruc?.includes(s) || i.factura?.numero?.toLowerCase().includes(s));
    }
    if (filtros.fechaDesde) items = items.filter(i => new Date(i.factura?.fecha?.toDate?.() || i.factura?.fecha) >= new Date(filtros.fechaDesde));
    if (filtros.fechaHasta) items = items.filter(i => new Date(i.factura?.fecha?.toDate?.() || i.factura?.fecha) <= new Date(filtros.fechaHasta + 'T23:59:59'));

    items.forEach(i => { i.diasVencido = i.factura?.fechaVencimiento ? Math.floor((Date.now() - new Date(i.factura.fechaVencimiento.toDate?.() || i.factura.fechaVencimiento).getTime()) / 86400000) : 0; });
    return items;
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, COLLECTION));
      const snap = await getDocs(q);
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => { const fa = a.factura?.fecha?.toDate?.() || new Date(a.factura?.fecha || 0); const fb = b.factura?.fecha?.toDate?.() || new Date(b.factura?.fecha || 0); return fb - fa; });
      return items;
    }
    throw e;
  }
}

export async function registrarCobro(db, cxcId, abono, usuario) {
  const docRef = doc(db, COLLECTION, cxcId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Registro CxC no encontrado');
  const cxc = snap.data();

  const nuevoAbono = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), fecha: abono.fecha || new Date().toISOString(), monto: Number(abono.monto), metodoPago: abono.metodoPago || 'efectivo', referencia: abono.referencia || '' };
  const abonos = [...(cxc.abonos || []), nuevoAbono];
  const totalAbonado = abonos.reduce((s, p) => s + Number(p.monto), 0);
  const nuevoSaldo = Math.max(0, Number(cxc.factura?.montoTotal || cxc.saldoPendiente) - totalAbonado);
  const nuevoEstado = nuevoSaldo <= 0.01 ? 'pagado' : 'parcial';

  await updateDoc(docRef, { abonos, saldoPendiente: nuevoSaldo, estado: nuevoEstado, actualizadoEn: serverTimestamp() });
  registrarAuditoria(db, { coleccion: COLLECTION, documentoId: cxcId, accion: 'abonar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { abono: nuevoAbono }, modulo: 'finanzas' });
  return { ...cxc, abonos, saldoPendiente: nuevoSaldo, estado: nuevoEstado };
}

export function getAging(items) {
  const ahora = Date.now();
  const aging = { '0-30': { count: 0, total: 0 }, '31-60': { count: 0, total: 0 }, '61-90': { count: 0, total: 0 }, '+90': { count: 0, total: 0 } };
  items.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado').forEach(i => {
    const d = (i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento));
    const dias = Math.floor((ahora - d.getTime()) / 86400000);
    const bucket = dias <= 30 ? '0-30' : dias <= 60 ? '31-60' : dias <= 90 ? '61-90' : '+90';
    aging[bucket].count++; aging[bucket].total += Number(i.saldoPendiente) || 0;
  });
  return aging;
}

export function getResumenCxC(items) {
  const activos = items.filter(i => i.estado !== 'anulado');
  return {
    totalCartera: activos.reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0),
    totalVencido: activos.filter(i => i.diasVencido > 0).reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0),
    totalCobrado: activos.reduce((s, i) => s + ((i.abonos || []).reduce((a, b) => a + Number(b.monto), 0)), 0),
    totalFacturado: activos.reduce((s, i) => s + (Number(i.factura?.montoTotal) || 0), 0),
    conteo: activos.length,
  };
}
