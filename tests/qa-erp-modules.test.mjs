import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPermissionsFromPreset
} from '../src/modules/rbac/domain/permissions.js';
import {
  canAccessModule,
  canPerformAction,
  canAccessWarehouse,
  getUserAssignedEmissionPoint,
  hashSupervisorPin,
  verifySupervisorPin
} from '../src/modules/rbac/application/rbacService.js';
import {
  computeSriDocumentTotals,
  resolveSriIvaCode,
  validateSriPreFlight
} from '../src/modules/sri/domain/fiscalMath.js';
import { validarIdentificacion } from '../src/services/sriService.js';
import { resolveAllowedSriSoapPath } from '../server/domains/sriGateway.js';
import nodemailer from 'nodemailer';
import sendEmailHandler, { resolveSenderDomain } from '../api/send-email/index.js';
import {
  detectarTransaccionesSinMovimiento,
  sincronizarTransaccionesFaltantes
} from '../src/services/integracionFinanzasService.js';
import {
  normalizeEmissionPoints,
  validateSequentialChange,
  validateEmissionPointInput
} from '../src/modules/sri/domain/emissionPoints.js';
import {
  encodeCode128Bars,
  computeEan13CheckDigit,
  generateInternalEan13,
  renderBarcodeSvgString
} from '../src/modules/warehouse/domain/barcodeUtils.js';
import {
  DEFAULT_CENTRAL_BRANCH_ID,
  reconcileWarehouses,
  resolveWarehouseId,
  getProductStockInWarehouse
} from '../src/modules/warehouse/domain/warehouseModel.js';
import {
  DISPATCH_STATUS,
  buildDispatchFromSale,
  applyDispatchQuantities,
  matchDispatchLineByBarcode
} from '../src/modules/warehouse/domain/dispatchModel.js';
import { calculateTransactionTotals } from '../src/services/discountCalcService.js';
import { generarFacturaXML, generarNotaDebitoXML, codigoPorcentajeIva } from '../src/services/sriService.js';
import { validarAsiento } from '../src/services/contabilidadService.js';
import { calcularSaldoDesdeMovimientos } from '../src/services/bancosService.js';
import { sincronizarVenta } from '../src/services/integracionFinanzasService.js';
import { escapeHtml, isSafeExternalUrl } from '../server/domains/mailerGuard.js';

test('RBAC: role presets enforce granular module, action, warehouse and emission point restrictions', () => {
  const bodeguero = {
    uid: 'u-bod',
    role: 'staff',
    permissions: {
      ...createPermissionsFromPreset('bodeguero'),
      scope: {
        maxDiscountPct: 0,
        assignedWarehouses: [DEFAULT_CENTRAL_BRANCH_ID],
        assignedEmissionPoint: { estab: '001', ptoEmi: '002', locked: true }
      }
    }
  };

  assert.equal(canAccessModule(bodeguero, 'despachos'), true);
  assert.equal(canAccessModule(bodeguero, 'bodegas'), true);
  assert.equal(canAccessModule(bodeguero, 'configuracion'), false);
  assert.equal(canPerformAction(bodeguero, 'despachar_bodega'), true);
  assert.equal(canPerformAction(bodeguero, 'editar_config_fiscal'), false);
  assert.equal(canAccessWarehouse(bodeguero, DEFAULT_CENTRAL_BRANCH_ID), true);
  assert.equal(canAccessWarehouse(bodeguero, 'sucursal-norte-uuid'), false);
  assert.deepEqual(getUserAssignedEmissionPoint(bodeguero), { estab: '001', ptoEmi: '002', locked: true });
});

test('RBAC: supervisor POS PIN rejects arbitrary 4-char bypasses and verifies configured hash', () => {
  const supHash = hashSupervisorPin('7391');
  const tenantUsers = [
    { uid: 'sup-1', name: 'Carlos Gerente', role: 'admin', status: 'active', posSupervisorPinHash: supHash }
  ];

  const bad = verifySupervisorPin({ pin: '1234', tenantUsers });
  assert.equal(bad.ok, false);

  const arbitrary = verifySupervisorPin({ pin: 'abcd', tenantUsers });
  assert.equal(arbitrary.ok, false);

  const good = verifySupervisorPin({ pin: '7391', tenantUsers });
  assert.equal(good.ok, true);
  assert.equal(good.authorizedBy, 'Carlos Gerente');
});

