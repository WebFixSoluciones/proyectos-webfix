import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { registrarAuditoria } from './auditService';

const CTAS = 'fin_cuentas';
const CC = 'fin_centros_costo';
const ASIENTOS = 'fin_asientos';

const TIPOS = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto'];

function validarCuenta(data) {
  if (!data.codigo?.trim()) throw new Error('El código de cuenta es obligatorio');
  if (!data.nombre?.trim()) throw new Error('El nombre de cuenta es obligatorio');
  if (!TIPOS.includes(data.tipo)) throw new Error(`Tipo inválido. Use: ${TIPOS.join(', ')}`);
  if (!Number.isInteger(data.nivel) || data.nivel < 1 || data.nivel > 4) throw new Error('El nivel debe ser 1, 2, 3 o 4');
}

function validarCentroCosto(data) {
  if (!data.codigo?.trim()) throw new Error('El código de centro de costo es obligatorio');
  if (!data.nombre?.trim()) throw new Error('El nombre es obligatorio');
  if (Number(data.presupuestoAnual) < 0) throw new Error('El presupuesto no puede ser negativo');
}

function validarAsiento(data) {
  if (!data.descripcion?.trim()) throw new Error('La descripción es obligatoria');
  if (!Array.isArray(data.lineas) || data.lineas.length < 2) throw new Error('Un asiento requiere al menos 2 líneas');
  const totalDebe = data.lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0);
  const totalHaber = data.lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0);
  if (Math.abs(totalDebe - totalHaber) > 0.01) throw new Error('El asiento no cuadra: Débitos ≠ Créditos');
}

export async function getCuentas(db, filtros = {}) {
  let items;
  try {
    const constraints = [orderBy('codigo', 'asc')];
    if (filtros.tipo && filtros.tipo !== 'all') constraints.push(where('tipo', '==', filtros.tipo));
    if (filtros.estado && filtros.estado !== 'all') constraints.push(where('estado', '==', filtros.estado));
    const q = query(collection(db, CTAS), ...constraints);
    const snap = await getDocs(q);
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, CTAS));
      const snap = await getDocs(q);
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
    } else {
      throw e;
    }
  }
  if (filtros.search) {
    const s = filtros.search.toLowerCase();
    items = items.filter(i => i.codigo?.toLowerCase().includes(s) || i.nombre?.toLowerCase().includes(s));
  }
  return items;
}

export async function buildArbolCuentas(db) {
  const cuentas = await getCuentas(db, {});
  const map = new Map(cuentas.map(c => [c.id, { ...c, hijos: [] }]));
  const raices = [];
  map.forEach(c => {
    if (c.padreId && map.has(c.padreId)) map.get(c.padreId).hijos.push(c);
    else raices.push(c);
  });
  return raices;
}

export async function addCuenta(db, data, usuario) {
  validarCuenta(data);
  const payload = {
    codigo: data.codigo.trim(),
    nombre: data.nombre.trim(),
    tipo: data.tipo,
    nivel: Number(data.nivel),
    padreId: data.padreId || null,
    aceptaMovimientos: !!data.aceptaMovimientos,
    estado: data.estado || 'activo',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, CTAS), payload);
  registrarAuditoria(db, { coleccion: CTAS, documentoId: ref.id, accion: 'crear', usuario: usuario?.uid, usuarioEmail: usuario?.email, cambios: payload, modulo: 'finanzas' });
  return { id: ref.id, ...payload };
}

export async function updateCuenta(db, id, data, usuario) {
  validarCuenta(data);
  const payload = {
    codigo: data.codigo.trim(),
    nombre: data.nombre.trim(),
    tipo: data.tipo,
    nivel: Number(data.nivel),
    padreId: data.padreId || null,
    aceptaMovimientos: !!data.aceptaMovimientos,
    estado: data.estado || 'activo',
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, CTAS, id), payload);
  registrarAuditoria(db, { coleccion: CTAS, documentoId: id, accion: 'actualizar', usuario: usuario?.uid, usuarioEmail: usuario?.email, cambios: payload, modulo: 'finanzas' });
}

export async function deleteCuenta(db, id, usuario) {
  const hijosQ = query(collection(db, CTAS), where('padreId', '==', id));
  const hijos = await getDocs(hijosQ);
  if (!hijos.empty) throw new Error('No se puede eliminar: la cuenta tiene subcuentas');
  await deleteDoc(doc(db, CTAS, id));
  registrarAuditoria(db, { coleccion: CTAS, documentoId: id, accion: 'eliminar', usuario: usuario?.uid, usuarioEmail: usuario?.email, modulo: 'finanzas' });
}

