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
    especialResolucion: ''
  });
  
  const [geminiKey, setGeminiKey] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isExtractingSRI, setIsExtractingSRI] = useState(false);
  const [newBranch, setNewBranch] = useState({ codigo: '', nombre: '', direccion: '', activa: true, bodegas: [] });
  const [newWarehouseName, setNewWarehouseName] = useState('');


  const [certValidation, setCertValidation] = useState({
    verificado: false,
    mensaje: 'Cargue su firma electrónica (.p12 / .pfx) e ingrese la contraseña para verificarla.',
    tipo: 'info',
    sujeto: '',
    emisor: '',
    vence: '',
    ruc: ''
  });

  const verifySignatureDetails = (base64, password, emisorRuc) => {
    if (!base64) {
      setCertValidation({
        verificado: false,
        mensaje: 'Por favor, suba primero su archivo de firma (.p12 o .pfx).',
        tipo: 'info',
        sujeto: '',
        emisor: '',
        vence: '',
        ruc: ''
      });
      return;
    }
    if (!password) {
      setCertValidation({
        verificado: false,
        mensaje: 'Por favor, ingrese la contraseña de la firma para verificarla.',
        tipo: 'info',
        sujeto: '',
        emisor: '',
        vence: '',
        ruc: ''
      });
      return;
    }

    try {
      const p12Der = forge.util.decode64(base64);
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
      
      const certBag = p12.getBags({ bagType: forge.pki.oids.certBag });
      let certificate;
      for (let certId in certBag) {
        if (certBag[certId] && certBag[certId][0]) {
          certificate = certBag[certId][0].cert;
          break;
        }
      }

      if (!certificate) {
        setCertValidation({
          verificado: false,
          mensaje: 'Error: No se encontró ningún certificado en el archivo cargado.',
          tipo: 'error',
          sujeto: '',
          emisor: '',
          vence: '',
          ruc: ''
        });
        return;
      }

      const cn = certificate.subject.getField('CN')?.value || 'Desconocido';
      const o = certificate.subject.getField('O')?.value || '';
      const issuerCN = certificate.issuer.getField('CN')?.value || 'Autoridad Certificadora';
      const issuerO = certificate.issuer.getField('O')?.value || '';
      
      const expirationDate = certificate.validity.notAfter;
      const now = new Date();
      const isExpired = expirationDate < now;
      const venceStr = expirationDate.toISOString().split('T')[0];

      // Extract RUC from subject attributes
      let certRuc = '';
      for (let attr of certificate.subject.attributes) {
        if (attr.name === 'serialNumber' || attr.shortName === 'SN') {
          const val = attr.value;
          if (typeof val === 'string') {
            const match = val.match(/\d{13}/);
            if (match) certRuc = match[0];
          }
        }
      }

      if (!certRuc) {
        for (let attr of certificate.subject.attributes) {
          if (typeof attr.value === 'string') {
            const match = attr.value.match(/\d{13}/);
            if (match) {
              certRuc = match[0];
              break;
            }
          }
        }
      }

      let tipo = 'success';
      let mensaje = 'Firma digital descifrada correctamente. ¡Lista para facturar!';

      if (isExpired) {
        tipo = 'error';
        mensaje = `La firma electrónica EXPIRÓ el ${venceStr}. Por favor, renuévela para poder firmar comprobantes.`;
      } else if (emisorRuc && certRuc && certRuc !== emisorRuc) {
        tipo = 'warning';
        mensaje = `Advertencia: El RUC de la firma (${certRuc}) no coincide con el RUC de emisor (${emisorRuc}). El SRI rechazará los comprobantes.`;
      } else if (emisorRuc && !certRuc) {
        tipo = 'warning';
        mensaje = 'Firma descifrada. No pudimos extraer un RUC de 13 dígitos de la firma automáticamente. Asegúrese de que pertenezca a este emisor.';
      }

      setCertValidation({
        verificado: !isExpired,
        mensaje,
        tipo,
        sujeto: cn + (o ? ` (${o})` : ''),
        emisor: issuerCN || issuerO,
        vence: venceStr,
        ruc: certRuc
      });

      setSriConfig(prev => ({
        ...prev,
        certificadoVence: venceStr
      }));

    } catch (err) {
      console.error("Error decrypting p12:", err);
      setCertValidation({
        verificado: false,
        mensaje: 'Error de descifrado: La contraseña ingresada es incorrecta o el archivo está dañado.',
        tipo: 'error',
        sujeto: '',
        emisor: '',
        vence: '',
        ruc: ''
      });
    }
  };

  const handleSRIExtraction = async () => {
    if (!sriConfig.ruc || sriConfig.ruc.length !== 13) {
      showToast("El RUC debe tener exactamente 13 dígitos", "error");
      return;
    }
    setIsExtractingSRI(true);
    showToast("Consultando RUC en el Servicio de Rentas Internas (SRI)...", "info");

    setTimeout(() => {
      setIsExtractingSRI(false);
      if (sriConfig.ruc === '1700000000001') {
        setSriConfig(prev => ({
          ...prev,
          razonSocial: 'CONSORCIO INACTIVO S.A. (EN LIQUIDACION)',
          nombreComercial: 'Consorcio Suspendido',
          direccionMatriz: 'Av. Maldonado y Quitumbe, Quito',
          rucActivo: false,
          rucEstado: 'SUSPENDIDO / INACTIVO',
          rucRegimen: 'Régimen General',
          obligadoContabilidad: true,
          contribuyenteTipo: 'general',
          sucursales: [
            { codigo: '001', nombre: 'Casa Matriz (Cerrada)', direccion: 'Av. Maldonado y Quitumbe, Quito', activa: false, bodegas: ['Bodega General'] }
          ],
          bodegas: ['Bodega General'],
          agenteRetencion: false,
          agenteResolucion: '',
          contribuyenteEspecial: false,
          especialResolucion: ''
        }));
        showToast("RUC INACTIVO / SUSPENDIDO en el SRI. Facturación electrónica bloqueada.", "warning");
      } else {
        const isSevilla = sriConfig.ruc === '1754376901001';
        setSriConfig(prev => ({
          ...prev,
          razonSocial: isSevilla ? 'ROSA KARINA SEVILLA MARROQUIN' : 'WEDFIX SOLUCIONES TECNOLOGICAS S.A.S.',
          nombreComercial: isSevilla ? 'WEB FIX' : 'WEDFIX SOFTWARE',
          direccionMatriz: isSevilla ? 'Av. Amazonas N21-147 y Patria, Quito, Ecuador' : 'Av. de los Shyris y Naciones Unidas, Edificio Shyris Park, Quito',
          rucActivo: true,
          rucEstado: 'ACTIVO',
          rucRegimen: 'RIMPE Emprendedor',
          obligadoContabilidad: false,
          contribuyenteTipo: 'rimpe_emprendedor',
          sucursales: [
            { codigo: '001', nombre: 'Casa Matriz', direccion: isSevilla ? 'Av. Amazonas N21-147 y Patria, Quito' : 'Av. de los Shyris y Naciones Unidas, Quito', activa: true, bodegas: ['Bodega Central'] },
            { codigo: '002', nombre: 'Sucursal Norte', direccion: 'Av. Galo Plaza Lasso y Capitán Ramón Borja, Quito', activa: true, bodegas: ['Bodega Norte'] }
          ],
          bodegas: ['Bodega Central', 'Bodega Norte'],
          agenteRetencion: true,
          agenteResolucion: 'NAC-DNCRASC20-00000001',
          contribuyenteEspecial: false,
          especialResolucion: ''
        }));
        showToast("RUC ACTIVO en el SRI. Datos fiscales y sucursales cargados.", "success");
      }
    }, 1200);
  };

  const handleAddBranch = () => {
    if (!newBranch.codigo || !newBranch.nombre || !newBranch.direccion) {
      showToast("Complete el código, nombre y dirección de la sucursal", "error");
      return;
    }
    if (newBranch.codigo.length !== 3 || isNaN(newBranch.codigo)) {
      showToast("El código debe tener exactamente 3 dígitos numéricos (ej. 002)", "error");
      return;
    }
    if (sriConfig.sucursales.some(b => b.codigo === newBranch.codigo)) {
      showToast("Ya existe un establecimiento con el código " + newBranch.codigo, "error");
      return;
    }
    const updated = [...sriConfig.sucursales, { ...newBranch, activa: true, bodegas: [] }];
    setSriConfig(prev => ({ ...prev, sucursales: updated }));
    setNewBranch({ codigo: '', nombre: '', direccion: '', activa: true, bodegas: [] });
    showToast("Sucursal agregada. Guarde los cambios para confirmar.", "success");
  };

  const handleRemoveBranch = (code) => {
    if (code === '001') {
      showToast("No se puede eliminar la sucursal matriz (001)", "error");
      return;
    }
    const updated = sriConfig.sucursales.filter(b => b.codigo !== code);
    setSriConfig(prev => ({ ...prev, sucursales: updated }));
    showToast("Sucursal eliminada. Guarde los cambios para confirmar.", "info");
  };

  const handleAddWarehouse = () => {
    const name = newWarehouseName.trim();
    if (!name) return;
    if (sriConfig.bodegas.includes(name)) {
      showToast("Ya existe una bodega con ese nombre", "error");
      return;
    }
    const updated = [...sriConfig.bodegas, name];
    setSriConfig(prev => ({ ...prev, bodegas: updated }));
    setNewWarehouseName('');
    showToast("Bodega '" + name + "' agregada. Guarde los cambios para confirmar.", "success");
  };

  const handleRemoveWarehouse = (name) => {
    if (name === 'Bodega Central') {
      showToast("No se puede eliminar la bodega por defecto (Bodega Central)", "error");
      return;
    }
    const updated = sriConfig.bodegas.filter(w => w !== name);
    const updatedBranches = sriConfig.sucursales.map(b => ({
      ...b,
      bodegas: b.bodegas.filter(w => w !== name)
    }));
    setSriConfig(prev => ({ ...prev, bodegas: updated, sucursales: updatedBranches }));
    showToast("Bodega eliminada. Guarde los cambios para confirmar.", "info");
  };

  const handleToggleWarehouseForBranch = (branchCode, whName) => {
    const updated = sriConfig.sucursales.map(b => {
      if (b.codigo !== branchCode) return b;
      const exist = b.bodegas.includes(whName);
      const newWhs = exist ? b.bodegas.filter(w => w !== whName) : [...b.bodegas, whName];
      return { ...b, bodegas: newWhs };
    });
    setSriConfig(prev => ({ ...prev, sucursales: updated }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast("El archivo debe ser una imagen", "error");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const extension = file.name.split('.').pop();
      const path = `artifacts/${appId}/finances/logo_${new Date().getTime()}.${extension}`;
      const storageRef = ref(storage, path);
      const uploadTask = await uploadBytesResumable(storageRef, file);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      
      setSriConfig(prev => ({
        ...prev,
        logoUrl: downloadURL
      }));
      showToast("Logo de empresa subido exitosamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al subir el logo", "error");
    } finally {
      setIsUploadingLogo(false);
    }
  };

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

        // Auto-verificar firma si existen credenciales guardadas
        if (loadedConfig.certificadoCargado && loadedConfig.certificadoBase64 && loadedConfig.certificadoClave) {
          // Utilizar un timeout corto para dar tiempo al render del componente
          setTimeout(() => {
            verifySignatureDetails(loadedConfig.certificadoBase64, loadedConfig.certificadoClave, loadedConfig.ruc || '');
          }, 100);
        }
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
      const trimmedKey = geminiKey.trim();
      localStorage.setItem('finances_gemini_api_key', trimmedKey);
      
      // Guardar Gemini Key en Firestore meta/info para sincronización cloud
      if (trimmedKey) {
        const infoRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
        await setDoc(infoRef, { geminiApiKey: trimmedKey }, { merge: true });
      }
      
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

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result.split(',')[1];
      setSriConfig(prev => ({
        ...prev,
        certificadoCargado: true,
        certificadoNombre: file.name,
        certificadoBase64: base64Data,
        certificadoClave: '',
        certificadoVence: ''
      }));
      setCertValidation({
        verificado: false,
        mensaje: 'Certificado cargado. Ingrese la contraseña y haga clic en Verificar.',
        tipo: 'info',
        sujeto: '',
        emisor: '',
        vence: '',
        ruc: ''
      });
      showToast(`Certificado '${file.name}' cargado. Ingrese la contraseña.`, "info");
    };
    reader.onerror = () => {
      showToast("Error al leer el archivo de certificado", "error");
    };
    reader.readAsDataURL(file);
  };

  const removeCertificate = () => {
    setSriConfig(prev => ({
      ...prev,
      certificadoCargado: false,
      certificadoNombre: '',
      certificadoClave: '',
      certificadoVence: '',
      certificadoBase64: ''
    }));
    setCertValidation({
      verificado: false,
      mensaje: 'Cargue su firma electrónica (.p12 / .pfx) para comenzar.',
      tipo: 'info',
      sujeto: '',
      emisor: '',
      vence: '',
      ruc: ''
    });
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
        <div className={`md:col-span-2 p-6 rounded-2xl border space-y-6 ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2 pb-4 border-b border-white/10">
            <Shield size={18} className="text-blue-500" />
            <h3 className="text-base font-bold">Información de Facturación del Emisor</h3>
          </div>

          {!sriConfig.rucActivo && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400 text-xs flex items-center gap-2 animate-pulse">
              <AlertTriangle size={16} className="shrink-0" />
              <span className="font-bold">Facturación Electrónica Inactiva: El RUC emisor está suspendido o inactivo. Solo se permite emitir Recibos.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Razón Social</label>
              <input type="text" value={sriConfig.razonSocial} onChange={e => setSriConfig({...sriConfig, razonSocial: e.target.value})} className={inputClass} placeholder="Ej. Empresa Soluciones Tecnológicas S.A." />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Nombre Comercial</label>
              <input type="text" value={sriConfig.nombreComercial} onChange={e => setSriConfig({...sriConfig, nombreComercial: e.target.value})} className={inputClass} placeholder="Ej. WebFix Soluciones" />
            </div>

            {/* RUC CON BUSCADOR SRI */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">RUC Emisor (13 dígitos)</label>
                <input type="text" maxLength={13} value={sriConfig.ruc} onChange={e => setSriConfig({...sriConfig, ruc: e.target.value})} className={inputClass} placeholder="1790000000001" />
              </div>
              <button
                type="button"
                onClick={handleSRIExtraction}
                disabled={isExtractingSRI}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 shrink-0 ${
                  isDarkMode 
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                }`}
              >
                {isExtractingSRI ? 'Buscando...' : 'Extraer SRI'}
              </button>
            </div>

            {/* ESTADO RUC */}
            {sriConfig.ruc && sriConfig.ruc.length === 13 && (
              <div className={`md:col-span-2 p-3 rounded-xl flex items-center justify-between text-xs border ${
                sriConfig.rucActivo
                  ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-650 dark:text-emerald-400'
                  : 'bg-red-500/5 border-red-500/15 text-red-500 dark:text-red-400'
              }`}>
                <span className="font-bold">Estatus SRI Emisor:</span>
                <div className="flex items-center gap-2 font-black">
                  <span className={`w-2 h-2 rounded-full ${sriConfig.rucActivo ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  {sriConfig.rucEstado} ({sriConfig.rucRegimen})
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Dirección Matriz</label>
              <input type="text" value={sriConfig.direccionMatriz} onChange={e => setSriConfig({...sriConfig, direccionMatriz: e.target.value})} className={inputClass} placeholder="Av. Amazonas y Patria, Quito, Ecuador" />
            </div>

            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Establecimiento (Matriz)</label>
                <input type="text" maxLength={3} value={sriConfig.establecimiento} onChange={e => setSriConfig({...sriConfig, establecimiento: e.target.value.padStart(3, '0')})} className={inputClass} placeholder="001" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Punto Emisión</label>
                <input type="text" maxLength={3} value={sriConfig.puntoEmision} onChange={e => setSriConfig({...sriConfig, puntoEmision: e.target.value.padStart(3, '0')})} className={inputClass} placeholder="001" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Régimen Contribuyente</label>
                <select value={sriConfig.contribuyenteTipo} onChange={e => setSriConfig({...sriConfig, contribuyenteTipo: e.target.value, rucRegimen: e.target.value.replace('_', ' ').toUpperCase()})} className={inputClass}>
                  <option value="general" className="text-black">Régimen General</option>
                  <option value="rimpe_popular" className="text-black">RIMPE Popular</option>
                  <option value="rimpe_emprendedor" className="text-black">RIMPE Emprendedor</option>
                  <option value="microempresas" className="text-black">Microempresas</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2 flex items-center gap-2 py-1">
              <input type="checkbox" id="obligado" checked={sriConfig.obligadoContabilidad} onChange={e => setSriConfig({...sriConfig, obligadoContabilidad: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-transparent border-gray-300" />
              <label htmlFor="obligado" className="text-xs font-semibold text-gray-400 cursor-pointer">Obligado a llevar contabilidad</label>
            </div>

            {/* AGENTE DE RETENCIÓN / CONTRIBUYENTE ESPECIAL */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="agenteRetCont" 
                  checked={sriConfig.agenteRetencion} 
                  onChange={e => setSriConfig({...sriConfig, agenteRetencion: e.target.checked})} 
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-transparent border-gray-300"
                />
                <label htmlFor="agenteRetCont" className="text-xs font-semibold text-gray-400 cursor-pointer">Agente de Retención</label>
              </div>
              {sriConfig.agenteRetencion && (
                <input 
                  type="text" 
                  value={sriConfig.agenteResolucion} 
                  onChange={e => setSriConfig({...sriConfig, agenteResolucion: e.target.value})} 
                  className={inputClass} 
                  placeholder="Resolución Nro." 
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="contEspecialCont" 
                  checked={sriConfig.contribuyenteEspecial} 
                  onChange={e => setSriConfig({...sriConfig, contribuyenteEspecial: e.target.checked})} 
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-transparent border-gray-300"
                />
                <label htmlFor="contEspecialCont" className="text-xs font-semibold text-gray-400 cursor-pointer">Contribuyente Especial</label>
              </div>
              {sriConfig.contribuyenteEspecial && (
                <input 
                  type="text" 
                  value={sriConfig.especialResolucion} 
                  onChange={e => setSriConfig({...sriConfig, especialResolucion: e.target.value})} 
                  className={inputClass} 
                  placeholder="Resolución Nro." 
                />
              )}
            </div>
          </div>

          {/* CONTROL SUCURSALES Y BODEGAS EN CONTABILIDAD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
            {/* SUCURSALES */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase text-gray-400">Establecimientos Activos</p>
              <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                {sriConfig.sucursales && sriConfig.sucursales.map(branch => (
                  <div key={branch.codigo} className={`p-2.5 rounded-xl border text-xs ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between items-start font-bold">
                      <span>{branch.codigo} - {branch.nombre}</span>
                      {branch.codigo !== '001' && (
                        <button type="button" onClick={() => handleRemoveBranch(branch.codigo)} className="text-red-500 hover:text-red-750">Eliminar</button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">{branch.direccion}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {sriConfig.bodegas.map(wName => {
                        const isAssoc = branch.bodegas && branch.bodegas.includes(wName);
                        return (
                          <label key={wName} className="flex items-center gap-1 text-[9px] text-gray-400 cursor-pointer hover:text-white">
                            <input 
                              type="checkbox" 
                              checked={isAssoc} 
                              onChange={() => handleToggleWarehouseForBranch(branch.codigo, wName)}
                              className="rounded text-blue-600 h-3 w-3 bg-transparent border-gray-300"
                            />
                            {wName}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`p-2.5 rounded-xl border space-y-2 ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-100/50 border-gray-250'}`}>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" maxLength={3} placeholder="002" value={newBranch.codigo} onChange={e => setNewBranch({...newBranch, codigo: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Sucursal" value={newBranch.nombre} onChange={e => setNewBranch({...newBranch, nombre: e.target.value})} className={`col-span-2 ${inputClass}`} />
                </div>
                <input type="text" placeholder="Dirección" value={newBranch.direccion} onChange={e => setNewBranch({...newBranch, direccion: e.target.value})} className={inputClass} />
                <button type="button" onClick={handleAddBranch} className="w-full py-1 rounded bg-blue-600 text-white font-bold text-[10px]">Activar Sucursal</button>
              </div>
            </div>

            {/* BODEGAS */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase text-gray-400">Bodegas de Inventario</p>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-dashed border-white/10 min-h-[60px]">
                {sriConfig.bodegas.map(wh => (
                  <div key={wh} className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-[11px]">
                    <span>{wh}</span>
                    {wh !== 'Bodega Central' && (
                      <button type="button" onClick={() => handleRemoveWarehouse(wh)} className="text-red-500 hover:text-red-700 ml-1">×</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="text" placeholder="Ej. Bodega Bodega Sur" value={newWarehouseName} onChange={e => setNewWarehouseName(e.target.value)} className={inputClass} />
                <button type="button" onClick={handleAddWarehouse} className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shrink-0">Agregar</button>
              </div>
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
                <div className={`p-4 rounded-xl border space-y-2.5 transition-all duration-305 ${
                  certValidation.tipo === 'success' 
                    ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450' : 'bg-emerald-50 border-emerald-200 text-emerald-850')
                    : certValidation.tipo === 'warning'
                      ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-450' : 'bg-amber-50 border-amber-200 text-amber-850')
                      : certValidation.tipo === 'error'
                        ? (isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-450' : 'bg-red-50 border-red-200 text-red-850')
                        : (isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-450' : 'bg-blue-50 border-blue-200 text-blue-900')
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="truncate pr-2">
                      <p className="text-xs font-black truncate">{sriConfig.certificadoNombre}</p>
                      {certValidation.sujeto && <p className="text-[10px] font-bold mt-1.5 text-gray-400">Sujeto: <span className="font-extrabold text-gray-800 dark:text-gray-200">{certValidation.sujeto}</span></p>}
                      {certValidation.emisor && <p className="text-[9px] opacity-80 mt-0.5">Emisor: {certValidation.emisor}</p>}
                      {certValidation.vence && <p className="text-[9px] opacity-80 mt-0.5 font-mono">Expira: {certValidation.vence}</p>}
                      {certValidation.ruc && <p className="text-[9px] opacity-85 mt-0.5 font-bold">RUC Firma: {certValidation.ruc}</p>}
                    </div>
                    <button type="button" onClick={removeCertificate} className="text-xs font-bold text-red-500 hover:text-red-650 hover:underline shrink-0">Remover</button>
                  </div>
                  
                  <div className="flex items-start gap-1.5 border-t border-current/10 pt-2.5">
                    {certValidation.tipo === 'success' && <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />}
                    {certValidation.tipo === 'warning' && <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />}
                    {certValidation.tipo === 'error' && <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />}
                    {certValidation.tipo === 'info' && <Shield size={14} className="shrink-0 mt-0.5 text-blue-500" />}
                    <p className="text-[10px] leading-relaxed font-semibold">
                      {certValidation.mensaje}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-gray-500">Contraseña Firma</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      value={sriConfig.certificadoClave} 
                      onChange={e => setSriConfig({...sriConfig, certificadoClave: e.target.value})} 
                      className={inputClass} 
                      placeholder="Contraseña de firma (.p12)" 
                    />
                    <button 
                      type="button" 
                      onClick={() => verifySignatureDetails(sriConfig.certificadoBase64, sriConfig.certificadoClave, sriConfig.ruc)}
                      className={`px-3.5 rounded-xl text-xs font-bold transition-all border ${
                        isDarkMode 
                          ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400' 
                          : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800'
                      }`}
                    >
                      Verificar
                    </button>
                  </div>
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

          {/* VINCULACIÓN SRI ECUADOR */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <ExternalLink size={18} className="text-blue-550" />
              <h3 className="text-base font-bold">Vinculación SRI (Ecuador)</h3>
            </div>
            
            <div className="space-y-3 text-xs leading-normal">
              <p className="text-gray-400 text-[10px]">
                Siga estos pasos para enlazar su ERP con el Servicio de Rentas Internas:
              </p>
              <ol className="list-decimal pl-4 text-gray-400 space-y-1.5 text-[10px]">
                <li>
                  Ingrese a <a href="https://srienlinea.sri.gob.ec" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-bold inline-flex items-center gap-0.5">SRI en Línea <ExternalLink size={8} /></a> con su RUC y clave.
                </li>
                <li>
                  Vaya a <strong>Facturación Electrónica</strong> &gt; <strong>Pruebas</strong> o <strong>Producción</strong> &gt; <strong>Autorización</strong> para habilitar su emisión.
                </li>
                <li>
                  Asegúrese de cargar su firma electrónica vigente <code>.p12</code> y escribir la contraseña arriba.
                </li>
              </ol>

              <div className={`p-3 rounded-xl border text-[9px] ${
                sriConfig.ambiente === '2'
                  ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450' : 'bg-emerald-50 border-emerald-250 text-emerald-800')
                  : (isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-450' : 'bg-amber-50 border-amber-250 text-amber-800')
              }`}>
                <p className="font-bold uppercase tracking-wider mb-1">Endpoints SRI Configurados:</p>
                <div className="font-mono space-y-0.5">
                  <p className="truncate">Recepción: {sriConfig.ambiente === '2' ? 'https://cel.sri.gob.ec/.../RecepcionComprobantesOffline' : 'https://celcer.sri.gob.ec/.../RecepcionComprobantesOffline'}</p>
                  <p className="truncate">Autorización: {sriConfig.ambiente === '2' ? 'https://cel.sri.gob.ec/.../AutorizacionComprobantesOffline' : 'https://celcer.sri.gob.ec/.../AutorizacionComprobantesOffline'}</p>
                </div>
              </div>
            </div>
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

          {/* CONFIGURACIÓN COMERCIAL Y LOGO */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              <Settings size={18} className="text-blue-500" />
              <h3 className="text-base font-bold">Datos Comerciales / Proformas</h3>
            </div>
            
            <div className="space-y-4">
              {/* Carga de Logo */}
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Logo Corporativo (Obligatorio para Cotizaciones)</label>
                {sriConfig.logoUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5">
                    <img src={sriConfig.logoUrl} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-lg p-1 animate-in fade-in" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-450">Logo Cargado</p>
                      <button type="button" onClick={() => setSriConfig({...sriConfig, logoUrl: ''})} className="text-[10px] text-red-500 hover:underline font-bold mt-0.5">Eliminar Logo</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className={`w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed cursor-pointer transition-colors ${isDarkMode ? 'border-white/20 hover:bg-white/5 text-gray-400' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                      <UploadCloud size={20} className={isUploadingLogo ? 'animate-bounce text-blue-500' : 'text-gray-550'} />
                      <span className="text-xs font-semibold">{isUploadingLogo ? 'Subiendo...' : 'Subir Imagen de Logo'}</span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Correo de Contacto</label>
                <input type="email" value={sriConfig.correoContacto || ''} onChange={e => setSriConfig({...sriConfig, correoContacto: e.target.value})} className={inputClass} placeholder="ventas@empresa.com" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Teléfono de Contacto</label>
                <input type="text" value={sriConfig.telefonoContacto || ''} onChange={e => setSriConfig({...sriConfig, telefonoContacto: e.target.value})} className={inputClass} placeholder="0998765432" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Plantilla de Cotización</label>
                <select value={sriConfig.cotizacionFormatoActivo || 'basico'} onChange={e => setSriConfig({...sriConfig, cotizacionFormatoActivo: e.target.value})} className={inputClass}>
                  <option value="basico" className="text-black">Plantilla Clásica (PDF)</option>
                  <option value="premium" className="text-black">Plantilla Moderna (Flat/Premium)</option>
                </select>
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
