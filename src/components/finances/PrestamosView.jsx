import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Landmark,
  Plus,
  Wallet,
  AlertTriangle,
  DollarSign,
  TrendingDown,
  CalendarDays,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { createThemedPortal } from '../ui/themePortal';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import {
  UiButton,
  UiSelect,
  UiTable,
  UiTableHeader,
  UiTableRow,
  UiTableHead,
  UiTableBody,
  UiTableCell,
  UiInput,
} from '../ui/controls';
import { Badge } from '../ui/badge';
import {
  getPrestamos,
  crearPrestamo,
  pagarCuota,
  eliminarPrestamo,
  getResumenPrestamos,
  getAlertasPrestamos,
  generarTablaAmortizacion,
} from '../../services/prestamosService';
import FinancialPageHeader from './FinancialPageHeader';
import confirmAction from '../../services/confirmDialog';

const METODOS = [
  { value: 'frances', label: 'Francés (Cuota Fija)' },
  { value: 'aleman', label: 'Alemán (Capital Fijo)' },
  { value: 'americano', label: 'Americano (Intereses al Final)' },
];

const ESTADO_META = {
  vigente: { label: 'Vigente', color: 'green' },
  mora: { label: 'En Mora', color: 'red' },
  cancelado: { label: 'Cancelado', color: 'gray' },
};

const CUOTA_BADGE_COLOR = {
  pendiente: 'amber',
  parcial: 'amber',
  pagado: 'green',
  vencido: 'red',
};

