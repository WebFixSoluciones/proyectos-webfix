import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiInput, UiSelect } from '../ui/controls';
import { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Calendar, ShieldAlert, 
  X, ToggleLeft, ToggleRight 
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from '../../services/financeStore.js';

export default function DiscountsPromotionsView({ db, appId, showToast, products = [] }) {
  const [activeTab, setActiveTab] = useState('discounts'); // 'discounts' | 'promotions'
  const [discounts, setDiscounts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [categories, setCategories] = useState([]);

  // Form Modals States
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [discountForm, setDiscountForm] = useState(() => ({
    nombre: '',
    tipo_valor: 'PORCENTAJE',
    valor: 0,
    alcance: 'PRODUCTO',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    requiere_autorizacion: false,
    activo: true
  }));

  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState(() => ({
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
  }));

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
      } catch {
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
    } catch {
      showToast?.('Error al actualizar estado', 'error');
    }
  };

  const handleDeleteDiscount = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este descuento?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_discounts', id));
      showToast?.('Descuento eliminado', 'success');
    } catch {
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
    } catch {
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
    } catch {
      showToast?.('Error al actualizar estado', 'error');
    }
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta promoción?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_promotions', id));
      showToast?.('Promoción eliminada', 'success');
    } catch {
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
    <UiBox {...{"className":"space-y-6 animate-in fade-in duration-300"}}>
      
      {/* HEADER ACTIONS */}
      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-start gap-2 pb-4"}}>
        <UiBox {...{"className":"flex gap-2"}}>
          {activeTab === 'discounts' ? (
            <UiButton onClick={openNewDiscount} {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1.5 cursor-pointer"}}>
              <Plus size={16} /> Nuevo Descuento
            </UiButton>
          ) : (
            <UiButton onClick={openNewPromo} {...{"variant":"solid","color":"blue","size":"2","className":"flex items-center gap-1.5 cursor-pointer"}} disabled={discounts.length === 0}>
              <Plus size={16} /> Nueva Promoción
            </UiButton>
          )}
        </UiBox>
      </UiBox>

      {/* TABS */}
      <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex gap-6"}}>
        <UiButton
          onClick={() => setActiveTab('discounts')}
          {...mergeThemeProps({"size":"2","className":"cursor-pointer"}, {}, (activeTab === 'discounts' ? {"color":"blue"} : {"color":"gray"}))}
        >
          Descuentos Maestros ({discounts.length})
        </UiButton>
        <UiButton
          onClick={() => setActiveTab('promotions')}
          {...mergeThemeProps({"size":"2","className":"cursor-pointer"}, {}, (activeTab === 'promotions' ? {"color":"blue"} : {"color":"gray"}))}
        >
          Reglas de Promociones ({promotions.length})
        </UiButton>
      </UiBox>

      {/* DISCOUNTS TAB */}
      {activeTab === 'discounts' && (
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"overflow-hidden"}}>
          <UiTable {...{"className":"w-full text-left"}}>
            <UiTableHeader>
              <UiTableRow {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-11)"}}}>
                <UiTableHead {...{"className":"py-3 px-4"}}>Nombre</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Alcance</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Tipo Valor</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Valor</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Vigencia</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Autorización</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4 text-center"}}>Estado</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4 text-right"}}>Acciones</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody {...{}}>
              {discounts.length === 0 ? (
                <UiTableRow>
                  <UiTableCell colSpan={8} {...{"style":{"color":"var(--gray-11)"},"className":"py-8 text-center italic"}}>No hay descuentos configurados. Crea uno para comenzar.</UiTableCell>
                </UiTableRow>
              ) : (
                discounts.map(disc => (
                  <UiTableRow key={disc.id} {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"py-3.5 px-4"}}>{disc.nombre}</UiTableCell>
                    <UiTableCell {...{"className":"py-3.5 px-4"}}>
                      <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"px-2.5 py-0.5"}, {}, (disc.alcance === 'PRODUCTO' ? {"color":"indigo"} : {"color":"green"}))}>
                        {disc.alcance}
                      </UiText>
                    </UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"py-3.5 px-4"}}>{disc.tipo_valor === 'PORCENTAJE' ? 'Porcentaje (%)' : (disc.tipo_valor === 'SIN_IVA' ? 'Quitar IVA' : 'Monto Fijo ($)')}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"py-3.5 px-4"}}>
                      {disc.tipo_valor === 'SIN_IVA' ? 'Sin IVA' : (disc.tipo_valor === 'PORCENTAJE' ? `${disc.valor}%` : `$${disc.valor.toFixed(2)}`)}
                    </UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"py-3.5 px-4"}}>
                      <UiBox {...{"className":"flex items-center gap-1"}}>
                        <Calendar size={12} />
                        <UiText>{disc.fecha_inicio} al {disc.fecha_fin}</UiText>
                      </UiBox>
                    </UiTableCell>
                    <UiTableCell {...{"className":"py-3.5 px-4"}}>
                      {disc.requiere_autorizacion ? (
                        <UiText {...{"color":"red","weight":"bold","size":"1","className":"flex items-center gap-1"}}>
                          <ShieldAlert size={12} /> Requiere Clave
                        </UiText>
                      ) : (
                        <UiText {...{"color":"gray"}}>Libre</UiText>
                      )}
                    </UiTableCell>
                    <UiTableCell {...{"className":"py-3.5 px-4 text-center"}}>
                      <UiButton onClick={() => handleToggleDiscount(disc)} {...{"className":"cursor-pointer"}}>
                        {disc.activo ? (
                          <ToggleRight size={26} {...{"style":{"color":"var(--blue-12)"}}} />
                        ) : (
                          <ToggleLeft size={26} {...{"style":{"color":"var(--gray-12)"}}} />
                        )}
                      </UiButton>
                    </UiTableCell>
                    <UiTableCell {...{"className":"py-3.5 px-4 text-right"}}>
                      <UiBox {...{"className":"flex justify-end gap-2"}}>
                        <UiButton iconOnly onClick={() => openEditDiscount(disc)} {...{"color":"gray","className":"cursor-pointer"}} title="Editar">
                          <Edit2 size={14} />
                        </UiButton>
                        <UiButton iconOnly onClick={() => handleDeleteDiscount(disc.id)} {...{"color":"gray","className":"cursor-pointer"}} title="Eliminar">
                          <Trash2 size={14} />
                        </UiButton>
                      </UiBox>
                    </UiTableCell>
                  </UiTableRow>
                ))
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      )}

      {/* PROMOTIONS TAB */}
      {activeTab === 'promotions' && (
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"overflow-hidden"}}>
          <UiTable {...{"className":"w-full text-left"}}>
            <UiTableHeader>
              <UiTableRow {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-11)"}}}>
                <UiTableHead {...{"className":"py-3 px-4"}}>Nombre Promoción</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Descuento Maestro</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Aplicación</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Condición</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Días Válidos</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4"}}>Vigencia</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4 text-center"}}>Estado</UiTableHead>
                <UiTableHead {...{"className":"py-3 px-4 text-right"}}>Acciones</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody {...{}}>
              {promotions.length === 0 ? (
                <UiTableRow>
                  <UiTableCell colSpan={8} {...{"style":{"color":"var(--gray-11)"},"className":"py-8 text-center italic"}}>No hay promociones configuradas.</UiTableCell>
                </UiTableRow>
              ) : (
                promotions.map(promo => {
                  const linkedDisc = discounts.find(d => d.id === promo.id_descuento);
                  return (
                    <UiTableRow key={promo.id} {...{}}>
                      <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"py-3.5 px-4"}}>{promo.nombre}</UiTableCell>
                      <UiTableCell {...{"className":"py-3.5 px-4"}}>
                        <UiText {...{"weight":"bold","color":"blue"}}>{linkedDisc?.nombre || 'Descuento no encontrado'}</UiText>
                        <UiText {...{"size":"1","weight":"regular","color":"gray","className":"block"}}>
                          ({linkedDisc?.tipo_valor === 'SIN_IVA' ? 'Sin IVA' : (linkedDisc?.tipo_valor === 'PORCENTAJE' ? `${linkedDisc?.valor}%` : `$${linkedDisc?.valor || 0}`)})
                        </UiText>
                      </UiTableCell>
                      <UiTableCell {...{"className":"py-3.5 px-4"}}>
                        <UiBox {...{"className":"flex flex-col gap-0.5"}}>
                          <UiText {...{"color":"blue","size":"1","weight":"bold","className":"px-2 py-0.5 w-fit"}}>
                            {promo.alcance_aplicacion}
                          </UiText>
                          {promo.target_id && (
                            <UiText {...{"size":"1","weight":"medium","color":"gray","className":"truncate max-w-[120px]"}}>
                              {promo.alcance_aplicacion === 'PRODUCTO_ESPECIFICO'
                                ? products.find(p => p.id === promo.target_id)?.name
                                : promo.target_id}
                            </UiText>
                          )}
                        </UiBox>
                      </UiTableCell>
                      <UiTableCell {...{"className":"py-3.5 px-4"}}>
                        {promo.condicion === 'NINGUNA' ? (
                          <UiText {...{"color":"gray"}}>Ninguna</UiText>
                        ) : (
                          <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>
                            {promo.condicion === 'MONTO_MINIMO' ? `Min. Compra: $${promo.valor_condicion}` : `Min. Cantidad: ${promo.valor_condicion} und.`}
                          </UiText>
                        )}
                      </UiTableCell>
                      <UiTableCell {...{"className":"py-3.5 px-4"}}>
                        <UiText {...{"color":"gray","weight":"medium","className":"truncate block max-w-[150px]"}} title={promo.dias_validos?.join(', ')}>
                          {promo.dias_validos?.join(', ')}
                        </UiText>
                      </UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"py-3.5 px-4"}}>
                        <UiBox {...{"className":"flex items-center gap-1"}}>
                          <Calendar size={12} />
                          <UiText>{promo.fecha_inicio} al {promo.fecha_fin}</UiText>
                        </UiBox>
                      </UiTableCell>
                      <UiTableCell {...{"className":"py-3.5 px-4 text-center"}}>
                        <UiButton onClick={() => handleTogglePromo(promo)} {...{"className":"cursor-pointer"}}>
                          {promo.activo ? (
                            <ToggleRight size={26} {...{"style":{"color":"var(--blue-12)"}}} />
                          ) : (
                            <ToggleLeft size={26} {...{"style":{"color":"var(--gray-12)"}}} />
                          )}
                        </UiButton>
                      </UiTableCell>
                      <UiTableCell {...{"className":"py-3.5 px-4 text-right"}}>
                        <UiBox {...{"className":"flex justify-end gap-2"}}>
                          <UiButton iconOnly onClick={() => openEditPromo(promo)} {...{"color":"gray","className":"cursor-pointer"}} title="Editar">
                            <Edit2 size={14} />
                          </UiButton>
                          <UiButton iconOnly onClick={() => handleDeletePromo(promo.id)} {...{"color":"gray","className":"cursor-pointer"}} title="Eliminar">
                            <Trash2 size={14} />
                          </UiButton>
                        </UiBox>
                      </UiTableCell>
                    </UiTableRow>
                  );
                })
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      )}

      {/* DISCOUNTS FORM MODAL */}
      {isDiscountModalOpen && (
        <UiBox style={{ backgroundColor: 'var(--black-a7)' }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <UiBox style={{ backgroundColor: 'var(--color-panel-solid)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-a6)', boxShadow: 'var(--shadow-5)' }} className="w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)', backgroundColor: 'var(--gray-2)' }} className="p-4 flex items-center justify-between">
              <UiHeading as="h3" size="2" weight="bold" color="gray" highContrast>
                {editingDiscount ? 'Editar Descuento Maestro' : 'Nuevo Descuento Maestro'}
              </UiHeading>
              <UiButton iconOnly onClick={() => setIsDiscountModalOpen(false)} color="gray" className="cursor-pointer">
                <X size={16} />
              </UiButton>
            </UiBox>
            <form onSubmit={handleSaveDiscount} {...{"style":{"color":"var(--gray-12)"},"className":"p-5 space-y-4"}}>
              {/* Nombre */}
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Nombre del Descuento</UiLabel>
                <UiInput
                  type="text"
                  required
                  placeholder="Ej: Descuento 15% Clientes VIP"
                  value={discountForm.nombre}
                  onChange={e => setDiscountForm(prev => ({ ...prev, nombre: e.target.value }))}
                  {...{"color":"gray","className":"w-full"}}
                />
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
                {/* Alcance */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Alcance</UiLabel>
                  <UiSelect
                    value={discountForm.alcance}
                    onChange={e => setDiscountForm(prev => ({ ...prev, alcance: e.target.value }))}
                    {...{"color":"gray","className":"w-full cursor-pointer"}}
                  >
                    <option value="PRODUCTO">Por Producto (Ítem)</option>
                    <option value="VENTA">Por Venta (Total)</option>
                  </UiSelect>
                </UiBox>

                {/* Tipo de Valor */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Tipo de Valor</UiLabel>
                  <UiSelect
                    value={discountForm.tipo_valor}
                    onChange={e => {
                      const valType = e.target.value;
                      setDiscountForm(prev => ({
                        ...prev,
                        tipo_valor: valType,
                        valor: valType === 'SIN_IVA' ? 0 : prev.valor
                      }));
                    }}
                    {...{"color":"gray","className":"w-full cursor-pointer"}}
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="MONTO_FIJO">Monto Fijo ($)</option>
                    <option value="SIN_IVA">Quitar IVA (Vender sin IVA)</option>
                  </UiSelect>
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
                {/* Valor */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Valor Descuento</UiLabel>
                  <UiInput
                    type="number"
                    required={discountForm.tipo_valor !== 'SIN_IVA'}
                    disabled={discountForm.tipo_valor === 'SIN_IVA'}
                    min="0"
                    step="0.01"
                    placeholder={discountForm.tipo_valor === 'SIN_IVA' ? "Autocalculado" : "0.00"}
                    value={discountForm.tipo_valor === 'SIN_IVA' ? '0' : (discountForm.valor || '')}
                    onChange={e => setDiscountForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                    {...mergeThemeProps({"color":"gray","className":"w-full"}, {}, (discountForm.tipo_valor === 'SIN_IVA' ? {"color":"gray"} : {}))}
                  />
                </UiBox>

                {/* Requiere autorización */}
                <UiBox {...{"className":"flex flex-col justify-end pb-2"}}>
                  <UiLabel {...{"className":"flex items-center gap-2 cursor-pointer select-none"}}>
                    <UiInput
                      type="checkbox"
                      checked={discountForm.requiere_autorizacion}
                      onChange={e => setDiscountForm(prev => ({ ...prev, requiere_autorizacion: e.target.checked }))}
                      {...{"color":"blue","className":"w-4 cursor-pointer"}}
                    />
                    <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Requiere clave de supervisor</UiText>
                  </UiLabel>
                </UiBox>
              </UiBox>

              {/* Método de Aplicación y Cantidad Volumen */}
              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"grid grid-cols-2 gap-4 pt-4"}}>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Método de Aplicación</UiLabel>
                  <UiSelect
                    value={discountForm.metodo || 'SIEMPRE'}
                    onChange={e => setDiscountForm(prev => ({ ...prev, metodo: e.target.value }))}
                    {...{"color":"gray","className":"w-full cursor-pointer"}}
                  >
                    <option value="SIEMPRE">Siempre (Sin cantidad mínima)</option>
                    <option value="POR_CADA">Por cada (Escalonado)</option>
                    <option value="A_PARTIR_DE">A partir de (Volumen mínimo)</option>
                  </UiSelect>
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>
                    {discountForm.metodo === 'POR_CADA' ? 'Cada X Unidades' : 'Cantidad Mínima'}
                  </UiLabel>
                  <UiInput
                    type="number"
                    required={discountForm.metodo !== 'SIEMPRE'}
                    disabled={discountForm.metodo === 'SIEMPRE'}
                    min="1"
                    placeholder={discountForm.metodo === 'SIEMPRE' ? "N/A" : "Ej. 5"}
                    value={discountForm.metodo === 'SIEMPRE' ? '' : (discountForm.cantidad_volumen || '')}
                    onChange={e => setDiscountForm(prev => ({ ...prev, cantidad_volumen: parseInt(e.target.value) || 1 }))}
                    {...mergeThemeProps({"color":"gray","className":"w-full"}, {}, (discountForm.metodo === 'SIEMPRE' ? {"color":"gray"} : {}))}
                  />
                </UiBox>
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"grid grid-cols-2 gap-4 pt-4"}}>
                {/* Fecha Inicio */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Fecha Inicio</UiLabel>
                  <UiInput
                    type="date"
                    required
                    value={discountForm.fecha_inicio}
                    onChange={e => setDiscountForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                    {...{"color":"gray","className":"w-full"}}
                  />
                </UiBox>

                {/* Fecha Fin */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Fecha Fin</UiLabel>
                  <UiInput
                    type="date"
                    required
                    value={discountForm.fecha_fin}
                    onChange={e => setDiscountForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
                    {...{"color":"gray","className":"w-full"}}
                  />
                </UiBox>
              </UiBox>

              {/* Disponibilidad Horaria y Días de la Semana */}
              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-4 space-y-3"}}>
                <UiBox {...{"className":"flex items-center justify-between"}}>
                  <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Disponibilidad Horaria</UiText>
                  <UiLabel {...{"className":"flex items-center gap-2 cursor-pointer select-none"}}>
                    <UiInput
                      type="checkbox"
                      checked={discountForm.activo_24h ?? true}
                      onChange={e => setDiscountForm(prev => ({ ...prev, activo_24h: e.target.checked }))}
                      {...{"color":"blue","className":"w-4 cursor-pointer"}}
                    />
                    <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Activo las 24 horas</UiText>
                  </UiLabel>
                </UiBox>

                {!(discountForm.activo_24h ?? true) && (
                  <UiBox {...{"className":"grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200"}}>
                    <UiBox>
                      <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Hora Inicio</UiLabel>
                      <UiInput
                        type="time"
                        required
                        value={discountForm.hora_inicio || '00:00'}
                        onChange={e => setDiscountForm(prev => ({ ...prev, hora_inicio: e.target.value }))}
                        {...{"color":"gray","className":"w-full"}}
                      />
                    </UiBox>
                    <UiBox>
                      <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Hora Fin</UiLabel>
                      <UiInput
                        type="time"
                        required
                        value={discountForm.hora_fin || '23:59'}
                        onChange={e => setDiscountForm(prev => ({ ...prev, hora_fin: e.target.value }))}
                        {...{"color":"gray","className":"w-full"}}
                      />
                    </UiBox>
                  </UiBox>
                )}

                {/* Días de la Semana */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-2"}}>Días Activos de la Semana</UiLabel>
                  <UiBox {...{"className":"flex flex-wrap gap-2"}}>
                    {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(day => {
                      const list = discountForm.dias_semana || ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
                      const isChecked = list.includes(day);
                      return (
                        <UiButton
                          type="button"
                          key={day}
                          onClick={() => {
                            const updated = isChecked
                              ? list.filter(d => d !== day)
                              : [...list, day];
                            setDiscountForm(prev => ({ ...prev, dias_semana: updated }));
                          }}
                          {...mergeThemeProps({"variant":"outline","size":"2","className":"cursor-pointer"}, {}, (isChecked ? {"variant":"soft","color":"blue"} : {"variant":"surface","color":"gray"}))}
                        >
                          {day}
                        </UiButton>
                      );
                    })}
                  </UiBox>
                </UiBox>
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-3 flex justify-end gap-2"}}>
                <UiButton type="button" onClick={() => setIsDiscountModalOpen(false)} {...{"variant":"surface","color":"blue","className":"cursor-pointer"}}>Cancelar</UiButton>
                <UiButton type="submit" {...{"variant":"solid","color":"blue","className":"cursor-pointer"}}>Guardar Descuento</UiButton>
              </UiBox>
            </form>
          </UiBox>
        </UiBox>
      )}

      {/* PROMO FORM MODAL */}
      {isPromoModalOpen && (
        <UiBox style={{ backgroundColor: 'var(--black-a7)' }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <UiBox style={{ backgroundColor: 'var(--color-panel-solid)', borderRadius: 'var(--radius-3)', border: '1px solid var(--gray-a6)', boxShadow: 'var(--shadow-5)' }} className="w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <UiBox style={{ borderBottom: '1px solid var(--gray-a6)', backgroundColor: 'var(--gray-2)' }} className="p-4 flex items-center justify-between">
              <UiHeading as="h3" size="2" weight="bold" color="gray" highContrast>
                {editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}
              </UiHeading>
              <UiButton iconOnly onClick={() => setIsPromoModalOpen(false)} color="gray" className="cursor-pointer">
                <X size={16} />
              </UiButton>
            </UiBox>
            <form onSubmit={handleSavePromo} {...{"style":{"color":"var(--gray-12)"},"className":"p-5 space-y-4"}}>
              {/* Nombre */}
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Nombre de la Promoción</UiLabel>
                <UiInput
                  type="text"
                  required
                  placeholder="Ej: Descuento Lunes de Frutas"
                  value={promoForm.nombre}
                  onChange={e => setPromoForm(prev => ({ ...prev, nombre: e.target.value }))}
                  {...{"color":"gray","className":"w-full"}}
                />
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
                {/* Descuento Asociado */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Descuento Asociado</UiLabel>
                  <UiSelect
                    value={promoForm.id_descuento}
                    required
                    onChange={e => setPromoForm(prev => ({ ...prev, id_descuento: e.target.value }))}
                    {...{"color":"gray","className":"w-full cursor-pointer"}}
                  >
                    {discounts.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre} ({d.tipo_valor === 'SIN_IVA' ? 'Sin IVA' : (d.tipo_valor === 'PORCENTAJE' ? `${d.valor}%` : `$${d.valor}`)})</option>
                    ))}
                  </UiSelect>
                </UiBox>

                {/* Alcance de aplicación */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Alcance de Aplicación</UiLabel>
                  <UiSelect
                    value={promoForm.alcance_aplicacion}
                    onChange={e => setPromoForm(prev => ({ ...prev, alcance_aplicacion: e.target.value, target_id: '' }))}
                    {...{"color":"gray","className":"w-full cursor-pointer"}}
                  >
                    <option value="PRODUCTO_ESPECIFICO">Producto Específico</option>
                    <option value="CATEGORIA">Categoría Específica</option>
                    <option value="VENTA_TOTAL">Venta Total</option>
                  </UiSelect>
                </UiBox>
              </UiBox>

              {/* Target ID Selector (Product or Category) */}
              {promoForm.alcance_aplicacion !== 'VENTA_TOTAL' && (
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>
                    {promoForm.alcance_aplicacion === 'PRODUCTO_ESPECIFICO' ? 'Seleccionar Producto' : 'Seleccionar Categoría'}
                  </UiLabel>
                  <UiSelect
                    value={promoForm.target_id}
                    required
                    onChange={e => setPromoForm(prev => ({ ...prev, target_id: e.target.value }))}
                    {...{"color":"gray","className":"w-full cursor-pointer"}}
                  >
                    <option value="">-- Seleccionar --</option>
                    {promoForm.alcance_aplicacion === 'PRODUCTO_ESPECIFICO'
                      ? products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)
                      : categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                    }
                  </UiSelect>
                </UiBox>
              )}

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"grid grid-cols-2 gap-4 pt-4"}}>
                {/* Condición */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Condición</UiLabel>
                  <UiSelect
                    value={promoForm.condicion}
                    onChange={e => setPromoForm(prev => ({ ...prev, condicion: e.target.value, valor_condicion: 0 }))}
                    {...{"color":"gray","className":"w-full cursor-pointer"}}
                  >
                    <option value="NINGUNA">Ninguna (Siempre se aplica)</option>
                    <option value="MONTO_MINIMO">Monto de Venta Mínimo ($)</option>
                    <option value="CANTIDAD_MINIMA">Cantidad de Ítems Mínima</option>
                  </UiSelect>
                </UiBox>

                {/* Valor Condición */}
                {promoForm.condicion !== 'NINGUNA' && (
                  <UiBox>
                    <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Valor Condición</UiLabel>
                    <UiInput
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={promoForm.valor_condicion || ''}
                      onChange={e => setPromoForm(prev => ({ ...prev, valor_condicion: parseFloat(e.target.value) || 0 }))}
                      {...{"color":"gray","className":"w-full"}}
                    />
                  </UiBox>
                )}
              </UiBox>

              {/* Días válidos */}
              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Días Válidos de la Semana</UiLabel>
                <UiBox {...{"className":"flex flex-wrap gap-1.5"}}>
                  {["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"].map(day => {
                    const isSel = promoForm.dias_validos.includes(day);
                    return (
                      <UiButton
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        {...mergeThemeProps({"size":"2","variant":"outline","className":"cursor-pointer"}, {}, (isSel ? {"variant":"solid","color":"blue"} : {"variant":"surface","color":"gray"}))}
                      >
                        {day}
                      </UiButton>
                    );
                  })}
                </UiBox>
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"grid grid-cols-2 gap-4 pt-4"}}>
                {/* Fecha Inicio */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Fecha Inicio</UiLabel>
                  <UiInput
                    type="date"
                    required
                    value={promoForm.fecha_inicio}
                    onChange={e => setPromoForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                    {...{"color":"gray","className":"w-full"}}
                  />
                </UiBox>

                {/* Fecha Fin */}
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Fecha Fin</UiLabel>
                  <UiInput
                    type="date"
                    required
                    value={promoForm.fecha_fin}
                    onChange={e => setPromoForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
                    {...{"color":"gray","className":"w-full"}}
                  />
                </UiBox>
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"pt-3 flex justify-end gap-2"}}>
                <UiButton type="button" onClick={() => setIsPromoModalOpen(false)} {...{"variant":"surface","color":"blue","className":"cursor-pointer"}}>Cancelar</UiButton>
                <UiButton type="submit" {...{"variant":"solid","color":"blue","className":"cursor-pointer"}}>Guardar Promoción</UiButton>
              </UiBox>
            </form>
          </UiBox>
        </UiBox>
      )}
    </UiBox>
  );
}
