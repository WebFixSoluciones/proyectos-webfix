import { mergeThemeProps } from '../../components/ui/themeProps';
import { UiBox, UiText, UiHeading } from '../../components/ui/layout';
import { UiButton } from '../../components/ui/controls';
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
        <Card {...{"className":"w-full max-w-sm mx-auto text-left"}}>
          <CardHeader {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"py-3 flex flex-row items-center justify-between"}}>
            <UiBox {...{"className":"flex items-center gap-2"}}>
              <UiText {...{"className":"w-2 h-2 animate-pulse"}}></UiText>
              <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Terminal POS 01</UiText>
            </UiBox>
            <Badge variant="success" {...{}}>Caja Abierta</Badge>
          </CardHeader>
          <CardContent {...{"className":"pt-3 space-y-3"}}>
            <UiBox {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"space-y-1.5"}}>
              <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex justify-between"}}>
                <UiText>1x Monitor LG 27" UltraGear</UiText>
                <UiText>$299.00</UiText>
              </UiBox>
              <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex justify-between"}}>
                <UiText>2x Teclado Mecánico RGB</UiText>
                <UiText>$90.00</UiText>
              </UiBox>
            </UiBox>
            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-11)"},"className":"pt-2 space-y-1"}}>
              <UiBox {...{"className":"flex justify-between"}}>
                <UiText>Subtotal 15%</UiText>
                <UiText {...{"weight":"regular"}}>$338.26</UiText>
              </UiBox>
              <UiBox {...{"className":"flex justify-between"}}>
                <UiText>IVA 15%</UiText>
                <UiText {...{"weight":"regular"}}>$50.74</UiText>
              </UiBox>
              <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex justify-between pt-1"}}>
                <UiText>Total a Cobrar</UiText>
                <UiText {...{"weight":"regular","color":"blue"}}>$389.00</UiText>
              </UiBox>
            </UiBox>
            <Button variant="accent" size="sm" {...{"size":"2","className":"w-full gap-1 mt-2"}}>
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
        <Card {...{"className":"w-full max-w-sm mx-auto text-left"}}>
          <CardHeader {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"py-3 flex flex-row items-center justify-between"}}>
            <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Comprobante Autorizado</UiText>
            <Badge variant="success" {...{}}>SRI Aprobado</Badge>
          </CardHeader>
          <CardContent {...{"className":"pt-3 space-y-3"}}>
            <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","fontFamily":"var(--code-font-family)"},"className":"p-3 space-y-1"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex justify-between"}}>
                <UiText>N° Factura:</UiText>
                <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>001-001-000004512</UiText>
              </UiBox>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex justify-between"}}>
                <UiText>Clave Acceso:</UiText>
                <UiText {...{"className":"truncate max-w-[140px]"}}>1408202601179...</UiText>
              </UiBox>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex justify-between"}}>
                <UiText>Monto Total:</UiText>
                <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>$450.00</UiText>
              </UiBox>
            </UiBox>
            <UiBox {...{"className":"flex items-center gap-2 pt-1"}}>
              <Button variant="outline" size="sm" {...{"size":"2","className":"w-1/2"}}>Descargar RIDE</Button>
              <Button variant="default" size="sm" {...{"size":"2","className":"w-1/2"}}>Reenviar Correo</Button>
            </UiBox>
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
        <Card {...{"className":"w-full max-w-sm mx-auto text-left"}}>
          <CardHeader {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"py-3"}}>
            <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>Kardex de Existencias</CardTitle>
          </CardHeader>
          <CardContent {...{"className":"pt-3 space-y-2"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)"},"className":"flex items-center justify-between p-2"}}>
              <UiBox>
                <UiText {...{"weight":"bold","color":"gray","highContrast":true,"className":"block"}}>Monitor LG 27"</UiText>
                <UiText {...{"size":"1","color":"gray"}}>SKU: MON-LG27</UiText>
              </UiBox>
              <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>14 en stock</UiText>
            </UiBox>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--amber-3)","border":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between p-2"}}>
              <UiBox>
                <UiText {...{"weight":"bold","color":"gray","highContrast":true,"className":"block"}}>Mouse Inalámbrico</UiText>
                <UiText {...{"size":"1","color":"amber","weight":"medium"}}>Stock bajo (min. 5)</UiText>
              </UiBox>
              <UiText {...{"weight":"bold","color":"amber"}}>2 restantes</UiText>
            </UiBox>
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
        <Card {...{"className":"w-full max-w-sm mx-auto text-left"}}>
          <CardHeader {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"py-3 flex flex-row items-center justify-between"}}>
            <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Cruce de IVA Mensual</UiText>
            <Badge variant="outline" {...{}}>Periodo Activo</Badge>
          </CardHeader>
          <CardContent {...{"className":"pt-3 space-y-2"}}>
            <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex justify-between"}}>
              <UiText>IVA en Ventas (Cobrado):</UiText>
              <UiText {...{"weight":"bold","color":"green"}}>+$1,450.00</UiText>
            </UiBox>
            <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex justify-between"}}>
              <UiText>IVA en Compras (Deducible):</UiText>
              <UiText {...{"weight":"bold","color":"red"}}>-$820.00</UiText>
            </UiBox>
            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"pt-2 flex justify-between"}}>
              <UiText>IVA Estimado a Pagar SRI:</UiText>
              <UiText {...{"weight":"regular","color":"blue"}}>$630.00</UiText>
            </UiBox>
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
    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full"}}>
      
      {/* 1. Header */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"pt-16 pb-12 text-center"}}>
        <UiBox {...{"className":"max-w-4xl mx-auto px-4 sm:px-6 space-y-3"}}>
          <Badge variant="outline" {...{"className":"py-0.5 px-2.5"}}>
            Módulos Integrados
          </Badge>
          <UiHeading as="h1" {...{"size":"7","weight":"bold","color":"gray","highContrast":true}}>
            Soluciones modulares diseñadas para crecer contigo.
          </UiHeading>
          <UiText as="p" {...{"size":"1","color":"gray","className":"max-w-xl mx-auto leading-relaxed"}}>
            Elimina el desorden de múltiples hojas de cálculo y sistemas aislados. Todo sincronizado en tiempo real.
          </UiText>
        </UiBox>
      </section>

      {/* 2. Interactive Solutions Explorer */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"py-16"}}>
        <UiBox {...{"className":"max-w-6xl mx-auto px-4 sm:px-6"}}>
          
          {/* Tabs Bar */}
          <UiBox {...{"className":"flex items-center justify-center gap-2 mb-12 overflow-x-auto custom-scrollbar pb-2"}}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <UiButton
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  {...mergeThemeProps({"size":"2","variant":"outline","className":"flex items-center gap-2 cursor-pointer whitespace-nowrap"}, {}, (isActive ? {"variant":"solid","color":"gray"} : {"variant":"surface","color":"gray"}))}
                >
                  <Icon size={14} />
                  <UiText>{item.label}</UiText>
                </UiButton>
              );
            })}
          </UiBox>

          {/* Solution Detail Card */}
          <UiBox {...{"className":"grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-5xl mx-auto text-left"}}>
            <UiBox {...{"className":"lg:col-span-6 space-y-5"}}>
              <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
                {solutionsData[activeTab].title}
              </UiHeading>
              <UiText as="p" {...{"size":"1","color":"gray","weight":"regular","className":"leading-relaxed"}}>
                {solutionsData[activeTab].desc}
              </UiText>
              <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-2.5"}}>
                {solutionsData[activeTab].bullets.map((bullet, idx) => (
                  <li key={idx} {...{"className":"flex items-center gap-2.5"}}>
                    <UiText {...{"color":"green","className":"flex h-4 w-4 items-center justify-center shrink-0"}}>
                      <Check size={10} />
                    </UiText>
                    <UiText>{bullet}</UiText>
                  </li>
                ))}
              </ul>
              <UiBox {...{"className":"pt-2"}}>
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/register')}
                  {...{"size":"2","className":"gap-2"}}
                >
                  <UiText>Probar este módulo gratis</UiText>
                  <ArrowRight size={13} />
                </Button>
              </UiBox>
            </UiBox>

            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"lg:col-span-6 p-6 flex items-center justify-center"}}>
              {solutionsData[activeTab].uiSim}
            </UiBox>
          </UiBox>

        </UiBox>
      </section>

      {/* 3. CTA */}
      <section {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"py-16 text-center"}}>
        <UiBox {...{"className":"max-w-2xl mx-auto px-4 space-y-4"}}>
          <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
            ¿Listo para simplificar la gestión de tu negocio?
          </UiHeading>
          <UiText as="p" {...{"size":"1","color":"gray"}}>
            Crea tu cuenta en 1 minuto sin necesidad de tarjeta de crédito.
          </UiText>
          <Button 
            variant="default" 
            size="lg"
            onClick={() => navigate('/register')}
            {...{"size":"2","className":"gap-2"}}
          >
            <UiText>Comenzar Prueba Gratis 14 Días</UiText>
            <ArrowRight size={13} />
          </Button>
        </UiBox>
      </section>

    </UiBox>
  );
}
