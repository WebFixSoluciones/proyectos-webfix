import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { generarClaveAcceso, validarIdentificacion } from './sriService';
import { generateSriAtsXml, downloadSriAtsXml } from './SriAtsExporter';

const TX_COLLECTION = 'finances_transactions';

const VENCIMIENTOS_TRIBUTARIOS = [
  { tipo: 'IVA', dia: 14, descripcion: 'Declaración de IVA' },
  { tipo: 'Retenciones', dia: 14, descripcion: 'Declaración de Retenciones' },
  { tipo: 'Impuesto a la Renta', dia: 15, descripcion: 'Declaración de Impuesto a la Renta' },
  { tipo: 'ATS', dia: 14, descripcion: 'Anexo Transaccional Simplificado' },
];

export async function getTransaccionesPeriodo(db, year, month) {
  const mm = String(month).padStart(2, '0');
  const desde = `${year}-${mm}-01`;
  const ultimoDia = new Date(year, month, 0).getDate();
  const hasta = `${year}-${mm}-${String(ultimoDia).padStart(2, '0')}`;

  const q = query(
    collection(db, TX_COLLECTION),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  return todas.filter(t => {
    if (!t.date) return false;
    const d = typeof t.date === 'string' ? t.date : t.date?.toDate?.()?.toISOString?.()?.split('T')[0] || '';
    return d >= desde && d <= hasta;
  });
}

export async function calcularIva(db, year, month) {
  const txs = await getTransaccionesPeriodo(db, year, month);

  const ventas = txs.filter(t => t.type === 'ingreso');
  const compras = txs.filter(t => t.type === 'egreso');

  const ivaVentas = ventas.reduce((sum, v) => sum + (Number(v.ivaValor) || 0), 0);
  const ivaCompras = compras.reduce((sum, c) => sum + (Number(c.ivaValor) || 0), 0);
  const baseImponibleVentas = ventas.reduce((sum, v) => sum + (Number(v.baseImponible) || 0), 0);
  const baseImponibleCompras = compras.reduce((sum, c) => sum + (Number(c.baseImponible) || 0), 0);

  const diferencia = ivaVentas - ivaCompras;
  const aPagar = diferencia > 0 ? diferencia : 0;
  const creditoFiscal = diferencia < 0 ? Math.abs(diferencia) : 0;

  return {
    ventas: Math.round(ivaVentas * 100) / 100,
    compras: Math.round(ivaCompras * 100) / 100,
    baseImponibleVentas: Math.round(baseImponibleVentas * 100) / 100,
    baseImponibleCompras: Math.round(baseImponibleCompras * 100) / 100,
    aPagar: Math.round(aPagar * 100) / 100,
    creditoFiscal: Math.round(creditoFiscal * 100) / 100,
    totalVentas: Math.round(ventas.reduce((s, v) => s + (Number(v.total) || 0), 0) * 100) / 100,
    totalCompras: Math.round(compras.reduce((s, c) => s + (Number(c.total) || 0), 0) * 100) / 100,
    numVentas: ventas.length,
    numCompras: compras.length,
  };
}

export async function calcularRetenciones(db, year, month) {
  const txs = await getTransaccionesPeriodo(db, year, month);

  const retencionesFuente = txs.reduce((sum, t) => sum + (Number(t.retencionFuente) || 0), 0);
  const retencionesIva = txs.reduce((sum, t) => sum + (Number(t.retencionIva) || 0), 0);

  const conRetencion = txs.filter(t => (Number(t.retencionFuente) || 0) > 0 || (Number(t.retencionIva) || 0) > 0);

  return {
    fuente: Math.round(retencionesFuente * 100) / 100,
    iva: Math.round(retencionesIva * 100) / 100,
    total: Math.round((retencionesFuente + retencionesIva) * 100) / 100,
    documentosRetenidos: conRetencion.length,
    detalle: conRetencion.map(t => ({
      id: t.id,
      fecha: t.date,
      tipo: t.type,
      tercero: t.thirdPartyName || t.thirdPartyRuc || 'N/A',
      ruc: t.thirdPartyRuc || '',
      documento: t.documentNumber || '',
      baseImponible: Number(t.baseImponible) || 0,
      retencionFuente: Number(t.retencionFuente) || 0,
      retencionIva: Number(t.retencionIva) || 0,
    })),
  };
}

export async function getDocumentosSri(db, year, month) {
  const txs = await getTransaccionesPeriodo(db, year, month);

  const emitidos = txs.filter(t => t.type === 'ingreso');
  const recibidos = txs.filter(t => t.type === 'egreso');
  const autorizados = txs.filter(t => t.sriStatus === 'autorizado');
  const pendientes = txs.filter(t => t.sriStatus === 'pendiente' || !t.sriStatus);

  return {
    emitidos: emitidos.length,
    recibidos: recibidos.length,
    autorizados: autorizados.length,
    pendientes: pendientes.length,
    total: txs.length,
  };
}

export function getVencimientosMes(year, month) {
  return VENCIMIENTOS_TRIBUTARIOS.map(v => {
    const fecha = new Date(year, month - 1, v.dia);
    const ahora = new Date();
    const vencido = fecha < ahora;
    const diasRestantes = Math.ceil((fecha - ahora) / (1000 * 60 * 60 * 24));
    return {
      tipo: v.tipo,
      descripcion: v.descripcion,
      dia: v.dia,
      fecha: `${year}-${String(month).padStart(2, '0')}-${String(v.dia).padStart(2, '0')}`,
      vencido,
      diasRestantes,
      urgencia: vencido ? 'vencido' : diasRestantes <= 3 ? 'proximo' : 'ok',
    };
  });
}

export async function getResumenImpuestos(db, year, month) {
  const [iva, retenciones, documentos] = await Promise.all([
    calcularIva(db, year, month),
    calcularRetenciones(db, year, month),
    getDocumentosSri(db, year, month),
  ]);

  const vencimientos = getVencimientosMes(year, month);

  return { iva, retenciones, documentos, vencimientos };
}

export function validarRuc(ruc) {
  if (!ruc || typeof ruc !== 'string') return { valido: false, mensaje: 'RUC vacío' };
  const clean = ruc.trim();
  if (clean.length !== 13) return { valido: false, mensaje: 'El RUC debe tener 13 dígitos' };
  if (!clean.endsWith('001')) return { valido: false, mensaje: 'El RUC debe terminar en 001' };
  const valido = validarIdentificacion(clean, 'ruc');
  return valido ? { valido: true, mensaje: 'RUC válido' } : { valido: false, mensaje: 'Dígito verificador incorrecto' };
}

export function generarAtsXml(datos) {
  return generateSriAtsXml(datos);
}

export function descargarAtsXml(datos) {
  downloadSriAtsXml(datos);
}

export async function generarAtsCompleto(db, companyProfile, year, month) {
  const txs = await getTransaccionesPeriodo(db, year, month);
  const [iva, retenciones, documentos] = await Promise.all([
    calcularIva(db, year, month),
    calcularRetenciones(db, year, month),
    getDocumentosSri(db, year, month),
  ]);

  const rucsEnTx = [...new Set(txs.map(t => t.thirdPartyRuc).filter(Boolean))];
  const rucsInvalidos = rucsEnTx.filter(ruc => !validarRuc(ruc).valido && ruc !== '9999999999999');

  const xml = generateSriAtsXml({
    companyProfile,
    year: String(year),
    month: String(month),
    transactions: txs,
  });

  return {
    xml,
    resumen: { iva, retenciones, documentos },
    rucsInvalidos,
    totalDocumentos: txs.length,
    warnings: [
      ...(rucsInvalidos.length > 0 ? [`${rucsInvalidos.length} RUC(s) con validación pendiente`] : []),
      ...(documentos.pendientes > 0 ? [`${documentos.pendientes} documento(s) sin autorización SRI`] : []),
    ],
  };
}
