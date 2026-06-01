import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Calculator, FileText, CheckCircle2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function TransactionForm({ tx, onClose, thirdParties, isDarkMode, showToast, db, storage, appId }) {
  const [formData, setFormData] = useState({
    id: '',
    type: 'ingreso',
    date: new Date().toISOString().split('T')[0],
    documentType: 'factura',
    documentNumber: '',
    thirdPartyId: '',
    category: 'ventas', // categoría contable
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
    pdfPath: ''
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

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
    
    // Total = Base + IVA - Retenciones (si es ingreso, las retenciones restan lo que cobras. Si es egreso, restan lo que pagas).
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
        (snapshot) => {}, 
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

          // Si es XML, parsear datos básicos (opcional, básico)
          if (fileType === 'xml') {
            const text = await file.text();
            try {
              const rucMatch = text.match(/<ruc>([^<]+)<\/ruc>/);
              const numMatch = text.match(/<estab>([^<]+)<\/estab>.*?<ptoEmi>([^<]+)<\/ptoEmi>.*?<secuencial>([^<]+)<\/secuencial>/s);
              const baseMatch = text.match(/<baseImponible>([^<]+)<\/baseImponible>/);
              
              if (numMatch) {
                const docNum = `${numMatch[1]}-${numMatch[2]}-${numMatch[3]}`;
                setFormData(prev => ({ ...prev, documentNumber: docNum }));
              }
              if (baseMatch) {
                setFormData(prev => ({ ...prev, baseImponible: parseFloat(baseMatch[1]) }));
              }
              showToast('Datos leídos del XML', 'success');
            } catch (err) {
              console.log('Error parseando XML simplificado', err);
            }
          }
          
          setIsUploading(false);
          showToast(`${fileType.toUpperCase()} subido`, 'success');
        }
      );
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.thirdPartyId) {
      showToast('Selecciona un tercero', 'error');
      return;
    }

    try {
      const docId = formData.id || `tx_${new Date().getTime()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', docId), {
        ...formData,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Usuario Actual' // Reemplazar con Auth info si está disponible
      }, { merge: true });

      showToast('Transacción guardada', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar', 'error');
    }
  };

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/20 border-white/10 text-white focus:border-blue-500/50' 
      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500/50'
  }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl custom-scrollbar ${isDarkMode ? 'bg-[#1a1a1c] border border-white/10' : 'bg-[#f8f9fa] border border-gray-200'}`}>
        
        {/* HEADER */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md ${isDarkMode ? 'border-white/10 bg-[#1a1a1c]/90' : 'border-gray-200 bg-[#f8f9fa]/90'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${formData.type === 'ingreso' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
              <Calculator size={18} />
            </div>
            <h2 className="text-lg font-bold">{formData.id ? 'Editar' : 'Registrar'} {formData.type === 'ingreso' ? 'Ingreso (Venta)' : 'Egreso (Compra)'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors"><X size={18}/></button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          {/* BLOQUE 1: DATOS PRINCIPALES */}
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Datos del Comprobante</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Tipo de Transacción</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={inputClass}>
                  <option value="ingreso" className="text-black">Ingreso (Venta / Honorario)</option>
                  <option value="egreso" className="text-black">Egreso (Compra / Gasto)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Documento</label>
                <select value={formData.documentType} onChange={e => setFormData({...formData, documentType: e.target.value})} className={inputClass}>
                  <option value="factura" className="text-black">Factura Electrónica</option>
                  <option value="nota_venta" className="text-black">Nota de Venta (RISE/RIMPE)</option>
                  <option value="liquidacion" className="text-black">Liquidación de Compra</option>
                  <option value="retencion" className="text-black">Comprobante de Retención</option>
                  <option value="nota_credito" className="text-black">Nota de Crédito</option>
                  <option value="nota_debito" className="text-black">Nota de Débito</option>
                  <option value="guia_remision" className="text-black">Guía de Remisión</option>
                  <option value="recibo" className="text-black">Recibo Interno</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Número (Ej: 001-001-123456789)</label>
                <input type="text" value={formData.documentNumber} onChange={e => setFormData({...formData, documentNumber: e.target.value})} className={inputClass} placeholder="000-000-000000000" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Categoría Contable</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass}>
                  <option value="ventas" className="text-black">Ventas / Honorarios</option>
                  <option value="costos" className="text-black">Costos Operativos</option>
                  <option value="gastos_administrativos" className="text-black">Gastos Administrativos</option>
                  <option value="gastos_marketing" className="text-black">Gastos Marketing</option>
                  <option value="activos" className="text-black">Compra de Activos</option>
                  <option value="otros" className="text-black">Otros</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Fecha de Emisión</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Moneda</label>
                <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className={inputClass}>
                  <option value="USD" className="text-black">Dólares (USD)</option>
                  <option value="EUR" className="text-black">Euros (EUR)</option>
                  <option value="COP" className="text-black">Pesos Colombianos (COP)</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Tercero (Cliente/Proveedor)</label>
                <select required value={formData.thirdPartyId} onChange={e => setFormData({...formData, thirdPartyId: e.target.value})} className={inputClass}>
                  <option value="" disabled className="text-gray-400">Selecciona un contacto...</option>
                  {thirdParties.map(tp => (
                    <option key={tp.id} value={tp.id} className="text-black">{tp.name} - {tp.ruc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* BLOQUE 2: VALORES E IMPUESTOS */}
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Desglose de Valores e Impuestos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Base Imponible</label>
                <input type="number" step="0.01" value={formData.baseImponible} onChange={e => setFormData({...formData, baseImponible: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">% IVA</label>
                <select value={formData.ivaPorcentaje} onChange={e => setFormData({...formData, ivaPorcentaje: e.target.value})} className={inputClass}>
                  <option value="15" className="text-black">15%</option>
                  <option value="12" className="text-black">12%</option>
                  <option value="0" className="text-black">0%</option>
                  <option value="8" className="text-black">8% (Feriados)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Retención en la Fuente</label>
                <input type="number" step="0.01" value={formData.retencionFuente} onChange={e => setFormData({...formData, retencionFuente: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Retención de IVA</label>
                <input type="number" step="0.01" value={formData.retencionIva} onChange={e => setFormData({...formData, retencionIva: e.target.value})} className={inputClass} />
              </div>
            </div>
            
            <div className={`mt-4 p-4 rounded-xl flex justify-between items-center ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Total a {formData.type === 'ingreso' ? 'Cobrar' : 'Pagar'} (Liquidado)</p>
                <p className="text-xs opacity-70">Base ({formData.baseImponible}) + IVA ({formData.ivaValor}) - Retenciones ({Number(formData.retencionFuente) + Number(formData.retencionIva)})</p>
              </div>
              <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>${formData.total}</p>
            </div>
          </div>

          {/* BLOQUE 3: ESTADO Y ARCHIVOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-gray-100'}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Estados y Pagos</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Estado SRI</label>
                  <select value={formData.sriStatus} onChange={e => setFormData({...formData, sriStatus: e.target.value})} className={inputClass}>
                    <option value="emitido" className="text-black">Emitido / Borrador</option>
                    <option value="enviado" className="text-black">Enviado al SRI</option>
                    <option value="pendiente" className="text-black">Pendiente de Autorización</option>
                    <option value="autorizado" className="text-black">Autorizado</option>
                    <option value="rechazado" className="text-black">Rechazado SRI</option>
                    <option value="anulado" className="text-black">Anulado</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Método Pago</label>
                    <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className={inputClass}>
                      <option value="transferencia" className="text-black">Transferencia</option>
                      <option value="efectivo" className="text-black">Efectivo</option>
                      <option value="tarjeta" className="text-black">Tarjeta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Estado Pago</label>
                    <select value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})} className={inputClass}>
                      <option value="pendiente" className="text-black">Pendiente</option>
                      <option value="pagado" className="text-black">Pagado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-gray-100'}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex justify-between ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Archivos SRI (XML/PDF)
                {isUploading && <span className="text-blue-500 animate-pulse">Subiendo...</span>}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed cursor-pointer transition-colors ${formData.xmlUrl ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : (isDarkMode ? 'border-white/20 hover:bg-white/5 text-gray-400' : 'border-gray-300 hover:bg-gray-50 text-gray-600')}`}>
                    <input type="file" accept=".xml" className="hidden" onChange={(e) => handleFileUpload(e, 'xml')} disabled={isUploading}/>
                    {formData.xmlUrl ? <CheckCircle2 size={16}/> : <UploadCloud size={16}/>}
                    <span className="text-xs font-semibold">{formData.xmlUrl ? 'XML Adjunto' : 'Subir XML'}</span>
                  </label>
                  {formData.xmlUrl && <a href={formData.xmlUrl} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-blue-500 text-white shadow-sm"><FileText size={16}/></a>}
                </div>

                <div className="flex items-center gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed cursor-pointer transition-colors ${formData.pdfUrl ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : (isDarkMode ? 'border-white/20 hover:bg-white/5 text-gray-400' : 'border-gray-300 hover:bg-gray-50 text-gray-600')}`}>
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'pdf')} disabled={isUploading}/>
                    {formData.pdfUrl ? <CheckCircle2 size={16}/> : <UploadCloud size={16}/>}
                    <span className="text-xs font-semibold">{formData.pdfUrl ? 'PDF Adjunto' : 'Subir PDF (RIDE)'}</span>
                  </label>
                  {formData.pdfUrl && <a href={formData.pdfUrl} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-blue-500 text-white shadow-sm"><FileText size={16}/></a>}
                </div>
              </div>
              <p className="text-[10px] text-center mt-3 text-gray-500 leading-tight">Sube el XML para extraer automáticamente datos de la factura como la base imponible y el número.</p>
            </div>
          </div>

        </form>

        <div className={`sticky bottom-0 z-10 flex justify-end gap-3 px-6 py-4 border-t backdrop-blur-md ${isDarkMode ? 'border-white/10 bg-[#1a1a1c]/90' : 'border-gray-200 bg-[#f8f9fa]/90'}`}>
          <button type="button" onClick={onClose} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>Cancelar</button>
          <button onClick={handleSave} disabled={isUploading} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50">Guardar Transacción</button>
        </div>

      </div>
    </div>
  );
}
