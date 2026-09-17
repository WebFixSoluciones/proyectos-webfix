import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiLabel, UiText } from '../ui/layout';
import { UiButton, UiInput, UiSelect } from '../ui/controls';
import { useState, useEffect } from 'react';
import { Settings, Sparkles, Save, ExternalLink } from 'lucide-react';
import { doc, getDoc, setDoc } from '../../services/financeStore.js';


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

  

  if (loading) {
    return (
      <UiBox {...{"className":"flex justify-center items-center h-64"}}>
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)"},"className":"animate-spin h-8 w-8"}}></UiBox>
      </UiBox>
    );
  }  return (
    <form onSubmit={handleSave} {...{"className":"space-y-6 animate-in slide-in-from-bottom-4 duration-500"}}>
      <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6"}}>
        
        {/* COLUMNA IZQUIERDA Y CENTRAL: AMBIENTES Y VINCULACIÓN SRI */}
        <UiBox {...{"className":"md:col-span-2 space-y-6"}}>
          
          {/* CONFIGURACIÓN AMBIENTE Y GEMINI */}
          <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6 space-y-4"})}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-2 pb-3"}}>
              <Sparkles size={18} {...{"style":{"color":"var(--blue-12)"}}} />
              <UiHeading as="h3" {...{"size":"3","weight":"bold"}}>Entorno SRI e Inteligencia Artificial</UiHeading>
            </UiBox>
            
            <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 gap-4"}}>
              <UiBox>
                <UiLabel {...{}}>Ambiente de Trabajo SRI</UiLabel>
                <UiBox {...{"className":"grid grid-cols-2 gap-2 mt-1"}}>
                  <UiButton
                    type="button" 
                    onClick={() => setSriConfig({...sriConfig, ambiente: '1'})} 
                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (sriConfig.ambiente === '1' ? {"variant":"solid","color":"blue"} : {"variant":"soft","color":"gray"}))}
                  >
                    PRUEBAS
                  </UiButton>
                  <UiButton
                    type="button" 
                    onClick={() => setSriConfig({...sriConfig, ambiente: '2'})} 
                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (sriConfig.ambiente === '2' ? {"variant":"solid","color":"green"} : {"variant":"soft","color":"gray"}))}
                  >
                    PRODUCCIÓN
                  </UiButton>
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...{}}>Asistente IA (Gemini OCR & Chat)</UiLabel>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--green-3)","color":"var(--green-12)"},"className":"flex items-center gap-2 px-3.5 py-2.5 mt-1"}}>
                  <Sparkles size={15} {...{"style":{"color":"var(--green-11)"},"className":"shrink-0"}} />
                  <UiText {...{"size":"1","weight":"bold","className":"flex-1"}}>Activado por Administración Central</UiText>
                  <UiText {...{"className":"w-2 h-2 animate-pulse"}}></UiText>
                </UiBox>
              </UiBox>
            </UiBox>
            <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
              El ambiente determina a qué servidor del SRI se envían las facturas. Las herramientas de Inteligencia Artificial (OCR de comprobantes, categorización contable y chat asesor) están habilitadas y gestionadas automáticamente para todos los usuarios.
            </UiText>

            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"}}>
              <UiBox>
                <UiLabel {...{}}>Establecimiento (Estab.)</UiLabel>
                <UiInput
                  type="text"
                  maxLength={3}
                  value={sriConfig.establecimiento || ''}
                  onChange={e => setSriConfig({...sriConfig, establecimiento: e.target.value.replace(/\D/g, '').padStart(0, '0').slice(0, 3)})}
                  onBlur={e => setSriConfig({...sriConfig, establecimiento: (e.target.value || '001').padStart(3, '0')})}
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                  placeholder="001"
                />
              </UiBox>
              <UiBox>
                <UiLabel {...{}}>Punto de Emisión (Pto. Emi.)</UiLabel>
                <UiInput
                  type="text"
                  maxLength={3}
                  value={sriConfig.puntoEmision || ''}
                  onChange={e => setSriConfig({...sriConfig, puntoEmision: e.target.value.replace(/\D/g, '').slice(0, 3)})}
                  onBlur={e => setSriConfig({...sriConfig, puntoEmision: (e.target.value || '001').padStart(3, '0')})}
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                  placeholder="001"
                />
              </UiBox>
            </UiBox>
          </UiCard>

          {/* VINCULACIÓN SRI ECUADOR */}
          <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"})}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-4 pb-2"}}>
              <ExternalLink size={18} {...{"style":{"color":"var(--blue-12)"}}} />
              <UiHeading as="h3" {...{"size":"3","weight":"bold"}}>Guía de Vinculación con el SRI (Ecuador)</UiHeading>
            </UiBox>
            
            <UiBox {...{"className":"space-y-4 leading-normal"}}>
              <UiText as="p" {...{"color":"gray","size":"1"}}>
                Siga estos pasos para enlazar su ERP con el Servicio de Rentas Internas:
              </UiText>
              <ol {...{"style":{"color":"var(--gray-11)"},"className":"list-decimal pl-4 space-y-1.5"}}>
                <li>
                  Ingrese a <a href="https://srienlinea.sri.gob.ec" target="_blank" rel="noreferrer" {...{"style":{"color":"var(--blue-12)"},"className":"hover:underline inline-flex items-center gap-0.5"}}>SRI en Línea <ExternalLink size={8} /></a> con su RUC y clave.
                </li>
                <li>
                  Vaya a <strong>Facturación Electrónica</strong> &gt; <strong>Pruebas</strong> o <strong>Producción</strong> &gt; <strong>Autorización</strong> para habilitar su emisión.
                </li>
                <li>
                  Asegúrese de cargar su firma electrónica vigente <code>.p12</code> y escribir la contraseña en la sección de Ajustes del ERP &gt; Perfil de Empresa.
                </li>
              </ol>

              <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-3.5"}, {}, (sriConfig.ambiente === '2' ? {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-12)"}} : {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-12)"}}))}>
                <UiText as="p" {...{"weight":"bold","className":"mb-1"}}>Endpoints SRI Configurados ({sriConfig.ambiente === '2' ? 'Producción' : 'Pruebas'}):</UiText>
                <UiBox {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"space-y-0.5 opacity-90"}}>
                  <UiText as="p" {...{"className":"truncate"}}>Recepción: {sriConfig.ambiente === '2' ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl' : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl'}</UiText>
                  <UiText as="p" {...{"className":"truncate"}}>Autorización: {sriConfig.ambiente === '2' ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl' : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'}</UiText>
                </UiBox>
              </UiBox>
            </UiBox>
          </UiCard>

        </UiBox>

        {/* COLUMNA DERECHA: DATOS COMERCIALES */}
        <UiBox {...{"className":"space-y-6"}}>
          
          <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"})}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-4 pb-2"}}>
              <Settings size={18} {...{"style":{"color":"var(--blue-12)"}}} />
              <UiHeading as="h3" {...{"size":"3","weight":"bold"}}>Formatos de Impresión</UiHeading>
            </UiBox>

            <UiBox {...{"className":"space-y-4"}}>
              <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                Los datos del logo, correo y teléfono que se imprimen en los documentos se configuran en <UiText {...{"weight":"bold"}}>Perfil de Empresa</UiText>.
              </UiText>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Plantilla de Cotización</UiLabel>
                <UiSelect
                  value={sriConfig.cotizacionFormActivo || sriConfig.cotizacionFormatoActivo || 'basico'}
                  onChange={e => setSriConfig({...sriConfig, cotizacionFormatoActivo: e.target.value, cotizacionFormActivo: e.target.value})}
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                >
                  <option value="basico" {...{"style":{"color":"var(--gray-12)"}}}>Plantilla Clásica (PDF)</option>
                  <option value="premium" {...{"style":{"color":"var(--gray-12)"}}}>Plantilla Moderna (Flat/Premium)</option>
                </UiSelect>
              </UiBox>
            </UiBox>
          </UiCard>

          {/* SECUENCIALES DE COMPROBANTES */}
          <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"})}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-4 pb-2"}}>
              <Settings size={18} {...{"style":{"color":"var(--purple-11)"}}} />
              <UiHeading as="h3" {...{"size":"3","weight":"bold"}}>Secuenciales de Facturación (SRI)</UiHeading>
            </UiBox>
            <UiText as="p" {...{"size":"1","color":"gray","className":"mb-4 leading-relaxed"}}>
              Configure el número secuencial para cada tipo de comprobante. El sistema lo incrementará automáticamente tras cada emisión autorizada por el SRI.
            </UiText>
            
            <UiBox {...{"className":"space-y-4"}}>
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Próximo Secuencial de Factura</UiLabel>
                <UiInput
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialFactura || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialFactura: parseInt(e.target.value, 10) || 1})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  placeholder="1" 
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Próximo Secuencial de Retención</UiLabel>
                <UiInput
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialRetencion || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialRetencion: parseInt(e.target.value, 10) || 1})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  placeholder="1" 
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Próximo Secuencial de Nota de Crédito</UiLabel>
                <UiInput
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialNotaCredito || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialNotaCredito: parseInt(e.target.value, 10) || 1})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  placeholder="1" 
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Próximo Secuencial de Liquidación de Compra</UiLabel>
                <UiInput
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialLiquidacion || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialLiquidacion: parseInt(e.target.value, 10) || 1})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  placeholder="1" 
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Próximo Secuencial de Guía de Remisión</UiLabel>
                <UiInput
                  type="number"
                  min="1"
                  value={sriConfig.secuencialGuiaRemision || 1}
                  onChange={e => setSriConfig({...sriConfig, secuencialGuiaRemision: parseInt(e.target.value, 10) || 1})}
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                  placeholder="1"
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Próximo Secuencial de Nota de Venta / Recibo</UiLabel>
                <UiInput
                  type="number" 
                  min="1"
                  value={sriConfig.secuencialNotaVenta || 1} 
                  onChange={e => setSriConfig({...sriConfig, secuencialNotaVenta: parseInt(e.target.value, 10) || 1})} 
                  {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                  placeholder="1" 
                />
              </UiBox>
            </UiBox>
          </UiCard>

        </UiBox>

      </UiBox>

      <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-3 pt-4"}}>
        <UiButton type="submit" {...{"variant":"solid","color":"blue"}}>
          <Save size={16} /> Guardar Configuración
        </UiButton>
      </UiBox>
    </form>
  );
}
