import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function LandingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Inicio' },
    { path: '/soluciones', label: 'Soluciones' },
    { path: '/precios', label: 'Planes y Precios' },
    { path: '/nosotros', label: 'Nosotros' },
    { path: '/contacto', label: 'Contacto' }
  ];

  const handleMobileLinkClick = (path) => {
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto overflow-x-hidden bg-[#F8FAFC] text-[#0F172A] font-sans scroll-smooth custom-scrollbar light-scrollbar flex flex-col justify-between relative">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-lg border-b bg-[#F8FAFC]/90 border-slate-200/80 shrink-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 cursor-pointer decoration-none group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight text-[#0F172A] transition-colors duration-200 group-hover:text-primary">
              WebFix <span className="text-primary/80 font-medium text-sm">ERP</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-wider">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link 
                  key={link.path}
                  to={link.path}
                  className={`transition-colors cursor-pointer decoration-none ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-slate-500 hover:text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
 
          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')} 
              className="landing-button-secondary px-5 py-2.5 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate('/register')} 
              className="landing-button-primary px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-[#1633c1] cursor-pointer"
            >
              Registrarse
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

        </div>
      </header>

      {/* MOBILE NAV OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-white z-40 flex flex-col p-6 space-y-4 md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-4 border-b border-slate-100 pb-6">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleMobileLinkClick(link.path)}
                  className={`text-left text-sm font-bold py-2 ${isActive ? 'text-primary' : 'text-slate-650'}`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
              className="w-full py-3.5 text-xs font-bold border border-slate-200 rounded-xl text-center bg-white text-slate-800"
            >
              Entrar al ERP
            </button>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
              className="w-full py-3.5 text-xs font-bold bg-primary text-white rounded-xl text-center"
            >
              Registrar Negocio
            </button>
          </div>
        </div>
      )}

      {/* ROUTE DYNAMIC CHILDREN */}
      <main className="flex-1 shrink-0">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="border-t py-12 bg-white border-slate-100 text-slate-500 shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-left">
            {/* Brand Column */}
            <div className="md:col-span-1 flex flex-col items-start gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="font-black text-[#0F172A] tracking-tight">WebFix ERP</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-[200px]">
                Plataforma de facturación electrónica y control financiero para emprendedores ecuatorianos en cumplimiento con el SRI.
              </p>
            </div>
            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-4">Explorar</h4>
              <div className="flex flex-col gap-2.5 text-[11px] font-semibold">
                <Link to="/" className="text-slate-500 hover:text-primary decoration-none">Inicio</Link>
                <Link to="/soluciones" className="text-slate-500 hover:text-primary decoration-none">Módulos</Link>
                <Link to="/precios" className="text-slate-500 hover:text-primary decoration-none">Planes y Precios</Link>
              </div>
            </div>
            {/* Legals */}
            <div>
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-4">Soporte y Normas</h4>
              <div className="flex flex-col gap-2.5 text-[11px] font-semibold">
                <a href="https://srienlinea.sri.gob.ec" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-primary decoration-none">SRI del Ecuador</a>
                <Link to="/contacto" className="text-slate-500 hover:text-primary decoration-none">Contacto y Soporte</Link>
                <Link to="/nosotros" className="text-slate-500 hover:text-primary decoration-none">Sobre Nosotros</Link>
              </div>
            </div>
            {/* Tech Specs */}
            <div>
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-4">Tecnología</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Infraestructura en la nube segura con firmas electrónicas en formato digital p12. 100% libre de instalaciones físicas.
              </p>
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold">
            <p className="text-[10px] text-slate-400">© 2026 WebFix. Todos los derechos reservados. Diseñado para emprendedores ecuatorianos.</p>
            <div className="flex gap-4 text-[10px] text-slate-400">
              <a href="#terminos" className="hover:text-primary decoration-none">Términos y condiciones</a>
              <span>•</span>
              <a href="#privacidad" className="hover:text-primary decoration-none">Política de privacidad</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
