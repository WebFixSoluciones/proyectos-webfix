import { useState, useEffect } from 'react';
import { Settings, Sparkles, Save, ExternalLink } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';


export default function FinanceSettings({  showToast, db, appId }) {
  const [loading, setLoading] = useState(true);
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
    secuencialGuiaRemision: 1,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, db]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
      // Extraer solo los campos administrados por esta pantalla, evitando sobreescribir la firma digital
      /* eslint-disable no-unused-vars */
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
      /* eslint-enable no-unused-vars */

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

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-card outline-none transition-all border ${
    'bg-white border-gray-200 text-gray-900 focus:border-primary/50'
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
          <div className={`p-6 rounded-card border space-y-4 bg-white border-gray-200`}>
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-gray-100">
              <Sparkles size={18} className="text-primary" />
              <h3 className="text-base font-bold">Entorno SRI e Inteligencia Artificial</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field label-field-dark">Ambiente de Trabajo SRI</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button 
                    type="button" 
                    onClick={() => setSriConfig({...sriConfig, ambiente: '1'})} 
                    className={`py-2.5 text-xs font-bold rounded-card border transition-all ${sriConfig.ambiente === '1' ? 'bg-primary text-white border-primary' : ('bg-gray-100 text-gray-600 border-gray-200')}`}
                  >
                    PRUEBAS
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSriConfig({...sriConfig, ambiente: '2'})} 
                    className={`py-2.5 text-xs font-bold rounded-card border transition-all ${sriConfig.ambiente === '2' ? 'bg-emerald-600 text-white border-emerald-600' : ('bg-gray-100 text-gray-600 border-gray-200')}`}
                  >
                    PRODUCCIÓN
                  </button>
                </div>
              </div>

              <div>
                <label className="label-field label-field-dark">Asistente IA (Gemini OCR & Chat)</label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-card border mt-1 bg-emerald-50/60 border-emerald-200 text-emerald-800">
                  <Sparkles size={15} className="text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold flex-1">Activado por Administración Central</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              El ambiente determina a qué servidor del SRI se envían las facturas. Las herramientas de Inteligencia Artificial (OCR de comprobantes, categorización contable y chat asesor) están habilitadas y gestionadas automáticamente para todos los usuarios.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div>
                <label className="label-field label-field-dark">Establecimiento (Estab.)</label>
                <input
                  type="text"
                  maxLength={3}
                  value={sriConfig.establecimiento || ''}
                  onChange={e => setSriConfig({...sriConfig, establecimiento: e.target.value.replace(/\D/g, '').padStart(0, '0').slice(0, 3)})}
                  onBlur={e => setSriConfig({...sriConfig, establecimiento: (e.target.value || '001').padStart(3, '0')})}
                  className={inputClass}
                  placeholder="001"
                />
              </div>
              <div>
                <label className="label-field label-field-dark">Punto de Emisión (Pto. Emi.)</label>
                <input
                  type="text"
                  maxLength={3}
                  value={sriConfig.puntoEmision || ''}
                  onChange={e => setSriConfig({...sriConfig, puntoEmision: e.target.value.replace(/\D/g, '').slice(0, 3)})}
                  onBlur={e => setSriConfig({...sriConfig, puntoEmision: (e.target.value || '001').padStart(3, '0')})}
                  className={inputClass}
                  placeholder="001"
                />
              </div>
            </div>
          </div>

          {/* VINCULACIÓN SRI ECUADOR */}
          <div className={`p-6 rounded-card border bg-white border-gray-200`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <ExternalLink size={18} className="text-primary" />
              <h3 className="text-base font-bold">Guía de Vinculación con el SRI (Ecuador)</h3>
            </div>
            
            <div className="space-y-4 text-xs leading-normal">
              <p className="text-gray-400 text-xs">
                Siga estos pasos para enlazar su ERP con el Servicio de Rentas Internas:
              </p>
              <ol className="list-decimal pl-4 text-gray-400 space-y-1.5 text-xs">
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

              <div className={`p-3.5 rounded-card border text-xs ${
                sriConfig.ambiente === '2'
                  ? ('bg-emerald-50 border-emerald-250 text-emerald-800')
                  : ('bg-amber-50 border-amber-250 text-amber-800')
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
          
          <div className={`p-6 rounded-card border bg-white border-gray-200`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <Settings size={18} className="text-primary" />
              <h3 className="text-base font-bold">Formatos de Impresión</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Los datos del logo, correo y teléfono que se imprimen en los documentos se configuran en <span className="font-bold">Perfil de Empresa</span>.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-500">Plantilla de Cotización</label>
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
          <div className={`p-6 rounded-card border bg-white border-gray-200`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <Settings size={18} className="text-purple-500" />
              <h3 className="text-base font-bold">Secuenciales de Facturación (SRI)</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Configure el número secuencial para cada tipo de comprobante. El sistema lo incrementará automáticamente tras cada emisión autorizada por el SRI.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-505">Próximo Secuencial de Factura</label>
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
                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-505">Próximo Secuencial de Retención</label>
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
                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-505">Próximo Secuencial de Nota de Crédito</label>
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
                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-500">Próximo Secuencial de Liquidación de Compra</label>
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
                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-500">Próximo Secuencial de Guía de Remisión</label>
                <input
                  type="number"
                  min="1"
                  value={sriConfig.secuencialGuiaRemision || 1}
                  onChange={e => setSriConfig({...sriConfig, secuencialGuiaRemision: parseInt(e.target.value, 10) || 1})}
                  className={inputClass}
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1.5 text-gray-500">Próximo Secuencial de Nota de Venta / Recibo</label>
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
        <button type="submit" className="btn-primary">
          <Save size={16} /> Guardar Configuración
        </button>
      </div>
    </form>
  );
}
