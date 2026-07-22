import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, FileText, Eye, Edit2, Trash2, Wallet, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { getMovimientos, getResumen, anularMovimiento } from '../../services/movimientoService';
import MovimientoForm from './MovimientoForm';
import MovimientoAbono from './MovimientoAbono';
import MovimientoDetalle from './MovimientoDetalle';

const ESTADO_BADGES = {
  pendiente: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  parcial: 'bg-warning-light text-warning border-warning/20',
  pagado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  anulado: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
};

const FILTROS_DEFAULT = {
  search: '',
  tipo: 'all',
  estado: 'all',
  metodoPago: 'all',
  categoria: 'all',
  fechaDesde: '',
  fechaHasta: '',
};

export default function MovimientosView({ db, usuario, showToast }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_DEFAULT);
  const [showForm, setShowForm] = useState(false);
  const [editingMov, setEditingMov] = useState(null);
  const [showAbono, setShowAbono] = useState(null);
  const [showDetalle, setShowDetalle] = useState(null);

  const cargarMovimientos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovimientos(db, filtros);
      setMovimientos(data);
    } catch (err) {
      setError('Error al cargar movimientos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [db, filtros]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarMovimientos();
  }, [cargarMovimientos]);

  const handleSave = () => {
    setShowForm(false);
    setEditingMov(null);
    cargarMovimientos();
  };

  const handleAbonoSave = () => {
    setShowAbono(null);
    cargarMovimientos();
  };

  const handleAnular = async (id) => {
    if (!window.confirm('¿Anular este movimiento? Esta acción no se puede deshacer.')) return;
    try {
      await anularMovimiento(db, id, usuario);
      showToast('Movimiento anulado', 'success');
      cargarMovimientos();
    } catch (err) {
      showToast('Error al anular: ' + err.message, 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Fecha','Tipo','Documento','Número','Tercero','RUC','Monto','Abonado','Saldo','Estado','Método','Categoría'];
    const rows = movimientos.map(m => [
      new Date(m.fecha?.toDate?.() || m.fecha).toLocaleDateString('es-EC'),
      m.tipo,
      m.documento?.tipo,
      m.documento?.numero,
      m.tercero?.nombre,
      m.tercero?.ruc,
      Number(m.monto).toFixed(2),
      (m.pagos || []).reduce((s, p) => s + Number(p.monto), 0).toFixed(2),
      Number(m.saldoPendiente).toFixed(2),
      m.estado,
      m.metodoPago,
      m.partidas?.[0]?.categoria || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const resumen = getResumen(movimientos);
  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : new Date(d).toLocaleDateString('es-EC');

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}
        </div>
        {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-surface-sidebar rounded-card" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-error text-lg mb-2">Error al cargar los movimientos</div>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <button onClick={cargarMovimientos} className="px-4 py-2 bg-primary text-white rounded-btn text-sm font-medium">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <TrendingUp size={14} className="text-success" /> Ingresos del período
          </div>
          <div className="text-xl font-bold text-success">{formatCurrency(resumen.totalIngresos)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <TrendingDown size={14} className="text-error" /> Egresos del período
          </div>
          <div className="text-xl font-bold text-error">{formatCurrency(resumen.totalEgresos)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <DollarSign size={14} className="text-primary" /> Saldo neto
          </div>
          <div className={`text-xl font-bold ${resumen.saldoNeto >= 0 ? 'text-primary' : 'text-error'}`}>
            {formatCurrency(resumen.saldoNeto)}
          </div>
        </div>
      </div>

      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar por documento, tercero, RUC..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
          </div>

          <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
            <option value="all">Todos los tipos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>

          <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
            <option value="anulado">Anulado</option>
          </select>

          <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
          <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
            className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />

          <button onClick={handleExportCsv}
            className="px-3 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light transition-colors flex items-center gap-1">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => { setEditingMov(null); setShowForm(true); }}
            className="px-3 py-2 text-sm font-medium bg-primary text-white rounded-btn hover:bg-primary-hover transition-colors flex items-center gap-1">
            <Plus size={14} /> Nuevo
          </button>
        </div>
      </div>

      <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
        {movimientos.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary mb-1">No hay movimientos registrados</p>
            <p className="text-text-muted text-sm mb-4">Crea el primer ingreso o gasto para empezar</p>
            <button onClick={() => { setEditingMov(null); setShowForm(true); }}
              className="px-4 py-2 bg-primary text-white rounded-btn text-sm font-medium flex items-center gap-1 mx-auto">
              <Plus size={14} /> Nuevo Movimiento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-sidebar border-b border-border-default">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Fecha</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Tipo</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Documento</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Tercero</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary hidden sm:table-cell">Categoría</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Monto</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary hidden md:table-cell">Saldo</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary">Estado</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(mov => (
                  <tr key={mov.id} className="border-b border-border-default hover:bg-primary-light/30 transition-colors">
                    <td className="px-3 py-2.5 text-text-primary whitespace-nowrap">{formatDate(mov.fecha)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-badge ${mov.tipo === 'ingreso' ? 'bg-status-authorized-bg text-status-authorized-text' : 'bg-status-rejected-bg text-status-rejected-text'}`}>
                        {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-text-primary text-xs">{mov.documento?.tipo}<br /><span className="text-text-muted">{mov.documento?.numero}</span></td>
                    <td className="px-3 py-2.5 text-text-primary text-xs">{mov.tercero?.nombre}<br /><span className="text-text-muted">{mov.tercero?.ruc}</span></td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <span className="inline-flex px-1.5 py-0.5 text-xs rounded-badge bg-surface-sidebar text-text-secondary">
                        {mov.partidas?.[0]?.categoria?.replace(/_/g, ' ') || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-text-primary">{formatCurrency(mov.monto)}</td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell">
                      <span className={Number(mov.saldoPendiente) > 0 ? 'text-warning font-medium' : 'text-text-muted'}>
                        {formatCurrency(mov.saldoPendiente)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium border rounded-badge ${ESTADO_BADGES[mov.estado]}`}>
                        {mov.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setShowDetalle(mov)} title="Ver detalle" className="btn-icon w-7 h-7"><Eye size={14} /></button>
                        {mov.origen === 'finanzas' && mov.estado !== 'anulado' && (
                          <button onClick={() => { setEditingMov(mov); setShowForm(true); }} title="Editar" className="btn-icon w-7 h-7"><Edit2 size={14} /></button>
                        )}
                        {(mov.estado === 'pendiente' || mov.estado === 'parcial') && (
                          <button onClick={() => setShowAbono(mov)} title="Abonar" className="btn-icon w-7 h-7"><Wallet size={14} /></button>
                        )}
                        {mov.estado !== 'anulado' && (
                          <button onClick={() => handleAnular(mov.id)} title="Anular" className="btn-icon w-7 h-7 text-error"><Trash2 size={14} /></button>
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

      {showForm && (
        <MovimientoForm
          movimiento={editingMov}
          onClose={() => { setShowForm(false); setEditingMov(null); }}
          onSave={handleSave}
          db={db}
          usuario={usuario}
          showToast={showToast}
        />
      )}

      {showAbono && (
        <MovimientoAbono
          movimiento={showAbono}
          onClose={() => setShowAbono(null)}
          onSave={handleAbonoSave}
          db={db}
          usuario={usuario}
          showToast={showToast}
        />
      )}

      {showDetalle && (
        <MovimientoDetalle
          movimiento={showDetalle}
          onClose={() => setShowDetalle(null)}
        />
      )}
    </div>
  );
}
