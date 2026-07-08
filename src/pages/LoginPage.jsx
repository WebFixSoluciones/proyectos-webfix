import React, { useState } from'react';
import { useNavigate } from'react-router-dom';
import { User, Lock, Eye, EyeOff, RefreshCw } from'lucide-react';
import { signInWithEmailAndPassword } from'firebase/auth';
import { auth } from'../firebase';

export default function LoginPage({ showToast, companyProfile }) {
 const navigate = useNavigate();
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
 <div className="flex items-center justify-center min-h-screen w-full font-sans overflow-hidden transition-colors duration-500 relative z-0 text-gray-800">
 
 {/* BASE BACKGROUND SOLID COLOR */}
 <div className="absolute inset-0 -z-20 transition-colors duration-500 bg-surface-bg" />

 {/* GLOBAL BACKGROUND BLOBS (Minimalismo Líquido Puro) */}
 <div className="absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full filter blur-[130px] pointer-events-none -z-10 transition-all duration-500 animate-liquid-1 mix-blend-multiply bg-purple-200/45 opacity-50"></div>
 <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] rounded-full filter blur-[120px] pointer-events-none -z-10 transition-all duration-500 animate-liquid-2 mix-blend-multiply bg-blue-100/45 opacity-55"></div>
 <div className="absolute bottom-[-10%] left-[10%] w-[38rem] h-[38rem] rounded-full filter blur-[140px] pointer-events-none -z-10 transition-all duration-500 animate-liquid-3 mix-blend-multiply bg-rose-100/40 opacity-45"></div>
 
 {/* HOUDINI RING PARTICLES (Google Antigravity Particles Effect) */}
 <div className="absolute inset-0 pointer-events-none -z-10 ring-particles-bg-1 animate-ring-particles-1 opacity-70" />
 <div className="absolute inset-0 pointer-events-none -z-10 ring-particles-bg-2 animate-ring-particles-2 opacity-70" />
 
 {/* Card Centrado (Estilo Profesional Alineado a la Izquierda) */}
 <div className="w-full max-w-[420px] mx-4 relative group select-none">
 {/* Subtle Backglow */}
 <div className="absolute inset-0 rounded-btn bg-gradient-to-tr from-primary/10 to-primary-muted blur-xl opacity-60 pointer-events-none"></div>
 
 {/* La tarjeta principal */}
 <div className="w-full p-8 sm:p-10 rounded-btn flex flex-col border transition-all duration-500 relative z-10 bg-white/95 border-slate-200/60">
 
 {/* Header de la Empresa o Web Fix */}
 <div className="text-left mb-8 select-none">
 {companyProfile?.logoUrl ? (
 <img src={companyProfile.logoUrl} alt="Logo de la Empresa" className="max-h-12 object-contain mb-4" />
 ) : (
 <div className="flex items-center gap-2.5 mb-5 select-none">
 <div className="w-9 h-9 rounded-btn bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
 <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
 </svg>
 </div>
 <span className="text-2xl font-black tracking-tight text-black">
 Web Fix
 </span>
 </div>
 )}
 <span className="text-xl font-medium leading-none block text-black">
 Iniciar sesión
 </span>
 </div>
 
 <form onSubmit={handleLogin} className="space-y-5 text-left">
 <div>
 <label className="block text-sm font-normal mb-1.5 text-black">
 Correo Electrónico
 </label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors text-black">
 <User size={16} />
 </div>
 <input 
 type="email" 
 value={loginForm.email}
 onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
 className="w-full text-xs font-medium tracking-wide pl-11 pr-3.5 py-3.5 rounded-btn outline-none transition-all border bg-surface-bg border-slate-300 text-black focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white" 
 placeholder="correo@ejemplo.com" 
 required
 />
 </div>
 </div>
 
 <div>
 <label className="block text-sm font-normal mb-1.5 text-black">
 Contraseña
 </label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors text-black">
 <Lock size={16} />
 </div>
 <input 
 type={showPassword ?"text" :"password"}
 value={loginForm.password}
 onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
 className="w-full text-xs font-medium tracking-wide pl-11 pr-10 py-3.5 rounded-btn outline-none transition-all border bg-surface-bg border-slate-300 text-black focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white" 
 placeholder="••••••••••••" 
 required
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-black/60 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
 >
 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
 </button>
 </div>
 
 {/* Olvidaste tu contraseña */}
 <div className="flex justify-end mt-2">
 <button
 type="button"
 onClick={() => showToast('Comunícate con soporte para recuperar tu contraseña','info')}
 className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
 >
 ¿Olvidaste tu contraseña?
 </button>
 </div>
 </div>
 
 {loginError && (
 <div className="p-3 rounded-btn text-xs font-semibold tracking-wide flex items-center justify-center text-center animate-in fade-in duration-300 border bg-red-50 text-red-650 border-red-100">
 {loginError}
 </div>
 )}
 
 <button 
 type="submit" 
 disabled={isAuthenticating}
 className="w-full flex items-center justify-center gap-2 mt-6 py-4 rounded-btn text-xs font-bold tracking-wider uppercase transition-all duration-300 active:scale-98 disabled:opacity-70 disabled:hover:scale-100 bg-primary hover:bg-primary-hover text-white hover:scale-[1.01]"
 >
 {isAuthenticating ? (
 <>
 <RefreshCw size={14} className="animate-spin" /> Verificando...
 </>
 ) : (
 <>
 INICIAR SESIÓN
 </>
 )}
 </button>
 </form>
 
 {/* Footer con Registro */}
 <div className="mt-6 text-center">
 <p style={{ fontSize:'12px', color:'#000000' }} className="font-normal select-none">
 ¿No tienes una cuenta?{''}
 <span 
 onClick={() => navigate('/register')}
 className="font-bold text-primary hover:underline cursor-pointer"
 >
 Regístrate
 </span>
 </p>
 </div>
 </div>
 </div>

 {/* Derechos Reservados como Pie de Página */}
 <div className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none">
 <p style={{ fontSize:'12px', color:'#000000' }} className="font-normal select-none pointer-events-auto">
 © WebFix 2026. Todos los derechos reservados
 </p>
 </div>

 </div>
 );
}
