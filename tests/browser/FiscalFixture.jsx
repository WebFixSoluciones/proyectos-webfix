import TransactionForm from '../../src/components/finances/TransactionForm';
import SriRecoveryPanel from '../../src/components/finances/SriRecoveryPanel';
import FiscalDocuments from '../../src/components/finances/FiscalDocuments';
import { generarClaveAcceso } from '../../src/services/sriService';
import { fixtureClient } from './firebase-fixture';

const key = generarClaveAcceso({ fechaEmision: '2026-09-21', tipoComprobante: '01', ruc: '1790012345001', ambiente: '1', establecimiento: '001', puntoEmision: '001', secuencial: '164', codigoNumerico: '12345678' });
const xml = `<factura><infoTributaria><ambiente>1</ambiente><ruc>1790012345001</ruc><razonSocial>Emisor prueba</razonSocial><claveAcceso>${key}</claveAcceso><estab>001</estab><ptoEmi>001</ptoEmi><secuencial>000000164</secuencial><dirMatriz>Quito</dirMatriz></infoTributaria><infoFactura><fechaEmision>21/09/2026</fechaEmision><razonSocialComprador>Cliente prueba</razonSocialComprador><identificacionComprador>9999999999999</identificacionComprador><totalSinImpuestos>10</totalSinImpuestos><importeTotal>10</importeTotal></infoFactura><detalles><detalle><descripcion>Servicio</descripcion><cantidad>1</cantidad><precioUnitario>10</precioUnitario><precioTotalSinImpuesto>10</precioTotalSinImpuesto></detalle></detalles><Signature>fixture</Signature></factura>`;
const authorization = `<RespuestaAutorizacionComprobante><autorizaciones><autorizacion><estado>AUTORIZADO</estado><numeroAutorizacion>${key}</numeroAutorizacion><fechaAutorizacion>2026-09-21T11:30:44-05:00</fechaAutorizacion><comprobante><![CDATA[${xml}]]></comprobante></autorizacion></autorizaciones></RespuestaAutorizacionComprobante>`;
const transaction = { id: 'fiscal-pending', type: 'ingreso', documentType: 'factura', date: '2026-09-21', documentNumber: '001-001-000000164', claveAcceso: key, sriStatus: 'pendiente_sri', financialSyncStatus: 'awaiting_authorization', thirdPartyId: fixtureClient.id, thirdParty: fixtureClient, items: [], total: 10, baseImponible: 10, ivaValor: 0, xml, paidAmount: 10, paymentStatus: 'pagado', paymentsBreakdown: { efectivo: 10 } };
globalThis.__fiscalFixture = { key, xml, authorization };

export default function FiscalFixture({ showToast, pending }) {
  if (pending) {
    globalThis.__fixtureData.set('artifacts/test/public/data/finances_transactions/fiscal-pending', transaction);
    return <TransactionForm tx={transaction} products={[]} thirdParties={[fixtureClient]} db={{}} appId="test" showToast={showToast} onSaved={data => { globalThis.__saved = data; }} onClose={() => {}} />;
  }
  return <><SriRecoveryPanel db={{}} appId="test" showToast={showToast} /><FiscalDocuments transaction={{ ...transaction, sriStatus: 'autorizado', xmlAutorizado: authorization, sriAuthorizationResponse: authorization }} tenantId="test" /></>;
}
