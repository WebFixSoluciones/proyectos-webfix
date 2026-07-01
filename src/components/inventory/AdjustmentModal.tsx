import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { productRepository } from '../../modules/inventory/repositories/ProductRepository';
import { adjustmentService } from '../../modules/inventory/services/AdjustmentService';
import { kardexRepository } from '../../modules/inventory/repositories/KardexRepository';
import { Product } from '../../modules/inventory/domain/schemas/product.schema';

interface AdjustmentModalProps {
  isDarkMode: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BRANCHES = [
  { id: 'sucursal-central-uuid', name: 'Sucursal Central (Principal)' },
  { id: 'sucursal-sur-uuid', name: 'Sucursal Sur' },
  { id: 'sucursal-norte-uuid', name: 'Sucursal Norte' }
];

export default function AdjustmentModal({ isDarkMode, onClose, onSuccess }: AdjustmentModalProps) {
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

  const inputClass = `w-full px-3 py-2.5 rounded-xl outline-none transition-all border text-sm ${
    isDarkMode 
      ? 'bg-black/30 border-white/10 text-white focus:border-red-500 shadow-inner' 
      : 'bg-white border-gray-200 text-gray-800 focus:border-red-500 shadow-inner'
  }`;

  const labelClass = `block text-xs font-semibold mb-1.5 uppercase tracking-wider ${
    isDarkMode ? 'text-gray-400' : 'text-gray-500'
  }`;

  const isZeroInventoryConfUnlocked = doubleConfirmationText === 'CONFIRMAR ZERO INVENTARIO';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/40 animate-in fade-in duration-300">
      <div 
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
          isDarkMode ? 'bg-gray-900/95 border-white/10' : 'bg-white/95 border-white/40'
        }`}
      >
        {/* Header */}
        <div className={`modal-header-std modal-header-std-dark ${
          isDarkMode ? 'border-white/10 bg-gray-900/80' : 'border-gray-100 bg-white/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <RefreshCw size={20} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Ajuste de Inventario
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Realiza ajustes de stock o vacía inventarios en lote
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {error && (
            <div className={`p-4 rounded-xl border text-sm font-medium ${
              isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          )}

          {/* Selector de Tipo de Ajuste */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setAdjustmentType('MANUAL'); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                adjustmentType === 'MANUAL'
                  ? 'bg-red-600/20 text-red-400 border-red-500/30'
                  : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5'
              }`}
            >
              Ajuste Manual de Producto
            </button>
            <button
              type="button"
              onClick={() => { setAdjustmentType('ZERO_INVENTORY'); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                adjustmentType === 'ZERO_INVENTORY'
                  ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-950/20'
                  : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5'
              }`}
            >
              Cero Inventario (Destructivo)
            </button>
          </div>

          <div>
            <label className={labelClass}>Sucursal / Bodega</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className={inputClass}
            >
              {BRANCHES.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {adjustmentType === 'MANUAL' ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Producto Físico</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">-- Seleccionar --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Operación</label>
                  <select
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as any)}
                    className={inputClass}
                  >
                    <option value="IN">Ingreso (+) / Entrada</option>
                    <option value="OUT">Egreso (-) / Salida / Mermas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className={inputClass}
                  />
                </div>

                {operation === 'IN' && (
                  <div>
                    <label className={labelClass}>Costo Unitario de Entrada ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-2xl border bg-red-950/20 border-red-500/20 space-y-4 animate-in fade-in duration-300`}>
              <div className="flex gap-2.5 text-red-400">
                <AlertTriangle className="shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Operación Crítica y Destructiva</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Esta opción registrará egresos automáticos para llevar a 0 unidades el stock de todos los productos físicos de esta sucursal en el Kardex.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-red-400 mb-1">
                  Escribe "CONFIRMAR ZERO INVENTARIO" para habilitar:
                </label>
                <input
                  type="text"
                  placeholder="Escribe exactamente la frase..."
                  value={doubleConfirmationText}
                  onChange={(e) => setDoubleConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-black/40 text-sm border-red-500/30 text-white focus:border-red-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Justificación / Motivo del Ajuste *</label>
            <textarea
              rows={3}
              required
              placeholder="Ej. Ingreso por inventario inicial, merma por rotura de empaque, auditoría anual..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Action buttons */}
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
              disabled={loading || (adjustmentType === 'ZERO_INVENTORY' && !isZeroInventoryConfUnlocked)}
              className={`px-8 py-2.5 rounded-xl font-bold transition-all text-sm text-white flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                adjustmentType === 'ZERO_INVENTORY'
                  ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                  : 'bg-primary hover:bg-primary shadow-[0_0_20px_rgba(37,99,235,0.4)]'
              }`}
            >
              {loading ? "Aplicando..." : "Aplicar Ajuste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
