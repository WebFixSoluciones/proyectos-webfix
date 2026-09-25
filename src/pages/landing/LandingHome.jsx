import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Check, 
  ShoppingCart, FileText, TrendingUp, Package, 
  CheckCircle2, ChevronDown, Sparkles,
  DollarSign, ShieldCheck,
  Lock, Printer
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

  const segmentTabs = [
    { id: 'comercios', label: 'Comercios & Retail (POS)' },
    { id: 'servicios', label: 'Servicios & Profesionales' },
    { id: 'distribuidoras', label: 'Distribuidoras & Mayoristas' },
  ];

  const commercialSegments = {
    comercios: {
      tag: 'Comercios & Retail (POS)',
      tagBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
      title: 'Cobra en mostrador en 3 segundos y descuenta inventario en vivo',
      description: 'Diseñado para tiendas, farmacias y comercios con alto flujo en caja. Agiliza la atención con atajo F12, lector de códigos de barras y emisión de tickets térmicos al instante.',
      bullets: [
        'Atajos de teclado rápidos (F12) y búsqueda instantánea por SKU o código de barras.',
        'Cobro combinado flexible en una sola venta: efectivo, transferencia bancaria y tarjeta de crédito.',
        'Impresión directa en tickets térmicos de 80mm o 58mm y envío del comprobante RIDE por correo.',
        'Cuadre y cierre de caja ciego con arqueo automático y control de diferencias por cajero.'
      ],
      checkColor: 'text-emerald-600 dark:text-emerald-400',
      metric: '-85%',
      metricLabel: 'de tiempo en cuadre de caja al cierre del día',
      metricSubtext: 'Antes 45 minutos manuales, hoy 5 minutos automáticos con reporte consolidado.',
      features: [
        { label: 'Modo mostrador F12', value: 'Ultra-rápido' },
        { label: 'Lector de códigos', value: 'USB & Bluetooth' },
        { label: 'Cierre de caja', value: 'Arqueo automático' }
      ],
      quote: 'Antes nos tomaba más de una hora cuadrar las tres cajas y conciliar transferencias. Con WebFix el arqueo es exacto y cerramos el local en minutos.',
      author: 'Carlos Zambrano',
      role: 'Gerente de Operaciones',
      company: 'Minimarket La Estación (Quito)'
    },
    servicios: {
      tag: 'Servicios & Profesionales',
      tagBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
      title: 'Facturas electrónicas en 1 clic y cobranza sin hojas de cálculo',
      description: 'Ideal para consultores, agencias y profesionales independientes. Emite con tu firma electrónica en segundos y automatiza el seguimiento de cuentas por cobrar.',
      bullets: [
        'Facturación electrónica SRI ilimitada: facturas, notas de crédito y retenciones autorizadas en 1.1s.',
        'Firma digital .p12 protegida en la nube: factura desde tu laptop o celular sin instalar nada.',
        'Control estricto de Cuentas por Cobrar (CxC) con cálculo de vencimientos y saldos en vivo.',
        'Envío automático del PDF RIDE y XML firmado al correo del cliente al emitir.'
      ],
      checkColor: 'text-blue-600 dark:text-blue-400',
      metric: '1.1s',
      metricLabel: 'promedio de autorización SRI por comprobante',
      metricSubtext: 'Firma electrónica directa sin esperas ni caídas de servicio.',
      features: [
        { label: 'Firma .p12 en nube', value: 'Cifrado AES-256' },
        { label: 'Descarga RIDE y XML', value: '1 clic / Enlace público' },
        { label: 'Control de CxC', value: 'Alertas de vencimiento' }
      ],
      quote: 'Emitir honorarios a corporaciones solía ser engorroso en el portal del SRI. En WebFix emito en un segundo y la factura llega directo al departamento contable.',
      author: 'Dra. Andrea Morales',
      role: 'Directora Legal & Tributaria',
      company: 'Morales & Asociados (Guayaquil)'
    },
    distribuidoras: {
      tag: 'Distribuidoras & Mayoristas',
      tagBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
      title: 'Control multibodega, despachos y flujo de caja en tiempo real',
      description: 'Estructurado para empresas comerciales, importadoras y distribuidores. Coordina existencias entre almacenes, asigna cupos de crédito y concilia bancos al centavo.',
      bullets: [
        'Kardex promedio ponderado multibodega con transferencias internas y alertas de mínimos.',
        'Gestión de cupos de crédito, plazos de pago y cartera CxC/CxP conectada a bancos.',
        'Listas de precios mayoristas diferenciadas por volumen y condiciones comerciales.',
        'Conciliación bancaria multi-cuenta con Banco Pichincha, Guayaquil, Produbanco y Pacífico.'
      ],
      checkColor: 'text-indigo-600 dark:text-indigo-400',
      metric: '100%',
      metricLabel: 'sincronización en tiempo real entre sucursales',
      metricSubtext: 'Ventas, existencias y bancos conectados en vivo sin desfases.',
      features: [
        { label: 'Control multibodega', value: 'Stock centralizado' },
        { label: 'Límites de crédito', value: 'Control de cupo' },
        { label: 'Conciliación bancaria', value: 'Matching inteligente' }
      ],
      quote: 'Con 3 bodegas en diferentes ciudades necesitábamos certeza absoluta del stock antes de despachar. WebFix nos dio visibilidad total de inventario y cartera.',
      author: 'Ing. Roberto Peñafiel',
      role: 'Gerente de Distribución',
      company: 'Disproquim Ecuador'
    }
  };

  const currentSegment = commercialSegments[activeSegmentTab] || commercialSegments.comercios;

  return (
    <div className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      
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

      {/* 4. SECCIÓN DE PESTAÑAS INTERACTIVAS POR SEGMENTO COMERCIAL (ESTILO BREVO) */}
      <section className="w-full bg-white dark:bg-[#0c1017] border-b border-slate-200/80 dark:border-slate-800">
        <ScrollReveal direction="up">
          <div className="w-[90%] max-w-[1720px] mx-auto py-20 md:py-28">
            
            {/* Título centrado limpio y sin dots ni burbujas */}
            <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
              <h2 className="text-[#0F172A] dark:text-white font-bold text-3xl sm:text-4xl tracking-tight">
                Pensado para todo negocio: de tiendas locales a grandes distribuidoras
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mt-3">
                Elige cómo WebFix transforma la operativa diaria de tu rubro comercial.
              </p>
            </div>

            {/* Selector tipo píldora centrado */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-12 md:mb-16">
              {segmentTabs.map((tab) => {
                const isActive = activeSegmentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSegmentTab(tab.id)}
                    className={
                      isActive
                        ? 'bg-[#0F172A] dark:bg-white text-white dark:text-slate-900 rounded-full px-5 py-2.5 font-semibold text-sm cursor-pointer transition-all shadow-none select-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full px-5 py-2.5 font-medium text-sm cursor-pointer transition-all shadow-none select-none'
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Contenido Dinámico de la Pestaña Activa (Split 50% / 50%) */}
            <div key={activeSegmentTab} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-stretch animate-in fade-in duration-200">
              
              {/* Lado Izquierdo (Propuesta de Valor & Viñetas Directas) */}
              <div className="lg:col-span-6 flex flex-col justify-between text-left space-y-6">
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block mb-3 w-fit ${currentSegment.tagBg}`}>
                    {currentSegment.tag}
                  </span>
                  
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
                    {currentSegment.title}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed mb-6">
                    {currentSegment.description}
                  </p>

                  <div className="space-y-3.5">
                    {currentSegment.bullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full p-0.5 shrink-0">
                          <Check className={`w-5 h-5 ${currentSegment.checkColor} stroke-[2.5]`} />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 text-sm sm:text-base font-medium leading-snug">
                          {bullet}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="bg-[#0F172A] hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 font-semibold px-7 py-3.5 rounded-full inline-flex items-center gap-2 cursor-pointer transition-all shadow-none select-none text-sm sm:text-base w-fit"
                  >
                    <span>Probar gratis ahora</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Lado Derecho (Tarjeta de Impacto & Prueba Social Tangible) */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 bg-white dark:bg-slate-900/90 flex flex-col justify-between h-full text-left">
                  <div>
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                        Impacto Real en Operación
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                        <span className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                          {currentSegment.metric}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold text-lg sm:text-xl leading-snug">
                          {currentSegment.metricLabel}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
                        {currentSegment.metricSubtext}
                      </p>
                    </div>

                    {/* Micro-resumen visual de características clave */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-6 mb-6 border-b border-slate-100 dark:border-slate-800">
                      {currentSegment.features.map((item, fIdx) => (
                        <div key={fIdx} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                            {item.label}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Testimonio / cita de cliente real de ese sector con autor y empresa */}
                  <div className="pt-2">
                    <blockquote className="text-slate-700 dark:text-slate-300 text-sm sm:text-base italic leading-relaxed mb-4">
                      &ldquo;{currentSegment.quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm text-slate-800 dark:text-slate-200 shrink-0">
                        {currentSegment.author.charAt(0)}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {currentSegment.author}
                        </span>
                        <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                          {currentSegment.role} • {currentSegment.company}
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
      <section className="w-full bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800">
        <ScrollReveal>
          <div className="w-[90%] max-w-[1720px] mx-auto py-20 md:py-28 text-center">
            
            {/* Encabezado limpio sin dots ni burbujas */}
            <div className="max-w-3xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] dark:text-white tracking-tight">
                Precios transparentes y sin sorpresas
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Sin costos ocultos ni cobros por factura emitida. Comienza hoy con 14 días de prueba gratis.
              </p>

              {/* Selector Mensual / Anual (-20%) */}
              <div className="pt-4 flex justify-center">
                <div className="inline-flex items-center p-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 select-none">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      billingCycle === 'yearly'
                        ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Anual</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                      -20%
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 select-none">
                  Precios en dólares estadounidenses (USD) + IVA aplicable en Ecuador
                </p>
              </div>
            </div>

            {/* 3 Tarjetas de Planes al 90% */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12 sm:mt-14 text-left items-stretch">
              
              {/* Plan Emprendedor */}
              <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-slate-900/90">
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Emprendedor</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Para negocios que inician con el SRI</p>
                  </div>
                  <div className="mb-6 flex items-baseline gap-1.5">
                    <span className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-950 dark:text-white">
                      ${billingCycle === 'monthly' ? '15' : '12'}
                    </span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/ mes</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Facturas SRI ilimitadas</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Punto de Venta POS</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Directorio de Clientes</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>1 Usuario</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full mt-8 py-3 px-5 rounded-full font-semibold text-sm border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center cursor-pointer"
                >
                  Probar Gratis
                </button>
              </div>

              {/* Plan Negocio Pro (Más Popular) */}
              <div className="rounded-3xl border-2 border-blue-600 dark:border-blue-500 shadow-sm relative bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col justify-between">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white tracking-wide uppercase select-none">
                  Más Popular
                </div>
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Negocio Pro</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Para comercios con inventario y POS</p>
                  </div>
                  <div className="mb-6 flex items-baseline gap-1.5">
                    <span className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-950 dark:text-white">
                      ${billingCycle === 'monthly' ? '29' : '23'}
                    </span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/ mes</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span className="font-medium text-slate-900 dark:text-white">Todo lo de Emprendedor</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Inventario & Kardex Multibodega</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Cuentas por Cobrar (CxC)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Hasta 3 Usuarios</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full mt-8 py-3 px-5 rounded-full font-bold text-sm bg-[#0F172A] hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors text-center cursor-pointer shadow-none"
                >
                  Comenzar con Pro
                </button>
              </div>

              {/* Plan Empresarial */}
              <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-slate-900/90">
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Empresarial</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Para empresas con gestión completa</p>
                  </div>
                  <div className="mb-6 flex items-baseline gap-1.5">
                    <span className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-950 dark:text-white">
                      ${billingCycle === 'monthly' ? '59' : '47'}
                    </span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/ mes</span>
                  </div>
                  <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span className="font-medium text-slate-900 dark:text-white">Todo lo de Pro</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Captura OCR con IA ilimitada</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Contabilidad & Asientos automáticos</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span>Usuarios ilimitados</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full mt-8 py-3 px-5 rounded-full font-semibold text-sm border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center cursor-pointer"
                >
                  Probar Empresarial
                </button>
              </div>

            </div>

          </div>
        </ScrollReveal>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section className="w-full bg-white dark:bg-slate-950">
        <ScrollReveal>
          <div className="w-[90%] max-w-4xl mx-auto py-20 md:py-24 border-t border-slate-200/80 dark:border-slate-800">
            
            {/* Título centrado limpio sin dots */}
            <div className="text-center mb-10 sm:mb-12 space-y-2">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                Preguntas Frecuentes
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
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
                      className="w-full py-4 text-left flex items-center justify-between font-semibold text-base sm:text-lg text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 cursor-pointer group"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <ChevronDown 
                        size={18} 
                        className={`shrink-0 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                    {isOpen && (
                      <div 
                        id={answerId}
                        className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed py-3 border-b border-slate-200/80 dark:border-slate-800/80 animate-in fade-in duration-150"
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
      <section className="w-full bg-white dark:bg-slate-950">
        <ScrollReveal>
          <div className="w-[90%] max-w-[1720px] mx-auto pb-24 md:pb-32">
            <div className="rounded-3xl md:rounded-[40px] p-8 sm:p-14 lg:p-16 text-center text-white border border-slate-800 relative overflow-hidden bg-[#0F172A]">
              
              {/* Tag píldora sutil */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20 select-none mb-6">
                14 Días de Prueba Gratis • Sin Tarjeta de Crédito
              </div>

              {/* H2 de alta conversión */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
                Comienza a facturar y controlar tu negocio hoy.
              </h2>

              {/* Subtítulo de 2 líneas */}
              <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
                Únete a cientos de emprendedores ecuatorianos que ya modernizaron su gestión tributaria y comercial con WebFix.
              </p>

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto bg-white hover:bg-slate-100 text-[#0F172A] font-bold px-8 py-4 rounded-full text-base flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <span>Crear Cuenta Gratis</span>
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/contacto')}
                  className="w-full sm:w-auto bg-transparent hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-full text-base border border-white/30 cursor-pointer transition-colors"
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
