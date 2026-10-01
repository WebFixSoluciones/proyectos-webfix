import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Download, FileText, Eye, Edit2, 
  Trash2, Wallet, DollarSign, TrendingUp, TrendingDown,
  Calendar, X, RefreshCw, AlertTriangle
} from 'lucide-react';
import { getMovimientos, getResumen, anularMovimiento } from '../../services/movimientoService';
import MovimientoForm from './MovimientoForm';
import MovimientoAbono from './MovimientoAbono';
import MovimientoDetalle from './MovimientoDetalle';
import FinancialPageHeader from './FinancialPageHeader';

const FILTROS_DEFAULT = {
  search: '',
  tipo: 'all',
  estado: 'all',
  metodoPago: 'all',
  categoria: 'all',
  fechaDesde: '',
  fechaHasta: '',
};

const formatDocTipo = (tipo) => {
  if (!tipo) return 'Comprobante';
  const map = {
    factura: 'Factura',
    nota_venta: 'Nota de Venta',
    nota_credito: 'Nota de Crédito',
    nota_debito: 'Nota de Débito',
    retencion: 'Retención',
    liquidacion: 'Liquidación',
    gasto: 'Comprobante Gasto',
    ingreso_vario: 'Ingreso Varios',
    gasto_hormiga: 'Gasto Menor',
    recibo: 'Recibo Interno',
  };
  return map[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, ' ');
};

