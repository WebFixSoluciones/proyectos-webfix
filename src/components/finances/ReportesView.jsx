import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiText } from '../ui/layout';
import { UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiButton, UiInput } from '../ui/controls';
import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Clock, FileText, Download,
  Printer, AlertTriangle, Users, Landmark, Calculator, Shield,
  BarChart3, Search, Wallet, Receipt
} from 'lucide-react';
import {
  getFlujoCaja, getAgingConsolidado, getReporteCartera, getReporteDeuda,
  getReporteImpuestos, getReporteAuditoria, exportarCSV, exportarPDF
} from '../../services/reportesService';
import FinancialPageHeader from './FinancialPageHeader';

const TABS = [
  { id: 'flujo', label: 'Flujo de Caja', icon: BarChart3, color: {"style":{"color":"var(--green-11)"}} },
  { id: 'aging', label: 'Aging CxC/CxP', icon: Clock, color: {"style":{"color":"var(--amber-11)"}} },
  { id: 'cartera', label: 'Cartera', icon: Wallet, color: {"style":{"color":"var(--blue-11)"}} },
  { id: 'deuda', label: 'Deuda', icon: Landmark, color: {"style":{"color":"var(--red-11)"}} },
  { id: 'impuestos', label: 'Impuestos', icon: Calculator, color: {"style":{"color":"var(--purple-11)"}} },
  { id: 'auditoria', label: 'Auditoría', icon: Shield, color: {"style":{"color":"var(--gray-11)"}} },
];

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function ReportesView({ db, showToast }) {
  const [tab, setTab] = useState('flujo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [filtros, setFiltros] = useState({ fechaDesde: '', fechaHasta: '', estado: 'all', search: '', usuario: '' });
  const [agingTipo, setAgingTipo] = useState('cxc');

  const fmt = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const fmtDate = (d) => {
    if (!d) return '-';
    const dt = d instanceof Date ? d : (d?.toDate?.() || new Date(d));
    return dt.toLocaleDateString('es-EC');
  };

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let result;
      switch (tab) {
        case 'flujo': result = await getFlujoCaja(db, filtros); break;
        case 'aging': result = await getAgingConsolidado(db, agingTipo, filtros); break;
        case 'cartera': result = await getReporteCartera(db, filtros); break;
        case 'deuda': result = await getReporteDeuda(db, filtros); break;
        case 'impuestos': result = await getReporteImpuestos(db, filtros); break;
        case 'auditoria': result = await getReporteAuditoria(db, filtros); break;
        default: result = null;
      }
      setData(result);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, tab, filtros, agingTipo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const handleExportCSV = () => {
    if (!data) return;
    const now = new Date().toISOString().slice(0, 10);
    switch (tab) {
      case 'flujo': {
        const h = ['Mes','Ingresos','Egresos','Saldo'];
        const r = data.serie.map(s => [s.mes, s.ingresos.toFixed(2), s.egresos.toFixed(2), s.saldo.toFixed(2)]);
        exportarCSV(h, r, `flujo_caja_${now}`);
        break;
      }
      case 'aging': {
        const h = ['Bucket','Documentos','Total'];
        const r = Object.entries(data.aging).map(([k,v]) => [`${k} días`, v.count, v.total.toFixed(2)]);
        exportarCSV(h, r, `aging_${agingTipo}_${now}`);
        break;
      }
      case 'cartera': {
        const h = ['Cliente','RUC','Documento','Emisión','Vence','Monto','Abonado','Saldo','Días','Estado'];
        const r = data.items.map(i => [i.cliente, i.ruc, i.documento, fmtDate(i.fechaEmision), fmtDate(i.fechaVencimiento), i.montoTotal.toFixed(2), i.abonado.toFixed(2), i.saldo.toFixed(2), i.diasVencido, i.estado]);
        exportarCSV(h, r, `cartera_${now}`);
        break;
      }
      case 'deuda': {
        const h = ['Tipo','Entidad','Número','Monto Original','Saldo','Pagado','Cuotas Pend.','Cuotas Venc.','Estado'];
        const r = [...data.prestamos, ...data.tarjetas].map(d => [d.tipo, d.entidad, d.numero, d.montoOriginal.toFixed(2), d.saldoPendiente.toFixed(2), d.totalPagado.toFixed(2), d.cuotasPendientes, d.cuotasVencidas, d.estado]);
        exportarCSV(h, r, `deuda_${now}`);
        break;
      }
      case 'impuestos': {
        const h = ['Mes','Base Ventas','IVA Ventas','Base Compras','IVA Compras','Ret. Ventas','Ret. Compras'];
        const r = data.serieMensual.map(s => [s.mes, s.baseVentas.toFixed(2), s.ivaVentas.toFixed(2), s.baseCompras.toFixed(2), s.ivaCompras.toFixed(2), s.retVentas.toFixed(2), s.retCompras.toFixed(2)]);
        exportarCSV(h, r, `impuestos_${now}`);
        break;
      }
      case 'auditoria': {
        const h = ['Fecha','Acción','Usuario','Colección','Documento','Módulo'];
        const r = data.items.map(i => [fmtDate(i.fecha), i.accion, i.usuario, i.coleccion, i.documentoId, i.modulo]);
        exportarCSV(h, r, `auditoria_${now}`);
        break;
      }
      default: break;
    }
    showToast?.('CSV exportado', 'success');
  };

  const handleExportPDF = () => {
    if (!data) return;
    const tabLabel = TABS.find(t => t.id === tab)?.label || '';
    let html;
    switch (tab) {
      case 'flujo':
        html = `<div><span class="kpi"><span class="kpi-label">Ingresos</span><br><span class="kpi-value">${fmt(data.totalIngresos)}</span></span>
          <span class="kpi"><span class="kpi-label">Egresos</span><br><span class="kpi-value">${fmt(data.totalEgresos)}</span></span>
          <span class="kpi"><span class="kpi-label">Saldo Neto</span><br><span class="kpi-value">${fmt(data.saldoNeto)}</span></span></div>
          <table><tr><th>Mes</th><th>Ingresos</th><th>Egresos</th><th>Saldo</th></tr>
          ${data.serie.map(s => `<tr><td>${s.mes}</td><td>${fmt(s.ingresos)}</td><td>${fmt(s.egresos)}</td><td>${fmt(s.saldo)}</td></tr>`).join('')}</table>`;
        break;
      case 'cartera':
        html = `<div><span class="kpi"><span class="kpi-label">Cartera</span><br><span class="kpi-value">${fmt(data.totalCartera)}</span></span>
          <span class="kpi"><span class="kpi-label">Vencido</span><br><span class="kpi-value">${fmt(data.totalVencido)}</span></span></div>
          <table><tr><th>Cliente</th><th>Doc</th><th>Saldo</th><th>Días</th><th>Estado</th></tr>
          ${data.items.slice(0, 50).map(i => `<tr><td>${i.cliente}</td><td>${i.documento}</td><td>${fmt(i.saldo)}</td><td>${i.diasVencido}</td><td>${i.estado}</td></tr>`).join('')}</table>`;
        break;
      default:
        html = `<p>Use exportación CSV para datos detallados de este reporte.</p>`;
    }
    exportarPDF(`Reporte - ${tabLabel}`, html, `reporte_${tab}`);
    showToast?.('PDF generado', 'success');
  };

  const renderFlujoCaja = () => {
    if (!data) return null;
    const maxVal = Math.max(...data.serie.map(s => Math.max(s.ingresos, s.egresos)), 1);
    return (
      <UiBox {...{"className":"space-y-4"}}>
        <UiBox {...{"className":"grid grid-cols-3 gap-3"}}>
          <KPI icon={TrendingUp} label="Ingresos" value={fmt(data.totalIngresos)} color={{"style":{"color":"var(--green-11)"}}} />
          <KPI icon={TrendingDown} label="Egresos" value={fmt(data.totalEgresos)} color={{"style":{"color":"var(--red-11)"}}} />
          <KPI icon={DollarSign} label="Saldo Neto" value={fmt(data.saldoNeto)} color={data.saldoNeto >= 0 ? {"style":{"color":"var(--green-11)"}} : {"style":{"color":"var(--red-11)"}}} />
        </UiBox>
        {data.serie.length === 0 ? (
          <EmptyState label="No hay movimientos en el período" />
        ) : (
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-1.5"}}><BarChart3 size={14} />Evolución Mensual</UiHeading>
            <UiBox {...{"className":"space-y-1.5"}}>
              {data.serie.map(s => {
                const [y, m] = s.mes.split('-');
                return (
                  <UiBox key={s.mes} {...{"className":"flex items-center gap-2"}}>
                    <UiText {...{"color":"gray","className":"w-14 shrink-0"}}>{MESES[parseInt(m)-1]} {y?.slice(2)}</UiText>
                    <UiBox {...{"className":"flex-1 flex items-center gap-1"}}>
                      <UiBox {...{"style":{"backgroundColor":"var(--green-3)","borderRadius":"var(--radius-3)"},"className":"h-3"}} style={{ width: `${(s.ingresos / maxVal) * 100}%`, minWidth: s.ingresos > 0 ? '2px' : '0' }} title={`Ingresos: ${fmt(s.ingresos)}`} />
                      <UiBox {...{"style":{"backgroundColor":"var(--red-3)","borderRadius":"var(--radius-3)"},"className":"h-3"}} style={{ width: `${(s.egresos / maxVal) * 100}%`, minWidth: s.egresos > 0 ? '2px' : '0' }} title={`Egresos: ${fmt(s.egresos)}`} />
                    </UiBox>
                    <UiText {...mergeThemeProps({"weight":"medium","className":"w-20 text-right"}, {}, (s.saldo >= 0 ? {"color":"green"} : {"color":"red"}))}>{fmt(s.saldo)}</UiText>
                  </UiBox>
                );
              })}
            </UiBox>
            <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-4 mt-3"}}>
              <UiText {...{"className":"flex items-center gap-1"}}><UiText {...{"className":"w-2.5 h-2.5 inline-block"}} /> Ingresos</UiText>
              <UiText {...{"className":"flex items-center gap-1"}}><UiText {...{"className":"w-2.5 h-2.5 inline-block"}} /> Egresos</UiText>
            </UiBox>
          </UiCard>
        )}
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
          <UiTable {...{"className":"w-full"}}>
            <UiTableHeader><UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
              <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Mes</UiTableHead>
              <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Ingresos</UiTableHead>
              <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Egresos</UiTableHead>
              <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Saldo</UiTableHead>
            </UiTableRow></UiTableHeader>
            <UiTableBody>
              {data.serie.map(s => {
                const [y, m] = s.mes.split('-');
                return (
                  <UiTableRow key={s.mes} {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-1.5"}}>{MESES[parseInt(m)-1]} {y}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--green-12)"},"className":"px-3 py-1.5 text-right"}}>{fmt(s.ingresos)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--red-12)"},"className":"px-3 py-1.5 text-right"}}>{fmt(s.egresos)}</UiTableCell>
                    <UiTableCell {...mergeThemeProps({"className":"px-3 py-1.5 text-right"}, {}, (s.saldo >= 0 ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--red-12)"}}))}>{fmt(s.saldo)}</UiTableCell>
                  </UiTableRow>
                );
              })}
            </UiTableBody>
          </UiTable>
        </UiBox>
      </UiBox>
    );
  };

  const renderAging = () => {
    if (!data) return null;
    const buckets = Object.entries(data.aging);
    const totalAging = data.totalPendiente || 1;
    return (
      <UiBox {...{"className":"space-y-4"}}>
        <UiBox {...{"className":"flex items-center gap-2"}}>
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"flex overflow-hidden"}}>
            <UiButton onClick={() => setAgingTipo('cxc')} {...mergeThemeProps({"size":"2"}, {}, (agingTipo === 'cxc' ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}>CxC</UiButton>
            <UiButton onClick={() => setAgingTipo('cxp')} {...mergeThemeProps({"size":"2"}, {}, (agingTipo === 'cxp' ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}>CxP</UiButton>
          </UiBox>
          <UiText {...{"size":"1","color":"gray"}}>{agingTipo === 'cxc' ? 'Cuentas por Cobrar' : 'Cuentas por Pagar'}</UiText>
        </UiBox>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-3"}}>
          {buckets.map(([k, v]) => {
            const pct = totalAging > 0 ? (v.total / totalAging) * 100 : 0;
            const bg = k === '+90' ? {"style":{"backgroundColor":"var(--red-3)"}} : k === '61-90' ? {"style":{"backgroundColor":"var(--amber-3)"}} : k === '31-60' ? {"style":{"backgroundColor":"var(--amber-3)"}} : {"style":{"backgroundColor":"var(--gray-3)"}};
            return (
              <UiBox key={k} {...mergeThemeProps({}, {"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"p-3"}, resolveThemeProps(bg))}>
                <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mb-0.5"}}>{k} días</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{v.count}</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-11)"}}}>{fmt(v.total)}</UiBox>
                <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","borderRadius":"var(--radius-3)"},"className":"mt-1.5 h-1 overflow-hidden"}}>
                  <UiBox {...{"style":{"backgroundColor":"var(--blue-9)","borderRadius":"var(--radius-3)"},"className":"h-full"}} style={{ width: `${Math.min(pct, 100)}%` }} />
                </UiBox>
              </UiBox>
            );
          })}
        </UiBox>
        <KPI icon={Wallet} label="Total Pendiente" value={fmt(data.totalPendiente)} color={{"style":{"color":"var(--blue-11)"}}} />
        {buckets.some(([,v]) => v.items.length > 0) ? (
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
            <UiTable {...{"className":"w-full"}}>
              <UiTableHeader><UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Tercero</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>RUC</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Documento</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Monto</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Saldo</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Días</UiTableHead>
              </UiTableRow></UiTableHeader>
              <UiTableBody>
                {buckets.flatMap(([,v]) => v.items).sort((a,b) => b.dias - a.dias).slice(0, 50).map(i => (
                  <UiTableRow key={i.id} {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-1.5"}}>{i.tercero}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-1.5"}}>{i.ruc}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-1.5"}}>{i.documento}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-1.5 text-right"}}>{fmt(i.monto)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-1.5 text-right"}}>{fmt(i.saldo)}</UiTableCell>
                    <UiTableCell {...mergeThemeProps({"className":"px-3 py-1.5 text-right"}, {}, (i.dias > 90 ? {"style":{"color":"var(--red-12)"}} : (i.dias > 30 ? {"style":{"color":"var(--amber-12)"}} : {"style":{"color":"var(--gray-11)"}})))}>{i.dias}</UiTableCell>
                  </UiTableRow>
                ))}
              </UiTableBody>
            </UiTable>
          </UiBox>
        ) : <EmptyState label="No hay saldos pendientes" />}
      </UiBox>
    );
  };

  const renderCartera = () => {
    if (!data) return null;
    return (
      <UiBox {...{"className":"space-y-4"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-3"}}>
          <KPI icon={Wallet} label="Cartera Total" value={fmt(data.totalCartera)} color={{"style":{"color":"var(--blue-11)"}}} />
          <KPI icon={AlertTriangle} label="Vencido" value={fmt(data.totalVencido)} color={{"style":{"color":"var(--red-11)"}}} />
          <KPI icon={DollarSign} label="Cobrado" value={fmt(data.totalCobrado)} color={{"style":{"color":"var(--green-11)"}}} />
          <KPI icon={FileText} label="Documentos" value={data.conteo} color={{"style":{"color":"var(--gray-11)"}}} />
        </UiBox>
        {data.porCliente.length > 0 && (
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-1.5"}}><Users size={14} />Resumen por Cliente</UiHeading>
            <UiBox {...{"className":"space-y-1.5"}}>
              {data.porCliente.slice(0, 10).map(c => (
                <UiBox key={c.ruc} {...{"className":"flex items-center gap-2"}}>
                  <UiText {...{"color":"gray","highContrast":true,"className":"flex-1 truncate"}}>{c.cliente}</UiText>
                  <UiText {...{"color":"gray","className":"shrink-0"}}>{c.facturas} doc</UiText>
                  <UiText {...{"color":"gray","highContrast":true,"weight":"medium","className":"w-20 text-right shrink-0"}}>{fmt(c.saldo)}</UiText>
                  {c.vencido > 0 && <UiText {...{"color":"red","size":"1","className":"w-20 text-right shrink-0"}}>Venc: {fmt(c.vencido)}</UiText>}
                </UiBox>
              ))}
            </UiBox>
          </UiCard>
        )}
        {data.items.length === 0 ? <EmptyState label="No hay documentos en cartera" /> : (
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
            <UiTable {...{"className":"w-full"}}>
              <UiTableHeader><UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Cliente</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Documento</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Monto</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Abonado</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Saldo</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Días</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-center"}}>Estado</UiTableHead>
              </UiTableRow></UiTableHeader>
              <UiTableBody>
                {data.items.slice(0, 100).map(i => (
                  <UiTableRow key={i.id} {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-1.5"}}>{i.cliente}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-1.5"}}>{i.documento}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-1.5 text-right"}}>{fmt(i.montoTotal)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--green-12)"},"className":"px-3 py-1.5 text-right"}}>{fmt(i.abonado)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-1.5 text-right"}}>{fmt(i.saldo)}</UiTableCell>
                    <UiTableCell {...mergeThemeProps({"className":"px-3 py-1.5 text-right"}, {}, (i.diasVencido > 60 ? {"style":{"color":"var(--red-12)"}} : (i.diasVencido > 0 ? {"style":{"color":"var(--amber-12)"}} : {"style":{"color":"var(--gray-11)"}})))}>{i.diasVencido}</UiTableCell>
                    <UiTableCell {...{"className":"px-3 py-1.5 text-center"}}><EstadoBadge estado={i.estado} /></UiTableCell>
                  </UiTableRow>
                ))}
              </UiTableBody>
            </UiTable>
          </UiBox>
        )}
      </UiBox>
    );
  };

  const renderDeuda = () => {
    if (!data) return null;
    const todas = [...data.prestamos, ...data.tarjetas];
    return (
      <UiBox {...{"className":"space-y-4"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-3"}}>
          <KPI icon={Landmark} label="Deuda Total" value={fmt(data.deudaTotal)} color={{"style":{"color":"var(--red-11)"}}} />
          <KPI icon={FileText} label="Préstamos" value={fmt(data.totalPrestamos)} color={{"style":{"color":"var(--red-11)"}}} />
          <KPI icon={Receipt} label="Tarjetas" value={fmt(data.totalTarjetas)} color={{"style":{"color":"var(--amber-11)"}}} />
          <KPI icon={AlertTriangle} label="Cuotas Vencidas" value={data.totalCuotasVencidas} color={data.totalCuotasVencidas > 0 ? {"style":{"color":"var(--red-11)"}} : {"style":{"color":"var(--green-11)"}}} />
        </UiBox>
        {data.prestamos.length > 0 && (
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-1.5"}}><Landmark size={14} />Préstamos Bancarios</UiHeading>
            <UiBox {...{"className":"space-y-1.5"}}>
              {data.prestamos.map(p => (
                <UiBox key={p.id} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"flex items-center gap-2 px-3 py-2"}}>
                  <UiBox {...{"className":"flex-1 min-w-0"}}>
                    <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"truncate"}}>{p.entidad}</UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-11)"}}}>{p.numero} · {p.cuotasPendientes} cuotas pend. {p.cuotasVencidas > 0 ? `· ${p.cuotasVencidas} vencidas` : ''}</UiBox>
                  </UiBox>
                  <UiBox {...{"className":"text-right shrink-0"}}>
                    <UiBox {...{"style":{"color":"var(--red-12)"}}}>{fmt(p.saldoPendiente)}</UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-11)"}}}>de {fmt(p.montoOriginal)}</UiBox>
                  </UiBox>
                  <EstadoBadge estado={p.estado} />
                </UiBox>
              ))}
            </UiBox>
          </UiCard>
        )}
        {data.tarjetas.length > 0 && (
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-3 flex items-center gap-1.5"}}><Receipt size={14} />Tarjetas de Crédito</UiHeading>
            <UiBox {...{"className":"space-y-1.5"}}>
              {data.tarjetas.map(t => (
                <UiBox key={t.id} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"flex items-center gap-2 px-3 py-2"}}>
                  <UiBox {...{"className":"flex-1 min-w-0"}}>
                    <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"truncate"}}>{t.entidad} ****{String(t.numero).slice(-4)}</UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-11)"}}}>{t.cuotasPendientes} cuotas pendientes</UiBox>
                  </UiBox>
                  <UiBox {...{"className":"text-right shrink-0"}}>
                    <UiBox {...{"style":{"color":"var(--amber-11)"}}}>{fmt(t.saldoPendiente)}</UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-11)"}}}>cupo: {fmt(t.montoOriginal)}</UiBox>
                  </UiBox>
                  <EstadoBadge estado={t.estado} />
                </UiBox>
              ))}
            </UiBox>
          </UiCard>
        )}
        {todas.length === 0 && <EmptyState label="No hay deudas registradas" />}
      </UiBox>
    );
  };

  const renderImpuestos = () => {
    if (!data) return null;
    return (
      <UiBox {...{"className":"space-y-4"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-3"}}>
          <KPI icon={TrendingUp} label="IVA Débito Fiscal" value={fmt(data.ivaVentas)} color={{"style":{"color":"var(--blue-11)"}}} />
          <KPI icon={TrendingDown} label="IVA Crédito Fiscal" value={fmt(data.ivaCompras)} color={{"style":{"color":"var(--purple-11)"}}} />
          <KPI icon={DollarSign} label="IVA Neto a Pagar" value={fmt(data.ivaNeto)} color={data.ivaNeto >= 0 ? {"style":{"color":"var(--red-11)"}} : {"style":{"color":"var(--green-11)"}}} />
          <KPI icon={Receipt} label="Retenciones Netas" value={fmt(data.retencionesNetas)} color={{"style":{"color":"var(--gray-11)"}}} />
        </UiBox>
        <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-2"}}>Ventas (Débito)</UiHeading>
            <UiBox {...{"className":"space-y-1"}}>
              <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>Base Imponible</UiText><UiText {...{"weight":"medium"}}>{fmt(data.baseImponibleVentas)}</UiText></UiBox>
              <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>IVA Generado</UiText><UiText {...{"weight":"medium","color":"blue"}}>{fmt(data.ivaVentas)}</UiText></UiBox>
              <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>Ret. Fuente</UiText><UiText {...{"weight":"medium"}}>{fmt(data.retFuenteVentas)}</UiText></UiBox>
              <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>Ret. IVA</UiText><UiText {...{"weight":"medium"}}>{fmt(data.retIvaVentas)}</UiText></UiBox>
            </UiBox>
          </UiCard>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-2"}}>Compras (Crédito)</UiHeading>
            <UiBox {...{"className":"space-y-1"}}>
              <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>Base Imponible</UiText><UiText {...{"weight":"medium"}}>{fmt(data.baseImponibleCompras)}</UiText></UiBox>
              <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>IVA Pagado</UiText><UiText {...{"weight":"medium","color":"purple"}}>{fmt(data.ivaCompras)}</UiText></UiBox>
              <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>Ret. Fuente</UiText><UiText {...{"weight":"medium"}}>{fmt(data.retFuenteCompras)}</UiText></UiBox>
              <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray"}}>Ret. IVA</UiText><UiText {...{"weight":"medium"}}>{fmt(data.retIvaCompras)}</UiText></UiBox>
            </UiBox>
          </UiCard>
        </UiBox>
        {data.serieMensual.length > 0 ? (
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
            <UiTable {...{"className":"w-full"}}>
              <UiTableHeader><UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Mes</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Base Ventas</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>IVA Ventas</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>Base Compras</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>IVA Compras</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-right"}}>IVA Neto</UiTableHead>
              </UiTableRow></UiTableHeader>
              <UiTableBody>
                {data.serieMensual.map(s => (
                  <UiTableRow key={s.mes} {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-1.5"}}>{s.mes}</UiTableCell>
                    <UiTableCell {...{"className":"px-3 py-1.5 text-right"}}>{fmt(s.baseVentas)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--blue-12)"},"className":"px-3 py-1.5 text-right"}}>{fmt(s.ivaVentas)}</UiTableCell>
                    <UiTableCell {...{"className":"px-3 py-1.5 text-right"}}>{fmt(s.baseCompras)}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--purple-11)"},"className":"px-3 py-1.5 text-right"}}>{fmt(s.ivaCompras)}</UiTableCell>
                    <UiTableCell {...mergeThemeProps({"className":"px-3 py-1.5 text-right"}, {}, (s.ivaVentas - s.ivaCompras >= 0 ? {"style":{"color":"var(--red-12)"}} : {"style":{"color":"var(--green-12)"}}))}>{fmt(s.ivaVentas - s.ivaCompras)}</UiTableCell>
                  </UiTableRow>
                ))}
              </UiTableBody>
            </UiTable>
          </UiBox>
        ) : <EmptyState label="No hay datos de impuestos en el período" />}
      </UiBox>
    );
  };

  const renderAuditoria = () => {
    if (!data) return null;
    const acciones = Object.entries(data.porAccion).sort((a,b) => b[1] - a[1]);
    return (
      <UiBox {...{"className":"space-y-4"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-3 gap-3"}}>
          <KPI icon={Shield} label="Total Registros" value={data.totalRegistros} color={{"style":{"color":"var(--gray-11)"}}} />
          <KPI icon={FileText} label="Acciones Distintas" value={acciones.length} color={{"style":{"color":"var(--gray-11)"}}} />
          <KPI icon={Clock} label="Última Acción" value={data.items.length > 0 ? fmtDate(data.items[0].fecha) : '-'} color={{"style":{"color":"var(--gray-11)"}}} />
        </UiBox>
        {acciones.length > 0 && (
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
            <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-3"}}>Distribución por Acción</UiHeading>
            <UiBox {...{"className":"flex flex-wrap gap-2"}}>
              {acciones.map(([accion, count]) => (
                <UiText key={accion} {...{"size":"1","color":"gray","className":"px-2 py-1"}}>
                  {accion}: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>{count}</UiText>
                </UiText>
              ))}
            </UiBox>
          </UiCard>
        )}
        {data.items.length === 0 ? <EmptyState label="No hay registros de auditoría" /> : (
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
            <UiTable {...{"className":"w-full"}}>
              <UiTableHeader><UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Fecha</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Acción</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Usuario</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Colección</UiTableHead>
                <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2 text-left"}}>Documento</UiTableHead>
              </UiTableRow></UiTableHeader>
              <UiTableBody>
                {data.items.slice(0, 100).map(i => (
                  <UiTableRow key={i.id} {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-1.5 whitespace-nowrap"}}>{fmtDate(i.fecha)}</UiTableCell>
                    <UiTableCell {...{"className":"px-3 py-1.5"}}><UiText {...{"size":"1","weight":"medium","className":"px-1.5 py-0.5"}}>{i.accion}</UiText></UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-1.5 truncate max-w-[150px]"}}>{i.usuario}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-1.5"}}>{i.coleccion}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-11)","fontFamily":"var(--code-font-family)"},"className":"px-3 py-1.5"}}>{i.documentoId?.slice(0, 12) || '-'}</UiTableCell>
                  </UiTableRow>
                ))}
              </UiTableBody>
            </UiTable>
          </UiBox>
        )}
      </UiBox>
    );
  };

  if (loading) {
    return (
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-3 gap-3"}}>{[1,2,3].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-16"}} />)}</UiBox>
        {[1,2,3].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-10"}} />)}
      </UiBox>
    );
  }

  if (error) {
    return (
      <UiBox {...{"className":"text-center py-12"}}>
        <UiBox {...{"style":{"color":"var(--red-12)"},"className":"mb-2"}}>Error al cargar reporte</UiBox>
        <UiText as="p" {...{"color":"gray","size":"2","className":"mb-4"}}>{error}</UiText>
        <UiButton onClick={cargar} {...{"variant":"solid","color":"blue","size":"2"}}>Reintentar</UiButton>
      </UiBox>
    );
  }

  return (
    <UiBox {...{"className":"space-y-4"}}>
      <FinancialPageHeader
        icon={BarChart3}
        title="Reportes Especializados y Auditoría"
        description="Flujo de caja, aging consolidado, balance y registro de auditoría inmutable"
        badge="Analítica"
        badgeColor="gray"
        actions={
          <UiBox {...{"className":"flex items-center gap-2"}}>
            <UiButton onClick={handleExportCSV} {...{"size":"2","color":"gray","variant":"outline","className":"flex items-center gap-1.5"}}>
              <Download size={12} /> CSV
            </UiButton>
            <UiButton onClick={handleExportPDF} {...{"size":"2","color":"gray","variant":"outline","className":"flex items-center gap-1.5"}}>
              <Printer size={12} /> PDF
            </UiButton>
          </UiBox>
        }
      />

      {/* Tabs */}
      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex gap-1 overflow-x-auto scrollbar-none pb-px"}}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <UiButton key={t.id} onClick={() => { setTab(t.id); setData(null); }}
              {...mergeThemeProps({"size":"2","className":"flex items-center gap-1.5 whitespace-nowrap"}, {}, (tab === t.id ? mergeThemeProps({"color":"blue"}) : {"color":"gray"}))}>
              <Icon size={13} />{t.label}
            </UiButton>
          );
        })}
      </UiBox>

      {/* Filtros */}
      <FiltrosComunes filtros={filtros} setFiltros={setFiltros} tab={tab} />

      {/* Contenido */}
      {tab === 'flujo' && renderFlujoCaja()}
      {tab === 'aging' && renderAging()}
      {tab === 'cartera' && renderCartera()}
      {tab === 'deuda' && renderDeuda()}
      {tab === 'impuestos' && renderImpuestos()}
      {tab === 'auditoria' && renderAuditoria()}
    </UiBox>
  );
}

