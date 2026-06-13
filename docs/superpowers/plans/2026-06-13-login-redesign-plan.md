# Rediseño de Login Split-Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la pantalla de inicio de sesión de la aplicación ERP WebFix para implementar una estética Split-Screen responsiva de alta gama con un showcase de marca a la izquierda y un formulario glassmorphism elegante a la derecha.

**Architecture:** Se utilizará una grilla de Tailwind CSS de 12 columnas. En dispositivos móviles, se ocultará el panel de showcase y el formulario tomará todo el ancho de pantalla.

**Tech Stack:** React, Tailwind CSS, Lucide React, Firebase Auth.

---

### Task 1: Reemplazar el Marcado del Login en `src/App.jsx`

**Files:**
- Modify: `src/App.jsx:1684-1779`

- [ ] **Step 1: Reemplazar el bloque condicional del Login por el nuevo diseño Split-Screen**

Modificar la sección `if (!isAuthenticated)` en `src/App.jsx` con el siguiente código optimizado:

```javascript
  // --- PANTALLA DE LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen w-full font-sans overflow-hidden transition-colors duration-500 relative z-0 flex ${isDarkMode ? 'bg-[#020204] text-gray-100' : 'bg-slate-50 text-gray-800'}`}>
        
        {/* PANEL IZQUIERDO: SHOWCASE DE MARCA */}
        <div className={`hidden md:flex md:w-[42%] lg:w-[36%] xl:w-[30%] shrink-0 flex-col justify-between p-10 relative overflow-hidden border-r select-none ${isDarkMode ? 'bg-[#09090b] border-white/5' : 'bg-white border-slate-200'}`}>
          {/* Blobs de fondo decorativos del panel de marca */}
          <div className="absolute top-[-20%] left-[-20%] w-[120%] h-[80%] rounded-full mix-blend-screen filter blur-[90px] opacity-20 pointer-events-none -z-10 bg-purple-600"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[120%] h-[80%] rounded-full mix-blend-screen filter blur-[90px] opacity-25 pointer-events-none -z-10 bg-primary"></div>

          {/* Logo y Nombre de Marca */}
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl border shadow-inner ${isDarkMode ? 'bg-white/5 border-white/10 text-primary' : 'bg-primary/10 border-primary/20 text-primary'}`}>
              <Lock size={22} className="animate-pulse" />
            </div>
            <div>
              <span className={`text-base font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>WebFix ERP</span>
              <p className={`text-[10px] font-semibold tracking-wider uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Gestión Empresarial</p>
            </div>
          </div>

          {/* Slogan y Beneficios */}
          <div className="my-auto space-y-8 max-w-[280px]">
            <div className="space-y-3">
              <h1 className={`text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Control total de tu negocio
              </h1>
              <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-550'}`}>
                Una plataforma integrada para simplificar tus finanzas, ventas y proyectos cotidianos.
              </p>
            </div>

            {/* Listado de Beneficios */}
            <div className="space-y-5">
              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 p-1.5 rounded-lg border ${isDarkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-650'}`}>
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>Seguridad en la Nube</h4>
                  <p className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-450'}`}>Tus datos resguardados y sincronizados de forma segura.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 p-1.5 rounded-lg border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-650'}`}>
                  <Sparkles size={14} />
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>Asistente IA</h4>
                  <p className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-450'}`}>Generación de resúmenes de proyectos y consejos inteligentes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 p-1.5 rounded-lg border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-650'}`}>
                  <TrendingUp size={14} />
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>Ventas e Inventario</h4>
                  <p className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-450'}`}>Punto de Venta (POS) y Kardex de productos integrados.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer del panel izquierdo */}
          <div className="pt-6 border-t border-dashed border-current/10">
            <p className={`text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-gray-650' : 'text-gray-400'}`}>
              Agencia WebFix &copy; 2026
            </p>
          </div>
        </div>

        {/* PANEL DERECHO: FORMULARIO DE ACCESO */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-10 relative overflow-hidden min-h-screen">
          {/* Blobs de fondo decorativos en panel derecho */}
          <div className={`absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[120px] opacity-25 pointer-events-none -z-10 ${isDarkMode ? 'bg-purple-900' : 'bg-purple-200'}`}></div>
          <div className={`absolute bottom-[-10%] left-[10%] w-[40rem] h-[40rem] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none -z-10 ${isDarkMode ? 'bg-emerald-950' : 'bg-emerald-100'}`}></div>

          {/* Theme Toggle flotante en la esquina */}
          <div className="absolute top-6 right-6 z-20">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={`p-2.5 rounded-xl transition-all active:scale-95 border backdrop-blur-md shadow-sm flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-amber-400 hover:text-amber-300' 
                  : 'bg-white border-slate-200/80 hover:bg-slate-50 text-indigo-600 hover:text-indigo-700'
              }`} 
              title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Formulario Glassmorphism Card */}
          <div className={`w-full max-w-md p-8 md:p-10 rounded-[2.5rem] flex flex-col border shadow-2xl transition-all duration-500 relative z-10 ${
            isDarkMode 
              ? 'bg-[#0c0c0e]/80 border-white/5 shadow-black/80 backdrop-blur-2xl' 
              : 'bg-white/80 border-slate-200/60 shadow-slate-200/50 backdrop-blur-2xl'
          }`}>
            
            {/* Header del Formulario (Solo visible en movil el icono superior) */}
            <div className="flex justify-center mb-6 md:hidden">
              <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/5 text-primary border border-white/10' : 'bg-primary/10 text-primary border border-primary/15'}`}>
                <Lock size={24} />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className={`text-2xl font-extrabold tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Acceso al Sistema
              </h2>
              <p className={`text-xs font-semibold leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Ingresa tus credenciales para continuar al panel de control.
              </p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ml-1 ${isDarkMode ? 'text-gray-450' : 'text-gray-500'}`}>
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Mail size={16} />
                  </div>
                  <input 
                    type="email" 
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    className={`w-full text-xs font-medium tracking-wide pl-11 pr-3.5 py-3.5 rounded-xl outline-none transition-all border ${
                      isDarkMode 
                        ? 'bg-black/35 border-white/5 text-white focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.15)] focus:bg-black/60' 
                        : 'bg-slate-50 border-slate-200/70 text-slate-900 focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.08)] focus:bg-white'
                    }`} 
                    placeholder="admin@agencia.com" 
                    required
                  />
                </div>
              </div>
   
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ml-1 ${isDarkMode ? 'text-gray-450' : 'text-gray-500'}`}>
                  Contraseña
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Key size={16} />
                  </div>
                  <input 
                    type="password" 
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    className={`w-full text-xs font-medium tracking-wide pl-11 pr-3.5 py-3.5 rounded-xl outline-none transition-all border ${
                      isDarkMode 
                        ? 'bg-black/35 border-white/5 text-white focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.15)] focus:bg-black/60' 
                        : 'bg-slate-50 border-slate-200/70 text-slate-900 focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.08)] focus:bg-white'
                    }`} 
                    placeholder="••••••••" 
                    required
                  />
                </div>
              </div>
   
              {loginError && (
                <div className={`p-3 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center text-center animate-in fade-in duration-300 border ${
                  isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-red-50 text-red-650 border-red-100'
                }`}>
                  {loginError}
                </div>
              )}
   
              <button 
                type="submit" 
                disabled={isAuthenticating}
                className={`w-full flex items-center justify-center gap-2 mt-6 py-4 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 shadow-md active:scale-98 disabled:opacity-70 disabled:hover:scale-100 ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-600 text-white shadow-violet-900/10 hover:shadow-violet-900/30 hover:scale-[1.01]' 
                    : 'bg-primary text-white hover:bg-primary-hover hover:scale-[1.01]'
                }`}
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Verificando...
                  </>
                ) : (
                  <>
                    Iniciar Sesión <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer en vista móvil (abajo del formulario) */}
          <div className="mt-8 text-center md:hidden">
            <p className={`text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-gray-650' : 'text-gray-400'}`}>
              Agencia WebFix &copy; 2026
            </p>
          </div>
        </div>

      </div>
    );
  }
```

---

### Task 2: Compilación y Verificación de Estilos

- [ ] **Step 1: Ejecutar la compilación del proyecto**

Ejecutar: `npm run build`
Esperado: Compilación exitosa sin advertencias ni fallos.

- [ ] **Step 2: Commit y despliegue**

```bash
git add src/App.jsx
git commit -m "feat(auth): rediseñar pantalla de login con estructura split-screen premium y moderna"
git push origin main
```
