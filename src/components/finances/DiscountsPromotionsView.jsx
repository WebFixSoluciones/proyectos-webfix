import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Calendar, Percent, DollarSign, ShieldAlert, CheckCircle, 
  X, HelpCircle, Layers, Tag, ToggleLeft, ToggleRight 
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export default function DiscountsPromotionsView({ db, appId, showToast, products = [] }) {
  const [activeTab, setActiveTab] = useState('discounts'); // 'discounts' | 'promotions'
  const [discounts, setDiscounts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [categories, setCategories] = useState([]);

  // Form Modals States
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [discountForm, setDiscountForm] = useState({
    nombre: '',
    tipo_valor: 'PORCENTAJE',
    valor: 0,
    alcance: 'PRODUCTO',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    requiere_autorizacion: false,
    activo: true
  });

  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({
    nombre: '',
    id_descuento: '',
    alcance_aplicacion: 'PRODUCTO_ESPECIFICO',
    target_id: '', // productId or categoryName
    condicion: 'NINGUNA',
    valor_condicion: 0,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dias_validos: ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"],
    activo: true
  });

  // Listen to Firestore
  useEffect(() => {
    const discCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_discounts');
    const unsubDisc = onSnapshot(discCol, (snap) => {
      setDiscounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const promoCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_promotions');
    const unsubPromo = onSnapshot(promoCol, (snap) => {
      setPromotions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const catCol = collection(db, 'artifacts', appId, 'public', 'data', 'inventory_categories');
    const unsubCat = onSnapshot(catCol, (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubDisc();
      unsubPromo();
      unsubCat();
    };
  }, [db, appId]);

  // Discount Actions
  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    const id = editingDiscount?.id || `disc_${Date.now()}`;
    const payload = {
      id,
      ...discountForm,
      valor: Number(discountForm.valor) || 0
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_discounts', id), payload);
      showToast?.(editingDiscount ? 'Descuento actualizado' : 'Descuento creado', 'success');
      setIsDiscountModalOpen(false);
      setEditingDiscount(null);
    } catch (err) {
      showToast?.('Error al guardar descuento', 'error');
    }
  };

  const handleToggleDiscount = async (disc) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_discounts', disc.id), {
        ...disc,
        activo: !disc.activo
      });
      showToast?.('Estado actualizado', 'success');
    } catch (err) {
      showToast?.('Error al actualizar estado', 'error');
    }
  };

  const handleDeleteDiscount = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este descuento?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_discounts', id));
      showToast?.('Descuento eliminado', 'success');
    } catch (err) {
      showToast?.('Error al eliminar', 'error');
    }
  };

  // Promotion Actions
  const handleSavePromo = async (e) => {
    e.preventDefault();
    const id = editingPromo?.id || `promo_${Date.now()}`;
    const payload = {
      id,
      ...promoForm,
      valor_condicion: promoForm.condicion === 'NINGUNA' ? null : (Number(promoForm.valor_condicion) || 0)
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_promotions', id), payload);
      showToast?.(editingPromo ? 'Promoción actualizada' : 'Promoción creada', 'success');
      setIsPromoModalOpen(false);
      setEditingPromo(null);
    } catch (err) {
      showToast?.('Error al guardar promoción', 'error');
    }
  };

  const handleTogglePromo = async (promo) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_promotions', promo.id), {
        ...promo,
        activo: !promo.activo
      });
      showToast?.('Estado actualizado', 'success');
    } catch (err) {
      showToast?.('Error al actualizar estado', 'error');
    }
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta promoción?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_promotions', id));
      showToast?.('Promoción eliminada', 'success');
    } catch (err) {
      showToast?.('Error al eliminar', 'error');
    }
  };

  const toggleDay = (day) => {
    setPromoForm(prev => {
      const days = prev.dias_validos.includes(day)
        ? prev.dias_validos.filter(d => d !== day)
        : [...prev.dias_validos, day];
      return { ...prev, dias_validos: days };
    });
  };

  const openNewDiscount = () => {
    setDiscountForm({
      nombre: '',
      tipo_valor: 'PORCENTAJE',
      valor: 0,
      alcance: 'PRODUCTO',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      metodo: 'SIEMPRE',
      cantidad_volumen: 1,
      activo_24h: true,
      hora_inicio: '00:00',
      hora_fin: '23:59',
      dias_semana: ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'],
      requiere_autorizacion: false,
      activo: true
    });
    setEditingDiscount(null);
    setIsDiscountModalOpen(true);
  };

  const openEditDiscount = (disc) => {
    setDiscountForm({
      nombre: disc.nombre,
      tipo_valor: disc.tipo_valor,
      valor: disc.valor,
      alcance: disc.alcance,
      fecha_inicio: disc.fecha_inicio,
      fecha_fin: disc.fecha_fin,
      metodo: disc.metodo || 'SIEMPRE',
      cantidad_volumen: disc.cantidad_volumen !== undefined ? disc.cantidad_volumen : 1,
      activo_24h: disc.activo_24h !== undefined ? disc.activo_24h : true,
      hora_inicio: disc.hora_inicio || '00:00',
      hora_fin: disc.hora_fin || '23:59',
      dias_semana: disc.dias_semana || ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'],
      requiere_autorizacion: disc.requiere_autorizacion,
      activo: disc.activo
    });
    setEditingDiscount(disc);
    setIsDiscountModalOpen(true);
  };

  const openNewPromo = () => {
    setPromoForm({
      nombre: '',
      id_descuento: discounts[0]?.id || '',
      alcance_aplicacion: 'PRODUCTO_ESPECIFICO',
      target_id: '',
      condicion: 'NINGUNA',
      valor_condicion: 0,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dias_validos: ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"],
      activo: true
    });
    setEditingPromo(null);
    setIsPromoModalOpen(true);
  };

  const openEditPromo = (promo) => {
    setPromoForm({
      nombre: promo.nombre,
      id_descuento: promo.id_descuento,
      alcance_aplicacion: promo.alcance_aplicacion,
      target_id: promo.target_id || '',
      condicion: promo.condicion,
      valor_condicion: promo.valor_condicion || 0,
      fecha_inicio: promo.fecha_inicio,
      fecha_fin: promo.fecha_fin,
      dias_validos: promo.dias_validos || ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"],
      activo: promo.activo
    });
    setEditingPromo(promo);
    setIsPromoModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER ACTIONS */}
      <div className="flex justify-end gap-2 border-b border-slate-100 pb-4">
        <div className="flex gap-2">
          {activeTab === 'discounts' ? (
            <button onClick={openNewDiscount} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer">
              <Plus size={16} /> Nuevo Descuento
            </button>
          ) : (
            <button onClick={openNewPromo} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer" disabled={discounts.length === 0}>
              <Plus size={16} /> Nueva Promoción
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-100 gap-6">
        <button
          onClick={() => setActiveTab('discounts')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'discounts'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Descuentos Maestros ({discounts.length})
        </button>
        <button
          onClick={() => setActiveTab('promotions')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'promotions'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          Reglas de Promociones ({promotions.length})
        </button>
      </div>

      {/* DISCOUNTS TAB */}
      {activeTab === 'discounts' && (
        <div className="bg-white rounded-2xl border border-[#CDD1EA] overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Alcance</th>
                <th className="py-3 px-4">Tipo Valor</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4">Vigencia</th>
                <th className="py-3 px-4">Autorización</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {discounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">No hay descuentos configurados. Crea uno para comenzar.</td>
                </tr>
              ) : (
                discounts.map(disc => (
                  <tr key={disc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 uppercase">{disc.nombre}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        disc.alcance === 'PRODUCTO' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {disc.alcance}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-500">{disc.tipo_valor === 'PORCENTAJE' ? 'Porcentaje (%)' : (disc.tipo_valor === 'SIN_IVA' ? 'Quitar IVA' : 'Monto Fijo ($)')}</td>
                    <td className="py-3.5 px-4 font-extrabold font-mono text-slate-700">
                      {disc.tipo_valor === 'SIN_IVA' ? 'Sin IVA' : (disc.tipo_valor === 'PORCENTAJE' ? `${disc.valor}%` : `$${disc.valor.toFixed(2)}`)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{disc.fecha_inicio} al {disc.fecha_fin}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {disc.requiere_autorizacion ? (
                        <span className="flex items-center gap-1 text-red-500 font-semibold text-[10px] uppercase">
                          <ShieldAlert size={12} /> Requiere Clave
                        </span>
                      ) : (
                        <span className="text-slate-400">Libre</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button onClick={() => handleToggleDiscount(disc)} className="focus:outline-none cursor-pointer">
                        {disc.activo ? (
                          <ToggleRight size={26} className="text-primary" />
                        ) : (
                          <ToggleLeft size={26} className="text-slate-350" />
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditDiscount(disc)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary transition-colors cursor-pointer" title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteDiscount(disc.id)} className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-650 transition-colors cursor-pointer" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PROMOTIONS TAB */}
      {activeTab === 'promotions' && (
        <div className="bg-white rounded-2xl border border-[#CDD1EA] overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">Nombre Promoción</th>
                <th className="py-3 px-4">Descuento Maestro</th>
                <th className="py-3 px-4">Aplicación</th>
                <th className="py-3 px-4">Condición</th>
                <th className="py-3 px-4">Días Válidos</th>
                <th className="py-3 px-4">Vigencia</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">No hay promociones configuradas.</td>
                </tr>
              ) : (
                promotions.map(promo => {
                  const linkedDisc = discounts.find(d => d.id === promo.id_descuento);
                  return (
                    <tr key={promo.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800 uppercase">{promo.nombre}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-primary">{linkedDisc?.nombre || 'Descuento no encontrado'}</span>
                        <span className="text-[10px] font-mono block text-slate-400">
                          ({linkedDisc?.tipo_valor === 'SIN_IVA' ? 'Sin IVA' : (linkedDisc?.tipo_valor === 'PORCENTAJE' ? `${linkedDisc?.valor}%` : `$${linkedDisc?.valor || 0}`)})
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold uppercase w-fit">
                            {promo.alcance_aplicacion}
                          </span>
                          {promo.target_id && (
                            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[120px]">
                              {promo.alcance_aplicacion === 'PRODUCTO_ESPECIFICO'
                                ? products.find(p => p.id === promo.target_id)?.name
                                : promo.target_id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {promo.condicion === 'NINGUNA' ? (
                          <span className="text-slate-400">Ninguna</span>
                        ) : (
                          <span className="font-semibold text-slate-700">
                            {promo.condicion === 'MONTO_MINIMO' ? `Min. Compra: $${promo.valor_condicion}` : `Min. Cantidad: ${promo.valor_condicion} und.`}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-500 font-medium truncate block max-w-[150px]" title={promo.dias_validos?.join(', ')}>
                          {promo.dias_validos?.join(', ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{promo.fecha_inicio} al {promo.fecha_fin}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button onClick={() => handleTogglePromo(promo)} className="focus:outline-none cursor-pointer">
                          {promo.activo ? (
                            <ToggleRight size={26} className="text-primary" />
                          ) : (
                            <ToggleLeft size={26} className="text-slate-350" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditPromo(promo)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary transition-colors cursor-pointer" title="Editar">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeletePromo(promo.id)} className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-650 transition-colors cursor-pointer" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DISCOUNTS FORM MODAL */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/35 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-[#CDD1EA] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                {editingDiscount ? 'Editar Descuento Maestro' : 'Nuevo Descuento Maestro'}
              </h3>
              <button onClick={() => setIsDiscountModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveDiscount} className="p-5 space-y-4 text-xs font-semibold text-slate-700">
              {/* Nombre */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Nombre del Descuento</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Descuento 15% Clientes VIP"
                  value={discountForm.nombre}
                  onChange={e => setDiscountForm(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Alcance */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Alcance</label>
                  <select
                    value={discountForm.alcance}
                    onChange={e => setDiscountForm(prev => ({ ...prev, alcance: e.target.value }))}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black cursor-pointer font-medium"
                  >
                    <option value="PRODUCTO">Por Producto (Ítem)</option>
                    <option value="VENTA">Por Venta (Total)</option>
                  </select>
                </div>

                {/* Tipo de Valor */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Tipo de Valor</label>
                  <select
                    value={discountForm.tipo_valor}
                    onChange={e => {
                      const valType = e.target.value;
                      setDiscountForm(prev => ({
                        ...prev,
                        tipo_valor: valType,
                        valor: valType === 'SIN_IVA' ? 0 : prev.valor
                      }));
                    }}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black cursor-pointer font-medium"
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="MONTO_FIJO">Monto Fijo ($)</option>
                    <option value="SIN_IVA">Quitar IVA (Vender sin IVA)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Valor */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Valor Descuento</label>
                  <input
                    type="number"
                    required={discountForm.tipo_valor !== 'SIN_IVA'}
                    disabled={discountForm.tipo_valor === 'SIN_IVA'}
                    min="0"
                    step="0.01"
                    placeholder={discountForm.tipo_valor === 'SIN_IVA' ? "Autocalculado" : "0.00"}
                    value={discountForm.tipo_valor === 'SIN_IVA' ? '0' : (discountForm.valor || '')}
                    onChange={e => setDiscountForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                    className={`w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium font-mono ${
                      discountForm.tipo_valor === 'SIN_IVA' ? 'bg-slate-100 text-slate-450' : ''
                    }`}
                  />
                </div>

                {/* Requiere autorización */}
                <div className="flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={discountForm.requiere_autorizacion}
                      onChange={e => setDiscountForm(prev => ({ ...prev, requiere_autorizacion: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700">Requiere clave de supervisor</span>
                  </label>
                </div>
              </div>

              {/* Método de Aplicación y Cantidad Volumen */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Método de Aplicación</label>
                  <select
                    value={discountForm.metodo || 'SIEMPRE'}
                    onChange={e => setDiscountForm(prev => ({ ...prev, metodo: e.target.value }))}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black cursor-pointer font-medium"
                  >
                    <option value="SIEMPRE">Siempre (Sin cantidad mínima)</option>
                    <option value="POR_CADA">Por cada (Escalonado)</option>
                    <option value="A_PARTIR_DE">A partir de (Volumen mínimo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">
                    {discountForm.metodo === 'POR_CADA' ? 'Cada X Unidades' : 'Cantidad Mínima'}
                  </label>
                  <input
                    type="number"
                    required={discountForm.metodo !== 'SIEMPRE'}
                    disabled={discountForm.metodo === 'SIEMPRE'}
                    min="1"
                    placeholder={discountForm.metodo === 'SIEMPRE' ? "N/A" : "Ej. 5"}
                    value={discountForm.metodo === 'SIEMPRE' ? '' : (discountForm.cantidad_volumen || '')}
                    onChange={e => setDiscountForm(prev => ({ ...prev, cantidad_volumen: parseInt(e.target.value) || 1 }))}
                    className={`w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium font-mono ${
                      discountForm.metodo === 'SIEMPRE' ? 'bg-slate-100 text-slate-400' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                {/* Fecha Inicio */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={discountForm.fecha_inicio}
                    onChange={e => setDiscountForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium"
                  />
                </div>

                {/* Fecha Fin */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={discountForm.fecha_fin}
                    onChange={e => setDiscountForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium"
                  />
                </div>
              </div>

              {/* Disponibilidad Horaria y Días de la Semana */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Disponibilidad Horaria</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={discountForm.activo_24h ?? true}
                      onChange={e => setDiscountForm(prev => ({ ...prev, activo_24h: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700">Activo las 24 horas</span>
                  </label>
                </div>

                {!(discountForm.activo_24h ?? true) && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Hora Inicio</label>
                      <input
                        type="time"
                        required
                        value={discountForm.hora_inicio || '00:00'}
                        onChange={e => setDiscountForm(prev => ({ ...prev, hora_inicio: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Hora Fin</label>
                      <input
                        type="time"
                        required
                        value={discountForm.hora_fin || '23:59'}
                        onChange={e => setDiscountForm(prev => ({ ...prev, hora_fin: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Días de la Semana */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-2">Días Activos de la Semana</label>
                  <div className="flex flex-wrap gap-2">
                    {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(day => {
                      const list = discountForm.dias_semana || ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
                      const isChecked = list.includes(day);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => {
                            const updated = isChecked
                              ? list.filter(d => d !== day)
                              : [...list, day];
                            setDiscountForm(prev => ({ ...prev, dias_semana: updated }));
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-white border-slate-200 text-slate-550 hover:bg-slate-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsDiscountModalOpen(false)} className="btn-secondary px-4 py-2 font-bold rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="btn-primary px-4 py-2 font-bold text-white rounded-xl cursor-pointer">Guardar Descuento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMO FORM MODAL */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/35 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-[#CDD1EA] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                {editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}
              </h3>
              <button onClick={() => setIsPromoModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePromo} className="p-5 space-y-4 text-xs font-semibold text-slate-700">
              {/* Nombre */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Nombre de la Promoción</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Descuento Lunes de Frutas"
                  value={promoForm.nombre}
                  onChange={e => setPromoForm(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Descuento Asociado */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Descuento Asociado</label>
                  <select
                    value={promoForm.id_descuento}
                    required
                    onChange={e => setPromoForm(prev => ({ ...prev, id_descuento: e.target.value }))}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black cursor-pointer font-medium"
                  >
                    {discounts.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre} ({d.tipo_valor === 'SIN_IVA' ? 'Sin IVA' : (d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : `$${d.valor}`)})</option>
                    ))}
                  </select>
                </div>

                {/* Alcance de aplicación */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Alcance de Aplicación</label>
                  <select
                    value={promoForm.alcance_aplicacion}
                    onChange={e => setPromoForm(prev => ({ ...prev, alcance_aplicacion: e.target.value, target_id: '' }))}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black cursor-pointer font-medium"
                  >
                    <option value="PRODUCTO_ESPECIFICO">Producto Específico</option>
                    <option value="CATEGORIA">Categoría Específica</option>
                    <option value="VENTA_TOTAL">Venta Total</option>
                  </select>
                </div>
              </div>

              {/* Target ID Selector (Product or Category) */}
              {promoForm.alcance_aplicacion !== 'VENTA_TOTAL' && (
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">
                    {promoForm.alcance_aplicacion === 'PRODUCTO_ESPECIFICO' ? 'Seleccionar Producto' : 'Seleccionar Categoría'}
                  </label>
                  <select
                    value={promoForm.target_id}
                    required
                    onChange={e => setPromoForm(prev => ({ ...prev, target_id: e.target.value }))}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black cursor-pointer font-medium"
                  >
                    <option value="">-- Seleccionar --</option>
                    {promoForm.alcance_aplicacion === 'PRODUCTO_ESPECIFICO'
                      ? products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)
                      : categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                    }
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                {/* Condición */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Condición</label>
                  <select
                    value={promoForm.condicion}
                    onChange={e => setPromoForm(prev => ({ ...prev, condicion: e.target.value, valor_condicion: 0 }))}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black cursor-pointer font-medium"
                  >
                    <option value="NINGUNA">Ninguna (Siempre se aplica)</option>
                    <option value="MONTO_MINIMO">Monto de Venta Mínimo ($)</option>
                    <option value="CANTIDAD_MINIMA">Cantidad de Ítems Mínima</option>
                  </select>
                </div>

                {/* Valor Condición */}
                {promoForm.condicion !== 'NINGUNA' && (
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Valor Condición</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={promoForm.valor_condicion || ''}
                      onChange={e => setPromoForm(prev => ({ ...prev, valor_condicion: parseFloat(e.target.value) || 0 }))}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Días válidos */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Días Válidos de la Semana</label>
                <div className="flex flex-wrap gap-1.5">
                  {["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"].map(day => {
                    const isSel = promoForm.dias_validos.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider transition-colors cursor-pointer border ${
                          isSel
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                {/* Fecha Inicio */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={promoForm.fecha_inicio}
                    onChange={e => setPromoForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium"
                  />
                </div>

                {/* Fecha Fin */}
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={promoForm.fecha_fin}
                    onChange={e => setPromoForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary text-black font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsPromoModalOpen(false)} className="btn-secondary px-4 py-2 font-bold rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="btn-primary px-4 py-2 font-bold text-white rounded-xl cursor-pointer">Guardar Promoción</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
