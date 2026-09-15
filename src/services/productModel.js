// Shared compatibility boundary for inventory, POS and administrative sales.
export function productKind(product) {
  const type = String(product?.productType || product?.type || product?.productCategoryType || '').toUpperCase();
  if (['SERVICE', 'SERVICIO'].includes(type)) return 'SERVICE';
  if (type === 'COMBO' || product?.comboItems?.length) return 'COMBO';
  if (type === 'SUBPRODUCT') return 'SUBPRODUCT';
  return 'STANDARD';
}

export function tracksStock(product) {
  return productKind(product) !== 'SERVICE' && product?.inventoryType !== 'VIRTUAL';
}

export function isSellable(product) {
  return !!product && product.status !== 'INACTIVE' && product.showInSales !== false;
}

export function taxRateFor(product) {
  const value = product.tarifa_iva ?? ((product.taxRate ?? product.ivaCategory ?? 15) / 100);
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? (rate > 1 ? rate / 100 : rate) : 0;
}

export function normalizeProduct(product, categories = [], brands = []) {
  const rate = taxRateFor(product);
  const base = Number(product.precio_sin_iva ?? product.salePrice ?? product.price ?? product.priceASinImpuesto ?? 0);
  const gross = Number(product.precio_con_iva ?? (Number(product.priceA) > 0 ? product.priceA : base * (1 + rate)));
  return {
    ...product,
    productType: productKind(product),
    type: productKind(product) === 'SERVICE' ? 'servicio' : 'producto',
    price: product.tax_mode === 'INCLUIDO' ? gross : base,
    cost: Number(product.baseCost ?? product.cost ?? 0),
    ivaCategory: rate * 100,
    tarifa_iva: rate,
    tax_mode: product.tax_mode || 'EXCLUIDO',
    precio_sin_iva: base,
    precio_con_iva: gross,
    stock: Number(product.stock ?? 0),
    minStock: Number(product.stockMinimo ?? product.minStock ?? 5),
    categoria: categories.find(c => c.id === product.categoryId)?.name || product.categoria || '',
    marca: brands.find(b => b.id === product.brandId)?.name || product.marca || '',
    bodega: product.bodega || 'Bodega Central',
    codigoBarras: product.codigoBarras || '',
  };
}

export function stockRequirements(items, products) {
  const catalog = new Map(products.map(p => [p.id, p]));
  const required = new Map();
  function visit(id, quantity, parents = []) {
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('La cantidad debe ser mayor a cero.');
    const product = catalog.get(id);
    if (!product) throw new Error('Un producto del carrito ya no está disponible.');
    if (product.status === 'INACTIVE' || (!parents.length && !isSellable(product))) throw new Error(`${product.name}: producto inactivo o no disponible para venta.`);
    if (!tracksStock(product)) return;
    if (parents.includes(id)) throw new Error('El combo contiene una referencia circular.');
    if (productKind(product) === 'COMBO') {
      if (!product.comboItems?.length) throw new Error(`${product.name}: el combo no tiene componentes.`);
      product.comboItems.forEach(c => visit(c.productId, quantity * Number(c.quantity), [...parents, id]));
    } else required.set(id, (required.get(id) || 0) + quantity);
  }
  items.forEach(item => visit(item.productId, Number(item.quantity)));
  return required;
}

export function validateCartStock(items, products) {
  const required = stockRequirements(items, products);
  for (const [id, qty] of required) {
    const product = products.find(p => p.id === id);
    const stock = Number(product.stock ?? 0);
    if (!Number.isFinite(stock) || qty > stock + 0.000001) throw new Error(`${product.name}: stock insuficiente (disponible: ${stock}, solicitado: ${qty}).`);
  }
}

export function makeCartItem(product) {
  const p = normalizeProduct(product);
  if (!Number.isFinite(p.price) || p.price < 0) throw new Error('El precio del producto no es válido.');
  return { productId: p.id, name: p.name, price: p.price, quantity: 1, ivaCategory: p.ivaCategory, tarifa_iva: p.tarifa_iva, tax_mode: p.tax_mode, categoryId: p.categoryId || '', id_descuento_asociado: p.id_descuento_asociado || '', id_descuento_aplicado: '', id_promocion_aplicada: '', discount_value: 0, discount_type: 'PORCENTAJE' };
}
