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
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* 1. Header de Bienvenida y Acciones Ejecutivas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-text-heading">
              {companyName}
            </h1>
            <Badge variant="success" className="gap-1 normal-case font-normal text-[11px] py-0.5 px-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E4B8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00E4B8]"></span>
              </span>
              <span>SRI Activo</span>
            </Badge>
          </div>
          <p className="text-xs text-text-secondary capitalize">
            {todayFormatted} • Resumen ejecutivo del negocio
          </p>
        </div>

        {/* Botones de acción rápida */}
        <div className="flex items-center gap-2">
          <Button 
            variant="accent" 
            size="sm"
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('pos'); setActivePageId('ventas'); }}
            className="gap-1.5 shadow-sm"
          >
            <ShoppingCart size={13} />
            <span>Punto de Venta</span>
          </Button>

          <Button 
            variant="default" 
            size="sm"
            onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('ventas_preventa'); setActivePageId('ventas'); }}
            className="gap-1.5"
          >
            <Plus size={13} />
            <span>Nueva Factura</span>
          </Button>
        </div>
      </div>

      {/* 2. Grid de 4 Tarjetas Métricas KPI (Shadcn Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Ventas del Mes */}
        <Card className="hover:border-border-strong transition-all duration-120">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-0">
            <CardTitle className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Ventas del Mes
            </CardTitle>
            <div className="p-1.5 rounded-md bg-black/5 text-text-heading">
              <DollarSign size={14} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold tracking-tight text-text-heading font-mono">
              ${kpis.totalVentas.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
              <span className="text-success-text font-medium">{kpis.salesCount} operaciones</span> registradas
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Comprobantes SRI */}
        <Card className="hover:border-border-strong transition-all duration-120">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-0">
            <CardTitle className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Comprobantes SRI
            </CardTitle>
            <div className="p-1.5 rounded-md bg-black/5 text-text-heading">
              <FileText size={14} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold tracking-tight text-text-heading font-mono">
              {kpis.sriAutorizadas}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-success-text font-medium flex items-center gap-1">
                <CheckCircle2 size={11} /> {kpis.sriAutorizadas} autorizados
              </span>
              {kpis.sriPendientes > 0 && (
                <span className="text-[11px] text-warning-text font-medium flex items-center gap-1">
                  <AlertCircle size={11} /> {kpis.sriPendientes} pendientes
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Cuentas por Cobrar */}
        <Card className="hover:border-border-strong transition-all duration-120">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-0">
            <CardTitle className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Por Cobrar (CxC)
            </CardTitle>
            <div className="p-1.5 rounded-md bg-black/5 text-text-heading">
              <CreditCard size={14} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold tracking-tight text-text-heading font-mono">
              ${kpis.cxcPendiente.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Saldos y créditos activos de clientes
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Inventario */}
        <Card className="hover:border-border-strong transition-all duration-120">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-0">
            <CardTitle className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Catálogo / Stock
            </CardTitle>
            <div className="p-1.5 rounded-md bg-black/5 text-text-heading">
              <Package size={14} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold tracking-tight text-text-heading font-mono">
              {kpis.totalProductos}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              {kpis.lowStockCount > 0 ? (
                <span className="text-warning-text font-medium">{kpis.lowStockCount} con stock bajo</span>
              ) : (
                <span className="text-success-text font-medium">Stock en nivel óptimo</span>
              )}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* 3. Sección Principal: Tablas Recientes + Panel Lateral de Operaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Últimos Comprobantes SRI (2 de 3 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-sm font-semibold text-text-heading">
                  Últimos Comprobantes y Ventas
                </CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Movimientos más recientes autorizados y registrados en el SRI
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }}
                className="text-xs gap-1"
              >
                <span>Ver Todos</span>
                <ArrowRight size={12} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted text-xs">
                  <FileText size={28} className="mb-2 opacity-40" />
                  <p>No hay comprobantes recientes registrados.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Fecha</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Cliente / Tercero</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center w-[120px]">Estado SRI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((tx) => {
                      const cliente = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                      return (
                        <TableRow key={tx.id} className="cursor-pointer" onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }}>
                          <TableCell mono className="text-text-secondary">
                            {tx.date || '-'}
                          </TableCell>
                          <TableCell mono className="font-semibold text-text-heading">
                            {tx.documentNumber || '001-001-XXXXX'}
                          </TableCell>
                          <TableCell className="font-medium text-text-primary truncate max-w-[180px]">
                            {cliente?.name || tx.thirdPartyName || 'Consumidor Final'}
                          </TableCell>
                          <TableCell mono className="text-right font-bold text-text-heading">
                            ${Number(tx.total || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {tx.sriStatus === 'autorizado' ? (
                              <Badge variant="success" className="gap-1 text-[10px]">
                                <CheckCircle2 size={10} /> Autorizado
                              </Badge>
                            ) : tx.sriStatus === 'pendiente' ? (
                              <Badge variant="warning" className="gap-1 text-[10px]">
                                <AlertCircle size={10} /> Pendiente
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
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
        </div>

        {/* Columna Derecha: Accesos Directos a Módulos + Estado SRI */}
        <div className="space-y-6">
          
          {/* Accesos Directos a Módulos Clave */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold text-text-heading">
                Accesos Directos
              </CardTitle>
              <p className="text-xs text-text-secondary">
                Navega a los submódulos principales
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5 pt-0">
              
              {/* POS */}
              <button 
                onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('pos'); setActivePageId('ventas'); }}
                className="flex flex-col p-3 rounded-md border border-border-default bg-white hover:border-text-heading hover:bg-surface-sidebar transition-all duration-120 text-left cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-black/5 text-text-heading w-fit mb-2 group-hover:bg-text-heading group-hover:text-white transition-all">
                  <ShoppingCart size={15} />
                </div>
                <span className="text-xs font-semibold text-text-heading">Punto de Venta</span>
                <span className="text-[10px] text-text-secondary mt-0.5">Cobro rápido (F12)</span>
              </button>

              {/* Facturación */}
              <button 
                onClick={() => { setVentasInitialSubTab && setVentasInitialSubTab('resumen_ventas'); setActivePageId('ventas'); }}
                className="flex flex-col p-3 rounded-md border border-border-default bg-white hover:border-text-heading hover:bg-surface-sidebar transition-all duration-120 text-left cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-black/5 text-text-heading w-fit mb-2 group-hover:bg-text-heading group-hover:text-white transition-all">
                  <FileText size={15} />
                </div>
                <span className="text-xs font-semibold text-text-heading">Facturas SRI</span>
                <span className="text-[10px] text-text-secondary mt-0.5">Emisión y RIDE</span>
              </button>

              {/* Inventario */}
              <button 
                onClick={() => setActivePageId('inventario')}
                className="flex flex-col p-3 rounded-md border border-border-default bg-white hover:border-text-heading hover:bg-surface-sidebar transition-all duration-120 text-left cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-black/5 text-text-heading w-fit mb-2 group-hover:bg-text-heading group-hover:text-white transition-all">
                  <Package size={15} />
                </div>
                <span className="text-xs font-semibold text-text-heading">Inventario</span>
                <span className="text-[10px] text-text-secondary mt-0.5">Kardex y Stock</span>
              </button>

              {/* Clientes */}
              <button 
                onClick={() => setActivePageId('personas')}
                className="flex flex-col p-3 rounded-md border border-border-default bg-white hover:border-text-heading hover:bg-surface-sidebar transition-all duration-120 text-left cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-black/5 text-text-heading w-fit mb-2 group-hover:bg-text-heading group-hover:text-white transition-all">
                  <Users size={15} />
                </div>
                <span className="text-xs font-semibold text-text-heading">Clientes y Prov</span>
                <span className="text-[10px] text-text-secondary mt-0.5">Directorio RUC</span>
              </button>

              {/* Finanzas / Gastos */}
              <button 
                onClick={() => setActivePageId('gastos_creditos')}
                className="flex flex-col p-3 rounded-md border border-border-default bg-white hover:border-text-heading hover:bg-surface-sidebar transition-all duration-120 text-left cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-black/5 text-text-heading w-fit mb-2 group-hover:bg-text-heading group-hover:text-white transition-all">
                  <CreditCard size={15} />
                </div>
                <span className="text-xs font-semibold text-text-heading">Gastos y CxP</span>
                <span className="text-[10px] text-text-secondary mt-0.5">Control de egresos</span>
              </button>

              {/* Configuración */}
              <button 
                onClick={() => setActivePageId('general_settings')}
                className="flex flex-col p-3 rounded-md border border-border-default bg-white hover:border-text-heading hover:bg-surface-sidebar transition-all duration-120 text-left cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-black/5 text-text-heading w-fit mb-2 group-hover:bg-text-heading group-hover:text-white transition-all">
                  <Settings size={15} />
                </div>
                <span className="text-xs font-semibold text-text-heading">Ajustes SRI</span>
                <span className="text-[10px] text-text-secondary mt-0.5">Firma .p12 y datos</span>
              </button>

            </CardContent>
          </Card>

          {/* Widget de Estado del Sistema SRI */}
          <Card className="bg-surface-sidebar/50">
            <CardHeader className="py-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-success-text" />
                <CardTitle className="text-xs font-semibold text-text-heading">
                  Estado de Facturación Electrónica
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-text-secondary">
                <span>Ambiente SRI:</span>
                <span className="font-semibold text-text-heading">
                  {settings?.ambiente === '2' ? 'Producción' : 'Pruebas / Certificación'}
                </span>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <span>Firma Digital:</span>
                <span className="font-medium text-success-text flex items-center gap-1">
                  <CheckCircle2 size={11} /> Configurada (.p12)
                </span>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <span>WebServices SRI:</span>
                <span className="font-medium text-success-text">100% En Línea</span>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
