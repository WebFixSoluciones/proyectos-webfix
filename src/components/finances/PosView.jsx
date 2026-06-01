import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, Sparkles, CheckCircle2, DollarSign, X, ShieldAlert, Award, Layers, Tag, Bookmark, RefreshCw, LogOut, ArrowRight, ArrowLeft } from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { consultarRucSri } from '../../services/sriService';

export default function PosView({ products, thirdParties, isDarkMode, showToast, db, appId, onCheckout }) {
  // Estados de Caja
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [openingForm, setOpeningForm] = useState({
    responsible: 'Cajero Principal',
    initialAmount: 100,
    branch: 'Matriz Quito',
    shift: 'Mañana',
    notes: ''
  });

  const [isClosingOpen, setIsClosingOpen] = useState(false);
  const [sessionTxs, setSessionTxs] = useState([]);
  const [closingForm, setClosingForm] = useState({
    efectivoReal: 0,
    tarjetaReal: 0,
    transferenciaReal: 0,
    cruceReal: 0,
    notes: ''
  });

  // Estados de Venta POS
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // Estados de Filtros
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [filterStock, setFilterStock] = useState('all'); // 'all', 'instock'

  // Descuentos
  const [discountType, setDiscountType] = useState('percent'); // 'percent' o 'fixed'
  const [discountValue, setDiscountValue] = useState(0);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);

  // checkout wizard
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Cliente, 2: Pago Combinado, 3: Resumen y Emision
  const [payments, setPayments] = useState({
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    cruce_cuentas: 0,
    transferenciaRef: '',
    tarjetaRef: '',
    cruceRef: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick Client Creation Modal (inside POS Checkout)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isQueryingSri, setIsQueryingSri] = useState(false);
  const [quickAddFormData, setQuickAddFormData] = useState({
    name: '',
    ruc: '',
    email: '',
    tipoIdentificacion: 'ruc',
    direccion: '',
    telefono: '',
    tipoContribuyente: 'general'
  });

  // Suscribirse a sesiones de caja activa
  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_cash_sessions');
    const q = query(colRef, where('status', '==', 'abierta'));
    
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setActiveSession({ id: d.id, ...d.data() });
      } else {
        setActiveSession(null);
      }
      setSessionLoading(false);
    });
    return unsub;
  }, [appId, db]);

  // Manejar apertura de caja
  const handleOpenSession = async (e) => {
    e.preventDefault();
    try {
      const sessionId = `session_${new Date().getTime()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_cash_sessions', sessionId), {
        id: sessionId,
        responsible: openingForm.responsible,
        initialAmount: Number(openingForm.initialAmount) || 0,
        branch: openingForm.branch,
        shift: openingForm.shift,
        notes: openingForm.notes,
        status: 'abierta',
        openedAt: new Date().toISOString()
      });
      showToast("Caja registradora abierta con éxito", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al abrir la caja", "error");
    }
  };

  // Cargar arqueo antes de cerrar caja
  const handleOpenCloseModal = async () => {
    if (!activeSession) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_transactions');
      const q = query(colRef, where('cashSessionId', '==', activeSession.id));
      const snap = await getDocs(q);
      const txs = snap.docs.map(d => d.data());
      setSessionTxs(txs);
      
      const cashTotal = txs.filter(t => t.paymentMethod === 'efectivo').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const cardTotal = txs.filter(t => t.paymentMethod === 'tarjeta').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const transTotal = txs.filter(t => t.paymentMethod === 'transferencia').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const cruceTotal = txs.filter(t => t.paymentMethod === 'cruce_cuentas').reduce((acc, t) => acc + Number(t.total || 0), 0);
      
      setClosingForm({
        efectivoReal: (activeSession.initialAmount + cashTotal).toFixed(2),
        tarjetaReal: cardTotal.toFixed(2),
        transferenciaReal: transTotal.toFixed(2),
        cruceReal: cruceTotal.toFixed(2),
        notes: ''
      });
      setIsClosingOpen(true);
    } catch (err) {
      console.error(err);
      showToast("Error al cargar arqueo", "error");
    }
  };

  // Cerrar caja
  const handleCloseSession = async (e) => {
    e.preventDefault();
    try {
      const cashTotal = sessionTxs.filter(t => t.paymentMethod === 'efectivo').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const cardTotal = sessionTxs.filter(t => t.paymentMethod === 'tarjeta').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const transTotal = sessionTxs.filter(t => t.paymentMethod === 'transferencia').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const cruceTotal = sessionTxs.filter(t => t.paymentMethod === 'cruce_cuentas').reduce((acc, t) => acc + Number(t.total || 0), 0);

      const expectedCash = activeSession.initialAmount + cashTotal;
      const diffCash = Number(closingForm.efectivoReal) - expectedCash;
      const diffCard = Number(closingForm.tarjetaReal) - cardTotal;
      const diffTrans = Number(closingForm.transferenciaReal) - transTotal;
      const diffCruce = Number(closingForm.cruceReal) - cruceTotal;
      const totalDifference = diffCash + diffCard + diffTrans + diffCruce;

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_cash_sessions', activeSession.id), {
        status: 'cerrada',
        closedAt: new Date().toISOString(),
        expectedTotals: {
          efectivo: expectedCash,
          tarjeta: cardTotal,
          transferencia: transTotal,
          cruce_cuentas: cruceTotal
        },
        reconciliation: {
          efectivo: Number(closingForm.efectivoReal),
          tarjeta: Number(closingForm.tarjetaReal),
          transferencia: Number(closingForm.transferenciaReal),
          cruce_cuentas: Number(closingForm.cruceReal)
        },
        differences: {
          efectivo: diffCash,
          tarjeta: diffCard,
          transferencia: diffTrans,
          cruce_cuentas: diffCruce,
          total: totalDifference
        },
        closingNotes: closingForm.notes
      }, { merge: true });

      showToast("Caja registradora cerrada y cuadre completado", "success");
      setIsClosingOpen(false);
      setActiveSession(null);
    } catch (err) {
      console.error(err);
      showToast("Error al cerrar caja", "error");
    }
  };

  // Dinamizar listas de filtros
  const brands = ['all', ...new Set(products.map(p => p.marca).filter(Boolean))];
  const categories = ['all', ...new Set(products.map(p => p.categoria).filter(Boolean))];
  const warehouses = ['all', ...new Set(products.map(p => p.bodega).filter(Boolean))];

  const addToCart = (product) => {
    if (product.type === 'producto' && product.stock <= 0) {
      showToast("Producto sin stock disponible", "error");
      return;
    }

    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (product.type === 'producto' && existing.quantity >= product.stock) {
        showToast("Excede stock disponible", "error");
        return;
      }
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        ivaCategory: product.ivaCategory
      }]);
    }
  };

  const updateQuantity = (productId, change) => {
    const item = cart.find(i => i.productId === productId);
    const prod = products.find(p => p.id === productId);

    if (!item) return;
    const nextQty = item.quantity + change;
    if (nextQty <= 0) {
      setCart(cart.filter(i => i.productId !== productId));
      return;
    }

    if (prod && prod.type === 'producto' && nextQty > prod.stock) {
      showToast("Excede stock disponible", "error");
      return;
    }

    setCart(cart.map(i => 
      i.productId === productId 
        ? { ...i, quantity: nextQty }
        : i
    ));
  };

  // Cómputo de Totales y Descuentos
  const getSubtotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const getDiscountAmount = () => {
    const sub = getSubtotal();
    if (discountType === 'percent') {
      return sub * (Number(discountValue) / 100);
    }
    return Math.min(sub, Number(discountValue));
  };
  const getSubtotalWithDiscount = () => Math.max(0, getSubtotal() - getDiscountAmount());
  
  const getIva = () => {
    const sub = getSubtotal();
    if (sub === 0) return 0;
    const ratio = getSubtotalWithDiscount() / sub;
    return cart.reduce((acc, item) => acc + (item.price * item.quantity * ratio * (item.ivaCategory / 100)), 0);
  };
  const getTotal = () => getSubtotalWithDiscount() + getIva();

  // checkout wizard calculations
  const totalToPay = getTotal();
  const paidTotal = Number(payments.efectivo) + Number(payments.transferencia) + Number(payments.tarjeta) + Number(payments.cruce_cuentas);
  const changeDue = Math.max(0, paidTotal - totalToPay);
  const remainingDue = Math.max(0, totalToPay - paidTotal);

  // Cliente SRI selector
  const getSelectedClient = () => {
    if (selectedClientId) {
      return thirdParties.find(tp => tp.id === selectedClientId);
    }
    return {
      name: 'Consumidor Final',
      ruc: '9999999999999',
      type: 'cliente',
      email: 'consumidorfinal@sri.gob.ec',
      tipoIdentificacion: 'consumidor_final',
      direccion: 'Ecuador',
      telefono: '999999999',
      tipoContribuyente: 'general'
    };
  };

  // Guardar / Suspender ventas
  const suspendSale = () => {
    if (cart.length === 0) {
      showToast("El carrito está vacío para suspender", "error");
      return;
    }
    const data = { cart, selectedClientId };
    localStorage.setItem(`suspended_pos_sale_${appId}`, JSON.stringify(data));
    setCart([]);
    setSelectedClientId('');
    showToast("Venta suspendida temporalmente", "info");
  };

  const resumeSale = () => {
    const dataStr = localStorage.getItem(`suspended_pos_sale_${appId}`);
    if (!dataStr) {
      showToast("No hay ninguna venta suspendida", "error");
      return;
    }
    const data = JSON.parse(dataStr);
    setCart(data.cart || []);
    setSelectedClientId(data.selectedClientId || '');
    localStorage.removeItem(`suspended_pos_sale_${appId}`);
    showToast("Venta suspendida recuperada", "success");
  };

  const hasSuspendedSale = localStorage.getItem(`suspended_pos_sale_${appId}`) !== null;

  // Checkout Finalizado
  const handleFinalCheckout = async () => {
    if (cart.length === 0) {
      showToast("El carrito está vacío", "error");
      return;
    }
    if (remainingDue > 0) {
      showToast(`Falta pagar $${remainingDue.toFixed(2)} para completar el total`, "error");
      return;
    }

    setIsProcessing(true);
    try {
      const client = getSelectedClient();
      let clientDocId = selectedClientId;
      if (!selectedClientId) {
        const cf = thirdParties.find(tp => tp.ruc === '9999999999999');
        if (cf) {
          clientDocId = cf.id;
        } else {
          clientDocId = `tp_${new Date().getTime()}`;
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', clientDocId), {
            id: clientDocId,
            ...client,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Decrementar stock
      for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (prod && prod.type === 'producto') {
          const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', item.productId);
          const nextStock = Math.max(0, (prod.stock || 0) - item.quantity);
          await setDoc(productRef, { stock: nextStock }, { merge: true });
        }
      }

      // Determinar método de pago dominante
      let pMethod = 'transferencia';
      if (payments.efectivo >= payments.tarjeta && payments.efectivo >= payments.transferencia && payments.efectivo >= payments.cruce_cuentas) pMethod = 'efectivo';
      else if (payments.tarjeta >= payments.efectivo && payments.tarjeta >= payments.transferencia && payments.tarjeta >= payments.cruce_cuentas) pMethod = 'tarjeta';
      else if (payments.cruce_cuentas >= payments.efectivo && payments.cruce_cuentas >= payments.tarjeta && payments.cruce_cuentas >= payments.transferencia) pMethod = 'cruce_cuentas';

      const invoiceData = {
        type: 'ingreso',
        date: new Date().toISOString().split('T')[0],
        documentType: 'factura',
        thirdPartyId: clientDocId,
        category: 'ventas',
        currency: 'USD',
        baseImponible: Number(getSubtotalWithDiscount().toFixed(2)),
        ivaPorcentaje: 15,
        ivaValor: Number(getIva().toFixed(2)),
        retencionFuente: 0,
        retencionIva: 0,
        total: Number(totalToPay.toFixed(2)),
        paymentMethod: pMethod,
        paymentStatus: 'pagado',
        sriStatus: 'pendiente',
        items: cart,
        isPOS: true,
        cashSessionId: activeSession.id,
        paymentsBreakdown: {
          efectivo: Number(payments.efectivo),
          transferencia: Number(payments.transferencia),
          tarjeta: Number(payments.tarjeta),
          cruce_cuentas: Number(payments.cruce_cuentas)
        },
        paymentReferences: {
          transferenciaRef: payments.transferenciaRef,
          tarjetaRef: payments.tarjetaRef,
          cruceRef: payments.cruceRef
        }
      };

      onCheckout(invoiceData);
      setCart([]);
      setSelectedClientId('');
      setPayments({
        efectivo: 0,
        transferencia: 0,
        tarjeta: 0,
        cruce_cuentas: 0,
        transferenciaRef: '',
        tarjetaRef: '',
        cruceRef: ''
      });
      setIsCheckoutOpen(false);
      setCheckoutStep(1);
      showToast("Venta POS completada y enviada a facturación SRI", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al procesar la venta", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Client Creation inside POS
  const queryQuickClientSRI = async () => {
    if (!quickAddFormData.ruc) {
      showToast("Ingresa un número RUC/CI", "error");
      return;
    }
    setIsQueryingSri(true);
    try {
      const result = await consultarRucSri(quickAddFormData.ruc);
      setQuickAddFormData(prev => ({
        ...prev,
        name: result.name,
        tipoIdentificacion: result.tipoIdentificacion,
        direccion: result.direccion,
        telefono: result.telefono,
        email: result.email || prev.email,
        tipoContribuyente: result.tipoContribuyente || 'general'
      }));
      showToast("Datos cargados exitosamente desde el SRI", "success");
    } catch (e) {
      showToast("Error al consultar RUC", "error");
    } finally {
      setIsQueryingSri(false);
    }
  };

  const handleQuickClientSave = async (e) => {
    e.preventDefault();
    if (!quickAddFormData.name || !quickAddFormData.ruc) {
      showToast("Nombre e identificación obligatorios", "error");
      return;
    }
    try {
      const docId = `tp_${new Date().getTime()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', docId), {
        id: docId,
        name: quickAddFormData.name,
        ruc: quickAddFormData.ruc,
        email: quickAddFormData.email || '',
        type: 'cliente',
        tipoIdentificacion: quickAddFormData.tipoIdentificacion || 'ruc',
        direccion: quickAddFormData.direccion || '',
        telefono: quickAddFormData.telefono || '',
        tipoContribuyente: quickAddFormData.tipoContribuyente || 'general',
        updatedAt: new Date().toISOString()
      });
      setSelectedClientId(docId);
      setIsQuickAddOpen(false);
      showToast("Cliente agregado y seleccionado", "success");
    } catch (err) {
      showToast("Error al registrar cliente", "error");
    }
  };

  // Filtrado de Productos (Izquierda)
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.codigoBarras || '').includes(searchTerm);
    const matchesBrand = filterBrand === 'all' || p.marca === filterBrand;
    const matchesCategory = filterCategory === 'all' || p.categoria === filterCategory;
    const matchesWarehouse = filterWarehouse === 'all' || p.bodega === filterWarehouse;
    const matchesStock = filterStock === 'all' || (p.type === 'producto' && p.stock > 0);

    return matchesSearch && matchesBrand && matchesCategory && matchesWarehouse && matchesStock;
  });

  const inputClass = `w-full text-xs px-3 py-2 rounded-xl outline-none border ${
    isDarkMode ? 'bg-black/40 border-white/10 text-white focus:border-blue-500/50' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-650/40'
  }`;

  if (sessionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // PANTALLA 1: APERTURA DE CAJA
  if (!activeSession) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0c0c0e] text-white flex items-center justify-center p-4 backdrop-blur-md">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#141416] border border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <DollarSign size={24} />
            </div>
            <h2 className="text-lg font-black tracking-tight">Apertura de Caja POS</h2>
            <p className="text-xs text-gray-500">Es necesario ingresar el fondo inicial para habilitar la caja registradora.</p>
          </div>

          <form onSubmit={handleOpenSession} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-400">Responsable / Cajero</label>
              <input type="text" required value={openingForm.responsible} onChange={e => setOpeningForm({...openingForm, responsible: e.target.value})} className={inputClass} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-400">Sucursal</label>
                <input type="text" required value={openingForm.branch} onChange={e => setOpeningForm({...openingForm, branch: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-400">Turno</label>
                <select value={openingForm.shift} onChange={e => setOpeningForm({...openingForm, shift: e.target.value})} className={inputClass}>
                  <option value="Mañana" className="text-black">Mañana</option>
                  <option value="Tarde" className="text-black">Tarde</option>
                  <option value="Noche" className="text-black">Noche</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-400">Fondo Inicial ($ USD)</label>
              <input type="number" required step="0.01" value={openingForm.initialAmount} onChange={e => setOpeningForm({...openingForm, initialAmount: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-400">Observaciones de Entrada</label>
              <textarea value={openingForm.notes} onChange={e => setOpeningForm({...openingForm, notes: e.target.value})} className={`${inputClass} min-h-[60px]`} placeholder="Sin novedades..." />
            </div>

            <button type="submit" className="w-full py-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-transform hover:-translate-y-0.5 mt-2">
              Abrir Caja y Activar POS
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PANTALLA 2: POS PRINCIPAL EN PANTALLA COMPLETA
  return (
    <div className="fixed inset-0 z-[100] bg-[#0c0c0e] text-white flex flex-col overflow-hidden animate-in fade-in duration-300">
      
      {/* TOP HEADER POS */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#121214]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/10">
            <ShoppingCart size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider">Caja POS: {activeSession.branch}</h1>
            <p className="text-[9px] text-gray-500 font-mono mt-0.5">Sesión: {activeSession.responsible} ({activeSession.shift}) | Fondo: ${activeSession.initialAmount.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasSuspendedSale && (
            <button onClick={resumeSale} className="px-3.5 py-1.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 font-bold text-[10px] uppercase hover:bg-yellow-500/20">
              Recuperar Venta
            </button>
          )}
          <button onClick={handleOpenCloseModal} className="px-3.5 py-1.5 rounded-xl border border-red-500/25 bg-red-600/10 text-red-400 font-bold text-[10px] uppercase hover:bg-red-600/20">
            Arqueo / Cerrar Caja
          </button>
          <button onClick={() => window.location.reload()} className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white" title="Volver al ERP / Recargar">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* POS WORKSPACE */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* LADO IZQUIERDO: SELECCIÓN Y FILTRO DE PRODUCTOS */}
        <div className="flex-1 flex flex-col p-6 min-w-0 border-r border-white/5 bg-[#0f0f11]/60">
          
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="space-y-3.5 mb-6">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-black/45">
              <Search size={14} className="text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar por Nombre, SKU o Código de Barras..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-gray-500"
              />
              {searchTerm && <button onClick={() => setSearchTerm('')}><X size={12} className="text-gray-500" /></button>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Categoría</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full text-[10px] font-bold px-2 py-2 rounded-xl bg-black/40 border border-white/5 outline-none text-white">
                  <option value="all">Categorías (Todos)</option>
                  {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Marca</label>
                <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="w-full text-[10px] font-bold px-2 py-2 rounded-xl bg-black/40 border border-white/5 outline-none text-white">
                  <option value="all">Marcas (Todos)</option>
                  {brands.filter(b => b !== 'all').map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Bodega / Almacén</label>
                <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)} className="w-full text-[10px] font-bold px-2 py-2 rounded-xl bg-black/40 border border-white/5 outline-none text-white">
                  <option value="all">Bodegas (Todos)</option>
                  {warehouses.filter(w => w !== 'all').map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Filtro Stock</label>
                <select value={filterStock} onChange={e => setFilterStock(e.target.value)} className="w-full text-[10px] font-bold px-2 py-2 rounded-xl bg-black/40 border border-white/5 outline-none text-white">
                  <option value="all">Inventario completo</option>
                  <option value="instock">Solo disponibles (Con Stock)</option>
                </select>
              </div>
            </div>
          </div>

          {/* GRID DE PRODUCTOS */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 p-1 custom-scrollbar">
            {filteredProducts.map(p => {
              const isOutOfStock = p.type === 'producto' && p.stock <= 0;
              return (
                <div 
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`p-3.5 border rounded-2xl flex flex-col justify-between transition-all cursor-pointer select-none group relative overflow-hidden bg-white/[0.01] ${
                    isOutOfStock 
                      ? 'opacity-40 cursor-not-allowed bg-white/[0.005] border-white/5' 
                      : 'border-white/5 hover:border-blue-500/30 hover:bg-white/[0.02] hover:-translate-y-0.5'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-mono text-[9px] text-gray-500 truncate">{p.sku}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${p.type === 'producto' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{p.type}</span>
                    </div>
                    <h4 className="text-xs font-bold leading-snug text-white line-clamp-2">{p.name}</h4>
                    <p className="text-[9px] text-gray-500 truncate">{p.marca || 'Sin Marca'} | {p.categoria || 'General'}</p>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs font-black text-white">${Number(p.price).toFixed(2)}</span>
                    {p.type === 'producto' && (
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${p.stock <= p.minStock ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                        {p.bodega || 'Bodega Central'}: {p.stock}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-gray-500">
                <ShoppingCart size={40} className="opacity-30 mb-2" />
                <p className="text-xs italic">No hay productos que coincidan con los filtros.</p>
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO: DETALLE DEL PEDIDO (CHECKOUT FIJO) */}
        <div className="w-96 flex flex-col shrink-0 border-l border-white/5 bg-[#121214]/65">
          
          {/* CLIENTE SELECTOR */}
          <div className="p-4 border-b border-white/5 bg-black/10 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex-1">
              <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Cliente Receptor</label>
              <select 
                value={selectedClientId} 
                onChange={e => setSelectedClientId(e.target.value)} 
                className="w-full text-xs font-semibold px-2 py-2 outline-none rounded-xl border border-white/5 bg-black/40 text-white"
              >
                <option value="">Consumidor Final (9999999999999)</option>
                {thirdParties.filter(tp => tp.type === 'cliente').map(tp => (
                  <option key={tp.id} value={tp.id} className="text-black">{tp.name} - RUC: {tp.ruc}</option>
                ))}
              </select>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setQuickAddFormData({
                  name: '', ruc: '', email: '', tipoIdentificacion: 'ruc', direccion: '', telefono: '', tipoContribuyente: 'general'
                });
                setIsQuickAddOpen(true);
              }}
              className="mt-4 p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shrink-0"
              title="Registrar Cliente Nuevo"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* LISTA CARRITO POS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.map((item, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-black/20 border border-white/5 space-y-2">
                <div className="flex justify-between items-start gap-1">
                  <span className="text-xs font-bold text-white line-clamp-1">{item.name}</span>
                  <button type="button" onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-500 opacity-60 hover:opacity-100"><Trash2 size={12}/></button>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <span>${Number(item.price).toFixed(2)} c/u</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQuantity(item.productId, -1)} className="p-0.5 rounded bg-white/10 hover:bg-white/20"><Minus size={10}/></button>
                    <span className="font-bold text-white w-4 text-center">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.productId, 1)} className="p-0.5 rounded bg-white/10 hover:bg-white/20"><Plus size={10}/></button>
                    <span className="font-black text-white w-14 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-16">
                <ShoppingCart size={36} className="opacity-20 mb-2 animate-pulse" />
                <p className="text-xs italic">Carrito de Venta Vacío</p>
              </div>
            )}
          </div>

          {/* ACCIONES Y TOTALES */}
          <div className="p-4 border-t border-white/5 bg-black/10 space-y-4 shrink-0">
            {/* DESCUENTO CARD */}
            {isDiscountOpen ? (
              <div className="p-3 rounded-xl border border-white/5 bg-black/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-400">DESCUENTO GENERAL</span>
                  <button onClick={() => { setIsDiscountOpen(false); setDiscountValue(0); }} className="text-gray-500"><X size={10} /></button>
                </div>
                <div className="flex gap-1">
                  <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="text-[10px] px-2 py-1.5 rounded-lg bg-black border border-white/10 text-white">
                    <option value="percent">% Porcentaje</option>
                    <option value="fixed">$ Fijo (USD)</option>
                  </select>
                  <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded-lg bg-black border border-white/10 text-white" placeholder="0" />
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsDiscountOpen(true)} className="flex-1 py-1.5 rounded-xl border border-white/5 hover:bg-white/5 text-gray-400 font-bold text-[9px] uppercase">
                  <Tag size={10} className="inline mr-1" /> Descuento
                </button>
                <button onClick={suspendSale} className="flex-1 py-1.5 rounded-xl border border-white/5 hover:bg-white/5 text-gray-400 font-bold text-[9px] uppercase">
                  <Bookmark size={10} className="inline mr-1" /> Suspender
                </button>
                <button onClick={() => setCart([])} className="flex-1 py-1.5 rounded-xl border border-white/5 hover:bg-white/5 text-red-400 font-bold text-[9px] uppercase">
                  <Trash2 size={10} className="inline mr-1" /> Vaciar
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal Neto</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              {getDiscountAmount() > 0 && (
                <div className="flex justify-between text-red-400 font-bold">
                  <span>Descuento Aplicado</span>
                  <span>-${getDiscountAmount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>IVA (15%)</span>
                <span>${getIva().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-2 border-t border-white/5 text-white">
                <span>TOTAL NETO</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => {
                if (cart.length === 0) {
                  showToast("Agrega productos al carrito", "error");
                  return;
                }
                setPayments({
                  efectivo: 0, transferencia: 0, tarjeta: 0, cruce_cuentas: 0,
                  transferenciaRef: '', tarjetaRef: '', cruceRef: ''
                });
                setCheckoutStep(1);
                setIsCheckoutOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 shadow-md transition-all active:scale-[0.98]"
            >
              <Sparkles size={14} /> Proceder al Cobro (Pasos)
            </button>
          </div>

        </div>

      </div>

      {/* APERTURA Y CIERRE DE CAJA DIALOG */}
      {isClosingOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#141416] border border-white/10 shadow-2xl">
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-red-400">
              <ShieldAlert size={16} /> Arqueo y Cierre de Caja
            </h3>
            <p className="text-[10px] text-gray-500 mb-4 leading-normal">Verifica los montos acumulados por ventas en esta sesión y digita los valores reales contados.</p>

            <form onSubmit={handleCloseSession} className="space-y-4">
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 font-bold text-gray-500 border-b border-white/5 pb-2 text-[9px] uppercase">
                  <span>Método de Pago</span>
                  <span className="text-right">Físico / Real</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">Efectivo en Caja</p>
                    <p className="text-[9px] text-gray-500">Esperado: ${(activeSession.initialAmount + sessionTxs.filter(t => t.paymentMethod === 'efectivo').reduce((acc, t) => acc + Number(t.total || 0), 0)).toFixed(2)} (inc. Fondo)</p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.efectivoReal} onChange={e => setClosingForm({...closingForm, efectivoReal: e.target.value})} className={`${inputClass} w-24 text-right`} />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">Tarjeta Débito/Crédito</p>
                    <p className="text-[9px] text-gray-500">Esperado: ${sessionTxs.filter(t => t.paymentMethod === 'tarjeta').reduce((acc, t) => acc + Number(t.total || 0), 0).toFixed(2)}</p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.tarjetaReal} onChange={e => setClosingForm({...closingForm, tarjetaReal: e.target.value})} className={`${inputClass} w-24 text-right`} />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">Transferencias</p>
                    <p className="text-[9px] text-gray-500">Esperado: ${sessionTxs.filter(t => t.paymentMethod === 'transferencia').reduce((acc, t) => acc + Number(t.total || 0), 0).toFixed(2)}</p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.transferenciaReal} onChange={e => setClosingForm({...closingForm, transferenciaReal: e.target.value})} className={`${inputClass} w-24 text-right`} />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">Cruce de Cuentas</p>
                    <p className="text-[9px] text-gray-500">Esperado: ${sessionTxs.filter(t => t.paymentMethod === 'cruce_cuentas').reduce((acc, t) => acc + Number(t.total || 0), 0).toFixed(2)}</p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.cruceReal} onChange={e => setClosingForm({...closingForm, cruceReal: e.target.value})} className={`${inputClass} w-24 text-right`} />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-400">Observaciones Arqueo</label>
                <textarea value={closingForm.notes} onChange={e => setClosingForm({...closingForm, notes: e.target.value})} className={`${inputClass} min-h-[50px]`} placeholder="Escribe discrepancias si las hay..." />
              </div>

              <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setIsClosingOpen(false)} className="px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-white/5">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-500 text-white">Confirmar y Cerrar Caja</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT WIZARD MODAL (FULLSCREEN PASOS) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[110] bg-[#0c0c0e]/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#141416] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* WIZARD PROGRESS HEADER */}
            <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={15} className="text-blue-500" />
                <h3 className="text-xs font-black uppercase tracking-wider">Checkout Comercial POS</h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                <span className={checkoutStep === 1 ? 'text-blue-400' : ''}>1. Cliente</span>
                <ChevronRight size={10} />
                <span className={checkoutStep === 2 ? 'text-blue-400' : ''}>2. Métodos de Pago</span>
                <ChevronRight size={10} />
                <span className={checkoutStep === 3 ? 'text-blue-400' : ''}>3. Emisión</span>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-500 hover:text-white"><X size={15}/></button>
            </div>

            {/* WIZARD CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* PASO 1: CLIENTE */}
              {checkoutStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cliente de la Venta</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <select 
                          value={selectedClientId} 
                          onChange={e => setSelectedClientId(e.target.value)} 
                          className="w-full text-xs font-semibold px-3 py-2.5 outline-none rounded-xl border border-white/10 bg-black text-white"
                        >
                          <option value="">Consumidor Final (9999999999999)</option>
                          {thirdParties.filter(tp => tp.type === 'cliente').map(tp => (
                            <option key={tp.id} value={tp.id} className="text-black">{tp.name} - RUC: {tp.ruc}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          setQuickAddFormData({
                            name: '', ruc: '', email: '', tipoIdentificacion: 'ruc', direccion: '', telefono: '', tipoContribuyente: 'general'
                          });
                          setIsQuickAddOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shrink-0 text-xs font-bold"
                      >
                        Crear Nuevo Cliente
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-white/5 bg-black/10 space-y-2 text-xs">
                    <p className="font-bold text-gray-400">Datos Facturación del Receptor:</p>
                    <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                      <p><span className="text-gray-500 font-bold uppercase">Razón Social:</span> {getSelectedClient().name}</p>
                      <p><span className="text-gray-500 font-bold uppercase">Identificación:</span> {getSelectedClient().ruc}</p>
                      <p><span className="text-gray-500 font-bold uppercase">Teléfono:</span> {getSelectedClient().telefono || '-'}</p>
                      <p><span className="text-gray-500 font-bold uppercase">Email:</span> {getSelectedClient().email || '-'}</p>
                      <p className="col-span-2"><span className="text-gray-500 font-bold uppercase">Dirección:</span> {getSelectedClient().direccion || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 2: METODOS DE PAGO */}
              {checkoutStep === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex justify-between items-center text-blue-400">
                    <span className="text-xs font-bold">TOTAL A PAGAR:</span>
                    <span className="text-lg font-black">${totalToPay.toFixed(2)}</span>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Medios de Pago (Ecuador) - Admite combinados</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Efectivo */}
                      <div className="p-3.5 rounded-xl border border-white/5 bg-black/10 space-y-1.5">
                        <label className="text-xs font-bold text-white block">Efectivo ($)</label>
                        <input type="number" step="0.01" value={payments.efectivo || ''} onChange={e => setPayments({...payments, efectivo: e.target.value})} className={inputClass} placeholder="0.00" />
                      </div>
                      
                      {/* Tarjeta */}
                      <div className="p-3.5 rounded-xl border border-white/5 bg-black/10 space-y-1.5">
                        <label className="text-xs font-bold text-white block">Tarjeta (Crédito/Débito) ($)</label>
                        <input type="number" step="0.01" value={payments.tarjeta || ''} onChange={e => setPayments({...payments, tarjeta: e.target.value})} className={inputClass} placeholder="0.00" />
                        <input type="text" value={payments.tarjetaRef} onChange={e => setPayments({...payments, tarjetaRef: e.target.value})} className={`${inputClass} py-1 text-[10px] mt-1`} placeholder="Ref / Autorización" />
                      </div>

                      {/* Transferencia */}
                      <div className="p-3.5 rounded-xl border border-white/5 bg-black/10 space-y-1.5">
                        <label className="text-xs font-bold text-white block">Transferencia Bancaria ($)</label>
                        <input type="number" step="0.01" value={payments.transferencia || ''} onChange={e => setPayments({...payments, transferencia: e.target.value})} className={inputClass} placeholder="0.00" />
                        <input type="text" value={payments.transferenciaRef} onChange={e => setPayments({...payments, transferenciaRef: e.target.value})} className={`${inputClass} py-1 text-[10px] mt-1`} placeholder="Nro Referencia / Comprobante" />
                      </div>

                      {/* Cruce de Cuentas */}
                      <div className="p-3.5 rounded-xl border border-white/5 bg-black/10 space-y-1.5">
                        <label className="text-xs font-bold text-white block">Cruce de Cuentas ($)</label>
                        <input type="number" step="0.01" value={payments.cruce_cuentas || ''} onChange={e => setPayments({...payments, cruce_cuentas: e.target.value})} className={inputClass} placeholder="0.00" />
                        <input type="text" value={payments.cruceRef} onChange={e => setPayments({...payments, cruceRef: e.target.value})} className={`${inputClass} py-1 text-[10px] mt-1`} placeholder="Nro de Documento Relacionado" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/20 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span>Total Pagado:</span>
                      <span className="font-bold text-white">${paidTotal.toFixed(2)}</span>
                    </div>
                    {remainingDue > 0 ? (
                      <div className="flex justify-between text-yellow-400 font-bold">
                        <span>Falta Pagar:</span>
                        <span>${remainingDue.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-emerald-400 font-bold border-t border-white/5 pt-1">
                        <span>Cambio / Vuelto en Efectivo:</span>
                        <span>${changeDue.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PASO 3: CONFIRMACIÓN Y EMISION */}
              {checkoutStep === 3 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 text-xs">
                  <div className="p-5 rounded-2xl bg-black border border-white/5 space-y-3">
                    <h4 className="text-sm font-black text-white text-center uppercase tracking-widest border-b border-white/5 pb-2">PREVISUALIZACIÓN DE FACTURA (RIDE)</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-400 leading-normal">
                      <div>
                        <p className="font-bold text-white">RECEPTOR</p>
                        <p>Razon Social: {getSelectedClient().name}</p>
                        <p>RUC/CI: {getSelectedClient().ruc}</p>
                        <p>Correo: {getSelectedClient().email}</p>
                        <p>Dirección: {getSelectedClient().direccion}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white text-[10px]">COMPROBANTE</p>
                        <p>Establecimiento: {activeSession.branch}</p>
                        <p>Fecha: {new Date().toLocaleDateString()}</p>
                        <p>Ambiente SRI: PRUEBAS (Offline)</p>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3">
                      <p className="font-bold text-white text-[10px] uppercase mb-1.5">Ítems Detallados</p>
                      <div className="space-y-1 text-[10px]">
                        {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-gray-400">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3 flex justify-between font-bold text-sm text-white">
                      <span>Total Neto Cobrado:</span>
                      <span>${totalToPay.toFixed(2)}</span>
                    </div>

                    <div className="text-[9px] text-gray-500 border-t border-white/5 pt-2">
                      <p>Métodos Registrados: Efectivo: ${Number(payments.efectivo).toFixed(2)} | Tarjeta: ${Number(payments.tarjeta).toFixed(2)} | Transf: ${Number(payments.transferencia).toFixed(2)} | Cruce: ${Number(payments.cruce_cuentas).toFixed(2)}</p>
                      <p className="mt-0.5">Vuelto entregado: ${changeDue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* WIZARD ACTIONS BAR */}
            <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex justify-between shrink-0">
              <button 
                type="button" 
                disabled={checkoutStep === 1 || isProcessing}
                onClick={() => setCheckoutStep(prev => prev - 1)}
                className="px-4 py-2 rounded-xl border border-white/5 hover:bg-white/5 text-xs font-semibold disabled:opacity-30"
              >
                Anterior
              </button>
              
              {checkoutStep < 3 ? (
                <button 
                  type="button" 
                  onClick={() => {
                    if (checkoutStep === 2 && remainingDue > 0) {
                      showToast(`Por favor, cubre el total de la factura. Falta pagar $${remainingDue.toFixed(2)}`, "error");
                      return;
                    }
                    setCheckoutStep(prev => prev + 1);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Siguiente
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleFinalCheckout} 
                  disabled={isProcessing}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />} Finalizar Venta y Emitir SRI
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* QUICK CLIENT ADD MODAL IN POS */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#151517] border border-white/10 shadow-2xl">
            <h3 className="text-sm font-black mb-4">Registro Rápido de Cliente (SRI)</h3>
            
            <form onSubmit={handleQuickClientSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-400">Identificación</label>
                  <select 
                    value={quickAddFormData.tipoIdentificacion} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, tipoIdentificacion: e.target.value})} 
                    className="w-full text-xs px-2.5 py-2.5 rounded-xl outline-none bg-black border border-white/10 text-white"
                  >
                    <option value="ruc">RUC</option>
                    <option value="cedula">Cédula</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-400">Número</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      required 
                      value={quickAddFormData.ruc} 
                      onChange={e => setQuickAddFormData({...quickAddFormData, ruc: e.target.value})} 
                      className="w-full text-xs px-2.5 py-2.5 rounded-xl outline-none bg-black border border-white/10 text-white"
                      placeholder="1790000000001" 
                    />
                    <button
                      type="button"
                      disabled={isQueryingSri}
                      onClick={queryQuickClientSRI}
                      className="px-3 rounded-xl border border-purple-500/30 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 shrink-0 flex items-center justify-center"
                    >
                      {isQueryingSri ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-gray-400">Razón Social / Nombre Completo</label>
                <input 
                  type="text" 
                  required 
                  value={quickAddFormData.name} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, name: e.target.value})} 
                  className="w-full text-xs px-2.5 py-2.5 rounded-xl outline-none bg-black border border-white/10 text-white" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-400">Teléfono</label>
                  <input 
                    type="text" 
                    value={quickAddFormData.telefono || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, telefono: e.target.value})} 
                    className="w-full text-xs px-2.5 py-2.5 rounded-xl outline-none bg-black border border-white/10 text-white" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-400">Contribuyente</label>
                  <select 
                    value={quickAddFormData.tipoContribuyente} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, tipoContribuyente: e.target.value})} 
                    className="w-full text-xs px-2.5 py-2.5 rounded-xl outline-none bg-black border border-white/10 text-white"
                  >
                    <option value="general">Régimen General</option>
                    <option value="rimpe_popular">RIMPE Popular</option>
                    <option value="rimpe_emprendedor">RIMPE Emprendedor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-gray-400">Dirección Domicilio</label>
                <input 
                  type="text" 
                  value={quickAddFormData.direccion || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, direccion: e.target.value})} 
                  className="w-full text-xs px-2.5 py-2.5 rounded-xl outline-none bg-black border border-white/10 text-white" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-gray-400">Correo Notificación</label>
                <input 
                  type="email" 
                  value={quickAddFormData.email || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, email: e.target.value})} 
                  className="w-full text-xs px-2.5 py-2.5 rounded-xl outline-none bg-black border border-white/10 text-white" 
                />
              </div>

              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setIsQuickAddOpen(false)} className="px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-white/5">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white">Guardar y Seleccionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
