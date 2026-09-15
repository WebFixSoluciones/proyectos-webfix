import { postFinancialPayment, paymentBalance } from './financialTransactions.js';
import { getAppId } from '../firebase.js';
import { 
  collection, runTransaction, doc, getDocs, query,
  where, orderBy, serverTimestamp
} from './financeStore.js';

const COLLECTION = 'fin_movimientos';

function validarMovimiento(data) {
  const errores = [];
  if (!data.tipo || !['ingreso', 'egreso'].includes(data.tipo)) errores.push('tipo inválido');
  if (!Number.isFinite(Number(data.monto)) || Number(data.monto) <= 0) errores.push('monto debe ser > 0');
  if (!data.documento?.tipo) errores.push('tipo de documento requerido');
  if (!data.tercero?.nombre) errores.push('tercero requerido');
  if (!data.partidas?.length) errores.push('al menos una partida requerida');
  const lines = data.partidas || [];
  if (lines.some(p => !Number.isFinite(Number(p.total)) || Number(p.total) < 0)) errores.push('partidas con importes inválidos');
  if (Math.abs(lines.reduce((sum,p) => sum + Number(p.total || 0),0) - Number(data.monto)) > 0.01) errores.push('la suma de partidas no coincide con el total');
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

function accountFromMovement(movement, id, balance) {
  return { movimientoId: id, tenantId: movement.tenantId || getAppId(), tercero: movement.tercero, factura: { tipo: movement.documento.tipo, numero: movement.documento.numero, fecha: movement.fecha, fechaVencimiento: movement.fechaVencimiento, montoTotal: movement.monto }, abonos: movement.pagos || [], saldoPendiente: balance.saldoPendiente, estado: balance.estado, actualizadoEn: serverTimestamp() };
}

export async function crearMovimiento(db, data, usuario = {}) {
  const errors = validarMovimiento(data);
  if (errors.length) throw new Error(errors.join(', '));
  const id = data.id || crypto.randomUUID();
  const payload = sanitizar({ ...data, creadoPor: usuario.uid || '' });
  const balance = paymentBalance(payload.monto, payload.pagos);
  Object.assign(payload, { tenantId: getAppId(), saldoPendiente: balance.saldoPendiente, estado: balance.estado });
  await runTransaction(db, async tx => {
    const ref = doc(db, COLLECTION, id);
    const previous = await tx.get(ref);
    if (previous.exists()) {
      if (Number(previous.data().monto) !== payload.monto) throw new Error('Esta referencia ya existe con otro importe.');
      return;
    }
    tx.set(ref, payload);
    tx.set(doc(db, payload.tipo === 'ingreso' ? 'fin_cxc' : 'fin_cxp', 'fin_' + id), accountFromMovement(payload, id, balance));
    tx.set(doc(db, 'fin_auditoria', 'mov_' + id), { tenantId: getAppId(), accion: 'crear', documentoId: id, coleccion: COLLECTION, usuario: usuario.uid || '', fecha: serverTimestamp(), modulo: 'finanzas' });
  });
  return { id, ...payload };
}

export async function editarMovimiento(db, id, data, usuario = {}) {
  return runTransaction(db, async tx => {
    const ref = doc(db, COLLECTION, id);
    const previous = (await tx.get(ref)).data();
    if (!previous || previous.origen !== 'finanzas' || previous.estado === 'anulado') throw new Error('El movimiento no permite edición desde Finanzas.');
    if (data.tipo && data.tipo !== previous.tipo) throw new Error('No se puede cambiar el tipo de un movimiento registrado.');
    const merged = { ...previous, ...data, pagos: previous.pagos || [] };
    const errors = validarMovimiento(merged);
    if (errors.length) throw new Error(errors.join(', '));
    const balance = paymentBalance(merged.monto, merged.pagos);
    const accountRef = doc(db, merged.tipo === 'ingreso' ? 'fin_cxc' : 'fin_cxp', 'fin_' + id);
    const account = await tx.get(accountRef);
    const changes = { ...sanitizar(merged), creadoEn: previous.creadoEn, creadoPor: previous.creadoPor || '', saldoPendiente: balance.saldoPendiente, estado: balance.estado, auditLog: [...(previous.auditLog || []), { accion: 'editar', usuario: usuario.uid || '', fecha: new Date().toISOString() }] };
    tx.update(ref, changes);
    if (account.exists()) tx.set(accountRef, accountFromMovement(changes, id, balance), { merge: true });
    return { id, ...previous, ...changes };
  });
}

export async function anularMovimiento(db, id, usuario = {}) {
  await runTransaction(db, async tx => {
    const ref = doc(db, COLLECTION, id);
    const previous = (await tx.get(ref)).data();
    if (!previous) throw new Error('Movimiento no encontrado.');
    if (previous.estado === 'anulado') return;
    if (previous.origen !== 'finanzas') throw new Error('Anula este documento desde su módulo de origen para conservar sus relaciones.');
    if (previous.pagos?.length || previous.conciliacionBancariaId) throw new Error('El movimiento tiene pagos o conciliaciones. Debes revertirlos antes de anular.');
    const accountRef = doc(db, previous.tipo === 'ingreso' ? 'fin_cxc' : 'fin_cxp', 'fin_' + id);
    const account = await tx.get(accountRef);
    if (account.data()?.abonos?.length) throw new Error('La cuenta vinculada tiene abonos.');
    const changes = { estado: 'anulado', saldoPendiente: 0, actualizadoEn: serverTimestamp() };
    tx.update(ref, changes);
    if (account.exists()) tx.update(accountRef, changes);
    tx.set(doc(db, 'fin_auditoria', 'anular_' + id), { accion: 'anular', documentoId: id, usuario: usuario.uid || '', fecha: serverTimestamp() });
  });
}

export async function registrarAbono(db, movimientoId, abono, usuario) {
  return postFinancialPayment(db, { collection: 'fin_movimientos', id: movimientoId }, abono, usuario, { tenantId: getAppId() });
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
