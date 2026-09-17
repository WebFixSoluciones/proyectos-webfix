import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiInput, UiButton, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, FileText, CheckCircle2, AlertCircle, Sparkles, AlertTriangle, Eye, Mail, Loader2, Truck, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { doc, deleteDoc, setDoc, getDoc } from '../../services/financeStore.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { analizarComprobanteConGemini, parsearXMLComprobante } from '../../services/geminiService';
import { getEcuadorDateString, getEcuadorDateTimeString } from '../../services/sriService';
import RidePreviewModal from './RidePreviewModal';
import { Badge } from '../ui/badge';

export default function TransactionsView({ transactions, thirdParties, showToast, db, storage, appId, onOpenForm, forcedDocType, forcedType, isPreventaTab = false }) {
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
                          (thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
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
      const nameA = thirdParties.find(tp => tp.id === a.thirdPartyId)?.name || '';
      const nameB = thirdParties.find(tp => tp.id === b.thirdPartyId)?.name || '';
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
    if (tx.documentType === 'factura' || (tx.sriStatus === 'autorizado' && tx.documentType !== 'nota_venta')) {
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

  const getStatusBadge = (status, documentType) => {
    switch(status) {
      case 'autorizado':
        if (documentType === 'nota_venta') {
          return <Badge variant="success"><CheckCircle2 size={10}/> Registrado</Badge>;
        }
        return <Badge variant="success"><CheckCircle2 size={10}/> Autorizado</Badge>;
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
    const cliente = thirdParties.find(tp => tp.id === tx.thirdPartyId);
    let initialEmail = cliente?.email || '';
    if (initialEmail.includes('consumidorfinal')) {
      initialEmail = '';
    }
    setEmailModalTx(tx);
    setEmailTarget(initialEmail);
  };

  const handleSendEmail = async () => {
    if (!emailTarget || emailTarget.trim() === '') {
      showToast('Por favor ingrese un correo electrónico válido.', 'warning');
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

      const cliente = thirdParties.find(tp => tp.id === emailModalTx.thirdPartyId);

      const effectivePdf = (emailModalTx.pdfUrl && !emailModalTx.pdfUrl.includes('srienlinea.sri.gob.ec'))
        ? emailModalTx.pdfUrl
        : (emailModalTx.claveAcceso ? `/public/ride?claveAcceso=${emailModalTx.claveAcceso}&tenantId=${appId || ''}` : '');

      const emailPayload = {
        smtpHost: configData.smtpHost,
        smtpPort: configData.smtpPort,
        smtpUser: configData.smtpUser,
        smtpPass: configData.smtpPass,
        smtpSecure: configData.smtpSecure,
        to: emailTarget,
        emitterEmail: configData.correoContacto || configData.email || configData.smtpUser || '',
        clientName: cliente?.name || 'Cliente',
        clientIdentification: cliente?.ruc || cliente?.identificacion || '',
        documentNumber: emailModalTx.documentNumber,
        total: emailModalTx.total,
        pdfUrl: effectivePdf,
        xmlUrl: emailModalTx.xmlUrl || '',
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

      const data = await res.json();
      if (res.ok) {
        showToast(`Comprobante enviado a ${emailTarget}`, 'success');
        setEmailModalTx(null);
      } else {
        console.error("Fallo al enviar correo:", data.error);
        showToast(`No se pudo enviar el correo: ${data.error}`, 'error');
      }
    } catch (err) {
      console.error("Error al conectar con la API de envío de correos:", err);
      showToast("Error al conectar con la API de correos.", "error");
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

  return (
    <UiBox {...{"className":"animate-in slide-in-from-bottom-4 duration-500 space-y-6"}}>
      
      {/* DRAG AND DROP ZONE */}
      {(!forcedType || forcedType !== 'ingreso') && (
        <UiBox 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          {...mergeThemeProps({"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"relative p-6 flex flex-col items-center justify-center cursor-pointer overflow-hidden"}, {}, (isDragging ? {"style":{"backgroundColor":"var(--purple-3)"},"className":"scale-[1.01]"} : {"style":{"backgroundColor":"var(--color-panel-solid)"}}))}
        >
          <UiInput
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFileCapture(e.target.files[0])} 
            accept=".pdf,.png,.jpg,.jpeg,.xml" 
            {...{"className":"hidden"}} 
          />
          
          {isAnalyzing ? (
            <UiBox {...{"className":"flex flex-col items-center justify-center py-4 space-y-3"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)"},"className":"animate-spin h-8 w-8"}}></UiBox>
              <UiText as="p" {...{"size":"1","weight":"bold","color":"purple","className":"animate-pulse"}}>Gemini IA está extrayendo información del comprobante...</UiText>
            </UiBox>
          ) : (
            <UiBox {...{"className":"flex flex-col items-center justify-center text-center space-y-2"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--purple-3)","color":"var(--purple-12)"},"className":"p-3"}}>
                <Sparkles size={24} />
              </UiBox>
              <UiBox>
                <UiText as="p" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Captura Inteligente IA / Carga XML</UiText>
                <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"weight":"medium","className":"mt-1 max-w-md leading-normal"}}>
                  Arrastra tu factura (PDF, XML, Imagen) aquí. Gemini la clasificará y auto-completará los campos del formulario de forma instantánea.
                </UiText>
              </UiBox>
            </UiBox>
          )}
        </UiBox>
      )}

      {/* TABS DE TIPO DE DOCUMENTO SRI */}
      {!forcedDocType && !isPreventaTab && (
        <UiBox style={{ borderRadius: "var(--radius-3)", backgroundColor: "var(--color-panel-solid)", border: "1px solid var(--gray-a6)" }} className="inline-flex h-9 items-center justify-start p-1 gap-1 overflow-x-auto custom-scrollbar whitespace-nowrap mb-2">
          {docTypeTabs.map(tab => {
            const isActive = filterDocType === tab.id;
            return (
              <UiButton
                key={tab.id}
                onClick={() => setFilterDocType(tab.id)}
                size="1"
                variant={isActive ? "surface" : "ghost"}
                color={isActive ? "blue" : "gray"}
                className="whitespace-nowrap cursor-pointer select-none"
              >
                {tab.label}
              </UiButton>
            );
          })}
        </UiBox>
      )}

      {/* FILTROS Y BUSQUEDA */}
      <UiBox {...{"className":"flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6"}}>
        <UiBox>
          <UiButton
            onClick={() => {
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
            }}
            {...{"variant":"solid","color":"blue","className":"w-full sm:w-auto"}}
          >
            <Plus size={15} /> Registrar {
              isPreventaTab
                ? 'Preventa'
                : (forcedDocType 
                    ? (forcedDocType === 'ventas_resumen' 
                        ? 'Venta Administrativa' 
                        : (forcedDocType === 'compras_resumen'
                            ? 'Compra'
                            : (docTypeTabs.find(t => t.id === forcedDocType)?.label || forcedDocType))) 
                    : 'Comprobante')
            }
          </UiButton>
        </UiBox>

        <UiBox className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <UiBox className="w-full sm:w-64">
            <UiInput
              type="text" 
              placeholder="Buscar documento o tercero..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
              size="2"
            />
          </UiBox>

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
        </UiBox>
      </UiBox>

      {/* TABLA DE COMPROBANTES */}
      <UiBox style={{ borderRadius: "var(--radius-3)", border: "1px solid var(--gray-a6)", backgroundColor: "var(--color-panel-solid)" }} className="overflow-hidden">
        <UiBox className="overflow-x-auto custom-scrollbar">
          <UiTable className="w-full text-left whitespace-nowrap">
            <UiTableHeader style={{ backgroundColor: "var(--gray-2)", color: "var(--gray-12)" }} className="select-none">
              <UiTableRow>
                <UiTableHead className="px-6 py-3.5 cursor-pointer" onClick={() => handleSort('date')}>
                  <UiBox className="flex items-center gap-0.5">
                    Fecha {renderSortIcon('date')}
                  </UiBox>
                </UiTableHead>
                <UiTableHead className="px-6 py-3.5 cursor-pointer" onClick={() => handleSort('documentNumber')}>
                  <UiBox className="flex items-center gap-0.5">
                    Documento {renderSortIcon('documentNumber')}
                  </UiBox>
                </UiTableHead>
                <UiTableHead className="px-6 py-3.5 cursor-pointer" onClick={() => handleSort('thirdParty')}>
                  <UiBox className="flex items-center gap-0.5">
                    Tercero {renderSortIcon('thirdParty')}
                  </UiBox>
                </UiTableHead>
                <UiTableHead className="px-6 py-3.5 cursor-pointer" onClick={() => handleSort('total')}>
                  <UiBox className="flex items-center gap-0.5">
                    Total {renderSortIcon('total')}
                  </UiBox>
                </UiTableHead>
                <UiTableHead className="px-6 py-3.5">Estado SRI</UiTableHead>
                {isPreventaTab && <UiTableHead className="px-6 py-3.5">Despacho</UiTableHead>}
                <UiTableHead className="px-6 py-3.5 hidden sm:table-cell">Archivos</UiTableHead>
                <UiTableHead className="px-6 py-3.5 text-right">Acciones</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              {sortedFiltered.map(tx => (
                <UiTableRow key={tx.id}>
                  <UiTableCell className="px-6 py-2.5">
                    <UiBox style={{ color: "var(--gray-12)" }} className="leading-none">{tx.date}</UiBox>
                    {tx.time && (
                      <UiBox style={{ color: "var(--gray-11)" }} className="text-xs leading-none mt-1.5">
                        {tx.time.substring(0, 5)}
                      </UiBox>
                    )}
                  </UiTableCell>
                  <UiTableCell className="px-6 py-2.5">
                    <UiBox style={{ color: "var(--gray-12)" }} className="leading-none mb-1 text-xs font-medium">
                      {getDocumentTypeLabel(tx.documentType, tx.type)}
                    </UiBox>
                    <UiBox style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-12)" }} className="text-xs font-mono">
                      {tx.documentNumber || (tx.sriStatus === 'borrador' ? 'Borrador' : '-')}
                    </UiBox>
                  </UiTableCell>
                  <UiTableCell style={{ color: "var(--gray-12)" }} className="px-6 py-2.5 truncate max-w-[200px]" title={thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name}>
                    {thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || 'Desconocido'}
                  </UiTableCell>
                  <UiTableCell style={{ color: "var(--gray-12)", fontFamily: "var(--code-font-family)" }} className="px-6 py-2.5 font-medium">
                    ${Number(tx.total || 0).toFixed(2)}
                  </UiTableCell>
                  <UiTableCell className="px-6 py-2.5">{getStatusBadge(tx.sriStatus, tx.documentType)}</UiTableCell>
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
                          : (tx.claveAcceso ? `/public/ride?claveAcceso=${tx.claveAcceso}&tenantId=${appId || ''}` : null);

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
                      
                      {(tx.sriStatus === 'autorizado' || tx.xmlUrl || tx.pdfUrl) && tx.documentType !== 'nota_venta' && (
                        <UiButton
                          iconOnly
                          type="button"
                          onClick={() => handleOpenEmailModal(tx)}
                          variant="soft"
                          color="indigo"
                          size="1"
                          title="Enviar Comprobante al Correo"
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
                  <UiTableCell colSpan={isPreventaTab ? 8 : 7} {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center italic"}}>No se encontraron comprobantes.</UiTableCell>
                </UiTableRow>
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      </UiBox>

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
                Confirma o edita el correo electrónico del cliente para realizar el envío de los archivos reglamentarios (XML y visualización del RIDE).
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
