import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, X, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function PublicRideView() {
  const [searchParams] = useSearchParams();
  const claveAcceso = searchParams.get('claveAcceso');
  const tenantId = searchParams.get('tenantId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tx, setTx] = useState(null);
  const [companyConfig, setCompanyConfig] = useState(null);

  useEffect(() => {
    if (!claveAcceso || !tenantId) {
      setError('Enlace inválido. Faltan parámetros de clave de acceso o inquilino.');
      setLoading(false);
      return;
    }

    async function loadPublicData() {
      try {
        // 1. Buscar la transacción en Firestore usando claveAcceso
        const q = query(
          collection(db, 'artifacts', tenantId, 'public', 'data', 'finances_transactions'),
          where('claveAcceso', '==', claveAcceso)
        );
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          setError(`No se encontró ningún comprobante autorizado con la clave de acceso especificada.`);
          setLoading(false);
          return;
        }

        const txData = querySnap.docs[0].data();
        setTx(txData);

        // 2. Cargar configuración de la empresa (Emisor)
        const configSnap = await getDoc(
          doc(db, 'artifacts', tenantId, 'public', 'data', 'finances_settings', 'config')
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
  }, [claveAcceso, tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <RefreshCw className="animate-spin text-primary mb-4" size={40} />
        <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Cargando Comprobante RIDE...</p>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white font-sans px-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-black uppercase text-red-400">Error de Consulta</h2>
          <p className="text-slate-300 text-xs leading-relaxed">{error || 'Comprobante no disponible.'}</p>
          <div className="text-[10px] font-mono text-slate-500 break-all select-all">
            Clave: {claveAcceso || 'No proporcionada'}
          </div>
        </div>
      </div>
    );
  }

  const emisor = companyConfig || {
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
    name: tx.thirdPartyName || tx.thirdParty?.name || 'Consumidor Final',
    ruc: tx.thirdPartyRuc || tx.thirdParty?.ruc || '9999999999999',
    direccion: tx.thirdPartyDireccion || tx.thirdParty?.direccion || 'Ecuador',
    email: tx.thirdPartyEmail || tx.thirdParty?.email || 'N/D',
    telefono: tx.thirdPartyTelefono || tx.thirdParty?.telefono || 'N/D'
  };

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
    <div className="min-h-screen w-full flex flex-col bg-slate-900 text-slate-100 font-sans print:bg-white print:text-black">
      {/* Estilos temporales para imprimir */}
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
          #print-area-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}} />

      {/* Top action bar */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-lg print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1C40F2]/20 flex items-center justify-center text-[#1C40F2] border border-[#1C40F2]/30">
            <FileText size={16} />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-wider text-slate-200">Visor RIDE Oficial</h1>
            <p className="text-[9px] text-slate-400 font-mono select-all mt-0.5">{claveAcceso}</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <Printer size={12} /> Imprimir / PDF
        </button>
      </div>

      {/* RIDE Content Sheet */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-900 print:p-0 print:bg-white">
        <div id="print-area-wrapper" className="w-full max-w-3xl">
          <div className="w-full mx-auto p-5 bg-white border border-gray-300 text-black shadow-2xl text-[9.5px] font-sans leading-snug print:shadow-none print:border-none print:p-0">
            
            {/* Cabecera Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start print-grid-2">
              
              {/* Columna Izquierda: Datos del Emisor */}
              <div className="p-3 rounded-lg border border-gray-300 space-y-1">
                {emisor.logoUrl ? (
                  <img src={emisor.logoUrl} alt="Logo" className="max-h-9 max-w-[110px] object-contain mb-1.5 print:max-h-8" />
                ) : (
                  <div className="h-8 w-24 bg-gray-200 border border-gray-300 rounded flex items-center justify-center font-bold text-[8px] text-gray-600 tracking-wider mb-1.5">LOGOTIPO</div>
                )}
                <h2 className="font-extrabold text-[11px] uppercase leading-tight text-black">{emisor.razonSocial}</h2>
                <p className="font-bold text-[9.5px] text-black">{emisor.nombreComercial}</p>
                <div className="text-[8.5px] text-black space-y-0.5 mt-1">
                  <p><span className="font-bold">Dirección Matriz:</span> {emisor.direccionMatriz}</p>
                  <p><span className="font-bold">Dirección Sucursal:</span> {emisor.direccionMatriz}</p>
                  <p><span className="font-bold">Obligado a llevar contabilidad:</span> {emisor.obligadoContabilidad ? 'SÍ' : 'NO'}</p>
                  {emisor.contribuyenteRimpe && emisor.contribuyenteRimpe !== 'general' && (
                    <p className="mt-1"><span className="font-bold uppercase border border-black border-dashed px-1 py-0.2 text-[8px]">Régimen Rimpe: {emisor.contribuyenteRimpe.replace('_', ' ')}</span></p>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Autorización y Factura */}
              <div className="p-3 rounded-lg border border-gray-300 space-y-1">
                <h2 className="font-extrabold text-[12px] tracking-wide text-black">R.U.C.: {emisor.ruc}</h2>
                <p className="text-[11px] font-black tracking-wider uppercase text-black">{getDocTypeLabel()}</p>
                <p className="text-[9.5px]"><span className="font-bold">No.</span> {docNumFormatted}</p>
                {tx.documentType === 'nota_venta' ? (
                  <div className="text-[8.5px] text-black space-y-0.5">
                    <p><span className="font-bold">TIPO DE DOCUMENTO:</span> RECIBO INTERNO</p>
                    <p><span className="font-bold">ESTADO:</span> REGISTRADO</p>
                    <p><span className="font-bold">VALIDEZ:</span> CONTROL INTERNO / NO TRIBUTARIO</p>
                    <p><span className="font-bold">FECHA DE REGISTRO:</span> {tx.date.split('-').reverse().join('/')} {tx.time || ''}</p>
                  </div>
                ) : (
                  <div className="text-[8.5px] text-black space-y-0.5">
                    <p><span className="font-bold">NÚMERO DE AUTORIZACIÓN:</span></p>
                    <p className="font-mono text-[8px] break-all tracking-wide leading-none">{claveAcceso}</p>
                    <p className="mt-1"><span className="font-bold">FECHA Y HORA DE AUTORIZACIÓN:</span> {tx.fechaAutorizacion || (tx.date.split('-').reverse().join('/') + ' ' + (tx.time || '12:00:00'))}</p>
                    <p><span className="font-bold">AMBIENTE:</span> {emisor.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}</p>
                    <p><span className="font-bold">EMISIÓN:</span> NORMAL</p>
                    
                    {/* Código de barras */}
                    <MockBarcode />
                  </div>
                )}
              </div>
            </div>

            {/* Datos del Receptor */}
            <div className="mt-3 p-3 rounded-lg border border-gray-300 grid grid-cols-1 md:grid-cols-2 gap-2 print-grid-2 text-[8.5px] text-black">
              <div>
                <p><span className="font-bold">FECHA EMISIÓN:</span> {tx.date.split('-').reverse().join('/')}</p>
                <p><span className="font-bold">FECHA VENCIMIENTO:</span> {tx.creditDueDate ? tx.creditDueDate.split('-').reverse().join('/') : tx.date.split('-').reverse().join('/')}</p>
                <p><span className="font-bold">GUÍA DE REMISIÓN:</span> {tx.guiaRemision || 'Sin Guía'}</p>
                <p><span className="font-bold">DOC. REFERENCIA:</span> {tx.docReferencia || 'Ninguno'}</p>
                <p><span className="font-bold">DOC. INTERNO:</span> {tx.docInterno || tx.quoteNumber || 'Ninguno'}</p>
              </div>
              <div>
                <p><span className="font-bold">Razon Social:</span> {client.name}</p>
                <p><span className="font-bold">CI o RUC:</span> {client.ruc}</p>
                <p><span className="font-bold">DIRECCIÓN:</span> {client.direccion || 'Ecuador'}</p>
                <p><span className="font-bold">EMAIL:</span> {client.email || 'N/D'}</p>
              </div>
            </div>

            {/* Detalle de Artículos */}
            <div className="mt-3 border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-[9px] text-black">
                <thead className="bg-gray-100 font-bold uppercase text-[7.5px] border-b border-gray-300 text-black">
                  <tr>
                    <th className="px-2.5 py-1.5 border-r border-gray-300 w-8 text-center">ITEM</th>
                    <th className="px-2.5 py-1.5 border-r border-gray-300 w-16">CODIGO</th>
                    <th className="px-2.5 py-1.5 border-r border-gray-300">DESCRIPCION</th>
                    <th className="px-2.5 py-1.5 border-r border-gray-300 w-12 text-center">U/M</th>
                    <th className="px-2.5 py-1.5 border-r border-gray-300 w-12 text-right">CANTIDAD</th>
                    <th className="px-2.5 py-1.5 border-r border-gray-300 text-right w-16">V.UNIT</th>
                    <th className="px-2.5 py-1.5 border-r border-gray-300 text-right w-12">DESC.</th>
                    <th className="px-2.5 py-1.5 text-right w-16">V.TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tx.items && tx.items.length > 0 ? (
                    tx.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-2.5 py-1.5 border-r border-gray-300 text-center font-mono">{idx + 1}</td>
                        <td className="px-2.5 py-1.5 border-r border-gray-300 font-mono">{item.sku || 'SERV'}</td>
                        <td className="px-2.5 py-1.5 border-r border-gray-300 font-medium">{item.name}</td>
                        <td className="px-2.5 py-1.5 border-r border-gray-300 text-center uppercase font-mono">{item.unit || 'UNIDAD'}</td>
                        <td className="px-2.5 py-1.5 border-r border-gray-300 text-right">{item.quantity}</td>
                        <td className="px-2.5 py-1.5 border-r border-gray-300 text-right">${Number(item.price).toFixed(2)}</td>
                        <td className="px-2.5 py-1.5 border-r border-gray-300 text-right">${Number(item.itemDiscount || 0).toFixed(2)}</td>
                        <td className="px-2.5 py-1.5 text-right font-bold">${((item.price * item.quantity) - (item.itemDiscount || 0)).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-2.5 py-1.5 border-r border-gray-300 text-center font-mono">1</td>
                      <td className="px-2.5 py-1.5 border-r border-gray-300 font-mono">COM01</td>
                      <td className="px-2.5 py-1.5 border-r border-gray-300 font-medium">Servicios Comerciales - {tx.category || 'Ventas'}</td>
                      <td className="px-2.5 py-1.5 border-r border-gray-300 text-center uppercase font-mono">UNIDAD</td>
                      <td className="px-2.5 py-1.5 border-r border-gray-300 text-right">1</td>
                      <td className="px-2.5 py-1.5 border-r border-gray-300 text-right">${Number(tx.baseImponible).toFixed(2)}</td>
                      <td className="px-2.5 py-1.5 border-r border-gray-300 text-right">$0.00</td>
                      <td className="px-2.5 py-1.5 text-right font-bold">${Number(tx.baseImponible).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Formas de Pago e Información Adicional y Totales */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-start print-grid-5">
              
              {/* Columna Izquierda: Información Adicional y Pagos */}
              <div className="md:col-span-3 space-y-2.5">
                
                {/* Información adicional */}
                <div className="p-2.5 rounded-lg border border-gray-300 space-y-0.5 text-[8.5px] text-black">
                  <p className="font-bold text-[9px] border-b border-gray-200 pb-1 uppercase mb-1">Información Adicional</p>
                  <p><span className="font-bold">Email:</span> {client.email || 'N/D'}</p>
                  <p><span className="font-bold">Teléfono:</span> {client.telefono || 'N/D'}</p>
                  <p><span className="font-bold">Dirección:</span> {client.direccion || 'Ecuador'}</p>
                  <p><span className="font-bold">Origen:</span> {tx.isPOS ? 'Punto de Venta POS' : 'Factura Manual'}</p>
                  
                  <div className="mt-1.5 pt-1.5 border-t border-gray-200 space-y-0.5">
                    <p className="font-bold text-[8px] uppercase tracking-wider text-black">Detalle del Pago / Plazo:</p>
                    
                    {tx.isPreventa ? (
                      <>
                        <p><span className="font-bold">Tipo:</span> PREVENTA / PEDIDO</p>
                        <p><span className="font-bold">Anticipo Abonado:</span> ${Number(tx.paidAmount || 0).toFixed(2)}</p>
                        <p><span className="font-bold">Saldo Pendiente:</span> ${Number(tx.total - (tx.paidAmount || 0)).toFixed(2)}</p>
                      </>
                    ) : (
                      <>
                        <p><span className="font-bold">Condición:</span> {tx.paymentMethod === 'credito' ? 'CRÉDITO' : 'CONTADO'}</p>
                        {tx.paymentMethod === 'credito' && (
                          <p><span className="font-bold">Plazo:</span> {getPlazoDias()}</p>
                        )}
                      </>
                    )}
                    
                    <p className="font-bold mt-1 text-[7.5px] uppercase">Forma de Pago:</p>
                    {(() => {
                      const breakdown = tx.paymentsBreakdown || {};
                      const list = [];
                      if (Number(breakdown.efectivo || 0) > 0) list.push(`Efectivo: $${Number(breakdown.efectivo).toFixed(2)}`);
                      if (Number(breakdown.transferencia || 0) > 0) list.push(`Transferencia: $${Number(breakdown.transferencia).toFixed(2)}`);
                      if (Number(breakdown.tarjeta || 0) > 0) list.push(`Tarjeta: $${Number(breakdown.tarjeta).toFixed(2)}`);
                      if (Number(breakdown.cruce_cuentas || 0) > 0) list.push(`Compensación: $${Number(breakdown.cruce_cuentas).toFixed(2)}`);
                      if (Number(breakdown.credito || 0) > 0) list.push(`Crédito / CxC: $${Number(breakdown.credito).toFixed(2)}`);
                      
                      if (list.length === 0) {
                        const methodLabel = {
                          efectivo: 'Efectivo',
                          transferencia: 'Transferencia',
                          tarjeta: 'Tarjeta de Crédito/Débito',
                          cruce_cuentas: 'Compensación de Deudas',
                          credito: 'Crédito'
                        }[tx.paymentMethod] || 'Efectivo';
                        list.push(`${methodLabel}: $${Number(tx.total || 0).toFixed(2)}`);
                      }
                      return list.map((itemStr, idx) => (
                        <p key={idx} className="pl-1.5">• {itemStr}</p>
                      ));
                    })()}
                  </div>
                </div>

                {/* Formas de pago oficial SRI */}
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[8.5px] text-black">
                    <thead className="bg-gray-100 font-bold border-b border-gray-300 text-[7.5px] uppercase">
                      <tr>
                        <th className="px-2.5 py-1.5 border-r border-gray-250">Forma de Pago</th>
                        <th className="px-2.5 py-1.5 text-right w-20">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-2.5 py-1.5 border-r border-gray-250 uppercase font-medium">
                          {tx.paymentMethod === 'efectivo' && '01 - SIN UTILIZACION DEL SISTEMA FINANCIERO (EFECTIVO)'}
                          {tx.paymentMethod === 'tarjeta' && '19 - TARJETA DE CREDITO/DEBITO'}
                          {tx.paymentMethod === 'transferencia' && '20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO'}
                          {tx.paymentMethod === 'cruce_cuentas' && '15 - COMPENSACION DE DEUDAS'}
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-bold">${Number(tx.total).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Columna Derecha: Totales Factura */}
              <div className="md:col-span-2 border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full text-right text-[9px] text-black">
                  <tbody className="divide-y divide-gray-250 font-medium">
                    <tr>
                      <td className="px-2.5 py-1.5 bg-gray-50 border-r border-gray-250 w-24">SUBTOTAL 15%</td>
                      <td className="px-2.5 py-1.5 font-bold">${Number(tx.baseImponible).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 bg-gray-50 border-r border-gray-250">SUBTOTAL 0%</td>
                      <td className="px-2.5 py-1.5">$0.00</td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 bg-gray-50 border-r border-gray-250">SUBTOTAL No Objeto IVA</td>
                      <td className="px-2.5 py-1.5">$0.00</td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 bg-gray-50 border-r border-gray-250">SUBTOTAL SIN IMPUESTOS</td>
                      <td className="px-2.5 py-1.5 font-bold">${Number(tx.baseImponible).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 bg-gray-50 border-r border-gray-250">TOTAL DESCUENTO</td>
                      <td className="px-2.5 py-1.5">$0.00</td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 bg-gray-50 border-r border-gray-250 text-black">IVA 15%</td>
                      <td className="px-2.5 py-1.5 font-bold text-black">${Number(tx.ivaValor).toFixed(2)}</td>
                    </tr>
                    <tr className="bg-gray-100 font-extrabold text-[10px]">
                      <td className="px-2.5 py-2 border-r border-gray-300">VALOR TOTAL</td>
                      <td className="px-2.5 py-2 text-black font-black">${Number(tx.total).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
