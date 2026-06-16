import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Sun, 
  Moon, 
  Layers, 
  ShieldCheck, 
  Zap, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  FileSpreadsheet,
  PackageCheck,
  Calculator,
  MailCheck,
  TrendingUp,
  DollarSign
} from 'lucide-react';

export default function LandingPage({ isDarkMode, setIsDarkMode }) {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'yearly'
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const features = [
    {
      icon: <MailCheck className="text-blue-500" size={24} />,
      title: "Facturación Electrónica Ilimitada",
      description: "Emisión y autorización oficial ante el SRI de forma instantánea. Envío automático al correo del cliente con la nueva plantilla oficial."
    },
    {
      icon: <PackageCheck className="text-emerald-500" size={24} />,
      title: "Control de Inventarios Avanzado",
      description: "Kárdex automatizado, alertas de stock mínimo, transferencia entre bodegas y ajustes de inventario rápidos."
    },
    {
      icon: <Calculator className="text-indigo-500" size={24} />,
      title: "Contabilidad Integrada",
      description: "Generación automática de asientos contables al facturar o comprar, balances generales y reportes listos para declarar."
    },
    {
      icon: <TrendingUp className="text-purple-500" size={24} />,
      title: "Dashboard de Rendimiento",
      description: "Métricas en tiempo real de ingresos, egresos, cuentas por cobrar, cuentas por pagar y rentabilidad del negocio."
    },
    {
      icon: <Layers className="text-orange-500" size={24} />,
      title: "Sistema Multi-Inquilino Modular",
      description: "Los módulos se activan según tu plan de suscripción. Apartados básicos de configuración y perfil siempre accesibles."
    },
    {
      icon: <ShieldCheck className="text-teal-500" size={24} />,
      title: "Seguridad y Respaldos en Nube",
      description: "Datos aislados y protegidos con reglas de seguridad estrictas en Firebase Firestore, con disponibilidad 24/7."
    }
  ];

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
      recommended: false,
      color: "from-blue-500 to-indigo-500"
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
      recommended: true,
      color: "from-indigo-600 to-purple-600"
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
      recommended: false,
      color: "from-purple-600 to-pink-600"
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
      a: "Aceptamos pagos directos mediante tarjetas de crédito o débito a través de la pasarela segura **PayPhone**, o mediante reporte de **Transferencia Bancaria** el cual es verificado manualmente por nuestro equipo en menos de 2 horas."
    }
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 overflow-x-hidden ${isDarkMode ? 'bg-[#020204] text-gray-100' : 'bg-[#fafafa] text-gray-900'}`}>
      
      {/* Decorative Blur Blobs */}
      <div className={`absolute top-0 right-0 w-[45rem] h-[45rem] rounded-full filter blur-[150px] pointer-events-none -z-10 transition-all duration-500 ${isDarkMode ? 'bg-purple-950/20 opacity-40' : 'bg-purple-100/60 opacity-60'}`}></div>
      <div className={`absolute top-[40%] left-0 w-[40rem] h-[40rem] rounded-full filter blur-[150px] pointer-events-none -z-10 transition-all duration-500 ${isDarkMode ? 'bg-blue-950/20 opacity-30' : 'bg-blue-50/70 opacity-60'}`}></div>

      {/* NAVBAR */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${isDarkMode ? 'bg-[#020204]/80 border-white/5' : 'bg-white/80 border-slate-200/60'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#1C40F2] to-[#6366f1] flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight">WebFix ERP</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <button onClick={() => document.getElementById('beneficios')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors cursor-pointer">Beneficios</button>
            <button onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors cursor-pointer">Planes</button>
            <button onClick={() => document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors cursor-pointer">Preguntas Frecuentes</button>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={`p-2 rounded-xl transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-amber-400' : 'bg-white border-slate-200 text-indigo-600'}`}
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
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
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-28 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 mb-8 animate-pulse">
          <Sparkles size={12} /> Lanzamiento Oficial SaaS v2.0
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight max-w-4xl leading-tight mb-6">
          Lleva el control de tu empresa en <span className="bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent">Ecuador de forma fácil</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed font-medium">
          Facturación electrónica ilimitada autorizada por el SRI, gestión de inventario automatizada, contabilidad simplificada y chatbot financiero con Inteligencia Artificial.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-4 text-xs font-bold text-white bg-primary hover:bg-[#1633c1] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:scale-[1.03] active:scale-[0.97] transition-all"
          >
            Prueba Gratis 14 Días <ArrowRight size={14} />
          </button>
          <button 
            onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })}
            className={`px-8 py-4 text-xs font-bold rounded-xl border flex items-center justify-center transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
          >
            Ver Planes de Suscripción
          </button>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section id="beneficios" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200/50 dark:border-white/5 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">Todo lo que tu negocio necesita para escalar</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">Módulos perfectamente integrados que se activan según tus necesidades y el plan de suscripción contratado.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-[#0f0f11]/60 border-white/5 hover:border-white/10' : 'bg-white border-slate-200/80 hover:shadow-lg hover:shadow-slate-100'}`}>
              <div className="p-3 w-fit rounded-xl bg-slate-100 dark:bg-white/5 mb-5">{feat.icon}</div>
              <h3 className="text-sm font-bold mb-2.5">{feat.title}</h3>
              <p className="text-[11px] font-medium leading-relaxed text-gray-500 dark:text-gray-400">{feat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="precios" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200/50 dark:border-white/5 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">Planes diseñados para cada etapa de tu negocio</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">Todos nuestros planes incluyen facturación del SRI ilimitada. La diferencia radica en la potencia y alcance de tus herramientas.</p>
          
          {/* Toggle Billing Period */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border dark:border-white/5 select-none">
            <button 
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${billingPeriod === 'monthly' ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mensual
            </button>
            <button 
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${billingPeriod === 'yearly' ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Anual <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {plans.map((plan, idx) => (
            <div key={idx} className={`p-8 rounded-3xl border flex flex-col justify-between transition-all duration-300 relative ${
              plan.recommended 
                ? (isDarkMode ? 'bg-[#0f0f11] border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)]' : 'bg-white border-primary shadow-[0_15px_30px_rgba(28,64,242,0.08)]') 
                : (isDarkMode ? 'bg-[#0f0f11]/50 border-white/5 hover:border-white/10' : 'bg-white border-slate-200/80')
            }`}>
              {plan.recommended && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md">
                  MÁS RECOMENDADO
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-bold mb-1.5">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black">$</span>
                  <span className="text-5xl font-black">{plan.price}</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">/ mes</span>
                </div>
                
                <hr className={`border-t mb-6 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`} />
                
                <ul className="space-y-3.5 mb-8 text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <CheckCircle2 size={14} className="text-[#1C40F2] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => navigate(`/register?plan=${plan.id}&period=${billingPeriod}`)}
                className={`w-full py-4 text-xs font-bold tracking-wider uppercase rounded-xl transition-all active:scale-98 ${
                  plan.recommended 
                    ? 'bg-primary hover:bg-[#1633c1] text-white shadow-lg shadow-blue-500/10' 
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
      <section id="faqs" className="max-w-4xl mx-auto px-6 py-16 border-t border-slate-200/50 dark:border-white/5 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">Preguntas Frecuentes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Todo lo que necesitas aclarar sobre el sistema de facturación y el modelo SaaS.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className={`rounded-2xl border transition-all ${isDarkMode ? 'bg-[#0f0f11]/40 border-white/5' : 'bg-white border-slate-200/80'}`}>
              <button 
                onClick={() => toggleFaq(idx)}
                className="w-full px-6 py-4 flex items-center justify-between font-bold text-xs sm:text-sm text-left outline-none"
              >
                <span>{faq.q}</span>
                {activeFaq === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {activeFaq === idx && (
                <div className="px-6 pb-5 pt-1 text-[11px] sm:text-xs leading-relaxed text-gray-500 dark:text-gray-400 border-t border-slate-200/20 dark:border-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`border-t py-8 transition-colors ${isDarkMode ? 'bg-[#09090b] border-white/5 text-gray-500' : 'bg-white border-slate-200 text-slate-400'}`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">WebFix ERP</span>
          </div>
          <p className="text-[11px]">© WebFix 2026. Todos los derechos reservados. Diseñado en Ecuador.</p>
        </div>
      </footer>

    </div>
  );
}
