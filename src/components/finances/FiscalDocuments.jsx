import { Button, Flex } from '@radix-ui/themes';
import { sriDocumentLinks, downloadFiscalXml } from '../../services/sriAuthorization';

export default function FiscalDocuments({ transaction, tenantId, onPreview }) {
  if (!transaction.claveAcceso) return null;
  const links = sriDocumentLinks(transaction, tenantId);
  return <Flex gap="2" wrap="wrap" align="center">
    {links.xml && <Button size="1" variant="soft" onClick={() => downloadFiscalXml(links.xml, `${transaction.claveAcceso}.xml`)}>{transaction.xmlAutorizado ? 'XML autorizado' : 'XML firmado'}</Button>}
    {transaction.sriAuthorizationResponse && <Button size="1" variant="soft" onClick={() => downloadFiscalXml(transaction.sriAuthorizationResponse, `${transaction.claveAcceso}-respuesta-sri.xml`)}>Respuesta SRI</Button>}
    {onPreview ? <Button size="1" variant="soft" onClick={onPreview}>RIDE / PDF</Button> : <Button asChild size="1" variant="soft"><a href={links.ride} target="_blank" rel="noreferrer">RIDE / PDF</a></Button>}
    <Button asChild size="1" variant="soft"><a href={links.sri} target="_blank" rel="noreferrer">Portal SRI</a></Button>
  </Flex>;
}
