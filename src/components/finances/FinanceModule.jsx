import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiInput } from '../ui/controls';
import { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, PieChart, Users, FileText, Download, Sparkles, ShoppingCart, Package,
  ArrowUpCircle, Percent, CreditCard, ShoppingBag, TrendingUp,
  X, ArrowRight, Upload, Building2, Landmark, Scan, BarChart3, BookOpen, Calculator, Shield
} from 'lucide-react';
import { doc, setDoc } from '../../services/financeStore.js';
import { getEcuadorDateString } from '../../services/sriService';
import { registrarMovimientoKardex } from '../../services/inventoryService';
import { sincronizarCompra } from '../../services/integracionFinanzasService';
import { db, storage, appId } from '../../firebase';
import ValidacionesView from './ValidacionesView';
import FinanceDashboard from './FinanceDashboard';
import TransactionsView from './TransactionsView';
import ThirdPartiesView from './ThirdPartiesView';
import ReportsView from './ReportsView';
import InventoryModule from '../inventory/InventoryModule';
import QuotesView from './QuotesView';
import PosView from './PosView';
import TransactionForm from './TransactionForm';
import PurchaseForm from './PurchaseForm';
import ComprasGastosView from './ComprasGastosView';
import GastosCreditosModule from './GastosCreditosModule';
import DiscountsPromotionsView from './DiscountsPromotionsView';
import MovimientosView from './MovimientosView';
import CuentasPorCobrarView from './CuentasPorCobrarView';
import CuentasPorPagarView from './CuentasPorPagarView';
import BancosCajaView from './BancosCajaView';
import TarjetasCreditosView from './TarjetasCreditosView';
import PrestamosView from './PrestamosView';
import CapturaInteligenteView from './CapturaInteligenteView';
import ResumenFinancieroView from './ResumenFinancieroView';
import ContabilidadView from './ContabilidadView';
import ImpuestosSriView from './ImpuestosSriView';
import ReportesView from './ReportesView';

