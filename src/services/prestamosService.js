import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { registrarAuditoria } from './auditService';

const COLLECTION = 'fin_prestamos';

export function generarTablaAmortizacion(monto, tasaMensual, plazoMeses, metodo, fechaInicio) {
  const i = tasaMensual / 100;
  const n = plazoMeses;
  const cuotas = [];
  const fechaBase = new Date(fechaInicio);

  if (metodo === 'frances') {
    const cuota = i === 0 ? monto / n : monto * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    let saldo = monto;
    for (let k = 1; k <= n; k++) {
      const interesCuota = saldo * i;
      const capitalCuota = cuota - interesCuota;
      saldo = Math.max(0, saldo - capitalCuota);
      const fv = new Date(fechaBase);
      fv.setMonth(fv.getMonth() + k);
      cuotas.push({
        numero: k,
        fechaVencimiento: Timestamp.fromDate(fv),
        capital: Math.round(capitalCuota * 100) / 100,
        interes: Math.round(interesCuota * 100) / 100,
        cuotaTotal: Math.round(cuota * 100) / 100,
        saldoPendiente: Math.round(saldo * 100) / 100,
        estado: 'pendiente',
        pagadaCapital: 0,
        pagadaInteres: 0,
        fechaPago: null
      });
    }
  } else if (metodo === 'aleman') {
    const capitalFijo = monto / n;
    let saldo = monto;
    for (let k = 1; k <= n; k++) {
      const interesCuota = saldo * i;
      const cuota = capitalFijo + interesCuota;
      saldo = Math.max(0, saldo - capitalFijo);
      const fv = new Date(fechaBase);
      fv.setMonth(fv.getMonth() + k);
      cuotas.push({
        numero: k,
        fechaVencimiento: Timestamp.fromDate(fv),
        capital: Math.round(capitalFijo * 100) / 100,
        interes: Math.round(interesCuota * 100) / 100,
        cuotaTotal: Math.round(cuota * 100) / 100,
        saldoPendiente: Math.round(saldo * 100) / 100,
        estado: 'pendiente',
        pagadaCapital: 0,
        pagadaInteres: 0,
        fechaPago: null
      });
    }
  } else if (metodo === 'americano') {
    const interesPeriodico = monto * i;
    for (let k = 1; k <= n; k++) {
      const fv = new Date(fechaBase);
      fv.setMonth(fv.getMonth() + k);
      const esUltima = k === n;
      const capitalCuota = esUltima ? monto : 0;
      const interesCuota = interesPeriodico;
      const cuota = capitalCuota + interesCuota;
      const saldo = esUltima ? 0 : monto;
      cuotas.push({
        numero: k,
        fechaVencimiento: Timestamp.fromDate(fv),
        capital: Math.round(capitalCuota * 100) / 100,
        interes: Math.round(interesCuota * 100) / 100,
        cuotaTotal: Math.round(cuota * 100) / 100,
        saldoPendiente: Math.round(saldo * 100) / 100,
        estado: 'pendiente',
        pagadaCapital: 0,
        pagadaInteres: 0,
        fechaPago: null
      });
    }
  }
  return cuotas;
}

export async function getPrestamos(db) {
  let items;
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      const q = query(collection(db, COLLECTION));
      const snap = await getDocs(q);
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => { const fa = a.createdAt?.toDate?.() || new Date(a.createdAt || 0); const fb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0); return fb - fa; });
    } else {
      throw e;
    }
  }
  items.forEach(p => actualizarEstadosCuotas(p));
  return items;
}

export async function getPrestamoById(db, id) {
  const docRef = doc(db, COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Prestamo no encontrado');
  const data = { id: snap.id, ...snap.data() };
  actualizarEstadosCuotas(data);
  return data;
}

export async function crearPrestamo(db, data, usuario) {
  const monto = Number(data.montoDesembolsado);
  const tasa = Number(data.tasaInteres);
  const plazo = Number(data.plazoMeses);
  const metodo = data.metodoAmortizacion;
  const fechaInicio = data.fechaInicio || new Date().toISOString().slice(0, 10);

  const cuotas = generarTablaAmortizacion(monto, tasa, plazo, metodo, fechaInicio);

  const payload = {
    entidad: data.entidad,
    numeroContrato: data.numeroContrato || '',
    montoDesembolsado: monto,
    tasaInteres: tasa,
    plazoMeses: plazo,
    metodoAmortizacion: metodo,
    fechaDesembolso: data.fechaDesembolso ? Timestamp.fromDate(new Date(data.fechaDesembolso)) : Timestamp.now(),
    fechaInicio: Timestamp.fromDate(new Date(fechaInicio)),
    saldoPendiente: monto,
    capitalPagado: 0,
    interesPagado: 0,
    estado: 'vigente',
    cuotas,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTION), payload);
  registrarAuditoria(db, { coleccion: COLLECTION, documentoId: ref.id, accion: 'crear', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { nuevo: { entidad: data.entidad, monto } }, modulo: 'finanzas' });
  return ref.id;
}

export async function eliminarPrestamo(db, id, usuario) {
  await deleteDoc(doc(db, COLLECTION, id));
  registrarAuditoria(db, { coleccion: COLLECTION, documentoId: id, accion: 'eliminar', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { antes: { id } }, modulo: 'finanzas' });
}

