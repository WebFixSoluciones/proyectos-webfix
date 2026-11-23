import { resolveThemeProps } from '../ui/themeProps';
import { createThemedPortal } from '../ui/themePortal';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiSelect, UiInput, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useEffect, useCallback } from 'react';
import { Download, Plus, Building2, Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Link2, Link2Off, Trash2, X, Edit2, Sparkles, CheckCircle, RotateCcw, Ban, AlertTriangle } from 'lucide-react';
import { getCuentas, crearCuenta, actualizarCuenta, eliminarCuenta, desactivarCuenta, reactivarCuenta, getMovimientosBancarios, registrarMovimientoBancario, transferirEntreCuentas, anularMovimientoBancario, eliminarMovimientoBancario, conciliarMovimiento, desconciliarMovimiento, getResumenBancos, conciliacionAutomatica } from '../../services/bancosService';
import { getMovimientos } from '../../services/movimientoService';
import FinancialPageHeader from './FinancialPageHeader';
import { Badge } from '../ui/badge';

const TIPO_BADGES = {
  banco: {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-11)"}},
  caja: {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}},
  ahorros: {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}},
  inversion: {"style":{"backgroundColor":"var(--purple-3)","color":"var(--purple-11)"}},
};

const TIPO_LABELS = { banco: 'Corriente', caja: 'Caja', ahorros: 'Ahorros', inversion: 'Inversión' };

const ORIGEN_BADGES = {
  pos: { label: 'Venta POS', color: 'green' },
  ventas: { label: 'Factura / Venta', color: 'green' },
  abono_cxc: { label: 'Cobro CxC', color: 'teal' },
  compras: { label: 'Compra', color: 'amber' },
  abono_cxp: { label: 'Pago CxP', color: 'amber' },
  transferencia: { label: 'Transferencia', color: 'purple' },
  bancos: { label: 'Banco + Finanzas', color: 'blue' },
  manual: { label: 'Manual', color: 'gray' },
};

