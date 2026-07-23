import { useState, useEffect } from 'react';
import { 
  Download, CheckCircle2, AlertTriangle, FileText, RefreshCw, 
  Eye, Search, X, Plus, Trash2, Upload,
  Package, FileCheck, ArrowRight
} from 'lucide-react';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { getEcuadorDateString } from '../../services/sriService';
import { registrarMovimientoKardex } from '../../services/inventoryService';
import { sincronizarCompra } from '../../services/integracionFinanzasService';

export default function ComprasSriView({ transactions = [], showToast, db, appId }) {
  const [activeSection, setActiveSection] = useState('sri');
  const [sriBills, setSriBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyRuc, setCompanyRuc] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [companyName, setCompanyName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedRide, setSelectedRide] = useState(null);
  // eslint-disable-next-line no-unused-vars
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
  const [confirmFetch, setConfirmFetch] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
  // eslint-disable-next-line no-unused-vars
  const getBillStatus = (bill) => isBillImported(bill) ? 'Importado' : 'Nuevo';

  // Filter SRI bills
  const filteredBills = sriBills.filter(b => {
    if (searchTerm && !b.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) && !b.documentNumber?.includes(searchTerm) && !b.ruc?.includes(searchTerm)) return false;
    if (filterType !== 'all' && b.tipoComprobante !== filterType) return false;
    if (filterStatus === 'importado' && !isBillImported(b)) return false;
    if (filterStatus === 'nuevo' && isBillImported(b)) return false;
    if (filterDateFrom && b.date < filterDateFrom) return false;
    if (filterDateTo && b.date > filterDateTo) return false;
    return true;
  });

  // Fetch/Refresh SRI bills from Firestore
  const refreshSriBills = async () => {
    const sriColRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras');
    const sriSnap = await getDocs(sriColRef);
    const list = [];
    sriSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.receiverRuc === companyRuc) list.push(data);
    });
    list.sort((a, b) => b.date.localeCompare(a.date));
    setSriBills(list);
    return list;
  };

  // Extract comprobantes from SRI
  const handleExtractSri = async () => {
    setLoading(true);
    try {
      showToast?.('Consultando buzon electronico del SRI...', 'info');
      
      // TODO: Integrate with real SRI API (SOAP/REST)
      // For now, show that the buzon is ready for real comprobantes
      const list = await refreshSriBills();
      if (list.length === 0) {
        showToast?.('No se encontraron comprobantes nuevos en el SRI para el periodo indicado. Sube tus archivos XML manualmente.', 'info');
      } else {
        showToast?.(`${list.length} comprobantes en el buzon`, 'success');
      }
    } catch (err) { console.error(err); showToast?.('Error al consultar SRI', 'error'); }
    finally { setLoading(false); }
  };

  // Main "Consultar SRI" handler with confirmation logic
  const handleFetchSriBills = async () => {
    if (!companyRuc) { showToast?.('Configura tu RUC en Ajustes primero', 'warning'); return; }
    setLoading(true);
    try {
      // First, check what's already in Firestore
      const currentList = await refreshSriBills();
      
      if (currentList.length === 0) {
        // Buzon empty - ask user if they want to extract from SRI
        setLoading(false);
        setConfirmFetch(true);
      } else {
        showToast?.(`${currentList.length} comprobantes cargados del buzon SRI`, 'success');
        setLoading(false);
      }
    } catch (err) { console.error(err); showToast?.('Error al consultar SRI', 'error'); setLoading(false); }
  };

  // Upload XML comprobante to SRI buzon
  const handleXmlUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !companyRuc) return;
    setLoading(true);
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      
      const infoTrib = xmlDoc.getElementsByTagName("infoTributaria")?.[0];
      if (!infoTrib) { showToast?.('XML invalido: falta infoTributaria', 'error'); setLoading(false); return; }

      const claveAcceso = infoTrib.getElementsByTagName("claveAcceso")?.[0]?.textContent || '';
      const ruc = infoTrib.getElementsByTagName("ruc")?.[0]?.textContent || '';
      const razonSocial = infoTrib.getElementsByTagName("razonSocial")?.[0]?.textContent || '';
      const estab = infoTrib.getElementsByTagName("estab")?.[0]?.textContent || '';
      const ptoEmi = infoTrib.getElementsByTagName("ptoEmi")?.[0]?.textContent || '';
      const secuencial = infoTrib.getElementsByTagName("secuencial")?.[0]?.textContent || '';
      const documentNumber = `${estab}-${ptoEmi}-${secuencial}`;
      
      const infoFact = xmlDoc.getElementsByTagName("infoFactura")?.[0];
      const infoNC = xmlDoc.getElementsByTagName("infoNotaCredito")?.[0];
      const infoRet = xmlDoc.getElementsByTagName("infoCompRetencion")?.[0];
      const infoDoc = infoFact || infoNC || infoRet;

      let tipoComprobante = 'factura';
      if (infoNC) tipoComprobante = 'nota_credito';
      else if (infoRet) tipoComprobante = 'retencion';

      const date = infoDoc?.getElementsByTagName("fechaEmision")?.[0]?.textContent || getEcuadorDateString();
      const totalConImpuesto = infoDoc?.getElementsByTagName("importeTotal")?.[0];
      const totalSinImpuesto = infoDoc?.getElementsByTagName("totalSinImpuestos")?.[0];
      const total = Number(totalConImpuesto?.textContent || 0);
      const baseImponible = Number(totalSinImpuesto?.textContent || total / 1.15);
      const ivaValor = total - baseImponible;

      // Check for duplicates
      const existing = sriBills.find(b => b.claveAcceso === claveAcceso);
      if (existing) { showToast?.('Este comprobante ya esta en el buzon', 'warning'); setLoading(false); return; }

      const billId = `sri_xml_${claveAcceso || Date.now()}`;
      const bill = {
        id: billId, tipoComprobante, ruc, razonSocial, documentNumber,
        date, baseImponible, ivaValor, total, claveAcceso,
        category: 'compras', description: `Compra ${tipoComprobante} ${documentNumber}`,
        receiverRuc: companyRuc, xmlContent: text
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras', billId), bill);
      
      // Refresh list
      const sriColRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras');
      const sriSnap = await getDocs(sriColRef);
      const list = [];
      sriSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.receiverRuc === companyRuc) list.push(data);
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setSriBills(list);
      
      showToast?.(`${razonSocial} - ${documentNumber} cargado al buzon`, 'success');
    } catch (err) { console.error(err); showToast?.('Error al procesar XML', 'error'); }
    finally { setLoading(false); e.target.value = ''; }
  };

  // View PDF/RIDE
  const handleViewRide = (bill) => setSelectedRide(bill);
  // eslint-disable-next-line no-unused-vars
  const handleViewXml = (bill) => setViewingXml(bill);
  const handleDownloadXml = (bill) => {
    const blob = new Blob([bill.xmlContent || '<comprobante/>'], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${bill.claveAcceso}.xml`; a.click();
    URL.revokeObjectURL(url);
  };

  // Clear all SRI bills from buzon
  const handleClearBuzon = async () => {
    setLoading(true);
    try {
      const sriColRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras');
      const sriSnap = await getDocs(sriColRef);
      const deletePromises = [];
      sriSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.receiverRuc === companyRuc) deletePromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras', docSnap.id)));
      });
      await Promise.all(deletePromises);
      setSriBills([]);
      showToast?.('Buzon SRI limpiado correctamente', 'success');
    } catch (err) { console.error(err); showToast?.('Error al limpiar buzon', 'error'); }
    finally { setLoading(false); setConfirmClear(false); }
  };

  // Delete single bill
  const handleDeleteBill = async (billId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_sri_compras', billId));
      setSriBills(prev => prev.filter(b => b.id !== billId));
      showToast?.('Comprobante eliminado del buzon', 'success');
    } catch (err) { console.error(err); showToast?.('Error al eliminar', 'error'); }
    finally { setConfirmDeleteId(null); }
  };
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

      try {
        await sincronizarCompra({
          id: docId,
          type: 'egreso',
          documentType: 'factura',
          documentNumber: bill.documentNumber,
          claveAcceso: bill.claveAcceso || '',
          total: Number(bill.total) || 0,
          baseImponible: Number(bill.baseImponible) || 0,
          ivaValor: Number(bill.ivaValor) || 0,
          proveedorNombre: bill.razonSocial || '',
          proveedorRuc: bill.ruc || '',
          thirdPartyId: '',
          date: bill.date || new Date().toISOString(),
          paymentMethod: 'transferencia',
          paymentStatus: 'pagado',
          sriStatus: 'autorizado',
          category: 'compras',
          descripcion: bill.description || '',
          creadoPor: '',
        }, db, { uid: '', email: '' });
      } catch (syncErr) {
        console.error('Error sincronizando compra SRI con modulo financiero:', syncErr);
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
      // eslint-disable-next-line no-unused-vars
      } catch (_err) { showToast?.('Error al procesar XML', 'error'); }
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

      try {
        await sincronizarCompra({
          id: docId,
          type: 'egreso',
          documentType: manualForm.documentType,
          documentNumber: manualForm.documentNumber,
          claveAcceso: manualForm.claveAcceso || '',
          total: Number(manualForm.total) || 0,
          baseImponible: Number(manualForm.baseImponible) || 0,
          ivaValor: Number(manualForm.ivaValor) || 0,
          proveedorNombre: manualForm.supplierName || '',
          proveedorRuc: manualForm.supplierRuc || '',
          thirdPartyId: manualForm.supplierId || '',
          date: manualForm.date || new Date().toISOString(),
          paymentMethod: manualForm.paymentMethod || 'transferencia',
          paymentStatus: manualForm.paymentStatus || 'pagado',
          sriStatus: manualForm.claveAcceso ? 'autorizado' : 'pendiente',
          category: 'compras',
          descripcion: manualForm.description || '',
          creadoPor: '',
        }, db, { uid: '', email: '' });
      } catch (syncErr) {
        console.error('Error sincronizando compra manual con modulo financiero:', syncErr);
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
  const inputClass = "w-full text-sm px-3 py-2 rounded-md border outline-none bg-white border-border-default text-black focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary-color)_15%,transparent)] transition-all";
  const labelClass = "block text-xs font-semibold mb-1.5 text-black";
  // eslint-disable-next-line no-unused-vars
  const badgeClass = (status) => `inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${status === 'Importado' || status === 'Nuevo' && !status ? 'bg-status-authorized-bg text-status-authorized-text' : 'bg-status-pending-bg text-status-pending-text'}`;

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
        <h2 className="text-md font-semibold text-black">Comprobantes SRI</h2>
        <div className="flex rounded-md border border-border-default overflow-hidden">
          <button onClick={() => setActiveSection('sri')} className={`px-4 py-1.5 text-sm font-medium transition-all ${activeSection === 'sri' ? 'bg-[var(--primary-color)] text-white' : 'bg-white text-black hover:bg-surface-bg'}`}>Buzon SRI</button>
          <button onClick={() => setActiveSection('manual')} className={`px-4 py-1.5 text-sm font-medium transition-all ${activeSection === 'manual' ? 'bg-[var(--primary-color)] text-white' : 'bg-white text-black hover:bg-surface-bg'}`}>Registro Manual</button>
        </div>
      </div>

      {/* ============ SECTION A: BUZON SRI ============ */}
      {activeSection === 'sri' && (
        <>
          {!companyRuc && (
            <div className="p-4 rounded-md bg-surface-card border border-border-default text-base text-text-secondary flex items-center gap-2">
              <AlertTriangle size={16} /> Configura el RUC de tu empresa en Ajustes para consultar el buzon SRI.
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handleFetchSriBills} disabled={loading || !companyRuc} className="btn-primary">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Consultando...' : 'Consultar SRI'}</span>
            </button>
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-white border border-border-default text-black hover:bg-surface-bg cursor-pointer transition-all">
              <Upload size={14} />
              <span>Subir XML</span>
              <input type="file" accept=".xml" onChange={handleXmlUpload} className="hidden" />
            </label>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-primary" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className={`${inputClass} pl-8`} />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"><X size={12} /></button>}
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs font-medium px-2 py-1.5 rounded-md border border-border-default bg-white text-black">
              <option value="all">Todos ({sriBills.length})</option><option value="nuevo">Pendientes ({sriBills.filter(b => !isBillImported(b)).length})</option><option value="importado">Ya en Compras ({sriBills.filter(b => isBillImported(b)).length})</option>
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs font-medium px-2 py-1.5 rounded-md border border-border-default bg-white text-black">
              <option value="all">Todos los tipos</option><option value="factura">Facturas</option><option value="nota_credito">Notas de Credito</option><option value="retencion">Retenciones</option>
            </select>
            <div className="flex items-center gap-1.5">
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border border-border-default bg-white text-black w-[130px]" placeholder="Desde" />
              <span className="text-xs text-text-primary">a</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="text-xs px-2 py-1.5 rounded-md border border-border-default bg-white text-black w-[130px]" placeholder="Hasta" />
            </div>
            {sriBills.length > 0 && (
              <button onClick={() => setConfirmClear(true)} disabled={loading} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white border border-border-default text-text-secondary hover:bg-surface-card transition-all">
                <Trash2 size={12} /> Limpiar Buzon
              </button>
            )}
          </div>

          {/* Summary bar */}
          {sriBills.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-text-primary flex-wrap">
              <span><strong className="text-black">{filteredBills.length}</strong> de <strong className="text-black">{sriBills.length}</strong> comprobantes</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface-card border border-border-default"></span> {sriBills.filter(b => isBillImported(b)).length} ya en compras</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface-card border border-border-default"></span> {sriBills.filter(b => !isBillImported(b)).length} pendientes</span>
            </div>
          )}

          {/* SRI Table */}
          <div className="rounded-md border border-border-default overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="text-xs font-semibold text-black">Tipo</th>
                    <th className="text-xs font-semibold text-black">Fecha</th>
                    <th className="text-xs font-semibold text-black">Proveedor</th>
                    <th className="text-xs font-semibold text-black">Nro Doc</th>
                    <th className="text-xs font-semibold text-black text-right hidden sm:table-cell">Base</th>
                    <th className="text-xs font-semibold text-black text-right hidden sm:table-cell">IVA</th>
                    <th className="text-xs font-semibold text-black text-right">Total</th>
                    <th className="text-xs font-semibold text-black">Estado</th>
                    <th className="text-xs font-semibold text-black text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length === 0 && !loading ? (
                    <tr><td colSpan={9} className="text-center py-10">
                      <div className="max-w-sm mx-auto space-y-3">
                        <Download size={32} className="mx-auto text-text-secondary" />
                        <p className="text-base font-semibold text-black">Buzon SRI vacio</p>
                        <p className="text-xs text-text-primary">No tienes comprobantes electronicos sincronizados. Para empezar:</p>
                        <div className="text-left space-y-1.5 text-xs text-text-primary">
                          <p>1. Haz clic en <strong>"Consultar SRI"</strong> para extraer tus comprobantes del buzon electronico.</p>
                          <p>2. O sube manualmente tus archivos <strong>XML</strong> descargados del portal SRI.</p>
                          <p>3. Luego importa cada comprobante a tu <strong>Historial de Compras</strong>.</p>
                        </div>
                        <label className="btn-primary cursor-pointer">
                          <Upload size={14} />
                          <span>Subir primer XML</span>
                          <input type="file" accept=".xml" onChange={handleXmlUpload} className="hidden" />
                        </label>
                      </div>
                    </td></tr>
                  ) : loading ? (
                    <tr><td colSpan={9} className="text-center py-10 text-text-primary text-sm">Cargando comprobantes...</td></tr>
                  ) : filteredBills.map(bill => {
                    const imported = isBillImported(bill);
                    return (
                      <tr key={bill.id} className={`${imported ? 'bg-surface-card' : ''} hover:bg-surface-bg`}>
                        <td className="text-sm">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${bill.tipoComprobante === 'nota_credito' ? 'bg-status-rejected-bg text-status-rejected-text' : bill.tipoComprobante === 'retencion' ? 'bg-status-pending-bg text-status-pending-text' : 'bg-surface-card text-text-secondary'}`}>
                            {bill.tipoComprobante === 'nota_credito' ? 'NC' : bill.tipoComprobante === 'retencion' ? 'RET' : 'FAC'}
                          </span>
                        </td>
                        <td className="text-sm text-black">{bill.date}</td>
                        <td className="text-sm">
                          <div className="font-medium text-black">{bill.razonSocial}</div>
                          <div className="text-xs text-text-primary">{bill.ruc}</div>
                        </td>
                        <td className="text-sm font-mono text-black">{bill.documentNumber}</td>
                        <td className="text-sm text-right font-mono text-black hidden sm:table-cell">${(bill.baseImponible || 0).toFixed(2)}</td>
                        <td className="text-sm text-right font-mono text-black hidden sm:table-cell">${(bill.ivaValor || 0).toFixed(2)}</td>
                        <td className="text-sm text-right font-bold text-black">${(bill.total || 0).toFixed(2)}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${imported ? 'bg-status-authorized-bg text-status-authorized-text border border-border-default' : 'bg-status-pending-bg text-status-pending-text border border-border-default'}`}>
                            {imported ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                            {imported ? 'Ya en Compras' : 'Pendiente'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleViewRide(bill)} className="btn-icon text-gray-500" title="Ver RIDE"><Eye size={13} /></button>
                            <button onClick={() => handleDownloadXml(bill)} className="btn-icon text-gray-500" title="Descargar XML"><Download size={13} /></button>
                            {!imported && (
                              <button onClick={() => handleOpenImport(bill)} className="btn-icon bg-primary" title="Importar a Compras"><ArrowRight size={13} /></button>
                            )}
                            <button onClick={() => setConfirmDeleteId(bill.id)} className="btn-icon text-red-500" title="Eliminar del buzon"><Trash2 size={13} /></button>
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
            <div className="p-4 rounded-md border border-border-default bg-white space-y-3">
              <label className={labelClass}>Tipo de registro</label>
              <div className="flex gap-2">
                <button onClick={() => setManualForm(prev => ({ ...prev, type: 'con_inventario' }))} className={`flex-1 p-3 rounded-md border text-left transition-all ${manualForm.type === 'con_inventario' ? 'border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_6%,transparent)]' : 'border-border-default hover:bg-surface-bg'}`}>
                  <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-[var(--primary-color)]" /><span className="text-base font-semibold text-black">Con Movimiento de Inventario</span></div>
                  <p className="text-xs text-text-primary">Actualiza stock y kardex con promedio ponderado. Ideal para compras de productos fisicos.</p>
                </button>
                <button onClick={() => setManualForm(prev => ({ ...prev, type: 'sin_inventario' }))} className={`flex-1 p-3 rounded-md border text-left transition-all ${manualForm.type === 'sin_inventario' ? 'border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_6%,transparent)]' : 'border-border-default hover:bg-surface-bg'}`}>
                  <div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-[var(--primary-color)]" /><span className="text-base font-semibold text-black">Sin Movimiento de Inventario</span></div>
                  <p className="text-xs text-text-primary">Solo registro contable. Para gastos, servicios o compras informales sin items.</p>
                </button>
              </div>
            </div>

            {/* Supplier + Document Info */}
            <div className="p-4 rounded-md border border-border-default bg-white space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Proveedor</label>
                  <div className="relative">
                    <input value={manualForm.supplierName} onFocus={() => setShowSupplierSearch(true)} onBlur={() => setTimeout(() => setShowSupplierSearch(false), 200)} onChange={e => { setManualForm(prev => ({ ...prev, supplierName: e.target.value })); setSupplierSearch(e.target.value); setShowSupplierSearch(true); }} placeholder="Buscar o escribir proveedor..." className={inputClass} />
                    {showSupplierSearch && filteredSuppliers.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-border-default rounded-md max-h-40 overflow-y-auto">
                        {filteredSuppliers.map(t => (
                          <button key={t.id} type="button" onMouseDown={() => { setManualForm(prev => ({ ...prev, supplierId: t.id, supplierName: t.name, supplierRuc: t.ruc || '' })); setShowSupplierSearch(false); setSupplierSearch(''); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-bg text-black">
                            <div className="font-medium">{t.name}</div>
                            {t.ruc && <div className="text-xs text-text-primary">{t.ruc}</div>}
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
              <div className="p-4 rounded-md border border-border-default bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Productos</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-bg border border-border-default text-black hover:bg-white cursor-pointer transition-all">
                      <Upload size={12} /><span>Importar XML</span>
                      <input type="file" accept=".xml" onChange={handleManualXmlUpload} className="hidden" />
                    </label>
                    <button onClick={() => setShowProductSearch(!showProductSearch)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-border-default text-black hover:bg-surface-bg transition-all">
                      <Plus size={12} /><span>Agregar Producto</span>
                    </button>
                  </div>
                </div>

                {showProductSearch && (
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-primary" />
                    <input autoFocus value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} placeholder="Buscar producto por nombre o SKU..." className={`${inputClass} pl-8`} />
                    {productSearchTerm && filteredProducts.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-border-default rounded-md max-h-52 overflow-y-auto">
                        {filteredProducts.map(p => (
                          <button key={p.id} onClick={() => handleManualAddItem(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-bg text-black flex justify-between items-center">
                            <div><span className="font-medium">{p.name}</span><span className="text-xs text-text-primary ml-2">{p.sku}</span></div>
                            <span className="text-xs font-mono text-text-primary">${(p.cost || 0).toFixed(2)}</span>
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
                          <th className="text-xs font-semibold text-black">Producto</th>
                          <th className="text-xs font-semibold text-black w-16 text-center">Cant</th>
                          <th className="text-xs font-semibold text-black w-20 text-right">P. Unit</th>
                          <th className="text-xs font-semibold text-black w-16 text-right">Desc</th>
                          <th className="text-xs font-semibold text-black w-20 text-right">Subtotal</th>
                          <th className="text-xs font-semibold text-black w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualForm.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="text-sm text-black font-medium">{item.name}</td>
                            <td className="text-center"><input type="number" min="1" value={item.quantity} onChange={e => handleManualItemChange(idx, 'quantity', e.target.value)} className="w-14 text-center text-sm px-1 py-1 rounded border border-border-default text-black" /></td>
                            <td className="text-right"><input type="number" min="0" step="0.01" value={item.price} onChange={e => handleManualItemChange(idx, 'price', e.target.value)} className="w-18 text-right text-sm px-1 py-1 rounded border border-border-default text-black" /></td>
                            <td className="text-right"><input type="number" min="0" step="0.01" value={item.discount} onChange={e => handleManualItemChange(idx, 'discount', e.target.value)} className="w-14 text-right text-sm px-1 py-1 rounded border border-border-default text-black" /></td>
                            <td className="text-right font-mono text-sm font-bold text-black">${(item.subtotal || 0).toFixed(2)}</td>
                            <td className="text-center"><button onClick={() => handleManualRemoveItem(idx)} className="btn-icon text-red-500"><X size={12} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totals */}
                <div className="flex justify-end gap-6 pt-3 border-t border-border-default text-sm">
                  <div>Base Imponible: <span className="font-bold text-black">${manualForm.baseImponible.toFixed(2)}</span></div>
                  <div>IVA 15%: <span className="font-bold text-black">${manualForm.ivaValor.toFixed(2)}</span></div>
                  <div>Total: <span className="font-bold text-md text-black">${manualForm.total.toFixed(2)}</span></div>
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
            <div className="p-4 rounded-md border border-border-default bg-white">
              <h3 className="text-base font-semibold text-black mb-3">Resumen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-primary">Modo</span><span className="font-medium text-black">{manualForm.type === 'con_inventario' ? 'Con Inventario' : 'Sin Inventario'}</span></div>
                <div className="flex justify-between"><span className="text-text-primary">Items</span><span className="font-medium text-black">{manualForm.items.length}</span></div>
                <div className="flex justify-between"><span className="text-text-primary">Base Imponible</span><span className="font-medium text-black">${manualForm.baseImponible.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-text-primary">IVA</span><span className="font-medium text-black">${manualForm.ivaValor.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-border-default pt-2"><span className="font-semibold text-black">Total</span><span className="font-bold text-black">${manualForm.total.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="p-4 rounded-md border border-border-default bg-surface-card">
              <p className="text-xs text-text-secondary">
                <strong>Promedio Ponderado:</strong> Las compras con inventario recalculan automaticamente el costo promedio. Nuevo Costo = (Stock Actual x Costo Actual + Cantidad Comprada x Costo Compra) / (Stock Actual + Cantidad Comprada).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: RIDE Viewer ============ */}
      {selectedRide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedRide(null)}>
          <div className="w-full max-w-lg bg-white rounded-lg border border-border-default" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
              <h3 className="text-md font-semibold text-black">RIDE - {selectedRide.documentNumber}</h3>
              <button onClick={() => setSelectedRide(null)} className="btn-icon text-gray-500"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-2 text-sm text-black">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-text-primary">Proveedor:</span> <span className="font-medium">{selectedRide.razonSocial}</span></div>
                <div><span className="text-text-primary">RUC:</span> <span className="font-medium">{selectedRide.ruc}</span></div>
                <div><span className="text-text-primary">Fecha:</span> <span className="font-medium">{selectedRide.date}</span></div>
                <div><span className="text-text-primary">Tipo:</span> <span className="font-medium uppercase">{selectedRide.tipoComprobante}</span></div>
              </div>
              <div className="border-t border-border-default pt-2 mt-2 space-y-1">
                <div className="flex justify-between"><span>Base Imponible:</span><span className="font-mono font-bold">${(selectedRide.baseImponible || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IVA 15%:</span><span className="font-mono font-bold">${(selectedRide.ivaValor || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-md border-t border-border-default pt-1"><span className="font-semibold">TOTAL:</span><span className="font-bold">${(selectedRide.total || 0).toFixed(2)}</span></div>
              </div>
              <div className="pt-2"><span className="text-text-primary">Clave de Acceso:</span> <span className="font-mono text-xs break-all">{selectedRide.claveAcceso}</span></div>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40" onClick={() => setImportModal(null)}>
          <div className="w-full max-w-md bg-white rounded-lg border border-border-default" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
              <h3 className="text-md font-semibold text-black">Importar a Historial de Compras</h3>
              <button onClick={() => setImportModal(null)} className="btn-icon text-gray-500"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-text-primary">
                <strong>{importModal.bill.razonSocial}</strong> — {importModal.bill.documentNumber}<br />
                Total: <strong>${(importModal.bill.total || 0).toFixed(2)}</strong>
              </p>
              <div className="space-y-2">
                {/* eslint-disable-next-line react-hooks/immutability */}
                <button onClick={() => handleConfirmImport('con_inventario')} className="w-full p-3 rounded-md border border-border-default text-left hover:bg-surface-bg transition-all">
                  <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-[var(--primary-color)]" /><span className="text-base font-semibold text-black">Con Movimiento de Inventario</span></div>
                  <p className="text-xs text-text-primary">Actualiza stock, calcula promedio ponderado y registra en kardex.</p>
                </button>
                <button onClick={() => handleConfirmImport('sin_inventario')} className="w-full p-3 rounded-md border border-border-default text-left hover:bg-surface-bg transition-all">
                  <div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-[var(--primary-color)]" /><span className="text-base font-semibold text-black">Sin Movimiento de Inventario</span></div>
                  <p className="text-xs text-text-primary">Solo registro contable, no afecta stock ni kardex.</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: Confirmar Extraccion SRI ============ */}
      {confirmFetch && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmFetch(false)}>
          <div className="w-full max-w-sm bg-white rounded-lg border border-border-default" onClick={e => e.stopPropagation()}>
            <div className="p-5 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-surface-card flex items-center justify-center">
                <RefreshCw size={24} className="text-[var(--primary-color)]" />
              </div>
              <div>
                <h3 className="text-md font-semibold text-black">Buzon SRI vacio</h3>
                <p className="text-sm text-text-primary mt-1">El buzon de comprobantes esta vacio. Desea extraer los comprobantes electronicos del SRI?</p>
              </div>
              <div className="text-left bg-surface-bg p-3 rounded-md text-xs text-text-primary">
                <p className="font-semibold text-black mb-1">Se extraeran:</p>
                <p>Facturas, Notas de Credito y Retenciones recibidas para el RUC <strong>{companyRuc}</strong>.</p>
                {filterDateFrom && <p className="mt-1">Periodo: <strong>{filterDateFrom}</strong> al <strong>{filterDateTo || 'hoy'}</strong></p>}
                <p className="mt-1">Los comprobantes ya existentes no se duplicaran.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmFetch(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button onClick={async () => { setConfirmFetch(false); await handleExtractSri(); }} className="flex-1 btn-primary">
                  <Download size={14} /> Extraer del SRI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: Confirmar Limpieza de Buzon ============ */}
      {confirmClear && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmClear(false)}>
          <div className="w-full max-w-sm bg-white rounded-lg border border-border-default" onClick={e => e.stopPropagation()}>
            <div className="p-5 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-surface-card flex items-center justify-center">
                <Trash2 size={24} className="text-text-secondary" />
              </div>
              <div>
                <h3 className="text-md font-semibold text-black">Limpiar buzon SRI</h3>
                <p className="text-sm text-text-primary mt-1">Esta seguro de eliminar <strong>TODOS</strong> los comprobantes del buzon? Esta accion no se puede deshacer.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmClear(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button onClick={handleClearBuzon} disabled={loading} className="flex-1 btn-danger">
                  <Trash2 size={14} /> {loading ? 'Eliminando...' : 'Si, eliminar todo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: Confirmar Eliminacion Individual ============ */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDeleteId(null)}>
          <div className="w-full max-w-sm bg-white rounded-lg border border-border-default" onClick={e => e.stopPropagation()}>
            <div className="p-5 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-surface-card flex items-center justify-center">
                <Trash2 size={24} className="text-text-secondary" />
              </div>
              <div>
                <h3 className="text-md font-semibold text-black">Eliminar comprobante</h3>
                <p className="text-sm text-text-primary mt-1">Desea eliminar este comprobante del buzon SRI?</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDeleteId(null)} className="flex-1 btn-secondary">Cancelar</button>
                <button onClick={() => handleDeleteBill(confirmDeleteId)} className="flex-1 btn-danger">
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
