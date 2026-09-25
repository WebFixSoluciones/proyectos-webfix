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

      {/* 5. FOOTER ESTILO BREVO EXACTO AL 90% */}
      <footer className="pt-16 pb-12 shrink-0 mt-auto border-t border-slate-200/80 bg-[#F6FAF6] text-slate-700">
        <div className="w-[90%] max-w-[1720px] mx-auto">
          
          {/* Fila Superior: Logotipo a la Izquierda y Redes Sociales a la Derecha */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-10 border-b border-slate-200/70">
            {/* Logotipo Brevo Style */}
            <Link to="/" className="flex items-center gap-2 group select-none">
              <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-[#0B5D3A]">
                WebFix
              </span>
            </Link>

            {/* Redes Sociales a la Derecha (X, LinkedIn, Instagram, YouTube, Facebook, TikTok) */}
            <div className="flex items-center gap-5 sm:gap-6 text-slate-800">
              {/* X / Twitter */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="hover:text-[#0B5D3A] transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="hover:text-[#0B5D3A] transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-[#0B5D3A] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="hover:text-[#0B5D3A] transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="hover:text-[#0B5D3A] transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="hover:text-[#0B5D3A] transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* 5 Columnas de Enlaces Limpias */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-10 pt-12 pb-12 text-left">
            
            {/* Columna 1: PRODUCTO */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 mb-4">
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
                    Flujo de Caja & Bancos
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Kardex & Inventario
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Captura Inteligente OCR
                  </Link>
                </li>
                <li>
                  <Link to="/precios" className="hover:text-slate-950 transition-colors">
                    Precios y Planes
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Firma Electrónica .p12
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Seguridad Cloud
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Novedades 2026
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 2: PARA EMPEZAR */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 mb-4">
                Para empezar
              </h4>
              <ul className="flex flex-col space-y-2.5 text-sm">
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Para Comercios & Tiendas
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Para Servicios Profesionales
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Para Distribuidoras
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    WebFix vs Sistemas de Escritorio
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Cobro Rápido F12
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Ticket Térmico 80mm
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Migración de Datos
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-[#0B5D3A] font-semibold transition-colors">
                    Crear Cuenta Gratis
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 3: RECURSOS */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 mb-4">
                Recursos
              </h4>
              <ul className="flex flex-col space-y-2.5 text-sm">
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Centro de Ayuda
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Estado del Servicio SRI
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Tutoriales y Guías
                  </Link>
                </li>
                <li>
                  <Link to="/precios" className="hover:text-slate-950 transition-colors">
                    Guía Régimen RIMPE
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Glosario Tributario
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Plantillas Excel para Productos
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Calculadora de IVA 15%
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Comunidad de Usuarios
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 4: PARTNERS */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 mb-4">
                Partners
              </h4>
              <ul className="flex flex-col space-y-2.5 text-sm">
                <li>
                  <a
                    href="https://srienlinea.sri.gob.ec"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-950 transition-colors"
                  >
                    Portal SRI Ecuador
                  </a>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Programa para Contadores
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Distribuidores Autorizados
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Integración con Hardware POS
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Desarrolladores & APIs
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Alianzas Estratégicas
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 5: EMPRESA */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 mb-4">
                Empresa
              </h4>
              <ul className="flex flex-col space-y-2.5 text-sm">
                <li>
                  <Link to="/nosotros" className="hover:text-slate-950 transition-colors">
                    Sobre nosotros
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Contáctanos
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Soporte Técnico
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Trabaja con nosotros
                  </Link>
                </li>
                <li>
                  <Link to="/contacto" className="hover:text-slate-950 transition-colors">
                    Prensa
                  </Link>
                </li>
                <li>
                  <Link to="/soluciones" className="hover:text-slate-950 transition-colors">
                    Compromiso Cero Papel
                  </Link>
                </li>
                <li>
                  <Link to="/precios" className="hover:text-slate-950 transition-colors">
                    Preguntas Frecuentes
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Línea Divisoria Inferior Brevo Style */}
          <div className="pt-8 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            {/* Enlaces Legales a la Izquierda */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-5 sm:gap-7">
              <a href="#cookies" className="hover:text-slate-950 transition-colors">
                Cookies
              </a>
              <a href="#antispam" className="hover:text-slate-950 transition-colors">
                Política anti-spam
              </a>
              <a href="#privacidad" className="hover:text-slate-950 transition-colors">
                Privacidad
              </a>
              <a href="#terminos" className="hover:text-slate-950 transition-colors">
                Términos y condiciones
              </a>
              <a href="#aviso-legal" className="hover:text-slate-950 transition-colors">
                Aviso legal
              </a>
              <a href="#seguridad" className="hover:text-slate-950 transition-colors">
                Seguridad SRI
              </a>
            </div>

            {/* Copyright a la Derecha */}
            <div className="text-slate-500 text-center sm:text-right shrink-0">
              © WebFix 2026. Todos los derechos reservados.
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