export async function pagarCuota(db, prestamoId, cuotaNumero, montoPagado, usuario) {
  const docRef = doc(db, COLLECTION, prestamoId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Prestamo no encontrado');
  const prestamo = snap.data();
  const cuotas = [...(prestamo.cuotas || [])];

  const idx = cuotas.findIndex(c => c.numero === cuotaNumero);
  if (idx === -1) throw new Error('Cuota no encontrada');

  const cuota = { ...cuotas[idx] };
  const monto = Number(montoPagado);
  const totalCuota = Number(cuota.cuotaTotal);
  const pendienteCapital = Number(cuota.capital) - Number(cuota.pagadaCapital || 0);
  const pendienteInteres = Number(cuota.interes) - Number(cuota.pagadaInteres || 0);

  let aplicado = monto;
  let nuevoPagadaInteres = Number(cuota.pagadaInteres || 0);
  let nuevoPagadaCapital = Number(cuota.pagadaCapital || 0);

  if (aplicado >= pendienteInteres) {
    aplicado -= pendienteInteres;
    nuevoPagadaInteres = Number(cuota.interes);
  } else {
    nuevoPagadaInteres += aplicado;
    aplicado = 0;
  }

  if (aplicado >= pendienteCapital) {
    nuevoPagadaCapital = Number(cuota.capital);
  } else {
    nuevoPagadaCapital += aplicado;
  }

  cuota.pagadaCapital = Math.round(nuevoPagadaCapital * 100) / 100;
  cuota.pagadaInteres = Math.round(nuevoPagadaInteres * 100) / 100;
  cuota.fechaPago = Timestamp.now();

  const totalPagadoCuota = cuota.pagadaCapital + cuota.pagadaInteres;
  cuota.estado = totalPagadoCuota >= totalCuota - 0.01 ? 'pagado' : 'parcial';

  cuotas[idx] = cuota;

  let capitalPagadoTotal = 0;
  let interesPagadoTotal = 0;
  cuotas.forEach(c => {
    capitalPagadoTotal += Number(c.pagadaCapital || 0);
    interesPagadoTotal += Number(c.pagadaInteres || 0);
  });
  const saldoPendiente = Math.max(0, Number(prestamo.montoDesembolsado) - capitalPagadoTotal);
  const todasPagadas = cuotas.every(c => c.estado === 'pagado');
  const estado = todasPagadas ? 'cancelado' : 'vigente';

  await updateDoc(docRef, {
    cuotas,
    capitalPagado: Math.round(capitalPagadoTotal * 100) / 100,
    interesPagado: Math.round(interesPagadoTotal * 100) / 100,
    saldoPendiente: Math.round(saldoPendiente * 100) / 100,
    estado,
    updatedAt: serverTimestamp()
  });

  registrarAuditoria(db, { coleccion: COLLECTION, documentoId: prestamoId, accion: 'pagar_cuota', usuario: usuario.uid, usuarioEmail: usuario.email, cambios: { cuota: cuotaNumero, monto }, modulo: 'finanzas' });
  return { cuotas, saldoPendiente, capitalPagado: capitalPagadoTotal, interesPagado: interesPagadoTotal, estado };
}

function actualizarEstadosCuotas(prestamo) {
  if (!prestamo.cuotas) return;
  const hoy = new Date();
  let tieneVencidas = false;
  prestamo.cuotas.forEach(c => {
    if (c.estado === 'pagado') return;
    const fv = c.fechaVencimiento?.toDate?.() || new Date(c.fechaVencimiento);
    if (fv < hoy && c.estado === 'pendiente') {
      c.estado = 'vencido';
      tieneVencidas = true;
    }
  });
  if (tieneVencidas && prestamo.estado === 'vigente') {
    prestamo.estado = 'mora';
  }
  prestamo.cuotasVencidas = prestamo.cuotas.filter(c => c.estado === 'vencido').length;
  prestamo.cuotasPagadas = prestamo.cuotas.filter(c => c.estado === 'pagado').length;
  prestamo.cuotasPendientes = prestamo.cuotas.filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length;
}

export function getResumenPrestamos(prestamos) {
  const vigentes = prestamos.filter(p => p.estado !== 'cancelado');
  return {
    totalDeuda: vigentes.reduce((s, p) => s + (Number(p.saldoPendiente) || 0), 0),
    capitalPagado: prestamos.reduce((s, p) => s + (Number(p.capitalPagado) || 0), 0),
    interesPagado: prestamos.reduce((s, p) => s + (Number(p.interesPagado) || 0), 0),
    cuotasVencidas: prestamos.reduce((s, p) => s + (p.cuotasVencidas || 0), 0),
    conteo: vigentes.length,
  };
}

export function getAlertasPrestamos(prestamos) {
  const alertas = [];
  const hoy = new Date();
  prestamos.filter(p => p.estado !== 'cancelado').forEach(p => {
    (p.cuotas || []).forEach(c => {
      if (c.estado === 'vencido') {
        const fv = c.fechaVencimiento?.toDate?.() || new Date(c.fechaVencimiento);
        const dias = Math.floor((hoy - fv) / 86400000);
        alertas.push({ prestamoId: p.id, entidad: p.entidad, cuota: c.numero, dias, mensaje: `Cuota #${c.numero} vencida hace ${dias} día(s) - ${p.entidad}` });
      }
    });
  });
  return alertas.sort((a, b) => b.dias - a.dias);
}
