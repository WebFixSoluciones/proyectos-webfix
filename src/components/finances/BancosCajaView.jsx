import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Plus, Building2, Wallet, ArrowDownLeft, ArrowUpRight, Link2, Link2Off, Trash2, X, Filter } from 'lucide-react';
import { getCuentas, crearCuenta, actualizarCuenta, eliminarCuenta, getMovimientosBancarios, registrarMovimientoBancario, eliminarMovimientoBancario, conciliarMovimiento, desconciliarMovimiento, getResumenBancos } from '../../services/bancosService';

const TIPO_BADGES = {
  banco: 'bg-blue-50 text-blue-700 border-blue-200',
  caja: 'bg-amber-50 text-amber-700 border-amber-200',
  ahorros: 'bg-green-50 text-green-700 border-green-200',
  inversion: 'bg-purple-50 text-purple-700 border-purple-200',
};

const TIPO_LABELS = { banco: 'Corriente', caja: 'Caja', ahorros: 'Ahorros', inversion: 'Inversion' };

export default function BancosCajaView({ db, usuario, showToast }) {
  const [cuentas, setCuentas] = useState([]);
  const [cuentaActiva, setCuentaActiva] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ tipo: 'all', fechaDesde: '', fechaHasta: '', movTipo: 'all', movConciliado: 'all' });
  const [showFormCuenta, setShowFormCuenta] = useState(false);
  const [showFormMov, setShowFormMov] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState(null);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const cargarCuentas = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getCuentas(db, { tipo: filtros.tipo });
      setCuentas(data);
      if (cuentaActiva) {
        const actualizada = data.find(c => c.id === cuentaActiva.id);
        if (actualizada) setCuentaActiva(actualizada);
      }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, filtros.tipo]);

  const cargarMovimientos = useCallback(async () => {
    if (!cuentaActiva) return;
    try {
      const data = await getMovimientosBancarios(db, cuentaActiva.id, { tipo: filtros.movTipo, fechaDesde: filtros.fechaDesde, fechaHasta: filtros.fechaHasta, conciliado: filtros.movConciliado });
      setMovimientos(data);
    } catch (e) { showToast('Error cargando movimientos: ' + e.message, 'error'); }
  }, [db, cuentaActiva, filtros.movTipo, filtros.fechaDesde, filtros.fechaHasta, filtros.movConciliado]);

  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  useEffect(() => {
    if (cuentaActiva) cargarMovimientos();
  }, [cuentaActiva?.id, cargarMovimientos]);

  const resumen = getResumenBancos(cuentas);

  const handleCrearCuenta = async (data) => {
    try {
      if (editingCuenta) await actualizarCuenta(db, editingCuenta.id, data, usuario);
      else await crearCuenta(db, data, usuario);
      showToast(editingCuenta ? 'Cuenta actualizada' : 'Cuenta creada', 'success');
      setShowFormCuenta(false); setEditingCuenta(null);
      cargarCuentas();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleEliminarCuenta = async (id) => {
    if (!window.confirm('¿Eliminar esta cuenta? Esta acción no se puede deshacer.')) return;
    try { await eliminarCuenta(db, id, usuario); showToast('Cuenta eliminada', 'success'); setCuentaActiva(null); cargarCuentas(); }
    catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleRegistrarMov = async (data) => {
    try {
      await registrarMovimientoBancario(db, { ...data, cuentaId: cuentaActiva.id }, usuario);
      showToast('Movimiento registrado', 'success');
      setShowFormMov(false);
      cargarCuentas(); cargarMovimientos();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleEliminarMov = async (id) => {
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    try { await eliminarMovimientoBancario(db, id, usuario); showToast('Movimiento eliminado', 'success'); cargarCuentas(); cargarMovimientos(); }
    catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleConciliar = async (movId) => {
    const movFinId = prompt('ID del movimiento financiero a conciliar (dejar vacío para solo marcar):');
    try {
      await conciliarMovimiento(db, movId, movFinId || null, usuario);
      showToast('Movimiento conciliado', 'success');
      cargarMovimientos();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleDesconciliar = async (movId) => {
    try { await desconciliarMovimiento(db, movId, usuario); showToast('Conciliación revertida', 'success'); cargarMovimientos(); }
    catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleExportCSV = () => {
    const h = ['Fecha', 'Tipo', 'Monto', 'Descripción', 'Referencia', 'Conciliado'];
    const r = movimientos.map(m => [formatDate(m.fecha), m.tipo, Number(m.monto).toFixed(2), m.descripcion, m.referencia, m.conciliado ? 'Si' : 'No']);
    const csv = [h.join(','), ...r.map(row => row.map(c => `"${c}"`).join(','))].join('\n');
    const b = new Blob([csv], { type: 'text/csv' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `movimientos_${cuentaActiva?.nombre || 'banco'}.csv`; a.click(); URL.revokeObjectURL(u);
  };

  if (loading && cuentas.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface-sidebar rounded-card" />)}
        </div>
        {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-sidebar rounded-card" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-error text-lg mb-2">Error al cargar</div>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <button onClick={cargarCuentas} className="px-4 py-2 bg-primary text-white rounded-btn text-sm">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Building2 size={14} className="text-blue-600" />Total en Bancos</div>
          <div className="text-lg font-bold text-blue-700">{formatCurrency(resumen.totalBancos)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Wallet size={14} className="text-amber-600" />Total en Caja</div>
          <div className="text-lg font-bold text-amber-700">{formatCurrency(resumen.totalCaja)}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Building2 size={14} className="text-primary" />Total General</div>
          <div className="text-lg font-bold text-primary">{formatCurrency(resumen.totalGeneral)}</div>
        </div>
      </div>

      <div className="bg-surface-card border border-border-default rounded-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1"><Building2 size={14} />Cuentas</h3>
          <div className="flex items-center gap-2">
            <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-border-default rounded-btn bg-white text-text-primary">
              <option value="all">Todas</option><option value="banco">Banco</option><option value="caja">Caja</option><option value="ahorros">Ahorros</option><option value="inversion">Inversión</option>
            </select>
            <button onClick={() => { setEditingCuenta(null); setShowFormCuenta(true); }}
              className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-btn flex items-center gap-1"><Plus size={14} />Nueva Cuenta</button>
          </div>
        </div>

        {cuentas.length === 0 ? (
          <div className="text-center py-8">
            <Building2 size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">No hay cuentas registradas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cuentas.map(cuenta => (
              <div key={cuenta.id}
                className={`flex items-center justify-between p-3 rounded-card border cursor-pointer transition-all ${cuentaActiva?.id === cuenta.id ? 'border-primary bg-primary-light/20' : 'border-border-default hover:border-primary/30 hover:bg-surface-sidebar'}`}
                onClick={() => setCuentaActiva(cuenta)}>
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md ${cuenta.tipo === 'caja' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                    {cuenta.tipo === 'caja' ? <Wallet size={16} className="text-amber-600" /> : <Building2 size={16} className="text-blue-600" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{cuenta.nombre}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium border rounded-badge ${TIPO_BADGES[cuenta.tipo]}`}>{TIPO_LABELS[cuenta.tipo]}</span>
                      <span className={`text-[10px] ${cuenta.estado === 'activo' ? 'text-success' : 'text-text-muted'}`}>{cuenta.estado}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-sm font-bold ${(cuenta.saldoActual || 0) >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(cuenta.saldoActual)}</div>
                    <div className="text-[10px] text-text-muted">Saldo inicial: {formatCurrency(cuenta.saldoInicial)}</div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditingCuenta(cuenta); setShowFormCuenta(true); }} className="btn-icon w-7 h-7 text-text-secondary hover:text-primary"><Filter size={13} /></button>
                    <button onClick={() => handleEliminarCuenta(cuenta.id)} className="btn-icon w-7 h-7 text-text-secondary hover:text-error"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cuentaActiva && (
        <div className="bg-surface-card border border-border-default rounded-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border-default">
            <h3 className="text-sm font-semibold text-text-primary">Movimientos — {cuentaActiva.nombre}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={filtros.movTipo} onChange={e => setFiltros(f => ({ ...f, movTipo: e.target.value }))}
                className="px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary">
                <option value="all">Todos</option><option value="credito">Créditos</option><option value="debito">Débitos</option>
              </select>
              <select value={filtros.movConciliado} onChange={e => setFiltros(f => ({ ...f, movConciliado: e.target.value }))}
                className="px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary">
                <option value="all">Todos</option><option value="true">Conciliados</option><option value="false">Pendientes</option>
              </select>
              <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
                className="px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary" />
              <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
                className="px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary" />
              <button onClick={handleExportCSV} className="px-2 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light flex items-center gap-1"><Download size={12} />CSV</button>
              <button onClick={() => setShowFormMov(true)}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-btn flex items-center gap-1"><Plus size={12} />Nuevo Movimiento</button>
            </div>
          </div>

          {movimientos.length === 0 ? (
            <div className="text-center py-12">
              <ArrowDownLeft size={40} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-secondary">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-sidebar border-b border-border-default">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Fecha</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary">Tipo</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary">Descripción</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-text-secondary hidden sm:table-cell">Referencia</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Monto</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-text-secondary">Conciliado</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-text-secondary">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(mov => (
                    <tr key={mov.id} className={`border-b border-border-default hover:bg-primary-light/30 transition-colors ${mov.conciliado ? 'opacity-70' : ''}`}>
                      <td className="px-3 py-2.5 text-text-primary whitespace-nowrap text-xs">{formatDate(mov.fecha)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {mov.tipo === 'credito'
                          ? <span className="inline-flex items-center gap-1 text-xs text-success font-medium"><ArrowDownLeft size={12} />Crédito</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-error font-medium"><ArrowUpRight size={12} />Débito</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 text-text-primary text-xs">{mov.descripcion || '-'}</td>
                      <td className="px-3 py-2.5 text-text-secondary text-xs hidden sm:table-cell">{mov.referencia || '-'}</td>
                      <td className={`px-3 py-2.5 text-right font-medium text-xs ${mov.tipo === 'credito' ? 'text-success' : 'text-error'}`}>
                        {mov.tipo === 'credito' ? '+' : '-'}{formatCurrency(mov.monto)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {mov.conciliado
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success"><Link2 size={10} />Sí</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-muted"><Link2Off size={10} />No</span>
                        }
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          {!mov.conciliado && (
                            <button onClick={() => handleConciliar(mov.id)} title="Conciliar" className="btn-icon w-6 h-6 text-text-secondary hover:text-success"><Link2 size={12} /></button>
                          )}
                          {mov.conciliado && (
                            <button onClick={() => handleDesconciliar(mov.id)} title="Desconciliar" className="btn-icon w-6 h-6 text-text-secondary hover:text-warning"><Link2Off size={12} /></button>
                          )}
                          <button onClick={() => handleEliminarMov(mov.id)} title="Eliminar" className="btn-icon w-6 h-6 text-text-secondary hover:text-error"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showFormCuenta && (
        <FormCuentaModal
          cuenta={editingCuenta}
          onSave={handleCrearCuenta}
          onClose={() => { setShowFormCuenta(false); setEditingCuenta(null); }}
        />
      )}

      {showFormMov && cuentaActiva && (
        <FormMovimientoModal
          cuenta={cuentaActiva}
          onSave={handleRegistrarMov}
          onClose={() => setShowFormMov(false)}
        />
      )}
    </div>
  );
}

function FormCuentaModal({ cuenta, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: cuenta?.nombre || '',
    tipo: cuenta?.tipo || 'banco',
    saldoInicial: cuenta?.saldoInicial || 0,
    moneda: cuenta?.moneda || 'USD',
    estado: cuenta?.estado || 'activo',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-lg border border-border-default" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
          <h3 className="text-md font-semibold text-black">{cuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
          <button onClick={onClose} className="btn-icon text-gray-500"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Nombre</label>
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Banco Pichincha - Cuenta Corriente" required
              className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
                <option value="banco">Banco</option><option value="caja">Caja</option><option value="ahorros">Ahorros</option><option value="inversion">Inversión</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Saldo Inicial</label>
              <input type="number" step="0.01" value={form.saldoInicial} onChange={e => setForm(f => ({ ...f, saldoInicial: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Moneda</label>
              <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Estado</label>
              <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
                <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary border border-border-default rounded-btn hover:bg-surface-sidebar">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-btn">{cuenta ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormMovimientoModal({ cuenta, onSave, onClose }) {
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ tipo: 'credito', monto: '', descripcion: '', fecha: hoy, referencia: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.monto || Number(form.monto) <= 0) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-lg border border-border-default" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
          <h3 className="text-md font-semibold text-black">Nuevo Movimiento — {cuenta.nombre}</h3>
          <button onClick={onClose} className="btn-icon text-gray-500"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
                <option value="credito">Crédito (Ingreso)</option><option value="debito">Débito (Egreso)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Monto</label>
              <input type="number" step="0.01" min="0.01" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder="0.00" required
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Descripción</label>
            <input type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Transferencia, depósito, cheque..."
              className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Referencia</label>
              <input type="text" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                placeholder="N° cheque, N° transferencia..."
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary border border-border-default rounded-btn hover:bg-surface-sidebar">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-btn">Registrar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
