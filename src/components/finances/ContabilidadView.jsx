import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
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
  activo: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  pasivo: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
  patrimonio: {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-11)"}},
  ingreso: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  gasto: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
};
const ESTADO_BADGES = {
  borrador: {"style":{"backgroundColor":"var(--gray-3)","color":"var(--gray-11)"}},
  confirmado: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  anulado: {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}},
  activo: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  inactivo: {"style":{"backgroundColor":"var(--gray-3)","color":"var(--gray-11)"}},
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
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
          {[1,2,3,4].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-20"}} />)}
        </UiBox>
        {[1,2,3,4,5].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-12"}} />)}
      </UiBox>
    );
  }

  if (error) {
    return (
      <UiBox {...{"className":"text-center py-12"}}>
        <AlertCircle {...{"style":{"color":"var(--red-12)"},"className":"mx-auto mb-3"}} size={32} />
        <UiBox {...{"style":{"color":"var(--red-12)"},"className":"mb-2"}}>Error al cargar</UiBox>
        <UiText as="p" {...{"color":"gray","size":"2","className":"mb-4"}}>{error}</UiText>
        <UiButton onClick={cargarTodo} {...{"variant":"solid","color":"blue","size":"2"}}>Reintentar</UiButton>
      </UiBox>
    );
  }

  return (
    <UiBox {...{"className":"space-y-4"}}>
      {/* KPIs */}
      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><Layers size={14} {...{"style":{"color":"var(--blue-12)"}}} />Cuentas</UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{resumen.totalCuentas}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><Building2 size={14} {...{"style":{"color":"var(--blue-12)"}}} />Centros Activos</UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{resumen.totalCentros}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><FileCheck size={14} {...{"style":{"color":"var(--green-12)"}}} />Asientos del Mes</UiBox>
          <UiBox {...{"style":{"color":"var(--green-12)"}}}>{resumen.asientosMes}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><Target size={14} {...{"style":{"color":"var(--amber-12)"}}} />Presupuesto Ejecutado</UiBox>
          <UiBox {...{"style":{"color":"var(--amber-12)"}}}>
            {resumen.totalPresupuesto > 0 ? `${((resumen.totalEjecutado / resumen.totalPresupuesto) * 100).toFixed(1)}%` : '0%'}
          </UiBox>
          <UiBox {...{"style":{"color":"var(--gray-11)"}}}>{fmt(resumen.totalEjecutado)} / {fmt(resumen.totalPresupuesto)}</UiBox>
        </UiCard>
      </UiBox>

      {/* Tabs */}
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-2"}}>
        <UiBox {...{"className":"flex gap-1.5 overflow-x-auto scrollbar-none"}}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <UiButton key={t.id} onClick={() => setTab(t.id)}
                {...mergeThemeProps({"size":"2","className":"flex items-center gap-2 whitespace-nowrap"}, {}, (active ? {"variant":"solid","color":"blue"} : {"color":"gray"}))}>
                <Icon size={15} />{t.label}
              </UiButton>
            );
          })}
        </UiBox>
      </UiCard>

      {/* PLAN DE CUENTAS */}
      {tab === 'plan' && (
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 space-y-3"}}>
          <UiBox {...{"className":"flex flex-wrap items-center gap-2"}}>
            <UiBox {...{"className":"relative flex-1 min-w-[200px]"}}>
              <Search size={14} {...{"style":{"color":"var(--gray-11)"},"className":"absolute left-3 top-1/2 -translate-y-1/2"}} />
              <UiInput type="text" value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
                placeholder="Buscar código o nombre..."
                {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
            <UiSelect value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
              {...{"size":"2","color":"gray"}}>
              <option value="all">Todos los tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </UiSelect>
            <UiButton onClick={() => setEditingCuenta({ ...EMPTY_CUENTA, _new: true })}
              {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1.5"}}>
              <Plus size={14} /> Nueva Cuenta
            </UiButton>
          </UiBox>

          {editingCuenta && <CuentaForm cuenta={editingCuenta} cuentas={cuentas} onSave={handleSaveCuenta} onCancel={() => setEditingCuenta(null)} />}

          {cuentas.length === 0 ? (
            <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"text-center py-10"}}>
              <BookOpen {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-2"}} size={28} />
              <UiText as="p" {...{"size":"2"}}>No hay cuentas configuradas. Crea la primera para iniciar el plan contable.</UiText>
            </UiBox>
          ) : (
            <UiBox {...{"className":"space-y-0.5"}}>
              {buildTree().map(c => (
                <NodoCuenta key={c.id} cuenta={c} depth={0} expandedIds={expandedIds} toggleExpand={toggleExpand}
                  onEdit={(ct) => setEditingCuenta({ ...ct })} onDelete={handleDeleteCuenta}
                  onAddChild={() => setEditingCuenta({ ...EMPTY_CUENTA, _new: true, padreId: c.id, nivel: Math.min(4, (c.nivel || 0) + 1) })}
                  tipoBadge={TIPO_BADGES} />
              ))}
            </UiBox>
          )}
        </UiCard>
      )}

      {/* CENTROS DE COSTO */}
      {tab === 'centros' && (
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 space-y-3"}}>
          <UiBox {...{"className":"flex items-center justify-between"}}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-2"}}><Building2 size={16} {...{"style":{"color":"var(--blue-12)"}}} />Centros de Costo</UiHeading>
            <UiButton onClick={() => setEditingCC({ ...EMPTY_CC, _new: true })}
              {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1.5"}}>
              <Plus size={14} /> Nuevo Centro
            </UiButton>
          </UiBox>

          {editingCC && <CCForm centro={editingCC} onSave={handleSaveCC} onCancel={() => setEditingCC(null)} />}

          {centros.length === 0 ? (
            <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"text-center py-10"}}>
              <Building2 {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-2"}} size={28} />
              <UiText as="p" {...{"size":"2"}}>No hay centros de costo. Crea uno para asignar movimientos contables.</UiText>
            </UiBox>
          ) : (
            <UiBox {...{"className":"overflow-x-auto"}}>
              <UiTable {...{"className":"w-full"}}>
                <UiTableHeader>
                  <UiTableRow {...{"style":{"color":"var(--gray-11)"}}}>
                    <UiTableHead {...{"className":"text-left py-2 px-2"}}>Código</UiTableHead>
                    <UiTableHead {...{"className":"text-left py-2 px-2"}}>Nombre</UiTableHead>
                    <UiTableHead {...{"className":"text-left py-2 px-2"}}>Responsable</UiTableHead>
                    <UiTableHead {...{"className":"text-right py-2 px-2"}}>Presupuesto</UiTableHead>
                    <UiTableHead {...{"className":"text-right py-2 px-2"}}>Ejecutado</UiTableHead>
                    <UiTableHead {...{"className":"text-right py-2 px-2"}}>% Ejec.</UiTableHead>
                    <UiTableHead {...{"className":"text-center py-2 px-2"}}>Estado</UiTableHead>
                    <UiTableHead {...{"className":"text-center py-2 px-2"}}>Acciones</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody>
                  {centros.map(c => {
                    const pct = c.presupuestoAnual > 0 ? (c.ejecutado / c.presupuestoAnual) * 100 : 0;
                    return (
                      <UiTableRow key={c.id} {...{}}>
                        <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"py-2 px-2"}}>{c.codigo}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"py-2 px-2"}}>{c.nombre}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"py-2 px-2"}}>{c.responsable || '-'}</UiTableCell>
                        <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"py-2 px-2 text-right"}}>{fmt(c.presupuestoAnual)}</UiTableCell>
                        <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"py-2 px-2 text-right"}}>{fmt(c.ejecutado)}</UiTableCell>
                        <UiTableCell {...{"className":"py-2 px-2 text-right"}}>
                          <UiText {...mergeThemeProps({"weight":"regular","size":"1"}, {}, (pct > 100 ? {"color":"red"} : (pct > 80 ? {"color":"amber"} : {"color":"green"})))}>{pct.toFixed(1)}%</UiText>
                        </UiTableCell>
                        <UiTableCell {...{"className":"py-2 px-2 text-center"}}>
                          <UiText {...mergeThemeProps({"size":"1","className":"inline-block px-2 py-0.5"}, {}, (ESTADO_BADGES[c.estado] || {}))}>{c.estado}</UiText>
                        </UiTableCell>
                        <UiTableCell {...{"className":"py-2 px-2"}}>
                          <UiBox {...{"className":"flex items-center justify-center gap-1"}}>
                            <UiButton iconOnly onClick={() => setEditingCC({ ...c })} {...{"color":"blue"}}><Edit2 size={13} /></UiButton>
                            <UiButton iconOnly onClick={() => handleDeleteCC(c)} {...{"color":"red"}}><Trash2 size={13} /></UiButton>
                          </UiBox>
                        </UiTableCell>
                      </UiTableRow>
                    );
                  })}
                </UiTableBody>
              </UiTable>
            </UiBox>
          )}
        </UiCard>
      )}

      {/* LIBRO DIARIO */}
      {tab === 'diario' && (
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 space-y-3"}}>
          <UiBox {...{"className":"flex flex-wrap items-center gap-2"}}>
            <Calendar size={14} {...{"style":{"color":"var(--gray-11)"}}} />
            <UiInput type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
              {...{"size":"2","color":"gray"}} />
            <UiText {...{"color":"gray","size":"1"}}>a</UiText>
            <UiInput type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
              {...{"size":"2","color":"gray"}} />
            <UiSelect value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
              {...{"size":"2","color":"gray"}}>
              <option value="all">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="confirmado">Confirmado</option>
              <option value="anulado">Anulado</option>
            </UiSelect>
            <UiSelect value={filtros.centroCostoId} onChange={e => setFiltros(f => ({ ...f, centroCostoId: e.target.value }))}
              {...{"size":"2","color":"gray"}}>
              <option value="">Todos los centros</option>
              {centros.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
            </UiSelect>
            <UiButton onClick={cargarTodo} {...{"size":"2","variant":"surface","color":"gray"}}>
              <Calculator size={14} {...{"className":"inline mr-1"}} />Recalcular
            </UiButton>
          </UiBox>

          {asientos.length === 0 ? (
            <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"text-center py-10"}}>
              <FileText {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-2"}} size={28} />
              <UiText as="p" {...{"size":"2"}}>No hay asientos en el período seleccionado.</UiText>
            </UiBox>
          ) : (
            <UiBox {...{"className":"space-y-2"}}>
              {asientos.map(a => (
                <AsientoCard key={a.id} asiento={a} cuentas={cuentas} centros={centros}
                  onConfirmar={() => handleConfirmarAsiento(a.id)} onAnular={() => handleAnularAsiento(a.id)}
                  onDelete={() => handleDeleteAsiento(a.id)} fmt={fmt} fmtDate={fmtDate}
                  estadoBadge={ESTADO_BADGES} />
              ))}
            </UiBox>
          )}
        </UiCard>
      )}
    </UiBox>
  );
}

