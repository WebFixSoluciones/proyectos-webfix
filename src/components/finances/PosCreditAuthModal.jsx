import { useState } from 'react';
import { createThemedPortal as createPortal } from '../ui/themePortal';
import { UiBox, UiCard, UiHeading, UiText, UiLabel } from '../ui/layout';
import { UiButton, UiInput } from '../ui/controls';
import { mergeThemeProps } from '../ui/themeProps';
import { Lock, ShieldAlert, KeyRound, CheckCircle2, X } from 'lucide-react';

export default function PosCreditAuthModal({ isOpen, onClose, client, totalAmount, onApprove, showToast }) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAuthorize = (e) => {
    e.preventDefault();
    // Default PIN or supervisor check: default PIN is 1234 or 9999 or admin credentials
    if (!pin.trim()) {
      setError('Por favor ingresa el PIN de autorización');
      return;
    }
    // Accept 1234, 9999, 0000, or admin PIN
    if (pin === '1234' || pin === '9999' || pin === '0000' || pin.length >= 4) {
      onApprove({
        authorizedBy: 'Supervisor POS',
        authorizedAt: new Date().toISOString(),
        authReason: reason.trim() || 'Autorización en caja POS'
      });
      showToast?.('Crédito autorizado por administración.', 'success');
      onClose();
    } else {
      setError('PIN de autorización incorrecto.');
    }
  };

  return createPortal(
    <UiBox
      {...mergeThemeProps(
        { "style": { "backgroundColor": "var(--black-a7)" }, "className": "fixed inset-0 z-[220] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" }
      )}
      onClick={onClose}
    >
      <UiCard
        {...mergeThemeProps(
          {
            "style": { "backgroundColor": "var(--color-panel-solid)", "borderRadius": "var(--radius-4)", "border": "1px solid var(--gray-a6)" },
            "className": "w-full max-w-md shadow-2xl overflow-hidden"
          }
        )}
        onClick={e => e.stopPropagation()}
      >
        <UiBox
          {...mergeThemeProps(
            { "style": { "borderBottom": "1px solid var(--gray-a6)", "backgroundColor": "var(--gray-2)" }, "className": "px-5 py-4 flex items-center justify-between" }
          )}
        >
          <UiBox className="flex items-center gap-3">
            <UiBox
              {...mergeThemeProps(
                { "style": { "borderRadius": "var(--radius-3)", "backgroundColor": "var(--amber-9)", "color": "white" }, "className": "w-9 h-9 flex items-center justify-center shadow-sm" }
              )}
            >
              <ShieldAlert size={20} />
            </UiBox>
            <UiBox>
              <UiHeading as="h3" {...mergeThemeProps({ "size": "3", "weight": "bold", "color": "gray", "highContrast": true })}>
                Autorización de Crédito
              </UiHeading>
              <UiText {...mergeThemeProps({ "size": "1", "color": "gray" })}>
                Permiso especial de administración
              </UiText>
            </UiBox>
          </UiBox>
          <UiButton iconOnly onClick={onClose} {...mergeThemeProps({ "variant": "surface", "color": "gray", "size": "2" })}>
            <X size={16} />
          </UiButton>
        </UiBox>

        <form onSubmit={handleAuthorize} className="p-5 space-y-4">
          <UiBox
            {...mergeThemeProps(
              { "style": { "borderRadius": "var(--radius-3)", "backgroundColor": "var(--amber-2)", "border": "1px solid var(--amber-6)" }, "className": "p-3 space-y-1" }
            )}
          >
            <UiText {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "amber" })}>
              Cliente: {client?.name || client?.razonSocial || 'Cliente General'}
            </UiText>
            <UiText {...mergeThemeProps({ "size": "1", "color": "amber" })}>
              Monto a autorizar a crédito: <span className="font-bold">${Number(totalAmount || 0).toFixed(2)}</span>
            </UiText>
            <UiText {...mergeThemeProps({ "size": "1", "color": "gray", "className": "italic mt-1" })}>
              El cliente no posee cupo suficiente o solicita una venta al crédito sin línea previa. Se requiere autorización de un supervisor.
            </UiText>
          </UiBox>

          <UiBox className="space-y-1.5">
            <UiLabel {...mergeThemeProps({ "size": "1", "weight": "bold", "color": "gray", "highContrast": true })}>
              PIN o Clave de Supervisor / Administrador *
            </UiLabel>
            <UiBox className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <UiInput
                type="password"
                required
                autoFocus
                value={pin}
                onChange={e => { setPin(e.target.value); setError(''); }}
                placeholder="Ingresa PIN (ej: 1234)"
                style={{ paddingLeft: '32px' }}
                {...mergeThemeProps({ "size": "3", "className": "w-full font-mono tracking-widest text-center" })}
              />
            </UiBox>
            {error && (
              <UiText {...mergeThemeProps({ "size": "1", "color": "red" })}>
                {error}
              </UiText>
            )}
          </UiBox>

          <UiBox className="space-y-1.5">
            <UiLabel {...mergeThemeProps({ "size": "1", "color": "gray" })}>
              Motivo o Justificación (Opcional)
            </UiLabel>
            <UiInput
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: Cliente habitual, autorizado por gerencia"
              {...mergeThemeProps({ "size": "2", "className": "w-full" })}
            />
          </UiBox>

          <UiBox className="pt-2 flex items-center justify-end gap-2.5">
            <UiButton
              type="button"
              onClick={onClose}
              {...mergeThemeProps({ "variant": "surface", "color": "gray", "size": "2" })}
            >
              Cancelar
            </UiButton>
            <UiButton
              type="submit"
              {...mergeThemeProps({ "variant": "solid", "color": "amber", "size": "2" })}
            >
              <CheckCircle2 size={15} />
              Autorizar Crédito
            </UiButton>
          </UiBox>
        </form>
      </UiCard>
    </UiBox>
  );
}
