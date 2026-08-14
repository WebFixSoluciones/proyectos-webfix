import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Building2, FileText, Plus, Edit2, Trash2, Save, X,
  ChevronRight, ChevronDown, Search, Layers, Calculator, Calendar,
  AlertCircle, CheckCircle2, XCircle, Target, FileCheck
} from 'lucide-react';
import {
  getCuentas, addCuenta, updateCuenta, deleteCuenta,
  getCentrosCosto, addCentroCosto, updateCentroCosto, deleteCentroCosto,
  getAsientos, confirmarAsiento, anularAsiento, deleteAsiento,
  getResumenContabilidad
} from '../../services/contabilidadService';

const TIPOS = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto'];
const TIPO_BADGES = {
  activo: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  pasivo: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  patrimonio: 'bg-info-light text-info border-info/20',
  ingreso: 'bg-success-light text-success border-success/20',
  gasto: 'bg-warning-light text-warning border-warning/20',
};
const ESTADO_BADGES = {
  borrador: 'bg-status-draft-bg text-status-draft-text border-status-draft-border',
  confirmado: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  anulado: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  activo: 'bg-status-authorized-bg text-status-authorized-text border-status-authorized-border',
  inactivo: 'bg-status-draft-bg text-status-draft-text border-status-draft-border',
};

const TABS = [
  { id: 'plan', label: 'Plan de Cuentas', icon: BookOpen },
  { id: 'centros', label: 'Centros de Costo', icon: Building2 },
  { id: 'diario', label: 'Libro Diario', icon: FileText },
];

const EMPTY_CUENTA = { codigo: '', nombre: '', tipo: 'activo', nivel: 1, padreId: null, aceptaMovimientos: false, estado: 'activo' };
const EMPTY_CC = { codigo: '', nombre: '', responsable: '', presupuestoAnual: 0, estado: 'activo' };

