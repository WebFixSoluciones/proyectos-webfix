import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, ReceiptText, ArrowDownCircle, ArrowUpCircle, CreditCard, 
  Sparkles, BookOpen, FileText, Banknote, Plus, Upload, CheckCircle2, 
  AlertTriangle, Download, RefreshCw, X, ShieldAlert, PieChart, Layers, 
  Building2, Calendar, FileSpreadsheet, Check, ArrowRight
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, appId } from '../../firebase';
import { analizarComprobanteConGemini, parsearXMLComprobante } from '../../services/geminiService';
import { getEcuadorDateString } from '../../services/sriService';
import { downloadSriAtsXml } from '../../services/SriAtsExporter';

// --- ÁREAS DEL MÓDULO UNIFICADO ---
const AREAS = {
  dashboard: { id: 'dashboard', label: 'Resumen financiero', icon: Landmark, desc: 'Saldos de bancos, cajas, utilidad, flujo de caja y alertas' },
  movimientos: { id: 'movimientos', label: 'Movimientos', icon: ReceiptText, desc: 'Registro único central de ingresos, gastos, transferencias y ajustes' },
  cxc: { id: 'cxc', label: 'Cuentas por cobrar', icon: ArrowDownCircle, desc: 'Cartera de clientes, facturas abiertas, abonos y vencimientos' },
  cxp: { id: 'cxp', label: 'Cuentas por pagar', icon: ArrowUpCircle, desc: 'Obligaciones con proveedores, cuotas, retenciones y prioridades de pago' },
  tarjetas_creditos: { id: 'tarjetas_creditos', label: 'Tarjetas y créditos', icon: CreditCard, desc: 'Tarjetas empresariales/personales, cupos, cortes, diferidos y préstamos' },
  captura_inteligente: { id: 'captura_inteligente', label: 'Captura inteligente (IA)', icon: Sparkles, desc: 'Lectura OCR de fotos, PDF y XML con confirmación humana requerida' },
  contabilidad: { id: 'contabilidad', label: 'Contabilidad', icon: BookOpen, desc: 'Plan de cuentas, asientos automáticos derivados, libro diario y cierres' },
  impuestos_sri: { id: 'impuestos_sri', label: 'Impuestos & SRI (ATS)', desc: 'Compras, ventas, crédito tributario e informe ATS XML para el SRI' },
  reports: { id: 'reports', label: 'Reportes', icon: Banknote, desc: 'Estado de resultados, flujo de caja, gastos hormiga y rentabilidad' }
};

// Plan de cuentas base (Ecuador)
const PLAN_DE_CUENTAS = [
  { codigo: '1.1.01', nombre: 'Caja Chica y Efectivo', tipo: 'Activo' },
  { codigo: '1.1.02', nombre: 'Bancos y Cuentas de Ahorro/Corriente', tipo: 'Activo' },
  { codigo: '1.1.03', nombre: 'Cuentas por Cobrar Clientes', tipo: 'Activo' },
  { codigo: '1.1.04', nombre: 'Crédito Tributario IVA Compras', tipo: 'Activo' },
  { codigo: '2.1.01', nombre: 'Cuentas por Pagar Proveedores', tipo: 'Pasivo' },
  { codigo: '2.1.02', nombre: 'Tarjetas de Crédito y Préstamos', tipo: 'Pasivo' },
  { codigo: '2.1.03', nombre: 'Retenciones por Pagar SRI', tipo: 'Pasivo' },
  { codigo: '3.1.01', nombre: 'Capital / Patrimonio Empresa', tipo: 'Patrimonio' },
  { codigo: '4.1.01', nombre: 'Ingresos por Ventas de Servicios / Productos', tipo: 'Ingreso' },
  { codigo: '5.1.01', nombre: 'Costo de Ventas e Inventario', tipo: 'Costo' },
  { codigo: '5.2.01', nombre: 'Gastos Administrativos y Operativos', tipo: 'Gasto' },
  { codigo: '5.2.02', nombre: 'Gastos Hormiga y Consumos Menores', tipo: 'Gasto' },
  { codigo: '5.2.03', nombre: 'Gastos de Publicidad y Marketing', tipo: 'Gasto' }
];

const formatMoney = (val) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(val) || 0);

