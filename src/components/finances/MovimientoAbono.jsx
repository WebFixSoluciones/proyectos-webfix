import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { registrarAbono } from '../../services/movimientoService';

const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'cheque', 'cruce_cuentas', 'otro'];

export default function MovimientoAbono({ movimiento, onClose, onSave, db, usuario, showToast }) {
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const saldoPendiente = Number(movimiento.saldoPendiente) || 0;
  const montoNumerico = Number(monto) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (montoNumerico <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (montoNumerico > saldoPendiente) { setError('El abono no puede superar el saldo pendiente'); return; }
    
    setSaving(true);
    try {
      await registrarAbono(db, movimiento.id, {
        monto: montoNumerico,
        metodoPago,
        referencia,
        fecha: new Date().toISOString(),
      }, usuario);
      
      showToast('Abono registrado correctamente', 'success');
      onSave();
    } catch (err) {
      showToast('Error al registrar abono: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center">
      <div className="bg-surface-card border border-border-default rounded-card w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h3 className="text-md font-semibold text-text-primary">Registrar Abono</h3>
          <button onClick={onClose} className="btn-icon text-text-secondary"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="bg-surface-sidebar rounded-card p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Documento:</span>
              <span className="text-text-primary font-medium">{movimiento.documento?.tipo} #{movimiento.documento?.numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Tercero:</span>
              <span className="text-text-primary">{movimiento.tercero?.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Monto total:</span>
              <span className="text-text-primary font-semibold">${Number(movimiento.monto).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border-default pt-2 mt-2">
              <span className="text-text-secondary">Saldo pendiente:</span>
              <span className="text-warning font-bold">${saldoPendiente.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Monto del abono</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="number" step="0.01" value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="0.00" autoFocus
                className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
            </div>
            {error && <span className="text-xs text-error mt-1">{error}</span>}
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Método de pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary">
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Referencia</label>
            <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
              placeholder="N° de comprobante, transferencia..."
              className="w-full px-3 py-2 text-sm border border-border-default rounded-btn bg-white text-text-primary focus:border-primary" />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary border border-border-default rounded-btn hover:bg-primary-light transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-white rounded-btn hover:bg-primary-hover transition-colors disabled:opacity-50">
              {saving ? 'Registrando...' : 'Registrar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
