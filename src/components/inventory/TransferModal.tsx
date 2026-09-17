import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiSelect, UiInput, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import React, { useState, useEffect } from 'react';
import { X, Save, ArrowRightLeft, Plus, Trash2, HelpCircle } from 'lucide-react';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { transferService } from '../../modules/inventory/services/TransferService';
import { kardexRepository } from '../../modules/inventory/repositories/KardexRepository';
import { Product } from '../../modules/inventory/domain/schemas/product.schema';

interface TransferModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BRANCHES = [
  { id: 'sucursal-central-uuid', name: 'Sucursal Central (Principal)' },
  { id: 'sucursal-sur-uuid', name: 'Sucursal Sur' },
  { id: 'sucursal-norte-uuid', name: 'Sucursal Norte' }
];

export default function TransferModal({ onClose, onSuccess }: TransferModalProps) {
  const [transferType, setTransferType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [sourceBranch, setSourceBranch] = useState(BRANCHES[0].id);
  const [targetBranch, setTargetBranch] = useState(BRANCHES[1].id);
  const [transferCost, setTransferCost] = useState(0);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<{ productId: string; quantity: number; unitCost: number; stockAvailable: number }[]>([]);
  
  // Selected product state in creation line
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityToTransfer, setQuantityToTransfer] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const all = await productRepository.findAll();
        // Solo transferir Standard y Combos (excluir servicios)
        setProducts(all.filter(p => p.type !== 'SERVICE'));
      } catch (err) {
        console.error(err);
      }
    }
    loadProducts();
  }, []);

  const handleAddItem = async () => {
    if (!selectedProductId) return;
    setError(null);

    // Evitar duplicados
    if (items.some(it => it.productId === selectedProductId)) {
      setError("El producto ya está en la lista.");
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    try {
      // Verificar stock en sucursal origen
      const balance = await kardexRepository.getLastBalance(selectedProductId, sourceBranch);
      const stock = balance ? balance.balanceQuantity : 0;
      const cost = balance ? balance.balanceAverageCost : prod.baseCost;

      if (stock < quantityToTransfer) {
        setError(`Stock insuficiente en origen. Disponible: ${stock}`);
        return;
      }

      setItems(prev => [
        ...prev, 
        { 
          productId: selectedProductId, 
          quantity: quantityToTransfer, 
          unitCost: cost, 
          stockAvailable: stock 
        }
      ]);

      // Reset item inputs
      setSelectedProductId('');
      setQuantityToTransfer(1);
    } catch (err) {
      console.error(err);
      setError("Error al consultar el stock del producto.");
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Debe agregar al menos un ítem para transferir.");
      return;
    }

    if (sourceBranch === targetBranch) {
      setError("La sucursal origen y destino no pueden ser la misma.");
      return;
    }

    setLoading(true);

    try {
      await transferService.executeTransfer(
        transferType,
        sourceBranch,
        targetBranch,
        items.map(it => ({
          productId: it.productId,
          quantity: it.quantity,
          unitCost: it.unitCost
        })),
        'Administrador', // Creador mock
        transferCost
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al realizar la transferencia");
    } finally {
      setLoading(false);
    }
  };

  

  

  return (
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"}}>
      <UiBox 
        {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"})}
      >
        {/* Header */}
        <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
          <UiBox {...{"className":"flex items-center gap-2.5"}}>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--purple-3)","color":"var(--purple-11)"},"className":"p-2"})}>
              <ArrowRightLeft size={20} />
            </UiBox>
            <UiBox>
              <UiHeading as="h2" {...mergeThemeProps({"size":"4","weight":"bold","color":"gray","highContrast":true})}>
                Nueva Transferencia Interna / Externa
              </UiHeading>
              <UiText as="p" {...mergeThemeProps({"size":"1","color":"gray"})}>
                Mueve productos físicos entre bodegas o sucursales
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
        <form onSubmit={handleSubmit} {...{"className":"flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"}}>
          {error && (
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--red-3)","color":"var(--red-11)"},"className":"p-4"})}>
              {error}
            </UiBox>
          )}

          {/* Configuration Grid */}
          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6"}}>
            <UiBox>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Tipo de Transferencia</UiLabel>
              <UiSelect
                value={transferType}
                onChange={(e) => setTransferType(e.target.value as any)}
                {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
              >
                <option value="INTERNAL">Interna (Sin Costos)</option>
                <option value="EXTERNAL">Externa (Con Costo Logístico)</option>
              </UiSelect>
            </UiBox>

            <UiBox>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Sucursal Origen *</UiLabel>
              <UiSelect
                value={sourceBranch}
                onChange={(e) => {
                  setSourceBranch(e.target.value);
                  setItems([]); // Limpiar items por cambio de origen
                }}
                {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
              >
                {BRANCHES.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </UiSelect>
            </UiBox>

            <UiBox>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Sucursal Destino *</UiLabel>
              <UiSelect
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
              >
                {BRANCHES.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </UiSelect>
            </UiBox>
          </UiBox>

          {transferType === 'EXTERNAL' && (
            <UiBox {...{"className":"animate-in fade-in duration-300"}}>
              <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Costo Logístico Adicional ($)</UiLabel>
              <UiInput
                type="number"
                min="0"
                step="0.01"
                value={transferCost}
                onChange={(e) => setTransferCost(parseFloat(e.target.value) || 0)}
                {...{"size":"2","className":"w-1/3"}}
                placeholder="0.00"
              />
              <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Este costo se prorrateará entre los costos unitarios de entrada de los ítems en destino.</UiText>
            </UiBox>
          )}

          <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"w-full h-px"}}></UiBox>

          {/* Add Item Form */}
          <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-5"})}>
            <UiHeading as="h3" {...mergeThemeProps({"size":"1","weight":"bold","color":"purple","className":"mb-4"})}>
              Agregar Productos al Envío
            </UiHeading>
            <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-4 items-end"}}>
              <UiBox {...{"className":"md:col-span-2"}}>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Seleccionar Producto</UiLabel>
                <UiSelect
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                >
                  <option value="">-- Selecciona --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </UiSelect>
              </UiBox>

              <UiBox>
                <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Cantidad a Transferir</UiLabel>
                <UiBox {...{"className":"flex gap-2"}}>
                  <UiInput
                    type="number"
                    min="1"
                    value={quantityToTransfer}
                    onChange={(e) => setQuantityToTransfer(parseInt(e.target.value) || 1)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  />
                  <UiButton
                    type="button"
                    onClick={handleAddItem}
                    {...{"variant":"solid","color":"purple","size":"2","className":"flex items-center gap-1.5 shrink-0"}}
                  >
                    <Plus size={16} /> Añadir
                  </UiButton>
                </UiBox>
              </UiBox>
            </UiBox>
          </UiBox>

          {/* Items Table */}
          <UiBox {...{"className":"space-y-2"}}>
            <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"})}>Ítems a Enviar ({items.length})</UiLabel>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"})}>
              <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
                <UiTableHeader {...mergeThemeProps({"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}})}>
                  <UiTableRow>
                    <UiTableHead {...{"className":"px-6 py-3.5"}}>Producto</UiTableHead>
                    <UiTableHead {...{"className":"px-6 py-3.5"}}>Costo Base ($)</UiTableHead>
                    <UiTableHead {...{"className":"px-6 py-3.5"}}>Cantidad</UiTableHead>
                    <UiTableHead {...{"className":"px-6 py-3.5"}}>Total Estimado</UiTableHead>
                    <UiTableHead {...{"className":"px-6 py-3.5 text-center"}}>Acción</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody {...mergeThemeProps({})}>
                  {items.length === 0 ? (
                    <UiTableRow>
                      <UiTableCell colSpan={5} {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center italic"}}>
                        No has agregado ningún ítem a la lista todavía.
                      </UiTableCell>
                    </UiTableRow>
                  ) : (
                    items.map((item, index) => {
                      const p = products.find(prod => prod.id === item.productId);
                      return (
                        <UiTableRow key={index} {...mergeThemeProps({})}>
                          <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5"}}>
                            {p?.name} <UiText {...{"color":"gray","weight":"regular"}}>({p?.sku})</UiText>
                          </UiTableCell>
                          <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>${item.unitCost.toFixed(2)}</UiTableCell>
                          <UiTableCell {...{"className":"px-6 py-3.5"}}>{item.quantity}</UiTableCell>
                          <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>${(item.quantity * item.unitCost).toFixed(2)}</UiTableCell>
                          <UiTableCell {...{"className":"px-6 py-3.5 text-center"}}>
                            <UiButton iconOnly
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              {...{"color":"red","variant":"surface"}}
                            >
                              <Trash2 size={13} />
                            </UiButton>
                          </UiTableCell>
                        </UiTableRow>
                      );
                    })
                  )}
                </UiTableBody>
              </UiTable>
            </UiBox>
          </UiBox>

          {/* Submit Actions */}
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
              {...{"size":"2","variant":"solid","color":"purple","className":"flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"}}
            >
              {loading ? "Procesando..." : "Completar Transferencia"}
            </UiButton>
          </UiBox>
        </form>
      </UiBox>
    </UiBox>
  );
}
