import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { parsePurchaseInvoiceXml } from '../src/services/purchaseXml.js';
import { collectZeroInventoryItems } from '../src/services/inventoryZero.js';
import { branchBalanceFor } from '../src/services/inventoryBalance.js';

const invoice = `<factura><infoTributaria><ruc>1790012345001</ruc><razonSocial>Proveedor</razonSocial><estab>001</estab><ptoEmi>002</ptoEmi><secuencial>000000123</secuencial><claveAcceso>${'1'.repeat(49)}</claveAcceso></infoTributaria><infoFactura><fechaEmision>13/11/2026</fechaEmision><identificacionComprador>1754376901001</identificacionComprador><totalSinImpuestos>20.00</totalSinImpuestos><importeTotal>23.00</importeTotal></infoFactura><detalles><detalle><codigoPrincipal>SKU-1</codigoPrincipal><descripcion>Encuestas</descripcion><cantidad>2</cantidad><precioUnitario>10.00</precioUnitario><descuento>0.00</descuento><precioTotalSinImpuesto>20.00</precioTotalSinImpuesto><impuestos><impuesto><baseImponible>20.00</baseImponible><valor>3.00</valor></impuesto></impuestos></detalle></detalles></factura>`;

test('purchase XML keeps fiscal totals and matches inventory only by exact SKU', () => {
  const parsed = parsePurchaseInvoiceXml(invoice, [{ id: 'p1', name: 'Otro nombre', sku: 'SKU-1' }], DOMParser);
  assert.equal(parsed.documentNumber, '001-002-000000123');
  assert.equal(parsed.date, '2026-11-13');
  assert.equal(parsed.total, 23);
  assert.equal(parsed.items[0].productId, 'p1');
  assert.equal(parsed.items[0].name, 'Encuestas');
  assert.equal(parsed.items[0].ivaCategory, 15);
  const unmatched = parsePurchaseInvoiceXml(invoice, [{ id: 'p2', name: 'Encuestas', sku: 'OTHER' }], DOMParser);
  assert.equal(unmatched.items[0].productId, '');
});

test('purchase XML reads SRI authorization wrapper and rejects non-invoices', () => {
  const wrapped = `<autorizacion><comprobante><![CDATA[${invoice}]]></comprobante></autorizacion>`;
  assert.equal(parsePurchaseInvoiceXml(wrapped, [], DOMParser).supplierRuc, '1790012345001');
  assert.throws(() => parsePurchaseInvoiceXml('<notaCredito/>', [], DOMParser), /factura/);
});

test('purchase XML does not classify ICE as VAT', () => {
  const withIce = invoice
    .replace('<importeTotal>23.00</importeTotal>', '<importeTotal>24.00</importeTotal><totalConImpuestos><totalImpuesto><codigo>2</codigo><valor>3.00</valor></totalImpuesto><totalImpuesto><codigo>3</codigo><valor>1.00</valor></totalImpuesto></totalConImpuestos>')
    .replace('<baseImponible>20.00</baseImponible><valor>3.00</valor>', '<codigo>2</codigo><baseImponible>20.00</baseImponible><valor>3.00</valor>');
  const parsed = parsePurchaseInvoiceXml(withIce, [], DOMParser);
  assert.equal(parsed.ivaValor, 3);
  assert.equal(parsed.otrosImpuestos, 1);
  assert.equal(parsed.total, 24);
});

test('zero inventory includes legacy products without Kardex and only the selected branch', () => {
  const items = collectZeroInventoryItems([
    { id: 'legacy', type: 'STANDARD', stock: 3 },
    { id: 'split', type: 'STANDARD', stockByBranch: { 'sucursal-central-uuid': { quantity: 2 }, other: { quantity: 5 } } },
    { id: 'service', type: 'SERVICE', stock: 4 },
    { id: 'combo', type: 'COMBO', stock: 2, comboItems: [{ productId: 'legacy', quantity: 1 }] }
  ], 'sucursal-central-uuid');
  assert.deepEqual(items, [
    { productId: 'legacy', quantity: 3, operation: 'OUT' },
    { productId: 'split', quantity: 2, operation: 'OUT' }
  ]);
});

test('transfer and adjustment read authoritative branch stock, including legacy central stock', () => {
  assert.equal(branchBalanceFor({ type: 'STANDARD', stock: 5, baseCost: 2 }, 'sucursal-central-uuid').quantity, 5);
  assert.equal(branchBalanceFor({ type: 'STANDARD', stock: 5, baseCost: 2 }, 'sucursal-sur-uuid').quantity, 0);
  assert.deepEqual(branchBalanceFor({ type: 'STANDARD', stockByBranch: { sur: { quantity: 3, averageCost: 4 } } }, 'sur'), { quantity: 3, averageCost: 4 });
  assert.equal(branchBalanceFor({ type: 'SERVICE', stock: 10 }, 'sucursal-central-uuid').quantity, 0);
});
