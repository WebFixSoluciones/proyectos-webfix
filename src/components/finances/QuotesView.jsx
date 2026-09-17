import { mergeThemeProps } from '../ui/themeProps';
import { UiText, UiBox, UiCard, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, AlertCircle, ShoppingBag, Eye } from 'lucide-react';
import { collection, onSnapshot, doc, getDoc, setDoc, deleteDoc } from '../../services/financeStore.js';
import { getEcuadorDateString } from '../../services/sriService';
import RidePreviewModal from './RidePreviewModal';

export default function QuotesView({ products, thirdParties,  showToast, db, appId, onPromoteToInvoice }) {
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [companyConfig, setCompanyConfig] = useState(null);
  const [selectedQuoteTx, setSelectedQuoteTx] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

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
    date: getEcuadorDateString(),
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => ({
        ...prev,
        quoteNumber: `COT-${String(nextNum).padStart(6, '0')}`,
        validUntil: getEcuadorDateString(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)) // 15 días validez por defecto
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (await window.confirm("¿Seguro que deseas eliminar esta cotización?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_quotes', id));
        showToast("Cotización eliminada", "success");
      } catch {
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
      date: getEcuadorDateString(),
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
        return <UiText {...{"color":"green","weight":"bold"}}>Facturado</UiText>;
      case 'enviado': 
        return <UiText {...{"color":"blue","weight":"bold"}}>Enviado</UiText>;
      case 'vencido': 
        return <UiText {...{"color":"red","weight":"bold"}}>Vencido</UiText>;
      default: 
        return <UiText {...{"color":"gray","weight":"bold"}}>Borrador</UiText>;
    }
  };

  const filtered = quotes.filter(q => {
    const matchedTpName = thirdParties.find(tp => tp.id === q.thirdPartyId)?.name || '';
    const matchesSearch = q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
           matchedTpName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  

  return (
    <UiBox {...{"className":"space-y-6"}}>
      
      {/* ALERTA DE BLOQUEO POR CONFIGURACIÓN DE EMPRESA */}
      {isBlocked && (
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-11)"},"className":"p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300"}}>
          <UiBox {...{"className":"flex items-start gap-3"}}>
            <AlertCircle size={20} {...{"className":"shrink-0 mt-0.5"}} />
            <UiBox {...{}}>
              <UiText as="p" {...{"weight":"bold"}}>Emisión de Cotizaciones Bloqueada</UiText>
              <UiText as="p" {...{"className":"opacity-90 mt-0.5"}}>Normativa Comercial: No se pueden emitir proformas sin configurar la Razón Social, RUC y el **Logo Corporativo** de la empresa.</UiText>
            </UiBox>
          </UiBox>
          <UiText {...{"size":"1","weight":"bold","className":"px-2.5 py-1 shrink-0"}}>Configuración Requerida</UiText>
        </UiBox>
      )}

      {/* FILTROS Y BUSQUEDA */}
      <UiBox {...{"className":"flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6"}}>
        <UiBox>
          <UiButton
            onClick={() => { 
              if (isBlocked) {
                showToast("Completa la Razón Social, RUC y Logo en Configuración primero", "error");
                return;
              }
              resetForm(); 
              setIsModalOpen(true); 
            }}
            disabled={isBlocked}
            {...mergeThemeProps({"variant":"solid","color":"blue","className":"w-full sm:w-auto"}, {}, (isBlocked ? {"className":"opacity-50 cursor-not-allowed"} : {}))}
          >
            <Plus size={15} /> Nueva Cotización
          </UiButton>
        </UiBox>

        <UiBox {...{"className":"flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto"}}>
          <UiCard {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"flex items-center gap-2 px-3.5 py-1.5 w-full sm:w-64"}}>
            <Search size={14} {...{"style":{"color":"var(--gray-11)"}}} />
            <UiInput
              type="text" 
              placeholder="Buscar por número o cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              {...{"size":"2","className":"w-full"}}
              disabled={isBlocked}
            />
          </UiCard>

          <UiSelect
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)} 
            {...{"size":"2","color":"gray","className":"cursor-pointer"}}
          >
            <option value="all" {...{"style":{"color":"var(--gray-12)"}}}>Todos los estados</option>
            <option value="borrador" {...{"style":{"color":"var(--gray-12)"}}}>Borrador</option>
            <option value="enviado" {...{"style":{"color":"var(--gray-12)"}}}>Enviado</option>
            <option value="facturado" {...{"style":{"color":"var(--gray-12)"}}}>Facturado</option>
            <option value="vencido" {...{"style":{"color":"var(--gray-12)"}}}>Vencido</option>
          </UiSelect>
        </UiBox>
      </UiBox>

      {/* TABLA COTIZACIONES */}
      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"overflow-hidden"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
        {loading ? (
          <UiBox {...{"className":"flex justify-center items-center py-12"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)"},"className":"animate-spin h-6 w-6"}}></UiBox>
          </UiBox>
        ) : (
          <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
            <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
              <UiTableHeader {...mergeThemeProps({}, {}, {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}})}>
                <UiTableRow>
                  <UiTableHead {...{"className":"px-6 py-3.5"}}>Cotización</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5"}}>Fecha</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5"}}>Validez</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5"}}>Cliente</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Items</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Total</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5"}}>Estado</UiTableHead>
                  <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Acciones</UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody {...mergeThemeProps({})}>
                {filtered.map(q => {
                  const client = thirdParties.find(tp => tp.id === q.thirdPartyId);
                  return (
                    <UiTableRow key={q.id} {...mergeThemeProps({})}>
                      <UiTableCell {...mergeThemeProps({"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5"})}>{q.quoteNumber}</UiTableCell>
                      <UiTableCell {...{"className":"px-6 py-3.5"}}>{q.date}</UiTableCell>
                      <UiTableCell {...{"className":"px-6 py-3.5"}}>{q.validUntil || '-'}</UiTableCell>
                      <UiTableCell {...mergeThemeProps({"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5 truncate max-w-[200px]"})} title={client?.name}>
                        {client?.name || 'Desconocido'}
                      </UiTableCell>
                      <UiTableCell {...{"className":"px-6 py-3.5 text-right"}}>{q.items?.length || 0}</UiTableCell>
                      <UiTableCell {...mergeThemeProps({"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"})}>${Number(q.total || 0).toFixed(2)}</UiTableCell>
                      <UiTableCell {...{"className":"px-6 py-3.5"}}>{getStatusBadge(q.status)}</UiTableCell>
                      <UiTableCell {...{"className":"px-6 py-3.5 text-right"}}>
                        <UiBox {...{"className":"flex items-center justify-end gap-1.5"}}>
                          {q.status !== 'facturado' && (
                            <UiButton
                              onClick={() => handlePromote(q)}
                              {...{"variant":"solid","color":"blue","size":"2","className":"shrink-0"}}
                              title="Promover a Factura SRI"
                            >
                              <ShoppingBag size={12} /> Facturar
                            </UiButton>
                          )}
                          <UiButton iconOnly
                            onClick={() => setSelectedQuoteTx({ ...q, documentType: 'cotizacion', documentNumber: q.quoteNumber, baseImponible: q.subtotal, ivaValor: q.ivaValor, total: q.total })} 
                            {...{"variant":"solid","color":"amber"}}
                            title="Ver RIDE Proforma / Imprimir"
                          >
                            <Eye size={13}/>
                          </UiButton>
                          <UiButton iconOnly
                            onClick={() => { setFormData(q); setIsModalOpen(true); }} 
                            {...{"variant":"solid","color":"blue"}}
                            title="Editar"
                          >
                            <Edit2 size={13}/>
                          </UiButton>
                          <UiButton iconOnly
                            onClick={() => handleDelete(q.id)} 
                            {...{"variant":"solid","color":"red"}}
                            title="Eliminar"
                          >
                            <Trash2 size={13}/>
                          </UiButton>
                        </UiBox>
                      </UiTableCell>
                    </UiTableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <UiTableRow>
                    <UiTableCell colSpan="8" {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center italic"}}>No se encontraron cotizaciones registradas.</UiTableCell>
                  </UiTableRow>
                )}
              </UiTableBody>
            </UiTable>
          </UiBox>
        )}
      </UiBox>

      {/* MODAL CREAR / EDITAR COTIZACIÓN */}
      {isModalOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in"}}>
          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh] custom-scrollbar"})}>
            <UiHeading as="h2" {...{"size":"3","weight":"bold","className":"mb-4"}}>{formData.id ? 'Editar' : 'Crear'} Cotización</UiHeading>
            
            <form onSubmit={handleSave} {...{"className":"space-y-4"}}>
              
              <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-4"}}>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Número</UiLabel>
                  <UiInput type="text" readOnly value={formData.quoteNumber} {...mergeThemeProps({}, {"className":"opacity-60"}, mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"}))} />
                </UiBox>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Fecha Emisión</UiLabel>
                  <UiInput type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} />
                </UiBox>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Fecha Vencimiento</UiLabel>
                  <UiInput type="date" required value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} />
                </UiBox>
                <UiBox {...{"className":"md:col-span-3"}}>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1"})}>Cliente / Tercero</UiLabel>
                  <UiSelect required value={formData.thirdPartyId} onChange={e => setFormData({...formData, thirdPartyId: e.target.value})} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}>
                    <option value="" disabled {...{"style":{"color":"var(--gray-11)"}}}>Selecciona un cliente...</option>
                    {thirdParties.map(tp => (
                      <option key={tp.id} value={tp.id} {...{"style":{"color":"var(--gray-12)"}}}>{tp.name} - RUC: {tp.ruc}</option>
                    ))}
                  </UiSelect>
                </UiBox>
              </UiBox>

              {/* TABLA DE PRODUCTOS (FILAS) */}
              <UiBox {...{"className":"space-y-3"}}>
                <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center pb-2"}}>
                  <UiHeading as="h4" {...{"size":"1","weight":"bold","color":"gray"}}>Detalle de Productos / Servicios</UiHeading>
                  <UiButton type="button" onClick={handleAddItem} {...{"variant":"surface","color":"blue","size":"2","className":"flex items-center gap-1"}}>
                    <Plus size={10} /> Agregar Ítem
                  </UiButton>
                </UiBox>

                <UiBox {...{"className":"space-y-2"}}>
                  {formData.items.map((item, index) => (
                    <UiBox key={index} {...{"style":{"backgroundColor":"var(--black-a7)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"flex flex-col sm:flex-row items-center gap-2 p-3"}}>
                      <UiBox {...{"className":"flex-1 w-full"}}>
                        <UiSelect
                          required 
                          value={item.productId} 
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)} 
                          {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                        >
                          <option value="" disabled {...{"style":{"color":"var(--gray-11)"}}}>Seleccionar Producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} {...{"style":{"color":"var(--gray-12)"}}}>{p.sku} - {p.name} (${p.price})</option>
                          ))}
                        </UiSelect>
                      </UiBox>
                      
                      <UiBox {...{"className":"w-full sm:w-20"}}>
                        <UiInput
                          type="number" 
                          placeholder="Cant." 
                          required 
                          min={1} 
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                          {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                        />
                      </UiBox>
                      
                      <UiBox {...{"className":"w-full sm:w-28"}}>
                        <UiInput
                          type="number" 
                          step="0.01" 
                          placeholder="Precio" 
                          required 
                          value={item.price} 
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                          {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})} 
                        />
                      </UiBox>

                      <UiBox {...{"className":"w-full sm:w-20 text-center shrink-0"}}>
                        ${((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}
                      </UiBox>

                      <UiButton iconOnly type="button" onClick={() => handleRemoveItem(index)} {...mergeThemeProps({"variant":"surface","color":"red"})}>
                        <Trash2 size={13} />
                      </UiButton>
                    </UiBox>
                  ))}
                  {formData.items.length === 0 && (
                    <UiText as="p" {...{"size":"1","color":"gray","className":"text-center italic py-4"}}>No has agregado ningún producto a la cotización.</UiText>
                  )}
                </UiBox>
              </UiBox>

              {/* TOTALES */}
              <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"},"className":"p-4 flex justify-between items-center"})}>
                <UiBox {...{"className":"leading-relaxed"}}>
                  <UiText as="p">Subtotal Neto: ${formData.subtotal}</UiText>
                  <UiText as="p">IVA Estimado: ${formData.ivaValor}</UiText>
                </UiBox>
                <UiText as="p" {...mergeThemeProps({"size":"5","weight":"bold","color":"gray","highContrast":true})}>Total: ${formData.total}</UiText>
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-3 pt-4"}}>
                <UiButton type="button" onClick={() => setIsModalOpen(false)} {...{"variant":"surface","color":"blue"}}>Cancelar</UiButton>
                <UiButton type="submit" {...{"variant":"solid","color":"blue"}}>Guardar Cotización</UiButton>
              </UiBox>

            </form>
          </UiBox>
        </UiBox>
      )}

      {selectedQuoteTx && (
        <RidePreviewModal 
          tx={selectedQuoteTx} 
          onClose={() => setSelectedQuoteTx(null)} 
          thirdParties={thirdParties} 
          db={db} 
          appId={appId} 
        />
      )}

    </UiBox>
  );
}
