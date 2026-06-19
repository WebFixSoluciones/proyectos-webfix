import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

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

  const handlePrint = () => {
    window.print();
  };

  // Generador de código de barras visual usando CSS puro
  const MockBarcode = () => (
    <div className="flex flex-col items-center my-2 select-none print:my-1">
      <div className="flex h-8 w-full bg-white items-stretch justify-center gap-[1px] px-1 py-1">
        {[2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2,2,1,3,1,4,1,2].map((w, idx) => (
          <div key={idx} className={`bg-black`} style={{ width: `${w}px` }}></div>
        ))}
      </div>
      <span className="text-[7.5px] font-mono tracking-[0.15em] text-black text-center mt-0.5">{claveAcceso}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden animate-in fade-in print-modal-backdrop">
      
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
              <div className="w-full max-w-3xl mx-auto p-6 bg-white border border-gray-300 text-black shadow-lg text-[10.5px] font-sans leading-normal print:shadow-none print:border-none print:p-0">
                
                {/* Cabecera Principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  
                  {/* Columna Izquierda: Datos del Emisor */}
                  <div className="p-4 rounded-xl border border-gray-300 space-y-2">
                    {emisor.logoUrl ? (
                      <img src={emisor.logoUrl} alt="Logo" className="max-h-12 max-w-[120px] object-contain mb-2 print:max-h-10" />
                    ) : (
                      <div className="h-10 w-28 bg-gray-200 border border-gray-300 rounded flex items-center justify-center font-bold text-[9px] text-gray-600 tracking-wider mb-2">LOGOTIPO</div>
                    )}
                    <h2 className="font-extrabold text-[12px] uppercase leading-tight">{emisor.razonSocial}</h2>
                    <p className="font-bold">{emisor.nombreComercial}</p>
                    <p><span className="font-bold">Dirección Matriz:</span> {emisor.direccionMatriz}</p>
                    <p><span className="font-bold">Dirección Establecimiento:</span> {emisor.direccionMatriz}</p>
                    <p><span className="font-bold">Contribuyente Especial Nro:</span> {emisor.resolucionMicro || 'No'}</p>
                    <p><span className="font-bold">Obligado a llevar contabilidad:</span> {emisor.obligadoContabilidad ? 'SI' : 'NO'}</p>
                    {emisor.contribuyenteRimpe && emisor.contribuyenteRimpe !== 'general' && (
                      <p className="font-bold text-[9px] text-gray-800 border border-gray-300 rounded px-1.5 py-0.5 inline-block uppercase">
                        Régimen: {emisor.contribuyenteRimpe.replace('_', ' ')}
                      </p>
                    )}
                  </div>

                  {/* Columna Derecha: Autorización y Factura */}
                  <div className="p-4 rounded-xl border border-gray-300 space-y-1.5">
                    <h2 className="font-black text-[13px] tracking-wide text-gray-800">R.U.C.: {emisor.ruc}</h2>
                    <p className="text-[12px] font-black tracking-wider uppercase text-primary">{getDocTypeLabel()}</p>
                    <p><span className="font-bold">No.</span> {docNumFormatted}</p>
                    {tx.documentType === 'nota_venta' ? (
                      <>
                        <p><span className="font-bold">TIPO DE DOCUMENTO:</span> RECIBO INTERNO</p>
                        <p><span className="font-bold">ESTADO:</span> REGISTRADO</p>
                        <p><span className="font-bold">VALIDEZ:</span> CONTROL INTERNO / NO TRIBUTARIO</p>
                        <p><span className="font-bold">FECHA DE REGISTRO:</span> {tx.date.split('-').reverse().join('/')} {tx.time || ''}</p>
                      </>
                    ) : (
                      <>
                        <p><span className="font-bold">NÚMERO DE AUTORIZACIÓN:</span></p>
                        <p className="font-mono text-[9px] break-all tracking-wide">{claveAcceso}</p>
                        <p><span className="font-bold">FECHA Y HORA DE AUTORIZACIÓN:</span> {tx.date} 12:00:00 (Offline)</p>
                        <p><span className="font-bold">AMBIENTE:</span> {emisor.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}</p>
                        <p><span className="font-bold">EMISIÓN:</span> NORMAL</p>
                        
                        {/* Código de barras */}
                        <MockBarcode />
                      </>
                    )}
                  </div>
                </div>

                {/* Datos del Receptor */}
                <div className="mt-4 p-4 rounded-xl border border-gray-300 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p><span className="font-bold">Razón Social / Nombres y Apellidos:</span> {client.name}</p>
                    <p><span className="font-bold">Identificación:</span> {client.ruc}</p>
                    <p><span className="font-bold">Fecha de Emisión:</span> {tx.date.split('-').reverse().join('/')}</p>
                  </div>
                  <div className="md:text-right">
                    <p><span className="font-bold">Dirección:</span> {client.direccion || 'Ecuador'}</p>
                    <p><span className="font-bold">Guía de Remisión:</span> Sin Guía</p>
                    <p><span className="font-bold">Correo:</span> {client.email || 'N/D'}</p>
                  </div>
                </div>

                {/* Detalle de Artículos */}
                <div className="mt-4 border border-gray-300 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[9.5px]">
                    <thead className="bg-gray-100 font-bold uppercase text-[8.5px] border-b border-gray-300">
                      <tr>
                        <th className="px-3 py-2 border-r border-gray-300 w-16">Cod. Principal</th>
                        <th className="px-3 py-2 border-r border-gray-300 w-12 text-right">Cant</th>
                        <th className="px-3 py-2 border-r border-gray-300">Descripción</th>
                        <th className="px-3 py-2 border-r border-gray-300 text-right w-16">Precio Unitario</th>
                        <th className="px-3 py-2 border-r border-gray-300 text-right w-12">Desc</th>
                        <th className="px-3 py-2 text-right w-16">Precio Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tx.items && tx.items.length > 0 ? (
                        tx.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 border-r border-gray-300 font-mono">{item.sku || 'SERV'}</td>
                            <td className="px-3 py-2 border-r border-gray-300 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 border-r border-gray-300 font-medium">{item.name}</td>
                            <td className="px-3 py-2 border-r border-gray-300 text-right">${Number(item.price).toFixed(2)}</td>
                            <td className="px-3 py-2 border-r border-gray-300 text-right">$0.00</td>
                            <td className="px-3 py-2 text-right font-bold">${(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-3 py-2 border-r border-gray-300 font-mono">COM01</td>
                          <td className="px-3 py-2 border-r border-gray-300 text-right">1</td>
                          <td className="px-3 py-2 border-r border-gray-300 font-medium">Servicios Comerciales - {tx.category || 'Ventas'}</td>
                          <td className="px-3 py-2 border-r border-gray-300 text-right">${Number(tx.baseImponible).toFixed(2)}</td>
                          <td className="px-3 py-2 border-r border-gray-300 text-right">$0.00</td>
                          <td className="px-3 py-2 text-right font-bold">${Number(tx.baseImponible).toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Formas de Pago e Información Adicional y Totales */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                  
                  {/* Columna Izquierda: Información Adicional y Pagos */}
                  <div className="md:col-span-3 space-y-3">
                    
                    {/* Información adicional */}
                    <div className="p-3 rounded-xl border border-gray-300 space-y-1">
                      <p className="font-bold text-[9.5px] border-b border-gray-200 pb-1 uppercase mb-1">Información Adicional</p>
                      <p><span className="font-bold">Email:</span> {client.email || 'N/D'}</p>
                      <p><span className="font-bold">Teléfono:</span> {client.telefono || 'N/D'}</p>
                      <p><span className="font-bold">Origen:</span> {tx.isPOS ? 'Punto de Venta POS' : 'Factura Manual'}</p>
                    </div>

                    {/* Formas de pago */}
                    <div className="border border-gray-300 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-[9px]">
                        <thead className="bg-gray-100 font-bold border-b border-gray-300 text-[8px] uppercase">
                          <tr>
                            <th className="px-3 py-1.5 border-r border-gray-250">Forma de Pago</th>
                            <th className="px-3 py-1.5 text-right w-20">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-3 py-1.5 border-r border-gray-250 uppercase font-medium">
                              {tx.paymentMethod === 'efectivo' && '01 - SIN UTILIZACION DEL SISTEMA FINANCIERO (EFECTIVO)'}
                              {tx.paymentMethod === 'tarjeta' && '19 - TARJETA DE CREDITO/DEBITO'}
                              {tx.paymentMethod === 'transferencia' && '20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO'}
                              {tx.paymentMethod === 'cruce_cuentas' && '15 - COMPENSACION DE DEUDAS'}
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold">${Number(tx.total).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Columna Derecha: Totales Factura */}
                  <div className="md:col-span-2 border border-gray-300 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-[10px]">
                      <tbody className="divide-y divide-gray-250 font-medium">
                        <tr>
                          <td className="px-3 py-2 bg-gray-50 border-r border-gray-250 w-24">SUBTOTAL 15%</td>
                          <td className="px-3 py-2 font-bold">${Number(tx.baseImponible).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 bg-gray-50 border-r border-gray-250">SUBTOTAL 0%</td>
                          <td className="px-3 py-2">$0.00</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 bg-gray-50 border-r border-gray-250">SUBTOTAL No Objeto IVA</td>
                          <td className="px-3 py-2">$0.00</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 bg-gray-50 border-r border-gray-250">SUBTOTAL SIN IMPUESTOS</td>
                          <td className="px-3 py-2 font-bold">${Number(tx.baseImponible).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 bg-gray-50 border-r border-gray-250">TOTAL DESCUENTO</td>
                          <td className="px-3 py-2">$0.00</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 bg-gray-50 border-r border-gray-250 text-primary">IVA 15%</td>
                          <td className="px-3 py-2 font-bold text-primary">${Number(tx.ivaValor).toFixed(2)}</td>
                        </tr>
                        <tr className="bg-gray-100 font-extrabold text-[11px]">
                          <td className="px-3 py-2.5 border-r border-gray-300">VALOR TOTAL</td>
                          <td className="px-3 py-2.5 text-primary">${Number(tx.total).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

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