export default function PrestamosView({ db, usuario, showToast }) {
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('all');
  const [search, setSearch] = useState('');
  const [pagoModal, setPagoModal] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPrestamos(db);
      setPrestamos(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) =>
    d?.toDate ? d.toDate().toLocaleDateString('es-EC') : d ? new Date(d).toLocaleDateString('es-EC') : '-';

  const resumen = useMemo(() => getResumenPrestamos(prestamos), [prestamos]);
  const alertas = useMemo(() => getAlertasPrestamos(prestamos), [prestamos]);

  const counts = useMemo(
    () => ({
      all: prestamos.length,
      vigente: prestamos.filter((p) => p.estado === 'vigente').length,
      mora: prestamos.filter((p) => p.estado === 'mora').length,
      cancelado: prestamos.filter((p) => p.estado === 'cancelado').length,
    }),
    [prestamos],
  );

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    return prestamos.filter((p) => {
      if (filtroEstado !== 'all' && p.estado !== filtroEstado) return false;
      if (term) {
        const matches = [p.entidad, p.numeroContrato, p.metodoAmortizacion].some((v) =>
          String(v || '').toLowerCase().includes(term),
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [prestamos, filtroEstado, search]);

  const hasActiveFilters = Boolean(filtroEstado !== 'all' || search.trim());

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-white border border-[#e3e3e3] rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white border border-[#e3e3e3] rounded-2xl" />
          ))}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-white border border-[#e3e3e3] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#e3e3e3] rounded-2xl text-center py-12 px-4 space-y-3">
        <AlertTriangle size={32} className="mx-auto text-[#be123c]" />
        <div className="text-sm font-bold text-[#1b1b1b]">Error al cargar Préstamos Bancarios</div>
        <UiText as="p" color="gray" size="2">
          {error}
        </UiText>
        <UiButton onClick={cargar} variant="solid" color="green" size="2">
          Reintentar
        </UiButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FinancialPageHeader
        icon={Landmark}
        title="Préstamos Bancarios"
        description="Pasivos de financiamiento, tablas de amortización y control de cuotas"
        badge={`${prestamos.length} préstamos`}
        badgeColor="red"
        actions={
          <UiButton onClick={() => setShowForm(true)} size="2" variant="solid" color="green" className="flex items-center gap-1.5">
            <Plus size={14} /> Nuevo Préstamo
          </UiButton>
        }
      />

      {/* 1. KPIs PRINCIPALES (Brevo Flat Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Total Deuda</span>
            <div className="w-8 h-8 rounded-xl bg-[#fff0f5] text-[#851b40] border border-[#fbc6d9] flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#851b40] tracking-tight">
              {formatCurrency(resumen.totalDeuda)}
            </div>
            <span className="text-[11px] text-[#666666] font-medium">{resumen.conteo} préstamo(s) activo(s)</span>
          </div>
        </div>

        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Capital Pagado</span>
            <div className="w-8 h-8 rounded-xl bg-[#e8fedf] text-[#004227] border border-[#b3f4cb] flex items-center justify-center shrink-0">
              <TrendingDown size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#004227] tracking-tight">
              {formatCurrency(resumen.capitalPagado)}
            </div>
            <span className="text-[11px] text-[#0b996f] font-medium">Amortizado a principal</span>
          </div>
        </div>

        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Interés Pagado</span>
            <div className="w-8 h-8 rounded-xl bg-[#fcfbe7] text-[#866308] border border-[#f0df8a] flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#866308] tracking-tight">
              {formatCurrency(resumen.interesPagado)}
            </div>
            <span className="text-[11px] text-[#666666] font-medium">Costo financiero acumulado</span>
          </div>
        </div>

        <div
          className={`rounded-2xl p-4 flex flex-col justify-between gap-2 border ${
            resumen.cuotasVencidas > 0 ? 'bg-[#fff0f5] border-[#fbc6d9]' : 'bg-white border-[#e3e3e3]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Cuotas Vencidas</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                resumen.cuotasVencidas > 0 ? 'bg-[#ffe4ed] text-[#851b40]' : 'bg-[#f0fdf4] text-[#0b996f]'
              }`}
            >
              <AlertCircle size={15} />
            </div>
          </div>
          <div>
            <div
              className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums tracking-tight ${
                resumen.cuotasVencidas > 0 ? 'text-[#851b40]' : 'text-[#1b1b1b]'
              }`}
            >
              {resumen.cuotasVencidas}
            </div>
            <span className={`text-[11px] font-medium ${resumen.cuotasVencidas > 0 ? 'text-[#851b40]' : 'text-[#0b996f]'}`}>
              {resumen.cuotasVencidas > 0 ? 'Requieren pago inmediato' : 'Pagos al día'}
            </span>
          </div>
        </div>
      </div>

      {/* Alertas de cuotas vencidas */}
      {alertas.length > 0 && (
        <div className="bg-[#fff0f5] border border-[#fbc6d9] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#851b40] uppercase tracking-wider">
            <AlertTriangle size={14} /> Cuotas Vencidas ({alertas.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto text-xs text-[#1b1b1b]">
            {alertas.slice(0, 10).map((a, i) => (
              <div key={i}>
                <strong>{a.entidad}</strong> — Cuota #{a.cuota} vencida hace <strong>{a.dias} día(s)</strong>
              </div>
            ))}
            {alertas.length > 10 && <div className="text-[#666666]">+{alertas.length - 10} alerta(s) más</div>}
          </div>
        </div>
      )}

      {/* 2. BARRA DE FILTROS UNIFICADA */}
      <div className="bg-white border border-[#e3e3e3] rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-[#f4f4f5] p-1 rounded-xl">
          {[
            { id: 'all', label: 'Todos', count: counts.all },
            { id: 'vigente', label: 'Vigentes', count: counts.vigente },
            { id: 'mora', label: 'En Mora', count: counts.mora, alert: counts.mora > 0 },
            { id: 'cancelado', label: 'Cancelados', count: counts.cancelado },
          ].map((tab) => {
            const active = filtroEstado === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltroEstado(tab.id)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#e8fedf] text-[#004227] border border-[#b3f4cb]'
                    : 'text-[#666666] hover:text-[#1b1b1b] hover:bg-white/70 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    active
                      ? 'bg-[#004227] text-white'
                      : tab.alert
                        ? 'bg-[#ffe4ed] text-[#851b40]'
                        : 'bg-[#e3e3e3] text-[#444444]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-1 md:max-w-sm">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar banco o N° contrato..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-[#fafafa] hover:bg-white focus:bg-white border border-[#e3e3e3] rounded-xl focus:outline-hidden focus:border-[#0b996f] transition-colors font-medium text-[#1b1b1b]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#1b1b1b] p-0.5 cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setFiltroEstado('all');
                setSearch('');
              }}
              className="py-1.5 px-2.5 rounded-xl bg-[#f4f4f5] hover:bg-[#e8fedf] text-[#1b1b1b] hover:text-[#004227] text-xs font-semibold cursor-pointer shrink-0"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* 3. LISTA DE PRÉSTAMOS */}
      <div className="space-y-3">
        {filtrados.length === 0 ? (
          <div className="bg-white border border-[#e3e3e3] rounded-2xl py-14 px-4 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-[#fafafa] border border-[#e3e3e3] flex items-center justify-center mx-auto text-[#666666]">
              <Landmark size={24} />
            </div>
            <h4 className="text-sm font-bold text-[#1b1b1b]">
              {hasActiveFilters ? 'No hay préstamos con estos filtros' : 'No hay préstamos registrados'}
            </h4>
            <p className="text-xs text-[#666666] max-w-md mx-auto">
              {hasActiveFilters
                ? 'Cambia el filtro de estado o búsqueda para revisar otros contratos.'
                : 'Registra préstamos bancarios para generar automáticamente su tabla de amortización y controlar cuotas.'}
            </p>
          </div>
        ) : (
          filtrados.map((p) => {
            const totalMonto = Number(p.montoDesembolsado || 0);
            const pagadoCap = Number(p.capitalPagado || 0);
            const pctPagado = totalMonto > 0 ? Math.min(100, Math.round((pagadoCap / totalMonto) * 100)) : 0;
            const estadoMeta = ESTADO_META[p.estado] || ESTADO_META.vigente;
            const expanded = expandedId === p.id;

            return (
              <div key={p.id} className="bg-white border border-[#e3e3e3] rounded-2xl overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-[#fafafa] transition-colors space-y-3"
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                >
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          p.estado === 'mora'
                            ? 'bg-[#ffe4ed] text-[#851b40] border-[#fbc6d9]'
                            : p.estado === 'cancelado'
                              ? 'bg-[#f4f4f5] text-[#666666] border-[#e3e3e3]'
                              : 'bg-[#e8fedf] text-[#004227] border-[#b3f4cb]'
                        }`}
                      >
                        <Landmark size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#1b1b1b] truncate">{p.entidad}</div>
                        <div className="text-xs text-[#666666] truncate">
                          Contrato: <strong className="font-mono text-[#1b1b1b]">{p.numeroContrato || 'N/A'}</strong> ·{' '}
                          {METODOS.find((m) => m.value === p.metodoAmortizacion)?.label || p.metodoAmortizacion}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#851b40]">
                          {formatCurrency(p.saldoPendiente)}
                        </div>
                        <div className="text-[11px] text-[#666666] font-mono">
                          de {formatCurrency(p.montoDesembolsado)}
                        </div>
                      </div>
                      <Badge variant="soft" color={estadoMeta.color} size="1">
                        {estadoMeta.label}
                      </Badge>
                      <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#666666]">
                        <span className="inline-flex items-center gap-1 text-[#0b996f]" title="Cuotas pagadas">
                          <CheckCircle2 size={13} /> {p.cuotasPagadas || 0}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#444444]" title="Cuotas pendientes">
                          <Clock size={13} /> {p.cuotasPendientes || 0}
                        </span>
                        {p.cuotasVencidas > 0 && (
                          <span className="inline-flex items-center gap-1 text-[#be123c] font-bold" title="Cuotas vencidas">
                            <AlertCircle size={13} /> {p.cuotasVencidas}
                          </span>
                        )}
                      </div>
                      <div className="text-[#666666]">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                    </div>
                  </div>

                  {/* Barra de avance de amortización */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#666666]">
                      <span>Avance de capital amortizado</span>
                      <span className="font-mono font-bold text-[#004227]">{pctPagado}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all bg-[#0b996f]"
                        style={{ width: `${pctPagado}%` }}
                      />
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[#e3e3e3]">
                    <div className="px-4 py-3 bg-[#fafafa] border-b border-[#efefef] flex flex-wrap gap-4 text-xs text-[#666666]">
                      <span>Tasa: <strong className="text-[#1b1b1b]">{p.tasaInteres}% mensual</strong></span>
                      <span>Plazo: <strong className="text-[#1b1b1b]">{p.plazoMeses} meses</strong></span>
                      <span>Desembolso: <strong className="text-[#1b1b1b]">{formatDate(p.fechaDesembolso)}</strong></span>
                      <span>Capital pagado: <strong className="font-mono text-[#004227]">{formatCurrency(p.capitalPagado)}</strong></span>
                      <span>Interés pagado: <strong className="font-mono text-[#866308]">{formatCurrency(p.interesPagado)}</strong></span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-white border-b border-[#e3e3e3] text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                            <th className="px-3.5 py-2.5">#</th>
                            <th className="px-3.5 py-2.5">Vence</th>
                            <th className="px-3.5 py-2.5 text-right">Capital</th>
                            <th className="px-3.5 py-2.5 text-right">Interés</th>
                            <th className="px-3.5 py-2.5 text-right">Cuota</th>
                            <th className="px-3.5 py-2.5 text-right">Saldo</th>
                            <th className="px-3.5 py-2.5 text-center">Estado</th>
                            <th className="px-3.5 py-2.5 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#efefef]">
                          {(p.cuotas || []).map((c) => (
                            <tr
                              key={c.numero}
                              className={
                                c.estado === 'vencido'
                                  ? 'bg-[#fff0f5]/60'
                                  : c.estado === 'pagado'
                                    ? 'bg-[#f0fdf4]/50'
                                    : 'hover:bg-[#fafafa]'
                              }
                            >
                              <td className="px-3.5 py-2.5 font-mono font-bold text-[#1b1b1b]">{c.numero}</td>
                              <td className="px-3.5 py-2.5 whitespace-nowrap text-[#666666]">{formatDate(c.fechaVencimiento)}</td>
                              <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-[#1b1b1b]">{formatCurrency(c.capital)}</td>
                              <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-[#866308]">{formatCurrency(c.interes)}</td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-bold tabular-nums text-[#1b1b1b]">{formatCurrency(c.cuotaTotal)}</td>
                              <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-[#666666]">{formatCurrency(c.saldoPendiente)}</td>
                              <td className="px-3.5 py-2.5 text-center">
                                <Badge variant="soft" color={CUOTA_BADGE_COLOR[c.estado] || 'gray'} size="1">
                                  {c.estado === 'pagado' && formatDate(c.fechaPago) !== '-' ? formatDate(c.fechaPago) : c.estado}
                                </Badge>
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                {(c.estado === 'pendiente' || c.estado === 'vencido' || c.estado === 'parcial') ? (
                                  <UiButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const restante = Math.max(
                                        0,
                                        Number(c.cuotaTotal) - Number(c.pagadaCapital || 0) - Number(c.pagadaInteres || 0),
                                      );
                                      setPagoModal({
                                        prestamoId: p.id,
                                        entidad: p.entidad,
                                        cuotaNumero: c.numero,
                                        restante,
                                        monto: restante.toFixed(2),
                                        saving: false,
                                      });
                                    }}
                                    size="1"
                                    variant="soft"
                                    color="green"
                                    className="inline-flex items-center gap-1"
                                  >
                                    <Wallet size={12} /> Pagar
                                  </UiButton>
                                ) : (
                                  <span className="text-[11px] text-[#999999]">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {p.estado !== 'cancelado' && (
                      <div className="border-t border-[#efefef] px-4 py-3 flex justify-end bg-[#fafafa]">
                        <UiButton
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!(await confirmAction(`¿Eliminar préstamo de ${p.entidad}?`))) return;
                            try {
                              await eliminarPrestamo(db, p.id, usuario);
                              showToast('Préstamo eliminado', 'success');
                              cargar();
                            } catch (err) {
                              showToast('Error: ' + err.message, 'error');
                            }
                          }}
                          size="2"
                          color="red"
                          variant="outline"
                          className="flex items-center gap-1.5"
                        >
                          <Trash2 size={13} /> Eliminar Préstamo
                        </UiButton>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <FormPrestamo
          db={db}
          usuario={usuario}
          showToast={showToast}
          onClose={() => {
            setShowForm(false);
            cargar();
          }}
        />
      )}

      {pagoModal &&
        createThemedPortal(
          <UiBox
            className="erp-dialog-overlay fixed inset-0 z-[300] flex items-center justify-center p-4"
            onClick={() => setPagoModal(null)}
          >
            <UiCard
              style={{ backgroundColor: 'var(--color-panel-solid)' }}
              className="w-full max-w-sm max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <UiBox style={{ borderBottom: '1px solid var(--gray-a6)' }} className="flex items-center justify-between px-5 py-3">
                <UiHeading as="h3" color="gray" weight="bold" highContrast>
                  Pagar Cuota #{pagoModal.cuotaNumero}
                </UiHeading>
                <UiButton iconOnly onClick={() => setPagoModal(null)} variant="surface" color="gray">
                  <X size={16} />
                </UiButton>
              </UiBox>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const montoNum = Number(pagoModal.monto);
                  if (!Number.isFinite(montoNum) || montoNum <= 0) {
                    showToast('Ingresa un monto mayor a $0.00', 'error');
                    return;
                  }
                  setPagoModal((prev) => ({ ...prev, saving: true }));
                  try {
                    await pagarCuota(db, pagoModal.prestamoId, pagoModal.cuotaNumero, montoNum, usuario);
                    showToast(`Cuota #${pagoModal.cuotaNumero} pagada: ${formatCurrency(montoNum)}`, 'success');
                    setPagoModal(null);
                    cargar();
                  } catch (err) {
                    showToast('Error: ' + err.message, 'error');
                    setPagoModal((prev) => (prev ? { ...prev, saving: false } : null));
                  }
                }}
                className="p-5 space-y-4"
              >
                <UiBox style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-3)' }} className="p-3 space-y-1 text-sm">
                  <UiBox className="flex justify-between">
                    <UiText color="gray">Entidad:</UiText>
                    <UiText weight="bold">{pagoModal.entidad}</UiText>
                  </UiBox>
                  <UiBox className="flex justify-between">
                    <UiText color="gray">Saldo de cuota:</UiText>
                    <UiText weight="bold" color="green">{formatCurrency(pagoModal.restante)}</UiText>
                  </UiBox>
                </UiBox>
                <UiBox>
                  <UiLabel size="1" weight="medium" color="gray" highContrast className="block mb-1">
                    Monto a pagar ($)
                  </UiLabel>
                  <UiInput
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    value={pagoModal.monto}
                    onChange={(e) => setPagoModal((prev) => ({ ...prev, monto: e.target.value }))}
                    size="2"
                    color="gray"
                    className="w-full"
                  />
                </UiBox>
                <UiBox className="flex justify-end gap-2">
                  <UiButton type="button" onClick={() => setPagoModal(null)} size="2" color="gray" variant="outline">
                    Cancelar
                  </UiButton>
                  <UiButton type="submit" disabled={pagoModal.saving} size="2" variant="solid" color="green">
                    {pagoModal.saving ? 'Registrando...' : 'Confirmar Pago'}
                  </UiButton>
                </UiBox>
              </form>
            </UiCard>
          </UiBox>,
        )}
    </div>
  );
}

function FormPrestamo({ db, usuario, showToast, onClose }) {
  const [form, setForm] = useState({
    entidad: '',
    numeroContrato: '',
    montoDesembolsado: '',
    tasaInteres: '',
    plazoMeses: '',
    metodoAmortizacion: 'frances',
    fechaDesembolso: '',
    fechaInicio: '',
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const generarPreview = () => {
    const monto = Number(form.montoDesembolsado);
    const tasa = Number(form.tasaInteres);
    const plazo = Number(form.plazoMeses);
    if (!monto || !plazo || !form.fechaInicio) return;
    setPreview(generarTablaAmortizacion(monto, tasa, plazo, form.metodoAmortizacion, form.fechaInicio));
  };

  const totalInteres = preview ? preview.reduce((s, c) => s + c.interes, 0) : 0;
  const totalCuotas = preview ? preview.reduce((s, c) => s + c.cuotaTotal, 0) : 0;

  const handleSubmit = async () => {
    if (!form.entidad || !form.montoDesembolsado || !form.tasaInteres || !form.plazoMeses || !form.fechaInicio) {
      showToast('Complete los campos obligatorios', 'error');
      return;
    }
    setSaving(true);
    try {
      await crearPrestamo(db, form, usuario);
      showToast('Préstamo creado con tabla de amortización', 'success');
      onClose();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return createThemedPortal(
    <UiBox className="erp-dialog-overlay fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <UiBox
        style={{ backgroundColor: 'var(--color-panel-solid)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-a6)' }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <UiCard style={{ backgroundColor: 'var(--color-panel-solid)' }} className="flex items-center justify-between px-5 py-3 sticky top-0 z-10">
          <UiHeading as="h3" color="gray" weight="bold" highContrast>Nuevo Préstamo Bancario</UiHeading>
          <UiButton iconOnly onClick={onClose} variant="surface" color="gray"><X size={16} /></UiButton>
        </UiCard>
        <UiBox className="p-5 space-y-3">
          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Entidad financiera *" placeholder="Banco Pichincha, Produbanco..." value={form.entidad} onChange={(v) => update('entidad', v)} />
            <Input label="N° Contrato" placeholder="PREST-001" value={form.numeroContrato} onChange={(v) => update('numeroContrato', v)} />
          </UiBox>
          <UiBox className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Monto desembolsado *" placeholder="10000" type="number" value={form.montoDesembolsado} onChange={(v) => { update('montoDesembolsado', v); setPreview(null); }} />
            <Input label="Tasa mensual (%) *" placeholder="1.5" type="number" value={form.tasaInteres} onChange={(v) => { update('tasaInteres', v); setPreview(null); }} />
            <Input label="Plazo (meses) *" placeholder="12" type="number" value={form.plazoMeses} onChange={(v) => { update('plazoMeses', v); setPreview(null); }} />
          </UiBox>
          <UiBox className="space-y-1">
            <UiLabel size="1" weight="medium" color="gray">Método de amortización *</UiLabel>
            <UiSelect value={form.metodoAmortizacion} onChange={(e) => { update('metodoAmortizacion', e.target.value); setPreview(null); }} size="2" color="gray" className="w-full">
              {METODOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </UiSelect>
          </UiBox>
          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Fecha desembolso" type="date" value={form.fechaDesembolso} onChange={(v) => update('fechaDesembolso', v)} />
            <Input label="Fecha inicio pagos *" type="date" value={form.fechaInicio} onChange={(v) => { update('fechaInicio', v); setPreview(null); }} />
          </UiBox>

          <UiBox style={{ borderTop: '1px solid var(--gray-a6)' }} className="pt-2">
            <UiButton onClick={generarPreview} size="2" variant="soft" color="green">
              <CalendarDays size={14} className="inline mr-1" /> Generar Tabla de Amortización
            </UiButton>
          </UiBox>

          {preview && (
            <UiBox style={{ border: '1px solid var(--gray-a6)', borderRadius: 'var(--radius-3)' }} className="overflow-hidden">
              <UiBox style={{ backgroundColor: 'var(--color-panel-solid)' }} className="px-3 py-2 flex flex-wrap justify-between items-center gap-2">
                <UiText size="1" weight="bold" color="gray" highContrast>
                  Tabla de Amortización ({METODOS.find((m) => m.value === form.metodoAmortizacion)?.label})
                </UiText>
                <UiText size="1" color="gray">
                  Total interés: <UiText weight="bold" color="amber">{`$${totalInteres.toFixed(2)}`}</UiText> | Total a pagar:{' '}
                  <UiText weight="bold" color="gray" highContrast>{`$${totalCuotas.toFixed(2)}`}</UiText>
                </UiText>
              </UiBox>
              <UiBox className="overflow-x-auto max-h-48 overflow-y-auto">
                <UiTable className="w-full">
                  <UiTableHeader style={{ backgroundColor: 'var(--color-panel-solid)' }} className="sticky top-0">
                    <UiTableRow>
                      <UiTableHead style={{ color: 'var(--gray-11)' }} className="px-2 py-1.5 text-left">#</UiTableHead>
                      <UiTableHead style={{ color: 'var(--gray-11)' }} className="px-2 py-1.5 text-right">Capital</UiTableHead>
                      <UiTableHead style={{ color: 'var(--gray-11)' }} className="px-2 py-1.5 text-right">Interés</UiTableHead>
                      <UiTableHead style={{ color: 'var(--gray-11)' }} className="px-2 py-1.5 text-right">Cuota</UiTableHead>
                      <UiTableHead style={{ color: 'var(--gray-11)' }} className="px-2 py-1.5 text-right">Saldo</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody>
                    {preview.map((c) => (
                      <UiTableRow key={c.numero}>
                        <UiTableCell style={{ color: 'var(--gray-12)' }} className="px-2 py-1.5">{c.numero}</UiTableCell>
                        <UiTableCell style={{ color: 'var(--gray-12)' }} className="px-2 py-1.5 text-right">${c.capital.toFixed(2)}</UiTableCell>
                        <UiTableCell style={{ color: 'var(--amber-12)' }} className="px-2 py-1.5 text-right">${c.interes.toFixed(2)}</UiTableCell>
                        <UiTableCell style={{ color: 'var(--gray-12)' }} className="px-2 py-1.5 text-right">${c.cuotaTotal.toFixed(2)}</UiTableCell>
                        <UiTableCell style={{ color: 'var(--gray-11)' }} className="px-2 py-1.5 text-right">${c.saldoPendiente.toFixed(2)}</UiTableCell>
                      </UiTableRow>
                    ))}
                  </UiTableBody>
                </UiTable>
              </UiBox>
            </UiBox>
          )}
        </UiBox>
        <UiCard style={{ backgroundColor: 'var(--color-panel-solid)' }} className="flex justify-end gap-2 px-5 py-3 sticky bottom-0">
          <UiButton onClick={onClose} size="2" variant="outline" color="gray">Cancelar</UiButton>
          <UiButton onClick={handleSubmit} disabled={saving} size="2" variant="solid" color="green" className="disabled:opacity-50">
            {saving ? 'Guardando...' : 'Crear Préstamo'}
          </UiButton>
        </UiCard>
      </UiBox>
    </UiBox>,
  );
}

function Input({ label, onChange, ...props }) {
  return (
    <UiBox className="space-y-1">
      {label && <UiLabel size="1" weight="medium" color="gray">{label}</UiLabel>}
      <UiInput
        {...props}
        onChange={(e) => onChange?.(e && e.target ? e.target.value : e)}
        size="2"
        color="gray"
        className="w-full"
      />
    </UiBox>
  );
}
