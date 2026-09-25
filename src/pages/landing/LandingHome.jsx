import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Check, 
  ShoppingCart, FileText, TrendingUp, Package, 
  CheckCircle2, ChevronDown, Sparkles,
  DollarSign, ShieldCheck, KeyRound,
  Lock, Printer,
  Store, X
} from 'lucide-react';
import { useParallaxScroll } from '../../hooks/useParallaxScroll';
import { ScrollReveal } from '../../components/landing/ScrollReveal';

export default function LandingHome() {
  const navigate = useNavigate();
  const [activeHeroTab, setActiveHeroTab] = useState('sri'); // 'sri' | 'pos' | 'finanzas' | 'inventario'
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [activeSegmentTab, setActiveSegmentTab] = useState('comercios'); // 'comercios' | 'servicios' | 'distribuidoras'

  const heroContainerRef = useRef(null);
  const card1Offset = useParallaxScroll(heroContainerRef, { speed: -0.15, min: -35, max: 35 });
  const card2Offset = useParallaxScroll(heroContainerRef, { speed: 0.12, min: -30, max: 30 });

  const heroTabs = [
    { id: 'sri', label: 'Facturación SRI', icon: FileText },
    { id: 'pos', label: 'Punto de Venta (POS)', icon: ShoppingCart },
    { id: 'finanzas', label: 'Flujo de Caja', icon: TrendingUp },
    { id: 'inventario', label: 'Inventario', icon: Package },
  ];

  const faqs = [
    {
      q: '¿Qué necesito para empezar a emitir facturas con WebFix?',
      a: 'Solo necesitas tu RUC activo y tu archivo de firma electrónica en formato digital (.p12). Lo cargas por única vez en el sistema y queda listo para emitir comprobantes autorizados de inmediato.'
    },
    {
      q: '¿Los comprobantes se envían automáticamente al SRI y al cliente?',
      a: 'Sí. Cada vez que generas una factura, nota de crédito, retención o liquidación, el sistema firma digitalmente el XML, lo autoriza en los servidores del SRI y envía el PDF (RIDE) y el XML al correo del cliente.'
    },
    {
      q: '¿Puedo usar WebFix desde el celular o tablet en mi local?',
      a: 'Totalmente. WebFix es una aplicación web moderna (Cloud) optimizada para funcionar con máxima fluidez en computadoras, laptops, tablets y smartphones sin requerir instalaciones pesadas.'
    },
    {
      q: '¿Existe límite de comprobantes en los planes?',
      a: 'No. Todos nuestros planes incluyen emisión ilimitada de comprobantes electrónicos para que tu negocio crezca sin restricciones de volumen.'
    }
  ];

  const features = [
    {
      id: 'sri',
      icon: FileText,
      iconBg: 'bg-[#f0fdf4] text-[#006a43]',
      title: 'Facturación SRI en 1 Clic',
      description: 'Emite facturas, notas de crédito, retenciones y liquidaciones autorizadas al instante con firma .p12 integrada.',
      cta: 'COMIENZA AHORA ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 font-sans">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-600">
              FAC 001-002-000008453
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c0ffa5] text-[#004227]">
              <CheckCircle2 size={11} className="text-[#006a43]" />
              SRI AUTORIZADO
            </span>
          </div>
          <div className="text-xs text-slate-800 font-medium truncate">
            SUPERMAXI S.A. • RUC 1790016919001
          </div>
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Facturado</span>
            <span className="font-mono font-bold text-slate-900 text-sm">$1,240.50</span>
          </div>
        </div>
      )
    },
    {
      id: 'pos',
      icon: ShoppingCart,
      iconBg: 'bg-[#e6f3ff] text-[#2679c6]',
      title: 'Punto de Venta Ultrarrápido',
      description: 'Diseñado para atención ágil en mostrador con atajo F12, cobro combinado (efectivo, tarjeta, transferencia) y ticket térmico 80mm.',
      cta: 'VER PUNTO DE VENTA ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-[#cce7ff] text-[#0f3050] font-mono font-bold text-[11px]">
                F12
              </span>
              <span className="text-slate-700 font-medium">Cobro Rápido</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Ticket #1042</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Efectivo + Transferencia</span>
            <span className="text-slate-500 font-mono">2 artículos</span>
          </div>
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Cobrado (80mm)</span>
            <span className="font-mono font-bold text-[#2679c6] text-sm">$18.50</span>
          </div>
        </div>
      )
    },
    {
      id: 'finanzas',
      icon: TrendingUp,
      iconBg: 'bg-[#efeefc] text-[#4f46b4]',
      title: 'Flujo de Caja & Cartera Real',
      description: 'Cuentas por cobrar (CxC), cuentas por pagar (CxP), conciliación bancaria automática y saldos en vivo.',
      cta: 'EXPLORAR FINANZAS ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Disponible en Bancos</span>
            <span className="font-mono font-bold text-[#4f46b4] text-sm">$8,240.00</span>
          </div>
          <div className="text-[11px] text-slate-600 flex items-center justify-between">
            <span>Pichincha $5,420 • Guayaquil $2,820</span>
          </div>
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500">Cuentas por Cobrar (CxC)</span>
            <span className="font-mono font-semibold text-slate-900">$3,150.00</span>
          </div>
        </div>
      )
    },
    {
      id: 'inventario',
      icon: Package,
      iconBg: 'bg-[#fcfbe7] text-[#ab7f0a]',
      title: 'Kardex & Stock en Tiempo Real',
      description: 'Control de inventario promedio ponderado con descargas automáticas por ventas y alertas de existencias mínimas.',
      cta: 'VER KARDEX ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Kardex Valorizado</span>
            <span className="font-mono font-bold text-[#ab7f0a] text-sm">$18,920.00</span>
          </div>
          <div className="text-[11px] text-slate-600">
            248 ítems activos en 2 bodegas
          </div>
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500">Estado de Stock</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#faf7c4] text-[#866308]">
              2 bajo mínimo
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'ocr',
      icon: Sparkles,
      iconBg: 'bg-[#f2eafd] text-[#7226d9]',
      title: 'Captura Inteligente OCR',
      description: 'Arrastra facturas de proveedores en PDF, XML o foto. El motor extrae RUC, ítems, IVA y valores automáticamente.',
      cta: 'PROBAR CAPTURA ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-slate-700 truncate max-w-[160px]">
              factura_compra_84.pdf
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e7dafb] text-[#5b1dad]">
              OCR 100%
            </span>
          </div>
          <div className="text-[11px] text-slate-600 truncate">
            RUC 1792049182001 • Base $420.00
          </div>
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500">IVA 15% Calculado</span>
            <span className="font-mono font-bold text-[#7226d9] text-sm">$63.00</span>
          </div>
        </div>
      )
    },
    {
      id: 'seguridad',
      icon: ShieldCheck,
      iconBg: 'bg-[#f0f0f0] text-[#1b1b1b]',
      title: 'Seguridad & Nube 24/7',
      description: 'Certificados digitales protegidos bajo encriptación industrial, copias de seguridad continuas y acceso seguro multiplataforma.',
      cta: 'CONOCE MÁS ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 font-medium">Firma Digital .p12</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
              AES-256
            </span>
          </div>
          <div className="text-[11px] text-slate-600">
            Copias de seguridad continuas en Firebase
          </div>
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500">Disponibilidad Nube</span>
            <span className="font-mono font-bold text-slate-900 text-sm">99.98%</span>
          </div>
        </div>
      )
    },
  ];

  const segmentTabs = [
    { id: 'comercios', label: 'Pequeñas empresas' },
    { id: 'servicios', label: 'Enterprise' },
    { id: 'distribuidoras', label: 'Desarrolladores' },
  ];

  const commercialSegments = {
    comercios: {
      category: 'Para pymes y emprendedores',
      title: 'Herramientas avanzadas, configuración simple',
      description: 'Empieza rápido. Crece con confianza. Atiende mostrador en segundos y mantén tu inventario descargado al día, sin complicaciones.',
      bullets: [
        'Modo mostrador rápido con atajo de teclado F12',
        'Cobro combinado: efectivo, tarjeta y transferencia',
        'Impresión en tickets térmicos de 80mm o 58mm',
        'Arqueo y cierre de caja ciego con control de diferencias'
      ],
      badgeText: 'La Estación',
      badgeSubtext: 'Minimarket & Retail',
      photoUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=600&q=80',
      quote: 'WebFix me ofrece todas las herramientas que necesito para seguir conectado con mis clientes y tener el local en orden, sin dedicar horas a aprender a usarlas.',
      author: 'Carlos Zambrano,',
      company: 'Minimarket La Estación (Quito)'
    },
    servicios: {
      category: 'Para profesionales y consultoras',
      title: 'Facturación SRI ágil, cobranza sin fricción',
      description: 'Emite comprobantes electrónicos con firma .p12 en 1 segundo y automatiza el seguimiento de pagos desde cualquier dispositivo.',
      bullets: [
        'Autorización inmediata en los servidores del SRI',
        'Firma electrónica .p12 protegida en la nube',
        'Envío automático de XML y RIDE al correo del cliente',
        'Seguimiento en vivo de Cuentas por Cobrar (CxC)'
      ],
      badgeText: 'Morales & Asoc.',
      badgeSubtext: 'Consultoría Legal & Tributaria',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
      quote: 'Emito facturas electrónicas desde cualquier lugar y la entrega del XML y RIDE es inmediata. Mis clientes pagan más rápido y mi contabilidad siempre cuadra.',
      author: 'Dra. Andrea Morales,',
      company: 'Morales & Consultores (Guayaquil)'
    },
    distribuidoras: {
      category: 'Para mayoristas y almacenes',
      title: 'Control multibodega, despachos y bancos en vivo',
      description: 'Gestiona existencias en múltiples bodegas, coordina despachos y controla límites de crédito sin riesgo de desabastecimiento.',
      bullets: [
        'Kardex promedio ponderado sincronizado en vivo',
        'Captura inteligente de facturas OCR con IA',
        'Límites de crédito comercial y cartera CxP/CxC',
        'Conciliación multi-cuenta bancaria al centavo'
      ],
      badgeText: 'Viteri Hnos.',
      badgeSubtext: 'Distribuidora Mayorista',
      photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
      quote: 'Coordinar tres almacenes solía ser un dolor de cabeza. Con WebFix cada despacho descuenta el stock en la bodega correcta y las finanzas están 100% al día.',
      author: 'Ing. Roberto Viteri,',
      company: 'Distribuidora Viteri Hermanos (Cuenca)'
    }
  };

  const currentSegment = commercialSegments[activeSegmentTab] || commercialSegments.comercios;

  return (
    <div className="w-full bg-white text-slate-900 overflow-x-clip">
      
      {/* 1. HERO SECTION DE ALTO CONTRASTE (ESTILO BREVO & SITEGROUND) */}
      <section className="relative w-full bg-[#e8fedf] border-b border-[#b3f4cb] rounded-b-[40px] md:rounded-b-[56px] pt-10 pb-16 md:pt-16 md:pb-24 overflow-hidden">
        <div ref={heroContainerRef} className="w-[90%] max-w-[1720px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
            
            {/* Columna Izquierda (Texto & CTA Directo) */}
            <div className="lg:col-span-5 flex flex-col space-y-6 text-left">
              {/* Título H1 de alto impacto */}
              <h1 className="text-slate-950 font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-[1.08] max-w-2xl">
                El ERP y Facturación SRI más rápido del Ecuador.
              </h1>

              {/* Subtítulo directo a bondades */}
              <p className="text-slate-600 text-lg sm:text-xl font-normal leading-relaxed max-w-2xl">
                Emite comprobantes electrónicos autorizados en 1 segundo, gestiona tu punto de venta en mostrador y controla inventario y bancos sin hojas de cálculo.
              </p>

              {/* Acciones CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="bg-[#1b1b1b] hover:bg-black text-white font-semibold px-7 py-3.5 rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all shadow-none"
                >
                  <span>Probar 14 días gratis</span>
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('demo-preview');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white hover:bg-slate-50 text-[#1b1b1b] font-semibold px-6 py-3.5 rounded-full border border-slate-300 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <span>Ver demostración</span>
                </button>
              </div>
            </div>

            {/* Columna Derecha (Maqueta Viva en Capas con Parallax) */}
            <div id="demo-preview" className="lg:col-span-7 relative pt-4 pb-6 lg:py-8">
              
              {/* Capa flotante 1: Factura autorizada en tiempo real (Parallax -0.15) */}
              <div
                style={{ transform: `translateY(${card1Offset}px)` }}
                className="hidden sm:flex flex-col absolute -top-6 -right-2 lg:-right-6 z-20 w-72 md:w-80 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-[0_16px_36px_rgba(0,0,0,0.1)] pointer-events-none transition-transform will-change-transform"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#006a43] text-[11px] font-semibold border border-[#b3f4cb]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0b996f] animate-pulse" />
                    SRI Autorizado
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">1.1 seg</span>
                </div>
                
                <div className="space-y-1.5 text-left">
                  <div className="text-[11px] font-mono text-slate-500">FAC-001-002-000008453</div>
                  <div className="font-bold text-xs text-slate-900 truncate">
                    SUPERMAXI S.A.
                  </div>
                  <div className="text-[11px] text-slate-500">RUC: 1790016919001</div>
                  
                  <div className="pt-2 mt-1 border-t border-dashed border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total Facturado</span>
                    <span className="font-extrabold text-sm text-slate-950 font-mono">$1,240.50</span>
                  </div>

                  <div className="flex items-center gap-1 pt-1 text-[10px] text-[#006a43] font-medium">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>RIDE y XML enviados al correo</span>
                  </div>
                </div>
              </div>

              {/* Capa flotante 2: Cobro rápido POS (Parallax 0.12) */}
              <div
                style={{ transform: `translateY(${card2Offset}px)` }}
                className="hidden sm:flex flex-col absolute -bottom-6 -left-2 lg:-left-6 z-20 w-64 md:w-72 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-[0_16px_36px_rgba(0,0,0,0.1)] pointer-events-none transition-transform will-change-transform"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-[#1b1b1b] text-white flex items-center justify-center text-[10px] font-bold">
                      POS
                    </div>
                    <span className="text-xs font-bold text-slate-900">Caja Mostrador</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-bold text-slate-700">
                    F12
                  </span>
                </div>

                <div className="space-y-1.5 text-left text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Ticket #1042</span>
                    <span>2 artículos</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-slate-500 font-medium">Total Cobrado</span>
                    <span className="text-base font-extrabold text-[#006a43] font-mono">$18.50</span>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <Printer size={12} /> Ticket Térmico 80mm
                    </span>
                    <span className="text-[#006a43] font-semibold">Listo</span>
                  </div>
                </div>
              </div>

              {/* Capa Base: Ventana Interactiva del ERP */}
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xl relative z-10 text-left">
                {/* Window Topbar */}
                <div className="px-4 py-2.5 flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/90">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  </div>
                  
                  {/* Browser URL Pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200/70 text-slate-600 text-xs font-mono max-w-xs w-full justify-center">
                    <Lock size={11} className="text-slate-400 shrink-0" />
                    <span className="text-slate-500">app.webfix.ec</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-900 font-semibold">{activeHeroTab}</span>
                  </div>

                  {/* SRI Online Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f0fdf4] text-[#006a43] text-xs font-semibold border border-[#b3f4cb] shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0b996f] animate-pulse" />
                    <span>SRI Online</span>
                  </div>
                </div>

                {/* Tab Switcher inside the Window */}
                <div className="px-4 pt-2.5 pb-2 flex items-center gap-1.5 border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
                  {heroTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeHeroTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveHeroTab(tab.id)}
                        className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer select-none ${
                          isActive
                            ? 'bg-[#c0ffa5] text-[#004227] font-bold shadow-none'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-medium'
                        }`}
                      >
                        <Icon size={14} className={isActive ? 'text-[#004227]' : 'text-slate-600'} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Simulated Live Viewport based on tab */}
                <div className="p-4 sm:p-6 bg-slate-50/40 min-h-[330px] flex flex-col justify-center">
                  
                  {activeHeroTab === 'sri' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Metric Summary Bar */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm">
                          <span className="text-xs text-slate-500 block">Facturas Autorizadas</span>
                          <span className="text-xl font-extrabold text-slate-900">142</span>
                          <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">+18 hoy</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm">
                          <span className="text-xs text-slate-500 block">Total Facturado</span>
                          <span className="text-xl font-extrabold text-slate-900 font-mono">$4,850.00</span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">Mes: $28.4k</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm">
                          <span className="text-xs text-slate-500 block">Tiempo de Firma</span>
                          <span className="text-xl font-extrabold text-emerald-600">1.2s</span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">Instantáneo SRI</span>
                        </div>
                      </div>

                      {/* Simulated Invoices Table */}
                      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                        <div className="grid grid-cols-12 px-3.5 py-2 bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                          <div className="col-span-3">Comprobante</div>
                          <div className="col-span-4">Cliente / RUC</div>
                          <div className="col-span-2 text-right">Total</div>
                          <div className="col-span-3 text-right">Estado SRI</div>
                        </div>
                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="grid grid-cols-12 px-3.5 py-2.5 items-center font-mono">
                            <div className="col-span-3 text-slate-700 font-semibold text-[11px]">001-002-000008452</div>
                            <div className="col-span-4 font-sans text-slate-800 truncate font-medium">Corporación Favorita S.A.</div>
                            <div className="col-span-2 text-right text-slate-900 font-bold">$320.00</div>
                            <div className="col-span-3 text-right font-sans">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={10} /> Autorizado
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-12 px-3.5 py-2.5 items-center font-mono">
                            <div className="col-span-3 text-slate-700 font-semibold text-[11px]">001-002-000008451</div>
                            <div className="col-span-4 font-sans text-slate-800 truncate font-medium">Juan Carlos Mendoza</div>
                            <div className="col-span-2 text-right text-slate-900 font-bold">$45.50</div>
                            <div className="col-span-3 text-right font-sans">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={10} /> Autorizado
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-12 px-3.5 py-2.5 items-center font-mono">
                            <div className="col-span-3 text-slate-700 font-semibold text-[11px]">001-002-000008450</div>
                            <div className="col-span-4 font-sans text-slate-800 truncate font-medium">Distribuidora Quito Cía. Ltda.</div>
                            <div className="col-span-2 text-right text-slate-900 font-bold">$890.00</div>
                            <div className="col-span-3 text-right font-sans">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={10} /> Autorizado
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeHeroTab === 'pos' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in duration-150">
                      <div className="md:col-span-7 space-y-2">
                        <span className="text-xs font-bold text-slate-700 block">Catálogo Rápido Mostrador</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-semibold text-slate-900 block">Café Americano 8oz</span>
                            <span className="text-xs font-bold text-emerald-600 mt-1 block font-mono">$1.50</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-semibold text-slate-900 block">Sandwich Gourmet</span>
                            <span className="text-xs font-bold text-emerald-600 mt-1 block font-mono">$4.50</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-semibold text-slate-900 block">Licencia ERP 1 Mes</span>
                            <span className="text-xs font-bold text-emerald-600 mt-1 block font-mono">$19.00</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-semibold text-slate-900 block">Servicio de Asesoría</span>
                            <span className="text-xs font-bold text-emerald-600 mt-1 block font-mono">$35.00</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                            <span className="font-bold text-slate-900">Ticket Actual</span>
                            <span className="text-slate-500 font-medium">Caja 01</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-700">
                              <span>2x Café Americano</span>
                              <span className="font-mono font-medium">$3.00</span>
                            </div>
                            <div className="flex justify-between text-slate-700">
                              <span>1x Sandwich Gourmet</span>
                              <span className="font-mono font-medium">$4.50</span>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2.5 mt-3 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between text-xs font-semibold text-slate-900">
                            <span>Total (IVA incl.)</span>
                            <span className="font-extrabold text-base font-mono">$7.50</span>
                          </div>
                          <button
                            type="button"
                            className="w-full py-2 px-3 rounded-lg bg-[#1b1b1b] hover:bg-black text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none"
                          >
                            <DollarSign size={13} /> Cobrar (F12)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeHeroTab === 'finanzas' && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
                          <span className="text-xs text-slate-500 block">Ingresos Totales (Mes)</span>
                          <span className="text-xl font-extrabold text-emerald-600 font-mono">+$12,450.00</span>
                          <span className="text-[11px] text-slate-500 mt-1 block">+14.2% vs mes anterior</span>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
                          <span className="text-xs text-slate-500 block">Egresos y Compras</span>
                          <span className="text-xl font-extrabold text-rose-600 font-mono">-$4,210.00</span>
                          <span className="text-[11px] text-slate-500 mt-1 block">Con retenciones aplicadas</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                        <div>
                          <span className="text-xs text-slate-500 block">Utilidad Neta Disponible en Bancos</span>
                          <span className="text-base font-extrabold text-slate-900 font-mono">$8,240.00</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pichincha: $5,420
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Guayaquil: $2,820
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeHeroTab === 'inventario' && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Control de Kardex en Tiempo Real</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                            Multibodega
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                          <div className="p-2.5 rounded-lg bg-slate-50">
                            <span className="text-[11px] text-slate-500 block">Items Registrados</span>
                            <span className="text-sm font-extrabold text-slate-900">248</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50">
                            <span className="text-[11px] text-slate-500 block">Stock Valorizado</span>
                            <span className="text-sm font-extrabold text-slate-900 font-mono">$18,920.00</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50">
                            <span className="text-[11px] text-slate-500 block">Alertas Mínimas</span>
                            <span className="text-sm font-extrabold text-amber-600">2 por reponer</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. FRANJA DE CONFIANZA (Social Proof) */}
      <section className="w-full bg-white border-b border-slate-100">
        <div className="w-[80%] max-w-[1720px] mx-auto text-center">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6 md:mb-8">
            Más de 500 comercios y empresas ecuatorianas gestionan su facturación y finanzas con WebFix
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16 opacity-75 hover:opacity-100 transition-opacity duration-300">
            
            {/* SRI Ecuador */}
            <div className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-default select-none">
              <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="24" height="24" rx="4" />
                <path d="M9 11h14M9 16h10M9 21h14" />
              </svg>
              <div className="flex flex-col text-left leading-tight">
                <span className="font-extrabold text-sm tracking-wider">SRI</span>
                <span className="text-[10px] tracking-tight uppercase">Ecuador</span>
              </div>
            </div>

            {/* Banco Pichincha */}
            <div className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-default select-none">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12,2 22,12 12,22 2,12" />
                <polygon points="12,6 18,12 12,18 6,12" fill="white" />
              </svg>
              <span className="font-bold text-sm tracking-tight uppercase">Banco Pichincha</span>
            </div>

            {/* Banco Guayaquil */}
            <div className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-default select-none">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" />
              </svg>
              <span className="font-bold text-sm tracking-tight uppercase">Banco Guayaquil</span>
            </div>

            {/* Produbanco */}
            <div className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-default select-none">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10M9 9h6a2 2 0 0 1 0 4H9" />
              </svg>
              <div className="flex flex-col text-left leading-none">
                <span className="font-extrabold text-sm tracking-tight uppercase">Produbanco</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400">Grupo Promerica</span>
              </div>
            </div>

            {/* Visa */}
            <div className="flex items-center text-slate-600 hover:text-slate-900 transition-colors cursor-default select-none">
              <svg className="h-6 w-16" viewBox="0 0 64 24" fill="currentColor">
                <text x="0" y="19" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fontWeight="900" fontStyle="italic" fontSize="22" letterSpacing="1">VISA</text>
              </svg>
            </div>

            {/* Mastercard */}
            <div className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors cursor-default select-none">
              <svg className="h-7 w-11" viewBox="0 0 44 28" fill="none">
                <circle cx="15" cy="14" r="12" fill="currentColor" fillOpacity="0.8" />
                <circle cx="29" cy="14" r="12" fill="currentColor" fillOpacity="0.5" />
              </svg>
              <span className="font-semibold text-xs tracking-tight lowercase">mastercard</span>
            </div>

            {/* RIMPE */}
            <div className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-default select-none">
              <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                R
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="font-bold text-sm tracking-tight uppercase">RIMPE</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400">Emprendedor & Popular</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. BONDADES EN TARJETAS PLANAS CON ACENTOS DE COLOR SÓLIDO (CERO ANIDACIONES, CERO DOTS) */}
      <section className="w-full bg-white border-b border-slate-100">
        <div className="w-[80%] max-w-[1720px] mx-auto py-20 md:py-28">
          
          {/* Título centrado limpio y sin dots ni burbujas */}
          <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
            <h2 className="text-slate-950 font-bold text-3xl sm:text-4xl tracking-tight">
              Todo lo que tu negocio necesita para operar sin fricción
            </h2>
            <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mt-3">
              Módulos modulares conectados en tiempo real para eliminar tareas manuales y cumplir con el SRI.
            </p>
          </div>

          {/* Grid de 3 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <ScrollReveal key={feature.id} delay={index * 80} className="h-full">
                  <div className="border border-slate-200/90 rounded-3xl p-6 sm:p-8 bg-white hover:border-slate-400 transition-all duration-300 flex flex-col justify-between h-full">
                    <div>
                      {/* Icono en caja sólida */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${feature.iconBg}`}>
                        <Icon size={24} className="stroke-[2.2]" />
                      </div>

                      {/* Título */}
                      <h3 className="text-xl font-bold text-slate-900 mt-5 tracking-tight">
                        {feature.title}
                      </h3>

                      {/* Descripción */}
                      <p className="text-slate-600 text-sm leading-relaxed mt-2.5">
                        {feature.description}
                      </p>

                      {/* Visual plano sin anidaciones */}
                      {feature.renderVisual()}
                    </div>

                    {/* Botón CTA minimalista estilo SiteGround */}
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="w-full mt-2 py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                    >
                      <span>{feature.cta}</span>
                    </button>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

        </div>
      </section>

      {/* 3.5. COMPARATIVA MINIMALISTA & ECOSISTEMA MULTIPLATAFORMA (PC, POS, MÓVIL) */}
      <section className="w-full bg-[#F8FAFC] border-b border-slate-200/80">
        <ScrollReveal direction="up">
          <div className="w-[80%] max-w-[1720px] mx-auto py-20 md:py-28">
            
            {/* Título de Sección Limpio */}
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
              <h2 className="text-slate-950 font-bold text-3xl sm:text-4xl tracking-tight">
                Diseñado para el presente, no para el 2010.
              </h2>
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mt-3">
                ¿Por qué cientos de negocios ecuatorianos están migrando de sistemas anticuados a WebFix?
              </p>
            </div>

            {/* Tabla Comparativa Limpia */}
            <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200/90 overflow-hidden bg-white shadow-none mb-0">
              <div className="grid grid-cols-2 px-6 py-4 border-b border-slate-200 bg-slate-50/80 font-bold text-sm sm:text-base">
                <div className="text-slate-500">Sistemas Tradicionales / Antiguos</div>
                <div className="text-blue-600 flex items-center gap-1.5">
                  <span>WebFix ERP Cloud</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold uppercase tracking-wider">Moderno</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="grid grid-cols-2 px-6 py-4 items-center">
                  <div className="text-slate-500 flex items-center gap-2">
                    <X size={15} className="text-red-500 shrink-0" />
                    <span>Instalaciones lentas en una sola PC física</span>
                  </div>
                  <div className="text-slate-900 font-medium flex items-center gap-2">
                    <Check size={16} className="text-emerald-600 shrink-0" />
                    <span>100% Cloud desde cualquier navegador web</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 px-6 py-4 items-center">
                  <div className="text-slate-500 flex items-center gap-2">
                    <X size={15} className="text-red-500 shrink-0" />
                    <span>Cobro por cantidad de facturas o comprobantes</span>
                  </div>
                  <div className="text-slate-900 font-medium flex items-center gap-2">
                    <Check size={16} className="text-emerald-600 shrink-0" />
                    <span>Facturación SRI Ilimitada en todos los planes</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 px-6 py-4 items-center">
                  <div className="text-slate-500 flex items-center gap-2">
                    <X size={15} className="text-red-500 shrink-0" />
                    <span>Interfaces lentas con menús y ventanas viejas</span>
                  </div>
                  <div className="text-slate-900 font-medium flex items-center gap-2">
                    <Check size={16} className="text-emerald-600 shrink-0" />
                    <span>Diseño ultra-rápido con atajos de teclado (F12)</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 px-6 py-4 items-center">
                  <div className="text-slate-500 flex items-center gap-2">
                    <X size={15} className="text-red-500 shrink-0" />
                    <span>Pérdida de información si la PC se daña</span>
                  </div>
                  <div className="text-slate-900 font-medium flex items-center gap-2">
                    <Check size={16} className="text-emerald-600 shrink-0" />
                    <span>Respaldo continuo en la nube y disponibilidad 24/7</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </ScrollReveal>
      </section>

      {/* 3.6. BENEFICIOS MINIMALISTAS EN 6 CARDS (RÉPLICA IDÉNTICA BREVO IMAGEN 2) */}
      <section className="w-full bg-white border-b border-slate-100 py-16 md:py-24">
        <ScrollReveal direction="up">
          <div className="w-[80%] max-w-[1720px] mx-auto">
            {/* Título de Sección estilo Brevo: Centrado, contundente, sin subtítulo */}
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-slate-950 tracking-tight text-center mb-10 sm:mb-14">
              Factura y gestiona tu negocio, a tu manera
            </h2>

            {/* Grid de 6 Tarjetas Minimalistas */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
              
              {/* 1. Facturación electrónica SRI */}
              <div
                onClick={() => navigate('/register')}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 flex flex-col justify-between items-start h-[250px] sm:h-[270px] hover:border-slate-400 hover:shadow-xs transition-all duration-200 cursor-pointer group"
              >
                <h3 className="font-bold text-slate-900 text-base sm:text-[17px] leading-snug">
                  Facturación<br />electrónica SRI
                </h3>
                <div className="w-full flex items-center justify-center pt-2">
                  <div className="w-16 h-16 rounded-2xl bg-[#e6f3ff] border border-[#cce7ff] flex items-center justify-center relative shadow-xs group-hover:scale-105 transition-transform">
                    <FileText size={28} className="text-[#2679c6] stroke-[2]" />
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#c0ffa5] border border-[#7deda9] flex items-center justify-center shadow-xs">
                      <Check size={11} className="text-[#004227] stroke-[3]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Punto de venta POS */}
              <div
                onClick={() => navigate('/register')}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 flex flex-col justify-between items-start h-[250px] sm:h-[270px] hover:border-slate-400 hover:shadow-xs transition-all duration-200 cursor-pointer group"
              >
                <h3 className="font-bold text-slate-900 text-base sm:text-[17px] leading-snug">
                  Punto de<br />venta (POS)
                </h3>
                <div className="w-full flex items-center justify-center pt-2">
                  <div className="w-22 h-18 rounded-t-2xl border-2 border-slate-300 bg-white flex flex-col items-center pt-1.5 relative shadow-xs group-hover:scale-105 transition-transform">
                    <span className="text-[9px] font-mono font-semibold text-slate-500">12:30</span>
                    <div className="w-26 bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-between shadow-sm mt-1">
                      <div className="w-4 h-4 rounded-full bg-[#c0ffa5] flex items-center justify-center shrink-0">
                        <Store size={9} className="text-[#004227]" />
                      </div>
                      <div className="flex flex-col text-left pl-1">
                        <span className="text-[9px] font-bold text-slate-800 leading-tight">Ticket #1042</span>
                        <span className="text-[8px] font-semibold text-[#006a43] leading-tight">$18.50 Listo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Firma digital .p12 */}
              <div
                onClick={() => navigate('/register')}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 flex flex-col justify-between items-start h-[250px] sm:h-[270px] hover:border-slate-400 hover:shadow-xs transition-all duration-200 cursor-pointer group"
              >
                <h3 className="font-bold text-slate-900 text-base sm:text-[17px] leading-snug">
                  Firma digital<br />.p12
                </h3>
                <div className="w-full flex items-center justify-center pt-2">
                  <div className="w-16 h-16 rounded-2xl bg-[#006a43] flex items-center justify-center relative shadow-xs group-hover:scale-105 transition-transform">
                    <KeyRound size={28} className="text-white" />
                    <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-[#c0ffa5] border border-[#7deda9] flex items-center justify-center text-[8px] font-extrabold text-[#004227] shadow-xs">
                      SRI
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Envío por WhatsApp */}
              <div
                onClick={() => navigate('/register')}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 flex flex-col justify-between items-start h-[250px] sm:h-[270px] hover:border-slate-400 hover:shadow-xs transition-all duration-200 cursor-pointer group"
              >
                <h3 className="font-bold text-slate-900 text-base sm:text-[17px] leading-snug">
                  Envío por<br />WhatsApp
                </h3>
                <div className="w-full flex items-center justify-center pt-2">
                  <div className="w-26 flex flex-col gap-1.5 group-hover:scale-105 transition-transform">
                    <div className="bg-[#f0fdf4] border border-[#b3f4cb] rounded-lg p-1.5 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[8px] font-bold">W</div>
                        <span className="text-[9px] font-medium text-slate-800">Factura enviada</span>
                      </div>
                      <Check size={11} className="text-[#006a43] stroke-[3]" />
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-[#5aa3e7] text-white flex items-center justify-center text-[8px] font-bold">@</div>
                        <span className="text-[9px] font-medium text-slate-800">RIDE & XML listo</span>
                      </div>
                      <span className="text-[8px] font-mono text-slate-500">1s</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Inventario & Kardex */}
              <div
                onClick={() => navigate('/register')}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 flex flex-col justify-between items-start h-[250px] sm:h-[270px] hover:border-slate-400 hover:shadow-xs transition-all duration-200 cursor-pointer group"
              >
                <h3 className="font-bold text-slate-900 text-base sm:text-[17px] leading-snug">
                  Inventario &<br />Kardex
                </h3>
                <div className="w-full flex items-center justify-center pt-2">
                  <div className="w-24 h-16 rounded-xl border border-slate-300 bg-white p-2 flex flex-col justify-between shadow-xs relative group-hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono font-medium text-slate-500 uppercase tracking-wider">Kardex</span>
                      <span className="text-[8px] font-mono font-bold text-[#006a43] bg-[#f0fdf4] px-1 rounded">142 un</span>
                    </div>
                    <div className="flex items-center justify-between h-4 px-1 bg-slate-50 rounded">
                      <div className="w-0.5 h-3 bg-slate-800" />
                      <div className="w-1 h-3 bg-slate-800" />
                      <div className="w-0.5 h-3 bg-slate-400" />
                      <div className="w-1.5 h-3 bg-slate-800" />
                      <div className="w-0.5 h-3 bg-slate-700" />
                      <div className="w-1 h-3 bg-slate-800" />
                      <div className="w-0.5 h-3 bg-slate-400" />
                      <div className="w-1.5 h-3 bg-slate-800" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#c0ffa5] border border-[#7deda9] flex items-center justify-center shadow-xs">
                      <Package size={10} className="text-[#006a43]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Cobros & Bancos (con botón circular negro de flecha como en Brevo) */}
              <div
                onClick={() => navigate('/soluciones')}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 flex flex-col justify-between items-start h-[250px] sm:h-[270px] hover:border-slate-400 hover:shadow-xs transition-all duration-200 cursor-pointer group"
              >
                <h3 className="font-bold text-slate-900 text-base sm:text-[17px] leading-snug">
                  Cobros &<br />Bancos
                </h3>
                <div className="w-full flex items-center justify-center pt-2">
                  <div className="w-22 h-18 rounded-xl border border-slate-200 bg-slate-50/70 p-2 flex flex-col justify-between relative shadow-xs group-hover:scale-105 transition-transform">
                    <div className="grid grid-cols-3 gap-1 px-1 pt-1">
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="w-2.5 h-2.5 rounded-full bg-slate-200 mx-auto" />
                      ))}
                    </div>
                    <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#c0ffa5] border border-[#7deda9] flex items-center justify-center shadow-xs">
                      <TrendingUp size={10} className="text-[#006a43]" />
                    </div>
                    <div className="absolute -right-2 bottom-1 w-8 h-8 rounded-full bg-[#1b1b1b] group-hover:bg-black text-white flex items-center justify-center shadow-md cursor-pointer transition-transform group-hover:scale-110">
                      <ArrowRight size={14} className="stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 4. SECCIÓN DE PESTAÑAS INTERACTIVAS POR SEGMENTO COMERCIAL (ESTILO BREVO) */}
      <section className="w-full bg-white border-b border-slate-100">
        <ScrollReveal direction="up">
          <div className="w-[80%] max-w-[1720px] mx-auto py-20 md:py-28">
            
            {/* Título centrado limpio y sin subtítulo (Estilo Brevo) */}
            <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-12">
              <h2 className="text-slate-950 font-extrabold text-3xl sm:text-4xl lg:text-[40px] tracking-tight leading-tight">
                Pensado para toda empresa: del primer comprobante a grandes distribuidoras
              </h2>
            </div>

            {/* Selector tipo píldora centrado (Estilo Brevo) */}
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mb-14 md:mb-16">
              {segmentTabs.map((tab) => {
                const isActive = activeSegmentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSegmentTab(tab.id)}
                    className={
                      isActive
                        ? 'bg-[#c0ffa5] text-[#004227] font-semibold rounded-full px-6 py-2.5 text-sm cursor-pointer transition-all shadow-none select-none'
                        : 'text-slate-700 hover:text-slate-950 font-medium px-6 py-2.5 text-sm cursor-pointer transition-all shadow-none select-none'
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Contenido Dinámico de la Pestaña Activa (Split 50% / 50%) */}
            <div key={activeSegmentTab} className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center animate-in fade-in duration-200">
              
              {/* Lado Izquierdo (Propuesta de Valor & Viñetas con Dots Brevo Style) */}
              <div className="lg:col-span-6 flex flex-col justify-between text-left space-y-6">
                <div>
                  <span className="text-sm font-semibold text-[#006a43] mb-2 block tracking-tight">
                    {currentSegment.category}
                  </span>
                  
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-[1.18] mb-4">
                    {currentSegment.title}
                  </h3>

                  <p className="text-slate-600 text-base leading-relaxed mb-6 max-w-xl">
                    {currentSegment.description}
                  </p>

                  <ul className="space-y-2.5 text-slate-800 text-sm sm:text-base font-normal mb-8">
                    {currentSegment.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="text-slate-950 font-bold select-none">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="bg-[#1b1b1b] hover:bg-black text-white font-medium px-6 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-none select-none inline-block"
                  >
                    Saber más
                  </button>
                </div>
              </div>

              {/* Lado Derecho (Tarjeta Testimonial con Foto y Comillas Gigantes Brevo Style) */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="rounded-3xl p-8 sm:p-10 bg-[#fafafa] border border-slate-200/60 flex flex-col justify-between h-full text-left relative">
                  
                  {/* Fila Superior: Emblema de la Empresa a la Izquierda y Comillas Gigantes a la Derecha */}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2 select-none">
                      <div className="px-3.5 py-1.5 rounded-lg border-2 border-[#1b1b1b] bg-white font-black text-xs uppercase tracking-wider text-slate-900 shadow-[2px_2px_0px_#1b1b1b] rotate-[-2deg]">
                        {currentSegment.badgeText}
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold tracking-tight uppercase">
                        {currentSegment.badgeSubtext}
                      </span>
                    </div>

                    <span className="text-5xl sm:text-6xl font-serif font-black text-slate-900 leading-none select-none">
                      “
                    </span>
                  </div>

                  {/* Contenido: Foto del Emprendedor a la Izquierda y Cita a la Derecha */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
                    <img
                      src={currentSegment.photoUrl}
                      alt={currentSegment.author}
                      className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl object-cover shadow-sm border border-slate-200/80 shrink-0"
                    />

                    <div className="flex flex-col justify-between h-full space-y-4 text-left">
                      <p className="text-slate-800 text-sm sm:text-base leading-relaxed italic">
                        &ldquo;{currentSegment.quote}&rdquo;
                      </p>
                      <div className="pt-2">
                        <span className="font-bold text-slate-950 text-sm block">
                          {currentSegment.author}
                        </span>
                        <span className="text-xs text-slate-600 block mt-0.5">
                          {currentSegment.company}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </ScrollReveal>
      </section>

      {/* 5. PRICING PREVIEW */}
      <section className="w-full bg-white border-t border-slate-100">
        <ScrollReveal>
          <div className="w-[80%] max-w-[1720px] mx-auto py-20 md:py-28 text-center">
            
            {/* Encabezado limpio sin dots ni burbujas */}
            <div className="max-w-3xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight">
                Precios transparentes y sin sorpresas
              </h2>
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Sin costos ocultos ni cobros por factura emitida. Comienza hoy con 14 días de prueba gratis.
              </p>

              {/* Selector Mensual / Anual (-20%) */}
              <div className="pt-4 flex justify-center">
                <div className="inline-flex items-center p-1.5 rounded-full bg-slate-100 border border-slate-200/80 select-none">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-[#1b1b1b] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      billingCycle === 'yearly'
                        ? 'bg-white text-[#1b1b1b] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Anual</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#c0ffa5] text-[#004227]">
                      -20%
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 select-none">
                  Precios en dólares estadounidenses (USD) + IVA aplicable en Ecuador
                </p>
              </div>
            </div>

            {/* 3 Tarjetas de Planes al 90% */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12 sm:mt-14 text-left items-stretch">
              
              {/* Plan Emprendedor */}
              <div className="rounded-3xl border border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between bg-white">
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Emprendedor</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Para negocios que inician con el SRI</p>
                  </div>
                  <div className="mb-6 flex items-baseline gap-1.5">
                    <span className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-950">
                      ${billingCycle === 'monthly' ? '15' : '12'}
                    </span>
                    <span className="text-sm font-medium text-slate-500">/ mes</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Facturas SRI ilimitadas</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Punto de Venta POS</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Directorio de Clientes</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>1 Usuario</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full mt-8 py-3 px-5 rounded-full font-semibold text-sm border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors text-center cursor-pointer"
                >
                  Probar Gratis
                </button>
              </div>

              {/* Plan Negocio Pro (Más Popular) */}
              <div className="rounded-3xl border-2 border-blue-600 shadow-sm relative bg-white p-6 sm:p-8 flex flex-col justify-between">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white tracking-wide uppercase select-none">
                  Más Popular
                </div>
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Negocio Pro</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Para comercios con inventario y POS</p>
                  </div>
                  <div className="mb-6 flex items-baseline gap-1.5">
                    <span className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-950">
                      ${billingCycle === 'monthly' ? '29' : '23'}
                    </span>
                    <span className="text-sm font-medium text-slate-500">/ mes</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span className="font-medium text-slate-900">Todo lo de Emprendedor</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Inventario & Kardex Multibodega</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Cuentas por Cobrar (CxC)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Hasta 3 Usuarios</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full mt-8 py-3 px-5 rounded-full font-bold text-sm bg-[#1b1b1b] hover:bg-black text-white transition-colors text-center cursor-pointer shadow-none"
                >
                  Comenzar con Pro
                </button>
              </div>

              {/* Plan Empresarial */}
              <div className="rounded-3xl border border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between bg-white">
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Empresarial</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Para empresas con gestión completa</p>
                  </div>
                  <div className="mb-6 flex items-baseline gap-1.5">
                    <span className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-950">
                      ${billingCycle === 'monthly' ? '59' : '47'}
                    </span>
                    <span className="text-sm font-medium text-slate-500">/ mes</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span className="font-medium text-slate-900">Todo lo de Pro</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Captura OCR con IA ilimitada</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Contabilidad & Asientos automáticos</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span>Usuarios ilimitados</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full mt-8 py-3 px-5 rounded-full font-semibold text-sm border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors text-center cursor-pointer"
                >
                  Probar Empresarial
                </button>
              </div>

            </div>

          </div>
        </ScrollReveal>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section className="w-full bg-white">
        <ScrollReveal>
          <div className="w-[80%] max-w-4xl mx-auto py-20 md:py-24 border-t border-slate-200/80">
            
            {/* Título centrado limpio sin dots */}
            <div className="text-center mb-10 sm:mb-12 space-y-2">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Preguntas Frecuentes
              </h2>
              <p className="text-slate-600 text-base sm:text-lg">
                Todo lo que necesitas saber para comenzar hoy mismo.
              </p>
            </div>

            {/* Acordeón directo y plano sin tarjetas anidadas ni bordes pesados */}
            <div>
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                const answerId = `faq-answer-${index}`;
                return (
                  <div key={index}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      className="w-full py-4 text-left flex items-center justify-between font-semibold text-base sm:text-lg text-slate-900 border-b border-slate-200 cursor-pointer group"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <ChevronDown 
                        size={18} 
                        className={`shrink-0 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                    {isOpen && (
                      <div 
                        id={answerId}
                        className="text-slate-600 text-sm sm:text-base leading-relaxed py-3 border-b border-slate-200/80 animate-in fade-in duration-150"
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </ScrollReveal>
      </section>

      {/* 7. FINAL CALL TO ACTION */}
      <section className="w-full bg-white">
        <ScrollReveal>
          <div className="w-[80%] max-w-[1720px] mx-auto pb-24 md:pb-32">
            <div className="rounded-3xl md:rounded-[40px] p-8 sm:p-14 lg:p-16 text-center text-slate-950 border border-[#b3f4cb] relative overflow-hidden bg-[#e8fedf]">
              
              {/* Tag píldora sutil */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-[#c0ffa5] text-[#004227] border border-[#7deda9] select-none mb-6">
                14 Días de Prueba Gratis • Sin Tarjeta de Crédito
              </div>

              {/* H2 de alta conversión */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950 mb-4">
                Comienza a facturar y controlar tu negocio hoy.
              </h2>

              {/* Subtítulo de 2 líneas */}
              <p className="text-slate-700 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
                Únete a cientos de emprendedores ecuatorianos que ya modernizaron su gestión tributaria y comercial con WebFix.
              </p>

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto bg-[#1b1b1b] hover:bg-black text-white font-bold px-8 py-4 rounded-full text-base flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <span>Crear Cuenta Gratis</span>
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/contacto')}
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 text-[#1b1b1b] font-semibold px-8 py-4 rounded-full text-base border border-slate-300 cursor-pointer transition-colors"
                >
                  Hablar con un Asesor
                </button>
              </div>

            </div>
          </div>
        </ScrollReveal>
      </section>

    </div>
  );
}
