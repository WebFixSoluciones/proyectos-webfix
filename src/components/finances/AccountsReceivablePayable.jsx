import React, { useState } from 'react';
import { 
  DollarSign, Search, Plus, Calendar, FileText, CheckCircle2, 
  AlertTriangle, RefreshCw, Eye, ArrowDownCircle, ArrowUpCircle, X, Download, Users
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { getEcuadorDateString } from '../../services/sriService';

export default function AccountsReceivablePayable({ type = 'cxc', transactions = [], thirdParties = [], showToast, db, appId }) {
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
      showToast(`El abono de $parsedAmount.toFixed(2) excede el saldo pendiente ($remaining.toFixed(2))`, "error");
      return;
    }

    const newPaid = currentPaid + parsedAmount;
    const isCompleted = newPaid >= total - 0.01;

    const paymentLog = {
      id: `pay_new Date().getTime()`,
      amount: parsedAmount,
      method: paymentMethod,
      reference: paymentRef || '',
      date: getEcuadorDateString()
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

  const inputClass = `w-full text-xs px-3 py-2 rounded-card outline-none transition-all border ${
    'bg-white border-gray-300 text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary/35'
  }`;

  return (
    <div className="space-y-6">
      
      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className={`p-5 rounded-card border bg-white border-gray-200`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-gray-500 tracking-wider">
              {isCxC ? 'Total Cuentas por Cobrar' : 'Total Cuentas por Pagar'}
            </span>
            <div className={`p-1.5 rounded-lg ${isCxC ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {isCxC ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
            </div>
          </div>
          <p className="text-2xl font-black">${totalBalance.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-1">Suma del saldo neto pendiente en {filteredTxs.length} documentos</p>
        </div>

        <div className={`p-5 rounded-card border bg-white border-gray-200`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Monto Total Facturado</span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText size={16} />
            </div>
          </div>
          <p className="text-2xl font-black">${totalOriginal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-1">Valor histórico total de los comprobantes pendientes</p>
        </div>

        <div className={`p-5 rounded-card border bg-white border-gray-200`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-gray-500 tracking-wider">
              {isCxC ? 'Clientes Deudores' : 'Proveedores Acreedores'}
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black">{distinctContactsCount}</p>
          <p className="text-xs text-gray-400 mt-1">Contactos únicos con saldos pendientes</p>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div>
          <button 
            type="button"
            onClick={exportToCSV}
            className="btn-secondary w-full sm:w-auto"
          >
            <Download size={14} />
            <span>Exportar Listado</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-card border-none w-full sm:w-64 transition-all focus-within:ring-1 focus-within:ring-primary/25 bg-surface-bg hover:bg-surface-card focus-within:bg-surface-card">
            <Search size={14} className={'text-gray-400'} />
            <input 
              type="text" 
              placeholder="Buscar por comprobante o contacto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-current placeholder-gray-500 focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* TABLA DE CUENTAS */}
      <div className={`rounded-card border overflow-hidden transition-all ${
        'border-slate-200/80 bg-white'
      }`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className={`text-xs uppercase font-bold tracking-wider ${
              'bg-slate-50 text-slate-600 border-b border-slate-100'
            }`}>
              <tr>
                <th className="px-6 py-3.5">Fecha</th>
                <th className="px-6 py-3.5">Comprobante</th>
                <th className="px-6 py-3.5">Contacto</th>
                <th className="px-6 py-3.5 text-right">Total Documento</th>
                <th className="px-6 py-3.5 text-right hidden sm:table-cell">Abonado</th>
                <th className="px-6 py-3.5 text-right">Pendiente</th>
                <th className="px-6 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100`}>
              {filteredTxs.map(tx => {
                const contact = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                const paid = Number(tx.paidAmount) || 0;
                const total = Number(tx.total) || 0;
                const pending = total - paid;
                
                return (
                  <tr key={tx.id} className={`transition-colors hover:bg-slate-50/40`}>
                    <td className={`px-6 py-3.5 font-medium text-black font-semibold`}>{tx.date}</td>
                    <td className="px-6 py-3.5 font-mono text-xs">
                      {tx.documentNumber || `Sec: ${tx.secuencial || 'N/A'}`}
                    </td>
                    <td className="px-6 py-3.5">
                      <div>
                        <p className={`font-bold text-black font-semibold`}>{contact?.name || 'Desconocido'}</p>
                        <p className="text-xs text-gray-500 font-mono">{contact?.ruc}</p>
                      </div>
                    </td>
                    <td className={`px-6 py-3.5 text-right font-semibold text-black`}>total.toFixed(2)</td>
                    <td className="px-6 py-3.5 text-right text-emerald-700 dark:text-emerald-400 font-bold hidden sm:table-cell">paid.toFixed(2)</td>
                    <td className="px-6 py-3.5 text-right text-red-700 dark:text-red-400 font-black">pending.toFixed(2)</td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTx(tx);
                            setPaymentAmount(pending.toFixed(2));
                            setIsHistoryOpen(false);
                          }}
                          className={`h-[34px] px-3.5 rounded-btn text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-white ${
                            isCxC 
                              ? 'bg-emerald-600 hover:bg-emerald-700' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          <DollarSign size={10} />
                          <span>{isCxC ? 'Abonar' : 'Pagar'}</span>
                        </button>
                        
                        {(tx.paymentsHistory && tx.paymentsHistory.length > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setIsHistoryOpen(true);
                            }}
                            className="btn-icon bg-amber-600 text-white hover:bg-amber-700"
                            title="Historial de Abonos"
                          >
                            <Eye size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 italic">
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-card bg-white border border-gray-200`}>
            <div className="flex justify-between items-center mb-4 border-b pb-2 border-white/5">
              <h3 className="text-sm font-black">
                {isHistoryOpen ? 'Historial de Abonos / Pagos' : `Registrar ${isCxC ? 'Abono de Cliente' : 'Pago a Proveedor'}`}
              </h3>
              <button onClick={() => setSelectedTx(null)} className="btn-icon text-gray-400 hover:text-white"><X size={16} /></button>
            </div>

            {isHistoryOpen ? (
              <div className="space-y-4">
                <div className="text-xs space-y-1">
                  <p><span className="text-gray-400">Comprobante:</span> <span className="font-bold font-mono">{selectedTx.documentNumber || `Sec: selectedTx.secuencial`}</span></p>
                  <p><span className="text-gray-400">Total Factura:</span> <span className="font-bold">Number(selectedTx.total).toFixed(2)</span></p>
                  <p><span className="text-gray-400">Saldo Pendiente:</span> <span className="font-bold text-red-500">${(Number(selectedTx.total) - (Number(selectedTx.paidAmount) || 0)).toFixed(2)}</span></p>
                </div>

                <div className="max-h-[250px] overflow-y-auto custom-scrollbar border border-white/5 rounded-card divide-y divide-white/5">
                  {selectedTx.paymentsHistory?.map((pay, index) => (
                    <div key={pay.id || index} className="p-3 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold capitalize text-emerald-500">Number(pay.amount).toFixed(2) — {pay.method}</p>
                        {pay.reference && <p className="text-xs text-gray-400 font-mono mt-0.5">Ref: {pay.reference}</p>}
                      </div>
                      <span className="text-xs text-gray-500">{pay.date}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setIsHistoryOpen(false)}
                    className="btn-secondary"
                  >
                    Volver a Registrar Abono
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="p-3.5 rounded-card bg-black/15 border border-white/5 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Factura:</span>
                    <span className="font-semibold">Number(selectedTx.total).toFixed(2)</span>
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
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Monto del Abono ($)</label>
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
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Forma de Cobro</label>
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
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Referencia</label>
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
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`h-[34px] px-4 rounded-btn text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-white border-none ${
                      isCxC ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
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

// Icono Users de lucide-react cargado directamente.