// Generador de asientos contables automáticos
function generarAsientoContable({ movementType, total, accountFrom, accountTo, category }) {
  const cashAccount = accountFrom || '1.1.02 Bancos';
  const isIngreso = movementType === 'ingreso' || movementType === 'cobro';
  
  const debeCuenta = isIngreso ? cashAccount : (movementType === 'transferencia' ? (accountTo || '1.1.01 Caja') : category || '5.2.01 Gastos Administrativos');
  const haberCuenta = isIngreso ? '4.1.01 Ingresos por Ventas' : (movementType === 'transferencia' ? cashAccount : cashAccount);

  return {
    asientoId: `ASI_${Date.now().toString().slice(-6)}`,
    estado: 'aprobado',
    cuentas: [
      { cuentaCodigo: 'DEBE', cuentaNombre: debeCuenta, debe: Number(total) || 0, haber: 0 },
      { cuentaCodigo: 'HABER', cuentaNombre: haberCuenta, debe: 0, haber: Number(total) || 0 }
    ]
  };
}

const resolveAreaKey = (key) => {
  if (!key) return 'dashboard';
  const aliases = {
    sri_docs: 'impuestos_sri',
    compras_resumen: 'movimientos',
    gastos_creditos_sub: 'tarjetas_creditos',
    gastos_ia: 'captura_inteligente',
    compras_retencion: 'impuestos_sri'
  };
  const resolved = aliases[key] || key;
  return AREAS[resolved] ? resolved : 'dashboard';
};

