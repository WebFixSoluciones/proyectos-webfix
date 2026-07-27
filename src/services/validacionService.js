import { collection, getDocs, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Servicio de validación de integridad de datos financieros
 * Verifica consistencia entre movimientos, CxC, CxP, bancos y contabilidad
 */

/**
 * Valida que la suma de partidas = monto total del movimiento
 */
export function validarSumaPartidas(movimiento) {
  const sumaPartidas = (movimiento.partidas || []).reduce((sum, p) => sum + Number(p.total || 0), 0);
  const montoTotal = Number(movimiento.monto || 0);
  const diferencia = Math.abs(sumaPartidas - montoTotal);
  
  return {
    valido: diferencia < 0.01,
    sumaPartidas,
    montoTotal,
    diferencia,
    mensaje: diferencia < 0.01 ? 'OK' : `Diferencia de $${diferencia.toFixed(2)} entre partidas ($${sumaPartidas.toFixed(2)}) y monto ($${montoTotal.toFixed(2)})`
  };
}

/**
 * Valida que saldoPendiente = monto - suma de abonos
 */
export function validarSaldoPendiente(movimiento) {
  const monto = Number(movimiento.monto || 0);
  const sumaAbonos = (movimiento.pagos || []).reduce((sum, p) => sum + Number(p.monto || 0), 0);
  const saldoEsperado = Math.max(0, monto - sumaAbonos);
  const saldoActual = Number(movimiento.saldoPendiente || 0);
  const diferencia = Math.abs(saldoEsperado - saldoActual);
  
  return {
    valido: diferencia < 0.01,
    saldoEsperado,
    saldoActual,
    diferencia,
    mensaje: diferencia < 0.01 ? 'OK' : `Saldo pendiente incorrecto: esperado $${saldoEsperado.toFixed(2)}, actual $${saldoActual.toFixed(2)}`
  };
}

/**
 * Valida coherencia entre estado y saldo pendiente
 */
export function validarEstadoSaldo(movimiento) {
  const saldo = Number(movimiento.saldoPendiente || 0);
  const estado = movimiento.estado;
  const monto = Number(movimiento.monto || 0);
  
  let valido = true;
  let mensaje = 'OK';
  
  if (estado === 'pagado' && saldo > 0.01) {
    valido = false;
    mensaje = `Estado es 'pagado' pero saldo pendiente es $${saldo.toFixed(2)}`;
  } else if (estado === 'pendiente' && saldo === 0 && monto > 0) {
    valido = false;
    mensaje = `Estado es 'pendiente' pero saldo es $0`;
  } else if (estado === 'parcial' && (saldo === 0 || saldo === monto)) {
    valido = false;
    mensaje = `Estado es 'parcial' pero saldo no refleja pago parcial`;
  } else if (estado === 'anulado' && saldo !== monto && saldo !== 0) {
    valido = false;
    mensaje = `Movimiento anulado con saldo inconsistente`;
  }
  
  return { valido, estado, saldo, mensaje };
}

/**
 * Detecta posibles duplicados en movimientos
 */
export function detectarDuplicados(movimientos) {
  const duplicados = [];
  const vistos = new Map();
  
  movimientos.forEach(mov => {
    // Clave única basada en: tipo documento + número + tercero + monto
    const clave = `${mov.documento?.tipo}-${mov.documento?.numero}-${mov.tercero?.ruc}-${mov.monto}`;
    
    if (vistos.has(clave)) {
      duplicados.push({
        movimiento: mov,
        duplicadoDe: vistos.get(clave),
        razon: 'Mismo tipo, número, tercero y monto'
      });
    } else {
      vistos.set(clave, mov);
    }
    
    // También verificar por clave de acceso SRI
    if (mov.documento?.claveAcceso) {
      const claveAcceso = mov.documento.claveAcceso;
      if (vistos.has(`SRI-${claveAcceso}`)) {
        duplicados.push({
          movimiento: mov,
          duplicadoDe: vistos.get(`SRI-${claveAcceso}`),
          razon: 'Misma clave de acceso SRI'
        });
      } else {
        vistos.set(`SRI-${claveAcceso}`, mov);
      }
    }
  });
  
  return duplicados;
}

/**
 * Valida consistencia entre CxC y movimientos pendientes
 */
export async function validarConsistenciaCxC(db) {
  const errores = [];
  
  // Obtener movimientos de ingresos pendientes
  const movimientosRef = collection(db, 'fin_movimientos');
  const queryIngresos = query(
    movimientosRef,
    where('tipo', '==', 'ingreso'),
    where('estado', 'in', ['pendiente', 'parcial'])
  );
  const snapshotIngresos = await getDocs(queryIngresos);
  const movimientosPendientes = snapshotIngresos.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Obtener registros de CxC
  const cxcRef = collection(db, 'fin_cxc');
  const snapshotCxC = await getDocs(cxcRef);
  const registrosCxC = snapshotCxC.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Verificar que cada movimiento pendiente tenga su CxC
  const movimientosIds = new Set(movimientosPendientes.map(m => m.id));
  const cxcMovimientoIds = new Set(registrosCxC.map(c => c.movimientoId));
  
  movimientosPendientes.forEach(mov => {
    if (!cxcMovimientoIds.has(mov.id)) {
      errores.push({
        tipo: 'CxC_FALTANTE',
        movimientoId: mov.id,
        documento: mov.documento?.numero,
        tercero: mov.tercero?.nombre,
        monto: mov.monto,
        mensaje: `Movimiento ${mov.documento?.numero} no tiene registro en CxC`
      });
    }
  });
  
  // Verificar saldos coincidan
  registrosCxC.forEach(cxc => {
    const movimiento = movimientosPendientes.find(m => m.id === cxc.movimientoId);
    if (movimiento) {
      const diff = Math.abs(Number(cxc.saldoPendiente || 0) - Number(movimiento.saldoPendiente || 0));
      if (diff > 0.01) {
        errores.push({
          tipo: 'CxC_SALDO_INCONSISTENTE',
          cxcId: cxc.id,
          movimientoId: cxc.movimientoId,
          saldoCxC: cxc.saldoPendiente,
          saldoMovimiento: movimiento.saldoPendiente,
          diferencia: diff,
          mensaje: `Saldo CxC ($${cxc.saldoPendiente}) != Saldo movimiento ($${movimiento.saldoPendiente})`
        });
      }
    }
  });
  
  return {
    totalMovimientos: movimientosPendientes.length,
    totalCxC: registrosCxC.length,
    errores,
    valido: errores.length === 0
  };
}

/**
 * Valida consistencia entre CxP y movimientos pendientes
 */
export async function validarConsistenciaCxP(db) {
  const errores = [];
  
  // Obtener movimientos de egresos pendientes
  const movimientosRef = collection(db, 'fin_movimientos');
  const queryEgresos = query(
    movimientosRef,
    where('tipo', '==', 'egreso'),
    where('estado', 'in', ['pendiente', 'parcial'])
  );
  const snapshotEgresos = await getDocs(queryEgresos);
  const movimientosPendientes = snapshotEgresos.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Obtener registros de CxP
  const cxpRef = collection(db, 'fin_cxp');
  const snapshotCxP = await getDocs(cxpRef);
  const registrosCxP = snapshotCxP.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Verificar que cada movimiento pendiente tenga su CxP
  const movimientosIds = new Set(movimientosPendientes.map(m => m.id));
  const cxpMovimientoIds = new Set(registrosCxP.map(c => c.movimientoId));
  
  movimientosPendientes.forEach(mov => {
    if (!cxpMovimientoIds.has(mov.id)) {
      errores.push({
        tipo: 'CxP_FALTANTE',
        movimientoId: mov.id,
        documento: mov.documento?.numero,
        tercero: mov.tercero?.nombre,
        monto: mov.monto,
        mensaje: `Movimiento ${mov.documento?.numero} no tiene registro en CxP`
      });
    }
  });
  
  // Verificar saldos coincidan
  registrosCxP.forEach(cxp => {
    const movimiento = movimientosPendientes.find(m => m.id === cxp.movimientoId);
    if (movimiento) {
      const diff = Math.abs(Number(cxp.saldoPendiente || 0) - Number(movimiento.saldoPendiente || 0));
      if (diff > 0.01) {
        errores.push({
          tipo: 'CxP_SALDO_INCONSISTENTE',
          cxpId: cxp.id,
          movimientoId: cxp.movimientoId,
          saldoCxP: cxp.saldoPendiente,
          saldoMovimiento: movimiento.saldoPendiente,
          diferencia: diff,
          mensaje: `Saldo CxP ($${cxp.saldoPendiente}) != Saldo movimiento ($${movimiento.saldoPendiente})`
        });
      }
    }
  });
  
  return {
    totalMovimientos: movimientosPendientes.length,
    totalCxP: registrosCxP.length,
    errores,
    valido: errores.length === 0
  };
}

/**
 * Validación completa de integridad financiera
 */
export async function validarIntegridadCompleta(db) {
  const resultados = {
    timestamp: new Date().toISOString(),
    movimientos: { total: 0, errores: [] },
    cxc: { valido: true, totalMovimientos: 0, totalCxC: 0, errores: [] },
    cxp: { valido: true, totalMovimientos: 0, totalCxP: 0, errores: [] },
    duplicados: [],
    resumen: {
      totalErrores: 0,
      severos: 0,
      advertencias: 0,
      valido: true
    }
  };
  
  try {
    // 1. Validar movimientos
    const movimientosRef = collection(db, 'fin_movimientos');
    const snapshotMovimientos = await getDocs(movimientosRef);
    const movimientos = snapshotMovimientos.docs.map(d => ({ id: d.id, ...d.data() }));
    
    resultados.movimientos.total = movimientos.length;
    
    movimientos.forEach(mov => {
      const valPartidas = validarSumaPartidas(mov);
      const valSaldo = validarSaldoPendiente(mov);
      const valEstado = validarEstadoSaldo(mov);
      
      if (!valPartidas.valido) {
        resultados.movimientos.errores.push({
          id: mov.id,
          tipo: 'PARTIDAS',
          severidad: 'severo',
          mensaje: valPartidas.mensaje
        });
      }
      
      if (!valSaldo.valido) {
        resultados.movimientos.errores.push({
          id: mov.id,
          tipo: 'SALDO',
          severidad: 'severo',
          mensaje: valSaldo.mensaje
        });
      }
      
      if (!valEstado.valido) {
        resultados.movimientos.errores.push({
          id: mov.id,
          tipo: 'ESTADO',
          severidad: 'advertencia',
          mensaje: valEstado.mensaje
        });
      }
    });
    
    // 2. Detectar duplicados
    resultados.duplicados = detectarDuplicados(movimientos);
    
    // 3. Validar CxC
    resultados.cxc = await validarConsistenciaCxC(db);
    
    // 4. Validar CxP
    resultados.cxp = await validarConsistenciaCxP(db);
    
    // 5. Calcular resumen
    const erroresMovimientos = resultados.movimientos.errores.length;
    const erroresCxC = resultados.cxc.errores.length;
    const erroresCxP = resultados.cxp.errores.length;
    const duplicados = resultados.duplicados.length;
    
    resultados.resumen.totalErrores = erroresMovimientos + erroresCxC + erroresCxP + duplicados;
    resultados.resumen.severos = resultados.movimientos.errores.filter(e => e.severidad === 'severo').length;
    resultados.resumen.advertencias = resultados.movimientos.errores.filter(e => e.severidad === 'advertencia').length;
    resultados.resumen.valido = resultados.resumen.totalErrores === 0;
    
    return resultados;
    
  } catch (error) {
    console.error('Error en validación de integridad:', error);
    throw new Error(`Error al validar integridad: ${error.message}`);
  }
}

/**
 * Corrige saldo pendiente de un movimiento
 */
export async function corregirSaldoPendiente(db, movimientoId, usuario) {
  const docRef = doc(db, 'fin_movimientos', movimientoId);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    throw new Error('Movimiento no encontrado');
  }
  
  const movimiento = snap.data();
  const monto = Number(movimiento.monto || 0);
  const sumaAbonos = (movimiento.pagos || []).reduce((sum, p) => sum + Number(p.monto || 0), 0);
  const saldoCorregido = Math.max(0, monto - sumaAbonos);
  const nuevoEstado = saldoCorregido === 0 ? 'pagado' : saldoCorregido === monto ? 'pendiente' : 'parcial';
  
  await docRef.update({
    saldoPendiente: saldoCorregido,
    estado: nuevoEstado,
    actualizadoEn: serverTimestamp()
  });
  
  return {
    movimientoId,
    saldoCorregido,
    nuevoEstado,
    mensaje: `Saldo corregido a $${saldoCorregido.toFixed(2)}, estado: ${nuevoEstado}`
  };
}