export default function BancosCajaView({ db, usuario, showToast }) {
  const [cuentas, setCuentas] = useState([]);
  const [cuentaActiva, setCuentaActiva] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ tipo: 'all', fechaDesde: '', fechaHasta: '', movTipo: 'all', movConciliado: 'all' });
  const [showFormCuenta, setShowFormCuenta] = useState(false);
  const [showFormMov, setShowFormMov] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState(null);
  const [conciliarModal, setConciliarModal] = useState(null);
  const [movActionModal, setMovActionModal] = useState(null);
  const [deleteCuentaModal, setDeleteCuentaModal] = useState(null);
  const [movsFinDisponibles, setMovsFinDisponibles] = useState([]);
  const [sugerenciasConciliacion, setSugerenciasConciliacion] = useState(null);
  const [loadingConciliacion, setLoadingConciliacion] = useState(false);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const cargarCuentas = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getCuentas(db, { tipo: filtros.tipo });
      setCuentas(data);
      setCuentaActiva(prev => {
        if (prev) return data.find(c => c.id === prev.id) || data[0] || null;
        return data.find(c => c.estado === 'activo') || data[0] || null;
      });
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [db, filtros.tipo]);

  const cuentaActivaId = cuentaActiva?.id || null;
  const cargarMovimientos = useCallback(async () => {
    if (!cuentaActivaId) return;
    try {
      const data = await getMovimientosBancarios(db, cuentaActivaId, { tipo: filtros.movTipo, fechaDesde: filtros.fechaDesde, fechaHasta: filtros.fechaHasta, conciliado: filtros.movConciliado });
      setMovimientos(data);
    } catch (e) { showToast?.('Error cargando movimientos: ' + e.message, 'error'); }
  }, [db, cuentaActivaId, filtros.movTipo, filtros.fechaDesde, filtros.fechaHasta, filtros.movConciliado, showToast]);

  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  useEffect(() => {
    if (cuentaActivaId) cargarMovimientos();
  }, [cuentaActivaId, cargarMovimientos]);

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

  const handleOpenDeleteCuenta = async (cuenta) => {
    try {
      const movsCuenta = await getMovimientosBancarios(db, cuenta.id, {});
      const activos = movsCuenta.filter(m => m.estado !== 'anulado');
      setDeleteCuentaModal({
        cuenta,
        totalMovs: movsCuenta.length,
        activosCount: activos.length,
        saving: false,
      });
    } catch (e) {
      showToast('Error al verificar la cuenta: ' + e.message, 'error');
    }
  };

  const handleReactivarCuenta = async (cuenta) => {
    try {
      await reactivarCuenta(db, cuenta.id, usuario);
      showToast(`Cuenta "${cuenta.nombre}" reactivada`, 'success');
      await cargarCuentas();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const handleConfirmDeleteCuenta = async (modo) => {
    if (!deleteCuentaModal?.cuenta) return;
    const { cuenta } = deleteCuentaModal;
    setDeleteCuentaModal(prev => ({ ...prev, saving: true }));
    try {
      if (modo === 'desactivar') {
        await desactivarCuenta(db, cuenta.id, usuario);
        showToast(`Cuenta "${cuenta.nombre}" marcada como inactiva`, 'info');
      } else if (modo === 'eliminar_con_anulacion') {
        await eliminarCuenta(db, cuenta.id, usuario, { anularMovimientos: true });
        showToast(`Cuenta "${cuenta.nombre}" y sus registros bancarios eliminados`, 'success');
        if (cuentaActiva?.id === cuenta.id) {
          setCuentaActiva(null);
          setMovimientos([]);
        }
      } else {
        await eliminarCuenta(db, cuenta.id, usuario, { anularMovimientos: false });
        showToast(`Cuenta "${cuenta.nombre}" eliminada definitivamente`, 'success');
        if (cuentaActiva?.id === cuenta.id) {
          setCuentaActiva(null);
          setMovimientos([]);
        }
      }
      setDeleteCuentaModal(null);
      await cargarCuentas();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
      setDeleteCuentaModal(prev => (prev ? { ...prev, saving: false } : null));
    }
  };

  const handleRegistrarMov = async (data) => {
    try {
      await registrarMovimientoBancario(db, { ...data, cuentaId: cuentaActiva.id }, usuario);
      showToast('Movimiento registrado', 'success');
      setShowFormMov(false);
      cargarCuentas(); cargarMovimientos();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleOpenMovAction = (mov) => {
    setMovActionModal({ mov, motivo: '', saving: false });
  };

  const handleAnularMov = async () => {
    if (!movActionModal?.mov) return;
    setMovActionModal(prev => ({ ...prev, saving: true }));
    try {
      await anularMovimientoBancario(db, movActionModal.mov.id, movActionModal.motivo, usuario);
      showToast('Movimiento bancario anulado. Saldo actualizado.', 'success');
      setMovActionModal(null);
      await cargarCuentas();
      await cargarMovimientos();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
      setMovActionModal(prev => (prev ? { ...prev, saving: false } : null));
    }
  };

  const handleEliminarMovDefinitivo = async () => {
    if (!movActionModal?.mov) return;
    setMovActionModal(prev => ({ ...prev, saving: true }));
    try {
      await eliminarMovimientoBancario(db, movActionModal.mov.id, usuario);
      showToast('Movimiento eliminado definitivamente', 'success');
      setMovActionModal(null);
      await cargarCuentas();
      await cargarMovimientos();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
      setMovActionModal(prev => (prev ? { ...prev, saving: false } : null));
    }
  };

  const handleConciliar = async (mov) => {
    setConciliarModal({ mov, movId: mov.id, movFinId: '', saving: false });
    try {
      const tipoEsperado = mov.tipo === 'credito' ? 'ingreso' : 'egreso';
      const allMovs = await getMovimientos(db, { tipo: tipoEsperado });
      const compatibles = allMovs.filter(m => m.estado !== 'anulado' && !m.conciliacionBancariaId);
      setMovsFinDisponibles(compatibles);
    } catch {
      setMovsFinDisponibles([]);
    }
  };

  const handleTransferir = async (transferData) => {
    try {
      await transferirEntreCuentas(db, transferData, usuario);
      showToast('Transferencia entre cuentas registrada con éxito', 'success');
      setShowTransferModal(false);
      await cargarCuentas();
      await cargarMovimientos();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const handleConfirmConciliar = async (e) => {
    e.preventDefault();
    if (!conciliarModal?.movId) return;
    setConciliarModal(prev => ({ ...prev, saving: true }));
    try {
      await conciliarMovimiento(db, conciliarModal.movId, conciliarModal.movFinId.trim() || null, usuario);
      showToast('Movimiento conciliado', 'success');
      setConciliarModal(null);
      cargarMovimientos();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      setConciliarModal(prev => (prev ? { ...prev, saving: false } : null));
    }
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
      <FinancialPageHeader
        icon={Building2}
        title="Bancos y Caja"
        description="Gestión de cuentas corrientes, ahorros, caja chica y conciliación bancaria"
        badge={`${cuentas.length} cuentas`}
        badgeColor="blue"
        actions={
          <UiBox className="flex flex-wrap items-center gap-2">
            <UiButton onClick={() => { setEditingCuenta(null); setShowFormCuenta(true); }} {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1.5"}}>
              <Plus size={14} /> Nueva Cuenta
            </UiButton>
            {cuentas.filter(c => c.estado === 'activo').length >= 2 && (
              <UiButton onClick={() => setShowTransferModal(true)} variant="soft" color="green" size="2" className="flex items-center gap-1.5">
                <ArrowLeftRight size={14} /> Transferir Caja ↔ Banco
              </UiButton>
            )}
            <UiButton onClick={handleConciliacionAutomatica} disabled={!cuentaActiva || loadingConciliacion} {...{"variant":"surface","color":"blue","size":"2","className":"flex items-center gap-1.5"}}>
              <Sparkles size={14} /> Conciliación Inteligente
            </UiButton>
          </UiBox>
        }
      />
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
                  <UiBox {...{"className":"flex gap-1 items-center"}} onClick={e => e.stopPropagation()}>
                    {cuenta.estado === 'inactivo' && (
                      <UiButton size="1" variant="soft" color="green" title="Reactivar cuenta" onClick={() => handleReactivarCuenta(cuenta)} className="flex items-center gap-1">
                        <RotateCcw size={12} /> Reactivar
                      </UiButton>
                    )}
                    <UiButton iconOnly title="Editar cuenta" onClick={() => { setEditingCuenta(cuenta); setShowFormCuenta(true); }} {...{"variant":"surface","color":"gray","className":"w-7"}}><Edit2 size={13} /></UiButton>
                    <UiButton iconOnly title="Eliminar o desactivar cuenta" onClick={() => handleOpenDeleteCuenta(cuenta)} {...{"variant":"surface","color":"red","className":"w-7"}}><Trash2 size={13} /></UiButton>
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
            <UiBox>
              <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>
                Movimientos — {cuentaActiva.nombre}
                {cuentaActiva.banco ? ` (${cuentaActiva.banco}${cuentaActiva.numeroCuenta ? ` · ${cuentaActiva.numeroCuenta}` : ''})` : ''}
              </UiHeading>
              <UiBox className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                <UiText color="gray">Inicial: <strong>{formatCurrency(cuentaActiva.saldoInicial)}</strong></UiText>
                <UiText color="green">
                  Ingresos: <strong>+{formatCurrency(movimientos.filter(m => m.estado !== 'anulado' && m.tipo === 'credito').reduce((s, m) => s + (Number(m.monto) || 0), 0))}</strong>
                </UiText>
                <UiText color="red">
                  Egresos: <strong>-{formatCurrency(movimientos.filter(m => m.estado !== 'anulado' && m.tipo === 'debito').reduce((s, m) => s + (Number(m.monto) || 0), 0))}</strong>
                </UiText>
                <UiText color="blue">Saldo actual: <strong>{formatCurrency(cuentaActiva.saldoActual)}</strong></UiText>
              </UiBox>
            </UiBox>
            <UiBox {...{"className":"flex items-center gap-2 flex-wrap"}}>
              <UiSelect value={filtros.movTipo} onChange={e => setFiltros(f => ({ ...f, movTipo: e.target.value }))}
                {...{"size":"2","color":"gray"}}>
                <option value="all">Todos</option><option value="credito">Créditos</option><option value="debito">Débitos</option>
              </UiSelect>
              <UiSelect value={filtros.movConciliado} onChange={e => setFiltros(f => ({ ...f, movConciliado: e.target.value }))}
                {...{"size":"2","color":"gray"}}>
                <option value="all">Todos</option><option value="true">Conciliados</option><option value="false">Pendientes</option>
              </UiSelect>
              <UiBox className="w-36">
                <UiInput type="date" value={filtros.fechaDesde} onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
                  {...{"size":"2","color":"gray"}} />
              </UiBox>
              <UiBox className="w-36">
                <UiInput type="date" value={filtros.fechaHasta} onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
                  {...{"size":"2","color":"gray"}} />
              </UiBox>
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
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left hidden md:table-cell"}}>Origen</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left"}}>Descripción</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-left hidden sm:table-cell"}}>Referencia</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Monto</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-center"}}>Conciliado</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-11)"},"className":"px-3 py-2.5 text-right"}}>Acciones</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody>
                  {movimientos.map(mov => {
                    const isAnulado = mov.estado === 'anulado';
                    const origenInfo = ORIGEN_BADGES[mov.origen] || (mov.pagoId ? ORIGEN_BADGES.abono_cxc : (mov.origenId ? ORIGEN_BADGES.ventas : ORIGEN_BADGES.manual));
                    return (
                    <UiTableRow key={mov.id} className={isAnulado ? 'opacity-60' : ''}>
                      <UiTableCell style={{ color: "var(--gray-12)" }} className="px-3 py-2.5 whitespace-nowrap">{formatDate(mov.fecha)}</UiTableCell>
                      <UiTableCell className="px-3 py-2.5 text-center">
                        {isAnulado ? (
                          <Badge variant="soft" color="gray" size="1">Anulado</Badge>
                        ) : (
                          <Badge variant="soft" color={mov.tipo === 'credito' ? 'green' : 'red'} size="1">
                            {mov.tipo === 'credito' ? <><ArrowDownLeft size={10} className="mr-1 inline" />Ingreso</> : <><ArrowUpRight size={10} className="mr-1 inline" />Egreso</>}
                          </Badge>
                        )}
                      </UiTableCell>
                      <UiTableCell className="px-3 py-2.5 hidden md:table-cell">
                        <Badge variant="soft" color={origenInfo.color} size="1">{origenInfo.label}</Badge>
                      </UiTableCell>
                      <UiTableCell style={{ color: "var(--gray-12)" }} className={`px-3 py-2.5 ${isAnulado ? 'line-through' : ''}`}>{mov.descripcion || '-'}</UiTableCell>
                      <UiTableCell style={{ color: "var(--gray-11)" }} className="px-3 py-2.5 hidden sm:table-cell">{mov.referencia || '-'}</UiTableCell>
                      <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: isAnulado ? "var(--gray-10)" : (mov.tipo === 'credito' ? "var(--green-11)" : "var(--red-11)") }} className={`px-3 py-2.5 text-right font-medium ${isAnulado ? 'line-through' : ''}`}>
                        {mov.tipo === 'credito' ? '+' : '-'}{formatCurrency(mov.monto)}
                      </UiTableCell>
                      <UiTableCell className="px-3 py-2.5 text-center">
                        <Badge variant="soft" color={mov.conciliado ? 'green' : 'gray'} size="1">
                          {mov.conciliado ? <><Link2 size={10} className="mr-1 inline" />Sí</> : <><Link2Off size={10} className="mr-1 inline" />No</>}
                        </Badge>
                      </UiTableCell>
                      <UiTableCell className="px-3 py-2.5">
                        <UiBox className="flex justify-end gap-1">
                          {!isAnulado && !mov.conciliado && (
                            <UiButton iconOnly variant="soft" color="blue" size="1" onClick={() => handleConciliar(mov)} title="Conciliar con movimiento financiero"><Link2 size={13} /></UiButton>
                          )}
                          {!isAnulado && mov.conciliado && !mov.pagoId && mov.origen !== 'transferencia' && (
                            <UiButton iconOnly variant="soft" color="gray" size="1" onClick={() => handleDesconciliar(mov.id)} title="Desconciliar"><Link2Off size={13} /></UiButton>
                          )}
                          <UiButton
                            iconOnly
                            variant="soft"
                            color="red"
                            size="1"
                            onClick={() => handleOpenMovAction(mov)}
                            title={isAnulado ? 'Eliminar registro anulado' : 'Anular o eliminar movimiento'}
                          >
                            {isAnulado ? <Trash2 size={13} /> : <Ban size={13} />}
                          </UiButton>
                        </UiBox>
                      </UiTableCell>
                    </UiTableRow>
                    );
                  })}
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
              const best = (Array.isArray(sug.matches) && sug.matches[0]) || sug;
              const movFin = best?.movimientoFinanciero;
              if (!movFin || !sug.movimientoBancario) return null;
              const confianza = best.confianza ?? sug.confianza ?? 0;
              const razon = best.razon ?? sug.razon ?? 'Coincidencia automática';
              const badge = getConfianzaBadge(confianza);
              return (
                <UiBox key={idx} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-3"}, {}, resolveThemeProps(getConfianzaColor(confianza)))}>
                  <UiBox {...{"className":"flex items-start justify-between gap-3"}}>
                    <UiBox {...{"className":"flex-1 min-w-0"}}>
                      <UiBox {...{"className":"flex items-center gap-2 mb-1"}}>
                        <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"inline-flex px-2 py-0.5"}, {}, resolveThemeProps(badge.color))}>
                          {badge.label} ({confianza}%)
                        </UiText>
                        <UiText {...{"size":"1","color":"gray"}}>
                          {formatDate(sug.movimientoBancario.fecha)} — {formatCurrency(sug.movimientoBancario.monto)}
                        </UiText>
                      </UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"mb-1 truncate"}}>
                        <strong>Banco:</strong> {sug.movimientoBancario.descripcion || 'Sin descripción'}
                      </UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"truncate"}}>
                        <strong>Financiero:</strong> {movFin.documento?.numero || 'Sin número'} — {movFin.tercero?.nombre || 'Sin tercero'}
                      </UiBox>
                      <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-1"}}>
                        Coincidencia: {razon}
                      </UiBox>
                    </UiBox>
                    <UiBox {...{"className":"flex items-center gap-1 shrink-0"}}>
                      <UiButton iconOnly onClick={() => handleAplicarSugerencia(sug.movimientoBancario.id, movFin.id)}
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

      {showTransferModal && (
        <FormTransferenciaModal
          cuentas={cuentas.filter(c => c.estado === 'activo')}
          defaultOrigenId={cuentaActiva?.id || ''}
          onSave={handleTransferir}
          onClose={() => setShowTransferModal(false)}
        />
      )}

      {conciliarModal && (
        <UiBox style={{ backgroundColor: 'var(--black-a7)' }} className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setConciliarModal(null)}>
          <UiCard style={{ backgroundColor: 'var(--color-panel-solid)' }} className="w-full max-w-md max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)' }} className="flex items-center justify-between px-5 py-3">
              <UiHeading as="h3" color="gray" weight="bold" highContrast>Conciliar Movimiento Bancario</UiHeading>
              <UiButton iconOnly onClick={() => setConciliarModal(null)} variant="surface" color="gray"><X size={16} /></UiButton>
            </UiBox>
            <form onSubmit={handleConfirmConciliar} className="p-5 space-y-4">
              {conciliarModal.mov && (
                <UiBox style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-3)' }} className="p-3 text-xs space-y-1">
                  <UiBox className="flex justify-between">
                    <UiText color="gray">Movimiento bancario:</UiText>
                    <UiText weight="bold" color={conciliarModal.mov.tipo === 'credito' ? 'green' : 'red'}>
                      {conciliarModal.mov.tipo === 'credito' ? '+' : '-'}{formatCurrency(conciliarModal.mov.monto)}
                    </UiText>
                  </UiBox>
                  <UiText color="gray" className="block truncate">{conciliarModal.mov.descripcion || 'Sin descripción'}</UiText>
                </UiBox>
              )}
              <UiBox>
                <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">
                  Seleccionar {conciliarModal.mov?.tipo === 'credito' ? 'Ingreso' : 'Egreso'} financiero a vincular
                </UiLabel>
                <UiSelect
                  value={conciliarModal.movFinId}
                  onChange={e => setConciliarModal(prev => ({ ...prev, movFinId: e.target.value }))}
                  size="2"
                  color="gray"
                  className="w-full"
                >
                  <option value="">-- Seleccionar movimiento ({movsFinDisponibles.length} disponibles) --</option>
                  {movsFinDisponibles.map(mf => {
                    const exacto = conciliarModal.mov && Math.abs((Number(mf.monto) || 0) - (Number(conciliarModal.mov.monto) || 0)) < 0.02;
                    return (
                      <option key={mf.id} value={mf.id}>
                        {exacto ? '★ ' : ''}{formatDate(mf.fecha)} · {formatCurrency(mf.monto)} · {mf.tercero?.nombre || 'Tercero'} {mf.documento?.numero ? `(#${mf.documento.numero})` : ''}
                      </option>
                    );
                  })}
                </UiSelect>
                <UiText size="1" color="gray" className="mt-1 block">
                  Los marcados con ★ coinciden exactamente con el monto de este movimiento.
                </UiText>
              </UiBox>
              <UiBox className="flex justify-end gap-2">
                <UiButton type="button" onClick={() => setConciliarModal(null)} size="2" color="gray" variant="outline">Cancelar</UiButton>
                <UiButton type="submit" disabled={conciliarModal.saving || !conciliarModal.movFinId} size="2" variant="solid" color="blue">
                  {conciliarModal.saving ? 'Conciliando...' : 'Confirmar Conciliación'}
                </UiButton>
              </UiBox>
            </form>
          </UiCard>
        </UiBox>
      )}

      {/* MODAL GUIADO: ANULAR O ELIMINAR MOVIMIENTO BANCARIO */}
      {movActionModal && createThemedPortal(
        <UiBox className="erp-dialog-overlay fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4" onClick={() => setMovActionModal(null)}>
          <UiCard style={{ backgroundColor: 'var(--color-panel-solid)' }} className="w-full max-w-md max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)' }} className="flex items-center justify-between px-5 py-3">
              <UiHeading as="h3" color="gray" weight="bold" highContrast className="flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: 'var(--amber-11)' }} />
                {movActionModal.mov.estado === 'anulado' ? 'Eliminar Registro Anulado' : 'Anular o Eliminar Movimiento'}
              </UiHeading>
              <UiButton iconOnly onClick={() => setMovActionModal(null)} variant="surface" color="gray"><X size={16} /></UiButton>
            </UiBox>
            <UiBox className="p-5 space-y-4">
              <UiBox style={{ backgroundColor: 'var(--gray-2)', border: '1px solid var(--gray-a6)', borderRadius: 'var(--radius-3)' }} className="p-3 space-y-1 text-xs">
                <UiBox className="flex justify-between">
                  <UiText color="gray">Descripción:</UiText>
                  <UiText weight="bold" color="gray" highContrast>{movActionModal.mov.descripcion || 'Sin descripción'}</UiText>
                </UiBox>
                <UiBox className="flex justify-between">
                  <UiText color="gray">Monto:</UiText>
                  <UiText weight="bold" color={movActionModal.mov.tipo === 'credito' ? 'green' : 'red'}>
                    {movActionModal.mov.tipo === 'credito' ? '+' : '-'}{formatCurrency(movActionModal.mov.monto)}
                  </UiText>
                </UiBox>
                <UiBox className="flex justify-between">
                  <UiText color="gray">Fecha / Ref:</UiText>
                  <UiText color="gray">{formatDate(movActionModal.mov.fecha)} · {movActionModal.mov.referencia || '—'}</UiText>
                </UiBox>
              </UiBox>

              {movActionModal.mov.estado === 'anulado' ? (
                <UiBox className="space-y-3">
                  <UiText size="2" color="gray" className="block">
                    Este registro ya se encuentra <strong>anulado</strong> (no afecta el saldo). Puedes eliminarlo definitivamente del historial bancario.
                  </UiText>
                  <UiBox className="flex justify-end gap-2">
                    <UiButton type="button" onClick={() => setMovActionModal(null)} size="2" color="gray" variant="outline">Cancelar</UiButton>
                    <UiButton type="button" disabled={movActionModal.saving} onClick={handleEliminarMovDefinitivo} size="2" variant="solid" color="red">
                      {movActionModal.saving ? 'Eliminando...' : 'Eliminar Definitivamente'}
                    </UiButton>
                  </UiBox>
                </UiBox>
              ) : (() => {
                const m = movActionModal.mov;
                const vinculado = Boolean(m.conciliado || m.movimientoId || m.origenId || m.pagoId || m.transferenciaId);
                return (
                  <UiBox className="space-y-3">
                    <UiBox style={{ backgroundColor: 'var(--amber-3)', border: '1px solid var(--gray-a6)', borderRadius: 'var(--radius-3)' }} className="p-3 text-xs space-y-1.5">
                      <UiText weight="bold" color="amber" className="block">¿Cómo funciona la reversión bancaria?</UiText>
                      {vinculado ? (
                        <UiText color="gray" highContrast className="block">
                          Este movimiento proviene de un comprobante u operación del ERP. <strong>Anularlo aquí</strong> descuenta inmediatamente el monto del saldo bancario y libera la conciliación (sin borrar la factura fiscal; si deseas anular la venta completa, hazlo también en <em>Ventas → Historial de Ventas</em>).
                        </UiText>
                      ) : (
                        <UiText color="gray" highContrast className="block">
                          Este es un registro manual sin comprobante vinculado. Puedes <strong>Anularlo</strong> (conservando historial auditable en $0.00) o <strong>Eliminarlo definitivamente</strong>.
                        </UiText>
                      )}
                    </UiBox>
                    <UiBox>
                      <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">Motivo de anulación (opcional)</UiLabel>
                      <UiInput
                        type="text"
                        value={movActionModal.motivo}
                        onChange={e => setMovActionModal(prev => ({ ...prev, motivo: e.target.value }))}
                        placeholder="Ej: Factura de prueba PRU001 / Depósito mal asignado"
                        size="2"
                        color="gray"
                        className="w-full"
                      />
                    </UiBox>
                    <UiBox className="flex flex-wrap justify-end gap-2 pt-1">
                      <UiButton type="button" onClick={() => setMovActionModal(null)} size="2" color="gray" variant="outline">Cancelar</UiButton>
                      {!vinculado && (
                        <UiButton type="button" disabled={movActionModal.saving} onClick={handleEliminarMovDefinitivo} size="2" variant="soft" color="red">
                          Eliminar definitivamente
                        </UiButton>
                      )}
                      <UiButton type="button" disabled={movActionModal.saving} onClick={handleAnularMov} size="2" variant="solid" color="red">
                        {movActionModal.saving ? 'Anulando...' : 'Anular y Revertir Saldo'}
                      </UiButton>
                    </UiBox>
                  </UiBox>
                );
              })()}
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      {/* MODAL GUIADO: DESACTIVAR O ELIMINAR CUENTA BANCARIA */}
      {deleteCuentaModal && createThemedPortal(
        <UiBox className="erp-dialog-overlay fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4" onClick={() => setDeleteCuentaModal(null)}>
          <UiCard style={{ backgroundColor: 'var(--color-panel-solid)' }} className="w-full max-w-md max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)' }} className="flex items-center justify-between px-5 py-3">
              <UiHeading as="h3" color="gray" weight="bold" highContrast className="flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: 'var(--red-11)' }} />
                Gestionar Eliminación de Cuenta
              </UiHeading>
              <UiButton iconOnly onClick={() => setDeleteCuentaModal(null)} variant="surface" color="gray"><X size={16} /></UiButton>
            </UiBox>
            <UiBox className="p-5 space-y-4">
              <UiBox style={{ backgroundColor: 'var(--gray-2)', border: '1px solid var(--gray-a6)', borderRadius: 'var(--radius-3)' }} className="p-3 space-y-1 text-xs">
                <UiBox className="flex justify-between">
                  <UiText color="gray">Cuenta:</UiText>
                  <UiText weight="bold" color="gray" highContrast>{deleteCuentaModal.cuenta.nombre}</UiText>
                </UiBox>
                <UiBox className="flex justify-between">
                  <UiText color="gray">Estado actual:</UiText>
                  <UiText weight="bold" color={deleteCuentaModal.cuenta.estado === 'activo' ? 'green' : 'gray'}>{deleteCuentaModal.cuenta.estado}</UiText>
                </UiBox>
                <UiBox className="flex justify-between">
                  <UiText color="gray">Saldo actual:</UiText>
                  <UiText weight="bold">{formatCurrency(deleteCuentaModal.cuenta.saldoActual)}</UiText>
                </UiBox>
                <UiBox className="flex justify-between">
                  <UiText color="gray">Movimientos activos:</UiText>
                  <UiText weight="bold" color={deleteCuentaModal.activosCount > 0 ? 'amber' : 'green'}>{deleteCuentaModal.activosCount}</UiText>
                </UiBox>
              </UiBox>

              {deleteCuentaModal.activosCount > 0 ? (
                <UiBox style={{ backgroundColor: 'var(--amber-3)', border: '1px solid var(--gray-a6)', borderRadius: 'var(--radius-3)' }} className="p-3 text-xs space-y-1.5">
                  <UiText weight="bold" color="amber" className="block">
                    Esta cuenta todavía tiene {deleteCuentaModal.activosCount} movimiento(s) activo(s)
                  </UiText>
                  <UiText color="gray" highContrast className="block">
                    <strong>Opción A (Conservar historial):</strong> Déjala como <em>Inactiva</em> (no suma al saldo general ni aparece en ventas/compras).
                  </UiText>
                  <UiText color="gray" highContrast className="block">
                    <strong>Opción B (Eliminar definitivamente):</strong> Anula primero sus movimientos activos y borra la cuenta por completo de Bancos y Caja.
                  </UiText>
                </UiBox>
              ) : (
                <UiText size="2" color="gray" className="block">
                  Esta cuenta no tiene movimientos activos. Puedes eliminarla definitivamente ahora mismo sin afectar saldos.
                </UiText>
              )}

              <UiBox className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                <UiButton type="button" onClick={() => setDeleteCuentaModal(null)} size="2" color="gray" variant="outline">Cancelar</UiButton>
                {deleteCuentaModal.cuenta.estado === 'activo' && (
                  <UiButton
                    type="button"
                    disabled={deleteCuentaModal.saving}
                    onClick={() => handleConfirmDeleteCuenta('desactivar')}
                    size="2"
                    variant="soft"
                    color="amber"
                  >
                    Solo Desactivar
                  </UiButton>
                )}
                {deleteCuentaModal.activosCount > 0 ? (
                  <UiButton
                    type="button"
                    disabled={deleteCuentaModal.saving}
                    onClick={() => handleConfirmDeleteCuenta('eliminar_con_anulacion')}
                    size="2"
                    variant="solid"
                    color="red"
                  >
                    {deleteCuentaModal.saving ? 'Eliminando...' : 'Anular Movimientos y Eliminar'}
                  </UiButton>
                ) : (
                  <UiButton
                    type="button"
                    disabled={deleteCuentaModal.saving}
                    onClick={() => handleConfirmDeleteCuenta('eliminar')}
                    size="2"
                    variant="solid"
                    color="red"
                  >
                    {deleteCuentaModal.saving ? 'Eliminando...' : 'Eliminar Definitivamente'}
                  </UiButton>
                )}
              </UiBox>
            </UiBox>
          </UiCard>
        </UiBox>
      )}
    </UiBox>
  );
}

