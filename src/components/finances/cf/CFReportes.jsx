import React, { useState, useMemo } from 'react';
import { BarChart2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import {
  calcRentabilidadPorCliente,
  calcGastosPorCategoria,
  applyFilters,
  formatMoney
} from '../../../services/financialService';

const MONTHS = [
  { v: '', l: 'Todos los meses' },
  { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Mayo' }, { v: '06', l: 'Junio' },
  { v: '07', l: 'Julio' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Septiembre' },
  { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' }
];
const YEARS = [2024, 2025, 2026, 2027];

/**
 * CFReportes — Reportes gerenciales: rentabilidad, gastos, flujo de caja y exportación.
 * Props: { transactions }
 */
export default function CFReportes({ transactions = [] }) {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [tab, setTab] = useState('clientes');

  const filtered = useMemo(() =>
    applyFilters(transactions, { month, year }),
    [transactions, month, year]
  );

  const clienteRanking = useMemo(() => calcRentabilidadPorCliente(filtered), [filtered]);
  const gastosCategoria = useMemo(() => calcGastosPorCategoria(filtered), [filtered]);

  const totalIngresos = filtered
    .filter(t => t.type === 'ingreso' && t.sriStatus !== 'anulado')
    .reduce((s, t) => s + Number(t.total || 0), 0);
  const totalGastos = filtered
    .filter(t => t.type === 'egreso' && t.sriStatus !== 'anulado')
    .reduce((s, t) => s + Number(t.total || 0), 0);

  const maxCliente = clienteRanking[0]?.total || 1;
  const maxGasto = gastosCategoria[0]?.total || 1;

  const exportCSVReport = () => {
    let csv = '';
    if (tab === 'clientes') {
      csv = 'Posición,Cliente,Transacciones,Total\n';
      clienteRanking.forEach((c, i) => {
        csv += `${i + 1},"${c.name}",${c.count},${c.total.toFixed(2)}\n`;
      });
    } else {
      csv = 'Posición,Categoría,Transacciones,Total\n';
      gastosCategoria.forEach((c, i) => {
        csv += `${i + 1},"${c.category}",${c.count},${c.total.toFixed(2)}\n`;
      });
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_${tab}_${year}_${month || 'anual'}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={exportCSVReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
          >
            <Download size={13} /> Exportar CSV
          </button>
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl p-1.5 bg-white"
          >
            {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl p-1.5 bg-white"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-1">
          {['clientes', 'categorias', 'resumen'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                tab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t === 'clientes' ? 'Top Clientes' : t === 'categorias' ? 'Por Categoría' : 'P&L'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Clientes */}
      {tab === 'clientes' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-600" />
            <p className="text-sm font-bold text-slate-800">Ranking de Clientes por Ingresos</p>
          </div>
          {clienteRanking.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">Sin datos de clientes para el período</div>
          ) : (
            <div className="space-y-2.5">
              {clienteRanking.slice(0, 20).map((c, i) => {
                const pct = Math.round((c.total / maxCliente) * 100);
                return (
                  <div key={c.thirdPartyId} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-400 w-6 shrink-0 text-right">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-bold text-slate-800 truncate">{c.name}</span>
                        <span className="text-xs font-bold text-emerald-700 ml-2 shrink-0">{formatMoney(c.total)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 w-10 text-right">{c.count} txs</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Por categoría de gastos */}
      {tab === 'categorias' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-rose-600" />
            <p className="text-sm font-bold text-slate-800">Gastos por Categoría</p>
          </div>
          {gastosCategoria.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">Sin datos de gastos para el período</div>
          ) : (
            <div className="space-y-2.5">
              {gastosCategoria.slice(0, 20).map((c, i) => {
                const pct = Math.round((c.total / maxGasto) * 100);
                const barColors = [
                  'bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-slate-500'
                ];
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-400 w-6 shrink-0 text-right">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-bold text-slate-800 truncate">{c.category}</span>
                        <span className="text-xs font-bold text-slate-700 ml-2 shrink-0">{formatMoney(c.total)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${barColors[i % barColors.length]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 w-10 text-right">{c.count} txs</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* P&L simplificado */}
      {tab === 'resumen' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-blue-600" />
            <p className="text-sm font-bold text-slate-800">Estado de Resultados Simplificado</p>
          </div>
          <div className="rounded-lg border border-border-default bg-white overflow-hidden">
            {[
              { label: '(+) Total Ingresos', value: totalIngresos, indent: false, bold: true, color: 'text-emerald-700' },
              { label: '(−) Total Gastos / Costos', value: totalGastos, indent: false, bold: true, color: 'text-rose-700' },
              null,
              { label: 'UTILIDAD BRUTA', value: totalIngresos - totalGastos, indent: false, bold: true, border: true, color: totalIngresos - totalGastos >= 0 ? 'text-blue-700' : 'text-rose-700' },
              null,
              { label: 'Margen de Utilidad', value: totalIngresos > 0 ? `${((totalIngresos - totalGastos) / totalIngresos * 100).toFixed(1)}%` : '0%', indent: true, isPercentage: true, color: 'text-slate-700' },
              { label: 'Total Transacciones', value: filtered.length, indent: true, isCount: true, color: 'text-slate-700' },
            ].map((row, i) => {
              if (row === null) return <div key={i} className="border-t border-slate-100" />;
              return (
                <div
                  key={row.label}
                  className={`flex justify-between items-center px-5 py-3 ${row.border ? 'border-t-2 border-slate-200 bg-slate-50' : 'hover:bg-slate-50/50'}`}
                >
                  <span className={`text-xs ${row.bold ? 'font-bold text-slate-800' : 'text-slate-600'} ${row.indent ? 'pl-4 text-[11px]' : ''}`}>
                    {row.label}
                  </span>
                  <span className={`text-xs font-bold ${row.color}`}>
                    {row.isPercentage || row.isCount ? row.value : formatMoney(row.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
