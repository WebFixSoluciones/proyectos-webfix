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
  isDarkMode: boolean;
}

const BRANCHES = [
  { id: 'sucursal-central-uuid', name: 'Sucursal Central (Principal)' },
  { id: 'sucursal-sur-uuid', name: 'Sucursal Sur' },
  { id: 'sucursal-norte-uuid', name: 'Sucursal Norte' }
];

export default function InventoryModule({ isDarkMode }: InventoryModuleProps) {
  const [activeTab, setActiveTab] = useState('productos');
  
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
    if (!confirm("¿Está seguro de eliminar este producto/servicio?")) return;
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
  const tableHeaderClass = isDarkMode ? 'bg-white/5 text-gray-400 border-white/10' : 'bg-gray-100 text-gray-600 border-gray-200';
  const tableRowClass = isDarkMode ? 'hover:bg-white/5 border-white/5' : 'hover:bg-black/5 border-gray-100';

  return (
    <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
      
      {/* Sub-Tabs de Inventario */}
      <div className={`flex items-center gap-3 px-8 py-3.5 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]' : 'border-primary/10 bg-primary-light'}`}>
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
                    ? (isDarkMode ? 'bg-primary/20 text-primary border-primary/30 shadow-sm' : 'bg-primary text-white border-primary shadow-sm')
                    : (isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'border-transparent text-black hover:text-black hover:bg-black/5')
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
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-xs font-bold transition-all hover-lift shadow-md bg-primary text-white hover:bg-primary/95`}
                    >
                      <Plus size={15} /> Nuevo Producto
                    </button>
                    <button 
                      onClick={() => {
                        setInlineFormMode('create_service');
                        setEditingProduct(null);
                        setTimeout(() => {
                          document.getElementById('inline-form-container')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-xs font-bold transition-all hover-lift shadow-md bg-indigo-600 text-white hover:bg-indigo-550`}
                    >
                      <Briefcase size={15} /> Nuevo Servicio
                    </button>
                    <button 
                      onClick={() => setIsCatBrandOpen(true)}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-xs font-bold transition-all border shadow-sm ${
                        isDarkMode ? 'bg-white/5 border-white/10 text-gray-305 hover:bg-white/10' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Tag size={15} /> Categorías/Marcas
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] border w-full sm:w-64 transition-all focus-within:ring-1 focus-within:ring-primary/25 ${
                      isDarkMode 
                        ? 'bg-[#151722]/80 border-white/10 focus-within:border-primary/50' 
                        : 'bg-white border-slate-200 focus-within:border-primary'
                    }`}>
                      <Search size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
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
                      className={`px-3 py-2 rounded-[10px] border text-xs font-medium outline-none transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'bg-[#151722]/80 border-white/10 text-gray-300 focus:border-primary/50' 
                          : 'bg-white border-slate-200 text-slate-700 focus:border-primary'
                      }`}
                    >
                      <option value="" className="text-black">Todas las Categorías</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                      ))}
                    </select>

                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className={`px-3 py-2 rounded-[10px] border text-xs font-medium outline-none transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'bg-[#151722]/80 border-white/10 text-gray-300 focus:border-primary/50' 
                          : 'bg-white border-slate-200 text-slate-700 focus:border-primary'
                      }`}
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
                <div className={`rounded-[10px] border overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
                  isDarkMode 
                    ? 'border-white/5 bg-[#0f111a]/85 shadow-lg shadow-black/40' 
                    : 'border-slate-200/80 bg-white'
                }`}>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                        isDarkMode 
                          ? 'bg-black/35 text-slate-400 border-b border-white/5' 
                          : 'bg-slate-50 text-slate-600 border-b border-slate-100'
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
                      <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
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
                              <tr key={p.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                                <td className={`px-6 py-3.5 font-mono text-[10px] font-bold ${isDarkMode ? '' : 'text-black font-semibold'}`}>{p.sku}</td>
                                <td className="px-6 py-3.5">
                                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900 font-bold'}`}>{p.name}</span>
                                  {p.description && <p className="text-[10px] text-gray-500 mt-0.5">{p.description}</p>}
                                </td>
                                <td className="px-6 py-3.5">
                                  {p.type === 'STANDARD' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">Estándar</span>}
                                  {p.type === 'COMBO' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Combo</span>}
                                  {p.type === 'SUBPRODUCT' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">Subproducto</span>}
                                  {p.type === 'SERVICE' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">Servicio</span>}
                                </td>
                                <td className="px-6 py-3.5 text-gray-500 font-medium">{getCategoryName(p.categoryId)}</td>
                                <td className="px-6 py-3.5 font-semibold">${p.baseCost.toFixed(2)}</td>
                                <td className="px-6 py-3.5 font-bold text-emerald-500">${p.salePrice.toFixed(2)}</td>
                                <td className="px-6 py-3.5 text-gray-500 font-medium">{p.taxRate}%</td>
                                <td className="px-6 py-3.5 font-bold">
                                  {isService ? (
                                    <span className="text-gray-400 italic font-medium">N/A</span>
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
                                          setTimeout(() => {
                                            document.getElementById('inline-form-container')?.scrollIntoView({ behavior: 'smooth' });
                                          }, 100);
                                        }
                                      }}
                                      className="p-1.5 rounded-[10px] text-primary hover:bg-primary/10 transition-all border border-primary/10 bg-white dark:bg-transparent shadow-sm"
                                      title="Editar"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => p.id && handleDeleteProduct(p.id)}
                                      className="p-1.5 rounded-[10px] text-red-500 hover:bg-red-500/10 transition-all border border-red-500/10 bg-white dark:bg-transparent shadow-sm"
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
                    isDarkMode={isDarkMode}
                    isInline={true}
                    productToEdit={editingProduct}
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
                    isDarkMode={isDarkMode}
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
                className="px-4 py-2 rounded-xl font-bold text-xs bg-primary hover:bg-primary text-white flex items-center gap-1.5"
              >
                <SlidersHorizontal size={14} /> Configurar Categorías/Marcas
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Categorías Column */}
              <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/10 border-white/10' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider ${isDarkMode ? 'text-primary' : 'text-primary'}`}>
                  <Layers size={16} /> Categorías ({categories.length})
                </h3>
                <div className="space-y-3">
                  {categories.map(cat => (
                    <div key={cat.id} className={`p-3 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                      <div>
                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{cat.name}</span>
                        {cat.description && <p className="text-[10px] text-gray-500">{cat.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marcas Column */}
              <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/10 border-white/10' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  <Award size={16} /> Marcas ({brands.length})
                </h3>
                <div className="space-y-3">
                  {brands.map(b => (
                    <div key={b.id} className={`p-3 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                      <div>
                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{b.name}</span>
                        {b.manufacturer && <p className="text-[10px] text-gray-500">{b.manufacturer}</p>}
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
            <div className={`p-5 rounded-[10px] border grid grid-cols-1 md:grid-cols-2 gap-4 ${isDarkMode ? 'bg-[#0f111a]/85 border-white/5' : 'bg-gray-50 border-gray-150'}`}>
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-gray-500">Seleccionar Producto Físico</label>
                <select
                  value={kardexProductId}
                  onChange={(e) => setKardexProductId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-[10px] outline-none border text-xs cursor-pointer ${
                    isDarkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'
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
                  className={`w-full px-3 py-2 rounded-[10px] outline-none border text-xs cursor-pointer ${
                    isDarkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'
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
                  <div className={`p-5 rounded-[10px] border ${isDarkMode ? 'bg-[#1a2e26]/30 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200 shadow-sm'}`}>
                    <span className="block text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">Saldo Actual</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {kardexHistory[0]?.balanceQuantity ?? 0}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">unidades</span>
                    </div>
                  </div>

                  {/* Costo Promedio Card */}
                  <div className={`p-5 rounded-[10px] border ${isDarkMode ? 'bg-[#1d263b]/30 border-primary/20' : 'bg-primary-light border-primary/25 shadow-sm'}`}>
                    <span className="block text-xs font-bold uppercase tracking-wider text-primary mb-1">Costo Promedio Ponderado</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${(kardexHistory[0]?.balanceAverageCost ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Valorización Card */}
                  <div className={`p-5 rounded-[10px] border ${isDarkMode ? 'bg-[#291e36]/30 border-purple-500/20' : 'bg-purple-50 border-purple-205 shadow-sm'}`}>
                    <span className="block text-xs font-bold uppercase tracking-wider text-purple-500 mb-1">Valor Total del Inventario</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${((kardexHistory[0]?.balanceQuantity ?? 0) * (kardexHistory[0]?.balanceAverageCost ?? 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kardex Transactions Table */}
                <div className={`rounded-[10px] border overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
                  isDarkMode 
                    ? 'border-white/5 bg-[#0f111a]/85 shadow-lg shadow-black/40' 
                    : 'border-slate-200/80 bg-white'
                }`}>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                        isDarkMode 
                          ? 'bg-black/35 text-slate-400 border-b border-white/5' 
                          : 'bg-slate-50 text-slate-600 border-b border-slate-100'
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
                      <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                        {kardexHistory.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No hay movimientos registrados para este producto en la sucursal seleccionada.</td>
                          </tr>
                        ) : (
                          kardexHistory.map(tx => {
                            const isEntry = tx.quantity > 0;
                            return (
                              <tr key={tx.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                                <td className="px-6 py-3.5 text-gray-500 font-medium">{new Date(tx.date as any).toLocaleString('es-ES')}</td>
                                <td className="px-6 py-3.5">
                                  {tx.type === 'PURCHASE_RECEIPT' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-green-500/10 text-green-400">Ingreso / Compra</span>}
                                  {tx.type === 'CUSTOMER_RETURN' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Devolución Cliente</span>}
                                  {tx.type === 'POSITIVE_ADJUSTMENT' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-teal-500/10 text-teal-400">Ajuste Positivo</span>}
                                  {tx.type === 'SALE' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-red-500/10 text-red-400">Egreso / Venta</span>}
                                  {tx.type === 'TRANSFER_OUT' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-purple-500/10 text-purple-400">Salida por Traslado</span>}
                                  {tx.type === 'NEGATIVE_ADJUSTMENT' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-yellow-500/10 text-yellow-400">Ajuste Negativo</span>}
                                  {tx.type === 'SHRINKAGE' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-orange-500/10 text-orange-400">Mermas / Pérdida</span>}
                                  {tx.type === 'MASSIVE_ZERO' && <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-red-650/20 text-red-500 border border-red-500/10">Cero Inventario</span>}
                                </td>
                                <td className="px-6 py-3.5 font-mono text-[10px] text-gray-500 font-bold">{tx.referenceId}</td>
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
              <div className={`rounded-3xl border flex flex-col items-center justify-center p-8 text-center ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-200'}`}>
                <Database size={32} className={`mb-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Selecciona un producto físico para ver su Kardex de transacciones.</p>
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
                  className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-xs font-bold transition-all shadow-md bg-purple-600 hover:bg-purple-550 text-white`}
                >
                  <PlusCircle size={15} /> Nueva Transferencia
                </button>
              </div>
            </div>

            <div className={`rounded-[10px] border overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
              isDarkMode 
                ? 'border-white/5 bg-[#0f111a]/85 shadow-lg shadow-black/40' 
                : 'border-slate-200/80 bg-white'
            }`}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                    isDarkMode 
                      ? 'bg-black/35 text-slate-400 border-b border-white/5' 
                      : 'bg-slate-50 text-slate-600 border-b border-slate-100'
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
                  <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No hay transferencias registradas.</td>
                      </tr>
                    ) : (
                      transfers.map(tr => {
                        const fromName = BRANCHES.find(b => b.id === tr.sourceBranchId)?.name || 'Desconocida';
                        const toName = BRANCHES.find(b => b.id === tr.targetBranchId)?.name || 'Desconocida';
                        return (
                          <tr key={tr.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                            <td className="px-6 py-3.5 text-gray-500 font-medium">{new Date(tr.createdAt).toLocaleString('es-ES')}</td>
                            <td className="px-6 py-3.5">
                              {tr.type === 'INTERNAL' ? (
                                <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">Interna</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-550/10">Externa</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 font-semibold">{fromName}</td>
                            <td className="px-6 py-3.5 font-semibold">{toName}</td>
                            <td className="px-6 py-3.5 font-bold">{tr.items?.length ?? 0} ítems</td>
                            <td className="px-6 py-3.5 font-mono">${(tr.transferCost ?? 0).toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-gray-400 font-medium">{tr.createdBy}</td>
                            <td className="px-6 py-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-green-500/10 text-green-400 flex items-center justify-center gap-1 w-24 mx-auto border border-green-500/10">
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
                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-xs font-bold transition-all shadow-md bg-red-600 hover:bg-red-550 text-white`}
              >
                <RefreshCw size={15} /> Nuevo Ajuste
              </button>
            </div>

            <div className={`rounded-[10px] border overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
              isDarkMode 
                ? 'border-white/5 bg-[#0f111a]/85 shadow-lg shadow-black/40' 
                : 'border-slate-200/80 bg-white'
            }`}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                    isDarkMode 
                      ? 'bg-black/35 text-slate-400 border-b border-white/5' 
                      : 'bg-slate-50 text-slate-600 border-b border-slate-100'
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
                  <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                    {adjustments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No se han registrado ajustes.</td>
                      </tr>
                    ) : (
                      adjustments.map(ad => {
                        const branchName = BRANCHES.find(b => b.id === ad.branchId)?.name || 'Desconocida';
                        const isZero = ad.type === 'ZERO_INVENTORY';
                        return (
                          <tr key={ad.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                            <td className="px-6 py-3.5 text-gray-500 font-medium">{new Date(ad.createdAt).toLocaleString('es-ES')}</td>
                            <td className="px-6 py-3.5">
                              {isZero ? (
                                <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-red-600/20 text-red-500 flex items-center gap-1 border border-red-500/20">
                                  <ShieldAlert size={10} /> Cero Inventario
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">Manual</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 font-semibold">{branchName}</td>
                            <td className="px-6 py-3.5 max-w-xs truncate" title={ad.reason}>{ad.reason}</td>
                            <td className="px-6 py-3.5 font-bold">{ad.items?.length ?? 0} items</td>
                            <td className="px-6 py-3.5 text-gray-400 font-medium">{ad.confirmedBy}</td>
                            <td className="px-6 py-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-[10px] text-[10px] font-bold bg-green-500/10 text-green-400 flex items-center justify-center gap-1 w-24 mx-auto border border-green-500/10">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-300">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all ${
            isDarkMode ? 'bg-[#121214] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="text-primary" size={18} />
                Seleccionar Tipo de Producto
              </h3>
              <button 
                onClick={() => setShowProductTypeSelector(false)}
                className={`p-1.5 rounded-lg transition-all ${
                  isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <X size={16} />
              </button>
            </div>
            
            <p className={`text-xs mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ¿Qué tipo de producto deseas registrar en el catálogo?
            </p>
            
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setInlineFormMode('create_product');
                  setEditingProduct({ type: 'STANDARD' });
                  setShowProductTypeSelector(false);
                  setTimeout(() => {
                    document.getElementById('inline-form-container')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 group ${
                  isDarkMode 
                    ? 'border-white/5 bg-white/[0.02] hover:bg-primary/10 hover:border-primary/30' 
                    : 'border-slate-100 bg-slate-50 hover:bg-primary/5 hover:border-primary/30'
                }`}
              >
                <div className={`p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform`}>
                  <Package size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold">Producto Estándar</span>
                  <span className={`block text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Productos individuales sin variantes ni agrupaciones.
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setInlineFormMode('create_product');
                  setEditingProduct({ type: 'SUBPRODUCT' });
                  setShowProductTypeSelector(false);
                  setTimeout(() => {
                    document.getElementById('inline-form-container')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 group ${
                  isDarkMode 
                    ? 'border-white/5 bg-white/[0.02] hover:bg-primary/10 hover:border-primary/30' 
                    : 'border-slate-100 bg-slate-50 hover:bg-primary/5 hover:border-primary/30'
                }`}
              >
                <div className={`p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform`}>
                  <Layers size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold">Subproducto / Variante</span>
                  <span className={`block text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Mismo artículo con variaciones (talla, color o dimensiones).
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setInlineFormMode('create_product');
                  setEditingProduct({ type: 'COMBO' });
                  setShowProductTypeSelector(false);
                  setTimeout(() => {
                    document.getElementById('inline-form-container')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 group ${
                  isDarkMode 
                    ? 'border-white/5 bg-white/[0.02] hover:bg-purple-500/10 hover:border-purple-500/30' 
                    : 'border-slate-100 bg-slate-50 hover:bg-purple-500/5 hover:border-purple-500/30'
                }`}
              >
                <div className={`p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform`}>
                  <Box size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold">Combo / Kit</span>
                  <span className={`block text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
          isDarkMode={isDarkMode} 
          onClose={() => setIsCatBrandOpen(false)} 
          onChanged={loadCatalogData}
        />
      )}

      {isTransferOpen && (
        <TransferModal 
          isDarkMode={isDarkMode} 
          onClose={() => setIsTransferOpen(false)} 
          onSuccess={() => {
            setIsTransferOpen(false);
            loadCatalogData();
          }}
        />
      )}

      {isAdjustmentOpen && (
        <AdjustmentModal 
          isDarkMode={isDarkMode} 
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
