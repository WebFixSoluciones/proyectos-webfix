import FiscalDocuments from './FiscalDocuments';
import { downloadFiscalXml } from '../../services/sriAuthorization';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiTextarea } from '../ui/controls';
import { cancelInternalSale } from '../../services/cancelSale';
import { reserveSriEmission, saveSriResult } from '../../services/sriEmission';
import { consultarAutorizacionSRI, reintentarDocumentoSRI } from '../../services/sriService';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { normalizeProduct, appendInvoiceLine } from '../../services/productModel';
import { registerInventoryOperations, CENTRAL_BRANCH } from '../../services/inventoryLedger';
import { invoiceDescription } from '../../services/invoiceLine';
import { settlePayments } from '../../services/paymentModel';
import { useState, useEffect, useRef } from 'react';
import { createThemedPortal as createPortal } from '../ui/themePortal';
import { 
  X, Calculator, FileText, CheckCircle2, AlertTriangle, Sparkles, 
  Terminal, ShieldAlert, Download, Plus, Trash2, RefreshCw, ArrowLeft, ArrowRight, 
  User, DollarSign, CreditCard, Layers, Search, Tag, Percent, ChevronDown, ShoppingCart,
  Package, Printer, Mail, Send, Check, Clock, ExternalLink
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, runTransaction } from '../../services/financeStore.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { validarIdentificacion, generarFacturaXML, simularTransmisionSRI, consultarRucSri, generarRetencionXML, generarNotaCreditoXML, generarLiquidacionXML, generarGuiaRemisionXML, getEcuadorDateString, getEcuadorTimeString } from '../../services/sriService';
import { firmarComprobanteXML } from '../../services/xadesSigner';
import { registerTransactionInventory } from '../../services/inventoryLedger';
import { validateCartStock, taxRateFor, isSellable } from '../../services/productModel';
import { calculateTransactionTotals, isDiscountScheduleActive } from '../../services/discountCalcService';
import { sincronizarVenta, sincronizarCompra } from '../../services/integracionFinanzasService';
import { getCuentas } from '../../services/bancosService';
import RidePreviewModal from './RidePreviewModal';
import CreditSetupModal from './CreditSetupModal';
import SaleValidationDialog from './SaleValidationDialog';
import { getAdministrativeSaleIssues } from '../../services/saleValidation';
import { notifyAuthorizedInvoice } from '../../services/invoiceNotification';

const SRI_RENTA_CODES = [
  { code: '312', label: '312 - Transferencia de tecnología / asistencia técnica (10%)', rate: 10 },
  { code: '343', label: '343 - Servicios profesionales (10%)', rate: 10 },
  { code: '344', label: '344 - Servicios predominio mano de obra (2.75%)', rate: 2.75 },
  { code: '312A', label: '312A - Adquisición de bienes muebles (1.75%)', rate: 1.75 },
  { code: '332', label: '332 - Arrendamiento de inmuebles (8%)', rate: 8 },
  { code: '303', label: '303 - Honorarios y comisiones (10%)', rate: 10 },
  { code: '3440', label: '3440 - Rimpe Emprendedor (1%)', rate: 1 }
];

const SRI_IVA_CODES = [
  { code: '1', label: '1 - Retención de IVA 30% (Bienes)', rate: 30 },
  { code: '2', label: '2 - Retención de IVA 70% (Servicios)', rate: 70 },
  { code: '3', label: '3 - Retención de IVA 100% (Honorarios/Arrendamiento)', rate: 100 },
  { code: '7', label: '7 - Retención de IVA 10% (Entre Agentes - Bienes)', rate: 10 },
  { code: '8', label: '8 - Retención de IVA 20% (Entre Agentes - Servicios)', rate: 20 }
];

function sanitizeFirestoreData(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData);
  }
  if (typeof obj === 'object') {
    const clean = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val === undefined) {
          clean[key] = '';
        } else {
          clean[key] = sanitizeFirestoreData(val);
        }
      }
    }
    return clean;
  }
  return obj;
}

