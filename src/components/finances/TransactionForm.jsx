import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, UploadCloud, Calculator, FileText, CheckCircle2, AlertTriangle, Sparkles, 
  Terminal, ShieldAlert, Download, Plus, Trash2, RefreshCw, ArrowLeft, ArrowRight, 
  User, DollarSign, CreditCard, Layers, Search
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { validarIdentificacion, generarFacturaXML, simularTransmisionSRI, consultarRucSri, generarRetencionXML, generarNotaCreditoXML, generarLiquidacionXML } from '../../services/sriService';
import { firmarComprobanteXML } from '../../services/xadesSigner';

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

export default function TransactionForm({ tx, onClose, thirdParties, products = [], isDarkMode, showToast, db, storage, appId }) {
  const [sriConfig, setSriConfig] = useState({
    ruc: '1790000000001',
    razonSocial: 'WEBFIX SOLUCIONES TECNOLOGICAS S.A.',
    nombreComercial: 'WEBFIX SOLUCIONES',
    direccionMatriz: 'Av. de los Shyris N34-102 y Holanda, Edificio Alfa, Oficina 5A, Quito',
    ambiente: '1', // 1: Pruebas, 2: Producción
    establecimiento: '001',
    puntoEmision: '001',
    secuencialFactura: 1,
    secuencialRetencion: 1,
    secuencialNotaCredito: 1,
    secuencialLiquidacion: 1,
    secuencialNotaVenta: 1,
    certificadoCargado: true,
    certificadoNombre: 'certificado_demo.p12',
    obligadoContabilidad: true,
    regimenRimpe: 'rimpe_emprendedor',
    agenteRetencion: false,
    resolucionAgente: ''
  });
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    id: '',
    type: 'ingreso',
    date: new Date().toISOString().split('T')[0],
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
    fechaEmisionDocSustento: new Date().toISOString().split('T')[0],
    motivo: 'Devolución de mercadería',
    referencia: '',
    description: ''
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
    return d.toISOString().split('T')[0];
  });
  const [creditObservations, setCreditObservations] = useState('');
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

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
    telefono: '',
    tipoContribuyente: 'general'
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
        telefono: quickAddFormData.telefono || '',
        tipoContribuyente: quickAddFormData.tipoContribuyente || 'general',
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
      if (tx.paymentsBreakdown) {
        setPayments({
          efectivo: tx.paymentsBreakdown.efectivo || 0,
          transferencia: tx.paymentsBreakdown.transferencia || 0,
          tarjeta: tx.paymentsBreakdown.tarjeta || 0,
          cruce_cuentas: tx.paymentsBreakdown.cruce_cuentas || 0,
          transferenciaRef: tx.transferenciaRef || tx.paymentReferences?.transferenciaRef || '',
          tarjetaRef: tx.tarjetaRef || tx.paymentReferences?.tarjetaRef || '',
          cruceRef: tx.cruceRef || tx.paymentReferences?.cruceRef || ''
        });
      } else {
        const method = tx.paymentMethod || 'transferencia';
        setPayments({
          efectivo: method === 'efectivo' ? tx.total || 0 : 0,
          transferencia: method === 'transferencia' ? tx.total || 0 : 0,
          tarjeta: method === 'tarjeta' ? tx.total || 0 : 0,
          cruce_cuentas: method === 'cruce_cuentas' ? tx.total || 0 : 0,
          transferenciaRef: tx.transferenciaRef || tx.paymentReferences?.transferenciaRef || '',
          tarjetaRef: tx.tarjetaRef || tx.paymentReferences?.tarjetaRef || '',
          cruceRef: tx.cruceRef || tx.paymentReferences?.cruceRef || ''
        });
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
      let subtotal = 0;
      let ivaVal = 0;
      
      formData.items.forEach(item => {
        const lineSub = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
        const lineIva = lineSub * ((parseInt(item.ivaCategory) || 15) / 100);
        subtotal += lineSub;
        ivaVal += lineIva;
      });

      const retFuente = Number(formData.retencionFuente) || 0;
      const retIva = Number(formData.retencionIva) || 0;
      const totalVal = subtotal + ivaVal - retFuente - retIva;

      setFormData(prev => ({
        ...prev,
        baseImponible: subtotal.toFixed(2),
        ivaValor: ivaVal.toFixed(2),
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
    formData.documentType
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
          fechaEmisionDocSustento: new Date().toISOString().split('T')[0] 
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
        { productId: '', name: '', price: 0, quantity: 1, ivaCategory: 15 }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index)
    }));
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
          ivaCategory: prod.ivaCategory
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleAddProductToCart = (product) => {
    const existingIndex = (formData.items || []).findIndex(item => item.productId === product.id);
    if (existingIndex > -1) {
      const updatedItems = [...formData.items];
      updatedItems[existingIndex].quantity = (parseInt(updatedItems[existingIndex].quantity) || 0) + 1;
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [
          ...(prev.items || []),
          { 
            productId: product.id, 
            name: product.name, 
            sku: product.sku || '',
            codigoBarras: product.codigoBarras || '',
            price: Number(product.price) || 0, 
            quantity: 1, 
            ivaCategory: product.ivaCategory || 15 
          }
        ]
      }));
    }
    setProductSearchTerm('');
    showToast(`Añadido: ${product.name}`, 'success');
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
    
    if (formData.paymentMethod === 'efectivo') {
      const ef = Number(payments.efectivo) || 0;
      if (ef < total - 0.01) {
        return {
          isValid: false,
          vuelto: 0,
          error: `Falta cubrir $${(total - ef).toFixed(2)} del total`
        };
      }
      return {
        isValid: true,
        vuelto: ef > total ? ef - total : 0,
        error: null
      };
    }
    
    if (formData.paymentMethod === 'credito') {
      const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
      const limit = Number(matchedTercero?.limiteCredito) || 1000;
      const available = limit - clientDebt - total;
      if (available < 0) {
        return {
          isValid: false,
          vuelto: 0,
          error: `El cupo de crédito disponible es insuficiente por $${Math.abs(available).toFixed(2)}`
        };
      }
    }
    
    return {
      isValid: true,
      vuelto: 0,
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

  const validateForm = () => {
    if (!formData.thirdPartyId) {
      showToast('Selecciona un tercero', 'error');
      return false;
    }

    const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
    if (!matchedTercero) {
      showToast('Contacto inválido', 'error');
      return false;
    }

    if (!validarIdentificacion(matchedTercero.ruc)) {
      showToast(`El RUC/CI del contacto (${matchedTercero.ruc}) es incorrecto`, 'error');
      return false;
    }

    if (Number(formData.total) < 0) {
      showToast('El total liquidado no puede ser menor a cero', 'error');
      return false;
    }

    if (formData.documentNumber && !/^\d{3}-\d{3}-\d{9}$/.test(formData.documentNumber)) {
      showToast('El número de comprobante debe tener el formato 000-000-000000000', 'error');
      return false;
    }

    const pStatus = calculatePaymentStatus();
    if (!pStatus.isValid) {
      showToast(pStatus.error, 'error');
      return false;
    }

    return true;
  };

  const handleSave = async (options = {}) => {
    // If called via form submit event, prevent default
    if (options && typeof options.preventDefault === 'function') {
      options.preventDefault();
      options = {};
    }
    const { isFinalizingNotaVenta = false } = options;
    if (!validateForm()) return;

    try {
      const docId = formData.id || `tx_${new Date().getTime()}`;
      let updatedFormData = { ...formData };

      // Lock system date & time automatically (non-modifiable)
      const now = new Date();
      const serverDate = now.toISOString().split('T')[0];
      const serverTime = now.toTimeString().split(' ')[0];
      updatedFormData.date = serverDate;
      updatedFormData.time = serverTime;

      // Concurrency-safe sequential assignment for internal receipts (Nota de Venta) upon finalization
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

      // Compute paidAmount and status based on selected paymentMethod
      let paidAmount = 0;
      let paymentStatus = 'pendiente';
      const totalNum = Number(updatedFormData.total) || 0;
      const payBreakdown = { efectivo: 0, transferencia: 0, tarjeta: 0, credito: 0 };

      if (updatedFormData.paymentMethod === 'efectivo') {
        paidAmount = totalNum;
        paymentStatus = 'pagado';
        payBreakdown.efectivo = totalNum;
      } else if (updatedFormData.paymentMethod === 'transferencia') {
        paidAmount = 0;
        paymentStatus = 'pendiente';
        payBreakdown.transferencia = totalNum;
      } else if (updatedFormData.paymentMethod === 'tarjeta') {
        paidAmount = 0;
        paymentStatus = 'pendiente';
        payBreakdown.tarjeta = totalNum;
      } else if (updatedFormData.paymentMethod === 'credito') {
        paidAmount = 0;
        paymentStatus = 'pendiente';
        payBreakdown.credito = totalNum;
      }

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), sanitizeFirestoreData({
        ...updatedFormData,
        id: docId,
        paidAmount,
        paymentStatus,
        paymentsBreakdown: payBreakdown,
        transferenciaRef: payments.transferenciaRef || '',
        tarjetaRef: payments.tarjetaRef || '',
        cruceRef: payments.cruceRef || '',
        creditDueDate: updatedFormData.paymentMethod === 'credito' ? creditDueDate : '',
        creditObservations: updatedFormData.paymentMethod === 'credito' ? creditObservations : '',
        updatedAt: now.toISOString(),
        updatedBy: 'Usuario ERP'
      }), { merge: true });

      showToast('Transacción guardada', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar: ' + (err.message || ''), 'error');
    }
  };

  const handleEmitirSRI = async () => {
    if (!validateForm()) return;

    const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;

    setIsEmitting(true);
    setSriLogs([]);

    try {
      // 1. Fetch fresh config document from Firestore for concurrency-safe sequential assignment
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
      const configSnap = await getDoc(configRef);
      if (!configSnap.exists()) {
        throw new Error("No se pudo obtener la configuración del emisor SRI");
      }
      const configData = configSnap.data();
      setSriConfig(configData); // Sync local state

      // Determine correct sequential configuration key
      let secKey = 'secuencialFactura';
      if (formData.documentType === 'factura') {
        secKey = 'secuencialFactura';
      } else if (formData.documentType === 'retencion') {
        secKey = 'secuencialRetencion';
      } else if (formData.documentType === 'nota_credito') {
        secKey = 'secuencialNotaCredito';
      } else if (formData.documentType === 'liquidacion') {
        secKey = 'secuencialLiquidacion';
      }

      const secVal = configData[secKey] || 1;
      const sec = String(secVal);
      const docNum = `${configData.establecimiento || '001'}-${configData.puntoEmision || '001'}-${String(sec).padStart(9, '0')}`;
      
      // Generar y asociar un código numérico aleatorio único de 8 dígitos si no existe
      const codigoNumerico = formData.codigoNumerico || Math.floor(10000000 + Math.random() * 90000000).toString();
      
      const now = new Date();
      const serverDate = now.toISOString().split('T')[0];
      const serverTime = now.toTimeString().split(' ')[0];

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
          setSriLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: `Firma Fallida: ${signErr.message}. Usando simulación.`, status: 'error' }]);
        }
      }

      const result = await simularTransmisionSRI(
        {
          rucReceptor: matchedTercero.ruc,
          total: formData.total,
          claveAcceso,
          xml: signedXml
        },
        configData,
        (logs) => setSriLogs(logs)
      );

      const docId = formData.id || `tx_${new Date().getTime()}`;

      // Compute paidAmount and status based on selected paymentMethod
      let paidAmount = 0;
      let paymentStatus = 'pendiente';
      const totalNum = Number(formData.total) || 0;
      const payBreakdown = { efectivo: 0, transferencia: 0, tarjeta: 0, credito: 0 };

      if (formData.paymentMethod === 'efectivo') {
        paidAmount = totalNum;
        paymentStatus = 'pagado';
        payBreakdown.efectivo = totalNum;
      } else if (formData.paymentMethod === 'transferencia') {
        paidAmount = 0;
        paymentStatus = 'pendiente';
        payBreakdown.transferencia = totalNum;
      } else if (formData.paymentMethod === 'tarjeta') {
        paidAmount = 0;
        paymentStatus = 'pendiente';
        payBreakdown.tarjeta = totalNum;
      } else if (formData.paymentMethod === 'credito') {
        paidAmount = 0;
        paymentStatus = 'pendiente';
        payBreakdown.credito = totalNum;
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
        codigoNumerico, // Guardar el código numérico generado
        xmlUrl: result.xmlUrl,
        pdfUrl: result.pdfUrl,
        paidAmount,
        paymentStatus,
        paymentsBreakdown: payBreakdown,
        transferenciaRef: payments.transferenciaRef || '',
        tarjetaRef: payments.tarjetaRef || '',
        cruceRef: payments.cruceRef || '',
        paymentMethod: getPrimaryPaymentMethod(),
        creditDueDate: formData.paymentMethod === 'credito' ? creditDueDate : '',
        creditObservations: formData.paymentMethod === 'credito' ? creditObservations : '',
        updatedAt: now.toISOString(),
        updatedBy: 'Servicio Fiscal SRI'
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), sanitizeFirestoreData(finalTx));
      
      // Save and increment the sequential value in Firestore config document
      const nextSec = Number(sec) + 1;
      const secUpdate = {
        [secKey]: nextSec
      };
      await setDoc(configRef, sanitizeFirestoreData(secUpdate), { merge: true });

      setFormData(finalTx);
      showToast('Comprobante autorizado tributariamente por el SRI', 'success');
      
    } catch (err) {
      console.error(err);
      if (err.logs) setSriLogs(err.logs);
      showToast(err.error || err.message || 'Fallo en la autorización del SRI', 'error');
    } finally {
      setIsEmitting(false);
    }
  };

  const handleAnular = async () => {
    if (window.confirm("¿Estás seguro de que deseas ANULAR este comprobante ante el SRI?")) {
      try {
        const docId = formData.id;
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), sanitizeFirestoreData({
          sriStatus: 'anulado',
          updatedAt: new Date().toISOString()
        }), { merge: true });
        
        setFormData(prev => ({ ...prev, sriStatus: 'anulado' }));
        showToast("Comprobante anulado tributariamente", "success");
      } catch (e) {
        showToast("Error al anular", "error");
      }
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
  const hasItems = formData.items && formData.items.length > 0;

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.thirdPartyId) {
        showToast('Por favor, selecciona un cliente para continuar', 'error');
        return;
      }
      const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
      if (!matchedTercero) {
        showToast('El contacto seleccionado no es válido', 'error');
        return;
      }
      if (!validarIdentificacion(matchedTercero.ruc)) {
        showToast(`El RUC/CI del contacto (${matchedTercero.ruc}) no es válido para Ecuador`, 'error');
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.items || formData.items.length === 0) {
        showToast('Debes seleccionar al menos un producto para la venta', 'error');
        return;
      }
      const invalid = formData.items.some(item => !item.productId || Number(item.quantity) <= 0 || Number(item.price) < 0);
      if (invalid) {
        showToast('Asegúrate de que todos los ítems del Mini POS tengan cantidad y precio válido', 'error');
        return;
      }
      if (Number(formData.total) < 0) {
        showToast('El valor total del comprobante no puede ser menor a cero', 'error');
        return;
      }
      const paymentStatus = calculatePaymentStatus();
      if (!paymentStatus.isValid) {
        showToast(paymentStatus.error, 'error');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/25 border-white/10 text-white focus:border-blue-500/50 disabled:opacity-50' 
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/35 disabled:bg-gray-100 disabled:opacity-75 font-medium'
  }`;

  const steps = [
    { id: 1, name: 'Cabecera' },
    { id: 2, name: 'Productos y Pago (Mini POS)' },
    { id: 3, name: 'Emisión y Registro' }
  ];

  const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
  const paymentStatus = calculatePaymentStatus();
  const efVal = Number(payments.efectivo) || 0;
  const tjVal = Number(payments.tarjeta) || 0;
  const trVal = Number(payments.transferencia) || 0;
  const crVal = Number(payments.cruce_cuentas) || 0;
  const totalPaid = efVal + tjVal + trVal + crVal;

  return createPortal(
    <div className={`fixed inset-0 z-[100] w-screen h-screen overflow-y-auto flex flex-col font-sans ${isDarkMode ? 'bg-[#0c0c0e] text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* TOP HEADER */}
      <div className={`sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md ${isDarkMode ? 'border-white/5 bg-[#151517]/95' : 'border-gray-200 bg-white/95'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${formData.type === 'ingreso' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            <Calculator size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              {formData.id ? 'Detalles de' : 'Asistente de'} {formData.type === 'ingreso' ? 'Venta Directa' : 'Gasto / Egreso'}
              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wide ${
                formData.type === 'ingreso' 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {formData.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
              </span>
            </h2>
            {formData.claveAcceso && <p className="text-[9px] font-mono text-gray-400 mt-0.5">Clave SRI: {formData.claveAcceso}</p>}
          </div>
        </div>
        <button 
          onClick={onClose} 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold ${
            isDarkMode 
              ? 'border-white/10 hover:bg-white/5 text-gray-400 hover:text-white' 
              : 'border-gray-300 hover:bg-gray-100 text-gray-700'
          }`}
        >
          <X size={14} />
          <span>Cerrar</span>
        </button>
      </div>

      {/* STEP INDICATOR BAR */}
      <div className={`px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => {
                  if (!isEditable) {
                    setCurrentStep(step.id);
                    return;
                  }
                  
                  if (step.id > 1 && !formData.thirdPartyId) {
                    showToast('Selecciona primero un cliente en el Paso 1', 'error');
                    return;
                  }
                  if (step.id > 2) {
                    if (!formData.items || formData.items.length === 0) {
                      showToast('Debes seleccionar productos en el Paso 2', 'error');
                      return;
                    }
                    const invalid = formData.items.some(item => !item.productId || Number(item.quantity) <= 0 || Number(item.price) < 0);
                    if (invalid) {
                      showToast('Corrige los productos en el Paso 2', 'error');
                      return;
                    }
                    const pStatus = calculatePaymentStatus();
                    if (!pStatus.isValid) {
                      showToast(pStatus.error, 'error');
                      return;
                    }
                  }
                  setCurrentStep(step.id);
                }}
                className="flex flex-col items-center gap-1.5 focus:outline-none group relative"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === step.id
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-md'
                    : currentStep > step.id
                      ? 'bg-emerald-600 text-white'
                      : isDarkMode 
                        ? 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10' 
                        : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}>
                  {step.id}
                </div>
                <span className={`text-[10px] font-bold tracking-wide uppercase transition-colors ${
                  currentStep === step.id
                    ? 'text-blue-500'
                    : currentStep > step.id
                      ? 'text-emerald-500'
                      : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {step.name}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all ${
                  currentStep > step.id 
                    ? 'bg-emerald-600/50' 
                    : isDarkMode ? 'bg-white/5' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STATE BANNERS (Sri authorized / canceled) */}
      {isAuthorized && (
        <div className="m-6 mb-0 p-4 rounded-2xl border border-dashed bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex items-center gap-3">
          <CheckCircle2 size={20} className="shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Comprobante Autorizado por el SRI</p>
            <p className="opacity-80">Este documento tiene efectos fiscales y no puede ser editado ni eliminado. Para corregirlo, emita una Nota de Crédito.</p>
          </div>
        </div>
      )}

      {isAnulado && (
        <div className="m-6 mb-0 p-4 rounded-2xl border border-dashed bg-red-500/10 border-red-500/20 text-red-400 flex items-center gap-3">
          <ShieldAlert size={20} className="shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Comprobante Anulado</p>
            <p className="opacity-80">Este documento ya no tiene validez tributaria ante el SRI.</p>
          </div>
        </div>
      )}

      {/* STEP CONTAINER BODY */}
      <div className="flex-1 p-6 max-w-5xl w-full mx-auto">
        
        {/* STEP 1: CABECERA Y CLIENTE */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-250">
            <div className={`p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-4 border-b pb-3 border-gray-200 dark:border-white/5">
                <Layers className="text-blue-500" size={16} />
                <h3 className="text-xs font-bold uppercase tracking-wider">Datos de Cabecera Tributaria</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={!isEditable ? "" : "md:col-span-2"}>
                  <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Tipo de Documento</label>
                  {sriConfig?.rucActivo === false && (
                    <p className="text-[10px] text-amber-500 font-semibold mb-1">
                      ⚠️ RUC inactivo en configuración. Factura electrónica bloqueada.
                    </p>
                  )}
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
                      if (newDocType === 'factura') {
                        nextSec = String(sriConfig?.secuencialFactura || 1);
                      } else if (newDocType === 'retencion') {
                        nextSec = String(sriConfig?.secuencialRetencion || 1);
                      } else if (newDocType === 'nota_credito') {
                        nextSec = String(sriConfig?.secuencialNotaCredito || 1);
                      } else if (newDocType === 'liquidacion') {
                        nextSec = String(sriConfig?.secuencialLiquidacion || 1);
                      } else if (newDocType === 'nota_venta') {
                        nextSec = String(sriConfig?.secuencialNotaVenta || 1);
                      }
                      
                      setFormData(prev => ({
                        ...prev,
                        documentType: newDocType,
                        secuencial: nextSec
                      }));
                    }} 
                    className={inputClass}
                  >
                    {formData.documentType === 'nota_credito' ? (
                      <option value="nota_credito">Nota de Crédito</option>
                    ) : formData.documentType === 'retencion' ? (
                      <option value="retencion">Comprobante de Retención</option>
                    ) : formData.documentType === 'nota_debito' ? (
                      <option value="nota_debito">Nota de Débito</option>
                    ) : (
                      <>
                        <option value="factura" disabled={sriConfig?.rucActivo === false}>
                          Factura Electrónica {sriConfig?.rucActivo === false ? '(Bloqueado - RUC Inactivo)' : ''}
                        </option>
                        <option value="nota_venta">Nota de Venta (Recibo)</option>
                      </>
                    )}
                  </select>
                </div>

                {!isEditable && (
                  <div>
                    <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Número de Comprobante</label>
                    <input disabled type="text" value={formData.documentNumber} className={inputClass} />
                  </div>
                )}

                <div>
                  <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Fecha de Emisión</label>
                  <input disabled={true} type="date" value={formData.date} className={`${inputClass} opacity-80 cursor-not-allowed`} />
                </div>

                <div>
                  <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Moneda</label>
                  <select disabled={!isEditable} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className={inputClass}>
                    <option value="USD">Dólares (USD)</option>
                    <option value="EUR">Euros (EUR)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Referencia de Venta</label>
                  <input 
                    disabled={!isEditable} 
                    type="text" 
                    value={formData.referencia || ''} 
                    onChange={e => setFormData({...formData, referencia: e.target.value})} 
                    className={inputClass} 
                    placeholder="Ej. Pedido #1024, Orden de Compra" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Descripción / Detalle de la Factura</label>
                  <input 
                    disabled={!isEditable} 
                    type="text" 
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className={inputClass} 
                    placeholder="Ej. Servicios de consultoría de desarrollo de software correspondientes a..." 
                  />
                </div>

                {formData.documentType === 'nota_credito' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-3 border-t border-dashed border-gray-200 dark:border-white/5 pt-4 mt-2">
                    <div>
                      <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Doc Modificado</label>
                      <select disabled={!isEditable} value={formData.codDocModificado || '01'} onChange={e => setFormData({...formData, codDocModificado: e.target.value})} className={inputClass}>
                        <option value="01">Factura</option>
                        <option value="03">Liquidación de Compra</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Nro. Doc Modificado</label>
                      <input disabled={!isEditable} type="text" required value={formData.numDocModificado || ''} onChange={e => setFormData({...formData, numDocModificado: e.target.value})} className={inputClass} placeholder="001-001-000000123" />
                    </div>
                    <div>
                      <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Fecha Emisión Doc Modificado</label>
                      <input disabled={!isEditable} type="date" required value={formData.fechaEmisionDocSustento || ''} onChange={e => setFormData({...formData, fechaEmisionDocSustento: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={`block text-[9px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Motivo de Modificación</label>
                      <input disabled={!isEditable} type="text" required value={formData.motivo || ''} onChange={e => setFormData({...formData, motivo: e.target.value})} className={inputClass} placeholder="Ej. Devolución de mercadería" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-4 border-b pb-3 border-gray-200 dark:border-white/5">
                <User className="text-purple-500" size={16} />
                <h3 className="text-xs font-bold uppercase tracking-wider">Tercero Relacionado (Cliente o Proveedor)</h3>
              </div>

              <div className="space-y-4">
                <label className={`block text-[9px] font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Buscar y Seleccionar Contacto</label>
                <div className="flex gap-2">
                  <select 
                    disabled={!isEditable} 
                    required 
                    value={formData.thirdPartyId} 
                    onChange={e => setFormData({...formData, thirdPartyId: e.target.value})} 
                    className={inputClass}
                  >
                    <option value="" disabled>Selecciona un contacto...</option>
                    {thirdParties
                      .filter(tp => formData.type === 'ingreso' ? tp.type === 'cliente' : tp.type === 'proveedor')
                      .map(tp => (
                        <option key={tp.id} value={tp.id} className="text-black">
                          {tp.name} — RUC/CI: {tp.ruc}
                        </option>
                      ))
                    }
                  </select>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddFormData({
                          name: '',
                          ruc: '',
                          email: '',
                          tipoIdentificacion: 'ruc',
                          direccion: '',
                          telefono: '',
                          tipoContribuyente: 'general'
                        });
                        setIsQuickAddOpen(true);
                      }}
                      className={`px-4 rounded-xl border flex items-center justify-center transition-all shrink-0 font-bold text-xs gap-1.5 ${
                        isDarkMode 
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' 
                          : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 shadow-sm'
                      }`}
                      title="Crear Contacto Rápido"
                    >
                      <Plus size={14} />
                      <span>Nuevo</span>
                    </button>
                  )}
                </div>

                {matchedTercero && (
                  <div className={`p-4 rounded-2xl border text-xs grid grid-cols-2 md:grid-cols-4 gap-4 ${
                    isDarkMode ? 'bg-black/10 border-white/5 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}>
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Razón Social</p>
                      <p className="font-bold">{matchedTercero.name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Identificación</p>
                      <p className="font-mono">{matchedTercero.ruc}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Correo</p>
                      <p className="truncate">{matchedTercero.email || '(No asignado)'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Dirección</p>
                      <p className="truncate">{matchedTercero.direccion || '(No asignado)'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DETALLES DE RETENCIONES Y SUSTENTOS */}
        {currentStep === 2 && formData.documentType === 'retencion' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom duration-250">
            
            {/* SECCION RETENCIONES DETALLE */}
            <div className="lg:col-span-2 space-y-4">
              <div className={`p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center border-b pb-3 mb-4 border-gray-200 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Layers className="text-blue-500" size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Desglose de Retenciones</h3>
                  </div>
                  {isEditable && (
                    <button 
                      type="button" 
                      onClick={handleAddRetencion} 
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      <Plus size={12} /> Añadir Fila
                    </button>
                  )}
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {(formData.retenciones || []).map((ret, index) => (
                    <div key={index} className={`p-4 rounded-2xl border space-y-3 relative ${
                      isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200 shadow-sm'
                    }`}>
                      {isEditable && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveRetencion(index)} 
                          className="absolute top-4 right-4 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Impuesto</label>
                          <select 
                            disabled={!isEditable}
                            value={ret.codigo} 
                            onChange={(e) => handleRetencionChange(index, 'codigo', e.target.value)} 
                            className={inputClass}
                          >
                            <option value="1">Renta</option>
                            <option value="2">IVA</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Concepto / Código SRI</label>
                          <select 
                            disabled={!isEditable}
                            value={ret.codigoRetencion} 
                            onChange={(e) => handleRetencionChange(index, 'codigoRetencion', e.target.value)} 
                            className={inputClass}
                          >
                            {ret.codigo === '1' ? 
                              SRI_RENTA_CODES.map(c => <option key={c.code} value={c.code} className="text-black">{c.label}</option>) :
                              SRI_IVA_CODES.map(c => <option key={c.code} value={c.code} className="text-black">{c.label}</option>)
                            }
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Base Imponible ($)</label>
                          <input 
                            disabled={!isEditable}
                            type="number" 
                            step="0.01"
                            value={ret.baseImponible || ''} 
                            onChange={(e) => handleRetencionChange(index, 'baseImponible', e.target.value)} 
                            className={inputClass} 
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Porcentaje (%)</label>
                          <input 
                            disabled={!isEditable}
                            type="number" 
                            step="0.1"
                            value={ret.porcentajeRetener || ''} 
                            onChange={(e) => handleRetencionChange(index, 'porcentajeRetener', e.target.value)} 
                            className={inputClass} 
                            placeholder="0.0"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Valor Retenido</label>
                          <div className="px-3 py-2.5 rounded-xl border border-white/5 font-bold text-center bg-black/10">
                            ${Number(ret.valorRetenido || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/5 pt-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Doc. Sustento</label>
                          <select 
                            disabled={!isEditable}
                            value={ret.codDocSustento || '01'} 
                            onChange={(e) => handleRetencionChange(index, 'codDocSustento', e.target.value)} 
                            className={inputClass}
                          >
                            <option value="01">Factura</option>
                            <option value="03">Liquidación de Compra</option>
                            <option value="05">Nota de Débito</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Número de Factura Sustento</label>
                          <input 
                            disabled={!isEditable}
                            type="text" 
                            value={ret.numDocSustento || ''} 
                            onChange={(e) => handleRetencionChange(index, 'numDocSustento', e.target.value)} 
                            className={inputClass} 
                            placeholder="001-001-000000045"
                          />
                        </div>
                      </div>

                    </div>
                  ))}

                  {(!formData.retenciones || formData.retenciones.length === 0) && (
                    <div className="py-12 text-center text-gray-500 text-xs italic">
                      No hay filas de retención agregadas. Haz clic en "Añadir Fila" para comenzar.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECCION RESUMEN RETENCION */}
            <div>
              <div className={`p-6 rounded-3xl border shadow-sm h-full flex flex-col justify-between ${
                isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'
              }`}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-gray-200 dark:border-white/5">
                    <Calculator className="text-purple-500" size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Consolidado Retenido</h3>
                  </div>

                  <div className={`p-4 rounded-2xl border text-xs space-y-3.5 ${
                    isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-250'
                  }`}>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Bases:</span>
                      <span className="font-bold">${Number(formData.baseImponible).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-yellow-500">
                      <span>Total Retenido:</span>
                      <span className="font-black text-sm">${Number(formData.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl border border-dashed border-gray-550/20 text-[10px] text-gray-500 leading-normal">
                  Este comprobante de retención será emitido de acuerdo a las bases imponibles y porcentajes desglosados en el SRI.
                </div>
              </div>
            </div>

          </div>
        )}

        {/* STEP 2: DETALLES DE PRODUCTOS Y IMPUESTOS (LIQUIDACION COMBINADA) */}
        {currentStep === 2 && formData.documentType !== 'retencion' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom duration-250">
            
            {/* SECCION PRODUCTOS (LEFT PANEL) */}
            <div className="lg:col-span-2 space-y-4">
              <div className={`p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center border-b pb-3 mb-4 border-gray-200 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Layers className="text-blue-500" size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Productos / Servicios</h3>
                  </div>
                  {isEditable && (
                    <button 
                      type="button" 
                      onClick={handleAddItem} 
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      <Plus size={12} /> Añadir Fila Manual
                    </button>
                  )}
                </div>

                {/* POS Search Bar */}
                {isEditable && (
                  <div className="relative mb-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        value={productSearchTerm}
                        onChange={e => setProductSearchTerm(e.target.value)}
                        className={`${inputClass} pl-10`}
                        placeholder="Buscar productos por nombre, SKU o código de barras..."
                      />
                      <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
                      {productSearchTerm && (
                        <button 
                          type="button"
                          onClick={() => setProductSearchTerm('')}
                          className="absolute right-3.5 top-3 text-gray-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Results Dropdown */}
                    {productSearchTerm.trim() !== '' && (
                      <div className={`absolute z-30 w-full rounded-2xl border shadow-xl max-h-60 overflow-y-auto mt-1 ${
                        isDarkMode ? 'bg-[#1e1e22] border-white/10 text-white' : 'bg-white border-gray-250 text-gray-900'
                      }`}>
                        {(() => {
                          const matches = products.filter(p => 
                            p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            p.codigoBarras?.toLowerCase().includes(productSearchTerm.toLowerCase())
                          ).slice(0, 10);

                          if (matches.length > 0) {
                            return matches.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleAddProductToCart(p)}
                                className={`w-full text-left px-4 py-3 text-xs flex justify-between items-center border-b last:border-0 transition-colors ${
                                  isDarkMode ? 'border-white/5 hover:bg-white/10' : 'border-gray-100 hover:bg-gray-50'
                                }`}
                              >
                                <div>
                                  <p className="font-bold">{p.name}</p>
                                  <p className="text-[10px] text-gray-450 font-mono">
                                    {p.sku ? `SKU: ${p.sku}` : ''} {p.codigoBarras ? ` | EAN: ${p.codigoBarras}` : ''}
                                  </p>
                                </div>
                                <span className="font-black text-blue-500">${Number(p.price).toFixed(2)}</span>
                              </button>
                            ));
                          } else {
                            return (
                              <div className="p-4 text-center text-xs text-gray-500 italic">
                                No se encontraron productos coincidentes
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Cart Items List */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {(formData.items || []).map((item, index) => (
                    <div key={index} className={`flex flex-col sm:flex-row items-center gap-2.5 p-3 rounded-2xl border transition-all ${
                      isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200 shadow-sm'
                    }`}>
                      
                      <div className="flex-1 w-full text-xs">
                        {item.productId ? (
                          <>
                            <p className="font-bold text-sm">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              {item.sku ? `SKU: ${item.sku}` : ''} {item.codigoBarras ? ` | EAN: ${item.codigoBarras}` : ''}
                            </p>
                          </>
                        ) : (
                          <select 
                            disabled={!isEditable}
                            value={item.productId} 
                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)} 
                            className={inputClass}
                          >
                            <option value="" disabled>Seleccionar Producto...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id} className="text-black">
                                {p.codigoBarras ? `[${p.codigoBarras}]` : p.sku ? `[${p.sku}]` : ''} {p.name} — ${Number(p.price).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 w-full sm:w-32 justify-center">
                        <button
                          type="button"
                          disabled={!isEditable}
                          onClick={() => {
                            const newQty = Math.max(1, (parseInt(item.quantity) || 1) - 1);
                            handleItemChange(index, 'quantity', newQty);
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base transition-colors ${
                            isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          }`}
                        >
                          -
                        </button>
                        <input 
                          disabled={!isEditable}
                          type="number" 
                          required 
                          min={1} 
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} 
                          className={`w-12 text-center font-bold bg-transparent outline-none text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`} 
                          placeholder="Cant"
                        />
                        <button
                          type="button"
                          disabled={!isEditable}
                          onClick={() => {
                            const newQty = (parseInt(item.quantity) || 1) + 1;
                            handleItemChange(index, 'quantity', newQty);
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base transition-colors ${
                            isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-250 hover:bg-gray-300 text-gray-800'
                          }`}
                        >
                          +
                        </button>
                      </div>

                      {/* Price input */}
                      <div className="w-full sm:w-28 relative">
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-gray-500 font-bold">$</span>
                        <input 
                          disabled={!isEditable}
                          type="number" 
                          step="0.01" 
                          required 
                          value={item.price} 
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                          className={`${inputClass} pl-6 font-semibold`} 
                          placeholder="Precio"
                        />
                      </div>

                      {/* Line subtotal */}
                      <div className="text-xs font-black w-full sm:w-20 text-right shrink-0">
                        ${((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}
                      </div>

                      {isEditable && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(index)} 
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}

                  {(!formData.items || formData.items.length === 0) && (
                    <div className="py-12 text-center text-gray-500 text-xs italic flex flex-col items-center gap-2">
                      <Layers size={24} className="text-gray-400" />
                      <span>El carrito está vacío. Busque productos arriba para agregarlos.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECCION LIQUIDACION DE IMPUESTOS Y PAGO (RIGHT PANEL) */}
            <div className="space-y-4">
              <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between h-full ${
                isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'
              }`}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3 border-gray-200 dark:border-white/5">
                    <Calculator className="text-purple-500" size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Totales e Impuestos</h3>
                  </div>

                  <div className={`p-4 rounded-2xl border text-xs space-y-2.5 mt-4 ${
                    isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-250'
                  }`}>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal:</span>
                      <span className="font-bold">${Number(formData.baseImponible).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">IVA ({formData.ivaPorcentaje}%):</span>
                      <span className="font-bold">${Number(formData.ivaValor).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed dark:border-white/5 pt-2 text-base font-black">
                      <span>Total Neto:</span>
                      <span>${formData.total}</span>
                    </div>
                  </div>

                  {/* SELECTOR FORMA DE PAGO */}
                  <div className="border-t border-dashed dark:border-white/5 pt-4">
                    <label className={`block text-[9px] font-bold uppercase mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Forma de Pago Principal</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'efectivo', label: 'Efectivo', icon: DollarSign },
                        { id: 'transferencia', label: 'Transferencia', icon: RefreshCw },
                        { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                        { id: 'credito', label: 'Crédito / CxC', icon: User }
                      ].map(m => {
                        const isActive = formData.paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handlePaymentMethodSelect(m.id)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1 ${
                              isActive 
                                ? `${isDarkMode ? 'bg-blue-600/25 border-blue-500/40 text-blue-400 font-extrabold' : 'bg-blue-50 border-blue-500 text-blue-800 font-extrabold'}`
                                : `${isDarkMode ? 'border-white/5 text-gray-400 hover:bg-white/5 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`
                            }`}
                          >
                            <m.icon size={16} />
                            <span className="text-[10px] tracking-wide font-bold">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CAMPOS CONDICIONALES DE PAGO */}
                  <div className="border-t border-dashed dark:border-white/5 pt-4">
                    {formData.paymentMethod === 'efectivo' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Efectivo Recibido ($)</label>
                          <input 
                            disabled={!isEditable}
                            type="number" 
                            step="0.01" 
                            value={payments.efectivo || ''} 
                            onChange={e => setPayments({...payments, efectivo: e.target.value})} 
                            className={inputClass} 
                            placeholder="0.00" 
                          />
                        </div>
                        {Number(payments.efectivo) > 0 && (
                          <div className={`p-3 rounded-xl text-center font-bold text-xs ${
                            (Number(payments.efectivo) || 0) >= Number(formData.total)
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                              : 'bg-red-500/10 text-red-400 border border-red-500/15'
                          }`}>
                            {(Number(payments.efectivo) || 0) >= Number(formData.total) ? (
                              <>
                                <p className="text-[8px] uppercase tracking-wider text-emerald-500 font-black">Cambio / Vuelto</p>
                                <p className="text-lg">${Math.max(0, (Number(payments.efectivo) || 0) - Number(formData.total)).toFixed(2)}</p>
                              </>
                            ) : (
                              <p className="text-[10px]">Falta cubrir ${(Number(formData.total) - (Number(payments.efectivo) || 0)).toFixed(2)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {formData.paymentMethod === 'transferencia' && (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Referencia / Banco</label>
                          <input 
                            disabled={!isEditable}
                            type="text" 
                            value={payments.transferenciaRef || ''} 
                            onChange={e => setPayments({...payments, transferenciaRef: e.target.value})} 
                            className={inputClass} 
                            placeholder="Ej. Depósito Pichincha / Transferencia Banco Guayaquil" 
                          />
                        </div>
                        <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/5 text-[10px] text-blue-400 leading-normal flex items-start gap-2">
                          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                          <span>Se generará una cuenta por cobrar. Podrá registrar y conciliar el depósito real en el módulo de Cuentas por Cobrar en Contabilidad.</span>
                        </div>
                      </div>
                    )}

                    {formData.paymentMethod === 'tarjeta' && (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Nro Lote / Autorización / Banco</label>
                          <input 
                            disabled={!isEditable}
                            type="text" 
                            value={payments.tarjetaRef || ''} 
                            onChange={e => setPayments({...payments, tarjetaRef: e.target.value})} 
                            className={inputClass} 
                            placeholder="Ej. Lote 0234 - Produbanco" 
                          />
                        </div>
                        <div className="p-3.5 rounded-xl border border-purple-500/10 bg-purple-500/5 text-[10px] text-purple-400 leading-normal flex items-start gap-2">
                          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                          <span>Se registrará en cuentas por cobrar. El administrador cerrará la cuenta con el voucher correspondiente una vez liquidada la tarjeta.</span>
                        </div>
                      </div>
                    )}

                    {formData.paymentMethod === 'credito' && (
                      <div className="space-y-3 text-xs">
                        <div className={`p-3.5 rounded-xl border ${
                          (() => {
                            const limit = Number(matchedTercero?.limiteCredito) || 1000;
                            const available = limit - clientDebt - Number(formData.total);
                            return available < 0 ? 'bg-red-500/10 border-red-500/15 text-red-400 animate-pulse' : 'bg-amber-500/10 border-amber-500/15 text-amber-400';
                          })()
                        }`}>
                          <div className="flex justify-between items-center font-bold mb-2">
                            <span>Límite de Crédito:</span>
                            <span>${(Number(matchedTercero?.limiteCredito) || 1000).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center font-semibold text-[11px] mb-2 opacity-90">
                            <span>Deuda Actual:</span>
                            <span>${clientDebt.toFixed(2)}</span>
                          </div>
                          {(() => {
                            const limit = Number(matchedTercero?.limiteCredito) || 1000;
                            const available = limit - clientDebt - Number(formData.total);
                            return (
                              <div className="flex justify-between items-center font-black text-xs border-t border-dashed dark:border-white/5 pt-2">
                                <span>Cupo Disponible:</span>
                                <span>${available.toFixed(2)}</span>
                              </div>
                            );
                          })()}
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsCreditModalOpen(true)}
                          className={`w-full py-2.5 rounded-xl border text-[11px] font-bold uppercase transition-all text-center ${
                            isDarkMode 
                              ? 'bg-amber-600/25 border-amber-500/20 text-amber-400 hover:bg-amber-600/35' 
                              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          Ver y Editar Detalles del Crédito
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>

          </div>
        )}

        {/* STEP 4: EMISIÓN Y AUTORIZACIÓN SRI */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-250">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-2 space-y-6">
                
                {/* TARJETA RESUMEN GENERAL (RIDE STYLE PREVIEW) */}
                <div className={`p-6 rounded-3xl border shadow-lg ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-4 border-b pb-3 border-gray-200 dark:border-white/5">
                    <FileText className="text-blue-500" size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Vista Previa del RIDE (SRI Ecuador)</h3>
                  </div>

                  {/* RIDE SHEET */}
                  <div className={`p-5 rounded-2xl border text-[11px] leading-relaxed select-none ${
                    isDarkMode ? 'bg-black/20 border-white/5 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}>
                    
                    {/* Header: Emisor vs Document details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4 mb-4 dark:border-white/5">
                      {/* Left: Emisor Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Building className="text-blue-500 shrink-0" size={20} />
                          <span className="font-extrabold text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400">
                            {sriConfig.nombreComercial || 'WEBFIX SOLUCIONES'}
                          </span>
                        </div>
                        <p className="font-bold text-[10px] text-gray-900 dark:text-white uppercase">{sriConfig.razonSocial || 'WEBFIX SOLUCIONES TECNOLOGICAS S.A.'}</p>
                        <p className="text-[10px]"><span className="font-bold text-gray-500">RUC:</span> <span className="font-mono">{sriConfig.ruc || '1790000000001'}</span></p>
                        <p className="text-[10px]"><span className="font-bold text-gray-500">Dirección Matriz:</span> {sriConfig.direccionMatriz}</p>
                        <p className="text-[9px] text-gray-500 uppercase mt-2">
                          {sriConfig.obligadoContabilidad ? 'Obligado a llevar contabilidad: SÍ' : 'Obligado a llevar contabilidad: NO'}
                        </p>
                        {sriConfig.regimenRimpe && (
                          <p className="text-[9px] text-emerald-500 font-bold uppercase">
                            Contribuyente Régimen: {sriConfig.regimenRimpe.replace('_', ' ')}
                          </p>
                        )}
                      </div>

                      {/* Right: Auth & Clave Acceso info */}
                      <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                        isDarkMode ? 'bg-black/25 border-white/5' : 'bg-white border-gray-200 shadow-sm'
                      }`}>
                        <div>
                          <p className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white">
                            {formData.documentType === 'factura' ? 'Factura Electrónica' : 'Nota de Venta (Recibo)'}
                          </p>
                          <p className="font-mono text-[11px] font-bold text-blue-500 mt-0.5">
                            Nº:{' '}
                            {isEditable && !formData.documentNumber
                              ? `${sriConfig.establecimiento || '001'}-${sriConfig.puntoEmision || '001'}-${String(formData.secuencial || sriConfig.secuencialFactura || 1).padStart(9, '0')}`
                              : formData.documentNumber
                            }
                          </p>
                        </div>
                        <div className="mt-3.5 space-y-1 text-[10px]">
                          <p><span className="font-bold text-gray-500">Ambiente:</span> {sriConfig.ambiente === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'}</p>
                          <p><span className="font-bold text-gray-500">Emisión:</span> NORMAL</p>
                          <p className="font-bold text-gray-500 mt-2">Clave de Acceso / Autorización SRI:</p>
                          <p className="font-mono text-[9px] break-all leading-normal text-gray-400">
                            {formData.claveAcceso || '0604202601179000000000120010010000001231234567812'}
                          </p>
                          
                          {/* DYNAMIC BARCODE RENDER */}
                          <div className="flex items-center justify-center gap-px h-6 bg-white py-1 px-2 rounded border border-gray-200 mt-2 select-none overflow-hidden max-w-[200px]">
                            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 2, 1, 3, 1].map((w, idx) => (
                              <div key={idx} className="bg-black h-full" style={{ width: `${w}px` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Client Info Grid */}
                    <div className={`p-3.5 rounded-xl border mb-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 ${
                      isDarkMode ? 'bg-black/10 border-white/5' : 'bg-white border-gray-200'
                    }`}>
                      <div>
                        <span className="font-bold text-gray-500">Razón Social / Cliente:</span>{' '}
                        <span className="font-extrabold text-gray-900 dark:text-white">{matchedTercero?.name || 'Cliente no seleccionado'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">CI / RUC:</span>{' '}
                        <span className="font-mono font-bold">{matchedTercero?.ruc || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">Dirección:</span>{' '}
                        <span>{matchedTercero?.direccion || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">Fecha Emisión:</span>{' '}
                        <span>{formData.date}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">Email:</span>{' '}
                        <span>{matchedTercero?.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">Forma de Pago:</span>{' '}
                        <span className="font-bold capitalize">{formData.paymentMethod === 'credito' ? 'Crédito' : formData.paymentMethod}</span>
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="overflow-x-auto mb-4 border rounded-xl dark:border-white/5">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className={`border-b dark:border-white/5 bg-gray-550/5 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <th className="py-2 px-3 font-bold">Cod. Principal</th>
                            <th className="py-2 px-3 font-bold">Descripción</th>
                            <th className="py-2 px-3 font-bold text-center">Cantidad</th>
                            <th className="py-2 px-3 font-bold text-right">Precio Unitario</th>
                            <th className="py-2 px-3 font-bold text-right">Descuento</th>
                            <th className="py-2 px-3 font-bold text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                          {(formData.items || []).map((it, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="py-2 px-3 font-mono text-gray-400">{it.sku || it.productId?.slice(3, 10) || '0001'}</td>
                              <td className="py-2 px-3 font-bold">{it.name}</td>
                              <td className="py-2 px-3 text-center">{Number(it.quantity).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right">${Number(it.price).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right">$0.00</td>
                              <td className="py-2 px-3 text-right font-bold">${(it.price * it.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                          {(!formData.items || formData.items.length === 0) && (
                            <tr>
                              <td colSpan="6" className="py-4 text-center text-gray-500 italic">No hay ítems registrados.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Bottom: Observations and Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Additional Info */}
                      <div className="space-y-3">
                        <div className={`p-3 rounded-xl border h-full ${
                          isDarkMode ? 'bg-black/10 border-white/5' : 'bg-white border-gray-200'
                        }`}>
                          <p className="font-bold text-gray-500 border-b pb-1 dark:border-white/5 mb-1.5 uppercase text-[9px] tracking-wider">Información Adicional</p>
                          <div className="space-y-1.5 text-[9px]">
                            {formData.referencia && <p><span className="font-bold text-gray-400">Referencia:</span> {formData.referencia}</p>}
                            {formData.description && <p><span className="font-bold text-gray-400">Observaciones:</span> {formData.description}</p>}
                            <p><span className="font-bold text-gray-400">Moneda:</span> Dólares (USD)</p>
                            
                            {/* Payment details block */}
                            <div className="mt-2.5 pt-2.5 border-t dark:border-white/5">
                              <p className="font-bold text-gray-400 mb-1 uppercase text-[8px] tracking-widest">Detalle Formas de Pago</p>
                              <div className="flex justify-between font-mono bg-gray-550/5 p-1.5 rounded border dark:border-white/5 text-[9px]">
                                <span>
                                  {formData.paymentMethod === 'efectivo' && '01 - SIN UTILIZACION DEL SISTEMA FINANCIERO (EFECTIVO)'}
                                  {formData.paymentMethod === 'transferencia' && '20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO (TRANSFERENCIA)'}
                                  {formData.paymentMethod === 'tarjeta' && '19 - TARJETA DE CREDITO / DEBITO'}
                                  {formData.paymentMethod === 'credito' && '19 - OTROS (CUENTA POR COBRAR INTERNA - CREDITO)'}
                                </span>
                                <span className="font-extrabold text-blue-500">${formData.total}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Totals Breakdown */}
                      <div className="space-y-1 text-xs">
                        <div className={`p-3 rounded-xl border space-y-1.5 ${
                          isDarkMode ? 'bg-black/10 border-white/5' : 'bg-white border-gray-200'
                        }`}>
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal 15%:</span>
                            <span className="font-bold font-mono">
                              ${(
                                (formData.items || [])
                                  .filter(item => (parseInt(item.ivaCategory) || 15) === 15)
                                  .reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal 0%:</span>
                            <span className="font-bold font-mono">
                              ${(
                                (formData.items || [])
                                  .filter(item => (parseInt(item.ivaCategory) || 15) === 0)
                                  .reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-500 border-t dark:border-white/5 pt-1.5">
                            <span>Subtotal Sin Impuestos:</span>
                            <span className="font-bold font-mono">${Number(formData.baseImponible).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Total Descuento:</span>
                            <span className="font-bold font-mono">$0.00</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>IVA 15%:</span>
                            <span className="font-bold font-mono">${Number(formData.ivaValor).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-base font-black text-gray-900 dark:text-white border-t border-dashed dark:border-white/5 pt-1.5">
                            <span>VALOR TOTAL:</span>
                            <span className="font-mono">${formData.total}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ARCHIVOS SRI ADJUNTOS */}
                <div className={`p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex justify-between items-center">
                    Documentos Digitales Asociados
                    {isUploading && <span className="text-[9px] text-blue-500 animate-pulse">Subiendo...</span>}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex gap-2">
                      {formData.type !== 'ingreso' ? (
                        <label className={`flex-1 flex items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed cursor-pointer transition-colors ${formData.xmlUrl ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' : 'border-gray-400 hover:bg-gray-200 text-gray-800 font-semibold bg-white'}`}>
                          <input type="file" accept=".xml" className="hidden" onChange={(e) => handleFileUpload(e, 'xml')} disabled={isUploading || !isEditable}/>
                          {formData.xmlUrl ? <CheckCircle2 size={14}/> : <UploadCloud size={14}/>}
                          <span className="text-xs font-bold">{formData.xmlUrl ? 'XML Guardado' : 'Subir XML'}</span>
                        </label>
                      ) : (
                        formData.xmlUrl && (
                          <div className="flex-1 flex items-center justify-center gap-1.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-500">
                            <CheckCircle2 size={14}/>
                            <span className="text-xs font-bold">XML Generado</span>
                          </div>
                        )
                      )}
                      {formData.xmlUrl && <a href={formData.xmlUrl} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-blue-600 text-white shrink-0 hover:bg-blue-500"><FileText size={14}/></a>}
                    </div>

                    <div className="flex gap-2">
                      {formData.type !== 'ingreso' ? (
                        <label className={`flex-1 flex items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed cursor-pointer transition-colors ${formData.pdfUrl ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' : 'border-gray-400 hover:bg-gray-200 text-gray-800 font-semibold bg-white'}`}>
                          <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'pdf')} disabled={isUploading || !isEditable}/>
                          {formData.pdfUrl ? <CheckCircle2 size={14}/> : <UploadCloud size={14}/>}
                          <span className="text-xs font-bold">{formData.pdfUrl ? 'PDF RIDE' : 'Subir PDF'}</span>
                        </label>
                      ) : (
                        formData.pdfUrl && (
                          <div className="flex-1 flex items-center justify-center gap-1.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-500">
                            <CheckCircle2 size={14}/>
                            <span className="text-xs font-bold">PDF RIDE</span>
                          </div>
                        )
                      )}
                      {formData.pdfUrl && <a href={formData.pdfUrl} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-blue-600 text-white shrink-0 hover:bg-blue-500"><FileText size={14}/></a>}
                    </div>
                  </div>
                </div>

                {/* CONSOLA BITACORA DE TRANSMISION SRI */}
                {(isEmitting || sriLogs.length > 0) && (
                  <div className="p-4 rounded-3xl bg-black border border-white/10 text-white font-mono text-[10px] space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-1.5 border-b border-white/10 pb-1.5 text-gray-400">
                      <Terminal size={12} />
                      <span>Consola SRI (Ecuador)</span>
                    </div>
                    <div className="space-y-1.5">
                      {sriLogs.map((log, i) => (
                        <div key={i} className="flex gap-2 items-start leading-normal">
                          <span className="text-gray-500 shrink-0">{log.time}</span>
                          <span className={log.status === 'error' ? 'text-red-400 font-bold' : log.status === 'success' ? 'text-emerald-400' : 'text-gray-200'}>{log.message}</span>
                        </div>
                      ))}
                    </div>
                    {isEmitting && (
                      <div className="flex gap-1.5 items-center text-purple-400 animate-pulse pt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping"></span>
                        <span>Autorizando SRI en tiempo real...</span>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* PANEL LATERAL DE FINANCIACIÓN */}
              <div className="space-y-6">
                <div className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'}`}>
                  <h4 className="text-[10px] font-black uppercase text-gray-500 mb-4 tracking-wider">Liquidación y Cobro</h4>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Imponible:</span>
                      <span className="font-semibold">${Number(formData.baseImponible).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">IVA ({formData.ivaPorcentaje}%):</span>
                      <span className="font-semibold">${Number(formData.ivaValor).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Retenciones:</span>
                      <span className="font-semibold text-red-500">
                        -${(Number(formData.retencionFuente) + Number(formData.retencionIva)).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-dashed my-2 pt-2 flex justify-between text-base font-black">
                      <span>Total Neto:</span>
                      <span>${formData.total}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed my-4 pt-4 space-y-2">
                    <p className="text-[9px] uppercase text-gray-500 font-bold">Desglose de Cobros</p>
                    <div className="space-y-1.5 text-xs">
                      {efVal > 0 && <div className="flex justify-between"><span>Efectivo:</span><span className="font-bold">${efVal.toFixed(2)}</span></div>}
                      {trVal > 0 && <div className="flex justify-between"><span>Transferencia:</span><span className="font-bold">${trVal.toFixed(2)}</span></div>}
                      {tjVal > 0 && <div className="flex justify-between"><span>Tarjeta:</span><span className="font-bold">${tjVal.toFixed(2)}</span></div>}
                      {crVal > 0 && <div className="flex justify-between"><span>Cruce Cuentas:</span><span className="font-bold">${crVal.toFixed(2)}</span></div>}
                    </div>
                    {paymentStatus.vuelto > 0 && (
                      <div className="mt-2 p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-center text-xs font-bold">
                        Cambio/Vuelto: ${paymentStatus.vuelto.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* ACCIONES DE EMISION */}
                <div className="space-y-3">
                  {isEditable ? (
                    <>
                      <button 
                        type="button" 
                        onClick={handleSave} 
                        disabled={isUploading || isEmitting} 
                        className="w-full py-3 rounded-2xl text-xs font-black bg-blue-600/25 border border-blue-500/20 text-blue-400 hover:bg-blue-600/35 transition-all text-center"
                      >
                        Guardar como Borrador
                      </button>

                      {formData.type === 'ingreso' && formData.documentType !== 'nota_venta' && (
                        <button 
                          type="button" 
                          onClick={handleEmitirSRI} 
                          disabled={isUploading || isEmitting} 
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 shadow-md transition-all uppercase tracking-wide animate-pulse"
                        >
                          <Sparkles size={14} />
                          <span>Firma y Autorización SRI</span>
                        </button>
                      )}

                      {formData.type === 'ingreso' && formData.documentType === 'nota_venta' && (
                        <button 
                          type="button" 
                          onClick={() => handleSave({ isFinalizingNotaVenta: true })} 
                          disabled={isUploading || isEmitting} 
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 shadow-md transition-all uppercase tracking-wide"
                        >
                          <CheckCircle2 size={14} />
                          <span>Registrar Venta (Nota de Venta)</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      {isAuthorized && (
                        <>
                          <button 
                            type="button" 
                            onClick={downloadXMLFile} 
                            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-semibold bg-gray-600/20 text-gray-300 hover:bg-gray-600/30 transition-all border border-white/5"
                          >
                            <Download size={14} /> Descargar XML Autorizado
                          </button>
                          <button 
                            type="button" 
                            onClick={handleAnular} 
                            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-semibold bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all border border-red-500/10"
                          >
                            <ShieldAlert size={14} /> Anular en SRI
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* FOOTER WIZARD BAR */}
      <div className={`sticky bottom-0 z-20 px-6 py-4 border-t backdrop-blur-md flex justify-between items-center ${
        isDarkMode ? 'border-white/5 bg-[#151517]/95' : 'border-gray-200 bg-white/95'
      }`}>
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 1}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
            currentStep === 1 
              ? 'opacity-0 pointer-events-none' 
              : isDarkMode 
                ? 'border-white/10 hover:bg-white/5 text-gray-300' 
                : 'border-gray-300 hover:bg-gray-100 text-gray-700'
          }`}
        >
          <ArrowLeft size={14} />
          <span>Atrás</span>
        </button>

        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Paso {currentStep} de 3
        </span>

        {currentStep < 3 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-md hover:-translate-y-0.5"
          >
            <span>Siguiente</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-150 text-gray-700'
              }`}
            >
              Terminar / Salir
            </button>
          </div>
        )}
      </div>

      {/* MODAL SEGUIMIENTO DE CRÉDITO / CXC */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${
            isDarkMode ? 'bg-[#151517] border border-white/10 text-white' : 'bg-white border border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-white/5">
              <h3 className="text-sm font-black flex items-center gap-2">
                <User className="text-amber-500" size={16} />
                Seguimiento de Cuenta por Cobrar
              </h3>
              <button 
                type="button" 
                onClick={() => setIsCreditModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cliente:</span>
                  <span className="font-bold">{matchedTercero?.name || 'Cliente no seleccionado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cupo de Crédito:</span>
                  <span className="font-bold">${(Number(matchedTercero?.limiteCredito) || 1000).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Deuda Pendiente Actual:</span>
                  <span className="font-bold">${clientDebt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-400 border-t border-dashed dark:border-white/5 pt-2">
                  <span>Monto Venta Actual:</span>
                  <span className="font-bold">${Number(formData.total).toFixed(2)}</span>
                </div>
                
                {(() => {
                  const limit = Number(matchedTercero?.limiteCredito) || 1000;
                  const totalVenta = Number(formData.total) || 0;
                  const available = limit - clientDebt - totalVenta;
                  return (
                    <div className={`flex justify-between border-t border-dashed dark:border-white/5 pt-2 ${
                      available < 0 ? 'text-red-500 font-extrabold animate-pulse' : 'text-emerald-400 font-bold'
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
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] leading-normal flex items-start gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">⚠️ Límite de Crédito Superado</p>
                        <p className="opacity-90">La deuda actual más esta venta superan el cupo disponible del cliente en ${(Math.abs(available)).toFixed(2)}.</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Fecha de Vencimiento de la Deuda</label>
                  <input 
                    type="date" 
                    value={creditDueDate} 
                    onChange={e => setCreditDueDate(e.target.value)} 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Observaciones / Comentario de Crédito</label>
                  <textarea 
                    rows={3}
                    value={creditObservations} 
                    onChange={e => setCreditObservations(e.target.value)} 
                    className={`${inputClass} resize-none`} 
                    placeholder="Ej. Crédito autorizado por gerencia..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t dark:border-white/5">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsCreditModalOpen(false);
                    setFormData(prev => ({ ...prev, paymentMethod: 'efectivo' }));
                  }} 
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsCreditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md"
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-[#151517] border border-white/10' : 'bg-white border border-gray-200'}`}>
            <h3 className="text-sm font-black mb-4">
              Nuevo {formData.type === 'ingreso' ? 'Cliente' : 'Proveedor'} (Rápido)
            </h3>
            
            <form onSubmit={handleQuickAddSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Identificación</label>
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
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Número</label>
                  <div className="flex gap-1.5">
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
                      className={`px-3.5 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                        isDarkMode 
                          ? 'bg-purple-600/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30' 
                          : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 shadow-sm'
                      }`}
                      title="Consultar SRI"
                    >
                      {isQueryingSri ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Razón Social / Nombres</label>
                <input 
                  type="text" 
                  required 
                  value={quickAddFormData.name} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, name: e.target.value})} 
                  className={inputClass} 
                  placeholder="Ej. Juan Pérez" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Teléfono</label>
                  <input 
                    type="text" 
                    value={quickAddFormData.telefono || ''} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, telefono: e.target.value})} 
                    className={inputClass} 
                    placeholder="0998765432" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Régimen</label>
                  <select 
                    value={quickAddFormData.tipoContribuyente || 'general'} 
                    onChange={e => setQuickAddFormData({...quickAddFormData, tipoContribuyente: e.target.value})} 
                    className={inputClass}
                  >
                    <option value="general">General</option>
                    <option value="rimpe_popular">RIMPE Popular</option>
                    <option value="rimpe_emprendedor">RIMPE Emprendedor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Dirección</label>
                <input 
                  type="text" 
                  value={quickAddFormData.direccion || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, direccion: e.target.value})} 
                  className={inputClass} 
                  placeholder="Av. de los Shyris, Quito" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={quickAddFormData.email || ''} 
                  onChange={e => setQuickAddFormData({...quickAddFormData, email: e.target.value})} 
                  className={inputClass} 
                  placeholder="correo@ejemplo.com" 
                />
              </div>

              <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsQuickAddOpen(false)} 
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 transition-transform hover:-translate-y-0.5 shadow-md"
                >
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
