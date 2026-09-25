import { mergeThemeProps } from '../../components/ui/themeProps';
import { UiBox, UiText, UiHeading, UiCard } from '../../components/ui/layout';
import { UiButton } from '../../components/ui/controls';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Check, 
  ShoppingCart, FileText, TrendingUp, Package, 
  CheckCircle2, ChevronDown, Sparkles,
  DollarSign, ShieldCheck,
  Laptop, Smartphone, Store, Wifi, RefreshCw,
  Lock, Printer
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useParallaxScroll } from '../../hooks/useParallaxScroll';
import { ScrollReveal } from '../../components/landing/ScrollReveal';

export default function LandingHome() {
  const navigate = useNavigate();
  const [activeHeroTab, setActiveHeroTab] = useState('sri'); // 'sri' | 'pos' | 'finanzas' | 'inventario'
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

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
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600',
      title: 'Facturación SRI en 1 Clic',
      description: 'Emite facturas, notas de crédito, retenciones y liquidaciones autorizadas al instante con firma .p12 integrada.',
      cta: 'COMIENZA AHORA ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2.5 font-sans">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
              FAC 001-002-000008453
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
              SRI AUTORIZADO
            </span>
          </div>
          <div className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate">
            SUPERMAXI S.A. • RUC 1790016919001
          </div>
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total Facturado</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">$1,240.50</span>
          </div>
        </div>
      )
    },
    {
      id: 'pos',
      icon: ShoppingCart,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600',
      title: 'Punto de Venta Ultrarrápido',
      description: 'Diseñado para atención ágil en mostrador con atajo F12, cobro combinado (efectivo, tarjeta, transferencia) y ticket térmico 80mm.',
      cta: 'VER PUNTO DE VENTA ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-mono font-bold text-[11px]">
                F12
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Cobro Rápido</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Ticket #1042</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Efectivo + Transferencia</span>
            <span className="text-slate-500 font-mono">2 artículos</span>
          </div>
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total Cobrado (80mm)</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">$18.50</span>
          </div>
        </div>
      )
    },
    {
      id: 'finanzas',
      icon: TrendingUp,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600',
      title: 'Flujo de Caja & Cartera Real',
      description: 'Cuentas por cobrar (CxC), cuentas por pagar (CxP), conciliación bancaria automática y saldos en vivo.',
      cta: 'EXPLORAR FINANZAS ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Disponible en Bancos</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">$8,240.00</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Pichincha $5,420 • Guayaquil $2,820</span>
          </div>
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Cuentas por Cobrar (CxC)</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">$3,150.00</span>
          </div>
        </div>
      )
    },
    {
      id: 'inventario',
      icon: Package,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600',
      title: 'Kardex & Stock en Tiempo Real',
      description: 'Control de inventario promedio ponderado con descargas automáticas por ventas y alertas de existencias mínimas.',
      cta: 'VER KARDEX ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Kardex Valorizado</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">$18,920.00</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            248 ítems activos en 2 bodegas
          </div>
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Estado de Stock</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
              2 bajo mínimo
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'ocr',
      icon: Sparkles,
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600',
      title: 'Captura Inteligente OCR',
      description: 'Arrastra facturas de proveedores en PDF, XML o foto. El motor extrae RUC, ítems, IVA y valores automáticamente.',
      cta: 'PROBAR CAPTURA ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
              factura_compra_84.pdf
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
              OCR 100%
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
            RUC 1792049182001 • Base $420.00
          </div>
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">IVA 15% Calculado</span>
            <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">$63.00</span>
          </div>
        </div>
      )
    },
    {
      id: 'seguridad',
      icon: ShieldCheck,
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
      title: 'Seguridad & Nube 24/7',
      description: 'Certificados digitales protegidos bajo encriptación industrial, copias de seguridad continuas y acceso seguro multiplataforma.',
      cta: 'CONOCE MÁS ↗',
      renderVisual: () => (
        <div className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">Firma Digital .p12</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
              AES-256
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            Copias de seguridad continuas en Firebase
          </div>
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Disponibilidad Nube</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">99.98%</span>
          </div>
        </div>
      )
    },
  ];

  return (
    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full"}}>
      
      {/* 1. HERO SECTION DE ALTO CONTRASTE (ESTILO BREVO & SITEGROUND) */}
      <section className="relative w-full bg-[#F0FDF4] dark:bg-[#071d12] rounded-b-[40px] md:rounded-b-[56px] border-b border-emerald-100 dark:border-emerald-950/50 pt-10 pb-16 md:pt-16 md:pb-24 overflow-hidden">
        <div ref={heroContainerRef} className="w-[90%] max-w-[1720px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
            
            {/* Columna Izquierda (Texto & CTA Directo) */}
            <div className="lg:col-span-5 flex flex-col space-y-6 text-left">
              {/* Tag sutil píldora */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300 w-fit select-none">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>WebFix ERP 2.0</span>
                <span className="text-emerald-400 dark:text-emerald-600">•</span>
                <span>Facturación SRI 2026</span>
                <ArrowRight size={12} className="text-emerald-700 dark:text-emerald-400" />
              </div>

              {/* Título H1 de alto impacto */}
              <h1 className="text-[#0F172A] dark:text-white font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-[1.08] max-w-2xl">
                El ERP y Facturación SRI más rápido del Ecuador.
              </h1>

              {/* Subtítulo directo a bondades */}
              <p className="text-slate-600 dark:text-slate-300 text-lg sm:text-xl font-normal leading-relaxed max-w-2xl">
                Emite comprobantes electrónicos autorizados en 1 segundo, gestiona tu punto de venta en mostrador y controla inventario y bancos sin hojas de cálculo.
              </p>

              {/* Acciones CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="bg-[#0F172A] hover:bg-slate-800 text-white font-semibold px-7 py-3.5 rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all shadow-none"
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
                  className="bg-white hover:bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 font-semibold px-6 py-3.5 rounded-full border border-slate-300 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <span>Ver demostración</span>
                </button>
              </div>

              {/* Micro confianza con checkmarks verde esmeralda */}
              <div className="flex flex-wrap items-center gap-y-2.5 gap-x-6 pt-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                  Sin tarjeta de crédito
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                  Firma .p12 integrada
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                  Comprobantes SRI ilimitados
                </span>
              </div>
            </div>

            {/* Columna Derecha (Maqueta Viva en Capas con Parallax) */}
            <div id="demo-preview" className="lg:col-span-7 relative pt-4 pb-6 lg:py-8">
              
              {/* Capa flotante 1: Factura autorizada en tiempo real (Parallax -0.15) */}
              <div
                style={{ transform: `translateY(${card1Offset}px)` }}
                className="hidden sm:flex flex-col absolute -top-6 -right-2 lg:-right-6 z-20 w-72 md:w-80 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-[0_16px_36px_rgba(0,0,0,0.1)] pointer-events-none transition-transform will-change-transform"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    SRI Autorizado
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">1.1 seg</span>
                </div>
                
                <div className="space-y-1.5 text-left">
                  <div className="text-[11px] font-mono text-slate-500">FAC-001-002-000008453</div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    SUPERMAXI S.A.
                  </div>
                  <div className="text-[11px] text-slate-500">RUC: 1790016919001</div>
                  
                  <div className="pt-2 mt-1 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total Facturado</span>
                    <span className="font-extrabold text-sm text-slate-950 dark:text-white font-mono">$1,240.50</span>
                  </div>

                  <div className="flex items-center gap-1 pt-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>RIDE y XML enviados al correo</span>
                  </div>
                </div>
              </div>

              {/* Capa flotante 2: Cobro rápido POS (Parallax 0.12) */}
              <div
                style={{ transform: `translateY(${card2Offset}px)` }}
                className="hidden sm:flex flex-col absolute -bottom-6 -left-2 lg:-left-6 z-20 w-64 md:w-72 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-[0_16px_36px_rgba(0,0,0,0.1)] pointer-events-none transition-transform will-change-transform"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-bold">
                      POS
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Caja Mostrador</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                    F12
                  </span>
                </div>

                <div className="space-y-1.5 text-left text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Ticket #1042</span>
                    <span>2 artículos</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-slate-500 font-medium">Total Cobrado</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">$18.50</span>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                      <Printer size={12} /> Ticket Térmico 80mm
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Listo</span>
                  </div>
                </div>
              </div>

              {/* Capa Base: Ventana Interactiva del ERP */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xl relative z-10 text-left">
                {/* Window Topbar */}
                <div className="px-4 py-2.5 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  </div>
                  
                  {/* Browser URL Pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-mono max-w-xs w-full justify-center">
                    <Lock size={11} className="text-slate-400 shrink-0" />
                    <span className="text-slate-500">app.webfix.ec</span>
                    <span className="text-slate-300 dark:text-slate-600">/</span>
                    <span className="text-slate-900 dark:text-slate-200 font-semibold">{activeHeroTab}</span>
                  </div>

                  {/* SRI Online Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>SRI Online</span>
                  </div>
                </div>

                {/* Tab Switcher inside the Window */}
                <div className="px-4 pt-2.5 pb-2 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 overflow-x-auto">
                  {heroTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeHeroTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveHeroTab(tab.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <Icon size={14} className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Simulated Live Viewport based on tab */}
                <div className="p-4 sm:p-6 bg-slate-50/40 dark:bg-slate-950/40 min-h-[330px] flex flex-col justify-center">
                  
                  {activeHeroTab === 'sri' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Metric Summary Bar */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                          <span className="text-xs text-slate-500 block">Facturas Autorizadas</span>
                          <span className="text-xl font-extrabold text-slate-900 dark:text-white">142</span>
                          <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">+18 hoy</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                          <span className="text-xs text-slate-500 block">Total Facturado</span>
                          <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">$4,850.00</span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">Mes: $28.4k</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                          <span className="text-xs text-slate-500 block">Tiempo de Firma</span>
                          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">1.2s</span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">Instantáneo SRI</span>
                        </div>
                      </div>

                      {/* Simulated Invoices Table */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="grid grid-cols-12 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                          <div className="col-span-3">Comprobante</div>
                          <div className="col-span-4">Cliente / RUC</div>
                          <div className="col-span-2 text-right">Total</div>
                          <div className="col-span-3 text-right">Estado SRI</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                          <div className="grid grid-cols-12 px-3.5 py-2.5 items-center font-mono">
                            <div className="col-span-3 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">001-002-000008452</div>
                            <div className="col-span-4 font-sans text-slate-800 dark:text-slate-200 truncate font-medium">Corporación Favorita S.A.</div>
                            <div className="col-span-2 text-right text-slate-900 dark:text-white font-bold">$320.00</div>
                            <div className="col-span-3 text-right font-sans">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={10} /> Autorizado
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-12 px-3.5 py-2.5 items-center font-mono">
                            <div className="col-span-3 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">001-002-000008451</div>
                            <div className="col-span-4 font-sans text-slate-800 dark:text-slate-200 truncate font-medium">Juan Carlos Mendoza</div>
                            <div className="col-span-2 text-right text-slate-900 dark:text-white font-bold">$45.50</div>
                            <div className="col-span-3 text-right font-sans">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={10} /> Autorizado
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-12 px-3.5 py-2.5 items-center font-mono">
                            <div className="col-span-3 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">001-002-000008450</div>
                            <div className="col-span-4 font-sans text-slate-800 dark:text-slate-200 truncate font-medium">Distribuidora Quito Cía. Ltda.</div>
                            <div className="col-span-2 text-right text-slate-900 dark:text-white font-bold">$890.00</div>
                            <div className="col-span-3 text-right font-sans">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Catálogo Rápido Mostrador</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white block">Café Americano 8oz</span>
                            <span className="text-xs font-bold text-emerald-600 mt-1 block font-mono">$1.50</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white block">Sandwich Gourmet</span>
                            <span className="text-xs font-bold text-emerald-600 mt-1 block font-mono">$4.50</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white block">Licencia ERP 1 Mes</span>
                            <span className="text-xs font-bold text-emerald-600 mt-1 block font-mono">$19.00</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white block">Servicio de Asesoría</span>
                            <span className="text-xs font-bold text-emerald-600 mt-1 block font-mono">$35.00</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">Ticket Actual</span>
                            <span className="text-slate-500 font-medium">Caja 01</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-700 dark:text-slate-300">
                              <span>2x Café Americano</span>
                              <span className="font-mono font-medium">$3.00</span>
                            </div>
                            <div className="flex justify-between text-slate-700 dark:text-slate-300">
                              <span>1x Sandwich Gourmet</span>
                              <span className="font-mono font-medium">$4.50</span>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2.5 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex justify-between text-xs font-semibold text-slate-900 dark:text-white">
                            <span>Total (IVA incl.)</span>
                            <span className="font-extrabold text-base font-mono">$7.50</span>
                          </div>
                          <button
                            type="button"
                            className="w-full py-2 px-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none"
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
                        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                          <span className="text-xs text-slate-500 block">Ingresos Totales (Mes)</span>
                          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">+$12,450.00</span>
                          <span className="text-[11px] text-slate-500 mt-1 block">+14.2% vs mes anterior</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                          <span className="text-xs text-slate-500 block">Egresos y Compras</span>
                          <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">-$4,210.00</span>
                          <span className="text-[11px] text-slate-500 mt-1 block">Con retenciones aplicadas</span>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                        <div>
                          <span className="text-xs text-slate-500 block">Utilidad Neta Disponible en Bancos</span>
                          <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">$8,240.00</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
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
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">Control de Kardex en Tiempo Real</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
                            Multibodega
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-[11px] text-slate-500 block">Items Registrados</span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">248</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-[11px] text-slate-500 block">Stock Valorizado</span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">$18,920.00</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-[11px] text-slate-500 block">Alertas Mínimas</span>
                            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">2 por reponer</span>
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
      <section className="w-full bg-white dark:bg-[#0c1017] py-10 md:py-14 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="w-[90%] max-w-[1720px] mx-auto text-center">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6 md:mb-8">
            Más de 500 comercios y empresas ecuatorianas gestionan su facturación y finanzas con WebFix
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16 opacity-75 hover:opacity-100 transition-opacity duration-300">
            
            {/* SRI Ecuador */}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-default select-none">
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
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-default select-none">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12,2 22,12 12,22 2,12" />
                <polygon points="12,6 18,12 12,18 6,12" fill="white" className="dark:fill-[#0c1017]" />
              </svg>
              <span className="font-bold text-sm tracking-tight uppercase">Banco Pichincha</span>
            </div>

            {/* Banco Guayaquil */}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-default select-none">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" />
              </svg>
              <span className="font-bold text-sm tracking-tight uppercase">Banco Guayaquil</span>
            </div>

            {/* Produbanco */}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-default select-none">
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
            <div className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-default select-none">
              <svg className="h-6 w-16" viewBox="0 0 64 24" fill="currentColor">
                <text x="0" y="19" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fontWeight="900" fontStyle="italic" fontSize="22" letterSpacing="1">VISA</text>
              </svg>
            </div>

            {/* Mastercard */}
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-default select-none">
              <svg className="h-7 w-11" viewBox="0 0 44 28" fill="none">
                <circle cx="15" cy="14" r="12" fill="currentColor" fillOpacity="0.8" />
                <circle cx="29" cy="14" r="12" fill="currentColor" fillOpacity="0.5" />
              </svg>
              <span className="font-semibold text-xs tracking-tight lowercase">mastercard</span>
            </div>

            {/* RIMPE */}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-default select-none">
              <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
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
      <section className="w-full bg-[#f8fafc]/60 dark:bg-[#070b14] border-b border-slate-200/80 dark:border-slate-800">
        <div className="w-[90%] max-w-[1720px] mx-auto py-20 md:py-28">
          
          {/* Título centrado limpio y sin dots ni burbujas */}
          <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
            <h2 className="text-[#0F172A] dark:text-white font-bold text-3xl sm:text-4xl tracking-tight">
              Todo lo que tu negocio necesita para operar sin fricción
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mt-3">
              Módulos modulares conectados en tiempo real para eliminar tareas manuales y cumplir con el SRI.
            </p>
          </div>

          {/* Grid de 3 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <ScrollReveal key={feature.id} delay={index * 80} className="h-full">
                  <div className="border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900/90 hover:border-slate-400 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between h-full">
                    <div>
                      {/* Icono en caja sólida */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${feature.iconBg}`}>
                        <Icon size={24} className="stroke-[2.2]" />
                      </div>

                      {/* Título */}
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-5 tracking-tight">
                        {feature.title}
                      </h3>

                      {/* Descripción */}
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mt-2.5">
                        {feature.description}
                      </p>

                      {/* Visual plano sin anidaciones */}
                      {feature.renderVisual()}
                    </div>

                    {/* Botón CTA minimalista estilo SiteGround */}
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="w-full mt-2 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
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

      {/* 4. COMPARATIVA MINIMALISTA & ECOSISTEMA MULTIPLATAFORMA (PC, POS, MÓVIL) */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"relative py-24 overflow-hidden"}}>
        {/* Ambient Glow Lights behind section */}
        <UiBox {...{"style":{"backgroundColor":"var(--blue-3)","borderRadius":"var(--radius-3)"},"className":"absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none animate-glow-pulse"}}></UiBox>
        <UiBox {...{"style":{"backgroundColor":"var(--green-3)","borderRadius":"var(--radius-3)"},"className":"absolute bottom-10 right-10 w-[350px] h-[350px] pointer-events-none animate-glow-pulse"}} style={{ animationDelay: '2.5s' }}></UiBox>
        
        {/* Subtle grid pattern */}
        <UiBox 
          {...{"style":{"backgroundColor":"var(--gray-2)"},"className":{"className":"absolute inset-0 opacity-40 pointer-events-none"}}}
          style={{
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, #000 70%, transparent 100%)'
          }}
        ></UiBox>

        <UiBox {...{"className":"max-w-4xl mx-auto px-4 sm:px-6 relative z-10"}}>
          
          <UiBox {...{"className":"text-center mb-12 space-y-2"}}>
            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Diseñado para el presente, no para el 2010.
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray"}}>
              ¿Por qué cientos de negocios están migrando de sistemas anticuados a WebFix?
            </UiText>
          </UiBox>

          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
            <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)","borderBottom":"1px solid var(--gray-a6)"},"className":"grid grid-cols-2 px-4 py-3"}}>
              <UiBox>Sistemas Tradicionales / Antiguos</UiBox>
              <UiBox {...{"style":{"color":"var(--blue-12)"}}}>WebFix ERP Cloud</UiBox>
            </UiBox>
            <UiBox {...{"style":{"color":"var(--gray-11)"}}}>
              <UiBox {...{"className":"grid grid-cols-2 px-4 py-3 items-center"}}>
                <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Instalaciones lentas en una sola PC física</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-1.5"}}><Check size={14} {...{"style":{"color":"var(--green-12)"}}} /> 100% Cloud desde cualquier navegador</UiBox>
              </UiBox>
              <UiBox {...{"className":"grid grid-cols-2 px-4 py-3 items-center"}}>
                <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Cobro por cantidad de facturas emitidas</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-1.5"}}><Check size={14} {...{"style":{"color":"var(--green-12)"}}} /> Facturación SRI Ilimitada en todos los planes</UiBox>
              </UiBox>
              <UiBox {...{"className":"grid grid-cols-2 px-4 py-3 items-center"}}>
                <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Interfaces complejas y lentas con ventanas viejas</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-1.5"}}><Check size={14} {...{"style":{"color":"var(--green-12)"}}} /> Diseño limpio Vercel/Geist con atajos de teclado</UiBox>
              </UiBox>
              <UiBox {...{"className":"grid grid-cols-2 px-4 py-3 items-center"}}>
                <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Pérdida de datos si la computadora se daña</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-1.5"}}><Check size={14} {...{"style":{"color":"var(--green-12)"}}} /> Respaldo continuo en la nube con Firebase</UiBox>
              </UiBox>
            </UiBox>
          </UiBox>

          {/* ECOSISTEMA MULTIPLATAFORMA FLOTANTE: PC, POS MOSTRADOR Y SMARTPHONE */}
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"mt-14 p-6 sm:p-8 text-left relative overflow-hidden"}}>
            
            {/* Animated Laser Beam on top */}
            <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"absolute top-0 left-0 right-0 h-[2px] overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"h-full w-1/3 animate-beam-slide"}}></UiBox>
            </UiBox>

            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 pt-1"}}>
              <UiBox>
                <UiText {...{"size":"1","weight":"bold","color":"blue","className":"flex items-center gap-1.5 mb-1 select-none"}}>
                  <UiText {...{"className":"relative flex h-2 w-2"}}>
                    <UiText {...{"className":"animate-ping absolute inline-flex h-full w-full opacity-75"}}></UiText>
                    <UiText {...{"className":"relative inline-flex h-2 w-2"}}></UiText>
                  </UiText>
                  Ecosistema Multiplataforma Integrado
                </UiText>
                <UiHeading as="h3" {...{"size":"4","weight":"bold","color":"gray","highContrast":true}}>
                  Tu negocio sincronizado en PC, Móvil y Punto de Venta
                </UiHeading>
              </UiBox>
              <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","color":"var(--gray-11)","fontFamily":"var(--code-font-family)"},"className":"flex items-center gap-2 px-3 py-1.5"}}>
                <Wifi size={13} {...{"style":{"color":"var(--green-12)"}}} />
                <UiText>Cloud Sync 100% en Vivo</UiText>
              </UiBox>
            </UiBox>

            {/* 3 Devices Floating Fleet */}
            <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"}}>
              
              {/* DISPOSITIVO 1: PC / COMPUTADORA (Flota Suave a 6s) */}
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 flex flex-col justify-between duration-300 group"}}>
                <UiBox>
                  {/* Laptop Mockup Window with Float Animation */}
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"animate-float-slow overflow-hidden mb-4 transition-shadow"}}>
                    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)"},"className":"px-2.5 py-1.5 flex items-center justify-between"}}>
                      <UiBox {...{"className":"flex items-center gap-1.5"}}>
                        <UiText {...{"className":"w-2 h-2 inline-block"}}></UiText>
                        <UiText {...{"className":"w-2 h-2 inline-block"}}></UiText>
                        <UiText {...{"className":"w-2 h-2 inline-block"}}></UiText>
                      </UiBox>
                      <UiText {...{"size":"1","weight":"regular","color":"gray"}}>app.webfix.ec</UiText>
                      <UiText {...{"className":"w-2 h-2"}}></UiText>
                    </UiBox>
                    <UiBox {...{"className":"p-3 space-y-2"}}>
                      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center pb-1"}}>
                        <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>ERP Dashboard</UiText>
                        <Badge variant="success" {...{"className":"py-0 px-1 flex items-center gap-1"}}>
                          <UiText {...{"className":"h-1.5 w-1.5 animate-pulse"}}></UiText>
                          SRI Activo
                        </Badge>
                      </UiBox>
                      <UiBox {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"grid grid-cols-2 gap-1.5"}}>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                          <UiText {...{"color":"gray","size":"1","className":"block"}}>Ventas Mes</UiText>
                          <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>$4,850.00</UiText>
                        </UiBox>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                          <UiText {...{"color":"gray","size":"1","className":"block"}}>Facturas</UiText>
                          <UiText {...{"weight":"bold","color":"green"}}>142 Ok</UiText>
                        </UiBox>
                      </UiBox>
                      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"p-1.5 flex justify-between items-center"}}>
                        <UiText>Último comprobante:</UiText>
                        <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>FAC-0084</UiText>
                      </UiBox>
                    </UiBox>
                  </UiBox>

                  <UiBox {...{"className":"flex items-center gap-2 mb-1.5"}}>
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                      <Laptop size={14} />
                    </UiBox>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>PC & Laptops</UiHeading>
                  </UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                    Control administrativo completo, reportes tributarios, subida de firmas .p12 y gestión de inventario multibodega.
                  </UiText>
                </UiBox>
              </UiCard>

              {/* DISPOSITIVO 2: PUNTO DE VENTA (POS) / TABLET (Flota Asíncrona a 4.5s) */}
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 flex flex-col justify-between duration-300 group"}}>
                <UiBox>
                  {/* Tablet / POS Mockup Window with Float Animation */}
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"animate-float-medium overflow-hidden mb-4 transition-shadow"}}>
                    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)"},"className":"px-2.5 py-1.5 flex items-center justify-between"}}>
                      <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Terminal POS 01</UiText>
                      <Badge variant="outline" {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"py-0 px-1"}}>Caja Abierta</Badge>
                    </UiBox>
                    <UiBox {...{"className":"p-3 space-y-2"}}>
                      <UiBox {...{"className":"grid grid-cols-2 gap-1.5"}}>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5 text-center"}}>
                          <UiText {...{"weight":"bold","color":"gray","highContrast":true,"className":"block truncate"}}>Café Espresso</UiText>
                          <UiText {...{"weight":"regular","color":"gray","size":"1"}}>$1.75</UiText>
                        </UiBox>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5 text-center"}}>
                          <UiText {...{"weight":"bold","color":"gray","highContrast":true,"className":"block truncate"}}>Combo Lunch</UiText>
                          <UiText {...{"weight":"regular","color":"gray","size":"1"}}>$6.50</UiText>
                        </UiBox>
                      </UiBox>
                      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5 flex justify-between items-center"}}>
                        <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>Total Ticket:</UiText>
                        <UiText {...{"weight":"bold","color":"blue"}}>$8.25</UiText>
                      </UiBox>
                      <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--color-background)","borderRadius":"var(--radius-3)"},"className":"py-1 text-center cursor-pointer"}}>
                        Cobro Rápido (F12) ↵
                      </UiBox>
                    </UiBox>
                  </UiBox>

                  <UiBox {...{"className":"flex items-center gap-2 mb-1.5"}}>
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                      <Store size={14} />
                    </UiBox>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Puntos de Venta & Tablets</UiHeading>
                  </UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                    Atención ágil en mostrador con pantalla táctil, pistolas lectoras de barras, tickets térmicos y cobro en 5 segundos.
                  </UiText>
                </UiBox>
              </UiCard>

              {/* DISPOSITIVO 3: MÓVIL / SMARTPHONE (Flota Asíncrona a 3.8s) */}
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 flex flex-col justify-between duration-300 group"}}>
                <UiBox>
                  {/* Smartphone Mockup with Float Animation */}
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"animate-float-fast max-w-[160px] mx-auto overflow-hidden mb-4 transition-shadow"}}>
                    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)","fontFamily":"var(--code-font-family)","color":"var(--gray-11)"},"className":"px-3 py-1 flex items-center justify-between"}}>
                      <UiText>9:41</UiText>
                      <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","borderRadius":"var(--radius-3)"},"className":"w-8 h-1"}}></UiBox>
                      <UiText {...{"color":"green","weight":"bold"}}>5G</UiText>
                    </UiBox>
                    <UiBox {...{"className":"p-2.5 space-y-1.5"}}>
                      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5 text-center"}}>
                        <UiText {...{"size":"1","color":"gray","className":"block"}}>Ventas de Hoy</UiText>
                        <UiText {...{"weight":"bold","color":"green","size":"1"}}>+$1,340.00</UiText>
                      </UiBox>
                      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"p-1.5 space-y-0.5"}}>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex justify-between"}}>
                          <UiText>FAC-0091</UiText>
                          <UiText>$45.00</UiText>
                        </UiBox>
                        <UiText {...{"color":"green","weight":"medium","className":"block flex items-center gap-1"}}>
                          <UiText {...{"className":"h-1 w-1 inline-block animate-ping"}}></UiText>
                          Enviada al SRI
                        </UiText>
                      </UiBox>
                      <UiBox {...{"style":{"backgroundColor":"var(--blue-9)","color":"var(--color-background)","borderRadius":"var(--radius-3)"},"className":"py-1 text-center"}}>
                        + Nueva Factura
                      </UiBox>
                    </UiBox>
                  </UiBox>

                  <UiBox {...{"className":"flex items-center gap-2 mb-1.5"}}>
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                      <Smartphone size={14} />
                    </UiBox>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Smartphones & Celulares</UiHeading>
                  </UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                    Supervisa tu negocio desde cualquier lugar: emite comprobantes en ruta, consulta existencias y revisa tu dinero en tiempo real.
                  </UiText>
                </UiBox>
              </UiCard>

            </UiBox>

            {/* Bottom Sync Banner with Continuous Flow */}
            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-11)"},"className":"mt-6 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3"}}>
              <UiBox {...{"className":"flex items-center gap-2"}}>
                <RefreshCw size={13} {...{"style":{"color":"var(--blue-12)"},"className":"animate-spin-slow shrink-0"}} />
                <UiText {...{"weight":"medium","color":"gray","highContrast":true}}>
                  Sincronización bidireccional automática:
                </UiText>
                <UiText>Una venta en el POS descuenta el inventario en la PC y actualiza el saldo en tu celular al segundo.</UiText>
              </UiBox>
            </UiBox>
          </UiBox>

        </UiBox>
      </section>

      {/* 5. PRICING PREVIEW */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"py-20"}}>
        <UiBox {...{"className":"max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8"}}>
          
          <UiBox {...{"className":"space-y-2"}}>
            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Precios simples y transparentes.
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray"}}>
              Sin costos ocultos ni cobros por factura emitida. Comienza con 14 días gratis.
            </UiText>

            {/* Toggle Mensual / Anual */}
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"inline-flex items-center p-1 gap-1 mt-4"}}>
              <UiButton
                onClick={() => setBillingCycle('monthly')}
                {...mergeThemeProps({"size":"2","className":"cursor-pointer"}, {}, (billingCycle === 'monthly' ? {"variant":"surface","color":"gray"} : {"color":"gray"}))}
              >
                Mensual
              </UiButton>
              <UiButton
                onClick={() => setBillingCycle('yearly')}
                {...mergeThemeProps({"size":"2","className":"cursor-pointer flex items-center gap-1"}, {}, (billingCycle === 'yearly' ? {"variant":"surface","color":"gray"} : {"color":"gray"}))}
              >
                <UiText>Anual</UiText>
                <UiText {...{"size":"1","color":"green","weight":"regular","className":"px-1"}}>-20%</UiText>
              </UiButton>
            </UiBox>
          </UiBox>

          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto"}}>
            
            {/* Plan Starter */}
            <Card {...{"className":"p-5 flex flex-col justify-between"}}>
              <UiBox>
                <UiBox {...{"className":"mb-4"}}>
                  <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Emprendedor</UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"mt-0.5"}}>Para negocios que inician con el SRI</UiText>
                </UiBox>
                <UiBox {...{"className":"mb-6"}}>
                  <UiText {...{"size":"7","weight":"regular","color":"gray","highContrast":true}}>
                    ${billingCycle === 'monthly' ? '15' : '12'}
                  </UiText>
                  <UiText {...{"size":"1","color":"gray"}}> / mes</UiText>
                </UiBox>
                <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-2"}}>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Facturas SRI Ilimitadas</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Punto de Venta (POS)</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Directorio de Clientes</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> 1 Usuario</li>
                </ul>
              </UiBox>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/register')}
                {...{"size":"2","className":"w-full mt-6"}}
              >
                Probar Gratis
              </Button>
            </Card>

            {/* Plan Profesional (Destacado) */}
            <Card {...{"className":"p-5 flex flex-col justify-between relative"}}>
              <Badge variant="default" {...{"className":"absolute -top-2.5 right-4 py-0.5 px-2"}}>
                Más Popular
              </Badge>
              <UiBox>
                <UiBox {...{"className":"mb-4"}}>
                  <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Negocio Pro</UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"mt-0.5"}}>Para comercios con inventario y POS</UiText>
                </UiBox>
                <UiBox {...{"className":"mb-6"}}>
                  <UiText {...{"size":"7","weight":"regular","color":"gray","highContrast":true}}>
                    ${billingCycle === 'monthly' ? '29' : '23'}
                  </UiText>
                  <UiText {...{"size":"1","color":"gray"}}> / mes</UiText>
                </UiBox>
                <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-2"}}>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Todo lo de Emprendedor</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Inventario & Kardex Multibodega</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Control de Cuentas por Cobrar (CxC)</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Hasta 3 Usuarios y Cajeros</li>
                </ul>
              </UiBox>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate('/register')}
                {...{"size":"2","className":"w-full mt-6"}}
              >
                Comenzar con Pro
              </Button>
            </Card>

            {/* Plan Empresa */}
            <Card {...{"className":"p-5 flex flex-col justify-between"}}>
              <UiBox>
                <UiBox {...{"className":"mb-4"}}>
                  <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Empresarial</UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"mt-0.5"}}>Para empresas con gestión completa</UiText>
                </UiBox>
                <UiBox {...{"className":"mb-6"}}>
                  <UiText {...{"size":"7","weight":"regular","color":"gray","highContrast":true}}>
                    ${billingCycle === 'monthly' ? '59' : '47'}
                  </UiText>
                  <UiText {...{"size":"1","color":"gray"}}> / mes</UiText>
                </UiBox>
                <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-2"}}>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Todo lo de Negocio Pro</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Captura OCR con IA ilimitada</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Contabilidad & Asientos Automáticos</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Usuarios y Cajeros Ilimitados</li>
                </ul>
              </UiBox>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/register')}
                {...{"size":"2","className":"w-full mt-6"}}
              >
                Probar Empresarial
              </Button>
            </Card>

          </UiBox>

        </UiBox>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"py-20"}}>
        <UiBox {...{"className":"max-w-3xl mx-auto px-4 sm:px-6 text-left"}}>
          
          <UiBox {...{"className":"text-center mb-12 space-y-2"}}>
            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Preguntas Frecuentes
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray"}}>
              Todo lo que necesitas saber para comenzar hoy mismo.
            </UiText>
          </UiBox>

          <UiBox {...{"className":"space-y-2"}}>
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <UiBox 
                  key={index} 
                  {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}
                >
                  <UiButton
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    {...{"size":"2","color":"gray","className":"w-full text-left flex items-center justify-between gap-4 cursor-pointer"}}
                  >
                    <UiText>{faq.q}</UiText>
                    <ChevronDown size={14} {...mergeThemeProps({"className":"shrink-0 transition-transform duration-150"}, {}, (isOpen ? {"className":"rotate-180"} : {}))} />
                  </UiButton>
                  {isOpen && (
                    <UiBox {...{"style":{"color":"var(--gray-11)","borderTop":"1px solid var(--gray-a6)"},"className":"px-4 pb-3.5 pt-1 leading-relaxed animate-in fade-in duration-100"}}>
                      {faq.a}
                    </UiBox>
                  )}
                </UiBox>
              );
            })}
          </UiBox>

        </UiBox>
      </section>

      {/* 7. FINAL CALL TO ACTION (Minimalist High-Contrast Banner with Ambient Glow) */}
      <section {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"relative py-24 overflow-hidden"}}>
        {/* Ambient Glow Lights */}
        <UiBox {...{"style":{"backgroundColor":"var(--blue-3)","borderRadius":"var(--radius-3)"},"className":"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] pointer-events-none animate-glow-pulse"}}></UiBox>

        <UiBox {...{"className":"max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10"}}>
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-8 sm:p-14 space-y-5 relative overflow-hidden"}}>
            
            {/* Top decorative laser line */}
            <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"absolute top-0 left-0 right-0 h-[2px] overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"h-full w-1/3 animate-beam-slide"}} style={{ animationDuration: '4s' }}></UiBox>
            </UiBox>

            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"inline-flex items-center gap-2 px-3 py-1 select-none"}}>
              <UiText {...{"className":"flex h-1.5 w-1.5 animate-pulse"}}></UiText>
              <UiText>14 Días Gratis • Sin Tarjeta</UiText>
            </UiCard>

            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Comienza a facturar y controlar tu negocio hoy.
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray","className":"max-w-lg mx-auto leading-relaxed"}}>
              Únete a cientos de emprendedores ecuatorianos que ya modernizaron su gestión tributaria y comercial con WebFix.
            </UiText>
            <UiBox {...{"className":"pt-3 flex flex-col sm:flex-row items-center justify-center gap-3"}}>
              <Button 
                size="lg" 
                variant="default"
                onClick={() => navigate('/register')}
                {...{"size":"2","className":"w-full sm:w-auto gap-2 group hover:scale-[1.02]"}}
              >
                <UiText>Crear Cuenta Gratis</UiText>
                <ArrowRight size={13} {...{"className":"group-hover:translate-x-0.5 transition-transform"}} />
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate('/contacto')}
                {...{"size":"2","className":"w-full sm:w-auto"}}
              >
                Hablar con un Asesor
              </Button>
            </UiBox>
          </UiBox>
        </UiBox>
      </section>

    </UiBox>
  );
}
