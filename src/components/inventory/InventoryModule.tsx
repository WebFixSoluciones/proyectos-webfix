import React, { useState } from 'react';
import { Package, Plus, Search, Filter, Tag, BarChart3, ArrowRightLeft, Settings, Database, Shuffle, RefreshCw } from 'lucide-react';
import ProductCreationForm from './ProductCreationForm';

interface InventoryModuleProps {
  isDarkMode: boolean;
}

export default function InventoryModule({ isDarkMode }: InventoryModuleProps) {
  const [activeTab, setActiveTab] = useState('productos');
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);

  const TABS = [
    { id: 'productos', label: 'Catálogo de Productos', icon: Package },
    { id: 'categorias', label: 'Categorías y Marcas', icon: Tag },
    { id: 'kardex', label: 'Kardex (Movimientos)', icon: BarChart3 },
    { id: 'transferencias', label: 'Transferencias', icon: ArrowRightLeft },
    { id: 'ajustes', label: 'Ajustes de Inventario', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
      
      {/* Sub-Tabs de Inventario */}
      <div className={`flex items-center gap-3 px-8 py-3.5 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-blue-600/10 bg-blue-50/50'}`}>
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none flex-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isActive
                    ? (isDarkMode ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-sm' : 'bg-blue-600 text-white border-blue-600 shadow-sm')
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-black/5')
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        {/* --- TAB: PRODUCTOS --- */}
        {activeTab === 'productos' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Package className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                  Productos
                </h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestiona el catálogo base.</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setIsCreationModalOpen(true)}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Plus size={18} /> Nuevo Producto
                </button>
              </div>
            </div>
            
            <div className={`flex-1 rounded-3xl border flex flex-col items-center justify-center p-8 text-center ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-200'}`}>
              <div className={`w-16 h-16 mb-4 rounded-full flex items-center justify-center border shadow-inner ${isDarkMode ? 'bg-blue-900/20 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                <Package size={32} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Catálogo Vacío</h3>
            </div>
          </div>
        )}

        {/* --- TAB: CATEGORÍAS Y MARCAS --- */}
        {activeTab === 'categorias' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Tag className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} /> Categorías y Marcas
                </h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Organiza tus productos.</p>
              </div>
            </div>
            <div className={`flex-1 rounded-3xl border flex flex-col items-center justify-center p-8 text-center ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-200'}`}>
               <Tag size={32} className={`mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
               <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Módulo de Categorías listo para usarse.</p>
            </div>
          </div>
        )}

        {/* --- TAB: KARDEX --- */}
        {activeTab === 'kardex' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <BarChart3 className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} /> Kardex (Promedio Ponderado)
                </h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Historial de entradas, salidas y valuación del inventario.</p>
              </div>
            </div>
            <div className={`flex-1 rounded-3xl border flex flex-col items-center justify-center p-8 text-center ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-200'}`}>
               <Database size={32} className={`mb-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
               <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Selecciona un producto para ver su Kardex.</p>
            </div>
          </div>
        )}

        {/* --- TAB: TRANSFERENCIAS --- */}
        {activeTab === 'transferencias' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <ArrowRightLeft className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} /> Transferencias
                </h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Movimientos entre sucursales.</p>
              </div>
              <button className="px-4 py-2 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2">
                <Plus size={18} /> Nueva Transferencia
              </button>
            </div>
            <div className={`flex-1 rounded-3xl border flex flex-col items-center justify-center p-8 text-center ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-200'}`}>
               <Shuffle size={32} className={`mb-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
               <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No hay transferencias activas.</p>
            </div>
          </div>
        )}

        {/* --- TAB: AJUSTES --- */}
        {activeTab === 'ajustes' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Settings className={isDarkMode ? 'text-red-400' : 'text-red-600'} /> Ajustes de Inventario
                </h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ajustes manuales, masivos y Cero Inventario.</p>
              </div>
              <button className="px-4 py-2 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white flex items-center gap-2">
                <RefreshCw size={18} /> Nuevo Ajuste
              </button>
            </div>
            <div className={`flex-1 rounded-3xl border flex flex-col items-center justify-center p-8 text-center ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-200'}`}>
               <RefreshCw size={32} className={`mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
               <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Historial de ajustes aplicados.</p>
            </div>
          </div>
        )}
      </div>

      {isCreationModalOpen && (
        <ProductCreationForm 
          isDarkMode={isDarkMode} 
          onClose={() => setIsCreationModalOpen(false)} 
          onSuccess={() => setIsCreationModalOpen(false)}
        />
      )}
    </div>
  );
}
