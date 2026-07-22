import { useState, useEffect } from 'react';
import { X, Plus, Minus, Save } from 'lucide-react';
import { crearMovimiento, editarMovimiento } from '../../services/movimientoService';

const TIPOS_DOCUMENTO = [
  { id: 'factura', label: 'Factura' },
  { id: 'nota_venta', label: 'Nota de Venta' },
  { id: 'nota_credito', label: 'Nota de Crédito' },
  { id: 'nota_debito', label: 'Nota de Débito' },
  { id: 'retencion', label: 'Retención' },
  { id: 'liquidacion', label: 'Liquidación de Compra' },
  { id: 'gasto', label: 'Gasto' },
  { id: 'ingreso_vario', label: 'Ingreso Varios' },
  { id: 'gasto_hormiga', label: 'Gasto Hormiga' },
];

const CATEGORIAS = [
  'gastos_administrativos', 'costos', 'marketing', 'activos',
  'impuestos', 'nomina', 'servicios_basicos', 'transporte',
  'alimentacion', 'suministros', 'mantenimiento', 'otro',
];

const METODOS_PAGO = [
  'efectivo', 'transferencia', 'tarjeta_credito',
  'tarjeta_debito', 'cheque', 'cruce_cuentas', 'otro',
];

const PARTIDA_VACIA = {
  cuenta: '',
  centroCosto: '',
  proyecto: '',
  categoria: 'gastos_administrativos',
  descripcion: '',
  baseImponible: 0,
  iva: 0,
  ice: 0,
  irbpnr: 0,
  retencionFuente: 0,
  retencionIva: 0,
  total: 0,
  deducible: true,
};

