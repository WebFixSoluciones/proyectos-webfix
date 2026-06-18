import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  Sun, 
  Moon, 
  Layers, 
  ShieldCheck, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Monitor,
  Package,
  FileText,
  Calculator,
  Plus,
  Search,
  ShoppingCart,
  TrendingUp,
  DollarSign
} from 'lucide-react';

export default function LandingPage({ isDarkMode, setIsDarkMode }) {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'yearly'
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'facturacion' | 'inventario' | 'gastos'

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const solutionsData = {
    pos: {
      title: "Punto de Venta (POS) Comercial",
      desc: "Terminal de ventas ágil optimizada para atención rápida al público. Facturación automática al cerrar la orden y registro en caja.",
      bullets: [
        "Apertura y cierre de caja diario en un clic",
        "Búsqueda instantánea de productos con lector de barras",
        "Soporte multi-pago (Efectivo, Tarjeta, Transferencia)",
        "Generación automática del documento para el SRI"
      ],
      uiSim: (
        <div className="border border-[#CAD1F4] dark:border-white/10 rounded-2xl bg-white dark:bg-[#0f111a] p-5 shadow-sm text-left font-sans select-none w-full max-w-sm mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">Terminal POS - Caja 01</span>
            </div>
            <span className="text-[11px] font-bold text-primary">Venta Activa</span>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-xs font-semibold text-black dark:text-white">
              <span>1x Monitor LG 27\" UltraGear</span>
              <span>$299.00</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-black dark:text-white">
              <span>2x Teclado Mecánico RGB</span>
              <span>$90.00</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-black dark:text-white">
              <span>1x Mouse Inalámbrico Pro</span>
              <span>$45.00</span>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-white/5 pt-3 mb-4 space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
              <span>Subtotal 15%</span>
              <span>$377.39</span>
            </div>
            <div className="flex justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
              <span>IVA (15%)</span>
              <span>$56.61</span>
            </div>
            <div className="flex justify-between text-sm font-black text-black dark:text-white">
              <span>Total a Pagar</span>
              <span>$434.00</span>
            </div>
          </div>
          <button onClick={() => navigate('/register')} className="w-full py-3 bg-primary hover:bg-[#1633c1] text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-all shadow-md shadow-blue-500/10">
            Cobrar y Emitir Factura
          </button>
        </div>
      )
    },
    facturacion: {
      title: "Facturación Electrónica Oficial SRI",
      desc: "Emisión y envío automático de comprobantes de acuerdo a las normativas del SRI. Certificado de firma digital .p12 integrado.",
      bullets: [
        "Emisión ILIMITADA de facturas en todos los planes",
        "Firma automática del comprobante y envío al cliente",
        "Envío al correo con plantilla flat design de alto contraste",
        "Autorización y conexión inmediata con los servidores del SRI"
      ],
      uiSim: (
        <div className="border border-[#CAD1F4] dark:border-white/10 rounded-2xl bg-white dark:bg-[#0f111a] p-5 shadow-sm text-left font-sans select-none w-full max-w-sm mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-4">
            <span className="text-[10px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">Comprobantes Recientes</span>
            <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">SRI Conectado</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <div>
                <p className="text-xs font-bold text-black dark:text-white">FAC-001-002-000004521</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Juan Pérez • $434.00</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-green-500 text-white rounded-lg">Autorizado</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <div>
                <p className="text-xs font-bold text-black dark:text-white">FAC-001-002-000004520</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">María López • $120.50</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-green-500 text-white rounded-lg">Autorizado</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <div>
                <p className="text-xs font-bold text-black dark:text-white">RET-001-001-000001092</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Proveedor S.A. • Retención</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-green-500 text-white rounded-lg">Autorizado</span>
            </div>
          </div>
        </div>
      )
    },
    inventario: {
      title: "Control de Inventarios & Bodegas",
      desc: "Kárdex de mercadería automatizado y gestión multi-bodega en tiempo real. Configura categorías, marcas y alertas de stock.",
      bullets: [
        "Ajuste y transferencia de stock entre bodegas",
        "Kárdex automatizado con cálculo de costo promedio ponderado",
        "Alertas en pantalla cuando los productos lleguen al stock mínimo",
        "Parametrización simplificada de IVA del SRI (15%, 8%, 0%)"
      ],
      uiSim: (
        <div className="border border-[#CAD1F4] dark:border-white/10 rounded-2xl bg-white dark:bg-[#0f111a] p-5 shadow-sm text-left font-sans select-none w-full max-w-sm mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-4">
            <span className="text-[10px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">Estado de Stock</span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Bodega Central</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5 text-black dark:text-white">
                <span>iPhone 15 Pro Max</span>
                <span className="text-emerald-500">45 Unidades (Suficiente)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div className="w-4/5 h-full bg-emerald-500"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5 text-black dark:text-white">
                <span>MacBook Air M3</span>
                <span className="text-emerald-500">18 Unidades (Suficiente)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div className="w-3/5 h-full bg-emerald-500"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5 text-black dark:text-white">
                <span>Mouse Inalámbrico Pro</span>
                <span className="text-amber-500">3 Unidades (Stock Mínimo)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div className="w-1/5 h-full bg-amber-500"></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    gastos: {
      title: "Gestión de Compras y Gastos",
      desc: "Control absoluto de egresos y facturas de compras de proveedores. Automatiza tus declaraciones cruzando ventas y gastos.",
      bullets: [
        "Registro y homologación de compras de proveedores",
        "Control de egresos para cálculo del IVA a declarar",
        "Carga rápida de claves de acceso del SRI para validar facturas",
        "Reportes financieros detallados de flujos y egresos"
      ],
      uiSim: (
        <div className="border border-[#CAD1F4] dark:border-white/10 rounded-2xl bg-white dark:bg-[#0f111a] p-5 shadow-sm text-left font-sans select-none w-full max-w-sm mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-4">
            <span className="text-[10px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">Distribución de Gastos</span>
            <span className="text-[10px] font-bold text-rose-500">-$1,420.00 este mes</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <div className="flex-1 flex justify-between text-xs font-semibold text-black dark:text-white">
                <span>Inventario/Mercadería</span>
                <span>$980.00 (69%)</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <div className="flex-1 flex justify-between text-xs font-semibold text-black dark:text-white">
                <span>Servicios de Oficina</span>
                <span>$240.00 (17%)</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <div className="flex-1 flex justify-between text-xs font-semibold text-black dark:text-white">
                <span>Marketing Digital</span>
                <span>$200.00 (14%)</span>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-white/5 pt-3 mt-1 flex justify-end">
              <button onClick={() => navigate('/register')} className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white dark:bg-white/10 dark:hover:bg-white/20 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors">
                Registrar Gasto
              </button>
            </div>
          </div>
        </div>
      )
    }
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: billingPeriod === 'monthly' ? 29 : 23,
      features: [
        "Facturación Electrónica ILIMITADA",
        "Dashboard de Ventas e Ingresos",
        "Gestión de Clientes y Proveedores",
        "Cuentas por Cobrar y Pagar",
        "Hasta 3 Usuarios",
        "Configuración SRI y Firma Electrónica"
      ],
      cta: "Comenzar Prueba Gratis",
      recommended: false
    },
    {
      id: 'professional',
      name: 'Profesional',
      price: billingPeriod === 'monthly' ? 79 : 63,
      features: [
        "Todo lo de Starter",
        "Módulo de Inventario (Kárdex)",
        "Control de Bodegas y Productos",
        "Equipos de Trabajo y Permisos",
        "Calendario y Tareas Colaborativas",
        "Hasta 10 Usuarios"
      ],
      cta: "Comenzar Prueba Gratis",
      recommended: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: billingPeriod === 'monthly' ? 149 : 119,
      features: [
        "Todo lo de Profesional",
        "Contabilidad Completa Avanzada",
        "Balances y Libro Diario Automático",
        "Gestión de Compras y Gastos SRI",
        "Chatbot Asistente con IA (Gemini)",
        "Usuarios ILIMITADOS"
      ],
      cta: "Hablar con Asesor",
      recommended: false
    }
  ];

  const faqs = [
    {
      q: "¿Cómo funciona la facturación electrónica ilimitada?",
      a: "A diferencia de otras plataformas, no cobramos por el número de comprobantes emitidos (facturas, notas de crédito, guías, etc.). Puedes emitir comprobantes de forma ilimitada en cualquiera de los planes. La diferencia de precio radica únicamente en el acceso a módulos de control administrativo (Inventario, Contabilidad, etc.)."
    },
    {
      q: "¿Es obligatoria la firma electrónica?",
      a: "Sí, para facturar electrónicamente de forma oficial en Ecuador necesitas tu certificado de firma electrónica en archivo formato `.p12`. El sistema te permite subir tu firma y digitar tu contraseña de manera segura en la configuración corporativa para firmar digitalmente cada documento."
    },
    {
      q: "¿Puedo cambiar de plan o cancelar en cualquier momento?",
      a: "Por supuesto. Puedes subir o bajar de categoría de plan (Upgrade/Downgrade) en cualquier momento. Si pagas anualmente, obtienes un 20% de descuento sobre la tarifa regular mensual."
    },
    {
      q: "¿Qué métodos de pago aceptan?",
      a: "Aceptamos pagos directos mediante tarjetas de crédito o débito a través de la pasarela segura PayPhone, o mediante reporte de Transferencia Bancaria el cual es verificado manualmente por nuestro equipo en menos de 2 horas."
    }
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 overflow-x-hidden ${isDarkMode ? 'bg-[#06070d] text-gray-100' : 'bg-[#F2F4FF] text-black'}`}>
      
      {/* NAVBAR */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${isDarkMode ? 'bg-[#06070d]/80 border-white/5' : 'bg-[#F2F4FF]/80 border-[#CAD1F4]'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-base font-black tracking-tight text-black dark:text-white">WebFix ERP</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-gray-500 dark:text-gray-400">
            <button onClick={() => document.getElementById('soluciones')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors cursor-pointer">Soluciones</button>
            <button onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors cursor-pointer">Planes</button>
            <button onClick={() => document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors cursor-pointer">Preguntas Frecuentes</button>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={`p-2 rounded-xl transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-amber-400' : 'bg-white border-[#CAD1F4] text-primary'}`}
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-[#CAD1F4] bg-white hover:bg-slate-50 text-black'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate('/register')} 
              className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-[#1633c1] rounded-xl shadow-md shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Registrarse
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 mb-6 select-none">
            <Sparkles size={12} /> Facturación y Administración Empresarial
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6 text-black dark:text-white">
            Automatiza la contabilidad de tu negocio en Ecuador
          </h1>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 max-w-lg mb-8 leading-relaxed font-medium">
            Control de inventarios por bodegas, facturación electrónica ilimitada conectada con el SRI, reportes financieros de caja y módulo POS para ventas rápidas.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => navigate('/register')}
              className="px-6 py-3.5 text-xs font-bold text-white bg-primary hover:bg-[#1633c1] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Prueba Gratis 14 Días <ArrowRight size={14} />
            </button>
            <button 
              onClick={() => document.getElementById('soluciones')?.scrollIntoView({ behavior: 'smooth' })}
              className={`px-6 py-3.5 text-xs font-bold rounded-xl border flex items-center justify-center transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-[#CAD1F4] bg-white hover:bg-slate-50 text-black'}`}
            >
              Ver Módulos
            </button>
          </div>
        </div>

        {/* CSS Virtual Mockup - No AI elements */}
        <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-[#0f111a] border border-[#CAD1F4] dark:border-white/5 rounded-3xl p-5 shadow-xl select-none">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-4">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            </div>
            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest uppercase">WebFix ERP - Vista General</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Virtual Dashboard Elements */}
            <div className="col-span-3 p-4 rounded-2xl bg-[#F2F4FF] dark:bg-white/5 border border-[#CAD1F4] dark:border-white/5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Ingresos Totales (Mes)</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">+18.5%</span>
              </div>
              <h4 className="text-xl font-black text-black dark:text-white">$14,890.50</h4>
            </div>
            <div className="p-3 rounded-2xl border border-slate-150 dark:border-white/5">
              <span className="block text-[8px] font-bold text-gray-500 dark:text-gray-400">Ventas POS</span>
              <p className="text-xs font-black text-black dark:text-white">128 ordenes</p>
            </div>
            <div className="p-3 rounded-2xl border border-slate-150 dark:border-white/5">
              <span className="block text-[8px] font-bold text-gray-500 dark:text-gray-400">Comprobantes</span>
              <p className="text-xs font-black text-black dark:text-white">99% autorizado</p>
            </div>
            <div className="p-3 rounded-2xl border border-slate-150 dark:border-white/5">
              <span className="block text-[8px] font-bold text-gray-500 dark:text-gray-400">Alertas Stock</span>
              <p className="text-xs font-black text-amber-500">3 Productos</p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTIONS SECTION */}
      <section id="soluciones" className="max-w-7xl mx-auto px-6 py-16 border-t border-[#CAD1F4] dark:border-white/5 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight mb-4 text-black dark:text-white">Módulos y Soluciones Destacadas</h2>
          <p className="text-sm text-gray-700 dark:text-gray-400 max-w-md mx-auto">Explora las herramientas diseñadas para digitalizar cada área de tu negocio.</p>
        </div>

        {/* Tab switchers - Corporate flat style */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-xl mx-auto">
          {[
            { id: 'pos', label: 'Punto de Venta (POS)', icon: ShoppingCart },
            { id: 'facturacion', label: 'Facturación SRI', icon: FileText },
            { id: 'inventario', label: 'Inventario & Stock', icon: Package },
            { id: 'gastos', label: 'Gastos & Compras', icon: Calculator }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-primary border-primary text-white shadow-md' 
                    : (isDarkMode ? 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10' : 'bg-white border-[#CAD1F4] text-black hover:bg-slate-50')
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Solution view - Corporate flat design */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center bg-white dark:bg-[#0f111a] border border-[#CAD1F4] dark:border-white/5 rounded-3xl p-8 shadow-sm">
          <div className="text-left flex flex-col justify-between h-full">
            <div>
              <span className="text-[9px] font-black tracking-wider uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4 inline-block select-none">Módulo Profesional</span>
              <h3 className="text-2xl font-black mb-4 text-black dark:text-white">{solutionsData[activeTab].title}</h3>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-6 font-medium">{solutionsData[activeTab].desc}</p>
              
              <ul className="space-y-3 mb-8">
                {solutionsData[activeTab].bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-black dark:text-gray-300 font-semibold">
                    <div className="w-4.5 h-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                      <Check size={10} className="stroke-[3]" />
                    </div>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <button onClick={() => navigate('/register')} className="w-fit px-6 py-3 bg-primary hover:bg-[#1633c1] text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all flex items-center gap-2 shadow-md">
              Habilitar Módulo <ArrowRight size={14} />
            </button>
          </div>

          <div className="flex items-center justify-center p-4 bg-[#F2F4FF] dark:bg-[#06070d] rounded-2xl border border-[#CAD1F4] dark:border-white/5">
            {solutionsData[activeTab].uiSim}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="precios" className="max-w-7xl mx-auto px-6 py-16 border-t border-[#CAD1F4] dark:border-white/5 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight mb-4 text-black dark:text-white">Planes diseñados para cada etapa de tu negocio</h2>
          <p className="text-sm text-gray-700 dark:text-gray-400 max-w-md mx-auto mb-8">Todos nuestros planes incluyen facturación del SRI ilimitada. La diferencia radica en la potencia y alcance de tus herramientas.</p>
          
          {/* Toggle Billing Period */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-white/5 border border-[#CAD1F4] dark:border-white/5 select-none">
            <button 
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${billingPeriod === 'monthly' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-750'}`}
            >
              Mensual
            </button>
            <button 
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${billingPeriod === 'yearly' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-750'}`}
            >
              Anual <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-black tracking-widest">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {plans.map((plan, idx) => (
            <div key={idx} className={`p-8 rounded-3xl border flex flex-col justify-between bg-white dark:bg-[#0f111a] transition-all duration-300 relative ${
              plan.recommended 
                ? 'border-primary shadow-[0_12px_24px_rgba(28,64,242,0.12)]' 
                : 'border-[#CAD1F4] dark:border-white/5'
            }`}>
              {plan.recommended && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-primary text-white shadow-md">
                  MÁS RECOMENDADO
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-bold mb-1.5 text-black dark:text-white">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-black dark:text-white">$</span>
                  <span className="text-5xl font-black text-black dark:text-white">{plan.price}</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">/ mes</span>
                </div>
                
                <hr className="border-t border-slate-100 dark:border-white/5 mb-6" />
                
                <ul className="space-y-3.5 mb-8 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <Check size={12} className="text-primary stroke-[3.5] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => navigate(`/register?plan=${plan.id}&period=${billingPeriod}`)}
                className={`w-full py-4 text-xs font-bold tracking-wider uppercase rounded-xl transition-all active:scale-98 cursor-pointer ${
                  plan.recommended 
                    ? 'bg-primary hover:bg-[#1633c1] text-white shadow-lg shadow-blue-500/15' 
                    : (isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700')
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQS SECTION */}
      <section id="faqs" className="max-w-4xl mx-auto px-6 py-16 border-t border-[#CAD1F4] dark:border-white/5 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight mb-4 text-black dark:text-white">Preguntas Frecuentes</h2>
          <p className="text-sm text-gray-750 dark:text-gray-400">Todo lo que necesitas aclarar sobre el sistema de facturación y el modelo SaaS.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className={`rounded-2xl border bg-white dark:bg-[#0f111a] transition-all border-[#CAD1F4] dark:border-white/5`}>
              <button 
                onClick={() => toggleFaq(idx)}
                className="w-full px-6 py-4 flex items-center justify-between font-bold text-xs sm:text-sm text-left text-black dark:text-white outline-none cursor-pointer"
              >
                <span>{faq.q}</span>
                {activeFaq === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {activeFaq === idx && (
                <div className="px-6 pb-5 pt-1 text-[11px] sm:text-xs leading-relaxed text-gray-650 dark:text-gray-350 border-t border-slate-100 dark:border-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`border-t py-8 transition-colors ${isDarkMode ? 'bg-[#04050a] border-white/5 text-gray-500' : 'bg-white border-[#CAD1F4] text-slate-500'}`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold text-black dark:text-white">WebFix ERP</span>
          </div>
          <p className="text-[11px]">© WebFix 2026. Todos los derechos reservados. Diseñado en Ecuador.</p>
        </div>
      </footer>

    </div>
  );
}
