import { UiBox, UiHeading, UiText } from '../ui/layout';
import { UiButton } from '../ui/controls';
import { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, FileText, Package, Users, Settings, 
  ShieldCheck, CheckCircle2, AlertCircle, 
  DollarSign, CreditCard, Plus, ArrowRight
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell 
} from '../ui/table';

export default function ErpDashboard({ 
  setActivePageId, 
  setVentasInitialSubTab, 
  transactions = [], 
  thirdParties = [], 
  products = [], 
  companyProfile = null,
  db, 
  appId 
}) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!appId || !db) return;

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');

    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setSettings(snap.data());
      }
    }, (err) => {
      console.error("Error loading settings in ERP Dashboard:", err);
    });

    return () => {
      unsubSettings();
    };
  }, [appId, db]);

  const companyName = companyProfile?.nombreComercial || companyProfile?.razonSocial || settings?.nombreComercial || settings?.razonSocial || 'Mi Empresa';

  // Cálculos de KPIs del Mes
  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthTx = transactions.filter(t => (t.date || '').startsWith(currentMonth));
    const salesTx = monthTx.filter(t => t.type === 'ingreso');
    
    // Total ventas del mes
    const totalVentas = salesTx.reduce((acc, t) => acc + (Number(t.total) || 0), 0);

    // Facturas SRI autorizadas vs pendientes
    const sriAutorizadas = transactions.filter(t => t.sriStatus === 'autorizado' && t.documentType === 'factura').length;
    const sriPendientes = transactions.filter(t => t.sriStatus === 'pendiente' && t.documentType === 'factura').length;

    // Cuentas por Cobrar (ventas a crédito o pendientes de cobro)
    const cxcPendiente = transactions
      .filter(t => t.type === 'ingreso' && (t.paymentStatus === 'pendiente' || t.paymentMethod === 'credito'))
      .reduce((acc, t) => acc + (Number(t.total) || 0), 0);

    // Inventario
    const totalProductos = products.length;
    const lowStockCount = products.filter(p => Number(p.stock || 0) <= Number(p.minStock || 5)).length;

    return {
      totalVentas,
      salesCount: salesTx.length,
      sriAutorizadas,
      sriPendientes,
      cxcPendiente,
      totalProductos,
      lowStockCount
    };
  }, [transactions, products]);

  // Últimas 5 transacciones recientes
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);
  }, [transactions]);

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('es-EC', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }).format(new Date());
  }, []);

  return (
    <UiBox {...{"className":"w-full space-y-6 animate-in fade-in duration-300 pb-12"}}>
      
      {/* 1. Header de Bienvenida y Acciones Ejecutivas */}
      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5"}}>
        <UiBox>
          <UiBox {...{"className":"flex items-center gap-2 mb-1"}}>
            <UiHeading as="h1" {...{"size":"5","weight":"bold","color":"gray","highContrast":true}}>
              {companyName}
            </UiHeading>
            <Badge variant="success" {...{"className":"gap-1 py-0.5 px-2"}}>
              <UiText {...{"className":"relative flex h-1.5 w-1.5"}}>
                <UiText {...{"className":"animate-ping absolute inline-flex h-full w-full opacity-75"}}></UiText>
                <UiText {...{"className":"relative inline-flex h-1.5 w-1.5"}}></UiText>
              </UiText>
              <UiText>SRI Activo</UiText>
            </Badge>
          </UiBox>
          <UiText as="p" {...{"size":"1","color":"gray"}}>
            {todayFormatted} • Resumen ejecutivo del negocio
          </UiText>
        </UiBox>

        {/* Botones de acción rápida */}
        <UiBox {...{"className":"flex items-center gap-2"}}>
          <Button 
            variant="accent" 
            size="sm"
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('pos'); setActivePageId('ventas'); }}
            {...{"className":"gap-1.5"}}
          >
            <ShoppingCart size={13} />
            <UiText>Punto de Venta</UiText>
          </Button>

          <Button 
            variant="default" 
            size="sm"
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('ventas_preventa'); setActivePageId('ventas'); }}
            {...{"className":"gap-1.5"}}
          >
            <Plus size={13} />
            <UiText>Nueva Factura</UiText>
          </Button>
        </UiBox>
      </UiBox>

      {/* 2. Grid de 4 Tarjetas Métricas KPI (Shadcn Cards) */}
      <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"}}>
        
        {/* KPI 1: Ventas del Mes */}
        <Card {...{"className":"duration-120"}}>
          <CardHeader {...{"className":"flex flex-row items-center justify-between pb-2"}}>
            <CardTitle {...{"style":{"color":"var(--gray-11)"}}}>
              Ventas del Mes
            </CardTitle>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5"}}>
              <DollarSign size={14} />
            </UiBox>
          </CardHeader>
          <CardContent {...{"className":"pt-0"}}>
            <UiBox {...{"style":{"color":"var(--gray-12)","fontFamily":"var(--code-font-family)"}}}>
              ${kpis.totalVentas.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </UiBox>
            <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1 flex items-center gap-1"}}>
              <UiText {...{"color":"green","weight":"medium"}}>{kpis.salesCount} operaciones</UiText> registradas
            </UiText>
          </CardContent>
        </Card>

        {/* KPI 2: Comprobantes SRI */}
        <Card {...{"className":"duration-120"}}>
          <CardHeader {...{"className":"flex flex-row items-center justify-between pb-2"}}>
            <CardTitle {...{"style":{"color":"var(--gray-11)"}}}>
              Comprobantes SRI
            </CardTitle>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5"}}>
              <FileText size={14} />
            </UiBox>
          </CardHeader>
          <CardContent {...{"className":"pt-0"}}>
            <UiBox {...{"style":{"color":"var(--gray-12)","fontFamily":"var(--code-font-family)"}}}>
              {kpis.sriAutorizadas}
            </UiBox>
            <UiBox {...{"className":"flex items-center gap-2 mt-1"}}>
              <UiText {...{"size":"1","color":"green","weight":"medium","className":"flex items-center gap-1"}}>
                <CheckCircle2 size={11} /> {kpis.sriAutorizadas} autorizados
              </UiText>
              {kpis.sriPendientes > 0 && (
                <UiText {...{"size":"1","color":"amber","weight":"medium","className":"flex items-center gap-1"}}>
                  <AlertCircle size={11} /> {kpis.sriPendientes} pendientes
                </UiText>
              )}
            </UiBox>
          </CardContent>
        </Card>

        {/* KPI 3: Cuentas por Cobrar */}
        <Card {...{"className":"duration-120"}}>
          <CardHeader {...{"className":"flex flex-row items-center justify-between pb-2"}}>
            <CardTitle {...{"style":{"color":"var(--gray-11)"}}}>
              Por Cobrar (CxC)
            </CardTitle>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5"}}>
              <CreditCard size={14} />
            </UiBox>
          </CardHeader>
          <CardContent {...{"className":"pt-0"}}>
            <UiBox {...{"style":{"color":"var(--gray-12)","fontFamily":"var(--code-font-family)"}}}>
              ${kpis.cxcPendiente.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </UiBox>
            <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>
              Saldos y créditos activos de clientes
            </UiText>
          </CardContent>
        </Card>

        {/* KPI 4: Inventario */}
        <Card {...{"className":"duration-120"}}>
          <CardHeader {...{"className":"flex flex-row items-center justify-between pb-2"}}>
            <CardTitle {...{"style":{"color":"var(--gray-11)"}}}>
              Catálogo / Stock
            </CardTitle>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5"}}>
              <Package size={14} />
            </UiBox>
          </CardHeader>
          <CardContent {...{"className":"pt-0"}}>
            <UiBox {...{"style":{"color":"var(--gray-12)","fontFamily":"var(--code-font-family)"}}}>
              {kpis.totalProductos}
            </UiBox>
            <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>
              {kpis.lowStockCount > 0 ? (
                <UiText {...{"color":"amber","weight":"medium"}}>{kpis.lowStockCount} con stock bajo</UiText>
              ) : (
                <UiText {...{"color":"green","weight":"medium"}}>Stock en nivel óptimo</UiText>
              )}
            </UiText>
          </CardContent>
        </Card>

      </UiBox>

      {/* 3. Sección Principal: Tablas Recientes + Panel Lateral de Operaciones */}
      <UiBox {...{"className":"grid grid-cols-1 lg:grid-cols-3 gap-6"}}>
        
        {/* Columna Izquierda: Últimos Comprobantes SRI (2 de 3 cols) */}
        <UiBox {...{"className":"lg:col-span-2 space-y-4"}}>
          <Card>
            <CardHeader {...{"className":"flex flex-row items-center justify-between py-4"}}>
              <UiBox>
                <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>
                  Últimos Comprobantes y Ventas
                </CardTitle>
                <UiText as="p" {...{"size":"1","color":"gray","className":"mt-0.5"}}>
                  Movimientos más recientes autorizados y registrados en el SRI
                </UiText>
              </UiBox>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }}
                {...{"size":"2","className":"gap-1"}}
              >
                <UiText>Ver Todos</UiText>
                <ArrowRight size={12} />
              </Button>
            </CardHeader>
            <CardContent {...{"className":"p-0"}}>
              {recentTransactions.length === 0 ? (
                <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex flex-col items-center justify-center py-12 text-center"}}>
                  <FileText size={28} {...{"className":"mb-2 opacity-40"}} />
                  <UiText as="p">No hay comprobantes recientes registrados.</UiText>
                </UiBox>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead {...{"className":"w-[100px]"}}>Fecha</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Cliente / Tercero</TableHead>
                      <TableHead {...{"className":"text-right"}}>Total</TableHead>
                      <TableHead {...{"className":"text-center w-[120px]"}}>Estado SRI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((tx) => {
                      const cliente = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                      return (
                        <TableRow key={tx.id} {...{"className":"cursor-pointer"}} onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }}>
                          <TableCell mono {...{"style":{"color":"var(--gray-11)"}}}>
                            {tx.date || '-'}
                          </TableCell>
                          <TableCell mono {...{"style":{"color":"var(--gray-12)"}}}>
                            {tx.documentNumber || '001-001-XXXXX'}
                          </TableCell>
                          <TableCell {...{"style":{"color":"var(--gray-12)"},"className":"truncate max-w-[180px]"}}>
                            {cliente?.name || tx.thirdPartyName || 'Consumidor Final'}
                          </TableCell>
                          <TableCell mono {...{"style":{"color":"var(--gray-12)"},"className":"text-right"}}>
                            ${Number(tx.total || 0).toFixed(2)}
                          </TableCell>
                          <TableCell {...{"className":"text-center"}}>
                            {tx.sriStatus === 'autorizado' ? (
                              <Badge variant="success" {...{"className":"gap-1"}}>
                                <CheckCircle2 size={10} /> Autorizado
                              </Badge>
                            ) : tx.sriStatus === 'pendiente' ? (
                              <Badge variant="warning" {...{"className":"gap-1"}}>
                                <AlertCircle size={10} /> Pendiente
                              </Badge>
                            ) : (
                              <Badge variant="outline" {...{}}>
                                {tx.sriStatus || 'Registrado'}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </UiBox>

        {/* Columna Derecha: Accesos Directos a Módulos + Estado SRI */}
        <UiBox {...{"className":"space-y-6"}}>
          
          {/* Accesos Directos a Módulos Clave */}
          <Card>
            <CardHeader {...{"className":"py-4"}}>
              <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>
                Accesos Directos
              </CardTitle>
              <UiText as="p" {...{"size":"1","color":"gray"}}>
                Navega a los submódulos principales
              </UiText>
            </CardHeader>
            <CardContent {...{"className":"grid grid-cols-2 gap-2.5 pt-0"}}>
              
              {/* POS */}
              <UiButton
                onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('pos'); setActivePageId('ventas'); }}
                {...{"variant":"surface","className":"flex flex-col duration-120 text-left cursor-pointer group"}}
              >
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5 w-fit mb-2"}}>
                  <ShoppingCart size={15} />
                </UiBox>
                <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Punto de Venta</UiText>
                <UiText {...{"size":"1","color":"gray","className":"mt-0.5"}}>Cobro rápido (F12)</UiText>
              </UiButton>

              {/* Facturación */}
              <UiButton
                onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }}
                {...{"variant":"surface","className":"flex flex-col duration-120 text-left cursor-pointer group"}}
              >
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5 w-fit mb-2"}}>
                  <FileText size={15} />
                </UiBox>
                <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Facturas SRI</UiText>
                <UiText {...{"size":"1","color":"gray","className":"mt-0.5"}}>Emisión y RIDE</UiText>
              </UiButton>

              {/* Inventario */}
              <UiButton
                onClick={() => setActivePageId('inventario')}
                {...{"variant":"surface","className":"flex flex-col duration-120 text-left cursor-pointer group"}}
              >
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5 w-fit mb-2"}}>
                  <Package size={15} />
                </UiBox>
                <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Inventario</UiText>
                <UiText {...{"size":"1","color":"gray","className":"mt-0.5"}}>Kardex y Stock</UiText>
              </UiButton>

              {/* Clientes */}
              <UiButton
                onClick={() => setActivePageId('personas')}
                {...{"variant":"surface","className":"flex flex-col duration-120 text-left cursor-pointer group"}}
              >
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5 w-fit mb-2"}}>
                  <Users size={15} />
                </UiBox>
                <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Clientes y Prov</UiText>
                <UiText {...{"size":"1","color":"gray","className":"mt-0.5"}}>Directorio RUC</UiText>
              </UiButton>

              {/* Finanzas / Gastos */}
              <UiButton
                onClick={() => setActivePageId('gastos_creditos')}
                {...{"variant":"surface","className":"flex flex-col duration-120 text-left cursor-pointer group"}}
              >
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5 w-fit mb-2"}}>
                  <CreditCard size={15} />
                </UiBox>
                <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Gastos y CxP</UiText>
                <UiText {...{"size":"1","color":"gray","className":"mt-0.5"}}>Control de egresos</UiText>
              </UiButton>

              {/* Configuración */}
              <UiButton
                onClick={() => setActivePageId('general_settings')}
                {...{"variant":"surface","className":"flex flex-col duration-120 text-left cursor-pointer group"}}
              >
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","color":"var(--gray-12)"},"className":"p-1.5 w-fit mb-2"}}>
                  <Settings size={15} />
                </UiBox>
                <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Ajustes SRI</UiText>
                <UiText {...{"size":"1","color":"gray","className":"mt-0.5"}}>Firma .p12 y datos</UiText>
              </UiButton>

            </CardContent>
          </Card>

          {/* Widget de Estado del Sistema SRI */}
          <Card {...{"style":{"backgroundColor":"var(--color-panel-solid)"}}}>
            <CardHeader {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"py-3"}}>
              <UiBox {...{"className":"flex items-center gap-2"}}>
                <ShieldCheck size={16} {...{"style":{"color":"var(--green-12)"}}} />
                <CardTitle {...{"style":{"color":"var(--gray-12)"}}}>
                  Estado de Facturación Electrónica
                </CardTitle>
              </UiBox>
            </CardHeader>
            <CardContent {...{"className":"pt-3 space-y-2"}}>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center justify-between"}}>
                <UiText>Ambiente SRI:</UiText>
                <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>
                  {settings?.ambiente === '2' ? 'Producción' : 'Pruebas / Certificación'}
                </UiText>
              </UiBox>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center justify-between"}}>
                <UiText>Firma Digital:</UiText>
                <UiText {...{"weight":"medium","color":"green","className":"flex items-center gap-1"}}>
                  <CheckCircle2 size={11} /> Configurada (.p12)
                </UiText>
              </UiBox>
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex items-center justify-between"}}>
                <UiText>WebServices SRI:</UiText>
                <UiText {...{"weight":"medium","color":"green"}}>100% En Línea</UiText>
              </UiBox>
            </CardContent>
          </Card>

        </UiBox>

      </UiBox>

    </UiBox>
  );
}
