import React, { useState } from 'react';
import { 
  DollarSign, Search, Plus, Calendar, FileText, CheckCircle2, 
  AlertTriangle, RefreshCw, Eye, ArrowDownCircle, ArrowUpCircle, X, Download
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';

export default function AccountsReceivablePayable({ type = 'cxc', transactions = [], thirdParties = [], isDarkMode, showToast, db, appId }) {
  const isCxC = type === 'cxc';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentRef, setPaymentRef] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Filtrar transacciones pendientes de cobro (ingresos) o pago (egresos)
  const filteredTxs = transactions.filter(tx => {
    const isTargetType = isCxC ? tx.type === 'ingreso' : tx.type === 'egreso';
    // Considerar como pendiente si paymentStatus no es 'pagado'
    const isPending = tx.paymentStatus !== 'pagado';
    
    if (!isTargetType || !isPending) return false;

    const matchedTercero = thirdParties.find(tp => tp.id === tx.thirdPartyId);
    const searchString = `${tx.documentNumber || ''} ${matchedTercero?.name || ''} ${tx.claveAcceso || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Métricas agregadas
  const totalBalance = filteredTxs.reduce((sum, tx) => {
    const total = Number(tx.total) || 0;
    const paid = Number(tx.paidAmount) || 0;
    return sum + (total - paid);
  }, 0);

  const totalOriginal = filteredTxs.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  const distinctContactsCount = new Set(filteredTxs.map(tx => tx.thirdPartyId)).size;

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    const parsedAmount = parseFloat(paymentAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast("Monto del abono inválido", "error");
      return;
    }

    const total = Number(selectedTx.total) || 0;
    const currentPaid = Number(selectedTx.paidAmount) || 0;
    const remaining = total - currentPaid;

    if (parsedAmount > remaining + 0.01) {
      showToast(`El abono de $${parsedAmount.toFixed(2)} excede el saldo pendiente ($${remaining.toFixed(2)})`, "error");
      return;
    }

    const newPaid = currentPaid + parsedAmount;
    const isCompleted = newPaid >= total - 0.01;

    const paymentLog = {
      id: `pay_${new Date().getTime()}`,
      amount: parsedAmount,
      method: paymentMethod,
      reference: paymentRef || '',
      date: new Date().toISOString().split('T')[0]
    };

    const newHistory = [...(selectedTx.paymentsHistory || []), paymentLog];

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', selectedTx.id);
      await setDoc(docRef, {
        paidAmount: Number(newPaid.toFixed(2)),
        paymentStatus: isCompleted ? 'pagado' : 'pendiente',
        paymentsHistory: newHistory,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast("Abono registrado exitosamente", "success");
      setSelectedTx(null);
      setPaymentAmount('');
      setPaymentRef('');
    } catch (err) {
      console.error(err);
      showToast("Error al registrar el abono", "error");
    }
  };

  const exportToCSV = () => {
    if (filteredTxs.length === 0) {
      showToast("No hay registros para exportar", "error");
      return;
    }

    const headers = ["Fecha", "Comprobante", "Contacto", "Total Factura", "Abonado", "Pendiente"];
    const rows = filteredTxs.map(tx => {
      const contact = thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || 'Desconocido';
      const paid = Number(tx.paidAmount) || 0;
      const pending = Number(tx.total) - paid;
      return [
        tx.date,
        tx.documentNumber || `Sec: ${tx.secuencial || 'N/A'}`,
        contact,
        Number(tx.total).toFixed(2),
        paid.toFixed(2),
        pending.toFixed(2)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${isCxC ? 'cuentas_por_cobrar' : 'cuentas_por_pagar'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inputClass = `w-full text-xs px-3 py-2 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/25 border-white/10 text-white focus:border-blue-500/50' 
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/35'
  }`;

  return (
    <div className="space-y-6">
      
      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
              {isCxC ? 'Total Cuentas por Cobrar' : 'Total Cuentas por Pagar'}
            </span>
            <div className={`p-1.5 rounded-lg ${isCxC ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {isCxC ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
            </div>
          </div>
          <p className="text-2xl font-black">${totalBalance.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-gray-400 mt-1">Suma del saldo neto pendiente en {filteredTxs.length} documentos</p>
        </div>

        <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Monto Total Facturado</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <FileText size={16} />
            </div>
          </div>
          <p className="text-2xl font-black">${totalOriginal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-[9px] text-gray-400 mt-1">Valor histórico total de los comprobantes pendientes</p>
        </div>

        <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
              {isCxC ? 'Clientes Deudores' : 'Proveedores Acreedores'}
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
              <UsersIcon size={16} />
            </div>
          </div>
          <p className="text-2xl font-black">{distinctContactsCount}</p>
          <p className="text-[9px] text-gray-400 mt-1">Contactos únicos con saldos pendientes</p>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row gap-3 justify-between items-center shadow-sm ${
        isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'
      }`}>
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-450 pointer-events-none">
            <Search size={14} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar por comprobante o contacto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full text-xs pl-9 pr-3 py-2 rounded-xl outline-none border transition-all ${
              isDarkMode 
                ? 'bg-black/25 border-white/10 text-white focus:border-blue-500/50' 
                : 'bg-gray-100 border-gray-200 text-gray-900 focus:bg-white focus:border-blue-600'
            }`}
          />
        </div>

        <button 
          onClick={exportToCSV}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            isDarkMode 
              ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' 
              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm'
          }`}
        >
          <Download size={14} />
          <span>Exportar Listado</span>
        </button>
      </div>

      {/* TABLA DE CUENTAS */}
      <div className={`border rounded-3xl shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[9px] font-black uppercase tracking-wider ${
                isDarkMode ? 'bg-black/10 border-white/5 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-650'
              }`}>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Comprobante</th>
                <th className="py-3.5 px-4">Contacto</th>
                <th className="py-3.5 px-4 text-right">Total Documento</th>
                <th className="py-3.5 px-4 text-right">Abonado</th>
                <th className="py-3.5 px-4 text-right">Pendiente</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5 text-xs">
              {filteredTxs.map(tx => {
                const contact = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                const paid = Number(tx.paidAmount) || 0;
                const total = Number(tx.total) || 0;
                const pending = total - paid;
                
                return (
                  <tr key={tx.id} className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>
                    <td className="py-3.5 px-4 font-medium text-gray-500">{tx.date}</td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {tx.documentNumber || `Sec: ${tx.secuencial || 'N/A'}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold">{contact?.name || 'Desconocido'}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{contact?.ruc}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold">${total.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-emerald-500 font-bold">${paid.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-red-500 font-black">${pending.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setPaymentAmount(pending.toFixed(2));
                            setIsHistoryOpen(false);
                          }}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm ${
                            isCxC 
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                              : 'bg-red-600 hover:bg-red-500 text-white'
                          }`}
                        >
                          <DollarSign size={10} />
                          <span>{isCxC ? 'Abonar' : 'Pagar'}</span>
                        </button>
                        
                        {(tx.paymentsHistory && tx.paymentsHistory.length > 0) && (
                          <button
                            onClick={() => {
                              setSelectedTx(tx);
                              setIsHistoryOpen(true);
                            }}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isDarkMode ? 'hover:bg-white/5 border-white/10 text-gray-400' : 'hover:bg-gray-100 border-gray-300 text-gray-650'
                            }`}
                            title="Historial de Abonos"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500 italic">
                    No se encontraron cuentas pendientes que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR ABONO / VER HISTORIAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-[#151517] border border-white/10' : 'bg-white border border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4 border-b pb-2 border-white/5">
              <h3 className="text-sm font-black">
                {isHistoryOpen ? 'Historial de Abonos / Pagos' : `Registrar ${isCxC ? 'Abono de Cliente' : 'Pago a Proveedor'}`}
              </h3>
              <button onClick={() => setSelectedTx(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X size={16} /></button>
            </div>

            {isHistoryOpen ? (
              <div className="space-y-4">
                <div className="text-xs space-y-1">
                  <p><span className="text-gray-400">Comprobante:</span> <span className="font-bold font-mono">{selectedTx.documentNumber || `Sec: ${selectedTx.secuencial}`}</span></p>
                  <p><span className="text-gray-400">Total Factura:</span> <span className="font-bold">${Number(selectedTx.total).toFixed(2)}</span></p>
                  <p><span className="text-gray-400">Saldo Pendiente:</span> <span className="font-bold text-red-500">${(Number(selectedTx.total) - (Number(selectedTx.paidAmount) || 0)).toFixed(2)}</span></p>
                </div>

                <div className="max-h-[250px] overflow-y-auto custom-scrollbar border border-white/5 rounded-2xl divide-y divide-white/5">
                  {selectedTx.paymentsHistory?.map((pay, index) => (
                    <div key={pay.id || index} className="p-3 text-[11px] flex justify-between items-center">
                      <div>
                        <p className="font-bold capitalize text-emerald-500">${Number(pay.amount).toFixed(2)} — {pay.method}</p>
                        {pay.reference && <p className="text-[9px] text-gray-400 font-mono mt-0.5">Ref: {pay.reference}</p>}
                      </div>
                      <span className="text-[9px] text-gray-500">{pay.date}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setIsHistoryOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Volver a Registrar Abono
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-black/15 border border-white/5 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Factura:</span>
                    <span className="font-semibold">${Number(selectedTx.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Abonado:</span>
                    <span className="font-semibold text-emerald-500">${(Number(selectedTx.paidAmount) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-white/10 pt-2 font-bold">
                    <span className="text-gray-400">Saldo Pendiente:</span>
                    <span className="text-red-500">${(Number(selectedTx.total) - (Number(selectedTx.paidAmount) || 0)).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Monto del Abono ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    max={(Number(selectedTx.total) - (Number(selectedTx.paidAmount) || 0)).toFixed(2)}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Forma de Cobro</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className={inputClass}
                    >
                      <option value="efectivo" className="text-black">Efectivo</option>
                      <option value="transferencia" className="text-black">Transferencia</option>
                      <option value="tarjeta" className="text-black">Tarjeta</option>
                      <option value="cruce_cuentas" className="text-black">Cruce Cuentas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1.5">Referencia</label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      className={inputClass}
                      placeholder="Lote / Banco / Nro doc"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-150 text-gray-700'}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-transform hover:-translate-y-0.5 shadow-md ${
                      isCxC ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    Registrar Cobro
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

// Helper custom component for Users icon because it's mock-users
function UsersIcon({ size }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
