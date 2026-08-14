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

const TABS = [
  { id: 'flujo', label: 'Flujo de Caja', icon: BarChart3, color: 'text-emerald-600' },
  { id: 'aging', label: 'Aging CxC/CxP', icon: Clock, color: 'text-amber-600' },
  { id: 'cartera', label: 'Cartera', icon: Wallet, color: 'text-blue-600' },
  { id: 'deuda', label: 'Deuda', icon: Landmark, color: 'text-red-600' },
  { id: 'impuestos', label: 'Impuestos', icon: Calculator, color: 'text-purple-600' },
  { id: 'auditoria', label: 'Auditoría', icon: Shield, color: 'text-slate-600' },
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
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <KPI icon={TrendingUp} label="Ingresos" value={fmt(data.totalIngresos)} color="text-success" />
          <KPI icon={TrendingDown} label="Egresos" value={fmt(data.totalEgresos)} color="text-error" />
          <KPI icon={DollarSign} label="Saldo Neto" value={fmt(data.saldoNeto)} color={data.saldoNeto >= 0 ? 'text-success' : 'text-error'} />
        </div>
        {data.serie.length === 0 ? (
          <EmptyState label="No hay movimientos en el período" />
        ) : (
          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h4 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-1.5"><BarChart3 size={14} />Evolución Mensual</h4>
            <div className="space-y-1.5">
              {data.serie.map(s => {
                const [y, m] = s.mes.split('-');
                return (
                  <div key={s.mes} className="flex items-center gap-2 text-[10px]">
                    <span className="w-14 text-text-muted shrink-0">{MESES[parseInt(m)-1]} {y?.slice(2)}</span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="h-3 bg-success/20 rounded-sm" style={{ width: `${(s.ingresos / maxVal) * 100}%`, minWidth: s.ingresos > 0 ? '2px' : '0' }} title={`Ingresos: ${fmt(s.ingresos)}`} />
                      <div className="h-3 bg-error/20 rounded-sm" style={{ width: `${(s.egresos / maxVal) * 100}%`, minWidth: s.egresos > 0 ? '2px' : '0' }} title={`Egresos: ${fmt(s.egresos)}`} />
                    </div>
                    <span className={`w-20 text-right font-medium ${s.saldo >= 0 ? 'text-success' : 'text-error'}`}>{fmt(s.saldo)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-success/30 rounded-sm inline-block" /> Ingresos</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-error/30 rounded-sm inline-block" /> Egresos</span>
            </div>
          </div>
        )}
        <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border-default bg-surface-sidebar">
              <th className="px-3 py-2 text-left font-medium text-text-secondary">Mes</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Ingresos</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Egresos</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Saldo</th>
            </tr></thead>
            <tbody>
              {data.serie.map(s => {
                const [y, m] = s.mes.split('-');
                return (
                  <tr key={s.mes} className="border-b border-border-default/50 hover:bg-surface-sidebar/50">
                    <td className="px-3 py-1.5 text-text-primary">{MESES[parseInt(m)-1]} {y}</td>
                    <td className="px-3 py-1.5 text-right text-success">{fmt(s.ingresos)}</td>
                    <td className="px-3 py-1.5 text-right text-error">{fmt(s.egresos)}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${s.saldo >= 0 ? 'text-success' : 'text-error'}`}>{fmt(s.saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAging = () => {
    if (!data) return null;
    const buckets = Object.entries(data.aging);
    const totalAging = data.totalPendiente || 1;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex rounded-btn border border-border-default overflow-hidden">
            <button onClick={() => setAgingTipo('cxc')} className={`px-3 py-1.5 text-xs font-medium ${agingTipo === 'cxc' ? 'bg-primary text-white' : 'bg-white text-text-primary hover:bg-surface-sidebar'}`}>CxC</button>
            <button onClick={() => setAgingTipo('cxp')} className={`px-3 py-1.5 text-xs font-medium ${agingTipo === 'cxp' ? 'bg-primary text-white' : 'bg-white text-text-primary hover:bg-surface-sidebar'}`}>CxP</button>
          </div>
          <span className="text-xs text-text-muted">{agingTipo === 'cxc' ? 'Cuentas por Cobrar' : 'Cuentas por Pagar'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {buckets.map(([k, v]) => {
            const pct = totalAging > 0 ? (v.total / totalAging) * 100 : 0;
            const bg = k === '+90' ? 'bg-status-rejected-bg' : k === '61-90' ? 'bg-warning-light' : k === '31-60' ? 'bg-warning-light/50' : 'bg-surface-sidebar';
            return (
              <div key={k} className={`${bg} border border-border-default rounded-card p-3`}>
                <div className="text-[10px] uppercase tracking-wide text-text-muted mb-0.5">{k} días</div>
                <div className="text-base font-bold text-text-primary">{v.count}</div>
                <div className="text-xs text-text-secondary">{fmt(v.total)}</div>
                <div className="mt-1.5 h-1 bg-border-default rounded-full overflow-hidden">
                  <div className="h-full bg-primary/40 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <KPI icon={Wallet} label="Total Pendiente" value={fmt(data.totalPendiente)} color="text-primary" />
        {buckets.some(([,v]) => v.items.length > 0) ? (
          <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border-default bg-surface-sidebar">
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Tercero</th>
                <th className="px-3 py-2 text-left font-medium text-text-secondary">RUC</th>
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Documento</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">Monto</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">Saldo</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">Días</th>
              </tr></thead>
              <tbody>
                {buckets.flatMap(([,v]) => v.items).sort((a,b) => b.dias - a.dias).slice(0, 50).map(i => (
                  <tr key={i.id} className="border-b border-border-default/50 hover:bg-surface-sidebar/50">
                    <td className="px-3 py-1.5 text-text-primary">{i.tercero}</td>
                    <td className="px-3 py-1.5 text-text-secondary">{i.ruc}</td>
                    <td className="px-3 py-1.5 text-text-secondary">{i.documento}</td>
                    <td className="px-3 py-1.5 text-right text-text-primary">{fmt(i.monto)}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-text-primary">{fmt(i.saldo)}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${i.dias > 90 ? 'text-error' : i.dias > 30 ? 'text-warning' : 'text-text-secondary'}`}>{i.dias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState label="No hay saldos pendientes" />}
      </div>
    );
  };

  const renderCartera = () => {
    if (!data) return null;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI icon={Wallet} label="Cartera Total" value={fmt(data.totalCartera)} color="text-primary" />
          <KPI icon={AlertTriangle} label="Vencido" value={fmt(data.totalVencido)} color="text-error" />
          <KPI icon={DollarSign} label="Cobrado" value={fmt(data.totalCobrado)} color="text-success" />
          <KPI icon={FileText} label="Documentos" value={data.conteo} color="text-text-primary" />
        </div>
        {data.porCliente.length > 0 && (
          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h4 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-1.5"><Users size={14} />Resumen por Cliente</h4>
            <div className="space-y-1.5">
              {data.porCliente.slice(0, 10).map(c => (
                <div key={c.ruc} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-text-primary">{c.cliente}</span>
                  <span className="text-text-muted shrink-0">{c.facturas} doc</span>
                  <span className="text-text-primary font-medium w-20 text-right shrink-0">{fmt(c.saldo)}</span>
                  {c.vencido > 0 && <span className="text-error text-[10px] w-20 text-right shrink-0">Venc: {fmt(c.vencido)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.items.length === 0 ? <EmptyState label="No hay documentos en cartera" /> : (
          <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border-default bg-surface-sidebar">
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Cliente</th>
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Documento</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">Monto</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">Abonado</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">Saldo</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">Días</th>
                <th className="px-3 py-2 text-center font-medium text-text-secondary">Estado</th>
              </tr></thead>
              <tbody>
                {data.items.slice(0, 100).map(i => (
                  <tr key={i.id} className="border-b border-border-default/50 hover:bg-surface-sidebar/50">
                    <td className="px-3 py-1.5 text-text-primary">{i.cliente}</td>
                    <td className="px-3 py-1.5 text-text-secondary">{i.documento}</td>
                    <td className="px-3 py-1.5 text-right text-text-primary">{fmt(i.montoTotal)}</td>
                    <td className="px-3 py-1.5 text-right text-success">{fmt(i.abonado)}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-text-primary">{fmt(i.saldo)}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${i.diasVencido > 60 ? 'text-error' : i.diasVencido > 0 ? 'text-warning' : 'text-text-secondary'}`}>{i.diasVencido}</td>
                    <td className="px-3 py-1.5 text-center"><EstadoBadge estado={i.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderDeuda = () => {
    if (!data) return null;
    const todas = [...data.prestamos, ...data.tarjetas];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI icon={Landmark} label="Deuda Total" value={fmt(data.deudaTotal)} color="text-error" />
          <KPI icon={FileText} label="Préstamos" value={fmt(data.totalPrestamos)} color="text-red-600" />
          <KPI icon={Receipt} label="Tarjetas" value={fmt(data.totalTarjetas)} color="text-amber-600" />
          <KPI icon={AlertTriangle} label="Cuotas Vencidas" value={data.totalCuotasVencidas} color={data.totalCuotasVencidas > 0 ? 'text-error' : 'text-success'} />
        </div>
        {data.prestamos.length > 0 && (
          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h4 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-1.5"><Landmark size={14} />Préstamos Bancarios</h4>
            <div className="space-y-1.5">
              {data.prestamos.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs bg-surface-sidebar rounded-card px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary truncate">{p.entidad}</div>
                    <div className="text-[10px] text-text-muted">{p.numero} · {p.cuotasPendientes} cuotas pend. {p.cuotasVencidas > 0 ? `· ${p.cuotasVencidas} vencidas` : ''}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-error">{fmt(p.saldoPendiente)}</div>
                    <div className="text-[10px] text-text-muted">de {fmt(p.montoOriginal)}</div>
                  </div>
                  <EstadoBadge estado={p.estado} />
                </div>
              ))}
            </div>
          </div>
        )}
        {data.tarjetas.length > 0 && (
          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h4 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-1.5"><Receipt size={14} />Tarjetas de Crédito</h4>
            <div className="space-y-1.5">
              {data.tarjetas.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs bg-surface-sidebar rounded-card px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary truncate">{t.entidad} ****{String(t.numero).slice(-4)}</div>
                    <div className="text-[10px] text-text-muted">{t.cuotasPendientes} cuotas pendientes</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-amber-600">{fmt(t.saldoPendiente)}</div>
                    <div className="text-[10px] text-text-muted">cupo: {fmt(t.montoOriginal)}</div>
                  </div>
                  <EstadoBadge estado={t.estado} />
                </div>
              ))}
            </div>
          </div>
        )}
        {todas.length === 0 && <EmptyState label="No hay deudas registradas" />}
      </div>
    );
  };

  const renderImpuestos = () => {
    if (!data) return null;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI icon={TrendingUp} label="IVA Débito Fiscal" value={fmt(data.ivaVentas)} color="text-primary" />
          <KPI icon={TrendingDown} label="IVA Crédito Fiscal" value={fmt(data.ivaCompras)} color="text-purple-600" />
          <KPI icon={DollarSign} label="IVA Neto a Pagar" value={fmt(data.ivaNeto)} color={data.ivaNeto >= 0 ? 'text-error' : 'text-success'} />
          <KPI icon={Receipt} label="Retenciones Netas" value={fmt(data.retencionesNetas)} color="text-slate-600" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h4 className="text-xs font-semibold text-text-primary mb-2">Ventas (Débito)</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-text-muted">Base Imponible</span><span className="font-medium">{fmt(data.baseImponibleVentas)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">IVA Generado</span><span className="font-medium text-primary">{fmt(data.ivaVentas)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Ret. Fuente</span><span className="font-medium">{fmt(data.retFuenteVentas)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Ret. IVA</span><span className="font-medium">{fmt(data.retIvaVentas)}</span></div>
            </div>
          </div>
          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h4 className="text-xs font-semibold text-text-primary mb-2">Compras (Crédito)</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-text-muted">Base Imponible</span><span className="font-medium">{fmt(data.baseImponibleCompras)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">IVA Pagado</span><span className="font-medium text-purple-600">{fmt(data.ivaCompras)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Ret. Fuente</span><span className="font-medium">{fmt(data.retFuenteCompras)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Ret. IVA</span><span className="font-medium">{fmt(data.retIvaCompras)}</span></div>
            </div>
          </div>
        </div>
        {data.serieMensual.length > 0 ? (
          <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border-default bg-surface-sidebar">
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Mes</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">Base Ventas</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">IVA Ventas</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">Base Compras</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">IVA Compras</th>
                <th className="px-3 py-2 text-right font-medium text-text-secondary">IVA Neto</th>
              </tr></thead>
              <tbody>
                {data.serieMensual.map(s => (
                  <tr key={s.mes} className="border-b border-border-default/50 hover:bg-surface-sidebar/50">
                    <td className="px-3 py-1.5 text-text-primary">{s.mes}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(s.baseVentas)}</td>
                    <td className="px-3 py-1.5 text-right text-primary">{fmt(s.ivaVentas)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(s.baseCompras)}</td>
                    <td className="px-3 py-1.5 text-right text-purple-600">{fmt(s.ivaCompras)}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${s.ivaVentas - s.ivaCompras >= 0 ? 'text-error' : 'text-success'}`}>{fmt(s.ivaVentas - s.ivaCompras)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState label="No hay datos de impuestos en el período" />}
      </div>
    );
  };

  const renderAuditoria = () => {
    if (!data) return null;
    const acciones = Object.entries(data.porAccion).sort((a,b) => b[1] - a[1]);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KPI icon={Shield} label="Total Registros" value={data.totalRegistros} color="text-slate-600" />
          <KPI icon={FileText} label="Acciones Distintas" value={acciones.length} color="text-text-primary" />
          <KPI icon={Clock} label="Última Acción" value={data.items.length > 0 ? fmtDate(data.items[0].fecha) : '-'} color="text-text-secondary" />
        </div>
        {acciones.length > 0 && (
          <div className="bg-surface-card border border-border-default rounded-card p-4">
            <h4 className="text-xs font-semibold text-text-primary mb-3">Distribución por Acción</h4>
            <div className="flex flex-wrap gap-2">
              {acciones.map(([accion, count]) => (
                <span key={accion} className="px-2 py-1 text-[10px] bg-surface-sidebar border border-border-default rounded-card text-text-secondary">
                  {accion}: <span className="font-bold text-text-primary">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {data.items.length === 0 ? <EmptyState label="No hay registros de auditoría" /> : (
          <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border-default bg-surface-sidebar">
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Fecha</th>
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Acción</th>
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Usuario</th>
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Colección</th>
                <th className="px-3 py-2 text-left font-medium text-text-secondary">Documento</th>
              </tr></thead>
              <tbody>
                {data.items.slice(0, 100).map(i => (
                  <tr key={i.id} className="border-b border-border-default/50 hover:bg-surface-sidebar/50">
                    <td className="px-3 py-1.5 text-text-muted whitespace-nowrap">{fmtDate(i.fecha)}</td>
                    <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 bg-surface-sidebar border border-border-default rounded text-[10px] font-medium">{i.accion}</span></td>
                    <td className="px-3 py-1.5 text-text-primary truncate max-w-[150px]">{i.usuario}</td>
                    <td className="px-3 py-1.5 text-text-secondary">{i.coleccion}</td>
                    <td className="px-3 py-1.5 text-text-muted font-mono text-[10px]">{i.documentoId?.slice(0, 12) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-surface-sidebar rounded-card" />)}</div>
        {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-sidebar rounded-card" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-error text-lg mb-2">Error al cargar reporte</div>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <button onClick={cargar} className="px-4 py-2 bg-primary text-white rounded-btn text-sm">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
          <FileText size={18} className="text-primary" />Reportes Especializados
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-btn hover:bg-surface-sidebar flex items-center gap-1.5">
            <Download size={12} />CSV
          </button>
          <button onClick={handleExportPDF} className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-btn hover:bg-surface-sidebar flex items-center gap-1.5">
            <Printer size={12} />PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none border-b border-border-default pb-px">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setData(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                tab === t.id ? `border-primary text-primary` : 'border-transparent text-text-muted hover:text-text-primary'
              }`}>
              <Icon size={13} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <FiltrosComunes filtros={filtros} setFiltros={setFiltros} tab={tab} />

      {/* Contenido */}
      {tab === 'flujo' && renderFlujoCaja()}
      {tab === 'aging' && renderAging()}
      {tab === 'cartera' && renderCartera()}
      {tab === 'deuda' && renderDeuda()}
      {tab === 'impuestos' && renderImpuestos()}
      {tab === 'auditoria' && renderAuditoria()}
    </div>
  );
}

function KPI({ icon: Icon, label, value, color = 'text-text-primary' }) {
  return (
    <div className="bg-surface-card border border-border-default rounded-card p-3">
      <div className="flex items-center gap-1.5 text-text-secondary text-[10px] uppercase tracking-wide mb-0.5">
        <Icon size={12} className={color} />{label}
      </div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
    </div>
  );
}

function FiltrosComunes({ filtros, setFiltros, tab }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
        className="px-2.5 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary" />
      <span className="text-xs text-text-muted">a</span>
      <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
        className="px-2.5 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary" />
      {tab === 'auditoria' && (
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={filtros.usuario || ''} onChange={e => setFiltros(f => ({ ...f, usuario: e.target.value }))}
            placeholder="Usuario..." className="pl-7 pr-2.5 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary w-32" />
        </div>
      )}
      {tab === 'cartera' && (
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={filtros.search || ''} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
            placeholder="Cliente..." className="pl-7 pr-2.5 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary w-36" />
        </div>
      )}
      <button onClick={() => setFiltros({ fechaDesde: '', fechaHasta: '', estado: 'all', search: '', usuario: '' })}
        className="px-2.5 py-1.5 text-xs text-text-muted border border-border-default rounded-btn hover:bg-surface-sidebar">Limpiar</button>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const styles = {
    pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
    parcial: 'bg-warning-light text-warning border-warning/20',
    pagado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
    vencido: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
    anulado: 'bg-status-draft-bg text-status-draft-text border-status-draft-border',
    vigente: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
    mora: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
    cancelado: 'bg-surface-sidebar text-text-muted border-border-default',
    activa: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
    inactiva: 'bg-surface-sidebar text-text-muted border-border-default',
  };
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${styles[estado] || 'bg-surface-sidebar text-text-muted border-border-default'}`}>
      {estado}
    </span>
  );
}

function EmptyState({ label }) {
  return (
    <div className="text-center py-8 bg-surface-card border border-border-default rounded-card">
      <FileText size={24} className="mx-auto text-text-muted mb-2" />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}
