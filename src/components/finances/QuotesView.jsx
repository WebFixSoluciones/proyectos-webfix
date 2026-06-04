import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, FileText, CheckCircle2, ChevronRight, AlertCircle, ShoppingBag, Eye } from 'lucide-react';
import { collection, onSnapshot, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import RidePreviewModal from './RidePreviewModal';

export default function QuotesView({ products, thirdParties, isDarkMode, showToast, db, appId, onPromoteToInvoice }) {
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [companyConfig, setCompanyConfig] = useState(null);
  const [selectedQuoteTx, setSelectedQuoteTx] = useState(null);

  useEffect(() => {
    if (!appId || !db) return;
    async function loadCompanyConfig() {
      try {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config'));
        if (snap.exists()) {
          const data = snap.data();
          setCompanyConfig(data);
          if (!data.logoUrl || !data.ruc || !data.razonSocial) {
            setIsBlocked(true);
          } else {
            setIsBlocked(false);
          }
        } else {
          setIsBlocked(true);
        }
      } catch (err) {
        console.error(err);
        setIsBlocked(true);
      }
    }
    loadCompanyConfig();
  }, [appId, db]);
  
  // Datos del formulario de Cotización
  const [formData, setFormData] = useState({
    id: '',
    quoteNumber: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: '',
    thirdPartyId: '',
    items: [],
    subtotal: 0,
    ivaValor: 0,
    total: 0,
    status: 'borrador' // 'borrador', 'enviado', 'facturado', 'vencido'
  });

  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_quotes');
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar por fecha descendente
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setQuotes(data);
      setLoading(false);
    });
    return unsub;
  }, [appId, db]);

  // Generar número de cotización consecutivo
  useEffect(() => {
    if (!formData.id && isModalOpen) {
      const nextNum = quotes.length + 1;
      setFormData(prev => ({
        ...prev,
        quoteNumber: `COT-${String(nextNum).padStart(6, '0')}`,
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 15 días validez por defecto
      }));
    }
  }, [isModalOpen, quotes, formData.id]);

  // Recalcular totales al cambiar los ítems
  useEffect(() => {
    let sub = 0;
    let iva = 0;
    formData.items.forEach(item => {
      const lineSub = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
      const lineIva = lineSub * ((parseInt(item.ivaCategory) || 15) / 100);
      sub += lineSub;
      iva += lineIva;
    });

    setFormData(prev => ({
      ...prev,
      subtotal: sub.toFixed(2),
      ivaValor: iva.toFixed(2),
      total: (sub + iva).toFixed(2)
    }));
  }, [formData.items]);

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: '', name: '', price: 0, quantity: 1, ivaCategory: 15 }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updatedItems[index] = {
          ...updatedItems[index],
          productId: value,
          name: prod.name,
          price: prod.price,
          ivaCategory: prod.ivaCategory
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.thirdPartyId) {
      showToast("Selecciona un cliente", "error");
      return;
    }
    if (formData.items.length === 0) {
      showToast("Agrega al menos un ítem a la cotización", "error");
      return;
    }

    try {
      const docId = formData.id || `quote_${new Date().getTime()}`;
      const finalQuote = {
        ...formData,
        id: docId,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_quotes', docId), finalQuote);
      showToast("Cotización guardada con éxito", "success");
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      showToast("Error al guardar cotización", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta cotización?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_quotes', id));
        showToast("Cotización eliminada", "success");
      } catch (err) {
        showToast("Error al eliminar", "error");
      }
    }
  };

  const handlePromote = async (quote) => {
    try {
      // 1. Llamar al callback que abre TransactionForm prellenado
      onPromoteToInvoice(quote);
      
      // 2. Cambiar estado de cotización a 'facturado' en Firestore
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_quotes', quote.id), {
        status: 'facturado'
      }, { merge: true });
      
    } catch (err) {
      console.error(err);
      showToast("Error al promover cotización", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      quoteNumber: '',
      date: new Date().toISOString().split('T')[0],
      validUntil: '',
      thirdPartyId: '',
      items: [],
      subtotal: 0,
      ivaValor: 0,
      total: 0,
      status: 'borrador'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'facturado': 
        return <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold uppercase">Facturado</span>;
      case 'enviado': 
        return <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-500 font-bold uppercase">Enviado</span>;
      case 'vencido': 
        return <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/20 text-red-500 font-bold uppercase">Vencido</span>;
      default: 
        return <span className="text-[9px] px-2 py-0.5 rounded bg-gray-550/20 text-gray-500 font-bold uppercase">Borrador</span>;
    }
  };

  const filtered = quotes.filter(q => {
    const matchedTpName = thirdParties.find(tp => tp.id === q.thirdPartyId)?.name || '';
    return q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
           matchedTpName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/25 border-white/10 text-white focus:border-blue-500/50' 
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/35'
  }`;

  return (
    <div className="space-y-6">
      
      {/* ALERTA DE BLOQUEO POR CONFIGURACIÓN DE EMPRESA */}
      {isBlocked && (
        <div className="p-5 rounded-2xl border border-dashed border-red-500/30 bg-red-500/10 text-red-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Emisión de Cotizaciones Bloqueada</p>
              <p className="opacity-90 mt-0.5">Normativa Comercial: No se pueden emitir proformas sin configurar la Razón Social, RUC y el **Logo Corporativo** de la empresa.</p>
            </div>
          </div>
          <span className="text-[9px] px-2.5 py-1 rounded bg-red-500 text-white font-black uppercase tracking-wider shrink-0">Configuración Requerida</span>
        </div>
      )}

      {/* HEADER ACCIONES */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-80 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-355'}`}>
          <Search size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-605'} />
          <input 
            type="text" 
            placeholder="Buscar por número o cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-gray-900"
            disabled={isBlocked}
          />
        </div>
        
        <button 
          onClick={() => { 
            if (isBlocked) {
              showToast("Completa la Razón Social, RUC y Logo en Configuración primero", "error");
              return;
            }
            resetForm(); 
            setIsModalOpen(true); 
          }}
          disabled={isBlocked}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
            isBlocked 
              ? 'bg-gray-450/20 text-gray-500 border border-white/5 cursor-not-allowed opacity-50' 
              : (isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500 hover:-translate-y-0.5' : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5')
          }`}
        >
          <Plus size={14} /> Nueva Cotización
        </button>
      </div>

      {/* TABLA COTIZACIONES */}
      <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-355 bg-white shadow-sm'}`}>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? 'bg-black/40 text-gray-400' : 'bg-blue-50/50 text-[#000000] border-b border-blue-100'}`}>
                <tr>
                  <th className="px-6 py-4">Cotización</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Validez</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4 text-right">Items</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-300/60'}`}>
                {filtered.map(q => {
                  const client = thirdParties.find(tp => tp.id === q.thirdPartyId);
                  return (
                    <tr key={q.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100/40'}`}>
                      <td className={`px-6 py-4 font-mono text-[10px] ${isDarkMode ? '' : 'text-black font-extrabold'}`}>{q.quoteNumber}</td>
                      <td className="px-6 py-4">{q.date}</td>
                      <td className="px-6 py-4">{q.validUntil || '-'}</td>
                      <td className={`px-6 py-4 font-bold truncate max-w-[200px] ${isDarkMode ? '' : 'text-black'}`} title={client?.name}>
                        {client?.name || 'Desconocido'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{q.items?.length || 0}</td>
                      <td className={`px-6 py-4 text-right font-black ${isDarkMode ? '' : 'text-black'}`}>${Number(q.total || 0).toFixed(2)}</td>
                      <td className="px-6 py-4">{getStatusBadge(q.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {q.status !== 'facturado' && (
                            <button 
                              onClick={() => handlePromote(q)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-sm shrink-0`}
                              title="Promover a Factura SRI"
                            >
                              <ShoppingBag size={10} /> Facturar
                            </button>
                          )}
                          <button 
                            onClick={() => setSelectedQuoteTx({ ...q, documentType: 'cotizacion', documentNumber: q.quoteNumber, baseImponible: q.subtotal, ivaValor: q.ivaValor, total: q.total })} 
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-orange-500/20 text-orange-400' : 'hover:bg-orange-150 text-orange-700 border border-orange-200'}`}
                            title="Ver RIDE Proforma / Imprimir"
                          >
                            <Eye size={13}/>
                          </button>
                          <button onClick={() => { setFormData(q); setIsModalOpen(true); }} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-blue-500/20 text-blue-500' : 'hover:bg-blue-100 text-blue-700 border border-blue-200'}`}><Edit2 size={13}/></button>
                          <button onClick={() => handleDelete(q.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-red-500' : 'hover:bg-red-100 text-red-600 border border-red-200'}`}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500 italic">No se encontraron cotizaciones registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR COTIZACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-3xl p-6 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar ${isDarkMode ? 'bg-[#151517] border border-white/10' : 'bg-white border border-gray-300'}`}>
            <h2 className="text-base font-bold mb-4">{formData.id ? 'Editar' : 'Crear'} Cotización</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Número</label>
                  <input type="text" readOnly value={formData.quoteNumber} className={`${inputClass} opacity-60 font-mono`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Fecha Emisión</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Fecha Vencimiento</label>
                  <input type="date" required value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} className={inputClass} />
                </div>
                <div className="md:col-span-3">
                  <label className={`block text-xs font-semibold mb-1 uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Cliente / Tercero</label>
                  <select required value={formData.thirdPartyId} onChange={e => setFormData({...formData, thirdPartyId: e.target.value})} className={inputClass}>
                    <option value="" disabled className="text-gray-400">Selecciona un cliente...</option>
                    {thirdParties.map(tp => (
                      <option key={tp.id} value={tp.id} className="text-black">{tp.name} - RUC: {tp.ruc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TABLA DE PRODUCTOS (FILAS) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase">Detalle de Productos / Servicios</h4>
                  <button type="button" onClick={handleAddItem} className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase flex items-center gap-1">
                    <Plus size={10} /> Agregar Ítem
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-center gap-2 bg-black/10 p-3 rounded-xl border border-white/5">
                      <div className="flex-1 w-full">
                        <select 
                          required 
                          value={item.productId} 
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)} 
                          className={inputClass}
                        >
                          <option value="" disabled className="text-gray-400">Seleccionar Producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} className="text-black">{p.sku} - {p.name} (${p.price})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-full sm:w-20">
                        <input 
                          type="number" 
                          placeholder="Cant." 
                          required 
                          min={1} 
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                          className={inputClass} 
                        />
                      </div>
                      
                      <div className="w-full sm:w-28">
                        <input 
                          type="number" 
                          step="0.01" 
                          placeholder="Precio" 
                          required 
                          value={item.price} 
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                          className={inputClass} 
                        />
                      </div>

                      <div className="text-xs font-bold w-full sm:w-20 text-center shrink-0">
                        ${((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}
                      </div>

                      <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 rounded-lg bg-red-600/20 text-red-500 hover:bg-red-600/30">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <p className="text-center text-[10px] text-gray-500 italic py-4">No has agregado ningún producto a la cotización.</p>
                  )}
                </div>
              </div>

              {/* TOTALES */}
              <div className={`p-4 rounded-xl flex justify-between items-center ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' : 'bg-blue-50 text-blue-950 border border-blue-300'}`}>
                <div className="text-[10px] leading-relaxed">
                  <p>Subtotal Neto: ${formData.subtotal}</p>
                  <p>IVA Estimado: ${formData.ivaValor}</p>
                </div>
                <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-950'}`}>Total: ${formData.total}</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}>Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-md">Guardar Cotización</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {selectedQuoteTx && (
        <RidePreviewModal 
          tx={selectedQuoteTx} 
          onClose={() => setSelectedQuoteTx(null)} 
          thirdParties={thirdParties} 
          isDarkMode={isDarkMode} 
          db={db} 
          appId={appId} 
        />
      )}

    </div>
  );
}
