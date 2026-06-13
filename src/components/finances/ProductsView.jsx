import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Package,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowLeftRight,
  Settings,
  Sliders,
  Tag,
  Percent,
  RefreshCw,
  Eye,
  Calendar,
  Layers3,
  Bookmark,
  TrendingUp,
  Boxes,
  Activity
} from "lucide-react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  addDoc
} from "firebase/firestore";
import {
  ejecutarTransferencia,
  ejecutarAjusteInventario
} from "../../services/inventoryService";

// Helper para redondear a 2 decimales
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

export default function ProductsView({ isDarkMode, showToast, db, appId }) {
  // Tabs: 'catalogo' | 'precios' | 'kardex' | 'transferencias' | 'ajustes' | 'configuracion'
  const [activeTab, setActiveTab] = useState("catalogo");

  // Colecciones Principales
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [kardexLogs, setKardexLogs] = useState([]);

  // Estados de Control
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterProductCategoryType, setFilterProductCategoryType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false); // Modal de doble confirmación para Encerar
  const [encerarConfirmationText, setEncerarConfirmationText] = useState("");

  // Formularios de Creación/Edición de Producto
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    sku: "",
    description: "",
    price: 0,
    cost: 0,
    ivaCategory: 15,
    stock: 0,
    minStock: 5,
    type: "producto", // 'producto' o 'servicio'
    marca: "",
    categoria: "",
    bodega: "Bodega Central",
    codigoBarras: "",
    productCategoryType: "estandar", // 'estandar' | 'subproducto' | 'combo'
    parentProductId: "",
    comboItems: [] // [{ productId, quantity }]
  });

  // Auxiliares Combo Builder
  const [tempComboProductId, setTempComboProductId] = useState("");
  const [tempComboQty, setTempComboQty] = useState(1);

  // Estados Edición Rápida Precios
  const [gridEdits, setGridEdits] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);

  // Filtros Kardex
  const [selectedKardexProduct, setSelectedKardexProduct] = useState("all");
  const [selectedKardexBodega, setSelectedKardexBodega] = useState("all");
  const [kardexStartDate, setKardexStartDate] = useState("");
  const [kardexEndDate, setKardexEndDate] = useState("");

  // Formulario Transferencia
  const [transferForm, setTransferForm] = useState({
    productId: "",
    quantity: 1,
    originSucursal: "Matriz Quito",
    originBodega: "Bodega Central",
    destSucursal: "Sucursal Guayaquil",
    destBodega: "Bodega Central",
    isExternal: false
  });

  // Formulario Ajuste Manual
  const [adjustmentForm, setAdjustmentForm] = useState({
    productId: "",
    type: "ingreso", // 'ingreso' | 'egreso'
    quantity: 1,
    cost: 0,
    bodega: "Bodega Central",
    concept: "Ajuste de Inventario Manual"
  });

  // Ajustes Masivos (Grid interactivo)
  const [massiveRows, setMassiveRows] = useState([
    { productId: "", quantity: 1, cost: 0, type: "ingreso", bodega: "Bodega Central" }
  ]);

  // Agregar Nueva Fila a Ajuste Masivo
  const addMassiveRow = () => {
    setMassiveRows(prev => [
      ...prev,
      { productId: "", quantity: 1, cost: 0, type: "ingreso", bodega: "Bodega Central" }
    ]);
  };

  const removeMassiveRow = (index) => {
    setMassiveRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleMassiveRowChange = (index, field, value) => {
    setMassiveRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };
      return newRows;
    });
  };

  // Formularios de Configuración del Catálogo
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newDiscount, setNewDiscount] = useState({ name: "", value: 0, type: "percent" });

  // Cargar Configuraciones del Emisor
  useEffect(() => {
    if (!appId || !db) return;
    async function loadSettings() {
      try {
        const snap = await getDoc(
          doc(db, "artifacts", appId, "public", "data", "finances_settings", "config")
        );
        if (snap.exists()) {
          setSettings(snap.data());
        }
      } catch (e) {
        console.error("Error al cargar configuraciones en ProductsView", e);
      }
    }
    loadSettings();
  }, [appId, db]);

  // Cargar Productos (Real-Time)
  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(db, "artifacts", appId, "public", "data", "finances_products");
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(data);
      setLoading(false);
    });
    return unsub;
  }, [appId, db]);

  // Cargar Categorías, Marcas y Descuentos (Real-Time)
  useEffect(() => {
    if (!appId || !db) return;
    const unsubCat = onSnapshot(collection(db, "artifacts", appId, "public", "data", "finances_categories"), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubBrand = onSnapshot(collection(db, "artifacts", appId, "public", "data", "finances_brands"), (snap) => {
      setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubDisc = onSnapshot(collection(db, "artifacts", appId, "public", "data", "finances_discounts"), (snap) => {
      setDiscounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubCat();
      unsubBrand();
      unsubDisc();
    };
  }, [appId, db]);

  // Cargar Transferencias (Real-Time)
  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(db, "artifacts", appId, "public", "data", "finances_transfers");
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTransfers(data);
    });
    return unsub;
  }, [appId, db]);

  // Cargar Kardex Logs (Real-Time)
  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(db, "artifacts", appId, "public", "data", "finances_kardex");
    const unsub = onSnapshot(colRef, (snap) => {
      const logs = snap.docs.map(d => d.data());
      logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setKardexLogs(logs);
    });
    return unsub;
  }, [appId, db]);

  // Guardar/Actualizar Producto
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      showToast("Nombre y Código SKU son obligatorios", "error");
      return;
    }

    try {
      const docId = formData.id || `prod_${new Date().getTime()}`;
      const finalProduct = {
        id: docId,
        name: formData.name,
        sku: formData.sku.toUpperCase(),
        description: formData.description || "",
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        ivaCategory: parseInt(formData.ivaCategory) || 15,
        stock: formData.type === "servicio" ? 0 : parseInt(formData.stock) || 0,
        minStock: formData.type === "servicio" ? 0 : parseInt(formData.minStock) || 0,
        type: formData.type,
        marca: formData.marca || "",
        categoria: formData.categoria || "",
        bodega: formData.bodega || "Bodega Central",
        codigoBarras: formData.codigoBarras || "",
        productCategoryType: formData.type === "servicio" ? "estandar" : (formData.productCategoryType || "estandar"),
        parentProductId: formData.productCategoryType === "subproducto" ? formData.parentProductId : "",
        comboItems: formData.productCategoryType === "combo" ? formData.comboItems : [],
        updatedAt: new Date().toISOString(),
      };

      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "finances_products", docId),
        finalProduct
      );
      showToast("Producto guardado con éxito", "success");
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      showToast("Error al guardar producto", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto/servicio de forma permanente?")) {
      try {
        await deleteDoc(
          doc(db, "artifacts", appId, "public", "data", "finances_products", id)
        );
        showToast("Producto eliminado", "success");
      } catch (err) {
        showToast("Error al eliminar", "error");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      sku: "",
      description: "",
      price: 0,
      cost: 0,
      ivaCategory: 15,
      stock: 0,
      minStock: 5,
      type: "producto",
      marca: "",
      categoria: "",
      bodega: "Bodega Central",
      codigoBarras: "",
      productCategoryType: "estandar",
      parentProductId: "",
      comboItems: []
    });
    setTempComboProductId("");
    setTempComboQty(1);
  };

  // Helper para añadir componente a Combo en formulario
  const addComboItem = () => {
    if (!tempComboProductId) return;
    const selected = products.find(p => p.id === tempComboProductId);
    if (!selected) return;

    if (formData.comboItems.some(i => i.productId === tempComboProductId)) {
      showToast("Este producto ya está agregado al combo", "warning");
      return;
    }

    setFormData(prev => ({
      ...prev,
      comboItems: [
        ...prev.comboItems,
        {
          productId: tempComboProductId,
          name: selected.name,
          sku: selected.sku,
          quantity: Number(tempComboQty) || 1
        }
      ]
    }));
    setTempComboProductId("");
    setTempComboQty(1);
  };

  const removeComboItem = (productId) => {
    setFormData(prev => ({
      ...prev,
      comboItems: prev.comboItems.filter(i => i.productId !== productId)
    }));
  };

  // Configuración de Bodegas y Sucursales listadas
  const bodegasOptionList = settings?.bodegas && settings.bodegas.length > 0
    ? settings.bodegas
    : ["Bodega Central", "Bodega Principal", "Bodega Auxiliar"];

  const sucursalesOptionList = settings?.sucursales && settings.sucursales.length > 0
    ? settings.sucursales
    : ["Matriz Quito", "Sucursal Guayaquil", "Sucursal Cuenca"];

  // Configuración de Catálogo - Agregar / Eliminar Items
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const id = `cat_${new Date().getTime()}`;
      await setDoc(doc(db, "artifacts", appId, "public", "data", "finances_categories", id), {
        id, name: newCategoryName.trim(), createdAt: new Date().toISOString()
      });
      setNewCategoryName("");
      showToast("Categoría agregada", "success");
    } catch (err) {
      showToast("Error al guardar categoría", "error");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("¿Deseas eliminar esta categoría?")) {
      try {
        await deleteDoc(doc(db, "artifacts", appId, "public", "data", "finances_categories", id));
        showToast("Categoría eliminada", "success");
      } catch (err) {
        showToast("Error al eliminar", "error");
      }
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      const id = `brd_${new Date().getTime()}`;
      await setDoc(doc(db, "artifacts", appId, "public", "data", "finances_brands", id), {
        id, name: newBrandName.trim(), createdAt: new Date().toISOString()
      });
      setNewBrandName("");
      showToast("Marca agregada", "success");
    } catch (err) {
      showToast("Error al guardar marca", "error");
    }
  };

  const handleDeleteBrand = async (id) => {
    if (window.confirm("¿Deseas eliminar esta marca?")) {
      try {
        await deleteDoc(doc(db, "artifacts", appId, "public", "data", "finances_brands", id));
        showToast("Marca eliminada", "success");
      } catch (err) {
        showToast("Error al eliminar", "error");
      }
    }
  };

  const handleAddDiscount = async (e) => {
    e.preventDefault();
    if (!newDiscount.name.trim()) return;
    try {
      const id = `dsc_${new Date().getTime()}`;
      await setDoc(doc(db, "artifacts", appId, "public", "data", "finances_discounts", id), {
        id,
        name: newDiscount.name.trim(),
        value: parseFloat(newDiscount.value) || 0,
        type: newDiscount.type,
        createdAt: new Date().toISOString()
      });
      setNewDiscount({ name: "", value: 0, type: "percent" });
      showToast("Descuento agregado", "success");
    } catch (err) {
      showToast("Error al guardar descuento", "error");
    }
  };

  const handleDeleteDiscount = async (id) => {
    if (window.confirm("¿Deseas eliminar este descuento?")) {
      try {
        await deleteDoc(doc(db, "artifacts", appId, "public", "data", "finances_discounts", id));
        showToast("Descuento eliminado", "success");
      } catch (err) {
        showToast("Error al eliminar", "error");
      }
    }
  };

  // Edición Rápida en Tabla Precios
  const handleGridChange = (productId, field, value) => {
    const original = products.find(p => p.id === productId);
    if (!original) return;

    setGridEdits(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        price: prev[productId]?.price ?? original.price ?? 0,
        cost: prev[productId]?.cost ?? original.cost ?? 0,
        ivaCategory: prev[productId]?.ivaCategory ?? original.ivaCategory ?? 15,
        [field]: value
      }
    }));
  };

  const handleSaveGridRow = async (product) => {
    const edits = gridEdits[product.id];
    if (!edits) return;
    setSavingRowId(product.id);
    try {
      const docRef = doc(db, "artifacts", appId, "public", "data", "finances_products", product.id);
      await setDoc(docRef, {
        price: parseFloat(edits.price) || 0,
        cost: parseFloat(edits.cost) || 0,
        ivaCategory: parseInt(edits.ivaCategory) || 15,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast(`Precio/Costo de ${product.sku} actualizado`, "success");
    } catch (err) {
      showToast("Error al actualizar", "error");
    } finally {
      setSavingRowId(null);
    }
  };

  // Acción Ejecutar Transferencia
  const handleRunTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.productId) {
      showToast("Selecciona un producto para transferir", "error");
      return;
    }
    if (transferForm.originBodega === transferForm.destBodega && !transferForm.isExternal) {
      showToast("La bodega de origen y destino no pueden ser iguales en transferencias internas", "warning");
      return;
    }
    setLoading(true);
    try {
      const p = products.find(prod => prod.id === transferForm.productId);
      if (!p) throw new Error("Producto no encontrado");
      if (Number(p.stock) < Number(transferForm.quantity)) {
        throw new Error(`Stock insuficiente. Stock actual en ${transferForm.originBodega}: ${p.stock}`);
      }

      await ejecutarTransferencia(db, appId, {
        productId: transferForm.productId,
        quantity: Number(transferForm.quantity),
        originSucursal: transferForm.originSucursal,
        originBodega: transferForm.originBodega,
        destSucursal: transferForm.isExternal ? transferForm.destSucursal : transferForm.originSucursal,
        destBodega: transferForm.destBodega,
        isExternal: transferForm.isExternal
      });

      showToast("Transferencia completada con éxito", "success");
      setTransferForm(prev => ({ ...prev, productId: "", quantity: 1 }));
    } catch (err) {
      showToast(err.message || "Error al transferir", "error");
    } finally {
      setLoading(false);
    }
  };

  // Acción Ejecutar Ajuste Manual
  const handleRunManualAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustmentForm.productId) {
      showToast("Selecciona un producto para ajustar", "error");
      return;
    }
    setLoading(true);
    try {
      await ejecutarAjusteInventario(db, appId, {
        tipo: 'manual',
        productos: [{
          productId: adjustmentForm.productId,
          quantity: Number(adjustmentForm.quantity),
          cost: Number(adjustmentForm.cost),
          type: adjustmentForm.type,
          bodega: adjustmentForm.bodega
        }],
        concept: adjustmentForm.concept || "Ajuste Manual de Inventario"
      });
      showToast("Ajuste manual registrado exitosamente", "success");
      setAdjustmentForm({
        productId: "", type: "ingreso", quantity: 1, cost: 0, bodega: "Bodega Central", concept: "Ajuste de Inventario Manual"
      });
    } catch (err) {
      showToast("Error al registrar ajuste", "error");
    } finally {
      setLoading(false);
    }
  };

  // Acción Ejecutar Ajuste Masivo
  const handleRunMassiveAdjustment = async (e) => {
    e.preventDefault();
    const validRows = massiveRows.filter(r => r.productId && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      showToast("Por favor ingresa al menos una fila válida con producto y cantidad", "warning");
      return;
    }

    setLoading(true);
    try {
      await ejecutarAjusteInventario(db, appId, {
        tipo: 'masivo',
        productos: validRows.map(r => ({
          productId: r.productId,
          quantity: Number(r.quantity),
          cost: Number(r.cost),
          type: r.type,
          bodega: r.bodega
        })),
        concept: "Ajuste Masivo de Inventario"
      });
      showToast("Ajuste masivo registrado con éxito", "success");
      setMassiveRows([{ productId: "", quantity: 1, cost: 0, type: "ingreso", bodega: "Bodega Central" }]);
    } catch (err) {
      showToast("Error al ejecutar ajuste masivo", "error");
    } finally {
      setLoading(false);
    }
  };

  // Acción Encerar Inventario
  const handleEncerarInventario = async () => {
    if (encerarConfirmationText !== "ENCERAR") {
      showToast("Debe escribir ENCERAR en el cuadro de confirmación", "error");
      return;
    }
    setLoading(true);
    setIsConfigModalOpen(false);
    try {
      await ejecutarAjusteInventario(db, appId, {
        tipo: 'encerar'
      });
      showToast("Se han encerado todos los productos del inventario", "success");
      setEncerarConfirmationText("");
    } catch (err) {
      showToast("Error al resetear inventario", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filtros del Catálogo
  const filteredCatalog = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || p.type === filterType;
    const matchesProductType = filterProductCategoryType === "all" || p.productCategoryType === filterProductCategoryType;
    return matchesSearch && matchesType && matchesProductType;
  });

  // Filtros de Kardex
  const filteredKardex = kardexLogs.filter((log) => {
    const matchesProduct = selectedKardexProduct === "all" || log.productId === selectedKardexProduct;
    const matchesBodega = selectedKardexBodega === "all" || log.bodega === selectedKardexBodega;
    let matchesDate = true;
    if (kardexStartDate) {
      matchesDate = matchesDate && log.date >= kardexStartDate;
    }
    if (kardexEndDate) {
      matchesDate = matchesDate && log.date <= kardexEndDate;
    }
    return matchesProduct && matchesBodega && matchesDate;
  });

  // Clase de Inputs para formularios
  const inputClass = `w-full text-xs px-3.5 py-3 rounded-xl outline-none transition-all border ${
    isDarkMode
      ? "bg-black/25 border-white/10 text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
      : "bg-white border-primary/20 text-[#000000] focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm"
  }`;

  return (
    <div className="space-y-6">
      {/* NAVEGACIÓN DE SUB-MODULOS (PESTANEAS) */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-white/5">
        {[
          { id: "catalogo", label: "Catálogo", icon: Package },
          { id: "precios", label: "Precios", icon: DollarSign },
          { id: "kardex", label: "Historial Kardex", icon: Layers },
          { id: "transferencias", label: "Transferencias", icon: ArrowLeftRight },
          { id: "ajustes", label: "Ajustes de Stock", icon: Sliders },
          { id: "configuracion", label: "Configuración Catálogo", icon: Settings }
        ].map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border hover:-translate-y-0.5 ${
                isActive
                  ? isDarkMode
                    ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/20"
                    : "bg-primary border-primary text-white shadow-md shadow-primary/20"
                  : isDarkMode
                    ? "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
              }`}
            >
              <TabIcon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 1. SECCION: CATALOGO DE ITEMS */}
      {/* ============================================================== */}
      {activeTab === "catalogo" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Hojas de Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border w-full sm:w-80 transition-all ${
                  isDarkMode
                    ? "bg-black/20 border-white/10 focus-within:border-violet-500/50"
                    : "bg-[#f3f8ff] border-primary/15 focus-within:border-primary shadow-sm"
                }`}
              >
                <Search size={14} className={isDarkMode ? "text-gray-500" : "text-primary"} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-current placeholder-gray-500 focus:ring-0"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`px-3 py-2.5 rounded-xl border text-xs outline-none cursor-pointer transition-all ${
                  isDarkMode ? "bg-black/20 border-white/10 text-gray-300 hover:bg-black/35" : "bg-[#f3f8ff] border-primary/15 text-[#000000] font-bold hover:bg-primary-light"
                }`}
              >
                <option value="all">Todos los tipos</option>
                <option value="producto">Productos físicos</option>
                <option value="servicio">Servicios / Horas</option>
              </select>
              <select
                value={filterProductCategoryType}
                onChange={(e) => setFilterProductCategoryType(e.target.value)}
                className={`px-3 py-2.5 rounded-xl border text-xs outline-none cursor-pointer transition-all ${
                  isDarkMode ? "bg-black/20 border-white/10 text-gray-300 hover:bg-black/35" : "bg-[#f3f8ff] border-primary/15 text-[#000000] font-bold hover:bg-primary-light"
                }`}
              >
                <option value="all">Todas las Clasificaciones</option>
                <option value="estandar">Estándar</option>
                <option value="subproducto">Subproducto</option>
                <option value="combo">Combo</option>
              </select>
            </div>

            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover-lift shadow-md ${
                isDarkMode
                  ? "bg-gradient-to-r from-primary to-primary-hover text-white shadow-primary/20 border border-primary/30"
                  : "bg-primary text-white hover:bg-primary-hover"
              }`}
            >
              <Plus size={14} /> Registrar Item
            </button>
          </div>

          {/* Tabla Catálogo */}
          <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDarkMode ? "border-white/5 bg-white/[0.01] shadow-lg" : "border-primary/15 bg-[#f3f8ff] shadow-sm"}`}>
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-black/30 text-gray-400 border-b border-white/5" : "bg-primary-light text-[#000000] border-b border-primary/15"}`}>
                    <tr>
                      <th className="px-6 py-4">SKU / Código</th>
                      <th className="px-6 py-4">Nombre / Clasificación</th>
                      <th className="px-6 py-4">Clase</th>
                      <th className="px-6 py-4 text-right">Costo Promedio (CPP)</th>
                      <th className="px-6 py-4 text-right">P.V.P</th>
                      <th className="px-6 py-4">IVA</th>
                      <th className="px-6 py-4 text-center">Existencia</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-white/5" : "divide-primary/10"}`}>
                    {filteredCatalog.map((p) => {
                      const isLow = p.type === "producto" && p.stock <= p.minStock && p.productCategoryType !== 'combo';
                      const isOut = p.type === "producto" && p.stock === 0 && p.productCategoryType !== 'combo';
                      const isCombo = p.productCategoryType === 'combo';
                      const isSubproduct = p.productCategoryType === 'subproducto';

                      return (
                        <tr key={p.id} className={`transition-colors ${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-primary-light"}`}>
                          <td className={`px-6 py-4 font-mono text-[10px] font-bold ${isDarkMode ? "text-gray-300" : "text-[#000000]"}`}>
                            {p.sku}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs ${isDarkMode ? "text-white" : "text-[#000000]"}`}>
                                {p.name}
                              </span>
                              {isCombo && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                                  Combo
                                </span>
                              )}
                              {isSubproduct && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-500 border border-blue-500/20 uppercase tracking-wide">
                                  Subproducto
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1 text-[8px] font-bold uppercase tracking-wider">
                              {p.marca && <span className={`px-1.5 py-0.5 rounded ${isDarkMode ? "bg-white/5 text-gray-400" : "bg-primary-light text-black border border-primary/10"}`}>Marca: {p.marca}</span>}
                              {p.categoria && <span className={`px-1.5 py-0.5 rounded ${isDarkMode ? "bg-white/5 text-gray-400" : "bg-primary-light text-black border border-primary/10"}`}>Cat: {p.categoria}</span>}
                              {p.bodega && p.type === "producto" && !isCombo && <span className={`px-1.5 py-0.5 rounded ${isDarkMode ? "bg-primary/10 text-primary border border-primary/10" : "bg-primary/10 text-primary border border-primary/25"}`}>Bodega: {p.bodega}</span>}
                            </div>
                            {isCombo && p.comboItems && p.comboItems.length > 0 && (
                              <div className="mt-1.5 text-[9px] text-gray-400 italic">
                                Contiene: {p.comboItems.map(item => `${item.quantity}x ${item.name || item.productId}`).join(", ")}
                              </div>
                            )}
                            {p.description && (
                              <p className={`text-[9px] font-bold truncate mt-1 max-w-[220px] ${isDarkMode ? "text-gray-500" : "text-[#000000]"}`} title={p.description}>
                                {p.description}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                              p.type === "producto"
                                ? isDarkMode ? "bg-primary/10 text-primary border-primary/20" : "bg-primary-light text-primary border-primary/25"
                                : isDarkMode ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}>
                              {p.type}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${isDarkMode ? "text-gray-300" : "text-[#000000]"}`}>
                            ${Number(p.cost || 0).toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 text-right font-black ${isDarkMode ? "text-white" : "text-primary"}`}>
                            ${Number(p.price || 0).toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 font-bold ${isDarkMode ? "text-gray-350" : "text-[#000000]"}`}>
                            {p.ivaCategory}%
                          </td>
                          <td className="px-6 py-4 text-center">
                            {p.type === "servicio" ? (
                              <span className="text-gray-500 italic font-medium">N/A</span>
                            ) : isCombo ? (
                              <span className="text-gray-500 italic font-medium">Virtual (Combo)</span>
                            ) : isOut ? (
                              <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[90px] bg-red-500/10 border-red-500/20 text-red-400 animate-pulse">
                                <AlertTriangle size={10} /> Sin Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[90px] bg-orange-500/10 border-orange-500/20 text-orange-400">
                                <AlertTriangle size={10} /> {p.stock} (Bajo)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[70px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                                {p.stock}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setFormData(p);
                                  setIsModalOpen(true);
                                }}
                                className={`p-2 rounded-xl transition-colors ${isDarkMode ? "hover:bg-primary/15 text-primary border border-transparent" : "hover:bg-primary/10 text-primary border border-primary/25 bg-white"}`}
                                title="Editar"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className={`p-2 rounded-xl transition-colors ${isDarkMode ? "hover:bg-red-500/15 text-red-400 border border-transparent" : "hover:bg-red-100 text-red-700 border border-red-200 bg-white"}`}
                                title="Eliminar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCatalog.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500 italic">
                          No se encontraron productos o servicios en el catálogo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SECCION: CONTROL DE PRECIOS */}
      {/* ============================================================== */}
      {activeTab === "precios" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white/5 border-white/5">
            <div>
              <h3 className="text-sm font-bold">Grilla Rápida de Precios</h3>
              <p className="text-xs text-gray-400">Edita PVP, Costo e IVA en tiempo real y calcula el margen automáticamente.</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-64 transition-all ${
              isDarkMode ? "bg-black/20 border-white/10" : "bg-[#f3f8ff] border-primary/15 shadow-sm"
            }`}>
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar SKU o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-current focus:ring-0"
              />
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDarkMode ? "border-white/5 bg-white/[0.01] shadow-lg" : "border-primary/15 bg-[#f3f8ff] shadow-sm"}`}>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-black/30 text-gray-400 border-b border-white/5" : "bg-primary-light text-[#000000] border-b border-primary/15"}`}>
                  <tr>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4 text-center">Costo ($)</th>
                    <th className="px-6 py-4 text-center">P.V.P ($)</th>
                    <th className="px-6 py-4 text-center">Margen (%)</th>
                    <th className="px-6 py-4 text-center">Tarifa IVA</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? "divide-white/5" : "divide-primary/10"}`}>
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => {
                    const edits = gridEdits[p.id] || {};
                    const costVal = edits.cost !== undefined ? edits.cost : p.cost;
                    const priceVal = edits.price !== undefined ? edits.price : p.price;
                    const ivaVal = edits.ivaCategory !== undefined ? edits.ivaCategory : p.ivaCategory;

                    // Calcular Margen Comercial: ((PVP - Costo) / PVP) * 100
                    const margin = priceVal > 0 ? round2(((priceVal - costVal) / priceVal) * 100) : 0;
                    const isChanged = edits.cost !== undefined || edits.price !== undefined || edits.ivaCategory !== undefined;

                    return (
                      <tr key={p.id} className={`transition-colors ${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-primary-light"}`}>
                        <td className="px-6 py-4 font-mono font-bold text-[10px]">{p.sku}</td>
                        <td className="px-6 py-4 font-bold">{p.name}</td>
                        <td className="px-6 py-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={costVal}
                            onChange={(e) => handleGridChange(p.id, "cost", parseFloat(e.target.value) || 0)}
                            className={`w-20 text-xs px-2 py-1.5 rounded-lg text-center outline-none border ${
                              isDarkMode ? "bg-black/35 border-white/10 text-white" : "bg-white border-gray-300"
                            }`}
                          />
                        </td>
                        <td className="px-6 py-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={priceVal}
                            onChange={(e) => handleGridChange(p.id, "price", parseFloat(e.target.value) || 0)}
                            className={`w-20 text-xs px-2 py-1.5 rounded-lg text-center outline-none border ${
                              isDarkMode ? "bg-black/35 border-white/10 text-white font-extrabold" : "bg-white border-gray-300 font-extrabold"
                            }`}
                          />
                        </td>
                        <td className="px-6 py-4 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            margin >= 30
                              ? "bg-emerald-500/10 text-emerald-400"
                              : margin >= 15
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="px-6 py-2 text-center">
                          <select
                            value={ivaVal}
                            onChange={(e) => handleGridChange(p.id, "ivaCategory", parseInt(e.target.value))}
                            className={`text-xs px-2 py-1.5 rounded-lg outline-none border ${
                              isDarkMode ? "bg-black/35 border-white/10 text-white" : "bg-white border-gray-300"
                            }`}
                          >
                            <option value="15">15%</option>
                            <option value="12">12%</option>
                            <option value="0">0%</option>
                          </select>
                        </td>
                        <td className="px-6 py-2 text-right">
                          <button
                            disabled={!isChanged || savingRowId === p.id}
                            onClick={() => handleSaveGridRow(p)}
                            className={`p-2 rounded-xl transition-all border ${
                              isChanged
                                ? isDarkMode
                                  ? "bg-violet-600/20 border-violet-500 text-violet-400 hover:bg-violet-600/35 cursor-pointer"
                                  : "bg-primary/10 border-primary text-primary hover:bg-primary/20 cursor-pointer"
                                : "opacity-30 border-transparent text-gray-500 cursor-not-allowed"
                            }`}
                            title="Guardar Cambios Rápido"
                          >
                            {savingRowId === p.id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={13} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SECCION: HISTORIAL KARDEX */}
      {/* ============================================================== */}
      {activeTab === "kardex" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Tarjetas de Valorización de Existencias */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-[#f3f8ff] border-primary/15 shadow-sm"}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Valorización Inventario (Costo CPP)</span>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
              <div className="mt-2 text-xl font-black text-emerald-500">
                ${products.filter(p => p.type === 'producto').reduce((acc, p) => acc + (Number(p.stock || 0) * Number(p.cost || 0)), 0).toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[9px] text-gray-450 mt-1 font-medium">Calculado en base a existencias físicas y costos promedio.</p>
            </div>
            
            <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-[#f3f8ff] border-primary/15 shadow-sm"}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Productos en Stock</span>
                <Boxes size={16} className="text-primary" />
              </div>
              <div className="mt-2 text-xl font-black text-primary">
                {products.filter(p => p.type === 'producto').reduce((acc, p) => acc + Number(p.stock || 0), 0)} unidades
              </div>
              <p className="text-[9px] text-gray-450 mt-1 font-medium">Suma física total en todas las bodegas locales.</p>
            </div>

            <div className={`p-5 rounded-2xl border ${isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-[#f3f8ff] border-primary/15 shadow-sm"}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total de Movimientos Logs</span>
                <Activity size={16} className="text-violet-400" />
              </div>
              <div className="mt-2 text-xl font-black text-violet-400">
                {kardexLogs.length} logs
              </div>
              <p className="text-[9px] text-gray-450 mt-1 font-medium">Cantidad histórica total de transacciones de inventario.</p>
            </div>
          </div>

          {/* Caja de Filtros Avanzados */}
          <div className="p-5 rounded-2xl border space-y-4 bg-white/5 border-white/5">
            <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={13} className="text-primary" />
              <span>Filtros de Búsqueda Kardex</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-450 mb-1 ml-1">Producto</label>
                <select
                  value={selectedKardexProduct}
                  onChange={(e) => setSelectedKardexProduct(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">Todos los Productos</option>
                  {products.filter(p => p.type === 'producto').map(p => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-450 mb-1 ml-1">Bodega</label>
                <select
                  value={selectedKardexBodega}
                  onChange={(e) => setSelectedKardexBodega(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">Todas las Bodegas</option>
                  {bodegasOptionList.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-450 mb-1 ml-1">Fecha Desde</label>
                <input
                  type="date"
                  value={kardexStartDate}
                  onChange={(e) => setKardexStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-450 mb-1 ml-1">Fecha Hasta</label>
                <input
                  type="date"
                  value={kardexEndDate}
                  onChange={(e) => setKardexEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Listado de Logs Kardex */}
          <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDarkMode ? "border-white/5 bg-white/[0.01] shadow-lg" : "border-primary/15 bg-[#f3f8ff] shadow-sm"}`}>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-black/30 text-gray-400 border-b border-white/5" : "bg-primary-light text-[#000000] border-b border-primary/15"}`}>
                  <tr>
                    <th className="px-6 py-4">Fecha/Hora</th>
                    <th className="px-6 py-4">Bodega</th>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Concepto / Referencia</th>
                    <th className="px-6 py-4">Movimiento</th>
                    <th className="px-6 py-4 text-right">Cant.</th>
                    <th className="px-6 py-4 text-right">Costo Movimiento</th>
                    <th className="px-6 py-4 text-right">Existencia Ant / Nueva</th>
                    <th className="px-6 py-4 text-right">Costo Promedio (CPP)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? "divide-white/5" : "divide-primary/10"}`}>
                  {filteredKardex.map((log) => {
                    const isEntry = ['entrada', 'ajuste_ingreso', 'transferencia_entrada'].includes(log.type);
                    return (
                      <tr key={log.id} className={`transition-colors ${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-primary-light"}`}>
                        <td className="px-6 py-4 font-medium text-[10px]">
                          <div>{log.date}</div>
                          <div className="text-gray-400 text-[9px] mt-0.5">{log.time}</div>
                        </td>
                        <td className="px-6 py-4 font-bold">{log.bodega}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold">{log.productName}</div>
                          <div className="text-[9px] font-mono text-gray-400 mt-0.5">{log.productSku}</div>
                        </td>
                        <td className="px-6 py-4 max-w-[200px] truncate">
                          <div className="font-medium text-xs">{log.concept}</div>
                          <div className="text-[9px] text-gray-400 mt-0.5 font-mono">{log.referenceId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                            isEntry
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          }`}>
                            {isEntry ? "Entrada" : "Salida"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black">{log.quantity}</td>
                        <td className={`px-6 py-4 text-right font-bold ${isDarkMode ? "text-gray-300" : "text-[#000000]"}`}>
                          ${Number(log.cost || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-400 text-[10px]">
                          <span>{log.previousStock}</span>
                          <span className="mx-1">→</span>
                          <span className="font-bold text-current">{log.newStock}</span>
                        </td>
                        <td className={`px-6 py-4 text-right font-extrabold ${isDarkMode ? "text-white" : "text-primary"}`}>
                          ${Number(log.newAvgCost || log.cost || 0).toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredKardex.length === 0 && (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500 italic">
                        No se encontraron logs de Kardex con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SECCION: TRANSFERENCIAS */}
      {/* ============================================================== */}
      {activeTab === "transferencias" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Formulario */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`p-6 rounded-[2rem] border ${isDarkMode ? "glass-panel-dark text-white" : "bg-[#f3f8ff] border-primary/15 text-black"}`}>
              <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-1.5">
                <ArrowLeftRight size={14} className="text-primary" />
                <span>Nueva Orden de Transferencia</span>
              </h3>

              <form onSubmit={handleRunTransfer} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Producto</label>
                  <select
                    value={transferForm.productId}
                    required
                    onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Selecciona un Producto</option>
                    {products.filter(p => p.type === 'producto' && p.productCategoryType !== 'combo').map(p => (
                      <option key={p.id} value={p.id}>{p.sku} - {p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Cantidad a Transferir</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className={inputClass}
                  />
                </div>

                {/* Switch Externo vs Interno */}
                <div className="flex items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    id="isExternal"
                    checked={transferForm.isExternal}
                    onChange={(e) => setTransferForm({ ...transferForm, isExternal: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-opacity-20"
                  />
                  <label htmlFor="isExternal" className="text-xs font-bold text-gray-300 cursor-pointer">
                    ¿Transferencia Externa (entre sucursales)?
                  </label>
                </div>

                <div className="border-t border-white/5 pt-3 mt-3 grid grid-cols-2 gap-3">
                  <div className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Origen</div>
                  
                  {transferForm.isExternal && (
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 mb-1">Sucursal Origen</label>
                      <select
                        value={transferForm.originSucursal}
                        onChange={(e) => setTransferForm({ ...transferForm, originSucursal: e.target.value })}
                        className={inputClass}
                      >
                        {sucursalesOptionList.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={transferForm.isExternal ? "" : "col-span-2"}>
                    <label className="block text-[9px] font-bold text-gray-400 mb-1">Bodega Origen</label>
                    <select
                      value={transferForm.originBodega}
                      onChange={(e) => setTransferForm({ ...transferForm, originBodega: e.target.value })}
                      className={inputClass}
                    >
                      {bodegasOptionList.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 mt-3 grid grid-cols-2 gap-3">
                  <div className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Destino</div>
                  
                  {transferForm.isExternal && (
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 mb-1">Sucursal Destino</label>
                      <select
                        value={transferForm.destSucursal}
                        onChange={(e) => setTransferForm({ ...transferForm, destSucursal: e.target.value })}
                        className={inputClass}
                      >
                        {sucursalesOptionList.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={transferForm.isExternal ? "" : "col-span-2"}>
                    <label className="block text-[9px] font-bold text-gray-400 mb-1">Bodega Destino</label>
                    <select
                      value={transferForm.destBodega}
                      onChange={(e) => setTransferForm({ ...transferForm, destBodega: e.target.value })}
                      className={inputClass}
                    >
                      {bodegasOptionList.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all hover-lift shadow-md ${
                    isDarkMode
                      ? "bg-gradient-to-r from-primary to-primary-hover text-white hover:from-primary hover:to-primary-hover"
                      : "bg-primary text-white hover:bg-primary-hover"
                  }`}
                >
                  {loading ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <ArrowLeftRight size={13} />
                  )}
                  <span>Ejecutar Transferencia</span>
                </button>
              </form>
            </div>
          </div>

          {/* Historial */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`p-6 rounded-[2rem] border overflow-hidden backdrop-blur-xl ${
              isDarkMode ? "border-white/5 bg-white/[0.01] shadow-lg text-white" : "border-primary/15 bg-[#f3f8ff] shadow-sm text-black"
            }`}>
              <h3 className="text-sm font-black uppercase tracking-wider mb-6">Historial de Órdenes</h3>
              
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-black/30 text-gray-400 border-b border-white/5" : "bg-primary-light text-[#000000] border-b border-primary/15"}`}>
                    <tr>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">ID / Tipo</th>
                      <th className="px-6 py-4">Origen</th>
                      <th className="px-6 py-4">Destino</th>
                      <th className="px-6 py-4 text-center">Cant.</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-white/5" : "divide-primary/10"}`}>
                    {transfers.map(tr => {
                      const prod = products.find(p => p.id === tr.productId);
                      return (
                        <tr key={tr.id} className={`transition-colors ${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-primary-light"}`}>
                          <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{tr.date}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-xs">{prod ? prod.name : "Producto Eliminado"}</div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              tr.isExternal
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/10"
                            }`}>
                              {tr.isExternal ? "Externa" : "Interna"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold">{tr.originBodega}</div>
                            {tr.isExternal && <div className="text-[9px] text-gray-400 font-medium">{tr.originSucursal}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold">{tr.destBodega}</div>
                            {tr.isExternal && <div className="text-[9px] text-gray-400 font-medium">{tr.destSucursal}</div>}
                          </td>
                          <td className="px-6 py-4 text-center font-black">{tr.quantity}</td>
                        </tr>
                      );
                    })}
                    {transfers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                          No se han registrado órdenes de transferencia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SECCION: AJUSTES DE STOCK */}
      {/* ============================================================== */}
      {activeTab === "ajustes" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Fila superior: Ajuste manual y zona de peligro */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Ajuste manual individual */}
            <div className={`p-6 rounded-[2rem] border lg:col-span-2 ${isDarkMode ? "glass-panel-dark text-white" : "bg-[#f3f8ff] border-primary/15 text-black"}`}>
              <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-1.5">
                <Sliders size={14} className="text-primary" />
                <span>Ajuste de Stock Manual (Individual)</span>
              </h3>

              <form onSubmit={handleRunManualAdjustment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Seleccionar Producto</label>
                  <select
                    value={adjustmentForm.productId}
                    required
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, productId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Selecciona un Producto</option>
                    {products.filter(p => p.type === 'producto' && p.productCategoryType !== 'combo').map(p => (
                      <option key={p.id} value={p.id}>{p.sku} - {p.name} (Stock actual: {p.stock})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Tipo de Ajuste</label>
                  <select
                    value={adjustmentForm.type}
                    required
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value })}
                    className={inputClass}
                  >
                    <option value="ingreso">Ingreso (Aumentar existencias)</option>
                    <option value="egreso">Egreso (Disminuir existencias)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustmentForm.quantity}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className={inputClass}
                  />
                </div>

                {adjustmentForm.type === "ingreso" ? (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Costo Unitario Adquisición ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={adjustmentForm.cost}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, cost: parseFloat(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Costo Unitario (Se aplicará CPP actual)</label>
                    <input
                      type="text"
                      disabled
                      value="Costo Automático"
                      className="w-full text-xs px-3.5 py-3 rounded-xl border bg-black/40 border-white/5 text-gray-500 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Bodega Afectada</label>
                  <select
                    value={adjustmentForm.bodega}
                    required
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, bodega: e.target.value })}
                    className={inputClass}
                  >
                    {bodegasOptionList.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Concepto / Motivo</label>
                  <input
                    type="text"
                    required
                    value={adjustmentForm.concept}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, concept: e.target.value })}
                    className={inputClass}
                    placeholder="Ej. Regularización de inventario por rotura"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-white/5 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all hover-lift shadow-md ${
                      isDarkMode
                        ? "bg-gradient-to-r from-primary to-primary-hover text-white hover:from-primary hover:to-primary-hover"
                        : "bg-primary text-white hover:bg-primary-hover"
                    }`}
                  >
                    {loading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={13} className="inline mr-1.5" />
                    )}
                    <span>Aplicar Ajuste Manual</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Zona de peligro - Encerar global */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-6 rounded-[2rem] border border-rose-500/20 bg-rose-500/[0.02] text-white flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-rose-500 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={15} />
                    <span>Zona de Peligro</span>
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed mt-4">
                    <strong>Encerar Inventario</strong> restablecerá a <strong>0 (cero)</strong> el stock de todos tus productos físicos registrados en Firestore.
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-2.5">
                    Esta acción genera logs de egreso Kardex correspondientes para registrar la regularización.
                  </p>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-350 leading-relaxed font-bold mt-4">
                    ⚠ ATENCIÓN: Esta acción no se puede deshacer y vacía inmediatamente el stock activo del sistema.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/10 transition-all uppercase tracking-wide hover:-translate-y-0.5 mt-6 border border-rose-500/20"
                >
                  <Trash2 size={14} />
                  <span>Encerar Catálogo de Stock</span>
                </button>
              </div>
            </div>
          </div>

          {/* Ajustes Masivos - Multi Fila */}
          <div className={`p-6 rounded-[2rem] border ${isDarkMode ? "glass-panel-dark text-white" : "bg-[#f3f8ff] border-primary/15 text-black"}`}>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-primary" />
                  <span>Ajuste de Stock Masivo (Multi-Fila)</span>
                </h3>
                <p className="text-xs text-gray-405 mt-1">Ingresa múltiples productos en lote, asigna stock de entrada/salida y ejecuta con una sola transacción.</p>
              </div>
              <button
                type="button"
                onClick={addMassiveRow}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isDarkMode
                    ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100 shadow-sm"
                }`}
              >
                <Plus size={13} />
                <span>Añadir Fila</span>
              </button>
            </div>

            <form onSubmit={handleRunMassiveAdjustment} className="space-y-4">
              <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-xl">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-black/30 text-gray-400" : "bg-primary-light text-black border-b border-primary/15"}`}>
                    <tr>
                      <th className="px-4 py-3">Fila</th>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3 text-center">Tipo</th>
                      <th className="px-4 py-3 text-center">Cantidad</th>
                      <th className="px-4 py-3 text-center">Costo Unit. (Ingreso)</th>
                      <th className="px-4 py-3">Bodega</th>
                      <th className="px-4 py-3 text-right">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {massiveRows.map((row, index) => (
                      <tr key={index} className="transition-colors hover:bg-white/[0.01]">
                        <td className="px-4 py-2 text-gray-400 font-bold">{index + 1}</td>
                        <td className="px-4 py-2">
                          <select
                            value={row.productId}
                            required
                            onChange={(e) => handleMassiveRowChange(index, "productId", e.target.value)}
                            className="text-xs px-2.5 py-1.5 rounded-lg outline-none border bg-black/25 border-white/10 text-white w-64"
                          >
                            <option value="">Selecciona un Producto</option>
                            {products.filter(p => p.type === 'producto' && p.productCategoryType !== 'combo').map(p => (
                              <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <select
                            value={row.type}
                            onChange={(e) => handleMassiveRowChange(index, "type", e.target.value)}
                            className="text-xs px-2 py-1.5 rounded-lg outline-none border bg-black/25 border-white/10 text-white"
                          >
                            <option value="ingreso">Ingreso (+)</option>
                            <option value="egreso">Egreso (-)</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            min="1"
                            required
                            value={row.quantity}
                            onChange={(e) => handleMassiveRowChange(index, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 text-xs px-2 py-1.5 rounded-lg text-center outline-none border bg-black/25 border-white/10 text-white"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            step="0.01"
                            required={row.type === 'ingreso'}
                            disabled={row.type === 'egreso'}
                            value={row.type === 'egreso' ? "" : row.cost}
                            onChange={(e) => handleMassiveRowChange(index, "cost", parseFloat(e.target.value) || 0)}
                            placeholder={row.type === 'egreso' ? "CPP Aut" : "0.00"}
                            className="w-24 text-xs px-2 py-1.5 rounded-lg text-center outline-none border bg-black/25 border-white/10 text-white disabled:opacity-40"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={row.bodega}
                            onChange={(e) => handleMassiveRowChange(index, "bodega", e.target.value)}
                            className="text-xs px-2 py-1.5 rounded-lg outline-none border bg-black/25 border-white/10 text-white"
                          >
                            {bodegasOptionList.map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            disabled={massiveRows.length === 1}
                            onClick={() => removeMassiveRow(index)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-30"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all hover-lift shadow-md ${
                    isDarkMode
                      ? "bg-gradient-to-r from-primary to-primary-hover text-white hover:from-primary hover:to-primary-hover"
                      : "bg-primary text-white hover:bg-primary-hover"
                  }`}
                >
                  {loading ? (
                    <RefreshCw size={13} className="animate-spin mr-1.5 inline" />
                  ) : (
                    <CheckCircle2 size={13} className="inline mr-1.5" />
                  )}
                  <span>Aplicar Ajuste Masivo Lote</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. SECCION: CONFIGURACION DE CATALOGO */}
      {/* ============================================================== */}
      {activeTab === "configuracion" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* Card Categorías */}
          <div className={`p-6 rounded-[2rem] border ${isDarkMode ? "glass-panel-dark text-white shadow-lg" : "bg-[#f3f8ff] border-primary/15 text-black"}`}>
            <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-1.5">
              <Layers3 size={14} className="text-primary" />
              <span>Categorías</span>
            </h3>

            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nueva Categoría"
                className="w-full text-xs px-3 py-2 rounded-xl border bg-black/20 border-white/10 text-white outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs"
              >
                Agregar
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl divide-y divide-white/5 bg-black/10">
              {categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <span className="font-medium">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 rounded hover:bg-rose-500/10 text-rose-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="p-4 text-center text-gray-500 italic text-[11px]">Ninguna categoría guardada.</div>
              )}
            </div>
          </div>

          {/* Card Marcas */}
          <div className={`p-6 rounded-[2rem] border ${isDarkMode ? "glass-panel-dark text-white shadow-lg" : "bg-[#f3f8ff] border-primary/15 text-black"}`}>
            <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-1.5">
              <Bookmark size={14} className="text-primary" />
              <span>Marcas</span>
            </h3>

            <form onSubmit={handleAddBrand} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Nueva Marca"
                className="w-full text-xs px-3 py-2 rounded-xl border bg-black/20 border-white/10 text-white outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs"
              >
                Agregar
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl divide-y divide-white/5 bg-black/10">
              {brands.map(br => (
                <div key={br.id} className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <span className="font-medium">{br.name}</span>
                  <button
                    onClick={() => handleDeleteBrand(br.id)}
                    className="p-1 rounded hover:bg-rose-500/10 text-rose-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {brands.length === 0 && (
                <div className="p-4 text-center text-gray-500 italic text-[11px]">Ninguna marca guardada.</div>
              )}
            </div>
          </div>

          {/* Card Descuentos */}
          <div className={`p-6 rounded-[2rem] border ${isDarkMode ? "glass-panel-dark text-white shadow-lg" : "bg-[#f3f8ff] border-primary/15 text-black"}`}>
            <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-1.5">
              <Percent size={14} className="text-primary" />
              <span>Descuentos de Venta</span>
            </h3>

            <form onSubmit={handleAddDiscount} className="space-y-2 mb-4">
              <input
                type="text"
                value={newDiscount.name}
                required
                onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                placeholder="Nombre Descuento (Ej. Black Friday)"
                className="w-full text-xs px-3 py-2 rounded-xl border bg-black/20 border-white/10 text-white outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newDiscount.value}
                  onChange={(e) => setNewDiscount({ ...newDiscount, value: e.target.value })}
                  placeholder="Valor"
                  className="w-1/2 text-xs px-3 py-2 rounded-xl border bg-black/20 border-white/10 text-white outline-none"
                />
                <select
                  value={newDiscount.type}
                  onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value })}
                  className="w-1/2 text-xs px-3 py-2 rounded-xl border bg-black/20 border-white/10 text-white outline-none"
                >
                  <option value="percent" className="text-black">% Porcentaje</option>
                  <option value="fixed" className="text-black">$ Fijo</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs"
              >
                Agregar Descuento
              </button>
            </form>

            <div className="max-h-48 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl divide-y divide-white/5 bg-black/10">
              {discounts.map(dc => (
                <div key={dc.id} className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <div>
                    <div className="font-bold">{dc.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{dc.type === "percent" ? `${dc.value}%` : `$${dc.value}`}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteDiscount(dc.id)}
                    className="p-1 rounded hover:bg-rose-500/10 text-rose-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {discounts.length === 0 && (
                <div className="p-4 text-center text-gray-500 italic text-[11px]">Ningún descuento guardado.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL CREAR / EDITAR ITEM */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-xl p-6 sm:p-8 rounded-[2.2rem] shadow-2xl transition-all duration-300 border overflow-y-auto max-h-[90vh] custom-scrollbar ${
            isDarkMode ? "glass-panel-dark text-white" : "bg-[#f3f8ff] border-primary/15 text-[#000000]"
          }`}>
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
              <h2 className="text-base font-bold font-display uppercase tracking-wider">
                {formData.id ? "Editar" : "Registrar"} Producto / Servicio
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-white/5 text-gray-400 hover:text-white" : "hover:bg-black/5 text-gray-550 hover:text-gray-900"}`}
              >
                <Plus size={16} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                {/* Nombre */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Nombre del Ítem</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                    placeholder="Ej. Laptop Dell Latitude 5420"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Código SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className={inputClass}
                    placeholder="LPT-DELL-5420"
                  />
                </div>

                {/* Clase (Producto o Servicio) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Clase del Ítem</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, productCategoryType: e.target.value === "servicio" ? "estandar" : formData.productCategoryType })}
                    className={inputClass}
                  >
                    <option value="producto" className="text-black">Producto Físico</option>
                    <option value="servicio" className="text-black">Servicio / Horas</option>
                  </select>
                </div>

                {/* Si es Producto Físico, seleccionar Clasificación */}
                {formData.type === "producto" && (
                  <div className="col-span-2 p-3 bg-white/5 border border-white/5 rounded-xl grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Clasificación de Producto</label>
                      <select
                        value={formData.productCategoryType || "estandar"}
                        onChange={(e) => setFormData({ ...formData, productCategoryType: e.target.value })}
                        className={inputClass}
                      >
                        <option value="estandar" className="text-black">Estándar (Individual)</option>
                        <option value="subproducto" className="text-black">Subproducto (Componente)</option>
                        <option value="combo" className="text-black">Combo (Agrupación / Paquete)</option>
                      </select>
                    </div>

                    {/* Si es subproducto: Selector de padre */}
                    {formData.productCategoryType === "subproducto" && (
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Producto Padre Vinculado</label>
                        <select
                          value={formData.parentProductId || ""}
                          required
                          onChange={(e) => setFormData({ ...formData, parentProductId: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Selecciona el Producto Padre...</option>
                          {products.filter(p => p.type === "producto" && p.productCategoryType === "estandar").map(p => (
                            <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                          ))}
                        </select>
                        <span className="text-[9px] text-gray-400 mt-1 block">Permite vincular este subproducto a un empaque mayor (ej. botella individual a sixpack).</span>
                      </div>
                    )}

                    {/* Si es combo: Constructor de items */}
                    {formData.productCategoryType === "combo" && (
                      <div className="col-span-2 space-y-3">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Constructor de Componentes del Combo</div>
                        
                        <div className="flex gap-2 items-center">
                          <select
                            value={tempComboProductId}
                            onChange={(e) => setTempComboProductId(e.target.value)}
                            className="text-xs px-2.5 py-2 rounded-xl outline-none border bg-black/25 border-white/10 text-white w-2/3"
                          >
                            <option value="">Selecciona Componente...</option>
                            {products.filter(p => p.type === "producto" && p.productCategoryType !== "combo").map(p => (
                              <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            value={tempComboQty}
                            onChange={(e) => setTempComboQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 text-xs px-2 py-2 rounded-xl border text-center bg-black/25 border-white/10 text-white"
                          />
                          <button
                            type="button"
                            onClick={addComboItem}
                            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs"
                          >
                            Agregar
                          </button>
                        </div>

                        {/* Listado de items del combo */}
                        <div className="border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5 bg-black/20 text-xs">
                          {formData.comboItems && formData.comboItems.length > 0 ? (
                            formData.comboItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center px-4 py-2">
                                <div>
                                  <span className="font-bold text-amber-400">{item.quantity}x</span> {item.name || item.productId}
                                  <span className="text-[9px] text-gray-400 font-mono ml-2">({item.sku})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeComboItem(item.productId)}
                                  className="p-1 rounded hover:bg-rose-500/10 text-rose-400 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-gray-500 italic text-[11px]">Agrega productos componentes para el combo.</div>
                          )}
                        </div>
                        <span className="text-[9px] text-amber-500 block leading-tight font-medium">💡 Nota: La venta de este combo descontará automáticamente el stock físico de sus componentes individuales en base a las cantidades indicadas.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Descripción */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`${inputClass} min-h-[50px] resize-none rounded-2xl`}
                    placeholder="Especificaciones, modelo o detalles..."
                  />
                </div>

                {/* Costo */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Costo Adquisición ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {/* PVP */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Precio Venta (P.V.P $)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {/* IVA Category */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Tarifa IVA</label>
                  <select
                    value={formData.ivaCategory}
                    onChange={(e) => setFormData({ ...formData, ivaCategory: e.target.value })}
                    className={inputClass}
                  >
                    <option value="15" className="text-black">15% IVA (Ecuador)</option>
                    <option value="12" className="text-black">12% IVA</option>
                    <option value="0" className="text-black">0% IVA</option>
                  </select>
                </div>

                {/* Marca (Dropdown configurable) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Marca</label>
                  <select
                    value={formData.marca || ""}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className={inputClass}
                  >
                    <option value="" className="text-black">Ninguna Marca</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.name} className="text-black">{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Categoría (Dropdown configurable) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Categoría</label>
                  <select
                    value={formData.categoria || ""}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className={inputClass}
                  >
                    <option value="" className="text-black">Ninguna Categoría</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name} className="text-black">{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Bodega */}
                {formData.type === "producto" && formData.productCategoryType !== "combo" && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Bodega Ubicación</label>
                    <select
                      value={formData.bodega || "Bodega Central"}
                      onChange={(e) => setFormData({ ...formData, bodega: e.target.value })}
                      className={inputClass}
                    >
                      {bodegasOptionList.map(wh => (
                        <option key={wh} value={wh} className="text-black">{wh}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Código de barras */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Código de Barras</label>
                  <input
                    type="text"
                    value={formData.codigoBarras || ""}
                    onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                    className={inputClass}
                    placeholder="7501055300075"
                  />
                </div>

                {/* Stocks (solo si es producto estándar o subproducto, no combo o servicio) */}
                {formData.type === "producto" && formData.productCategoryType !== "combo" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Stock Inicial</label>
                      <input
                        type="number"
                        required
                        disabled={!!formData.id} // En edición se actualiza por modulo de Ajustes
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className={`${inputClass} disabled:opacity-50`}
                      />
                      {formData.id && <span className="text-[9px] text-gray-400 block mt-1">El stock se altera vía modulo Ajustes/Kardex.</span>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Stock Mínimo (Alerta)</label>
                      <input
                        type="number"
                        required
                        value={formData.minStock}
                        onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </>
                )}

              </div>

              {/* Botones de pie */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isDarkMode ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover-lift shadow-md ${
                    isDarkMode
                      ? "bg-gradient-to-r from-primary to-primary-hover text-white hover:from-primary hover:to-primary-hover"
                      : "bg-primary text-white hover:bg-primary-hover"
                  }`}
                >
                  Guardar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL CONFIGURACION / CONFIRMACION ENCERAR */}
      {/* ============================================================== */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-[2rem] shadow-2xl transition-all border border-rose-500/30 bg-[#0f0f11] text-white">
            <h2 className="text-base font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <AlertTriangle size={18} />
              <span>CONFIRMAR ENCERADO GLOBAL</span>
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              ¿Estás completamente seguro de que deseas encerar todo tu inventario físico?
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
              Esta acción establecerá las existencias de todos los productos del catálogo a 0. Para continuar, escribe la palabra <strong>ENCERAR</strong> en el cuadro inferior:
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={encerarConfirmationText}
                onChange={(e) => setEncerarConfirmationText(e.target.value)}
                placeholder="Escribe ENCERAR aquí"
                className="w-full text-xs px-3.5 py-3 rounded-xl outline-none border bg-black/40 border-white/10 text-white focus:border-rose-500"
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfigModalOpen(false);
                    setEncerarConfirmationText("");
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEncerarInventario}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20"
                >
                  Ejecutar Encerado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
