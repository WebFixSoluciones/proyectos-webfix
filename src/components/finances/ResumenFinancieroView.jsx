import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiHeading, UiCard } from '../ui/layout';
import { UiButton, UiInput } from '../ui/controls';
import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, Wallet, Building2, CreditCard,
  Landmark, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Calendar,
  PieChart, RefreshCw, BarChart3, Target, ChevronRight, Clock
} from 'lucide-react';
import { getResumenFinanciero, getFlujoCajaMensual } from '../../services/resumenService';
import { getMovimientos } from '../../services/movimientoService';
import FinancialPageHeader from './FinancialPageHeader';

const TABS_RESUMEN = [
  { id: 'general', label: 'General' },
  { id: 'flujo', label: 'Flujo de Caja' },
  { id: 'forecast', label: 'Forecast' },
];

const PRIORIDAD_STYLES = {
  alta: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
  media: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  baja: {"style":{"backgroundColor":"var(--gray-3)","color":"var(--gray-11)"}},
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
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
          {[1, 2, 3, 4].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-24"}} />)}
        </UiBox>
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-64"}} />
        <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-40"}} />
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-40"}} />
        </UiBox>
      </UiBox>
    );
  }

  if (error) {
    return (
      <UiBox {...{"className":"text-center py-12"}}>
        <UiBox {...{"style":{"color":"var(--red-12)"},"className":"mb-2"}}>Error al cargar</UiBox>
        <UiText as="p" {...{"color":"gray","size":"2","className":"mb-4"}}>{error}</UiText>
        <UiButton onClick={cargar} {...{"variant":"solid","color":"blue","size":"2"}}>Reintentar</UiButton>
      </UiBox>
    );
  }

  if (!resumen) return null;

  const maxFlujo = Math.max(...flujoMensual.flatMap(d => [d.ingresos, d.egresos]), 1);

  return (
    <UiBox {...{"className":"space-y-4"}}>
      <FinancialPageHeader
        icon={PieChart}
        title="Resumen Financiero"
        description="Panel ejecutivo de tesorería, liquidez y proyección de flujo de caja"
        badge="Ecuador"
        badgeColor="blue"
        actions={
          <UiBox {...{"className":"flex items-center gap-2"}}>
            <UiInput
              type="month"
              value={periodo.fechaDesde.slice(0, 7)}
              onChange={e => {
                const d = e.target.value + '-01';
                const lastDay = new Date(new Date(d).getFullYear(), new Date(d).getMonth() + 1, 0).toISOString().slice(0, 10);
                setPeriodo({ fechaDesde: d, fechaHasta: lastDay });
              }}
              {...{"size":"2","color":"gray"}}
            />
            <UiButton iconOnly onClick={cargar} {...{"variant":"outline","color":"gray"}} title="Actualizar datos">
              <RefreshCw size={16} />
            </UiButton>
          </UiBox>
        }
      />

      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex gap-1"}}>
        {TABS_RESUMEN.map(t => (
          <UiButton
            key={t.id}
            onClick={() => setTabActiva(t.id)}
            {...mergeThemeProps({"size":"2","className":"-mb-px"}, {}, (tabActiva === t.id ? {"color":"blue"} : {"color":"gray"}))}
          >
            {t.label}
          </UiButton>
        ))}
      </UiBox>

      {tabActiva === 'general' && (
        <>
          <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
                <DollarSign size={14} {...(resumen.flujoMes.neto >= 0 ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--red-12)"}})} />
                Flujo del Mes
              </UiBox>
              <UiBox {...mergeThemeProps({}, {}, (resumen.flujoMes.neto >= 0 ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--red-12)"}}))}>
                {fmt(resumen.flujoMes.neto)}
              </UiBox>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex gap-2 mt-1"}}>
                <UiText {...{"color":"green"}}>+{fmtShort(resumen.flujoMes.ingresos)}</UiText>
                <UiText {...{"color":"red"}}>-{fmtShort(resumen.flujoMes.egresos)}</UiText>
              </UiBox>
            </UiCard>

            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
                <Wallet size={14} {...{"style":{"color":"var(--blue-12)"}}} />
                Cartera Neta
              </UiBox>
              <UiBox {...mergeThemeProps({}, {}, (resumen.cartera.neto >= 0 ? {"style":{"color":"var(--blue-12)"}} : {"style":{"color":"var(--red-12)"}}))}>
                {fmt(resumen.cartera.neto)}
              </UiBox>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex gap-2 mt-1"}}>
                <UiText>CxC: {fmtShort(resumen.cartera.cxcPendiente)}</UiText>
                <UiText>CxP: {fmtShort(resumen.cartera.cxpPendiente)}</UiText>
              </UiBox>
            </UiCard>

            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
                <CreditCard size={14} {...{"style":{"color":"var(--red-12)"}}} />
                Deuda Total
              </UiBox>
              <UiBox {...{"style":{"color":"var(--red-12)"}}}>{fmt(resumen.deuda.total)}</UiBox>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex gap-2 mt-1"}}>
                <UiText>Prést: {fmtShort(resumen.deuda.prestamosPendientes)}</UiText>
                <UiText>Tarj: {fmtShort(resumen.deuda.tarjetasUtilizadas)}</UiText>
              </UiBox>
            </UiCard>

            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}>
                <Building2 size={14} {...{"style":{"color":"var(--green-12)"}}} />
                Liquidez
              </UiBox>
              <UiBox {...{"style":{"color":"var(--green-12)"}}}>{fmt(resumen.liquidez.disponible)}</UiBox>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex gap-2 mt-1"}}>
                <UiText>Bancos: {fmtShort(resumen.liquidez.bancos)}</UiText>
                <UiText>Caja: {fmtShort(resumen.liquidez.caja)}</UiText>
              </UiBox>
            </UiCard>
          </UiBox>

          {resumen.alertas.length > 0 && (
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-1"}}>
                <AlertTriangle size={14} {...{"style":{"color":"var(--amber-12)"}}} />
                Alertas Prioritarias ({resumen.alertas.length})
              </UiHeading>
              <UiBox {...{"className":"space-y-2 max-h-64 overflow-y-auto custom-scrollbar"}}>
                {resumen.alertas.slice(0, 10).map((a, idx) => {
                  const Icon = TIPO_ICONOS[a.tipo] || AlertTriangle;
                  return (
                    <UiBox key={idx} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"flex items-start gap-3 p-2"}, {}, resolveThemeProps(PRIORIDAD_STYLES[a.prioridad]))}>
                      <Icon size={14} {...{"className":"shrink-0 mt-0.5"}} />
                      <UiBox {...{"className":"flex-1 min-w-0"}}>
                        <UiText as="p" {...{"size":"1","weight":"medium","className":"truncate"}}>{a.mensaje}</UiText>
                        {a.monto > 0 && <UiText as="p" {...{"size":"1","className":"mt-0.5 opacity-75"}}>{fmt(a.monto)}</UiText>}
                      </UiBox>
                      <UiText {...{"size":"1","weight":"bold","className":"shrink-0"}}>{a.prioridad}</UiText>
                    </UiBox>
                  );
                })}
              </UiBox>
            </UiCard>
          )}

          <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 gap-4"}}>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-1"}}>
                <Clock size={14} />
                Aging CxC (Por Cobrar)
              </UiHeading>
              <AgingBuckets aging={resumen.agingConsolidado.cxc} tipo="cxc" fmt={fmt} />
            </UiCard>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-1"}}>
                <Clock size={14} />
                Aging CxP (Por Pagar)
              </UiHeading>
              <AgingBuckets aging={resumen.agingConsolidado.cxp} tipo="cxp" fmt={fmt} />
            </UiCard>
          </UiBox>

          {onNavigate && (
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-3"}}>Accesos Rápidos</UiHeading>
              <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-3 gap-2"}}>
                {[
                  { id: 'movimientos', label: 'Movimientos', icon: DollarSign },
                  { id: 'cxc', label: 'Cuentas por Cobrar', icon: TrendingUp },
                  { id: 'cxp', label: 'Cuentas por Pagar', icon: ArrowUpCircle },
                  { id: 'bancos', label: 'Bancos y Caja', icon: Building2 },
                  { id: 'tarjetas', label: 'Tarjetas', icon: CreditCard },
                  { id: 'prestamos', label: 'Préstamos', icon: Landmark },
                ].map(acc => (
                  <UiButton
                    key={acc.id}
                    onClick={() => onNavigate(acc.id)}
                    {...{"variant":"outline","size":"2","color":"gray","className":"flex items-center gap-2 text-left group"}}
                  >
                    <acc.icon size={16} className="text-primary shrink-0" />
                    <UiText {...{"size":"1","weight":"medium","className":"flex-1"}}>{acc.label}</UiText>
                    <ChevronRight size={14} {...{"style":{"color":"var(--gray-11)"}}} />
                  </UiButton>
                ))}
              </UiBox>
            </UiCard>
          )}
        </>
      )}

      {tabActiva === 'flujo' && (
        <UiBox {...{"className":"space-y-4"}}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-4 flex items-center gap-1"}}>
              <BarChart3 size={14} />
              Flujo de Caja - Últimos 6 meses
            </UiHeading>
            {flujoMensual.length > 0 ? (
              <UiBox {...{"className":"space-y-3"}}>
                {flujoMensual.map((d, idx) => (
                  <UiBox key={idx} {...{"className":"space-y-1"}}>
                    <UiBox {...{"className":"flex items-center justify-between"}}>
                      <UiText {...{"color":"gray","weight":"medium","className":"w-14"}}>{d.mes}</UiText>
                      <UiText {...{"color":"green","weight":"bold"}}>{fmtShort(d.ingresos)}</UiText>
                      <UiText {...{"color":"red","weight":"bold"}}>{fmtShort(d.egresos)}</UiText>
                      <UiText {...mergeThemeProps({"weight":"bold","className":"w-16 text-right"}, {}, (d.neto >= 0 ? {"color":"green"} : {"color":"red"}))}>
                        {fmtShort(d.neto)}
                      </UiText>
                    </UiBox>
                    <UiBox {...{"className":"flex gap-1 h-5"}}>
                      <UiBox
                        {...{"style":{"backgroundColor":"var(--green-3)","borderRadius":"var(--radius-3)"},"className":"h-full"}}
                        style={{ width: `${(d.ingresos / maxFlujo) * 50}%` }}
                      />
                      <UiBox
                        {...{"style":{"backgroundColor":"var(--red-3)","borderRadius":"var(--radius-3)"},"className":"h-full"}}
                        style={{ width: `${(d.egresos / maxFlujo) * 50}%` }}
                      />
                    </UiBox>
                  </UiBox>
                ))}
                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-11)"},"className":"flex items-center gap-4 pt-2"}}>
                  <UiText {...{"className":"flex items-center gap-1"}}><UiText {...{"className":"w-3 h-3"}} /> Ingresos</UiText>
                  <UiText {...{"className":"flex items-center gap-1"}}><UiText {...{"className":"w-3 h-3"}} /> Egresos</UiText>
                </UiBox>
              </UiBox>
            ) : (
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"text-center py-8"}}>Sin datos de flujo para el período</UiBox>
            )}
          </UiCard>

          <UiBox {...{"className":"grid grid-cols-3 gap-4"}}>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 text-center"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mb-1"}}>Total Ingresos</UiBox>
              <UiBox {...{"style":{"color":"var(--green-12)"}}}>
                {fmtShort(flujoMensual.reduce((s, d) => s + d.ingresos, 0))}
              </UiBox>
            </UiCard>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 text-center"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mb-1"}}>Total Egresos</UiBox>
              <UiBox {...{"style":{"color":"var(--red-12)"}}}>
                {fmtShort(flujoMensual.reduce((s, d) => s + d.egresos, 0))}
              </UiBox>
            </UiCard>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 text-center"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mb-1"}}>Balance</UiBox>
              <UiBox {...mergeThemeProps({}, {}, (flujoMensual.reduce((s, d) => s + d.neto, 0) >= 0 ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--red-12)"}}))}>
                {fmtShort(flujoMensual.reduce((s, d) => s + d.neto, 0))}
              </UiBox>
            </UiCard>
          </UiBox>
        </UiBox>
      )}

      {tabActiva === 'forecast' && (
        <UiBox {...{"className":"space-y-4"}}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-4 flex items-center gap-1"}}>
              <Target size={14} />
              Proyección de Flujo de Caja
            </UiHeading>
            <UiBox {...{"className":"grid grid-cols-3 gap-4"}}>
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
            </UiBox>
          </UiCard>

          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-1"}}>
              <Calendar size={14} />
              Detalle de Proyección
            </UiHeading>
            <UiBox {...{"className":"space-y-2"}}>
              {[
                { label: 'CxC Pendiente por cobrar', value: resumen.cartera.cxcPendiente, color: {"style":{"color":"var(--blue-11)"}} },
                { label: 'CxP Pendiente por pagar', value: resumen.cartera.cxpPendiente, color: {"style":{"color":"var(--red-11)"}} },
                { label: 'Cuotas préstamo pendientes', value: resumen.deuda.prestamosPendientes, color: {"style":{"color":"var(--red-11)"}} },
                { label: 'Saldo disponible en cuentas', value: resumen.liquidez.disponible, color: {"style":{"color":"var(--green-11)"}} },
              ].map((row, idx) => (
                <UiBox key={idx} {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between py-2"}}>
                  <UiText {...{"size":"1","color":"gray"}}>{row.label}</UiText>
                  <UiText {...mergeThemeProps({"size":"2","weight":"bold"}, {}, resolveThemeProps(row.color))}>{fmt(row.value)}</UiText>
                </UiBox>
              ))}
            </UiBox>
          </UiCard>
        </UiBox>
      )}
    </UiBox>
  );
}

