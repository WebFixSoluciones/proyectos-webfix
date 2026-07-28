import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { registrarAuditoria } from './auditService';

const COLLECTION_TARJETAS = 'fin_tarjetas';
const COLLECTION_CONSUMOS = 'fin_consumos_tarjeta';

export async function getTarjetas(db) {
  let tarjetas;
  try {
    const q = query(collection(db, COLLECTION_TARJETAS), orderBy('emisor', 'asc'));
    const snap = await getDocs(q);
    tarjetas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, COLLECTION_TARJETAS));
      const snap = await getDocs(q);
      tarjetas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      tarjetas.sort((a, b) => (a.emisor || '').localeCompare(b.emisor || ''));
    } else {
      throw e;
    }
  }
  for (const t of tarjetas) {
    const { saldoUtilizado, cuotasPendientes } = await calcularEstadoTarjeta(db, t.id);
    t.saldoUtilizado = saldoUtilizado;
    t.cupoDisponible = Math.max(0, Number(t.cupoTotal) - saldoUtilizado);
    t.cuotasPendientes = cuotasPendientes;
  }
  return tarjetas;
}

export async function getTarjetaById(db, id) {
  const docRef = doc(db, COLLECTION_TARJETAS, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Tarjeta no encontrada');
  const data = { id: snap.id, ...snap.data() };
  const { saldoUtilizado, cuotasPendientes } = await calcularEstadoTarjeta(db, data.id);
  data.saldoUtilizado = saldoUtilizado;
  data.cupoDisponible = Math.max(0, Number(data.cupoTotal) - saldoUtilizado);
  data.cuotasPendientes = cuotasPendientes;
  return data;
}

export async function crearTarjeta(db, data, usuario) {
  const payload = {
    emisor: data.emisor,
    numero: data.numero,
    cupoTotal: Number(data.cupoTotal) || 0,
    cupoDisponible: Number(data.cupoTotal) || 0,
    fechaCorte: data.fechaCorte,
    fechaPago: data.fechaPago,
    tasaInteres: Number(data.tasaInteres) || 0,
    estado: data.estado || 'activa',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTION_TARJETAS), payload);
  registrarAuditoria(db, { coleccion: COLLECTION_TARJETAS, documentoId: ref.id, accion: 'crear', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { nuevo: payload }, modulo: 'finanzas' });
  return ref.id;
}

export async function actualizarTarjeta(db, id, data, usuario) {
  const payload = {
    emisor: data.emisor,
    numero: data.numero,
    cupoTotal: Number(data.cupoTotal),
    fechaCorte: data.fechaCorte,
    fechaPago: data.fechaPago,
    tasaInteres: Number(data.tasaInteres),
    estado: data.estado,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, COLLECTION_TARJETAS, id), payload);
  registrarAuditoria(db, { coleccion: COLLECTION_TARJETAS, documentoId: id, accion: 'actualizar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { nuevo: payload }, modulo: 'finanzas' });
}

export async function eliminarTarjeta(db, id, usuario) {
  await deleteDoc(doc(db, COLLECTION_TARJETAS, id));
  registrarAuditoria(db, { coleccion: COLLECTION_TARJETAS, documentoId: id, accion: 'eliminar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { antes: { id } }, modulo: 'finanzas' });
}

export async function getConsumosTarjeta(db, tarjetaId, filtros = {}) {
  let items;
  try {
    const constraints = [where('tarjetaId', '==', tarjetaId), orderBy('fecha', 'desc')];
    const q = query(collection(db, COLLECTION_CONSUMOS), ...constraints);
    const snap = await getDocs(q);
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, COLLECTION_CONSUMOS));
      const snap = await getDocs(q);
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => { const fa = a.fecha?.toDate?.() || new Date(a.fecha || 0); const fb = b.fecha?.toDate?.() || new Date(b.fecha || 0); return fb - fa; });
    } else {
      throw e;
    }
  }

  if (filtros.tipo && filtros.tipo !== 'all') items = items.filter(i => i.tipo === filtros.tipo);
  if (filtros.fechaDesde) items = items.filter(i => { const fd = i.fecha?.toDate?.() || new Date(i.fecha); return fd >= new Date(filtros.fechaDesde); });
  if (filtros.fechaHasta) items = items.filter(i => { const fd = i.fecha?.toDate?.() || new Date(i.fecha); return fd <= new Date(filtros.fechaHasta + 'T23:59:59'); });

  return items;
}

export async function getAllConsumosTarjeta(db, filtros = {}) {
  let items;
  try {
    const constraints = [orderBy('fecha', 'desc')];
    const q = query(collection(db, COLLECTION_CONSUMOS), ...constraints);
    const snap = await getDocs(q);
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, COLLECTION_CONSUMOS));
      const snap = await getDocs(q);
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => { const fa = a.fecha?.toDate?.() || new Date(a.fecha || 0); const fb = b.fecha?.toDate?.() || new Date(b.fecha || 0); return fb - fa; });
    } else {
      throw e;
    }
  }

  if (filtros.tarjetaId && filtros.tarjetaId !== 'all') items = items.filter(i => i.tarjetaId === filtros.tarjetaId);
  if (filtros.tipo && filtros.tipo !== 'all') items = items.filter(i => i.tipo === filtros.tipo);
  if (filtros.fechaDesde) items = items.filter(i => { const fd = i.fecha?.toDate?.() || new Date(i.fecha); return fd >= new Date(filtros.fechaDesde); });
  if (filtros.fechaHasta) items = items.filter(i => { const fd = i.fecha?.toDate?.() || new Date(i.fecha); return fd <= new Date(filtros.fechaHasta + 'T23:59:59'); });

  return items;
}

