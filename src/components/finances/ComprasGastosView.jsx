import React, { useState } from 'react';
import { Sparkles, Save, CheckCircle2, AlertTriangle, FileText, X, RefreshCw, Copy, Trash2, ArrowUpRight } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { analizarTextoFacturaConGemini } from '../../services/geminiService';
import { getEcuadorDateString } from '../../services/sriService';

export default function ComprasGastosView({ transactions = [], isDarkMode, showToast, db, appId }) {
  const [pastedText, setPastedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  // Textos Demo de Facturas de Ecuador para facilitar pruebas del usuario
  const MOCK_CNT_TEXT = `CORPORACION NACIONAL DE TELECOMUNICACIONES CNT EP
RUC: 1760001040001
Factura Nro: 001-777-089912233
Fecha Emision: 03/06/2026
Cliente: WEBFIX SOLUCIONES
Subtotal 12% / 15%: 25.00
IVA 15%: 3.75
TOTAL A PAGAR: 28.75 USD
Forma de Pago: Otros con utilizacion del sistema financiero`;

  const MOCK_SUPERMAXI_TEXT = `CORPORACION FAVORITA C.A. (SUPERMAXI)
RUC: 1790016919001
Direccion: Av. Eloy Alfaro y de los Granados
Factura Nro: 005-102-000456789
Fecha: 03-06-2026
1 Papel Bond A4 Resma - 5.50
1 Cafetera Oster Negra - 85.00
1 Pack Vasos Plasticos - 30.00
SUBTOTAL: 120.50
IVA 15%: 18.08
TOTAL: 138.58
Gracias por su compra`;

  // Analizar texto con Gemini
  const handleAnalyzeText = async () => {
    if (!pastedText.trim()) {
      showToast("Por favor pegue o escriba el contenido de una factura para analizar", "error");
      return;
    }
    setAnalyzing(true);
    try {
      const data = await analizarTextoFacturaConGemini(pastedText);
      setParsedData(data);
      showToast("Factura analizada correctamente por Gemini AI", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error al analizar con la IA", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  // Guardar Gasto
  const handleSaveGasto = async (e) => {
    e.preventDefault();
    if (!parsedData) return;

    try {
      const txId = `tx_${new Date().getTime()}_gasto`;
      const payload = {
        id: txId,
        type: 'egreso',
        documentType: 'nota_venta',
        date: parsedData.date || getEcuadorDateString(),
        documentNumber: parsedData.documentNumber || `REC-${new Date().getTime().toString().slice(-6)}`,
        thirdPartyId: '', // Proveedor externo
        category: parsedData.category || 'gastos_administrativos',
        description: `${parsedData.razonSocial} - Gasto clasificado con IA`,
        currency: 'USD',
        baseImponible: Number(parsedData.baseImponible) || Number(parsedData.total) || 0,
        ivaPorcentaje: parsedData.ivaValor > 0 ? 15 : 0,
        ivaValor: Number(parsedData.ivaValor) || 0,
        total: Number(parsedData.total) || 0,
        paymentMethod: parsedData.paymentMethod || 'transferencia',
        paymentStatus: 'pagado',
        sriStatus: 'no_aplica',
        paymentsBreakdown: {
          efectivo: parsedData.paymentMethod === 'efectivo' ? Number(parsedData.total) : 0,
          transferencia: parsedData.paymentMethod === 'transferencia' ? Number(parsedData.total) : 0,
          tarjeta: parsedData.paymentMethod === 'tarjeta' ? Number(parsedData.total) : 0,
          cruce_cuentas: 0
        },
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId), payload);
      showToast("Gasto registrado y clasificado correctamente en la contabilidad", "success");
      setParsedData(null);
      setPastedText('');
    } catch (err) {
      console.error(err);
      showToast("Error al guardar el gasto", "error");
    }
  };

  // Eliminar gasto de la contabilidad (los egresos ingresados)
  const handleDeleteGasto = async (id) => {
    if (!window.confirm("¿Está seguro de eliminar este gasto de la contabilidad?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', id));
      showToast("Gasto eliminado con éxito", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al eliminar el gasto", "error");
    }
  };

  const currentExpenses = transactions.filter(t => t.type === 'egreso' && t.id.includes('gasto'));

  const inputClass = `w-full text-xs px-3 py-2 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/25 border-white/10 text-white focus:border-primary/50' 
      : 'bg-white border-gray-300 text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary/35'
  }`;

  return (
    <div className="space-y-6">
      
      {/* SECCIÓN ANALIZADOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ENTRADA DE TEXTO */}
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'
        }`}>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-500 animate-pulse" />
              <span>Categorizador de Gastos con Inteligencia Artificial</span>
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Pegue el texto copiado de un correo de facturación o el texto extraído de un ticket y Gemini identificará los montos, proveedor y tipo de gasto contable.</p>
          </div>

          <div className="flex gap-2 text-[10px] font-bold">
            <button
              onClick={() => setPastedText(MOCK_CNT_TEXT)}
              className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all flex items-center gap-1"
            >
              <Copy size={10} />
              <span>Demo Factura CNT</span>
            </button>
            <button
              onClick={() => setPastedText(MOCK_SUPERMAXI_TEXT)}
              className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all flex items-center gap-1"
            >
              <Copy size={10} />
              <span>Demo Supermaxi</span>
            </button>
          </div>

          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder="Pegue aquí el texto de su factura..."
            rows={8}
            className={`w-full text-xs p-4 rounded-2xl outline-none border transition-all ${
              isDarkMode 
                ? 'bg-black/30 border-white/5 text-gray-300 focus:border-primary/50' 
                : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-primary'
            }`}
          />

          <button
            onClick={handleAnalyzeText}
            disabled={analyzing || !pastedText.trim()}
            className="w-full h-[34px] rounded-[var(--radius-button)] bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs flex justify-center items-center gap-2 transition-all disabled:opacity-50 border-none"
          >
            {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{analyzing ? 'Analizando Gasto con Gemini...' : 'Analizar Gasto con IA'}</span>
          </button>
        </div>

        {/* RESULTADO DEL ANÁLISIS */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
          isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-200'
        }`}>
          {parsedData ? (
            <form onSubmit={handleSaveGasto} className="space-y-4 h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Campos Extraídos por IA
                  </h4>
                  <button type="button" onClick={() => setParsedData(null)} className="btn-icon text-gray-400"><X size={14} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Razón Social Proveedor</label>
                    <input
                      type="text"
                      required
                      value={parsedData.razonSocial || ''}
                      onChange={e => setParsedData({ ...parsedData, razonSocial: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">RUC Proveedor</label>
                    <input
                      type="text"
                      required
                      value={parsedData.ruc || ''}
                      onChange={e => setParsedData({ ...parsedData, ruc: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Nro de Documento</label>
                    <input
                      type="text"
                      required
                      value={parsedData.documentNumber || ''}
                      onChange={e => setParsedData({ ...parsedData, documentNumber: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Fecha Emisión</label>
                    <input
                      type="date"
                      required
                      value={parsedData.date || ''}
                      onChange={e => setParsedData({ ...parsedData, date: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Categoría Gasto</label>
                    <select
                      value={parsedData.category || ''}
                      onChange={e => setParsedData({ ...parsedData, category: e.target.value })}
                      className={inputClass}
                    >
                      <option value="gastos_administrativos" className="text-black">Gastos Administrativos / Servicios</option>
                      <option value="costos" className="text-black">Costos / Compras Directas</option>
                      <option value="gastos_marketing" className="text-black">Marketing y Publicidad</option>
                      <option value="activos" className="text-black">Activos Fijos</option>
                      <option value="otros" className="text-black">Otros Gastos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">Base Imponible ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={parsedData.baseImponible || 0}
                      onChange={e => setParsedData({ ...parsedData, baseImponible: parseFloat(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">IVA Cobrado ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={parsedData.ivaValor || 0}
                      onChange={e => setParsedData({ ...parsedData, ivaValor: parseFloat(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-2 border-t border-dashed border-white/10 pt-2 flex justify-between items-center">
                    <span className="font-bold text-red-500">Total a Contabilizar:</span>
                    <span className="font-black text-red-500 text-base">${(Number(parsedData.baseImponible || 0) + Number(parsedData.ivaValor || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-[34px] rounded-[var(--radius-button)] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex justify-center items-center gap-1.5 transition-all border-none"
              >
                <Save size={14} />
                <span>Confirmar y Registrar Gasto</span>
              </button>
            </form>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <Sparkles size={32} className="text-gray-400 mb-2 animate-bounce" />
              <p className="text-xs font-semibold">Esperando análisis...</p>
              <p className="text-[10px] text-gray-600 mt-1">Pegue los datos en el recuadro de la izquierda y presione "Analizar Gasto con IA".</p>
            </div>
          )}
        </div>

      </div>

      {/* HISTORIAL RECIENTE GASTOS IA */}
      <div className={`rounded-[10px] border overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
        isDarkMode 
          ? 'border-white/5 bg-[#0f111a]/85 shadow-lg shadow-black/40' 
          : 'border-slate-200/80 bg-white'
      }`}>
        <div className="p-6 pb-2 border-b border-dashed border-white/5 dark:border-white/5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">Últimos Gastos Registrados con IA</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className={`text-[10px] uppercase font-bold tracking-wider ${
              isDarkMode 
                ? 'bg-black/35 text-slate-400 border-b border-white/5' 
                : 'bg-slate-50 text-slate-600 border-b border-slate-100'
            }`}>
              <tr>
                <th className="px-6 py-3.5">Fecha</th>
                <th className="px-6 py-3.5">Proveedor / RUC</th>
                <th className="px-6 py-3.5">Documento</th>
                <th className="px-6 py-3.5">Categoría</th>
                <th className="px-6 py-3.5 text-right">Base</th>
                <th className="px-6 py-3.5 text-right">IVA</th>
                <th className="px-6 py-3.5 text-right">Total</th>
                <th className="px-6 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
              {currentExpenses.map(tx => (
                <tr key={tx.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                  <td className="px-6 py-3.5 text-gray-400 font-medium">{tx.date}</td>
                  <td className="px-6 py-3.5 font-semibold text-black dark:text-white">{tx.description}</td>
                  <td className="px-6 py-3.5 font-mono text-[10px]">{tx.documentNumber}</td>
                  <td className="px-6 py-3.5 capitalize text-gray-500 font-medium">{String(tx.category || '').replace('_', ' ')}</td>
                  <td className="px-6 py-3.5 text-right font-mono">${(Number(tx.baseImponible) || 0).toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono">${(Number(tx.ivaValor) || 0).toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-red-500">${Number(tx.total).toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-center">
                    <button
                      onClick={() => handleDeleteGasto(tx.id)}
                      className="btn-icon bg-red-600 text-white hover:bg-red-700"
                      title="Eliminar gasto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}

              {currentExpenses.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500 italic">No hay gastos ingresados por IA en esta sesión.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