export default function ContabilidadView({ db, usuario, showToast }) {
  const [tab, setTab] = useState('plan');
  const [cuentas, setCuentas] = useState([]);
  const [centros, setCentros] = useState([]);
  const [asientos, setAsientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editingCuenta, setEditingCuenta] = useState(null);
  const [editingCC, setEditingCC] = useState(null);
  const [filtros, setFiltros] = useState({ search: '', tipo: 'all', estado: 'all', fechaDesde: '', fechaHasta: '', centroCostoId: '' });

  const cargarTodo = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cts, ccs, ast] = await Promise.all([
        getCuentas(db, filtros),
        getCentrosCosto(db, {}),
        getAsientos(db, filtros),
      ]);
      setCuentas(cts); setCentros(ccs); setAsientos(ast);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, filtros]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarTodo();
  }, [cargarTodo]);

  const fmt = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const fmtDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';
  const resumen = getResumenContabilidad(cuentas, centros, asientos);

  const toggleExpand = (id) => setExpandedIds(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const buildTree = () => {
    const map = new Map(cuentas.map(c => [c.id, { ...c, hijos: [] }]));
    const raices = [];
    map.forEach(c => {
      if (c.padreId && map.has(c.padreId)) map.get(c.padreId).hijos.push(c);
      else raices.push(c);
    });
    return raices;
  };

  const handleSaveCuenta = async (data) => {
    try {
      if (editingCuenta?.id) await updateCuenta(db, editingCuenta.id, data, usuario);
      else await addCuenta(db, data, usuario);
      showToast?.(editingCuenta?.id ? 'Cuenta actualizada' : 'Cuenta creada', 'success');
      setEditingCuenta(null); await cargarTodo();
    } catch (e) { showToast?.(e.message, 'error'); }
  };

  const handleDeleteCuenta = async (c) => {
    if (!window.confirm(`¿Eliminar cuenta ${c.codigo} - ${c.nombre}?`)) return;
    try { await deleteCuenta(db, c.id, usuario); showToast?.('Cuenta eliminada', 'success'); await cargarTodo(); }
    catch (e) { showToast?.(e.message, 'error'); }
  };

  const handleSaveCC = async (data) => {
    try {
      if (editingCC?.id) await updateCentroCosto(db, editingCC.id, data, usuario);
      else await addCentroCosto(db, data, usuario);
      showToast?.(editingCC?.id ? 'Centro actualizado' : 'Centro creado', 'success');
      setEditingCC(null); await cargarTodo();
    } catch (e) { showToast?.(e.message, 'error'); }
  };

  const handleDeleteCC = async (c) => {
    if (!window.confirm(`¿Eliminar centro de costo ${c.codigo}?`)) return;
    try { await deleteCentroCosto(db, c.id, usuario); showToast?.('Centro eliminado', 'success'); await cargarTodo(); }
    catch (e) { showToast?.(e.message, 'error'); }
  };

  const handleConfirmarAsiento = async (id) => {
    try { await confirmarAsiento(db, id, usuario); showToast?.('Asiento confirmado', 'success'); await cargarTodo(); }
    catch (e) { showToast?.(e.message, 'error'); }
  };

  const handleAnularAsiento = async (id) => {
    if (!window.confirm('¿Anular este asiento contable?')) return;
    try { await anularAsiento(db, id, usuario); showToast?.('Asiento anulado', 'success'); await cargarTodo(); }
    catch (e) { showToast?.(e.message, 'error'); }
  };

  const handleDeleteAsiento = async (id) => {
    if (!window.confirm('¿Eliminar este asiento?')) return;
    try { await deleteAsiento(db, id, usuario); showToast?.('Asiento eliminado', 'success'); await cargarTodo(); }
    catch (e) { showToast?.(e.message, 'error'); }
  };

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
        <AlertCircle className="mx-auto mb-3 text-error" size={32} />
        <div className="text-error text-lg mb-2">Error al cargar</div>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <button onClick={cargarTodo} className="px-4 py-2 bg-primary text-white rounded-btn text-sm">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Layers size={14} className="text-primary" />Cuentas</div>
          <div className="text-lg font-bold text-primary">{resumen.totalCuentas}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Building2 size={14} className="text-info" />Centros Activos</div>
          <div className="text-lg font-bold text-info">{resumen.totalCentros}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><FileCheck size={14} className="text-success" />Asientos del Mes</div>
          <div className="text-lg font-bold text-success">{resumen.asientosMes}</div>
        </div>
        <div className="bg-surface-card border border-border-default rounded-card p-4">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1"><Target size={14} className="text-warning" />Presupuesto Ejecutado</div>
          <div className="text-lg font-bold text-warning">
            {resumen.totalPresupuesto > 0 ? `${((resumen.totalEjecutado / resumen.totalPresupuesto) * 100).toFixed(1)}%` : '0%'}
          </div>
          <div className="text-xs text-text-secondary">{fmt(resumen.totalEjecutado)} / {fmt(resumen.totalPresupuesto)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-card border border-border-default rounded-card p-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-medium whitespace-nowrap transition-all ${active ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-sidebar hover:text-text-primary'}`}>
                <Icon size={15} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* PLAN DE CUENTAS */}
      {tab === 'plan' && (
        <div className="bg-surface-card border border-border-default rounded-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
                placeholder="Buscar código o nombre..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
            </div>
            <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
              className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
              <option value="all">Todos los tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => setEditingCuenta({ ...EMPTY_CUENTA, _new: true })}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-btn text-sm hover:bg-primary/90">
              <Plus size={14} /> Nueva Cuenta
            </button>
          </div>

          {editingCuenta && <CuentaForm cuenta={editingCuenta} cuentas={cuentas} onSave={handleSaveCuenta} onCancel={() => setEditingCuenta(null)} />}

          {cuentas.length === 0 ? (
            <div className="text-center py-10 text-text-secondary">
              <BookOpen className="mx-auto mb-2 text-text-muted" size={28} />
              <p className="text-sm">No hay cuentas configuradas. Crea la primera para iniciar el plan contable.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {buildTree().map(c => (
                <NodoCuenta key={c.id} cuenta={c} depth={0} expandedIds={expandedIds} toggleExpand={toggleExpand}
                  onEdit={(ct) => setEditingCuenta({ ...ct })} onDelete={handleDeleteCuenta}
                  onAddChild={() => setEditingCuenta({ ...EMPTY_CUENTA, _new: true, padreId: c.id, nivel: Math.min(4, (c.nivel || 0) + 1) })}
                  tipoBadge={TIPO_BADGES} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* CENTROS DE COSTO */}
      {tab === 'centros' && (
        <div className="bg-surface-card border border-border-default rounded-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Building2 size={16} className="text-primary" />Centros de Costo</h3>
            <button onClick={() => setEditingCC({ ...EMPTY_CC, _new: true })}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-btn text-sm hover:bg-primary/90">
              <Plus size={14} /> Nuevo Centro
            </button>
          </div>

          {editingCC && <CCForm centro={editingCC} onSave={handleSaveCC} onCancel={() => setEditingCC(null)} />}

          {centros.length === 0 ? (
            <div className="text-center py-10 text-text-secondary">
              <Building2 className="mx-auto mb-2 text-text-muted" size={28} />
              <p className="text-sm">No hay centros de costo. Crea uno para asignar movimientos contables.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-text-secondary text-xs uppercase">
                    <th className="text-left py-2 px-2">Código</th>
                    <th className="text-left py-2 px-2">Nombre</th>
                    <th className="text-left py-2 px-2">Responsable</th>
                    <th className="text-right py-2 px-2">Presupuesto</th>
                    <th className="text-right py-2 px-2">Ejecutado</th>
                    <th className="text-right py-2 px-2">% Ejec.</th>
                    <th className="text-center py-2 px-2">Estado</th>
                    <th className="text-center py-2 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {centros.map(c => {
                    const pct = c.presupuestoAnual > 0 ? (c.ejecutado / c.presupuestoAnual) * 100 : 0;
                    return (
                      <tr key={c.id} className="border-b border-border-default/50 hover:bg-surface-sidebar/50">
                        <td className="py-2 px-2 font-mono text-xs text-text-primary">{c.codigo}</td>
                        <td className="py-2 px-2 text-text-primary">{c.nombre}</td>
                        <td className="py-2 px-2 text-text-secondary">{c.responsable || '-'}</td>
                        <td className="py-2 px-2 text-right font-mono text-text-primary">{fmt(c.presupuestoAnual)}</td>
                        <td className="py-2 px-2 text-right font-mono text-text-primary">{fmt(c.ejecutado)}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={`font-mono text-xs ${pct > 100 ? 'text-error' : pct > 80 ? 'text-warning' : 'text-success'}`}>{pct.toFixed(1)}%</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-btn border text-xs ${ESTADO_BADGES[c.estado] || ''}`}>{c.estado}</span>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setEditingCC({ ...c })} className="p-1 rounded hover:bg-surface-sidebar text-info"><Edit2 size={13} /></button>
                            <button onClick={() => handleDeleteCC(c)} className="p-1 rounded hover:bg-surface-sidebar text-error"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LIBRO DIARIO */}
      {tab === 'diario' && (
        <div className="bg-surface-card border border-border-default rounded-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={14} className="text-text-muted" />
            <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
              className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
            <span className="text-text-muted text-xs">a</span>
            <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
              className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
            <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
              className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
              <option value="all">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="confirmado">Confirmado</option>
              <option value="anulado">Anulado</option>
            </select>
            <select value={filtros.centroCostoId} onChange={e => setFiltros(f => ({ ...f, centroCostoId: e.target.value }))}
              className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
              <option value="">Todos los centros</option>
              {centros.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
            </select>
            <button onClick={cargarTodo} className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary hover:bg-surface-sidebar">
              <Calculator size={14} className="inline mr-1" />Recalcular
            </button>
          </div>

          {asientos.length === 0 ? (
            <div className="text-center py-10 text-text-secondary">
              <FileText className="mx-auto mb-2 text-text-muted" size={28} />
              <p className="text-sm">No hay asientos en el período seleccionado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {asientos.map(a => (
                <AsientoCard key={a.id} asiento={a} cuentas={cuentas} centros={centros}
                  onConfirmar={() => handleConfirmarAsiento(a.id)} onAnular={() => handleAnularAsiento(a.id)}
                  onDelete={() => handleDeleteAsiento(a.id)} fmt={fmt} fmtDate={fmtDate}
                  estadoBadge={ESTADO_BADGES} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NodoCuenta({ cuenta, depth, expandedIds, toggleExpand, onEdit, onDelete, onAddChild, tipoBadge }) {
  const [hover, setHover] = useState(false);
  const hasHijos = cuenta.hijos?.length > 0;
  const expanded = expandedIds.has(cuenta.id);

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-btn hover:bg-surface-sidebar/50 transition-colors group`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <button onClick={() => hasHijos && toggleExpand(cuenta.id)} className="shrink-0 w-4">
          {hasHijos ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3.5 inline-block" />}
        </button>
        <span className="font-mono text-xs text-primary shrink-0">{cuenta.codigo}</span>
        <span className="text-sm text-text-primary truncate flex-1">{cuenta.nombre}</span>
        <span className={`px-2 py-0.5 rounded-btn border text-xs shrink-0 ${tipoBadge[cuenta.tipo]}`}>{cuenta.tipo}</span>
        {cuenta.aceptaMovimientos && <span className="text-xs text-success shrink-0" title="Acepta movimientos">●</span>}
        <div className={`flex items-center gap-0.5 ${hover ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          {depth < 3 && <button onClick={onAddChild} className="p-1 rounded hover:bg-surface-sidebar text-success" title="Agregar subcuenta"><Plus size={13} /></button>}
          <button onClick={() => onEdit(cuenta)} className="p-1 rounded hover:bg-surface-sidebar text-info" title="Editar"><Edit2 size={13} /></button>
          <button onClick={() => onDelete(cuenta)} className="p-1 rounded hover:bg-surface-sidebar text-error" title="Eliminar"><Trash2 size={13} /></button>
        </div>
      </div>
      {expanded && hasHijos && cuenta.hijos.map(h => (
        <NodoCuenta key={h.id} cuenta={h} depth={depth + 1} expandedIds={expandedIds} toggleExpand={toggleExpand}
          onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} tipoBadge={tipoBadge} />
      ))}
    </div>
  );
}

function CuentaForm({ cuenta, cuentas, onSave, onCancel }) {
  const [data, setData] = useState(cuenta);
  const posiblesPadres = cuentas.filter(c => c.nivel < (data.nivel || 1));

  return (
    <div className="border border-primary/30 rounded-card p-3 bg-primary-light/20 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">{cuenta._new ? 'Nueva Cuenta' : 'Editar Cuenta'}</h4>
        <button onClick={onCancel} className="btn-icon text-gray-500"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input value={data.codigo} onChange={e => setData(d => ({ ...d, codigo: e.target.value }))}
          placeholder="Código (ej: 1.1.01.001)" className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
        <input value={data.nombre} onChange={e => setData(d => ({ ...d, nombre: e.target.value }))}
          placeholder="Nombre" className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
        <select value={data.tipo} onChange={e => setData(d => ({ ...d, tipo: e.target.value }))}
          className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={data.nivel} onChange={e => setData(d => ({ ...d, nivel: Number(e.target.value) }))}
          className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
          {[1,2,3,4].map(n => <option key={n} value={n}>Nivel {n}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={data.padreId || ''} onChange={e => setData(d => ({ ...d, padreId: e.target.value || null }))}
          className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary">
          <option value="">Sin padre (cuenta raíz)</option>
          {posiblesPadres.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary">
          <input type="checkbox" checked={!!data.aceptaMovimientos} onChange={e => setData(d => ({ ...d, aceptaMovimientos: e.target.checked }))}
            className="rounded" />
          Acepta movimientos (asientos)
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 text-sm border border-border-default rounded-btn text-text-secondary hover:bg-surface-sidebar">Cancelar</button>
        <button onClick={() => onSave(data)} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-btn text-sm hover:bg-primary/90">
          <Save size={14} /> Guardar
        </button>
      </div>
    </div>
  );
}

function CCForm({ centro, onSave, onCancel }) {
  const [data, setData] = useState(centro);
  return (
    <div className="border border-primary/30 rounded-card p-3 bg-primary-light/20 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">{centro._new ? 'Nuevo Centro' : 'Editar Centro'}</h4>
        <button onClick={onCancel} className="btn-icon text-gray-500"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input value={data.codigo} onChange={e => setData(d => ({ ...d, codigo: e.target.value }))}
          placeholder="Código (ej: CC-001)" className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
        <input value={data.nombre} onChange={e => setData(d => ({ ...d, nombre: e.target.value }))}
          placeholder="Nombre" className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
        <input value={data.responsable} onChange={e => setData(d => ({ ...d, responsable: e.target.value }))}
          placeholder="Responsable" className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
        <input type="number" step="0.01" value={data.presupuestoAnual} onChange={e => setData(d => ({ ...d, presupuestoAnual: Number(e.target.value) }))}
          placeholder="Presupuesto anual" className="px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 text-sm border border-border-default rounded-btn text-text-secondary hover:bg-surface-sidebar">Cancelar</button>
        <button onClick={() => onSave(data)} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-btn text-sm hover:bg-primary/90">
          <Save size={14} /> Guardar
        </button>
      </div>
    </div>
  );
}

function AsientoCard({ asiento, cuentas, centros, onConfirmar, onAnular, onDelete, fmt, fmtDate, estadoBadge }) {
  const [open, setOpen] = useState(false);
  const mapCtas = new Map(cuentas.map(c => [c.id, c]));
  const mapCC = new Map(centros.map(c => [c.id, c]));

  return (
    <div className="border border-border-default rounded-card overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2 bg-surface-sidebar/50 cursor-pointer" onClick={() => setOpen(!open)}>
        <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="font-mono text-xs text-text-muted">{fmtDate(asiento.fecha)}</span>
        <span className="text-sm text-text-primary flex-1 truncate">{asiento.descripcion}</span>
        <span className={`px-2 py-0.5 rounded-btn border text-xs ${estadoBadge[asiento.estado] || ''}`}>{asiento.estado}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-surface-card border border-border-default text-text-secondary">{asiento.tipo}</span>
        <span className="font-mono text-sm font-semibold text-primary">{fmt(asiento.total)}</span>
      </div>
      {open && (
        <div className="px-3 py-2 space-y-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-secondary uppercase">
                <th className="text-left py-1">Cuenta</th>
                <th className="text-left py-1">Centro</th>
                <th className="text-left py-1">Descripción</th>
                <th className="text-right py-1">Debe</th>
                <th className="text-right py-1">Haber</th>
              </tr>
            </thead>
            <tbody>
              {(asiento.lineas || []).map((l, idx) => (
                <tr key={idx} className="border-t border-border-default/30">
                  <td className="py-1 font-mono text-text-primary">{mapCtas.get(l.cuentaId)?.codigo || '?'} - {mapCtas.get(l.cuentaId)?.nombre || '—'}</td>
                  <td className="py-1 text-text-secondary">{mapCC.get(l.centroCostoId)?.codigo || '—'}</td>
                  <td className="py-1 text-text-secondary">{l.descripcion || '—'}</td>
                  <td className="py-1 text-right font-mono text-success">{l.debe ? fmt(l.debe) : ''}</td>
                  <td className="py-1 text-right font-mono text-error">{l.haber ? fmt(l.haber) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-default font-semibold">
                <td colSpan={3} className="py-1 text-text-secondary">TOTAL</td>
                <td className="py-1 text-right font-mono text-success">{fmt(asiento.total)}</td>
                <td className="py-1 text-right font-mono text-error">{fmt(asiento.total)}</td>
              </tr>
            </tfoot>
          </table>
          <div className="flex items-center gap-2 pt-2">
            {asiento.estado === 'borrador' && (
              <button onClick={onConfirmar} className="flex items-center gap-1 px-2.5 py-1 bg-success/10 text-success border border-success/20 rounded-btn text-xs hover:bg-success/20">
                <CheckCircle2 size={12} /> Confirmar
              </button>
            )}
            {asiento.estado === 'confirmado' && (
              <button onClick={onAnular} className="flex items-center gap-1 px-2.5 py-1 bg-warning/10 text-warning border border-warning/20 rounded-btn text-xs hover:bg-warning/20">
                <XCircle size={12} /> Anular
              </button>
            )}
            {asiento.estado !== 'confirmado' && (
              <button onClick={onDelete} className="flex items-center gap-1 px-2.5 py-1 bg-error/10 text-error border border-error/20 rounded-btn text-xs hover:bg-error/20">
                <Trash2 size={12} /> Eliminar
              </button>
            )}
            {asiento.movimientoId && (
              <span className="text-xs text-text-muted ml-auto">Vinculado: {asiento.movimientoId}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
