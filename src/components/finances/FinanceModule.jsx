import React, { useState, useEffect } from 'react';
import { 
  DollarSign, PieChart, Users, FileText, Download, Settings, Sparkles, ShoppingCart, Package, Bookmark,
  ArrowDownCircle, ArrowUpCircle, TrendingUp, Calculator, Building, Percent, CreditCard, ShoppingBag,
  X, ArrowRight, Upload
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { getEcuadorDateString } from '../../services/sriService';
import { registrarMovimientoKardex } from '../../services/inventoryService';
import { db, storage, appId } from '../../firebase';
import FinanceDashboard from './FinanceDashboard';
import TransactionsView from './TransactionsView';
import ThirdPartiesView from './ThirdPartiesView';
import ReportsView from './ReportsView';
import FinanceChat from './FinanceChat';
import InventoryModule from '../inventory/InventoryModule';
import QuotesView from './QuotesView';
import PosView from './PosView';
import TransactionForm from './TransactionForm';
import PurchaseForm from './PurchaseForm';
import AccountsReceivablePayable from './AccountsReceivablePayable';
import SalesDashboard from './SalesDashboard';
import ComprasGastosView from './ComprasGastosView';
import GastosCreditosModule from './GastosCreditosModule';

export default function FinanceModule({ 
  mode = 'contabilidad', 
  initialSubTab, 
  showToast,
  transactions = [],
  thirdParties = [],
  products = [],
  isLoading = false
}) {
  const getInitialTab = (m) => {
    if (m === 'ventas') return 'ventas';
    if (m === 'inventario') return 'products';
    if (m === 'personas') return 'personas';
    if (m === 'compras') return 'compras_resumen';
    return 'dashboard'; // 'contabilidad'
  };

  const [activeTab, setActiveTab] = useState(() => {
    if (initialSubTab && (mode === 'compras' || mode === 'contabilidad')) {
      return initialSubTab;
    }
    return getInitialTab(mode);
  });

  // Sync state if mode changes
  useEffect(() => {
    if (initialSubTab && (mode === 'compras' || mode === 'contabilidad')) {
      setActiveTab(initialSubTab);
    } else {
      setActiveTab(getInitialTab(mode));
    }
  }, [mode]);

  // Sincronizar subTab de ventas y personas desde prop de navegación rápida
  useEffect(() => {
    if (initialSubTab) {
      if (mode === 'ventas') {
        if (initialSubTab === 'ventas_preventa') {
          setSubTabVentas('resumen_ventas');
          setEditingTx(null);
          setIsModalOpen(true);
          setActiveTab('ventas');
        } else {
          const targetSub = String(initialSubTab).startsWith('pos') ? 'pos' : initialSubTab;
          setSubTabVentas(targetSub);
          setActiveTab('ventas');
        }
      } else if (mode === 'personas') {
        setSubTabPersonas(initialSubTab);
      } else if (mode === 'compras') {
        setActiveTab(initialSubTab);
      } else if (mode === 'contabilidad') {
        setActiveTab(initialSubTab);
      }
    }
  }, [initialSubTab, mode]);

  // Estados de sub-navegación ERP
  const [subTabVentas, setSubTabVentas] = useState(() => (mode === 'ventas' && initialSubTab) ? (String(initialSubTab).startsWith('pos') ? 'pos' : initialSubTab) : 'resumen_ventas');
  const [subTabSri, setSubTabSri] = useState('nota_credito');
  const [subTabPersonas, setSubTabPersonas] = useState(() => (mode === 'personas' && initialSubTab) ? initialSubTab : 'cliente');

  // Estados centralizados para el modal de Facturación / SRI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [purchaseMethod, setPurchaseMethod] = useState(null);
  const [showPurchaseMethodSelect, setShowPurchaseMethodSelect] = useState(false);

  const isFormActive = isModalOpen && (
    (editingTx?.type === 'ingreso') || 
    (editingTx?.type === 'egreso' && 
      (editingTx?.documentType === 'factura' || editingTx?.documentType === 'nota_venta' || editingTx?.documentType === 'liquidacion' || !editingTx?.documentType))
  );

  // Abrir modal de factura prellenada (desde POS o Cotizaciones)
  const handleOpenFormModal = (prefilledData = null) => {
    // In compras mode, show method selector for NEW purchases (no existing id)
    if (mode === 'compras' && (!prefilledData || !prefilledData.id)) {
      setShowPurchaseMethodSelect(true);
      setEditingTx(prefilledData);
      return;
    }
    setEditingTx(prefilledData);
    setIsModalOpen(true);
  };

  const handleConfirmPurchaseMethod = (method) => {
    setPurchaseMethod(method);
    setShowPurchaseMethodSelect(false);
    setEditingTx(prev => ({ ...(prev || {}), type: 'egreso', purchaseMethod: method }));
    setIsModalOpen(true);
  };

  // Auto XML: parse and save directly without stepper
  const handleAutoXmlPurchase = async (e, method) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setShowPurchaseMethodSelect(false);
    showToast?.('Procesando XML...', 'info');
    
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
      const documentNumber = `${estab}-${ptoEmi}-${secuencial}`;

      const infoFact = xmlDoc.getElementsByTagName("infoFactura")?.[0];
      const fechaEmision = infoFact?.getElementsByTagName("fechaEmision")?.[0]?.textContent || getEcuadorDateString();
      const importeTotal = Number(infoFact?.getElementsByTagName("importeTotal")?.[0]?.textContent || 0);
      const baseImponible = Number(infoFact?.getElementsByTagName("totalSinImpuestos")?.[0]?.textContent || importeTotal / 1.15);
      const ivaValor = importeTotal - baseImponible;

      const existing = thirdParties.find(t => t.ruc === ruc);
      const supplierId = existing?.id || '';

      const detalles = xmlDoc.getElementsByTagName("detalle");
      const items = [];
      for (let i = 0; i < detalles.length; i++) {
        const d = detalles[i];
        const desc = d.getElementsByTagName("descripcion")?.[0]?.textContent || '';
        const cant = Number(d.getElementsByTagName("cantidad")?.[0]?.textContent || 1);
        const precio = Number(d.getElementsByTagName("precioUnitario")?.[0]?.textContent || 0);
        const matched = products.find(p => p.sku && desc.includes(p.sku)) || products.find(p => desc.toLowerCase().includes(p.name?.toLowerCase()));
        items.push({ productId: matched?.id || '', name: matched?.name || desc, sku: matched?.sku || '', quantity: cant, price: precio, discount: 0, subtotal: cant * precio });
      }

      const docId = `compra_xml_${Date.now()}`;
      const payload = {
        id: docId, type: 'egreso', category: 'compras', documentType: 'factura',
        documentNumber, claveAcceso, date: fechaEmision,
        thirdPartyId: supplierId, thirdPartyName: razonSocial, thirdPartyRuc: ruc,
        baseImponible, ivaPorcentaje: 15, ivaValor, total: importeTotal,
        paymentMethod: 'transferencia', paymentStatus: 'pagado',
        sriStatus: 'autorizado', description: `Compra automatica XML - ${razonSocial}`,
        items, bodega: 'Bodega Central', purchaseType: method, inventarioRegistrado: false
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), payload);

      if (method === 'con_inventario' && items.length > 0) {
        for (const item of items) {
          if (item.productId) {
            try {
              await registrarMovimientoKardex(db, appId, {
                productId: item.productId, type: 'entrada',
                quantity: Number(item.quantity), cost: Number(item.price),
                price: Number(item.price),
                concept: `Compra XML #${documentNumber}`, referenceId: docId,
                bodega: 'Bodega Central'
              });
            } catch (e) { /* skip failed kardex item */ }
          }
        }
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), { inventarioRegistrado: true }, { merge: true });
      }

      showToast?.(`Compra automatica registrada: ${razonSocial} - $${importeTotal.toFixed(2)}`, 'success');
    } catch (err) { console.error(err); showToast?.('Error al procesar XML automatico', 'error'); }
  };

  // Convertir cotización a Factura
  const handlePromoteToInvoice = (quote) => {
    const prefilled = {
      id: '',
      type: 'ingreso',
      date: getEcuadorDateString(),
      documentType: 'factura',
      thirdPartyId: quote.thirdPartyId,
      category: 'ventas',
      currency: 'USD',
      baseImponible: Number(quote.subtotal),
      ivaPorcentaje: 15,
      ivaValor: Number(quote.ivaValor),
      retencionFuente: 0,
      retencionIva: 0,
      total: Number(quote.total),
      paymentMethod: 'transferencia',
      paymentStatus: 'pendiente',
      sriStatus: 'pendiente',
      items: quote.items || [],
      isPromotedFromQuote: true,
      quoteNumber: quote.quoteNumber
    };
    handleOpenFormModal(prefilled);
    setActiveTab('ventas');
    setSubTabVentas('resumen_ventas');
  };

  // Checkout desde Punto de Venta (POS)
  const handlePOSCheckout = (invoiceData) => {
    setEditingTx(invoiceData);
    setIsModalOpen(true);
  };

  const getModuleHeader = () => {
    switch (mode) {
      case 'ventas':
        return {
          title: 'Módulo de Ventas y Proformas',
          desc: 'Punto de Venta (POS), cotizaciones comerciales y facturas de venta autorizadas',
          icon: ShoppingCart
        };
      case 'inventario':
        return {
          title: 'Módulo de Inventario',
          desc: 'Catálogo de productos y servicios con parametrización de IVA del SRI',
          icon: Package
        };
      case 'personas':
        return {
          title: 'Gestión de Personas',
          desc: 'Base de datos unificada de clientes y proveedores con validación de datos SRI',
          icon: Users
        };
      case 'contabilidad':
      default:
        return {
          title: 'ERP Contabilidad y Tributación',
          desc: 'Control de ingresos/egresos, reportes contables y documentos electrónicos autorizados',
          icon: DollarSign
        };
    }
  };

  const moduleHeader = getModuleHeader();
  const ModuleIcon = moduleHeader.icon;

  const getTabsForMode = () => {
    if (mode === 'contabilidad') {
      return [
        { id: 'dashboard', label: 'Resumen', icon: PieChart },
        { id: 'sri_docs', label: 'Documentos SRI', icon: FileText },
        { id: 'cxc', label: 'Cuentas por Cobrar', icon: ArrowDownCircle },
        { id: 'cxp', label: 'Cuentas por Pagar', icon: ArrowUpCircle },
        { id: 'gastos_creditos_sub', label: 'Gastos y Creditos', icon: CreditCard },
        { id: 'gastos_ia', label: 'Gastos con IA', icon: Sparkles },
        { id: 'reports', label: 'Reportes', icon: Download },
      ];
    }
    if (mode === 'compras') {
      return [
        { id: 'compras_resumen', label: 'Historial de Compras', icon: ShoppingBag },
        { id: 'compras_nc', label: 'NC Recibidas', icon: FileText },
        { id: 'compras_nd', label: 'ND Recibidas', icon: FileText },
        { id: 'compras_retencion', label: 'Retenciones de Compras', icon: Percent }
      ];
    }
    return [];
  };

  const displayedTabs = getTabsForMode();

  return (
    <div className={`flex flex-col h-full w-full animate-in fade-in duration-500 overflow-hidden`}>
      
      {/* BARRA DE NAVEGACIÓN ESTÁNDAR DE SUBMÓDULOS DESTE ACCORDION SIDEBAR */}

      {/* SUB-SUB-NAVEGACIÓN SI ACTIVE TAB TIENE SUB-TABS (ej: sri_docs en contabilidad) */}
      {activeTab === 'sri_docs' && mode === 'contabilidad' && (
        <div className="flex items-center gap-2 px-8 py-2 border-b shrink-0 border-primary/10 bg-primary-light/50">
          <span className="text-xs font-black uppercase tracking-wider text-primary">Tipo Doc:</span>
          <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
            {[
              { id: 'nota_credito', label: 'Notas de Crédito' },
              { id: 'nota_debito', label: 'Notas de Débito' },
              { id: 'retencion', label: 'Retenciones' },
              { id: 'guia_remision', label: 'Guías de Remisión' },
              { id: 'liquidacion', label: 'Liquidaciones de Compra' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setSubTabSri(sub.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  subTabSri === sub.id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-transparent text-black hover:text-black hover:bg-black/5'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CUERPO PRINCIPAL */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-transparent">
        <div className={`flex-1 overflow-y-auto px-8 ${isFormActive ? 'pt-0 pb-6' : 'py-6'} custom-scrollbar bg-white`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <FinanceDashboard transactions={transactions} thirdParties={thirdParties} db={db} appId={appId} />}
              
              {/* SECCIÓN VENTAS */}
              {activeTab === 'ventas' && (
                isModalOpen && editingTx?.type === 'ingreso' && !editingTx?.isPOS ? (
                  <TransactionForm 
                    tx={editingTx} 
                    onClose={() => setIsModalOpen(false)} 
                    thirdParties={thirdParties} 
                    products={products}
                    
                    showToast={showToast} 
                    db={db} 
                    storage={storage} 
                    appId={appId} 
                    isInline={true}
                  />
                ) : (
                  <>
                    {subTabVentas === 'resumen_ventas' && (
                      <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="ventas_resumen" forcedType="ingreso" />
                    )}
                    {subTabVentas === 'ventas_preventa' && (
                      <PosView 
                        products={products} 
                        thirdParties={thirdParties} 
                        transactions={transactions}
                        
                        showToast={showToast} 
                        db={db} 
                        appId={appId} 
                        onCheckout={handlePOSCheckout} 
                        onClose={() => setSubTabVentas('resumen_ventas')}
                        isPreventaOnly={true}
                      />
                    )}
                    {subTabVentas === 'pos' && (
                      <PosView 
                        products={products} 
                        thirdParties={thirdParties} 
                        transactions={transactions}
                        
                        showToast={showToast} 
                        db={db} 
                        appId={appId} 
                        onCheckout={handlePOSCheckout} 
                        onClose={() => setSubTabVentas('resumen_ventas')}
                        isPreventaOnly={false}
                      />
                    )}
                    {subTabVentas === 'quotes' && (
                      <QuotesView products={products} thirdParties={thirdParties} showToast={showToast} db={db} appId={appId} onPromoteToInvoice={handlePromoteToInvoice} />
                    )}
                    {subTabVentas === 'nota_credito' && (
                      <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="nota_credito" forcedType="ingreso" />
                    )}
                    {subTabVentas === 'retencion' && (
                      <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="retencion" forcedType="ingreso" />
                    )}
                    {subTabVentas === 'preventas' && (
                      <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} isPreventaTab={true} forcedType="ingreso" />
                    )}

                    {/* Si el formulario es de POS, se abre como modal overlay sobre el POS */}
                    {isModalOpen && editingTx?.type === 'ingreso' && editingTx?.isPOS && (
                      <TransactionForm 
                        tx={editingTx} 
                        onClose={() => {
                          setIsModalOpen(false);
                          // Sincronizar foco del input del POS después de cerrar el modal de impresión
                          setTimeout(() => {
                            const searchInput = document.getElementById('pos-search-input');
                            if (searchInput) searchInput.focus();
                          }, 350);
                        }} 
                        thirdParties={thirdParties} 
                        products={products}
                        showToast={showToast} 
                        db={db} 
                        storage={storage} 
                        appId={appId} 
                        isInline={false}
                      />
                    )}
                  </>
                )
              )}

              {/* SECCIÓN DOCUMENTOS SRI */}
              {activeTab === 'sri_docs' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType={subTabSri} />
              )}

              {/* SECCIÓN INVENTARIO */}
              {activeTab === 'products' && (
                <InventoryModule />
              )}

              {/* SECCIÓN PERSONAS */}
              {activeTab === 'personas' && (
                <ThirdPartiesView thirdParties={thirdParties} showToast={showToast} db={db} appId={appId} forcedType={subTabPersonas} />
              )}

              {/* SECCIÓN CUENTAS POR COBRAR (CxC) */}
              {activeTab === 'cxc' && (
                <AccountsReceivablePayable type="cxc" transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} appId={appId} />
              )}

              {/* SECCIÓN CUENTAS POR PAGAR (CxP) */}
              {activeTab === 'cxp' && (
                <AccountsReceivablePayable type="cxp" transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} appId={appId} />
              )}

              {/* REPORTES */}
              {activeTab === 'reports' && <ReportsView transactions={transactions} showToast={showToast} />}
              {activeTab === 'gastos_creditos_sub' && (
                <GastosCreditosModule showToast={showToast} transactions={transactions} thirdParties={thirdParties} db={db} appId={appId} />
              )}
              {activeTab === 'gastos_ia' && (
                <ComprasGastosView transactions={transactions} showToast={showToast} db={db} appId={appId} />
              )}

              {/* SECCIÓN COMPRAS */}
              {activeTab === 'compras_resumen' && (
                isModalOpen && editingTx?.type === 'egreso' &&
                (editingTx?.documentType === 'factura' || editingTx?.documentType === 'nota_venta' || editingTx?.documentType === 'liquidacion' || !editingTx?.documentType) ? (
                  <PurchaseForm 
                    tx={editingTx} 
                    onClose={() => { setIsModalOpen(false); setPurchaseMethod(null); }} 
                    thirdParties={thirdParties} 
                    products={products}
                    purchaseMethod={editingTx?.purchaseMethod || purchaseMethod}
                    showToast={showToast} 
                    db={db} 
                    appId={appId} 
                  />
                ) : (
                  <TransactionsView 
                    transactions={transactions} 
                    thirdParties={thirdParties} 
                    
                    showToast={showToast} 
                    db={db} 
                    storage={storage} 
                    appId={appId} 
                    onOpenForm={handleOpenFormModal} 
                    forcedDocType="compras_resumen" 
                    forcedType="egreso" 
                  />
                )
              )}

              {activeTab === 'compras_nc' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="nota_credito" forcedType="egreso" />
              )}
              {activeTab === 'compras_nd' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="nota_debito" forcedType="egreso" />
              )}
              {activeTab === 'compras_retencion' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="retencion" forcedType="egreso" />
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL GLOBAL DE FACTURACIÓN (COMPARTIDO) */}
      {isModalOpen && !(
        editingTx?.type === 'egreso' && 
        (editingTx?.documentType === 'factura' || editingTx?.documentType === 'nota_venta' || editingTx?.documentType === 'liquidacion' || !editingTx?.documentType)
      ) && activeTab !== 'ventas' && (
        <TransactionForm 
          tx={editingTx} 
          onClose={() => setIsModalOpen(false)} 
          thirdParties={thirdParties} 
          products={products}
          
          showToast={showToast} 
          db={db} 
          storage={storage} 
          appId={appId} 
        />
      )}

      {/* Modal: Seleccion de Metodo de Compra */}
      {showPurchaseMethodSelect && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPurchaseMethodSelect(false)}>
          <div className="w-full max-w-lg bg-white rounded-lg border border-border-default" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
              <h3 className="text-md font-semibold text-black">Registrar Compra</h3>
              <button onClick={() => setShowPurchaseMethodSelect(false)} className="btn-icon text-gray-500"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-text-primary">Selecciona el metodo para registrar la compra:</p>
              
              {/* Con Inventario + Manual */}
              <button onClick={() => handleConfirmPurchaseMethod('con_inventario')} className="w-full p-4 rounded-md border border-border-default text-left hover:bg-surface-bg transition-all group">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-[color-mix(in_srgb,var(--primary-color)_10%,transparent)] text-[var(--primary-color)] shrink-0">
                    <Package size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-black">Con Inventario - Manual</h4>
                    <p className="text-xs text-text-primary mt-1">Ingresa proveedor, productos, cantidades y costos manualmente. Actualiza stock y kardex.</p>
                  </div>
                  <ArrowRight size={16} className="text-text-secondary group-hover:text-[var(--primary-color)] transition-colors shrink-0 self-center" />
                </div>
              </button>

              {/* Con Inventario + XML */}
              <label className="w-full p-4 rounded-md border border-border-default text-left hover:bg-surface-bg transition-all group cursor-pointer block">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-[color-mix(in_srgb,var(--primary-color)_10%,transparent)] text-[var(--primary-color)] shrink-0">
                    <Upload size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-black">Con Inventario - Importar XML</h4>
                    <p className="text-xs text-text-primary mt-1">Sube el archivo XML de la factura electronica. El sistema procesa proveedor, productos y costos automaticamente.</p>
                  </div>
                  <ArrowRight size={16} className="text-text-secondary group-hover:text-[var(--primary-color)] transition-colors shrink-0 self-center" />
                </div>
                <input type="file" accept=".xml" onChange={(e) => handleAutoXmlPurchase(e, 'con_inventario')} className="hidden" />
              </label>

              {/* Sin Inventario + Manual */}
              <button onClick={() => handleConfirmPurchaseMethod('sin_inventario')} className="w-full p-4 rounded-md border border-border-default text-left hover:bg-surface-bg transition-all group">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-surface-bg text-text-primary shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-black">Sin Inventario - Manual</h4>
                    <p className="text-xs text-text-primary mt-1">Solo registro contable. Para gastos, servicios o compras sin movimiento de stock.</p>
                  </div>
                  <ArrowRight size={16} className="text-text-secondary group-hover:text-[var(--primary-color)] transition-colors shrink-0 self-center" />
                </div>
              </button>

              {/* Sin Inventario + XML */}
              <label className="w-full p-4 rounded-md border border-border-default text-left hover:bg-surface-bg transition-all group cursor-pointer block">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-surface-bg text-text-primary shrink-0">
                    <Upload size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-black">Sin Inventario - Importar XML</h4>
                    <p className="text-xs text-text-primary mt-1">Sube el XML de la factura. Se registra solo como gasto contable, sin afectar inventario.</p>
                  </div>
                  <ArrowRight size={16} className="text-text-secondary group-hover:text-[var(--primary-color)] transition-colors shrink-0 self-center" />
                </div>
                <input type="file" accept=".xml" onChange={(e) => handleAutoXmlPurchase(e, 'sin_inventario')} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