function KPI({ icon: Icon, label, value, color = {"style":{"color":"var(--gray-11)"}} }) {
  return (
    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3"}}>
      <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-1.5 mb-0.5"}}>
        <Icon size={12} {...resolveThemeProps(color)} />{label}
      </UiBox>
      <UiBox {...mergeThemeProps({}, {}, resolveThemeProps(color))}>{value}</UiBox>
    </UiCard>
  );
}

function FiltrosComunes({ filtros, setFiltros, tab }) {
  return (
    <UiBox {...{"className":"flex flex-wrap items-center gap-2"}}>
      <UiInput type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
        {...{"size":"2","color":"gray"}} />
      <UiText {...{"size":"1","color":"gray"}}>a</UiText>
      <UiInput type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
        {...{"size":"2","color":"gray"}} />
      {tab === 'auditoria' && (
        <UiBox className="relative">
          <UiInput
            type="text"
            value={filtros.usuario || ''}
            onChange={e => setFiltros(f => ({ ...f, usuario: e.target.value }))}
            placeholder="Usuario..."
            iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
            size="2"
            color="gray"
            className="w-36"
          />
        </UiBox>
      )}
      {tab === 'cartera' && (
        <UiBox className="relative">
          <UiInput
            type="text"
            value={filtros.search || ''}
            onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
            placeholder="Cliente..."
            iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
            size="2"
            color="gray"
            className="w-40"
          />
        </UiBox>
      )}
      <UiButton onClick={() => setFiltros({ fechaDesde: '', fechaHasta: '', estado: 'all', search: '', usuario: '' })}
        {...{"size":"2","color":"gray","variant":"outline"}}>Limpiar</UiButton>
    </UiBox>
  );
}

function EstadoBadge({ estado }) {
  const styles = {
    pendiente: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
    parcial: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
    pagado: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
    vencido: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
    anulado: {"style":{"backgroundColor":"var(--gray-3)","color":"var(--gray-11)"}},
    vigente: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
    mora: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
    cancelado: {"style":{"backgroundColor":"var(--gray-3)","color":"var(--gray-11)"}},
    activa: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
    inactiva: {"style":{"backgroundColor":"var(--gray-3)","color":"var(--gray-11)"}},
  };
  return (
    <UiText {...mergeThemeProps({"size":"1","weight":"medium","className":"px-1.5 py-0.5"}, {}, (styles[estado] || {"color":"gray"}))}>
      {estado}
    </UiText>
  );
}

function EmptyState({ label }) {
  return (
    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"text-center py-8"}}>
      <FileText size={24} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-2"}} />
      <UiText as="p" {...{"size":"2","color":"gray"}}>{label}</UiText>
    </UiCard>
  );
}
