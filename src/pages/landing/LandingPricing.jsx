import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

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
      name: 'Emprendedor',
      desc: 'Para profesionales y pequeños negocios que inician en el SRI.',
      price: billingPeriod === 'monthly' ? 15 : 12,
      features: [
        "Facturación Electrónica SRI ILIMITADA",
        "Punto de Venta (POS) Comercial",
        "Directorio de Clientes y Proveedores",
        "Firma electrónica .p12 automática",
        "1 Usuario Administrador",
        "Soporte por Correo y WhatsApp"
      ],
      cta: "Comenzar Prueba Gratis",
      recommended: false
    },
    {
      id: 'professional',
      name: 'Negocio Pro',
      desc: 'Para comercios y empresas que manejan inventario y ventas.',
      price: billingPeriod === 'monthly' ? 29 : 23,
      features: [
        "Todo lo del Plan Emprendedor",
        "Inventario & Kardex Multibodega",
        "Control de Cuentas por Cobrar (CxC)",
        "Control de Gastos y Compras",
        "Cruce automático de IVA para el SRI",
        "Hasta 5 Usuarios y Cajeros"
      ],
      cta: "Comenzar con Pro",
      recommended: true
    },
    {
      id: 'enterprise',
      name: 'Empresarial',
      desc: 'Para empresas consolidadas que requieren gestión financiera total.',
      price: billingPeriod === 'monthly' ? 59 : 47,
      features: [
        "Todo lo del Plan Negocio Pro",
        "Captura Inteligente de Compras con IA (OCR)",
        "Módulo de Contabilidad y Plan de Cuentas",
        "Préstamos Bancarios y Conciliación",
        "Asientos Contables y Reportes ATS",
        "Usuarios y Cajeros ILIMITADOS"
      ],
      cta: "Probar Empresarial",
      recommended: false
    }
  ];

  const faqs = [
    {
      q: "¿Cómo funciona la facturación electrónica ilimitada?",
      a: "A diferencia de otras plataformas tradicionales, no cobramos por el número de comprobantes emitidos. Puedes emitir facturas, notas de crédito y retenciones de forma ilimitada en cualquiera de los planes sin costo adicional."
    },
    {
      q: "¿Es obligatoria la firma electrónica?",
      a: "Sí, para facturar electrónicamente de forma oficial en Ecuador necesitas tu certificado de firma electrónica en archivo formato .p12. El sistema te permite subir tu firma de forma segura para firmar digitalmente cada documento."
    },
    {
      q: "¿Puedo cambiar de plan o cancelar en cualquier momento?",
      a: "Sí. Puedes actualizar tu plan, cambiar de ciclo de facturación o cancelar el servicio en cualquier momento desde tu panel de ajustes sin penalidades ni plazos forzosos."
    },
    {
      q: "¿Mis datos están seguros si mi computador se daña?",
      a: "Totalmente. Al ser un sistema 100% en la nube con tecnología Firebase, toda tu información contable, clientes y facturas están respaldadas en tiempo real y accesibles desde cualquier navegador."
    }
  ];

  return (
    <div className="w-full bg-white text-text-primary">
      
      {/* 1. Header & Billing Toggle */}
      <section className="pt-16 pb-12 border-b border-border-default bg-surface-sidebar/30 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
          <Badge variant="outline" className="text-xs py-0.5 px-2.5">
            Precios Transparentes
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-heading">
            Planes claros para cada etapa de tu negocio.
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            Sin límites en la cantidad de comprobantes SRI. Prueba cualquier plan durante 14 días sin compromiso.
          </p>

          {/* Toggle Mensual / Anual */}
          <div className="pt-2">
            <div className="inline-flex items-center p-1 rounded-md bg-white border border-border-default gap-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all cursor-pointer ${
                  billingPeriod === 'monthly' ? 'bg-surface-sidebar text-text-heading font-semibold shadow-none' : 'text-text-secondary'
                }`}
              >
                Facturación Mensual
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingPeriod === 'yearly' ? 'bg-surface-sidebar text-text-heading font-semibold shadow-none' : 'text-text-secondary'
                }`}
              >
                <span>Anual</span>
                <span className="text-[10px] text-success-text bg-success-light px-1.5 py-0.5 rounded font-mono font-bold">-20%</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Pricing Cards Grid */}
      <section className="py-16 border-b border-border-default">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`p-6 flex flex-col justify-between transition-all ${
                  plan.recommended 
                    ? 'border-text-heading ring-1 ring-text-heading shadow-sm relative' 
                    : 'border-border-default hover:border-border-strong'
                }`}
              >
                {plan.recommended && (
                  <Badge variant="default" className="absolute -top-2.5 right-6 text-[10px] normal-case py-0.5 px-2 font-normal">
                    Más Popular
                  </Badge>
                )}

                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-text-heading">{plan.name}</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{plan.desc}</p>
                  </div>

                  <div className="mb-6 pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-bold font-mono text-text-heading">
                        ${plan.price}
                      </span>
                      <span className="text-xs text-text-secondary font-medium">/ mes</span>
                    </div>
                    {billingPeriod === 'yearly' && (
                      <span className="text-[11px] text-success-text font-medium mt-1 block">
                        Facturado anualmente (${plan.price * 12}/año)
                      </span>
                    )}
                  </div>

                  <div className="border-t border-border-default/60 pt-4 mb-6">
                    <span className="text-[11px] font-semibold text-text-heading uppercase tracking-wider block mb-3">
                      Incluye:
                    </span>
                    <ul className="space-y-2 text-xs text-text-secondary">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check size={13} className="text-[#00E4B8] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Button 
                  variant={plan.recommended ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="w-full text-xs h-9 mt-4"
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FAQ Section */}
      <section className="py-16 bg-surface-sidebar/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-left">
          
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-text-heading">
              Preguntas Frecuentes
            </h2>
            <p className="text-xs text-text-secondary">
              Resolvemos tus dudas sobre planes y facturación.
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div 
                  key={index}
                  className="rounded-md border border-border-default bg-white overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-4 text-xs font-semibold text-text-heading hover:bg-surface-sidebar/50 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={14} className={`shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border-default/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

    </div>
  );
}
