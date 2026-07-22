import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { calcDashboardMetrics, calcAlerts, formatMoney } from '../../../services/financialService';

/**
 * CFDashboard — Resumen financiero con KPIs reales, alertas y cartera.
 * Props: { transactions, bankAccounts, financialCards, onNewMovement }
 */
export default function CFDashboard({ transactions = [], bankAccounts = [], financialCards = [], onNewMovement }) {
  const metrics = useMemo(
    () => calcDashboardMetrics(transactions, bankAccounts, financialCards),
    [transactions, bankAccounts, financialCards]
  );

  const alerts = useMemo(() => calcAlerts(transactions), [transactions]);

  const kpis = [
    {
      label: 'Total Ingresos',
      value: formatMoney(metrics.totalIngresos),
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      icon: TrendingUp
    },
    {
      label: 'Total Gastos',
      value: formatMoney(metrics.totalGastos),
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-200',
      icon: TrendingDown
    },
    {
      label: 'Utilidad Neta',
      value: formatMoney(metrics.utilidadNeta),
      color: metrics.utilidadNeta >= 0 ? 'text-blue-700' : 'text-rose-700',
      bg: metrics.utilidadNeta >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-rose-50 border-rose-200',
      icon: DollarSign
    },
    {
      label: 'Flujo de Caja Proyectado',
      value: formatMoney(metrics.flujoCajaProyectado),
      color: metrics.flujoCajaProyectado >= 0 ? 'text-indigo-700' : 'text-rose-700',
      bg: 'bg-indigo-50 border-indigo-200',
      icon: Clock
    }
  ];

  return (
    <div className="space-y-6">
      {/* Botón de acción a la izquierda */}
      <div className="flex justify-start">
        <button
          onClick={onNewMovement}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
        >
          + Registrar Movimiento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`p-4 rounded-xl border ${k.bg} flex flex-col gap-2`}>
              <div className="flex items-center gap-2">
                <Icon size={14} className="text-slate-500" />
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{k.label}</p>
              </div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Panel inferior: alertas + cartera */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de vencimiento */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">Alertas de Vencimientos</h3>
            {alerts.length > 0 && (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin alertas activas ✓</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {alerts.map(al => (
                <div
                  key={al.id}
                  className={`p-3 rounded-lg text-xs border ${
                    al.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <p className="font-bold">{al.title}</p>
                  <p className="mt-0.5 opacity-80">{al.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen de cartera */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Resumen de Cartera</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Por Cobrar</p>
              <p className="text-base font-bold text-emerald-900 mt-1">{formatMoney(metrics.cxcPendiente)}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-[10px] font-bold text-rose-700 uppercase">Por Pagar</p>
              <p className="text-base font-bold text-rose-900 mt-1">{formatMoney(metrics.cxpPendiente)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-600">Saldo en Bancos</span>
              <span className="font-bold text-blue-700">{formatMoney(metrics.saldoBancos)}</span>
            </div>
            <div className="flex justify-between text-xs p-2.5 bg-amber-50 rounded-lg border border-amber-100">
              <span className="font-semibold text-amber-700">Gastos Hormiga (&lt;$20)</span>
              <span className="font-bold text-amber-900">{formatMoney(metrics.gastosHormigaTotal)}</span>
            </div>
            <div className="flex justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-600">Deuda en Tarjetas</span>
              <span className="font-bold text-slate-800">{formatMoney(metrics.cupoTarjetasUsado)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