export async function getCentrosCosto(db, filtros = {}) {
  let items;
  try {
    const constraints = [orderBy('codigo', 'asc')];
    if (filtros.estado && filtros.estado !== 'all') constraints.push(where('estado', '==', filtros.estado));
    const q = query(collection(db, CC), ...constraints);
    const snap = await getDocs(q);
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, CC));
      const snap = await getDocs(q);
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
    } else {
      throw e;
    }
  }
  if (filtros.search) {
    const s = filtros.search.toLowerCase();
    items = items.filter(i => i.codigo?.toLowerCase().includes(s) || i.nombre?.toLowerCase().includes(s) || i.responsable?.toLowerCase().includes(s));
  }
  items = await Promise.all(items.map(async (i) => {
    const ejec = await calcularEjecutadoCC(db, i.id);
    return { ...i, ejecutado: ejec };
  }));
  return items;
}

async function calcularEjecutadoCC(db, ccId) {
  const q = query(collection(db, ASIENTOS), where('estado', '==', 'confirmado'));
  const snap = await getDocs(q);
  let total = 0;
  snap.docs.forEach(d => {
    const data = d.data();
    (data.lineas || []).forEach(l => {
      if (l.centroCostoId === ccId) total += Number(l.debe) || 0;
    });
  });
  return total;
}

export async function addCentroCosto(db, data, usuario) {
  validarCentroCosto(data);
  const payload = {
    codigo: data.codigo.trim(),
    nombre: data.nombre.trim(),
    responsable: data.responsable?.trim() || '',
    presupuestoAnual: Number(data.presupuestoAnual) || 0,
    ejecutado: 0,
    estado: data.estado || 'activo',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, CC), payload);
  registrarAuditoria(db, { coleccion: CC, documentoId: ref.id, accion: 'crear', usuario: usuario?.uid, usuarioEmail: usuario?.email, cambios: payload, modulo: 'finanzas' });
  return { id: ref.id, ...payload };
}

export async function updateCentroCosto(db, id, data, usuario) {
  validarCentroCosto(data);
  const payload = {
    codigo: data.codigo.trim(),
    nombre: data.nombre.trim(),
    responsable: data.responsable?.trim() || '',
    presupuestoAnual: Number(data.presupuestoAnual) || 0,
    estado: data.estado || 'activo',
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, CC, id), payload);
  registrarAuditoria(db, { coleccion: CC, documentoId: id, accion: 'actualizar', usuario: usuario?.uid, usuarioEmail: usuario?.email, cambios: payload, modulo: 'finanzas' });
}

export async function deleteCentroCosto(db, id, usuario) {
  await deleteDoc(doc(db, CC, id));
  registrarAuditoria(db, { coleccion: CC, documentoId: id, accion: 'eliminar', usuario: usuario?.uid, usuarioEmail: usuario?.email, modulo: 'finanzas' });
}

export async function getAsientos(db, filtros = {}) {
  let items;
  try {
    const constraints = [orderBy('fecha', 'desc')];
    if (filtros.estado && filtros.estado !== 'all') constraints.push(where('estado', '==', filtros.estado));
    if (filtros.tipo) constraints.push(where('tipo', '==', filtros.tipo));
    const q = query(collection(db, ASIENTOS), ...constraints);
    const snap = await getDocs(q);
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, ASIENTOS));
      const snap = await getDocs(q);
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => { const fa = a.fecha?.toDate?.() || new Date(a.fecha || 0); const fb = b.fecha?.toDate?.() || new Date(b.fecha || 0); return fb - fa; });
    } else {
      throw e;
    }
  }
  if (filtros.fechaDesde) items = items.filter(i => new Date(i.fecha?.toDate?.() || i.fecha) >= new Date(filtros.fechaDesde));
  if (filtros.fechaHasta) items = items.filter(i => new Date(i.fecha?.toDate?.() || i.fecha) <= new Date(filtros.fechaHasta + 'T23:59:59'));
  if (filtros.centroCostoId) items = items.filter(i => (i.lineas || []).some(l => l.centroCostoId === filtros.centroCostoId));
  return items;
}

export async function getLibroDiario(db, fechaDesde, fechaHasta) {
  return await getAsientos(db, { fechaDesde, fechaHasta, estado: 'confirmado' });
}