test('SRI Fiscal Math: eliminates grouped IVA cent drift, 14% float bug and handles No Objeto/Exento', () => {
  // 3 líneas de $1.03 @ 15%: suma individual redondeada = 0.15 * 3 = 0.45, pero SRI calcula 3.09 * 0.15 = 0.46
  const totals = computeSriDocumentTotals([
    { name: 'Item A', quantity: 1, price: 1.03, ivaCategory: 15, tax_mode: 'EXCLUIDO' },
    { name: 'Item B', quantity: 1, price: 1.03, ivaCategory: 15, tax_mode: 'EXCLUIDO' },
    { name: 'Item C', quantity: 1, price: 1.03, ivaCategory: 15, tax_mode: 'EXCLUIDO' }
  ]);
  assert.equal(totals.totalSinImpuestos, 3.09);
  assert.equal(totals.totalIva, 0.46);
  assert.equal(totals.importeTotal, 3.55);

  assert.equal(resolveSriIvaCode(0.14).codigoPorcentaje, '3');
  assert.equal(resolveSriIvaCode(0, 'no_objeto').codigoPorcentaje, '6');
  assert.equal(resolveSriIvaCode(0, 'exento').codigoPorcentaje, '7');
  assert.equal(codigoPorcentajeIva(0.14 * 100), '3');
  assert.equal(codigoPorcentajeIva(0, 'no_objeto'), '6');
});

test('SRI Pre-Flight & Emission Points: blocks Consumidor Final > $50, invalid 000 series and sequential rollback', () => {
  const pre = validateSriPreFlight({
    documentType: 'factura',
    emisorConfig: { ruc: '1790012345001', razonSocial: 'Empresa Test', establecimiento: '001', puntoEmision: '001', certificadoCargado: true },
    buyer: { name: 'CONSUMIDOR FINAL', ruc: '9999999999999', tipoIdentificacion: 'consumidor_final' },
    items: [{ name: 'Laptop', quantity: 1, price: 100, ivaCategory: 15, tax_mode: 'EXCLUIDO' }]
  });
  assert.equal(pre.valid, false);
  assert.ok(pre.blockers.some((b) => b.code === 'CONSUMIDOR_FINAL_LIMIT'));

  const rollback = validateSequentialChange({ currentFloor: 150, proposedNext: 120 });
  assert.equal(rollback.valid, false);

  const badPoint = validateEmissionPointInput({ estab: '000', ptoEmi: '001' });
  assert.equal(badPoint.valid, false);

  const normalized = normalizeEmissionPoints({ establecimiento: '1', puntoEmision: '2' });
  assert.equal(normalized[0].estab, '001');
  assert.equal(normalized[0].ptoEmi, '002');
});

test('SRI Pre-Flight & RUC validation: accepts modern SAS RUC (3rd digit 9) and valid cedula, rejects malformed IDs', () => {
  // Real Ecuadorian SAS RUC issued by SRI whose 10th digit does not match legacy Mod-11
  assert.equal(validarIdentificacion('1793231882001', 'ruc'), true);
  assert.equal(validarIdentificacion('1793231882000', 'ruc'), false); // invalid establishment 000
  assert.equal(validarIdentificacion('1793231882', 'cedula'), false); // 10-digit ID cannot have 3rd digit 9
  assert.equal(validarIdentificacion('1710034065', 'cedula'), true); // valid natural-person cedula (Mod-10)
  assert.equal(validarIdentificacion('1712345678', 'cedula'), false); // invalid Mod-10 checksum

  const preSas = validateSriPreFlight({
    documentType: 'factura',
    emisorConfig: {
      ruc: '1790012345001',
      razonSocial: 'WEBFIX',
      establecimiento: '001',
      puntoEmision: '010',
      certificadoCargado: true
    },
    buyer: { name: 'NIVUSOFTWARE SAS', ruc: '1793231882001', tipoIdentificacion: 'ruc' },
    items: [
      { name: 'Email Starter', quantity: 3, price: 30, ivaCategory: 15, tax_mode: 'EXCLUIDO' }
    ]
  });
  assert.equal(preSas.valid, true);
  assert.equal(preSas.blockers.length, 0);

  const preBad = validateSriPreFlight({
    documentType: 'factura',
    emisorConfig: {
      ruc: '1790012345001',
      razonSocial: 'WEBFIX',
      establecimiento: '001',
      puntoEmision: '010',
      certificadoCargado: true
    },
    buyer: { name: 'CLIENTE INVALIDO', ruc: '9912345678001', tipoIdentificacion: 'ruc' },
    items: [{ name: 'Servicio', quantity: 1, price: 10, ivaCategory: 15, tax_mode: 'EXCLUIDO' }]
  });
  assert.equal(preBad.valid, false);
  assert.ok(preBad.blockers.some((b) => b.code === 'BUYER_ID_INVALID'));
});