function NodoCuenta({ cuenta, depth, expandedIds, toggleExpand, onEdit, onDelete, onAddChild, tipoBadge }) {
  const [hover, setHover] = useState(false);
  const hasHijos = cuenta.hijos?.length > 0;
  const expanded = expandedIds.has(cuenta.id);

  return (
    <UiBox>
      <UiBox
        {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"flex items-center gap-2 py-1.5 px-2 group"})}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <UiButton onClick={() => hasHijos && toggleExpand(cuenta.id)} {...{"className":"shrink-0 w-4"}}>
          {hasHijos ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <UiText {...{"className":"w-3.5 inline-block"}} />}
        </UiButton>
        <UiText {...{"weight":"regular","size":"1","color":"blue","className":"shrink-0"}}>{cuenta.codigo}</UiText>
        <UiText {...{"size":"2","color":"gray","highContrast":true,"className":"truncate flex-1"}}>{cuenta.nombre}</UiText>
        <UiText {...mergeThemeProps({"size":"1","className":"px-2 py-0.5 shrink-0"}, {}, resolveThemeProps(tipoBadge[cuenta.tipo]))}>{cuenta.tipo}</UiText>
        {cuenta.aceptaMovimientos && <UiText {...{"size":"1","color":"green","className":"shrink-0"}} title="Acepta movimientos">●</UiText>}
        <UiBox {...mergeThemeProps({"className":"flex items-center gap-0.5"}, {"className":"transition-opacity"}, (hover ? {"className":"opacity-100"} : {"className":"opacity-0"}))}>
          {depth < 3 && <UiButton iconOnly onClick={onAddChild} {...{"color":"green"}} title="Agregar subcuenta"><Plus size={13} /></UiButton>}
          <UiButton iconOnly onClick={() => onEdit(cuenta)} {...{"color":"blue"}} title="Editar"><Edit2 size={13} /></UiButton>
          <UiButton iconOnly onClick={() => onDelete(cuenta)} {...{"color":"red"}} title="Eliminar"><Trash2 size={13} /></UiButton>
        </UiBox>
      </UiBox>
      {expanded && hasHijos && cuenta.hijos.map(h => (
        <NodoCuenta key={h.id} cuenta={h} depth={depth + 1} expandedIds={expandedIds} toggleExpand={toggleExpand}
          onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} tipoBadge={tipoBadge} />
      ))}
    </UiBox>
  );
}

