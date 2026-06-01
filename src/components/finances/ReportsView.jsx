import React, { useState } from 'react';
import { Download, FileSpreadsheet, PieChart } from 'lucide-react';

export default function ReportsView({ transactions, isDarkMode, showToast }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const filteredTx = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth().toString() === selectedMonth && d.getFullYear().toString() === selectedYear;
  });

  const ventas = filteredTx.filter(t => t.type === 'ingreso');
  const compras = filteredTx.filter(t => t.type === 'egreso');

  const sumTotal = (arr, field) => arr.reduce((acc, t) => acc + (Number(t[field]) || 0), 0);

  const baseVentas = sumTotal(ventas, 'baseImponible');
  const ivaVentas = sumTotal(ventas, 'ivaValor');
  const retFuenteVentas = sumTotal(ventas, 'retencionFuente');
  const retIvaVentas = sumTotal(ventas, 'retencionIva');

  const baseCompras = sumTotal(compras, 'baseImponible');
  const ivaCompras = sumTotal(compras, 'ivaValor');
  const retFuenteCompras = sumTotal(compras, 'retencionFuente');
  const retIvaCompras = sumTotal(compras, 'retencionIva');

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

  const cardClass = `p-6 rounded-2xl border backdrop-blur-xl transition-all ${
    isDarkMode 
      ? 'bg-white/[0.02] border-white/10' 
      : 'bg-white border-gray-200'
  }`;

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
      
      {/* FILTROS Y BOTÓN EXPORTAR */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div>
            <label className={`block text-[10px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mes Fiscal</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border outline-none ${isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                <option key={i} value={i} className="text-black">{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-[10px] font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Año</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border outline-none ${isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
              {[2023, 2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="text-black">{y}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleExportCSV} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-transform hover:-translate-y-0.5">
          <FileSpreadsheet size={18} /> Descargar Reporte (CSV)
        </button>
      </div>

      {/* RESUMEN SRI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* VENTAS / INGRESOS */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
            <PieChart size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ventas (Ingresos)</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Base Imponible Total</span>
              <span className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>${baseVentas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>IVA Generado (Cobrado)</span>
              <span className="font-bold text-blue-500">${ivaVentas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Retenciones (Fuente) que nos hicieron</span>
              <span className="font-bold text-yellow-500">${retFuenteVentas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Retenciones (IVA) que nos hicieron</span>
              <span className="font-bold text-yellow-500">${retIvaVentas.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* COMPRAS / EGRESOS */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
            <PieChart size={18} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Compras (Egresos)</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Base Imponible Total</span>
              <span className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>${baseCompras.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>IVA Pagado (Crédito Tributario)</span>
              <span className="font-bold text-blue-500">${ivaCompras.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Retenciones (Fuente) Emitidas</span>
              <span className="font-bold text-red-500">${retFuenteCompras.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Retenciones (IVA) Emitidas</span>
              <span className="font-bold text-red-500">${retIvaCompras.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      <div className={`p-4 rounded-xl text-xs text-center border-dashed border ${isDarkMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
        Este reporte es ideal para entregar al contador. El "IVA por pagar" estimado en este periodo es la diferencia entre el IVA Cobrado (${ivaVentas.toFixed(2)}) y el Crédito Tributario (${ivaCompras.toFixed(2)}). Total: <strong>${(ivaVentas - ivaCompras).toFixed(2)}</strong>.
      </div>

    </div>
  );
}