test('SRI SOAP Gateway allowlist: accepts Vercel rewritten paths with or without comprobantes-electronicos-ws prefix', () => {
  assert.equal(
    resolveAllowedSriSoapPath('comprobantes-electronicos-ws/AutorizacionComprobantesOffline'),
    '/comprobantes-electronicos-ws/AutorizacionComprobantesOffline'
  );
  assert.equal(
    resolveAllowedSriSoapPath(['comprobantes-electronicos-ws', 'RecepcionComprobantesOffline']),
    '/comprobantes-electronicos-ws/RecepcionComprobantesOffline'
  );
  assert.equal(
    resolveAllowedSriSoapPath('AutorizacionComprobantesOffline'),
    '/comprobantes-electronicos-ws/AutorizacionComprobantesOffline'
  );
  assert.equal(
    resolveAllowedSriSoapPath('', '/api/sri-ws-prod/comprobantes-electronicos-ws/RecepcionComprobantesOffline'),
    '/comprobantes-electronicos-ws/RecepcionComprobantesOffline'
  );
  assert.equal(resolveAllowedSriSoapPath('comprobantes-electronicos-ws/ServicioDesconocido'), null);
  assert.equal(resolveAllowedSriSoapPath('../../etc/passwd'), null);
  assert.equal(resolveAllowedSriSoapPath(''), null);
});

test('send-email anti-spam hygiene: sets EHLO name, domain Message-ID, multipart text+html and blocks data URI links', async () => {
  assert.equal(resolveSenderDomain('ventas@webfixsoluciones.net', 'mail.webfixsoluciones.net'), 'webfixsoluciones.net');
  assert.equal(resolveSenderDomain('invalid', 'mail.ejemplo.ec'), 'ejemplo.ec');

  let transportConfig = null;
  const sentMessages = [];
  const originalCreateTransport = nodemailer.createTransport;
  nodemailer.createTransport = (cfg) => {
    transportConfig = cfg;
    return {
      sendMail: async (mailOptions) => {
        sentMessages.push(mailOptions);
        return { accepted: [mailOptions.to], messageId: mailOptions.messageId };
      }
    };
  };

  let statusCode = 0;
  let payload = null;
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(data) { payload = data; return this; },
    send(data) { payload = data; return this; }
  };

  try {
    await sendEmailHandler({
      method: 'POST',
      headers: { origin: 'https://erp.webfixsoluciones.net' },
      body: {
        smtpHost: 'mail.webfixsoluciones.net',
        smtpPort: 465,
        smtpUser: 'ventas@webfixsoluciones.net',
        smtpPass: 'secret',
        smtpSecure: true,
        to: 'nivusoftware@gmail.com',
        emitterEmail: 'ventas@webfixsoluciones.net',
        clientName: 'NIVUSOFTWARE SAS',
        clientIdentification: '1793231882001',
        documentNumber: '001-010-000000164',
        total: 103.5,
        pdfUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
        xmlContent: '<autorizacion></autorizacion>',
        companyName: 'WebFix Soluciones',
        documentType: 'factura',
        date: '2026-11-23'
      }
    }, mockRes);
  } finally {
    nodemailer.createTransport = originalCreateTransport;
  }

  assert.equal(statusCode, 200);
  assert.equal(payload.success, true);
  assert.equal(transportConfig.name, 'webfixsoluciones.net');
  assert.equal(sentMessages.length, 2);
  for (const msg of sentMessages) {
    assert.ok(msg.text && msg.text.includes('001-010-000000164'), 'Plain text alternative must be present');
    assert.ok(msg.messageId.endsWith('@webfixsoluciones.net>'), 'Message-ID domain must match sender domain');
    assert.equal(msg.replyTo, 'ventas@webfixsoluciones.net');
    assert.ok(!msg.html.includes('fonts.googleapis.com'), 'Must not load remote font stylesheets');
    assert.ok(!msg.html.includes('href="data:'), 'Must never embed data: URIs as anchor links');
  }
});

