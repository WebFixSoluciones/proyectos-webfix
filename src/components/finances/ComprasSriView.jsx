import React, { useState, useEffect } from 'react';
import { 
  Download, CheckCircle2, AlertTriangle, FileText, RefreshCw, 
  ShoppingBag, Eye, Search, X, Plus, Trash2, Upload, Sparkles,
  Package, DollarSign, FileCheck, ArrowRight, ChevronDown
} from 'lucide-react';
import { doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { getEcuadorDateString } from '../../services/sriService';
import { registrarMovimientoKardex } from '../../services/inventoryService';

export default function ComprasSriView({ transactions = [], showToast, db, appId }) {
  const [activeSection, setActiveSection] = useState('sri');
  const [sriBills, setSriBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyRuc, setCompanyRuc] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRide, setSelectedRide] = useState(null);
  const [viewingXml, setViewingXml] = useState(null);
  const [importModal, setImportModal] = useState(null);
  const [products, setProducts] = useState([]);
  const [thirdParties, setThirdParties] = useState([]);
  const [branches, setBranches] = useState([]);

  // Manual form state
  const [manualForm, setManualForm] = useState({
    type: 'con_inventario',
    supplierId: '', supplierName: '', supplierRuc: '',
    documentType: 'factura', documentNumber: '', claveAcceso: '',
    date: getEcuadorDateString(), bodega: 'Bodega Central',
    items: [], baseImponible: 0, ivaValor: 0, total: 0,
    paymentMethod: 'transferencia', paymentStatus: 'pagado',
    description: '', reference: ''
  });
  const [manualSaving, setManualSaving] = useState(false);
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Init
  useEffect(() => {
    if (!db || !appId) return;
    async function init() {
      try {
        const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        const snap = await getDoc(configRef);
        let currentRuc = '';
        if (snap.exists()) {
          const configData = snap.data();
          currentRuc = configData.ruc || '';
          setCompanyRuc(currentRuc);
          setCompanyName(configData.razonSocial || configData.nombreComercial || '');
        }
        const sriColRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras');
        const sriSnap = await getDocs(sriColRef);
        const list = [];
        sriSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (currentRuc && data.receiverRuc === currentRuc) list.push(data);
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        setSriBills(list);

        const pSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'finances_products'));
        const plist = []; pSnap.forEach(d => plist.push({ id: d.id, ...d.data() })); setProducts(plist);

        const tSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties'));
        const tlist = []; tSnap.forEach(d => tlist.push({ id: d.id, ...d.data() })); setThirdParties(tlist);

        const bSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'inventory_branches'));
        const blist = [];
        if (!bSnap.empty) { bSnap.forEach(d => blist.push({ id: d.id, ...d.data() })); }
        else { blist.push({ id: 'sucursal-central-uuid', name: 'Bodega Central' }, { id: 'sucursal-sur-uuid', name: 'Bodega Sur' }, { id: 'sucursal-norte-uuid', name: 'Bodega Norte' }); }
        setBranches(blist);
      } catch (err) { console.error("Init Comprobantes SRI:", err); }
    }
    init();
  }, [db, appId]);

  // Cross-reference: detect which SRI bills already exist in transactions
  const importedKeys = new Set(transactions.filter(t => t.claveAcceso).map(t => t.claveAcceso));
  const importedDocNumbers = new Set(transactions.filter(t => t.type === 'egreso').map(t => t.documentNumber));

  const isBillImported = (bill) => importedKeys.has(bill.claveAcceso) || importedDocNumbers.has(bill.documentNumber);
  const getBillStatus = (bill) => isBillImported(bill) ? 'Importado' : 'Nuevo';

  // Filter SRI bills
  const filteredBills = sriBills.filter(b => {
    if (searchTerm && !b.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) && !b.documentNumber?.includes(searchTerm) && !b.ruc?.includes(searchTerm)) return false;
    if (filterType !== 'all' && b.tipoComprobante !== filterType) return false;
    if (filterStatus === 'importado' && !isBillImported(b)) return false;
    if (filterStatus === 'nuevo' && isBillImported(b)) return false;
    return true;
  });

  // Fetch SRI bills (mock for now, ready for real API)
  const handleFetchSriBills = async () => {
    if (!companyRuc) { showToast?.('Configura tu RUC en Ajustes primero', 'warning'); return; }
    setLoading(true);
    try {
      const mockBills = [
        { id: `sri_${Date.now()}_1`, tipoComprobante: 'factura', ruc: '1790016919001', razonSocial: 'CORPORACION FAVORITA C.A. (Supermaxi)', documentNumber: '001-002-000123456', date: getEcuadorDateString(), baseImponible: 125.40, ivaValor: 18.81, total: 144.21, claveAcceso: `${getEcuadorDateString().replace(/-/g,'')}0117900169190010010020001234561234567819`, category: 'compras', description: 'Compra de insumos y suministros', receiverRuc: companyRuc, xmlContent: '<factura>...</factura>' },
        { id: `sri_${Date.now()}_2`, tipoComprobante: 'factura', ruc: '1791256123001', razonSocial: 'IMPORTADORA INDUSTRIAL AGRICOLA S.A.', documentNumber: '001-001-000987654', date: getEcuadorDateString(), baseImponible: 450.00, ivaValor: 67.50, total: 517.50, claveAcceso: `${getEcuadorDateString().replace(/-/g,'')}0117912561230010010010009876541234567816`, category: 'compras', description: 'Materiales de construccion', receiverRuc: companyRuc, xmlContent: '<factura>...</factura>' },
        { id: `sri_${Date.now()}_3`, tipoComprobante: 'nota_credito', ruc: '1790016919001', razonSocial: 'CORPORACION FAVORITA C.A. (Supermaxi)', documentNumber: '001-002-000123460', date: getEcuadorDateString(), baseImponible: -25.00, ivaValor: -3.75, total: -28.75, claveAcceso: `${getEcuadorDateString().replace(/-/g,'')}0117900169190010010020001234601234567813`, category: 'compras', description: 'Nota de Credito por devolucion', receiverRuc: companyRuc, xmlContent: '<notaCredito>...</notaCredito>' }
      ];
      for (const bill of mockBills) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras', bill.id), bill);
        const exists = sriBills.find(b => b.claveAcceso === bill.claveAcceso);
        if (!exists) setSriBills(prev => [bill, ...prev]);
      }
      showToast?.(`${mockBills.length} comprobantes sincronizados del SRI`, 'success');
    } catch (err) { console.error(err); showToast?.('Error al consultar SRI', 'error'); }
    finally { setLoading(false); }
  };

  // View PDF/RIDE
  const handleViewRide = (bill) => setSelectedRide(bill);
  const handleViewXml = (bill) => setViewingXml(bill);
  const handleDownloadXml = (bill) => {
    const blob = new Blob([bill.xmlContent || '<comprobante/>'], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${bill.claveAcceso}.xml`; a.click();
    URL.revokeObjectURL(url);
  };

  // Open import modal
  const handleOpenImport = (bill) => setImportModal({ bill, method: null });

  // Execute import with kardex
  const handleConfirmImport = async (method) => {
    if (!importModal) return;
    const { bill } = importModal;
    const docId = `compra_sri_${Date.now()}`;
    try {
      if (method === 'con_inventario') {
        const txPayload = {
          id: docId, type: 'egreso', documentType: 'factura', category: 'compras',
          documentNumber: bill.documentNumber, claveAcceso: bill.claveAcceso,
          date: bill.date, thirdPartyId: '', thirdPartyName: bill.razonSocial,
          thirdPartyRuc: bill.ruc, baseImponible: bill.baseImponible,
          ivaPorcentaje: 15, ivaValor: bill.ivaValor, total: bill.total,
          paymentMethod: 'transferencia', paymentStatus: 'pagado',
          sriStatus: 'autorizado', description: bill.description,
          items: bill.items || [], bodega: 'Bodega Central'
        };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), txPayload);
        if (bill.items?.length) {
          for (const item of bill.items) {
            if (item.productId) {
              await registrarMovimientoKardex(db, appId, {
                productId: item.productId, type: 'entrada',
                quantity: Number(item.quantity), cost: Number(item.price || item.unitCost || 0),
                price: Number(item.price || item.unitCost || 0),
                concept: `Compra SRI #${bill.documentNumber}`, referenceId: docId,
                bodega: 'Bodega Central'
              });
            }
          }
        }
        showToast?.('Compra importada con movimiento de inventario', 'success');
      } else {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), {
          id: docId, type: 'egreso', documentType: 'factura', category: 'compras',
          documentNumber: bill.documentNumber, claveAcceso: bill.claveAcceso,
          date: bill.date, thirdPartyId: '', thirdPartyName: bill.razonSocial,
          thirdPartyRuc: bill.ruc, baseImponible: bill.baseImponible,
          ivaPorcentaje: 15, ivaValor: bill.ivaValor, total: bill.total,
          paymentMethod: 'transferencia', paymentStatus: 'pagado',
          sriStatus: 'autorizado', description: bill.description,
          items: [], bodega: 'Bodega Central'
        });
        showToast?.('Compra importada sin movimiento de inventario', 'success');
      }
      importedKeys.add(bill.claveAcceso);
      importedDocNumbers.add(bill.documentNumber);
      setImportModal(null);
    } catch (err) { console.error(err); showToast?.('Error al importar', 'error'); }
  };

  // Manual form handlers
  const handleManualAddItem = (product) => {
    setManualForm(prev => {
      const newItem = { productId: product.id, name: product.name, sku: product.sku || '', quantity: 1, price: product.cost || 0, discount: 0, subtotal: product.cost || 0 };
      const items = [...prev.items, newItem];
      return { ...prev, items, ...recalcTotals(items) };
    });
    setShowProductSearch(false); setProductSearchTerm('');
  };

  const handleManualItemChange = (idx, field, value) => {
    setManualForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'quantity' || field === 'price' || field === 'discount') {
        const qty = Number(items[idx].quantity) || 0;
        const price = Number(items[idx].price) || 0;
        const disc = Number(items[idx].discount) || 0;
        items[idx].subtotal = (qty * price) - disc;
      }
      return { ...prev, items, ...recalcTotals(items) };
    });
  };

  const handleManualRemoveItem = (idx) => {
    setManualForm(prev => {
      const items = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items, ...recalcTotals(items) };
    });
  };

  const recalcTotals = (items) => {
    const base = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const iva = base * 0.15;
    return { baseImponible: base, ivaValor: iva, total: base + iva };
  };

  const handleManualXmlUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const infoTrib = xmlDoc.getElementsByTagName("infoTributaria")?.[0];
        const infoFact = xmlDoc.getElementsByTagName("infoFactura")?.[0];
        if (infoTrib) {
          setManualForm(prev => ({
            ...prev,
            documentNumber: `${infoTrib.getElementsByTagName("estab")?.[0]?.textContent || ''}-${infoTrib.getElementsByTagName("ptoEmi")?.[0]?.textContent || ''}-${infoTrib.getElementsByTagName("secuencial")?.[0]?.textContent || ''}`,
            supplierRuc: infoTrib.getElementsByTagName("ruc")?.[0]?.textContent || '',
            supplierName: infoTrib.getElementsByTagName("razonSocial")?.[0]?.textContent || '',
            claveAcceso: infoTrib.getElementsByTagName("claveAcceso")?.[0]?.textContent || '',
            date: infoFact?.getElementsByTagName("fechaEmision")?.[0]?.textContent || prev.date,
          }));
        }
        const detalles = xmlDoc.getElementsByTagName("detalle");
        const newItems = [];
        for (let i = 0; i < detalles.length; i++) {
          const d = detalles[i];
          const desc = d.getElementsByTagName("descripcion")?.[0]?.textContent || '';
          const cant = Number(d.getElementsByTagName("cantidad")?.[0]?.textContent || 1);
          const precio = Number(d.getElementsByTagName("precioUnitario")?.[0]?.textContent || 0);
          const matched = products.find(p => p.sku && desc.includes(p.sku)) || products.find(p => desc.toLowerCase().includes(p.name?.toLowerCase()));
          newItems.push({
            productId: matched?.id || '',
            name: matched?.name || desc,
            sku: matched?.sku || '',
            quantity: cant, price: precio, discount: 0,
            subtotal: cant * precio
          });
        }
        setManualForm(prev => ({ ...prev, items: newItems, ...recalcTotals(newItems) }));
        showToast?.('XML importado correctamente', 'success');
      } catch (err) { showToast?.('Error al procesar XML', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleManualSave = async () => {
    if (!manualForm.documentNumber || !manualForm.items.length) { showToast?.('Complete documento y al menos 1 producto', 'warning'); return; }
    setManualSaving(true);
    const docId = `compra_manual_${Date.now()}`;
    try {
      const payload = {
        id: docId, type: 'egreso', documentType: manualForm.documentType,
        category: 'compras', documentNumber: manualForm.documentNumber,
        claveAcceso: manualForm.claveAcceso || '', date: manualForm.date,
        thirdPartyId: manualForm.supplierId, thirdPartyName: manualForm.supplierName,
        thirdPartyRuc: manualForm.supplierRuc,
        baseImponible: manualForm.baseImponible, ivaPorcentaje: 15,
        ivaValor: manualForm.ivaValor, total: manualForm.total,
        paymentMethod: manualForm.paymentMethod, paymentStatus: manualForm.paymentStatus,
        sriStatus: manualForm.claveAcceso ? 'autorizado' : 'pendiente',
        description: manualForm.description, reference: manualForm.reference,
        items: manualForm.items, bodega: manualForm.bodega
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), payload);

      if (manualForm.type === 'con_inventario') {
        for (const item of manualForm.items) {
          if (item.productId) {
            await registrarMovimientoKardex(db, appId, {
              productId: item.productId, type: 'entrada',
              quantity: Number(item.quantity), cost: Number(item.price),
              price: Number(item.price),
              concept: `Compra Manual #${manualForm.documentNumber}`,
              referenceId: docId, bodega: manualForm.bodega
            });
          }
        }
      }
      showToast?.('Compra manual registrada exitosamente', 'success');
      setManualForm({
        type: 'con_inventario', supplierId: '', supplierName: '', supplierRuc: '',
        documentType: 'factura', documentNumber: '', claveAcceso: '',
        date: getEcuadorDateString(), bodega: 'Bodega Central',
        items: [], baseImponible: 0, ivaValor: 0, total: 0,
        paymentMethod: 'transferencia', paymentStatus: 'pagado',
        description: '', reference: ''
      });
    } catch (err) { console.error(err); showToast?.('Error al guardar', 'error'); }
    finally { setManualSaving(false); }
  };

  // Helpers
  const inputClass = "w-full text-[12px] px-3 py-2 rounded-md border outline-none bg-white border-[#E6EBF1] text-black focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary-color)_15%,transparent)] transition-all";
  const labelClass = "block text-[11px] font-semibold mb-1.5 text-black";
  const badgeClass = (status) => `inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${status === 'Importado' || status === 'Nuevo' && !status ? 'bg-[#E6FAF0] text-[#0E6245]' : 'bg-[#FFF8E5] text-[#8B5A0B]'}`;

  const filteredSuppliers = thirdParties.filter(t => 
    supplierSearch ? (t.name?.toLowerCase().includes(supplierSearch.toLowerCase()) || t.ruc?.includes(supplierSearch)) : true
  ).slice(0, 8);

  const filteredProducts = products.filter(p =>
    productSearchTerm ? (p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())) : true
  ).slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Header + Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-[15px] font-semibold text-black">Comprobantes SRI</h2>
        <div className="flex rounded-md border border-[#E6EBF1] overflow-hidden">
          <button onClick={() => setActiveSection('sri')} className={`px-4 py-1.5 text-[12px] font-medium transition-all ${activeSection === 'sri' ? 'bg-[var(--primary-color)] text-white' : 'bg-white text-black hover:bg-[#F6F9FC]'}`}>Buzon SRI</button>
          <button onClick={() => setActiveSection('manual')} className={`px-4 py-1.5 text-[12px] font-medium transition-all ${activeSection === 'manual' ? 'bg-[var(--primary-color)] text-white' : 'bg-white text-black hover:bg-[#F6F9FC]'}`}>Registro Manual</button>
        </div>
      </div>

      {/* ============ SECTION A: BUZON SRI ============ */}
      {activeSection === 'sri' && (
        <>
          {!companyRuc && (
            <div className="p-4 rounded-md bg-[#FFF8E5] border border-[#FDD98A] text-[13px] text-[#8B5A0B] flex items-center gap-2">
              <AlertTriangle size={16} /> Configura el RUC de tu empresa en Ajustes para consultar el buzon SRI.
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handleFetchSriBills} disabled={loading || !companyRuc} className="btn-primary">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Consultando...' : 'Consultar SRI'}</span>
            </button>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#333333]" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className={`${inputClass} pl-8`} />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"><X size={12} /></button>}
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-[11px] font-medium px-2 py-1.5 rounded-md border border-[#E6EBF1] bg-white text-black">
              <option value="all">Todos</option><option value="nuevo">Nuevos</option><option value="importado">Importados</option>
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-[11px] font-medium px-2 py-1.5 rounded-md border border-[#E6EBF1] bg-white text-black">
              <option value="all">Todos los tipos</option><option value="factura">Facturas</option><option value="nota_credito">Notas de Credito</option><option value="retencion">Retenciones</option>
            </select>
          </div>

          {/* SRI Table */}
          <div className="rounded-md border border-[#E6EBF1] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="text-[11px] font-semibold text-black">Tipo</th>
                    <th className="text-[11px] font-semibold text-black">Fecha</th>
                    <th className="text-[11px] font-semibold text-black">Proveedor</th>
                    <th className="text-[11px] font-semibold text-black">Nro Doc</th>
                    <th className="text-[11px] font-semibold text-black text-right">Base</th>
                    <th className="text-[11px] font-semibold text-black text-right">IVA</th>
                    <th className="text-[11px] font-semibold text-black text-right">Total</th>
                    <th className="text-[11px] font-semibold text-black">Estado</th>
                    <th className="text-[11px] font-semibold text-black text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-[#333333] text-[12px]">No hay comprobantes. Haz clic en "Consultar SRI".</td></tr>
                  ) : filteredBills.map(bill => {
                    const imported = isBillImported(bill);
                    return (
                      <tr key={bill.id} className={imported ? 'bg-[#FAFBFD]' : ''}>
                        <td className="text-[12px]">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${bill.tipoComprobante === 'nota_credito' ? 'bg-[#FFF0F0] text-[#9B1C1C]' : 'bg-[#EBF0FF] text-[#1E3A8A]'}`}>
                            {bill.tipoComprobante === 'nota_credito' ? 'NC' : bill.tipoComprobante === 'retencion' ? 'RET' : 'FAC'}
                          </span>
                        </td>
                        <td className="text-[12px] text-black">{bill.date}</td>
                        <td className="text-[12px]">
                          <div className="font-medium text-black">{bill.razonSocial}</div>
                          <div className="text-[10px] text-[#333333]">{bill.ruc}</div>
                        </td>
                        <td className="text-[12px] font-mono text-black">{bill.documentNumber}</td>
                        <td className="text-[12px] text-right font-mono text-black">${(bill.baseImponible || 0).toFixed(2)}</td>
                        <td className="text-[12px] text-right font-mono text-black">${(bill.ivaValor || 0).toFixed(2)}</td>
                        <td className="text-[12px] text-right font-bold text-black">${(bill.total || 0).toFixed(2)}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${imported ? 'bg-[#E6FAF0] text-[#0E6245]' : 'bg-[#FFF8E5] text-[#8B5A0B]'}`}>
                            {imported ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                            {imported ? 'Importado' : 'Nuevo'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleViewRide(bill)} className="btn-icon text-gray-500" title="Ver RIDE"><Eye size={13} /></button>
                            <button onClick={() => handleDownloadXml(bill)} className="btn-icon text-gray-500" title="Descargar XML"><Download size={13} /></button>
                            {!imported && (
                              <button onClick={() => handleOpenImport(bill)} className="btn-icon bg-primary" title="Importar a Compras"><ArrowRight size={13} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============ SECTION B: REGISTRO MANUAL ============ */}
      {activeSection === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Method selector */}
            <div className="p-4 rounded-md border border-[#E6EBF1] bg-white space-y-3">
              <label className={labelClass}>Tipo de registro</label>
              <div className="flex gap-2">
                <button onClick={() => setManualForm(prev => ({ ...prev, type: 'con_inventario' }))} className={`flex-1 p-3 rounded-md border text-left transition-all ${manualForm.type === 'con_inventario' ? 'border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_6%,transparent)]' : 'border-[#E6EBF1] hover:bg-[#F6F9FC]'}`}>
                  <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-[var(--primary-color)]" /><span className="text-[13px] font-semibold text-black">Con Movimiento de Inventario</span></div>
                  <p className="text-[11px] text-[#333333]">Actualiza stock y kardex con promedio ponderado. Ideal para compras de productos fisicos.</p>
                </button>
                <button onClick={() => setManualForm(prev => ({ ...prev, type: 'sin_inventario' }))} className={`flex-1 p-3 rounded-md border text-left transition-all ${manualForm.type === 'sin_inventario' ? 'border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_6%,transparent)]' : 'border-[#E6EBF1] hover:bg-[#F6F9FC]'}`}>
                  <div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-[var(--primary-color)]" /><span className="text-[13px] font-semibold text-black">Sin Movimiento de Inventario</span></div>
                  <p className="text-[11px] text-[#333333]">Solo registro contable. Para gastos, servicios o compras informales sin items.</p>
                </button>
              </div>
            </div>

            {/* Supplier + Document Info */}
            <div className="p-4 rounded-md border border-[#E6EBF1] bg-white space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Proveedor</label>
                  <div className="relative">
                    <input value={manualForm.supplierName} onFocus={() => setShowSupplierSearch(true)} onBlur={() => setTimeout(() => setShowSupplierSearch(false), 200)} onChange={e => { setManualForm(prev => ({ ...prev, supplierName: e.target.value })); setSupplierSearch(e.target.value); setShowSupplierSearch(true); }} placeholder="Buscar o escribir proveedor..." className={inputClass} />
                    {showSupplierSearch && filteredSuppliers.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#E6EBF1] rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredSuppliers.map(t => (
                          <button key={t.id} type="button" onMouseDown={() => { setManualForm(prev => ({ ...prev, supplierId: t.id, supplierName: t.name, supplierRuc: t.ruc || '' })); setShowSupplierSearch(false); setSupplierSearch(''); }} className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#F6F9FC] text-black">
                            <div className="font-medium">{t.name}</div>
                            {t.ruc && <div className="text-[10px] text-[#333333]">{t.ruc}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>RUC Proveedor</label>
                  <input value={manualForm.supplierRuc} onChange={e => setManualForm(prev => ({ ...prev, supplierRuc: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Tipo Documento</label>
                  <select value={manualForm.documentType} onChange={e => setManualForm(prev => ({ ...prev, documentType: e.target.value }))} className={inputClass}>
                    <option value="factura">Factura</option><option value="nota_venta">Nota de Venta</option><option value="liquidacion">Liquidacion</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Nro Documento</label>
                  <input value={manualForm.documentNumber} onChange={e => setManualForm(prev => ({ ...prev, documentNumber: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="date" value={manualForm.date} onChange={e => setManualForm(prev => ({ ...prev, date: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Bodega</label>
                  <select value={manualForm.bodega} onChange={e => setManualForm(prev => ({ ...prev, bodega: e.target.value }))} className={inputClass}>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Clave de Acceso SRI (opcional)</label>
                  <input value={manualForm.claveAcceso} onChange={e => setManualForm(prev => ({ ...prev, claveAcceso: e.target.value }))} className={inputClass} placeholder="49 digitos" />
                </div>
                <div>
                  <label className={labelClass}>Referencia / Descripcion</label>
                  <input value={manualForm.description} onChange={e => setManualForm(prev => ({ ...prev, description: e.target.value }))} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Items section (only for con_inventario) */}
            {manualForm.type === 'con_inventario' && (
              <div className="p-4 rounded-md border border-[#E6EBF1] bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Productos</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[#F6F9FC] border border-[#E6EBF1] text-black hover:bg-white cursor-pointer transition-all">
                      <Upload size={12} /><span>Importar XML</span>
                      <input type="file" accept=".xml" onChange={handleManualXmlUpload} className="hidden" />
                    </label>
                    <button onClick={() => setShowProductSearch(!showProductSearch)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-white border border-[#E6EBF1] text-black hover:bg-[#F6F9FC] transition-all">
                      <Plus size={12} /><span>Agregar Producto</span>
                    </button>
                  </div>
                </div>

                {showProductSearch && (
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#333333]" />
                    <input autoFocus value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} placeholder="Buscar producto por nombre o SKU..." className={`${inputClass} pl-8`} />
                    {productSearchTerm && filteredProducts.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#E6EBF1] rounded-md shadow-lg max-h-52 overflow-y-auto">
                        {filteredProducts.map(p => (
                          <button key={p.id} onClick={() => handleManualAddItem(p)} className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#F6F9FC] text-black flex justify-between items-center">
                            <div><span className="font-medium">{p.name}</span><span className="text-[10px] text-[#333333] ml-2">{p.sku}</span></div>
                            <span className="text-[11px] font-mono text-[#333333]">${(p.cost || 0).toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {manualForm.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th className="text-[10px] font-semibold text-black">Producto</th>
                          <th className="text-[10px] font-semibold text-black w-16 text-center">Cant</th>
                          <th className="text-[10px] font-semibold text-black w-20 text-right">P. Unit</th>
                          <th className="text-[10px] font-semibold text-black w-16 text-right">Desc</th>
                          <th className="text-[10px] font-semibold text-black w-20 text-right">Subtotal</th>
                          <th className="text-[10px] font-semibold text-black w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualForm.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="text-[12px] text-black font-medium">{item.name}</td>
                            <td className="text-center"><input type="number" min="1" value={item.quantity} onChange={e => handleManualItemChange(idx, 'quantity', e.target.value)} className="w-14 text-center text-[12px] px-1 py-1 rounded border border-[#E6EBF1] text-black" /></td>
                            <td className="text-right"><input type="number" min="0" step="0.01" value={item.price} onChange={e => handleManualItemChange(idx, 'price', e.target.value)} className="w-18 text-right text-[12px] px-1 py-1 rounded border border-[#E6EBF1] text-black" /></td>
                            <td className="text-right"><input type="number" min="0" step="0.01" value={item.discount} onChange={e => handleManualItemChange(idx, 'discount', e.target.value)} className="w-14 text-right text-[12px] px-1 py-1 rounded border border-[#E6EBF1] text-black" /></td>
                            <td className="text-right font-mono text-[12px] font-bold text-black">${(item.subtotal || 0).toFixed(2)}</td>
                            <td className="text-center"><button onClick={() => handleManualRemoveItem(idx)} className="btn-icon text-red-500"><X size={12} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totals */}
                <div className="flex justify-end gap-6 pt-3 border-t border-[#E6EBF1] text-[12px]">
                  <div>Base Imponible: <span className="font-bold text-black">${manualForm.baseImponible.toFixed(2)}</span></div>
                  <div>IVA 15%: <span className="font-bold text-black">${manualForm.ivaValor.toFixed(2)}</span></div>
                  <div>Total: <span className="font-bold text-[15px] text-black">${manualForm.total.toFixed(2)}</span></div>
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-end gap-3">
              <button onClick={handleManualSave} disabled={manualSaving} className="btn-primary">
                <FileCheck size={14} />
                <span>{manualSaving ? 'Guardando...' : 'Registrar Compra'}</span>
              </button>
            </div>
          </div>

          {/* Right: Summary card */}
          <div className="space-y-3">
            <div className="p-4 rounded-md border border-[#E6EBF1] bg-white">
              <h3 className="text-[13px] font-semibold text-black mb-3">Resumen</h3>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between"><span className="text-[#333333]">Modo</span><span className="font-medium text-black">{manualForm.type === 'con_inventario' ? 'Con Inventario' : 'Sin Inventario'}</span></div>
                <div className="flex justify-between"><span className="text-[#333333]">Items</span><span className="font-medium text-black">{manualForm.items.length}</span></div>
                <div className="flex justify-between"><span className="text-[#333333]">Base Imponible</span><span className="font-medium text-black">${manualForm.baseImponible.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-[#333333]">IVA</span><span className="font-medium text-black">${manualForm.ivaValor.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-[#E6EBF1] pt-2"><span className="font-semibold text-black">Total</span><span className="font-bold text-black">${manualForm.total.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="p-4 rounded-md border border-[#E6EBF1] bg-[#FFF8E5]">
              <p className="text-[11px] text-[#8B5A0B]">
                <strong>Promedio Ponderado:</strong> Las compras con inventario recalculan automaticamente el costo promedio. Nuevo Costo = (Stock Actual x Costo Actual + Cantidad Comprada x Costo Compra) / (Stock Actual + Cantidad Comprada).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: RIDE Viewer ============ */}
      {selectedRide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedRide(null)}>
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-[#E6EBF1]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E6EBF1]">
              <h3 className="text-[14px] font-semibold text-black">RIDE - {selectedRide.documentNumber}</h3>
              <button onClick={() => setSelectedRide(null)} className="btn-icon text-gray-500"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-2 text-[12px] text-black">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[#333333]">Proveedor:</span> <span className="font-medium">{selectedRide.razonSocial}</span></div>
                <div><span className="text-[#333333]">RUC:</span> <span className="font-medium">{selectedRide.ruc}</span></div>
                <div><span className="text-[#333333]">Fecha:</span> <span className="font-medium">{selectedRide.date}</span></div>
                <div><span className="text-[#333333]">Tipo:</span> <span className="font-medium uppercase">{selectedRide.tipoComprobante}</span></div>
              </div>
              <div className="border-t border-[#E6EBF1] pt-2 mt-2 space-y-1">
                <div className="flex justify-between"><span>Base Imponible:</span><span className="font-mono font-bold">${(selectedRide.baseImponible || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IVA 15%:</span><span className="font-mono font-bold">${(selectedRide.ivaValor || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-[15px] border-t border-[#E6EBF1] pt-1"><span className="font-semibold">TOTAL:</span><span className="font-bold">${(selectedRide.total || 0).toFixed(2)}</span></div>
              </div>
              <div className="pt-2"><span className="text-[#333333]">Clave de Acceso:</span> <span className="font-mono text-[10px] break-all">{selectedRide.claveAcceso}</span></div>
              <div className="pt-3 flex gap-2">
                <button onClick={() => { handleDownloadXml(selectedRide); }} className="btn-secondary"><Download size={14} /> Descargar XML</button>
                {!isBillImported(selectedRide) && <button onClick={() => { setSelectedRide(null); handleOpenImport(selectedRide); }} className="btn-primary"><ArrowRight size={14} /> Importar</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: Import Method Selector ============ */}
      {importModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setImportModal(null)}>
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-[#E6EBF1]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E6EBF1]">
              <h3 className="text-[14px] font-semibold text-black">Importar a Historial de Compras</h3>
              <button onClick={() => setImportModal(null)} className="btn-icon text-gray-500"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[12px] text-[#333333]">
                <strong>{importModal.bill.razonSocial}</strong> — {importModal.bill.documentNumber}<br />
                Total: <strong>${(importModal.bill.total || 0).toFixed(2)}</strong>
              </p>
              <div className="space-y-2">
                <button onClick={() => handleConfirmImport('con_inventario')} className="w-full p-3 rounded-md border border-[#E6EBF1] text-left hover:bg-[#F6F9FC] transition-all">
                  <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-[var(--primary-color)]" /><span className="text-[13px] font-semibold text-black">Con Movimiento de Inventario</span></div>
                  <p className="text-[11px] text-[#333333]">Actualiza stock, calcula promedio ponderado y registra en kardex.</p>
                </button>
                <button onClick={() => handleConfirmImport('sin_inventario')} className="w-full p-3 rounded-md border border-[#E6EBF1] text-left hover:bg-[#F6F9FC] transition-all">
                  <div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-[var(--primary-color)]" /><span className="text-[13px] font-semibold text-black">Sin Movimiento de Inventario</span></div>
                  <p className="text-[11px] text-[#333333]">Solo registro contable, no afecta stock ni kardex.</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
