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
    <div className="w-full bg-white text-text-primary selection:bg-primary selection:text-white">
      
      {/* 1. HERO SECTION (Minimalist Startup Aesthetic) */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden border-b border-border-default">
        {/* Subtle background hairline grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#EAEAEA_1px,transparent_1px),linear-gradient(to_bottom,#EAEAEA_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6">
          
          {/* Top Pill Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-default bg-surface-sidebar text-text-secondary text-xs font-medium tracking-tight hover:border-text-heading transition-colors cursor-default select-none animate-in fade-in duration-200">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#00E4B8]"></span>
            <span>WebFix ERP 2.0</span>
            <span className="text-border-default">•</span>
            <span className="text-text-heading font-semibold">Facturación SRI & Finanzas</span>
            <ArrowRight size={11} className="text-text-muted" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-heading max-w-4xl mx-auto leading-[1.08]">
            El sistema operativo financiero para negocios modernos.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed font-normal">
            Emite facturas electrónicas autorizadas por el SRI en segundos, administra tu punto de venta en mostrador y controla tu flujo de caja real sin enredos contables.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button 
              size="lg" 
              variant="default"
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto text-xs px-6 h-10 gap-2 shadow-sm"
            >
              <span>Comenzar gratis 14 días</span>
              <ArrowRight size={13} />
            </Button>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => {
                const el = document.getElementById('demo-preview');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto text-xs px-5 h-10"
            >
              Ver Demostración
            </Button>
          </div>

          {/* Micro trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-text-muted pt-4 select-none">
            <span className="flex items-center gap-1.5 font-medium text-text-secondary">
              <Check size={12} className="text-[#00E4B8]" /> Sin tarjeta requerida
            </span>
            <span className="flex items-center gap-1.5 font-medium text-text-secondary">
              <Check size={12} className="text-[#00E4B8]" /> Firma .p12 digital integrada
            </span>
            <span className="flex items-center gap-1.5 font-medium text-text-secondary">
              <Check size={12} className="text-[#00E4B8]" /> Comprobantes SRI ilimitados
            </span>
          </div>

        </div>

        {/* 2. HERO INTERACTIVE APP MOCKUP (Geist Window Frame) */}
        <div id="demo-preview" className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 relative z-10">
          <div className="rounded-lg border border-border-default bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            {/* Window Topbar */}
            <div className="bg-surface-sidebar border-b border-border-default px-4 py-2.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-border-strong inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-border-default inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-border-default inline-block"></span>
              </div>
              
              {/* Browser Search Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-border-default text-[11px] font-mono text-text-muted max-w-xs w-full justify-center">
                <span className="text-text-secondary">app.webfix.ec</span>
                <span className="text-border-strong">/</span>
                <span>dashboard</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant="success" className="gap-1 text-[10px] py-0 px-2 font-normal normal-case">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00E4B8]"></span>
                  SRI Online
                </Badge>
              </div>
            </div>

            {/* Interactive Tab Switcher inside the Window */}
            <div className="border-b border-border-default bg-white px-4 pt-3 flex items-center gap-2 overflow-x-auto custom-scrollbar">
              {heroTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeHeroTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveHeroTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium tracking-tight rounded-t-md border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      isActive 
                        ? 'border-primary text-text-heading font-semibold bg-surface-sidebar/50' 
                        : 'border-transparent text-text-secondary hover:text-text-heading hover:bg-surface-sidebar/30'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-primary' : 'text-text-muted'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Simulated Live Viewport based on tab */}
            <div className="p-5 sm:p-6 bg-surface-bg/30 min-h-[320px] flex flex-col justify-center">
              
              {activeHeroTab === 'sri' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Metric Summary Bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-md bg-white border border-border-default">
                      <span className="text-[11px] text-text-secondary block">Facturas Autorizadas</span>
                      <span className="text-lg font-bold font-mono text-text-heading">142</span>
                    </div>
                    <div className="p-3 rounded-md bg-white border border-border-default">
                      <span className="text-[11px] text-text-secondary block">Total Facturado</span>
                      <span className="text-lg font-bold font-mono text-text-heading">$4,850.00</span>
                    </div>
                    <div className="p-3 rounded-md bg-white border border-border-default">
                      <span className="text-[11px] text-text-secondary block">Tiempo de Firma</span>
                      <span className="text-lg font-bold font-mono text-success-text">1.2s</span>
                    </div>
                  </div>

                  {/* Simulated Table */}
                  <div className="rounded-md border border-border-default bg-white overflow-hidden text-xs">
                    <div className="grid grid-cols-12 bg-surface-sidebar px-3 py-2 font-semibold text-text-secondary uppercase text-[10px] tracking-wider border-b border-border-default">
                      <div className="col-span-3">Comprobante</div>
                      <div className="col-span-4">Cliente / RUC</div>
                      <div className="col-span-2 text-right">Total</div>
                      <div className="col-span-3 text-right">Estado SRI</div>
                    </div>
                    <div className="divide-y divide-border-default">
                      <div className="grid grid-cols-12 px-3 py-2.5 items-center font-mono hover:bg-surface-sidebar/40 transition-colors">
                        <div className="col-span-3 font-semibold text-text-heading">001-002-000008452</div>
                        <div className="col-span-4 font-sans text-text-primary truncate">Corporación Favorita S.A.</div>
                        <div className="col-span-2 text-right font-bold text-text-heading">$320.00</div>
                        <div className="col-span-3 text-right font-sans">
                          <Badge variant="success" className="text-[10px] gap-1"><CheckCircle2 size={10} /> Autorizado</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 px-3 py-2.5 items-center font-mono hover:bg-surface-sidebar/40 transition-colors">
                        <div className="col-span-3 font-semibold text-text-heading">001-002-000008451</div>
                        <div className="col-span-4 font-sans text-text-primary truncate">Juan Carlos Mendoza</div>
                        <div className="col-span-2 text-right font-bold text-text-heading">$45.50</div>
                        <div className="col-span-3 text-right font-sans">
                          <Badge variant="success" className="text-[10px] gap-1"><CheckCircle2 size={10} /> Autorizado</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeHeroTab === 'pos' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in duration-150 text-left">
                  <div className="md:col-span-7 space-y-2">
                    <span className="text-xs font-semibold text-text-heading">Catálogo de Productos Rápido</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-md bg-white border border-border-default hover:border-text-heading transition-colors cursor-pointer">
                        <span className="text-xs font-semibold block text-text-heading">Café Americano 8oz</span>
                        <span className="text-xs font-mono text-text-secondary mt-1 block">$1.50</span>
                      </div>
                      <div className="p-3 rounded-md bg-white border border-border-default hover:border-text-heading transition-colors cursor-pointer">
                        <span className="text-xs font-semibold block text-text-heading">Sandwich Gourmet</span>
                        <span className="text-xs font-mono text-text-secondary mt-1 block">$4.50</span>
                      </div>
                      <div className="p-3 rounded-md bg-white border border-border-default hover:border-text-heading transition-colors cursor-pointer">
                        <span className="text-xs font-semibold block text-text-heading">Licencia ERP 1 Mes</span>
                        <span className="text-xs font-mono text-text-secondary mt-1 block">$19.00</span>
                      </div>
                      <div className="p-3 rounded-md bg-white border border-border-default hover:border-text-heading transition-colors cursor-pointer">
                        <span className="text-xs font-semibold block text-text-heading">Servicio de Asesoría</span>
                        <span className="text-xs font-mono text-text-secondary mt-1 block">$35.00</span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-5 p-4 rounded-md bg-white border border-border-default flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-border-default pb-2 mb-2">
                        <span className="text-xs font-semibold text-text-heading">Ticket Actual</span>
                        <span className="text-[10px] font-mono text-text-muted">Caja 01</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span>2x Café Americano</span><span className="font-mono">$3.00</span></div>
                        <div className="flex justify-between"><span>1x Sandwich Gourmet</span><span className="font-mono">$4.50</span></div>
                      </div>
                    </div>
                    <div className="border-t border-border-default pt-2 mt-4 space-y-2">
                      <div className="flex justify-between text-sm font-bold text-text-heading">
                        <span>Total (IVA incl.)</span>
                        <span className="font-mono">$7.50</span>
                      </div>
                      <Button variant="accent" size="sm" className="w-full text-xs gap-1">
                        <DollarSign size={13} /> Cobrar (F12)
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeHeroTab === 'finanzas' && (
                <div className="space-y-3 animate-in fade-in duration-150 text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-md bg-white border border-border-default">
                      <span className="text-[11px] text-text-secondary block">Ingresos Totales (Mes)</span>
                      <span className="text-xl font-bold font-mono text-success-text">+$12,450.00</span>
                      <span className="text-[10px] text-text-muted mt-1 block">+14.2% vs mes anterior</span>
                    </div>
                    <div className="p-4 rounded-md bg-white border border-border-default">
                      <span className="text-[11px] text-text-secondary block">Egresos y Compras</span>
                      <span className="text-xl font-bold font-mono text-error">-$4,210.00</span>
                      <span className="text-[10px] text-text-muted mt-1 block">Con retenciones aplicadas</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-surface-sidebar border border-border-default flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary">Utilidad Neta Disponible en Bancos:</span>
                    <span className="font-mono font-bold text-sm text-text-heading">$8,240.00</span>
                  </div>
                </div>
              )}

              {activeHeroTab === 'inventario' && (
                <div className="space-y-3 animate-in fade-in duration-150 text-left">
                  <div className="rounded-md border border-border-default bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-text-heading">
                      <span>Control de Kardex en Tiempo Real</span>
                      <Badge variant="outline" className="text-[10px]">Multibodega</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div className="p-2 bg-surface-sidebar rounded">
                        <span className="text-[10px] text-text-secondary block">Items Registrados</span>
                        <span className="font-mono font-bold text-text-heading">248</span>
                      </div>
                      <div className="p-2 bg-surface-sidebar rounded">
                        <span className="text-[10px] text-text-secondary block">Stock Valorizado</span>
                        <span className="font-mono font-bold text-text-heading">$18,920.00</span>
                      </div>
                      <div className="p-2 bg-surface-sidebar rounded">
                        <span className="text-[10px] text-text-secondary block">Alertas Mínimas</span>
                        <span className="font-mono font-bold text-warning-text">2 por reponer</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>

      </section>

      {/* 3. BENTO GRID FEATURES ("Infraestructura de Grado Empresarial") */}
      <section className="py-20 border-b border-border-default bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-heading">
              Todo lo que tu negocio necesita en un solo lugar.
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Módulos modulares e interconectados para eliminar la fricción operativa y tributaria de tu empresa.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            
            {/* Card 1: Facturación SRI */}
            <Card className="hover:border-border-strong transition-colors">
              <CardHeader className="pb-2">
                <div className="p-2 rounded-md bg-black/5 text-text-heading w-fit mb-2">
                  <FileText size={18} />
                </div>
                <CardTitle className="text-sm font-semibold text-text-heading">Facturación SRI en 1 Clic</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-text-secondary leading-relaxed pt-0">
                Emite facturas, notas de crédito, retenciones y liquidaciones autorizadas por el SRI en menos de 3 segundos con firma electrónica .p12 integrada.
              </CardContent>
            </Card>

            {/* Card 2: POS */}
            <Card className="hover:border-border-strong transition-colors">
              <CardHeader className="pb-2">
                <div className="p-2 rounded-md bg-black/5 text-text-heading w-fit mb-2">
                  <ShoppingCart size={18} />
                </div>
                <CardTitle className="text-sm font-semibold text-text-heading">Punto de Venta (POS)</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-text-secondary leading-relaxed pt-0">
                Diseñado para mostrador y atención rápida. Atajo directo (F12), cobro múltiple (efectivo, tarjeta, transferencia) y apertura/cierre de caja.
              </CardContent>
            </Card>

            {/* Card 3: Control Financiero */}
            <Card className="hover:border-border-strong transition-colors">
              <CardHeader className="pb-2">
                <div className="p-2 rounded-md bg-black/5 text-text-heading w-fit mb-2">
                  <TrendingUp size={18} />
                </div>
                <CardTitle className="text-sm font-semibold text-text-heading">Control Financiero & Flujo</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-text-secondary leading-relaxed pt-0">
                Cuentas por cobrar (CxC), cuentas por pagar (CxP), cruce de IVA automático y conciliación bancaria inteligente sin hojas de Excel.
              </CardContent>
            </Card>

            {/* Card 4: OCR IA */}
            <Card className="hover:border-border-strong transition-colors">
              <CardHeader className="pb-2">
                <div className="p-2 rounded-md bg-black/5 text-text-heading w-fit mb-2">
                  <Sparkles size={18} />
                </div>
                <CardTitle className="text-sm font-semibold text-text-heading">Captura Inteligente OCR</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-text-secondary leading-relaxed pt-0">
                Arrastra facturas de proveedores en PDF, XML o foto. El motor de IA extrae RUC, ítems, IVA y valores completando el formulario automáticamente.
              </CardContent>
            </Card>

            {/* Card 5: Inventario */}
            <Card className="hover:border-border-strong transition-colors">
              <CardHeader className="pb-2">
                <div className="p-2 rounded-md bg-black/5 text-text-heading w-fit mb-2">
                  <Package size={18} />
                </div>
                <CardTitle className="text-sm font-semibold text-text-heading">Kardex & Stock en Tiempo Real</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-text-secondary leading-relaxed pt-0">
                Control de inventario promedio ponderado con descargas automáticas por ventas y alertas de existencias mínimas.
              </CardContent>
            </Card>

            {/* Card 6: Seguridad Cloud */}
            <Card className="hover:border-border-strong transition-colors">
              <CardHeader className="pb-2">
                <div className="p-2 rounded-md bg-black/5 text-text-heading w-fit mb-2">
                  <ShieldCheck size={18} />
                </div>
                <CardTitle className="text-sm font-semibold text-text-heading">Seguridad & Nube 24/7</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-text-secondary leading-relaxed pt-0">
                Certificados digitales protegidos bajo encriptación industrial, copias de seguridad automáticas y acceso seguro desde cualquier dispositivo.
              </CardContent>
            </Card>

          </div>

        </div>
      </section>

      {/* 4. COMPARATIVA MINIMALISTA (Sistemas Tradicionales vs WebFix) */}
      <section className="py-20 border-b border-border-default bg-surface-sidebar/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-heading">
              Diseñado para el presente, no para el 2010.
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              ¿Por qué cientos de negocios están migrando de sistemas anticuados a WebFix?
            </p>
          </div>

          <div className="rounded-lg border border-border-default bg-white overflow-hidden text-xs">
            <div className="grid grid-cols-2 bg-surface-sidebar px-4 py-3 font-semibold text-text-heading border-b border-border-default">
              <div>Sistemas Tradicionales / Antiguos</div>
              <div className="text-primary font-bold">WebFix ERP Cloud</div>
            </div>
            <div className="divide-y divide-border-default text-text-secondary">
              <div className="grid grid-cols-2 px-4 py-3 items-center">
                <div className="text-text-muted">Instalaciones lentas en una sola PC física</div>
                <div className="text-text-heading font-medium flex items-center gap-1.5"><Check size={14} className="text-[#00E4B8]" /> 100% Cloud desde cualquier navegador</div>
              </div>
              <div className="grid grid-cols-2 px-4 py-3 items-center">
                <div className="text-text-muted">Cobro por cantidad de facturas emitidas</div>
                <div className="text-text-heading font-medium flex items-center gap-1.5"><Check size={14} className="text-[#00E4B8]" /> Facturación SRI Ilimitada en todos los planes</div>
              </div>
              <div className="grid grid-cols-2 px-4 py-3 items-center">
                <div className="text-text-muted">Interfaces complejas y lentas con ventanas viejas</div>
                <div className="text-text-heading font-medium flex items-center gap-1.5"><Check size={14} className="text-[#00E4B8]" /> Diseño limpio Vercel/Geist con atajos de teclado</div>
              </div>
              <div className="grid grid-cols-2 px-4 py-3 items-center">
                <div className="text-text-muted">Pérdida de datos si la computadora se daña</div>
                <div className="text-text-heading font-medium flex items-center gap-1.5"><Check size={14} className="text-[#00E4B8]" /> Respaldo continuo en la nube con Firebase</div>
              </div>
            </div>
          </div>

          {/* ECOSISTEMA MULTIPLATAFORMA: PC, POS MOSTRADOR Y SMARTPHONE */}
          <div className="mt-12 rounded-xl border border-border-default bg-white p-6 sm:p-8 text-left shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-6 mb-8">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E4B8] animate-pulse"></span>
                  Ecosistema Multiplataforma Integrado
                </span>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-text-heading">
                  Tu negocio sincronizado en PC, Móvil y Punto de Venta
                </h3>
              </div>
              <div className="flex items-center gap-2 bg-surface-sidebar px-3 py-1.5 rounded-md border border-border-default text-xs text-text-secondary font-mono">
                <Wifi size={13} className="text-[#00E4B8]" />
                <span>Cloud Sync 100% en Vivo</span>
              </div>
            </div>

            {/* 3 Devices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              
              {/* DISPOSITIVO 1: PC / COMPUTADORA */}
              <div className="rounded-lg border border-border-default bg-surface-sidebar/40 p-4 flex flex-col justify-between hover:border-border-strong transition-colors">
                <div>
                  {/* Laptop Mockup Window */}
                  <div className="rounded-md border border-border-default bg-white overflow-hidden shadow-xs mb-4">
                    <div className="bg-surface-sidebar border-b border-border-default px-2.5 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-border-strong inline-block"></span>
                        <span className="w-2 h-2 rounded-full bg-border-default inline-block"></span>
                        <span className="w-2 h-2 rounded-full bg-border-default inline-block"></span>
                      </div>
                      <span className="text-[9px] font-mono text-text-muted">app.webfix.ec</span>
                      <span className="w-2 h-2"></span>
                    </div>
                    <div className="p-3 space-y-2 text-[10px]">
                      <div className="flex justify-between items-center pb-1 border-b border-border-default/60">
                        <span className="font-semibold text-text-heading">ERP Dashboard</span>
                        <Badge variant="success" className="text-[9px] py-0 px-1 font-normal">SRI Activo</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 font-mono">
                        <div className="p-1.5 rounded bg-surface-sidebar border border-border-default/50">
                          <span className="text-text-muted block text-[8px]">Ventas Mes</span>
                          <span className="font-bold text-text-heading">$4,850.00</span>
                        </div>
                        <div className="p-1.5 rounded bg-surface-sidebar border border-border-default/50">
                          <span className="text-text-muted block text-[8px]">Facturas</span>
                          <span className="font-bold text-success-text">142 Ok</span>
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-surface-sidebar text-[9px] text-text-secondary flex justify-between">
                        <span>Último XML autorizado:</span>
                        <span className="font-mono text-text-heading font-semibold">FAC-0084</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 rounded bg-primary-light text-primary border border-primary-muted">
                      <Laptop size={14} />
                    </div>
                    <h4 className="text-xs font-bold text-text-heading">PC & Laptops</h4>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Control administrativo completo, reportes tributarios, subida de firmas .p12 y gestión de inventario multibodega.
                  </p>
                </div>
              </div>

              {/* DISPOSITIVO 2: PUNTO DE VENTA (POS) / TABLET */}
              <div className="rounded-lg border border-border-default bg-surface-sidebar/40 p-4 flex flex-col justify-between hover:border-border-strong transition-colors">
                <div>
                  {/* Tablet / POS Mockup Window */}
                  <div className="rounded-md border border-border-default bg-white overflow-hidden shadow-xs mb-4">
                    <div className="bg-surface-sidebar border-b border-border-default px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-[9px] font-semibold text-text-heading">Terminal POS 01</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1">Caja Abierta</Badge>
                    </div>
                    <div className="p-3 space-y-2 text-[10px]">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="p-1.5 rounded bg-surface-sidebar border border-border-default text-center">
                          <span className="block font-semibold text-text-heading truncate">Café Espresso</span>
                          <span className="font-mono text-text-secondary text-[9px]">$1.75</span>
                        </div>
                        <div className="p-1.5 rounded bg-surface-sidebar border border-border-default text-center">
                          <span className="block font-semibold text-text-heading truncate">Combo Lunch</span>
                          <span className="font-mono text-text-secondary text-[9px]">$6.50</span>
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-surface-sidebar border border-border-default/60 flex justify-between items-center">
                        <span className="font-semibold text-text-heading">Total Ticket:</span>
                        <span className="font-mono font-bold text-primary">$8.25</span>
                      </div>
                      <div className="bg-text-heading text-white text-[9px] font-semibold py-1 rounded text-center">
                        Cobro Rápido (F12)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 rounded bg-primary-light text-primary border border-primary-muted">
                      <Store size={14} />
                    </div>
                    <h4 className="text-xs font-bold text-text-heading">Puntos de Venta & Tablets</h4>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Atención ágil en mostrador con pantalla táctil, pistolas lectoras de barras, tickets térmicos y cobro en 5 segundos.
                  </p>
                </div>
              </div>

              {/* DISPOSITIVO 3: MÓVIL / SMARTPHONE */}
              <div className="rounded-lg border border-border-default bg-surface-sidebar/40 p-4 flex flex-col justify-between hover:border-border-strong transition-colors">
                <div>
                  {/* Smartphone Mockup */}
                  <div className="max-w-[160px] mx-auto rounded-xl border border-border-default bg-white overflow-hidden shadow-xs mb-4">
                    <div className="bg-surface-sidebar border-b border-border-default px-3 py-1 flex items-center justify-between text-[8px] font-mono text-text-muted">
                      <span>9:41</span>
                      <div className="w-8 h-1 bg-border-strong rounded-full"></div>
                      <span>5G</span>
                    </div>
                    <div className="p-2.5 space-y-1.5 text-[9px]">
                      <div className="p-1.5 rounded bg-surface-sidebar border border-border-default text-center">
                        <span className="text-[8px] text-text-muted block">Ventas de Hoy</span>
                        <span className="font-mono font-bold text-success-text text-[11px]">+$1,340.00</span>
                      </div>
                      <div className="p-1.5 rounded bg-surface-sidebar text-[8px] text-text-secondary space-y-0.5">
                        <div className="flex justify-between font-semibold text-text-heading">
                          <span>FAC-0091</span>
                          <span>$45.00</span>
                        </div>
                        <span className="text-success-text block font-medium">✓ Enviada al SRI</span>
                      </div>
                      <div className="bg-primary text-white text-[8px] font-semibold py-1 rounded text-center">
                        + Nueva Factura
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 rounded bg-primary-light text-primary border border-primary-muted">
                      <Smartphone size={14} />
                    </div>
                    <h4 className="text-xs font-bold text-text-heading">Smartphones & Celulares</h4>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Supervisa tu negocio desde cualquier lugar: emite comprobantes en ruta, consulta existencias y revisa tu dinero en tiempo real.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Sync Banner */}
            <div className="mt-6 pt-5 border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <RefreshCw size={13} className="text-primary" />
                <span className="font-medium text-text-primary">
                  Sincronización bidireccional automática:
                </span>
                <span>Una venta en el POS descuenta el inventario en la PC y actualiza el saldo en tu celular al segundo.</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. PRICING PREVIEW */}
      <section className="py-20 border-b border-border-default bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8">
          
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-heading">
              Precios simples y transparentes.
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              Sin costos ocultos ni cobros por factura emitida. Comienza con 14 días gratis.
            </p>

            {/* Toggle Mensual / Anual */}
            <div className="inline-flex items-center p-1 rounded-md bg-surface-sidebar border border-border-default gap-1 mt-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-all cursor-pointer ${
                  billingCycle === 'monthly' ? 'bg-white text-text-heading font-semibold shadow-none' : 'text-text-secondary'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-all cursor-pointer flex items-center gap-1 ${
                  billingCycle === 'yearly' ? 'bg-white text-text-heading font-semibold shadow-none' : 'text-text-secondary'
                }`}
              >
                <span>Anual</span>
                <span className="text-[10px] text-success-text bg-success-light px-1 rounded font-mono">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
            
            {/* Plan Starter */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-text-heading">Emprendedor</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Para negocios que inician con el SRI</p>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-bold font-mono text-text-heading">
                    ${billingCycle === 'monthly' ? '15' : '12'}
                  </span>
                  <span className="text-xs text-text-muted"> / mes</span>
                </div>
                <ul className="space-y-2 text-xs text-text-secondary">
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Facturas SRI Ilimitadas</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Punto de Venta (POS)</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Directorio de Clientes</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> 1 Usuario</li>
                </ul>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/register')}
                className="w-full mt-6 text-xs"
              >
                Probar Gratis
              </Button>
            </Card>

            {/* Plan Profesional (Destacado) */}
            <Card className="p-5 flex flex-col justify-between border-text-heading ring-1 ring-text-heading relative">
              <Badge variant="default" className="absolute -top-2.5 right-4 text-[10px] normal-case py-0.5 px-2 font-normal">
                Más Popular
              </Badge>
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-text-heading">Negocio Pro</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Para comercios con inventario y POS</p>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-bold font-mono text-text-heading">
                    ${billingCycle === 'monthly' ? '29' : '23'}
                  </span>
                  <span className="text-xs text-text-muted"> / mes</span>
                </div>
                <ul className="space-y-2 text-xs text-text-secondary">
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Todo lo de Emprendedor</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Inventario & Kardex Multibodega</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Control de Cuentas por Cobrar (CxC)</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Hasta 3 Usuarios y Cajeros</li>
                </ul>
              </div>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate('/register')}
                className="w-full mt-6 text-xs"
              >
                Comenzar con Pro
              </Button>
            </Card>

            {/* Plan Empresa */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-text-heading">Empresarial</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Para empresas con gestión completa</p>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-bold font-mono text-text-heading">
                    ${billingCycle === 'monthly' ? '59' : '47'}
                  </span>
                  <span className="text-xs text-text-muted"> / mes</span>
                </div>
                <ul className="space-y-2 text-xs text-text-secondary">
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Todo lo de Negocio Pro</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Captura OCR con IA ilimitada</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Contabilidad & Asientos Automáticos</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-[#00E4B8]" /> Usuarios y Cajeros Ilimitados</li>
                </ul>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/register')}
                className="w-full mt-6 text-xs"
              >
                Probar Empresarial
              </Button>
            </Card>

          </div>

        </div>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section className="py-20 border-b border-border-default bg-surface-sidebar/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-left">
          
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-heading">
              Preguntas Frecuentes
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              Todo lo que necesitas saber para comenzar hoy mismo.
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className="rounded-md border border-border-default bg-white overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-4 text-xs font-semibold text-text-heading hover:bg-surface-sidebar/50 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={14} className={`shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3.5 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border-default/50 animate-in fade-in duration-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION (Minimalist High-Contrast Banner) */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="rounded-lg border border-border-default bg-surface-sidebar p-8 sm:p-12 space-y-5">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-text-heading">
              Comienza a facturar y controlar tu negocio hoy.
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
              Únete a cientos de emprendedores ecuatorianos que ya modernizaron su gestión tributaria y comercial con WebFix.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button 
                size="lg" 
                variant="default"
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto text-xs px-6 h-10 gap-2 shadow-sm"
              >
                <span>Crear Cuenta Gratis</span>
                <ArrowRight size={13} />
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate('/contacto')}
                className="w-full sm:w-auto text-xs px-5 h-10"
              >
                Hablar con un Asesor
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
