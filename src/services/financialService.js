/**
 * financialService.js
 * Servicio central de cálculos financieros para proyectos-webfix ERP.
 * Todas las funciones son PURAS: reciben arrays y retornan métricas derivadas.
 * Sin efectos secundarios. Sin llamadas a Firebase.
 */

// ─── MÉTRICAS DEL DASHBOARD ───────────────────────────────────────────────────

/**
 * Calcula KPIs principales del dashboard financiero.
 * @param {Array} transactions - Documentos de finances_transactions
 * @param {Array} bankAccounts - Documentos de financial_banks
 * @param {Array} financialCards - Documentos de financial_cards
 */
export function calcDashboardMetrics(transactions = [], bankAccounts = [], financialCards = []) {
  const totalIngresos = transactions
    .filter(t => t.type === 'ingreso' && t.sriStatus !== 'anulado')
    .reduce((s, t) => s + (Number(t.total) || 0), 0);

  const totalGastos = transactions
    .filter(t => t.type === 'egreso' && t.sriStatus !== 'anulado')
    .reduce((s, t) => s + (Number(t.total) || 0), 0);

  const cxcPendiente = transactions
    .filter(t => t.type === 'ingreso' && t.paymentStatus !== 'pagado' && t.sriStatus !== 'anulado')
    .reduce((s, t) => s + Math.max(0, (Number(t.total) || 0) - (Number(t.paidAmount) || 0)), 0);

  const cxpPendiente = transactions
    .filter(t => t.type === 'egreso' && t.paymentStatus !== 'pagado' && t.sriStatus !== 'anulado')
    .reduce((s, t) => s + Math.max(0, (Number(t.total) || 0) - (Number(t.paidAmount) || 0)), 0);

  const saldoBancos = bankAccounts.reduce((s, b) => s + (Number(b.saldo) || 0), 0);

  const gastosHormigaTotal = transactions
    .filter(t => t.type === 'egreso' && Number(t.total) < 20 && t.sriStatus !== 'anulado')
    .reduce((s, t) => s + (Number(t.total) || 0), 0);

  const cupoTarjetasUsado = financialCards
    .reduce((s, c) => s + (Number(c.usedAmount) || 0), 0);

  const flujoCajaProyectado = saldoBancos + cxcPendiente - cxpPendiente;

  return {
    totalIngresos,
    totalGastos,
    utilidadNeta: totalIngresos - totalGastos,
    cxcPendiente,
    cxpPendiente,
    saldoBancos,
    gastosHormigaTotal,
    cupoTarjetasUsado,
    flujoCajaProyectado
  };
}

// ─── ALERTAS ──────────────────────────────────────────────────────────────────

/**
 * Genera lista de alertas de vencimientos.
 * @param {Array} transactions
 */
export function calcAlerts(transactions = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts = [];

  transactions
    .filter(t => t.paymentStatus !== 'pagado' && t.dueDate && t.sriStatus !== 'anulado')
    .forEach(t => {
      const due = new Date(t.dueDate + 'T00:00:00');
      const diffDays = Math.ceil((due - today) / 86400000);
      if (diffDays < 0) {
        alerts.push({
          id: t.id,
          type: 'error',
          title: `Vencido: ${t.thirdPartyName || 'Sin tercero'} — ${t.documentNumber || 'Sin nro'}`,
          detail: `Hace ${Math.abs(diffDays)} días | $${(Number(t.total) - Number(t.paidAmount || 0)).toFixed(2)}`
        });
      } else if (diffDays <= 7) {
        alerts.push({
          id: t.id,
          type: 'warning',
          title: `Vence en ${diffDays} día(s): ${t.thirdPartyName || 'Sin tercero'}`,
          detail: `${t.documentNumber || 'Sin nro'} | $${(Number(t.total) - Number(t.paidAmount || 0)).toFixed(2)}`
        });
      }
    });

  return alerts.sort((a) => a.type === 'error' ? -1 : 1);
}

// ─── FILTROS ──────────────────────────────────────────────────────────────────

/**
 * Aplica filtros a las transacciones.
 * @param {Array} transactions
 * @param {Object} filters
 */
