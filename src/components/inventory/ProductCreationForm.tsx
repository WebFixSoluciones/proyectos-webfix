import React, { useState } from 'react';
import { 
  Package, DollarSign, Tag, Save, X, Box, 
  Percent, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { ProductTypeEnum } from '../../modules/inventory/domain/schemas/product.schema';

interface ProductCreationFormProps {
  isDarkMode: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductCreationForm({ isDarkMode, onClose, onSuccess }: ProductCreationFormProps) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    type: 'STANDARD',
    categoryId: '',
    brandId: '',
    baseCost: 0,
    marginPercentage: 30,
    taxRate: 15,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const calculatedSalePrice = formData.baseCost * (1 + formData.marginPercentage / 100);
  const finalPriceWithTax = calculatedSalePrice * (1 + formData.taxRate / 100);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await productRepository.create({
        ...formData,
        type: formData.type as any,
        salePrice: calculatedSalePrice,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error creating product:", err);
      // Extraemos el mensaje de Zod si es posible
      if (err.issues) {
        setError(err.issues[0].message);
      } else {
        setError(err.message || 'Error al guardar el producto');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/30 border-white/10 text-white focus:border-blue-500 focus:bg-black/50 shadow-inner' 
      : 'bg-white/50 border-gray-200 text-gray-800 focus:border-blue-500 focus:bg-white shadow-inner'
  }`;

  const labelClass = `block text-xs font-semibold mb-1.5 uppercase tracking-wider ${
    isDarkMode ? 'text-gray-400' : 'text-gray-500'
  }`;

  const iconContainerClass = `absolute left-3 top-1/2 -translate-y-1/2 ${
    isDarkMode ? 'text-gray-500' : 'text-gray-400'
  }`;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/40 animate-in fade-in duration-300`}>
      <div 
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border ${
          isDarkMode 
            ? 'bg-gray-900/95 border-white/10' 
            : 'bg-white/95 border-white/40'
        } custom-scrollbar`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-5 border-b backdrop-blur-md flex items-center justify-between ${
          isDarkMode ? 'border-white/10 bg-gray-900/80' : 'border-gray-100 bg-white/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shadow-inner ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Package size={24} />
            </div>
            <div>
              <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Nuevo Producto
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Añade un nuevo ítem estándar al inventario
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-all hover:scale-105 ${
              isDarkMode ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          
          {error && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Sección Principal */}
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              <Box size={16} /> Información Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="relative group">
                <label className={labelClass}>Código / SKU *</label>
                <div className="relative">
                  <div className={iconContainerClass}><Tag size={16} /></div>
                  <input
                    type="text"
                    name="sku"
                    required
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="Ej. PROD-001"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div className="relative group">
                <label className={labelClass}>Nombre del Producto *</label>
                <div className="relative">
                  <div className={iconContainerClass}><Package size={16} /></div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej. Laptop HP Envy x360"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div className="relative group md:col-span-2">
                <label className={labelClass}>Descripción (Opcional)</label>
                <div className="relative">
                  <div className={`absolute left-3 top-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}><FileText size={16} /></div>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detalles adicionales del producto..."
                    rows={3}
                    className={`${inputClass} pl-10 resize-none`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-500/20 to-transparent"></div>

          {/* Sección Precios */}
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              <DollarSign size={16} /> Precios y Costos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="relative group">
                <label className={labelClass}>Costo Base ($)</label>
                <div className="relative">
                  <div className={iconContainerClass}><DollarSign size={16} /></div>
                  <input
                    type="number"
                    name="baseCost"
                    min="0"
                    step="0.01"
                    required
                    value={formData.baseCost}
                    onChange={handleInputChange}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div className="relative group">
                <label className={labelClass}>Margen de Ganancia (%)</label>
                <div className="relative">
                  <div className={iconContainerClass}><Percent size={16} /></div>
                  <input
                    type="number"
                    name="marginPercentage"
                    min="0"
                    step="0.1"
                    required
                    value={formData.marginPercentage}
                    onChange={handleInputChange}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div className="relative group">
                <label className={labelClass}>Impuesto IVA (%)</label>
                <div className="relative">
                  <div className={iconContainerClass}><Percent size={16} /></div>
                  <input
                    type="number"
                    name="taxRate"
                    min="0"
                    step="1"
                    required
                    value={formData.taxRate}
                    onChange={handleInputChange}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>

            {/* Resumen de Pricing Card */}
            <div className={`mt-6 p-5 rounded-2xl border flex items-center justify-between shadow-lg ${
              isDarkMode 
                ? 'bg-gradient-to-br from-emerald-900/30 to-blue-900/30 border-emerald-500/20' 
                : 'bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200'
            }`}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Precio Venta al Público
                </p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    ${finalPriceWithTax.toFixed(2)}
                  </span>
                  <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    (Inc. IVA)
                  </span>
                </div>
              </div>
              <div className={`text-right text-xs font-medium space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>Subtotal: ${calculatedSalePrice.toFixed(2)}</p>
                <p>IVA ({formData.taxRate}%): ${(finalPriceWithTax - calculatedSalePrice).toFixed(2)}</p>
                <p className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>
                  Ganancia neta: ${(calculatedSalePrice - formData.baseCost).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${
                isDarkMode 
                  ? 'bg-white/5 hover:bg-white/10 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 rounded-xl font-bold transition-all text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar Producto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
