import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { registrarAuditoria } from './auditService';

const COLLECTION_BANCOS = 'fin_bancos';
const COLLECTION_MOV_BANCARIOS = 'fin_movimientos_bancarios';

export async function getCuentas(db, filtros = {}) {
  try {
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
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, COLLECTION_BANCOS));
      const snap = await getDocs(q);
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      for (const cuenta of items) {
        cuenta.saldoActual = await calcularSaldoCuenta(db, cuenta.id, cuenta.saldoInicial);
      }
      return items;
    }
    throw e;
  }
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
  let items;
  try {
    const constraints = [where('cuentaId', '==', cuentaId), orderBy('fecha', 'desc')];
    const q = query(collection(db, COLLECTION_MOV_BANCARIOS), ...constraints);
    const snap = await getDocs(q);
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, COLLECTION_MOV_BANCARIOS));
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

/**
 * Conciliación bancaria automática
 * Busca posibles matches entre movimientos bancarios no conciliados y movimientos financieros
 */
export async function conciliacionAutomatica(db, cuentaId, usuario) {
  // Obtener movimientos bancarios no conciliados
  const movsBancarios = await getMovimientosBancarios(db, cuentaId, { conciliado: 'false' });
  
  // Obtener todos los movimientos financieros
  const movFinancierosRef = collection(db, 'fin_movimientos');
  const q = query(movFinancierosRef, where('estado', 'in', ['pendiente', 'parcial', 'pagado']));
  const snapFinancieros = await getDocs(q);
  const movFinancieros = snapFinancieros.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const sugerencias = [];
  
  for (const movBanc of movsBancarios) {
    const posiblesMatches = [];
    
    for (const movFin of movFinancieros) {
      let confianza = 0;
      let razon = [];
      
      // 1. Monto exacto (40 puntos)
      const montoBanc = Math.abs(Number(movBanc.monto) || 0);
      const montoFin = Number(movFin.monto) || 0;
      if (Math.abs(montoBanc - montoFin) < 0.01) {
        confianza += 40;
        razon.push('monto exacto');
      } else if (Math.abs(montoBanc - montoFin) < 0.05) {
        confianza += 20;
        razon.push('monto similar');
      }
      
      // 2. Fecha ±3 días (30 puntos)
      const fechaBanc = movBanc.fecha?.toDate?.() || new Date(movBanc.fecha);
      const fechaFin = movFin.fecha?.toDate?.() || new Date(movFin.fecha);
      const diferenciaDias = Math.abs((fechaBanc - fechaFin) / (1000 * 60 * 60 * 24));
      if (diferenciaDias <= 1) {
        confianza += 30;
        razon.push('fecha exacta');
      } else if (diferenciaDias <= 3) {
        confianza += 20;
        razon.push(`fecha ±${Math.round(diferenciaDias)}d`);
      } else if (diferenciaDias <= 7) {
        confianza += 10;
        razon.push(`fecha ±${Math.round(diferenciaDias)}d`);
      }
      
      // 3. Referencia o descripción (20 puntos)
      const refBanc = (movBanc.referencia || '').toLowerCase();
      const descBanc = (movBanc.descripcion || '').toLowerCase();
      const numDocFin = (movFin.documento?.numero || '').toLowerCase();
      const claveAcceso = (movFin.documento?.claveAcceso || '').toLowerCase();
      
      if (refBanc && refBanc === numDocFin) {
        confianza += 20;
        razon.push('referencia exacta');
      } else if (claveAcceso && refBanc.includes(claveAcceso)) {
        confianza += 15;
        razon.push('clave acceso');
      }
      
      // 4. Tercero (10 puntos)
      const terceroFin = (movFin.tercero?.nombre || '').toLowerCase();
      if (terceroFin && descBanc.includes(terceroFin.substring(0, 10))) {
        confianza += 10;
        razon.push('tercero similar');
      }
      
      // Solo sugerir si confianza >= 70
      if (confianza >= 70) {
        posiblesMatches.push({
          movimientoFinanciero: movFin,
          confianza,
          razon: razon.join(', ')
        });
      }
    }
    
    // Ordenar por confianza descendente
    posiblesMatches.sort((a, b) => b.confianza - a.confianza);
    
    if (posiblesMatches.length > 0) {
      sugerencias.push({
        movimientoBancario: movBanc,
        matches: posiblesMatches.slice(0, 3) // Top 3 sugerencias
      });
    }
  }
  
  return {
    totalNoConciliados: movsBancarios.length,
    sugerencias: sugerencias.length,
    detalle: sugerencias
  };
}