const formatCategoria = (cat) => {
  if (!cat) return '-';
  return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
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
      if (showToast) showToast('Movimiento anulado correctamente', 'success');
      cargarMovimientos();
    } catch (err) {
      if (showToast) showToast('Error al anular: ' + err.message, 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Fecha', 'Tipo', 'Documento', 'Número', 'Tercero', 'RUC', 'Monto', 'Abonado', 'Saldo', 'Estado', 'Método', 'Categoría'];
    const rows = movimientos.map(m => [
      formatDate(m.fecha),
      m.tipo,
      m.documento?.tipo || '',
      m.documento?.numero || '',
      m.tercero?.nombre || '',
      m.tercero?.ruc || '',
      Number(m.monto || 0).toFixed(2),
      (m.pagos || []).reduce((s, p) => s + Number(p.monto || 0), 0).toFixed(2),
      Number(m.saldoPendiente || 0).toFixed(2),
      m.estado || '',
      m.metodoPago || '',
      m.partidas?.[0]?.categoria || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resumen = useMemo(() => getResumen(movimientos), [movimientos]);

  const countIngresos = useMemo(() => movimientos.filter(m => m.tipo === 'ingreso' && m.estado !== 'anulado').length, [movimientos]);
  const countEgresos = useMemo(() => movimientos.filter(m => m.tipo === 'egreso' && m.estado !== 'anulado').length, [movimientos]);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  
  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const date = d?.toDate ? d.toDate() : new Date(d);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filtros.search !== '' ||
      filtros.tipo !== 'all' ||
      filtros.estado !== 'all' ||
      filtros.metodoPago !== 'all' ||
      filtros.categoria !== 'all' ||
      filtros.fechaDesde !== '' ||
      filtros.fechaHasta !== ''
    );
  }, [filtros]);

  const handleResetFilters = () => {
    setFiltros(FILTROS_DEFAULT);
  };

  if (loading && movimientos.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl border border-slate-200/80" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 rounded-2xl border border-slate-200/80" />
      </div>
    );
  }

  if (error && movimientos.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
        <AlertTriangle size={36} className="text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Error al cargar movimientos</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
        <button
          onClick={cargarMovimientos}
          className="px-4 py-2 bg-[#1b1b1b] hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Estandarizado Brevo */}
      <FinancialPageHeader
        icon={DollarSign}
        title="Movimientos Financieros"
        description="Libro central de ingresos, egresos y control de tesorería general"
        badge={`${movimientos.length} registros`}
        badgeColor="green"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingMov(null); setShowForm(true); }}
              className="py-1.5 px-3.5 rounded-xl bg-[#1b1b1b] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 shadow-none transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Nuevo Movimiento</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="py-1.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-none transition-all cursor-pointer"
            >
              <Download size={13} />
              <span>Exportar CSV</span>
            </button>
          </div>
        }
      />

      {/* 2. Métricas de Salud Operativa (KPIs Flat Modern) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Ingresos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Ingresos del Período
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
              {formatCurrency(resumen.totalIngresos)}
            </div>
            <span className="text-[11px] font-medium text-emerald-600 block">
              {countIngresos} entradas registradas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Card 2: Egresos */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Egresos del Período
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-600 tracking-tight">
              {formatCurrency(resumen.totalEgresos)}
            </div>
            <span className="text-[11px] font-medium text-rose-600 block">
              {countEgresos} salidas y pagos registrados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <TrendingDown size={22} />
          </div>
        </div>

        {/* Card 3: Saldo Neto */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Saldo Neto
            </span>
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
              resumen.saldoNeto >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}>
              {formatCurrency(resumen.saldoNeto)}
            </div>
            <span className="text-[11px] font-medium text-slate-500 block">
              {resumen.saldoNeto >= 0 ? 'Balance operacional positivo' : 'Déficit operacional del período'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* 3. Barra de Búsqueda y Filtros Optimizada */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
        {/* Pestañas tipo píldora para filtrar por Tipo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'Todos', count: movimientos.length },
              { id: 'ingreso', label: 'Ingresos', count: countIngresos, isIngreso: true },
              { id: 'egreso', label: 'Egresos', count: countEgresos, isEgreso: true },
            ].map(tab => {
              const active = filtros.tipo === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFiltros(f => ({ ...f, tipo: tab.id }))}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    active 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {tab.isIngreso && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
                  {tab.isEgreso && <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />}
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    active ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Rango de Fechas compacto inline */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
            <Calendar size={13} className="text-slate-400 ml-1 shrink-0" />
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <span>Desde:</span>
              <input
                type="date"
                value={filtros.fechaDesde}
                onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <span>Hasta:</span>
              <input
                type="date"
                value={filtros.fechaHasta}
                onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              />
            </div>
            {(filtros.fechaDesde || filtros.fechaHasta) && (
              <button
                type="button"
                onClick={() => setFiltros(f => ({ ...f, fechaDesde: '', fechaHasta: '' }))}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                title="Limpiar fechas"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Buscador y selectores secundarios */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filtros.search}
              onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar por número de documento, tercero, RUC o concepto..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Estado */}
            <select
              value={filtros.estado}
              onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="pagado">Pagado</option>
              <option value="anulado">Anulado</option>
            </select>

            {/* Limpiar filtros */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Restablecer filtros"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Tabla de Movimientos */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {movimientos.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <FileText size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">No hay movimientos registrados</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {hasActiveFilters 
                ? 'No se encontraron movimientos que coincidan con los filtros aplicados.' 
                : 'Empieza registrando tu primer ingreso o egreso operativo en el sistema.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleResetFilters}
                className="py-1.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Restablecer Filtros</span>
              </button>
            ) : (
              <button
                onClick={() => { setEditingMov(null); setShowForm(true); }}
                className="py-1.5 px-4 rounded-xl bg-[#1b1b1b] hover:bg-black text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Nuevo Movimiento</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="px-4 py-3 whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Tercero</th>
                  <th className="px-3 py-3 hidden sm:table-cell">Categoría</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Saldo</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {movimientos.map(mov => {
                  const saldo = Number(mov.saldoPendiente || 0);
                  const isIngreso = mov.tipo === 'ingreso';

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                        {formatDate(mov.fecha)}
                      </td>

                      {/* Tipo */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {isIngreso ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TrendingUp size={11} /> Ingreso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <TrendingDown size={11} /> Egreso
                          </span>
                        )}
                      </td>

                      {/* Documento */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {formatDocTipo(mov.documento?.tipo)}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          {mov.documento?.numero || '-'}
                        </div>
                      </td>

                      {/* Tercero */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 leading-tight line-clamp-1 max-w-[240px]">
                          {mov.tercero?.nombre || 'CONSUMIDOR FINAL'}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          {mov.tercero?.ruc || '-'}
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="px-3 py-3 hidden sm:table-cell text-slate-600">
                        {formatCategoria(mov.partidas?.[0]?.categoria)}
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(mov.monto)}
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="px-4 py-3 text-right hidden md:table-cell font-mono whitespace-nowrap">
                        <span className={`font-semibold ${saldo > 0.005 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {formatCurrency(saldo)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {mov.estado === 'pagado' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Pagado
                          </span>
                        )}
                        {mov.estado === 'pendiente' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Pendiente
                          </span>
                        )}
                        {mov.estado === 'parcial' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Parcial
                          </span>
                        )}
                        {mov.estado === 'anulado' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Anulado
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. Ver detalle */}
                          <button
                            type="button"
                            onClick={() => setShowDetalle(mov)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Ver detalle del movimiento"
                          >
                            <Eye size={14} />
                          </button>

                          {/* 2. Abonar (si está pendiente o parcial) */}
                          {(mov.estado === 'pendiente' || mov.estado === 'parcial') && (
                            <button
                              type="button"
                              onClick={() => setShowAbono(mov)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Registrar abono"
                            >
                              <Wallet size={14} />
                            </button>
                          )}

                          {/* 3. Editar (si es origen finanzas y no anulado) */}
                          {mov.origen === 'finanzas' && mov.estado !== 'anulado' && (
                            <button
                              type="button"
                              onClick={() => { setEditingMov(mov); setShowForm(true); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Editar movimiento"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}

                          {/* 4. Anular */}
                          {mov.estado !== 'anulado' && (
                            <button
                              type="button"
                              onClick={() => handleAnular(mov.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Anular movimiento"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
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

      {/* Modales Existentes */}
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
