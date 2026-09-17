import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiLabel, UiHeading, UiText } from '../ui/layout';
import { UiSelect, UiButton, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell } from '../ui/controls';
import { useState } from 'react';
import { 
  Download, FileSpreadsheet, PieChart, TrendingUp, TrendingDown, 
  FileText, Shield, Percent, AlertCircle
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

  

  

  return (
    <UiBox {...{"className":"animate-in slide-in-from-bottom-4 duration-500 space-y-6"}}>
      
      {/* SECCIÓN FILTROS Y NAVEGACIÓN */}
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-5 flex flex-col md:flex-row items-center justify-between gap-4"}}>
        <UiBox {...{"className":"flex items-center gap-3"}}>
          <UiBox>
            <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1"}}>Periodo Fiscal</UiLabel>
            <UiBox {...{"className":"flex gap-2"}}>
              <UiSelect value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} {...{"size":"2","color":"gray"}}>
                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                  <option key={i} value={i} {...{"style":{"color":"var(--gray-12)"}}}>{m}</option>
                ))}
              </UiSelect>
              <UiSelect value={selectedYear} onChange={e => setSelectedYear(e.target.value)} {...{"size":"2","color":"gray"}}>
                {[2023, 2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y} {...{"style":{"color":"var(--gray-12)"}}}>{y}</option>
                ))}
              </UiSelect>
            </UiBox>
          </UiBox>

          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"flex items-end self-end h-[38px] p-0.5"}}>
            {[
              { id: 'resumen', label: 'Resumen', icon: PieChart },
              { id: 'iva', label: 'IVA', icon: Percent },
              { id: 'retenciones', label: 'Retenciones', icon: Shield },
              { id: 'ats', label: 'Pre-ATS', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <UiButton
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  {...mergeThemeProps({"size":"2","className":"flex items-center gap-1.5"}, {}, (isActive ? {"variant":"surface","color":"gray"} : {"color":"gray"}))}
                >
                  <Icon size={12} />
                  {tab.label}
                </UiButton>
              );
            })}
          </UiBox>
        </UiBox>

        <UiBox {...{"className":"flex gap-2"}}>
          <UiButton onClick={handleExportCSV} {...{"size":"2","variant":"solid","color":"green","className":"flex items-center gap-1.5 transition-transform hover:-translate-y-0.5"}}>
            <FileSpreadsheet size={14} /> Exportar CSV
          </UiButton>
          <UiButton onClick={handleDownloadATS} {...{"size":"2","variant":"solid","color":"purple","className":"flex items-center gap-1.5 transition-transform hover:-translate-y-0.5"}}>
            <Download size={14} /> Descargar ATS JSON
          </UiButton>
        </UiBox>
      </UiCard>

      {/* CUERPO TABS */}
      
      {/* 1. RESUMEN FINANCIERO */}
      {activeTab === 'resumen' && (
        <UiBox {...{"className":"space-y-6"}}>
          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-6"}}>
            
            {/* VENTAS */}
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-6"}}>
              <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-6 pb-4"}}>
                <TrendingUp size={18} {...{"style":{"color":"var(--green-11)"}}} />
                <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Ventas e Ingresos</UiHeading>
              </UiBox>
              <UiBox {...{"className":"space-y-4"}}>
                <UiBox {...{"className":"flex justify-between"}}>
                  <UiText {...{"color":"gray"}}>Base Imponible Gravable:</UiText>
                  <UiText {...{"weight":"bold"}}>${baseVentas.toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"color":"var(--blue-12)"},"className":"flex justify-between"}}>
                  <UiText>IVA Cobrado:</UiText>
                  <UiText {...{"weight":"bold"}}>${ivaVentas.toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"color":"var(--amber-11)"},"className":"flex justify-between"}}>
                  <UiText>Retenciones en la Fuente Recibidas:</UiText>
                  <UiText>-${retFuenteVentas.toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"color":"var(--amber-11)"},"className":"flex justify-between"}}>
                  <UiText>Retenciones de IVA Recibidas:</UiText>
                  <UiText>-${retIvaVentas.toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-3"}}>
                  <UiText>Total Cobrado Neto:</UiText>
                  <UiText {...{"color":"green"}}>${totalVentas.toFixed(2)}</UiText>
                </UiBox>
              </UiBox>
            </UiBox>

            {/* COMPRAS */}
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-6"}}>
              <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-6 pb-4"}}>
                <TrendingDown size={18} {...{"style":{"color":"var(--red-11)"}}} />
                <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Compras y Egresos</UiHeading>
              </UiBox>
              <UiBox {...{"className":"space-y-4"}}>
                <UiBox {...{"className":"flex justify-between"}}>
                  <UiText {...{"color":"gray"}}>Base Imponible Operativa:</UiText>
                  <UiText {...{"weight":"bold"}}>${baseCompras.toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"color":"var(--blue-12)"},"className":"flex justify-between"}}>
                  <UiText>IVA Pagado (Crédito):</UiText>
                  <UiText {...{"weight":"bold"}}>${ivaCompras.toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"color":"var(--red-11)"},"className":"flex justify-between"}}>
                  <UiText>Retenciones en la Fuente Emitidas:</UiText>
                  <UiText>-${retFuenteCompras.toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"color":"var(--red-11)"},"className":"flex justify-between"}}>
                  <UiText>Retenciones de IVA Emitidas:</UiText>
                  <UiText>-${retIvaCompras.toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-3"}}>
                  <UiText>Total Pagado Neto:</UiText>
                  <UiText {...{"color":"red"}}>${totalCompras.toFixed(2)}</UiText>
                </UiBox>
              </UiBox>
            </UiBox>

          </UiBox>

          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-5 flex items-center gap-3.5"}}>
            <AlertCircle size={20} {...{"className":"shrink-0"}} />
            <UiBox {...{"className":"leading-normal"}}>
              Resumen del Mes Fiscal: Has facturado en ventas un total bruto de <strong>${(baseVentas + ivaVentas).toFixed(2)}</strong> y en compras un total de <strong>${(baseCompras + ivaCompras).toFixed(2)}</strong>. Tu saldo operativo neto antes de retenciones tributarias es de <strong>${(totalVentas - totalCompras).toFixed(2)}</strong>.
            </UiBox>
          </UiBox>
        </UiBox>
      )}

      {/* 2. CONCILIACIÓN DE IVA */}
      {activeTab === 'iva' && (
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-6"}}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-6 pb-4"}}>
            <Percent size={18} {...{"style":{"color":"var(--blue-12)"}}} />
            <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Conciliación Mensual de IVA (SRI)</UiHeading>
          </UiBox>

          <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4"}}>
              <UiText as="p" {...{"size":"1","color":"gray","weight":"bold"}}>Total IVA Ventas (Cobrado)</UiText>
              <UiText as="p" {...{"size":"5","weight":"bold","className":"mt-1"}}>${ivaVentas.toFixed(2)}</UiText>
            </UiBox>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4"}}>
              <UiText as="p" {...{"size":"1","color":"gray","weight":"bold"}}>Total IVA Compras (Crédito)</UiText>
              <UiText as="p" {...{"size":"5","weight":"bold","className":"mt-1"}}>${ivaCompras.toFixed(2)}</UiText>
            </UiBox>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4"}, {}, ((ivaVentas - ivaCompras) >= 0 ? {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-12)"}} : {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-12)"}}))}>
              <UiText as="p" {...{"size":"1","weight":"bold"}}>IVA a Pagar / Crédito Tributario</UiText>
              <UiText as="p" {...{"size":"5","weight":"bold","className":"mt-1"}}>${(ivaVentas - ivaCompras).toFixed(2)}</UiText>
            </UiBox>
          </UiBox>

          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
            <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
              <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
                <UiTableHeader {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}}}>
                  <UiTableRow>
                    <UiTableHead {...{"className":"px-6 py-3.5"}}>Tarifa / Porcentaje</UiTableHead>
                    <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Base Ventas</UiTableHead>
                    <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>IVA Ventas</UiTableHead>
                    <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Base Compras</UiTableHead>
                    <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>IVA Compras</UiTableHead>
                  </UiTableRow>
                </UiTableHeader>
                <UiTableBody {...{}}>
                  <UiTableRow {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5"}}>Tarifa 15% (General)</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaVentasBreakdown.iva15Base.toFixed(2)}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--blue-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaVentasBreakdown.iva15Val.toFixed(2)}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaComprasBreakdown.iva15Base.toFixed(2)}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--blue-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaComprasBreakdown.iva15Val.toFixed(2)}</UiTableCell>
                  </UiTableRow>
                  <UiTableRow {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5"}}>Tarifa 12% (Otros/Anterior)</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaVentasBreakdown.iva12Base.toFixed(2)}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--blue-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaVentasBreakdown.iva12Val.toFixed(2)}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaComprasBreakdown.iva12Base.toFixed(2)}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--blue-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaComprasBreakdown.iva12Val.toFixed(2)}</UiTableCell>
                  </UiTableRow>
                  <UiTableRow {...{}}>
                    <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5"}}>Tarifa 0% (Exentos)</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaVentasBreakdown.iva0Base.toFixed(2)}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-11)"},"className":"px-6 py-3.5 text-right"}}>$0.00</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"}}>${ivaComprasBreakdown.iva0Base.toFixed(2)}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-11)"},"className":"px-6 py-3.5 text-right"}}>$0.00</UiTableCell>
                  </UiTableRow>
                </UiTableBody>
              </UiTable>
            </UiBox>
          </UiBox>
        </UiBox>
      )}

      {/* 3. RESUMEN DE RETENCIONES */}
      {activeTab === 'retenciones' && (
        <UiBox {...{"className":"grid grid-cols-1 lg:grid-cols-2 gap-6"}}>
          
          {/* RETENCIONES EMITIDAS (COMPRAS) */}
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-6"}}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-6 pb-4"}}>
              <UiBox {...{"className":"flex items-center gap-2"}}>
                <Shield size={18} {...{"style":{"color":"var(--red-11)"}}} />
                <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Retenciones Emitidas (Gastos/Compras)</UiHeading>
              </UiBox>
              <UiText {...{"size":"1","weight":"bold","color":"red"}}>${totalRetsEmitidasVal.toFixed(2)}</UiText>
            </UiBox>

            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
              <UiBox {...{"className":"overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar"}}>
                <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
                  <UiTableHeader {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}}}>
                    <UiTableRow>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Fecha</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Tipo</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Cód SRI</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Base</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Retenido</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody {...{}}>
                    {retsEmitidas.map((r, i) => (
                      <UiTableRow key={i} {...{}}>
                        <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{r.fecha}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5"}}>{r.impuesto}</UiTableCell>
                        <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5"}}>{r.codigo}</UiTableCell>
                        <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"}}>${r.base.toFixed(2)}</UiTableCell>
                        <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--red-11)"},"className":"px-6 py-3.5 text-right"}}>${r.valor.toFixed(2)}</UiTableCell>
                      </UiTableRow>
                    ))}
                    {retsEmitidas.length === 0 && (
                      <UiTableRow>
                        <UiTableCell colSpan="5" {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center italic"}}>No se registran retenciones emitidas en este periodo.</UiTableCell>
                      </UiTableRow>
                    )}
                  </UiTableBody>
                </UiTable>
              </UiBox>
            </UiBox>
          </UiBox>

          {/* RETENCIONES RECIBIDAS (VENTAS) */}
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-6"}}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-6 pb-4"}}>
              <UiBox {...{"className":"flex items-center gap-2"}}>
                <Shield size={18} {...{"style":{"color":"var(--green-11)"}}} />
                <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Retenciones Recibidas (Ventas/Ingresos)</UiHeading>
              </UiBox>
              <UiText {...{"size":"1","weight":"bold","color":"green"}}>${totalRetsRecibidasVal.toFixed(2)}</UiText>
            </UiBox>

            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
              <UiBox {...{"className":"overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar"}}>
                <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
                  <UiTableHeader {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}}}>
                    <UiTableRow>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Fecha</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Factura</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5"}}>Impuesto</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Base</UiTableHead>
                      <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Valor</UiTableHead>
                    </UiTableRow>
                  </UiTableHeader>
                  <UiTableBody {...{}}>
                    {retsRecibidas.map((r, i) => (
                      <UiTableRow key={i} {...{}}>
                        <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{r.fecha}</UiTableCell>
                        <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>{r.comprobante}</UiTableCell>
                        <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5"}}>{r.impuesto}</UiTableCell>
                        <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"}}>${r.base.toFixed(2)}</UiTableCell>
                        <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)","color":"var(--green-11)"},"className":"px-6 py-3.5 text-right"}}>${r.valor.toFixed(2)}</UiTableCell>
                      </UiTableRow>
                    ))}
                    {retsRecibidas.length === 0 && (
                      <UiTableRow>
                        <UiTableCell colSpan="5" {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center italic"}}>No se registran retenciones recibidas en este periodo.</UiTableCell>
                      </UiTableRow>
                    )}
                  </UiTableBody>
                </UiTable>
              </UiBox>
            </UiBox>
          </UiBox>

        </UiBox>
      )}

      {/* 4. PRE-ATS EXPORTADOR */}
      {activeTab === 'ats' && (
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-6"}}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-6 pb-4"}}>
            <FileText size={18} {...{"style":{"color":"var(--purple-11)"}}} />
            <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Generador del Anexo Transaccional Simplificado (ATS)</UiHeading>
          </UiBox>

          <UiBox {...{"className":"space-y-4 leading-normal"}}>
            <UiText as="p">
              El **ATS** es la estructura consolidada que presentas mensualmente al SRI con el detalle de tus transacciones.
              Este módulo compila todas las facturas y retenciones ingresadas en el mes para pre-validar las transacciones y generar el archivo exportador.
            </UiText>
            
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4 grid grid-cols-2 md:grid-cols-4 gap-4"}}>
              <UiBox>
                <UiText as="p" {...{"size":"1","color":"gray","weight":"bold"}}>Registros Compilados</UiText>
                <UiText as="p" {...{"size":"3","weight":"bold"}}>{filteredTx.length} transacciones</UiText>
              </UiBox>
              <UiBox>
                <UiText as="p" {...{"size":"1","color":"gray","weight":"bold"}}>Periodo ATS</UiText>
                <UiText as="p" {...{"size":"3","weight":"regular"}}>{selectedYear}-{String(Number(selectedMonth)+1).padStart(2, '0')}</UiText>
              </UiBox>
              <UiBox>
                <UiText as="p" {...{"size":"1","color":"gray","weight":"bold"}}>Ventas Reportadas</UiText>
                <UiText as="p" {...{"size":"3","weight":"bold","color":"green"}}>{ventas.length} facturas</UiText>
              </UiBox>
              <UiBox>
                <UiText as="p" {...{"size":"1","color":"gray","weight":"bold"}}>Compras con Retención</UiText>
                <UiText as="p" {...{"size":"3","weight":"bold","color":"red"}}>
                  {compras.filter(c => c.retenciones && c.retenciones.length > 0).length} registros
                </UiText>
              </UiBox>
            </UiBox>

            <UiBox {...{"className":"pt-4 flex gap-3"}}>
              <UiButton onClick={handleDownloadATS} {...{"size":"2","variant":"solid","color":"purple","className":"flex items-center gap-2 transition-transform hover:-translate-y-0.5"}}>
                <Download size={14} /> Descargar Archivo ATS para SRI (JSON)
              </UiButton>
            </UiBox>
            
            <UiText as="p" {...{"size":"1","color":"gray","className":"leading-normal pt-2"}}>
              Nota: El archivo JSON puede convertirse a formato XML compatible con el validador DIMM de forma automática o utilizarse como sustento directo para contabilidad.
            </UiText>
          </UiBox>
        </UiBox>
      )}

    </UiBox>
  );
}
