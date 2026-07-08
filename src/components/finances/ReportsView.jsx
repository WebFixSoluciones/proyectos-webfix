import React, { useState } from 'react';
import { 
  Download, FileSpreadsheet, PieChart, TrendingUp, TrendingDown, 
  FileText, Shield, Percent, AlertCircle, RefreshCw 
} from 'lucide-react';

export default function ReportsView({ transactions, showToast }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen', 'iva', 'retenciones', 'ats'

  // Filtrar transacciones del periodo
  const filteredTx = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth().toString() === selectedMonth && d.getFullYear().toString() === selectedYear;
  });

  const ventas = filteredTx.filter(t => t.type === 'ingreso');
  const compras = filteredTx.filter(t => t.type === 'egreso');

  const sumTotal = (arr, field) => arr.reduce((acc, t) => acc + (Number(t[field]) || 0), 0);

  // Totales Generales
  const baseVentas = sumTotal(ventas, 'baseImponible');
  const ivaVentas = sumTotal(ventas, 'ivaValor');
  const retFuenteVentas = sumTotal(ventas, 'retencionFuente');
  const retIvaVentas = sumTotal(ventas, 'retencionIva');
  const totalVentas = sumTotal(ventas, 'total');

  const baseCompras = sumTotal(compras, 'baseImponible');
  const ivaCompras = sumTotal(compras, 'ivaValor');
  const retFuenteCompras = sumTotal(compras, 'retencionFuente');
  const retIvaCompras = sumTotal(compras, 'retencionIva');
  const totalCompras = sumTotal(compras, 'total');

  // Conciliación de IVA por tarifa (15%, 12%, 0%)
  const getIvaBreakdown = (txList) => {
    let iva15Base = 0, iva15Val = 0;
    let iva12Base = 0, iva12Val = 0;
    let iva0Base = 0;

    txList.forEach(t => {
      const base = Number(t.baseImponible) || 0;
      const val = Number(t.ivaValor) || 0;
      const perc = Number(t.ivaPorcentaje);

      if (perc === 15) {
        iva15Base += base;
        iva15Val += val;
      } else if (perc === 12) {
        iva12Base += base;
        iva12Val += val;
      } else if (perc === 0) {
        iva0Base += base;
      }
    });

    return { iva15Base, iva15Val, iva12Base, iva12Val, iva0Base };
  };

  const ivaVentasBreakdown = getIvaBreakdown(ventas);
  const ivaComprasBreakdown = getIvaBreakdown(compras);

  // Recopilar retenciones desglosadas de los comprobantes tipo 'retencion' o de campos manuales
  const getRetencionesEmitidas = () => {
    let rets = [];
    compras.forEach(tx => {
      // 1. Si tiene retenciones detalladas (Paso 3)
      if (tx.documentType === 'retencion' && tx.retenciones && tx.retenciones.length > 0) {
        tx.retenciones.forEach(r => {
          rets.push({
            fecha: tx.date,
            comprobante: tx.documentNumber || 'S/N',
            impuesto: r.codigo === '1' ? 'Renta' : 'IVA',
            codigo: r.codigoRetencion,
            base: Number(r.baseImponible) || 0,
            porcentaje: Number(r.porcentajeRetener) || 0,
            valor: Number(r.valorRetenido) || 0
          });
        });
      } else {
        // 2. Si tiene retención manual registrada en la cabecera
        if (Number(tx.retencionFuente) > 0) {
          rets.push({
            fecha: tx.date,
            comprobante: tx.documentNumber || 'Manual',
            impuesto: 'Renta',
            codigo: 'Manual',
            base: Number(tx.baseImponible) || 0,
            porcentaje: 0,
            valor: Number(tx.retencionFuente)
          });
        }
        if (Number(tx.retencionIva) > 0) {
          rets.push({
            fecha: tx.date,
            comprobante: tx.documentNumber || 'Manual',
            impuesto: 'IVA',
            codigo: 'Manual',
            base: Number(tx.baseImponible) || 0,
            porcentaje: 0,
            valor: Number(tx.retencionIva)
          });
        }
      }
    });
    return rets;
  };

  const getRetencionesRecibidas = () => {
    let rets = [];
    ventas.forEach(tx => {
      if (Number(tx.retencionFuente) > 0) {
        rets.push({
          fecha: tx.date,
          comprobante: tx.documentNumber || 'Manual',
          impuesto: 'Renta',
          base: Number(tx.baseImponible) || 0,
          valor: Number(tx.retencionFuente)
        });
      }
      if (Number(tx.retencionIva) > 0) {
        rets.push({
          fecha: tx.date,
          comprobante: tx.documentNumber || 'Manual',
          impuesto: 'IVA',
          base: Number(tx.baseImponible) || 0,
          valor: Number(tx.retencionIva)
        });
      }
    });
    return rets;
  };

  const retsEmitidas = getRetencionesEmitidas();
  const retsRecibidas = getRetencionesRecibidas();

  const totalRetsEmitidasVal = retsEmitidas.reduce((sum, r) => sum + r.valor, 0);
  const totalRetsRecibidasVal = retsRecibidas.reduce((sum, r) => sum + r.valor, 0);

  // Exportar reporte general a CSV
  const handleExportCSV = () => {
    if (filteredTx.length === 0) {
      showToast('No hay datos para exportar en este periodo', 'error');
      return;
    }

    const headers = ['Fecha', 'Tipo', 'Documento', 'Estado SRI', 'Metodo Pago', 'Base Imponible', 'IVA %', 'IVA Valor', 'Ret Fuente', 'Ret IVA', 'Total'];
    const rows = filteredTx.map(t => [
      t.date,
      t.type,
      t.documentNumber || 'S/N',
      t.sriStatus,
      t.paymentMethod,
      Number(t.baseImponible || 0).toFixed(2),
      t.ivaPorcentaje + '%',
      Number(t.ivaValor || 0).toFixed(2),
      Number(t.retencionFuente || 0).toFixed(2),
      Number(t.retencionIva || 0).toFixed(2),
      Number(t.total || 0).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + "\n" 
      + rows.map(e => e.join(',')).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_SRI_${selectedYear}_${Number(selectedMonth)+1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte CSV descargado', 'success');
  };

  // Generar y descargar archivo pre-ATS en JSON
  const handleDownloadATS = () => {
    if (filteredTx.length === 0) {
      showToast('No hay transacciones para compilar el ATS', 'error');
      return;
    }

    const atsObject = {
      tipoAnexo: "ATS",
      periodo: `${selectedYear}${String(Number(selectedMonth) + 1).padStart(2, '0')}`,
      compras: compras.map(c => ({
        codSustento: "01",
        tpIdProv: "01",
        idProv: "1790000000001", // Reemplazar con datos reales
        tipoComprobante: c.documentType === 'liquidacion' ? '03' : '01',
        fechaEmision: c.date.split('-').reverse().join('/'),
        establecimiento: c.documentNumber?.split('-')[0] || "001",
        puntoEmision: c.documentNumber?.split('-')[1] || "001",
        secuencial: c.documentNumber?.split('-')[2] || "000000001",
        baseNoGraIva: "0.00",
        baseImponible: Number(c.baseImponible).toFixed(2),
        baseImpGrav: "0.00",
        montoIva: Number(c.ivaValor).toFixed(2),
        valRetBienProto: Number(c.retencionIva).toFixed(2),
        valRetServ100: "0.00",
        retenciones: c.retenciones?.map(r => ({
          codigoRetencion: r.codigoRetencion,
          baseImponible: Number(r.baseImponible).toFixed(2),
          porcentajeRetener: r.porcentajeRetener,
          valorRetenido: Number(r.valorRetenido).toFixed(2)
        })) || []
      })),
      ventas: ventas.map(v => ({
        tpIdCliente: "04",
        idCliente: "1712345678",
        tipoComprobante: "01",
        numeroComprobantes: "1",
        baseNoGraIva: "0.00",
        baseImponible: Number(v.baseImponible).toFixed(2),
        baseImpGrav: "0.00",
        montoIva: Number(v.ivaValor).toFixed(2),
        montoIce: "0.00",
        valorRetRenta: Number(v.retencionFuente).toFixed(2),
        valorRetIva: Number(v.retencionIva).toFixed(2)
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(atsObject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ATS_${atsObject.periodo}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
    showToast('Archivo ATS descargado con éxito', 'success');
  };

  const cardClass = 'p-6 rounded-card border transition-all bg-white border-gray-200 text-gray-900';

  const inputClass = 'px-3 py-2.5 rounded-xl text-xs border outline-none bg-white border-gray-200 text-gray-900';

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
      
      {/* SECCIÓN FILTROS Y NAVEGACIÓN */}
      <div className="p-5 rounded-card border flex flex-col md:flex-row items-center justify-between gap-4 bg-white border-gray-250">
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1 text-gray-500">Periodo Fiscal</label>
            <div className="flex gap-2">
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={inputClass}>
                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                  <option key={i} value={i} className="text-black">{m}</option>
                ))}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={inputClass}>
                {[2023, 2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y} className="text-black">{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end self-end h-[38px] p-0.5 rounded-xl border border-gray-250/65 bg-gray-100/50">
            {[
              { id: 'resumen', label: 'Resumen', icon: PieChart },
              { id: 'iva', label: 'IVA', icon: Percent },
              { id: 'retenciones', label: 'Retenciones', icon: Shield },
              { id: 'ats', label: 'Pre-ATS', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    isActive 
                      ? 'bg-white text-gray-950'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-transform hover:-translate-y-0.5">
            <FileSpreadsheet size={14} /> Exportar CSV
          </button>
          <button onClick={handleDownloadATS} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition-transform hover:-translate-y-0.5">
            <Download size={14} /> Descargar ATS JSON
          </button>
        </div>
      </div>

      {/* CUERPO TABS */}
      
      {/* 1. RESUMEN FINANCIERO */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* VENTAS */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
                <TrendingUp size={18} className="text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Ventas e Ingresos</h3>
              </div>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Base Imponible Gravable:</span>
                  <span className="font-semibold">${baseVentas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>IVA Cobrado:</span>
                  <span className="font-bold">${ivaVentas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-yellow-500">
                  <span>Retenciones en la Fuente Recibidas:</span>
                  <span>-${retFuenteVentas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-yellow-500">
                  <span>Retenciones de IVA Recibidas:</span>
                  <span>-${retIvaVentas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed pt-3 text-sm font-bold">
                  <span>Total Cobrado Neto:</span>
                  <span className="text-emerald-500">${totalVentas.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* COMPRAS */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
                <TrendingDown size={18} className="text-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Compras y Egresos</h3>
              </div>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Base Imponible Operativa:</span>
                  <span className="font-semibold">${baseCompras.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>IVA Pagado (Crédito):</span>
                  <span className="font-bold">${ivaCompras.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Retenciones en la Fuente Emitidas:</span>
                  <span>-${retFuenteCompras.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Retenciones de IVA Emitidas:</span>
                  <span>-${retIvaCompras.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed pt-3 text-sm font-bold">
                  <span>Total Pagado Neto:</span>
                  <span className="text-red-500">${totalCompras.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>

          <div className="p-5 rounded-card border flex items-center gap-3.5 bg-primary-light border-primary/25 text-primary font-semibold">
            <AlertCircle size={20} className="shrink-0" />
            <div className="text-xs leading-normal">
              Resumen del Mes Fiscal: Has facturado en ventas un total bruto de <strong>${(baseVentas + ivaVentas).toFixed(2)}</strong> y en compras un total de <strong>${(baseCompras + ivaCompras).toFixed(2)}</strong>. Tu saldo operativo neto antes de retenciones tributarias es de <strong>${(totalVentas - totalCompras).toFixed(2)}</strong>.
            </div>
          </div>
        </div>
      )}

      {/* 2. CONCILIACIÓN DE IVA */}
      {activeTab === 'iva' && (
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
            <Percent size={18} className="text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Conciliación Mensual de IVA (SRI)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 rounded-card border bg-gray-50 border-gray-200">
              <p className="text-xs uppercase text-gray-500 font-bold">Total IVA Ventas (Cobrado)</p>
              <p className="text-xl font-black mt-1">${ivaVentas.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-card border bg-gray-50 border-gray-200">
              <p className="text-xs uppercase text-gray-500 font-bold">Total IVA Compras (Crédito)</p>
              <p className="text-xl font-black mt-1">${ivaCompras.toFixed(2)}</p>
            </div>
            <div className={`p-4 rounded-card border ${
              (ivaVentas - ivaCompras) >= 0 
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <p className="text-xs uppercase font-bold">IVA a Pagar / Crédito Tributario</p>
              <p className="text-xl font-black mt-1">${(ivaVentas - ivaCompras).toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-card border overflow-hidden transition-all border-slate-200/80 bg-white">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="text-xs uppercase font-bold tracking-wider bg-slate-50 text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Tarifa / Porcentaje</th>
                    <th className="px-6 py-3.5 text-right">Base Ventas</th>
                    <th className="px-6 py-3.5 text-right">IVA Ventas</th>
                    <th className="px-6 py-3.5 text-right">Base Compras</th>
                    <th className="px-6 py-3.5 text-right">IVA Compras</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="transition-colors hover:bg-slate-50/40">
                    <td className="px-6 py-3.5 font-semibold text-black">Tarifa 15% (General)</td>
                    <td className="px-6 py-3.5 text-right font-mono text-black">${ivaVentasBreakdown.iva15Base.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-primary">${ivaVentasBreakdown.iva15Val.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-black">${ivaComprasBreakdown.iva15Base.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-primary">${ivaComprasBreakdown.iva15Val.toFixed(2)}</td>
                  </tr>
                  <tr className="transition-colors hover:bg-slate-50/40">
                    <td className="px-6 py-3.5 font-semibold text-black">Tarifa 12% (Otros/Anterior)</td>
                    <td className="px-6 py-3.5 text-right font-mono text-black">${ivaVentasBreakdown.iva12Base.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-primary">${ivaVentasBreakdown.iva12Val.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-black">${ivaComprasBreakdown.iva12Base.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-primary">${ivaComprasBreakdown.iva12Val.toFixed(2)}</td>
                  </tr>
                  <tr className="transition-colors hover:bg-slate-50/40">
                    <td className="px-6 py-3.5 font-semibold text-black">Tarifa 0% (Exentos)</td>
                    <td className="px-6 py-3.5 text-right font-mono text-black">${ivaVentasBreakdown.iva0Base.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-gray-400 font-medium">$0.00</td>
                    <td className="px-6 py-3.5 text-right font-mono text-black">${ivaComprasBreakdown.iva0Base.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-gray-400 font-medium">$0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. RESUMEN DE RETENCIONES */}
      {activeTab === 'retenciones' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* RETENCIONES EMITIDAS (COMPRAS) */}
          <div className={cardClass}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Retenciones Emitidas (Gastos/Compras)</h3>
              </div>
              <span className="text-xs font-bold text-red-500">${totalRetsEmitidasVal.toFixed(2)}</span>
            </div>

            <div className="rounded-card border overflow-hidden transition-all border-slate-200/80 bg-white">
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="text-xs uppercase font-bold tracking-wider bg-slate-50 text-slate-600 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Fecha</th>
                      <th className="px-6 py-3.5">Tipo</th>
                      <th className="px-6 py-3.5">Cód SRI</th>
                      <th className="px-6 py-3.5 text-right">Base</th>
                      <th className="px-6 py-3.5 text-right">Retenido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {retsEmitidas.map((r, i) => (
                      <tr key={i} className="transition-colors hover:bg-slate-50/40">
                        <td className="px-6 py-3.5 text-gray-400 font-medium">{r.fecha}</td>
                        <td className="px-6 py-3.5 font-bold text-black">{r.impuesto}</td>
                        <td className="px-6 py-3.5 font-mono text-xs text-gray-550 font-bold">{r.codigo}</td>
                        <td className="px-6 py-3.5 text-right font-mono text-black">${r.base.toFixed(2)}</td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-red-500">${r.valor.toFixed(2)}</td>
                      </tr>
                    ))}
                    {retsEmitidas.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic">No se registran retenciones emitidas en este periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RETENCIONES RECIBIDAS (VENTAS) */}
          <div className={cardClass}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Retenciones Recibidas (Ventas/Ingresos)</h3>
              </div>
              <span className="text-xs font-bold text-emerald-500">${totalRetsRecibidasVal.toFixed(2)}</span>
            </div>

            <div className="rounded-card border overflow-hidden transition-all border-slate-200/80 bg-white">
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="text-xs uppercase font-bold tracking-wider bg-slate-50 text-slate-600 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Fecha</th>
                      <th className="px-6 py-3.5">Factura</th>
                      <th className="px-6 py-3.5">Impuesto</th>
                      <th className="px-6 py-3.5 text-right">Base</th>
                      <th className="px-6 py-3.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {retsRecibidas.map((r, i) => (
                      <tr key={i} className="transition-colors hover:bg-slate-50/40">
                        <td className="px-6 py-3.5 text-gray-400 font-medium">{r.fecha}</td>
                        <td className="px-6 py-3.5 font-mono text-xs font-bold">{r.comprobante}</td>
                        <td className="px-6 py-3.5 font-bold text-black">{r.impuesto}</td>
                        <td className="px-6 py-3.5 text-right font-mono text-black">${r.base.toFixed(2)}</td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-500">${r.valor.toFixed(2)}</td>
                      </tr>
                    ))}
                    {retsRecibidas.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic">No se registran retenciones recibidas en este periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. PRE-ATS EXPORTADOR */}
      {activeTab === 'ats' && (
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
            <FileText size={18} className="text-purple-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Generador del Anexo Transaccional Simplificado (ATS)</h3>
          </div>

          <div className="space-y-4 text-xs leading-normal">
            <p>
              El **ATS** es la estructura consolidada que presentas mensualmente al SRI con el detalle de tus transacciones.
              Este módulo compila todas las facturas y retenciones ingresadas en el mes para pre-validar las transacciones y generar el archivo exportador.
            </p>
            
            <div className="p-4 rounded-card border grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border-gray-200">
              <div>
                <p className="text-xs uppercase text-gray-500 font-black">Registros Compilados</p>
                <p className="text-base font-bold">{filteredTx.length} transacciones</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 font-black">Periodo ATS</p>
                <p className="text-base font-bold font-mono">{selectedYear}-{String(Number(selectedMonth)+1).padStart(2, '0')}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 font-black">Ventas Reportadas</p>
                <p className="text-base font-bold text-emerald-500">{ventas.length} facturas</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 font-black">Compras con Retención</p>
                <p className="text-base font-bold text-red-500">
                  {compras.filter(c => c.retenciones && c.retenciones.length > 0).length} registros
                </p>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button onClick={handleDownloadATS} className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition-transform hover:-translate-y-0.5">
                <Download size={14} /> Descargar Archivo ATS para SRI (JSON)
              </button>
            </div>
            
            <p className="text-xs text-gray-500 leading-normal pt-2">
              Nota: El archivo JSON puede convertirse a formato XML compatible con el validador DIMM de forma automática o utilizarse como sustento directo para contabilidad.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
