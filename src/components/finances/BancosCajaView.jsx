import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiSelect, UiInput, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useEffect, useCallback } from 'react';
import { Download, Plus, Building2, Wallet, ArrowDownLeft, ArrowUpRight, Link2, Link2Off, Trash2, X, Filter, Sparkles, CheckCircle } from 'lucide-react';
import { getCuentas, crearCuenta, actualizarCuenta, eliminarCuenta, getMovimientosBancarios, registrarMovimientoBancario, eliminarMovimientoBancario, conciliarMovimiento, desconciliarMovimiento, getResumenBancos, conciliacionAutomatica } from '../../services/bancosService';
import { Badge } from '../ui/badge';

const TIPO_BADGES = {
  banco: {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-11)"}},
  caja: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  ahorros: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  inversion: {"style":{"backgroundColor":"var(--purple-3)","color":"var(--purple-11)"}},
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
  const [sugerenciasConciliacion, setSugerenciasConciliacion] = useState(null);
  const [loadingConciliacion, setLoadingConciliacion] = useState(false);

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
  }, [db, filtros.tipo, cuentaActiva]);

  const cargarMovimientos = useCallback(async () => {
    if (!cuentaActiva) return;
    try {
      const data = await getMovimientosBancarios(db, cuentaActiva.id, { tipo: filtros.movTipo, fechaDesde: filtros.fechaDesde, fechaHasta: filtros.fechaHasta, conciliado: filtros.movConciliado });
      setMovimientos(data);
    } catch (e) { showToast?.('Error cargando movimientos: ' + e.message, 'error'); }
  }, [db, cuentaActiva, filtros.movTipo, filtros.fechaDesde, filtros.fechaHasta, filtros.movConciliado, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarCuentas();
  }, [cargarCuentas]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cuentaActiva) cargarMovimientos();
  }, [cuentaActiva, cargarMovimientos]);

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

  const handleConciliacionAutomatica = async () => {
    if (!cuentaActiva) return;
    setLoadingConciliacion(true);
    try {
      const resultado = await conciliacionAutomatica(db, cuentaActiva.id, usuario);
      setSugerenciasConciliacion(resultado);
      if (resultado.sugerencias > 0) {
        showToast(`Se encontraron ${resultado.sugerencias} posibles conciliaciones`, 'success');
      } else {
        showToast('No se encontraron coincidencias automáticas', 'info');
      }
    } catch (e) {
      showToast('Error en conciliación automática: ' + e.message, 'error');
    } finally {
      setLoadingConciliacion(false);
    }
  };

  const handleAplicarSugerencia = async (movBancId, movFinId) => {
    try {
      await conciliarMovimiento(db, movBancId, movFinId, usuario);
      showToast('Movimiento conciliado automáticamente', 'success');
      cargarMovimientos();
      // Actualizar sugerencias
      if (sugerenciasConciliacion) {
        const nuevasSugerencias = {
          ...sugerenciasConciliacion,
          detalle: sugerenciasConciliacion.detalle.filter(s => s.movimientoBancario.id !== movBancId),
          sugerencias: sugerenciasConciliacion.sugerencias - 1
        };
        setSugerenciasConciliacion(nuevasSugerencias);
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const getConfianzaColor = (confianza) => {
    if (confianza >= 90) return {"style":{"color":"var(--green-11)","backgroundColor":"var(--green-3)"}};
    if (confianza >= 80) return {"style":{"color":"var(--blue-11)","backgroundColor":"var(--blue-3)"}};
    return {"style":{"color":"var(--amber-11)","backgroundColor":"var(--amber-3)"}};
  };

  const getConfianzaBadge = (confianza) => {
    if (confianza >= 90) return { label: 'Alta', color: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}} };
    if (confianza >= 80) return { label: 'Media', color: {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-11)"}} };
    return { label: 'Baja', color: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}} };
  };

  if (loading && cuentas.length === 0) {
    return (
      <UiBox {...{"className":"space-y-4 animate-pulse"}}>
        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-3 gap-4"}}>
          {[1,2,3].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-20"}} />)}
        </UiBox>
        {[1,2,3].map(i => <UiBox key={i} {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"h-16"}} />)}
      </UiBox>
    );
  }

  if (error) {
    return (
      <UiBox {...{"className":"text-center py-12"}}>
        <UiBox {...{"style":{"color":"var(--red-12)"},"className":"mb-2"}}>Error al cargar</UiBox>
        <UiText as="p" {...{"color":"gray","size":"2","className":"mb-4"}}>{error}</UiText>
        <UiButton onClick={cargarCuentas} {...{"variant":"solid","color":"blue","size":"2"}}>Reintentar</UiButton>
      </UiBox>
    );
  }

  return (
    <UiBox {...{"className":"space-y-4"}}>
      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-3 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><Building2 size={14} {...{"style":{"color":"var(--blue-11)"}}} />Total en Bancos</UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{formatCurrency(resumen.totalBancos)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><Wallet size={14} {...{"style":{"color":"var(--amber-11)"}}} />Total en Caja</UiBox>
          <UiBox {...{"style":{"color":"var(--amber-12)"}}}>{formatCurrency(resumen.totalCaja)}</UiBox>
        </UiCard>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-2 mb-1"}}><Building2 size={14} {...{"style":{"color":"var(--blue-12)"}}} />Total General</UiBox>
          <UiBox {...{"style":{"color":"var(--blue-12)"}}}>{formatCurrency(resumen.totalGeneral)}</UiBox>
        </UiCard>
      </UiBox>

      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
        <UiBox {...{"className":"flex flex-wrap items-center justify-between gap-3 mb-3"}}>
          <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-1"}}><Building2 size={14} />Cuentas</UiHeading>
          <UiBox {...{"className":"flex items-center gap-2"}}>
            <UiSelect value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
              {...{"size":"2","color":"gray"}}>
              <option value="all">Todas</option><option value="banco">Banco</option><option value="caja">Caja</option><option value="ahorros">Ahorros</option><option value="inversion">Inversión</option>
            </UiSelect>
            <UiButton onClick={() => { setEditingCuenta(null); setShowFormCuenta(true); }}
              {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1"}}><Plus size={14} />Nueva Cuenta</UiButton>
          </UiBox>
        </UiBox>

        {cuentas.length === 0 ? (
          <UiBox {...{"className":"text-center py-8"}}>
            <Building2 size={40} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-3"}} />
            <UiText as="p" {...{"color":"gray"}}>No hay cuentas registradas</UiText>
          </UiBox>
        ) : (
          <UiBox {...{"className":"space-y-2"}}>
            {cuentas.map(cuenta => (
              <UiBox key={cuenta.id}
                {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between p-3 cursor-pointer"}, {}, (cuentaActiva?.id === cuenta.id ? {"style":{"backgroundColor":"var(--blue-3)"}} : {}))}
                onClick={() => setCuentaActiva(cuenta)}>
                <UiBox {...{"className":"flex items-center gap-3"}}>
                  <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-1.5"}, {}, (cuenta.tipo === 'caja' ? {"style":{"backgroundColor":"var(--amber-3)"}} : {"style":{"backgroundColor":"var(--blue-3)"}}))}>
                    {cuenta.tipo === 'caja' ? <Wallet size={16} {...{"style":{"color":"var(--amber-11)"}}} /> : <Building2 size={16} {...{"style":{"color":"var(--blue-11)"}}} />}
                  </UiBox>
                  <UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{cuenta.nombre}</UiBox>
                    <UiBox {...{"className":"flex items-center gap-2 mt-0.5"}}>
                      <UiText {...mergeThemeProps({"size":"1","weight":"medium","className":"inline-flex px-1.5 py-0.5"}, {}, resolveThemeProps(TIPO_BADGES[cuenta.tipo]))}>{TIPO_LABELS[cuenta.tipo]}</UiText>
                      <UiText {...mergeThemeProps({"size":"1"}, {}, (cuenta.estado === 'activo' ? {"color":"green"} : {"color":"gray"}))}>{cuenta.estado}</UiText>
                    </UiBox>
                  </UiBox>
                </UiBox>
                <UiBox {...{"className":"flex items-center gap-3"}}>
                  <UiBox {...{"className":"text-right"}}>
                    <UiBox {...mergeThemeProps({}, {}, ((cuenta.saldoActual || 0) >= 0 ? {"style":{"color":"var(--green-12)"}} : {"style":{"color":"var(--red-12)"}}))}>{formatCurrency(cuenta.saldoActual)}</UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Saldo inicial: {formatCurrency(cuenta.saldoInicial)}</UiBox>
                  </UiBox>
                  <UiBox {...{"className":"flex gap-1"}} onClick={e => e.stopPropagation()}>
                    <UiButton iconOnly onClick={() => { setEditingCuenta(cuenta); setShowFormCuenta(true); }} {...{"variant":"surface","color":"gray","className":"w-7"}}><Filter size={13} /></UiButton>
                    <UiButton iconOnly onClick={() => handleEliminarCuenta(cuenta.id)} {...{"variant":"surface","color":"gray","className":"w-7"}}><Trash2 size={13} /></UiButton>
                  </UiBox>
                </UiBox>
              </UiBox>
            ))}
          </UiBox>
        )}
      </UiCard>

      {cuentaActiva && (
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"overflow-hidden"}}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex flex-wrap items-center justify-between gap-3 p-4"}}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Movimientos — {cuentaActiva.nombre}</UiHeading>
            <UiBox {...{"className":"flex items-center gap-2 flex-wrap"}}>
              <UiSelect value={filtros.movTipo} onChange={e => setFiltros(f => ({ ...f, movTipo: e.target.value }))}
                {...{"size":"2","color":"gray"}}>
                <option value="all">Todos</option><option value="credito">Créditos</option><option value="debito">Débitos</option>
              </UiSelect>
              <UiSelect value={filtros.movConciliado} onChange={e => setFiltros(f => ({ ...f, movConciliado: e.target.value }))}
                {...{"size":"2","color":"gray"}}>
                <option value="all">Todos</option><option value="true">Conciliados</option><option value="false">Pendientes</option>
              </UiSelect>
              <UiInput type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
                {...{"size":"2","color":"gray"}} />
              <UiInput type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
                {...{"size":"2","color":"gray"}} />
              <UiButton onClick={handleExportCSV} {...{"size":"2","color":"gray","variant":"outline","className":"flex items-center gap-1"}}><Download size={12} />CSV</UiButton>
              <UiButton onClick={handleConciliacionAutomatica} disabled={loadingConciliacion}
                {...{"size":"2","variant":"solid","color":"purple","className":"disabled:opacity-50 flex items-center gap-1"}}>
                {loadingConciliacion ? <UiText {...{"className":"animate-spin"}}>⚙</UiText> : <Sparkles size={12} />}
                {loadingConciliacion ? 'Analizando...' : 'Conciliación Auto'}
              </UiButton>
              <UiButton onClick={() => setShowFormMov(true)}
                {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1"}}><Plus size={12} />Nuevo Movimiento</UiButton>
            </UiBox>
          </UiBox>

          {movimientos.length === 0 ? (
            <UiBox {...{"className":"text-center py-12"}}>
              <ArrowDownLeft size={40} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto mb-3"}} />
              <UiText as="p" {...{"color":"gray"}}>No hay movimientos registrados</UiText>
            </UiBox>
          ) : (
            <UiBox {...{"className":"overflow-x-auto"}}>
              <UiTable {...{"className":"w-full"}}>
                <UiTableHeader>
                  <UiTableRow {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Fecha</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-center"}}>Tipo</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Descripción</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left hidden sm:table-cell"}}>Referencia</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Monto</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-center"}}>Conciliado</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Acciones</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody>
                  {movimientos.map(mov => (
                    <UiTableRow key={mov.id}>
                      <UiTableCell style={{ color: "var(--gray-12)" }} className="px-3 py-2.5 whitespace-nowrap">{formatDate(mov.fecha)}</UiTableCell>
                      <UiTableCell className="px-3 py-2.5 text-center">
                        <Badge variant="soft" color={mov.tipo === 'credito' ? 'green' : 'red'} size="1">
                          {mov.tipo === 'credito' ? <><ArrowDownLeft size={10} className="mr-1 inline" />Crédito</> : <><ArrowUpRight size={10} className="mr-1 inline" />Débito</>}
                        </Badge>
                      </UiTableCell>
                      <UiTableCell style={{ color: "var(--gray-12)" }} className="px-3 py-2.5">{mov.descripcion || '-'}</UiTableCell>
                      <UiTableCell style={{ color: "var(--gray-11)" }} className="px-3 py-2.5 hidden sm:table-cell">{mov.referencia || '-'}</UiTableCell>
                      <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: mov.tipo === 'credito' ? "var(--green-11)" : "var(--red-11)" }} className="px-3 py-2.5 text-right font-medium">
                        {mov.tipo === 'credito' ? '+' : '-'}{formatCurrency(mov.monto)}
                      </UiTableCell>
                      <UiTableCell className="px-3 py-2.5 text-center">
                        <Badge variant="soft" color={mov.conciliado ? 'green' : 'gray'} size="1">
                          {mov.conciliado ? <><Link2 size={10} className="mr-1 inline" />Sí</> : <><Link2Off size={10} className="mr-1 inline" />No</>}
                        </Badge>
                      </UiTableCell>
                      <UiTableCell className="px-3 py-2.5">
                        <UiBox className="flex justify-end gap-1">
                          {!mov.conciliado && (
                            <UiButton iconOnly variant="soft" color="blue" size="1" onClick={() => handleConciliar(mov.id)} title="Conciliar"><Link2 size={13} /></UiButton>
                          )}
                          {mov.conciliado && (
                            <UiButton iconOnly variant="soft" color="gray" size="1" onClick={() => handleDesconciliar(mov.id)} title="Desconciliar"><Link2Off size={13} /></UiButton>
                          )}
                          <UiButton iconOnly variant="soft" color="red" size="1" onClick={() => handleEliminarMov(mov.id)} title="Eliminar"><Trash2 size={13} /></UiButton>
                        </UiBox>
                      </UiTableCell>
                    </UiTableRow>
                  ))}
                </UiTableBody>
              </UiTable>
            </UiBox>
          )}
        </UiBox>
      )}

      {/* Panel de Sugerencias de Conciliación Automática */}
      {sugerenciasConciliacion && sugerenciasConciliacion.detalle.length > 0 && (
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"className":"flex items-center justify-between mb-3"}}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-1"}}>
              <Sparkles size={14} {...{"style":{"color":"var(--purple-11)"}}} />
              Sugerencias de Conciliación Automática ({sugerenciasConciliacion.detalle.length})
            </UiHeading>
            <UiButton iconOnly onClick={() => setSugerenciasConciliacion(null)} {...{"variant":"surface","color":"gray","className":"w-6"}}>
              <X size={14} />
            </UiButton>
          </UiBox>

          <UiBox {...{"className":"space-y-2 max-h-96 overflow-y-auto custom-scrollbar"}}>
            {sugerenciasConciliacion.detalle.map((sug, idx) => {
              const badge = getConfianzaBadge(sug.confianza);
              return (
                <UiBox key={idx} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-3"}, {}, resolveThemeProps(getConfianzaColor(sug.confianza)))}>
                  <UiBox {...{"className":"flex items-start justify-between gap-3"}}>
                    <UiBox {...{"className":"flex-1 min-w-0"}}>
                      <UiBox {...{"className":"flex items-center gap-2 mb-1"}}>
                        <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"inline-flex px-2 py-0.5"}, {}, resolveThemeProps(badge.color))}>
                          {badge.label} ({sug.confianza}%)
                        </UiText>
                        <UiText {...{"size":"1","color":"gray"}}>
                          {formatDate(sug.movimientoBancario.fecha)} — {formatCurrency(sug.movimientoBancario.monto)}
                        </UiText>
                      </UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"mb-1 truncate"}}>
                        <strong>Banco:</strong> {sug.movimientoBancario.descripcion || 'Sin descripción'}
                      </UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"truncate"}}>
                        <strong>Financiero:</strong> {sug.movimientoFinanciero.documento?.numero || 'Sin número'} — {sug.movimientoFinanciero.tercero?.nombre || 'Sin tercero'}
                      </UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-1"}}>
                        Coincidencia: {sug.razon}
                      </UiBox>
                    </UiBox>
                    <UiBox {...{"className":"flex items-center gap-1 shrink-0"}}>
                      <UiButton iconOnly onClick={() => handleAplicarSugerencia(sug.movimientoBancario.id, sug.movimientoFinanciero.id)}
                        {...{"variant":"surface","color":"gray","className":"w-7"}} title="Aplicar conciliación">
                        <CheckCircle size={14} />
                      </UiButton>
                    </UiBox>
                  </UiBox>
                </UiBox>
              );
            })}
          </UiBox>
        </UiCard>
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
    </UiBox>
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
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={onClose}>
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-md"}} onClick={e => e.stopPropagation()}>
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-3"}}>
          <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>{cuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}</UiHeading>
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
        </UiBox>
        <form onSubmit={handleSubmit} {...{"className":"p-5 space-y-3"}}>
          <UiBox>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Nombre</UiLabel>
            <UiInput type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Banco Pichincha - Cuenta Corriente" required
              {...{"size":"2","color":"gray","className":"w-full"}} />
          </UiBox>
          <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Tipo</UiLabel>
              <UiSelect value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                {...{"size":"2","color":"gray","className":"w-full"}}>
                <option value="banco">Banco</option><option value="caja">Caja</option><option value="ahorros">Ahorros</option><option value="inversion">Inversión</option>
              </UiSelect>
            </UiBox>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Saldo Inicial</UiLabel>
              <UiInput type="number" step="0.01" value={form.saldoInicial} onChange={e => setForm(f => ({ ...f, saldoInicial: Number(e.target.value) }))}
                {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
          </UiBox>
          <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Moneda</UiLabel>
              <UiSelect value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                {...{"size":"2","color":"gray","className":"w-full"}}>
                <option value="USD">USD</option>
              </UiSelect>
            </UiBox>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Estado</UiLabel>
              <UiSelect value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                {...{"size":"2","color":"gray","className":"w-full"}}>
                <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
              </UiSelect>
            </UiBox>
          </UiBox>
          <UiBox {...{"className":"flex justify-end gap-2 pt-2"}}>
            <UiButton type="button" onClick={onClose} {...{"size":"2","color":"gray","variant":"outline"}}>Cancelar</UiButton>
            <UiButton type="submit" {...{"size":"2","variant":"solid","color":"blue"}}>{cuenta ? 'Actualizar' : 'Crear'}</UiButton>
          </UiBox>
        </form>
      </UiCard>
    </UiBox>
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
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={onClose}>
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-md"}} onClick={e => e.stopPropagation()}>
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-3"}}>
          <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>Nuevo Movimiento — {cuenta.nombre}</UiHeading>
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
        </UiBox>
        <form onSubmit={handleSubmit} {...{"className":"p-5 space-y-3"}}>
          <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Tipo</UiLabel>
              <UiSelect value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                {...{"size":"2","color":"gray","className":"w-full"}}>
                <option value="credito">Crédito (Ingreso)</option><option value="debito">Débito (Egreso)</option>
              </UiSelect>
            </UiBox>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Monto</UiLabel>
              <UiInput type="number" step="0.01" min="0.01" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder="0.00" required
                {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
          </UiBox>
          <UiBox>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Descripción</UiLabel>
            <UiInput type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Transferencia, depósito, cheque..."
              {...{"size":"2","color":"gray","className":"w-full"}} />
          </UiBox>
          <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Fecha</UiLabel>
              <UiInput type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Referencia</UiLabel>
              <UiInput type="text" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                placeholder="N° cheque, N° transferencia..."
                {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
          </UiBox>
          <UiBox {...{"className":"flex justify-end gap-2 pt-2"}}>
            <UiButton type="button" onClick={onClose} {...{"size":"2","color":"gray","variant":"outline"}}>Cancelar</UiButton>
            <UiButton type="submit" {...{"size":"2","variant":"solid","color":"blue"}}>Registrar</UiButton>
          </UiBox>
        </form>
      </UiCard>
    </UiBox>
  );
}
