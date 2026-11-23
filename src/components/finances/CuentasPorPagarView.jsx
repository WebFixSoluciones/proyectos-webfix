import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Download,
  FileText,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  BookOpen,
  ArrowUpCircle,
  Calendar,
  X,
  RefreshCw,
  Receipt,
} from 'lucide-react';
import { UiBox, UiText } from '../ui/layout';
import { UiButton } from '../ui/controls';
import { Badge } from '../ui/badge';
import { getCxP, getAging, registrarPago, getResumenCxP } from '../../services/cxpService';
import FinancialPageHeader from './FinancialPageHeader';
import FinancialPaymentModal from './FinancialPaymentModal';

const AGING_META = {
  '0-30': {
    label: '0 - 30 días',
    tag: 'Al corriente',
    bg: 'bg-[#f0fdf4]',
    border: 'border-[#b3f4cb]',
    activeRing: 'ring-2 ring-[#0b996f] border-[#0b996f]',
    titleText: 'text-[#004227]',
    amountText: 'text-[#004227]',
    tagBg: 'bg-[#e8fedf] text-[#004227]',
  },
  '31-60': {
    label: '31 - 60 días',
    tag: 'Seguimiento',
    bg: 'bg-[#fafafa]',
    border: 'border-[#e3e3e3]',
    activeRing: 'ring-2 ring-[#1b1b1b] border-[#1b1b1b]',
    titleText: 'text-[#444444]',
    amountText: 'text-[#1b1b1b]',
    tagBg: 'bg-[#efefef] text-[#444444]',
  },
  '61-90': {
    label: '61 - 90 días',
    tag: 'Alerta',
    bg: 'bg-[#fcfbe7]',
    border: 'border-[#f0df8a]',
    activeRing: 'ring-2 ring-[#b45309] border-[#b45309]',
    titleText: 'text-[#866308]',
    amountText: 'text-[#866308]',
    tagBg: 'bg-[#fef3c7] text-[#866308]',
  },
  '+90': {
    label: '+90 días',
    tag: 'Crítico',
    bg: 'bg-[#fff0f5]',
    border: 'border-[#fbc6d9]',
    activeRing: 'ring-2 ring-[#be123c] border-[#be123c]',
    titleText: 'text-[#851b40]',
    amountText: 'text-[#851b40]',
    tagBg: 'bg-[#ffe4ed] text-[#851b40]',
  },
};

function getAgingBucketKey(item) {
  const d = item.factura?.fechaVencimiento?.toDate?.() || new Date(item.factura?.fechaVencimiento || Date.now());
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 30) return '0-30';
  if (dias <= 60) return '31-60';
  if (dias <= 90) return '61-90';
  return '+90';
}

