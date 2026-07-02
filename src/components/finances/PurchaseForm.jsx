import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Search, Upload, Package, FileText,
  ShoppingBag, DollarSign, ChevronRight, ChevronLeft,
  CheckCircle2, Sparkles, UserPlus, Building, ArrowRight, Percent
} from 'lucide-react';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { registrarMovimientoKardex } from '../../services/inventoryService';
import { getEcuadorDateString } from '../../services/sriService';

export default function PurchaseForm({ tx, onClose, thirdParties = [], products = [], showToast, db, appId, purchaseMethod }) {
  const [step, setStep] = useState(1);
  const maxStep = purchaseMethod === 'sin_inventario' ? 2 : 3;
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([{ id: 'sucursal-central-uuid', name: 'Bodega Central' }, { id: 'sucursal-sur-uuid', name: 'Bodega Sur' }, { id: 'sucursal-norte-uuid', name: 'Bodega Norte' }]);

  // Form data
  const [form, setForm] = useState({
    type: 'egreso', purchaseType: purchaseMethod || 'con_inventario',
    documentType: 'factura', documentNumber: '', claveAcceso: '',
    date: getEcuadorDateString(), bodega: 'Bodega Central',
    supplierId: '', supplierName: '', supplierRuc: '',
    items: [], baseImponible: 0, ivaValor: 0, descuento: 0, total: 0,
    paymentMethod: 'transferencia', paymentStatus: 'pagado',
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

  // Recalculate totals with per-product IVA
  const recalcTotals = (items) => {
    let iva5 = 0, iva12 = 0, iva15 = 0;
    const base = items.reduce((s, i) => {
      const subtotal = Number(i.quantity) * Number(i.price) - Number(i.discount || 0);
      const ivaRate = Number(i.ivaCategory) || 15;
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
    } catch (e) { /* ignore */ }
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
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory_products', prodId), { ...prod, baseCost: Number(newProduct.cost) || 0 });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', prodId), { ...prod, cost: Number(newProduct.cost) || 0, baseCost: Number(newProduct.cost) || 0 });
      showToast?.('Producto creado y agregado a la compra', 'success');
      handleAddProduct(prod);
      setShowCreateProduct(false);
      setNewProduct({ name: '', sku: '', cost: 0, price: 0, category: '', iva: 15, unit: 'unidad' });
    } catch (err) { showToast?.('Error al crear producto', 'error'); }
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
    } catch (err) { showToast?.('Error al crear proveedor', 'error'); }
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
    } catch (err) { showToast?.('Error al procesar XML', 'error'); }
    e.target.value = '';
  };

  // Save
  const handleSave = async () => {
    if (!form.supplierName && !form.description) { showToast?.('Selecciona un proveedor o agrega una descripcion', 'warning'); return; }
    if (form.purchaseType === 'con_inventario' && form.items.length === 0 && !form.description) { showToast?.('Agrega al menos un producto o una descripcion', 'warning'); return; }
    setSaving(true);
    const docId = tx?.id || `compra_${Date.now()}`;
    
    const payload = {
      id: docId, type: 'egreso', category: 'compras',
      documentType: form.documentType, documentNumber: form.documentNumber || `COMPRA-${Date.now()}`,
      claveAcceso: form.claveAcceso, date: form.date,
      thirdPartyId: form.supplierId, thirdPartyName: form.supplierName, thirdPartyRuc: form.supplierRuc,
        baseImponible: form.baseImponible, ivaPorcentaje: 15, ivaValor: form.ivaValor, total: form.total,
        iva5: form.iva5 || 0, iva12: form.iva12 || 0, iva15: form.iva15 || 0,
      descuento: form.descuento, paymentMethod: form.paymentMethod, paymentStatus: form.paymentStatus,
      sriStatus: form.claveAcceso ? 'autorizado' : 'pendiente',
      description: form.description, reference: form.reference,
      items: form.items, bodega: form.bodega, purchaseType: form.purchaseType,
      inventarioRegistrado: false
    };

    try {
      // 1. Save transaction
      const txRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId);
      await setDoc(txRef, payload);

      // 2. Register kardex for inventory purchases (with rollback)
      if (form.purchaseType === 'con_inventario' && form.items.length > 0) {
        const updatedItems = [];
        let kardexFailed = false;
        for (const item of form.items) {
          if (!item.productId) { updatedItems.push(item); continue; }
          try {
            await registrarMovimientoKardex(db, appId, {
              productId: item.productId, type: 'entrada',
              quantity: Number(item.quantity), cost: Number(item.price),
              price: Number(item.price),
              concept: `Compra #${form.documentNumber || docId}`,
              referenceId: docId, bodega: form.bodega
            });
            updatedItems.push(item);
          } catch (kardexErr) {
            console.error("Error kardex para item:", item, kardexErr);
            kardexFailed = true;
            updatedItems.push(item);
          }
        }
        
        if (kardexFailed) {
          // Rollback: attempt to delete the orphaned transaction
          try { await deleteDoc(txRef); } catch (e) { /* ignore */ }
          showToast?.('Error al registrar inventario. Se revierte la compra.', 'error');
          setSaving(false);
          return;
        }
        
        // Mark as registered
        await setDoc(txRef, { inventarioRegistrado: true, items: updatedItems }, { merge: true });
      }

      showToast?.('Compra registrada exitosamente', 'success');
      onClose?.();
    } catch (err) { 
      console.error(err); 
      showToast?.('Error al guardar la compra', 'error'); 
    }
    finally { setSaving(false); }
  };

  // Helpers
  const inputClass = "w-full text-[12px] px-3 py-2 rounded-md border outline-none bg-white border-[#E6EBF1] text-black focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary-color)_15%,transparent)] transition-all";
  const labelClass = "block text-[11px] font-semibold mb-1.5 text-black";
  const btnBase = "flex items-center gap-2 px-4 py-2.5 rounded-md text-[12px] font-medium transition-all";

  const filteredSuppliers = thirdParties.filter(t =>
    supplierSearch ? (t.name?.toLowerCase().includes(supplierSearch.toLowerCase()) || t.ruc?.includes(supplierSearch)) : true
  ).slice(0, 6);

  const filteredProducts = products.filter(p =>
    productSearch ? (p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase())) : true
  ).slice(0, 8);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[95vh] bg-white rounded-lg shadow-2xl border border-[#E6EBF1] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header + Stepper */}
        <div className="shrink-0 px-5 py-3 border-b border-[#E6EBF1] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-[color-mix(in_srgb,var(--primary-color)_10%,transparent)] text-[var(--primary-color)]">
                <ShoppingBag size={16} />
              </div>
              <h2 className="text-[14px] font-semibold text-black">
                {tx?.id ? 'Editar Compra' : 'Nueva Compra'}
              </h2>
            </div>
            <button onClick={onClose} className="btn-icon text-gray-500"><X size={16} /></button>
          </div>
          {/* Stepper dots */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].filter(s => s <= maxStep).map(s => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 ${step >= s ? 'text-[var(--primary-color)]' : 'text-[#E6EBF1]'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? 'bg-[var(--primary-color)] text-white' : step > s ? 'bg-[var(--primary-color)] text-white' : 'bg-[#E6EBF1] text-[#333333]'}`}>
                    {step > s ? <CheckCircle2 size={12} /> : s}
                  </div>
                  <span className="text-[11px] font-medium hidden sm:inline">
                    {s === 1 ? 'Datos' : s === 2 ? 'Productos' : 'Confirmar'}
                  </span>
                </div>
                {s < maxStep && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-[var(--primary-color)]' : 'bg-[#E6EBF1]'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* ===== STEP 1: DATOS GENERALES ===== */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Purchase type */}
              <div>
                <label className={labelClass}>Tipo de compra</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, purchaseType: 'con_inventario' }))}
                    className={`flex-1 p-3 rounded-md border text-left transition-all ${form.purchaseType === 'con_inventario' ? 'border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_6%,transparent)]' : 'border-[#E6EBF1] hover:bg-[#F6F9FC]'}`}>
                    <Package size={16} className="text-[var(--primary-color)] mb-1" />
                    <div className="text-[12px] font-semibold text-black">Con Inventario</div>
                    <div className="text-[10px] text-[#333333]">Controla stock y costos</div>
                  </button>
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, purchaseType: 'sin_inventario' }))}
                    className={`flex-1 p-3 rounded-md border text-left transition-all ${form.purchaseType === 'sin_inventario' ? 'border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_6%,transparent)]' : 'border-[#E6EBF1] hover:bg-[#F6F9FC]'}`}>
                    <FileText size={16} className="text-[#333333] mb-1" />
                    <div className="text-[12px] font-semibold text-black">Sin Inventario</div>
                    <div className="text-[10px] text-[#333333]">Solo registro contable</div>
                  </button>
                </div>
              </div>

              {/* Document type */}
              <div>
                <label className={labelClass}>Tipo de documento</label>
                <div className="flex gap-2">
                  {[
                    { id: 'factura', label: 'Factura SRI' },
                    { id: 'nota_venta', label: 'Recibo / Nota Venta' },
                    { id: 'liquidacion', label: 'Liq. Compras' }
                  ].map(dt => (
                    <button key={dt.id} type="button" onClick={() => setForm(prev => ({ ...prev, documentType: dt.id }))}
                      className={`flex-1 py-2 rounded-md border text-[11px] font-medium transition-all ${form.documentType === dt.id ? 'border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_8%,transparent)] text-[var(--primary-color)]' : 'border-[#E6EBF1] text-[#333333] hover:bg-[#F6F9FC]'}`}>
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* XML Import */}
              <div className="p-3 rounded-md bg-[#F6F9FC] border border-dashed border-[#E6EBF1]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="p-2 rounded-md bg-[color-mix(in_srgb,var(--primary-color)_10%,transparent)] text-[var(--primary-color)] shrink-0">
                    <Upload size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-black">Importar XML del SRI</div>
                    <div className="text-[10px] text-[#333333]">Carga la factura electronica y completa los datos automaticamente</div>
                  </div>
                  <input type="file" accept=".xml" onChange={handleXmlUpload} className="hidden" />
                </label>
              </div>

              {/* Supplier */}
              <div>
                <label className={labelClass}>Proveedor</label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#333333]" />
                  <input value={form.supplierName || supplierSearch} onChange={e => { setSupplierSearch(e.target.value); setForm(prev => ({ ...prev, supplierName: e.target.value })); setShowSupplierResults(true); }} 
                    onFocus={() => setShowSupplierResults(true)} onBlur={() => setTimeout(() => setShowSupplierResults(false), 200)}
                    placeholder="Buscar proveedor..." className={`${inputClass} pl-8`} />
                  {showSupplierResults && filteredSuppliers.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#E6EBF1] rounded-md shadow-lg max-h-44 overflow-y-auto">
                      {filteredSuppliers.map(t => (
                        <button key={t.id} type="button" onMouseDown={() => { setForm(prev => ({ ...prev, supplierId: t.id, supplierName: t.name, supplierRuc: t.ruc || '' })); setShowSupplierResults(false); setSupplierSearch(''); }}
                          className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#F6F9FC] text-black">
                          <div className="font-medium">{t.name}</div>
                          {t.ruc && <div className="text-[10px] text-[#333333]">{t.ruc}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setQuickAddSupplier(!quickAddSupplier)} className="flex items-center gap-1 text-[11px] text-[var(--primary-color)] mt-1.5 font-medium">
                  <UserPlus size={12} /> {quickAddSupplier ? 'Cancelar' : 'Crear nuevo proveedor'}
                </button>
                {quickAddSupplier && (
                  <div className="mt-2 p-3 rounded-md border border-[#E6EBF1] space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={newSupplier.ruc} onChange={e => setNewSupplier(prev => ({ ...prev, ruc: e.target.value }))} placeholder="RUC *" className={inputClass} />
                      <input value={newSupplier.name} onChange={e => setNewSupplier(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre *" className={inputClass} />
                      <input value={newSupplier.email} onChange={e => setNewSupplier(prev => ({ ...prev, email: e.target.value }))} placeholder="Email" className={inputClass} />
                      <input value={newSupplier.phone} onChange={e => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))} placeholder="Telefono" className={inputClass} />
                    </div>
                    <button type="button" onClick={handleQuickAddSupplier} className="btn-primary text-[11px]">Crear Proveedor</button>
                  </div>
                )}
              </div>

              {/* Doc details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Nro Documento</label>
                  <input value={form.documentNumber} onChange={e => setForm(prev => ({ ...prev, documentNumber: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Bodega</label>
                  <select value={form.bodega} onChange={e => setForm(prev => ({ ...prev, bodega: e.target.value }))} className={inputClass}>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Clave SRI</label>
                  <input value={form.claveAcceso} onChange={e => setForm(prev => ({ ...prev, claveAcceso: e.target.value }))} className={inputClass} placeholder="49 digitos" />
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 2: PRODUCTOS (only con_inventario) ===== */}
          {step === 2 && form.purchaseType === 'con_inventario' && (
            <div className="space-y-4">
              {/* Product search */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#333333]" />
                <input value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowProductResults(true); }}
                  onFocus={() => setShowProductResults(true)} onBlur={() => setTimeout(() => setShowProductResults(false), 200)}
                  placeholder="Buscar producto por nombre o SKU..." className={`${inputClass} pl-8`} />
                {showProductResults && filteredProducts.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#E6EBF1] rounded-md shadow-lg max-h-52 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button key={p.id} type="button" onMouseDown={() => handleAddProduct(p)}
                        className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#F6F9FC] text-black flex justify-between items-center">
                        <div><span className="font-medium">{p.name}</span><span className="text-[10px] text-[#333333] ml-2">{p.sku}</span></div>
                        <span className="text-[11px] font-mono text-[#333333]">${(p.cost || p.baseCost || 0).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setShowCreateProduct(true)} className="flex items-center gap-1 text-[11px] text-[var(--primary-color)] font-medium">
                <Plus size={12} /> El producto no existe? Crear nuevo
              </button>

              {/* Create product modal */}
              {showCreateProduct && (
                <div className="p-3 rounded-md border border-[#E6EBF1] bg-[#F6F9FC] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="Nombre *" className={inputClass} />
                    <input value={newProduct.sku} onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value }))} placeholder="SKU" className={inputClass} />
                    <input type="number" step="0.01" value={newProduct.cost || ''} onChange={e => setNewProduct(p => ({ ...p, cost: e.target.value }))} placeholder="Costo $" className={inputClass} />
                    <input type="number" step="0.01" value={newProduct.price || ''} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} placeholder="PVP $" className={inputClass} />
                    <input value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} placeholder="Categoria" className={inputClass} />
                    <input value={newProduct.unit} onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))} placeholder="Unidad" className={inputClass} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowCreateProduct(false)} className="btn-secondary text-[11px] flex-1">Cancelar</button>
                    <button type="button" onClick={handleCreateProduct} className="btn-primary text-[11px] flex-1">Crear y Agregar</button>
                  </div>
                </div>
              )}

              {/* Items table */}
              {form.items.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-[#E6EBF1]">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="text-[10px] font-semibold text-black px-3 py-2">Producto</th>
                        <th className="text-[10px] font-semibold text-black px-1 py-2 w-14 text-center">Cant</th>
                        <th className="text-[10px] font-semibold text-black px-1 py-2 w-20 text-right">Costo U.</th>
                        <th className="text-[10px] font-semibold text-black px-1 py-2 w-16 text-right">Desc</th>
                        <th className="text-[10px] font-semibold text-black px-1 py-2 w-20 text-right">Subtotal</th>
                        <th className="text-[10px] font-semibold text-black px-1 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-[#E6EBF1]">
                          <td className="px-3 py-1.5">
                            <div className="text-[12px] font-medium text-black">{item.name}</div>
                            {item.sku && <div className="text-[9px] text-[#333333]">{item.sku}</div>}
                            {costImpacts[item.productId] && !costImpacts[item.productId].isNew && (
                              <div className={`text-[9px] mt-0.5 font-medium ${costImpacts[item.productId].delta > 0 ? 'text-[#8B5A0B]' : 'text-[#0E6245]'}`}>
                                Costo actual: ${costImpacts[item.productId].currentCost.toFixed(2)} → Promedio: ${costImpacts[item.productId].newAvg.toFixed(2)} ({costImpacts[item.productId].delta > 0 ? '+' : ''}{costImpacts[item.productId].delta.toFixed(1)}%)
                              </div>
                            )}
                            {costImpacts[item.productId]?.isNew && (
                              <div className="text-[9px] mt-0.5 text-[#1E3A8A] font-medium">Nuevo producto - costo inicial: ${costImpacts[item.productId].newAvg.toFixed(2)}</div>
                            )}
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-14 text-center text-[12px] px-1 py-1 rounded border border-[#E6EBF1] text-black" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" min="0" step="0.01" value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)}
                              className="w-18 text-right text-[12px] px-1 py-1 rounded border border-[#E6EBF1] text-black" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" min="0" step="0.01" value={item.discount} onChange={e => handleItemChange(idx, 'discount', e.target.value)}
                              className="w-14 text-right text-[12px] px-1 py-1 rounded border border-[#E6EBF1] text-black" />
                          </td>
                          <td className="px-1 py-1.5 text-right font-mono text-[12px] font-bold text-black">${(item.subtotal || 0).toFixed(2)}</td>
                          <td className="px-1 py-1.5 text-center">
                            <button type="button" onClick={() => handleRemoveItem(idx)} className="btn-icon text-red-500"><X size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              {form.items.length > 0 && (
                <div className="flex justify-end gap-4 text-[11px] pt-2 border-t border-[#E6EBF1] flex-wrap">
                  <div>Base: <span className="font-bold text-black">${form.baseImponible.toFixed(2)}</span></div>
                  {form.iva5 > 0 && <div>IVA 5%: <span className="font-bold text-black">${form.iva5.toFixed(2)}</span></div>}
                  {form.iva12 > 0 && <div>IVA 12%: <span className="font-bold text-black">${form.iva12.toFixed(2)}</span></div>}
                  {form.iva15 > 0 && <div>IVA 15%: <span className="font-bold text-black">${form.iva15.toFixed(2)}</span></div>}
                  <div>Total: <span className="font-bold text-[14px] text-black">${form.total.toFixed(2)}</span></div>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 2/3: CONFIRMACION ===== */}
          {(step === maxStep) && (
            <div className="space-y-4">
              <div className="p-4 rounded-md border border-[#E6EBF1] bg-white space-y-2 text-[12px]">
                <h3 className="font-semibold text-black text-[13px] mb-2">Resumen de la compra</h3>
                
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-[#333333]">Tipo:</div>
                  <div className="font-medium text-black">{form.purchaseType === 'con_inventario' ? 'Con movimiento de inventario' : 'Sin movimiento de inventario'}</div>
                  <div className="text-[#333333]">Documento:</div>
                  <div className="font-medium text-black">{form.documentType === 'factura' ? 'Factura SRI' : form.documentType === 'nota_venta' ? 'Recibo / Nota Venta' : 'Liq. Compras'}</div>
                  {form.supplierName && <><div className="text-[#333333]">Proveedor:</div><div className="font-medium text-black">{form.supplierName} {form.supplierRuc && `(${form.supplierRuc})`}</div></>}
                  {form.documentNumber && <><div className="text-[#333333]">Nro Doc:</div><div className="font-medium text-black">{form.documentNumber}</div></>}
                  <div className="text-[#333333]">Fecha:</div><div className="font-medium text-black">{form.date}</div>
                  <div className="text-[#333333]">Bodega:</div><div className="font-medium text-black">{form.bodega}</div>
                </div>

                {form.purchaseType === 'con_inventario' && form.items.length > 0 && (
                  <>
                    <div className="border-t border-[#E6EBF1] pt-2 mt-2">
                      <div className="font-semibold text-black text-[11px] mb-1">Productos ({form.items.length})</div>
                      {form.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-mono">${(item.subtotal || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[#E6EBF1] pt-2 space-y-0.5">
                      <div className="flex justify-between"><span>Base imponible:</span><span className="font-mono font-bold">${form.baseImponible.toFixed(2)}</span></div>
                      {form.iva5 > 0 && <div className="flex justify-between"><span>IVA 5%:</span><span className="font-mono font-bold text-[#8B5A0B]">${form.iva5.toFixed(2)}</span></div>}
                      {form.iva12 > 0 && <div className="flex justify-between"><span>IVA 12%:</span><span className="font-mono font-bold text-[#1E3A8A]">${form.iva12.toFixed(2)}</span></div>}
                      {form.iva15 > 0 && <div className="flex justify-between"><span>IVA 15%:</span><span className="font-mono font-bold">${form.iva15.toFixed(2)}</span></div>}
                      <div className="flex justify-between text-[14px] pt-1"><span className="font-semibold">TOTAL:</span><span className="font-bold">${form.total.toFixed(2)}</span></div>
                    </div>
                  </>
                )}

                {form.purchaseType === 'sin_inventario' && (
                  <div className="border-t border-[#E6EBF1] pt-2">
                    <div className={labelClass}>Descripcion / Concepto del gasto</div>
                    <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2}
                      className={inputClass} placeholder="Ej: Pago de servicio de internet, compra de suministros..." />
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <div className={labelClass}>Monto total $</div>
                        <input type="number" step="0.01" value={form.total || ''} onChange={e => setForm(prev => ({ ...prev, total: Number(e.target.value) }))} className={inputClass} />
                      </div>
                      <div>
                        <div className={labelClass}>Categoria</div>
                        <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className={inputClass}>
                          <option value="compras">Compras</option><option value="gastos_administrativos">Gastos Admin</option>
                          <option value="servicios_basicos">Servicios Basicos</option><option value="arriendos">Arriendos</option>
                          <option value="transporte">Transporte</option><option value="honorarios">Honorarios</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Metodo de pago</label>
                  <select value={form.paymentMethod} onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))} className={inputClass}>
                    <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option><option value="credito">Credito</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Estado del pago</label>
                  <select value={form.paymentStatus} onChange={e => setForm(prev => ({ ...prev, paymentStatus: e.target.value }))} className={inputClass}>
                    <option value="pagado">Pagado</option><option value="pendiente">Pendiente</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer buttons */}
        <div className="shrink-0 px-5 py-3 border-t border-[#E6EBF1] flex justify-between">
          <div>
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary"><ChevronLeft size={14} /> Anterior</button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            {step < maxStep ? (
              <button type="button" onClick={() => setStep(step + 1)} className="btn-primary">
                {form.purchaseType === 'sin_inventario' && step === 1 ? 'Confirmar' : 'Siguiente'} <ChevronRight size={14} />
              </button>
            ) : (
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
                <CheckCircle2 size={14} /> {saving ? 'Guardando...' : 'Guardar Compra'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
