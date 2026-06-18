import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  FileText, 
  Package, 
  Calculator, 
  Check, 
  ArrowRight 
} from 'lucide-react';

export default function LandingFeatures() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'facturacion' | 'inventario' | 'gastos'

  const solutionsData = {
    pos: {
      title: "Punto de Venta (POS) Comercial",
      desc: "Terminal de ventas ágil optimizada para atención rápida al público. Facturación automática al cerrar la orden y registro en caja.",
      bullets: [
        "Apertura y cierre de caja diario en un clic",
        "Búsqueda instantánea de productos con lector de barras",
        "Soporte multi-pago (Efectivo, Tarjeta, Transferencia)",
        "Generación automática del documento para el SRI"
      ],
      uiSim: (
        <div className="border border-[#CAD1F4] rounded-2xl bg-white p-5 text-left font-sans select-none w-full max-w-sm mx-auto shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-black tracking-wider uppercase text-gray-500">Terminal POS - Caja 01</span>
            </div>
            <span className="text-[11px] font-bold text-primary">Venta Activa</span>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-xs font-semibold text-black">
              <span>1x Monitor LG 27\" UltraGear</span>
              <span>$299.00</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-black">
              <span>2x Teclado Mecánico RGB</span>
              <span>$90.00</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-black">
              <span>1x Mouse Inalámbrico Pro</span>
              <span>$45.00</span>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 mb-4 space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-gray-500">
              <span>Subtotal 15%</span>
              <span>$377.39</span>
            </div>
            <div className="flex justify-between text-[11px] font-medium text-gray-500">
              <span>IVA (15%)</span>
              <span>$56.61</span>
            </div>
            <div className="flex justify-between text-sm font-black text-black">
              <span>Total a Pagar</span>
              <span>$434.00</span>
            </div>
          </div>
          <button onClick={() => navigate('/register')} className="w-full py-3 bg-primary hover:bg-[#1633c1] text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer">
            Cobrar y Emitir Factura
          </button>
        </div>
      )
    },
    facturacion: {
      title: "Facturación Electrónica Oficial SRI",
      desc: "Emisión y envío automático de comprobantes de acuerdo a las normativas del SRI. Certificado de firma digital .p12 integrado.",
      bullets: [
        "Emisión ILIMITADA de facturas en todos los planes",
        "Firma automática del comprobante y envío al cliente",
        "Envío al correo con plantilla flat design de alto contraste",
        "Autorización y conexión inmediata con los servidores del SRI"
      ],
      uiSim: (
        <div className="border border-[#CAD1F4] rounded-2xl bg-white p-5 text-left font-sans select-none w-full max-w-sm mx-auto shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <span className="text-[10px] font-black tracking-wider uppercase text-gray-500">Comprobantes Recientes</span>
            <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20">SRI Conectado</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-black">FAC-001-002-000004521</p>
                <p className="text-[10px] text-gray-500">Juan Pérez • $434.00</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-green-500 text-white rounded-lg">Autorizado</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-black">FAC-001-002-000004520</p>
                <p className="text-[10px] text-gray-500">María López • $120.50</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-green-500 text-white rounded-lg">Autorizado</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-black">RET-001-001-000001092</p>
                <p className="text-[10px] text-gray-500">Proveedor S.A. • Retención</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-green-500 text-white rounded-lg">Autorizado</span>
            </div>
          </div>
        </div>
      )
    },
    inventario: {
      title: "Control de Inventarios & Bodegas",
      desc: "Kárdex de mercadería automatizado y gestión multi-bodega en tiempo real. Configura categorías, marcas y alertas de stock.",
      bullets: [
        "Ajuste y transferencia de stock entre bodegas",
        "Kárdex automatizado con cálculo de costo promedio ponderado",
        "Alertas en pantalla cuando los productos lleguen al stock mínimo",
        "Parametrización simplificada de IVA del SRI (15%, 8%, 0%)"
      ],
      uiSim: (
        <div className="border border-[#CAD1F4] rounded-2xl bg-white p-5 text-left font-sans select-none w-full max-w-sm mx-auto shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <span className="text-[10px] font-black tracking-wider uppercase text-gray-500">Estado de Stock</span>
            <span className="text-[10px] font-bold text-gray-500">Bodega Central</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5 text-black">
                <span>iPhone 15 Pro Max</span>
                <span className="text-emerald-500">45 Unidades (Suficiente)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="w-4/5 h-full bg-emerald-500"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5 text-black">
                <span>MacBook Air M3</span>
                <span className="text-emerald-500">18 Unidades (Suficiente)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="w-3/5 h-full bg-emerald-500"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5 text-black">
                <span>Mouse Inalámbrico Pro</span>
                <span className="text-amber-500">3 Unidades (Stock Mínimo)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="w-1/5 h-full bg-amber-500"></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    gastos: {
      title: "Gestión de Compras y Gastos",
      desc: "Control absoluto de egresos y facturas de compras de proveedores. Automatiza tus declaraciones cruzando ventas y gastos.",
      bullets: [
        "Registro y homologación de compras de proveedores",
        "Control de egresos para cálculo del IVA a declarar",
        "Carga rápida de claves de acceso del SRI para validar facturas",
        "Reportes financieros detallados de flujos y egresos"
      ],
      uiSim: (
        <div className="border border-[#CAD1F4] rounded-2xl bg-white p-5 text-left font-sans select-none w-full max-w-sm mx-auto shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <span className="text-[10px] font-black tracking-wider uppercase text-gray-500">Distribución de Gastos</span>
            <span className="text-[10px] font-bold text-rose-500">-$1,420.00 este mes</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <div className="flex-1 flex justify-between text-xs font-semibold text-black">
                <span>Inventario/Mercadería</span>
                <span>$980.00 (69%)</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <div className="flex-1 flex justify-between text-xs font-semibold text-black">
                <span>Servicios de Oficina</span>
                <span>$240.00 (17%)</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <div className="flex-1 flex justify-between text-xs font-semibold text-black">
                <span>Marketing Digital</span>
                <span>$200.00 (14%)</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-1 flex justify-end">
              <button onClick={() => navigate('/register')} className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors border-none cursor-pointer">
                Registrar Gasto
              </button>
            </div>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 text-center">
      
      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-black">Nuestras Soluciones y Módulos ERP</h1>
        <p className="text-sm text-gray-650 max-w-xl mx-auto font-medium">
          Descubre el alcance y potencia de las herramientas integradas para automatizar y administrar tu negocio en el Ecuador.
        </p>
      </div>

      {/* Tab switchers - Corporate flat style */}
      <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-xl mx-auto">
        {[
          { id: 'pos', label: 'Punto de Venta (POS)', icon: ShoppingCart },
          { id: 'facturacion', label: 'Facturación SRI', icon: FileText },
          { id: 'inventario', label: 'Inventario & Stock', icon: Package },
          { id: 'gastos', label: 'Gastos & Compras', icon: Calculator }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                isActive 
                  ? 'bg-primary border-primary text-white shadow-sm' 
                  : 'bg-white border-[#CAD1F4] text-black hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Screen Inline */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center bg-white border border-[#CAD1F4] rounded-3xl p-8 shadow-sm">
        <div className="text-left flex flex-col justify-between h-full">
          <div>
            <span className="text-[9px] font-black tracking-wider uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-4 inline-block select-none">Módulo Profesional</span>
            <h3 className="text-2xl font-black mb-4 text-black">{solutionsData[activeTab].title}</h3>
            <p className="text-xs sm:text-sm text-gray-650 leading-relaxed mb-6 font-medium">{solutionsData[activeTab].desc}</p>
            
            <ul className="space-y-3 mb-8">
              {solutionsData[activeTab].bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-black font-semibold">
                  <div className="w-4.5 h-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                    <Check size={10} className="stroke-[3]" />
                  </div>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={() => navigate(`/register?plan=professional`)} 
            className="w-fit px-6 py-3 bg-primary hover:bg-[#1633c1] text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all flex items-center gap-2 border-none cursor-pointer"
          >
            Habilitar Módulo <ArrowRight size={14} />
          </button>
        </div>

        <div className="flex items-center justify-center p-4 bg-[#F2F4FF] rounded-2xl border border-[#CAD1F4] w-full">
          {solutionsData[activeTab].uiSim}
        </div>
      </div>

    </div>
  );
}
