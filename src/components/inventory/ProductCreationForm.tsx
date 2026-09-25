import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTextarea } from '../ui/controls';
import React, { useState, useEffect } from 'react';
import { 
  Package, DollarSign, Tag, Save, X, Box, 
  Percent, FileText, AlertCircle, Image, Edit2, 
  Plus, Layers, FolderPlus, HelpCircle
} from 'lucide-react';
import { collection, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../../firebase';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { categoryBrandRepository } from '../../modules/inventory/repositories/CategoryBrandRepository';
import { Category, Brand } from '../../modules/inventory/domain/schemas/category-brand.schema';
import { kardexService } from '../../modules/inventory/services/KardexService';
import { registerTransactionInventory } from '../../services/inventoryLedger';
import { sincronizarCompra } from '../../services/integracionFinanzasService';

interface ProductCreationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  isInline?: boolean;
  productToEdit?: any;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function ProductCreationForm({ 
  onClose, 
  onSuccess,
  isInline = false,
  productToEdit = null,
  showToast
}: ProductCreationFormProps) {
  // Main form state
  const [formData, setFormData] = useState({
    sku: productToEdit?.sku || '',
    name: productToEdit?.name || '',
    description: productToEdit?.description || '',
    parentId: productToEdit?.parentId || '',
    comboItems: productToEdit?.comboItems || [],
    codigoBarras: productToEdit?.codigoBarras || '',
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

    tax_mode: productToEdit?.tax_mode || 'EXCLUIDO',
    tarifa_iva: productToEdit?.tarifa_iva !== undefined ? productToEdit.tarifa_iva : (productToEdit?.taxRate !== undefined ? productToEdit.taxRate / 100 : 0.15),
    precio_sin_iva: productToEdit?.precio_sin_iva || 0,
    precio_con_iva: productToEdit?.precio_con_iva || 0,
    id_descuento_asociado: productToEdit?.id_descuento_asociado || ''
  });

  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  useEffect(() => { productRepository.findAll().then(setRelatedProducts).catch(() => setError('No se pudo cargar el catálogo de componentes.')); }, []);

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

  // Finances data fetching
  const [financesSuppliers, setFinancesSuppliers] = useState<any[]>([]);
  const [financesPurchases, setFinancesPurchases] = useState<any[]>([]);

  const [showPriceWithoutTaxPopup, setShowPriceWithoutTaxPopup] = useState(false);
  const [manualPriceInput, setManualPriceInput] = useState('');

  // Catalog selectors lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
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

  // Load categories, brands and discounts
  useEffect(() => {
    async function loadData() {
      try {
        const [cats, brs, discsSnap] = await Promise.all([
          categoryBrandRepository.getCategories(),
          categoryBrandRepository.getBrands(),
          getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'finances_discounts'))
        ]);
        setCategories(cats.filter(c => c.status === 'ACTIVE'));
        setBrands(brs.filter(b => b.status === 'ACTIVE'));
        const discsList = discsSnap.docs.map(doc => doc.data());
        setDiscounts(discsList.filter((d: any) => d.activo !== false && d.alcance === 'PRODUCTO'));
      } catch (err) {
        console.error("Error loading categories/brands/discounts:", err);
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
      const taxMode = productToEdit.tax_mode || 'EXCLUIDO';
      const tarifa = productToEdit.tarifa_iva !== undefined ? productToEdit.tarifa_iva : (productToEdit.taxRate !== undefined ? productToEdit.taxRate / 100 : 0.15);
      const sinIva = productToEdit.precio_sin_iva !== undefined ? productToEdit.precio_sin_iva : (productToEdit.priceWithoutTax || productToEdit.salePrice || 0);
      const conIva = productToEdit.precio_con_iva !== undefined ? productToEdit.precio_con_iva : (productToEdit.priceA || sinIva * (1 + tarifa));
      
      setPriceIncludedTaxInput(parseFloat(conIva.toFixed(2)));
      setFormData(prev => ({
        ...prev,
        tax_mode: taxMode,
        tarifa_iva: tarifa,
        precio_sin_iva: parseFloat(sinIva.toFixed(4)),
        precio_con_iva: parseFloat(conIva.toFixed(4)),
        salePrice: parseFloat(sinIva.toFixed(2)),
        priceWithoutTax: parseFloat(sinIva.toFixed(2)),
        ivaCalculated: parseFloat((conIva - sinIva).toFixed(2)),
        priceA: parseFloat(conIva.toFixed(2)),
        priceASinImpuesto: parseFloat(sinIva.toFixed(2)),
        priceB: productToEdit.priceB || 0,
        priceBSinImpuesto: productToEdit.priceBSinImpuesto || 0,
        priceC: productToEdit.priceC || 0,
        priceCSinImpuesto: productToEdit.priceCSinImpuesto || 0
      }));
    }
  }, [productToEdit]);

  const syncPrices = (taxMode: 'EXCLUIDO' | 'INCLUIDO', tarifa: number, sinIva: number, conIva: number, baseCost: number) => {
    let finalSin = sinIva;
    let finalCon = conIva;
    
    if (taxMode === 'EXCLUIDO') {
      finalCon = sinIva * (1 + tarifa);
    } else {
      finalSin = conIva / (1 + tarifa);
    }
    
    const iva = finalCon - finalSin;
    
    let margin = formData.marginPercentage;
    if (baseCost > 0) {
      margin = ((finalSin - baseCost) / baseCost) * 100;
    }
    
    setPriceIncludedTaxInput(parseFloat(finalCon.toFixed(2)));
    setFormData(prev => ({
      ...prev,
      precio_sin_iva: parseFloat(finalSin.toFixed(4)),
      precio_con_iva: parseFloat(finalCon.toFixed(4)),
      salePrice: parseFloat(finalSin.toFixed(2)),
      priceWithoutTax: parseFloat(finalSin.toFixed(2)),
      ivaCalculated: parseFloat(iva.toFixed(2)),
      marginPercentage: parseFloat(margin.toFixed(2)),
      priceA: parseFloat(finalCon.toFixed(2)),
      priceASinImpuesto: parseFloat(finalSin.toFixed(2))
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
          margin = ((prev.precio_sin_iva - cost) / cost) * 100;
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
    if (loading) return;
    setLoading(true);
    setError(null);

    // Prepare payload
    const cleanSku = (formData.sku || '').trim().toUpperCase();
    const payload = {
      ...formData,
      sku: cleanSku,
      type: formData.type as any,
      priceA: hasPriceA ? formData.priceA : 0,
      priceASinImpuesto: hasPriceA ? formData.priceASinImpuesto : 0,
      priceB: hasPriceB ? formData.priceB : 0,
      priceBSinImpuesto: hasPriceB ? formData.priceBSinImpuesto : 0,
      priceC: hasPriceC ? formData.priceC : 0,
      priceCSinImpuesto: hasPriceC ? formData.priceCSinImpuesto : 0
    };

    try {
      if (cleanSku) {
        const existingWithSku = await productRepository.findBySku(cleanSku);
        if (existingWithSku) {
          if (!productToEdit || (productToEdit.id && existingWithSku.id !== productToEdit.id)) {
            throw new Error(`El código SKU / referencia "${cleanSku}" ya está registrado por otro producto (${existingWithSku.name}). No se permiten duplicados.`);
          }
        }
      }

      let savedProduct;
      if (productToEdit && productToEdit.id) {
        await productRepository.update(productToEdit.id, payload);
        savedProduct = { ...payload, id: productToEdit.id };
      } else {
        savedProduct = await productRepository.create(payload);
      }

      if (formData.inventoryType === 'VIRTUAL' || formData.type === 'COMBO' || productToEdit?.id) {
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
      let errMsg = 'Error al guardar el producto';
      if (err.issues && err.issues[0]) {
        errMsg = err.issues[0].message;
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      if (showToast) {
        showToast(`Alerta de Validación: ${errMsg}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedProductId || loading) return;
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

        const txId = `compra_inicial_${savedProductId}`;
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
          financialSyncStatus: 'pending',
          proveedorNombre: suppliers.find(s => s.id === newPurchase.supplierId)?.name || '',
          paidAmount: newPurchase.paymentStatus === 'pagado' ? parseFloat(total.toFixed(2)) : 0,
          paymentsBreakdown: {
            efectivo: newPurchase.paymentStatus === 'pagado' && newPurchase.paymentMethod === 'efectivo' ? parseFloat(total.toFixed(2)) : 0,
            transferencia: newPurchase.paymentStatus === 'pagado' && newPurchase.paymentMethod === 'transferencia' ? parseFloat(total.toFixed(2)) : 0,
            tarjeta: newPurchase.paymentStatus === 'pagado' && newPurchase.paymentMethod === 'tarjeta' ? parseFloat(total.toFixed(2)) : 0,
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

        const purchaseRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId);
        const previous = (await getDoc(purchaseRef)).data();
        if (previous?.inventarioRegistrado && JSON.stringify(previous.items) !== JSON.stringify(purchasePayload.items)) throw new Error('El ingreso ya fue registrado. Mantén cantidades y costos para completar el registro financiero.');
        await setDoc(purchaseRef, purchasePayload, { merge: true });

        await registerTransactionInventory(db, appId, purchasePayload);
        await sincronizarCompra(purchasePayload, db);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId), { financialSyncStatus: 'complete' }, { merge: true });
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

    const trimmedRuc = newSupplierRuc.trim();
    const isDuplicate = suppliers.some((s: any) => s.ruc && s.ruc.trim() === trimmedRuc);
    if (isDuplicate) {
      alert("Ya existe un proveedor con este RUC/Identificación");
      return;
    }

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

  

  

  

  const formJSX = (
    <UiBox 
      {...(isInline ? mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full"}) : mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar"}))}
    >
      {/* Header */}
      <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
        <UiBox {...{"className":"flex items-center gap-3"}}>
          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-2"})}>
            <Package size={20} />
          </UiBox>
          <UiBox>
            <UiHeading as="h2" {...mergeThemeProps({"size":"2","weight":"bold","color":"gray","highContrast":true})}>
              {productToEdit?.id ? 'Editar Producto' : 'Nuevo Producto'} - {
                formData.type === 'STANDARD' ? 'Estándar' :
                formData.type === 'SUBPRODUCT' ? 'Subproducto' :
                formData.type === 'COMBO' ? 'Combo' : 'Estándar'
              }
            </UiHeading>
            <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray"})}>
              {productToEdit?.id ? 'Edita los detalles del producto seleccionado' : 'Registra un nuevo artículo en tu inventario'}
            </UiText>
          </UiBox>
        </UiBox>
        
        <UiButton iconOnly
          onClick={onClose}
          type="button"
          {...mergeThemeProps({"variant":"soft","color":"gray","className":"hover:scale-105"})}
        >
          <X size={18} />
        </UiButton>
      </UiCard>

      {/* Content */}
      <form onSubmit={formStep === 'product_details' ? handleSubmit : handleStep2Submit} {...{"className":"p-5 sm:p-6 space-y-6"}}>
        {error && (
          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-11)"},"className":"flex items-center gap-3 p-4"})}>
            <AlertCircle size={18} {...{"className":"shrink-0"}} />
            <UiText as="p" {...{"size":"1","weight":"medium"}}>{error}</UiText>
          </UiBox>
        )}

        {formStep === 'product_details' ? (
          <>
        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4 flex items-center justify-between"})}>
          <UiBox>
            <UiText {...{"size":"1","weight":"bold","className":"block"}}>Mostrar en Ventas</UiText>
            <UiText {...mergeThemeProps({"size":"1","color":"gray","className":"block"})}>
              Selecciona esta opción si deseas mostrar el producto en el módulo de ventas y POS.
            </UiText>
          </UiBox>
          <UiLabel {...{"className":"relative inline-flex items-center cursor-pointer"}}>
            <UiInput
              type="checkbox" 
              checked={formData.showInSales}
              onChange={(e) => setFormData(prev => ({ ...prev, showInSales: e.target.checked }))}
              {...{"className":"sr-only peer"}} 
            />
            <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"w-9 h-5 peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4"}}></UiBox>
          </UiLabel>
        </UiBox>

        {formData.type === 'SUBPRODUCT' && <UiLabel {...{}}>Producto padre
          <UiSelect required value={formData.parentId} onChange={e => setFormData(prev => ({ ...prev, parentId: e.target.value }))} {...{"className":"mt-2 w-full"}}>
            <option value="">Seleccionar producto padre</option>
            {relatedProducts.filter(p => p.id !== productToEdit?.id && p.type === 'STANDARD').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </UiSelect><UiText {...{"size":"1","color":"gray","className":"mt-2 block"}}>El subproducto conserva sus propias existencias.</UiText>
        </UiLabel>}
        {formData.type === 'COMBO' && <section {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4 space-y-3"}}>
          <UiHeading as="h3" {...{}}>Componentes del combo</UiHeading><UiText as="p" {...{"size":"2","color":"gray"}}>Al vender el combo se descuentan estas cantidades de cada componente.</UiText>
          {formData.comboItems.map((item: any, index: number) => <UiBox key={index} {...{"className":"flex gap-3 items-center"}}>
            <UiSelect required aria-label={`Componente ${index + 1}`} value={item.productId} onChange={e => setFormData(prev => ({ ...prev, comboItems: prev.comboItems.map((c: any, i: number) => i === index ? { ...c, productId: e.target.value } : c) }))} {...{"className":"flex-1 min-w-0"}}>
              <option value="">Seleccionar componente</option>{relatedProducts.filter(p => p.id !== productToEdit?.id && p.type !== 'COMBO' && p.status !== 'INACTIVE').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </UiSelect><UiInput aria-label={`Cantidad del componente ${index + 1}`} required type="number" min="0.001" step="0.001" value={item.quantity} onChange={e => setFormData(prev => ({ ...prev, comboItems: prev.comboItems.map((c: any, i: number) => i === index ? { ...c, quantity: Number(e.target.value) } : c) }))} {...{"className":"w-24"}} />
            <UiButton iconOnly type="button" aria-label="Quitar componente" {...{"variant":"surface","color":"blue"}} onClick={() => setFormData(prev => ({ ...prev, comboItems: prev.comboItems.filter((_: any, i: number) => i !== index) }))}><X size={16} /></UiButton>
          </UiBox>)}<UiButton type="button" {...{"variant":"surface","color":"blue"}} onClick={() => setFormData(prev => ({ ...prev, comboItems: [...prev.comboItems, { productId: '', quantity: 1 }] }))}><Plus size={16} />Agregar componente</UiButton>
        </section>}
        {/* Información Básica */}
        <UiBox {...{"className":"space-y-4"}}>
          <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"blue","className":"flex items-center gap-2"})}>
            <Box size={14} /> Información Básica
          </UiHeading>
          
          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-12 gap-4"}}>
            {/* Imagen del producto (compacta) */}
            <UiBox {...{"className":"md:col-span-3 flex flex-col justify-center items-center"}}>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Imagen del Producto</UiLabel>
              <UiBox {...{"className":"mt-1 flex items-center justify-center"}}>
                {formData.imageUrl ? (
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"relative w-20 h-20 overflow-hidden group"}}>
                    <img src={formData.imageUrl} {...{"className":"w-full h-full object-cover"}} alt="Vista previa" />
                    <UiButton
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      {...{"variant":"solid","color":"red","size":"2","className":"absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"}}
                    >
                      Quitar
                    </UiButton>
                  </UiBox>
                ) : (
                  <UiLabel {...mergeThemeProps({"className":"w-20 h-20 flex flex-col items-center justify-center cursor-pointer"})}>
                    <Image size={18} {...{"style":{"color":"var(--gray-11)"},"className":"mb-1"}} />
                    <UiText {...{"size":"1","color":"gray","weight":"bold"}}>Añadir</UiText>
                    <UiInput type="file" accept="image/*" {...{"className":"hidden"}} onChange={handleImageChange} />
                  </UiLabel>
                )}
              </UiBox>
            </UiBox>

            {/* Código y Nombre */}
            <UiBox {...{"className":"md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4"}}>
              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Código / SKU / Barras *</UiLabel>
                <UiInput
                  type="text"
                  name="sku"
                  required
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="Ej. PROD-001 o Código de Barras"
                  iconPrefix={<Tag size={14} className="text-[var(--gray-10)]" />}
                  {...mergeThemeProps({}, {}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
                />
              </UiBox>

              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Nombre del Producto *</UiLabel>
                <UiInput
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ej. Martillo de Acero 16oz"
                  iconPrefix={<Package size={14} className="text-[var(--gray-10)]" />}
                  {...mergeThemeProps({}, {}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
                />
              </UiBox>

              {/* Categoría Selector con Icono Popup */}
              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Categoría</UiLabel>
                <UiBox {...{"className":"flex items-center gap-2"}}>
                  <UiBox {...{"className":"relative flex-1"}}>
                    <UiSelect
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      {...mergeThemeProps({}, {}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
                    >
                      <option value="">Sin Categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </UiSelect>
                  </UiBox>
                  <UiButton iconOnly
                    type="button"
                    onClick={() => setShowCategoryPopup(true)}
                    {...mergeThemeProps({"variant":"soft","color":"blue"})}
                    title="Agregar Categoría"
                  >
                    <FolderPlus size={16} />
                  </UiButton>
                </UiBox>
              </UiBox>

              {/* Marca Selector con Icono Popup */}
              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Marca</UiLabel>
                <UiBox {...{"className":"flex items-center gap-2"}}>
                  <UiBox {...{"className":"relative flex-1"}}>
                    <UiSelect
                      name="brandId"
                      value={formData.brandId}
                      onChange={handleInputChange}
                      {...mergeThemeProps({}, {}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
                    >
                      <option value="">Sin Marca</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </UiSelect>
                  </UiBox>
                  <UiButton iconOnly
                    type="button"
                    onClick={() => setShowBrandPopup(true)}
                    {...mergeThemeProps({"variant":"soft","color":"blue"})}
                    title="Agregar Marca"
                  >
                    <Plus size={16} />
                  </UiButton>
                </UiBox>
              </UiBox>
            </UiBox>

            {/* Descripción */}
            <UiBox {...{"className":"md:col-span-12 relative group"}}>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Descripción (Opcional)</UiLabel>
              <UiTextarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detalles adicionales del producto..."
                rows={2}
                {...mergeThemeProps({}, {"className":"resize-none"}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
              />
            </UiBox>
          </UiBox>
        </UiBox>

        {/* Gestión de Impuestos y Precio */}
        <UiBox {...{"className":"space-y-4"}}>
          <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"green","className":"flex items-center gap-2"})}>
            <DollarSign size={14} /> Gestión de Impuestos y Precio
          </UiHeading>

          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-12 gap-4 items-end"}}>
            {/* Régimen de IVA */}
            <UiBox {...{"className":"md:col-span-3"}}>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Régimen de IVA</UiLabel>
              <UiSelect
                name="tax_mode"
                value={formData.tax_mode}
                onChange={(e) => {
                  const mode = e.target.value as 'EXCLUIDO' | 'INCLUIDO';
                  setFormData(prev => ({ ...prev, tax_mode: mode }));
                  syncPrices(mode, formData.tarifa_iva, formData.precio_sin_iva, formData.precio_con_iva, formData.baseCost);
                }}
                {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
              >
                <option value="EXCLUIDO">Precio Excluye IVA (EXCLUIDO)</option>
                <option value="INCLUIDO">Precio Incluye IVA (INCLUIDO)</option>
              </UiSelect>
            </UiBox>

            {/* Tarifa IVA Selector */}
            <UiBox {...{"className":"md:col-span-3"}}>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Tarifa IVA (SRI)</UiLabel>
              <UiSelect
                name="tarifa_iva"
                value={formData.tarifa_iva}
                onChange={(e) => {
                  const tarifa = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, tarifa_iva: tarifa, taxRate: tarifa * 100 }));
                  syncPrices(formData.tax_mode, tarifa, formData.precio_sin_iva, formData.precio_con_iva, formData.baseCost);
                }}
                {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
              >
                <option value="0.15">IVA 15% (General)</option>
                <option value="0.12">IVA 12%</option>
                <option value="0.05">IVA 5% (Construcción)</option>
                <option value="0">IVA 0% (Exento)</option>
              </UiSelect>
            </UiBox>

            {/* Precio sin impuestos */}
            <UiBox {...{"className":"md:col-span-3"}}>
              <UiBox {...{"className":"flex items-center justify-between mb-1.5"}}>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Precio sin IVA</UiLabel>
                {formData.tax_mode === 'INCLUIDO' && (
                  <UiText {...{"size":"1","color":"gray","weight":"bold","className":"px-1.5 py-0.5"}}>Autocalculado</UiText>
                )}
              </UiBox>
              <UiInput
                type="number"
                min="0"
                step="0.0001"
                required
                disabled={formData.tax_mode === 'INCLUIDO'}
                value={formData.precio_sin_iva || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, precio_sin_iva: val }));
                  syncPrices('EXCLUIDO', formData.tarifa_iva, val, formData.precio_con_iva, formData.baseCost);
                }}
                iconPrefix={<DollarSign size={14} className="text-[var(--gray-10)]" />}
                {...mergeThemeProps({}, {}, {}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}), (formData.tax_mode === 'INCLUIDO' ? {"color":"gray"} : {}))}
              />
            </UiBox>

            {/* Precio incluido impuestos */}
            <UiBox {...{"className":"md:col-span-3"}}>
              <UiBox {...{"className":"flex items-center justify-between mb-1.5"}}>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Precio con IVA *</UiLabel>
                {formData.tax_mode === 'EXCLUIDO' && (
                  <UiText {...{"size":"1","color":"gray","weight":"bold","className":"px-1.5 py-0.5"}}>Autocalculado</UiText>
                )}
              </UiBox>
              <UiInput
                type="number"
                min="0"
                step="0.01"
                required
                disabled={formData.tax_mode === 'EXCLUIDO'}
                value={formData.precio_con_iva || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, precio_con_iva: val }));
                  syncPrices('INCLUIDO', formData.tarifa_iva, formData.precio_sin_iva, val, formData.baseCost);
                }}
                placeholder="0.00"
                iconPrefix={<DollarSign size={14} className="text-[var(--gray-10)]" />}
                {...mergeThemeProps({}, {"color":"green"}, {}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}), (formData.tax_mode === 'EXCLUIDO' ? {"color":"gray"} : {}))}
              />
            </UiBox>
          </UiBox>
          
          <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"italic flex items-center gap-1"}}>
            <UiText>IVA Calculado:</UiText>
            <UiText {...{"weight":"regular","color":"gray","highContrast":true}}>${formData.ivaCalculated.toFixed(2)}</UiText>
          </UiBox>
        </UiBox>

        {/* Lista de Precios Adicionales */}
        <UiBox {...{"className":"space-y-4"}}>
          <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"gray"})}>
            Lista de Precios
          </UiHeading>
          
          <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-4 gap-4"}}>
            {/* Precio Base Display */}
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4"})}>
              <UiText {...{"size":"1","weight":"bold","color":"gray","className":"block mb-2"}}>Precio Base</UiText>
              <UiBox {...{"className":"space-y-2"}}>
                <UiBox>
                  <UiText {...{"size":"1","color":"gray","className":"block"}}>Sin impuestos</UiText>
                  <UiText {...{"size":"1","weight":"regular","className":"block"}}>${formData.priceWithoutTax.toFixed(2)}</UiText>
                </UiBox>
                <UiBox>
                  <UiText {...{"size":"1","color":"gray","className":"block"}}>Incl. impuestos</UiText>
                  <UiText {...{"size":"1","weight":"regular","color":"green","className":"block"}}>${priceIncludedTaxInput.toFixed(2)}</UiText>
                </UiBox>
              </UiBox>
            </UiBox>

            {/* Precio A */}
            <UiCard {...mergeThemeProps({"className":"p-4"}, {}, (hasPriceA ? {"style":{"backgroundColor":"var(--color-panel-solid)"}} : {"style":{"backgroundColor":"var(--gray-2)"},"className":"opacity-60"}))}>
              <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
                <UiText {...{"size":"1","weight":"bold","className":"block"}}>Precio A</UiText>
                <UiInput
                  type="checkbox" 
                  checked={hasPriceA} 
                  onChange={(e) => {
                    setHasPriceA(e.target.checked);
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, priceA: 0, priceASinImpuesto: 0 }));
                    }
                  }}
                  {...{"color":"blue","className":"w-3.5 cursor-pointer"}}
                />
              </UiBox>
              {hasPriceA ? (
                <UiBox {...{"className":"space-y-2"}}>
                  <UiBox>
                    <UiLabel {...{"size":"1","color":"gray","className":"block"}}>Incl. impuestos ($)</UiLabel>
                    <UiInput
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
                      {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                    />
                  </UiBox>
                  <UiBox>
                    <UiText {...{"size":"1","color":"gray","className":"block"}}>Sin impuestos</UiText>
                    <UiText {...{"size":"1","weight":"regular","className":"block"}}>${(formData.priceASinImpuesto || 0).toFixed(2)}</UiText>
                  </UiBox>
                </UiBox>
              ) : (
                <UiText {...{"size":"1","color":"gray","className":"block italic"}}>Desactivado</UiText>
              )}
            </UiCard>

            {/* Precio B */}
            <UiCard {...mergeThemeProps({"className":"p-4"}, {}, (hasPriceB ? {"style":{"backgroundColor":"var(--color-panel-solid)"}} : {"style":{"backgroundColor":"var(--gray-2)"},"className":"opacity-60"}))}>
              <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
                <UiText {...{"size":"1","weight":"bold","className":"block"}}>Precio B</UiText>
                <UiInput
                  type="checkbox" 
                  checked={hasPriceB} 
                  onChange={(e) => {
                    setHasPriceB(e.target.checked);
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, priceB: 0, priceBSinImpuesto: 0 }));
                    }
                  }}
                  {...{"color":"blue","className":"w-3.5 cursor-pointer"}}
                />
              </UiBox>
              {hasPriceB ? (
                <UiBox {...{"className":"space-y-2"}}>
                  <UiBox>
                    <UiLabel {...{"size":"1","color":"gray","className":"block"}}>Incl. impuestos ($)</UiLabel>
                    <UiInput
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
                      {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                    />
                  </UiBox>
                  <UiBox>
                    <UiText {...{"size":"1","color":"gray","className":"block"}}>Sin impuestos</UiText>
                    <UiText {...{"size":"1","weight":"regular","className":"block"}}>${(formData.priceBSinImpuesto || 0).toFixed(2)}</UiText>
                  </UiBox>
                </UiBox>
              ) : (
                <UiText {...{"size":"1","color":"gray","className":"block italic"}}>Desactivado</UiText>
              )}
            </UiCard>

            {/* Precio C */}
            <UiCard {...mergeThemeProps({"className":"p-4"}, {}, (hasPriceC ? {"style":{"backgroundColor":"var(--color-panel-solid)"}} : {"style":{"backgroundColor":"var(--gray-2)"},"className":"opacity-60"}))}>
              <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
                <UiText {...{"size":"1","weight":"bold","className":"block"}}>Precio C</UiText>
                <UiInput
                  type="checkbox" 
                  checked={hasPriceC} 
                  onChange={(e) => {
                    setHasPriceC(e.target.checked);
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, priceC: 0, priceCSinImpuesto: 0 }));
                    }
                  }}
                  {...{"color":"blue","className":"w-3.5 cursor-pointer"}}
                />
              </UiBox>
              {hasPriceC ? (
                <UiBox {...{"className":"space-y-2"}}>
                  <UiBox>
                    <UiLabel {...{"size":"1","color":"gray","className":"block"}}>Incl. impuestos ($)</UiLabel>
                    <UiInput
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
                      {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                    />
                  </UiBox>
                  <UiBox>
                    <UiText {...{"size":"1","color":"gray","className":"block"}}>Sin impuestos</UiText>
                    <UiText {...{"size":"1","weight":"regular","className":"block"}}>${(formData.priceCSinImpuesto || 0).toFixed(2)}</UiText>
                  </UiBox>
                </UiBox>
              ) : (
                <UiText {...{"size":"1","color":"gray","className":"block italic"}}>Desactivado</UiText>
              )}
            </UiCard>
          </UiBox>
        </UiBox>

        {/* Costo Base e Inventario */}
        <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-6 pt-2"}}>
          {/* Costo Base */}
          <UiBox {...{"className":"space-y-3"}}>
            <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Costo Base de Adquisición ($)</UiLabel>
            <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray"})}>
              ¿Cuánto te costó adquirir o producir este artículo? (Para calcular ganancia real)
            </UiText>
            <UiInput
              type="number"
              name="baseCost"
              min="0"
              step="0.01"
              value={formData.baseCost || ''}
              onChange={handleInputChange}
              placeholder="0.00"
              iconPrefix={<DollarSign size={14} className="text-[var(--gray-10)]" />}
              {...mergeThemeProps({}, {}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
            />
            {formData.baseCost > 0 && (
              <UiText {...{"size":"1","color":"green","weight":"bold","className":"block"}}>
                Margen de ganancia calculado: {formData.marginPercentage.toFixed(1)}%
              </UiText>
            )}
          </UiBox>

          {/* Manejo de Inventario */}
          <UiBox {...{"className":"space-y-3"}}>
            <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Manejo de Inventario</UiLabel>
            <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray"})}>
              Selecciona cómo deseas manejar el inventario de este producto
            </UiText>
            <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
              <UiButton
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, inventoryType: 'PHYSICAL' }))}
                {...mergeThemeProps({"variant":"outline","className":"text-center flex flex-col items-center justify-center gap-1.5"}, {}, (formData.inventoryType === 'PHYSICAL' ? {"variant":"soft","color":"blue"} : {"variant":"soft","color":"gray"}))}
              >
                <Box size={20} />
                <UiText {...{"size":"1","weight":"bold"}}>Físico</UiText>
              </UiButton>

              <UiButton
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, inventoryType: 'VIRTUAL' }))}
                {...mergeThemeProps({"variant":"outline","className":"text-center flex flex-col items-center justify-center gap-1.5"}, {}, (formData.inventoryType === 'VIRTUAL' ? {"variant":"soft","color":"blue"} : {"variant":"soft","color":"gray"}))}
              >
                <Layers size={20} />
                <UiText {...{"size":"1","weight":"bold"}}>Virtual</UiText>
              </UiButton>
            </UiBox>
          </UiBox>
        </UiBox>

        {/* PESTAÑA / APARTADO DE PROMOCIONES Y DESCUENTOS */}
        <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-4 space-y-4"}}>
          <UiBox {...{"style":{"color":"var(--blue-12)"},"className":"flex items-center gap-1.5"}}>
            <Tag size={15} />
            <UiHeading as="h3" {...{"size":"1","weight":"bold"}}>Promociones y Descuentos</UiHeading>
          </UiBox>
          
          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-4"}}>
            {/* Selector de Descuento Individual */}
            <UiBox>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Asignar Descuento al Producto</UiLabel>
              <UiSelect
                name="id_descuento_asociado"
                value={formData.id_descuento_asociado || ''}
                onChange={handleInputChange}
                {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
              >
                <option value="">-- Sin Descuento Individual --</option>
                {discounts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : `$${d.valor}`})
                  </option>
                ))}
              </UiSelect>
              <UiText as="p" {...{"size":"1","color":"gray","weight":"bold","className":"mt-1"}}>
                Este descuento se aplicará de forma automática en el POS y facturación para este producto.
              </UiText>
            </UiBox>

            {/* Heredado de Categoría */}
            <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"p-3.5 flex flex-col justify-center"}}>
              <UiText {...{"size":"1","weight":"bold","color":"gray","className":"mb-1"}}>
                Descuento Heredado de Categoría
              </UiText>
              {(() => {
                const activeCat = categories.find(c => c.id === formData.categoryId);
                if (activeCat && activeCat.id_descuento_asociado) {
                  const disc = discounts.find(d => d.id === activeCat.id_descuento_asociado);
                  if (disc) {
                    return (
                      <UiBox>
                        <UiText as="p" {...{"size":"1","weight":"bold","color":"red","className":"flex items-center gap-1"}}>
                          <Tag size={12} /> {disc.nombre}
                        </UiText>
                        <UiText as="p" {...{"size":"1","color":"gray","weight":"bold","className":"mt-1 leading-normal"}}>
                          Heredado automáticamente de la categoría <strong>{activeCat.name}</strong>.
                          {formData.id_descuento_asociado && (
                            <UiText {...{"color":"orange","weight":"bold","className":"block mt-1"}}>
                              * Nota: El descuento individual del producto tiene prioridad sobre el de la categoría.
                            </UiText>
                          )}
                        </UiText>
                      </UiBox>
                    );
                  }
                }
                return (
                  <UiText as="p" {...{"size":"1","color":"gray","className":"italic"}}>
                    La categoría seleccionada no tiene descuentos asociados.
                  </UiText>
                );
              })()}
            </UiBox>
          </UiBox>
        </UiBox>

        {/* Submit Buttons */}
        <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-4 flex justify-end gap-4"}}>
          <UiButton
            type="button"
            onClick={onClose}
            disabled={loading}
            {...mergeThemeProps({"size":"2","variant":"soft","color":"gray"})}
          >
            Cancelar
          </UiButton>
          <UiButton
            type="submit"
            disabled={loading}
            {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"}}
          >
            {loading ? (
              <>
                <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"w-4 h-4 animate-spin"}} />
                Guardando...
              </>
            ) : (
              <>
                <Save size={14} />
                Guardar Producto
              </>
            )}
          </UiButton>
        </UiBox>
          </>
        ) : (
          <UiBox {...{"className":"space-y-6"}}>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-4.5 flex items-center gap-3"})}>
              <Box size={22} {...{"className":"shrink-0 animate-bounce"}} />
              <UiBox>
                <UiText as="p" {...{"weight":"bold"}}>Paso 2: Inicialización de Stock y Límites</UiText>
                <UiText as="p" {...{"className":"mt-0.5 opacity-90"}}>Configura los límites de stock y la cantidad inicial del inventario físico para el producto recién guardado.</UiText>
              </UiBox>
            </UiBox>

            {/* Límites de Stock */}
            <UiBox {...{"className":"space-y-4"}}>
              <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"blue","className":"flex items-center gap-2"})}>
                <Layers size={14} /> Límites de Control de Stock
              </UiHeading>
              <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-4"}}>
                <UiBox {...{"className":"relative group"}}>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Stock Mínimo *</UiLabel>
                  <UiInput
                    type="number"
                    min="0"
                    required
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  />
                  <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Nivel crítico para alertas de reabastecimiento.</UiText>
                </UiBox>

                <UiBox {...{"className":"relative group"}}>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Stock Máximo *</UiLabel>
                  <UiInput
                    type="number"
                    min="1"
                    required
                    value={stockMaximo}
                    onChange={(e) => setStockMaximo(parseInt(e.target.value) || 0)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  />
                  <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Capacidad máxima ideal para almacenamiento.</UiText>
                </UiBox>
              </UiBox>
            </UiBox>

            {/* Inicializar Inventario */}
            <UiBox {...{"className":"space-y-4 pt-2"}}>
              <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"green","className":"flex items-center gap-2"})}>
                <DollarSign size={14} /> Inicializar Stock por medio de Compra
              </UiHeading>
              
              <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-3 gap-3"}}>
                <UiButton
                  type="button"
                  onClick={() => setInitStockType('none')}
                  {...mergeThemeProps({"variant":"outline","className":"text-center flex flex-col items-center justify-center gap-1"}, {}, (initStockType === 'none' ? {"variant":"soft","color":"blue"} : {"variant":"soft","color":"gray"}))}
                >
                  <UiText {...{"size":"1","weight":"bold"}}>Sin Stock Inicial</UiText>
                  <UiText {...{"size":"1","className":"opacity-70"}}>Empezar con 0 unidades</UiText>
                </UiButton>

                <UiButton
                  type="button"
                  onClick={() => setInitStockType('existing_purchase')}
                  {...mergeThemeProps({"variant":"outline","className":"text-center flex flex-col items-center justify-center gap-1"}, {}, (initStockType === 'existing_purchase' ? {"variant":"soft","color":"blue"} : {"variant":"soft","color":"gray"}))}
                >
                  <UiText {...{"size":"1","weight":"bold"}}>Asociar Compra Existente</UiText>
                  <UiText {...{"size":"1","className":"opacity-70"}}>Seleccionar factura previa</UiText>
                </UiButton>

                <UiButton
                  type="button"
                  onClick={() => setInitStockType('new_purchase')}
                  {...mergeThemeProps({"variant":"outline","className":"text-center flex flex-col items-center justify-center gap-1"}, {}, (initStockType === 'new_purchase' ? {"variant":"soft","color":"blue"} : {"variant":"soft","color":"gray"}))}
                >
                  <UiText {...{"size":"1","weight":"bold"}}>Crear Compra Inline</UiText>
                  <UiText {...{"size":"1","className":"opacity-70"}}>Ingresar factura nueva</UiText>
                </UiButton>
              </UiBox>

              {/* ASOCIAR A COMPRA EXISTENTE */}
              {initStockType === 'existing_purchase' && (
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4.5 space-y-4"})}>
                  <UiBox>
                    <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Seleccionar Factura de Compra *</UiLabel>
                    <UiSelect
                      required
                      value={selectedPurchaseId}
                      onChange={(e) => setSelectedPurchaseId(e.target.value)}
                      {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                    >
                      <option value="">-- Seleccionar Factura --</option>
                      {existingPurchases.map(purchase => {
                        const supName = suppliers.find(s => s.id === purchase.thirdPartyId)?.name || purchase.thirdParty?.name || 'Proveedor Desconocido';
                        return (
                          <option key={purchase.id} value={purchase.id} {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>
                            {purchase.date} | Doc: {purchase.documentNumber} | {supName} | Total: ${purchase.total.toFixed(2)}
                          </option>
                        );
                      })}
                    </UiSelect>
                  </UiBox>

                  <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Cantidad a ingresar *</UiLabel>
                      <UiInput
                        type="number"
                        min="1"
                        required
                        value={newPurchase.quantity}
                        onChange={(e) => setNewPurchase({ ...newPurchase, quantity: parseInt(e.target.value) || 0 })}
                        {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Costo Unitario ($) *</UiLabel>
                      <UiInput
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={newPurchase.unitCost}
                        onChange={(e) => setNewPurchase({ ...newPurchase, unitCost: parseFloat(e.target.value) || 0 })}
                        {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      />
                    </UiBox>
                  </UiBox>
                </UiBox>
              )}

              {/* CREAR COMPRA INLINE */}
              {initStockType === 'new_purchase' && (
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4.5 space-y-4"})}>
                  <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-4"}}>
                    {/* Proveedor Selector con botón + */}
                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Proveedor *</UiLabel>
                      <UiBox {...{"className":"flex items-center gap-2"}}>
                        <UiSelect
                          required
                          value={newPurchase.supplierId}
                          onChange={(e) => setNewPurchase({ ...newPurchase, supplierId: e.target.value })}
                          {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                        >
                          <option value="">-- Seleccionar Proveedor --</option>
                          {suppliers.map(sup => (
                            <option key={sup.id} value={sup.id} {...{"style":{"color":"var(--gray-12)","backgroundColor":"var(--color-panel-solid)"}}}>{sup.name} (RUC: {sup.ruc})</option>
                          ))}
                        </UiSelect>
                        <UiButton iconOnly
                          type="button"
                          onClick={() => setShowNewSupplierPopup(true)}
                          {...mergeThemeProps({"variant":"soft","color":"blue"})}
                          title="Agregar Proveedor"
                        >
                          <Plus size={16} />
                        </UiButton>
                      </UiBox>
                    </UiBox>

                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Número de Factura *</UiLabel>
                      <UiInput
                        type="text"
                        required
                        placeholder="Ej. 001-001-000000123"
                        value={newPurchase.documentNumber}
                        onChange={(e) => setNewPurchase({ ...newPurchase, documentNumber: e.target.value })}
                        {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      />
                    </UiBox>

                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Fecha de Emisión *</UiLabel>
                      <UiInput
                        type="date"
                        required
                        value={newPurchase.date}
                        onChange={(e) => setNewPurchase({ ...newPurchase, date: e.target.value })}
                        {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      />
                    </UiBox>

                    <UiBox {...{"className":"grid grid-cols-2 gap-2"}}>
                      <UiBox>
                        <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Cantidad *</UiLabel>
                        <UiInput
                          type="number"
                          min="1"
                          required
                          value={newPurchase.quantity}
                          onChange={(e) => setNewPurchase({ ...newPurchase, quantity: parseInt(e.target.value) || 0 })}
                          {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                        />
                      </UiBox>
                      <UiBox>
                        <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Costo Unitario *</UiLabel>
                        <UiInput
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={newPurchase.unitCost}
                          onChange={(e) => setNewPurchase({ ...newPurchase, unitCost: parseFloat(e.target.value) || 0 })}
                          {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                        />
                      </UiBox>
                    </UiBox>

                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Método de Pago</UiLabel>
                      <UiSelect
                        value={newPurchase.paymentMethod}
                        onChange={(e) => setNewPurchase({ ...newPurchase, paymentMethod: e.target.value })}
                        {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                      </UiSelect>
                    </UiBox>

                    <UiBox>
                      <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1"})}>Estado del Pago</UiLabel>
                      <UiSelect
                        value={newPurchase.paymentStatus}
                        onChange={(e) => setNewPurchase({ ...newPurchase, paymentStatus: e.target.value })}
                        {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      >
                        <option value="pagado">Pagado / Cobrado</option>
                        <option value="pendiente">Pendiente (Cuentas por Pagar)</option>
                      </UiSelect>
                    </UiBox>
                  </UiBox>

                  {/* Cálculos Resumen Compra */}
                  <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3 space-y-1.5"})}>
                    <UiBox {...{"className":"flex justify-between"}}>
                      <UiText>Subtotal:</UiText>
                      <UiText {...{"weight":"regular"}}>
                        ${(newPurchase.quantity * newPurchase.unitCost).toFixed(2)}
                      </UiText>
                    </UiBox>
                    <UiBox {...{"className":"flex justify-between"}}>
                      <UiText>IVA Aplicado ({formData.taxRate}%):</UiText>
                      <UiText {...{"weight":"regular"}}>
                        ${(formData.taxRate > 0 ? ((newPurchase.quantity * newPurchase.unitCost) * (formData.taxRate / 100)) : 0).toFixed(2)}
                      </UiText>
                    </UiBox>
                    <UiBox {...{"style":{"color":"var(--green-11)","borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-1.5 mt-1"}}>
                      <UiText>Total Egreso / Compra:</UiText>
                      <UiText {...{"weight":"regular"}}>
                        ${(formData.taxRate > 0 
                          ? ((newPurchase.quantity * newPurchase.unitCost) * (1 + formData.taxRate / 100)) 
                          : (newPurchase.quantity * newPurchase.unitCost)).toFixed(2)}
                      </UiText>
                    </UiBox>
                  </UiCard>
                </UiBox>
              )}
            </UiBox>

            {/* Step 2 Submit Buttons */}
            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-4 flex justify-end gap-4"}}>
              <UiButton
                type="button"
                onClick={() => setFormStep('product_details')}
                disabled={loading}
                {...mergeThemeProps({"size":"2","variant":"soft","color":"gray"})}
              >
                Volver a Paso 1
              </UiButton>
              <UiButton
                type="submit"
                disabled={loading}
                {...{"size":"2","variant":"solid","color":"green","className":"flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"}}
              >
                {loading ? (
                  <>
                    <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"w-4 h-4 animate-spin"}} />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Finalizar y Guardar
                  </>
                )}
              </UiButton>
            </UiBox>
          </UiBox>
        )}
      </form>

      {/* POPUP MODAL: AGREGAR CATEGORÍA */}
      {showCategoryPopup && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"}}>
          <form onSubmit={handleAddCategory} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full max-w-sm p-6"})}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","className":"flex items-center gap-2 mb-4"}}>
              <FolderPlus {...{"style":{"color":"var(--blue-12)"}}} size={18} />
              Agregar Nueva Categoría
            </UiHeading>
            
            <UiBox {...{"className":"space-y-4"}}>
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","className":"block mb-1"}}>Nombre de la Categoría *</UiLabel>
                <UiInput
                  type="text" 
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej. Herramientas"
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","className":"block mb-1"}}>Descripción</UiLabel>
                <UiTextarea
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Opcional..."
                  rows={2}
                  {...mergeThemeProps({}, {"className":"resize-none"}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
                />
              </UiBox>

              <UiBox {...{"className":"flex justify-end gap-2 pt-2"}}>
                <UiButton
                  type="button" 
                  onClick={() => setShowCategoryPopup(false)}
                  {...mergeThemeProps({"size":"2","variant":"soft","color":"gray"})}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="submit"
                  {...{"size":"2","variant":"solid","color":"blue"}}
                >
                  Guardar Categoría
                </UiButton>
              </UiBox>
            </UiBox>
          </form>
        </UiBox>
      )}

      {/* POPUP MODAL: AGREGAR MARCA */}
      {showBrandPopup && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"}}>
          <form onSubmit={handleAddBrand} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full max-w-sm p-6"})}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","className":"flex items-center gap-2 mb-4"}}>
              <Plus {...{"style":{"color":"var(--blue-12)"}}} size={18} />
              Agregar Nueva Marca
            </UiHeading>
            
            <UiBox {...{"className":"space-y-4"}}>
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","className":"block mb-1"}}>Nombre de la Marca *</UiLabel>
                <UiInput
                  type="text" 
                  required
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Ej. Stanley"
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","className":"block mb-1"}}>Fabricante / Proveedor</UiLabel>
                <UiInput
                  type="text" 
                  value={newBrandMfr}
                  onChange={(e) => setNewBrandMfr(e.target.value)}
                  placeholder="Ej. Stanley Black & Decker"
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                />
              </UiBox>

              <UiBox {...{"className":"flex justify-end gap-2 pt-2"}}>
                <UiButton
                  type="button" 
                  onClick={() => setShowBrandPopup(false)}
                  {...mergeThemeProps({"size":"2","variant":"soft","color":"gray"})}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="submit"
                  {...{"size":"2","variant":"solid","color":"blue"}}
                >
                  Guardar Marca
                </UiButton>
              </UiBox>
            </UiBox>
          </form>
        </UiBox>
      )}

      {/* POPUP MODAL: CALCULADOR DE PRECIOS SIN IMPUESTO */}
      {showPriceWithoutTaxPopup && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"}}>
          <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full max-w-sm p-6"})}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","className":"flex items-center gap-2 mb-3"}}>
              <DollarSign {...{"style":{"color":"var(--blue-12)"}}} size={18} />
              Calculador de Precio Sin Impuesto
            </UiHeading>
            <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray","className":"mb-4"})}>
              Ingresa el precio subtotal sin impuestos y calcularemos el valor final automáticamente.
            </UiText>
            
            <UiBox {...{"className":"space-y-4"}}>
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","className":"block mb-1"}}>Ingresar Precio Sin Impuesto ($)</UiLabel>
                <UiInput
                  type="number" 
                  min="0"
                  step="0.01"
                  required
                  value={manualPriceInput}
                  onChange={(e) => setManualPriceInput(e.target.value)}
                  placeholder="0.00"
                  iconPrefix={<DollarSign size={14} className="text-[var(--gray-10)]" />}
                  {...mergeThemeProps({}, {}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
                />
              </UiBox>

              {/* Muestra cálculo rápido */}
              <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-3 space-y-1.5"})}>
                <UiBox {...{"className":"flex justify-between"}}>
                  <UiText>Impuesto Aplicado:</UiText>
                  <UiText {...{"weight":"bold"}}>{formData.taxRate}%</UiText>
                </UiBox>
                <UiBox {...{"className":"flex justify-between"}}>
                  <UiText>IVA Calculado:</UiText>
                  <UiText {...{"weight":"regular"}}>
                    ${((parseFloat(manualPriceInput) || 0) * (formData.taxRate / 100)).toFixed(2)}
                  </UiText>
                </UiBox>
                <UiBox {...{"style":{"color":"var(--green-11)"},"className":"flex justify-between"}}>
                  <UiText>Precio Final Estimado:</UiText>
                  <UiText {...{"weight":"regular"}}>
                    ${((parseFloat(manualPriceInput) || 0) * (1 + formData.taxRate / 100)).toFixed(2)}
                  </UiText>
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"flex justify-end gap-2 pt-2"}}>
                <UiButton
                  type="button" 
                  onClick={() => setShowPriceWithoutTaxPopup(false)}
                  {...mergeThemeProps({"size":"2","variant":"soft","color":"gray"})}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="button"
                  onClick={handleApplyManualPrice}
                  {...{"size":"2","variant":"solid","color":"blue"}}
                >
                  Aplicar Precio
                </UiButton>
              </UiBox>
            </UiBox>
          </UiCard>
        </UiBox>
      )}
      
      {/* POPUP MODAL: AGREGAR PROVEEDOR IN-SITU */}
      {showNewSupplierPopup && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"}}>
          <form onSubmit={handleAddNewSupplier} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full max-w-sm p-6 space-y-4"})}>
            <UiHeading as="h3" {...{"size":"2","weight":"bold","className":"flex items-center gap-2"}}>
              <Plus {...{"style":{"color":"var(--blue-12)"}}} size={18} />
              Agregar Nuevo Proveedor
            </UiHeading>
            
            <UiBox {...{"className":"space-y-3"}}>
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","className":"block mb-1"}}>Razón Social / Nombre *</UiLabel>
                <UiInput
                  type="text" 
                  required
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Ej. Distribuidora S.A."
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","className":"block mb-1"}}>RUC / Cédula *</UiLabel>
                <UiInput
                  type="text" 
                  required
                  value={newSupplierRuc}
                  onChange={(e) => setNewSupplierRuc(e.target.value)}
                  placeholder="Ej. 1790011223001"
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","className":"block mb-1"}}>Teléfono</UiLabel>
                <UiInput
                  type="text" 
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="Opcional..."
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","className":"block mb-1"}}>Email</UiLabel>
                <UiInput
                  type="email" 
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                  placeholder="Opcional..."
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                />
              </UiBox>

              <UiBox {...{"className":"flex justify-end gap-2 pt-2"}}>
                <UiButton
                  type="button" 
                  onClick={() => setShowNewSupplierPopup(false)}
                  {...mergeThemeProps({"size":"2","variant":"soft","color":"gray"})}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="submit"
                  {...{"size":"2","variant":"solid","color":"blue"}}
                >
                  Guardar Proveedor
                </UiButton>
              </UiBox>
            </UiBox>
          </form>
        </UiBox>
      )}
    </UiBox>
  );

  if (isInline) {
    return formJSX;
  }

  return (
    <UiBox {...mergeThemeProps({"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"})}>
      {formJSX}
    </UiBox>
  );
}
