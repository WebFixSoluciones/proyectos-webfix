import { useState, useEffect, useMemo } from 'react';
import { UiBox, UiText, UiHeading, UiCard } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { Badge } from '../ui/badge';
import { 
  Plus, Search, Trash2, Edit2, ShieldCheck, Users, Building2, 
  CreditCard, Clock, CheckCircle2, Phone, Mail, MapPin, X
} from 'lucide-react';
import { doc, deleteDoc } from '../../services/financeStore.js';
import CustomerDetailView from './CustomerDetailView';

export default function ThirdPartiesView({ 
  thirdParties = [], 
  transactions = [], 
  showToast, 
  db, 
  appId, 
  forcedType = 'cliente' 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIdType, setFilterIdType] = useState('all');
  const [filterCredit, setFilterCredit] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [selectedClient, setSelectedClient] = useState(null);

  const isSupplierView = forcedType === 'proveedor';

  // Reset detail view when forcedType (sidebar navigation) changes
  useEffect(() => {
    setViewMode('list');
    setSelectedClient(null);
  }, [forcedType]);

  // Filtered contacts list
  const filtered = useMemo(() => {
    return (thirdParties || []).filter(tp => {
      if (!tp) return false;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        (tp.name || '').toLowerCase().includes(q) || 
        (tp.tradeName || '').toLowerCase().includes(q) || 
        (tp.razonSocial || '').toLowerCase().includes(q) ||
        String(tp.ruc || '').includes(q) || 
        (tp.direccion || '').toLowerCase().includes(q) ||
        (tp.ciudad || '').toLowerCase().includes(q) ||
        (tp.email || '').toLowerCase().includes(q) ||
        (tp.telefono || '').includes(q) ||
        (tp.celular || '').includes(q);

      const matchesType = !forcedType 
        ? true 
        : isSupplierView
          ? (tp.type === 'proveedor' || tp.type === 'ambos')
          : (tp.type === 'cliente' || tp.type === 'ambos' || !tp.type || tp.type !== 'proveedor');

      const matchesIdType = filterIdType === 'all' || (tp.tipoIdentificacion || 'ruc').toLowerCase() === filterIdType;

      const hasCred = !!(
        tp.hasCredit || 
        Number(tp.creditLimit || tp.limiteCredito || tp.cupoCredito || 0) > 0 ||
        Number(tp.paymentDays || tp.diasCredito || 0) > 0
      );
      const matchesCredit = filterCredit === 'all' 
        ? true 
        : filterCredit === 'con_credito' ? hasCred : !hasCred;

      return matchesSearch && matchesType && matchesIdType && matchesCredit;
    });
  }, [thirdParties, searchTerm, forcedType, isSupplierView, filterIdType, filterCredit]);

  const handleDelete = async (id, name) => {
    const targetLabel = isSupplierView ? 'este proveedor' : 'este cliente';
    if (window.confirm(`¿Seguro que deseas eliminar el registro de "${name || targetLabel}"?`)) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', id));
        showToast?.('Registro eliminado con éxito', 'success');
      } catch (err) {
        console.error('Error al eliminar registro:', err);
        showToast?.('Error al eliminar el registro', 'error');
      }
    }
  };

  // Switch to Full-Page Customer/Supplier Form if in detail view
  if (viewMode === 'detail') {
    return (
      <CustomerDetailView
        client={selectedClient}
        transactions={transactions}
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

  const hasActiveFilters = searchTerm !== '' || filterIdType !== 'all' || filterCredit !== 'all';

  return (
    <UiBox className="space-y-4 animate-in fade-in duration-300 pb-8">
      {/* Top Header Card */}
      <UiCard className="flex items-center justify-between px-4 py-3 bg-[var(--color-panel-solid)] rounded-lg">
        <UiHeading as="h2" size="4" weight="bold" color="gray" highContrast>
          {isSupplierView ? 'Gestión de Proveedores' : 'Gestión de Clientes'}
        </UiHeading>
        <UiButton
          onClick={() => { setSelectedClient(null); setViewMode('detail'); }}
          variant="solid"
          color="blue"
          size="2"
          className="font-medium cursor-pointer flex items-center gap-1.5"
        >
          <Plus size={15} /> Nuevo {isSupplierView ? 'Proveedor' : 'Cliente'}
        </UiButton>
      </UiCard>

      {/* Filter & Search Bar */}
      <UiBox className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[var(--color-panel-solid)] border border-[var(--gray-a5)] rounded-lg">
        <UiBox className="flex-1 max-w-md">
          <UiInput
            type="text" 
            placeholder={
              isSupplierView 
                ? "Buscar proveedor por razón social, nombre o RUC..." 
                : "Buscar cliente por razón social, nombre o RUC..."
            } 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
            size="2"
            className="w-full"
          />
        </UiBox>

        <UiBox className="flex items-center gap-2 flex-wrap">
          <UiSelect
            value={filterIdType} 
            onChange={e => setFilterIdType(e.target.value)} 
            size="2"
            className="cursor-pointer min-w-[150px]"
          >
            <option value="all">Identificación: Todos</option>
            <option value="ruc">RUC</option>
            <option value="cedula">Cédula</option>
            <option value="pasaporte">Pasaporte</option>
            {!isSupplierView && <option value="consumidor_final">Consumidor Final</option>}
          </UiSelect>

          <UiSelect
            value={filterCredit} 
            onChange={e => setFilterCredit(e.target.value)} 
            size="2"
            className="cursor-pointer min-w-[160px]"
          >
            {isSupplierView ? (
              <>
                <option value="all">Condición: Todas</option>
                <option value="con_credito">Con Plazo / Crédito</option>
                <option value="sin_credito">Pago Contado</option>
              </>
            ) : (
              <>
                <option value="all">Crédito: Todos</option>
                <option value="con_credito">Con Línea de Crédito</option>
                <option value="sin_credito">Sin Crédito (Contado)</option>
              </>
            )}
          </UiSelect>

          {hasActiveFilters && (
            <UiButton
              variant="soft"
              color="gray"
              size="2"
              onClick={() => {
                setSearchTerm('');
                setFilterIdType('all');
                setFilterCredit('all');
              }}
              className="cursor-pointer"
            >
              <X size={14} /> Limpiar
            </UiButton>
          )}
        </UiBox>
      </UiBox>

      {/* Main Table */}
      <UiBox 
        style={{ 
          borderRadius: "var(--radius-3)", 
          border: "1px solid var(--gray-a6)", 
          backgroundColor: "var(--color-panel-solid)" 
        }} 
        className="overflow-hidden"
      >
        <UiBox className="overflow-x-auto custom-scrollbar">
          <UiTable className="w-full text-left whitespace-nowrap">
            <UiTableHeader style={{ backgroundColor: "var(--gray-2)", color: "var(--gray-12)" }}>
              <UiTableRow>
                <UiTableHead className="px-5 py-3 text-xs font-bold uppercase tracking-wider">
                  {isSupplierView ? 'Proveedor / Razón Social' : 'Cliente / Razón Social'}
                </UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Identificación</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-bold uppercase tracking-wider hidden sm:table-cell">Contacto</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Ubicación</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-bold uppercase tracking-wider">
                  {isSupplierView ? 'Régimen Fiscal' : 'Correo Notificación'}
                </UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-bold uppercase tracking-wider">
                  {isSupplierView ? 'Términos de Pago' : 'Línea de Crédito'}
                </UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right">Acciones</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              {filtered.map(tp => {
                const initials = tp.name 
                  ? tp.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                  : (isSupplierView ? 'PR' : 'CL');

                const hasCredit = tp.hasCredit || (Number(tp.creditLimit || tp.limiteCredito || tp.cupoCredito || 0) > 0);
                const limit = Number(tp.creditLimit || tp.limiteCredito || tp.cupoCredito || 0);
                const paymentDays = Number(tp.paymentDays || tp.diasCredito || 0);

                const idTypeLabel = (tp.tipoIdentificacion || 'ruc').toUpperCase();

                return (
                  <UiTableRow key={tp.id} className="hover:bg-[var(--gray-a2)] transition-colors">
                    {/* Name & Trade Name */}
                    <UiTableCell className="px-5 py-3.5">
                      <UiBox className="flex items-center gap-3">
                        <UiBox 
                          style={{ borderRadius: "var(--radius-2)" }} 
                          className={`w-9 h-9 flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSupplierView
                              ? 'bg-[var(--purple-3)] text-[var(--purple-11)] border border-[var(--purple-6)]'
                              : 'bg-[var(--blue-3)] text-[var(--blue-11)] border border-[var(--blue-6)]'
                          }`}
                        >
                          {initials}
                        </UiBox>
                        <UiBox className="min-w-0">
                          <UiText as="p" weight="bold" size="2" color="gray" highContrast className="truncate max-w-[240px]">
                            {tp.name || tp.razonSocial || 'Sin Razón Social'}
                          </UiText>
                          {tp.tradeName && (
                            <UiText as="p" size="1" color="gray" className="truncate max-w-[240px]">
                              {tp.tradeName}
                            </UiText>
                          )}
                          {tp.type === 'ambos' && (
                            <Badge variant="soft" color="indigo" size="1" className="mt-0.5">
                              Cliente y Proveedor
                            </Badge>
                          )}
                        </UiBox>
                      </UiBox>
                    </UiTableCell>

                    {/* Identification */}
                    <UiTableCell className="px-5 py-3.5">
                      <UiBox className="space-y-0.5">
                        <Badge 
                          variant="soft" 
                          color={idTypeLabel === 'RUC' ? 'blue' : idTypeLabel === 'CEDULA' ? 'teal' : 'gray'} 
                          size="1"
                        >
                          {idTypeLabel}
                        </Badge>
                        <UiText size="2" color="gray" highContrast weight="bold" className="block font-mono">
                          {tp.ruc || '-'}
                        </UiText>
                      </UiBox>
                    </UiTableCell>

                    {/* Contact (Phone / Mobile) */}
                    <UiTableCell className="px-5 py-3.5 hidden sm:table-cell">
                      <UiBox className="space-y-0.5">
                        {tp.celular || tp.telefono ? (
                          <UiBox className="flex items-center gap-1.5">
                            <Phone size={13} className="text-[var(--gray-9)] shrink-0" />
                            <UiText size="1" color="gray" highContrast>
                              {tp.celular || tp.telefono}
                            </UiText>
                          </UiBox>
                        ) : (
                          <UiText size="1" color="gray" className="italic opacity-60">Sin teléfono</UiText>
                        )}
                        {tp.email && (
                          <UiBox className="flex items-center gap-1.5 truncate max-w-[180px]">
                            <Mail size={13} className="text-[var(--gray-9)] shrink-0" />
                            <UiText size="1" color="gray" className="truncate">
                              {tp.email}
                            </UiText>
                          </UiBox>
                        )}
                      </UiBox>
                    </UiTableCell>

                    {/* Location */}
                    <UiTableCell className="px-5 py-3.5 max-w-[200px]" title={tp.direccion}>
                      <UiBox className="space-y-0.5">
                        <UiText size="1" color="gray" highContrast className="truncate block">
                          {tp.direccion || '-'}
                        </UiText>
                        {tp.ciudad && (
                          <UiBox className="flex items-center gap-1 text-[var(--gray-10)]">
                            <MapPin size={11} className="shrink-0" />
                            <UiText size="1" color="gray" weight="medium">
                              {tp.ciudad}{tp.provincia ? `, ${tp.provincia}` : ''}
                            </UiText>
                          </UiBox>
                        )}
                      </UiBox>
                    </UiTableCell>

                    {/* Dynamic Column 5: Régimen Fiscal (Proveedores) / Email (Clientes) */}
                    <UiTableCell className="px-5 py-3.5">
                      {isSupplierView ? (
                        <UiBox className="space-y-1">
                          <Badge 
                            variant="soft" 
                            color={
                              tp.tipoContribuyente === 'rimpe_popular' ? 'green' :
                              tp.tipoContribuyente === 'rimpe_emprendedor' ? 'blue' :
                              tp.tipoContribuyente === 'especial' ? 'amber' : 'gray'
                            } 
                            size="1"
                          >
                            {(tp.tipoContribuyente || 'general').replace('_', ' ').toUpperCase()}
                          </Badge>
                          {tp.obligadoContabilidad && (
                            <UiText size="1" color="gray" className="block text-xs opacity-75">
                              Contabilidad: Sí
                            </UiText>
                          )}
                        </UiBox>
                      ) : (
                        <UiBox>
                          {tp.email ? (
                            <a 
                              href={`mailto:${tp.email}`} 
                              className="text-[var(--blue-11)] hover:underline text-xs flex items-center gap-1"
                            >
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate max-w-[180px]">{tp.email}</span>
                            </a>
                          ) : (
                            <UiText size="1" color="gray" className="italic opacity-60">
                              Sin email registrado
                            </UiText>
                          )}
                        </UiBox>
                      )}
                    </UiTableCell>

                    {/* Dynamic Column 6: Línea de Crédito (Clientes) / Términos de Pago (Proveedores) */}
                    <UiTableCell className="px-5 py-3.5">
                      {isSupplierView ? (
                        paymentDays > 0 || hasCredit ? (
                          <UiBox className="flex items-center gap-2">
                            <Clock size={15} className="text-[var(--blue-10)] shrink-0" />
                            <UiBox>
                              <Badge variant="soft" color="blue" size="1">
                                Crédito: {paymentDays || 30} días
                              </Badge>
                              {limit > 0 && (
                                <UiText size="1" color="gray" className="block mt-0.5">
                                  Cupo: ${limit.toFixed(2)}
                                </UiText>
                              )}
                            </UiBox>
                          </UiBox>
                        ) : (
                          <Badge variant="soft" color="gray" size="1">
                            Pago Contado
                          </Badge>
                        )
                      ) : (
                        hasCredit ? (
                          <UiBox className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-green-600 shrink-0" />
                            <UiBox>
                              <UiText size="1" weight="bold" color="green">
                                ${limit.toFixed(2)}
                              </UiText>
                              <UiText size="1" color="gray" className="block text-xs">
                                Plazo: {paymentDays || 30}d
                              </UiText>
                            </UiBox>
                          </UiBox>
                        ) : (
                          <Badge variant="soft" color="gray" size="1">
                            Sin Crédito (Contado)
                          </Badge>
                        )
                      )}
                    </UiTableCell>

                    {/* Actions */}
                    <UiTableCell className="px-5 py-3.5 text-right">
                      <UiBox className="flex items-center justify-end gap-1.5">
                        <UiButton 
                          iconOnly
                          onClick={() => { setSelectedClient(tp); setViewMode('detail'); }} 
                          variant="soft"
                          color="blue"
                          size="1"
                          title={isSupplierView ? "Ver Ficha del Proveedor" : "Ver Ficha del Cliente"}
                          className="cursor-pointer"
                        >
                          <Edit2 size={13}/>
                        </UiButton>
                        <UiButton 
                          iconOnly
                          onClick={() => handleDelete(tp.id, tp.name)} 
                          variant="soft"
                          color="red"
                          size="1"
                          title="Eliminar Registro"
                          className="cursor-pointer"
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
                  <UiTableCell colSpan={7} className="px-6 py-12 text-center">
                    <UiBox className="flex flex-col items-center justify-center space-y-2">
                      <UiBox className="p-3 bg-[var(--gray-3)] rounded-full text-[var(--gray-9)]">
                        {isSupplierView ? <Building2 size={24} /> : <Users size={24} />}
                      </UiBox>
                      <UiHeading as="h4" size="2" weight="bold" color="gray" highContrast>
                        {hasActiveFilters 
                          ? 'No se encontraron resultados' 
                          : isSupplierView 
                            ? 'No hay proveedores registrados aún' 
                            : 'No hay clientes registrados aún'
                        }
                      </UiHeading>
                      <UiText size="1" color="gray" className="max-w-xs text-center">
                        {hasActiveFilters 
                          ? 'Prueba cambiando o limpiando los filtros de búsqueda.'
                          : isSupplierView
                            ? 'Registra tus proveedores comerciales para asociarlos a compras y retenciones.'
                            : 'Registra tus clientes para facturación electrónica rápida y control de créditos.'
                        }
                      </UiText>
                      {!hasActiveFilters && (
                        <UiButton
                          onClick={() => { setSelectedClient(null); setViewMode('detail'); }}
                          variant="solid"
                          color="blue"
                          size="2"
                          className="mt-2 font-medium cursor-pointer"
                        >
                          <Plus size={14} /> Registrar Primer {isSupplierView ? 'Proveedor' : 'Cliente'}
                        </UiButton>
                      )}
                    </UiBox>
                  </UiTableCell>
                </UiTableRow>
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      </UiBox>
    </UiBox>
  );
}