export default function MovimientoForm({ onClose, onSave, movimiento, db, usuario, showToast }) {
  const esEdicion = !!movimiento?.id;
  
  const [formData, setFormData] = useState({
    tipo: movimiento?.tipo || 'egreso',
    fecha: movimiento?.fecha ? new Date(movimiento.fecha.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    fechaVencimiento: movimiento?.fechaVencimiento?.toDate ? new Date(movimiento.fechaVencimiento.toDate()).toISOString().split('T')[0] : '',
    monto: movimiento?.monto || 0,
    metodoPago: movimiento?.metodoPago || 'efectivo',
    documento: movimiento?.documento || { tipo: 'gasto', numero: '', claveAcceso: '' },
    tercero: movimiento?.tercero || { id: '', nombre: '', ruc: '' },
    partidas: movimiento?.partidas?.length ? movimiento.partidas : [{ ...PARTIDA_VACIA }],
    notas: movimiento?.notas || '',
    archivos: movimiento?.archivos || [],
  });
  
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleDocumentoChange = (field, value) => {
    setFormData(prev => ({ ...prev, documento: { ...prev.documento, [field]: value } }));
  };

  const handleTerceroChange = (field, value) => {
    setFormData(prev => ({ ...prev, tercero: { ...prev.tercero, [field]: value } }));
  };

  const handlePartidaChange = (index, field, value) => {
    const partidas = [...formData.partidas];
    partidas[index] = { ...partidas[index], [field]: value };
    
    if (['baseImponible', 'iva', 'ice', 'irbpnr', 'retencionFuente', 'retencionIva'].includes(field)) {
      const p = partidas[index];
      p.total = (Number(p.baseImponible) || 0) + (Number(p.iva) || 0) + (Number(p.ice) || 0)
        - (Number(p.retencionFuente) || 0) - (Number(p.retencionIva) || 0) - (Number(p.irbpnr) || 0);
    }
    
    setFormData(prev => ({ ...prev, partidas }));
  };

  const addPartida = () => {
    setFormData(prev => ({ ...prev, partidas: [...prev.partidas, { ...PARTIDA_VACIA }] }));
  };

  const removePartida = (index) => {
    if (formData.partidas.length <= 1) return;
    setFormData(prev => ({ ...prev, partidas: prev.partidas.filter((_, i) => i !== index) }));
  };

  useEffect(() => {
    const total = formData.partidas.reduce((s, p) => s + (Number(p.total) || 0), 0);
    setFormData(prev => ({ ...prev, monto: total }));
  }, [formData.partidas]);

  const validate = () => {
    const errs = {};
    if (!formData.tercero.nombre && formData.tipo !== 'ingreso_vario') errs.tercero = 'Requerido';
    if (formData.partidas.some(p => !p.descripcion)) errs.partidas = 'Todas las partidas necesitan descripción';
    if (formData.monto <= 0) errs.monto = 'El total debe ser mayor a 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    
    try {
      if (esEdicion) {
        await editarMovimiento(db, movimiento.id, formData, usuario);
      } else {
        await crearMovimiento(db, formData, usuario);
      }
      showToast(esEdicion ? 'Movimiento actualizado' : 'Movimiento creado', 'success');
      onSave();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-10 pb-10 overflow-y-auto">
      <div className="bg-surface-card border border-border-default rounded-card w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-lg font-semibold text-text-primary">
            {esEdicion ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </h2>
          <button onClick={onClose} className="btn-icon text-text-secondary">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Tipo</label>
            <div className="flex gap-2">
              {['ingreso', 'egreso'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleChange('tipo', t)}
                  className={`flex-1 py-2 px-3 rounded-btn text-sm font-medium border transition-colors ${
                    formData.tipo === t
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-primary border-border-default hover:bg-primary-light'
                  }`}
                >
                  {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Fecha</label>
              <input type="date" value={formData.fecha} onChange={e => handleChange('fecha', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/25" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Vencimiento (opcional)</label>
              <input type="date" value={formData.fechaVencimiento} onChange={e => handleChange('fechaVencimiento', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/25" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Tipo de Documento</label>
              <select value={formData.documento.tipo} onChange={e => handleDocumentoChange('tipo', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
                {TIPOS_DOCUMENTO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Número</label>
              <input type="text" value={formData.documento.numero} onChange={e => handleDocumentoChange('numero', e.target.value)}
                placeholder="001-001-0000001" className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Método de Pago</label>
              <select value={formData.metodoPago} onChange={e => handleChange('metodoPago', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="text-xs font-medium text-text-secondary mb-1 block">RUC/CI</label>
              <input type="text" value={formData.tercero.ruc} onChange={e => handleTerceroChange('ruc', e.target.value)}
                placeholder="9999999999999" className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <label className="text-xs font-medium text-text-secondary mb-1 block">Nombre/Razón Social</label>
              <input type="text" value={formData.tercero.nombre} onChange={e => handleTerceroChange('nombre', e.target.value)}
                placeholder={formData.tipo === 'ingreso' ? 'Nombre del cliente' : 'Nombre del proveedor'} className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
              {errors.tercero && <span className="text-xs text-error mt-0.5">{errors.tercero}</span>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-secondary">Partidas</label>
              <button type="button" onClick={addPartida}
                className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
                <Plus size={14} /> Agregar partida
              </button>
            </div>
            {errors.partidas && <span className="text-xs text-error block mb-2">{errors.partidas}</span>}
            
            <div className="space-y-3">
              {formData.partidas.map((partida, idx) => (
                <div key={idx} className="border border-border-default rounded-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-secondary">Partida {idx + 1}</span>
                    {formData.partidas.length > 1 && (
                      <button type="button" onClick={() => removePartida(idx)}
                        className="text-error hover:text-error/80">
                        <Minus size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input type="text" value={partida.descripcion}
                        onChange={e => handlePartidaChange(idx, 'descripcion', e.target.value)}
                        placeholder="Descripción de la partida"
                        className="w-full px-3 py-1.5 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                    <div>
                      <select value={partida.categoria}
                        onChange={e => handlePartidaChange(idx, 'categoria', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary">
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <input type="number" step="0.01" value={partida.baseImponible || ''}
                        onChange={e => handlePartidaChange(idx, 'baseImponible', e.target.value)}
                        placeholder="Base imponible"
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                    <div>
                      <input type="number" step="0.01" value={partida.iva || ''}
                        onChange={e => handlePartidaChange(idx, 'iva', e.target.value)}
                        placeholder="IVA"
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                    <div>
                      <input type="number" step="0.01" value={partida.retencionFuente || ''}
                        onChange={e => handlePartidaChange(idx, 'retencionFuente', e.target.value)}
                        placeholder="Ret. Fuente"
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs text-text-secondary">
                        <input type="checkbox" checked={partida.deducible}
                          onChange={e => handlePartidaChange(idx, 'deducible', e.target.checked)} />
                        Deducible
                      </label>
                    </div>
                    <div>
                      <input type="text" value={partida.centroCosto || ''}
                        onChange={e => handlePartidaChange(idx, 'centroCosto', e.target.value)}
                        placeholder="Centro de costo"
                        className="w-full px-2 py-1.5 text-xs border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm font-semibold text-text-primary">
                    Total partida: ${(Number(partida.total) || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary-light rounded-card p-3 text-center">
            <span className="text-xs text-text-secondary">Total del movimiento</span>
            <div className="text-xl font-bold text-primary">
              ${(Number(formData.monto) || 0).toFixed(2)}
            </div>
            {errors.monto && <span className="text-xs text-error">{errors.monto}</span>}
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Notas (opcional)</label>
            <textarea value={formData.notas} onChange={e => handleChange('notas', e.target.value)}
              rows={2} placeholder="Observaciones del movimiento..."
              className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary resize-none" />
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-default">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-btn hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2">
            <Save size={16} /> {saving ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear Movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
