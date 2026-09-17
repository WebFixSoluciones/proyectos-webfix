import { mergeThemeProps } from '../../components/ui/themeProps';
import { UiBox, UiHeading, UiText, UiCard } from '../../components/ui/layout';
import { UiButton } from '../../components/ui/controls';
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
    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full"}}>
      
      {/* 1. Header & Billing Toggle */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"pt-16 pb-12 text-center"}}>
        <UiBox {...{"className":"max-w-4xl mx-auto px-4 sm:px-6 space-y-4"}}>
          <Badge variant="outline" {...{"className":"py-0.5 px-2.5"}}>
            Precios Transparentes
          </Badge>
          <UiHeading as="h1" {...{"size":"7","weight":"bold","color":"gray","highContrast":true}}>
            Planes claros para cada etapa de tu negocio.
          </UiHeading>
          <UiText as="p" {...{"size":"1","color":"gray","className":"max-w-xl mx-auto leading-relaxed"}}>
            Sin límites en la cantidad de comprobantes SRI. Prueba cualquier plan durante 14 días sin compromiso.
          </UiText>

          {/* Toggle Mensual / Anual */}
          <UiBox {...{"className":"pt-2"}}>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"inline-flex items-center p-1 gap-1"}}>
              <UiButton
                onClick={() => setBillingPeriod('monthly')}
                {...mergeThemeProps({"size":"2","className":"cursor-pointer"}, {}, (billingPeriod === 'monthly' ? {"variant":"soft","color":"gray"} : {"color":"gray"}))}
              >
                Facturación Mensual
              </UiButton>
              <UiButton
                onClick={() => setBillingPeriod('yearly')}
                {...mergeThemeProps({"size":"2","className":"cursor-pointer flex items-center gap-1.5"}, {}, (billingPeriod === 'yearly' ? {"variant":"soft","color":"gray"} : {"color":"gray"}))}
              >
                <UiText>Anual</UiText>
                <UiText {...{"size":"1","color":"green","weight":"bold","className":"px-1.5 py-0.5"}}>-20%</UiText>
              </UiButton>
            </UiCard>
          </UiBox>
        </UiBox>
      </section>

      {/* 2. Pricing Cards Grid */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"py-16"}}>
        <UiBox {...{"className":"max-w-6xl mx-auto px-4 sm:px-6"}}>
          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto"}}>
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                {...mergeThemeProps({"className":"p-6 flex flex-col justify-between"}, {}, (plan.recommended ? {"className":"relative"} : {}))}
              >
                {plan.recommended && (
                  <Badge variant="default" {...{"className":"absolute -top-2.5 right-6 py-0.5 px-2"}}>
                    Más Popular
                  </Badge>
                )}

                <UiBox>
                  <UiBox {...{"className":"mb-4"}}>
                    <UiHeading as="h3" {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>{plan.name}</UiHeading>
                    <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1 leading-relaxed"}}>{plan.desc}</UiText>
                  </UiBox>

                  <UiBox {...{"className":"mb-6 pt-2"}}>
                    <UiBox {...{"className":"flex items-baseline gap-1"}}>
                      <UiText {...{"size":"7","weight":"regular","color":"gray","highContrast":true}}>
                        ${plan.price}
                      </UiText>
                      <UiText {...{"size":"1","color":"gray","weight":"medium"}}>/ mes</UiText>
                    </UiBox>
                    {billingPeriod === 'yearly' && (
                      <UiText {...{"size":"1","color":"green","weight":"medium","className":"mt-1 block"}}>
                        Facturado anualmente (${plan.price * 12}/año)
                      </UiText>
                    )}
                  </UiBox>

                  <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-4 mb-6"}}>
                    <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-3"}}>
                      Incluye:
                    </UiText>
                    <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-2"}}>
                      {plan.features.map((feature, i) => (
                        <li key={i} {...{"className":"flex items-start gap-2"}}>
                          <Check size={13} {...{"style":{"color":"var(--green-12)"},"className":"shrink-0 mt-0.5"}} />
                          <UiText>{feature}</UiText>
                        </li>
                      ))}
                    </ul>
                  </UiBox>
                </UiBox>

                <Button 
                  variant={plan.recommended ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate('/register')}
                  {...{"size":"2","className":"w-full mt-4"}}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </UiBox>
        </UiBox>
      </section>

      {/* 3. FAQ Section */}
      <section {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"py-16"}}>
        <UiBox {...{"className":"max-w-3xl mx-auto px-4 sm:px-6 text-left"}}>
          
          <UiBox {...{"className":"text-center mb-10 space-y-2"}}>
            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Preguntas Frecuentes
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray"}}>
              Resolvemos tus dudas sobre planes y facturación.
            </UiText>
          </UiBox>

          <UiBox {...{"className":"space-y-2"}}>
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <UiBox 
                  key={index}
                  {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}
                >
                  <UiButton
                    onClick={() => toggleFaq(index)}
                    {...{"size":"2","color":"gray","className":"w-full text-left flex items-center justify-between gap-4 cursor-pointer"}}
                  >
                    <UiText>{faq.q}</UiText>
                    <ChevronDown size={14} {...mergeThemeProps({"className":"shrink-0 transition-transform duration-150"}, {}, (isOpen ? {"className":"rotate-180"} : {}))} />
                  </UiButton>
                  {isOpen && (
                    <UiBox {...{"style":{"color":"var(--gray-11)","borderTop":"1px solid var(--gray-a6)"},"className":"px-4 pb-4 pt-1 leading-relaxed"}}>
                      {faq.a}
                    </UiBox>
                  )}
                </UiBox>
              );
            })}
          </UiBox>

        </UiBox>
      </section>

    </UiBox>
  );
}
