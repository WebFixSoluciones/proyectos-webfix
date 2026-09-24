import { createServer } from 'vite';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const bundle = process.env.WEBFIX_BROWSER_MODULES || 'C:/Users/WEB FIX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = createRequire(path.join(bundle, 'package.json'))('playwright');
const fixture = path.resolve('tests/browser/firebase-fixture.js');
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-sri-tests', resolve: { alias: { 'firebase/firestore': fixture, 'firebase/storage': fixture, 'firebase/auth': fixture } }, server: { host: '127.0.0.1', port: 5179, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
const requests = [];
let responseXml = '';
page.on('pageerror', error => errors.push(error.message));
await page.route('**/*', route => {
  const url = route.request().url();
  if (!url.startsWith('http://127.0.0.1:5179')) return route.abort();
  if (url.includes('/api/sri-ws-')) {
    requests.push(url);
    return route.fulfill({ status: 200, contentType: 'text/xml', body: responseXml });
  }
  return route.continue();
});
try {
  await page.goto('http://127.0.0.1:5179/tests/browser/index.html?mode=sri-recovery');
  const input = page.getByRole('textbox', { name: 'Clave de acceso para recuperar factura' });
  await input.waitFor();
  const fiscal = await page.evaluate(() => globalThis.__fiscalFixture);
  responseXml = fiscal.authorization;
  await input.fill(fiscal.key);
  await page.getByRole('button', { name: 'Consultar y recuperar del SRI' }).click();
  await page.getByText(/Factura 001-001-000000164 recuperada y secuencial protegido/).waitFor();
  const saved = await page.evaluate(key => globalThis.__fixtureData.get(`artifacts/test/public/data/finances_transactions/sri_${key}`), fiscal.key);
  assert.equal(saved.sriStatus, 'autorizado');
  assert.equal(saved.financialSyncStatus, 'review_required');
  assert.equal(saved.xml, fiscal.xml);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'XML autorizado', exact: true }).click();
  const stream = await (await downloaded).createReadStream();
  let contents = '';
  for await (const part of stream) contents += part;
  assert.equal(contents, fiscal.authorization);
  assert.match(await page.getByRole('link', { name: 'RIDE / PDF' }).getAttribute('href'), /\/#\/public\/ride\?/);
  console.log('PASS: recovery UI imports original authorization, protects sequence and downloads unchanged XML');

  await page.goto('http://127.0.0.1:5179/tests/browser/index.html?mode=sri-pending');
  await page.getByRole('button', { name: 'Consultar autorización SRI', exact: true }).click();
  await page.waitForFunction(() => globalThis.__saved?.sriStatus === 'autorizado');
  assert.equal(await page.evaluate(() => globalThis.__saved.financialSyncStatus), 'complete');
  assert.equal(requests.length, 2);
  assert.ok(requests.every(url => url.includes('AutorizacionComprobantesOffline')), 'Recovery must never submit a new receipt');
  await page.goto('http://127.0.0.1:5179/tests/browser/index.html?mode=sri-pending');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).first().click();
  await page.waitForFunction(() => globalThis.__saved?.claveAcceso);
  assert.equal(await page.evaluate(() => globalThis.__saved.sriStatus), 'pendiente_sri');
  assert.deepEqual(errors, []);
  console.log('PASS: persisted pending invoice can be authorized and reconciled without reissuing');
} catch (error) {
  console.error(await page.evaluate(() => ({ toast: globalThis.__lastToast, saved: globalThis.__saved, status: globalThis.__fixtureData.get('artifacts/test/public/data/finances_transactions/fiscal-pending')?.sriStatus })));
  console.error(errors);
  throw error;
} finally {
  await browser.close();
  await server.close();
}
