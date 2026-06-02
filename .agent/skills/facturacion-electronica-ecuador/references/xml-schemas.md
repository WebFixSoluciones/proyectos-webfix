# XML Schemas — Comprobantes Electrónicos SRI Ecuador v2.1

## Tipos de comprobantes y sus códigos

| Código | Tipo | Archivo XSD |
|---|---|---|
| 01 | Factura | factura_v2.1.0.xsd |
| 04 | Nota de Crédito | notaCredito_v1.1.0.xsd |
| 05 | Nota de Débito | notaDebito_v1.0.0.xsd |
| 06 | Guía de Remisión | guiaRemision_v1.1.0.xsd |
| 07 | Comprobante de Retención | comprobanteRetencion_v2.0.0.xsd |
| 03 | Liquidación de Compras | liquidacionCompras_v1.1.0.xsd |

---

## 1. FACTURA — XML completo v2.1

```xml
<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="2.1.0">

  <!-- ══ INFORMACIÓN TRIBUTARIA ══════════════════════════════════ -->
  <infoTributaria>
    <ambiente>2</ambiente>                    <!-- 1=pruebas, 2=producción -->
    <tipoEmision>1</tipoEmision>              <!-- 1=normal, 2=contingencia -->
    <razonSocial>EMPRESA S.A.</razonSocial>
    <nombreComercial>MI EMPRESA</nombreComercial>
    <ruc>1792141210001</ruc>
    <claveAcceso>2401202301179214121000100000000112345678911</claveAcceso>
    <codDoc>01</codDoc>                       <!-- 01=factura -->
    <estab>001</estab>
    <ptoEmi>001</ptoEmi>
    <secuencial>000000001</secuencial>
    <dirMatriz>AV. AMAZONAS N23-45 Y COLÓN</dirMatriz>
  </infoTributaria>

  <!-- ══ INFORMACIÓN DE LA FACTURA ═══════════════════════════════ -->
  <infoFactura>
    <fechaEmision>24/01/2023</fechaEmision>   <!-- dd/MM/yyyy -->
    <dirEstablecimiento>AV. AMAZONAS N23-45</dirEstablecimiento>
    <contribuyenteEspecial>5368</contribuyenteEspecial>  <!-- si aplica, omitir si no -->
    <obligadoContabilidad>SI</obligadoContabilidad>      <!-- SI / NO -->
    <tipoIdentificacionComprador>04</tipoIdentificacionComprador>
    <!--
      Tipos de identificación comprador:
      04 = RUC
      05 = Cédula de ciudadanía
      06 = Pasaporte
      07 = Venta a consumidor final
      08 = Identificación del exterior
      09 = Placa (guía remisión)
    -->
    <guiaRemision>001-001-000000001</guiaRemision>  <!-- opcional -->
    <razonSocialComprador>JUAN PEREZ S.A.</razonSocialComprador>
    <identificacionComprador>1791234567001</identificacionComprador>
    <direccionComprador>QUITO, PICHINCHA</direccionComprador>
    <totalSinImpuestos>1000.00</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>

    <totalConImpuestos>
      <!-- IVA 15% -->
      <totalImpuesto>
        <codigo>2</codigo>                    <!-- 2=IVA -->
        <codigoPorcentaje>4</codigoPorcentaje> <!-- 0=0%, 2=exento, 3=no objeto, 4=15% -->
        <descuentoAdicional>0.00</descuentoAdicional>
        <baseImponible>1000.00</baseImponible>
        <tarifa>15.00</tarifa>
        <valor>150.00</valor>
      </totalImpuesto>
      <!-- Si hay bienes a 0% IVA, agregar otro bloque con codigoPorcentaje=0 -->
    </totalConImpuestos>

    <propina>0.00</propina>
    <importeTotal>1150.00</importeTotal>      <!-- totalSinImpuestos + IVA + ICE - descuentos -->
    <moneda>DOLAR</moneda>

    <pagos>
      <pago>
        <formaPago>01</formaPago>
        <!--
          Formas de pago SRI:
          01 = Sin utilización del sistema financiero (efectivo)
          15 = Compensación de deudas
          16 = Tarjeta de débito
          17 = Dinero electrónico
          18 = Tarjeta prepago
          19 = Tarjeta de crédito
          20 = Otros con utilización del sistema financiero
          21 = Endoso de títulos
        -->
        <total>1150.00</total>
        <plazo>0</plazo>                      <!-- días de plazo, 0=contado -->
        <unidadTiempo>dias</unidadTiempo>
      </pago>
    </pagos>
  </infoFactura>

  <!-- ══ DETALLE DE PRODUCTOS/SERVICIOS ══════════════════════════ -->
  <detalles>
    <detalle>
      <codigoPrincipal>PROD-001</codigoPrincipal>
      <codigoAuxiliar>BAR-001</codigoAuxiliar>  <!-- opcional -->
      <descripcion>PRODUCTO DE EJEMPLO</descripcion>
      <cantidad>2.000000</cantidad>
      <precioUnitario>500.000000</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>1000.00</precioTotalSinImpuesto>
      <detallesAdicionales>
        <detAdicional nombre="Color" valor="Azul"/>  <!-- opcional -->
      </detallesAdicionales>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>                  <!-- 2=IVA, 3=ICE -->
          <codigoPorcentaje>4</codigoPorcentaje>
          <tarifa>15.00</tarifa>
          <baseImponible>1000.00</baseImponible>
          <valor>150.00</valor>
        </impuesto>
      </impuestos>
    </detalle>
  </detalles>

  <!-- ══ INFORMACIÓN ADICIONAL (opcional) ════════════════════════ -->
  <infoAdicional>
    <campoAdicional nombre="Email">cliente@ejemplo.com</campoAdicional>
    <campoAdicional nombre="Teléfono">0999999999</campoAdicional>
  </infoAdicional>

</factura>
```

