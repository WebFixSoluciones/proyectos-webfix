import { doc, getDoc, setDoc, collection, addDoc, getDocs, writeBatch } from "firebase/firestore";

// Helper para redondear a 4 decimales en cálculos de costo
const round4 = (num) => Math.round((num + Number.EPSILON) * 10000) / 10000;
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Registra un movimiento de Kardex y actualiza la existencia/costo del producto.
 * Si el producto es un Combo, desglosa y afecta las existencias de sus componentes.
 */
export async function registrarMovimientoKardex(db, appId, {
  productId,
  type, // 'entrada' | 'salida' | 'ajuste_ingreso' | 'ajuste_egreso' | 'transferencia_entrada' | 'transferencia_salida'
  quantity,
  cost,
  price,
  concept,
  referenceId,
  bodega = "Bodega Central"
}) {
  const qty = Number(quantity) || 0;
  const unitCost = Number(cost) || 0;
  const unitPrice = Number(price) || 0;
  
  if (qty <= 0) return;

  const productRef = doc(db, "artifacts", appId, "public", "data", "finances_products", productId);
  const productSnap = await getDoc(productRef);

  if (!productSnap.exists()) {
    throw new Error(`El producto con ID ${productId} no existe.`);
  }

  const productData = productSnap.data();

  // Si el producto es un Combo, desglosamos y registramos movimientos para sus componentes
  if (productData.productCategoryType === 'combo' && productData.comboItems && productData.comboItems.length > 0) {
    for (const item of productData.comboItems) {
      // La cantidad a descontar es la cantidad del combo vendida multiplicada por la cantidad del componente en el combo
      const componentQty = qty * (Number(item.quantity) || 1);
      
      // Consultamos el componente para obtener su costo actual
      const compRef = doc(db, "artifacts", appId, "public", "data", "finances_products", item.productId);
      const compSnap = await getDoc(compRef);
      let compCost = 0;
      if (compSnap.exists()) {
        compCost = Number(compSnap.data().cost) || 0;
      }

      await registrarMovimientoKardex(db, appId, {
        productId: item.productId,
        type,
        quantity: componentQty,
        cost: compCost, // Usar el costo actual del componente
        price: 0, // En el desglose del combo, el precio se imputa al combo principal
        concept: `${concept} (Componente de Combo: ${productData.name})`,
        referenceId,
        bodega
      });
    }
    return; // No alteramos stock físico del combo principal ya que es una entidad virtual
  }

  const currentStock = Number(productData.stock) || 0;
  const currentCost = Number(productData.cost) || 0;

  let previousStock = currentStock;
  let previousAvgCost = currentCost;
  let newStock = currentStock;
  let newAvgCost = currentCost;

  const isEntry = ['entrada', 'ajuste_ingreso', 'transferencia_entrada'].includes(type);

  if (isEntry) {
    newStock = currentStock + qty;
    // Fórmula de Costo Promedio Ponderado (CPP)
    const totalPreviousValue = currentStock * currentCost;
    const totalEntryValue = qty * unitCost;
    newAvgCost = newStock > 0 ? round4((totalPreviousValue + totalEntryValue) / newStock) : 0;
  } else {
    // Es una salida
    newStock = Math.max(0, currentStock - qty);
    // En las salidas el costo promedio ponderado no se altera
    newAvgCost = currentCost;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const kardexId = `kdx_${now.getTime()}_${Math.random().toString(36).substr(2, 5)}`;
  const kardexData = {
    id: kardexId,
    productId,
    productName: productData.name,
    productSku: productData.sku,
    date: dateStr,
    time: timeStr,
    type,
    quantity: qty,
    cost: unitCost,
    price: unitPrice,
    previousStock,
    previousAvgCost,
    newStock,
    newAvgCost,
    concept,
    referenceId,
    bodega,
    createdAt: now.toISOString()
  };

  // 1. Guardar log en finances_kardex
  await setDoc(doc(db, "artifacts", appId, "public", "data", "finances_kardex", kardexId), kardexData);

  // 2. Actualizar stock y costo en el catálogo
  await setDoc(productRef, {
    stock: newStock,
    cost: newAvgCost,
    updatedAt: now.toISOString()
  }, { merge: true });
}

/**
 * Ejecuta una transferencia de productos entre bodegas (interna) o sucursales (externa).
 */
export async function ejecutarTransferencia(db, appId, {
  productId,
  quantity,
  originSucursal,
  originBodega,
  destSucursal,
  destBodega,
  isExternal = false
}) {
  const qty = Number(quantity) || 0;
  if (qty <= 0) throw new Error("La cantidad a transferir debe ser mayor a cero.");

  const transferId = `trf_${new Date().getTime()}`;
  
  // Registrar salida del origen
  await registrarMovimientoKardex(db, appId, {
    productId,
    type: 'transferencia_salida',
    quantity: qty,
    cost: 0, // se leerá el costo actual en el Kardex
    price: 0,
    concept: `Transferencia ${isExternal ? 'Externa' : 'Interna'} a ${destSucursal || ''} - ${destBodega}`,
    referenceId: transferId,
    bodega: originBodega
  });

  // Registrar entrada en el destino
  // Consultamos el costo del producto para mantenerlo en el destino
  const productRef = doc(db, "artifacts", appId, "public", "data", "finances_products", productId);
  const productSnap = await getDoc(productRef);
  let productCost = 0;
  if (productSnap.exists()) {
    productCost = Number(productSnap.data().cost) || 0;
  }

  await registrarMovimientoKardex(db, appId, {
    productId,
    type: 'transferencia_entrada',
    quantity: qty,
    cost: productCost, // Se transfiere al mismo costo promedio del origen
    price: 0,
    concept: `Transferencia ${isExternal ? 'Externa' : 'Interna'} desde ${originSucursal || ''} - ${originBodega}`,
    referenceId: transferId,
    bodega: destBodega
  });

  // Guardar log de la transferencia
  const transferLog = {
    id: transferId,
    productId,
    quantity: qty,
    originSucursal: originSucursal || '',
    originBodega,
    destSucursal: destSucursal || '',
    destBodega,
    isExternal,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, "artifacts", appId, "public", "data", "finances_transfers", transferId), transferLog);
  return transferId;
}

