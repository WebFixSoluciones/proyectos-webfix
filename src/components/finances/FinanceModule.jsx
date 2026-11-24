import { mergeThemeProps } from '../ui/themeProps';
import { createThemedPortal } from '../ui/themePortal';
import { UiBox, UiText } from '../ui/layout';
import { UiButton, UiModalCloseButton } from '../ui/controls';
import { UiIconBadge } from '../ui/UiIconBadge';
import { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, PieChart, Users, FileText, Download, Sparkles, ShoppingCart, Package,
  ArrowUpCircle, Percent, CreditCard, ShoppingBag, TrendingUp,
  ArrowRight, Upload, Building2, Landmark, Scan, BarChart3, BookOpen, Calculator, Shield,
  KeyRound, Loader2, CheckCircle2
} from 'lucide-react';
import { getEcuadorDateString, consultarAutorizacionSRI } from '../../services/sriService';
import { parsePurchaseInvoiceXml } from '../../services/purchaseXml';
import { analizarComprobanteConGemini } from '../../services/geminiService';
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
import ComprasSriView from './ComprasSriView';
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
  onSubTabChange,
  showToast,
  usuario = null,
  tenantUsers = [],
  transactions = [],
  thirdParties = [],
  products = [],
  discounts = [],
  promotions = [],
  categories = [],
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
    if (initialSubTab && mode === 'compras' && String(initialSubTab).startsWith('compras_preventa')) {
      return 'compras_resumen';
    }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Estados de sub-navegación ERP
  const isVentasNuevaInitial = mode === 'ventas' && initialSubTab && (String(initialSubTab).startsWith('ventas_nueva') || String(initialSubTab).startsWith('ventas_preventa'));
  const [subTabVentas, setSubTabVentas] = useState(() => (mode === 'ventas' && initialSubTab) ? (String(initialSubTab).startsWith('pos') ? 'pos' : (isVentasNuevaInitial ? 'ventas_nueva' : initialSubTab)) : 'resumen_ventas');
  const [subTabSri, setSubTabSri] = useState('nota_credito');
  const [subTabPersonas, setSubTabPersonas] = useState(() => (mode === 'personas' && initialSubTab) ? initialSubTab : 'cliente');

  // Estados centralizados para el modal de Facturación / SRI
  const [isModalOpen, setIsModalOpen] = useState(() => Boolean(isVentasNuevaInitial));
  const [editingTx, setEditingTx] = useState(() => isVentasNuevaInitial ? { type: 'ingreso' } : null);
  const checkoutResolver = useRef(null);
  const closeTransactionForm = () => {
    const fromCheckout = Boolean(checkoutResolver.current);
    checkoutResolver.current?.(false);
    checkoutResolver.current = null;
    setIsModalOpen(false);
    setEditingTx(null);
    if (!fromCheckout) setSubTabVentas('resumen_ventas');
  };
  const transactionSaved = data => { 
    if (checkoutResolver.current) { 
      const fromPos = Boolean(editingTx?.isPOS || editingTx?.posCheckoutOrigin || subTabVentas === 'pos');
      checkoutResolver.current(data); 
      checkoutResolver.current = null; 
      setIsModalOpen(false); 
      setEditingTx(null); 
      // Mantener al cajero en POS tras cobrar; solo volver al historial si provino de venta administrativa
      if (!fromPos) {
        setSubTabVentas('resumen_ventas');
        onSubTabChange?.('resumen_ventas');
      }
      return;
    } 
  };
  useEffect(() => () => checkoutResolver.current?.(false), []);
  const [purchaseMethod, setPurchaseMethod] = useState(null);
  const [showPurchaseMethodSelect, setShowPurchaseMethodSelect] = useState(false);
  const [purchaseModalScope, setPurchaseModalScope] = useState('con_inventario');
  const [purchaseClaveSri, setPurchaseClaveSri] = useState('');
  const [purchaseImportLoading, setPurchaseImportLoading] = useState('');

  // Sincronizar subTab de ventas y personas desde prop de navegación rápida
  useEffect(() => {
    if (initialSubTab) {
      if (mode === 'ventas') {
        const subStr = String(initialSubTab);
        if (subStr.startsWith('ventas_nueva') || subStr.startsWith('ventas_preventa')) {
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
        const subStr = String(initialSubTab);
        if (subStr.startsWith('compras_preventa')) {
          // Quick action "Registrar Compra": open the purchase method selector
          setActiveTab('compras_resumen');
          setEditingTx({ type: 'egreso' });
          setShowPurchaseMethodSelect(true);
        } else {
          setActiveTab(initialSubTab);
        }
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
    // En modo compras, mostrar selector de método solo para facturas/compras nuevas en compras_resumen
    // (NC, ND y Retenciones recibidas abren directamente TransactionForm)
    const isPurchaseDoc = !prefilledData?.documentType || ['factura', 'nota_venta', 'liquidacion'].includes(prefilledData.documentType);
    if (mode === 'compras' && activeTab === 'compras_resumen' && isPurchaseDoc && (!prefilledData || !prefilledData.id)) {
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

  const reviewPurchase = (purchase, method) => {
    setPurchaseMethod(method);
    setEditingTx({ ...purchase, type: 'egreso', purchaseMethod: method, purchaseType: method });
    setShowPurchaseMethodSelect(false);
    setActiveTab('compras_resumen');
    setIsModalOpen(true);
  };

  // XML purchases always pass through the same reviewed, atomic save flow.
  const handleAutoXmlPurchase = async (e, method) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPurchaseImportLoading('xml');
    try {
      const parsed = parsePurchaseInvoiceXml(await file.text(), products);
      const matchedSupplier = thirdParties.find(t => String(t.ruc || '').trim() === String(parsed.supplierRuc || '').trim() && t.type !== 'cliente');
      const autoDesc = (parsed.items || []).map(i => i.name).filter(Boolean).slice(0, 3).join(', ');
      reviewPurchase({
        ...parsed,
        supplierId: matchedSupplier?.id || '',
        thirdPartyId: matchedSupplier?.id || '',
        thirdPartyName: parsed.supplierName || matchedSupplier?.name || '',
        thirdPartyRuc: parsed.supplierRuc || matchedSupplier?.ruc || '',
        description: autoDesc || `Compra ${parsed.documentNumber || ''}`.trim(),
      }, method);
      showToast?.('XML cargado. Revisa los datos antes de guardar.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'Error al procesar XML.', 'error');
    } finally {
      setPurchaseImportLoading('');
    }
  };

  // Consultar factura de compra directo en el SRI por Clave de Acceso (49 dígitos)
  const handleSriKeyPurchase = async (method) => {
    const cleanKey = String(purchaseClaveSri || '').replace(/\D/g, '').trim();
    if (!/^\d{49}$/.test(cleanKey)) {
      showToast?.('La Clave de Acceso SRI debe tener exactamente 49 dígitos numéricos.', 'warning');
      return;
    }
    setPurchaseImportLoading('sri');
    try {
      const sriResult = await consultarAutorizacionSRI(cleanKey, cleanKey[23]);
      if (sriResult?.status !== 'autorizado' || !sriResult.signedXml) {
        throw new Error(sriResult?.message || 'El comprobante no aparece autorizado en el SRI.');
      }
      const parsed = parsePurchaseInvoiceXml(sriResult.signedXml, products);
      const matchedSupplier = thirdParties.find(t => String(t.ruc || '').trim() === String(parsed.supplierRuc || '').trim() && t.type !== 'cliente');
      const autoDesc = (parsed.items || []).map(i => i.name).filter(Boolean).slice(0, 3).join(', ');
      setPurchaseClaveSri('');
      reviewPurchase({
        ...parsed,
        sriStatus: 'autorizado',
        xmlAutorizado: sriResult.xmlAutorizado || '',
        supplierId: matchedSupplier?.id || '',
        thirdPartyId: matchedSupplier?.id || '',
        thirdPartyName: parsed.supplierName || matchedSupplier?.name || '',
        thirdPartyRuc: parsed.supplierRuc || matchedSupplier?.ruc || '',
        description: autoDesc || `Compra ${parsed.documentNumber || ''}`.trim(),
      }, method);
      showToast?.('Factura descargada del SRI con éxito. Revisa y confirma.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'No se pudo consultar la clave de acceso en el SRI.', 'error');
    } finally {
      setPurchaseImportLoading('');
    }
  };

  // Analizar PDF o Imagen de compra con IA (Gemini OCR)
  const handleOcrFilePurchase = async (e, method) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPurchaseImportLoading('ocr');
    try {
      const extracted = await analizarComprobanteConGemini(file);
      if (!extracted) throw new Error('No se pudieron extraer datos del archivo.');
      const cleanRuc = String(extracted.ruc || '').replace(/\s+/g, '').trim();
      const matchedSupplier = cleanRuc
        ? thirdParties.find(t => String(t.ruc || '').trim() === cleanRuc && t.type !== 'cliente')
        : null;
      reviewPurchase({
        documentType: 'factura',
        documentNumber: extracted.documentNumber || '',
        claveAcceso: String(extracted.claveAcceso || '').replace(/\D/g, ''),
        date: extracted.date || getEcuadorDateString(),
        supplierId: matchedSupplier?.id || '',
        thirdPartyId: matchedSupplier?.id || '',
        supplierName: extracted.razonSocial || matchedSupplier?.name || '',
        thirdPartyName: extracted.razonSocial || matchedSupplier?.name || '',
        supplierRuc: cleanRuc || matchedSupplier?.ruc || '',
        thirdPartyRuc: cleanRuc || matchedSupplier?.ruc || '',
        baseImponible: Number(extracted.baseImponible) || 0,
        ivaValor: Number(extracted.ivaValor) || 0,
        total: Number(extracted.total) || 0,
        category: extracted.category || 'compras',
        description: extracted.description || extracted.concepto || `Compra ${extracted.documentNumber || ''}`.trim(),
        paymentMethod: extracted.paymentMethod || 'transferencia',
        isAIDetected: true,
      }, method);
      showToast?.('Comprobante analizado con IA. Verifica los valores antes de guardar.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'No se pudo analizar el archivo con IA.', 'error');
    } finally {
      setPurchaseImportLoading('');
    }
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
        { id: 'compras_sri', label: 'XML de Compras Recibidas', icon: FileText },
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
    <UiBox {...mergeThemeProps({"className":"erp-workspace flex flex-col h-full w-full overflow-hidden"})}>
      
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
        <div className={`flex-1 min-w-0 overflow-y-auto bg-white custom-scrollbar ${isFormActive ? 'pt-0 pb-6' : 'py-4'}`}>
          {isLoading ? (
            <UiBox className="flex justify-center items-center h-64">
              <Loader2 size={28} className="animate-spin text-[#0B996F]" />
            </UiBox>
          ) : (
            <>
              {activeTab === 'resumen_financiero' && (
                <ResumenFinancieroView db={db} usuario={usuario} showToast={showToast} onNavigate={(tab) => { setActiveTab(tab); onSubTabChange?.(tab); }} />
              )}
              {activeTab === 'movimientos' && (
                <MovimientosView db={db} appId={appId} usuario={usuario} showToast={showToast} transactions={transactions} />
              )}
              {activeTab === 'dashboard' && <FinanceDashboard transactions={transactions} thirdParties={thirdParties} db={db} appId={appId} />}
              
              {/* SECCIÓN VENTAS */}
              {activeTab === 'ventas' && (
                isModalOpen && (editingTx?.type === 'ingreso' || !editingTx?.type) && !editingTx?.posCheckoutOrigin && !editingTx?.isPOS ? (
                  <TransactionForm onSaved={transactionSaved} usuario={usuario} tenantUsers={tenantUsers}
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
                        tenantUsers={tenantUsers}
                        onCheckout={handlePOSCheckout} 
                        onClose={() => { setSubTabVentas('resumen_ventas'); onSubTabChange?.('resumen_ventas'); }}
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
                        tenantUsers={tenantUsers}
                        onCheckout={handlePOSCheckout} 
                        onClose={() => { setSubTabVentas('resumen_ventas'); onSubTabChange?.('resumen_ventas'); }}
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
                      <DiscountsPromotionsView db={db} appId={appId} showToast={showToast} products={products} discounts={discounts} promotions={promotions} categories={categories} />
                    )}

                  </>
                )
              )}

              {/* SECCIÓN DOCUMENTOS SRI */}
              {activeTab === 'sri_docs' && (
                isModalOpen && (editingTx?.type === 'ingreso' || !editingTx?.type) ? (
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
                  <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType={subTabSri} />
                )
              )}

              {/* SECCIÓN INVENTARIO */}
              {activeTab === 'products' && (
                <InventoryModule showToast={showToast} transactions={transactions} />
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
                <CuentasPorCobrarView 
                  db={db} 
                  usuario={usuario} 
                  showToast={showToast}
                  appId={appId}
                  thirdParties={thirdParties}
                  transactions={transactions}
                  onOpenTransaction={(tx) => {
                    setEditingTx(tx);
                    setIsModalOpen(true);
                  }}
                />
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
                <ImpuestosSriView db={db} appId={appId} usuario={usuario} showToast={showToast} transactions={transactions} />
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
                    products={products}
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

              {activeTab === 'compras_sri' && (
                <ComprasSriView transactions={transactions} showToast={showToast} db={db} appId={appId} onReviewPurchase={reviewPurchase} />
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
      </UiBox>

      {/* MODAL GLOBAL DE FACTURACIÓN (COMPARTIDO) */}
      {isModalOpen && !(
        editingTx?.type === 'egreso' && 
        (editingTx?.documentType === 'factura' || editingTx?.documentType === 'nota_venta' || editingTx?.documentType === 'liquidacion' || !editingTx?.documentType)
      ) && (activeTab !== 'ventas' || editingTx?.isPOS || editingTx?.posCheckoutOrigin) && (
        <TransactionForm onSaved={transactionSaved} usuario={usuario} tenantUsers={tenantUsers}
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

      {/* Modal: Registrar Compra — Brevo Flat Design con todas las opciones de carga */}
      {showPurchaseMethodSelect && createThemedPortal(
        <div
          className="erp-dialog-overlay fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4"
          onClick={() => { if (!purchaseImportLoading) setShowPurchaseMethodSelect(false); }}
        >
          <div
            className="w-full max-w-xl bg-white border border-[#e3e3e3] rounded-2xl overflow-hidden max-h-[92dvh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#efefef] shrink-0">
              <div className="flex items-center gap-2.5">
                <UiIconBadge level="modal" tone="brand" icon={ShoppingBag} />
                <div>
                  <h3 className="text-base font-bold text-[#1b1b1b] leading-tight">Registrar Compra</h3>
                  <p className="text-xs text-[#666666]">
                    {editingTx?.isAIDetected
                      ? 'Comprobante leído. Elige si afecta inventario para revisarlo.'
                      : 'Elige la modalidad y el método de carga del comprobante'}
                  </p>
                </div>
              </div>
              <UiModalCloseButton
                disabled={Boolean(purchaseImportLoading)}
                onClick={() => setShowPurchaseMethodSelect(false)}
              />
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Caso A: El usuario ya arrastró un PDF/XML/Imagen en el Historial de Compras */}
              {editingTx?.isAIDetected ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#f0fdf4] border border-[#b3f4cb] p-3.5 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#004227]">
                      <CheckCircle2 size={14} className="text-[#0b996f]" />
                      Datos extraídos listos para revisión
                    </div>
                    <div className="text-[#1b1b1b]">
                      <strong>{editingTx.supplierName || editingTx.thirdPartyName || 'Proveedor'}</strong>
                      {(editingTx.supplierRuc || editingTx.thirdPartyRuc) ? ` (${editingTx.supplierRuc || editingTx.thirdPartyRuc})` : ''}
                      {editingTx.documentNumber ? ` · Doc ${editingTx.documentNumber}` : ''}
                      {Number(editingTx.total) > 0 ? ` · Total $${Number(editingTx.total).toFixed(2)}` : ''}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleConfirmPurchaseMethod('con_inventario')}
                      className="text-left p-4 rounded-xl border border-[#b3f4cb] bg-[#f0fdf4] hover:bg-[#e8fedf] transition-colors cursor-pointer space-y-1.5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#b3f4cb] text-[#004227] flex items-center justify-center">
                        <Package size={18} />
                      </div>
                      <div className="text-sm font-bold text-[#004227]">Con Inventario</div>
                      <p className="text-xs text-[#444444]">Vincula los ítems al catálogo y actualiza stock y kardex.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConfirmPurchaseMethod('sin_inventario')}
                      className="text-left p-4 rounded-xl border border-[#e3e3e3] bg-white hover:bg-[#fafafa] transition-colors cursor-pointer space-y-1.5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#fafafa] border border-[#e3e3e3] text-[#1b1b1b] flex items-center justify-center">
                        <FileText size={18} />
                      </div>
                      <div className="text-sm font-bold text-[#1b1b1b]">Sin Inventario</div>
                      <p className="text-xs text-[#666666]">Solo registro contable para gastos, servicios o suministros.</p>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Paso 1: Selector de modalidad (Con Inventario vs Sin Inventario) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666] block">
                      1. Tipo de compra
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPurchaseModalScope('con_inventario')}
                        className={`text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                          purchaseModalScope === 'con_inventario'
                            ? 'bg-[#e8fedf] border-[#0b996f] text-[#004227]'
                            : 'bg-white border-[#e3e3e3] text-[#1b1b1b] hover:bg-[#fafafa]'
                        }`}
                      >
                        <Package size={17} className="shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight">Con Inventario</div>
                          <div className="text-[11px] opacity-80 mt-0.5 leading-snug">Actualiza stock y kardex</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPurchaseModalScope('sin_inventario')}
                        className={`text-left p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-2.5 ${
                          purchaseModalScope === 'sin_inventario'
                            ? 'bg-[#e8fedf] border-[#0b996f] text-[#004227]'
                            : 'bg-white border-[#e3e3e3] text-[#1b1b1b] hover:bg-[#fafafa]'
                        }`}
                      >
                        <FileText size={17} className="shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight">Sin Inventario</div>
                          <div className="text-[11px] opacity-80 mt-0.5 leading-snug">Gastos y servicios contables</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Paso 2: Todas las opciones de carga */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666] block">
                      2. Método de carga
                    </span>

                    {/* Opción 1: Importar XML del SRI */}
                    <label
                      className={`flex items-center gap-3.5 p-3.5 rounded-xl border border-[#e3e3e3] bg-white hover:border-[#0b996f] hover:bg-[#f0fdf4]/40 transition-colors cursor-pointer ${
                        purchaseImportLoading ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#e8fedf] text-[#004227] border border-[#b3f4cb] flex items-center justify-center shrink-0">
                        {purchaseImportLoading === 'xml' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#1b1b1b]">Importar XML del SRI (.xml)</div>
                        <div className="text-xs text-[#666666] mt-0.5">
                          Lectura exacta de proveedor, ítems, impuestos y clave de acceso autorizada.
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[#666666] shrink-0" />
                      <input
                        type="file"
                        accept=".xml,text/xml,application/xml"
                        onChange={(e) => handleAutoXmlPurchase(e, purchaseModalScope)}
                        className="hidden"
                      />
                    </label>

                    {/* Opción 2: Consultar directo en el SRI por Clave de Acceso (49 dígitos) */}
                    <div className="p-3.5 rounded-xl border border-[#e3e3e3] bg-[#fafafa] space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white text-[#0b996f] border border-[#e3e3e3] flex items-center justify-center shrink-0">
                          {purchaseImportLoading === 'sri' ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-[#1b1b1b]">Consultar por Clave de Acceso SRI</div>
                          <div className="text-xs text-[#666666] mt-0.5">
                            Pega los 49 dígitos de la factura para descargar el XML oficial directo del SRI.
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={purchaseClaveSri}
                          onChange={(e) => setPurchaseClaveSri(e.target.value.replace(/\D/g, '').slice(0, 49))}
                          placeholder="Pega aquí la Clave de Acceso (49 dígitos)..."
                          maxLength={49}
                          disabled={Boolean(purchaseImportLoading)}
                          className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#e3e3e3] rounded-xl text-[#1b1b1b] focus:outline-hidden focus:border-[#0b996f]"
                        />
                        <button
                          type="button"
                          disabled={Boolean(purchaseImportLoading) || purchaseClaveSri.length !== 49}
                          onClick={() => handleSriKeyPurchase(purchaseModalScope)}
                          className="px-3.5 py-2 rounded-xl bg-[#0b996f] hover:bg-[#004227] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-45 shrink-0"
                        >
                          {purchaseImportLoading === 'sri' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          Consultar SRI
                        </button>
                      </div>
                    </div>

                    {/* Opción 3: Subir PDF o Foto / Imagen con IA (OCR) */}
                    <label
                      className={`flex items-center gap-3.5 p-3.5 rounded-xl border border-[#e3e3e3] bg-white hover:border-[#0b996f] hover:bg-[#f0fdf4]/40 transition-colors cursor-pointer ${
                        purchaseImportLoading ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#fcfbe7] text-[#866308] border border-[#f0df8a] flex items-center justify-center shrink-0">
                        {purchaseImportLoading === 'ocr' ? <Loader2 size={18} className="animate-spin" /> : <Scan size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#1b1b1b]">Subir PDF o Foto / Imagen (IA OCR)</div>
                        <div className="text-xs text-[#666666] mt-0.5">
                          Sube un RIDE en PDF o foto de factura/recibo y la IA completa los campos.
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[#666666] shrink-0" />
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => handleOcrFilePurchase(e, purchaseModalScope)}
                        className="hidden"
                      />
                    </label>

                    {/* Opción 4: Registro Manual */}
                    <button
                      type="button"
                      disabled={Boolean(purchaseImportLoading)}
                      onClick={() => handleConfirmPurchaseMethod(purchaseModalScope)}
                      className="w-full text-left flex items-center gap-3.5 p-3.5 rounded-xl border border-[#e3e3e3] bg-white hover:border-[#1b1b1b] hover:bg-[#fafafa] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#f4f4f5] text-[#1b1b1b] border border-[#e3e3e3] flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#1b1b1b]">Ingreso Manual</div>
                        <div className="text-xs text-[#666666] mt-0.5">
                          Registra proveedor, {purchaseModalScope === 'con_inventario' ? 'productos, cantidades y costos' : 'concepto del gasto, base e IVA'} paso a paso.
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[#666666] shrink-0" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </UiBox>
  );
}
