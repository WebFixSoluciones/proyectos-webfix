import { useState, useMemo } from 'react';
import { 
  Briefcase, Plus, Search, Tag, Globe, Clock, ShieldCheck, 
  Layers, Edit2, Trash2, RefreshCw, AlertCircle, FolderOpen,
  DollarSign, Sparkles, CheckCircle, SlidersHorizontal
} from 'lucide-react';
import { UiBox, UiCard, UiHeading, UiText } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { Badge } from '../ui/badge';
import { Product } from '../../modules/inventory/domain/schemas/product.schema';
import { Category } from '../../modules/inventory/domain/schemas/category-brand.schema';

interface ServicesViewProps {
  services: Product[];
  categories: Category[];
  loading: boolean;
  onNewService: () => void;
  onEditService: (service: Product) => void;
  onDeleteService: (id: string) => void;
  onReactivateService: (id: string) => void;
  onOpenCategories: () => void;
}

export default function ServicesView({
  services,
  categories,
  loading,
  onNewService,
  onEditService,
  onDeleteService,
  onReactivateService,
  onOpenCategories
}: ServicesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedKind, setSelectedKind] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');

  // KPI calculations
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter(s => s.status !== 'INACTIVE').length;
    const digital = services.filter(s => s.isDigital || s.serviceKind === 'DIGITAL').length;
    const categoryIds = new Set(services.map(s => s.categoryId).filter(Boolean));
    return { total, active, digital, categoriesCount: categoryIds.size };
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    const seenIds = new Set<string>();
    return services.filter(s => {
      if (!s || !s.id) return false;
      if (seenIds.has(s.id)) return false;
      seenIds.add(s.id);

      const sStatus = s.status || 'ACTIVE';
      if (statusFilter === 'ACTIVE' && sStatus === 'INACTIVE') return false;
      if (statusFilter === 'INACTIVE' && sStatus !== 'INACTIVE') return false;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (s.name || '').toLowerCase().includes(q) || 
        (s.sku || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q);

      const matchesCategory = !selectedCategory || s.categoryId === selectedCategory;
      const matchesKind = !selectedKind || 
        (selectedKind === 'DIGITAL' && (s.isDigital || s.serviceKind === 'DIGITAL')) ||
        s.serviceKind === selectedKind;

      return matchesSearch && matchesCategory && matchesKind;
    });
  }, [services, searchQuery, selectedCategory, selectedKind, statusFilter]);

  const getCategoryName = (id?: string) => {
    return categories.find(c => c.id === id)?.name || 'Sin Categoría';
  };

  const renderServiceBadge = (service: Product) => {
    const kind = service.serviceKind || (service.isDigital ? 'DIGITAL' : 'PRESENCIAL');
    switch (kind) {
      case 'DIGITAL':
        return <Badge variant="soft" color="blue" size="1">Digital / Online</Badge>;
      case 'CONSULTORIA':
        return <Badge variant="soft" color="purple" size="1">Consultoría</Badge>;
      case 'PRESENCIAL':
        return <Badge variant="soft" color="green" size="1">Presencial</Badge>;
      case 'MANTENIMIENTO':
        return <Badge variant="soft" color="amber" size="1">Mantenimiento</Badge>;
      case 'SUSCRIPCION':
        return <Badge variant="soft" color="indigo" size="1">Suscripción</Badge>;
      case 'MANO_DE_OBRA':
        return <Badge variant="soft" color="cyan" size="1">Mano de Obra</Badge>;
      default:
        return <Badge variant="soft" color="gray" size="1">Servicio</Badge>;
    }
  };

  return (
    <UiBox className="w-full h-full flex flex-col space-y-5 animate-in fade-in duration-300">
      
      {/* KPI Cards Grid */}
      <UiBox className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <UiCard className="p-3.5 flex items-center gap-3 border border-[var(--gray-a4)] bg-[var(--color-panel-solid)]">
          <UiBox style={{ borderRadius: "var(--radius-2)", backgroundColor: "var(--indigo-3)", color: "var(--indigo-11)" }} className="p-2 shrink-0">
            <Briefcase size={18} />
          </UiBox>
          <UiBox>
            <UiText size="1" color="gray" weight="medium">Total Servicios</UiText>
            <UiHeading size="4" weight="bold" color="gray" highContrast>{stats.total}</UiHeading>
          </UiBox>
        </UiCard>

        <UiCard className="p-3.5 flex items-center gap-3 border border-[var(--gray-a4)] bg-[var(--color-panel-solid)]">
          <UiBox style={{ borderRadius: "var(--radius-2)", backgroundColor: "var(--green-3)", color: "var(--green-11)" }} className="p-2 shrink-0">
            <CheckCircle size={18} />
          </UiBox>
          <UiBox>
            <UiText size="1" color="gray" weight="medium">Servicios Activos</UiText>
            <UiHeading size="4" weight="bold" color="gray" highContrast>{stats.active}</UiHeading>
          </UiBox>
        </UiCard>

        <UiCard className="p-3.5 flex items-center gap-3 border border-[var(--gray-a4)] bg-[var(--color-panel-solid)]">
          <UiBox style={{ borderRadius: "var(--radius-2)", backgroundColor: "var(--blue-3)", color: "var(--blue-11)" }} className="p-2 shrink-0">
            <Globe size={18} />
          </UiBox>
          <UiBox>
            <UiText size="1" color="gray" weight="medium">Servicios Digitales</UiText>
            <UiHeading size="4" weight="bold" color="gray" highContrast>{stats.digital}</UiHeading>
          </UiBox>
        </UiCard>

        <UiCard className="p-3.5 flex items-center gap-3 border border-[var(--gray-a4)] bg-[var(--color-panel-solid)]">
          <UiBox style={{ borderRadius: "var(--radius-2)", backgroundColor: "var(--purple-3)", color: "var(--purple-11)" }} className="p-2 shrink-0">
            <FolderOpen size={18} />
          </UiBox>
          <UiBox>
            <UiText size="1" color="gray" weight="medium">Categorías Utilizadas</UiText>
            <UiHeading size="4" weight="bold" color="gray" highContrast>{stats.categoriesCount}</UiHeading>
          </UiBox>
        </UiCard>
      </UiBox>

      {/* Toolbar & Filters */}
      <UiBox className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <UiBox className="flex flex-wrap items-center gap-2">
          <UiButton
            onClick={onNewService}
            variant="solid"
            color="blue"
            size="2"
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Nuevo Servicio
          </UiButton>
          <UiButton
            onClick={onOpenCategories}
            variant="soft"
            color="gray"
            size="2"
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Tag size={14} /> Categorías
          </UiButton>
        </UiBox>

        <UiBox className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <UiBox className="w-full sm:w-60">
            <UiInput
              type="text"
              placeholder="Buscar por código, nombre o detalle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
              size="2"
            />
          </UiBox>

          <UiSelect
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            size="2"
            color="gray"
            className="cursor-pointer"
          >
            <option value="">Todas las Categorías</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </UiSelect>

          <UiSelect
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            size="2"
            color="gray"
            className="cursor-pointer"
          >
            <option value="">Todas las Modalidades</option>
            <option value="DIGITAL">Digital / Software</option>
            <option value="CONSULTORIA">Consultoría / Asesoría</option>
            <option value="PRESENCIAL">Presencial / En Sitio</option>
            <option value="MANTENIMIENTO">Mantenimiento / Soporte</option>
            <option value="SUSCRIPCION">Suscripción</option>
            <option value="MANO_DE_OBRA">Mano de Obra</option>
          </UiSelect>

          <UiSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ACTIVE' | 'INACTIVE' | 'ALL')}
            size="2"
            color="gray"
            className="cursor-pointer font-medium"
          >
            <option value="ACTIVE">Solo Activos</option>
            <option value="INACTIVE">Solo Inactivos</option>
            <option value="ALL">Todos los Estados</option>
          </UiSelect>
        </UiBox>
      </UiBox>

      {/* Services Table */}
      <UiBox style={{ borderRadius: "var(--radius-3)", border: "1px solid var(--gray-a6)", backgroundColor: "var(--color-panel-solid)" }} className="overflow-hidden">
        <UiBox className="overflow-x-auto custom-scrollbar">
          <UiTable className="w-full text-left whitespace-nowrap">
            <UiTableHeader style={{ backgroundColor: "var(--gray-2)", color: "var(--gray-12)" }}>
              <UiTableRow>
                <UiTableHead className="px-5 py-3 text-xs font-semibold">Código SKU</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-semibold">Servicio</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-semibold">Modalidad</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-semibold">Categoría</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-semibold">Costo Base</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-semibold">Precio PVP</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-semibold">IVA SRI</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-semibold">Unidad</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-semibold">Estado</UiTableHead>
                <UiTableHead className="px-5 py-3 text-xs font-semibold text-center">Acciones</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              {loading ? (
                <UiTableRow>
                  <UiTableCell colSpan={10} style={{ color: "var(--gray-11)" }} className="px-6 py-8 text-center">
                    Cargando catálogo de servicios...
                  </UiTableCell>
                </UiTableRow>
              ) : filteredServices.length === 0 ? (
                <UiTableRow>
                  <UiTableCell colSpan={10} style={{ color: "var(--gray-11)" }} className="px-6 py-10 text-center">
                    <UiBox className="flex flex-col items-center justify-center gap-2">
                      <Briefcase size={28} className="text-[var(--gray-9)]" />
                      <UiText size="2" weight="medium" color="gray">No se encontraron servicios registrados</UiText>
                      <UiText size="1" color="gray">Haz clic en "Nuevo Servicio" para agregar servicios digitales o presenciales.</UiText>
                    </UiBox>
                  </UiTableCell>
                </UiTableRow>
              ) : (
                filteredServices.map(s => {
                  const salePrice = Number(s.priceA && s.priceA > 0 ? s.priceA : (s.salePrice ?? s.price ?? 0));
                  const baseCost = Number(s.baseCost ?? s.cost ?? 0);
                  const isInactive = s.status === 'INACTIVE';

                  return (
                    <UiTableRow key={s.id} className="hover:bg-[var(--gray-a2)] transition-colors">
                      {/* SKU */}
                      <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-12)" }} className="px-5 py-3 font-semibold text-xs">
                        {s.sku}
                      </UiTableCell>

                      {/* Nombre y descripción */}
                      <UiTableCell className="px-5 py-2.5">
                        <UiBox className="min-w-0 max-w-[260px]">
                          <UiText weight="bold" color="gray" highContrast className="block truncate text-[13px]">
                            {s.name}
                          </UiText>
                          {s.description && (
                            <UiText as="p" size="1" color="gray" className="truncate text-xs text-[var(--gray-10)] mt-0.5">
                              {s.description}
                            </UiText>
                          )}
                          {s.deliveryFormat && (
                            <UiText as="p" size="1" color="blue" className="truncate text-[11px] mt-0.5">
                              {s.deliveryFormat}
                            </UiText>
                          )}
                        </UiBox>
                      </UiTableCell>

                      {/* Modalidad Badge */}
                      <UiTableCell className="px-5 py-3">
                        {renderServiceBadge(s)}
                      </UiTableCell>

                      {/* Categoría */}
                      <UiTableCell style={{ color: "var(--gray-11)" }} className="px-5 py-3 text-xs font-medium">
                        {getCategoryName(s.categoryId)}
                      </UiTableCell>

                      {/* Costo Base */}
                      <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--gray-11)" }} className="px-5 py-3 text-xs">
                        ${baseCost.toFixed(2)}
                      </UiTableCell>

                      {/* Precio Venta PVP */}
                      <UiTableCell style={{ fontFamily: "var(--code-font-family)", color: "var(--green-11)" }} className="px-5 py-3 font-semibold text-xs">
                        ${salePrice.toFixed(2)}
                      </UiTableCell>

                      {/* IVA SRI */}
                      <UiTableCell style={{ color: "var(--gray-11)" }} className="px-5 py-3 text-xs">
                        {s.taxRate ?? 15}%
                      </UiTableCell>

                      {/* Unidad */}
                      <UiTableCell style={{ color: "var(--gray-11)" }} className="px-5 py-3 text-xs capitalize">
                        {s.unit || 'servicio'}
                      </UiTableCell>

                      {/* Estado */}
                      <UiTableCell className="px-5 py-3">
                        {isInactive ? (
                          <Badge variant="soft" color="red" size="1">Inactivo</Badge>
                        ) : (
                          <Badge variant="soft" color="green" size="1">Activo</Badge>
                        )}
                      </UiTableCell>

                      {/* Acciones */}
                      <UiTableCell className="px-5 py-3 text-center">
                        <UiBox className="flex items-center justify-center gap-1.5">
                          <UiButton
                            iconOnly
                            onClick={() => onEditService(s)}
                            variant="soft"
                            color="blue"
                            size="1"
                            title="Editar Servicio"
                          >
                            <Edit2 size={13} />
                          </UiButton>

                          {isInactive ? (
                            <UiButton
                              iconOnly
                              variant="soft"
                              color="green"
                              size="1"
                              onClick={() => s.id && onReactivateService(s.id)}
                              title="Reactivar Servicio"
                            >
                              <RefreshCw size={13} />
                            </UiButton>
                          ) : (
                            <UiButton
                              iconOnly
                              variant="soft"
                              color="red"
                              size="1"
                              onClick={() => s.id && onDeleteService(s.id)}
                              title="Desactivar o Eliminar Servicio"
                            >
                              <Trash2 size={13} />
                            </UiButton>
                          )}
                        </UiBox>
                      </UiTableCell>
                    </UiTableRow>
                  );
                })
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      </UiBox>
    </UiBox>
  );
}