function CuentaForm({ cuenta, cuentas, onSave, onCancel }) {
  const [data, setData] = useState(cuenta);
  const posiblesPadres = cuentas.filter(c => c.nivel < (data.nivel || 1));

  return (
    <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)"},"className":"p-3 space-y-3"}}>
      <UiBox {...{"className":"flex items-center justify-between"}}>
        <UiHeading as="h4" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>{cuenta._new ? 'Nueva Cuenta' : 'Editar Cuenta'}</UiHeading>
        <UiButton iconOnly onClick={onCancel} {...{"variant":"surface","color":"gray"}}><X size={14} /></UiButton>
      </UiBox>
      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-2"}}>
        <UiInput value={data.codigo} onChange={e => setData(d => ({ ...d, codigo: e.target.value }))}
          placeholder="Código (ej: 1.1.01.001)" {...{"size":"2","color":"gray"}} />
        <UiInput value={data.nombre} onChange={e => setData(d => ({ ...d, nombre: e.target.value }))}
          placeholder="Nombre" {...{"size":"2","color":"gray"}} />
        <UiSelect value={data.tipo} onChange={e => setData(d => ({ ...d, tipo: e.target.value }))}
          {...{"size":"2","color":"gray"}}>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </UiSelect>
        <UiSelect value={data.nivel} onChange={e => setData(d => ({ ...d, nivel: Number(e.target.value) }))}
          {...{"size":"2","color":"gray"}}>
          {[1,2,3,4].map(n => <option key={n} value={n}>Nivel {n}</option>)}
        </UiSelect>
      </UiBox>
      <UiBox {...{"className":"grid grid-cols-2 gap-2"}}>
        <UiSelect value={data.padreId || ''} onChange={e => setData(d => ({ ...d, padreId: e.target.value || null }))}
          {...{"size":"2","color":"gray"}}>
          <option value="">Sin padre (cuenta raíz)</option>
          {posiblesPadres.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
        </UiSelect>
        <UiLabel {...{"size":"2","color":"gray","highContrast":true,"className":"flex items-center gap-2 px-3 py-2"}}>
          <UiInput type="checkbox" checked={!!data.aceptaMovimientos} onChange={e => setData(d => ({ ...d, aceptaMovimientos: e.target.checked }))}
            {...{}} />
          Acepta movimientos (asientos)
        </UiLabel>
      </UiBox>
      <UiBox {...{"className":"flex justify-end gap-2"}}>
        <UiButton onClick={onCancel} {...{"size":"2","variant":"outline","color":"gray"}}>Cancelar</UiButton>
        <UiButton onClick={() => onSave(data)} {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1.5"}}>
          <Save size={14} /> Guardar
        </UiButton>
      </UiBox>
    </UiBox>
  );
}

function CCForm({ centro, onSave, onCancel }) {
  const [data, setData] = useState(centro);
  return (
    <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)"},"className":"p-3 space-y-3"}}>
      <UiBox {...{"className":"flex items-center justify-between"}}>
        <UiHeading as="h4" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>{centro._new ? 'Nuevo Centro' : 'Editar Centro'}</UiHeading>
        <UiButton iconOnly onClick={onCancel} {...{"variant":"surface","color":"gray"}}><X size={14} /></UiButton>
      </UiBox>
      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-2"}}>
        <UiInput value={data.codigo} onChange={e => setData(d => ({ ...d, codigo: e.target.value }))}
          placeholder="Código (ej: CC-001)" {...{"size":"2","color":"gray"}} />
        <UiInput value={data.nombre} onChange={e => setData(d => ({ ...d, nombre: e.target.value }))}
          placeholder="Nombre" {...{"size":"2","color":"gray"}} />
        <UiInput value={data.responsable} onChange={e => setData(d => ({ ...d, responsable: e.target.value }))}
          placeholder="Responsable" {...{"size":"2","color":"gray"}} />
        <UiInput type="number" step="0.01" value={data.presupuestoAnual} onChange={e => setData(d => ({ ...d, presupuestoAnual: Number(e.target.value) }))}
          placeholder="Presupuesto anual" {...{"size":"2","color":"gray"}} />
      </UiBox>
      <UiBox {...{"className":"flex justify-end gap-2"}}>
        <UiButton onClick={onCancel} {...{"size":"2","variant":"outline","color":"gray"}}>Cancelar</UiButton>
        <UiButton onClick={() => onSave(data)} {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1.5"}}>
          <Save size={14} /> Guardar
        </UiButton>
      </UiBox>
    </UiBox>
  );
}

function AsientoCard({ asiento, cuentas, centros, onConfirmar, onAnular, onDelete, fmt, fmtDate, estadoBadge }) {
  const [open, setOpen] = useState(false);
  const mapCtas = new Map(cuentas.map(c => [c.id, c]));
  const mapCC = new Map(centros.map(c => [c.id, c]));

  return (
    <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center gap-3 px-3 py-2 cursor-pointer"}} onClick={() => setOpen(!open)}>
        <ChevronRight size={14} {...mergeThemeProps({"className":"transition-transform"}, {}, (open ? {"className":"rotate-90"} : {}))} />
        <UiText {...{"weight":"regular","size":"1","color":"gray"}}>{fmtDate(asiento.fecha)}</UiText>
        <UiText {...{"size":"2","color":"gray","highContrast":true,"className":"flex-1 truncate"}}>{asiento.descripcion}</UiText>
        <UiText {...mergeThemeProps({"size":"1","className":"px-2 py-0.5"}, {}, (estadoBadge[asiento.estado] || {}))}>{asiento.estado}</UiText>
        <UiText {...{"size":"1","color":"gray","className":"px-1.5 py-0.5"}}>{asiento.tipo}</UiText>
        <UiText {...{"weight":"bold","size":"2","color":"blue"}}>{fmt(asiento.total)}</UiText>
      </UiBox>
      {open && (
        <UiBox {...{"className":"px-3 py-2 space-y-1"}}>
          <UiTable {...{"className":"w-full"}}>
            <UiTableHeader>
              <UiTableRow {...{"style":{"color":"var(--gray-11)"}}}>
                <UiTableHead {...{"className":"text-left py-1"}}>Cuenta</UiTableHead>
                <UiTableHead {...{"className":"text-left py-1"}}>Centro</UiTableHead>
                <UiTableHead {...{"className":"text-left py-1"}}>Descripción</UiTableHead>
                <UiTableHead {...{"className":"text-right py-1"}}>Debe</UiTableHead>
                <UiTableHead {...{"className":"text-right py-1"}}>Haber</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              {(asiento.lineas || []).map((l, idx) => (
                <UiTableRow key={idx} {...{}}>
                  <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"py-1"}}>{mapCtas.get(l.cuentaId)?.codigo || '?'} - {mapCtas.get(l.cuentaId)?.nombre || '—'}</UiTableCell>
                  <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"py-1"}}>{mapCC.get(l.centroCostoId)?.codigo || '—'}</UiTableCell>
                  <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"py-1"}}>{l.descripcion || '—'}</UiTableCell>
                  <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--green-12)"},"className":"py-1 text-right"}}>{l.debe ? fmt(l.debe) : ''}</UiTableCell>
                  <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--red-12)"},"className":"py-1 text-right"}}>{l.haber ? fmt(l.haber) : ''}</UiTableCell>
                </UiTableRow>
              ))}
            </UiTableBody>
            <tfoot>
              <UiTableRow {...{}}>
                <UiTableCell colSpan={3} {...{"style":{"color":"var(--gray-11)"},"className":"py-1"}}>TOTAL</UiTableCell>
                <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--green-12)"},"className":"py-1 text-right"}}>{fmt(asiento.total)}</UiTableCell>
                <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--red-12)"},"className":"py-1 text-right"}}>{fmt(asiento.total)}</UiTableCell>
              </UiTableRow>
            </tfoot>
          </UiTable>
          <UiBox {...{"className":"flex items-center gap-2 pt-2"}}>
            {asiento.estado === 'borrador' && (
              <UiButton onClick={onConfirmar} {...{"variant":"soft","color":"green","size":"2","className":"flex items-center gap-1"}}>
                <CheckCircle2 size={12} /> Confirmar
              </UiButton>
            )}
            {asiento.estado === 'confirmado' && (
              <UiButton onClick={onAnular} {...{"variant":"soft","color":"amber","size":"2","className":"flex items-center gap-1"}}>
                <XCircle size={12} /> Anular
              </UiButton>
            )}
            {asiento.estado !== 'confirmado' && (
              <UiButton onClick={onDelete} {...{"variant":"soft","color":"red","size":"2","className":"flex items-center gap-1"}}>
                <Trash2 size={12} /> Eliminar
              </UiButton>
            )}
            {asiento.movimientoId && (
              <UiText {...{"size":"1","color":"gray","className":"ml-auto"}}>Vinculado: {asiento.movimientoId}</UiText>
            )}
          </UiBox>
        </UiBox>
      )}
    </UiBox>
  );
}