export default function FinancialControlModule({ initialSubTab = 'dashboard', showToast, transactions = [], thirdParties = [], companyProfile = {} }) {
  const [activeArea, setActiveArea] = useState(() => resolveAreaKey(initialSubTab));

  useEffect(() => {
    setActiveArea(resolveAreaKey(initialSubTab));
  }, [initialSubTab]);

  // Colecciones adicionales de tesorería y tarjetas
  const [financialCards, setFinancialCards] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  
  // Estados para formularios y modales
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedMovementForPay, setSelectedMovementForPay] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Estado para la Captura Inteligente IA
  const [captureState, setCaptureState] = useState({
    file: null,
    loading: false,
    data: null,
    warnings: []
  });

  // Cargar tarjetas y cuentas bancarias de Firestore
  useEffect(() => {
    const unsubCards = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'financial_cards'), (snap) => {
      setFinancialCards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Firestore financial_cards sub error:", err));

    const unsubBanks = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'financial_banks'), (snap) => {
      setBankAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Firestore financial_banks sub error:", err));

    return () => {
      unsubCards();
      unsubBanks();
    };
  }, []);

  // --- NÚCLEO ÚNICO CENTRAL DE MOVIMIENTOS ---
  const movements = useMemo(() => {
    return transactions.map(tx => {
      const total = Number(tx.total ?? tx.amount ?? 0);
      const isIngreso = tx.type === 'ingreso' || tx.movementType === 'ingreso' || tx.movementType === 'cobro';
      const movementType = tx.movementType || (isIngreso ? 'ingreso' : 'gasto');
      const isGastoHormiga = Boolean(tx.isGastoHormiga || (!isIngreso && total <= 20));

      return {
        ...tx,
        id: tx.id,
        date: tx.date || getEcuadorDateString(),
        movementType,
        type: isIngreso ? 'ingreso' : 'egreso',
        total,
        paidAmount: Number(tx.paidAmount) || (tx.paymentStatus === 'pagado' ? total : 0),
        paymentStatus: tx.paymentStatus || (tx.paidAmount >= total ? 'pagado' : 'pendiente'),
        approvalStatus: tx.approvalStatus || 'aprobado',
        thirdPartyName: tx.thirdPartyName || thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || tx.razonSocial || 'Consumidor Final',
        thirdPartyRuc: tx.thirdPartyRuc || tx.ruc || '',
        category: tx.category || 'gastos_operativos',
        accountFrom: tx.accountFrom || tx.paymentMethod || 'Caja / Banco',
        accountTo: tx.accountTo || '',
        isGastoHormiga,
        asientoContable: tx.asientoContable || generarAsientoContable({ movementType, total, accountFrom: tx.accountFrom, category: tx.category })
      };
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [transactions, thirdParties]);

  // --- CÁLCULOS Y MÉTRICAS FINANCIERAS ---
  const metrics = useMemo(() => {
    const aprobados = movements.filter(m => m.approvalStatus === 'aprobado');
    const totalIngresos = aprobados.filter(m => m.type === 'ingreso').reduce((acc, m) => acc + m.total, 0);
    const totalGastos = aprobados.filter(m => m.type === 'egreso').reduce((acc, m) => acc + m.total, 0);
    const utilidadNeta = totalIngresos - totalGastos;

    const cxcPendiente = movements
      .filter(m => m.type === 'ingreso' && m.paymentStatus !== 'pagado')
      .reduce((acc, m) => acc + (m.total - m.paidAmount), 0);

    const cxpPendiente = movements
      .filter(m => m.type === 'egreso' && m.paymentStatus !== 'pagado')
      .reduce((acc, m) => acc + (m.total - m.paidAmount), 0);

    const gastosHormigaTotal = aprobados
      .filter(m => m.type === 'egreso' && m.isGastoHormiga)
      .reduce((acc, m) => acc + m.total, 0);

    const cupoTarjetasUsado = financialCards.reduce((acc, c) => acc + Number(c.saldoUsado || 0), 0);

    return {
      totalIngresos,
      totalGastos,
      utilidadNeta,
      cxcPendiente,
      cxpPendiente,
      gastosHormigaTotal,
      cupoTarjetasUsado,
      flujoCajaProyectado: utilidadNeta + cxcPendiente - cxpPendiente
    };
  }, [movements, financialCards]);

  // Alertas de vencimientos y gastos inusuales
  const alertList = useMemo(() => {
    const today = getEcuadorDateString();
    const alerts = [];

    // Vencimientos CXP
    movements.forEach(m => {
      if (m.paymentStatus !== 'pagado' && m.dueDate && m.dueDate < today) {
        alerts.push({
          id: `venc_${m.id}`,
          type: 'error',
          title: `Pago vencido: ${m.thirdPartyName}`,
          detail: `Documento ${m.documentNumber || m.description} venció el ${m.dueDate} por ${formatMoney(m.total - m.paidAmount)}.`
        });
      }
    });

    // Gastos Inusuales (Egresos > $500)
    movements.forEach(m => {
      if (m.type === 'egreso' && m.total > 500 && m.date === today) {
        alerts.push({
          id: `inusual_${m.id}`,
          type: 'warning',
          title: `Gasto inusual detectado`,
          detail: `Gasto de ${formatMoney(m.total)} registrado en ${m.thirdPartyName} (${m.category}).`
        });
      }
    });

    return alerts;
  }, [movements]);

  // --- GUARDAR NUEVO MOVIMIENTO CENTRAL ---
  const handleSaveMovement = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const total = Number(formData.get('total'));

    if (!total || total <= 0) {
      showToast?.('Ingresa un monto válido mayor a 0.', 'error');
      return;
    }

    const movementType = formData.get('movementType');
    const isIngreso = ['ingreso', 'cobro'].includes(movementType);
    const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const payload = {
      id,
      financialSchemaVersion: 3,
      source: 'control_financiero',
      movementType,
      type: isIngreso ? 'ingreso' : 'egreso',
      date: formData.get('date') || getEcuadorDateString(),
      dueDate: formData.get('dueDate') || null,
      total,
      baseImponible: Number(formData.get('baseImponible')) || total,
      ivaValor: Number(formData.get('ivaValor')) || 0,
      category: formData.get('category') || 'gastos_operativos',
      description: formData.get('description') || '',
      thirdPartyId: formData.get('thirdPartyId') || '',
      thirdPartyName: thirdParties.find(tp => tp.id === formData.get('thirdPartyId'))?.name || formData.get('customThirdParty') || 'Consumidor Final',
      accountFrom: formData.get('accountFrom') || 'Caja Chica / Efectivo',
      accountTo: formData.get('accountTo') || '',
      paymentMethod: formData.get('paymentMethod') || 'efectivo',
      cardId: formData.get('cardId') || '',
      paymentStatus: formData.get('paymentStatus') || 'pagado',
      paidAmount: formData.get('paymentStatus') === 'pagado' ? total : 0,
      approvalStatus: 'aprobado',
      isGastoHormiga: !isIngreso && total <= 20,
      asientoContable: generarAsientoContable({
        movementType,
        total,
        accountFrom: formData.get('accountFrom'),
        accountTo: formData.get('accountTo'),
        category: formData.get('category')
      }),
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', id), payload);
      setIsMovementModalOpen(false);
      showToast?.('Movimiento registrado e integrado al sistema correctamente.', 'success');
    } catch (err) {
      console.error("Error guardando movimiento:", err);
      showToast?.('Error al registrar movimiento.', 'error');
    }
  };

  // --- CAPTURA INTELIGENTE CON IA (OCR GEMINI + CONFIRMACIÓN HUMANA) ---
  const handleSelectFileForIa = async (file) => {
    if (!file) return;
    setCaptureState({ file, loading: true, data: null, warnings: [] });

    try {
      let result;
      if (file.name.toLowerCase().endsWith('.xml')) {
        const xmlText = await file.text();
        const parsedXml = parsearXMLComprobante(xmlText);
        if (parsedXml.success) {
          result = parsedXml.data;
        } else {
          throw new Error(parsedXml.error || 'Error al analizar el archivo XML.');
        }
      } else {
        result = await analizarComprobanteConGemini(file);
      }

      // Validaciones y advertencias previas
      const warnings = [];
      if (!result.ruc) warnings.push("Falta el RUC del emisor en el comprobante.");
      if (!result.documentNumber) warnings.push("No se pudo detectar el número de serie/comprobante.");
      
      // Buscar duplicado en Firestore
      const duplicate = movements.find(m => m.documentNumber && m.documentNumber === result.documentNumber && m.thirdPartyRuc === result.ruc);
      if (duplicate) {
        warnings.push(`¡ADVERTENCIA! Este comprobante (${result.documentNumber}) ya fue registrado anteriormente.`);
      }

      setCaptureState({
        file,
        loading: false,
        data: {
          ...result,
          movementType: result.total > 0 && (result.category === 'ventas' || result.type === 'ingreso') ? 'ingreso' : 'gasto',
          isGastoHormiga: (Number(result.total) || 0) <= 20
        },
        warnings
      });
    } catch (err) {
      console.error(err);
      setCaptureState({ file: null, loading: false, data: null, warnings: [] });
      showToast?.(err.message || 'No se pudo leer el archivo adjunto con la IA.', 'error');
    }
  };

  // Confirmación Humana de la Captura Inteligente
  const handleApproveIaCapture = async () => {
    if (!captureState.data) return;
    const data = captureState.data;
    const id = `tx_ia_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    let evidenceUrl = '';
    if (captureState.file) {
      try {
        const evidenceRef = ref(storage, `financial-evidence/${appId}/${id}/${captureState.file.name}`);
        await uploadBytes(evidenceRef, captureState.file);
        evidenceUrl = await getDownloadURL(evidenceRef);
      } catch (e) {
        console.warn("No se pudo subir la imagen adjunta:", e);
      }
    }

    const total = Number(data.total) || 0;
    const isIngreso = data.movementType === 'ingreso';

    const payload = {
      id,
      financialSchemaVersion: 3,
      source: 'captura_inteligente_ia',
      movementType: isIngreso ? 'ingreso' : 'gasto',
      type: isIngreso ? 'ingreso' : 'egreso',
      date: data.date || getEcuadorDateString(),
      documentNumber: data.documentNumber || '',
      thirdPartyName: data.razonSocial || 'Proveedor Escaneado',
      thirdPartyRuc: data.ruc || '',
      category: data.category || 'gastos_operativos',
      description: `Comprobante verificado con IA: ${data.razonSocial || 'S/N'}`,
      baseImponible: Number(data.baseImponible) || total,
      ivaValor: Number(data.ivaValor) || 0,
      total,
      paymentMethod: data.paymentMethod || 'efectivo',
      paymentStatus: 'pagado',
      paidAmount: total,
      approvalStatus: 'aprobado',
      isGastoHormiga: !isIngreso && total <= 20,
      evidenciaAdjunta: {
        url: evidenceUrl,
        nombreArchivo: captureState.file?.name || ''
      },
      asientoContable: generarAsientoContable({
        movementType: isIngreso ? 'ingreso' : 'gasto',
        total,
        accountFrom: data.paymentMethod || 'Caja Chica',
        category: data.category
      }),
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', id), payload);
      setCaptureState({ file: null, loading: false, data: null, warnings: [] });
      showToast?.('Comprobante verificado y registrado en el Control Financiero.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Error al confirmar y guardar el registro.', 'error');
    }
  };

  // --- REGISTRAR ABONOS A CXC / CXP ---
  const handleSavePayment = async () => {
    if (!selectedMovementForPay || !paymentAmount || Number(paymentAmount) <= 0) return;
    const amount = Number(paymentAmount);
    const currentPaid = Number(selectedMovementForPay.paidAmount) || 0;
    const newPaidAmount = currentPaid + amount;
    const newStatus = newPaidAmount >= selectedMovementForPay.total - 0.01 ? 'pagado' : 'pendiente';

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', selectedMovementForPay.id), {
        paidAmount: newPaidAmount,
        paymentStatus: newStatus
      }, { merge: true });

      setSelectedMovementForPay(null);
      setPaymentAmount('');
      showToast?.(`Abono de ${formatMoney(amount)} registrado con éxito.`, 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Error al registrar abono.', 'error');
    }
  };

  // --- NUEVA TARJETA O CRÉDITO ---
  const handleSaveCard = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = `card_${Date.now()}`;

    const payload = {
      id,
      name: formData.get('name'),
      type: formData.get('type') || 'tarjeta',
      limit: Number(formData.get('limit')) || 0,
      closingDay: Number(formData.get('closingDay')) || 15,
      dueDay: Number(formData.get('dueDay')) || 5,
      saldoUsado: Number(formData.get('saldoUsado')) || 0,
      status: 'activa',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'financial_cards', id), payload);
      setIsCardModalOpen(false);
      showToast?.('Tarjeta o línea de crédito configurada.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Error al registrar tarjeta.', 'error');
    }
  };

  // --- VISTAS INTERNAS DEL MÓDULO CONTROL FINANCIERO ---
  const currentAreaInfo = AREAS[activeArea] || AREAS.dashboard;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 📌 NAVEGACIÓN PRINCIPAL DE ÁREAS DEL CONTROL FINANCIERO */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-3 custom-scrollbar">
        {Object.values(AREAS).map(area => {
          const Icon = area.icon;
          const isActive = activeArea === area.id;
          return (
            <button
              key={area.id}
              onClick={() => setActiveArea(area.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {Icon && typeof Icon === 'function' ? <Icon size={14} /> : null}
              <span>{area.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. AREA: RESUMEN FINANCIERO */}
      {activeArea === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">{currentAreaInfo.label}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{currentAreaInfo.desc}</p>
            </div>
            <button onClick={() => setIsMovementModalOpen(true)} className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer">
              <Plus size={14} /> Registrar Movimiento
            </button>
          </div>

          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Ingresos</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{formatMoney(metrics.totalIngresos)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Gastos</p>
              <p className="text-xl font-bold text-rose-600 mt-1">{formatMoney(metrics.totalGastos)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Utilidad Neta</p>
              <p className={`text-xl font-bold mt-1 ${metrics.utilidadNeta >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{formatMoney(metrics.utilidadNeta)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Flujo de Caja Proyectado</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{formatMoney(metrics.flujoCajaProyectado)}</p>
            </div>
          </div>

          {/* Alertas & Cartera */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">Alertas de Vencimientos & Gastos Inusuales</h3>
              </div>
              {alertList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No hay alertas ni pagos pendientes vencidos en este momento.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {alertList.map(al => (
                    <div key={al.id} className={`p-3 rounded-xl border text-xs ${al.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                      <p className="font-bold">{al.title}</p>
                      <p className="mt-0.5 opacity-90">{al.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Resumen de Cartera (CXC / CXP)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Por Cobrar (Clientes)</p>
                  <p className="text-lg font-bold text-emerald-900 mt-1">{formatMoney(metrics.cxcPendiente)}</p>
                </div>
                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80">
                  <p className="text-xs font-semibold text-rose-800 uppercase tracking-wide">Por Pagar (Proveedores)</p>
                  <p className="text-lg font-bold text-rose-900 mt-1">{formatMoney(metrics.cxpPendiente)}</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Consumo Acumulado de Gastos Hormiga:</span>
                <span className="font-bold text-amber-700">{formatMoney(metrics.gastosHormigaTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. AREA: MOVIMIENTOS FINANCIEROS */}
      {activeArea === 'movimientos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registro Único de Movimientos Financieros</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ingresos, egresos, transferencias, consumos de tarjeta y ajustes internos.</p>
            </div>
            <button onClick={() => setIsMovementModalOpen(true)} className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer">
              <Plus size={14} /> Nuevo Movimiento
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Detalle / Tercero</th>
                  <th className="py-3 px-4">Cuenta / Método</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-slate-400">No hay movimientos registrados.</td></tr>
                ) : (
                  movements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">{m.date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.type === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {m.movementType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{m.description || m.documentNumber || 'Movimiento'}</p>
                        <p className="text-[10px] text-slate-400">{m.thirdPartyName} • {m.category}</p>
                      </td>
                      <td className="py-3 px-4 font-medium">{m.accountFrom}</td>
                      <td className={`py-3 px-4 text-right font-bold ${m.type === 'ingreso' ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {m.type === 'ingreso' ? '+' : '-'}{formatMoney(m.total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.paymentStatus === 'pagado' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {m.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. AREA: CUENTAS POR COBRAR (CXC) */}
      {activeArea === 'cxc' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cuentas por Cobrar (Clientes)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Seguimiento de facturas abiertas, abonos parciales y cartera de clientes.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Comprobante</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.filter(m => m.type === 'ingreso' && m.paymentStatus !== 'pagado').length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-slate-400">No hay cuentas por cobrar pendientes.</td></tr>
                ) : (
                  movements.filter(m => m.type === 'ingreso' && m.paymentStatus !== 'pagado').map(m => {
                    const saldo = m.total - m.paidAmount;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{m.thirdPartyName}</td>
                        <td className="py-3 px-4 font-mono">{m.documentNumber || m.description}</td>
                        <td className="py-3 px-4">{m.dueDate || 'Sin fecha'}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatMoney(m.total)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatMoney(saldo)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => { setSelectedMovementForPay(m); setPaymentAmount(saldo.toFixed(2)); }}
                            className="px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                          >
                            Registrar Abono
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AREA: CUENTAS POR PAGAR (CXP) */}
      {activeArea === 'cxp' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cuentas por Pagar (Proveedores)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Compromisos de pago a proveedores, cuotas, retenciones y prioridades.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Comprobante</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.filter(m => m.type === 'egreso' && m.paymentStatus !== 'pagado').length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-slate-400">No hay cuentas por pagar pendientes.</td></tr>
                ) : (
                  movements.filter(m => m.type === 'egreso' && m.paymentStatus !== 'pagado').map(m => {
                    const saldo = m.total - m.paidAmount;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">{m.thirdPartyName}</td>
                        <td className="py-3 px-4 font-mono">{m.documentNumber || m.description}</td>
                        <td className="py-3 px-4">{m.dueDate || 'Sin fecha'}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatMoney(m.total)}</td>
                        <td className="py-3 px-4 text-right font-bold text-rose-700">{formatMoney(saldo)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => { setSelectedMovementForPay(m); setPaymentAmount(saldo.toFixed(2)); }}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Pagar Cuota/Abono
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. AREA: TARJETAS Y CRÉDITOS */}
      {activeArea === 'tarjetas_creditos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tarjetas de Crédito & Líneas de Financiamiento</h2>
              <p className="text-xs text-slate-500 mt-0.5">Control de consumos corporativos, fechas de corte, días de pago y compras diferidas.</p>
            </div>
            <button onClick={() => setIsCardModalOpen(true)} className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer">
              <Plus size={14} /> Nueva Tarjeta / Crédito
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialCards.length === 0 ? (
              <div className="col-span-full p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No hay tarjetas registradas. Agrega tu tarjeta empresarial o personal para controlar cupos e intereses.
              </div>
            ) : (
              financialCards.map(c => (
                <div key={c.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-primary" />
                      <span className="font-bold text-xs text-slate-800">{c.name}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">{c.type}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Cupo Total:</span>
                      <span className="font-bold text-slate-800">{formatMoney(c.limit)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Fechas:</span>
                      <span className="font-semibold text-slate-700">Corte: día {c.closingDay} • Pago: día {c.dueDay}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. AREA: CAPTURA INTELIGENTE (IA OCR + CONFIRMACIÓN HUMANA) */}
      {activeArea === 'captura_inteligente' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Captura Inteligente con IA (Fotos, PDF y XML)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Gemini Vision OCR extrae datos y sugiere la clasificación. La confirmación humana siempre es requerida antes de guardar.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Zona de Carga */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <Upload size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Subir foto de ticket, factura o XML</p>
                <p className="text-xs text-slate-500 mt-1">Soporta PNG, JPG, PDF o XML del SRI</p>
              </div>
              <input
                type="file"
                accept="image/*,application/pdf,.xml,text/xml"
                onChange={(e) => handleSelectFileForIa(e.target.files?.[0])}
                className="hidden"
                id="ia-file-input"
              />
              <label
                htmlFor="ia-file-input"
                className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles size={14} /> Seleccionar Archivo
              </label>
              {captureState.loading && (
                <p className="text-xs font-semibold text-primary animate-pulse flex items-center gap-1.5">
                  <RefreshCw size={14} className="animate-spin" /> Analizando comprobante con Gemini IA...
                </p>
              )}
            </div>

            {/* Resultado & Confirmación Humana */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Propuesta de Registro Extraída</h3>
              {!captureState.data ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Selecciona una foto o archivo para visualizar la propuesta extraída por la IA.
                </div>
              ) : (
                <div className="space-y-4">
                  {captureState.warnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                      {captureState.warnings.map((w, i) => <p key={i} className="font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {w}</p>)}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div><span className="text-slate-400 block">Proveedor/Emisor:</span><span className="font-bold text-slate-800">{captureState.data.razonSocial || 'N/A'}</span></div>
                    <div><span className="text-slate-400 block">RUC/Cédula:</span><span className="font-bold text-slate-800">{captureState.data.ruc || 'N/A'}</span></div>
                    <div><span className="text-slate-400 block">Comprobante Nro:</span><span className="font-mono text-slate-800">{captureState.data.documentNumber || 'N/A'}</span></div>
                    <div><span className="text-slate-400 block">Fecha:</span><span className="font-bold text-slate-800">{captureState.data.date || 'Hoy'}</span></div>
                    <div><span className="text-slate-400 block">Categoría Sugerida:</span><span className="font-bold text-primary">{captureState.data.category || 'gastos_operativos'}</span></div>
                    <div><span className="text-slate-400 block">Monto Total:</span><span className="font-bold text-emerald-700 text-sm">{formatMoney(captureState.data.total)}</span></div>
                  </div>

                  <button
                    onClick={handleApproveIaCapture}
                    className="w-full btn-primary py-2.5 text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Confirmar & Registrar Movimiento
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. AREA: CONTABILIDAD GENERAL */}
      {activeArea === 'contabilidad' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Contabilidad General & Plan de Cuentas</h2>
            <p className="text-xs text-slate-500 mt-0.5">Asientos automáticos derivados de cada movimiento financiero registrado.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan de Cuentas Base */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Plan de Cuentas Base (Ecuador)</h3>
              <div className="overflow-y-auto max-h-72 custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600">
                    <tr><th className="py-2 px-3">Código</th><th className="py-2 px-3">Nombre de Cuenta</th><th className="py-2 px-3">Tipo</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {PLAN_DE_CUENTAS.map(c => (
                      <tr key={c.codigo}><td className="py-2 px-3 font-mono font-bold text-primary">{c.codigo}</td><td className="py-2 px-3">{c.nombre}</td><td className="py-2 px-3 font-semibold">{c.tipo}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Asientos Derivados */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Asientos Automáticos Recientes</h3>
              <div className="overflow-y-auto max-h-72 custom-scrollbar space-y-3">
                {movements.slice(0, 8).map(m => (
                  <div key={m.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>{m.description || m.documentNumber || 'Asiento'}</span>
                      <span className="text-slate-500 font-mono">{m.date}</span>
                    </div>
                    {m.asientoContable?.cuentas?.map((c, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-600">
                        <span>{c.cuentaNombre}</span>
                        <span>{c.debe > 0 ? `DEBE: ${formatMoney(c.debe)}` : `HABER: ${formatMoney(c.haber)}`}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. AREA: IMPUESTOS & SRI (ATS XML) */}
      {activeArea === 'impuestos_sri' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Impuestos & Generación del ATS (SRI)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Exportación del Anexo Transaccional Simplificado en XML oficial normado por el SRI de Ecuador.</p>
            </div>
            <button
              onClick={() => downloadSriAtsXml({ companyProfile, year: new Date().getFullYear(), month: new Date().getMonth() + 1, transactions: movements })}
              className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer"
            >
              <Download size={14} /> Exportar ATS (XML Oficial SRI)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ventas Totales</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{formatMoney(metrics.totalIngresos)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Compras Totales</p>
              <p className="text-xl font-bold text-rose-600 mt-1">{formatMoney(metrics.totalGastos)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">IVA en Ventas</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{formatMoney(metrics.totalIngresos * 0.15)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Crédito Tributario IVA</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{formatMoney(metrics.totalGastos * 0.15)}</p>
            </div>
          </div>
        </div>
      )}

      {/* 9. AREA: REPORTES */}
      {activeArea === 'reports' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Reportes Financieros & Diagnóstico</h2>
            <p className="text-xs text-slate-500 mt-0.5">Informes de rentabilidad, desglose de gastos hormiga y exportaciones personalizadas.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Estado de Resultados (P&L)</p>
              <p className={`text-2xl font-bold ${metrics.utilidadNeta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatMoney(metrics.utilidadNeta)}
              </p>
              <p className="text-xs text-slate-400">Resultado Neto del Ejercicio</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Gastos Hormiga (Menores a $20)</p>
              <p className="text-2xl font-bold text-amber-700">{formatMoney(metrics.gastosHormigaTotal)}</p>
              <p className="text-xs text-slate-400">Total de consumos micro en el periodo</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Pasivos & Deudas en Tarjetas</p>
              <p className="text-2xl font-bold text-rose-700">{formatMoney(metrics.cupoTarjetasUsado)}</p>
              <p className="text-xs text-slate-400">Saldo usado en líneas de crédito</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR MOVIMIENTO */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setIsMovementModalOpen(false)}>
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">Registrar Movimiento Financiero</h3>
              <button onClick={() => setIsMovementModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveMovement} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo Movimiento</label>
                  <select name="movementType" className="glass-input-light w-full p-2 rounded-lg border">
                    <option value="gasto">Gasto / Egreso</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="transferencia">Transferencia entre cuentas</option>
                    <option value="cobro">Cobro a Cliente</option>
                    <option value="pago">Pago a Proveedor</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                  <input type="date" name="date" defaultValue={getEcuadorDateString()} required className="glass-input-light w-full p-2 rounded-lg border" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto Total ($)</label>
                  <input type="number" step="0.01" min="0.01" name="total" placeholder="0.00" required className="glass-input-light w-full p-2 rounded-lg border font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Vencimiento (opcional)</label>
                  <input type="date" name="dueDate" className="glass-input-light w-full p-2 rounded-lg border" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tercero (Cliente/Proveedor)</label>
                  <select name="thirdPartyId" className="glass-input-light w-full p-2 rounded-lg border">
                    <option value="">Consumidor Final / Sin Registro</option>
                    {thirdParties.map(tp => <option key={tp.id} value={tp.id}>{tp.name || tp.razonSocial}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                  <select name="category" className="glass-input-light w-full p-2 rounded-lg border">
                    <option value="gastos_operativos">Gastos Operativos</option>
                    <option value="gastos_administrativos">Gastos Administrativos</option>
                    <option value="gastos_marketing">Marketing y Publicidad</option>
                    <option value="gastos_hormiga">Gasto Hormiga / Consumo Menor</option>
                    <option value="ventas">Ingresos por Ventas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción / Detalle</label>
                <input type="text" name="description" placeholder="Ej. Pago de suministros de oficina" className="glass-input-light w-full p-2 rounded-lg border" />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsMovementModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">Cancelar</button>
                <button type="submit" className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer">Guardar Movimiento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ABONO */}
      {selectedMovementForPay && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setSelectedMovementForPay(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl space-y-4" onMouseDown={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900">Registrar Abono</h3>
            <p className="text-xs text-slate-500">
              Documento: <strong className="text-slate-800">{selectedMovementForPay.documentNumber || selectedMovementForPay.description}</strong>
            </p>
            <div>
              <label className="block font-bold text-xs text-slate-700 mb-1">Monto del Abono ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="glass-input-light w-full p-2 rounded-lg border font-bold text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedMovementForPay(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200">Cancelar</button>
              <button onClick={handleSavePayment} className="btn-primary px-3 py-1.5 text-xs font-semibold rounded-lg">Guardar Abono</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA TARJETA / CRÉDITO */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setIsCardModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">Configurar Tarjeta / Línea de Crédito</h3>
              <button onClick={() => setIsCardModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveCard} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de la Tarjeta/Línea</label>
                <input type="text" name="name" required placeholder="Ej. Visa Diners Club Corporativa" className="glass-input-light w-full p-2 rounded-lg border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cupo Total ($)</label>
                  <input type="number" step="0.01" name="limit" required placeholder="1000.00" className="glass-input-light w-full p-2 rounded-lg border" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo</label>
                  <select name="type" className="glass-input-light w-full p-2 rounded-lg border">
                    <option value="tarjeta">Tarjeta de Crédito</option>
                    <option value="linea_credito">Línea de Crédito</option>
                    <option value="prestamo">Préstamo Bancario</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Día de Corte</label>
                  <input type="number" min="1" max="31" name="closingDay" defaultValue="15" className="glass-input-light w-full p-2 rounded-lg border" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Día Máximo de Pago</label>
                  <input type="number" min="1" max="31" name="dueDay" defaultValue="5" className="glass-input-light w-full p-2 rounded-lg border" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsCardModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200">Cancelar</button>
                <button type="submit" className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl">Guardar Tarjeta</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