export default function CuentasPorPagarView({ db, usuario, showToast }) {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('all');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCxP(db, {});
      setAllItems(data || []);
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

  const resumen = useMemo(() => getResumenCxP(allItems), [allItems]);
  const aging = useMemo(
    () => getAging(allItems.filter((i) => i.estado !== 'pagado' && i.estado !== 'anulado')),
    [allItems],
  );

  const counts = useMemo(() => {
    const c = { all: allItems.length, pendiente: 0, parcial: 0, vencido: 0, pagado: 0, anulado: 0 };
    allItems.forEach((i) => {
      if (i.estado === 'pagado') c.pagado += 1;
      else if (i.estado === 'anulado') c.anulado += 1;
      else if (i.estado === 'vencido' || (i.diasVencido > 0 && Number(i.saldoPendiente) > 0.005)) c.vencido += 1;
      else if (i.estado === 'parcial') c.parcial += 1;
      else c.pendiente += 1;
    });
    return c;
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const toDateObj = (value) => new Date(value?.toDate?.() || value || 0);

    return allItems.filter((item) => {
      if (estado !== 'all') {
        if (estado === 'vencido') {
          const isVencido = item.estado === 'vencido' || (item.diasVencido > 0 && Number(item.saldoPendiente) > 0.005 && item.estado !== 'pagado' && item.estado !== 'anulado');
          if (!isVencido) return false;
        } else if (item.estado !== estado) {
          return false;
        }
      }

      if (agingFilter) {
        if (item.estado === 'pagado' || item.estado === 'anulado') return false;
        if (getAgingBucketKey(item) !== agingFilter) return false;
      }

      if (term) {
        const hayCoincidencia = [
          item.tercero?.nombre,
          item.tercero?.ruc,
          item.factura?.numero,
          item.factura?.tipo,
        ].some((val) => String(val || '').toLowerCase().includes(term));
        if (!hayCoincidencia) return false;
      }

      if (fechaDesde && toDateObj(item.factura?.fecha) < new Date(fechaDesde)) return false;
      if (fechaHasta && toDateObj(item.factura?.fecha) > new Date(`${fechaHasta}T23:59:59`)) return false;

      return true;
    });
  }, [allItems, estado, agingFilter, search, fechaDesde, fechaHasta]);

  const hasActiveFilters = Boolean(search.trim() || estado !== 'all' || fechaDesde || fechaHasta || agingFilter);

  const resetFilters = () => {
    setSearch('');
    setEstado('all');
    setFechaDesde('');
    setFechaHasta('');
    setAgingFilter('');
  };

  const handleExportCsv = () => {
    const h = [
      'Fecha',
      'Proveedor',
      'RUC',
      'Doc',
      'Vence',
      'Monto',
      'Ret. Fuente',
      'Ret. IVA',
      'Abonado',
      'Saldo',
      'Días Venc.',
      'Estado',
    ];
    const rows = filteredItems.map((i) => [
      formatDate(i.factura?.fecha),
      i.tercero?.nombre || '',
      i.tercero?.ruc || '',
      `${i.factura?.tipo || ''} ${i.factura?.numero || ''}`.trim(),
      formatDate(i.factura?.fechaVencimiento),
      Number(i.factura?.montoTotal || 0).toFixed(2),
      Number(i.factura?.retencionFuente || 0).toFixed(2),
      Number(i.factura?.retencionIva || 0).toFixed(2),
      (i.abonos || []).reduce((s, p) => s + Number(p.monto || 0), 0).toFixed(2),
      Number(i.saldoPendiente || 0).toFixed(2),
      i.diasVencido || 0,
      i.estado || '',
    ]);
    const csv = [h.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cxp_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <UiBox className="space-y-4 animate-pulse">
        <div className="h-16 bg-white border border-[#e3e3e3] rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-white border border-[#e3e3e3] rounded-2xl" />
          ))}
        </div>
        <div className="h-32 bg-white border border-[#e3e3e3] rounded-2xl" />
        <div className="h-24 bg-white border border-[#e3e3e3] rounded-2xl" />
      </UiBox>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#e3e3e3] rounded-2xl text-center py-12 px-4 space-y-3">
        <AlertTriangle size={32} className="mx-auto text-[#be123c]" />
        <div className="text-sm font-bold text-[#1b1b1b]">Error al cargar Cuentas por Pagar</div>
        <UiText as="p" color="gray" size="2">
          {error}
        </UiText>
        <UiButton onClick={cargar} variant="solid" color="green" size="2">
          Reintentar
        </UiButton>
      </div>
    );
  }

  const statusTabs = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'pendiente', label: 'Pendientes', count: counts.pendiente },
    { id: 'parcial', label: 'Parciales', count: counts.parcial },
    { id: 'vencido', label: 'Vencidas', count: counts.vencido, alert: counts.vencido > 0 },
    { id: 'pagado', label: 'Pagadas', count: counts.pagado },
    ...(counts.anulado > 0 ? [{ id: 'anulado', label: 'Anuladas', count: counts.anulado }] : []),
  ];

  const getEstadoBadge = (item) => {
    if (item.estado === 'pagado') return { color: 'green', label: 'Pagado' };
    if (item.estado === 'anulado') return { color: 'gray', label: 'Anulado' };
    if (item.estado === 'vencido' || (item.diasVencido > 0 && Number(item.saldoPendiente) > 0.005)) {
      return { color: 'red', label: 'Vencido' };
    }
    if (item.estado === 'parcial') return { color: 'amber', label: 'Parcial' };
    return { color: 'amber', label: 'Pendiente' };
  };

  return (
    <div className="space-y-4">
      <FinancialPageHeader
        icon={ArrowUpCircle}
        title="Cuentas por Pagar (CxP)"
        description="Obligaciones comerciales con proveedores y retenciones tributarias"
        badge={`${resumen.conteo} obligaciones`}
        badgeColor="amber"
        actions={
          <div className="flex items-center gap-2">
            <UiButton onClick={cargar} size="2" color="gray" variant="outline" className="flex items-center gap-1.5" title="Actualizar">
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Actualizar</span>
            </UiButton>
            <UiButton onClick={handleExportCsv} size="2" color="gray" variant="outline" className="flex items-center gap-1.5">
              <Download size={14} /> Exportar CSV
            </UiButton>
          </div>
        }
      />

      {/* 1. KPIs PRINCIPALES (Brevo Flat Design) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Obligaciones */}
        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Obligaciones</span>
            <div className="w-8 h-8 rounded-xl bg-[#e8fedf] text-[#004227] flex items-center justify-center shrink-0">
              <BookOpen size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#1b1b1b] tracking-tight">
              {formatCurrency(resumen.totalObligaciones)}
            </div>
            <span className="text-[11px] text-[#666666] font-medium">Saldo pendiente total</span>
          </div>
        </div>

        {/* Vencidas */}
        <div
          className={`rounded-2xl p-4 flex flex-col justify-between gap-2 border ${
            resumen.totalVencido > 0 ? 'bg-[#fff0f5] border-[#fbc6d9]' : 'bg-white border-[#e3e3e3]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Vencidas</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                resumen.totalVencido > 0 ? 'bg-[#ffe4ed] text-[#851b40]' : 'bg-[#f0fdf4] text-[#0b996f]'
              }`}
            >
              <AlertTriangle size={15} />
            </div>
          </div>
          <div>
            <div
              className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums tracking-tight ${
                resumen.totalVencido > 0 ? 'text-[#851b40]' : 'text-[#1b1b1b]'
              }`}
            >
              {formatCurrency(resumen.totalVencido)}
            </div>
            <span className={`text-[11px] font-medium ${resumen.totalVencido > 0 ? 'text-[#851b40]' : 'text-[#0b996f]'}`}>
              {counts.vencido > 0 ? `${counts.vencido} doc(s) con mora` : 'Sin obligaciones vencidas'}
            </span>
          </div>
        </div>

        {/* Pagado */}
        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Pagado</span>
            <div className="w-8 h-8 rounded-xl bg-[#e8fedf] text-[#0b996f] flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#004227] tracking-tight">
              {formatCurrency(resumen.totalPagado)}
            </div>
            <span className="text-[11px] text-[#666666] font-medium">{counts.pagado} liquidada(s)</span>
          </div>
        </div>

        {/* Ret. Fuente */}
        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Ret. Fuente</span>
            <div className="w-8 h-8 rounded-xl bg-[#fcfbe7] text-[#866308] border border-[#f0df8a] flex items-center justify-center shrink-0">
              <Receipt size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#866308] tracking-tight">
              {formatCurrency(resumen.totalRetencionFuente)}
            </div>
            <span className="text-[11px] text-[#666666] font-medium">Impuesto a la Renta</span>
          </div>
        </div>

        {/* Ret. IVA */}
        <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 flex flex-col justify-between gap-2 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Ret. IVA</span>
            <div className="w-8 h-8 rounded-xl bg-[#fafafa] text-[#1b1b1b] border border-[#e3e3e3] flex items-center justify-center shrink-0">
              <Wallet size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-[#1b1b1b] tracking-tight">
              {formatCurrency(resumen.totalRetencionIva)}
            </div>
            <span className="text-[11px] text-[#666666] font-medium">Retenciones de IVA</span>
          </div>
        </div>
      </div>

      {/* 2. ANTIGÜEDAD DE SALDOS (Clickable Brevo Buckets) */}
      <div className="bg-white border border-[#e3e3e3] rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-[#0b996f]" />
            <h3 className="text-sm font-bold text-[#1b1b1b]">Antigüedad de Saldos</h3>
            <span className="text-xs text-[#666666] hidden sm:inline">
              · Clic en un rango para filtrar obligaciones pendientes
            </span>
          </div>
          {agingFilter && (
            <button
              type="button"
              onClick={() => setAgingFilter('')}
              className="text-xs font-semibold text-[#0b996f] hover:text-[#004227] flex items-center gap-1 cursor-pointer"
            >
              <X size={12} /> Quitar rango ({agingFilter} días)
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(aging).map(([key, bucket]) => {
            const meta = AGING_META[key] || AGING_META['31-60'];
            const isSelected = agingFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAgingFilter((prev) => (prev === key ? '' : key))}
                className={`text-left rounded-xl p-3.5 border transition-all cursor-pointer ${meta.bg} ${meta.border} ${
                  isSelected ? meta.activeRing : 'hover:border-[#0b996f]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className={`text-xs font-bold ${meta.titleText}`}>{meta.label}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.tagBg}`}>
                    {meta.tag}
                  </span>
                </div>
                <div className={`text-lg sm:text-xl font-extrabold font-mono tabular-nums ${meta.amountText}`}>
                  {formatCurrency(bucket.total)}
                </div>
                <div className="text-[11px] text-[#666666] font-medium mt-0.5">
                  {bucket.count} {bucket.count === 1 ? 'documento' : 'documentos'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BARRA DE FILTROS UNIFICADA (Píldoras + Búsqueda + Rango de fechas compacto) */}
      <div className="bg-white border border-[#e3e3e3] rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Píldoras de estado */}
          <div className="flex flex-wrap items-center gap-1 bg-[#f4f4f5] p-1 rounded-xl">
            {statusTabs.map((tab) => {
              const active = estado === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEstado(tab.id)}
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

          {/* Buscador */}
          <div className="relative flex-1 lg:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proveedor, RUC o N° documento..."
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

        {/* Rango de fechas compacto en una sola línea */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#efefef] text-xs text-[#666666]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#1b1b1b] flex items-center gap-1.5">
              <Calendar size={13} className="text-[#0b996f]" /> Fecha de emisión:
            </span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              aria-label="Fecha desde"
              className="w-[144px] py-1.5 px-2.5 bg-[#fafafa] border border-[#e3e3e3] rounded-lg text-xs text-[#1b1b1b] focus:outline-hidden focus:border-[#0b996f]"
            />
            <span className="text-[#666666]">hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              aria-label="Fecha hasta"
              className="w-[144px] py-1.5 px-2.5 bg-[#fafafa] border border-[#e3e3e3] rounded-lg text-xs text-[#1b1b1b] focus:outline-hidden focus:border-[#0b996f]"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-[#666666]">
              Mostrando <strong className="text-[#1b1b1b]">{filteredItems.length}</strong> de {allItems.length}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="py-1 px-2.5 rounded-lg bg-[#f4f4f5] hover:bg-[#e8fedf] text-[#1b1b1b] hover:text-[#004227] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X size={12} /> Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. LISTADO PRINCIPAL (Tabla en escritorio + Tarjetas en móvil) */}
      <div className="bg-white border border-[#e3e3e3] rounded-2xl overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-14 px-4 space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-[#fafafa] border border-[#e3e3e3] flex items-center justify-center mx-auto text-[#666666]">
              <FileText size={24} />
            </div>
            <h4 className="text-sm font-bold text-[#1b1b1b]">
              {hasActiveFilters ? 'No hay cuentas por pagar con estos filtros' : 'No hay cuentas por pagar registradas'}
            </h4>
            <p className="text-xs text-[#666666] max-w-md mx-auto">
              {hasActiveFilters
                ? 'Ajusta el estado, rango de fechas o búsqueda para ver otras obligaciones.'
                : 'Las obligaciones con proveedores aparecen aquí automáticamente cuando registras compras a crédito o facturas por pagar.'}
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
            {/* Vista Móvil (Tarjetas) */}
            <div className="divide-y divide-[#efefef] md:hidden">
              {filteredItems.map((item) => {
                const abonado = (item.abonos || []).reduce((s, p) => s + Number(p.monto || 0), 0);
                const badge = getEstadoBadge(item);
                const canPay = item.estado === 'pendiente' || item.estado === 'parcial' || item.estado === 'vencido';
                return (
                  <div
                    key={item.id}
                    className={`p-4 space-y-2.5 ${item.diasVencido > 90 && canPay ? 'bg-[#fff0f5]/60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#1b1b1b] truncate">
                          {item.tercero?.nombre || 'Proveedor'}
                        </div>
                        <div className="text-[11px] font-mono text-[#666666]">
                          {item.tercero?.ruc || '-'} · {item.factura?.tipo || 'Doc'} {item.factura?.numero || ''}
                        </div>
                      </div>
                      <Badge variant="soft" color={badge.color} size="1">
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-[#fafafa] border border-[#efefef] rounded-xl p-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-[#666666] block">Monto</span>
                        <span className="font-mono font-bold text-[#1b1b1b]">
                          {formatCurrency(item.factura?.montoTotal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#666666] block">Abonado</span>
                        <span className="font-mono font-bold text-[#0b996f]">{formatCurrency(abonado)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#666666] block">Saldo</span>
                        <span className="font-mono font-extrabold text-[#866308]">
                          {formatCurrency(item.saldoPendiente)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#666666]">
                      <span>
                        Emisión: {formatDate(item.factura?.fecha)} · Vence: {formatDate(item.factura?.fechaVencimiento)}
                      </span>
                      {canPay && (
                        <UiButton
                          variant="solid"
                          color="green"
                          size="1"
                          onClick={() => setSelectedItemForPayment(item)}
                          className="flex items-center gap-1"
                        >
                          <Wallet size={12} /> Pagar
                        </UiButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vista Escritorio (Tabla) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#e3e3e3] text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                    <th className="py-3 px-3.5">Fecha</th>
                    <th className="py-3 px-3.5">Proveedor</th>
                    <th className="py-3 px-3.5">Documento</th>
                    <th className="py-3 px-3.5">Vence</th>
                    <th className="py-3 px-3.5 text-right">Monto</th>
                    <th className="py-3 px-3.5 text-right hidden lg:table-cell">Ret. Fuente</th>
                    <th className="py-3 px-3.5 text-right hidden lg:table-cell">Ret. IVA</th>
                    <th className="py-3 px-3.5 text-right">Abonado</th>
                    <th className="py-3 px-3.5 text-right">Saldo</th>
                    <th className="py-3 px-3.5 text-center">Días</th>
                    <th className="py-3 px-3.5 text-center">Estado</th>
                    <th className="py-3 px-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efefef] text-xs">
                  {filteredItems.map((item) => {
                    const abonado = (item.abonos || []).reduce((s, p) => s + Number(p.monto || 0), 0);
                    const badge = getEstadoBadge(item);
                    const canPay =
                      item.estado === 'pendiente' || item.estado === 'parcial' || item.estado === 'vencido';
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-[#fafafa] transition-colors ${
                          item.diasVencido > 90 && canPay ? 'bg-[#fff0f5]/50' : ''
                        }`}
                      >
                        <td className="py-3 px-3.5 whitespace-nowrap text-[#666666] font-medium">
                          {formatDate(item.factura?.fecha)}
                        </td>
                        <td className="py-3 px-3.5 max-w-[220px]">
                          <div className="font-bold text-[#1b1b1b] truncate" title={item.tercero?.nombre}>
                            {item.tercero?.nombre || 'Proveedor'}
                          </div>
                          <div className="text-[11px] font-mono text-[#666666]">{item.tercero?.ruc || '-'}</div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                            {item.factura?.tipo || 'Factura'}
                          </span>
                          <div className="font-mono font-bold text-[#1b1b1b]">{item.factura?.numero || '-'}</div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap text-[#666666]">
                          {formatDate(item.factura?.fechaVencimiento)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-semibold text-[#1b1b1b] tabular-nums">
                          {formatCurrency(item.factura?.montoTotal)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-[#866308] tabular-nums hidden lg:table-cell">
                          {formatCurrency(item.factura?.retencionFuente)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-[#444444] tabular-nums hidden lg:table-cell">
                          {formatCurrency(item.factura?.retencionIva)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-semibold text-[#0b996f] tabular-nums">
                          {formatCurrency(abonado)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-extrabold text-[#1b1b1b] tabular-nums">
                          {formatCurrency(item.saldoPendiente)}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono">
                          <span
                            className={`font-bold ${
                              item.diasVencido > 90
                                ? 'text-[#851b40]'
                                : item.diasVencido > 30
                                  ? 'text-[#866308]'
                                  : 'text-[#666666]'
                            }`}
                          >
                            {item.diasVencido > 0 ? item.diasVencido : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <Badge variant="soft" color={badge.color} size="1">
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          {canPay ? (
                            <UiButton
                              variant="soft"
                              color="green"
                              size="1"
                              onClick={() => setSelectedItemForPayment(item)}
                              title="Registrar pago a proveedor"
                              className="inline-flex items-center gap-1"
                            >
                              <Wallet size={12} /> Pagar
                            </UiButton>
                          ) : (
                            <span className="text-[11px] text-[#999999]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL PAGO FORMAL A PROVEEDOR */}
      {selectedItemForPayment && (
        <FinancialPaymentModal
          isOpen={!!selectedItemForPayment}
          onClose={() => setSelectedItemForPayment(null)}
          item={selectedItemForPayment}
          type="pago"
          db={db}
          showToast={showToast}
          onConfirm={async (paymentData) => {
            await registrarPago(db, selectedItemForPayment.id, paymentData, usuario);
            cargar();
          }}
        />
      )}
    </div>
  );
}
