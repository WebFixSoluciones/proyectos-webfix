import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, UploadCloud, Calculator, FileText, CheckCircle2, AlertTriangle, Sparkles, 
  Terminal, ShieldAlert, Download, Plus, Trash2, RefreshCw, ArrowLeft, ArrowRight, 
  User, DollarSign, CreditCard, Layers, Search, Building
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { validarIdentificacion, generarFacturaXML, simularTransmisionSRI, consultarRucSri, generarRetencionXML, generarNotaCreditoXML, generarLiquidacionXML } from '../../services/sriService';
import { firmarComprobanteXML } from '../../services/xadesSigner';
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
  const [printTx, setPrintTx] = useState(null);
  const [printFormat, setPrintFormat] = useState('ride');
  
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

  const [activePayments, setActivePayments] = useState({
    efectivo: true,
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
    return d.toISOString().split('T')[0];
  });
  const [creditObservations, setCreditObservations] = useState('');
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

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

      // Si el documento ya fue autorizado o anulado, ir directo al paso 3 (vista de sólo lectura)
      if (tx.sriStatus === 'autorizado' || tx.sriStatus === 'anulado') {
        setCurrentStep(3);
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

  const handleSave = (options = {}) => {
    // If called via form submit event, prevent default
    if (options && typeof options.preventDefault === 'function') {
      options.preventDefault();
      options = {};
    }
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
      const serverDate = now.toISOString().split('T')[0];
      const serverTime = now.toTimeString().split(' ')[0];
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

      showToast('Transacción guardada', 'success');
      setFormData(finalTxData);
      setCurrentStep(3);
    } catch (err) {
      console.error(err);
      showToast('Error al guardar: ' + (err.message || ''), 'error');
    }
  };

  const handleEmitirSRI = () => {
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

      // El secuencial ya fue reservado e incrementado atómicamente al inicio
      // (transacción), por lo que aquí no es necesario volver a incrementarlo.

      setFormData(finalTx);
      showToast('Comprobante autorizado tributariamente por el SRI', 'success');
      setCurrentStep(3);
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
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), sanitizeFirestoreData({
        sriStatus: 'anulado',
        updatedAt: new Date().toISOString()
      }), { merge: true });
      
      setFormData(prev => ({ ...prev, sriStatus: 'anulado' }));
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
  // Documento finalizado en paso 3 — no se puede regresar ni editar desde aquí
  const isLockedInStep3 = (isAuthorized || isAnulado) && currentStep === 3;
  const hasItems = formData.items && formData.items.length > 0;

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.thirdPartyId) {
        showToast('⚠️ Selecciona un cliente antes de continuar', 'error');
        return;
      }
      const mt = thirdParties.find(tp => tp.id === formData.thirdPartyId) || formData.thirdParty;
      if (!mt) {
        showToast('El contacto seleccionado no es válido', 'error');
        return;
      }
      if (!validarIdentificacion(mt.ruc)) {
        showToast(`El RUC/CI del contacto (${mt.ruc}) no es válido para Ecuador`, 'error');
        return;
      }

      // Validate products / retenciones (moved to Step 1!)
      if (formData.documentType !== 'retencion') {
        if (!formData.items || formData.items.length === 0) {
          showToast('⚠️ Agrega al menos un producto o servicio antes de continuar', 'error');
          return;
        }
        const invalid = formData.items.some(item => !item.productId || Number(item.quantity) <= 0 || Number(item.price) < 0);
        if (invalid) {
          showToast('Asegúrate de que todos los ítems tengan cantidad y precio válidos', 'error');
          return;
        }
      } else {
        if (!formData.retenciones || formData.retenciones.length === 0) {
          showToast('⚠️ Agrega al menos una fila de retención', 'error');
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
        showToast('⚠️ Debes registrar la venta o emitir el comprobante al SRI antes de continuar', 'error');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border font-semibold ${
    isDarkMode 
      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-primary/50 disabled:opacity-50' 
      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:bg-gray-50 disabled:text-gray-500'
  }`;

  const labelClass = `block text-[10px] font-bold uppercase mb-1 tracking-wide ${
    isDarkMode ? 'text-gray-400' : 'text-gray-600'
  }`;

  const cardClass = `p-5 rounded-2xl border ${
    isDarkMode ? 'bg-[#18181b] border-white/10' : 'bg-white border-gray-200 shadow-sm'
  }`;

  const sectionTitleClass = `text-xs font-bold uppercase tracking-wider ${
    isDarkMode ? 'text-white' : 'text-gray-900'
  }`;

  const steps = [
    { id: 1, name: 'Detalle y Productos' },
    { id: 2, name: 'Formas de Pago' },
    { id: 3, name: 'Impresión' }
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
      {true && (
        <div className={`px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => {
                    // Si el documento está bloqueado en paso 3, no permitir regresar
                    if (isLockedInStep3) {
                      showToast('Este documento ya fue finalizado y no puede ser editado.', 'error');
                      return;
                    }

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
                  className={`flex flex-col items-center gap-1.5 focus:outline-none group relative ${isLockedInStep3 ? 'cursor-not-allowed' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === step.id
                      ? 'bg-primary text-white ring-4 ring-primary/20 shadow-md'
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
                      ? 'text-primary'
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
      )}

      {/* STATE BANNERS (Sri authorized / canceled) */}
      {isAuthorized && (
        <div className="m-6 mb-0 p-4 rounded-2xl border border-dashed bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex items-center gap-3">
          <CheckCircle2 size={20} className="shrink-0" />
          <div className="text-xs">
            <p className="font-bold">
              {formData.documentType === 'nota_venta' ? 'Comprobante de Venta Guardado' : 'Comprobante Autorizado por el SRI'}
            </p>
            <p className="opacity-80">
              {formData.documentType === 'nota_venta' 
                ? 'Este documento ha sido guardado para control interno y no puede ser editado ni eliminado. Para corregirlo, anule este comprobante.' 
                : 'Este documento tiene efectos fiscales y no puede ser editado ni eliminado. Para corregirlo, emita una Nota de Crédito.'}
            </p>
          </div>
        </div>
      )}

      {isAnulado && (
        <div className="m-6 mb-0 p-4 rounded-2xl border border-dashed bg-red-500/10 border-red-500/20 text-red-400 flex items-center gap-3">
          <ShieldAlert size={20} className="shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Comprobante Anulado</p>
            <p className="opacity-80">
              {formData.documentType === 'nota_venta'
                ? 'Este documento ha sido anulado de forma definitiva.'
                : 'Este documento ya no tiene validez tributaria ante el SRI.'}
            </p>
          </div>
        </div>
      )}

      {/* STEP CONTAINER BODY */}
      <div className="flex-1 p-6 max-w-[1400px] w-full mx-auto">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PASO 1: CABECERA & SELECCIÓN DE PRODUCTOS (MINI POS)   */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
            {/* Top Row: Client + Invoice Config */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column (col-span-3): Invoice Config & Location */}
              <div className="lg:col-span-3 space-y-5">
                {/* Client Search */}
                <div className={cardClass}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary-light text-primary'}`}>
                      <User size={14} />
                    </div>
                    <h4 className={sectionTitleClass}>Selección de Cliente</h4>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                    <div className="flex-1 w-full">
                      <label className={labelClass}>
                        <Search size={11} className="inline mr-1" />
                        Ingresa Cliente (Nombre o RUC / CI)
                      </label>
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
                            <option key={tp.id} value={tp.id}>
                              {tp.name} — RUC/CI: {tp.ruc}
                            </option>
                          ))
                        }
                      </select>
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
                        className={`px-4 py-2.5 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition-all shrink-0 ${
                          isDarkMode 
                            ? 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25' 
                            : 'bg-primary-light border-primary/25 text-primary hover:bg-primary/10'
                        }`}
                        title="Crear Contacto Rápido"
                      >
                        <Plus size={14} />
                        <span>Nuevo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Document configuration */}
                <div className={cardClass}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary-light text-primary'}`}>
                      <FileText size={14} />
                    </div>
                    <h4 className={sectionTitleClass}>Datos del Documento</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Tipo de Documento</label>
                      {sriConfig?.rucActivo === false && (
                        <p className="text-[10px] text-amber-600 font-semibold mb-1">
                          ⚠️ RUC inactivo. Factura electrónica bloqueada.
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
                          if (newDocType === 'factura') nextSec = String(sriConfig?.secuencialFactura || 1);
                          else if (newDocType === 'retencion') nextSec = String(sriConfig?.secuencialRetencion || 1);
                          else if (newDocType === 'nota_credito') nextSec = String(sriConfig?.secuencialNotaCredito || 1);
                          else if (newDocType === 'liquidacion') nextSec = String(sriConfig?.secuencialLiquidacion || 1);
                          else if (newDocType === 'nota_venta') nextSec = String(sriConfig?.secuencialNotaVenta || 1);
                          setFormData(prev => ({ ...prev, documentType: newDocType, secuencial: nextSec }));
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
                              Factura Electrónica {sriConfig?.rucActivo === false ? '(Bloqueado)' : ''}
                            </option>
                            <option value="nota_venta">Nota de Venta (Recibo)</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Fecha de Emisión</label>
                      <input 
                        disabled={true} 
                        type="date" 
                        value={formData.date} 
                        className={`${inputClass} cursor-not-allowed`} 
                      />
                    </div>
                  </div>

                  {/* Nota de crédito extra fields */}
                  {formData.documentType === 'nota_credito' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-dashed mt-4 pt-4 border-gray-200 dark:border-white/10">
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
                        <label className={labelClass}>Fecha Emisión Doc Modificado</label>
                        <input disabled={!isEditable} type="date" required value={formData.fechaEmisionDocSustento || ''} onChange={e => setFormData({...formData, fechaEmisionDocSustento: e.target.value})} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Motivo de Modificación</label>
                        <input disabled={!isEditable} type="text" required value={formData.motivo || ''} onChange={e => setFormData({...formData, motivo: e.target.value})} className={inputClass} placeholder="Ej. Devolución de mercadería" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Location and reference details */}
                <div className={cardClass}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary-light text-primary'}`}>
                      <Building size={14} />
                    </div>
                    <h4 className={sectionTitleClass}>Ubicación y Referencia</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Establecimiento</label>
                      <input disabled type="text" value={`${sriConfig?.establecimiento || '001'} - Sucursal`} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Referencia de Venta</label>
                      <input 
                        disabled={!isEditable} 
                        type="text" 
                        value={formData.referencia || ''} 
                        onChange={e => setFormData({...formData, referencia: e.target.value})} 
                        className={inputClass} 
                        placeholder="Ej. Pedido #1024" 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Descripción / Detalle</label>
                      <input 
                        disabled={!isEditable} 
                        type="text" 
                        value={formData.description || ''} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        className={inputClass} 
                        placeholder="Ej. Venta de suministros..." 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (col-span-2): Selected Client Information Card */}
              <div className="lg:col-span-2">
                <div className={`${cardClass} h-full`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                      <User size={14} />
                    </div>
                    <h4 className={sectionTitleClass}>Datos del Cliente (Receptor)</h4>
                  </div>

                  {matchedTercero ? (
                    <div className={`space-y-4 p-4 rounded-xl border ${
                      isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-primary-light border-primary/15 text-gray-900'
                    }`}>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-gray-500">Razón Social / Nombre</p>
                        <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{matchedTercero.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-gray-500">Identificación</p>
                          <p className={`text-xs font-mono font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{matchedTercero.ruc}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-gray-500">Teléfono</p>
                          <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{matchedTercero.telefono || '(No registrado)'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-gray-500">Correo Electrónico</p>
                        <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{matchedTercero.email || '(No registrado)'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-gray-500">Dirección</p>
                        <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{matchedTercero.direccion || '(No registrada)'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-dashed border-gray-300 dark:border-white/10 pt-3">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-gray-500">Régimen SRI</p>
                          <p className={`text-xs font-bold uppercase ${
                            matchedTercero.tipoContribuyente?.includes('rimpe') ? 'text-purple-600 dark:text-purple-400' : 'text-primary dark:text-primary'
                          }`}>
                            {matchedTercero.tipoContribuyente || 'General'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-gray-500">Deuda CxC Pendiente</p>
                          <p className={`text-xs font-extrabold ${clientDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            ${clientDebt.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-8 text-center rounded-xl border border-dashed text-xs font-semibold ${
                      isDarkMode ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' : 'border-amber-300 bg-amber-50/50 text-amber-700'
                    }`}>
                      ⚠️ Selecciona un cliente para cargar su información tributaria y habilitar la facturación.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN DEL MINI POS: BUSCADOR, CARRITO Y TOTALES */}
            {formData.documentType === 'retencion' ? (
              /* ======= RETENCIONES LAYOUT ======= */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 w-full">
                <div className="lg:col-span-2 space-y-4">
                  <div className={cardClass}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary-light text-primary'}`}>
                          <Layers size={14} />
                        </div>
                        <h3 className={sectionTitleClass}>Desglose de Retenciones</h3>
                      </div>
                      {isEditable && (
                        <button type="button" onClick={handleAddRetencion} className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary text-white font-bold text-xs flex items-center gap-1.5">
                          <Plus size={12} /> Añadir Fila
                        </button>
                      )}
                    </div>
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                      {(formData.retenciones || []).map((ret, index) => (
                        <div key={index} className={`p-4 rounded-xl border space-y-3 relative ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                          {isEditable && (
                            <button type="button" onClick={() => handleRemoveRetencion(index)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500">
                              <Trash2 size={13} />
                            </button>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                          <div className="grid grid-cols-3 gap-3">
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
                              <div className={`px-3 py-2.5 rounded-xl border text-center font-bold text-xs ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                                ${Number(ret.valorRetenido || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t pt-3 border-gray-200 dark:border-white/10">
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
                        <div className={`py-10 text-center text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          No hay filas de retención. Haz clic en "Añadir Fila" para comenzar.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className={`${cardClass} h-full flex flex-col justify-between`}>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                          <Calculator size={14} />
                        </div>
                        <h3 className={sectionTitleClass}>Consolidado Retenido</h3>
                      </div>
                      <div className={`p-4 rounded-xl border text-xs space-y-3 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                        <div className="flex justify-between">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total Bases:</span>
                          <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${Number(formData.baseImponible).toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                          <span>Total Retenido:</span>
                          <span className="text-sm font-bold">${Number(formData.total).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`mt-4 p-3 rounded-xl border border-dashed text-[10px] leading-relaxed ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-300 text-gray-500'}`}>
                      Este comprobante de retención será emitido de acuerdo a las bases imponibles y porcentajes desglosados.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ======= PRODUCTS + MINI POS LAYOUT ======= */
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2 w-full">
                {/* Carrito de compra (Lado Izquierdo, col-span-3) */}
                <div className="lg:col-span-3">
                  <div className={cardClass}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary-light text-primary'}`}>
                          <Layers size={14} />
                        </div>
                        <h3 className={sectionTitleClass}>Selección de Productos (Carrito)</h3>
                      </div>
                      {isEditable && (
                        <button type="button" onClick={handleAddItem} className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary text-white font-bold text-xs flex items-center gap-1.5 transition-all">
                          <Plus size={12} /> Fila Manual
                        </button>
                      )}
                    </div>

                    {/* Product Search */}
                    {isEditable && (
                      <div className="relative mb-4">
                        <div className="relative">
                          <input 
                            type="text" 
                            value={productSearchTerm}
                            onChange={e => setProductSearchTerm(e.target.value)}
                            className={`${inputClass} pl-9`}
                            placeholder="Buscar productos por nombre, SKU o código de barras..."
                          />
                          <Search className={`absolute left-3 top-3.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={14} />
                          {productSearchTerm && (
                            <button type="button" onClick={() => setProductSearchTerm('')} className="absolute right-3 top-3.5 text-gray-400 hover:text-red-500">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        {/* Search Results dropdown */}
                        {productSearchTerm.trim() !== '' && (
                          <div className={`absolute z-30 w-full rounded-xl border shadow-xl max-h-60 overflow-y-auto mt-1 ${
                            isDarkMode ? 'bg-[#1e1e22] border-white/10' : 'bg-white border-gray-200'
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
                                className={`w-full text-left px-4 py-3 text-xs flex justify-between items-center border-b last:border-0 transition-colors ${
                                  isDarkMode ? 'border-white/5 hover:bg-white/10 text-white' : 'border-gray-100 hover:bg-primary-light text-gray-900'
                                }`}
                              >
                                <div>
                                  <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.name}</p>
                                  <p className={`text-[10px] font-mono ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {p.sku ? `SKU: ${p.sku}` : ''} {p.codigoBarras ? ` | EAN: ${p.codigoBarras}` : ''}
                                  </p>
                                </div>
                                <span className="font-bold text-primary">${Number(p.price).toFixed(2)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Products Table */}
                    <div className="max-h-[45vh] overflow-y-auto overflow-x-auto">
                      {(formData.items || []).length > 0 ? (
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                            <tr className={`border-b text-[10px] font-bold uppercase ${
                              isDarkMode ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-500'
                            }`}>
                              <th className="py-2 px-3">Producto / Servicio</th>
                              <th className="py-2 px-3 text-center w-28">Cantidad</th>
                              <th className="py-2 px-3 text-right w-32">P. Unitario</th>
                              <th className="py-2 px-3 text-right w-28">Subtotal</th>
                              {isEditable && <th className="py-2 px-3 text-center w-12"></th>}
                            </tr>
                          </thead>
                          <tbody>
                            {(formData.items || []).map((item, index) => {
                              const subtotalLine = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                              return (
                                <tr 
                                  key={index} 
                                  className={`border-b text-xs transition-colors ${
                                    isDarkMode ? 'border-white/5 hover:bg-white/5 text-white' : 'border-gray-100 hover:bg-gray-50 text-gray-900'
                                  }`}
                                >
                                  <td className="py-2 px-3 font-semibold">
                                    {item.productId ? (
                                      <div>
                                        <div className={`font-bold text-xs truncate max-w-[200px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`} title={item.name}>
                                          {item.name}
                                        </div>
                                        <span className={`text-[9px] font-mono ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                          {item.sku ? `SKU: ${item.sku}` : ''} {item.codigoBarras ? `| EAN: ${item.codigoBarras}` : ''}
                                        </span>
                                      </div>
                                    ) : (
                                      <select 
                                        disabled={!isEditable}
                                        value={item.productId} 
                                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)} 
                                        className={`text-xs px-2 py-1 rounded-lg border ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                      >
                                        <option value="" disabled>Seleccionar...</option>
                                        {products.map(p => (
                                          <option key={p.id} value={p.id}>{p.name} — ${Number(p.price).toFixed(2)}</option>
                                        ))}
                                      </select>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <div className={`inline-flex items-center gap-0.5 border rounded-lg p-0.5 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                                      <button type="button" disabled={!isEditable} onClick={() => {
                                        const q = parseInt(item.quantity) || 1;
                                        if (q > 1) handleItemChange(index, 'quantity', q - 1);
                                      }} className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>-</button>
                                      <input disabled={!isEditable} type="number" value={item.quantity} min="1" onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} className={`w-10 text-center text-xs font-bold bg-transparent outline-none border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
                                      <button type="button" disabled={!isEditable} onClick={() => {
                                        handleItemChange(index, 'quantity', (parseInt(item.quantity) || 1) + 1);
                                      }} className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>+</button>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <div className="relative inline-block w-24">
                                      <span className={`absolute left-2 top-1.5 text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                                      <input disabled={!isEditable} type="number" step="0.01" required value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className={`w-full text-xs pl-5 pr-2 py-1 rounded-lg border outline-none text-right font-bold ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="0.00" />
                                    </div>
                                  </td>
                                  <td className={`py-2 px-3 text-right font-mono font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    ${subtotalLine.toFixed(2)}
                                  </td>
                                  {isEditable && (
                                    <td className="py-2 px-3 text-center">
                                      <button type="button" onClick={() => handleRemoveItem(index)} className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500">
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className={`py-16 text-center text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          No hay productos en el carrito. Utiliza el buscador de arriba.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumen de totales (Lado Derecho, col-span-2) */}
                <div className="lg:col-span-2">
                  <div className={`${cardClass} h-full flex flex-col justify-between`}>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                          <Calculator size={14} />
                        </div>
                        <h3 className={sectionTitleClass}>Totales e Impuestos</h3>
                      </div>
                      <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                        <div className="flex justify-between">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Subtotal:</span>
                          <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${Number(formData.baseImponible).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>IVA ({formData.ivaPorcentaje}%):</span>
                          <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${Number(formData.ivaValor).toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between pt-2 border-t font-bold text-sm ${isDarkMode ? 'border-white/10 text-white' : 'border-gray-300 text-gray-900'}`}>
                          <span>Total Neto:</span>
                          <span className="text-primary font-extrabold text-sm">${Number(formData.total).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`mt-6 p-3.5 rounded-xl border border-dashed text-[10px] leading-relaxed flex items-start gap-2 ${
                      isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-300 text-gray-500'
                    }`}>
                      <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                      <span>Verifica que el RUC del cliente y las cantidades ingresadas sean las correctas antes de continuar al pago.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PASO 2: FORMAS DE PAGO Y EMITIR LA FACTURA             */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom duration-300">
            {/* Lado izquierdo (col-span-3): Selección de medios de pago */}
            <div className="lg:col-span-3 space-y-5">
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary-light text-primary'}`}>
                    <CreditCard size={14} />
                  </div>
                  <h3 className={sectionTitleClass}>Medios de Pago</h3>
                </div>

                <label className={`${labelClass} mb-3 block`}>Selecciona los medios de pago del cliente</label>
                <div className="grid grid-cols-4 gap-2.5 mb-5">
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
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5 ${
                          isSelected 
                            ? 'bg-primary border-primary text-white shadow-md'
                            : isDarkMode 
                              ? 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                              : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-white text-primary' : isDarkMode ? 'bg-primary/20 text-primary' : 'bg-primary text-white'
                        }`}>
                          <m.icon size={14} />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wide">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input Fields for Active Payments */}
                <div className="space-y-4">
                  {activePayments.efectivo && (
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"><DollarSign size={12} /></div>
                          <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Efectivo</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Monto Recibido</span>
                      </div>
                      <div className="relative">
                        <span className={`absolute left-3 top-2.5 text-sm font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                        <input disabled={!isEditable} type="number" step="0.01" value={payments.efectivo || ''} onChange={e => setPayments(prev => ({ ...prev, efectivo: e.target.value }))} className={`${inputClass} pl-7 font-bold`} placeholder="0.00" />
                      </div>
                    </div>
                  )}

                  {activePayments.transferencia && (
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"><RefreshCw size={12} /></div>
                          <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Transferencia Bancaria</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Monto Transferido</span>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <span className={`absolute left-3 top-2.5 text-sm font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                          <input disabled={!isEditable} type="number" step="0.01" value={payments.transferencia || ''} onChange={e => setPayments(prev => ({ ...prev, transferencia: e.target.value }))} className={`${inputClass} pl-7 font-bold`} placeholder="0.00" />
                        </div>
                        <input disabled={!isEditable} type="text" value={payments.transferenciaRef || ''} onChange={e => setPayments(prev => ({ ...prev, transferenciaRef: e.target.value }))} className={inputClass} placeholder="Banco / Nro Referencia del Depósito" />
                      </div>
                    </div>
                  )}

                  {activePayments.tarjeta && (
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"><CreditCard size={12} /></div>
                          <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tarjeta de Débito / Crédito</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Monto Tarjeta</span>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <span className={`absolute left-3 top-2.5 text-sm font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                          <input disabled={!isEditable} type="number" step="0.01" value={payments.tarjeta || ''} onChange={e => setPayments(prev => ({ ...prev, tarjeta: e.target.value }))} className={`${inputClass} pl-7 font-bold`} placeholder="0.00" />
                        </div>
                        <input disabled={!isEditable} type="text" value={payments.tarjetaRef || ''} onChange={e => setPayments(prev => ({ ...prev, tarjetaRef: e.target.value }))} className={inputClass} placeholder="Nro Lote / Código Autorización" />
                      </div>
                    </div>
                  )}

                  {activePayments.cruce_cuentas && (
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"><User size={12} /></div>
                          <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Crédito / CxC</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Monto Crédito</span>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <span className={`absolute left-3 top-2.5 text-sm font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>$</span>
                          <input disabled={!isEditable} type="number" step="0.01" value={payments.cruce_cuentas || ''} onChange={e => setPayments(prev => ({ ...prev, cruce_cuentas: e.target.value }))} className={`${inputClass} pl-7 font-bold`} placeholder="0.00" />
                        </div>
                        <button type="button" onClick={() => setIsCreditModalOpen(true)} className={`w-full py-2 rounded-xl border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
                          Configurar Plazo y Observaciones de Crédito
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Change/Vuelto and Warning Indicators */}
                {(() => {
                  const totalNum = Number(formData.total) || 0;
                  const sum = (Number(payments.efectivo) || 0) + (Number(payments.transferencia) || 0) + (Number(payments.tarjeta) || 0) + (Number(payments.cruce_cuentas) || 0);
                  const cambio = Math.max(0, sum - totalNum);
                  return (
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className={`p-4 rounded-xl text-center border ${
                        sum >= totalNum - 0.01 
                          ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        <span className="text-[9px] font-bold uppercase block text-gray-500">Cambio / Vuelto al Cliente</span>
                        <span className="text-xl font-black">${cambio.toFixed(2)}</span>
                      </div>
                      <div className={`p-4 rounded-xl text-center border flex items-center justify-center text-xs font-semibold ${
                        isDarkMode ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-gray-500">Total Cubierto</p>
                          <p className="text-base font-extrabold">${sum.toFixed(2)} / ${totalNum.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const totalNum = Number(formData.total) || 0;
                  const sum = (Number(payments.efectivo) || 0) + (Number(payments.transferencia) || 0) + (Number(payments.tarjeta) || 0) + (Number(payments.cruce_cuentas) || 0);
                  if (sum === 0 && totalNum > 0) {
                    return (
                      <div className={`mt-3.5 p-3 rounded-xl text-[10px] font-bold flex items-center gap-2 border ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        <AlertTriangle size={14} className="shrink-0 text-red-500" />
                        <span>⚠️ Selecciona un medio de pago e ingresa el monto recibido para habilitar el registro.</span>
                      </div>
                    );
                  }
                  if (sum < totalNum - 0.01) {
                    return (
                      <div className={`mt-3.5 p-3 rounded-xl text-[10px] font-bold flex items-center gap-2 border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                        <span>Pago incompleto: Se ha cubierto ${sum.toFixed(2)} de un total neto de ${totalNum.toFixed(2)}.</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Lado derecho (col-span-2): Acciones de registro y emisión SRI */}
            <div className="lg:col-span-2 space-y-5">
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary-light text-primary'}`}>
                    <Calculator size={14} />
                  </div>
                  <h3 className={sectionTitleClass}>Resumen e Impuestos</h3>
                </div>

                <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Cliente:</span>
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{matchedTercero?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>RUC/CI:</span>
                    <span className={`font-mono font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{matchedTercero?.ruc || '—'}</span>
                  </div>
                  <div className="flex justify-between border-t dark:border-white/5 pt-2">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Subtotal:</span>
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${Number(formData.baseImponible).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>IVA ({formData.ivaPorcentaje}%):</span>
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${Number(formData.ivaValor).toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t font-black text-sm ${isDarkMode ? 'border-white/10 text-white' : 'border-gray-300 text-gray-900'}`}>
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-primary font-extrabold">${Number(formData.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Botones de acción final */}
                <div className="mt-5 space-y-3">
                  {isEditable ? (
                    <>
                      {/* Save Draft */}
                      <button 
                        type="button" 
                        onClick={handleSave} 
                        disabled={isUploading || isEmitting} 
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border ${
                          isDarkMode 
                            ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' 
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 shadow-sm'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        <span>Guardar Borrador</span>
                      </button>

                      {/* Emit SRI (factura electronica) */}
                      {formData.type === 'ingreso' && formData.documentType !== 'nota_venta' && (
                        <button 
                          type="button" 
                          onClick={handleEmitirSRI} 
                          disabled={isUploading || isEmitting} 
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black bg-primary text-white hover:bg-primary shadow-md transition-all uppercase tracking-wide hover:-translate-y-0.5"
                        >
                          <Sparkles size={14} />
                          <span>Emitir Factura Electrónica al SRI</span>
                        </button>
                      )}

                      {/* Register Nota de Venta / Recibo */}
                      {formData.type === 'ingreso' && formData.documentType === 'nota_venta' && (
                        <button 
                          type="button" 
                          onClick={() => handleSave({ isFinalizingNotaVenta: true })} 
                          disabled={isUploading || isEmitting} 
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 shadow-md transition-all uppercase tracking-wide hover:-translate-y-0.5"
                        >
                          <CheckCircle2 size={14} />
                          <span>Registrar Venta (Nota de Venta)</span>
                        </button>
                      )}

                      {/* Register Purchase / Gasto */}
                      {formData.type !== 'ingreso' && (
                        <button 
                          type="button" 
                          onClick={handleSave} 
                          disabled={isUploading || isEmitting} 
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 shadow-md transition-all uppercase tracking-wide hover:-translate-y-0.5"
                        >
                          <CheckCircle2 size={14} />
                          <span>Registrar Compra / Gasto</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className={`p-4 rounded-xl text-center text-xs border ${
                      isDarkMode ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    }`}>
                      ✓ Venta autorizada / registrada con éxito. Pasa al paso siguiente para imprimir.
                    </div>
                  )}
                </div>
              </div>

              {/* SRI Live Console */}
              {(isEmitting || sriLogs.length > 0) && (
                <div className="p-4 rounded-2xl bg-gray-950 border border-white/10 text-white font-mono text-[10px] space-y-2 max-h-[180px] overflow-y-auto">
                  <div className="flex items-center gap-1.5 border-b border-white/10 pb-1.5 text-gray-400">
                    <Terminal size={12} />
                    <span>Consola SRI (Ecuador)</span>
                  </div>
                  <div className="space-y-1">
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
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PASO 3: IMPRESIÓN DEL DOCUMENTO                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom duration-300">
            {/* Lado izquierdo (col-span-3): Estado de Emisión y Acciones de Impresión */}
            <div className="lg:col-span-3 space-y-5">
              {/* Banner Success */}
              <div className={`${cardClass} text-center space-y-4`}>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={36} />
                  </div>
                </div>
                <div>
                  <h3 className={`text-base font-black uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formData.documentType === 'nota_venta'
                      ? (formData.sriStatus === 'anulado' ? '¡Nota de Venta Anulada!' : '¡Venta Registrada Exitosamente!')
                      : formData.sriStatus === 'autorizado' 
                        ? '¡Comprobante Autorizado por el SRI!' 
                        : '¡Transacción Guardada con Éxito!'}
                  </h3>
                  <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    El documento ha sido guardado e ingresado en los registros financieros de forma satisfactoria.
                  </p>
                </div>

                {formData.claveAcceso && (
                  <div className={`p-4 rounded-xl border text-left font-mono text-[10px] break-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <span className={`font-bold uppercase text-[9px] block mb-1 text-emerald-600 dark:text-emerald-400`}>Clave de Acceso SRI:</span>
                    {formData.claveAcceso}
                  </div>
                )}
              </div>

              {/* Botones de Impresión */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                    <Download size={14} />
                  </div>
                  <h4 className={sectionTitleClass}>Opciones de Impresión / Descarga</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Print Ticket 80mm */}
                  <button 
                    type="button" 
                    onClick={() => {
                      setPrintFormat('ticket');
                      setPrintTx(formData);
                    }}
                    className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-xs font-black bg-primary text-white hover:bg-primary transition-all shadow-md hover:-translate-y-0.5"
                  >
                    <Calculator size={14} />
                    <span>Imprimir Ticket (80mm)</span>
                  </button>

                  {/* Print RIDE A4 */}
                  <button 
                    type="button" 
                    onClick={() => {
                      setPrintFormat('ride');
                      setPrintTx(formData);
                    }}
                    className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-xs font-black bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-md hover:-translate-y-0.5"
                  >
                    <FileText size={14} />
                    <span>Imprimir RIDE (A4)</span>
                  </button>

                  {/* Download XML */}
                  {formData.claveAcceso && (
                    <button 
                      type="button" 
                      onClick={downloadXMLFile}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all border sm:col-span-2 ${
                        isDarkMode 
                          ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' 
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 shadow-sm'
                      }`}
                    >
                      <Download size={14} />
                      <span>Descargar XML Autorizado</span>
                    </button>
                  )}
                </div>

                {/* SRI Anulación if authorized */}
                {isAuthorized && (
                  <div className="mt-5 border-t border-dashed dark:border-white/5 pt-4">
                    <button 
                      type="button" 
                      onClick={handleAnular}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border ${
                        isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      <ShieldAlert size={14} />
                      <span>{formData.documentType === 'nota_venta' ? 'Anular Nota de Venta' : 'Anular Documento ante el SRI'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lado derecho (col-span-2): Vista Previa del Documento */}
            <div className="lg:col-span-2">
              <div className={`${cardClass} space-y-4`}>
                <h4 className={sectionTitleClass}>Vista Previa del Comprobante</h4>

                <div className={`p-5 rounded-2xl border text-xs space-y-3.5 bg-white text-gray-900 border-gray-200 shadow-inner font-mono max-h-[60vh] overflow-y-auto`}>
                  <div className="text-center border-b pb-3 border-gray-300">
                    <p className="font-black text-sm uppercase">{sriConfig.nombreComercial || 'WEBFIX ERP'}</p>
                    <p className="text-[10px] font-bold">{sriConfig.razonSocial}</p>
                    <p className="text-[9px] text-gray-600 mt-1">{sriConfig.direccionMatriz}</p>
                    <p className="text-[9px] font-bold mt-1.5">RUC: {sriConfig.ruc}</p>
                  </div>

                  <div className="space-y-1.5 border-b pb-3 border-gray-300 text-[10px]">
                    <p className="font-bold uppercase text-center border bg-gray-100 py-0.5">
                      {formData.documentType === 'nota_venta' ? 'NOTA DE VENTA' : 'FACTURA ELECTRÓNICA'}
                    </p>
                    <p><b>Número:</b> {formData.documentNumber || `001-001-${String(formData.secuencial || 1).padStart(9, '0')}`}</p>
                    <p><b>Fecha:</b> {formData.date} {formData.time || ''}</p>
                    <p>
                      <b>{formData.documentType === 'nota_venta' ? 'Estado:' : 'Estado SRI:'}</b>{' '}
                      <span className={`${formData.sriStatus === 'anulado' ? 'text-red-700' : 'text-emerald-700'} font-bold uppercase`}>
                        {formData.documentType === 'nota_venta' 
                          ? (formData.sriStatus === 'anulado' ? 'ANULADO' : 'REGISTRADO') 
                          : formData.sriStatus}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-1.5 border-b pb-3 border-gray-300 text-[10px]">
                    <p><b>Cliente:</b> {matchedTercero?.name || 'CONSUMIDOR FINAL'}</p>
                    <p><b>RUC/CI:</b> {matchedTercero?.ruc || '9999999999999'}</p>
                    <p><b>Dirección:</b> {matchedTercero?.direccion || 'S/N'}</p>
                  </div>

                  {/* Detalle items */}
                  {formData.documentType !== 'retencion' && (
                    <div className="border-b pb-3 border-gray-300 text-[10px]">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="pb-1">Cant</th>
                            <th className="pb-1">Detalle</th>
                            <th className="pb-1 text-right">Unit</th>
                            <th className="pb-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(formData.items || []).map((item, idx) => (
                            <tr key={idx} className="text-[9px]">
                              <td className="py-1 align-top">{item.quantity}</td>
                              <td className="py-1 pr-2">{item.name}</td>
                              <td className="py-1 text-right align-top">${Number(item.price).toFixed(2)}</td>
                              <td className="py-1 text-right align-top">${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Totales */}
                  <div className="space-y-1 text-[10px] text-right">
                    <p>Subtotal: ${Number(formData.baseImponible).toFixed(2)}</p>
                    {formData.documentType !== 'retencion' && (
                      <p>IVA ({formData.ivaPorcentaje}%): ${Number(formData.ivaValor).toFixed(2)}</p>
                    )}
                    <p className="font-extrabold text-sm border-t border-gray-300 pt-1 text-gray-900">
                      TOTAL: ${Number(formData.total).toFixed(2)}
                    </p>
                  </div>

                  {/* Pagos desglosados */}
                  <div className="border-t border-dashed border-gray-300 pt-2 text-[9px] space-y-1">
                    <p className="font-bold uppercase text-[8px] text-gray-500">Forma de Pago:</p>
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
      <div className={`sticky bottom-0 z-20 px-6 py-3 border-t backdrop-blur-md flex justify-between items-center ${
        isDarkMode ? 'border-white/5 bg-[#151517]/95' : 'border-gray-200 bg-white/95'
      }`}>
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 1 || isLockedInStep3}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
            currentStep === 1 || isLockedInStep3
              ? 'opacity-0 pointer-events-none' 
              : isDarkMode 
                ? 'border-white/10 hover:bg-white/5 text-gray-300' 
                : 'border-gray-300 hover:bg-gray-100 text-gray-700'
          }`}
        >
          <ArrowLeft size={14} />
          <span>Atrás</span>
        </button>

        <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Paso {currentStep} de 3
        </span>

        {currentStep < 3 ? (
          <button
            type="button"
            disabled={currentStep === 2 && isEditable && !formData.documentNumber}
            onClick={handleNextStep}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              currentStep === 2 && isEditable && !formData.documentNumber
                ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border border-gray-300 dark:bg-white/5 dark:border-white/10 dark:text-gray-500'
                : 'bg-primary text-white hover:bg-primary hover:-translate-y-0.5'
            }`}
          >
            <span>Siguiente</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary transition-all shadow-md hover:-translate-y-0.5`}
          >
            <span>Terminar / Salir</span>
          </button>
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
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Cliente:</span>
                  <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{matchedTercero?.name || 'Cliente no seleccionado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Cupo de Crédito:</span>
                  <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${(Number(matchedTercero?.limiteCredito) || 1000).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Deuda Pendiente Actual:</span>
                  <span className="font-bold">${clientDebt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary border-t border-dashed dark:border-white/5 pt-2">
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
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-[#151517] border border-white/10 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
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

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#151517] border-white/10 text-white' 
              : 'bg-white border-gray-200 text-gray-900 shadow-xl'
          }`}>
            <div className="flex items-center gap-3.5 mb-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                confirmDialog.type === 'danger'
                  ? 'bg-red-500/10 text-red-500'
                  : confirmDialog.type === 'warning'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-primary/10 text-primary'
              }`}>
                {confirmDialog.type === 'danger' ? (
                  <ShieldAlert size={22} />
                ) : confirmDialog.type === 'warning' ? (
                  <AlertTriangle size={22} />
                ) : (
                  <FileText size={22} />
                )}
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  {confirmDialog.title}
                </h3>
                <p className={`text-[10px] mt-0.5 font-semibold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Acción de Seguridad Requerida
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-xs leading-relaxed mb-5 ${
              isDarkMode ? 'bg-black/10 border-white/5 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}>
              {confirmDialog.message}
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={confirmDialog.onCancel}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  isDarkMode 
                    ? 'border-white/10 hover:bg-white/5 text-gray-300' 
                    : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all ${
                  confirmDialog.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-500'
                    : confirmDialog.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-primary hover:bg-primary'
                }`}
              >
                Aceptar / Confirmar
              </button>
            </div>
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

    </div>,
    document.body
  );
}
