import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock } from 'lucide-react';

export default function FinanceDashboard({ transactions, thirdParties, isDarkMode }) {
  // Cálculos básicos
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthTx = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = currentMonthTx.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  const totalExpense = currentMonthTx.filter(t => t.type === 'egreso').reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  const netMargin = totalIncome - totalExpense;

  const pendingTx = transactions.filter(t => t.paymentStatus === 'pendiente');
  const missingFilesTx = transactions.filter(t => !t.xmlUrl || !t.pdfUrl);
  const sriPendingTx = transactions.filter(t => t.sriStatus === 'pendiente' || t.sriStatus === 'emitido');

  const cardClass = `p-6 rounded-2xl border backdrop-blur-xl transition-all shadow-sm ${
    isDarkMode 
      ? 'bg-white/[0.02] border-white/10 hover:border-white/20' 
      : 'bg-white border-gray-200 hover:border-gray-300'
  }`;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* TARJETAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ingresos (Mes Actual)</h3>
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}><TrendingUp size={20} /></div>
          </div>
          <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            ${totalIncome.toFixed(2)}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Egresos (Mes Actual)</h3>
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}><TrendingDown size={20} /></div>
          </div>
          <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            ${totalExpense.toFixed(2)}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Margen / Flujo Neto</h3>
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><DollarSign size={20} /></div>
          </div>
          <p className={`text-3xl font-bold ${netMargin >= 0 ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-red-400' : 'text-red-600')}`}>
            ${netMargin.toFixed(2)}
          </p>
        </div>
      </div>

      {/* ALERTAS Y PENDIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
            <Clock size={18} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} />
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Cuentas por Cobrar/Pagar</h3>
          </div>
          {pendingTx.length > 0 ? (
            <div className="space-y-3">
              {pendingTx.slice(0, 5).map(tx => (
                <div key={tx.id} className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div>
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{tx.documentNumber || 'Sin número'}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{tx.type === 'ingreso' ? 'Por Cobrar' : 'Por Pagar'} - {thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || 'Desconocido'}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.type === 'ingreso' ? 'text-emerald-500' : 'text-red-500'}`}>
                    ${Number(tx.total || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm italic text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No hay cuentas pendientes.</p>
          )}
        </div>

        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
            <AlertCircle size={18} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Alertas SRI</h3>
          </div>
          <div className={`p-4 rounded-xl border border-dashed ${isDarkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
            <p className="text-sm">
              El panel de control SRI valida los comprobantes electrónicos pendientes de autorización.
            </p>
            {sriPendingTx.length > 0 ? (
              <p className="mt-2 font-bold text-xs uppercase tracking-wider">
                Tienes {sriPendingTx.length} comprobantes pendientes de envío/autorización.
              </p>
            ) : (
              <p className="mt-2 font-bold text-xs uppercase tracking-wider text-emerald-500">
                Todo al día con el SRI.
              </p>
            )}
          </div>

          {missingFilesTx.length > 0 && (
            <div className={`p-4 mt-4 rounded-xl border border-dashed ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
              <p className="text-sm font-semibold flex items-center gap-1"><AlertCircle size={14}/> Faltan respaldos físicos</p>
              <p className="mt-1 font-bold text-xs uppercase tracking-wider">
                {missingFilesTx.length} transacciones no tienen XML o RIDE adjunto.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
