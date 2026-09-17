import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiText, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState } from 'react';
import { Plus, Search, Trash2, Edit2, Sparkles, RefreshCw } from 'lucide-react';
import { doc, setDoc, deleteDoc } from '../../services/financeStore.js';
import { consultarRucSri } from '../../services/sriService';

export default function ThirdPartiesView({ thirdParties, showToast, db, appId, forcedType }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIdType, setFilterIdType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQueryingSri, setIsQueryingSri] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    ruc: '', 
    email: '', 
    type: forcedType || 'cliente',
    tipoIdentificacion: 'ruc',
    direccion: '',
    telefono: '',
    tipoContribuyente: 'general',
    ciudad: ''
  });


  const filtered = thirdParties.filter(tp => {
    const matchesSearch = tp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          String(tp.ruc || '').includes(searchTerm) || 
                          (tp.direccion || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !forcedType || (forcedType === 'cliente' ? tp.type !== 'proveedor' : tp.type === forcedType);
    const matchesIdType = filterIdType === 'all' || (tp.tipoIdentificacion || 'ruc').toLowerCase() === filterIdType;
    return matchesSearch && matchesType && matchesIdType;
  });

  const querySRI = async () => {
    if (!formData.ruc) {
      showToast('Por favor, ingresa un número de RUC o Cédula', 'error');
      return;
    }
    setIsQueryingSri(true);
    try {
      const result = await consultarRucSri(formData.ruc);
      const guessCity = (address) => {
        if (!address) return '';
        const cleanAddr = address.toLowerCase();
        if (cleanAddr.includes('quito')) return 'Quito';
        if (cleanAddr.includes('guayaquil')) return 'Guayaquil';
        if (cleanAddr.includes('cuenca')) return 'Cuenca';
        if (cleanAddr.includes('ambato')) return 'Ambato';
        if (cleanAddr.includes('manta')) return 'Manta';
        if (cleanAddr.includes('loja')) return 'Loja';
        if (cleanAddr.includes('ibarra')) return 'Ibarra';
        if (cleanAddr.includes('santo domingo')) return 'Santo Domingo';
        if (cleanAddr.includes('portoviejo')) return 'Portoviejo';
        if (cleanAddr.includes('riobamba')) return 'Riobamba';
        return '';
      };
      setFormData(prev => ({
        ...prev,
        name: result.name,
        tipoIdentificacion: result.tipoIdentificacion,
        direccion: result.direccion,
        telefono: result.telefono,
        email: result.email || prev.email,
        tipoContribuyente: result.tipoContribuyente || 'general',
        ciudad: guessCity(result.direccion) || prev.ciudad || ''
      }));
      showToast('Datos fiscales cargados exitosamente desde el SRI', 'success');
    } catch (e) {
      console.error("Error al consultar RUC en ThirdParties:", e);
      showToast(e.message || 'Error al consultar datos en el SRI', 'error');
    } finally {
      setIsQueryingSri(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ruc) {
      showToast('Nombre y RUC/Identificación son obligatorios', 'error');
      return;
    }

    const trimmedRuc = String(formData.ruc || '').trim();
    const isDuplicate = thirdParties.some(tp => String(tp.ruc || '').trim() === trimmedRuc && tp.id !== formData.id);
    if (isDuplicate) {
      showToast('Ya existe un contacto con este RUC/Identificación', 'error');
      return;
    }

    try {
      const docId = formData.id || `tp_${new Date().getTime()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', docId), {
        name: formData.name,
        ruc: formData.ruc,
        email: formData.email,
        type: formData.type || forcedType || 'cliente',
        tipoIdentificacion: formData.tipoIdentificacion || 'ruc',
        direccion: formData.direccion || '',
        telefono: formData.telefono || '',
        tipoContribuyente: formData.tipoContribuyente || 'general',
        ciudad: formData.ciudad || '',
        isValidated: true,
        validado: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast('Persona guardada exitosamente', 'success');
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar contacto', 'error');
    }
  };

  const resetForm = () => {
    setFormData({ 
      id: '', 
      name: '', 
      ruc: '', 
      email: '', 
      type: forcedType || 'cliente',
      tipoIdentificacion: 'ruc',
      direccion: '',
      telefono: '',
      tipoContribuyente: 'general',
      ciudad: ''
    });
  };

  const handleDelete = async (id) => {
    if (await window.confirm('¿Seguro que deseas eliminar este registro?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', id));
        showToast('Registro eliminado', 'success');
      } catch {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  

  return (
    <UiBox {...{"className":"animate-in slide-in-from-bottom-4 duration-500"}}>
      
      <UiBox {...{"className":"flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6"}}>
        <UiBox>
          <UiButton
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            {...{"variant":"solid","color":"blue","className":"w-full sm:w-auto"}}
          >
            <Plus size={15} /> Nuevo {forcedType === 'cliente' ? 'Cliente' : forcedType === 'proveedor' ? 'Proveedor' : 'Contacto'}
          </UiButton>
        </UiBox>

        <UiBox {...{"className":"flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto"}}>
          <UiBox className="w-full sm:w-64">
            <UiInput
              type="text" 
              placeholder={`Buscar por nombre, RUC o dirección...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
              size="2"
            />
          </UiBox>

          <UiSelect
            value={filterIdType} 
            onChange={e => setFilterIdType(e.target.value)} 
            {...{"size":"2","color":"gray","className":"cursor-pointer"}}
          >
            <option value="all" {...{"style":{"color":"var(--gray-12)"}}}>Identificación: Todos</option>
            <option value="ruc" {...{"style":{"color":"var(--gray-12)"}}}>RUC</option>
            <option value="cedula" {...{"style":{"color":"var(--gray-12)"}}}>Cédula</option>
            <option value="pasaporte" {...{"style":{"color":"var(--gray-12)"}}}>Pasaporte</option>
          </UiSelect>
        </UiBox>
      </UiBox>

      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
        <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
          <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
            <UiTableHeader {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}}}>
              <UiTableRow>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Razón Social / Nombres</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Identificación</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 hidden sm:table-cell"}}>Teléfono</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Dirección Domicilio</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Correo Notificación</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Acciones</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody {...{}}>
              {filtered.map(tp => {
                const initials = tp.name ? tp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'C';
                const colors = [
                  'from-blue-400 to-indigo-500',
                  'from-purple-400 to-violet-600',
                  'from-emerald-400 to-teal-500',
                  'from-orange-400 to-amber-500',
                  'from-sky-400 to-blue-500'
                ];
                // simple hash to choose color consistently
                const charCodeSum = tp.name ? tp.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
                const colorClass = colors[charCodeSum % colors.length];

                return (
                  <UiTableRow key={tp.id} {...{}}>
                    <UiTableCell {...{"className":"px-6 py-3.5"}}>
                      <UiBox {...{"className":"flex items-center gap-3"}}>
                        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"w-8 h-8"}, {"style":{"color":"var(--color-background)"},"className":"flex items-center justify-center"}, resolveThemeProps(colors[charCodeSum % colors.length]))}>
                          {initials}
                        </UiBox>
                        <UiBox>
                          <UiText as="p" {...{"weight":"bold","size":"1","color":"gray","highContrast":true}}>{tp.name}</UiText>

                        </UiBox>
                      </UiBox>
                    </UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>
                      <UiText {...{"size":"1","color":"gray","weight":"bold","className":"block opacity-85"}}>{tp.tipoIdentificacion || 'ruc'}</UiText>
                      <UiText {...{"color":"gray","highContrast":true,"weight":"bold"}}>{tp.ruc}</UiText>
                    </UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5 hidden sm:table-cell"}}>{tp.telefono || '-'}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5 max-w-[220px] truncate"}} title={tp.direccion}>
                       {tp.direccion || '-'}
                       {tp.ciudad && <UiText {...{"size":"1","color":"gray","weight":"bold","className":"block mt-0.5"}}>{tp.ciudad}</UiText>}
                     </UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--blue-12)"},"className":"px-6 py-3.5 hover:underline"}}><a href={`mailto:${tp.email}`}>{tp.email || '-'}</a></UiTableCell>
                    <UiTableCell {...{"className":"px-6 py-3.5 text-right"}}>
                      <UiBox {...{"className":"flex items-center justify-end gap-1.5"}}>
                        <UiButton iconOnly
                          onClick={() => { setFormData({ id: tp.id || '', name: tp.name || '', ruc: tp.ruc || '', email: tp.email || '', type: tp.type || forcedType || 'cliente', tipoIdentificacion: tp.tipoIdentificacion || 'ruc', direccion: tp.direccion || '', telefono: tp.telefono || '', tipoContribuyente: tp.tipoContribuyente || 'general', ciudad: tp.ciudad || '' }); setIsModalOpen(true); }} 
                          variant="soft"
                          color="gray"
                          size="1"
                          title="Editar"
                        >
                          <Edit2 size={13}/>
                        </UiButton>
                        <UiButton iconOnly
                          onClick={() => handleDelete(tp.id)} 
                          variant="soft"
                          color="red"
                          size="1"
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
                  <UiTableCell colSpan="6" {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-12 text-center italic"}}>No se encontraron registros de personas.</UiTableCell>
                </UiTableRow>
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      </UiBox>

      {/* MODAL CREAR/EDITAR */}
      {isModalOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"}}>
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","color":"var(--gray-12)"},"className":"w-full max-w-lg p-6 sm:p-8 duration-300"}}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-6 pb-2"}}>
              <UiHeading as="h2" {...{"size":"3","weight":"regular"}}>
                {formData.id ? 'Editar' : 'Nuevo'} {forcedType === 'cliente' ? 'Cliente' : forcedType === 'proveedor' ? 'Proveedor' : 'Contacto'}
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
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"}}>Tipo Identificación</UiLabel>
                  <UiSelect value={formData.tipoIdentificacion || 'ruc'} onChange={e => setFormData({...formData, tipoIdentificacion: e.target.value})} {...mergeThemeProps({}, {"className":"cursor-pointer"}, {"size":"2","className":"w-full"})}>
                    <option value="ruc" {...{"style":{"color":"var(--gray-12)"}}}>RUC (13 dígitos)</option>
                    <option value="cedula" {...{"style":{"color":"var(--gray-12)"}}}>Cédula de Identidad (10 dígitos)</option>
                    <option value="pasaporte" {...{"style":{"color":"var(--gray-12)"}}}>Pasaporte</option>
                    <option value="consumidor_final" {...{"style":{"color":"var(--gray-12)"}}}>Consumidor Final</option>
                  </UiSelect>
                </UiBox>
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"}}>Identificación</UiLabel>
                  <UiBox {...{"className":"flex gap-2"}}>
                    <UiInput
                      type="text" 
                      required 
                      value={formData.ruc} 
                      onChange={e => setFormData({...formData, ruc: e.target.value})} 
                      {...{"size":"2","className":"w-full"}} 
                      placeholder="1790000000001" 
                    />
                    <UiButton
                      type="button"
                      disabled={isQueryingSri}
                      onClick={querySRI}
                      {...{"variant":"solid","color":"purple","className":"shrink-0"}}
                      title="Consultar base del SRI"
                    >
                      {isQueryingSri ? <RefreshCw size={13} {...{"className":"animate-spin"}} /> : <Sparkles size={13} />}
                    </UiButton>
                  </UiBox>
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"}}>Razón Social / Nombres Completos</UiLabel>
                <UiInput type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="Ej. Juan Pérez o WEBFIX S.A." />
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"}}>Teléfono Contacto</UiLabel>
                <UiInput type="text" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="Ej. 0998765432 o 022987654" />
              </UiBox>

              <UiBox {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"grid grid-cols-3 gap-4"}}>
                 <UiBox {...{"className":"col-span-2"}}>
                   <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"}}>Dirección Matriz / Domicilio</UiLabel>
                   <UiInput type="text" value={formData.direccion || ''} onChange={e => setFormData({...formData, direccion: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="Av. de los Shyris y Holanda, Quito" />
                 </UiBox>
                 <UiBox {...{}}>
                   <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"}}>Ciudad</UiLabel>
                   <UiInput type="text" value={formData.ciudad || ''} onChange={e => setFormData({...formData, ciudad: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="Ej. Quito" />
                 </UiBox>
               </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"}}>Correo Electrónico (Notificación SRI)</UiLabel>
                <UiInput type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} {...{"size":"2","className":"w-full"}} placeholder="correo@ejemplo.com" />
              </UiBox>

              {!forcedType && (
                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"block mb-1.5 ml-1"}}>Tipo de Relación</UiLabel>
                  <UiSelect value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} {...mergeThemeProps({}, {"className":"cursor-pointer"}, {"size":"2","className":"w-full"})}>
                    <option value="cliente" {...{"style":{"color":"var(--gray-12)"}}}>Cliente</option>
                    <option value="proveedor" {...{"style":{"color":"var(--gray-12)"}}}>Proveedor</option>
                  </UiSelect>
                </UiBox>
              )}

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
                  Guardar Persona
                </UiButton>
              </UiBox>
            </form>
          </UiBox>
        </UiBox>
      )}
    </UiBox>
  );
}
