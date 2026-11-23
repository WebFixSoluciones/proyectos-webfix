/**
 * Capa de Dominio — Despachos Posteriores de Bodega (Post-Sale Warehouse Dispatch).
 * Flujo: Venta/Factura -> Orden de Despacho (`PENDIENTE`) -> Picking/Escaneo (`EN_PREPARACION`)
 * -> `DESPACHADO_PARCIAL` -> `DESPACHADO` -> `ENTREGADO`.
 */

export const DISPATCH_STATUS = {
  PENDIENTE: 'PENDIENTE',
  EN_PREPARACION: 'EN_PREPARACION',
  DESPACHADO_PARCIAL: 'DESPACHADO_PARCIAL',
  DESPACHADO: 'DESPACHADO',
  ENTREGADO: 'ENTREGADO',
  ANULADO: 'ANULADO'
};

export const DISPATCH_STATUS_META = {
  PENDIENTE: { label: 'Pendiente Bodega', color: 'amber' },
  EN_PREPARACION: { label: 'En Preparación', color: 'blue' },
  DESPACHADO_PARCIAL: { label: 'Despacho Parcial', color: 'orange' },
  DESPACHADO: { label: 'Despachado', color: 'emerald' },
  ENTREGADO: { label: 'Entregado al Cliente', color: 'green' },
  ANULADO: { label: 'Anulado', color: 'red' }
};

/**
 * Construye una orden de despacho a partir de una transacción de venta existente
 * (solo incluye productos físicos inventariables; excluye servicios).
 */
export function buildDispatchFromSale(sale, {
  branchId = 'sucursal-central-uuid',
  branchName = 'Bodega Central',
  createdBy = '',
  assignedTo = '',
  notes = ''
} = {}) {
  const rawItems = Array.isArray(sale?.items) ? sale.items : [];
  const physicalItems = rawItems
    .filter((item) => item && item.type !== 'SERVICE' && item.inventoryType !== 'VIRTUAL' && Number(item.quantity || item.cantidad || 0) > 0)
    .map((item, idx) => {
      const qtyOrdered = Number(item.quantity ?? item.cantidad ?? 0);
      return {
        lineId: item.lineId || `${item.productId || item.id || idx}_${idx}`,
        productId: item.productId || item.id || '',
        sku: String(item.sku || item.code || '').trim(),
        codigoBarras: String(item.codigoBarras || item.barcode || item.sku || '').trim(),
        name: String(item.name || item.descripcion || 'Producto').trim(),
        qtyOrdered,
        qtyDispatched: 0,
        qtyPending: qtyOrdered,
        scannedCount: 0
      };
    });

  return {
    id: `disp_${sale?.id || Date.now()}`,
    saleId: sale?.id || '',
    documentNumber: sale?.documentNumber || sale?.numeroDocumento || sale?.id || '',
    documentType: sale?.documentType || 'factura',
    claveAcceso: sale?.claveAcceso || '',
    clientId: sale?.thirdPartyId || '',
    clientName: sale?.thirdPartyName || sale?.thirdParty || 'Consumidor Final',
    clientRuc: sale?.thirdPartyRuc || sale?.ruc || '9999999999999',
    deliveryAddress: sale?.deliveryAddress || sale?.direccion || '',
    branchId: sale?.branchId || branchId,
    branchName: sale?.bodega || branchName,
    status: DISPATCH_STATUS.PENDIENTE,
    items: physicalItems,
    stockAlreadyDeducted: Boolean(sale?.inventarioRegistrado),
    carrier: '',
    guiaRemisionNumber: '',
    recipientName: '',
    recipientId: '',
    assignedTo,
    createdBy,
    notes,
    history: [
      {
        at: new Date().toISOString(),
        action: 'CREATED',
        by: createdBy || 'Sistema',
        detail: `Orden de despacho generada desde ${sale?.documentNumber || 'venta'}`
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Aplica un despacho (parcial o total) sobre las líneas de la orden y recalcula el estado.
 */
export function applyDispatchQuantities(dispatchOrder, dispatchDeltaByLine = {}, {
  by = 'Bodeguero',
  carrier = '',
  guiaRemisionNumber = '',
  recipientName = '',
  recipientId = '',
  notes = '',
  markDelivered = false
} = {}) {
  const updatedItems = (dispatchOrder.items || []).map((line) => {
    const rawDelta = Number(dispatchDeltaByLine[line.lineId] ?? 0);
    const safeDelta = Number.isFinite(rawDelta) && rawDelta > 0
      ? Math.min(rawDelta, Math.max(0, Number(line.qtyOrdered) - Number(line.qtyDispatched || 0)))
      : 0;
    const nextDispatched = Number(((Number(line.qtyDispatched) || 0) + safeDelta).toFixed(4));
    const nextPending = Math.max(0, Number((Number(line.qtyOrdered) - nextDispatched).toFixed(4)));
    return {
      ...line,
      qtyDispatched: nextDispatched,
      qtyPending: nextPending
    };
  });

  const totalOrdered = updatedItems.reduce((s, l) => s + (Number(l.qtyOrdered) || 0), 0);
  const totalDispatched = updatedItems.reduce((s, l) => s + (Number(l.qtyDispatched) || 0), 0);
  const totalPending = updatedItems.reduce((s, l) => s + (Number(l.qtyPending) || 0), 0);

  let nextStatus = dispatchOrder.status;
  if (totalPending <= 0.0001 && totalOrdered > 0) {
    nextStatus = markDelivered ? DISPATCH_STATUS.ENTREGADO : DISPATCH_STATUS.DESPACHADO;
  } else if (totalDispatched > 0) {
    nextStatus = DISPATCH_STATUS.DESPACHADO_PARCIAL;
  } else {
    nextStatus = DISPATCH_STATUS.EN_PREPARACION;
  }

  const now = new Date().toISOString();
  return {
    ...dispatchOrder,
    items: updatedItems,
    status: nextStatus,
    carrier: carrier || dispatchOrder.carrier || '',
    guiaRemisionNumber: guiaRemisionNumber || dispatchOrder.guiaRemisionNumber || '',
    recipientName: recipientName || dispatchOrder.recipientName || '',
    recipientId: recipientId || dispatchOrder.recipientId || '',
    notes: notes !== undefined && notes !== '' ? notes : (dispatchOrder.notes || ''),
    dispatchedAt: nextStatus === DISPATCH_STATUS.DESPACHADO || nextStatus === DISPATCH_STATUS.ENTREGADO ? now : dispatchOrder.dispatchedAt || null,
    deliveredAt: nextStatus === DISPATCH_STATUS.ENTREGADO ? now : dispatchOrder.deliveredAt || null,
    updatedAt: now,
    history: [
      ...(Array.isArray(dispatchOrder.history) ? dispatchOrder.history : []),
      {
        at: now,
        action: nextStatus,
        by,
        detail: `Despachado acumulado: ${totalDispatched}/${totalOrdered} unidades${guiaRemisionNumber ? ` (Guía: ${guiaRemisionNumber})` : ''}`
      }
    ]
  };
}

/**
 * Busca una línea de la orden de despacho por código de barras o SKU (para escaneo en bodega).
 */
export function matchDispatchLineByBarcode(dispatchOrder, scannedCode) {
  const code = String(scannedCode || '').trim().toLowerCase();
  if (!code) return null;
  return (dispatchOrder?.items || []).find((line) => {
    const sku = String(line.sku || '').trim().toLowerCase();
    const barcode = String(line.codigoBarras || '').trim().toLowerCase();
    return (barcode && barcode === code) || (sku && sku === code);
  }) || null;
}
