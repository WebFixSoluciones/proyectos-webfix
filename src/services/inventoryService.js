import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { kardexService } from "../modules/inventory/services/KardexService";

/**
 * Registra un movimiento de Kardex y actualiza la existencia/costo del producto.
 * Redirigido al nuevo KardexService centralizado.
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

  const productRef = doc(db, "artifacts", appId, "public", "data", "inventory_products", productId);
  const productSnap = await getDoc(productRef);

  if (!productSnap.exists()) {
    throw new Error(`El producto con ID ${productId} no existe.`);
  }

  const productData = productSnap.data();

  // Si el producto es un Combo, desglosamos y registramos movimientos para sus componentes
  if ((productData.type === 'COMBO' || productData.productCategoryType === 'combo') && productData.comboItems && productData.comboItems.length > 0) {
    for (const item of productData.comboItems) {
      const componentQty = qty * (Number(item.quantity) || 1);
      
      const compRef = doc(db, "artifacts", appId, "public", "data", "inventory_products", item.productId);
      const compSnap = await getDoc(compRef);
      let compCost = 0;
      if (compSnap.exists()) {
        compCost = Number(compSnap.data().baseCost) || Number(compSnap.data().cost) || 0;
      }

      await registrarMovimientoKardex(db, appId, {
        productId: item.productId,
        type,
        quantity: componentQty,
        cost: compCost,
        price: 0,
        concept: `${concept} (Componente de Combo: ${productData.name})`,
        referenceId,
        bodega
      });
    }
    return;
  }

  // Mapear bodega a branchId
  let branchId = 'sucursal-central-uuid';
  if (bodega.toLowerCase().includes('sur')) {
    branchId = 'sucursal-sur-uuid';
  } else if (bodega.toLowerCase().includes('norte')) {
    branchId = 'sucursal-norte-uuid';
  }

  // Mapear tipos de movimiento al nuevo Kardex
  const isEntry = ['entrada', 'ajuste_ingreso', 'transferencia_entrada'].includes(type);
  const isAnulacion = concept.toLowerCase().includes('anulaci') || concept.toLowerCase().includes('revers');

  let mappedType;
  if (isEntry) {
    mappedType = isAnulacion ? 'CUSTOMER_RETURN' : 'PURCHASE_RECEIPT';
  } else {
    mappedType = isAnulacion ? 'NEGATIVE_ADJUSTMENT' : 'SALE';
  }

  // Llamar al nuevo KardexService unificado
  await kardexService.registerTransaction(
    productId,
    branchId,
    mappedType,
    referenceId || `sys_${Date.now()}`,
    qty,
    isEntry ? (unitCost || unitPrice || 0) : 0 // En salidas, el costo se resuelve por promedio ponderado
  );
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
