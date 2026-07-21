import React, { useState, useEffect } from 'react';
import { Tag, X, Plus, Trash2, FolderPlus, FolderOpen, Award, Save, Edit2 } from 'lucide-react';
import { categoryBrandRepository } from '../../modules/inventory/repositories/CategoryBrandRepository';
import { Category, Brand } from '../../modules/inventory/domain/schemas/category-brand.schema';
import { collection, getDocs } from 'firebase/firestore';
import { db, appId } from '../../firebase';

interface CategoryBrandModalProps {
  onClose: () => void;
  onChanged: () => void;
}

export default function CategoryBrandModal({ onClose, onChanged }: CategoryBrandModalProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [brandName, setBrandName] = useState('');
  const [brandManufacturer, setBrandManufacturer] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cats, brs, discsSnap] = await Promise.all([
        categoryBrandRepository.getCategories(),
        categoryBrandRepository.getBrands(),
        getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'finances_discounts'))
      ]);
      const discsList = discsSnap.docs.map(doc => doc.data());
      setDiscounts(discsList.filter((d: any) => d.activo !== false && d.alcance === 'PRODUCTO'));
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
      if (editingCategory && editingCategory.id) {
        await categoryBrandRepository.updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          id_descuento_asociado: selectedDiscountId || ''
        });
      } else {
        await categoryBrandRepository.createCategory({
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          id_descuento_asociado: selectedDiscountId || '',
          status: 'ACTIVE'
        });
      }
      setCategoryName('');
      setCategoryDesc('');
      setSelectedDiscountId('');
      setEditingCategory(null);
      await loadData();
      onChanged();
    } catch (err: any) {
      setError(err.message || "Error al crear o actualizar la categoría");
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
    if (!await confirm("¿Está seguro de eliminar esta categoría?")) return;
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
    if (!await confirm("¿Está seguro de eliminar esta marca?")) return;
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

  const inputClass = `w-full px-3 py-2 rounded-card outline-none transition-all border text-sm bg-white border-gray-200 text-gray-800 focus:border-primary`;

  const labelClass = `block text-xs font-semibold mb-1 uppercase tracking-wider text-gray-500`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 animate-in fade-in duration-300">
      <div 
        className={`w-full max-w-4xl h-[80vh] flex flex-col rounded-card border overflow-hidden bg-white/95 border-white/40`}
      >
        {/* Header */}
        <div className={`modal-header-std modal-header-std-dark border-gray-100 bg-white/80`}>
          <div className="flex items-center gap-2">
            <Tag className="text-primary" />
            <h2 className={`text-lg font-bold text-gray-900`}>
              Gestionar Categorías y Marcas
            </h2>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-card transition-all hover:scale-105 bg-gray-100 text-gray-500 hover:text-gray-900`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className={`flex border-b shrink-0 px-6 py-2 gap-2 border-primary/5 bg-primary/5`}>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-1.5 rounded-card text-xs font-bold transition-all border flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-primary text-white border-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FolderOpen size={14} />
            Categorías
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`px-4 py-1.5 rounded-card text-xs font-bold transition-all border flex items-center gap-1.5 ${
              activeTab === 'brands'
                ? 'bg-primary text-white border-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Award size={14} />
            Marcas
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {error && (
            <div className="absolute top-16 left-6 right-6 z-20 flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-card">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'categories' ? (
            <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-white/10">
              {/* Form Side */}
              <form onSubmit={handleCreateCategory} className="w-full md:w-1/3 p-6 space-y-4 shrink-0">
                <h3 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider text-primary`}>
                  <FolderPlus size={14} /> {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
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

                <div>
                  <label className={labelClass}>Descuento de la Categoría</label>
                  <select
                    value={selectedDiscountId}
                    onChange={(e) => setSelectedDiscountId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">-- Ninguno / Sin Descuento --</option>
                    {discounts.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : `$${d.valor}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryName('');
                        setCategoryDesc('');
                        setSelectedDiscountId('');
                      }}
                      className="w-1/2 py-2 rounded-card text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`${editingCategory ? 'w-1/2' : 'w-full'} py-2 rounded-card text-sm font-bold bg-primary hover:bg-primary text-white flex items-center justify-center gap-2 transition-all cursor-pointer`}
                  >
                    <Save size={16} />
                    {editingCategory ? 'Actualizar' : 'Guardar Categoría'}
                  </button>
                </div>
              </form>

              {/* List Side */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 text-gray-500`}>
                  Categorías Registradas ({categories.length})
                </h3>

                <div className="space-y-3">
                  {categories.length === 0 ? (
                    <p className={`text-sm text-center py-8 text-gray-400`}>
                      No hay categorías registradas.
                    </p>
                  ) : (
                    categories.map(cat => (
                      <div 
                        key={cat.id} 
                        className={`p-4 rounded-card border flex items-center justify-between transition-all bg-gray-50 border-gray-100 hover:border-gray-200`}
                      >
                        <div>
                          <h4 className={`text-sm font-bold text-gray-800`}>{cat.name}</h4>
                          {cat.description && (
                            <p className={`text-xs mt-1 text-gray-500`}>{cat.description}</p>
                          )}
                          {cat.id_descuento_asociado && (() => {
                            const disc = discounts.find(d => d.id === cat.id_descuento_asociado);
                            return disc ? (
                              <span className="inline-block mt-1 px-2.5 py-0.5 bg-red-50 text-red-500 rounded-md text-[9px] font-bold uppercase">
                                Descuento: {disc.nombre}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryName(cat.name);
                              setCategoryDesc(cat.description || '');
                              setSelectedDiscountId(cat.id_descuento_asociado || '');
                            }}
                            className={`p-2 rounded-card text-primary hover:bg-primary/10 transition-all cursor-pointer`}
                            title="Editar Categoría"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => cat.id && handleDeleteCategory(cat.id)}
                            className={`p-2 rounded-card text-red-500 hover:bg-red-500/10 transition-all cursor-pointer`}
                            title="Eliminar Categoría"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
                <h3 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider text-primary`}>
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
                  className="w-full py-2 rounded-card text-sm font-bold bg-primary hover:bg-primary text-white flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={16} />
                  Guardar Marca
                </button>
              </form>

              {/* List Side */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 text-gray-500`}>
                  Marcas Registradas ({brands.length})
                </h3>

                <div className="space-y-3">
                  {brands.length === 0 ? (
                    <p className={`text-sm text-center py-8 text-gray-400`}>
                      No hay marcas registradas.
                    </p>
                  ) : (
                    brands.map(brand => (
                      <div 
                        key={brand.id} 
                        className={`p-4 rounded-card border flex items-center justify-between transition-all bg-gray-50 border-gray-100 hover:border-gray-200`}
                      >
                        <div>
                          <h4 className={`text-sm font-bold text-gray-800`}>{brand.name}</h4>
                          {brand.manufacturer && (
                            <p className={`text-xs mt-1 text-gray-500`}>{brand.manufacturer}</p>
                          )}
                        </div>
                        <button
                          onClick={() => brand.id && handleDeleteBrand(brand.id)}
                          className={`p-2 rounded-card text-red-500 hover:bg-red-500/10 transition-all`}
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
