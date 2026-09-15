import * as firestore from './financeStore.js';
import { roundMoney } from './paymentModel.js';

export function positiveMoney(value) {
  const amount = roundMoney(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('El importe debe ser un número mayor a cero.');
  return amount;
}

export function paymentBalance(total, payments) {
  total = positiveMoney(total);
  const paid = roundMoney(payments.reduce((sum, p) => sum + positiveMoney(p.monto), 0));
  if (paid > total) throw new Error('El pago supera el saldo pendiente.');
  const saldoPendiente = roundMoney(total - paid);
  return { paid, saldoPendiente, estado: saldoPendiente === 0 ? 'pagado' : paid > 0 ? 'parcial' : 'pendiente' };
}

export async function reconcileBankMovement(db, bankMovementId, movementId, { api = firestore } = {}) {
  return api.runTransaction(db, async tx => {
    const bankRef = api.doc(db, 'fin_movimientos_bancarios', bankMovementId);
    const bank = (await tx.get(bankRef)).data();
    if (!bank) throw new Error('Movimiento bancario no encontrado.');
    const linkedId = movementId || bank.movimientoId;
    if (!linkedId) return;
    const movementRef = api.doc(db, 'fin_movimientos', linkedId);
    const movement = (await tx.get(movementRef)).data();
    if (!movement) throw new Error('Movimiento financiero no encontrado.');
    if (movementId) {
      if (movement.estado === 'anulado' || bank.estado === 'anulado') throw new Error('No se pueden conciliar movimientos anulados.');
      if (bank.movimientoId && bank.movimientoId !== movementId) throw new Error('El registro bancario ya está conciliado con otro movimiento.');
      if (movement.conciliacionBancariaId && movement.conciliacionBancariaId !== bankMovementId) throw new Error('El movimiento financiero ya está conciliado.');
      if ((bank.tipo === 'credito') !== (movement.tipo === 'ingreso')) throw new Error('La dirección del movimiento bancario no coincide.');
      if (Math.abs(positiveMoney(bank.monto) - positiveMoney(movement.monto)) > 0.01) throw new Error('Los importes de los movimientos no coinciden.');
    }
    if (bank.pagoId) throw new Error('Este movimiento proviene de un abono y conserva su vínculo de origen.');
    tx.update(bankRef, { conciliado: !!movementId, movimientoId: movementId || null, updatedAt: api.serverTimestamp() });
    if (movementId || movement.conciliacionBancariaId === bankMovementId) tx.update(movementRef, { conciliacionBancariaId: movementId ? bankMovementId : null, actualizadoEn: api.serverTimestamp() });
  });
}

/** A payment updates the obligation, movement, source document and optional bank together. */
export async function postFinancialPayment(db, target, payment, user = {}, { api = firestore, tenantId = null } = {}) {
  const amount = positiveMoney(payment.monto);
  const paymentId = payment.id || crypto.randomUUID();
  const ref = (collection, id) => api.doc(db, collection, id);
  let obligationId = target.collection === 'fin_movimientos' ? null : target.id;
  let obligationCollection = target.collection;
  if (!obligationId) {
    for (const name of ['fin_cxc', 'fin_cxp']) {
      const snapshot = await api.getDocs(api.query(api.collection(db, name), api.where('movimientoId', '==', target.id)));
      if (snapshot.docs.length > 1 || (obligationId && snapshot.docs.length)) throw new Error('Hay cuentas duplicadas asociadas al movimiento. Revisa su integridad.');
      if (snapshot.docs.length) { obligationId = snapshot.docs[0].id; obligationCollection = name; }
    }
  }
  return api.runTransaction(db, async tx => {
    const obligationRef = obligationId ? ref(obligationCollection, obligationId) : null;
    const obligation = obligationRef ? (await tx.get(obligationRef)).data() : null;
    if (obligationRef && !obligation) throw new Error('Cuenta por cobrar/pagar no encontrada.');
    const movementId = obligation?.movimientoId || (target.collection === 'fin_movimientos' ? target.id : null);
    if (!movementId) throw new Error('La cuenta no tiene movimiento financiero asociado.');
    const movementRef = ref('fin_movimientos', movementId);
    const movement = (await tx.get(movementRef)).data();
    if (!movement) throw new Error('Movimiento financiero no encontrado.');
    if (movement.estado === 'anulado' || obligation?.estado === 'anulado') throw new Error('No se puede pagar un documento anulado.');
    const originalPayments = obligation?.abonos || movement.pagos || [];
    const existing = originalPayments.find(p => p.id === paymentId);
    if (existing) {
      if (Number(existing.monto) !== amount) throw new Error('La referencia ya fue utilizada con otro importe.');
      return { ...(obligation || movement), pagos: originalPayments, abonos: originalPayments };
    }
    const total = obligation?.factura?.montoTotal ?? movement.monto;
    const newPayment = { id: paymentId, monto: amount, fecha: payment.fecha || new Date().toISOString(), metodoPago: payment.metodoPago || 'efectivo', referencia: payment.referencia || '', registradoPor: user.uid || '', movimientoId: movementId };
    const payments = [...originalPayments, newPayment];
    const balance = paymentBalance(total, payments);
    let sourceRef, source;
    if (tenantId && movement.origenId && ['ventas', 'pos', 'compras'].includes(movement.origen)) {
      sourceRef = api.doc(db, 'artifacts', tenantId, 'public', 'data', 'finances_transactions', movement.origenId);
      source = (await tx.get(sourceRef)).data();
      if (!source || source.sriStatus === 'anulado') throw new Error('El documento de origen no está disponible para abonar.');
    }
    let bankRef;
    if (payment.cuentaId) {
      bankRef = ref('fin_bancos', payment.cuentaId);
      const bank = (await tx.get(bankRef)).data();
      if (!bank || bank.estado !== 'activo') throw new Error('La cuenta bancaria está inactiva o no existe.');
    }
    const state = { saldoPendiente: balance.saldoPendiente, estado: balance.estado, actualizadoEn: api.serverTimestamp() };
    tx.update(movementRef, { ...state, pagos: payments });
    if (obligationRef) tx.update(obligationRef, { ...state, abonos: payments });
    if (source) tx.update(sourceRef, { paidAmount: balance.paid, paymentStatus: balance.estado === 'pagado' ? 'pagado' : 'pendiente', outstandingBalance: balance.saldoPendiente, updatedAt: new Date().toISOString() });
    if (bankRef) {
      tx.update(bankRef, { updatedAt: api.serverTimestamp() });
      tx.set(ref('fin_movimientos_bancarios', `abono_${paymentId}`), { cuentaId: payment.cuentaId, tipo: movement.tipo === 'ingreso' ? 'credito' : 'debito', monto: amount, fecha: new Date(newPayment.fecha), descripcion: 'Abono ' + (movement.documento?.numero || movementId), referencia: newPayment.referencia, conciliado: true, movimientoId: movementId, pagoId: paymentId, createdAt: api.serverTimestamp() });
    }
    tx.set(ref('fin_auditoria', `abono_${paymentId}`), { coleccion: target.collection, documentoId: target.id, accion: 'abonar', usuario: user.uid || '', usuarioEmail: user.email || '', fecha: api.serverTimestamp(), cambios: { abono: newPayment, saldoNuevo: balance.saldoPendiente }, modulo: 'finanzas' });
    return { ...(obligation || movement), ...state, pagos: payments, abonos: payments };
  });
}
