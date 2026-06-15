import React, { useState, useEffect } from 'react';
import { 
  Package, DollarSign, Tag, Save, X, Box, 
  Percent, FileText, AlertCircle, Image, Edit2, 
  Plus, Layers, FolderPlus, HelpCircle
} from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../../firebase';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { categoryBrandRepository } from '../../modules/inventory/repositories/CategoryBrandRepository';
import { Category, Brand } from '../../modules/inventory/domain/schemas/category-brand.schema';
import { kardexService } from '../../modules/inventory/services/KardexService';

interface ProductCreationFormProps {
  isDarkMode: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isInline?: boolean;
  productToEdit?: any;
}

export default function ProductCreationForm({ 
  isDarkMode, 
  onClose, 
  onSuccess,
  isInline = false,
  productToEdit = null
}: ProductCreationFormProps) {
  // Main form state
  const [formData, setFormData] = useState({
    sku: productToEdit?.sku || '',
    name: productToEdit?.name || '',
    description: productToEdit?.description || '',
    type: productToEdit?.type || 'STANDARD',
    categoryId: productToEdit?.categoryId || '',
    brandId: productToEdit?.brandId || '',
    baseCost: productToEdit?.baseCost || 0,
    marginPercentage: productToEdit?.marginPercentage || 30,
    taxRate: productToEdit?.taxRate !== undefined ? productToEdit.taxRate : 15,
    salePrice: productToEdit?.salePrice || 0, // In db, salePrice is the subtotal (price without tax)
    
    // New fields
    showInSales: productToEdit?.showInSales !== undefined ? productToEdit.showInSales : true,
    imageUrl: productToEdit?.imageUrl || '',
    inventoryType: productToEdit?.inventoryType || 'PHYSICAL',
    priceA: productToEdit?.priceA || 0,
    priceB: productToEdit?.priceB || 0,
    priceC: productToEdit?.priceC || 0,
    priceASinImpuesto: productToEdit?.priceASinImpuesto || 0,
    priceBSinImpuesto: productToEdit?.priceBSinImpuesto || 0,
    priceCSinImpuesto: productToEdit?.priceCSinImpuesto || 0,
    priceWithoutTax: productToEdit?.priceWithoutTax || 0,
    ivaCalculated: productToEdit?.ivaCalculated || 0,
  });

  // Derived price display states for UI binding
  const [priceIncludedTaxInput, setPriceIncludedTaxInput] = useState<number>(0);
  
  // Pricing tiers switches
  const [hasPriceA, setHasPriceA] = useState(!!productToEdit?.priceA);
  const [hasPriceB, setHasPriceB] = useState(!!productToEdit?.priceB);
  const [hasPriceC, setHasPriceC] = useState(!!productToEdit?.priceC);

  // In-situ Dialogs states
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const [showBrandPopup, setShowBrandPopup] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandMfr, setNewBrandMfr] = useState('');

  const [showPriceWithoutTaxPopup, setShowPriceWithoutTaxPopup] = useState(false);
  const [manualPriceInput, setManualPriceInput] = useState('');

  // Catalog selectors lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 State
  const [formStep, setFormStep] = useState<'product_details' | 'stock_initialization'>('product_details');
  const [savedProductId, setSavedProductId] = useState<string | null>(null);

  // Stock limits
  const [stockMinimo, setStockMinimo] = useState<number>(productToEdit?.stockMinimo || 5);
  const [stockMaximo, setStockMaximo] = useState<number>(productToEdit?.stockMaximo || 100);

  // Stock initialization method
  const [initStockType, setInitStockType] = useState<'none' | 'existing_purchase' | 'new_purchase'>('none');

  // Existing Purchases List
  const [existingPurchases, setExistingPurchases] = useState<any[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');

  // Suppliers List
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // New purchase inline form details
  const [newPurchase, setNewPurchase] = useState({
    supplierId: '',
    documentNumber: '',
    date: new Date().toISOString().split('T')[0],
    quantity: 1,
    unitCost: formData.baseCost || 0,
    paymentMethod: 'efectivo',
    paymentStatus: 'pagado',
  });

  // Modal to add supplier inline
  const [showNewSupplierPopup, setShowNewSupplierPopup] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierRuc, setNewSupplierRuc] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');

  // Load categories and brands
  useEffect(() => {
    async function loadData() {
      try {
        const [cats, brs] = await Promise.all([
          categoryBrandRepository.getCategories(),
          categoryBrandRepository.getBrands()
        ]);
        setCategories(cats.filter(c => c.status === 'ACTIVE'));
        setBrands(brs.filter(b => b.status === 'ACTIVE'));
      } catch (err) {
        console.error("Error loading categories/brands:", err);
      }
    }
    loadData();
  }, []);

  // Load finances data for Step 2
  useEffect(() => {
    async function loadFinancesData() {
      if (formStep !== 'stock_initialization') return;
      try {
        // Fetch suppliers
        const tpCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties');
        const tpSnap = await getDocs(tpCol);
        const allTp = tpSnap.docs.map(d => d.data());
        setSuppliers(allTp.filter(tp => tp.type === 'proveedor'));

        // Fetch purchases
        const txCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_transactions');
        const txSnap = await getDocs(txCol);
        const allTx = txSnap.docs.map(d => d.data());
        setExistingPurchases(allTx.filter(tx => tx.type === 'egreso' && tx.documentType === 'factura'));
      } catch (err) {
        console.error("Error loading finances suppliers/transactions:", err);
      }
    }
    loadFinancesData();
  }, [formStep]);

  // Initialize prices on edit
  useEffect(() => {
    if (productToEdit) {
      // If editing, salePrice in database is the subtotal (price without tax)
      const subtotal = productToEdit.priceWithoutTax || productToEdit.salePrice || 0;
      const rate = productToEdit.taxRate !== undefined ? productToEdit.taxRate : 15;
      const total = subtotal * (1 + rate / 100);
      
      setPriceIncludedTaxInput(parseFloat(total.toFixed(2)));
      setFormData(prev => ({
        ...prev,
        priceWithoutTax: parseFloat(subtotal.toFixed(2)),
        ivaCalculated: parseFloat((total - subtotal).toFixed(2)),
        salePrice: parseFloat(subtotal.toFixed(2))
      }));
    }
  }, [productToEdit]);

  // Recalculate prices when pricing input or taxRate changes
  const handlePriceIncludedChange = (val: number, taxRate: number) => {
    let priceWithout = val;
    let iva = 0;
    if (taxRate > 0) {
      priceWithout = val / (1 + taxRate / 100);
      iva = val - priceWithout;
    }
    
    // Calculate margin if baseCost exists
    let margin = formData.marginPercentage;
    if (formData.baseCost > 0) {
      margin = ((priceWithout - formData.baseCost) / formData.baseCost) * 100;
    }

    setFormData(prev => ({
      ...prev,
      salePrice: parseFloat(priceWithout.toFixed(2)), // in DB salePrice = subtotal
      priceWithoutTax: parseFloat(priceWithout.toFixed(2)),
      ivaCalculated: parseFloat(iva.toFixed(2)),
      marginPercentage: parseFloat(margin.toFixed(2))
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) || 0 : value;

    setFormData(prev => {
      const updated = { ...prev, [name]: val };
      
      // If baseCost changes, recalculate margin
      if (name === 'baseCost') {
        const cost = val as number;
        let margin = prev.marginPercentage;
        if (cost > 0) {
          margin = ((prev.priceWithoutTax - cost) / cost) * 100;
        }
        updated.marginPercentage = parseFloat(margin.toFixed(2));
      }
      
      return updated;
    });
  };

  // Image Upload Base64 conversion
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("La imagen no debe superar 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Inline Category Save
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await categoryBrandRepository.createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim(),
        status: 'ACTIVE'
      });
      const cats = await categoryBrandRepository.getCategories();
      setCategories(cats.filter(c => c.status === 'ACTIVE'));
      setFormData(prev => ({ ...prev, categoryId: newCat.id || '' }));
      setNewCategoryName('');
      setNewCategoryDesc('');
      setShowCategoryPopup(false);
    } catch (err) {
      console.error(err);
      alert("Error al agregar la categoría");
    }
  };

  // Inline Brand Save
  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      const newBnd = await categoryBrandRepository.createBrand({
        name: newBrandName.trim(),
        manufacturer: newBrandMfr.trim(),
        status: 'ACTIVE'
      });
      const brs = await categoryBrandRepository.getBrands();
      setBrands(brs.filter(b => b.status === 'ACTIVE'));
      setFormData(prev => ({ ...prev, brandId: newBnd.id || '' }));
      setNewBrandName('');
      setNewBrandMfr('');
      setShowBrandPopup(false);
    } catch (err) {
      console.error(err);
      alert("Error al agregar la marca");
    }
  };

  // Apply Manual Price Without Tax Calculator
  const handleApplyManualPrice = () => {
    const withoutTax = parseFloat(manualPriceInput) || 0;
    let total = withoutTax;
    let iva = 0;
    if (formData.taxRate > 0) {
      total = withoutTax * (1 + formData.taxRate / 100);
      iva = total - withoutTax;
    }

    let margin = formData.marginPercentage;
    if (formData.baseCost > 0) {
      margin = ((withoutTax - formData.baseCost) / formData.baseCost) * 100;
    }

    setPriceIncludedTaxInput(parseFloat(total.toFixed(2)));
    setFormData(prev => ({
      ...prev,
      salePrice: parseFloat(withoutTax.toFixed(2)),
      priceWithoutTax: parseFloat(withoutTax.toFixed(2)),
      ivaCalculated: parseFloat(iva.toFixed(2)),
      marginPercentage: parseFloat(margin.toFixed(2))
    }));
    setShowPriceWithoutTaxPopup(false);
    setManualPriceInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Prepare payload
    const payload = {
      ...formData,
      type: formData.type as any,
      priceA: hasPriceA ? formData.priceA : 0,
      priceASinImpuesto: hasPriceA ? formData.priceASinImpuesto : 0,
      priceB: hasPriceB ? formData.priceB : 0,
      priceBSinImpuesto: hasPriceB ? formData.priceBSinImpuesto : 0,
      priceC: hasPriceC ? formData.priceC : 0,
      priceCSinImpuesto: hasPriceC ? formData.priceCSinImpuesto : 0
    };

    try {
      let savedProduct;
      if (productToEdit && productToEdit.id) {
        await productRepository.update(productToEdit.id, payload);
        savedProduct = { ...payload, id: productToEdit.id };
      } else {
        savedProduct = await productRepository.create(payload);
      }

      if (formData.inventoryType === 'VIRTUAL') {
        onSuccess();
      } else {
        setSavedProductId(savedProduct.id || null);
        setNewPurchase(prev => ({
          ...prev,
          unitCost: formData.baseCost || 0
        }));
        setFormStep('stock_initialization');
      }
    } catch (err: any) {
      console.error("Error saving product:", err);
      if (err.issues) {
        setError(err.issues[0].message);
      } else {
        setError(err.message || 'Error al guardar el producto');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedProductId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Update stock limits in product document
      await productRepository.update(savedProductId, {
        stockMinimo,
        stockMaximo
      });

      // 2. Perform stock initialization if requested
      if (initStockType === 'existing_purchase') {
        if (!selectedPurchaseId) {
          throw new Error("Debe seleccionar una compra existente.");
        }
        if (newPurchase.quantity <= 0) {
          throw new Error("La cantidad a ingresar debe ser mayor a cero.");
        }
        
        await kardexService.registerTransaction(
          savedProductId,
          'sucursal-central-uuid',
          'PURCHASE_RECEIPT',
          selectedPurchaseId,
          newPurchase.quantity,
          newPurchase.unitCost
        );
      } else if (initStockType === 'new_purchase') {
        if (!newPurchase.supplierId) {
          throw new Error("Debe seleccionar un proveedor.");
        }
        if (!newPurchase.documentNumber.trim()) {
          throw new Error("Debe ingresar el número de factura.");
        }
        if (newPurchase.quantity <= 0) {
          throw new Error("La cantidad a ingresar debe ser mayor a cero.");
        }

        const txId = `tx_${new Date().getTime()}_compra_inicial`;
        const subtotal = newPurchase.quantity * newPurchase.unitCost;
        const iva = formData.taxRate > 0 ? (subtotal * (formData.taxRate / 100)) : 0;
        const total = subtotal + iva;

        // Create a new purchase document in finances_transactions
        const purchasePayload = {
          id: txId,
          type: 'egreso',
          documentType: 'factura',
          date: newPurchase.date,
          documentNumber: newPurchase.documentNumber.trim(),
          thirdPartyId: newPurchase.supplierId,
          category: 'compras_inventario',
          description: `Compra inicial de stock - ${formData.name}`,
          currency: 'USD',
          baseImponible: parseFloat(subtotal.toFixed(2)),
          ivaPorcentaje: formData.taxRate,
          ivaValor: parseFloat(iva.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          paymentMethod: newPurchase.paymentMethod,
          paymentStatus: newPurchase.paymentStatus,
          sriStatus: 'pendiente',
          paymentsBreakdown: {
            efectivo: newPurchase.paymentMethod === 'efectivo' ? parseFloat(total.toFixed(2)) : 0,
            transferencia: newPurchase.paymentMethod === 'transferencia' ? parseFloat(total.toFixed(2)) : 0,
            tarjeta: newPurchase.paymentMethod === 'tarjeta' ? parseFloat(total.toFixed(2)) : 0,
            cruce_cuentas: 0
          },
          items: [{
            productId: savedProductId,
            name: formData.name,
            sku: formData.sku.toUpperCase(),
            quantity: newPurchase.quantity,
            price: newPurchase.unitCost,
            taxRate: formData.taxRate,
            ivaCalculated: parseFloat(iva.toFixed(2)),
            subtotal: parseFloat(subtotal.toFixed(2)),
            total: parseFloat(total.toFixed(2))
          }],
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId), purchasePayload);

        // Register in Kardex
        await kardexService.registerTransaction(
          savedProductId,
          'sucursal-central-uuid',
          'PURCHASE_RECEIPT',
          txId,
          newPurchase.quantity,
          newPurchase.unitCost
        );
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error saving step 2:", err);
      setError(err.message || "Error al inicializar el inventario físico.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim() || !newSupplierRuc.trim()) return;

    try {
      const supId = `tp_${new Date().getTime()}_prov`;
      const supplierPayload = {
        id: supId,
        type: 'proveedor',
        name: newSupplierName.trim(),
        ruc: newSupplierRuc.trim(),
        phone: newSupplierPhone.trim(),
        email: newSupplierEmail.trim(),
        status: 'active',
        createdAt: new Date().toISOString()
      };

      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', supId);
      await setDoc(docRef, supplierPayload);

      // Refresh list and select it
      const tpCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties');
      const tpSnap = await getDocs(tpCol);
      const allTp = tpSnap.docs.map(d => d.data());
      const filteredSuppliers = allTp.filter(tp => tp.type === 'proveedor');
      setSuppliers(filteredSuppliers);
      
      setNewPurchase(prev => ({
        ...prev,
        supplierId: supId
      }));

      // Reset
      setNewSupplierName('');
      setNewSupplierRuc('');
      setNewSupplierPhone('');
      setNewSupplierEmail('');
      setShowNewSupplierPopup(false);
    } catch (err) {
      console.error("Error saving supplier inline:", err);
      alert("Error al guardar el proveedor.");
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-xl outline-none transition-all border text-xs ${
    isDarkMode 
      ? 'bg-black/30 border-white/10 text-white focus:border-primary focus:bg-black/50 shadow-inner' 
      : 'bg-white/50 border-gray-200 text-gray-800 focus:border-primary focus:bg-white shadow-inner'
  }`;

  const labelClass = `block text-[10px] font-bold mb-1 uppercase tracking-wider ${
    isDarkMode ? 'text-gray-400' : 'text-gray-500'
  }`;

  const iconContainerClass = `absolute left-3 top-1/2 -translate-y-1/2 text-gray-400`;

  const formJSX = (
    <div 
      className={isInline ? `w-full rounded-3xl border shadow-xl ${isDarkMode ? 'bg-gray-900/95 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}` : `relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border ${
        isDarkMode 
          ? 'bg-gray-900/95 border-white/10' 
          : 'bg-white/95 border-white/40'
      } custom-scrollbar`}
    >
      {/* Header */}
      <div className={`sticky top-0 z-10 px-6 py-4 border-b backdrop-blur-md flex items-center justify-between ${
        isDarkMode ? 'border-white/10 bg-gray-900/80' : 'border-gray-100 bg-white/80'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl shadow-inner ${isDarkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
            <Package size={20} />
          </div>
          <div>
            <h2 className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {productToEdit?.id ? 'Editar Producto' : 'Nuevo Producto'} - {
                formData.type === 'STANDARD' ? 'Estándar' :
                formData.type === 'SUBPRODUCT' ? 'Subproducto' :
                formData.type === 'COMBO' ? 'Combo' : 'Estándar'
              }
            </h2>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-505'}`}>
              {productToEdit?.id ? 'Edita los detalles del producto seleccionado' : 'Registra un nuevo artículo en tu inventario'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          type="button"
          className={`p-2 rounded-xl transition-all hover:scale-105 ${
            isDarkMode ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
          }`}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <form onSubmit={formStep === 'product_details' ? handleSubmit : handleStep2Submit} className="p-5 sm:p-6 space-y-6">
        {error && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-xs font-medium">{error}</p>
          </div>
        )}

        {formStep === 'product_details' ? (
          <>
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
          isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-150'
        }`}>
          <div>
            <span className="block text-xs font-bold">Mostrar en Ventas</span>
            <span className={`block text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Selecciona esta opción si deseas mostrar el producto en el módulo de ventas y POS.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.showInSales}
              onChange={(e) => setFormData(prev => ({ ...prev, showInSales: e.target.checked }))}
              className="sr-only peer" 
            />
            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Información Básica */}
        <div className="space-y-4">
          <h3 className={`text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${isDarkMode ? 'text-primary' : 'text-primary'}`}>
            <Box size={14} /> Información Básica
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Imagen del producto (compacta) */}
            <div className="md:col-span-3 flex flex-col justify-center items-center">
              <label className={labelClass}>Imagen del Producto</label>
              <div className="mt-1 flex items-center justify-center">
                {formData.imageUrl ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 group shadow-inner">
                    <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Vista previa" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-500 font-bold text-[10px]"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <label className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-300 bg-gray-50'
                  }`}>
                    <Image size={18} className="text-gray-400 mb-1" />
                    <span className="text-[9px] text-gray-505 font-bold">Añadir</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            {/* Código y Nombre */}
            <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <label className={labelClass}>Código / SKU / Barras *</label>
                <div className="relative">
                  <div className={iconContainerClass}><Tag size={14} /></div>
                  <input
                    type="text"
                    name="sku"
                    required
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="Ej. PROD-001 o Código de Barras"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              <div className="relative group">
                <label className={labelClass}>Nombre del Producto *</label>
                <div className="relative">
                  <div className={iconContainerClass}><Package size={14} /></div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej. Martillo de Acero 16oz"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              {/* Categoría Selector con Icono Popup */}
              <div className="relative group">
                <label className={labelClass}>Categoría</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className={iconContainerClass}><Tag size={14} /></div>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      className={`${inputClass} pl-9`}
                    >
                      <option value="">Sin Categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCategoryPopup(true)}
                    className={`p-2 rounded-xl transition-all border ${
                      isDarkMode 
                        ? 'bg-white/5 border-white/10 hover:bg-white/10 text-primary' 
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-primary'
                    }`}
                    title="Agregar Categoría"
                  >
                    <FolderPlus size={16} />
                  </button>
                </div>
              </div>

              {/* Marca Selector con Icono Popup */}
              <div className="relative group">
                <label className={labelClass}>Marca</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className={iconContainerClass}><Tag size={14} /></div>
                    <select
                      name="brandId"
                      value={formData.brandId}
                      onChange={handleInputChange}
                      className={`${inputClass} pl-9`}
                    >
                      <option value="">Sin Marca</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBrandPopup(true)}
                    className={`p-2 rounded-xl transition-all border ${
                      isDarkMode 
                        ? 'bg-white/5 border-white/10 hover:bg-white/10 text-primary' 
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-primary'
                    }`}
                    title="Agregar Marca"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="md:col-span-12 relative group">
              <label className={labelClass}>Descripción (Opcional)</label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-gray-400"><FileText size={14} /></div>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Detalles adicionales del producto..."
                  rows={2}
                  className={`${inputClass} pl-9 resize-none`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Gestión de Impuestos y Precio */}
        <div className="space-y-4">
          <h3 className={`text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <DollarSign size={14} /> Gestión de Impuestos y Precio
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Impuesto Selector */}
            <div className="md:col-span-3">
              <label className={labelClass}>Impuesto IVA (SRI)</label>
              <select
                name="taxRate"
                value={formData.taxRate}
                onChange={(e) => {
                  const rate = parseInt(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, taxRate: rate }));
                  // Recalculate with current input price
                  handlePriceIncludedChange(priceIncludedTaxInput, rate);
                }}
                className={inputClass}
              >
                <option value="15">IVA 15% (General)</option>
                <option value="0">IVA 0% (RIMPE/Básico)</option>
              </select>
            </div>

            {/* Precio sin impuestos */}
            <div className="md:col-span-3">
              <label className={labelClass}>Precio sin impuestos</label>
              <div className="relative">
                <div className={iconContainerClass}><DollarSign size={14} /></div>
                <input
                  type="text"
                  readOnly
                  value={formData.priceWithoutTax.toFixed(2)}
                  className={`${inputClass} pl-9 pr-8 bg-gray-100/50 dark:bg-black/40 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setManualPriceInput(formData.priceWithoutTax.toString());
                    setShowPriceWithoutTaxPopup(true);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary-dark transition-all"
                  title="Ingreso manual de precio sin impuesto"
                >
                  <Edit2 size={13} />
                </button>
              </div>
            </div>

            {/* IVA Calculado */}
            <div className="md:col-span-3">
              <label className={labelClass}>IVA calculado</label>
              <div className="relative">
                <div className={iconContainerClass}><DollarSign size={14} /></div>
                <input
                  type="text"
                  readOnly
                  value={formData.ivaCalculated.toFixed(2)}
                  className={`${inputClass} pl-9 bg-gray-100/50 dark:bg-black/40 font-mono text-gray-500`}
                />
              </div>
            </div>

            {/* Precio incluido impuestos */}
            <div className="md:col-span-3">
              <label className={labelClass}>Precio incluido impuestos *</label>
              <div className="relative">
                <div className={iconContainerClass}><DollarSign size={14} /></div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={priceIncludedTaxInput || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPriceIncludedTaxInput(val);
                    handlePriceIncludedChange(val, formData.taxRate);
                  }}
                  placeholder="0.00"
                  className={`${inputClass} pl-9 font-mono font-bold text-emerald-500`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Precios Adicionales */}
        <div className="space-y-4">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Lista de Precios
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Precio Base Display */}
            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? 'bg-[#151722]/40 border-white/5' : 'bg-gray-50 border-gray-150'
            }`}>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Precio Base</span>
              <div className="space-y-2">
                <div>
                  <span className="block text-[9px] text-gray-400">Sin impuestos</span>
                  <span className="block text-xs font-bold font-mono">${formData.priceWithoutTax.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-400">Incl. impuestos</span>
                  <span className="block text-xs font-bold font-mono text-emerald-500">${priceIncludedTaxInput.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Precio A */}
            <div className={`p-4 rounded-2xl border transition-all ${
              hasPriceA 
                ? (isDarkMode ? 'bg-[#151722]/80 border-primary/30' : 'bg-white border-primary/30 shadow-md')
                : (isDarkMode ? 'bg-white/[0.01] border-white/5 opacity-50' : 'bg-slate-100/50 border-slate-200 opacity-60')
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider">Precio A</span>
                <input 
                  type="checkbox" 
                  checked={hasPriceA} 
                  onChange={(e) => {
                    setHasPriceA(e.target.checked);
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, priceA: 0, priceASinImpuesto: 0 }));
                    }
                  }}
                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                />
              </div>
              {hasPriceA ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] text-gray-400">Incl. impuestos ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.priceA || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const priceSin = val / (1 + formData.taxRate / 100);
                        setFormData(prev => ({ 
                          ...prev, 
                          priceA: val, 
                          priceASinImpuesto: parseFloat(priceSin.toFixed(2)) 
                        }));
                      }}
                      className={`w-full px-2 py-1 rounded-lg border text-xs bg-transparent outline-none ${
                        isDarkMode ? 'border-white/10 text-white' : 'border-gray-300 text-gray-800'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-400">Sin impuestos</span>
                    <span className="block text-xs font-bold font-mono">${(formData.priceASinImpuesto || 0).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <span className="block text-xs text-gray-400 italic">Desactivado</span>
              )}
            </div>

            {/* Precio B */}
            <div className={`p-4 rounded-2xl border transition-all ${
              hasPriceB 
                ? (isDarkMode ? 'bg-[#151722]/80 border-primary/30' : 'bg-white border-primary/30 shadow-md')
                : (isDarkMode ? 'bg-white/[0.01] border-white/5 opacity-50' : 'bg-slate-100/50 border-slate-200 opacity-60')
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider">Precio B</span>
                <input 
                  type="checkbox" 
                  checked={hasPriceB} 
                  onChange={(e) => {
                    setHasPriceB(e.target.checked);
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, priceB: 0, priceBSinImpuesto: 0 }));
                    }
                  }}
                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                />
              </div>
              {hasPriceB ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] text-gray-400">Incl. impuestos ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.priceB || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const priceSin = val / (1 + formData.taxRate / 100);
                        setFormData(prev => ({ 
                          ...prev, 
                          priceB: val, 
                          priceBSinImpuesto: parseFloat(priceSin.toFixed(2)) 
                        }));
                      }}
                      className={`w-full px-2 py-1 rounded-lg border text-xs bg-transparent outline-none ${
                        isDarkMode ? 'border-white/10 text-white' : 'border-gray-300 text-gray-800'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-400">Sin impuestos</span>
                    <span className="block text-xs font-bold font-mono">${(formData.priceBSinImpuesto || 0).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <span className="block text-xs text-gray-400 italic">Desactivado</span>
              )}
            </div>

            {/* Precio C */}
            <div className={`p-4 rounded-2xl border transition-all ${
              hasPriceC 
                ? (isDarkMode ? 'bg-[#151722]/80 border-primary/30' : 'bg-white border-primary/30 shadow-md')
                : (isDarkMode ? 'bg-white/[0.01] border-white/5 opacity-50' : 'bg-slate-100/50 border-slate-200 opacity-60')
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider">Precio C</span>
                <input 
                  type="checkbox" 
                  checked={hasPriceC} 
                  onChange={(e) => {
                    setHasPriceC(e.target.checked);
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, priceC: 0, priceCSinImpuesto: 0 }));
                    }
                  }}
                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                />
              </div>
              {hasPriceC ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] text-gray-400">Incl. impuestos ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.priceC || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const priceSin = val / (1 + formData.taxRate / 100);
                        setFormData(prev => ({ 
                          ...prev, 
                          priceC: val, 
                          priceCSinImpuesto: parseFloat(priceSin.toFixed(2)) 
                        }));
                      }}
                      className={`w-full px-2 py-1 rounded-lg border text-xs bg-transparent outline-none ${
                        isDarkMode ? 'border-white/10 text-white' : 'border-gray-300 text-gray-800'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-400">Sin impuestos</span>
                    <span className="block text-xs font-bold font-mono">${(formData.priceCSinImpuesto || 0).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <span className="block text-xs text-gray-400 italic">Desactivado</span>
              )}
            </div>
          </div>
        </div>

        {/* Costo Base e Inventario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Costo Base */}
          <div className="space-y-3">
            <label className={labelClass}>Costo Base de Adquisición ($)</label>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ¿Cuánto te costó adquirir o producir este artículo? (Para calcular ganancia real)
            </p>
            <div className="relative">
              <div className={iconContainerClass}><DollarSign size={14} /></div>
              <input
                type="number"
                name="baseCost"
                min="0"
                step="0.01"
                value={formData.baseCost || ''}
                onChange={handleInputChange}
                placeholder="0.00"
                className={`${inputClass} pl-9 font-mono`}
              />
            </div>
            {formData.baseCost > 0 && (
              <span className="text-[10px] text-emerald-500 font-bold block">
                Margen de ganancia calculado: {formData.marginPercentage.toFixed(1)}%
              </span>
            )}
          </div>

          {/* Manejo de Inventario */}
          <div className="space-y-3">
            <label className={labelClass}>Manejo de Inventario</label>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Selecciona cómo deseas manejar el inventario de este producto
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, inventoryType: 'PHYSICAL' }))}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  formData.inventoryType === 'PHYSICAL'
                    ? (isDarkMode ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10' : 'border-primary bg-primary/5 text-primary shadow-sm')
                    : (isDarkMode ? 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5' : 'border-slate-200 bg-slate-50 text-gray-500 hover:bg-slate-100')
                }`}
              >
                <Box size={20} />
                <span className="text-xs font-bold">Físico</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, inventoryType: 'VIRTUAL' }))}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  formData.inventoryType === 'VIRTUAL'
                    ? (isDarkMode ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10' : 'border-primary bg-primary/5 text-primary shadow-sm')
                    : (isDarkMode ? 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5' : 'border-slate-200 bg-slate-50 text-gray-500 hover:bg-slate-100')
                }`}
              >
                <Layers size={20} />
                <span className="text-xs font-bold">Virtual</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="pt-4 flex justify-end gap-4 border-t border-dashed border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={`px-6 py-2 rounded-xl font-bold transition-all text-xs ${
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
            className="px-8 py-2 rounded-xl font-bold transition-all text-xs bg-primary hover:bg-primary text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={14} />
                Guardar Producto
              </>
            )}
          </button>
        </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className={`p-4.5 rounded-2xl border ${
              isDarkMode ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-primary/5 border-primary/15 text-primary-dark'
            } text-xs flex items-center gap-3`}>
              <Box size={22} className="shrink-0 animate-bounce" />
              <div>
                <p className="font-extrabold uppercase tracking-wide">Paso 2: Inicialización de Stock y Límites</p>
                <p className="mt-0.5 opacity-90">Configura los límites de stock y la cantidad inicial del inventario físico para el producto recién guardado.</p>
              </div>
            </div>

            {/* Límites de Stock */}
            <div className="space-y-4">
              <h3 className={`text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${isDarkMode ? 'text-primary' : 'text-primary'}`}>
                <Layers size={14} /> Límites de Control de Stock
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                  <label className={labelClass}>Stock Mínimo *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Nivel crítico para alertas de reabastecimiento.</p>
                </div>

                <div className="relative group">
                  <label className={labelClass}>Stock Máximo *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockMaximo}
                    onChange={(e) => setStockMaximo(parseInt(e.target.value) || 0)}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Capacidad máxima ideal para almacenamiento.</p>
                </div>
              </div>
            </div>

            {/* Inicializar Inventario */}
            <div className="space-y-4 pt-2">
              <h3 className={`text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                <DollarSign size={14} /> Inicializar Stock por medio de Compra
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setInitStockType('none')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    initStockType === 'none'
                      ? (isDarkMode ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10' : 'border-primary bg-primary/5 text-primary shadow-sm')
                      : (isDarkMode ? 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5' : 'border-slate-200 bg-slate-50 text-gray-550 hover:bg-slate-100')
                  }`}
                >
                  <span className="text-xs font-bold">Sin Stock Inicial</span>
                  <span className="text-[9px] opacity-70">Empezar con 0 unidades</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInitStockType('existing_purchase')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    initStockType === 'existing_purchase'
                      ? (isDarkMode ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10' : 'border-primary bg-primary/5 text-primary shadow-sm')
                      : (isDarkMode ? 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5' : 'border-slate-200 bg-slate-50 text-gray-555 hover:bg-slate-100')
                  }`}
                >
                  <span className="text-xs font-bold">Asociar Compra Existente</span>
                  <span className="text-[9px] opacity-70">Seleccionar factura previa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInitStockType('new_purchase')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    initStockType === 'new_purchase'
                      ? (isDarkMode ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10' : 'border-primary bg-primary/5 text-primary shadow-sm')
                      : (isDarkMode ? 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5' : 'border-slate-200 bg-slate-50 text-gray-555 hover:bg-slate-100')
                  }`}
                >
                  <span className="text-xs font-bold">Crear Compra Inline</span>
                  <span className="text-[9px] opacity-70">Ingresar factura nueva</span>
                </button>
              </div>

              {/* ASOCIAR A COMPRA EXISTENTE */}
              {initStockType === 'existing_purchase' && (
                <div className={`p-4.5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <label className={labelClass}>Seleccionar Factura de Compra *</label>
                    <select
                      required
                      value={selectedPurchaseId}
                      onChange={(e) => setSelectedPurchaseId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">-- Seleccionar Factura --</option>
                      {existingPurchases.map(purchase => {
                        const supName = suppliers.find(s => s.id === purchase.thirdPartyId)?.name || purchase.thirdParty?.name || 'Proveedor Desconocido';
                        return (
                          <option key={purchase.id} value={purchase.id} className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>
                            {purchase.date} | Doc: {purchase.documentNumber} | {supName} | Total: ${purchase.total.toFixed(2)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Cantidad a ingresar *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newPurchase.quantity}
                        onChange={(e) => setNewPurchase({ ...newPurchase, quantity: parseInt(e.target.value) || 0 })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Costo Unitario ($) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={newPurchase.unitCost}
                        onChange={(e) => setNewPurchase({ ...newPurchase, unitCost: parseFloat(e.target.value) || 0 })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CREAR COMPRA INLINE */}
              {initStockType === 'new_purchase' && (
                <div className={`p-4.5 rounded-2xl border space-y-4 ${
                  isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Proveedor Selector con botón + */}
                    <div>
                      <label className={labelClass}>Proveedor *</label>
                      <div className="flex items-center gap-2">
                        <select
                          required
                          value={newPurchase.supplierId}
                          onChange={(e) => setNewPurchase({ ...newPurchase, supplierId: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">-- Seleccionar Proveedor --</option>
                          {suppliers.map(sup => (
                            <option key={sup.id} value={sup.id} className={isDarkMode ? 'text-white bg-gray-900' : 'text-black bg-white'}>{sup.name} (RUC: {sup.ruc})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowNewSupplierPopup(true)}
                          className={`p-2 rounded-xl transition-all border ${
                            isDarkMode 
                              ? 'bg-white/5 border-white/10 hover:bg-white/10 text-primary' 
                              : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-primary'
                          }`}
                          title="Agregar Proveedor"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Número de Factura *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. 001-001-000000123"
                        value={newPurchase.documentNumber}
                        onChange={(e) => setNewPurchase({ ...newPurchase, documentNumber: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Fecha de Emisión *</label>
                      <input
                        type="date"
                        required
                        value={newPurchase.date}
                        onChange={(e) => setNewPurchase({ ...newPurchase, date: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Cantidad *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={newPurchase.quantity}
                          onChange={(e) => setNewPurchase({ ...newPurchase, quantity: parseInt(e.target.value) || 0 })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Costo Unitario *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={newPurchase.unitCost}
                          onChange={(e) => setNewPurchase({ ...newPurchase, unitCost: parseFloat(e.target.value) || 0 })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Método de Pago</label>
                      <select
                        value={newPurchase.paymentMethod}
                        onChange={(e) => setNewPurchase({ ...newPurchase, paymentMethod: e.target.value })}
                        className={inputClass}
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Estado del Pago</label>
                      <select
                        value={newPurchase.paymentStatus}
                        onChange={(e) => setNewPurchase({ ...newPurchase, paymentStatus: e.target.value })}
                        className={inputClass}
                      >
                        <option value="pagado">Pagado / Cobrado</option>
                        <option value="pendiente">Pendiente (Cuentas por Pagar)</option>
                      </select>
                    </div>
                  </div>

                  {/* Cálculos Resumen Compra */}
                  <div className={`p-3 rounded-xl border text-[10px] space-y-1.5 ${
                    isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-bold font-mono">
                        ${(newPurchase.quantity * newPurchase.unitCost).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA Aplicado ({formData.taxRate}%):</span>
                      <span className="font-bold font-mono">
                        ${(formData.taxRate > 0 ? ((newPurchase.quantity * newPurchase.unitCost) * (formData.taxRate / 100)) : 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-500 font-bold border-t border-dashed pt-1.5 mt-1 border-white/10">
                      <span>Total Egreso / Compra:</span>
                      <span className="font-mono">
                        ${(formData.taxRate > 0 
                          ? ((newPurchase.quantity * newPurchase.unitCost) * (1 + formData.taxRate / 100)) 
                          : (newPurchase.quantity * newPurchase.unitCost)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 Submit Buttons */}
            <div className="pt-4 flex justify-end gap-4 border-t border-dashed border-white/10">
              <button
                type="button"
                onClick={() => setFormStep('product_details')}
                disabled={loading}
                className={`px-6 py-2 rounded-xl font-bold transition-all text-xs ${
                  isDarkMode 
                    ? 'bg-white/5 hover:bg-white/10 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Volver a Paso 1
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2 rounded-xl font-bold transition-all text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Finalizar y Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* POPUP MODAL: AGREGAR CATEGORÍA */}
      {showCategoryPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-xl bg-black/55 animate-in fade-in duration-200">
          <form onSubmit={handleAddCategory} className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${
            isDarkMode ? 'bg-[#121214] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <FolderPlus className="text-primary" size={18} />
              Agregar Nueva Categoría
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1">Nombre de la Categoría *</label>
                <input 
                  type="text" 
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej. Herramientas"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1">Descripción</label>
                <textarea 
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Opcional..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCategoryPopup(false)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold ${
                    isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-[10px] font-bold bg-primary hover:bg-primary text-white"
                >
                  Guardar Categoría
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* POPUP MODAL: AGREGAR MARCA */}
      {showBrandPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-xl bg-black/55 animate-in fade-in duration-200">
          <form onSubmit={handleAddBrand} className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${
            isDarkMode ? 'bg-[#121214] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <Plus className="text-primary" size={18} />
              Agregar Nueva Marca
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1">Nombre de la Marca *</label>
                <input 
                  type="text" 
                  required
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Ej. Stanley"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1">Fabricante / Proveedor</label>
                <input 
                  type="text" 
                  value={newBrandMfr}
                  onChange={(e) => setNewBrandMfr(e.target.value)}
                  placeholder="Ej. Stanley Black & Decker"
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowBrandPopup(false)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold ${
                    isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-[10px] font-bold bg-primary hover:bg-primary text-white"
                >
                  Guardar Marca
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* POPUP MODAL: CALCULADOR DE PRECIOS SIN IMPUESTO */}
      {showPriceWithoutTaxPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-xl bg-black/55 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${
            isDarkMode ? 'bg-[#121214] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <DollarSign className="text-primary" size={18} />
              Calculador de Precio Sin Impuesto
            </h3>
            <p className={`text-[10px] mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Ingresa el precio subtotal sin impuestos y calcularemos el valor final automáticamente.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1">Ingresar Precio Sin Impuesto ($)</label>
                <div className="relative">
                  <div className={iconContainerClass}><DollarSign size={14} /></div>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    required
                    value={manualPriceInput}
                    onChange={(e) => setManualPriceInput(e.target.value)}
                    placeholder="0.00"
                    className={`${inputClass} pl-9 font-mono`}
                  />
                </div>
              </div>

              {/* Muestra cálculo rápido */}
              <div className={`p-3 rounded-xl border text-[10px] space-y-1.5 ${
                isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span>Impuesto Aplicado:</span>
                  <span className="font-bold">{formData.taxRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA Calculado:</span>
                  <span className="font-bold font-mono">
                    ${((parseFloat(manualPriceInput) || 0) * (formData.taxRate / 100)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Precio Final Estimado:</span>
                  <span className="font-mono">
                    ${((parseFloat(manualPriceInput) || 0) * (1 + formData.taxRate / 100)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowPriceWithoutTaxPopup(false)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold ${
                    isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleApplyManualPrice}
                  className="px-4 py-1.5 rounded-xl text-[10px] font-bold bg-primary hover:bg-primary text-white"
                >
                  Aplicar Precio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* POPUP MODAL: AGREGAR PROVEEDOR IN-SITU */}
      {showNewSupplierPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-xl bg-black/55 animate-in fade-in duration-200">
          <form onSubmit={handleAddNewSupplier} className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-[#121214] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Plus className="text-primary" size={18} />
              Agregar Nuevo Proveedor
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold uppercase mb-1">Razón Social / Nombre *</label>
                <input 
                  type="text" 
                  required
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Ej. Distribuidora S.A."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1">RUC / Cédula *</label>
                <input 
                  type="text" 
                  required
                  value={newSupplierRuc}
                  onChange={(e) => setNewSupplierRuc(e.target.value)}
                  placeholder="Ej. 1790011223001"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1">Teléfono</label>
                <input 
                  type="text" 
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="Opcional..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                  placeholder="Opcional..."
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowNewSupplierPopup(false)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold ${
                    isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-[10px] font-bold bg-primary hover:bg-primary text-white"
                >
                  Guardar Proveedor
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  if (isInline) {
    return formJSX;
  }

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/40 animate-in fade-in duration-300`}>
      {formJSX}
    </div>
  );
}
