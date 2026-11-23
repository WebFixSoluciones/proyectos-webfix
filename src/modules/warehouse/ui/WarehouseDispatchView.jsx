import { useEffect, useMemo, useState } from 'react';
import {
  Truck, PackageCheck, ScanBarcode, Printer, Plus, Search,
  CheckCircle2, Clock, AlertCircle, X
} from 'lucide-react';
import {
  DISPATCH_STATUS,
  DISPATCH_STATUS_META,
  matchDispatchLineByBarcode
} from '../domain/dispatchModel.js';
import {
  subscribeDispatches,
  ensureDispatchForSale,
  recordWarehouseDispatch,
  markDispatchDelivered
} from '../infrastructure/DispatchRepository.js';
import BarcodeScannerModal from './BarcodeScannerModal.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { canPerformAction } from '../../rbac/application/rbacService.js';

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const BADGE_CLASSES = {
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  blue: 'bg-blue-50 text-blue-800 border-blue-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  green: 'bg-green-50 text-green-800 border-green-200',
  red: 'bg-rose-50 text-rose-800 border-rose-200'
};

/**
 * Módulo de Despachos Posteriores de Bodega.
 * Permite generar órdenes de despacho a partir de facturas/notas de venta,
 * verificar ítems escaneando códigos de barras, despachar parcial o totalmente,
 * registrar transportista/guía de remisión e imprimir la nota de entrega.
 */
