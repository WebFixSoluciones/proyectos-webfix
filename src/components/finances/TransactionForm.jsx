import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Calculator, FileText, CheckCircle2, AlertTriangle, Sparkles, Terminal, ShieldAlert, Download } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { validarIdentificacion, generarFacturaXML, simularTransmisionSRI } from '../../services/sriService';

export default function TransactionForm({ tx, onClose, thirdParties, isDarkMode, showToast, db, storage, appId }) {
  const [sriConfig, setSriConfig] = useState(null);
  
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
    paymentMethod: 'transferencia',
    paymentStatus: 'pendiente',
    sriStatus: 'pendiente',
    xmlUrl: '',
    pdfUrl: '',
    xmlPath: '',
    pdfPath: '',
    secuencial: '1',
    claveAcceso: ''
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [sriLogs, setSriLogs] = useState([]);
  const fileInputRef = useRef(null);

  // Cargar configuraciones del Emisor SRI
  useEffect(() => {
    if (!appId || !db) return;
    async function loadSriConfig() {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSriConfig(snap.data());
          // Si es una nueva venta, proponer el siguiente secuencial y número de documento
          if (!tx) {
            const nextSec = snap.data().establecimiento + '-' + snap.data().puntoEmision() + '-';
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
      setFormData(tx);
    }
  }, [tx]);

  // Cálculo automático del total
  useEffect(() => {
    const base = Number(formData.baseImponible) || 0;
    const ivaPerc = Number(formData.ivaPorcentaje) || 0;
    const ivaVal = Number((base * (ivaPerc / 100)).toFixed(2));
    
    const retFuente = Number(formData.retencionFuente) || 0;
    const retIva = Number(formData.retencionIva) || 0;
    
    // Total = Base + IVA - Retenciones
    const total = base + ivaVal - retFuente - retIva;
    
    setFormData(prev => ({
      ...prev,
      ivaValor: ivaVal,
      total: total.toFixed(2)
    }));
  }, [formData.baseImponible, formData.ivaPorcentaje, formData.retencionFuente, formData.retencionIva]);

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

  // Validaciones antes de guardar/emitir
  const validateForm = () => {
    if (!formData.thirdPartyId) {
      showToast('Selecciona un tercero', 'error');
      return false;
    }

    const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId);
    if (!matchedTercero) {
      showToast('Contacto inválido', 'error');
      return false;
    }

    // Validar RUC del Receptor
    if (!validarIdentificacion(matchedTercero.ruc)) {
      showToast(`El RUC/CI del contacto (${matchedTercero.ruc}) es incorrecto`, 'error');
      return false;
    }

    // Validar total no negativo
    if (Number(formData.total) < 0) {
      showToast('El total liquidado no puede ser menor a cero', 'error');
      return false;
    }

    // Validar formato de documento número
    if (formData.documentNumber && !/^\d{3}-\d{3}-\d{9}$/.test(formData.documentNumber)) {
      showToast('El número de comprobante debe tener el formato 000-000-000000000', 'error');
      return false;
    }

    return true;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    try {
      const docId = formData.id || `tx_${new Date().getTime()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), {
        ...formData,
        id: docId,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Usuario ERP'
      }, { merge: true });

      showToast('Transacción guardada', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar', 'error');
    }
  };

  // Emitir y Transmitir al SRI electrónicamente
  const handleEmitirSRI = async () => {
    if (!sriConfig) {
      showToast("Configura los datos del emisor SRI primero", "error");
      return;
    }
    if (!validateForm()) return;

    const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId);

    setIsEmitting(true);
    setSriLogs([]);

    try {
      // 1. Generar secuencial si no está configurado
      const sec = formData.secuencial || '1';
      const docNum = `${sriConfig.establecimiento}-${sriConfig.puntoEmision}-${String(sec).padStart(9, '0')}`;
      
      // 2. Generar XML estructurado
      const { xml, claveAcceso } = generarFacturaXML(sriConfig, { ...formData, secuencial: sec }, matchedTercero);
      
      // 3. Ejecutar simulación de transmisión SRI
      const result = await simularTransmisionSRI(
        {
          rucReceptor: matchedTercero.ruc,
          total: formData.total,
          claveAcceso,
          xml
        },
        sriConfig,
        (logs) => setSriLogs(logs)
      );

      // 4. Guardar datos autorizados en Firestore y bloquear edición
      const docId = formData.id || `tx_${new Date().getTime()}`;
      const finalTx = {
        ...formData,
        id: docId,
        documentNumber: docNum,
        sriStatus: 'autorizado',
        claveAcceso: result.claveAcceso,
        xmlUrl: result.xmlUrl,
        pdfUrl: result.pdfUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Servicio Fiscal SRI'
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), finalTx);
      
      // Actualizar secuencial en configuraciones del emisor
      const nextSec = Number(sec) + 1;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings'), {
        secuencialFactura: nextSec
      }, { merge: true });

      setFormData(finalTx);
      showToast('Comprobante autorizado tributariamente por el SRI', 'success');
      
    } catch (err) {
      console.error(err);
      if (err.logs) setSriLogs(err.logs);
      showToast(err.error || 'Fallo en la autorización del SRI', 'error');
    } finally {
      setIsEmitting(false);
    }
  };

  // Anulación del documento
  const handleAnular = async () => {
    if (window.confirm("¿Estás seguro de que deseas ANULAR este comprobante ante el SRI? Esta acción no se puede deshacer y tiene implicaciones fiscales.")) {
      try {
        const docId = formData.id;
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), {
          sriStatus: 'anulado',
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        setFormData(prev => ({ ...prev, sriStatus: 'anulado' }));
        showToast("Comprobante anulado tributariamente", "success");
      } catch (e) {
        showToast("Error al anular comprobante", "error");
      }
    }
  };

  // Descargar XML generado
  const downloadXMLFile = () => {
    if (!formData.claveAcceso) return;
    const element = document.createElement("a");
    const matchedTercero = thirdParties.find(tp => tp.id === formData.thirdPartyId);
    const { xml } = generarFacturaXML(sriConfig, formData, matchedTercero);
    const file = new Blob([xml], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${formData.claveAcceso}.xml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isAuthorized = formData.sriStatus === 'autorizado';
  const isAnulado = formData.sriStatus === 'anulado';
  const isEditable = !isAuthorized && !isAnulado;

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/25 border-white/10 text-white focus:border-blue-500/50 disabled:opacity-50' 
      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500/50 disabled:bg-gray-100 disabled:opacity-75'
  }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl custom-scrollbar ${isDarkMode ? 'bg-[#151517] border border-white/10' : 'bg-[#f8f9fa] border border-gray-200'}`}>
        
        {/* HEADER */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md ${isDarkMode ? 'border-white/5 bg-[#151517]/95' : 'border-gray-200 bg-[#f8f9fa]/95'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${formData.type === 'ingreso' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {formData.id ? 'Detalles de' : 'Registrar'} {formData.type === 'ingreso' ? 'Ingreso (Venta / Factura)' : 'Egreso (Compra / Gasto)'}
              </h2>
              {formData.claveAcceso && <p className="text-[9px] font-mono text-gray-500 mt-0.5">Clave de Acceso: {formData.claveAcceso}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><X size={18}/></button>
        </div>

        {/* ALERTA DE BLOQUEO DE EDICION */}
        {isAuthorized && (
          <div className="mx-6 mt-4 p-4 rounded-xl border border-dashed bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex items-center gap-3">
            <CheckCircle2 size={20} className="shrink-0" />
            <div className="text-xs">
              <p className="font-bold">Comprobante Autorizado por el SRI</p>
              <p className="opacity-80">Este documento tiene efectos fiscales y no puede ser editado ni eliminado. Para corregirlo, emita una Nota de Crédito o proceda con la anulación.</p>
            </div>
          </div>
        )}

        {isAnulado && (
          <div className="mx-6 mt-4 p-4 rounded-xl border border-dashed bg-red-500/10 border-red-500/20 text-red-400 flex items-center gap-3">
            <ShieldAlert size={20} className="shrink-0" />
            <div className="text-xs">
              <p className="font-bold">Comprobante Anulado</p>
              <p className="opacity-80">Este documento ya no tiene validez tributaria ante el SRI.</p>
            </div>
          </div>
        )}

        {/* AI DETECTED ALERT */}
        {formData.isAIDetected && isEditable && (
          <div className="mx-6 mt-4 p-3 rounded-xl border border-dashed bg-purple-500/15 border-purple-500/30 text-purple-400 flex items-center gap-2">
            <Sparkles size={16} className="animate-pulse" />
            <p className="text-[10px] font-semibold">
              Datos extraídos automáticamente por Gemini IA. Por favor, valide los campos antes de guardar.
            </p>
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* COLUMNA FORMULARIO */}
            <div className="md:col-span-2 space-y-6">
              
              {/* BLOQUE 1: COMPROBANTE */}
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/15 border-white/5' : 'bg-white border-gray-100'}`}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-4 text-gray-500">Datos Tributarios</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Tipo Transacción</label>
                    <select disabled={!isEditable} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={inputClass}>
                      <option value="ingreso" className="text-black">Ingreso (Ventas Emitidas)</option>
                      <option value="egreso" className="text-black">Egreso (Gastos / Compras)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Tipo Documento</label>
                    <select disabled={!isEditable} value={formData.documentType} onChange={e => setFormData({...formData, documentType: e.target.value})} className={inputClass}>
                      <option value="factura" className="text-black">Factura Electrónica</option>
                      <option value="nota_venta" className="text-black">Nota de Venta</option>
                      <option value="liquidacion" className="text-black">Liquidación de Compra</option>
                      <option value="retencion" className="text-black">Comprobante de Retención</option>
                      <option value="nota_credito" className="text-black">Nota de Crédito</option>
                      <option value="nota_debito" className="text-black">Nota de Débito</option>
                      <option value="guia_remision" className="text-black">Guía de Remisión</option>
                    </select>
                  </div>
                  
                  {formData.type === 'ingreso' && isEditable ? (
                    <div>
                      <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Secuencial Factura (SRI)</label>
                      <div className="flex gap-2">
                        <span className={`px-3 py-2 text-xs rounded-xl border flex items-center bg-white/5 border-white/10 text-gray-400 font-mono`}>
                          {sriConfig?.establecimiento || '001'}-{sriConfig?.puntoEmision || '001'}
                        </span>
                        <input type="number" required value={formData.secuencial} onChange={e => setFormData({...formData, secuencial: e.target.value})} className={inputClass} placeholder="1" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Número de Documento</label>
                      <input disabled={!isEditable} type="text" value={formData.documentNumber} onChange={e => setFormData({...formData, documentNumber: e.target.value})} className={inputClass} placeholder="001-001-000000001" />
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Categoría Contable</label>
                    <select disabled={!isEditable} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass}>
                      <option value="ventas" className="text-black">Ventas / Honorarios</option>
                      <option value="costos" className="text-black">Costos Operativos</option>
                      <option value="gastos_administrativos" className="text-black">Gastos Administrativos</option>
                      <option value="gastos_marketing" className="text-black">Gastos Marketing (Hosting/Publicidad)</option>
                      <option value="activos" className="text-black">Compra de Activos</option>
                      <option value="otros" className="text-black">Otros</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Fecha de Emisión</label>
                    <input disabled={!isEditable} type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} />
                  </div>
                  
                  <div>
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Moneda / Divisa</label>
                    <select disabled={!isEditable} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className={inputClass}>
                      <option value="USD" className="text-black">Dólares (USD)</option>
                      <option value="EUR" className="text-black">Euros (EUR)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Tercero (Cliente o Proveedor)</label>
                    <select disabled={!isEditable} required value={formData.thirdPartyId} onChange={e => setFormData({...formData, thirdPartyId: e.target.value})} className={inputClass}>
                      <option value="" disabled className="text-gray-400">Selecciona un contacto...</option>
                      {thirdParties.map(tp => (
                        <option key={tp.id} value={tp.id} className="text-black">{tp.name} - RUC: {tp.ruc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: VALORES E IMPUESTOS */}
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/15 border-white/5' : 'bg-white border-gray-100'}`}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-4 text-gray-500">Valores e Impuestos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Base Imponible</label>
                    <input disabled={!isEditable} type="number" step="0.01" value={formData.baseImponible} onChange={e => setFormData({...formData, baseImponible: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">% IVA</label>
                    <select disabled={!isEditable} value={formData.ivaPorcentaje} onChange={e => setFormData({...formData, ivaPorcentaje: e.target.value})} className={inputClass}>
                      <option value="15" className="text-black">15% (Actual)</option>
                      <option value="12" className="text-black">12% (Anterior)</option>
                      <option value="0" className="text-black">0% exento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Ret. Fuente (Renta)</label>
                    <input disabled={!isEditable} type="number" step="0.01" value={formData.retencionFuente} onChange={e => setFormData({...formData, retencionFuente: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Retención de IVA</label>
                    <input disabled={!isEditable} type="number" step="0.01" value={formData.retencionIva} onChange={e => setFormData({...formData, retencionIva: e.target.value})} className={inputClass} />
                  </div>
                </div>

                <div className={`mt-5 p-4 rounded-xl flex justify-between items-center ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/15 text-blue-400' : 'bg-blue-50 border border-blue-100 text-blue-800'}`}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider">Total a Cobrar/Pagar (Neto)</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Base (${formData.baseImponible}) + IVA (${formData.ivaValor}) - Retenciones (${Number(formData.retencionFuente) + Number(formData.retencionIva)})</p>
                  </div>
                  <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${formData.total}</p>
                </div>
              </div>

            </div>

            {/* COLUMNA LATERAL (SRI CONSOLE & FILES) */}
            <div className="space-y-6">
              
              {/* ESTADO PAGO */}
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/15 border-white/5' : 'bg-white border-gray-100'}`}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3 text-gray-500">Flujo Financiero</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Método</label>
                      <select disabled={!isEditable} value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className={inputClass}>
                        <option value="transferencia" className="text-black">Transferencia</option>
                        <option value="efectivo" className="text-black">Efectivo</option>
                        <option value="tarjeta" className="text-black">Tarjeta de Crédito</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase mb-1 text-gray-500">Estado Pago</label>
                      <select disabled={!isEditable} value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})} className={inputClass}>
                        <option value="pendiente" className="text-black">Pendiente</option>
                        <option value="pagado" className="text-black">Pagado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ARCHIVOS SRI ADJUNTOS */}
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/15 border-white/5' : 'bg-white border-gray-100'}`}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3 text-gray-500 flex justify-between items-center">
                  Documentos Digitales
                  {isUploading && <span className="text-[9px] text-blue-500 animate-pulse">Subiendo...</span>}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed cursor-pointer transition-colors ${formData.xmlUrl ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' : 'border-white/10 hover:bg-white/5 text-gray-400'}`}>
                      <input type="file" accept=".xml" className="hidden" onChange={(e) => handleFileUpload(e, 'xml')} disabled={isUploading || !isEditable}/>
                      {formData.xmlUrl ? <CheckCircle2 size={13}/> : <UploadCloud size={13}/>}
                      <span className="text-[10px] font-bold">{formData.xmlUrl ? 'XML Guardado' : 'Subir XML'}</span>
                    </label>
                    {formData.xmlUrl && <a href={formData.xmlUrl} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 hover:bg-blue-500"><FileText size={13}/></a>}
                  </div>

                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed cursor-pointer transition-colors ${formData.pdfUrl ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' : 'border-white/10 hover:bg-white/5 text-gray-400'}`}>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'pdf')} disabled={isUploading || !isEditable}/>
                      {formData.pdfUrl ? <CheckCircle2 size={13}/> : <UploadCloud size={13}/>}
                      <span className="text-[10px] font-bold">{formData.pdfUrl ? 'PDF RIDE' : 'Subir PDF'}</span>
                    </label>
                    {formData.pdfUrl && <a href={formData.pdfUrl} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 hover:bg-blue-500"><FileText size={13}/></a>}
                  </div>
                </div>
              </div>

              {/* CONSOLA BITACORA DE TRANSMISION SRI */}
              {(isEmitting || sriLogs.length > 0) && (
                <div className="p-4 rounded-2xl bg-black border border-white/10 text-white font-mono text-[9px] space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-1.5 border-b border-white/10 pb-1.5 text-gray-400">
                    <Terminal size={12} />
                    <span>Bitácora Fiscal SRI</span>
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
                      <span>Procesando con SRI en tiempo real...</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* BOTTOM ACCIONES BAR */}
        <div className={`sticky bottom-0 z-10 flex items-center justify-between px-6 py-4 border-t backdrop-blur-md ${isDarkMode ? 'border-white/5 bg-[#151517]/95' : 'border-gray-200 bg-[#f8f9fa]/95'}`}>
          <div className="flex gap-2">
            {isAuthorized && (
              <>
                <button type="button" onClick={downloadXMLFile} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-600/20 text-gray-300 hover:bg-gray-600/30 transition-all border border-white/5">
                  <Download size={14} /> Descargar XML
                </button>
                <button type="button" onClick={handleAnular} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all border border-red-500/10">
                  <ShieldAlert size={14} /> Anular en SRI
                </button>
              </>
            )}
          </div>
          
          <div className="flex gap-3.5">
            <button type="button" onClick={onClose} className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>Cancelar</button>
            {isEditable && (
              <>
                <button type="button" onClick={handleSave} disabled={isUploading || isEmitting} className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-400 hover:bg-blue-600/35 border border-blue-500/10 transition-transform hover:-translate-y-0.5">Guardar Borrador</button>
                {formData.type === 'ingreso' && (
                  <button type="button" onClick={handleEmitirSRI} disabled={isUploading || isEmitting} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-md transition-transform hover:-translate-y-0.5">
                    <Sparkles size={13} /> Emitir y Firmar SRI
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
