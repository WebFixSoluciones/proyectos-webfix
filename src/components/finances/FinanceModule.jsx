import React, { useState, useEffect } from 'react';
import { 
  DollarSign, PieChart, Users, FileText, Download, Settings, Sparkles, ShoppingCart, Package, Bookmark,
  ArrowDownCircle, ArrowUpCircle, TrendingUp, Calculator, Building, Percent, CreditCard, ShoppingBag
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { getEcuadorDateString } from '../../services/sriService';
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
import ComprasSriView from './ComprasSriView';
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

  const isFormActive = isModalOpen && (
    (editingTx?.type === 'ingreso') || 
    (editingTx?.type === 'egreso' && 
      (editingTx?.documentType === 'factura' || editingTx?.documentType === 'nota_venta' || editingTx?.documentType === 'liquidacion' || !editingTx?.documentType))
  );

  // Abrir modal de factura prellenada (desde POS o Cotizaciones)
  const handleOpenFormModal = (prefilledData = null) => {
    setEditingTx(prefilledData);
    setIsModalOpen(true);
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
    handleOpenFormModal(invoiceData);
    setActiveTab('ventas');
    setSubTabVentas('resumen_ventas');
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
        { id: 'gastos_creditos_sub', label: 'Gastos y Créditos', icon: CreditCard },
        { id: 'reports', label: 'Reportes', icon: Download },
      ];
    }
    if (mode === 'compras') {
      return [
        { id: 'compras_resumen', label: 'Historial de Compras', icon: ShoppingBag },
        { id: 'compras_sri', label: 'Facturas Recibidas (SRI)', icon: Download },
        { id: 'compras_gastos', label: 'Gastos con IA', icon: Sparkles },
        { id: 'compras_nc', label: 'Notas de Crédito', icon: FileText },
        { id: 'compras_retencion', label: 'Retenciones Emitidas', icon: Percent }
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
          <span className="text-[9px] font-black uppercase tracking-wider text-primary">Tipo Doc:</span>
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
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
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
                isModalOpen && editingTx?.type === 'ingreso' ? (
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

              {/* SECCIÓN COMPRAS */}
              {activeTab === 'compras_resumen' && (
                isModalOpen && editingTx?.type === 'egreso' &&
                (editingTx?.documentType === 'factura' || editingTx?.documentType === 'nota_venta' || editingTx?.documentType === 'liquidacion' || !editingTx?.documentType) ? (
                  <PurchaseForm 
                    tx={editingTx} 
                    onClose={() => setIsModalOpen(false)} 
                    thirdParties={thirdParties} 
                    products={products}
                    
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

              {activeTab === 'compras_sri' && (
                <ComprasSriView transactions={transactions} showToast={showToast} db={db} appId={appId} />
              )}

              {activeTab === 'compras_gastos' && (
                <ComprasGastosView transactions={transactions} showToast={showToast} db={db} appId={appId} />
              )}

              {activeTab === 'compras_nc' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="nota_credito" forcedType="egreso" />
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
    </div>
  );
}