test('Movimientos sync: detects unsynced authorized sales/purchases and backfills even if referenced bank is inactive', async () => {
  const txs = [
    {
      id: 'tx-nivusoft',
      type: 'ingreso',
      documentType: 'factura',
      documentNumber: '001-010-000000248',
      claveAcceso: '2311202601175437690100120010100000002481234567811',
      sriStatus: 'autorizado',
      total: 103.5,
      paidAmount: 103.5,
      paymentStatus: 'pagado',
      paymentMethod: 'transferencia',
      paymentsBreakdown: { efectivo: 0, transferencia: 103.5, tarjeta: 0, cruce_cuentas: 0 },
      transferenciaBankId: 'bank-inactive',
      thirdPartyName: 'NIVUSOFTWARE SAS',
      thirdPartyRuc: '1793231882001',
      date: '2026-11-23'
    },
    {
      id: 'tx-draft',
      type: 'ingreso',
      documentType: 'factura',
      sriStatus: 'borrador',
      total: 50
    },
    {
      id: 'tx-existing',
      type: 'ingreso',
      documentType: 'factura',
      sriStatus: 'autorizado',
      total: 45
    }
  ];

  const existingMovs = [
    { id: 'venta_tx-existing', origenId: 'tx-existing', monto: 45 }
  ];

  const missing = detectarTransaccionesSinMovimiento(txs, existingMovs);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].id, 'tx-nivusoft');

  // In-memory Firestore mock with an inactive bank account
  const store = new Map([
    ['fin_bancos/bank-inactive', { nombre: 'Banco Pichincha', estado: 'inactivo' }]
  ]);
  const mockApi = {
    doc: (_db, col, id) => `${col}/${id}`,
    serverTimestamp: () => new Date(),
    runTransaction: async (_db, fn) => {
      const tx = {
        get: async (key) => ({ exists: () => store.has(key), data: () => store.get(key) }),
        set: (key, val) => store.set(key, val),
        update: (key, val) => store.set(key, { ...(store.get(key) || {}), ...val })
      };
      return fn(tx);
    }
  };

  const result = await sincronizarTransaccionesFaltantes({}, txs, existingMovs, { uid: 'u1' }, mockApi);
  assert.equal(result.synced, 1);
  assert.equal(result.errors.length, 0);
  assert.ok(store.has('fin_movimientos/venta_tx-nivusoft'), 'Movement must be created');
  assert.equal(store.get('fin_movimientos/venta_tx-nivusoft').monto, 103.5);
  assert.ok(store.has('fin_cxc/tx-nivusoft'), 'CxC record must be created');
  assert.equal(store.has('fin_movimientos_bancarios/mov_doc_tx-nivusoft'), false, 'Inactive bank must not receive posting');
});

test('SRI XML Factura: grouped IVA and RIMPE/AgenteRetencion tags emit cleanly', () => {
  const emisor = {
    ruc: '1790012345001',
    razonSocial: 'COMERCIAL TEST S.A.',
    ambiente: '1',
    establecimiento: '1',
    puntoEmision: '2',
    direccionMatriz: 'Av. Amazonas, Quito',
    obligadoContabilidad: true,
    rucRegimen: 'RIMPE Emprendedor',
    agenteRetencion: '1'
  };
  const { xml, claveAcceso } = generarFacturaXML(
    emisor,
    { date: '2026-11-21', secuencial: '7', paymentMethod: 'efectivo' },
    { name: 'CONSUMIDOR FINAL', ruc: '9999999999999' },
    [
      { code: 'A', name: 'Prod 1', quantity: 1, price: 1.03, ivaPorcentaje: 15, tax_mode: 'EXCLUIDO' },
      { code: 'B', name: 'Prod 2', quantity: 1, price: 1.03, ivaPorcentaje: 15, tax_mode: 'EXCLUIDO' },
      { code: 'C', name: 'Prod 3', quantity: 1, price: 1.03, ivaPorcentaje: 15, tax_mode: 'EXCLUIDO' }
    ]
  );
  assert.equal(claveAcceso.length, 49);
  assert.match(xml, /<estab>001<\/estab>/);
  assert.match(xml, /<ptoEmi>002<\/ptoEmi>/);
  assert.match(xml, /<contribuyenteRimpe>CONTRIBUYENTE RÉGIMEN RIMPE<\/contribuyenteRimpe>/);
  assert.match(xml, /<agenteRetencion>1<\/agenteRetencion>/);
  assert.match(xml, /<totalImpuesto>[\s\S]*<baseImponible>3\.09<\/baseImponible>[\s\S]*<valor>0\.46<\/valor>/);
  assert.match(xml, /<importeTotal>3\.55<\/importeTotal>/);
});

