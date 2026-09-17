import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiText, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiSelect } from '../ui/controls';
import { useState } from 'react';
import { 
  DollarSign, Search, FileText, 
  Eye, ArrowDownCircle, ArrowUpCircle, X, Download, Users
} from 'lucide-react';
import { doc, setDoc } from '../../services/financeStore.js';
import { getEcuadorDateString } from '../../services/sriService';

export default function AccountsReceivablePayable({ type = 'cxc', transactions = [], thirdParties = [], showToast, db, appId }) {
  const isCxC = type === 'cxc';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentRef, setPaymentRef] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Filtrar transacciones pendientes de cobro (ingresos) o pago (egresos)
  const filteredTxs = transactions.filter(tx => {
    const isTargetType = isCxC ? tx.type === 'ingreso' : tx.type === 'egreso';
    // Considerar como pendiente si paymentStatus no es 'pagado'
    const isPending = tx.paymentStatus !== 'pagado';
    
    if (!isTargetType || !isPending) return false;

    const matchedTercero = thirdParties.find(tp => tp.id === tx.thirdPartyId);
    const searchString = `${tx.documentNumber || ''} ${matchedTercero?.name || ''} ${tx.claveAcceso || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Métricas agregadas
  const totalBalance = filteredTxs.reduce((sum, tx) => {
    const total = Number(tx.total) || 0;
    const paid = Number(tx.paidAmount) || 0;
    return sum + (total - paid);
  }, 0);

  const totalOriginal = filteredTxs.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  const distinctContactsCount = new Set(filteredTxs.map(tx => tx.thirdPartyId)).size;

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    const parsedAmount = parseFloat(paymentAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast("Monto del abono inválido", "error");
      return;
    }

    const total = Number(selectedTx.total) || 0;
    const currentPaid = Number(selectedTx.paidAmount) || 0;
    const remaining = total - currentPaid;

    if (parsedAmount > remaining + 0.01) {
      showToast(`El abono de $parsedAmount.toFixed(2) excede el saldo pendiente ($remaining.toFixed(2))`, "error");
      return;
    }

    const newPaid = currentPaid + parsedAmount;
    const isCompleted = newPaid >= total - 0.01;

    const paymentLog = {
      id: `pay_new Date().getTime()`,
      amount: parsedAmount,
      method: paymentMethod,
      reference: paymentRef || '',
      date: getEcuadorDateString()
    };

    const newHistory = [...(selectedTx.paymentsHistory || []), paymentLog];

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', selectedTx.id);
      await setDoc(docRef, {
        paidAmount: Number(newPaid.toFixed(2)),
        paymentStatus: isCompleted ? 'pagado' : 'pendiente',
        paymentsHistory: newHistory,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast("Abono registrado exitosamente", "success");
      setSelectedTx(null);
      setPaymentAmount('');
      setPaymentRef('');
    } catch (err) {
      console.error(err);
      showToast("Error al registrar el abono", "error");
    }
  };

  const exportToCSV = () => {
    if (filteredTxs.length === 0) {
      showToast("No hay registros para exportar", "error");
      return;
    }

    const headers = ["Fecha", "Comprobante", "Contacto", "Total Factura", "Abonado", "Pendiente"];
    const rows = filteredTxs.map(tx => {
      const contact = thirdParties.find(tp => tp.id === tx.thirdPartyId)?.name || 'Desconocido';
      const paid = Number(tx.paidAmount) || 0;
      const pending = Number(tx.total) - paid;
      return [
        tx.date,
        tx.documentNumber || `Sec: ${tx.secuencial || 'N/A'}`,
        contact,
        Number(tx.total).toFixed(2),
        paid.toFixed(2),
        pending.toFixed(2)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${isCxC ? 'cuentas_por_cobrar' : 'cuentas_por_pagar'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  

  return (
    <UiBox {...{"className":"space-y-6"}}>
      
      {/* TARJETAS DE MÉTRICAS */}
      <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-3 gap-6"}}>
        <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-5"})}>
          <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
            <UiText {...{"size":"1","weight":"bold","color":"gray"}}>
              {isCxC ? 'Total Cuentas por Cobrar' : 'Total Cuentas por Pagar'}
            </UiText>
            <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-1.5"}, {}, (isCxC ? {"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)"}} : {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}}))}>
              {isCxC ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
            </UiBox>
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold"}}>${totalBalance.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</UiText>
          <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Suma del saldo neto pendiente en {filteredTxs.length} documentos</UiText>
        </UiCard>

        <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-5"})}>
          <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
            <UiText {...{"size":"1","weight":"bold","color":"gray"}}>Monto Total Facturado</UiText>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-1.5"}}>
              <FileText size={16} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold"}}>${totalOriginal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</UiText>
          <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Valor histórico total de los comprobantes pendientes</UiText>
        </UiCard>

        <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-5"})}>
          <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
            <UiText {...{"size":"1","weight":"bold","color":"gray"}}>
              {isCxC ? 'Clientes Deudores' : 'Proveedores Acreedores'}
            </UiText>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--purple-3)","color":"var(--purple-11)"},"className":"p-1.5"}}>
              <Users size={16} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold"}}>{distinctContactsCount}</UiText>
          <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Contactos únicos con saldos pendientes</UiText>
        </UiCard>
      </UiBox>

      {/* BARRA DE FILTROS */}
      <UiBox {...{"className":"flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6"}}>
        <UiBox>
          <UiButton
            type="button"
            onClick={exportToCSV}
            {...{"variant":"surface","color":"blue","className":"w-full sm:w-auto"}}
          >
            <Download size={14} />
            <UiText>Exportar Listado</UiText>
          </UiButton>
        </UiBox>

        <UiBox {...{"className":"flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto"}}>
          <UiCard {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"flex items-center gap-2 px-3.5 py-1.5 w-full sm:w-64"}}>
            <Search size={14} {...{"style":{"color":"var(--gray-11)"}}} />
            <UiInput
              type="text" 
              placeholder="Buscar por comprobante o contacto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              {...{"size":"2","className":"w-full"}}
            />
          </UiCard>
        </UiBox>
      </UiBox>

      {/* TABLA DE CUENTAS */}
      <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"overflow-hidden"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
        <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
          <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
            <UiTableHeader {...mergeThemeProps({}, {}, {"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}})}>
              <UiTableRow>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Fecha</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Comprobante</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5"}}>Contacto</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Total Documento</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 text-right hidden sm:table-cell"}}>Abonado</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Pendiente</UiTableHead>
                <UiTableHead {...{"className":"px-6 py-3.5 text-center"}}>Acciones</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody {...mergeThemeProps({})}>
              {filteredTxs.map(tx => {
                const contact = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                const paid = Number(tx.paidAmount) || 0;
                const total = Number(tx.total) || 0;
                const pending = total - paid;
                
                return (
                  <UiTableRow key={tx.id} {...mergeThemeProps({})}>
                    <UiTableCell {...mergeThemeProps({"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5"})}>{tx.date}</UiTableCell>
                    <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5"}}>
                      {tx.documentNumber || `Sec: ${tx.secuencial || 'N/A'}`}
                    </UiTableCell>
                    <UiTableCell {...{"className":"px-6 py-3.5"}}>
                      <UiBox>
                        <UiText as="p" {...mergeThemeProps({"weight":"bold","color":"gray","highContrast":true})}>{contact?.name || 'Desconocido'}</UiText>
                        <UiText as="p" {...{"size":"1","color":"gray","weight":"regular"}}>{contact?.ruc}</UiText>
                      </UiBox>
                    </UiTableCell>
                    <UiTableCell {...mergeThemeProps({"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5 text-right"})}>total.toFixed(2)</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--green-12)"},"className":"px-6 py-3.5 text-right hidden sm:table-cell"}}>paid.toFixed(2)</UiTableCell>
                    <UiTableCell {...{"style":{"color":"var(--red-12)"},"className":"px-6 py-3.5 text-right"}}>pending.toFixed(2)</UiTableCell>
                    <UiTableCell {...{"className":"px-6 py-3.5 text-center"}}>
                      <UiBox {...{"className":"flex justify-center gap-1.5"}}>
                        <UiButton
                          type="button"
                          onClick={() => {
                            setSelectedTx(tx);
                            setPaymentAmount(pending.toFixed(2));
                            setIsHistoryOpen(false);
                          }}
                          {...mergeThemeProps({"size":"2","className":"flex items-center justify-center gap-1.5"}, {}, (isCxC ? {"variant":"solid","color":"green"} : {"variant":"solid","color":"red"}))}
                        >
                          <DollarSign size={10} />
                          <UiText>{isCxC ? 'Abonar' : 'Pagar'}</UiText>
                        </UiButton>
                        
                        {(tx.paymentsHistory && tx.paymentsHistory.length > 0) && (
                          <UiButton iconOnly
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setIsHistoryOpen(true);
                            }}
                            {...{"variant":"solid","color":"amber"}}
                            title="Historial de Abonos"
                          >
                            <Eye size={13} />
                          </UiButton>
                        )}
                      </UiBox>
                    </UiTableCell>
                  </UiTableRow>
                );
              })}
              {filteredTxs.length === 0 && (
                <UiTableRow>
                  <UiTableCell colSpan="7" {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-12 text-center italic"}}>
                    No se encontraron cuentas pendientes que coincidan con la búsqueda.
                  </UiTableCell>
                </UiTableRow>
              )}
            </UiTableBody>
          </UiTable>
        </UiBox>
      </UiBox>

      {/* MODAL REGISTRAR ABONO / VER HISTORIAL */}
      {selectedTx && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in"}}>
          <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-md p-6"})}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-4 pb-2"}}>
              <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>
                {isHistoryOpen ? 'Historial de Abonos / Pagos' : `Registrar ${isCxC ? 'Abono de Cliente' : 'Pago a Proveedor'}`}
              </UiHeading>
              <UiButton iconOnly onClick={() => setSelectedTx(null)} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
            </UiBox>

            {isHistoryOpen ? (
              <UiBox {...{"className":"space-y-4"}}>
                <UiBox {...{"className":"space-y-1"}}>
                  <UiText as="p"><UiText {...{"color":"gray"}}>Comprobante:</UiText> <UiText {...{"weight":"regular"}}>{selectedTx.documentNumber || `Sec: selectedTx.secuencial`}</UiText></UiText>
                  <UiText as="p"><UiText {...{"color":"gray"}}>Total Factura:</UiText> <UiText {...{"weight":"bold"}}>Number(selectedTx.total).toFixed(2)</UiText></UiText>
                  <UiText as="p"><UiText {...{"color":"gray"}}>Saldo Pendiente:</UiText> <UiText {...{"weight":"bold","color":"red"}}>${(Number(selectedTx.total) - (Number(selectedTx.paidAmount) || 0)).toFixed(2)}</UiText></UiText>
                </UiBox>

                <UiBox {...{"style":{"border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"max-h-[250px] overflow-y-auto custom-scrollbar"}}>
                  {selectedTx.paymentsHistory?.map((pay, index) => (
                    <UiBox key={pay.id || index} {...{"className":"p-3 flex justify-between items-center"}}>
                      <UiBox>
                        <UiText as="p" {...{"weight":"bold","color":"green"}}>Number(pay.amount).toFixed(2) — {pay.method}</UiText>
                        {pay.reference && <UiText as="p" {...{"size":"1","color":"gray","weight":"regular","className":"mt-0.5"}}>Ref: {pay.reference}</UiText>}
                      </UiBox>
                      <UiText {...{"size":"1","color":"gray"}}>{pay.date}</UiText>
                    </UiBox>
                  ))}
                </UiBox>

                <UiBox {...{"className":"flex justify-end gap-2 pt-2"}}>
                  <UiButton
                    onClick={() => setIsHistoryOpen(false)}
                    {...{"variant":"surface","color":"blue"}}
                  >
                    Volver a Registrar Abono
                  </UiButton>
                </UiBox>
              </UiBox>
            ) : (
              <form onSubmit={handleRecordPayment} {...{"className":"space-y-4"}}>
                <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","border":"1px solid var(--gray-a6)"},"className":"p-3.5 space-y-2"}}>
                  <UiBox {...{"className":"flex justify-between"}}>
                    <UiText {...{"color":"gray"}}>Total Factura:</UiText>
                    <UiText {...{"weight":"bold"}}>Number(selectedTx.total).toFixed(2)</UiText>
                  </UiBox>
                  <UiBox {...{"className":"flex justify-between"}}>
                    <UiText {...{"color":"gray"}}>Total Abonado:</UiText>
                    <UiText {...{"weight":"bold","color":"green"}}>${(Number(selectedTx.paidAmount) || 0).toFixed(2)}</UiText>
                  </UiBox>
                  <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-2"}}>
                    <UiText {...{"color":"gray"}}>Saldo Pendiente:</UiText>
                    <UiText {...{"color":"red"}}>${(Number(selectedTx.total) - (Number(selectedTx.paidAmount) || 0)).toFixed(2)}</UiText>
                  </UiBox>
                </UiBox>

                <UiBox>
                  <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Monto del Abono ($)</UiLabel>
                  <UiInput
                    type="number"
                    step="0.01"
                    required
                    max={(Number(selectedTx.total) - (Number(selectedTx.paidAmount) || 0)).toFixed(2)}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                    placeholder="0.00"
                  />
                </UiBox>

                <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                  <UiBox>
                    <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Forma de Cobro</UiLabel>
                    <UiSelect
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                    >
                      <option value="efectivo" {...{"style":{"color":"var(--gray-12)"}}}>Efectivo</option>
                      <option value="transferencia" {...{"style":{"color":"var(--gray-12)"}}}>Transferencia</option>
                      <option value="tarjeta" {...{"style":{"color":"var(--gray-12)"}}}>Tarjeta</option>
                      <option value="cruce_cuentas" {...{"style":{"color":"var(--gray-12)"}}}>Cruce Cuentas</option>
                    </UiSelect>
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>Referencia</UiLabel>
                    <UiInput
                      type="text"
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      {...mergeThemeProps({"size":"2","className":"w-full"}, {}, {"color":"gray"})}
                      placeholder="Lote / Banco / Nro doc"
                    />
                  </UiBox>
                </UiBox>

                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-2.5 pt-3"}}>
                  <UiButton
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    {...{"variant":"surface","color":"blue"}}
                  >
                    Cancelar
                  </UiButton>
                  <UiButton
                    type="submit"
                    {...mergeThemeProps({"size":"2","className":"flex items-center justify-center gap-1.5"}, {}, (isCxC ? {"variant":"solid","color":"green"} : {"variant":"solid","color":"red"}))}
                  >
                    Registrar Cobro
                  </UiButton>
                </UiBox>
              </form>
            )}

          </UiCard>
        </UiBox>
      )}

    </UiBox>
  );
}

// Icono Users de lucide-react cargado directamente.
