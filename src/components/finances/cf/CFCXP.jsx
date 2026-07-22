import React, { useState, useMemo } from 'react';
import { formatMoney, formatDate } from '../../../services/financialService';

/**
 * CFCXP — Cuentas por Pagar integradas con Compras.
 * Props: { transactions, onRegisterPago }
 */
export default function CFCXP({ transactions = [], onRegisterPago }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('pendiente');

  // CXP = egresos con facturas/notas débito/liquidaciones que no estén anuladas
  const cxpAll = useMemo(() =>
    transactions.filter(t =>
      t.type === 'egreso' &&
      t.sriStatus !== 'anulado' &&
      ['factura', 'nota_debito', 'liquidacion'].includes(t.documentType)
    ),
    [transactions]
  );

  const filtered = useMemo(() => {
    let r = filterStatus !== 'all' ? cxpAll.filter(t => t.paymentStatus === filterStatus) : cxpAll;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(t =>
        `${t.thirdPartyName || ''} ${t.documentNumber || ''}`.toLowerCase().includes(q)
      );
    }
    return r.sort((a, b) =>
      (a.dueDate || a.date || '').localeCompare(b.dueDate || b.date || '')
    );
  }, [cxpAll, filterStatus, search]);

  const today = new Date().toISOString().slice(0, 10);
  const totalPendiente = filtered.reduce((s, t) =>
    s + Math.max(0, Number(t.total || 0) - Number(t.paidAmount || 0)), 0
  );
  const totalVencido = filtered
    .filter(t => t.dueDate && t.dueDate < today && t.paymentStatus !== 'pagado')
    .reduce((s, t) => s + Math.max(0, Number(t.total || 0) - Number(t.paidAmount || 0)), 0);

  const STATUSES = ['all', 'pendiente', 'parcial', 'pagado'];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                filterStatus === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? 'Todas' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar proveedor o documento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white w-56 outline-none focus:ring-1 focus:ring-blue-200"
        />
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
          <p className="text-[10px] font-bold text-rose-700 uppercase">Por Pagar</p>
          <p className="text-xl font-bold text-rose-900 mt-1">{formatMoney(totalPendiente)}</p>
          <p className="text-[10px] text-rose-600 mt-1">{filtered.filter(t => t.paymentStatus !== 'pagado').length} documentos</p>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-[10px] font-bold text-red-700 uppercase">Vencido</p>
          <p className="text-xl font-bold text-red-900 mt-1">{formatMoney(totalVencido)}</p>
          <p className="text-[10px] text-red-600 mt-1">{filtered.filter(t => t.dueDate && t.dueDate < today && t.paymentStatus !== 'pagado').length} documentos</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-border-default bg-white">
        <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
          <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Proveedor</th>
              <th className="py-3 px-4">Comprobante</th>
              <th className="py-3 px-4">Emisión</th>
              <th className="py-3 px-4">Vencimiento</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-right">Pagado</th>
              <th className="py-3 px-4 text-right">Saldo</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400">
                  Sin cuentas por pagar con los filtros actuales
                </td>
              </tr>
            ) : (
              filtered.map(t => {
                const saldo = Math.max(0, Number(t.total || 0) - Number(t.paidAmount || 0));
                const vencido = t.dueDate && t.dueDate < today && saldo > 0;
                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/70 transition-colors ${vencido ? 'bg-rose-50/30' : ''}`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-800">{t.thirdPartyName || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{t.documentNumber || '—'}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className={`py-3 px-4 font-semibold whitespace-nowrap ${vencido ? 'text-rose-700' : 'text-slate-600'}`}>
                      {t.dueDate ? formatDate(t.dueDate) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatMoney(t.total)}</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-medium">{formatMoney(t.paidAmount || 0)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">{formatMoney(saldo)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.paymentStatus === 'pagado' ? 'bg-emerald-100 text-emerald-800' :
                        t.paymentStatus === 'parcial' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {t.paymentStatus || 'pendiente'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {saldo > 0 && onRegisterPago && (
                        <button
                          onClick={() => onRegisterPago(t)}
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg cursor-pointer"
                        >
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
