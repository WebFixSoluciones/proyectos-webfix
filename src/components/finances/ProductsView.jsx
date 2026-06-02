import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Package,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

export default function ProductsView({ isDarkMode, showToast, db, appId }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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
  });

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
        updatedAt: new Date().toISOString(),
      };

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
      codigoBarras: "",
    });
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const inputClass = `w-full text-xs px-3.5 py-3 rounded-xl outline-none transition-all border ${
    isDarkMode ? "glass-input-dark" : "glass-input-light"
  }`;

  return (
    <div className="space-y-6">
      {/* HEADER ACCIONES */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border w-full sm:w-80 transition-all ${isDarkMode ? "bg-black/20 border-white/10 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/30" : "bg-[#f3f8ff] border-blue-100 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30"}`}
          >
            <Search
              size={14}
              className={isDarkMode ? "text-gray-500" : "text-blue-500"}
            />
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
            className={`px-3 py-2.5 rounded-xl border text-xs outline-none cursor-pointer transition-all ${isDarkMode ? "bg-black/20 border-white/10 text-gray-300 hover:bg-black/35" : "bg-[#f3f8ff] border-blue-100 text-[#000000] font-bold hover:bg-blue-50"}`}
          >
            <option value="all">Todos los tipos</option>
            <option value="producto">Productos físicos</option>
            <option value="servicio">Servicios / Horas</option>
          </select>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover-lift shadow-md ${
            isDarkMode
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-950/20 hover:from-blue-500 hover:to-indigo-500 border border-blue-500/30"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <Plus size={14} /> Registrar Producto
        </button>
      </div>

      {/* TABLA CATÁLOGO */}
      <div
        className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDarkMode ? "border-white/5 bg-white/[0.01] shadow-lg" : "border-blue-100 bg-[#f3f8ff] shadow-sm"}`}
      >
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead
                className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-black/30 text-gray-400 border-b border-white/5" : "bg-blue-50/50 text-[#000000] border-b border-blue-100"}`}
              >
                <tr>
                  <th className="px-6 py-4">SKU / Código</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-right">Costo</th>
                  <th className="px-6 py-4 text-right">P.V.P</th>
                  <th className="px-6 py-4">IVA</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isDarkMode ? "divide-white/5" : "divide-blue-100/50"}`}
              >
                {filtered.map((p) => {
                  const isLow = p.type === "producto" && p.stock <= p.minStock;
                  const isOut = p.type === "producto" && p.stock === 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-blue-50/50"}`}
                    >
                      <td
                        className={`px-6 py-4 font-mono text-[10px] font-bold ${isDarkMode ? "text-gray-300" : "text-[#000000]"}`}
                      >
                        {p.sku}
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`font-bold text-xs ${isDarkMode ? "text-white" : "text-[#000000]"}`}
                        >
                          {p.name}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1 text-[8px] font-bold uppercase tracking-wider">
                          {p.marca && (
                            <span
                              className={`px-1.5 py-0.5 rounded ${isDarkMode ? "bg-white/5 text-gray-400" : "bg-blue-50/40 text-black border border-blue-100/50"}`}
                            >
                              Marca: {p.marca}
                            </span>
                          )}
                          {p.categoria && (
                            <span
                              className={`px-1.5 py-0.5 rounded ${isDarkMode ? "bg-white/5 text-gray-400" : "bg-blue-50/40 text-black border border-blue-100/50"}`}
                            >
                              Cat: {p.categoria}
                            </span>
                          )}
                          {p.bodega && (
                            <span
                              className={`px-1.5 py-0.5 rounded ${isDarkMode ? "bg-blue-500/10 text-blue-400 border border-blue-500/10" : "bg-blue-100 text-blue-750 border border-blue-200"}`}
                            >
                              Bodega: {p.bodega}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p
                            className={`text-[9px] font-bold truncate mt-1 max-w-[220px] ${isDarkMode ? "text-gray-500" : "text-[#000000]"}`}
                            title={p.description}
                          >
                            {p.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                            p.type === "producto"
                              ? isDarkMode
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                              : isDarkMode
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${isDarkMode ? "text-gray-300" : "text-[#000000]"}`}
                      >
                        ${Number(p.cost || 0).toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-black ${isDarkMode ? "text-white" : "text-blue-700"}`}
                      >
                        ${Number(p.price || 0).toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-4 font-bold ${isDarkMode ? "text-gray-350" : "text-[#000000]"}`}
                      >
                        {p.ivaCategory}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.type === "servicio" ? (
                          <span className="text-gray-500 italic font-medium">
                            N/A
                          </span>
                        ) : isOut ? (
                          <span
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[90px] bg-red-500/10 border-red-500/20 text-red-400 animate-pulse`}
                          >
                            <AlertTriangle size={10} /> Sin Stock
                          </span>
                        ) : isLow ? (
                          <span
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[90px] bg-orange-500/10 border-orange-500/20 text-orange-400`}
                          >
                            <AlertTriangle size={10} /> {p.stock} (Bajo)
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[70px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400`}
                          >
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
                            className={`p-2 rounded-xl transition-colors ${isDarkMode ? "hover:bg-blue-500/15 text-blue-400 border border-transparent" : "hover:bg-blue-100 text-blue-700 border border-blue-200 bg-white"}`}
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
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-gray-500 italic"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg p-6 sm:p-8 rounded-[2rem] shadow-2xl transition-all duration-300 border ${isDarkMode ? "glass-panel-dark text-white" : "bg-[#f3f8ff] border-blue-100 text-[#000000]"}`}
          >
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
              <h2 className="text-base font-bold font-display uppercase tracking-wider">
                {formData.id ? "Editar" : "Registrar"} Producto o Servicio
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
                <div className="col-span-2">
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                    <option value="producto" className="text-black">
                      Producto Físico
                    </option>
                    <option value="servicio" className="text-black">
                      Servicio / Horas
                    </option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className={`${inputClass} min-h-[70px] resize-none rounded-2xl`}
                    placeholder="Especificaciones, modelo o detalles..."
                  />
                </div>

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                    <option value="15" className="text-black">
                      15% IVA (Ecuador)
                    </option>
                    <option value="12" className="text-black">
                      12% IVA
                    </option>
                    <option value="0" className="text-black">
                      0% IVA
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Bodega / Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.bodega || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, bodega: e.target.value })
                    }
                    className={inputClass}
                    placeholder="Ej. Bodega Central"
                  />
                </div>
                <div className="col-span-2">
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                        className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                        className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
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
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isDarkMode ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover-lift shadow-md ${
                    isDarkMode
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
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
