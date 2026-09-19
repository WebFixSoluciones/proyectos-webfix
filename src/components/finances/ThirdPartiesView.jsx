import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiHeading } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState } from 'react';
import { Plus, Search, Trash2, Edit2, ShieldCheck } from 'lucide-react';
import { doc, deleteDoc } from '../../services/financeStore.js';
import CustomerDetailView from './CustomerDetailView';

export default function ThirdPartiesView({ thirdParties, showToast, db, appId, forcedType }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIdType, setFilterIdType] = useState('all');
  const [filterCredit, setFilterCredit] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [selectedClient, setSelectedClient] = useState(null);

  const filtered = thirdParties.filter(tp => {
    const matchesSearch = (tp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          String(tp.ruc || '').includes(searchTerm) || 
                          (tp.direccion || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !forcedType || (forcedType === 'cliente' ? tp.type !== 'proveedor' : tp.type === forcedType);
    const matchesIdType = filterIdType === 'all' || (tp.tipoIdentificacion || 'ruc').toLowerCase() === filterIdType;
    const hasCred = !!(tp.hasCredit || (Number(tp.creditLimit || tp.limiteCredito || tp.cupoCredito || 0) > 0));
    const matchesCredit = filterCredit === 'all' || (filterCredit === 'con_credito' ? hasCred : !hasCred);
    return matchesSearch && matchesType && matchesIdType && matchesCredit;
  });

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

  // Switch to Full-Page Customer Form if in detail view
  if (viewMode === 'detail') {
    return (
      <CustomerDetailView
        client={selectedClient}
        onBack={() => {
          setSelectedClient(null);
          setViewMode('list');
        }}
        onSaved={() => {
          setSelectedClient(null);
          setViewMode('list');
        }}
        showToast={showToast}
        db={db}
        appId={appId}
        forcedType={forcedType}
      />
    );
  }

  return (
    <UiBox {...{"className":"animate-in slide-in-from-bottom-4 duration-500"}}>
      
      {/* Action Bar & Filters */}
      <UiBox {...{"className":"flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6"}}>
        <UiBox>
          <UiButton
            onClick={() => { setSelectedClient(null); setViewMode('detail'); }}
            {...{"variant":"solid","color":"blue","className":"w-full sm:w-auto shadow-sm font-semibold"}}
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

          <UiSelect
            value={filterCredit} 
            onChange={e => setFilterCredit(e.target.value)} 
            {...{"size":"2","color":"gray","className":"cursor-pointer"}}
          >
            <option value="all" {...{"style":{"color":"var(--gray-12)"}}}>Crédito: Todos</option>
            <option value="con_credito" {...{"style":{"color":"var(--gray-12)"}}}>Con Línea de Crédito</option>
            <option value="sin_credito" {...{"style":{"color":"var(--gray-12)"}}}>Sin Crédito (Contado)</option>
          </UiSelect>
        </UiBox>
      </UiBox>

      {/* Main Table */}
      <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden shadow-sm"}}>
        <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
          <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
            <UiTableHeader {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}}}>
              <UiTableRow>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Razón Social / Nombres</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Identificación</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 hidden sm:table-cell"}}>Teléfono</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Dirección Domicilio</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Correo Notificación</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Línea de Crédito</UiTableHead>
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
                const charCodeSum = tp.name ? tp.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
                const hasCredit = tp.hasCredit || (Number(tp.creditLimit || tp.limiteCredito || tp.cupoCredito || 0) > 0);
                const limit = Number(tp.creditLimit || tp.limiteCredito || tp.cupoCredito || 0);

                return (
                  <UiTableRow key={tp.id} {...{}}>
                    <UiTableCell {...{"className":"px-6 py-3.5"}}>
                      <UiBox {...{"className":"flex items-center gap-3"}}>
                        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"w-8 h-8"}, {"style":{"color":"var(--color-background)"},"className":"flex items-center justify-center font-bold text-xs"}, resolveThemeProps(colors[charCodeSum % colors.length]))}>
                          {initials}
                        </UiBox>
                        <UiBox>
                          <UiText as="p" {...{"weight":"bold","size":"1","color":"gray","highContrast":true}}>{tp.name}</UiText>
                          {tp.tradeName && <UiText as="p" {...{"size":"1","color":"gray"}}>{tp.tradeName}</UiText>}
                        </UiBox>
                      </UiBox>
                    </UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>
                      <UiText {...{"size":"1","color":"gray","weight":"bold","className":"block opacity-85"}}>{(tp.tipoIdentificacion || 'ruc').toUpperCase()}</UiText>
                      <UiText {...{"color":"gray","highContrast":true,"weight":"bold"}}>{tp.ruc}</UiText>
                    </UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5 hidden sm:table-cell"}}>{tp.telefono || tp.celular || '-'}</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5 max-w-[220px] truncate"}} title={tp.direccion}>
                       {tp.direccion || '-'}
                       {tp.ciudad && <UiText {...{"size":"1","color":"gray","weight":"bold","className":"block mt-0.5"}}>{tp.ciudad}</UiText>}
                     </UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--blue-12)"},"className":"px-6 py-3.5 hover:underline"}}><a href={`mailto:${tp.email}`}>{tp.email || '-'}</a></UiTableCell>
                    
                    {/* Credit Status Column */}
                    <UiTableCell {...{"className":"px-6 py-3.5"}}>
                      {hasCredit ? (
                        <UiBox {...{"className":"flex items-center gap-2"}}>
                          <ShieldCheck size={16} className="text-green-600 shrink-0" />
                          <UiBox>
                            <UiText {...{"size":"1","weight":"bold","color":"green"}}>
                              ${limit.toFixed(2)}
                            </UiText>
                            <UiText {...{"size":"1","color":"gray","className":"block text-[11px]"}}>
                              Plazo: {tp.paymentDays || tp.diasCredito || 30}d
                            </UiText>
                          </UiBox>
                        </UiBox>
                      ) : (
                        <UiText {...{"size":"1","color":"gray","className":"italic opacity-70"}}>
                          Sin Crédito
                        </UiText>
                      )}
                    </UiTableCell>

                    <UiTableCell {...{"className":"px-6 py-3.5 text-right"}}>
                      <UiBox {...{"className":"flex items-center justify-end gap-1.5"}}>
                        <UiButton iconOnly
                          onClick={() => { setSelectedClient(tp); setViewMode('detail'); }} 
                          variant="soft"
                          color="blue"
                          size="1"
                          title="Ver Ficha y Crédito"
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
                  <UiTableCell colSpan="7" {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-12 text-center italic"}}>No se encontraron registros de personas o clientes con los filtros aplicados.</UiTableCell>
                </UiTableRow>
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      </UiBox>
    </UiBox>
  );
}
