import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, FileText, Package, Calculator, 
  Check, ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function LandingFeatures() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'facturacion' | 'inventario' | 'gastos'

  const solutionsData = {
    pos: {
      title: "Punto de Venta (POS) Comercial",
      desc: "Terminal de ventas ágil optimizada para atención rápida en mostrador con atajo de cobro directo (F12) y sincronización con el inventario.",
      bullets: [
        "Apertura, arqueo y cierre de caja en tiempo real",
        "Soporte para cobro mixto: Efectivo, Tarjeta y Transferencia",
        "Búsqueda instantánea de ítems y lector de código de barras",
        "Validación automática de límite $50.00 para Consumidor Final SRI"
      ],
      uiSim: (
        <Card className="w-full max-w-sm mx-auto text-left">
          <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-border-default">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E4B8] animate-pulse"></span>
              <span className="text-xs font-semibold text-text-heading">Terminal POS 01</span>
            </div>
            <Badge variant="success" className="text-[10px]">Caja Abierta</Badge>
          </CardHeader>
          <CardContent className="pt-3 space-y-3 text-xs">
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between text-text-primary">
                <span>1x Monitor LG 27" UltraGear</span>
                <span>$299.00</span>
              </div>
              <div className="flex justify-between text-text-primary">
                <span>2x Teclado Mecánico RGB</span>
                <span>$90.00</span>
              </div>
            </div>
            <div className="border-t border-border-default pt-2 space-y-1 text-[11px] text-text-secondary">
              <div className="flex justify-between">
                <span>Subtotal 15%</span>
                <span className="font-mono">$338.26</span>
              </div>
              <div className="flex justify-between">
                <span>IVA 15%</span>
                <span className="font-mono">$50.74</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-text-heading pt-1">
                <span>Total a Cobrar</span>
                <span className="font-mono text-primary">$389.00</span>
              </div>
            </div>
            <Button variant="accent" size="sm" className="w-full text-xs gap-1 mt-2">
              <ShoppingCart size={13} /> Cobrar e Imprimir (F12)
            </Button>
          </CardContent>
        </Card>
      )
    },
    facturacion: {
      title: "Facturación Electrónica SRI",
      desc: "Emite facturas, notas de crédito, retenciones y liquidaciones autorizadas por el SRI en menos de 3 segundos con firma digital .p12.",
      bullets: [
        "Firma digital XAdES-BES en segundo plano",
        "Generación y envío instantáneo de RIDE PDF y XML al cliente",
        "Consulta de estado y reenvío de comprobantes con un clic",
        "Emisión sin límite de comprobantes en todos los planes"
      ],
      uiSim: (
        <Card className="w-full max-w-sm mx-auto text-left">
          <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-border-default">
            <span className="text-xs font-semibold text-text-heading">Comprobante Autorizado</span>
            <Badge variant="success" className="text-[10px]">SRI Aprobado</Badge>
          </CardHeader>
          <CardContent className="pt-3 space-y-3 text-xs">
            <div className="p-3 bg-surface-sidebar rounded-md font-mono text-[11px] space-y-1">
              <div className="flex justify-between text-text-secondary">
                <span>N° Factura:</span>
                <span className="font-bold text-text-heading">001-001-000004512</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Clave Acceso:</span>
                <span className="truncate max-w-[140px]">1408202601179...</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Monto Total:</span>
                <span className="font-bold text-text-heading">$450.00</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" className="w-1/2 text-xs">Descargar RIDE</Button>
              <Button variant="default" size="sm" className="w-1/2 text-xs">Reenviar Correo</Button>
            </div>
          </CardContent>
        </Card>
      )
    },
    inventario: {
      title: "Control de Inventario & Kardex",
      desc: "Administra el stock en tiempo real con valuación promedio ponderado, registro de entradas/salidas y alertas automáticas de reposición.",
      bullets: [
        "Kardex automatizado por cada venta o compra",
        "Control de stock mínimo y avisos preventivos",
        "Importación y exportación masiva en Excel/CSV",
        "Categorías, marcas y soporte para código de barras"
      ],
      uiSim: (
        <Card className="w-full max-w-sm mx-auto text-left">
          <CardHeader className="py-3 border-b border-border-default">
            <CardTitle className="text-xs font-semibold text-text-heading">Kardex de Existencias</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-surface-sidebar">
              <div>
                <span className="font-semibold block text-text-heading">Monitor LG 27"</span>
                <span className="text-[10px] text-text-muted">SKU: MON-LG27</span>
              </div>
              <span className="font-mono font-bold text-text-heading">14 en stock</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-warning-light/30 border border-warning-border">
              <div>
                <span className="font-semibold block text-text-heading">Mouse Inalámbrico</span>
                <span className="text-[10px] text-warning-text font-medium">Stock bajo (min. 5)</span>
              </div>
              <span className="font-mono font-bold text-warning-text">2 restantes</span>
            </div>
          </CardContent>
        </Card>
      )
    },
    gastos: {
      title: "Gastos, Compras y Cruce de IVA",
      desc: "Controla tus egresos de dinero, clasifica facturas de proveedores y cruza el IVA automáticamente para tus declaraciones del SRI.",
      bullets: [
        "Lectura inteligente de facturas de compras con IA (OCR)",
        "Cálculo automático de retenciones en la fuente y de IVA",
        "Historial clasificado por categorías de gasto",
        "Reportes listos para tu contador o declaración mensual"
      ],
      uiSim: (
        <Card className="w-full max-w-sm mx-auto text-left">
          <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-border-default">
            <span className="text-xs font-semibold text-text-heading">Cruce de IVA Mensual</span>
            <Badge variant="outline" className="text-[10px]">Periodo Activo</Badge>
          </CardHeader>
          <CardContent className="pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>IVA en Ventas (Cobrado):</span>
              <span className="font-mono font-bold text-success-text">+$1,450.00</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>IVA en Compras (Deducible):</span>
              <span className="font-mono font-bold text-error">-$820.00</span>
            </div>
            <div className="border-t border-border-default pt-2 flex justify-between font-bold text-text-heading">
              <span>IVA Estimado a Pagar SRI:</span>
              <span className="font-mono text-primary">$630.00</span>
            </div>
          </CardContent>
        </Card>
      )
    }
  };

  const navItems = [
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'facturacion', label: 'Facturación SRI', icon: FileText },
    { id: 'inventario', label: 'Inventario & Kardex', icon: Package },
    { id: 'gastos', label: 'Control Financiero', icon: Calculator },
  ];

  return (
    <div className="w-full bg-white text-text-primary">
      
      {/* 1. Header */}
      <section className="pt-16 pb-12 border-b border-border-default bg-surface-sidebar/30 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-3">
          <Badge variant="outline" className="text-xs py-0.5 px-2.5">
            Módulos Integrados
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-heading">
            Soluciones modulares diseñadas para crecer contigo.
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            Elimina el desorden de múltiples hojas de cálculo y sistemas aislados. Todo sincronizado en tiempo real.
          </p>
        </div>
      </section>

      {/* 2. Interactive Solutions Explorer */}
      <section className="py-16 border-b border-border-default">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Tabs Bar */}
          <div className="flex items-center justify-center gap-2 mb-12 overflow-x-auto custom-scrollbar pb-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                    isActive 
                      ? 'bg-text-heading text-white border-text-heading font-semibold shadow-none' 
                      : 'bg-white text-text-secondary border-border-default hover:bg-surface-sidebar'
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Solution Detail Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-5xl mx-auto text-left">
            <div className="lg:col-span-6 space-y-5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-heading">
                {solutionsData[activeTab].title}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-normal">
                {solutionsData[activeTab].desc}
              </p>
              <ul className="space-y-2.5 text-xs text-text-secondary">
                {solutionsData[activeTab].bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <span className="flex h-4 w-4 rounded-full bg-success-light text-success-text items-center justify-center shrink-0">
                      <Check size={10} />
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="gap-2 text-xs"
                >
                  <span>Probar este módulo gratis</span>
                  <ArrowRight size={13} />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 rounded-lg bg-surface-sidebar border border-border-default flex items-center justify-center">
              {solutionsData[activeTab].uiSim}
            </div>
          </div>

        </div>
      </section>

      {/* 3. CTA */}
      <section className="py-16 bg-surface-sidebar/40 text-center">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-text-heading">
            ¿Listo para simplificar la gestión de tu negocio?
          </h2>
          <p className="text-xs text-text-secondary">
            Crea tu cuenta en 1 minuto sin necesidad de tarjeta de crédito.
          </p>
          <Button 
            variant="default" 
            size="lg"
            onClick={() => navigate('/register')}
            className="text-xs gap-2"
          >
            <span>Comenzar Prueba Gratis 14 Días</span>
            <ArrowRight size={13} />
          </Button>
        </div>
      </section>

    </div>
  );
}