test('Discount SIN_IVA general discount never prorates onto 0% IVA items', () => {
  const calc = calculateTransactionTotals(
    [
      { id: 'taxed', name: 'Gravado', quantity: 1, price: 115, ivaPorcentaje: 15, tax_mode: 'INCLUIDO' },
      { id: 'zero', name: 'Cero IVA', quantity: 1, price: 50, ivaPorcentaje: 0, tax_mode: 'EXCLUIDO' }
    ],
    { tipo_valor: 'SIN_IVA', valor: 0, estado: 'ACTIVO' }
  );
  const zeroItem = calc.items.find((i) => i.id === 'zero');
  assert.equal(zeroItem.descuento_prorrateado, 0);
  assert.equal(zeroItem.subtotal_neto_linea_final, 50);
  assert.equal(calc.total, 150);
});

test('Barcode encoder generates valid Code 128B bars, EAN-13 check digits and SVG', () => {
  const ean = generateInternalEan13('PROD-99');
  assert.equal(ean.length, 13);
  assert.equal(ean[12], computeEan13CheckDigit(ean.slice(0, 12)));

  const encoded = encodeCode128Bars('2111202601179001234500110010010000000011234567819');
  assert.ok(encoded.bars.length > 40);
  assert.ok(encoded.totalModules > 200);

  const svg = renderBarcodeSvgString(ean);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<rect /);
});

test('Unified Warehouses preserve existing sucursal-central-uuid and custom client warehouses without data loss', () => {
  const warehouses = reconcileWarehouses({
    settingsBodegas: ['Bodega Central', 'Bodega Exhibición'],
    products: [{ id: 'p1', stock: 12, stockByBranch: { 'sucursal-central-uuid': 10, 'sucursal-norte-uuid': 2 } }]
  });
  assert.ok(warehouses.some((w) => w.id === DEFAULT_CENTRAL_BRANCH_ID));
  assert.ok(warehouses.some((w) => w.id === 'sucursal-norte-uuid'));
  assert.ok(warehouses.some((w) => w.name === 'Bodega Exhibición' && w.id === 'bodega-bodega-exhibicion'));
  assert.equal(resolveWarehouseId('Bodega Exhibición', warehouses), 'bodega-bodega-exhibicion');
  assert.equal(getProductStockInWarehouse({ stock: 12, stockByBranch: { 'sucursal-norte-uuid': 2 } }, 'sucursal-norte-uuid'), 2);
});

test('Post-Sale Warehouse Dispatch supports barcode picking, partial dispatch and full delivery', () => {
  const sale = {
    id: 'tx_100',
    documentNumber: '001-001-000000100',
    thirdPartyName: 'Cliente Corporativo',
    thirdPartyRuc: '1790012345001',
    items: [
      { productId: 'p1', sku: 'MART-01', codigoBarras: '2000000000012', name: 'Martillo', quantity: 5, type: 'STANDARD' },
      { productId: 's1', sku: 'SRV-01', name: 'Instalación', quantity: 1, type: 'SERVICE' }
    ]
  };
  const order = buildDispatchFromSale(sale, { createdBy: 'Admin' });
  assert.equal(order.status, DISPATCH_STATUS.PENDIENTE);
  assert.equal(order.items.length, 1); // Excluye servicio

  const matched = matchDispatchLineByBarcode(order, '2000000000012');
  assert.equal(matched?.sku, 'MART-01');

  const partial = applyDispatchQuantities(order, { [matched.lineId]: 2 }, { by: 'Bodeguero' });
  assert.equal(partial.status, DISPATCH_STATUS.DESPACHADO_PARCIAL);
  assert.equal(partial.items[0].qtyPending, 3);

  const done = applyDispatchQuantities(partial, { [matched.lineId]: 3 }, { by: 'Bodeguero', markDelivered: true });
  assert.equal(done.status, DISPATCH_STATUS.ENTREGADO);
  assert.equal(done.items[0].qtyPending, 0);
});

