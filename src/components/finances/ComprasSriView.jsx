import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiHeading, UiCard, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useEffect } from 'react';
import { 
  Download, CheckCircle2, AlertTriangle, FileText, RefreshCw, 
  Eye, Search, X, Plus, Trash2, Upload,
  Package, FileCheck, ArrowRight
} from 'lucide-react';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from '../../services/financeStore.js';
import { getEcuadorDateString } from '../../services/sriService';
import { registrarMovimientoKardex } from '../../services/inventoryService';
import { sincronizarCompra } from '../../services/integracionFinanzasService';
import { Badge } from '../ui/badge';

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
  
  
  // eslint-disable-next-line no-unused-vars
  const badgeClass = (status) => `inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${status === 'Importado' || status === 'Nuevo' && !status ? {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}} : {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}}}`;

  const filteredSuppliers = thirdParties.filter(t => 
    supplierSearch ? (t.name?.toLowerCase().includes(supplierSearch.toLowerCase()) || t.ruc?.includes(supplierSearch)) : true
  ).slice(0, 8);

  const filteredProducts = products.filter(p =>
    productSearchTerm ? (p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())) : true
  ).slice(0, 10);

  return (
    <UiBox {...{"className":"space-y-4"}}>
      {/* Header + Tabs */}
      <UiBox {...{"className":"flex items-center gap-4 flex-wrap"}}>
        <UiHeading as="h2" {...{"color":"gray","weight":"bold","highContrast":true}}>Comprobantes SRI</UiHeading>
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"flex overflow-hidden"}}>
          <UiButton onClick={() => setActiveSection('sri')} {...mergeThemeProps({"size":"2"}, {}, (activeSection === 'sri' ? {"variant":"solid","color":"gray"} : {"variant":"surface","color":"gray"}))}>Buzon SRI</UiButton>
          <UiButton onClick={() => setActiveSection('manual')} {...mergeThemeProps({"size":"2"}, {}, (activeSection === 'manual' ? {"variant":"solid","color":"gray"} : {"variant":"surface","color":"gray"}))}>Registro Manual</UiButton>
        </UiBox>
      </UiBox>

      {/* ============ SECTION A: BUZON SRI ============ */}
      {activeSection === 'sri' && (
        <>
          {!companyRuc && (
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"p-4 flex items-center gap-2"}}>
              <AlertTriangle size={16} /> Configura el RUC de tu empresa en Ajustes para consultar el buzon SRI.
            </UiCard>
          )}

          <UiBox {...{"className":"flex items-center gap-3 flex-wrap"}}>
            <UiButton onClick={handleFetchSriBills} disabled={loading || !companyRuc} {...{"variant":"solid","color":"blue"}}>
              <RefreshCw size={14} {...(loading ? {"className":"animate-spin"} : {})} />
              <UiText>{loading ? 'Consultando...' : 'Consultar SRI'}</UiText>
            </UiButton>
            <UiLabel {...{"size":"2","weight":"medium","color":"gray","highContrast":true,"className":"flex items-center gap-1.5 px-3 py-2 cursor-pointer"}}>
              <Upload size={14} />
              <UiText>Subir XML</UiText>
              <UiInput type="file" accept=".xml" onChange={handleXmlUpload} {...{"className":"hidden"}} />
            </UiLabel>
            <UiBox className="flex-1 min-w-[200px] max-w-xs">
              <UiInput
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
                iconSuffix={searchTerm ? (
                  <button type="button" onClick={() => setSearchTerm('')} className="text-[var(--gray-10)] hover:text-[var(--gray-12)] p-0.5 cursor-pointer">
                    <X size={12} />
                  </button>
                ) : undefined}
                size="2"
                color="gray"
                className="w-full"
              />
            </UiBox>
            <UiSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} {...{"size":"2","color":"gray"}}>
              <option value="all">Todos ({sriBills.length})</option><option value="nuevo">Pendientes ({sriBills.filter(b => !isBillImported(b)).length})</option><option value="importado">Ya en Compras ({sriBills.filter(b => isBillImported(b)).length})</option>
            </UiSelect>
            <UiSelect value={filterType} onChange={e => setFilterType(e.target.value)} {...{"size":"2","color":"gray"}}>
              <option value="all">Todos los tipos</option><option value="factura">Facturas</option><option value="nota_credito">Notas de Credito</option><option value="retencion">Retenciones</option>
            </UiSelect>
            <UiBox {...{"className":"flex items-center gap-1.5"}}>
              <UiInput type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} {...{"size":"2","color":"gray","className":"w-[130px]"}} placeholder="Desde" />
              <UiText {...{"size":"1","color":"gray","highContrast":true}}>a</UiText>
              <UiInput type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} {...{"size":"2","color":"gray","className":"w-[130px]"}} placeholder="Hasta" />
            </UiBox>
            {sriBills.length > 0 && (
              <UiButton onClick={() => setConfirmClear(true)} disabled={loading} {...{"size":"2","variant":"surface","color":"gray","className":"flex items-center gap-1"}}>
                <Trash2 size={12} /> Limpiar Buzon
              </UiButton>
            )}
          </UiBox>

          {/* Summary bar */}
          {sriBills.length > 0 && (
            <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-4 flex-wrap"}}>
              <UiText><strong {...{"style":{"color":"var(--gray-12)"}}}>{filteredBills.length}</strong> de <strong {...{"style":{"color":"var(--gray-12)"}}}>{sriBills.length}</strong> comprobantes</UiText>
              <UiText {...{"className":"flex items-center gap-1"}}><UiText {...{"className":"w-2 h-2"}}></UiText> {sriBills.filter(b => isBillImported(b)).length} ya en compras</UiText>
              <UiText {...{"className":"flex items-center gap-1"}}><UiText {...{"className":"w-2 h-2"}}></UiText> {sriBills.filter(b => !isBillImported(b)).length} pendientes</UiText>
            </UiBox>
          )}

          {/* SRI Table */}
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
            <UiBox {...{"className":"overflow-x-auto"}}>
              <UiTable {...{"className":"w-full text-left"}}>
                <UiTableHeader>
                  <UiTableRow>
                    <UiTableHead {...{"style":{"color":"var(--gray-12)"}}}>Tipo</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-12)"}}}>Fecha</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-12)"}}}>Proveedor</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-12)"}}}>Nro Doc</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"text-right hidden sm:table-cell"}}>Base</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"text-right hidden sm:table-cell"}}>IVA</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"text-right"}}>Total</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-12)"}}}>Estado</UiTableHead>
                    <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"text-center"}}>Acciones</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody>
                  {filteredBills.length === 0 && !loading ? (
                    <UiTableRow><UiTableCell colSpan={9} {...{"className":"text-center py-10"}}>
                      <UiBox {...{"className":"max-w-sm mx-auto space-y-3"}}>
                        <Download size={32} {...{"style":{"color":"var(--gray-11)"},"className":"mx-auto"}} />
                        <UiText as="p" {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>Buzon SRI vacio</UiText>
                        <UiText as="p" {...{"size":"1","color":"gray","highContrast":true}}>No tienes comprobantes electronicos sincronizados. Para empezar:</UiText>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"text-left space-y-1.5"}}>
                          <UiText as="p">1. Haz clic en <strong>"Consultar SRI"</strong> para extraer tus comprobantes del buzon electronico.</UiText>
                          <UiText as="p">2. O sube manualmente tus archivos <strong>XML</strong> descargados del portal SRI.</UiText>
                          <UiText as="p">3. Luego importa cada comprobante a tu <strong>Historial de Compras</strong>.</UiText>
                        </UiBox>
                        <UiLabel {...{"variant":"solid","color":"blue","className":"cursor-pointer"}}>
                          <Upload size={14} />
                          <UiText>Subir primer XML</UiText>
                          <UiInput type="file" accept=".xml" onChange={handleXmlUpload} {...{"className":"hidden"}} />
                        </UiLabel>
                      </UiBox>
                    </UiTableCell></UiTableRow>
                  ) : loading ? (
                    <UiTableRow><UiTableCell colSpan={9} {...{"style":{"color":"var(--gray-12)"},"className":"text-center py-10"}}>Cargando comprobantes...</UiTableCell></UiTableRow>
                  ) : filteredBills.map(bill => {
                    const imported = isBillImported(bill);
                    return (
                      <UiTableRow key={bill.id}>
                        <UiTableCell>
                          <Badge variant="soft" color={bill.tipoComprobante === 'nota_credito' ? 'indigo' : (bill.tipoComprobante === 'retencion' ? 'purple' : 'blue')} size="1">
                            {bill.tipoComprobante === 'nota_credito' ? 'NC' : bill.tipoComprobante === 'retencion' ? 'RET' : 'FAC'}
                          </Badge>
                        </UiTableCell>
                        <UiTableCell style={{ color: "var(--gray-12)" }}>{bill.date}</UiTableCell>
                        <UiTableCell>
                          <UiBox style={{ color: "var(--gray-12)" }} className="font-medium text-xs">{bill.razonSocial}</UiBox>
                          <UiBox style={{ color: "var(--gray-11)" }} className="text-xs">{bill.ruc}</UiBox>
                        </UiTableCell>
                        <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-12)" }}>{bill.documentNumber}</UiTableCell>
                        <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-12)" }} className="text-right hidden sm:table-cell">${(bill.baseImponible || 0).toFixed(2)}</UiTableCell>
                        <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-12)" }} className="text-right hidden sm:table-cell">${(bill.ivaValor || 0).toFixed(2)}</UiTableCell>
                        <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-12)" }} className="text-right font-medium">${(bill.total || 0).toFixed(2)}</UiTableCell>
                        <UiTableCell>
                          <Badge variant="soft" color={imported ? "green" : "amber"} size="1">
                            {imported ? <CheckCircle2 size={10} className="mr-1 inline" /> : <AlertTriangle size={10} className="mr-1 inline" />}
                            {imported ? 'Ya en Compras' : 'Pendiente'}
                          </Badge>
                        </UiTableCell>
                        <UiTableCell>
                          <UiBox className="flex items-center justify-center gap-1.5">
                            <UiButton iconOnly variant="soft" color="amber" size="1" onClick={() => handleViewRide(bill)} title="Ver RIDE"><Eye size={13} /></UiButton>
                            <UiButton iconOnly variant="soft" color="blue" size="1" onClick={() => handleDownloadXml(bill)} title="Descargar XML"><Download size={13} /></UiButton>
                            {!imported && (
                              <UiButton iconOnly variant="soft" color="green" size="1" onClick={() => handleOpenImport(bill)} title="Importar a Compras"><ArrowRight size={13} /></UiButton>
                            )}
                            <UiButton iconOnly variant="soft" color="red" size="1" onClick={() => setConfirmDeleteId(bill.id)} title="Eliminar del buzon"><Trash2 size={13} /></UiButton>
                          </UiBox>
                        </UiTableCell>
                      </UiTableRow>
                    );
                  })}
                </UiTableBody>
              </UiTable>
            </UiBox>
          </UiBox>
        </>
      )}

      {/* ============ SECTION B: REGISTRO MANUAL ============ */}
      {activeSection === 'manual' && (
        <UiBox {...{"className":"grid grid-cols-1 lg:grid-cols-3 gap-4"}}>
          {/* Left: Form */}
          <UiBox {...{"className":"lg:col-span-2 space-y-4"}}>
            {/* Method selector */}
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 space-y-3"}}>
              <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Tipo de registro</UiLabel>
              <UiBox {...{"className":"flex gap-2"}}>
                <UiButton onClick={() => setManualForm(prev => ({ ...prev, type: 'con_inventario' }))} {...mergeThemeProps({"variant":"outline","className":"flex-1 text-left"}, {}, (manualForm.type === 'con_inventario' ? {"variant":"solid","color":"gray"} : {}))}>
                  <UiBox {...{"className":"flex items-center gap-2 mb-1"}}><Package size={16} {...{}} /><UiText {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>Con Movimiento de Inventario</UiText></UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","highContrast":true}}>Actualiza stock y kardex con promedio ponderado. Ideal para compras de productos fisicos.</UiText>
                </UiButton>
                <UiButton onClick={() => setManualForm(prev => ({ ...prev, type: 'sin_inventario' }))} {...mergeThemeProps({"variant":"outline","className":"flex-1 text-left"}, {}, (manualForm.type === 'sin_inventario' ? {"variant":"solid","color":"gray"} : {}))}>
                  <UiBox {...{"className":"flex items-center gap-2 mb-1"}}><FileText size={16} {...{}} /><UiText {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>Sin Movimiento de Inventario</UiText></UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","highContrast":true}}>Solo registro contable. Para gastos, servicios o compras informales sin items.</UiText>
                </UiButton>
              </UiBox>
            </UiCard>

            {/* Supplier + Document Info */}
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 space-y-3"}}>
              <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 gap-3"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Proveedor</UiLabel>
                  <UiBox {...{"className":"relative"}}>
                    <UiInput value={manualForm.supplierName} onFocus={() => setShowSupplierSearch(true)} onBlur={() => setTimeout(() => setShowSupplierSearch(false), 200)} onChange={e => { setManualForm(prev => ({ ...prev, supplierName: e.target.value })); setSupplierSearch(e.target.value); setShowSupplierSearch(true); }} placeholder="Buscar o escribir proveedor..." {...{"size":"2","color":"gray","className":"w-full"}} />
                    {showSupplierSearch && filteredSuppliers.length > 0 && (
                      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"absolute z-20 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto"}}>
                        {filteredSuppliers.map(t => (
                          <UiButton key={t.id} type="button" onMouseDown={() => { setManualForm(prev => ({ ...prev, supplierId: t.id, supplierName: t.name, supplierRuc: t.ruc || '' })); setShowSupplierSearch(false); setSupplierSearch(''); }} {...{"size":"2","color":"gray","className":"w-full text-left"}}>
                            <UiBox {...{}}>{t.name}</UiBox>
                            {t.ruc && <UiBox {...{"style":{"color":"var(--gray-12)"}}}>{t.ruc}</UiBox>}
                          </UiButton>
                        ))}
                      </UiBox>
                    )}
                  </UiBox>
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>RUC Proveedor</UiLabel>
                  <UiInput value={manualForm.supplierRuc} onChange={e => setManualForm(prev => ({ ...prev, supplierRuc: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}} />
                </UiBox>
              </UiBox>
              <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-3"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Tipo Documento</UiLabel>
                  <UiSelect value={manualForm.documentType} onChange={e => setManualForm(prev => ({ ...prev, documentType: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}}>
                    <option value="factura">Factura</option><option value="nota_venta">Nota de Venta</option><option value="liquidacion">Liquidacion</option>
                  </UiSelect>
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Nro Documento</UiLabel>
                  <UiInput value={manualForm.documentNumber} onChange={e => setManualForm(prev => ({ ...prev, documentNumber: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}} />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Fecha</UiLabel>
                  <UiInput type="date" value={manualForm.date} onChange={e => setManualForm(prev => ({ ...prev, date: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}} />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Bodega</UiLabel>
                  <UiSelect value={manualForm.bodega} onChange={e => setManualForm(prev => ({ ...prev, bodega: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}}>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </UiSelect>
                </UiBox>
              </UiBox>
              <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 gap-3"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Clave de Acceso SRI (opcional)</UiLabel>
                  <UiInput value={manualForm.claveAcceso} onChange={e => setManualForm(prev => ({ ...prev, claveAcceso: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}} placeholder="49 digitos" />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Referencia / Descripcion</UiLabel>
                  <UiInput value={manualForm.description} onChange={e => setManualForm(prev => ({ ...prev, description: e.target.value }))} {...{"size":"2","color":"gray","className":"w-full"}} />
                </UiBox>
              </UiBox>
            </UiCard>

            {/* Items section (only for con_inventario) */}
            {manualForm.type === 'con_inventario' && (
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 space-y-3"}}>
                <UiBox {...{"className":"flex items-center justify-between"}}>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"}}>Productos</UiLabel>
                  <UiBox {...{"className":"flex gap-2"}}>
                    <UiLabel {...{"size":"1","weight":"medium","color":"gray","highContrast":true,"className":"flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"}}>
                      <Upload size={12} /><UiText>Importar XML</UiText>
                      <UiInput type="file" accept=".xml" onChange={handleManualXmlUpload} {...{"className":"hidden"}} />
                    </UiLabel>
                    <UiButton onClick={() => setShowProductSearch(!showProductSearch)} {...{"size":"2","variant":"surface","color":"gray","className":"flex items-center gap-1.5"}}>
                      <Plus size={12} /><UiText>Agregar Producto</UiText>
                    </UiButton>
                  </UiBox>
                </UiBox>

                {showProductSearch && (
                  <UiBox className="relative">
                    <UiInput
                      autoFocus
                      value={productSearchTerm}
                      onChange={e => setProductSearchTerm(e.target.value)}
                      placeholder="Buscar producto por nombre o SKU..."
                      iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
                      size="2"
                      color="gray"
                      className="w-full"
                    />
                    {productSearchTerm && filteredProducts.length > 0 && (
                      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"absolute z-20 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto"}}>
                        {filteredProducts.map(p => (
                          <UiButton key={p.id} onClick={() => handleManualAddItem(p)} {...{"size":"2","color":"gray","className":"w-full text-left flex justify-between items-center"}}>
                            <UiBox><UiText {...{"weight":"medium"}}>{p.name}</UiText><UiText {...{"size":"1","color":"gray","highContrast":true,"className":"ml-2"}}>{p.sku}</UiText></UiBox>
                            <UiText {...{"size":"1","weight":"regular","color":"gray","highContrast":true}}>${(p.cost || 0).toFixed(2)}</UiText>
                          </UiButton>
                        ))}
                      </UiBox>
                    )}
                  </UiBox>
                )}

                {manualForm.items.length > 0 && (
                  <UiBox {...{"className":"overflow-x-auto"}}>
                    <UiTable {...{"className":"w-full text-left"}}>
                      <UiTableHeader>
                        <UiTableRow>
                          <UiTableHead {...{"style":{"color":"var(--gray-12)"}}}>Producto</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"w-16 text-center"}}>Cant</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"w-20 text-right"}}>P. Unit</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"w-16 text-right"}}>Desc</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"w-20 text-right"}}>Subtotal</UiTableHead>
                          <UiTableHead {...{"style":{"color":"var(--gray-12)"},"className":"w-8"}}></UiTableHead>
                        </UiTableRow>
                      </UiTableHeader>
                      <UiTableBody>
                        {manualForm.items.map((item, idx) => (
                          <UiTableRow key={idx}>
                            <UiTableCell {...{"style":{"color":"var(--gray-12)"}}}>{item.name}</UiTableCell>
                            <UiTableCell {...{"className":"text-center"}}><UiInput type="number" min="1" value={item.quantity} onChange={e => handleManualItemChange(idx, 'quantity', e.target.value)} {...{"size":"2","color":"gray","className":"w-14 text-center"}} /></UiTableCell>
                            <UiTableCell {...{"className":"text-right"}}><UiInput type="number" min="0" step="0.01" value={item.price} onChange={e => handleManualItemChange(idx, 'price', e.target.value)} {...{"size":"2","color":"gray","className":"w-18 text-right"}} /></UiTableCell>
                            <UiTableCell {...{"className":"text-right"}}><UiInput type="number" min="0" step="0.01" value={item.discount} onChange={e => handleManualItemChange(idx, 'discount', e.target.value)} {...{"size":"2","color":"gray","className":"w-14 text-right"}} /></UiTableCell>
                            <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"text-right"}}>${(item.subtotal || 0).toFixed(2)}</UiTableCell>
                            <UiTableCell {...{"className":"text-center"}}><UiButton iconOnly onClick={() => handleManualRemoveItem(idx)} {...{"variant":"surface","color":"red"}}><X size={12} /></UiButton></UiTableCell>
                          </UiTableRow>
                        ))}
                      </UiTableBody>
                    </UiTable>
                  </UiBox>
                )}

                {/* Totals */}
                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-6 pt-3"}}>
                  <UiBox>Base Imponible: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${manualForm.baseImponible.toFixed(2)}</UiText></UiBox>
                  <UiBox>IVA 15%: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${manualForm.ivaValor.toFixed(2)}</UiText></UiBox>
                  <UiBox>Total: <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${manualForm.total.toFixed(2)}</UiText></UiBox>
                </UiBox>
              </UiCard>
            )}

            {/* Save button */}
            <UiBox {...{"className":"flex justify-end gap-3"}}>
              <UiButton onClick={handleManualSave} disabled={manualSaving} {...{"variant":"solid","color":"blue"}}>
                <FileCheck size={14} />
                <UiText>{manualSaving ? 'Guardando...' : 'Registrar Compra'}</UiText>
              </UiButton>
            </UiBox>
          </UiBox>

          {/* Right: Summary card */}
          <UiBox {...{"className":"space-y-3"}}>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiHeading as="h3" {...{"size":"3","weight":"bold","color":"gray","highContrast":true,"className":"mb-3"}}>Resumen</UiHeading>
              <UiBox {...{"className":"space-y-2"}}>
                <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray","highContrast":true}}>Modo</UiText><UiText {...{"weight":"medium","color":"gray","highContrast":true}}>{manualForm.type === 'con_inventario' ? 'Con Inventario' : 'Sin Inventario'}</UiText></UiBox>
                <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray","highContrast":true}}>Items</UiText><UiText {...{"weight":"medium","color":"gray","highContrast":true}}>{manualForm.items.length}</UiText></UiBox>
                <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray","highContrast":true}}>Base Imponible</UiText><UiText {...{"weight":"medium","color":"gray","highContrast":true}}>${manualForm.baseImponible.toFixed(2)}</UiText></UiBox>
                <UiBox {...{"className":"flex justify-between"}}><UiText {...{"color":"gray","highContrast":true}}>IVA</UiText><UiText {...{"weight":"medium","color":"gray","highContrast":true}}>${manualForm.ivaValor.toFixed(2)}</UiText></UiBox>
                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-2"}}><UiText {...{"weight":"bold","color":"gray","highContrast":true}}>Total</UiText><UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${manualForm.total.toFixed(2)}</UiText></UiBox>
              </UiBox>
            </UiCard>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
              <UiText as="p" {...{"size":"1","color":"gray"}}>
                <strong>Promedio Ponderado:</strong> Las compras con inventario recalculan automaticamente el costo promedio. Nuevo Costo = (Stock Actual x Costo Actual + Cantidad Comprada x Costo Compra) / (Stock Actual + Cantidad Comprada).
              </UiText>
            </UiCard>
          </UiBox>
        </UiBox>
      )}

      {/* ============ MODAL: RIDE Viewer ============ */}
      {selectedRide && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={() => setSelectedRide(null)}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-lg"}} onClick={e => e.stopPropagation()}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-3"}}>
              <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>RIDE - {selectedRide.documentNumber}</UiHeading>
              <UiButton iconOnly onClick={() => setSelectedRide(null)} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
            </UiBox>
            <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"p-5 space-y-2"}}>
              <UiBox {...{"className":"grid grid-cols-2 gap-2"}}>
                <UiBox><UiText {...{"color":"gray","highContrast":true}}>Proveedor:</UiText> <UiText {...{"weight":"medium"}}>{selectedRide.razonSocial}</UiText></UiBox>
                <UiBox><UiText {...{"color":"gray","highContrast":true}}>RUC:</UiText> <UiText {...{"weight":"medium"}}>{selectedRide.ruc}</UiText></UiBox>
                <UiBox><UiText {...{"color":"gray","highContrast":true}}>Fecha:</UiText> <UiText {...{"weight":"medium"}}>{selectedRide.date}</UiText></UiBox>
                <UiBox><UiText {...{"color":"gray","highContrast":true}}>Tipo:</UiText> <UiText {...{"weight":"medium"}}>{selectedRide.tipoComprobante}</UiText></UiBox>
              </UiBox>
              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-2 mt-2 space-y-1"}}>
                <UiBox {...{"className":"flex justify-between"}}><UiText>Base Imponible:</UiText><UiText {...{"weight":"bold"}}>${(selectedRide.baseImponible || 0).toFixed(2)}</UiText></UiBox>
                <UiBox {...{"className":"flex justify-between"}}><UiText>IVA 15%:</UiText><UiText {...{"weight":"bold"}}>${(selectedRide.ivaValor || 0).toFixed(2)}</UiText></UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)","borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-1"}}><UiText {...{"weight":"bold"}}>TOTAL:</UiText><UiText {...{"weight":"bold"}}>${(selectedRide.total || 0).toFixed(2)}</UiText></UiBox>
              </UiBox>
              <UiBox {...{"className":"pt-2"}}><UiText {...{"color":"gray","highContrast":true}}>Clave de Acceso:</UiText> <UiText {...{"weight":"regular","size":"1","className":"break-all"}}>{selectedRide.claveAcceso}</UiText></UiBox>
              <UiBox {...{"className":"pt-3 flex gap-2"}}>
                <UiButton onClick={() => { handleDownloadXml(selectedRide); }} {...{"variant":"surface","color":"blue"}}><Download size={14} /> Descargar XML</UiButton>
                {!isBillImported(selectedRide) && <UiButton onClick={() => { setSelectedRide(null); handleOpenImport(selectedRide); }} {...{"variant":"solid","color":"blue"}}><ArrowRight size={14} /> Importar</UiButton>}
              </UiBox>
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      {/* ============ MODAL: Import Method Selector ============ */}
      {importModal && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={() => setImportModal(null)}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-md"}} onClick={e => e.stopPropagation()}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-3"}}>
              <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>Importar a Historial de Compras</UiHeading>
              <UiButton iconOnly onClick={() => setImportModal(null)} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
            </UiBox>
            <UiBox {...{"className":"p-5 space-y-3"}}>
              <UiText as="p" {...{"size":"2","color":"gray","highContrast":true}}>
                <strong>{importModal.bill.razonSocial}</strong> — {importModal.bill.documentNumber}<br />
                Total: <strong>${(importModal.bill.total || 0).toFixed(2)}</strong>
              </UiText>
              <UiBox {...{"className":"space-y-2"}}>
                {/* eslint-disable-next-line react-hooks/immutability */}
                <UiButton onClick={() => handleConfirmImport('con_inventario')} {...{"variant":"outline","className":"w-full text-left"}}>
                  <UiBox {...{"className":"flex items-center gap-2 mb-1"}}><Package size={16} {...{}} /><UiText {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>Con Movimiento de Inventario</UiText></UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","highContrast":true}}>Actualiza stock, calcula promedio ponderado y registra en kardex.</UiText>
                </UiButton>
                <UiButton onClick={() => handleConfirmImport('sin_inventario')} {...{"variant":"outline","className":"w-full text-left"}}>
                  <UiBox {...{"className":"flex items-center gap-2 mb-1"}}><FileText size={16} {...{}} /><UiText {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>Sin Movimiento de Inventario</UiText></UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","highContrast":true}}>Solo registro contable, no afecta stock ni kardex.</UiText>
                </UiButton>
              </UiBox>
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      {/* ============ MODAL: Confirmar Extraccion SRI ============ */}
      {confirmFetch && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={() => setConfirmFetch(false)}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-sm"}} onClick={e => e.stopPropagation()}>
            <UiBox {...{"className":"p-5 text-center space-y-4"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)"},"className":"mx-auto w-12 h-12 flex items-center justify-center"}}>
                <RefreshCw size={24} {...{}} />
              </UiBox>
              <UiBox>
                <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>Buzon SRI vacio</UiHeading>
                <UiText as="p" {...{"size":"2","color":"gray","highContrast":true,"className":"mt-1"}}>El buzon de comprobantes esta vacio. Desea extraer los comprobantes electronicos del SRI?</UiText>
              </UiBox>
              <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","borderRadius":"var(--radius-3)","color":"var(--gray-12)"},"className":"text-left p-3"}}>
                <UiText as="p" {...{"weight":"bold","color":"gray","highContrast":true,"className":"mb-1"}}>Se extraeran:</UiText>
                <UiText as="p">Facturas, Notas de Credito y Retenciones recibidas para el RUC <strong>{companyRuc}</strong>.</UiText>
                {filterDateFrom && <UiText as="p" {...{"className":"mt-1"}}>Periodo: <strong>{filterDateFrom}</strong> al <strong>{filterDateTo || 'hoy'}</strong></UiText>}
                <UiText as="p" {...{"className":"mt-1"}}>Los comprobantes ya existentes no se duplicaran.</UiText>
              </UiBox>
              <UiBox {...{"className":"flex gap-2"}}>
                <UiButton onClick={() => setConfirmFetch(false)} {...{"variant":"surface","color":"blue","className":"flex-1"}}>Cancelar</UiButton>
                <UiButton onClick={async () => { setConfirmFetch(false); await handleExtractSri(); }} {...{"variant":"solid","color":"blue","className":"flex-1"}}>
                  <Download size={14} /> Extraer del SRI
                </UiButton>
              </UiBox>
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      {/* ============ MODAL: Confirmar Limpieza de Buzon ============ */}
      {confirmClear && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={() => setConfirmClear(false)}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-sm"}} onClick={e => e.stopPropagation()}>
            <UiBox {...{"className":"p-5 text-center space-y-4"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)"},"className":"mx-auto w-12 h-12 flex items-center justify-center"}}>
                <Trash2 size={24} {...{"style":{"color":"var(--gray-11)"}}} />
              </UiBox>
              <UiBox>
                <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>Limpiar buzon SRI</UiHeading>
                <UiText as="p" {...{"size":"2","color":"gray","highContrast":true,"className":"mt-1"}}>Esta seguro de eliminar <strong>TODOS</strong> los comprobantes del buzon? Esta accion no se puede deshacer.</UiText>
              </UiBox>
              <UiBox {...{"className":"flex gap-2"}}>
                <UiButton onClick={() => setConfirmClear(false)} {...{"variant":"surface","color":"blue","className":"flex-1"}}>Cancelar</UiButton>
                <UiButton onClick={handleClearBuzon} disabled={loading} {...{"variant":"soft","color":"red","className":"flex-1"}}>
                  <Trash2 size={14} /> {loading ? 'Eliminando...' : 'Si, eliminar todo'}
                </UiButton>
              </UiBox>
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      {/* ============ MODAL: Confirmar Eliminacion Individual ============ */}
      {confirmDeleteId && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={() => setConfirmDeleteId(null)}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-sm"}} onClick={e => e.stopPropagation()}>
            <UiBox {...{"className":"p-5 text-center space-y-4"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)"},"className":"mx-auto w-12 h-12 flex items-center justify-center"}}>
                <Trash2 size={24} {...{"style":{"color":"var(--gray-11)"}}} />
              </UiBox>
              <UiBox>
                <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>Eliminar comprobante</UiHeading>
                <UiText as="p" {...{"size":"2","color":"gray","highContrast":true,"className":"mt-1"}}>Desea eliminar este comprobante del buzon SRI?</UiText>
              </UiBox>
              <UiBox {...{"className":"flex gap-2"}}>
                <UiButton onClick={() => setConfirmDeleteId(null)} {...{"variant":"surface","color":"blue","className":"flex-1"}}>Cancelar</UiButton>
                <UiButton onClick={() => handleDeleteBill(confirmDeleteId)} {...{"variant":"soft","color":"red","className":"flex-1"}}>
                  <Trash2 size={14} /> Eliminar
                </UiButton>
              </UiBox>
            </UiBox>
          </UiCard>
        </UiBox>
      )}
    </UiBox>
  );
}
