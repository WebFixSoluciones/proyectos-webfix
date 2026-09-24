import { invoiceDescription } from './invoiceLine.js';

const issue = (target, label, message) => ({ target, label, message });

export function getPosSaleIssues({ sessionReady, cart = [], selectedClientId, clientExists, client, identityValid = true, total, documentType, cashier }) {
  const issues = [];
  if (!sessionReady) issues.push(issue('session', 'caja', 'Abre una caja antes de cobrar.'));
  if (!cart.length) issues.push(issue('items', 'productos', 'Agrega al menos un producto o servicio al carrito.'));
  else {
    const invalid = cart.find(item => !item.productId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0);
    if (invalid) issues.push(issue('items', 'productos', `Revisa la cantidad y el precio de «${invalid.name || 'un producto'}».`));
  }
  if (!selectedClientId) issues.push(issue('client', 'cliente', 'Selecciona un cliente o elige explícitamente Consumidor Final.'));
  else if (!clientExists || !client?.name) issues.push(issue('client', 'cliente', 'El cliente seleccionado ya no está disponible. Selecciona otro.'));
  else if (!identityValid) issues.push(issue('client', 'cliente', 'Revisa el RUC o la cédula del cliente seleccionado.'));
  else if (documentType === 'factura' && (client.ruc === '9999999999999' || client.tipoIdentificacion === 'consumidor_final') && Number(total) > 50) {
    issues.push(issue('client', 'cliente', 'Para facturas superiores a $50, identifica al cliente con RUC o cédula.'));
  }
  if (!cashier) issues.push(issue('session', 'caja', 'Identifica al cajero responsable de esta venta.'));
  if (cart.length && (!Number.isFinite(Number(total)) || Number(total) <= 0)) issues.push(issue('items', 'productos', 'El total de la venta debe ser mayor a $0,00.'));
  return issues;
}

export function getAdministrativeSaleIssues({ clientId, client, identificationValid, items = [], total, documentType, documentNumber, paymentStatus, payments = {}, isSale = true }) {
  const issues = [];
  if (!clientId || !client) issues.push(issue('client', 'cliente', 'Selecciona un cliente antes de facturar o registrar la venta.'));
  else if (!identificationValid) issues.push(issue('client', 'cliente', `Revisa la identificación del cliente${client.ruc ? ` (${client.ruc})` : ''}.`));
  else if (isSale && documentType === 'factura' && String(client.ruc || '').trim() === '9999999999999' && Number(total) > 50) {
    issues.push(issue('client', 'cliente', 'Para facturas superiores a $50, identifica al cliente con RUC o cédula.'));
  }
  if (!items.length) issues.push(issue('items', 'productos', 'Agrega al menos un producto o servicio al comprobante.'));
  else if (items.some(item => !item.productId || !invoiceDescription(item) || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0)) {
    issues.push(issue('items', 'productos', 'Revisa la descripción, cantidad y precio de cada línea.'));
  }
  if (!Number.isFinite(Number(total)) || Number(total) < 0) issues.push(issue('payment', 'pago', 'El total del comprobante no puede ser negativo.'));
  if (documentNumber && !/^\d{3}-\d{3}-\d{9}$/.test(documentNumber)) issues.push(issue('document', 'comprobante', 'El número debe tener el formato 000-000-000000000.'));
  if (items.length && Number(total) > 0 && paymentStatus && !paymentStatus.isValid) {
    const paid = ['efectivo', 'transferencia', 'tarjeta', 'cruce_cuentas'].reduce((sum, key) => sum + (Number(payments[key]) || 0), 0);
    issues.push(issue('payment', 'pago', paid === 0 ? 'Ingresa un valor en al menos un medio de pago.' : paymentStatus.error || 'Completa el medio de pago.'));
  }
  return issues;
}
