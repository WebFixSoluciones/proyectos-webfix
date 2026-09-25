import { UiBox, UiHeading, UiText, UiCard } from '../../components/ui/layout';
import { Shield, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export default function LandingAbout() {
  return (
    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full"}}>
      
      {/* Header */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"pt-16 pb-12 text-center"}}>
        <UiBox {...{"className":"max-w-4xl mx-auto px-4 sm:px-6 space-y-3"}}>
          <Badge variant="outline" {...{"className":"py-0.5 px-2.5"}}>
            Sobre Nosotros
          </Badge>
          <UiHeading as="h1" {...{"size":"7","weight":"bold","color":"gray","highContrast":true}}>
            Simplificamos la facturación y finanzas en Ecuador.
          </UiHeading>
          <UiText as="p" {...{"size":"1","color":"gray","className":"max-w-xl mx-auto leading-relaxed"}}>
            Creamos tecnología moderna para que los emprendedores y empresas cumplan con el SRI sin fricciones y con total control operativo.
          </UiText>
        </UiBox>
      </section>

      {/* Main Content */}
      <section {...{"className":"py-16 w-[80%] max-w-5xl mx-auto px-4 sm:px-6 text-left space-y-12"}}>
        
        {/* Mission & Vision Grid */}
        <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-8 items-start"}}>
          <UiBox {...{"className":"space-y-4"}}>
            <UiHeading as="h2" {...{"size":"5","weight":"bold","color":"gray","highContrast":true}}>Nuestra Misión</UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
              Nacimos en Ecuador para resolver los retos tecnológicos y fiscales que enfrentan los emprendedores al conectarse con el SRI. Creemos que la facturación y el control de inventarios no deberían requerir capacitaciones engorrosas ni software de escritorio costoso de instalar.
            </UiText>
            <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
              WebFix ERP provee una plataforma modular, con facturación automática y simulación de flujos de caja en tiempo real, accesible desde cualquier dispositivo y respaldada por infraestructura en la nube.
            </UiText>
          </UiBox>

          <Card {...{"className":"p-6"}}>
            <UiHeading as="h3" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"mb-4"}}>Nuestros Principios</UiHeading>
            <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-3"}}>
              <li {...{"className":"flex items-start gap-2.5"}}>
                <CheckCircle2 size={14} {...{"style":{"color":"var(--green-12)"},"className":"shrink-0 mt-0.5"}} />
                <UiText><strong {...{"style":{"color":"var(--gray-12)"}}}>Precios transparentes:</strong> Facturación ilimitada sin cobros por documento.</UiText>
              </li>
              <li {...{"className":"flex items-start gap-2.5"}}>
                <CheckCircle2 size={14} {...{"style":{"color":"var(--green-12)"},"className":"shrink-0 mt-0.5"}} />
                <UiText><strong {...{"style":{"color":"var(--gray-12)"}}}>Automatización SRI directa:</strong> Firma digital y autorización inmediata.</UiText>
              </li>
              <li {...{"className":"flex items-start gap-2.5"}}>
                <CheckCircle2 size={14} {...{"style":{"color":"var(--green-12)"},"className":"shrink-0 mt-0.5"}} />
                <UiText><strong {...{"style":{"color":"var(--gray-12)"}}}>Velocidad en Punto de Venta:</strong> Optimizado para atajos rápidos en mostrador.</UiText>
              </li>
              <li {...{"className":"flex items-start gap-2.5"}}>
                <CheckCircle2 size={14} {...{"style":{"color":"var(--green-12)"},"className":"shrink-0 mt-0.5"}} />
                <UiText><strong {...{"style":{"color":"var(--gray-12)"}}}>Seguridad de datos:</strong> Cifrado continuo y respaldos automáticos.</UiText>
              </li>
            </ul>
          </Card>
        </UiBox>

        {/* Security and Cloud */}
        <Card {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"}}>
          <UiBox {...{"className":"flex items-start gap-4"}}>
            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-2.5 shrink-0"}}>
              <Shield size={20} />
            </UiCard>
            <UiBox {...{"className":"space-y-2"}}>
              <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Infraestructura Segura y de Alta Disponibilidad</UiHeading>
              <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                Toda la información contable, comprobantes y catálogo está respaldada bajo las reglas de seguridad de Google Cloud y Firebase. Puedes cargar tu firma electrónica .p12 con total tranquilidad: las claves son procesadas de manera aislada y segura de acuerdo con la normativa del SRI ecuatoriano.
              </UiText>
            </UiBox>
          </UiBox>
        </Card>

      </section>

    </UiBox>
  );
}
