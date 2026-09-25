import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTextarea } from '../ui/controls';
import React, { useState, useEffect } from 'react';
import { 
  Briefcase, DollarSign, Tag, Save, X, 
  Percent, FileText, AlertCircle, FolderOpen,
  Globe, Clock, Sparkles, Layers, ShieldCheck
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { categoryBrandRepository } from '../../modules/inventory/repositories/CategoryBrandRepository';
import { Category } from '../../modules/inventory/domain/schemas/category-brand.schema';

interface ServiceCreationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  isInline?: boolean;
  serviceToEdit?: any;
  onOpenCategories?: () => void;
}

const SERVICE_KINDS = [
  { id: 'DIGITAL', label: 'Digital / Software / Licencia', icon: Globe, color: 'blue' },
  { id: 'CONSULTORIA', label: 'Consultoría / Asesoría', icon: Briefcase, color: 'purple' },
  { id: 'PRESENCIAL', label: 'Presencial / En Sitio', icon: Layers, color: 'green' },
  { id: 'MANTENIMIENTO', label: 'Mantenimiento / Soporte Técnico', icon: ShieldCheck, color: 'amber' },
  { id: 'SUSCRIPCION', label: 'Suscripción / Membresía', icon: Clock, color: 'indigo' },
  { id: 'MANO_DE_OBRA', label: 'Mano de Obra / Instalación', icon: Briefcase, color: 'cyan' },
  { id: 'OTRO', label: 'Otro Servicio', icon: Tag, color: 'gray' },
];

