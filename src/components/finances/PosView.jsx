import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, Sparkles, CheckCircle2, DollarSign, X, ShieldAlert, Award, Layers, Tag, Bookmark, RefreshCw, LogOut, ArrowRight, ArrowLeft, ChevronRight, Settings, Barcode, Zap, Eye, Mic, Keyboard, History, Download, FileText } from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { consultarRucSri } from '../../services/sriService';

function sanitizeData(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }
  if (typeof obj === 'object') {
    const clean = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val === undefined) {
          clean[key] = '';
        } else {
          clean[key] = sanitizeData(val);
        }
      }
    }
    return clean;
  }
  return obj;
}

export default function PosView({ products, thirdParties, transactions = [], isDarkMode, showToast, db, appId, onCheckout, onClose }) {
  // Configuración de visualización del POS (persistente en localStorage)
  const [posConfig, setPosConfig] = useState(() => {
    const saved = localStorage.getItem(`pos_config_${appId}`);
    const def = {
      viewType: 'grid', // 'grid' | 'list'
      showCarousel: false, // true = carrusel horizontal de categorías, false = filtros dropdowns
      cartPosition: 'right', // 'right' | 'left'
      gridColumns: 4, // 2 | 3 | 4 | 5
      barcodeMode: false, // Lector de código de barras
      expressCheckout: false, // Checkout exprés (un solo paso)
      showStock: true, // true = mostrar stock, false = ocultar
    };
    return saved ? { ...def, ...JSON.parse(saved) } : def;
  });

  useEffect(() => {
    if (appId) {
      localStorage.setItem(`pos_config_${appId}`, JSON.stringify(posConfig));
    }
  }, [posConfig, appId]);

  const getGridColsClass = () => {
    switch (posConfig.gridColumns) {
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case 5: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5';
      case 4:
      default: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const code = searchTerm.trim();
      if (!code) return;
      
      const matched = products.find(p => 
        String(p.sku).toLowerCase() === code.toLowerCase() || 
        String(p.codigoBarras || '').toLowerCase() === code.toLowerCase()
      );
      
      if (matched) {
        e.preventDefault();
        addToCart(matched);
        setSearchTerm('');
        showToast(`Agregado: ${matched.name}`, 'success');
        
        if (posConfig.barcodeMode) {
          try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.frequency.value = 1200;
            gain.gain.setValueAtTime(0.08, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.08);
            osc.start();
            osc.stop(context.currentTime + 0.08);
          } catch (audioErr) {
            // ignore
          }
        }
      }
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("La búsqueda por voz no es compatible con este navegador.", "error");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-EC';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsListening(true);
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } catch (err) {
        // ignore
      }
    };
    
    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setSearchTerm(speechToText);
      showToast(`Buscando: "${speechToText}"`, "success");
    };
    
    recognition.onerror = (err) => {
      console.error(err);
      showToast("No se pudo reconocer la voz. Intente de nuevo.", "error");
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  // Auto focus en Modo Lector de Código de Barras
  useEffect(() => {
    if (posConfig.barcodeMode) {
      const interval = setInterval(() => {
        const active = document.activeElement;
        if (isCheckoutOpen || isQuickAddOpen || isClosingOpen) return;
        if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) && active.id !== 'pos-search-input') {
          return;
        }
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput && document.activeElement !== searchInput) {
          searchInput.focus();
        }
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [posConfig.barcodeMode, isCheckoutOpen, isQuickAddOpen, isClosingOpen]);

  // Atajos de teclado del POS
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag);

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsShortcutsOpen(false);
        setIsHistoryOpen(false);
        setIsCheckoutOpen(false);
        setIsQuickAddOpen(false);
        setIsClosingOpen(false);
      }

      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) searchInput.focus();
      }

      if (isInputActive && e.key !== 'F2' && e.key !== 'F12' && e.key !== 'Escape') {
        if (e.key === 'F12') {
          e.preventDefault();
          if (cart.length > 0) {
            setPayments({
              efectivo: 0, transferencia: 0, tarjeta: 0, cruce_cuentas: 0,
              transferenciaRef: '', tarjetaRef: '', cruceRef: ''
            });
            setCheckoutStep(1);
            setIsCheckoutOpen(true);
          } else {
            showToast("El carrito está vacío", "error");
          }
        }
        return;
      }

      if (e.key === 'F8') {
        e.preventDefault();
        suspendSale();
      }

      if (e.key === 'F9') {
        e.preventDefault();
        resumeSale();
      }

      if (e.key === 'F12' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0) {
          setPayments({
            efectivo: 0, transferencia: 0, tarjeta: 0, cruce_cuentas: 0,
            transferenciaRef: '', tarjetaRef: '', cruceRef: ''
          });
          setCheckoutStep(1);
          setIsCheckoutOpen(true);
        } else {
          showToast("El carrito está vacío", "error");
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [cart, totalToPay]);

  // Auto consulta de SRI al rellenar cédula/RUC en agregar cliente
  useEffect(() => {
    if (!isQuickAddOpen) return;
    const rucVal = quickAddFormData.ruc.trim();
    const type = quickAddFormData.tipoIdentificacion;
    const shouldQuery = (type === 'cedula' && rucVal.length === 10) || 
                        (type === 'ruc' && rucVal.length === 13);
                        
    if (shouldQuery && !isQueryingSri) {
      const autoQuery = async () => {
        setIsQueryingSri(true);
        try {
          const result = await consultarRucSri(rucVal);
          setQuickAddFormData(prev => ({
            ...prev,
            name: result.name,
            tipoIdentificacion: result.tipoIdentificacion,
            direccion: result.direccion,
            telefono: result.telefono,
            email: result.email || prev.email,
            tipoContribuyente: result.tipoContribuyente || 'general'
          }));
          showToast("Datos cargados del SRI automáticamente", "success");
        } catch (e) {
          // ignore
        } finally {
          setIsQueryingSri(false);
        }
      };
      autoQuery();
    }
  }, [quickAddFormData.ruc, quickAddFormData.tipoIdentificacion, isQuickAddOpen]);

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

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
    }, (err) => {
      console.error("Error subscribing to cash sessions:", err);
      setActiveSession(null);
      setSessionLoading(false);
    });
    return unsub;
  }, [appId, db]);

  // Manejar apertura de caja
  const handleOpenSession = async (e) => {
    e.preventDefault();
    try {
      const sessionId = `session_${new Date().getTime()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_cash_sessions', sessionId), sanitizeData({
        id: sessionId,
        responsible: openingForm.responsible,
        initialAmount: Number(openingForm.initialAmount) || 0,
        branch: openingForm.branch,
        shift: openingForm.shift,
        notes: openingForm.notes,
        status: 'abierta',
        openedAt: new Date().toISOString()
      }));
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
      
      const cashTotal = txs.filter(t => t.paymentMethod === 'efectivo' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const cardTotal = txs.filter(t => t.paymentMethod === 'tarjeta' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const transTotal = txs.filter(t => t.paymentMethod === 'transferencia' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const cruceTotal = txs.filter(t => t.paymentMethod === 'cruce_cuentas' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0);
      
      const initialAmt = Number(activeSession.initialAmount || 0);
      setClosingForm({
        efectivoReal: (initialAmt + cashTotal).toFixed(2),
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
      const cashTotal = sessionTxs.filter(t => t.paymentMethod === 'efectivo' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const cardTotal = sessionTxs.filter(t => t.paymentMethod === 'tarjeta' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const transTotal = sessionTxs.filter(t => t.paymentMethod === 'transferencia' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0);
      const cruceTotal = sessionTxs.filter(t => t.paymentMethod === 'cruce_cuentas' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0);

      const initialAmt = Number(activeSession.initialAmount || 0);
      const expectedCash = initialAmt + cashTotal;
      const diffCash = (Number(closingForm.efectivoReal) || 0) - expectedCash;
      const diffCard = (Number(closingForm.tarjetaReal) || 0) - cardTotal;
      const diffTrans = (Number(closingForm.transferenciaReal) || 0) - transTotal;
      const diffCruce = (Number(closingForm.cruceReal) || 0) - cruceTotal;
      const totalDifference = diffCash + diffCard + diffTrans + diffCruce;

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_cash_sessions', activeSession.id), sanitizeData({
        status: 'cerrada',
        closedAt: new Date().toISOString(),
        expectedTotals: {
          efectivo: expectedCash,
          tarjeta: cardTotal,
          transferencia: transTotal,
          cruce_cuentas: cruceTotal
        },
        reconciliation: {
          efectivo: Number(closingForm.efectivoReal) || 0,
          tarjeta: Number(closingForm.tarjetaReal) || 0,
          transferencia: Number(closingForm.transferenciaReal) || 0,
          cruce_cuentas: Number(closingForm.cruceReal) || 0
        },
        differences: {
          efectivo: diffCash,
          tarjeta: diffCard,
          transferencia: diffTrans,
          cruce_cuentas: diffCruce,
          total: totalDifference
        },
        closingNotes: closingForm.notes
      }), { merge: true });

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
        price: Number(product.price) || 0,
        quantity: 1,
        ivaCategory: product.ivaCategory !== undefined ? Number(product.ivaCategory) : 15
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
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
  const getSubtotal = () => cart.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
  const getDiscountAmount = () => {
    const sub = getSubtotal();
    if (discountType === 'percent') {
      return sub * (Number(discountValue || 0) / 100);
    }
    return Math.min(sub, Number(discountValue || 0));
  };
  const getSubtotalWithDiscount = () => Math.max(0, getSubtotal() - getDiscountAmount());
  
  const getIva = () => {
    const sub = getSubtotal();
    if (sub === 0) return 0;
    const ratio = getSubtotalWithDiscount() / sub;
    return cart.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0) * ratio * ((Number(item.ivaCategory !== undefined ? item.ivaCategory : 15)) / 100)), 0);
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
      const found = thirdParties.find(tp => tp.id === selectedClientId);
      if (found) return found;
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
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', clientDocId), sanitizeData({
            id: clientDocId,
            ...client,
            updatedAt: new Date().toISOString()
          }));
        }
      }

      // Decrementar stock
      for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (prod && prod.type === 'producto') {
          const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', item.productId);
          const nextStock = Math.max(0, (Number(prod.stock) || 0) - Number(item.quantity || 0));
          await setDoc(productRef, sanitizeData({ stock: nextStock }), { merge: true });
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
        thirdParty: client,
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

      onCheckout(sanitizeData(invoiceData));
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
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', docId), sanitizeData({
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
      }));
      setSelectedClientId(docId);
      setIsQuickAddOpen(false);
      showToast("Cliente agregado y seleccionado", "success");
    } catch (err) {
      showToast("Error al registrar cliente", "error");
    }
  };

  const handleVoidTransaction = async (tx) => {
    if (!window.confirm(`¿Estás seguro de que deseas ANULAR este comprobante (${tx.id})? Esto restaurará el stock de los productos.`)) {
      return;
    }
    try {
      if (tx.items && Array.isArray(tx.items)) {
        for (const item of tx.items) {
          const prod = products.find(p => p.id === item.productId);
          if (prod && prod.type === 'producto') {
            const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', item.productId);
            const currentStock = Number(prod.stock) || 0;
            const itemQty = Number(item.quantity) || 0;
            await setDoc(productRef, sanitizeData({ 
              stock: currentStock + itemQty 
            }), { merge: true });
          }
        }
      }
      
      const txRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', tx.id);
      await setDoc(txRef, sanitizeData({
        sriStatus: 'anulado',
        updatedAt: new Date().toISOString()
      }), { merge: true });
      
      showToast("Comprobante anulado y stock restaurado con éxito", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al anular el comprobante", "error");
    }
  };

  // Filtrado de Productos (Izquierda)
  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    return createPortal(
      <div className={`fixed inset-0 z-[100] ${isDarkMode ? 'bg-[#08080a] text-white' : 'bg-[#f3f8ff] text-[#000000]'} flex items-center justify-center p-4 backdrop-blur-xl transition-colors duration-300`}>
        {/* Decorative background blobs */}
        <div className={`absolute top-[-10%] left-[-5%] w-[30rem] h-[30rem] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none ${isDarkMode ? 'bg-emerald-900' : 'bg-emerald-300'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-5%] w-[30rem] h-[30rem] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none ${isDarkMode ? 'bg-orange-900' : 'bg-orange-300'}`}></div>

        <div className={`w-full max-w-md p-8 rounded-[2.5rem] border shadow-[0_20px_50px_rgba(0,0,0,0.3)] space-y-6 transition-all duration-300 ${isDarkMode ? 'glass-panel-dark text-white' : 'bg-white text-[#000000] border-blue-100'}`}>
          <div className="text-center space-y-2">
            <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center border animate-pulse-glow ${isDarkMode ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-emerald-50 text-emerald-600 border-emerald-250 shadow-sm'}`}>
              <DollarSign size={26} />
            </div>
            <h2 className={`text-xl font-bold font-display tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>Apertura de Caja POS</h2>
            <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-black font-semibold'}`}>Es necesario ingresar el fondo inicial para habilitar la caja registradora.</p>
          </div>

          <form onSubmit={handleOpenSession} className="space-y-4">
            <div>
              <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Responsable / Cajero</label>
              <input type="text" required value={openingForm.responsible} onChange={e => setOpeningForm({...openingForm, responsible: e.target.value})} className={`w-full text-xs px-3.5 py-3 rounded-xl outline-none transition-all border ${isDarkMode ? 'glass-input-dark' : 'glass-input-light'}`} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Sucursal</label>
                <input type="text" required value={openingForm.branch} onChange={e => setOpeningForm({...openingForm, branch: e.target.value})} className={`w-full text-xs px-3.5 py-3 rounded-xl outline-none transition-all border ${isDarkMode ? 'glass-input-dark' : 'glass-input-light'}`} />
              </div>
              <div>
                <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Turno</label>
                <select value={openingForm.shift} onChange={e => setOpeningForm({...openingForm, shift: e.target.value})} className={`w-full text-xs px-3.5 py-3 rounded-xl outline-none transition-all border cursor-pointer ${isDarkMode ? 'glass-input-dark' : 'glass-input-light'}`}>
                  <option value="Mañana" className="text-black bg-white">Mañana</option>
                  <option value="Tarde" className="text-black bg-white">Tarde</option>
                  <option value="Noche" className="text-black bg-white">Noche</option>
                </select>
              </div>
            </div>

            <div>
              <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Fondo Inicial ($ USD)</label>
              <input type="number" required step="0.01" value={openingForm.initialAmount} onChange={e => setOpeningForm({...openingForm, initialAmount: e.target.value})} className={`w-full text-xs px-3.5 py-3 rounded-xl outline-none transition-all border ${isDarkMode ? 'glass-input-dark' : 'glass-input-light'}`} />
            </div>

            <div>
              <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Observaciones de Entrada</label>
              <textarea value={openingForm.notes} onChange={e => setOpeningForm({...openingForm, notes: e.target.value})} className={`w-full text-xs px-3.5 py-3 rounded-2xl outline-none transition-all border min-h-[70px] resize-none ${isDarkMode ? 'glass-input-dark' : 'glass-input-light'}`} placeholder="Sin novedades..." />
            </div>

            <button type="submit" className="w-full py-3.5 mt-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 hover-lift bg-gradient-to-r from-emerald-650 to-teal-650 text-white shadow-md hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/30">
              Abrir Caja y Activar POS
            </button>
          </form>
        </div>
      </div>,
      document.body
    );
  }

  // PANTALLA 2: POS PRINCIPAL EN PANTALLA COMPLETA
  return createPortal(
    <div className={`fixed inset-0 z-[100] ${isDarkMode ? 'bg-[#0c0c0e] text-white' : 'bg-[#f3f8ff] text-[#000000]'} flex flex-col overflow-hidden animate-in fade-in duration-300`}>
      
      {/* TOP HEADER POS */}
      <div className={`h-16 px-6 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'bg-[#121214]/80 border-white/5 text-white' : 'bg-white border-blue-100 text-[#000000] shadow-sm'} backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/10">
            <ShoppingCart size={18} />
          </div>
          <div>
            <h1 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-black'}`}>Caja POS: {activeSession.branch}</h1>
            <p className={`text-[9px] font-mono mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-black font-semibold'}`}>Sesión: {activeSession.responsible} ({activeSession.shift}) | Fondo: ${Number(activeSession.initialAmount || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasSuspendedSale && (
            <button onClick={resumeSale} className={`px-3.5 py-1.5 rounded-xl border font-bold text-[10px] uppercase ${isDarkMode ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : 'border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>
              Recuperar Venta
            </button>
          )}
          <button 
            onClick={() => setIsShortcutsOpen(true)} 
            className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-white/5 text-gray-405 hover:text-white hover:bg-white/10' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700'}`}
            title="Ver Atajos de Teclado (Guía Visual)"
          >
            <Keyboard size={16} />
          </button>
          <button 
            onClick={() => setIsHistoryOpen(true)} 
            className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-white/5 text-gray-405 hover:text-white hover:bg-white/10' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700'}`}
            title="Ver Ventas Emitidas en esta Sesión"
          >
            <History size={16} />
          </button>
          <button onClick={handleOpenCloseModal} className={`px-3.5 py-1.5 rounded-xl border font-bold text-[10px] uppercase ${isDarkMode ? 'border-red-500/25 bg-red-600/10 text-red-400 hover:bg-red-600/20' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}>
            Arqueo / Cerrar Caja
          </button>
          <button 
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                window.location.reload();
              }
            }} 
            className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-blue-50/80 text-blue-600 hover:bg-blue-100'}`} 
            title="Volver al ERP / Cerrar POS"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* POS WORKSPACE CONTAINER */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* POS MAIN AREA (PRODUCTS + CART) */}
        <div className={`flex-1 flex overflow-hidden min-h-0 ${posConfig.cartPosition === 'left' ? 'flex-row-reverse' : ''}`}>
        
        {/* LADO IZQUIERDO: SELECCIÓN Y FILTRO DE PRODUCTOS */}
        <div className={`flex-1 flex flex-col p-6 min-w-0 border-r ${isDarkMode ? 'border-white/5 bg-[#0f0f11]/60' : 'border-blue-100 bg-white'}`}>
          
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="space-y-3.5 mb-6">
            {posConfig.showCarousel ? (
              <div className="space-y-3">
                {/* Search Box */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-white/5 bg-black/45' : 'border-blue-150 bg-blue-50/30'}`}>
                  <Search size={14} className={isDarkMode ? 'text-gray-500' : 'text-blue-600'} />
                  <input 
                    type="text" 
                    id="pos-search-input"
                    placeholder="Buscar por Nombre, SKU o Código..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className={`bg-transparent border-none outline-none text-xs w-full focus:ring-0 ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-black placeholder-gray-400 font-bold'}`}
                  />
                  <button 
                    type="button" 
                    onClick={startVoiceSearch} 
                    className={`p-1 rounded-lg transition-all ${isListening ? 'text-red-500 animate-pulse bg-red-500/10' : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-blue-600 hover:bg-blue-50')}`}
                    title="Buscar por dictado de voz"
                  >
                    <Mic size={14} />
                  </button>
                  {searchTerm && <button onClick={() => setSearchTerm('')}><X size={12} className={isDarkMode ? 'text-gray-500' : 'text-blue-600'} /></button>}
                </div>

                {/* Horizontal Category Carousel */}
                <div className="flex items-center gap-2 overflow-x-auto py-2.5 custom-scrollbar scrollbar-none">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap shrink-0 border shadow-sm ${
                      filterCategory === 'all'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : (isDarkMode ? 'bg-black/40 border-white/5 text-gray-455 hover:text-white' : 'bg-blue-50/50 border-blue-100 text-black hover:bg-blue-100/50')
                    }`}
                  >
                    Todos
                  </button>
                  {categories.filter(c => c !== 'all').map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap shrink-0 border shadow-sm ${
                        filterCategory === cat
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : (isDarkMode ? 'bg-black/40 border-white/5 text-gray-455 hover:text-white' : 'bg-blue-50/50 border-blue-100 text-black hover:bg-blue-100/50')
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Search Box */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-white/5 bg-black/45' : 'border-blue-150 bg-blue-50/30'}`}>
                  <Search size={14} className={isDarkMode ? 'text-gray-500' : 'text-blue-600'} />
                  <input 
                    type="text" 
                    id="pos-search-input"
                    placeholder="Buscar por Nombre, SKU o Código de Barras..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className={`bg-transparent border-none outline-none text-xs w-full focus:ring-0 ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-black placeholder-gray-400 font-bold'}`}
                  />
                  <button 
                    type="button" 
                    onClick={startVoiceSearch} 
                    className={`p-1 rounded-lg transition-all ${isListening ? 'text-red-500 animate-pulse bg-red-500/10' : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-blue-600 hover:bg-blue-50')}`}
                    title="Buscar por dictado de voz"
                  >
                    <Mic size={14} />
                  </button>
                  {searchTerm && <button onClick={() => setSearchTerm('')}><X size={12} className={isDarkMode ? 'text-gray-500' : 'text-blue-600'} /></button>}
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className={`block text-[8px] font-extrabold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>Categoría</label>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={`w-full text-[10px] font-bold px-2 py-2 rounded-xl border outline-none ${isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-white border-blue-100 text-black'}`}>
                      <option value="all" className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>Categorías (Todos)</option>
                      {categories.filter(c => c !== 'all').map(c => <option key={c} value={c} className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[8px] font-extrabold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>Marca</label>
                    <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className={`w-full text-[10px] font-bold px-2 py-2 rounded-xl border outline-none ${isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-white border-blue-100 text-black'}`}>
                      <option value="all" className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>Marcas (Todos)</option>
                      {brands.filter(b => b !== 'all').map(b => <option key={b} value={b} className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>{b}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[8px] font-extrabold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>Bodega / Almacén</label>
                    <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)} className={`w-full text-[10px] font-bold px-2 py-2 rounded-xl border outline-none ${isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-white border-blue-100 text-black'}`}>
                      <option value="all" className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>Bodegas (Todos)</option>
                      {warehouses.filter(w => w !== 'all').map(w => <option key={w} value={w} className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>{w}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[8px] font-extrabold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>Filtro Stock</label>
                    <select value={filterStock} onChange={e => setFilterStock(e.target.value)} className={`w-full text-[10px] font-bold px-2 py-2 rounded-xl border outline-none ${isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-white border-blue-100 text-black'}`}>
                      <option value="all" className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>Inventario completo</option>
                      <option value="instock" className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>Solo disponibles (Con Stock)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GRID O LISTA DE PRODUCTOS */}
          {posConfig.viewType === 'list' ? (
            /* LIST LAYOUT */
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 p-1 custom-scrollbar">
              {filteredProducts.map(p => {
                const isOutOfStock = p.type === 'producto' && p.stock <= 0;
                return (
                  <div 
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-3 border rounded-2xl flex items-center justify-between gap-4 transition-all cursor-pointer select-none group relative overflow-hidden ${
                      isOutOfStock 
                        ? 'opacity-40 cursor-not-allowed bg-white/[0.005]' 
                        : (isDarkMode ? 'border-white/5 hover:border-blue-500/30 hover:bg-white/[0.02] bg-white/[0.01]' : 'border-blue-100 hover:border-blue-300 hover:bg-blue-50/20 bg-blue-50/5')
                    }`}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        p.type === 'producto' 
                          ? (isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-650') 
                          : (isDarkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-650')
                      }`}>
                        <ShoppingCart size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-gray-500 shrink-0">{p.sku}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${p.type === 'producto' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{p.type}</span>
                        </div>
                        <h4 className={`text-xs font-bold leading-snug truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>{p.name}</h4>
                        <p className="text-[9px] text-gray-500 truncate">{p.marca || 'Sin Marca'} | {p.categoria || 'General'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {posConfig.showStock && p.type === 'producto' && (() => {
                        const minStk = p.minStock !== undefined ? Number(p.minStock) : 2;
                        const isCritical = p.stock <= minStk;
                        return (
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            isCritical 
                              ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse font-black shadow-sm' 
                              : (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-250 text-emerald-700')
                          }`}>
                            {p.bodega || 'Central'}: {p.stock}
                          </span>
                        );
                      })()}
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-black block ${isDarkMode ? 'text-white' : 'text-black'}`}>${Number(p.price).toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                        }}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isOutOfStock 
                            ? 'bg-transparent text-gray-400 border-gray-400/20' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 hover:scale-105'
                        }`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-gray-505">
                  <ShoppingCart size={40} className="opacity-30 mb-2" />
                  <p className="text-xs italic">No hay productos que coincidan con los filtros.</p>
                </div>
              )}
            </div>
          ) : (
            /* GRID LAYOUT */
            <div className={`flex-1 overflow-y-auto grid ${getGridColsClass()} gap-3 p-1 custom-scrollbar`}>
              {filteredProducts.map(p => {
                const isOutOfStock = p.type === 'producto' && p.stock <= 0;
                return (
                  <div 
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-3.5 border rounded-2xl flex flex-col justify-between transition-all cursor-pointer select-none group relative overflow-hidden ${
                      isOutOfStock 
                        ? 'opacity-40 cursor-not-allowed bg-white/[0.005] border-white/5' 
                        : (isDarkMode 
                            ? 'border-white/5 hover:border-blue-500/30 hover:bg-white/[0.02] bg-white/[0.01] hover:-translate-y-0.5' 
                            : 'border-blue-100 hover:border-blue-300 hover:bg-blue-50/20 bg-blue-50/5 hover:-translate-y-0.5')
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-center gap-1">
                        <span className="font-mono text-[9px] text-gray-500 truncate">{p.sku}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${p.type === 'producto' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{p.type}</span>
                      </div>
                      <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>{p.name}</h4>
                      <p className="text-[9px] text-gray-500 truncate">{p.marca || 'Sin Marca'} | {p.categoria || 'General'}</p>
                    </div>

                    <div className={`flex justify-between items-center mt-3 pt-3 border-t ${isDarkMode ? 'border-white/5' : 'border-blue-100/50'}`}>
                      <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>${Number(p.price).toFixed(2)}</span>
                      {posConfig.showStock && p.type === 'producto' && (() => {
                        const minStk = p.minStock !== undefined ? Number(p.minStock) : 2;
                        const isCritical = p.stock <= minStk;
                        return (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                            isCritical 
                              ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse font-black shadow-sm' 
                              : (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-250 text-emerald-700')
                          }`}>
                            {p.bodega || 'Central'}: {p.stock}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-24 text-gray-505">
                  <ShoppingCart size={40} className="opacity-30 mb-2" />
                  <p className="text-xs italic">No hay productos que coincidan con los filtros.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* LADO DERECHO: DETALLE DEL PEDIDO (CHECKOUT FIJO) */}
        <div className={`w-72 sm:w-80 flex flex-col shrink-0 border-l ${isDarkMode ? 'border-white/5 bg-[#121214]/65' : 'border-blue-100 bg-[#f8faff]'}`}>
          
          {/* CLIENTE SELECTOR */}
          <div className={`p-4 border-b flex items-center justify-between gap-2.5 shrink-0 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/30'}`}>
            <div className="flex-1">
              <label className={`block text-[8px] font-extrabold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>Cliente Receptor</label>
              <select 
                value={selectedClientId} 
                onChange={e => setSelectedClientId(e.target.value)} 
                className={`w-full text-xs font-semibold px-2 py-2 outline-none rounded-xl border ${isDarkMode ? 'border-white/5 bg-black/40 text-white' : 'border-blue-100 bg-white text-black'}`}
              >
                <option value="" className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>Consumidor Final (9999999999999)</option>
                {thirdParties.filter(tp => tp.type === 'cliente').map(tp => (
                  <option key={tp.id} value={tp.id} className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>{tp.name} - RUC: {tp.ruc}</option>
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
              className="mt-4 p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shrink-0 hover:scale-105 active:scale-95 shadow-sm"
              title="Registrar Cliente Nuevo"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* LISTA CARRITO POS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.map((item, idx) => (
              <div key={idx} className={`p-3 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-blue-100/70 shadow-sm'}`}>
                <div className="flex justify-between items-start gap-1">
                  <span className={`text-xs font-bold line-clamp-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>{item.name}</span>
                  <button type="button" onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-500 opacity-80 hover:opacity-100"><Trash2 size={12}/></button>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <span className={isDarkMode ? 'text-gray-500' : 'text-black font-semibold'}>${Number(item.price).toFixed(2)} c/u</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQuantity(item.productId, -1)} className={`p-0.5 rounded ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'}`}><Minus size={10}/></button>
                    <span className={`font-bold w-4 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.productId, 1)} className={`p-0.5 rounded ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'}`}><Plus size={10}/></button>
                    <span className={`font-black w-14 text-right ${isDarkMode ? 'text-white' : 'text-blue-700'}`}>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-16">
                <ShoppingCart size={36} className="opacity-20 mb-2 animate-pulse text-blue-500" />
                <p className="text-xs italic">Carrito de Venta Vacío</p>
              </div>
            )}
          </div>

          {/* ACCIONES Y TOTALES */}
          <div className={`p-4 border-t space-y-4 shrink-0 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/20'}`}>
            {/* DESCUENTO CARD */}
            {isDiscountOpen ? (
              <div className={`p-3 rounded-xl border space-y-2 ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-blue-100 bg-white shadow-sm'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>DESCUENTO GENERAL</span>
                  <button onClick={() => { setIsDiscountOpen(false); setDiscountValue(0); }} className="text-gray-500 hover:text-black"><X size={10} /></button>
                </div>
                <div className="flex gap-1">
                  <select value={discountType} onChange={e => setDiscountType(e.target.value)} className={`text-[10px] px-2 py-1.5 rounded-lg border outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-blue-150 text-black'}`}>
                    <option value="percent">% Porcentaje</option>
                    <option value="fixed">$ Fijo (USD)</option>
                  </select>
                  <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className={`w-full text-xs px-2 py-1.5 rounded-lg border outline-none ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-blue-150 text-black'}`} placeholder="0" />
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsDiscountOpen(true)} className={`flex-1 py-1.5 rounded-xl border font-bold text-[9px] uppercase transition-all ${isDarkMode ? 'border-white/5 hover:bg-white/5 text-gray-400' : 'border-blue-100 hover:bg-blue-100/50 bg-white text-black shadow-sm'}`}>
                  <Tag size={10} className="inline mr-1 text-blue-500" /> Descuento
                </button>
                <button onClick={suspendSale} className={`flex-1 py-1.5 rounded-xl border font-bold text-[9px] uppercase transition-all ${isDarkMode ? 'border-white/5 hover:bg-white/5 text-gray-400' : 'border-blue-100 hover:bg-blue-100/50 bg-white text-black shadow-sm'}`}>
                  <Bookmark size={10} className="inline mr-1 text-blue-500" /> Suspender
                </button>
                <button onClick={() => setCart([])} className={`flex-1 py-1.5 rounded-xl border font-bold text-[9px] uppercase transition-all ${isDarkMode ? 'border-white/5 hover:bg-white/5 text-red-400' : 'border-red-100 hover:bg-red-50 bg-white text-red-650 shadow-sm'}`}>
                  <Trash2 size={10} className="inline mr-1 text-red-500" /> Vaciar
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div className={`flex justify-between ${isDarkMode ? 'text-gray-450' : 'text-black font-medium'}`}>
                <span>Subtotal Neto</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              {getDiscountAmount() > 0 && (
                <div className="flex justify-between text-red-500 font-bold">
                  <span>Descuento Aplicado</span>
                  <span>-${getDiscountAmount().toFixed(2)}</span>
                </div>
              )}
              <div className={`flex justify-between ${isDarkMode ? 'text-gray-450' : 'text-black font-medium'}`}>
                <span>IVA (15%)</span>
                <span>${getIva().toFixed(2)}</span>
              </div>
              <div className={`flex justify-between font-black text-sm pt-2 border-t ${isDarkMode ? 'border-white/5 text-white' : 'border-blue-100 text-black'}`}>
                <span>TOTAL NETO</span>
                <span className={isDarkMode ? 'text-white' : 'text-blue-700'}>${getTotal().toFixed(2)}</span>
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

        {/* SIDEBAR DE CONFIGURACIÓN DEL POS (ALWAYS RIGHT) */}
        <div className={`w-64 flex flex-col shrink-0 border-l ${isDarkMode ? 'bg-[#0f0f11] border-white/10 text-white' : 'bg-[#f3f8ff] border-blue-100 text-[#000000]'}`}>
          <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-center gap-2">
              <Settings size={16} className={isDarkMode ? 'text-blue-500' : 'text-[#000000]'} />
              <h3 className="text-[10px] font-black uppercase tracking-wider">Gestión del POS</h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div className="space-y-2">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">Diseño de Productos</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, viewType: 'grid' }))}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${posConfig.viewType === 'grid' ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : (isDarkMode ? 'bg-black/20 border-white/5 text-gray-400 hover:text-white' : 'bg-white border-blue-100 text-[#000000] hover:bg-blue-50')}`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, viewType: 'list' }))}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${posConfig.viewType === 'list' ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : (isDarkMode ? 'bg-black/20 border-white/5 text-gray-400 hover:text-white' : 'bg-white border-blue-100 text-[#000000] hover:bg-blue-50')}`}
                >
                  Lista
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">Filtros</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, showCarousel: false }))}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${!posConfig.showCarousel ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : (isDarkMode ? 'bg-black/20 border-white/5 text-gray-400 hover:text-white' : 'bg-white border-blue-100 text-[#000000] hover:bg-blue-50')}`}
                >
                  Normales
                </button>
                <button
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, showCarousel: true }))}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${posConfig.showCarousel ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : (isDarkMode ? 'bg-black/20 border-white/5 text-gray-400 hover:text-white' : 'bg-white border-blue-100 text-[#000000] hover:bg-blue-50')}`}
                >
                  Carrusel
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">Posición Detalle</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, cartPosition: 'left' }))}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${posConfig.cartPosition === 'left' ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : (isDarkMode ? 'bg-black/20 border-white/5 text-gray-400 hover:text-white' : 'bg-white border-blue-100 text-[#000000] hover:bg-blue-50')}`}
                >
                  Izquierda
                </button>
                <button
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, cartPosition: 'right' }))}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${posConfig.cartPosition === 'right' ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : (isDarkMode ? 'bg-black/20 border-white/5 text-gray-400 hover:text-white' : 'bg-white border-blue-100 text-[#000000] hover:bg-blue-50')}`}
                >
                  Derecha
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">Buscador y Lector</label>
              <button
                type="button"
                onClick={() => setPosConfig(prev => ({ ...prev, barcodeMode: !prev.barcodeMode }))}
                className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-between ${
                  posConfig.barcodeMode
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : (isDarkMode ? 'bg-black/20 border-white/5 text-gray-450 hover:text-white' : 'bg-blue-50/30 border-blue-100 text-[#000000] hover:bg-blue-50')
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Barcode size={13} /> Modo Lector
                </span>
                <span className="text-[9px] font-extrabold">{posConfig.barcodeMode ? 'ACTIVO' : 'INACTIVO'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">Checkout Exprés</label>
              <button
                type="button"
                onClick={() => setPosConfig(prev => ({ ...prev, expressCheckout: !prev.expressCheckout }))}
                className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-between ${
                  posConfig.expressCheckout
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : (isDarkMode ? 'bg-black/20 border-white/5 text-gray-455 hover:text-white' : 'bg-blue-50/30 border-blue-100 text-[#000000] hover:bg-blue-50')
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Zap size={13} /> Checkout 1-Paso
                </span>
                <span className="text-[9px] font-extrabold">{posConfig.expressCheckout ? 'ACTIVO' : 'INACTIVO'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">Privacidad Stock</label>
              <button
                type="button"
                onClick={() => setPosConfig(prev => ({ ...prev, showStock: !prev.showStock }))}
                className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-between ${
                  posConfig.showStock
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : (isDarkMode ? 'bg-black/20 border-white/5 text-gray-455 hover:text-white' : 'bg-blue-50/30 border-blue-100 text-[#000000] hover:bg-blue-50')
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Eye size={13} /> Mostrar Stock
                </span>
                <span className="text-[9px] font-extrabold">{posConfig.showStock ? 'ACTIVO' : 'INACTIVO'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* APERTURA Y CIERRE DE CAJA DIALOG */}
      {isClosingOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all duration-300 ${
            isDarkMode ? 'bg-[#141416] border-white/10 text-white shadow-black/50' : 'bg-white border-blue-100 text-black shadow-blue-900/10'
          }`}>
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-red-500">
              <ShieldAlert size={16} /> Arqueo y Cierre de Caja
            </h3>
            <p className={`text-[10px] mb-4 leading-normal ${isDarkMode ? 'text-gray-500' : 'text-gray-900 font-bold'}`}>
              Verifica los montos acumulados por ventas en esta sesión y digita los valores reales contados.
            </p>

            <form onSubmit={handleCloseSession} className="space-y-4">
              <div className="space-y-2 text-xs">
                <div className={`grid grid-cols-2 gap-2 font-bold border-b pb-2 text-[9px] uppercase ${
                  isDarkMode ? 'text-gray-500 border-white/5' : 'text-black border-blue-100/50'
                }`}>
                  <span>Método de Pago</span>
                  <span className="text-right">Físico / Real</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Efectivo en Caja</p>
                    <p className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-900 font-bold'}`}>
                      Esperado: ${(Number(activeSession.initialAmount || 0) + sessionTxs.filter(t => t.paymentMethod === 'efectivo' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0)).toFixed(2)} (inc. Fondo)
                    </p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.efectivoReal} onChange={e => setClosingForm({...closingForm, efectivoReal: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} w-24 text-right px-2 py-1.5 rounded-lg border`} />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Tarjeta Débito/Crédito</p>
                    <p className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-900 font-bold'}`}>
                      Esperado: ${sessionTxs.filter(t => t.paymentMethod === 'tarjeta').reduce((acc, t) => acc + Number(t.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.tarjetaReal} onChange={e => setClosingForm({...closingForm, tarjetaReal: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} w-24 text-right px-2 py-1.5 rounded-lg border`} />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Transferencias</p>
                    <p className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-900 font-bold'}`}>
                      Esperado: ${sessionTxs.filter(t => t.paymentMethod === 'transferencia').reduce((acc, t) => acc + Number(t.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.transferenciaReal} onChange={e => setClosingForm({...closingForm, transferenciaReal: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} w-24 text-right px-2 py-1.5 rounded-lg border`} />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Cruce de Cuentas</p>
                    <p className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-900 font-bold'}`}>
                      Esperado: ${sessionTxs.filter(t => t.paymentMethod === 'cruce_cuentas').reduce((acc, t) => acc + Number(t.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.cruceReal} onChange={e => setClosingForm({...closingForm, cruceReal: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} w-24 text-right px-2 py-1.5 rounded-lg border`} />
                </div>
              </div>

              <div>
                <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Observaciones Arqueo</label>
                <textarea value={closingForm.notes} onChange={e => setClosingForm({...closingForm, notes: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} min-h-[50px] w-full px-2.5 py-2 rounded-xl border`} placeholder="Escribe discrepancias si las hay..." />
              </div>

              <div className={`flex justify-end gap-2.5 mt-6 pt-3 border-t ${isDarkMode ? 'border-white/5' : 'border-blue-100/55'}`}>
                <button type="button" onClick={() => setIsClosingOpen(false)} className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-blue-50/50 text-black'}`}>Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-500 text-white">Confirmar y Cerrar Caja</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT WIZARD MODAL (FULLSCREEN PASOS) */}
      {isCheckoutOpen && (
        <div className={`fixed inset-0 z-[110] flex flex-col overflow-hidden animate-in fade-in duration-200 ${
          isDarkMode ? 'bg-[#0c0c0e] text-white' : 'bg-[#f3f8ff] text-[#000000]'
        }`}>
          <div className="flex-1 flex flex-col overflow-hidden max-h-screen transition-all duration-300">
            
            {/* WIZARD PROGRESS HEADER */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'border-white/5 bg-black/20 text-white' : 'border-blue-100 bg-blue-50/30 text-black'
            }`}>
              <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={15} className="text-blue-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider">Checkout Comercial POS</h3>
                </div>
                {posConfig.expressCheckout ? (
                  <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                    ⚡ MODO EXPRÉS (PASO ÚNICO)
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <span className={checkoutStep === 1 ? 'text-blue-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}>1. Cliente</span>
                    <ChevronRight size={10} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                    <span className={checkoutStep === 2 ? 'text-blue-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}>2. Métodos de Pago</span>
                    <ChevronRight size={10} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                    <span className={checkoutStep === 3 ? 'text-blue-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}>3. Emisión</span>
                  </div>
                )}
                <button onClick={() => setIsCheckoutOpen(false)} className={isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-black'}><X size={15}/></button>
              </div>
            </div>

            {/* WIZARD CONTENT */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto w-full space-y-6">
              
              {posConfig.expressCheckout ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* COLUMNA IZQUIERDA: CLIENTE Y DETALLE */}
                  <div className="space-y-4">
                    {/* CLIENTE */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-blue-50/20 border-blue-100'}`}>
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-black'}`}>Cliente de la Venta</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <select 
                            value={selectedClientId} 
                            onChange={e => setSelectedClientId(e.target.value)} 
                            className={`w-full text-xs font-semibold px-3 py-2 outline-none rounded-xl border ${
                              isDarkMode ? 'border-white/10 bg-black text-white' : 'border-blue-150 bg-white text-black'
                            }`}
                          >
                            <option value="" className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>Consumidor Final (9999999999999)</option>
                            {thirdParties.filter(tp => tp.type === 'cliente').map(tp => (
                              <option key={tp.id} value={tp.id} className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>{tp.name} - RUC: {tp.ruc}</option>
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
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shrink-0 text-xs font-bold shadow-sm"
                        >
                          Crear
                        </button>
                      </div>
                    </div>

                    {/* DATOS CLIENTE */}
                    <div className={`p-4 rounded-2xl border space-y-2 ${
                      isDarkMode ? 'border-white/5 bg-black/10 text-gray-300' : 'border-blue-100 bg-blue-50/5 text-black'
                    }`}>
                      <p className={`font-bold ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Datos Facturación del Receptor:</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <p><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Razón Social:</span> {getSelectedClient().name}</p>
                        <p><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Identificación:</span> {getSelectedClient().ruc}</p>
                        <p><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Teléfono:</span> {getSelectedClient().telefono || '-'}</p>
                        <p><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Email:</span> {getSelectedClient().email || '-'}</p>
                        <p className="col-span-2"><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Dirección:</span> {getSelectedClient().direccion || '-'}</p>
                      </div>
                    </div>

                    {/* PREVISUALIZACION DETALLE */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDarkMode ? 'border-white/5 bg-black/10 text-gray-300' : 'border-blue-100 bg-blue-50/5 text-black'
                    }`}>
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-black'}`}>Ítems a Facturar</h4>
                      <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar text-[11px]">
                        {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="opacity-80">{item.quantity}x {item.name}</span>
                            <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className={`border-t pt-2 mt-2 flex justify-between font-black text-xs ${isDarkMode ? 'border-white/5 text-white' : 'border-blue-100 text-black'}`}>
                        <span>Subtotal: ${(getSubtotal() + getIva()).toFixed(2)}</span>
                        {getDiscountAmount() > 0 && <span className="text-red-500 font-bold">Desc: -${getDiscountAmount().toFixed(2)}</span>}
                        <span className={isDarkMode ? 'text-emerald-400' : 'text-blue-700'}>TOTAL: ${totalToPay.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: METODOS DE PAGO Y VUELTO */}
                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border flex justify-between items-center ${
                      isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                    }`}>
                      <span className="text-xs font-bold">TOTAL A COBRAR:</span>
                      <span className="text-lg font-black">${totalToPay.toFixed(2)}</span>
                    </div>

                    <div className="space-y-3">
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Medios de Pago (Admite Combinados)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Efectivo */}
                        <div className={`p-3 rounded-xl border space-y-1.5 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/10'}`}>
                          <label className="text-[11px] font-bold block">Efectivo ($)</label>
                          <input type="number" step="0.01" value={payments.efectivo || ''} onChange={e => setPayments({...payments, efectivo: e.target.value})} className={isDarkMode ? 'glass-input-dark px-2 py-1.5 w-full text-xs rounded-lg border' : 'glass-input-light px-2 py-1.5 w-full text-xs rounded-lg border'} placeholder="0.00" />
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {[10, 20, 50].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  const current = Number(payments.efectivo) || 0;
                                  setPayments({ ...payments, efectivo: (current + val).toFixed(2) });
                                }}
                                className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded border transition-colors ${
                                  isDarkMode ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-blue-100 bg-white text-blue-755 hover:bg-blue-50'
                                }`}
                              >
                                +{val}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const pending = Math.max(0, totalToPay - (Number(payments.tarjeta) || 0) - (Number(payments.transferencia) || 0) - (Number(payments.cruce_cuentas) || 0));
                                setPayments({ ...payments, efectivo: pending.toFixed(2) });
                              }}
                              className={`px-1.5 py-0.5 text-[8.5px] font-bold rounded border transition-colors ${
                                isDarkMode ? 'border-blue-500/20 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'border-blue-200 bg-blue-50 text-blue-755 hover:bg-blue-100'
                              }`}
                            >
                              Exacto
                            </button>
                          </div>
                        </div>

                        {/* Tarjeta */}
                        <div className={`p-3 rounded-xl border space-y-1.5 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/10'}`}>
                          <label className="text-[11px] font-bold block">Tarjeta ($)</label>
                          <input type="number" step="0.01" value={payments.tarjeta || ''} onChange={e => setPayments({...payments, tarjeta: e.target.value})} className={isDarkMode ? 'glass-input-dark px-2 py-1.5 w-full text-xs rounded-lg border' : 'glass-input-light px-2 py-1.5 w-full text-xs rounded-lg border'} placeholder="0.00" />
                          <input type="text" value={payments.tarjetaRef} onChange={e => setPayments({...payments, tarjetaRef: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} px-2 py-1 w-full text-[9px] rounded-lg border`} placeholder="Ref/Aut" />
                        </div>

                        {/* Transferencia */}
                        <div className={`p-3 rounded-xl border space-y-1.5 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/10'}`}>
                          <label className="text-[11px] font-bold block">Transferencia ($)</label>
                          <input type="number" step="0.01" value={payments.transferencia || ''} onChange={e => setPayments({...payments, transferencia: e.target.value})} className={isDarkMode ? 'glass-input-dark px-2 py-1.5 w-full text-xs rounded-lg border' : 'glass-input-light px-2 py-1.5 w-full text-xs rounded-lg border'} placeholder="0.00" />
                          <input type="text" value={payments.transferenciaRef} onChange={e => setPayments({...payments, transferenciaRef: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} px-2 py-1 w-full text-[9px] rounded-lg border`} placeholder="Nro Ref" />
                        </div>

                        {/* Cruce de Cuentas */}
                        <div className={`p-3 rounded-xl border space-y-1.5 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/10'}`}>
                          <label className="text-[11px] font-bold block">Cruce Cuentas ($)</label>
                          <input type="number" step="0.01" value={payments.cruce_cuentas || ''} onChange={e => setPayments({...payments, cruce_cuentas: e.target.value})} className={isDarkMode ? 'glass-input-dark px-2 py-1.5 w-full text-xs rounded-lg border' : 'glass-input-light px-2 py-1.5 w-full text-xs rounded-lg border'} placeholder="0.00" />
                          <input type="text" value={payments.cruceRef} onChange={e => setPayments({...payments, cruceRef: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} px-2 py-1 w-full text-[9px] rounded-lg border`} placeholder="Nro Doc" />
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl space-y-1 text-xs font-mono border ${isDarkMode ? 'bg-black/20 border-white/5 text-gray-300' : 'bg-blue-50/20 border-blue-100 text-black'}`}>
                      <div className="flex justify-between">
                        <span>Total Pagado:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>${paidTotal.toFixed(2)}</span>
                      </div>
                      {remainingDue > 0 ? (
                        <div className="flex justify-between text-yellow-500 font-bold animate-pulse">
                          <span>Falta Pagar:</span>
                          <span>${remainingDue.toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className={`flex justify-between font-bold border-t pt-1 ${isDarkMode ? 'text-emerald-400 border-white/5' : 'text-emerald-650 border-blue-100'}`}>
                          <span>Cambio / Vuelto:</span>
                          <span>${changeDue.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* PASO 1: CLIENTE */}
                  {checkoutStep === 1 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                      <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-blue-50/20 border-blue-100'}`}>
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-black'}`}>Cliente de la Venta</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <select 
                              value={selectedClientId} 
                              onChange={e => setSelectedClientId(e.target.value)} 
                              className={`w-full text-xs font-semibold px-3 py-2.5 outline-none rounded-xl border ${
                                isDarkMode ? 'border-white/10 bg-black text-white' : 'border-blue-150 bg-white text-black'
                              }`}
                            >
                              <option value="" className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>Consumidor Final (9999999999999)</option>
                              {thirdParties.filter(tp => tp.type === 'cliente').map(tp => (
                                <option key={tp.id} value={tp.id} className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>{tp.name} - RUC: {tp.ruc}</option>
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

                      <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
                        isDarkMode ? 'border-white/5 bg-black/10 text-gray-300' : 'border-blue-100 bg-blue-50/5 text-black'
                      }`}>
                        <p className={`font-bold ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Datos Facturación del Receptor:</p>
                        <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                          <p><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Razón Social:</span> {getSelectedClient().name}</p>
                          <p><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Identificación:</span> {getSelectedClient().ruc}</p>
                          <p><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Teléfono:</span> {getSelectedClient().telefono || '-'}</p>
                          <p><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Email:</span> {getSelectedClient().email || '-'}</p>
                          <p className="col-span-2"><span className={`font-bold uppercase ${isDarkMode ? 'text-gray-550' : 'text-blue-800'}`}>Dirección:</span> {getSelectedClient().direccion || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 2: METODOS DE PAGO */}
                  {checkoutStep === 2 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                      <div className={`p-4 rounded-2xl border flex justify-between items-center ${
                        isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                      }`}>
                        <span className="text-xs font-bold">TOTAL A PAGAR:</span>
                        <span className="text-lg font-black">${totalToPay.toFixed(2)}</span>
                      </div>

                      <div className="space-y-3">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Medios de Pago (Admite combinados)</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Efectivo */}
                          <div className={`p-3.5 rounded-xl border space-y-1.5 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/10'}`}>
                            <label className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-black'}`}>Efectivo ($)</label>
                            <input type="number" step="0.01" value={payments.efectivo || ''} onChange={e => setPayments({...payments, efectivo: e.target.value})} className={isDarkMode ? 'glass-input-dark px-3 py-2 w-full text-xs rounded-xl outline-none border' : 'glass-input-light px-3 py-2 w-full text-xs rounded-xl outline-none border'} placeholder="0.00" />
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {[5, 10, 20, 50, 100].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    const current = Number(payments.efectivo) || 0;
                                    setPayments({ ...payments, efectivo: (current + val).toFixed(2) });
                                  }}
                                  className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition-colors ${
                                    isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white' : 'border-blue-100 bg-white hover:bg-blue-50 text-blue-755 hover:bg-blue-100/50'
                                  }`}
                                >
                                  +{val}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const pending = Math.max(0, totalToPay - (Number(payments.tarjeta) || 0) - (Number(payments.transferencia) || 0) - (Number(payments.cruce_cuentas) || 0));
                                  setPayments({ ...payments, efectivo: pending.toFixed(2) });
                                }}
                                className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition-colors ${
                                  isDarkMode ? 'border-blue-500/20 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400' : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700'
                                }`}
                              >
                                Exacto
                              </button>
                            </div>
                          </div>
                          
                          {/* Tarjeta */}
                          <div className={`p-3.5 rounded-xl border space-y-1.5 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/10'}`}>
                            <label className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-black'}`}>Tarjeta (Crédito/Débito) ($)</label>
                            <input type="number" step="0.01" value={payments.tarjeta || ''} onChange={e => setPayments({...payments, tarjeta: e.target.value})} className={isDarkMode ? 'glass-input-dark px-3 py-2 w-full text-xs rounded-xl outline-none border' : 'glass-input-light px-3 py-2 w-full text-xs rounded-xl outline-none border'} placeholder="0.00" />
                            <input type="text" value={payments.tarjetaRef} onChange={e => setPayments({...payments, tarjetaRef: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} px-3 py-1 w-full text-[10px] mt-1 rounded-xl border`} placeholder="Ref / Autorización" />
                          </div>

                          {/* Transferencia */}
                          <div className={`p-3.5 rounded-xl border space-y-1.5 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/10'}`}>
                            <label className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-black'}`}>Transferencia Bancaria ($)</label>
                            <input type="number" step="0.01" value={payments.transferencia || ''} onChange={e => setPayments({...payments, transferencia: e.target.value})} className={isDarkMode ? 'glass-input-dark px-3 py-2 w-full text-xs rounded-xl outline-none border' : 'glass-input-light px-3 py-2 w-full text-xs rounded-xl outline-none border'} placeholder="0.00" />
                            <input type="text" value={payments.transferenciaRef} onChange={e => setPayments({...payments, transferenciaRef: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} px-3 py-1 w-full text-[10px] mt-1 rounded-xl border`} placeholder="Nro Referencia / Comprobante" />
                          </div>

                          {/* Cruce de Cuentas */}
                          <div className={`p-3.5 rounded-xl border space-y-1.5 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/10'}`}>
                            <label className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-black'}`}>Cruce de Cuentas ($)</label>
                            <input type="number" step="0.01" value={payments.cruce_cuentas || ''} onChange={e => setPayments({...payments, cruce_cuentas: e.target.value})} className={isDarkMode ? 'glass-input-dark px-3 py-2 w-full text-xs rounded-xl outline-none border' : 'glass-input-light px-3 py-2 w-full text-xs rounded-xl outline-none border'} placeholder="0.00" />
                            <input type="text" value={payments.cruceRef} onChange={e => setPayments({...payments, cruceRef: e.target.value})} className={`${isDarkMode ? 'glass-input-dark' : 'glass-input-light'} px-3 py-1 w-full text-[10px] mt-1 rounded-xl border`} placeholder="Nro de Documento Relacionado" />
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl space-y-2 text-xs font-mono border ${isDarkMode ? 'bg-black/20 border-white/5 text-gray-300' : 'bg-blue-50/20 border-blue-100 text-black'}`}>
                        <div className="flex justify-between">
                          <span>Total Pagado:</span>
                          <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>${paidTotal.toFixed(2)}</span>
                        </div>
                        {remainingDue > 0 ? (
                          <div className="flex justify-between text-yellow-500 font-bold">
                            <span>Falta Pagar:</span>
                            <span>${remainingDue.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className={`flex justify-between font-bold border-t pt-1 ${isDarkMode ? 'text-emerald-400 border-white/5' : 'text-emerald-650 border-blue-100'}`}>
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
                      <div className={`p-5 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-black border-white/5 text-gray-400' : 'bg-white border-blue-150 text-black shadow-inner'}`}>
                        <h4 className={`text-sm font-black text-center uppercase tracking-widest border-b pb-2 ${isDarkMode ? 'text-white border-white/5' : 'text-black border-blue-100'}`}>PREVISUALIZACIÓN DE FACTURA (RIDE)</h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-[10px] leading-normal">
                          <div>
                            <p className={`font-bold uppercase ${isDarkMode ? 'text-white' : 'text-blue-800'}`}>RECEPTOR</p>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-black font-medium'}><span className="font-bold">Razon Social:</span> {getSelectedClient().name}</p>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-black font-medium'}><span className="font-bold">RUC/CI:</span> {getSelectedClient().ruc}</p>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-black font-medium'}><span className="font-bold">Correo:</span> {getSelectedClient().email}</p>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-black font-medium'}><span className="font-bold">Dirección:</span> {getSelectedClient().direccion}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold uppercase ${isDarkMode ? 'text-white' : 'text-blue-800'}`}>COMPROBANTE</p>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-black font-medium'}>Establecimiento: {activeSession.branch}</p>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-black font-medium'}>Fecha: {new Date().toLocaleDateString()}</p>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-black font-medium'}>Ambiente SRI: PRUEBAS (Offline)</p>
                          </div>
                        </div>

                        <div className={`border-t pt-3 ${isDarkMode ? 'border-white/5' : 'border-blue-100'}`}>
                          <p className={`font-bold text-[10px] uppercase mb-1.5 ${isDarkMode ? 'text-white' : 'text-blue-800'}`}>Ítems Detallados</p>
                          <div className="space-y-1 text-[10px]">
                            {cart.map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-black font-semibold'}>{item.quantity}x {item.name}</span>
                                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className={`border-t pt-3 flex justify-between font-bold text-sm ${isDarkMode ? 'border-white/5 text-white' : 'border-blue-100 text-black'}`}>
                          <span>Total Neto Cobrado:</span>
                          <span className={isDarkMode ? 'text-white' : 'text-blue-750'}>${totalToPay.toFixed(2)}</span>
                        </div>

                        <div className={`text-[9px] border-t pt-2 ${isDarkMode ? 'text-gray-500 border-white/5' : 'text-black border-blue-100 font-semibold'}`}>
                          <p>Métodos Registrados: Efectivo: ${Number(payments.efectivo).toFixed(2)} | Tarjeta: ${Number(payments.tarjeta).toFixed(2)} | Transf: ${Number(payments.transferencia).toFixed(2)} | Cruce: ${Number(payments.cruce_cuentas).toFixed(2)}</p>
                          <p className="mt-0.5">Vuelto entregado: ${changeDue.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              </div>
            </div>

            {/* WIZARD ACTIONS BAR */}
            <div className={`px-6 py-4 border-t shrink-0 ${
              isDarkMode ? 'border-white/5 bg-black/20' : 'border-blue-100 bg-blue-50/30'
            }`}>
              <div className="max-w-4xl mx-auto w-full flex justify-between">
              {posConfig.expressCheckout ? (
                <>
                  <button 
                    type="button" 
                    onClick={() => setIsCheckoutOpen(false)}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
                      isDarkMode ? 'border-white/5 hover:bg-white/5 text-gray-300' : 'border-blue-150 hover:bg-blue-50/80 bg-white text-black'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleFinalCheckout} 
                    disabled={isProcessing || remainingDue > 0}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isProcessing ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />} Emitir y Finalizar Venta
                  </button>
                </>
              ) : (
                <>
                  <button 
                    type="button" 
                    disabled={checkoutStep === 1 || isProcessing}
                    onClick={() => setCheckoutStep(prev => prev - 1)}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold disabled:opacity-30 transition-colors ${
                      isDarkMode ? 'border-white/5 hover:bg-white/5 text-gray-300' : 'border-blue-150 hover:bg-blue-50/80 bg-white text-black'
                    }`}
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
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm hover:scale-105 active:scale-95 transition-all"
                    >
                      Siguiente
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleFinalCheckout} 
                      disabled={isProcessing}
                      className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition-all"
                    >
                      {isProcessing ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />} Finalizar Venta y Emitir SRI
                    </button>
                  )}
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CLIENT ADD MODAL IN POS */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all duration-300 ${
            isDarkMode ? 'bg-[#151517] border-white/10 text-white shadow-black/80' : 'bg-white border-blue-100 text-black shadow-blue-900/10'
          }`}>
            <h3 className="text-sm font-black mb-4">Registro Rápido de Cliente (SRI)</h3>
            
            <form onSubmit={handleQuickClientSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[9px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Identificación</label>
                  <select 
                    value={quickAddFormData.tipoIdentificacion} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, tipoIdentificacion: e.target.value})} 
                    className={`w-full text-xs px-2.5 py-2.5 rounded-xl outline-none border ${
                      isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-blue-100 text-black'
                    }`}
                  >
                    <option value="ruc" className="text-black bg-white">RUC</option>
                    <option value="cedula" className="text-black bg-white">Cédula</option>
                    <option value="pasaporte" className="text-black bg-white">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[9px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Número</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      required 
                      value={quickAddFormData.ruc} 
                      onChange={e => setQuickAddFormData({...quickAddFormData, ruc: e.target.value})} 
                      className={`w-full text-xs px-2.5 py-2.5 rounded-xl outline-none border ${
                        isDarkMode ? 'bg-black border-white/10 text-white focus:border-blue-500/50' : 'bg-white border-blue-100 text-black focus:border-blue-600'
                      }`}
                      placeholder="1790000000001" 
                    />
                    <button
                      type="button"
                      disabled={isQueryingSri}
                      onClick={queryQuickClientSRI}
                      className="px-3 rounded-xl border border-purple-500/30 bg-purple-500/20 text-purple-400 hover:bg-purple-500/35 shrink-0 flex items-center justify-center transition-all active:scale-95"
                    >
                      {isQueryingSri ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-[9px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Razón Social / Nombre Completo</label>
                <input 
                  type="text" 
                  required 
                  value={quickAddFormData.name} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, name: e.target.value})} 
                  className={`w-full text-xs px-2.5 py-2.5 rounded-xl outline-none border ${
                    isDarkMode ? 'bg-black border-white/10 text-white focus:border-blue-500/50' : 'bg-white border-blue-100 text-black focus:border-blue-600'
                  }`} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[9px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Teléfono</label>
                  <input 
                    type="text" 
                    value={quickAddFormData.telefono || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, telefono: e.target.value})} 
                    className={`w-full text-xs px-2.5 py-2.5 rounded-xl outline-none border ${
                      isDarkMode ? 'bg-black border-white/10 text-white focus:border-blue-500/50' : 'bg-white border-blue-100 text-black focus:border-blue-600'
                    }`} 
                  />
                </div>
                <div>
                  <label className={`block text-[9px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Contribuyente</label>
                  <select 
                    value={quickAddFormData.tipoContribuyente} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, tipoContribuyente: e.target.value})} 
                    className={`w-full text-xs px-2.5 py-2.5 rounded-xl outline-none border ${
                      isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-blue-100 text-black'
                    }`}
                  >
                    <option value="general" className="text-black bg-white">Régimen General</option>
                    <option value="rimpe_popular" className="text-black bg-white">RIMPE Popular</option>
                    <option value="rimpe_emprendedor" className="text-black bg-white">RIMPE Emprendedor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-[9px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Dirección Domicilio</label>
                <input 
                  type="text" 
                  value={quickAddFormData.direccion || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, direccion: e.target.value})} 
                  className={`w-full text-xs px-2.5 py-2.5 rounded-xl outline-none border ${
                    isDarkMode ? 'bg-black border-white/10 text-white focus:border-blue-500/50' : 'bg-white border-blue-100 text-black focus:border-blue-600'
                  }`} 
                />
              </div>

              <div>
                <label className={`block text-[9px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>Correo Notificación</label>
                <input 
                  type="email" 
                  value={quickAddFormData.email || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, email: e.target.value})} 
                  className={`w-full text-xs px-2.5 py-2.5 rounded-xl outline-none border ${
                    isDarkMode ? 'bg-black border-white/10 text-white focus:border-blue-500/50' : 'bg-white border-blue-100 text-black focus:border-blue-600'
                  }`} 
                />
              </div>

              <div className={`flex justify-end gap-2.5 mt-6 pt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-blue-100/55'}`}>
                <button type="button" onClick={() => setIsQuickAddOpen(false)} className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-blue-100/50 text-black'}`}>Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:scale-105 active:scale-95 transition-all">Guardar y Seleccionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ATAJOS DE TECLADO (GUIDE) */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all duration-300 ${
            isDarkMode ? 'bg-[#151517] border-white/10 text-white shadow-black/80' : 'bg-white border-blue-100 text-black shadow-blue-900/10'
          }`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Keyboard size={16} className="text-blue-500" /> Guía de Atajos de Teclado
              </h3>
              <button onClick={() => setIsShortcutsOpen(false)} className="text-gray-550 hover:text-gray-300 transition-colors p-1"><X size={16} /></button>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <p className="text-[10px] text-gray-400">Usa estos atajos rápidos para agilizar el proceso de facturación en caja:</p>
              
              <div className="space-y-2">
                {[
                  { key: 'F2', desc: 'Enfocar la barra de búsqueda de productos' },
                  { key: 'F8', desc: 'Suspender venta actual (Borrar localmente)' },
                  { key: 'F9', desc: 'Recuperar última venta suspendida' },
                  { key: 'F12', desc: 'Proceder al cobro / Abrir pasarela de pago' },
                  { key: 'Ctrl + Enter', desc: 'Cobrar directamente desde el detalle de la venta' },
                  { key: 'Escape', desc: 'Cerrar cualquier ventana flotante o modal abierto' }
                ].map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-2.5 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/5 text-gray-300' : 'bg-blue-50/20 border-blue-100 text-black font-semibold'}`}>
                    <span className="text-[11px] font-medium">{item.desc}</span>
                    <kbd className={`px-2 py-1 rounded text-[10px] font-mono font-bold shadow ${isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-white text-black border border-blue-200'}`}>
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-white/5">
              <button 
                type="button" 
                onClick={() => setIsShortcutsOpen(false)} 
                className="px-5 py-2.5 rounded-xl text-xs font-black transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-sm hover:scale-105 active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DESLIZABLE: HISTORIAL DE VENTAS DE LA SESIÓN */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[140] flex justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsHistoryOpen(false)}></div>
          
          <div className={`relative w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-350 ${
            isDarkMode ? 'bg-[#0f0f11] border-l border-white/5 text-white' : 'bg-[#fcfcff] border-l border-blue-100 text-black'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-blue-100 bg-blue-50/40'}`}>
              <div className="flex items-center gap-2">
                <History size={16} className="text-blue-500" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Historial de Ventas</h3>
                  <p className="text-[9px] text-gray-500">Sesión de caja activa</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)} 
                className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-450 hover:text-white' : 'hover:bg-blue-100 text-gray-650 hover:text-black'}`}
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {(() => {
                const sessionTransactions = transactions.filter(t => t.cashSessionId === activeSession.id);
                if (sessionTransactions.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-500 text-center">
                      <History size={40} className="opacity-20 mb-2.5 text-blue-500" />
                      <p className="text-xs italic font-medium">No se han emitido ventas en esta sesión.</p>
                    </div>
                  );
                }
                return sessionTransactions.map((tx) => {
                  const matchedClient = thirdParties.find(tp => tp.id === tx.thirdPartyId) || tx.thirdParty || { name: 'Consumidor Final', ruc: '9999999999999' };
                  const isAnulado = tx.sriStatus === 'anulado';
                  return (
                    <div 
                      key={tx.id} 
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                        isAnulado
                          ? 'opacity-65 border-red-500/20 bg-red-500/5'
                          : (isDarkMode ? 'bg-black/25 border-white/5 hover:bg-black/35' : 'bg-white border-blue-100/70 shadow-sm hover:shadow')
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[9px] text-gray-500 truncate">{tx.id}</p>
                          <h4 className={`text-xs font-black truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            {matchedClient.name}
                          </h4>
                          <p className="text-[9px] text-gray-500">RUC/CI: {matchedClient.ruc} | Fecha: {tx.date}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-black block ${isAnulado ? 'text-red-500 line-through' : (isDarkMode ? 'text-white' : 'text-blue-700')}`}>
                            ${Number(tx.total || 0).toFixed(2)}
                          </span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mt-1 ${
                            isAnulado 
                              ? 'bg-red-500/20 text-red-405' 
                              : (tx.sriStatus === 'autorizado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400')
                          }`}>
                            {tx.sriStatus || 'pendiente'}
                          </span>
                        </div>
                      </div>

                      <div className={`p-2 rounded-xl text-[9px] leading-relaxed font-mono ${isDarkMode ? 'bg-black/40 text-gray-400' : 'bg-blue-50/30 text-gray-700'}`}>
                        <div className="flex justify-between">
                          <span>Pago: <span className="font-bold uppercase">{tx.paymentMethod}</span></span>
                          <span>Base: ${Number(tx.baseImponible || 0).toFixed(2)}</span>
                        </div>
                        {tx.items && tx.items.length > 0 && (
                          <div className="border-t border-white/5 mt-1 pt-1 max-h-16 overflow-y-auto custom-scrollbar">
                            {tx.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-[8px] text-gray-500">
                                <span className="truncate max-w-[150px]">{it.quantity}x {it.name}</span>
                                <span>${(it.price * it.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center border-t border-white/5 pt-2">
                        <div className="flex gap-1.5">
                          {tx.pdfUrl ? (
                            <a 
                              href={tx.pdfUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${
                                isDarkMode ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`} 
                              title="Descargar PDF RIDE"
                            >
                              <FileText size={12} />
                            </a>
                          ) : (
                            <span 
                              className={`p-1.5 rounded-lg border opacity-40 cursor-not-allowed flex items-center justify-center ${
                                isDarkMode ? 'border-white/5 bg-white/5 text-gray-500' : 'border-gray-250 bg-gray-100 text-gray-400'
                              }`} 
                              title="PDF no disponible"
                            >
                              <FileText size={12} />
                            </span>
                          )}

                          {tx.xmlUrl && (
                            <a 
                              href={tx.xmlUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${
                                isDarkMode ? 'border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/25' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                              }`} 
                              title="Descargar XML SRI"
                            >
                              <Download size={12} />
                            </a>
                          )}
                        </div>

                        {!isAnulado && (
                          <button
                            type="button"
                            onClick={() => handleVoidTransaction(tx)}
                            className={`px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase flex items-center gap-1 transition-all ${
                              isDarkMode 
                                ? 'border-red-500/35 bg-red-600/15 text-red-400 hover:bg-red-600/25' 
                                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            <ShieldAlert size={10} /> Anular Venta
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            {/* Footer */}
            <div className={`p-4 border-t flex justify-end shrink-0 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-blue-100 bg-blue-50/20'}`}>
              <button 
                type="button" 
                onClick={() => setIsHistoryOpen(false)}
                className={`w-full py-2.5 rounded-xl text-xs font-black transition-all ${
                  isDarkMode ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-white border border-blue-150 hover:bg-blue-50/80 text-black shadow-sm'
                }`}
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
