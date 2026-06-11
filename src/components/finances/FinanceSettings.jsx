import React, { useState, useEffect } from 'react';
import { Settings, Shield, Award, Sparkles, Key, Eye, EyeOff, Save, CheckCircle2, UploadCloud, Trash2, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import forge from 'node-forge';

export default function FinanceSettings({ isDarkMode, showToast, db, storage, appId }) {
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
    certificadoVence: '',
    logoUrl: '',
    correoContacto: '',
    telefonoContacto: '',
    cotizacionFormatoActivo: 'basico',
    rucActivo: true,
    rucEstado: 'ACTIVO',
    rucRegimen: 'RIMPE Emprendedor',
    sucursales: [
      { codigo: '001', nombre: 'Casa Matriz', direccion: 'Av. Amazonas y Patria, Quito', activa: true, bodegas: ['Bodega Central'] }
    ],
    bodegas: ['Bodega Central'],
    agenteRetencion: false,
    agenteResolucion: '',
    contribuyenteEspecial: false,
    especialResolucion: '',
    secuencialFactura: 1,
    secuencialRetencion: 1,
    secuencialNotaCredito: 1,
    secuencialLiquidacion: 1,
    secuencialNotaVenta: 1
  });
  
  const [geminiKey, setGeminiKey] = useState('');

  // Cargar configuraciones de Firestore
  useEffect(() => {
    async function loadSettings() {
      if (!appId) return;
      try {
        let loadedConfig = {};
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          loadedConfig = docSnap.data();
          setSriConfig(prev => ({ ...prev, ...loadedConfig }));
        }
        
        // Cargar Gemini Key de localStorage con fallback a Firestore de meta/info
        let savedKey = localStorage.getItem('finances_gemini_api_key') || '';
        
        const infoRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
        const infoSnap = await getDoc(infoRef);
        if (infoSnap.exists()) {
          const infoData = infoSnap.data();
          if (infoData.geminiApiKey && !savedKey) {
            savedKey = infoData.geminiApiKey;
            localStorage.setItem('finances_gemini_api_key', savedKey);
          }
        }
        
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
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
      // Extraer solo los campos administrados por esta pantalla, evitando sobreescribir la firma digital
      const {
        certificadoCargado,
        certificadoNombre,
        certificadoClave,
        certificadoVence,
        certificadoBase64,
        certificadoRuc,
        certificadoSujeto,
        ...sriConfigRest
      } = sriConfig;

      await setDoc(docRef, sriConfigRest, { merge: true });

      // Guardar Gemini Key en localStorage
      const trimmedKey = geminiKey.trim();
      localStorage.setItem('finances_gemini_api_key', trimmedKey);
      
      // Guardar Gemini Key en Firestore meta/info para sincronización cloud
      if (trimmedKey) {
        const infoRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
        await setDoc(infoRef, { geminiApiKey: trimmedKey }, { merge: true });
      }
      
      showToast("Configuraciones fiscales y comerciales guardadas", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar en la base de datos", "error");
    }
  };

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/20 border-white/10 text-white focus:border-primary/50' 
      : 'bg-white border-gray-200 text-gray-900 focus:border-primary/50'
  }`;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA Y CENTRAL: AMBIENTES Y VINCULACIÓN SRI */}
        <div className="md:col-span-2 space-y-6">
          
          {/* CONFIGURACIÓN AMBIENTE Y GEMINI */}
          <div className={`p-6 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-white/10">
              <Sparkles size={18} className="text-purple-500" />
              <h3 className="text-base font-bold">Integraciones y Entornos</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">Ambiente de Trabajo SRI</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button 
                    type="button" 
                    onClick={() => setSriConfig({...sriConfig, ambiente: '1'})} 
                    className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${sriConfig.ambiente === '1' ? 'bg-primary text-white border-primary' : (isDarkMode ? 'bg-black/25 text-gray-400 border-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 border-gray-200')}`}
                  >
                    PRUEBAS
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSriConfig({...sriConfig, ambiente: '2'})} 
                    className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${sriConfig.ambiente === '2' ? 'bg-emerald-600 text-white border-emerald-600' : (isDarkMode ? 'bg-black/25 text-gray-400 border-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 border-gray-200')}`}
                  >
                    PRODUCCIÓN
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">Google Gemini API Key</label>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mt-1 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                  <Key size={14} className="text-gray-500" />
                  <input 
                    type={showKey ? "text" : "password"} 
                    value={geminiKey} 
                    onChange={e => setGeminiKey(e.target.value)} 
                    className="bg-transparent border-none outline-none text-xs w-full py-1 text-white font-medium" 
                    placeholder="AIzaSy..." 
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="text-gray-500 hover:text-gray-300">
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-gray-500 leading-relaxed">
              El ambiente determina a qué servidor del SRI se envían las facturas. La clave de Gemini habilita la categorización inteligente de facturas y OCR de compras.
            </p>
          </div>

          {/* VINCULACIÓN SRI ECUADOR */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <ExternalLink size={18} className="text-primary" />
              <h3 className="text-base font-bold">Guía de Vinculación con el SRI (Ecuador)</h3>
            </div>
            
            <div className="space-y-4 text-xs leading-normal">
              <p className="text-gray-400 text-[10px]">
                Siga estos pasos para enlazar su ERP con el Servicio de Rentas Internas:
              </p>
              <ol className="list-decimal pl-4 text-gray-400 space-y-1.5 text-[10px]">
                <li>
                  Ingrese a <a href="https://srienlinea.sri.gob.ec" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold inline-flex items-center gap-0.5">SRI en Línea <ExternalLink size={8} /></a> con su RUC y clave.
                </li>
                <li>
                  Vaya a <strong>Facturación Electrónica</strong> &gt; <strong>Pruebas</strong> o <strong>Producción</strong> &gt; <strong>Autorización</strong> para habilitar su emisión.
                </li>
                <li>
                  Asegúrese de cargar su firma electrónica vigente <code>.p12</code> y escribir la contraseña en la sección de Ajustes del ERP &gt; Perfil de Empresa.
                </li>
              </ol>

              <div className={`p-3.5 rounded-xl border text-[9px] ${
                sriConfig.ambiente === '2'
                  ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450' : 'bg-emerald-50 border-emerald-250 text-emerald-800')
                  : (isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-450' : 'bg-amber-50 border-amber-250 text-amber-800')
              }`}>
                <p className="font-bold uppercase tracking-wider mb-1">Endpoints SRI Configurados ({sriConfig.ambiente === '2' ? 'Producción' : 'Pruebas'}):</p>
                <div className="font-mono space-y-0.5 opacity-90">
                  <p className="truncate">Recepción: {sriConfig.ambiente === '2' ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl' : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl'}</p>
                  <p className="truncate">Autorización: {sriConfig.ambiente === '2' ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl' : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: DATOS COMERCIALES */}
        <div className="space-y-6">
          
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <Settings size={18} className="text-primary" />
              <h3 className="text-base font-bold">Datos Comerciales / Proformas</h3>
            </div>
            
            <div className="space-y-4">
              
              {/* Previsualización del Logo configurado */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-black/10">
                <label className="block text-[9px] font-bold uppercase mb-2 text-gray-500 text-center">Logotipo Oficial (Lectura)</label>
                {sriConfig.logoUrl ? (
                  <div className="w-20 h-20 flex items-center justify-center bg-white rounded-lg p-1.5 shadow-sm border border-gray-100">
                    <img src={sriConfig.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <p className="text-[9px] text-gray-550 italic text-center">No se ha cargado logotipo todavía.</p>
                )}
                <span className="text-[8px] text-gray-550 text-center mt-2.5 leading-normal">
                  Configure/cambie el logotipo desde <span className="font-bold">Ajustes de ERP &gt; Perfil de Empresa</span>.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Correo de Contacto (Proformas/Documentos)</label>
                <input 
                  type="email" 
                  value={sriConfig.correoContacto || ''} 
                  onChange={e => setSriConfig({...sriConfig, correoContacto: e.target.value})} 
                  className={inputClass} 
                  placeholder="ventas@empresa.com" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Teléfono de Contacto (Proformas/Documentos)</label>
                <input 
                  type="text" 
                  value={sriConfig.telefonoContacto || ''} 
                  onChange={e => setSriConfig({...sriConfig, telefonoContacto: e.target.value})} 
                  className={inputClass} 
                  placeholder="0998765432" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Plantilla de Cotización</label>
                <select 
                  value={sriConfig.cotizacionFormActivo || sriConfig.cotizacionFormatoActivo || 'basico'} 
                  onChange={e => setSriConfig({...sriConfig, cotizacionFormatoActivo: e.target.value, cotizacionFormActivo: e.target.value})} 
                  className={inputClass}
                >
                  <option value="basico" className="text-black">Plantilla Clásica (PDF)</option>
                  <option value="premium" className="text-black">Plantilla Moderna (Flat/Premium)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECUENCIALES DE COMPROBANTES */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <Settings size={18} className="text-purple-500" />
              <h3 className="text-base font-bold">Secuenciales de Facturación (SRI)</h3>
            </div>
            <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">
              Configure el número secuencial para cada tipo de comprobante. El sistema lo incrementará automáticamente tras cada emisión autorizada por el SRI.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-505">Próximo Secuencial de Factura</label>
                <input 
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialFactura || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialFactura: parseInt(e.target.value, 10) || 1})} 
                  className={inputClass} 
                  placeholder="1" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-505">Próximo Secuencial de Retención</label>
                <input 
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialRetencion || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialRetencion: parseInt(e.target.value, 10) || 1})} 
                  className={inputClass} 
                  placeholder="1" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-505">Próximo Secuencial de Nota de Crédito</label>
                <input 
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialNotaCredito || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialNotaCredito: parseInt(e.target.value, 10) || 1})} 
                  className={inputClass} 
                  placeholder="1" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Próximo Secuencial de Liquidación de Compra</label>
                <input 
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialLiquidacion || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialLiquidacion: parseInt(e.target.value, 10) || 1})} 
                  className={inputClass} 
                  placeholder="1" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Próximo Secuencial de Nota de Venta / Recibo</label>
                <input 
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialNotaVenta || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialNotaVenta: parseInt(e.target.value, 10) || 1})} 
                  className={inputClass} 
                  placeholder="1" 
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary transition-all shadow-md hover:-translate-y-0.5 active:scale-95">
          <Save size={16} /> Guardar Configuración
        </button>
      </div>
    </form>
  );
}
