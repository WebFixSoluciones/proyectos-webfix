import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, Sparkles, CheckCircle2, DollarSign, CreditCard, X, ShieldAlert, Award, Layers, Tag, Bookmark, RefreshCw, LogOut, ArrowRight, ArrowLeft, ChevronRight, Settings, Barcode, Zap, Eye, Mic, Keyboard, History, Download, FileText, Unlock, UserPlus, Edit3, Phone, Mail, MoreHorizontal, ChevronDown, Sliders, Box, SlidersHorizontal, LayoutGrid, List, Scan, Percent } from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { consultarRucSri, getEcuadorDateString } from '../../services/sriService';
import { registrarMovimientoKardex } from '../../services/inventoryService';
import { calculateTransactionTotals } from '../../services/discountCalcService';

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

const getProductImageUrl = (p) => {
  const url = p?.imageUrl || p?.image || '';
  if (!url || url.trim() === '' || url.includes('placehold.co') || url.includes('placehold.net')) {
    return '/product.svg';
  }
  return url;
};

const BarcodeScannerIcon = ({ className = "text-primary shrink-0", size = 18 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    {/* Corners */}
    <path 
      d="M 5,9 V 7 A 2,2 0 0,1 7,5 H 9" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M 15,5 H 17 A 2,2 0 0,1 19,7 V 9" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M 5,15 V 17 A 2,2 0 0,0 7,19 H 9" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M 15,19 H 17 A 2,2 0 0,0 19,17 V 15" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    {/* Bars */}
    <rect x="7.5" y="7" width="1.5" height="10" fill="currentColor" rx="0.3" />
    <rect x="10" y="7" width="0.8" height="10" fill="currentColor" rx="0.2" />
    <rect x="11.8" y="7" width="1.2" height="10" fill="currentColor" rx="0.3" />
    <rect x="14" y="7" width="0.8" height="10" fill="currentColor" rx="0.2" />
    <rect x="15.8" y="7" width="1.5" height="10" fill="currentColor" rx="0.3" />
  </svg>
);

export default function PosView({ products, thirdParties, transactions = [], discounts = [], promotions = [], showToast, db, appId, onCheckout, onClose, isPreventaOnly }) {
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
  const [posDocType, setPosDocType] = useState('factura'); // 'factura' o 'nota_venta'
  const [sriConfig, setSriConfig] = useState(null);
  
  // Estados de Filtros
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [filterStock, setFilterStock] = useState('all'); // 'all', 'instock'
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Estados Locales para el Buscador Modal (Declarados al nivel superior del componente)
  const [modalSearch, setModalSearch] = useState('');
  const [modalCat, setModalCat] = useState('all');
  const [modalBrand, setModalBrand] = useState('all');
  const [modalWh, setModalWh] = useState('all');
  const [modalTab, setModalTab] = useState('all'); // 'all' | 'best_sellers'

  // Descuentos
  const [discountType, setDiscountType] = useState('percent'); // 'percent' o 'fixed'
  const [discountValue, setDiscountValue] = useState(0);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);

  // Unified Discounts & Promotions state
  const [selectedGeneralDiscount, setSelectedGeneralDiscount] = useState(null);
  const [selectedLineItemForDiscount, setSelectedLineItemForDiscount] = useState(null);
  const [authDialog, setAuthDialog] = useState(null);
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

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
  const [activePayments, setActivePayments] = useState({
    efectivo: true,
    transferencia: false,
    tarjeta: false,
    cruce_cuentas: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estados para el cobro directo en una sola pantalla
  const [posPaymentMethod, setPosPaymentMethod] = useState('efectivo'); 
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentRefCode, setPaymentRefCode] = useState('');
  
  // Nuevos estados para flujo Inline Bsale y encabezado compacto
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [isDocTypeDropdownOpen, setIsDocTypeDropdownOpen] = useState(false);
  const [isOptionsDropdownOpen, setIsOptionsDropdownOpen] = useState(false);

  // Quick Client Creation Modal (inside POS Checkout)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isQueryingSri, setIsQueryingSri] = useState(false);
  const [quickAddFormData, setQuickAddFormData] = useState({
    name: '',
    ruc: '',
    email: '',
    tipoIdentificacion: 'ruc',
    direccion: '',
    ciudad: '',
    telefono: '',
    tipoContribuyente: 'general'
  });

  // Cómputo de Totales y Descuentos con Motor Unificado
  const totalsResult = calculateTransactionTotals(cart, selectedGeneralDiscount);

  const getSubtotal = () => totalsResult.subtotalBruto;
  const getDiscountAmount = () => totalsResult.descuentoVenta; // general discount
  const getSubtotalWithDiscount = () => totalsResult.subtotalGeneralNeto;
  const getIva = () => totalsResult.ivaValor;
  const getTotal = () => totalsResult.total;
  
  // Para desgloses separados
  const productDiscountsTotal = totalsResult.descuentosProducto;

  const getActiveDiscounts = (alcance) => {
    const hoy = getEcuadorDateString();
    return (discounts || []).filter(d => {
      return d.activo && 
             d.alcance === alcance && 
             d.fecha_inicio <= hoy && 
             d.fecha_fin >= hoy;
    });
  };

  const getAvailableDiscountsForLineItem = (cartItem) => {
    const hoy = getEcuadorDateString();
    const prod = products.find(p => p.id === cartItem.productId);
    
    const activeProductDiscounts = (discounts || []).filter(d => {
      return d.activo && 
             d.alcance === 'PRODUCTO' && 
             d.fecha_inicio <= hoy && 
             d.fecha_fin >= hoy;
    });

    const activeLinePromotions = (promotions || []).filter(p => {
      if (!p.activo || p.fecha_inicio > hoy || p.fecha_fin < hoy) return false;
      
      if (p.dias_validos && p.dias_validos.length > 0) {
        const daysMap = { 0: 'DOM', 1: 'LUN', 2: 'MAR', 3: 'MIE', 4: 'JUE', 5: 'VIE', 6: 'SAB' };
        const currentDay = daysMap[new Date().getDay()];
        if (!p.dias_validos.includes(currentDay)) return false;
      }

      if (p.alcance_aplicacion === 'PRODUCTO_ESPECIFICO' && p.target_id === cartItem.productId) {
        return true;
      }
      if (p.alcance_aplicacion === 'CATEGORIA' && prod && p.target_id === prod.categoria) {
        return true;
      }
      return false;
    });

    const mappedPromos = activeLinePromotions.map(promo => {
      const disc = discounts.find(d => d.id === promo.id_descuento);
      if (!disc) return null;
      return {
        id: disc.id,
        promotionId: promo.id,
        nombre: `Promo: ${promo.nombre} (${disc.nombre})`,
        tipo_valor: disc.tipo_valor,
        valor: disc.valor,
        requiere_autorizacion: disc.requiere_autorizacion
      };
    }).filter(Boolean);

    return [...activeProductDiscounts, ...mappedPromos];
  };

  // Sincronizar reactivamente los pagos según el método seleccionado en el sidebar
  useEffect(() => {
    const total = getTotal();
    if (posPaymentMethod === 'efectivo') {
      const cashVal = Number(receivedAmount) || 0;
      setPayments({
        efectivo: cashVal,
        transferencia: 0,
        tarjeta: 0,
        cruce_cuentas: 0,
        transferenciaRef: '',
        tarjetaRef: '',
        cruceRef: ''
      });
    } else if (posPaymentMethod === 'transferencia') {
      setPayments({
        efectivo: 0,
        transferencia: total,
        tarjeta: 0,
        cruce_cuentas: 0,
        transferenciaRef: paymentRefCode,
        tarjetaRef: '',
        cruceRef: ''
      });
    } else if (posPaymentMethod === 'tarjeta') {
      setPayments({
        efectivo: 0,
        transferencia: 0,
        tarjeta: total,
        cruce_cuentas: 0,
        transferenciaRef: '',
        tarjetaRef: paymentRefCode,
        cruceRef: ''
      });
    }
  }, [posPaymentMethod, receivedAmount, paymentRefCode, cart]);

  // checkout wizard calculations
  const totalToPay = getTotal();
  const paidTotal = Number(payments.efectivo) + Number(payments.transferencia) + Number(payments.tarjeta) + Number(payments.cruce_cuentas);
  const changeDue = Math.max(0, paidTotal - totalToPay);
  const remainingDue = Math.max(0, totalToPay - paidTotal);

  const playCashRegisterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Ring sound: first note (high pitch)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.35);

      // Clank sound: metallic clank (lower pitch white noise + triangle wave)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(330, audioCtx.currentTime); // E4
        gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.25);
      }, 80);
      
      showToast("🔑 Gaveta de efectivo abierta (Simulación)", "success");
    } catch (e) {
      console.error("AudioContext error: ", e);
      showToast("🔑 Gaveta de efectivo abierta", "success");
    }
  };

  useEffect(() => {
    if (appId) {
      localStorage.setItem(`pos_config_${appId}`, JSON.stringify(posConfig));
    }
  }, [posConfig, appId]);

  const getGridColsClass = () => {
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
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

  // Auto close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.doc-type-selector-container')) {
        setIsDocTypeDropdownOpen(false);
      }
      if (!e.target.closest('.options-gear-container')) {
        setIsOptionsDropdownOpen(false);
      }
      if (!e.target.closest('.client-search-container')) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
        setIsConfigOpen(false);
        setIsOptionsDropdownOpen(false);
        setIsDocTypeDropdownOpen(false);
      }

      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) searchInput.focus();
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
          if (!selectedClientId) {
            showToast("Alerta: No se seleccionó ningún cliente", "error");
            return;
          }
          if (!showPaymentScreen) {
            setReceivedAmount('');
            setPosPaymentMethod('efectivo');
            setPaymentRefCode('');
            setShowPaymentScreen(true);
          } else {
            if (posPaymentMethod === 'efectivo') {
              const cashVal = Number(receivedAmount) || 0;
              if (cashVal < getTotal()) {
                showToast(`Por favor, cubre el total de la factura. Falta pagar $${(getTotal() - cashVal).toFixed(2)}`, "error");
                return;
              }
            }
            handleFinalCheckout();
          }
        } else {
          showToast("El carrito está vacío", "error");
        }
        return;
      }

      if (isInputActive && e.key !== 'F2' && e.key !== 'F12' && e.key !== 'Escape') {
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [cart, totalToPay, showPaymentScreen, posPaymentMethod, receivedAmount]);

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
          console.warn("Auto-consulta SRI falló (silencioso):", e.message);
          // No mostramos toast en auto-query para no molestar al usuario
        } finally {
          setIsQueryingSri(false);
        }
      };
      autoQuery();
    }
  }, [quickAddFormData.ruc, quickAddFormData.tipoIdentificacion, isQuickAddOpen]);

  // Cargar configuración de SRI/Empresa
  useEffect(() => {
    if (!appId || !db) return;
    const fetchSriConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config'));
        if (snap.exists()) {
          const config = snap.data();
          setSriConfig(config);
          if (config.rucActivo === false) {
            setPosDocType('nota_venta');
          }
        }
      } catch (e) {
        console.error("Error cargando config SRI en POS:", e);
      }
    };
    fetchSriConfig();
  }, [appId, db]);

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
    if (product.type === 'producto' && product.inventoryType !== 'VIRTUAL' && product.stock <= 0) {
      showToast("Producto sin stock disponible", "error");
      return;
    }

    const priceVal = product.tax_mode === 'INCLUIDO' 
      ? (Number(product.precio_con_iva) || Number(product.price) || 0)
      : (Number(product.precio_sin_iva) || Number(product.price) || 0);

    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (product.type === 'producto' && product.inventoryType !== 'VIRTUAL' && existing.quantity >= product.stock) {
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
        price: priceVal,
        quantity: 1,
        ivaCategory: product.ivaCategory !== undefined ? Number(product.ivaCategory) : 15,
        tax_mode: product.tax_mode || 'EXCLUIDO',
        tarifa_iva: product.tarifa_iva !== undefined ? Number(product.tarifa_iva) : 0.15,
        id_descuento_aplicado: '',
        id_promocion_aplicada: '',
        discount_value: 0,
        discount_type: 'PORCENTAJE'
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

    if (prod && prod.type === 'producto' && prod.inventoryType !== 'VIRTUAL' && nextQty > prod.stock) {
      showToast("Excede stock disponible", "error");
      return;
    }

    setCart(cart.map(i => 
      i.productId === productId 
        ? { ...i, quantity: nextQty }
        : i
    ));
  };



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
      showToast("Alerta: El carrito está vacío", "error");
      return;
    }
    if (!selectedClientId) {
      showToast("Alerta: No se seleccionó ningún cliente", "error");
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
            isValidated: true,
            validado: true,
            updatedAt: new Date().toISOString()
          }));
        }
      }



      // Determinar método de pago dominante
      let pMethod = 'transferencia';
      if (payments.efectivo >= payments.tarjeta && payments.efectivo >= payments.transferencia && payments.efectivo >= payments.cruce_cuentas) pMethod = 'efectivo';
      else if (payments.tarjeta >= payments.efectivo && payments.tarjeta >= payments.transferencia && payments.tarjeta >= payments.cruce_cuentas) pMethod = 'tarjeta';
      else if (payments.cruce_cuentas >= payments.efectivo && payments.cruce_cuentas >= payments.tarjeta && payments.cruce_cuentas >= payments.transferencia) pMethod = 'cruce_cuentas';

      const invoiceData = {
        type: 'ingreso',
        date: getEcuadorDateString(),
        documentType: posDocType,
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
        paymentStatus: isPreventaOnly ? 'pendiente' : 'pagado',
        sriStatus: 'pendiente',
        items: cart,
        isPOS: !isPreventaOnly,
        isPreventa: !!isPreventaOnly,
        cashSessionId: isPreventaOnly ? '' : (activeSession?.id || ''),
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
      setPosDocType('factura');
      setPosPaymentMethod('efectivo');
      setReceivedAmount('');
      setPaymentRefCode('');
      setPayments({
        efectivo: 0,
        transferencia: 0,
        tarjeta: 0,
        cruce_cuentas: 0,
        transferenciaRef: '',
        tarjetaRef: '',
        cruceRef: ''
      });
      setActivePayments({
        efectivo: true,
        transferencia: false,
        tarjeta: false,
        cruce_cuentas: false
      });
      setIsCheckoutOpen(false);
      setCheckoutStep(1);
      setShowPaymentScreen(false);
      
      setTimeout(() => {
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) searchInput.focus();
      }, 350);

      showToast(isPreventaOnly ? "Preventa registrada con éxito" : "Venta POS completada y enviada a facturación SRI", "success");
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
        ciudad: result.ciudad || '',
        telefono: result.telefono,
        email: result.email || prev.email,
        tipoContribuyente: result.tipoContribuyente || 'general'
      }));
      showToast("Datos cargados exitosamente desde el SRI", "success");
    } catch (e) {
      console.error("Error al consultar RUC en POS:", e);
      showToast(e.message || "Error al consultar RUC en el SRI", "error");
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
    const trimmedRuc = quickAddFormData.ruc.trim();
    const isDuplicate = (thirdParties || []).some(tp => tp.ruc && String(tp.ruc).trim() === trimmedRuc);
    if (isDuplicate) {
      showToast("Ya existe un cliente con este RUC/Identificación", "error");
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
        ciudad: quickAddFormData.ciudad || '',
        telefono: quickAddFormData.telefono || '',
        tipoContribuyente: quickAddFormData.tipoContribuyente || 'general',
        isValidated: true,
        validado: true,
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
    if (!await window.confirm(`¿Estás seguro de que deseas ANULAR este comprobante (${tx.id})? Esto restaurará el stock de los productos.`)) {
      return;
    }
    try {
      if (tx.items && Array.isArray(tx.items)) {
        for (const item of tx.items) {
          try {
            // Reversar venta: volver a ingresar el producto (entrada)
            const prodRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory_products', item.productId);
            const prodSnap = await getDoc(prodRef);
            let currentCost = 0;
            if (prodSnap.exists()) {
              currentCost = Number(prodSnap.data().baseCost) || 0;
            }

            await registrarMovimientoKardex(db, appId, {
              productId: item.productId,
              type: 'entrada',
              quantity: Number(item.quantity) || 0,
              cost: currentCost,
              price: 0,
              concept: `Anulación de Venta POS ${tx.documentNumber || tx.id}`,
              referenceId: tx.id,
              bodega: tx.bodega || "Bodega Central"
            });
          } catch (err) {
            console.error("Error al reversar stock de item en POS:", item, err);
          }
        }
      }
      
      const txRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', tx.id);
      await setDoc(txRef, sanitizeData({
        sriStatus: 'anulado',
        inventarioRegistrado: false,
        updatedAt: new Date().toISOString()
      }), { merge: true });
      
      showToast("Comprobante anulado y stock restaurado con éxito", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al anular el comprobante", "error");
    }
  };

  const handleCreateQuote = async () => {
    if (cart.length === 0) {
      showToast("Agrega productos al carrito para realizar una cotización", "error");
      return;
    }
    
    setIsProcessing(true);
    try {
      const docId = `quote_${new Date().getTime()}`;
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 15);
      
      const finalQuote = {
        id: docId,
        quoteNumber: `COT-${new Date().getFullYear()}-${String(new Date().getTime()).slice(-4)}`,
        date: getEcuadorDateString(),
        validUntil: getEcuadorDateString(validDate),
        thirdPartyId: selectedClientId || '',
        items: cart,
        subtotal: Number(getSubtotalWithDiscount().toFixed(2)),
        ivaValor: Number(getIva().toFixed(2)),
        total: Number(getTotal().toFixed(2)),
        status: 'borrador',
        isPOS: true,
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_quotes', docId), sanitizeData(finalQuote));
      showToast("Cotización POS registrada con éxito", "success");
      setCart([]);
      setSelectedClientId('');
    } catch (err) {
      console.error(err);
      showToast("Error al crear la cotización", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Categorías más usadas ordenadas por conteo
  const categoriesWithCount = React.useMemo(() => {
    const counts = {};
    products.forEach(p => {
      if (p.categoria) {
        counts[p.categoria] = (counts[p.categoria] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .map(cat => ({ name: cat, count: counts[cat] }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // Productos más vendidos basados en transacciones
  const bestSellers = React.useMemo(() => {
    const counts = {};
    transactions.forEach(t => {
      if (t.items && Array.isArray(t.items)) {
        t.items.forEach(item => {
          const id = item.productId || item.id;
          if (id) {
            counts[id] = (counts[id] || 0) + (item.quantity || 1);
          }
        });
      }
    });
    return products
      .map(p => ({ ...p, salesCount: counts[p.id] || 0 }))
      .sort((a, b) => b.salesCount - a.salesCount);
  }, [products, transactions]);

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

  const inputClass = `w-full text-xs px-3 py-2 rounded-card outline-none border ${
    'bg-white border-gray-300 text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary/40'}`;

  if (!isPreventaOnly) {
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
        <div className={`fixed inset-0 z-[100] bg-surface-card text-text-secondary flex items-center justify-center p-4 transition-colors duration-300`}>
          {/* Decorative background blobs */}
          <div className={`absolute top-[-10%] left-[-5%] w-[30rem] h-[30rem] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none bg-emerald-300`}></div>
          <div className={`absolute bottom-[-10%] right-[-5%] w-[30rem] h-[30rem] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none bg-orange-300`}></div>

          <div className={`w-full max-w-md p-8 rounded-card border space-y-6 transition-all duration-300 bg-white text-text-secondary border-primary/15`}>
            <div className="text-center space-y-2">
              <div className={`mx-auto w-14 h-14 rounded-card flex items-center justify-center border animate-pulse-glow bg-emerald-50 text-emerald-600 border-emerald-250`}>
                <DollarSign size={26} />
              </div>
              <h2 className={`text-xl font-bold font-display tracking-tight text-black`}>Apertura de Caja POS</h2>
              <p className={`text-xs font-medium text-black font-semibold`}>Es necesario ingresar el fondo inicial para habilitar la caja registradora.</p>
            </div>

            <form onSubmit={handleOpenSession} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-black`}>Responsable / Cajero</label>
                <input type="text" required value={openingForm.responsible} onChange={e => setOpeningForm({...openingForm, responsible: e.target.value})} className={`w-full text-sm px-3.5 py-3 rounded-card outline-none transition-all border glass-input-light`} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-black`}>Sucursal</label>
                  <input type="text" required value={openingForm.branch} onChange={e => setOpeningForm({...openingForm, branch: e.target.value})} className={`w-full text-sm px-3.5 py-3 rounded-card outline-none transition-all border glass-input-light`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-black`}>Turno</label>
                  <select value={openingForm.shift} onChange={e => setOpeningForm({...openingForm, shift: e.target.value})} className={`w-full text-sm px-3.5 py-3 rounded-card outline-none transition-all border cursor-pointer glass-input-light`}>
                    <option value="Mañana" className="text-black bg-white">Mañana</option>
                    <option value="Tarde" className="text-black bg-white">Tarde</option>
                    <option value="Noche" className="text-black bg-white">Noche</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-black`}>Fondo Inicial ($ USD)</label>
                <input type="number" required step="0.01" value={openingForm.initialAmount} onChange={e => setOpeningForm({...openingForm, initialAmount: e.target.value})} className={`w-full text-sm px-3.5 py-3 rounded-card outline-none transition-all border glass-input-light`} />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-black`}>Observaciones de Entrada</label>
                <textarea value={openingForm.notes} onChange={e => setOpeningForm({...openingForm, notes: e.target.value})} className={`w-full text-sm px-3.5 py-3 rounded-card outline-none transition-all border min-h-[70px] resize-none glass-input-light`} placeholder="Sin novedades..." />
              </div>

              <button type="submit" className="btn-primary w-full mt-4">
                Abrir Caja y Activar POS
              </button>
            </form>
          </div>
        </div>,
        document.body
      );
    }
  }

  // PANTALLA 2: POS PRINCIPAL EN PANTALLA COMPLETA
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-surface-card text-text-secondary flex flex-col overflow-hidden animate-in fade-in duration-300">
      
      {/* CSS Reset para eliminar bordes de foco del buscador en cualquier navegador */}
      <style>{`
        #pos-search-input:focus,
        #pos-search-input:focus-visible,
        #pos-search-input:active,
        .client-search-container input:focus,
        .client-search-container input:focus-visible {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
      
      {/* TOP HEADER POS */}
      <div 
        className="h-auto md:h-16 py-3 md:py-0 px-4 flex flex-col md:flex-row items-center justify-between shrink-0 text-text-secondary gap-4 relative z-30"
        style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
      >
        
        {/* Left Area: matches products catalog width */}
        <div className="flex-1 flex items-center gap-2.5 w-full">
          {/* Buscar Producto, Código */}
          <div className="flex-[1.4] relative">
            <div className="flex items-center gap-2 px-3.5 h-10 rounded-card bg-white border-none shadow-sm transition-all w-full">
              <BarcodeScannerIcon className="text-primary shrink-0" size={18} />
              <input 
                type="text" 
                id="pos-search-input"
                placeholder="Producto, Nombre, Código" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="bg-transparent border-none outline-none text-sm w-full focus:ring-0 text-black placeholder-gray-400 font-semibold focus-visible:outline-none focus:outline-none"
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              />
              {searchTerm && (
                <button 
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-gray-500 hover:text-gray-750 p-0.5 rounded-full"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Cliente, Nombre, RUC */}
          <div className="flex-1 relative client-search-container">
            {selectedClientId ? (
              <div className="flex items-center justify-between px-3.5 h-10 rounded-card bg-white border-none shadow-sm text-black">
                <div className="flex items-center gap-2 min-w-0">
                  <User size={16} className="text-primary shrink-0" />
                  <span className="text-sm font-semibold truncate max-w-[160px] uppercase">
                    {getSelectedClient().name}
                  </span>
                  <span className="text-xs text-gray-550 font-mono">
                    ({getSelectedClient().ruc})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId('');
                    setClientSearchTerm('');
                  }}
                  className="text-gray-500 hover:text-red-500 p-0.5 rounded-full transition-colors"
                  title="Quitar Cliente"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 h-10 rounded-card bg-white border-none shadow-sm transition-all">
                <Search size={16} className="text-primary shrink-0" />
                <input 
                  type="text"
                  placeholder="Cliente, Nombre, RUC"
                  value={clientSearchTerm}
                  onChange={e => {
                    setClientSearchTerm(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  className="bg-transparent border-none outline-none text-sm w-full focus:ring-0 text-black placeholder-gray-400 font-semibold focus-visible:outline-none focus:outline-none"
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                />
                {clientSearchTerm && (
                  <button 
                    type="button"
                    onClick={() => {
                      setClientSearchTerm('');
                      setIsClientDropdownOpen(false);
                    }}
                    className="text-gray-500 hover:text-gray-750 p-0.5 rounded-full"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            
            {/* Dropdown de Clientes */}
            {isClientDropdownOpen && clientSearchTerm && (
              <div className="absolute left-0 right-0 top-10 max-h-48 overflow-y-auto z-50 rounded-card border bg-white border-primary/20 text-black custom-scrollbar shadow-lg">
                <div 
                  onClick={() => {
                    setSelectedClientId('');
                    setClientSearchTerm('');
                    setIsClientDropdownOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-bold cursor-pointer transition-colors border-b hover:bg-primary-light border-primary/10"
                >
                  Consumidor Final (9999999999999)
                </div>
                {thirdParties
                  .filter(tp => tp.type !== 'proveedor' && 
                    (tp.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
                     String(tp.ruc || '').includes(clientSearchTerm))
                  )
                  .map(tp => (
                    <div 
                      key={tp.id}
                      onClick={() => {
                        setSelectedClientId(tp.id);
                        setClientSearchTerm('');
                        setIsClientDropdownOpen(false);
                      }}
                      className="px-3 py-2 text-xs font-semibold cursor-pointer transition-colors hover:bg-primary-light"
                    >
                      <div className="font-bold text-xs">{tp.name}</div>
                      <div className="text-xs text-gray-550 font-mono">CI/RUC: {tp.ruc}</div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Botón Agregar Cliente */}
          <button 
            type="button"
            onClick={() => {
              setQuickAddFormData({
                name: '', ruc: '', email: '', tipoIdentificacion: 'ruc', direccion: '', telefono: '', tipoContribuyente: 'general'
              });
              setIsQuickAddOpen(true);
            }} 
            className="w-10 h-10 rounded-card flex items-center justify-center bg-primary text-white hover:bg-primary-hover shrink-0 transition-all cursor-pointer"
            title="Crear Nuevo Cliente"
          >
            <UserPlus size={16} />
          </button>
        </div>

        {/* Right Area: matches checkout panel width */}
        <div className="w-full lg:w-[32rem] xl:w-[38rem] flex items-center justify-between shrink-0 gap-3">
          {/* Botón de Selección de Factura, Nota de Venta o Cotización */}
          <div className="relative doc-type-selector-container">
            <button
              type="button"
              onClick={() => setIsDocTypeDropdownOpen(!isDocTypeDropdownOpen)}
              className="px-4 h-10 rounded-card flex items-center gap-1.5 bg-primary text-white hover:bg-primary-hover font-bold text-sm shrink-0 select-none transition-all cursor-pointer"
            >
              <span>
                {posDocType === 'factura' ? 'Factura Electrónica' : posDocType === 'nota_venta' ? 'Nota de Venta' : 'Cotización'}
              </span>
              <ChevronDown size={14} />
            </button>
            
            {isDocTypeDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-48 rounded-card border bg-white border-primary/20 text-black shadow-lg z-50 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setPosDocType('factura');
                    setIsDocTypeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-primary/5 ${posDocType === 'factura' ? 'text-primary' : 'text-gray-750'}`}
                >
                  Factura Electrónica
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPosDocType('nota_venta');
                    setIsDocTypeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-primary/5 ${posDocType === 'nota_venta' ? 'text-primary' : 'text-gray-750'}`}
                >
                  Nota de Venta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPosDocType('cotizacion');
                    setIsDocTypeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-primary/5 ${posDocType === 'cotizacion' ? 'text-primary' : 'text-gray-750'}`}
                >
                  Cotización
                </button>
              </div>
            )}
          </div>

          {/* INFO LOCAL Y BOTONES DE AJUSTE */}
          <div className="flex items-center gap-3">
            <div className="text-xs tracking-wide select-none">
              <span className="font-extrabold text-slate-800 uppercase">
                {activeSession?.branch || 'MATRIZ QUITO'} : 
              </span>
              <span className="font-semibold text-slate-400">
                {' '}Fondo ${Number(activeSession?.initialAmount || 100).toFixed(0)}
              </span>
            </div>
            
            {/* Dropdown del Gear (Settings) */}
            <div className="relative options-gear-container">
              <button 
                type="button"
                onClick={() => setIsOptionsDropdownOpen(!isOptionsDropdownOpen)} 
                className={`w-10 h-10 rounded-card flex items-center justify-center border transition-all cursor-pointer ${
                  isOptionsDropdownOpen ? 'bg-primary/10 border-primary text-primary' : 'border-primary/25 text-primary hover:bg-primary/5 bg-white'
                }`}
                title="Opciones de Caja y POS"
              >
                <Settings size={18} />
              </button>
              
              {isOptionsDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-card border bg-white border-primary/20 text-black shadow-lg z-50 py-1">
                  {hasSuspendedSale && (
                    <button
                      type="button"
                      onClick={() => {
                        resumeSale();
                        setIsOptionsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                    >
                      <ShoppingCart size={13} />
                      <span>Recuperar Venta</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsShortcutsOpen(true);
                      setIsOptionsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/5 flex items-center gap-2"
                  >
                    <Keyboard size={13} />
                    <span>Ver Atajos de Teclado (F2)</span>
                  </button>
                  {!isPreventaOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsHistoryOpen(true);
                        setIsOptionsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/5 flex items-center gap-2"
                    >
                      <History size={13} />
                      <span>Historial de Ventas</span>
                    </button>
                  )}
                  {!isPreventaOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenCloseModal();
                        setIsOptionsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/5 flex items-center gap-2"
                    >
                      <DollarSign size={13} />
                      <span>Arqueo / Cerrar Caja</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfigOpen(true);
                      setIsOptionsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-primary/5 flex items-center gap-2"
                  >
                    <Sliders size={13} />
                    <span>Personalización del POS</span>
                  </button>
                </div>
              )}
            </div>

            {/* Botón Salir */}
            <button 
              type="button" 
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  window.location.reload();
                }
              }} 
              className="w-10 h-10 rounded-card flex items-center justify-center border border-primary/25 text-primary hover:bg-primary/5 bg-white transition-all cursor-pointer" 
              title="Volver al ERP / Cerrar POS"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* POS WORKSPACE CONTAINER */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {showPaymentScreen ? (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-50 animate-in fade-in duration-300">
            {/* COLUMNA IZQUIERDA: RESUMEN DE COMPRA Y CLIENTE */}
            <div className="w-full lg:w-[28rem] xl:w-[32rem] flex flex-col shrink-0 border-r border-[#CDD1EA] bg-white p-6 justify-between overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                {/* Cabecera / Regresar */}
                <div className="flex items-center justify-between pb-4 border-b border-[#CDD1EA]">
                  <button
                    type="button"
                    onClick={() => setShowPaymentScreen(false)}
                    className="flex items-center gap-2 text-xs font-black uppercase text-primary hover:text-primary-hover transition-colors"
                  >
                    <ArrowLeft size={16} />
                    <span>Modificar Carrito / Regresar</span>
                  </button>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-650 px-2.5 py-1 rounded-full">
                    Paso de Pago
                  </span>
                </div>

                {/* Tipo de Documento Seleccionado */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary text-white shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/70">Documento a Emitir</span>
                      <h3 className="text-sm font-black text-black uppercase">
                        {posDocType === 'factura' ? 'Factura Electrónica' : posDocType === 'nota_venta' ? 'Nota de Venta' : 'Cotización / Proforma'}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Datos del Cliente */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Datos del Cliente</h4>
                  {(() => {
                    const client = getSelectedClient();
                    return (
                      <div className="p-4 rounded-xl border border-[#CDD1EA] bg-slate-50/50 space-y-2 text-xs text-black">
                        <div>
                          <span className="font-bold text-gray-400 uppercase text-[9px] block">Razón Social / Nombre</span>
                          <span className="font-extrabold text-sm uppercase text-gray-900">{client.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="font-bold text-gray-400 uppercase text-[9px] block">RUC / Cédula</span>
                            <span className="font-bold text-gray-800 font-mono">{client.ruc}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase text-[9px] block">Teléfono</span>
                            <span className="font-bold text-gray-800">{client.telefono || 'N/A'}</span>
                          </div>
                        </div>
                        <div>
                          <span className="font-bold text-gray-400 uppercase text-[9px] block">Correo Electrónico</span>
                          <span className="font-bold text-gray-800">{client.email || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-gray-400 uppercase text-[9px] block">Dirección</span>
                          <span className="font-bold text-gray-800">{client.direccion || 'N/A'}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Resumen de Productos */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Productos en Venta</h4>
                    <span className="text-xs font-bold text-gray-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {cart.reduce((acc, it) => acc + it.quantity, 0)} Items
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-[#CDD1EA] rounded-xl divide-y divide-[#CDD1EA] custom-scrollbar">
                    {cart.map((item, idx) => (
                      <div key={idx} className="p-3 flex justify-between items-center gap-3 bg-white text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-800 truncate uppercase">{item.name}</p>
                          <p className="text-[10px] text-gray-550 mt-0.5">{item.quantity} x ${Number(item.price).toFixed(2)}</p>
                        </div>
                        <span className="font-extrabold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Totales y Botón Abandonar */}
              <div className="mt-6 pt-6 border-t border-[#CDD1EA] space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span>Subtotal</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  {getDiscountAmount() > 0 && (
                    <div className="flex justify-between text-xs font-medium text-red-400">
                      <span>Descuento</span>
                      <span>-${getDiscountAmount().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span>IVA (15%)</span>
                    <span>${getIva().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end pt-2 border-t border-[#CDD1EA]">
                    <span className="text-xs font-extrabold uppercase text-slate-300">Total a Pagar</span>
                    <span className="text-2xl font-black text-white font-mono">${getTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (await window.confirm("¿Seguro que deseas abandonar la venta actual? Se vaciará el carrito y se reiniciará el POS.")) {
                      setCart([]);
                      setSelectedClientId('');
                      setPosDocType('factura');
                      setPosPaymentMethod('efectivo');
                      setReceivedAmount('');
                      setPaymentRefCode('');
                      setShowPaymentScreen(false);
                      showToast("Venta abandonada", "info");
                    }
                  }}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 size={13} />
                  <span>Abandonar Venta (Vaciar)</span>
                </button>
              </div>
            </div>

            {/* COLUMNA DERECHA: MÉTODOS DE PAGO Y CONFIRMACIÓN */}
            <div className="flex-1 flex flex-col p-6 min-h-0 justify-between overflow-y-auto custom-scrollbar">
              <div className="space-y-6 max-w-2xl mx-auto w-full">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-650">Seleccionar Método de Pago</h3>
                
                {/* Tabs de Métodos de Pago */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPosPaymentMethod('efectivo');
                      setReceivedAmount('');
                    }}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold text-xs transition-all ${
                      posPaymentMethod === 'efectivo'
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-white border-slate-200 text-gray-700 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign size={20} />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPosPaymentMethod('transferencia');
                      setReceivedAmount('');
                    }}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold text-xs transition-all ${
                      posPaymentMethod === 'transferencia'
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-white border-slate-200 text-gray-700 hover:bg-slate-50'
                    }`}
                  >
                    <RefreshCw size={20} />
                    <span>Transferencia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPosPaymentMethod('tarjeta');
                      setReceivedAmount('');
                    }}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold text-xs transition-all ${
                      posPaymentMethod === 'tarjeta'
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-white border-slate-200 text-gray-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard size={20} />
                    <span>Tarjeta</span>
                  </button>
                </div>

                {/* Panel de Método de Pago Seleccionado */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
                  {posPaymentMethod === 'efectivo' ? (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black uppercase text-gray-400">Dinero Recibido</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400 font-mono">$</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={receivedAmount}
                            onChange={e => setReceivedAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 text-xl font-black text-gray-900 bg-slate-50/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                          />
                        </div>
                      </div>

                      {/* Billetes Rápidos */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Vuelto Rápido (Billetes)</span>
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => setReceivedAmount(Number(getTotal().toFixed(2)))}
                            className="py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-800 hover:bg-slate-100 transition-colors uppercase"
                          >
                            Exacto
                          </button>
                          {[1, 5, 10, 20, 50, 100].map(bill => (
                            <button
                              type="button"
                              key={bill}
                              onClick={() => setReceivedAmount(bill)}
                              className="py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-extrabold text-gray-800 hover:bg-slate-50 transition-colors font-mono"
                            >
                              ${bill}.00
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vuelto / Mensajes de Control */}
                      {Number(receivedAmount) > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                          {changeDue > 0 ? (
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 flex justify-between items-center">
                              <span className="text-xs font-black uppercase">Vuelto a Entregar:</span>
                              <span className="text-2xl font-black font-mono text-emerald-600">${changeDue.toFixed(2)}</span>
                            </div>
                          ) : remainingDue > 0 ? (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 flex justify-between items-center">
                              <span className="text-xs font-black uppercase">Faltante por Pagar:</span>
                              <span className="text-lg font-black font-mono text-red-600">${remainingDue.toFixed(2)}</span>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 flex justify-between items-center">
                              <span className="text-xs font-black uppercase">Monto Exacto Entregado</span>
                              <span className="text-lg font-black font-mono text-slate-600">$0.00</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Transferencia o Tarjeta */
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black uppercase text-gray-400">Referencia de Transacción / Voucher</label>
                        <input
                          type="text"
                          placeholder="Ej: 982138912"
                          value={paymentRefCode}
                          onChange={e => setPaymentRefCode(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-gray-900 bg-slate-50/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 italic">
                        Nota: Al registrar este pago, el total de ${getTotal().toFixed(2)} se asignará automáticamente a {posPaymentMethod === 'transferencia' ? 'Transferencia Bancaria' : 'Tarjeta de Crédito/Débito'}.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón Finalizar Checkout */}
              <div className="mt-8 max-w-2xl mx-auto w-full">
                <button
                  type="button"
                  onClick={handleFinalCheckout}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={20} />
                  <span>
                    {isProcessing ? 'Procesando...' : 
                      posDocType === 'factura' ? 'Emitir Factura Electrónica (F12)' :
                      posDocType === 'nota_venta' ? 'Emitir Nota de Venta (F12)' :
                      'Guardar Cotización (F12)'
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* POS MAIN AREA (PRODUCTS + CART) */
          <div className={`flex-1 flex overflow-hidden min-h-0 ${posConfig.cartPosition === 'left' ? 'flex-row-reverse' : ''}`}>
        
        {/* LADO IZQUIERDO: SELECCIÓN Y FILTRO DE PRODUCTOS */}
        <div className={`flex-1 flex flex-col pt-[7px] px-3 sm:px-4 lg:px-6 pb-6 min-w-0 bg-white`}>
          
          {/* BARRA DE FILTROS SUPER MINIMALISTA (SIN SOMBRAS) */}
          <div className="flex items-center justify-between gap-4 py-2 mb-4 select-none bg-white shrink-0">
            {/* Left: Filter Icon + Ver Todos + Total Count */}
            <div className="flex items-center gap-2 shrink-0">
              <button 
                type="button"
                onClick={() => {
                  setFilterCategory('all');
                  setFilterBrand('all');
                  setFilterWarehouse('all');
                  setIsSearchModalOpen(true);
                }}
                className="flex items-center gap-2 text-black hover:opacity-80 active:scale-95 transition-transform"
              >
                <SlidersHorizontal size={18} className="text-primary font-bold" />
                <span className="font-extrabold text-sm text-slate-800 tracking-tight">Ver Todos</span>
                <span className="bg-primary text-white text-[11px] font-black px-2 py-0.5 rounded-full select-none">
                  {products.length}
                </span>
              </button>
            </div>

            {/* Middle: Horizontal Category List (Scrollable, Minimalist) */}
            <div className="flex-1 flex items-center gap-3 overflow-x-auto py-1 scrollbar-none custom-scrollbar select-none">
              {categoriesWithCount.map(cat => {
                const isSelected = filterCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setFilterCategory(cat.name)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap bg-transparent ${
                      isSelected 
                        ? 'text-primary font-bold' 
                        : 'text-slate-600 hover:text-primary'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span 
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-full transition-colors ${
                        isSelected ? 'bg-primary text-white' : 'text-primary'
                      }`}
                      style={!isSelected ? { backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' } : {}}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: Grid & List Switcher */}
            <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-100 pl-3">
              <button
                type="button"
                onClick={() => {
                  const newConfig = { ...posConfig, viewType: 'grid' };
                  setPosConfig(newConfig);
                  localStorage.setItem(`pos_config_${appId}`, JSON.stringify(newConfig));
                }}
                className={`p-1.5 rounded transition-colors ${
                  posConfig.viewType === 'grid' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid size={20} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const newConfig = { ...posConfig, viewType: 'list' };
                  setPosConfig(newConfig);
                  localStorage.setItem(`pos_config_${appId}`, JSON.stringify(newConfig));
                }}
                className={`p-1.5 rounded transition-colors ${
                  posConfig.viewType === 'list' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Vista Vista"
              >
                <List size={20} />
              </button>
            </div>
          </div>

          {/* GRID O LISTA DE PRODUCTOS */}
          {posConfig.viewType === 'list' ? (
            /* LIST LAYOUT */
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 p-1 custom-scrollbar">
              {filteredProducts.map(p => {
                const isOutOfStock = p.type === 'producto' && p.inventoryType !== 'VIRTUAL' && p.stock <= 0;
                return (
                  <div 
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-3 border rounded-card flex items-center justify-between gap-4 transition-all cursor-pointer select-none group relative overflow-hidden ${
                      isOutOfStock 
                        ? 'opacity-40 cursor-not-allowed bg-white/[0.005]' 
                        : ('border-primary/15 hover:border-primary/40 hover:bg-primary/5 bg-primary/5')
                    }`}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <img 
                        src={getProductImageUrl(p)} 
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200" 
                        alt={p.name} 
                        onError={(e) => {
                          e.target.src = '/product.svg';
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500 shrink-0">{p.sku}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase shrink-0 ${p.type === 'producto' ? 'bg-primary/10 text-primary' : 'bg-purple-500/10 text-purple-400'}`}>{p.type}</span>
                        </div>
                        <h4 className={`text-sm sm:text-base font-bold leading-snug truncate text-black`}>{p.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{p.marca || 'Sin Marca'} | {p.categoria || 'General'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {posConfig.showStock && p.type === 'producto' && (() => {
                        if (p.inventoryType === 'VIRTUAL') {
                          return (
                            <span className="text-xs text-gray-400 italic">Virtual (N/A)</span>
                          );
                        }
                        const minStk = p.minStock !== undefined ? Number(p.minStock) : 2;
                        const isCritical = p.stock <= minStk;
                        return (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${
                            isCritical 
                              ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse font-black' 
                              : ('bg-emerald-50 border-emerald-250 text-emerald-700')
                          }`}>
                            {p.bodega || 'Central'}: {p.stock}
                          </span>
                        );
                      })()}
                      <div className="text-right shrink-0">
                        <span className={`text-base font-black block text-black`}>${Number(p.price).toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                        }}
                        className={`btn-icon bg-primary text-white ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            <div className={`flex-1 overflow-y-auto grid ${getGridColsClass()} gap-3 p-3 pb-6 content-start custom-scrollbar`}>
              {filteredProducts.map(p => {
                const isOutOfStock = p.type === 'producto' && p.inventoryType !== 'VIRTUAL' && p.stock <= 0;
                const minStk = p.minStock !== undefined ? Number(p.minStock) : 2;
                const isLowStock = p.type === 'producto' && p.inventoryType !== 'VIRTUAL' && p.stock <= minStk && p.stock > 0;
                
                const cartItem = cart.find(item => item.productId === p.id);
                const quantityInCart = cartItem ? cartItem.quantity : 0;
                
                // Determinar el color del punto de stock (verde por defecto para servicios/virtuales)
                let stockDotColor = 'bg-emerald-500';
                if (isOutOfStock) stockDotColor = 'bg-red-500';
                else if (isLowStock) stockDotColor = 'bg-amber-500';

                const imageUrl = getProductImageUrl(p);
                const isPlaceholder = imageUrl === '/product.svg';

                return (
                  <div 
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-[3px] border border-[#CDD1EA] rounded-2xl bg-white flex flex-col transition-all cursor-pointer select-none group relative shadow-sm hover:shadow-md hover:border-primary/45 h-[190px] shrink-0 ${
                      isOutOfStock 
                        ? 'cursor-not-allowed' 
                        : 'hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Botón flotante superior derecho (más o cantidad) */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isOutOfStock) addToCart(p);
                      }}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 select-none z-10 font-bold"
                    >
                      {quantityInCart > 0 ? (
                        <span className="text-xs">{quantityInCart}</span>
                      ) : (
                        <Plus size={14} />
                      )}
                    </div>

                    {/* Contenedor de Imagen y Badge de SKU */}
                    <div className="w-full flex-1 rounded-xl bg-white flex items-center justify-center relative overflow-hidden">
                      <div className={`w-full h-full ${isOutOfStock ? 'opacity-40' : ''}`}>
                        {isPlaceholder ? (
                          <div className="w-full h-full bg-[#f1f5f9] flex items-center justify-center text-slate-400">
                            <Box size={52} strokeWidth={1} className="text-slate-400" />
                          </div>
                        ) : (
                          <img 
                            src={imageUrl} 
                            className="w-full h-full object-cover" 
                            alt={p.name} 
                            onError={(e) => {
                              e.target.src = '/product.svg';
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Badge de SKU y stock dot (pegado al borde radius izquierdo superior) */}
                      <div 
                        className="absolute top-0 left-0 px-2.5 py-1 rounded-tl-xl rounded-br-xl flex items-center gap-1.5 z-10"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${stockDotColor}`}></span>
                        <span 
                          className="font-mono text-[9px] truncate max-w-[80px]"
                          style={{
                            color: 'color-mix(in srgb, var(--primary) 70%, black)',
                            fontWeight: 350
                          }}
                        >
                          {p.sku || 'N/A'}
                        </span>
                      </div>

                      {/* Texto de Sin Stock (Centrado en azul, sin fondo) */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                          <span className="text-[13px] font-black text-blue-600 tracking-widest uppercase">
                            SIN STOCK
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Información inferior (Nombre y Precio) */}
                    <div className="mt-1.5 px-2 pb-1.5 flex justify-between items-end gap-2 shrink-0">
                      <h4 
                        className={`text-xs font-semibold leading-snug line-clamp-2 flex-1 select-none text-left ${
                          isOutOfStock ? 'text-slate-400' : 'text-slate-800'
                        }`} 
                        title={p.name}
                      >
                        {p.name}
                      </h4>
                      <span className={`text-base font-black shrink-0 font-mono ${
                        isOutOfStock ? 'text-red-500' : 'text-primary'
                      }`}>
                        ${Number(p.price).toFixed(2)}
                      </span>
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

          {/* LEYENDA DE STOCK AL PIE DEL CATÁLOGO */}
          {posConfig.showStock && (
            <div className={`mt-4 pt-3 border-t flex items-center gap-4 text-xs uppercase font-extrabold tracking-wider shrink-0 ${
              'border-primary/15 text-primary'}`}>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                En Stock
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                Bajo Stock
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                Sin Stock / Servicio
              </span>
            </div>
          )}
        </div>

        {/* LADO DERECHO: DETALLE DEL PEDIDO (CHECKOUT FIJO) */}
        <div className={`w-full lg:w-[32rem] xl:w-[38rem] flex flex-col shrink-0 border-l bg-white border-slate-100`}>


          
          {/* CABECERA DETALLE DEL PEDIDO */}
          <div className="px-4 py-2 border-b flex justify-between items-center shrink-0 bg-white border-slate-100 gap-2">
            {/* Left: Items + count */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">Items</span>
              <span className="bg-[#f0f3ff] text-primary text-xs font-extrabold px-2 py-0.5 rounded-full select-none">
                {cart.reduce((acc, it) => acc + it.quantity, 0)}
              </span>
            </div>

            {/* Right: Descuento, Guardar Borrador, Vaciar */}
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setIsDiscountOpen(prev => !prev)} 
                className="flex items-center gap-1.5 px-3 py-1 h-8 rounded-lg bg-white border border-[#CDD1EA] text-slate-700 hover:text-primary hover:border-primary transition-colors text-xs font-bold select-none cursor-pointer"
              >
                <Tag size={12} className="text-primary" />
                <span>Descuento</span>
              </button>
              <button 
                type="button"
                onClick={suspendSale} 
                className="flex items-center gap-1.5 px-3 py-1 h-8 rounded-lg bg-white border border-[#CDD1EA] text-slate-700 hover:text-primary hover:border-primary transition-colors text-xs font-bold select-none cursor-pointer"
              >
                <Bookmark size={12} className="text-primary" />
                <span>Guardar Borrador</span>
              </button>
              <button 
                type="button"
                onClick={() => setCart([])} 
                className="flex items-center gap-1.5 px-3 py-1 h-8 rounded-lg bg-white border border-[#CDD1EA] text-red-500 hover:bg-red-50 hover:border-red-500 transition-colors text-xs font-bold select-none cursor-pointer"
              >
                <Trash2 size={12} className="text-red-500" />
                <span>Vaciar</span>
              </button>
            </div>
          </div>

          {/* LISTA CARRITO POS */}
          <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-slate-100 custom-scrollbar bg-white">
            {cart.map((item, idx) => {
              const prod = products.find(p => p.id === item.productId);
              return (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3 bg-white">
                  {/* Imagen o iniciales */}
                  <img 
                    src={getProductImageUrl(prod)} 
                    className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-100" 
                    alt={item.name} 
                    onError={(e) => {
                      e.target.src = '/product.svg';
                    }}
                  />

                  {/* Nombre, SKU y precio unitario */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold truncate text-black" title={item.name}>{item.name}</h4>
                    <p className="text-[9px] text-gray-500 font-mono">{prod?.sku || 'SKU N/A'}</p>
                    {item.discount_value > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 animate-in fade-in duration-200">
                        <span className="bg-red-50 text-red-500 font-bold text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Tag size={8} /> -{item.discount_type === 'PORCENTAJE' ? `${item.discount_value}%` : `$${item.discount_value}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Selector de Cantidad */}
                  <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg p-0.5 shrink-0">
                    <button 
                      type="button" 
                      onClick={() => updateQuantity(item.productId, -1)} 
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-slate-200 rounded-md transition-colors"
                      title="Disminuir cantidad"
                    >
                      <Minus size={11} />
                    </button>
                    
                    <input 
                      type="number" 
                      min="1"
                      value={item.quantity} 
                      onChange={e => {
                        const val = parseInt(e.target.value) || 1;
                        if (prod && prod.type === 'producto' && prod.inventoryType !== 'VIRTUAL' && val > prod.stock) {
                          showToast("Excede stock disponible", "error");
                          return;
                        }
                        setCart(cart.map(i => i.productId === item.productId ? { ...i, quantity: val } : i));
                      }}
                      className="w-10 text-center text-xs font-bold bg-transparent border-none outline-none focus:ring-0 text-black p-0"
                    />

                    <button 
                      type="button" 
                      onClick={() => updateQuantity(item.productId, 1)} 
                      className="w-6 h-6 flex items-center justify-center text-primary hover:bg-slate-200 rounded-md transition-colors"
                      title="Aumentar cantidad"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Subtotal, Botón Descuento e Ícono de Eliminar */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-bold text-xs text-right min-w-[55px] text-black">
                      {item.discount_value > 0 && (
                        <span className="line-through text-gray-450 mr-1.5">${(item.price * item.quantity).toFixed(2)}</span>
                      )}
                      ${(totalsResult.items?.[idx]?.subtotal_neto_linea || item.price * item.quantity).toFixed(2)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedLineItemForDiscount(item)} 
                      className={`p-1 rounded-lg border transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
                        item.discount_value > 0
                          ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                          : 'bg-white text-slate-550 border-slate-200 hover:text-primary hover:border-primary'
                      }`}
                      title="Descuento del ítem"
                    >
                      <Percent size={11} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => removeFromCart(item.productId)} 
                      className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                      title="Eliminar del carrito"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-16">
                <ShoppingCart size={36} className="opacity-20 mb-2 animate-pulse text-primary" />
                <p className="text-xs italic">Carrito de Venta Vacío</p>
              </div>
            )}
          </div>

          {/* ACCIONES Y TOTALES */}
          <div className={`p-4 border-t space-y-4 shrink-0 border-slate-100 bg-primary/5`}>
            {/* DESCUENTO CARD */}
            {isDiscountOpen && (
              <div className="p-3 rounded-card border space-y-2 border-slate-150 bg-white shadow-none animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Descuento General</span>
                  <button 
                    type="button"
                    onClick={() => { setIsDiscountOpen(false); setSelectedGeneralDiscount(null); }} 
                    className="p-1 text-gray-550 hover:text-black hover:bg-slate-50 rounded-md transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  <select 
                    value={selectedGeneralDiscount?.id || ''} 
                    onChange={e => {
                      const discId = e.target.value;
                      if (!discId) {
                        setSelectedGeneralDiscount(null);
                        return;
                      }
                      const disc = discounts.find(d => d.id === discId);
                      if (disc) {
                        if (disc.requiere_autorizacion) {
                          setAuthDialog({
                            discount: disc,
                            onConfirm: () => {
                              setSelectedGeneralDiscount(disc);
                              showToast("Descuento autorizado y aplicado", "success");
                            },
                            onCancel: () => {
                              setSelectedGeneralDiscount(null);
                            }
                          });
                        } else {
                          setSelectedGeneralDiscount(disc);
                        }
                      }
                    }} 
                    className="w-full text-xs px-2.5 py-2 rounded-xl border outline-none bg-white border-[#CDD1EA] text-black cursor-pointer font-semibold"
                  >
                    <option value="">-- Seleccionar Descuento General --</option>
                    {getActiveDiscounts('VENTA').map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : `$${d.valor}`})
                      </option>
                    ))}
                  </select>
                  {selectedGeneralDiscount && (
                    <div className="flex justify-between items-center text-[10px] text-slate-500 bg-indigo-50/50 p-2 rounded-lg border border-indigo-105">
                      <span>Aplicado: <strong>{selectedGeneralDiscount.nombre}</strong></span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedGeneralDiscount(null)} 
                        className="text-red-500 font-bold hover:text-red-755 cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs md:text-sm">
              <div className={`flex justify-between text-slate-600 font-semibold`}>
                <span>Subtotal Bruto</span>
                <span>${getSubtotal().toFixed(2)}</span>
              </div>
              {productDiscountsTotal > 0 && (
                <div className="flex justify-between text-red-500 font-bold">
                  <span>Descuentos por Producto</span>
                  <span>-${productDiscountsTotal.toFixed(2)}</span>
                </div>
              )}
              {getDiscountAmount() > 0 && (
                <div className="flex justify-between text-red-500 font-bold">
                  <span>Descuento General</span>
                  <span>-${getDiscountAmount().toFixed(2)}</span>
                </div>
              )}
              <div className={`flex justify-between text-slate-600 font-semibold`}>
                <span>Impuestos (IVA)</span>
                <span>${getIva().toFixed(2)}</span>
              </div>
              <div className={`flex justify-between font-black text-sm md:text-base pt-2.5 border-t border-primary/10 text-slate-800`}>
                <span>TOTAL A PAGAR</span>
                <span className={'text-primary text-base md:text-lg'}>${getTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-4 pt-1">
              <button 
                type="button" 
                onClick={playCashRegisterSound}
                className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
                title="Simular Apertura de Gaveta de Dinero"
              >
                <Unlock size={13} className="text-primary" /> Abrir Gaveta
              </button>
              <button 
                type="button" 
                onClick={() => {
                  if (cart.length === 0) {
                    showToast("Alerta: El carrito está vacío", "error");
                    return;
                  }
                  if (!selectedClientId) {
                    showToast("Alerta: No se seleccionó ningún cliente", "error");
                    return;
                  }
                  // Entrar a la pantalla inline de Cobro e Impresión
                  setReceivedAmount('');
                  setPosPaymentMethod('efectivo');
                  setPaymentRefCode('');
                  setShowPaymentScreen(true);
                }}
                className="btn-primary flex-[2] flex items-center justify-center gap-2"
              >
                <Sparkles size={13} /> Cobrar (F12)
              </button>
            </div>
          </div>

          </div>

        </div>
        )}
      </div>

      {/* DRAWER DE CONFIGURACIÓN DEL POS */}
      {isConfigOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[120] bg-black/60 animate-in fade-in duration-200"
            onClick={() => setIsConfigOpen(false)}
          />
          {/* Drawer Panel */}
          <div className={`fixed top-0 right-0 h-full w-80 z-[130] flex flex-col border-l animate-in slide-in-from-right duration-300 ${
            'bg-surface-card border-primary/15 text-text-secondary'}`}>
            <div className={`p-4 border-b flex items-center justify-between shrink-0 border-primary/15 bg-primary-light`}>
              <div className="flex items-center gap-2">
                <Settings size={16} className={'text-text-secondary'} />
                <h3 className="text-xs font-black uppercase tracking-wider">Gestión del POS</h3>
              </div>
              <button 
                onClick={() => setIsConfigOpen(false)} 
                className="btn-icon"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500">Diseño de Productos</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, viewType: 'grid' }))}
                    className={`py-2.5 rounded-btn text-xs font-bold border transition-all ${posConfig.viewType === 'grid' ? 'bg-primary border-primary text-white' : ('bg-white border-primary/15 text-text-secondary hover:bg-primary-light')}`}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, viewType: 'list' }))}
                    className={`py-2.5 rounded-btn text-xs font-bold border transition-all ${posConfig.viewType === 'list' ? 'bg-primary border-primary text-white' : ('bg-white border-primary/15 text-text-secondary hover:bg-primary-light')}`}
                  >
                    Lista
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500">Filtros de Búsqueda</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, showCarousel: false }))}
                    className={`py-2.5 rounded-btn text-xs font-bold border transition-all ${!posConfig.showCarousel ? 'bg-primary border-primary text-white' : ('bg-white border-primary/15 text-text-secondary hover:bg-primary-light')}`}
                  >
                    Normales
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, showCarousel: true }))}
                    className={`py-2.5 rounded-btn text-xs font-bold border transition-all ${posConfig.showCarousel ? 'bg-primary border-primary text-white' : ('bg-white border-primary/15 text-text-secondary hover:bg-primary-light')}`}
                  >
                    Carrusel
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500">Posición Detalle</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, cartPosition: 'left' }))}
                    className={`py-2.5 rounded-btn text-xs font-bold border transition-all ${posConfig.cartPosition === 'left' ? 'bg-primary border-primary text-white' : ('bg-white border-primary/15 text-text-secondary hover:bg-primary-light')}`}
                  >
                    Izquierda
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, cartPosition: 'right' }))}
                    className={`py-2.5 rounded-btn text-xs font-bold border transition-all ${posConfig.cartPosition === 'right' ? 'bg-primary border-primary text-white' : ('bg-white border-primary/15 text-text-secondary hover:bg-primary-light')}`}
                  >
                    Derecha
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500">Buscador y Lector</label>
                <button
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, barcodeMode: !prev.barcodeMode }))}
                  className={`w-full py-3 px-4 rounded-btn text-xs font-bold border transition-all flex items-center justify-between ${
                    posConfig.barcodeMode
                      ? 'bg-primary border-primary text-white'
                      : ('bg-primary-light border-primary/15 text-text-secondary hover:bg-primary-light')
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Barcode size={14} /> Modo Lector
                  </span>
                  <span className="text-xs font-extrabold">{posConfig.barcodeMode ? 'ACTIVO' : 'INACTIVO'}</span>
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500">Checkout Exprés</label>
                <button
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, expressCheckout: !prev.expressCheckout }))}
                  className={`w-full py-3 px-4 rounded-btn text-xs font-bold border transition-all flex items-center justify-between ${
                    posConfig.expressCheckout
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : ('bg-primary-light border-primary/15 text-text-secondary hover:bg-primary-light')
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Zap size={14} /> Checkout 1-Paso
                  </span>
                  <span className="text-xs font-extrabold">{posConfig.expressCheckout ? 'ACTIVO' : 'INACTIVO'}</span>
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500">Privacidad Stock</label>
                <button
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, showStock: !prev.showStock }))}
                  className={`w-full py-3 px-4 rounded-btn text-xs font-bold border transition-all flex items-center justify-between ${
                    posConfig.showStock
                      ? 'bg-primary border-primary text-white'
                      : ('bg-primary-light border-primary/15 text-text-secondary hover:bg-primary-light')
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Eye size={14} /> Mostrar Stock
                  </span>
                  <span className="text-xs font-extrabold">{posConfig.showStock ? 'ACTIVO' : 'INACTIVO'}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* APERTURA Y CIERRE DE CAJA DIALOG */}
      {isClosingOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-card border transition-all duration-300 ${
            'bg-white border-primary/15 text-black'}`}>
            <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-red-500">
              <ShieldAlert size={16} /> Arqueo y Cierre de Caja
            </h3>
            <p className={`text-xs mb-4 leading-normal text-gray-900 font-bold`}>
              Verifica los montos acumulados por ventas en esta sesión y digita los valores reales contados.
            </p>

            <form onSubmit={handleCloseSession} className="space-y-4">
              <div className="space-y-2 text-xs">
                <div className={`grid grid-cols-2 gap-2 font-bold border-b pb-2 text-xs uppercase ${
                  'text-black border-primary/10'}`}>
                  <span>Método de Pago</span>
                  <span className="text-right">Físico / Real</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-bold text-black`}>Efectivo en Caja</p>
                    <p className={`text-xs text-gray-900 font-bold`}>
                      Esperado: ${(Number(activeSession.initialAmount || 0) + sessionTxs.filter(t => t.paymentMethod === 'efectivo' && t.sriStatus !== 'anulado').reduce((acc, t) => acc + Number(t.total || 0), 0)).toFixed(2)} (inc. Fondo)
                    </p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.efectivoReal} onChange={e => setClosingForm({...closingForm, efectivoReal: e.target.value})} className={`glass-input-light w-24 text-right px-2 py-1.5 rounded-lg border`} />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-bold text-black`}>Tarjeta Débito/Crédito</p>
                    <p className={`text-xs text-gray-900 font-bold`}>
                      Esperado: ${sessionTxs.filter(t => t.paymentMethod === 'tarjeta').reduce((acc, t) => acc + Number(t.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.tarjetaReal} onChange={e => setClosingForm({...closingForm, tarjetaReal: e.target.value})} className={`glass-input-light w-24 text-right px-2 py-1.5 rounded-lg border`} />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-bold text-black`}>Transferencias</p>
                    <p className={`text-xs text-gray-900 font-bold`}>
                      Esperado: ${sessionTxs.filter(t => t.paymentMethod === 'transferencia').reduce((acc, t) => acc + Number(t.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.transferenciaReal} onChange={e => setClosingForm({...closingForm, transferenciaReal: e.target.value})} className={`glass-input-light w-24 text-right px-2 py-1.5 rounded-lg border`} />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-bold text-black`}>Cruce de Cuentas</p>
                    <p className={`text-xs text-gray-900 font-bold`}>
                      Esperado: ${sessionTxs.filter(t => t.paymentMethod === 'cruce_cuentas').reduce((acc, t) => acc + Number(t.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <input type="number" step="0.01" value={closingForm.cruceReal} onChange={e => setClosingForm({...closingForm, cruceReal: e.target.value})} className={`glass-input-light w-24 text-right px-2 py-1.5 rounded-lg border`} />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 text-black`}>Observaciones Arqueo</label>
                <textarea value={closingForm.notes} onChange={e => setClosingForm({...closingForm, notes: e.target.value})} className={`glass-input-light min-h-[50px] w-full px-2.5 py-2 rounded-card border`} placeholder="Escribe discrepancias si las hay..." />
              </div>

              <div className={`flex justify-end gap-2.5 mt-6 pt-3 border-t border-primary/15`}>
                <button type="button" onClick={() => setIsClosingOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-danger">Confirmar y Cerrar Caja</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT WIZARD MODAL (FULLSCREEN PASOS) */}
      {isCheckoutOpen && (
        <div className={`fixed inset-0 z-[110] flex flex-col overflow-hidden animate-in fade-in duration-200 ${
          'bg-surface-card text-text-secondary'}`}>
          <div className="flex-1 flex flex-col overflow-hidden max-h-screen transition-all duration-300">
            
            {/* WIZARD PROGRESS HEADER */}
            <div className={`px-6 py-4.5 border-b flex items-center justify-between shrink-0 ${
              'border-primary/15 bg-primary-light text-black'}`}>
              <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-primary" />
                  <h3 className="text-base font-black uppercase tracking-wider">Checkout Comercial POS</h3>
                </div>
                {posConfig.expressCheckout ? (
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    ⚡ MODO EXPRÉS (PASO ÚNICO)
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <span className={checkoutStep === 1 ? 'text-primary' : ('text-gray-500')}>1. Cliente</span>
                    <ChevronRight size={11} className={'text-gray-400'} />
                    <span className={checkoutStep === 2 ? 'text-primary' : ('text-gray-500')}>2. Métodos de Pago</span>
                    <ChevronRight size={11} className={'text-gray-400'} />
                    <span className={checkoutStep === 3 ? 'text-primary' : ('text-gray-500')}>3. Emisión</span>
                  </div>
                )}
                <button onClick={() => setIsCheckoutOpen(false)} className="btn-icon"><X size={17}/></button>
              </div>
            </div>

            {/* WIZARD CONTENT */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto w-full space-y-6">
              
              {posConfig.expressCheckout ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm">
                  {/* COLUMNA IZQUIERDA: CLIENTE Y DETALLE */}
                  <div className="space-y-4">
                    {/* CLIENTE */}
                    <div className={`p-4 rounded-card border space-y-3 bg-primary/5 border-primary/15`}>
                      <h4 className={`text-sm md:text-base font-bold uppercase tracking-wider text-black`}>Cliente de la Venta</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <select 
                            value={selectedClientId} 
                            onChange={e => setSelectedClientId(e.target.value)} 
                            className={`w-full text-sm md:text-base font-semibold px-3 py-2.5 outline-none rounded-card border ${
                              'border-primary/20 bg-white text-black'}`}
                          >
                            <option value="" className={'text-black bg-white'}>Consumidor Final (9999999999999)</option>
                            {thirdParties.filter(tp => tp.type !== 'proveedor' && tp.type !== 'empleado').map(tp => (
                              <option key={tp.id} value={tp.id} className={'text-black bg-white'}>{tp.name} - RUC: {String(tp.ruc)}</option>
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
                          className="btn-primary shrink-0"
                        >
                          Crear
                        </button>
                      </div>
                    </div>

                    {/* DATOS CLIENTE */}
                    <div className={`p-4 rounded-card border space-y-2 text-xs md:text-sm ${
                      'border-primary/15 bg-primary/5 text-black'}`}>
                      <p className={`font-bold text-black`}>Datos Facturación del Receptor:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm md:text-base pt-1">
                        <p><span className={`font-bold uppercase text-primary`}>Razón Social:</span> {getSelectedClient().name}</p>
                        <p><span className={`font-bold uppercase text-primary`}>Identificación:</span> {getSelectedClient().ruc}</p>
                        <p><span className={`font-bold uppercase text-primary`}>Teléfono:</span> {getSelectedClient().telefono || '-'}</p>
                        <p><span className={`font-bold uppercase text-primary`}>Email:</span> {getSelectedClient().email || '-'}</p>
                        <p className="col-span-2"><span className={`font-bold uppercase text-primary`}>Dirección:</span> {getSelectedClient().direccion || '-'}</p>
                      </div>
                    </div>

                    {/* PREVISUALIZACION DETALLE */}
                    <div className={`p-4 rounded-card border space-y-3 text-xs md:text-sm ${
                      'border-primary/15 bg-primary/5 text-black'}`}>
                      <h4 className={`text-sm md:text-base font-bold uppercase tracking-wider text-black`}>Ítems a Facturar</h4>
                      <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar text-xs md:text-sm">
                        {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="opacity-80">{item.quantity}x {item.name}</span>
                            <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className={`border-t pt-2.5 mt-2 flex justify-between font-black text-xs md:text-sm border-primary/15 text-black`}>
                        <span>Subtotal: ${(getSubtotal() + getIva()).toFixed(2)}</span>
                        {getDiscountAmount() > 0 && <span className="text-red-500 font-bold">Desc: -${getDiscountAmount().toFixed(2)}</span>}
                        <span className={'text-primary'}>TOTAL: ${totalToPay.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: METODOS DE PAGO Y VUELTO */}
                  <div className="space-y-4">
                    <div className={`p-4 rounded-card border flex justify-between items-center ${
                      'bg-primary-light border-primary/25 text-primary'}`}>
                      <span className="text-sm font-bold">TOTAL A COBRAR:</span>
                      <span className="text-2xl font-black">${totalToPay.toFixed(2)}</span>
                    </div>

                    <div className="space-y-3">
                      <h4 className={`text-xs font-bold uppercase tracking-wider text-black`}>Medios de Pago (Admite Combinados)</h4>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        {[
                          { id: 'efectivo', label: 'Efectivo', icon: DollarSign, key: 'efectivo' },
                          { id: 'transferencia', label: 'Transf.', icon: RefreshCw, key: 'transferencia' },
                          { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, key: 'tarjeta' },
                          { id: 'cruce_cuentas', label: 'Crédito', icon: User, key: 'cruce_cuentas' }
                        ].map(m => {
                          const isSelected = activePayments[m.key];
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setActivePayments(prev => {
                                  const updated = { ...prev, [m.key]: !prev[m.key] };
                                  if (!updated[m.key]) {
                                    setPayments(p => ({ ...p, [m.key]: 0 }));
                                  } else {
                                    const ef = m.key === 'efectivo' ? 0 : Number(payments.efectivo) || 0;
                                    const tr = m.key === 'transferencia' ? 0 : Number(payments.transferencia) || 0;
                                    const tj = m.key === 'tarjeta' ? 0 : Number(payments.tarjeta) || 0;
                                    const cr = m.key === 'cruce_cuentas' ? 0 : Number(payments.cruce_cuentas) || 0;
                                    const remaining = Math.max(0, totalToPay - ef - tr - tj - cr);
                                    setPayments(p => ({ ...p, [m.key]: remaining > 0 ? remaining.toFixed(2) : '' }));
                                  }
                                  return updated;
                                });
                              }}
                              className={`flex flex-col items-center justify-center p-2 rounded-btn border transition-all gap-1 ${
                                isSelected 
                                  ? 'bg-primary border-primary text-white'
                                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                            >
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                                <m.icon size={12} />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wide">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Efectivo */}
                        {activePayments.efectivo && (
                          <div className={`p-3 rounded-card border space-y-1.5 border-primary/15 bg-primary/5`}>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs font-bold block">Efectivo ($)</span>
                              <span className={`text-xs font-bold uppercase text-gray-400`}>Monto Recibido</span>
                            </div>
                            <input type="number" step="0.01" value={payments.efectivo || ''} onChange={e => setPayments({...payments, efectivo: e.target.value})} className={'glass-input-light px-3 py-2 w-full text-sm font-semibold rounded-lg border'} placeholder="0.00" />
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {[10, 20, 50].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    const current = Number(payments.efectivo) || 0;
                                    setPayments({ ...payments, efectivo: (current + val).toFixed(2) });
                                  }}
                                  className={`px-1.5 py-0.5 text-xs font-bold rounded-btn border transition-colors ${
                                    'border-primary/15 bg-white text-primary hover:bg-primary-light'}`}
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
                                className={`px-1.5 py-0.5 text-xs font-bold rounded-btn border transition-colors ${
                                  'border-primary/25 bg-primary-light text-primary hover:bg-primary/10'}`}
                              >
                                Exacto
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tarjeta */}
                        {activePayments.tarjeta && (
                          <div className={`p-3 rounded-card border space-y-1.5 border-primary/15 bg-primary/5`}>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs font-bold block">Tarjeta ($)</span>
                              <span className={`text-xs font-bold uppercase text-gray-400`}>Monto Tarjeta</span>
                            </div>
                            <input type="number" step="0.01" value={payments.tarjeta || ''} onChange={e => setPayments({...payments, tarjeta: e.target.value})} className={'glass-input-light px-2 py-1.5 w-full text-xs rounded-lg border'} placeholder="0.00" />
                            <input type="text" value={payments.tarjetaRef} onChange={e => setPayments({...payments, tarjetaRef: e.target.value})} className={`glass-input-light px-2 py-1 w-full text-xs rounded-lg border`} placeholder="Ref/Aut" />
                          </div>
                        )}

                        {/* Transferencia */}
                        {activePayments.transferencia && (
                          <div className={`p-3 rounded-card border space-y-1.5 border-primary/15 bg-primary/5`}>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs font-bold block">Transferencia ($)</span>
                              <span className={`text-xs font-bold uppercase text-gray-400`}>Monto Transferido</span>
                            </div>
                            <input type="number" step="0.01" value={payments.transferencia || ''} onChange={e => setPayments({...payments, transferencia: e.target.value})} className={'glass-input-light px-2 py-1.5 w-full text-xs rounded-lg border'} placeholder="0.00" />
                            <input type="text" value={payments.transferenciaRef} onChange={e => setPayments({...payments, transferenciaRef: e.target.value})} className={`glass-input-light px-2 py-1 w-full text-xs rounded-lg border`} placeholder="Nro Ref" />
                          </div>
                        )}

                        {/* Cruce de Cuentas */}
                        {activePayments.cruce_cuentas && (
                          <div className={`p-3 rounded-card border space-y-1.5 border-primary/15 bg-primary/5`}>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs font-bold block">Cruce Cuentas ($)</span>
                              <span className={`text-xs font-bold uppercase text-gray-400`}>Monto Crédito</span>
                            </div>
                            <input type="number" step="0.01" value={payments.cruce_cuentas || ''} onChange={e => setPayments({...payments, cruce_cuentas: e.target.value})} className={'glass-input-light px-2 py-1.5 w-full text-xs rounded-lg border'} placeholder="0.00" />
                            <input type="text" value={payments.cruceRef} onChange={e => setPayments({...payments, cruceRef: e.target.value})} className={`glass-input-light px-2 py-1 w-full text-xs rounded-lg border`} placeholder="Nro Doc" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-card space-y-1 text-sm font-mono border bg-primary/5 border-primary/15 text-black`}>
                      <div className="flex justify-between">
                        <span>Total Pagado:</span>
                        <span className={`font-bold text-black`}>${paidTotal.toFixed(2)}</span>
                      </div>
                      {remainingDue > 0 ? (
                        <div className="flex justify-between text-yellow-500 font-bold animate-pulse">
                          <span>Falta Pagar:</span>
                          <span>${remainingDue.toFixed(2)}</span>
                        </div>
                      ) : (
                        <div className={`flex justify-between font-bold border-t pt-1 text-emerald-650 border-primary/15`}>
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
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 text-xs md:text-sm">
                      <div className={`p-4 rounded-card border space-y-3 bg-primary/5 border-primary/15`}>
                        <h4 className={`text-xs md:text-sm font-bold uppercase tracking-wider text-black`}>Cliente de la Venta</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <select 
                              value={selectedClientId} 
                              onChange={e => setSelectedClientId(e.target.value)} 
                              className={`w-full text-xs md:text-sm font-semibold px-3 py-2.5 outline-none rounded-card border ${
                                'border-primary/20 bg-white text-black'}`}
                            >
                              <option value="" className={'text-black bg-white'}>Consumidor Final (9999999999999)</option>
                              {thirdParties.filter(tp => tp.type !== 'proveedor' && tp.type !== 'empleado').map(tp => (
                                <option key={tp.id} value={tp.id} className={'text-black bg-white'}>{tp.name} - RUC: {String(tp.ruc)}</option>
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
                            className="btn-primary shrink-0"
                          >
                            Crear Nuevo Cliente
                          </button>
                        </div>
                      </div>

                      <div className={`p-4 rounded-card border space-y-3 bg-primary/5 border-primary/15`}>
                        <h4 className={`text-xs md:text-sm font-bold uppercase tracking-wider text-black`}>Tipo de Documento a Emitir</h4>
                        {sriConfig?.rucActivo === false && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded-card flex items-center gap-2 text-xs font-semibold">
                            <ShieldAlert size={16} className="shrink-0" />
                            <span>Facturación electrónica deshabilitada (RUC inactivo). Solo se permiten Recibos.</span>
                          </div>
                        )}
                        <select 
                          value={posDocType} 
                          onChange={e => {
                            if (sriConfig?.rucActivo === false && e.target.value === 'factura') {
                              showToast("El RUC de la empresa está inactivo. Solo puede emitir Recibos.", "error");
                              return;
                            }
                            setPosDocType(e.target.value);
                          }} 
                          className={`w-full text-xs md:text-sm font-semibold px-3 py-2.5 outline-none rounded-card border ${
                            'border-primary/20 bg-white text-black'}`}
                        >
                          <option value="factura" disabled={sriConfig?.rucActivo === false} className={'text-black bg-white'}>
                            Factura Electrónica {sriConfig?.rucActivo === false ? '(Bloqueado - RUC Inactivo)' : ''}
                          </option>
                          <option value="nota_venta" className={'text-black bg-white'}>Recibo (Nota de Venta)</option>
                        </select>
                      </div>

                      <div className={`p-4 rounded-card border space-y-2 text-xs md:text-sm ${
                        'border-primary/15 bg-primary/5 text-black'}`}>
                        <p className={`font-bold text-black`}>Datos Facturación del Receptor:</p>
                        <div className="grid grid-cols-2 gap-3 text-xs md:text-sm pt-1">
                          <p><span className={`font-bold uppercase text-primary`}>Razón Social:</span> {getSelectedClient().name}</p>
                          <p><span className={`font-bold uppercase text-primary`}>Identificación:</span> {getSelectedClient().ruc}</p>
                          <p><span className={`font-bold uppercase text-primary`}>Teléfono:</span> {getSelectedClient().telefono || '-'}</p>
                          <p><span className={`font-bold uppercase text-primary`}>Email:</span> {getSelectedClient().email || '-'}</p>
                          <p className="col-span-2"><span className={`font-bold uppercase text-primary`}>Dirección:</span> {getSelectedClient().direccion || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 2: METODOS DE PAGO */}
                  {checkoutStep === 2 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 text-xs md:text-sm">
                      <div className={`p-4.5 rounded-card border flex justify-between items-center ${
                        'bg-primary-light border-primary/25 text-primary'}`}>
                        <span className="text-sm md:text-base font-black">TOTAL A PAGAR:</span>
                        <span className="text-xl font-black">${totalToPay.toFixed(2)}</span>
                      </div>

                      <div className="space-y-3">
                        <h4 className={`text-xs md:text-sm font-bold uppercase tracking-wider text-black`}>Medios de Pago (Admite combinados)</h4>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                          {[
                            { id: 'efectivo', label: 'Efectivo', icon: DollarSign, key: 'efectivo' },
                            { id: 'transferencia', label: 'Transf.', icon: RefreshCw, key: 'transferencia' },
                            { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, key: 'tarjeta' },
                            { id: 'cruce_cuentas', label: 'Crédito', icon: User, key: 'cruce_cuentas' }
                          ].map(m => {
                            const isSelected = activePayments[m.key];
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setActivePayments(prev => {
                                    const updated = { ...prev, [m.key]: !prev[m.key] };
                                    if (!updated[m.key]) {
                                      setPayments(p => ({ ...p, [m.key]: 0 }));
                                    } else {
                                      const ef = m.key === 'efectivo' ? 0 : Number(payments.efectivo) || 0;
                                      const tr = m.key === 'transferencia' ? 0 : Number(payments.transferencia) || 0;
                                      const tj = m.key === 'tarjeta' ? 0 : Number(payments.tarjeta) || 0;
                                      const cr = m.key === 'cruce_cuentas' ? 0 : Number(payments.cruce_cuentas) || 0;
                                      const remaining = Math.max(0, totalToPay - ef - tr - tj - cr);
                                      setPayments(p => ({ ...p, [m.key]: remaining > 0 ? remaining.toFixed(2) : '' }));
                                    }
                                    return updated;
                                  });
                                }}
                                className={`flex flex-col items-center justify-center p-3 rounded-btn border transition-all gap-1.5 ${
                                  isSelected 
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                                  <m.icon size={14} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wide">{m.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Efectivo */}
                          {activePayments.efectivo && (
                            <div className={`p-4 rounded-card border space-y-2 border-primary/15 bg-primary/5`}>
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"><DollarSign size={12} /></div>
                                  <span className={`text-xs md:text-sm font-bold block text-black`}>Efectivo ($)</span>
                                </div>
                                <span className={`text-xs font-bold uppercase text-gray-400`}>Monto Recibido</span>
                              </div>
                              <input type="number" step="0.01" value={payments.efectivo || ''} onChange={e => setPayments({...payments, efectivo: e.target.value})} className={'glass-input-light px-3.5 py-3 w-full text-base font-bold rounded-card outline-none border'} placeholder="0.00" />
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {[5, 10, 20, 50, 100].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => {
                                      const current = Number(payments.efectivo) || 0;
                                      setPayments({ ...payments, efectivo: (current + val).toFixed(2) });
                                    }}
                                    className={`px-2.5 py-1 text-xs md:text-sm font-bold rounded-btn border transition-colors ${
                                      'border-primary/15 bg-white hover:bg-primary-light text-primary hover:bg-primary/10'}`}
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
                                  className={`px-2.5 py-1 text-xs md:text-sm font-bold rounded-btn border transition-colors ${
                                    'border-primary/25 bg-primary-light hover:bg-primary/10 text-primary'}`}
                                >
                                  Exacto
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Tarjeta */}
                          {activePayments.tarjeta && (
                            <div className={`p-4 rounded-card border space-y-2 border-primary/15 bg-primary/5`}>
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"><CreditCard size={12} /></div>
                                  <span className={`text-xs md:text-sm font-bold block text-black`}>Tarjeta (Crédito/Débito) ($)</span>
                                </div>
                                <span className={`text-xs font-bold uppercase text-gray-400`}>Monto Tarjeta</span>
                              </div>
                              <input type="number" step="0.01" value={payments.tarjeta || ''} onChange={e => setPayments({...payments, tarjeta: e.target.value})} className={'glass-input-light px-3 py-2.5 w-full text-sm font-bold rounded-card outline-none border'} placeholder="0.00" />
                              <input type="text" value={payments.tarjetaRef} onChange={e => setPayments({...payments, tarjetaRef: e.target.value})} className={`glass-input-light px-3 py-2 w-full text-sm mt-1.5 rounded-card border`} placeholder="Ref / Autorización" />
                            </div>
                          )}

                          {/* Transferencia */}
                          {activePayments.transferencia && (
                            <div className={`p-4 rounded-card border space-y-2 border-primary/15 bg-primary/5`}>
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"><RefreshCw size={12} /></div>
                                  <span className={`text-xs md:text-sm font-bold block text-black`}>Transferencia Bancaria ($)</span>
                                </div>
                                <span className={`text-xs font-bold uppercase text-gray-400`}>Monto Transferido</span>
                              </div>
                              <input type="number" step="0.01" value={payments.transferencia || ''} onChange={e => setPayments({...payments, transferencia: e.target.value})} className={'glass-input-light px-3 py-2.5 w-full text-sm font-bold rounded-card outline-none border'} placeholder="0.00" />
                              <input type="text" value={payments.transferenciaRef} onChange={e => setPayments({...payments, transferenciaRef: e.target.value})} className={`glass-input-light px-3 py-2 w-full text-xs mt-1.5 rounded-card border`} placeholder="Nro Referencia / Comprobante" />
                            </div>
                          )}

                          {/* Cruce de Cuentas */}
                          {activePayments.cruce_cuentas && (
                            <div className={`p-4 rounded-card border space-y-2 border-primary/15 bg-primary/5`}>
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"><User size={12} /></div>
                                  <span className={`text-xs md:text-sm font-bold block text-black`}>Cruce de Cuentas ($)</span>
                                </div>
                                <span className={`text-xs font-bold uppercase text-gray-400`}>Monto Crédito</span>
                              </div>
                              <input type="number" step="0.01" value={payments.cruce_cuentas || ''} onChange={e => setPayments({...payments, cruce_cuentas: e.target.value})} className={'glass-input-light px-3 py-2.5 w-full text-sm font-bold rounded-card outline-none border'} placeholder="0.00" />
                              <input type="text" value={payments.cruceRef} onChange={e => setPayments({...payments, cruceRef: e.target.value})} className={`glass-input-light px-3 py-2 w-full text-xs mt-1.5 rounded-card border`} placeholder="Nro de Documento Relacionado" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`p-4 rounded-card space-y-2.5 text-xs md:text-sm font-mono border bg-primary/5 border-primary/15 text-black`}>
                        <div className="flex justify-between">
                          <span>Total Pagado:</span>
                          <span className={`font-bold text-black`}>${paidTotal.toFixed(2)}</span>
                        </div>
                        {remainingDue > 0 ? (
                          <div className="flex justify-between text-yellow-500 font-bold">
                            <span>Falta Pagar:</span>
                            <span>${remainingDue.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className={`flex justify-between font-bold border-t pt-1 text-emerald-650 border-primary/15`}>
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
                      <div className={`p-5 rounded-card border space-y-3 bg-white border-primary/20 text-black`}>
                        <h4 className={`text-sm font-black text-center uppercase tracking-widest border-b pb-2 text-black border-primary/15`}>PREVISUALIZACIÓN DE FACTURA (RIDE)</h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs leading-normal">
                          <div>
                            <p className={`font-bold uppercase text-primary`}>RECEPTOR</p>
                            <p className={'text-black font-medium'}><span className="font-bold">Razon Social:</span> {getSelectedClient().name}</p>
                            <p className={'text-black font-medium'}><span className="font-bold">RUC/CI:</span> {getSelectedClient().ruc}</p>
                            <p className={'text-black font-medium'}><span className="font-bold">Correo:</span> {getSelectedClient().email}</p>
                            <p className={'text-black font-medium'}><span className="font-bold">Dirección:</span> {getSelectedClient().direccion}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold uppercase text-primary`}>COMPROBANTE</p>
                            <p className={'text-black font-medium'}>Establecimiento: {activeSession.branch}</p>
                            <p className={'text-black font-medium'}>Fecha: {getEcuadorDateString().split('-').reverse().join('/')}</p>
                            <p className={'text-black font-medium'}>Ambiente SRI: PRUEBAS (Offline)</p>
                          </div>
                        </div>

                        <div className={`border-t pt-3 border-primary/15`}>
                          <p className={`font-bold text-xs uppercase mb-1.5 text-primary`}>Ítems Detallados</p>
                          <div className="space-y-1 text-xs">
                            {cart.map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className={'text-black font-semibold'}>{item.quantity}x {item.name}</span>
                                <span className={`font-bold text-black`}>${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className={`border-t pt-3 flex justify-between font-bold text-sm border-primary/15 text-black`}>
                          <span>Total Neto Cobrado:</span>
                          <span className={'text-primary'}>${totalToPay.toFixed(2)}</span>
                        </div>

                        <div className={`text-xs border-t pt-2 text-black border-primary/15 font-semibold`}>
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
              'border-primary/15 bg-primary-light'}`}>
              <div className="max-w-4xl mx-auto w-full flex justify-between">
              {posConfig.expressCheckout ? (
                <>
                  <button 
                    type="button" 
                    onClick={() => setIsCheckoutOpen(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleFinalCheckout} 
                    disabled={isProcessing || remainingDue > 0}
                    className="btn-primary"
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
                    className="btn-secondary"
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
                      className="btn-primary"
                    >
                      Siguiente
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleFinalCheckout} 
                      disabled={isProcessing}
                      className="btn-primary px-6"
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-card border transition-all duration-300 ${
            'bg-white border-primary/15 text-black'}`}>
            <h3 className="text-base font-black mb-4">Registro Rápido de Cliente (SRI)</h3>
            
            <form onSubmit={handleQuickClientSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 text-black`}>Identificación</label>
                  <select 
                    value={quickAddFormData.tipoIdentificacion} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, tipoIdentificacion: e.target.value})} 
                    className={`w-full text-sm px-3 py-2.5 rounded-card outline-none border ${
                      'bg-white border-primary/15 text-black'}`}
                  >
                    <option value="ruc" className="text-black bg-white">RUC</option>
                    <option value="cedula" className="text-black bg-white">Cédula</option>
                    <option value="pasaporte" className="text-black bg-white">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 text-black`}>Número</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      required 
                      value={quickAddFormData.ruc} 
                      onChange={e => setQuickAddFormData({...quickAddFormData, ruc: e.target.value})} 
                      className={`w-full text-sm px-3 py-2.5 rounded-card outline-none border ${
                        'bg-white border-primary/15 text-black focus:border-primary'}`}
                      placeholder="1790000000001" 
                    />
                    <button
                      type="button"
                      disabled={isQueryingSri}
                      onClick={queryQuickClientSRI}
                      className="btn-icon border border-purple-500/30 bg-purple-500/20 text-purple-400 hover:bg-purple-500/35 shrink-0 transition-all active:scale-95"
                    >
                      {isQueryingSri ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1 text-black`}>Razón Social / Nombre Completo</label>
                <input 
                  type="text" 
                  required 
                  value={quickAddFormData.name} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, name: e.target.value})} 
                  className={`w-full text-xs px-2.5 py-2.5 rounded-card outline-none border ${
                    'bg-white border-primary/15 text-black focus:border-primary'}`} 
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1 text-black`}>Teléfono</label>
                <input 
                  type="text" 
                  value={quickAddFormData.telefono || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, telefono: e.target.value})} 
                  className={`w-full text-xs px-2.5 py-2.5 rounded-card outline-none border ${
                    'bg-white border-primary/15 text-black focus:border-primary'}`} 
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={`block text-xs font-bold uppercase mb-1 text-black`}>Dirección Domicilio</label>
                  <input 
                    type="text" 
                    value={quickAddFormData.direccion || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, direccion: e.target.value})} 
                    className={`w-full text-xs px-2.5 py-2.5 rounded-card outline-none border ${
                      'bg-white border-primary/15 text-black focus:border-primary'}`} 
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 text-black`}>Ciudad</label>
                  <input 
                    type="text" 
                    value={quickAddFormData.ciudad || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, ciudad: e.target.value})} 
                    className={`w-full text-xs px-2.5 py-2.5 rounded-card outline-none border ${
                      'bg-white border-primary/15 text-black focus:border-primary'}`} 
                    placeholder="Ej. Quito"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1 text-black`}>Correo Notificación</label>
                <input 
                  type="email" 
                  value={quickAddFormData.email || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, email: e.target.value})} 
                  className={`w-full text-xs px-2.5 py-2.5 rounded-card outline-none border ${
                    'bg-white border-primary/15 text-black focus:border-primary'}`} 
                />
              </div>

              <div className={`flex justify-end gap-2.5 mt-6 pt-4 border-t border-primary/15`}>
                <button type="button" onClick={() => setIsQuickAddOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar y Seleccionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ATAJOS DE TECLADO (GUIDE) */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-250">
          <div className={`w-full max-w-md p-6 rounded-card border transition-all duration-300 ${
            'bg-white border-primary/15 text-black'}`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Keyboard size={16} className="text-primary" /> Guía de Atajos de Teclado
              </h3>
              <button onClick={() => setIsShortcutsOpen(false)} className="text-gray-550 hover:text-gray-300 transition-colors p-1"><X size={16} /></button>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <p className="text-xs text-gray-400">Usa estos atajos rápidos para agilizar el proceso de facturación en caja:</p>
              
              <div className="space-y-2">
                {[
                  { key: 'F2', desc: 'Enfocar la barra de búsqueda de productos' },
                  { key: 'F8', desc: 'Suspender venta actual (Borrar localmente)' },
                  { key: 'F9', desc: 'Recuperar última venta suspendida' },
                  { key: 'F12', desc: 'Proceder al cobro / Abrir pasarela de pago' },
                  { key: 'Ctrl + Enter', desc: 'Cobrar directamente desde el detalle de la venta' },
                  { key: 'Escape', desc: 'Cerrar cualquier ventana flotante o modal abierto' }
                ].map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-2.5 rounded-card border bg-primary/5 border-primary/15 text-black font-semibold`}>
                    <span className="text-xs font-medium">{item.desc}</span>
                    <kbd className={`px-2 py-1 rounded text-xs font-mono font-bold shadow bg-white text-black border border-primary/25`}>
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
                className="btn-primary"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DESLIZABLE: HISTORIAL DE VENTAS DE LA SESIÓN */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[140] flex justify-end bg-black/75 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsHistoryOpen(false)}></div>
          
          <div className={`relative w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-350 ${
            'bg-surface-card border-l border-primary/15 text-black'}`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 border-primary/15 bg-primary-light`}>
              <div className="flex items-center gap-2">
                <History size={16} className="text-primary" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Historial de Ventas</h3>
                  <p className="text-xs text-gray-500">Sesión de caja activa</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsHistoryOpen(false)} 
                className="btn-icon text-gray-500 hover:text-gray-700 dark:hover:text-white"
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
                      <History size={40} className="opacity-20 mb-2.5 text-primary" />
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
                      className={`p-3.5 rounded-card border flex flex-col justify-between gap-3 transition-all ${
                        isAnulado
                          ? 'opacity-65 border-red-500/20 bg-red-500/5'
                          : ('bg-white border-primary/15 hover:shadow')
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-gray-500 truncate">{tx.id}</p>
                          <h4 className={`text-sm font-black truncate text-black`}>
                            {matchedClient.name}
                          </h4>
                          <p className="text-xs text-gray-500">RUC/CI: {matchedClient.ruc} | Fecha: {tx.date}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-black block ${isAnulado ? 'text-red-500 line-through' : ('text-primary')}`}>
                            ${Number(tx.total || 0).toFixed(2)}
                          </span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold uppercase mt-1 ${
                            isAnulado 
                              ? 'bg-red-500/20 text-red-405' 
                              : (tx.sriStatus === 'autorizado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400')
                          }`}>
                            {tx.documentType === 'nota_venta'
                              ? (isAnulado ? 'anulado' : 'registrado')
                              : (tx.sriStatus || 'pendiente')}
                          </span>
                        </div>
                      </div>

                      <div className={`p-2 rounded-card text-xs leading-relaxed font-mono bg-primary-light text-gray-700`}>
                        <div className="flex justify-between">
                          <span>Pago: <span className="font-bold uppercase">{tx.paymentMethod}</span></span>
                          <span>Base: ${Number(tx.baseImponible || 0).toFixed(2)}</span>
                        </div>
                        {tx.items && tx.items.length > 0 && (
                          <div className="border-t border-white/5 mt-1 pt-1 max-h-16 overflow-y-auto custom-scrollbar">
                            {tx.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-gray-500">
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
                              className={`btn-icon ${
                                'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border'}`} 
                              title="Descargar PDF RIDE"
                            >
                              <FileText size={12} />
                            </a>
                          ) : (
                            <span 
                              className={`btn-icon opacity-40 cursor-not-allowed flex items-center justify-center ${
                                'border-gray-250 bg-gray-100 text-gray-400'}`} 
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
                              className={`btn-icon ${
                                'border-primary/25 bg-primary-light text-primary hover:bg-primary/10 border'}`} 
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
                            className="btn-danger text-xs flex items-center gap-1"
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
            <div className={`p-4 border-t flex justify-end shrink-0 border-primary/15 bg-primary/5`}>
              <button 
                type="button" 
                onClick={() => setIsHistoryOpen(false)}
                className="btn-secondary w-full"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BUSCADOR PROFESIONAL DE PRODUCTOS NAVEGABLE PARA PANTALLAS TÁCTILES */}
      {isSearchModalOpen && (() => {

        // Filtrar productos para el modal
        const modalFilteredProducts = products.filter(p => {
          // Búsqueda por texto
          const matchesSearch = !modalSearch || 
            (p.name || '').toLowerCase().includes(modalSearch.toLowerCase()) || 
            (p.sku || '').toLowerCase().includes(modalSearch.toLowerCase()) || 
            (p.codigoBarras || '').includes(modalSearch);
          
          // Categoría, Marca, Bodega
          const matchesCategory = modalCat === 'all' || p.categoria === modalCat;
          const matchesBrand = modalBrand === 'all' || p.marca === modalBrand;
          const matchesWarehouse = modalWh === 'all' || p.bodega === modalWh;
          
          // Filtro rápido de más vendidos
          let matchesTab = true;
          if (modalTab === 'best_sellers') {
            const bs = bestSellers.find(item => item.id === p.id);
            matchesTab = bs && bs.salesCount > 0;
          }

          return matchesSearch && matchesCategory && matchesBrand && matchesWarehouse && matchesTab;
        });

        // Ordenar en caso de ser "más vendidos"
        const finalModalProducts = modalTab === 'best_sellers' 
          ? [...modalFilteredProducts].sort((a, b) => {
              const countA = bestSellers.find(x => x.id === a.id)?.salesCount || 0;
              const countB = bestSellers.find(x => x.id === b.id)?.salesCount || 0;
              return countB - countA;
            })
          : modalFilteredProducts;

        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/30 backdrop-blur-xs select-none p-4">
            <div className="absolute inset-0" onClick={() => {
              setIsSearchModalOpen(false);
              setModalSearch('');
              setModalCat('all');
              setModalBrand('all');
              setModalWh('all');
              setModalTab('all');
            }}></div>
            
            <div className="relative w-full max-w-4xl h-[85vh] max-h-[640px] bg-white rounded-2xl border border-[#CDD1EA] flex flex-col overflow-hidden shadow-none">
              
              {/* HEADER DEL MODAL: Título y Buscador */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50 shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                  <SlidersHorizontal size={18} className="text-primary" />
                  <span className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Buscador Profesional</span>
                </div>
 
                {/* Input Buscador */}
                <div className="flex-1 max-w-md relative">
                  <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-white border border-[#CDD1EA] transition-all">
                    <Search size={16} className="text-primary shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre, SKU o código..." 
                      value={modalSearch}
                      onChange={e => setModalSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm w-full focus:ring-0 text-black placeholder-gray-400 font-bold focus-visible:outline-none focus:outline-none"
                      autoFocus
                    />
                    {modalSearch && (
                      <button 
                        type="button"
                        onClick={() => setModalSearch('')}
                        className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
 
                {/* Botón de Cerrar */}
                <button 
                  type="button"
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setModalSearch('');
                    setModalCat('all');
                    setModalBrand('all');
                    setModalWh('all');
                    setModalTab('all');
                  }} 
                  className="p-2 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* CUERPO DEL MODAL: Sidebar Izquierda + Resultados Derecha */}
              <div className="flex flex-1 overflow-hidden min-h-0">
                
                {/* SIDEBAR DE FILTROS */}
                <div className="w-[200px] border-r border-slate-150 bg-slate-50/50 overflow-y-auto p-3 flex flex-col gap-4 custom-scrollbar">
                  
                  {/* Filtro Rápido */}
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2">Filtros Rápidos</h4>
                    <button
                      type="button"
                      onClick={() => { setModalTab('all'); }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold ${
                        modalTab === 'all' ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Todos los Productos
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModalTab('best_sellers'); }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold ${
                        modalTab === 'best_sellers' ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Más Vendidos
                    </button>
                  </div>

                  {/* Categorías */}
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2">Categorías</h4>
                    <button
                      type="button"
                      onClick={() => setModalCat('all')}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold ${
                        modalCat === 'all' ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Todas ({products.length})
                    </button>
                    {categoriesWithCount.map(cat => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setModalCat(cat.name)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                          modalCat === cat.name ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate pr-1">{cat.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">{cat.count}</span>
                      </button>
                    ))}
                  </div>

                  {/* Marcas */}
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2">Marcas</h4>
                    <button
                      type="button"
                      onClick={() => setModalBrand('all')}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold ${
                        modalBrand === 'all' ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Todas
                    </button>
                    {brands.filter(b => b !== 'all').map(brand => (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => setModalBrand(brand)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold ${
                          modalBrand === brand ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>

                  {/* Bodegas */}
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2">Bodegas</h4>
                    <button
                      type="button"
                      onClick={() => setModalWh('all')}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold ${
                        modalWh === 'all' ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Todas
                    </button>
                    {warehouses.filter(w => w !== 'all').map(wh => (
                      <button
                        key={wh}
                        type="button"
                        onClick={() => setModalWh(wh)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold ${
                          modalWh === wh ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {wh}
                      </button>
                    ))}
                  </div>

                </div>

                {/* RESULTADOS DE BÚSQUEDA */}
                <div className="flex-1 p-4 overflow-y-auto bg-white custom-scrollbar select-none">
                  {finalModalProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <Box size={40} className="opacity-30 mb-2" />
                      <p className="text-xs italic">No se encontraron productos.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {finalModalProducts.map(p => {
                        const isOutOfStock = p.type === 'producto' && p.inventoryType !== 'VIRTUAL' && p.stock <= 0;
                        const minStk = p.minStock !== undefined ? Number(p.minStock) : 2;
                        const isLowStock = p.type === 'producto' && p.inventoryType !== 'VIRTUAL' && p.stock <= minStk && p.stock > 0;
                        
                        const cartItem = cart.find(item => item.productId === p.id);
                        const quantityInCart = cartItem ? cartItem.quantity : 0;
                        
                        let stockDotColor = 'bg-emerald-500';
                        if (isOutOfStock) stockDotColor = 'bg-red-500';
                        else if (isLowStock) stockDotColor = 'bg-amber-500';

                        const imgUrl = getProductImageUrl(p);
                        const isImgPlaceholder = imgUrl === '/product.svg';

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (!isOutOfStock) {
                                addToCart(p);
                                if (navigator.vibrate) navigator.vibrate(10);
                              }
                            }}
                            className={`p-2 border border-[#CDD1EA] rounded-xl flex flex-col justify-between transition-all cursor-pointer relative ${
                              isOutOfStock 
                                ? 'cursor-not-allowed bg-slate-50/50' 
                                : 'hover:border-primary bg-white active:scale-98'
                            }`}
                            style={{ height: '150px' }}
                          >
                            {quantityInCart > 0 && (
                              <div className="absolute top-1 right-1 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-none z-20">
                                {quantityInCart}
                              </div>
                            )}

                            {/* Top row: Image & SKU Badge */}
                            <div className="w-full h-[75px] rounded-lg overflow-hidden relative bg-slate-50 flex items-center justify-center shrink-0">
                              <div className={`w-full h-full ${isOutOfStock ? 'opacity-40' : ''}`}>
                                {isImgPlaceholder ? (
                                  <div className="w-full h-full bg-[#f1f5f9] flex items-center justify-center text-slate-400">
                                    <Box size={32} strokeWidth={1} />
                                  </div>
                                ) : (
                                  <img src={imgUrl} className="w-full h-full object-cover" alt={p.name} />
                                )}
                              </div>

                              {/* SKU Badge */}
                              <div className="absolute top-0 left-0 px-2 py-0.5 rounded-tl-lg rounded-br-lg bg-slate-100/95 flex items-center gap-1 z-10">
                                <span className={`w-1.5 h-1.5 rounded-full ${stockDotColor}`}></span>
                                <span className="font-mono text-[8px] text-slate-600 truncate max-w-[60px]">{p.sku}</span>
                              </div>

                              {/* Sin Stock text overlay */}
                              {isOutOfStock && (
                                <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
                                  <span className="text-[10px] font-black text-blue-600 tracking-wider">SIN STOCK</span>
                                </div>
                              )}
                            </div>

                            {/* Bottom row: Info & Price */}
                            <div className="mt-1 flex flex-col justify-between flex-1">
                              <h5 className={`text-[10px] font-bold leading-tight line-clamp-2 text-left ${
                                isOutOfStock ? 'text-slate-400' : 'text-slate-700'
                              }`}>
                                {p.name}
                              </h5>
                              <div className="flex items-center justify-between gap-1 mt-0.5">
                                <span className="text-[9px] text-slate-400 font-medium font-mono truncate max-w-[60px]">
                                  {p.inventoryType === 'VIRTUAL' ? 'Virtual' : `Stock: ${p.stock}`}
                                </span>
                                <span className={`text-xs font-black font-mono ${
                                  isOutOfStock ? 'text-red-500' : 'text-primary'
                                }`}>
                                  ${Number(p.price).toFixed(2)}
                                </span>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* LINE ITEM DISCOUNT SELECTOR MODAL */}
      {selectedLineItemForDiscount && (() => {
        const available = getAvailableDiscountsForLineItem(selectedLineItemForDiscount);
        return (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/35 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl w-full max-w-md border border-[#CDD1EA] overflow-hidden flex flex-col shadow-lg animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Descuento / Promo de Ítem
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{selectedLineItemForDiscount.name}</p>
                </div>
                <button 
                  onClick={() => setSelectedLineItemForDiscount(null)} 
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {/* Option 1: None */}
                <button
                  type="button"
                  onClick={() => {
                    setCart(cart.map(i => i.productId === selectedLineItemForDiscount.productId ? {
                      ...i,
                      id_descuento_aplicado: '',
                      id_promocion_aplicada: '',
                      discount_value: 0,
                      discount_type: 'PORCENTAJE'
                    } : i));
                    showToast("Descuento removido", "success");
                    setSelectedLineItemForDiscount(null);
                  }}
                  className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-all cursor-pointer ${
                    !selectedLineItemForDiscount.id_descuento_aplicado
                      ? 'bg-primary/5 border-primary text-primary font-bold'
                      : 'bg-white border-slate-155 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-semibold">Sin Descuento</span>
                  <CheckCircle2 size={14} className={!selectedLineItemForDiscount.id_descuento_aplicado ? 'opacity-100' : 'opacity-0'} />
                </button>

                {/* Available Discounts/Promos */}
                {available.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No hay descuentos o promociones de producto vigentes hoy.</p>
                ) : (
                  available.map(d => {
                    const isSelected = selectedLineItemForDiscount.id_descuento_aplicado === d.id && 
                                       (d.promotionId ? selectedLineItemForDiscount.id_promocion_aplicada === d.promotionId : true);
                    return (
                      <button
                        key={d.promotionId ? `${d.id}_${d.promotionId}` : d.id}
                        type="button"
                        onClick={() => {
                          const apply = () => {
                            setCart(cart.map(i => i.productId === selectedLineItemForDiscount.productId ? {
                              ...i,
                              id_descuento_aplicado: d.id,
                              id_promocion_aplicada: d.promotionId || '',
                              discount_value: d.valor,
                              discount_type: d.tipo_valor
                            } : i));
                            showToast("Descuento aplicado al ítem", "success");
                            setSelectedLineItemForDiscount(null);
                          };
                          
                          if (d.requiere_autorizacion) {
                            setAuthDialog({
                              discount: d,
                              onConfirm: apply,
                              onCancel: () => {}
                            });
                          } else {
                            apply();
                          }
                        }}
                        className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/5 border-primary text-primary font-bold'
                            : 'bg-white border-slate-155 text-slate-650 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase">{d.nombre}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Valor: {d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : `$${d.valor}`}
                            {d.requiere_autorizacion && ' • [Clave Supervisor]'}
                          </span>
                        </div>
                        <CheckCircle2 size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* SUPERVISOR AUTHORIZATION MODAL */}
      {authDialog && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#CDD1EA] overflow-hidden flex flex-col shadow-xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-red-500">
                <ShieldAlert size={15} /> Autorización Requerida
              </span>
              <button 
                onClick={() => { authDialog.onCancel?.(); setAuthDialog(null); }} 
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs font-semibold text-slate-700">
              <p className="text-slate-550 leading-relaxed">
                El descuento <strong>{authDialog.discount.nombre}</strong> requiere clave de autorización de supervisor para ser aplicado.
              </p>
              
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Clave de Supervisor</label>
                <input
                  type="password"
                  required
                  placeholder="Ingrese clave..."
                  value={supervisorPassword}
                  onChange={e => {
                    setSupervisorPassword(e.target.value);
                    setAuthError('');
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (supervisorPassword === 'SUPERVISOR123') {
                        authDialog.onConfirm();
                        setAuthDialog(null);
                        setSupervisorPassword('');
                        setAuthError('');
                      } else {
                        setAuthError('Clave incorrecta. Solicite al supervisor.');
                      }
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-red-500 text-black font-semibold text-center tracking-widest text-sm"
                  autoFocus
                />
                {authError && (
                  <p className="text-red-500 font-bold text-[10px] mt-1.5 animate-pulse">{authError}</p>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { authDialog.onCancel?.(); setAuthDialog(null); }} 
                  className="btn-secondary px-4 py-2 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (supervisorPassword === 'SUPERVISOR123') {
                      authDialog.onConfirm();
                      setAuthDialog(null);
                      setSupervisorPassword('');
                      setAuthError('');
                    } else {
                      setAuthError('Clave incorrecta. Solicite al supervisor.');
                    }
                  }} 
                  className="btn-primary bg-red-650 hover:bg-red-700 px-4 py-2 font-bold text-white rounded-xl cursor-pointer"
                >
                  Autorizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
