import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

export default function LandingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen w-full bg-white text-text-primary font-sans flex flex-col justify-between selection:bg-primary selection:text-white">
      
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-surface-sidebar border-b border-border-default px-4 py-1.5 text-center text-[11px] font-medium text-text-secondary flex items-center justify-center gap-2">
        <span className="flex h-1.5 w-1.5 rounded-full bg-[#00E4B8] animate-pulse"></span>
        <span>Cumplimiento tributario SRI 2026 activo • Firma electrónica .p12 y facturación ilimitada</span>
        <Link to="/precios" className="text-text-heading font-semibold hover:underline inline-flex items-center gap-0.5 ml-1">
          Ver planes <ArrowUpRight size={11} />
        </Link>
      </div>

      {/* 2. STICKY NAVBAR (Vercel / Linear Minimalist Style) */}
      <header className="sticky top-0 z-50 border-b border-border-default bg-white/90 backdrop-blur-md shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer select-none">
            <div className="w-7 h-7 rounded-md bg-text-heading text-white flex items-center justify-center font-bold text-xs tracking-tight transition-transform duration-150 group-hover:scale-105">
              W
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-text-heading">WebFix</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-surface-sidebar border border-border-default text-text-secondary">ERP</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link 
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-tight transition-all duration-120 ${
                    isActive 
                      ? 'text-text-heading bg-surface-sidebar font-semibold' 
                      : 'text-text-secondary hover:text-text-heading hover:bg-black/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
 
          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/login')} 
              className="text-xs text-text-secondary hover:text-text-heading"
            >
              Iniciar Sesión
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => navigate('/register')} 
              className="text-xs"
            >
              Comenzar Gratis
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-md border border-border-default text-text-secondary md:hidden cursor-pointer hover:bg-surface-sidebar transition-colors"
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

        </div>
      </header>

      {/* MOBILE NAV OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-20 bg-white z-40 flex flex-col p-6 space-y-4 md:hidden border-b border-border-default animate-in fade-in duration-150">
          <div className="flex flex-col space-y-2 border-b border-border-default pb-4">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleMobileLinkClick(link.path)}
                  className={`text-left text-sm font-medium py-2 px-3 rounded-md transition-colors ${
                    isActive ? 'bg-surface-sidebar font-semibold text-text-heading' : 'text-text-secondary'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button 
              variant="outline"
              onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
              className="w-full text-xs"
            >
              Iniciar Sesión
            </Button>
            <Button 
              variant="default"
              onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
              className="w-full text-xs"
            >
              Comenzar Gratis
            </Button>
          </div>
        </div>
      )}

      {/* ROUTE DYNAMIC CHILDREN */}
      <main className="flex-1 shrink-0">
        <Outlet />
      </main>

      {/* MINIMALIST STARTUP FOOTER */}
      <footer className="border-t border-border-default bg-surface-sidebar/60 text-text-secondary py-12 shrink-0 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-left">
            
            {/* Brand Column */}
            <div className="md:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-text-heading text-white flex items-center justify-center font-bold text-xs">
                  W
                </div>
                <span className="font-semibold text-sm text-text-heading tracking-tight">WebFix ERP</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Plataforma de facturación electrónica y control financiero diseñada para empresas modernas en Ecuador.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="success" className="gap-1 text-[10px] py-0.5 px-2 font-normal normal-case">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00E4B8]"></span>
                  SRI Online 100%
                </Badge>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-xs font-semibold text-text-heading tracking-tight uppercase mb-3">Producto</h4>
              <div className="flex flex-col gap-2 text-xs">
                <Link to="/" className="text-text-secondary hover:text-text-heading transition-colors">Inicio</Link>
                <Link to="/soluciones" className="text-text-secondary hover:text-text-heading transition-colors">Módulos</Link>
                <Link to="/precios" className="text-text-secondary hover:text-text-heading transition-colors">Planes y Precios</Link>
              </div>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="text-xs font-semibold text-text-heading tracking-tight uppercase mb-3">Recursos</h4>
              <div className="flex flex-col gap-2 text-xs">
                <a href="https://srienlinea.sri.gob.ec" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-text-heading transition-colors flex items-center gap-1">
                  Portal SRI Ecuador <ArrowUpRight size={10} />
                </a>
                <Link to="/contacto" className="text-text-secondary hover:text-text-heading transition-colors">Soporte Técnico</Link>
                <Link to="/nosotros" className="text-text-secondary hover:text-text-heading transition-colors">Acerca de WebFix</Link>
              </div>
            </div>

            {/* Technology & Security */}
            <div>
              <h4 className="text-xs font-semibold text-text-heading tracking-tight uppercase mb-3">Seguridad</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Infraestructura cifrada en la nube con firma digital XAdES-BES y almacenamiento seguro de certificados .p12.
              </p>
            </div>

          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-border-default pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
            <p>© {new Date().getFullYear()} WebFix Soluciones. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <Link to="/contacto" className="hover:text-text-heading transition-colors">Contacto</Link>
              <span>•</span>
              <a href="#privacidad" className="hover:text-text-heading transition-colors">Privacidad</a>
              <span>•</span>
              <a href="#terminos" className="hover:text-text-heading transition-colors">Términos</a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
