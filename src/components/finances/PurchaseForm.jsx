import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, ArrowLeft, FileText, 
  Sparkles, CheckCircle2, UserPlus, ShoppingBag, 
  Landmark, Info, HelpCircle, Loader2, Users
} from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { registrarMovimientoKardex } from '../../services/inventoryService';
import { parsearXMLComprobante } from '../../services/geminiService';
import { getEcuadorDateString } from '../../services/sriService';

export default function PurchaseForm({ tx, onClose, thirdParties, products = [], showToast, db, appId }) {
  const [loading, setLoading] = useState(false);
  const [sriConfig, setSriConfig] = useState(null);
  
  // Lista de sucursales y bodegas desde configuración
  const [branches, setBranches] = useState([
    { codigo: '001', nombre: '001 - SUCURSAL MATRIZ' }
  ]);
  const [warehouses, setWarehouses] = useState(['Bodega Central']);

  // Estado del Formulario
  const [formData, setFormData] = useState({
    id: '',
    type: 'egreso',
    branch: '001',
    bodega: 'Bodega Central',
    documentType: 'factura',
    documentNumber: '',
    claveAcceso: '',
    docSustento: '',
    thirdPartyId: '',
    reference: '',
    description: '',
    date: getEcuadorDateString(),
    paymentMethod: 'transferencia',
    paymentStatus: 'pendiente',
    items: [],
    baseImponible: 0,
    ivaValor: 0,
    descuento: 0,
    total: 0
  });

  // Estado para creación rápida de proveedor
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    ruc: '',
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const fileInputRef = useRef(null);

  // Cargar configuración de sucursales y bodegas
  useEffect(() => {
    async function loadConfig() {
      if (!db || !appId) return;
      try {
        const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        const snap = await getDoc(configRef);
        if (snap.exists()) {
          const configData = snap.data();
          setSriConfig(configData);
          if (configData.sucursales && configData.sucursales.length > 0) {
            setBranches(configData.sucursales);
          }
          if (configData.bodegas && configData.bodegas.length > 0) {
            setWarehouses(configData.bodegas);
          }
        }
      } catch (err) {
        console.error("Error cargando sucursales/bodegas en Compras", err);
      }
    }
    loadConfig();
  }, [db, appId]);

  // Rellenar formulario si estamos editando una compra
  useEffect(() => {
    if (tx) {
      setFormData(prev => ({
        ...prev,
        ...tx,
        items: tx.items || []
      }));
    }
  }, [tx]);

  // Extraer información a partir de la Clave de Acceso de 49 dígitos
  const handleClaveAccesoChange = (val) => {
    const cleanVal = val.replace(/\D/g, '').slice(0, 49);
    setFormData(prev => {
      const next = { ...prev, claveAcceso: cleanVal };
      
      if (cleanVal.length === 49) {
        // 1. Extraer fecha (posiciones 0-8: DDMMAAAA)
        const day = cleanVal.substring(0, 2);
        const month = cleanVal.substring(2, 4);
        const year = cleanVal.substring(4, 8);
        next.date = `year-month-day`;

        // 2. Extraer número de comprobante (posiciones 24-39: 3 estab + 3 ptoEmi + 9 secuencial)
        const estab = cleanVal.substring(24, 27);
        const ptoEmi = cleanVal.substring(27, 30);
        const sec = cleanVal.substring(30, 39);
        next.documentNumber = `estab-ptoEmi-sec`;

        // 3. Extraer RUC emisor (posiciones 10-23: 13 dígitos)
        const supplierRuc = cleanVal.substring(10, 23);
        const matchedSupplier = thirdParties.find(tp => tp.ruc === supplierRuc);
        if (matchedSupplier) {
          next.thirdPartyId = matchedSupplier.id;
          showToast(`Proveedor 'matchedSupplier.name' detectado y seleccionado`, 'info');
        } else {
          // Si no existe, prellenar RUC para creación rápida
          setNewSupplier(prevSupp => ({ ...prevSupp, ruc: supplierRuc }));
          showToast(`Proveedor con RUC supplierRuc no registrado. Puedes crearlo con el botón '+'`, 'warning');
        }
      }
      return next;
    });
  };

  // Importar productos mediante archivo XML del SRI
  const handleXmlUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showToast(`Analizando XML 'file.name'...`, 'info');
    
    try {
      const text = await file.text();
      const res = parsearXMLComprobante(text);
      if (res.success && res.data) {
        const data = res.data;
        
        // Intentar parsear el detalle de productos del XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const detallesNodes = xmlDoc.getElementsByTagName("detalle");
        const parsedItems = [];
        
        for (let i = 0; i < detallesNodes.length; i++) {
          const node = detallesNodes[i];
          const code = node.getElementsByTagName("codigoPrincipal")[0]?.textContent || 
                       node.getElementsByTagName("codigoAuxiliar")[0]?.textContent || "";
          const name = node.getElementsByTagName("descripcion")[0]?.textContent || "";
          const qty = parseFloat(node.getElementsByTagName("cantidad")[0]?.textContent || "0");
          const price = parseFloat(node.getElementsByTagName("precioUnitario")[0]?.textContent || "0");
          const discount = parseFloat(node.getElementsByTagName("descuento")[0]?.textContent || "0");
          const total = parseFloat(node.getElementsByTagName("precioTotalSinImpuesto")[0]?.textContent || "0");
          
          // Intentar asociar con un producto de inventario por SKU/código o nombre
          const matchedProd = products.find(p => p.sku === code || p.name.toLowerCase() === name.toLowerCase());
          
          parsedItems.push({
            productId: matchedProd?.id || '',
            tempCode: code,
            name: name,
            quantity: qty,
            price: price,
            discount: discount,
            total: total
          });
        }

        // Buscar proveedor por RUC
        const matchedSupp = thirdParties.find(tp => tp.ruc === data.ruc);
        let selectedSuppId = matchedSupp?.id || '';
        
        if (!matchedSupp) {
          setNewSupplier({
            ruc: data.ruc,
            name: data.razonSocial,
            email: data.email || '',
            phone: data.phone || '',
            address: ''
          });
          showToast(`Proveedor 'data.razonSocial' no registrado. Crea uno nuevo.`, 'warning');
        }

        // Extraer clave de acceso si existe en el XML
        const claveAccesoNode = xmlDoc.getElementsByTagName("claveAcceso")[0]?.textContent || "";

        setFormData(prev => ({
          ...prev,
          claveAcceso: claveAccesoNode || prev.claveAcceso,
          documentNumber: data.documentNumber || prev.documentNumber,
          date: data.date || prev.date,
          thirdPartyId: selectedSuppId,
          baseImponible: data.baseImponible || 0,
          ivaValor: data.ivaValor || 0,
          descuento: data.descuento || 0,
          total: data.total || 0,
          items: parsedItems
        }));

        showToast("XML de compra cargado correctamente", "success");
      } else {
        throw new Error(res.error || "Formato de XML inválido");
      }
    } catch (err) {
      console.error(err);
      showToast("Error al importar XML: " + err.message, "error");
    }
  };

  // Recalcular totales en base a las filas de items
  const recalculateTotals = (itemsList) => {
    let subtotal = 0;
    let discountVal = 0;
    
    itemsList.forEach(item => {
      const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
      const lineDisc = lineSubtotal * ((Number(item.discount) || 0) / 100);
      subtotal += lineSubtotal;
      discountVal += lineDisc;
    });

    const baseImp = subtotal - discountVal;
    const ivaVal = baseImp * 0.15; // IVA 15% estándar SRI
    const tot = baseImp + ivaVal;

    setFormData(prev => ({
      ...prev,
      items: itemsList,
      baseImponible: Number(baseImp.toFixed(2)),
      descuento: Number(discountVal.toFixed(2)),
      ivaValor: Number(ivaVal.toFixed(2)),
      total: Number(tot.toFixed(2))
    }));
  };

  // Acciones en la grilla de productos
  const handleAddItemRow = () => {
    const newItems = [
      ...formData.items,
      { productId: '', name: '', quantity: 1, price: 0, discount: 0, total: 0 }
    ];
    recalculateTotals(newItems);
  };

  const handleRemoveItemRow = (idx) => {
    const newItems = formData.items.filter((_, i) => i !== idx);
    recalculateTotals(newItems);
  };

  const handleItemFieldChange = (idx, field, val) => {
    const newItems = formData.items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      
      if (field === 'productId') {
        const prod = products.find(p => p.id === val);
        if (prod) {
          updated.name = prod.name;
          updated.price = Number(prod.baseCost || prod.cost || 0);
        }
      }

      // Calcular total de línea
      const q = Number(field === 'quantity' ? val : updated.quantity) || 0;
      const p = Number(field === 'price' ? val : updated.price) || 0;
      const d = Number(field === 'discount' ? val : updated.discount) || 0;
      
      const lineSub = q * p;
      updated.total = Number((lineSub - (lineSub * (d / 100))).toFixed(2));
      
      return updated;
    });
    recalculateTotals(newItems);
  };

  // Guardar Proveedor rápido
  const handleSaveQuickSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.ruc.trim() || !newSupplier.name.trim()) {
      showToast("Completa los datos requeridos del proveedor", "error");
      return;
    }
    setLoading(true);
    try {
      const docId = `supp_Date.now()`;
      const payload = {
        id: docId,
        ruc: newSupplier.ruc,
        name: newSupplier.name,
        email: newSupplier.email,
        phone: newSupplier.phone,
        address: newSupplier.address,
        type: 'proveedor',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', docId), payload);
      
      // Añadir localmente a la lista para selección inmediata
      thirdParties.push(payload);
      setFormData(prev => ({ ...prev, thirdPartyId: docId }));
      setIsAddSupplierOpen(false);
      showToast("Proveedor registrado con éxito", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar proveedor", "error");
    } finally {
      setLoading(false);
    }
  };

  // Guardar Transacción de Compra (Egreso)
  const handleSavePurchase = async () => {
    if (!formData.thirdPartyId) {
      showToast("Por favor, selecciona un Proveedor", "error");
      return;
    }
    if (!formData.documentNumber) {
      showToast("Por favor, ingresa el número de documento", "error");
      return;
    }
    if (formData.items.length === 0) {
      showToast("Debes ingresar al menos un producto a la compra", "error");
      return;
    }
    if (formData.items.some(item => !item.productId)) {
      showToast("Asigna un producto de inventario a todas las filas", "error");
      return;
    }

    setLoading(true);
    try {
      const docId = formData.id || `compra_Date.now()`;
      
      const payload = {
        ...formData,
        id: docId,
        type: 'egreso',
        category: 'compras',
        sriStatus: 'pendiente', // Las compras no se envían a autorizar, se registran como recibidas
        updatedAt: new Date().toISOString()
      };

      // 1. Guardar la transacción en Firebase
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), payload);

      // 2. Registrar movimientos de Kardex para actualizar stock
      for (const item of formData.items) {
        await registrarMovimientoKardex(db, appId, {
          productId: item.productId,
          type: 'entrada',
          quantity: Number(item.quantity),
          cost: Number(item.price),
          price: Number(item.price),
          concept: `Compra #formData.documentNumber`,
          referenceId: docId,
          bodega: formData.bodega
        });
      }

      showToast(tx ? "Compra actualizada correctamente" : "Compra registrada y stock actualizado", "success");
      onClose();
    } catch (err) {
      console.error(err);
      showToast("Error al guardar la compra: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-form-clean w-full flex flex-col gap-6 animate-in fade-in duration-300">
      <style>{`
        .transaction-form-clean * {
          font-weight: 400 !important;
        }
        /* Minimalist Input & Control Overrides */
        .transaction-form-clean input,
        .transaction-form-clean select,
        .transaction-form-clean textarea {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          border-radius: 8px !important;
          background-color: #f8fafc !important;
          color: #090d16 !important;
          transition: background-color 150ms ease, box-shadow 150ms ease !important;
        }
        .transaction-form-clean input:focus,
        .transaction-form-clean select:focus,
        .transaction-form-clean textarea:focus {
          background-color: #f1f5f9 !important;
          box-shadow: 0 0 0 1px rgba(28, 64, 242, 0.15) !important;
        }
        /* Flat Buttons styling */
        .transaction-form-clean .btn-secondary {
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          color: #475569 !important;
          font-weight: 400 !important;
        }
        .transaction-form-clean .btn-secondary:hover {
          background: #f1f5f9 !important;
        }
      `}</style>
      <div className={`w-full rounded-3xl p-6 flex flex-col gap-6 border ${
        'bg-white text-gray-900 border-slate-200'
      }`}>
        
        {/* Cabecera del Formulario */}
        <div className="flex items-center justify-between border-b pb-4 dark:border-white/5 border-slate-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className={`p-2 rounded-xl transition-all hover:bg-slate-100 text-slate-500`}
              title="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">{tx ? 'Editar Registro de Compra' : 'Nuevo Registro de Compra'}</h2>
              <p className="text-[10px] text-gray-500 mt-[1px]">Ingresa y concilia las facturas de tus proveedores en el inventario y balances</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-all hover:bg-slate-100 text-slate-500`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sección Superior: Formularios (Grid Izquierda/Derecha) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna Izquierda (2/3 de ancho en pantallas grandes) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card 1: Sucursal y Bodega */}
            <div className={`p-5 rounded-2xl border-0 bg-white`}>
              <h3 className="text-xs font-black uppercase text-primary tracking-wider mb-4 flex items-center gap-2">
                <Landmark size={14} /> Sucursal y Bodega
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field label-field-dark">Sucursal *</label>
                  <select 
                    value={formData.branch}
                    onChange={e => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                    className={`w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                  >
                    {branches.map(b => (
                      <option key={b.codigo} value={b.codigo} className="text-black">{b.nombre || `b.codigo - Sucursal`}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="label-field label-field-dark">Bodega de Destino *</label>
                  <select 
                    value={formData.bodega}
                    onChange={e => setFormData(prev => ({ ...prev, bodega: e.target.value }))}
                    className={`w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                  >
                    {warehouses.map(w => (
                      <option key={w} value={w} className="text-black">{w}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Card 2: Documento */}
            <div className={`p-5 rounded-2xl border-0 bg-white`}>
              <h3 className="text-xs font-black uppercase text-primary tracking-wider mb-4 flex items-center gap-2">
                <FileText size={14} /> Detalle del Documento
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label-field label-field-dark">Tipo de Documento *</label>
                  <select 
                    value={formData.documentType}
                    onChange={e => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
                    className={`w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                  >
                    <option value="factura" className="text-black">Factura de Compra</option>
                    <option value="nota_venta" className="text-black">Nota de Venta / Recibo</option>
                    <option value="liquidacion" className="text-black">Liquidación de Compra</option>
                  </select>
                </div>

                <div>
                  <label className="label-field label-field-dark">Fecha de Emisión *</label>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className={`w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label-field label-field-dark flex items-center gap-1.5">
                    Clave de Acceso (49 dígitos) *
                    <span className="cursor-help text-gray-400" title="Al ingresar la clave de acceso de 49 dígitos del SRI, se auto-completan la fecha, número de documento y RUC del proveedor"><HelpCircle size={10} /></span>
                  </label>
                  <input 
                    type="text"
                    value={formData.claveAcceso}
                    onChange={e => handleClaveAccesoChange(e.target.value)}
                    placeholder="Ej. 2406202601179000000000120010010000001431234567819"
                    className={`w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all font-mono tracking-widest bg-slate-50 border-slate-200 focus:border-primary`}
                  />
                  {formData.claveAcceso.length === 49 && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-blue-500">
                      <Info size={11} />
                      <span>Clave válida. Fecha de emisión y número auto-asignados desde el código SRI.</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field label-field-dark">Número de Comprobante *</label>
                    <input 
                      type="text"
                      value={formData.documentNumber}
                      onChange={e => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                      placeholder="001-001-000000143"
                      className={`w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all font-mono bg-slate-50 border-slate-200 focus:border-primary`}
                    />
                  </div>

                  <div>
                    <label className="label-field label-field-dark">Documento de Soporte / Serie</label>
                    <input 
                      type="text"
                      value={formData.docSustento}
                      onChange={e => setFormData(prev => ({ ...prev, docSustento: e.target.value }))}
                      placeholder="Ej. Liquidación, Físico, etc."
                      className={`w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Proveedor y Detalles */}
            <div className={`p-5 rounded-2xl border-0 bg-white`}>
              <h3 className="text-xs font-black uppercase text-primary tracking-wider mb-4 flex items-center gap-2">
                <Users size={14} /> Proveedor y Detalles
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="label-field label-field-dark">Proveedor *</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.thirdPartyId}
                      onChange={e => setFormData(prev => ({ ...prev, thirdPartyId: e.target.value }))}
                      className={`flex-1 text-xs px-3 py-2.5 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                    >
                      <option value="" className="text-black">-- Selecciona un Proveedor --</option>
                      {thirdParties.filter(tp => tp.type === 'proveedor' || tp.type === 'ambos').map(tp => (
                        <option key={tp.id} value={tp.id} className="text-black">{tp.ruc} - {tp.name}</option>
                      ))}
                    </select>
                    
                    <button 
                      type="button"
                      onClick={() => setIsAddSupplierOpen(true)}
                      className="btn-icon bg-primary text-white hover:bg-primary-hover"
                      title="Registrar Nuevo Proveedor"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field label-field-dark">Referencia Interna</label>
                    <input 
                      type="text"
                      value={formData.reference}
                      onChange={e => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                      placeholder="Ej. Orden de Compra #12, Pedido Web"
                      className={`w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                    />
                  </div>

                  <div>
                    <label className="label-field label-field-dark">Descripción general / Nota</label>
                    <input 
                      type="text"
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detalles del egreso..."
                      className={`w-full text-xs px-3 py-2.5 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Columna Derecha (1/3 de ancho: Resumen e Importación) */}
          <div className="space-y-6">
            {/* Resumen de la Compra */}
            <div className={`p-5 rounded-2xl border-0 flex flex-col gap-5 bg-white`}>
              <h3 className="text-xs font-black uppercase text-primary tracking-wider flex items-center justify-between">
                <span>Resumen de la Compra</span>
                <span className="text-[9px] lowercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">Autocompletado</span>
              </h3>

              {/* Botón de Importación XML del SRI */}
              <div>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleXmlUpload}
                  accept=".xml"
                  className="hidden"
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 hover-lift"
                >
                  <Sparkles size={14} /> Importar Productos Mediante XML
                </button>
                <p className="text-[9px] text-gray-400 text-center mt-1.5">Sube la factura .xml recibida del proveedor para auto-desglosar la compra</p>
              </div>

              {/* Desglose de Totales */}
              <div className="space-y-2 border-t pt-4 dark:border-white/5 border-slate-200 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Descuentos:</span>
                  <span className="font-semibold text-black dark:text-white">formData.descuento.toFixed(2)</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal base 15%:</span>
                  <span className="font-semibold text-black dark:text-white">formData.baseImponible.toFixed(2)</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>IVA total (15%):</span>
                  <span className="font-semibold text-black dark:text-white">formData.ivaValor.toFixed(2)</span>
                </div>
                <div className="flex justify-between text-lg font-black border-t pt-3 mt-2 dark:border-white/5 border-slate-200">
                  <span className="text-primary">Total:</span>
                  <span className="text-primary">formData.total.toFixed(2)</span>
                </div>
              </div>

              {/* Parámetros de Pago */}
              <div className="border-t pt-4 dark:border-white/5 border-slate-200 space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Método de Pago</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className={`w-full text-xs px-2.5 py-2 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                  >
                    <option value="transferencia" className="text-black">Transferencia Bancaria</option>
                    <option value="efectivo" className="text-black">Efectivo / Caja Chica</option>
                    <option value="tarjeta" className="text-black">Tarjeta de Crédito / Débito</option>
                    <option value="otros" className="text-black">Otros Métodos SRI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Estado de Pago</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={e => setFormData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className={`w-full text-xs px-2.5 py-2 outline-none rounded-xl border transition-all bg-slate-50 border-slate-200 focus:border-primary`}
                  >
                    <option value="pendiente" className="text-black">Pendiente (CXP)</option>
                    <option value="pagado" className="text-black">Pagado al Instante</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Acciones de Guardar/Cancelar */}
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
                  'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                }`}
              >
                Cancelar
              </button>
              
              <button 
                type="button" 
                onClick={handleSavePurchase}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-primary text-white hover:bg-primary-hover transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {tx ? 'Guardar Compra' : 'Registrar Compra'}
              </button>
            </div>

          </div>

        </div>

        {/* Sección Inferior: Tabla de Productos de la Factura de Compra */}
        <div className={`p-5 rounded-2xl border-0 bg-white`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-2">
              <ShoppingBag size={14} /> Productos Ingresados al Inventario
            </h3>
            <button 
              type="button"
              onClick={handleAddItemRow}
              className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-all hover-lift"
            >
              <Plus size={12} /> Agregar Producto
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs text-left min-w-[700px] border-collapse">
              <thead>
                <tr className="border-b dark:border-white/5 border-slate-100 text-gray-500 font-bold">
                  <th className="py-2.5 px-3">Producto / Servicio en Inventario</th>
                  <th className="py-2.5 px-3 w-32">Cant.</th>
                  <th className="py-2.5 px-3 w-36">Costo Unitario ($)</th>
                  <th className="py-2.5 px-3 w-32">Descuento (%)</th>
                  <th className="py-2.5 px-3 w-36">Subtotal</th>
                  <th className="py-2.5 px-3 w-16 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, idx) => (
                  <tr key={idx} className="border-b dark:border-white/5 border-slate-50 last:border-0">
                    <td className="py-3 px-2">
                      <div className="space-y-1">
                        <select
                          value={item.productId}
                          onChange={e => handleItemFieldChange(idx, 'productId', e.target.value)}
                          className={`w-full text-xs px-2.5 py-2 outline-none rounded-xl border transition-all ${
                            'bg-slate-50 border-slate-200 focus:border-primary'
                          }`}
                        >
                          <option value="" className="text-black">-- Selecciona del Inventario --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} className="text-black">{p.sku ? `[p.sku] ` : ''}{p.name} (Costo: ${(p.baseCost || p.cost || 0).toFixed(2)})</option>
                          ))}
                        </select>
                        {item.tempCode && !item.productId && (
                          <div className="text-[9px] text-amber-500 font-mono flex items-center gap-1 pl-1">
                            <Info size={9} />
                            <span>XML ref: {item.tempCode} - {item.name.slice(0, 45)}...</span>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="py-3 px-2">
                      <input 
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={e => handleItemFieldChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-2.5 py-2 outline-none rounded-xl border text-center transition-all ${
                          'bg-slate-50 border-slate-200 focus:border-primary'
                        }`}
                      />
                    </td>

                    <td className="py-3 px-2">
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        value={item.price}
                        onChange={e => handleItemFieldChange(idx, 'price', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-2.5 py-2 outline-none rounded-xl border text-right transition-all font-mono ${
                          'bg-slate-50 border-slate-200 focus:border-primary'
                        }`}
                      />
                    </td>

                    <td className="py-3 px-2">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={e => handleItemFieldChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                        className={`w-full text-xs px-2.5 py-2 outline-none rounded-xl border text-center transition-all ${
                          'bg-slate-50 border-slate-200 focus:border-primary'
                        }`}
                      />
                    </td>

                    <td className="py-3 px-2 font-mono text-right font-black">
                      ${Number(item.total || 0).toFixed(2)}
                    </td>

                    <td className="py-3 px-2 text-center">
                      <button 
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="btn-icon bg-red-650 text-white hover:bg-red-700 transition-all"
                        title="Eliminar fila"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {formData.items.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500 italic">No hay productos en esta compra. Agrega uno manualmente o carga un archivo XML SRI.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL INLINE: REGISTRAR PROVEEDOR RÁPIDO */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <form 
            onSubmit={handleSaveQuickSupplier}
            className={`w-full max-w-md rounded-2xl p-5 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in duration-200 ${
              'bg-white text-gray-900 border border-slate-200'
            }`}
          >
            <div className="flex justify-between items-center border-b pb-2 dark:border-white/5 border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus size={14} className="text-primary" /> Registrar Proveedor Rápido
              </h4>
              <button 
                type="button" 
                onClick={() => setIsAddSupplierOpen(false)}
                className={`p-1 rounded-lg transition-all hover:bg-slate-100 text-slate-500`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">RUC / Cédula *</label>
                <input 
                  type="text"
                  required
                  value={newSupplier.ruc}
                  onChange={e => setNewSupplier(prev => ({ ...prev, ruc: e.target.value }))}
                  className={`w-full text-xs px-3 py-2 outline-none rounded-xl border transition-all ${
                    'bg-slate-50 border-slate-200 focus:border-primary'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Razón Social *</label>
                <input 
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={e => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full text-xs px-3 py-2 outline-none rounded-xl border transition-all ${
                    'bg-slate-50 border-slate-200 focus:border-primary'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                <input 
                  type="email"
                  value={newSupplier.email}
                  onChange={e => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full text-xs px-3 py-2 outline-none rounded-xl border transition-all ${
                    'bg-slate-50 border-slate-200 focus:border-primary'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                  <input 
                    type="text"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full text-xs px-3 py-2 outline-none rounded-xl border transition-all ${
                      'bg-slate-50 border-slate-200 focus:border-primary'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Dirección</label>
                  <input 
                    type="text"
                    value={newSupplier.address}
                    onChange={e => setNewSupplier(prev => ({ ...prev, address: e.target.value }))}
                    className={`w-full text-xs px-3 py-2 outline-none rounded-xl border transition-all ${
                      'bg-slate-50 border-slate-200 focus:border-primary'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-2 border-t pt-3 dark:border-white/5 border-slate-100">
              <button 
                type="button" 
                onClick={() => setIsAddSupplierOpen(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                  'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover transition-all flex items-center justify-center gap-1"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Guardar Proveedor
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
