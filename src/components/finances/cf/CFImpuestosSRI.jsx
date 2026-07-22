import React, { useState, useMemo } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { calcAtsData, formatMoney, formatDate } from '../../../services/financialService';
import { downloadSriAtsXml } from '../../../services/SriAtsExporter';

const MONTHS = [
  { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Mayo' }, { v: '06', l: 'Junio' },
  { v: '07', l: 'Julio' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Septiembre' },
  { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' }
];
const YEARS = [2024, 2025, 2026, 2027];

/**
 * CFImpuestosSRI — Panel de impuestos, ATS Ecuador y análisis tributario.
 * Props: { transactions, companyProfile }
 */
export default function CFImpuestosSRI({ transactions = [], companyProfile }) {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [tab, setTab] = useState('resumen');

  const byPeriod = useMemo(() =>
    transactions.filter(t => {
      const d = t.date || '';
      return d.startsWith(year) && d.substring(5, 7) === month;
    }),
    [transactions, month, year]
  );

  const ats = useMemo(() => calcAtsData(byPeriod), [byPeriod]);

  const handleExportAts = () => {
    downloadSriAtsXml({
      companyProfile: companyProfile || {},
      year: parseInt(year),
      month: parseInt(month),
      transactions: byPeriod
    });
  };

  const currentMonthName = MONTHS.find(m => m.v === month)?.l || month;

  return (
    <div className="space-y-4">
      {/* Controles superiores — acción + filtros a la izquierda */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={handleExportAts}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
          >
            <Download size={13} /> Exportar ATS XML
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
          {['resumen', 'ventas', 'compras', 'retenciones'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${
                tab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Título del período */}
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={15} className="text-slate-500" />
        <h3 className="text-sm font-bold text-slate-800">
          Período Tributario: {currentMonthName} {year}
        </h3>
        <span className="text-xs text-slate-400">({byPeriod.length} documentos)</span>
      </div>

      {/* Resumen */}
      {tab === 'resumen' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Base Ventas', value: ats.totalVentasBase, color: 'emerald' },
              { label: 'IVA Ventas', value: ats.totalVentasIva, color: 'blue' },
              { label: 'Base Compras', value: ats.totalComprasBase, color: 'slate' },
              { label: 'IVA Compras', value: ats.totalComprasIva, color: 'blue' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`p-4 rounded-xl bg-${color}-50 border border-${color}-200`}>
                <p className={`text-[10px] font-bold text-${color}-600 uppercase`}>{label}</p>
                <p className={`text-base font-bold text-${color}-900 mt-1`}>{formatMoney(value)}</p>
              </div>
            ))}
          </div>

          {/* IVA a cancelar */}
          <div className={`p-5 rounded-xl border-2 ${ats.ivaACancelar > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'} flex items-center justify-between`}>
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase">IVA a Cancelar al SRI</p>
              <p className={`text-2xl font-bold mt-1 ${ats.ivaACancelar > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                {formatMoney(ats.ivaACancelar)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                IVA Ventas ({formatMoney(ats.totalVentasIva)}) − Crédito Tributario ({formatMoney(ats.creditoTributario)})
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/60 border border-slate-200 text-right">
              <p className="text-[10px] font-bold text-slate-500">Crédito Tributario</p>
              <p className="text-base font-bold text-blue-700 mt-1">{formatMoney(ats.creditoTributario)}</p>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Docs Autorizados', count: ats.docsAutorizados.length, color: 'emerald' },
              { label: 'Docs Pendientes', count: ats.docsPendientes.length, color: 'amber' },
              { label: 'Docs Anulados', count: ats.docsAnulados.length, color: 'slate' },
              { label: 'Retenciones Emitidas', count: ats.retencionesEmitidas.length, color: 'blue' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`p-3 rounded-xl bg-${color}-50 border border-${color}-200 text-center`}>
                <p className={`text-xl font-bold text-${color}-700`}>{count}</p>
                <p className={`text-[10px] font-bold text-${color}-600 uppercase mt-0.5`}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ventas */}
      {tab === 'ventas' && (
        <TxTable rows={ats.ventas} label="Comprobantes de Venta" />
      )}

      {/* Compras */}
      {tab === 'compras' && (
        <TxTable rows={ats.compras} label="Comprobantes de Compra" />
      )}

      {/* Retenciones */}
      {tab === 'retenciones' && (
        <div className="space-y-4">
          <TxTable rows={ats.retencionesEmitidas} label="Retenciones Emitidas (a nosotros)" />
          <TxTable rows={ats.retencionesRecibidas} label="Retenciones Recibidas (a terceros)" />
        </div>
      )}
    </div>
  );
}

function TxTable({ rows = [], label }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-700">{label} ({rows.length})</p>
      <div className="overflow-x-auto rounded-lg border border-border-default bg-white">
        <table className="w-full text-left text-xs text-slate-600 min-w-[640px]">
          <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Comprobante</th>
              <th className="py-3 px-4">Tercero</th>
              <th className="py-3 px-4 text-right">Base</th>
              <th className="py-3 px-4 text-right">IVA</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-center">SRI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">Sin documentos</td>
              </tr>
            ) : (
              rows.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px]">{t.documentNumber || '—'}</td>
                  <td className="py-2.5 px-4 max-w-[180px] truncate font-semibold text-slate-800">{t.thirdPartyName || '—'}</td>
                  <td className="py-2.5 px-4 text-right">{formatMoney(t.baseImponible)}</td>
                  <td className="py-2.5 px-4 text-right">{formatMoney(t.ivaValor)}</td>
                  <td className="py-2.5 px-4 text-right font-bold">{formatMoney(t.total)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.sriStatus === 'autorizado' ? 'bg-emerald-100 text-emerald-800' :
                      t.sriStatus === 'rechazado' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-700'
                    }`}>{t.sriStatus || 'pendiente'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
