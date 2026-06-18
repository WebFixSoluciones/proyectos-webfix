import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Building, CheckCircle, ShieldCheck, Shield } from 'lucide-react';

export default function LandingHome() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      {/* HERO SECTION */}
      <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
        <div className="text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 mb-6 select-none">
            <Sparkles size={12} /> Facturación y Administración Empresarial
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6 text-black">
            Automatiza la contabilidad de tu negocio en Ecuador
          </h1>
          <p className="text-sm sm:text-base text-gray-700 max-w-lg mb-8 leading-relaxed font-medium">
            Control de inventarios por bodegas, facturación electrónica ilimitada conectada con el SRI, reportes financieros de caja y módulo POS para ventas rápidas.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => navigate('/register')}
              className="px-6 py-3.5 text-xs font-bold text-white bg-primary hover:bg-[#1633c1] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
            >
              Prueba Gratis 14 Días <ArrowRight size={14} />
            </button>
            <button 
              onClick={() => navigate('/soluciones')}
              className="px-6 py-3.5 text-xs font-bold rounded-xl border border-[#CAD1F4] bg-white hover:bg-slate-50 text-black transition-all cursor-pointer"
            >
              Ver Módulos ERP
            </button>
          </div>
        </div>

        {/* CSS Virtual Mockup - Flat corporate visual */}
        <div className="relative w-full max-w-lg mx-auto bg-white border border-[#CAD1F4] rounded-3xl p-5 select-none shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            </div>
            <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">WebFix ERP - Vista General</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Virtual Dashboard Elements */}
            <div className="col-span-3 p-4 rounded-2xl bg-[#F2F4FF] border border-[#CAD1F4]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-500">Ingresos Totales (Mes)</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">+18.5%</span>
              </div>
              <h4 className="text-xl font-black text-black">$14,890.50</h4>
            </div>
            <div className="p-3 rounded-2xl border border-slate-150">
              <span className="block text-[8px] font-bold text-gray-500">Ventas POS</span>
              <p className="text-xs font-black text-black">128 ordenes</p>
            </div>
            <div className="p-3 rounded-2xl border border-slate-150">
              <span className="block text-[8px] font-bold text-gray-500">Comprobantes</span>
              <p className="text-xs font-black text-black">99% autorizado</p>
            </div>
            <div className="p-3 rounded-2xl border border-slate-150">
              <span className="block text-[8px] font-bold text-gray-500">Alertas Stock</span>
              <p className="text-xs font-black text-amber-500">3 Productos</p>
            </div>
          </div>
        </div>
      </div>

      {/* CORE VALUE PROPOSITION SECTIONS */}
      <div className="border-t border-[#CAD1F4] pt-16">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-3xl font-black tracking-tight mb-4">La solución contable para tu negocio</h2>
          <p className="text-sm text-gray-600 font-medium">Diseñada específicamente para el mercado de Ecuador, con soporte del SRI, kárdex y múltiples puntos de venta.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-left">
          
          <div className="p-6 rounded-2xl bg-white border border-[#CAD1F4]">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Building size={20} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider mb-2">Multibodegas e Inventarios</h3>
            <p className="text-xs text-gray-650 leading-relaxed font-medium">Controla múltiples sucursales contables en un solo dashboard. Asigna inventarios compartidos y gestiona traslados de mercadería.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#CAD1F4]">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle size={20} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider mb-2">Conectividad SRI Oficial</h3>
            <p className="text-xs text-gray-650 leading-relaxed font-medium">Firma tus facturas directamente. Conexión inmediata con los servidores de autorización del SRI de forma segura e ilimitada.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#CAD1F4]">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-4">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider mb-2">Respaldo de Base de Datos</h3>
            <p className="text-xs text-gray-650 leading-relaxed font-medium">Tus datos financieros están protegidos bajo infraestructura en la nube de alta disponibilidad, con copias de seguridad diarias automatizadas.</p>
          </div>

        </div>
      </div>

    </div>
  );
}
