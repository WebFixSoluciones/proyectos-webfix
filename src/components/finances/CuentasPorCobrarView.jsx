import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Download, FileText, Wallet, TrendingUp, AlertTriangle, 
  DollarSign, Clock, CheckCircle2, History, ExternalLink, 
  MessageCircle, Plus, X, Calendar, User, Eye, ArrowUpRight
} from 'lucide-react';
import { getCxC, registrarCobro } from '../../services/cxcService';
import { doc, getDoc } from '../../services/financeStore';
import { getAppId } from '../../firebase';
import FinancialPageHeader from './FinancialPageHeader';
import FinancialPaymentModal from './FinancialPaymentModal';
import { createThemedPortal as createPortal } from '../ui/themePortal';

export default function CuentasPorCobrarView({ 
  db, 
  usuario, 
  showToast,
  appId,
  thirdParties = [],
  transactions = [],
  onOpenTransaction = null
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState('todos'); // 'todos' | 'por_cobrar' | 'vencidos' | 'pagados'
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Modales
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCxC(db, {
        search: '',
        estado: 'all',
        fechaDesde,
        fechaHasta
      });
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [db, fechaDesde, fechaHasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`;
  const formatDate = (d) => {
    if (!d) return '-';
    if (d?.toDate) return d.toDate().toLocaleDateString('es-EC');
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('es-EC');
  };

  const getMethodName = (method) => {
    const map = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia Bancaria',
      tarjeta: 'Tarjeta de Crédito',
      tarjeta_credito: 'Tarjeta de Crédito',
      tarjeta_debito: 'Tarjeta de Débito',
      cruce_cuentas: 'Compensación de Cuentas',
      credito: 'Crédito Directo',
      cheque: 'Cheque'
    };
    return map[method] || method || 'Efectivo';
  };

  // Métricas limpias y directas (solo 3 esenciales)
  const metrics = useMemo(() => {
    const active = items.filter(i => i.estado !== 'anulado');
    let totalPorCobrar = 0;
    let countPorCobrar = 0;
    let totalVencido = 0;
    let countVencidos = 0;
    let totalCobrado = 0;
    let countPagados = 0;

    for (const item of active) {
      const saldo = Number(item.saldoPendiente || 0);
      const abonosSum = (item.abonos || []).reduce((s, p) => s + (Number(p.monto) || 0), 0);
      totalCobrado += abonosSum;

      if (saldo > 0.005) {
        totalPorCobrar += saldo;
        countPorCobrar++;
        if (item.diasVencido > 0 || item.estado === 'vencido') {
          totalVencido += saldo;
          countVencidos++;
        }
      } else {
        countPagados++;
      }
    }

    return {
      totalPorCobrar,
      countPorCobrar,
      totalVencido,
      countVencidos,
      totalCobrado,
      countPagados,
      totalDocumentos: active.length
    };
  }, [items]);

  // Filtrado según pestañas y búsqueda
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Filtro de tab
      const saldo = Number(item.saldoPendiente || 0);
      const isVencido = (item.diasVencido > 0 || item.estado === 'vencido') && saldo > 0.005;

      if (statusTab === 'por_cobrar' && saldo <= 0.005) return false;
      if (statusTab === 'vencidos' && !isVencido) return false;
      if (statusTab === 'pagados' && saldo > 0.005) return false;

      // 2. Filtro de búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const clienteNom = (item.tercero?.nombre || '').toLowerCase();
        const clienteRuc = (item.tercero?.ruc || '').toLowerCase();
        const docNum = (item.factura?.numero || '').toLowerCase();
        const docTipo = (item.factura?.tipo || '').toLowerCase();
        if (!clienteNom.includes(term) && !clienteRuc.includes(term) && !docNum.includes(term) && !docTipo.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [items, statusTab, searchTerm]);

  // Abrir RIDE / PDF oficial
  const handleOpenRide = (item) => {
    const currentAppId = appId || getAppId();
    const clave = item.factura?.claveAcceso || '';
    const txId = item.id || '';
    const rideUrl = `${window.location.origin}/#/public/ride?${txId ? `txId=${encodeURIComponent(txId)}&` : ''}claveAcceso=${encodeURIComponent(clave)}&tenantId=${encodeURIComponent(currentAppId)}`;
    window.open(rideUrl, '_blank');
  };

  // Abrir y gestionar comprobante en Facturación
  const handleManageInvoice = async (item) => {
    if (onOpenTransaction) {
      let tx = transactions?.find(t => t.id === item.id || t.documentNumber === item.factura?.numero || (t.claveAcceso && t.claveAcceso === item.factura?.claveAcceso));
      if (!tx && db) {
        try {
          const currentAppId = appId || getAppId();
          const snap = await getDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'finances_transactions', item.id));
          if (snap.exists()) {
            tx = { ...snap.data(), id: snap.id };
          }
        } catch (err) {
          console.error('Error buscando transacción para gestionar:', err);
        }
      }
      if (tx) {
        onOpenTransaction(tx);
        setSelectedItemForDetail(null);
        return;
      }
    }
    handleOpenRide(item);
  };

  // Enviar recordatorio amistoso por WhatsApp
  const handleSendWhatsApp = (item) => {
    const cliente = item.tercero?.nombre || 'Cliente';
    const docNum = item.factura?.numero || item.id;
    const docTipo = item.factura?.tipo === 'nota_venta' ? 'Nota de Venta' : 'Factura';
    const saldo = Number(item.saldoPendiente || 0).toFixed(2);
    const vence = formatDate(item.factura?.fechaVencimiento);
    const msg = `Estimado/a ${cliente}, le recordamos cordialmente que mantiene un saldo pendiente de $${saldo} correspondiente a su ${docTipo} N° ${docNum}${vence !== '-' ? ` con fecha de vencimiento ${vence}` : ''}. Quedamos a su entera disposición para cualquier consulta. ¡Muchas gracias!`;
    
    // Buscar teléfono en ficha de contactos
    const matchedTp = thirdParties.find(t => t.id === item.tercero?.id || t.ruc === item.tercero?.ruc);
    const rawPhone = (matchedTp?.telefono || matchedTp?.phone || matchedTp?.telefonoContacto || item.tercero?.telefono || '').replace(/\D/g, '');
    let finalPhone = '';
    if (rawPhone.length === 10 && rawPhone.startsWith('0')) {
      finalPhone = `593${rawPhone.slice(1)}`;
    } else if (rawPhone.length === 9) {
      finalPhone = `593${rawPhone}`;
    } else if (rawPhone.length >= 10) {
      finalPhone = rawPhone;
    }

    const waUrl = finalPhone 
      ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Exportar CSV
  const handleExportCSV = () => {
    const headers = ['Fecha Emisión', 'Cliente', 'RUC/Cédula', 'Tipo Comprobante', 'N° Documento', 'Vencimiento', 'Monto Total', 'Total Abonado', 'Saldo Pendiente', 'Días Vencido', 'Estado'];
    const rows = filteredItems.map(i => [
      formatDate(i.factura?.fecha),
      i.tercero?.nombre || '',
      i.tercero?.ruc || '',
      i.factura?.tipo || 'factura',
      i.factura?.numero || '',
      formatDate(i.factura?.fechaVencimiento),
      Number(i.factura?.montoTotal || 0).toFixed(2),
      (i.abonos || []).reduce((s, p) => s + (Number(p.monto) || 0), 0).toFixed(2),
      Number(i.saldoPendiente || 0).toFixed(2),
      i.diasVencido || 0,
      i.estado || 'pendiente'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cuentas_por_cobrar_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && items.length === 0) {
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

  if (error) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
        <AlertTriangle size={36} className="text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Error al cargar Cuentas por Cobrar</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
        <button
          onClick={cargar}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. HEADER */}
      <FinancialPageHeader
        icon={TrendingUp}
        title="Cuentas por Cobrar (CxC)"
        description="Gestión integral de cartera, registro de abonos y control de cobros a clientes"
        badge={`${items.length} facturas`}
        badgeColor="blue"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="py-1.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-none transition-all cursor-pointer"
            >
              <Download size={13} />
              <span>Exportar CSV</span>
            </button>
          </div>
        }
      />

      {/* 2. MÉTRICAS CLARAS Y MINIMALISTAS (Solo 3 tarjetas esenciales) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Por Cobrar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Total por Cobrar
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalPorCobrar)}
            </div>
            <span className="text-[11px] font-medium text-blue-600 block">
              {metrics.countPorCobrar} comprobantes pendientes de pago
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Wallet size={22} />
          </div>
        </div>

        {/* Card 2: Cartera Vencida */}
        <div className={`border rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs ${
          metrics.countVencidos > 0 
            ? 'bg-rose-50/50 border-rose-200' 
            : 'bg-white border-slate-200/90'
        }`}>
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Cartera Vencida
            </span>
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
              metrics.countVencidos > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {formatCurrency(metrics.totalVencido)}
            </div>
            <span className={`text-[11px] font-medium block ${
              metrics.countVencidos > 0 ? 'text-rose-700 font-semibold' : 'text-emerald-600'
            }`}>
              {metrics.countVencidos > 0 
                ? `${metrics.countVencidos} facturas vencidas (+ días)` 
                : '✓ Cartera al día, sin vencidos'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            metrics.countVencidos > 0 
              ? 'bg-rose-100 text-rose-600 border-rose-200' 
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Card 3: Total Cobrado / Recaudado */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Cobros Recaudados
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
              {formatCurrency(metrics.totalCobrado)}
            </div>
            <span className="text-[11px] font-medium text-slate-500 block">
              {metrics.countPagados} facturas totalmente liquidadas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS & PESTAÑAS RÁPIDAS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Píldoras de estado */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'todos', label: 'Todos', count: metrics.totalDocumentos },
              { id: 'por_cobrar', label: 'Por Cobrar', count: metrics.countPorCobrar, highlight: true },
              { id: 'vencidos', label: 'Vencidos', count: metrics.countVencidos, alert: metrics.countVencidos > 0 },
              { id: 'pagados', label: 'Pagados', count: metrics.countPagados },
            ].map(tab => {
              const active = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    active 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    active 
                      ? 'bg-slate-100 text-slate-800' 
                      : tab.alert 
                        ? 'bg-rose-100 text-rose-700' 
                        : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Buscador rápido */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, RUC, N° documento..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Filtros de fechas opcionales (colapsados de forma limpia) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Calendar size={13} className="text-slate-400" /> Rango de Fecha:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span>hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            {(fechaDesde || fechaHasta) && (
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                Limpiar fechas
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. TABLA PRINCIPAL DE CUENTAS POR COBRAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText size={40} className="text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No se encontraron cuentas por cobrar</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusTab !== 'todos' || fechaDesde 
                ? 'No hay registros que coincidan con los filtros seleccionados.' 
                : 'Todas las facturas a crédito o notas de venta están registradas y liquidadas.'}
            </p>
            {(searchTerm || statusTab !== 'todos' || fechaDesde) && (
              <button
                onClick={() => { setSearchTerm(''); setStatusTab('todos'); setFechaDesde(''); setFechaHasta(''); }}
                className="mt-2 py-1 px-3 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3.5">Fecha</th>
                  <th className="py-3 px-3.5">Cliente</th>
                  <th className="py-3 px-3.5">Documento</th>
                  <th className="py-3 px-3.5">Vencimiento</th>
                  <th className="py-3 px-3.5 text-right">Monto</th>
                  <th className="py-3 px-3.5 text-right">Abonado</th>
                  <th className="py-3 px-3.5 text-right">Saldo</th>
                  <th className="py-3 px-3.5 text-center">Estado</th>
                  <th className="py-3 px-4 text-center min-w-[150px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item) => {
                  const saldo = Number(item.saldoPendiente || 0);
                  const montoTotal = Number(item.factura?.montoTotal || 0);
                  const abonado = (item.abonos || []).reduce((s, p) => s + (Number(p.monto) || 0), 0);
                  const isVencido = (item.diasVencido > 0 || item.estado === 'vencido') && saldo > 0.005;
                  const isPagado = saldo <= 0.005;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isVencido ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Fecha Emisión */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {formatDate(item.factura?.fecha)}
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-3.5 max-w-[220px]">
                        <div className="font-bold text-slate-900 truncate" title={item.tercero?.nombre}>
                          {item.tercero?.nombre || 'Cliente General'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {item.tercero?.ruc || '9999999999999'}
                        </div>
                      </td>

                      {/* Documento */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {item.factura?.tipo === 'nota_venta' ? 'Nota Venta' : 'Factura'}
                        </span>
                        <div className="font-mono font-bold text-slate-900">
                          {item.factura?.numero || item.id}
                        </div>
                      </td>

                      {/* Vencimiento & Alerta */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="text-slate-700">
                          {formatDate(item.factura?.fechaVencimiento)}
                        </div>
                        {isVencido ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200/60 mt-0.5">
                            <Clock size={10} /> Vencido {item.diasVencido}d
                          </span>
                        ) : saldo > 0 ? (
                          <span className="text-[10px] text-slate-400 block">
                            En plazo
                          </span>
                        ) : null}
                      </td>

                      {/* Monto Total */}
                      <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(montoTotal)}
                      </td>

                      {/* Abonado */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(abonado)}
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="py-3 px-3.5 text-right font-mono font-extrabold">
                        <span className={saldo > 0 ? 'text-blue-700' : 'text-slate-400'}>
                          {formatCurrency(saldo)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {isPagado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-600" /> Pagado
                          </span>
                        ) : isVencido ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle size={11} className="text-rose-600" /> Vencido
                          </span>
                        ) : abonado > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Parcial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* ACCIONES (Siempre visibles para cada fila) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Botón Registrar Abono */}
                          {saldo > 0.005 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedItemForPayment(item)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                              title="Registrar un abono o pago a esta factura"
                            >
                              <Plus size={13} strokeWidth={2.5} />
                              <span>Abonar</span>
                            </button>
                          ) : (
                            <span 
                              className="px-2 py-1 rounded-xl bg-slate-100 text-slate-400 text-[11px] font-medium flex items-center gap-1 cursor-default"
                              title="Factura pagada en su totalidad"
                            >
                              <CheckCircle2 size={12} className="text-emerald-500" /> Liquidado
                            </span>
                          )}

                          {/* 2. Botón Ver Historial de Movimientos / Abonos */}
                          <button
                            type="button"
                            onClick={() => setSelectedItemForDetail(item)}
                            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs flex items-center justify-center transition-colors cursor-pointer"
                            title="Ver historial de abonos y movimientos de este comprobante"
                          >
                            <History size={14} className="text-slate-600" />
                          </button>

                          {/* 3. Botón Ver Comprobante / RIDE */}
                          <button
                            type="button"
                            onClick={() => handleOpenRide(item)}
                            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 hover:border-blue-200 text-xs flex items-center justify-center transition-colors cursor-pointer"
                            title="Ver factura oficial / RIDE"
                          >
                            <FileText size={14} className="text-blue-600" />
                          </button>

                          {/* 4. Botón WhatsApp Recordatorio (solo si tiene saldo pendiente) */}
                          {saldo > 0.005 && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(item)}
                              className="p-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center transition-colors cursor-pointer"
                              title="Enviar recordatorio de cobro por WhatsApp"
                            >
                              <MessageCircle size={14} className="text-emerald-600" />
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

      {/* 5. MODAL FORMAL DE REGISTRO DE ABONO */}
      {selectedItemForPayment && (
        <FinancialPaymentModal
          isOpen={!!selectedItemForPayment}
          onClose={() => setSelectedItemForPayment(null)}
          item={selectedItemForPayment}
          type="cobro"
          db={db}
          showToast={showToast}
          onConfirm={async (paymentData) => {
            await registrarCobro(db, selectedItemForPayment.id, paymentData, usuario);
            showToast?.('Abono registrado exitosamente.', 'success');
            cargar();
          }}
        />
      )}

      {/* 6. MODAL DETALLE Y MOVIMIENTOS DE LA CUENTA */}
      {selectedItemForDetail && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedItemForDetail(null)}
        >
          <div 
            className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="px-5 py-4 border-b border-slate-200/90 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Movimientos y Abonos de la Factura
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedItemForDetail.factura?.tipo === 'nota_venta' ? 'Nota de Venta' : 'Factura'} N° {selectedItemForDetail.factura?.numero || selectedItemForDetail.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForDetail(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Información del Cliente */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Cliente:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedItemForDetail.tercero?.nombre || 'Consumidor Final'}</span>
                  <span className="text-slate-500 font-mono block">RUC: {selectedItemForDetail.tercero?.ruc || '9999999999999'}</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-slate-400 font-medium block">Fecha Emisión:</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedItemForDetail.factura?.fecha)}</span>
                  <span className="text-slate-500 block">Vencimiento: {formatDate(selectedItemForDetail.factura?.fechaVencimiento)}</span>
                </div>
              </div>

              {/* 3 Métricas del comprobante */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Monto Total</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-slate-900">
                    {formatCurrency(selectedItemForDetail.factura?.montoTotal)}
                  </div>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase">Total Abonado</span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700">
                    {formatCurrency((selectedItemForDetail.abonos || []).reduce((s, p) => s + (Number(p.monto) || 0), 0))}
                  </div>
                </div>
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-blue-700 uppercase">Saldo Pendiente</span>
                  <div className={`text-lg sm:text-xl font-bold font-mono ${
                    Number(selectedItemForDetail.saldoPendiente || 0) > 0 ? 'text-blue-700' : 'text-slate-400'
                  }`}>
                    {formatCurrency(selectedItemForDetail.saldoPendiente)}
                  </div>
                </div>
              </div>

              {/* Tabla de Historial de Abonos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-500" />
                    Historial de Cobros y Abonos Aplicados
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {(selectedItemForDetail.abonos || []).length} abonos
                  </span>
                </div>

                {(selectedItemForDetail.abonos || []).length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl space-y-1">
                    <p className="text-xs font-medium text-slate-600">No se han registrado abonos aún.</p>
                    <p className="text-[11px] text-slate-400">Todo el monto se encuentra pendiente de cobro.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Método</th>
                          <th className="py-2.5 px-3">Referencia / Banco</th>
                          <th className="py-2.5 px-3">Notas</th>
                          <th className="py-2.5 px-3 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItemForDetail.abonos.map((abono, idx) => (
                          <tr key={abono.id || idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                              {formatDate(abono.fecha)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-800">
                                {getMethodName(abono.metodoPago)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {abono.referencia || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 max-w-[150px] truncate" title={abono.notas}>
                              {abono.notas || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(abono.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="px-5 py-3.5 border-t border-slate-200/90 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenRide(selectedItemForDetail)}
                  className="py-1.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileText size={13} className="text-blue-600" />
                  <span>Ver RIDE</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleManageInvoice(selectedItemForDetail)}
                  className="py-1.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ExternalLink size={13} className="text-slate-600" />
                  <span>Gestionar en Facturación</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {Number(selectedItemForDetail.saldoPendiente || 0) > 0.005 && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedItemForDetail;
                      setSelectedItemForDetail(null);
                      setSelectedItemForPayment(target);
                    }}
                    className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Registrar Nuevo Abono</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedItemForDetail(null)}
                  className="py-1.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