function AgingBuckets({ aging, tipo, fmt }) {
  const entries = Object.entries(aging);
  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);
  const color = tipo === 'cxc' ? {"style":{"backgroundColor":"var(--blue-9)"}} : {"style":{"backgroundColor":"var(--red-9)"}};

  return (
    <UiBox {...{"className":"space-y-2"}}>
      {entries.map(([k, v]) => (
        <UiBox key={k} {...{"className":"space-y-0.5"}}>
          <UiBox {...{"className":"flex items-center justify-between"}}>
            <UiText {...{"color":"gray"}}>{k} días</UiText>
            <UiText {...{"color":"gray","highContrast":true,"weight":"medium"}}>{v.count} docs</UiText>
            <UiText {...{"color":"gray","highContrast":true,"weight":"bold"}}>{fmt(v.total)}</UiText>
          </UiBox>
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-2 overflow-hidden"}}>
            <UiBox
              {...mergeThemeProps({"className":"h-full"}, {"style":{"borderRadius":"var(--radius-3)"},"className":"/30"}, resolveThemeProps(color))}
              style={{ width: `${(v.total / maxTotal) * 100}%` }}
            />
          </UiBox>
        </UiBox>
      ))}
    </UiBox>
  );
}

function ForecastCard({ periodo, entradas, salidas, proyectado, fmt }) {
  return (
    <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"p-3 text-center"}}>
      <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mb-2"}}>{periodo}</UiBox>
      <UiBox {...{"className":"space-y-1.5"}}>
        <UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Entradas</UiBox>
          <UiBox {...{"style":{"color":"var(--green-12)"}}}>{fmt(entradas)}</UiBox>
        </UiBox>
        <UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Salidas</UiBox>
          <UiBox {...{"style":{"color":"var(--red-12)"}}}>{fmt(salidas)}</UiBox>
        </UiBox>
        <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-1.5"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Proyectado</UiBox>
          <UiBox {...mergeThemeProps({}, {}, (proyectado >= 0 ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--red-12)"}}))}>
            {fmt(proyectado)}
          </UiBox>
        </UiBox>
      </UiBox>
    </UiBox>
  );
}
