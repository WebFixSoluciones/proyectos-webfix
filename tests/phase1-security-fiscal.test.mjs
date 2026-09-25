import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearFecha } from '../src/services/integracionFinanzasService.js';
import { mapearFormaPagoSRI, generarFacturaXML } from '../src/services/sriService.js';
import { sriDocumentLinks } from '../src/services/sriAuthorization.js';
import { notifyAuthorizedInvoice } from '../src/services/invoiceNotification.js';

test('parsearFecha handles DD/MM/YYYY, ISO, Date instances and invalid strings safely', () => {
  // DD/MM/YYYY
  const d1 = parsearFecha('25/09/2026');
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 8); // 0-indexed: 8 is September
  assert.equal(d1.getDate(), 25);
  assert.doesNotThrow(() => d1.toISOString());

  // DD-MM-YYYY
  const d2 = parsearFecha('14-04-2024');
  assert.equal(d2.getFullYear(), 2024);
  assert.equal(d2.getMonth(), 3); // April
  assert.equal(d2.getDate(), 14);

  // YYYY-MM-DD
  const d3 = parsearFecha('2026-12-31');
  assert.equal(d3.getFullYear(), 2026);

  // Null, undefined, empty string
  const d4 = parsearFecha('');
  assert.ok(d4 instanceof Date);
  assert.ok(!isNaN(d4.getTime()));

  const d5 = parsearFecha(null);
  assert.ok(d5 instanceof Date);
  assert.ok(!isNaN(d5.getTime()));

  // Existing Date instance
  const existing = new Date('2026-05-10T10:00:00Z');
  const d6 = parsearFecha(existing);
  assert.equal(d6.getTime(), existing.getTime());
});

test('mapearFormaPagoSRI maps all payment methods to valid SRI Table 24 codes', () => {
  // Cash
  assert.equal(mapearFormaPagoSRI('efectivo'), '01');
  assert.equal(mapearFormaPagoSRI(''), '01');
  assert.equal(mapearFormaPagoSRI(null), '01');

  // Compensation / Debt offset
  assert.equal(mapearFormaPagoSRI('cruce_cuentas'), '15');
  assert.equal(mapearFormaPagoSRI('compensacion'), '15');

  // Cards
  assert.equal(mapearFormaPagoSRI('tarjeta_debito'), '16');
  assert.equal(mapearFormaPagoSRI('debito'), '16');
  assert.equal(mapearFormaPagoSRI('tarjeta_credito'), '19');
  assert.equal(mapearFormaPagoSRI('tarjeta'), '19');

  // Bank transfer / deposits / checks / credit
  assert.equal(mapearFormaPagoSRI('transferencia'), '20');
  assert.equal(mapearFormaPagoSRI('banco'), '20');
  assert.equal(mapearFormaPagoSRI('cheque'), '20');
  assert.equal(mapearFormaPagoSRI('credito'), '20');
  assert.equal(mapearFormaPagoSRI('credito_directo'), '20');

  // Electronic / other
  assert.equal(mapearFormaPagoSRI('dinero_electronico'), '17');
  assert.equal(mapearFormaPagoSRI('tarjeta_prepago'), '18');
  assert.equal(mapearFormaPagoSRI('endoso'), '21');
});

test('generarFacturaXML emits split payments breakdown in <pagos> section', () => {
  const emisor = {
    ruc: '1790012345001',
    ambiente: '1',
    establecimiento: '001',
    puntoEmision: '001',
    razonSocial: 'EMPRESA PRUEBA',
    direccionMatriz: 'Quito, Ecuador',
  };
  const cliente = {
    name: 'JUAN PEREZ',
    ruc: '1712345678',
    tipoIdentificacion: 'cedula',
  };
  const items = [{
    quantity: 1,
    unit_price: 100,
    precio_base_unitario: 100,
    tarifa_iva: 0.15,
    description: 'Servicio Cloud',
  }];
  const facturaData = {
    date: '2026-09-25',
    secuencial: '000000001',
    paymentMethod: 'combinado',
    paymentsBreakdown: {
      efectivo: 45,
      transferencia: 70,
    },
  };

  const { xml } = generarFacturaXML(emisor, facturaData, cliente, items);

  assert.ok(xml.includes('<pagos>'));
  assert.ok(xml.includes('<formaPago>01</formaPago>'));
  assert.ok(xml.includes('<total>45.00</total>'));
  assert.ok(xml.includes('<formaPago>20</formaPago>'));
  assert.ok(xml.includes('<total>70.00</total>'));
});

test('sriDocumentLinks generates public ride URLs with txId', () => {
  const doc = {
    id: 'tx_abc123',
    claveAcceso: '0101202601179001234500110010010000000011234567819',
    documentType: 'factura',
  };
  const links = sriDocumentLinks(doc, 'tenant_456');

  assert.ok(links.ride.includes('txId=tx_abc123'));
  assert.ok(links.ride.includes('claveAcceso=0101202601179001234500110010010000000011234567819'));
  assert.ok(links.ride.includes('tenantId=tenant_456'));
});
