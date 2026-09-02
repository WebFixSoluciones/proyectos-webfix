import { Shield, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export default function LandingAbout() {
  return (
    <div className="w-full bg-white text-text-primary">
      
      {/* Header */}
      <section className="pt-16 pb-12 border-b border-border-default bg-surface-sidebar/30 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-3">
          <Badge variant="outline" className="text-xs py-0.5 px-2.5">
            Sobre Nosotros
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-heading">
            Simplificamos la facturación y finanzas en Ecuador.
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            Creamos tecnología moderna para que los emprendedores y empresas cumplan con el SRI sin fricciones y con total control operativo.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 text-left space-y-12">
        
        {/* Mission & Vision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-heading">Nuestra Misión</h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Nacimos en Ecuador para resolver los retos tecnológicos y fiscales que enfrentan los emprendedores al conectarse con el SRI. Creemos que la facturación y el control de inventarios no deberían requerir capacitaciones engorrosas ni software de escritorio costoso de instalar.
            </p>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              WebFix ERP provee una plataforma modular, con facturación automática y simulación de flujos de caja en tiempo real, accesible desde cualquier dispositivo y respaldada por infraestructura en la nube.
            </p>
          </div>

          <Card className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-heading mb-4">Nuestros Principios</h3>
            <ul className="space-y-3 text-xs text-text-secondary">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-[#00E4B8] shrink-0 mt-0.5" />
                <span><strong className="text-text-heading font-medium">Precios transparentes:</strong> Facturación ilimitada sin cobros por documento.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-[#00E4B8] shrink-0 mt-0.5" />
                <span><strong className="text-text-heading font-medium">Automatización SRI directa:</strong> Firma digital y autorización inmediata.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-[#00E4B8] shrink-0 mt-0.5" />
                <span><strong className="text-text-heading font-medium">Velocidad en Punto de Venta:</strong> Optimizado para atajos rápidos en mostrador.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-[#00E4B8] shrink-0 mt-0.5" />
                <span><strong className="text-text-heading font-medium">Seguridad de datos:</strong> Cifrado continuo y respaldos automáticos.</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Security and Cloud */}
        <Card className="p-6 border-border-default bg-surface-sidebar/40">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-md bg-white border border-border-default text-text-heading shrink-0">
              <Shield size={20} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text-heading">Infraestructura Segura y de Alta Disponibilidad</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Toda la información contable, comprobantes y catálogo está respaldada bajo las reglas de seguridad de Google Cloud y Firebase. Puedes cargar tu firma electrónica .p12 con total tranquilidad: las claves son procesadas de manera aislada y segura de acuerdo con la normativa del SRI ecuatoriano.
              </p>
            </div>
          </div>
        </Card>

      </section>

    </div>
  );
}
