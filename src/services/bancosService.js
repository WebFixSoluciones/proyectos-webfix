import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { registrarAuditoria } from './auditService';

const COLLECTION_BANCOS = 'fin_bancos';
const COLLECTION_MOV_BANCARIOS = 'fin_movimientos_bancarios';

export async function getCuentas(db, filtros = {}) {
  const constraints = [orderBy('nombre', 'asc')];
  if (filtros.tipo && filtros.tipo !== 'all') constraints.push(where('tipo', '==', filtros.tipo));
  if (filtros.estado && filtros.estado !== 'all') constraints.push(where('estado', '==', filtros.estado));
  const q = query(collection(db, COLLECTION_BANCOS), ...constraints);
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  for (const cuenta of items) {
    cuenta.saldoActual = await calcularSaldoCuenta(db, cuenta.id, cuenta.saldoInicial);
  }
  return items;
}

export async function getCuentaById(db, id) {
  const docRef = doc(db, COLLECTION_BANCOS, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Cuenta no encontrada');
  const data = { id: snap.id, ...snap.data() };
  data.saldoActual = await calcularSaldoCuenta(db, data.id, data.saldoInicial);
  return data;
}

export async function crearCuenta(db, data, usuario) {
  const payload = {
    nombre: data.nombre,
    tipo: data.tipo || 'banco',
    saldoInicial: Number(data.saldoInicial) || 0,
    moneda: data.moneda || 'USD',
    fechaCreacion: Timestamp.now(),
    estado: data.estado || 'activo',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTION_BANCOS), payload);
  registrarAuditoria(db, { coleccion: COLLECTION_BANCOS, documentoId: ref.id, accion: 'crear', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { nuevo: payload }, modulo: 'finanzas' });
  return ref.id;
}

export async function actualizarCuenta(db, id, data, usuario) {
  const payload = {
    nombre: data.nombre,
    tipo: data.tipo,
    saldoInicial: Number(data.saldoInicial),
    moneda: data.moneda || 'USD',
    estado: data.estado,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, COLLECTION_BANCOS, id), payload);
  registrarAuditoria(db, { coleccion: COLLECTION_BANCOS, documentoId: id, accion: 'actualizar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { nuevo: payload }, modulo: 'finanzas' });
}

export async function eliminarCuenta(db, id, usuario) {
  await deleteDoc(doc(db, COLLECTION_BANCOS, id));
  registrarAuditoria(db, { coleccion: COLLECTION_BANCOS, documentoId: id, accion: 'eliminar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { antes: { id } }, modulo: 'finanzas' });
}

export async function getMovimientosBancarios(db, cuentaId, filtros = {}) {
  const constraints = [where('cuentaId', '==', cuentaId), orderBy('fecha', 'desc')];
  const q = query(collection(db, COLLECTION_MOV_BANCARIOS), ...constraints);
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (filtros.tipo && filtros.tipo !== 'all') items = items.filter(i => i.tipo === filtros.tipo);
  if (filtros.fechaDesde) items = items.filter(i => { const fd = i.fecha?.toDate?.() || new Date(i.fecha); return fd >= new Date(filtros.fechaDesde); });
  if (filtros.fechaHasta) items = items.filter(i => { const fd = i.fecha?.toDate?.() || new Date(i.fecha); return fd <= new Date(filtros.fechaHasta + 'T23:59:59'); });
  if (filtros.conciliado && filtros.conciliado !== 'all') items = items.filter(i => i.conciliado === (filtros.conciliado === 'true'));
  return items;
}

export async function registrarMovimientoBancario(db, data, usuario) {
  const payload = {
    cuentaId: data.cuentaId,
    tipo: data.tipo,
    monto: Number(data.monto),
    descripcion: data.descripcion || '',
    fecha: data.fecha ? Timestamp.fromDate(new Date(data.fecha)) : Timestamp.now(),
    referencia: data.referencia || '',
    conciliado: false,
    movimientoId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTION_MOV_BANCARIOS), payload);
  registrarAuditoria(db, { coleccion: COLLECTION_MOV_BANCARIOS, documentoId: ref.id, accion: 'crear', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { nuevo: payload }, modulo: 'finanzas' });
  return ref.id;
}

export async function eliminarMovimientoBancario(db, id, usuario) {
  await deleteDoc(doc(db, COLLECTION_MOV_BANCARIOS, id));
  registrarAuditoria(db, { coleccion: COLLECTION_MOV_BANCARIOS, documentoId: id, accion: 'eliminar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { antes: { id } }, modulo: 'finanzas' });
}

export async function conciliarMovimiento(db, movBancarioId, movimientoId, usuario) {
  const ref = doc(db, COLLECTION_MOV_BANCARIOS, movBancarioId);
  await updateDoc(ref, { conciliado: true, movimientoId, updatedAt: serverTimestamp() });
  registrarAuditoria(db, { coleccion: COLLECTION_MOV_BANCARIOS, documentoId: movBancarioId, accion: 'conciliar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { movimientoId }, modulo: 'finanzas' });
}

export async function desconciliarMovimiento(db, movBancarioId, usuario) {
  const ref = doc(db, COLLECTION_MOV_BANCARIOS, movBancarioId);
  await updateDoc(ref, { conciliado: false, movimientoId: null, updatedAt: serverTimestamp() });
  registrarAuditoria(db, { coleccion: COLLECTION_MOV_BANCARIOS, documentoId: movBancarioId, accion: 'desconciliar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: {}, modulo: 'finanzas' });
}

async function calcularSaldoCuenta(db, cuentaId, saldoInicial) {
  const q = query(collection(db, COLLECTION_MOV_BANCARIOS), where('cuentaId', '==', cuentaId));
  const snap = await getDocs(q);
  const movs = snap.docs.map(d => d.data());
  return movs.reduce((saldo, m) => {
    const monto = Number(m.monto) || 0;
    return m.tipo === 'credito' ? saldo + monto : saldo - monto;
  }, Number(saldoInicial) || 0);
}

export function getResumenBancos(cuentas) {
  const activas = cuentas.filter(c => c.estado === 'activo');
  const totalBancos = activas.filter(c => c.tipo === 'banco' || c.tipo === 'ahorros' || c.tipo === 'inversion').reduce((s, c) => s + (c.saldoActual || 0), 0);
  const totalCaja = activas.filter(c => c.tipo === 'caja').reduce((s, c) => s + (c.saldoActual || 0), 0);
  const totalGeneral = activas.reduce((s, c) => s + (c.saldoActual || 0), 0);
  return { totalBancos, totalCaja, totalGeneral, cuentaActivas: activas.length };
}
