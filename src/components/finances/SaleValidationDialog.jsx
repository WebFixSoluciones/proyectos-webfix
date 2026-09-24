import { AlertCircle } from 'lucide-react';
import { Button, Callout, Dialog, Flex, Text } from '@radix-ui/themes';

export default function SaleValidationDialog({ issues = [], action = 'continuar', onClose, onNavigate }) {
  const firstAction = issues.find(issue => issue.target);

  return (
    <Dialog.Root open={issues.length > 0} onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Content maxWidth="480px" aria-describedby="sale-validation-description">
        <Dialog.Title>Antes de {action}</Dialog.Title>
        <Dialog.Description id="sale-validation-description">
          Completa estos datos para continuar. Tu venta permanece en pantalla.
        </Dialog.Description>
        <Callout.Root color="amber" variant="soft" mt="4">
          <Callout.Icon><AlertCircle size={18} /></Callout.Icon>
          <Callout.Text>
            {issues.map((issue, index) => (
              <span className="block mb-1 last:mb-0" key={`${issue.target || 'general'}-${index}`}>
                • {issue.message}
              </span>
            ))}
          </Callout.Text>
        </Callout.Root>
        <Flex gap="3" justify="end" align="center" mt="5" wrap="wrap">
          <Button type="button" variant="soft" color="gray" onClick={onClose}>Cerrar</Button>
          {firstAction && (
            <Button type="button" onClick={() => onNavigate(firstAction.target)}>
              <Text>Ir a {firstAction.label}</Text>
            </Button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
