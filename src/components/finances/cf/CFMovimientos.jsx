import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { applyFilters, formatMoney, formatDate } from '../../../services/financialService';

const DOC_TYPES = ['all', 'factura', 'nota_credito', 'nota_debito', 'retencion', 'liquidacion'];
const PAYMENT_STATUSES = ['all', 'pendiente', 'parcial', 'pagado'];
const YEARS = [2024, 2025, 2026, 2027];
const MONTHS = [
  { v: '', l: 'Todos los meses' },
  { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Mayo' }, { v: '06', l: 'Junio' },
  { v: '07', l: 'Julio' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Septiembre' },
  { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' }
];
const PAGE_SIZE = 25;

/**
 * CFMovimientos — Movimientos unificados con filtros avanzados, paginación y exportación CSV.
 * Props: { transactions, onNewMovement, onEditMovement }
 */
export default function CFMovimientos({ transactions = [], onNewMovement, onEditMovement }) {
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    documentType: 'all',
    paymentStatus: 'all',
    month: '',
    year: String(new Date().getFullYear()),
    sourceModule: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const setFilter = (k, v) => {
    setFilters(prev => ({ ...prev, [k]: v }));
    setPage(1);
  };

  const filtered = useMemo(() => applyFilters(transactions, filters), [transactions, filters]);
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [filtered]
  );
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const totalIngresos = sorted.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.total || 0), 0);
  const totalGastos = sorted.filter(t => t.type === 'egreso').reduce((s, t) => s + Number(t.total || 0), 0);

  const exportCSV = () => {
    const cols = ['Fecha', 'Tipo', 'Documento', 'Número', 'Tercero', 'Categoría', 'Método', 'Módulo', 'Estado Pago', 'Estado SRI', 'Total'];
    const rows = sorted.map(t => [
      t.date || '',
      t.type || '',
      t.documentType || '',
      `"${t.documentNumber || ''}"`,
      `"${t.thirdPartyName || ''}"`,
      t.category || '',
      t.paymentMethod || '',
      t.sourceModule || 'manual',
      t.paymentStatus || '',
      t.sriStatus || '',
      t.total || 0
    ]);
    const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `movimientos_${filters.year || 'todos'}_${filters.month || 'todos'}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={onNewMovement}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
          >
            <Plus size={13} /> Nuevo Movimiento
          </button>
          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Filter size={13} /> Filtros {showFilters ? '▲' : '▼'}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download size={13} /> Exportar CSV
          </button>
        </div>
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-white">
          <Search size={13} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar documento, tercero..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            className="text-xs outline-none bg-transparent text-slate-700 placeholder-slate-400 w-52"
          />
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tipo</label>
            <select
              value={filters.type}
              onChange={e => setFilter('type', e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white"
            >
              <option value="all">Todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tipo Doc.</label>
            <select
              value={filters.documentType}
              onChange={e => setFilter('documentType', e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white"
            >
              {DOC_TYPES.map(d => <option key={d} value={d}>{d === 'all' ? 'Todos' : d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Estado Pago</label>
            <select
              value={filters.paymentStatus}
              onChange={e => setFilter('paymentStatus', e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white"
            >
              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'Todos' : s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Mes</label>
            <select
              value={filters.month}
              onChange={e => setFilter('month', e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white"
            >
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Año</label>
            <select
              value={filters.year}
              onChange={e => setFilter('year', e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white"
            >
              <option value="">Todos</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Totales del filtro */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 px-1">
        <span>{sorted.length} registros</span>
        <span className="text-emerald-700">Ingresos: {formatMoney(totalIngresos)}</span>
        <span className="text-rose-700">Gastos: {formatMoney(totalGastos)}</span>
        <span className="text-blue-700">Neto: {formatMoney(totalIngresos - totalGastos)}</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-600 min-w-[800px]">
          <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Detalle / Tercero</th>
              <th className="py-3 px-4">Módulo</th>
              <th className="py-3 px-4">Método</th>
              <th className="py-3 px-4 text-right">Monto</th>
              <th className="py-3 px-4 text-center">Pago</th>
              <th className="py-3 px-4 text-center">SRI</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  Sin movimientos con los filtros actuales
                </td>
              </tr>
            ) : (
              paginated.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.type === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-[200px]">
                    <p className="font-bold text-slate-800 truncate">{t.description || t.documentNumber || '—'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{t.thirdPartyName || '—'} · {t.documentType || '—'}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                      {t.sourceModule || 'manual'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{t.paymentMethod || '—'}</td>
                  <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                    t.type === 'ingreso' ? 'text-emerald-700' : 'text-slate-800'
                  }`}>
                    {t.type === 'ingreso' ? '+' : '-'}{formatMoney(t.total)}
                  </td>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.sriStatus === 'autorizado' ? 'bg-emerald-100 text-emerald-800' :
                      t.sriStatus === 'rechazado' ? 'bg-rose-100 text-rose-800' :
                      t.sriStatus === 'anulado' ? 'bg-slate-200 text-slate-500 line-through' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {t.sriStatus || 'pendiente'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {onEditMovement && (
                      <button
                        onClick={() => onEditMovement(t)}
                        className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg cursor-pointer"
                      >
                        Ver
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            ← Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
