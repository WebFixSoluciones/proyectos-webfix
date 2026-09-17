import { mergeThemeProps } from '../../components/ui/themeProps';
import { UiBox, UiText, UiHeading, UiCard } from '../../components/ui/layout';
import { UiButton } from '../../components/ui/controls';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Check, 
  ShoppingCart, FileText, TrendingUp, Package, 
  CheckCircle2, ChevronDown, Sparkles,
  DollarSign, ShieldCheck,
  Laptop, Smartphone, Store, Wifi, RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function LandingHome() {
  const navigate = useNavigate();
  const [activeHeroTab, setActiveHeroTab] = useState('sri'); // 'sri' | 'pos' | 'finanzas' | 'inventario'
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const heroTabs = [
    { id: 'sri', label: 'Facturación SRI', icon: FileText },
    { id: 'pos', label: 'Punto de Venta (POS)', icon: ShoppingCart },
    { id: 'finanzas', label: 'Flujo de Caja', icon: TrendingUp },
    { id: 'inventario', label: 'Inventario', icon: Package },
  ];

  const faqs = [
    {
      q: '¿Qué necesito para empezar a emitir facturas con WebFix?',
      a: 'Solo necesitas tu RUC activo y tu archivo de firma electrónica en formato digital (.p12). Lo cargas por única vez en el sistema y queda listo para emitir comprobantes autorizados de inmediato.'
    },
    {
      q: '¿Los comprobantes se envían automáticamente al SRI y al cliente?',
      a: 'Sí. Cada vez que generas una factura, nota de crédito, retención o liquidación, el sistema firma digitalmente el XML, lo autoriza en los servidores del SRI y envía el PDF (RIDE) y el XML al correo del cliente.'
    },
    {
      q: '¿Puedo usar WebFix desde el celular o tablet en mi local?',
      a: 'Totalmente. WebFix es una aplicación web moderna (Cloud) optimizada para funcionar con máxima fluidez en computadoras, laptops, tablets y smartphones sin requerir instalaciones pesadas.'
    },
    {
      q: '¿Existe límite de comprobantes en los planes?',
      a: 'No. Todos nuestros planes incluyen emisión ilimitada de comprobantes electrónicos para que tu negocio crezca sin restricciones de volumen.'
    }
  ];

  return (
    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full"}}>
      
      {/* 1. HERO SECTION (Minimalist Startup Aesthetic) */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden"}}>
        {/* Ambient Glow Lights */}
        <UiBox {...{"style":{"backgroundColor":"var(--blue-3)","borderRadius":"var(--radius-3)"},"className":"absolute -top-24 left-1/4 w-[450px] h-[450px] pointer-events-none animate-glow-pulse"}}></UiBox>
        <UiBox {...{"style":{"backgroundColor":"var(--green-3)","borderRadius":"var(--radius-3)"},"className":"absolute top-48 right-1/4 w-[350px] h-[350px] pointer-events-none animate-glow-pulse"}} style={{ animationDelay: '3s' }}></UiBox>

        {/* Subtle background hairline grid */}
        <UiBox 
          {...{"style":{"backgroundColor":"var(--gray-2)"},"className":{"className":"absolute inset-0 opacity-60 pointer-events-none"}}}
          style={{
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)'
          }}
        ></UiBox>

        <UiBox {...{"className":"max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6"}}>
          
          {/* Top Pill Tag */}
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"inline-flex items-center gap-2 px-3 py-1 cursor-default select-none animate-in fade-in duration-200"}}>
            <UiText {...{"className":"flex h-1.5 w-1.5"}}></UiText>
            <UiText>WebFix ERP 2.0</UiText>
            <UiText {...{"color":"gray"}}>•</UiText>
            <UiText {...{"color":"gray","highContrast":true,"weight":"bold"}}>Facturación SRI & Finanzas</UiText>
            <ArrowRight size={11} {...{"style":{"color":"var(--gray-11)"}}} />
          </UiBox>

          {/* Main Headline */}
          <UiHeading as="h1" {...{"size":"8","weight":"bold","color":"gray","highContrast":true,"className":"max-w-4xl mx-auto leading-[1.08]"}}>
            El sistema operativo financiero para negocios modernos.
          </UiHeading>

          {/* Subtitle */}
          <UiText as="p" {...{"size":"2","color":"gray","weight":"regular","className":"max-w-2xl mx-auto leading-relaxed"}}>
            Emite facturas electrónicas autorizadas por el SRI en segundos, administra tu punto de venta en mostrador y controla tu flujo de caja real sin enredos contables.
          </UiText>

          {/* Action CTAs */}
          <UiBox {...{"className":"flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"}}>
            <Button 
              size="lg" 
              variant="default"
              onClick={() => navigate('/register')}
              {...{"size":"2","className":"w-full sm:w-auto gap-2"}}
            >
              <UiText>Comenzar gratis 14 días</UiText>
              <ArrowRight size={13} />
            </Button>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => {
                const el = document.getElementById('demo-preview');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              {...{"size":"2","className":"w-full sm:w-auto"}}
            >
              Ver Demostración
            </Button>
          </UiBox>

          {/* Micro trust badges */}
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex flex-wrap items-center justify-center gap-6 pt-4 select-none"}}>
            <UiText {...{"weight":"medium","color":"gray","className":"flex items-center gap-1.5"}}>
              <Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Sin tarjeta requerida
            </UiText>
            <UiText {...{"weight":"medium","color":"gray","className":"flex items-center gap-1.5"}}>
              <Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Firma .p12 digital integrada
            </UiText>
            <UiText {...{"weight":"medium","color":"gray","className":"flex items-center gap-1.5"}}>
              <Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Comprobantes SRI ilimitados
            </UiText>
          </UiBox>

        </UiBox>

        {/* 2. HERO INTERACTIVE APP MOCKUP (Geist Window Frame) */}
        <UiBox id="demo-preview" {...{"className":"max-w-5xl mx-auto px-4 sm:px-6 pt-12 relative z-10"}}>
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden animate-in fade-in zoom-in-95 duration-300"}}>
            
            {/* Window Topbar */}
            <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)"},"className":"px-4 py-2.5 flex items-center justify-between gap-4"}}>
              <UiBox {...{"className":"flex items-center gap-2"}}>
                <UiText {...{"className":"w-2.5 h-2.5 inline-block"}}></UiText>
                <UiText {...{"className":"w-2.5 h-2.5 inline-block"}}></UiText>
                <UiText {...{"className":"w-2.5 h-2.5 inline-block"}}></UiText>
              </UiBox>
              
              {/* Browser Search Pill */}
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","fontFamily":"var(--code-font-family)","color":"var(--gray-11)"},"className":"flex items-center gap-1.5 px-3 py-1 max-w-xs w-full justify-center"}}>
                <UiText {...{"color":"gray"}}>app.webfix.ec</UiText>
                <UiText {...{"color":"gray"}}>/</UiText>
                <UiText>dashboard</UiText>
              </UiCard>

              <UiBox {...{"className":"flex items-center gap-1.5"}}>
                <Badge variant="success" {...{"className":"gap-1 py-0 px-2"}}>
                  <UiText {...{"className":"h-1.5 w-1.5"}}></UiText>
                  SRI Online
                </Badge>
              </UiBox>
            </UiBox>

            {/* Interactive Tab Switcher inside the Window */}
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"px-4 pt-3 flex items-center gap-2 overflow-x-auto custom-scrollbar"}}>
              {heroTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeHeroTab === tab.id;
                return (
                  <UiButton
                    key={tab.id}
                    onClick={() => setActiveHeroTab(tab.id)}
                    {...mergeThemeProps({"size":"2","className":"flex items-center gap-2 cursor-pointer whitespace-nowrap"}, {}, (isActive ? {"color":"gray","variant":"soft"} : {"color":"gray"}))}
                  >
                    <Icon size={14} {...(isActive ? {"style":{"color":"var(--blue-12)"}} : {"style":{"color":"var(--gray-11)"}})} />
                    <UiText>{tab.label}</UiText>
                  </UiButton>
                );
              })}
            </UiBox>

            {/* Simulated Live Viewport based on tab */}
            <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"p-5 sm:p-6 min-h-[320px] flex flex-col justify-center"}}>
              
              {activeHeroTab === 'sri' && (
                <UiBox {...{"className":"space-y-4 animate-in fade-in duration-150"}}>
                  {/* Metric Summary Bar */}
                  <UiBox {...{"className":"grid grid-cols-3 gap-3"}}>
                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3"}}>
                      <UiText {...{"size":"1","color":"gray","className":"block"}}>Facturas Autorizadas</UiText>
                      <UiText {...{"size":"4","weight":"regular","color":"gray","highContrast":true}}>142</UiText>
                    </UiCard>
                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3"}}>
                      <UiText {...{"size":"1","color":"gray","className":"block"}}>Total Facturado</UiText>
                      <UiText {...{"size":"4","weight":"regular","color":"gray","highContrast":true}}>$4,850.00</UiText>
                    </UiCard>
                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3"}}>
                      <UiText {...{"size":"1","color":"gray","className":"block"}}>Tiempo de Firma</UiText>
                      <UiText {...{"size":"4","weight":"regular","color":"green"}}>1.2s</UiText>
                    </UiCard>
                  </UiBox>

                  {/* Simulated Table */}
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
                    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)","borderBottom":"1px solid var(--gray-a6)"},"className":"grid grid-cols-12 px-3 py-2"}}>
                      <UiBox {...{"className":"col-span-3"}}>Comprobante</UiBox>
                      <UiBox {...{"className":"col-span-4"}}>Cliente / RUC</UiBox>
                      <UiBox {...{"className":"col-span-2 text-right"}}>Total</UiBox>
                      <UiBox {...{"className":"col-span-3 text-right"}}>Estado SRI</UiBox>
                    </UiBox>
                    <UiBox {...{}}>
                      <UiBox {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"grid grid-cols-12 px-3 py-2.5 items-center"}}>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"col-span-3"}}>001-002-000008452</UiBox>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"col-span-4 truncate"}}>Corporación Favorita S.A.</UiBox>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"col-span-2 text-right"}}>$320.00</UiBox>
                        <UiBox {...{"className":"col-span-3 text-right"}}>
                          <Badge variant="success" {...{"className":"gap-1"}}><CheckCircle2 size={10} /> Autorizado</Badge>
                        </UiBox>
                      </UiBox>
                      <UiBox {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"grid grid-cols-12 px-3 py-2.5 items-center"}}>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"col-span-3"}}>001-002-000008451</UiBox>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"col-span-4 truncate"}}>Juan Carlos Mendoza</UiBox>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"col-span-2 text-right"}}>$45.50</UiBox>
                        <UiBox {...{"className":"col-span-3 text-right"}}>
                          <Badge variant="success" {...{"className":"gap-1"}}><CheckCircle2 size={10} /> Autorizado</Badge>
                        </UiBox>
                      </UiBox>
                    </UiBox>
                  </UiBox>
                </UiBox>
              )}

              {activeHeroTab === 'pos' && (
                <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in duration-150 text-left"}}>
                  <UiBox {...{"className":"md:col-span-7 space-y-2"}}>
                    <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Catálogo de Productos Rápido</UiText>
                    <UiBox {...{"className":"grid grid-cols-2 gap-2"}}>
                      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3 cursor-pointer"}}>
                        <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block"}}>Café Americano 8oz</UiText>
                        <UiText {...{"size":"1","weight":"regular","color":"gray","className":"mt-1 block"}}>$1.50</UiText>
                      </UiCard>
                      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3 cursor-pointer"}}>
                        <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block"}}>Sandwich Gourmet</UiText>
                        <UiText {...{"size":"1","weight":"regular","color":"gray","className":"mt-1 block"}}>$4.50</UiText>
                      </UiCard>
                      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3 cursor-pointer"}}>
                        <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block"}}>Licencia ERP 1 Mes</UiText>
                        <UiText {...{"size":"1","weight":"regular","color":"gray","className":"mt-1 block"}}>$19.00</UiText>
                      </UiCard>
                      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3 cursor-pointer"}}>
                        <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block"}}>Servicio de Asesoría</UiText>
                        <UiText {...{"size":"1","weight":"regular","color":"gray","className":"mt-1 block"}}>$35.00</UiText>
                      </UiCard>
                    </UiBox>
                  </UiBox>
                  <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"md:col-span-5 p-4 flex flex-col justify-between"}}>
                    <UiBox>
                      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between pb-2 mb-2"}}>
                        <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Ticket Actual</UiText>
                        <UiText {...{"size":"1","weight":"regular","color":"gray"}}>Caja 01</UiText>
                      </UiBox>
                      <UiBox {...{"className":"space-y-1"}}>
                        <UiBox {...{"className":"flex justify-between"}}><UiText>2x Café Americano</UiText><UiText {...{"weight":"regular"}}>$3.00</UiText></UiBox>
                        <UiBox {...{"className":"flex justify-between"}}><UiText>1x Sandwich Gourmet</UiText><UiText {...{"weight":"regular"}}>$4.50</UiText></UiBox>
                      </UiBox>
                    </UiBox>
                    <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-2 mt-4 space-y-2"}}>
                      <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex justify-between"}}>
                        <UiText>Total (IVA incl.)</UiText>
                        <UiText {...{"weight":"regular"}}>$7.50</UiText>
                      </UiBox>
                      <Button variant="accent" size="sm" {...{"size":"2","className":"w-full gap-1"}}>
                        <DollarSign size={13} /> Cobrar (F12)
                      </Button>
                    </UiBox>
                  </UiCard>
                </UiBox>
              )}

              {activeHeroTab === 'finanzas' && (
                <UiBox {...{"className":"space-y-3 animate-in fade-in duration-150 text-left"}}>
                  <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
                      <UiText {...{"size":"1","color":"gray","className":"block"}}>Ingresos Totales (Mes)</UiText>
                      <UiText {...{"size":"5","weight":"regular","color":"green"}}>+$12,450.00</UiText>
                      <UiText {...{"size":"1","color":"gray","className":"mt-1 block"}}>+14.2% vs mes anterior</UiText>
                    </UiCard>
                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
                      <UiText {...{"size":"1","color":"gray","className":"block"}}>Egresos y Compras</UiText>
                      <UiText {...{"size":"5","weight":"regular","color":"red"}}>-$4,210.00</UiText>
                      <UiText {...{"size":"1","color":"gray","className":"mt-1 block"}}>Con retenciones aplicadas</UiText>
                    </UiCard>
                  </UiBox>
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-3 flex items-center justify-between"}}>
                    <UiText {...{"weight":"medium","color":"gray","highContrast":true}}>Utilidad Neta Disponible en Bancos:</UiText>
                    <UiText {...{"weight":"bold","size":"2","color":"gray","highContrast":true}}>$8,240.00</UiText>
                  </UiBox>
                </UiBox>
              )}

              {activeHeroTab === 'inventario' && (
                <UiBox {...{"className":"space-y-3 animate-in fade-in duration-150 text-left"}}>
                  <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3 space-y-2"}}>
                    <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center justify-between"}}>
                      <UiText>Control de Kardex en Tiempo Real</UiText>
                      <Badge variant="outline" {...{}}>Multibodega</Badge>
                    </UiBox>
                    <UiBox {...{"className":"grid grid-cols-3 gap-2 pt-1"}}>
                      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"p-2"}}>
                        <UiText {...{"size":"1","color":"gray","className":"block"}}>Items Registrados</UiText>
                        <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>248</UiText>
                      </UiBox>
                      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"p-2"}}>
                        <UiText {...{"size":"1","color":"gray","className":"block"}}>Stock Valorizado</UiText>
                        <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>$18,920.00</UiText>
                      </UiBox>
                      <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"p-2"}}>
                        <UiText {...{"size":"1","color":"gray","className":"block"}}>Alertas Mínimas</UiText>
                        <UiText {...{"weight":"bold","color":"amber"}}>2 por reponer</UiText>
                      </UiBox>
                    </UiBox>
                  </UiCard>
                </UiBox>
              )}

            </UiBox>

          </UiBox>
        </UiBox>

      </section>

      {/* 3. BENTO GRID FEATURES ("Infraestructura de Grado Empresarial") */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"relative py-24 overflow-hidden"}}>
        {/* Ambient Subtle Dot Matrix */}
        <UiBox 
          {...{"className":"absolute inset-0 opacity-70 pointer-events-none"}}
          style={{
            backgroundImage: 'radial-gradient(#E5E5E5 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%)'
          }}
        ></UiBox>

        <UiBox {...{"className":"max-w-6xl mx-auto px-4 sm:px-6 relative z-10"}}>
          
          <UiBox {...{"className":"text-center max-w-2xl mx-auto mb-14 space-y-2"}}>
            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Todo lo que tu negocio necesita en un solo lugar.
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
              Módulos modulares e interconectados para eliminar la fricción operativa y tributaria de tu empresa.
            </UiText>
          </UiBox>

          {/* Bento Grid with Floating Micro-Interactions */}
          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-4 text-left"}}>
            
            {/* Card 1: Facturación SRI */}
            <Card {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"group hover:-translate-y-1 duration-300 relative overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"transparent"},"className":"absolute top-0 left-0 right-0 h-[2px] duration-300"}}></UiBox>
              <CardHeader {...{"className":"pb-2"}}>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-2 w-fit mb-2 group-hover:scale-110 duration-200"}}>
                  <FileText size={18} />
                </UiBox>
                <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>Facturación SRI en 1 Clic</CardTitle>
              </CardHeader>
              <CardContent {...{"style":{"color":"var(--gray-11)"},"className":"leading-relaxed pt-0"}}>
                Emite facturas, notas de crédito, retenciones y liquidaciones autorizadas por el SRI en menos de 3 segundos con firma electrónica .p12 integrada.
              </CardContent>
            </Card>

            {/* Card 2: POS */}
            <Card {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"group hover:-translate-y-1 duration-300 relative overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"transparent"},"className":"absolute top-0 left-0 right-0 h-[2px] duration-300"}}></UiBox>
              <CardHeader {...{"className":"pb-2"}}>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-2 w-fit mb-2 group-hover:scale-110 duration-200"}}>
                  <ShoppingCart size={18} />
                </UiBox>
                <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>Punto de Venta (POS)</CardTitle>
              </CardHeader>
              <CardContent {...{"style":{"color":"var(--gray-11)"},"className":"leading-relaxed pt-0"}}>
                Diseñado para mostrador y atención rápida. Atajo directo (F12), cobro múltiple (efectivo, tarjeta, transferencia) y apertura/cierre de caja.
              </CardContent>
            </Card>

            {/* Card 3: Control Financiero */}
            <Card {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"group hover:-translate-y-1 duration-300 relative overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"transparent"},"className":"absolute top-0 left-0 right-0 h-[2px] duration-300"}}></UiBox>
              <CardHeader {...{"className":"pb-2"}}>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-2 w-fit mb-2 group-hover:scale-110 duration-200"}}>
                  <TrendingUp size={18} />
                </UiBox>
                <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>Control Financiero & Flujo</CardTitle>
              </CardHeader>
              <CardContent {...{"style":{"color":"var(--gray-11)"},"className":"leading-relaxed pt-0"}}>
                Cuentas por cobrar (CxC), cuentas por pagar (CxP), cruce de IVA automático y conciliación bancaria inteligente sin hojas de Excel.
              </CardContent>
            </Card>

            {/* Card 4: OCR IA */}
            <Card {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"group hover:-translate-y-1 duration-300 relative overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"transparent"},"className":"absolute top-0 left-0 right-0 h-[2px] duration-300"}}></UiBox>
              <CardHeader {...{"className":"pb-2"}}>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-2 w-fit mb-2 group-hover:scale-110 duration-200"}}>
                  <Sparkles size={18} />
                </UiBox>
                <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>Captura Inteligente OCR</CardTitle>
              </CardHeader>
              <CardContent {...{"style":{"color":"var(--gray-11)"},"className":"leading-relaxed pt-0"}}>
                Arrastra facturas de proveedores en PDF, XML o foto. El motor de IA extrae RUC, ítems, IVA y valores completando el formulario automáticamente.
              </CardContent>
            </Card>

            {/* Card 5: Inventario */}
            <Card {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"group hover:-translate-y-1 duration-300 relative overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"transparent"},"className":"absolute top-0 left-0 right-0 h-[2px] duration-300"}}></UiBox>
              <CardHeader {...{"className":"pb-2"}}>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-2 w-fit mb-2 group-hover:scale-110 duration-200"}}>
                  <Package size={18} />
                </UiBox>
                <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>Kardex & Stock en Tiempo Real</CardTitle>
              </CardHeader>
              <CardContent {...{"style":{"color":"var(--gray-11)"},"className":"leading-relaxed pt-0"}}>
                Control de inventario promedio ponderado con descargas automáticas por ventas y alertas de existencias mínimas.
              </CardContent>
            </Card>

            {/* Card 6: Seguridad Cloud */}
            <Card {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"group hover:-translate-y-1 duration-300 relative overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"transparent"},"className":"absolute top-0 left-0 right-0 h-[2px] duration-300"}}></UiBox>
              <CardHeader {...{"className":"pb-2"}}>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-2 w-fit mb-2 group-hover:scale-110 duration-200"}}>
                  <ShieldCheck size={18} />
                </UiBox>
                <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>Seguridad & Nube 24/7</CardTitle>
              </CardHeader>
              <CardContent {...{"style":{"color":"var(--gray-11)"},"className":"leading-relaxed pt-0"}}>
                Certificados digitales protegidos bajo encriptación industrial, copias de seguridad automáticas y acceso seguro desde cualquier dispositivo.
              </CardContent>
            </Card>

          </UiBox>

        </UiBox>
      </section>

      {/* 4. COMPARATIVA MINIMALISTA & ECOSISTEMA MULTIPLATAFORMA (PC, POS, MÓVIL) */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"relative py-24 overflow-hidden"}}>
        {/* Ambient Glow Lights behind section */}
        <UiBox {...{"style":{"backgroundColor":"var(--blue-3)","borderRadius":"var(--radius-3)"},"className":"absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none animate-glow-pulse"}}></UiBox>
        <UiBox {...{"style":{"backgroundColor":"var(--green-3)","borderRadius":"var(--radius-3)"},"className":"absolute bottom-10 right-10 w-[350px] h-[350px] pointer-events-none animate-glow-pulse"}} style={{ animationDelay: '2.5s' }}></UiBox>
        
        {/* Subtle grid pattern */}
        <UiBox 
          {...{"style":{"backgroundColor":"var(--gray-2)"},"className":{"className":"absolute inset-0 opacity-40 pointer-events-none"}}}
          style={{
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, #000 70%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, #000 70%, transparent 100%)'
          }}
        ></UiBox>

        <UiBox {...{"className":"max-w-4xl mx-auto px-4 sm:px-6 relative z-10"}}>
          
          <UiBox {...{"className":"text-center mb-12 space-y-2"}}>
            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Diseñado para el presente, no para el 2010.
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray"}}>
              ¿Por qué cientos de negocios están migrando de sistemas anticuados a WebFix?
            </UiText>
          </UiBox>

          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
            <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)","borderBottom":"1px solid var(--gray-a6)"},"className":"grid grid-cols-2 px-4 py-3"}}>
              <UiBox>Sistemas Tradicionales / Antiguos</UiBox>
              <UiBox {...{"style":{"color":"var(--blue-12)"}}}>WebFix ERP Cloud</UiBox>
            </UiBox>
            <UiBox {...{"style":{"color":"var(--gray-11)"}}}>
              <UiBox {...{"className":"grid grid-cols-2 px-4 py-3 items-center"}}>
                <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Instalaciones lentas en una sola PC física</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-1.5"}}><Check size={14} {...{"style":{"color":"var(--green-12)"}}} /> 100% Cloud desde cualquier navegador</UiBox>
              </UiBox>
              <UiBox {...{"className":"grid grid-cols-2 px-4 py-3 items-center"}}>
                <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Cobro por cantidad de facturas emitidas</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-1.5"}}><Check size={14} {...{"style":{"color":"var(--green-12)"}}} /> Facturación SRI Ilimitada en todos los planes</UiBox>
              </UiBox>
              <UiBox {...{"className":"grid grid-cols-2 px-4 py-3 items-center"}}>
                <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Interfaces complejas y lentas con ventanas viejas</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-1.5"}}><Check size={14} {...{"style":{"color":"var(--green-12)"}}} /> Diseño limpio Vercel/Geist con atajos de teclado</UiBox>
              </UiBox>
              <UiBox {...{"className":"grid grid-cols-2 px-4 py-3 items-center"}}>
                <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Pérdida de datos si la computadora se daña</UiBox>
                <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex items-center gap-1.5"}}><Check size={14} {...{"style":{"color":"var(--green-12)"}}} /> Respaldo continuo en la nube con Firebase</UiBox>
              </UiBox>
            </UiBox>
          </UiBox>

          {/* ECOSISTEMA MULTIPLATAFORMA FLOTANTE: PC, POS MOSTRADOR Y SMARTPHONE */}
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"mt-14 p-6 sm:p-8 text-left relative overflow-hidden"}}>
            
            {/* Animated Laser Beam on top */}
            <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"absolute top-0 left-0 right-0 h-[2px] overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"h-full w-1/3 animate-beam-slide"}}></UiBox>
            </UiBox>

            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 pt-1"}}>
              <UiBox>
                <UiText {...{"size":"1","weight":"bold","color":"blue","className":"flex items-center gap-1.5 mb-1 select-none"}}>
                  <UiText {...{"className":"relative flex h-2 w-2"}}>
                    <UiText {...{"className":"animate-ping absolute inline-flex h-full w-full opacity-75"}}></UiText>
                    <UiText {...{"className":"relative inline-flex h-2 w-2"}}></UiText>
                  </UiText>
                  Ecosistema Multiplataforma Integrado
                </UiText>
                <UiHeading as="h3" {...{"size":"4","weight":"bold","color":"gray","highContrast":true}}>
                  Tu negocio sincronizado en PC, Móvil y Punto de Venta
                </UiHeading>
              </UiBox>
              <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","color":"var(--gray-11)","fontFamily":"var(--code-font-family)"},"className":"flex items-center gap-2 px-3 py-1.5"}}>
                <Wifi size={13} {...{"style":{"color":"var(--green-12)"}}} />
                <UiText>Cloud Sync 100% en Vivo</UiText>
              </UiBox>
            </UiBox>

            {/* 3 Devices Floating Fleet */}
            <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"}}>
              
              {/* DISPOSITIVO 1: PC / COMPUTADORA (Flota Suave a 6s) */}
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 flex flex-col justify-between duration-300 group"}}>
                <UiBox>
                  {/* Laptop Mockup Window with Float Animation */}
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"animate-float-slow overflow-hidden mb-4 transition-shadow"}}>
                    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)"},"className":"px-2.5 py-1.5 flex items-center justify-between"}}>
                      <UiBox {...{"className":"flex items-center gap-1.5"}}>
                        <UiText {...{"className":"w-2 h-2 inline-block"}}></UiText>
                        <UiText {...{"className":"w-2 h-2 inline-block"}}></UiText>
                        <UiText {...{"className":"w-2 h-2 inline-block"}}></UiText>
                      </UiBox>
                      <UiText {...{"size":"1","weight":"regular","color":"gray"}}>app.webfix.ec</UiText>
                      <UiText {...{"className":"w-2 h-2"}}></UiText>
                    </UiBox>
                    <UiBox {...{"className":"p-3 space-y-2"}}>
                      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center pb-1"}}>
                        <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>ERP Dashboard</UiText>
                        <Badge variant="success" {...{"className":"py-0 px-1 flex items-center gap-1"}}>
                          <UiText {...{"className":"h-1.5 w-1.5 animate-pulse"}}></UiText>
                          SRI Activo
                        </Badge>
                      </UiBox>
                      <UiBox {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"grid grid-cols-2 gap-1.5"}}>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                          <UiText {...{"color":"gray","size":"1","className":"block"}}>Ventas Mes</UiText>
                          <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>$4,850.00</UiText>
                        </UiBox>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                          <UiText {...{"color":"gray","size":"1","className":"block"}}>Facturas</UiText>
                          <UiText {...{"weight":"bold","color":"green"}}>142 Ok</UiText>
                        </UiBox>
                      </UiBox>
                      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"p-1.5 flex justify-between items-center"}}>
                        <UiText>Último comprobante:</UiText>
                        <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>FAC-0084</UiText>
                      </UiBox>
                    </UiBox>
                  </UiBox>

                  <UiBox {...{"className":"flex items-center gap-2 mb-1.5"}}>
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                      <Laptop size={14} />
                    </UiBox>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>PC & Laptops</UiHeading>
                  </UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                    Control administrativo completo, reportes tributarios, subida de firmas .p12 y gestión de inventario multibodega.
                  </UiText>
                </UiBox>
              </UiCard>

              {/* DISPOSITIVO 2: PUNTO DE VENTA (POS) / TABLET (Flota Asíncrona a 4.5s) */}
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 flex flex-col justify-between duration-300 group"}}>
                <UiBox>
                  {/* Tablet / POS Mockup Window with Float Animation */}
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"animate-float-medium overflow-hidden mb-4 transition-shadow"}}>
                    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)"},"className":"px-2.5 py-1.5 flex items-center justify-between"}}>
                      <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Terminal POS 01</UiText>
                      <Badge variant="outline" {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"py-0 px-1"}}>Caja Abierta</Badge>
                    </UiBox>
                    <UiBox {...{"className":"p-3 space-y-2"}}>
                      <UiBox {...{"className":"grid grid-cols-2 gap-1.5"}}>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5 text-center"}}>
                          <UiText {...{"weight":"bold","color":"gray","highContrast":true,"className":"block truncate"}}>Café Espresso</UiText>
                          <UiText {...{"weight":"regular","color":"gray","size":"1"}}>$1.75</UiText>
                        </UiBox>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5 text-center"}}>
                          <UiText {...{"weight":"bold","color":"gray","highContrast":true,"className":"block truncate"}}>Combo Lunch</UiText>
                          <UiText {...{"weight":"regular","color":"gray","size":"1"}}>$6.50</UiText>
                        </UiBox>
                      </UiBox>
                      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5 flex justify-between items-center"}}>
                        <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>Total Ticket:</UiText>
                        <UiText {...{"weight":"bold","color":"blue"}}>$8.25</UiText>
                      </UiBox>
                      <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--color-background)","borderRadius":"var(--radius-3)"},"className":"py-1 text-center cursor-pointer"}}>
                        Cobro Rápido (F12) ↵
                      </UiBox>
                    </UiBox>
                  </UiBox>

                  <UiBox {...{"className":"flex items-center gap-2 mb-1.5"}}>
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                      <Store size={14} />
                    </UiBox>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Puntos de Venta & Tablets</UiHeading>
                  </UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                    Atención ágil en mostrador con pantalla táctil, pistolas lectoras de barras, tickets térmicos y cobro en 5 segundos.
                  </UiText>
                </UiBox>
              </UiCard>

              {/* DISPOSITIVO 3: MÓVIL / SMARTPHONE (Flota Asíncrona a 3.8s) */}
              <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 flex flex-col justify-between duration-300 group"}}>
                <UiBox>
                  {/* Smartphone Mockup with Float Animation */}
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"animate-float-fast max-w-[160px] mx-auto overflow-hidden mb-4 transition-shadow"}}>
                    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a6)","fontFamily":"var(--code-font-family)","color":"var(--gray-11)"},"className":"px-3 py-1 flex items-center justify-between"}}>
                      <UiText>9:41</UiText>
                      <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","borderRadius":"var(--radius-3)"},"className":"w-8 h-1"}}></UiBox>
                      <UiText {...{"color":"green","weight":"bold"}}>5G</UiText>
                    </UiBox>
                    <UiBox {...{"className":"p-2.5 space-y-1.5"}}>
                      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"p-1.5 text-center"}}>
                        <UiText {...{"size":"1","color":"gray","className":"block"}}>Ventas de Hoy</UiText>
                        <UiText {...{"weight":"bold","color":"green","size":"1"}}>+$1,340.00</UiText>
                      </UiBox>
                      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"p-1.5 space-y-0.5"}}>
                        <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex justify-between"}}>
                          <UiText>FAC-0091</UiText>
                          <UiText>$45.00</UiText>
                        </UiBox>
                        <UiText {...{"color":"green","weight":"medium","className":"block flex items-center gap-1"}}>
                          <UiText {...{"className":"h-1 w-1 inline-block animate-ping"}}></UiText>
                          Enviada al SRI
                        </UiText>
                      </UiBox>
                      <UiBox {...{"style":{"backgroundColor":"var(--blue-9)","color":"var(--color-background)","borderRadius":"var(--radius-3)"},"className":"py-1 text-center"}}>
                        + Nueva Factura
                      </UiBox>
                    </UiBox>
                  </UiBox>

                  <UiBox {...{"className":"flex items-center gap-2 mb-1.5"}}>
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"},"className":"p-1.5"}}>
                      <Smartphone size={14} />
                    </UiBox>
                    <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Smartphones & Celulares</UiHeading>
                  </UiBox>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                    Supervisa tu negocio desde cualquier lugar: emite comprobantes en ruta, consulta existencias y revisa tu dinero en tiempo real.
                  </UiText>
                </UiBox>
              </UiCard>

            </UiBox>

            {/* Bottom Sync Banner with Continuous Flow */}
            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)","color":"var(--gray-11)"},"className":"mt-6 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3"}}>
              <UiBox {...{"className":"flex items-center gap-2"}}>
                <RefreshCw size={13} {...{"style":{"color":"var(--blue-12)"},"className":"animate-spin-slow shrink-0"}} />
                <UiText {...{"weight":"medium","color":"gray","highContrast":true}}>
                  Sincronización bidireccional automática:
                </UiText>
                <UiText>Una venta en el POS descuenta el inventario en la PC y actualiza el saldo en tu celular al segundo.</UiText>
              </UiBox>
            </UiBox>
          </UiBox>

        </UiBox>
      </section>

      {/* 5. PRICING PREVIEW */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"py-20"}}>
        <UiBox {...{"className":"max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8"}}>
          
          <UiBox {...{"className":"space-y-2"}}>
            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Precios simples y transparentes.
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray"}}>
              Sin costos ocultos ni cobros por factura emitida. Comienza con 14 días gratis.
            </UiText>

            {/* Toggle Mensual / Anual */}
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"inline-flex items-center p-1 gap-1 mt-4"}}>
              <UiButton
                onClick={() => setBillingCycle('monthly')}
                {...mergeThemeProps({"size":"2","className":"cursor-pointer"}, {}, (billingCycle === 'monthly' ? {"variant":"surface","color":"gray"} : {"color":"gray"}))}
              >
                Mensual
              </UiButton>
              <UiButton
                onClick={() => setBillingCycle('yearly')}
                {...mergeThemeProps({"size":"2","className":"cursor-pointer flex items-center gap-1"}, {}, (billingCycle === 'yearly' ? {"variant":"surface","color":"gray"} : {"color":"gray"}))}
              >
                <UiText>Anual</UiText>
                <UiText {...{"size":"1","color":"green","weight":"regular","className":"px-1"}}>-20%</UiText>
              </UiButton>
            </UiBox>
          </UiBox>

          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto"}}>
            
            {/* Plan Starter */}
            <Card {...{"className":"p-5 flex flex-col justify-between"}}>
              <UiBox>
                <UiBox {...{"className":"mb-4"}}>
                  <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Emprendedor</UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"mt-0.5"}}>Para negocios que inician con el SRI</UiText>
                </UiBox>
                <UiBox {...{"className":"mb-6"}}>
                  <UiText {...{"size":"7","weight":"regular","color":"gray","highContrast":true}}>
                    ${billingCycle === 'monthly' ? '15' : '12'}
                  </UiText>
                  <UiText {...{"size":"1","color":"gray"}}> / mes</UiText>
                </UiBox>
                <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-2"}}>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Facturas SRI Ilimitadas</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Punto de Venta (POS)</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Directorio de Clientes</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> 1 Usuario</li>
                </ul>
              </UiBox>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/register')}
                {...{"size":"2","className":"w-full mt-6"}}
              >
                Probar Gratis
              </Button>
            </Card>

            {/* Plan Profesional (Destacado) */}
            <Card {...{"className":"p-5 flex flex-col justify-between relative"}}>
              <Badge variant="default" {...{"className":"absolute -top-2.5 right-4 py-0.5 px-2"}}>
                Más Popular
              </Badge>
              <UiBox>
                <UiBox {...{"className":"mb-4"}}>
                  <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Negocio Pro</UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"mt-0.5"}}>Para comercios con inventario y POS</UiText>
                </UiBox>
                <UiBox {...{"className":"mb-6"}}>
                  <UiText {...{"size":"7","weight":"regular","color":"gray","highContrast":true}}>
                    ${billingCycle === 'monthly' ? '29' : '23'}
                  </UiText>
                  <UiText {...{"size":"1","color":"gray"}}> / mes</UiText>
                </UiBox>
                <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-2"}}>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Todo lo de Emprendedor</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Inventario & Kardex Multibodega</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Control de Cuentas por Cobrar (CxC)</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Hasta 3 Usuarios y Cajeros</li>
                </ul>
              </UiBox>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate('/register')}
                {...{"size":"2","className":"w-full mt-6"}}
              >
                Comenzar con Pro
              </Button>
            </Card>

            {/* Plan Empresa */}
            <Card {...{"className":"p-5 flex flex-col justify-between"}}>
              <UiBox>
                <UiBox {...{"className":"mb-4"}}>
                  <UiHeading as="h3" {...{"size":"2","weight":"bold","color":"gray","highContrast":true}}>Empresarial</UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"mt-0.5"}}>Para empresas con gestión completa</UiText>
                </UiBox>
                <UiBox {...{"className":"mb-6"}}>
                  <UiText {...{"size":"7","weight":"regular","color":"gray","highContrast":true}}>
                    ${billingCycle === 'monthly' ? '59' : '47'}
                  </UiText>
                  <UiText {...{"size":"1","color":"gray"}}> / mes</UiText>
                </UiBox>
                <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-2"}}>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Todo lo de Negocio Pro</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Captura OCR con IA ilimitada</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Contabilidad & Asientos Automáticos</li>
                  <li {...{"className":"flex items-center gap-2"}}><Check size={12} {...{"style":{"color":"var(--green-12)"}}} /> Usuarios y Cajeros Ilimitados</li>
                </ul>
              </UiBox>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/register')}
                {...{"size":"2","className":"w-full mt-6"}}
              >
                Probar Empresarial
              </Button>
            </Card>

          </UiBox>

        </UiBox>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"py-20"}}>
        <UiBox {...{"className":"max-w-3xl mx-auto px-4 sm:px-6 text-left"}}>
          
          <UiBox {...{"className":"text-center mb-12 space-y-2"}}>
            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Preguntas Frecuentes
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray"}}>
              Todo lo que necesitas saber para comenzar hoy mismo.
            </UiText>
          </UiBox>

          <UiBox {...{"className":"space-y-2"}}>
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <UiBox 
                  key={index} 
                  {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}
                >
                  <UiButton
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    {...{"size":"2","color":"gray","className":"w-full text-left flex items-center justify-between gap-4 cursor-pointer"}}
                  >
                    <UiText>{faq.q}</UiText>
                    <ChevronDown size={14} {...mergeThemeProps({"className":"shrink-0 transition-transform duration-150"}, {}, (isOpen ? {"className":"rotate-180"} : {}))} />
                  </UiButton>
                  {isOpen && (
                    <UiBox {...{"style":{"color":"var(--gray-11)","borderTop":"1px solid var(--gray-a6)"},"className":"px-4 pb-3.5 pt-1 leading-relaxed animate-in fade-in duration-100"}}>
                      {faq.a}
                    </UiBox>
                  )}
                </UiBox>
              );
            })}
          </UiBox>

        </UiBox>
      </section>

      {/* 7. FINAL CALL TO ACTION (Minimalist High-Contrast Banner with Ambient Glow) */}
      <section {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"relative py-24 overflow-hidden"}}>
        {/* Ambient Glow Lights */}
        <UiBox {...{"style":{"backgroundColor":"var(--blue-3)","borderRadius":"var(--radius-3)"},"className":"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] pointer-events-none animate-glow-pulse"}}></UiBox>

        <UiBox {...{"className":"max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10"}}>
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-8 sm:p-14 space-y-5 relative overflow-hidden"}}>
            
            {/* Top decorative laser line */}
            <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"absolute top-0 left-0 right-0 h-[2px] overflow-hidden"}}>
              <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"h-full w-1/3 animate-beam-slide"}} style={{ animationDuration: '4s' }}></UiBox>
            </UiBox>

            <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"inline-flex items-center gap-2 px-3 py-1 select-none"}}>
              <UiText {...{"className":"flex h-1.5 w-1.5 animate-pulse"}}></UiText>
              <UiText>14 Días Gratis • Sin Tarjeta</UiText>
            </UiCard>

            <UiHeading as="h2" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
              Comienza a facturar y controlar tu negocio hoy.
            </UiHeading>
            <UiText as="p" {...{"size":"1","color":"gray","className":"max-w-lg mx-auto leading-relaxed"}}>
              Únete a cientos de emprendedores ecuatorianos que ya modernizaron su gestión tributaria y comercial con WebFix.
            </UiText>
            <UiBox {...{"className":"pt-3 flex flex-col sm:flex-row items-center justify-center gap-3"}}>
              <Button 
                size="lg" 
                variant="default"
                onClick={() => navigate('/register')}
                {...{"size":"2","className":"w-full sm:w-auto gap-2 group hover:scale-[1.02]"}}
              >
                <UiText>Crear Cuenta Gratis</UiText>
                <ArrowRight size={13} {...{"className":"group-hover:translate-x-0.5 transition-transform"}} />
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate('/contacto')}
                {...{"size":"2","className":"w-full sm:w-auto"}}
              >
                Hablar con un Asesor
              </Button>
            </UiBox>
          </UiBox>
        </UiBox>
      </section>

    </UiBox>
  );
}
