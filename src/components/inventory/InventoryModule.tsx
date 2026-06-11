import React, { useState } from 'react';
import { Package, Plus, Search, Filter } from 'lucide-react';
import ProductCreationForm from './ProductCreationForm';

interface InventoryModuleProps {
  isDarkMode: boolean;
}

export default function InventoryModule({ isDarkMode }: InventoryModuleProps) {
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);

  return (
    <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Package className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
            Catálogo de Productos
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Gestiona productos, combos, subproductos y controla el stock.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Barra de búsqueda (Mockup visual) */}
          <div className="relative flex-1 sm:w-64">
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Buscar por SKU o Nombre..." 
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm transition-all border outline-none ${
                isDarkMode 
                  ? 'bg-black/20 border-white/10 text-white focus:border-blue-500 focus:bg-black/40' 
                  : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500 shadow-sm'
              }`}
            />
          </div>

          <button className={`p-2 rounded-xl border transition-all hover:scale-105 ${
            isDarkMode ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
          }`}>
            <Filter size={18} />
          </button>

          <button 
            onClick={() => setIsCreationModalOpen(true)}
            className="px-4 py-2 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Lista de productos / Placeholder */}
      <div className={`flex-1 rounded-3xl border flex flex-col items-center justify-center p-8 text-center ${
        isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-200'
      }`}>
        <div className={`w-20 h-20 mb-4 rounded-full flex items-center justify-center border shadow-inner ${
          isDarkMode ? 'bg-blue-900/20 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
        }`}>
          <Package size={40} />
        </div>
        <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Inventario Vacío
        </h3>
        <p className={`max-w-md text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Aún no tienes productos registrados. Crea tu primer producto estándar, subproducto o combo para empezar a gestionar el inventario.
        </p>
        <button 
          onClick={() => setIsCreationModalOpen(true)}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all border shadow-sm ${
            isDarkMode 
              ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          Crear mi primer producto
        </button>
      </div>

      {isCreationModalOpen && (
        <ProductCreationForm 
          isDarkMode={isDarkMode} 
          onClose={() => setIsCreationModalOpen(false)} 
          onSuccess={() => {
            // Aquí se recargaría la lista de productos
            console.log("Producto creado exitosamente!");
          }}
        />
      )}
    </div>
  );
}
