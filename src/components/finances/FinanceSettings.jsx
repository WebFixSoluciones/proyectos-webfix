import React, { useState, useEffect } from 'react';
import { Settings, Shield, Award, Sparkles, Key, Eye, EyeOff, Save, CheckCircle2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function FinanceSettings({ isDarkMode, showToast, db, appId }) {
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [sriConfig, setSriConfig] = useState({
    razonSocial: '',
    nombreComercial: '',
    ruc: '',
    direccionMatriz: '',
    ambiente: '1', // 1 = Pruebas, 2 = Producción
    establecimiento: '001',
    puntoEmision: '001',
    obligadoContabilidad: false,
    contribuyenteTipo: 'rimpe_popular',
    certificadoCargado: false,
    certificadoNombre: '',
    certificadoClave: '',
    certificadoVence: ''
  });
  
  const [geminiKey, setGeminiKey] = useState('');

  // Cargar configuraciones de Firestore
  useEffect(() => {
    async function loadSettings() {
      if (!appId) return;
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSriConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
        
        // Cargar Gemini Key de localStorage
        const savedKey = localStorage.getItem('finances_gemini_api_key') || '';
        setGeminiKey(savedKey);
      } catch (err) {
        console.error("Error al cargar configuraciones", err);
        showToast("Error al cargar configuraciones", "error");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [appId, db]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!sriConfig.razonSocial || !sriConfig.ruc) {
      showToast("Razón Social y RUC son obligatorios para emitir comprobantes", "error");
      return;
    }
    if (sriConfig.ruc.length !== 13) {
      showToast("El RUC del emisor debe tener exactamente 13 dígitos", "error");
      return;
    }

    try {
      // Guardar en Firestore
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
      await setDoc(docRef, sriConfig, { merge: true });

      // Guardar Gemini Key en localStorage
      localStorage.setItem('finances_gemini_api_key', geminiKey.trim());
      
      showToast("Configuraciones fiscales guardadas", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar en la base de datos", "error");
    }
  };

  const handleCertificateUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.p12') && !file.name.endsWith('.pfx')) {
      showToast("El certificado debe ser un archivo .p12 o .pfx", "error");
      return;
    }

    // Configurar vencimiento simulado: 2 años a partir de hoy
    const v = new Date();
    v.setFullYear(v.getFullYear() + 2);
    const venceStr = v.toISOString().split('T')[0];

    setSriConfig(prev => ({
      ...prev,
      certificadoCargado: true,
      certificadoNombre: file.name,
      certificadoVence: venceStr
    }));
    showToast(`Certificado '${file.name}' cargado exitosamente`, "success");
  };

  const removeCertificate = () => {
    setSriConfig(prev => ({
      ...prev,
      certificadoCargado: false,
      certificadoNombre: '',
      certificadoClave: '',
      certificadoVence: ''
    }));
    showToast("Certificado eliminado", "info");
  };

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/20 border-white/10 text-white focus:border-blue-500/50' 
      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500/50'
  }`;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* PARTE 1: DATOS FISCALES EMISOR */}
        <div className={`md:col-span-2 p-6 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
            <Shield size={18} className="text-blue-500" />
            <h3 className="text-base font-bold">Información de Facturación del Emisor</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Razón Social</label>
              <input type="text" value={sriConfig.razonSocial} onChange={e => setSriConfig({...sriConfig, razonSocial: e.target.value})} className={inputClass} placeholder="Ej. Empresa Soluciones Tecnológicas S.A." />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Nombre Comercial</label>
              <input type="text" value={sriConfig.nombreComercial} onChange={e => setSriConfig({...sriConfig, nombreComercial: e.target.value})} className={inputClass} placeholder="Ej. WebFix Soluciones" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">RUC Emisor (13 dígitos)</label>
              <input type="text" maxLength={13} value={sriConfig.ruc} onChange={e => setSriConfig({...sriConfig, ruc: e.target.value})} className={inputClass} placeholder="1790000000001" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Dirección Matriz</label>
              <input type="text" value={sriConfig.direccionMatriz} onChange={e => setSriConfig({...sriConfig, direccionMatriz: e.target.value})} className={inputClass} placeholder="Av. Amazonas y Patria, Quito, Ecuador" />
            </div>

            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Establecimiento</label>
                <input type="text" maxLength={3} value={sriConfig.establecimiento} onChange={e => setSriConfig({...sriConfig, establecimiento: e.target.value.padStart(3, '0')})} className={inputClass} placeholder="001" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Punto Emisión</label>
                <input type="text" maxLength={3} value={sriConfig.puntoEmision} onChange={e => setSriConfig({...sriConfig, puntoEmision: e.target.value.padStart(3, '0')})} className={inputClass} placeholder="001" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Régimen Contribuyente</label>
                <select value={sriConfig.contribuyenteTipo} onChange={e => setSriConfig({...sriConfig, contribuyenteTipo: e.target.value})} className={inputClass}>
                  <option value="general" className="text-black">Régimen General</option>
                  <option value="rimpe_popular" className="text-black">RIMPE Popular</option>
                  <option value="rimpe_emprendedor" className="text-black">RIMPE Emprendedor</option>
                  <option value="microempresas" className="text-black">Microempresas</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2 flex items-center gap-2 py-2">
              <input type="checkbox" id="obligado" checked={sriConfig.obligadoContabilidad} onChange={e => setSriConfig({...sriConfig, obligadoContabilidad: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-transparent border-gray-300" />
              <label htmlFor="obligado" className="text-xs font-semibold text-gray-400 cursor-pointer">Obligado a llevar contabilidad</label>
            </div>
          </div>
        </div>

        {/* PARTE 2: CONFIGURACIÓN INTEGRACIÓN (GEMINI / CERTIFICADO) */}
        <div className="space-y-6">
          
          {/* FIRMA ELECTRÓNICA */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <Award size={18} className="text-emerald-500" />
              <h3 className="text-base font-bold">Firma Electrónica</h3>
            </div>
            
            {sriConfig.certificadoCargado ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold truncate">{sriConfig.certificadoNombre}</p>
                    <p className="text-[10px] opacity-85">Expira: {sriConfig.certificadoVence}</p>
                  </div>
                  <button type="button" onClick={removeCertificate} className="text-xs font-bold text-red-500 hover:underline">Remover</button>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">Contraseña Firma</label>
                  <input type="password" value={sriConfig.certificadoClave} onChange={e => setSriConfig({...sriConfig, certificadoClave: e.target.value})} className={inputClass} placeholder="Contraseña de firma (.p12)" />
                </div>
              </div>
            ) : (
              <div>
                <label className={`w-full flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed cursor-pointer transition-colors ${isDarkMode ? 'border-white/20 hover:bg-white/5 text-gray-400' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}>
                  <input type="file" accept=".p12,.pfx" className="hidden" onChange={handleCertificateUpload} />
                  <Award size={20} className="text-gray-500" />
                  <span className="text-xs font-semibold">Subir Archivo de Firma (.p12 / .pfx)</span>
                </label>
                <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">El certificado digital se mantiene en el ámbito de tu navegador para firmar los comprobantes en tiempo real.</p>
              </div>
            )}
          </div>

          {/* GEMINI AI KEY */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <Sparkles size={18} className="text-purple-500" />
              <h3 className="text-base font-bold">Inteligencia Artificial</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">Ambiente de Trabajo SRI</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button type="button" onClick={() => setSriConfig({...sriConfig, ambiente: '1'})} className={`py-2 text-xs font-bold rounded-xl border transition-all ${sriConfig.ambiente === '1' ? 'bg-blue-600 text-white border-blue-600' : (isDarkMode ? 'bg-black/25 text-gray-400 border-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 border-gray-200')}`}>PRUEBAS</button>
                  <button type="button" onClick={() => setSriConfig({...sriConfig, ambiente: '2'})} className={`py-2 text-xs font-bold rounded-xl border transition-all ${sriConfig.ambiente === '2' ? 'bg-emerald-600 text-white border-emerald-600' : (isDarkMode ? 'bg-black/25 text-gray-400 border-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 border-gray-200')}`}>PRODUCCIÓN</button>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">Google Gemini API Key</label>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                  <Key size={14} className="text-gray-500" />
                  <input type={showKey ? "text" : "password"} value={geminiKey} onChange={e => setGeminiKey(e.target.value)} className="bg-transparent border-none outline-none text-xs w-full py-1 text-white" placeholder="AIzaSy..." />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="text-gray-500 hover:text-gray-300">
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[9px] text-gray-500 mt-2 leading-relaxed">Necesaria para la extracción de datos de gastos (OCR) y respuestas del chat contable. Consíguela gratis en Google AI Studio.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-md hover:-translate-y-0.5">
          <Save size={16} /> Guardar Cambios de Configuración
        </button>
      </div>
    </form>
  );
}
