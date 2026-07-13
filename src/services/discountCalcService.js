/**
 * Motor de cálculo unificado para POS y Ventas Administrativas.
 * 
 * Implementa los 9 pasos del motor de cálculo considerando tax_mode,
 * prorrateo proporcional de descuentos generales y cálculo correcto de IVA.
 * Adicionalmente, procesa descuentos dinámicos por volumen (SIEMPRE, POR_CADA, A_PARTIR_DE)
 * y evalúa la vigencia de fechas, días de la semana y horarios.
 */

export function isDiscountScheduleActive(discount) {
  if (!discount || discount.activo === false) return false;

  const now = new Date();

  // 1. Fechas de vigencia (Formato YYYY-MM-DD en Ecuador UTC-5)
  const ecDateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guayaquil' }).format(now);
  if (discount.fecha_inicio && ecDateStr < discount.fecha_inicio) return false;
  if (discount.fecha_fin && ecDateStr > discount.fecha_fin) return false;

  // 2. Días de la semana
  const formatterDay = new Intl.DateTimeFormat('es-EC', { weekday: 'short', timeZone: 'America/Guayaquil' });
  let rawDay = formatterDay.format(now).toUpperCase(); // e.g. "LUN.", "MÁR.", "MIÉ."
  rawDay = rawDay.replace(/\./g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // "MAR", "MIE"

  const dayMap = {
    'LUN': 'LUN', 'MAR': 'MAR', 'MIE': 'MIE', 'JUE': 'JUE', 'VIE': 'VIE', 'SAB': 'SAB', 'DOM': 'DOM',
    'LU': 'LUN', 'MA': 'MAR', 'MI': 'MIE', 'JU': 'JUE', 'VI': 'VIE', 'SA': 'SAB', 'DO': 'DOM',
    'LUNES': 'LUN', 'MARTES': 'MAR', 'MIERCOLES': 'MIE', 'JUEVES': 'JUE', 'VIERNES': 'VIE', 'SABADO': 'SAB', 'DOMINGO': 'DOM'
  };
  const dayOfWeek = dayMap[rawDay] || rawDay;

  if (discount.dias_semana && discount.dias_semana.length > 0) {
    if (!discount.dias_semana.includes(dayOfWeek)) {
      return false;
    }
  }

  // 3. Horarios específicos (Formato HH:MM de 24 horas)
  if (discount.activo_24h === false && discount.hora_inicio && discount.hora_fin) {
    const formatterTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const ecTimeStr = formatterTime.format(now); // e.g. "14:35"
    if (ecTimeStr < discount.hora_inicio || ecTimeStr > discount.hora_fin) {
      return false;
    }
  }

  return true;
}

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

    // Paso 3 - Aplicar descuento de PRODUCTO condicionado por volumen y vigencia
    let descuentoLinea = 0;
    let appliedDiscountId = item.id_descuento_aplicado || '';
    let appliedDiscountValue = Number(item.discount_value) || 0;
    let appliedDiscountType = item.discount_type || 'PORCENTAJE';

    const discount = item.descuento_objeto;
    if (discount && isDiscountScheduleActive(discount)) {
      const metodo = discount.metodo || 'SIEMPRE';
      const cantVol = Number(discount.cantidad_volumen) || 1;
      const discVal = Number(discount.valor) || 0;
      const typeVal = discount.tipo_valor || 'PORCENTAJE';

      appliedDiscountId = discount.id;
      appliedDiscountValue = discVal;
      appliedDiscountType = typeVal;

      if (metodo === 'SIEMPRE') {
        if (typeVal === 'PORCENTAJE') {
          descuentoLinea = subtotalBruto * (discVal / 100);
        } else if (typeVal === 'MONTO_FIJO') {
          descuentoLinea = cantidad * discVal;
        } else if (typeVal === 'SIN_IVA') {
          descuentoLinea = subtotalBruto * (tarifaIva / (1 + tarifaIva));
        }
      } else if (metodo === 'POR_CADA') {
        const grupos = Math.floor(cantidad / cantVol);
        if (grupos > 0) {
          const cantDescontada = grupos * cantVol;
          if (typeVal === 'PORCENTAJE') {
            descuentoLinea = (cantDescontada * precioBaseUnitario) * (discVal / 100);
          } else if (typeVal === 'MONTO_FIJO') {
            descuentoLinea = grupos * discVal;
          } else if (typeVal === 'SIN_IVA') {
            descuentoLinea = (cantDescontada * precioBaseUnitario) * (tarifaIva / (1 + tarifaIva));
          }
        }
      } else if (metodo === 'A_PARTIR_DE') {
        if (cantidad >= cantVol) {
          if (typeVal === 'PORCENTAJE') {
            descuentoLinea = subtotalBruto * (discVal / 100);
          } else if (typeVal === 'MONTO_FIJO') {
            descuentoLinea = discVal; // Descuento único en la línea
          } else if (typeVal === 'SIN_IVA') {
            descuentoLinea = subtotalBruto * (tarifaIva / (1 + tarifaIva));
          }
        }
      }
    } else if (item.id_descuento_aplicado || item.id_promocion_aplicada) {
      // Soporte para descuentos directos legacy o manuales pasados por propiedades básicas
      const discVal = Number(item.discount_value) || Number(item.itemDiscount) || 0;
      if (item.discount_type === 'PORCENTAJE') {
        descuentoLinea = subtotalBruto * (discVal / 100);
      } else if (item.discount_type === 'MONTO_FIJO') {
        descuentoLinea = discVal;
      } else if (item.discount_type === 'SIN_IVA') {
        descuentoLinea = subtotalBruto * (tarifaIva / (1 + tarifaIva));
      }
    }
    
    descuentoLinea = Math.min(subtotalBruto, descuentoLinea);

    // Paso 4 - Subtotal neto de línea
    const subtotalNetoLinea = subtotalBruto - descuentoLinea;

    return {
      ...item,
      id_descuento_aplicado: appliedDiscountId,
      discount_value: appliedDiscountValue,
      discount_type: appliedDiscountType,
      precio_base_unitario: precioBaseUnitario,
      subtotal_bruto: subtotalBruto,
      monto_descuento_linea: descuentoLinea,
      subtotal_neto_linea: subtotalNetoLinea,
      tarifa_iva: tarifaIva
    };
  });

  // Paso 5 - subtotal_general_neto = suma(subtotal_neto_linea de todas las líneas)
  const subtotalGeneralNeto = processedItems.reduce((acc, item) => acc + item.subtotal_neto_linea, 0);

  // Paso 6 - descuento_venta = calcular sobre subtotal_general_neto
  let montoDescuentoVenta = 0;
  if (generalDiscount && isDiscountScheduleActive(generalDiscount)) {
    const val = Number(generalDiscount.valor) || 0;
    if (generalDiscount.tipo_valor === 'PORCENTAJE') {
      montoDescuentoVenta = subtotalGeneralNeto * (val / 100);
    } else if (generalDiscount.tipo_valor === 'MONTO_FIJO') {
      montoDescuentoVenta = val;
    } else if (generalDiscount.tipo_valor === 'SIN_IVA') {
      montoDescuentoVenta = processedItems.reduce((acc, item) => {
        return acc + item.subtotal_neto_linea * (item.tarifa_iva / (1 + item.tarifa_iva));
      }, 0);
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
