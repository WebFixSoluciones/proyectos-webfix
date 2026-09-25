import { UiButton } from '../components/ui/controls';
import { invoiceDescription, invoiceLineAmounts } from '../services/invoiceLine';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, getAppId } from '../firebase';

function numeroALetras(num) {
  const unidades = ['SIN', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
  const decenasGrandes = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHECIENTOS', 'NOVECIENTOS'];

  function decodificar(n) {
    if (n < 10) return unidades[n];
    if (n >= 10 && n <= 19) return decenas[n - 10];
    if (n >= 20 && n <= 29) return n === 20 ? 'VEINTE' : 'VEINTI' + unidades[n - 20];
    const dec = Math.floor(n / 10);
    const uni = n % 10;
    return decenasGrandes[dec] + (uni > 0 ? ' Y ' + unidades[uni] : '');
  }

  function centenasFn(n) {
    if (n === 100) return 'CIEN';
    if (n < 100) return decodificar(n);
    const cen = Math.floor(n / 100);
    const resto = n % 100;
    return (cen === 1 ? 'CIENTO' : centenas[cen]) + (resto > 0 ? ' ' + decodificar(resto) : '');
  }

  function milesFn(n) {
    if (n < 1000) return centenasFn(n);
    const mil = Math.floor(n / 1000);
    const resto = n % 1000;
    // eslint-disable-next-line no-useless-assignment
    let milStr = '';
    if (mil === 1) milStr = 'MIL';
    else milStr = centenasFn(mil) + ' MIL';
    return milStr + (resto > 0 ? ' ' + centenasFn(resto) : '');
  }

  const partes = String(Number(num).toFixed(2)).split('.');
  const entero = parseInt(partes[0]);
  const decimales = partes[1];

  // eslint-disable-next-line no-useless-assignment
  let enteroStr = '';
  if (entero === 0) enteroStr = 'CERO';
  else enteroStr = milesFn(entero);

  return `SON: ${enteroStr} CON ${decimales}/100 DÓLARES`;
}

function MockBarcode({ claveAcceso }) {
  return (
    <div className="flex flex-col items-center my-1 select-none print:my-0.5 w-full max-w-full overflow-hidden">
      <div className="flex h-6 w-full max-w-[280px] bg-white items-stretch justify-center gap-[1px] px-1 py-0.5" style={{ backgroundColor: '#ffffff' }}>
        {[2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2].map((w, idx) => (
          <div key={idx} className="bg-black" style={{ width: `${w}px`, backgroundColor: '#000000', height: '100%' }}></div>
        ))}
      </div>
      <span className="font-mono text-black text-center mt-0.5 select-all" style={{ fontSize: '7.8px', letterSpacing: '0.01em', lineHeight: '1.1', maxWidth: '100%' }}>{claveAcceso}</span>
    </div>
  );
}

export default function PublicRideView() {
  const [searchParams] = useSearchParams();
  const claveAcceso = searchParams.get('claveAcceso');
  const txId = searchParams.get('txId') || searchParams.get('id');
  const tenantId = searchParams.get('tenantId');
  const effectiveTenantId = tenantId || getAppId();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tx, setTx] = useState(null);
  const [companyConfig, setCompanyConfig] = useState(null);

  useEffect(() => {
    if (!claveAcceso && !txId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Enlace inválido. Falta el parámetro de clave de acceso o identificador del comprobante.');
      setLoading(false);
      return;
    }

    async function loadPublicData() {
      try {
        let txData = null;
        if (txId) {
          const docSnap = await getDoc(
            doc(db, 'artifacts', effectiveTenantId, 'public', 'data', 'finances_transactions', txId)
          );
          if (docSnap.exists()) {
            txData = { ...docSnap.data(), id: docSnap.id };
          }
        }
        if (!txData && claveAcceso) {
          const q = query(
            collection(db, 'artifacts', effectiveTenantId, 'public', 'data', 'finances_transactions'),
            where('claveAcceso', '==', claveAcceso)
          );
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            txData = { ...querySnap.docs[0].data(), id: querySnap.docs[0].id };
          }
        }

        if (!txData) {
          setError('No se encontró ningún comprobante con los parámetros especificados.');
          setLoading(false);
          return;
        }

        setTx(txData);

        // 2. Cargar configuración de la empresa (Emisor)
        const configSnap = await getDoc(
          doc(db, 'artifacts', effectiveTenantId, 'public', 'data', 'finances_settings', 'config')
        );
        if (configSnap.exists()) {
          setCompanyConfig(configSnap.data());
        }
      } catch (err) {
        console.error('Error al cargar comprobante público:', err);
        setError('Ocurrió un error al cargar el comprobante electrónico.');
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, [claveAcceso, txId, effectiveTenantId]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-text-heading text-white font-sans">
        <RefreshCw className="animate-spin text-primary mb-4" size={40} />
        <p className="text-sm font-bold uppercase tracking-wider text-text-secondary">Cargando Comprobante RIDE...</p>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-text-heading text-white font-sans px-4">
        <div className="max-w-md w-full bg-text-heading border border-border-strong rounded-card p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-semibold uppercase text-red-400">Error de Consulta</h2>
          <p className="text-text-secondary text-xs leading-relaxed">{error || 'Comprobante no disponible.'}</p>
          <div className="text-xs font-mono text-text-secondary break-all select-all">
            Clave: {claveAcceso || 'No proporcionada'}
          </div>
        </div>
      </div>
    );
  }

  const emisor = tx.emisorSnapshot || companyConfig || {
    razonSocial: 'EMISOR DEMO S.A.',
    nombreComercial: 'MI NEGOCIO',
    ruc: '1790000000001',
    establecimiento: '001',
    puntoEmision: '001',
    direccionMatriz: 'Av. Principal 123, Quito, Ecuador',
    obligadoContabilidad: false,
    contribuyenteRimpe: 'general',
    ambiente: '1',
    resolucionMicro: ''
  };

  const getDocTypeLabel = () => {
    if (tx.isPreventa) return 'PREVENTA / PEDIDO';
    switch (tx.documentType) {
      case 'factura': return 'FACTURA ELECTRÓNICA';
      case 'nota_credito': return 'NOTA DE CRÉDITO';
      case 'nota_debito': return 'NOTA DE DÉBITO';
      case 'nota_venta': return 'RECIBO';
      case 'retencion': return 'COMPROBANTE DE RETENCIÓN';
      case 'liquidacion': return 'LIQUIDACIÓN DE COMPRA';
      case 'guia_remision': return 'GUÍA DE REMISIÓN';
      case 'cotizacion': return 'COTIZACIÓN / PROFORMA';
      default: return 'COMPROBANTE';
    }
  };

  const client = {
    name: tx.thirdParty?.name || tx.thirdPartyName || 'Consumidor Final',
    ruc: tx.thirdParty?.ruc || tx.thirdPartyRuc || '9999999999999',
    direccion: tx.thirdParty?.direccion || tx.thirdPartyDireccion || 'Ecuador',
    email: tx.thirdParty?.email || tx.thirdPartyEmail || 'N/D',
    telefono: tx.thirdParty?.telefono || tx.thirdPartyTelefono || 'N/D'
  };

  const getPaymentsTableRows = () => {
    const breakdown = tx.paymentsBreakdown || {};
    const rows = [];
    const getMethodLabel = (method) => {
      switch (method) {
        case 'efectivo': return '01 - SIN UTILIZACION DEL SISTEMA FINANCIERO (EFECTIVO)';
        case 'tarjeta': return '19 - TARJETA DE CREDITO/DEBITO';
        case 'transferencia': return '20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO';
        case 'cruce_cuentas': return '15 - COMPENSACION DE DEUDAS';
        case 'credito': return '19 - TARJETA DE CREDITO/DEBITO (CRÉDITO)';
        default: return '20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO';
      }
    };
    if (Number(breakdown.efectivo || 0) > 0) rows.push({ method: getMethodLabel('efectivo'), val: breakdown.efectivo });
    if (Number(breakdown.transferencia || 0) > 0) rows.push({ method: getMethodLabel('transferencia'), val: breakdown.transferencia });
    if (Number(breakdown.tarjeta || 0) > 0) rows.push({ method: getMethodLabel('tarjeta'), val: breakdown.tarjeta });
    if (Number(breakdown.cruce_cuentas || 0) > 0) rows.push({ method: getMethodLabel('cruce_cuentas'), val: breakdown.cruce_cuentas });
    if (Number(breakdown.credito || 0) > 0) rows.push({ method: getMethodLabel('credito'), val: breakdown.credito });

    if (rows.length === 0) {
      rows.push({ method: getMethodLabel(tx.paymentMethod || 'efectivo'), val: tx.total || 0 });
    }
    return rows;
  };

  const getEmisorCity = () => {
    if (emisor.ciudad) return emisor.ciudad.toUpperCase();
    if (!emisor.direccionMatriz) return 'QUITO';
    const parts = emisor.direccionMatriz.split(',');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1].trim().toUpperCase();
      if (lastPart === 'ECUADOR' && parts.length > 2) {
        return parts[parts.length - 2].trim().toUpperCase();
      }
      return lastPart;
    }
    return 'QUITO';
  };
  const emisorCiudad = getEmisorCity();

  const calculateTaxDetails = () => {
    const items = tx.items || [];
    let subtotal15 = 0;
    let subtotal5 = 0;
    let subtotal0 = 0;
    let subtotalNoObjeto = 0;
    let subtotalExento = 0;
    let totalDiscount = 0;

    if (items.length > 0) {
      items.forEach(item => {
        const { discount: itemDisc, base: lineBase, rate } = invoiceLineAmounts(item);

        if (rate === 15 || rate === 12) {
          subtotal15 += lineBase;
        } else if (rate === 5) {
          subtotal5 += lineBase;
        } else if (rate === 0) {
          subtotal0 += lineBase;
        } else if (item.ivaCategory === 'no_objeto') {
          subtotalNoObjeto += lineBase;
        } else if (item.ivaCategory === 'exento') {
          subtotalExento += lineBase;
        } else {
          // Fallback based on global VAT value
          if (Number(tx.ivaValor) > 0) {
            subtotal15 += lineBase;
          } else {
            subtotal0 += lineBase;
          }
        }
        totalDiscount += itemDisc;
      });
    } else {
      const base = Number(tx.baseImponible) || 0;
      if (Number(tx.ivaValor) > 0) {
        subtotal15 = base;
      } else {
        subtotal0 = base;
      }
      totalDiscount = Number(tx.descuentoValor) || 0;
    }

    const subtotalSinImpuestos = subtotal15 + subtotal5 + subtotal0 + subtotalNoObjeto + subtotalExento;
    const iva15 = subtotal15 * 0.15;
    const iva5 = subtotal5 * 0.05;
    const finalIva15 = Math.abs(iva15 - Number(tx.ivaValor)) < 0.1 ? Number(tx.ivaValor) : iva15;

    return {
      subtotal15,
      subtotal5,
      subtotal0,
      subtotalNoObjeto,
      subtotalExento,
      subtotalSinImpuestos,
      totalDiscount,
      iva15: finalIva15,
      iva5,
      total: Number(tx.total) || (subtotalSinImpuestos + finalIva15 + iva5)
    };
  };
  const taxDetails = calculateTaxDetails();

  const hasIva15 = (Number(taxDetails.subtotal15) > 0) || (Number(taxDetails.iva15) > 0) || (Number(tx.ivaValor) > 0);
  const hasIva5 = (Number(taxDetails.subtotal5) > 0) || (Number(taxDetails.iva5) > 0);
  const hasIva0 = (Number(taxDetails.subtotal0) > 0) || (!hasIva15 && !hasIva5 && Number(taxDetails.subtotalNoObjeto || 0) === 0 && Number(taxDetails.subtotalExento || 0) === 0);
  const hasNoObjeto = Number(taxDetails.subtotalNoObjeto) > 0;
  const hasExento = Number(taxDetails.subtotalExento) > 0;
  const hasDiscount = Number(taxDetails.totalDiscount) > 0 || Number(tx.descuentoValor) > 0;
  const hasIce = Number(tx.iceValor) > 0;
  const hasIrbpnr = Number(tx.irbpnrValor) > 0;
  const hasPropina = Number(tx.propinaValor) > 0;
  const hasIrf175 = Number(tx.irf175Valor) > 0;
  const hasIrf275 = Number(tx.irf275Valor) > 0;
  const hasRetFuente = Number(tx.retencionFuente) > 0;
  const hasRetIva = Number(tx.retencionIva) > 0;

  const formatSequential = (seqVal, estab = '001', pto = '001') => {
    if (!seqVal) return `${estab}-${pto}-000000001`;
    const cleanSeq = String(seqVal).replace(/[^0-9]/g, '');
    const padded = cleanSeq.padStart(9, '0');
    return `${estab}-${pto}-${padded}`;
  };

  const docNumFormatted = tx.documentNumber || formatSequential(tx.id ? tx.id.replace(/[^0-9]/g, '').slice(-6) : '1', emisor.establecimiento, emisor.puntoEmision);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-text-heading text-text-secondary font-sans print:bg-white print:text-black public-ride-outer">
      {/* Estilos para impresión limpia sin desfase superior */}
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }

        @media print {
          html, body, #root {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            display: block !important;
          }

          .print-hide, .print-hide * {
            display: none !important;
          }

          .public-ride-outer {
            background: transparent !important;
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }

          .public-ride-scroll {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
          }

          #print-area-wrapper {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #print-area-wrapper > div {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          #print-area-wrapper table,
          #print-area-wrapper th,
          #print-area-wrapper td {
            font-size: 8px !important;
          }

          #print-area-wrapper .grid-cols-2,
          #print-area-wrapper .grid-cols-2 *,
          #print-area-wrapper p.uppercase {
            font-size: 8px !important;
          }

          .print-grid-5 {
            display: grid !important;
            grid-template-columns: 3fr 2fr !important;
            gap: 8px !important;
          }
        }
      `}} />

      {/* Top action bar */}
      <div className="sticky top-0 z-50 bg-text-heading/80 border-b border-border-strong/80 px-4 py-3 flex items-center justify-between print-hide print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-surface-card/20 flex items-center justify-center text-text-secondary border border-border-default/30">
            <FileText size={16} />
          </div>
          <div>
            <h1 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Visor RIDE Oficial</h1>
            <p className="text-xs text-text-secondary font-mono select-all mt-0.5">{claveAcceso}</p>
          </div>
        </div>

        <UiButton
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 rounded-card bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase transition-transform hover:-translate-y-0.5"
        >
          <Printer size={12} /> Imprimir / PDF
        </UiButton>
      </div>

      {/* RIDE Content Sheet */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-text-heading print:p-0 print:bg-white public-ride-scroll">
        <div id="print-area-wrapper" className="w-full max-w-3xl">
          <div className="w-full mx-auto p-5 bg-white border border-border-strong text-black text-xs font-sans leading-snug print:max-w-none print:w-full print:border-none print:p-0 print:m-0">
            
            {/* Cabecera Principal Compacta */}
            <div className="border border-border-strong grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-300 print:grid-cols-2 print:divide-x print:divide-y-0 text-black" style={{ fontSize: '10.5px', lineHeight: '1.3' }}>
              
              {/* Columna Izquierda: Datos del Emisor */}
              <div className="p-2.5 flex items-start gap-2.5 min-w-0">
                {emisor.logoUrl ? (
                  <img src={emisor.logoUrl} alt="Logo" className="max-h-12 max-w-[100px] object-contain print:max-h-10 shrink-0" />
                ) : (
                  <div className="h-10 w-20 bg-surface-muted border border-border-strong rounded flex items-center justify-center font-bold text-xs text-text-primary tracking-wider shrink-0">LOGOTIPO</div>
                )}
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h2 className="font-bold uppercase leading-tight text-black truncate" style={{ fontSize: '11px' }}>{emisor.razonSocial}</h2>
                  {emisor.nombreComercial && <p className="font-bold text-black truncate" style={{ fontSize: '10.5px' }}>{emisor.nombreComercial}</p>}
                  <p><span className="font-bold">RUC:</span> {emisor.ruc}</p>
                  {emisor.contribuyenteEspecial && (
                    <p><span className="font-bold">Contribuyente Especial Resolución Nro.</span> {emisor.especialResolucion || '3257'}</p>
                  )}
                  <p><span className="font-bold">Obligado a llevar contabilidad:</span> {emisor.obligadoContabilidad ? 'SÍ' : 'NO'}</p>
                  {emisor.agenteRetencion && (
                    <p><span className="font-bold">Gran Contribuyente:</span> {emisor.agenteResolucion || 'NAC-GCR-OIOC21-00000928-E'}</p>
                  )}
                  <p className="truncate"><span className="font-bold">Dirección Matriz:</span> {emisor.direccionMatriz}</p>
                  {emisor.sucursales && emisor.sucursales.length > 0 && emisor.sucursales[0].direccion !== emisor.direccionMatriz && (
                    <p className="truncate"><span className="font-bold">Dirección Sucursal:</span> {emisor.sucursales[0].direccion}</p>
                  )}
                  <p><span className="font-bold">Teléfono:</span> {emisor.telefonoContacto || emisor.telefono || 'N/D'}</p>
                  <p className="uppercase"><span className="font-bold">Ciudad:</span> {emisorCiudad} - ECUADOR</p>
                  {emisor.contribuyenteRimpe && emisor.contribuyenteRimpe !== 'general' && (
                    <p className="mt-0.5"><span className="font-bold uppercase border border-black border-dashed px-1 py-0.2 text-xs">Régimen Rimpe: {emisor.contribuyenteRimpe.replace('_', ' ')}</span></p>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Autorización y Factura */}
              <div className="p-2.5 flex flex-col justify-between space-y-1 min-w-0">
                {tx.documentType === 'nota_venta' ? (
                  <div className="space-y-0.5">
                    <p><span className="font-bold">TIPO DE DOCUMENTO:</span> RECIBO INTERNO</p>
                    <p><span className="font-bold">ESTADO:</span> REGISTRADO</p>
                    <p><span className="font-bold">VALIDEZ:</span> CONTROL INTERNO / NO TRIBUTARIO</p>
                    <p><span className="font-bold">FECHA DE REGISTRO:</span> {tx.date.split('-').reverse().join('/')} {tx.time || ''}</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center" style={{ fontSize: '10.5px' }}>
                      <p><span className="font-bold">Ambiente:</span> {emisor.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}</p>
                      <p><span className="font-bold">Emisión:</span> NORMAL</p>
                    </div>
                    <p className="mt-1"><span className="font-bold">Clave Acceso/ No. Autorización:</span></p>
                    <p className="font-mono select-all tracking-normal text-black" style={{ fontSize: '8px', lineHeight: '1.25' }}>{claveAcceso}</p>
                    <p className="mt-1"><span className="font-bold">FECHA Y HORA DE AUTORIZACIÓN:</span> {tx.fechaAutorizacion || 'No confirmada por el SRI'}</p>
                    
                    {/* Código de barras */}
                    <div className="my-1.5">
                      <MockBarcode claveAcceso={claveAcceso} />
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-250 pt-1.5 mt-auto">
                  <h2 className="font-bold tracking-wide text-black uppercase leading-none" style={{ fontSize: '11px' }}>
                    {getDocTypeLabel()} {docNumFormatted}
                  </h2>
                </div>
              </div>
            </div>

            {/* Datos del Receptor Compactos (Detalle de Cliente) */}
            <div className="mt-2.5 border border-border-strong text-black" style={{ fontSize: '10.5px', lineHeight: '1.3' }}>
              {/* Fila 1 */}
              <div className="grid grid-cols-12">
                <div className="col-span-8 py-[2px] px-1.5 truncate">
                  <span className="font-bold">CLIENTE:</span> {client.name}
                </div>
                <div className="col-span-4 py-[2px] px-1.5 truncate">
                  <span className="font-bold">DOC. INTERNO:</span> {tx.docInterno || tx.quoteNumber || 'Ninguno'}
                </div>
              </div>

              {/* Fila 2 */}
              <div className="grid grid-cols-12">
                <div className="col-span-8 py-[2px] px-1.5 truncate">
                  <span className="font-bold">DIRECCIÓN:</span> {client.direccion || 'Ecuador'}
                </div>
                <div className="col-span-4 py-[2px] px-1.5">
                  <span className="font-bold">DOC. REFERENCIA:</span> {tx.docReferencia || 'Ninguno'}
                </div>
              </div>

              {/* Fila 3 */}
              <div className="grid grid-cols-12">
                <div className="col-span-8 py-[2px] px-1.5">
                  <span className="font-bold">CI o RUC:</span> {client.ruc}
                </div>
                <div className="col-span-4 py-[2px] px-1.5">
                  <span className="font-bold">FECHA ORDEN:</span> {tx.fechaOrden || tx.date.split('-').reverse().join('/')}
                </div>
              </div>

              {/* Fila 4 */}
              <div className="grid grid-cols-12">
                <div className="col-span-8 py-[2px] px-1.5">
                  <span className="font-bold">TELÉFONO:</span> {client.telefono || 'N/D'}
                </div>
                <div className="col-span-4 py-[2px] px-1.5">
                  <span className="font-bold">GUÍA DE REMISIÓN:</span> {tx.guiaRemision || 'Sin Guía'}
                </div>
              </div>

              {/* Fila 5 */}
              <div className="grid grid-cols-12">
                <div className="col-span-8 py-[2px] px-1.5 uppercase">
                  <span className="font-bold">CIUDAD:</span> {client.ciudad || (client.direccion ? client.direccion.split(',').pop().trim().toUpperCase() : 'QUITO')}
                </div>
                <div className="col-span-4 py-[2px] px-1.5">
                  <span className="font-bold">FECHA EMISIÓN:</span> {tx.date.split('-').reverse().join('/')}
                </div>
              </div>

              {/* Fila 6 */}
              <div className="grid grid-cols-12">
                <div className="col-span-8 py-[2px] px-1.5 truncate">
                  <span className="font-bold">EMAIL:</span> {client.email || 'N/D'}
                </div>
                <div className="col-span-4 py-[2px] px-1.5">
                  <span className="font-bold">FECHA VENCIMIENTO:</span> {tx.creditDueDate ? tx.creditDueDate.split('-').reverse().join('/') : tx.date.split('-').reverse().join('/')}
                </div>
              </div>
            </div>

            {/* Detalle de Artículos */}
            <div className="mt-3 border border-border-strong overflow-hidden" style={{ borderRadius: '0px' }}>
              <table className="w-full text-left text-xs text-black">
                <thead className="bg-surface-muted font-bold uppercase text-xs border-b border-border-strong text-black">
                  <tr>
                    <th className="px-2 py-1 border-r border-border-strong w-8 text-center">ITEM</th>
                    <th className="px-2 py-1 border-r border-border-strong w-16">CODIGO</th>
                    <th className="px-2 py-1 border-r border-border-strong">DESCRIPCION</th>
                    <th className="px-2 py-1 border-r border-border-strong w-12 text-center">U/M</th>
                    <th className="px-2 py-1 border-r border-border-strong w-12 text-right">CANTIDAD</th>
                    <th className="px-2 py-1 border-r border-border-strong text-right w-16">V.UNIT</th>
                    <th className="px-2 py-1 border-r border-border-strong text-right w-12">DESC.</th>
                    <th className="px-2 py-1 text-right w-16">V.TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tx.items && tx.items.length > 0 ? (
                    tx.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-border-default">
                        <td className="px-2 py-1 border-r border-border-strong text-center font-mono">{idx + 1}</td>
                        <td className="px-2 py-1 border-r border-border-strong font-mono">{item.sku || 'SERV'}</td>
                        <td className="px-2 py-1 border-r border-border-strong font-medium">{invoiceDescription(item)}</td>
                        <td className="px-2 py-1 border-r border-border-strong text-center uppercase font-mono">{item.unit || 'UNIDAD'}</td>
                        <td className="px-2 py-1 border-r border-border-strong text-right">{item.quantity}</td>
                        <td className="px-2 py-1 border-r border-border-strong text-right">${invoiceLineAmounts(item).unitPrice.toFixed(2)}</td>
                        <td className="px-2 py-1 border-r border-border-strong text-right">${invoiceLineAmounts(item).discount.toFixed(2)}</td>
                        <td className="px-2 py-1 text-right font-bold">${invoiceLineAmounts(item).base.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-border-default">
                      <td className="px-2 py-1 border-r border-border-strong text-center font-mono">1</td>
                      <td className="px-2 py-1 border-r border-border-strong font-mono">COM01</td>
                      <td className="px-2 py-1 border-r border-border-strong font-medium">Servicios Comerciales - {tx.category || 'Ventas'}</td>
                      <td className="px-2 py-1 border-r border-border-strong text-center uppercase font-mono">UNIDAD</td>
                      <td className="px-2 py-1 border-r border-border-strong text-right">1</td>
                      <td className="px-2 py-1 border-r border-border-strong text-right">${Number(tx.baseImponible).toFixed(2)}</td>
                      <td className="px-2 py-1 border-r border-border-strong text-right">$0.00</td>
                      <td className="px-2 py-1 text-right font-bold">${Number(tx.baseImponible).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Formas de Pago e Información Adicional y Totales */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-start print-grid-5 text-xs text-black">
              
              {/* Columna Izquierda: Información Adicional y Pagos */}
              <div className="md:col-span-3 space-y-2">
                <div className="p-2 border border-border-strong space-y-1">
                  <p className="font-bold border-b border-border-default pb-0.5 uppercase mb-1">Información Adicional</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-xs">
                    <p><span className="font-bold">Asesor:</span> {tx.createdBy || 'ADMINISTRADOR'}</p>
                    <p><span className="font-bold">Tipo Orden:</span> ZVTA</p>
                    <p><span className="font-bold">Condición de Pago:</span> {tx.paymentMethod === 'credito' ? 'Crédito' : 'Contado'}</p>
                    <p className="truncate"><span className="font-bold">Forma de Pago:</span> {(() => {
                      switch (tx.paymentMethod) {
                        case 'efectivo': return 'Efectivo';
                        case 'tarjeta': return 'Tarjeta Crédito';
                        case 'transferencia': return 'Transferencia';
                        case 'cruce_cuentas': return 'Compensación de Deudas';
                        case 'credito': return 'Crédito';
                        default: return 'Otros con Utilización del Sistema Financiero';
                      }
                    })()}</p>
                  </div>
                  
                  {/* Tabla de desglose de pagos */}
                  <table className="w-full text-left text-xs border border-border-strong mt-2">
                    <thead className="bg-surface-muted font-bold border-b border-border-strong">
                      <tr>
                        <th className="px-2 py-0.5 border-r border-border-strong">Forma Pago</th>
                        <th className="px-2 py-0.5 border-r border-border-strong text-right">Valor</th>
                        <th className="px-2 py-0.5 border-r border-border-strong text-center">Plazo</th>
                        <th className="px-2 py-0.5 text-center">Tiempo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getPaymentsTableRows().map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-0.5 border-r border-border-strong uppercase">{row.method}</td>
                          <td className="px-2 py-0.5 border-r border-border-strong text-right">${Number(row.val).toFixed(2)}</td>
                          <td className="px-2 py-0.5 border-r border-border-strong text-center">000</td>
                          <td className="px-2 py-0.5 text-center">DIAS</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <p className="text-xs uppercase font-bold text-text-primary bg-surface-muted p-1.5 rounded border border-border-strong text-center tracking-wide leading-none">
                  Son: {numeroALetras(tx.total)}
                </p>
              </div>

              {/* Columna Derecha: Totales Factura */}
              <div className="md:col-span-2 border border-border-strong overflow-hidden">
                <table className="w-full text-right text-xs text-black">
                  <tbody className="divide-y divide-gray-200 font-medium">
                    {hasIva15 && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Subtotal 15%</td>
                        <td className="px-2 py-0.5 font-bold">${Number(taxDetails.subtotal15 || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasIva5 && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Subtotal 5%</td>
                        <td className="px-2 py-0.5 font-bold">${Number(taxDetails.subtotal5 || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasIva0 && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Subtotal 0%</td>
                        <td className="px-2 py-0.5 font-bold">${Number(taxDetails.subtotal0 || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasNoObjeto && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Subtotal No Sujeto de IVA</td>
                        <td className="px-2 py-0.5 font-bold">${Number(taxDetails.subtotalNoObjeto || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasExento && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Subtotal Exento de IVA</td>
                        <td className="px-2 py-0.5 font-bold">${Number(taxDetails.subtotalExento || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Subtotal Sin Impuestos</td>
                      <td className="px-2 py-0.5 font-bold">${Number(taxDetails.subtotalSinImpuestos || 0).toFixed(2)}</td>
                    </tr>
                    {hasDiscount && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Total Descuento</td>
                        <td className="px-2 py-0.5 font-bold text-red-600">-${Number(taxDetails.totalDiscount || tx.descuentoValor || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasIce && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Valor ICE</td>
                        <td className="px-2 py-0.5 font-bold">${Number(tx.iceValor || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasIva15 && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">IVA 15%</td>
                        <td className="px-2 py-0.5 font-bold">${Number(taxDetails.iva15 || tx.ivaValor || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasIva5 && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">IVA 5%</td>
                        <td className="px-2 py-0.5 font-bold">${Number(taxDetails.iva5 || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {!hasIva15 && !hasIva5 && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">IVA 0%</td>
                        <td className="px-2 py-0.5 font-bold">$0.00</td>
                      </tr>
                    )}
                    {hasIrbpnr && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">IRBPNR</td>
                        <td className="px-2 py-0.5 font-bold">${Number(tx.irbpnrValor || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasPropina && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Propina</td>
                        <td className="px-2 py-0.5 font-bold">${Number(tx.propinaValor || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="bg-surface-muted font-semibold text-xs border-y border-border-strong">
                      <td className="px-2 py-1 border-r border-border-strong text-left">Valor Total</td>
                      <td className="px-2 py-1 text-black font-semibold">${Number(taxDetails.total || tx.total || 0).toFixed(2)}</td>
                    </tr>
                    {hasIrf175 && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">IRF 1.75%</td>
                        <td className="px-2 py-0.5">${Number(tx.irf175Valor || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasIrf275 && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">IRF 2.75%</td>
                        <td className="px-2 py-0.5">${Number(tx.irf275Valor || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasRetFuente && !hasIrf175 && !hasIrf275 && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Retención Fuente</td>
                        <td className="px-2 py-0.5">${Number(tx.retencionFuente || 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {hasRetIva && (
                      <tr>
                        <td className="px-2 py-0.5 bg-surface-bg border-r border-border-strong text-left">Retención IVA</td>
                        <td className="px-2 py-0.5">${Number(tx.retencionIva || 0).toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Texto de Compromiso / Letra de Pagaré */}
            <div className="mt-2.5 p-2 border border-border-strong text-black text-justify font-sans print:text-[7.5px] print:p-1.5 print:mt-1.5 print:leading-snug" style={{ fontSize: '9px', lineHeight: '1.35' }}>
              HE RECIBIDO LOS ARTÍCULOS O SERVICIOS DETALLADOS EN ESTA FACTURA, POR EL VALOR INDICADO EN EL "TOTAL".
              DEBO Y PAGARÉ A <span className="font-bold">{emisor.razonSocial}</span> INCONDICIONALMENTE Y SIN PROTESTO EL VALOR ADEUDADO. EN CASO DE MORA ME
              SUJETO A PAGAR EL INTERÉS MÁXIMO PREVISTO EN LA LEY Y A SER DEMANDADO EN JUICIO O VERBAL SUMARIO A ELECCIÓN DEL ACTOR,
              ANTE LOS JUECES DE LA CIUDAD DE <span className="font-bold">{emisorCiudad}</span>, PARA LO CUAL RENUNCIO OTRO DOMICILIO.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
