import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, UploadCloud, Calculator, FileText, CheckCircle2, AlertTriangle, Sparkles, 
  Terminal, ShieldAlert, Download, Plus, Trash2, RefreshCw, ArrowLeft, ArrowRight, 
  User, DollarSign, CreditCard, Layers, Search, Building, ChevronDown, UserPlus, Tag, Zap
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { validarIdentificacion, generarFacturaXML, simularTransmisionSRI, consultarRucSri, generarRetencionXML, generarNotaCreditoXML, generarLiquidacionXML, generarGuiaRemisionXML, getEcuadorDateString, getEcuadorTimeString, getEcuadorDateTimeString } from '../../services/sriService';
import { firmarComprobanteXML } from '../../services/xadesSigner';
import { registrarMovimientoKardex } from '../../services/inventoryService';
import RidePreviewModal from './RidePreviewModal';

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

export default function TransactionForm({ tx, onClose, thirdParties, products = [], isDarkMode, showToast, db, storage, appId, isInline = false }) {
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
  const [currentStep, setCurrentStep] = useState(1);
  const [printTx, setPrintTx] = useState(null);
  const [printFormat, setPrintFormat] = useState('ride');
  
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
  const [loadingDebt, setLoadingDebt] = useState(false);
  const [creditDueDate, setCreditDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return getEcuadorDateString(d);
  });
  const [creditObservations, setCreditObservations] = useState('');
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('cliente'); // 'cliente' | 'carrito' | 'pago'

  // MiniPOS Discount
  const [generalDiscountType, setGeneralDiscountType] = useState('percent'); // 'percent' | 'fixed'
  const [generalDiscountValue, setGeneralDiscountValue] = useState(0);

  const [confirmDialog, setConfirmDialog] = useState(null);
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
      const productId = `prod_${new Date().getTime()}`;
      const newProdData = {
        id: productId,
        name: quickAddProductFormData.name,
        sku: quickAddProductFormData.sku || '',
        codigoBarras: quickAddProductFormData.codigoBarras || '',
        price: Number(quickAddProductFormData.price) || 0,
        baseCost: Number(quickAddProductFormData.baseCost) || 0,
        ivaCategory: Number(quickAddProductFormData.ivaCategory) || 15,
        stock: Number(quickAddProductFormData.stock) || 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory_products', productId), sanitizeFirestoreData(newProdData));
      showToast('Producto creado y agregado al carrito', 'success');
      handleAddProductToCart(newProdData);
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
              // Si el RUC está inactivo y es un ingreso tipo factura, cambiar a nota_venta
              const activeDocType = (configData.rucActivo === false && !tx && prev.type === 'ingreso' && prev.documentType === 'factura')
                ? 'nota_venta'
                : prev.documentType;

              let nextSec = '1';
              if (activeDocType === 'factura') {
                nextSec = String(configData.secuencialFactura || 1);
              } else if (activeDocType === 'retencion') {
                nextSec = String(configData.secuencialRetencion || 1);
              } else if (activeDocType === 'nota_credito') {
                nextSec = String(configData.secuencialNotaCredito || 1);
              } else if (activeDocType === 'liquidacion') {
                nextSec = String(configData.secuencialLiquidacion || 1);
              } else if (activeDocType === 'guia_remision') {
                nextSec = String(configData.secuencialGuiaRemision || 1);
              } else if (activeDocType === 'nota_venta') {
                nextSec = String(configData.secuencialNotaVenta || 1);
              }

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
    if (tx) {
      setFormData(prev => ({
        ...prev,
        items: [], // Valor por defecto
        ...tx
      }));

      // Inicializar desglose de pagos
      let breakdownEf = 0;
      let breakdownTr = 0;
      let breakdownTj = 0;
      let breakdownCr = 0;

      if (tx.paymentsBreakdown) {
        breakdownEf = tx.paymentsBreakdown.efectivo || 0;
        breakdownTr = tx.paymentsBreakdown.transferencia || 0;
        breakdownTj = tx.paymentsBreakdown.tarjeta || 0;
        breakdownCr = tx.paymentsBreakdown.cruce_cuentas || tx.paymentsBreakdown.credito || 0;

        setPayments({
          efectivo: breakdownEf,
          transferencia: breakdownTr,
          tarjeta: breakdownTj,
          cruce_cuentas: breakdownCr,
          transferenciaRef: tx.transferenciaRef || tx.paymentReferences?.transferenciaRef || '',
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
    }
  }, [tx]);

  // Cargar deuda del cliente de manera dinámica desde Firestore
  useEffect(() => {
    if (!formData.thirdPartyId || !db || !appId) {
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

  // Cálculo automático del total y desglose de items/retenciones
  useEffect(() => {
    if (formData.documentType === 'retencion') {
      const rets = formData.retenciones || [];
      const sumRet = rets.reduce((sum, r) => sum + (parseFloat(r.valorRetenido) || 0), 0);
      const sumBase = rets.reduce((sum, r) => sum + (parseFloat(r.baseImponible) || 0), 0);
      setFormData(prev => ({
        ...prev,
        baseImponible: sumBase.toFixed(2),
        ivaValor: '0.00',
        total: sumRet.toFixed(2)
      }));
      return;
    }

    const hasItems = formData.items && formData.items.length > 0;
    
    if (hasItems) {
      let rawSubtotal = 0;
      let itemDiscountTotal = 0;
      let ivaVal = 0;
      
      formData.items.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        const lineSub = price * qty;
        const lineDiscount = Math.min(lineSub, parseFloat(item.itemDiscount) || 0);
        const lineBase = Math.max(0, lineSub - lineDiscount);
        const lineIva = lineBase * ((parseInt(item.ivaCategory) || 15) / 100);
        
        rawSubtotal += lineSub;
        itemDiscountTotal += lineDiscount;
        ivaVal += lineIva;
      });

      const afterItemDiscount = Math.max(0, rawSubtotal - itemDiscountTotal);
      const genDisc = generalDiscountType === 'percent'
        ? afterItemDiscount * (Math.min(100, parseFloat(generalDiscountValue) || 0) / 100)
        : Math.min(afterItemDiscount, parseFloat(generalDiscountValue) || 0);
      
      const baseImponibleVal = Math.max(0, afterItemDiscount - genDisc);
      
      let finalIvaVal = ivaVal;
      if (afterItemDiscount > 0) {
        const ratio = baseImponibleVal / afterItemDiscount;
        finalIvaVal = ivaVal * ratio;
      } else {
        finalIvaVal = 0;
      }

      const retFuente = Number(formData.retencionFuente) || 0;
      const retIva = Number(formData.retencionIva) || 0;
      const totalVal = baseImponibleVal + finalIvaVal - retFuente - retIva;

      setFormData(prev => ({
        ...prev,
        baseImponible: baseImponibleVal.toFixed(2),
        ivaValor: finalIvaVal.toFixed(2),
        total: totalVal.toFixed(2)
      }));
    } else {
      // Flujo de cálculo manual
      const base = Number(formData.baseImponible) || 0;
      const ivaPerc = Number(formData.ivaPorcentaje) || 0;
      const ivaVal = Number((base * (ivaPerc / 100)).toFixed(2));
      
      const retFuente = Number(formData.retencionFuente) || 0;
      const retIva = Number(formData.retencionIva) || 0;
      
      const totalVal = base + ivaVal - retFuente - retIva;
      
      setFormData(prev => ({
        ...prev,
        ivaValor: ivaVal,
        total: totalVal.toFixed(2)
      }));
    }
  }, [
    formData.baseImponible, 
    formData.ivaPorcentaje, 
    formData.retencionFuente, 
    formData.retencionIva, 
    formData.items,
    formData.retenciones,
    formData.documentType,
    generalDiscountType,
    generalDiscountValue
  ]);

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
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...(prev.items || []),
        { productId: '', name: '', price: 0, quantity: 1, ivaCategory: 15, itemDiscount: 0 }
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
    setGeneralDiscountValue(0);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...(formData.items || [])];
    
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: value,
          name: prod.name,
          price: prod.price,
          ivaCategory: prod.ivaCategory,
          itemDiscount: updatedItems[index].itemDiscount || 0
        };
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleAddProductToCart = (product) => {
    const existingIndex = (formData.items || []).findIndex(item => item.productId === product.id);
    let updatedItems;
    if (existingIndex > -1) {
      updatedItems = [...formData.items];
      updatedItems[existingIndex].quantity = (parseInt(updatedItems[existingIndex].quantity) || 0) + 1;
    } else {
      updatedItems = [
        ...(formData.items || []),
        { 
          productId: product.id, 
          name: product.name, 
          sku: product.sku || '',
          codigoBarras: product.codigoBarras || '',
          price: Number(product.price) || 0, 
          quantity: 1, 
          ivaCategory: product.ivaCategory || 15,
          itemDiscount: 0
        }
      ];
    }
    setFormData(prev => ({ ...prev, items: updatedItems }));
    setProductSearchTerm('');
    showToast(`Añadido: ${product.name}`, 'success');
  };

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

  const handlePaymentMethodSelect = (method) => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
    if (method === 'credito') {
      setIsCreditModalOpen(true);
    }
  };

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
        (error) => {
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
      const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
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

  const getPrimaryPaymentMethod = () => {
    return formData.paymentMethod || 'efectivo';
  };

  const fillRemaining = (field) => {
    const total = Number(formData.total) || 0;
    setPayments(prev => ({
      ...prev,
      [field]: total.toFixed(2)
    }));
  };

  const showValidationErrorAlert = (message) => {
    setConfirmDialog({
      title: "Validación de Emisión",
      message: message.toUpperCase(),
      type: "danger",
      isAlert: true,
      confirmLabel: "Aceptar",
      onConfirm: () => setConfirmDialog(null),
      onCancel: () => setConfirmDialog(null)
    });
  };

  const validateForm = () => {
    if (!formData.thirdPartyId) {
      showValidationErrorAlert('FALTA INGRESAR CLIENTE');
      return false;
    }

    const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
    if (!matchedTercero) {
      showValidationErrorAlert('FALTA INGRESAR CLIENTE');
      return false;
    }

    if (!validarIdentificacion(
      matchedTercero.ruc,
      matchedTercero.tipoIdentificacion,
      matchedTercero.isValidated || matchedTercero.validado
    )) {
      showValidationErrorAlert(`EL RUC/CI DEL CONTACTO (${matchedTercero.ruc}) ES INCORRECTO`);
      return false;
    }

    if (!formData.items || formData.items.length === 0) {
      showValidationErrorAlert('FALTA AGREGAR PRODUCTOS AL COMPROBANTE');
      return false;
    }

    if (Number(formData.total) < 0) {
      showValidationErrorAlert('EL TOTAL LIQUIDADO NO PUEDE SER MENOR A CERO');
      return false;
    }

    if (formData.documentNumber && !/^\d{3}-\d{3}-\d{9}$/.test(formData.documentNumber)) {
      showValidationErrorAlert('EL NÚMERO DE COMPROBANTE DEBE TENER EL FORMATO 000-000-000000000');
      return false;
    }

    const pStatus = calculatePaymentStatus();
    if (!pStatus.isValid) {
      // Determine if there's no payment at all
      const total = Number(formData.total) || 0;
      const ef = Number(payments.efectivo) || 0;
      const tr = Number(payments.transferencia) || 0;
      const tj = Number(payments.tarjeta) || 0;
      const cr = Number(payments.cruce_cuentas) || 0;
      const sum = ef + tr + tj + cr;
      if (sum === 0 && total > 0) {
        showValidationErrorAlert('FALTA INGRESAR VALOR EN MEDIO DE PAGO');
      } else {
        showValidationErrorAlert(pStatus.error);
      }
      return false;
    }

    return true;
  };

  const registrarInventarioTransaccion = async (transaction) => {
    if (transaction.inventarioRegistrado) return;

    const items = transaction.items || [];
    if (items.length === 0) return;

    const isIngreso = transaction.type === 'ingreso';
    const concept = isIngreso 
      ? `Venta ${transaction.documentType === 'nota_venta' ? 'Nota de Venta' : 'Factura'} ${transaction.documentNumber || transaction.id}`
      : `Compra/Gasto ${transaction.documentType || ''} ${transaction.documentNumber || transaction.id}`;

    for (const item of items) {
      if (!item.productId) continue;
      
      try {
        if (isIngreso) {
          const prodRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory_products', item.productId);
          const prodSnap = await getDoc(prodRef);
          let currentCost = 0;
          if (prodSnap.exists()) {
            currentCost = Number(prodSnap.data().baseCost) || 0;
          }

          await registrarMovimientoKardex(db, appId, {
            productId: item.productId,
            type: 'salida',
            quantity: Number(item.quantity) || 0,
            cost: currentCost,
            price: Number(item.price) || 0,
            concept,
            referenceId: transaction.id,
            bodega: transaction.bodega || "Bodega Central"
          });
        } else {
          await registrarMovimientoKardex(db, appId, {
            productId: item.productId,
            type: 'entrada',
            quantity: Number(item.quantity) || 0,
            cost: Number(item.price) || 0,
            price: 0,
            concept,
            referenceId: transaction.id,
            bodega: transaction.bodega || "Bodega Central"
          });
        }
      } catch (err) {
        console.error("Error al registrar movimiento de inventario para item:", item, err);
      }
    }

    const txRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', transaction.id);
    await setDoc(txRef, { inventarioRegistrado: true }, { merge: true });
  };

  const reversarInventarioTransaccion = async (transaction) => {
    if (!transaction.inventarioRegistrado) return;

    const items = transaction.items || [];
    if (items.length === 0) return;

    const isIngreso = transaction.type === 'ingreso';
    const concept = `Anulación de ${isIngreso ? 'Venta' : 'Compra/Gasto'} ${transaction.documentType || ''} ${transaction.documentNumber || transaction.id}`;

    for (const item of items) {
      if (!item.productId) continue;

      try {
        if (isIngreso) {
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
            concept,
            referenceId: transaction.id,
            bodega: transaction.bodega || "Bodega Central"
          });
        } else {
          await registrarMovimientoKardex(db, appId, {
            productId: item.productId,
            type: 'salida',
            quantity: Number(item.quantity) || 0,
            cost: 0,
            price: 0,
            concept,
            referenceId: transaction.id,
            bodega: transaction.bodega || "Bodega Central"
          });
        }
      } catch (err) {
        console.error("Error al reversar movimiento de inventario para item:", item, err);
      }
    }

    const txRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', transaction.id);
    await setDoc(txRef, { inventarioRegistrado: false }, { merge: true });
  };

  const handleSave = (options = {}) => {
    // If called via form submit event, prevent default
    if (options && typeof options.preventDefault === 'function') {
      options.preventDefault();
      options = {};
    }

    // Validate first before showing confirmation dialog
    if (!validateForm()) return;

    const { isFinalizingNotaVenta = false } = options;

    let title = "";
    let message = "";
    let type = "info";

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
    if (!validateForm()) return;

    try {
      const docId = formData.id || `tx_${new Date().getTime()}`;
      let updatedFormData = { ...formData };

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
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const configData = configSnap.data();
          const secVal = configData.secuencialNotaVenta || 1;
          const sec = String(secVal);
          const docNum = `${configData.establecimiento || '001'}-${configData.puntoEmision || '001'}-${String(sec).padStart(9, '0')}`;
          
          updatedFormData.secuencial = sec;
          updatedFormData.documentNumber = docNum;
          updatedFormData.sriStatus = 'autorizado'; // Finalize and lock the document
          
          // Increment and save the sequential counter
          await setDoc(configRef, { secuencialNotaVenta: secVal + 1 }, { merge: true });
        }
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

      const finalTxData = {
        ...updatedFormData,
        id: docId,
        paidAmount,
        paymentStatus,
        paymentMethod: primaryMethod,
        paymentsBreakdown: payBreakdown,
        transferenciaRef: payments.transferenciaRef || '',
        tarjetaRef: payments.tarjetaRef || '',
        cruceRef: payments.cruceRef || '',
        creditDueDate: crVal > 0 ? creditDueDate : '',
        creditObservations: crVal > 0 ? creditObservations : '',
        updatedAt: now.toISOString(),
        updatedBy: 'Usuario ERP'
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), sanitizeFirestoreData(finalTxData), { merge: true });

      // Si es un egreso (compra/gasto) o se está finalizando una Nota de Venta (ingreso)
      if (finalTxData.type !== 'ingreso' || isFinalizingNotaVenta) {
        await registrarInventarioTransaccion(finalTxData);
        finalTxData.inventarioRegistrado = true;
      }

      showToast('Transacción guardada', 'success');
      setFormData(finalTxData);
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      showToast('Error al guardar: ' + (err.message || ''), 'error');
    }
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

  const enviarCorreoComprobante = async (txData, cliente, configSRI) => {
    if (txData?.documentType === 'nota_venta') {
      console.log("Los recibos (nota de venta) son de registro interno y no se envían por correo. Omitiendo envío de correo.");
      return;
    }

    if (!cliente?.email || cliente.email.includes('consumidorfinal') || cliente.email.trim() === '') {
      console.log("El cliente no tiene un correo válido registrado. Omitiendo envío de correo.");
      return;
    }

    if (!configSRI.smtpHost || !configSRI.smtpUser || !configSRI.smtpPass) {
      console.log("Servidor SMTP no configurado en los ajustes. Omitiendo envío de correo.");
      return;
    }

    try {
      const emailPayload = {
        smtpHost: configSRI.smtpHost,
        smtpPort: configSRI.smtpPort,
        smtpUser: configSRI.smtpUser,
        smtpPass: configSRI.smtpPass,
        smtpSecure: configSRI.smtpSecure,
        to: cliente.email,
        clientName: cliente.name,
        clientIdentification: cliente.ruc || cliente.identificacion || '',
        documentNumber: txData.documentNumber,
        total: txData.total,
        pdfUrl: txData.pdfUrl || '',
        xmlUrl: txData.xmlUrl || '',
        companyName: configSRI.nombreComercial || configSRI.razonSocial || 'Facturación Electrónica',
        logoUrl: configSRI.logoUrl || '',
        companyRuc: configSRI.ruc || '',
        companyAddress: configSRI.direccionMatriz || '',
        companyPhone: configSRI.telefono || configSRI.telefonoContacto || '',
        claveAcceso: txData.claveAcceso || '',
        fechaAutorizacion: txData.fechaAutorizacion || getEcuadorDateTimeString(),
        documentType: txData.documentType || 'factura',
        date: txData.date || ''
      };

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Correo de comprobante enviado a ${cliente.email}`, 'success');
      } else {
        console.error("Fallo al enviar correo:", data.error);
        showToast(`No se pudo enviar el correo: ${data.error}`, 'warning');
      }
    } catch (err) {
      console.error("Error al conectar con la API de envío de correos:", err);
    }
  };

  const executeEmitirSRI = async () => {
    if (!validateForm()) return;

    const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;

    setIsEmitting(true);
    setSriLogs([]);

    try {
      // 1. Determinar la clave de secuencial según el tipo de documento
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
      let secKey = 'secuencialFactura';
      if (formData.documentType === 'factura') {
        secKey = 'secuencialFactura';
      } else if (formData.documentType === 'retencion') {
        secKey = 'secuencialRetencion';
      } else if (formData.documentType === 'nota_credito') {
        secKey = 'secuencialNotaCredito';
      } else if (formData.documentType === 'liquidacion') {
        secKey = 'secuencialLiquidacion';
      } else if (formData.documentType === 'guia_remision') {
        secKey = 'secuencialGuiaRemision';
      }

      // Reservar el secuencial de forma ATÓMICA antes de transmitir. Esto evita
      // que dos emisiones simultáneas generen la misma clave de acceso (el SRI
      // rechaza secuenciales duplicados). El SRI permite saltos en la numeración,
      // por lo que un fallo de transmisión solo deja un hueco, nunca un duplicado.
      let configData;
      let secVal;
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(configRef);
        if (!snap.exists()) {
          throw new Error("No se pudo obtener la configuración del emisor SRI");
        }
        configData = snap.data();
        secVal = configData[secKey] || 1;
        tx.update(configRef, { [secKey]: secVal + 1 });
      });
      setSriConfig(configData); // Sync local state

      const sec = String(secVal);
      const docNum = `${configData.establecimiento || '001'}-${configData.puntoEmision || '001'}-${String(sec).padStart(9, '0')}`;
      
      // Generar y asociar un código numérico aleatorio único de 8 dígitos si no existe
      const codigoNumerico = formData.codigoNumerico || Math.floor(10000000 + Math.random() * 90000000).toString();
      
      const now = new Date();
      const serverDate = getEcuadorDateString(now);
      const serverTime = getEcuadorTimeString(now);

      const docData = { ...formData, date: serverDate, time: serverTime, secuencial: sec, codigoNumerico };

      let xmlObj;
      if (formData.documentType === 'factura') {
        xmlObj = generarFacturaXML(configData, docData, matchedTercero, formData.items);
      } else if (formData.documentType === 'retencion') {
        xmlObj = generarRetencionXML(configData, docData, matchedTercero);
      } else if (formData.documentType === 'nota_credito') {
        xmlObj = generarNotaCreditoXML(configData, docData, matchedTercero, formData.items);
      } else if (formData.documentType === 'liquidacion') {
        xmlObj = generarLiquidacionXML(configData, docData, matchedTercero, formData.items);
      } else if (formData.documentType === 'guia_remision') {
        xmlObj = generarGuiaRemisionXML(configData, docData, matchedTercero, formData.items);
      } else {
        xmlObj = generarFacturaXML(configData, docData, matchedTercero, formData.items);
      }

      let { xml, claveAcceso } = xmlObj;
      let signedXml = xml;

      // Firma XAdES-BES real si el certificado y la contraseña están cargados
      if (configData.certificadoCargado && configData.certificadoBase64 && configData.certificadoClave) {
        setSriLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: "Firmando XML con firma digital XAdES-BES real...", status: 'info' }]);
        try {
          signedXml = firmarComprobanteXML(xml, configData.certificadoBase64, configData.certificadoClave);
          setSriLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: "XML firmado criptográficamente de manera exitosa (Real).", status: 'success' }]);
        } catch (signErr) {
          console.error(signErr);
          setSriLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: `Firma Fallida: ${signErr.message}`, status: 'error' }]);
          throw new Error(`Error en la firma digital: ${signErr.message}. Verifique la contraseña de su firma electrónica.`);
        }
      } else {
        if (configData.ambiente === '2') {
          throw new Error("No se puede emitir facturas en ambiente de PRODUCCIÓN sin una firma electrónica (.p12) cargada. Por favor, configure su firma digital en Ajustes > Perfil de Empresa.");
        }
      }

      const result = await simularTransmisionSRI(
        {
          rucReceptor: matchedTercero.ruc,
          tipoIdentificacion: matchedTercero.tipoIdentificacion,
          isValidated: matchedTercero.isValidated || matchedTercero.validado,
          validado: matchedTercero.isValidated || matchedTercero.validado,
          total: formData.total,
          claveAcceso,
          xml: signedXml
        },
        configData,
        (logs) => setSriLogs(logs)
      );

      const docId = formData.id || `tx_${new Date().getTime()}`;

      // Compute paidAmount and status based on multi-payment breakdown
      const totalNum = Number(formData.total) || 0;
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
        credito: crVal
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

      const finalTx = {
        ...formData,
        id: docId,
        date: serverDate,
        time: serverTime,
        secuencial: sec, // Save the dynamically assigned sequential number
        documentNumber: docNum,
        sriStatus: 'autorizado',
        claveAcceso: result.claveAcceso,
        fechaAutorizacion: result.fechaAutorizacion || getEcuadorDateTimeString(),
        codigoNumerico, // Guardar el código numérico generado
        xmlUrl: result.xmlUrl,
        pdfUrl: result.pdfUrl,
        paidAmount,
        paymentStatus,
        paymentsBreakdown: payBreakdown,
        transferenciaRef: payments.transferenciaRef || '',
        tarjetaRef: payments.tarjetaRef || '',
        cruceRef: payments.cruceRef || '',
        paymentMethod: primaryMethod,
        creditDueDate: crVal > 0 ? creditDueDate : '',
        creditObservations: crVal > 0 ? creditObservations : '',
        updatedAt: now.toISOString(),
        updatedBy: 'Servicio Fiscal SRI'
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), sanitizeFirestoreData(finalTx));

      // Registrar en el Kardex y actualizar stock al emitir factura autorizada
      await registrarInventarioTransaccion(finalTx);
      finalTx.inventarioRegistrado = true;

      // El secuencial ya fue reservado e incrementado atómicamente al inicio
      // (transacción), por lo que aquí no es necesario volver a incrementarlo.

      setFormData(finalTx);
      showToast('Comprobante autorizado tributariamente por el SRI', 'success');

      // Enviar correo de comprobante al cliente de forma asíncrona
      enviarCorreoComprobante(finalTx, matchedTercero, configData);

      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      if (err.logs) setSriLogs(err.logs);
      showToast(err.error || err.message || 'Fallo en la autorización del SRI', 'error');
    } finally {
      setIsEmitting(false);
    }
  };

  const handleAnular = () => {
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
      const docId = formData.id;
      const isNotaVenta = formData.documentType === 'nota_venta';

      // Reversar el inventario si ya estaba registrado
      await reversarInventarioTransaccion(formData);

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), sanitizeFirestoreData({
        sriStatus: 'anulado',
        inventarioRegistrado: false,
        updatedAt: new Date().toISOString()
      }), { merge: true });
      
      setFormData(prev => ({ ...prev, sriStatus: 'anulado', inventarioRegistrado: false }));
      showToast(isNotaVenta ? "Nota de Venta anulada exitosamente" : "Comprobante anulado tributariamente", "success");
    } catch (e) {
      showToast("Error al anular", "error");
    }
  };

  const downloadXMLFile = () => {
    if (!formData.claveAcceso) return;
    const element = document.createElement("a");
    const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
    
    let xmlObj;
    if (formData.documentType === 'factura') {
      xmlObj = generarFacturaXML(sriConfig, formData, matchedTercero, formData.items);
    } else if (formData.documentType === 'retencion') {
      xmlObj = generarRetencionXML(sriConfig, formData, matchedTercero);
    } else if (formData.documentType === 'nota_credito') {
      xmlObj = generarNotaCreditoXML(sriConfig, formData, matchedTercero, formData.items);
    } else if (formData.documentType === 'liquidacion') {
      xmlObj = generarLiquidacionXML(sriConfig, formData, matchedTercero, formData.items);
    } else if (formData.documentType === 'guia_remision') {
      xmlObj = generarGuiaRemisionXML(sriConfig, formData, matchedTercero, formData.items);
    } else {
      xmlObj = generarFacturaXML(sriConfig, formData, matchedTercero, formData.items);
    }

    let finalXml = xmlObj.xml;
    if (sriConfig.certificadoCargado && sriConfig.certificadoBase64 && sriConfig.certificadoClave) {
      try {
        finalXml = firmarComprobanteXML(finalXml, sriConfig.certificadoBase64, sriConfig.certificadoClave);
      } catch (e) {
        console.error("Error signing XML during download", e);
      }
    }

    const file = new Blob([finalXml], {type: 'text/xml'});
    element.href = URL.createObjectURL(file);
    element.download = `${formData.claveAcceso}.xml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isAuthorized = formData.sriStatus === 'autorizado';
  const isAnulado = formData.sriStatus === 'anulado';
  const isEditable = !isAuthorized && !isAnulado;
  // Documento finalizado en paso 2 — no se puede regresar ni editar desde aquí
  const isLockedInStep2 = (isAuthorized || isAnulado) && currentStep === 2;
  const hasItems = formData.items && formData.items.length > 0;

  const handleNextStep = () => {
    if (currentStep === 1) {
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
        showToast(pStatus.error, 'error');
        return;
      }

      // Must be emitted or registered before printing in Step 3
      if (isEditable && !formData.documentNumber) {
        showToast('Debes registrar la venta o emitir el comprobante al SRI antes de continuar', 'error');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 2));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const inputClass = `w-full text-sm px-[10px] py-[6px] rounded-input outline-none transition-all border font-semibold ${
    isDarkMode 
      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-primary/50 disabled:opacity-50' 
      : 'bg-white border-gray-200 text-black placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:bg-gray-50 disabled:text-gray-500'
  }`;

  const labelClass = `block text-[10px] font-bold uppercase mb-[4px] ${
    isDarkMode ? 'text-gray-300' : 'text-black'
  }`;

  const cardClass = `p-[12px] rounded-card border ${
    isDarkMode ? 'bg-[#18181b] border-white/10' : 'bg-white border-gray-150 text-black'
  }`;

  const sectionTitleClass = `text-xs font-bold uppercase ${
    isDarkMode ? 'text-white' : 'text-black'
  }`;

  const steps = [
    { id: 1, name: 'Detalle y Productos' },
    { id: 2, name: 'Impresión' }
  ];

  const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
  const filteredClients = (thirdParties || [])
    .filter(tp => formData.type === 'ingreso' ? tp.type !== 'proveedor' : tp.type === 'proveedor')
    .filter(tp =>
      !clientSearchTerm ||
      tp.name?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      tp.ruc?.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );
  const paymentStatus = calculatePaymentStatus();
  const efVal = Number(payments.efectivo) || 0;
  const tjVal = Number(payments.tarjeta) || 0;
  const trVal = Number(payments.transferencia) || 0;
  const crVal = Number(payments.cruce_cuentas) || 0;
  const totalPaid = efVal + tjVal + trVal + crVal;

  const formJSX = (
    <div className={isInline ? `w-full flex flex-col font-sans animate-in fade-in duration-300 ${isDarkMode ? 'bg-transparent text-white' : 'bg-transparent text-black'}` : `fixed inset-0 z-[100] w-screen h-screen overflow-y-auto flex flex-col font-sans ${isDarkMode ? 'bg-[#0c0c0e] text-white' : 'bg-gray-50 text-black'}`}>
      
      {/* TOP HEADER */}
      <div className={`sticky top-0 z-20 flex items-center justify-between px-[8px] py-[5px] border-b backdrop-blur-md ${isDarkMode ? 'border-white/5 bg-[#151517]/95' : 'border-gray-200 bg-white/95'}`}>
        <div className="flex items-center gap-[5px]">
          {!isInline && (
            <div className={`p-[5px] rounded-card ${formData.type === 'ingreso' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              <Calculator size={16} />
            </div>
          )}
          <div>
            {/* Desktop / Tablet Header Title */}
            <h2 className="text-xs font-black uppercase tracking-wider text-black dark:text-white hidden sm:block">
              {formData.type === 'ingreso' ? 'Asistente de Ventas' : 'Asistente de Compras'}
            </h2>
            {/* Mobile Header Title */}
            <h2 className="text-xs font-black uppercase tracking-wider text-black dark:text-white sm:hidden">
              {formData.type === 'ingreso' ? 'Ventas' : 'Compras'}
            </h2>
            {formData.claveAcceso && <p className="text-[9px] font-mono text-black dark:text-white/60 mt-[1px]">Clave SRI: {formData.claveAcceso}</p>}
          </div>
        </div>

        {/* COMPACT STEPPER (Clean, non-button indicators) */}
        {!isInline && (
          <div className="flex items-center gap-[5px]">
            {steps.map((step, idx) => (
              <button
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
                className={`flex items-center gap-[3px] focus:outline-none transition-all ${
                  currentStep === step.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                  currentStep === step.id
                    ? 'bg-[#1C40F2] text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                }`}>
                  {step.id}
                </span>
                <span className={`hidden sm:inline text-[9px] font-extrabold uppercase ${
                  currentStep === step.id ? 'text-[#1C40F2]' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {step.name}
                </span>
                {idx < steps.length - 1 && (
                  <span className="text-slate-300 dark:text-white/10 font-normal ml-1">/</span>
                )}
              </button>
            ))}
          </div>
        )}
        <button 
          onClick={onClose} 
          className="btn-secondary"
        >
          <X size={12} />
          <span>{isInline ? 'Cancelar' : 'Cerrar'}</span>
        </button>
      </div>

      {/* STATE BANNERS (Sri authorized / canceled) */}
      {isAuthorized && (
        <div className="m-[5px] mb-0 p-[5px] rounded-card border border-dashed bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex items-center gap-[3px]">
          <CheckCircle2 size={16} className="shrink-0" />
          <div className="text-[10px]">
            <p className="font-bold text-black dark:text-white">
              {formData.documentType === 'nota_venta' ? 'Comprobante de Venta Guardado' : 'Comprobante Autorizado por el SRI'}
            </p>
            <p className="opacity-80 text-black dark:text-white font-normal">
              {formData.documentType === 'nota_venta' 
                ? 'Este documento ha sido guardado para control interno y no puede ser editado ni eliminado. Para corregirlo, anule este comprobante.' 
                : 'Este documento tiene efectos fiscales y no puede ser editado ni eliminado. Para corregirlo, emita una Nota de Crédito.'}
            </p>
          </div>
        </div>
      )}

      {isAnulado && (
        <div className="m-[5px] mb-0 p-[5px] rounded-card border border-dashed bg-red-500/10 border-red-500/20 text-red-400 flex items-center gap-[3px]">
          <ShieldAlert size={16} className="shrink-0" />
          <div className="text-[10px]">
            <p className="font-bold text-black dark:text-white">Comprobante Anulado</p>
            <p className="opacity-80 text-black dark:text-white font-normal">
              {formData.documentType === 'nota_venta'
                ? 'Este documento ha sido anulado de forma definitiva.'
                : 'Este documento ya no tiene validez tributaria ante el SRI.'}
            </p>
          </div>
        </div>
      )}

      {/* STEP CONTAINER BODY */}
      <div className="flex-1 p-[12px] max-w-[1600px] w-full mx-auto">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PASO 1: CABECERA, PRODUCTOS & PAGO (MINI POS)           */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-[12px]">
            {/* Mobile Navigation Tabs */}
            <div className="flex lg:hidden w-full p-[3px] rounded-card bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 gap-[3px] mb-[4px]">
              {[
                { 
                  id: 'cliente', 
                  label: 'Cliente', 
                  icon: User,
                  badge: formData.thirdPartyId ? (
                    <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">Listo</span>
                  ) : (
                    <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">Pendiente</span>
                  ),
                  activeBadge: formData.thirdPartyId ? (
                    <span className="text-[9px] font-extrabold text-[#1C40F2] bg-white px-2 py-0.5 rounded-full">Listo</span>
                  ) : (
                    <span className="text-[9px] font-extrabold text-[#1C40F2] bg-white px-2 py-0.5 rounded-full">Pendiente</span>
                  )
                },
                { 
                  id: 'carrito', 
                  label: 'Carrito', 
                  icon: Layers,
                  badge: (
                    <span className="text-[9px] font-extrabold text-slate-650 dark:text-slate-350 bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded-full">
                      {formData.items?.length || 0}
                    </span>
                  ),
                  activeBadge: (
                    <span className="text-[9px] font-extrabold text-[#1C40F2] bg-white px-2 py-0.5 rounded-full">
                      {formData.items?.length || 0}
                    </span>
                  )
                },
                { 
                  id: 'pago', 
                  label: 'Pago', 
                  icon: CreditCard,
                  badge: (
                    <span className="text-[9px] font-extrabold text-emerald-650 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      ${Number(formData.total).toFixed(2)}
                    </span>
                  ),
                  activeBadge: (
                    <span className="text-[9px] font-extrabold text-[#1C40F2] bg-white px-2 py-0.5 rounded-full">
                      ${Number(formData.total).toFixed(2)}
                    </span>
                  )
                }
              ].map(tab => {
                const isActive = mobileTab === tab.id;
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id)}
                    className={`flex-1 flex flex-col items-center justify-center py-[5px] px-[2px] rounded-[var(--radius-button)] transition-all ${
                      isActive 
                        ? 'bg-[#1C40F2] text-white font-black'
                        : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-650 hover:text-black hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-[3px] mb-[2px]">
                      <IconComponent size={11} className="shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                    </div>
                    {isActive ? tab.activeBadge : tab.badge}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-12 gap-[12px] animate-in fade-in slide-in-from-bottom duration-300">
              {/* Left Column: lg:col-span-8 */}
              <div className="col-span-12 lg:col-span-8 space-y-[12px]">
                
                {/* Card 1: Client and location details */}
                <div className={`${cardClass} ${mobileTab === 'cliente' ? 'block' : 'hidden lg:block'}`}>
                <div className="flex items-center gap-[6px] mb-[10px]">
                  <div className="text-[#1C40F2]">
                    <User size={14} />
                  </div>
                  <h4 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[11px] font-bold uppercase">
                    Datos del Cliente y Emisión
                  </h4>
                </div>
                
                {/* Client Search + Quick Add row */}
                <div className="flex gap-[8px] items-center mb-[10px]">
                  <div className="flex-1 relative">
                    <input 
                      disabled={!isEditable}
                      type="text"
                      value={clientSearchTerm}
                      onChange={e => setClientSearchTerm(e.target.value)}
                      className={`${inputClass} pl-[25px] pr-[20px]`}
                      placeholder={matchedTercero ? `${matchedTercero.name} — RUC/CI: ${matchedTercero.ruc}` : "Escribe para buscar cliente..."}
                    />
                    <Search className={`absolute left-[8px] top-[7px] ${isDarkMode ? 'text-gray-400' : 'text-black'}`} size={12} />
                    {clientSearchTerm && (
                      <button type="button" onClick={() => setClientSearchTerm('')} className="absolute right-[8px] top-[7px] text-gray-400 hover:text-red-500">
                        <X size={12} />
                      </button>
                    )}
                    
                    {clientSearchTerm.trim() !== '' && (
                      <div className={`absolute z-30 w-full rounded-card border shadow-xl max-h-60 overflow-y-auto mt-1 ${
                        isDarkMode ? 'bg-[#1e1e22] border-white/10 text-white' : 'bg-white border-gray-300 text-black'
                      }`}>
                        {filteredClients.slice(0, 10).map(tp => (
                          <button
                            key={tp.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, thirdPartyId: tp.id }));
                              setClientSearchTerm('');
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex flex-col border-b last:border-0 transition-colors ${
                              isDarkMode ? 'border-white/5 hover:bg-white/10 text-white' : 'border-gray-100 hover:bg-primary-light text-black'
                            }`}
                          >
                            <span className="font-bold">{tp.name}</span>
                            <span className="text-[10px] font-mono opacity-80">RUC/CI: {tp.ruc} | Tel: {tp.telefono || 'S/N'}</span>
                          </button>
                        ))}
                        {filteredClients.length === 0 && (
                          <div className="p-3 text-center text-xs text-gray-500 font-mono">
                            No se encontraron clientes. Usa (+) para crear uno.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddFormData({
                          name: '', ruc: '', email: '', tipoIdentificacion: 'ruc',
                          direccion: '', telefono: '', tipoContribuyente: 'general'
                        });
                        setIsQuickAddOpen(true);
                      }}
                      className="btn-icon bg-primary text-white hover:bg-primary-hover shrink-0"
                      title="Crear Contacto Rápido"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>

                {/* Client detail card (extremely compact) */}
                {matchedTercero ? (
                  <div className={`grid grid-cols-1 sm:grid-cols-3 gap-[10px] p-[8px] rounded-[8px] ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-150'} mb-[8px] text-[11px]`}>
                    <div>
                      <p className={`uppercase text-[9px] font-bold ${isDarkMode ? 'text-white/60' : 'text-[#000000]/60'}`}>Razón Social</p>
                      <p style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-semibold truncate uppercase text-[11px]">{matchedTercero.name}</p>
                    </div>
                    <div>
                      <p className={`uppercase text-[9px] font-bold ${isDarkMode ? 'text-white/60' : 'text-[#000000]/60'}`}>RUC / CI</p>
                      <p style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-semibold text-[11px]">{matchedTercero.ruc}</p>
                    </div>
                    <div>
                      <p className={`uppercase text-[9px] font-bold ${isDarkMode ? 'text-white/60' : 'text-[#000000]/60'}`}>Teléfono / Correo</p>
                      <p style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-semibold truncate uppercase text-[11px]">
                        {matchedTercero.telefono || 'S/N'} {matchedTercero.email ? `| ${matchedTercero.email}` : ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-[8px] flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed ${isDarkMode ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-red-200 bg-red-50 text-red-600'} mb-[8px] text-[11px] font-semibold`}>
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>Selecciona un cliente para habilitar la facturación.</span>
                  </div>
                )}

                {/* Document Type, Establishment, Bodega, Reference in a compact grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[8px]">
                  <div>
                    <label className={labelClass}>Tipo Documento</label>
                    <select 
                      disabled={!isEditable} 
                      value={formData.documentType} 
                      onChange={e => {
                        const newDocType = e.target.value;
                        if (sriConfig?.rucActivo === false && newDocType === 'factura') {
                          showToast("El RUC de la empresa está inactivo. Solo puede emitir Notas de Venta.", "error");
                          return;
                        }
                        let nextSec = '1';
                        if (newDocType === 'factura') nextSec = String(sriConfig?.secuencialFactura || 1);
                        else if (newDocType === 'retencion') nextSec = String(sriConfig?.secuencialRetencion || 1);
                        else if (newDocType === 'nota_credito') nextSec = String(sriConfig?.secuencialNotaCredito || 1);
                        else if (newDocType === 'liquidacion') nextSec = String(sriConfig?.secuencialLiquidacion || 1);
                        else if (newDocType === 'guia_remision') nextSec = String(sriConfig?.secuencialGuiaRemision || 1);
                        else if (newDocType === 'nota_venta') nextSec = String(sriConfig?.secuencialNotaVenta || 1);
                        setFormData(prev => ({ ...prev, documentType: newDocType, secuencial: nextSec }));
                      }} 
                      className={`${inputClass} uppercase`}
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
                    </select>
                  </div>
                  
                  <div>
                    <label className={labelClass}>Fecha Emisión</label>
                    <input 
                      disabled={true} 
                      type="text" 
                      value={formData.date ? formData.date.split('-').reverse().join('/') : ''} 
                      className={`${inputClass} text-center cursor-not-allowed`} 
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Establecimiento</label>
                    <select 
                      disabled={!isEditable} 
                      value={formData.establecimiento || sriConfig?.establecimiento || '001'} 
                      onChange={e => setFormData({...formData, establecimiento: e.target.value})} 
                      className={inputClass}
                    >
                      <option value={sriConfig?.establecimiento || '001'}>{sriConfig?.establecimiento || '001'} - Sucursal Matriz</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Bodega</label>
                    <select 
                      disabled={!isEditable} 
                      value={formData.bodega || 'Bodega Central'} 
                      onChange={e => setFormData({...formData, bodega: e.target.value})} 
                      className={inputClass}
                    >
                      <option value="Bodega Central">Bodega Central</option>
                      <option value="Bodega de Exhibición">Bodega de Exhibición</option>
                    </select>
                  </div>
                </div>

                {/* Second row of info: Reference & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px] mt-[8px]">
                  <div>
                    <label className={labelClass}>Referencia</label>
                    <input 
                      disabled={!isEditable} 
                      type="text" 
                      value={formData.referencia || ''} 
                      onChange={e => setFormData({...formData, referencia: e.target.value})} 
                      className={inputClass} 
                      placeholder="Ej. Pedido #1024 o Código de Compra" 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Descripción</label>
                    <input 
                      disabled={!isEditable} 
                      type="text" 
                      value={formData.description || ''} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      className={inputClass} 
                      placeholder="Notas del documento..." 
                    />
                  </div>
                </div>

                {/* Extra fields for Nota Credito and Guia Remision inside the same card */}
                {formData.documentType === 'nota_credito' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px] border-t border-dashed mt-[8px] pt-[8px] border-gray-150 dark:border-white/10">
                    <div>
                      <label className={labelClass}>Doc Modificado</label>
                      <select disabled={!isEditable} value={formData.codDocModificado || '01'} onChange={e => setFormData({...formData, codDocModificado: e.target.value})} className={inputClass}>
                        <option value="01">Factura</option>
                        <option value="03">Liquidación de Compra</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Nro. Doc Modificado</label>
                      <input disabled={!isEditable} type="text" required value={formData.numDocModificado || ''} onChange={e => setFormData({...formData, numDocModificado: e.target.value})} className={inputClass} placeholder="001-001-000000123" />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha Emisión Doc</label>
                      <input disabled={!isEditable} type="date" required value={formData.fechaEmisionDocSustento || ''} onChange={e => setFormData({...formData, fechaEmisionDocSustento: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Motivo</label>
                      <input disabled={!isEditable} type="text" required value={formData.motivo || ''} onChange={e => setFormData({...formData, motivo: e.target.value})} className={inputClass} placeholder="Devolución" />
                    </div>
                  </div>
                )}

                {formData.documentType === 'guia_remision' && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-[8px] border-t border-dashed mt-[8px] pt-[8px] border-gray-150 dark:border-white/10">
                    <div>
                      <label className={labelClass}>Placa</label>
                      <input disabled={!isEditable} type="text" required value={formData.placa || ''} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} className={inputClass} placeholder="PBA1234" />
                    </div>
                    <div>
                      <label className={labelClass}>Motivo Traslado</label>
                      <input disabled={!isEditable} type="text" required value={formData.motivoTraslado || ''} onChange={e => setFormData({...formData, motivoTraslado: e.target.value})} className={inputClass} placeholder="Venta" />
                    </div>
                    <div>
                      <label className={labelClass}>Partida</label>
                      <input disabled={!isEditable} type="text" required value={formData.dirPartida || ''} onChange={e => setFormData({...formData, dirPartida: e.target.value})} className={inputClass} placeholder="Origen" />
                    </div>
                    <div>
                      <label className={labelClass}>Destino</label>
                      <input disabled={!isEditable} type="text" value={formData.dirDestino || ''} onChange={e => setFormData({...formData, dirDestino: e.target.value})} className={inputClass} placeholder="Destino" />
                    </div>
                    <div>
                      <label className={labelClass}>Ruta</label>
                      <input disabled={!isEditable} type="text" value={formData.ruta || ''} onChange={e => setFormData({...formData, ruta: e.target.value})} className={inputClass} placeholder="Quito - Guayaquil" />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha Inicio</label>
                      <input disabled={!isEditable} type="date" required value={formData.fechaIniTransporte || ''} onChange={e => setFormData({...formData, fechaIniTransporte: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha Fin</label>
                      <input disabled={!isEditable} type="date" required value={formData.fechaFinTransporte || ''} onChange={e => setFormData({...formData, fechaFinTransporte: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>RUC Transportista</label>
                      <input disabled={!isEditable} type="text" value={formData.rucTransportista || ''} onChange={e => setFormData({...formData, rucTransportista: e.target.value})} className={inputClass} placeholder="RUC" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Nro. Doc Sustento</label>
                      <input disabled={!isEditable} type="text" value={formData.numDocSustento || ''} onChange={e => setFormData({...formData, numDocSustento: e.target.value})} className={inputClass} placeholder="001-001-000000123" />
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Product selector + Cart table */}
              {formData.documentType === 'retencion' ? (
                /* Retenciones Desglose Table */
                <div className={cardClass}>
                  <div className="flex justify-between items-center mb-[10px]">
                    <div className="flex items-center gap-[6px]">
                      <div className="text-[#1C40F2]">
                        <Layers size={14} />
                      </div>
                      <h3 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[11px] font-bold uppercase">Desglose de Retenciones</h3>
                    </div>
                    {isEditable && (
                      <button type="button" onClick={handleAddRetencion} className="btn-secondary h-8 px-3 text-xs flex items-center gap-[4px]">
                        <Plus size={12} /> Añadir Fila
                      </button>
                    )}
                  </div>
                  <div className="space-y-[8px] max-h-[50vh] overflow-y-auto pr-1">
                    {(formData.retenciones || []).map((ret, index) => (
                      <div key={index} className={`p-[8px] rounded-[8px] border space-y-[8px] relative ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-150'}`}>
                        {isEditable && (
                          <button type="button" onClick={() => handleRemoveRetencion(index)} className="absolute top-[5px] right-[5px] btn-icon text-red-500 hover:bg-red-500/10">
                            <Trash2 size={12} />
                          </button>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px]">
                          <div>
                            <label className={labelClass}>Impuesto</label>
                            <select disabled={!isEditable} value={ret.codigo} onChange={(e) => handleRetencionChange(index, 'codigo', e.target.value)} className={inputClass}>
                              <option value="1">Renta</option>
                              <option value="2">IVA</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelClass}>Concepto / Código SRI</label>
                            <select disabled={!isEditable} value={ret.codigoRetencion} onChange={(e) => handleRetencionChange(index, 'codigoRetencion', e.target.value)} className={inputClass}>
                              {ret.codigo === '1' ? 
                                SRI_RENTA_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>) :
                                SRI_IVA_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)
                              }
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-[8px]">
                          <div>
                            <label className={labelClass}>Base Imponible ($)</label>
                            <input disabled={!isEditable} type="number" step="0.01" value={ret.baseImponible || ''} onChange={(e) => handleRetencionChange(index, 'baseImponible', e.target.value)} className={inputClass} placeholder="0.00" />
                          </div>
                          <div>
                            <label className={labelClass}>Porcentaje (%)</label>
                            <input disabled={!isEditable} type="number" step="0.1" value={ret.porcentajeRetener || ''} onChange={(e) => handleRetencionChange(index, 'porcentajeRetener', e.target.value)} className={inputClass} placeholder="0.0" />
                          </div>
                          <div>
                            <label className={labelClass}>Valor Retenido</label>
                            <div style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className={`px-[10px] py-[6px] rounded-[8px] border text-center font-bold text-xs ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-150'}`}>
                              ${Number(ret.valorRetenido || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px] border-t border-dashed pt-[8px] border-gray-150 dark:border-white/10">
                          <div>
                            <label className={labelClass}>Doc. Sustento</label>
                            <select disabled={!isEditable} value={ret.codDocSustento || '01'} onChange={(e) => handleRetencionChange(index, 'codDocSustento', e.target.value)} className={inputClass}>
                              <option value="01">Factura</option>
                              <option value="03">Liquidación de Compra</option>
                              <option value="05">Nota de Débito</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelClass}>Número de Factura Sustento</label>
                            <input disabled={!isEditable} type="text" value={ret.numDocSustento || ''} onChange={(e) => handleRetencionChange(index, 'numDocSustento', e.target.value)} className={inputClass} placeholder="001-001-000000045" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!formData.retenciones || formData.retenciones.length === 0) && (
                      <div style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="py-10 text-center text-xs italic">
                        No hay filas de retención. Haz clic en "Añadir Fila" para comenzar.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Products Table & Search card */
                <div className={`${cardClass} ${mobileTab === 'carrito' ? 'block' : 'hidden lg:block'}`}>
                  <div className="flex items-center gap-[5px] mb-[5px] flex-wrap">
                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[200px]">
                      <input 
                        type="text" 
                        value={productSearchTerm}
                        onChange={e => setProductSearchTerm(e.target.value)}
                        className={`${inputClass} pl-[25px] pr-[20px]`}
                        placeholder="Buscar por nombre, SKU o código de barras..."
                      />
                      <Search className={`absolute left-[8px] top-[7px] ${isDarkMode ? 'text-gray-400' : 'text-black'}`} size={12} />
                      {productSearchTerm && (
                        <button type="button" onClick={() => setProductSearchTerm('')} className="absolute right-[8px] top-[7px] text-gray-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                      )}
                      
                      {/* Search Results dropdown */}
                      {productSearchTerm.trim() !== '' && (
                        <div className={`absolute z-30 w-full rounded-card border shadow-xl max-h-60 overflow-y-auto mt-1 ${
                          isDarkMode ? 'bg-[#1e1e22] border-white/10' : 'bg-white border-gray-300'
                        }`}>
                          {products.filter(p => 
                            p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            p.codigoBarras?.toLowerCase().includes(productSearchTerm.toLowerCase())
                          ).slice(0, 10).map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleAddProductToCart(p)}
                              className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center border-b last:border-0 transition-colors ${
                                isDarkMode ? 'border-white/5 hover:bg-white/10 text-white' : 'border-gray-100 hover:bg-primary-light text-black'
                              }`}
                            >
                              <div>
                                <p style={{ color: isDarkMode ? '#ffffff' : '#000000' }} className="font-bold">{p.name}</p>
                                <p style={{ color: isDarkMode ? '#ffffff' : '#000000' }} className="text-[10px] font-mono">
                                  {p.sku ? `SKU: ${p.sku}` : ''} {p.codigoBarras ? ` | EAN: ${p.codigoBarras}` : ''}
                                </p>
                              </div>
                              <span className="font-bold text-primary">${Number(p.price).toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Search action buttons */}
                    {isEditable && (
                      <>
                        <button 
                          type="button"
                          onClick={() => {
                            setAdvSearchTerm(productSearchTerm);
                            setIsAdvancedSearchOpen(true);
                          }}
                          className="btn-secondary"
                          title="Búsqueda Avanzada de Productos"
                        >
                          <Search size={12} />
                          <span>Buscar</span>
                        </button>
                        
                        <button 
                          type="button" 
                          onClick={() => {
                            setQuickAddProductFormData({
                              name: '', sku: '', codigoBarras: '', price: '', baseCost: '', ivaCategory: 15, stock: ''
                            });
                            setIsQuickAddProductOpen(true);
                          }}
                          className="btn-primary"
                          title="Registrar y Agregar Nuevo Producto"
                        >
                          <Layers size={12} />
                          <Plus size={10} />
                          <span>Añadir</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Actions: discount, clear cart */}
                  <div className="flex items-center gap-[8px] mb-[8px] flex-wrap">
                    {/* General Discount */}
                    <div className={`flex items-center gap-[4px] rounded-[8px] border px-[8px] py-[4px] flex-1 min-w-[150px] ${
                      isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <Tag size={10} className="text-primary shrink-0" />
                      <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[11px] font-bold uppercase shrink-0">Dto:</span>
                      <select
                        disabled={!isEditable}
                        value={generalDiscountType}
                        onChange={e => {
                          setGeneralDiscountType(e.target.value);
                        }}
                        className={`text-[11px] font-bold border-0 bg-transparent outline-none ${isDarkMode ? 'text-white' : 'text-black'}`}
                      >
                        <option value="percent">%</option>
                        <option value="fixed">$</option>
                      </select>
                      <input
                        disabled={!isEditable}
                        type="number"
                        min="0"
                        step="0.01"
                        value={generalDiscountValue}
                        onChange={e => {
                          setGeneralDiscountValue(e.target.value);
                        }}
                        className={`w-12 text-[13px] font-bold bg-transparent outline-none text-center ${isDarkMode ? 'text-white' : 'text-black'}`}
                        placeholder="0"
                      />
                    </div>
                    
                    {/* Clear Cart */}
                    {isEditable && (formData.items || []).length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearItems}
                        className="btn-danger"
                      >
                        <Trash2 size={10} />
                        Limpiar
                      </button>
                    )}
                  </div>

                  {/* Cart Table */}
                  <div className="overflow-x-auto">
                    {(formData.items || []).length > 0 ? (
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className={`text-[11px] uppercase font-bold ${
                          isDarkMode ? 'bg-black/35 text-white/80 border-b border-white/10' : 'bg-gray-50 text-black border-b border-gray-150'
                        }`}>
                          <tr>
                            <th className="px-[8px] py-[6px]">Producto / Servicio</th>
                            <th className="px-[8px] py-[6px] text-center w-20">Cant.</th>
                            <th className="px-[8px] py-[6px] text-right w-24">P. Unit.</th>
                            {isEditable && <th className="px-[8px] py-[6px] text-right w-20 hidden sm:table-cell">Dto. ($)</th>}
                            <th className="px-[8px] py-[6px] text-right w-20">Subtotal</th>
                            {isEditable && <th className="px-[8px] py-[6px] text-center w-8"></th>}
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/10' : 'divide-gray-150'}`}>
                          {(formData.items || []).map((item, index) => {
                            const lineBase = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                            const lineDiscount = Math.min(lineBase, parseFloat(item.itemDiscount) || 0);
                            const subtotalLine = Math.max(0, lineBase - lineDiscount);
                            return (
                              <tr key={index} style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-medium text-[13px]">
                                <td className="px-[8px] py-[6px]">
                                  {item.productId ? (
                                    <div>
                                      <div className="font-bold text-[12px] truncate max-w-[250px]" title={item.name}>
                                        {item.name}
                                      </div>
                                      <span className="text-[10px] font-mono opacity-80">
                                        {item.sku ? `SKU: ${item.sku}` : ''}
                                      </span>
                                    </div>
                                  ) : (
                                    <select 
                                      disabled={!isEditable}
                                      value={item.productId} 
                                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)} 
                                      className={`text-[13px] px-[8px] py-[4px] rounded-[8px] border ${isDarkMode ? 'bg-[#151722] border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}
                                    >
                                      <option value="" disabled>Seleccionar...</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} — ${Number(p.price).toFixed(2)}</option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                                
                                <td className="px-[8px] py-[6px] text-center">
                                  <div className={`inline-flex items-center gap-[4px] border rounded-[8px] p-[3px] ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                                    <button type="button" disabled={!isEditable} onClick={() => {
                                      const q = parseInt(item.quantity) || 1;
                                      if (q > 1) handleItemChange(index, 'quantity', q - 1);
                                    }} className={`w-5 h-5 rounded-[var(--radius-button)] flex items-center justify-center font-bold text-xs ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}>-</button>
                                    <input disabled={!isEditable} type="number" value={item.quantity} min="1" onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} className={`w-8 text-center text-[11px] font-bold bg-transparent outline-none border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDarkMode ? 'text-white' : 'text-black'}`} />
                                    <button type="button" disabled={!isEditable} onClick={() => {
                                      handleItemChange(index, 'quantity', (parseInt(item.quantity) || 1) + 1);
                                    }} className={`w-5 h-5 rounded-[var(--radius-button)] flex items-center justify-center font-bold text-xs ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}>+</button>
                                  </div>
                                </td>

                                <td className="px-[8px] py-[6px] text-right">
                                  <div className="relative inline-block w-20">
                                    <span className="absolute left-[5px] top-[5px] text-[11px] font-bold opacity-80">$</span>
                                    <input disabled={!isEditable} type="number" step="0.01" required value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className={`w-full text-[11px] pl-[12px] pr-[2px] py-[4px] rounded-[6px] border outline-none text-right font-bold ${isDarkMode ? 'bg-[#151722] border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`} />
                                  </div>
                                </td>

                                {isEditable && (
                                  <td className="px-[8px] py-[6px] text-right hidden sm:table-cell">
                                    <div className="relative inline-block w-20">
                                      <span className="absolute left-[5px] top-[5px] text-[11px] font-bold text-orange-500">-$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.itemDiscount || ''}
                                        onChange={(e) => handleItemChange(index, 'itemDiscount', e.target.value)}
                                        className={`w-full text-[11px] pl-[14px] pr-[2px] py-[4px] rounded-[6px] border outline-none text-right font-bold ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-700'}`}
                                      />
                                    </div>
                                  </td>
                                )}

                                <td className="px-[8px] py-[6px] text-right font-mono font-bold text-[13px]">
                                  ${subtotalLine.toFixed(2)}
                                </td>

                                {isEditable && (
                                  <td className="px-[8px] py-[6px] text-center">
                                    <button type="button" onClick={() => handleRemoveItem(index)} className="btn-icon text-red-500 hover:bg-red-500/10">
                                      <Trash2 size={10} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="py-8 text-center text-xs italic rounded-[8px] border border-dashed border-gray-300">
                        No hay productos en el carrito. Utiliza el buscador.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: lg:col-span-4 */}
            <div className={`col-span-12 lg:col-span-4 space-y-[12px] ${mobileTab === 'pago' ? 'block' : 'hidden lg:block'}`}>
              
              {/* Totales Card */}
              <div className={cardClass}>
                <div className="flex items-center gap-[6px] mb-[10px]">
                  <div className="text-[#1C40F2]">
                    <Calculator size={14} />
                  </div>
                  <h3 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[11px] font-bold uppercase">Resumen e Impuestos</h3>
                </div>

                <div className={`p-[10px] rounded-[8px] border text-[13px] space-y-[6px] ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-150 text-black'}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold">Subtotal bruto:</span>
                    <span className="font-bold">
                      ${formData.documentType === 'retencion' 
                        ? Number(formData.baseImponible).toFixed(2)
                        : ((formData.items || []).reduce((a, it) => a + (parseFloat(it.price)||0)*(parseInt(it.quantity)||1), 0)).toFixed(2)
                      }
                    </span>
                  </div>

                  {formData.documentType !== 'retencion' && (
                    <>
                      {/* Descuento por ítem */}
                      {(formData.items || []).some(it => parseFloat(it.itemDiscount) > 0) && (
                        <div className="flex justify-between text-orange-500">
                          <span className="font-semibold">Dto. por ítem:</span>
                          <span className="font-bold">-${(formData.items||[]).reduce((a,it) => a + Math.min((parseFloat(it.price)||0)*(parseInt(it.quantity)||1), parseFloat(it.itemDiscount)||0),0).toFixed(2)}</span>
                        </div>
                      )}
                      {/* Descuento general */}
                      {parseFloat(generalDiscountValue) > 0 && (
                        <div className="flex justify-between text-orange-500">
                          <span className="font-semibold">Dto. general:</span>
                          <span className="font-bold">-${(() => {
                            const rawSub = (formData.items||[]).reduce((a,it) => a+(parseFloat(it.price)||0)*(parseInt(it.quantity)||1), 0);
                            const itemDiscs = (formData.items||[]).reduce((a,it) => a+Math.min((parseFloat(it.price)||0)*(parseInt(it.quantity)||1), parseFloat(it.itemDiscount)||0),0);
                            const afterItem = Math.max(0, rawSub - itemDiscs);
                            return generalDiscountType === 'percent'
                              ? (afterItem * Math.min(100, parseFloat(generalDiscountValue)||0) / 100).toFixed(2)
                              : Math.min(afterItem, parseFloat(generalDiscountValue)||0).toFixed(2);
                          })()}</span>
                        </div>
                      )}
                      
                      {/* Base imponible */}
                      <div className="flex justify-between border-t border-dashed pt-[4px] border-gray-150 dark:border-white/10">
                        <span className="font-semibold">Base imponible:</span>
                        <span className="font-bold">${Number(formData.baseImponible).toFixed(2)}</span>
                      </div>

                      {/* IVA static display */}
                      <div className="flex justify-between">
                        <span className="font-semibold">IVA ({formData.ivaPorcentaje}%):</span>
                        <span className="font-bold">${Number(formData.ivaValor).toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {formData.documentType === 'retencion' && (
                    <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                      <span className="font-semibold">Total Retenido:</span>
                      <span className="font-bold">${Number(formData.total).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-[8px] border-t font-bold border-gray-150 dark:border-white/10">
                    <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold text-[13px]">TOTAL:</span>
                    <span style={{ color: '#1C40F2' }} className="font-black text-2xl">${Number(formData.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payments Card (Omitted for retencion) */}
              {formData.documentType !== 'retencion' && (
                <div className={cardClass}>
                  <div className="flex items-center gap-[6px] mb-[10px]">
                    <div className="text-[#1C40F2]">
                      <CreditCard size={14} />
                    </div>
                    <h3 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[11px] font-bold uppercase">Medios de Pago</h3>
                  </div>

                  <div className="grid grid-cols-4 gap-[8px] mb-[10px]">
                    {[
                      { id: 'efectivo', label: 'Efectivo', icon: DollarSign, key: 'efectivo' },
                      { id: 'transferencia', label: 'Transf.', icon: RefreshCw, key: 'transferencia' },
                      { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, key: 'tarjeta' },
                      { id: 'cruce_cuentas', label: 'Crédito', icon: User, key: 'cruce_cuentas' }
                    ].map(m => {
                      const isSelected = activePayments[m.key];
                      const isClientSelected = !!formData.thirdPartyId;
                      return (
                        <button
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
                                if (m.key === 'cruce_cuentas') setIsCreditModalOpen(true);
                              }
                              return updated;
                            });
                          }}
                          className={`flex flex-col items-center justify-center p-[8px] rounded-[var(--radius-button)] border transition-all gap-[6px] ${
                            !isClientSelected
                              ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-white/5 dark:bg-white/5'
                              : isSelected 
                                ? 'bg-[#1C40F2] border-[#1C40F2] text-white'
                                : isDarkMode 
                                  ? 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                                  : 'border-gray-200 bg-gray-50 text-black hover:bg-gray-100'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            !isClientSelected
                              ? 'bg-gray-300 text-gray-500 dark:bg-white/10 dark:text-gray-500'
                              : isSelected 
                                ? 'bg-white text-[#1C40F2]' 
                                : isDarkMode 
                                  ? 'bg-[#1C40F2]/20 text-[#1C40F2]' 
                                  : 'bg-[#1C40F2] text-white'
                          }`}>
                            <m.icon size={18} />
                          </div>
                          <span className="text-[11px] font-bold uppercase">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Input Fields for Active Payments (very compact) */}
                  <div className="space-y-[8px]">
                    {activePayments.efectivo && (
                      <div className={`p-[8px] rounded-[8px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-150'}`}>
                        <div className="flex justify-between items-center mb-[4px] text-[11px]">
                          <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold uppercase">Efectivo</span>
                          <span style={{ color: isDarkMode ? '#a0a0a0' : '#404040' }} className="text-[10px] uppercase">Recibido</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-[8px] top-[5px] text-xs font-bold text-black opacity-60">$</span>
                          <input disabled={!isEditable} type="number" step="0.01" value={payments.efectivo || ''} onChange={e => setPayments(prev => ({ ...prev, efectivo: e.target.value }))} className={`${inputClass} pl-[20px] font-bold`} placeholder="0.00" />
                        </div>
                      </div>
                    )}

                    {activePayments.transferencia && (
                      <div className={`p-[8px] rounded-[8px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-150'}`}>
                        <div className="flex justify-between items-center mb-[4px] text-[11px]">
                          <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold uppercase">Transferencia</span>
                          <span style={{ color: isDarkMode ? '#a0a0a0' : '#404040' }} className="text-[10px] uppercase">Monto</span>
                        </div>
                        <div className="space-y-[6px]">
                          <div className="relative">
                            <span className="absolute left-[8px] top-[5px] text-xs font-bold text-black opacity-60">$</span>
                            <input disabled={!isEditable} type="number" step="0.01" value={payments.transferencia || ''} onChange={e => setPayments(prev => ({ ...prev, transferencia: e.target.value }))} className={`${inputClass} pl-[20px] font-bold`} placeholder="0.00" />
                          </div>
                          <input disabled={!isEditable} type="text" value={payments.transferenciaRef || ''} onChange={e => setPayments(prev => ({ ...prev, transferenciaRef: e.target.value }))} className={inputClass} placeholder="Banco / Referencia" />
                        </div>
                      </div>
                    )}

                    {activePayments.tarjeta && (
                      <div className={`p-[8px] rounded-[8px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-150'}`}>
                        <div className="flex justify-between items-center mb-[4px] text-[11px]">
                          <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold uppercase">Tarjeta</span>
                          <span style={{ color: isDarkMode ? '#a0a0a0' : '#404040' }} className="text-[10px] uppercase">Monto</span>
                        </div>
                        <div className="space-y-[6px]">
                          <div className="relative">
                            <span className="absolute left-[8px] top-[5px] text-xs font-bold text-black opacity-60">$</span>
                            <input disabled={!isEditable} type="number" step="0.01" value={payments.tarjeta || ''} onChange={e => setPayments(prev => ({ ...prev, tarjeta: e.target.value }))} className={`${inputClass} pl-[20px] font-bold`} placeholder="0.00" />
                          </div>
                          <input disabled={!isEditable} type="text" value={payments.tarjetaRef || ''} onChange={e => setPayments(prev => ({ ...prev, tarjetaRef: e.target.value }))} className={inputClass} placeholder="Nro Lote / Autorización" />
                        </div>
                      </div>
                    )}

                    {activePayments.cruce_cuentas && (
                      <div className={`p-[8px] rounded-[8px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-150'}`}>
                        <div className="flex justify-between items-center mb-[4px] text-[11px]">
                          <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold uppercase">Crédito / CxC</span>
                          <span style={{ color: isDarkMode ? '#a0a0a0' : '#404040' }} className="text-[10px] uppercase">Monto</span>
                        </div>
                        <div className="space-y-[6px]">
                          <div className="relative">
                            <span className="absolute left-[8px] top-[5px] text-xs font-bold text-black opacity-60">$</span>
                            <input disabled={!isEditable} type="number" step="0.01" value={payments.cruce_cuentas || ''} onChange={e => setPayments(prev => ({ ...prev, cruce_cuentas: e.target.value }))} className={`${inputClass} pl-[20px] font-bold`} placeholder="0.00" />
                          </div>
                          <button type="button" onClick={() => setIsCreditModalOpen(true)} className={`w-full py-[5px] rounded-[var(--radius-button)] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50/55 border-amber-200 text-amber-900 hover:bg-amber-100'}`}>
                            Configurar Plazo de Crédito
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vuelto and Cubierto metrics */}
                  {(() => {
                    const totalNum = Number(formData.total) || 0;
                    const sum = (Number(payments.efectivo) || 0) + (Number(payments.transferencia) || 0) + (Number(payments.tarjeta) || 0) + (Number(payments.cruce_cuentas) || 0);
                    const cambio = Math.max(0, sum - totalNum);
                    return (
                      <div className="mt-[8px] grid grid-cols-2 gap-[8px]">
                        <div className={`p-[8px] rounded-[8px] text-center border ${
                          sum >= totalNum - 0.01 
                            ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                            : isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-900 font-bold'
                        }`}>
                          <span style={{ color: isDarkMode ? '#a0a0a0' : '#404040' }} className="text-[9px] font-bold uppercase block">Cambio / Vuelto</span>
                          <span className="text-base font-black">${cambio.toFixed(2)}</span>
                        </div>
                        <div className={`p-[8px] rounded-[8px] text-center border flex items-center justify-center text-[11px] font-semibold ${
                          isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-black'
                        }`}>
                          <div>
                            <p style={{ color: isDarkMode ? '#a0a0a0' : '#404040' }} className="text-[9px] font-bold uppercase">Cubierto</p>
                            <p className="text-[13px] font-black">${sum.toFixed(2)} / ${totalNum.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment Warning Banner */}
                  {(() => {
                    const totalNum = Number(formData.total) || 0;
                    const sum = (Number(payments.efectivo) || 0) + (Number(payments.transferencia) || 0) + (Number(payments.tarjeta) || 0) + (Number(payments.cruce_cuentas) || 0);
                    if (sum === 0 && totalNum > 0) {
                      return (
                        <div className={`mt-[6px] p-[8px] rounded-[8px] text-[10px] font-bold flex items-center gap-[4px] border ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-755'}`}>
                          <AlertTriangle size={12} className="shrink-0 text-red-500" />
                          <span>Falta seleccionar forma de pago.</span>
                        </div>
                      );
                    }
                    if (sum < totalNum - 0.01) {
                      return (
                        <div className={`mt-[6px] p-[8px] rounded-[8px] text-[10px] font-bold flex items-center gap-[4px] border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-850'}`}>
                          <AlertTriangle size={12} className="shrink-0 text-amber-500" />
                          <span>Pago incompleto: Falta ${ (totalNum - sum).toFixed(2) }.</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Sequential & Final Actions Card */}
              <div className={cardClass}>
                <div className="flex items-center gap-[6px] mb-[10px]">
                  <div className="text-[#1C40F2]">
                    <Tag size={14} />
                  </div>
                  <h3 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[11px] font-bold uppercase">
                    Emisión de Comprobante
                  </h3>
                </div>

                {/* Sequencial preview eliminated per request */}

                {/* Save & Emission buttons */}
                <div className="space-y-[6px]">
                  {isEditable ? (
                    <>
                      {/* Save Draft (Guardar Borrador) */}
                      <button 
                        type="button" 
                        onClick={handleSave} 
                        disabled={isUploading || isEmitting} 
                        className={`btn-secondary w-full ${isUploading || isEmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <CheckCircle2 size={12} />
                        <span>Guardar Borrador</span>
                      </button>

                      {/* Emit SRI (Factura Electrónica) */}
                      {formData.type === 'ingreso' && formData.documentType !== 'nota_venta' && (
                        <button 
                          type="button" 
                          onClick={handleEmitirSRI} 
                          disabled={isUploading || isEmitting} 
                          className={`btn-primary w-full ${isUploading || isEmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Sparkles size={12} />
                          <span>Emitir Factura Electrónica (SRI)</span>
                        </button>
                      )}

                      {/* Register Nota de Venta / Recibo */}
                      {formData.type === 'ingreso' && formData.documentType === 'nota_venta' && (
                        <button 
                          type="button" 
                          onClick={() => handleSave({ isFinalizingNotaVenta: true })} 
                          disabled={isUploading || isEmitting} 
                          className={`btn-primary w-full ${isUploading || isEmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <CheckCircle2 size={12} />
                          <span>Registrar Nota de Venta</span>
                        </button>
                      )}

                      {/* Register Purchase / Gasto */}
                      {formData.type !== 'ingreso' && (
                        <button 
                          type="button" 
                          onClick={handleSave} 
                          disabled={isUploading || isEmitting} 
                          className={`btn-primary w-full ${isUploading || isEmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <CheckCircle2 size={12} />
                          <span>Registrar Compra / Gasto</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div style={{ color: isDarkMode ? '#4ade80' : '#15803d' }} className={`p-[6px] flex items-center justify-center gap-1.5 rounded-[8px] text-xs font-bold border ${
                      isDarkMode ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-300 bg-emerald-50'
                    }`}>
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>Autorizado / registrado con éxito.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SRI Live Console */}
              {(isEmitting || sriLogs.length > 0) && (
                <div className="p-[4px] rounded-[8px] bg-black border border-white/10 text-white font-mono text-[9px] space-y-[2px] max-h-[120px] overflow-y-auto">
                  <div className="flex items-center gap-[3px] border-b border-white/10 pb-[2px] text-gray-400">
                    <Terminal size={10} />
                    <span>Consola SRI (Ecuador)</span>
                  </div>
                  <div className="space-y-[1px]">
                    {sriLogs.map((log, i) => (
                      <div key={i} className="flex gap-[5px] items-start">
                        <span className="text-gray-500 shrink-0">{log.time}</span>
                        <span className={log.status === 'error' ? 'text-red-400 font-bold' : log.status === 'success' ? 'text-emerald-400' : 'text-gray-200'}>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PASO 2: IMPRESIÓN DEL DOCUMENTO                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="grid grid-cols-12 gap-[12px] animate-in fade-in slide-in-from-bottom duration-300">
            {/* Left Column (col-span-12 lg:col-span-7): Estado de Emisión y Acciones de Impresión */}
            <div className="col-span-12 lg:col-span-7 space-y-[12px]">
              {/* Banner Success */}
              <div className={`${cardClass} text-center p-[12px] space-y-[8px]`}>
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-500 flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
                <div>
                  <h3 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[13px] font-bold uppercase">
                    {formData.documentType === 'nota_venta'
                      ? (formData.sriStatus === 'anulado' ? '¡Nota de Venta Anulada!' : '¡Venta Registrada Exitosamente!')
                      : formData.sriStatus === 'autorizado' 
                        ? '¡Comprobante Autorizado por el SRI!' 
                        : '¡Transacción Guardada con Éxito!'}
                  </h3>
                  <p style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[11px] font-normal">
                    El documento ha sido guardado e ingresado en los registros financieros de forma satisfactoria.
                  </p>
                </div>

                {formData.claveAcceso && (
                  <div className={`p-[8px] rounded-card border text-left font-mono text-[10px] break-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-150 text-black'}`}>
                    <span style={{ color: isDarkMode ? '#4ade80' : '#16a34a' }} className="font-bold uppercase text-[9px] block mb-[4px]">Clave de Acceso SRI:</span>
                    {formData.claveAcceso}
                  </div>
                )}
              </div>

              {/* Botones de Impresión */}
              <div className={cardClass}>
                <div className="flex items-center gap-[6px] mb-[10px]">
                  <div className="text-[#1C40F2]">
                    <Download size={12} />
                  </div>
                  <h4 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[11px] font-bold uppercase">Opciones de Impresión / Descarga</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px]">
                  {/* Print Ticket 80mm */}
                  <button 
                    type="button" 
                    onClick={() => {
                      setPrintFormat('ticket');
                      setPrintTx(formData);
                    }}
                    className="btn-primary w-full flex items-center justify-center gap-[6px]"
                  >
                    <Calculator size={12} />
                    <span>Imprimir Ticket (80mm)</span>
                  </button>

                  {/* Print RIDE A4 */}
                  <button 
                    type="button" 
                    onClick={() => {
                      setPrintFormat('ride');
                      setPrintTx(formData);
                    }}
                    className="btn-secondary w-full flex items-center justify-center gap-[6px]"
                  >
                    <FileText size={12} />
                    <span>Imprimir RIDE (A4)</span>
                  </button>

                  {/* Download XML */}
                  {formData.claveAcceso && (
                    <button 
                      type="button" 
                      onClick={downloadXMLFile}
                      className="btn-secondary w-full sm:col-span-2 flex items-center justify-center gap-[6px]"
                    >
                      <Download size={12} />
                      <span>Descargar XML Autorizado</span>
                    </button>
                  )}
                </div>

                {/* SRI Anulación if authorized */}
                {isAuthorized && (
                  <div className="mt-[8px] border-t border-dashed border-gray-150 dark:border-white/10 pt-[8px]">
                    <button 
                      type="button" 
                      onClick={handleAnular}
                      className="btn-danger w-full flex items-center justify-center gap-[6px]"
                    >
                      <ShieldAlert size={12} />
                      <span>{formData.documentType === 'nota_venta' ? 'Anular Nota de Venta' : 'Anular Documento ante el SRI'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (col-span-12 lg:col-span-5): Vista Previa del Documento */}
            <div className="col-span-12 lg:col-span-5">
              <div className={`${cardClass} space-y-[8px]`}>
                <h4 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[11px] font-bold uppercase">Vista Previa del Comprobante</h4>

                <div className={`p-[10px] rounded-card border text-[11px] space-y-[8px] bg-white text-black border-gray-200 shadow-inner font-mono max-h-[60vh] overflow-y-auto`}>
                  <div className="text-center border-b pb-[8px] border-gray-200">
                    <p className="font-bold text-xs uppercase">{sriConfig.nombreComercial || 'WEBFIX ERP'}</p>
                    <p className="text-[9px] font-bold">{sriConfig.razonSocial}</p>
                    <p className="text-[8px] text-black mt-[2px]">{sriConfig.direccionMatriz}</p>
                    <p className="text-[9px] font-bold mt-[4px]">RUC: {sriConfig.ruc}</p>
                  </div>

                  <div className="space-y-[4px] border-b pb-[8px] border-gray-200 text-[10px]">
                    <p className="font-bold uppercase text-center border bg-gray-100 py-[2px] text-black">
                      {formData.documentType === 'nota_venta' ? 'NOTA DE VENTA' : 'FACTURA ELECTRÓNICA'}
                    </p>
                    <p className="text-black"><b>Número:</b> {formData.documentNumber || `001-001-${String(formData.secuencial || 1).padStart(9, '0')}`}</p>
                    <p className="text-black"><b>Fecha:</b> {formData.date} {formData.time || ''}</p>
                    <p className="text-black">
                      <b>{formData.documentType === 'nota_venta' ? 'Estado:' : 'Estado SRI:'}</b>{' '}
                      <span className={`${formData.sriStatus === 'anulado' ? 'text-red-700' : 'text-emerald-700'} font-bold uppercase`}>
                        {formData.documentType === 'nota_venta' 
                          ? (formData.sriStatus === 'anulado' ? 'ANULADO' : 'REGISTRADO') 
                          : formData.sriStatus}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-[4px] border-b pb-[8px] border-gray-200 text-[10px] text-black">
                    <p><b>Cliente:</b> {matchedTercero?.name || 'CONSUMIDOR FINAL'}</p>
                    <p><b>RUC/CI:</b> {matchedTercero?.ruc || '9999999999999'}</p>
                    <p><b>Dirección:</b> {matchedTercero?.direccion || 'S/N'}</p>
                  </div>

                  {/* Detalle items */}
                  {formData.documentType !== 'retencion' && (
                    <div className="border-b pb-[8px] border-gray-200 text-[10px] text-black">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-200 font-bold">
                            <th className="pb-[2px]">Cant</th>
                            <th className="pb-[2px]">Detalle</th>
                            <th className="pb-[2px] text-right">Unit</th>
                            <th className="pb-[2px] text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(formData.items || []).map((item, idx) => (
                            <tr key={idx} className="text-[10px] text-black font-normal">
                              <td className="py-[2px] align-top">{item.quantity}</td>
                              <td className="py-[2px] pr-[5px]">{item.name}</td>
                              <td className="py-[2px] text-right align-top">${Number(item.price).toFixed(2)}</td>
                              <td className="py-[2px] text-right align-top">${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Totales */}
                  <div className="space-y-[2px] text-[10px] text-right text-black">
                    <p>Subtotal: ${Number(formData.baseImponible).toFixed(2)}</p>
                    {formData.documentType !== 'retencion' && (
                      <p>IVA ({formData.ivaPorcentaje}%): ${Number(formData.ivaValor).toFixed(2)}</p>
                    )}
                    <p className="font-bold text-xs border-t border-gray-200 pt-[4px] text-black">
                      TOTAL: ${Number(formData.total).toFixed(2)}
                    </p>
                  </div>

                  {/* Pagos desglosados */}
                  <div className="border-t border-dashed border-gray-200 pt-[6px] text-[9px] space-y-[2px] text-black">
                    <p className="font-bold uppercase text-[8px] text-black">Forma de Pago:</p>
                    {Number(payments.efectivo) > 0 && <p>Efectivo: ${Number(payments.efectivo).toFixed(2)}</p>}
                    {Number(payments.transferencia) > 0 && <p>Transferencia: ${Number(payments.transferencia).toFixed(2)}</p>}
                    {Number(payments.tarjeta) > 0 && <p>Tarjeta: ${Number(payments.tarjeta).toFixed(2)}</p>}
                    {Number(payments.cruce_cuentas) > 0 && <p>Crédito CxC: ${Number(payments.cruce_cuentas).toFixed(2)}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER WIZARD BAR */}
      {!isInline && (
        <div className={`sticky bottom-0 z-20 px-[12px] py-[10px] border-t backdrop-blur-md flex justify-between items-center ${
          isDarkMode ? 'border-white/5 bg-[#151517]/95' : 'border-gray-250 bg-white/95'
        }`}>
          {/* Mobile Navigation Buttons (Step 1) */}
          {currentStep === 1 && (
            <div className="flex lg:hidden items-center justify-between w-full">
              {/* Atrás (Mobile) */}
              {mobileTab !== 'cliente' ? (
                <button
                  type="button"
                  onClick={() => setMobileTab(mobileTab === 'pago' ? 'carrito' : 'cliente')}
                  className="btn-secondary"
                >
                  <ArrowLeft size={12} />
                  <span>Atrás</span>
                </button>
              ) : (
                <div className="w-[60px]" />
              )}

              <span className={`text-[11px] font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
                {mobileTab === 'cliente' ? '1. Cliente' : mobileTab === 'carrito' ? '2. Carrito' : '3. Pago'}
              </span>

              {/* Siguiente (Mobile) */}
              {mobileTab !== 'pago' ? (
                <button
                  type="button"
                  onClick={() => setMobileTab(mobileTab === 'cliente' ? 'carrito' : 'pago')}
                  className="btn-primary"
                >
                  <span>Siguiente</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <div className="w-[75px]" />
              )}
            </div>
          )}

          {/* Desktop Navigation (original) */}
          <div className={`hidden lg:flex justify-between items-center w-full`}>
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1 || isLockedInStep2}
              className={`btn-secondary ${
                currentStep === 1 || isLockedInStep2 ? 'opacity-0 pointer-events-none' : ''
              }`}
            >
              <ArrowLeft size={12} />
              <span>Atrás</span>
            </button>

            <span className={`text-[11px] font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
              Paso {currentStep} de 2
            </span>

            {currentStep < 2 ? (
              <button
                type="button"
                disabled={currentStep === 1 && isEditable && !formData.documentNumber}
                onClick={handleNextStep}
                className={`btn-primary ${
                  currentStep === 1 && isEditable && !formData.documentNumber ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span>Siguiente</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="btn-primary px-6"
              >
                <span>Terminar / Salir</span>
              </button>
            )}
          </div>

          {/* Mobile Navigation when in Step 2 */}
          {currentStep === 2 && (
            <div className="flex lg:hidden justify-between items-center w-full">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isLockedInStep2}
                className={`btn-secondary ${isLockedInStep2 ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <ArrowLeft size={12} />
                <span>Atrás</span>
              </button>
              
              <span className={`text-[11px] font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
                Paso 2 de 2
              </span>

              <button
                type="button"
                onClick={onClose}
                className="btn-primary"
              >
                <span>Terminar</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL SEGUIMIENTO DE CRÉDITO / CXC */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-[10px] bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-[20px] rounded-card shadow-2xl border ${
            isDarkMode ? 'bg-[#151517] border border-white/10 text-white' : 'bg-white border border-gray-150 text-black'
          }`}>
            <div className="flex justify-between items-center mb-[12px] border-b pb-[8px] dark:border-white/5">
              <h3 className="text-[13px] font-bold flex items-center gap-[4px] text-black dark:text-white uppercase">
                <User className="text-[#1C40F2]" size={14} />
                Seguimiento de Cuenta por Cobrar
              </h3>
              <button 
                type="button" 
                onClick={() => setIsCreditModalOpen(false)}
                className="p-[4px] rounded-[8px] hover:bg-white/10"
              >
                <X size={12} />
              </button>
            </div>

            <div className="space-y-[10px]">
              <div className={`p-[10px] rounded-card border text-[11px] space-y-[4px] ${
                isDarkMode ? 'bg-black/10 border-white/5 text-white' : 'bg-gray-50 border-gray-150 text-black'
              }`}>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-white/60' : 'text-black/70'}>Cliente:</span>
                  <span className="font-bold">{matchedTercero?.name || 'Cliente no seleccionado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-white/60' : 'text-black/70'}>Cupo de Crédito:</span>
                  <span className="font-bold">${(Number(matchedTercero?.limiteCredito) || 1000).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-650 dark:text-red-400">
                  <span>Deuda Pendiente Actual:</span>
                  <span className="font-bold">${clientDebt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#1C40F2] border-t border-dashed border-gray-150 dark:border-white/5 pt-[4px]">
                  <span>Monto Venta Actual:</span>
                  <span className="font-bold">${Number(formData.total).toFixed(2)}</span>
                </div>
                
                {(() => {
                  const limit = Number(matchedTercero?.limiteCredito) || 1000;
                  const totalVenta = Number(formData.total) || 0;
                  const available = limit - clientDebt - totalVenta;
                  return (
                    <div className={`flex justify-between border-t border-dashed border-gray-150 dark:border-white/5 pt-[4px] ${
                      available < 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-700 dark:text-emerald-450 font-bold'
                    }`}>
                      <span>Cupo Disponible Resultante:</span>
                      <span>${available.toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const limit = Number(matchedTercero?.limiteCredito) || 1000;
                const totalVenta = Number(formData.total) || 0;
                const available = limit - clientDebt - totalVenta;
                if (available < 0) {
                  return (
                    <div className="p-[8px] rounded-card bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-450 text-[10px] leading-normal flex items-start gap-[4px]">
                      <AlertTriangle size={12} className="shrink-0 mt-[1px]" />
                      <div>
                        <p className="font-bold">Límite de Crédito Superado</p>
                        <p className="opacity-90 font-normal">La deuda actual más esta venta superan el cupo disponible del cliente en ${(Math.abs(available)).toFixed(2)}.</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-[8px]">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Fecha de Vencimiento de la Deuda</label>
                  <input 
                    type="date" 
                    value={creditDueDate} 
                    onChange={e => setCreditDueDate(e.target.value)} 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Observaciones / Comentario de Crédito</label>
                  <textarea 
                    rows={3}
                    value={creditObservations} 
                    onChange={e => setCreditObservations(e.target.value)} 
                    className={`${inputClass} resize-none`} 
                    placeholder="Ej. Crédito autorizado por gerencia..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-[8px] mt-[10px] pt-[10px] border-t border-gray-150 dark:border-white/5">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsCreditModalOpen(false);
                    setFormData(prev => ({ ...prev, paymentMethod: 'efectivo' }));
                  }} 
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsCreditModalOpen(false)}
                  className="btn-primary"
                >
                  Confirmar Crédito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR CONTACTO RAPIDO */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-[10px] bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-[20px] rounded-card shadow-2xl border ${isDarkMode ? 'bg-[#151517] border border-white/10 text-white' : 'bg-white border border-gray-150 text-black'}`}>
            <h3 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[13px] font-bold mb-[12px] border-b pb-[8px] dark:border-white/5 uppercase">
              Nuevo {formData.type === 'ingreso' ? 'Cliente' : 'Proveedor'} (Rápido)
            </h3>
            
            <form onSubmit={handleQuickAddSave} className="space-y-[10px]">
              <div className="grid grid-cols-2 gap-[8px]">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Identificación</label>
                  <select 
                    value={quickAddFormData.tipoIdentificacion || 'ruc'} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, tipoIdentificacion: e.target.value})} 
                    className={inputClass}
                  >
                    <option value="ruc">RUC</option>
                    <option value="cedula">Cédula</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Número</label>
                  <div className="flex gap-[8px]">
                    <input 
                      type="text" 
                      required 
                      value={quickAddFormData.ruc} 
                      onChange={e => setQuickAddFormData({...quickAddFormData, ruc: e.target.value})} 
                      className={inputClass} 
                      placeholder="1790000000001" 
                    />
                    <button
                      type="button"
                      disabled={isQueryingSri}
                      onClick={queryQuickAddSRI}
                      className="btn-icon bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 shrink-0"
                      title="Consultar SRI"
                    >
                      {isQueryingSri ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Razón Social / Nombres</label>
                <input 
                  type="text" 
                  required 
                  value={quickAddFormData.name} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, name: e.target.value})} 
                  className={inputClass} 
                  placeholder="Ej. Juan Pérez" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Teléfono</label>
                <input 
                  type="text" 
                  value={quickAddFormData.telefono || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, telefono: e.target.value})} 
                  className={inputClass} 
                  placeholder="0998765432" 
                />
              </div>

              <div className="grid grid-cols-2 gap-[8px]">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Dirección</label>
                  <input 
                    type="text" 
                    value={quickAddFormData.direccion || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, direccion: e.target.value})} 
                    className={inputClass} 
                    placeholder="Av. de los Shyris" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Ciudad</label>
                  <input 
                    type="text" 
                    value={quickAddFormData.ciudad || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, ciudad: e.target.value})} 
                    className={inputClass} 
                    placeholder="Quito" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={quickAddFormData.email || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, email: e.target.value})} 
                  className={inputClass} 
                  placeholder="correo@ejemplo.com" 
                />
              </div>

              <div className="flex justify-end gap-[8px] mt-[10px] pt-[10px] border-t border-gray-150 dark:border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsQuickAddOpen(false)} 
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                >
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-[10px] bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-[20px] rounded-card shadow-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#151517] border-white/10 text-white' 
              : 'bg-white border-gray-150 text-black shadow-xl'
          }`}>
            <div className="flex items-center gap-[8px] mb-[10px]">
              <div className={`p-[8px] rounded-[8px] shrink-0 ${
                confirmDialog.type === 'danger'
                  ? 'bg-red-500/10 text-red-500'
                  : confirmDialog.type === 'warning'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-primary/10 text-[#1C40F2]'
              }`}>
                {confirmDialog.type === 'danger' ? (
                  <ShieldAlert size={16} />
                ) : confirmDialog.type === 'warning' ? (
                  <AlertTriangle size={16} />
                ) : (
                  <FileText size={16} />
                )}
              </div>
              <div>
                <h3 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[13px] font-bold uppercase">
                  {confirmDialog.title}
                </h3>
                <p className="text-[9px] mt-[2px] font-bold uppercase text-black dark:text-white/60">
                  Acción de Seguridad Requerida
                </p>
              </div>
            </div>

            <div style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className={`p-[10px] rounded-card border text-xs leading-normal mb-[12px] font-normal ${
              isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-150'
            }`}>
              {confirmDialog.message}
            </div>

            <div className="flex justify-end gap-[8px]">
              {!confirmDialog.isAlert && (
                <button
                  type="button"
                  onClick={confirmDialog.onCancel}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={confirmDialog.type === 'danger' ? 'btn-danger' : 'btn-primary'}
              >
                {confirmDialog.confirmLabel || 'Aceptar / Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP BÚSQUEDA AVANZADA DE PRODUCTOS */}
      {isAdvancedSearchOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-[10px] bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-2xl p-[20px] rounded-card shadow-2xl border flex flex-col max-h-[85vh] ${
            isDarkMode ? 'bg-[#151517] border border-white/10 text-white' : 'bg-white border border-gray-150 text-black'
          }`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-[12px] border-b pb-[8px] dark:border-white/5 border-gray-150">
              <h3 className="text-[13px] font-bold flex items-center gap-[4px] text-black dark:text-white uppercase">
                <Search className="text-[#1C40F2]" size={14} />
                Búsqueda Avanzada de Productos
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAdvancedSearchOpen(false)}
                className="p-[4px] rounded-[8px] hover:bg-white/10"
              >
                <X size={12} />
              </button>
            </div>

            {/* Search and category filter row */}
            <div className="flex gap-[8px] mb-[10px]">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={advSearchTerm} 
                  onChange={e => setAdvSearchTerm(e.target.value)} 
                  className={inputClass}
                  placeholder="Buscar por nombre, SKU, barra..."
                />
                {advSearchTerm && (
                  <button type="button" onClick={() => setAdvSearchTerm('')} className="absolute right-[8px] top-[4px] text-gray-400 hover:text-red-500">
                    <X size={10} />
                  </button>
                )}
              </div>
              {(() => {
                const cats = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
                if (cats.length > 1) {
                  return (
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className={`${inputClass} w-auto`}
                    >
                      <option value="all">Todas las Categorías</option>
                      {cats.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  );
                }
                return null;
              })()}
            </div>

            {/* Products scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-[6px] min-h-[250px] max-h-[50vh] pr-[2px]">
              {(() => {
                const filtered = products.filter(p => {
                  const matchText = !advSearchTerm || 
                    p.name?.toLowerCase().includes(advSearchTerm.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(advSearchTerm.toLowerCase()) ||
                    p.codigoBarras?.toLowerCase().includes(advSearchTerm.toLowerCase());
                  const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
                  return matchText && matchCat;
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="py-8 text-center text-xs italic rounded-[8px] border border-dashed border-gray-150">
                      No se encontraron productos coincidentes.
                    </div>
                  );
                }

                return filtered.map(p => {
                  const isAlreadyInCart = (formData.items || []).some(it => it.productId === p.id);
                  const cartQty = (formData.items || []).find(it => it.productId === p.id)?.quantity || 0;

                  return (
                    <div 
                      key={p.id} 
                      className={`p-[8px] rounded-[8px] border flex justify-between items-center transition-all ${
                        isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-50 border-gray-150 text-black'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-[6px]">
                          <p className="font-bold text-xs">{p.name}</p>
                          {p.category && (
                            <span className="px-[5px] py-[2px] rounded-[4px] text-[9px] font-bold bg-gray-200 text-gray-800 dark:bg-white/10 dark:text-gray-300 uppercase">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono opacity-85">
                          {p.sku ? `SKU: ${p.sku}` : ''} {p.codigoBarras ? ` | Barra: ${p.codigoBarras}` : ''}
                          {p.stock !== undefined ? ` | Stock: ${p.stock}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-[8px] shrink-0">
                        <span style={{ color: '#1C40F2' }} className="font-black text-xs mr-[4px]">${Number(p.price).toFixed(2)}</span>
                        {isAlreadyInCart && (
                          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-[6px] py-[3px] rounded-[6px]">
                            En Carrito ({cartQty})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddProductToCart(p)}
                          className="btn-primary"
                        >
                          + Añadir
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="flex justify-end mt-[10px] pt-[10px] border-t border-gray-150 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsAdvancedSearchOpen(false)}
                className="btn-secondary"
              >
                Volver a la Consola
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR PRODUCTO RAPIDO */}
      {isQuickAddProductOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-[10px] bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-[20px] rounded-card shadow-2xl border ${
            isDarkMode ? 'bg-[#151517] border border-white/10 text-white' : 'bg-white border border-gray-150 text-black'
          }`}>
            <h3 style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="text-[13px] font-bold mb-[12px] border-b pb-[8px] dark:border-white/5 uppercase">
              Nuevo Producto (Rápido)
            </h3>
            
            <form onSubmit={handleQuickAddProductSave} className="space-y-[10px]">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Nombre del Producto / Servicio</label>
                <input 
                  type="text" 
                  required 
                  value={quickAddProductFormData.name} 
                  onChange={e => setQuickAddProductFormData({...quickAddProductFormData, name: e.target.value})} 
                  className={inputClass} 
                  placeholder="Ej. Servicio de Mantenimiento PC" 
                />
              </div>

              <div className="grid grid-cols-2 gap-[8px]">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">SKU / Código</label>
                  <input 
                    type="text" 
                    value={quickAddProductFormData.sku} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, sku: e.target.value})} 
                    className={inputClass} 
                    placeholder="SKU-100" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Código de Barras</label>
                  <input 
                    type="text" 
                    value={quickAddProductFormData.codigoBarras} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, codigoBarras: e.target.value})} 
                    className={inputClass} 
                    placeholder="7861000..." 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-[8px]">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">P. Venta ($)</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    required 
                    value={quickAddProductFormData.price} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, price: e.target.value})} 
                    className={inputClass} 
                    placeholder="10.00" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Costo ($)</label>
                  <input 
                    type="number" 
                    step="0.0001" 
                    value={quickAddProductFormData.baseCost} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, baseCost: e.target.value})} 
                    className={inputClass} 
                    placeholder="6.50" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Stock Inicial</label>
                  <input 
                    type="number" 
                    value={quickAddProductFormData.stock} 
                    onChange={e => setQuickAddProductFormData({...quickAddProductFormData, stock: e.target.value})} 
                    className={inputClass} 
                    placeholder="10" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-[4px] text-black dark:text-white/60">Categoría IVA</label>
                <select 
                  value={quickAddProductFormData.ivaCategory} 
                  onChange={e => setQuickAddProductFormData({...quickAddProductFormData, ivaCategory: Number(e.target.value)})} 
                  className={inputClass}
                >
                  <option value={15}>15% IVA</option>
                  <option value={5}>5% IVA</option>
                  <option value={0}>0% IVA</option>
                </select>
              </div>

              <div className="flex justify-end gap-[8px] mt-[10px] pt-[10px] border-t border-gray-150 dark:border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsQuickAddProductOpen(false)} 
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                >
                  <Plus size={12} />
                  <span>Añadir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printTx && (
        <RidePreviewModal 
          tx={printTx} 
          onClose={() => setPrintTx(null)} 
          thirdParties={thirdParties} 
          isDarkMode={isDarkMode} 
          db={db} 
          appId={appId}
          initialFormat={printFormat}
        />
      )}

    </div>
  );

  if (isInline) {
    return formJSX;
  }
  return createPortal(formJSX, document.body);
}
