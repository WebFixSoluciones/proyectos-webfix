import { useMemo, useState } from 'react';
import { Warehouse, Plus, Edit2, AlertTriangle, Package, CheckCircle2, X } from 'lucide-react';
import { saveWarehouse, toggleWarehouseActive } from '../infrastructure/WarehouseRepository.js';
import { getProductStockInWarehouse } from '../domain/warehouseModel.js';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { canPerformAction } from '../../rbac/application/rbacService.js';

/**
 * Vista Unificada de Control de Bodegas.
 * Preserva todos los branchId existentes (`sucursal-central-uuid`, etc.) y permite
 * consultar existencias reales por bodega, alertas de stock mínimo y gestionar bodegas.
 */
export default function WarehousesView({ warehouses = [], products = [], onRefreshWarehouses, showToast }) {
  const { userProfile } = useAuth();
  const canManage = canPerformAction(userProfile, 'ajustar_inventario') || canPerformAction(userProfile, 'gestionar_productos');

  const [selectedBranchId, setSelectedBranchId] = useState(warehouses[0]?.id || 'sucursal-central-uuid');
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeBranch = warehouses.find((w) => w.id === selectedBranchId) || warehouses[0];

  const branchRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p && p.type !== 'SERVICE' && p.inventoryType !== 'VIRTUAL')
      .map((p) => {
        const stockInBranch = getProductStockInWarehouse(p, activeBranch?.id);
        const minStock = Number(p.stockMinimo ?? p.minStock ?? 5);
        return {
          ...p,
          stockInBranch,
          minStock,
          isLow: stockInBranch <= minStock
        };
      })
      .filter((p) => {
        if (onlyLowStock && !p.isLow) return false;
        if (!q) return true;
        return (
          String(p.name || '').toLowerCase().includes(q) ||
          String(p.sku || '').toLowerCase().includes(q) ||
          String(p.codigoBarras || '').toLowerCase().includes(q)
        );
      });
  }, [products, activeBranch?.id, search, onlyLowStock]);

  const lowStockCount = branchRows.filter((r) => r.isLow).length;
  const totalUnits = branchRows.reduce((s, r) => s + (Number(r.stockInBranch) || 0), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing?.name?.trim()) return;
    setIsSaving(true);
    try {
      await saveWarehouse({ warehouse: editing });
      showToast?.('Bodega guardada correctamente.', 'success');
      setEditing(null);
      await onRefreshWarehouses?.();
    } catch (err) {
      showToast?.(err.message || 'Error al guardar bodega.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (w) => {
    try {
      await toggleWarehouseActive({ branchId: w.id, active: !w.active });
      showToast?.(w.active ? 'Bodega desactivada.' : 'Bodega activada.', 'success');
      await onRefreshWarehouses?.();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Warehouse size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Control de Bodegas y Existencias por Sucursal</h2>
            <p className="text-xs text-slate-500">
              Administra tus bodegas físicas, consulta el stock por ubicación y detecta quiebres de inventario.
            </p>
          </div>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setEditing({ name: '', code: '', address: '', establishmentCode: '001', manager: '', active: true })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1b1b1b] text-white text-xs font-semibold hover:bg-black cursor-pointer"
          >
            <Plus size={15} />
            <span>Nueva Bodega</span>
          </button>
        )}
      </div>

      {/* Tarjetas de Bodegas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {warehouses.map((w) => {
          const isSelected = w.id === activeBranch?.id;
          return (
            <div
              key={w.id}
              onClick={() => setSelectedBranchId(w.id)}
              className={`rounded-xl border p-4 transition-colors cursor-pointer ${
                isSelected ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">{w.name}</span>
                    {w.isDefault && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Principal</span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {w.code || w.id} • Estab. {w.establishmentCode || '001'}
                  </div>
                  {w.address && <div className="text-[11px] text-slate-500 truncate mt-1">{w.address}</div>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setEditing(w)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Editar bodega"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className={`inline-flex items-center gap-1 font-semibold ${w.active !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <CheckCircle2 size={12} /> {w.active !== false ? 'Activa' : 'Inactiva'}
                </span>
                {canManage && !w.isDefault && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggle(w); }}
                    className="text-slate-500 hover:text-slate-900 underline cursor-pointer"
                  >
                    {w.active !== false ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock en la Bodega Seleccionada */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Existencias en {activeBranch?.name || 'Bodega'} ({totalUnits.toLocaleString('es-EC')} u.)
            </h3>
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                <AlertTriangle size={12} /> {lowStockCount} en stock bajo
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto, SKU o código..."
              className="h-9 px-3 rounded-lg border border-slate-200 text-xs w-56"
            />
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => setOnlyLowStock(e.target.checked)}
              />
              <span>Solo stock bajo</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Producto</th>
                <th className="py-2.5 px-3 font-semibold">SKU / Barras</th>
                <th className="py-2.5 px-3 font-semibold text-right">Stock Bodega</th>
                <th className="py-2.5 px-3 font-semibold text-right">Mínimo</th>
                <th className="py-2.5 px-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchRows.slice(0, 100).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-semibold text-slate-900">{r.name}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                    {r.sku || '—'} {r.codigoBarras ? `• ${r.codigoBarras}` : ''}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{r.stockInBranch}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-500">{r.minStock}</td>
                  <td className="py-2 px-3">
                    {r.stockInBranch <= 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">Sin stock</span>
                    ) : r.isLow ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">Stock bajo</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">Óptimo</span>
                    )}
                  </td>
                </tr>
              ))}
              {branchRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">Sin productos físicos que coincidan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar Bodega */}
      {editing && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <form onSubmit={handleSave} className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">{editing.id ? 'Editar Bodega' : 'Nueva Bodega'}</h3>
              <button type="button" onClick={() => setEditing(null)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre de la Bodega *</label>
                <input
                  type="text"
                  required
                  value={editing.name}
                  onChange={(e) => setEditing((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Bodega Norte / Exhibición"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código Interno</label>
                  <input
                    type="text"
                    value={editing.code || ''}
                    onChange={(e) => setEditing((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="BOD-02"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Establecimiento SRI</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={editing.establishmentCode || '001'}
                    onChange={(e) => setEditing((prev) => ({ ...prev, establishmentCode: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    placeholder="001"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Responsable / Bodeguero</label>
                <input
                  type="text"
                  value={editing.manager || ''}
                  onChange={(e) => setEditing((prev) => ({ ...prev, manager: e.target.value }))}
                  placeholder="Nombre del encargado"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dirección Física</label>
                <input
                  type="text"
                  value={editing.address || ''}
                  onChange={(e) => setEditing((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Dirección de la bodega"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-200 bg-slate-50">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-lg bg-[#1b1b1b] text-white text-xs font-semibold hover:bg-black cursor-pointer">
                {isSaving ? 'Guardando...' : 'Guardar Bodega'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
