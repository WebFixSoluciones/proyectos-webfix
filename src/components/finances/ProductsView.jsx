import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export default function ProductsView({ isDarkMode, showToast, db, appId }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    sku: '',
    description: '',
    price: 0,
    cost: 0,
    ivaCategory: 15,
    stock: 0,
    minStock: 5,
    type: 'producto', // 'producto' o 'servicio'
    marca: '',
    categoria: '',
    bodega: 'Bodega Central',
    codigoBarras: ''
  });

  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_products');
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
        stock: formData.type === 'servicio' ? 0 : (parseInt(formData.stock) || 0),
        minStock: formData.type === 'servicio' ? 0 : (parseInt(formData.minStock) || 0),
        type: formData.type,
        marca: formData.marca || '',
        categoria: formData.categoria || '',
        bodega: formData.bodega || 'Bodega Central',
        codigoBarras: formData.codigoBarras || '',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', docId), finalProduct);
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
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_products', id));
        showToast("Producto eliminado", "success");
      } catch (err) {
        showToast("Error al eliminar", "error");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      sku: '',
      description: '',
      price: 0,
      cost: 0,
      ivaCategory: 15,
      stock: 0,
      minStock: 5,
      type: 'producto',
      marca: '',
      categoria: '',
      bodega: 'Bodega Central',
      codigoBarras: ''
    });
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/20 border-white/10 text-white focus:border-blue-500/50' 
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/35'
  }`;

  return (
    <div className="space-y-6">
      
      {/* HEADER ACCIONES */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-80 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-350'}`}>
            <Search size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-600'} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-gray-900"
            />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`px-2.5 py-2 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-black/20 border-white/10 text-gray-300' : 'bg-white border-gray-350 text-gray-800 font-medium'}`}>
            <option value="all" className="text-black">Todos los tipos</option>
            <option value="producto" className="text-black">Productos físicos</option>
            <option value="servicio" className="text-black">Servicios / Horas</option>
          </select>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          <Plus size={14} /> Registrar Producto
        </button>
      </div>

      {/* TABLA CATÁLOGO */}
      <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-350 bg-white shadow-sm'}`}>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? 'bg-black/40 text-gray-400' : 'bg-gray-100 text-gray-800 border-b border-gray-300'}`}>
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
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-300/60'}`}>
                {filtered.map(p => {
                  const isLow = p.type === 'producto' && p.stock <= p.minStock;
                  const isOut = p.type === 'producto' && p.stock === 0;

                  return (
                    <tr key={p.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100/40'}`}>
                      <td className={`px-6 py-4 font-mono text-[10px] ${isDarkMode ? '' : 'text-gray-900 font-bold'}`}>{p.sku}</td>
                      <td className={`px-6 py-4 font-medium truncate max-w-[220px] ${isDarkMode ? '' : 'text-gray-950 font-bold'}`}>
                        <div className="font-bold text-xs">{p.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1 text-[8px] font-bold uppercase tracking-wider text-gray-500">
                          {p.marca && <span className="bg-gray-500/10 px-1 py-0.5 rounded">Marca: {p.marca}</span>}
                          {p.categoria && <span className="bg-gray-500/10 px-1 py-0.5 rounded">Cat: {p.categoria}</span>}
                          {p.bodega && <span className="bg-blue-500/10 text-blue-500 px-1 py-0.5 rounded">Bodega: {p.bodega}</span>}
                        </div>
                        {p.description && <p className="text-[9px] text-gray-500 font-normal truncate mt-0.5" title={p.description}>{p.description}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${p.type === 'producto' ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-800 border border-blue-200') : (isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-800 border border-purple-200')}`}>
                          {p.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${isDarkMode ? '' : 'text-gray-700'}`}>${Number(p.cost || 0).toFixed(2)}</td>
                      <td className={`px-6 py-4 text-right font-black ${isDarkMode ? '' : 'text-gray-950'}`}>${Number(p.price || 0).toFixed(2)}</td>
                      <td className={`px-6 py-4 ${isDarkMode ? '' : 'text-gray-900 font-medium'}`}>{p.ivaCategory}%</td>
                      <td className="px-6 py-4 text-center">
                        {p.type === 'servicio' ? (
                          <span className="text-gray-400 italic font-medium">N/A</span>
                        ) : isOut ? (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-100 text-red-800 border-red-300 animate-pulse'}`}>Sin Stock</span>
                        ) : isLow ? (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[80px] ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-850 border-orange-300'}`}>
                            <AlertTriangle size={10}/> {p.stock}
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                            {p.stock}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => { setFormData(p); setIsModalOpen(true); }} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-blue-500/20 text-blue-500' : 'hover:bg-blue-100 text-blue-700 border border-blue-200'}`}><Edit2 size={13}/></button>
                          <button onClick={() => handleDelete(p.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-red-500' : 'hover:bg-red-100 text-red-600 border border-red-200'}`}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500 italic">No se encontraron productos o servicios en el catálogo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#151517] border border-white/10' : 'bg-white border border-gray-300'}`}>
            <h2 className="text-base font-bold mb-5">{formData.id ? 'Editar' : 'Registrar'} Producto o Servicio</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Nombre del Ítem</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="Ej. Laptop Dell Latitude 5420" />
                </div>
                
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Código SKU / Código</label>
                  <input type="text" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className={inputClass} placeholder="LPT-DELL-5420" />
                </div>
                
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Tipo de Ítem</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={inputClass}>
                    <option value="producto" className="text-black">Producto Físico</option>
                    <option value="servicio" className="text-black">Servicio / Horas</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Descripción</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} min-h-[60px]`} placeholder="Especificaciones, modelo o detalles..." />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Costo Adquisición</label>
                  <input type="number" step="0.01" required value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className={inputClass} />
                </div>
                
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Precio Venta (P.V.P)</label>
                  <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className={inputClass} />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Tarifa IVA</label>
                  <select value={formData.ivaCategory} onChange={e => setFormData({...formData, ivaCategory: e.target.value})} className={inputClass}>
                    <option value="15" className="text-black">15% IVA</option>
                    <option value="12" className="text-black">12% IVA</option>
                    <option value="0" className="text-black">0% IVA</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Marca</label>
                  <input type="text" value={formData.marca || ''} onChange={e => setFormData({...formData, marca: e.target.value})} className={inputClass} placeholder="Ej. Dell, Samsung" />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Categoría</label>
                  <input type="text" value={formData.categoria || ''} onChange={e => setFormData({...formData, categoria: e.target.value})} className={inputClass} placeholder="Ej. Laptops, Monitores" />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Bodega / Ubicación</label>
                  <input type="text" value={formData.bodega || ''} onChange={e => setFormData({...formData, bodega: e.target.value})} className={inputClass} placeholder="Ej. Bodega Central" />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Código de Barras</label>
                  <input type="text" value={formData.codigoBarras || ''} onChange={e => setFormData({...formData, codigoBarras: e.target.value})} className={inputClass} placeholder="7501055300075" />
                </div>

                {formData.type === 'producto' && (
                  <>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Stock Inicial</label>
                      <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Stock Mínimo (Alerta)</label>
                      <input type="number" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} className={inputClass} />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}>Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-transform hover:-translate-y-0.5">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