---

## 2. NOTA DE CRÉDITO — XML v1.1.0

```xml
<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">

  <infoTributaria>
    <ambiente>2</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>EMPRESA S.A.</razonSocial>
    <ruc>1792141210001</ruc>
    <claveAcceso>2401202304179214121000100000000112345678911</claveAcceso>
    <codDoc>04</codDoc>                       <!-- 04 = nota de crédito -->
    <estab>001</estab>
    <ptoEmi>001</ptoEmi>
    <secuencial>000000001</secuencial>
    <dirMatriz>AV. AMAZONAS N23-45</dirMatriz>
  </infoTributaria>

  <infoNotaCredito>
    <fechaEmision>24/01/2023</fechaEmision>
    <dirEstablecimiento>AV. AMAZONAS N23-45</dirEstablecimiento>
    <tipoIdentificacionComprador>04</tipoIdentificacionComprador>
    <razonSocialComprador>JUAN PEREZ S.A.</razonSocialComprador>
    <identificacionComprador>1791234567001</identificacionComprador>
    <obligadoContabilidad>SI</obligadoContabilidad>
    <codDocModificado>01</codDocModificado>   <!-- tipo doc que se modifica -->
    <numDocModificado>001-001-000000001</numDocModificado>
    <fechaEmisionDocSustento>20/01/2023</fechaEmisionDocSustento>
    <totalSinImpuestos>100.00</totalSinImpuestos>
    <valorModificacion>115.00</valorModificacion>
    <moneda>DOLAR</moneda>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>4</codigoPorcentaje>
        <baseImponible>100.00</baseImponible>
        <tarifa>15.00</tarifa>
        <valor>15.00</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <motivo>DEVOLUCIÓN DE MERCADERÍA</motivo>
  </infoNotaCredito>

  <detalles>
    <detalle>
      <codigoInterno>PROD-001</codigoInterno>
      <descripcion>PRODUCTO DEVUELTO</descripcion>
      <cantidad>1.000000</cantidad>
      <precioUnitario>100.000000</precioUnitario>
      <descuento>0.00</descuento>
      <precioTotalSinImpuesto>100.00</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>4</codigoPorcentaje>
          <tarifa>15.00</tarifa>
          <baseImponible>100.00</baseImponible>
          <valor>15.00</valor>
        </impuesto>
      </impuestos>
    </detalle>
  </detalles>

</notaCredito>
```

---

## 3. COMPROBANTE DE RETENCIÓN — XML v2.0.0

