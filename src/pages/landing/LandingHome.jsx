import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle, ShieldCheck, Check, Laptop, Smartphone, Zap, Star, FileSpreadsheet, TrendingUp, DollarSign } from 'lucide-react';
import heroBilling from '../../assets/hero_billing.png';

export default function LandingHome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sri'); // 'sri' | 'gastos' | 'caja' | 'pos'
  const timerRef = useRef(null);

  const tabsList = [
    {
      id: 'sri',
      label: 'Facturación SRI',
      title: 'Emite facturas oficiales en segundos',
      desc: 'Cumple al 100% con el SRI de forma automática. Carga tu firma electrónica .p12 por única vez y emite comprobantes ilimitados que se autorizan y envían de inmediato.',
      bullets: [
        'Emisión ilimitada de facturas en todos los planes',
        'Firma electrónica digital en un clic',
        'Envío automático del PDF y XML al correo del cliente',
        'Historial de autorización y validación del SRI en tiempo real'
      ],
      colorClass: 'text-primary'
    },
    {
      id: 'gastos',
      label: 'Control de Gastos',
      title: 'Sabe exactamente a dónde va tu dinero',
      desc: 'Registra tus compras y egresos clasificándolos por categorías. Mantén el control de tus desembolsos para optimizar el flujo de caja sin necesidad de hojas de cálculo complejas.',
      bullets: [
        'Registro fácil de facturas de proveedores',
        'Clasificación automática por categorías de egresos',
        'Cruce automático de IVA de ventas y compras',
        'Dashboard de gastos mensuales por rubros'
      ],
      colorClass: 'text-purple-600'
    },
    {
      id: 'caja',
      label: 'Ingresos y Flujo de Caja',
      title: 'Tu dinero bajo control en tiempo real',
      desc: 'Registra cada venta o ingreso y visualiza la salud financiera de tu negocio. Compara tus ingresos contra tus egresos para saber la utilidad real de tu día a día.',
      bullets: [
        'Dashboard visual de ingresos vs. egresos',
        'Monitoreo de flujo de caja diario, semanal y mensual',
        'Reportes gráficos comprensibles, sin jergas contables',
        'Alertas de saldo para evitar sorpresas'
      ],
      colorClass: 'text-emerald-600'
    },
    {
      id: 'pos',
      label: 'Punto de Venta (POS)',
      title: 'Ventas rápidas en mostrador',
      desc: 'Optimizado para tablets, laptops y computadoras. Registra tus ventas de mostrador en tiempo récord con un catálogo visual ágil conectado directamente a tu inventario.',
      bullets: [
        'Apertura y cierre de caja rápido',
        'Catálogo visual de productos con búsqueda instantánea',
        'Soporte para múltiples formas de pago',
        'Descarga automática de stock en tiempo real'
      ],
      colorClass: 'text-amber-500'
    }
  ];

  // Autoplay function for the Stream Carousel (Duda style)
  const startAutoplay = () => {
    stopAutoplay();
    timerRef.current = setInterval(() => {
      setActiveTab((prevTab) => {
        const currentIndex = tabsList.findIndex((t) => t.id === prevTab);
        const nextIndex = (currentIndex + 1) % tabsList.length;
        return tabsList[nextIndex].id;
      });
    }, 9000); // 9 seconds per step
  };

  const stopAutoplay = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, []);

  const handleTabClick = (tabId) => {
    stopAutoplay();
    setActiveTab(tabId);
    startAutoplay(); // Reset timer on click
  };

  // Render simulation UI according to the active tab
  const renderSimulatedUI = () => {
    switch (activeTab) {
      case 'sri':
        return (
          <div className="w-full max-w-sm bg-white border border-slate-200/80 rounded-card p-5 text-left font-sans select-none animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="text-xs font-black tracking-wider uppercase text-slate-400">Comprobantes SRI</span>
              <span className="text-xs font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> SRI ONLINE
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-card bg-slate-50 border border-slate-100/80">
                <div>
                  <p className="text-xs font-black text-slate-800">FAC-001-002-000008452</p>
                  <p className="text-xs font-medium text-slate-500">Juan Pérez • $120.00</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-emerald-500 text-white rounded-lg">Autorizado</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-card bg-slate-50 border border-slate-100/80">
                <div>
                  <p className="text-xs font-black text-slate-800">FAC-001-002-000008451</p>
                  <p className="text-xs font-medium text-slate-500">María Cárdenas • $45.50</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-emerald-500 text-white rounded-lg">Autorizado</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-card bg-slate-50 border border-slate-100/80">
                <div>
                  <p className="text-xs font-black text-slate-800">RET-001-001-000001201</p>
                  <p className="text-xs font-medium text-slate-500">Proveedor S.A. • Retención</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-emerald-500 text-white rounded-lg">Autorizado</span>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Firma electrónica activa (.p12)</span>
              <span className="text-primary hover:underline cursor-pointer">Nueva Factura +</span>
            </div>
          </div>
        );
      case 'gastos':
        return (
          <div className="w-full max-w-sm bg-white border border-slate-200/80 rounded-card p-5 text-left font-sans select-none animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="text-xs font-black tracking-wider uppercase text-slate-400">Distribución de Gastos</span>
              <span className="text-xs font-black text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20">-$1,120.00 este mes</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1 text-slate-800">
                  <span>Mercadería / Inventario</span>
                  <span>$750.00 (67%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="w-2/3 h-full bg-purple-600 rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1 text-slate-800">
                  <span>Servicios / Alquiler</span>
                  <span>$220.00 (20%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="w-[20%] h-full bg-indigo-500 rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1 text-slate-800">
                  <span>Publicidad Digital</span>
                  <span>$150.00 (13%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="w-[13%] h-full bg-pink-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Declaración sugerida IVA</span>
              <span className="text-purple-600 hover:underline cursor-pointer">Registrar Gasto +</span>
            </div>
          </div>
        );
      case 'caja':
        return (
          <div className="w-full max-w-sm bg-white border border-slate-200/80 rounded-card p-5 text-left font-sans select-none animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="text-xs font-black tracking-wider uppercase text-slate-400">Resumen de Caja Diario</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">Utilidad Positiva</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-card bg-slate-50 border border-slate-100 text-left">
                <span className="block text-xs font-bold text-slate-400 uppercase">Ingresos</span>
                <span className="text-sm font-black text-emerald-600">+$2,450.00</span>
              </div>
              <div className="p-3 rounded-card bg-slate-50 border border-slate-100 text-left">
                <span className="block text-xs font-bold text-slate-400 uppercase">Egresos</span>
                <span className="text-sm font-black text-rose-500">-$1,120.00</span>
              </div>
            </div>
            <div className="p-3 rounded-card bg-primary/5 border border-primary/10 flex justify-between items-center">
              <div>
                <span className="block text-xs font-bold text-primary uppercase">Saldo Real Neto</span>
                <h4 className="text-base font-black text-primary">$1,330.00</h4>
              </div>
              <TrendingUp size={20} className="text-primary animate-pulse" />
            </div>
          </div>
        );
      case 'pos':
        return (
          <div className="w-full max-w-sm bg-white border border-slate-200/80 rounded-card p-5 text-left font-sans select-none animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="text-xs font-black tracking-wider uppercase text-slate-400">Punto de Venta (Caja Abierta)</span>
              <span className="text-xs font-bold text-primary uppercase tracking-wide">Terminal 01</span>
            </div>
            <div className="space-y-2.5 mb-4">
              <div className="flex justify-between text-xs font-semibold text-slate-800">
                <span>1x Combo Emprendedor</span>
                <span>$85.00</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-800">
                <span>2x Licencia ERP Anual</span>
                <span>$240.00</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3 mb-4 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Subtotal 15%</span>
                <span>$282.61</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>IVA (15%)</span>
                <span>$42.39</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-800 pt-1">
                <span>Total a Cobrar</span>
                <span>$325.00</span>
              </div>
            </div>
            <button className="w-full py-3 bg-primary text-white text-xs font-bold rounded-card uppercase tracking-wider transition-colors hover:bg-primary/95 flex items-center justify-center gap-1.5 border-none cursor-pointer">
              <DollarSign size={14} /> Registrar Venta y SRI
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full overflow-hidden text-slate-800">
      
      {/* HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-32 grid lg:grid-cols-2 gap-16 items-center text-left">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none -z-10 bg-primary animate-liquid-1"></div>
        <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[120px] opacity-25 pointer-events-none -z-10 bg-emerald-400 animate-liquid-2"></div>

        <div>
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 mb-8 select-none">
            <Sparkles size={12} className="animate-spin-slow" /> Control Financiero y SRI Especializado
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6 text-slate-900">
            La forma más fácil de facturar y controlar tu negocio
          </h1>
          <p className="text-base text-slate-650 max-w-lg mb-10 leading-relaxed font-medium">
            Cumple con el SRI ecuatoriano de forma automática y lleva el control real de tus ingresos y egresos diarios. Diseñado para emprendedores que buscan simplicidad, no contabilidad pesada.
          </p>
          
          <div className="flex flex-wrap gap-4 items-center">
            <button 
              onClick={() => navigate('/register')}
              className="landing-button-primary px-8 py-4 text-xs font-extrabold uppercase tracking-wider text-white bg-primary hover:bg-surface-card flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              Comenzar gratis 14 días <ArrowRight size={14} />
            </button>
            <button 
              onClick={() => handleTabClick('sri')}
              className="landing-button-secondary px-8 py-4 text-xs font-extrabold uppercase tracking-wider border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer"
            >
              Ver Demostración
            </button>
          </div>

          <div className="mt-8 flex items-center gap-6 text-xs font-extrabold tracking-wider text-slate-400 uppercase">
            <span className="flex items-center gap-1.5"><Check size={14} className="text-primary" /> Sin Tarjeta de Crédito</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-primary" /> Firma .p12 Integrada</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-primary" /> SRI Ilimitado</span>
          </div>
        </div>

        {/* Hero Interactive Image Container */}
        <div className="relative w-full max-w-xl mx-auto flex items-center justify-center">
          <div className="landing-card border border-slate-200 bg-white p-4 overflow-hidden relative w-full flex items-center justify-center">
            <img 
              src={heroBilling} 
              alt="WebFix Dashboard Mockup" 
              className="w-full h-auto object-cover rounded-card animate-in fade-in zoom-in duration-500"
            />
            {/* Pulsing floating card */}
            <div className="landing-card absolute bottom-6 left-6 bg-white/95 border border-slate-200 p-4 max-w-[200px] flex items-start gap-3 select-none hover:-translate-y-1 transition-transform">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/25">
                <CheckCircle size={18} />
              </div>
              <div>
                <span className="block text-xs font-black text-slate-400 uppercase">Conexión SRI</span>
                <span className="text-xs font-black text-slate-800">100% Autorizadas</span>
                <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span> Activa y firme
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST TICKER / LOGOS */}
      <section className="border-y border-slate-200/80 bg-slate-50 py-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-extrabold tracking-widest text-slate-400 uppercase mb-6">Emprendedores y Negocios en Ecuador confían en WebFix</p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all">
            <span className="text-sm font-black tracking-tight text-slate-700">TripAdvisor Ecuador</span>
            <span className="text-sm font-black tracking-tight text-slate-700">Peluquerías VIP</span>
            <span className="text-sm font-black tracking-tight text-slate-700">EcuShop</span>
            <span className="text-sm font-black tracking-tight text-slate-700">Estudios Jurídicos S.A.</span>
            <span className="text-sm font-black tracking-tight text-slate-700">TechQuito</span>
          </div>
        </div>
      </section>

      {/* STREAM CAROUSEL / INTERACTIVE MODULES SHOWCASE (Duda Style) */}
      <section className="py-20 lg:py-28 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-black tracking-wider uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4 inline-block select-none">Interactividad</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">Todo lo que necesitas, nada de lo que te sobra</h2>
            <p className="text-sm text-slate-500 font-semibold">Interactúa con nuestro simulador para ver cómo WebFix automatiza tu negocio en segundos.</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12 items-center">
            {/* Left Stepper Column */}
            <div className="lg:col-span-2 space-y-4">
              {tabsList.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <div 
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`stream-step text-left p-5 rounded-card cursor-pointer hover:bg-slate-50 transition-all ${
                      isActive ? 'active border-l-4' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <h3 className={`text-sm font-black transition-colors ${isActive ? 'text-primary' : 'text-slate-700'}`}>
                      {tab.label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                      {tab.title}
                    </p>
                    {/* Progress indicator bar */}
                    {isActive && (
                      <div className="w-full bg-slate-100 h-[2px] mt-4 rounded-full overflow-hidden">
                        <div className="stream-step-progress"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Simulation Column */}
            <div className="lg:col-span-3 flex items-center justify-center p-8 bg-surface-card/60 border border-slate-200/80 rounded-card min-h-[380px] relative">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
              
              <div className="relative z-10 w-full flex justify-center">
                {renderSimulatedUI()}
              </div>

              {/* Dynamic Description Box beneath simulation for better UX */}
              <div className="absolute bottom-4 left-6 right-6 hidden md:block text-left bg-white/60 px-4 py-2.5 rounded-card border border-slate-100 text-xs font-semibold text-slate-500">
                <span className="font-extrabold text-slate-800 uppercase block mb-0.5">Enfoque Emprendedor:</span>
                {tabsList.find(t => t.id === activeTab)?.desc}
              </div>
            </div>
          </div>
          
          {/* Detail Block below the Carousel */}
          <div className="mt-16 bg-primary/5 rounded-card p-8 border border-primary/10 grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto text-left">
            <div>
              <h4 className="text-lg font-black text-text-secondary mb-3">
                ¿Cómo ayuda esto a tu declaración tributaria?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Al tener organizadas tus facturas del SRI y tus egresos categorizados, el sistema cruza los valores del IVA automáticamente. Al final de tu periodo, generas el borrador del reporte listo para que lo presentes al SRI, ahorrándote horas de cuadres a mano.
              </p>
            </div>
            <div className="flex flex-col gap-3 justify-center md:items-end">
              <button 
                onClick={() => navigate('/register')}
                className="landing-button-primary px-6 py-3.5 bg-primary hover:bg-surface-card text-white text-xs font-black uppercase tracking-wider w-fit border-none cursor-pointer"
              >
                Prueba Facturación Ilimitada
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* CORE VALUE PILLARS */}
      <section className="py-20 lg:py-28 bg-slate-50 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-black tracking-wider uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4 inline-block select-none">Beneficios Clave</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">Diseñado para Emprendedores, no para contadores</h2>
            <p className="text-sm text-slate-500 font-semibold">Administra el dinero y cumple con la ley sin lidiar con tecnicismos financieros incomprensibles.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            
            <div className="landing-card p-8 bg-white border border-slate-200/80">
              <div className="w-12 h-12 rounded-card bg-primary/10 text-primary flex items-center justify-center mb-6 border border-primary/20">
                <FileSpreadsheet size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-3">Control de Gastos Simple</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Registra tus compras del día, clasifica tus facturas y sabe exactamente en qué estás gastando. Sin contabilidad compleja, solo control real de tu caja.
              </p>
            </div>

            <div className="landing-card p-8 bg-white border border-slate-200/80">
              <div className="w-12 h-12 rounded-card bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6 border border-emerald-500/20">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-3">SRI 100% Autorizado</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Emitir una factura electrónica toma menos de 10 segundos. Conexión directa y firma automatizada autorizada en los servidores del SRI ecuatoriano.
              </p>
            </div>

            <div className="landing-card p-8 bg-white border border-slate-200/80">
              <div className="w-12 h-12 rounded-card bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-6 border border-indigo-500/20">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-3">Firma Electrónica Segura</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Sube tu firma digital .p12 con total seguridad. Tus credenciales se cifran bajo los más altos estándares para firmar comprobantes sin riesgos.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* PERFORMANCE & VELOCITY SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center text-left">
          <div>
            <span className="text-xs font-black tracking-wider uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4 inline-block select-none">Velocidad</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
              Carga en 1 segundo y funciona en cualquier pantalla
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6 font-semibold">
              Olvídate de sistemas lentos e instalaciones complejas. WebFix es una plataforma en la nube optimizada para dispositivos móviles, tablets y PCs, garantizando que puedas emitir facturas en mostrador o revisar tus cuentas en el camino sin demoras.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Zap size={12} className="stroke-[3]" />
                </div>
                <span className="text-xs font-bold text-slate-700">Tiempo de carga inferior a 0.8s</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Laptop size={12} className="stroke-[3]" />
                </div>
                <span className="text-xs font-bold text-slate-700">Compatible con navegadores de escritorio y laptops</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Smartphone size={12} className="stroke-[3]" />
                </div>
                <span className="text-xs font-bold text-slate-700">Optimizado para smartphones y tablets</span>
              </div>
            </div>
          </div>
          <div className="p-8 bg-slate-950 rounded-card text-left border border-slate-900 relative select-none">
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Servidor Activo</span>
            </div>
            <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">Prueba de Rendimiento</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-white font-bold mb-1">
                  <span>WebFix ERP</span>
                  <span className="text-emerald-400">99% (Excelente)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800">
                  <div className="w-[99%] h-full bg-emerald-400 rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 font-bold mb-1">
                  <span>Otros Sistemas Contables</span>
                  <span className="text-rose-400">42% (Lento)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800">
                  <div className="w-[42%] h-full bg-rose-400 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-xs text-slate-500 font-medium leading-relaxed border-t border-slate-900 pt-4">
              Medición basada en Core Web Vitals de Google para dispositivos con conexiones 3G/4G móviles promedio en Ecuador.
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="bg-slate-900 text-white py-16 lg:py-24 relative overflow-hidden text-center">
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] rounded-full mix-blend-screen filter blur-[150px] opacity-10 bg-primary pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <span className="text-xs font-black tracking-wider uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-6 inline-block select-none">Prueba Gratis</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
            Comienza a facturar y controlar tu negocio hoy
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-10 leading-relaxed font-semibold">
            Únete a cientos de emprendedores que ya automatizaron sus procesos SRI. Regístrate en 1 minuto sin tarjetas ni compromisos.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button 
              onClick={() => navigate('/register')}
              className="landing-button-primary w-full sm:w-auto px-8 py-4 text-xs font-black uppercase tracking-wider text-white bg-primary hover:bg-surface-card border-none cursor-pointer"
            >
              Iniciar Prueba Gratuita
            </button>
            <button 
              onClick={() => navigate('/contacto')}
              className="landing-button-secondary w-full sm:w-auto px-8 py-4 text-xs font-black uppercase tracking-wider bg-transparent border border-white hover:bg-white/5 text-white cursor-pointer"
            >
              Preguntas por WhatsApp
            </button>
          </div>
          <div className="mt-8 flex justify-center items-center gap-2.5 text-xs text-slate-400">
            <div className="flex text-amber-400">
              <Star size={12} fill="currentColor" />
              <Star size={12} fill="currentColor" />
              <Star size={12} fill="currentColor" />
              <Star size={12} fill="currentColor" />
              <Star size={12} fill="currentColor" />
            </div>
            <span>Calificado 4.9/5 estrellas por dueños de negocios ecuatorianos.</span>
          </div>
        </div>
      </section>

    </div>
  );
}