export default function TransactionForm({ tx, onClose, thirdParties, products = [], discounts = [], promotions = [], showToast, db, storage, appId, isInline = false, onSaved, usuario = null }) {
  const [sriConfig, setSriConfig] = useState({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    direccionMatriz: '',
    ambiente: '1', // 1: Pruebas, 2: Producción
    establecimiento: '001',
    puntoEmision: '001',
    secuencialFactura: 1,
    secuencialRetencion: 1,
    secuencialNotaCredito: 1,
    secuencialLiquidacion: 1,
    secuencialGuiaRemision: 1,
    secuencialNotaVenta: 1,
    certificadoCargado: false,
    certificadoNombre: '',
    obligadoContabilidad: true,
    regimenRimpe: 'rimpe_emprendedor',
    agenteRetencion: false,
    resolucionAgente: ''
  });
  const operationRef = useRef(false);
  const stableIdRef = useRef(tx?.id || crypto.randomUUID());
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [printTx, setPrintTx] = useState(null);
  const [printFormat, setPrintFormat] = useState('ride');
  const [autoPrintDirect, setAutoPrintDirect] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailDeliveryResult, setEmailDeliveryResult] = useState(null);
  const [customClientEmail, setCustomClientEmail] = useState('');
  const [hasSelectedDocType, setHasSelectedDocType] = useState(() => Boolean(tx?.documentType || tx?.claveAcceso));
  
  const [dbCategories, setDbCategories] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  useEffect(() => {
    async function fetchDbCategories() {
      try {
        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'inventory_categories'));
        setDbCategories(snap.docs.map(doc => doc.data()));
      } catch (err) {
        console.error("Error fetching categories in TransactionForm:", err);
      }
    }
    async function fetchBankAccounts() {
      try {
        const list = await getCuentas(db, { estado: 'activo' });
        setBankAccounts(list || []);
      } catch (err) {
        console.error("Error fetching bank accounts in TransactionForm:", err);
      }
    }
    if (db && appId) {
      fetchDbCategories();
      fetchBankAccounts();
    }
  }, [db, appId]);
  
  const [formData, setFormData] = useState({
    id: '',
    type: 'ingreso',
    date: getEcuadorDateString(),
    documentType: 'factura',
    documentNumber: '',
    thirdPartyId: '',
    category: 'ventas', 
    currency: 'USD',
    baseImponible: 0,
    ivaPorcentaje: 15,
    ivaValor: 0,
    retencionFuente: 0,
    retencionIva: 0,
    total: 0,
    paymentMethod: 'efectivo', // Default POS standard
    paymentStatus: 'pendiente',
    sriStatus: 'pendiente',
    xmlUrl: '',
    pdfUrl: '',
    xmlPath: '',
    pdfPath: '',
    secuencial: '1',
    claveAcceso: '',
    items: [], // Filas de productos desglosadas
    retenciones: [],
    codDocModificado: '01',
    numDocModificado: '',
    fechaEmisionDocSustento: getEcuadorDateString(),
    motivo: 'Devolución de mercadería',
    referencia: '',
    description: '',
    // Campos específicos de Guía de Remisión (06)
    placa: '',
    dirPartida: '',
    dirDestino: '',
    motivoTraslado: 'Venta',
    ruta: '',
    fechaIniTransporte: getEcuadorDateString(),
    fechaFinTransporte: getEcuadorDateString(),
    rucTransportista: '',
    razonSocialTransportista: '',
    tipoIdentificacionTransportista: '04',
    codDocSustento: '01',
    numDocSustento: ''
  });

  const [payments, setPayments] = useState({
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    cruce_cuentas: 0,
    transferenciaRef: '',
    transferenciaBankId: '',
    tarjetaRef: '',
    cruceRef: ''
  });

  const [activePayments, setActivePayments] = useState({
    efectivo: false,
    transferencia: false,
    tarjeta: false,
    cruce_cuentas: false
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [sriLogs, setSriLogs] = useState([]);
  
  // Local states for Mini POS and Client Credit Limits
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [clientDebt, setClientDebt] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [loadingDebt, setLoadingDebt] = useState(false);
  const [creditDueDate, setCreditDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return getEcuadorDateString(d);
  });
  const [creditObservations, setCreditObservations] = useState('');
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isCreditSetupOpen, setIsCreditSetupOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('cliente'); // 'cliente' | 'carrito' | 'pago'
  const [showAdditionalData, setShowAdditionalData] = useState(() => Boolean(tx?.referencia || tx?.description));

  // MiniPOS Discount
  // eslint-disable-next-line no-unused-vars
  const [generalDiscountType, setGeneralDiscountType] = useState('percent'); // 'percent' | 'fixed'
  // eslint-disable-next-line no-unused-vars
  const [generalDiscountValue, setGeneralDiscountValue] = useState(0);

  // Unified Discounts & Promotions state
  const [selectedGeneralDiscount, setSelectedGeneralDiscount] = useState(tx?.generalDiscount || null);
  const loadedTxIdRef = useRef(null);
  const [selectedLineItemForDiscount, setSelectedLineItemForDiscount] = useState(null);
  const [authDialog, setAuthDialog] = useState(null);
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [manualLineDiscType, setManualLineDiscType] = useState('PORCENTAJE'); // 'PORCENTAJE' | 'MONTO_FIJO'
  const [manualLineDiscValue, setManualLineDiscValue] = useState('');

  const getActiveDiscounts = (alcance) => {
    return (discounts || []).filter(d => {
      const matchAlcance = (alcance === 'VENTA')
        ? (d.alcance === 'VENTA' || d.alcance === 'GLOBAL')
        : (d.alcance === alcance);
      return matchAlcance && isDiscountScheduleActive(d);
    });
  };

  const getAvailableDiscountsForLineItem = (item) => {
    const hoy = getEcuadorDateString();
    const prod = products.find(p => p.id === item.productId);
    
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

      if (p.alcance_aplicacion === 'PRODUCTO_ESPECIFICO' && p.target_id === item.productId) {
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

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [validationIssues, setValidationIssues] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const fileInputRef = useRef(null);

  // States for Quick Contact Creation Modal (SRI)
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

  // Client search by indicio/letters
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Advanced product search popup
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advSearchTerm, setAdvSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Quick product creation modal
  const [isQuickAddProductOpen, setIsQuickAddProductOpen] = useState(false);
  const [quickAddProductFormData, setQuickAddProductFormData] = useState({
    name: '',
    sku: '',
    codigoBarras: '',
    price: '',
    baseCost: '',
    ivaCategory: 15,
    stock: ''
  });

  const queryQuickAddSRI = async () => {
    if (!quickAddFormData.ruc) {
      showToast('Por favor, ingresa un número de RUC o Cédula', 'error');
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
      showToast('Datos fiscales cargados exitosamente desde el SRI', 'success');
    } catch (e) {
      console.error("Error al consultar RUC en TransactionForm:", e);
      showToast(e.message || 'Error al consultar datos en el SRI', 'error');
    } finally {
      setIsQueryingSri(false);
    }
  };

  const handleQuickAddSave = async (e) => {
    e.preventDefault();
    if (!quickAddFormData.name || !quickAddFormData.ruc) {
      showToast('Nombre y RUC/Identificación son obligatorios', 'error');
      return;
    }
    const trimmedRuc = quickAddFormData.ruc.trim();
    const isDuplicate = (thirdParties || []).some(tp => tp.ruc && String(tp.ruc).trim() === trimmedRuc);
    if (isDuplicate) {
      showToast('Ya existe un contacto con este RUC/Identificación', 'error');
      return;
    }
    try {
      const docId = `tp_${new Date().getTime()}`;
      const relationType = formData.type === 'ingreso' ? 'cliente' : 'proveedor';
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', docId), sanitizeFirestoreData({
        name: quickAddFormData.name,
        ruc: quickAddFormData.ruc,
        email: quickAddFormData.email || '',
        type: relationType,
        tipoIdentificacion: quickAddFormData.tipoIdentificacion || 'ruc',
        direccion: quickAddFormData.direccion || '',
        ciudad: quickAddFormData.ciudad || '',
        telefono: quickAddFormData.telefono || '',
        tipoContribuyente: quickAddFormData.tipoContribuyente || 'general',
        isValidated: true,
        validado: true,
        updatedAt: new Date().toISOString()
      }));
      showToast('Contacto guardado y seleccionado', 'success');
      setFormData(prev => ({ ...prev, thirdPartyId: docId }));
      setIsQuickAddOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Error al guardar contacto', 'error');
    }
  };

  const handleQuickAddProductSave = async (e) => {
    e.preventDefault();
    if (!quickAddProductFormData.name || !quickAddProductFormData.price) {
      showToast('Nombre y Precio son obligatorios', 'error');
      return;
    }
    try {
      const saved = await productRepository.create({ type: 'STANDARD', name: quickAddProductFormData.name, sku: quickAddProductFormData.sku || 'PROD-' + crypto.randomUUID().slice(0,8), codigoBarras: quickAddProductFormData.codigoBarras || '', salePrice: Number(quickAddProductFormData.price), baseCost: Number(quickAddProductFormData.baseCost || 0), taxRate: Number(quickAddProductFormData.ivaCategory ?? 15), inventoryType: 'PHYSICAL' });
      const stock = Number(quickAddProductFormData.stock || 0);
      if (stock > 0) await registerInventoryOperations(db, appId, [{ productId: saved.id, branchId: CENTRAL_BRANCH, type: 'POSITIVE_ADJUSTMENT', referenceId: 'initial:' + saved.id, quantity: stock, unitCost: saved.baseCost }]);
      handleAddProductToCart(normalizeProduct({ ...saved, stock }));
      showToast('Producto creado y agregado al carrito', 'success');
      setIsQuickAddProductOpen(false);
    } catch (err) {
      console.error("Error creating product:", err);
      showToast('Error al guardar el producto', 'error');
    }
  };

  // Cargar configuraciones del Emisor SRI y transacciones previas
  useEffect(() => {
    if (!appId || !db) return;
    async function loadSriConfig() {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const configData = snap.data();
          setSriConfig(configData);
          
          if (!tx || !tx.secuencial) {
            setFormData(prev => {
              if (prev.claveAcceso) return prev;
              // Si el RUC está inactivo y es un ingreso tipo factura, cambiar a nota_venta
              const activeDocType = (configData.rucActivo === false && !tx && prev.type === 'ingreso' && prev.documentType === 'factura')
                ? 'nota_venta'
                : prev.documentType;

              // Solo nota de venta (documento interno) maneja un secuencial orientativo local; los comprobantes SRI se asignan al emitir
              const nextSec = activeDocType === 'nota_venta' ? String(configData.secuencialNotaVenta || 1) : '';

              return {
                ...prev,
                documentType: activeDocType,
                secuencial: nextSec
              };
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar configuración SRI", err);
      }
    }
    loadSriConfig();
  }, [appId, db, tx]);

  useEffect(() => {
    if (tx && loadedTxIdRef.current !== (tx.id || tx.documentNumber || '__new__')) {
      loadedTxIdRef.current = tx.id || tx.documentNumber || '__new__';
      setFormData(prev => ({
        ...prev,
        items: [], // Valor por defecto
        ...tx
      }));

      // Inicializar desglose de pagos
      let breakdownEf;
      let breakdownTr;
      let breakdownTj;
      let breakdownCr;

      if (tx.paymentsBreakdown) {
        breakdownEf = tx.paymentsBreakdown.efectivo || 0;
        breakdownTr = tx.paymentsBreakdown.transferencia || 0;
        breakdownTj = tx.paymentsBreakdown.tarjeta || 0;
        breakdownCr = tx.paymentsBreakdown.cruce_cuentas || tx.paymentsBreakdown.credito || 0;

        // Hydrate the payment controls from the selected persisted document.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPayments({
          efectivo: breakdownEf,
          transferencia: breakdownTr,
          tarjeta: breakdownTj,
          cruce_cuentas: breakdownCr,
          transferenciaRef: tx.transferenciaRef || tx.paymentReferences?.transferenciaRef || '',
          transferenciaBankId: tx.transferenciaBankId || tx.cuentaBancariaId || '',
          tarjetaRef: tx.tarjetaRef || tx.paymentReferences?.tarjetaRef || '',
          cruceRef: tx.cruceRef || tx.paymentReferences?.cruceRef || ''
        });
      } else {
        const method = tx.paymentMethod || 'transferencia';
        breakdownEf = method === 'efectivo' ? tx.total || 0 : 0;
        breakdownTr = method === 'transferencia' ? tx.total || 0 : 0;
        breakdownTj = method === 'tarjeta' ? tx.total || 0 : 0;
        breakdownCr = method === 'cruce_cuentas' || method === 'credito' ? tx.total || 0 : 0;

        setPayments({
          efectivo: breakdownEf,
          transferencia: breakdownTr,
          tarjeta: breakdownTj,
          cruce_cuentas: breakdownCr,
          transferenciaRef: tx.transferenciaRef || tx.paymentReferences?.transferenciaRef || '',
          transferenciaBankId: tx.transferenciaBankId || tx.cuentaBancariaId || '',
          tarjetaRef: tx.tarjetaRef || tx.paymentReferences?.tarjetaRef || '',
          cruceRef: tx.cruceRef || tx.paymentReferences?.cruceRef || ''
        });
      }

      setActivePayments({
        efectivo: Number(breakdownEf) > 0 || tx.paymentMethod === 'efectivo',
        transferencia: Number(breakdownTr) > 0 || tx.paymentMethod === 'transferencia',
        tarjeta: Number(breakdownTj) > 0 || tx.paymentMethod === 'tarjeta',
        cruce_cuentas: Number(breakdownCr) > 0 || tx.paymentMethod === 'cruce_cuentas' || tx.paymentMethod === 'credito'
      });

      // Si el documento ya fue autorizado o anulado, ir directo al paso 2 (vista de sólo lectura)
      if (tx.sriStatus === 'autorizado' || tx.sriStatus === 'anulado') {
        setCurrentStep(2);
      }
      if (tx.referencia || tx.description) {
        setShowAdditionalData(true);
      }


    }
  }, [tx]);

  // Cargar deuda del cliente de manera dinámica desde Firestore
  useEffect(() => {
    if (!formData.thirdPartyId || !db || !appId) {
      // Reset the displayed debt when no customer is selected.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClientDebt(0);
      return;
    }
    async function loadClientDebt() {
      setLoadingDebt(true);
      try {
        const txColRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_transactions');
        const q = query(txColRef, where('thirdPartyId', '==', formData.thirdPartyId));
        const snap = await getDocs(q);
        let debtSum = 0;
        snap.forEach(docSnap => {
          const t = docSnap.data();
          if (t.type === 'ingreso' && t.paymentStatus !== 'pagado') {
            const total = Number(t.total) || 0;
            const paid = Number(t.paidAmount) || 0;
            debtSum += (total - paid);
          }
        });
        setClientDebt(debtSum);
      } catch (err) {
        console.error("Error cargando deuda del cliente:", err);
      } finally {
        setLoadingDebt(false);
      }
    }
    loadClientDebt();
  }, [formData.thirdPartyId, db, appId]);

  // Cálculo automático del total y desglose de items/retenciones con Motor Unificado
  const normalizeCartItems = (items = []) => (items || []).map(item => {
    let disc = null;
    if (item.id_descuento_asociado) {
      disc = (discounts || []).find(d => d.id === item.id_descuento_asociado);
    }
    if (!disc && item.categoryId) {
      const cat = dbCategories.find(c => c.id === item.categoryId);
      if (cat && cat.id_descuento_asociado) {
        disc = (discounts || []).find(d => d.id === cat.id_descuento_asociado);
      }
    }
    let effectiveDisc;
    if (item.id_descuento_aplicado === 'manual') {
      effectiveDisc = {
        id: 'manual',
        manual: true,
        nombre: item.discount_type === 'SIN_IVA' ? 'Sin IVA' : 'Manual',
        tipo_valor: item.discount_type || 'PORCENTAJE',
        valor: Number(item.discount_value || 0),
        metodo: 'SIEMPRE',
        activo: true
      };
    } else if (item.id_descuento_aplicado) {
      effectiveDisc = (discounts || []).find(d => d.id === item.id_descuento_aplicado) || item.descuento_objeto || null;
    } else {
      effectiveDisc = disc;
    }
    return {
      ...item,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      tax_mode: item.tax_mode || 'EXCLUIDO',
      tarifa_iva: taxRateFor(item),
      id_descuento_aplicado: item.id_descuento_aplicado || '',
      id_promocion_aplicada: item.id_promocion_aplicada || '',
      discount_value: Number(item.discount_value) || Number(item.itemDiscount) || 0,
      discount_type: item.discount_type || 'PORCENTAJE',
      descuento_objeto: effectiveDisc
    };
  });

  useEffect(() => {
    if (formData.claveAcceso || ['autorizado', 'anulado'].includes(formData.sriStatus)) return;
    if (formData.documentType === 'retencion') {
      const rets = formData.retenciones || [];
      const sumRet = rets.reduce((sum, r) => sum + (parseFloat(r.valorRetenido) || 0), 0);
      const sumBase = rets.reduce((sum, r) => sum + (parseFloat(r.baseImponible) || 0), 0);
      // Keep the displayed retention totals consistent with the edited rows.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => {
        const next = { baseImponible: sumBase.toFixed(2), ivaValor: '0.00', total: sumRet.toFixed(2) };
        return prev.baseImponible === next.baseImponible && prev.ivaValor === next.ivaValor && prev.total === next.total ? prev : { ...prev, ...next };
      });
      return;
    }

    const hasItems = formData.items && formData.items.length > 0;
    
    if (hasItems) {
      const normalized = normalizeCartItems(formData.items);
      const totals = calculateTransactionTotals(normalized, selectedGeneralDiscount);
      
      const retFuente = Number(formData.retencionFuente) || 0;
      const retIva = Number(formData.retencionIva) || 0;
      const totalVal = totals.total - retFuente - retIva;

      setFormData(prev => {
        const next = { baseImponible: totals.baseImponible.toFixed(2), ivaValor: totals.ivaValor.toFixed(2), total: totalVal.toFixed(2) };
        return prev.baseImponible === next.baseImponible && prev.ivaValor === next.ivaValor && prev.total === next.total ? prev : { ...prev, ...next };
      });
    } else {
      // Flujo de cálculo manual
      const base = Number(formData.baseImponible) || 0;
      const ivaPerc = Number(formData.ivaPorcentaje) || 0;
      const ivaVal = Number((base * (ivaPerc / 100)).toFixed(2));
      
      const retFuente = Number(formData.retencionFuente) || 0;
      const retIva = Number(formData.retencionIva) || 0;
      
      const totalVal = base + ivaVal - retFuente - retIva;
      
      setFormData(prev => {
        const next = { ivaValor: ivaVal, total: totalVal.toFixed(2) };
        return String(prev.ivaValor) === String(next.ivaValor) && String(prev.total) === next.total ? prev : { ...prev, ...next };
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.claveAcceso,
    formData.sriStatus,
    formData.baseImponible, 
    formData.ivaPorcentaje, 
    formData.retencionFuente, 
    formData.retencionIva, 
    formData.items,
    formData.retenciones,
    formData.documentType,
    selectedGeneralDiscount
  ]);

  const currentCartTotals = calculateTransactionTotals(normalizeCartItems(formData.items), selectedGeneralDiscount);
  const invoiceItems = () => currentCartTotals.items;

  // Métodos para el desglose de retenciones
  const handleAddRetencion = () => {
    setFormData(prev => ({
      ...prev,
      retenciones: [
        ...(prev.retenciones || []),
        { 
          codigo: '1', 
          codigoRetencion: '312', 
          baseImponible: 0, 
          porcentajeRetener: 10, 
          valorRetenido: 0, 
          codDocSustento: '01', 
          numDocSustento: '', 
          fechaEmisionDocSustento: getEcuadorDateString() 
        }
      ]
    }));
  };

  const handleRemoveRetencion = (index) => {
    setFormData(prev => ({
      ...prev,
      retenciones: (prev.retenciones || []).filter((_, i) => i !== index)
    }));
  };

  const handleRetencionChange = (index, field, value) => {
    const updatedRets = [...(formData.retenciones || [])];
    
    if (field === 'codigo') {
      const defaultCode = value === '1' ? '312' : '1';
      const list = value === '1' ? SRI_RENTA_CODES : SRI_IVA_CODES;
      const matched = list.find(c => c.code === defaultCode);
      updatedRets[index] = {
        ...updatedRets[index],
        codigo: value,
        codigoRetencion: defaultCode,
        porcentajeRetener: matched ? matched.rate : 0,
        valorRetenido: ((parseFloat(updatedRets[index].baseImponible) || 0) * (matched ? matched.rate : 0) / 100).toFixed(2)
      };
    } else if (field === 'codigoRetencion') {
      const list = updatedRets[index].codigo === '1' ? SRI_RENTA_CODES : SRI_IVA_CODES;
      const matched = list.find(c => c.code === value);
      updatedRets[index] = {
        ...updatedRets[index],
        codigoRetencion: value,
        porcentajeRetener: matched ? matched.rate : 0,
        valorRetenido: ((parseFloat(updatedRets[index].baseImponible) || 0) * (matched ? matched.rate : 0) / 100).toFixed(2)
      };
    } else if (field === 'baseImponible' || field === 'porcentajeRetener') {
      const base = field === 'baseImponible' ? parseFloat(value) || 0 : parseFloat(updatedRets[index].baseImponible) || 0;
      const rate = field === 'porcentajeRetener' ? parseFloat(value) || 0 : parseFloat(updatedRets[index].porcentajeRetener) || 0;
      updatedRets[index] = {
        ...updatedRets[index],
        [field]: value,
        valorRetenido: (base * rate / 100).toFixed(2)
      };
    } else {
      updatedRets[index] = {
        ...updatedRets[index],
        [field]: value
      };
    }

    setFormData(prev => ({ ...prev, retenciones: updatedRets }));
  };

  // Métodos para el desglose de productos
  // eslint-disable-next-line no-unused-vars
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...(prev.items || []),
        { 
          lineId: crypto.randomUUID(),
          productId: '', 
          name: '', 
          price: 0, 
          quantity: 1, 
          ivaCategory: 15, 
          tax_mode: 'EXCLUIDO',
          tarifa_iva: 0.15,
          id_descuento_aplicado: '',
          id_promocion_aplicada: '',
          discount_value: 0,
          discount_type: 'PORCENTAJE',
          itemDiscount: 0 
        }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index)
    }));
  };

  const handleClearItems = () => {
    setFormData(prev => ({ ...prev, items: [], baseImponible: 0, ivaValor: 0, total: 0 }));
    setSelectedGeneralDiscount(null);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...(formData.items || [])];
    
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        const priceVal = prod.tax_mode === 'INCLUIDO' 
          ? (Number(prod.precio_con_iva) || Number(prod.price) || 0)
          : (Number(prod.precio_sin_iva) || Number(prod.price) || 0);
        updatedItems[index] = {
          ...updatedItems[index],
          productId: value,
          name: prod.name,
          invoiceDescription: prod.name,
          price: priceVal,
          ivaCategory: prod.ivaCategory ?? 15,
          tax_mode: prod.tax_mode || 'EXCLUIDO',
          tarifa_iva: prod.tarifa_iva !== undefined ? Number(prod.tarifa_iva) : 0.15,
          categoryId: prod.categoryId || '',
          id_descuento_asociado: prod.id_descuento_asociado || '',
          id_descuento_aplicado: '',
          id_promocion_aplicada: '',
          discount_value: 0,
          discount_type: 'PORCENTAJE',
          itemDiscount: 0
        };
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleAddProductToCart = (product) => {
    // En venta administrativa cada selección es una línea independiente.
    // Esto permite facturar el mismo soporte con conceptos distintos (p. ej. encuestas y usuarios).
    const line = { ...appendInvoiceLine([], product)[0], sku: product.sku || '', codigoBarras: product.codigoBarras || '' };
    setFormData(prev => ({ ...prev, items: [...(prev.items || []), line] }));
    setProductSearchTerm('');
    showToast(`Añadido: ${product.name}`, 'success');
  };

  // eslint-disable-next-line no-unused-vars
  const handleQuickAddFirstMatch = () => {
    if (!productSearchTerm.trim()) {
      showToast('Escribe un término de búsqueda para agregar rápido', 'warning');
      return;
    }
    const filtered = products.filter(p => 
      p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      p.codigoBarras?.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      handleAddProductToCart(filtered[0]);
    } else {
      showToast('No se encontraron coincidencias para agregar rápido', 'error');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handlePaymentMethodSelect = (method) => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
    if (method === 'credito') {
      setIsCreditModalOpen(true);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleFileUpload = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const extension = file.name.split('.').pop();
      const path = `artifacts/${appId}/finances/${new Date().getTime()}_${fileType}.${extension}`;
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        null, 
        () => {
          showToast(`Error al subir ${fileType}`, 'error');
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData(prev => ({
            ...prev,
            [`${fileType}Url`]: downloadURL,
            [`${fileType}Path`]: path
          }));
          setIsUploading(false);
          showToast(`${fileType.toUpperCase()} subido`, 'success');
        }
      );
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  const calculatePaymentStatus = () => {
    const total = Number(formData.total) || 0;
    const ef = Number(payments.efectivo) || 0;
    const tr = Number(payments.transferencia) || 0;
    const tj = Number(payments.tarjeta) || 0;
    const cr = Number(payments.cruce_cuentas) || 0;
    const sum = ef + tr + tj + cr;

    if (sum === 0 && total > 0) {
      return {
        isValid: false,
        vuelto: 0,
        error: 'Falta la forma de pago. Selecciona al menos un método de pago e ingresa el valor para cubrir el total.'
      };
    }

    if (sum < total - 0.01) {
      return {
        isValid: false,
        vuelto: 0,
        error: `El total cubierto ($${sum.toFixed(2)}) es menor al total de la venta ($${total.toFixed(2)}). Falta cubrir $${(total - sum).toFixed(2)}.`
      };
    }

    if (cr > 0) {
      const matchedTercero = formData.claveAcceso ? formData.thirdParty : thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
      const limit = Number(matchedTercero?.limiteCredito) || 1000;
      const available = limit - clientDebt;
      if (cr > available) {
        return {
          isValid: false,
          vuelto: 0,
          error: `El crédito asignado ($${cr.toFixed(2)}) supera el cupo disponible del cliente ($${available.toFixed(2)}).`
        };
      }
    }

    let vuelto = 0;
    if (sum > total) {
      vuelto = sum - total;
      if (vuelto > ef) {
        return {
          isValid: false,
          vuelto: 0,
          error: `El vuelto ($${vuelto.toFixed(2)}) no puede ser mayor que el efectivo recibido ($${ef.toFixed(2)}).`
        };
      }
    }

    return {
      isValid: true,
      vuelto: vuelto,
      error: null
    };
  };

  // eslint-disable-next-line no-unused-vars
  const getPrimaryPaymentMethod = () => {
    return formData.paymentMethod || 'efectivo';
  };

  // eslint-disable-next-line no-unused-vars
  const fillRemaining = (field) => {
    const total = Number(formData.total) || 0;
    setPayments(prev => ({
      ...prev,
      [field]: total.toFixed(2)
    }));
  };

  const showValidationIssues = (issues) => {
    setValidationIssues(issues);
    return false;
  };

  const navigateToValidationIssue = (target) => {
    setValidationIssues([]);
    setCurrentStep(1);
    const tab = target === 'client' || target === 'document' ? 'cliente' : target === 'items' ? 'carrito' : 'pago';
    setMobileTab(tab);
    const inputId = target === 'client' ? 'admin-client-search' : target === 'items' ? 'admin-product-search' : 'admin-payment-section';
    setTimeout(() => document.getElementById(inputId)?.focus(), 0);
  };

  const validateForm = () => {
    const matchedTercero = formData.claveAcceso ? formData.thirdParty : thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
    const issues = getAdministrativeSaleIssues({
      clientId: formData.thirdPartyId, client: matchedTercero,
      identificationValid: matchedTercero ? validarIdentificacion(matchedTercero.ruc, matchedTercero.tipoIdentificacion, matchedTercero.isValidated || matchedTercero.validado) : false,
      items: formData.items || [], total: formData.total, documentType: formData.documentType,
      documentNumber: formData.documentNumber, paymentStatus: calculatePaymentStatus(), payments, isSale: formData.type === 'ingreso'
    });
    if (issues.length) return showValidationIssues(issues);
    return true;
  };

  const completePendingSale = async () => {
    if (operationRef.current || formData.sriRecoveryOnly) return;
    operationRef.current = true; setIsSaving(true);
    try {
      await registerTransactionInventory(db, appId, formData);
      if (formData.type === 'ingreso' && ['factura', 'nota_venta'].includes(formData.documentType)) await sincronizarVenta(formData, db, usuario);
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', formData.id), { financialSyncStatus: 'complete' }, { merge: true });
      const completed = { ...formData, financialSyncStatus: 'complete', inventarioRegistrado: true };
      setFormData(completed); onSaved?.(completed); showToast('Inventario y finanzas sincronizados.', 'success');
    } catch (error) { showToast(error.message, 'error'); }
    finally { operationRef.current = false; setIsSaving(false); }
  };

  const registrarInventarioTransaccion = transaction => registerTransactionInventory(db, appId, transaction);

  const handleSave = (options = {}) => {
    // If called via form submit event, prevent default
    if (options && typeof options.preventDefault === 'function') {
      options.preventDefault();
      options = {};
    }

    // Validate first before showing confirmation dialog
    if (!validateForm()) return;

    const { isFinalizingNotaVenta = false } = options;

    let title;
    let message;
    let type;

    if (isFinalizingNotaVenta) {
      title = "Confirmar Registro de Venta";
      message = "Se guardará el RECIBO de venta local para control interno. Esta acción no tiene validez tributaria ante el SRI.";
      type = "warning";
    } else if (formData.type !== 'ingreso') {
      title = "Confirmar Registro de Gasto/Compra";
      message = "Se guardará este comprobante de GASTO/COMPRA en el sistema.";
      type = "info";
    } else {
      title = "Guardar Borrador";
      message = "¿Deseas guardar este comprobante como BORRADOR? Podrás editarlo más tarde antes de emitirlo.";
      type = "info";
    }

    setConfirmDialog({
      title,
      message,
      type,
      onConfirm: () => {
        setConfirmDialog(null);
        executeSave(options);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const executeSave = async (options = {}) => {
    if (operationRef.current || !validateForm()) return;
    operationRef.current = true;
    setIsSaving(true);

    try {
      const docId = formData.id || stableIdRef.current;
      let updatedFormData = { ...formData, items: invoiceItems(), generalDiscount: selectedGeneralDiscount, financialSyncStatus: 'pending' };

      // Si es un borrador de factura (o comprobante SRI aún no emitido), no retener ni asignar secuencial fiscal oficial
      const isDraftFactura = updatedFormData.type === 'ingreso' && updatedFormData.documentType === 'factura' && updatedFormData.sriStatus !== 'autorizado';
      if (isDraftFactura) {
        updatedFormData.sriStatus = 'borrador';
        updatedFormData.documentNumber = '';
        updatedFormData.secuencial = '';
      }

      // Lock system date & time automatically (non-modifiable)
      const now = new Date();
      const serverDate = getEcuadorDateString(now);
      const serverTime = getEcuadorTimeString(now);
      updatedFormData.date = serverDate;
      updatedFormData.time = serverTime;

      // Concurrency-safe sequential assignment for internal receipts (Nota de Venta) upon finalization
      const { isFinalizingNotaVenta = false } = options;
      if (formData.documentType === 'nota_venta' && isFinalizingNotaVenta && !formData.documentNumber) {
        const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        await runTransaction(db, async transaction => {
          const receiptRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId);
          const receipt = await transaction.get(receiptRef);
          const configSnap = await transaction.get(configRef);
          if (!configSnap.exists()) throw new Error('Configura el emisor antes de registrar una venta.');
          const existing = receipt.data();
          if (existing?.documentNumber) {
            updatedFormData = { ...updatedFormData, documentNumber: existing.documentNumber, secuencial: existing.secuencial, sriStatus: 'autorizado' };
            return;
          }
          const config = configSnap.data();
          const sec = Number(config.secuencialNotaVenta || 1);
          const number = `${config.establecimiento || '001'}-${config.puntoEmision || '001'}-${String(sec).padStart(9, '0')}`;
          updatedFormData = { ...updatedFormData, secuencial: String(sec), documentNumber: number, sriStatus: 'autorizado' };
          transaction.set(receiptRef, { id: docId, documentNumber: number, secuencial: String(sec), sriStatus: 'pendiente' }, { merge: true });
          transaction.update(configRef, { secuencialNotaVenta: sec + 1 });
        });
      }

      // Compute paidAmount and status based on multi-payment breakdown
      const totalNum = Number(updatedFormData.total) || 0;
      const efVal = Number(payments.efectivo) || 0;
      const trVal = Number(payments.transferencia) || 0;
      const tjVal = Number(payments.tarjeta) || 0;
      const crVal = Number(payments.cruce_cuentas) || 0;

      const paidAmount = efVal + trVal + tjVal; // Suma de todos los métodos liquidados de inmediato
      const paymentStatus = (paidAmount >= totalNum - 0.01) ? 'pagado' : 'pendiente';

      const payBreakdown = {
        efectivo: efVal,
        transferencia: trVal,
        tarjeta: tjVal,
        cruce_cuentas: crVal,
        credito: crVal // backward compatibility
      };

      // Determine main paymentMethod string for compatibility
      let primaryMethod = 'efectivo';
      let activeMethods = 0;
      if (efVal > 0) { primaryMethod = 'efectivo'; activeMethods++; }
      if (trVal > 0) { primaryMethod = 'transferencia'; activeMethods++; }
      if (tjVal > 0) { primaryMethod = 'tarjeta'; activeMethods++; }
      if (crVal > 0) { primaryMethod = 'credito'; activeMethods++; }

      if (activeMethods > 1) {
        primaryMethod = 'combinado';
      }

      let finalTxData = {
        ...updatedFormData,
        id: docId,
        paidAmount,
        paymentStatus,
        paymentMethod: primaryMethod,
        paymentsBreakdown: payBreakdown,
        transferenciaRef: payments.transferenciaRef || '',
        transferenciaBankId: payments.transferenciaBankId || '',
        cuentaBancariaId: payments.transferenciaBankId || '',
        tarjetaRef: payments.tarjetaRef || '',
        cruceRef: payments.cruceRef || '',
        creditDueDate: crVal > 0 ? creditDueDate : '',
        creditObservations: crVal > 0 ? creditObservations : '',
        updatedAt: now.toISOString(),
        updatedBy: 'Usuario ERP'
      };

      if (finalTxData.type === 'ingreso' && isFinalizingNotaVenta) Object.assign(finalTxData, settlePayments(finalTxData.total, payments));
      setFormData(prev => ({ ...prev, id: docId }));
      await runTransaction(db, async transaction => {
        const target = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId);
        const previous = await transaction.get(target);
        if (previous.data()?.claveAcceso) throw new Error('Este comprobante ya tiene identidad fiscal. Consulte su autorización; no se puede sobrescribir como borrador.');
        transaction.set(target, sanitizeFirestoreData(finalTxData), { merge: true });
      });
      setFormData(finalTxData);

      // Si es un egreso (compra/gasto) o se está finalizando una Nota de Venta (ingreso)
      if (finalTxData.type !== 'ingreso' || isFinalizingNotaVenta) {
        await registrarInventarioTransaccion(finalTxData);
        finalTxData = { ...finalTxData, inventarioRegistrado: true };
      }

      try {
        if (finalTxData.type === 'ingreso' && (isFinalizingNotaVenta || finalTxData.sriStatus === 'autorizado')) {
          const ventaData = {
            id: docId,
            type: 'ingreso',
            documentType: finalTxData.documentType,
            documentNumber: finalTxData.documentNumber,
            claveAcceso: finalTxData.claveAcceso || '',
            ...finalTxData,
            total: Number(finalTxData.total) || 0,
            baseImponible: Number(finalTxData.baseImponible) || Number(finalTxData.subtotal) || 0,
            ivaValor: Number(finalTxData.ivaValor) || 0,
            clienteNombre: finalTxData.thirdPartyName || finalTxData.clienteNombre || '',
            clienteRuc: finalTxData.thirdPartyRuc || finalTxData.clienteRuc || '',
            thirdPartyId: finalTxData.thirdPartyId || '',
            date: finalTxData.date || new Date().toISOString(),
            fechaVencimiento: finalTxData.creditDueDate || null,
            paymentMethod: finalTxData.paymentMethod || 'efectivo',
            paymentStatus: finalTxData.paymentStatus || 'pagado',
            sriStatus: finalTxData.sriStatus || 'no_aplica',
            notas: finalTxData.notas || '',
            xmlUrl: finalTxData.xmlUrl || '',
            pdfUrl: finalTxData.pdfUrl || '',
            transactionRef: finalTxData.transferenciaRef || '',
            isPOS: !!finalTxData.isPOS,
            creadoPor: '',
          };
          await sincronizarVenta(ventaData, db, usuario || { uid: '', email: '' });
        } else if (finalTxData.type === 'egreso') {
          const compraData = {
            id: docId,
            type: 'egreso',
            documentType: finalTxData.documentType,
            documentNumber: finalTxData.documentNumber,
            claveAcceso: finalTxData.claveAcceso || '',
            total: Number(finalTxData.total) || 0,
            baseImponible: Number(finalTxData.baseImponible) || Number(finalTxData.subtotal) || 0,
            ivaValor: Number(finalTxData.ivaValor) || 0,
            retencionFuente: Number(finalTxData.retencionFuente) || 0,
            retencionIva: Number(finalTxData.retencionIva) || 0,
            proveedorNombre: finalTxData.thirdPartyName || finalTxData.proveedorNombre || '',
            proveedorRuc: finalTxData.thirdPartyRuc || finalTxData.proveedorRuc || '',
            thirdPartyId: finalTxData.thirdPartyId || '',
            date: finalTxData.date || new Date().toISOString(),
            fechaVencimiento: finalTxData.creditDueDate || null,
            paymentMethod: finalTxData.paymentMethod || 'transferencia',
            paymentStatus: finalTxData.paymentStatus || 'pagado',
            sriStatus: finalTxData.sriStatus || 'no_aplica',
            category: finalTxData.category || 'costos',
            notas: finalTxData.notas || '',
            xmlUrl: finalTxData.xmlUrl || '',
            pdfUrl: finalTxData.pdfUrl || '',
            creadoPor: '',
          };
          await sincronizarCompra(compraData, db, usuario || { uid: '', email: '' });
        }
      } catch (syncErr) {
        showToast('El documento está guardado, pero falta sincronizar finanzas. Vuelve a guardar para reintentar: ' + syncErr.message, 'warning');
        throw syncErr;
      }

      if (finalTxData.sriStatus === 'autorizado' || finalTxData.type !== 'ingreso') {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), { financialSyncStatus: 'complete' }, { merge: true });
        finalTxData = { ...finalTxData, financialSyncStatus: 'complete' };
      }
      if (isDraftFactura) {
        showToast('Borrador guardado con éxito. El secuencial se asignará al emitir la factura en el SRI.', 'success');
      } else {
        showToast('Transacción guardada', 'success');
      }
      setFormData(finalTxData);
      onSaved?.(finalTxData);
      if (!isDraftFactura) {
        setCurrentStep(2);
        if (formData.documentType === 'nota_venta' && isFinalizingNotaVenta) {
          const receiver = thirdParties.find(tp => tp.id === finalTxData.thirdPartyId) || finalTxData.thirdParty;
          enviarCorreoComprobante(finalTxData, receiver, sriConfig);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Error al guardar: ' + (err.message || ''), 'error');
    } finally { operationRef.current = false; setIsSaving(false); }
  };

  const handleEmitirSRI = () => {
    // Validate first before showing confirmation dialog
    if (!validateForm()) return;

    setConfirmDialog({
      title: "Confirmar Emisión SRI",
      message: "Se firmará digitalmente y se enviará la FACTURA ELECTRÓNICA al SRI de forma oficial. Esta acción no se puede deshacer y tiene validez tributaria.",
      type: "warning",
      onConfirm: () => {
        setConfirmDialog(null);
        executeEmitirSRI();
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleDirectPrint = (format = 'ride') => {
    setPrintFormat(format);
    setAutoPrintDirect(true);
    setPrintTx(formData);
  };

  const enviarCorreoComprobante = async (txData, cliente, configSRI, overrideEmail = null) => {
    setEmailSending(true);
    try {
      const isNotaVenta = txData?.documentType === 'nota_venta';
      const docLabel = isNotaVenta ? 'Recibo' : 'Factura';
      const effectiveClient = overrideEmail
        ? { ...(cliente || {}), email: overrideEmail, correo: overrideEmail }
        : cliente;

      const result = await notifyAuthorizedInvoice({
        db, appId, document: txData, customer: effectiveClient, config: configSRI,
        api: { doc, getDoc, setDoc, runTransaction },
      });
      setEmailDeliveryResult(result);
      if (result.delivery) {
        setFormData(prev => ({ ...prev, emailDelivery: result.delivery }));
      }
      if (result.status === 'sent') {
        const clientSent = result.delivery?.client?.status === 'sent';
        const clientSkipped = result.delivery?.client?.status === 'skipped';
        const emitterSent = result.delivery?.emitter?.status === 'sent';

        if (clientSent && emitterSent) {
          showToast(`${docLabel} enviada al cliente y copia al emisor.`, 'success');
        } else if (clientSent) {
          showToast(`${docLabel} enviada al cliente exitosamente.`, 'success');
        } else if (clientSkipped && emitterSent) {
          showToast(`Copia de ${docLabel.toLowerCase()} enviada al emisor. Cliente sin correo.`, 'success');
        } else if (emitterSent) {
          showToast(`Copia de ${docLabel.toLowerCase()} enviada al emisor.`, 'success');
        }
      } else if (result.status === 'partial') {
        showToast(`${docLabel} emitida. Se envió a uno de los destinatarios.`, 'warning');
      } else if (result.status === 'unconfigured') {
        showToast(`${docLabel} emitida. Configura el correo emisor en Ajustes.`, 'warning');
      } else if (result.status === 'disabled') {
        showToast(`${docLabel} emitida. Activa el envío automático en Ajustes.`, 'warning');
      }
      return result;
    } catch (error) {
      console.warn('Error al notificar comprobante por correo:', error);
      showToast('Comprobante emitido, pero ocurrió un problema al enviar por correo.', 'warning');
      setEmailDeliveryResult({ status: 'error', error: error.message });
    } finally {
      setEmailSending(false);
    }
  };

  const fiscalApi = { doc, runTransaction };

  const finishAuthorizedEmission = async (document) => {
    setFormData(document);
    setCurrentStep(2);
    if (document.sriRecoveryOnly) { showToast(document.recoveryNote, 'warning'); return; }
    if (document.financialSyncStatus === 'complete') { onSaved?.(document); return; }
    try {
      await registrarInventarioTransaccion(document);
      if (document.type === 'ingreso' && document.documentType === 'factura') await sincronizarVenta(document, db, usuario || { uid: '', email: '' });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', document.id), { financialSyncStatus: 'complete' }, { merge: true });
      const complete = { ...document, inventarioRegistrado: true, financialSyncStatus: 'complete' };
      setFormData(complete);
      showToast('Autorización SRI confirmada y venta registrada.', 'success');
      onSaved?.(complete);
    } catch (error) {
      showToast('Factura AUTORIZADA y guardada. Falta sincronizar inventario o finanzas: ' + error.message, 'warning');
    }
  };

  const recoverSriEmission = async (retry = false) => {
    if (operationRef.current || !formData.claveAcceso) return;
    operationRef.current = true;
    setIsEmitting(true);
    try {
      const persisted = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', formData.id));
      if (!persisted.exists() || persisted.data().claveAcceso !== formData.claveAcceso) throw new Error('No se encontró la misma identidad fiscal guardada.');
      const snapshot = { ...persisted.data(), id: formData.id };
      const result = retry === true && snapshot.sriStatus === 'pendiente_sri'
        ? await reintentarDocumentoSRI(snapshot, setSriLogs)
        : await consultarAutorizacionSRI(snapshot.claveAcceso, snapshot.sriAmbiente || snapshot.claveAcceso[23]);
      const updated = await saveSriResult({ db, appId, document: formData, result, api: fiscalApi });
      setFormData(updated);
      if (updated.sriStatus === 'autorizado') {
        await finishAuthorizedEmission(updated);
        await enviarCorreoComprobante(updated, thirdParties.find(tp => tp.id === updated.thirdPartyId) || updated.thirdParty);
      }
      else showToast(result.message || 'Autorización pendiente; se conserva el mismo comprobante.', 'warning');
    } catch (error) {
      showToast('No se pudo confirmar el estado. Se conserva la clave y el secuencial. ' + error.message, 'warning');
    } finally { operationRef.current = false; setIsEmitting(false); }
  };

  const executeEmitirSRI = async () => {
    if (formData.claveAcceso) { await recoverSriEmission(); return; }
    if (operationRef.current || !validateForm()) return;
    const receiver = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
    if (!receiver) { showToast('Seleccione un cliente antes de emitir.', 'error'); return; }
    operationRef.current = true;
    setIsEmitting(true);
    setSriLogs([]);
    let reservedDocument = null;
    try {
      if (formData.type === 'ingreso' && formData.documentType === 'factura' && !formData.inventarioRegistrado) validateCartStock(formData.items, products);
      if (!validarIdentificacion(receiver.ruc, receiver.tipoIdentificacion, receiver.isValidated || receiver.validado)) throw new Error('Identificación del receptor inválida.');
      if (formData.documentType === 'factura' && receiver.ruc === '9999999999999' && Number(formData.total) > 50) throw new Error('Para valores superiores a $50 se requiere identificar al cliente.');
      const generators = { factura: generarFacturaXML, retencion: generarRetencionXML, nota_credito: generarNotaCreditoXML, liquidacion: generarLiquidacionXML, guia_remision: generarGuiaRemisionXML };
      const sequences = { factura: 'secuencialFactura', retencion: 'secuencialRetencion', nota_credito: 'secuencialNotaCredito', liquidacion: 'secuencialLiquidacion', guia_remision: 'secuencialGuiaRemision' };
      const generate = generators[formData.documentType];
      if (!generate) throw new Error('Tipo de comprobante electrónico no soportado.');
      const docId = formData.id || stableIdRef.current;
      const timestamp = new Date();
      const date = getEcuadorDateString(timestamp), time = getEcuadorTimeString(timestamp);
      const codigoNumerico = String(crypto.getRandomValues(new Uint32Array(1))[0] % 100000000).padStart(8, '0');
      const paymentSnapshot = settlePayments(formData.total, payments);
      const reservation = await reserveSriEmission({
        db, appId, docId, secKey: sequences[formData.documentType], api: fiscalApi,
        build: (config, secuencial) => {
          if (!/^\d{13}$/.test(String(config.ruc)) || !['1', '2'].includes(String(config.ambiente))) throw new Error('Configure RUC y ambiente del emisor.');
          if (!config.certificadoCargado || !config.certificadoBase64 || !config.certificadoClave) throw new Error('Se requiere certificado y contraseña válidos tanto en pruebas como en producción.');
          const invoice = { ...formData, ...paymentSnapshot, id: docId, thirdParty: receiver, items: invoiceItems(), generalDiscount: selectedGeneralDiscount, date, time, codigoNumerico, secuencial };
          const { xml, claveAcceso } = generate(config, invoice, receiver, invoice.items);
          const signedXml = firmarComprobanteXML(xml, config.certificadoBase64, config.certificadoClave);
          const emitter = Object.fromEntries(['ruc', 'razonSocial', 'nombreComercial', 'direccion', 'direccionMatriz', 'dirMatriz', 'establecimiento', 'puntoEmision', 'obligadoContabilidad', 'contribuyenteEspecial', 'ambiente'].filter(key => config[key] !== undefined).map(key => [key, config[key]]));
          return sanitizeFirestoreData({
            ...invoice, documentNumber: `${config.establecimiento || '001'}-${config.puntoEmision || '001'}-${secuencial.padStart(9, '0')}`,
            claveAcceso, xml: signedXml, sriStatus: 'pendiente_sri', sriAmbiente: String(config.ambiente), emisorSnapshot: emitter,
            sriReservedAt: timestamp.toISOString(), financialSyncStatus: 'awaiting_authorization',
            transferenciaRef: payments.transferenciaRef || '', transferenciaBankId: payments.transferenciaBankId || '', cuentaBancariaId: payments.transferenciaBankId || '',
            tarjetaRef: payments.tarjetaRef || '', cruceRef: payments.cruceRef || '', creditDueDate, creditObservations,
          });
        }
      });
      reservedDocument = reservation.document;
      setFormData(reservedDocument);
      let result;
      if (reservation.created) {
        setSriConfig(reservation.config);
        result = await simularTransmisionSRI({ ...reservedDocument, xml: reservedDocument.xml }, reservation.config, setSriLogs);
      } else {
        result = await consultarAutorizacionSRI(reservedDocument.claveAcceso, reservedDocument.sriAmbiente || reservedDocument.claveAcceso[23]);
      }
      const saved = await saveSriResult({ db, appId, document: reservedDocument, result, api: fiscalApi });
      setFormData(saved);
      if (saved.sriStatus === 'autorizado') {
        await finishAuthorizedEmission(saved);
        await enviarCorreoComprobante(saved, receiver, reservation.config);
      } else {
        showToast(result.message || 'Comprobante guardado, pendiente de autorización.', 'warning');
      }
    } catch (error) {
      const message = error.error || error.message || 'Fallo al consultar el SRI.';
      if (reservedDocument) {
        // Preserve a confirmed authorization even if a later operation fails.
        try {
          const saved = await saveSriResult({ db, appId, document: reservedDocument, result: { status: 'pendiente_sri', message }, api: fiscalApi });
          setFormData(saved);
        } catch { /* The pre-send document remains durable for the next consultation. */ }
        showToast('Comprobante guardado con su clave y secuencial. Consulte su estado antes de volver a emitir. ' + message, 'warning');
      } else showToast(message, 'error');
    } finally { operationRef.current = false; setIsEmitting(false); }
  };

  const handleAnular = () => {
    if (formData.documentType !== 'nota_venta') { showToast('Gestiona la anulación tributaria mediante el proceso correspondiente del SRI.', 'warning'); return; }
    const isNotaVenta = formData.documentType === 'nota_venta';
    setConfirmDialog({
      title: "Confirmar Anulación",
      message: isNotaVenta
        ? "¿Estás seguro de que deseas ANULAR esta Nota de Venta? Esta acción no se puede deshacer."
        : "¿Estás seguro de que deseas ANULAR este comprobante ante el SRI de forma definitiva?",
      type: "danger",
      onConfirm: () => {
        setConfirmDialog(null);
        executeAnular();
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const executeAnular = async () => {
    try {
      const isNotaVenta = formData.documentType === 'nota_venta';

      await cancelInternalSale(db, appId, formData);

      setFormData(prev => ({ ...prev, sriStatus: 'anulado', inventarioRegistrado: false }));
      showToast(isNotaVenta ? "Nota de Venta anulada exitosamente" : "Comprobante anulado tributariamente", "success");
    } catch {
      showToast("Error al anular", "error");
    }
  };

  const downloadXMLFile = () => {
    const xml = formData.xmlAutorizado || formData.xml;
    if (!xml) { showToast('Consulte la autorización para recuperar el XML original del SRI.', 'warning'); return; }
    downloadFiscalXml(xml, `${formData.claveAcceso}.xml`);
  };

  // Auto-emisión/Guardado directo para transacciones iniciadas desde el POS


  const matchedTercero = formData.claveAcceso ? formData.thirdParty : thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
  const isAuthorized = formData.sriStatus === 'autorizado';
  const isAnulado = formData.sriStatus === 'anulado';
  const isNotaVenta = formData.documentType === 'nota_venta';
  const emailDeliveryData = emailDeliveryResult?.delivery || formData.emailDelivery || {};
  const clientSent = emailDeliveryData.client?.status === 'sent';
  const clientFailed = emailDeliveryData.client?.status === 'failed';
  const clientAddress = emailDeliveryData.client?.address || matchedTercero?.email || matchedTercero?.correo || '';

  const emitterSent = emailDeliveryData.emitter?.status === 'sent';
  const emitterFailed = emailDeliveryData.emitter?.status === 'failed';
  const emitterAddress = emailDeliveryData.emitter?.address || sriConfig?.correoContacto || sriConfig?.email || sriConfig?.smtpUser || '';

  const isSmtpConfigured = Boolean(sriConfig?.smtpHost && sriConfig?.smtpUser && sriConfig?.smtpPass);
  const isSmtpActive = sriConfig?.smtpActivo !== false;

  const docConfirmationTitle = isNotaVenta
    ? (isAnulado ? '¡Nota de Venta Anulada!' : '¡Recibo Interno / Nota de Venta Emitido!')
    : isAuthorized 
      ? '¡Factura Electrónica Emitida y Autorizada!' 
      : '¡Transacción Guardada con Éxito!';

  const isEditable = !formData.claveAcceso && !isAuthorized && !isAnulado && !isSaving && !isEmitting;
  // Documento finalizado en paso 2 — no se puede regresar ni editar desde aquí
  const isLockedInStep2 = (isAuthorized || isAnulado) && currentStep === 2;
  // eslint-disable-next-line no-unused-vars
  const hasItems = formData.items && formData.items.length > 0;

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (formData.type === 'ingreso' && ['factura', 'nota_venta'].includes(formData.documentType)) {
        const client = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
        const issues = getAdministrativeSaleIssues({
          clientId: formData.thirdPartyId, client,
          identificationValid: client ? validarIdentificacion(client.ruc, client.tipoIdentificacion, client.isValidated || client.validado) : false,
          items: formData.items || [], total: formData.total, documentType: formData.documentType,
          documentNumber: formData.documentNumber, paymentStatus: null
        });
        if (issues.length) return showValidationIssues(issues);
        setCurrentStep(2);
        return;
      }
      if (!formData.thirdPartyId) {
        showToast('Selecciona un cliente antes de continuar', 'error');
        return;
      }
      const mt = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
      if (!mt) {
        showToast('El contacto seleccionado no es válido', 'error');
        return;
      }
      if (!validarIdentificacion(
        mt.ruc,
        mt.tipoIdentificacion,
        mt.isValidated || mt.validado
      )) {
        showToast(`El RUC/CI del contacto (${mt.ruc}) no es válido para Ecuador`, 'error');
        return;
      }

      // Validate products / retenciones (moved to Step 1!)
      if (formData.documentType !== 'retencion') {
        if (!formData.items || formData.items.length === 0) {
          showToast('Agrega al menos un producto o servicio antes de continuar', 'error');
          return;
        }
        const invalid = formData.items.some(item => !item.productId || Number(item.quantity) <= 0 || Number(item.price) < 0);
        if (invalid) {
          showToast('Asegúrate de que todos los ítems tengan cantidad y precio válidos', 'error');
          return;
        }
      } else {
        if (!formData.retenciones || formData.retenciones.length === 0) {
          showToast('Agrega al menos una fila de retención', 'error');
          return;
        }
        const invalid = formData.retenciones.some(ret => !ret.baseImponible || Number(ret.baseImponible) <= 0 || !ret.porcentajeRetener);
        if (invalid) {
          showToast('Asegúrate de que todas las retenciones tengan base imponible y porcentaje válidos', 'error');
          return;
        }
      }

      if (Number(formData.total) < 0) {
        showToast('El valor total del comprobante no puede ser menor a cero', 'error');
        return;
      }
    }

    if (currentStep === 2) {
      // Validate payment
      const pStatus = calculatePaymentStatus();
      if (!pStatus.isValid) {
        showValidationIssues([{ target: 'payment', label: 'pago', message: pStatus.error }]);
        return;
      }

      // Must be emitted or registered before printing in Step 3
      if (isEditable && !formData.documentNumber) {
        showValidationIssues([{ target: 'document', label: 'comprobante', message: 'Registra la venta o emite el comprobante antes de continuar.' }]);
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 2));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  

  

  

  const steps = [
    { id: 1, name: 'Detalle y Productos' },
    { id: 2, name: 'Impresión' }
  ];

  const filteredClients = (thirdParties || [])
    .filter(tp => formData.type === 'ingreso' ? tp.type !== 'proveedor' : tp.type === 'proveedor')
    .filter(tp =>
      !clientSearchTerm ||
      tp.name?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      tp.ruc?.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );
  // eslint-disable-next-line no-unused-vars
  const paymentStatus = calculatePaymentStatus();
  const efVal = Number(payments.efectivo) || 0;
  const tjVal = Number(payments.tarjeta) || 0;
  const trVal = Number(payments.transferencia) || 0;
  const crVal = Number(payments.cruce_cuentas) || 0;
  // eslint-disable-next-line no-unused-vars
  const totalPaid = efVal + tjVal + trVal + crVal;

  const closeTransaction = () => {
    // A durable fiscal attempt must leave the POS cart as a saved document, even while authorization is pending.
    if (formData.claveAcceso && onSaved) onSaved(formData);
    else onClose?.();
  };

  const formJSX = (
    <UiBox {...mergeThemeProps({"className":"transaction-form-clean"}, {}, (isInline ? mergeThemeProps({"style":{"backgroundColor":"transparent","color":"var(--gray-12)"},"className":"w-full flex flex-col animate-in fade-in duration-300"}) : mergeThemeProps({"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"},"className":"fixed inset-0 z-[100] w-screen h-screen overflow-y-auto flex flex-col"})))}>

      
      {/* TOP HEADER */}
      <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"sticky top-0 z-20 flex items-center justify-between px-4 py-3"})}>
        <UiBox {...{"className":"flex items-center gap-[5px]"}}>
          {!isInline && (
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-[5px]"}, {}, (formData.type === 'ingreso' ? {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}} : {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}}))}>
              <Calculator size={16} />
            </UiBox>
          )}
          <UiBox>
            {/* Desktop / Tablet Header Title */}
            <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"gray","highContrast":true,"className":"hidden sm:block"}}>
              {formData.type === 'ingreso' ? 'Venta Administrativa' : 'Asistente de Compras'}
            </UiHeading>
            {/* Mobile Header Title */}
            <UiHeading as="h2" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"sm:hidden"}}>
              {formData.type === 'ingreso' ? 'Venta Administrativa' : 'Compras'}
            </UiHeading>
            {formData.claveAcceso && <UiText as="p" {...{"size":"1","weight":"regular","color":"gray","highContrast":true,"className":"mt-[1px]"}}>Clave SRI: {formData.claveAcceso}</UiText>}
          </UiBox>
        </UiBox>

        {/* COMPACT STEPPER (Clean, non-button indicators) */}
        {!isInline && (
          <UiBox {...{"className":"flex items-center gap-[5px]"}}>
            {steps.map((step, idx) => (
              <UiButton
                key={step.id}
                type="button"
                disabled={(isEditable && step.id === 2) || (isLockedInStep2 && step.id === 1)}
                onClick={() => {
                  if (step.id === 2) {
                    if (isEditable && !formData.documentNumber) {
                      showToast('Debes registrar la venta o emitir el comprobante antes de ver la impresión', 'error');
                      return;
                    }
                  }
                  setCurrentStep(step.id);
                }}
                {...mergeThemeProps({"className":"flex items-center gap-[3px]"}, {}, (currentStep === step.id ? {"className":"opacity-100"} : {"className":"opacity-60 hover:opacity-100"}))}
              >
                <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"w-4 h-4 flex items-center justify-center"}, {}, (currentStep === step.id ? {} : {"color":"gray","highContrast":true}))}>
                  {step.id}
                </UiText>
                <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"hidden sm:inline"}, {}, (currentStep === step.id ? {"color":"gray"} : {"color":"gray"}))}>
                  {step.name}
                </UiText>
                {idx < steps.length - 1 && (
                  <UiText {...{"color":"gray","weight":"regular","className":"ml-1"}}>/</UiText>
                )}
              </UiButton>
            ))}
          </UiBox>
        )}
        <UiButton
          onClick={closeTransaction} disabled={isSaving || isEmitting}
          {...{"variant":"surface","color":"blue"}}
        >
          <X size={12} />
          <UiText>{isInline ? 'Cancelar' : 'Cerrar'}</UiText>
        </UiButton>
      </UiCard>

      {formData.claveAcceso && <UiCard className="m-4 p-4 space-y-3">
        <UiText as="p" weight="bold">{formData.documentNumber}: {isAuthorized ? 'Autorizado por el SRI' : 'Identidad fiscal reservada — autorización por verificar'}</UiText>
        <UiText as="p" size="2">{formData.recoveryNote || formData.sriLastError || 'La clave y el secuencial se conservan aunque falle la conexión.'}</UiText>
        <UiButton type="button" disabled={isEmitting || isSaving} onClick={() => recoverSriEmission()}>{isEmitting ? 'Consultando…' : 'Consultar autorización SRI'}</UiButton>
        {formData.sriStatus === 'pendiente_sri' && formData.xml && <UiButton type="button" variant="soft" disabled={isEmitting || isSaving} onClick={() => recoverSriEmission(true)}>Reintentar envío del XML guardado</UiButton>}
        <FiscalDocuments transaction={formData} tenantId={appId} />
      </UiCard>}
      {isAuthorized && formData.financialSyncStatus === 'pending' && <UiBox role="alert" {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--amber-3)","color":"var(--amber-12)"},"className":"m-4 flex flex-wrap items-center justify-between gap-3 p-4"}}><UiText as="p">El comprobante está registrado. Falta completar inventario o finanzas.</UiText><UiButton type="button" {...{"variant":"surface","color":"blue"}} disabled={isSaving} onClick={completePendingSale}>{isSaving ? 'Sincronizando…' : 'Reintentar sincronización'}</UiButton></UiBox>}
      {/* STATE BANNERS (Sri authorized / canceled) */}
      {isAuthorized && (
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--green-3)","color":"var(--green-11)"},"className":"m-[5px] mb-0 p-[5px] flex items-center gap-[3px]"}}>
          <CheckCircle2 size={16} {...{"className":"shrink-0"}} />
          <UiBox {...{}}>
            <UiText as="p" {...{"weight":"bold","color":"gray","highContrast":true}}>
              {formData.documentType === 'nota_venta' ? 'Comprobante de Venta Guardado' : 'Comprobante Autorizado por el SRI'}
            </UiText>
            <UiText as="p" {...{"color":"gray","highContrast":true,"weight":"regular","className":"opacity-80"}}>
              {formData.documentType === 'nota_venta' 
                ? 'Este documento ha sido guardado para control interno y no puede ser editado ni eliminado. Para corregirlo, anule este comprobante.' 
                : 'Este documento tiene efectos fiscales y no puede ser editado ni eliminado. Para corregirlo, emita una Nota de Crédito.'}
            </UiText>
          </UiBox>
        </UiBox>
      )}

      {isAnulado && (
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-11)"},"className":"m-[5px] mb-0 p-[5px] flex items-center gap-[3px]"}}>
          <ShieldAlert size={16} {...{"className":"shrink-0"}} />
          <UiBox {...{}}>
            <UiText as="p" {...{"weight":"bold","color":"gray","highContrast":true}}>Comprobante Anulado</UiText>
            <UiText as="p" {...{"color":"gray","highContrast":true,"weight":"regular","className":"opacity-80"}}>
              {formData.documentType === 'nota_venta'
                ? 'Este documento ha sido anulado de forma definitiva.'
                : 'Este documento ya no tiene validez tributaria ante el SRI.'}
            </UiText>
          </UiBox>
        </UiBox>
      )}

      {/* STEP CONTAINER BODY */}
      <UiBox {...{"className":"flex-1 p-[12px] max-w-[1600px] w-full mx-auto"}}>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PASO 1: CABECERA, PRODUCTOS & PAGO (MINI POS)           */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <UiBox {...{"className":"space-y-[12px]"}}>
            {/* Mobile Navigation Tabs */}
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","border":"1px solid var(--gray-a6)"},"className":"flex lg:hidden w-full p-[3px] gap-[3px] mb-[4px]"}}>
              {[
                { 
                  id: 'cliente', 
                  label: 'Cliente', 
                  icon: User,
                  badge: formData.thirdPartyId ? (
                    <UiText {...{"size":"1","weight":"bold","color":"green","className":"px-2 py-0.5"}}>Listo</UiText>
                  ) : (
                    <UiText {...{"size":"1","weight":"bold","color":"amber","className":"px-2 py-0.5"}}>Pendiente</UiText>
                  ),
                  activeBadge: formData.thirdPartyId ? (
                    <UiText {...{"size":"1","weight":"bold","color":"gray","className":"px-2 py-0.5"}}>Listo</UiText>
                  ) : (
                    <UiText {...{"size":"1","weight":"bold","color":"gray","className":"px-2 py-0.5"}}>Pendiente</UiText>
                  )
                },
                { 
                  id: 'carrito', 
                  label: 'Carrito', 
                  icon: Layers,
                  badge: (
                    <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"px-2 py-0.5"}}>
                      {formData.items?.length || 0}
                    </UiText>
                  ),
                  activeBadge: (
                    <UiText {...{"size":"1","weight":"bold","color":"gray","className":"px-2 py-0.5"}}>
                      {formData.items?.length || 0}
                    </UiText>
                  )
                },
                { 
                  id: 'pago', 
                  label: 'Pago', 
                  icon: CreditCard,
                  badge: (
                    <UiText {...{"size":"1","weight":"bold","color":"green","className":"px-2 py-0.5"}}>
                      ${Number(formData.total).toFixed(2)}
                    </UiText>
                  ),
                  activeBadge: (
                    <UiText {...{"size":"1","weight":"bold","color":"gray","className":"px-2 py-0.5"}}>
                      ${Number(formData.total).toFixed(2)}
                    </UiText>
                  )
                }
              ].map(tab => {
                const isActive = mobileTab === tab.id;
                const IconComponent = tab.icon;
                return (
                  <UiButton
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id)}
                    {...mergeThemeProps({"className":"flex-1 flex flex-col items-center justify-center"}, {}, (isActive ? {"variant":"solid","color":"blue"} : {"color":"gray"}))}
                  >
                    <UiBox {...{"className":"flex items-center gap-[3px] mb-[2px]"}}>
                      <IconComponent size={11} {...{"className":"shrink-0"}} />
                      <UiText {...{"size":"1","weight":"bold"}}>{tab.label}</UiText>
                    </UiBox>
                    {isActive ? tab.activeBadge : tab.badge}
                  </UiButton>
                );
              })}
            </UiBox>

            <UiBox {...{"className":"grid grid-cols-12 gap-[12px] animate-in fade-in slide-in-from-bottom duration-300"}}>
              {/* Left Column: lg:col-span-8 */}
              <UiBox {...{"className":"col-span-12 lg:col-span-8 space-y-[12px]"}}>
                
                {/* Card 1: Client and location details */}
                <UiBox {...mergeThemeProps({}, {}, {}, mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-[12px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"}}), (mobileTab === 'cliente' ? {"className":"block"} : {"className":"hidden lg:block"}))}>
                  <UiBox className="flex items-center justify-between mb-3">
                    <UiBox className="flex items-center gap-2">
                      <UiBox style={{ color: "var(--accent-11)" }}>
                        <User size={16} />
                      </UiBox>
                      <UiHeading as="h3" size="2" weight="bold">
                        {formData.type === 'ingreso' ? 'Datos de Cliente' : 'Datos de Proveedor'}
                      </UiHeading>
                    </UiBox>
                  </UiBox>
                
                {/* Client Search + Quick Add row */}
                <UiBox {...{"className":"flex gap-[8px] items-center mb-[10px]"}}>
                  <UiBox {...{"className":"flex-1 relative"}}>
                    <UiInput
                      id="admin-client-search"
                      aria-invalid={validationIssues.some(issue => issue.target === 'client') && !formData.thirdPartyId}
                      disabled={!isEditable}
                      type="text"
                      value={clientSearchTerm}
                      onChange={e => setClientSearchTerm(e.target.value)}
                      placeholder={matchedTercero ? `${matchedTercero.name} — RUC/CI: ${matchedTercero.ruc}` : "Escribe para buscar cliente..."}
                      iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
                      iconSuffix={clientSearchTerm ? (
                        <button type="button" onClick={() => setClientSearchTerm('')} className="text-[var(--gray-10)] hover:text-[var(--gray-12)] p-0.5 cursor-pointer">
                          <X size={12} />
                        </button>
                      ) : undefined}
                      size="2"
                      color="gray"
                      className="w-full"
                    />
                    
                    {clientSearchTerm.trim() !== '' && (
                      <UiBox 
                        style={{
                          borderRadius: 'var(--radius-3)',
                          border: '1px solid var(--gray-a6)',
                          backgroundColor: 'var(--color-panel-solid)',
                          boxShadow: 'var(--shadow-3)',
                          zIndex: 50
                        }}
                        className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto custom-scrollbar divide-y divide-[var(--gray-a4)]"
                      >
                        {filteredClients.slice(0, 10).map(tp => (
                          <button
                            key={tp.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, thirdPartyId: tp.id }));
                              setClientSearchTerm('');
                            }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-[var(--accent-3)] transition-colors flex flex-col gap-0.5 cursor-pointer bg-transparent border-none outline-none"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-xs text-[var(--gray-12)] truncate">{tp.name}</span>
                              <span className="text-[10px] font-mono font-medium text-[var(--blue-11)] bg-[var(--blue-3)] px-1.5 py-0.5 rounded shrink-0">
                                {tp.tipoIdentificacion ? tp.tipoIdentificacion.toUpperCase() : 'RUC/CI'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--gray-10)] flex items-center gap-2">
                              <span className="font-mono">ID: {tp.ruc}</span>
                              {tp.telefono && <span>• Tel: {tp.telefono}</span>}
                              {tp.email && <span className="truncate max-w-[200px]">• {tp.email}</span>}
                            </div>
                          </button>
                        ))}
                        {filteredClients.length === 0 && (
                          <div className="p-3 text-center text-xs text-[var(--gray-10)]">
                            No se encontraron clientes. Usa <strong className="text-[var(--blue-11)]">(+)</strong> para crear uno nuevo.
                          </div>
                        )}
                      </UiBox>
                    )}
                  </UiBox>
                  
                  {isEditable && (
                    <UiButton iconOnly
                      type="button"
                      onClick={() => {
                        setQuickAddFormData({
                          name: '', ruc: '', email: '', tipoIdentificacion: 'ruc',
                          direccion: '', telefono: '', tipoContribuyente: 'general'
                        });
                        setIsQuickAddOpen(true);
                      }}
                      {...{"variant":"solid","color":"blue","className":"shrink-0"}}
                      title="Crear Contacto Rápido"
                    >
                      <Plus size={14} />
                    </UiButton>
                  )}
                </UiBox>

                {/* Client detail card (extremely compact, green diffused background with black text) */}
                {matchedTercero ? (
                  <UiBox className="grid grid-cols-1 sm:grid-cols-3 gap-[10px] p-[8px] mb-[8px] rounded-md bg-[#e6f4ea] border border-[#ceead6] dark:bg-emerald-950/40 dark:border-emerald-800/60">
                    <UiBox>
                      <UiText as="p" size="1" weight="bold" className="text-gray-600 dark:text-gray-300">Razón Social</UiText>
                      <UiText as="p" weight="bold" size="1" className="truncate text-black dark:text-white font-bold">{matchedTercero.name}</UiText>
                    </UiBox>
                    <UiBox>
                      <UiText as="p" size="1" weight="bold" className="text-gray-600 dark:text-gray-300">RUC / CI</UiText>
                      <UiText as="p" weight="bold" size="1" className="text-black dark:text-white font-bold font-mono">{matchedTercero.ruc}</UiText>
                    </UiBox>
                    <UiBox>
                      <UiText as="p" size="1" weight="bold" className="text-gray-600 dark:text-gray-300">Teléfono / Correo</UiText>
                      <UiText as="p" weight="bold" size="1" className="truncate text-black dark:text-white font-bold">
                        {matchedTercero.telefono || 'S/N'} {matchedTercero.email ? `| ${matchedTercero.email}` : ''}
                      </UiText>
                    </UiBox>
                  </UiBox>
                ) : (
                  <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-11)"},"className":"p-[8px] flex items-center justify-center gap-1.5 mb-[8px]"})}>
                    <AlertTriangle size={12} {...{"className":"shrink-0"}} />
                    <UiText>Selecciona un cliente para habilitar la facturación.</UiText>
                  </UiBox>
                )}

                {/* Document Type, Establishment, Bodega, Reference in a compact grid */}
                <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[8px]"}}>
                  <UiBox>
                    <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Tipo Documento</UiLabel>
                    <UiSelect
                      disabled={!isEditable} 
                      value={formData.documentType} 
                      variant={hasSelectedDocType ? "solid" : "surface"}
                      color="blue"
                      onClick={() => setHasSelectedDocType(true)}
                      onFocus={() => setHasSelectedDocType(true)}
                      onChange={e => {
                        setHasSelectedDocType(true);
                        const newDocType = e.target.value;
                        if (sriConfig?.rucActivo === false && newDocType === 'factura') {
                          showToast("El RUC de la empresa está inactivo. Solo puede emitir Notas de Venta.", "error");
                          return;
                        }
                        const nextSec = newDocType === 'nota_venta' ? String(sriConfig?.secuencialNotaVenta || 1) : '';
                        setFormData(prev => ({ ...prev, documentType: newDocType, secuencial: nextSec }));
                      }} 
                      style={hasSelectedDocType ? {
                        backgroundColor: 'var(--accent-9)',
                        color: '#ffffff',
                        borderColor: 'var(--accent-9)'
                      } : {
                        backgroundColor: 'var(--blue-2)',
                        color: 'var(--blue-11)',
                        borderColor: 'var(--blue-7)'
                      }}
                      className={hasSelectedDocType 
                        ? "w-full font-bold !text-white !bg-[var(--accent-9)] border-[var(--accent-9)] cursor-pointer shadow-sm transition-all"
                        : "w-full font-semibold !text-[var(--blue-11)] !bg-[var(--blue-2)] border border-[var(--blue-7)] cursor-pointer hover:bg-[var(--blue-3)] transition-all"
                      }
                    >
                      {formData.documentType === 'nota_credito' ? (
                        <option value="nota_credito">NOTA DE CRÉDITO</option>
                      ) : formData.documentType === 'retencion' ? (
                        <option value="retencion">COMPROBANTE DE RETENCIÓN</option>
                      ) : formData.documentType === 'nota_debito' ? (
                        <option value="nota_debito">NOTA DE DÉBITO</option>
                      ) : formData.documentType === 'liquidacion' ? (
                        <option value="liquidacion">LIQUIDACIÓN DE COMPRA</option>
                      ) : formData.documentType === 'guia_remision' ? (
                        <option value="guia_remision">GUÍA DE REMISIÓN</option>
                      ) : (
                        <>
                          <option value="factura" disabled={sriConfig?.rucActivo === false}>
                            FACTURA ELECTRÓNICA
                          </option>
                          <option value="nota_venta">NOTA DE VENTA (RECIBO)</option>
                        </>
                      )}
                    </UiSelect>
                  </UiBox>
                  
                  <UiBox>
                    <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Fecha Emisión</UiLabel>
                    <UiInput
                      disabled={true} 
                      type="text" 
                      value={formData.date ? formData.date.split('-').reverse().join('/') : ''} 
                      {...mergeThemeProps({}, {"className":"text-center cursor-not-allowed"}, mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"}))} 
                    />
                  </UiBox>

                  <UiBox>
                    <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Establecimiento</UiLabel>
                    <UiSelect
                      disabled={!isEditable} 
                      value={formData.establecimiento || sriConfig?.establecimiento || '001'} 
                      onChange={e => setFormData({...formData, establecimiento: e.target.value})} 
                      {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                    >
                      <option value={sriConfig?.establecimiento || '001'}>{sriConfig?.establecimiento || '001'} - Sucursal Matriz</option>
                    </UiSelect>
                  </UiBox>

                  <UiBox>
                    <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Bodega</UiLabel>
                    <UiSelect
                      disabled={!isEditable} 
                      value={formData.bodega || 'Bodega Central'} 
                      onChange={e => setFormData({...formData, bodega: e.target.value})} 
                      {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                    >
                      <option value="Bodega Central">Bodega Central</option>
                      <option value="Bodega de Exhibición">Bodega de Exhibición</option>
                    </UiSelect>
                  </UiBox>
                </UiBox>

                {/* Extra fields for Nota Credito and Guia Remision inside the same card */}
                {formData.documentType === 'nota_credito' && (
                  <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"grid grid-cols-2 sm:grid-cols-4 gap-[8px] mt-[8px] pt-[8px]"}}>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Doc Modificado</UiLabel>
                      <UiSelect disabled={!isEditable} value={formData.codDocModificado || '01'} onChange={e => setFormData({...formData, codDocModificado: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}>
                        <option value="01">Factura</option>
                        <option value="03">Liquidación de Compra</option>
                      </UiSelect>
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Nro. Doc Modificado</UiLabel>
                      <UiInput disabled={!isEditable} type="text" required value={formData.numDocModificado || ''} onChange={e => setFormData({...formData, numDocModificado: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="001-001-000000123" />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Fecha Emisión Doc</UiLabel>
                      <UiInput disabled={!isEditable} type="date" required value={formData.fechaEmisionDocSustento || ''} onChange={e => setFormData({...formData, fechaEmisionDocSustento: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Motivo</UiLabel>
                      <UiInput disabled={!isEditable} type="text" required value={formData.motivo || ''} onChange={e => setFormData({...formData, motivo: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="Devolución" />
                    </UiBox>
                  </UiBox>
                )}

                {formData.documentType === 'guia_remision' && (
                  <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"grid grid-cols-2 sm:grid-cols-5 gap-[8px] mt-[8px] pt-[8px]"}}>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Placa</UiLabel>
                      <UiInput disabled={!isEditable} type="text" required value={formData.placa || ''} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="PBA1234" />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Motivo Traslado</UiLabel>
                      <UiInput disabled={!isEditable} type="text" required value={formData.motivoTraslado || ''} onChange={e => setFormData({...formData, motivoTraslado: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="Venta" />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Partida</UiLabel>
                      <UiInput disabled={!isEditable} type="text" required value={formData.dirPartida || ''} onChange={e => setFormData({...formData, dirPartida: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="Origen" />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Destino</UiLabel>
                      <UiInput disabled={!isEditable} type="text" value={formData.dirDestino || ''} onChange={e => setFormData({...formData, dirDestino: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="Destino" />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Ruta</UiLabel>
                      <UiInput disabled={!isEditable} type="text" value={formData.ruta || ''} onChange={e => setFormData({...formData, ruta: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="Quito - Guayaquil" />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Fecha Inicio</UiLabel>
                      <UiInput disabled={!isEditable} type="date" required value={formData.fechaIniTransporte || ''} onChange={e => setFormData({...formData, fechaIniTransporte: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Fecha Fin</UiLabel>
                      <UiInput disabled={!isEditable} type="date" required value={formData.fechaFinTransporte || ''} onChange={e => setFormData({...formData, fechaFinTransporte: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>RUC Transportista</UiLabel>
                      <UiInput disabled={!isEditable} type="text" value={formData.rucTransportista || ''} onChange={e => setFormData({...formData, rucTransportista: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="RUC" />
                    </UiBox>
                    <UiBox {...{"className":"sm:col-span-2"}}>
                      <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Nro. Doc Sustento</UiLabel>
                      <UiInput disabled={!isEditable} type="text" value={formData.numDocSustento || ''} onChange={e => setFormData({...formData, numDocSustento: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="001-001-000000123" />
                    </UiBox>
                  </UiBox>
                )}
              </UiBox>

              {/* Card 2: Product selector + Cart table */}
              {formData.documentType === 'retencion' ? (
                /* Retenciones Desglose Table */
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-[12px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"}})}>
                  <UiBox {...{"className":"flex justify-between items-center mb-[10px]"}}>
                    <UiBox {...{"className":"flex items-center gap-[6px]"}}>
                      <UiBox {...{"style":{"color":"var(--gray-11)"}}}>
                        <Layers size={14} />
                      </UiBox>
                      <UiHeading as="h3"  {...{"size":"1","weight":"bold"}}>Desglose de Retenciones</UiHeading>
                    </UiBox>
                    {isEditable && (
                      <UiButton type="button" onClick={handleAddRetencion} {...{"variant":"surface","color":"blue","size":"2","className":"flex items-center gap-[4px]"}}>
                        <Plus size={12} /> Añadir Fila
                      </UiButton>
                    )}
                  </UiBox>
                  <UiBox {...{"className":"space-y-[8px] max-h-[50vh] overflow-y-auto pr-1"}}>
                    {(formData.retenciones || []).map((ret, index) => (
                      <UiBox key={index} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-[8px] space-y-[8px] relative"})}>
                        {isEditable && (
                          <UiButton iconOnly type="button" onClick={() => handleRemoveRetencion(index)} {...{"variant":"surface","color":"red","className":"absolute top-2 right-2"}}>
                            <Trash2 size={12} />
                          </UiButton>
                        )}
                        <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-3 gap-[8px]"}}>
                          <UiBox>
                            <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Impuesto</UiLabel>
                            <UiSelect disabled={!isEditable} value={ret.codigo} onChange={(e) => handleRetencionChange(index, 'codigo', e.target.value)} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}>
                              <option value="1">Renta</option>
                              <option value="2">IVA</option>
                            </UiSelect>
                          </UiBox>
                          <UiBox {...{"className":"sm:col-span-2"}}>
                            <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Concepto / Código SRI</UiLabel>
                            <UiSelect disabled={!isEditable} value={ret.codigoRetencion} onChange={(e) => handleRetencionChange(index, 'codigoRetencion', e.target.value)} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}>
                              {ret.codigo === '1' ? 
                                SRI_RENTA_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>) :
                                SRI_IVA_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)
                              }
                            </UiSelect>
                          </UiBox>
                        </UiBox>
                        <UiBox {...{"className":"grid grid-cols-3 gap-[8px]"}}>
                          <UiBox>
                            <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Base Imponible ($)</UiLabel>
                            <UiInput disabled={!isEditable} type="number" step="0.01" value={ret.baseImponible || ''} onChange={(e) => handleRetencionChange(index, 'baseImponible', e.target.value)} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="0.00" />
                          </UiBox>
                          <UiBox>
                            <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Porcentaje (%)</UiLabel>
                            <UiInput disabled={!isEditable} type="number" step="0.1" value={ret.porcentajeRetener || ''} onChange={(e) => handleRetencionChange(index, 'porcentajeRetener', e.target.value)} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="0.0" />
                          </UiBox>
                          <UiBox>
                            <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Valor Retenido</UiLabel>
                            <UiBox  {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"px-[10px] py-[6px] text-center"})}>
                              ${Number(ret.valorRetenido || 0).toFixed(2)}
                            </UiBox>
                          </UiBox>
                        </UiBox>
                        <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"grid grid-cols-1 sm:grid-cols-3 gap-[8px] pt-[8px]"}}>
                          <UiBox>
                            <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Doc. Sustento</UiLabel>
                            <UiSelect disabled={!isEditable} value={ret.codDocSustento || '01'} onChange={(e) => handleRetencionChange(index, 'codDocSustento', e.target.value)} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}>
                              <option value="01">Factura</option>
                              <option value="03">Liquidación de Compra</option>
                              <option value="05">Nota de Débito</option>
                            </UiSelect>
                          </UiBox>
                          <UiBox {...{"className":"sm:col-span-2"}}>
                            <UiLabel {...mergeThemeProps({"size":"2","weight":"medium","className":"block mb-1.5"}, {}, {"color":"gray","highContrast":true})}>Número de Factura Sustento</UiLabel>
                            <UiInput disabled={!isEditable} type="text" value={ret.numDocSustento || ''} onChange={(e) => handleRetencionChange(index, 'numDocSustento', e.target.value)} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="001-001-000000045" />
                          </UiBox>
                        </UiBox>
                      </UiBox>
                    ))}
                    {(!formData.retenciones || formData.retenciones.length === 0) && (
                      <UiBox  {...{"className":"py-10 text-center italic"}}>
                        No hay filas de retención. Haz clic en "Añadir Fila" para comenzar.
                      </UiBox>
                    )}
                  </UiBox>
                </UiBox>
              ) : (
                /* Products Table & Search card */
                <UiBox {...mergeThemeProps({}, {}, {}, mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-[12px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"}}), (mobileTab === 'carrito' ? {"className":"block"} : {"className":"hidden lg:block"}))}>
                  {/* Encabezado claro de la sección de productos */}
                  <UiBox className="flex items-center justify-between mb-3">
                    <UiBox className="flex items-center gap-2">
                      <UiBox style={{ color: "var(--accent-11)" }}>
                        <ShoppingCart size={16} />
                      </UiBox>
                      <UiHeading as="h3" size="2" weight="bold">
                        Productos y Servicios
                      </UiHeading>
                    </UiBox>
                  </UiBox>
                  <UiBox {...{"className":"flex items-center gap-[5px] mb-[5px] flex-wrap"}}>
                    {/* Search Field */}
                    <UiBox {...{"className":"relative flex-1 min-w-[200px]"}}>
                      <UiInput
                        id="admin-product-search"
                        aria-invalid={validationIssues.some(issue => issue.target === 'items') && !(formData.items || []).length}
                        type="text" 
                        value={productSearchTerm}
                        onChange={e => setProductSearchTerm(e.target.value)}
                        placeholder="Buscar productos..."
                        iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
                        iconSuffix={productSearchTerm ? (
                          <button type="button" onClick={() => setProductSearchTerm('')} className="text-[var(--gray-10)] hover:text-[var(--gray-12)] p-0.5 cursor-pointer">
                            <X size={12} />
                          </button>
                        ) : undefined}
                        size="2"
                        color="gray"
                        className="w-full"
                      />
                      
                      {/* Search Results dropdown */}
                      {productSearchTerm.trim() !== '' && (
                        <UiBox 
                          style={{
                            borderRadius: 'var(--radius-3)',
                            border: '1px solid var(--gray-a6)',
                            backgroundColor: 'var(--color-panel-solid)',
                            boxShadow: 'var(--shadow-3)',
                            zIndex: 50
                          }}
                          className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto custom-scrollbar divide-y divide-[var(--gray-a4)]"
                        >
                          {products.filter(p => 
                            isSellable(p) && (
                              p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                              p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                              p.codigoBarras?.toLowerCase().includes(productSearchTerm.toLowerCase())
                            )
                          ).slice(0, 10).map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleAddProductToCart(p);
                                setProductSearchTerm('');
                              }}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-[var(--accent-3)] transition-colors flex items-center justify-between cursor-pointer bg-transparent border-none outline-none"
                            >
                              <div className="min-w-0 pr-3">
                                <div className="font-semibold text-xs text-[var(--gray-12)] truncate">{p.name}</div>
                                <div className="text-[11px] text-[var(--gray-10)] flex items-center gap-2 mt-0.5">
                                  {p.sku && <span className="font-mono">SKU: {p.sku}</span>}
                                  {p.codigoBarras && <span className="font-mono">• EAN: {p.codigoBarras}</span>}
                                  <span className="text-[var(--gray-9)]">• Stock: {Number(p.stock || 0)} u.</span>
                                </div>
                              </div>
                              <div className="font-mono font-bold text-xs text-[var(--blue-11)] shrink-0">
                                ${Number(p.price).toFixed(2)}
                              </div>
                            </button>
                          ))}
                          {products.filter(p => 
                            isSellable(p) && (
                              p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                              p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                              p.codigoBarras?.toLowerCase().includes(productSearchTerm.toLowerCase())
                            )
                          ).length === 0 && (
                            <div className="p-3 text-center text-xs text-[var(--gray-10)]">
                              No se encontraron productos o servicios activos.
                            </div>
                          )}
                        </UiBox>
                      )}
                    </UiBox>

                    {/* Search action buttons */}
                    {isEditable && (
                      <>
                        <UiButton
                          type="button"
                          onClick={() => {
                            setAdvSearchTerm(productSearchTerm);
                            setIsAdvancedSearchOpen(true);
                          }}
                          variant="surface"
                          color="blue"
                          title="Añadir Productos"
                          className="cursor-pointer"
                        >
                          <Search size={14} />
                          <UiText>Añadir</UiText>
                        </UiButton>
                        
                        <UiButton
                          type="button" 
                          onClick={() => {
                            setQuickAddProductFormData({
                              name: '', sku: '', codigoBarras: '', price: '', baseCost: '', ivaCategory: 15, stock: ''
                            });
                            setIsQuickAddProductOpen(true);
                          }}
                          variant="solid"
                          color="blue"
                          title="Crear Producto"
                          aria-label="Crear Producto"
                          className="cursor-pointer"
                        >
                          <Package size={14} />
                          <UiText>Crear</UiText>
                        </UiButton>
                      </>
                    )}
                  </UiBox>

                  {/* Actions: discount, clear cart */}
                  <UiBox {...{"className":"flex items-center gap-[8px] mb-[8px] flex-wrap"}}>
                    {/* General Discount */}
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"flex items-center gap-[6px] px-[8px] py-[4px] flex-wrap min-w-[280px]"}}>
                      <Tag size={12} {...{"style":{"color":"var(--blue-12)"},"className":"shrink-0"}} />
                      <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"shrink-0"}}>Descuento General:</UiText>
                      <UiSelect
                        disabled={!isEditable}
                        value={(() => {
                          if (!selectedGeneralDiscount) return '';
                          if (selectedGeneralDiscount.id === 'manual' || selectedGeneralDiscount.manual) {
                            if (selectedGeneralDiscount.tipo_valor === 'PORCENTAJE') return 'manual_porcentaje';
                            if (selectedGeneralDiscount.tipo_valor === 'MONTO_FIJO') return 'manual_monto';
                            if (selectedGeneralDiscount.tipo_valor === 'SIN_IVA') return 'manual_sin_iva';
                            return 'manual_porcentaje';
                          }
                          return selectedGeneralDiscount.id || '';
                        })()}
                        onChange={e => {
                          const discId = e.target.value;
                          if (!discId) {
                            setSelectedGeneralDiscount(null);
                            return;
                          }
                          if (discId === 'manual_porcentaje') {
                            setSelectedGeneralDiscount({
                              id: 'manual',
                              manual: true,
                              nombre: 'Descuento Manual (%)',
                              tipo_valor: 'PORCENTAJE',
                              valor: selectedGeneralDiscount?.tipo_valor === 'PORCENTAJE' ? (selectedGeneralDiscount.valor ?? 5) : 5,
                              activo: true
                            });
                            return;
                          }
                          if (discId === 'manual_monto') {
                            setSelectedGeneralDiscount({
                              id: 'manual',
                              manual: true,
                              nombre: 'Descuento Manual ($)',
                              tipo_valor: 'MONTO_FIJO',
                              valor: selectedGeneralDiscount?.tipo_valor === 'MONTO_FIJO' ? (selectedGeneralDiscount.valor ?? 5) : 5,
                              activo: true
                            });
                            return;
                          }
                          if (discId === 'manual_sin_iva') {
                            setSelectedGeneralDiscount({
                              id: 'manual',
                              manual: true,
                              nombre: 'Descuento Sin IVA',
                              tipo_valor: 'SIN_IVA',
                              valor: 0,
                              activo: true
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
                        {...{"size":"2","color":"gray","className":"cursor-pointer flex-1 min-w-[170px]"}}
                      >
                        <option value="">-- Sin Descuento --</option>
                        <option value="manual_porcentaje">Porcentaje (%)</option>
                        <option value="manual_monto">Monto Fijo ($)</option>
                        <option value="manual_sin_iva">Quitar IVA (Sin IVA)</option>
                        {getActiveDiscounts('VENTA').length > 0 && (
                          <optgroup label="Descuentos Predefinidos">
                            {getActiveDiscounts('VENTA').map(d => (
                              <option key={d.id} value={d.id}>
                                {d.nombre} ({d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : (d.tipo_valor === 'SIN_IVA' ? 'Sin IVA' : `$${d.valor}`)})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </UiSelect>

                      {(selectedGeneralDiscount?.id === 'manual' || selectedGeneralDiscount?.manual) && isEditable && (
                        <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in">
                          {selectedGeneralDiscount.tipo_valor === 'PORCENTAJE' && (
                            <div className="flex items-center gap-1">
                              <UiInput
                                size="1"
                                color="gray"
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={selectedGeneralDiscount.valor ?? ''}
                                onChange={e => {
                                  const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                                  setSelectedGeneralDiscount(prev => ({ ...prev, valor: val }));
                                }}
                                className="w-16 text-right font-mono"
                              />
                              <UiText size="1" color="gray" weight="bold">%</UiText>
                            </div>
                          )}

                          {selectedGeneralDiscount.tipo_valor === 'MONTO_FIJO' && (
                            <div className="flex items-center gap-1">
                              <UiText size="1" color="gray" weight="bold">$</UiText>
                              <UiInput
                                size="1"
                                color="gray"
                                type="number"
                                min="0"
                                step="0.01"
                                value={selectedGeneralDiscount.valor ?? ''}
                                onChange={e => {
                                  const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                                  setSelectedGeneralDiscount(prev => ({ ...prev, valor: val }));
                                }}
                                className="w-20 text-right font-mono"
                              />
                            </div>
                          )}

                          {selectedGeneralDiscount.tipo_valor === 'SIN_IVA' && (
                            <UiText size="1" color="red" weight="bold" className="text-xs px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50">
                              -100% IVA
                            </UiText>
                          )}
                        </div>
                      )}

                      {selectedGeneralDiscount && isEditable && (
                        <button
                          type="button"
                          onClick={() => setSelectedGeneralDiscount(null)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded cursor-pointer transition-colors"
                          title="Quitar descuento"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </UiBox>
                    
                    {/* Clear Cart */}
                    {isEditable && (formData.items || []).length > 0 && (
                      <UiButton
                        type="button"
                        onClick={handleClearItems}
                        {...{"variant":"soft","color":"red"}}
                      >
                        <Trash2 size={10} />
                        Limpiar
                      </UiButton>
                    )}
                  </UiBox>

                  {/* Cart Table */}
                  <UiBox {...{"className":"overflow-x-auto"}}>
                    {(formData.items || []).length > 0 ? (
                      <UiTable className="w-full whitespace-nowrap">
                        <UiTableHeader style={{ backgroundColor: "var(--gray-2)", color: "var(--gray-12)" }}>
                          <UiTableRow>
                            <UiTableHead className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-left">Código & Producto / Detalle</UiTableHead>
                            <UiTableHead justify="center" className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider w-24">Cant.</UiTableHead>
                            <UiTableHead justify="end" className="px-2 py-2 text-right text-xs font-bold uppercase tracking-wider w-24">P. Unit.</UiTableHead>
                            {isEditable && <UiTableHead justify="center" className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider w-20 hidden sm:table-cell">Dto.</UiTableHead>}
                            <UiTableHead justify="end" className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider w-28">Subtotal</UiTableHead>
                            {isEditable && <UiTableHead justify="center" className="px-1 py-2 text-center w-10"></UiTableHead>}
                          </UiTableRow>
                        </UiTableHeader>
                        <UiTableBody>
                          {(formData.items || []).map((item, index) => {
                            const calcLine = currentCartTotals?.items?.[index] || item;
                            const lineBase = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                            const lineDiscount = calcLine.monto_descuento_linea || 0;
                            const lineDiscountPvp = calcLine.monto_descuento_pvp || lineDiscount;
                            const subtotalLine = calcLine.subtotal_neto_linea ?? Math.max(0, lineBase - lineDiscount);
                            const hasDiscount = Boolean(
                              calcLine.id_descuento_aplicado || 
                              (calcLine.descuento_objeto && isDiscountScheduleActive(calcLine.descuento_objeto)) || 
                              lineDiscount > 0 || 
                              calcLine.discount_type === 'SIN_IVA'
                            );
                            return (
                              <UiTableRow key={index} className="hover:bg-[var(--gray-a2)] transition-colors">
                                {/* Producto: Código pequeño sin burbuja + Nombre del producto + Descripción editable al frente reducida */}
                                <UiTableCell className="px-3 py-1.5 text-left">
                                  {item.productId ? (
                                    <UiBox className="flex items-center gap-2 min-w-0">
                                      {/* Código de producto: números claros, font-sans */}
                                      <span 
                                        className="text-xs font-semibold text-[var(--gray-10)] shrink-0 select-none tracking-normal font-sans"
                                        title={item.sku ? `Código / SKU: ${item.sku}` : 'Sin SKU'}
                                      >
                                        {item.sku || 'S/C'}
                                      </span>

                                      {/* Nombre del producto */}
                                      <span 
                                        className="text-xs font-bold text-[var(--gray-12)] shrink-0 truncate max-w-[150px] font-sans" 
                                        title={item.name}
                                      >
                                        {item.name}
                                      </span>

                                      {/* Descripción editable reducida al frente */}
                                      {isEditable ? (
                                        <input
                                          aria-label={`Descripción en factura, línea ${index + 1}`}
                                          type="text"
                                          maxLength={300}
                                          value={item.invoiceDescription ?? ''}
                                          onChange={event => handleItemChange(index, 'invoiceDescription', event.target.value)}
                                          className="w-44 sm:w-56 max-w-[220px] h-7 text-xs px-2.5 rounded bg-[var(--gray-2)] hover:bg-[var(--gray-3)] focus:bg-[var(--color-panel-solid)] border border-transparent focus:border-[var(--blue-7)] text-[var(--gray-12)] font-sans outline-none transition-colors"
                                          title="Detalle o especificación para la factura (opcional)"
                                          placeholder="Detalle editable en factura..."
                                        />
                                      ) : (
                                        <span className="text-xs text-[var(--gray-11)] truncate block font-normal font-sans">
                                          {invoiceDescription(item)}
                                        </span>
                                      )}
                                    </UiBox>
                                  ) : (
                                    <UiSelect
                                      disabled={!isEditable}
                                      value={item.productId} 
                                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)} 
                                      size="2"
                                      className="w-full"
                                    >
                                      <option value="" disabled>Seleccionar...</option>
                                      {products.filter(isSellable).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} — ${Number(p.price).toFixed(2)}</option>
                                      ))}
                                    </UiSelect>
                                  )}
                                </UiTableCell>
                                
                                {/* Cantidad Stepper: Sin bordes, fondo sutil, fuente Inter semibold */}
                                <UiTableCell justify="center" className="px-2 py-1.5 text-center w-24">
                                  <div className="inline-flex items-center h-7 bg-[var(--gray-2)] rounded px-1">
                                    <button 
                                      type="button" 
                                      disabled={!isEditable} 
                                      onClick={() => {
                                        const q = parseInt(item.quantity) || 1;
                                        if (q > 1) handleItemChange(index, 'quantity', q - 1);
                                      }} 
                                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--gray-4)] text-[var(--gray-11)] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 border-none bg-transparent"
                                      title="Disminuir"
                                    >
                                      -
                                    </button>
                                    <input 
                                      disabled={!isEditable} 
                                      type="number" 
                                      value={item.quantity} 
                                      min="1" 
                                      onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} 
                                      className="w-8 text-center text-xs font-semibold text-[var(--gray-12)] bg-transparent border-none outline-none font-sans [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                    />
                                    <button 
                                      type="button" 
                                      disabled={!isEditable} 
                                      onClick={() => {
                                        handleItemChange(index, 'quantity', (parseInt(item.quantity) || 1) + 1);
                                      }} 
                                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--gray-4)] text-[var(--gray-11)] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 border-none bg-transparent"
                                      title="Aumentar"
                                    >
                                      +
                                    </button>
                                  </div>
                                </UiTableCell>

                                {/* Precio Unitario: Sin bordes, fondo sutil, fuente Inter semibold */}
                                <UiTableCell justify="end" className="px-2 py-1.5 text-right w-24">
                                  <div className="relative inline-flex items-center justify-end h-7 bg-[var(--gray-2)] rounded px-2">
                                    <span className="text-xs font-semibold text-[var(--gray-9)] pointer-events-none mr-0.5">$</span>
                                    <input 
                                      disabled={!isEditable} 
                                      type="number" 
                                      step="0.01" 
                                      required 
                                      value={item.price} 
                                      onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                                      className="w-16 text-right font-sans font-semibold text-xs text-[var(--gray-12)] bg-transparent border-none outline-none" 
                                    />
                                  </div>
                                </UiTableCell>

                                {/* Descuento: Sin bordes, fondo sutil, fuente Inter semibold */}
                                {isEditable && (
                                  <UiTableCell justify="center" className="px-2 py-1.5 text-center w-20 hidden sm:table-cell">
                                    {hasDiscount ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedLineItemForDiscount({ ...item, cartIndex: index })}
                                        className="inline-flex items-center justify-center gap-1 px-2 h-7 rounded text-xs font-semibold font-sans bg-[var(--red-3)] hover:bg-[var(--red-4)] text-[var(--red-11)] transition-colors cursor-pointer border-none"
                                        title="Modificar o quitar descuento"
                                      >
                                        <Percent size={11} />
                                        <span className="font-semibold font-sans">
                                          {calcLine.discount_type === 'SIN_IVA' || calcLine.descuento_objeto?.tipo_valor === 'SIN_IVA'
                                            ? `-IVA`
                                            : (calcLine.discount_type === 'PORCENTAJE' || calcLine.descuento_objeto?.tipo_valor === 'PORCENTAJE'
                                                ? `-${calcLine.discount_value || calcLine.descuento_objeto?.valor || 0}%`
                                                : `-$${lineDiscount.toFixed(2)}`)}
                                        </span>
                                      </button>
                                    ) : (
                                      <button 
                                        type="button"
                                        onClick={() => setSelectedLineItemForDiscount({ ...item, cartIndex: index })}
                                        className="h-7 px-2.5 flex items-center justify-center rounded bg-[var(--gray-2)] hover:bg-[var(--gray-3)] text-[var(--gray-11)] hover:text-[var(--gray-12)] transition-colors cursor-pointer border-none text-xs font-semibold font-sans"
                                        title="Asignar descuento a este ítem"
                                      >
                                        <span>0%</span>
                                      </button>
                                    )}
                                  </UiTableCell>
                                )}

                                {/* Subtotal: Alineado, fuente Inter semibold */}
                                <UiTableCell 
                                  justify="end"
                                  className="px-3 py-1.5 text-right font-sans font-semibold text-xs text-[var(--gray-12)] w-28"
                                >
                                  ${subtotalLine.toFixed(2)}
                                </UiTableCell>

                                {/* Eliminar: Sin bordes, fondo sutil rojo, w-7 h-7 */}
                                {isEditable && (
                                  <UiTableCell justify="center" className="px-1 py-1.5 text-center w-10">
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveItem(index)} 
                                      className="w-7 h-7 flex items-center justify-center rounded bg-[var(--red-3)] hover:bg-[var(--red-4)] text-[var(--red-11)] transition-colors cursor-pointer border-none mx-auto"
                                      title="Quitar este ítem de la factura"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </UiTableCell>
                                )}
                              </UiTableRow>
                            );
                          })}
                        </UiTableBody>
                      </UiTable>
                    ) : (
                      <UiBox  {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"py-8 text-center italic"}}>
                        No hay productos en el carrito. Utiliza el buscador.
                      </UiBox>
                    )}
                  </UiBox>
                </UiBox>
              )}

              {/* Card 3: Datos Adicionales del Comprobante (Plegable sutil / Opcional) */}
              <UiBox 
                style={{
                  borderRadius: "var(--radius-3)",
                  border: "1px solid var(--gray-a6)",
                  backgroundColor: "var(--color-panel-solid)",
                  color: "var(--gray-12)"
                }}
                className={`overflow-hidden ${mobileTab === 'cliente' ? 'block' : 'hidden lg:block'}`}
              >
                <button
                  type="button"
                  onClick={() => setShowAdditionalData(!showAdditionalData)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--gray-a2)] transition-colors cursor-pointer bg-transparent border-none"
                >
                  <UiBox className="flex items-center gap-2">
                    <FileText size={14} className="text-[var(--gray-10)]" />
                    <UiText size="2" weight="bold" color="gray" highContrast>
                      Datos Adicionales del Comprobante (Opcional)
                    </UiText>
                    {(formData.referencia || formData.description) && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--accent-3)] text-[var(--accent-11)]">
                        Con información
                      </span>
                    )}
                  </UiBox>
                  <UiBox className="flex items-center gap-1.5 text-xs text-[var(--gray-10)] font-medium">
                    <span>{showAdditionalData ? 'Ocultar' : 'Nro. Pedido, Notas'}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showAdditionalData ? 'rotate-180' : ''}`} />
                  </UiBox>
                </button>

                {showAdditionalData && (
                  <UiBox className="p-3.5 pt-2 border-t border-[var(--gray-a4)] bg-[var(--gray-1)] space-y-3">
                    <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <UiBox>
                        <UiLabel size="2" weight="medium" color="gray" highContrast className="block mb-1">
                          Nro. Pedido / Ref. Externa (Opcional)
                        </UiLabel>
                        <UiInput
                          disabled={!isEditable} 
                          type="text" 
                          value={formData.referencia || ''} 
                          onChange={e => setFormData({...formData, referencia: e.target.value})} 
                          size="2"
                          className="w-full"
                          color="gray"
                          placeholder="Ej. OC-1024, Proforma #45 (Identificador comercial)" 
                        />
                        <UiText as="p" size="1" color="gray" className="text-[11px] text-[var(--gray-10)] mt-1">
                          Número de orden de compra o pedido del cliente. No es para buscar productos.
                        </UiText>
                      </UiBox>

                      <UiBox>
                        <UiLabel size="2" weight="medium" color="gray" highContrast className="block mb-1">
                          Notas / Observaciones del Comprobante
                        </UiLabel>
                        <UiInput
                          disabled={!isEditable} 
                          type="text" 
                          value={formData.description || ''} 
                          onChange={e => setFormData({...formData, description: e.target.value})} 
                          size="2"
                          className="w-full"
                          color="gray"
                          placeholder="Notas o condiciones que se imprimirán en el documento..." 
                        />
                        <UiText as="p" size="1" color="gray" className="text-[11px] text-[var(--gray-10)] mt-1">
                          Información adicional para el cliente en el RIDE o factura.
                        </UiText>
                      </UiBox>
                    </UiBox>
                  </UiBox>
                )}
              </UiBox>
            </UiBox>

            {/* Right Column: lg:col-span-4 */}
            <UiBox {...mergeThemeProps({"className":"col-span-12 lg:col-span-4 space-y-[12px]"}, {}, (mobileTab === 'pago' ? {"className":"block"} : {"className":"hidden lg:block"}))}>
              
              {/* Totales Card */}
              <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-[12px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"}})}>
                <UiBox {...{"className":"flex items-center gap-[6px] mb-[10px]"}}>
                  <UiBox {...{"style":{"color":"var(--gray-11)"}}}>
                    <Calculator size={14} />
                  </UiBox>
                  <UiHeading as="h3"  {...{"size":"1","weight":"bold"}}>Resumen e Impuestos</UiHeading>
                </UiBox>

                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)","color":"var(--gray-12)"},"className":"p-[10px] space-y-[6px]"})}>
                  <UiBox {...{"className":"flex justify-between"}}>
                    <UiText {...{"weight":"bold"}}>Subtotal bruto:</UiText>
                    <UiText {...{"weight":"bold"}}>
                      ${formData.documentType === 'retencion' 
                        ? Number(formData.baseImponible).toFixed(2)
                        : (currentCartTotals?.subtotalBruto ?? (formData.items || []).reduce((a, it) => a + (parseFloat(it.price)||0)*(parseInt(it.quantity)||1), 0)).toFixed(2)
                      }
                    </UiText>
                  </UiBox>

                  {formData.documentType !== 'retencion' && (
                    <>
                      {/* Descuento por ítem */}
                      {(currentCartTotals?.descuentosProducto > 0 || (currentCartTotals?.descuentosProductoPvp > 0)) && (
                        <UiBox {...{"style":{"color":"var(--red-11)"},"className":"flex justify-between"}}>
                          <UiText {...{"weight":"bold"}}>Dto. por ítem:</UiText>
                          <UiText {...{"weight":"bold"}}>-${(currentCartTotals.descuentosProductoPvp || currentCartTotals.descuentosProducto).toFixed(2)}</UiText>
                        </UiBox>
                      )}
                      {/* Descuento general */}
                      {currentCartTotals?.descuentoVenta > 0 && (
                        <UiBox {...{"style":{"color":"var(--red-11)"},"className":"flex justify-between"}}>
                          <UiText {...{"weight":"bold"}}>Dto. general:</UiText>
                          <UiText {...{"weight":"bold"}}>-${currentCartTotals.descuentoVenta.toFixed(2)}</UiText>
                        </UiBox>
                      )}
                      
                      {/* Base imponible */}
                      <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-[4px]"}}>
                        <UiText {...{"weight":"bold"}}>Base imponible:</UiText>
                        <UiText {...{"weight":"bold"}}>${Number(formData.baseImponible).toFixed(2)}</UiText>
                      </UiBox>

                      {/* IVA static display */}
                      <UiBox {...{"className":"flex justify-between"}}>
                        <UiText {...{"weight":"bold"}}>IVA ({formData.ivaPorcentaje}%):</UiText>
                        <UiText {...{"weight":"bold"}}>${Number(formData.ivaValor).toFixed(2)}</UiText>
                      </UiBox>
                    </>
                  )}

                  {formData.documentType === 'retencion' && (
                    <UiBox {...{"style":{"color":"var(--amber-11)"},"className":"flex justify-between"}}>
                      <UiText {...{"weight":"bold"}}>Total Retenido:</UiText>
                      <UiText {...{"weight":"bold"}}>${Number(formData.total).toFixed(2)}</UiText>
                    </UiBox>
                  )}

                  <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center pt-[8px]"}}>
                    <UiText  {...{"weight":"bold","size":"3"}}>TOTAL:</UiText>
                    <UiText style={{ color: '#1C40F2' }} {...{"weight":"bold","size":"6"}}>${Number(formData.total).toFixed(2)}</UiText>
                  </UiBox>
                </UiBox>
              </UiBox>

              {/* Payments Card (Omitted for retencion) */}
              {formData.documentType !== 'retencion' && (
                <UiBox id="admin-payment-section" tabIndex={-1} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-[12px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"}})}>
                  <UiBox {...{"className":"flex items-center gap-[6px] mb-[10px]"}}>
                    <UiBox {...{"style":{"color":"var(--gray-11)"}}}>
                      <CreditCard size={14} />
                    </UiBox>
                    <UiHeading as="h3"  {...{"size":"1","weight":"bold"}}>Medios de Pago</UiHeading>
                  </UiBox>

                  <UiBox {...{"className":"grid grid-cols-4 gap-[8px] mb-[10px]"}}>
                    {[
                      { id: 'efectivo', label: 'Efectivo', icon: DollarSign, key: 'efectivo' },
                      { id: 'transferencia', label: 'Transf.', icon: RefreshCw, key: 'transferencia' },
                      { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, key: 'tarjeta' },
                      { id: 'cruce_cuentas', label: 'Crédito', icon: User, key: 'cruce_cuentas' }
                    ].map(m => {
                      const isSelected = activePayments[m.key];
                      const isClientSelected = !!formData.thirdPartyId;
                      return (
                        <UiButton
                          key={m.id}
                          type="button"
                          disabled={!isClientSelected}
                          onClick={() => {
                            if (!isClientSelected) return;
                            setActivePayments(prev => {
                              const updated = { ...prev, [m.key]: !prev[m.key] };
                              if (!updated[m.key]) {
                                setPayments(p => ({ ...p, [m.key]: 0 }));
                              } else {
                                const total = Number(formData.total) || 0;
                                const ef = m.key === 'efectivo' ? 0 : Number(payments.efectivo) || 0;
                                const tr = m.key === 'transferencia' ? 0 : Number(payments.transferencia) || 0;
                                const tj = m.key === 'tarjeta' ? 0 : Number(payments.tarjeta) || 0;
                                const cr = m.key === 'cruce_cuentas' ? 0 : Number(payments.cruce_cuentas) || 0;
                                const remaining = Math.max(0, total - ef - tr - tj - cr);
                                setPayments(p => ({ ...p, [m.key]: remaining > 0 ? remaining.toFixed(2) : '' }));
                                if (m.key === 'cruce_cuentas') {
                                  const hasCred = matchedTercero?.hasCredit || (Number(matchedTercero?.creditLimit || matchedTercero?.limiteCredito || 0) > 0);
                                  if (!hasCred) {
                                    setIsCreditSetupOpen(true);
                                  } else {
                                    setIsCreditModalOpen(true);
                                  }
                                }
                              }
                              return updated;
                            });
                          }}
                          {...mergeThemeProps({"variant":"outline","className":"flex flex-col items-center justify-center gap-[6px]"}, {}, (!isClientSelected ? {"variant":"soft","color":"gray","className":"opacity-40 cursor-not-allowed"} : (isSelected ? {"variant":"solid","color":"blue"} : {"variant":"soft","color":"gray"})))}
                        >
                          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"w-10 h-10 flex items-center justify-center"}, {}, (!isClientSelected ? {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"}} : (isSelected ? {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"}} : {"style":{"backgroundColor":"var(--blue-9)","color":"var(--color-background)"}})))}>
                            <m.icon size={18} />
                          </UiBox>
                          <UiText {...{"size":"1","weight":"bold"}}>{m.label}</UiText>
                        </UiButton>
                      );
                    })}
                  </UiBox>

                  {/* Input Fields for Active Payments (very compact) */}
                  <UiBox {...{"className":"space-y-[8px]"}}>
                    {activePayments.efectivo && (
                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-[8px]"})}>
                        <UiBox {...{"className":"flex justify-between items-center mb-[4px]"}}>
                          <UiText  {...{"weight":"bold"}}>Efectivo</UiText>
                          <UiText  {...{"size":"1"}}>Recibido</UiText>
                        </UiBox>
                        <UiBox className="relative">
                          <UiInput
                            disabled={!isEditable}
                            type="number"
                            step="0.01"
                            value={payments.efectivo || ''}
                            onChange={e => setPayments(prev => ({ ...prev, efectivo: e.target.value }))}
                            iconPrefix={<span className="text-[var(--gray-10)] font-semibold text-xs">$</span>}
                            size="2"
                            color="gray"
                            className="w-full"
                            placeholder="0.00"
                          />
                        </UiBox>
                      </UiBox>
                    )}

                    {activePayments.transferencia && (
                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-[8px]"})}>
                        <UiBox {...{"className":"flex justify-between items-center mb-[4px]"}}>
                          <UiText  {...{"weight":"bold"}}>Transferencia</UiText>
                          <UiText  {...{"size":"1"}}>Monto</UiText>
                        </UiBox>
                        <UiBox {...{"className":"space-y-[6px]"}}>
                          <UiBox className="relative">
                            <UiInput
                              disabled={!isEditable}
                              type="number"
                              step="0.01"
                              value={payments.transferencia || ''}
                              onChange={e => setPayments(prev => ({ ...prev, transferencia: e.target.value }))}
                              iconPrefix={<span className="text-[var(--gray-10)] font-semibold text-xs">$</span>}
                              size="2"
                              color="gray"
                              className="w-full"
                              placeholder="0.00"
                            />
                          </UiBox>
                          <UiSelect
                            disabled={!isEditable}
                            value={payments.transferenciaBankId || ''}
                            onChange={e => {
                              const selBank = bankAccounts.find(b => b.id === e.target.value);
                              setPayments(prev => ({
                                ...prev,
                                transferenciaBankId: e.target.value,
                                transferenciaRef: prev.transferenciaRef || (selBank ? `${selBank.banco || selBank.nombre} - ${selBank.numeroCuenta || ''}` : '')
                              }));
                            }}
                            {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                          >
                            <option value="">-- Cuenta Bancaria Destino --</option>
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.banco || b.nombre} ({b.tipoCuenta || 'Cta'} {b.numeroCuenta || ''}) - Saldo: ${Number(b.saldoActual || 0).toFixed(2)}
                              </option>
                            ))}
                          </UiSelect>
                          <UiInput disabled={!isEditable} type="text" value={payments.transferenciaRef || ''} onChange={e => setPayments(prev => ({ ...prev, transferenciaRef: e.target.value }))} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="Banco / Referencia" />
                        </UiBox>
                      </UiBox>
                    )}

                    {activePayments.tarjeta && (
                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-[8px]"})}>
                        <UiBox {...{"className":"flex justify-between items-center mb-[4px]"}}>
                          <UiText  {...{"weight":"bold"}}>Tarjeta</UiText>
                          <UiText  {...{"size":"1"}}>Monto</UiText>
                        </UiBox>
                        <UiBox {...{"className":"space-y-[6px]"}}>
                          <UiBox className="relative">
                            <UiInput
                              disabled={!isEditable}
                              type="number"
                              step="0.01"
                              value={payments.tarjeta || ''}
                              onChange={e => setPayments(prev => ({ ...prev, tarjeta: e.target.value }))}
                              iconPrefix={<span className="text-[var(--gray-10)] font-semibold text-xs">$</span>}
                              size="2"
                              color="gray"
                              className="w-full"
                              placeholder="0.00"
                            />
                          </UiBox>
                          <UiInput disabled={!isEditable} type="text" value={payments.tarjetaRef || ''} onChange={e => setPayments(prev => ({ ...prev, tarjetaRef: e.target.value }))} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} placeholder="Nro Lote / Autorización" />
                        </UiBox>
                      </UiBox>
                    )}

                    {activePayments.cruce_cuentas && (
                      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-[8px]"})}>
                        <UiBox {...{"className":"flex justify-between items-center mb-[4px]"}}>
                          <UiText  {...{"weight":"bold"}}>Crédito / CxC</UiText>
                          <UiText  {...{"size":"1"}}>Monto</UiText>
                        </UiBox>
                        <UiBox {...{"className":"space-y-[6px]"}}>
                          <UiBox className="relative">
                            <UiInput
                              disabled={!isEditable}
                              type="number"
                              step="0.01"
                              value={payments.cruce_cuentas || ''}
                              onChange={e => setPayments(prev => ({ ...prev, cruce_cuentas: e.target.value }))}
                              iconPrefix={<span className="text-[var(--gray-10)] font-semibold text-xs">$</span>}
                              size="2"
                              color="gray"
                              className="w-full"
                              placeholder="0.00"
                            />
                          </UiBox>
                          <UiButton type="button" onClick={() => setIsCreditModalOpen(true)} {...mergeThemeProps({"variant":"solid","size":"2","color":"amber","className":"w-full"})}>
                            Configurar Plazo de Crédito
                          </UiButton>
                        </UiBox>
                      </UiBox>
                    )}
                  </UiBox>

                  {/* Vuelto and Cubierto metrics */}
                  {(() => {
                    const totalNum = Number(formData.total) || 0;
                    const sum = (Number(payments.efectivo) || 0) + (Number(payments.transferencia) || 0) + (Number(payments.tarjeta) || 0) + (Number(payments.cruce_cuentas) || 0);
                    const cambio = Math.max(0, sum - totalNum);
                    return (
                      <UiBox {...{"className":"mt-[8px] grid grid-cols-2 gap-[8px]"}}>
                        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-[8px] text-center"}, {}, (sum >= totalNum - 0.01 ? {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-12)"}} : {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-12)"}}))}>
                          <UiText  {...{"size":"1","weight":"bold","className":"block"}}>Cambio / Vuelto</UiText>
                          <UiText {...{"size":"3","weight":"bold"}}>${cambio.toFixed(2)}</UiText>
                        </UiBox>
                        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-[8px] text-center flex items-center justify-center"}, {}, {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}})}>
                          <UiBox>
                            <UiText as="p"  {...{"size":"1","weight":"bold"}}>Cubierto</UiText>
                            <UiText as="p" {...{"size":"3","weight":"bold"}}>${sum.toFixed(2)} / ${totalNum.toFixed(2)}</UiText>
                          </UiBox>
                        </UiBox>
                      </UiBox>
                    );
                  })()}

                  {/* Payment Warning Banner */}
                  {(() => {
                    const totalNum = Number(formData.total) || 0;
                    const sum = (Number(payments.efectivo) || 0) + (Number(payments.transferencia) || 0) + (Number(payments.tarjeta) || 0) + (Number(payments.cruce_cuentas) || 0);
                    if (sum === 0 && totalNum > 0) {
                      return (
                        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-12)"},"className":"mt-[6px] p-[8px] flex items-center gap-[4px]"})}>
                          <AlertTriangle size={12} {...{"style":{"color":"var(--red-11)"},"className":"shrink-0"}} />
                          <UiText>Falta seleccionar forma de pago.</UiText>
                        </UiBox>
                      );
                    }
                    if (sum < totalNum - 0.01) {
                      return (
                        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--amber-3)","color":"var(--amber-12)"},"className":"mt-[6px] p-[8px] flex items-center gap-[4px]"})}>
                          <AlertTriangle size={12} {...{"style":{"color":"var(--amber-11)"},"className":"shrink-0"}} />
                          <UiText>Pago incompleto: Falta ${ (totalNum - sum).toFixed(2) }.</UiText>
                        </UiBox>
                      );
                    }
                    return null;
                  })()}
                </UiBox>
              )}

              {/* Sequential & Final Actions Card */}
              <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-[12px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"}})}>
                <UiBox {...{"className":"flex items-center gap-[6px] mb-[10px]"}}>
                  <UiBox {...{"style":{"color":"var(--gray-11)"}}}>
                    <Tag size={14} />
                  </UiBox>
                  <UiHeading as="h3"  {...{"size":"1","weight":"bold"}}>
                    Emisión de Comprobante
                  </UiHeading>
                </UiBox>

                {/* Sequencial preview eliminated per request */}

                {/* Save & Emission buttons */}
                <UiBox {...{"className":"space-y-[6px]"}}>
                  {isEditable ? (
                    <>
                      {/* Save Draft (Guardar Borrador) */}
                      <UiButton
                        type="button" 
                        onClick={handleSave} 
                        disabled={isUploading || isEmitting || isSaving}
                        {...mergeThemeProps({"variant":"surface","color":"blue","className":"w-full"}, {}, (isUploading || isEmitting ? {"className":"opacity-50 cursor-not-allowed"} : {}))}
                      >
                        <CheckCircle2 size={12} />
                        <UiText>Guardar Borrador</UiText>
                      </UiButton>

                      {/* Emit SRI (Factura Electrónica) */}
                      {formData.type === 'ingreso' && formData.documentType !== 'nota_venta' && (
                        <UiButton
                          type="button" 
                          onClick={handleEmitirSRI} 
                          disabled={isUploading || isEmitting || isSaving}
                          {...mergeThemeProps({"variant":"solid","color":"blue","className":"w-full"}, {}, (isUploading || isEmitting ? {"className":"opacity-50 cursor-not-allowed"} : {}))}
                        >
                          <Sparkles size={12} />
                          <UiText>Emitir Factura Electrónica (SRI)</UiText>
                        </UiButton>
                      )}

                      {/* Register Nota de Venta / Recibo */}
                      {formData.type === 'ingreso' && formData.documentType === 'nota_venta' && (
                        <UiButton
                          type="button" 
                          onClick={() => handleSave({ isFinalizingNotaVenta: true })} 
                          disabled={isUploading || isEmitting || isSaving}
                          {...mergeThemeProps({"variant":"solid","color":"blue","className":"w-full"}, {}, (isUploading || isEmitting ? {"className":"opacity-50 cursor-not-allowed"} : {}))}
                        >
                          <CheckCircle2 size={12} />
                          <UiText>Registrar Nota de Venta</UiText>
                        </UiButton>
                      )}

                      {/* Register Purchase / Gasto */}
                      {formData.type !== 'ingreso' && (
                        <UiButton
                          type="button" 
                          onClick={handleSave} 
                          disabled={isUploading || isEmitting || isSaving}
                          {...mergeThemeProps({"variant":"solid","color":"blue","className":"w-full"}, {}, (isUploading || isEmitting ? {"className":"opacity-50 cursor-not-allowed"} : {}))}
                        >
                          <CheckCircle2 size={12} />
                          <UiText>Registrar Compra / Gasto</UiText>
                        </UiButton>
                      )}
                    </>
                  ) : (
                    <UiBox  {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-[6px] flex items-center justify-center gap-1.5"}, {}, {"style":{"backgroundColor":"var(--green-3)"}})}>
                      <CheckCircle2 size={12} {...{"className":"shrink-0"}} />
                      <UiText>{isAuthorized ? 'Autorizado / registrado con éxito.' : isAnulado ? 'Documento anulado.' : 'Comprobante reservado. Consulte su estado en el SRI.'}</UiText>
                    </UiBox>
                  )}
                </UiBox>
              </UiBox>

              {/* SRI Live Console */}
              {(isEmitting || sriLogs.length > 0) && (
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-12)","border":"1px solid var(--gray-a6)","color":"var(--color-background)","fontFamily":"var(--code-font-family)"},"className":"p-[4px] space-y-[2px] max-h-[120px] overflow-y-auto"}}>
                  <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","color":"var(--gray-11)"},"className":"flex items-center gap-[3px] pb-[2px]"}}>
                    <Terminal size={10} />
                    <UiText>Consola SRI (Ecuador)</UiText>
                  </UiBox>
                  <UiBox {...{"className":"space-y-[1px]"}}>
                    {sriLogs.map((log, i) => (
                      <UiBox key={i} {...{"className":"flex gap-[5px] items-start"}}>
                        <UiText {...{"color":"gray","className":"shrink-0"}}>{log.time}</UiText>
                        <UiText {...(log.status === 'error' ? {"color":"red","weight":"bold"} : (log.status === 'success' ? {"color":"green"} : {"color":"gray"}))}>{log.message}</UiText>
                      </UiBox>
                    ))}
                  </UiBox>
                </UiBox>
              )}
            </UiBox>
          </UiBox>
          </UiBox>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PASO 2: IMPRESIÓN DEL DOCUMENTO                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <UiBox className="grid grid-cols-12 gap-[14px] animate-in fade-in slide-in-from-bottom duration-300">
            {/* Left Column (col-span-12 lg:col-span-7): Estado de Emisión, Correos y Acciones */}
            <UiBox className="col-span-12 lg:col-span-7 space-y-[12px]">
                
                {/* 1. HERO EMISSION CONFIRMATION CARD */}
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"p-4 space-y-3 text-center sm:text-left"})}>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--green-3)', color: 'var(--green-11)', border: '1px solid var(--green-6)' }}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="space-y-1 flex-1">
                      <UiHeading as="h3" size="3" weight="bold" style={{ color: 'var(--gray-12)' }}>
                        {docConfirmationTitle}
                      </UiHeading>
                      <UiText as="p" size="1" style={{ color: 'var(--gray-11)' }}>
                        El comprobante ha sido registrado y asentado en el sistema comercial e inventario.
                      </UiText>
                    </div>
                  </div>

                  {/* Summary key badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t" style={{ borderColor: 'var(--gray-a4)' }}>
                    <div className="p-2 rounded bg-[var(--gray-2)] text-left">
                      <UiText as="p" size="1" weight="medium" style={{ color: 'var(--gray-10)' }}>Comprobante</UiText>
                      <UiText as="p" size="2" weight="bold" className="font-mono" style={{ color: 'var(--blue-11)' }}>
                        {formData.documentNumber || (formData.secuencial ? `001-001-${String(formData.secuencial).padStart(9, '0')}` : 'En proceso')}
                      </UiText>
                    </div>
                    <div className="p-2 rounded bg-[var(--gray-2)] text-left">
                      <UiText as="p" size="1" weight="medium" style={{ color: 'var(--gray-10)' }}>Cliente</UiText>
                      <UiText as="p" size="1" weight="bold" className="truncate" style={{ color: 'var(--gray-12)' }} title={matchedTercero?.name}>
                        {matchedTercero?.name || 'CONSUMIDOR FINAL'}
                      </UiText>
                      <UiText as="p" size="1" className="font-mono text-[10px]" style={{ color: 'var(--gray-10)' }}>
                        {matchedTercero?.ruc || '9999999999999'}
                      </UiText>
                    </div>
                    <div className="p-2 rounded bg-[var(--gray-2)] text-left">
                      <UiText as="p" size="1" weight="medium" style={{ color: 'var(--gray-10)' }}>Total Facturado</UiText>
                      <UiText as="p" size="3" weight="bold" className="font-semibold" style={{ color: 'var(--green-11)' }}>
                        ${Number(formData.total || 0).toFixed(2)}
                      </UiText>
                    </div>
                  </div>

                  {formData.claveAcceso && (
                    <div className="p-2 rounded text-left break-all font-mono text-[11px]" style={{ backgroundColor: 'var(--gray-2)', border: '1px solid var(--gray-a4)', color: 'var(--gray-12)' }}>
                      <span className="font-semibold block mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--gray-11)' }}>Clave de Acceso SRI (49 dígitos):</span>
                      {formData.claveAcceso}
                    </div>
                  )}
                </UiBox>

                {/* 2. CARD: ESTADO DE ENVÍO POR CORREO ELECTRÓNICO */}
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"p-4 space-y-3"})}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail size={15} style={{ color: 'var(--blue-11)' }} />
                      <UiHeading as="h4" size="2" weight="bold">Notificación por Correo Electrónico</UiHeading>
                    </div>
                    {emailSending && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--blue-11)] font-medium">
                        <RefreshCw size={12} className="animate-spin" /> Enviando...
                      </span>
                    )}
                  </div>

                  {/* Fila: Cliente */}
                  <div className="p-2.5 rounded text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" style={{ backgroundColor: 'var(--gray-2)', border: '1px solid var(--gray-a4)' }}>
                    <div className="flex items-start gap-2">
                      {emailSending ? (
                        <RefreshCw size={14} className="animate-spin text-[var(--blue-11)] shrink-0 mt-0.5" />
                      ) : clientSent ? (
                        <CheckCircle2 size={14} className="text-[var(--green-11)] shrink-0 mt-0.5" />
                      ) : clientFailed ? (
                        <AlertTriangle size={14} className="text-[var(--red-11)] shrink-0 mt-0.5" />
                      ) : (
                        <Clock size={14} className="text-[var(--gray-10)] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-[var(--gray-12)]">Copia para el Cliente:</div>
                        <div className="text-[var(--gray-11)] text-[11.5px]">
                          {emailSending ? (
                            'Enviando documento al correo del cliente...'
                          ) : clientSent ? (
                            <span>Enviado exitosamente a <strong className="text-[var(--gray-12)]">{clientAddress}</strong></span>
                          ) : clientFailed ? (
                            <span className="text-[var(--red-11)]">No se pudo entregar: {emailDeliveryData.client?.error || 'Rechazo SMTP'}</span>
                          ) : clientAddress ? (
                            <span>Listo para enviar a: <strong className="text-[var(--gray-12)]">{clientAddress}</strong></span>
                          ) : (
                            <span>El cliente no tiene correo registrado en su ficha.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!emailSending && (clientFailed || !clientSent) && clientAddress && (
                      <UiButton
                        type="button"
                        size="1"
                        variant="surface"
                        color="blue"
                        className="shrink-0 text-xs py-1 px-2.5"
                        onClick={() => {
                          const receiver = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
                          enviarCorreoComprobante(formData, receiver, sriConfig, clientAddress);
                        }}
                      >
                        <RefreshCw size={11} /> Reintentar
                      </UiButton>
                    )}
                  </div>

                  {/* Fila: Emisor (Copia de Respaldo) */}
                  <div className="p-2.5 rounded text-xs flex items-center justify-between gap-2" style={{ backgroundColor: 'var(--gray-2)', border: '1px solid var(--gray-a4)' }}>
                    <div className="flex items-start gap-2">
                      {emailSending ? (
                        <RefreshCw size={14} className="animate-spin text-[var(--blue-11)] shrink-0 mt-0.5" />
                      ) : emitterSent ? (
                        <CheckCircle2 size={14} className="text-[var(--green-11)] shrink-0 mt-0.5" />
                      ) : emitterFailed ? (
                        <AlertTriangle size={14} className="text-[var(--amber-11)] shrink-0 mt-0.5" />
                      ) : (
                        <Clock size={14} className="text-[var(--gray-10)] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-[var(--gray-12)]">Copia de Respaldo al Emisor:</div>
                        <div className="text-[var(--gray-11)] text-[11.5px]">
                          {emailSending ? (
                            'Enviando copia de respaldo a tu correo...'
                          ) : emitterSent ? (
                            <span>Respaldo enviado a <strong className="text-[var(--gray-12)]">{emitterAddress}</strong></span>
                          ) : emitterFailed ? (
                            <span className="text-[var(--amber-11)]">Copia no enviada: {emailDeliveryData.emitter?.error || 'Revisa servidor SMTP'}</span>
                          ) : !isSmtpConfigured ? (
                            <span className="text-[var(--amber-11)]">Configura el servidor SMTP en Ajustes para recibir copias automáticas.</span>
                          ) : !isSmtpActive ? (
                            <span className="text-[var(--amber-11)]">Envío de correo desactivado en Ajustes.</span>
                          ) : (
                            <span>Copia configurada para: <strong className="text-[var(--gray-12)]">{emitterAddress}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input rápido para enviar o reenviar a cualquier correo */}
                  <div className="pt-2 border-t flex flex-col sm:flex-row items-center gap-2" style={{ borderColor: 'var(--gray-a4)' }}>
                    <UiInput 
                      type="email"
                      value={customClientEmail} 
                      onChange={e => setCustomClientEmail(e.target.value)}
                      placeholder="Enviar copia a otro correo (ej: cliente@correo.com)"
                      className="w-full sm:flex-1 h-8 text-xs"
                    />
                    <UiButton
                      type="button"
                      variant="solid"
                      color="blue"
                      className="w-full sm:w-auto h-8 px-3 text-xs flex items-center justify-center gap-1.5 shrink-0"
                      disabled={emailSending || !customClientEmail || !customClientEmail.includes('@')}
                      onClick={() => {
                        const receiver = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
                        enviarCorreoComprobante(formData, receiver, sriConfig, customClientEmail);
                      }}
                    >
                      <Send size={12} />
                      <UiText>Enviar Correo</UiText>
                    </UiButton>
                  </div>
                </UiBox>

                {/* 3. CARD: ACCIONES DE IMPRESIÓN Y DESCARGAS */}
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"p-4 space-y-3"})}>
                  <div className="flex items-center gap-2">
                    <Printer size={15} style={{ color: 'var(--blue-11)' }} />
                    <UiHeading as="h4" size="2" weight="bold">Impresión Directa y Descargas</UiHeading>
                  </div>

                  {/* BOTÓN DESTACADO: IMPRESIÓN DIRECTA */}
                  <UiButton
                    type="button"
                    onClick={() => handleDirectPrint(printFormat || 'ride')}
                    variant="solid"
                    color="blue"
                    className="w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <Printer size={16} />
                    <UiText>Impresión Directa ({printFormat === 'ticket' ? 'Ticket 80mm' : 'Hoja A4'})</UiText>
                  </UiButton>

                  {/* BOTONES SECUNDARIOS DE FORMATO */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {/* Imprimir Ticket 80mm */}
                    <UiButton
                      type="button" 
                      onClick={() => handleDirectPrint('ticket')}
                      variant="surface"
                      color="blue"
                      className="w-full flex items-center justify-center gap-2 h-9 text-xs"
                    >
                      <Calculator size={13} />
                      <UiText>Imprimir Ticket (80mm)</UiText>
                    </UiButton>

                    {/* Imprimir RIDE A4 */}
                    <UiButton
                      type="button" 
                      onClick={() => handleDirectPrint('ride')}
                      variant="surface"
                      color="blue"
                      className="w-full flex items-center justify-center gap-2 h-9 text-xs"
                    >
                      <FileText size={13} />
                      <UiText>Imprimir RIDE / Hoja (A4)</UiText>
                    </UiButton>

                    {/* Download XML (si es factura electrónica autorizada) */}
                    {formData.claveAcceso && (
                      <UiButton
                        type="button" 
                        onClick={downloadXMLFile}
                        variant="surface"
                        color="gray"
                        className="w-full sm:col-span-2 flex items-center justify-center gap-2 h-9 text-xs"
                      >
                        <Download size={13} />
                        <UiText>Descargar Archivo XML Autorizado</UiText>
                      </UiButton>
                    )}
                  </div>

                  {/* Botones de navegación adicionales */}
                  <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--gray-a4)' }}>
                    <UiButton
                      type="button"
                      variant="surface"
                      color="blue"
                      className="flex-1 h-9 text-xs flex items-center justify-center gap-1.5"
                      onClick={() => {
                        stableIdRef.current = crypto.randomUUID();
                        setFormData({
                          id: stableIdRef.current,
                          type: 'ingreso',
                          documentType: formData.documentType || 'factura',
                          documentNumber: '',
                          date: getEcuadorDateString(new Date()),
                          time: getEcuadorTimeString(new Date()),
                          items: [],
                          subtotal: 0,
                          baseImponible: 0,
                          ivaPorcentaje: 15,
                          ivaValor: 0,
                          total: 0,
                          thirdPartyId: '',
                          thirdPartyName: '',
                          thirdPartyRuc: '',
                          paymentMethod: 'efectivo',
                          paymentStatus: 'pagado',
                          sriStatus: 'borrador',
                          category: 'ventas',
                          claveAcceso: '',
                          xml: '',
                          xmlAutorizado: '',
                        });
                        setPayments({
                          efectivo: 0,
                          transferencia: 0,
                          tarjeta: 0,
                          cruce_cuentas: 0,
                          transferenciaRef: '',
                          transferenciaBankId: '',
                          tarjetaRef: '',
                          cruceRef: ''
                        });
                        setEmailDeliveryResult(null);
                        setPrintTx(null);
                        setCurrentStep(1);
                      }}
                    >
                      <Plus size={13} />
                      <UiText>Nueva Venta / Emisión</UiText>
                    </UiButton>

                    <UiButton
                      type="button"
                      variant="solid"
                      color="blue"
                      className="flex-1 h-9 text-xs flex items-center justify-center gap-1.5"
                      onClick={closeTransaction}
                    >
                      <Check size={13} />
                      <UiText>Terminar y Salir</UiText>
                    </UiButton>
                  </div>

                  {/* SRI Anulación if authorized */}
                  {isAuthorized && (
                    <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"mt-[8px] pt-[8px]"}}>
                      <UiButton
                        type="button" 
                        onClick={handleAnular}
                        {...{"variant":"soft","color":"red","className":"w-full flex items-center justify-center gap-[6px] text-xs h-8"}}
                      >
                        <ShieldAlert size={12} />
                        <UiText>{isNotaVenta ? 'Anular Nota de Venta' : 'Anular Documento ante el SRI'}</UiText>
                      </UiButton>
                    </UiBox>
                  )}
                </UiBox>

              </UiBox>

            {/* Right Column (col-span-12 lg:col-span-5): Vista Previa del Documento */}
            <UiBox {...{"className":"col-span-12 lg:col-span-5"}}>
              <UiBox {...mergeThemeProps({}, {"className":"space-y-[8px]"}, mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-[12px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"}}))}>
                <UiHeading as="h4"  {...{"size":"1","weight":"bold"}}>Vista Previa del Comprobante</UiHeading>

                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)","fontFamily":"var(--code-font-family)"},"className":"p-[10px] space-y-[8px] max-h-[60vh] overflow-y-auto"})}>
                  <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"text-center pb-[8px]"}}>
                    <UiText as="p" {...{"weight":"bold","size":"1"}}>{sriConfig.nombreComercial || 'WEBFIX ERP'}</UiText>
                    <UiText as="p" {...{"size":"1","weight":"bold"}}>{sriConfig.razonSocial}</UiText>
                    <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-[2px]"}}>{sriConfig.direccionMatriz}</UiText>
                    <UiText as="p" {...{"size":"1","weight":"bold","className":"mt-[4px]"}}>RUC: {sriConfig.ruc}</UiText>
                  </UiBox>

                  <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"space-y-[4px] pb-[8px]"}}>
                    <UiText as="p" {...{"weight":"bold","color":"gray","highContrast":true,"className":"text-center py-[2px]"}}>
                      {formData.documentType === 'nota_venta' ? 'NOTA DE VENTA' : 'FACTURA ELECTRÓNICA'}
                    </UiText>
                    <UiText as="p" {...{"color":"gray","highContrast":true}}>
                      <b>Número:</b> {formData.documentNumber || (formData.documentType === 'factura' ? 'Borrador (Secuencial se asigna al emitir en SRI)' : (formData.secuencial ? `001-001-${String(formData.secuencial).padStart(9, '0')}` : 'Por asignar al emitir'))}
                    </UiText>
                    <UiText as="p" {...{"color":"gray","highContrast":true}}><b>Fecha:</b> {formData.date} {formData.time || ''}</UiText>
                    <UiText as="p" {...{"color":"gray","highContrast":true}}>
                      <b>{formData.documentType === 'nota_venta' ? 'Estado:' : 'Estado SRI:'}</b>{' '}
                      <UiText {...mergeThemeProps({}, {"weight":"bold"}, (formData.sriStatus === 'anulado' ? {"color":"red"} : {"color":"green"}))}>
                        {formData.documentType === 'nota_venta' 
                          ? (formData.sriStatus === 'anulado' ? 'ANULADO' : 'REGISTRADO') 
                          : formData.sriStatus}
                      </UiText>
                    </UiText>
                  </UiBox>

                  <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"space-y-[4px] pb-[8px]"}}>
                    <UiText as="p"><b>Cliente:</b> {matchedTercero?.name || 'CONSUMIDOR FINAL'}</UiText>
                    <UiText as="p"><b>RUC/CI:</b> {matchedTercero?.ruc || '9999999999999'}</UiText>
                    <UiText as="p"><b>Dirección:</b> {matchedTercero?.direccion || 'S/N'}</UiText>
                  </UiBox>

                  {/* Detalle items */}
                  {formData.documentType !== 'retencion' && (
                    <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"pb-[8px]"}}>
                      <UiTable {...{"className":"w-full text-left"}}>
                        <UiTableHeader>
                          <UiTableRow {...{}}>
                            <UiTableHead {...{"className":"pb-[2px]"}}>Cant</UiTableHead>
                            <UiTableHead {...{"className":"pb-[2px]"}}>Detalle</UiTableHead>
                            <UiTableHead {...{"className":"pb-[2px] text-right"}}>Unit</UiTableHead>
                            <UiTableHead {...{"className":"pb-[2px] text-right"}}>Total</UiTableHead>
                          </UiTableRow>
                        </UiTableHeader>
                        <UiTableBody>
                          {(formData.items || []).map((item, idx) => (
                            <UiTableRow key={idx} {...{"style":{"color":"var(--gray-12)"}}}>
                              <UiTableCell {...{"className":"py-[2px] align-top"}}>{item.quantity}</UiTableCell>
                              <UiTableCell {...{"className":"py-[2px] pr-[5px]"}}>{invoiceDescription(item)}</UiTableCell>
                              <UiTableCell {...{"className":"py-[2px] text-right align-top"}}>${Number(item.price).toFixed(2)}</UiTableCell>
                              <UiTableCell {...{"className":"py-[2px] text-right align-top"}}>${(Number(item.price) * Number(item.quantity)).toFixed(2)}</UiTableCell>
                            </UiTableRow>
                          ))}
                        </UiTableBody>
                      </UiTable>
                    </UiBox>
                  )}

                  {/* Totales */}
                  <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"space-y-[2px] text-right"}}>
                    <UiText as="p">Subtotal: ${Number(formData.baseImponible).toFixed(2)}</UiText>
                    {formData.documentType !== 'retencion' && (
                      <UiText as="p">IVA ({formData.ivaPorcentaje}%): ${Number(formData.ivaValor).toFixed(2)}</UiText>
                    )}
                    <UiText as="p" {...{"weight":"bold","size":"1","color":"gray","highContrast":true,"className":"pt-[4px]"}}>
                      TOTAL: ${Number(formData.total).toFixed(2)}
                    </UiText>
                  </UiBox>

                  {/* Pagos desglosados */}
                  <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"pt-[6px] space-y-[2px]"}}>
                    <UiText as="p" {...{"weight":"bold","size":"1","color":"gray","highContrast":true}}>Forma de Pago:</UiText>
                    {Number(payments.efectivo) > 0 && <UiText as="p">Efectivo: ${Number(payments.efectivo).toFixed(2)}</UiText>}
                    {Number(payments.transferencia) > 0 && <UiText as="p">Transferencia: ${Number(payments.transferencia).toFixed(2)}</UiText>}
                    {Number(payments.tarjeta) > 0 && <UiText as="p">Tarjeta: ${Number(payments.tarjeta).toFixed(2)}</UiText>}
                    {Number(payments.cruce_cuentas) > 0 && <UiText as="p">Crédito CxC: ${Number(payments.cruce_cuentas).toFixed(2)}</UiText>}
                  </UiBox>
                </UiBox>
              </UiBox>
            </UiBox>
          </UiBox>
        )}

      </UiBox>

      {/* FOOTER WIZARD BAR */}
      {!isInline && (
        <UiCard {...mergeThemeProps({"className":"sticky bottom-0 z-20 px-[12px] py-[10px] flex justify-between items-center"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
          {/* Mobile Navigation Buttons (Step 1) */}
          {currentStep === 1 && (
            <UiBox {...{"className":"flex lg:hidden items-center justify-between w-full"}}>
              {/* Atrás (Mobile) */}
              {mobileTab !== 'cliente' ? (
                <UiButton
                  type="button"
                  onClick={() => setMobileTab(mobileTab === 'pago' ? 'carrito' : 'cliente')}
                  {...{"variant":"surface","color":"blue"}}
                >
                  <ArrowLeft size={12} />
                  <UiText>Atrás</UiText>
                </UiButton>
              ) : (
                <UiBox {...{"className":"w-[60px]"}} />
              )}

              <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true})}>
                {mobileTab === 'cliente' ? '1. Cliente' : mobileTab === 'carrito' ? '2. Carrito' : '3. Pago'}
              </UiText>

              {/* Siguiente (Mobile) */}
              {mobileTab !== 'pago' ? (
                <UiButton
                  type="button"
                  onClick={() => setMobileTab(mobileTab === 'cliente' ? 'carrito' : 'pago')}
                  {...{"variant":"solid","color":"blue"}}
                >
                  <UiText>Siguiente</UiText>
                  <ArrowRight size={14} />
                </UiButton>
              ) : (
                <UiBox {...{"className":"w-[75px]"}} />
              )}
            </UiBox>
          )}

          {/* Desktop Navigation (original) */}
          <UiBox {...mergeThemeProps({"className":"hidden lg:flex justify-between items-center w-full"})}>
            <UiButton
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1 || isLockedInStep2}
              {...mergeThemeProps({"variant":"surface","color":"blue"}, {}, (currentStep === 1 || isLockedInStep2 ? {"className":"opacity-0 pointer-events-none"} : {}))}
            >
              <ArrowLeft size={12} />
              <UiText>Atrás</UiText>
            </UiButton>

            <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true})}>
              Paso {currentStep} de 2
            </UiText>

            {currentStep < 2 ? (
              <UiButton
                type="button"
                disabled={currentStep === 1 && isEditable && !formData.documentNumber}
                onClick={handleNextStep}
                {...mergeThemeProps({"variant":"solid","color":"blue"}, {}, (currentStep === 1 && isEditable && !formData.documentNumber ? {"className":"opacity-50 cursor-not-allowed"} : {}))}
              >
                <UiText>Siguiente</UiText>
                <ArrowRight size={14} />
              </UiButton>
            ) : (
              <UiButton
                type="button"
                onClick={closeTransaction}
                {...{"variant":"solid","color":"blue"}}
              >
                <UiText>Terminar / Salir</UiText>
              </UiButton>
            )}
          </UiBox>

          {/* Mobile Navigation when in Step 2 */}
          {currentStep === 2 && (
            <UiBox {...{"className":"flex lg:hidden justify-between items-center w-full"}}>
              <UiButton
                type="button"
                onClick={handlePrevStep}
                disabled={isLockedInStep2}
                {...mergeThemeProps({"variant":"surface","color":"blue"}, {}, (isLockedInStep2 ? {"className":"opacity-0 pointer-events-none"} : {}))}
              >
                <ArrowLeft size={12} />
                <UiText>Atrás</UiText>
              </UiButton>
              
              <UiText {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true})}>
                Paso 2 de 2
              </UiText>

              <UiButton
                type="button"
                onClick={closeTransaction}
                {...{"variant":"solid","color":"blue"}}
              >
                <UiText>Terminar</UiText>
              </UiButton>
            </UiBox>
          )}
        </UiCard>
      )}

      {/* MODAL SEGUIMIENTO DE CRÉDITO / CXC */}
      {isCreditModalOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[150] flex items-center justify-center p-[10px] animate-in fade-in"}}>
          <UiCard {...mergeThemeProps({"className":"w-full max-w-md p-[20px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-[12px] pb-[8px]"}}>
              <UiHeading as="h3" {...{"size":"3","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-[4px]"}}>
                <User {...{"style":{"color":"var(--gray-11)"}}} size={14} />
                Seguimiento de Cuenta por Cobrar
              </UiHeading>
              <UiButton iconOnly
                type="button" 
                onClick={() => setIsCreditModalOpen(false)}
                {...{}}
              >
                <X size={12} />
              </UiButton>
            </UiBox>

            <UiBox {...{"className":"space-y-[10px]"}}>
              <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-[10px] space-y-[4px]"}, {}, {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}})}>
                <UiBox {...{"className":"flex justify-between"}}>
                  <UiText {...{"color":"gray"}}>Cliente:</UiText>
                  <UiText {...{"weight":"bold"}}>{matchedTercero?.name || 'Cliente no seleccionado'}</UiText>
                </UiBox>
                <UiBox {...{"className":"flex justify-between items-center"}}>
                  <UiText {...{"color":"gray"}}>Cupo de Crédito:</UiText>
                  <UiBox className="flex items-center gap-2">
                    <UiText {...{"weight":"bold"}}>${(Number(matchedTercero?.creditLimit || matchedTercero?.limiteCredito) || 0).toFixed(2)}</UiText>
                    <UiButton
                      type="button"
                      onClick={() => {
                        setIsCreditModalOpen(false);
                        setIsCreditSetupOpen(true);
                      }}
                      {...mergeThemeProps({"variant":"soft","size":"1","color":"blue"})}
                    >
                      Ajustar Cupo
                    </UiButton>
                  </UiBox>
                </UiBox>
                <UiBox {...{"style":{"color":"var(--red-12)"},"className":"flex justify-between"}}>
                  <UiText>Deuda Pendiente Actual:</UiText>
                  <UiText {...{"weight":"bold"}}>${clientDebt.toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"color":"var(--gray-11)","borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-[4px]"}}>
                  <UiText>Monto Venta Actual:</UiText>
                  <UiText {...{"weight":"bold"}}>${Number(formData.total).toFixed(2)}</UiText>
                </UiBox>
                
                {(() => {
                  const limit = Number(matchedTercero?.creditLimit || matchedTercero?.limiteCredito) || 0;
                  const totalVenta = Number(formData.total) || 0;
                  const available = limit - clientDebt - totalVenta;
                  return (
                    <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-[4px]"}, {}, (available < 0 ? {"style":{"color":"var(--red-11)"}} : {"style":{"color":"var(--green-12)"}}))}>
                      <UiText>Cupo Disponible Resultante:</UiText>
                      <UiText>${available.toFixed(2)}</UiText>
                    </UiBox>
                  );
                })()}
              </UiBox>

              {(() => {
                const limit = Number(matchedTercero?.creditLimit || matchedTercero?.limiteCredito) || 0;
                const totalVenta = Number(formData.total) || 0;
                const available = limit - clientDebt - totalVenta;
                if (available < 0) {
                  return (
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","border":"1px solid var(--gray-a6)","color":"var(--red-11)"},"className":"p-[8px] leading-normal flex items-start gap-[4px]"}}>
                      <AlertTriangle size={12} {...{"className":"shrink-0 mt-[1px]"}} />
                      <UiBox>
                        <UiText as="p" {...{"weight":"bold"}}>Límite de Crédito Superado</UiText>
                        <UiText as="p" {...{"weight":"regular","className":"opacity-90"}}>La deuda actual más esta venta superan el cupo disponible del cliente en ${(Math.abs(available)).toFixed(2)}.</UiText>
                      </UiBox>
                    </UiBox>
                  );
                }
                return null;
              })()}

              <UiBox {...{"className":"space-y-[8px]"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Fecha de Vencimiento de la Deuda</UiLabel>
                  <UiInput
                    type="date" 
                    value={creditDueDate} 
                    onChange={e => setCreditDueDate(e.target.value)} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Observaciones / Comentario de Crédito</UiLabel>
                  <UiTextarea
                    rows={3}
                    value={creditObservations} 
                    onChange={e => setCreditObservations(e.target.value)} 
                    {...mergeThemeProps({}, {"className":"resize-none"}, mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"}))} 
                    placeholder="Ej. Crédito autorizado por gerencia..."
                  />
                </UiBox>
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-[8px] mt-[10px] pt-[10px]"}}>
                <UiButton
                  type="button" 
                  onClick={() => {
                    setIsCreditModalOpen(false);
                    setFormData(prev => ({ ...prev, paymentMethod: 'efectivo' }));
                  }} 
                  {...{"variant":"surface","color":"blue"}}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="button" 
                  onClick={() => setIsCreditModalOpen(false)}
                  {...{"variant":"solid","color":"blue"}}
                >
                  Confirmar Crédito
                </UiButton>
              </UiBox>
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      {/* MODAL CONFIGURACION DE CREDITO EN CALIENTE */}
      {isCreditSetupOpen && matchedTercero && (
        <CreditSetupModal
          isOpen={isCreditSetupOpen}
          onClose={() => setIsCreditSetupOpen(false)}
          client={matchedTercero}
          showToast={showToast}
          onSave={async (creditData) => {
            if (db && appId && matchedTercero.id) {
              const clientRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', matchedTercero.id);
              await setDoc(clientRef, { ...creditData }, { merge: true });
              Object.assign(matchedTercero, creditData);
              const days = creditData.paymentDays || 30;
              const d = new Date();
              d.setDate(d.getDate() + days);
              setCreditDueDate(d.toISOString().split('T')[0]);
              if (creditData.creditObservations) {
                setCreditObservations(creditData.creditObservations);
              }
            }
            setIsCreditModalOpen(true);
          }}
        />
      )}

      {/* MODAL CREAR CONTACTO RAPIDO */}
      {isQuickAddOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[150] flex items-center justify-center p-[10px] animate-in fade-in"}}>
          <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full max-w-md p-[20px]"})}>
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)' }} className="flex justify-between items-center mb-3 pb-2">
              <UiHeading as="h3" size="3" weight="bold" className="flex items-center gap-2">
                <User size={16} style={{ color: 'var(--blue-11)' }} />
                Nuevo {formData.type === 'ingreso' ? 'Cliente' : 'Proveedor'} (Rápido)
              </UiHeading>
              <UiButton iconOnly type="button" onClick={() => setIsQuickAddOpen(false)} color="gray" className="cursor-pointer">
                <X size={14} />
              </UiButton>
            </UiBox>
            
            <form onSubmit={handleQuickAddSave} {...{"className":"space-y-[10px]"}}>
              <UiBox {...{"className":"grid grid-cols-2 gap-[8px]"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Identificación</UiLabel>
                  <UiSelect
                    value={quickAddFormData.tipoIdentificacion || 'ruc'} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, tipoIdentificacion: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                  >
                    <option value="ruc">RUC</option>
                    <option value="cedula">Cédula</option>
                    <option value="pasaporte">Pasaporte</option>
                  </UiSelect>
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Número</UiLabel>
                  <UiBox {...{"className":"flex gap-[8px]"}}>
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
                      onClick={queryQuickAddSRI}
                      {...{"variant":"soft","color":"purple","className":"shrink-0"}}
                      title="Consultar SRI"
                    >
                      {isQueryingSri ? <RefreshCw size={13} {...{"className":"animate-spin"}} /> : <Sparkles size={13} />}
                    </UiButton>
                  </UiBox>
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Razón Social / Nombres</UiLabel>
                <UiInput
                  type="text" 
                  required 
                  value={quickAddFormData.name} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, name: e.target.value})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  placeholder="Ej. Juan Pérez" 
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Teléfono</UiLabel>
                <UiInput
                  type="text" 
                  value={quickAddFormData.telefono || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, telefono: e.target.value})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  placeholder="0998765432" 
                />
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-2 gap-[8px]"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Dirección</UiLabel>
                  <UiInput
                    type="text" 
                    value={quickAddFormData.direccion || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, direccion: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                    placeholder="Av. de los Shyris" 
                  />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Ciudad</UiLabel>
                  <UiInput
                    type="text" 
                    value={quickAddFormData.ciudad || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, ciudad: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                    placeholder="Quito" 
                  />
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Correo Electrónico</UiLabel>
                <UiInput
                  type="email" 
                  value={quickAddFormData.email || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, email: e.target.value})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  placeholder="correo@ejemplo.com" 
                />
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-[8px] mt-[10px] pt-[10px]"}}>
                <UiButton
                  type="button" 
                  onClick={() => setIsQuickAddOpen(false)} 
                  {...{"variant":"surface","color":"blue"}}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="submit" 
                  {...{"variant":"solid","color":"blue"}}
                >
                  Guardar y Seleccionar
                </UiButton>
              </UiBox>
            </form>
          </UiCard>
        </UiBox>
      )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      {confirmDialog && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[200] flex items-center justify-center p-[10px] animate-in fade-in duration-200"}}>
          <UiCard {...mergeThemeProps({"className":"w-full max-w-md p-[20px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            <UiBox {...{"className":"flex items-center gap-[8px] mb-[10px]"}}>
              <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-[8px] shrink-0"}, {}, (confirmDialog.type === 'danger' ? {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}} : (confirmDialog.type === 'warning' ? {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}} : {"style":{"backgroundColor":"var(--blue-3)","color":"var(--gray-11)"}})))}>
                {confirmDialog.type === 'danger' ? (
                  <ShieldAlert size={16} />
                ) : confirmDialog.type === 'warning' ? (
                  <AlertTriangle size={16} />
                ) : (
                  <FileText size={16} />
                )}
              </UiBox>
              <UiBox>
                <UiHeading as="h3"  {...{"size":"3","weight":"bold"}}>
                  {confirmDialog.title}
                </UiHeading>
                <UiText as="p" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mt-[2px]"}}>
                  Acción de Seguridad Requerida
                </UiText>
              </UiBox>
            </UiBox>

            <UiBox  {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-[10px] leading-normal mb-[12px]"}, {}, {"style":{"backgroundColor":"var(--gray-2)"}})}>
              {confirmDialog.message}
            </UiBox>

            <UiBox {...{"className":"flex justify-end gap-[8px]"}}>
              {!confirmDialog.isAlert && (
                <UiButton
                  type="button"
                  onClick={confirmDialog.onCancel}
                  {...{"variant":"surface","color":"blue"}}
                >
                  Cancelar
                </UiButton>
              )}
              <UiButton
                type="button"
                onClick={confirmDialog.onConfirm}
                {...(confirmDialog.type === 'danger' ? {"variant":"soft","color":"red"} : {"variant":"solid","color":"blue"})}
              >
                {confirmDialog.confirmLabel || 'Aceptar / Confirmar'}
              </UiButton>
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      <SaleValidationDialog
        issues={validationIssues}
        action={formData.type === 'ingreso' ? 'facturar o registrar la venta' : 'registrar el comprobante'}
        onClose={() => setValidationIssues([])}
        onNavigate={navigateToValidationIssue}
      />

      {/* POPUP BÚSQUEDA AVANZADA DE PRODUCTOS */}
      {isAdvancedSearchOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[160] flex items-center justify-center p-[10px] animate-in fade-in"}}>
          <UiCard {...mergeThemeProps({"className":"w-full max-w-2xl p-[20px] flex flex-col max-h-[85vh]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            {/* Header */}
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-[12px] pb-[8px]"}}>
              <UiHeading as="h3" {...{"size":"3","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-[4px]"}}>
                <Search {...{"style":{"color":"var(--gray-11)"}}} size={14} />
                Búsqueda Avanzada de Productos
              </UiHeading>
              <UiButton iconOnly
                type="button" 
                onClick={() => setIsAdvancedSearchOpen(false)}
                {...{}}
              >
                <X size={12} />
              </UiButton>
            </UiBox>

            {/* Search and category filter row */}
            <UiBox {...{"className":"flex gap-[8px] mb-[10px]"}}>
              <UiBox {...{"className":"relative flex-1"}}>
                <UiInput
                  type="text" 
                  value={advSearchTerm} 
                  onChange={e => setAdvSearchTerm(e.target.value)} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                  placeholder="Buscar por nombre, SKU, barra..."
                />
                {advSearchTerm && (
                  <UiButton iconOnly type="button" onClick={() => setAdvSearchTerm('')} {...{"color":"gray","className":"absolute right-[8px] top-1/2 -translate-y-1/2"}}>
                    <X size={10} />
                  </UiButton>
                )}
              </UiBox>
              {(() => {
                const cats = ['all', ...new Set(products.filter(isSellable).map(p => p.category).filter(Boolean))];
                if (cats.length > 1) {
                  return (
                    <UiSelect
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      {...mergeThemeProps({}, {"className":"w-auto"}, mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"}))}
                    >
                      <option value="all">Todas las Categorías</option>
                      {cats.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </UiSelect>
                  );
                }
                return null;
              })()}
            </UiBox>

            {/* Products scrollable list */}
            <UiBox {...{"className":"flex-1 overflow-y-auto space-y-[6px] min-h-[250px] max-h-[50vh] pr-[2px]"}}>
              {(() => {
                const filtered = products.filter(p => {
                  if (!isSellable(p)) return false;
                  const matchText = !advSearchTerm || 
                    p.name?.toLowerCase().includes(advSearchTerm.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(advSearchTerm.toLowerCase()) ||
                    p.codigoBarras?.toLowerCase().includes(advSearchTerm.toLowerCase());
                  const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
                  return matchText && matchCat;
                });

                if (filtered.length === 0) {
                  return (
                    <UiBox  {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"py-8 text-center italic"}}>
                      No se encontraron productos coincidentes.
                    </UiBox>
                  );
                }

                return filtered.map(p => {
                  const isAlreadyInCart = (formData.items || []).some(it => it.productId === p.id);
                  const cartQty = (formData.items || []).find(it => it.productId === p.id)?.quantity || 0;

                  return (
                    <UiBox 
                      key={p.id} 
                      {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-[8px] flex justify-between items-center"}, {}, {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}})}
                    >
                      <UiBox>
                        <UiBox {...{"className":"flex items-center gap-[6px]"}}>
                          <UiText as="p" {...{"weight":"bold","size":"1"}}>{p.name}</UiText>
                          {p.category && (
                            <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"px-[5px] py-[2px]"}}>
                              {p.category}
                            </UiText>
                          )}
                        </UiBox>
                        <UiText as="p" {...{"size":"1","weight":"regular","className":"opacity-85"}}>
                          {p.sku ? `SKU: ${p.sku}` : ''} {p.codigoBarras ? ` | Barra: ${p.codigoBarras}` : ''}
                          {p.stock !== undefined ? ` | Stock: ${p.stock}` : ''}
                        </UiText>
                      </UiBox>

                      <UiBox {...{"className":"flex items-center gap-[8px] shrink-0"}}>
                        <UiText style={{ color: '#1C40F2' }} {...{"weight":"bold","size":"1","className":"mr-[4px]"}}>${Number(p.price).toFixed(2)}</UiText>
                        {isAlreadyInCart && (
                          <UiText {...{"size":"1","weight":"bold","color":"green","className":"px-[6px] py-[3px]"}}>
                            En Carrito ({cartQty})
                          </UiText>
                        )}
                        <UiButton
                          type="button"
                          onClick={() => handleAddProductToCart(p)}
                          {...{"variant":"solid","color":"blue"}}
                        >
                          + Añadir
                        </UiButton>
                      </UiBox>
                    </UiBox>
                  );
                });
              })()}
            </UiBox>

            {/* Footer */}
            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end mt-[10px] pt-[10px]"}}>
              <UiButton
                type="button"
                onClick={() => setIsAdvancedSearchOpen(false)}
                {...{"variant":"surface","color":"blue"}}
              >
                Volver a la Consola
              </UiButton>
            </UiBox>
          </UiCard>
        </UiBox>
      )}

      {/* MODAL CREAR PRODUCTO RAPIDO */}
      {isQuickAddProductOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[150] flex items-center justify-center p-[10px] animate-in fade-in"}}>
          <UiCard {...mergeThemeProps({"className":"w-full max-w-md p-[20px]"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)' }} className="flex justify-between items-center mb-3 pb-2">
              <UiHeading as="h3" size="3" weight="bold" className="flex items-center gap-2">
                <Package size={16} style={{ color: 'var(--blue-11)' }} />
                Crear Producto (Rápido)
              </UiHeading>
              <UiButton iconOnly type="button" onClick={() => setIsQuickAddProductOpen(false)} color="gray" className="cursor-pointer">
                <X size={14} />
              </UiButton>
            </UiBox>
            
            <form onSubmit={handleQuickAddProductSave} {...{"className":"space-y-[10px]"}}>
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Nombre del Producto / Servicio</UiLabel>
                <UiInput
                  type="text" 
                  required 
                  value={quickAddProductFormData.name} 
                  onChange={e => setQuickAddProductFormData({...quickAddProductFormData, name: e.target.value})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  placeholder="Ej. Servicio de Mantenimiento PC" 
                />
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-2 gap-[8px]"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>SKU / Código</UiLabel>
                  <UiInput
                    type="text" 
                    value={quickAddProductFormData.sku} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, sku: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                    placeholder="SKU-100" 
                  />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Código de Barras</UiLabel>
                  <UiInput
                    type="text" 
                    value={quickAddProductFormData.codigoBarras} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, codigoBarras: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                    placeholder="7861000..." 
                  />
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-3 gap-[8px]"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>P. Venta ($)</UiLabel>
                  <UiInput
                    type="number" 
                    step="0.0001"
                    required 
                    value={quickAddProductFormData.price} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, price: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                    placeholder="10.00" 
                  />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Costo ($)</UiLabel>
                  <UiInput
                    type="number" 
                    step="0.0001" 
                    value={quickAddProductFormData.baseCost} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, baseCost: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                    placeholder="6.50" 
                  />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Stock Inicial</UiLabel>
                  <UiInput
                    type="number" 
                    value={quickAddProductFormData.stock} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, stock: e.target.value})} 
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                    placeholder="10" 
                  />
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-[4px]"}}>Categoría IVA</UiLabel>
                <UiSelect
                  value={quickAddProductFormData.ivaCategory} 
                  onChange={e => setQuickAddProductFormData({...quickAddProductFormData, ivaCategory: Number(e.target.value)})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                >
                  <option value={15}>15% IVA</option>
                  <option value={12}>12% IVA</option>
                  <option value={5}>5% IVA</option>
                  <option value={0}>0% IVA</option>
                </UiSelect>
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-[8px] mt-[10px] pt-[10px]"}}>
                <UiButton
                  type="button" 
                  onClick={() => setIsQuickAddProductOpen(false)} 
                  {...{"variant":"surface","color":"blue"}}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="submit" 
                  {...{"variant":"solid","color":"blue"}}
                >
                  <Plus size={12} />
                  <UiText>Añadir</UiText>
                </UiButton>
              </UiBox>
            </form>
          </UiCard>
        </UiBox>
      )}

      {printTx && (
        <RidePreviewModal 
          tx={printTx} 
          onClose={() => {
            setPrintTx(null);
            setAutoPrintDirect(false);
          }} 
          thirdParties={thirdParties} 
          db={db} 
          appId={appId}
          initialFormat={printFormat}
          autoPrint={autoPrintDirect}
        />
      )}

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
                <UiCard style={{ backgroundColor: 'var(--gray-2)' }} className="p-3 space-y-2">
                  <UiText size="1" weight="bold" color="gray" highContrast>⚡ Descuento Manual Directo</UiText>
                  <div className="flex items-center gap-2">
                    <UiSelect
                      value={manualLineDiscType}
                      onChange={e => setManualLineDiscType(e.target.value)}
                      size="2"
                      color="gray"
                      className="w-32 cursor-pointer"
                    >
                      <option value="PORCENTAJE">% Porc.</option>
                      <option value="MONTO_FIJO">$ Monto</option>
                      <option value="SIN_IVA">Quitar IVA</option>
                    </UiSelect>
                    {manualLineDiscType !== 'SIN_IVA' ? (
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
                    ) : (
                      <div className="flex-1 px-2 py-1 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded text-center">
                        <UiText size="1" weight="bold" color="red">
                          -100% IVA del ítem
                        </UiText>
                      </div>
                    )}
                    <UiButton
                      type="button"
                      size="2"
                      variant="solid"
                      color="blue"
                      onClick={() => {
                        const isSinIva = manualLineDiscType === 'SIN_IVA';
                        const val = isSinIva ? 0 : (parseFloat(manualLineDiscValue) || 0);
                        if (!isSinIva && val <= 0) return;
                        const idx = selectedLineItemForDiscount.cartIndex;
                        const updated = [...(formData.items || [])];
                        updated[idx] = {
                          ...updated[idx],
                          id_descuento_aplicado: 'manual',
                          id_promocion_aplicada: '',
                          discount_value: val,
                          discount_type: manualLineDiscType,
                          itemDiscount: 0
                        };
                        setFormData(prev => ({ ...prev, items: updated }));
                        showToast(isSinIva ? "Descuento del IVA aplicado al ítem" : `Descuento manual de ${manualLineDiscType === 'PORCENTAJE' ? `${val}%` : `$${val}`} aplicado`, "success");
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
                    const idx = selectedLineItemForDiscount.cartIndex;
                    const updated = [...(formData.items || [])];
                    updated[idx] = {
                      ...updated[idx],
                      id_descuento_aplicado: '',
                      id_promocion_aplicada: '',
                      discount_value: 0,
                      discount_type: 'PORCENTAJE',
                      itemDiscount: 0
                    };
                    setFormData(prev => ({ ...prev, items: updated }));
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
                            const idx = selectedLineItemForDiscount.cartIndex;
                            const updated = [...(formData.items || [])];
                            updated[idx] = {
                              ...updated[idx],
                              id_descuento_aplicado: d.id,
                              id_promocion_aplicada: d.promotionId || '',
                              discount_value: d.valor,
                              discount_type: d.tipo_valor,
                              descuento_objeto: d,
                              itemDiscount: d.tipo_valor === 'PORCENTAJE' ? 0 : d.valor
                            };
                            setFormData(prev => ({ ...prev, items: updated }));
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
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4 flex items-center justify-between"}}>
              <UiText {...{"size":"1","weight":"bold","color":"red","highContrast":true,"className":"flex items-center gap-1.5"}}>
                <ShieldAlert size={15} /> Autorización Requerida
              </UiText>
              <UiButton iconOnly
                onClick={() => { authDialog.onCancel?.(); setAuthDialog(null); }} 
                {...{"color":"gray","className":"cursor-pointer"}}
              >
                <X size={18} />
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

    </UiBox>
  );

  if (isInline) {
    return formJSX;
  }
  return createPortal(formJSX, document.body);
}
