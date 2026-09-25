import FiscalDocuments from './FiscalDocuments';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiInput, UiButton, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, FileText, CheckCircle2, AlertCircle, Sparkles, AlertTriangle, Eye, Mail, Loader2, Truck, Clock, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { doc, deleteDoc, setDoc, getDoc, runTransaction } from '../../services/financeStore.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { analizarComprobanteConGemini, parsearXMLComprobante } from '../../services/geminiService';
import { getEcuadorDateString, getEcuadorDateTimeString, consultarAutorizacionSRI } from '../../services/sriService';
import { saveSriResult } from '../../services/sriEmission';
import { notifyAuthorizedInvoice } from '../../services/invoiceNotification';
import { sincronizarVenta } from '../../services/integracionFinanzasService';
import { registerTransactionInventory } from '../../services/inventoryLedger';
import { auth } from '../../firebase';
import RidePreviewModal from './RidePreviewModal';
import { Badge } from '../ui/badge';

export default function TransactionsView({ transactions, thirdParties, showToast, db, storage, appId, onOpenForm, forcedDocType, forcedType, isPreventaTab = false }) {
  const getTransactionParty = (tx) => thirdParties.find(tp => tp.id === tx.thirdPartyId) || tx.thirdParty || null;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(forcedType || 'all');
  const [filterDocType, setFilterDocType] = useState(forcedDocType || 'all'); // Filtro por Tipo de Comprobante SRI
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  useEffect(() => {
    if (forcedDocType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilterDocType(forcedDocType);
    }
      
  }, [forcedDocType]);

  useEffect(() => {
    if (forcedType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilterType(forcedType);
    }
      
  }, [forcedType]);
  
  // Estados de IA y Carga
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedRideTx, setSelectedRideTx] = useState(null);
  const [emailModalTx, setEmailModalTx] = useState(null);
  const [emailTarget, setEmailTarget] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} {...{"style":{"color":"var(--gray-11)"},"className":"inline ml-1 opacity-60"}} />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={11} {...{"style":{"color":"var(--blue-12)"},"className":"inline ml-1"}} />
      : <ArrowDown size={11} {...{"style":{"color":"var(--blue-12)"},"className":"inline ml-1"}} />;
  };

  const getDocumentTypeLabel = (docType, type) => {
    let label;
    if (docType === 'factura') label = 'Factura de Venta';
    else if (docType === 'nota_venta') label = 'Nota de Venta';
    else if (docType === 'nota_credito') label = 'Nota de Crédito';
    else if (docType === 'retencion') label = 'Retención';
    else if (docType === 'liquidacion') label = 'Liquidación';
    else label = 'Comprobante';

    const direction = type === 'ingreso' ? 'Ingreso' : 'Egreso';
    return `${label} - ${direction}`;
  };
  
  const handleToggleDelivery = async (txId, currentStatus) => {
    if (!db || !appId) return;
    try {
      const nextStatus = currentStatus === 'entregado' ? 'pendiente' : 'entregado';
      const txRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId);
      await setDoc(txRef, { deliveryStatus: nextStatus }, { merge: true });
      showToast(`Preventa marcada como ${nextStatus === 'entregado' ? 'despachada' : 'pendiente'}`, 'success');
    } catch (err) {
      console.error("Error al actualizar despacho", err);
      showToast("Error al actualizar estado de despacho", "error");
    }
  };
  
  const fileInputRef = useRef(null);

  const filtered = transactions.filter(tx => {
    // Filtrar preventas
    if (isPreventaTab) {
      if (!tx.isPreventa) return false;
    } else {
      if (forcedDocType === 'ventas_resumen' && tx.isPreventa) return false;
    }

    const matchesSearch = (tx.documentNumber || '').includes(searchTerm) || 
                          (getTransactionParty(tx)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    let matchesDocType;
    if (filterDocType === 'all') {
      matchesDocType = true;
    } else if (filterDocType === 'ventas_resumen') {
      matchesDocType = tx.type === 'ingreso' && (tx.documentType === 'factura' || tx.documentType === 'nota_venta');
    } else if (filterDocType === 'compras_resumen') {
      matchesDocType = tx.type === 'egreso' && (tx.documentType === 'factura' || tx.documentType === 'nota_venta' || tx.documentType === 'liquidacion');
    } else {
      matchesDocType = tx.documentType === filterDocType;
    }
    
    let matchesMonth = true;
    let matchesYear = true;
    if (tx.date) {
      const d = new Date(tx.date);
      if (filterMonth !== 'all') matchesMonth = d.getMonth().toString() === filterMonth;
      if (filterYear !== 'all') matchesYear = d.getFullYear().toString() === filterYear;
    }

    return matchesSearch && matchesType && matchesDocType && matchesMonth && matchesYear;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      const dateA = new Date(`${a.date || '1970-01-01'}T${a.time || '00:00:00'}`);
      const dateB = new Date(`${b.date || '1970-01-01'}T${b.time || '00:00:00'}`);
      comparison = dateA - dateB;
    } else if (sortField === 'documentNumber') {
      comparison = (a.documentNumber || '').localeCompare(b.documentNumber || '');
    } else if (sortField === 'total') {
      comparison = Number(a.total || 0) - Number(b.total || 0);
    } else if (sortField === 'thirdParty') {
      const nameA = getTransactionParty(a)?.name || '';
      const nameB = getTransactionParty(b)?.name || '';
      comparison = nameA.localeCompare(nameB);
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Procesar archivo (PDF, Imagen o XML) para captura inteligente
  const handleFileCapture = async (file) => {
    if (!file) return;
    setIsAnalyzing(true);
    showToast(`Analizando '${file.name}'...`, 'info');

    try {
      let extracted = null;

      // 1. Si es XML, parseo local
      if (file.name.endsWith('.xml')) {
        const text = await file.text();
        const res = parsearXMLComprobante(text);
        if (res.success) {
          extracted = res.data;
        } else {
          throw new Error(res.error);
        }
      } else {
        // 2. Si es imagen o PDF, usar Gemini OCR
        extracted = await analizarComprobanteConGemini(file);
      }

      if (!extracted) {
        throw new Error("No se pudieron extraer datos del comprobante.");
      }

      // 3. Identificar o Crear Tercero (Cliente/Proveedor)
      let thirdPartyId = '';
      if (extracted.ruc) {
        const matchedTp = thirdParties.find(tp => tp.ruc === matchedRucFormat(extracted.ruc));
        if (matchedTp) {
          thirdPartyId = matchedTp.id;
          showToast(`Proveedor encontrado: ${matchedTp.name}`, 'success');
        } else {
          // Auto-crear tercero si no existe
          const newTpId = `tp_${new Date().getTime()}`;
          const newTp = {
            name: extracted.razonSocial || 'Nuevo Proveedor Extraído',
            ruc: matchedRucFormat(extracted.ruc),
            email: extracted.email || '',
            phone: extracted.phone || '',
            type: 'proveedor',
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', newTpId), newTp);
          thirdPartyId = newTpId;
          showToast(`Contacto creado automáticamente: ${newTp.name}`, 'success');
        }
      }

      // 4. Detectar duplicados
      const isDuplicate = transactions.some(tx => 
        tx.thirdPartyId === thirdPartyId && 
        tx.documentNumber === extracted.documentNumber && 
        extracted.documentNumber !== ""
      );

      if (isDuplicate) {
        showToast("Advertencia: Este número de comprobante ya está registrado.", "error");
      }

      // 5. Subir archivo a Storage
      let downloadURL = '';
      let storagePath = '';
      try {
        const extension = file.name.split('.').pop();
        const path = `artifacts/${appId}/finances/${new Date().getTime()}_capture.${extension}`;
        const storageRef = ref(storage, path);
        const uploadTask = await uploadBytesResumable(storageRef, file);
        downloadURL = await getDownloadURL(uploadTask.ref);
        storagePath = path;
      } catch (storageErr) {
        console.error(storageErr);
      }

      // 6. Enviar datos al formulario central
      const newTxData = {
        id: '',
        type: 'egreso',
        date: extracted.date || getEcuadorDateString(),
        documentType: 'factura',
        documentNumber: extracted.documentNumber || '',
        thirdPartyId,
        category: extracted.category || 'otros',
        currency: 'USD',
        baseImponible: Number(extracted.baseImponible) || 0,
        ivaPorcentaje: extracted.ivaPorcentaje || 15,
        ivaValor: Number(extracted.ivaValor) || 0,
        retencionFuente: 0,
        retencionIva: 0,
        total: Number(extracted.total) || 0,
        paymentMethod: extracted.paymentMethod || 'transferencia',
        paymentStatus: 'pendiente',
        sriStatus: file.name.endsWith('.xml') ? 'autorizado' : 'pendiente',
        xmlUrl: file.name.endsWith('.xml') ? downloadURL : '',
        xmlPath: file.name.endsWith('.xml') ? storagePath : '',
        pdfUrl: file.name.endsWith('.pdf') ? downloadURL : '',
        pdfPath: file.name.endsWith('.pdf') ? storagePath : '',
        isAIDetected: true,
        isDuplicateWarning: isDuplicate
      };

      onOpenForm(newTxData);
      showToast("Datos leídos con éxito. Revisa el formulario.", "success");

    } catch (err) {
      console.error(err);
      showToast(err.message || "Error al procesar el archivo con IA", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const matchedRucFormat = (rucStr) => {
    return String(rucStr).trim();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileCapture(file);
    }
  };

  const handleDelete = async (tx) => {
    if (tx.inventarioRegistrado || tx.financialSyncStatus === 'complete') { showToast('Este documento tiene movimientos asociados. Usa la anulación para conservar la trazabilidad.', 'warning'); return; }
    if (tx.claveAcceso || tx.documentType === 'factura' || (tx.sriStatus === 'autorizado' && tx.documentType !== 'nota_venta')) {
      alert("No se puede eliminar un comprobante electrónico (Factura / Retención / Nota de Crédito). Para anular la validez de este documento, se recomienda generar una Nota de Crédito o realizar la anulación directamente desde su cuenta del SRI.");
      return;
    }
    if (await window.confirm('¿Seguro que deseas eliminar esta transacción permanentemente?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', tx.id));
        showToast('Transacción eliminada', 'success');
      } catch {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  const [verifyingTxId, setVerifyingTxId] = useState(null);

  const verifySriTransaction = async (tx) => {
    if (!tx?.claveAcceso) return;
    setVerifyingTxId(tx.id);
    try {
      showToast(`Consultando autorización de ${tx.documentNumber} en el SRI...`, 'info');
      const result = await consultarAutorizacionSRI(tx.claveAcceso, tx.sriAmbiente || tx.claveAcceso[23]);
      if (result.status === 'autorizado') {
        const fiscalApi = { doc, runTransaction };
        const saved = await saveSriResult({ db, appId, document: tx, result, api: fiscalApi });
        try {
          await registerTransactionInventory(db, appId, saved);
          if (saved.type === 'ingreso' && saved.documentType === 'factura') {
            await sincronizarVenta(saved, db, auth.currentUser || { uid: '', email: '' });
          }
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', saved.id), { financialSyncStatus: 'complete' }, { merge: true });
        } catch (syncErr) {
          console.warn('Sincronización contable/inventario:', syncErr);
        }
        const cliente = getTransactionParty(saved);
        try {
          await notifyAuthorizedInvoice({
            db, appId, document: saved, customer: cliente,
            api: { doc, getDoc, setDoc, runTransaction }
          });
          showToast(`¡Factura ${tx.documentNumber} AUTORIZADA por el SRI! Copia enviada al propietario y cliente.`, 'success');
        } catch (emailErr) {
          showToast(`¡Factura ${tx.documentNumber} AUTORIZADA! No se pudo enviar copia por correo: ${emailErr.message}`, 'warning');
        }
      } else if (result.status === 'no_autorizado' || result.status === 'devuelto') {
        await saveSriResult({ db, appId, document: tx, result, api: { doc, runTransaction } });
        showToast(`El SRI devolvió: ${result.message || result.status}`, 'error');
      } else {
        showToast(result.message || 'La factura sigue en procesamiento en el SRI. Vuelve a consultar en unos momentos.', 'warning');
      }
    } catch (err) {
      console.error('Error al verificar SRI:', err);
      showToast(`Error al consultar SRI: ${err.message}`, 'error');
    } finally {
      setVerifyingTxId(null);
    }
  };

  // Auto-verificar facturas pendientes de forma transparente al cargar la vista
  useEffect(() => {
    if (!transactions?.length) return;
    const pendingFacturas = transactions.filter(t => t.sriStatus === 'pendiente_sri' && t.claveAcceso && t.documentType === 'factura');
    if (pendingFacturas.length > 0) {
      const target = pendingFacturas[0];
      const timer = setTimeout(() => {
        verifySriTransaction(target);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [transactions]);

  const getStatusBadge = (status, documentType, tx = null) => {
    switch(status) {
      case 'autorizado':
        if (documentType === 'nota_venta') {
          return <Badge variant="success"><CheckCircle2 size={10}/> Registrado</Badge>;
        }
        return <Badge variant="success"><CheckCircle2 size={10}/> Autorizado</Badge>;
      case 'pendiente_sri':
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); verifySriTransaction(tx); }}
            disabled={verifyingTxId === tx?.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-colors cursor-pointer"
            title="Haga clic para consultar la autorización en el SRI ahora"
          >
            <RefreshCw size={10} className={verifyingTxId === tx?.id ? "animate-spin" : ""} />
            <span>{verifyingTxId === tx?.id ? "Consultando..." : "Por confirmar en SRI"}</span>
          </button>
        );
      case 'devuelto':
      case 'no_autorizado':
        return <Badge variant="destructive"><AlertTriangle size={10}/> {status === 'devuelto' ? 'Devuelto' : 'No autorizado'}</Badge>;
      case 'pendiente':
        return <Badge variant="warning"><AlertCircle size={10}/> Pendiente</Badge>;
      case 'anulado':
        return <Badge variant="destructive">Anulado</Badge>;
      case 'rechazado':
        return <Badge variant="destructive"><AlertTriangle size={10}/> Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status || 'Borrador'}</Badge>;
    }
  };

  const handleOpenEmailModal = (tx) => {
    const cliente = getTransactionParty(tx);
    let initialEmail = cliente?.email || '';
    if (initialEmail.includes('consumidorfinal')) {
      initialEmail = '';
    }
    setEmailModalTx(tx);
    setEmailTarget(initialEmail);
  };

  const handleSendEmail = async () => {
    if (emailTarget.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTarget.trim())) {
      showToast('Revisa el correo del cliente.', 'warning');
      return;
    }
    setIsSendingEmail(true);
    try {
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
      const configSnap = await getDoc(configRef);
      if (!configSnap.exists()) {
        showToast('Configuración del emisor no encontrada.', 'error');
        setIsSendingEmail(false);
        return;
      }

      const configData = configSnap.data();
      if (!configData.smtpHost || !configData.smtpUser || !configData.smtpPass) {
        showToast('Configuración SMTP incompleta en Ajustes.', 'warning');
        setIsSendingEmail(false);
        return;
      }

      const emitterEmail = [configData.correoContacto, configData.email, configData.smtpUser]
        .map(value => String(value || '').trim()).find(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) || '';
      if (!emailTarget.trim() && !emitterEmail.trim()) {
        showToast('Configura el correo del emisor o ingresa el del cliente.', 'warning');
        return;
      }

      const cliente = getTransactionParty(emailModalTx);

      const effectivePdf = (emailModalTx.pdfUrl && !emailModalTx.pdfUrl.includes('srienlinea.sri.gob.ec'))
        ? emailModalTx.pdfUrl
        : (emailModalTx.claveAcceso ? `/#/public/ride?txId=${emailModalTx.id}&claveAcceso=${emailModalTx.claveAcceso}&tenantId=${appId || ''}` : '');

      const emailPayload = {
        smtpHost: configData.smtpHost,
        smtpPort: configData.smtpPort || (configData.smtpSecure ? 465 : 587),
        smtpUser: configData.smtpUser,
        smtpPass: configData.smtpPass,
        smtpSecure: configData.smtpSecure,
        to: emailTarget.trim(),
        emitterEmail,
        clientName: cliente?.name || cliente?.razonSocial || 'Cliente',
        clientIdentification: cliente?.ruc || cliente?.identificacion || '',
        documentNumber: emailModalTx.documentNumber,
        total: emailModalTx.total,
        pdfUrl: effectivePdf,
        xmlUrl: emailModalTx.xmlUrl || '',
        xmlContent: emailModalTx.xmlAutorizado || emailModalTx.xml || '',
        companyName: configData.nombreComercial || configData.razonSocial || 'Facturación Electrónica',
        logoUrl: configData.logoUrl || '',
        companyRuc: configData.ruc || '',
        companyAddress: configData.direccionMatriz || '',
        companyPhone: configData.telefono || configData.telefonoContacto || '',
        claveAcceso: emailModalTx.claveAcceso || '',
        fechaAutorizacion: emailModalTx.fechaAutorizacion || emailModalTx.date || getEcuadorDateTimeString(),
        documentType: emailModalTx.documentType || 'factura',
        date: emailModalTx.date || ''
      };

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = { error: `Servidor de correo no devolvió JSON válido (${res.status} ${res.statusText})` };
      }

      let recordingError = false;
      if (data?.deliveries && emailModalTx.id) {
        try {
          const txRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', emailModalTx.id);
          const fresh = await getDoc(txRef);
          const delivery = { ...(fresh.data()?.emailDelivery || {}), claimedAt: '', lastAttemptAt: new Date().toISOString() };
          for (const role of ['client', 'emitter']) {
            if (data.deliveries[role]) delivery[role] = { ...data.deliveries[role], sentAt: data.deliveries[role].status === 'sent' ? new Date().toISOString() : '' };
          }
          await setDoc(txRef, { emailDelivery: delivery }, { merge: true });
        } catch (error) {
          recordingError = true;
          console.warn('El SMTP aceptó el correo, pero no se pudo guardar el resultado:', error);
        }
      }
      if (res.ok && data?.success) {
        showToast(recordingError ? 'Correo enviado; no se pudo guardar su estado en Ventas.' : emailTarget.trim() ? 'Comprobante enviado al cliente y copia al emisor.' : 'Copia enviada al emisor.', recordingError ? 'warning' : 'success');
        setEmailModalTx(null);
      } else {
        const clientSent = data?.deliveries?.client?.status === 'sent';
        const issuerSent = data?.deliveries?.emitter?.status === 'sent';
        showToast(clientSent && !issuerSent ? 'Cliente notificado; copia del emisor pendiente.' : issuerSent ? 'Emisor notificado; envío al cliente pendiente.' : data?.error || 'No se pudo enviar el correo.', 'warning');
      }
    } catch (err) {
      console.error("Error al conectar con la API de envío de correos:", err);
      showToast(`Error al conectar con la API de correos: ${err.message || 'Sin respuesta'}`, "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const docTypeTabs = [
    { id: 'all', label: 'Todos' },
    { id: 'factura', label: 'Facturas' },
    { id: 'retencion', label: 'Retenciones' },
    { id: 'nota_credito', label: 'N. Crédito' },
    { id: 'nota_debito', label: 'N. Débito' },
    { id: 'guia_remision', label: 'Guías' },
    { id: 'liquidacion', label: 'Liquidaciones' }
  ];

  const getHeaderTitle = () => {
    if (isPreventaTab) return 'Historial de Preventas';
    if (forcedDocType === 'ventas_resumen') return 'Historial de Ventas';
    if (forcedDocType === 'compras_resumen') return 'Historial de Compras';
    if (forcedDocType === 'nota_credito') return forcedType === 'egreso' ? 'Notas de Crédito Compras' : 'Notas de Crédito';
    if (forcedDocType === 'nota_debito') return forcedType === 'egreso' ? 'Notas de Débito Compras' : 'Notas de Débito';
    if (forcedDocType === 'retencion') return forcedType === 'egreso' ? 'Retenciones Compras' : 'Retenciones';
    if (forcedDocType === 'liquidacion') return 'Liquidaciones de Compra';
    return forcedType === 'egreso' ? 'Historial de Compras' : (forcedType === 'ingreso' ? 'Historial de Ventas' : 'Comprobantes');
  };

  const getRegisterLabel = () => {
    if (isPreventaTab) return 'Preventa';
    if (forcedDocType === 'ventas_resumen') return 'Venta';
    if (forcedDocType === 'compras_resumen') return 'Compra';
    if (forcedDocType) {
      const match = docTypeTabs.find(t => t.id === forcedDocType);
      return match ? match.label : forcedDocType;
    }
    return 'Comprobante';
  };

  const handleOpenRegister = () => {
    if (isPreventaTab) {
      onOpenForm({
        id: '',
        type: 'ingreso',
        documentType: 'factura',
        date: getEcuadorDateString(),
        currency: 'USD',
        baseImponible: 0,
        ivaPorcentaje: 15,
        ivaValor: 0,
        retencionFuente: 0,
        retencionIva: 0,
        total: 0,
        paymentMethod: 'transferencia',
        paymentStatus: 'pendiente',
        sriStatus: 'pendiente',
        isPreventa: true,
        deliveryStatus: 'pendiente',
        items: []
      });
    } else if (forcedDocType) {
      const defaultDocType = (forcedDocType === 'ventas_resumen' || forcedDocType === 'compras_resumen') ? 'factura' : forcedDocType;
      const defaultType = forcedType || (forcedDocType === 'liquidacion' || forcedDocType === 'retencion' ? 'egreso' : 'ingreso');
      onOpenForm({
        id: '',
        type: defaultType,
        documentType: defaultDocType,
        date: getEcuadorDateString(),
        currency: 'USD',
        baseImponible: 0,
        ivaPorcentaje: 15,
        ivaValor: 0,
        retencionFuente: 0,
        retencionIva: 0,
        total: 0,
        paymentMethod: 'transferencia',
        paymentStatus: 'pendiente',
        sriStatus: 'pendiente',
        items: []
      });
    } else {
      onOpenForm(null);
    }
  };

  return (
    <UiBox className="animate-in fade-in duration-300 space-y-4 pb-8">
      {/* Encabezado sin slash con contador */}
      <div className="flex items-center gap-2.5 pb-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {getHeaderTitle()}
        </h1>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
          {sortedFiltered.length}
        </span>
      </div>

      {/* DRAG AND DROP ZONE */}
      {(!forcedType || forcedType !== 'ingreso') && (
        <UiBox 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative p-5 flex flex-col items-center justify-center cursor-pointer overflow-hidden border border-dashed rounded-2xl transition-all ${
            isDragging 
              ? 'border-indigo-400 bg-indigo-50/50 scale-[1.01]' 
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <UiInput
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFileCapture(e.target.files[0])} 
            accept=".pdf,.png,.jpg,.jpeg,.xml" 
            className="hidden" 
          />
          
          {isAnalyzing ? (
            <UiBox className="flex flex-col items-center justify-center py-3 space-y-2">
              <div className="animate-spin h-7 w-7 border-2 border-indigo-600 border-t-transparent rounded-full" />
              <p className="text-xs font-bold text-indigo-600 animate-pulse">Gemini IA está extrayendo información del comprobante...</p>
            </UiBox>
          ) : (
            <UiBox className="flex flex-col items-center justify-center text-center space-y-1.5 py-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Sparkles size={20} />
              </div>
              <p className="text-xs font-bold text-slate-800">Cargar comprobante (PDF, XML, Imagen)</p>
              <p className="text-[11px] text-slate-500">Arrastra tu archivo aquí o haz clic para seleccionarlo</p>
            </UiBox>
          )}
        </UiBox>
      )}

      {/* TABS DE TIPO DE DOCUMENTO SRI */}
      {!forcedDocType && !isPreventaTab && (
        <div className="inline-flex h-9 items-center justify-start p-1 gap-1 overflow-x-auto custom-scrollbar whitespace-nowrap bg-slate-100 rounded-xl border border-slate-200/80">
          {docTypeTabs.map(tab => {
            const isActive = filterDocType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterDocType(tab.id)}
                className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer select-none ${
                  isActive ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* FILA DE ACCIONES A LA IZQ Y FILTROS A LA DERECHA (MISMA FILA) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200/90 rounded-2xl">
        {/* IZQUIERDA: Botón de acciones */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenRegister}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1b1b1b] hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-none"
          >
            <Plus size={14} /> 
            <span>Registrar {getRegisterLabel()}</span>
          </button>
        </div>

        {/* DERECHA: Búsqueda y Filtros en la misma fila */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end flex-1">
          <div className="w-full sm:w-60">
            <UiInput
              type="text" 
              placeholder="Buscar documento o tercero..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              iconPrefix={<Search size={14} className="text-slate-400" />}
              size="2"
            />
          </div>

          {!forcedType && (
            <UiSelect
              value={filterType} 
              onChange={e => setFilterType(e.target.value)} 
              size="2"
              color="gray"
              className="cursor-pointer"
            >
              <option value="all">Todos los tipos</option>
              <option value="ingreso">Ingresos (Ventas)</option>
              <option value="egreso">Egresos (Compras)</option>
            </UiSelect>
          )}

          <UiSelect
            value={filterMonth} 
            onChange={e => setFilterMonth(e.target.value)} 
            size="2"
            color="gray"
            className="cursor-pointer"
          >
            <option value="all">Mes: Todos</option>
            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </UiSelect>

          <UiSelect
            value={filterYear} 
            onChange={e => setFilterYear(e.target.value)} 
            size="2"
            color="gray"
            className="cursor-pointer"
          >
            <option value="all">Año: Todos</option>
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </UiSelect>
        </div>
      </div>

      {/* TABLA DE COMPROBANTES */}
      <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden">
        <UiBox className="overflow-x-auto custom-scrollbar">
          <UiTable className="w-full text-left whitespace-nowrap">
            <UiTableHeader className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px] select-none">
              <UiTableRow>
                <UiTableHead className="px-6 py-3.5 cursor-pointer font-semibold" onClick={() => handleSort('date')}>
                  <UiBox className="flex items-center gap-0.5">
                    Fecha {renderSortIcon('date')}
                  </UiBox>
                </UiTableHead>
                <UiTableHead className="px-6 py-3.5 cursor-pointer font-semibold" onClick={() => handleSort('documentNumber')}>
                  <UiBox className="flex items-center gap-0.5">
                    Documento {renderSortIcon('documentNumber')}
                  </UiBox>
                </UiTableHead>
                <UiTableHead className="px-6 py-3.5 cursor-pointer font-semibold" onClick={() => handleSort('thirdParty')}>
                  <UiBox className="flex items-center gap-0.5">
                    Tercero {renderSortIcon('thirdParty')}
                  </UiBox>
                </UiTableHead>
                <UiTableHead className="px-6 py-3.5 cursor-pointer font-semibold" onClick={() => handleSort('total')}>
                  <UiBox className="flex items-center gap-0.5">
                    Total {renderSortIcon('total')}
                  </UiBox>
                </UiTableHead>
                <UiTableHead className="px-6 py-3.5 font-semibold">Estado SRI</UiTableHead>
                {isPreventaTab && <UiTableHead className="px-6 py-3.5 font-semibold">Despacho</UiTableHead>}
                <UiTableHead className="px-6 py-3.5 font-semibold hidden sm:table-cell">Archivos</UiTableHead>
                <UiTableHead className="px-6 py-3.5 font-semibold text-right">Acciones</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              {sortedFiltered.map(tx => (
                <UiTableRow key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                  <UiTableCell className="px-6 py-2.5">
                    <div className="leading-none text-xs font-medium text-slate-900">{tx.date}</div>
                    {tx.time && (
                      <div className="text-[11px] text-slate-400 leading-none mt-1">
                        {tx.time.substring(0, 5)}
                      </div>
                    )}
                  </UiTableCell>
                  <UiTableCell className="px-6 py-2.5">
                    <div className="leading-none mb-1 text-xs font-semibold text-slate-800">
                      {getDocumentTypeLabel(tx.documentType, tx.type)}
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      {tx.documentNumber || (tx.sriStatus === 'borrador' ? 'Borrador' : '-')}
                    </div>
                  </UiTableCell>
                  <UiTableCell className="px-6 py-2.5 truncate max-w-[200px] text-xs font-medium text-slate-900" title={getTransactionParty(tx)?.name}>
                    {getTransactionParty(tx)?.name || 'Desconocido'}
                  </UiTableCell>
                  <UiTableCell className="px-6 py-2.5 font-semibold font-mono text-xs text-slate-900">
                    ${Number(tx.total || 0).toFixed(2)}
                  </UiTableCell>
                  <UiTableCell className="px-6 py-2.5">{getStatusBadge(tx.sriStatus, tx.documentType, tx)}</UiTableCell>
                  {isPreventaTab && (
                    <UiTableCell className="px-6 py-3.5">
                      {tx.deliveryStatus === 'entregado' ? (
                        <Badge 
                          variant="soft" 
                          color="green" 
                          size="1" 
                          className="cursor-pointer hover:opacity-80 inline-flex items-center gap-1"
                          onClick={() => handleToggleDelivery(tx.id, tx.deliveryStatus)}
                        >
                          <Truck size={11} /> Entregado
                        </Badge>
                      ) : (
                        <UiButton iconOnly
                          type="button"
                          onClick={() => handleToggleDelivery(tx.id, tx.deliveryStatus)}
                          variant="soft"
                          color="amber"
                          size="1"
                          title="Marcar como Entregado / Despachado"
                        >
                          <Clock size={13} />
                        </UiButton>
                      )}
                    </UiTableCell>
                  )}
                  <UiTableCell className="px-6 py-3.5 hidden sm:table-cell">
                    <UiBox className="flex items-center gap-1.5">
                      {tx.claveAcceso && tx.sriStatus === 'pendiente_sri' && (
                        <UiButton
                          size="1"
                          variant="soft"
                          color="amber"
                          onClick={() => verifySriTransaction(tx)}
                          disabled={verifyingTxId === tx.id}
                          title="Consultar estado de autorización en el SRI ahora"
                        >
                          <RefreshCw size={11} className={verifyingTxId === tx.id ? "animate-spin" : ""} />
                          {verifyingTxId === tx.id ? "Consultando..." : "Consultar SRI"}
                        </UiButton>
                      )}
                      {tx.claveAcceso ? <FiscalDocuments transaction={tx} tenantId={appId} onPreview={() => setSelectedRideTx(tx)} /> : <>
                      {tx.xmlUrl ? (
                        <UiButton
                          iconOnly
                          asChild
                          variant="soft"
                          color="blue"
                          size="1"
                          title="Ver XML"
                        >
                          <a href={tx.xmlUrl} target="_blank" rel="noreferrer">
                            <FileText size={13}/>
                          </a>
                        </UiButton>
                      ) : (
                        <UiButton
                          iconOnly
                          variant="ghost"
                          color="gray"
                          size="1"
                          disabled
                          title="XML no disponible"
                        >
                          <FileText size={13} className="opacity-40"/>
                        </UiButton>
                      )}
                      
                      {(() => {
                        const effectivePdf = (tx.pdfUrl && !tx.pdfUrl.includes('srienlinea.sri.gob.ec'))
                          ? tx.pdfUrl
                          : (tx.claveAcceso ? `/#/public/ride?txId=${tx.id}&claveAcceso=${tx.claveAcceso}&tenantId=${appId || ''}` : null);

                        return effectivePdf ? (
                          <UiButton
                            iconOnly
                            asChild
                            variant="soft"
                            color="red"
                            size="1"
                            title="Ver PDF / RIDE"
                          >
                            <a href={effectivePdf} target="_blank" rel="noreferrer">
                              <FileText size={13}/>
                            </a>
                          </UiButton>
                        ) : (
                          <UiButton
                            iconOnly
                            variant="ghost"
                            color="gray"
                            size="1"
                            disabled
                            title="PDF no disponible"
                          >
                            <FileText size={13} className="opacity-40"/>
                          </UiButton>
                        );
                      })()}

                      {tx.documentType && (
                        <UiButton
                          iconOnly
                          type="button"
                          onClick={() => setSelectedRideTx(tx)}
                          variant="soft"
                          color="amber"
                          size="1"
                          title={tx.documentType === 'nota_venta' ? "Ver Recibo / Imprimir" : "Ver RIDE Interactivo / Imprimir Factura"}
                        >
                          <Eye size={13}/>
                        </UiButton>
                      )}
                      
                      </>}
                      {(tx.sriStatus === 'autorizado' || tx.xmlUrl || tx.pdfUrl) && tx.documentType !== 'nota_venta' && (
                        <UiButton
                          iconOnly
                          type="button"
                          onClick={() => handleOpenEmailModal(tx)}
                          variant="soft"
                          color="indigo"
                          size="1"
                          title={tx.emailDelivery?.emitter?.status === 'sent'
                            ? 'Copia enviada al emisor. Reenviar comprobante'
                            : tx.emailDelivery?.emitter?.status === 'failed'
                              ? 'Copia del emisor pendiente. Reintentar envío'
                              : 'Enviar comprobante y copia al emisor'}
                        >
                          <Mail size={13}/>
                        </UiButton>
                      )}
                    </UiBox>
                  </UiTableCell>
                  <UiTableCell className="px-6 py-3.5 text-right">
                    <UiBox className="flex items-center justify-end gap-1.5">
                       <UiButton
                         iconOnly
                         type="button"
                         onClick={() => onOpenForm(tx)}
                         variant="soft"
                         color="gray"
                         size="1"
                         title="Editar"
                       >
                         <Edit2 size={13}/>
                       </UiButton>
                       <UiButton
                         iconOnly
                         type="button" 
                         onClick={() => handleDelete(tx)} 
                         variant="soft"
                         color={tx.documentType === 'factura' || (tx.sriStatus === 'autorizado' && tx.documentType !== 'nota_venta') ? "gray" : "red"}
                         size="1"
                         disabled={tx.documentType === 'factura' || (tx.sriStatus === 'autorizado' && tx.documentType !== 'nota_venta')}
                         title={(tx.documentType === 'factura' || (tx.sriStatus === 'autorizado' && tx.documentType !== 'nota_venta')) ? "Comprobantes electrónicos no pueden ser eliminados" : "Eliminar"}
                       >
                         <Trash2 size={13}/>
                       </UiButton>
                    </UiBox>
                  </UiTableCell>
                </UiTableRow>
              ))}
              {sortedFiltered.length === 0 && (
                <UiTableRow>
                  <UiTableCell colSpan={isPreventaTab ? 8 : 7} className="px-6 py-12 text-center text-slate-400 italic text-xs">
                    No se encontraron comprobantes registrados.
                  </UiTableCell>
                </UiTableRow>
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      </div>

      {selectedRideTx && (
        <RidePreviewModal 
          tx={selectedRideTx} 
          onClose={() => setSelectedRideTx(null)} 
          thirdParties={thirdParties} 
          db={db} 
          appId={appId} 
        />
      )}

      {emailModalTx && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-50 flex items-center justify-center p-4"}}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full max-w-md p-6 space-y-4 scale-100"}}>
            {/* Header */}
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-3 pb-2"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-2"}}>
                <Mail size={18} />
              </UiBox>
              <UiBox>
                <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Reenviar Comprobante</UiHeading>
                <UiText as="p" {...{"size":"1","color":"gray","weight":"medium","className":"leading-none mt-1"}}>
                  Documento N°: {emailModalTx.documentNumber || '-'}
                </UiText>
              </UiBox>
            </UiBox>

            {/* Content / Form */}
            <UiBox {...{"className":"space-y-4 py-2"}}>
              <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                Ingresa el correo del cliente. Si lo dejas vacío, se enviará solo la copia al emisor.
              </UiText>
              <UiText as="p" size="1" color="gray">
                {emailModalTx.emailDelivery
                  ? `Último envío — cliente: ${emailModalTx.emailDelivery.client?.status === 'sent' ? 'aceptado' : emailModalTx.emailDelivery.client?.status === 'skipped' ? 'sin correo' : 'pendiente'}; emisor: ${emailModalTx.emailDelivery.emitter?.status === 'sent' ? 'aceptado' : 'pendiente'}.`
                  : 'Sin registro de envío para este comprobante.'}
              </UiText>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>
                  Correo Electrónico de Destino
                </UiLabel>
                <UiInput
                  type="email" 
                  value={emailTarget} 
                  onChange={e => setEmailTarget(e.target.value)} 
                  placeholder="ejemplo@cliente.com"
                  {...{"size":"2","color":"gray","className":"w-full"}}
                  disabled={isSendingEmail}
                />
              </UiBox>
            </UiBox>

            {/* Actions */}
            <UiBox {...{"className":"flex items-center justify-end gap-2 pt-2"}}>
              <UiButton
                type="button" 
                onClick={() => setEmailModalTx(null)}
                disabled={isSendingEmail}
                {...{"size":"2","variant":"outline","color":"gray"}}
              >
                Cancelar
              </UiButton>
              
              <UiButton
                type="button" 
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"}}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 size={12} {...{"className":"animate-spin"}} />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar
                  </>
                )}
              </UiButton>
            </UiBox>
          </UiCard>
        </UiBox>
      )}
    </UiBox>
  );
}