export async function registrarConsumo(db, data, usuario) {
  const payload = {
    tarjetaId: data.tarjetaId,
    tipo: 'consumo',
    monto: Number(data.monto),
    descripcion: data.descripcion || '',
    categoria: data.categoria || 'otro',
    fecha: data.fecha ? Timestamp.fromDate(new Date(data.fecha)) : Timestamp.now(),
    cuotas: Number(data.cuotas) || 1,
    cuotasPagadas: 0,
    referencia: data.referencia || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTION_CONSUMOS), payload);
  registrarAuditoria(db, { coleccion: COLLECTION_CONSUMOS, documentoId: ref.id, accion: 'crear_consumo', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { nuevo: payload }, modulo: 'finanzas' });

  const tarjeta = await getTarjetaById(db, data.tarjetaId);
  if (tarjeta.cupoDisponible < Number(data.monto)) {
    registrarAuditoria(db, { coleccion: COLLECTION_TARJETAS, documentoId: data.tarjetaId, accion: 'alerta_cupo_insuficiente', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { alerta: 'Cupo excedido en consumo', monto: Number(data.monto), cupoDisponible: tarjeta.cupoDisponible }, modulo: 'finanzas' });
  }
  return ref.id;
}

export async function registrarPagoTarjeta(db, data, usuario) {
  const payload = {
    tarjetaId: data.tarjetaId,
    tipo: 'pago',
    monto: Number(data.monto),
    descripcion: data.descripcion || '',
    categoria: data.categoria || 'otro',
    fecha: data.fecha ? Timestamp.fromDate(new Date(data.fecha)) : Timestamp.now(),
    cuotas: 1,
    cuotasPagadas: 0,
    referencia: data.referencia || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTION_CONSUMOS), payload);
  registrarAuditoria(db, { coleccion: COLLECTION_CONSUMOS, documentoId: ref.id, accion: 'crear_pago', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { nuevo: payload }, modulo: 'finanzas' });
  return ref.id;
}

export async function registrarCuotaConsumo(db, consumoId, usuario) {
  const docRef = doc(db, COLLECTION_CONSUMOS, consumoId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Consumo no encontrado');
  const consumo = snap.data();
  const nuevasCuotasPagadas = Math.min((consumo.cuotasPagadas || 0) + 1, consumo.cuotas);
  await updateDoc(docRef, { cuotasPagadas: nuevasCuotasPagadas, updatedAt: serverTimestamp() });
  registrarAuditoria(db, { coleccion: COLLECTION_CONSUMOS, documentoId: consumoId, accion: 'registrar_cuota', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { cuotasPagadas: nuevasCuotasPagadas }, modulo: 'finanzas' });
}

async function calcularEstadoTarjeta(db, tarjetaId) {
  const q = query(collection(db, COLLECTION_CONSUMOS), where('tarjetaId', '==', tarjetaId));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const totalConsumos = items.filter(i => i.tipo === 'consumo').reduce((s, i) => s + (Number(i.monto) || 0), 0);
  const totalPagos = items.filter(i => i.tipo === 'pago').reduce((s, i) => s + (Number(i.monto) || 0), 0);
  const saldoUtilizado = Math.max(0, totalConsumos - totalPagos);

  const cuotasPendientes = items.filter(i => i.tipo === 'consumo' && i.cuotas > 1 && (i.cuotasPagadas || 0) < i.cuotas);

  return { saldoUtilizado, cuotasPendientes };
}

export function getAlertasProximidad(tarjetas) {
  const hoy = new Date();
  const diaMes = hoy.getDate();
  const alertas = [];
  tarjetas.forEach(t => {
    const diasCorte = Number(t.fechaCorte) - diaMes;
    const diasPago = Number(t.fechaPago) - diaMes;
    if (diasCorte >= 0 && diasCorte <= 3) {
      alertas.push({ tarjetaId: t.id, emisor: t.emisor, numero: t.numero, tipo: 'corte', dias: diasCorte, mensaje: diasCorte === 0 ? 'Hoy es fecha de corte' : `Corte en ${diasCorte} día(s)` });
    }
    if (diasPago >= 0 && diasPago <= 5) {
      alertas.push({ tarjetaId: t.id, emisor: t.emisor, numero: t.numero, tipo: 'pago', dias: diasPago, mensaje: diasPago === 0 ? 'Hoy vence el pago' : `Pago en ${diasPago} día(s)` });
    }
  });
  return alertas;
}

export function getResumenTarjetas(tarjetas) {
  const activas = tarjetas.filter(t => t.estado !== 'inactiva');
  return {
    totalCupo: activas.reduce((s, t) => s + (Number(t.cupoTotal) || 0), 0),
    totalUtilizado: activas.reduce((s, t) => s + (Number(t.saldoUtilizado) || 0), 0),
    totalDisponible: activas.reduce((s, t) => s + (Number(t.cupoDisponible) || 0), 0),
    proximosPagos: activas.filter(t => {
      const dias = Number(t.fechaPago) - new Date().getDate();
      return dias >= 0 && dias <= 7;
    }).length,
    conteo: activas.length,
  };
}
