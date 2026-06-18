import React from 'react';
import { Shield, Sparkles, Heart, CheckCircle2 } from 'lucide-react';

export default function LandingAbout() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20 text-left space-y-12">
      
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">Sobre WebFix ERP</h1>
        <p className="text-sm text-gray-650 max-w-lg mx-auto font-medium">
          Simplificamos la facturación electrónica y el control operativo de las PYMES y profesionales independientes en el Ecuador.
        </p>
      </div>

      {/* Corporate Philosophy */}
      <div className="grid md:grid-cols-2 gap-8 items-center pt-8 border-t border-[#CAD1F4]">
        <div>
          <h2 className="text-xl font-black mb-4">Nuestra Misión</h2>
          <p className="text-xs text-gray-650 leading-relaxed mb-4 font-medium">
            Nacimos en Ecuador para resolver los retos tecnológicos y fiscales que enfrentan los emprendedores al conectarse con el SRI. Creemos que la contabilidad y el control de inventarios no deberían requerir capacitaciones engorrosas ni software costoso de instalar.
          </p>
          <p className="text-xs text-gray-650 leading-relaxed font-medium">
            WebFix ERP provee una plataforma multi-bodega, con facturación automática y simulación de flujos de caja en tiempo real, accesible desde cualquier dispositivo y respaldada por servidores de nube avanzados.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-[#CAD1F4] space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-primary">Nuestros Valores</h3>
          <ul className="space-y-3 text-xs text-gray-750 font-semibold">
            <li className="flex gap-2">
              <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
              <span>Transparencia en precios (Cero costos ocultos)</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
              <span>Conexión y automatización directa con el SRI</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
              <span>Foco en la velocidad del Punto de Venta (POS)</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
              <span>Protección y copias de seguridad de data transaccional</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Security and Infrastructure details */}
      <div className="p-6 rounded-2xl bg-white border border-[#CAD1F4] space-y-4 pt-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">Infraestructura Segura y Alta Disponibilidad</h3>
            <p className="text-[10px] text-gray-500">Respaldado por tecnología Firebase Google Cloud</p>
          </div>
        </div>
        <p className="text-xs text-gray-650 leading-relaxed font-medium">
          Toda la data transaccional contable y de inventarios está encriptada y protegida bajo las reglas de seguridad de Google Cloud. Mantenemos réplicas en tiempo real para asegurar que tu negocio nunca se detenga. Puedes subir tu firma electrónica `.p12` con absoluta confianza: las credenciales son procesadas de manera aislada y segura de acuerdo a los estándares fiscales del Ecuador.
        </p>
      </div>

    </div>
  );
}
