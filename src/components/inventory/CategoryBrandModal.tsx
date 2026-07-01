import React, { useState, useEffect } from 'react';
import { Tag, X, Plus, Trash2, FolderPlus, FolderOpen, Award, Save } from 'lucide-react';
import { categoryBrandRepository } from '../../modules/inventory/repositories/CategoryBrandRepository';
import { Category, Brand } from '../../modules/inventory/domain/schemas/category-brand.schema';

interface CategoryBrandModalProps {
  isDarkMode: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export default function CategoryBrandModal({ isDarkMode, onClose, onChanged }: CategoryBrandModalProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  
  const [brandName, setBrandName] = useState('');
  const [brandManufacturer, setBrandManufacturer] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cats, brs] = await Promise.all([
        categoryBrandRepository.getCategories(),
        categoryBrandRepository.getBrands()
      ]);
      setCategories(cats);
      setBrands(brs);
    } catch (err: any) {
      console.error(err);
      setError("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await categoryBrandRepository.createCategory({
        name: categoryName.trim(),
        description: categoryDesc.trim(),
        status: 'ACTIVE'
      });
      setCategoryName('');
      setCategoryDesc('');
      await loadData();
      onChanged();
    } catch (err: any) {
      setError(err.message || "Error al crear la categoría");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await categoryBrandRepository.createBrand({
        name: brandName.trim(),
        manufacturer: brandManufacturer.trim(),
        status: 'ACTIVE'
      });
      setBrandName('');
      setBrandManufacturer('');
      await loadData();
      onChanged();
    } catch (err: any) {
      setError(err.message || "Error al crear la marca");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta categoría?")) return;
    setLoading(true);
    try {
      await categoryBrandRepository.deleteCategory(id);
      await loadData();
      onChanged();
    } catch (err: any) {
      setError("No se pudo eliminar la categoría");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta marca?")) return;
    setLoading(true);
    try {
      await categoryBrandRepository.deleteBrand(id);
      await loadData();
      onChanged();
    } catch (err: any) {
      setError("No se pudo eliminar la marca");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-xl outline-none transition-all border text-sm ${
    isDarkMode 
      ? 'bg-black/30 border-white/10 text-white focus:border-primary shadow-inner' 
      : 'bg-white border-gray-200 text-gray-800 focus:border-primary shadow-inner'
  }`;

  const labelClass = `block text-xs font-semibold mb-1 uppercase tracking-wider ${
    isDarkMode ? 'text-gray-400' : 'text-gray-500'
  }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/40 animate-in fade-in duration-300">
      <div 
        className={`w-full max-w-4xl h-[80vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
          isDarkMode ? 'bg-gray-900/95 border-white/10' : 'bg-white/95 border-white/40'
        }`}
      >
        {/* Header */}
        <div className={`modal-header-std modal-header-std-dark ${
          isDarkMode ? 'border-white/10 bg-gray-900/80' : 'border-gray-100 bg-white/80'
        }`}>
          <div className="flex items-center gap-2">
            <Tag className={isDarkMode ? 'text-primary' : 'text-primary'} />
            <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Gestionar Categorías y Marcas
            </h2>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-all hover:scale-105 ${
              isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className={`flex border-b shrink-0 px-6 py-2 gap-2 ${
          isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-primary/5 bg-primary/5'
        }`}>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30' : 'bg-primary text-white border-primary')
                : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-600 hover:text-gray-900')
            }`}
          >
            <FolderOpen size={14} />
            Categorías
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              activeTab === 'brands'
                ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30' : 'bg-primary text-white border-primary')
                : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-600 hover:text-gray-900')
            }`}
          >
            <Award size={14} />
            Marcas
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {error && (
            <div className="absolute top-16 left-6 right-6 z-20 flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'categories' ? (
            <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-white/10">
              {/* Form Side */}
              <form onSubmit={handleCreateCategory} className="w-full md:w-1/3 p-6 space-y-4 shrink-0">
                <h3 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider ${isDarkMode ? 'text-primary' : 'text-primary'}`}>
                  <FolderPlus size={14} /> Nueva Categoría
                </h3>
                
                <div>
                  <label className={labelClass}>Nombre de Categoría *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Laptops, Repuestos"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Descripción (Opcional)</label>
                  <textarea
                    rows={3}
                    placeholder="Detalles sobre esta categoría..."
                    value={categoryDesc}
                    onChange={(e) => setCategoryDesc(e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-xl text-sm font-bold bg-primary hover:bg-primary text-white flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={16} />
                  Guardar Categoría
                </button>
              </form>

              {/* List Side */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Categorías Registradas ({categories.length})
                </h3>

                <div className="space-y-3">
                  {categories.length === 0 ? (
                    <p className={`text-sm text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      No hay categorías registradas.
                    </p>
                  ) : (
                    categories.map(cat => (
                      <div 
                        key={cat.id} 
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                          isDarkMode ? 'bg-black/20 border-white/5 hover:border-white/10' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div>
                          <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{cat.name}</h4>
                          {cat.description && (
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{cat.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => cat.id && handleDeleteCategory(cat.id)}
                          className={`p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-white/10">
              {/* Form Side */}
              <form onSubmit={handleCreateBrand} className="w-full md:w-1/3 p-6 space-y-4 shrink-0">
                <h3 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider ${isDarkMode ? 'text-primary' : 'text-primary'}`}>
                  <Plus size={14} /> Nueva Marca
                </h3>
                
                <div>
                  <label className={labelClass}>Nombre de la Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. HP, Dell, Asus"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Fabricante / Proveedor principal (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Hewlett-Packard Co."
                    value={brandManufacturer}
                    onChange={(e) => setBrandManufacturer(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-xl text-sm font-bold bg-primary hover:bg-primary text-white flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={16} />
                  Guardar Marca
                </button>
              </form>

              {/* List Side */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Marcas Registradas ({brands.length})
                </h3>

                <div className="space-y-3">
                  {brands.length === 0 ? (
                    <p className={`text-sm text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      No hay marcas registradas.
                    </p>
                  ) : (
                    brands.map(brand => (
                      <div 
                        key={brand.id} 
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                          isDarkMode ? 'bg-black/20 border-white/5 hover:border-white/10' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div>
                          <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{brand.name}</h4>
                          {brand.manufacturer && (
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{brand.manufacturer}</p>
                          )}
                        </div>
                        <button
                          onClick={() => brand.id && handleDeleteBrand(brand.id)}
                          className={`p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Pequeño helper para render de AlertCircle
function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
