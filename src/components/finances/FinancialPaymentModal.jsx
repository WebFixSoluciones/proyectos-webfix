import { useState, useEffect } from 'react';
import { createThemedPortal as createPortal } from '../ui/themePortal';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTextarea } from '../ui/controls';
import { mergeThemeProps } from '../ui/themeProps';
import { DollarSign, CreditCard, Building2, CheckCircle2, X, AlertCircle, Calendar } from 'lucide-react';
import { getCuentas } from '../../services/bancosService';

export default function FinancialPaymentModal({
  isOpen,
  onClose,
  item,
  type = 'cobro', // 'cobro' (ingreso CxC) | 'pago' (egreso CxP)
  onConfirm,
  db,
  showToast
}) {
  const isCobro = type === 'cobro';
  const saldoPendiente = Number(item?.saldoPendiente || 0);

  const [monto, setMonto] = useState(saldoPendiente);
  const [metodoPago, setMetodoPago] = useState('transferencia');
  const [cuentaId, setCuentaId] = useState('');
  const [referencia, setReferencia] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setMonto(Number(item.saldoPendiente || 0));
    }
  }, [item]);

  useEffect(() => {
    let isMounted = true;
    if (db && isOpen) {
      getCuentas(db, { estado: 'activo' })
        .then(accs => {
          if (isMounted) {
            setBankAccounts(accs || []);
            // Auto select first account if available
            if (accs?.length > 0 && !cuentaId) {
              setCuentaId(accs[0].id);
            }
          }
        })
        .catch(err => console.error('Error cargando cuentas bancarias en modal de pago:', err));
    }
    return () => { isMounted = false; };
  }, [db, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = Number(monto);
    if (!Number.isFinite(val) || val <= 0) {
      showToast?.('Ingresa un monto válido mayor a cero.', 'error');
      return;
    }
    if (val > saldoPendiente + 0.01) {
      showToast?.(`El monto ($${val.toFixed(2)}) supera el saldo pendiente ($${saldoPendiente.toFixed(2)}).`, 'warning');
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        monto: val,
        metodoPago,
        cuentaId: cuentaId || null,
        referencia: referencia.trim(),
        fecha: new Date(fecha + 'T12:00:00').toISOString(),
        notas: notas.trim()
      };
      await onConfirm(paymentData);
      showToast?.(isCobro ? 'Cobro registrado exitosamente.' : 'Pago registrado exitosamente.', 'success');
      onClose();
    } catch (err) {
      console.error('Error procesando pago financiero:', err);
      showToast?.(err.message || 'Error al procesar la transacción financiera.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <UiBox
      {...mergeThemeProps(
        { "style": { "backgroundColor": "var(--black-a7)" }, "className": "fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200" }
      )}
      onClick={onClose}
    >
      <UiCard
        {...mergeThemeProps(
          {
            "style": { "backgroundColor": "var(--color-panel-solid)", "borderRadius": "var(--radius-4)", "border": "1px solid var(--gray-a6)" },
            "className": "w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
          }
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <UiBox
          {...mergeThemeProps(
            { "style": { "borderBottom": "1px solid var(--gray-a6)", "backgroundColor": "var(--gray-2)" }, "className": "px-5 py-4 flex items-center justify-between" }
          )}
        >
          <UiBox className="flex items-center gap-3">
            <UiBox
              {...mergeThemeProps(
                {
                  "style": {
                    "borderRadius": "var(--radius-3)",
                    "backgroundColor": isCobro ? "var(--green-9)" : "var(--blue-9)",
                    "color": "white"
                  },
                  "className": "w-9 h-9 flex items-center justify-center shadow-sm"
                }
              )}
            >
              <DollarSign size={20} />
            </UiBox>
            <UiBox>
              <UiHeading as="h3" {...mergeThemeProps({ "size": "3", "weight": "bold", "color": "gray", "highContrast": true })}>
                {isCobro ? 'Registrar Cobro de Cartera' : 'Registrar Pago a Proveedor'}
              </UiHeading>
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                {item.tercero?.nombre || 'Tercero'} &bull; Doc: {item.factura?.numero || item.id}
              </UiText>
            </UiBox>
          </UiBox>
          <UiButton iconOnly onClick={onClose} {...mergeThemeProps({ "variant": "surface", "color": "gray", "size": "2" })}>
            <X size={16} />
          </UiButton>
        </UiBox>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Balance info card */}
          <UiBox
            {...mergeThemeProps(
              {
                "style": {
                  "borderRadius": "var(--radius-3)",
                  "backgroundColor": "var(--gray-2)",
                  "border": "1px solid var(--gray-a6)"
                },
                "className": "p-3.5 flex items-center justify-between"
              }
            )}
          >
            <UiBox>
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray", "weight": "bold" })}>SALDO PENDIENTE ACTUAL</UiText>
              <UiText {...mergeThemeProps({ "size": "4", "weight": "bold", "color": "red" })}>
                ${saldoPendiente.toFixed(2)}
              </UiText>
            </UiBox>
            <UiBox className="text-right">
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>Total Documento</UiText>
              <UiText {...mergeThemeProps({ "size": "2", "weight": "bold", "color": "gray", "highContrast": true })}>
                ${Number(item.factura?.montoTotal || 0).toFixed(2)}
              </UiText>
            </UiBox>
          </UiBox>

          {/* Monto & Quick Buttons */}
          <UiBox className="space-y-1.5">
            <UiBox className="flex items-center justify-between">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Monto del {isCobro ? 'Cobro' : 'Pago'} ($) *
              </UiLabel>
              <UiBox className="flex gap-1.5">
                <UiButton
                  type="button"
                  onClick={() => setMonto(saldoPendiente)}
                  {...mergeThemeProps({ "size": "1", "variant": "soft", "color": "blue" })}
                >
                  Total (${saldoPendiente.toFixed(2)})
                </UiButton>
                {saldoPendiente > 1 && (
                  <UiButton
                    type="button"
                    onClick={() => setMonto(Number((saldoPendiente / 2).toFixed(2)))}
                    {...mergeThemeProps({ "size": "1", "variant": "soft", "color": "gray" })}
                  >
                    50% (${(saldoPendiente / 2).toFixed(2)})
                  </UiButton>
                )}
              </UiBox>
            </UiBox>
            <UiBox className="relative">
              <UiText {...mergeThemeProps({ "size": "2", "weight": "bold", "color": "gray", "highContrast": true, "className": "absolute left-3 top-1/2 -translate-y-1/2 opacity-60" })}>
                $
              </UiText>
              <UiInput
                type="number"
                step="0.01"
                min="0.01"
                max={saldoPendiente + 0.01}
                required
                value={monto}
                onChange={e => setMonto(e.target.value)}
                style={{ paddingLeft: '28px' }}
                {...mergeThemeProps({ "size": "2", "className": "w-full font-bold text-lg" })}
              />
            </UiBox>
          </UiBox>

          {/* Método de pago */}
          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Método de Pago *
              </UiLabel>
              <UiSelect
                value={metodoPago}
                onChange={e => setMetodoPago(e.target.value)}
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              >
                <option value="transferencia">Transferencia Bancaria / Depósito</option>
                <option value="efectivo">Efectivo / Caja</option>
                <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                <option value="cheque">Cheque</option>
              </UiSelect>
            </UiBox>

            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Fecha de Operación *
              </UiLabel>
              <UiInput
                type="date"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              />
            </UiBox>
          </UiBox>

          {/* Cuenta Bancaria de Destino/Origen */}
          <UiBox className="space-y-1.5">
            <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
              {isCobro ? 'Cuenta Bancaria de Destino (Depósito/Ingreso)' : 'Cuenta Bancaria de Origen (Salida de Fondos)'}
            </UiLabel>
            <UiSelect
              value={cuentaId}
              onChange={e => setCuentaId(e.target.value)}
              {...mergeThemeProps({ "size": "2", "className": "w-full" })}
            >
              <option value="">-- Sin asignar a cuenta bancaria --</option>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>
                  {b.banco || b.nombre} ({b.tipoCuenta || 'Cta'} {b.numeroCuenta || ''}) - Saldo: ${Number(b.saldoActual || 0).toFixed(2)}
                </option>
              ))}
            </UiSelect>
            <UiText {...mergeThemeProps({ "size": "1", "color": "gray", "className": "text-[11px]" })}>
              {cuentaId 
                ? 'El saldo de esta cuenta se actualizará automáticamente y se generará un movimiento de tesorería.'
                : 'Si seleccionas una cuenta, el movimiento se registrará en el submódulo de Bancos y Caja.'}
            </UiText>
          </UiBox>

          {/* Referencia */}
          <UiBox className="space-y-1.5">
            <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>
              N° de Comprobante / Referencia / Voucher
            </UiLabel>
            <UiInput
              type="text"
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              placeholder="Ej: Depósito #819230 o Cheque #012"
              {...mergeThemeProps({ "size": "2", "className": "w-full" })}
            />
          </UiBox>

          {/* Notas */}
          <UiBox className="space-y-1.5">
            <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>Notas u Observaciones (Opcional)</UiLabel>
            <UiTextarea
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Abono acordado por gerencia..."
              {...mergeThemeProps({ "size": "2", "className": "w-full" })}
            />
          </UiBox>

          {/* Actions */}
          <UiBox className="pt-2 flex items-center justify-end gap-2.5">
            <UiButton
              type="button"
              onClick={onClose}
              disabled={loading}
              {...mergeThemeProps({ "variant": "surface", "color": "gray", "size": "2" })}
            >
              Cancelar
            </UiButton>
            <UiButton
              type="submit"
              disabled={loading}
              {...mergeThemeProps({ "variant": "solid", "color": isCobro ? "green" : "blue", "size": "2" })}
            >
              <CheckCircle2 size={16} />
              {loading ? 'Procesando...' : isCobro ? 'Confirmar Cobro' : 'Confirmar Pago'}
            </UiButton>
          </UiBox>
        </form>
      </UiCard>
    </UiBox>
  );
}
