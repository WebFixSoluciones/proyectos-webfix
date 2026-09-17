import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiSelect, UiInput, UiTextarea } from '../ui/controls';
import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { adjustmentService } from '../../modules/inventory/services/AdjustmentService';
import { kardexRepository } from '../../modules/inventory/repositories/KardexRepository';
import { Product } from '../../modules/inventory/domain/schemas/product.schema';

interface AdjustmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BRANCHES = [
  { id: 'sucursal-central-uuid', name: 'Sucursal Central (Principal)' },
  { id: 'sucursal-sur-uuid', name: 'Sucursal Sur' },
  { id: 'sucursal-norte-uuid', name: 'Sucursal Norte' }
];

export default function AdjustmentModal({ onClose, onSuccess }: AdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'MANUAL' | 'ZERO_INVENTORY'>('MANUAL');
  const [branchId, setBranchId] = useState(BRANCHES[0].id);
  const [reason, setReason] = useState('');
  
  // Single manual item
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [operation, setOperation] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  
  // Zero Inventory confirmation
  const [doubleConfirmationText, setDoubleConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const all = await productRepository.findAll();
        // Solo ajustar productos físicos (excluir servicios)
        setProducts(all.filter(p => p.type !== 'SERVICE'));
      } catch (err) {
        console.error(err);
      }
    }
    loadProducts();
  }, []);

  // Autofill cost when product changes
  useEffect(() => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (prod) {
      setUnitCost(prod.baseCost);
    }
  }, [selectedProductId, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim() || reason.trim().length < 5) {
      setError("La justificación debe tener al menos 5 caracteres.");
      return;
    }

    setLoading(true);

    try {
      if (adjustmentType === 'MANUAL') {
        if (!selectedProductId) {
          setError("Debe seleccionar un producto.");
          setLoading(false);
          return;
        }

        if (quantity <= 0) {
          setError("La cantidad debe ser mayor a cero.");
          setLoading(false);
          return;
        }

        // Si es salida (OUT), verificar si hay stock suficiente en la sucursal
        if (operation === 'OUT') {
          const balance = await kardexRepository.getLastBalance(selectedProductId, branchId);
          const stock = balance ? balance.balanceQuantity : 0;
          if (stock < quantity) {
            setError(`Stock insuficiente para realizar el egreso. Disponible: ${stock}`);
            setLoading(false);
            return;
          }
        }

        await adjustmentService.executeAdjustment(
          branchId,
          'MANUAL',
          reason.trim(),
          [{
            productId: selectedProductId,
            quantity: quantity,
            operation: operation,
            unitCost: operation === 'IN' ? unitCost : undefined
          }],
          'Administrador' // Autoriza mock
        );
      } else {
        // ZERO_INVENTORY
        if (doubleConfirmationText !== 'CONFIRMAR ZERO INVENTARIO') {
          setError("Texto de doble confirmación incorrecto.");
          setLoading(false);
          return;
        }

        await adjustmentService.executeZeroInventory(
          branchId,
          reason.trim(),
          'Administrador' // Autoriza mock
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al aplicar el ajuste.");
    } finally {
      setLoading(false);
    }
  };

  

  

  const isZeroInventoryConfUnlocked = doubleConfirmationText === 'CONFIRMAR ZERO INVENTARIO';

  return (
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"}}>
      <UiBox 
        {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"})}
      >
        {/* Header */}
        <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
          <UiBox {...{"className":"flex items-center gap-2.5"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","color":"var(--red-11)"},"className":"p-2"}}>
              <RefreshCw size={20} />
            </UiBox>
            <UiBox>
              <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"gray","highContrast":true}}>
                Ajuste de Inventario
              </UiHeading>
              <UiText as="p" {...{"size":"1","color":"gray"}}>
                Realiza ajustes de stock o vacía inventarios en lote
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} {...{"className":"flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar"}}>
          {error && (
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-11)"},"className":"p-4"})}>
              {error}
            </UiBox>
          )}

          {/* Selector de Tipo de Ajuste */}
          <UiBox {...{"className":"flex gap-2"}}>
            <UiButton
              type="button"
              onClick={() => { setAdjustmentType('MANUAL'); setError(null); }}
              {...mergeThemeProps({"size":"2","variant":"outline","className":"flex-1"}, {}, (adjustmentType === 'MANUAL' ? {"variant":"soft","color":"red"} : {"variant":"ghost","color":"gray"}))}
            >
              Ajuste Manual de Producto
            </UiButton>
            <UiButton
              type="button"
              onClick={() => { setAdjustmentType('ZERO_INVENTORY'); setError(null); }}
              {...mergeThemeProps({"size":"2","variant":"outline","className":"flex-1"}, {}, (adjustmentType === 'ZERO_INVENTORY' ? {"variant":"solid","color":"red"} : {"variant":"ghost","color":"gray"}))}
            >
              Cero Inventario (Destructivo)
            </UiButton>
          </UiBox>

          <UiBox>
            <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Sucursal / Bodega</UiLabel>
            <UiSelect
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
            >
              {BRANCHES.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </UiSelect>
          </UiBox>

          {adjustmentType === 'MANUAL' ? (
            <UiBox {...{"className":"space-y-4 animate-in fade-in duration-300"}}>
              <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-4"}}>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Producto Físico</UiLabel>
                  <UiSelect
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  >
                    <option value="">-- Seleccionar --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </UiSelect>
                </UiBox>

                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Operación</UiLabel>
                  <UiSelect
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as any)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  >
                    <option value="IN">Ingreso (+) / Entrada</option>
                    <option value="OUT">Egreso (-) / Salida / Mermas</option>
                  </UiSelect>
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-4"}}>
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Cantidad</UiLabel>
                  <UiInput
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  />
                </UiBox>

                {operation === 'IN' && (
                  <UiBox>
                    <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Costo Unitario de Entrada ($)</UiLabel>
                    <UiInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                      {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                    />
                  </UiBox>
                )}
              </UiBox>
            </UiBox>
          ) : (
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)"},"className":"p-4 space-y-4 animate-in fade-in duration-300"})}>
              <UiBox {...{"style":{"color":"var(--red-11)"},"className":"flex gap-2.5"}}>
                <AlertTriangle {...{"className":"shrink-0"}} />
                <UiBox>
                  <UiHeading as="h4" {...{"weight":"bold","size":"2"}}>Operación Crítica y Destructiva</UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>
                    Esta opción registrará egresos automáticos para llevar a 0 unidades el stock de todos los productos físicos de esta sucursal en el Kardex.
                  </UiText>
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...{"size":"1","weight":"bold","color":"red","className":"block mb-1"}}>
                  Escribe "CONFIRMAR ZERO INVENTARIO" para habilitar:
                </UiLabel>
                <UiInput
                  type="text"
                  placeholder="Escribe exactamente la frase..."
                  value={doubleConfirmationText}
                  onChange={(e) => setDoubleConfirmationText(e.target.value)}
                  {...{"size":"2","className":"w-full"}}
                />
              </UiBox>
            </UiBox>
          )}

          <UiBox>
            <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Justificación / Motivo del Ajuste *</UiLabel>
            <UiTextarea
              rows={3}
              required
              placeholder="Ej. Ingreso por inventario inicial, merma por rotura de empaque, auditoría anual..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
            />
          </UiBox>

          {/* Action buttons */}
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
              disabled={loading || (adjustmentType === 'ZERO_INVENTORY' && !isZeroInventoryConfUnlocked)}
              {...mergeThemeProps({"size":"2","className":"flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"}, {}, (adjustmentType === 'ZERO_INVENTORY' ? {"variant":"solid","color":"red"} : {"variant":"solid","color":"blue"}))}
            >
              {loading ? "Aplicando..." : "Aplicar Ajuste"}
            </UiButton>
          </UiBox>
        </form>
      </UiBox>
    </UiBox>
  );
}
