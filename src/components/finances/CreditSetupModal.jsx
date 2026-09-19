import { useState, useEffect } from 'react';
import { createThemedPortal as createPortal } from '../ui/themePortal';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiSelect, UiTextarea } from '../ui/controls';
import { mergeThemeProps } from '../ui/themeProps';
import { ShieldCheck, CreditCard, X, AlertCircle, CheckCircle2, UserCheck, Calendar } from 'lucide-react';

export default function CreditSetupModal({ isOpen, onClose, client, onSave, showToast }) {
  const [creditLimit, setCreditLimit] = useState(500);
  const [paymentDays, setPaymentDays] = useState(30);
  const [creditStatus, setCreditStatus] = useState('activo');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [creditObservations, setCreditObservations] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setCreditLimit(Number(client.creditLimit || client.cupoCredito) || 500);
      setPaymentDays(Number(client.paymentDays || client.diasCredito) || 30);
      setCreditStatus(client.creditStatus || 'activo');
      setGuarantorName(client.guarantorName || client.garanteNombre || '');
      setGuarantorPhone(client.guarantorPhone || client.garanteTelefono || '');
      setCreditObservations(client.creditObservations || client.observacionesCredito || '');
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Number(creditLimit) <= 0) {
      showToast?.('El cupo de crédito debe ser mayor a 0', 'warning');
      return;
    }
    setSaving(true);
    try {
      const creditData = {
        hasCredit: true,
        creditLimit: Number(creditLimit),
        paymentDays: Number(paymentDays),
        creditStatus,
        guarantorName: guarantorName.trim(),
        guarantorPhone: guarantorPhone.trim(),
        creditObservations: creditObservations.trim(),
        creditUpdatedAt: new Date().toISOString()
      };
      await onSave(creditData);
      showToast?.('Línea de crédito configurada exitosamente.', 'success');
      onClose();
    } catch (err) {
      console.error('Error guardando línea de crédito:', err);
      showToast?.('Error al guardar línea de crédito.', 'error');
    } finally {
      setSaving(false);
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
            "className": "w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
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
                { "style": { "borderRadius": "var(--radius-3)", "backgroundColor": "var(--blue-9)", "color": "white" }, "className": "w-9 h-9 flex items-center justify-center shadow-sm" }
              )}
            >
              <ShieldCheck size={20} />
            </UiBox>
            <UiBox>
              <UiHeading as="h3" {...mergeThemeProps({ "size": "3", "weight": "bold", "color": "gray", "highContrast": true })}>
                Apertura y Control de Crédito
              </UiHeading>
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                {client.name || client.razonSocial || 'Cliente'} &bull; {client.ruc || client.identificacion || 'Consumidor'}
              </UiText>
            </UiBox>
          </UiBox>
          <UiButton iconOnly onClick={onClose} {...mergeThemeProps({ "variant": "surface", "color": "gray", "size": "2" })}>
            <X size={16} />
          </UiButton>
        </UiBox>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <UiBox
            {...mergeThemeProps(
              { "style": { "borderRadius": "var(--radius-3)", "backgroundColor": "var(--blue-2)", "border": "1px solid var(--blue-6)" }, "className": "p-3 flex items-start gap-2.5" }
            )}
          >
            <CreditCard size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <UiText {...mergeThemeProps({ "size": "1", "color": "blue" })}>
              Configura el cupo máximo permitido y el plazo estándar de pago para habilitar ventas a crédito con seguimiento automático en Cartera (CxC).
            </UiText>
          </UiBox>

          <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cupo */}
            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Cupo Aprobado ($) *
              </UiLabel>
              <UiBox className="relative">
                <UiText {...mergeThemeProps({ "size": "2", "weight": "bold", "color": "gray", "highContrast": true, "className": "absolute left-3 top-1/2 -translate-y-1/2 opacity-60" })}>
                  $
                </UiText>
                <UiInput
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={creditLimit}
                  onChange={e => setCreditLimit(e.target.value)}
                  style={{ paddingLeft: '28px' }}
                  {...mergeThemeProps({ "size": "2", "className": "w-full font-bold text-gray-900" })}
                  placeholder="500.00"
                />
              </UiBox>
            </UiBox>

            {/* Plazo */}
            <UiBox className="space-y-1.5">
              <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Plazo de Pago *
              </UiLabel>
              <UiSelect
                value={paymentDays}
                onChange={e => setPaymentDays(Number(e.target.value))}
                {...mergeThemeProps({ "size": "2", "className": "w-full" })}
              >
                <option value={7}>7 días (Semanal)</option>
                <option value={15}>15 días (Quincenal)</option>
                <option value={30}>30 días (Mensual)</option>
                <option value={45}>45 días</option>
                <option value={60}>60 días (Bimestral)</option>
                <option value={90}>90 días (Trimestral)</option>
              </UiSelect>
            </UiBox>
          </UiBox>

          <UiBox className="space-y-1.5">
            <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
              Estado de la Línea de Crédito
            </UiLabel>
            <UiSelect
              value={creditStatus}
              onChange={e => setCreditStatus(e.target.value)}
              {...mergeThemeProps({ "size": "2", "className": "w-full" })}
            >
              <option value="activo">Activo (Permite transacciones a crédito)</option>
              <option value="bloqueado">Bloqueado (Suspendido por mora o riesgo)</option>
              <option value="en_revision">En Revisión (Pendiente de documentación)</option>
            </UiSelect>
          </UiBox>

          {/* Garante opcional */}
          <UiBox
            {...mergeThemeProps(
              { "style": { "borderRadius": "var(--radius-3)", "backgroundColor": "var(--gray-2)", "border": "1px solid var(--gray-a5)" }, "className": "p-3 space-y-3" }
            )}
          >
            <UiBox className="flex items-center gap-2">
              <UserCheck size={14} className="text-gray-500" />
              <UiText {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
                Garante o Aval (Opcional)
              </UiText>
            </UiBox>
            <UiBox className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UiBox className="space-y-1">
                <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>Nombre del Garante</UiLabel>
                <UiInput
                  type="text"
                  value={guarantorName}
                  onChange={e => setGuarantorName(e.target.value)}
                  placeholder="Ej: Carlos Andrade"
                  {...mergeThemeProps({ "size": "2", "className": "w-full" })}
                />
              </UiBox>
              <UiBox className="space-y-1">
                <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>Teléfono del Garante</UiLabel>
                <UiInput
                  type="text"
                  value={guarantorPhone}
                  onChange={e => setGuarantorPhone(e.target.value)}
                  placeholder="Ej: 0987654321"
                  {...mergeThemeProps({ "size": "2", "className": "w-full" })}
                />
              </UiBox>
            </UiBox>
          </UiBox>

          {/* Observaciones */}
          <UiBox className="space-y-1.5">
            <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
              Políticas y Observaciones de Crédito
            </UiLabel>
            <UiTextarea
              rows={2}
              value={creditObservations}
              onChange={e => setCreditObservations(e.target.value)}
              placeholder="Ej: Cliente frecuente, autorizado con pagaré firmado..."
              {...mergeThemeProps({ "size": "2", "className": "w-full" })}
            />
          </UiBox>

          {/* Actions */}
          <UiBox className="pt-2 flex items-center justify-end gap-2.5">
            <UiButton
              type="button"
              onClick={onClose}
              disabled={saving}
              {...mergeThemeProps({ "variant": "surface", "color": "gray", "size": "2" })}
            >
              Cancelar
            </UiButton>
            <UiButton
              type="submit"
              disabled={saving}
              {...mergeThemeProps({ "variant": "solid", "color": "blue", "size": "2" })}
            >
              <CheckCircle2 size={15} />
              {saving ? 'Guardando...' : 'Habilitar y Guardar Crédito'}
            </UiButton>
          </UiBox>
        </form>
      </UiCard>
    </UiBox>
  );
}
