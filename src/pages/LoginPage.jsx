import { UiBox, UiCard, UiText, UiLabel, UiHeading } from '../components/ui/layout';
import { UiInput, UiButton } from '../components/ui/controls';
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
    <UiBox className="min-h-screen w-full flex flex-col justify-between items-center bg-[var(--gray-1)] text-[var(--gray-12)] relative overflow-hidden p-4 sm:p-6 select-none">
      {/* Background Subtle Pattern (Flat Modern Grid) */}
      <UiBox 
        className="absolute inset-0 pointer-events-none opacity-40 -z-10" 
        style={{
          backgroundImage: 'radial-gradient(var(--gray-a5) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Bar / Branding Spacer */}
      <UiBox className="w-full max-w-[420px] flex justify-between items-center pt-2 sm:pt-4">
        <UiBox className="flex items-center gap-2">
          <UiBox className="w-8 h-8 rounded-lg bg-[var(--blue-9)] text-white flex items-center justify-center font-bold text-sm">
            W
          </UiBox>
          <UiText size="2" weight="bold" color="gray" highContrast>
            WebFix ERP
          </UiText>
        </UiBox>
        <UiBox className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--gray-3)] border border-[var(--gray-a4)] text-[11px] font-semibold text-[var(--gray-11)]">
          <ShieldCheck size={12} className="text-[var(--blue-9)]" />
          <span>SRI Ecuador</span>
        </UiBox>
      </UiBox>

      {/* Main Login Card */}
      <UiCard className="w-full max-w-[420px] p-6 sm:p-8 bg-[var(--color-panel-solid)] border border-[var(--gray-a5)] rounded-2xl duration-300">
        {/* Brand / Logo Header */}
        <UiBox className="mb-6 text-left">
          {companyProfile?.logoUrl ? (
            <img src={companyProfile.logoUrl} alt="Logo" className="max-h-12 object-contain mb-3" />
          ) : (
            <UiBox className="flex items-center gap-2 mb-3">
              <UiBox className="w-9 h-9 rounded-lg bg-[var(--blue-3)] text-[var(--blue-11)] flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </UiBox>
              <UiText size="4" weight="bold" color="gray" highContrast>
                {companyProfile?.companyName || 'Web Fix Soluciones'}
              </UiText>
            </UiBox>
          )}

          <UiHeading as="h1" size="5" weight="bold" color="gray" highContrast className="tracking-tight">
            Iniciar sesión
          </UiHeading>
          <UiText size="2" color="gray" className="mt-1 block">
            Ingresa tus credenciales para acceder a tu plataforma empresarial.
          </UiText>
        </UiBox>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          {/* Email Field */}
          <UiBox>
            <UiLabel size="1" weight="bold" color="gray" highContrast className="block mb-1.5 uppercase tracking-wider text-[11px]">
              Correo Electrónico
            </UiLabel>
            <UiInput
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              placeholder="tu-correo@empresa.com"
              iconPrefix={<Mail size={15} className="text-[var(--gray-10)]" />}
              size="2"
              required
              autoFocus
              className="w-full"
            />
          </UiBox>

          {/* Password Field */}
          <UiBox>
            <UiBox className="flex items-center justify-between mb-1.5">
              <UiLabel size="1" weight="bold" color="gray" highContrast className="uppercase tracking-wider text-[11px]">
                Contraseña
              </UiLabel>
              <button
                type="button"
                onClick={() => showToast?.('Comunícate con tu administrador para restablecer tu contraseña', 'info')}
                className="text-[12px] font-medium text-[var(--blue-11)] hover:underline cursor-pointer focus:outline-none"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </UiBox>
            <UiInput
              type={showPassword ? 'text' : 'password'}
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="••••••••••••"
              iconPrefix={<Lock size={15} className="text-[var(--gray-10)]" />}
              iconSuffix={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="text-[var(--gray-10)] hover:text-[var(--gray-12)] p-1 cursor-pointer focus:outline-none flex items-center justify-center transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              size="2"
              required
              className="w-full"
            />
          </UiBox>

          {/* Error Alert Box */}
          {(loginError || profileError) && (
            <UiBox className="p-3 rounded-lg bg-[var(--red-3)] border border-[var(--red-6)] text-[var(--red-11)] text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-[var(--red-11)]" />
              <span>{loginError || profileError}</span>
            </UiBox>
          )}

          {/* Submit Button */}
          <UiButton
            type="submit"
            disabled={isAuthenticating}
            variant="solid"
            color="blue"
            size="3"
            className="w-full font-semibold cursor-pointer flex items-center justify-center gap-2 mt-2 transition-transform duration-150 active:scale-[0.99]"
          >
            {isAuthenticating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight size={15} />
              </>
            )}
          </UiButton>
        </form>

        {/* Footer: Register link */}
        <UiBox className="mt-6 pt-5 border-t border-[var(--gray-a4)] text-center">
          <UiText size="2" color="gray">
            ¿No tienes una cuenta?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-bold text-[var(--blue-11)] hover:underline cursor-pointer focus:outline-none ml-1"
            >
              Regístrate aquí
            </button>
          </UiText>
        </UiBox>
      </UiCard>

      {/* Footer / Copyright & Security */}
      <UiBox className="w-full max-w-[420px] text-center pb-2 pt-4 space-y-1">
        <UiText size="1" color="gray" className="block text-[11px]">
          Plataforma de Facturación Electrónica y Control Empresarial
        </UiText>
        <UiText size="1" color="gray" className="block text-[11px] opacity-80">
          © {new Date().getFullYear()} WebFix. Todos los derechos reservados.
        </UiText>
      </UiBox>
    </UiBox>
  );
}
