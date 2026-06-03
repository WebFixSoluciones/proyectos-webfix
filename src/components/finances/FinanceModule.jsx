import React, { useState, useEffect } from 'react';
import { 
  DollarSign, PieChart, Users, FileText, Download, Settings, Sparkles, ShoppingCart, Package, Bookmark,
  ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, storage, appId } from '../../firebase';
import FinanceDashboard from './FinanceDashboard';
import TransactionsView from './TransactionsView';
import ThirdPartiesView from './ThirdPartiesView';
import ReportsView from './ReportsView';
import FinanceSettings from './FinanceSettings';
import FinanceChat from './FinanceChat';
import ProductsView from './ProductsView';
import QuotesView from './QuotesView';
import PosView from './PosView';
import TransactionForm from './TransactionForm';
import AccountsReceivablePayable from './AccountsReceivablePayable';
import SalesDashboard from './SalesDashboard';

export default function FinanceModule({ 
  mode = 'contabilidad', 
  initialSubTab, 
  isDarkMode, 
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
    return 'dashboard'; // 'contabilidad'
  };

  const [activeTab, setActiveTab] = useState(() => getInitialTab(mode));

  // Sync state if mode changes
  useEffect(() => {
    setActiveTab(getInitialTab(mode));
  }, [mode]);

  // Sincronizar subTab de ventas desde prop de navegación rápida (POS)
  useEffect(() => {
    if (initialSubTab && mode === 'ventas') {
      const targetSub = String(initialSubTab).startsWith('pos') ? 'pos' : initialSubTab;
      setSubTabVentas(targetSub);
      setActiveTab('ventas');
    }
  }, [initialSubTab, mode]);

  // Estados de sub-navegación ERP
  const [subTabVentas, setSubTabVentas] = useState(() => initialSubTab || 'resumen_ventas');
  const [subTabSri, setSubTabSri] = useState('nota_credito');
  const [subTabPersonas, setSubTabPersonas] = useState('cliente');

  // Estados centralizados para el modal de Facturación / SRI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

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
      date: new Date().toISOString().split('T')[0],
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
        { id: 'reports', label: 'Reportes', icon: Download },
        { id: 'settings', label: 'Configuración', icon: Settings },
      ];
    }
    return [];
  };

  const displayedTabs = getTabsForMode();

  return (
    <div className={`flex flex-col h-full w-full animate-in fade-in duration-500 overflow-hidden`}>
      
      {/* BARRA DE NAVEGACIÓN ESTÁNDAR DE SUBMÓDULOS */}
      <div className={`flex items-center gap-3 px-8 py-3.5 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-primary/10 bg-primary-light'}`}>
        <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-primary'}`}>Submódulos:</span>
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none flex-1">
          
          {/* Si el modo es Contabilidad: Renderizar displayedTabs */}
          {mode === 'contabilidad' && displayedTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isActive
                    ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-primary text-white border-primary shadow-sm')
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-black/5')
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* Si el modo es Ventas: Renderizar ventas subtabs */}
          {mode === 'ventas' && [
            { id: 'resumen_ventas', label: 'Resumen' },
            { id: 'pos', label: 'Preventa (POS)' },
            { id: 'quotes', label: 'Proformas' },
            { id: 'nota_credito', label: 'Notas de Crédito' },
            { id: 'retencion', label: 'Retenciones' }
          ].map(sub => (
            <button
              key={sub.id}
              onClick={() => setSubTabVentas(sub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                subTabVentas === sub.id
                  ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-primary text-white border-primary shadow-sm')
                  : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-black/5')
              }`}
            >
              <span>{sub.label}</span>
            </button>
          ))}

          {/* Si el modo es Personas: Renderizar personas subtabs */}
          {mode === 'personas' && [
            { id: 'cliente', label: 'Clientes' },
            { id: 'proveedor', label: 'Proveedores' }
          ].map(sub => (
            <button
              key={sub.id}
              onClick={() => setSubTabPersonas(sub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                subTabPersonas === sub.id
                  ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-primary text-white border-primary shadow-sm')
                  : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-black/5')
              }`}
            >
              <span>{sub.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SUB-SUB-NAVEGACIÓN SI ACTIVE TAB TIENE SUB-TABS (ej: sri_docs en contabilidad) */}
      {activeTab === 'sri_docs' && mode === 'contabilidad' && (
        <div className={`flex items-center gap-2 px-8 py-2 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]/50' : 'border-primary/10 bg-primary-light/50'}`}>
          <span className={`text-[9px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-primary'}`}>Tipo Doc:</span>
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
                    ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-450 border-emerald-500/30' : 'bg-emerald-600 text-white border-emerald-600 shadow-sm')
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-black/5')
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
        <div className={`flex-1 overflow-y-auto px-8 py-6 custom-scrollbar ${isDarkMode ? 'bg-[#0f0f11]' : 'bg-white'}`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <FinanceDashboard transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} db={db} appId={appId} />}
              
              {/* SECCIÓN VENTAS */}
              {activeTab === 'ventas' && subTabVentas === 'resumen_ventas' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="ventas_resumen" forcedType="ingreso" />
              )}
              {activeTab === 'ventas' && subTabVentas === 'pos' && (
                <PosView 
                  products={products} 
                  thirdParties={thirdParties} 
                  transactions={transactions}
                  isDarkMode={isDarkMode} 
                  showToast={showToast} 
                  db={db} 
                  appId={appId} 
                  onCheckout={handlePOSCheckout} 
                  onClose={() => setSubTabVentas('resumen_ventas')}
                />
              )}
              {activeTab === 'ventas' && subTabVentas === 'quotes' && (
                <QuotesView products={products} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} onPromoteToInvoice={handlePromoteToInvoice} />
              )}
              {activeTab === 'ventas' && subTabVentas === 'nota_credito' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="nota_credito" forcedType="ingreso" />
              )}
              {activeTab === 'ventas' && subTabVentas === 'retencion' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="retencion" forcedType="ingreso" />
              )}

              {/* SECCIÓN DOCUMENTOS SRI */}
              {activeTab === 'sri_docs' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType={subTabSri} />
              )}

              {/* SECCIÓN INVENTARIO */}
              {activeTab === 'products' && (
                <ProductsView isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} />
              )}

              {/* SECCIÓN PERSONAS */}
              {activeTab === 'personas' && (
                <ThirdPartiesView thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} forcedType={subTabPersonas} />
              )}

              {/* SECCIÓN CUENTAS POR COBRAR (CxC) */}
              {activeTab === 'cxc' && (
                <AccountsReceivablePayable type="cxc" transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} />
              )}

              {/* SECCIÓN CUENTAS POR PAGAR (CxP) */}
              {activeTab === 'cxp' && (
                <AccountsReceivablePayable type="cxp" transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} />
              )}

              {/* REPORTES Y CONFIGURACIÓN */}
              {activeTab === 'reports' && <ReportsView transactions={transactions} isDarkMode={isDarkMode} showToast={showToast} />}
              {activeTab === 'settings' && <FinanceSettings isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} />}
            </>
          )}
        </div>
      </div>

      {/* MODAL GLOBAL DE FACTURACIÓN (COMPARTIDO) */}
      {isModalOpen && (
        <TransactionForm 
          tx={editingTx} 
          onClose={() => setIsModalOpen(false)} 
          thirdParties={thirdParties} 
          products={products}
          isDarkMode={isDarkMode} 
          showToast={showToast} 
          db={db} 
          storage={storage} 
          appId={appId} 
        />
      )}
    </div>
  );
}
