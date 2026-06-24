import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

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
    let milStr = '';
    if (mil === 1) milStr = 'MIL';
    else milStr = centenasFn(mil) + ' MIL';
    return milStr + (resto > 0 ? ' ' + centenasFn(resto) : '');
  }

  const partes = String(Number(num).toFixed(2)).split('.');
  const entero = parseInt(partes[0]);
  const decimales = partes[1];

  let enteroStr = '';
  if (entero === 0) enteroStr = 'CERO';
  else enteroStr = milesFn(entero);

  return `SON: ${enteroStr} CON ${decimales}/100 DÓLARES`;
}

export default function RidePreviewModal({ tx, onClose, thirdParties, isDarkMode, db, appId, initialFormat = 'ride' }) {
  const [companyConfig, setCompanyConfig] = useState(null);
  const [viewFormat, setViewFormat] = useState(initialFormat);

  // Sync format if initialFormat changes
  useEffect(() => {
    setViewFormat(initialFormat);
  }, [initialFormat]);

  // Cargar configuración de la empresa (Emisor)
  useEffect(() => {
    if (!appId || !db) return;
    async function loadCompanyConfig() {
      try {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config'));
        if (snap.exists()) {
          setCompanyConfig(snap.data());
        }
      } catch (err) {
        console.error("Error al cargar config de emisor para RIDE", err);
      }
    }
    loadCompanyConfig();
  }, [appId, db]);

  const getDocTypeLabel = () => {
    if (tx.isPreventa) return 'PREVENTA / PEDIDO';
    switch (tx.documentType) {
      case 'factura':
        return 'FACTURA ELECTRÓNICA';
      case 'nota_credito':
        return 'NOTA DE CRÉDITO';
      case 'nota_debito':
        return 'NOTA DE DÉBITO';
      case 'nota_venta':
        return 'RECIBO';
      case 'retencion':
        return 'COMPROBANTE DE RETENCIÓN';
      case 'liquidacion':
        return 'LIQUIDACIÓN DE COMPRA';
      case 'guia_remision':
        return 'GUÍA DE REMISIÓN';
      case 'cotizacion':
        return 'COTIZACIÓN / PROFORMA';
      default:
        return 'COMPROBANTE';
    }
  };

  // Obtener datos del cliente (Receptor)
  const client = thirdParties.find(tp => tp.id === tx.thirdPartyId) || {
    name: 'Consumidor Final',
    ruc: '9999999999999',
    direccion: 'Ecuador',
    telefono: '',
    email: 'consumidorfinal@sri.gob.ec'
  };

  // Valores predeterminados del Emisor (Fallback si no hay config)
  const emisor = companyConfig || {
    razonSocial: 'EMISOR DEMO S.A.',
    nombreComercial: 'MI NEGOCIO',
    ruc: '1790000000001',
    establecimiento: '001',
    puntoEmision: '001',
    direccionMatriz: 'Av. Principal 123 y Secundaria, Quito, Ecuador',
    obligadoContabilidad: false,
    contribuyenteRimpe: 'general',
    ambiente: '1', // 1: Pruebas, 2: Prod
    resolucionMicro: ''
  };

  // Formatear secuencial (ej: 001-001-000000005)
  const formatSequential = (seqVal, estab = '001', pto = '001') => {
    if (!seqVal) return `${estab}-${pto}-000000001`;
    const cleanSeq = String(seqVal).replace(/[^0-9]/g, '');
    const padded = cleanSeq.padStart(9, '0');
    return `${estab}-${pto}-${padded}`;
  };

  // Reconstruir secuencial e identificación
  const docNumFormatted = tx.documentNumber || formatSequential(tx.id ? tx.id.replace(/[^0-9]/g, '').slice(-6) : '1', emisor.establecimiento, emisor.puntoEmision);

  // Clave de acceso de 49 dígitos
  const claveAcceso = tx.claveAcceso || (
    tx.date 
      ? `${tx.date.split('-').reverse().join('')}01${emisor.ruc}${emisor.ambiente}${docNumFormatted.replace(/-/g, '')}123456781` 
      : '0000000000000000000000000000000000000000000000000'
  );

  const getPlazoDias = () => {
    if (!tx.creditDueDate || !tx.date) return 'N/D';
    try {
      const f1 = new Date(tx.date);
      const f2 = new Date(tx.creditDueDate);
      const diffTime = Math.abs(f2 - f1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} Días (Vence: ${tx.creditDueDate.split('-').reverse().join('/')})`;
    } catch (e) {
      return `Vence: ${tx.creditDueDate.split('-').reverse().join('/')}`;
    }
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
        const itemQty = Number(item.quantity) || 1;
        const itemPrice = Number(item.price) || 0;
        const itemDisc = Number(item.itemDiscount) || 0;
        const lineBase = (itemPrice * itemQty) - itemDisc;
        const rate = Number(item.ivaCategory);

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

  const handlePrint = () => {
    window.print();
  };

  // Generador de código de barras visual usando CSS puro
  const MockBarcode = () => (
    <div className="flex flex-col items-center my-1 select-none print:my-0.5">
      <div className="flex h-6 w-full bg-white items-stretch justify-center gap-[1px] px-1 py-0.5">
        {[2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2].map((w, idx) => (
          <div key={idx} className="bg-black" style={{ width: `${w}px` }}></div>
        ))}
      </div>
      <span className="text-[7px] font-mono tracking-[0.1em] text-black text-center mt-0.5">{claveAcceso}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto animate-in fade-in print-modal-backdrop print:items-start print:overflow-visible">
      
      {/* Estilos temporales para imprimir solamente el comprobante */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden !important;
            background-color: transparent !important;
            box-shadow: none !important;
          }
          
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible !important;
          }
          
          .print-modal-backdrop {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            display: block !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .print-modal-content {
            position: relative !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          
          .print-modal-scroll {
            position: relative !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          
          #print-area-wrapper {
            position: relative !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
          }
          
          /* Custom print layout grids */
          .print-grid-2 {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
          
          .print-grid-5 {
            display: grid !important;
            grid-template-columns: 3fr 2fr !important;
            gap: 12px !important;
          }
          
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}} />

      <div className={`w-full max-w-4xl h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border print-modal-content ${
        isDarkMode ? 'bg-[#121214] border-white/10' : 'bg-gray-50 border-gray-300'
      }`}>
        
        {/* Barra de Acciones del Modal */}
        <div className={`px-6 py-3 border-b flex items-center justify-between no-print shrink-0 ${
          isDarkMode ? 'bg-[#18181b] border-white/5' : 'bg-gray-100 border-gray-250'
        }`}>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Vista Previa: {getDocTypeLabel()}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Selector de formato */}
            <div className={`flex p-0.5 rounded-lg border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-300'}`}>
              <button 
                onClick={() => setViewFormat('ride')}
                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                  viewFormat === 'ride' 
                    ? 'bg-primary text-white shadow-sm' 
                    : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
                }`}
              >
                RIDE Oficial (A4)
              </button>
              <button 
                onClick={() => setViewFormat('ticket')}
                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                  viewFormat === 'ticket' 
                    ? 'bg-primary text-white shadow-sm' 
                    : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
                }`}
              >
                Ticket POS (80mm)
              </button>
            </div>

            <button 
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <Printer size={12} /> Imprimir / PDF
            </button>

            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contenedor del Comprobante */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-gray-500/20 custom-scrollbar print-modal-scroll print:p-0 print:bg-white">
          
          <div id="print-area-wrapper" className="w-full">
            
            {/* FORMATO 1: RIDE OFICIAL A4 */}
            {viewFormat === 'ride' && (
              <div className="w-full max-w-3xl mx-auto p-5 bg-white border border-gray-300 text-black shadow-lg text-[8.5px] font-sans leading-tight print:shadow-none print:border-none print:p-0">
                
                {/* Cabecera Principal Compacta */}
                <div className="border border-gray-300 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-300 print:grid-cols-2 print:divide-x print:divide-y-0 text-[8.5px] text-black">
                  
                  {/* Columna Izquierda: Datos del Emisor */}
                  <div className="p-3 flex items-start gap-3 min-w-0">
                    {emisor.logoUrl ? (
                      <img src={emisor.logoUrl} alt="Logo" className="max-h-12 max-w-[100px] object-contain print:max-h-10 shrink-0" />
                    ) : (
                      <div className="h-10 w-20 bg-gray-200 border border-gray-300 rounded flex items-center justify-center font-bold text-[8px] text-gray-600 tracking-wider shrink-0">LOGOTIPO</div>
                    )}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h2 className="font-extrabold text-[10px] uppercase leading-tight text-black truncate">{emisor.razonSocial}</h2>
                      {emisor.nombreComercial && <p className="font-bold text-[9px] text-black truncate">{emisor.nombreComercial}</p>}
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
                        <p className="mt-0.5"><span className="font-bold uppercase border border-black border-dashed px-1 py-0.2 text-[7.5px]">Régimen Rimpe: {emisor.contribuyenteRimpe.replace('_', ' ')}</span></p>
                      )}
                    </div>
                  </div>

                  {/* Columna Derecha: Autorización y Factura */}
                  <div className="p-3 flex flex-col justify-between space-y-1 min-w-0">
                    {tx.documentType === 'nota_venta' ? (
                      <div className="space-y-0.5">
                        <p><span className="font-bold">TIPO DE DOCUMENTO:</span> RECIBO INTERNO</p>
                        <p><span className="font-bold">ESTADO:</span> REGISTRADO</p>
                        <p><span className="font-bold">VALIDEZ:</span> CONTROL INTERNO / NO TRIBUTARIO</p>
                        <p><span className="font-bold">FECHA DE REGISTRO:</span> {tx.date.split('-').reverse().join('/')} {tx.time || ''}</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center text-[8px]">
                          <p><span className="font-bold">Ambiente:</span> {emisor.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}</p>
                          <p><span className="font-bold">Emisión:</span> NORMAL</p>
                        </div>
                        <p className="mt-1"><span className="font-bold">Clave Acceso/ No. Autorización:</span></p>
                        <p className="font-mono text-[7.5px] break-all tracking-wide leading-none">{claveAcceso}</p>
                        <p className="mt-1"><span className="font-bold">FECHA Y HORA DE AUTORIZACIÓN:</span> {tx.fechaAutorizacion || (tx.date.split('-').reverse().join('/') + ' ' + (tx.time || '12:00:00'))}</p>
                        
                        {/* Código de barras */}
                        <div className="my-1.5">
                          <MockBarcode />
                        </div>
                      </div>
                    )}
                    <div className="border-t border-gray-250 pt-1.5 mt-auto">
                      <h2 className="font-extrabold text-[11px] tracking-wide text-black uppercase leading-none">
                        {getDocTypeLabel()} {docNumFormatted}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Datos del Receptor Compactos (Detalle de Cliente) */}
                <div className="mt-3 border border-gray-300 text-[8px] text-black">
                  {/* Fila 1 */}
                  <div className="grid grid-cols-12">
                    <div className="col-span-10 py-[2px] px-1.5 truncate">
                      <span className="font-bold">CLIENTE:</span> {client.name}
                    </div>
                    <div className="col-span-2 py-[2px] px-1.5">
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

                <div className="mt-2 border border-gray-300 overflow-hidden">
                  <table className="w-full text-left text-[8px] text-black">
                    <thead className="bg-gray-100 font-bold uppercase text-[7px] border-b border-gray-300 text-black">
                      <tr>
                        <th className="px-1 py-[2px] border-r border-gray-300 w-7 text-center">ITEM</th>
                        <th className="px-1 py-[2px] border-r border-gray-300 w-14">CODIGO</th>
                        <th className="px-1 py-[2px] border-r border-gray-300">DESCRIPCION</th>
                        <th className="px-1 py-[2px] border-r border-gray-300 w-9 text-center">U/M</th>
                        <th className="px-1 py-[2px] border-r border-gray-300 w-18 text-center">COD/BARRAS</th>
                        <th className="px-1 py-[2px] border-r border-gray-300 w-9 text-right">CANTIDAD</th>
                        <th className="px-1 py-[2px] border-r border-gray-300 text-right w-14">V.UNIT</th>
                        <th className="px-1 py-[2px] border-r border-gray-300 text-right w-10">DESC.</th>
                        <th className="px-1 py-[2px] text-right w-14">V.TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tx.items && tx.items.length > 0 ? (
                        tx.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-200">
                            <td className="px-1 py-[1px] border-r border-gray-300 text-center font-mono">{idx + 1}</td>
                            <td className="px-1 py-[1px] border-r border-gray-300 font-mono">{item.sku || 'SERV'}</td>
                            <td className="px-1 py-[1px] border-r border-gray-300 font-medium">{item.name}</td>
                            <td className="px-1 py-[1px] border-r border-gray-300 text-center uppercase font-mono">{item.unit || 'UNIDAD'}</td>
                            <td className="px-1 py-[1px] border-r border-gray-300 text-center font-mono">{item.barcode || item.sku || 'N/A'}</td>
                            <td className="px-1 py-[1px] border-r border-gray-300 text-right">{item.quantity}</td>
                            <td className="px-1 py-[1px] border-r border-gray-300 text-right">${Number(item.price).toFixed(2)}</td>
                            <td className="px-1 py-[1px] border-r border-gray-300 text-right">${Number(item.itemDiscount || 0).toFixed(2)}</td>
                            <td className="px-1 py-[1px] text-right font-bold">${((item.price * item.quantity) - (item.itemDiscount || 0)).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr className="border-b border-gray-200">
                          <td className="px-1 py-[1px] border-r border-gray-300 text-center font-mono">1</td>
                          <td className="px-1 py-[1px] border-r border-gray-300 font-mono">COM01</td>
                          <td className="px-1 py-[1px] border-r border-gray-300 font-medium">Servicios Comerciales - {tx.category || 'Ventas'}</td>
                          <td className="px-1 py-[1px] border-r border-gray-300 text-center uppercase font-mono">UNIDAD</td>
                          <td className="px-1 py-[1px] border-r border-gray-300 text-center font-mono">N/A</td>
                          <td className="px-1 py-[1px] border-r border-gray-300 text-right">1</td>
                          <td className="px-1 py-[1px] border-r border-gray-300 text-right">${Number(tx.baseImponible).toFixed(2)}</td>
                          <td className="px-1 py-[1px] border-r border-gray-300 text-right">$0.00</td>
                          <td className="px-1 py-[1px] text-right font-bold">${Number(tx.baseImponible).toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Formas de Pago e Información Adicional y Totales */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-start print-grid-5 text-[8px] text-black">
                  
                  {/* Columna Izquierda: Información Adicional y Pagos */}
                  <div className="md:col-span-3 space-y-1.5">
                    <div className="p-1.5 border border-gray-300 space-y-0.5">
                      <p className="font-bold border-b border-gray-200 pb-0.5 uppercase mb-0.5">Información Adicional</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0 mt-0.5 text-[7px]">
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
                        {tx.description && (
                          <p className="col-span-2 truncate"><span className="font-bold">Descripción Adicional:</span> {tx.description}</p>
                        )}
                      </div>
                      
                      {/* Tabla de desglose de pagos */}
                      <table className="w-full text-left text-[7.5px] border border-gray-300 mt-2">
                        <thead className="bg-gray-100 font-bold border-b border-gray-300">
                          <tr>
                            <th className="px-2 py-0.5 border-r border-gray-300">Forma Pago</th>
                            <th className="px-2 py-0.5 border-r border-gray-300 text-right">Valor</th>
                            <th className="px-2 py-0.5 border-r border-gray-300 text-center">Plazo</th>
                            <th className="px-2 py-0.5 text-center">Tiempo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {getPaymentsTableRows().map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-0.5 border-r border-gray-300 uppercase">{row.method}</td>
                              <td className="px-2 py-0.5 border-r border-gray-300 text-right">${Number(row.val).toFixed(2)}</td>
                              <td className="px-2 py-0.5 border-r border-gray-300 text-center">000</td>
                              <td className="px-2 py-0.5 text-center">DIAS</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <p className="text-[7.5px] uppercase font-bold text-gray-700 bg-gray-100 p-1.5 rounded border border-gray-300 text-center tracking-wide leading-none">
                      Son: {numeroALetras(tx.total)}
                    </p>
                  </div>

                  <div className="md:col-span-2 border border-gray-300 overflow-hidden">
                    <table className="w-full text-right text-[7.5px] text-black">
                      <tbody className="divide-y divide-gray-200 font-medium">
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">Subtotal 15%</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(taxDetails.subtotal15 || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">Subtotal 5%</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(taxDetails.subtotal5 || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">Subtotal 0%</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(taxDetails.subtotal0 || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">Subtotal No Sujeto de IVA</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(taxDetails.subtotalNoObjeto || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">Subtotal Exento de IVA</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(taxDetails.subtotalExento || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">Subtotal Sin Impuestos</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(taxDetails.subtotalSinImpuestos || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">Total Descuento</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(taxDetails.totalDiscount || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">Valor ICE</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(tx.iceValor || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">IVA 15%</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(taxDetails.iva15 || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">IVA 5%</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(taxDetails.iva5 || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">IRBPNR</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(tx.irbpnrValor || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">Propina</td>
                          <td className="px-1.5 py-[1px] font-bold">${Number(tx.propinaValor || 0).toFixed(2)}</td>
                        </tr>
                        <tr className="bg-gray-100 font-extrabold text-[8.5px] border-y border-gray-300">
                          <td className="px-1.5 py-[2px] border-r border-gray-300 text-left">Valor Total</td>
                          <td className="px-1.5 py-[2px] text-black font-black">${Number(taxDetails.total || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">IRF 1.75%</td>
                          <td className="px-1.5 py-[1px]">${Number(tx.irf175Valor || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-[1px] bg-gray-50 border-r border-gray-300 text-left">IRF 2.75%</td>
                          <td className="px-1.5 py-[1px]">${Number(tx.irf275Valor || 0).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* Texto de Compromiso / Letra de Pagaré */}
                <div className="mt-3 p-3 border border-gray-300 text-[7.2px] leading-relaxed text-black text-justify font-sans">
                  HE RECIBIDO LOS ARTÍCULOS O SERVICIOS DETALLADOS EN ESTA FACTURA, POR EL VALOR INDICADO EN EL "TOTAL".
                  DEBO Y PAGARÉ A <span className="font-bold">{emisor.razonSocial}</span> INCONDICIONALMENTE Y SIN PROTESTO EL VALOR ADEUDADO. EN CASO DE MORA ME
                  SUJETO A PAGAR EL INTERÉS MÁXIMO PREVISTO EN LA LEY Y A SER DEMANDADO EN JUICIO O VERBAL SUMARIO A ELECCIÓN DEL ACTOR,
                  ANTE LOS JUECES DE LA CIUDAD DE <span className="font-bold">{emisorCiudad}</span>, PARA LO CUAL RENUNCIO OTRO DOMICILIO.
                </div>

              </div>
            )}

            {/* FORMATO 2: TICKET POS TERMICO 80MM */}
            {viewFormat === 'ticket' && (
              <div className="w-[300px] mx-auto p-4 bg-white border border-gray-400 text-black text-[9px] font-mono leading-tight shadow-md print:shadow-none print:border-none print:p-0">
                <div className="text-center space-y-1">
                  <h2 className="font-bold text-[12px] uppercase">{emisor.nombreComercial}</h2>
                  <p className="text-[8px]">{emisor.razonSocial}</p>
                  <p>RUC: {emisor.ruc}</p>
                  <p>Matriz: {emisor.direccionMatriz.slice(0, 40)}...</p>
                  <p>Tel: {client.telefono || '02-2999000'}</p>
                  {emisor.contribuyenteRimpe && emisor.contribuyenteRimpe !== 'general' && (
                    <p className="text-[7.5px] uppercase font-bold border border-black border-dashed px-1 py-0.5 inline-block">
                      Régimen: {emisor.contribuyenteRimpe.replace('_', ' ')}
                    </p>
                  )}
                </div>

                <div className="border-t border-black border-dashed my-2"></div>

                <div className="space-y-0.5">
                   <p className="font-bold">{getDocTypeLabel()}</p>
                   <p>No: {docNumFormatted}</p>
                   {tx.documentType !== 'nota_venta' && <p>Clave: {claveAcceso.slice(0,25)}...</p>}
                   <p>Fecha: {tx.date} {tx.time || '12:00'} {tx.documentType === 'nota_venta' ? '' : '(Offline)'}</p>
                   <p>Cliente: {client.name.slice(0, 30)}</p>
                   <p>RUC/CI: {client.ruc}</p>
                   <p>Dir: {client.direccion || 'Quito, Ecuador'}</p>
                </div>

                <div className="border-t border-black border-dashed my-2"></div>

                {/* Ítems */}
                <table className="w-full text-left">
                  <thead>
                    <tr className="font-bold border-b border-black border-dashed">
                      <th>Cant  Detalle</th>
                      <th className="text-right w-16">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.items && tx.items.length > 0 ? (
                      tx.items.map((item, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="py-1">
                            {item.quantity} x {item.name.slice(0,20)}
                            <div className="text-[8px] text-gray-500">${Number(item.price).toFixed(2)} c/u</div>
                          </td>
                          <td className="text-right py-1 font-bold">${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-1">
                          1 x Serv. {tx.category || 'Venta'}
                          <div className="text-[8px] text-gray-500">${Number(tx.baseImponible).toFixed(2)} c/u</div>
                        </td>
                        <td className="text-right py-1 font-bold">${Number(tx.baseImponible).toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="border-t border-black border-dashed my-2"></div>

                {/* Totales */}
                <div className="space-y-0.5 text-right font-bold">
                  <div className="flex justify-between">
                    <span>Subtotal Neto:</span>
                    <span>${Number(tx.baseImponible).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descuento:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (15%):</span>
                    <span>${Number(tx.ivaValor).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] border-t border-black pt-1">
                    <span>TOTAL A PAGAR:</span>
                    <span>${Number(tx.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-black border-dashed my-2"></div>

                {/* Pago */}
                <div className="space-y-0.5 text-[8.5px]">
                  <p><span className="font-bold">Pago:</span> {tx.paymentMethod.toUpperCase()}</p>
                  {tx.paymentsBreakdown && (
                    <p>Efectivo: ${Number(tx.paymentsBreakdown.efectivo || 0).toFixed(2)} | Tarj: ${Number(tx.paymentsBreakdown.tarjeta || 0).toFixed(2)}</p>
                  )}
                  {tx.paymentsBreakdown && tx.paymentsBreakdown.efectivo > 0 && (
                    <p>Vuelto entregado: ${(Math.max(0, (tx.paymentsBreakdown.efectivo || 0) - tx.total)).toFixed(2)}</p>
                  )}
                </div>

                <div className="border-t border-black border-dashed my-2"></div>

                <div className="text-center space-y-1 text-[7.5px] leading-tight">
                  <p>¡Gracias por su compra!</p>
                  {tx.documentType === 'nota_venta' ? (
                    <>
                      <p>Este documento es un comprobante de entrega.</p>
                      <p>Control Interno / No Tributario.</p>
                    </>
                  ) : (
                    <>
                      <p>Autorización SRI offline.</p>
                      <p>Consulte su RIDE en su correo.</p>
                      
                      {/* Codigo de barras en el ticket */}
                      <div className="flex h-5 w-full bg-white items-stretch justify-center gap-[0.5px] px-2 py-0.5">
                        {[1,1,2,1,2,1,1,2,1,1,2,1,2,1,1,2,1,1,2,1,2,1,1,2,1,1,2,1].map((w, idx) => (
                          <div key={idx} className="bg-black" style={{ width: `${w}px` }}></div>
                        ))}
                      </div>
                      <p className="font-mono text-[7px] break-all">{claveAcceso.slice(0, 30)}...</p>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
