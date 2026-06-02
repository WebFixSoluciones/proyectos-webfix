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

export default function FinanceModule({ mode = 'contabilidad', initialSubTab, isDarkMode, showToast }) {
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
      setSubTabVentas(initialSubTab);
    }
  }, [initialSubTab, mode]);

  const [transactions, setTransactions] = useState([]);
  const [thirdParties, setThirdParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Estados de sub-navegación ERP
  const [subTabVentas, setSubTabVentas] = useState(() => initialSubTab || 'facturas');
  const [subTabSri, setSubTabSri] = useState('nota_credito');
  const [subTabPersonas, setSubTabPersonas] = useState('cliente');

  // Estados centralizados para el modal de Facturación / SRI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  // Cargar datos de Firebase
  useEffect(() => {
    if (!appId || !db) return;

    const txCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_transactions');
    const tpCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties');
    const prodCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_products');

    const unsubTx = onSnapshot(txCol, (snap) => {
      const txData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      txData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(txData);
      setIsLoading(false);
    });

    const unsubTp = onSnapshot(tpCol, (snap) => {
      const tpData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setThirdParties(tpData);
    });

    const unsubProd = onSnapshot(prodCol, (snap) => {
      const prodData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(prodData);
    });

    return () => {
      unsubTx();
      unsubTp();
      unsubProd();
    };
  }, [appId, db]);

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
    setSubTabVentas('facturas');
  };

  // Checkout desde Punto de Venta (POS)
  const handlePOSCheckout = (invoiceData) => {
    handleOpenFormModal(invoiceData);
    setActiveTab('ventas');
    setSubTabVentas('facturas');
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
      {/* HEADER FINANZAS */}
      <div className={`flex items-center justify-between px-8 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10 bg-[#0f0f11]' : 'border-gray-350 bg-white'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl shadow-inner border ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-emerald-100/80 text-emerald-800 border-emerald-300'}`}>
            <ModuleIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{moduleHeader.title}</h1>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-705 font-medium'}`}>
              {moduleHeader.desc}
            </p>
          </div>
        </div>

        {/* NAVEGACIÓN Y CHAT */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isChatOpen 
                ? 'bg-purple-600 border-purple-600 text-white shadow-md' 
                : (isDarkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20' : 'bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100')
            }`}
          >
            <Sparkles size={13} /> Asistente AI
          </button>

          {displayedTabs.length > 0 && (
            <div className={`flex p-1 rounded-xl border shadow-inner ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-200/60 border-gray-300/80'}`}>
              {displayedTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive 
                        ? isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-950 font-bold border border-gray-205/60 shadow-sm'
                        : isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-gray-650 hover:text-gray-900 hover:bg-black/5'
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SUB-NAVEGACIÓN SI ACTIVE TAB TIENE SUB-TABS */}
      {['ventas', 'sri_docs', 'personas'].includes(activeTab) && (
        <div className={`flex items-center gap-2 px-8 py-2 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-gray-250 bg-gray-50'}`}>
          <span className={`text-[9px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Módulo:</span>
          <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
            {activeTab === 'ventas' && [
              { id: 'facturas', label: 'Facturas de Venta' },
              { id: 'pos', label: 'Punto de Venta (POS)' },
              { id: 'quotes', label: 'Cotizaciones (Proformas)' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setSubTabVentas(sub.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  subTabVentas === sub.id
                    ? (isDarkMode ? 'bg-blue-500/20 text-blue-450 border-blue-500/30' : 'bg-blue-600 text-white border-blue-600 shadow-sm')
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-black/5')
                }`}
              >
                {sub.label}
              </button>
            ))}

            {activeTab === 'sri_docs' && [
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
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-black/5')
                }`}
              >
                {sub.label}
              </button>
            ))}

            {activeTab === 'personas' && [
              { id: 'cliente', label: 'Clientes' },
              { id: 'proveedor', label: 'Proveedores' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setSubTabPersonas(sub.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  subTabPersonas === sub.id
                    ? (isDarkMode ? 'bg-purple-500/20 text-purple-450 border-purple-500/30' : 'bg-purple-600 text-white border-purple-600 shadow-sm')
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-black/5')
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CUERPO PRINCIPAL CON DIVISION DE CHAT */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-transparent">
        <div className={`flex-1 overflow-y-auto px-8 py-6 custom-scrollbar ${isDarkMode ? 'bg-[#0f0f11]' : 'bg-[#f8f9fa]'}`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <FinanceDashboard transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} db={db} appId={appId} />}
              
              {/* SECCIÓN VENTAS */}
              {activeTab === 'ventas' && subTabVentas === 'pos' && (
                <PosView products={products} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} onCheckout={handlePOSCheckout} />
              )}
              {activeTab === 'ventas' && subTabVentas === 'quotes' && (
                <QuotesView products={products} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} onPromoteToInvoice={handlePromoteToInvoice} />
              )}
              {activeTab === 'ventas' && subTabVentas === 'facturas' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="factura" />
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
        
        {isChatOpen && (
          <div className={`w-80 border-l shrink-0 flex flex-col p-4 animate-in slide-in-from-right duration-300 ${isDarkMode ? 'border-white/10 bg-[#0f0f11]' : 'border-black/5 bg-gray-50'}`}>
            <FinanceChat transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} onClose={() => setIsChatOpen(false)} />
          </div>
        )}
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