export async function addAsiento(db, data, usuario) {
  validarAsiento(data);
  const total = data.lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0);
  const payload = {
    fecha: data.fecha || new Date().toISOString(),
    descripcion: data.descripcion.trim(),
    tipo: data.tipo || 'manual',
    movimientoId: data.movimientoId || null,
    lineas: data.lineas.map(l => ({
      cuentaId: l.cuentaId,
      centroCostoId: l.centroCostoId || null,
      debe: Number(l.debe) || 0,
      haber: Number(l.haber) || 0,
      descripcion: l.descripcion?.trim() || '',
    })),
    total,
    usuarioId: usuario?.uid || '',
    estado: data.estado || 'borrador',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, ASIENTOS), payload);
  registrarAuditoria(db, { coleccion: ASIENTOS, documentoId: ref.id, accion: 'crear', usuario: usuario?.uid, usuarioEmail: usuario?.email, cambios: payload, modulo: 'finanzas' });
  return { id: ref.id, ...payload };
}

export async function confirmarAsiento(db, id, usuario) {
  await updateDoc(doc(db, ASIENTOS, id), { estado: 'confirmado', updatedAt: serverTimestamp() });
  registrarAuditoria(db, { coleccion: ASIENTOS, documentoId: id, accion: 'confirmar', usuario: usuario?.uid, usuarioEmail: usuario?.email, modulo: 'finanzas' });
}

export async function anularAsiento(db, id, usuario) {
  await updateDoc(doc(db, ASIENTOS, id), { estado: 'anulado', updatedAt: serverTimestamp() });
  registrarAuditoria(db, { coleccion: ASIENTOS, documentoId: id, accion: 'anular', usuario: usuario?.uid, usuarioEmail: usuario?.email, modulo: 'finanzas' });
}

export async function deleteAsiento(db, id, usuario) {
  const ref = doc(db, ASIENTOS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Asiento no encontrado');
  if (snap.data().estado === 'confirmado') throw new Error('No se puede eliminar un asiento confirmado. Anúlelo primero.');
  await deleteDoc(ref);
  registrarAuditoria(db, { coleccion: ASIENTOS, documentoId: id, accion: 'eliminar', usuario: usuario?.uid, usuarioEmail: usuario?.email, modulo: 'finanzas' });
}

export async function generarAsientoDesdeMovimiento(db, movimiento, usuario) {
  if (!movimiento?.type || !movimiento?.total) throw new Error('Movimiento inválido');
  const cuentas = await getCuentas(db, { estado: 'activo' });
  const aceptan = cuentas.filter(c => c.aceptaMovimientos);
  const caja = aceptan.find(c => /caja/i.test(c.nombre)) || aceptan.find(c => c.tipo === movimiento.type);
  const contrapartida = aceptan.find(c => c.tipo === (movimiento.type === 'ingreso' ? 'ingreso' : 'gasto') && c.id !== caja?.id);
  if (!caja || !contrapartida) throw new Error('No hay cuentas configuradas para generar asiento automático. Configure cuentas con aceptaMovimientos=true.');
  const total = Number(movimiento.total) || 0;
  const lineas = movimiento.type === 'ingreso'
    ? [
      { cuentaId: caja.id, debe: total, haber: 0, descripcion: movimiento.description || movimiento.category || '' },
      { cuentaId: contrapartida.id, debe: 0, haber: total, descripcion: movimiento.description || movimiento.category || '' },
    ]
    : [
      { cuentaId: contrapartida.id, debe: total, haber: 0, descripcion: movimiento.description || movimiento.category || '' },
      { cuentaId: caja.id, debe: 0, haber: total, descripcion: movimiento.description || movimiento.category || '' },
    ];
  return await addAsiento(db, {
    fecha: movimiento.date || new Date().toISOString(),
    descripcion: `Asiento automático - ${movimiento.description || movimiento.type} ${movimiento.documentNumber || ''}`.trim(),
    tipo: 'automatico',
    movimientoId: movimiento.id,
    lineas,
    estado: 'confirmado',
  }, usuario);
}

export function getResumenContabilidad(cuentas, centros, asientos) {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const asientosMes = asientos.filter(a => new Date(a.fecha?.toDate?.() || a.fecha) >= inicioMes && a.estado !== 'anulado');
  return {
    totalCuentas: cuentas.length,
    totalCentros: centros.filter(c => c.estado === 'activo').length,
    asientosMes: asientosMes.length,
    totalMovidoMes: asientosMes.reduce((s, a) => s + (Number(a.total) || 0), 0),
    totalPresupuesto: centros.reduce((s, c) => s + (Number(c.presupuestoAnual) || 0), 0),
    totalEjecutado: centros.reduce((s, c) => s + (Number(c.ejecutado) || 0), 0),
  };
}
