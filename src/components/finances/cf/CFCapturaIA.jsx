import React, { useState, useRef } from 'react';
import { Upload, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, X, FileText } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { parsearXMLComprobante, analizarComprobanteConGemini } from '../../../services/geminiService';
import { formatMoney } from '../../../services/financialService';

/**
 * CFCapturaIA — Captura inteligente de comprobantes con OCR Gemini.
 * Soporta XML del SRI, imágenes y PDFs de facturas.
 * Props: { db, appId, showToast }
 */
export default function CFCapturaIA({ db, appId, showToast }) {
  const fileRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState({
    file: null,
    loading: false,
    data: null,
    warnings: [],
    error: null
  });

  const processFile = async (file) => {
    if (!file) return;
    setState({ file, loading: true, data: null, warnings: [], error: null });

    try {
      let extracted;
      const isXml = file.name?.toLowerCase().endsWith('.xml') || file.type?.includes('xml');

      if (isXml) {
        // Leer XML como texto y parsear
        const xmlText = await file.text();
        const result = parsearXMLComprobante(xmlText);
        if (!result.success) throw new Error(result.error || 'Error al parsear el XML');
        extracted = result.data;
      } else {
        // Imagen o PDF: usar Gemini AI
        extracted = await analizarComprobanteConGemini(file);
      }

      // Generar advertencias
      const warnings = [];
      if (!extracted.ruc) warnings.push('RUC/Cédula no identificado — verifique antes de guardar.');
      if (!extracted.documentNumber) warnings.push('Número de comprobante no detectado.');
      if (!extracted.total || Number(extracted.total) === 0) warnings.push('Total no detectado o igual a cero.');

      setState({ file, loading: false, data: extracted, warnings, error: null });
    } catch (err) {
      console.error('CFCapturaIA error:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: String(err?.message || 'Error al analizar el archivo. Intente con otro formato.')
      }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleApprove = async () => {
    if (!state.data) return;
    const d = state.data;
    const id = `ia_${Date.now()}`;

    // Obtener fecha actual en formato Ecuador
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    const payload = {
      id,
      type: 'egreso', // Comprobantes recibidos son gastos por defecto
      date: d.date || today,
      documentType: 'factura',
      documentNumber: d.documentNumber || '',
      thirdPartyName: d.razonSocial || '',
      thirdPartyRuc: d.ruc || '',
      category: d.category || 'gastos_operativos',
      currency: 'USD',
      baseImponible: Number(d.baseImponible) || 0,
      ivaPorcentaje: 15,
      ivaValor: Number(d.ivaValor) || 0,
      retencionFuente: 0,
      retencionIva: 0,
      total: Number(d.total) || 0,
      paidAmount: 0,
      paymentMethod: d.paymentMethod || 'transferencia',
      paymentStatus: 'pendiente',
      sriStatus: 'pendiente',
      sourceModule: 'ia_capture',
      description: `IA: ${d.razonSocial || 'Sin emisor'} — ${d.documentNumber || 'Sin número'}`,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', id),
        payload
      );
      showToast?.('Movimiento registrado correctamente desde IA', 'success');
      setState({ file: null, loading: false, data: null, warnings: [], error: null });
    } catch (e) {
      console.error('Error saving IA capture:', e);
      showToast?.('Error al guardar el movimiento', 'error');
    }
  };

  const handleReset = () => {
    setState({ file: null, loading: false, data: null, warnings: [], error: null });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zona de carga */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-4 cursor-pointer transition-all min-h-[260px] ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-[1.01]'
              : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.xml,text/xml"
            onChange={e => processFile(e.target.files?.[0])}
          />

          {state.loading ? (
            <>
              <div className="p-4 rounded-full bg-blue-100">
                <RefreshCw size={28} className="text-blue-600 animate-spin" />
              </div>
              <p className="text-sm font-bold text-blue-700">Analizando con Gemini IA...</p>
              <p className="text-xs text-slate-400">{state.file?.name}</p>
            </>
          ) : (
            <>
              <div className="p-4 rounded-full bg-blue-50">
                <Upload size={28} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Arrastra o selecciona un archivo</p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, PDF, o XML del SRI</p>
              </div>
              <span className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl">
                <Sparkles size={13} /> Seleccionar Archivo
              </span>
              {state.file && !state.data && !state.error && (
                <p className="text-[11px] text-slate-400">{state.file.name}</p>
              )}
            </>
          )}
        </div>

        {/* Panel de resultado */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 min-h-[260px]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText size={14} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Propuesta Extraída por IA</h3>
            {state.data && (
              <button onClick={handleReset} className="ml-auto p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X size={14} className="text-slate-400" />
              </button>
            )}
          </div>

          {/* Error */}
          {state.error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error al analizar</p>
                <p className="mt-0.5 opacity-80">{state.error}</p>
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {!state.data && !state.error && !state.loading && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs space-y-2">
              <Sparkles size={24} className="text-slate-300" />
              <p className="text-center">Selecciona un archivo para ver la propuesta extraída por la IA</p>
            </div>
          )}

          {/* Datos extraídos */}
          {state.data && (
            <div className="space-y-3">
              {/* Advertencias */}
              {state.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                  {state.warnings.map((w, i) => (
                    <p key={i} className="flex items-center gap-1 font-semibold">
                      <AlertTriangle size={11} /> {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Tabla de datos */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                {[
                  { label: 'Emisor', value: state.data.razonSocial || 'N/A' },
                  { label: 'RUC / CI', value: state.data.ruc || 'N/A' },
                  { label: 'Comprobante', value: state.data.documentNumber || 'N/A', mono: true },
                  { label: 'Fecha', value: state.data.date || 'Hoy' },
                  { label: 'Método de Pago', value: state.data.paymentMethod || 'transferencia' },
                  { label: 'Categoría Sugerida', value: state.data.category || 'otros', highlight: true },
                  { label: 'Subtotal', value: formatMoney(state.data.baseImponible) },
                  { label: 'IVA', value: formatMoney(state.data.ivaValor) },
                ].map(({ label, value, mono, highlight }) => (
                  <div key={label}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">{label}</span>
                    <span className={`font-semibold ${mono ? 'font-mono text-[11px]' : ''} ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>
                      {value}
                    </span>
                  </div>
                ))}
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Total</span>
                  <span className="font-bold text-lg text-emerald-700">{formatMoney(state.data.total)}</span>
                </div>
              </div>

              {/* Botón confirmar */}
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Confirmar y Registrar
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instrucciones */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 space-y-1">
        <p className="font-bold flex items-center gap-1"><Sparkles size={12} /> ¿Cómo funciona la Captura Inteligente?</p>
        <ul className="space-y-0.5 pl-4 list-disc text-blue-700 opacity-90">
          <li><strong>XML del SRI:</strong> Se parsea directamente con 100% de precisión.</li>
          <li><strong>Imágenes o PDF:</strong> Google Gemini IA extrae los datos automáticamente.</li>
          <li>Revisa siempre los datos antes de confirmar. Los datos extraídos se pueden editar en el módulo de Movimientos.</li>
          <li>Requiere API Key de Gemini configurada en Ajustes del sistema.</li>
        </ul>
      </div>
    </div>
  );
}
