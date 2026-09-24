import { invoiceDescription } from './invoiceLine.js';

const issue = (target, label, message, shortMessage, actionLabel) => ({ target, label, message, shortMessage, actionLabel });

export function getPosSaleIssues({ sessionReady, cart = [], selectedClientId, clientExists, client, identityValid = true, total, documentType, cashier }) {
  const issues = [];
  if (!sessionReady) issues.push(issue('session', 'caja', 'Abre una caja antes de cobrar.', 'ABRE CAJA', 'Abrir Caja'));
  if (!cart.length) issues.push(issue('items', 'productos', 'Agrega al menos un producto o servicio al carrito.', 'AGREGA PRODUCTO', 'Agregar Producto'));
  else {
    const invalid = cart.find(item => !item.productId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0);
    if (invalid) issues.push(issue('items', 'productos', `Revisa la cantidad y el precio de «${invalid.name || 'un producto'}».`, 'REVISA PRODUCTO', 'Revisar Producto'));
  }
  if (!selectedClientId) issues.push(issue('client', 'cliente', 'Selecciona un cliente o elige explícitamente Consumidor Final.', 'INGRESA CLIENTE', 'Ingresar Cliente'));
  else if (!clientExists || !client?.name) issues.push(issue('client', 'cliente', 'El cliente seleccionado ya no está disponible. Selecciona otro.', 'INGRESA CLIENTE', 'Ingresar Cliente'));
  else if (!identityValid) issues.push(issue('client', 'cliente', 'Revisa el RUC o la cédula del cliente seleccionado.', 'REVISA CLIENTE', 'Revisar Cliente'));
  else if (documentType === 'factura' && (client.ruc === '9999999999999' || client.tipoIdentificacion === 'consumidor_final') && Number(total) > 50) {
    issues.push(issue('client', 'cliente', 'Para facturas superiores a $50, identifica al cliente con RUC o cédula.', 'IDENTIFICA CLIENTE', 'Ingresar Cliente'));
  }
  if (!cashier) issues.push(issue('session', 'caja', 'Identifica al cajero responsable de esta venta.', 'IDENTIFICA CAJERO', 'Ir a Caja'));
  if (cart.length && (!Number.isFinite(Number(total)) || Number(total) <= 0)) issues.push(issue('items', 'productos', 'El total de la venta debe ser mayor a $0,00.', 'REVISA TOTAL', 'Revisar Producto'));
  return issues;
}

export function getAdministrativeSaleIssues({ clientId, client, identificationValid, items = [], total, documentType, documentNumber, paymentStatus, payments = {}, isSale = true }) {
  const issues = [];
  if (!clientId || !client) issues.push(issue('client', 'cliente', 'Selecciona un cliente antes de facturar o registrar la venta.', 'INGRESA CLIENTE', 'Ingresar Cliente'));
  else if (!identificationValid) issues.push(issue('client', 'cliente', `Revisa la identificación del cliente${client.ruc ? ` (${client.ruc})` : ''}.`, 'REVISA CLIENTE', 'Revisar Cliente'));
  else if (isSale && documentType === 'factura' && String(client.ruc || '').trim() === '9999999999999' && Number(total) > 50) {
    issues.push(issue('client', 'cliente', 'Para facturas superiores a $50, identifica al cliente con RUC o cédula.', 'IDENTIFICA CLIENTE', 'Ingresar Cliente'));
  }
  if (!items.length) issues.push(issue('items', 'productos', 'Agrega al menos un producto o servicio al comprobante.', 'AGREGA PRODUCTO', 'Agregar Producto'));
  else if (items.some(item => !item.productId || !invoiceDescription(item) || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0)) {
    issues.push(issue('items', 'productos', 'Revisa la descripción, cantidad y precio de cada línea.', 'REVISA PRODUCTO', 'Revisar Producto'));
  }
  if (!Number.isFinite(Number(total)) || Number(total) < 0) issues.push(issue('payment', 'pago', 'El total del comprobante no puede ser negativo.', 'REVISA TOTAL', 'Revisar Pago'));
  if (documentNumber && !/^\d{3}-\d{3}-\d{9}$/.test(documentNumber)) issues.push(issue('document', 'comprobante', 'El número debe tener el formato 000-000-000000000.', 'REVISA COMPROBANTE', 'Revisar Comprobante'));
  if (items.length && Number(total) > 0 && paymentStatus && !paymentStatus.isValid) {
    const paid = ['efectivo', 'transferencia', 'tarjeta', 'cruce_cuentas'].reduce((sum, key) => sum + (Number(payments[key]) || 0), 0);
    issues.push(issue('payment', 'pago', paid === 0 ? 'Ingresa un valor en al menos un medio de pago.' : paymentStatus.error || 'Completa el medio de pago.', paid === 0 ? 'INGRESA PAGO' : 'COMPLETA PAGO', 'Ingresar Pago'));
  }
  return issues;
}
