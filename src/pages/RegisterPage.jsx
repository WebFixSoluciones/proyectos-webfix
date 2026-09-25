import { UiInput } from '../components/ui/controls';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Building, ArrowRight, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import { auth, db, setTenantId } from '../firebase';

export default function RegisterPage({ showToast }) {
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
    if (isRegistering) return;
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

      // 2. Generar un tenantId aleatorio y único
      const generatedTenantId = `org_${user.uid.substring(0, 10)}_${new Date().getTime().toString().substring(8)}`;

      // 3. Crear el documento del inquilino (Tenant) en Firestore
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const batch = writeBatch(db);
      const tenantData = {
        ownerUid: user.uid,
        id: generatedTenantId,
        companyName: companyName,
        planId: planParam,
        planStatus: 'trial',
        billingPeriod: periodParam,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      batch.set(doc(db, 'tenants', generatedTenantId), tenantData);

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

      batch.set(doc(db, 'users', user.uid), userData);

      // 5. Inicializar la base del Workspace de la empresa para evitar errores de ruteo
      const configRef = doc(db, 'artifacts', generatedTenantId, 'public', 'data', 'finances_settings', 'config');
      batch.set(configRef, {
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
      batch.set(metaRef, {
        users: [{ email: email, role: 'admin' }],
        trash: [],
        googleClientId: ''
      });

      await batch.commit();

      // 6. Establecer el tenantId de forma dinámica
      setTenantId(generatedTenantId);

      showToast?.("¡Cuenta y Empresa creada con éxito! Iniciando sesión...", "success");
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
      showToast?.("Error en el registro", "error");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#f9fff6] dark:bg-[#071d12] text-slate-900 dark:text-slate-100 relative overflow-hidden p-4 sm:p-6 select-none font-sans">
      {/* Background Subtle Mint Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 -z-10" 
        style={{
          backgroundImage: 'radial-gradient(#b3f4cb 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Bar Branding */}
      <div className="w-full max-w-[460px] flex justify-between items-center pt-2 sm:pt-4">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Ir a inicio"
        >
          <div className="w-8 h-8 rounded-xl bg-[#0b996e] text-white flex items-center justify-center font-semibold text-sm tracking-tight transition-transform group-hover:scale-105 shadow-none">
            W
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-900 dark:text-white tracking-tight text-lg">
              WebFix
            </span>
            <span className="text-[11px] font-semibold text-[#0b996e] bg-[#e8fedf] px-1.5 py-0.5 rounded-md">
              ERP
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-[#b3f4cb] dark:border-emerald-900/50 text-[11px] font-semibold text-[#006a43] dark:text-emerald-400">
          <ShieldCheck size={13} className="text-[#006a43] dark:text-emerald-400" />
          <span>Prueba 14 días gratis</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-[460px] p-7 sm:p-9 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl duration-200">
        <div className="text-left mb-6 select-none">
          <h1 className="font-extrabold text-2xl sm:text-3xl text-slate-950 dark:text-white tracking-tight">
            Crear cuenta de empresa
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            Plan seleccionado: <span className="font-bold text-[#006a43] dark:text-emerald-400">{getPlanName(planParam)}</span>
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 text-left">
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Nombre del Administrador
            </label>
            <UiInput
              type="text"
              value={registerForm.name}
              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              placeholder="Tu Nombre y Apellido"
              iconPrefix={<User size={16} className="text-slate-400" />}
              size="2"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Razón Social / Nombre Comercial
            </label>
            <UiInput
              type="text"
              value={registerForm.companyName}
              onChange={(e) => setRegisterForm({ ...registerForm, companyName: e.target.value })}
              placeholder="Ej. Mi Negocio S.A.S"
              iconPrefix={<Building size={16} className="text-slate-400" />}
              size="2"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Correo Corporativo
            </label>
            <UiInput
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              placeholder="correo@empresa.com"
              iconPrefix={<Mail size={16} className="text-slate-400" />}
              size="2"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Contraseña
            </label>
            <UiInput
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              iconPrefix={<Lock size={16} className="text-slate-400" />}
              minLength={6}
              size="2"
              required
              className="w-full"
            />
          </div>

          {registerError && (
            <div className="p-3.5 rounded-xl bg-[#fff0f5] border border-[#fbc6d9] text-[#b22456] text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#d9306b]" />
              <span className="leading-relaxed">{registerError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isRegistering}
            className="w-full bg-[#1b1b1b] hover:bg-black text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-none"
          >
            {isRegistering ? (
              <>
                <RefreshCw size={15} className="animate-spin text-white" />
                <span>Creando cuenta...</span>
              </>
            ) : (
              <>
                <span>Empezar Prueba Gratuita</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            ¿Ya tienes una cuenta?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-bold text-[#006a43] hover:text-[#004227] hover:underline cursor-pointer focus:outline-none ml-1 transition-colors"
            >
              Inicia sesión
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-[460px] text-center pb-2 pt-4 space-y-1">
        <p className="text-xs text-slate-500 font-medium">
          Facturación SRI • Multiempresa • Inventario • Bancos
        </p>
        <p className="text-[11px] text-slate-400">
          © {new Date().getFullYear()} WebFix. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
