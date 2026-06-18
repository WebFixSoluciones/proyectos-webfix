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
    <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-[#F2F4FF] text-black font-sans scroll-smooth custom-scrollbar light-scrollbar flex flex-col justify-between relative">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b bg-[#F2F4FF]/85 border-[#CAD1F4] shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 cursor-pointer decoration-none">
            <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-base font-black tracking-tight text-black">WebFix ERP</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-gray-500">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link 
                  key={link.path}
                  to={link.path}
                  className={`transition-colors cursor-pointer decoration-none ${isActive ? 'text-primary' : 'hover:text-primary text-gray-500'}`}
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
              className="px-4 py-2 text-xs font-bold rounded-xl transition-all border border-[#CAD1F4] bg-white hover:bg-slate-50 text-black cursor-pointer"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate('/register')} 
              className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-[#1633c1] rounded-xl transition-all cursor-pointer"
            >
              Registrarse
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg border border-[#CAD1F4] bg-white text-gray-700 md:hidden cursor-pointer"
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
                  className={`text-left text-sm font-bold py-2 ${isActive ? 'text-primary' : 'text-gray-600'}`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
              className="w-full py-3 text-xs font-bold border border-[#CAD1F4] rounded-xl text-center bg-white text-black"
            >
              Entrar al ERP
            </button>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
              className="w-full py-3 text-xs font-bold bg-primary text-white rounded-xl text-center"
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
      <footer className="border-t py-8 bg-white border-[#CAD1F4] text-slate-500 shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold text-black">WebFix ERP</span>
          </div>
          <div className="flex gap-6 text-gray-500 font-semibold mb-2 md:mb-0">
            <Link to="/soluciones" className="hover:text-primary decoration-none">Soluciones</Link>
            <Link to="/precios" className="hover:text-primary decoration-none">Planes</Link>
            <Link to="/nosotros" className="hover:text-primary decoration-none">Nosotros</Link>
            <Link to="/contacto" className="hover:text-primary decoration-none">Contacto</Link>
          </div>
          <p className="text-[11px]">© WebFix 2026. Todos los derechos reservados. Diseñado en Ecuador.</p>
        </div>
      </footer>

    </div>
  );
}