export default function ServiceCreationForm({ 
  onClose, 
  onSuccess,
  isInline = false,
  serviceToEdit = null,
  onOpenCategories
}: ServiceCreationFormProps) {
  const [formData, setFormData] = useState({
    sku: serviceToEdit?.sku || '',
    name: serviceToEdit?.name || '',
    description: serviceToEdit?.description || '',
    type: 'SERVICE',
    serviceKind: serviceToEdit?.serviceKind || 'DIGITAL',
    deliveryFormat: serviceToEdit?.deliveryFormat || '',
    estimatedDuration: serviceToEdit?.estimatedDuration || '',
    serviceTerms: serviceToEdit?.serviceTerms || '',
    billingCycle: serviceToEdit?.billingCycle || 'UNICO',
    isDigital: serviceToEdit?.isDigital ?? (serviceToEdit?.serviceKind === 'DIGITAL'),
    categoryId: serviceToEdit?.categoryId || '',
    baseCost: serviceToEdit?.baseCost || 0,
    marginPercentage: serviceToEdit?.marginPercentage || 50,
    taxRate: serviceToEdit?.taxRate ?? 15,
    priceA: serviceToEdit?.priceA ?? 0,
    priceB: serviceToEdit?.priceB ?? 0,
    priceC: serviceToEdit?.priceC ?? 0,
    priceASinImpuesto: serviceToEdit?.priceASinImpuesto ?? 0,
    priceBSinImpuesto: serviceToEdit?.priceBSinImpuesto ?? 0,
    priceCSinImpuesto: serviceToEdit?.priceCSinImpuesto ?? 0,
    tax_mode: serviceToEdit?.tax_mode || 'EXCLUIDO',
    unit: serviceToEdit?.unit || 'servicio',
    showInSales: serviceToEdit?.showInSales !== false,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await categoryBrandRepository.getCategories();
        setCategories(cats.filter(c => c.status === 'ACTIVE'));
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    }
    loadCategories();
  }, []);

  // Derived pricing calculations
  const calculatedSalePrice = Number(formData.priceASinImpuesto) > 0 
    ? Number(formData.priceASinImpuesto) 
    : formData.baseCost * (1 + formData.marginPercentage / 100);

  const finalPriceWithTax = formData.tax_mode === 'INCLUIDO' 
    ? calculatedSalePrice 
    : calculatedSalePrice * (1 + formData.taxRate / 100);

  const netPrice = formData.tax_mode === 'INCLUIDO' 
    ? calculatedSalePrice / (1 + formData.taxRate / 100) 
    : calculatedSalePrice;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value
      };
      if (name === 'serviceKind') {
        updated.isDigital = value === 'DIGITAL';
      }
      return updated;
    });
  };

  const handleGenerateSku = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const prefix = formData.serviceKind === 'DIGITAL' ? 'SRV-DIG' : 'SRV';
    setFormData(prev => ({ ...prev, sku: `${prefix}-${randomCode}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      type: 'SERVICE' as const,
      inventoryType: 'VIRTUAL' as const,
      isDigital: formData.serviceKind === 'DIGITAL',
      salePrice: Number(netPrice.toFixed(2)),
      priceA: Number(finalPriceWithTax.toFixed(2)),
      priceASinImpuesto: Number(netPrice.toFixed(2)),
      priceB: Number(formData.priceB) || 0,
      priceBSinImpuesto: Number(formData.priceBSinImpuesto) || 0,
      priceC: Number(formData.priceC) || 0,
      priceCSinImpuesto: Number(formData.priceCSinImpuesto) || 0,
      tax_mode: formData.tax_mode as 'EXCLUIDO' | 'INCLUIDO',
      taxRate: Number(formData.taxRate),
      tarifa_iva: Number(formData.taxRate) / 100,
      unit: formData.unit,
      showInSales: formData.showInSales,
    };

    try {
      if (serviceToEdit && serviceToEdit.id) {
        await productRepository.update(serviceToEdit.id, payload);
      } else {
        await productRepository.create(payload);
      }
      onSuccess();
    } catch (err: any) {
      console.error("Error saving service:", err);
      if (err.issues && err.issues[0]?.message) {
        setError(err.issues[0].message);
      } else {
        setError(err.message || 'Error al guardar el servicio');
      }
    } finally {
      setLoading(false);
    }
  };

  const formJSX = (
    <UiBox 
      {...(isInline 
        ? mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full"}) 
        : mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar"}))}
    >
      {/* Header */}
      <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)","borderBottom":"1px solid var(--gray-a4)"},"className":"p-4 sm:p-5 flex items-center justify-between"})}>
        <UiBox className="flex items-center gap-3">
          <UiBox style={{ borderRadius: "var(--radius-3)", backgroundColor: "var(--indigo-3)", color: "var(--indigo-11)" }} className="p-2.5 shrink-0">
            <Briefcase size={20} />
          </UiBox>
          <UiBox>
            <UiHeading as="h2" size="3" weight="bold" color="gray" highContrast>
              {serviceToEdit?.id ? 'Editar Servicio' : 'Nuevo Servicio Especializado'}
            </UiHeading>
            <UiText as="p" size="1" color="gray">
              {serviceToEdit?.id 
                ? 'Actualiza las tarifas, categoría y modalidad de prestación del servicio' 
                : 'Registra un servicio digital, profesional o presencial para venta y facturación'}
            </UiText>
          </UiBox>
        </UiBox>
        <UiButton 
          iconOnly
          onClick={onClose}
          variant="soft"
          color="gray"
          size="2"
          title="Cerrar formulario"
        >
          <X size={16} />
        </UiButton>
      </UiCard>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
        
        {error && (
          <UiBox style={{ borderRadius: "var(--radius-3)", border: "1px solid var(--red-a6)", backgroundColor: "var(--red-3)", color: "var(--red-11)" }} className="flex items-center gap-3 p-4">
            <AlertCircle size={18} className="shrink-0 text-[var(--red-9)]" />
            <UiText as="p" size="2" weight="medium">{error}</UiText>
          </UiBox>
        )}

        {/* Modalidad de Servicio (Selector Rápido) */}
        <UiBox>
          <UiLabel size="1" weight="bold" color="gray" className="block mb-2">
            Tipo o Modalidad de Servicio *
          </UiLabel>
          <UiBox className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {SERVICE_KINDS.map(kind => {
              const isSelected = formData.serviceKind === kind.id;
              const IconComp = kind.icon;
              return (
                <button
                  key={kind.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    serviceKind: kind.id, 
                    isDigital: kind.id === 'DIGITAL' 
                  }))}
                  style={{
                    borderRadius: "var(--radius-3)",
                    border: isSelected ? "1.5px solid var(--indigo-9)" : "1px solid var(--gray-a5)",
                    backgroundColor: isSelected ? "var(--indigo-3)" : "var(--gray-2)",
                    color: isSelected ? "var(--indigo-12)" : "var(--gray-11)",
                  }}
                  className="p-2.5 flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:border-[var(--gray-a7)] cursor-pointer"
                >
                  <IconComp size={16} className={isSelected ? "text-[var(--indigo-9)]" : "text-[var(--gray-10)]"} />
                  <span className="text-[11px] font-medium leading-tight">{kind.label.split('/')[0].trim()}</span>
                </button>
              );
            })}
          </UiBox>
        </UiBox>

        {/* Información Básica */}
        <UiBox className="space-y-4">
          <UiHeading as="h3" size="2" weight="bold" color="blue" className="flex items-center gap-2">
            <Briefcase size={15} /> Información Principal
          </UiHeading>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* SKU con generador automático */}
            <UiBox>
              <UiBox className="flex items-center justify-between mb-1.5">
                <UiLabel size="1" weight="bold" color="gray">Código / SKU *</UiLabel>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-[11px] font-semibold text-[var(--accent-11)] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Generar código automático"
                >
                  <Sparkles size={11} /> Auto SKU
                </button>
              </UiBox>
              <UiInput
                type="text"
                name="sku"
                required
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="Ej. SERV-1024"
                iconPrefix={<Tag size={14} className="text-[var(--gray-10)]" />}
                size="2"
                className="w-full font-mono uppercase text-[13px]"
              />
            </UiBox>

            {/* Nombre del Servicio */}
            <UiBox className="sm:col-span-1 lg:col-span-2">
              <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">Nombre del Servicio *</UiLabel>
              <UiInput
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej. Desarrollo Web a Medida / Soporte Técnico Mensual"
                iconPrefix={<Briefcase size={14} className="text-[var(--gray-10)]" />}
                size="2"
                className="w-full text-[13px]"
              />
            </UiBox>

            {/* Categoría existente vinculada */}
            <UiBox>
              <UiBox className="flex items-center justify-between mb-1.5">
                <UiLabel size="1" weight="bold" color="gray">Categoría del Servicio</UiLabel>
                {onOpenCategories && (
                  <button
                    type="button"
                    onClick={onOpenCategories}
                    className="text-[11px] font-semibold text-[var(--gray-11)] hover:text-[var(--accent-11)] cursor-pointer"
                  >
                    + Gestionar
                  </button>
                )}
              </UiBox>
              <UiSelect
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                size="2"
                color="gray"
                className="w-full cursor-pointer"
              >
                <option value="">Sin Categoría Asignada</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </UiSelect>
            </UiBox>

            {/* Unidad de Cobro */}
            <UiBox>
              <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">Unidad de Cobro</UiLabel>
              <UiSelect 
                name="unit" 
                value={formData.unit} 
                onChange={handleInputChange}
                size="2"
                color="gray"
                className="w-full cursor-pointer"
              >
                <option value="servicio">Por Servicio</option>
                <option value="hora">Por Hora</option>
                <option value="proyecto">Por Proyecto</option>
                <option value="mes">Por Mes / Mensualidad</option>
                <option value="año">Por Año / Anualidad</option>
                <option value="licencia">Por Licencia</option>
                <option value="usuario">Por Usuario / Asiento</option>
                <option value="visita">Por Visita Técnica</option>
                <option value="paquete">Por Paquete / Combo</option>
              </UiSelect>
            </UiBox>

            {/* Tiempo Estimado / Entrega */}
            <UiBox>
              <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">Tiempo Estimado / Plazo</UiLabel>
              <UiInput
                type="text"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleInputChange}
                placeholder="Ej. Inmediato, 24-48h, 5 días"
                iconPrefix={<Clock size={14} className="text-[var(--gray-10)]" />}
                size="2"
                className="w-full text-[13px]"
              />
            </UiBox>

            {/* Formato de entrega / Acceso digital */}
            <UiBox className="sm:col-span-2 lg:col-span-3">
              <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">
                {formData.serviceKind === 'DIGITAL' 
                  ? 'Formato de entrega / Enlace o plataforma digital (Opcional)' 
                  : 'Lugar o modalidad de prestación (Opcional)'}
              </UiLabel>
              <UiInput
                type="text"
                name="deliveryFormat"
                value={formData.deliveryFormat}
                onChange={handleInputChange}
                placeholder={formData.serviceKind === 'DIGITAL' 
                  ? "Ej. Descarga directa, credenciales por email, acceso a portal web, Google Meet" 
                  : "Ej. En instalaciones del cliente, Taller central, Remoto vía AnyDesk"}
                size="2"
                className="w-full text-[13px]"
              />
            </UiBox>

            {/* Descripción del servicio */}
            <UiBox className="sm:col-span-2 lg:col-span-3">
              <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">Descripción y Alcance del Servicio</UiLabel>
              <UiTextarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detalla qué incluye el servicio, garantías y condiciones para el cliente..."
                rows={2}
                className="w-full text-[13px] resize-none"
              />
            </UiBox>
          </UiBox>
        </UiBox>

        <UiBox style={{ backgroundColor: "var(--gray-a4)" }} className="w-full h-px" />

        {/* Sección Precios y Tarifas SRI */}
        <UiBox className="space-y-4">
          <UiHeading as="h3" size="2" weight="bold" color="green" className="flex items-center gap-2">
            <DollarSign size={15} /> Tarifas, Costos e Impuestos (SRI Ecuador)
          </UiHeading>

          <UiBox className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Costo de Prestación */}
            <UiBox>
              <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">Costo de Prestación / Base ($)</UiLabel>
              <UiInput
                type="number"
                name="baseCost"
                min="0"
                step="0.01"
                required
                value={formData.baseCost}
                onChange={handleInputChange}
                iconPrefix={<DollarSign size={14} className="text-[var(--gray-10)]" />}
                size="2"
                className="w-full font-mono text-[13px]"
              />
            </UiBox>

            {/* Margen de Ganancia */}
            <UiBox>
              <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">Margen de Ganancia (%)</UiLabel>
              <UiInput
                type="number"
                name="marginPercentage"
                min="0"
                step="1"
                required
                value={formData.marginPercentage}
                onChange={handleInputChange}
                iconPrefix={<Percent size={14} className="text-[var(--gray-10)]" />}
                size="2"
                className="w-full font-mono text-[13px]"
              />
            </UiBox>

            {/* Tarifa IVA SRI */}
            <UiBox>
              <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">Tarifa IVA SRI</UiLabel>
              <UiSelect
                name="taxRate"
                value={formData.taxRate}
                onChange={handleInputChange}
                size="2"
                color="gray"
                className="w-full cursor-pointer font-medium"
              >
                <option value={15}>IVA 15% (Tarifa General SRI)</option>
                <option value={5}>IVA 5% (Construcción / Especial)</option>
                <option value={0}>IVA 0% (Servicios Exentos / No Objeto)</option>
              </UiSelect>
            </UiBox>
          </UiBox>

          {/* Precios A / B / C */}
          <UiBox className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-3">
            <UiBox>
              <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">Modalidad de Precio</UiLabel>
              <UiSelect 
                name="tax_mode" 
                value={formData.tax_mode} 
                onChange={handleInputChange}
                size="2"
                color="gray"
                className="w-full cursor-pointer text-xs"
              >
                <option value="EXCLUIDO">Precios sin IVA</option>
                <option value="INCLUIDO">Precios con IVA incluido</option>
              </UiSelect>
            </UiBox>
            {['A', 'B', 'C'].map(tier => (
              <UiBox key={tier}>
                <UiLabel size="1" weight="bold" color="gray" className="block mb-1.5">
                  Precio {tier} ({formData.tax_mode === 'INCLUIDO' ? 'Inc. IVA' : 'Sin IVA'})
                </UiLabel>
                <UiInput 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  name={`price${tier}SinImpuesto`} 
                  value={formData[`price${tier}SinImpuesto` as keyof typeof formData] || ''} 
                  onChange={handleInputChange} 
                  size="2"
                  placeholder="0.00"
                  className="w-full font-mono text-[13px]" 
                />
              </UiBox>
            ))}
          </UiBox>

          {/* Resumen de Precios Card */}
          <UiBox 
            style={{ 
              borderRadius: "var(--radius-3)", 
              border: "1px solid var(--gray-a6)", 
              backgroundColor: "var(--gray-2)" 
            }} 
            className="mt-4 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <UiBox>
              <UiText as="p" size="1" weight="bold" color="indigo" className="mb-0.5">
                Precio Principal de Venta al Público (PVP)
              </UiText>
              <UiBox className="flex items-baseline gap-2">
                <UiText size="6" weight="bold" color="gray" highContrast className="font-mono">
                  ${finalPriceWithTax.toFixed(2)}
                </UiText>
                <Badge variant="soft" color={formData.taxRate > 0 ? "indigo" : "gray"} size="1">
                  {formData.taxRate > 0 ? `Inc. IVA ${formData.taxRate}%` : 'IVA 0%'}
                </Badge>
              </UiBox>
            </UiBox>
            <UiBox className="text-left sm:text-right space-y-0.5 text-xs text-[var(--gray-11)]">
              <div>Subtotal Neto: <span className="font-mono font-medium text-[var(--gray-12)]">${netPrice.toFixed(2)}</span></div>
              <div>IVA Calculado: <span className="font-mono font-medium text-[var(--gray-12)]">${(finalPriceWithTax - netPrice).toFixed(2)}</span></div>
              <div className="text-[var(--green-11)] font-medium">Margen Neto: ${(netPrice - formData.baseCost).toFixed(2)}</div>
            </UiBox>
          </UiBox>
        </UiBox>

        {/* Disponibilidad en Ventas */}
        <UiBox className="flex items-center gap-2 pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-[13px] text-[var(--gray-12)] font-medium">
            <input
              type="checkbox"
              name="showInSales"
              checked={formData.showInSales}
              onChange={e => setFormData(prev => ({ ...prev, showInSales: e.target.checked }))}
              className="w-4 h-4 rounded text-[var(--accent-9)] cursor-pointer"
            />
            <span>Disponible inmediatamente en Facturación Administrativa, Cotizaciones y POS</span>
          </label>
        </UiBox>

        {/* Footer Actions */}
        <UiBox className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--gray-a4)]">
          <UiButton
            type="button"
            onClick={onClose}
            disabled={loading}
            variant="soft"
            color="gray"
            size="2"
          >
            Cancelar
          </UiButton>
          <UiButton
            type="submit"
            disabled={loading}
            variant="solid"
            color="blue"
            size="2"
            className="flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <UiBox className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Guardando servicio...
              </>
            ) : (
              <>
                <Save size={15} />
                {serviceToEdit?.id ? 'Guardar Cambios' : 'Registrar Servicio'}
              </>
            )}
          </UiButton>
        </UiBox>
      </form>
    </UiBox>
  );

  if (isInline) {
    return formJSX;
  }

  return (
    <UiBox style={{ backgroundColor: "var(--black-a7)" }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {formJSX}
    </UiBox>
  );
}
