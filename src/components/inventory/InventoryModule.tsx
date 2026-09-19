import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiText, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Search, Tag, BarChart3, 
  ArrowRightLeft, Settings, Database, RefreshCw, 
  Trash2, Briefcase, PlusCircle, CheckCircle, ShieldAlert,
  SlidersHorizontal, Layers, Award, Edit2, X, Box
} from 'lucide-react';
import { Badge } from '../ui/badge';
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

import { collection, getDocs, query, orderBy } from 'firebase/firestore';
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
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');

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

  useEffect(() => {
    if (initialSubTab) {
      if (typeof initialSubTab === 'string' && initialSubTab.startsWith('create_product')) {
        setActiveTab('productos');
        setInlineFormMode(null);
        setShowProductTypeSelector(true);
      } else if (typeof initialSubTab === 'string' && initialSubTab.startsWith('create_service')) {
        setActiveTab('productos');
        setShowProductTypeSelector(false);
        setInlineFormMode('create_service');
        setEditingProduct(null);
        scrollToForm();
      } else {
        setActiveTab(initialSubTab);
      }
    }
  }, [initialSubTab]);

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
      
      // Deduplicar productos por ID y por SKU
      const uniqueMap = new Map<string, Product>();
      const seenSkus = new Set<string>();
      for (const prod of allProducts) {
        if (!prod || !prod.id) continue;
        const skuKey = prod.sku ? prod.sku.trim().toUpperCase() : '';
        if (uniqueMap.has(prod.id)) continue;
        if (skuKey && seenSkus.has(skuKey)) continue;

        uniqueMap.set(prod.id, prod);
        if (skuKey) seenSkus.add(skuKey);
      }
      const uniqueProducts = Array.from(uniqueMap.values());

      setProducts(uniqueProducts);
      setCategories(allCats);
      setBrands(allBrands);

      // Carga instantánea de stock inicial desde prod.stock sin bloquear la UI
      const stockMap: Record<string, number> = {};
      for (const prod of uniqueProducts) {
        stockMap[prod.id || ''] = prod.type === 'SERVICE' ? 0 : Number(prod.stock || 0);
      }
      setStocks(stockMap);

      // Actualización en segundo plano desde Kardex en paralelo
      Promise.all(
        uniqueProducts.map(async (prod) => {
          if (prod.type === 'SERVICE' || !prod.id) return null;
          try {
            const bal = await kardexRepository.getLastBalance(prod.id, BRANCHES[0].id);
            return bal ? { id: prod.id, balance: bal.balanceQuantity } : null;
          } catch {
            return null;
          }
        })
      ).then((results) => {
        const bgStockMap: Record<string, number> = {};
        for (const res of results) {
          if (res && res.id) {
            bgStockMap[res.id] = res.balance;
          }
        }
        if (Object.keys(bgStockMap).length > 0) {
          setStocks(prev => ({ ...prev, ...bgStockMap }));
        }
      }).catch(() => {});

    } catch (err) {
      console.error("Error loading inventory catalog:", err);
    } finally {
      setLoading(false);
    }
  }

  // Reload stocks specifically de forma paralela y no bloqueante
  async function reloadStocks() {
    try {
      const results = await Promise.all(
        products.map(async (prod) => {
          if (prod.type === 'SERVICE' || !prod.id) return null;
          try {
            const bal = await kardexRepository.getLastBalance(prod.id, BRANCHES[0].id);
            return bal ? { id: prod.id, balance: bal.balanceQuantity } : { id: prod.id, balance: prod.stock || 0 };
          } catch {
            return { id: prod.id, balance: prod.stock || 0 };
          }
        })
      );
      const stockMap: Record<string, number> = {};
      for (const res of results) {
        if (res && res.id) {
          stockMap[res.id] = res.balance;
        }
      }
      setStocks(prev => ({ ...prev, ...stockMap }));
    } catch (e) {
      console.error("Error reloading stocks:", e);
    }
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
    const p = products.find(prod => prod.id === id);
    const stockQty = Number(p?.stock ?? stocks[id] ?? 0);
    const hasHistory = stockQty > 0;
    
    // Preguntar modo de eliminación
    const confirmMsg = hasHistory
      ? `¿Desactivar "${p?.name || 'este ítem'}"?\n\nAl tener existencias o historial, se marcará como INACTIVO y dejará de mostrarse en ventas.`
      : `¿Cómo deseas proceder con "${p?.name || 'este ítem'}"?\n\n• ACEPTAR: Continuar con el proceso de retiro.\n• CANCELAR: Volver sin hacer cambios.`;

    if (!window.confirm(confirmMsg)) return;

    let permanent = false;
    if (!hasHistory) {
      permanent = window.confirm(
        `¿Deseas ELIMINAR DEFINITIVAMENTE "${p?.name}" de la base de datos?\n\n` +
        `• Aceptar = Eliminar por completo de la base de datos (borrado físico).\n` +
        `• Cancelar = Solo desactivar (conservar registro inactivo).`
      );
    }

    try {
      await productRepository.delete(id, permanent);
      await loadCatalogData();
      showToast?.(permanent ? 'Producto eliminado definitivamente.' : 'Producto desactivado y oculto de ventas.', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Error al procesar la eliminación del producto.', 'error');
    }
  };

  const handleReactivateProduct = async (id: string) => {
    try {
      await productRepository.update(id, { status: 'ACTIVE', showInSales: true });
      await loadCatalogData();
      showToast?.('Producto reactivado y disponible para ventas.', 'success');
    } catch (err) {
      showToast?.(err instanceof Error ? err.message : 'No se pudo reactivar el producto.', 'error');
    }
  };

  const filteredProducts = useMemo(() => {
    const seenIds = new Set<string>();
    return products.filter(p => {
      if (!p || !p.id) return false;
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);

      const pStatus = p.status || 'ACTIVE';
      if (statusFilter === 'ACTIVE' && pStatus === 'INACTIVE') return false;
      if (statusFilter === 'INACTIVE' && pStatus !== 'INACTIVE') return false;

      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
      const matchesType = selectedType ? p.type === selectedType : true;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [products, searchQuery, selectedCategory, selectedType, statusFilter]);

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

  return (
    <UiBox {...{"className":"flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500"}}>
      


      <UiBox {...{"className":"flex-1 overflow-y-auto py-4 custom-scrollbar"}}>
        
        {/* --- TAB: PRODUCTOS & SERVICIOS --- */}
        {activeTab === 'productos' && (
          <UiBox {...{"className":"w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300"}}>
            {!inlineFormMode ? (
              <>
                {/* FILTROS Y ACCIONES */}
                <UiBox {...{"className":"flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6"}}>
                  <UiBox {...{"className":"flex flex-wrap items-center gap-2 w-full md:w-auto"}}>
                    <UiButton
                      onClick={() => setShowProductTypeSelector(true)}
                      {...mergeThemeProps({"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1.5 hover-lift"})}
                    >
                      <Plus size={15} /> Nuevo Producto
                    </UiButton>
                    <UiButton
                      onClick={() => {
                        setInlineFormMode('create_service');
                        setEditingProduct(null);
                        scrollToForm();
                      }}
                      {...mergeThemeProps({"size":"2","variant":"solid","color":"indigo","className":"flex items-center gap-1.5 hover-lift"})}
                    >
                      <Briefcase size={15} /> Nuevo Servicio
                    </UiButton>
                    <UiButton
                      onClick={() => setIsCatBrandOpen(true)}
                      {...mergeThemeProps({"size":"2","variant":"outline","className":"flex items-center gap-1.5"}, {}, {"variant":"soft","color":"gray"})}
                    >
                      <Tag size={15} /> Categorías/Marcas
                    </UiButton>
                  </UiBox>

                  <UiBox className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                    <UiBox className="w-full sm:w-64">
                      <UiInput
                        type="text"
                        placeholder="Buscar por SKU o nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
                        size="2"
                      />
                    </UiBox>

                    <UiSelect
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      size="2"
                      color="gray"
                      className="cursor-pointer"
                    >
                      <option value="">Todas las Categorías</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </UiSelect>

                    <UiSelect
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      size="2"
                      color="gray"
                      className="cursor-pointer"
                    >
                      <option value="">Todos los Tipos</option>
                      <option value="STANDARD">Estándar</option>
                      <option value="COMBO">Combo</option>
                      <option value="SUBPRODUCT">Subproducto</option>
                      <option value="SERVICE">Servicio</option>
                    </UiSelect>

                    <UiSelect
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'ACTIVE' | 'INACTIVE' | 'ALL')}
                      size="2"
                      color="gray"
                      className="cursor-pointer font-medium"
                    >
                      <option value="ACTIVE">Estado: Solo Activos</option>
                      <option value="INACTIVE">Estado: Solo Inactivos</option>
                      <option value="ALL">Estado: Todos</option>
                    </UiSelect>
                  </UiBox>
                </UiBox>
                
                {/* Products Table */}
                <UiBox style={{ borderRadius: "var(--radius-3)", border: "1px solid var(--gray-a6)", backgroundColor: "var(--color-panel-solid)" }} className="overflow-hidden">
                  <UiBox className="overflow-x-auto custom-scrollbar">
                    <UiTable className="w-full text-left whitespace-nowrap">
                      <UiTableHeader style={{ backgroundColor: "var(--gray-2)", color: "var(--gray-12)" }}>
                        <UiTableRow>
                          <UiTableHead className="px-6 py-3.5">SKU</UiTableHead>
                          <UiTableHead className="px-6 py-3.5">Nombre</UiTableHead>
                          <UiTableHead className="px-6 py-3.5">Tipo</UiTableHead>
                          <UiTableHead className="px-6 py-3.5">Categoría</UiTableHead>
                          <UiTableHead className="px-6 py-3.5">Costo Base</UiTableHead>
                          <UiTableHead className="px-6 py-3.5">Precio Venta</UiTableHead>
                          <UiTableHead className="px-6 py-3.5">Impuesto</UiTableHead>
                          <UiTableHead className="px-6 py-3.5">Stock Actual</UiTableHead>
                          <UiTableHead className="px-6 py-3.5 text-center">Acciones</UiTableHead>
                        </UiTableRow>
                      </UiTableHeader>
                      <UiTableBody>
                        {loading ? (
                          <UiTableRow>
                            <UiTableCell colSpan={9} style={{ color: "var(--gray-11)" }} className="px-6 py-8 text-center">Cargando catálogo...</UiTableCell>
                          </UiTableRow>
                        ) : filteredProducts.length === 0 ? (
                          <UiTableRow>
                            <UiTableCell colSpan={9} style={{ color: "var(--gray-11)" }} className="px-6 py-8 text-center">No se encontraron productos ni servicios.</UiTableCell>
                          </UiTableRow>
                        ) : (
                          filteredProducts.map(p => {
                            const stock = Number(p.stock ?? stocks[p.id || ''] ?? 0);
                            const isService = p.type === 'SERVICE';
                            
                            return (
                              <UiTableRow key={p.id}>
                                <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-12)" }} className="px-6 py-3.5">{p.sku}</UiTableCell>
                                <UiTableCell className="px-6 py-2.5">
                                  <UiBox className="flex items-center gap-3">
                                    <img 
                                      src={p.imageUrl && !p.imageUrl.includes('placehold.co') && !p.imageUrl.includes('placehold.net') ? p.imageUrl : '/product.svg'} 
                                      style={{ borderRadius: "var(--radius-2)", border: "1px solid var(--gray-a5)" }}
                                      className="w-8 h-8 object-cover"
                                      alt={p.name}
                                      onError={(e) => {
                                        e.currentTarget.src = '/product.svg';
                                      }}
                                    />
                                    <UiBox className="min-w-0">
                                      <UiText weight="bold" color="gray" highContrast className="block truncate max-w-[220px]">{p.name}</UiText>
                                      {p.description && <UiText as="p" size="1" color="gray" className="truncate max-w-[220px] mt-0.5">{p.description}</UiText>}
                                    </UiBox>
                                  </UiBox>
                                </UiTableCell>
                                <UiTableCell className="px-6 py-3.5">
                                  <UiBox className="flex items-center gap-1.5 flex-wrap">
                                    {p.status === 'INACTIVE' ? (
                                      <Badge variant="soft" color="red" size="1">Inactivo</Badge>
                                    ) : (
                                      <Badge variant="soft" color="green" size="1">Activo</Badge>
                                    )}
                                    {p.type === 'STANDARD' && <Badge variant="soft" color="blue" size="1">Estándar</Badge>}
                                    {p.type === 'COMBO' && <Badge variant="soft" color="purple" size="1">Combo</Badge>}
                                    {p.type === 'SUBPRODUCT' && <Badge variant="soft" color="indigo" size="1">Subproducto</Badge>}
                                    {p.type === 'SERVICE' && <Badge variant="soft" color="pink" size="1">Servicio</Badge>}
                                  </UiBox>
                                </UiTableCell>
                                <UiTableCell style={{ color: "var(--gray-11)" }} className="px-6 py-3.5">{getCategoryName(p.categoryId)}</UiTableCell>
                                <UiTableCell style={{ fontFamily: "var(--code-font-family)" }} className="px-6 py-3.5">${(Number(p.baseCost ?? p.cost ?? 0)).toFixed(2)}</UiTableCell>
                                <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--green-11)" }} className="px-6 py-3.5 font-medium">${(Number(p.salePrice ?? p.price ?? 0)).toFixed(2)}</UiTableCell>
                                <UiTableCell style={{ color: "var(--gray-11)" }} className="px-6 py-3.5">{p.taxRate ?? 15}%</UiTableCell>
                                <UiTableCell className="px-6 py-3.5">
                                  {isService || p.inventoryType === 'VIRTUAL' ? (
                                    <Badge variant="soft" color="gray" size="1">Virtual (N/A)</Badge>
                                  ) : stock > 0 ? (
                                    <Badge variant="soft" color="green" size="1">{stock} u.</Badge>
                                  ) : (
                                    <Badge variant="soft" color="red" size="1">Agotado</Badge>
                                  )}
                                </UiTableCell>
                                <UiTableCell className="px-6 py-3.5 text-center">
                                  <UiBox className="flex items-center justify-center gap-2">
                                    <UiButton
                                      iconOnly
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
                                      variant="soft"
                                      color="blue"
                                      size="1"
                                      title="Editar"
                                    >
                                      <Edit2 size={13} />
                                    </UiButton>
                                    {p.status === 'INACTIVE' ? (
                                      <UiButton iconOnly variant="soft" color="green" size="1" onClick={() => p.id && handleReactivateProduct(p.id)} title="Reactivar">
                                        <RefreshCw size={13} />
                                      </UiButton>
                                    ) : (
                                      <UiButton iconOnly variant="soft" color="red" size="1" onClick={() => p.id && handleDeleteProduct(p.id)} title="Desactivar">
                                        <Trash2 size={13} />
                                      </UiButton>
                                    )}
                                  </UiBox>
                                </UiTableCell>
                              </UiTableRow>
                            );
                          })
                        )}
                      </UiTableBody>
                    </UiTable>
                  </UiBox>
                </UiBox>
              </>
            ) : (
              /* Formulario Inline */
              <UiBox id="inline-form-container" {...{"className":"animate-in slide-in-from-bottom duration-300"}}>
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
              </UiBox>
            )}
          </UiBox>
        )}

        {/* --- TAB: CATEGORÍAS Y MARCAS --- */}
        {activeTab === 'categorias' && (
          <UiBox {...{"className":"w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300"}}>
            <UiBox {...{"className":"flex justify-end items-center mb-6"}}>
              <UiButton
                onClick={() => setIsCatBrandOpen(true)}
                {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1.5"}}
              >
                <SlidersHorizontal size={14} /> Configurar Categorías/Marcas
              </UiButton>
            </UiBox>

            <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-8"}}>
              {/* Categorías Column */}
              <UiCard {...mergeThemeProps({"className":"p-6"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
                <UiHeading as="h3" {...mergeThemeProps({"size":"2","weight":"bold","className":"flex items-center gap-2 mb-4"}, {}, {"color":"blue"})}>
                  <Layers size={16} /> Categorías ({categories.length})
                </UiHeading>
                <UiBox {...{"className":"space-y-3"}}>
                  {categories.map(cat => (
                    <UiBox key={cat.id} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-3 flex items-center justify-between"}, {}, {"style":{"backgroundColor":"var(--gray-2)"}})}>
                      <UiBox>
                        <UiText {...mergeThemeProps({"weight":"bold"}, {}, {"color":"gray","highContrast":true})}>{cat.name}</UiText>
                        {cat.description && <UiText as="p" {...{"size":"1","color":"gray"}}>{cat.description}</UiText>}
                      </UiBox>
                    </UiBox>
                  ))}
                </UiBox>
              </UiCard>

              {/* Marcas Column */}
              <UiCard {...mergeThemeProps({"className":"p-6"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
                <UiHeading as="h3" {...mergeThemeProps({"size":"2","weight":"bold","className":"flex items-center gap-2 mb-4"}, {}, {"color":"purple"})}>
                  <Award size={16} /> Marcas ({brands.length})
                </UiHeading>
                <UiBox {...{"className":"space-y-3"}}>
                  {brands.map(b => (
                    <UiBox key={b.id} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-3 flex items-center justify-between"}, {}, {"style":{"backgroundColor":"var(--gray-2)"}})}>
                      <UiBox>
                        <UiText {...mergeThemeProps({"weight":"bold"}, {}, {"color":"gray","highContrast":true})}>{b.name}</UiText>
                        {b.manufacturer && <UiText as="p" {...{"size":"1","color":"gray"}}>{b.manufacturer}</UiText>}
                      </UiBox>
                    </UiBox>
                  ))}
                </UiBox>
              </UiCard>
            </UiBox>
          </UiBox>
        )}

        {/* --- TAB: KARDEX --- */}
        {activeTab === 'kardex' && (
          <UiBox {...{"className":"w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300"}}>


            {/* Selector de Producto */}
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5 grid grid-cols-1 md:grid-cols-2 gap-4"}, {}, {"style":{"backgroundColor":"var(--gray-2)"}})}>
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1"}}>Seleccionar Producto Físico</UiLabel>
                <UiSelect
                  value={kardexProductId}
                  onChange={(e) => setKardexProductId(e.target.value)}
                  {...mergeThemeProps({"size":"2","className":"w-full cursor-pointer"}, {}, {"color":"gray"})}
                >
                  <option value="" {...{"style":{"color":"var(--gray-12)"}}}>-- Selecciona un producto --</option>
                  {products.filter(p => p.type !== 'SERVICE').map(p => (
                    <option key={p.id} value={p.id} {...{"style":{"color":"var(--gray-12)"}}}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </UiSelect>
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1"}}>Sucursal / Bodega</UiLabel>
                <UiSelect
                  value={kardexBranchId}
                  onChange={(e) => setKardexBranchId(e.target.value)}
                  {...mergeThemeProps({"size":"2","className":"w-full cursor-pointer"}, {}, {"color":"gray"})}
                >
                  {BRANCHES.map(b => (
                    <option key={b.id} value={b.id} {...{"style":{"color":"var(--gray-12)"}}}>{b.name}</option>
                  ))}
                </UiSelect>
              </UiBox>
            </UiBox>

            {kardexProductId ? (
              <UiBox {...{"className":"space-y-6"}}>
                {/* Summary Cards */}
                <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6"}}>
                  {/* Stock Actual Card */}
                  <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5"}, {}, {"style":{"backgroundColor":"var(--green-3)"}})}>
                    <UiText {...{"size":"1","weight":"bold","color":"green","className":"block mb-1"}}>Saldo Actual</UiText>
                    <UiBox {...{"className":"flex items-baseline gap-2"}}>
                      <UiText {...mergeThemeProps({"size":"6","weight":"bold"}, {}, {"color":"gray","highContrast":true})}>
                        {kardexHistory[0]?.balanceQuantity ?? 0}
                      </UiText>
                      <UiText {...{"size":"1","color":"gray","weight":"bold"}}>unidades</UiText>
                    </UiBox>
                  </UiBox>

                  {/* Costo Promedio Card */}
                  <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5"}, {}, {"style":{"backgroundColor":"var(--blue-3)"}})}>
                    <UiText {...{"size":"1","weight":"bold","color":"blue","className":"block mb-1"}}>Costo Promedio Ponderado</UiText>
                    <UiBox {...{"className":"flex items-baseline gap-2"}}>
                      <UiText {...mergeThemeProps({"size":"6","weight":"bold"}, {}, {"color":"gray","highContrast":true})}>
                        ${(kardexHistory[0]?.balanceAverageCost ?? 0).toFixed(2)}
                      </UiText>
                    </UiBox>
                  </UiBox>

                  {/* Valorización Card */}
                  <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5"}, {}, {"style":{"backgroundColor":"var(--purple-3)"}})}>
                    <UiText {...{"size":"1","weight":"bold","color":"purple","className":"block mb-1"}}>Valor Total del Inventario</UiText>
                    <UiBox {...{"className":"flex items-baseline gap-2"}}>
                      <UiText {...mergeThemeProps({"size":"6","weight":"bold"}, {}, {"color":"gray","highContrast":true})}>
                        ${((kardexHistory[0]?.balanceQuantity ?? 0) * (kardexHistory[0]?.balanceAverageCost ?? 0)).toFixed(2)}
                      </UiText>
                    </UiBox>
                  </UiBox>
                </UiBox>

                {/* Kardex Transactions Table */}
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"overflow-hidden"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
                  <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
                    <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
                      <UiTableHeader {...mergeThemeProps({}, {}, {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}})}>
                        <UiTableRow>
                          <UiTableHead {...{"className":"px-6 py-3.5"}}>Fecha</UiTableHead>
                          <UiTableHead {...{"className":"px-6 py-3.5"}}>Tipo Operación</UiTableHead>
                          <UiTableHead {...{"className":"px-6 py-3.5"}}>Referencia Doc</UiTableHead>
                          <UiTableHead {...{"className":"px-6 py-3.5"}}>Cantidad Movimiento</UiTableHead>
                          <UiTableHead {...{"className":"px-6 py-3.5"}}>Costo Operación</UiTableHead>
                          <UiTableHead {...{"className":"px-6 py-3.5"}}>Total Operación</UiTableHead>
                          <UiTableHead {...{"className":"px-6 py-3.5"}}>Saldo Cantidad</UiTableHead>
                          <UiTableHead {...{"className":"px-6 py-3.5"}}>Saldo Costo Prom.</UiTableHead>
                        </UiTableRow>
                      </UiTableHeader>
                      <UiTableBody {...mergeThemeProps({}, {}, {})}>
                        {kardexHistory.length === 0 ? (
                          <UiTableRow>
                            <UiTableCell colSpan={8} {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center"}}>No hay movimientos registrados para este producto en la sucursal seleccionada.</UiTableCell>
                          </UiTableRow>
                        ) : (
                          kardexHistory.map(tx => {
                            const isEntry = tx.quantity > 0;
                            return (
                              <UiTableRow key={tx.id} {...mergeThemeProps({}, {}, {})}>
                                <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{new Date(tx.date as any).toLocaleString('es-ES')}</UiTableCell>
                                <UiTableCell {...{"className":"px-6 py-3.5"}}>
                                  {tx.type === 'PURCHASE_RECEIPT' && <UiText {...{"size":"1","weight":"bold","color":"green","className":"px-2 py-0.5"}}>Ingreso / Compra</UiText>}
                                  {tx.type === 'CUSTOMER_RETURN' && <UiText {...{"size":"1","weight":"bold","color":"green","className":"px-2 py-0.5"}}>Devolución Cliente</UiText>}
                                  {tx.type === 'POSITIVE_ADJUSTMENT' && <UiText {...{"size":"1","weight":"bold","color":"teal","className":"px-2 py-0.5"}}>Ajuste Positivo</UiText>}
                                  {tx.type === 'SALE' && <UiText {...{"size":"1","weight":"bold","color":"red","className":"px-2 py-0.5"}}>Egreso / Venta</UiText>}
                                  {tx.type === 'TRANSFER_OUT' && <UiText {...{"size":"1","weight":"bold","color":"purple","className":"px-2 py-0.5"}}>Salida por Traslado</UiText>}
                                  {tx.type === 'NEGATIVE_ADJUSTMENT' && <UiText {...{"size":"1","weight":"bold","color":"amber","className":"px-2 py-0.5"}}>Ajuste Negativo</UiText>}
                                  {tx.type === 'SHRINKAGE' && <UiText {...{"size":"1","weight":"bold","color":"orange","className":"px-2 py-0.5"}}>Mermas / Pérdida</UiText>}
                                  {tx.type === 'MASSIVE_ZERO' && <UiText {...{"size":"1","weight":"bold","color":"red","className":"px-2 py-0.5"}}>Cero Inventario</UiText>}
                                </UiTableCell>
                                <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{tx.referenceId}</UiTableCell>
                                <UiTableCell {...mergeThemeProps({"className":"px-6 py-3.5"}, {}, (isEntry ? {"style":{"color":"var(--green-11)"}} : {"style":{"color":"var(--red-11)"}}))}>
                                  {isEntry ? `+${tx.quantity}` : tx.quantity}
                                </UiTableCell>
                                <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>${(Number(tx.unitCost ?? 0)).toFixed(2)}</UiTableCell>
                                <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>${(Number(tx.totalCost ?? 0)).toFixed(2)}</UiTableCell>
                                <UiTableCell {...{"className":"px-6 py-3.5"}}>{tx.balanceQuantity ?? 0}</UiTableCell>
                                <UiTableCell {...{"style":{"color":"var(--blue-12)"},"className":"px-6 py-3.5"}}>${(Number(tx.balanceAverageCost ?? 0)).toFixed(2)}</UiTableCell>
                              </UiTableRow>
                            );
                          })
                        )}
                      </UiTableBody>
                    </UiTable>
                  </UiBox>
                </UiBox>
              </UiBox>
            ) : (
              <UiCard {...mergeThemeProps({"className":"flex flex-col items-center justify-center p-8 text-center"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
                <Database size={32} {...mergeThemeProps({"className":"mb-4"}, {}, {"style":{"color":"var(--green-11)"}})} />
                <UiText as="p" {...{"color":"gray"}}>Selecciona un producto físico para ver su Kardex de transacciones.</UiText>
              </UiCard>
            )}
          </UiBox>
        )}

        {/* --- TAB: TRANSFERENCIAS --- */}
        {activeTab === 'transferencias' && (
          <UiBox {...{"className":"w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300"}}>
            {/* FILTROS Y ACCIONES */}
            <UiBox {...{"className":"flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6"}}>
              <UiBox>
                <UiButton
                  onClick={() => setIsTransferOpen(true)}
                  {...mergeThemeProps({"size":"2","variant":"solid","color":"purple","className":"w-full sm:w-auto flex items-center justify-center gap-1.5"})}
                >
                  <PlusCircle size={15} /> Nueva Transferencia
                </UiButton>
              </UiBox>
            </UiBox>

            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"overflow-hidden"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
              <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
                <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
                  <UiTableHeader {...mergeThemeProps({}, {}, {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}})}>
                    <UiTableRow>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Fecha</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Tipo</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Origen</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Destino</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Cant. Productos</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Costo Envío</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Responsable</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5 text-center"}}>Estado</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody {...mergeThemeProps({}, {}, {})}>
                    {transfers.length === 0 ? (
                      <UiTableRow>
                        <UiTableCell colSpan={8} {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center"}}>No hay transferencias registradas.</UiTableCell>
                      </UiTableRow>
                    ) : (
                      transfers.map(tr => {
                        const fromName = BRANCHES.find(b => b.id === tr.sourceBranchId)?.name || 'Desconocida';
                        const toName = BRANCHES.find(b => b.id === tr.targetBranchId)?.name || 'Desconocida';
                        return (
                          <UiTableRow key={tr.id} {...mergeThemeProps({}, {}, {})}>
                            <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{new Date(tr.createdAt).toLocaleString('es-ES')}</UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5"}}>
                              {tr.type === 'INTERNAL' ? (
                                <UiText {...{"size":"1","weight":"bold","color":"blue","className":"px-2 py-0.5"}}>Interna</UiText>
                              ) : (
                                <UiText {...{"size":"1","weight":"bold","color":"orange","className":"px-2 py-0.5"}}>Externa</UiText>
                              )}
                            </UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5"}}>{fromName}</UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5"}}>{toName}</UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5"}}>{tr.items?.length ?? 0} ítems</UiTableCell>
                            <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>${(tr.transferCost ?? 0).toFixed(2)}</UiTableCell>
                            <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{tr.createdBy}</UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5 text-center"}}>
                              <UiText {...{"size":"1","weight":"bold","color":"green","className":"px-2 py-0.5 flex items-center justify-center gap-1 w-24 mx-auto"}}>
                                <CheckCircle size={10} /> Completado
                              </UiText>
                            </UiTableCell>
                          </UiTableRow>
                        );
                      })
                    )}
                  </UiTableBody>
                </UiTable>
              </UiBox>
            </UiBox>
          </UiBox>
        )}

        {/* --- TAB: AJUSTES --- */}
        {activeTab === 'ajustes' && (
          <UiBox {...{"className":"w-full h-full flex flex-col space-y-6 animate-in fade-in duration-300"}}>
            <UiBox {...{"className":"flex justify-end items-center mb-6"}}>
              <UiButton
                onClick={() => setIsAdjustmentOpen(true)}
                {...mergeThemeProps({"size":"2","variant":"solid","color":"red","className":"w-full sm:w-auto flex items-center justify-center gap-1.5"})}
              >
                <RefreshCw size={15} /> Nuevo Ajuste
              </UiButton>
            </UiBox>

            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"overflow-hidden"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
              <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
                <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
                  <UiTableHeader {...mergeThemeProps({}, {}, {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}})}>
                    <UiTableRow>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Fecha</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Tipo Ajuste</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Sucursal</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Justificación / Motivo</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Cant. Ítems</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Autorizado Por</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5 text-center"}}>Estado</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody {...mergeThemeProps({}, {}, {})}>
                    {adjustments.length === 0 ? (
                      <UiTableRow>
                        <UiTableCell colSpan={7} {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center"}}>No se han registrado ajustes.</UiTableCell>
                      </UiTableRow>
                    ) : (
                      adjustments.map(ad => {
                        const branchName = BRANCHES.find(b => b.id === ad.branchId)?.name || 'Desconocida';
                        const isZero = ad.type === 'ZERO_INVENTORY';
                        return (
                          <UiTableRow key={ad.id} {...mergeThemeProps({}, {}, {})}>
                            <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{new Date(ad.createdAt).toLocaleString('es-ES')}</UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5"}}>
                              {isZero ? (
                                <UiText {...{"size":"1","weight":"bold","color":"red","className":"px-2 py-0.5 flex items-center gap-1"}}>
                                  <ShieldAlert size={10} /> Cero Inventario
                                </UiText>
                              ) : (
                                <UiText {...{"size":"1","weight":"bold","color":"blue","className":"px-2 py-0.5"}}>Manual</UiText>
                              )}
                            </UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5"}}>{branchName}</UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5 max-w-xs truncate"}} title={ad.reason}>{ad.reason}</UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5"}}>{ad.items?.length ?? 0} items</UiTableCell>
                            <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{ad.confirmedBy}</UiTableCell>
                            <UiTableCell {...{"className":"px-6 py-3.5 text-center"}}>
                              <UiText {...{"size":"1","weight":"bold","color":"green","className":"px-2 py-0.5 flex items-center justify-center gap-1 w-24 mx-auto"}}>
                                <CheckCircle size={10} /> Aplicado
                              </UiText>
                            </UiTableCell>
                          </UiTableRow>
                        );
                      })
                    )}
                  </UiTableBody>
                </UiTable>
              </UiBox>
            </UiBox>
          </UiBox>
        )}
      </UiBox>

      {/* --- MODAL DIALOGS --- */}
      {showProductTypeSelector && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"}}>
          <UiCard {...mergeThemeProps({"className":"w-full max-w-md p-6"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            <UiBox {...{"className":"flex items-center justify-between mb-5"}}>
              <UiHeading as="h3" {...{"size":"3","weight":"bold","className":"flex items-center gap-2"}}>
                <Package {...{"style":{"color":"var(--blue-12)"}}} size={18} />
                Seleccionar Tipo de Producto
              </UiHeading>
              <UiButton iconOnly
                onClick={() => setShowProductTypeSelector(false)}
                {...mergeThemeProps({}, {}, {"color":"gray"})}
              >
                <X size={16} />
              </UiButton>
            </UiBox>
            
            <UiText as="p" {...mergeThemeProps({"size":"1","className":"mb-4"}, {}, {"color":"gray"})}>
              ¿Qué tipo de producto deseas registrar en el catálogo?
            </UiText>
            
            <UiBox {...{"className":"space-y-2.5"}}>
              <UiButton
                onClick={() => {
                  setInlineFormMode('create_product');
                  setEditingProduct({ type: 'STANDARD' });
                  setShowProductTypeSelector(false);
                  scrollToForm();
                }}
                {...mergeThemeProps({"variant":"outline","className":"w-full text-left flex items-start gap-3.5 group"}, {}, {"variant":"soft","color":"gray"})}
              >
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-2.5 group-hover:scale-110 transition-transform"})}>
                  <Package size={16} />
                </UiBox>
                <UiBox>
                  <UiText {...{"size":"1","weight":"bold","className":"block"}}>Producto Estándar</UiText>
                  <UiText {...mergeThemeProps({"size":"1","className":"block mt-0.5"}, {}, {"color":"gray"})}>
                    Productos individuales sin variantes ni agrupaciones.
                  </UiText>
                </UiBox>
              </UiButton>

              <UiButton
                onClick={() => {
                  setInlineFormMode('create_product');
                  setEditingProduct({ type: 'SUBPRODUCT' });
                  setShowProductTypeSelector(false);
                  scrollToForm();
                }}
                {...mergeThemeProps({"variant":"outline","className":"w-full text-left flex items-start gap-3.5 group"}, {}, {"variant":"soft","color":"gray"})}
              >
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-2.5 group-hover:scale-110 transition-transform"})}>
                  <Layers size={16} />
                </UiBox>
                <UiBox>
                  <UiText {...{"size":"1","weight":"bold","className":"block"}}>Subproducto / Variante</UiText>
                  <UiText {...mergeThemeProps({"size":"1","className":"block mt-0.5"}, {}, {"color":"gray"})}>
                    Mismo artículo con variaciones (talla, color o dimensiones).
                  </UiText>
                </UiBox>
              </UiButton>

              <UiButton
                onClick={() => {
                  setInlineFormMode('create_product');
                  setEditingProduct({ type: 'COMBO' });
                  setShowProductTypeSelector(false);
                  scrollToForm();
                }}
                {...mergeThemeProps({"variant":"outline","className":"w-full text-left flex items-start gap-3.5 group"}, {}, {"variant":"soft","color":"gray"})}
              >
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--purple-3)","color":"var(--purple-11)"},"className":"p-2.5 group-hover:scale-110 transition-transform"})}>
                  <Box size={16} />
                </UiBox>
                <UiBox>
                  <UiText {...{"size":"1","weight":"bold","className":"block"}}>Combo / Kit</UiText>
                  <UiText {...mergeThemeProps({"size":"1","className":"block mt-0.5"}, {}, {"color":"gray"})}>
                    Paquete que agrupa múltiples productos estándar o servicios.
                  </UiText>
                </UiBox>
              </UiButton>
            </UiBox>
          </UiCard>
        </UiBox>
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
    </UiBox>
  );
}