```xml
<?xml version="1.0" encoding="UTF-8"?>
<comprobanteRetencion id="comprobante" version="2.0.0">

  <infoTributaria>
    <ambiente>2</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>EMPRESA RETENEDORA S.A.</razonSocial>
    <ruc>1792141210001</ruc>
    <claveAcceso>2401202307179214121000100000000112345678911</claveAcceso>
    <codDoc>07</codDoc>
    <estab>001</estab>
    <ptoEmi>001</ptoEmi>
    <secuencial>000000001</secuencial>
    <dirMatriz>AV. AMAZONAS N23-45</dirMatriz>
  </infoTributaria>

  <infoCompRetencion>
    <fechaEmision>24/01/2023</fechaEmision>
    <dirEstablecimiento>AV. AMAZONAS N23-45</dirEstablecimiento>
    <obligadoContabilidad>SI</obligadoContabilidad>
    <tipoIdentificacionSujetoRetenido>04</tipoIdentificacionSujetoRetenido>
    <razonSocialSujetoRetenido>PROVEEDOR S.A.</razonSocialSujetoRetenido>
    <identificacionSujetoRetenido>0912345678001</identificacionSujetoRetenido>
    <periodoFiscal>01/2023</periodoFiscal>    <!-- MM/yyyy -->
  </infoCompRetencion>

  <impuestos>
    <!-- RETENCIÓN EN LA FUENTE -->
    <impuesto>
      <codigo>1</codigo>                      <!-- 1=renta, 2=IVA, 6=ISD -->
      <codigoRetencion>312</codigoRetencion>  <!-- código SRI de retención -->
      <baseImponible>500.00</baseImponible>
      <porcentajeRetener>1.00</porcentajeRetener>
      <valorRetenido>5.00</valorRetenido>
      <codDocSustento>01</codDocSustento>     <!-- tipo de comprobante sustento -->
      <numDocSustento>001-001-000000010</numDocSustento>
      <fechaEmisionDocSustento>23/01/2023</fechaEmisionDocSustento>
    </impuesto>
    <!-- RETENCIÓN DE IVA (si aplica) -->
    <impuesto>
      <codigo>2</codigo>
      <codigoRetencion>721</codigoRetencion>  <!-- 721=30%, 723=70%, 725=100% -->
      <baseImponible>500.00</baseImponible>
      <porcentajeRetener>30.00</porcentajeRetener>
      <valorRetenido>22.50</valorRetenido>    <!-- 500 × 15% × 30% = 22.50 -->
      <codDocSustento>01</codDocSustento>
      <numDocSustento>001-001-000000010</numDocSustento>
      <fechaEmisionDocSustento>23/01/2023</fechaEmisionDocSustento>
    </impuesto>
  </impuestos>

</comprobanteRetencion>
```

---

## 4. Generación de XML con Node.js

