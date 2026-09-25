import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';

export default function LandingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const navLinks = [
    { path: '/', label: 'Inicio' },
    { path: '/soluciones', label: 'Soluciones' },
    { path: '/precios', label: 'Precios' },
    { path: '/nosotros', label: 'Nosotros' },
    { path: '/contacto', label: 'Contacto' }
  ];

  const handleMobileLinkClick = (path) => {
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <div
      ref={scrollContainerRef}
      className="min-h-screen w-full flex flex-col justify-between bg-white text-slate-900 overflow-x-hidden selection:bg-[#0F172A] selection:text-white"
    >
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="w-full bg-slate-50 border-b border-slate-200/80">
        <div className="w-[90%] max-w-[1720px] mx-auto py-1.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 font-medium truncate">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">
              Cumplimiento tributario SRI 2026 activo • Facturación ilimitada con firma electrónica .p12
            </span>
          </div>
          <Link
            to="/precios"
            className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-emerald-600 transition-colors shrink-0 ml-3"
          >
            Ver planes <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      {/* 2. STICKY NAVBAR GLASSMORPHISM (MENU SEGUIDO DEL LOGO A LA IZQUIERDA) */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/90 border-b border-slate-200/80 transition-all">
        <div className="w-[90%] max-w-[1720px] mx-auto h-16 flex items-center justify-between">
          
          {/* Bloque Izquierdo: Logo WebFix ERP + Navegación seguida inmediatamente */}
          <div className="flex items-center gap-8 md:gap-10">
            {/* Logo WebFix ERP */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group cursor-pointer select-none"
              aria-label="WebFix ERP Inicio"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm tracking-tight transition-transform duration-150 group-hover:scale-105 shadow-none">
                W
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-lg">
                  WebFix
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  ERP
                </span>
              </div>
            </Link>

            {/* Menú de Navegación Alineado a la Izquierda inmediatamente después del Logo */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-slate-950 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bloque Derecho: Iniciar Sesión + Comenzar Gratis (Estilo Brevo) */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-slate-700 hover:text-slate-950 font-medium text-sm px-3 py-2 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-full bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-none"
            >
              Comenzar Gratis
            </Link>
          </div>

          {/* Botón Menú Móvil */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </header>

      {/* 3. OVERLAY MENÚ MÓVIL */}
      {isMobileMenuOpen && (
        <div id="mobile-nav-menu" className="fixed inset-x-0 top-16 z-40 bg-white/98 backdrop-blur-md border-b border-slate-200 p-6 flex flex-col gap-4 md:hidden shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => handleMobileLinkClick(link.path)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-950 font-semibold'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/login');
              }}
              className="w-full py-2.5 px-4 rounded-lg text-center text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/register');
              }}
              className="w-full py-2.5 px-4 rounded-full text-center text-sm font-medium bg-[#0F172A] hover:bg-slate-800 text-white transition-all shadow-none"
            >
              Comenzar Gratis
            </button>
          </div>
        </div>
      )}

      {/* 4. CONTENIDO DINÁMICO */}
      <main className="flex-1 w-full shrink-0">
        <Outlet />
      </main>

      {/* 5. FOOTER MINIMALISTA AL 90% */}
      <footer className="py-12 shrink-0 mt-auto border-t border-slate-200 bg-white text-slate-600">
        <div className="w-[90%] max-w-[1720px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 mb-10 text-left">
            
            {/* Columna 1: Marca y Estado SRI */}
            <div className="space-y-4">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm tracking-tight">
                  W
                </div>
                <span className="font-bold text-slate-900 text-base tracking-tight">
                  WebFix ERP
                </span>
              </Link>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                Plataforma de facturación electrónica y control financiero diseñada para empresas modernas en Ecuador.
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SRI Online 100% Producción
                </span>
              </div>
            </div>

            {/* Columna 2: Producto */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-4">
                Producto
              </h4>
              <ul className="flex flex-col space-y-2.5 text-sm">
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Facturación SRI
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Punto de Venta POS
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Control Financiero
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Kardex & Inventario
                  </Link>
                </li>
                <li>
                  <Link to="/precios" className="hover:text-slate-950 transition-colors">
                    Planes y Precios
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 3: Empresa */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-4">
                Empresa
              </h4>
              <ul className="flex flex-col space-y-2.5 text-sm">
                <li>
                  <Link to="/nosotros" className="hover:text-slate-950 transition-colors">
                    Acerca de WebFix
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Soporte Técnico
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Contacto Comercial
                  </Link>
                </li>
                <li>
                  <Link to="/precios" className="hover:text-slate-950 transition-colors">
                    Preguntas Frecuentes
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 4: Seguridad & SRI */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-4">
                Seguridad & SRI
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Infraestructura cifrada en la nube con firma digital XAdES-BES y almacenamiento seguro de certificados .p12.
              </p>
              <ul className="flex flex-col space-y-2 text-sm">
                <li>
                  <a
                    href="https://srienlinea.sri.gob.ec"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-slate-950 transition-colors"
                  >
                    Portal SRI Ecuador <ArrowUpRight size={12} />
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Barra Legal Inferior */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} WebFix Soluciones. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4 font-medium">
              <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                Contacto
              </Link>
              <span>•</span>
              <a href="#privacidad" className="hover:text-slate-950 transition-colors">
                Privacidad
              </a>
              <span>•</span>
              <a href="#terminos" className="hover:text-slate-950 transition-colors">
                Términos
              </a>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