export function applyFilters(transactions = [], filters = {}) {
  const {
    search = '',
    type = 'all',
    documentType = 'all',
    paymentStatus = 'all',
    sriStatus = 'all',
    dateFrom = '',
    dateTo = '',
    month = '',
    year = '',
    thirdPartyId = '',
    sourceModule = 'all',
    category = 'all'
  } = filters;

  return transactions.filter(t => {
    if (type !== 'all' && t.type !== type) return false;
    if (documentType !== 'all' && t.documentType !== documentType) return false;
    if (paymentStatus !== 'all' && t.paymentStatus !== paymentStatus) return false;
    if (sriStatus !== 'all' && t.sriStatus !== sriStatus) return false;
    if (sourceModule !== 'all' && (t.sourceModule || 'manual') !== sourceModule) return false;
    if (category !== 'all' && t.category !== category) return false;
    if (thirdPartyId && t.thirdPartyId !== thirdPartyId) return false;
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    if (month && (t.date || '').substring(5, 7) !== String(month).padStart(2, '0')) return false;
    if (year && !(t.date || '').startsWith(String(year))) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${t.documentNumber || ''} ${t.thirdPartyName || ''} ${t.description || ''} ${t.category || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ─── REPORTES TRIBUTARIOS ─────────────────────────────────────────────────────

/**
 * Datos para el ATS (Anexo Transaccional Simplificado) - Ecuador.
 * @param {Array} transactions
 */
export function calcAtsData(transactions = []) {
  const ventas = transactions.filter(t =>
    t.type === 'ingreso' && t.sriStatus !== 'anulado' &&
    ['factura', 'nota_credito', 'nota_debito'].includes(t.documentType)
  );

  const compras = transactions.filter(t =>
    t.type === 'egreso' && t.sriStatus !== 'anulado' &&
    ['factura', 'nota_credito', 'nota_debito', 'liquidacion'].includes(t.documentType)
  );

  const totalVentasBase = ventas.reduce((s, t) => s + (Number(t.baseImponible) || 0), 0);
  const totalVentasIva = ventas.reduce((s, t) => s + (Number(t.ivaValor) || 0), 0);
  const totalComprasBase = compras.reduce((s, t) => s + (Number(t.baseImponible) || 0), 0);
  const totalComprasIva = compras.reduce((s, t) => s + (Number(t.ivaValor) || 0), 0);
  const creditoTributario = totalComprasIva;
  const ivaACancelar = Math.max(0, totalVentasIva - creditoTributario);

  return {
    ventas,
    compras,
    totalVentasBase,
    totalVentasIva,
    totalComprasBase,
    totalComprasIva,
    creditoTributario,
    ivaACancelar,
    retencionesEmitidas: transactions.filter(t =>
      t.type === 'ingreso' && t.documentType === 'retencion' && t.sriStatus !== 'anulado'),
    retencionesRecibidas: transactions.filter(t =>
      t.type === 'egreso' && t.documentType === 'retencion' && t.sriStatus !== 'anulado'),
    docsAnulados: transactions.filter(t => t.sriStatus === 'anulado'),
    docsPendientes: transactions.filter(t => t.sriStatus === 'pendiente'),
    docsAutorizados: transactions.filter(t => t.sriStatus === 'autorizado')
  };
}

// ─── CONTABILIDAD ─────────────────────────────────────────────────────────────

/**
 * Genera asiento contable propuesto a partir de una transacción.
 * Plan de cuentas base Ecuador NIIF PYMES.
 * @param {Object} tx - Documento de finances_transactions
 */
export function generarAsientoContable(tx) {
  if (!tx) return null;
  const isIngreso = tx.type === 'ingreso';
  const base = Number(tx.baseImponible) || 0;
  const iva = Number(tx.ivaValor) || 0;
  const retFuente = Number(tx.retencionFuente) || 0;
  const retIva = Number(tx.retencionIva) || 0;
  const neto = (Number(tx.total) || 0) - retFuente - retIva;
  const cuentas = [];

  if (isIngreso) {
    const cuentaCaja = tx.paymentStatus === 'pagado' ? '1.1.01' : '1.1.03';
    const nombreCaja = tx.paymentStatus === 'pagado' ? 'Caja / Banco' : 'CXC Clientes';
    cuentas.push({ cuentaCodigo: cuentaCaja, cuentaNombre: nombreCaja, debe: neto, haber: 0 });
    if (retFuente > 0) cuentas.push({ cuentaCodigo: '1.1.04', cuentaNombre: 'Ret. Fuente a Favor', debe: retFuente, haber: 0 });
    if (retIva > 0) cuentas.push({ cuentaCodigo: '1.1.04', cuentaNombre: 'Ret. IVA a Favor', debe: retIva, haber: 0 });
    cuentas.push({ cuentaCodigo: '4.1.01', cuentaNombre: 'Ingresos por Ventas', debe: 0, haber: base });
    if (iva > 0) cuentas.push({ cuentaCodigo: '2.1.03', cuentaNombre: 'IVA Ventas por Pagar', debe: 0, haber: iva });
  } else {
    cuentas.push({ cuentaCodigo: '5.2.01', cuentaNombre: 'Gastos Operativos / Compras', debe: base, haber: 0 });
    if (iva > 0) cuentas.push({ cuentaCodigo: '1.1.04', cuentaNombre: 'Crédito Tributario IVA', debe: iva, haber: 0 });
    const cuentaPago = tx.paymentStatus === 'pagado' ? '1.1.02' : '2.1.01';
    const nombrePago = tx.paymentStatus === 'pagado' ? 'Bancos / Caja' : 'CXP Proveedores';
    cuentas.push({ cuentaCodigo: cuentaPago, cuentaNombre: nombrePago, debe: 0, haber: neto });
    if (retFuente > 0) cuentas.push({ cuentaCodigo: '2.1.03', cuentaNombre: 'Ret. Fuente Retenida', debe: 0, haber: retFuente });
    if (retIva > 0) cuentas.push({ cuentaCodigo: '2.1.03', cuentaNombre: 'Ret. IVA Retenida', debe: 0, haber: retIva });
  }

  return {
    txId: tx.id,
    date: tx.date,
    description: tx.description || tx.documentNumber || 'Sin descripción',
    cuentas,
    totalDebe: cuentas.reduce((s, c) => s + c.debe, 0),
    totalHaber: cuentas.reduce((s, c) => s + c.haber, 0)
  };
}

// ─── REPORTES GERENCIALES ─────────────────────────────────────────────────────

/**
 * Rentabilidad por cliente.
 * @param {Array} transactions
 */
export function calcRentabilidadPorCliente(transactions = []) {
  const mapa = {};
  transactions
    .filter(t => t.type === 'ingreso' && t.sriStatus !== 'anulado')
    .forEach(t => {
      const key = t.thirdPartyId || t.thirdPartyName || 'Sin tercero';
      if (!mapa[key]) mapa[key] = { thirdPartyId: key, name: t.thirdPartyName || key, total: 0, count: 0 };
      mapa[key].total += Number(t.total) || 0;
      mapa[key].count++;
    });
  return Object.values(mapa).sort((a, b) => b.total - a.total);
}

/**
 * Gastos por categoría.
 * @param {Array} transactions
 */
export function calcGastosPorCategoria(transactions = []) {
  const mapa = {};
  transactions
    .filter(t => t.type === 'egreso' && t.sriStatus !== 'anulado')
    .forEach(t => {
      const cat = t.category || 'Sin categoría';
      if (!mapa[cat]) mapa[cat] = { category: cat, total: 0, count: 0 };
      mapa[cat].total += Number(t.total) || 0;
      mapa[cat].count++;
    });
  return Object.values(mapa).sort((a, b) => b.total - a.total);
}

// ─── FORMATO ─────────────────────────────────────────────────────────────────

/**
 * Formatea un número como moneda USD en español Ecuador.
 * @param {number} val
 */
export const formatMoney = (val) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(val) || 0);

/**
 * Formatea una fecha 'YYYY-MM-DD' como 'DD/MM/YYYY'.
 * @param {string} dateStr
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};
