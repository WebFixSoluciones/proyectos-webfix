import React, { useState, useEffect } from 'react';
import { 
  CreditCard, DollarSign, Calendar, Landmark, ShoppingBag, Plus, 
  Trash2, FileText, CheckCircle2, AlertTriangle, RefreshCw, X, 
  ArrowDownCircle, ArrowUpCircle, History, TrendingUp
} from 'lucide-react';
import { doc, setDoc, collection, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

export default function GastosCreditosModule({ isDarkMode, showToast, transactions = [], thirdParties = [], db, appId }) {
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'pasivos' | 'historial_gastos'
  const [liabilities, setLiabilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para modal de agregar Pasivo
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLiability, setNewLiability] = useState({
    type: 'prestamo', // 'prestamo', 'credito_almacen', 'tarjeta_credito'
    entity: '',
    montoInicial: '',
    tasaInteres: '',
    plazoMeses: '',
    cuotaMensual: '',
    saldoPendiente: '',
    limiteCredito: '',
    fechaCorte: '',
    fechaPago: '',
    nextPaymentDate: new Date().toISOString().split('T')[0]
  });

  // Estados para modal de pago de cuota
  const [selectedLiability, setSelectedLiability] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [paymentRef, setPaymentRef] = useState('');

  // Cargar pasivos desde Firestore
  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_liabilities');
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiabilities(list);
      setLoading(false);
    }, (err) => {
      console.error("Error cargando pasivos:", err);
      setLoading(false);
    });
    return unsub;
  }, [appId, db]);

  // Guardar nuevo pasivo
  const handleAddLiability = async (e) => {
    e.preventDefault();
    if (!newLiability.entity.trim()) {
      showToast("Ingrese la entidad financiera u origen del crédito", "error");
      return;
    }

    try {
      const docId = `liability_${new Date().getTime()}`;
      const payload = {
        id: docId,
        type: newLiability.type,
        entity: newLiability.entity,
        montoInicial: Number(newLiability.montoInicial) || 0,
        saldoPendiente: Number(newLiability.saldoPendiente) || Number(newLiability.montoInicial) || 0,
        cuotaMensual: Number(newLiability.cuotaMensual) || 0,
        nextPaymentDate: newLiability.nextPaymentDate || '',
        createdAt: new Date().toISOString(),
        paymentsHistory: []
      };

      if (newLiability.type === 'prestamo') {
        payload.tasaInteres = Number(newLiability.tasaInteres) || 0;
        payload.plazoMeses = Number(newLiability.plazoMeses) || 0;
      } else if (newLiability.type === 'tarjeta_credito') {
        payload.limiteCredito = Number(newLiability.limiteCredito) || 0;
        payload.fechaCorte = newLiability.fechaCorte || '';
        payload.fechaPago = newLiability.fechaPago || '';
      } else if (newLiability.type === 'credito_almacen') {
        payload.limiteCredito = Number(newLiability.limiteCredito) || 0;
      }

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_liabilities', docId), payload);
      showToast("Pasivo financiero registrado correctamente", "success");
      setIsAddModalOpen(false);
      setNewLiability({
        type: 'prestamo', entity: '', montoInicial: '', tasaInteres: '',
        plazoMeses: '', cuotaMensual: '', saldoPendiente: '', limiteCredito: '',
        fechaCorte: '', fechaPago: '', nextPaymentDate: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error(err);
      showToast("Error al guardar el pasivo", "error");
    }
  };

  // Pagar cuota / abono de pasivo
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedLiability) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Monto de pago inválido", "error");
      return;
    }

    try {
      const currentPending = Number(selectedLiability.saldoPendiente) || 0;
      const nextPending = Math.max(0, currentPending - amount);

      const paymentLog = {
        id: `pay_${new Date().getTime()}`,
        amount,
        method: paymentMethod,
        reference: paymentRef || '',
        date: new Date().toISOString().split('T')[0]
      };

      const updatedHistory = [...(selectedLiability.paymentsHistory || []), paymentLog];

      // 1. Actualizar pasivo
      const liabRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_liabilities', selectedLiability.id);
      await setDoc(liabRef, {
        saldoPendiente: nextPending,
        paymentsHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Registrar en contabilidad automática (Egreso de tipo financiero)
      const txId = `tx_${new Date().getTime()}`;
      const docNum = `FIN-${new Date().getTime().toString().slice(-6)}`;
      const txPayload = {
        id: txId,
        type: 'egreso',
        documentType: 'nota_venta',
        date: new Date().toISOString().split('T')[0],
        documentNumber: docNum,
        thirdPartyId: '', // Pago financiero interno
        category: 'gastos_administrativos', // Categoría contable
        description: `Pago de pasivo (${selectedLiability.type}): ${selectedLiability.entity} - Ref: ${paymentRef || 'N/A'}`,
        currency: 'USD',
        baseImponible: amount,
        ivaPorcentaje: 0,
        ivaValor: 0,
        total: amount,
        paymentMethod,
        paymentStatus: 'pagado',
        sriStatus: 'no_aplica',
        paymentsBreakdown: {
          efectivo: paymentMethod === 'efectivo' ? amount : 0,
          transferencia: paymentMethod === 'transferencia' ? amount : 0,
          tarjeta: paymentMethod === 'tarjeta' ? amount : 0,
          cruce_cuentas: 0
        },
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId), txPayload);

      showToast(`Pago de $${amount.toFixed(2)} registrado e integrado a contabilidad`, "success");
      setSelectedLiability(null);
      setPaymentAmount('');
      setPaymentRef('');
    } catch (err) {
      console.error(err);
      showToast("Error al registrar el pago", "error");
    }
  };

  // Eliminar pasivo
  const handleDeleteLiability = async (id) => {
    if (!window.confirm("¿Está seguro de eliminar este pasivo financiero? No se borrarán los pagos registrados en la contabilidad.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_liabilities', id));
      showToast("Pasivo financiero eliminado", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al eliminar", "error");
    }
  };

  // Cálculos de Resumen
  const totalPasivos = liabilities.reduce((sum, l) => sum + (Number(l.saldoPendiente) || 0), 0);
  const totalCuotasMes = liabilities.reduce((sum, l) => sum + (Number(l.cuotaMensual) || 0), 0);
  const prestamos = liabilities.filter(l => l.type === 'prestamo');
  const creditosAlmacen = liabilities.filter(l => l.type === 'credito_almacen');
  const tarjetasCredito = liabilities.filter(l => l.type === 'tarjeta_credito');

  // Filtrar todos los egresos (compras/gastos) del ERP para el historial unificado
  const historicalEgresos = transactions.filter(t => t.type === 'egreso');
  const totalExpensesAllTime = historicalEgresos.reduce((sum, t) => sum + (Number(t.total) || 0), 0);

  const getTypeName = (type) => {
    switch (type) {
      case 'prestamo': return 'Préstamo Bancario';
      case 'credito_almacen': return 'Crédito de Almacén';
      case 'tarjeta_credito': return 'Tarjeta de Crédito Corporativa';
      default: return type;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'prestamo': return <Landmark className="text-emerald-500" size={18} />;
      case 'credito_almacen': return <ShoppingBag className="text-amber-500" size={18} />;
      case 'tarjeta_credito': return <CreditCard className="text-pink-500" size={18} />;
      default: return <DollarSign className="text-blue-500" size={18} />;
    }
  };

  const inputClass = `w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all ${
    isDarkMode 
      ? 'bg-black/20 border-white/10 text-white focus:border-primary/50' 
      : 'bg-white border-gray-300 text-gray-900 focus:border-primary'
  }`;

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-500 overflow-hidden">
      
      {/* CABECERA Y NAVEGACIÓN */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 px-8 py-4 border-b shrink-0 ${
        isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-primary/10 bg-primary-light'
      }`}>
        <div>
          <h2 className="text-sm font-black flex items-center gap-2">
            <CreditCard size={18} className="text-pink-500" />
            <span>Control de Gastos y Créditos Financieros</span>
          </h2>
          <p className="text-[10px] text-gray-500 font-medium">Historial general de compras y control de endeudamiento corporativo de la empresa</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          {[
            { id: 'resumen', label: 'Resumen Financiero', icon: TrendingUp },
            { id: 'pasivos', label: 'Pasivos y Financiamiento', icon: Landmark },
            { id: 'historial_gastos', label: 'Historial de Egresos', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isActive
                    ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-primary text-white border-primary shadow-sm')
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-black/5')
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CUERPO DEL MÓDULO */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-transparent">
        <div className={`flex-1 overflow-y-auto px-8 py-6 custom-scrollbar ${isDarkMode ? 'bg-[#0f0f11]' : 'bg-white'}`}>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : (
            <>
              {/* TAB: RESUMEN */}
              {activeTab === 'resumen' && (
                <div className="space-y-6">
                  {/* Tarjetas métricas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Endeudamiento</span>
                        <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                          <ArrowUpCircle size={16} />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-red-500">${totalPasivos.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[9px] text-gray-400 mt-1">Saldo pendiente acumulado de todas las obligaciones</p>
                    </div>

                    <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Pago de Cuotas Mensual</span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                          <DollarSign size={16} />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-emerald-500">${totalCuotasMes.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[9px] text-gray-400 mt-1">Suma del pago mensual programado de cuotas</p>
                    </div>

                    <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Gastos ERP</span>
                        <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-500">
                          <History size={16} />
                        </div>
                      </div>
                      <p className="text-2xl font-black">${totalExpensesAllTime.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[9px] text-gray-400 mt-1">Egresos totales registrados en contabilidad general</p>
                    </div>
                  </div>

                  {/* Resumen por tipo de pasivo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Composición de Deuda Financiera</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-2 font-semibold">
                            <Landmark size={14} className="text-emerald-500" /> Préstamos Bancarios
                          </span>
                          <span className="font-bold">${prestamos.reduce((s,l) => s + (l.saldoPendiente || 0), 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-2 font-semibold">
                            <ShoppingBag size={14} className="text-amber-500" /> Créditos de Almacén
                          </span>
                          <span className="font-bold">${creditosAlmacen.reduce((s,l) => s + (l.saldoPendiente || 0), 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-2 font-semibold">
                            <CreditCard size={14} className="text-pink-500" /> Tarjetas de Crédito
                          </span>
                          <span className="font-bold">${tarjetasCredito.reduce((s,l) => s + (l.saldoPendiente || 0), 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Salud Crediticia del Negocio</h3>
                        <p className="text-[10px] text-gray-500 leading-normal">
                          Llevar un control ordenado de sus deudas le permite evitar mora, planificar flujos de efectivo futuros y deducir los gastos de interés comercial según la normativa ecuatoriana.
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-dashed border-white/5 flex gap-2">
                        <button
                          onClick={() => setActiveTab('pasivos')}
                          className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs"
                        >
                          Ver Mis Créditos
                        </button>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5"
                        >
                          <Plus size={14} /> Registrar Deuda
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PASIVOS */}
              {activeTab === 'pasivos' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider">Obligaciones Comerciales y Bancarias</h3>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Registrar Nuevo Pasivo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liabilities.map(liab => (
                      <div key={liab.id} className={`p-5 rounded-3xl border shadow-sm relative flex flex-col justify-between ${
                        isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'
                      }`}>
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                              {getIcon(liab.type)}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              liab.saldoPendiente > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-450'
                            }`}>
                              {liab.saldoPendiente > 0 ? 'Con saldo' : 'Liquidado'}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-black dark:text-white mb-0.5">{liab.entity}</h4>
                          <p className="text-[10px] text-gray-500 mb-4">{getTypeName(liab.type)}</p>

                          <div className="space-y-2 border-t border-white/5 pt-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Monto Inicial:</span>
                              <span className="font-semibold">${Number(liab.montoInicial || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Saldo Pendiente:</span>
                              <span className="font-black text-red-500">${Number(liab.saldoPendiente || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Cuota Mensual:</span>
                              <span className="font-bold text-emerald-500">${Number(liab.cuotaMensual || 0).toFixed(2)}</span>
                            </div>
                            {liab.nextPaymentDate && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Próximo Pago:</span>
                                <span className="font-mono text-gray-300">{liab.nextPaymentDate}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-5 border-t border-white/5 pt-3">
                          <button
                            onClick={() => {
                              setSelectedLiability(liab);
                              setPaymentAmount(liab.cuotaMensual || '');
                            }}
                            disabled={liab.saldoPendiente <= 0}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase text-center ${
                              liab.saldoPendiente > 0 
                                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-md' 
                                : 'bg-gray-550/20 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Pagar Cuota
                          </button>
                          <button
                            onClick={() => handleDeleteLiability(liab.id)}
                            className="p-2 rounded-xl border border-white/10 hover:bg-red-500/10 hover:text-red-400 text-gray-400 transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {liabilities.length === 0 && (
                      <div className="col-span-full py-16 text-center text-gray-500 italic">
                        No hay deudas o pasivos registrados. ¡Excelente! Tu negocio está libre de deudas financieras directas.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: HISTORIAL GASTOS */}
              {activeTab === 'historial_gastos' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider">Historial de Todos los Egresos / Compras</h3>
                    <div className="text-xs font-bold">
                      <span>Total Egresos Acumulado: </span>
                      <span className="text-red-500 text-sm font-black">${totalExpensesAllTime.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className={`border rounded-3xl shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`border-b text-[9px] font-black uppercase tracking-wider ${
                            isDarkMode ? 'bg-black/10 border-white/5 text-gray-400' : 'bg-primary-light border-primary/15 text-[#000000]'
                          }`}>
                            <th className="py-3.5 px-4">Fecha</th>
                            <th className="py-3.5 px-4">Descripción / Comprobante</th>
                            <th className="py-3.5 px-4">Proveedor</th>
                            <th className="py-3.5 px-4">Categoría</th>
                            <th className="py-3.5 px-4 text-right">Subtotal</th>
                            <th className="py-3.5 px-4 text-right">IVA</th>
                            <th className="py-3.5 px-4 text-right">Total</th>
                            <th className="py-3.5 px-4 text-center">Método Pago</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5 text-xs">
                          {historicalEgresos.map(tx => {
                            const contact = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                            return (
                              <tr key={tx.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="py-3.5 px-4 text-gray-400 font-medium">{tx.date}</td>
                                <td className="py-3.5 px-4">
                                  <div>
                                    <p className="font-bold text-black dark:text-white line-clamp-1">{tx.description || 'Sin descripción'}</p>
                                    <p className="text-[9px] text-gray-500 font-mono mt-0.5">{tx.documentNumber || `Sec: ${tx.secuencial || 'N/A'}`}</p>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-semibold">
                                  {contact?.name || 'Proveedor Externo (S/N)'}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-semibold text-gray-400 capitalize">
                                    {String(tx.category || 'gastos').replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono">${(Number(tx.baseImponible) || Number(tx.total) || 0).toFixed(2)}</td>
                                <td className="py-3.5 px-4 text-right font-mono">${(Number(tx.ivaValor) || 0).toFixed(2)}</td>
                                <td className="py-3.5 px-4 text-right font-bold text-red-500">${Number(tx.total).toFixed(2)}</td>
                                <td className="py-3.5 px-4 text-center capitalize text-gray-400 font-medium">{tx.paymentMethod}</td>
                              </tr>
                            );
                          })}

                          {historicalEgresos.length === 0 && (
                            <tr>
                              <td colSpan="8" className="py-12 text-center text-gray-500 italic">
                                No hay compras o egresos registrados en el ERP todavía.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL: REGISTRAR PAGO DE CUOTA */}
      {selectedLiability && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-[#151517] border border-white/10' : 'bg-white border border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4 border-b pb-2 border-white/5">
              <h3 className="text-sm font-black">Registrar Pago de Cuota / Abono</h3>
              <button onClick={() => setSelectedLiability(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X size={16} /></button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-black/15 border border-white/5 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Entidad:</span>
                  <span className="font-bold">{selectedLiability.entity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cuota Programada:</span>
                  <span className="font-bold text-emerald-500">${Number(selectedLiability.cuotaMensual || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-white/10 pt-2 font-bold">
                  <span className="text-gray-400">Saldo Pendiente Actual:</span>
                  <span className="text-red-500">${Number(selectedLiability.saldoPendiente || 0).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Monto a Pagar ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={Number(selectedLiability.saldoPendiente || 0).toFixed(2)}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Forma de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className={inputClass}
                  >
                    <option value="transferencia" className="text-black">Transferencia</option>
                    <option value="efectivo" className="text-black">Efectivo</option>
                    <option value="tarjeta" className="text-black">Tarjeta de Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5 font-mono">Nro de Referencia / Comprobante</label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                    className={inputClass}
                    placeholder="Ref. Banco o recibo"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedLiability(null)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-150 text-gray-700'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase transition-transform hover:-translate-y-0.5 shadow-md bg-pink-600 hover:bg-pink-500 text-white"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR PASIVO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-[#151517] border border-white/10' : 'bg-white border border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4 border-b pb-2 border-white/5">
              <h3 className="text-sm font-black">Registrar Nuevo Pasivo</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X size={16} /></button>
            </div>

            <form onSubmit={handleAddLiability} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Tipo de Obligación</label>
                <select
                  value={newLiability.type}
                  onChange={e => setNewLiability({ ...newLiability, type: e.target.value })}
                  className={inputClass}
                >
                  <option value="prestamo" className="text-black">Préstamo Bancario</option>
                  <option value="credito_almacen" className="text-black">Crédito de Almacén (Locales comerciales)</option>
                  <option value="tarjeta_credito" className="text-black">Tarjeta de Crédito Corporativa</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Entidad / Acreedor</label>
                <input
                  type="text"
                  required
                  value={newLiability.entity}
                  onChange={e => setNewLiability({ ...newLiability, entity: e.target.value })}
                  className={inputClass}
                  placeholder="Ej. Banco Guayaquil, De Prati, Visa Produbanco"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Monto Inicial / Línea</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newLiability.montoInicial}
                    onChange={e => setNewLiability({ ...newLiability, montoInicial: e.target.value, saldoPendiente: e.target.value })}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Cuota Mensual Est.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newLiability.cuotaMensual}
                    onChange={e => setNewLiability({ ...newLiability, cuotaMensual: e.target.value })}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {newLiability.type === 'prestamo' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Tasa Interés Anual (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newLiability.tasaInteres}
                      onChange={e => setNewLiability({ ...newLiability, tasaInteres: e.target.value })}
                      className={inputClass}
                      placeholder="Ej. 10.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5 font-mono">Plazo (Meses)</label>
                    <input
                      type="number"
                      value={newLiability.plazoMeses}
                      onChange={e => setNewLiability({ ...newLiability, plazoMeses: e.target.value })}
                      className={inputClass}
                      placeholder="Ej. 24"
                    />
                  </div>
                </div>
              )}

              {newLiability.type === 'tarjeta_credito' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5 font-mono">Día de Corte</label>
                    <input
                      type="text"
                      value={newLiability.fechaCorte}
                      onChange={e => setNewLiability({ ...newLiability, fechaCorte: e.target.value })}
                      className={inputClass}
                      placeholder="Ej. 15"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5 font-mono">Día de Pago</label>
                    <input
                      type="text"
                      value={newLiability.fechaPago}
                      onChange={e => setNewLiability({ ...newLiability, fechaPago: e.target.value })}
                      className={inputClass}
                      placeholder="Ej. 05"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Próxima Fecha de Pago</label>
                <input
                  type="date"
                  value={newLiability.nextPaymentDate}
                  onChange={e => setNewLiability({ ...newLiability, nextPaymentDate: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-150 text-gray-700'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-pink-600 hover:bg-pink-500 text-white font-sans"
                >
                  Registrar Deuda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
