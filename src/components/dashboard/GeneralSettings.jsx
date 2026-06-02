import React, { useState, useEffect } from 'react';
import { 
  Settings, Link as LinkIcon, Sparkles, User, Users, Folder, Shield, 
  Save, Download, CheckCircle2, AlertTriangle, Key, Mail, Globe, 
  MapPin, Phone, Building, ShoppingCart, DollarSign, Package, Calendar, 
  Plus, Trash2, Eye, EyeOff, LayoutDashboard, ToggleLeft, ToggleRight
} from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function GeneralSettings({ 
  isDarkMode, showToast, db, appId, 
  users = [], trash = [], handleDownloadBackup, 
  googleClientId, setGoogleClientId, 
  activeModules = {}, setActiveModules
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
    web: ''
  });

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
          if (data.companyProfile) {
            setCompanyProfile(prev => ({ ...prev, ...data.companyProfile }));
          }
          if (data.users) {
            setLocalUsers(data.users);
          }
          if (data.geminiApiKey) {
            cloudGeminiKey = data.geminiApiKey;
          }
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

  // Save Company Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (companyProfile.ruc && companyProfile.ruc.length !== 13) {
      showToast("El RUC debe tener exactamente 13 dígitos para Ecuador", "error");
      return;
    }
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');
      await setDoc(docRef, { companyProfile }, { merge: true });
      showToast("Perfil de la empresa guardado exitosamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al guardar perfil", "error");
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
      ? 'bg-black/25 border-white/10 text-white focus:border-blue-500/50' 
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/35 font-medium'
  }`;

  const tabs = [
    { id: 'profile', label: 'Perfil de Empresa', icon: Building },
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
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-sm' 
                    : 'bg-blue-600 text-white shadow-md'
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
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-500">Pertenencia y Perfil de Empresa</h3>
              <p className="text-[10px] text-gray-500 mt-1">Ingresa los datos generales de tu organización. Recuerda que la firma electrónica (.p12) se configura de forma segura únicamente dentro del módulo de Contabilidad.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Razón Social</label>
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
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">RUC Emisor (13 dígitos)</label>
                <input 
                  type="text" 
                  value={companyProfile.ruc} 
                  onChange={e => setCompanyProfile({...companyProfile, ruc: e.target.value})} 
                  className={inputClass} 
                  placeholder="1790000000001" 
                />
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
              <div className="sm:col-span-2">
                <label className="block text-[9px] font-bold uppercase mb-1.5 text-gray-500">Dirección Matriz</label>
                <input 
                  type="text" 
                  value={companyProfile.direccionMatriz} 
                  onChange={e => setCompanyProfile({...companyProfile, direccionMatriz: e.target.value})} 
                  className={inputClass} 
                  placeholder="Av. de los Shyris y Naciones Unidas, Quito" 
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-transform hover:-translate-y-0.5">
                <Save size={14} /> Guardar Perfil
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA: MODULOS ERP (ACTIVACION / DESACTIVACION) */}
        {activeSubTab === 'modules' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-500">Activación y Desactivación de Módulos</h3>
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
            </div>
          </div>
        )}

        {/* PESTAÑA: GOOGLE WORKSPACE */}
        {activeSubTab === 'workspace' && (
          <form onSubmit={handleSaveWorkspace} className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-500">Integración con Google Workspace</h3>
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
              isDarkMode ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-900'
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
              <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-transform hover:-translate-y-0.5">
                <Save size={14} /> Guardar Conexión Google
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA: GOOGLE GEMINI (INTELIGENCIA ARTIFICIAL) */}
        {activeSubTab === 'gemini' && (
          <form onSubmit={handleSaveGemini} className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-500">Google Gemini AI Advisor</h3>
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
              <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-transform hover:-translate-y-0.5">
                <Save size={14} /> Guardar Clave Gemini
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA: USUARIOS Y ROLES */}
        {activeSubTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-500">Gestión de Usuarios de este Espacio</h3>
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
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-500">Copia de Seguridad y Respaldos</h3>
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
