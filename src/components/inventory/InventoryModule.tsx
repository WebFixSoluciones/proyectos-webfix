import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, Tag, BarChart3, 
  ArrowRightLeft, Settings, Database, RefreshCw, 
  Trash2, Briefcase, PlusCircle, CheckCircle, ShieldAlert,
  MapPin, SlidersHorizontal, Layers, Award, Edit2, X, Box
} from 'lucide-react';
import ProductCreationForm from './ProductCreationForm';
import ServiceCreationForm from './ServiceCreationForm';
import CategoryBrandModal from './CategoryBrandModal';
import TransferModal from './TransferModal';
import AdjustmentModal from './AdjustmentModal';

import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { categoryBrandRepository } from '../../modules/inventory/repositories/CategoryBrandRepository';
import { kardexRepository } from '../../modules/inventory/repositories/KardexRepository';
import { Product } from '../../modules/inventory/domain/schemas/product.schema';
import { Category, Brand } from '../../modules/inventory/domain/schemas/category-brand.schema';
import { KardexTransaction } from '../../modules/inventory/domain/schemas/kardex-transfer.schema';

import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../../firebase';

interface InventoryModuleProps {
  initialSubTab?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const BRANCHES = [
  { id: 'sucursal-central-uuid', name: 'Sucursal Central (Principal)' },
  { id: 'sucursal-sur-uuid', name: 'Sucursal Sur' },
  { id: 'sucursal-norte-uuid', name: 'Sucursal Norte' }
];

export default function InventoryModule({ initialSubTab, showToast }: InventoryModuleProps) {
  const [activeTab, setActiveTab] = useState('productos');

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);
  
  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  
  // Modals / Inline forms open states
  const [inlineFormMode, setInlineFormMode] = useState<'create_product' | 'create_service' | 'edit_product' | 'edit_service' | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductTypeSelector, setShowProductTypeSelector] = useState(false);
  const [isCatBrandOpen, setIsCatBrandOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Kardex tab states
  const [kardexProductId, setKardexProductId] = useState('');
  const [kardexBranchId, setKardexBranchId] = useState(BRANCHES[0].id);
  const [kardexHistory, setKardexHistory] = useState<KardexTransaction[]>([]);
  
  // History tab lists
  const [transfers, setTransfers] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);

  // Helper to scroll the inner scrollable container to the top, avoiding window scroll side effects
  const scrollToForm = () => {
    setTimeout(() => {
      const container = document.getElementById('inline-form-container');
      if (container) {
        let parent = container.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            parent.scrollTo({ top: 0, behavior: 'smooth' });
            break;
          }
          parent = parent.parentElement;
        }
      }
    }, 100);
  };

  // Load basic catalog data
  useEffect(() => {
    loadCatalogData();
  }, []);

  async function loadCatalogData() {
    setLoading(true);
    try {
      const [allProducts, allCats, allBrands] = await Promise.all([
        productRepository.findAll(),
        categoryBrandRepository.getCategories(),
        categoryBrandRepository.getBrands()
      ]);
      
      setProducts(allProducts);
      setCategories(allCats);
      setBrands(allBrands);

      // Load stock quantities for physical products
      const stockMap: Record<string, number> = {};
      for (const prod of allProducts) {
        if (prod.type === 'SERVICE') {
          stockMap[prod.id || ''] = 0;
          continue;
        }
        if (prod.id) {
          const bal = await kardexRepository.getLastBalance(prod.id, BRANCHES[0].id);
          stockMap[prod.id] = bal ? bal.balanceQuantity : 0;
        }
      }
      setStocks(stockMap);
    } catch (err) {
      console.error("Error loading inventory catalog:", err);
    } finally {
      setLoading(false);
    }
  }

  // Reload stocks specifically
  async function reloadStocks() {
    const stockMap: Record<string, number> = {};
    for (const prod of products) {
      if (prod.type === 'SERVICE') continue;
      if (prod.id) {
        const bal = await kardexRepository.getLastBalance(prod.id, BRANCHES[0].id);
        stockMap[prod.id] = bal ? bal.balanceQuantity : 0;
      }
    }
    setStocks(stockMap);
  }

  // Load Kardex history when product or branch changes
  useEffect(() => {
    if (activeTab === 'kardex' && kardexProductId) {
      loadKardexHistory();
    }
  }, [kardexProductId, kardexBranchId, activeTab]);

  async function loadKardexHistory() {
    try {
      const history = await kardexRepository.getHistory(kardexProductId, kardexBranchId);
      // Ordenar por fecha cronológica (el repo devuelve desc)
      setKardexHistory(history);
    } catch (err) {
      console.error(err);
    }
  }

  // Load Transfers history
  useEffect(() => {
    if (activeTab === 'transferencias') {
      loadTransfers();
    }
  }, [activeTab]);

  async function loadTransfers() {
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'inventory_transfers'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt
        };
      });
      setTransfers(list);
    } catch (err) {
      console.error(err);
    }
  }

  // Load Adjustments history
  useEffect(() => {
    if (activeTab === 'ajustes') {
      loadAdjustments();
    }
  }, [activeTab]);

  async function loadAdjustments() {
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'inventory_adjustments'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt
        };
      });
      setAdjustments(list);
    } catch (err) {
      console.error(err);
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!await confirm("¿Está seguro de eliminar este producto/servicio?")) return;
    try {
      await productRepository.delete(id);
      await loadCatalogData();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el producto");
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesType = selectedType ? p.type === selectedType : true;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getCategoryName = (id?: string) => {
    return categories.find(c => c.id === id)?.name || 'Sin Categoría';
  };

  const getBrandName = (id?: string) => {
    return brands.find(b => b.id === id)?.name || 'Sin Marca';
  };

  const TABS = [
    { id: 'productos', label: 'Catálogo de Productos y Servicios', icon: Package },
    { id: 'categorias', label: 'Categorías y Marcas', icon: Tag },
    { id: 'kardex', label: 'Kardex (Movimientos)', icon: BarChart3 },
    { id: 'transferencias', label: 'Transferencias', icon: ArrowRightLeft },
    { id: 'ajustes', label: 'Ajustes de Inventario', icon: Settings },
  ];

  // Colors and typography matching the App styling
  const tableHeaderClass = 'bg-gray-100 text-gray-600 border-gray-200';
  const tableRowClass = 'hover:bg-black/5 border-gray-100';

  return (
    <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
      


      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        
        {/* --- TAB: PRODUCTOS & SERVICIOS --- */}
        {activeTab === 'productos' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            {!inlineFormMode ? (
              <>
                {/* FILTROS Y ACCIONES */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => setShowProductTypeSelector(true)}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-card text-xs font-bold transition-all hover-lift bg-primary text-white hover:bg-primary/95`}
                    >
                      <Plus size={15} /> Nuevo Producto
                    </button>
                    <button 
                      onClick={() => {
                        setInlineFormMode('create_service');
                        setEditingProduct(null);
                        scrollToForm();
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-card text-xs font-bold transition-all hover-lift bg-indigo-600 text-white hover:bg-indigo-550`}
                    >
                      <Briefcase size={15} /> Nuevo Servicio
                    </button>
                    <button 
                      onClick={() => setIsCatBrandOpen(true)}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-card text-xs font-bold transition-all border ${
                        'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Tag size={15} /> Categorías/Marcas
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-card border-none w-full sm:w-64 transition-all focus-within:ring-1 focus-within:ring-primary/25 bg-surface-bg hover:bg-surface-card focus-within:bg-surface-card">
                      <Search size={14} className={'text-gray-400'} />
                      <input
                        type="text"
                        placeholder="Buscar por SKU o nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs w-full text-current placeholder-gray-500 focus:ring-0"
                      />
                    </div>

                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-1.5 rounded-card border-none text-xs font-medium outline-none transition-all cursor-pointer bg-surface-bg hover:bg-surface-card text-slate-700 focus:ring-1 focus:ring-primary/25"
                    >
                      <option value="" className="text-black">Todas las Categorías</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                      ))}
                    </select>

                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="px-3 py-1.5 rounded-card border-none text-xs font-medium outline-none transition-all cursor-pointer bg-surface-bg hover:bg-surface-card text-slate-700 focus:ring-1 focus:ring-primary/25"
                    >
                      <option value="" className="text-black">Todos los Tipos</option>
                      <option value="STANDARD" className="text-black">Estándar</option>
                      <option value="COMBO" className="text-black">Combo</option>
                      <option value="SUBPRODUCT" className="text-black">Subproducto</option>
                      <option value="SERVICE" className="text-black">Servicio</option>
                    </select>
                  </div>
                </div>
                
                {/* Products Table */}
                <div className={`rounded-card border overflow-hidden transition-all ${
                  'border-slate-200/80 bg-white'
                }`}>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className={`text-xs uppercase font-bold tracking-wider ${
                        'bg-slate-50 text-slate-600 border-b border-slate-100'
                      }`}>
                        <tr>
                          <th className="px-6 py-3.5">SKU</th>
                          <th className="px-6 py-3.5">Nombre</th>
                          <th className="px-6 py-3.5">Tipo</th>
                          <th className="px-6 py-3.5">Categoría</th>
                          <th className="px-6 py-3.5">Costo Base</th>
                          <th className="px-6 py-3.5">Precio Venta</th>
                          <th className="px-6 py-3.5">Impuesto</th>
                          <th className="px-6 py-3.5">Stock Actual</th>
                          <th className="px-6 py-3.5 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${'divide-slate-100'}`}>
                        {loading ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-8 text-center text-gray-500 font-bold">Cargando catálogo...</td>
                          </tr>
                        ) : filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-8 text-center text-gray-500">No se encontraron productos ni servicios.</td>
                          </tr>
                        ) : (
                          filteredProducts.map(p => {
                            const stock = stocks[p.id || ''] !== undefined ? stocks[p.id || ''] : 0;
                            const isService = p.type === 'SERVICE';
                            
                            return (
                              <tr key={p.id} className={`transition-colors ${'hover:bg-slate-50/40'}`}>
                                <td className={`px-6 py-3.5 font-mono text-xs font-bold ${'text-black font-semibold'}`}>{p.sku}</td>
                                <td className="px-6 py-2.5">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={p.imageUrl && !p.imageUrl.includes('placehold.co') && !p.imageUrl.includes('placehold.net') ? p.imageUrl : '/product.svg'} 
                                      className="w-8 h-8 rounded object-cover border border-slate-200" 
                                      alt={p.name}
                                      onError={(e) => {
                                        e.currentTarget.src = '/product.svg';
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <span className={`font-semibold block truncate max-w-[220px] ${'text-gray-900 font-bold'}`}>{p.name}</span>
                                      {p.description && <p className="text-[10px] text-gray-500 truncate max-w-[220px] mt-0.5">{p.description}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5">
                                  {p.type === 'STANDARD' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-primary/10 text-primary border border-primary/20">Estándar</span>}
                                  {p.type === 'COMBO' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Combo</span>}
                                  {p.type === 'SUBPRODUCT' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-primary/10 text-primary border border-primary/20">Subproducto</span>}
                                  {p.type === 'SERVICE' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">Servicio</span>}
                                </td>
                                <td className="px-6 py-3.5 text-gray-500 font-medium">{getCategoryName(p.categoryId)}</td>
                                <td className="px-6 py-3.5 font-semibold">${p.baseCost.toFixed(2)}</td>
                                <td className="px-6 py-3.5 font-bold text-emerald-500">${p.salePrice.toFixed(2)}</td>
                                <td className="px-6 py-3.5 text-gray-500 font-medium">{p.taxRate}%</td>
                                <td className="px-6 py-3.5 font-bold">
                                  {isService || p.inventoryType === 'VIRTUAL' ? (
                                    <span className="text-gray-400 italic font-medium">Virtual (N/A)</span>
                                  ) : stock > 0 ? (
                                    <span className="text-emerald-500">{stock} u.</span>
                                  ) : (
                                    <span className="text-red-500">Agotado</span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        if (p.id) {
                                          if (p.type === 'SERVICE') {
                                            setInlineFormMode('edit_service');
                                          } else {
                                            setInlineFormMode('edit_product');
                                          }
                                          setEditingProduct(p);
                                          scrollToForm();
                                        }
                                      }}
                                      className="p-1.5 rounded-card text-primary hover:bg-primary/10 transition-all border border-primary/10 bg-white dark:bg-transparent"
                                      title="Editar"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => p.id && handleDeleteProduct(p.id)}
                                      className="p-1.5 rounded-card text-red-500 hover:bg-red-500/10 transition-all border border-red-500/10 bg-white dark:bg-transparent"
                                      title="Eliminar"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* Formulario Inline */
              <div id="inline-form-container" className="animate-in slide-in-from-bottom duration-300">
                {inlineFormMode === 'create_product' || inlineFormMode === 'edit_product' ? (
                  <ProductCreationForm
                    key={editingProduct?.id || editingProduct?.type || 'new-product'}
                    isInline={true}
                    productToEdit={editingProduct}
                    showToast={showToast}
                    onClose={() => {
                      setInlineFormMode(null);
                      setEditingProduct(null);
                    }}
                    onSuccess={() => {
                      setInlineFormMode(null);
                      setEditingProduct(null);
                      loadCatalogData();
                    }}
                  />
                ) : (
                  <ServiceCreationForm
                    key={editingProduct?.id || 'new-service'}
                    isInline={true}
                    serviceToEdit={editingProduct}
                    onClose={() => {
                      setInlineFormMode(null);
                      setEditingProduct(null);
                    }}
                    onSuccess={() => {
                      setInlineFormMode(null);
                      setEditingProduct(null);
                      loadCatalogData();
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* --- TAB: CATEGORÍAS Y MARCAS --- */}
        {activeTab === 'categorias' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-end items-center mb-6">
              <button 
                onClick={() => setIsCatBrandOpen(true)}
                className="px-4 py-2 rounded-card font-bold text-xs bg-primary hover:bg-primary text-white flex items-center gap-1.5"
              >
                <SlidersHorizontal size={14} /> Configurar Categorías/Marcas
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Categorías Column */}
              <div className={`p-6 rounded-card border ${'bg-white border-gray-200'}`}>
                <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider ${'text-primary'}`}>
                  <Layers size={16} /> Categorías ({categories.length})
                </h3>
                <div className="space-y-3">
                  {categories.map(cat => (
                    <div key={cat.id} className={`p-3 rounded-card border flex items-center justify-between ${'bg-gray-50 border-gray-100'}`}>
                      <div>
                        <span className={`font-semibold ${'text-gray-800'}`}>{cat.name}</span>
                        {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marcas Column */}
              <div className={`p-6 rounded-card border ${'bg-white border-gray-200'}`}>
                <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider ${'text-purple-600'}`}>
                  <Award size={16} /> Marcas ({brands.length})
                </h3>
                <div className="space-y-3">
                  {brands.map(b => (
                    <div key={b.id} className={`p-3 rounded-card border flex items-center justify-between ${'bg-gray-50 border-gray-100'}`}>
                      <div>
                        <span className={`font-semibold ${'text-gray-800'}`}>{b.name}</span>
                        {b.manufacturer && <p className="text-xs text-gray-500">{b.manufacturer}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: KARDEX --- */}
        {activeTab === 'kardex' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">


            {/* Selector de Producto */}
            <div className={`p-5 rounded-card border grid grid-cols-1 md:grid-cols-2 gap-4 ${'bg-gray-50 border-gray-150'}`}>
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-gray-500">Seleccionar Producto Físico</label>
                <select
                  value={kardexProductId}
                  onChange={(e) => setKardexProductId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-card outline-none border text-xs cursor-pointer ${
                    'bg-white border-gray-200 text-gray-800'
                  }`}
                >
                  <option value="" className="text-black">-- Selecciona un producto --</option>
                  {products.filter(p => p.type !== 'SERVICE').map(p => (
                    <option key={p.id} value={p.id} className="text-black">{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-gray-500">Sucursal / Bodega</label>
                <select
                  value={kardexBranchId}
                  onChange={(e) => setKardexBranchId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-card outline-none border text-xs cursor-pointer ${
                    'bg-white border-gray-200 text-gray-800'
                  }`}
                >
                  {BRANCHES.map(b => (
                    <option key={b.id} value={b.id} className="text-black">{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {kardexProductId ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stock Actual Card */}
                  <div className={`p-5 rounded-card border ${'bg-emerald-50 border-emerald-200'}`}>
                    <span className="block text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">Saldo Actual</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${'text-gray-900'}`}>
                        {kardexHistory[0]?.balanceQuantity ?? 0}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">unidades</span>
                    </div>
                  </div>

                  {/* Costo Promedio Card */}
                  <div className={`p-5 rounded-card border ${'bg-primary-light border-primary/25'}`}>
                    <span className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">Costo Promedio Ponderado</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${'text-gray-900'}`}>
                        ${(kardexHistory[0]?.balanceAverageCost ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Valorización Card */}
                  <div className={`p-5 rounded-card border ${'bg-purple-50 border-purple-205'}`}>
                    <span className="block text-xs font-bold uppercase tracking-wider text-purple-500 mb-1">Valor Total del Inventario</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${'text-gray-900'}`}>
                        ${((kardexHistory[0]?.balanceQuantity ?? 0) * (kardexHistory[0]?.balanceAverageCost ?? 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kardex Transactions Table */}
                <div className={`rounded-card border overflow-hidden transition-all ${
                  'border-slate-200/80 bg-white'
                }`}>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className={`text-xs uppercase font-bold tracking-wider ${
                        'bg-slate-50 text-slate-600 border-b border-slate-100'
                      }`}>
                        <tr>
                          <th className="px-6 py-3.5">Fecha</th>
                          <th className="px-6 py-3.5">Tipo Operación</th>
                          <th className="px-6 py-3.5">Referencia Doc</th>
                          <th className="px-6 py-3.5">Cantidad Movimiento</th>
                          <th className="px-6 py-3.5">Costo Operación</th>
                          <th className="px-6 py-3.5">Total Operación</th>
                          <th className="px-6 py-3.5">Saldo Cantidad</th>
                          <th className="px-6 py-3.5">Saldo Costo Prom.</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${'divide-slate-100'}`}>
                        {kardexHistory.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No hay movimientos registrados para este producto en la sucursal seleccionada.</td>
                          </tr>
                        ) : (
                          kardexHistory.map(tx => {
                            const isEntry = tx.quantity > 0;
                            return (
                              <tr key={tx.id} className={`transition-colors ${'hover:bg-slate-50/40'}`}>
                                <td className="px-6 py-3.5 text-gray-500 font-medium">{new Date(tx.date as any).toLocaleString('es-ES')}</td>
                                <td className="px-6 py-3.5">
                                  {tx.type === 'PURCHASE_RECEIPT' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-green-500/10 text-green-400">Ingreso / Compra</span>}
                                  {tx.type === 'CUSTOMER_RETURN' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-emerald-500/10 text-emerald-400">Devolución Cliente</span>}
                                  {tx.type === 'POSITIVE_ADJUSTMENT' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-teal-500/10 text-teal-400">Ajuste Positivo</span>}
                                  {tx.type === 'SALE' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-red-500/10 text-red-400">Egreso / Venta</span>}
                                  {tx.type === 'TRANSFER_OUT' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-purple-500/10 text-purple-400">Salida por Traslado</span>}
                                  {tx.type === 'NEGATIVE_ADJUSTMENT' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-yellow-500/10 text-yellow-400">Ajuste Negativo</span>}
                                  {tx.type === 'SHRINKAGE' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-orange-500/10 text-orange-400">Mermas / Pérdida</span>}
                                  {tx.type === 'MASSIVE_ZERO' && <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-red-650/20 text-red-500 border border-red-500/10">Cero Inventario</span>}
                                </td>
                                <td className="px-6 py-3.5 font-mono text-xs text-gray-500 font-bold">{tx.referenceId}</td>
                                <td className={`px-6 py-3.5 font-bold ${isEntry ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {isEntry ? `+${tx.quantity}` : tx.quantity}
                                </td>
                                <td className="px-6 py-3.5 font-mono">${tx.unitCost.toFixed(2)}</td>
                                <td className="px-6 py-3.5 font-mono">${tx.totalCost.toFixed(2)}</td>
                                <td className="px-6 py-3.5 font-bold">{tx.balanceQuantity}</td>
                                <td className="px-6 py-3.5 font-extrabold text-primary">${tx.balanceAverageCost.toFixed(2)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-card border flex flex-col items-center justify-center p-8 text-center ${'bg-white/50 border-gray-200'}`}>
                <Database size={32} className={`mb-4 ${'text-emerald-600'}`} />
                <p className={'text-gray-500'}>Selecciona un producto físico para ver su Kardex de transacciones.</p>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: TRANSFERENCIAS --- */}
        {activeTab === 'transferencias' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            {/* FILTROS Y ACCIONES */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
              <div>
                <button 
                  onClick={() => setIsTransferOpen(true)}
                  className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-card text-xs font-bold transition-all bg-purple-600 hover:bg-purple-550 text-white`}
                >
                  <PlusCircle size={15} /> Nueva Transferencia
                </button>
              </div>
            </div>

            <div className={`rounded-card border overflow-hidden transition-all ${
              'border-slate-200/80 bg-white'
            }`}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className={`text-xs uppercase font-bold tracking-wider ${
                    'bg-slate-50 text-slate-600 border-b border-slate-100'
                  }`}>
                    <tr>
                      <th className="px-6 py-3.5">Fecha</th>
                      <th className="px-6 py-3.5">Tipo</th>
                      <th className="px-6 py-3.5">Origen</th>
                      <th className="px-6 py-3.5">Destino</th>
                      <th className="px-6 py-3.5">Cant. Productos</th>
                      <th className="px-6 py-3.5">Costo Envío</th>
                      <th className="px-6 py-3.5">Responsable</th>
                      <th className="px-6 py-3.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${'divide-slate-100'}`}>
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No hay transferencias registradas.</td>
                      </tr>
                    ) : (
                      transfers.map(tr => {
                        const fromName = BRANCHES.find(b => b.id === tr.sourceBranchId)?.name || 'Desconocida';
                        const toName = BRANCHES.find(b => b.id === tr.targetBranchId)?.name || 'Desconocida';
                        return (
                          <tr key={tr.id} className={`transition-colors ${'hover:bg-slate-50/40'}`}>
                            <td className="px-6 py-3.5 text-gray-500 font-medium">{new Date(tr.createdAt).toLocaleString('es-ES')}</td>
                            <td className="px-6 py-3.5">
                              {tr.type === 'INTERNAL' ? (
                                <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-primary/10 text-primary border border-primary/20">Interna</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-550/10">Externa</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 font-semibold">{fromName}</td>
                            <td className="px-6 py-3.5 font-semibold">{toName}</td>
                            <td className="px-6 py-3.5 font-bold">{tr.items?.length ?? 0} ítems</td>
                            <td className="px-6 py-3.5 font-mono">${(tr.transferCost ?? 0).toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-gray-400 font-medium">{tr.createdBy}</td>
                            <td className="px-6 py-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-green-500/10 text-green-400 flex items-center justify-center gap-1 w-24 mx-auto border border-green-500/10">
                                <CheckCircle size={10} /> Completado
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: AJUSTES --- */}
        {activeTab === 'ajustes' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-end items-center mb-6">
              <button 
                onClick={() => setIsAdjustmentOpen(true)}
                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-card text-xs font-bold transition-all bg-red-600 hover:bg-red-550 text-white`}
              >
                <RefreshCw size={15} /> Nuevo Ajuste
              </button>
            </div>

            <div className={`rounded-card border overflow-hidden transition-all ${
              'border-slate-200/80 bg-white'
            }`}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className={`text-xs uppercase font-bold tracking-wider ${
                    'bg-slate-50 text-slate-600 border-b border-slate-100'
                  }`}>
                    <tr>
                      <th className="px-6 py-3.5">Fecha</th>
                      <th className="px-6 py-3.5">Tipo Ajuste</th>
                      <th className="px-6 py-3.5">Sucursal</th>
                      <th className="px-6 py-3.5">Justificación / Motivo</th>
                      <th className="px-6 py-3.5">Cant. Ítems</th>
                      <th className="px-6 py-3.5">Autorizado Por</th>
                      <th className="px-6 py-3.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${'divide-slate-100'}`}>
                    {adjustments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No se han registrado ajustes.</td>
                      </tr>
                    ) : (
                      adjustments.map(ad => {
                        const branchName = BRANCHES.find(b => b.id === ad.branchId)?.name || 'Desconocida';
                        const isZero = ad.type === 'ZERO_INVENTORY';
                        return (
                          <tr key={ad.id} className={`transition-colors ${'hover:bg-slate-50/40'}`}>
                            <td className="px-6 py-3.5 text-gray-500 font-medium">{new Date(ad.createdAt).toLocaleString('es-ES')}</td>
                            <td className="px-6 py-3.5">
                              {isZero ? (
                                <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-red-600/20 text-red-500 flex items-center gap-1 border border-red-500/20">
                                  <ShieldAlert size={10} /> Cero Inventario
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-primary/10 text-primary border border-primary/20">Manual</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 font-semibold">{branchName}</td>
                            <td className="px-6 py-3.5 max-w-xs truncate" title={ad.reason}>{ad.reason}</td>
                            <td className="px-6 py-3.5 font-bold">{ad.items?.length ?? 0} items</td>
                            <td className="px-6 py-3.5 text-gray-400 font-medium">{ad.confirmedBy}</td>
                            <td className="px-6 py-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-card text-xs font-bold bg-green-500/10 text-green-400 flex items-center justify-center gap-1 w-24 mx-auto border border-green-500/10">
                                <CheckCircle size={10} /> Aplicado
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL DIALOGS --- */}
      {showProductTypeSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-300">
          <div className={`w-full max-w-md p-6 rounded-card border transition-all ${
            'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="text-primary" size={18} />
                Seleccionar Tipo de Producto
              </h3>
              <button 
                onClick={() => setShowProductTypeSelector(false)}
                className={`p-1.5 rounded-lg transition-all ${
                  'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <X size={16} />
              </button>
            </div>
            
            <p className={`text-xs mb-4 ${'text-gray-500'}`}>
              ¿Qué tipo de producto deseas registrar en el catálogo?
            </p>
            
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setInlineFormMode('create_product');
                  setEditingProduct({ type: 'STANDARD' });
                  setShowProductTypeSelector(false);
                  scrollToForm();
                }}
                className={`w-full p-4 rounded-card border text-left transition-all flex items-start gap-3.5 group ${
                  'border-slate-100 bg-slate-50 hover:bg-primary/5 hover:border-primary/30'
                }`}
              >
                <div className={`p-2.5 rounded-card bg-primary/10 text-primary group-hover:scale-110 transition-transform`}>
                  <Package size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold">Producto Estándar</span>
                  <span className={`block text-xs mt-0.5 ${'text-gray-500'}`}>
                    Productos individuales sin variantes ni agrupaciones.
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setInlineFormMode('create_product');
                  setEditingProduct({ type: 'SUBPRODUCT' });
                  setShowProductTypeSelector(false);
                  scrollToForm();
                }}
                className={`w-full p-4 rounded-card border text-left transition-all flex items-start gap-3.5 group ${
                  'border-slate-100 bg-slate-50 hover:bg-primary/5 hover:border-primary/30'
                }`}
              >
                <div className={`p-2.5 rounded-card bg-primary/10 text-primary group-hover:scale-110 transition-transform`}>
                  <Layers size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold">Subproducto / Variante</span>
                  <span className={`block text-xs mt-0.5 ${'text-gray-500'}`}>
                    Mismo artículo con variaciones (talla, color o dimensiones).
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setInlineFormMode('create_product');
                  setEditingProduct({ type: 'COMBO' });
                  setShowProductTypeSelector(false);
                  scrollToForm();
                }}
                className={`w-full p-4 rounded-card border text-left transition-all flex items-start gap-3.5 group ${
                  'border-slate-100 bg-slate-50 hover:bg-purple-500/5 hover:border-purple-500/30'
                }`}
              >
                <div className={`p-2.5 rounded-card bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform`}>
                  <Box size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold">Combo / Kit</span>
                  <span className={`block text-xs mt-0.5 ${'text-gray-500'}`}>
                    Paquete que agrupa múltiples productos estándar o servicios.
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {isCatBrandOpen && (
        <CategoryBrandModal 
          onClose={() => setIsCatBrandOpen(false)} 
          onChanged={loadCatalogData}
        />
      )}

      {isTransferOpen && (
        <TransferModal 
          onClose={() => setIsTransferOpen(false)} 
          onSuccess={() => {
            setIsTransferOpen(false);
            loadCatalogData();
          }}
        />
      )}

      {isAdjustmentOpen && (
        <AdjustmentModal 
          onClose={() => setIsAdjustmentOpen(false)} 
          onSuccess={() => {
            setIsAdjustmentOpen(false);
            loadCatalogData();
          }}
        />
      )}
    </div>
  );
}
