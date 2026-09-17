import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiHeading } from '../ui/layout';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, ShoppingCart, Package, Clock, ArrowUpRight, 
  Activity, Tag
} from 'lucide-react';
import { collection, query, where, onSnapshot } from '../../services/financeStore.js';
import { getEcuadorDateString } from '../../services/sriService';

export default function SalesDashboard({ transactions, db, appId }) {
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Cargar sesión de caja activa
  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_cash_sessions');
    const q = query(colRef, where('status', '==', 'abierta'));
    
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setActiveSession({ id: d.id, ...d.data() });
      } else {
        setActiveSession(null);
      }
      setSessionLoading(false);
    });
    return unsub;
  }, [appId, db]);

  // Cálculos de fechas
  const todayStr = getEcuadorDateString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Filtrar transacciones que corresponden a Facturas de Venta
  const salesTransactions = transactions.filter(t => t.type === 'ingreso' && t.documentType === 'factura');

  // Ventas de Hoy
  const todaySales = salesTransactions.filter(t => t.date === todayStr);
  const todaySalesTotal = todaySales.reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  const todaySalesCount = todaySales.length;

  // Ventas Mensuales (Mes en curso)
  const monthlySales = salesTransactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlySalesTotal = monthlySales.reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  const monthlySalesCount = monthlySales.length;

  // Ticket Promedio Mensual
  const averageTicket = monthlySalesCount > 0 ? (monthlySalesTotal / monthlySalesCount) : 0;

  // Unidades de Artículos Vendidos en el mes
  let totalItemsSold = 0;
  monthlySales.forEach(t => {
    if (t.items && Array.isArray(t.items)) {
      t.items.forEach(item => {
        totalItemsSold += (Number(item.quantity) || 0);
      });
    }
  });

  // Ventas por Método de Pago (Mes)
  const paymentMethods = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    cruce_cuentas: 0
  };

  monthlySales.forEach(t => {
    const method = t.paymentMethod || 'transferencia';
    if (paymentMethods[method] !== undefined) {
      paymentMethods[method] += (Number(t.total) || 0);
    } else {
      paymentMethods.transferencia += (Number(t.total) || 0);
    }
  });

  const totalPaymentSum = Object.values(paymentMethods).reduce((acc, v) => acc + v, 0) || 1;

  // Productos más Vendidos (Top 5 del mes)
  const productSales = {};
  monthlySales.forEach(t => {
    if (t.items && Array.isArray(t.items)) {
      t.items.forEach(item => {
        const key = item.productId || item.name;
        if (!productSales[key]) {
          productSales[key] = {
            name: item.name,
            quantity: 0,
            total: 0
          };
        }
        productSales[key].quantity += (Number(item.quantity) || 0);
        productSales[key].total += (Number(item.price) * Number(item.quantity) || 0);
      });
    }
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const maxProductQty = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.quantity)) : 1;

  // Clases CSS premium
  

  

  return (
    <UiBox {...{"className":"space-y-6 animate-in slide-in-from-bottom-4 duration-500"}}>
      
      {/* SECCION ALERTA DE SESIÓN DE CAJA */}
      {!sessionLoading && (
        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"}, {}, (activeSession ? {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-12)"}} : {"style":{"backgroundColor":"var(--orange-3)","color":"var(--orange-12)"}}))}>
          <UiBox {...{"className":"flex items-center gap-3"}}>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-2 shrink-0"}, {}, (activeSession ? {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-12)"}} : {"style":{"backgroundColor":"var(--orange-3)","color":"var(--orange-12)"}}))}>
              <Clock size={16} />
            </UiBox>
            <UiBox>
              <UiText as="p" {...{"size":"1","weight":"regular"}}>
                {activeSession 
                  ? `Caja POS Abierta - Sucursal: ${activeSession.branch}` 
                  : "Caja POS Cerrada o Inactiva"}
              </UiText>
              <UiText as="p" {...mergeThemeProps({"size":"1","className":"mt-0.5"}, {}, {"color":"gray"})}>
                {activeSession 
                  ? `Responsable: ${activeSession.responsible} | Turno: ${activeSession.shift} | Fondo: $${activeSession.initialAmount.toFixed(2)}`
                  : "Es necesario abrir la caja registradora en el Punto de Venta (POS) para poder realizar ventas físicas."}
              </UiText>
            </UiBox>
          </UiBox>
          <UiBox {...{"className":"shrink-0 flex items-center gap-2"}}>
            <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"px-2 py-0.5"}, {}, (activeSession ? {"color":"green"} : {"color":"orange"}))}>
              {activeSession ? 'Activa' : 'Requerida'}
            </UiText>
          </UiBox>
        </UiBox>
      )}

      {/* METRICAS DE VENTAS */}
      <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"}}>
        
        {/* VENTAS DE HOY */}
        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
          <UiBox {...{"className":"flex items-center justify-between mb-3"}}>
            <UiText {...mergeThemeProps({"size":"1","weight":"bold"}, {}, {"color":"gray"})}>Ventas de Hoy</UiText>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-1.5"}, {}, {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-12)"}})}>
              <ShoppingCart size={14} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold"}}>${todaySalesTotal.toFixed(2)}</UiText>
          <UiBox {...{"className":"flex items-center gap-1 mt-1"}}>
            <UiText {...{"weight":"bold","color":"green","className":"flex items-center"}}><ArrowUpRight size={10} /> {todaySalesCount}</UiText>
            <UiText {...{"color":"gray","weight":"bold"}}>transacciones concretadas</UiText>
          </UiBox>
        </UiBox>

        {/* VENTAS DEL MES */}
        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
          <UiBox {...{"className":"flex items-center justify-between mb-3"}}>
            <UiText {...mergeThemeProps({"size":"1","weight":"bold"}, {}, {"color":"gray"})}>Ventas del Mes</UiText>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-1.5"}, {}, {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-12)"}})}>
              <TrendingUp size={14} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold","color":"green"}}>${monthlySalesTotal.toFixed(2)}</UiText>
          <UiBox {...{"className":"flex items-center gap-1 mt-1"}}>
            <UiText {...{"weight":"bold","color":"green","className":"flex items-center"}}><ArrowUpRight size={10} /> {monthlySalesCount}</UiText>
            <UiText {...{"color":"gray","weight":"bold"}}>facturas de venta</UiText>
          </UiBox>
        </UiBox>

        {/* TICKET PROMEDIO */}
        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
          <UiBox {...{"className":"flex items-center justify-between mb-3"}}>
            <UiText {...mergeThemeProps({"size":"1","weight":"bold"}, {}, {"color":"gray"})}>Ticket Promedio</UiText>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-1.5"}, {}, {"style":{"backgroundColor":"var(--purple-3)","color":"var(--purple-12)"}})}>
              <DollarSign size={14} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold"}}>${averageTicket.toFixed(2)}</UiText>
          <UiBox {...{"className":"flex items-center gap-1 mt-1"}}>
            <UiText {...{"color":"gray","weight":"bold"}}>Valor medio por compra</UiText>
          </UiBox>
        </UiBox>

        {/* UNIDADES VENDIDAS */}
        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
          <UiBox {...{"className":"flex items-center justify-between mb-3"}}>
            <UiText {...mergeThemeProps({"size":"1","weight":"bold"}, {}, {"color":"gray"})}>Artículos Vendidos</UiText>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-1.5"}, {}, {"style":{"backgroundColor":"var(--orange-3)","color":"var(--orange-12)"}})}>
              <Package size={14} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold"}}>{totalItemsSold} ud.</UiText>
          <UiBox {...{"className":"flex items-center gap-1 mt-1"}}>
            <UiText {...{"color":"gray","weight":"bold"}}>Productos y servicios entregados</UiText>
          </UiBox>
        </UiBox>

      </UiBox>

      {/* DETALLES ANALITICOS */}
      <UiBox {...{"className":"grid grid-cols-1 lg:grid-cols-5 gap-6"}}>
        
        {/* MÉTODOS DE PAGO */}
        <UiBox {...mergeThemeProps({}, {"className":"lg:col-span-2 space-y-4"}, mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}}))}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 pb-2"}}>
            <Activity size={15} {...{"style":{"color":"var(--blue-12)"}}} />
            <UiHeading as="h3" {...{"size":"1","weight":"bold"}}>Desglose de Métodos de Pago</UiHeading>
          </UiBox>

          <UiBox {...{"className":"space-y-4"}}>
            {[
              { key: 'efectivo', label: 'Efectivo en Caja', color: {"style":{"backgroundColor":"var(--green-9)"}} },
              { key: 'tarjeta', label: 'Tarjetas Débito/Crédito', color: {"style":{"backgroundColor":"var(--blue-9)"}} },
              { key: 'transferencia', label: 'Transferencia Bancaria', color: {"style":{"backgroundColor":"var(--purple-9)"}} },
              { key: 'cruce_cuentas', label: 'Cruce de Cuentas', color: {"style":{"backgroundColor":"var(--gray-3)"}} }
            ].map(m => {
              const value = paymentMethods[m.key] || 0;
              const pct = (value / totalPaymentSum) * 100;
              return (
                <UiBox key={m.key} {...{"className":"space-y-1"}}>
                  <UiBox {...{"className":"flex justify-between items-center"}}>
                    <UiText {...mergeThemeProps({"weight":"bold"}, {}, {"color":"gray"})}>{m.label}</UiText>
                    <UiText {...{"weight":"bold"}}>${value.toFixed(2)} ({pct.toFixed(0)}%)</UiText>
                  </UiBox>
                  <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"w-full h-2 overflow-hidden"}, {}, {"style":{"backgroundColor":"var(--gray-2)"}})}>
                    <UiBox {...mergeThemeProps({"className":"h-full"}, {}, resolveThemeProps(m.color))} style={{ width: `${pct}%` }}></UiBox>
                  </UiBox>
                </UiBox>
              );
            })}
          </UiBox>
        </UiBox>

        {/* TOP PRODUCTOS MÁS VENDIDOS */}
        <UiBox {...mergeThemeProps({}, {"className":"lg:col-span-3 space-y-4"}, mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}}))}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 pb-2"}}>
            <Tag size={15} {...{"style":{"color":"var(--orange-11)"}}} />
            <UiHeading as="h3" {...{"size":"1","weight":"bold"}}>Productos Más Vendidos (Mes)</UiHeading>
          </UiBox>

          <UiBox {...{"className":"space-y-3.5"}}>
            {topProducts.map((p, idx) => {
              const pct = (p.quantity / maxProductQty) * 100;
              return (
                <UiBox key={idx} {...{"className":"flex items-center gap-3"}}>
                  <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"w-5 h-5 flex items-center justify-center shrink-0"}, {}, (idx === 0 ? {"color":"amber"} : {"color":"gray"}))}>
                    {idx + 1}
                  </UiText>
                  
                  <UiBox {...{"className":"flex-1 min-w-0 space-y-1"}}>
                    <UiBox {...{"className":"flex justify-between items-center gap-2"}}>
                      <UiText {...{"weight":"bold","className":"truncate block"}}>{p.name}</UiText>
                      <UiText {...{"weight":"bold","className":"shrink-0"}}>{p.quantity} uds. | ${p.total.toFixed(2)}</UiText>
                    </UiBox>
                    <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"w-full h-1.5 overflow-hidden"}, {}, {"style":{"backgroundColor":"var(--gray-2)"}})}>
                      <UiBox {...{"style":{"backgroundColor":"var(--orange-9)"},"className":"h-full"}} style={{ width: `${pct}%` }}></UiBox>
                    </UiBox>
                  </UiBox>
                </UiBox>
              );
            })}
            
            {topProducts.length === 0 && (
              <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"flex flex-col items-center justify-center py-10"}}>
                <Package size={28} {...{"className":"opacity-20 mb-1"}} />
                <UiText as="p" {...{"size":"1","className":"italic"}}>No hay datos de ventas registradas en el mes.</UiText>
              </UiBox>
            )}
          </UiBox>
        </UiBox>

      </UiBox>

    </UiBox>
  );
}