/**
 * Ejecuta ajustes de inventario (manual, masivo o global/encerar).
 */
export async function ejecutarAjusteInventario(db, appId, {
  tipo, // 'manual' | 'masivo' | 'encerar'
  productos = [], // [{ productId, quantity, cost, type: 'ingreso' | 'egreso', bodega }]
  concept = "Ajuste de Inventario"
}) {
  const now = new Date();
  const adjustmentId = `adj_${now.getTime()}`;

  if (tipo === 'encerar') {
    // Obtener todos los productos y setear su inventario a 0
    const colRef = collection(db, "artifacts", appId, "public", "data", "finances_products");
    const snap = await getDocs(colRef);
    
    for (const d of snap.docs) {
      const prod = d.data();
      if (prod.type === 'producto' && Number(prod.stock) > 0) {
        const qty = Number(prod.stock);
        await registrarMovimientoKardex(db, appId, {
          productId: prod.id,
          type: 'ajuste_egreso',
          quantity: qty,
          cost: Number(prod.cost) || 0,
          price: 0,
          concept: "Encerado Global de Inventario",
          referenceId: adjustmentId,
          bodega: prod.bodega || "Bodega Central"
        });
      }
    }
    return adjustmentId;
  }

  // Ajustes manuales y masivos
  for (const item of productos) {
    const isIngreso = item.type === 'ingreso';
    await registrarMovimientoKardex(db, appId, {
      productId: item.productId,
      type: isIngreso ? 'ajuste_ingreso' : 'ajuste_egreso',
      quantity: item.quantity,
      cost: item.cost || 0,
      price: 0,
      concept: `${concept} (${tipo === 'manual' ? 'Manual' : 'Masivo'})`,
      referenceId: adjustmentId,
      bodega: item.bodega || "Bodega Central"
    });
  }

  return adjustmentId;
}
