import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, Wallet, Building2, CreditCard,
  Landmark, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Calendar,
  PieChart, RefreshCw, BarChart3, Target, ChevronRight, Clock
} from 'lucide-react';
import { getResumenFinanciero, getFlujoCajaMensual } from '../../services/resumenService';
import { getMovimientos } from '../../services/movimientoService';

const TABS_RESUMEN = [
  { id: 'general', label: 'General' },
  { id: 'flujo', label: 'Flujo de Caja' },
  { id: 'forecast', label: 'Forecast' },
];

const PRIORIDAD_STYLES = {
  alta: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  media: 'bg-warning-light text-warning border-warning/20',
  baja: 'bg-surface-sidebar text-text-secondary border-border-default',
};

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const fmt = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const fmtShort = (v) => {
    const n = Number(v) || 0;
    if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-surface-sidebar rounded-card" />)}
        </div>
        <div className="h-64 bg-surface-sidebar rounded-card" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 bg-surface-sidebar rounded-card" />
          <div className="h-40 bg-surface-sidebar rounded-card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-error text-lg mb-2">Error al cargar</div>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <button onClick={cargar} className="px-4 py-2 bg-primary text-white rounded-btn text-sm">Reintentar</button>
      </div>
    );
  }

  if (!resumen) return null;

  const maxFlujo = Math.max(...flujoMensual.flatMap(d => [d.ingresos, d.egresos]), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <PieChart size={20} className="text-primary" />
          Resumen Financiero
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={periodo.fechaDesde.slice(0, 7)}
            onChange={e => {
              const d = e.target.value + '-01';
              const lastDay = new Date(new Date(d).getFullYear(), new Date(d).getMonth() + 1, 0).toISOString().slice(0, 10);
              setPeriodo({ fechaDesde: d, fechaHasta: lastDay });
            }}
            className="px-3 py-1.5 text-sm border border-border-default rounded-btn bg-white text-text-primary"
          />
          <button onClick={cargar} className="p-1.5 border border-border-default rounded-btn text-text-secondary hover:text-primary">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border-default">
        {TABS_RESUMEN.map(t => (
          <button
            key={t.id}
            onClick={() => setTabActiva(t.id)}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tabActiva === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabActiva === 'general' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-card border border-border-default rounded-card p-4">
              <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
                <DollarSign size={14} className={resumen.flujoMes.neto >= 0 ? 'text-success' : 'text-error'} />
                Flujo del Mes
              </div>
              <div className={`text-lg font-bold ${resumen.flujoMes.neto >= 0 ? 'text-success' : 'text-error'}`}>
                {fmt(resumen.flujoMes.neto)}
              </div>
              <div className="flex gap-2 mt-1 text-xs text-text-secondary">
                <span className="text-success">+{fmtShort(resumen.flujoMes.ingresos)}</span>
                <span className="text-error">-{fmtShort(resumen.flujoMes.egresos)}</span>
              </div>
            </div>

            <div className="bg-surface-card border border-border-default rounded-card p-4">
              <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
                <Wallet size={14} className="text-primary" />
                Cartera Neta
              </div>
              <div className={`text-lg font-bold ${resumen.cartera.neto >= 0 ? 'text-primary' : 'text-error'}`}>
                {fmt(resumen.cartera.neto)}
              </div>
              <div className="flex gap-2 mt-1 text-xs text-text-secondary">
                <span>CxC: {fmtShort(resumen.cartera.cxcPendiente)}</span>
                <span>CxP: {fmtShort(resumen.cartera.cxpPendiente)}</span>
              </div>
            </div>

            <div className="bg-surface-card border border-border-default rounded-card p-4">
              <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
                <CreditCard size={14} className="text-error" />
                Deuda Total
              </div>
              <div className="text-lg font-bold text-error">{fmt(resumen.deuda.total)}</div>
              <div className="flex gap-2 mt-1 text-xs text-text-secondary">
                <span>Prést: {fmtShort(resumen.deuda.prestamosPendientes)}</span>
                <span>Tarj: {fmtShort(resumen.deuda.tarjetasUtilizadas)}</span>
              </div>
            </div>

            <div className="bg-surface-card border border-border-default rounded-card p-4">
              <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
                <Building2 size={14} className="text-success" />
                Liquidez
              </div>
              <div className="text-lg font-bold text-success">{fmt(resumen.liquidez.disponible)}</div>
              <div className="flex gap-2 mt-1 text-xs text-text-secondary">
                <span>Bancos: {fmtShort(resumen.liquidez.bancos)}</span>
                <span>Caja: {fmtShort(resumen.liquidez.caja)}</span>
              </div>
            </div>
          </div>

          {resumen.alertas.length > 0 && (
            <div className="bg-surface-card border border-border-default rounded-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1">
                <AlertTriangle size={14} className="text-warning" />
                Alertas Prioritarias ({resumen.alertas.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {resumen.alertas.slice(0, 10).map((a, idx) => {
                  const Icon = TIPO_ICONOS[a.tipo] || AlertTriangle;
                  return (
                    <div key={idx} className={`flex items-start gap-3 p-2 rounded-card border ${PRIORIDAD_STYLES[a.prioridad]}`}>
                      <Icon size={14} className="shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.mensaje}</p>
                        {a.monto > 0 && <p className="text-xs mt-0.5 opacity-75">{fmt(a.monto)}</p>}
                      </div>
                      <span className="text-xs font-bold uppercase shrink-0">{a.prioridad}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-card border border-border-default rounded-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1">
                <Clock size={14} />
                Aging CxC (Por Cobrar)
              </h3>
              <AgingBuckets aging={resumen.agingConsolidado.cxc} tipo="cxc" fmt={fmt} />
            </div>
            <div className="bg-surface-card border border-border-default rounded-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1">
                <Clock size={14} />
                Aging CxP (Por Pagar)
              </h3>
              <AgingBuckets aging={resumen.agingConsolidado.cxp} tipo="cxp" fmt={fmt} />
            </div>
          </div>

          {onNavigate && (
            <div className="bg-surface-card border border-border-default rounded-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Accesos Rápidos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'movimientos', label: 'Movimientos', icon: DollarSign },
                  { id: 'cxc', label: 'Cuentas por Cobrar', icon: TrendingUp },
                  { id: 'cxp', label: 'Cuentas por Pagar', icon: ArrowUpCircle },
                  { id: 'bancos', label: 'Bancos y Caja', icon: Building2 },
                  { id: 'tarjetas', label: 'Tarjetas', icon: CreditCard },
                  { id: 'prestamos', label: 'Préstamos', icon: Landmark },
                ].map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => onNavigate(acc.id)}
                    className="flex items-center gap-2 p-3 rounded-card border border-border-default text-left text-sm text-text-primary hover:bg-surface-sidebar transition-colors group"
                  >
                    <acc.icon size={16} className="text-primary shrink-0" />
                    <span className="flex-1 text-xs font-medium">{acc.label}</span>
                    <ChevronRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tabActiva === 'flujo' && (
        <div className="space-y-4">
          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-1">
              <BarChart3 size={14} />
              Flujo de Caja - Últimos 6 meses
            </h3>
            {flujoMensual.length > 0 ? (
              <div className="space-y-3">
                {flujoMensual.map((d, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary font-medium w-14">{d.mes}</span>
                      <span className="text-success font-semibold">{fmtShort(d.ingresos)}</span>
                      <span className="text-error font-semibold">{fmtShort(d.egresos)}</span>
                      <span className={`font-bold w-16 text-right ${d.neto >= 0 ? 'text-success' : 'text-error'}`}>
                        {fmtShort(d.neto)}
                      </span>
                    </div>
                    <div className="flex gap-1 h-5">
                      <div
                        className="bg-success/20 rounded-btn h-full transition-all"
                        style={{ width: `${(d.ingresos / maxFlujo) * 50}%` }}
                      />
                      <div
                        className="bg-error/20 rounded-btn h-full transition-all"
                        style={{ width: `${(d.egresos / maxFlujo) * 50}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-2 border-t border-border-default text-xs text-text-secondary">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-success/20 rounded-btn" /> Ingresos</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-error/20 rounded-btn" /> Egresos</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary text-sm">Sin datos de flujo para el período</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-card border border-border-default rounded-card p-4 text-center">
              <div className="text-xs text-text-secondary mb-1">Total Ingresos</div>
              <div className="text-lg font-bold text-success">
                {fmtShort(flujoMensual.reduce((s, d) => s + d.ingresos, 0))}
              </div>
            </div>
            <div className="bg-surface-card border border-border-default rounded-card p-4 text-center">
              <div className="text-xs text-text-secondary mb-1">Total Egresos</div>
              <div className="text-lg font-bold text-error">
                {fmtShort(flujoMensual.reduce((s, d) => s + d.egresos, 0))}
              </div>
            </div>
            <div className="bg-surface-card border border-border-default rounded-card p-4 text-center">
              <div className="text-xs text-text-secondary mb-1">Balance</div>
              <div className={`text-lg font-bold ${
                flujoMensual.reduce((s, d) => s + d.neto, 0) >= 0 ? 'text-success' : 'text-error'
              }`}>
                {fmtShort(flujoMensual.reduce((s, d) => s + d.neto, 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tabActiva === 'forecast' && (
        <div className="space-y-4">
          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-1">
              <Target size={14} />
              Proyección de Flujo de Caja
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <ForecastCard
                periodo="30 días"
                entradas={resumen.forecast.entradas30}
                salidas={resumen.forecast.salidas30}
                proyectado={resumen.forecast.proyectado30}
                fmt={fmt}
              />
              <ForecastCard
                periodo="60 días"
                entradas={resumen.forecast.entradas60}
                salidas={resumen.forecast.salidas60}
                proyectado={resumen.forecast.proyectado60}
                fmt={fmt}
              />
              <ForecastCard
                periodo="90 días"
                entradas={resumen.forecast.entradas90}
                salidas={resumen.forecast.salidas90}
                proyectado={resumen.forecast.proyectado90}
                fmt={fmt}
              />
            </div>
          </div>

          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1">
              <Calendar size={14} />
              Detalle de Proyección
            </h3>
            <div className="space-y-2">
              {[
                { label: 'CxC Pendiente por cobrar', value: resumen.cartera.cxcPendiente, color: 'text-primary' },
                { label: 'CxP Pendiente por pagar', value: resumen.cartera.cxpPendiente, color: 'text-error' },
                { label: 'Cuotas préstamo pendientes', value: resumen.deuda.prestamosPendientes, color: 'text-error' },
                { label: 'Saldo disponible en cuentas', value: resumen.liquidez.disponible, color: 'text-success' },
              ].map((row, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border-default last:border-0">
                  <span className="text-xs text-text-secondary">{row.label}</span>
                  <span className={`text-sm font-bold ${row.color}`}>{fmt(row.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgingBuckets({ aging, tipo, fmt }) {
  const entries = Object.entries(aging);
  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);
  const color = tipo === 'cxc' ? 'bg-primary' : 'bg-error';

  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">{k} días</span>
            <span className="text-text-primary font-medium">{v.count} docs</span>
            <span className="text-text-primary font-bold">{fmt(v.total)}</span>
          </div>
          <div className="h-2 bg-surface-sidebar rounded-btn overflow-hidden">
            <div
              className={`h-full ${color}/30 rounded-btn transition-all`}
              style={{ width: `${(v.total / maxTotal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ForecastCard({ periodo, entradas, salidas, proyectado, fmt }) {
  return (
    <div className="border border-border-default rounded-card p-3 text-center">
      <div className="text-xs text-text-secondary font-semibold mb-2">{periodo}</div>
      <div className="space-y-1.5">
        <div>
          <div className="text-xs text-text-secondary">Entradas</div>
          <div className="text-sm font-bold text-success">{fmt(entradas)}</div>
        </div>
        <div>
          <div className="text-xs text-text-secondary">Salidas</div>
          <div className="text-sm font-bold text-error">{fmt(salidas)}</div>
        </div>
        <div className="pt-1.5 border-t border-border-default">
          <div className="text-xs text-text-secondary">Proyectado</div>
          <div className={`text-sm font-bold ${proyectado >= 0 ? 'text-success' : 'text-error'}`}>
            {fmt(proyectado)}
          </div>
        </div>
      </div>
    </div>
  );
}