test('Backend MailerGuard blocks SSRF/private URLs and escapes HTML payloads', () => {
  assert.equal(isSafeExternalUrl('http://169.254.169.254/latest/meta-data/', { restrictToStorage: true }), false);
  assert.equal(isSafeExternalUrl('https://localhost:8080/secret', { restrictToStorage: false }), false);
  assert.equal(isSafeExternalUrl('https://firebasestorage.googleapis.com/v0/b/demo/o/file.pdf', { restrictToStorage: true }), true);
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});

test('SRI Nota de Débito XML (codDoc 05) generates valid motives, taxes, total and access key', () => {
  const emisor = {
    ruc: '1790012345001',
    razonSocial: 'WEBFIX S.A.',
    nombreComercial: 'WEBFIX',
    dirMatriz: 'Quito',
    establecimiento: '001',
    puntoEmision: '001',
    ambiente: '1',
    obligadoContabilidad: 'SI'
  };
  const { xml, claveAcceso } = generarNotaDebitoXML(
    emisor,
    {
      date: '2026-11-23',
      secuencial: '12',
      numDocModificado: '001-001-000000050',
      fechaEmisionDocSustento: '2026-11-20',
      paymentMethod: 'transferencia'
    },
    { name: 'CLIENTE PRUEBA S.A.', ruc: '1790098765001' },
    [
      { name: 'Interés por mora', quantity: 1, price: 20, ivaPorcentaje: 15, tax_mode: 'EXCLUIDO' }
    ]
  );
  assert.equal(claveAcceso.length, 49);
  assert.match(xml, /<notaDebito id="comprobante" version="1\.0\.0">/);
  assert.match(xml, /<codDoc>05<\/codDoc>/);
  assert.match(xml, /<numDocModificado>001-001-000000050<\/numDocModificado>/);
  assert.match(xml, /<totalSinImpuestos>20\.00<\/totalSinImpuestos>/);
  assert.match(xml, /<valorTotal>23\.00<\/valorTotal>/);
  assert.match(xml, /<razon>Interés por mora<\/razon>/);
});

test('Accounting validarAsiento enforces strict double-entry integrity', () => {
  // Valid balanced entry
  assert.doesNotThrow(() => validarAsiento({
    descripcion: 'Cobro factura 001',
    lineas: [
      { cuentaId: 'cta-caja', debe: 115, haber: 0 },
      { cuentaId: 'cta-ventas', debe: 0, haber: 100 },
      { cuentaId: 'cta-iva', debe: 0, haber: 15 }
    ]
  }));

  // Rejects missing cuentaId
  assert.throws(() => validarAsiento({
    descripcion: 'Sin cuenta',
    lineas: [
      { cuentaId: '', debe: 50, haber: 0 },
      { cuentaId: 'cta-2', debe: 0, haber: 50 }
    ]
  }), /cuenta contable/);

  // Rejects negative amounts
  assert.throws(() => validarAsiento({
    descripcion: 'Negativo',
    lineas: [
      { cuentaId: 'cta-1', debe: -10, haber: 0 },
      { cuentaId: 'cta-2', debe: 0, haber: -10 }
    ]
  }), /negativos/);

  // Rejects both debe and haber on same line
  assert.throws(() => validarAsiento({
    descripcion: 'Ambos lados',
    lineas: [
      { cuentaId: 'cta-1', debe: 10, haber: 10 },
      { cuentaId: 'cta-2', debe: 0, haber: 0 }
    ]
  }), /simultáneamente/);

  // Rejects unbalanced entry
  assert.throws(() => validarAsiento({
    descripcion: 'Descuadrado',
    lineas: [
      { cuentaId: 'cta-1', debe: 100, haber: 0 },
      { cuentaId: 'cta-2', debe: 0, haber: 90 }
    ]
  }), /no cuadra/);
});

