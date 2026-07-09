import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Package,
  AlertTriangle,
  CheckCircle2} from "lucide-react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDoc} from "firebase/firestore";

export default function ProductsView({ showToast, db, appId }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
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
    codigoBarras: ""});

  // Cargar configuraciones del emisor para obtener las bodegas
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

  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "finances_products",
    );
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(data);
      setLoading(false);
    });
    return unsub;
  }, [appId, db]);

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
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        ivaCategory: parseInt(formData.ivaCategory) || 15,
        stock: formData.type === "servicio" ? 0 : parseInt(formData.stock) || 0,
        minStock:
          formData.type === "servicio" ? 0 : parseInt(formData.minStock) || 0,
        type: formData.type,
        marca: formData.marca || "",
        categoria: formData.categoria || "",
        bodega: formData.bodega || "Bodega Central",
        codigoBarras: formData.codigoBarras || "",
        updatedAt: new Date().toISOString()};

      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "finances_products",
          docId,
        ),
        finalProduct,
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
    if (
      window.confirm(
        "¿Seguro que deseas eliminar este producto/servicio de forma permanente?",
      )
    ) {
      try {
        await deleteDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "finances_products",
            id,
          ),
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
      codigoBarras: ""});
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const inputClass = `w-full text-xs px-3.5 py-3 rounded-card outline-none transition-all border ${
     ? "glass-input-dark" : "glass-input-light"
  }`;

  return (
    <div className="space-y-6">
      {/* HEADER ACCIONES */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus size={14} /> Registrar Producto
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-card border-none w-full sm:w-80 transition-all focus-within:ring-1 focus-within:ring-primary/25 bg-surface-bg hover:bg-surface-card focus-within:bg-surface-card">
            <Search size={14} className="text-text-muted" />
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
            className="px-3 py-1.5 rounded-card border-none text-xs font-medium outline-none transition-all cursor-pointer bg-surface-bg hover:bg-surface-card text-slate-700 focus:ring-1 focus:ring-primary/25"
          >
            <option value="all">Todos los tipos</option>
            <option value="producto">Productos físicos</option>
            <option value="servicio">Servicios / Horas</option>
          </select>
        </div>
      </div>

      {/* TABLA CATÁLOGO */}
      <div
        className={`rounded-card border overflow-hidden transition-all ${
          "border-border-default/80 bg-white"
        }`}
      >
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead
                className={`text-xs uppercase font-bold tracking-wider ${
                  "bg-surface-bg text-text-secondary border-b border-border-default"
                }`}
              >
                <tr>
                  <th className="px-6 py-3.5">SKU / Código</th>
                  <th className="px-6 py-3.5">Nombre</th>
                  <th className="px-6 py-3.5">Tipo</th>
                  <th className="px-6 py-3.5 text-right hidden sm:table-cell">Costo</th>
                  <th className="px-6 py-3.5 text-right">P.V.P</th>
                  <th className="px-6 py-3.5">IVA</th>
                  <th className="px-6 py-3.5 text-center">Stock</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${ ? "divide-white/5" : "divide-[#E6EBF1]"}`}
              >
                {filtered.map((p) => {
                  const isLow = p.type === "producto" && p.stock <= p.minStock;
                  const isOut = p.type === "producto" && p.stock === 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${ ? "hover:bg-white/[0.015]" : "hover:bg-surface-bg/40"}`}
                    >
                      <td
                        className={`px-6 py-3.5 font-mono text-xs font-bold ${ ? "text-text-muted" : "text-text-secondary"}`}
                      >
                        {p.sku}
                      </td>
                      <td className="px-6 py-3.5">
                        <div
                          className={`font-bold text-xs ${ ? "text-white" : "text-text-secondary"}`}
                        >
                          {p.name}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1 text-xs font-bold uppercase tracking-wider">
                          {p.marca && (
                            <span
                              className={`px-1.5 py-0.5 rounded-card ${ ? "bg-white/5 text-text-muted" : "bg-primary-light text-text-primary border border-primary/10"}`}
                            >
                              Marca: {p.marca}
                            </span>
                          )}
                          {p.categoria && (
                            <span
                              className={`px-1.5 py-0.5 rounded-card ${ ? "bg-white/5 text-text-muted" : "bg-primary-light text-text-primary border border-primary/10"}`}
                            >
                              Cat: {p.categoria}
                            </span>
                          )}
                          {p.bodega && (
                            <span
                              className={`px-1.5 py-0.5 rounded-card ${ ? "bg-primary/10 text-primary border border-primary/10" : "bg-primary/10 text-primary border border-primary/25"}`}
                            >
                              Bodega: {p.bodega}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p
                            className={`text-xs font-bold truncate mt-1 max-w-[220px] ${ ? "text-text-muted" : "text-text-muted"}`}
                            title={p.description}
                          >
                            {p.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-card text-xs font-bold uppercase border ${
                            p.type === "producto"
                              "bg-primary-light text-primary border-primary/25"
                              "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-3.5 text-right font-bold hidden sm:table-cell ${ ? "text-text-muted" : "text-text-secondary"}`}
                      >
                        ${Number(p.cost || 0).toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-3.5 text-right font-black ${ ? "text-white" : "text-primary"}`}
                      >
                        ${Number(p.price || 0).toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-3.5 font-bold ${ ? "text-text-muted" : "text-text-secondary"}`}
                      >
                        {p.ivaCategory}%
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {p.type === "servicio" ? (
                          <span className="text-text-muted italic font-medium">
                            N/A
                          </span>
                        ) : isOut ? (
                          <span
                            className={`px-2 py-1 rounded-card text-xs font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[90px] bg-red-500/10 border-red-500/20 text-red-400 animate-pulse`}
                          >
                            <AlertTriangle size={10} /> Sin Stock
                          </span>
                        ) : isLow ? (
                          <span
                            className={`px-2 py-1 rounded-card text-xs font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[90px] bg-orange-500/10 border-orange-500/20 text-orange-400`}
                          >
                            <AlertTriangle size={10} /> {p.stock} (Bajo)
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-card text-xs font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[70px] bg-emerald-500/10 border-emerald-500/20 text-emerald-450`}
                          >
                            {p.stock}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setFormData(p);
                              setIsModalOpen(true);
                            }}
                            className="btn-icon bg-primary text-white hover:bg-primary-hover"
                            title="Editar"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="btn-icon bg-red-600 text-white hover:bg-red-700"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-text-muted italic"
                    >
                      No se encontraron productos o servicios en el catálogo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg p-6 sm:p-8 rounded-card transition-all duration-300 border ${ ? "glass-panel-dark text-white" : "bg-surface-card border-primary/15 text-text-secondary"}`}
          >
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
              <h2 className="text-base font-bold font-display uppercase tracking-wider">
                {formData.id ? "Editar" : "Registrar"} Producto o Servicio
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-icon text-gray-450 hover:text-text-primary dark:text-text-muted dark:hover:text-white"
              >
                <Plus size={16} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Nombre del Ítem
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Ej. Laptop Dell Latitude 5420"
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Código SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className={inputClass}
                    placeholder="LPT-DELL-5420"
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Tipo de Ítem
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="producto" className="text-text-primary">
                      Producto Físico
                    </option>
                    <option value="servicio" className="text-text-primary">
                      Servicio / Horas
                    </option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className={`${inputClass} min-h-[70px] resize-none rounded-card`}
                    placeholder="Especificaciones, modelo o detalles..."
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Costo Adquisición ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Precio Venta (P.V.P $)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Tarifa IVA
                  </label>
                  <select
                    value={formData.ivaCategory}
                    onChange={(e) =>
                      setFormData({ ...formData, ivaCategory: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="15">15% IVA (General)</option>
                    <option value="12">12% IVA</option>
                    <option value="5">5% IVA (Mat. Construccion)</option>
                    <option value="0">0% IVA (Exento)</option>
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.marca || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, marca: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Ej. Dell, Samsung"
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.categoria || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Ej. Laptops, Monitores"
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Bodega / Ubicación
                  </label>
                  {settings && settings.bodegas && settings.bodegas.length > 0 ? (
                    <select
                      value={formData.bodega || "Bodega Central"}
                      onChange={(e) =>
                        setFormData({ ...formData, bodega: e.target.value })
                      }
                      className={inputClass}
                    >
                      {settings.bodegas.map(wh => (
                        <option key={wh} value={wh} className="text-text-primary">{wh}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.bodega || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, bodega: e.target.value })
                      }
                      className={inputClass}
                      placeholder="Ej. Bodega Central"
                    />
                  )}
                </div>
                <div className="col-span-2">
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                  >
                    Código de Barras
                  </label>
                  <input
                    type="text"
                    value={formData.codigoBarras || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, codigoBarras: e.target.value })
                    }
                    className={inputClass}
                    placeholder="7501055300075"
                  />
                </div>

                {formData.type === "producto" && (
                  <>
                    <div>
                      <label
                        className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                      >
                        Stock Inicial
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.stock}
                        onChange={(e) =>
                          setFormData({ ...formData, stock: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 ${ ? "text-text-muted" : "text-text-secondary"}`}
                      >
                        Stock Mínimo (Alerta)
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.minStock}
                        onChange={(e) =>
                          setFormData({ ...formData, minStock: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
