import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect } from '../ui/controls';
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
    <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[110] flex items-center justify-center"}}>
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-sm mx-4"}}>
        <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-5 py-4"}}>
          <UiHeading as="h3" {...{"color":"gray","weight":"bold","highContrast":true}}>Registrar Abono</UiHeading>
          <UiButton iconOnly onClick={onClose} {...{"variant":"surface","color":"gray"}}><X size={18} /></UiButton>
        </UiBox>

        <form onSubmit={handleSubmit} {...{"className":"px-5 py-4 space-y-4"}}>
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)"},"className":"p-3 space-y-1"}}>
            <UiBox {...{"className":"flex justify-between"}}>
              <UiText {...{"color":"gray"}}>Documento:</UiText>
              <UiText {...{"color":"gray","highContrast":true,"weight":"medium"}}>{movimiento.documento?.tipo} #{movimiento.documento?.numero}</UiText>
            </UiBox>
            <UiBox {...{"className":"flex justify-between"}}>
              <UiText {...{"color":"gray"}}>Tercero:</UiText>
              <UiText {...{"color":"gray","highContrast":true}}>{movimiento.tercero?.nombre}</UiText>
            </UiBox>
            <UiBox {...{"className":"flex justify-between"}}>
              <UiText {...{"color":"gray"}}>Monto total:</UiText>
              <UiText {...{"color":"gray","highContrast":true,"weight":"bold"}}>${Number(movimiento.monto).toFixed(2)}</UiText>
            </UiBox>
            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-2 mt-2"}}>
              <UiText {...{"color":"gray"}}>Saldo pendiente:</UiText>
              <UiText {...{"color":"amber","weight":"bold"}}>${saldoPendiente.toFixed(2)}</UiText>
            </UiBox>
          </UiBox>

          <UiBox>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Monto del abono</UiLabel>
            <UiBox className="relative">
              <UiInput
                type="number"
                step="0.01"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="0.00"
                autoFocus
                iconPrefix={<DollarSign size={15} className="text-[var(--gray-10)]" />}
                size="2"
                color="gray"
                className="w-full"
              />
            </UiBox>
            {error && <UiText {...{"size":"1","color":"red","className":"mt-1"}}>{error}</UiText>}
          </UiBox>

          <UiBox>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Método de pago</UiLabel>
            <UiSelect value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
              {...{"size":"2","color":"gray","className":"w-full"}}>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </UiSelect>
          </UiBox>

          <UiBox>
            <UiLabel {...{"size":"1","weight":"medium","color":"gray","className":"mb-1 block"}}>Referencia</UiLabel>
            <UiInput type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
              placeholder="N° de comprobante, transferencia..."
              {...{"size":"2","color":"gray","className":"w-full"}} />
          </UiBox>

          <UiBox {...{"className":"flex items-center gap-2 pt-2"}}>
            <UiButton type="button" onClick={onClose} disabled={saving}
              {...{"size":"2","color":"gray","variant":"outline","className":"flex-1"}}>
              Cancelar
            </UiButton>
            <UiButton type="submit" disabled={saving}
              {...{"size":"2","variant":"solid","color":"blue","className":"flex-1 disabled:opacity-50"}}>
              {saving ? 'Registrando...' : 'Registrar Abono'}
            </UiButton>
          </UiBox>
        </form>
      </UiCard>
    </UiBox>
  );
}
