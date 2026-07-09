import React, { useState, useEffect } from 'react';
import { 
  Briefcase, DollarSign, Tag, Save, X, 
  Percent, FileText, AlertCircle, FolderOpen
} from 'lucide-react';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { categoryBrandRepository } from '../../modules/inventory/repositories/CategoryBrandRepository';
import { Category } from '../../modules/inventory/domain/schemas/category-brand.schema';

interface ServiceCreationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  isInline?: boolean;
  serviceToEdit?: any;
}

export default function ServiceCreationForm({ 
  onClose, 
  onSuccess,
  isInline = false,
  serviceToEdit = null
}: ServiceCreationFormProps) {
  const [formData, setFormData] = useState({
    sku: serviceToEdit?.sku || '',
    name: serviceToEdit?.name || '',
    description: serviceToEdit?.description || '',
    type: 'SERVICE',
    categoryId: serviceToEdit?.categoryId || '',
    baseCost: serviceToEdit?.baseCost || 0,
    marginPercentage: serviceToEdit?.marginPercentage || 50,
    taxRate: serviceToEdit?.taxRate || 15,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await categoryBrandRepository.getCategories();
        setCategories(cats.filter(c => c.status === 'ACTIVE'));
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    }
    loadCategories();
  }, []);

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
      if (serviceToEdit && serviceToEdit.id) {
        await productRepository.update(serviceToEdit.id, {
          ...formData,
          type: 'SERVICE',
          salePrice: calculatedSalePrice,
        });
      } else {
        await productRepository.create({
          ...formData,
          type: 'SERVICE',
          salePrice: calculatedSalePrice,
        });
      }
      onSuccess();
    } catch (err: any) {
      console.error("Error saving service:", err);
      if (err.issues) {
        setError(err.issues[0].message);
      } else {
        setError(err.message || 'Error al guardar el servicio');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full pl-4 pr-4 py-2 rounded-card outline-none transition-all border bg-white/50 border-gray-200 text-gray-800 focus:border-primary focus:bg-white`;

  const labelClass = `block text-xs font-semibold mb-1.5 uppercase tracking-wider text-gray-500`;

  const iconContainerClass = `absolute left-3 top-1/2 -translate-y-1/2 text-gray-400`;

  const formJSX = (
    <div 
      className={isInline ? `w-full rounded-card border bg-white border-gray-200 text-gray-900` : `relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-card border bg-white/95 border-white/40 custom-scrollbar`}
    >
      {/* Header */}
      <div className={`modal-header-std modal-header-std-dark border-gray-100 bg-white/80`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-card bg-primary/10 text-primary`}>
            <Briefcase size={20} />
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-tight text-gray-900`}>
              {serviceToEdit?.id ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>
            <p className={`text-xs text-gray-500`}>
              {serviceToEdit?.id ? 'Edita los detalles del servicio seleccionado' : 'Registra un nuevo servicio intangible en el catálogo'}
            </p>
          </div>
        </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-card transition-all hover:scale-105 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          
          {error && (
            <div className={`flex items-center gap-3 p-4 rounded-card border bg-red-50 border-red-200 text-red-600`}>
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Información Básica */}
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider text-primary`}>
              <Briefcase size={16} /> Información del Servicio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="relative group">
                <label className={labelClass}>Código / SKU de Servicio *</label>
                <div className="relative">
                  <div className={iconContainerClass}><Tag size={16} /></div>
                  <input
                    type="text"
                    name="sku"
                    required
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="Ej. SERV-001"
                    className={`${inputClass}`}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>

              <div className="relative group">
                <label className={labelClass}>Nombre del Servicio *</label>
                <div className="relative">
                  <div className={iconContainerClass}><Briefcase size={16} /></div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej. Consultoría TI - Por Hora"
                    className={`${inputClass}`}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>

              <div className="relative group">
                <label className={labelClass}>Categoría (Opcional)</label>
                <div className="relative">
                  <div className={iconContainerClass}><FolderOpen size={16} /></div>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className={`${inputClass}`}
                    style={{ paddingLeft: '36px' }}
                  >
                    <option value="">Sin Categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative group md:col-span-2">
                <label className={labelClass}>Descripción (Opcional)</label>
                <div className="relative">
                  <div className={iconContainerClass}><FileText size={16} /></div>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detalles adicionales del servicio prestado..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-500/20 to-transparent"></div>

          {/* Sección Precios */}
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider text-emerald-600`}>
              <DollarSign size={16} /> Tarifas y Precios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="relative group">
                <label className={labelClass}>Costo de Prestación / Base ($)</label>
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
                    className={`${inputClass}`}
                    style={{ paddingLeft: '36px' }}
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
                    className={`${inputClass}`}
                    style={{ paddingLeft: '36px' }}
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
                    className={`${inputClass}`}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>
            </div>

            {/* Resumen de Pricing Card */}
            <div className={`mt-6 p-5 rounded-card border flex items-center justify-between bg-gradient-to-br from-primary/10 to-emerald-50 border-primary/25`}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 text-primary`}>
                  Precio Final del Servicio
                </p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black tracking-tight text-gray-900`}>
                    ${finalPriceWithTax.toFixed(2)}
                  </span>
                  <span className={`text-xs font-medium text-gray-500`}>
                    (Inc. IVA)
                  </span>
                </div>
              </div>
              <div className={`text-right text-xs font-medium space-y-1 text-gray-500`}>
                <p>Subtotal: ${calculatedSalePrice.toFixed(2)}</p>
                <p>IVA ({formData.taxRate}%): ${(finalPriceWithTax - calculatedSalePrice).toFixed(2)}</p>
                <p className="text-emerald-600">
                  Margen Neto: ${(calculatedSalePrice - formData.baseCost).toFixed(2)}
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
              className={`px-6 py-2.5 rounded-card font-bold transition-all text-sm bg-gray-100 hover:bg-gray-200 text-gray-700`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 rounded-card font-bold transition-all text-sm bg-primary hover:bg-primary text-white flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar Servicio
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );

    if (isInline) {
      return formJSX;
    }

    return (
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 animate-in fade-in duration-300`}>
        {formJSX}
      </div>
    );
}
