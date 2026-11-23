import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiLabel, UiText } from '../ui/layout';
import { UiButton, UiInput, UiSelect } from '../ui/controls';
import { useState, useEffect } from 'react';
import { Settings, Sparkles, Save, ExternalLink, ShieldCheck, Plus, Trash2, Lock } from 'lucide-react';
import { doc, getDoc, setDoc } from '../../services/financeStore.js';
import confirmAction from '../../services/confirmDialog';
import {
  normalizeEmissionPoints,
  validateEmissionPointInput,
  validateSequentialChange
} from '../../modules/sri/domain/emissionPoints.js';


export default function FinanceSettings({  showToast, db, appId }) {
  const [loading, setLoading] = useState(true);
  const [newPoint, setNewPoint] = useState({ estab: '001', ptoEmi: '002', label: '', branchName: 'Matriz' });
  const [savingSeqKey, setSavingSeqKey] = useState('');
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
      const pad3 = (v) => {
        const d = String(v || '').replace(/\D/g, '').padStart(3, '0').slice(-3);
        return d === '000' ? '' : d;
      };
      const cleanEstab = pad3(sriConfig.establecimiento);
      const cleanPto = pad3(sriConfig.puntoEmision);
      if (!cleanEstab || !cleanPto) {
        showToast('Establecimiento y Punto de Emisión deben ser 3 dígitos distintos de 000 (ej. 001-001).', 'error');
        return;
      }

      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
      // Extraer solo campos de configuración general: NUNCA sobreescribir certificados .p12 ni secuenciales activos en vivo
      /* eslint-disable no-unused-vars */
      const {
        certificadoCargado,
        certificadoNombre,
        certificadoClave,
        certificadoVence,
        certificadoBase64,
        certificadoRuc,
        certificadoSujeto,
        secuencialFactura,
        secuencialNotaCredito,
        secuencialNotaDebito,
        secuencialRetencion,
        secuencialGuiaRemision,
        secuencialLiquidacion,
        secuencialNotaVenta,
        ...sriConfigRest
      } = sriConfig;
      /* eslint-enable no-unused-vars */

      const sanitizedPayload = {
        ...sriConfigRest,
        establecimiento: cleanEstab,
        puntoEmision: cleanPto
      };

      await setDoc(docRef, sanitizedPayload, { merge: true });
      setSriConfig(prev => ({ ...prev, establecimiento: cleanEstab, puntoEmision: cleanPto }));

      // Guardar Gemini Key en localStorage
      const trimmedKey = geminiKey.trim();
      localStorage.setItem('finances_gemini_api_key', trimmedKey);
      
      // Guardar Gemini Key en Firestore meta/info para sincronización cloud
      if (trimmedKey) {
        const infoRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
        await setDoc(infoRef, { geminiApiKey: trimmedKey }, { merge: true });
      }
      
      showToast("Configuraciones fiscales y comerciales guardadas (secuenciales protegidos)", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar en la base de datos", "error");
    }
  };

  

  const emissionPoints = normalizeEmissionPoints(sriConfig);

  const handleEnvironmentSwitch = async (targetEnv) => {
    if (sriConfig.ambiente === targetEnv) return;
    const msg = targetEnv === '2'
      ? '¿Cambiar al ambiente de PRODUCCIÓN SRI? Los comprobantes emitidos tendrán validez tributaria oficial ante el SRI.'
      : '¿Cambiar al ambiente de PRUEBAS SRI? Los comprobantes emitidos serán únicamente de prueba sin validez fiscal.';
    if (await confirmAction(msg)) {
      setSriConfig(prev => ({ ...prev, ambiente: targetEnv }));
    }
  };

  const handleAddEmissionPoint = async () => {
    const estab = String(newPoint.estab || '').replace(/\D/g, '').padStart(3, '0').slice(-3);
    const ptoEmi = String(newPoint.ptoEmi || '').replace(/\D/g, '').padStart(3, '0').slice(-3);
    const check = validateEmissionPointInput({ estab, ptoEmi, existingPoints: emissionPoints });
    if (!check.valid) {
      showToast?.(check.message, 'error');
      return;
    }
    const created = {
      id: `ep_${estab}_${ptoEmi}_${Date.now()}`,
      estab,
      ptoEmi,
      label: newPoint.label.trim() || `Punto ${estab}-${ptoEmi}`,
      branchName: newPoint.branchName.trim() || 'Matriz',
      active: true,
      locked: false,
      isDefault: false
    };
    const nextList = [...emissionPoints, created];
    setSriConfig(prev => ({ ...prev, puntosEmision: nextList }));
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config'), { puntosEmision: nextList }, { merge: true });
      setNewPoint({ estab, ptoEmi: String(Number(ptoEmi) + 1).padStart(3, '0'), label: '', branchName: 'Matriz' });
      showToast?.(`Punto de emisión ${estab}-${ptoEmi} registrado y asegurado.`, 'success');
    } catch {
      showToast?.('No se pudo guardar el punto de emisión.', 'error');
    }
  };

  const handleRemoveEmissionPoint = async (epId) => {
    const target = emissionPoints.find(p => p.id === epId);
    if (!target || target.isDefault) return;
    const nextList = emissionPoints.filter(p => p.id !== epId);
    setSriConfig(prev => ({ ...prev, puntosEmision: nextList }));
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config'), { puntosEmision: nextList }, { merge: true });
      showToast?.(`Punto de emisión ${target.estab}-${target.ptoEmi} eliminado.`, 'success');
    } catch {
      showToast?.('Error al eliminar punto de emisión.', 'error');
    }
  };

  const handleUpdateSequentialSafe = async (secKey, label) => {
    setSavingSeqKey(secKey);
    try {
      const proposedNext = Number.parseInt(sriConfig[secKey], 10);
      const estab = String(sriConfig.establecimiento || '001').replace(/\D/g, '').padStart(3, '0').slice(-3);
      const pto = String(sriConfig.puntoEmision || '001').replace(/\D/g, '').padStart(3, '0').slice(-3);
      const scope = `${sriConfig.ruc}_${sriConfig.ambiente}_${secKey}_${estab}_${pto}`;
      const counterRef = doc(db, 'artifacts', appId, 'public', 'data', 'sri_sequences', scope);
      const counterSnap = await getDoc(counterRef);
      const currentFloor = Number(counterSnap.exists() ? counterSnap.data()?.next : 1) || 1;

      const check = validateSequentialChange({ currentFloor, proposedNext });
      if (!check.valid) {
        showToast?.(check.message, 'error');
        return;
      }
      if (check.warning && !(await confirmAction(check.warning))) {
        return;
      }
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config'), { [secKey]: proposedNext }, { merge: true });
      if (secKey !== 'secuencialNotaVenta' && sriConfig.ruc) {
        await setDoc(counterRef, { next: proposedNext, estab, ptoEmi: pto, ambiente: String(sriConfig.ambiente), updatedAt: new Date().toISOString() }, { merge: true });
      }
      showToast?.(`Secuencial de ${label} actualizado con seguridad a ${String(proposedNext).padStart(9, '0')}.`, 'success');
    } catch (err) {
      showToast?.(`No se pudo actualizar el secuencial: ${err.message}`, 'error');
    } finally {
      setSavingSeqKey('');
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
                    onClick={() => handleEnvironmentSwitch('1')} 
                    {...mergeThemeProps({"size":"2","variant":"outline"}, {}, (sriConfig.ambiente === '1' ? {"variant":"solid","color":"blue"} : {"variant":"soft","color":"gray"}))}
                  >
                    PRUEBAS
                  </UiButton>
                  <UiButton
                    type="button" 
                    onClick={() => handleEnvironmentSwitch('2')} 
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
            {/* PUNTOS DE EMISIÓN MÚLTIPLES ASEGURADOS */}
            <div className="pt-4 mt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ShieldCheck size={15} className="text-emerald-700" />
                  <span>Puntos de Emisión Autorizados ({emissionPoints.length})</span>
                </div>
                <span className="text-[11px] text-slate-500">Asignables por usuario en Ajustes &gt; Usuarios y Roles</span>
              </div>

              <div className="space-y-1.5">
                {emissionPoints.map((ep) => (
                  <div key={ep.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-900">
                        {ep.estab}-{ep.ptoEmi}
                      </span>
                      <span className="font-semibold text-slate-800">{ep.label}</span>
                      <span className="text-[11px] text-slate-500">({ep.branchName})</span>
                      {ep.isDefault && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Principal</span>
                      )}
                      {ep.locked && <Lock size={12} className="text-amber-700" />}
                    </div>
                    {!ep.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmissionPoint(ep.id)}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Eliminar punto de emisión"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Estab.</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={newPoint.estab}
                    onChange={(e) => setNewPoint(p => ({ ...p, estab: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    placeholder="001"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pto. Emi.</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={newPoint.ptoEmi}
                    onChange={(e) => setNewPoint(p => ({ ...p, ptoEmi: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    placeholder="002"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono bg-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre / Caja</label>
                  <input
                    type="text"
                    value={newPoint.label}
                    onChange={(e) => setNewPoint(p => ({ ...p, label: e.target.value }))}
                    placeholder="Ej. Caja POS Sucursal Sur"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddEmissionPoint}
                    className="w-full h-9 px-3 rounded-lg bg-[#1b1b1b] hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Añadir Punto</span>
                  </button>
                </div>
              </div>
            </div>
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
              Los secuenciales activos están protegidos contra retrocesos accidentales. Usa el botón <strong>Aplicar</strong> en cada comprobante si necesitas adelantar una numeración (p. ej. migración desde otro facturador).
            </UiText>
            
            <UiBox {...{"className":"space-y-3"}}>
              {[
                { key: 'secuencialFactura', label: 'Factura (01)' },
                { key: 'secuencialRetencion', label: 'Retención (07)' },
                { key: 'secuencialNotaCredito', label: 'Nota de Crédito (04)' },
                { key: 'secuencialNotaDebito', label: 'Nota de Débito (05)' },
                { key: 'secuencialLiquidacion', label: 'Liquidación de Compra (03)' },
                { key: 'secuencialGuiaRemision', label: 'Guía de Remisión (06)' },
                { key: 'secuencialNotaVenta', label: 'Nota de Venta / Recibo' }
              ].map((seq) => (
                <UiBox key={seq.key}>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1"}}>Próximo Secuencial — {seq.label}</UiLabel>
                  <div className="flex items-center gap-2">
                    <UiInput
                      type="number"
                      min="1"
                      value={sriConfig[seq.key] || 1}
                      onChange={e => setSriConfig({ ...sriConfig, [seq.key]: parseInt(e.target.value, 10) || 1 })}
                      {...mergeThemeProps({"size":"2","className":"flex-1 font-mono"}, {}, {"color":"gray"})}
                      placeholder="1"
                    />
                    <button
                      type="button"
                      disabled={savingSeqKey === seq.key}
                      onClick={() => handleUpdateSequentialSafe(seq.key, seq.label)}
                      className="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {savingSeqKey === seq.key ? '...' : 'Aplicar'}
                    </button>
                  </div>
                </UiBox>
              ))}
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
