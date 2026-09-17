import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTextarea } from '../ui/controls';
import React, { useState, useEffect } from 'react';
import { 
  Briefcase, DollarSign, Tag, Save, X, 
  Percent, FileText, AlertCircle, FolderOpen
} from 'lucide-react';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { categoryBrandRepository } from '../../modules/inventory/repositories/CategoryBrandRepository';
import { Category } from '../../modules/inventory/domain/schemas/category-brand.schema';

interface ServiceCreationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  isInline?: boolean;
  serviceToEdit?: any;
}

export default function ServiceCreationForm({ 
  onClose, 
  onSuccess,
  isInline = false,
  serviceToEdit = null
}: ServiceCreationFormProps) {
  const [formData, setFormData] = useState({
    sku: serviceToEdit?.sku || '',
    name: serviceToEdit?.name || '',
    description: serviceToEdit?.description || '',
    type: 'SERVICE',
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

  // Derived state
  const calculatedSalePrice = Number(formData.priceASinImpuesto) > 0 ? Number(formData.priceASinImpuesto) : formData.baseCost * (1 + formData.marginPercentage / 100);
  const finalPriceWithTax = formData.tax_mode === 'INCLUIDO' ? calculatedSalePrice : calculatedSalePrice * (1 + formData.taxRate / 100);
  const netPrice = formData.tax_mode === 'INCLUIDO' ? calculatedSalePrice / (1 + formData.taxRate / 100) : calculatedSalePrice;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (serviceToEdit && serviceToEdit.id) {
        await productRepository.update(serviceToEdit.id, {
          ...formData,
          type: 'SERVICE',
          salePrice: netPrice,
          priceA: finalPriceWithTax,
          priceASinImpuesto: netPrice,
          priceB: Number(formData.priceB) || 0,
          priceBSinImpuesto: Number(formData.priceBSinImpuesto) || 0,
          priceC: Number(formData.priceC) || 0,
          priceCSinImpuesto: Number(formData.priceCSinImpuesto) || 0,
          tax_mode: formData.tax_mode,
          tarifa_iva: Number(formData.taxRate) / 100,
          unit: formData.unit,
          inventoryType: 'VIRTUAL',
          showInSales: formData.showInSales,
        });
      } else {
        await productRepository.create({
          ...formData,
          type: 'SERVICE',
          salePrice: netPrice,
          priceA: finalPriceWithTax,
          priceASinImpuesto: netPrice,
          priceB: Number(formData.priceB) || 0,
          priceBSinImpuesto: Number(formData.priceBSinImpuesto) || 0,
          priceC: Number(formData.priceC) || 0,
          priceCSinImpuesto: Number(formData.priceCSinImpuesto) || 0,
          tax_mode: formData.tax_mode,
          tarifa_iva: Number(formData.taxRate) / 100,
          unit: formData.unit,
          inventoryType: 'VIRTUAL',
          showInSales: formData.showInSales,
        });
      }
      onSuccess();
    } catch (err: any) {
      console.error("Error saving service:", err);
      if (err.issues) {
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
      {...(isInline ? mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full"}) : mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar"}))}
    >
      {/* Header */}
      <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
        <UiBox {...{"className":"flex items-center gap-3"}}>
          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-2"})}>
            <Briefcase size={20} />
          </UiBox>
          <UiBox>
            <UiHeading as="h2" {...mergeThemeProps({"size":"3","weight":"bold","color":"gray","highContrast":true})}>
              {serviceToEdit?.id ? 'Editar Servicio' : 'Nuevo Servicio'}
            </UiHeading>
            <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray"})}>
              {serviceToEdit?.id ? 'Edita los detalles del servicio seleccionado' : 'Registra un nuevo servicio intangible en el catálogo'}
            </UiText>
          </UiBox>
        </UiBox>
          <UiButton iconOnly
            onClick={onClose}
            {...mergeThemeProps({"variant":"soft","color":"gray","className":"hover:scale-105"})}
          >
            <X size={18} />
          </UiButton>
        </UiCard>

        {/* Content */}
        <form onSubmit={handleSubmit} {...{"className":"p-5 sm:p-6 space-y-5"}}>
          
          {error && (
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-11)"},"className":"flex items-center gap-3 p-4"})}>
              <AlertCircle size={20} {...{"className":"shrink-0"}} />
              <UiText as="p" {...{"size":"2","weight":"medium"}}>{error}</UiText>
            </UiBox>
          )}

          {/* Información Básica */}
          <UiBox>
            <UiHeading as="h3" {...mergeThemeProps({"size":"2","weight":"bold","color":"blue","className":"flex items-center gap-2 mb-4"})}>
              <Briefcase size={16} /> Información del Servicio
            </UiHeading>
            <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-6"}}>
              
              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Código / SKU de Servicio *</UiLabel>
                <UiBox {...{"className":"relative"}}>
                  <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-11)"},"className":"absolute left-3 top-1/2 -translate-y-1/2"})}><Tag size={16} /></UiBox>
                  <UiInput
                    type="text"
                    name="sku"
                    required
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="Ej. SERV-001"
                    {...mergeThemeProps({}, {}, mergeThemeProps({"color":"gray","className":"w-full"}))}
                    style={{ paddingLeft: '36px' }}
                  />
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Nombre del Servicio *</UiLabel>
                <UiBox {...{"className":"relative"}}>
                  <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-11)"},"className":"absolute left-3 top-1/2 -translate-y-1/2"})}><Briefcase size={16} /></UiBox>
                  <UiInput
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej. Consultoría TI - Por Hora"
                    {...mergeThemeProps({}, {}, mergeThemeProps({"color":"gray","className":"w-full"}))}
                    style={{ paddingLeft: '36px' }}
                  />
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Categoría (Opcional)</UiLabel>
                <UiBox {...{"className":"relative"}}>
                  <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-11)"},"className":"absolute left-3 top-1/2 -translate-y-1/2"})}><FolderOpen size={16} /></UiBox>
                  <UiSelect
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    {...mergeThemeProps({}, {}, mergeThemeProps({"color":"gray","className":"w-full"}))}
                    style={{ paddingLeft: '36px' }}
                  >
                    <option value="">Sin Categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </UiSelect>
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"relative group md:col-span-2"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Descripción (Opcional)</UiLabel>
                <UiBox {...{"className":"relative"}}>
                  <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-11)"},"className":"absolute left-3 top-1/2 -translate-y-1/2"})}><FileText size={16} /></UiBox>
                  <UiTextarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detalles adicionales del servicio prestado..."
                    rows={3}
                    {...mergeThemeProps({}, {"className":"resize-none"}, mergeThemeProps({"color":"gray","className":"w-full"}))}
                    style={{ paddingLeft: '36px' }}
                  />
                </UiBox>
              </UiBox>
            </UiBox>
          </UiBox>

          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-4"}}>
            <UiBox>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Unidad de cobro</UiLabel>
              <UiSelect name="unit" value={formData.unit} onChange={handleInputChange} {...mergeThemeProps({"color":"gray","className":"w-full"})}>
                <option value="servicio">Servicio</option><option value="hora">Hora</option><option value="usuario">Usuario</option><option value="encuesta">Encuesta</option><option value="licencia">Licencia</option>
              </UiSelect>
            </UiBox>
            <UiLabel {...{"size":"2","color":"gray","highContrast":true,"className":"flex items-center gap-2 mt-6"}}><UiInput type="checkbox" name="showInSales" checked={formData.showInSales} onChange={e => setFormData(prev => ({ ...prev, showInSales: e.target.checked }))} /> Disponible en POS y ventas administrativas</UiLabel>
          </UiBox>

          <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"w-full h-px"}}></UiBox>

          {/* Sección Precios */}
          <UiBox>
            <UiHeading as="h3" {...mergeThemeProps({"size":"2","weight":"bold","color":"green","className":"flex items-center gap-2 mb-4"})}>
              <DollarSign size={16} /> Tarifas y Precios
            </UiHeading>
            <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6"}}>
              
              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Costo de Prestación / Base ($)</UiLabel>
                <UiBox {...{"className":"relative"}}>
                  <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-11)"},"className":"absolute left-3 top-1/2 -translate-y-1/2"})}><DollarSign size={16} /></UiBox>
                  <UiInput
                    type="number"
                    name="baseCost"
                    min="0"
                    step="0.01"
                    required
                    value={formData.baseCost}
                    onChange={handleInputChange}
                    {...mergeThemeProps({}, {}, mergeThemeProps({"color":"gray","className":"w-full"}))}
                    style={{ paddingLeft: '36px' }}
                  />
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Margen de Ganancia (%)</UiLabel>
                <UiBox {...{"className":"relative"}}>
                  <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-11)"},"className":"absolute left-3 top-1/2 -translate-y-1/2"})}><Percent size={16} /></UiBox>
                  <UiInput
                    type="number"
                    name="marginPercentage"
                    min="0"
                    step="0.1"
                    required
                    value={formData.marginPercentage}
                    onChange={handleInputChange}
                    {...mergeThemeProps({}, {}, mergeThemeProps({"color":"gray","className":"w-full"}))}
                    style={{ paddingLeft: '36px' }}
                  />
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"relative group"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Impuesto IVA (%)</UiLabel>
                <UiBox {...{"className":"relative"}}>
                  <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-11)"},"className":"absolute left-3 top-1/2 -translate-y-1/2"})}><Percent size={16} /></UiBox>
                  <UiInput
                    type="number"
                    name="taxRate"
                    min="0"
                    step="1"
                    required
                    value={formData.taxRate}
                    onChange={handleInputChange}
                    {...mergeThemeProps({}, {}, mergeThemeProps({"color":"gray","className":"w-full"}))}
                    style={{ paddingLeft: '36px' }}
                  />
                </UiBox>
              </UiBox>
            </UiBox>

            <UiBox {...{"className":"mt-5 grid grid-cols-1 md:grid-cols-4 gap-4"}}>
              <UiBox>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Modo de precio</UiLabel>
                <UiSelect name="tax_mode" value={formData.tax_mode} onChange={handleInputChange} {...mergeThemeProps({"color":"gray","className":"w-full"})}>
                  <option value="EXCLUIDO">Precio sin IVA</option>
                  <option value="INCLUIDO">Precio con IVA</option>
                </UiSelect>
              </UiBox>
              {['A', 'B', 'C'].map(tier => (
                <UiBox key={tier}>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Precio {tier} {formData.tax_mode === 'INCLUIDO' ? 'con IVA' : 'sin IVA'}</UiLabel>
                  <UiInput type="number" min="0" step="0.01" name={`price${tier}SinImpuesto`} value={formData[`price${tier}SinImpuesto`] || ''} onChange={handleInputChange} {...mergeThemeProps({"color":"gray","className":"w-full"})} placeholder="0.00" />
                </UiBox>
              ))}
            </UiBox>

            {/* Resumen de Pricing Card */}
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"mt-6 p-5 flex items-center justify-between"})}>
              <UiBox>
                <UiText as="p" {...mergeThemeProps({"size":"1","weight":"bold","color":"blue","className":"mb-1"})}>
                  Precio Final del Servicio
                </UiText>
                <UiBox {...{"className":"flex items-baseline gap-2"}}>
                  <UiText {...mergeThemeProps({"size":"7","weight":"bold","color":"gray","highContrast":true})}>
                    ${finalPriceWithTax.toFixed(2)}
                  </UiText>
                  <UiText {...mergeThemeProps({"size":"1","weight":"medium","color":"gray"})}>
                    (Inc. IVA)
                  </UiText>
                </UiBox>
              </UiBox>
              <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-11)"},"className":"text-right space-y-1"})}>
                <UiText as="p">Subtotal: ${calculatedSalePrice.toFixed(2)}</UiText>
                <UiText as="p">IVA ({formData.taxRate}%): ${(finalPriceWithTax - calculatedSalePrice).toFixed(2)}</UiText>
                <UiText as="p" {...{"color":"green"}}>
                  Margen Neto: ${(calculatedSalePrice - formData.baseCost).toFixed(2)}
                </UiText>
              </UiBox>
            </UiBox>
          </UiBox>

          {/* Submit Button */}
          <UiBox {...{"className":"pt-4 flex justify-end gap-4"}}>
            <UiButton
              type="button"
              onClick={onClose}
              disabled={loading}
              {...mergeThemeProps({"size":"2","variant":"soft","color":"gray"})}
            >
              Cancelar
            </UiButton>
            <UiButton
              type="submit"
              disabled={loading}
              {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"}}
            >
              {loading ? (
                <>
                  <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"w-5 h-5 animate-spin"}} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar Servicio
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
      <UiBox {...mergeThemeProps({"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"})}>
        {formJSX}
      </UiBox>
    );
}
