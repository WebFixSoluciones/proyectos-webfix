import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiTextarea, UiSelect } from '../ui/controls';
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

  

  

  return (
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"}}>
      <UiBox 
        {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"})}
      >
        {/* Header */}
        <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
          <UiBox {...{"className":"flex items-center gap-2"}}>
            <Tag {...{"style":{"color":"var(--blue-12)"}}} />
            <UiHeading as="h2" {...mergeThemeProps({"size":"4","weight":"bold","color":"gray","highContrast":true})}>
              Gestionar Categorías y Marcas
            </UiHeading>
          </UiBox>
          <UiButton iconOnly
            onClick={onClose}
            {...mergeThemeProps({"variant":"soft","color":"gray","className":"hover:scale-105"})}
          >
            <X size={18} />
          </UiButton>
        </UiCard>

        {/* Tab switcher */}
        <UiBox {...mergeThemeProps({"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"flex shrink-0 px-6 py-2 gap-2"})}>
          <UiButton
            onClick={() => setActiveTab('categories')}
            {...mergeThemeProps({"size":"2","variant":"outline","className":"flex items-center gap-1.5"}, {}, (activeTab === 'categories' ? {"variant":"solid","color":"blue"} : {"color":"gray"}))}
          >
            <FolderOpen size={14} />
            Categorías
          </UiButton>
          <UiButton
            onClick={() => setActiveTab('brands')}
            {...mergeThemeProps({"size":"2","variant":"outline","className":"flex items-center gap-1.5"}, {}, (activeTab === 'brands' ? {"variant":"solid","color":"blue"} : {"color":"gray"}))}
          >
            <Award size={14} />
            Marcas
          </UiButton>
        </UiBox>

        {/* Content Area */}
        <UiBox {...{"className":"flex-1 flex overflow-hidden min-h-0"}}>
          {error && (
            <UiBox {...{"style":{"backgroundColor":"var(--red-3)","border":"1px solid var(--gray-a6)","color":"var(--red-11)","borderRadius":"var(--radius-3)"},"className":"absolute top-16 left-6 right-6 z-20 flex items-center gap-2 p-3"}}>
              <AlertCircle size={14} />
              <UiText>{error}</UiText>
            </UiBox>
          )}

          {activeTab === 'categories' ? (
            <UiBox {...{"className":"flex-1 flex flex-col md:flex-row"}}>
              {/* Form Side */}
              <form onSubmit={handleCreateCategory} {...{"className":"w-full md:w-1/3 p-6 space-y-4 shrink-0"}}>
                <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"blue","className":"flex items-center gap-1.5"})}>
                  <FolderPlus size={14} /> {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </UiHeading>
                
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Nombre de Categoría *</UiLabel>
                  <UiInput
                    type="text"
                    required
                    placeholder="Ej. Laptops, Repuestos"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  />
                </UiBox>

                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Descripción (Opcional)</UiLabel>
                  <UiTextarea
                    rows={3}
                    placeholder="Detalles sobre esta categoría..."
                    value={categoryDesc}
                    onChange={(e) => setCategoryDesc(e.target.value)}
                    {...mergeThemeProps({}, {"className":"resize-none"}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
                  />
                </UiBox>

                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Descuento de la Categoría</UiLabel>
                  <UiSelect
                    value={selectedDiscountId}
                    onChange={(e) => setSelectedDiscountId(e.target.value)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  >
                    <option value="">-- Ninguno / Sin Descuento --</option>
                    {discounts.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : `$${d.valor}`})
                      </option>
                    ))}
                  </UiSelect>
                </UiBox>

                <UiBox {...{"className":"flex gap-2"}}>
                  {editingCategory && (
                    <UiButton
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryName('');
                        setCategoryDesc('');
                        setSelectedDiscountId('');
                      }}
                      {...{"size":"2","variant":"soft","color":"gray","className":"w-1/2 cursor-pointer"}}
                    >
                      Cancelar
                    </UiButton>
                  )}
                  <UiButton
                    type="submit"
                    disabled={loading}
                    {...mergeThemeProps({}, {"size":"2","variant":"solid","color":"blue","className":"flex items-center justify-center gap-2 cursor-pointer"}, (editingCategory ? {"className":"w-1/2"} : {"className":"w-full"}))}
                  >
                    <Save size={16} />
                    {editingCategory ? 'Actualizar' : 'Guardar Categoría'}
                  </UiButton>
                </UiBox>
              </form>

              {/* List Side */}
              <UiBox {...{"className":"flex-1 p-6 overflow-y-auto custom-scrollbar"}}>
                <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"mb-4"})}>
                  Categorías Registradas ({categories.length})
                </UiHeading>

                <UiBox {...{"className":"space-y-3"}}>
                  {categories.length === 0 ? (
                    <UiText as="p" {...mergeThemeProps({"size":"2","color":"gray","className":"text-center py-8"})}>
                      No hay categorías registradas.
                    </UiText>
                  ) : (
                    categories.map(cat => (
                      <UiBox 
                        key={cat.id} 
                        {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4 flex items-center justify-between"})}
                      >
                        <UiBox>
                          <UiHeading as="h4" {...mergeThemeProps({"size":"2","weight":"bold","color":"gray","highContrast":true})}>{cat.name}</UiHeading>
                          {cat.description && (
                            <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray","className":"mt-1"})}>{cat.description}</UiText>
                          )}
                          {cat.id_descuento_asociado && (() => {
                            const disc = discounts.find(d => d.id === cat.id_descuento_asociado);
                            return disc ? (
                              <UiText {...{"color":"red","size":"1","weight":"bold","className":"inline-block mt-1 px-2.5 py-0.5"}}>
                                Descuento: {disc.nombre}
                              </UiText>
                            ) : null;
                          })()}
                        </UiBox>
                        <UiBox {...{"className":"flex items-center gap-1 shrink-0"}}>
                          <UiButton iconOnly
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryName(cat.name);
                              setCategoryDesc(cat.description || '');
                              setSelectedDiscountId(cat.id_descuento_asociado || '');
                            }}
                            {...mergeThemeProps({"color":"blue","className":"cursor-pointer"})}
                            title="Editar Categoría"
                          >
                            <Edit2 size={16} />
                          </UiButton>
                          <UiButton iconOnly
                            onClick={() => cat.id && handleDeleteCategory(cat.id)}
                            {...mergeThemeProps({"color":"red","className":"cursor-pointer"})}
                            title="Eliminar Categoría"
                          >
                            <Trash2 size={16} />
                          </UiButton>
                        </UiBox>
                      </UiBox>
                    ))
                  )}
                </UiBox>
              </UiBox>
            </UiBox>
          ) : (
            <UiBox {...{"className":"flex-1 flex flex-col md:flex-row"}}>
              {/* Form Side */}
              <form onSubmit={handleCreateBrand} {...{"className":"w-full md:w-1/3 p-6 space-y-4 shrink-0"}}>
                <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"blue","className":"flex items-center gap-1.5"})}>
                  <Plus size={14} /> Nueva Marca
                </UiHeading>
                
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Nombre de la Marca *</UiLabel>
                  <UiInput
                    type="text"
                    required
                    placeholder="Ej. HP, Dell, Asus"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  />
                </UiBox>

                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Fabricante / Proveedor principal (Opcional)</UiLabel>
                  <UiInput
                    type="text"
                    placeholder="Ej. Hewlett-Packard Co."
                    value={brandManufacturer}
                    onChange={(e) => setBrandManufacturer(e.target.value)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  />
                </UiBox>

                <UiButton
                  type="submit"
                  disabled={loading}
                  {...{"size":"2","variant":"solid","color":"blue","className":"w-full flex items-center justify-center gap-2"}}
                >
                  <Save size={16} />
                  Guardar Marca
                </UiButton>
              </form>

              {/* List Side */}
              <UiBox {...{"className":"flex-1 p-6 overflow-y-auto custom-scrollbar"}}>
                <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"mb-4"})}>
                  Marcas Registradas ({brands.length})
                </UiHeading>

                <UiBox {...{"className":"space-y-3"}}>
                  {brands.length === 0 ? (
                    <UiText as="p" {...mergeThemeProps({"size":"2","color":"gray","className":"text-center py-8"})}>
                      No hay marcas registradas.
                    </UiText>
                  ) : (
                    brands.map(brand => (
                      <UiBox 
                        key={brand.id} 
                        {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4 flex items-center justify-between"})}
                      >
                        <UiBox>
                          <UiHeading as="h4" {...mergeThemeProps({"size":"2","weight":"bold","color":"gray","highContrast":true})}>{brand.name}</UiHeading>
                          {brand.manufacturer && (
                            <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray","className":"mt-1"})}>{brand.manufacturer}</UiText>
                          )}
                        </UiBox>
                        <UiButton iconOnly
                          onClick={() => brand.id && handleDeleteBrand(brand.id)}
                          {...mergeThemeProps({"color":"red"})}
                        >
                          <Trash2 size={16} />
                        </UiButton>
                      </UiBox>
                    ))
                  )}
                </UiBox>
              </UiBox>
            </UiBox>
          )}
        </UiBox>
      </UiBox>
    </UiBox>
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
