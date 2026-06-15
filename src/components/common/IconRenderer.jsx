import React from 'react';
import {
  Monitor, Palette, Rocket, Briefcase, LayoutDashboard, CalendarDays,
  Users, Trash2, ShoppingCart, ShoppingBag, CreditCard, DollarSign,
  Package, FileText, LifeBuoy
} from 'lucide-react';

// Helper para renderizar iconos a partir de un nombre lógico
export default function IconRenderer({ name, size = 18, className = "" }) {
  switch (name) {
    case 'monitor': return <Monitor size={size} className={className} />;
    case 'palette': return <Palette size={size} className={className} />;
    case 'rocket': return <Rocket size={size} className={className} />;
    case 'project': return <Briefcase size={size} className={className} />;
    case 'dashboard': return <LayoutDashboard size={size} className={className} />;
    case 'calendar': return <CalendarDays size={size} className={className} />;
    case 'team': return <Users size={size} className={className} />;
    case 'trash': return <Trash2 size={size} className={className} />;
    case 'ventas': return <ShoppingCart size={size} className={className} />;
    case 'compras': return <ShoppingBag size={size} className={className} />;
    case 'gastos_creditos': return <CreditCard size={size} className={className} />;
    case 'finances': return <DollarSign size={size} className={className} />;
    case 'inventario': return <Package size={size} className={className} />;
    case 'personas': return <Users size={size} className={className} />;
    case 'life-buoy': return <LifeBuoy size={size} className={className} />;
    default: return <FileText size={size} className={className} />;
  }
}
