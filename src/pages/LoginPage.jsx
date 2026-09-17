import { UiBox, UiCard, UiText, UiLabel } from '../components/ui/layout';
import { UiInput, UiButton } from '../components/ui/controls';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { useNavigate } from'react-router-dom';
import { User, Lock, Eye, EyeOff, RefreshCw } from'lucide-react';
import { signInWithEmailAndPassword } from'firebase/auth';
import { auth } from'../firebase';

export default function LoginPage({ showToast, companyProfile }) {
 const navigate = useNavigate();
 const { profileError } = useAuth();
 const [loginForm, setLoginForm] = useState({ email:'', password:'' });
 const [loginError, setLoginError] = useState('');
 const [isAuthenticating, setIsAuthenticating] = useState(false);
 const [showPassword, setShowPassword] = useState(false);

 const handleLogin = async (e) => {
 e.preventDefault();
 setIsAuthenticating(true);
 setLoginError('');
 
 try {
 await signInWithEmailAndPassword(auth, loginForm.email.trim(), loginForm.password);
 showToast("Sesión iniciada correctamente","success");
 navigate('/app');
 } catch (error) {
 console.error('Login error:', error.code);
 const errorMessages = {
'auth/invalid-email':'El correo electrónico no es válido.',
'auth/user-disabled':'Esta cuenta ha sido deshabilitada.',
'auth/user-not-found':'No existe una cuenta con ese correo.',
'auth/wrong-password':'Contraseña incorrecta.',
'auth/invalid-credential':'Credenciales inválidas. Verifica tu correo y contraseña.',
'auth/too-many-requests':'Demasiados intentos. Espera un momento e intenta de nuevo.',
'auth/network-request-failed':'Error de red. Verifica tu conexión a internet.',
 };
 setLoginError(errorMessages[error.code] ||'Error al iniciar sesión. Intenta de nuevo.');
 showToast("Error al iniciar sesión","error");
 } finally {
 setIsAuthenticating(false);
 }
 };

 return (
 <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center justify-center min-h-screen w-full overflow-hidden duration-500 relative z-0"}}>
 
 {/* BASE BACKGROUND SOLID COLOR */}
 <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"absolute inset-0 -z-20 duration-500"}} />

 {/* GLOBAL BACKGROUND BLOBS (Minimalismo Líquido Puro) */}
 <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--purple-3)"},"className":"absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] pointer-events-none -z-10 duration-500 animate-liquid-1 mix-blend-multiply opacity-50"}}></UiBox>
 <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)"},"className":"absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] pointer-events-none -z-10 duration-500 animate-liquid-2 mix-blend-multiply opacity-55"}}></UiBox>
 <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)"},"className":"absolute bottom-[-10%] left-[10%] w-[38rem] h-[38rem] pointer-events-none -z-10 duration-500 animate-liquid-3 mix-blend-multiply opacity-45"}}></UiBox>
 
 {/* HOUDINI RING PARTICLES (Google Antigravity Particles Effect) */}
 <UiBox {...{"className":"absolute inset-0 pointer-events-none -z-10 animate-ring-particles-1 opacity-70"}} />
 <UiBox {...{"className":"absolute inset-0 pointer-events-none -z-10 animate-ring-particles-2 opacity-70"}} />
 
 {/* Card Centrado (Estilo Profesional Alineado a la Izquierda) */}
 <UiBox {...{"className":"w-full max-w-[420px] mx-4 relative group select-none"}}>
 {/* Subtle Backglow */}
 <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"absolute inset-0 opacity-60 pointer-events-none"}}></UiBox>
 
 {/* La tarjeta principal */}
 <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full p-8 sm:p-10 flex flex-col duration-500 relative z-10"}}>
 
 {/* Header de la Empresa o Web Fix */}
 <UiBox {...{"className":"text-left mb-8 select-none"}}>
 {companyProfile?.logoUrl ? (
 <img src={companyProfile.logoUrl} alt="Logo de la Empresa" {...{"className":"max-h-12 object-contain mb-4"}} />
 ) : (
 <UiBox {...{"className":"flex items-center gap-2.5 mb-5 select-none"}}>
 <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"w-9 h-9 flex items-center justify-center"}}>
 <svg {...{"style":{"color":"var(--color-background)"},"className":"w-5 h-5"}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
 </svg>
 </UiBox>
 <UiText {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
 Web Fix
 </UiText>
 </UiBox>
 )}
 <UiText {...{"size":"5","weight":"medium","color":"gray","highContrast":true,"className":"leading-none block"}}>
 Iniciar sesión
 </UiText>
 </UiBox>
 
 <form onSubmit={handleLogin} {...{"className":"space-y-5 text-left"}}>
 <UiBox>
 <UiLabel {...{"size":"2","weight":"regular","color":"gray","highContrast":true,"className":"block mb-1.5"}}>
 Correo Electrónico
 </UiLabel>
 <UiBox {...{"className":"relative"}}>
 <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"}}>
 <User size={16} />
 </UiBox>
 <UiInput
 type="email" 
 value={loginForm.email}
 onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
 {...{"size":"2","color":"gray","className":"w-full"}}
 placeholder="correo@ejemplo.com" 
 required
 />
 </UiBox>
 </UiBox>
 
 <UiBox>
 <UiLabel {...{"size":"2","weight":"regular","color":"gray","highContrast":true,"className":"block mb-1.5"}}>
 Contraseña
 </UiLabel>
 <UiBox {...{"className":"relative"}}>
 <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"}}>
 <Lock size={16} />
 </UiBox>
 <UiInput
 type={showPassword ?"text" :"password"}
 value={loginForm.password}
 onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
 {...{"size":"2","color":"gray","className":"w-full"}}
 placeholder="••••••••••••" 
 required
 />
 <UiButton
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 {...{"color":"gray","className":"absolute inset-y-0 right-0 flex items-center"}}
 >
 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
 </UiButton>
 </UiBox>
 
 {/* Olvidaste tu contraseña */}
 <UiBox {...{"className":"flex justify-end mt-2"}}>
 <UiButton
 type="button"
 onClick={() => showToast('Comunícate con soporte para recuperar tu contraseña','info')}
 {...{"size":"2","color":"blue"}}
 >
 ¿Olvidaste tu contraseña?
 </UiButton>
 </UiBox>
 </UiBox>
 
 {(loginError || profileError) && (
 <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-12)"},"className":"p-3 flex items-center justify-center text-center animate-in fade-in duration-300"}}>
 {loginError}
 </UiBox>
 )}
 
 <UiButton
 type="submit" 
 disabled={isAuthenticating}
 {...{"size":"2","variant":"solid","color":"blue","className":"w-full flex items-center justify-center gap-2 mt-6 duration-300 active:scale-98 disabled:opacity-70 disabled:hover:scale-100 hover:scale-[1.01]"}}
 >
 {isAuthenticating ? (
 <>
 <RefreshCw size={14} {...{"className":"animate-spin"}} /> Verificando...
 </>
 ) : (
 <>
 INICIAR SESIÓN
 </>
 )}
 </UiButton>
 </form>
 
 {/* Footer con Registro */}
 <UiBox {...{"className":"mt-6 text-center"}}>
 <UiText as="p" style={{ fontSize:'12px', color:'#000000' }} {...{"weight":"regular","className":"select-none"}}>
 ¿No tienes una cuenta?{''}
 <UiText 
 onClick={() => navigate('/register')}
 {...{"weight":"bold","color":"blue","className":"hover:underline cursor-pointer"}}
 >
 Regístrate
 </UiText>
 </UiText>
 </UiBox>
 </UiCard>
 </UiBox>

 {/* Derechos Reservados como Pie de Página */}
 <UiBox {...{"className":"absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none"}}>
 <UiText as="p" style={{ fontSize:'12px', color:'#000000' }} {...{"weight":"regular","className":"select-none pointer-events-auto"}}>
 © WebFix 2026. Todos los derechos reservados
 </UiText>
 </UiBox>

 </UiBox>
 );
}