test('Emission points & sequential guards block invalid series 000, duplicates and rollbacks', () => {
  const normalized = normalizeEmissionPoints({ establecimiento: '1', puntoEmision: '2', puntosEmision: [] });
  assert.equal(normalized.length, 1);
  assert.equal(`${normalized[0].estab}-${normalized[0].ptoEmi}`, '001-002');

  const zeroCheck = validateEmissionPointInput({ estab: '000', ptoEmi: '001', existingPoints: normalized });
  assert.equal(zeroCheck.valid, false);

  const dupCheck = validateEmissionPointInput({ estab: '001', ptoEmi: '002', existingPoints: normalized });
  assert.equal(dupCheck.valid, false);

  const rollbackCheck = validateSequentialChange({ currentFloor: 25, proposedNext: 10 });
  assert.equal(rollbackCheck.valid, false);

  const advanceCheck = validateSequentialChange({ currentFloor: 25, proposedNext: 26 });
  assert.equal(advanceCheck.valid, true);
});

test('Bancos balance calculation excludes annulled movements and nets credits vs debits', () => {
  const saldo = calcularSaldoDesdeMovimientos(100, [
    { tipo: 'credito', monto: 50, estado: 'activo' },
    { tipo: 'credito', monto: 200, estado: 'anulado' },
    { tipo: 'debito', monto: 25, estado: 'activo' },
    { tipo: 'debito', monto: 99, estado: 'anulado' }
  ]);
  assert.equal(saldo, 125);
});

test('Sales sync posts split Efectivo (Caja), Transferencia (Banco 1) and Tarjeta (Banco 2) atomically', async () => {
  const store = new Map([
    ['fin_bancos/caja-1', { id: 'caja-1', nombre: 'Caja Principal', tipo: 'caja', estado: 'activo' }],
    ['fin_bancos/banco-1', { id: 'banco-1', nombre: 'Banco Pichincha', tipo: 'banco', estado: 'activo' }],
    ['fin_bancos/banco-2', { id: 'banco-2', nombre: 'Produbanco POS', tipo: 'banco', estado: 'activo' }],
  ]);
  const api = {
    doc: (_db, col, id) => ({ path: `${col}/${id}` }),
    serverTimestamp: () => 'TS',
    runTransaction: async (_db, fn) => {
      const tx = {
        get: async (ref) => ({ exists: () => store.has(ref.path), data: () => store.get(ref.path) }),
        set: (ref, data) => { store.set(ref.path, { ...(store.get(ref.path) || {}), ...data }); },
        update: (ref, data) => { store.set(ref.path, { ...(store.get(ref.path) || {}), ...data }); },
      };
      return fn(tx);
    }
  };

  await sincronizarVenta({
    id: 'sale_multi_1',
    date: '2026-11-23',
    documentType: 'factura',
    documentNumber: '001-001-000000777',
    clienteNombre: 'Cliente Mixto S.A.',
    clienteRuc: '1790012345001',
    total: 120,
    paidAmount: 120,
    paymentStatus: 'pagado',
    paymentMethod: 'combinado',
    isPOS: true,
    paymentsBreakdown: { efectivo: 30, transferencia: 50, tarjeta: 40, cruce_cuentas: 0 },
    efectivoCajaId: 'caja-1',
    transferenciaBankId: 'banco-1',
    tarjetaBankId: 'banco-2',
    transferenciaRef: 'TRF-900',
    tarjetaRef: 'LOTE-12'
  }, {}, { uid: 'u1', email: 'cajero@test.ec' }, api);

  const movTransf = store.get('fin_movimientos_bancarios/mov_doc_sale_multi_1');
  const movTarjeta = store.get('fin_movimientos_bancarios/mov_doc_sale_multi_1_tarjeta');
  const movEfectivo = store.get('fin_movimientos_bancarios/mov_doc_sale_multi_1_efectivo');
  assert.equal(movTransf?.cuentaId, 'banco-1');
  assert.equal(movTransf?.monto, 50);
  assert.equal(movTransf?.tipo, 'credito');
  assert.equal(movTransf?.origen, 'pos');
  assert.equal(movTarjeta?.cuentaId, 'banco-2');
  assert.equal(movTarjeta?.monto, 40);
  assert.equal(movEfectivo?.cuentaId, 'caja-1');
  assert.equal(movEfectivo?.monto, 30);
});
