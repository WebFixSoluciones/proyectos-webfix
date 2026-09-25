import { UiInput } from '../components/ui/controls';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, RefreshCw, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginPage({ showToast, companyProfile }) {
  const navigate = useNavigate();
  const { profileError } = useAuth();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setLoginError('');

    try {
      await signInWithEmailAndPassword(auth, loginForm.email.trim(), loginForm.password);
      showToast?.("Sesión iniciada correctamente", "success");
      navigate('/app');
    } catch (error) {
      console.error('Login error:', error.code);
      const errorMessages = {
        'auth/invalid-email': 'El correo electrónico no es válido.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/user-not-found': 'No existe una cuenta con ese correo.',
        'auth/wrong-password': 'La contraseña ingresada es incorrecta.',
        'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Espera un momento e intenta de nuevo.',
        'auth/network-request-failed': 'Error de red. Verifica tu conexión a internet.',
      };
      setLoginError(errorMessages[error.code] || 'Error al iniciar sesión. Verifica tus credenciales.');
      showToast?.("Error al iniciar sesión", "error");
    } finally {
      setIsAuthenticating(false);
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

      {/* Top Bar / Branding */}
      <div className="w-full max-w-[440px] flex justify-between items-center pt-2 sm:pt-4">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Ir a inicio"
        >
          <div className="w-8 h-8 rounded-xl bg-[#006a43] text-white flex items-center justify-center font-bold text-sm tracking-tight transition-transform group-hover:scale-105 shadow-none">
            W
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-lg">
              WebFix
            </span>
            <span className="text-[11px] font-bold text-[#006a43] bg-[#e8fedf] px-1.5 py-0.5 rounded-md">
              ERP
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-[#b3f4cb] dark:border-emerald-900/50 text-[11px] font-semibold text-[#006a43] dark:text-emerald-400">
          <ShieldCheck size={13} className="text-[#006a43] dark:text-emerald-400" />
          <span>SRI Ecuador</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-[440px] p-7 sm:p-9 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl duration-200">
        {/* Brand / Header */}
        <div className="mb-6 text-left">
          {companyProfile?.logoUrl ? (
            <img src={companyProfile.logoUrl} alt="Logo" className="max-h-12 object-contain mb-3" />
          ) : (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8fedf] text-[#006a43] flex items-center justify-center font-bold">
                <ShieldCheck size={18} />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {companyProfile?.companyName || 'Web Fix Soluciones'}
              </span>
            </div>
          )}

          <h1 className="font-extrabold text-2xl sm:text-3xl text-slate-950 dark:text-white tracking-tight">
            Iniciar sesión
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            Ingresa tus credenciales para acceder a tu plataforma empresarial.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          {/* Email Field */}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Correo Electrónico
            </label>
            <UiInput
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              placeholder="tu-correo@empresa.com"
              iconPrefix={<Mail size={16} className="text-slate-400" />}
              size="2"
              required
              autoFocus
              className="w-full"
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => showToast?.('Comunícate con tu administrador para restablecer tu contraseña', 'info')}
                className="text-xs font-semibold text-[#006a43] hover:text-[#004227] hover:underline cursor-pointer focus:outline-none"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <UiInput
              type={showPassword ? 'text' : 'password'}
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="••••••••••••"
              iconPrefix={<Lock size={16} className="text-slate-400" />}
              iconSuffix={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer focus:outline-none flex items-center justify-center transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              size="2"
              required
              className="w-full"
            />
          </div>

          {/* Error Alert Box */}
          {(loginError || profileError) && (
            <div className="p-3.5 rounded-xl bg-[#fff0f5] border border-[#fbc6d9] text-[#b22456] text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#d9306b]" />
              <span className="leading-relaxed">{loginError || profileError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full bg-[#1b1b1b] hover:bg-black text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-none"
          >
            {isAuthenticating ? (
              <>
                <RefreshCw size={15} className="animate-spin text-white" />
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer: Register link */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            ¿No tienes una cuenta aún?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-bold text-[#006a43] hover:text-[#004227] hover:underline cursor-pointer focus:outline-none ml-1 transition-colors"
            >
              Regístrate gratis
            </button>
          </p>
        </div>
      </div>

      {/* Footer / Security & Copyright */}
      <div className="w-full max-w-[440px] text-center pb-2 pt-4 space-y-1">
        <p className="text-xs text-slate-500 font-medium">
          Plataforma de Facturación Electrónica y Control Empresarial SRI
        </p>
        <p className="text-[11px] text-slate-400">
          © {new Date().getFullYear()} WebFix. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
