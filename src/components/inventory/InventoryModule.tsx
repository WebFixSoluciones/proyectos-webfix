import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, Tag, BarChart3, 
  ArrowRightLeft, Settings, Database, RefreshCw, 
  Trash2, Briefcase, PlusCircle, CheckCircle, ShieldAlert,
  MapPin, SlidersHorizontal, Layers, Award
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
  
  // Modals open states
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);
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
        
        {/* --- TAB: PRODUCTOS & SERVICIOS --- */}
        {activeTab === 'productos' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Package className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                  Catálogo de Productos y Servicios
                </h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Gestiona productos estándar, combos, subproductos y tarifas de servicios.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => setIsProductOpen(true)}
                  className="px-3.5 py-2 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-1.5 transition-all hover:scale-105"
                >
                  <Plus size={16} /> Nuevo Producto
                </button>
                <button 
                  onClick={() => setIsServiceOpen(true)}
                  className="px-3.5 py-2 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-1.5 transition-all hover:scale-105"
                >
                  <Briefcase size={16} /> Nuevo Servicio
                </button>
                <button 
                  onClick={() => setIsCatBrandOpen(true)}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs border flex items-center gap-1.5 transition-all hover:scale-105 ${
                    isDarkMode ? 'border-white/10 hover:bg-white/5 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Tag size={16} /> Categorías/Marcas
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm ${
              isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-150'
            }`}>
              <div className="relative w-full md:w-80">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Buscar por SKU o nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none text-xs ${
                    isDarkMode ? 'bg-black/20 border-white/10 text-white focus:border-blue-500' : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500'
                  }`}
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`px-3 py-2 rounded-xl border outline-none text-xs ${
                    isDarkMode ? 'bg-black/20 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <option value="">Todas las Categorías</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className={`px-3 py-2 rounded-xl border outline-none text-xs ${
                    isDarkMode ? 'bg-black/20 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <option value="">Todos los Tipos</option>
                  <option value="STANDARD">Estándar</option>
                  <option value="COMBO">Combo</option>
                  <option value="SUBPRODUCT">Subproducto</option>
                  <option value="SERVICE">Servicio</option>
                </select>
              </div>
            </div>
            
            {/* Products Table */}
            <div className={`flex-1 rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="overflow-x-auto w-full h-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b ${tableHeaderClass}`}>
                      <th className="p-4">SKU</th>
                      <th className="p-4">Nombre</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Categoría</th>
                      <th className="p-4">Costo Base</th>
                      <th className="p-4">Precio Venta</th>
                      <th className="p-4">Impuesto</th>
                      <th className="p-4">Stock Actual</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500 font-bold">Cargando catálogo...</td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500">No se encontraron productos ni servicios.</td>
                      </tr>
                    ) : (
                      filteredProducts.map(p => {
                        const stock = stocks[p.id || ''] !== undefined ? stocks[p.id || ''] : 0;
                        const isService = p.type === 'SERVICE';
                        
                        return (
                          <tr key={p.id} className={`border-b ${tableRowClass}`}>
                            <td className="p-4 font-mono font-bold">{p.sku}</td>
                            <td className="p-4">
                              <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.name}</span>
                              {p.description && <p className="text-[10px] text-gray-500 mt-0.5">{p.description}</p>}
                            </td>
                            <td className="p-4">
                              {p.type === 'STANDARD' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Estándar</span>}
                              {p.type === 'COMBO' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Combo</span>}
                              {p.type === 'SUBPRODUCT' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Subproducto</span>}
                              {p.type === 'SERVICE' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">Servicio</span>}
                            </td>
                            <td className="p-4 text-gray-500">{getCategoryName(p.categoryId)}</td>
                            <td className="p-4 font-semibold">${p.baseCost.toFixed(2)}</td>
                            <td className="p-4 font-bold text-emerald-500">${p.salePrice.toFixed(2)}</td>
                            <td className="p-4 text-gray-500">{p.taxRate}%</td>
                            <td className="p-4 font-bold">
                              {isService ? (
                                <span className="text-gray-400 italic">N/A</span>
                              ) : stock > 0 ? (
                                <span className="text-emerald-500">{stock} u.</span>
                              ) : (
                                <span className="text-red-500">Agotado</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => p.id && handleDeleteProduct(p.id)}
                                className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 size={15} />
                              </button>
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

        {/* --- TAB: CATEGORÍAS Y MARCAS --- */}
        {activeTab === 'categorias' && (
          <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Tag className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} /> Categorías y Marcas
                </h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Organización y marcas asignadas para el catálogo.</p>
              </div>
              <button 
                onClick={() => setIsCatBrandOpen(true)}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5"
              >
                <SlidersHorizontal size={14} /> Configurar Categorías/Marcas
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Categorías Column */}
              <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/10 border-white/10' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
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
            <div>
              <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <BarChart3 className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} /> Kardex (Promedio Ponderado)
              </h1>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Historial de entradas, salidas y valuación del inventario por sucursal.</p>
            </div>

            {/* Selector de Producto */}
            <div className={`p-5 rounded-2xl border grid grid-cols-1 md:grid-cols-2 gap-4 ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-150'}`}>
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-gray-400">Seleccionar Producto Físico</label>
                <select
                  value={kardexProductId}
                  onChange={(e) => setKardexProductId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl outline-none border text-xs ${
                    isDarkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'
                  }`}
                >
                  <option value="">-- Selecciona un producto --</option>
                  {products.filter(p => p.type !== 'SERVICE').map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wider text-gray-400">Sucursal / Bodega</label>
                <select
                  value={kardexBranchId}
                  onChange={(e) => setKardexBranchId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl outline-none border text-xs ${
                    isDarkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'
                  }`}
                >
                  {BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {kardexProductId ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stock Actual Card */}
                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#1a2e26]/30 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                    <span className="block text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">Saldo Actual</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {kardexHistory[0]?.balanceQuantity ?? 0}
                      </span>
                      <span className="text-xs text-gray-500">unidades</span>
                    </div>
                  </div>

                  {/* Costo Promedio Card */}
                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#1d263b]/30 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                    <span className="block text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">Costo Promedio Ponderado</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${(kardexHistory[0]?.balanceAverageCost ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Valorización Card */}
                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#291e36]/30 border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
                    <span className="block text-xs font-bold uppercase tracking-wider text-purple-500 mb-1">Valor Total del Inventario</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${((kardexHistory[0]?.balanceQuantity ?? 0) * (kardexHistory[0]?.balanceAverageCost ?? 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kardex Transactions Table */}
                <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={`border-b ${tableHeaderClass}`}>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Tipo Operación</th>
                          <th className="p-3">Referencia Doc</th>
                          <th className="p-3">Cantidad Movimiento</th>
                          <th className="p-3">Costo Operación</th>
                          <th className="p-3">Total Operación</th>
                          <th className="p-3">Saldo Cantidad</th>
                          <th className="p-3">Saldo Costo Prom.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {kardexHistory.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-gray-500">No hay movimientos registrados para este producto en la sucursal seleccionada.</td>
                          </tr>
                        ) : (
                          kardexHistory.map(tx => {
                            const isEntry = tx.quantity > 0;
                            return (
                              <tr key={tx.id} className={`border-b ${tableRowClass}`}>
                                <td className="p-3 text-gray-500">{new Date(tx.date as any).toLocaleString('es-ES')}</td>
                                <td className="p-3">
                                  {tx.type === 'PURCHASE_RECEIPT' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400">Ingreso / Compra</span>}
                                  {tx.type === 'CUSTOMER_RETURN' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">Devolución Cliente</span>}
                                  {tx.type === 'POSITIVE_ADJUSTMENT' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400">Ajuste Positivo</span>}
                                  {tx.type === 'SALE' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400">Egreso / Venta</span>}
                                  {tx.type === 'TRANSFER_OUT' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400">Salida por Traslado</span>}
                                  {tx.type === 'NEGATIVE_ADJUSTMENT' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400">Ajuste Negativo</span>}
                                  {tx.type === 'SHRINKAGE' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400">Mermas / Pérdida</span>}
                                  {tx.type === 'MASSIVE_ZERO' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-red-500">Cero Inventario</span>}
                                </td>
                                <td className="p-3 font-mono text-[10px] text-gray-400">{tx.referenceId}</td>
                                <td className={`p-3 font-bold ${isEntry ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {isEntry ? `+${tx.quantity}` : tx.quantity}
                                </td>
                                <td className="p-3">${tx.unitCost.toFixed(2)}</td>
                                <td className="p-3">${tx.totalCost.toFixed(2)}</td>
                                <td className="p-3 font-bold">{tx.balanceQuantity}</td>
                                <td className="p-3 font-semibold text-blue-500">${tx.balanceAverageCost.toFixed(2)}</td>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <ArrowRightLeft className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} /> Transferencias entre Sucursales
                </h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Historial de movimientos y envíos de stock físico.</p>
              </div>
              <button 
                onClick={() => setIsTransferOpen(true)}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5"
              >
                <PlusCircle size={14} /> Nueva Transferencia
              </button>
            </div>

            <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b ${tableHeaderClass}`}>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Origen</th>
                      <th className="p-3">Destino</th>
                      <th className="p-3">Cant. Productos</th>
                      <th className="p-3">Costo Envío</th>
                      <th className="p-3">Responsable</th>
                      <th className="p-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">No hay transferencias registradas.</td>
                      </tr>
                    ) : (
                      transfers.map(tr => {
                        const fromName = BRANCHES.find(b => b.id === tr.sourceBranchId)?.name || 'Desconocida';
                        const toName = BRANCHES.find(b => b.id === tr.targetBranchId)?.name || 'Desconocida';
                        return (
                          <tr key={tr.id} className={`border-b ${tableRowClass}`}>
                            <td className="p-3 text-gray-500">{new Date(tr.createdAt).toLocaleString('es-ES')}</td>
                            <td className="p-3">
                              {tr.type === 'INTERNAL' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400">Interna</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400">Externa</span>
                              )}
                            </td>
                            <td className="p-3 font-semibold">{fromName}</td>
                            <td className="p-3 font-semibold">{toName}</td>
                            <td className="p-3 font-bold">{tr.items?.length ?? 0} ítems</td>
                            <td className="p-3">${(tr.transferCost ?? 0).toFixed(2)}</td>
                            <td className="p-3 text-gray-400">{tr.createdBy}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 flex items-center justify-center gap-1 w-20 mx-auto">
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Settings className={isDarkMode ? 'text-red-400' : 'text-red-600'} /> Ajustes de Inventario
                </h1>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ajustes manuales y aplicación de Cero Inventario por auditorías.</p>
              </div>
              <button 
                onClick={() => setIsAdjustmentOpen(true)}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all hover:scale-105"
              >
                <RefreshCw size={14} /> Nuevo Ajuste
              </button>
            </div>

            <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b ${tableHeaderClass}`}>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Tipo Ajuste</th>
                      <th className="p-3">Sucursal</th>
                      <th className="p-3">Justificación / Motivo</th>
                      <th className="p-3">Cant. Ítems</th>
                      <th className="p-3">Autorizado Por</th>
                      <th className="p-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {adjustments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">No se han registrado ajustes.</td>
                      </tr>
                    ) : (
                      adjustments.map(ad => {
                        const branchName = BRANCHES.find(b => b.id === ad.branchId)?.name || 'Desconocida';
                        const isZero = ad.type === 'ZERO_INVENTORY';
                        return (
                          <tr key={ad.id} className={`border-b ${tableRowClass}`}>
                            <td className="p-3 text-gray-500">{new Date(ad.createdAt).toLocaleString('es-ES')}</td>
                            <td className="p-3">
                              {isZero ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-red-500 flex items-center gap-1 border border-red-500/20">
                                  <ShieldAlert size={10} /> Cero Inventario
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400">Manual</span>
                              )}
                            </td>
                            <td className="p-3 font-semibold">{branchName}</td>
                            <td className="p-3 max-w-xs truncate" title={ad.reason}>{ad.reason}</td>
                            <td className="p-3 font-bold">{ad.items?.length ?? 0} items</td>
                            <td className="p-3 text-gray-400">{ad.confirmedBy}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 flex items-center justify-center gap-1 w-20 mx-auto">
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
      {isProductOpen && (
        <ProductCreationForm 
          isDarkMode={isDarkMode} 
          onClose={() => setIsProductOpen(false)} 
          onSuccess={() => {
            setIsProductOpen(false);
            loadCatalogData();
          }}
        />
      )}

      {isServiceOpen && (
        <ServiceCreationForm 
          isDarkMode={isDarkMode} 
          onClose={() => setIsServiceOpen(false)} 
          onSuccess={() => {
            setIsServiceOpen(false);
            loadCatalogData();
          }}
        />
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
