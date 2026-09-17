import { resolveThemeProps } from '../ui/themeProps';
import {
  Monitor, Palette, Rocket, Briefcase, LayoutDashboard, CalendarDays,
  Users, Trash2, ShoppingCart, ShoppingBag, CreditCard, DollarSign,
  Package, FileText, LifeBuoy
} from 'lucide-react';

// Helper para renderizar iconos a partir de un nombre lógico
export default function IconRenderer({ name, size = 18, className = "" }) {
  switch (name) {
    case 'monitor': return <Monitor size={size} {...resolveThemeProps(className)} />;
    case 'palette': return <Palette size={size} {...resolveThemeProps(className)} />;
    case 'rocket': return <Rocket size={size} {...resolveThemeProps(className)} />;
    case 'project': return <Briefcase size={size} {...resolveThemeProps(className)} />;
    case 'dashboard': return <LayoutDashboard size={size} {...resolveThemeProps(className)} />;
    case 'calendar': return <CalendarDays size={size} {...resolveThemeProps(className)} />;
    case 'team': return <Users size={size} {...resolveThemeProps(className)} />;
    case 'trash': return <Trash2 size={size} {...resolveThemeProps(className)} />;
    case 'ventas': return <ShoppingCart size={size} {...resolveThemeProps(className)} />;
    case 'compras': return <ShoppingBag size={size} {...resolveThemeProps(className)} />;
    case 'gastos_creditos': return <CreditCard size={size} {...resolveThemeProps(className)} />;
    case 'finances': return <DollarSign size={size} {...resolveThemeProps(className)} />;
    case 'inventario': return <Package size={size} {...resolveThemeProps(className)} />;
    case 'personas': return <Users size={size} {...resolveThemeProps(className)} />;
    case 'life-buoy': return <LifeBuoy size={size} {...resolveThemeProps(className)} />;
    default: return <FileText size={size} {...resolveThemeProps(className)} />;
  }
}
