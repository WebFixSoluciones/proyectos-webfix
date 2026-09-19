import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiHeading, UiText, UiLabel, UiCard } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiTextarea } from '../ui/controls';
import { useState, useEffect, useRef, Fragment } from 'react';
import { 
  X, Plus, Search, Upload, Package, FileText,
  ShoppingBag, ChevronRight, ChevronLeft,
  CheckCircle2, UserPlus
} from 'lucide-react';
import { doc, setDoc, getDoc, getDocs, collection } from '../../services/financeStore.js';
import { registerTransactionInventory } from '../../services/inventoryLedger';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { normalizeProduct } from '../../services/productModel';
import { getEcuadorDateString } from '../../services/sriService';
import { sincronizarCompra } from '../../services/integracionFinanzasService';
import { getCuentas } from '../../services/bancosService';

export default function PurchaseForm({ tx, onClose, thirdParties = [], products = [], showToast, db, appId, purchaseMethod }) {
  const [step, setStep] = useState(1);
  const maxStep = purchaseMethod === 'sin_inventario' ? 2 : 3;
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([{ id: 'sucursal-central-uuid', name: 'Bodega Central' }, { id: 'sucursal-sur-uuid', name: 'Bodega Sur' }, { id: 'sucursal-norte-uuid', name: 'Bodega Norte' }]);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Form data
  const [form, setForm] = useState({
    type: 'egreso', purchaseType: purchaseMethod || 'con_inventario',
    documentType: 'factura', documentNumber: '', claveAcceso: '',
    date: getEcuadorDateString(), bodega: 'Bodega Central',
    supplierId: '', supplierName: '', supplierRuc: '',
    items: [], baseImponible: 0, ivaValor: 0, descuento: 0, total: 0,
    paymentMethod: 'transferencia', paymentStatus: 'pagado',
    cuentaBancariaId: '', fechaVencimiento: '',
    category: 'compras', description: '', reference: ''
  });

  // Supplier search
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierResults, setShowSupplierResults] = useState(false);
  const [quickAddSupplier, setQuickAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ ruc: '', name: '', email: '', phone: '', type: 'proveedor' });

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', cost: 0, price: 0, category: '', iva: 15, unit: 'unidad' });

  // Cost impact calculation
  const [costImpacts, setCostImpacts] = useState({}); // productId -> { currentCost, newAvg, delta }

  // Load branches
  useEffect(() => {
    if (!db || !appId) return;
    (async () => {
      const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'inventory_branches'));
      if (!snap.empty) { const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() })); setBranches(list); }
    })();
  }, [db, appId]);

  // Load bank accounts
  useEffect(() => {
    let isMounted = true;
    if (db) {
      getCuentas(db, { estado: 'activo' })
        .then(accs => { if (isMounted) setBankAccounts(accs || []); })
        .catch(err => console.error('Error cargando cuentas bancarias en PurchaseForm:', err));
    }
    return () => { isMounted = false; };
  }, [db]);

  // Recalculate totals with per-product IVA
  const recalcTotals = (items) => {
    let iva5 = 0, iva12 = 0, iva15 = 0;
    const base = items.reduce((s, i) => {
      const subtotal = Number(i.quantity) * Number(i.price) - Number(i.discount || 0);
      const ivaRate = Number(i.ivaCategory ?? 15);
      if (ivaRate === 5) iva5 += subtotal * 0.05;
      else if (ivaRate === 12) iva12 += subtotal * 0.12;
      else if (ivaRate === 15 || ivaRate !== 0) iva15 += subtotal * 0.15;
      return s + subtotal;
    }, 0);
    const ivaValor = iva5 + iva12 + iva15;
    return { baseImponible: base, ivaValor, iva5, iva12, iva15, total: base + ivaValor };
  };

  // Calculate cost impact for a product
  const calcCostImpact = async (productId, newCost, newQty) => {
    if (!db || !appId || !productId) return;
    try {
      const prodRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', productId);
      const snap = await getDoc(prodRef);
      if (!snap.exists()) return;
      const prod = snap.data();
      const currentStock = Number(prod.stock) || 0;
      const currentCost = Number(prod.cost || prod.baseCost) || 0;
      if (currentStock === 0 && currentCost === 0) {
        setCostImpacts(prev => ({ ...prev, [productId]: { currentCost: 0, newAvg: newCost, delta: 0, isNew: true } }));
        return;
      }
      const newAvg = (currentStock * currentCost + Number(newQty) * Number(newCost)) / (currentStock + Number(newQty));
      const delta = ((newAvg - currentCost) / currentCost * 100) || 0;
      setCostImpacts(prev => ({ ...prev, [productId]: { currentCost, newAvg, delta, isNew: false } }));
    } catch { /* ignore */ }
  };

  // Add product to list
  const handleAddProduct = (prod) => {
    const item = { productId: prod.id, name: prod.name, sku: prod.sku || '', quantity: 1, price: Number(prod.cost || prod.baseCost) || 0, discount: 0, subtotal: Number(prod.cost || prod.baseCost) || 0, ivaCategory: Number(prod.ivaPorcentaje || prod.taxRate || prod.ivaCategory) || 15 };
    const items = [...form.items, item];
    setForm(prev => ({ ...prev, items, ...recalcTotals(items) }));
    setShowProductResults(false);
    setProductSearch('');
    calcCostImpact(prod.id, item.price, 1);
  };

  // Update item field
  const handleItemChange = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'quantity' || field === 'price' || field === 'discount') {
      const qty = Number(items[idx].quantity) || 0;
      const price = Number(items[idx].price) || 0;
      items[idx].subtotal = (qty * price) - Number(items[idx].discount || 0);
    }
    setForm(prev => ({ ...prev, items, ...recalcTotals(items) }));
    if (field === 'price' || field === 'quantity') {
      calcCostImpact(items[idx].productId, Number(items[idx].price), Number(items[idx].quantity));
    }
  };

  // Remove item
  const handleRemoveItem = (idx) => {
    const items = form.items.filter((_, i) => i !== idx);
    setForm(prev => ({ ...prev, items, ...recalcTotals(items) }));
  };

  // Create new product on the fly
  const handleCreateProduct = async () => {
    if (!newProduct.name) { showToast?.('Ingresa al menos el nombre del producto', 'warning'); return; }
    const prodId = `prod_${Date.now()}`;
    const prod = {
      id: prodId, name: newProduct.name, sku: newProduct.sku || prodId, type: 'PRODUCT',
      cost: Number(newProduct.cost) || 0, price: Number(newProduct.price) || 0,
      baseCost: Number(newProduct.cost) || 0, stock: 0,
      category: newProduct.category || 'general', ivaPorcentaje: Number(newProduct.iva) || 15,
      unit: newProduct.unit || 'unidad', createdAt: new Date().toISOString()
    };
    try {
      const saved = await productRepository.create({ id: prodId, type: 'STANDARD', name: prod.name, sku: prod.sku, salePrice: prod.price, baseCost: prod.baseCost, taxRate: Number(newProduct.iva ?? 15) });
      Object.assign(prod, normalizeProduct(saved));
      showToast?.('Producto creado y agregado a la compra', 'success');
      handleAddProduct(prod);
      setShowCreateProduct(false);
      setNewProduct({ name: '', sku: '', cost: 0, price: 0, category: '', iva: 15, unit: 'unidad' });
    } catch { showToast?.('Error al crear producto', 'error'); }
  };

  // Quick add supplier
  const handleQuickAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.ruc) { showToast?.('Nombre y RUC son requeridos', 'warning'); return; }
    const supId = `sup_${Date.now()}`;
    const sup = { id: supId, name: newSupplier.name, ruc: newSupplier.ruc, email: newSupplier.email, phone: newSupplier.phone, type: 'proveedor' };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', supId), sup);
      setForm(prev => ({ ...prev, supplierId: supId, supplierName: sup.name, supplierRuc: sup.ruc }));
      setQuickAddSupplier(false);
      showToast?.('Proveedor creado', 'success');
    } catch { showToast?.('Error al crear proveedor', 'error'); }
  };

  // XML Import
  const handleXmlUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const infoTrib = xmlDoc.getElementsByTagName("infoTributaria")?.[0];
      if (!infoTrib) { showToast?.('XML invalido', 'error'); return; }

      const ruc = infoTrib.getElementsByTagName("ruc")?.[0]?.textContent || '';
      const razonSocial = infoTrib.getElementsByTagName("razonSocial")?.[0]?.textContent || '';
      const estab = infoTrib.getElementsByTagName("estab")?.[0]?.textContent || '';
      const ptoEmi = infoTrib.getElementsByTagName("ptoEmi")?.[0]?.textContent || '';
      const secuencial = infoTrib.getElementsByTagName("secuencial")?.[0]?.textContent || '';
      const claveAcceso = infoTrib.getElementsByTagName("claveAcceso")?.[0]?.textContent || '';

      const infoFact = xmlDoc.getElementsByTagName("infoFactura")?.[0];
      const fechaEmision = infoFact?.getElementsByTagName("fechaEmision")?.[0]?.textContent || getEcuadorDateString();
      // eslint-disable-next-line no-unused-vars
      const importeTotal = infoFact?.getElementsByTagName("importeTotal")?.[0]?.textContent || '0';

      // Lookup supplier
      const existing = thirdParties.find(t => t.ruc === ruc);
      const supplierId = existing?.id || '';

      // Parse items
      const detalles = xmlDoc.getElementsByTagName("detalle");
      const items = [];
      for (let i = 0; i < detalles.length; i++) {
        const d = detalles[i];
        const desc = d.getElementsByTagName("descripcion")?.[0]?.textContent || '';
        const cant = Number(d.getElementsByTagName("cantidad")?.[0]?.textContent || 1);
        const precio = Number(d.getElementsByTagName("precioUnitario")?.[0]?.textContent || 0);
        const matched = products.find(p => p.sku && desc.includes(p.sku)) || products.find(p => desc.toLowerCase().includes(p.name?.toLowerCase()));
        items.push({
          productId: matched?.id || '', name: matched?.name || desc, sku: matched?.sku || '',
          quantity: cant, price: precio, discount: 0, subtotal: cant * precio,
          ivaCategory: Number(matched?.ivaPorcentaje || matched?.taxRate || matched?.ivaCategory) || 15
        });
      }

      setForm(prev => ({
        ...prev, documentType: 'factura', documentNumber: `${estab}-${ptoEmi}-${secuencial}`,
        claveAcceso, date: fechaEmision, supplierId, supplierName: razonSocial, supplierRuc: ruc,
        items, ...recalcTotals(items)
      }));
      showToast?.('XML importado correctamente', 'success');
    } catch { showToast?.('Error al procesar XML', 'error'); }
    e.target.value = '';
  };

  // Save
  const stableId = useRef(tx?.id || crypto.randomUUID());
  const saveLock = useRef(false);
  const handleSave = async () => {
    if (saveLock.current) return;
    if (!Number.isFinite(Number(form.total)) || Number(form.total) <= 0 || form.items.some(item => Number(item.quantity) <= 0 || Number(item.price) < 0)) { showToast?.('Revisa los importes y cantidades de la compra.', 'error'); return; }
    if (!form.supplierName && !form.description) { showToast?.('Selecciona un proveedor o agrega una descripcion', 'warning'); return; }
    if (form.purchaseType === 'con_inventario' && form.items.length === 0 && !form.description) { showToast?.('Agrega al menos un producto o una descripcion', 'warning'); return; }
    saveLock.current = true;
    setSaving(true);
    const docId = stableId.current;
    
    const payload = {
      id: docId, type: 'egreso', category: 'compras',
      documentType: form.documentType, documentNumber: form.documentNumber || `COMPRA-${Date.now()}`,
      claveAcceso: form.claveAcceso, date: form.date,
      thirdPartyId: form.supplierId, thirdPartyName: form.supplierName, thirdPartyRuc: form.supplierRuc,
        baseImponible: form.baseImponible, ivaPorcentaje: 15, ivaValor: form.ivaValor, total: form.total,
        iva5: form.iva5 || 0, iva12: form.iva12 || 0, iva15: form.iva15 || 0,
      descuento: form.descuento, paymentMethod: form.paymentMethod, paymentStatus: form.paymentStatus,
      cuentaBancariaId: form.cuentaBancariaId || '',
      fechaVencimiento: form.fechaVencimiento || null,
      sriStatus: form.claveAcceso ? 'autorizado' : 'pendiente',
      description: form.description, reference: form.reference,
      items: form.items, bodega: form.bodega, purchaseType: form.purchaseType,
      financialSyncStatus: 'pending', inventarioRegistrado: !!tx?.inventarioRegistrado
    };

    try {
      // 1. Save transaction
      const txRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId);
      const previous = await getDoc(txRef);
      if (previous.data()?.inventarioRegistrado) {
        const signature = items => JSON.stringify((items || []).map(item => [item.productId, Number(item.quantity), Number(item.price)]));
        if (signature(previous.data().items) !== signature(payload.items)) throw new Error('La compra ya afectó inventario. Registra un ajuste para corregir cantidades o costos.');
        payload.inventarioRegistrado = true;
      }
      await setDoc(txRef, payload, { merge: true });

      if (form.purchaseType === 'con_inventario' && form.items.length > 0) await registerTransactionInventory(db, appId, payload);

      {
        const compraData = {
          ...payload,
          id: docId,
          type: 'egreso',
          documentType: form.documentType,
          documentNumber: form.documentNumber || `COMPRA-${Date.now()}`,
          claveAcceso: form.claveAcceso || '',
          total: Number(form.total) || 0,
          baseImponible: Number(form.baseImponible) || 0,
          ivaValor: Number(form.ivaValor) || 0,
          retencionFuente: Number(form.retencionFuente) || 0,
          retencionIva: Number(form.retencionIva) || 0,
          proveedorNombre: form.supplierName || '',
          proveedorRuc: form.supplierRuc || '',
          thirdPartyId: form.supplierId || '',
          date: form.date || new Date().toISOString(),
          fechaVencimiento: form.fechaVencimiento || null,
          cuentaBancariaId: form.cuentaBancariaId || '',
          paymentMethod: form.paymentMethod || 'transferencia',
          paymentStatus: form.paymentStatus || 'pagado',
          sriStatus: form.claveAcceso ? 'autorizado' : 'pendiente',
          category: 'compras',
          descripcion: form.description || '',
          notas: form.notas || '',
          xmlUrl: '',
          pdfUrl: '',
          creadoPor: '',
        };
        await sincronizarCompra(compraData, db, { uid: '', email: '' });
      }

      await setDoc(txRef, { financialSyncStatus: 'complete' }, { merge: true });
      showToast?.('Compra e inventario registrados correctamente.', 'success');
      onClose?.();
    } catch (err) { 
      console.error(err); 
      showToast?.(err.message || 'Error al guardar la compra. Puedes reintentar sin duplicarla.', 'error');
    }
    finally { saveLock.current = false; setSaving(false); }
  };

  // Helpers
  
  
  // eslint-disable-next-line no-unused-vars
  const btnBase = "flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all";

  const filteredSuppliers = thirdParties.filter(t =>
    supplierSearch ? (t.name?.toLowerCase().includes(supplierSearch.toLowerCase()) || t.ruc?.includes(supplierSearch)) : true
  ).slice(0, 6);

  const filteredProducts = products.filter(p =>
    productSearch ? (p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase())) : true
  ).slice(0, 8);

  return (
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4"}} onClick={onClose}>
      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden"}} onClick={e => e.stopPropagation()}>
        
        {/* Header + Stepper */}
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"shrink-0 px-5 py-3 space-y-3"}}>
          <UiBox {...{"className":"flex items-center justify-between"}}>
            <UiBox {...{"className":"flex items-center gap-3"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"p-1.5"}}>
                <ShoppingBag size={16} />
              </UiBox>
              <UiHeading as="h2" {...{"color":"gray","weight":"bold","highContrast":true}}>
                {tx?.id ? 'Editar Compra' : 'Nueva Compra'}
              </UiHeading>
            </UiBox>
            <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
          </UiBox>
          {/* Stepper dots */}
          <UiBox {...{"className":"flex items-center gap-1.5"}}>
            {[1, 2, 3].filter(s => s <= maxStep).map(s => (
              <Fragment key={s}>
                <UiBox {...mergeThemeProps({"className":"flex items-center gap-1.5"}, {}, (step >= s ? {} : {"style":{"color":"var(--gray-11)"}}))}>
                  <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"w-6 h-6 flex items-center justify-center"}, {}, (step === s ? {"style":{"backgroundColor":"var(--gray-2)","color":"var(--color-background)"}} : (step > s ? {"style":{"backgroundColor":"var(--gray-2)","color":"var(--color-background)"}} : {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})))}>
                    {step > s ? <CheckCircle2 size={12} /> : s}
                  </UiBox>
                  <UiText {...{"size":"1","weight":"medium","className":"hidden sm:inline"}}>
                    {s === 1 ? 'Datos' : s === 2 ? 'Productos' : 'Confirmar'}
                  </UiText>
                </UiBox>
                {s < maxStep && <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"flex-1 h-0.5"}, {}, (step > s ? {"style":{"backgroundColor":"var(--gray-2)"}} : {"style":{"backgroundColor":"var(--color-panel-solid)"}}))} />}
              </Fragment>
            ))}
          </UiBox>
        </UiBox>

        {/* Body - scrollable */}
        <UiBox {...{"className":"flex-1 overflow-y-auto p-5 space-y-4"}}>
          
          {/* ===== STEP 1: DATOS GENERALES ===== */}
          {step === 1 && (
            <UiBox {...{"className":"space-y-4"}}>
              {/* Purchase type */}
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Tipo de compra</UiLabel>
                <UiBox {...{"className":"flex gap-2"}}>
                  <UiButton type="button" onClick={() => setForm(prev => ({ ...prev, purchaseType: 'con_inventario' }))}
                    {...mergeThemeProps({"variant":"outline","className":"flex-1 text-left"}, {}, (form.purchaseType === 'con_inventario' ? {"variant":"solid","color":"gray"} : {}))}>
                    <Package size={16} {...{"className":"mb-1"}} />
                    <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Con Inventario</UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Controla stock y costos</UiBox>
                  </UiButton>
                  <UiButton type="button" onClick={() => setForm(prev => ({ ...prev, purchaseType: 'sin_inventario' }))}
                    {...mergeThemeProps({"variant":"outline","className":"flex-1 text-left"}, {}, (form.purchaseType === 'sin_inventario' ? {"variant":"solid","color":"gray"} : {}))}>
                    <FileText size={16} {...{"style":{"color":"var(--gray-12)"},"className":"mb-1"}} />
                    <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Sin Inventario</UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Solo registro contable</UiBox>
                  </UiButton>
                </UiBox>
              </UiBox>

              {/* Document type */}
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Tipo de documento</UiLabel>
                <UiBox {...{"className":"flex gap-2"}}>
                  {[
                    { id: 'factura', label: 'Factura SRI' },
                    { id: 'nota_venta', label: 'Recibo / Nota Venta' },
                    { id: 'liquidacion', label: 'Liq. Compras' }
                  ].map(dt => (
                    <UiButton key={dt.id} type="button" onClick={() => setForm(prev => ({ ...prev, documentType: dt.id }))}
                      {...mergeThemeProps({"variant":"outline","size":"2","className":"flex-1"}, {}, (form.documentType === dt.id ? {"variant":"solid","color":"gray"} : {"color":"gray"}))}>
                      {dt.label}
                    </UiButton>
                  ))}
                </UiBox>
              </UiBox>

              {/* XML Import */}
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","border":"1px solid var(--gray-a6)"},"className":"p-3"}}>
                <UiLabel {...{"className":"flex items-center gap-3 cursor-pointer"}}>
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"p-2 shrink-0"}}>
                    <Upload size={16} />
                  </UiBox>
                  <UiBox {...{"className":"flex-1"}}>
                    <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Importar XML del SRI</UiBox>
                    <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Carga la factura electronica y completa los datos automaticamente</UiBox>
                  </UiBox>
                  <UiInput type="file" accept=".xml" onChange={handleXmlUpload} {...{"className":"hidden"}} />
                </UiLabel>
              </UiBox>

              {/* Supplier */}
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Proveedor</UiLabel>
                <UiBox {...{"className":"relative"}}>
                  <Search size={12} {...{"style":{"color":"var(--gray-12)"},"className":"absolute left-2.5 top-1/2 -translate-y-1/2"}} />
                  <UiInput value={form.supplierName || supplierSearch} onChange={e => { setSupplierSearch(e.target.value); setForm(prev => ({ ...prev, supplierName: e.target.value })); setShowSupplierResults(true); }}
                    onFocus={() => setShowSupplierResults(true)} onBlur={() => setTimeout(() => setShowSupplierResults(false), 200)}
                    placeholder="Buscar proveedor..." {...mergeThemeProps({}, {}, {"size":"2","color":"gray","className":"w-full"})} />
                  {showSupplierResults && filteredSuppliers.length > 0 && (
                    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"absolute z-20 top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto"}}>
                      {filteredSuppliers.map(t => (
                        <UiButton key={t.id} type="button" onMouseDown={() => { setForm(prev => ({ ...prev, supplierId: t.id, supplierName: t.name, supplierRuc: t.ruc || '' })); setShowSupplierResults(false); setSupplierSearch(''); }}
                          {...{"size":"2","color":"gray","className":"w-full text-left"}}>
                          <UiBox {...{}}>{t.name}</UiBox>
                          {t.ruc && <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{t.ruc}</UiBox>}
                        </UiButton>
                      ))}
                    </UiBox>
                  )}
                </UiBox>
                <UiButton type="button" onClick={() => setQuickAddSupplier(!quickAddSupplier)} {...{"size":"2","className":"flex items-center gap-1 mt-1.5"}}>
                  <UserPlus size={12} /> {quickAddSupplier ? 'Cancelar' : 'Crear nuevo proveedor'}
                </UiButton>
                {quickAddSupplier && (
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"mt-2 p-3 space-y-2"}}>
                    <UiBox {...{"className":"grid grid-cols-2 gap-2"}}>
                      <UiInput value={newSupplier.ruc} onChange={e => setNewSupplier(prev => ({ ...prev, ruc: e.target.value }))} placeholder="RUC *" {...{"size":"2","color":"gray","className":"w-full"}} />
                      <UiInput value={newSupplier.name} onChange={e => setNewSupplier(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre *" {...{"size":"2","color":"gray","className":"w-full"}} />
                      <UiInput value={newSupplier.email} onChange={e => setNewSupplier(prev => ({ ...prev, email: e.target.value }))} placeholder="Email" {...{"size":"2","color":"gray","className":"w-full"}} />
                      <UiInput value={newSupplier.phone} onChange={e => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))} placeholder="Telefono" {...{"size":"2","color":"gray","className":"w-full"}} />
                    </UiBox>
                    <UiButton type="button" onClick={handleQuickAddSupplier} {...{"variant":"solid","color":"blue","size":"2"}}>Crear Proveedor</UiButton>
                  </UiBox>
                )}
              </UiBox>

              {/* Doc details */}
              <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-3"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Nro Documento</UiLabel>
                  <UiInput value={form.documentNumber} onChange={e => setForm(prev => ({ ...prev, documentNumber: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}} />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Fecha</UiLabel>
                  <UiInput type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}} />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Bodega</UiLabel>
                  <UiSelect value={form.bodega} onChange={e => setForm(prev => ({ ...prev, bodega: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}}>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </UiSelect>
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Clave SRI</UiLabel>
                  <UiInput value={form.claveAcceso} onChange={e => setForm(prev => ({ ...prev, claveAcceso: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}} placeholder="49 digitos" />
                </UiBox>
              </UiBox>
            </UiBox>
          )}

          {/* ===== STEP 2: PRODUCTOS (only con_inventario) ===== */}
          {step === 2 && form.purchaseType === 'con_inventario' && (
            <UiBox {...{"className":"space-y-4"}}>
              {/* Product search */}
              <UiBox {...{"className":"relative"}}>
                <Search size={12} {...{"style":{"color":"var(--gray-12)"},"className":"absolute left-2.5 top-1/2 -translate-y-1/2"}} />
                <UiInput value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowProductResults(true); }}
                  onFocus={() => setShowProductResults(true)} onBlur={() => setTimeout(() => setShowProductResults(false), 200)}
                  placeholder="Buscar producto por nombre o SKU..." {...mergeThemeProps({}, {}, {"size":"2","color":"gray","className":"w-full"})} />
                {showProductResults && filteredProducts.length > 0 && (
                  <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"absolute z-20 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto"}}>
                    {filteredProducts.map(p => (
                      <UiButton key={p.id} type="button" onMouseDown={() => handleAddProduct(p)}
                        {...{"size":"2","color":"gray","className":"w-full text-left flex justify-between items-center"}}>
                        <UiBox><UiText {...{"weight":"medium"}}>{p.name}</UiText><UiText {...{"size":"1","color":"gray","highContrast":true,"className":"ml-2"}}>{p.sku}</UiText></UiBox>
                        <UiText {...{"size":"1","weight":"regular","color":"gray","highContrast":true}}>${(p.cost || p.baseCost || 0).toFixed(2)}</UiText>
                      </UiButton>
                    ))}
                  </UiBox>
                )}
              </UiBox>
              <UiButton type="button" onClick={() => setShowCreateProduct(true)} {...{"size":"2","className":"flex items-center gap-1"}}>
                <Plus size={12} /> El producto no existe? Crear nuevo
              </UiButton>

              {/* Create product modal */}
              {showCreateProduct && (
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-3 space-y-2"}}>
                  <UiBox {...{"className":"grid grid-cols-2 gap-2"}}>
                    <UiInput value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="Nombre *" {...{"size":"2","color":"gray","className":"w-full"}} />
                    <UiInput value={newProduct.sku} onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value }))} placeholder="SKU" {...{"size":"2","color":"gray","className":"w-full"}} />
                    <UiInput type="number" step="0.01" value={newProduct.cost || ''} onChange={e => setNewProduct(p => ({ ...p, cost: e.target.value }))} placeholder="Costo $" {...{"size":"2","color":"gray","className":"w-full"}} />
                    <UiInput type="number" step="0.01" value={newProduct.price || ''} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} placeholder="PVP $" {...{"size":"2","color":"gray","className":"w-full"}} />
                    <UiInput value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} placeholder="Categoria" {...{"size":"2","color":"gray","className":"w-full"}} />
                    <UiInput value={newProduct.unit} onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))} placeholder="Unidad" {...{"size":"2","color":"gray","className":"w-full"}} />
                  </UiBox>
                  <UiBox {...{"className":"flex gap-2"}}>
                    <UiButton type="button" onClick={() => setShowCreateProduct(false)} {...{"variant":"surface","color":"blue","size":"2","className":"flex-1"}}>Cancelar</UiButton>
                    <UiButton type="button" onClick={handleCreateProduct} {...{"variant":"solid","color":"blue","size":"2","className":"flex-1"}}>Crear y Agregar</UiButton>
                  </UiBox>
                </UiBox>
              )}

              {/* Items table */}
              {form.items.length > 0 && (
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"overflow-x-auto"}}>
                  <UiTable {...{"className":"w-full text-left"}}>
                    <UiTableHeader>
                      <UiTableRow>
                        <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"px-3 py-2"}}>Producto</UiTableHead>
                        <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"px-1 py-2 w-14 text-center"}}>Cant</UiTableHead>
                        <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"px-1 py-2 w-20 text-right"}}>Costo U.</UiTableHead>
                        <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"px-1 py-2 w-16 text-right"}}>Desc</UiTableHead>
                        <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"px-1 py-2 w-20 text-right"}}>Subtotal</UiTableHead>
                        <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"px-1 py-2 w-8"}}></UiTableHead>
                      </UiTableRow>
                    </UiTableHeader>
                    <UiTableBody>
                      {form.items.map((item, idx) => (
                        <UiTableRow key={idx} {...{}}>
                          <UiTableCell {...{"className":"px-3 py-1.5"}}>
                            <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{item.name}</UiBox>
                            {item.sku && <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{item.sku}</UiBox>}
                            {costImpacts[item.productId] && !costImpacts[item.productId].isNew && (
                              <UiBox {...mergeThemeProps({"className":"mt-0.5"}, {}, (costImpacts[item.productId].delta > 0 ? {"style":{"color":"var(--gray-11)"}} : {"style":{"color":"var(--gray-11)"}}))}>
                                Costo actual: ${costImpacts[item.productId].currentCost.toFixed(2)} → Promedio: ${costImpacts[item.productId].newAvg.toFixed(2)} ({costImpacts[item.productId].delta > 0 ? '+' : ''}{costImpacts[item.productId].delta.toFixed(1)}%)
                              </UiBox>
                            )}
                            {costImpacts[item.productId]?.isNew && (
                              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"mt-0.5"}}>Nuevo producto - costo inicial: ${costImpacts[item.productId].newAvg.toFixed(2)}</UiBox>
                            )}
                          </UiTableCell>
                          <UiTableCell {...{"className":"px-1 py-1.5"}}>
                            <UiInput type="number" min="1" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                              {...{"size":"2","color":"gray","className":"w-14 text-center"}} />
                          </UiTableCell>
                          <UiTableCell {...{"className":"px-1 py-1.5"}}>
                            <UiInput type="number" min="0" step="0.01" value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)}
                              {...{"size":"2","color":"gray","className":"w-18 text-right"}} />
                          </UiTableCell>
                          <UiTableCell {...{"className":"px-1 py-1.5"}}>
                            <UiInput type="number" min="0" step="0.01" value={item.discount} onChange={e => handleItemChange(idx, 'discount', e.target.value)}
                              {...{"size":"2","color":"gray","className":"w-14 text-right"}} />
                          </UiTableCell>
                          <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-1 py-1.5 text-right"}}>${(item.subtotal || 0).toFixed(2)}</UiTableCell>
                          <UiTableCell {...{"className":"px-1 py-1.5 text-center"}}>
                            <UiButton iconOnly type="button" onClick={() => handleRemoveItem(idx)} {...{"variant":"surface","color":"red"}}><X size={12} /></UiButton>
                          </UiTableCell>
                        </UiTableRow>
                      ))}
                    </UiTableBody>
                  </UiTable>
                </UiBox>
              )}

              {/* Summary */}
              {form.items.length > 0 && (
                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-4 pt-2 flex-wrap"}}>
                  <UiBox>Base: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${form.baseImponible.toFixed(2)}</UiText></UiBox>
                  {form.iva5 > 0 && <UiBox>IVA 5%: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${form.iva5.toFixed(2)}</UiText></UiBox>}
                  {form.iva12 > 0 && <UiBox>IVA 12%: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${form.iva12.toFixed(2)}</UiText></UiBox>}
                  {form.iva15 > 0 && <UiBox>IVA 15%: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${form.iva15.toFixed(2)}</UiText></UiBox>}
                  <UiBox>Total: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${form.total.toFixed(2)}</UiText></UiBox>
                </UiBox>
              )}
            </UiBox>
          )}

          {/* ===== STEP 2/3: CONFIRMACION ===== */}
          {(step === maxStep) && (
            <UiBox {...{"className":"space-y-4"}}>
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 space-y-2"}}>
                <UiHeading as="h3" {...{"weight":"bold","color":"gray","highContrast":true,"size":"3","className":"mb-2"}}>Resumen de la compra</UiHeading>
                
                <UiBox {...{"className":"grid grid-cols-2 gap-1"}}>
                  <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Tipo:</UiBox>
                  <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{form.purchaseType === 'con_inventario' ? 'Con movimiento de inventario' : 'Sin movimiento de inventario'}</UiBox>
                  <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Documento:</UiBox>
                  <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{form.documentType === 'factura' ? 'Factura SRI' : form.documentType === 'nota_venta' ? 'Recibo / Nota Venta' : 'Liq. Compras'}</UiBox>
                  {form.supplierName && <><UiBox {...{"style":{"color":"var(--gray-12)"}}}>Proveedor:</UiBox><UiBox {...{"style":{"color":"var(--gray-12)"}}}>{form.supplierName} {form.supplierRuc && `(${form.supplierRuc})`}</UiBox></>}
                  {form.documentNumber && <><UiBox {...{"style":{"color":"var(--gray-12)"}}}>Nro Doc:</UiBox><UiBox {...{"style":{"color":"var(--gray-12)"}}}>{form.documentNumber}</UiBox></>}
                  <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Fecha:</UiBox><UiBox {...{"style":{"color":"var(--gray-12)"}}}>{form.date}</UiBox>
                  <UiBox {...{"style":{"color":"var(--gray-12)"}}}>Bodega:</UiBox><UiBox {...{"style":{"color":"var(--gray-12)"}}}>{form.bodega}</UiBox>
                </UiBox>

                {form.purchaseType === 'con_inventario' && form.items.length > 0 && (
                  <>
                    <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-2 mt-2"}}>
                      <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"mb-1"}}>Productos ({form.items.length})</UiBox>
                      {form.items.map((item, i) => (
                        <UiBox key={i} {...{"className":"flex justify-between"}}>
                          <UiText>{item.quantity}x {item.name}</UiText>
                          <UiText {...{"weight":"regular"}}>${(item.subtotal || 0).toFixed(2)}</UiText>
                        </UiBox>
                      ))}
                    </UiBox>
                    <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-2 space-y-0.5"}}>
                      <UiBox {...{"className":"flex justify-between"}}><UiText>Base imponible:</UiText><UiText {...{"weight":"bold"}}>${form.baseImponible.toFixed(2)}</UiText></UiBox>
                      {form.iva5 > 0 && <UiBox {...{"className":"flex justify-between"}}><UiText>IVA 5%:</UiText><UiText {...{"weight":"bold","color":"gray"}}>${form.iva5.toFixed(2)}</UiText></UiBox>}
                      {form.iva12 > 0 && <UiBox {...{"className":"flex justify-between"}}><UiText>IVA 12%:</UiText><UiText {...{"weight":"bold","color":"gray"}}>${form.iva12.toFixed(2)}</UiText></UiBox>}
                      {form.iva15 > 0 && <UiBox {...{"className":"flex justify-between"}}><UiText>IVA 15%:</UiText><UiText {...{"weight":"bold"}}>${form.iva15.toFixed(2)}</UiText></UiBox>}
                      <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex justify-between pt-1"}}><UiText {...{"weight":"bold"}}>TOTAL:</UiText><UiText {...{"weight":"bold"}}>${form.total.toFixed(2)}</UiText></UiBox>
                    </UiBox>
                  </>
                )}

                {form.purchaseType === 'sin_inventario' && (
                  <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-2"}}>
                    <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"block mb-1.5"}}>Descripcion / Concepto del gasto</UiBox>
                    <UiTextarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2}
                      {...{"size":"2","color":"gray","className":"w-full"}} placeholder="Ej: Pago de servicio de internet, compra de suministros..." />
                    <UiBox {...{"className":"grid grid-cols-2 gap-3 mt-3"}}>
                      <UiBox>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"block mb-1.5"}}>Monto total $</UiBox>
                        <UiInput type="number" step="0.01" value={form.total || ''} onChange={e => setForm(prev => ({ ...prev, total: Number(e.target.value) }))} {...{"size":"2","color":"gray","className":"w-full"}} />
                      </UiBox>
                      <UiBox>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"block mb-1.5"}}>Categoria</UiBox>
                        <UiSelect value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}}>
                          <option value="compras">Compras</option><option value="gastos_administrativos">Gastos Admin</option>
                          <option value="servicios_basicos">Servicios Basicos</option><option value="arriendos">Arriendos</option>
                          <option value="transporte">Transporte</option><option value="honorarios">Honorarios</option>
                        </UiSelect>
                      </UiBox>
                    </UiBox>
                  </UiBox>
                )}
              </UiCard>

              {/* Payment */}
              <UiBox {...{"className":"space-y-3"}}>
                <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                  <UiBox>
                    <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Método de pago</UiLabel>
                    <UiSelect value={form.paymentMethod} onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}}>
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="credito">Crédito</option>
                    </UiSelect>
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Estado del pago</UiLabel>
                    <UiSelect value={form.paymentStatus} onChange={e => setForm(prev => ({ ...prev, paymentStatus: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}}>
                      <option value="pagado">Pagado</option>
                      <option value="pendiente">Pendiente</option>
                    </UiSelect>
                  </UiBox>
                </UiBox>

                {/* Cuenta Bancaria / Caja Origen si el pago es inmediato */}
                {form.paymentStatus === 'pagado' && (
                  <UiBox>
                    <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>
                      {form.paymentMethod === 'efectivo' ? 'Caja / Cuenta de Origen' : 'Cuenta Bancaria de Salida'}
                    </UiLabel>
                    <UiSelect
                      value={form.cuentaBancariaId || ''}
                      onChange={e => setForm(prev => ({ ...prev, cuentaBancariaId: e.target.value }))}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                    >
                      <option value="">-- Seleccionar Cuenta de Salida --</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.banco || b.nombre} ({b.tipoCuenta || 'Cta'} {b.numeroCuenta || ''}) - Saldo: ${Number(b.saldoActual || 0).toFixed(2)}
                        </option>
                      ))}
                    </UiSelect>
                  </UiBox>
                )}

                {/* Fecha de vencimiento si es crédito */}
                {form.paymentMethod === 'credito' && (
                  <UiBox>
                    <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Fecha de Vencimiento de Pago (CxP)</UiLabel>
                    <UiInput
                      type="date"
                      value={form.fechaVencimiento || ''}
                      onChange={e => setForm(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                    />
                  </UiBox>
                )}

                {/* Referencia o Nro de Comprobante */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>N° Comprobante / Referencia de Pago</UiLabel>
                  <UiInput
                    type="text"
                    value={form.reference || ''}
                    onChange={e => setForm(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Ej: Depósito #49102 o Cheque #004"
                    {...{"size":"2","color":"gray","className":"w-full"}}
                  />
                </UiBox>
              </UiBox>
            </UiBox>
          )}

        </UiBox>

        {/* Footer buttons */}
        <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"shrink-0 px-5 py-3 flex justify-between"}}>
          <UiBox>
            {step > 1 && (
              <UiButton type="button" onClick={() => setStep(step - 1)} {...{"variant":"surface","color":"blue"}}><ChevronLeft size={14} /> Anterior</UiButton>
            )}
          </UiBox>
          <UiBox {...{"className":"flex gap-2"}}>
            <UiButton type="button" onClick={onClose} {...{"variant":"surface","color":"blue"}}>Cancelar</UiButton>
            {step < maxStep ? (
              <UiButton type="button" onClick={() => setStep(step + 1)} {...{"variant":"solid","color":"blue"}}>
                {form.purchaseType === 'sin_inventario' && step === 1 ? 'Confirmar' : 'Siguiente'} <ChevronRight size={14} />
              </UiButton>
            ) : (
              <UiButton type="button" onClick={handleSave} disabled={saving} {...{"variant":"solid","color":"blue"}}>
                <CheckCircle2 size={14} /> {saving ? 'Guardando...' : 'Guardar Compra'}
              </UiButton>
            )}
          </UiBox>
        </UiBox>
      </UiBox>
    </UiBox>
  );
}
