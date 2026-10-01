import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, Wallet, Building2, CreditCard,
  Landmark, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Calendar,
  PieChart, RefreshCw, BarChart3, Target, ArrowUpRight, CheckCircle2,
  Clock, LayoutGrid, Check, ChevronRight
} from 'lucide-react';
import { getResumenFinanciero, getFlujoCajaMensual } from '../../services/resumenService';
import { getMovimientos } from '../../services/movimientoService';
import FinancialPageHeader from './FinancialPageHeader';

const TABS_RESUMEN = [
  { id: 'general', label: 'General', icon: LayoutGrid },
  { id: 'flujo', label: 'Flujo de Caja', icon: BarChart3 },
  { id: 'forecast', label: 'Forecast', icon: Target },
];

const TIPO_ICONOS = {
  cxc_vencido: ArrowDownCircle,
  cxp_vencido: ArrowUpCircle,
  tarjeta_proxima: CreditCard,
  tarjeta_cupo_bajo: CreditCard,
  prestamo_vencido: Landmark,
};

export default function ResumenFinancieroView({ db, onNavigate }) {
  const [resumen, setResumen] = useState(null);
  const [flujoMensual, setFlujoMensual] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabActiva, setTabActiva] = useState('general');
  const [periodo, setPeriodo] = useState({
    fechaDesde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    fechaHasta: new Date().toISOString().slice(0, 10),
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, movimientos] = await Promise.all([
        getResumenFinanciero(db, periodo),
        getMovimientos(db, {})
      ]);
      setResumen(res);
      setFlujoMensual(getFlujoCajaMensual(movimientos, 6));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [db, periodo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const fmt = (v) => `$${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const fmtShort = (v) => {
    const n = Number(v) || 0;
    if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-2 pb-8 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-72 bg-slate-100 rounded-2xl" />
          <div className="h-72 bg-slate-100 rounded-2xl" />
        </div>
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl max-w-lg mx-auto p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Error al cargar datos financieros</h3>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={cargar}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  if (!resumen) return null;

  const maxFlujo = Math.max(...flujoMensual.flatMap(d => [d.ingresos, d.egresos]), 1);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-2 pb-8">
      {/* ENCABEZADO ESTANDARIZADO */}
      <FinancialPageHeader
        icon={PieChart}
        title="Resumen Financiero"
        description="Panel ejecutivo de tesorería, liquidez y proyección de flujo de caja"
        badge="Ecuador"
        badgeColor="blue"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 gap-2 text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <input
                type="month"
                value={periodo.fechaDesde.slice(0, 7)}
                onChange={e => {
                  const d = e.target.value + '-01';
                  const lastDay = new Date(new Date(d).getFullYear(), new Date(d).getMonth() + 1, 0).toISOString().slice(0, 10);
                  setPeriodo({ fechaDesde: d, fechaHasta: lastDay });
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={cargar}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 text-slate-600 hover:text-slate-950 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
              title="Actualizar métricas"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        }
      />

      {/* PESTAÑAS SEGMENTADAS (ESTILO BREVO) */}
      <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 gap-1 text-xs">
        {TABS_RESUMEN.map(t => {
          const Icon = t.icon;
          const isActive = tabActiva === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTabActiva(t.id)}
              className={`px-4 py-2 font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* VISTA: GENERAL */}
      {tabActiva === 'general' && (
        <>
          {/* 4 TARJETAS KPI DE SALUD FINANCIERA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: FLUJO DEL MES */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Flujo del Mes</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div>
                <div className={`text-3xl font-extrabold tracking-tight ${resumen.flujoMes.neto >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {fmt(resumen.flujoMes.neto)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> +{fmtShort(resumen.flujoMes.ingresos)}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> -{fmtShort(resumen.flujoMes.egresos)}
                </span>
              </div>
            </div>

            {/* KPI 2: CARTERA NETA */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cartera Neta</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Wallet size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {fmt(resumen.cartera.neto)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> CxC: {fmtShort(resumen.cartera.cxcPendiente)}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> CxP: {fmtShort(resumen.cartera.cxpPendiente)}
                </span>
              </div>
            </div>

            {/* KPI 3: DEUDA TOTAL */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Deuda Total</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <CreditCard size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {fmt(resumen.deuda.total)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                {resumen.deuda.total === 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Sin obligaciones vencidas
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600">
                      Préstamos: {fmtShort(resumen.deuda.prestamosPendientes)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600">
                      Tarjetas: {fmtShort(resumen.deuda.tarjetasUtilizadas)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* KPI 4: LIQUIDEZ DISPONIBLE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Liquidez Disponible</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Building2 size={16} strokeWidth={2.2} />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {fmt(resumen.liquidez.disponible)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600">
                  Bancos: {fmtShort(resumen.liquidez.bancos)}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600">
                  Caja: {fmtShort(resumen.liquidez.caja)}
                </span>
              </div>
            </div>

          </div>

          {/* ALERTAS PRIORITARIAS (SI EXISTEN) */}
          {resumen.alertas && resumen.alertas.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Alertas y Vencimientos Próximos</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                    {resumen.alertas.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {resumen.alertas.slice(0, 10).map((a, idx) => {
                  const Icon = TIPO_ICONOS[a.tipo] || AlertTriangle;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          a.prioridad === 'alta' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          <Icon size={14} />
                        </div>
                        <span className="text-xs text-slate-800 font-medium truncate">{a.mensaje}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {a.monto > 0 && (
                          <span className="text-xs font-bold text-slate-900 font-mono">{fmt(a.monto)}</span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          a.prioridad === 'alta'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}>
                          {a.prioridad}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AGING CARTERA (CXC) Y OBLIGACIONES (CXP) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AgingCard
              title="Cartera por Cobrar (Aging CxC)"
              subtitle="Antigüedad de facturas emitidas a clientes"
              icon={ArrowDownCircle}
              aging={resumen.agingConsolidado.cxc}
              tipo="cxc"
              totalCartera={resumen.cartera.cxcPendiente}
              fmt={fmt}
              onNavigate={onNavigate ? () => onNavigate('cxc') : null}
              actionLabel="Ver Cartera CxC"
            />
            <AgingCard
              title="Obligaciones por Pagar (Aging CxP)"
              subtitle="Cuentas pendientes con proveedores"
              icon={ArrowUpCircle}
              aging={resumen.agingConsolidado.cxp}
              tipo="cxp"
              totalCartera={resumen.cartera.cxpPendiente}
              fmt={fmt}
              onNavigate={onNavigate ? () => onNavigate('cxp') : null}
              actionLabel="Ver CxP"
            />
          </div>

          {/* ACCESOS RÁPIDOS A MÓDULOS FINANCIEROS */}
          {onNavigate && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Accesos Directos de Finanzas</h3>
                  <p className="text-[11px] text-slate-500">Navegación rápida a los módulos de tesorería y cuentas</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { id: 'movimientos', label: 'Movimientos', desc: 'Ingresos y egresos', icon: DollarSign, bg: 'bg-emerald-50', color: 'text-emerald-600' },
                  { id: 'cxc', label: 'Cuentas por Cobrar', desc: 'Gestión de cartera', icon: TrendingUp, bg: 'bg-blue-50', color: 'text-blue-600' },
                  { id: 'cxp', label: 'Cuentas por Pagar', desc: 'Proveedores', icon: ArrowUpCircle, bg: 'bg-rose-50', color: 'text-rose-600' },
                  { id: 'bancos', label: 'Bancos y Caja', desc: 'Cuentas y saldos', icon: Building2, bg: 'bg-indigo-50', color: 'text-indigo-600' },
                  { id: 'tarjetas', label: 'Tarjetas', desc: 'Líneas de crédito', icon: CreditCard, bg: 'bg-amber-50', color: 'text-amber-600' },
                  { id: 'prestamos', label: 'Préstamos', desc: 'Tablas y cuotas', icon: Landmark, bg: 'bg-purple-50', color: 'text-purple-600' },
                ].map(acc => {
                  const AccIcon = acc.icon;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => onNavigate(acc.id)}
                      className="p-3.5 bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/70 hover:border-slate-300 rounded-xl transition-all flex flex-col justify-between text-left group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2 w-full">
                        <div className={`w-8 h-8 rounded-lg ${acc.bg} ${acc.color} flex items-center justify-center shrink-0`}>
                          <AccIcon size={16} strokeWidth={2} />
                        </div>
                        <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-black">{acc.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{acc.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* VISTA: FLUJO DE CAJA (HISTORIAL 6 MESES) */}
      {tabActiva === 'flujo' && (
        <div className="space-y-6">
          {/* 3 TARJETAS RESUMEN DE FLUJO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Ingresos (6M)</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
                {fmt(flujoMensual.reduce((s, d) => s + d.ingresos, 0))}
              </div>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Egresos (6M)</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
                {fmt(flujoMensual.reduce((s, d) => s + d.egresos, 0))}
              </div>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Balance Neto Acumulado</span>
              <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                flujoMensual.reduce((s, d) => s + d.neto, 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}>
                {fmt(flujoMensual.reduce((s, d) => s + d.neto, 0))}
              </div>
            </div>
          </div>

          {/* HISTORIAL MENSUAL DETALLADO */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Flujo de Caja Mensual</h3>
                <p className="text-[11px] text-slate-500">Comparativa histórica de ingresos y egresos operativos</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Ingresos
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Egresos
                </span>
              </div>
            </div>

            {flujoMensual.length > 0 ? (
              <div className="space-y-4">
                {flujoMensual.map((d, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 capitalize w-20">{d.mes}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-emerald-700 font-semibold">+{fmt(d.ingresos)}</span>
                        <span className="text-rose-600 font-semibold">-{fmt(d.egresos)}</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                          d.neto >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          Neto: {fmt(d.neto)}
                        </span>
                      </div>
                    </div>
                    {/* Barra visual proporcional */}
                    <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden flex gap-1">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${(d.ingresos / maxFlujo) * 50}%` }}
                      />
                      <div
                        className="bg-rose-400 h-full rounded-full transition-all"
                        style={{ width: `${(d.egresos / maxFlujo) * 50}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No se registran movimientos en el historial reciente
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA: FORECAST */}
      {tabActiva === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Proyección de Flujo de Caja</h3>
              <p className="text-[11px] text-slate-500">Estimación de liquidez basada en vencimientos de CxC y CxP</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ForecastHorizonCard
                periodo="Próximos 30 días"
                entradas={resumen.forecast.entradas30}
                salidas={resumen.forecast.salidas30}
                proyectado={resumen.forecast.proyectado30}
                fmt={fmt}
              />
              <ForecastHorizonCard
                periodo="Próximos 60 días"
                entradas={resumen.forecast.entradas60}
                salidas={resumen.forecast.salidas60}
                proyectado={resumen.forecast.proyectado60}
                fmt={fmt}
              />
              <ForecastHorizonCard
                periodo="Próximos 90 días"
                entradas={resumen.forecast.entradas90}
                salidas={resumen.forecast.salidas90}
                proyectado={resumen.forecast.proyectado90}
                fmt={fmt}
              />
            </div>
          </div>

          {/* DETALLE ESTRUCTURAL */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Estructura de Liquidez y Compromisos</h3>
            <div className="divide-y divide-slate-100">
              {[
                { label: 'CxC Pendiente por cobrar (Cartera activa)', value: resumen.cartera.cxcPendiente, type: 'ingreso' },
                { label: 'CxP Pendiente por pagar (Obligaciones)', value: resumen.cartera.cxpPendiente, type: 'egreso' },
                { label: 'Cuotas de préstamos por amortizar', value: resumen.deuda.prestamosPendientes, type: 'egreso' },
                { label: 'Saldo disponible inmediato en bancos y caja', value: resumen.liquidez.disponible, type: 'liquidez' },
              ].map((row, idx) => (
                <div key={idx} className="flex items-center justify-between py-3">
                  <span className="text-xs font-medium text-slate-700">{row.label}</span>
                  <span className={`text-sm font-bold font-mono ${
                    row.type === 'ingreso' ? 'text-blue-600' :
                    row.type === 'egreso' ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {fmt(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tarjeta de Antigüedad (Aging CxC / CxP) limpia y sin ruido visual
 */
function AgingCard({ title, subtitle, icon: Icon, aging, tipo, totalCartera, fmt, onNavigate, actionLabel }) {
  const entries = Object.entries(aging || {});
  const totalSum = entries.reduce((s, [, v]) => s + (Number(v.total) || 0), 0);
  const colorBg = tipo === 'cxc' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600';

  const bracketLabels = {
    '0-30': { label: '0 a 30 días', dot: 'bg-emerald-500', badge: 'Al día', badgeClass: 'bg-emerald-50 text-emerald-700' },
    '31-60': { label: '31 a 60 días', dot: 'bg-amber-400', badge: 'Vencido 1-30d', badgeClass: 'bg-amber-50 text-amber-700' },
    '61-90': { label: '61 a 90 días', dot: 'bg-orange-500', badge: 'Vencido 31-60d', badgeClass: 'bg-orange-50 text-orange-700' },
    '+90': { label: 'Más de 90 días', dot: 'bg-rose-500', badge: 'Crítico +90d', badgeClass: 'bg-rose-50 text-rose-700' },
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Cabecera de la tarjeta */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${colorBg} flex items-center justify-center shrink-0`}>
              <Icon size={16} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={onNavigate}
              className={`text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                tipo === 'cxc' ? 'text-blue-600 hover:text-blue-700' : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              {actionLabel}
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Barra de progreso segmentada o banner positivo */}
        {totalSum > 0 ? (
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4 gap-0.5">
            {entries.map(([k, v]) => {
              if (!v.total || v.total <= 0) return null;
              const pct = (v.total / totalSum) * 100;
              const barColor =
                k === '0-30' ? 'bg-emerald-500' :
                k === '31-60' ? 'bg-amber-400' :
                k === '61-90' ? 'bg-orange-500' : 'bg-rose-500';
              return (
                <div
                  key={k}
                  className={`${barColor} h-full transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${bracketLabels[k]?.label || k}: ${fmt(v.total)}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4 flex items-center gap-2.5 text-xs text-slate-600">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>Al día: no registras saldos ni documentos pendientes en este concepto.</span>
          </div>
        )}

        {/* Filas de Aging */}
        <div className="space-y-2">
          {entries.map(([k, v]) => {
            const info = bracketLabels[k] || { label: `${k} días`, dot: 'bg-slate-400' };
            const hasData = (v.count || 0) > 0;

            return (
              <div
                key={k}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                  hasData
                    ? 'bg-slate-50/70 border border-slate-100'
                    : 'bg-white border border-slate-100/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${info.dot} shrink-0`} />
                  <span className={`text-xs ${hasData ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                    {info.label}
                  </span>
                  {hasData && info.badge && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${info.badgeClass}`}>
                      {info.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className={`text-xs ${hasData ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    {v.count || 0} {v.count === 1 ? 'doc' : 'docs'}
                  </span>
                  <span className={`text-xs font-mono ${hasData ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                    {fmt(v.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pie de tarjeta con total */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Total Acumulado</span>
        <span className="font-bold text-slate-900 font-mono text-sm">{fmt(totalCartera || totalSum)}</span>
      </div>
    </div>
  );
}

/**
 * Tarjeta de horizonte en proyección Forecast
 */
function ForecastHorizonCard({ periodo, entradas, salidas, proyectado, fmt }) {
  const isPositive = (Number(proyectado) || 0) >= 0;

  return (
    <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800">{periodo}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
            {isPositive ? 'Superávit' : 'Déficit'}
          </span>
        </div>
        <div className="space-y-1.5 my-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Entradas esperadas:</span>
            <span className="font-semibold text-emerald-700 font-mono">+{fmt(entradas)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Salidas previstas:</span>
            <span className="font-semibold text-rose-600 font-mono">-{fmt(salidas)}</span>
          </div>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Balance Proyectado:</span>
        <span className={`font-bold font-mono text-sm ${isPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
          {fmt(proyectado)}
        </span>
      </div>
    </div>
  );
}