function FormCuentaModal({ cuenta, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: cuenta?.nombre || '',
    banco: cuenta?.banco || '',
    numeroCuenta: cuenta?.numeroCuenta || '',
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

  return createThemedPortal(
    <UiBox {...{"className":"erp-dialog-overlay fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4"}} onClick={onClose}>
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-md max-h-[90dvh] overflow-y-auto"}} onClick={e => e.stopPropagation()}>
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-3"}}>
          <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>{cuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}</UiHeading>
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
        </UiBox>
        <form onSubmit={handleSubmit} {...{"className":"p-5 space-y-3"}}>
          <UiBox>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Nombre de la Cuenta / Caja</UiLabel>
            <UiInput type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Banco Pichincha - Corriente o Caja General" required
              {...{"size":"2","color":"gray","className":"w-full"}} />
          </UiBox>
          <UiBox className="grid grid-cols-2 gap-3">
            <UiBox>
              <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">Entidad Bancaria (opc.)</UiLabel>
              <UiInput type="text" value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                placeholder="Pichincha, Produbanco..." size="2" color="gray" className="w-full" />
            </UiBox>
            <UiBox>
              <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">N° de Cuenta (opc.)</UiLabel>
              <UiInput type="text" value={form.numeroCuenta} onChange={e => setForm(f => ({ ...f, numeroCuenta: e.target.value }))}
                placeholder="2200123456" size="2" color="gray" className="w-full" />
            </UiBox>
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
  const [form, setForm] = useState({
    tipo: 'credito',
    monto: '',
    descripcion: '',
    terceroNombre: '',
    categoria: 'otros_ingresos',
    fecha: hoy,
    referencia: '',
    crearEnFinanzas: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.monto || Number(form.monto) <= 0) return;
    onSave(form);
  };

  return createThemedPortal(
    <UiBox {...{"className":"erp-dialog-overlay fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4"}} onClick={onClose}>
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-md max-h-[90dvh] overflow-y-auto"}} onClick={e => e.stopPropagation()}>
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-3"}}>
          <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>Nuevo Movimiento — {cuenta.nombre}</UiHeading>
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
        </UiBox>
        <form onSubmit={handleSubmit} {...{"className":"p-5 space-y-3"}}>
          <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Tipo</UiLabel>
              <UiSelect
                value={form.tipo}
                onChange={e => {
                  const tipo = e.target.value;
                  setForm(f => ({ ...f, tipo, categoria: tipo === 'credito' ? 'otros_ingresos' : 'gastos_administrativos' }));
                }}
                {...{"size":"2","color":"gray","className":"w-full"}}
              >
                <option value="credito">Crédito (Ingreso)</option><option value="debito">Débito (Egreso)</option>
              </UiSelect>
            </UiBox>
            <UiBox>
              <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Monto ($)</UiLabel>
              <UiInput type="number" step="0.01" min="0.01" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder="0.00" required
                {...{"size":"2","color":"gray","className":"w-full"}} />
            </UiBox>
          </UiBox>
          <UiBox>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"block mb-1"}}>Descripción</UiLabel>
            <UiInput type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Cobro directo, depósito, comisión bancaria..." required
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
          <UiBox style={{ border: '1px solid var(--gray-a6)', borderRadius: 'var(--radius-3)', backgroundColor: 'var(--gray-2)' }} className="p-3 space-y-2">
            <UiLabel size="2" color="gray" highContrast className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.crearEnFinanzas}
                onChange={e => setForm(f => ({ ...f, crearEnFinanzas: e.target.checked }))}
              />
              Registrar también en Ingresos / Egresos (Finanzas y Reportes)
            </UiLabel>
            <UiText size="1" color="gray" className="block">
              {form.crearEnFinanzas
                ? 'Se creará automáticamente el ingreso/egreso pagado y conciliado en Movimientos y Resumen Financiero.'
                : 'Solo afectará el saldo de esta cuenta bancaria (útil si ya existe una factura/compra para conciliar luego).'}
            </UiText>
            {form.crearEnFinanzas && (
              <UiBox className="grid grid-cols-2 gap-2 pt-1">
                <UiInput
                  type="text"
                  value={form.terceroNombre}
                  onChange={e => setForm(f => ({ ...f, terceroNombre: e.target.value }))}
                  placeholder={form.tipo === 'credito' ? 'Cliente / Origen' : 'Proveedor / Destino'}
                  size="2"
                  color="gray"
                  className="w-full"
                />
                <UiSelect
                  value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  size="2"
                  color="gray"
                  className="w-full"
                >
                  {form.tipo === 'credito' ? (
                    <>
                      <option value="otros_ingresos">Otros ingresos</option>
                      <option value="ventas">Ventas</option>
                      <option value="intereses">Intereses ganados</option>
                      <option value="aportes">Aporte de capital</option>
                    </>
                  ) : (
                    <>
                      <option value="gastos_administrativos">Gastos administrativos</option>
                      <option value="comisiones_bancarias">Comisiones bancarias</option>
                      <option value="servicios_basicos">Servicios básicos</option>
                      <option value="nomina">Nómina</option>
                      <option value="impuestos">Impuestos</option>
                      <option value="otro">Otro egreso</option>
                    </>
                  )}
                </UiSelect>
              </UiBox>
            )}
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

function FormTransferenciaModal({ cuentas, defaultOrigenId, onSave, onClose }) {
  const hoy = new Date().toISOString().split('T')[0];
  const initialOrigen = defaultOrigenId || cuentas[0]?.id || '';
  const initialDestino = cuentas.find(c => c.id !== initialOrigen)?.id || '';
  const [form, setForm] = useState({
    origenId: initialOrigen,
    destinoId: initialDestino,
    monto: '',
    fecha: hoy,
    descripcion: '',
    referencia: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.origenId || !form.destinoId || form.origenId === form.destinoId) return;
    if (!form.monto || Number(form.monto) <= 0) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <UiBox style={{ backgroundColor: 'var(--black-a7)' }} className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <UiCard style={{ backgroundColor: 'var(--color-panel-solid)' }} className="w-full max-w-md max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <UiBox style={{ borderBottom: '1px solid var(--gray-a6)' }} className="flex items-center justify-between px-5 py-3">
          <UiHeading as="h3" color="gray" weight="bold" highContrast className="flex items-center gap-2">
            <ArrowLeftRight size={16} /> Transferir entre Cuentas
          </UiHeading>
          <UiButton iconOnly onClick={onClose} variant="surface" color="gray"><X size={16} /></UiButton>
        </UiBox>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <UiText size="1" color="gray" className="block">
            Ideal para depósitos de efectivo desde Caja hacia Banco o traspasos internos (no duplica ingresos ni egresos en Finanzas).
          </UiText>
          <UiBox>
            <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">Cuenta de Origen (Sale)</UiLabel>
            <UiSelect value={form.origenId} onChange={e => setForm(f => ({ ...f, origenId: e.target.value }))} size="2" color="gray" className="w-full">
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} — Saldo: ${(Number(c.saldoActual) || 0).toFixed(2)}</option>
              ))}
            </UiSelect>
          </UiBox>
          <UiBox>
            <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">Cuenta de Destino (Entra)</UiLabel>
            <UiSelect value={form.destinoId} onChange={e => setForm(f => ({ ...f, destinoId: e.target.value }))} size="2" color="gray" className="w-full">
              {cuentas.map(c => (
                <option key={c.id} value={c.id} disabled={c.id === form.origenId}>{c.nombre} — Saldo: ${(Number(c.saldoActual) || 0).toFixed(2)}</option>
              ))}
            </UiSelect>
          </UiBox>
          <UiBox className="grid grid-cols-2 gap-3">
            <UiBox>
              <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">Monto ($)</UiLabel>
              <UiInput type="number" step="0.01" min="0.01" required value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" size="2" color="gray" className="w-full" />
            </UiBox>
            <UiBox>
              <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">Fecha</UiLabel>
              <UiInput type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} size="2" color="gray" className="w-full" />
            </UiBox>
          </UiBox>
          <UiBox>
            <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">Concepto</UiLabel>
            <UiInput type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Depósito cierre de caja del día" size="2" color="gray" className="w-full" />
          </UiBox>
          <UiBox>
            <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">Comprobante / Referencia</UiLabel>
            <UiInput type="text" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} placeholder="N° papeleta o transferencia" size="2" color="gray" className="w-full" />
          </UiBox>
          <UiBox className="flex justify-end gap-2 pt-2">
            <UiButton type="button" onClick={onClose} size="2" color="gray" variant="outline">Cancelar</UiButton>
            <UiButton type="submit" disabled={saving || form.origenId === form.destinoId} size="2" variant="solid" color="green">
              {saving ? 'Transfiriendo...' : 'Confirmar Transferencia'}
            </UiButton>
          </UiBox>
        </form>
      </UiCard>
    </UiBox>
  );
}
