import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { verifyPurchaseSriXml } from '../src/services/purchaseSriVerification.js';

const xml = `<factura><infoTributaria>
  <ruc>1790012345001</ruc><claveAcceso>2109202601179001234500120010010000001645699241016</claveAcceso>
  <estab>001</estab><ptoEmi>001</ptoEmi><secuencial>000000164</secuencial>
</infoTributaria><infoFactura>
  <identificacionComprador>1754376901001</identificacionComprador><importeTotal>10.50</importeTotal>
</infoFactura></factura>`;
const expected = {
  claveAcceso: '2109202601179001234500120010010000001645699241016',
  companyRuc: '1754376901001',
  supplierRuc: '1790012345001',
  documentNumber: '001-001-000000164',
  total: 10.5
};

test('a purchase becomes SRI verified only when its fiscal identity and total match', () => {
  assert.equal(verifyPurchaseSriXml(xml, expected, DOMParser).documentNumber, expected.documentNumber);
  for (const [field, value] of [
    ['companyRuc', '0999999999001'],
    ['supplierRuc', '1790000000001'],
    ['documentNumber', '001-001-000000165'],
    ['total', 11.5]
  ]) {
    assert.throws(() => verifyPurchaseSriXml(xml, { ...expected, [field]: value }, DOMParser), { code: 'PURCHASE_SRI_MISMATCH' });
  }
});
