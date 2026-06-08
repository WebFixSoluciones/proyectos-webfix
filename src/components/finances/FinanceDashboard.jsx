import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock, ShieldAlert, Award, FileText, CheckCircle2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

export default function FinanceDashboard({ transactions, thirdParties, isDarkMode, db, appId }) {
  const [settings, setSettings] = useState(null);
  
  useEffect(() => {
    if (!appId || !db) return;
    async function loadSettings() {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings(snap.data());
        }
      } catch (e) {
        console.error("Error cargando settings en Dashboard", e);
      }
    }
    loadSettings();
  }, [appId, db]);

  // Filtros de fecha
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthTx = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Totales e IVA de ingresos y egresos
  const totalIncome = currentMonthTx.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  const totalExpense = currentMonthTx.filter(t => t.type === 'egreso').reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  const netMargin = totalIncome - totalExpense;

  const ivaVentas = currentMonthTx.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + (Number(t.ivaValor) || 0), 0);
  const ivaCompras = currentMonthTx.filter(t => t.type === 'egreso').reduce((acc, t) => acc + (Number(t.ivaValor) || 0), 0);
  const ivaEstimado = ivaVentas - ivaCompras;

  // Estados SRI globales
  const statusCounts = transactions.reduce((acc, t) => {
    const status = t.sriStatus || 'borrador';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pendingPayments = transactions.filter(t => t.paymentStatus === 'pendiente');
  const missingFiles = transactions.filter(t => !t.xmlUrl || !t.pdfUrl);

  // Calcular días restantes de firma digital
  let certDaysLeft = null;
  let certStatus = 'none'; // 'none', 'ok', 'warning', 'expired'
  if (settings && settings.certificadoCargado && settings.certificadoVence) {
    const diffTime = new Date(settings.certificadoVence) - new Date();
    certDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (certDaysLeft < 0) certStatus = 'expired';
    else if (certDaysLeft <= 30) certStatus = 'warning';
    else certStatus = 'ok';
  }

  const cardClass = `p-6 rounded-2xl border backdrop-blur-xl transition-all shadow-sm ${
    isDarkMode 
      ? 'bg-[#151517] border-white/5 hover:border-white/10' 
      : 'bg-white border-blue-100/50 hover:border-blue-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
  }`;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* SECCION ALERTA FIRMA ELECTRONICA */}
      {certStatus !== 'ok' && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          certStatus === 'expired'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : certStatus === 'warning'
            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            : isDarkMode ? 'bg-blue-500/5 border-blue-500/10 text-gray-400' : 'bg-blue-50/70 border-blue-200 text-black font-semibold'
        }`}>
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className={isDarkMode ? '' : 'text-blue-600'} />
            <div>
              <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                {certStatus === 'expired' && "Firma Electrónica Expirada"}
                {certStatus === 'warning' && `La Firma Electrónica expira pronto (en ${certDaysLeft} días)`}
                {certStatus === 'none' && "Falta cargar Firma Electrónica (.p12) en Configuración"}
              </p>
              <p className={`text-[10px] opacity-90 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
                {certStatus === 'none'
                  ? "Para poder emitir XML autorizados por el SRI, sube tu certificado digital en la pestaña de Configuración."
                  : "Por favor renueva o verifica tu certificado de firma para evitar rechazos en las facturas."}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-lg text-[10px] font-bold border uppercase shrink-0 ${isDarkMode ? 'border-white/10' : 'border-blue-300 bg-blue-100 text-blue-800'}`}>
            {certStatus === 'none' ? 'Incompleto' : certStatus === 'expired' ? 'Expirado' : 'Urgente'}
          </div>
        </div>
      )}

      {/* METRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* INGRESOS */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-black font-extrabold'}`}>Ventas (Mes)</span>
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              <TrendingUp size={16} />
            </div>
          </div>
          <p className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>${totalIncome.toFixed(2)}</p>
          <p className={`text-[9px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>IVA Cobrado: ${ivaVentas.toFixed(2)}</p>
        </div>

        {/* EGRESOS */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-black font-extrabold'}`}>Gastos (Mes)</span>
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-700'}`}>
              <TrendingDown size={16} />
            </div>
          </div>
          <p className={`text-2xl font-black ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>${totalExpense.toFixed(2)}</p>
          <p className={`text-[9px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>IVA Pagado: ${ivaCompras.toFixed(2)}</p>
        </div>

        {/* MARGEN */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-black font-extrabold'}`}>Flujo Neto</span>
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
              <DollarSign size={16} />
            </div>
          </div>
          <p className={`text-2xl font-black ${netMargin >= 0 ? (isDarkMode ? 'text-white' : 'text-black') : 'text-red-600'}`}>
            ${netMargin.toFixed(2)}
          </p>
          <p className={`text-[9px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>Rendimiento mensual</p>
        </div>

        {/* BALANCE IVA */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-black font-extrabold'}`}>IVA por Declarar</span>
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
              <Award size={16} />
            </div>
          </div>
          <p className={`text-2xl font-black ${ivaEstimado >= 0 ? (isDarkMode ? 'text-purple-400' : 'text-purple-700') : (isDarkMode ? 'text-blue-400' : 'text-blue-600')}`}>
            ${Math.abs(ivaEstimado).toFixed(2)}
          </p>
          <p className={`text-[9px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>
            {ivaEstimado >= 0 ? "A pagar al SRI" : "Saldo a favor (Crédito)"}
          </p>
        </div>

      </div>

      {/* DETALLES DE CUMPLIMIENTO TRIBUTARIO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ESTADOS SRI */}
        <div className={`${cardClass} md:col-span-1`}>
          <div className={`flex items-center gap-2 mb-5 pb-3 border-b ${isDarkMode ? 'border-white/5' : 'border-blue-100'}`}>
            <FileText size={16} className={isDarkMode ? 'text-blue-500' : 'text-blue-600'} />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-black font-black'}`}>Estados de Emisión SRI</h3>
          </div>
          
          <div className="space-y-3.5">
            {[
              {key: 'autorizado', label: 'Autorizados / Registrados', color: 'bg-emerald-600' },
              { key: 'pendiente', label: 'Pendientes', color: 'bg-yellow-600' },
              { key: 'rechazado', label: 'Rechazados', color: 'bg-red-600' },
              { key: 'anulado', label: 'Anulados', color: 'bg-gray-600' }
            ].map(item => {
              const count = statusCounts[item.key] || 0;
              const pct = transactions.length > 0 ? (count / transactions.length) * 100 : 0;
              return (
                <div key={item.key}>
                  <div className={`flex justify-between items-center text-[10px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-black font-bold'}`}>
                    <span>{item.label}</span>
                    <span>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-blue-50'}`}>
                    <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CUENTAS Y PAGOS */}
        <div className={`${cardClass} md:col-span-2`}>
          <div className={`flex items-center gap-2 mb-5 pb-3 border-b ${isDarkMode ? 'border-white/5' : 'border-blue-100'}`}>
            <Clock size={16} className={isDarkMode ? 'text-yellow-500' : 'text-yellow-600'} />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-black font-black'}`}>Comprobantes por Cobrar / Pagar</h3>
          </div>

          {pendingPayments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar">
              {pendingPayments.map(tx => {
                const thirdParty = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                return (
                  <div key={tx.id} className={`p-3 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-black/25 border-white/5' : 'bg-[#f3f8ff] border-blue-100/60 shadow-sm'}`}>
                    <div className="truncate pr-2">
                      <p className={`text-[10px] font-bold truncate ${isDarkMode ? 'text-gray-300' : 'text-black'}`}>{thirdParty?.name || 'Desconocido'}</p>
                      <p className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>{tx.documentNumber || 'Factura S/N'} - {tx.date}</p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${tx.type === 'ingreso' ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-red-400' : 'text-red-600')}`}>
                      ${Number(tx.total || 0).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <CheckCircle2 size={32} className={`opacity-60 mb-2 ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`} />
              <p className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-black font-medium'}`}>No hay cobros ni pagos pendientes.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
