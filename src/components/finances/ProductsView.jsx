import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiText, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiTextarea } from '../ui/controls';
/* eslint-disable */
import { useState, useEffect } from "react";
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
  getDoc} from "../../services/financeStore.js";

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
      await window.confirm(
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

  

  return (
    <UiBox {...{"className":"space-y-6"}}>
      {/* HEADER ACCIONES */}
      <UiBox {...{"className":"flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6"}}>
        <UiBox>
          <UiButton
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            {...{"variant":"solid","color":"blue","className":"w-full sm:w-auto"}}
          >
            <Plus size={14} /> Registrar Producto
          </UiButton>
        </UiBox>

        <UiBox {...{"className":"flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto"}}>
          <UiCard {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"flex items-center gap-2 px-3.5 py-1.5 w-full sm:w-80"}}>
            <Search size={14} {...{"style":{"color":"var(--gray-11)"}}} />
            <UiInput
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              {...{"size":"2","className":"w-full"}}
            />
          </UiCard>
          <UiSelect
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            {...{"size":"2","color":"gray","className":"cursor-pointer"}}
          >
            <option value="all">Todos los tipos</option>
            <option value="producto">Productos físicos</option>
            <option value="servicio">Servicios / Horas</option>
          </UiSelect>
        </UiBox>
      </UiBox>

      {/* TABLA CATÁLOGO */}
      <UiBox
        {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"overflow-hidden"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}
      >
        {loading ? (
          <UiBox {...{"className":"flex justify-center items-center py-16"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)"},"className":"animate-spin h-8 w-8"}}></UiBox>
          </UiBox>
        ) : (
          <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
            <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
              <UiTableHeader
                {...mergeThemeProps({}, {}, {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-11)"}})}
              >
                <UiTableRow>
                  <UiTableHead {...{"className":"px-6 py-3.5"}}>SKU / Código</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5"}}>Nombre</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5"}}>Tipo</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5 text-right hidden sm:table-cell"}}>Costo</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>P.V.P</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5"}}>IVA</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5 text-center"}}>Stock</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Acciones</UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody
                {...mergeThemeProps({}, {}, (false ? {} : {}))}
              >
                {filtered.map((p) => {
                  const isLow = p.type === "producto" && p.stock <= p.minStock;
                  const isOut = p.type === "producto" && p.stock === 0;

                  return (
                    <UiTableRow
                      key={p.id}
                      {...mergeThemeProps({}, {}, (false ? {} : {}))}
                    >
                      <UiTableCell
                        {...mergeThemeProps({"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}, {}, (false ? {"style":{"color":"var(--gray-11)"}} : {"style":{"color":"var(--gray-11)"}}))}
                      >
                        {p.sku}
                      </UiTableCell>
                      <UiTableCell {...{"className":"px-6 py-3.5"}}>
                        <UiBox
                          {...mergeThemeProps({}, {}, (false ? {"style":{"color":"var(--color-background)"}} : {"style":{"color":"var(--gray-11)"}}))}
                        >
                          {p.name}
                        </UiBox>
                        <UiBox {...{"className":"flex flex-wrap gap-1 mt-1"}}>
                          {p.marca && (
                            <UiText
                              {...mergeThemeProps({"className":"px-1.5 py-0.5"}, {}, (false ? {"color":"gray"} : {"color":"gray","highContrast":true}))}
                            >
                              Marca: {p.marca}
                            </UiText>
                          )}
                          {p.categoria && (
                            <UiText
                              {...mergeThemeProps({"className":"px-1.5 py-0.5"}, {}, (false ? {"color":"gray"} : {"color":"gray","highContrast":true}))}
                            >
                              Cat: {p.categoria}
                            </UiText>
                          )}
                          {p.bodega && (
                            <UiText
                              {...mergeThemeProps({"className":"px-1.5 py-0.5"}, {}, (false ? {"color":"blue"} : {"color":"blue"}))}
                            >
                              Bodega: {p.bodega}
                            </UiText>
                          )}
                        </UiBox>
                        {p.description && (
                          <UiText as="p"
                            {...mergeThemeProps({"size":"1","weight":"bold","className":"truncate mt-1 max-w-[220px]"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                            title={p.description}
                          >
                            {p.description}
                          </UiText>
                        )}
                      </UiTableCell>
                      <UiTableCell {...{"className":"px-6 py-3.5"}}>
                        <UiText
                          {...mergeThemeProps({"size":"1","weight":"bold","className":"px-2 py-0.5"}, {}, (p.type === "producto" ? {"color":"blue"} : {"color":"purple"}))}
                        >
                          {p.type}
                        </UiText>
                      </UiTableCell>
                      <UiTableCell
                        {...mergeThemeProps({"className":"px-6 py-3.5 text-right hidden sm:table-cell"}, {}, (false ? {"style":{"color":"var(--gray-11)"}} : {"style":{"color":"var(--gray-11)"}}))}
                      >
                        ${Number(p.cost || 0).toFixed(2)}
                      </UiTableCell>
                      <UiTableCell
                        {...mergeThemeProps({"className":"px-6 py-3.5 text-right"}, {}, (false ? {"style":{"color":"var(--color-background)"}} : {"style":{"color":"var(--blue-12)"}}))}
                      >
                        ${Number(p.price || 0).toFixed(2)}
                      </UiTableCell>
                      <UiTableCell
                        {...mergeThemeProps({"className":"px-6 py-3.5"}, {}, (false ? {"style":{"color":"var(--gray-11)"}} : {"style":{"color":"var(--gray-11)"}}))}
                      >
                        {p.ivaCategory}%
                      </UiTableCell>
                      <UiTableCell {...{"className":"px-6 py-3.5 text-center"}}>
                        {p.type === "servicio" ? (
                          <UiText {...{"color":"gray","weight":"medium","className":"italic"}}>
                            N/A
                          </UiText>
                        ) : isOut ? (
                          <UiText
                            {...mergeThemeProps({"size":"1","weight":"bold","color":"red","className":"px-2 py-1 flex items-center justify-center gap-1 mx-auto max-w-[90px] animate-pulse"})}
                          >
                            <AlertTriangle size={10} /> Sin Stock
                          </UiText>
                        ) : isLow ? (
                          <UiText
                            {...mergeThemeProps({"size":"1","weight":"bold","color":"orange","className":"px-2 py-1 flex items-center justify-center gap-1 mx-auto max-w-[90px]"})}
                          >
                            <AlertTriangle size={10} /> {p.stock} (Bajo)
                          </UiText>
                        ) : (
                          <UiText
                            {...mergeThemeProps({"size":"1","weight":"bold","color":"green","className":"px-2.5 py-1 flex items-center justify-center gap-1 mx-auto max-w-[70px]"})}
                          >
                            {p.stock}
                          </UiText>
                        )}
                      </UiTableCell>
                      <UiTableCell {...{"className":"px-6 py-3.5 text-right"}}>
                        <UiBox {...{"className":"flex items-center justify-end gap-1.5"}}>
                          <UiButton iconOnly
                            onClick={() => {
                              setFormData(p);
                              setIsModalOpen(true);
                            }}
                            {...{"variant":"solid","color":"blue"}}
                            title="Editar"
                          >
                            <Edit2 size={13} />
                          </UiButton>
                          <UiButton iconOnly
                            onClick={() => handleDelete(p.id)}
                            {...{"variant":"solid","color":"red"}}
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </UiButton>
                        </UiBox>
                      </UiTableCell>
                    </UiTableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <UiTableRow>
                    <UiTableCell
                      colSpan="8"
                      {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-12 text-center italic"}}
                    >
                      No se encontraron productos o servicios en el catálogo.
                    </UiTableCell>
                  </UiTableRow>
                )}
              </UiTableBody>
            </UiTable>
          </UiBox>
        )}
      </UiBox>

      {/* MODAL CREAR / EDITAR */}
      {isModalOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"}}>
          <UiCard
            {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-11)"},"className":"w-full max-w-lg p-6 sm:p-8 duration-300"})}
          >
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-6 pb-2"}}>
              <UiHeading as="h2" {...{"size":"3","weight":"regular"}}>
                {formData.id ? "Editar" : "Registrar"} Producto o Servicio
              </UiHeading>
              <UiButton iconOnly
                onClick={() => setIsModalOpen(false)}
                {...{"variant":"surface","color":"gray"}}
              >
                <Plus size={16} {...{"className":"rotate-45"}} />
              </UiButton>
            </UiBox>

            <form onSubmit={handleSave} {...{"className":"space-y-4"}}>
              <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
                <UiBox {...{"className":"col-span-2"}}>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Nombre del Ítem
                  </UiLabel>
                  <UiInput
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    {...mergeThemeProps({"size":"2","className":"w-full"})}
                    placeholder="Ej. Laptop Dell Latitude 5420"
                  />
                </UiBox>

                <UiBox>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Código SKU
                  </UiLabel>
                  <UiInput
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    {...mergeThemeProps({"size":"2","className":"w-full"})}
                    placeholder="LPT-DELL-5420"
                  />
                </UiBox>

                <UiBox>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Tipo de Ítem
                  </UiLabel>
                  <UiSelect
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    {...mergeThemeProps({}, {"className":"cursor-pointer"}, mergeThemeProps({"size":"2","className":"w-full"}))}
                  >
                    <option value="producto" {...{"style":{"color":"var(--gray-12)"}}}>
                      Producto Físico
                    </option>
                    <option value="servicio" {...{"style":{"color":"var(--gray-12)"}}}>
                      Servicio / Horas
                    </option>
                  </UiSelect>
                </UiBox>

                <UiBox {...{"className":"col-span-2"}}>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Descripción
                  </UiLabel>
                  <UiTextarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    {...mergeThemeProps({}, {"className":"resize-none"}, mergeThemeProps({"size":"2","className":"w-full"}))}
                    placeholder="Especificaciones, modelo o detalles..."
                  />
                </UiBox>

                <UiBox>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Costo Adquisición ($)
                  </UiLabel>
                  <UiInput
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    {...mergeThemeProps({"size":"2","className":"w-full"})}
                  />
                </UiBox>

                <UiBox>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Precio Venta (P.V.P $)
                  </UiLabel>
                  <UiInput
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    {...mergeThemeProps({"size":"2","className":"w-full"})}
                  />
                </UiBox>

                <UiBox>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Tarifa IVA
                  </UiLabel>
                  <UiSelect
                    value={formData.ivaCategory}
                    onChange={(e) =>
                      setFormData({ ...formData, ivaCategory: e.target.value })
                    }
                    {...mergeThemeProps({"size":"2","className":"w-full"})}
                  >
                    <option value="15">15% IVA (General)</option>
                    <option value="12">12% IVA</option>
                    <option value="5">5% IVA (Mat. Construccion)</option>
                    <option value="0">0% IVA (Exento)</option>
                  </UiSelect>
                </UiBox>

                <UiBox>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Marca
                  </UiLabel>
                  <UiInput
                    type="text"
                    value={formData.marca || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, marca: e.target.value })
                    }
                    {...mergeThemeProps({"size":"2","className":"w-full"})}
                    placeholder="Ej. Dell, Samsung"
                  />
                </UiBox>
                <UiBox>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Categoría
                  </UiLabel>
                  <UiInput
                    type="text"
                    value={formData.categoria || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    {...mergeThemeProps({"size":"2","className":"w-full"})}
                    placeholder="Ej. Laptops, Monitores"
                  />
                </UiBox>
                <UiBox>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Bodega / Ubicación
                  </UiLabel>
                  {settings && settings.bodegas && settings.bodegas.length > 0 ? (
                    <UiSelect
                      value={formData.bodega || "Bodega Central"}
                      onChange={(e) =>
                        setFormData({ ...formData, bodega: e.target.value })
                      }
                      {...mergeThemeProps({"size":"2","className":"w-full"})}
                    >
                      {settings.bodegas.map(wh => (
                        <option key={wh} value={wh} {...{"style":{"color":"var(--gray-12)"}}}>{wh}</option>
                      ))}
                    </UiSelect>
                  ) : (
                    <UiInput
                      type="text"
                      value={formData.bodega || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, bodega: e.target.value })
                      }
                      {...mergeThemeProps({"size":"2","className":"w-full"})}
                      placeholder="Ej. Bodega Central"
                    />
                  )}
                </UiBox>
                <UiBox {...{"className":"col-span-2"}}>
                  <UiLabel
                    {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                  >
                    Código de Barras
                  </UiLabel>
                  <UiInput
                    type="text"
                    value={formData.codigoBarras || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, codigoBarras: e.target.value })
                    }
                    {...mergeThemeProps({"size":"2","className":"w-full"})}
                    placeholder="7501055300075"
                  />
                </UiBox>

                {formData.type === "producto" && (
                  <>
                    <UiBox>
                      <UiLabel
                        {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                      >
                        Stock Inicial
                      </UiLabel>
                      <UiInput
                        type="number"
                        required
                        value={formData.stock}
                        onChange={(e) =>
                          setFormData({ ...formData, stock: e.target.value })
                        }
                        {...mergeThemeProps({"size":"2","className":"w-full"})}
                      />
                    </UiBox>
                    <UiBox>
                      <UiLabel
                        {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-1.5 ml-1"}, {}, (false ? {"color":"gray"} : {"color":"gray"}))}
                      >
                        Stock Mínimo (Alerta)
                      </UiLabel>
                      <UiInput
                        type="number"
                        required
                        value={formData.minStock}
                        onChange={(e) =>
                          setFormData({ ...formData, minStock: e.target.value })
                        }
                        {...mergeThemeProps({"size":"2","className":"w-full"})}
                      />
                    </UiBox>
                  </>
                )}
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-3 mt-8 pt-4"}}>
                <UiButton
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  {...{"variant":"surface","color":"blue"}}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="submit"
                  {...{"variant":"solid","color":"blue"}}
                >
                  Guardar Producto
                </UiButton>
              </UiBox>
            </form>
          </UiCard>
        </UiBox>
      )}
    </UiBox>
  );
}