export default function FinanceModule({ 
  mode = 'contabilidad', 
  initialSubTab, 
  showToast,
  usuario = null,
  transactions = [],
  thirdParties = [],
  products = [],
  discounts = [],
  promotions = [],
  isLoading = false
}) {
  const getInitialTab = (m) => {
    if (m === 'ventas') return 'ventas';
    if (m === 'inventario') return 'products';
    if (m === 'personas') return 'personas';
    if (m === 'compras') return 'compras_resumen';
    return 'resumen_financiero'; // 'contabilidad'
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(initialSubTab);
    } else {
      setActiveTab(getInitialTab(mode));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Estados de sub-navegación ERP
  const [subTabVentas, setSubTabVentas] = useState(() => (mode === 'ventas' && initialSubTab) ? (String(initialSubTab).startsWith('pos') ? 'pos' : initialSubTab) : 'resumen_ventas');
  const [subTabSri, setSubTabSri] = useState('nota_credito');
  const [subTabPersonas, setSubTabPersonas] = useState(() => (mode === 'personas' && initialSubTab) ? initialSubTab : 'cliente');

  // Estados centralizados para el modal de Facturación / SRI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const checkoutResolver = useRef(null);
  const closeTransactionForm = () => {
    const fromCheckout = Boolean(checkoutResolver.current);
    checkoutResolver.current?.(false);
    checkoutResolver.current = null;
    setIsModalOpen(false);
    setEditingTx(null);
    if (!fromCheckout) setSubTabVentas('resumen_ventas');
  };
  const transactionSaved = data => { if (checkoutResolver.current) { checkoutResolver.current(data); checkoutResolver.current = null; } setIsModalOpen(false); setEditingTx(null); setSubTabVentas('resumen_ventas'); };
  useEffect(() => () => checkoutResolver.current?.(false), []);
  const [purchaseMethod, setPurchaseMethod] = useState(null);
  const [showPurchaseMethodSelect, setShowPurchaseMethodSelect] = useState(false);

  // Sincronizar subTab de ventas y personas desde prop de navegación rápida
  useEffect(() => {
    if (initialSubTab) {
      if (mode === 'ventas') {
        const subStr = String(initialSubTab);
        if (subStr.startsWith('ventas_nueva') || subStr.startsWith('ventas_preventa')) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSubTabVentas('ventas_nueva');
          setEditingTx({ type: 'ingreso' });
          setIsModalOpen(true);
          setActiveTab('ventas');
        } else if (subStr === 'preventas') {
          setSubTabVentas('preventas');
          setEditingTx(null);
          setIsModalOpen(false);
          setActiveTab('ventas');
        } else {
          const targetSub = subStr.startsWith('pos') ? 'pos' : subStr;
          setSubTabVentas(targetSub);
          setIsModalOpen(false);
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
            } catch { /* skip failed kardex item */ }
          }
        }
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), { inventarioRegistrado: true }, { merge: true });
      }

      showToast?.(`Compra automatica registrada: ${razonSocial} - $${importeTotal.toFixed(2)}`, 'success');

      try {
        await sincronizarCompra({
          id: docId,
          type: 'egreso',
          documentType: 'factura',
          documentNumber,
          claveAcceso: claveAcceso || '',
          total: Number(importeTotal) || 0,
          baseImponible: Number(baseImponible) || 0,
          ivaValor: Number(ivaValor) || 0,
          proveedorNombre: razonSocial || '',
          proveedorRuc: ruc || '',
          thirdPartyId: supplierId || '',
          date: fechaEmision || new Date().toISOString(),
          paymentMethod: 'transferencia',
          paymentStatus: 'pagado',
          sriStatus: 'autorizado',
          category: 'compras',
          descripcion: `Compra automatica XML - ${razonSocial}`,
          creadoPor: '',
        }, db, { uid: '', email: '' });
      } catch (syncErr) {
        console.error('Error sincronizando compra XML automatica con modulo financiero:', syncErr);
      }

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
  const handlePOSCheckout = invoiceData => new Promise(resolve => {
    checkoutResolver.current = resolve;
    setEditingTx(invoiceData);
    setIsModalOpen(true);
  });

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
          title: 'Control Financiero',
          desc: 'Ingresos, gastos, cartera, tarjetas, créditos, reportes y cumplimiento tributario',
          icon: DollarSign
        };
    }
  };

  const moduleHeader = getModuleHeader();
  // eslint-disable-next-line no-unused-vars
  const ModuleIcon = moduleHeader.icon;

  const getTabsForMode = () => {
    if (mode === 'contabilidad') {
      return [
        { id: 'resumen_financiero', label: 'Resumen', icon: PieChart },
        { id: 'movimientos', label: 'Movimientos', icon: DollarSign },
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'sri_docs', label: 'Documentos SRI', icon: FileText },
        { id: 'cxc', label: 'Cuentas por Cobrar', icon: TrendingUp },
        { id: 'cxp', label: 'Cuentas por Pagar', icon: ArrowUpCircle },
        { id: 'bancos', label: 'Bancos y Caja', icon: Building2 },
        { id: 'tarjetas', label: 'Tarjetas y Créditos', icon: CreditCard },
        { id: 'prestamos', label: 'Préstamos', icon: Landmark },
        { id: 'contabilidad_tab', label: 'Contabilidad', icon: BookOpen },
        { id: 'impuestos', label: 'Impuestos SRI', icon: Calculator },
        { id: 'captura', label: 'Captura IA', icon: Scan },
        { id: 'reportes', label: 'Reportes', icon: BarChart3 },
        { id: 'validaciones', label: 'Validaciones', icon: Shield },
        { id: 'gastos_creditos_sub', label: 'Gastos y Creditos', icon: CreditCard },
        { id: 'gastos_ia', label: 'Gastos con IA', icon: Sparkles },
        { id: 'reports', label: 'SRI', icon: Download },
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

  // eslint-disable-next-line no-unused-vars
  const displayedTabs = getTabsForMode();

  return (
    <UiBox {...mergeThemeProps({"className":"flex flex-col h-full w-full animate-in fade-in duration-500 overflow-hidden"})}>
      
      {/* BARRA DE NAVEGACIÓN ESTÁNDAR DE SUBMÓDULOS DESTE ACCORDION SIDEBAR */}

      {/* SUB-SUB-NAVEGACIÓN SI ACTIVE TAB TIENE SUB-TABS (ej: sri_docs en contabilidad) */}
      {activeTab === 'sri_docs' && mode === 'contabilidad' && (
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"flex items-center gap-2 px-8 py-2 shrink-0"}}>
          <UiText {...{"size":"1","weight":"bold","color":"blue"}}>Tipo Doc:</UiText>
          <UiBox {...{"className":"flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none"}}>
            {[
              { id: 'nota_credito', label: 'Notas de Crédito' },
              { id: 'nota_debito', label: 'Notas de Débito' },
              { id: 'retencion', label: 'Retenciones' },
              { id: 'guia_remision', label: 'Guías de Remisión' },
              { id: 'liquidacion', label: 'Liquidaciones de Compra' }
            ].map(sub => (
              <UiButton
                key={sub.id}
                onClick={() => setSubTabSri(sub.id)}
                {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (subTabSri === sub.id ? {"variant":"solid","color":"green"} : {"color":"gray"}))}
              >
                {sub.label}
              </UiButton>
            ))}
          </UiBox>
        </UiBox>
      )}

      {/* CUERPO PRINCIPAL */}
      <UiBox {...{"style":{"backgroundColor":"transparent"},"className":"flex flex-1 overflow-hidden min-h-0"}}>
        <UiBox {...mergeThemeProps({"className":"flex-1 min-w-0 overflow-y-auto"}, {"style":{"backgroundColor":"var(--gray-2)"},"className":"custom-scrollbar"}, (isFormActive ? {"className":"pt-0 pb-6"} : {"className":"py-4"}))}>
          {isLoading ? (
            <UiBox {...{"className":"flex justify-center items-center h-64"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)"},"className":"animate-spin h-8 w-8"}}></UiBox>
            </UiBox>
          ) : (
            <>
              {activeTab === 'resumen_financiero' && (
                <ResumenFinancieroView db={db} usuario={usuario} showToast={showToast} onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'movimientos' && (
                <MovimientosView db={db} usuario={usuario} showToast={showToast} />
              )}
              {activeTab === 'dashboard' && <FinanceDashboard transactions={transactions} thirdParties={thirdParties} db={db} appId={appId} />}
              
              {/* SECCIÓN VENTAS */}
              {activeTab === 'ventas' && (
                isModalOpen && editingTx?.type === 'ingreso' && !editingTx?.posCheckoutOrigin && !editingTx?.isPOS ? (
                  <TransactionForm onSaved={transactionSaved} usuario={usuario}
                    tx={editingTx} 
                    onClose={closeTransactionForm}
                    thirdParties={thirdParties} 
                    products={products}
                    discounts={discounts}
                    promotions={promotions}
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
                        discounts={discounts}
                        promotions={promotions}
                        showToast={showToast} 
                        db={db} 
                        appId={appId} 
                        usuario={usuario}
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
                        discounts={discounts}
                        promotions={promotions}
                        showToast={showToast} 
                        db={db} 
                        appId={appId} 
                        usuario={usuario}
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
                    {subTabVentas === 'discounts' && (
                      <DiscountsPromotionsView db={db} appId={appId} showToast={showToast} products={products} />
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
                <ThirdPartiesView 
                  thirdParties={thirdParties} 
                  transactions={transactions}
                  showToast={showToast} 
                  db={db} 
                  appId={appId} 
                  forcedType={subTabPersonas} 
                />
              )}

              {/* SECCIÓN CUENTAS POR COBRAR (CxC) */}
              {activeTab === 'cxc' && (
                <CuentasPorCobrarView db={db} usuario={usuario} showToast={showToast} />
              )}

              {/* SECCIÓN CUENTAS POR PAGAR (CxP) */}
              {activeTab === 'cxp' && (
                <CuentasPorPagarView db={db} usuario={usuario} showToast={showToast} />
              )}

              {/* SECCIÓN BANCOS Y CAJA */}
              {activeTab === 'bancos' && (
                <BancosCajaView db={db} usuario={usuario} showToast={showToast} />
              )}

              {/* SECCIÓN TARJETAS Y CRÉDITOS */}
              {activeTab === 'tarjetas' && (
                <TarjetasCreditosView db={db} usuario={usuario} showToast={showToast} />
              )}

              {/* SECCIÓN PRÉSTAMOS BANCARIOS */}
              {activeTab === 'prestamos' && (
                <PrestamosView db={db} usuario={usuario} showToast={showToast} />
              )}

              {/* SECCIÓN CONTABILIDAD (PLAN DE CUENTAS, CENTROS DE COSTO, LIBRO DIARIO) */}
              {activeTab === 'contabilidad_tab' && (
                <ContabilidadView db={db} usuario={usuario} showToast={showToast} />
              )}

              {activeTab === 'impuestos' && (
                <ImpuestosSriView db={db} usuario={usuario} showToast={showToast} transactions={transactions} />
              )}

              {/* VALIDACIONES */}
              {activeTab === 'validaciones' && (
                <ValidacionesView db={db} usuario={usuario} showToast={showToast} />
              )}

              {activeTab === 'reportes' && (
                <ReportesView db={db} usuario={usuario} showToast={showToast} />
              )}

              {activeTab === 'captura' && (
                <CapturaInteligenteView db={db} storage={storage} appId={appId} usuario={usuario} showToast={showToast} />
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
        </UiBox>
      </UiBox>

      {/* MODAL GLOBAL DE FACTURACIÓN (COMPARTIDO) */}
      {isModalOpen && !(
        editingTx?.type === 'egreso' && 
        (editingTx?.documentType === 'factura' || editingTx?.documentType === 'nota_venta' || editingTx?.documentType === 'liquidacion' || !editingTx?.documentType)
      ) && (activeTab !== 'ventas' || editingTx?.isPOS || editingTx?.posCheckoutOrigin) && (
        <TransactionForm onSaved={transactionSaved} usuario={usuario}
          tx={editingTx} 
          onClose={closeTransactionForm}
          thirdParties={thirdParties} 
          products={products}
          discounts={discounts}
          promotions={promotions}
          showToast={showToast} 
          db={db} 
          storage={storage} 
          appId={appId} 
        />
      )}

      {/* Modal: Seleccion de Metodo de Compra */}
      {showPurchaseMethodSelect && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-4"}} onClick={() => setShowPurchaseMethodSelect(false)}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-lg"}} onClick={e => e.stopPropagation()}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-3"}}>
              <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>Registrar Compra</UiHeading>
              <UiButton iconOnly onClick={() => setShowPurchaseMethodSelect(false)} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
            </UiBox>
            <UiBox {...{"className":"p-5 space-y-3"}}>
              <UiText as="p" {...{"size":"2","color":"gray","highContrast":true}}>Selecciona el metodo para registrar la compra:</UiText>
              
              {/* Con Inventario + Manual */}
              <UiButton onClick={() => handleConfirmPurchaseMethod('con_inventario')} {...{"variant":"outline","className":"w-full text-left group"}}>
                <UiBox {...{"className":"flex items-start gap-3"}}>
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-2 shrink-0"}}>
                    <Package size={20} />
                  </UiBox>
                  <UiBox {...{"className":"flex-1"}}>
                    <UiHeading as="h4" {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>Con Inventario - Manual</UiHeading>
                    <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-1"}}>Ingresa proveedor, productos, cantidades y costos manualmente. Actualiza stock y kardex.</UiText>
                  </UiBox>
                  <ArrowRight size={16} {...{"style":{"color":"var(--gray-11)"},"className":"shrink-0 self-center"}} />
                </UiBox>
              </UiButton>

              {/* Con Inventario + XML */}
              <UiLabel {...{"className":"w-full p-4 text-left group cursor-pointer block"}}>
                <UiBox {...{"className":"flex items-start gap-3"}}>
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-2 shrink-0"}}>
                    <Upload size={20} />
                  </UiBox>
                  <UiBox {...{"className":"flex-1"}}>
                    <UiHeading as="h4" {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>Con Inventario - Importar XML</UiHeading>
                    <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-1"}}>Sube el archivo XML de la factura electronica. El sistema procesa proveedor, productos y costos automaticamente.</UiText>
                  </UiBox>
                  <ArrowRight size={16} {...{"style":{"color":"var(--gray-11)"},"className":"shrink-0 self-center"}} />
                </UiBox>
                <UiInput type="file" accept=".xml" onChange={(e) => handleAutoXmlPurchase(e, 'con_inventario')} {...{"className":"hidden"}} />
              </UiLabel>

              {/* Sin Inventario + Manual */}
              <UiButton onClick={() => handleConfirmPurchaseMethod('sin_inventario')} {...{"variant":"outline","className":"w-full text-left group"}}>
                <UiBox {...{"className":"flex items-start gap-3"}}>
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","color":"var(--gray-12)"},"className":"p-2 shrink-0"}}>
                    <FileText size={20} />
                  </UiBox>
                  <UiBox {...{"className":"flex-1"}}>
                    <UiHeading as="h4" {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>Sin Inventario - Manual</UiHeading>
                    <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-1"}}>Solo registro contable. Para gastos, servicios o compras sin movimiento de stock.</UiText>
                  </UiBox>
                  <ArrowRight size={16} {...{"style":{"color":"var(--gray-11)"},"className":"shrink-0 self-center"}} />
                </UiBox>
              </UiButton>

              {/* Sin Inventario + XML */}
              <UiLabel {...{"className":"w-full p-4 text-left group cursor-pointer block"}}>
                <UiBox {...{"className":"flex items-start gap-3"}}>
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","color":"var(--gray-12)"},"className":"p-2 shrink-0"}}>
                    <Upload size={20} />
                  </UiBox>
                  <UiBox {...{"className":"flex-1"}}>
                    <UiHeading as="h4" {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>Sin Inventario - Importar XML</UiHeading>
                    <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-1"}}>Sube el XML de la factura. Se registra solo como gasto contable, sin afectar inventario.</UiText>
                  </UiBox>
                  <ArrowRight size={16} {...{"style":{"color":"var(--gray-11)"},"className":"shrink-0 self-center"}} />
                </UiBox>
                <UiInput type="file" accept=".xml" onChange={(e) => handleAutoXmlPurchase(e, 'sin_inventario')} {...{"className":"hidden"}} />
              </UiLabel>
            </UiBox>
          </UiCard>
        </UiBox>
      )}
    </UiBox>
  );
}
