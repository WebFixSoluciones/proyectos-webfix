import React, { useState, useEffect } from 'react';
import { X, Save, ArrowRightLeft, Plus, Trash2, HelpCircle } from 'lucide-react';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { transferService } from '../../modules/inventory/services/TransferService';
import { kardexRepository } from '../../modules/inventory/repositories/KardexRepository';
import { Product } from '../../modules/inventory/domain/schemas/product.schema';

interface TransferModalProps {
  isDarkMode: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BRANCHES = [
  { id: 'sucursal-central-uuid', name: 'Sucursal Central (Principal)' },
  { id: 'sucursal-sur-uuid', name: 'Sucursal Sur' },
  { id: 'sucursal-norte-uuid', name: 'Sucursal Norte' }
];

export default function TransferModal({ isDarkMode, onClose, onSuccess }: TransferModalProps) {
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

  const inputClass = `w-full px-3 py-2.5 rounded-xl outline-none transition-all border text-sm ${
    isDarkMode 
      ? 'bg-black/30 border-white/10 text-white focus:border-purple-500 shadow-inner' 
      : 'bg-white border-gray-200 text-gray-800 focus:border-purple-500 shadow-inner'
  }`;

  const labelClass = `block text-xs font-semibold mb-1.5 uppercase tracking-wider ${
    isDarkMode ? 'text-gray-400' : 'text-gray-500'
  }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/40 animate-in fade-in duration-300">
      <div 
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
          isDarkMode ? 'bg-gray-900/95 border-white/10' : 'bg-white/95 border-white/40'
        }`}
      >
        {/* Header */}
        <div className={`modal-header-std modal-header-std-dark ${
          isDarkMode ? 'border-white/10 bg-gray-900/80' : 'border-gray-100 bg-white/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Nueva Transferencia Interna / Externa
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Mueve productos físicos entre bodegas o sucursales
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-all hover:scale-105 ${
              isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {error && (
            <div className={`p-4 rounded-xl border text-sm font-medium ${
              isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          )}

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>Tipo de Transferencia</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value as any)}
                className={inputClass}
              >
                <option value="INTERNAL">Interna (Sin Costos)</option>
                <option value="EXTERNAL">Externa (Con Costo Logístico)</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Sucursal Origen *</label>
              <select
                value={sourceBranch}
                onChange={(e) => {
                  setSourceBranch(e.target.value);
                  setItems([]); // Limpiar items por cambio de origen
                }}
                className={inputClass}
              >
                {BRANCHES.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Sucursal Destino *</label>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className={inputClass}
              >
                {BRANCHES.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {transferType === 'EXTERNAL' && (
            <div className="animate-in fade-in duration-300">
              <label className={labelClass}>Costo Logístico Adicional ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={transferCost}
                onChange={(e) => setTransferCost(parseFloat(e.target.value) || 0)}
                className="w-1/3 px-3 py-2 rounded-xl outline-none border text-sm bg-black/5 dark:bg-black/20"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Este costo se prorrateará entre los costos unitarios de entrada de los ítems en destino.</p>
            </div>
          )}

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-500/20 to-transparent"></div>

          {/* Add Item Form */}
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
            <h3 className={`text-xs font-bold mb-4 uppercase tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
              Agregar Productos al Envío
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className={labelClass}>Seleccionar Producto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- Selecciona --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Cantidad a Transferir</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={quantityToTransfer}
                    onChange={(e) => setQuantityToTransfer(parseInt(e.target.value) || 1)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-all flex items-center gap-1.5 shrink-0 text-sm"
                  >
                    <Plus size={16} /> Añadir
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <label className={labelClass}>Ítems a Enviar ({items.length})</label>
            <div className={`rounded-[10px] border overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
              isDarkMode 
                ? 'border-white/5 bg-[#0f111a]/85 shadow-lg shadow-black/40' 
                : 'border-slate-200/80 bg-white'
            }`}>
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                  isDarkMode 
                    ? 'bg-black/35 text-slate-400 border-b border-white/5' 
                    : 'bg-slate-50 text-slate-600 border-b border-slate-100'
                }`}>
                  <tr>
                    <th className="px-6 py-3.5">Producto</th>
                    <th className="px-6 py-3.5">Costo Base ($)</th>
                    <th className="px-6 py-3.5">Cantidad</th>
                    <th className="px-6 py-3.5">Total Estimado</th>
                    <th className="px-6 py-3.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                        No has agregado ningún ítem a la lista todavía.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const p = products.find(prod => prod.id === item.productId);
                      return (
                        <tr key={index} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                          <td className="px-6 py-3.5 font-semibold text-black dark:text-white">
                            {p?.name} <span className="text-gray-500 font-normal">({p?.sku})</span>
                          </td>
                          <td className="px-6 py-3.5 font-mono">${item.unitCost.toFixed(2)}</td>
                          <td className="px-6 py-3.5 font-bold">{item.quantity}</td>
                          <td className="px-6 py-3.5 font-mono">${(item.quantity * item.unitCost).toFixed(2)}</td>
                          <td className="px-6 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1.5 rounded-[10px] text-red-500 hover:bg-red-500/10 transition-all border border-red-500/10 bg-white dark:bg-transparent shadow-sm"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${
                isDarkMode 
                  ? 'bg-white/5 hover:bg-white/10 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 rounded-xl font-bold transition-all text-sm bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Procesando..." : "Completar Transferencia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
