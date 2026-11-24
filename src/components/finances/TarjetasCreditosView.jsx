import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard,
  Download,
  Plus,
  Wallet,
  AlertTriangle,
  DollarSign,
  Clock,
  CalendarDays,
  Calendar,
  Tag,
  X,
  Search,
} from 'lucide-react';
import { createThemedPortal } from '../ui/themePortal';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiSelect, UiInput } from '../ui/controls';
import { Badge } from '../ui/badge';
import {
  getTarjetas,
  getAllConsumosTarjeta,
  getResumenTarjetas,
  getAlertasProximidad,
  crearTarjeta,
  registrarConsumo,
  registrarPagoTarjeta,
} from '../../services/tarjetasService';
import FinancialPageHeader from './FinancialPageHeader';

const CATEGORIAS = [
  { value: 'gasto_operativo', label: 'Gasto Operativo' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'personal', label: 'Personal' },
  { value: 'no_deducible', label: 'No Deducible' },
  { value: 'anticipo', label: 'Anticipo' },
  { value: 'otro', label: 'Otro' },
];

export default function TarjetasCreditosView({ db, usuario, showToast }) {
  const [tarjetas, setTarjetas] = useState([]);
  const [allConsumos, setAllConsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tarjetaId, setTarjetaId] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [search, setSearch] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showFormTarjeta, setShowFormTarjeta] = useState(false);
  const [showFormConsumo, setShowFormConsumo] = useState(false);
  const [showFormPago, setShowFormPago] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, c] = await Promise.all([getTarjetas(db), getAllConsumosTarjeta(db, {})]);
      setTarjetas(t || []);
      setAllConsumos(c || []);
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

  const resumen = useMemo(() => getResumenTarjetas(tarjetas), [tarjetas]);
  const alertas = useMemo(() => getAlertasProximidad(tarjetas), [tarjetas]);

  const counts = useMemo(() => {
    const base = tarjetaId === 'all' ? allConsumos : allConsumos.filter((c) => c.tarjetaId === tarjetaId);
    return {
      all: base.length,
      consumo: base.filter((c) => c.tipo === 'consumo').length,
      pago: base.filter((c) => c.tipo === 'pago').length,
    };
  }, [allConsumos, tarjetaId]);

  const consumos = useMemo(() => {
    const term = search.trim().toLowerCase();
    const toDateObj = (value) => new Date(value?.toDate?.() || value || 0);
    return allConsumos.filter((c) => {
      if (tarjetaId !== 'all' && c.tarjetaId !== tarjetaId) return false;
      if (tipo !== 'all' && c.tipo !== tipo) return false;
      if (term) {
        const tarjeta = tarjetas.find((t) => t.id === c.tarjetaId);
        const matches = [c.descripcion, c.referencia, c.categoria, tarjeta?.emisor, tarjeta?.numero].some((val) =>
          String(val || '').toLowerCase().includes(term),
        );
        if (!matches) return false;
      }
      if (fechaDesde && toDateObj(c.fecha) < new Date(fechaDesde)) return false;
      if (fechaHasta && toDateObj(c.fecha) > new Date(`${fechaHasta}T23:59:59`)) return false;
      return true;
    });
  }, [allConsumos, tarjetas, tarjetaId, tipo, search, fechaDesde, fechaHasta]);

  const hasActiveFilters = Boolean(tarjetaId !== 'all' || tipo !== 'all' || search.trim() || fechaDesde || fechaHasta);

  const resetFilters = () => {
    setTarjetaId('all');
    setTipo('all');
    setSearch('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const handleExportCsv = () => {
    const h = ['Fecha', 'Tarjeta', 'Tipo', 'Monto', 'Descripción', 'Categoría', 'Cuotas', 'Cuotas Pagadas', 'Referencia'];
    const tarjetaMap = Object.fromEntries(tarjetas.map((t) => [t.id, `${t.emisor} ****${t.numero}`]));
    const rows = consumos.map((c) => [
      formatDate(c.fecha),
      tarjetaMap[c.tarjetaId] || '-',
      c.tipo,
      Number(c.monto || 0).toFixed(2),
      c.descripcion || '',
      c.categoria || '',
      c.cuotas || 1,
      c.cuotasPagadas || 0,
      c.referencia || '',
    ]);
    const csv = [h.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = `tarjetas_consumos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(u);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-white border border-[#e3e3e3] rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white border border-[#e3e3e3] rounded-2xl" />
          ))}
        </div>
        <div className="h-32 bg-white border border-[#e3e3e3] rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#e3e3e3] rounded-2xl text-center py-12 px-4 space-y-3">
        <AlertTriangle size={32} className="mx-auto text-[#be123c]" />
        <div className="text-sm font-bold text-[#1b1b1b]">Error al cargar Tarjetas y Créditos</div>
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
        icon={CreditCard}
        title="Tarjetas y Créditos"
        description="Administración de tarjetas corporativas, cupos, pagos y consumos diferidos"
        badge={`${tarjetas.length} tarjetas`}
        badgeColor="purple"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <UiButton onClick={() => setShowFormTarjeta(true)} size="2" variant="solid" color="green" className="flex items-center gap-1.5">
              <Plus size={14} /> Nueva Tarjeta
            </UiButton>
            <UiButton onClick={() => setShowFormConsumo(true)} disabled={tarjetas.length === 0} size="2" variant="soft" color="amber" className="flex items-center gap-1.5 disabled:opacity-50">
              <CreditCard size={14} /> Consumo
            </UiButton>
            <UiButton onClick={() => setShowFormPago(true)} disabled={tarjetas.length === 0} size="2" variant="outline" color="gray" className="flex items-center gap-1.5 disabled:opacity-50">
              <Wallet size={14} /> Registrar Pago
            </UiButton>
          </div>
        }
      />

      {/* 1. KPIs PRINCIPALES (Brevo Flat Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Total Cupo</span>
            <div className="w-8 h-8 rounded-xl bg-[#fafafa] text-[#1b1b1b] border border-[#e3e3e3] flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#1b1b1b] tracking-tight">
              {formatCurrency(resumen.totalCupo)}
            </div>
            <span className="text-[11px] text-[#666666] font-medium">Límite total consolidado</span>
          </div>
        </div>

        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Total Utilizado</span>
            <div className="w-8 h-8 rounded-xl bg-[#fcfbe7] text-[#866308] border border-[#f0df8a] flex items-center justify-center shrink-0">
              <CreditCard size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#866308] tracking-tight">
              {formatCurrency(resumen.totalUtilizado)}
            </div>
            <span className="text-[11px] text-[#666666] font-medium">
              {resumen.totalCupo > 0 ? `${Math.round((resumen.totalUtilizado / resumen.totalCupo) * 100)}% del cupo usado` : 'Sin cupo asignado'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Disponible</span>
            <div className="w-8 h-8 rounded-xl bg-[#e8fedf] text-[#0b996f] border border-[#b3f4cb] flex items-center justify-center shrink-0">
              <Wallet size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#004227] tracking-tight">
              {formatCurrency(resumen.totalDisponible)}
            </div>
            <span className="text-[11px] text-[#0b996f] font-medium">Cupo libre inmediato</span>
          </div>
        </div>

        <div
          className={`rounded-2xl p-4 flex flex-col justify-between gap-2 border ${
            resumen.proximosPagos > 0 ? 'bg-[#fff0f5] border-[#fbc6d9]' : 'bg-white border-[#e3e3e3]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Próximos Pagos</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                resumen.proximosPagos > 0 ? 'bg-[#ffe4ed] text-[#851b40]' : 'bg-[#f0fdf4] text-[#0b996f]'
              }`}
            >
              <CalendarDays size={15} />
            </div>
          </div>
          <div>
            <div
              className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums tracking-tight ${
                resumen.proximosPagos > 0 ? 'text-[#851b40]' : 'text-[#1b1b1b]'
              }`}
            >
              {resumen.proximosPagos}
            </div>
            <span className={`text-[11px] font-medium ${resumen.proximosPagos > 0 ? 'text-[#851b40]' : 'text-[#0b996f]'}`}>
              {resumen.proximosPagos > 0 ? 'Fechas de corte/pago cercanas' : 'Sin vencimientos próximos'}
            </span>
          </div>
        </div>
      </div>

      {/* Alertas de proximidad */}
      {alertas.length > 0 && (
        <div className="bg-[#fcfbe7] border border-[#f0df8a] rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#866308] uppercase tracking-wider">
            <AlertTriangle size={14} /> Alertas de Corte y Pago ({alertas.length})
          </div>
          <div className="space-y-1 text-xs text-[#1b1b1b]">
            {alertas.map((a, i) => (
              <div key={i}>
                <strong>{a.emisor} ****{a.numero}</strong> — {a.mensaje}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. TARJETAS REGISTRADAS (Clicables para filtrar) */}
      {tarjetas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tarjetas.map((t) => {
            const uso = t.cupoTotal > 0 ? Math.round((t.saldoUtilizado / t.cupoTotal) * 100) : 0;
            const selected = tarjetaId === t.id;
            const barColor = uso > 80 ? '#be123c' : uso > 50 ? '#d97706' : '#0b996f';
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTarjetaId((prev) => (prev === t.id ? 'all' : t.id))}
                className={`text-left bg-white rounded-2xl p-4 border transition-colors cursor-pointer space-y-3 ${
                  selected ? 'border-[#0b996f] ring-2 ring-[#0b996f]/25 bg-[#f0fdf4]/40' : 'border-[#e3e3e3] hover:border-[#0b996f]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      uso > 80
                        ? 'bg-[#ffe4ed] text-[#851b40] border-[#fbc6d9]'
                        : uso > 50
                          ? 'bg-[#fcfbe7] text-[#866308] border-[#f0df8a]'
                          : 'bg-[#e8fedf] text-[#004227] border-[#b3f4cb]'
                    }`}>
                      <CreditCard size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#1b1b1b] truncate">{t.emisor}</div>
                      <div className="text-xs font-mono text-[#666666]">**** {t.numero}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    t.estado === 'activa' ? 'bg-[#e8fedf] text-[#004227]' : 'bg-[#efefef] text-[#666666]'
                  }`}>
                    {t.estado}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Cupo total</span>
                    <span className="font-mono font-bold text-[#1b1b1b] tabular-nums">{formatCurrency(t.cupoTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Utilizado ({uso}%)</span>
                    <span className="font-mono font-bold text-[#866308] tabular-nums">{formatCurrency(t.saldoUtilizado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Disponible</span>
                    <span className="font-mono font-bold text-[#0b996f] tabular-nums">{formatCurrency(t.cupoDisponible)}</span>
                  </div>

                  <div className="w-full h-2 bg-[#f0f0f0] rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ backgroundColor: barColor, width: `${Math.min(Math.max(uso, 0), 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-[#666666] pt-1">
                    <span>Corte: día <strong>{t.fechaCorte}</strong></span>
                    <span>Pago: día <strong>{t.fechaPago}</strong></span>
                  </div>

                  {t.cuotasPendientes?.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#004227] bg-[#e8fedf] px-2 py-1 rounded-lg mt-1">
                      <Clock size={12} /> {t.cuotasPendientes.length} consumo(s) en cuotas activas
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. BARRA DE FILTROS UNIFICADA */}
      <div className="bg-white border border-[#e3e3e3] rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Píldoras de tipo */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[#f4f4f5] p-1 rounded-xl">
              {[
                { id: 'all', label: 'Todos', count: counts.all },
                { id: 'consumo', label: 'Consumos', count: counts.consumo },
                { id: 'pago', label: 'Pagos', count: counts.pago },
              ].map((tab) => {
                const active = tipo === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTipo(tab.id)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#e8fedf] text-[#004227] border border-[#b3f4cb]'
                        : 'text-[#666666] hover:text-[#1b1b1b] hover:bg-white/70 border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      active ? 'bg-[#004227] text-white' : 'bg-[#e3e3e3] text-[#444444]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <UiSelect value={tarjetaId} onChange={(e) => setTarjetaId(e.target.value)} size="2" color="gray">
              <option value="all">Todas las tarjetas</option>
              {tarjetas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emisor} ****{t.numero}
                </option>
              ))}
            </UiSelect>
          </div>

          {/* Buscador */}
          <div className="relative flex-1 lg:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar descripción, referencia o tarjeta..."
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
        </div>

        {/* Fila de fechas compacta + Exportar CSV */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#efefef] text-xs text-[#666666]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#1b1b1b] flex items-center gap-1.5">
              <Calendar size={13} className="text-[#0b996f]" /> Rango de fecha:
            </span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              aria-label="Fecha desde"
              className="w-[144px] py-1.5 px-2.5 bg-[#fafafa] border border-[#e3e3e3] rounded-lg text-xs text-[#1b1b1b] focus:outline-hidden focus:border-[#0b996f]"
            />
            <span>hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              aria-label="Fecha hasta"
              className="w-[144px] py-1.5 px-2.5 bg-[#fafafa] border border-[#e3e3e3] rounded-lg text-xs text-[#1b1b1b] focus:outline-hidden focus:border-[#0b996f]"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-medium text-[#666666]">
              Mostrando <strong className="text-[#1b1b1b]">{consumos.length}</strong> de {allConsumos.length}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="py-1 px-2.5 rounded-lg bg-[#f4f4f5] hover:bg-[#e8fedf] text-[#1b1b1b] hover:text-[#004227] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X size={12} /> Limpiar
              </button>
            )}
            <UiButton onClick={handleExportCsv} size="1" color="gray" variant="outline" className="flex items-center gap-1">
              <Download size={12} /> CSV
            </UiButton>
          </div>
        </div>
      </div>

      {/* 4. LISTADO DE CONSUMOS Y PAGOS */}
      <div className="bg-white border border-[#e3e3e3] rounded-2xl overflow-hidden">
        {consumos.length === 0 ? (
          <div className="text-center py-14 px-4 space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-[#fafafa] border border-[#e3e3e3] flex items-center justify-center mx-auto text-[#666666]">
              <CreditCard size={24} />
            </div>
            <h4 className="text-sm font-bold text-[#1b1b1b]">
              {hasActiveFilters ? 'No hay movimientos con estos filtros' : 'No hay consumos o pagos registrados'}
            </h4>
            <p className="text-xs text-[#666666] max-w-md mx-auto">
              {hasActiveFilters
                ? 'Ajusta la tarjeta, tipo o rango de fechas para ver otros registros.'
                : tarjetas.length === 0
                  ? 'Crea primero una tarjeta corporativa para registrar consumos y pagos diferidos.'
                  : 'Registra tu primer consumo o pago usando los botones en la parte superior.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 py-1.5 px-3.5 text-xs bg-[#e8fedf] hover:bg-[#c0ffa5] text-[#004227] rounded-xl font-semibold cursor-pointer transition-colors"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Vista Móvil */}
            <div className="divide-y divide-[#efefef] md:hidden">
              {consumos.map((c) => {
                const tarjeta = tarjetas.find((t) => t.id === c.tarjetaId);
                return (
                  <div key={c.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#1b1b1b] truncate">{c.descripcion || (c.tipo === 'pago' ? 'Pago a tarjeta' : 'Consumo')}</div>
                        <div className="text-[11px] text-[#666666]">
                          {formatDate(c.fecha)} · {tarjeta ? `${tarjeta.emisor} ****${tarjeta.numero}` : '-'}
                        </div>
                      </div>
                      <span className={`font-mono font-extrabold text-sm tabular-nums ${c.tipo === 'pago' ? 'text-[#0b996f]' : 'text-[#866308]'}`}>
                        {c.tipo === 'pago' ? '-' : ''}
                        {formatCurrency(c.monto)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#666666]">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="soft" color={c.tipo === 'pago' ? 'green' : 'amber'} size="1">
                          {c.tipo === 'pago' ? 'Pago' : 'Consumo'}
                        </Badge>
                        {c.cuotas > 1 && (
                          <span className="font-mono font-semibold text-[#004227]">
                            Cuotas {c.cuotasPagadas || 0}/{c.cuotas}
                          </span>
                        )}
                      </div>
                      <span className="font-mono">{c.referencia || '-'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vista Escritorio */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#e3e3e3] text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                    <th className="py-3 px-3.5">Fecha</th>
                    <th className="py-3 px-3.5">Tarjeta</th>
                    <th className="py-3 px-3.5 text-center">Tipo</th>
                    <th className="py-3 px-3.5">Descripción</th>
                    <th className="py-3 px-3.5 hidden lg:table-cell">Categoría</th>
                    <th className="py-3 px-3.5 text-right">Monto</th>
                    <th className="py-3 px-3.5 text-center">Cuotas</th>
                    <th className="py-3 px-3.5 hidden lg:table-cell">Ref.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efefef] text-xs">
                  {consumos.map((c) => {
                    const tarjeta = tarjetas.find((t) => t.id === c.tarjetaId);
                    const hasOpenCuotas = c.cuotas > 1 && (c.cuotasPagadas || 0) < c.cuotas;
                    return (
                      <tr key={c.id} className={`hover:bg-[#fafafa] transition-colors ${hasOpenCuotas ? 'bg-[#f0fdf4]/40' : ''}`}>
                        <td className="py-3 px-3.5 whitespace-nowrap text-[#666666] font-medium">{formatDate(c.fecha)}</td>
                        <td className="py-3 px-3.5 font-semibold text-[#1b1b1b] whitespace-nowrap">
                          {tarjeta ? `${tarjeta.emisor} ****${tarjeta.numero}` : '-'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <Badge variant="soft" color={c.tipo === 'pago' ? 'green' : 'amber'} size="1">
                            {c.tipo === 'pago' ? 'Pago' : 'Consumo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3.5 text-[#1b1b1b] max-w-[240px] truncate">{c.descripcion || '-'}</td>
                        <td className="py-3 px-3.5 text-[#666666] hidden lg:table-cell">
                          <span className="inline-flex items-center gap-1">
                            <Tag size={11} />
                            {CATEGORIAS.find((cat) => cat.value === c.categoria)?.label || c.categoria || '-'}
                          </span>
                        </td>
                        <td className={`py-3 px-3.5 text-right font-mono font-extrabold tabular-nums ${c.tipo === 'pago' ? 'text-[#0b996f]' : 'text-[#866308]'}`}>
                          {c.tipo === 'pago' ? '-' : ''}
                          {formatCurrency(c.monto)}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono">
                          {c.cuotas > 1 ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#e8fedf] text-[#004227] text-[11px] font-bold">
                              {c.cuotasPagadas || 0}/{c.cuotas}
                            </span>
                          ) : (
                            <span className="text-[#999999]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-[#666666] font-mono hidden lg:table-cell">{c.referencia || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showFormTarjeta && <FormTarjeta db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowFormTarjeta(false); cargar(); }} />}
      {showFormConsumo && <FormConsumo tarjetas={tarjetas} db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowFormConsumo(false); cargar(); }} />}
      {showFormPago && <FormPago tarjetas={tarjetas} db={db} usuario={usuario} showToast={showToast} onClose={() => { setShowFormPago(false); cargar(); }} />}
    </div>
  );
}

function FormTarjeta({ db, usuario, showToast, onClose }) {
  const [form, setForm] = useState({ emisor: '', numero: '', cupoTotal: '', fechaCorte: '', fechaPago: '', tasaInteres: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.emisor || !form.numero || !form.cupoTotal || !form.fechaCorte || !form.fechaPago) {
      showToast('Complete los campos obligatorios', 'error');
      return;
    }
    setSaving(true);
    try {
      await crearTarjeta(db, form, usuario);
      showToast('Tarjeta creada', 'success');
      onClose();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Nueva Tarjeta">
      <UiBox className="space-y-3">
        <Input label="Emisor *" placeholder="Banco Pichincha, Visa..." value={form.emisor} onChange={(v) => setForm((f) => ({ ...f, emisor: v }))} />
        <Input label="Últimos 4 dígitos *" placeholder="1234" value={form.numero} onChange={(v) => setForm((f) => ({ ...f, numero: v }))} maxLength={4} />
        <Input label="Cupo total *" placeholder="5000" type="number" value={form.cupoTotal} onChange={(v) => setForm((f) => ({ ...f, cupoTotal: v }))} />
        <UiBox className="grid grid-cols-2 gap-3">
          <Input label="Día de corte *" placeholder="15" value={form.fechaCorte} onChange={(v) => setForm((f) => ({ ...f, fechaCorte: v }))} />
          <Input label="Día de pago *" placeholder="25" value={form.fechaPago} onChange={(v) => setForm((f) => ({ ...f, fechaPago: v }))} />
        </UiBox>
        <Input label="Tasa de interés (% mensual)" placeholder="1.5" type="number" value={form.tasaInteres} onChange={(v) => setForm((f) => ({ ...f, tasaInteres: v }))} />
      </UiBox>
      <UiBox className="flex justify-end gap-2 pt-4">
        <UiButton onClick={onClose} size="2" variant="outline" color="gray">Cancelar</UiButton>
        <UiButton onClick={handleSubmit} disabled={saving} size="2" variant="solid" color="green" className="disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar'}
        </UiButton>
      </UiBox>
    </Modal>
  );
}

function FormConsumo({ tarjetas, db, usuario, showToast, onClose }) {
  const [form, setForm] = useState({ tarjetaId: tarjetas[0]?.id || '', monto: '', descripcion: '', categoria: 'otro', fecha: '', cuotas: '1', referencia: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.tarjetaId || !form.monto || !form.descripcion) {
      showToast('Complete los campos obligatorios', 'error');
      return;
    }
    setSaving(true);
    try {
      await registrarConsumo(db, form, usuario);
      showToast('Consumo registrado', 'success');
      onClose();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Nuevo Consumo">
      <UiBox className="space-y-3">
        <UiBox className="space-y-1">
          <UiLabel size="1" weight="medium" color="gray">Tarjeta *</UiLabel>
          <UiSelect value={form.tarjetaId} onChange={(e) => setForm((f) => ({ ...f, tarjetaId: e.target.value }))} size="2" color="gray" className="w-full">
            {tarjetas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emisor} ****{t.numero} (Dispo: ${(t.cupoDisponible || 0).toFixed(2)})
              </option>
            ))}
          </UiSelect>
        </UiBox>
        <Input label="Monto *" placeholder="100.00" type="number" value={form.monto} onChange={(v) => setForm((f) => ({ ...f, monto: v }))} />
        <Input label="Descripción *" placeholder="Compra en proveedor X" value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))} />
        <UiBox className="space-y-1">
          <UiLabel size="1" weight="medium" color="gray">Categoría</UiLabel>
          <UiSelect value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} size="2" color="gray" className="w-full">
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </UiSelect>
        </UiBox>
        <UiBox className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} />
          <Input label="N° autorización" placeholder="Ref. 000000" value={form.referencia} onChange={(v) => setForm((f) => ({ ...f, referencia: v }))} />
        </UiBox>
        <Input label="Cuotas (1 = contado)" type="number" placeholder="1" value={form.cuotas} onChange={(v) => setForm((f) => ({ ...f, cuotas: v }))} min={1} />
      </UiBox>
      <UiBox className="flex justify-end gap-2 pt-4">
        <UiButton onClick={onClose} size="2" variant="outline" color="gray">Cancelar</UiButton>
        <UiButton onClick={handleSubmit} disabled={saving} size="2" variant="solid" color="amber" className="disabled:opacity-50">
          {saving ? 'Guardando...' : 'Registrar'}
        </UiButton>
      </UiBox>
    </Modal>
  );
}

function FormPago({ tarjetas, db, usuario, showToast, onClose }) {
  const [form, setForm] = useState({ tarjetaId: tarjetas[0]?.id || '', monto: '', descripcion: '', fecha: '', referencia: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.tarjetaId || !form.monto) {
      showToast('Complete los campos obligatorios', 'error');
      return;
    }
    setSaving(true);
    try {
      await registrarPagoTarjeta(db, form, usuario);
      showToast('Pago registrado', 'success');
      onClose();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Registrar Pago a Tarjeta">
      <UiBox className="space-y-3">
        <UiBox className="space-y-1">
          <UiLabel size="1" weight="medium" color="gray">Tarjeta *</UiLabel>
          <UiSelect value={form.tarjetaId} onChange={(e) => setForm((f) => ({ ...f, tarjetaId: e.target.value }))} size="2" color="gray" className="w-full">
            {tarjetas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emisor} ****{t.numero} (Saldo: ${(t.saldoUtilizado || 0).toFixed(2)})
              </option>
            ))}
          </UiSelect>
        </UiBox>
        <Input label="Monto del pago *" placeholder="500.00" type="number" value={form.monto} onChange={(v) => setForm((f) => ({ ...f, monto: v }))} />
        <Input label="Descripción" placeholder="Pago mínimo, pago total..." value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))} />
        <UiBox className="grid grid-cols-2 gap-3">
          <Input label="Fecha" type="date" value={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} />
          <Input label="N° referencia" placeholder="Transferencia #123" value={form.referencia} onChange={(v) => setForm((f) => ({ ...f, referencia: v }))} />
        </UiBox>
      </UiBox>
      <UiBox className="flex justify-end gap-2 pt-4">
        <UiButton onClick={onClose} size="2" variant="outline" color="gray">Cancelar</UiButton>
        <UiButton onClick={handleSubmit} disabled={saving} size="2" variant="solid" color="green" className="disabled:opacity-50">
          {saving ? 'Guardando...' : 'Registrar'}
        </UiButton>
      </UiBox>
    </Modal>
  );
}

function Modal({ children, onClose, title }) {
  return createThemedPortal(
    <UiBox className="erp-dialog-overlay fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <UiBox
        style={{ backgroundColor: 'var(--color-panel-solid)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-a6)' }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <UiCard style={{ backgroundColor: 'var(--color-panel-solid)' }} className="flex items-center justify-between px-5 py-3 sticky top-0 z-10">
          <UiHeading as="h3" color="gray" weight="bold" highContrast>{title}</UiHeading>
          <UiButton iconOnly onClick={onClose} variant="surface" color="gray"><X size={16} /></UiButton>
        </UiCard>
        <UiBox className="p-5">{children}</UiBox>
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
