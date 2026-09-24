import { useState } from 'react';
import { Button, Callout, Flex, TextField, Text } from '@radix-ui/themes';
import { recoverInvoiceFromSri } from '../../services/sriRecovery';

export default function SriRecoveryPanel({ db, appId, showToast }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const recover = async () => {
    if (busy || !/^\d{49}$/.test(key)) return;
    setBusy(true);
    try {
      const document = await recoverInvoiceFromSri(db, appId, key);
      setMessage(`Factura ${document.documentNumber} recuperada y secuencial protegido. ${document.recoveryNote || 'Se conservaron sus movimientos locales.'}`);
      showToast('Factura autorizada recuperada del SRI.', 'success');
    } catch (error) { setMessage(error.message); showToast(error.message, 'error'); }
    finally { setBusy(false); }
  };
  return <Callout.Root color="blue" className="mb-4">
    <Flex direction="column" gap="2" width="100%">
      <Text weight="medium">Recuperar una factura autorizada que no aparece en WebFix</Text>
      <Text size="2">Consulta e importa el XML del SRI. No emite ni reenvía facturas. Los cobros y el inventario de documentos nuevos quedan por conciliar.</Text>
      <Flex gap="2" wrap="wrap"><TextField.Root aria-label="Clave de acceso para recuperar factura" placeholder="Clave de acceso de 49 dígitos" value={key} onChange={event => setKey(event.target.value.trim())} className="flex-1 min-w-0" /><Button loading={busy} disabled={!/^\d{49}$/.test(key) || busy} onClick={recover}>Consultar y recuperar del SRI</Button></Flex>
      {message && <Text size="2" role="status">{message}</Text>}
    </Flex>
  </Callout.Root>;
}
