import { 
  collection, addDoc, updateDoc, doc, getDocs, query,
  where, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import { registrarAuditoria } from './auditService';

const COLLECTION = 'fin_movimientos';

function validarMovimiento(data) {
  const errores = [];
  if (!data.tipo || !['ingreso', 'egreso'].includes(data.tipo)) errores.push('tipo inválido');
  if (!data.monto || data.monto <= 0) errores.push('monto debe ser > 0');
  if (!data.documento?.tipo) errores.push('tipo de documento requerido');
  if (!data.tercero?.nombre) errores.push('tercero requerido');
  if (!data.partidas?.length) errores.push('al menos una partida requerida');
  return errores;
}

function sanitizar(data) {
  return {
    tipo: data.tipo,
    fecha: data.fecha || serverTimestamp(),
    fechaVencimiento: data.fechaVencimiento || null,
    monto: Number(data.monto),
    saldoPendiente: Number(data.monto),
    metodoPago: data.metodoPago || 'efectivo',
    documento: {
      tipo: data.documento?.tipo || 'gasto',
      numero: data.documento?.numero || '',
      claveAcceso: data.documento?.claveAcceso || null,
      urlXml: data.documento?.urlXml || null,
      urlPdf: data.documento?.urlPdf || null,
    },
    tercero: {
      id: data.tercero?.id || '',
      nombre: data.tercero?.nombre || 'CONSUMIDOR FINAL',
      ruc: data.tercero?.ruc || '9999999999999',
    },
    partidas: (data.partidas || []).map(p => ({
      cuenta: p.cuenta || '',
      centroCosto: p.centroCosto || null,
      proyecto: p.proyecto || null,
      categoria: p.categoria || 'gastos_administrativos',
      descripcion: p.descripcion || '',
      baseImponible: Number(p.baseImponible) || 0,
      iva: Number(p.iva) || 0,
      ice: Number(p.ice) || 0,
      irbpnr: Number(p.irbpnr) || 0,
      retencionFuente: Number(p.retencionFuente) || 0,
      retencionIva: Number(p.retencionIva) || 0,
      total: Number(p.total) || Number(p.baseImponible || 0) + Number(p.iva || 0),
      deducible: Boolean(p.deducible),
    })),
    pagos: data.pagos || [],
    estado: data.estado || 'pendiente',
    sriStatus: data.sriStatus || 'no_aplica',
    origen: data.origen || 'finanzas',
    origenId: data.origenId || null,
    archivos: data.archivos || [],
    notas: data.notas || '',
    creadoPor: data.creadoPor || '',
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
    auditLog: [{
      accion: 'crear',
      usuario: data.creadoPor || '',
      fecha: new Date().toISOString(),
      cambios: null,
    }],
  };
}

export async function crearMovimiento(db, data, usuario) {
  const errores = validarMovimiento(data);
  if (errores.length) throw new Error('Validación: ' + errores.join(', '));
  
  const docData = sanitizar({ ...data, creadoPor: usuario.uid });
  const docRef = await addDoc(collection(db, COLLECTION), docData);
  
  registrarAuditoria(db, {
    coleccion: COLLECTION,
    documentoId: docRef.id,
    accion: 'crear',
    usuario: usuario.uid,
    usuarioEmail: usuario.email,
    cambios: { antes: null, despues: docData },
    modulo: data.origen || 'finanzas',
  });
  
  return { id: docRef.id, ...docData };
}

export async function editarMovimiento(db, id, data, usuario) {
  const docRef = doc(db, COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Movimiento no encontrado');
  
  const anterior = snap.data();
  if (anterior.origen !== 'finanzas') throw new Error('Solo se pueden editar movimientos creados desde Finanzas');
  
  const cambios = {
    ...data,
    actualizadoEn: serverTimestamp(),
    auditLog: [...(anterior.auditLog || []), {
      accion: 'editar',
      usuario: usuario.uid,
      fecha: new Date().toISOString(),
      cambios: { anterior: anterior, nuevo: data },
    }],
  };
  
  await updateDoc(docRef, cambios);
  
  registrarAuditoria(db, {
    coleccion: COLLECTION,
    documentoId: id,
    accion: 'editar',
    usuario: usuario.uid,
    usuarioEmail: usuario.email,
    cambios: { antes: anterior, despues: cambios },
    modulo: 'finanzas',
  });
  
  return { id, ...cambios };
}

export async function anularMovimiento(db, id, usuario) {
  const docRef = doc(db, COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Movimiento no encontrado');
  
  await updateDoc(docRef, {
    estado: 'anulado',
    actualizadoEn: serverTimestamp(),
    auditLog: [...(snap.data().auditLog || []), {
      accion: 'anular',
      usuario: usuario.uid,
      fecha: new Date().toISOString(),
    }],
  });
  
  registrarAuditoria(db, {
    coleccion: COLLECTION,
    documentoId: id,
    accion: 'anular',
    usuario: usuario.uid,
    usuarioEmail: usuario.email,
    modulo: 'finanzas',
  });
}

export async function registrarAbono(db, movimientoId, abono, usuario) {
  const docRef = doc(db, COLLECTION, movimientoId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Movimiento no encontrado');
  
  const mov = snap.data();
  const nuevoAbono = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    fecha: abono.fecha || new Date().toISOString(),
    monto: Number(abono.monto),
    metodoPago: abono.metodoPago || 'efectivo',
    referencia: abono.referencia || '',
    registradoPor: usuario.uid,
  };
  
  const totalAbonado = [...(mov.pagos || []), nuevoAbono].reduce((s, p) => s + Number(p.monto), 0);
  const nuevoSaldo = Math.max(0, Number(mov.monto) - totalAbonado);
  const nuevoEstado = nuevoSaldo <= 0.01 ? 'pagado' : 'parcial';
  
  await updateDoc(docRef, {
    pagos: [...(mov.pagos || []), nuevoAbono],
    saldoPendiente: nuevoSaldo,
    estado: nuevoEstado,
    actualizadoEn: serverTimestamp(),
    auditLog: [...(mov.auditLog || []), {
      accion: 'abonar',
      usuario: usuario.uid,
      fecha: new Date().toISOString(),
      cambios: { abono: nuevoAbono, saldoAnterior: mov.saldoPendiente, saldoNuevo: nuevoSaldo },
    }],
  });
  
  registrarAuditoria(db, {
    coleccion: COLLECTION,
    documentoId: movimientoId,
    accion: 'abonar',
    usuario: usuario.uid,
    usuarioEmail: usuario.email,
    cambios: { abono: nuevoAbono },
    modulo: 'finanzas',
  });
  
  return { ...mov, saldoPendiente: nuevoSaldo, estado: nuevoEstado, pagos: [...(mov.pagos || []), nuevoAbono] };
}

export async function getMovimientos(db, filtros = {}) {
  try {
    const constraints = [orderBy('fecha', 'desc')];
    
    if (filtros.tipo && filtros.tipo !== 'all') constraints.push(where('tipo', '==', filtros.tipo));
    if (filtros.estado && filtros.estado !== 'all') constraints.push(where('estado', '==', filtros.estado));
    
    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);
    
    let movimientos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (filtros.search) {
      const s = filtros.search.toLowerCase();
      movimientos = movimientos.filter(m =>
        m.documento?.numero?.toLowerCase().includes(s) ||
        m.tercero?.nombre?.toLowerCase().includes(s) ||
        m.tercero?.ruc?.includes(s) ||
        m.partidas?.some(p => p.descripcion?.toLowerCase().includes(s))
      );
    }
    
    if (filtros.metodoPago && filtros.metodoPago !== 'all') {
      movimientos = movimientos.filter(m => m.metodoPago === filtros.metodoPago);
    }
    
    if (filtros.categoria && filtros.categoria !== 'all') {
      movimientos = movimientos.filter(m =>
        m.partidas?.some(p => p.categoria === filtros.categoria)
      );
    }
    
    if (filtros.fechaDesde) {
      movimientos = movimientos.filter(m => {
        const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
        return f >= new Date(filtros.fechaDesde);
      });
    }
    
    if (filtros.fechaHasta) {
      movimientos = movimientos.filter(m => {
        const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
        return f <= new Date(filtros.fechaHasta + 'T23:59:59');
      });
    }
    
    return movimientos;
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      console.warn('[movimientoService] Índice de Firestore requerido. Usando fallback sin orderBy.');
      const q = query(collection(db, COLLECTION));
      const snap = await getDocs(q);
      let movimientos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      movimientos.sort((a, b) => {
        const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
        const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
        return fb - fa;
      });
      return movimientos;
    }
    throw e;
  }
}

export function getResumen(movimientos) {
  const ingresos = movimientos
    .filter(m => m.tipo === 'ingreso' && m.estado !== 'anulado')
    .reduce((s, m) => s + Number(m.monto), 0);
  const egresos = movimientos
    .filter(m => m.tipo === 'egreso' && m.estado !== 'anulado')
    .reduce((s, m) => s + Number(m.monto), 0);
  
  return {
    totalIngresos: ingresos,
    totalEgresos: egresos,
    saldoNeto: ingresos - egresos,
    conteo: movimientos.filter(m => m.estado !== 'anulado').length,
  };
}
