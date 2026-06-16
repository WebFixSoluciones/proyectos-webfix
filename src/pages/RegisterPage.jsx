import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Building, ArrowRight, RefreshCw, Sun, Moon } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, setTenantId } from '../firebase';

export default function RegisterPage({ isDarkMode, setIsDarkMode, showToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') || 'starter';
  const periodParam = searchParams.get('period') || 'monthly';

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: ''
  });
  
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const getPlanName = (id) => {
    switch (id) {
      case 'starter': return 'Plan Starter';
      case 'professional': return 'Plan Profesional';
      case 'enterprise': return 'Plan Enterprise';
      default: return 'Plan Starter';
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    setRegisterError('');

    try {
      const email = registerForm.email.trim();
      const password = registerForm.password;
      const name = registerForm.name.trim();
      const companyName = registerForm.companyName.trim();

      // 1. Crear el usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Generar un tenantId aleatorio y único (o usar el uid + prefijo)
      const generatedTenantId = `org_${user.uid.substring(0, 10)}_${new Date().getTime().toString().substring(8)}`;

      // 3. Crear el documento del inquilino (Tenant) en Firestore
      // Prueba gratuita de 14 días
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const tenantData = {
        id: generatedTenantId,
        companyName: companyName,
        planId: planParam,
        planStatus: 'trial',
        billingPeriod: periodParam,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      await setDoc(doc(db, 'tenants', generatedTenantId), tenantData);

      // 4. Crear el documento del usuario en Firestore
      const userData = {
        uid: user.uid,
        name: name,
        email: email,
        tenantId: generatedTenantId,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // 5. Inicializar la base del Workspace de la empresa para evitar errores de ruteo
      // Configuración de Facturación/Perfil
      const configRef = doc(db, 'artifacts', generatedTenantId, 'public', 'data', 'finances_settings', 'config');
      await setDoc(configRef, {
        razonSocial: companyName,
        nombreComercial: companyName,
        ruc: '',
        direccionMatriz: '',
        telefono: '',
        email: email,
        web: '',
        obligadoContabilidad: false,
        agenteRetencion: false,
        contribuyenteEspecial: '',
        contribuyenteRimpe: 'regimen_general',
        smtpHost: '',
        smtpPort: '465',
        smtpUser: '',
        smtpPass: '',
        smtpSecure: true,
        firmaUrl: '',
        firmaPass: '',
        geminiApiKey: ''
      });

      // Meta Info
      const metaRef = doc(db, 'artifacts', generatedTenantId, 'public', 'data', 'meta', 'info');
      await setDoc(metaRef, {
        users: [{ email: email, role: 'admin' }],
        trash: [],
        googleClientId: ''
      });

      // 6. Establecer el tenantId de forma dinámica
      setTenantId(generatedTenantId);

      showToast("¡Cuenta y Empresa creada con éxito! Iniciando sesión...", "success");
      navigate('/app');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessages = {
        'auth/email-already-in-use': 'Este correo ya está registrado.',
        'auth/invalid-email': 'El correo electrónico no es válido.',
        'auth/operation-not-allowed': 'El registro de usuarios no está habilitado.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/network-request-failed': 'Error de red. Verifica tu conexión a internet.',
      };
      setRegisterError(errorMessages[error.code] || `Error al registrarse: ${error.message}`);
      showToast("Error en el registro", "error");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen w-full font-sans overflow-hidden transition-colors duration-500 relative z-0 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
      
      {/* BASE BACKGROUND SOLID COLOR */}
      <div className={`absolute inset-0 -z-20 transition-colors duration-500 ${isDarkMode ? 'bg-[#020204]' : 'bg-[#fafafa]'}`} />

      {/* GLOBAL BACKGROUND BLOBS (Minimalismo Líquido Puro) */}
      <div className={`absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full filter blur-[130px] pointer-events-none -z-10 transition-all duration-500 animate-liquid-1 ${isDarkMode ? 'mix-blend-screen bg-purple-950/20 opacity-30' : 'mix-blend-multiply bg-purple-200/45 opacity-50'}`}></div>
      <div className={`absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] rounded-full filter blur-[120px] pointer-events-none -z-10 transition-all duration-500 animate-liquid-2 ${isDarkMode ? 'mix-blend-screen bg-primary/20 opacity-25' : 'mix-blend-multiply bg-blue-100/45 opacity-55'}`}></div>
      <div className={`absolute bottom-[-10%] left-[10%] w-[38rem] h-[38rem] rounded-full filter blur-[140px] pointer-events-none -z-10 transition-all duration-500 animate-liquid-3 ${isDarkMode ? 'mix-blend-screen bg-rose-950/20 opacity-20' : 'mix-blend-multiply bg-rose-100/40 opacity-45'}`}></div>
      
      {/* HOUDINI RING PARTICLES */}
      <div className="absolute inset-0 pointer-events-none -z-10 ring-particles-bg-1 animate-ring-particles-1 opacity-70" />
      <div className="absolute inset-0 pointer-events-none -z-10 ring-particles-bg-2 animate-ring-particles-2 opacity-70" />
      
      {/* Theme Toggle flotante en la esquina */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)} 
          className={`p-2.5 rounded-xl transition-all active:scale-95 border backdrop-blur-md shadow-sm flex items-center justify-center ${
            isDarkMode 
              ? 'bg-white/5 border-white/10 hover:bg-white/10 text-amber-400 hover:text-amber-300' 
              : 'bg-white border-slate-200/80 hover:bg-slate-50 text-indigo-600 hover:text-indigo-700'
          }`}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Card Centrado */}
      <div className="w-full max-w-[440px] mx-4 relative group select-none">
        {/* Subtle Backglow */}
        <div className="absolute inset-0 rounded-[10px] bg-gradient-to-tr from-[#1C40F2]/10 to-[#a855f7]/10 blur-xl opacity-60 pointer-events-none"></div>
        
        {/* La tarjeta principal */}
        <div className={`w-full p-8 sm:p-10 rounded-[10px] flex flex-col border transition-all duration-500 relative z-10 ${
          isDarkMode 
            ? 'bg-[#0f111a]/95 border-white/5 shadow-2xl shadow-black/60' 
            : 'bg-white/95 border-slate-200/60 shadow-xl shadow-slate-100/60'
        }`}>
          
          {/* Header */}
          <div className="text-left mb-6 select-none">
            <div className="flex items-center gap-2.5 mb-4 select-none">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#1C40F2] to-[#6366f1] flex items-center justify-center shadow-md shadow-blue-500/20">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Web Fix ERP
              </span>
            </div>
            <span className={`text-[18px] font-medium leading-none block ${isDarkMode ? 'text-gray-200' : 'text-black'}`}>
              Crear cuenta de empresa
            </span>
            <span className="text-[10px] font-black uppercase text-indigo-500 mt-2 block tracking-wider">
              {getPlanName(planParam)} — Prueba de 14 días gratis
            </span>
          </div>
          
          <form onSubmit={handleRegister} className="space-y-4 text-left">
            <div>
              <label className={`block text-[11px] font-normal mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Nombre del Administrador
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
                  <User size={15} />
                </div>
                <input 
                  type="text" 
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                  className={`w-full text-xs font-medium tracking-wide pl-11 pr-3.5 py-3 rounded-[10px] outline-none transition-all border ${
                    isDarkMode 
                      ? 'bg-[#151722] border-white/10 text-white focus:border-[#1C40F2] focus:ring-2' 
                      : 'bg-[#f8fafc] border-slate-300 text-black focus:border-[#1C40F2] focus:bg-white'
                  }`} 
                  placeholder="Tu Nombre" 
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-normal mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Razón Social / Nombre Comercial
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
                  <Building size={15} />
                </div>
                <input 
                  type="text" 
                  value={registerForm.companyName}
                  onChange={(e) => setRegisterForm({...registerForm, companyName: e.target.value})}
                  className={`w-full text-xs font-medium tracking-wide pl-11 pr-3.5 py-3 rounded-[10px] outline-none transition-all border ${
                    isDarkMode 
                      ? 'bg-[#151722] border-white/10 text-white focus:border-[#1C40F2] focus:ring-2' 
                      : 'bg-[#f8fafc] border-slate-300 text-black focus:border-[#1C40F2] focus:bg-white'
                  }`} 
                  placeholder="Ej. Mi Negocio S.A.S" 
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-normal mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Correo Corporativo
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
                  <Mail size={15} />
                </div>
                <input 
                  type="email" 
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  className={`w-full text-xs font-medium tracking-wide pl-11 pr-3.5 py-3 rounded-[10px] outline-none transition-all border ${
                    isDarkMode 
                      ? 'bg-[#151722] border-white/10 text-white focus:border-[#1C40F2] focus:ring-2' 
                      : 'bg-[#f8fafc] border-slate-300 text-black focus:border-[#1C40F2] focus:bg-white'
                  }`} 
                  placeholder="correo@empresa.com" 
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-normal mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Contraseña
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
                  <Lock size={15} />
                </div>
                <input 
                  type="password" 
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  className={`w-full text-xs font-medium tracking-wide pl-11 pr-3.5 py-3 rounded-[10px] outline-none transition-all border ${
                    isDarkMode 
                      ? 'bg-[#151722] border-white/10 text-white focus:border-[#1C40F2] focus:ring-2' 
                      : 'bg-[#f8fafc] border-slate-300 text-black focus:border-[#1C40F2] focus:bg-white'
                  }`} 
                  placeholder="Mínimo 6 caracteres" 
                  minLength={6}
                  required
                />
              </div>
            </div>
 
            {registerError && (
              <div className={`p-3 rounded-[10px] text-xs font-semibold text-center border ${
                isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-red-50 text-red-750 border-red-100'
              }`}>
                {registerError}
              </div>
            )}
 
            <button 
              type="submit" 
              disabled={isRegistering}
              className="w-full flex items-center justify-center gap-2 mt-4 py-4 rounded-[10px] text-xs font-bold tracking-wider uppercase bg-primary hover:bg-[#1633c1] text-white transition-all shadow-md active:scale-98 disabled:opacity-75"
            >
              {isRegistering ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Creando cuenta...
                </>
              ) : (
                <>
                  EMPEZAR PRUEBA GRATUITA <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
 
          {/* Footer */}
          <div className="mt-6 text-center">
            <p style={{ fontSize: '12px', color: isDarkMode ? '#e2e8f0' : '#000000' }} className="font-normal select-none">
              ¿Ya tienes cuenta?{' '}
              <span 
                onClick={() => navigate('/login')}
                className="font-bold text-primary hover:underline cursor-pointer"
              >
                Inicia sesión
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Derechos Reservados */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none">
        <p style={{ fontSize: '12px', color: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : '#000000' }} className="font-normal select-none pointer-events-auto">
          © WebFix 2026. Todos los derechos reservados
        </p>
      </div>

    </div>
  );
}
