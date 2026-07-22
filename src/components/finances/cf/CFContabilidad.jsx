import React, { useState, useMemo } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { generarAsientoContable, applyFilters, formatMoney, formatDate } from '../../../services/financialService';

/**
 * CFContabilidad — Libro diario automático a partir de finances_transactions.
 * Muestra asientos contables generados por la función generarAsientoContable().
 * Props: { transactions }
 */
export default function CFContabilidad({ transactions = [] }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const filtered = useMemo(() =>
    applyFilters(transactions, {
      type: filterType,
      month,
      year,
      search,
      sriStatus: 'all'
    }).filter(t => t.sriStatus !== 'anulado')
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [transactions, filterType, month, year, search]
  );

  const asientos = useMemo(() =>
    filtered.map(t => generarAsientoContable(t)).filter(Boolean),
    [filtered]
  );

  const totalDebe = asientos.reduce((s, a) => s + (a.totalDebe || 0), 0);
  const totalHaber = asientos.reduce((s, a) => s + (a.totalHaber || 0), 0);

  const MONTHS = [
    '01', '02', '03', '04', '05', '06',
    '07', '08', '09', '10', '11', '12'
  ];
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const YEARS = [2024, 2025, 2026, 2027];

  return (
    <div className="space-y-4">
      {/* Filtros a la izquierda */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {['all', 'ingreso', 'egreso'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                filterType === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t === 'all' ? 'Todo' : t === 'ingreso' ? 'Ingresos' : 'Gastos'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-none focus:ring-1 focus:ring-blue-200 w-40"
          />
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl p-1.5 bg-white"
          >
            {MONTHS.map((m, i) => <option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl p-1.5 bg-white"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Totales cuadre contable */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
          <p className="text-[10px] font-bold text-blue-600 uppercase">Total Debe</p>
          <p className="text-sm font-bold text-blue-900 mt-1">{formatMoney(totalDebe)}</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Haber</p>
          <p className="text-sm font-bold text-emerald-900 mt-1">{formatMoney(totalHaber)}</p>
        </div>
        <div className={`p-3 rounded-xl text-center border ${Math.abs(totalDebe - totalHaber) < 0.01 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <p className="text-[10px] font-bold text-slate-600 uppercase">Diferencia</p>
          <p className={`text-sm font-bold mt-1 ${Math.abs(totalDebe - totalHaber) < 0.01 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatMoney(Math.abs(totalDebe - totalHaber))}
          </p>
          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
            {Math.abs(totalDebe - totalHaber) < 0.01 ? '✓ Cuadre perfecto' : '⚠ Revisar'}
          </p>
        </div>
      </div>

      {/* Libro diario */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50">
          <BookOpen size={14} className="text-slate-500" />
          <h3 className="text-xs font-bold text-slate-800">
            Libro Diario — {MONTH_NAMES[parseInt(month) - 1]} {year}
          </h3>
          <span className="ml-auto text-[11px] text-slate-400">{asientos.length} asientos</span>
        </div>

        {asientos.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Sin movimientos para el período seleccionado
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {asientos.map(a => (
              <div key={a.txId} className="hover:bg-slate-50/70 transition-colors">
                <button
                  onClick={() => setExpandedId(expandedId === a.txId ? null : a.txId)}
                  className="w-full text-left p-4 flex items-center gap-4 cursor-pointer"
                >
                  <div className="shrink-0 w-24 text-[11px] font-mono text-slate-500">{formatDate(a.date)}</div>
                  <div className="flex-1 text-xs text-slate-700 font-semibold truncate">{a.description}</div>
                  <div className="shrink-0 text-right text-xs font-bold text-blue-700 w-24">{formatMoney(a.totalDebe)}</div>
                  <div className="shrink-0 text-right text-xs font-bold text-emerald-700 w-24">{formatMoney(a.totalHaber)}</div>
                  {expandedId === a.txId
                    ? <ChevronUp size={14} className="shrink-0 text-slate-400" />
                    : <ChevronDown size={14} className="shrink-0 text-slate-400" />
                  }
                </button>

                {expandedId === a.txId && (
                  <div className="px-4 pb-4">
                    <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="py-2 px-3">Código</th>
                            <th className="py-2 px-3">Cuenta</th>
                            <th className="py-2 px-3 text-right">Debe</th>
                            <th className="py-2 px-3 text-right">Haber</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {a.cuentas.map((c, i) => (
                            <tr key={i} className="bg-white">
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{c.cuentaCodigo}</td>
                              <td className="py-2 px-3 font-semibold text-slate-700">{c.cuentaNombre}</td>
                              <td className="py-2 px-3 text-right font-medium text-blue-700">
                                {c.debe > 0 ? formatMoney(c.debe) : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-emerald-700">
                                {c.haber > 0 ? formatMoney(c.haber) : '—'}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold text-slate-700">
                            <td colSpan={2} className="py-2 px-3 text-right">TOTAL</td>
                            <td className="py-2 px-3 text-right text-blue-700">{formatMoney(a.totalDebe)}</td>
                            <td className="py-2 px-3 text-right text-emerald-700">{formatMoney(a.totalHaber)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
