import { mergeThemeProps } from '../../components/ui/themeProps';
import { UiBox, UiText, UiHeading } from '../../components/ui/layout';
import { UiButton } from '../../components/ui/controls';
import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

export default function LandingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
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
    <UiBox 
      ref={scrollContainerRef}
      {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col justify-between"}}
    >
      
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)","color":"var(--gray-11)"},"className":"px-4 py-1.5 text-center flex items-center justify-center gap-2"}}>
        <UiText {...{"className":"flex h-1.5 w-1.5 animate-pulse"}}></UiText>
        <UiText>Cumplimiento tributario SRI 2026 activo • Firma electrónica .p12 y facturación ilimitada</UiText>
        <Link to="/precios" {...{"style":{"color":"var(--gray-12)"},"className":"hover:underline inline-flex items-center gap-0.5 ml-1"}}>
          Ver planes <ArrowUpRight size={11} />
        </Link>
      </UiBox>

      {/* 2. STICKY NAVBAR (Vercel / Linear Minimalist Style) */}
      <header {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"sticky top-0 z-50 shrink-0"}}>
        <UiBox {...{"className":"max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"}}>
          
          {/* Brand Logo */}
          <Link to="/" {...{"className":"flex items-center gap-2.5 group cursor-pointer select-none"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","color":"var(--color-background)"},"className":"w-7 h-7 flex items-center justify-center transition-transform duration-150 group-hover:scale-105"}}>
              W
            </UiBox>
            <UiBox {...{"className":"flex items-center gap-1.5"}}>
              <UiText {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>WebFix</UiText>
              <UiText {...{"size":"1","weight":"medium","color":"gray","className":"px-1.5 py-0.5"}}>ERP</UiText>
            </UiBox>
          </Link>

          {/* Desktop Navigation Links */}
          <nav {...{"className":"hidden md:flex items-center gap-1"}}>
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link 
                  key={link.path}
                  to={link.path}
                  {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"px-3 py-1.5 duration-120"}, {}, (isActive ? {"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}} : {"style":{"color":"var(--gray-11)"}}))}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
 
          {/* Action Buttons */}
          <UiBox {...{"className":"hidden md:flex items-center gap-2"}}>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/login')} 
              {...{"size":"2","color":"gray"}}
            >
              Iniciar Sesión
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => navigate('/register')} 
              {...{"size":"2"}}
            >
              Comenzar Gratis
            </Button>
          </UiBox>

          {/* Mobile Menu Toggle */}
          <UiButton
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            {...{"variant":"outline","color":"gray","className":"md:hidden cursor-pointer"}}
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </UiButton>

        </UiBox>
      </header>

      {/* MOBILE NAV OVERLAY */}
      {isMobileMenuOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)"},"className":"fixed inset-0 top-20 z-40 flex flex-col p-6 space-y-4 md:hidden animate-in fade-in duration-150"}}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex flex-col space-y-2 pb-4"}}>
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <UiButton
                  key={link.path}
                  onClick={() => handleMobileLinkClick(link.path)}
                  {...mergeThemeProps({"size":"2","className":"text-left"}, {}, (isActive ? {"variant":"soft","color":"gray"} : {"color":"gray"}))}
                >
                  {link.label}
                </UiButton>
              );
            })}
          </UiBox>
          <UiBox {...{"className":"flex flex-col gap-2 pt-2"}}>
            <Button 
              variant="outline"
              onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
              {...{"size":"2","className":"w-full"}}
            >
              Iniciar Sesión
            </Button>
            <Button 
              variant="default"
              onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
              {...{"size":"2","className":"w-full"}}
            >
              Comenzar Gratis
            </Button>
          </UiBox>
        </UiBox>
      )}

      {/* ROUTE DYNAMIC CHILDREN */}
      <main {...{"className":"flex-1 shrink-0"}}>
        <Outlet />
      </main>

      {/* MINIMALIST STARTUP FOOTER */}
      <footer {...{"style":{"borderTop":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"py-12 shrink-0 mt-auto"}}>
        <UiBox {...{"className":"max-w-6xl mx-auto px-4 sm:px-6"}}>
          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-left"}}>
            
            {/* Brand Column */}
            <UiBox {...{"className":"md:col-span-1 space-y-3"}}>
              <UiBox {...{"className":"flex items-center gap-2"}}>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","color":"var(--color-background)"},"className":"w-6 h-6 flex items-center justify-center"}}>
                  W
                </UiBox>
                <UiText {...{"weight":"bold","size":"2","color":"gray","highContrast":true}}>WebFix ERP</UiText>
              </UiBox>
              <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                Plataforma de facturación electrónica y control financiero diseñada para empresas modernas en Ecuador.
              </UiText>
              <UiBox {...{"className":"flex items-center gap-2 pt-1"}}>
                <Badge variant="success" {...{"className":"gap-1 py-0.5 px-2"}}>
                  <UiText {...{"className":"h-1.5 w-1.5"}}></UiText>
                  SRI Online 100%
                </Badge>
              </UiBox>
            </UiBox>

            {/* Product Links */}
            <UiBox>
              <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-3"}}>Producto</UiHeading>
              <UiBox {...{"className":"flex flex-col gap-2"}}>
                <Link to="/" {...{"style":{"color":"var(--gray-11)"}}}>Inicio</Link>
                <Link to="/soluciones" {...{"style":{"color":"var(--gray-11)"}}}>Módulos</Link>
                <Link to="/precios" {...{"style":{"color":"var(--gray-11)"}}}>Planes y Precios</Link>
              </UiBox>
            </UiBox>

            {/* Resources Links */}
            <UiBox>
              <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-3"}}>Recursos</UiHeading>
              <UiBox {...{"className":"flex flex-col gap-2"}}>
                <a href="https://srienlinea.sri.gob.ec" target="_blank" rel="noopener noreferrer" {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center gap-1"}}>
                  Portal SRI Ecuador <ArrowUpRight size={10} />
                </a>
                <Link to="/contacto" {...{"style":{"color":"var(--gray-11)"}}}>Soporte Técnico</Link>
                <Link to="/nosotros" {...{"style":{"color":"var(--gray-11)"}}}>Acerca de WebFix</Link>
              </UiBox>
            </UiBox>

            {/* Technology & Security */}
            <UiBox>
              <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-3"}}>Seguridad</UiHeading>
              <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                Infraestructura cifrada en la nube con firma digital XAdES-BES y almacenamiento seguro de certificados .p12.
              </UiText>
            </UiBox>

          </UiBox>
          
          {/* Bottom Bar */}
          <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-11)"},"className":"pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"}}>
            <UiText as="p">© {new Date().getFullYear()} WebFix Soluciones. Todos los derechos reservados.</UiText>
            <UiBox {...{"className":"flex items-center gap-4"}}>
              <Link to="/contacto" {...{}}>Contacto</Link>
              <UiText>•</UiText>
              <a href="#privacidad" {...{}}>Privacidad</a>
              <UiText>•</UiText>
              <a href="#terminos" {...{}}>Términos</a>
            </UiBox>
          </UiBox>

        </UiBox>
      </footer>

    </UiBox>
  );
}
