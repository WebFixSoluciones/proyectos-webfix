import React, { useState, useEffect } from 'react';
import { 
  DollarSign, PieChart, Users, FileText, Download, Settings, Sparkles, ShoppingCart, Package, Bookmark,
  ArrowDownCircle, ArrowUpCircle, TrendingUp, Calculator, Building, Percent, CreditCard
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
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
import AccountsReceivablePayable from './AccountsReceivablePayable';
import SalesDashboard from './SalesDashboard';
import ComprasSriView from './ComprasSriView';
import ComprasGastosView from './ComprasGastosView';
import GastosCreditosModule from './GastosCreditosModule';

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
    if (m === 'compras') return 'compras_resumen';
    return 'dashboard'; // 'contabilidad'
  };

  const [activeTab, setActiveTab] = useState(() => getInitialTab(mode));

  // Sync state if mode changes
  useEffect(() => {
    setActiveTab(getInitialTab(mode));
  }, [mode]);

  // Sincronizar subTab de ventas y personas desde prop de navegación rápida
  useEffect(() => {
    if (initialSubTab) {
      if (mode === 'ventas') {
        const targetSub = String(initialSubTab).startsWith('pos') ? 'pos' : initialSubTab;
        setSubTabVentas(targetSub);
        setActiveTab('ventas');
      } else if (mode === 'personas') {
        setSubTabPersonas(initialSubTab);
      }
    }
  }, [initialSubTab, mode]);

  // Estados de sub-navegación ERP
  const [subTabVentas, setSubTabVentas] = useState(() => initialSubTab || 'resumen_ventas');
  const [subTabSri, setSubTabSri] = useState('nota_credito');
  const [subTabPersonas, setSubTabPersonas] = useState(() => (mode === 'personas' && initialSubTab) ? initialSubTab : 'cliente');

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
        { id: 'gastos_creditos_sub', label: 'Gastos y Créditos', icon: CreditCard },
        { id: 'reports', label: 'Reportes', icon: Download },
      ];
    }
    if (mode === 'compras') {
      return [
        { id: 'compras_resumen', label: 'Resumen', icon: PieChart },
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
      
      {/* BARRA DE NAVEGACIÓN ESTÁNDAR DE SUBMÓDULOS */}
      {mode !== 'personas' && (
        <div className={`flex items-center gap-3 px-8 py-3.5 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-primary/10 bg-primary-light'}`}>
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none flex-1">
            
            {/* Si el modo es Contabilidad o Compras: Renderizar displayedTabs */}
            {['contabilidad', 'compras'].includes(mode) && displayedTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-primary text-white border-primary shadow-sm')
                      : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-black hover:text-black hover:bg-black/5')
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* Si el modo es Ventas: Renderizar ventas subtabs */}
            {mode === 'ventas' && [
              { id: 'resumen_ventas', label: 'Resumen', icon: TrendingUp },
              { id: 'ventas_preventa', label: 'Ventas', icon: ShoppingCart },
              { id: 'pos', label: 'POS', icon: Calculator },
              { id: 'quotes', label: 'Cotizaciones', icon: FileText },
              { id: 'nota_credito', label: 'Notas de Crédito', icon: ArrowDownCircle },
              { id: 'retencion', label: 'Retenciones', icon: Percent }
            ].map(sub => {
              const Icon = sub.icon;
              const isActive = subTabVentas === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSubTabVentas(sub.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-primary text-white border-primary shadow-sm')
                      : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-black hover:text-black hover:bg-black/5')
                  }`}
                >
                  <Icon size={13} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-black hover:text-black hover:bg-black/5')
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
              {activeTab === 'ventas' && subTabVentas === 'ventas_preventa' && (
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
                  isPreventaOnly={true}
                />
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
                  isPreventaOnly={false}
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
                <InventoryModule isDarkMode={isDarkMode} />
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

              {/* REPORTES */}
              {activeTab === 'reports' && <ReportsView transactions={transactions} isDarkMode={isDarkMode} showToast={showToast} />}
              {activeTab === 'gastos_creditos_sub' && (
                <GastosCreditosModule isDarkMode={isDarkMode} showToast={showToast} transactions={transactions} thirdParties={thirdParties} db={db} appId={appId} />
              )}

              {/* SECCIÓN COMPRAS */}
              {activeTab === 'compras_resumen' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Tarjetas de Métricas de Compras */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Compras del Mes</span>
                        <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                          <ShoppingCart size={16} />
                        </div>
                      </div>
                      <p className="text-2xl font-black">
                        ${transactions
                          .filter(t => t.type === 'egreso' && t.date?.startsWith(new Date().toISOString().slice(0, 7)))
                          .reduce((sum, t) => sum + (Number(t.total) || 0), 0)
                          .toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1">Egresos totales registrados en este mes</p>
                    </div>

                    <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Cuentas por Pagar</span>
                        <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                          <ArrowUpCircle size={16} />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-red-500">
                        ${transactions
                          .filter(t => t.type === 'egreso' && t.paymentStatus !== 'pagado')
                          .reduce((sum, t) => sum + ((Number(t.total) || 0) - (Number(t.paidAmount) || 0)), 0)
                          .toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1">Saldos pendientes con proveedores</p>
                    </div>

                    <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Retenciones Emitidas</span>
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                          <Percent size={16} />
                        </div>
                      </div>
                      <p className="text-2xl font-black">
                        {transactions.filter(t => t.type === 'egreso' && t.documentType === 'retencion').length}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1">Documentos de retención de compras emitidos</p>
                    </div>
                  </div>

                  {/* Tabla de últimas compras */}
                  <div className={`rounded-[10px] border overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
                    isDarkMode 
                      ? 'border-white/5 bg-[#0f111a]/85 shadow-lg shadow-black/40' 
                      : 'border-slate-200/80 bg-white'
                  }`}>
                    <div className="p-6 pb-2 border-b border-dashed border-white/5 dark:border-white/5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">Últimas Compras Registradas</h3>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                          isDarkMode 
                            ? 'bg-black/35 text-slate-400 border-b border-white/5' 
                            : 'bg-slate-50 text-slate-600 border-b border-slate-100'
                        }`}>
                          <tr>
                            <th className="px-6 py-3.5">Fecha</th>
                            <th className="px-6 py-3.5">Comprobante</th>
                            <th className="px-6 py-3.5">Contacto</th>
                            <th className="px-6 py-3.5 text-right">Total</th>
                            <th className="px-6 py-3.5 text-center">Estado Pago</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                          {transactions
                            .filter(t => t.type === 'egreso' && t.documentType !== 'retencion')
                            .slice(0, 5)
                            .map(tx => {
                              const contact = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                              return (
                                <tr key={tx.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                                  <td className="px-6 py-3.5 text-gray-400 font-medium">{tx.date}</td>
                                  <td className="px-6 py-3.5 font-mono text-[10px] font-bold">{tx.documentNumber || `Sec: ${tx.secuencial || 'N/A'}`}</td>
                                  <td className="px-6 py-3.5 font-semibold text-black dark:text-white">{contact?.name || 'Proveedor Externo'}</td>
                                  <td className="px-6 py-3.5 text-right font-bold text-red-500">${Number(tx.total).toFixed(2)}</td>
                                  <td className="px-6 py-3.5 text-center">
                                    <span className={`px-2 py-0.5 rounded-[10px] text-[9px] font-bold ${
                                      tx.paymentStatus === 'pagado' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-amber-500/10 text-amber-450'
                                    }`}>
                                      {tx.paymentStatus === 'pagado' ? 'Pagado' : 'Pendiente'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          {transactions.filter(t => t.type === 'egreso' && t.documentType !== 'retencion').length === 0 && (
                            <tr>
                              <td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic">No hay compras registradas en este período.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'compras_sri' && (
                <ComprasSriView transactions={transactions} isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} />
              )}

              {activeTab === 'compras_gastos' && (
                <ComprasGastosView transactions={transactions} isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} />
              )}

              {activeTab === 'compras_nc' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="nota_credito" forcedType="egreso" />
              )}

              {activeTab === 'compras_retencion' && (
                <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} onOpenForm={handleOpenFormModal} forcedDocType="retencion" forcedType="egreso" />
              )}
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
