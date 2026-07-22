import { useState, useEffect, useCallback } from 'react';
import { Search, Download, FileText, Wallet, TrendingUp, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { getCxC, getAging, registrarCobro, getResumenCxC } from '../../services/cxcService';
const ESTADO_BADGES = {
  pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  parcial: 'bg-warning-light text-warning border-warning/20',
  pagado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  vencido: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  anulado: 'bg-status-draft-bg text-status-draft-text border-status-draft-border',
};

export default function CuentasPorCobrarView({ db, usuario, showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ search: '', estado: 'all', fechaDesde: '', fechaHasta: '' });
  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { const data = await getCxC(db, filtros); setItems(data); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, filtros]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const resumen = getResumenCxC(items);
  const aging = getAging(items.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado'));

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}
        </div>
        {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-surface-sidebar rounded-card" />)}
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

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><DollarSign size={14} className="text-primary" />Cartera Total</div>
          <div className="text-lg font-bold text-primary">{formatCurrency(resumen.totalCartera)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><AlertTriangle size={14} className="text-error" />Cartera Vencida</div>
          <div className="text-lg font-bold text-error">{formatCurrency(resumen.totalVencido)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><TrendingUp size={14} className="text-success" />Cobros del Período</div>
          <div className="text-lg font-bold text-success">{formatCurrency(resumen.totalCobrado)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><FileText size={14} className="text-text-primary" />Documentos</div>
          <div className="text-lg font-bold text-text-primary">{resumen.conteo}</div>
        </div>
      </div>

      {/* Aging */}
      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1"><Clock size={14} /> Antigüedad de Saldos</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          {Object.entries(aging).map(([k, v]) => (
            <div key={k} className={`rounded-card p-2 ${k === '+90' ? 'bg-status-rejected-bg' : k === '61-90' ? 'bg-warning-light' : 'bg-surface-sidebar'}`}>
              <div className="text-xs text-text-secondary">{k} días</div>
              <div className="text-sm font-bold text-text-primary">{v.count}</div>
              <div className="text-xs text-text-secondary">{formatCurrency(v.total)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar cliente, RUC, documento..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
          </div>
          <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
            <option value="all">Todos</option><option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="pagado">Pagado</option><option value="vencido">Vencido</option>
          </select>
          <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
          <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
          <button onClick={() => {
            const h = ['Fecha','Cliente','RUC','Doc','Vence','Monto','Abonado','Saldo','Días Venc.','Estado'];
            const r = items.map(i => [formatDate(i.factura?.fecha), i.tercero?.nombre, i.tercero?.ruc, `${i.factura?.tipo} ${i.factura?.numero}`, formatDate(i.factura?.fechaVencimiento), Number(i.factura?.montoTotal).toFixed(2), (i.abonos||[]).reduce((s,p)=>s+Number(p.monto),0).toFixed(2), Number(i.saldoPendiente).toFixed(2), i.diasVencido, i.estado]);
            const csv = [h.join(','), ...r.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            const b = new Blob([csv], {type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='cxc.csv'; a.click(); URL.revokeObjectURL(u);
          }} className="px-3 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light flex items-center gap-1">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">No hay cuentas por cobrar registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-sidebar border-b border-border-default">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Fecha</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Cliente</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Documento</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary hidden sm:table-cell">Vence</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Monto</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary hidden md:table-cell">Abonado</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Saldo</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary hidden sm:table-cell">Días</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary">Estado</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={`border-b border-border-default hover:bg-primary-light/30 transition-colors ${item.diasVencido > 90 ? 'bg-error-light/30' : ''}`}>
                    <td className="px-3 py-2.5 text-text-primary whitespace-nowrap">{formatDate(item.factura?.fecha)}</td>
                    <td className="px-3 py-2.5 text-text-primary text-xs">{item.tercero?.nombre}<br /><span className="text-text-muted">{item.tercero?.ruc}</span></td>
                    <td className="px-3 py-2.5 text-text-primary text-xs">{item.factura?.tipo}<br /><span className="text-text-muted">{item.factura?.numero}</span></td>
                    <td className="px-3 py-2.5 text-text-primary text-xs hidden sm:table-cell">{formatDate(item.factura?.fechaVencimiento)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-text-primary">{formatCurrency(item.factura?.montoTotal)}</td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell text-success">{formatCurrency((item.abonos || []).reduce((s, p) => s + Number(p.monto), 0))}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-warning">{formatCurrency(item.saldoPendiente)}</td>
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                      <span className={`text-xs font-medium ${item.diasVencido > 90 ? 'text-error' : item.diasVencido > 30 ? 'text-warning' : 'text-text-primary'}`}>
                        {item.diasVencido > 0 ? item.diasVencido : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium border rounded-badge ${ESTADO_BADGES[item.estado] || ESTADO_BADGES.pendiente}`}>{item.estado}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end">
                        {(item.estado === 'pendiente' || item.estado === 'parcial' || item.estado === 'vencido') && (
                          <button onClick={async () => {
                            if (!window.confirm(`¿Registrar cobro para ${item.tercero?.nombre}?`)) return;
                            const monto = prompt('Monto del cobro:', String(item.saldoPendiente));
                            if (!monto || Number(monto) <= 0) return;
                            try {
                              await registrarCobro(db, item.id, { monto: Number(monto), metodoPago: 'efectivo' }, usuario);
                              showToast('Cobro registrado', 'success');
                              cargar();
                            } catch (e) { showToast('Error: ' + e.message, 'error'); }
                          }} title="Registrar cobro" className="btn-icon w-7 h-7">
                            <Wallet size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
