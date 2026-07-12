/**
 * Motor de cálculo unificado para POS y Ventas Administrativas.
 * 
 * Implementa los 9 pasos del motor de cálculo considerando tax_mode,
 * prorrateo proporcional de descuentos generales y cálculo correcto de IVA.
 * 
 * @param {Array} items - Listado de líneas de productos/servicios. Cada línea tiene:
 *   - price (precio digitado)
 *   - quantity (cantidad)
 *   - taxRate (tarifa IVA: 15, 5, 0)
 *   - tax_mode ('EXCLUIDO' | 'INCLUIDO')
 *   - id_descuento_aplicado (FK, nullable)
 *   - id_promocion_aplicada (FK, nullable)
 *   - discount_value (valor del descuento de línea)
 *   - discount_type ('PORCENTAJE' | 'MONTO_FIJO')
 * @param {Object} generalDiscount - Descuento general (alcance VENTA):
 *   - tipo_valor: 'PORCENTAJE' | 'MONTO_FIJO'
 *   - valor: DECIMAL
 *   - id: string
 * @returns {Object} Desglose completo de subtotal, descuentos, base, IVA y total.
 */
export function calculateTransactionTotals(items = [], generalDiscount = null) {
  // Paso 1 a 4 por cada item:
  const processedItems = items.map(item => {
    const precioDigitado = Number(item.price) || 0;
    const cantidad = Number(item.quantity) || 0;
    
    // Normalizar tarifa IVA (ej: 15 o 0.15)
    let tarifaIvaRaw = Number(item.taxRate || item.ivaCategory || 0);
    if (tarifaIvaRaw > 1) {
      tarifaIvaRaw = tarifaIvaRaw / 100; // e.g. 15 -> 0.15
    }
    const tarifaIva = tarifaIvaRaw;

    const taxMode = item.tax_mode || 'EXCLUIDO';

    // Paso 1 - Extraer base sin impuesto
    let precioBaseUnitario = precioDigitado;
    if (taxMode === 'INCLUIDO') {
      precioBaseUnitario = precioDigitado / (1 + tarifaIva);
    }

    // Paso 2 - Subtotal bruto
    const subtotalBruto = cantidad * precioBaseUnitario;

    // Paso 3 - Aplicar descuento de PRODUCTO (si fue seleccionado) sobre subtotal_bruto
    let descuentoLinea = 0;
    if (item.id_descuento_aplicado || item.id_promocion_aplicada) {
      const discVal = Number(item.discount_value) || 0;
      if (item.discount_type === 'PORCENTAJE') {
        descuentoLinea = subtotalBruto * (discVal / 100);
      } else if (item.discount_type === 'MONTO_FIJO') {
        descuentoLinea = discVal;
      }
      descuentoLinea = Math.min(subtotalBruto, descuentoLinea);
    }

    // Paso 4 - Subtotal neto de línea
    const subtotalNetoLinea = subtotalBruto - descuentoLinea;

    return {
      ...item,
      precio_base_unitario: precioBaseUnitario,
      subtotal_bruto: subtotalBruto,
      monto_descuento_linea: descuentoLinea,
      subtotal_neto_linea: subtotalNetoLinea,
      tarifa_iva: tarifaIva
    };
  });

  // Paso 5 - subtotal_general_neto = suma(subtotal_neto_linea de todas las líneas)
  const subtotalGeneralNeto = processedItems.reduce((acc, item) => acc + item.subtotal_neto_linea, 0);

  // Paso 6 - descuento_venta = calcular sobre subtotal_general_neto (% o monto fijo)
  let montoDescuentoVenta = 0;
  if (generalDiscount && (generalDiscount.activo !== false)) {
    const val = Number(generalDiscount.valor) || 0;
    if (generalDiscount.tipo_valor === 'PORCENTAJE') {
      montoDescuentoVenta = subtotalGeneralNeto * (val / 100);
    } else if (generalDiscount.tipo_valor === 'MONTO_FIJO') {
      montoDescuentoVenta = val;
    }
    montoDescuentoVenta = Math.min(subtotalGeneralNeto, montoDescuentoVenta);
  }

  // Paso 7 & 8 & 9 - Prorratear, calcular IVA y totales por línea
  let totalIva = 0;
  let totalNetoFinal = 0;
  
  const finalItems = processedItems.map(item => {
    let descuentoProrrateado = 0;
    if (subtotalGeneralNeto > 0) {
      const factorProporcion = item.subtotal_neto_linea / subtotalGeneralNeto;
      descuentoProrrateado = montoDescuentoVenta * factorProporcion;
    }
    
    const subtotalNetoLineaFinal = Math.max(0, item.subtotal_neto_linea - descuentoProrrateado);
    
    // Paso 8 - IVA por línea (siempre sobre la base neta FINAL, después de todos los descuentos)
    const ivaLinea = subtotalNetoLineaFinal * item.tarifa_iva;
    
    // Paso 9 - Totales
    const totalLinea = subtotalNetoLineaFinal + ivaLinea;

    totalIva += ivaLinea;
    totalNetoFinal += subtotalNetoLineaFinal;

    return {
      ...item,
      descuento_prorrateado: descuentoProrrateado,
      subtotal_neto_linea_final: subtotalNetoLineaFinal,
      iva_linea: ivaLinea,
      total_linea: totalLinea
    };
  });

  const totalVenta = totalNetoFinal + totalIva;

  return {
    items: finalItems,
    subtotalBruto: processedItems.reduce((acc, item) => acc + item.subtotal_bruto, 0),
    descuentosProducto: processedItems.reduce((acc, item) => acc + item.monto_descuento_linea, 0),
    subtotalGeneralNeto: subtotalGeneralNeto,
    descuentoVenta: montoDescuentoVenta,
    baseImponible: totalNetoFinal,
    ivaValor: totalIva,
    total: totalVenta
  };
}