export default function WarehouseDispatchView({
  transactions = [],
  warehouses = [],
  companyName = '',
  showToast
}) {
  const { userProfile, currentUser } = useAuth();
  const canDispatch = canPerformAction(userProfile, 'despachar_bodega');
  const operatorName = userProfile?.name || currentUser?.displayName || currentUser?.email || 'Bodeguero';

  const [dispatches, setDispatches] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [deltaByLine, setDeltaByLine] = useState({});
  const [carrier, setCarrier] = useState('');
  const [guiaRemisionNumber, setGuiaRemisionNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showCreateFromSale, setShowCreateFromSale] = useState(false);
  const [saleSearch, setSaleSearch] = useState('');

  useEffect(() => {
    const unsub = subscribeDispatches((list) => {
      setDispatches(list);
      setActiveOrder((prev) => (prev ? list.find((x) => x.id === prev.id) || prev : null));
    });
    return () => unsub();
  }, []);

  const dispatchSaleIds = useMemo(() => new Set(dispatches.map((d) => d.saleId)), [dispatches]);

  // Ventas físicas elegibles que aún no tienen orden de despacho
  const eligibleSales = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    return (transactions || [])
      .filter((tx) => {
        if (!tx || tx.type !== 'ingreso') return false;
        if (['anulado', 'borrador', 'rechazado', 'no_autorizado', 'devuelto'].includes(tx.sriStatus)) return false;
        if (dispatchSaleIds.has(tx.id)) return false;
        const hasPhysical = Array.isArray(tx.items) && tx.items.some(
          (i) => i && i.type !== 'SERVICE' && i.inventoryType !== 'VIRTUAL' && Number(i.quantity || i.cantidad || 0) > 0
        );
        if (!hasPhysical) return false;
        if (!q) return true;
        return (
          String(tx.documentNumber || '').toLowerCase().includes(q) ||
          String(tx.thirdPartyName || tx.thirdParty || '').toLowerCase().includes(q) ||
          String(tx.thirdPartyRuc || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [transactions, dispatchSaleIds, saleSearch]);

  const filteredDispatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dispatches.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(d.documentNumber || '').toLowerCase().includes(q) ||
        String(d.clientName || '').toLowerCase().includes(q) ||
        String(d.clientRuc || '').toLowerCase().includes(q) ||
        String(d.branchName || '').toLowerCase().includes(q) ||
        String(d.guiaRemisionNumber || '').toLowerCase().includes(q)
      );
    });
  }, [dispatches, statusFilter, search]);

  const counts = useMemo(() => ({
    pending: dispatches.filter((d) => d.status === DISPATCH_STATUS.PENDIENTE || d.status === DISPATCH_STATUS.EN_PREPARACION).length,
    partial: dispatches.filter((d) => d.status === DISPATCH_STATUS.DESPACHADO_PARCIAL).length,
    done: dispatches.filter((d) => d.status === DISPATCH_STATUS.DESPACHADO || d.status === DISPATCH_STATUS.ENTREGADO).length
  }), [dispatches]);

  const openOrder = (order) => {
    setActiveOrder(order);
    const init = {};
    (order.items || []).forEach((l) => {
      init[l.lineId] = Number(l.qtyPending) || 0;
    });
    setDeltaByLine(init);
    setCarrier(order.carrier || '');
    setGuiaRemisionNumber(order.guiaRemisionNumber || '');
    setRecipientName(order.recipientName || '');
    setRecipientId(order.recipientId || '');
    setNotes(order.notes || '');
  };

  const handleCreateFromSale = async (sale) => {
    if (!canDispatch) {
      showToast?.('No tienes permisos para generar despachos de bodega.', 'error');
      return;
    }
    try {
      const created = await ensureDispatchForSale(sale, {
        branchId: sale.branchId || warehouses[0]?.id || 'sucursal-central-uuid',
        branchName: sale.bodega || warehouses[0]?.name || 'Bodega Central',
        createdBy: operatorName
      });
      setShowCreateFromSale(false);
      openOrder(created);
      showToast?.(`Orden de despacho creada para ${sale.documentNumber || sale.id}`, 'success');
    } catch (err) {
      showToast?.(err.message || 'No se pudo generar la orden de despacho.', 'error');
    }
  };

  const handleBarcodeMatch = (code) => {
    if (!activeOrder) return;
    const matched = matchDispatchLineByBarcode(activeOrder, code);
    if (!matched) {
      showToast?.(`El código "${code}" no pertenece a esta orden de despacho.`, 'error');
      return;
    }
    const maxPending = Math.max(0, Number(matched.qtyOrdered) - Number(matched.qtyDispatched || 0));
    setDeltaByLine((prev) => {
      const current = Number(prev[matched.lineId] || 0);
      if (current >= maxPending) {
        showToast?.(`${matched.name}: ya está completo (${maxPending}/${maxPending}).`, 'info');
        return prev;
      }
      const next = Math.min(maxPending, current + 1);
      showToast?.(`Verificado: ${matched.name} (${next}/${maxPending})`, 'success');
      return { ...prev, [matched.lineId]: next };
    });
  };

  const handleConfirmDispatch = async (markDelivered = false) => {
    if (!activeOrder || !canDispatch) return;
    setIsSaving(true);
    try {
      const updated = await recordWarehouseDispatch(activeOrder, deltaByLine, {
        by: operatorName,
        carrier,
        guiaRemisionNumber,
        recipientName,
        recipientId,
        notes,
        markDelivered
      });
      setActiveOrder(updated);
      showToast?.(
        updated.status === DISPATCH_STATUS.DESPACHADO_PARCIAL
          ? 'Despacho parcial registrado correctamente.'
          : 'Despacho de bodega confirmado correctamente.',
        'success'
      );
    } catch (err) {
      showToast?.(`Error al registrar despacho: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!activeOrder || !canDispatch) return;
    setIsSaving(true);
    try {
      const updated = await markDispatchDelivered(activeOrder, {
        by: operatorName,
        recipientName,
        recipientId,
        notes
      });
      setActiveOrder(updated);
      showToast?.('Entrega al cliente confirmada.', 'success');
    } catch (err) {
      showToast?.(`Error al confirmar entrega: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintSlip = (order) => {
    const rows = (order.items || [])
      .map(
        (l) => `<tr>
          <td style="padding:6px;border-bottom:1px solid #e2e8f0;font-family:monospace">${escapeHtml(l.sku || l.codigoBarras || '-')}</td>
          <td style="padding:6px;border-bottom:1px solid #e2e8f0">${escapeHtml(l.name)}</td>
          <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace">${l.qtyOrdered}</td>
          <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:700">${l.qtyDispatched}</td>
          <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace">${l.qtyPending}</td>
        </tr>`
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Nota de Despacho ${escapeHtml(order.documentNumber)}</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0f172a;font-size:12px}
      h1{font-size:16px;margin:0 0 4px} .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0;padding:12px;border:1px solid #cbd5e1;border-radius:8px}
      table{width:100%;border-collapse:collapse;margin-top:12px} th{background:#f8fafc;padding:6px;text-align:left;border-bottom:2px solid #cbd5e1}
      .signs{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px} .line{border-top:1px solid #334155;padding-top:6px;text-align:center;font-size:11px}</style></head>
      <body>
        <h1>${escapeHtml(companyName || 'WebFix ERP')} — Comprobante de Despacho de Bodega</h1>
        <div>Comprobante Origen: <strong>${escapeHtml(order.documentNumber)}</strong> • Estado: <strong>${escapeHtml(DISPATCH_STATUS_META[order.status]?.label || order.status)}</strong></div>
        <div class="meta">
          <div><strong>Cliente:</strong> ${escapeHtml(order.clientName)}<br/><strong>RUC/CI:</strong> ${escapeHtml(order.clientRuc)}</div>
          <div><strong>Bodega:</strong> ${escapeHtml(order.branchName)}<br/><strong>Guía / Transportista:</strong> ${escapeHtml(order.guiaRemisionNumber || '-')} / ${escapeHtml(order.carrier || '-')}</div>
        </div>
        <table><thead><tr><th>SKU/Código</th><th>Descripción</th><th style="text-align:right">Facturado</th><th style="text-align:right">Despachado</th><th style="text-align:right">Pendiente</th></tr></thead><tbody>${rows}</tbody></table>
        ${order.notes ? `<p style="margin-top:12px"><strong>Observaciones:</strong> ${escapeHtml(order.notes)}</p>` : ''}
        <div class="signs">
          <div class="line">Despachado por Bodega (${escapeHtml(operatorName)})</div>
          <div class="line">Recibido conforme (${escapeHtml(order.recipientName || order.clientName)})</div>
        </div>
        <script>window.onload=function(){window.print();};</script>
      </body></html>`;
    const win = window.open('', '_blank', 'width=850,height=650');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Despachos Posteriores de Bodega</h2>
            <p className="text-xs text-slate-500">
              Controla el alistamiento, verificación por código de barras y entrega física posterior a la facturación.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canDispatch}
          onClick={() => setShowCreateFromSale(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1b1b1b] text-white text-xs font-semibold hover:bg-black disabled:opacity-40 cursor-pointer"
        >
          <Plus size={15} />
          <span>Nueva Orden desde Venta ({eligibleSales.length})</span>
        </button>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Pendientes / En Alistamiento</div>
            <div className="text-2xl font-mono font-bold text-amber-700">{counts.pending}</div>
          </div>
          <Clock size={22} className="text-amber-500" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Despachos Parciales</div>
            <div className="text-2xl font-mono font-bold text-orange-700">{counts.partial}</div>
          </div>
          <AlertCircle size={22} className="text-orange-500" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Despachados / Entregados</div>
            <div className="text-2xl font-mono font-bold text-emerald-700">{counts.done}</div>
          </div>
          <PackageCheck size={22} className="text-emerald-600" />
        </div>
      </div>

      {/* Filtros y Tabla */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por # factura, cliente, RUC, bodega o guía..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: DISPATCH_STATUS.PENDIENTE, label: 'Pendientes' },
              { id: DISPATCH_STATUS.DESPACHADO_PARCIAL, label: 'Parciales' },
              { id: DISPATCH_STATUS.DESPACHADO, label: 'Despachados' },
              { id: DISPATCH_STATUS.ENTREGADO, label: 'Entregados' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  statusFilter === tab.id ? 'bg-[#c0ffa5] text-[#004227]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Comprobante</th>
                <th className="py-2.5 px-3 font-semibold">Cliente</th>
                <th className="py-2.5 px-3 font-semibold">Bodega</th>
                <th className="py-2.5 px-3 font-semibold text-right">Avance</th>
                <th className="py-2.5 px-3 font-semibold">Estado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDispatches.map((order) => {
                const ordered = (order.items || []).reduce((s, i) => s + (Number(i.qtyOrdered) || 0), 0);
                const dispatched = (order.items || []).reduce((s, i) => s + (Number(i.qtyDispatched) || 0), 0);
                const meta = DISPATCH_STATUS_META[order.status] || { label: order.status, color: 'amber' };
                return (
                  <tr key={order.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-slate-900">{order.documentNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-EC') : '—'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{order.clientName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{order.clientRuc}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{order.branchName || 'Bodega Central'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                      {dispatched} / {ordered} u.
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${BADGE_CLASSES[meta.color] || BADGE_CLASSES.amber}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openOrder(order)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-semibold cursor-pointer"
                        >
                          {order.status === DISPATCH_STATUS.ENTREGADO ? 'Ver Detalle' : 'Despachar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintSlip(order)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Imprimir Nota de Entrega"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDispatches.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No hay órdenes de despacho en este estado. Crea una desde cualquier venta facturada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear orden desde venta */}
      {showCreateFromSale && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Generar Orden de Despacho desde Venta</h3>
                <p className="text-xs text-slate-500">Selecciona una factura o nota de venta con productos físicos.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateFromSale(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 shrink-0">
              <input
                type="text"
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                placeholder="Buscar factura, nota de venta o cliente..."
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {eligibleSales.map((sale) => (
                <div key={sale.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {sale.documentNumber || sale.id} — {sale.thirdPartyName || sale.thirdParty || 'Consumidor Final'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Fecha: {sale.date || '—'} • Total: ${Number(sale.total || 0).toFixed(2)} • Ítems: {sale.items?.length || 0}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCreateFromSale(sale)}
                    className="px-3 py-1.5 rounded-lg bg-[#1b1b1b] text-white text-xs font-semibold hover:bg-black cursor-pointer"
                  >
                    Crear Despacho
                  </button>
                </div>
              ))}
              {eligibleSales.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-8">
                  Todas las ventas físicas recientes ya cuentan con orden de despacho.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alistamiento y Despacho de Orden */}
      {activeOrder && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="w-full max-w-3xl max-h-[90dvh] flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  Despacho {activeOrder.documentNumber} — {activeOrder.clientName}
                </h3>
                <p className="text-xs text-slate-500">
                  Bodega: {activeOrder.branchName} • Estado: {DISPATCH_STATUS_META[activeOrder.status]?.label || activeOrder.status}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeOrder.status !== DISPATCH_STATUS.ENTREGADO && (
                  <button
                    type="button"
                    onClick={() => {
                      // Iniciar en 0 para conteo por escaneo si se desea, o ir sumando
                      setIsScannerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
                  >
                    <ScanBarcode size={14} />
                    <span>Escanear Ítems</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveOrder(null)}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Producto / Código</th>
                      <th className="py-2 px-3 font-semibold text-right">Facturado</th>
                      <th className="py-2 px-3 font-semibold text-right">Ya Despachado</th>
                      <th className="py-2 px-3 font-semibold text-right">Pendiente</th>
                      <th className="py-2 px-3 font-semibold text-right">Despachar Ahora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activeOrder.items || []).map((line) => (
                      <tr key={line.lineId}>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{line.name}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            SKU: {line.sku || '—'} {line.codigoBarras ? `• Barras: ${line.codigoBarras}` : ''}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{line.qtyOrdered}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">{line.qtyDispatched}</td>
                        <td className="py-2 px-3 text-right font-mono text-amber-700 font-semibold">{line.qtyPending}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={line.qtyPending}
                            step="any"
                            disabled={line.qtyPending <= 0 || !canDispatch}
                            value={deltaByLine[line.lineId] ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(Number(line.qtyPending) || 0, Number(e.target.value) || 0));
                              setDeltaByLine((prev) => ({ ...prev, [line.lineId]: val }));
                            }}
                            className="w-20 h-8 px-2 text-right font-mono rounded-lg border border-slate-300 text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transportista / Courier</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="Ej. Entrega local / Servientrega"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">N° Guía de Remisión (opcional)</label>
                  <input
                    type="text"
                    value={guiaRemisionNumber}
                    onChange={(e) => setGuiaRemisionNumber(e.target.value)}
                    placeholder="001-001-000000001"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Recibe (Nombre)</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Nombre de quien recibe"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cédula de quien recibe</label>
                  <input
                    type="text"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="10 dígitos"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Observaciones de Bodega</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Bultos, sellos, novedades de embalaje..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              {Array.isArray(activeOrder.history) && activeOrder.history.length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase text-slate-500">Trazabilidad</div>
                  {activeOrder.history.slice(-5).map((h, i) => (
                    <div key={i} className="text-[11px] text-slate-700 flex flex-wrap justify-between gap-2">
                      <span><strong>{h.by}</strong>: {h.detail}</span>
                      <span className="font-mono text-slate-400">{h.at ? new Date(h.at).toLocaleString('es-EC') : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => handlePrintSlip(activeOrder)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Printer size={14} />
                <span>Imprimir Nota</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {activeOrder.status === DISPATCH_STATUS.DESPACHADO && canDispatch && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleMarkDelivered}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Confirmar Entrega al Cliente</span>
                  </button>
                )}
                {activeOrder.status !== DISPATCH_STATUS.DESPACHADO && activeOrder.status !== DISPATCH_STATUS.ENTREGADO && canDispatch && (
                  <>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleConfirmDispatch(false)}
                      className="px-4 py-2 rounded-lg bg-[#1b1b1b] text-white text-xs font-semibold hover:bg-black disabled:opacity-40 cursor-pointer"
                    >
                      {isSaving ? 'Guardando...' : 'Registrar Despacho'}
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleConfirmDispatch(true)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"
                    >
                      Despachar y Entregar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeMatch}
        continuous
        title="Verificación de Despacho por Código de Barras"
        subtitle="Escanea cada unidad que sale de bodega para validar el alistamiento."
      />
    </div>
  );
}