```typescript
// xml-builder.ts
import { create } from 'xmlbuilder2';

interface DetalleFactura {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tarifaIva: number;           // 0, 15
  codigoIva: number;           // 0, 4
}

interface DatosFactura {
  ambiente: 1 | 2;
  rucEmisor: string;
  razonSocialEmisor: string;
  nombreComercialEmisor: string;
  dirMatriz: string;
  dirEstablecimiento: string;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  claveAcceso: string;
  fechaEmision: string;        // 'dd/MM/yyyy'
  tipoIdComprador: string;
  rucComprador: string;
  razonSocialComprador: string;
  detalles: DetalleFactura[];
  formaPago: string;
  obligadoContabilidad: 'SI' | 'NO';
  contribuyenteEspecial?: string;
}

export function generarXmlFactura(datos: DatosFactura): string {
  // Calcular totales
  const totales = calcularTotales(datos.detalles);

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('factura', { id: 'comprobante', version: '2.1.0' });

  // infoTributaria
  const it = root.ele('infoTributaria');
  it.ele('ambiente').txt(String(datos.ambiente));
  it.ele('tipoEmision').txt('1');
  it.ele('razonSocial').txt(datos.razonSocialEmisor);
  it.ele('nombreComercial').txt(datos.nombreComercialEmisor);
  it.ele('ruc').txt(datos.rucEmisor);
  it.ele('claveAcceso').txt(datos.claveAcceso);
  it.ele('codDoc').txt('01');
  it.ele('estab').txt(datos.establecimiento);
  it.ele('ptoEmi').txt(datos.puntoEmision);
  it.ele('secuencial').txt(datos.secuencial);
  it.ele('dirMatriz').txt(datos.dirMatriz);

  // infoFactura
  const inf = root.ele('infoFactura');
  inf.ele('fechaEmision').txt(datos.fechaEmision);
  inf.ele('dirEstablecimiento').txt(datos.dirEstablecimiento);
  if (datos.contribuyenteEspecial) inf.ele('contribuyenteEspecial').txt(datos.contribuyenteEspecial);
  inf.ele('obligadoContabilidad').txt(datos.obligadoContabilidad);
  inf.ele('tipoIdentificacionComprador').txt(datos.tipoIdComprador);
  inf.ele('razonSocialComprador').txt(datos.razonSocialComprador);
  inf.ele('identificacionComprador').txt(datos.rucComprador);
  inf.ele('totalSinImpuestos').txt(totales.subtotal.toFixed(2));
  inf.ele('totalDescuento').txt(totales.descuento.toFixed(2));

  const tci = inf.ele('totalConImpuestos');
  if (totales.baseIva15 > 0) {
    const ti = tci.ele('totalImpuesto');
    ti.ele('codigo').txt('2');
    ti.ele('codigoPorcentaje').txt('4');
    ti.ele('descuentoAdicional').txt('0.00');
    ti.ele('baseImponible').txt(totales.baseIva15.toFixed(2));
    ti.ele('tarifa').txt('15.00');
    ti.ele('valor').txt(totales.iva15.toFixed(2));
  }
  if (totales.baseIva0 > 0) {
    const ti = tci.ele('totalImpuesto');
    ti.ele('codigo').txt('2');
    ti.ele('codigoPorcentaje').txt('0');
    ti.ele('descuentoAdicional').txt('0.00');
    ti.ele('baseImponible').txt(totales.baseIva0.toFixed(2));
    ti.ele('tarifa').txt('0.00');
    ti.ele('valor').txt('0.00');
  }

  inf.ele('propina').txt('0.00');
  inf.ele('importeTotal').txt(totales.total.toFixed(2));
  inf.ele('moneda').txt('DOLAR');

  const pagos = inf.ele('pagos').ele('pago');
  pagos.ele('formaPago').txt(datos.formaPago);
  pagos.ele('total').txt(totales.total.toFixed(2));
  pagos.ele('plazo').txt('0');
  pagos.ele('unidadTiempo').txt('dias');

  // detalles
  const detalles = root.ele('detalles');
  for (const det of datos.detalles) {
    const d = detalles.ele('detalle');
    d.ele('codigoPrincipal').txt(det.codigoPrincipal);
    d.ele('descripcion').txt(det.descripcion);
    d.ele('cantidad').txt(det.cantidad.toFixed(6));
    d.ele('precioUnitario').txt(det.precioUnitario.toFixed(6));
    d.ele('descuento').txt(det.descuento.toFixed(2));
    const precioTotal = det.cantidad * det.precioUnitario - det.descuento;
    d.ele('precioTotalSinImpuesto').txt(precioTotal.toFixed(2));
    const imp = d.ele('impuestos').ele('impuesto');
    imp.ele('codigo').txt('2');
    imp.ele('codigoPorcentaje').txt(String(det.codigoIva));
    imp.ele('tarifa').txt(det.tarifaIva.toFixed(2));
    imp.ele('baseImponible').txt(precioTotal.toFixed(2));
    imp.ele('valor').txt((precioTotal * det.tarifaIva / 100).toFixed(2));
  }

  return root.end({ prettyPrint: false });
}

function calcularTotales(detalles: DetalleFactura[]) {
  let subtotal = 0, descuento = 0, baseIva15 = 0, baseIva0 = 0;

  for (const d of detalles) {
    const base = d.cantidad * d.precioUnitario - d.descuento;
    subtotal += base;
    descuento += d.descuento;
    if (d.tarifaIva === 15) baseIva15 += base;
    else baseIva0 += base;
  }

  const iva15 = baseIva15 * 0.15;
  return { subtotal, descuento, baseIva15, baseIva0, iva15, total: subtotal + iva15 };
}
```