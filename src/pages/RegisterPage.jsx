import { UiBox, UiCard, UiText, UiLabel, UiHeading } from '../components/ui/layout';
import { UiInput, UiButton } from '../components/ui/controls';
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
    <UiBox className="min-h-screen w-full flex flex-col justify-between items-center bg-[var(--gray-1)] text-[var(--gray-12)] relative overflow-hidden p-4 sm:p-6 select-none">
      {/* Background Subtle Pattern */}
      <UiBox 
        className="absolute inset-0 pointer-events-none opacity-40 -z-10" 
        style={{
          backgroundImage: 'radial-gradient(var(--gray-a5) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Bar Branding */}
      <UiBox className="w-full max-w-[460px] flex justify-between items-center pt-2 sm:pt-4">
        <UiBox className="flex items-center gap-2">
          <UiBox className="w-8 h-8 rounded-lg bg-[var(--blue-9)] text-white flex items-center justify-center font-bold text-sm">
            W
          </UiBox>
          <UiText size="2" weight="bold" color="gray" highContrast>
            WebFix ERP
          </UiText>
        </UiBox>
        <UiBox className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--blue-3)] text-[var(--blue-11)] text-[11px] font-semibold">
          <ShieldCheck size={12} />
          <span>Prueba 14 días gratis</span>
        </UiBox>
      </UiBox>

      {/* Main Card */}
      <UiCard className="w-full max-w-[460px] p-6 sm:p-8 bg-[var(--color-panel-solid)] rounded-2xl duration-300">
        <UiBox className="text-left mb-6 select-none">
          <UiHeading as="h1" size="5" weight="bold" color="gray" highContrast className="tracking-tight">
            Crear cuenta de empresa
          </UiHeading>
          <UiText size="2" color="gray" className="mt-1 block">
            Plan seleccionado: <span className="font-semibold text-[var(--blue-11)]">{getPlanName(planParam)}</span>
          </UiText>
        </UiBox>

        <form onSubmit={handleRegister} className="space-y-4 text-left">
          <UiBox>
            <UiLabel size="1" weight="bold" color="gray" highContrast className="block mb-1 text-[11px] uppercase tracking-wider">
              Nombre del Administrador
            </UiLabel>
            <UiInput
              type="text"
              value={registerForm.name}
              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              placeholder="Tu Nombre y Apellido"
              iconPrefix={<User size={15} className="text-[var(--gray-10)]" />}
              size="2"
              required
              className="w-full"
            />
          </UiBox>

          <UiBox>
            <UiLabel size="1" weight="bold" color="gray" highContrast className="block mb-1 text-[11px] uppercase tracking-wider">
              Razón Social / Nombre Comercial
            </UiLabel>
            <UiInput
              type="text"
              value={registerForm.companyName}
              onChange={(e) => setRegisterForm({ ...registerForm, companyName: e.target.value })}
              placeholder="Ej. Mi Negocio S.A.S"
              iconPrefix={<Building size={15} className="text-[var(--gray-10)]" />}
              size="2"
              required
              className="w-full"
            />
          </UiBox>

          <UiBox>
            <UiLabel size="1" weight="bold" color="gray" highContrast className="block mb-1 text-[11px] uppercase tracking-wider">
              Correo Corporativo
            </UiLabel>
            <UiInput
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              placeholder="correo@empresa.com"
              iconPrefix={<Mail size={15} className="text-[var(--gray-10)]" />}
              size="2"
              required
              className="w-full"
            />
          </UiBox>

          <UiBox>
            <UiLabel size="1" weight="bold" color="gray" highContrast className="block mb-1 text-[11px] uppercase tracking-wider">
              Contraseña
            </UiLabel>
            <UiInput
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              iconPrefix={<Lock size={15} className="text-[var(--gray-10)]" />}
              minLength={6}
              size="2"
              required
              className="w-full"
            />
          </UiBox>

          {registerError && (
            <UiBox className="p-3 rounded-lg bg-[var(--red-3)] border border-[var(--red-6)] text-[var(--red-11)] text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle size={15} className="shrink-0 text-[var(--red-11)]" />
              <span>{registerError}</span>
            </UiBox>
          )}

          <UiButton
            type="submit"
            disabled={isRegistering}
            variant="solid"
            color="blue"
            size="3"
            className="w-full flex items-center justify-center gap-2 mt-4 font-semibold cursor-pointer transition-transform active:scale-[0.99]"
          >
            {isRegistering ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Creando cuenta...</span>
              </>
            ) : (
              <>
                <span>Empezar Prueba Gratuita</span>
                <ArrowRight size={15} />
              </>
            )}
          </UiButton>
        </form>

        <UiBox className="mt-6 pt-5 border-t border-[var(--gray-a4)] text-center">
          <UiText size="2" color="gray">
            ¿Ya tienes una cuenta?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-bold text-[var(--blue-11)] hover:underline cursor-pointer focus:outline-none ml-1"
            >
              Inicia sesión
            </button>
          </UiText>
        </UiBox>
      </UiCard>

      {/* Footer */}
      <UiBox className="w-full max-w-[460px] text-center pb-2 pt-4">
        <UiText size="1" color="gray" className="block text-[11px] opacity-80">
          © {new Date().getFullYear()} WebFix. Todos los derechos reservados.
        </UiText>
      </UiBox>
    </UiBox>
  );
}
