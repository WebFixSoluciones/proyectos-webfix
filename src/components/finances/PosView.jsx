import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import PosProductCard from './PosProductCard';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiInput, UiSelect, UiTextarea, UiButton } from '../ui/controls';
import { makeCartItem, validateCartStock, isSellable, productKind } from '../../services/productModel';
import { settlePayments, cashSessionTotals } from '../../services/paymentModel';
import { useState, useEffect, useMemo, useRef } from 'react';
import { createThemedPortal as createPortal } from '../ui/themePortal';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, Sparkles, CheckCircle2, DollarSign, CreditCard, X, ShieldAlert, Tag, Bookmark, RefreshCw, LogOut, ArrowLeft, ChevronRight, Settings, Barcode, Zap, Eye, Keyboard, History, Download, FileText, Unlock, UserPlus, ChevronDown, Box, LayoutGrid, List, Percent, Sliders, SlidersHorizontal } from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from '../../services/financeStore.js';
import { consultarRucSri, getEcuadorDateString } from '../../services/sriService';
import { calculateTransactionTotals, isDiscountScheduleActive } from '../../services/discountCalcService';

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

const BarcodeScannerIcon = ({ className = {"style":{"color":"var(--blue-11)"},"className":"shrink-0"}, size = 18 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    {...resolveThemeProps(className)}
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

export default function PosView({ products, thirdParties, transactions = [], discounts = [], promotions = [], showToast, db, appId, onCheckout, onClose, isPreventaOnly, usuario = null }) {
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
    try { return saved ? { ...def, ...JSON.parse(saved) } : def; } catch { return def; }
  });

  // Estados de Caja
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    async function fetchDbCategories() {
      try {
        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'inventory_categories'));
        setDbCategories(snap.docs.map(doc => doc.data()));
      } catch (err) {
        console.error("Error fetching categories in POS:", err);
      }
    }
    if (db && appId) {
      fetchDbCategories();
    }
  }, [db, appId]);

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
  // eslint-disable-next-line no-unused-vars
  const [filterStock, setFilterStock] = useState('all'); // 'all', 'instock'
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Estados Locales para el Buscador Modal (Declarados al nivel superior del componente)
  const [modalSearch, setModalSearch] = useState('');
  const [modalCat, setModalCat] = useState('all');
  const [modalBrand, setModalBrand] = useState('all');
  const [modalWh, setModalWh] = useState('all');
  const [modalTab, setModalTab] = useState('all'); // 'all' | 'best_sellers'

  // Descuentos
  // eslint-disable-next-line no-unused-vars
  const [discountType, setDiscountType] = useState('percent'); // 'percent' o 'fixed'
  // eslint-disable-next-line no-unused-vars
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
  // eslint-disable-next-line no-unused-vars
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
  const processingRef = useRef(false);
  
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
  const cartWithDiscounts = cart.map(item => {
    let disc = null;
    if (item.id_descuento_aplicado === 'manual') {
      disc = {
        id: 'manual',
        nombre: 'Descuento Manual',
        tipo_valor: item.discount_type || 'PORCENTAJE',
        valor: Number(item.discount_value || 0)
      };
    } else if (item.id_descuento_asociado) {
      disc = (discounts || []).find(d => d.id === item.id_descuento_asociado);
    }
    if (!disc && item.categoryId) {
      const cat = dbCategories.find(c => c.id === item.categoryId);
      if (cat && cat.id_descuento_asociado) {
        disc = (discounts || []).find(d => d.id === cat.id_descuento_asociado);
      }
    }
    return {
      ...item,
      descuento_objeto: item.id_descuento_aplicado === 'manual'
        ? disc
        : (item.id_descuento_aplicado ? ((discounts || []).find(d => d.id === item.id_descuento_aplicado) || item.descuento_objeto || null) : disc)
    };
  });

  const totalsResult = calculateTransactionTotals(cartWithDiscounts, selectedGeneralDiscount);

  const getSubtotal = () => totalsResult.subtotalBruto;
  const getDiscountAmount = () => totalsResult.descuentoVenta; // general discount
  const getSubtotalWithDiscount = () => totalsResult.baseImponible;
  const getIva = () => totalsResult.ivaValor;
  const getTotal = () => totalsResult.total;
  
  // Para desgloses separados
  const productDiscountsTotal = totalsResult.descuentosProducto;

  const [manualLineDiscType, setManualLineDiscType] = useState('PORCENTAJE'); // 'PORCENTAJE' | 'MONTO_FIJO'
  const [manualLineDiscValue, setManualLineDiscValue] = useState('');
  const [manualGeneralDiscType, setManualGeneralDiscType] = useState('PORCENTAJE'); // 'PORCENTAJE' | 'MONTO_FIJO'
  const [manualGeneralDiscValue, setManualGeneralDiscValue] = useState('');

  const getActiveDiscounts = (alcance) => {
    return (discounts || []).filter(d => {
      const matchAlcance = (alcance === 'VENTA')
        ? (d.alcance === 'VENTA' || d.alcance === 'GLOBAL')
        : (d.alcance === alcance);
      return matchAlcance && isDiscountScheduleActive(d);
    });
  };

  const getAvailableDiscountsForLineItem = (cartItem) => {
    const prod = products.find(p => p.id === cartItem.productId);
    
    const activeProductDiscounts = (discounts || []).filter(d => {
      return (d.alcance === 'PRODUCTO' || !d.alcance) && isDiscountScheduleActive(d);
    });

    const activeLinePromotions = (promotions || []).filter(p => {
      if (!p.activo || p.fecha_inicio > hoy || p.fecha_fin < hoy) return false;
      
      if (p.dias_validos && p.dias_validos.length > 0) {
        const formatterDayPromo = new Intl.DateTimeFormat('es-EC', { weekday: 'short', timeZone: 'America/Guayaquil' });
        let rawDayPromo = formatterDayPromo.format(new Date()).toUpperCase();
        rawDayPromo = rawDayPromo.replace(/\./g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const dayMapPromo = {
          'LUN': 'LUN', 'MAR': 'MAR', 'MIE': 'MIE', 'JUE': 'JUE', 'VIE': 'VIE', 'SAB': 'SAB', 'DOM': 'DOM',
          'LU': 'LUN', 'MA': 'MAR', 'MI': 'MIE', 'JU': 'JUE', 'VI': 'VIE', 'SA': 'SAB', 'DO': 'DOM',
          'LUNES': 'LUN', 'MARTES': 'MAR', 'MIERCOLES': 'MIE', 'JUEVES': 'JUE', 'VIERNES': 'VIE', 'SABADO': 'SAB', 'DOMINGO': 'DOM'
        };
        const currentDay = dayMapPromo[rawDayPromo] || rawDayPromo;
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
    if (isCheckoutOpen) return;
    const total = getTotal();
    if (posPaymentMethod === 'efectivo') {
      const cashVal = Number(receivedAmount) || 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posPaymentMethod, receivedAmount, paymentRefCode, cart, isCheckoutOpen, selectedGeneralDiscount]);

  // checkout wizard calculations
  const totalToPay = Math.round((getTotal() + Number.EPSILON) * 100) / 100;
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

  // Validación exhaustiva previa al cobro
  const validarCobro = () => {
    if (!isPreventaOnly && (!activeSession || sessionLoading)) { showToast('Abre una caja antes de cobrar.', 'error'); return false; }
    // 1. Validar Carrito
    if (!cart || cart.length === 0) {
      showToast("Alerta: El carrito está vacío. Agregue al menos un producto antes de cobrar.", "error");
      return false;
    }

    // 2. Validar que los items del carrito tengan cantidades válidas
    const invalidItem = cart.find(item => !item.quantity || Number(item.quantity) <= 0);
    if (invalidItem) {
      showToast(`Alerta: El producto "${invalidItem.name || 'en carrito'}" tiene una cantidad inválida.`, "error");
      return false;
    }

    // 3. Validar Cliente
    if (!selectedClientId) {
      showToast("Alerta: Debe seleccionar o registrar un cliente antes de cobrar.", "error");
      return false;
    }

    const client = getSelectedClient();
    if (!client || !client.name) {
      showToast("Alerta: El cliente seleccionado no es válido.", "error");
      return false;
    }

    // 4. Validar límite Consumidor Final (SRI Ecuador: Máximo $50.00 sin identificación)
    if ((client.ruc === '9999999999999' || client.tipoIdentificacion === 'consumidor_final') && totalToPay > 50 && posDocType === 'factura') {
      showToast(`Alerta SRI: Ventas a Consumidor Final superiores a $50.00 requieren identificar al cliente con RUC o Cédula (Total: $${totalToPay.toFixed(2)}).`, "error");
      return false;
    }

    // 5. Validar Usuario / Cajero
    const cajero = activeSession?.responsible || usuario?.email || usuario?.nombre || usuario?.displayName || 'Cajero Principal';
    if (!cajero) {
      showToast("Alerta: Debe existir un usuario o cajero activo responsable de la venta.", "error");
      return false;
    }

    // 6. Validar Total a cobrar
    if (totalToPay <= 0) {
      showToast("Alerta: El total a cobrar debe ser mayor a $0.00.", "error");
      return false;
    }

    return true;
  };

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
        isSellable(p) && (
          String(p.sku).toLowerCase() === code.toLowerCase() || 
          String(p.codigoBarras || '').toLowerCase() === code.toLowerCase()
        )
      );
      
      if (matched) {
        e.preventDefault();
        if (!addToCart(matched)) return;
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
          } catch {
            // ignore
          }
        }
      }
    }
  };

  // eslint-disable-next-line no-unused-vars
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
      } catch {
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
      if (processingRef.current) return;
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag);

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowPaymentScreen(false);
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
        // eslint-disable-next-line react-hooks/immutability
        suspendSale();
      }

      if (e.key === 'F9') {
        e.preventDefault();
        // eslint-disable-next-line react-hooks/immutability
        resumeSale();
      }

      if (e.key === 'F12' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (!validarCobro()) return;
        if (!showPaymentScreen) {
          setReceivedAmount('');
          setPosPaymentMethod('efectivo');
          setPaymentRefCode('');
          setShowPaymentScreen(true);
        } else {
          if (posPaymentMethod === 'efectivo') {
            const cashVal = receivedAmount === '' ? totalToPay : Number(receivedAmount);
            if (isNaN(cashVal) || cashVal < totalToPay) {
              showToast(`Monto insuficiente: Falta cubrir $${(totalToPay - (cashVal || 0)).toFixed(2)}`, "error");
              return;
            }
          }
          // eslint-disable-next-line react-hooks/immutability
          handleFinalCheckout();
        }
        return;
      }

      if (isInputActive && e.key !== 'F2' && e.key !== 'F12' && e.key !== 'Escape') {
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, totalToPay, showPaymentScreen, posPaymentMethod, receivedAmount, selectedClientId, posDocType, paymentRefCode, activeSession, selectedGeneralDiscount, products]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!Number.isFinite(Number(openingForm.initialAmount)) || Number(openingForm.initialAmount) < 0 || !openingForm.responsible.trim()) { showToast('Revisa el responsable y el fondo inicial de caja.', 'error'); return; }
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
      
      const cashTotal = cashSessionTotals(txs).efectivo;
      const cardTotal = cashSessionTotals(txs).tarjeta;
      const transTotal = cashSessionTotals(txs).transferencia;
      const cruceTotal = cashSessionTotals(txs).cruce_cuentas;
      
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
      const cashTotal = cashSessionTotals(sessionTxs).efectivo;
      const cardTotal = cashSessionTotals(sessionTxs).tarjeta;
      const transTotal = cashSessionTotals(sessionTxs).transferencia;
      const cruceTotal = cashSessionTotals(sessionTxs).cruce_cuentas;

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
  // eslint-disable-next-line no-unused-vars
  const categories = ['all', ...new Set(products.map(p => p.categoria).filter(Boolean))];
  const warehouses = ['all', ...new Set(products.map(p => p.bodega).filter(Boolean))];

  const addToCart = product => {
    if (isProcessing) return false;
    try {
      const existing = cart.find(item => item.productId === product.id);
      const next = existing ? cart.map(item => item.productId === product.id ? { ...item, quantity: Number(item.quantity) + 1 } : item) : [...cart, makeCartItem(product)];
      validateCartStock(next, products);
      setCart(next);
      return true;
    } catch (error) { showToast(error.message, 'error'); return false; }
  };
  const removeFromCart = productId => { if (!isProcessing) setCart(cart.filter(item => item.productId !== productId)); };
  const updateQuantity = (productId, change) => {
    if (isProcessing) return;
    const next = cart.map(item => item.productId === productId ? { ...item, quantity: Number(item.quantity) + change } : item).filter(item => item.quantity > 0);
    try { validateCartStock(next, products); setCart(next); } catch (error) { showToast(error.message, 'error'); }
  };

  // Guardar / Suspender ventas
  const suspendSale = () => {
    if (processingRef.current) return;
    if (cart.length === 0) {
      showToast("El carrito está vacío para suspender", "error");
      return;
    }
    const data = { cart, selectedClientId, selectedGeneralDiscount, posDocType };
    localStorage.setItem(`suspended_pos_sale_${appId}`, JSON.stringify(data));
    setCart([]);
    setSelectedClientId('');
    showToast("Venta suspendida temporalmente", "info");
  };

  const resumeSale = () => {
    if (processingRef.current) return;
    if (cart.length) { showToast('Suspende o completa la venta actual antes de recuperar otra.', 'warning'); return; }
    const dataStr = localStorage.getItem(`suspended_pos_sale_${appId}`);
    if (!dataStr) {
      showToast("No hay ninguna venta suspendida", "error");
      return;
    }
    let data;
    try { data = JSON.parse(dataStr); if (!Array.isArray(data.cart)) throw new Error(); } catch { showToast('No se pudo recuperar la venta suspendida.', 'error'); return; }
    setSelectedGeneralDiscount(data.selectedGeneralDiscount || null);
    setPosDocType(data.posDocType || 'factura');
    setCart(data.cart || []);
    setSelectedClientId(data.selectedClientId || '');
    localStorage.removeItem(`suspended_pos_sale_${appId}`);
    showToast("Venta suspendida recuperada", "success");
  };

  const hasSuspendedSale = localStorage.getItem(`suspended_pos_sale_${appId}`) !== null;

  // Checkout Finalizado
  const handleFinalCheckout = async () => {
    if (processingRef.current || !validarCobro()) return;
    try { validateCartStock(cart, products); } catch (error) { showToast(error.message, 'error'); return; }

    if (showPaymentScreen && posPaymentMethod === 'efectivo') {
      const cashVal = receivedAmount === '' ? totalToPay : Number(receivedAmount);
      if (isNaN(cashVal) || cashVal < totalToPay) {
        showToast(`Monto insuficiente: El efectivo recibido ($${(cashVal || 0).toFixed(2)}) no cubre el total ($${totalToPay.toFixed(2)})`, "error");
        return;
      }
    }

    if (isCheckoutOpen && remainingDue > 0.009) {
      showToast(`Falta pagar $${remainingDue.toFixed(2)} para completar el total`, "error");
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    try {
      const settlement = settlePayments(totalToPay, isCheckoutOpen ? payments : { [posPaymentMethod]: posPaymentMethod === 'efectivo' ? (receivedAmount === '' ? totalToPay : receivedAmount) : totalToPay }, isCheckoutOpen ? activePayments : null);
      const client = getSelectedClient();
      let clientDocId = selectedClientId;
      if (!selectedClientId) {
        const cf = thirdParties.find(tp => tp.ruc === '9999999999999');
        if (cf) {
          clientDocId = cf.id;
        } else {
          clientDocId = 'consumidor_final';
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
      let pMethod = posPaymentMethod || 'efectivo';
      if (isCheckoutOpen) {
        pMethod = 'transferencia';
        if (payments.efectivo >= payments.tarjeta && payments.efectivo >= payments.transferencia && payments.efectivo >= payments.cruce_cuentas) pMethod = 'efectivo';
        else if (payments.tarjeta >= payments.efectivo && payments.tarjeta >= payments.transferencia && payments.tarjeta >= payments.cruce_cuentas) pMethod = 'tarjeta';
        else if (payments.cruce_cuentas >= payments.efectivo && payments.cruce_cuentas >= payments.tarjeta && payments.cruce_cuentas >= payments.transferencia) pMethod = 'cruce_cuentas';
      }

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
        items: totalsResult.items,
        generalDiscount: selectedGeneralDiscount,
        posCheckoutOrigin: true,
        isPOS: !isPreventaOnly,
        isPreventa: !!isPreventaOnly,
        cashSessionId: isPreventaOnly ? '' : (activeSession?.id || ''),
        paymentsBreakdown: isCheckoutOpen ? {
          efectivo: Number(payments.efectivo),
          transferencia: Number(payments.transferencia),
          tarjeta: Number(payments.tarjeta),
          cruce_cuentas: Number(payments.cruce_cuentas)
        } : {
          efectivo: pMethod === 'efectivo' ? Number(totalToPay.toFixed(2)) : 0,
          transferencia: pMethod === 'transferencia' ? Number(totalToPay.toFixed(2)) : 0,
          tarjeta: pMethod === 'tarjeta' ? Number(totalToPay.toFixed(2)) : 0,
          cruce_cuentas: pMethod === 'cruce_cuentas' ? Number(totalToPay.toFixed(2)) : 0
        },
        paymentReferences: {
          transferenciaRef: isCheckoutOpen ? payments.transferenciaRef : (pMethod === 'transferencia' ? paymentRefCode : ''),
          tarjetaRef: isCheckoutOpen ? payments.tarjetaRef : (pMethod === 'tarjeta' ? paymentRefCode : ''),
          cruceRef: isCheckoutOpen ? payments.cruceRef : (pMethod === 'cruce_cuentas' ? paymentRefCode : '')
        }
      };

      Object.assign(invoiceData, settlement);
      if (isPreventaOnly) { invoiceData.paymentStatus = 'pendiente'; invoiceData.paidAmount = 0; invoiceData.paymentsBreakdown = { efectivo: 0, transferencia: 0, tarjeta: 0, cruce_cuentas: totalToPay, credito: totalToPay }; }
      const saved = await onCheckout(sanitizeData(invoiceData));
      if (!saved) return;
      setSelectedGeneralDiscount(null);
      setCart([]);
      setSelectedClientId('');
      setPosDocType(sriConfig?.rucActivo === false ? 'nota_venta' : 'factura');
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

      showToast(saved.sriStatus === 'autorizado' ? 'Venta registrada correctamente.' : 'Borrador guardado. Pendiente de finalizar la venta.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error al procesar la venta", "error");
    } finally {
      processingRef.current = false;
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
    } catch {
      showToast("Error al registrar cliente", "error");
    }
  };

  const handleVoidTransaction = async (tx) => {
    if (tx.documentType !== 'nota_venta') { showToast('Gestiona la anulación del comprobante electrónico mediante el proceso SRI.', 'warning'); return; }
    if (!await window.confirm(`¿Estás seguro de que deseas ANULAR este comprobante (${tx.id})? Esto restaurará el stock de los productos.`)) {
      return;
    }
    try {
      await cancelInternalSale(db, appId, tx);
      showToast("Comprobante anulado y stock restaurado con éxito", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al anular el comprobante", "error");
    }
  };

  // eslint-disable-next-line no-unused-vars
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
  const categoriesWithCount = useMemo(() => {
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
  const bestSellers = useMemo(() => {
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
    if (!isSellable(p)) return false;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.codigoBarras || '').includes(searchTerm);
    const matchesBrand = filterBrand === 'all' || p.marca === filterBrand;
    const matchesCategory = filterCategory === 'all' || p.categoria === filterCategory;
    const matchesWarehouse = filterWarehouse === 'all' || p.bodega === filterWarehouse;
    const matchesStock = filterStock === 'all' || (p.type === 'producto' && p.stock > 0);

    return matchesSearch && matchesBrand && matchesCategory && matchesWarehouse && matchesStock;
  });

  // eslint-disable-next-line no-unused-vars
  

  if (!isPreventaOnly) {
    if (sessionLoading) {
      return (
        <UiBox {...{"className":"flex justify-center items-center h-64"}}>
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)"},"className":"animate-spin h-8 w-8"}}></UiBox>
        </UiBox>
      );
    }

    // PANTALLA 1: APERTURA DE CAJA
    if (!activeSession) {
      return createPortal(
        <UiBox {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"fixed inset-0 z-[100] flex items-center justify-center p-4 duration-300"})}>
          {/* Decorative background blobs */}
          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--green-3)"},"className":"absolute top-[-10%] left-[-5%] w-[30rem] h-[30rem] opacity-20 pointer-events-none"})}></UiBox>
          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--orange-3)"},"className":"absolute bottom-[-10%] right-[-5%] w-[30rem] h-[30rem] opacity-20 pointer-events-none"})}></UiBox>

          <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"w-full max-w-md p-8 space-y-6 duration-300"})}>
            <UiBox {...{"className":"text-center space-y-2"}}>
              <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--green-3)","color":"var(--green-11)"},"className":"mx-auto w-14 h-14 flex items-center justify-center"})}>
                <DollarSign size={26} />
              </UiBox>
              <UiHeading as="h2" {...mergeThemeProps({"size":"5","weight":"regular","color":"gray","highContrast":true})}>Apertura de Caja POS</UiHeading>
              <UiText as="p" {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true})}>Es necesario ingresar el fondo inicial para habilitar la caja registradora.</UiText>
            </UiBox>

            <form onSubmit={handleOpenSession} {...{"className":"space-y-4"}}>
              <UiBox>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"})}>Responsable / Cajero</UiLabel>
                <UiInput type="text" required value={openingForm.responsible} onChange={e => setOpeningForm({...openingForm, responsible: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"})} />
              </UiBox>
              
              <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"})}>Sucursal</UiLabel>
                  <UiInput type="text" required value={openingForm.branch} onChange={e => setOpeningForm({...openingForm, branch: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"})} />
                </UiBox>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"})}>Turno</UiLabel>
                  <UiSelect value={openingForm.shift} onChange={e => setOpeningForm({...openingForm, shift: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full cursor-pointer"})}>
                    <option value="Mañana" {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>Mañana</option>
                    <option value="Tarde" {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>Tarde</option>
                    <option value="Noche" {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>Noche</option>
                  </UiSelect>
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"})}>Fondo Inicial ($ USD)</UiLabel>
                <UiInput type="number" required step="0.01" value={openingForm.initialAmount} onChange={e => setOpeningForm({...openingForm, initialAmount: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"})} />
              </UiBox>

              <UiBox>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"})}>Observaciones de Entrada</UiLabel>
                <UiTextarea value={openingForm.notes} onChange={e => setOpeningForm({...openingForm, notes: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full resize-none"})} placeholder="Sin novedades..." />
              </UiBox>

              <UiButton type="submit" {...{"variant":"solid","color":"blue","className":"w-full mt-4"}}>
                Abrir Caja y Activar POS
              </UiButton>
            </form>
          </UiCard>
        </UiBox>,
        document.body
      );
    }
  }

  // PANTALLA 2: POS PRINCIPAL EN PANTALLA COMPLETA
  return createPortal(
    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"fixed inset-0 z-[100] flex flex-col overflow-hidden animate-in fade-in duration-300"}}>
      
      {/* CSS Reset para eliminar bordes de foco del buscador en cualquier navegador */}

      
      {/* TOP HEADER POS */}
      <UiBox 
        {...{"style":{"color":"var(--gray-11)"},"className":"h-auto md:h-16 py-3 md:py-0 px-4 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 relative z-30"}}
        style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
      >
        
        {/* Left Area: matches products catalog width */}
        <UiBox {...{"className":"flex-1 flex items-center gap-2.5 w-full"}}>
          {/* Buscar Producto, Código */}
          <UiBox {...{"className":"flex-[1.4] relative"}}>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center gap-2 px-3.5 h-10 w-full"}}>
              <BarcodeScannerIcon {...{"style":{"color":"var(--blue-12)"},"className":"shrink-0"}} size={18} />
              <UiInput
                type="text" 
                id="pos-search-input"
                placeholder="Producto, Nombre, Código" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                {...{"size":"2","color":"gray","className":"w-full"}}
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              />
              {searchTerm && (
                <UiButton iconOnly
                  type="button"
                  onClick={() => setSearchTerm('')}
                  {...{"color":"gray"}}
                >
                  <X size={14} />
                </UiButton>
              )}
            </UiCard>
          </UiBox>

          {/* Cliente, Nombre, RUC */}
          <UiBox {...{"className":"flex-1 relative client-search-container"}}>
            {selectedClientId ? (
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"flex items-center justify-between px-3.5 h-10"}}>
                <UiBox {...{"className":"flex items-center gap-2 min-w-0"}}>
                  <User size={16} {...{"style":{"color":"var(--blue-12)"},"className":"shrink-0"}} />
                  <UiText {...{"size":"2","weight":"bold","className":"truncate max-w-[160px]"}}>
                    {getSelectedClient().name}
                  </UiText>
                  <UiText {...{"size":"1","color":"gray","weight":"regular"}}>
                    ({getSelectedClient().ruc})
                  </UiText>
                </UiBox>
                <UiButton iconOnly
                  type="button"
                  onClick={() => {
                    setSelectedClientId('');
                    setClientSearchTerm('');
                  }}
                  {...{"color":"gray"}}
                  title="Quitar Cliente"
                >
                  <X size={15} />
                </UiButton>
              </UiCard>
            ) : (
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center gap-2 px-3.5 h-10"}}>
                <Search size={16} {...{"style":{"color":"var(--blue-12)"},"className":"shrink-0"}} />
                <UiInput
                  type="text"
                  placeholder="Cliente, Nombre, RUC"
                  value={clientSearchTerm}
                  onChange={e => {
                    setClientSearchTerm(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  {...{"size":"2","color":"gray","className":"w-full"}}
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                />
                {clientSearchTerm && (
                  <UiButton iconOnly
                    type="button"
                    onClick={() => {
                      setClientSearchTerm('');
                      setIsClientDropdownOpen(false);
                    }}
                    {...{"color":"gray"}}
                  >
                    <X size={14} />
                  </UiButton>
                )}
              </UiCard>
            )}
            
            {/* Dropdown de Clientes */}
            {isClientDropdownOpen && clientSearchTerm && (
              <UiBox 
                style={{
                  borderRadius: 'var(--radius-3)',
                  border: '1px solid var(--gray-a6)',
                  backgroundColor: 'var(--color-panel-solid)',
                  boxShadow: 'var(--shadow-3)',
                  zIndex: 50
                }}
                className="absolute left-0 right-0 top-11 max-h-56 overflow-y-auto z-50 custom-scrollbar divide-y divide-[var(--gray-a4)]"
              >
                <button
                  type="button" 
                  onClick={() => {
                    setSelectedClientId('');
                    setClientSearchTerm('');
                    setIsClientDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[var(--accent-3)] transition-colors flex items-center justify-between cursor-pointer bg-transparent border-none outline-none"
                >
                  <span className="font-semibold text-xs text-[var(--gray-12)]">Consumidor Final</span>
                  <span className="text-[10px] font-mono font-medium text-[var(--blue-11)] bg-[var(--blue-3)] px-1.5 py-0.5 rounded">9999999999999</span>
                </button>
                {thirdParties
                  .filter(tp => tp.type !== 'proveedor' && 
                    (tp.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
                     String(tp.ruc || '').includes(clientSearchTerm))
                  )
                  .map(tp => (
                    <button
                      key={tp.id}
                      type="button"
                      onClick={() => {
                        setSelectedClientId(tp.id);
                        setClientSearchTerm('');
                        setIsClientDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[var(--accent-3)] transition-colors flex flex-col gap-0.5 cursor-pointer bg-transparent border-none outline-none"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-[var(--gray-12)] truncate">{tp.name}</span>
                        <span className="text-[10px] font-mono font-medium text-[var(--blue-11)] bg-[var(--blue-3)] px-1.5 py-0.5 rounded shrink-0">
                          {tp.tipoIdentificacion ? tp.tipoIdentificacion.toUpperCase() : 'CI/RUC'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--gray-10)] flex items-center gap-2">
                        <span className="font-mono">ID: {tp.ruc}</span>
                        {tp.telefono && <span>• Tel: {tp.telefono}</span>}
                      </div>
                    </button>
                  ))
                }
              </UiBox>
            )}
          </UiBox>

          {/* Botón Agregar Cliente */}
          <UiButton iconOnly
            type="button"
            onClick={() => {
              setQuickAddFormData({
                name: '', ruc: '', email: '', tipoIdentificacion: 'ruc', direccion: '', telefono: '', tipoContribuyente: 'general'
              });
              setIsQuickAddOpen(true);
            }} 
            {...{"variant":"solid","color":"blue","className":"w-10 flex items-center justify-center shrink-0 cursor-pointer"}}
            title="Crear Nuevo Cliente"
          >
            <UserPlus size={16} />
          </UiButton>
        </UiBox>

        {/* Right Area: matches checkout panel width */}
        <UiBox {...{"className":"w-full lg:w-[32rem] xl:w-[38rem] flex items-center justify-between shrink-0 gap-3"}}>
          {/* Botón de Selección de Factura, Nota de Venta o Cotización */}
          <UiBox {...{"className":"relative doc-type-selector-container"}}>
            <UiButton
              type="button"
              onClick={() => setIsDocTypeDropdownOpen(!isDocTypeDropdownOpen)}
              {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1.5 shrink-0 select-none cursor-pointer"}}
            >
              <UiText>
                {posDocType === 'factura' ? 'Factura Electrónica' : posDocType === 'nota_venta' ? 'Nota de Venta' : 'Cotización'}
              </UiText>
              <ChevronDown size={14} />
            </UiButton>
            
            {isDocTypeDropdownOpen && (
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"absolute left-0 mt-1.5 w-48 z-50 py-1"}}>
                <UiButton
                  type="button"
                  onClick={() => {
                    setPosDocType('factura');
                    setIsDocTypeDropdownOpen(false);
                  }}
                  {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (posDocType === 'factura' ? {"color":"blue"} : {"color":"gray"}))}
                >
                  Factura Electrónica
                </UiButton>
                <UiButton
                  type="button"
                  onClick={() => {
                    setPosDocType('nota_venta');
                    setIsDocTypeDropdownOpen(false);
                  }}
                  {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (posDocType === 'nota_venta' ? {"color":"blue"} : {"color":"gray"}))}
                >
                  Nota de Venta
                </UiButton>
                <UiButton
                  type="button"
                  onClick={() => {
                    setPosDocType('cotizacion');
                    setIsDocTypeDropdownOpen(false);
                  }}
                  {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (posDocType === 'cotizacion' ? {"color":"blue"} : {"color":"gray"}))}
                >
                  Cotización
                </UiButton>
              </UiBox>
            )}
          </UiBox>

          {/* INFO LOCAL Y BOTONES DE AJUSTE */}
          <UiBox {...{"className":"flex items-center gap-3"}}>
            <UiBox {...{"className":"select-none"}}>
              <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>
                {activeSession?.branch || 'MATRIZ QUITO'} : 
              </UiText>
              <UiText {...{"weight":"bold","color":"gray"}}>
                {' '}Fondo ${Number(activeSession?.initialAmount || 100).toFixed(0)}
              </UiText>
            </UiBox>
            
            {/* Dropdown del Gear (Settings) */}
            <UiBox {...{"className":"relative options-gear-container"}}>
              <UiButton iconOnly
                type="button"
                onClick={() => setIsOptionsDropdownOpen(!isOptionsDropdownOpen)} 
                {...mergeThemeProps({"variant":"outline","className":"w-10 flex items-center justify-center cursor-pointer"}, {}, (isOptionsDropdownOpen ? {"variant":"soft","color":"blue"} : {"color":"blue","variant":"surface"}))}
                title="Opciones de Caja y POS"
              >
                <Settings size={18} />
              </UiButton>
              
              {isOptionsDropdownOpen && (
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"absolute right-0 mt-1.5 w-52 z-50 py-1"}}>
                  {hasSuspendedSale && (
                    <UiButton
                      type="button"
                      onClick={() => {
                        resumeSale();
                        setIsOptionsDropdownOpen(false);
                      }}
                      {...{"size":"2","color":"green","className":"w-full text-left flex items-center gap-2"}}
                    >
                      <ShoppingCart size={13} />
                      <UiText>Recuperar Venta</UiText>
                    </UiButton>
                  )}
                  <UiButton
                    type="button"
                    onClick={() => {
                      setIsShortcutsOpen(true);
                      setIsOptionsDropdownOpen(false);
                    }}
                    {...{"size":"2","color":"gray","className":"w-full text-left flex items-center gap-2"}}
                  >
                    <Keyboard size={13} />
                    <UiText>Ver Atajos de Teclado (F2)</UiText>
                  </UiButton>
                  {!isPreventaOnly && (
                    <UiButton
                      type="button"
                      onClick={() => {
                        setIsHistoryOpen(true);
                        setIsOptionsDropdownOpen(false);
                      }}
                      {...{"size":"2","color":"gray","className":"w-full text-left flex items-center gap-2"}}
                    >
                      <History size={13} />
                      <UiText>Historial de Ventas</UiText>
                    </UiButton>
                  )}
                  {!isPreventaOnly && (
                    <UiButton
                      type="button"
                      onClick={() => {
                        handleOpenCloseModal();
                        setIsOptionsDropdownOpen(false);
                      }}
                      {...{"size":"2","color":"gray","className":"w-full text-left flex items-center gap-2"}}
                    >
                      <DollarSign size={13} />
                      <UiText>Arqueo / Cerrar Caja</UiText>
                    </UiButton>
                  )}
                  <UiButton
                    type="button"
                    onClick={() => {
                      setIsConfigOpen(true);
                      setIsOptionsDropdownOpen(false);
                    }}
                    {...{"size":"2","color":"gray","className":"w-full text-left flex items-center gap-2"}}
                  >
                    <Sliders size={13} />
                    <UiText>Personalización del POS</UiText>
                  </UiButton>
                </UiBox>
              )}
            </UiBox>

            {/* Botón Salir */}
            <UiButton iconOnly
              type="button" 
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  window.location.reload();
                }
              }} 
              {...{"variant":"surface","color":"blue","className":"w-10 flex items-center justify-center cursor-pointer"}} 
              title="Volver al ERP / Cerrar POS"
            >
              <LogOut size={18} />
            </UiButton>
          </UiBox>
        </UiBox>
      </UiBox>

      {/* POS WORKSPACE CONTAINER */}
      <UiBox {...{"className":"flex-1 flex overflow-hidden min-h-0"}}>
        {showPaymentScreen ? (
          <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"flex-1 flex flex-col lg:flex-row min-h-0 animate-in fade-in duration-300"}}>
            {/* COLUMNA IZQUIERDA: RESUMEN DE COMPRA Y CLIENTE */}
            <UiBox {...{"style":{"borderRight":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"w-full lg:w-[28rem] xl:w-[32rem] flex flex-col shrink-0 p-6 justify-between overflow-y-auto custom-scrollbar"}}>
              <UiBox {...{"className":"space-y-6"}}>
                {/* Cabecera / Regresar */}
                <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between pb-4"}}>
                  <UiButton
                    type="button"
                    onClick={() => setShowPaymentScreen(false)}
                    {...{"size":"2","color":"blue","className":"flex items-center gap-2"}}
                  >
                    <ArrowLeft size={16} />
                    <UiText>Modificar Carrito / Regresar</UiText>
                  </UiButton>
                  <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"px-2.5 py-1"}}>
                    Paso de Pago
                  </UiText>
                </UiBox>

                {/* Tipo de Documento Seleccionado */}
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4"}}>
                  <UiBox {...{"className":"flex items-center gap-3"}}>
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-9)","color":"var(--color-background)"},"className":"w-10 h-10 flex items-center justify-center shrink-0"}}>
                      <FileText size={20} />
                    </UiBox>
                    <UiBox>
                      <UiText {...{"size":"1","weight":"bold","color":"gray"}}>Documento a Emitir</UiText>
                      <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>
                        {posDocType === 'factura' ? 'Factura Electrónica' : posDocType === 'nota_venta' ? 'Nota de Venta' : 'Cotización / Proforma'}
                      </UiHeading>
                    </UiBox>
                  </UiBox>
                </UiBox>

                {/* Datos del Cliente */}
                <UiBox {...{"className":"space-y-3"}}>
                  <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray"}}>Datos del Cliente</UiHeading>
                  {(() => {
                    const client = getSelectedClient();
                    return (
                      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)","color":"var(--gray-12)"},"className":"p-4 space-y-2"}}>
                        <UiBox>
                          <UiText {...{"weight":"bold","color":"gray","size":"1","className":"block"}}>Razón Social / Nombre</UiText>
                          <UiText {...{"weight":"bold","size":"2","color":"gray","highContrast":true}}>{client.name}</UiText>
                        </UiBox>
                        <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                          <UiBox>
                            <UiText {...{"weight":"bold","color":"gray","size":"1","className":"block"}}>RUC / Cédula</UiText>
                            <UiText {...{"weight":"regular","color":"gray","highContrast":true}}>{client.ruc}</UiText>
                          </UiBox>
                          <UiBox>
                            <UiText {...{"weight":"bold","color":"gray","size":"1","className":"block"}}>Teléfono</UiText>
                            <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>{client.telefono || 'N/A'}</UiText>
                          </UiBox>
                        </UiBox>
                        <UiBox>
                          <UiText {...{"weight":"bold","color":"gray","size":"1","className":"block"}}>Correo Electrónico</UiText>
                          <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>{client.email || 'N/A'}</UiText>
                        </UiBox>
                        <UiBox>
                          <UiText {...{"weight":"bold","color":"gray","size":"1","className":"block"}}>Dirección</UiText>
                          <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>{client.direccion || 'N/A'}</UiText>
                        </UiBox>
                      </UiBox>
                    );
                  })()}
                </UiBox>

                {/* Resumen de Productos */}
                <UiBox {...{"className":"space-y-3"}}>
                  <UiBox {...{"className":"flex justify-between items-center"}}>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray"}}>Productos en Venta</UiHeading>
                    <UiText {...{"size":"1","weight":"bold","color":"gray","className":"px-2 py-0.5"}}>
                      {cart.reduce((acc, it) => acc + it.quantity, 0)} Items
                    </UiText>
                  </UiBox>
                  <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"max-h-48 overflow-y-auto custom-scrollbar"}}>
                    {cart.map((item, idx) => (
                      <UiBox key={idx} {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3 flex justify-between items-center gap-3"}}>
                        <UiBox {...{"className":"min-w-0 flex-1"}}>
                          <UiText as="p" {...{"weight":"bold","color":"gray","highContrast":true,"className":"truncate"}}>{item.name}</UiText>
                          <UiText as="p" {...{"size":"1","color":"gray","className":"mt-0.5"}}>{item.quantity} x ${Number(item.price).toFixed(2)}</UiText>
                        </UiBox>
                        <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>${(item.price * item.quantity).toFixed(2)}</UiText>
                      </UiBox>
                    ))}
                  </UiBox>
                </UiBox>
              </UiBox>

              {/* Totales y Botón Abandonar */}
              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"mt-6 pt-6 space-y-4"}}>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","color":"var(--color-background)"},"className":"p-4 space-y-2"}}>
                  <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex justify-between"}}>
                    <UiText>Subtotal</UiText>
                    <UiText>${getSubtotal().toFixed(2)}</UiText>
                  </UiBox>
                  {getDiscountAmount() > 0 && (
                    <UiBox {...{"style":{"color":"var(--red-11)"},"className":"flex justify-between"}}>
                      <UiText>Descuento</UiText>
                      <UiText>-${getDiscountAmount().toFixed(2)}</UiText>
                    </UiBox>
                  )}
                  <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex justify-between"}}>
                    <UiText>IVA (15%)</UiText>
                    <UiText>${getIva().toFixed(2)}</UiText>
                  </UiBox>
                  <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between items-end pt-2"}}>
                    <UiText {...{"size":"1","weight":"bold","color":"gray"}}>Total a Pagar</UiText>
                    <UiText {...{"size":"6","weight":"regular"}}>${getTotal().toFixed(2)}</UiText>
                  </UiBox>
                </UiBox>

                <UiButton
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
                  {...{"variant":"outline","color":"red","size":"2","className":"w-full flex items-center justify-center gap-1.5"}}
                >
                  <Trash2 size={13} />
                  <UiText>Abandonar Venta (Vaciar)</UiText>
                </UiButton>
              </UiBox>
            </UiBox>

            {/* COLUMNA DERECHA: MÉTODOS DE PAGO Y CONFIRMACIÓN */}
            <UiBox {...{"className":"flex-1 flex flex-col p-6 min-h-0 justify-between overflow-y-auto custom-scrollbar"}}>
              <UiBox {...{"className":"space-y-6 max-w-2xl mx-auto w-full"}}>
                <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Seleccionar Método de Pago</UiHeading>
                
                {/* Tabs de Métodos de Pago */}
                <UiBox {...{"className":"grid grid-cols-3 gap-3"}}>
                  <UiButton
                    type="button"
                    onClick={() => {
                      setPosPaymentMethod('efectivo');
                      setReceivedAmount('');
                    }}
                    {...mergeThemeProps({"variant":"outline","size":"2","className":"flex flex-col items-center gap-2"}, {}, (posPaymentMethod === 'efectivo' ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                  >
                    <DollarSign size={20} />
                    <UiText>Efectivo</UiText>
                  </UiButton>

                  <UiButton
                    type="button"
                    onClick={() => {
                      setPosPaymentMethod('transferencia');
                      setReceivedAmount('');
                    }}
                    {...mergeThemeProps({"variant":"outline","size":"2","className":"flex flex-col items-center gap-2"}, {}, (posPaymentMethod === 'transferencia' ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                  >
                    <RefreshCw size={20} />
                    <UiText>Transferencia</UiText>
                  </UiButton>

                  <UiButton
                    type="button"
                    onClick={() => {
                      setPosPaymentMethod('tarjeta');
                      setReceivedAmount('');
                    }}
                    {...mergeThemeProps({"variant":"outline","size":"2","className":"flex flex-col items-center gap-2"}, {}, (posPaymentMethod === 'tarjeta' ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                  >
                    <CreditCard size={20} />
                    <UiText>Tarjeta</UiText>
                  </UiButton>
                </UiBox>

                {/* Panel de Método de Pago Seleccionado */}
                <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6 space-y-6"}}>
                  {posPaymentMethod === 'efectivo' ? (
                    <UiBox {...{"className":"space-y-6"}}>
                      <UiBox {...{"className":"flex flex-col gap-2"}}>
                        <UiLabel {...{"size":"1","weight":"bold","color":"gray"}}>Dinero Recibido</UiLabel>
                        <UiBox {...{"className":"relative"}}>
                          <UiText {...{"size":"4","weight":"regular","color":"gray","className":"absolute left-4 top-1/2 -translate-y-1/2"}}>$</UiText>
                          <UiInput
                            type="number"
                            placeholder="0.00"
                            value={receivedAmount}
                            onChange={e => setReceivedAmount(e.target.value)}
                            {...{"size":"3","color":"gray","className":"w-full"}}
                          />
                        </UiBox>
                      </UiBox>

                      {/* Billetes Rápidos */}
                      <UiBox {...{"className":"space-y-2"}}>
                        <UiText {...{"size":"1","weight":"bold","color":"gray"}}>Vuelto Rápido (Billetes)</UiText>
                        <UiBox {...{"className":"grid grid-cols-4 gap-2"}}>
                          <UiButton
                            type="button"
                            onClick={() => setReceivedAmount(Number(getTotal().toFixed(2)))}
                            {...{"variant":"soft","color":"gray","size":"2"}}
                          >
                            Exacto
                          </UiButton>
                          {[1, 5, 10, 20, 50, 100].map(bill => (
                            <UiButton
                              type="button"
                              key={bill}
                              onClick={() => setReceivedAmount(bill)}
                              {...{"variant":"surface","size":"2","color":"gray"}}
                            >
                              ${bill}.00
                            </UiButton>
                          ))}
                        </UiBox>
                      </UiBox>

                      {/* Vuelto / Mensajes de Control */}
                      {Number(receivedAmount) > 0 && (
                        <UiBox {...{"className":"animate-in fade-in slide-in-from-top-1 duration-200"}}>
                          {changeDue > 0 ? (
                            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--green-3)","border":"1px solid var(--gray-a6)","color":"var(--green-12)"},"className":"p-4 flex justify-between items-center"}}>
                              <UiText {...{"size":"1","weight":"bold"}}>Vuelto a Entregar:</UiText>
                              <UiText {...{"size":"6","weight":"regular","color":"green"}}>${changeDue.toFixed(2)}</UiText>
                            </UiBox>
                          ) : remainingDue > 0 ? (
                            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","border":"1px solid var(--gray-a6)","color":"var(--red-12)"},"className":"p-4 flex justify-between items-center"}}>
                              <UiText {...{"size":"1","weight":"bold"}}>Faltante por Pagar:</UiText>
                              <UiText {...{"size":"4","weight":"regular","color":"red"}}>${remainingDue.toFixed(2)}</UiText>
                            </UiBox>
                          ) : (
                            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"p-4 flex justify-between items-center"}}>
                              <UiText {...{"size":"1","weight":"bold"}}>Monto Exacto Entregado</UiText>
                              <UiText {...{"size":"4","weight":"regular","color":"gray","highContrast":true}}>$0.00</UiText>
                            </UiBox>
                          )}
                        </UiBox>
                      )}
                    </UiBox>
                  ) : (
                    /* Transferencia o Tarjeta */
                    <UiBox {...{"className":"space-y-4"}}>
                      <UiBox {...{"className":"flex flex-col gap-2"}}>
                        <UiLabel {...{"size":"1","weight":"bold","color":"gray"}}>Referencia de Transacción / Voucher</UiLabel>
                        <UiInput
                          type="text"
                          placeholder="Ej: 982138912"
                          value={paymentRefCode}
                          onChange={e => setPaymentRefCode(e.target.value)}
                          {...{"size":"2","color":"gray","className":"w-full"}}
                        />
                      </UiBox>
                      <UiText as="p" {...{"size":"1","color":"gray","className":"italic"}}>
                        Nota: Al registrar este pago, el total de ${getTotal().toFixed(2)} se asignará automáticamente a {posPaymentMethod === 'transferencia' ? 'Transferencia Bancaria' : 'Tarjeta de Crédito/Débito'}.
                      </UiText>
                    </UiBox>
                  )}
                </UiCard>
              </UiBox>

              {/* Botón Finalizar Checkout */}
              <UiBox {...{"className":"mt-8 max-w-2xl mx-auto w-full"}}>
                <UiButton
                  type="button"
                  onClick={handleFinalCheckout}
                  disabled={isProcessing}
                  {...{"variant":"solid","color":"gray","size":"2","className":"w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"}}
                >
                  <CheckCircle2 size={18} />
                  <UiText>
                    {isProcessing ? 'Procesando...' : 
                      posDocType === 'factura' ? 'Revisar factura (F12)' :
                      posDocType === 'nota_venta' ? 'Revisar venta (F12)' :
                      'Guardar Cotización (F12)'
                    }
                  </UiText>
                </UiButton>
              </UiBox>
            </UiBox>
          </UiBox>
        ) : (
          /* POS MAIN AREA (PRODUCTS + CART) */
          <UiBox {...mergeThemeProps({"className":"flex-1 flex overflow-hidden min-h-0"}, {}, (posConfig.cartPosition === 'left' ? {"className":"flex-row-reverse"} : {}))}>
        
        {/* LADO IZQUIERDO: SELECCIÓN Y FILTRO DE PRODUCTOS */}
        <UiBox {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex-1 flex flex-col pt-[7px] px-3 sm:px-4 lg:px-6 pb-6 min-w-0"})}>
          
          {/* BARRA DE FILTROS SUPER MINIMALISTA (SIN SOMBRAS) */}
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center justify-between gap-4 py-2 mb-4 select-none shrink-0"}}>
            {/* Left: Filter Icon + Ver Todos + Total Count */}
            <UiBox {...{"className":"flex items-center gap-2 shrink-0"}}>
              <UiButton
                type="button"
                onClick={() => {
                  setFilterCategory('all');
                  setFilterBrand('all');
                  setFilterWarehouse('all');
                  setIsSearchModalOpen(true);
                }}
                {...{"color":"gray","className":"flex items-center gap-2 hover:opacity-80 active:scale-95 transition-transform"}}
              >
                <SlidersHorizontal size={18} {...{"style":{"color":"var(--blue-12)"}}} />
                <UiText {...{"weight":"bold","size":"2","color":"gray","highContrast":true}}>Ver Todos</UiText>
                <UiText {...{"size":"1","weight":"bold","className":"px-2 py-0.5 select-none"}}>
                  {products.length}
                </UiText>
              </UiButton>
            </UiBox>

            {/* Middle: Horizontal Category List (Scrollable, Minimalist) */}
            <UiBox {...{"className":"flex-1 flex items-center gap-3 overflow-x-auto py-1 scrollbar-none custom-scrollbar select-none"}}>
              {categoriesWithCount.map(cat => {
                const isSelected = filterCategory === cat.name;
                return (
                  <UiButton
                    key={cat.name}
                    type="button"
                    onClick={() => setFilterCategory(cat.name)}
                    {...mergeThemeProps({"size":"2","variant":"ghost","className":"flex items-center gap-1.5 whitespace-nowrap"}, {}, (isSelected ? {"color":"blue"} : {"color":"gray"}))}
                  >
                    <UiText>{cat.name}</UiText>
                    <UiText 
                      {...mergeThemeProps({"size":"1","weight":"bold","className":"px-1.5 py-0.5"}, {}, (isSelected ? {} : {"color":"blue"}))}
                      style={!isSelected ? { backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' } : {}}
                    >
                      {cat.count}
                    </UiText>
                  </UiButton>
                );
              })}
            </UiBox>

            {/* Right: Grid & List Switcher */}
            <UiBox {...{"style":{"borderLeft":"1px solid var(--gray-a6)"},"className":"flex items-center gap-1.5 shrink-0 pl-3"}}>
              <UiButton iconOnly
                type="button"
                onClick={() => {
                  const newConfig = { ...posConfig, viewType: 'grid' };
                  setPosConfig(newConfig);
                  localStorage.setItem(`pos_config_${appId}`, JSON.stringify(newConfig));
                }}
                {...mergeThemeProps({}, {}, (posConfig.viewType === 'grid' ? {"color":"blue"} : {"color":"gray"}))}
                title="Vista Cuadrícula"
              >
                <LayoutGrid size={20} />
              </UiButton>
              <UiButton iconOnly
                type="button"
                onClick={() => {
                  const newConfig = { ...posConfig, viewType: 'list' };
                  setPosConfig(newConfig);
                  localStorage.setItem(`pos_config_${appId}`, JSON.stringify(newConfig));
                }}
                {...mergeThemeProps({}, {}, (posConfig.viewType === 'list' ? {"color":"blue"} : {"color":"gray"}))}
                title="Vista Vista"
              >
                <List size={20} />
              </UiButton>
            </UiBox>
          </UiBox>

          {/* GRID O LISTA DE PRODUCTOS */}
          {posConfig.viewType === 'list' ? (
            /* LIST LAYOUT */
            <UiBox {...{"className":"flex-1 overflow-y-auto flex flex-col gap-2.5 p-1 custom-scrollbar"}}>
              {filteredProducts.map(p => {
                const isOutOfStock = p.type === 'producto' && productKind(p) !== 'COMBO' && p.inventoryType !== 'VIRTUAL' && p.stock <= 0;
                return (
                  <UiBox 
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    {...mergeThemeProps({"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"p-3 flex items-center justify-between gap-4 cursor-pointer select-none group relative overflow-hidden"}, {}, (isOutOfStock ? {"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"opacity-40 cursor-not-allowed"} : {"style":{"backgroundColor":"var(--blue-3)"}}))}
                  >
                    <UiBox {...{"className":"flex-1 min-w-0 flex items-center gap-3"}}>
                      <img 
                        src={getProductImageUrl(p)} 
                        {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"w-10 h-10 object-cover shrink-0"}}
                        alt={p.name} 
                        onError={(e) => {
                          e.target.src = '/product.svg';
                        }}
                      />
                      <UiBox {...{"className":"min-w-0 flex-1"}}>
                        <UiBox {...{"className":"flex items-center gap-2"}}>
                          <UiText {...{"weight":"regular","size":"1","color":"gray","className":"shrink-0"}}>{p.sku}</UiText>
                          <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"px-1.5 py-0.5 shrink-0"}, {}, (p.type === 'producto' ? {"color":"blue"} : {"color":"purple"}))}>{p.type}</UiText>
                        </UiBox>
                        <UiHeading as="h4" {...mergeThemeProps({"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"leading-snug truncate"})}>{p.name}</UiHeading>
                        <UiText as="p" {...{"size":"1","color":"gray","className":"truncate"}}>{p.marca || 'Sin Marca'} | {p.categoria || 'General'}</UiText>
                      </UiBox>
                    </UiBox>

                    <UiBox {...{"className":"flex items-center gap-6 shrink-0"}}>
                      {posConfig.showStock && p.type === 'producto' && (() => {
                        if (p.inventoryType === 'VIRTUAL') {
                          return (
                            <UiText {...{"size":"1","color":"gray","className":"italic"}}>Virtual (N/A)</UiText>
                          );
                        }
                        const minStk = p.minStock !== undefined ? Number(p.minStock) : 2;
                        const isCritical = p.stock <= minStk;
                        return (
                          <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"px-2 py-0.5 shrink-0"}, {}, (isCritical ? {"color":"red","weight":"bold","className":"animate-pulse"} : {"color":"green"}))}>
                            {p.bodega || 'Central'}: {p.stock}
                          </UiText>
                        );
                      })()}
                      <UiBox {...{"className":"text-right shrink-0"}}>
                        <UiText {...mergeThemeProps({"size":"3","weight":"bold","color":"gray","highContrast":true,"className":"block"})}>${Number(p.price).toFixed(2)}</UiText>
                      </UiBox>
                      <UiButton iconOnly
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                        }}
                        {...mergeThemeProps({"variant":"solid","color":"blue"}, {}, (isOutOfStock ? {"className":"opacity-50 cursor-not-allowed"} : {}))}
                      >
                        <Plus size={14} />
                      </UiButton>
                    </UiBox>
                  </UiBox>
                );
              })}
              {filteredProducts.length === 0 && (
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex flex-col items-center justify-center py-24"}}>
                  <ShoppingCart size={40} {...{"className":"opacity-30 mb-2"}} />
                  <UiText as="p" {...{"size":"1","className":"italic"}}>No hay productos que coincidan con los filtros.</UiText>
                </UiBox>
              )}
            </UiBox>
          ) : (
            /* GRID LAYOUT */
            <UiBox {...mergeThemeProps({"className":"flex-1 overflow-y-auto grid"}, {"className":"gap-3 p-3 pb-6 content-start custom-scrollbar"}, resolveThemeProps(getGridColsClass()))}>
              {filteredProducts.map(p => {
                const isOutOfStock = p.type === 'producto' && productKind(p) !== 'COMBO' && p.inventoryType !== 'VIRTUAL' && p.stock <= 0;
                const minStk = p.minStock !== undefined ? Number(p.minStock) : 2;
                const isLowStock = p.type === 'producto' && productKind(p) !== 'COMBO' && p.inventoryType !== 'VIRTUAL' && p.stock <= minStk && p.stock > 0;
                
                const cartItem = cart.find(item => item.productId === p.id);
                const quantityInCart = cartItem ? cartItem.quantity : 0;
                
                return <PosProductCard key={p.id} product={p} imageUrl={getProductImageUrl(p)} quantity={quantityInCart} outOfStock={isOutOfStock} lowStock={isLowStock} onAdd={() => addToCart(p)} />;
              })}
              {filteredProducts.length === 0 && (
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"col-span-full flex flex-col items-center justify-center py-24"}}>
                  <ShoppingCart size={40} {...{"className":"opacity-30 mb-2"}} />
                  <UiText as="p" {...{"size":"1","className":"italic"}}>No hay productos que coincidan con los filtros.</UiText>
                </UiBox>
              )}
            </UiBox>
          )}

          {/* LEYENDA DE STOCK AL PIE DEL CATÁLOGO */}
          {posConfig.showStock && (
            <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"mt-4 pt-3 flex items-center gap-4 shrink-0"}, {}, {"style":{"color":"var(--blue-12)"}})}>
              <UiText {...{"className":"flex items-center gap-1.5"}}>
                <UiText {...{"className":"w-2.5 h-2.5"}}></UiText>
                En Stock
              </UiText>
              <UiText {...{"className":"flex items-center gap-1.5"}}>
                <UiText {...{"className":"w-2.5 h-2.5 animate-pulse"}}></UiText>
                Bajo Stock
              </UiText>
              <UiText {...{"className":"flex items-center gap-1.5"}}>
                <UiText {...{"className":"w-2.5 h-2.5"}}></UiText>
                Sin Stock / Servicio
              </UiText>
            </UiBox>
          )}
        </UiBox>

        {/* LADO DERECHO: DETALLE DEL PEDIDO (CHECKOUT FIJO) */}
        <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full lg:w-[32rem] xl:w-[38rem] flex flex-col shrink-0"})}>


          
          {/* CABECERA DETALLE DEL PEDIDO */}
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"px-4 py-2 flex justify-between items-center shrink-0 gap-2"}}>
            {/* Left: Items + count */}
            <UiBox {...{"className":"flex items-center gap-2"}}>
              <UiText {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Items</UiText>
              <UiText {...{"color":"blue","size":"1","weight":"bold","className":"px-2 py-0.5 select-none"}}>
                {cart.reduce((acc, it) => acc + it.quantity, 0)}
              </UiText>
            </UiBox>

            {/* Right: Descuento, Guardar Borrador, Vaciar */}
            <UiBox {...{"className":"flex items-center gap-2"}}>
              <UiButton
                type="button"
                onClick={() => setIsDiscountOpen(prev => !prev)} 
                {...{"variant":"surface","color":"gray","size":"2","className":"flex items-center gap-1.5 select-none cursor-pointer"}}
              >
                <Tag size={12} {...{"style":{"color":"var(--blue-12)"}}} />
                <UiText>Descuento</UiText>
              </UiButton>
              <UiButton
                type="button"
                onClick={suspendSale} 
                {...{"variant":"surface","color":"gray","size":"2","className":"flex items-center gap-1.5 select-none cursor-pointer"}}
              >
                <Bookmark size={12} {...{"style":{"color":"var(--blue-12)"}}} />
                <UiText>Suspender venta</UiText>
              </UiButton>
              <UiButton
                type="button"
                onClick={() => setCart([])} 
                {...{"variant":"surface","color":"red","size":"2","className":"flex items-center gap-1.5 select-none cursor-pointer"}}
              >
                <Trash2 size={12} {...{"style":{"color":"var(--red-11)"}}} />
                <UiText>Vaciar</UiText>
              </UiButton>
            </UiBox>
          </UiCard>

          {/* LISTA CARRITO POS */}
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex-1 overflow-y-auto px-4 py-2 custom-scrollbar"}}>
            {cart.map((item, idx) => {
              const prod = products.find(p => p.id === item.productId);
              return (
                <UiBox key={idx} {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"py-2.5 flex items-center justify-between gap-3"}}>
                  {/* Imagen o iniciales */}
                  <img 
                    src={getProductImageUrl(prod)} 
                    {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"w-8 h-8 object-cover shrink-0"}}
                    alt={item.name} 
                    onError={(e) => {
                      e.target.src = '/product.svg';
                    }}
                  />

                  {/* Nombre, SKU y precio unitario */}
                  <UiBox {...{"className":"flex-1 min-w-0"}}>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"truncate"}} title={item.name}>{item.name}</UiHeading>
                    <UiText as="p" {...{"size":"1","color":"gray","weight":"regular"}}>{prod?.sku || 'SKU N/A'}</UiText>
                    {item.discount_value > 0 && (
                      <UiBox {...{"className":"flex items-center gap-1 mt-0.5 animate-in fade-in duration-200"}}>
                        <UiText {...{"color":"red","weight":"bold","size":"1","className":"px-1 py-0.5 flex items-center gap-0.5"}}>
                          <Tag size={8} /> -{item.discount_type === 'PORCENTAJE' ? `${item.discount_value}%` : `$${item.discount_value}`}
                        </UiText>
                      </UiBox>
                    )}
                  </UiBox>

                  {/* Selector de Cantidad */}
                  <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"flex items-center p-0.5 shrink-0"}}>
                    <UiButton iconOnly
                      type="button" 
                      onClick={() => updateQuantity(item.productId, -1)} 
                      {...{"color":"gray","className":"w-6 flex items-center justify-center"}}
                      title="Disminuir cantidad"
                    >
                      <Minus size={11} />
                    </UiButton>
                    
                    <UiInput
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
                      {...{"size":"2","color":"gray","className":"w-10 text-center"}}
                    />

                    <UiButton iconOnly
                      type="button" 
                      onClick={() => updateQuantity(item.productId, 1)} 
                      {...{"color":"blue","className":"w-6 flex items-center justify-center"}}
                      title="Aumentar cantidad"
                    >
                      <Plus size={11} />
                    </UiButton>
                  </UiBox>

                  {/* Subtotal, Botón Descuento e Ícono de Eliminar */}
                  <UiBox {...{"className":"flex items-center gap-2.5 shrink-0"}}>
                    <UiText {...{"weight":"bold","size":"1","color":"gray","highContrast":true,"className":"text-right min-w-[55px]"}}>
                      {item.discount_value > 0 && (
                        <UiText {...{"color":"gray","className":"line-through mr-1.5"}}>${(item.price * item.quantity).toFixed(2)}</UiText>
                      )}
                      ${(totalsResult.items?.[idx]?.subtotal_neto_linea || item.price * item.quantity).toFixed(2)}
                    </UiText>
                    <UiButton iconOnly
                      type="button" 
                      onClick={() => setSelectedLineItemForDiscount(item)} 
                      {...mergeThemeProps({"variant":"outline","className":"flex items-center justify-center shrink-0 cursor-pointer"}, {}, (item.discount_value > 0 ? {"variant":"solid","color":"red"} : {"variant":"surface","color":"gray"}))}
                      title="Descuento del ítem"
                    >
                      <Percent size={11} />
                    </UiButton>
                    <UiButton iconOnly
                      type="button" 
                      onClick={() => removeFromCart(item.productId)} 
                      {...{"variant":"soft","color":"red","className":"flex items-center justify-center shrink-0 cursor-pointer"}}
                      title="Eliminar del carrito"
                    >
                      <Trash2 size={13} />
                    </UiButton>
                  </UiBox>
                </UiBox>
              );
            })}
            {cart.length === 0 && (
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex flex-col items-center justify-center h-full text-center py-16"}}>
                <ShoppingCart size={36} {...{"style":{"color":"var(--blue-12)"},"className":"opacity-20 mb-2 animate-pulse"}} />
                <UiText as="p" {...{"size":"1","className":"italic"}}>Carrito de Venta Vacío</UiText>
              </UiBox>
            )}
          </UiBox>

          {/* ACCIONES Y TOTALES */}
          <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 space-y-4 shrink-0"})}>
            {/* DESCUENTO CARD */}
            {isDiscountOpen && (
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3 space-y-2 animate-in slide-in-from-top-2 duration-200"}}>
                <UiBox {...{"className":"flex justify-between items-center"}}>
                  <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Descuento General</UiText>
                  <UiButton iconOnly
                    type="button"
                    onClick={() => { setIsDiscountOpen(false); setSelectedGeneralDiscount(null); }} 
                    {...{"color":"gray"}}
                  >
                    <X size={12} />
                  </UiButton>
                </UiBox>
                <UiBox {...{"className":"space-y-2"}}>
                  <UiSelect
                    value={selectedGeneralDiscount?.id === 'manual' ? 'manual' : (selectedGeneralDiscount?.id || '')} 
                    onChange={e => {
                      const discId = e.target.value;
                      if (!discId) {
                        setSelectedGeneralDiscount(null);
                        return;
                      }
                      if (discId === 'manual') {
                        const val = parseFloat(manualGeneralDiscValue) || 0;
                        setSelectedGeneralDiscount({
                          id: 'manual',
                          nombre: `Manual (${manualGeneralDiscType === 'PORCENTAJE' ? `${val}%` : `$${val}`})`,
                          tipo_valor: manualGeneralDiscType,
                          valor: val
                        });
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
                    {...{"size":"2","color":"gray","className":"w-full cursor-pointer"}}
                  >
                    <option value="">-- Seleccionar Descuento General --</option>
                    <option value="manual">⚡ Descuento Manual (% o $)</option>
                    {getActiveDiscounts('VENTA').map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : `$${d.valor}`})
                      </option>
                    ))}
                  </UiSelect>

                  {/* Inputs para Descuento Manual General */}
                  {selectedGeneralDiscount?.id === 'manual' && (
                    <UiBox className="flex items-center gap-2 pt-1">
                      <UiSelect
                        value={manualGeneralDiscType}
                        onChange={e => {
                          const newType = e.target.value;
                          setManualGeneralDiscType(newType);
                          const val = parseFloat(manualGeneralDiscValue) || 0;
                          setSelectedGeneralDiscount({
                            id: 'manual',
                            nombre: `Manual (${newType === 'PORCENTAJE' ? `${val}%` : `$${val}`})`,
                            tipo_valor: newType,
                            valor: val
                          });
                        }}
                        size="1"
                        color="gray"
                        className="w-24 cursor-pointer"
                      >
                        <option value="PORCENTAJE">% Porc.</option>
                        <option value="MONTO_FIJO">$ Monto</option>
                      </UiSelect>
                      <UiInput
                        type="number"
                        min="0"
                        step={manualGeneralDiscType === 'PORCENTAJE' ? '1' : '0.01'}
                        value={manualGeneralDiscValue}
                        onChange={e => {
                          const newVal = e.target.value;
                          setManualGeneralDiscValue(newVal);
                          const val = parseFloat(newVal) || 0;
                          setSelectedGeneralDiscount({
                            id: 'manual',
                            nombre: `Manual (${manualGeneralDiscType === 'PORCENTAJE' ? `${val}%` : `$${val}`})`,
                            tipo_valor: manualGeneralDiscType,
                            valor: val
                          });
                        }}
                        size="1"
                        color="gray"
                        placeholder="0"
                        className="flex-1 font-mono"
                      />
                    </UiBox>
                  )}

                  {selectedGeneralDiscount && (
                    <UiBox {...{"style":{"color":"var(--gray-11)","backgroundColor":"var(--indigo-3)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center p-2"}}>
                      <UiText>Aplicado: <strong>{selectedGeneralDiscount.nombre}</strong></UiText>
                      <UiButton
                        type="button" 
                        onClick={() => setSelectedGeneralDiscount(null)} 
                        {...{"color":"red","className":"cursor-pointer"}}
                      >
                        Quitar
                      </UiButton>
                    </UiBox>
                  )}
                </UiBox>
              </UiCard>
            )}

            <UiBox {...{"className":"space-y-2"}}>
              <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-12)"},"className":"flex justify-between"})}>
                <UiText>Subtotal Bruto</UiText>
                <UiText>${getSubtotal().toFixed(2)}</UiText>
              </UiBox>
              {productDiscountsTotal > 0 && (
                <UiBox {...{"style":{"color":"var(--red-11)"},"className":"flex justify-between"}}>
                  <UiText>Descuentos por Producto</UiText>
                  <UiText>-${productDiscountsTotal.toFixed(2)}</UiText>
                </UiBox>
              )}
              {getDiscountAmount() > 0 && (
                <UiBox {...{"style":{"color":"var(--red-11)"},"className":"flex justify-between"}}>
                  <UiText>Descuento General</UiText>
                  <UiText>-${getDiscountAmount().toFixed(2)}</UiText>
                </UiBox>
              )}
              <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-12)"},"className":"flex justify-between"})}>
                <UiText>Impuestos (IVA)</UiText>
                <UiText>${getIva().toFixed(2)}</UiText>
              </UiBox>
              <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"flex justify-between pt-2.5"})}>
                <UiText>TOTAL A PAGAR</UiText>
                <UiText {...{"color":"blue","size":"6","className":"tabular-nums"}}>${getTotal().toFixed(2)}</UiText>
              </UiBox>
            </UiBox>

            <UiBox {...{"className":"flex gap-2.5 mt-4 pt-1"}}>
              <UiButton
                type="button" 
                onClick={playCashRegisterSound}
                {...{"variant":"surface","color":"blue","className":"flex-1 flex items-center justify-center gap-1.5"}}
                title="Simular Apertura de Gaveta de Dinero"
              >
                <Unlock size={13} {...{"style":{"color":"var(--blue-12)"}}} /> Abrir Gaveta
              </UiButton>
              <UiButton
                type="button" 
                onClick={() => {
                  if (!validarCobro()) return;
                  // Entrar a la pantalla inline de Cobro e Impresión
                  setReceivedAmount('');
                  setPosPaymentMethod('efectivo');
                  setPaymentRefCode('');
                  setShowPaymentScreen(true);
                }}
                {...{"variant":"solid","color":"blue","className":"flex-[2] flex items-center justify-center gap-2"}}
              >
                <Sparkles size={13} /> Cobrar (F12)
              </UiButton>
            </UiBox>
          </UiBox>

          </UiCard>

        </UiBox>
        )}
      </UiBox>

      {/* DRAWER DE CONFIGURACIÓN DEL POS */}
      {isConfigOpen && (
        <>
          {/* Backdrop */}
          <UiBox 
            {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[120] animate-in fade-in duration-200"}}
            onClick={() => setIsConfigOpen(false)}
          />
          {/* Drawer Panel */}
          <UiBox {...mergeThemeProps({"style":{"borderLeft":"1px solid var(--gray-a6)"},"className":"fixed top-0 right-0 h-full w-80 z-[130] flex flex-col animate-in slide-in-from-right duration-300"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"}})}>
            <UiBox {...mergeThemeProps({"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 flex items-center justify-between shrink-0"})}>
              <UiBox {...{"className":"flex items-center gap-2"}}>
                <Settings size={16} {...{"style":{"color":"var(--gray-11)"}}} />
                <UiHeading as="h3" {...{"size":"1","weight":"bold"}}>Gestión del POS</UiHeading>
              </UiBox>
              <UiButton iconOnly
                onClick={() => setIsConfigOpen(false)} 
                {...{"variant":"surface","color":"blue"}}
              >
                <X size={16} />
              </UiButton>
            </UiBox>
            
            <UiBox {...{"className":"flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar"}}>
              <UiBox {...{"className":"space-y-2"}}>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block"}}>Diseño de Productos</UiLabel>
                <UiBox {...{"className":"grid grid-cols-2 gap-2.5"}}>
                  <UiButton
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, viewType: 'grid' }))}
                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (posConfig.viewType === 'grid' ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                  >
                    Grid
                  </UiButton>
                  <UiButton
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, viewType: 'list' }))}
                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (posConfig.viewType === 'list' ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                  >
                    Lista
                  </UiButton>
                </UiBox>
              </UiBox>
              
              <UiBox {...{"className":"space-y-2"}}>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block"}}>Filtros de Búsqueda</UiLabel>
                <UiBox {...{"className":"grid grid-cols-2 gap-2.5"}}>
                  <UiButton
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, showCarousel: false }))}
                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (!posConfig.showCarousel ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                  >
                    Normales
                  </UiButton>
                  <UiButton
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, showCarousel: true }))}
                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (posConfig.showCarousel ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                  >
                    Carrusel
                  </UiButton>
                </UiBox>
              </UiBox>
              
              <UiBox {...{"className":"space-y-2"}}>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block"}}>Posición Detalle</UiLabel>
                <UiBox {...{"className":"grid grid-cols-2 gap-2.5"}}>
                  <UiButton
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, cartPosition: 'left' }))}
                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (posConfig.cartPosition === 'left' ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                  >
                    Izquierda
                  </UiButton>
                  <UiButton
                    type="button"
                    onClick={() => setPosConfig(prev => ({ ...prev, cartPosition: 'right' }))}
                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (posConfig.cartPosition === 'right' ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                  >
                    Derecha
                  </UiButton>
                </UiBox>
              </UiBox>
              
              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"space-y-2 pt-2"}}>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block"}}>Buscador y Lector</UiLabel>
                <UiButton
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, barcodeMode: !prev.barcodeMode }))}
                  {...mergeThemeProps({"size":"2","variant":"outline","className":"w-full flex items-center justify-between"}, {}, (posConfig.barcodeMode ? {"variant":"solid","color":"blue"} : {"variant":"soft","color":"gray"}))}
                >
                  <UiText {...{"className":"flex items-center gap-1.5"}}>
                    <Barcode size={14} /> Modo Lector
                  </UiText>
                  <UiText {...{"size":"1","weight":"bold"}}>{posConfig.barcodeMode ? 'ACTIVO' : 'INACTIVO'}</UiText>
                </UiButton>
              </UiBox>
              
              <UiBox {...{"className":"space-y-2"}}>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block"}}>Checkout Exprés</UiLabel>
                <UiButton
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, expressCheckout: !prev.expressCheckout }))}
                  {...mergeThemeProps({"size":"2","variant":"outline","className":"w-full flex items-center justify-between"}, {}, (posConfig.expressCheckout ? {"variant":"solid","color":"green"} : {"variant":"soft","color":"gray"}))}
                >
                  <UiText {...{"className":"flex items-center gap-1.5"}}>
                    <Zap size={14} /> Checkout 1-Paso
                  </UiText>
                  <UiText {...{"size":"1","weight":"bold"}}>{posConfig.expressCheckout ? 'ACTIVO' : 'INACTIVO'}</UiText>
                </UiButton>
              </UiBox>
              
              <UiBox {...{"className":"space-y-2"}}>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block"}}>Privacidad Stock</UiLabel>
                <UiButton
                  type="button"
                  onClick={() => setPosConfig(prev => ({ ...prev, showStock: !prev.showStock }))}
                  {...mergeThemeProps({"size":"2","variant":"outline","className":"w-full flex items-center justify-between"}, {}, (posConfig.showStock ? {"variant":"solid","color":"blue"} : {"variant":"soft","color":"gray"}))}
                >
                  <UiText {...{"className":"flex items-center gap-1.5"}}>
                    <Eye size={14} /> Mostrar Stock
                  </UiText>
                  <UiText {...{"size":"1","weight":"bold"}}>{posConfig.showStock ? 'ACTIVO' : 'INACTIVO'}</UiText>
                </UiButton>
              </UiBox>
            </UiBox>
          </UiBox>
        </>
      )}

      {/* APERTURA Y CIERRE DE CAJA DIALOG */}
      {isClosingOpen && (
        <UiBox style={{ backgroundColor: 'var(--black-a7)' }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <UiCard {...mergeThemeProps({"className":"w-full max-w-md p-6 duration-300"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)' }} className="flex justify-between items-center mb-4 pb-2">
              <UiHeading as="h3" size="2" weight="bold" color="red" className="flex items-center gap-2">
                <ShieldAlert size={16} /> Arqueo y Cierre de Caja
              </UiHeading>
              <UiButton iconOnly type="button" onClick={() => setIsClosingOpen(false)} color="gray" className="cursor-pointer">
                <X size={15} />
              </UiButton>
            </UiBox>
            <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray","highContrast":true,"weight":"bold","className":"mb-4 leading-normal"})}>
              Verifica los montos acumulados por ventas en esta sesión y digita los valores reales contados.
            </UiText>

            <form onSubmit={handleCloseSession} {...{"className":"space-y-4"}}>
              <UiBox {...{"className":"space-y-2"}}>
                <UiBox {...mergeThemeProps({"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"grid grid-cols-2 gap-2 pb-2"}, {}, {"style":{"color":"var(--gray-12)"}})}>
                  <UiText>Método de Pago</UiText>
                  <UiText {...{"className":"text-right"}}>Físico / Real</UiText>
                </UiBox>
                
                <UiBox {...{"className":"flex justify-between items-center"}}>
                  <UiBox>
                    <UiText as="p" {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>Efectivo en Caja</UiText>
                    <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray","highContrast":true,"weight":"bold"})}>
                      Esperado: ${(Number(activeSession.initialAmount || 0) + cashSessionTotals(sessionTxs).efectivo).toFixed(2)} (inc. Fondo)
                    </UiText>
                  </UiBox>
                  <UiInput type="number" step="0.01" value={closingForm.efectivoReal} onChange={e => setClosingForm({...closingForm, efectivoReal: e.target.value})} {...mergeThemeProps({"className":"w-24 text-right"})} />
                </UiBox>

                <UiBox {...{"className":"flex justify-between items-center"}}>
                  <UiBox>
                    <UiText as="p" {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>Tarjeta Débito/Crédito</UiText>
                    <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray","highContrast":true,"weight":"bold"})}>
                      Esperado: ${cashSessionTotals(sessionTxs).tarjeta.toFixed(2)}
                    </UiText>
                  </UiBox>
                  <UiInput type="number" step="0.01" value={closingForm.tarjetaReal} onChange={e => setClosingForm({...closingForm, tarjetaReal: e.target.value})} {...mergeThemeProps({"className":"w-24 text-right"})} />
                </UiBox>

                <UiBox {...{"className":"flex justify-between items-center"}}>
                  <UiBox>
                    <UiText as="p" {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>Transferencias</UiText>
                    <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray","highContrast":true,"weight":"bold"})}>
                      Esperado: ${cashSessionTotals(sessionTxs).transferencia.toFixed(2)}
                    </UiText>
                  </UiBox>
                  <UiInput type="number" step="0.01" value={closingForm.transferenciaReal} onChange={e => setClosingForm({...closingForm, transferenciaReal: e.target.value})} {...mergeThemeProps({"className":"w-24 text-right"})} />
                </UiBox>

                <UiBox {...{"className":"flex justify-between items-center"}}>
                  <UiBox>
                    <UiText as="p" {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>Cruce de Cuentas</UiText>
                    <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray","highContrast":true,"weight":"bold"})}>
                      Esperado: ${cashSessionTotals(sessionTxs).cruce_cuentas.toFixed(2)}
                    </UiText>
                  </UiBox>
                  <UiInput type="number" step="0.01" value={closingForm.cruceReal} onChange={e => setClosingForm({...closingForm, cruceReal: e.target.value})} {...mergeThemeProps({"className":"w-24 text-right"})} />
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5"})}>Observaciones Arqueo</UiLabel>
                <UiTextarea value={closingForm.notes} onChange={e => setClosingForm({...closingForm, notes: e.target.value})} {...mergeThemeProps({"className":"w-full"})} placeholder="Escribe discrepancias si las hay..." />
              </UiBox>

              <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-2.5 mt-6 pt-3"})}>
                <UiButton type="button" onClick={() => setIsClosingOpen(false)} {...{"variant":"surface","color":"blue"}}>Cancelar</UiButton>
                <UiButton type="submit" {...{"variant":"soft","color":"red"}}>Confirmar y Cerrar Caja</UiButton>
              </UiBox>
            </form>
          </UiCard>
        </UiBox>
      )}

      {/* CHECKOUT WIZARD MODAL (FULLSCREEN PASOS) */}
      {isCheckoutOpen && (
        <UiBox {...mergeThemeProps({"className":"fixed inset-0 z-[110] flex flex-col overflow-hidden animate-in fade-in duration-200"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"}})}>
          <UiBox {...{"className":"flex-1 flex flex-col overflow-hidden max-h-screen duration-300"}}>
            
            {/* WIZARD PROGRESS HEADER */}
            <UiBox {...mergeThemeProps({"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"px-6 py-4.5 flex items-center justify-between shrink-0"}, {}, {"style":{"backgroundColor":"var(--blue-3)","color":"var(--gray-12)"}})}>
              <UiBox {...{"className":"max-w-4xl mx-auto w-full flex items-center justify-between"}}>
                <UiBox {...{"className":"flex items-center gap-2"}}>
                  <ShoppingCart size={16} {...{"style":{"color":"var(--blue-12)"}}} />
                  <UiHeading as="h3" {...{"size":"3","weight":"bold"}}>Checkout Comercial POS</UiHeading>
                </UiBox>
                {posConfig.expressCheckout ? (
                  <UiBox {...{"style":{"color":"var(--green-11)","backgroundColor":"var(--green-3)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"flex items-center gap-1.5 px-2.5 py-1"}}>
                    ⚡ MODO EXPRÉS (PASO ÚNICO)
                  </UiBox>
                ) : (
                  <UiBox {...{"className":"flex items-center gap-1.5"}}>
                    <UiText {...(checkoutStep === 1 ? {"color":"blue"} : {"color":"gray"})}>1. Cliente</UiText>
                    <ChevronRight size={11} {...{"style":{"color":"var(--gray-11)"}}} />
                    <UiText {...(checkoutStep === 2 ? {"color":"blue"} : {"color":"gray"})}>2. Métodos de Pago</UiText>
                    <ChevronRight size={11} {...{"style":{"color":"var(--gray-11)"}}} />
                    <UiText {...(checkoutStep === 3 ? {"color":"blue"} : {"color":"gray"})}>3. Emisión</UiText>
                  </UiBox>
                )}
                <UiButton iconOnly onClick={() => setIsCheckoutOpen(false)} {...{"variant":"surface","color":"blue"}}><X size={17}/></UiButton>
              </UiBox>
            </UiBox>

            {/* WIZARD CONTENT */}
            <UiBox {...{"className":"flex-1 overflow-y-auto p-6"}}>
              <UiBox {...{"className":"max-w-4xl mx-auto w-full space-y-6"}}>
              
              {posConfig.expressCheckout ? (
                <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-6"}}>
                  {/* COLUMNA IZQUIERDA: CLIENTE Y DETALLE */}
                  <UiBox {...{"className":"space-y-4"}}>
                    {/* CLIENTE */}
                    <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 space-y-3"})}>
                      <UiHeading as="h4" {...mergeThemeProps({"size":"2","weight":"bold","color":"gray","highContrast":true})}>Cliente de la Venta</UiHeading>
                      <UiBox {...{"className":"flex items-center gap-2"}}>
                        <UiBox {...{"className":"flex-1"}}>
                          <UiSelect
                            value={selectedClientId} 
                            onChange={e => setSelectedClientId(e.target.value)} 
                            {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                          >
                            <option value="" {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>Consumidor Final (9999999999999)</option>
                            {thirdParties.filter(tp => tp.type !== 'proveedor' && tp.type !== 'empleado').map(tp => (
                              <option key={tp.id} value={tp.id} {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>{tp.name} - RUC: {String(tp.ruc)}</option>
                            ))}
                          </UiSelect>
                        </UiBox>
                        <UiButton
                          type="button" 
                          onClick={() => {
                            setQuickAddFormData({
                              name: '', ruc: '', email: '', tipoIdentificacion: 'ruc', direccion: '', telefono: '', tipoContribuyente: 'general'
                            });
                            setIsQuickAddOpen(true);
                          }}
                          {...{"variant":"solid","color":"blue","className":"shrink-0"}}
                        >
                          Crear
                        </UiButton>
                      </UiBox>
                    </UiBox>

                    {/* DATOS CLIENTE */}
                    <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4 space-y-2"}, {}, {"style":{"backgroundColor":"var(--blue-3)","color":"var(--gray-12)"}})}>
                      <UiText as="p" {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>Datos Facturación del Receptor:</UiText>
                      <UiBox {...{"className":"grid grid-cols-2 gap-2 pt-1"}}>
                        <UiText as="p"><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Razón Social:</UiText> {getSelectedClient().name}</UiText>
                        <UiText as="p"><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Identificación:</UiText> {getSelectedClient().ruc}</UiText>
                        <UiText as="p"><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Teléfono:</UiText> {getSelectedClient().telefono || '-'}</UiText>
                        <UiText as="p"><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Email:</UiText> {getSelectedClient().email || '-'}</UiText>
                        <UiText as="p" {...{"className":"col-span-2"}}><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Dirección:</UiText> {getSelectedClient().direccion || '-'}</UiText>
                      </UiBox>
                    </UiBox>

                    {/* PREVISUALIZACION DETALLE */}
                    <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4 space-y-3"}, {}, {"style":{"backgroundColor":"var(--blue-3)","color":"var(--gray-12)"}})}>
                      <UiHeading as="h4" {...mergeThemeProps({"size":"2","weight":"bold","color":"gray","highContrast":true})}>Ítems a Facturar</UiHeading>
                      <UiBox {...{"className":"max-h-[140px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar"}}>
                        {cart.map((item, idx) => (
                          <UiBox key={idx} {...{"className":"flex justify-between"}}>
                            <UiText {...{"className":"opacity-80"}}>{item.quantity}x {item.name}</UiText>
                            <UiText {...{"weight":"bold"}}>${(item.price * item.quantity).toFixed(2)}</UiText>
                          </UiBox>
                        ))}
                      </UiBox>
                      <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"pt-2.5 mt-2 flex justify-between"})}>
                        <UiText>Subtotal: ${(getSubtotal() + getIva()).toFixed(2)}</UiText>
                        {getDiscountAmount() > 0 && <UiText {...{"color":"red","weight":"bold"}}>Desc: -${getDiscountAmount().toFixed(2)}</UiText>}
                        <UiText {...{"color":"blue"}}>TOTAL: ${totalToPay.toFixed(2)}</UiText>
                      </UiBox>
                    </UiBox>
                  </UiBox>

                  {/* COLUMNA DERECHA: METODOS DE PAGO Y VUELTO */}
                  <UiBox {...{"className":"space-y-4"}}>
                    <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4 flex justify-between items-center"}, {}, {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-12)"}})}>
                      <UiText {...{"size":"2","weight":"bold"}}>TOTAL A COBRAR:</UiText>
                      <UiText {...{"size":"6","weight":"bold"}}>${totalToPay.toFixed(2)}</UiText>
                    </UiBox>

                    <UiBox {...{"className":"space-y-3"}}>
                      <UiHeading as="h4" {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true})}>Medios de Pago (Admite Combinados)</UiHeading>
                      
                      <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3"}}>
                        {[
                          { id: 'efectivo', label: 'Efectivo', icon: DollarSign, key: 'efectivo' },
                          { id: 'transferencia', label: 'Transf.', icon: RefreshCw, key: 'transferencia' },
                          { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, key: 'tarjeta' },
                          { id: 'cruce_cuentas', label: 'Crédito', icon: User, key: 'cruce_cuentas' }
                        ].map(m => {
                          const isSelected = activePayments[m.key];
                          return (
                            <UiButton
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
                              {...mergeThemeProps({"variant":"outline","className":"flex flex-col items-center justify-center gap-1 cursor-pointer"}, {}, (isSelected ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                            >
                              <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"w-7 h-7 flex items-center justify-center"}, {}, (isSelected ? {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--blue-9)"}} : {"style":{"backgroundColor":"var(--gray-4)","color":"var(--gray-11)"}}))}>
                                <m.icon size={12} />
                              </UiBox>
                              <UiText {...{"size":"1","weight":"bold"}}>{m.label}</UiText>
                            </UiButton>
                          );
                        })}
                      </UiBox>

                      <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 gap-3"}}>
                        {/* Efectivo */}
                        {activePayments.efectivo && (
                          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-3 space-y-1.5"})}>
                            <UiBox {...{"className":"flex justify-between items-center mb-0.5"}}>
                              <UiText {...{"size":"1","weight":"bold","className":"block"}}>Efectivo ($)</UiText>
                              <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray"})}>Monto Recibido</UiText>
                            </UiBox>
                            <UiInput type="number" step="0.01" value={payments.efectivo || ''} onChange={e => setPayments({...payments, efectivo: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="0.00" />
                            <UiBox {...{"className":"flex gap-1.5 mt-1.5 flex-wrap"}}>
                              {[10, 20, 50].map(val => (
                                <UiButton
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    const current = Number(payments.efectivo) || 0;
                                    setPayments({ ...payments, efectivo: (current + val).toFixed(2) });
                                  }}
                                  {...mergeThemeProps({"size":"2","variant":"outline"}, {}, {"variant":"surface","color":"blue"})}
                                >
                                  +{val}
                                </UiButton>
                              ))}
                              <UiButton
                                type="button"
                                onClick={() => {
                                  const pending = Math.max(0, totalToPay - (Number(payments.tarjeta) || 0) - (Number(payments.transferencia) || 0) - (Number(payments.cruce_cuentas) || 0));
                                  setPayments({ ...payments, efectivo: pending.toFixed(2) });
                                }}
                                {...mergeThemeProps({"size":"2","variant":"outline"}, {}, {"variant":"soft","color":"blue"})}
                              >
                                Exacto
                              </UiButton>
                            </UiBox>
                          </UiBox>
                        )}

                        {/* Tarjeta */}
                        {activePayments.tarjeta && (
                          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-3 space-y-1.5"})}>
                            <UiBox {...{"className":"flex justify-between items-center mb-0.5"}}>
                              <UiText {...{"size":"1","weight":"bold","className":"block"}}>Tarjeta ($)</UiText>
                              <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray"})}>Monto Tarjeta</UiText>
                            </UiBox>
                            <UiInput type="number" step="0.01" value={payments.tarjeta || ''} onChange={e => setPayments({...payments, tarjeta: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="0.00" />
                            <UiInput type="text" value={payments.tarjetaRef} onChange={e => setPayments({...payments, tarjetaRef: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"})} placeholder="Ref/Aut" />
                          </UiBox>
                        )}

                        {/* Transferencia */}
                        {activePayments.transferencia && (
                          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-3 space-y-1.5"})}>
                            <UiBox {...{"className":"flex justify-between items-center mb-0.5"}}>
                              <UiText {...{"size":"1","weight":"bold","className":"block"}}>Transferencia ($)</UiText>
                              <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray"})}>Monto Transferido</UiText>
                            </UiBox>
                            <UiInput type="number" step="0.01" value={payments.transferencia || ''} onChange={e => setPayments({...payments, transferencia: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="0.00" />
                            <UiInput type="text" value={payments.transferenciaRef} onChange={e => setPayments({...payments, transferenciaRef: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"})} placeholder="Nro Ref" />
                          </UiBox>
                        )}

                        {/* Cruce de Cuentas */}
                        {activePayments.cruce_cuentas && (
                          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-3 space-y-1.5"})}>
                            <UiBox {...{"className":"flex justify-between items-center mb-0.5"}}>
                              <UiText {...{"size":"1","weight":"bold","className":"block"}}>Cruce Cuentas ($)</UiText>
                              <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray"})}>Monto Crédito</UiText>
                            </UiBox>
                            <UiInput type="number" step="0.01" value={payments.cruce_cuentas || ''} onChange={e => setPayments({...payments, cruce_cuentas: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="0.00" />
                            <UiInput type="text" value={payments.cruceRef} onChange={e => setPayments({...payments, cruceRef: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"})} placeholder="Nro Doc" />
                          </UiBox>
                        )}
                      </UiBox>
                    </UiBox>

                    <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","fontFamily":"var(--code-font-family)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)","color":"var(--gray-12)"},"className":"p-4 space-y-1"})}>
                      <UiBox {...{"className":"flex justify-between"}}>
                        <UiText>Total Pagado:</UiText>
                        <UiText {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>${paidTotal.toFixed(2)}</UiText>
                      </UiBox>
                      {remainingDue > 0 ? (
                        <UiBox {...{"style":{"color":"var(--amber-11)"},"className":"flex justify-between animate-pulse"}}>
                          <UiText>Falta Pagar:</UiText>
                          <UiText>${remainingDue.toFixed(2)}</UiText>
                        </UiBox>
                      ) : (
                        <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--green-12)"},"className":"flex justify-between pt-1"})}>
                          <UiText>Cambio / Vuelto:</UiText>
                          <UiText>${changeDue.toFixed(2)}</UiText>
                        </UiBox>
                      )}
                    </UiBox>
                  </UiBox>
                </UiBox>
              ) : (
                <>
                  {/* PASO 1: CLIENTE */}
                  {checkoutStep === 1 && (
                    <UiBox {...{"className":"space-y-4 animate-in slide-in-from-right-4 duration-300"}}>
                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 space-y-3"})}>
                        <UiHeading as="h4" {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true})}>Cliente de la Venta</UiHeading>
                        <UiBox {...{"className":"flex items-center gap-2"}}>
                          <UiBox {...{"className":"flex-1"}}>
                            <UiSelect
                              value={selectedClientId} 
                              onChange={e => setSelectedClientId(e.target.value)} 
                              {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                            >
                              <option value="" {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>Consumidor Final (9999999999999)</option>
                              {thirdParties.filter(tp => tp.type !== 'proveedor' && tp.type !== 'empleado').map(tp => (
                                <option key={tp.id} value={tp.id} {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>{tp.name} - RUC: {String(tp.ruc)}</option>
                              ))}
                            </UiSelect>
                          </UiBox>
                          <UiButton
                            type="button" 
                            onClick={() => {
                              setQuickAddFormData({
                                name: '', ruc: '', email: '', tipoIdentificacion: 'ruc', direccion: '', telefono: '', tipoContribuyente: 'general'
                              });
                              setIsQuickAddOpen(true);
                            }}
                            {...{"variant":"solid","color":"blue","className":"shrink-0"}}
                          >
                            Crear Nuevo Cliente
                          </UiButton>
                        </UiBox>
                      </UiBox>

                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 space-y-3"})}>
                        <UiHeading as="h4" {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true})}>Tipo de Documento a Emitir</UiHeading>
                        {sriConfig?.rucActivo === false && (
                          <UiBox {...{"style":{"backgroundColor":"var(--amber-3)","border":"1px solid var(--gray-a6)","color":"var(--amber-11)","borderRadius":"var(--radius-3)"},"className":"p-3 flex items-center gap-2"}}>
                            <ShieldAlert size={16} {...{"className":"shrink-0"}} />
                            <UiText>Facturación electrónica deshabilitada (RUC inactivo). Solo se permiten Recibos.</UiText>
                          </UiBox>
                        )}
                        <UiSelect
                          value={posDocType} 
                          onChange={e => {
                            if (sriConfig?.rucActivo === false && e.target.value === 'factura') {
                              showToast("El RUC de la empresa está inactivo. Solo puede emitir Recibos.", "error");
                              return;
                            }
                            setPosDocType(e.target.value);
                          }} 
                          {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                        >
                          <option value="factura" disabled={sriConfig?.rucActivo === false} {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>
                            Factura Electrónica {sriConfig?.rucActivo === false ? '(Bloqueado - RUC Inactivo)' : ''}
                          </option>
                          <option value="nota_venta" {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>Recibo (Nota de Venta)</option>
                        </UiSelect>
                      </UiBox>

                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4 space-y-2"}, {}, {"style":{"backgroundColor":"var(--blue-3)","color":"var(--gray-12)"}})}>
                        <UiText as="p" {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>Datos Facturación del Receptor:</UiText>
                        <UiBox {...{"className":"grid grid-cols-2 gap-3 pt-1"}}>
                          <UiText as="p"><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Razón Social:</UiText> {getSelectedClient().name}</UiText>
                          <UiText as="p"><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Identificación:</UiText> {getSelectedClient().ruc}</UiText>
                          <UiText as="p"><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Teléfono:</UiText> {getSelectedClient().telefono || '-'}</UiText>
                          <UiText as="p"><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Email:</UiText> {getSelectedClient().email || '-'}</UiText>
                          <UiText as="p" {...{"className":"col-span-2"}}><UiText {...mergeThemeProps({"weight":"bold","color":"blue"})}>Dirección:</UiText> {getSelectedClient().direccion || '-'}</UiText>
                        </UiBox>
                      </UiBox>
                    </UiBox>
                  )}

                  {/* PASO 2: METODOS DE PAGO */}
                  {checkoutStep === 2 && (
                    <UiBox {...{"className":"space-y-4 animate-in slide-in-from-right-4 duration-300"}}>
                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4.5 flex justify-between items-center"}, {}, {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-12)"}})}>
                        <UiText {...{"size":"2","weight":"bold"}}>TOTAL A PAGAR:</UiText>
                        <UiText {...{"size":"5","weight":"bold"}}>${totalToPay.toFixed(2)}</UiText>
                      </UiBox>

                      <UiBox {...{"className":"space-y-3"}}>
                        <UiHeading as="h4" {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true})}>Medios de Pago (Admite combinados)</UiHeading>
                        
                        <UiBox {...{"className":"grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5"}}>
                          {[
                            { id: 'efectivo', label: 'Efectivo', icon: DollarSign, key: 'efectivo' },
                            { id: 'transferencia', label: 'Transf.', icon: RefreshCw, key: 'transferencia' },
                            { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, key: 'tarjeta' },
                            { id: 'cruce_cuentas', label: 'Crédito', icon: User, key: 'cruce_cuentas' }
                          ].map(m => {
                            const isSelected = activePayments[m.key];
                            return (
                              <UiButton
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
                                {...mergeThemeProps({"variant":"outline","className":"flex flex-col items-center justify-center gap-1.5 cursor-pointer"}, {}, (isSelected ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                              >
                                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"w-8 h-8 flex items-center justify-center"}, {}, (isSelected ? {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--blue-9)"}} : {"style":{"backgroundColor":"var(--gray-4)","color":"var(--gray-11)"}}))}>
                                  <m.icon size={14} />
                                </UiBox>
                                <UiText {...{"size":"1","weight":"bold"}}>{m.label}</UiText>
                              </UiButton>
                            );
                          })}
                        </UiBox>

                        <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-4"}}>
                          {/* Efectivo */}
                          {activePayments.efectivo && (
                            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 space-y-2"})}>
                              <UiBox {...{"className":"flex justify-between items-center mb-1"}}>
                                <UiBox {...{"className":"flex items-center gap-2"}}>
                                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-9)","color":"var(--color-background)"},"className":"w-6 h-6 flex items-center justify-center"}}><DollarSign size={12} /></UiBox>
                                  <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block"})}>Efectivo ($)</UiText>
                                </UiBox>
                                <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray"})}>Monto Recibido</UiText>
                              </UiBox>
                              <UiInput type="number" step="0.01" value={payments.efectivo || ''} onChange={e => setPayments({...payments, efectivo: e.target.value})} {...{"size":"3","className":"w-full"}} placeholder="0.00" />
                              <UiBox {...{"className":"flex flex-wrap gap-1.5 mt-2"}}>
                                {[5, 10, 20, 50, 100].map(val => (
                                  <UiButton
                                    key={val}
                                    type="button"
                                    onClick={() => {
                                      const current = Number(payments.efectivo) || 0;
                                      setPayments({ ...payments, efectivo: (current + val).toFixed(2) });
                                    }}
                                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, {"variant":"surface","color":"blue"})}
                                  >
                                    +{val}
                                  </UiButton>
                                ))}
                                <UiButton
                                  type="button"
                                  onClick={() => {
                                    const pending = Math.max(0, totalToPay - (Number(payments.tarjeta) || 0) - (Number(payments.transferencia) || 0) - (Number(payments.cruce_cuentas) || 0));
                                    setPayments({ ...payments, efectivo: pending.toFixed(2) });
                                  }}
                                  {...mergeThemeProps({"size":"2","variant":"outline"}, {}, {"variant":"soft","color":"blue"})}
                                >
                                  Exacto
                                </UiButton>
                              </UiBox>
                            </UiBox>
                          )}
                          
                          {/* Tarjeta */}
                          {activePayments.tarjeta && (
                            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 space-y-2"})}>
                              <UiBox {...{"className":"flex justify-between items-center mb-1"}}>
                                <UiBox {...{"className":"flex items-center gap-2"}}>
                                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-9)","color":"var(--color-background)"},"className":"w-6 h-6 flex items-center justify-center"}}><CreditCard size={12} /></UiBox>
                                  <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block"})}>Tarjeta (Crédito/Débito) ($)</UiText>
                                </UiBox>
                                <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray"})}>Monto Tarjeta</UiText>
                              </UiBox>
                              <UiInput type="number" step="0.01" value={payments.tarjeta || ''} onChange={e => setPayments({...payments, tarjeta: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="0.00" />
                              <UiInput type="text" value={payments.tarjetaRef} onChange={e => setPayments({...payments, tarjetaRef: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full mt-1.5"})} placeholder="Ref / Autorización" />
                            </UiBox>
                          )}

                          {/* Transferencia */}
                          {activePayments.transferencia && (
                            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 space-y-2"})}>
                              <UiBox {...{"className":"flex justify-between items-center mb-1"}}>
                                <UiBox {...{"className":"flex items-center gap-2"}}>
                                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-9)","color":"var(--color-background)"},"className":"w-6 h-6 flex items-center justify-center"}}><RefreshCw size={12} /></UiBox>
                                  <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block"})}>Transferencia Bancaria ($)</UiText>
                                </UiBox>
                                <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray"})}>Monto Transferido</UiText>
                              </UiBox>
                              <UiInput type="number" step="0.01" value={payments.transferencia || ''} onChange={e => setPayments({...payments, transferencia: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="0.00" />
                              <UiInput type="text" value={payments.transferenciaRef} onChange={e => setPayments({...payments, transferenciaRef: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full mt-1.5"})} placeholder="Nro Referencia / Comprobante" />
                            </UiBox>
                          )}

                          {/* Cruce de Cuentas */}
                          {activePayments.cruce_cuentas && (
                            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 space-y-2"})}>
                              <UiBox {...{"className":"flex justify-between items-center mb-1"}}>
                                <UiBox {...{"className":"flex items-center gap-2"}}>
                                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-9)","color":"var(--color-background)"},"className":"w-6 h-6 flex items-center justify-center"}}><User size={12} /></UiBox>
                                  <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block"})}>Cruce de Cuentas ($)</UiText>
                                </UiBox>
                                <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray"})}>Monto Crédito</UiText>
                              </UiBox>
                              <UiInput type="number" step="0.01" value={payments.cruce_cuentas || ''} onChange={e => setPayments({...payments, cruce_cuentas: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="0.00" />
                              <UiInput type="text" value={payments.cruceRef} onChange={e => setPayments({...payments, cruceRef: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full mt-1.5"})} placeholder="Nro de Documento Relacionado" />
                            </UiBox>
                          )}
                        </UiBox>
                      </UiBox>

                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","fontFamily":"var(--code-font-family)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)","color":"var(--gray-12)"},"className":"p-4 space-y-2.5"})}>
                        <UiBox {...{"className":"flex justify-between"}}>
                          <UiText>Total Pagado:</UiText>
                          <UiText {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>${paidTotal.toFixed(2)}</UiText>
                        </UiBox>
                        {remainingDue > 0 ? (
                          <UiBox {...{"style":{"color":"var(--amber-11)"},"className":"flex justify-between"}}>
                            <UiText>Falta Pagar:</UiText>
                            <UiText>${remainingDue.toFixed(2)}</UiText>
                          </UiBox>
                        ) : (
                          <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--green-12)"},"className":"flex justify-between pt-1"})}>
                            <UiText>Cambio / Vuelto en Efectivo:</UiText>
                            <UiText>${changeDue.toFixed(2)}</UiText>
                          </UiBox>
                        )}
                      </UiBox>
                    </UiBox>
                  )}

                  {/* PASO 3: CONFIRMACIÓN Y EMISION */}
                  {checkoutStep === 3 && (
                    <UiBox {...{"className":"space-y-4 animate-in slide-in-from-right-4 duration-300"}}>
                      <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-5 space-y-3"})}>
                        <UiHeading as="h4" {...mergeThemeProps({"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"text-center pb-2"})}>PREVISUALIZACIÓN DE FACTURA (RIDE)</UiHeading>
                        
                        <UiBox {...{"className":"grid grid-cols-2 gap-4 leading-normal"}}>
                          <UiBox>
                            <UiText as="p" {...mergeThemeProps({"weight":"bold","color":"blue"})}>RECEPTOR</UiText>
                            <UiText as="p" {...{"color":"gray","highContrast":true,"weight":"medium"}}><UiText {...{"weight":"bold"}}>Razon Social:</UiText> {getSelectedClient().name}</UiText>
                            <UiText as="p" {...{"color":"gray","highContrast":true,"weight":"medium"}}><UiText {...{"weight":"bold"}}>RUC/CI:</UiText> {getSelectedClient().ruc}</UiText>
                            <UiText as="p" {...{"color":"gray","highContrast":true,"weight":"medium"}}><UiText {...{"weight":"bold"}}>Correo:</UiText> {getSelectedClient().email}</UiText>
                            <UiText as="p" {...{"color":"gray","highContrast":true,"weight":"medium"}}><UiText {...{"weight":"bold"}}>Dirección:</UiText> {getSelectedClient().direccion}</UiText>
                          </UiBox>
                          <UiBox {...{"className":"text-right"}}>
                            <UiText as="p" {...mergeThemeProps({"weight":"bold","color":"blue"})}>COMPROBANTE</UiText>
                            <UiText as="p" {...{"color":"gray","highContrast":true,"weight":"medium"}}>Establecimiento: {activeSession.branch}</UiText>
                            <UiText as="p" {...{"color":"gray","highContrast":true,"weight":"medium"}}>Fecha: {getEcuadorDateString().split('-').reverse().join('/')}</UiText>
                            <UiText as="p" {...{"color":"gray","highContrast":true,"weight":"medium"}}>Ambiente SRI: PRUEBAS (Offline)</UiText>
                          </UiBox>
                        </UiBox>

                        <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-3"})}>
                          <UiText as="p" {...mergeThemeProps({"weight":"bold","size":"1","color":"blue","className":"mb-1.5"})}>Ítems Detallados</UiText>
                          <UiBox {...{"className":"space-y-1"}}>
                            {cart.map((item, idx) => (
                              <UiBox key={idx} {...{"className":"flex justify-between"}}>
                                <UiText {...{"color":"gray","highContrast":true,"weight":"bold"}}>{item.quantity}x {item.name}</UiText>
                                <UiText {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>${(item.price * item.quantity).toFixed(2)}</UiText>
                              </UiBox>
                            ))}
                          </UiBox>
                        </UiBox>

                        <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"pt-3 flex justify-between"})}>
                          <UiText>Total Neto Cobrado:</UiText>
                          <UiText {...{"color":"blue"}}>${totalToPay.toFixed(2)}</UiText>
                        </UiBox>

                        <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"pt-2"})}>
                          <UiText as="p">Métodos Registrados: Efectivo: ${Number(payments.efectivo).toFixed(2)} | Tarjeta: ${Number(payments.tarjeta).toFixed(2)} | Transf: ${Number(payments.transferencia).toFixed(2)} | Cruce: ${Number(payments.cruce_cuentas).toFixed(2)}</UiText>
                          <UiText as="p" {...{"className":"mt-0.5"}}>Vuelto entregado: ${changeDue.toFixed(2)}</UiText>
                        </UiBox>
                      </UiCard>
                    </UiBox>
                  )}
                </>
              )}

              </UiBox>
            </UiBox>

            {/* WIZARD ACTIONS BAR */}
            <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"px-6 py-4 shrink-0"}, {}, {"style":{"backgroundColor":"var(--blue-3)"}})}>
              <UiBox {...{"className":"max-w-4xl mx-auto w-full flex justify-between"}}>
              {posConfig.expressCheckout ? (
                <>
                  <UiButton
                    type="button" 
                    onClick={() => setIsCheckoutOpen(false)}
                    {...{"variant":"surface","color":"blue"}}
                  >
                    Cancelar
                  </UiButton>
                  <UiButton
                    type="button" 
                    onClick={handleFinalCheckout} 
                    disabled={isProcessing || remainingDue > 0}
                    {...{"variant":"solid","color":"blue"}}
                  >
                    {isProcessing ? <RefreshCw size={13} {...{"className":"animate-spin"}} /> : <Sparkles size={13} />} Emitir y Finalizar Venta
                  </UiButton>
                </>
              ) : (
                <>
                  <UiButton
                    type="button" 
                    disabled={checkoutStep === 1 || isProcessing}
                    onClick={() => setCheckoutStep(prev => prev - 1)}
                    {...{"variant":"surface","color":"blue"}}
                  >
                    Anterior
                  </UiButton>
                  
                  {checkoutStep < 3 ? (
                    <UiButton
                      type="button" 
                      onClick={() => {
                        if (checkoutStep === 1 && !selectedClientId) {
                          showToast("Alerta: Debe seleccionar o registrar un cliente antes de continuar.", "error");
                          return;
                        }
                        if (checkoutStep === 2 && remainingDue > 0.009) {
                          showToast(`Por favor, cubra el total de la venta. Falta pagar $${remainingDue.toFixed(2)}`, "error");
                          return;
                        }
                        setCheckoutStep(prev => prev + 1);
                      }}
                      {...{"variant":"solid","color":"blue"}}
                    >
                      Siguiente
                    </UiButton>
                  ) : (
                    <UiButton
                      type="button" 
                      onClick={handleFinalCheckout} 
                      disabled={isProcessing}
                      {...{"variant":"solid","color":"blue"}}
                    >
                      {isProcessing ? <RefreshCw size={13} {...{"className":"animate-spin"}} /> : <Sparkles size={13} />} Finalizar Venta y Emitir SRI
                    </UiButton>
                  )}
                </>
              )}
              </UiBox>
            </UiBox>
          </UiBox>
        </UiBox>
      )}

      {/* QUICK CLIENT ADD MODAL IN POS */}
      {isQuickAddOpen && (
        <UiBox style={{ backgroundColor: 'var(--black-a7)' }} className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <UiCard {...mergeThemeProps({"className":"w-full max-w-md p-6 duration-300"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)' }} className="flex justify-between items-center mb-4 pb-2">
              <UiHeading as="h3" size="3" weight="bold" className="flex items-center gap-2">
                <UserPlus size={17} style={{ color: 'var(--blue-11)' }} />
                Registro Rápido de Cliente (SRI)
              </UiHeading>
              <UiButton iconOnly type="button" onClick={() => setIsQuickAddOpen(false)} color="gray" className="cursor-pointer">
                <X size={15} />
              </UiButton>
            </UiBox>
            
            <form onSubmit={handleQuickClientSave} {...{"className":"space-y-3.5"}}>
              <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Identificación</UiLabel>
                  <UiSelect
                    value={quickAddFormData.tipoIdentificacion} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, tipoIdentificacion: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                  >
                    <option value="ruc" {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>RUC</option>
                    <option value="cedula" {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>Cédula</option>
                    <option value="pasaporte" {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>Pasaporte</option>
                  </UiSelect>
                </UiBox>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Número</UiLabel>
                  <UiBox {...{"className":"flex gap-1.5"}}>
                    <UiInput
                      type="text" 
                      required 
                      value={quickAddFormData.ruc} 
                      onChange={e => setQuickAddFormData({...quickAddFormData, ruc: e.target.value})} 
                      {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                      placeholder="1790000000001" 
                    />
                    <UiButton
                      type="button"
                      disabled={isQueryingSri}
                      onClick={queryQuickClientSRI}
                      {...{"variant":"soft","color":"purple","className":"shrink-0 active:scale-95"}}
                    >
                      {isQueryingSri ? <RefreshCw size={13} {...{"className":"animate-spin"}} /> : <Sparkles size={13} />}
                    </UiButton>
                  </UiBox>
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Razón Social / Nombre Completo</UiLabel>
                <UiInput
                  type="text" 
                  required 
                  value={quickAddFormData.name} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, name: e.target.value})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                />
              </UiBox>

              <UiBox>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Teléfono</UiLabel>
                <UiInput
                  type="text" 
                  value={quickAddFormData.telefono || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, telefono: e.target.value})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                />
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-3 gap-3"}}>
                <UiBox {...{"className":"col-span-2"}}>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Dirección Domicilio</UiLabel>
                  <UiInput
                    type="text" 
                    value={quickAddFormData.direccion || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, direccion: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  />
                </UiBox>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Ciudad</UiLabel>
                  <UiInput
                    type="text" 
                    value={quickAddFormData.ciudad || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, ciudad: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                    placeholder="Ej. Quito"
                  />
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Correo Notificación</UiLabel>
                <UiInput
                  type="email" 
                  value={quickAddFormData.email || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, email: e.target.value})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                />
              </UiBox>

              <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-2.5 mt-6 pt-4"})}>
                <UiButton type="button" onClick={() => setIsQuickAddOpen(false)} {...{"variant":"surface","color":"blue"}}>Cancelar</UiButton>
                <UiButton type="submit" {...{"variant":"solid","color":"blue"}}>Guardar y Seleccionar</UiButton>
              </UiBox>
            </form>
          </UiCard>
        </UiBox>
      )}

      {/* MODAL DE ATAJOS DE TECLADO (GUIDE) */}
      {isShortcutsOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[160] flex items-center justify-center p-4 animate-in fade-in duration-250"}}>
          <UiCard {...mergeThemeProps({"className":"w-full max-w-md p-6 duration-300"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-4 pb-2"}}>
              <UiHeading as="h3" {...{"size":"2","weight":"bold","className":"flex items-center gap-2"}}>
                <Keyboard size={16} {...{"style":{"color":"var(--blue-12)"}}} /> Guía de Atajos de Teclado
              </UiHeading>
              <UiButton iconOnly onClick={() => setIsShortcutsOpen(false)} {...{"color":"gray"}}><X size={16} /></UiButton>
            </UiBox>
            
            <UiBox {...{"className":"space-y-3.5"}}>
              <UiText as="p" {...{"size":"1","color":"gray"}}>Usa estos atajos rápidos para agilizar el proceso de facturación en caja:</UiText>
              
              <UiBox {...{"className":"space-y-2"}}>
                {[
                  { key: 'F2', desc: 'Enfocar la barra de búsqueda de productos' },
                  { key: 'F8', desc: 'Suspender venta actual (Borrar localmente)' },
                  { key: 'F9', desc: 'Recuperar última venta suspendida' },
                  { key: 'F12', desc: 'Proceder al cobro / Abrir pasarela de pago' },
                  { key: 'Ctrl + Enter', desc: 'Cobrar directamente desde el detalle de la venta' },
                  { key: 'Escape', desc: 'Cerrar cualquier ventana flotante o modal abierto' }
                ].map((item, idx) => (
                  <UiBox key={idx} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)","color":"var(--gray-12)"},"className":"flex items-center justify-between p-2.5"})}>
                    <UiText {...{"size":"1","weight":"medium"}}>{item.desc}</UiText>
                    <kbd {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","fontFamily":"var(--code-font-family)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)","border":"1px solid var(--gray-a6)"},"className":"px-2 py-1"})}>
                      {item.key}
                    </kbd>
                  </UiBox>
                ))}
              </UiBox>
            </UiBox>

            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end mt-6 pt-4"}}>
              <UiButton
                type="button" 
                onClick={() => setIsShortcutsOpen(false)} 
                {...{"variant":"solid","color":"blue"}}
              >
                Entendido
              </UiButton>
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      {/* DRAWER DESLIZABLE: HISTORIAL DE VENTAS DE LA SESIÓN */}
      {isHistoryOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[140] flex justify-end animate-in fade-in duration-200"}}>
          <UiBox {...{"className":"absolute inset-0"}} onClick={() => setIsHistoryOpen(false)}></UiBox>
          
          <UiCard {...mergeThemeProps({"className":"relative w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-350"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            {/* Header */}
            <UiBox {...mergeThemeProps({"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 flex items-center justify-between shrink-0"})}>
              <UiBox {...{"className":"flex items-center gap-2"}}>
                <History size={16} {...{"style":{"color":"var(--blue-12)"}}} />
                <UiBox>
                  <UiHeading as="h3" {...{"size":"1","weight":"bold"}}>Historial de Ventas</UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray"}}>Sesión de caja activa</UiText>
                </UiBox>
              </UiBox>
              <UiButton iconOnly
                type="button"
                onClick={() => setIsHistoryOpen(false)} 
                {...{"variant":"surface","color":"gray"}}
              >
                <X size={16} />
              </UiButton>
            </UiBox>

            {/* List */}
            <UiBox {...{"className":"flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar"}}>
              {(() => {
                const sessionTransactions = transactions.filter(t => t.cashSessionId === activeSession.id);
                if (sessionTransactions.length === 0) {
                  return (
                    <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex flex-col items-center justify-center py-24 text-center"}}>
                      <History size={40} {...{"style":{"color":"var(--blue-12)"},"className":"opacity-20 mb-2.5"}} />
                      <UiText as="p" {...{"size":"1","weight":"medium","className":"italic"}}>No se han emitido ventas en esta sesión.</UiText>
                    </UiBox>
                  );
                }
                return sessionTransactions.map((tx) => {
                  const matchedClient = thirdParties.find(tp => tp.id === tx.thirdPartyId) || tx.thirdParty || { name: 'Consumidor Final', ruc: '9999999999999' };
                  const isAnulado = tx.sriStatus === 'anulado';
                  return (
                    <UiCard 
                      key={tx.id} 
                      {...mergeThemeProps({"className":"p-3.5 flex flex-col justify-between gap-3"}, {}, (isAnulado ? {"style":{"backgroundColor":"var(--red-3)"},"className":"opacity-65"} : {"style":{"backgroundColor":"var(--color-panel-solid)"}}))}
                    >
                      <UiBox {...{"className":"flex justify-between items-start"}}>
                        <UiBox {...{"className":"min-w-0 flex-1"}}>
                          <UiText as="p" {...{"weight":"regular","size":"1","color":"gray","className":"truncate"}}>{tx.id}</UiText>
                          <UiHeading as="h4" {...mergeThemeProps({"size":"2","weight":"bold","color":"gray","highContrast":true,"className":"truncate"})}>
                            {matchedClient.name}
                          </UiHeading>
                          <UiText as="p" {...{"size":"1","color":"gray"}}>RUC/CI: {matchedClient.ruc} | Fecha: {tx.date}</UiText>
                        </UiBox>
                        <UiBox {...{"className":"text-right shrink-0"}}>
                          <UiText {...mergeThemeProps({"size":"2","weight":"bold","className":"block"}, {}, (isAnulado ? {"color":"red","className":"line-through"} : {"color":"blue"}))}>
                            ${Number(tx.total || 0).toFixed(2)}
                          </UiText>
                          <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"inline-block px-1.5 py-0.5 mt-1"}, {}, (isAnulado ? {"color":"red"} : (tx.sriStatus === 'autorizado' ? {"color":"green"} : {"color":"amber"})))}>
                            {tx.documentType === 'nota_venta'
                              ? (isAnulado ? 'anulado' : 'registrado')
                              : (tx.sriStatus || 'pendiente')}
                          </UiText>
                        </UiBox>
                      </UiBox>

                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","fontFamily":"var(--code-font-family)","backgroundColor":"var(--blue-3)","color":"var(--gray-12)"},"className":"p-2 leading-relaxed"})}>
                        <UiBox {...{"className":"flex justify-between"}}>
                          <UiText>Pago: <UiText {...{"weight":"bold"}}>{tx.paymentMethod}</UiText></UiText>
                          <UiText>Base: ${Number(tx.baseImponible || 0).toFixed(2)}</UiText>
                        </UiBox>
                        {tx.items && tx.items.length > 0 && (
                          <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"mt-1 pt-1 max-h-16 overflow-y-auto custom-scrollbar"}}>
                            {tx.items.map((it, idx) => (
                              <UiBox key={idx} {...{"style":{"color":"var(--gray-11)"},"className":"flex justify-between"}}>
                                <UiText {...{"className":"truncate max-w-[150px]"}}>{it.quantity}x {it.name}</UiText>
                                <UiText>${(it.price * it.quantity).toFixed(2)}</UiText>
                              </UiBox>
                            ))}
                          </UiBox>
                        )}
                      </UiBox>

                      <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center pt-2"}}>
                        <UiBox {...{"className":"flex gap-1.5"}}>
                          {(() => {
                            const effectivePdf = (tx.pdfUrl && !tx.pdfUrl.includes('srienlinea.sri.gob.ec'))
                              ? tx.pdfUrl
                              : (tx.claveAcceso ? `/public/ride?claveAcceso=${tx.claveAcceso}&tenantId=${appId || ''}` : null);

                            return effectivePdf ? (
                              <a 
                                href={effectivePdf} 
                                target="_blank" 
                                rel="noreferrer" 
                                {...mergeThemeProps({"variant":"surface","color":"blue"}, {}, {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-12)","border":"1px solid var(--gray-a6)"}})} 
                                title="Ver / Descargar PDF RIDE"
                              >
                                <FileText size={12} />
                              </a>
                            ) : (
                              <UiText 
                                {...mergeThemeProps({"variant":"surface","color":"blue","className":"opacity-40 cursor-not-allowed flex items-center justify-center"}, {}, {"color":"gray"})}
                                title="PDF no disponible"
                              >
                                <FileText size={12} />
                              </UiText>
                            );
                          })()}

                          {tx.xmlUrl && (
                            <a 
                              href={tx.xmlUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              {...mergeThemeProps({"variant":"surface","color":"blue"}, {}, {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"}})} 
                              title="Descargar XML SRI"
                            >
                              <Download size={12} />
                            </a>
                          )}
                        </UiBox>

                        {!isAnulado && (
                          <UiButton
                            type="button"
                            onClick={() => handleVoidTransaction(tx)}
                            {...{"variant":"soft","color":"red","size":"2","className":"flex items-center gap-1"}}
                          >
                            <ShieldAlert size={10} /> Anular Venta
                          </UiButton>
                        )}
                      </UiBox>
                    </UiCard>
                  );
                });
              })()}
            </UiBox>
            
            {/* Footer */}
            <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4 flex justify-end shrink-0"})}>
              <UiButton
                type="button" 
                onClick={() => setIsHistoryOpen(false)}
                {...{"variant":"surface","color":"blue","className":"w-full"}}
              >
                Cerrar Panel
              </UiButton>
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      {/* MODAL: BUSCADOR PROFESIONAL DE PRODUCTOS NAVEGABLE PARA PANTALLAS TÁCTILES */}
      {isSearchModalOpen && (() => {

        // Filtrar productos para el modal
        const modalFilteredProducts = products.filter(p => {
          if (!isSellable(p)) return false;
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
          <UiBox style={{ backgroundColor: 'var(--black-a7)' }} className="fixed inset-0 z-[150] flex items-center justify-center select-none p-4 animate-in fade-in duration-200">
            <UiBox {...{"className":"absolute inset-0"}} onClick={() => {
              setIsSearchModalOpen(false);
              setModalSearch('');
              setModalCat('all');
              setModalBrand('all');
              setModalWh('all');
              setModalTab('all');
            }}></UiBox>
            
            <UiBox style={{ backgroundColor: 'var(--color-panel-solid)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-a6)', boxShadow: 'var(--shadow-5)' }} className="relative w-full max-w-4xl h-[85vh] max-h-[640px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* HEADER DEL MODAL: Título y Buscador */}
              <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4 flex items-center justify-between gap-4 shrink-0"}}>
                <UiBox {...{"className":"flex items-center gap-2 shrink-0"}}>
                  <SlidersHorizontal size={18} {...{"style":{"color":"var(--blue-12)"}}} />
                  <UiText {...{"weight":"bold","size":"2","color":"gray","highContrast":true}}>Buscador Profesional</UiText>
                </UiBox>
 
                {/* Input Buscador */}
                <UiBox {...{"className":"flex-1 max-w-md relative"}}>
                  <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center gap-2 px-3 h-10"}}>
                    <Search size={16} {...{"style":{"color":"var(--blue-12)"},"className":"shrink-0"}} />
                    <UiInput
                      type="text" 
                      placeholder="Buscar por nombre, SKU o código..." 
                      value={modalSearch}
                      onChange={e => setModalSearch(e.target.value)}
                      {...{"size":"2","color":"gray","className":"w-full"}}
                      autoFocus
                    />
                    {modalSearch && (
                      <UiButton iconOnly
                        type="button"
                        onClick={() => setModalSearch('')}
                        {...{"color":"gray"}}
                      >
                        <X size={14} />
                      </UiButton>
                    )}
                  </UiCard>
                </UiBox>
 
                {/* Botón de Cerrar */}
                <UiButton iconOnly
                  type="button"
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setModalSearch('');
                    setModalCat('all');
                    setModalBrand('all');
                    setModalWh('all');
                    setModalTab('all');
                  }} 
                  {...{"color":"gray","className":"cursor-pointer"}}
                >
                  <X size={20} />
                </UiButton>
              </UiBox>

              {/* CUERPO DEL MODAL: Sidebar Izquierda + Resultados Derecha */}
              <UiBox {...{"className":"flex flex-1 overflow-hidden min-h-0"}}>
                
                {/* SIDEBAR DE FILTROS */}
                <UiBox {...{"style":{"borderRight":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"w-[200px] overflow-y-auto p-3 flex flex-col gap-4 custom-scrollbar"}}>
                  
                  {/* Filtro Rápido */}
                  <UiBox {...{"className":"space-y-1"}}>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","className":"px-2"}}>Filtros Rápidos</UiHeading>
                    <UiButton
                      type="button"
                      onClick={() => { setModalTab('all'); }}
                      {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (modalTab === 'all' ? {"variant":"soft","color":"blue"} : {"color":"gray"}))}
                    >
                      Todos los Productos
                    </UiButton>
                    <UiButton
                      type="button"
                      onClick={() => { setModalTab('best_sellers'); }}
                      {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (modalTab === 'best_sellers' ? {"variant":"soft","color":"blue"} : {"color":"gray"}))}
                    >
                      Más Vendidos
                    </UiButton>
                  </UiBox>

                  {/* Categorías */}
                  <UiBox {...{"className":"space-y-1"}}>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","className":"px-2"}}>Categorías</UiHeading>
                    <UiButton
                      type="button"
                      onClick={() => setModalCat('all')}
                      {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (modalCat === 'all' ? {"variant":"soft","color":"blue"} : {"color":"gray"}))}
                    >
                      Todas ({products.length})
                    </UiButton>
                    {categoriesWithCount.map(cat => (
                      <UiButton
                        key={cat.name}
                        type="button"
                        onClick={() => setModalCat(cat.name)}
                        {...mergeThemeProps({"size":"2","className":"w-full text-left flex items-center justify-between"}, {}, (modalCat === cat.name ? {"variant":"soft","color":"blue"} : {"color":"gray"}))}
                      >
                        <UiText {...{"className":"truncate pr-1"}}>{cat.name}</UiText>
                        <UiText {...{"size":"1","weight":"bold","color":"gray","className":"shrink-0"}}>{cat.count}</UiText>
                      </UiButton>
                    ))}
                  </UiBox>

                  {/* Marcas */}
                  <UiBox {...{"className":"space-y-1"}}>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","className":"px-2"}}>Marcas</UiHeading>
                    <UiButton
                      type="button"
                      onClick={() => setModalBrand('all')}
                      {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (modalBrand === 'all' ? {"variant":"soft","color":"blue"} : {"color":"gray"}))}
                    >
                      Todas
                    </UiButton>
                    {brands.filter(b => b !== 'all').map(brand => (
                      <UiButton
                        key={brand}
                        type="button"
                        onClick={() => setModalBrand(brand)}
                        {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (modalBrand === brand ? {"variant":"soft","color":"blue"} : {"color":"gray"}))}
                      >
                        {brand}
                      </UiButton>
                    ))}
                  </UiBox>

                  {/* Bodegas */}
                  <UiBox {...{"className":"space-y-1"}}>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","className":"px-2"}}>Bodegas</UiHeading>
                    <UiButton
                      type="button"
                      onClick={() => setModalWh('all')}
                      {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (modalWh === 'all' ? {"variant":"soft","color":"blue"} : {"color":"gray"}))}
                    >
                      Todas
                    </UiButton>
                    {warehouses.filter(w => w !== 'all').map(wh => (
                      <UiButton
                        key={wh}
                        type="button"
                        onClick={() => setModalWh(wh)}
                        {...mergeThemeProps({"size":"2","className":"w-full text-left"}, {}, (modalWh === wh ? {"variant":"soft","color":"blue"} : {"color":"gray"}))}
                      >
                        {wh}
                      </UiButton>
                    ))}
                  </UiBox>

                </UiBox>

                {/* RESULTADOS DE BÚSQUEDA */}
                <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex-1 p-4 overflow-y-auto custom-scrollbar select-none"}}>
                  {finalModalProducts.length === 0 ? (
                    <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex flex-col items-center justify-center py-20"}}>
                      <Box size={40} {...{"className":"opacity-30 mb-2"}} />
                      <UiText as="p" {...{"size":"1","className":"italic"}}>No se encontraron productos.</UiText>
                    </UiBox>
                  ) : (
                    <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"}}>
                      {finalModalProducts.map(p => {
                        const isOutOfStock = p.type === 'producto' && productKind(p) !== 'COMBO' && p.inventoryType !== 'VIRTUAL' && p.stock <= 0;
                        const minStk = p.minStock !== undefined ? Number(p.minStock) : 2;
                        const isLowStock = p.type === 'producto' && productKind(p) !== 'COMBO' && p.inventoryType !== 'VIRTUAL' && p.stock <= minStk && p.stock > 0;
                        
                        const cartItem = cart.find(item => item.productId === p.id);
                        const quantityInCart = cartItem ? cartItem.quantity : 0;
                        
                        let stockDotColor = {"style":{"backgroundColor":"var(--green-9)"}};
                        if (isOutOfStock) stockDotColor = {"style":{"backgroundColor":"var(--red-9)"}};
                        else if (isLowStock) stockDotColor = {"style":{"backgroundColor":"var(--amber-9)"}};

                        const imgUrl = getProductImageUrl(p);
                        const isImgPlaceholder = imgUrl === '/product.svg';

                        return (
                          <UiCard
                            key={p.id}
                            onClick={() => {
                              if (!isOutOfStock) {
                                addToCart(p);
                                if (navigator.vibrate) navigator.vibrate(10);
                              }
                            }}
                            {...mergeThemeProps({"className":"p-2 flex flex-col justify-between cursor-pointer relative"}, {}, (isOutOfStock ? {"style":{"backgroundColor":"var(--gray-2)"},"className":"cursor-not-allowed"} : {"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"active:scale-98"}))}
                            style={{ height: '150px' }}
                          >
                            {quantityInCart > 0 && (
                              <UiBox {...{"style":{"backgroundColor":"var(--blue-9)","color":"var(--color-background)","borderRadius":"var(--radius-3)"},"className":"absolute top-1 right-1 w-5 h-5 flex items-center justify-center z-20"}}>
                                {quantityInCart}
                              </UiBox>
                            )}

                            {/* Top row: Image & SKU Badge */}
                            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"w-full h-[75px] overflow-hidden relative flex items-center justify-center shrink-0"}}>
                              <UiBox {...mergeThemeProps({"className":"w-full h-full"}, {}, (isOutOfStock ? {"className":"opacity-40"} : {}))}>
                                {isImgPlaceholder ? (
                                  <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"w-full h-full flex items-center justify-center"}}>
                                    <Box size={32} strokeWidth={1} />
                                  </UiBox>
                                ) : (
                                  <img src={imgUrl} {...{"className":"w-full h-full object-cover"}} alt={p.name} />
                                )}
                              </UiBox>

                              {/* SKU Badge */}
                              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"absolute top-0 left-0 px-2 py-0.5 flex items-center gap-1 z-10"}}>
                                <UiText {...mergeThemeProps({"className":"w-1.5 h-1.5"}, {}, resolveThemeProps(stockDotColor))}></UiText>
                                <UiText {...{"weight":"regular","size":"1","color":"gray","highContrast":true,"className":"truncate max-w-[60px]"}}>{p.sku}</UiText>
                              </UiBox>

                              {/* Sin Stock text overlay */}
                              {isOutOfStock && (
                                <UiBox {...{"className":"absolute inset-0 flex items-center justify-center z-15 pointer-events-none"}}>
                                  <UiText {...{"size":"1","weight":"bold","color":"blue"}}>SIN STOCK</UiText>
                                </UiBox>
                              )}
                            </UiBox>

                            {/* Bottom row: Info & Price */}
                            <UiBox {...{"className":"mt-1 flex flex-col justify-between flex-1"}}>
                              <UiHeading as="h5" {...mergeThemeProps({"size":"1","weight":"bold","className":"leading-tight line-clamp-2 text-left"}, {}, (isOutOfStock ? {"color":"gray"} : {"color":"gray","highContrast":true}))}>
                                {p.name}
                              </UiHeading>
                              <UiBox {...{"className":"flex items-center justify-between gap-1 mt-0.5"}}>
                                <UiText {...{"size":"1","color":"gray","weight":"regular","className":"truncate max-w-[60px]"}}>
                                  {p.inventoryType === 'VIRTUAL' ? 'Virtual' : `Stock: ${p.stock}`}
                                </UiText>
                                <UiText {...mergeThemeProps({"size":"1","weight":"regular"}, {}, (isOutOfStock ? {"color":"red"} : {"color":"blue"}))}>
                                  ${Number(p.price).toFixed(2)}
                                </UiText>
                              </UiBox>
                            </UiBox>

                          </UiCard>
                        );
                      })}
                    </UiBox>
                  )}
                </UiBox>

              </UiBox>

            </UiBox>
          </UiBox>
        );
      })()}

      {/* LINE ITEM DISCOUNT SELECTOR MODAL */}
      {selectedLineItemForDiscount && (() => {
        const available = getAvailableDiscountsForLineItem(selectedLineItemForDiscount);
        return (
          <UiBox style={{ backgroundColor: 'var(--black-a7)' }} className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <UiBox style={{ backgroundColor: 'var(--color-panel-solid)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-a6)', boxShadow: 'var(--shadow-4)' }} className="w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <UiBox style={{ borderBottom: '1px solid var(--gray-a6)', backgroundColor: 'var(--gray-2)' }} className="p-4 flex items-center justify-between">
                <UiBox>
                  <UiHeading as="h3" size="2" weight="bold" color="gray" highContrast className="flex items-center gap-2">
                    <Tag size={15} style={{ color: 'var(--blue-11)' }} />
                    Descuento / Promo de Ítem
                  </UiHeading>
                  <UiText as="p" size="1" color="gray" weight="bold" className="mt-0.5">{selectedLineItemForDiscount.name}</UiText>
                </UiBox>
                <UiButton iconOnly
                  onClick={() => setSelectedLineItemForDiscount(null)} 
                  color="gray"
                  className="cursor-pointer"
                >
                  <X size={16} />
                </UiButton>
              </UiBox>
              <UiBox className="p-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
                {/* Descuento Manual Directo */}
                <UiCard style={{ backgroundColor: 'var(--gray-2)', border: '1px solid var(--gray-a6)' }} className="p-3 space-y-2">
                  <UiText size="1" weight="bold" color="gray" highContrast>⚡ Descuento Manual Directo</UiText>
                  <div className="flex items-center gap-2">
                    <UiSelect
                      value={manualLineDiscType}
                      onChange={e => setManualLineDiscType(e.target.value)}
                      size="2"
                      color="gray"
                      className="w-28 cursor-pointer"
                    >
                      <option value="PORCENTAJE">% Porc.</option>
                      <option value="MONTO_FIJO">$ Monto</option>
                    </UiSelect>
                    <UiInput
                      type="number"
                      min="0"
                      step={manualLineDiscType === 'PORCENTAJE' ? '1' : '0.01'}
                      value={manualLineDiscValue}
                      onChange={e => setManualLineDiscValue(e.target.value)}
                      size="2"
                      color="gray"
                      placeholder="0"
                      className="flex-1 font-mono"
                    />
                    <UiButton
                      type="button"
                      size="2"
                      variant="solid"
                      color="blue"
                      onClick={() => {
                        const val = parseFloat(manualLineDiscValue) || 0;
                        if (val <= 0) return;
                        setCart(cart.map(i => i.productId === selectedLineItemForDiscount.productId ? {
                          ...i,
                          id_descuento_aplicado: 'manual',
                          id_promocion_aplicada: '',
                          discount_value: val,
                          discount_type: manualLineDiscType,
                          itemDiscount: manualLineDiscType === 'PORCENTAJE' ? 0 : val
                        } : i));
                        showToast(`Descuento manual de ${manualLineDiscType === 'PORCENTAJE' ? `${val}%` : `$${val}`} aplicado`, "success");
                        setSelectedLineItemForDiscount(null);
                        setManualLineDiscValue('');
                      }}
                    >
                      Aplicar
                    </UiButton>
                  </div>
                </UiCard>

                {/* Option 1: None */}
                <UiButton
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
                  {...mergeThemeProps({"variant":"outline","className":"w-full text-left flex justify-between items-center cursor-pointer"}, {}, (!selectedLineItemForDiscount.id_descuento_aplicado ? {"variant":"soft","color":"blue"} : {"variant":"surface","color":"gray"}))}
                >
                  <UiText {...{"size":"1","weight":"bold"}}>Sin Descuento</UiText>
                  <CheckCircle2 size={14} {...(!selectedLineItemForDiscount.id_descuento_aplicado ? {"className":"opacity-100"} : {"className":"opacity-0"})} />
                </UiButton>

                {/* Available Discounts/Promos */}
                {available.length === 0 ? (
                  <UiText as="p" {...{"size":"1","color":"gray","className":"italic text-center py-4"}}>No hay descuentos o promociones de producto vigentes hoy.</UiText>
                ) : (
                  available.map(d => {
                    const isSelected = selectedLineItemForDiscount.id_descuento_aplicado === d.id && 
                                       (d.promotionId ? selectedLineItemForDiscount.id_promocion_aplicada === d.promotionId : true);
                    return (
                      <UiButton
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
                        {...mergeThemeProps({"variant":"outline","className":"w-full text-left flex justify-between items-center cursor-pointer"}, {}, (isSelected ? {"variant":"soft","color":"blue"} : {"variant":"surface","color":"gray"}))}
                      >
                        <UiBox {...{"className":"flex flex-col"}}>
                          <UiText {...{"size":"1","weight":"bold"}}>{d.nombre}</UiText>
                          <UiText {...{"size":"1","color":"gray","className":"mt-0.5"}}>
                            Valor: {d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : `$${d.valor}`}
                            {d.requiere_autorizacion && ' • [Clave Supervisor]'}
                          </UiText>
                        </UiBox>
                        <CheckCircle2 size={14} {...(isSelected ? {"className":"opacity-100"} : {"className":"opacity-0"})} />
                      </UiButton>
                    );
                  })
                )}
              </UiBox>
            </UiBox>
          </UiBox>
        );
      })()}

      {/* SUPERVISOR AUTHORIZATION MODAL */}
      {authDialog && (
        <UiBox style={{ backgroundColor: 'var(--black-a7)' }} className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <UiBox style={{ backgroundColor: 'var(--color-panel-solid)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-a6)', boxShadow: 'var(--shadow-4)' }} className="w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)', backgroundColor: 'var(--gray-2)' }} className="p-4 flex items-center justify-between">
              <UiText size="1" weight="bold" color="red" highContrast className="flex items-center gap-1.5">
                <ShieldAlert size={15} /> Autorización Requerida
              </UiText>
              <UiButton iconOnly
                onClick={() => { authDialog.onCancel?.(); setAuthDialog(null); }} 
                color="gray"
                className="cursor-pointer"
              >
                <X size={16} />
              </UiButton>
            </UiBox>
            <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"p-5 space-y-4"}}>
              <UiText as="p" {...{"color":"gray","className":"leading-relaxed"}}>
                El descuento <strong>{authDialog.discount.nombre}</strong> requiere clave de autorización de supervisor para ser aplicado.
              </UiText>
              
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Clave de Supervisor</UiLabel>
                <UiInput
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
                  {...{"color":"gray","size":"2","className":"w-full text-center"}}
                  autoFocus
                />
                {authError && (
                  <UiText as="p" {...{"color":"red","weight":"bold","size":"1","className":"mt-1.5 animate-pulse"}}>{authError}</UiText>
                )}
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-3 flex justify-end gap-2"}}>
                <UiButton
                  type="button" 
                  onClick={() => { authDialog.onCancel?.(); setAuthDialog(null); }} 
                  {...{"variant":"surface","color":"blue","className":"cursor-pointer"}}
                >
                  Cancelar
                </UiButton>
                <UiButton
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
                  {...{"variant":"solid","color":"red","className":"cursor-pointer"}}
                >
                  Autorizar
                </UiButton>
              </UiBox>
            </UiBox>
          </UiBox>
        </UiBox>
      )}

    </UiBox>,
    document.body
  );
}
