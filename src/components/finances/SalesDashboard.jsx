import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, ShoppingCart, Package, Clock, Users, ArrowUpRight, 
  Activity, ArrowDownRight, Tag, ShieldCheck, HelpCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getEcuadorDateString } from '../../services/sriService';

export default function SalesDashboard({ transactions, thirdParties, products, db, appId }) {
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
  const cardClass = `p-5 rounded-card border transition-all ${
    'bg-white border-border-default hover:border-gray-400/80'
  }`;

  const progressBgClass = 'bg-surface-bg';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* SECCION ALERTA DE SESIÓN DE CAJA */}
      {!sessionLoading && (
        <div className={`p-4 rounded-card border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          activeSession 
            ? ('bg-emerald-50 border-emerald-300 text-emerald-950')
            : ('bg-orange-50 border-orange-300 text-orange-950')
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              activeSession 
                ? ('bg-emerald-200 text-emerald-800')
                : ('bg-orange-200 text-orange-800')
            }`}>
              <Clock size={16} />
            </div>
            <div>
              <p className="text-xs font-bold font-sans">
                {activeSession 
                  ? `Caja POS Abierta - Sucursal: ${activeSession.branch}` 
                  : "Caja POS Cerrada o Inactiva"}
              </p>
              <p className={`text-xs mt-0.5 ${'text-text-secondary'}`}>
                {activeSession 
                  ? `Responsable: ${activeSession.responsible} | Turno: ${activeSession.shift} | Fondo: $${activeSession.initialAmount.toFixed(2)}`
                  : "Es necesario abrir la caja registradora en el Punto de Venta (POS) para poder realizar ventas físicas."}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
              activeSession 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
            }`}>
              {activeSession ? 'Activa' : 'Requerida'}
            </span>
          </div>
        </div>
      )}

      {/* METRICAS DE VENTAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* VENTAS DE HOY */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${'text-text-secondary'}`}>Ventas de Hoy</span>
            <div className={`p-1.5 rounded-lg ${'bg-primary/10 text-primary'}`}>
              <ShoppingCart size={14} />
            </div>
          </div>
          <p className="text-2xl font-black">${todaySalesTotal.toFixed(2)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className="font-bold text-emerald-500 flex items-center"><ArrowUpRight size={10} /> {todaySalesCount}</span>
            <span className={'text-text-secondary font-semibold'}>transacciones concretadas</span>
          </div>
        </div>

        {/* VENTAS DEL MES */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${'text-text-secondary'}`}>Ventas del Mes</span>
            <div className={`p-1.5 rounded-lg ${'bg-emerald-100 text-emerald-800'}`}>
              <TrendingUp size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-500">${monthlySalesTotal.toFixed(2)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className="font-bold text-emerald-500 flex items-center"><ArrowUpRight size={10} /> {monthlySalesCount}</span>
            <span className={'text-text-secondary font-semibold'}>facturas de venta</span>
          </div>
        </div>

        {/* TICKET PROMEDIO */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${'text-text-secondary'}`}>Ticket Promedio</span>
            <div className={`p-1.5 rounded-lg ${'bg-purple-100 text-purple-800'}`}>
              <DollarSign size={14} />
            </div>
          </div>
          <p className="text-2xl font-black">${averageTicket.toFixed(2)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className={'text-text-secondary font-semibold'}>Valor medio por compra</span>
          </div>
        </div>

        {/* UNIDADES VENDIDAS */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${'text-text-secondary'}`}>Artículos Vendidos</span>
            <div className={`p-1.5 rounded-lg ${'bg-orange-100 text-orange-800'}`}>
              <Package size={14} />
            </div>
          </div>
          <p className="text-2xl font-black">{totalItemsSold} ud.</p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className={'text-text-secondary font-semibold'}>Productos y servicios entregados</span>
          </div>
        </div>

      </div>

      {/* DETALLES ANALITICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* MÉTODOS DE PAGO */}
        <div className={`${cardClass} lg:col-span-2 space-y-4`}>
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Activity size={15} className="text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider">Desglose de Métodos de Pago</h3>
          </div>

          <div className="space-y-4">
            {[
              { key: 'efectivo', label: 'Efectivo en Caja', color: 'bg-emerald-500' },
              { key: 'tarjeta', label: 'Tarjetas Débito/Crédito', color: 'bg-blue-500' },
              { key: 'transferencia', label: 'Transferencia Bancaria', color: 'bg-purple-500' },
              { key: 'cruce_cuentas', label: 'Cruce de Cuentas', color: 'bg-gray-500' }
            ].map(m => {
              const value = paymentMethods[m.key] || 0;
              const pct = (value / totalPaymentSum) * 100;
              return (
                <div key={m.key} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-bold ${'text-text-secondary'}`}>{m.label}</span>
                    <span className="font-bold text-white">${value.toFixed(2)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${progressBgClass}`}>
                    <div className={`h-full ${m.color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP PRODUCTOS MÁS VENDIDOS */}
        <div className={`${cardClass} lg:col-span-3 space-y-4`}>
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Tag size={15} className="text-orange-500" />
            <h3 className="text-xs font-black uppercase tracking-wider">Productos Más Vendidos (Mes)</h3>
          </div>

          <div className="space-y-3.5">
            {topProducts.map((p, idx) => {
              const pct = (p.quantity / maxProductQty) * 100;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    idx === 0 
                      ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' 
                      : ('bg-surface-bg text-text-secondary')
                  }`}>
                    {idx + 1}
                  </span>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="font-bold truncate text-white block">{p.name}</span>
                      <span className="font-bold shrink-0">{p.quantity} uds. | ${p.total.toFixed(2)}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${progressBgClass}`}>
                      <div className="h-full bg-orange-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {topProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                <Package size={28} className="opacity-20 mb-1" />
                <p className="text-xs italic">No hay datos de ventas registradas en el mes.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
