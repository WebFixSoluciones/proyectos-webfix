import React, { useState, useEffect } from 'react';
import { 
  Settings, Link as LinkIcon, Sparkles, User, Users, Folder, Shield, 
  Save, Download, CheckCircle2, AlertTriangle, Key, Mail, Globe, 
  MapPin, Phone, Building, ShoppingCart, DollarSign, Package, Calendar, 
  Plus, Trash2, Eye, EyeOff, LayoutDashboard, ToggleLeft, ToggleRight,
  Palette, CreditCard
} from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function GeneralSettings({ 
  isDarkMode, showToast, db, appId, 
  users = [], trash = [], handleDownloadBackup, 
  googleClientId, setGoogleClientId, 
  activeModules = {}, setActiveModules,
  primaryColor, setPrimaryColor
}) {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  
  // States for Company Profile
  const [companyProfile, setCompanyProfile] = useState({
    razonSocial: '',
    nombreComercial: '',
    ruc: '',
    direccionMatriz: '',
    telefono: '',
    email: '',
    web: '',
    rucActivo: true,
    rucEstado: 'ACTIVO',
    rucRegimen: 'RIMPE Emprendedor',
    obligadoContabilidad: false,
    contribuyenteTipo: 'rimpe_emprendedor',
    sucursales: [
      { codigo: '001', nombre: 'Casa Matriz', direccion: 'Av. de los Shyris y Naciones Unidas, Quito', activa: true, bodegas: ['Bodega Central'] }
    ],
    bodegas: ['Bodega Central'],
    agenteRetencion: false,
    agenteResolucion: '',
    contribuyenteEspecial: false,
    especialResolucion: ''
  });

  const [isExtractingSRI, setIsExtractingSRI] = useState(false);
  const [newBranch, setNewBranch] = useState({ codigo: '', nombre: '', direccion: '', activa: true, bodegas: [] });
  const [newWarehouseName, setNewWarehouseName] = useState('');

  // State for Gemini Key
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // States for User Management
  const [localUsers, setLocalUsers] = useState(users);
  const [newUser, setNewUser] = useState({ name: '', role: 'Miembro', job: '', email: '' });

  // Load configuration on mount
  useEffect(() => {
    if (!appId || !db) return;
    async function loadConfig() {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
        const snap = await getDoc(docRef);
        let cloudGeminiKey = '';
        if (snap.exists()) {
          const data = snap.data();
          if (data.users) {
            setLocalUsers(data.users);
          }
          if (data.geminiApiKey) {
            cloudGeminiKey = data.geminiApiKey;
          }
        }

        const finRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        const finSnap = await getDoc(finRef);
        if (finSnap.exists()) {
          const finData = finSnap.data();
          setCompanyProfile(prev => ({
            ...prev,
            razonSocial: finData.razonSocial || '',
            nombreComercial: finData.nombreComercial || '',
            ruc: finData.ruc || '',
            direccionMatriz: finData.direccionMatriz || '',
            telefono: finData.telefonoContacto || finData.telefono || '',
            email: finData.correoContacto || finData.email || '',
            web: finData.web || '',
            rucActivo: finData.rucActivo !== false,
            rucEstado: finData.rucEstado || 'ACTIVO',
            rucRegimen: finData.rucRegimen || 'RIMPE Emprendedor',
            obligadoContabilidad: finData.obligadoContabilidad || false,
            contribuyenteTipo: finData.contribuyenteTipo || 'rimpe_emprendedor',
            sucursales: finData.sucursales || [
              { codigo: '001', nombre: 'Casa Matriz', direccion: finData.direccionMatriz || 'Av. de los Shyris y Naciones Unidas, Quito', activa: true, bodegas: ['Bodega Central'] }
            ],
            bodegas: finData.bodegas || ['Bodega Central'],
            agenteRetencion: finData.agenteRetencion || false,
            agenteResolucion: finData.agenteResolucion || '',
            contribuyenteEspecial: finData.contribuyenteEspecial || false,
            especialResolucion: finData.especialResolucion || ''
          }));
        } else if (snap.exists() && snap.data().companyProfile) {
          const cp = snap.data().companyProfile;
          setCompanyProfile(prev => ({
            ...prev,
            ...cp,
            rucActivo: cp.rucActivo !== false,
            rucEstado: cp.rucEstado || 'ACTIVO',
            rucRegimen: cp.rucRegimen || 'RIMPE Emprendedor',
            sucursales: cp.sucursales || [
              { codigo: '001', nombre: 'Casa Matriz', direccion: cp.direccionMatriz || 'Av. de los Shyris y Naciones Unidas, Quito', activa: true, bodegas: ['Bodega Central'] }
            ],
            bodegas: cp.bodegas || ['Bodega Central']
          }));
        }
        
        // Load Gemini key from localStorage, fallback to cloud
        const savedGemini = localStorage.getItem('finances_gemini_api_key') || '';
        const finalKey = cloudGeminiKey || savedGemini;
        setGeminiKey(finalKey);
        if (finalKey) {
          localStorage.setItem('finances_gemini_api_key', finalKey);
        }
      } catch (err) {
        console.error("Error al cargar configuración general", err);
      }
    }
    loadConfig();
  }, [appId, db]);

  // Sync users prop with local state
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Extract from SRI Simulator
  const handleSRIExtraction = async () => {
    if (!companyProfile.ruc || companyProfile.ruc.length !== 13) {
      showToast("El RUC debe tener exactamente 13 dígitos", "error");
      return;
    }
    setIsExtractingSRI(true);
    showToast("Consultando RUC en el Servicio de Rentas Internas (SRI)...", "info");

    setTimeout(() => {
      setIsExtractingSRI(false);
      if (companyProfile.ruc === '1700000000001') {
        setCompanyProfile(prev => ({
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
        const isSevilla = companyProfile.ruc === '1754376901001';
        setCompanyProfile(prev => ({
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

  // Save Company Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (companyProfile.ruc && companyProfile.ruc.length !== 13) {
      showToast("El RUC debe tener exactamente 13 dígitos para Ecuador", "error");
      return;
    }
    try {
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
      const profileToSave = {
        razonSocial: companyProfile.razonSocial,
        nombreComercial: companyProfile.nombreComercial,
        ruc: companyProfile.ruc,
        direccionMatriz: companyProfile.direccionMatriz,
        telefonoContacto: companyProfile.telefono,
        correoContacto: companyProfile.email,
        web: companyProfile.web,
        rucActivo: companyProfile.rucActivo,
        rucEstado: companyProfile.rucEstado,
        rucRegimen: companyProfile.rucRegimen,
        obligadoContabilidad: companyProfile.obligadoContabilidad,
        contribuyenteTipo: companyProfile.contribuyenteTipo,
        sucursales: companyProfile.sucursales,
        bodegas: companyProfile.bodegas,
        agenteRetencion: companyProfile.agenteRetencion,
        agenteResolucion: companyProfile.agenteResolucion,
        contribuyenteEspecial: companyProfile.contribuyenteEspecial,
        especialResolucion: companyProfile.especialResolucion
      };
      await setDoc(configRef, profileToSave, { merge: true });

      // Synchronize meta/info
      const infoRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
      await setDoc(infoRef, { companyProfile }, { merge: true });

      showToast("Perfil de la empresa guardado exitosamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar perfil", "error");
    }
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
    if (companyProfile.sucursales.some(b => b.codigo === newBranch.codigo)) {
      showToast("Ya existe un establecimiento con el código " + newBranch.codigo, "error");
      return;
    }
    const updated = [...companyProfile.sucursales, { ...newBranch, activa: true, bodegas: [] }];
    setCompanyProfile(prev => ({ ...prev, sucursales: updated }));
    setNewBranch({ codigo: '', nombre: '', direccion: '', activa: true, bodegas: [] });
    showToast("Sucursal agregada. Guarde los cambios para confirmar.", "success");
  };

  const handleRemoveBranch = (code) => {
    if (code === '001') {
      showToast("No se puede eliminar la sucursal matriz (001)", "error");
      return;
    }
    const updated = companyProfile.sucursales.filter(b => b.codigo !== code);
    setCompanyProfile(prev => ({ ...prev, sucursales: updated }));
    showToast("Sucursal eliminada. Guarde los cambios para confirmar.", "info");
  };

  const handleAddWarehouse = () => {
    const name = newWarehouseName.trim();
    if (!name) return;
    if (companyProfile.bodegas.includes(name)) {
      showToast("Ya existe una bodega con ese nombre", "error");
      return;
    }
    const updated = [...companyProfile.bodegas, name];
    setCompanyProfile(prev => ({ ...prev, bodegas: updated }));
    setNewWarehouseName('');
    showToast("Bodega '" + name + "' agregada. Guarde los cambios para confirmar.", "success");
  };

  const handleRemoveWarehouse = (name) => {
    if (name === 'Bodega Central') {
      showToast("No se puede eliminar la bodega por defecto (Bodega Central)", "error");
      return;
    }
    const updated = companyProfile.bodegas.filter(w => w !== name);
    const updatedBranches = companyProfile.sucursales.map(b => ({
      ...b,
      bodegas: b.bodegas.filter(w => w !== name)
    }));
    setCompanyProfile(prev => ({ ...prev, bodegas: updated, sucursales: updatedBranches }));
    showToast("Bodega eliminada. Guarde los cambios para confirmar.", "info");
  };

  const handleToggleWarehouseForBranch = (branchCode, whName) => {
    const updated = companyProfile.sucursales.map(b => {
      if (b.codigo !== branchCode) return b;
      const exist = b.bodegas.includes(whName);
      const newWhs = exist ? b.bodegas.filter(w => w !== whName) : [...b.bodegas, whName];
      return { ...b, bodegas: newWhs };
    });
    setCompanyProfile(prev => ({ ...prev, sucursales: updated }));
  };

  // Save Appearance Configuration
  const handleSaveAppearance = async (e) => {
    e.preventDefault();
    if (!primaryColor || !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      showToast("Por favor ingresa un color hexadecimal válido (ej. #2563eb)", "error");
      return;
    }
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
      await setDoc(docRef, { primaryColor }, { merge: true });
      showToast("Color primario guardado y aplicado correctamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar la configuración de apariencia", "error");
    }
  };

  // Save Gemini Key
  const handleSaveGemini = (e) => {
    e.preventDefault();
    const trimmedKey = geminiKey.trim();
    localStorage.setItem('finances_gemini_api_key', trimmedKey);
    // Also save to meta info for cloud backup
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
    setDoc(docRef, { geminiApiKey: trimmedKey }, { merge: true })
      .then(() => {
        showToast("Clave de Gemini guardada correctamente", "success");
      })
      .catch((err) => {
        console.error(err);
        showToast("Clave guardada en local (Error al respaldar en la nube)", "warning");
      });
  };

  const handleTestGeminiKey = async () => {
    if (!geminiKey) {
      showToast("Por favor ingresa una clave de API primero", "error");
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Hola' }]
          }]
        })
      });

      if (response.ok) {
        setTestResult({ success: true, message: '¡Conexión exitosa! La clave de Gemini es válida y se comunica con el servidor de IA.' });
        showToast("Conexión con Gemini exitosa", "success");
      } else {
        const data = await response.json();
        const errMsg = data.error?.message || 'Error de API desconocido';
        setTestResult({ success: false, message: `Error de API: ${errMsg}` });
        showToast("Error al validar clave de Gemini", "error");
      }
    } catch (err) {
      setTestResult({ success: false, message: `Error de red: ${err.message}` });
      showToast("Error de conexión con la API", "error");
    } finally {
      setTestingKey(false);
    }
  };

  // Save Google client ID
  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
      await setDoc(docRef, { googleClientId }, { merge: true });
      setGoogleClientId(googleClientId);
      showToast("Google Workspace Client ID guardado", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar Client ID", "error");
    }
  };

  // Handle module activation toggles
  const handleToggleModule = async (moduleId) => {
    const updatedModules = {
      ...activeModules,
      [moduleId]: !activeModules[moduleId]
    };
    
    // Prevent disabling dashboard entirely as a fallback
    if (moduleId === 'dashboard' && !updatedModules.dashboard) {
      showToast("El módulo principal 'Mi Espacio' no puede ser desactivado", "error");
      return;
    }

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
      await setDoc(docRef, { activeModules: updatedModules }, { merge: true });
      setActiveModules(updatedModules);
      showToast(`Módulo ${moduleId.toUpperCase()} ${updatedModules[moduleId] ? 'activado' : 'desactivado'}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Error al actualizar estado del módulo", "error");
    }
  };

  // User list actions
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name) {
      showToast("El nombre del usuario es obligatorio", "error");
      return;
    }
    const initials = newUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const colors = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-emerald-400 to-emerald-600',
      'from-red-400 to-red-600',
      'from-yellow-400 to-yellow-600'
    ];
    const userColor = colors[Math.floor(Math.random() * colors.length)];
    const id = `u_${new Date().getTime()}`;

    const createdUser = {
      id,
      name: newUser.name,
      role: newUser.role,
      job: newUser.job || 'Miembro del Equipo',
      initials,
      color: userColor,
      email: newUser.email || ''
    };

    const updatedUsers = [...localUsers, createdUser];
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
      await setDoc(docRef, { users: updatedUsers }, { merge: true });
      setLocalUsers(updatedUsers);
      setNewUser({ name: '', role: 'Miembro', job: '', email: '' });
      showToast("Usuario creado y guardado", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar usuario", "error");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (localUsers.length <= 1) {
      showToast("Debe haber al menos un usuario administrador en el espacio", "error");
      return;
    }
    if (window.confirm("¿Seguro que deseas remover este usuario?")) {
      const updatedUsers = localUsers.filter(u => u.id !== userId);
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
        await setDoc(docRef, { users: updatedUsers }, { merge: true });
        setLocalUsers(updatedUsers);
        showToast("Usuario removido del espacio", "success");
      } catch (err) {
        showToast("Error al remover usuario", "error");
      }
    }
  };

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/25 border-white/10 text-white focus:border-primary/50' 
      : 'bg-white border-gray-300 text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary/35 font-medium'
  }`;

  const tabs = [
    { id: 'profile', label: 'Perfil de Empresa', icon: Building },
    { id: 'appearance', label: 'Apariencia y Tema', icon: Palette },
    { id: 'modules', label: 'Módulos ERP', icon: ToggleRight },
    { id: 'workspace', label: 'Google Workspace', icon: LinkIcon },
    { id: 'gemini', label: 'Google Gemini', icon: Sparkles },
    { id: 'users', label: 'Usuarios y Roles', icon: Users },
    { id: 'backup', label: 'Copia de Seguridad', icon: Download }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full w-full animate-in fade-in duration-300">
      
      {/* MENU LATERAL DE PESTAÑAS */}
      <div className="md:w-64 shrink-0 flex flex-col gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all text-left ${
                isActive 
                  ? isDarkMode 
                    ? 'bg-primary/25 text-primary border border-primary/20 shadow-sm' 
                    : 'bg-primary text-white shadow-md'
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-gray-250 hover:bg-white/5' 
                    : 'text-gray-650 hover:text-gray-900 hover:bg-black/5'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENIDO DE PESTAÑA */}
      <div className={`flex-1 p-6 rounded-3xl border shadow-sm ${
        isDarkMode ? 'bg-[#151517] border-white/5 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
      }`}>
        
        {/* PESTAÑA: PERFIL EMPRESA */}
        {activeSubTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-primary">Pertenencia y Perfil de Empresa</h3>
              <p className="text-[10px] text-gray-500 mt-1">Ingresa los datos generales de tu organización. Extrae los datos desde el SRI con tu RUC emisor y administra tus establecimientos tributarios y bodegas físicas.</p>
            </div>

            {/* ALERTA RUC INACTIVO */}
            {!companyProfile.rucActivo && (
              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400 text-xs flex items-center gap-2 animate-pulse">
                <AlertTriangle size={16} className="shrink-0" />
                <span className="font-bold">Facturación Electrónica Deshabilitada: El RUC de la empresa está suspendido o inactivo. El sistema solo emitirá recibos contables.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Razón Social (Oficial SRI)</label>
                <input 
                  type="text" 
                  value={companyProfile.razonSocial} 
                  onChange={e => setCompanyProfile({...companyProfile, razonSocial: e.target.value})} 
                  className={inputClass} 
                  placeholder="Empresa Soluciones S.A." 
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={companyProfile.nombreComercial} 
                  onChange={e => setCompanyProfile({...companyProfile, nombreComercial: e.target.value})} 
                  className={inputClass} 
                  placeholder="WebFix Soluciones" 
                />
              </div>

              {/* RUC CON BUSCADOR SRI */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">RUC Emisor (13 dígitos)</label>
                  <input 
                    type="text" 
                    maxLength={13}
                    value={companyProfile.ruc} 
                    onChange={e => setCompanyProfile({...companyProfile, ruc: e.target.value})} 
                    className={inputClass} 
                    placeholder="1790000000001" 
                  />
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
                  {isExtractingSRI && <Plus size={12} className="animate-spin" />}
                  {isExtractingSRI ? 'Consultando...' : 'Extraer del SRI'}
                </button>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Teléfono Corporativo</label>
                <input 
                  type="text" 
                  value={companyProfile.telefono} 
                  onChange={e => setCompanyProfile({...companyProfile, telefono: e.target.value})} 
                  className={inputClass} 
                  placeholder="0999999999" 
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Dirección Matriz (SRI)</label>
                <input 
                  type="text" 
                  value={companyProfile.direccionMatriz} 
                  onChange={e => setCompanyProfile({...companyProfile, direccionMatriz: e.target.value})} 
                  className={inputClass} 
                  placeholder="Av. de los Shyris y Naciones Unidas, Quito" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={companyProfile.email} 
                  onChange={e => setCompanyProfile({...companyProfile, email: e.target.value})} 
                  className={inputClass} 
                  placeholder="contacto@empresa.com" 
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Sitio Web</label>
                <input 
                  type="text" 
                  value={companyProfile.web} 
                  onChange={e => setCompanyProfile({...companyProfile, web: e.target.value})} 
                  className={inputClass} 
                  placeholder="www.empresa.com" 
                />
              </div>
            </div>

            {/* ESTADO DEL RUC */}
            {companyProfile.ruc && companyProfile.ruc.length === 13 && (
              <div className={`p-3 rounded-xl flex items-center justify-between text-xs border ${
                companyProfile.rucActivo
                  ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/5 border-red-500/15 text-red-500 dark:text-red-400'
              }`}>
                <span className="font-bold">Estatus Tributario SRI:</span>
                <div className="flex items-center gap-2 font-black">
                  <span className={`w-2 h-2 rounded-full ${companyProfile.rucActivo ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  {companyProfile.rucEstado} ({companyProfile.rucRegimen})
                </div>
              </div>
            )}

            {/* SECCIÓN PARÁMETROS TRIBUTARIOS */}
            <div className={`p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50/50 border-gray-200'}`}>
              <h4 className="text-xs font-black uppercase tracking-wider text-primary">Obligaciones y Resoluciones Tributarias</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 py-1">
                  <input 
                    type="checkbox" 
                    id="obligadoCont" 
                    checked={companyProfile.obligadoContabilidad} 
                    onChange={e => setCompanyProfile({...companyProfile, obligadoContabilidad: e.target.checked})} 
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-transparent border-gray-300"
                  />
                  <label htmlFor="obligadoCont" className="text-xs font-semibold text-gray-400 cursor-pointer">Obligado a llevar contabilidad</label>
                </div>

                <div>
                  <label className="block text-[8px] font-bold uppercase mb-1 text-gray-500">Régimen Fiscal</label>
                  <select 
                    value={companyProfile.contribuyenteTipo} 
                    onChange={e => setCompanyProfile({...companyProfile, contribuyenteTipo: e.target.value, rucRegimen: e.target.value.replace('_', ' ').toUpperCase()})} 
                    className={inputClass}
                  >
                    <option value="general" className="text-black">Régimen General</option>
                    <option value="rimpe_popular" className="text-black">RIMPE Popular</option>
                    <option value="rimpe_emprendedor" className="text-black">RIMPE Emprendedor</option>
                    <option value="microempresas" className="text-black">Microempresas</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="agenteRet" 
                      checked={companyProfile.agenteRetencion} 
                      onChange={e => setCompanyProfile({...companyProfile, agenteRetencion: e.target.checked})} 
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-transparent border-gray-300"
                    />
                    <label htmlFor="agenteRet" className="text-xs font-semibold text-gray-400 cursor-pointer">Agente de Retención</label>
                  </div>
                  {companyProfile.agenteRetencion && (
                    <input 
                      type="text" 
                      value={companyProfile.agenteResolucion} 
                      onChange={e => setCompanyProfile({...companyProfile, agenteResolucion: e.target.value})} 
                      className={inputClass} 
                      placeholder="Resolución Nro. NAC-..." 
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="contEspecial" 
                      checked={companyProfile.contribuyenteEspecial} 
                      onChange={e => setCompanyProfile({...companyProfile, contribuyenteEspecial: e.target.checked})} 
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-transparent border-gray-300"
                    />
                    <label htmlFor="contEspecial" className="text-xs font-semibold text-gray-400 cursor-pointer">Contribuyente Especial</label>
                  </div>
                  {companyProfile.contribuyenteEspecial && (
                    <input 
                      type="text" 
                      value={companyProfile.especialResolucion} 
                      onChange={e => setCompanyProfile({...companyProfile, especialResolucion: e.target.value})} 
                      className={inputClass} 
                      placeholder="Resolución Nro. ..." 
                    />
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN SUCURSALES Y BODEGAS (REDiseño para multi-bodega y sucursales) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              
              {/* PANEL SUCURSALES */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Building size={14} /> Establecimientos / Sucursales
                  </h4>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {companyProfile.sucursales && companyProfile.sucursales.map(branch => (
                    <div key={branch.codigo} className={`p-3 rounded-xl border space-y-2 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-black">{branch.codigo} - {branch.nombre}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{branch.direccion}</p>
                        </div>
                        {branch.codigo !== '001' && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveBranch(branch.codigo)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      {/* Checkboxes de bodegas asociadas a esta sucursal */}
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Bodegas de esta Sucursal:</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {companyProfile.bodegas.map(whName => {
                            const isAssoc = branch.bodegas && branch.bodegas.includes(whName);
                            return (
                              <label key={whName} className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer hover:text-white">
                                <input 
                                  type="checkbox" 
                                  checked={isAssoc}
                                  onChange={() => handleToggleWarehouseForBranch(branch.codigo, whName)}
                                  className="rounded text-blue-605 h-3.5 w-3.5 bg-transparent border-gray-300"
                                />
                                {whName}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulario rápido sucursal */}
                <div className={`p-3 rounded-xl border space-y-2.5 ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-100/50 border-gray-250'}`}>
                  <p className="text-[10px] font-black uppercase text-gray-400">Activar Nueva Sucursal</p>
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="text" 
                      maxLength={3} 
                      placeholder="Cod. (002)" 
                      value={newBranch.codigo} 
                      onChange={e => setNewBranch({...newBranch, codigo: e.target.value})} 
                      className={inputClass} 
                    />
                    <input 
                      type="text" 
                      placeholder="Nombre Sucursal" 
                      value={newBranch.nombre} 
                      onChange={e => setNewBranch({...newBranch, nombre: e.target.value})} 
                      className={`col-span-2 ${inputClass}`} 
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Dirección Física de la Sucursal" 
                    value={newBranch.direccion} 
                    onChange={e => setNewBranch({...newBranch, direccion: e.target.value})} 
                    className={inputClass} 
                  />
                  <button 
                    type="button" 
                    onClick={handleAddBranch}
                    className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    Activar Sucursal
                  </button>
                </div>
              </div>

              {/* PANEL BODEGAS */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Package size={14} /> Bodegas / Almacenes de Inventario
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[80px] p-3 rounded-xl border border-dashed border-white/10">
                  {companyProfile.bodegas.map(wh => (
                    <div key={wh} className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold ${isDarkMode ? 'bg-white/5 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                      <span>{wh}</span>
                      {wh !== 'Bodega Central' && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveWarehouse(wh)}
                          className="text-red-500 hover:text-red-750 font-bold ml-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {companyProfile.bodegas.length === 0 && (
                    <p className="text-[10px] text-gray-500 italic m-auto">No hay bodegas registradas. Agrega una.</p>
                  )}
                </div>

                {/* Agregar Bodega */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nombre de Bodega (ej. Bodega Norte)" 
                    value={newWarehouseName} 
                    onChange={e => setNewWarehouseName(e.target.value)} 
                    className={inputClass} 
                  />
                  <button 
                    type="button" 
                    onClick={handleAddWarehouse}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0"
                  >
                    Agregar
                  </button>
                </div>
                <p className="text-[9px] text-gray-500 leading-normal">Las bodegas declaradas aquí estarán disponibles para el control de inventario de tus productos y para la facturación.</p>
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white shadow-md transition-transform hover:-translate-y-0.5">
                <Save size={14} /> Guardar Perfil
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA: APARIENCIA Y TEMA */}
        {activeSubTab === 'appearance' && (
          <form onSubmit={handleSaveAppearance} className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-primary">Apariencia y Personalización de Marca</h3>
              <p className="text-[10px] text-gray-500 mt-1">Configura el color de acento de tu ERP para alinearlo con la identidad visual de tu empresa. El color elegido se aplicará a botones, enlaces activos e indicadores del sistema.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-2 text-gray-500">Color Primario del Sistema (Hexadecimal)</label>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-300 dark:border-white/10 shrink-0">
                    <input 
                      type="color" 
                      value={primaryColor || '#2563eb'} 
                      onChange={e => setPrimaryColor(e.target.value)} 
                      className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={primaryColor || '#2563eb'} 
                      onChange={e => {
                        let val = e.target.value;
                        if (val && !val.startsWith('#')) val = '#' + val;
                        setPrimaryColor(val);
                      }} 
                      maxLength={7}
                      className={inputClass} 
                      placeholder="#2563eb" 
                    />
                  </div>
                </div>
              </div>

              {/* Sugerencias Rápidas */}
              <div>
                <label className="block text-[8px] font-bold uppercase mb-2 text-gray-500">Colores Recomendados</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Azul WebFix', hex: '#2563eb' },
                    { name: 'Esmeralda', hex: '#10b981' },
                    { name: 'Índigo', hex: '#6366f1' },
                    { name: 'Violeta', hex: '#8b5cf6' },
                    { name: 'Naranja', hex: '#f97316' },
                    { name: 'Rojo', hex: '#ef4444' },
                    { name: 'Gris Oscuro', hex: '#374151' }
                  ].map(preset => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setPrimaryColor(preset.hex)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all hover:scale-105"
                      style={{
                        borderColor: primaryColor === preset.hex ? primaryColor : 'rgba(0,0,0,0.08)',
                        backgroundColor: primaryColor === preset.hex ? 'color-mix(in srgb, ' + preset.hex + ' 10%, transparent)' : 'transparent',
                        color: primaryColor === preset.hex ? '#000000' : 'inherit'
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.hex }}></span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white shadow-md transition-transform hover:-translate-y-0.5">
                <Save size={14} /> Guardar Apariencia
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA: MODULOS ERP (ACTIVACION / DESACTIVACION) */}
        {activeSubTab === 'modules' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-primary">Activación y Desactivación de Módulos</h3>
              <p className="text-[10px] text-gray-500 mt-1">Personaliza tu espacio de trabajo desactivando los módulos que no utilices. Los cambios se reflejarán inmediatamente en el menú de navegación izquierdo.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* CARD: PROYECTOS */}
              <div className={`p-4 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><LayoutDashboard size={18} /></span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold uppercase">Núcleo</span>
                  </div>
                  <h4 className="text-xs font-bold font-sans">Proyectos y Tableros</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">Mi Espacio, control de tareas Kanban, priorización de sprints y bitácoras.</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-gray-400 font-bold">Estado</span>
                  <button type="button" onClick={() => handleToggleModule('dashboard')} className="text-emerald-500"><ToggleRight size={30} /></button>
                </div>
              </div>

              {/* CARD: VENTAS */}
              <div className={`p-4 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><ShoppingCart size={18} /></span>
                    <button type="button" onClick={() => handleToggleModule('ventas')}>
                      {activeModules.ventas ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold font-sans">Ventas y Facturación</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">Bandeja de facturas, Cotizaciones comerciales y Punto de venta (POS) en pantalla completa.</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-gray-400 font-bold">Estado</span>
                  <span className={`text-[9px] font-black uppercase ${activeModules.ventas ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {activeModules.ventas ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>

              {/* CARD: CONTABILIDAD */}
              <div className={`p-4 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><DollarSign size={18} /></span>
                    <button type="button" onClick={() => handleToggleModule('finances')}>
                      {activeModules.finances ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold font-sans">Contabilidad y Retenciones</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">Gestión contable, retenciones del SRI, Cuentas por Cobrar (CxC), Cuentas por Pagar (CxP) y reportes.</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-gray-400 font-bold">Estado</span>
                  <span className={`text-[9px] font-black uppercase ${activeModules.finances ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {activeModules.finances ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>

              {/* CARD: INVENTARIO */}
              <div className={`p-4 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500"><Package size={18} /></span>
                    <button type="button" onClick={() => handleToggleModule('inventario')}>
                      {activeModules.inventario ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold font-sans">Catálogo e Inventario</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">Control de stock de productos, mínimos críticos y configuración fiscal individual de IVA.</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-gray-400 font-bold">Estado</span>
                  <span className={`text-[9px] font-black uppercase ${activeModules.inventario ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {activeModules.inventario ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>

              {/* CARD: PERSONAS */}
              <div className={`p-4 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-teal-500/10 text-teal-500"><Users size={18} /></span>
                    <button type="button" onClick={() => handleToggleModule('personas')}>
                      {activeModules.personas ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold font-sans">Gestión de Personas</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">Directorio unificado de Clientes y Proveedores con RUC/Identificación del SRI.</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-gray-400 font-bold">Estado</span>
                  <span className={`text-[9px] font-black uppercase ${activeModules.personas ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {activeModules.personas ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>

              {/* CARD: CALENDARIO */}
              <div className={`p-4 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500"><Calendar size={18} /></span>
                    <button type="button" onClick={() => handleToggleModule('calendar')}>
                      {activeModules.calendar ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold font-sans">Calendario de Eventos</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">Planificación interna, sincronización con Google Calendar y enlaces de Google Meet.</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-gray-400 font-bold">Estado</span>
                  <span className={`text-[9px] font-black uppercase ${activeModules.calendar ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {activeModules.calendar ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>

              {/* CARD: EQUIPO */}
              <div className={`p-4 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500"><Users size={18} /></span>
                    <button type="button" onClick={() => handleToggleModule('team')}>
                      {activeModules.team ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold font-sans">Equipo de Trabajo</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">Gestión interna de colaboradores de este espacio, roles y asignación de tareas.</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-gray-400 font-bold">Estado</span>
                  <span className={`text-[9px] font-black uppercase ${activeModules.team ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {activeModules.team ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>

              {/* CARD: COMPRAS */}
              <div className={`p-4 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><ShoppingCart size={18} /></span>
                    <button type="button" onClick={() => handleToggleModule('compras')}>
                      {activeModules.compras ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold font-sans">Módulo de Compras (SRI / ATS)</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">Gestión de facturas recibidas del SRI, gastos con categorización de IA y retenciones de compras.</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-gray-400 font-bold">Estado</span>
                  <span className={`text-[9px] font-black uppercase ${activeModules.compras ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {activeModules.compras ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>

              {/* CARD: GASTOS Y CRÉDITOS */}
              <div className={`p-4 rounded-3xl border flex flex-col justify-between ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-pink-500/10 text-pink-500"><CreditCard size={18} /></span>
                    <button type="button" onClick={() => handleToggleModule('gastos_creditos')}>
                      {activeModules.gastos_creditos ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
                    </button>
                  </div>
                  <h4 className="text-xs font-bold font-sans">Gastos y Pasivos Financieros</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">Control financiero de préstamos bancarios, créditos comerciales de locales y tarjetas de crédito.</p>
                </div>
                <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
                  <span className="text-[10px] text-gray-400 font-bold">Estado</span>
                  <span className={`text-[9px] font-black uppercase ${activeModules.gastos_creditos ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {activeModules.gastos_creditos ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: GOOGLE WORKSPACE */}
        {activeSubTab === 'workspace' && (
          <form onSubmit={handleSaveWorkspace} className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-primary">Integración con Google Workspace</h3>
              <p className="text-[10px] text-gray-500 mt-1">Conecta tu calendario de Google Calendar oficial para agendar citas directamente desde las tareas del ERP y autogenerar enlaces de Google Meet.</p>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase mb-2 text-gray-500">Google Client ID (OAuth 2.0)</label>
              <input 
                type="text" 
                value={googleClientId} 
                onChange={(e) => setGoogleClientId(e.target.value)} 
                className={inputClass} 
                placeholder="ej. 123456789-abcdefg.apps.googleusercontent.com" 
              />
            </div>
            
            <div className={`p-4 rounded-2xl border text-xs leading-normal space-y-2 ${
              isDarkMode ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-primary-light border-primary/20 text-primary'
            }`}>
              <p className="font-bold uppercase tracking-wider text-[9px]">Instrucciones de Vinculación:</p>
              <ol className="list-decimal pl-4 space-y-1.5">
                <li>Ingresa a la consola de <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-bold">Google Cloud</a>.</li>
                <li>Crea un proyecto y habilita la API de <strong>Google Calendar</strong>.</li>
                <li>En la pestaña "Pantalla de consentimiento OAuth", configura los alcances de lectura y escritura de eventos.</li>
                <li>Crea las credenciales de tipo <strong>ID de cliente OAuth</strong> para una Aplicación Web.</li>
                <li>Copia el ID resultante y pégalo arriba. Guarda los cambios.</li>
              </ol>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white shadow-md transition-transform hover:-translate-y-0.5">
                <Save size={14} /> Guardar Conexión Google
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA: GOOGLE GEMINI (INTELIGENCIA ARTIFICIAL) */}
        {activeSubTab === 'gemini' && (
          <form onSubmit={handleSaveGemini} className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-primary">Google Gemini AI Advisor</h3>
              <p className="text-[10px] text-gray-500 mt-1">Vincula tu clave de API de Gemini 1.5 Flash para habilitar el diagnóstico estratégico de la empresa. La IA analizará tus tareas, stock crítico de inventario y balances para sugerirte mejoras operativas.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-2 text-gray-500">Clave de API de Gemini (Google AI Studio)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type={showKey ? "text" : "password"} 
                      value={geminiKey} 
                      onChange={(e) => setFormKey(e.target.value)} 
                      className={`${inputClass} pr-10`} 
                      placeholder="AIzaSy..." 
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-650 dark:hover:text-white"
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestGeminiKey}
                    disabled={testingKey}
                    className={`px-4 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                      testingKey 
                        ? 'bg-gray-500/10 text-gray-400 border-gray-500/20 cursor-not-allowed'
                        : isDarkMode 
                          ? 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400' 
                          : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-800'
                    }`}
                  >
                    {testingKey ? 'Probando...' : 'Probar Clave'}
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-[10px] leading-relaxed font-semibold transition-all duration-300 ${
                  testResult.success 
                    ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450' : 'bg-emerald-50 border-emerald-250 text-emerald-850')
                    : (isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-450' : 'bg-red-50 border-red-200 text-red-850')
                }`}>
                  <p className="flex items-center gap-1.5 font-bold">
                    {testResult.success ? <CheckCircle2 size={13} className="text-emerald-505 shrink-0" /> : <AlertTriangle size={13} className="text-red-550 shrink-0" />}
                    <span>{testResult.message}</span>
                  </p>
                </div>
              )}
            </div>

            <div className={`p-4 rounded-2xl border text-xs leading-normal space-y-1.5 ${
              isDarkMode ? 'bg-purple-600/10 border-purple-500/20 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}>
              <p className="font-bold text-[9px] uppercase tracking-wider">¿Cómo obtener una clave de API gratuita?</p>
              <p>Puedes generar tu clave de API de Gemini ingresando a <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Google AI Studio</a> con tu cuenta de correo corporativo o personal de Google. Generar la clave toma 1 minuto y te dará acceso inmediato al asesor de Inteligencia Artificial.</p>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white shadow-md transition-transform hover:-translate-y-0.5">
                <Save size={14} /> Guardar Clave Gemini
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA: USUARIOS Y ROLES */}
        {activeSubTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-primary">Gestión de Usuarios de este Espacio</h3>
              <p className="text-[10px] text-gray-500 mt-1">Colaboradores registrados con acceso a este ERP. Puedes crear, asignar roles o revocar permisos.</p>
            </div>

            {/* LISTA DE USUARIOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {localUsers.map(user => (
                <div key={user.id} className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
                  isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${user.color || 'from-gray-400 to-gray-600'} flex items-center justify-center text-xs font-bold text-white shrink-0 shadow`}>
                      {user.initials}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{user.name}</p>
                      <p className="text-[9px] text-gray-500">{user.job} — <span className="font-semibold uppercase tracking-wider text-[8px]">{user.role}</span></p>
                      {user.email && <p className="text-[9px] font-mono text-gray-400 truncate max-w-[160px]">{user.email}</p>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* FORMULARIO AGREGAR USUARIO */}
            <form onSubmit={handleAddUser} className={`p-5 rounded-3xl border space-y-4 ${
              isDarkMode ? 'bg-black/15 border-white/5' : 'bg-gray-100/50 border-gray-250'
            }`}>
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Registrar Nuevo Colaborador</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[8px] font-bold uppercase mb-1 text-gray-500">Nombre Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={newUser.name} 
                    onChange={e => setNewUser({...newUser, name: e.target.value})} 
                    className={inputClass} 
                    placeholder="Ej. Ana Torres" 
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase mb-1 text-gray-500">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={newUser.email} 
                    onChange={e => setNewUser({...newUser, email: e.target.value})} 
                    className={inputClass} 
                    placeholder="ana.torres@empresa.com" 
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase mb-1 text-gray-500">Cargo / Ocupación</label>
                  <input 
                    type="text" 
                    value={newUser.job} 
                    onChange={e => setNewUser({...newUser, job: e.target.value})} 
                    className={inputClass} 
                    placeholder="Ej. Gerente de Operaciones" 
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase mb-1 text-gray-500">Rol de Acceso</label>
                  <select 
                    value={newUser.role} 
                    onChange={e => setNewUser({...newUser, role: e.target.value})} 
                    className={inputClass}
                  >
                    <option value="Admin" className="text-black">Administrador</option>
                    <option value="Miembro" className="text-black">Miembro</option>
                    <option value="Observador" className="text-black">Observador</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md">
                  <Plus size={14} /> Registrar Usuario
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PESTAÑA: COPIA DE SEGURIDAD */}
        {activeSubTab === 'backup' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-primary">Copia de Seguridad y Respaldos</h3>
              <p className="text-[10px] text-gray-500 mt-1">Respalda localmente toda la base de datos de tu espacio de trabajo para mayor seguridad. Descarga un archivo estructurado en JSON listo para ser restaurado.</p>
            </div>

            <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row gap-4 items-center justify-between ${
              isDarkMode ? 'bg-black/15 border-white/5' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="space-y-1 text-xs">
                <p className="font-bold">Respaldar Datos del ERP</p>
                <p className="text-[10px] text-gray-500 leading-normal">Incluye Proyectos, Tareas, Clientes, Proveedores, Transacciones y Configuraciones.</p>
              </div>

              <button 
                onClick={handleDownloadBackup}
                className={`flex justify-center items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all shadow-md hover:-translate-y-0.5 uppercase tracking-wider shrink-0 ${
                  isDarkMode ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-250 border border-emerald-300'
                }`}
              >
                <Download size={14} /> Exportar Backup (JSON)
              </button>
            </div>
            
            <div className={`p-4 rounded-2xl border text-xs flex gap-3 items-start ${
              isDarkMode ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-950 font-medium'
            }`}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px] mb-1">Precaución contable:</p>
                <p>Las copias de seguridad contienen información fiscal sensible. Almacena tus respaldos en servidores seguros o unidades cifradas conforme al régimen de protección de datos.</p>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );

  // Helper hook state for key text input
  function setFormKey(val) {
    setGeminiKey(val);
  }
}
