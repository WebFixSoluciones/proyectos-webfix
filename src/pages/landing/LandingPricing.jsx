import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, Sliders } from 'lucide-react';

export default function LandingPricing() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'yearly'
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: billingPeriod === 'monthly' ? 29 : Math.round(29 * 0.8),
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
      price: billingPeriod === 'monthly' ? 79 : Math.round(79 * 0.8),
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
      price: billingPeriod === 'monthly' ? 149 : Math.round(149 * 0.8),
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
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-black">Planes diseñados para cada etapa de tu negocio</h1>
        <p className="text-sm text-gray-650 max-w-md mx-auto mb-8 font-medium">Todos nuestros planes incluyen facturación del SRI ilimitada. La diferencia radica en la potencia y alcance de tus herramientas.</p>
        
        {/* Toggle Billing Period */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-card bg-white border border-border-default select-none">
          <button 
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer border-none ${billingPeriod === 'monthly' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700 bg-transparent'}`}
          >
            Mensual
          </button>
          <button 
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border-none ${billingPeriod === 'yearly' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700 bg-transparent'}`}
          >
            Anual <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-xs font-black tracking-widest">-20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto mb-20">
        {plans.map((plan, idx) => (
          <div key={idx} className={`p-8 rounded-card border flex flex-col justify-between bg-white transition-all duration-300 relative ${
            plan.recommended 
              ? 'border-primary' 
              : 'border-border-default'
          }`}>
            {plan.recommended && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-primary text-white">
                MÁS RECOMENDADO
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-bold mb-1.5 text-black">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-black">$</span>
                <span className="text-5xl font-black text-black">{plan.price}</span>
                <span className="text-xs font-semibold text-gray-500">/ mes</span>
              </div>
              
              <hr className="border-t border-slate-100 mb-6" />
              
              <ul className="space-y-3.5 mb-8 text-xs font-semibold text-gray-700 text-left">
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
              className={`w-full py-4 text-xs font-bold tracking-wider uppercase rounded-card transition-all cursor-pointer border-none ${
                plan.recommended 
                  ? 'bg-primary hover:bg-surface-card text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* DETAILED COMPARATIVE TABLE */}
      <div className="max-w-4xl mx-auto mb-20 text-left">
        <h2 className="text-xl font-black mb-6 text-center">Tabla Comparativa de Módulos</h2>
        <div className="border border-border-default rounded-card bg-white overflow-hidden text-xs font-medium">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-550/5 border-b border-border-default text-gray-650 font-bold uppercase tracking-wider text-xs">
                <th className="px-6 py-4">Módulo / Límite</th>
                <th className="px-6 py-4 text-center">Starter</th>
                <th className="px-6 py-4 text-center">Profesional</th>
                <th className="px-6 py-4 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold">Facturación Electrónica SRI</td>
                <td className="px-6 py-3.5 text-center text-primary font-bold">ILIMITADA</td>
                <td className="px-6 py-3.5 text-center text-primary font-bold">ILIMITADA</td>
                <td className="px-6 py-3.5 text-center text-primary font-bold">ILIMITADA</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold">Cuentas de Usuarios (Límite)</td>
                <td className="px-6 py-3.5 text-center">Hasta 3</td>
                <td className="px-6 py-3.5 text-center">Hasta 10</td>
                <td className="px-6 py-3.5 text-center text-emerald-600 font-bold">ILIMITADO</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold">Módulo de Ventas y POS</td>
                <td className="px-6 py-3.5 text-center"><Check size={14} className="mx-auto text-primary" /></td>
                <td className="px-6 py-3.5 text-center"><Check size={14} className="mx-auto text-primary" /></td>
                <td className="px-6 py-3.5 text-center"><Check size={14} className="mx-auto text-primary" /></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold">Módulo de Inventarios & Bodegas</td>
                <td className="px-6 py-3.5 text-center text-gray-400">No incluido</td>
                <td className="px-6 py-3.5 text-center"><Check size={14} className="mx-auto text-primary" /></td>
                <td className="px-6 py-3.5 text-center"><Check size={14} className="mx-auto text-primary" /></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold">Gastos y Conciliación SRI</td>
                <td className="px-6 py-3.5 text-center text-gray-400">No incluido</td>
                <td className="px-6 py-3.5 text-center text-gray-400">No incluido</td>
                <td className="px-6 py-3.5 text-center"><Check size={14} className="mx-auto text-primary" /></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold">Soporte Técnico Especializado</td>
                <td className="px-6 py-3.5 text-center">Email</td>
                <td className="px-6 py-3.5 text-center">WhatsApp / Email</td>
                <td className="px-6 py-3.5 text-center text-emerald-600 font-bold">24/7 Prioritario</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQS SECTION */}
      <div className="max-w-3xl mx-auto text-center border-t border-border-default pt-16">
        <h2 className="text-2xl font-black mb-10 text-black">Preguntas Frecuentes</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-card border bg-white border-border-default text-left">
              <button 
                onClick={() => toggleFaq(idx)}
                className="w-full px-6 py-4 flex items-center justify-between font-bold text-xs sm:text-sm text-left text-black outline-none cursor-pointer bg-transparent border-none"
              >
                <span>{faq.q}</span>
                {activeFaq === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {activeFaq === idx && (
                <div className="px-6 pb-5 pt-1 text-xs sm:text-xs leading-relaxed text-gray-600 border-t border-slate-100">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
