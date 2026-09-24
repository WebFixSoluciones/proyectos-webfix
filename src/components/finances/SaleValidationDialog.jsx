import { AlertCircle } from 'lucide-react';
import { Button, Callout, Dialog, Flex } from '@radix-ui/themes';

const fallback = {
  client: { shortMessage: 'INGRESA CLIENTE', actionLabel: 'Ingresar Cliente' },
  items: { shortMessage: 'REVISA PRODUCTO', actionLabel: 'Revisar Producto' },
  payment: { shortMessage: 'COMPLETA PAGO', actionLabel: 'Ingresar Pago' },
  session: { shortMessage: 'REVISA CAJA', actionLabel: 'Ir a Caja' },
  document: { shortMessage: 'REVISA COMPROBANTE', actionLabel: 'Revisar Comprobante' },
};

export default function SaleValidationDialog({ issues = [], onClose, onNavigate }) {
  const firstAction = issues.find(issue => issue.target);

  return (
    <Dialog.Root open={issues.length > 0} onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Content maxWidth="400px" aria-describedby={undefined}>
        <Dialog.Title>ALERTA</Dialog.Title>
        <Callout.Root color="amber" variant="soft" mt="4">
          <Callout.Icon><AlertCircle size={18} /></Callout.Icon>
          <Callout.Text>
            {issues.map((issue, index) => (
              <span className="block mb-1 last:mb-0" key={`${issue.target || 'general'}-${index}`}>
                {issue.shortMessage || fallback[issue.target]?.shortMessage || issue.message}
              </span>
            ))}
          </Callout.Text>
        </Callout.Root>
        <Flex gap="3" justify="end" align="center" mt="5" wrap="wrap">
          <Button type="button" variant="soft" color="gray" onClick={onClose}>Cerrar</Button>
          {firstAction && (
            <Button type="button" onClick={() => onNavigate(firstAction.target)}>
              {firstAction.actionLabel || fallback[firstAction.target]?.actionLabel || `Ir a ${firstAction.label}`}
            </Button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
