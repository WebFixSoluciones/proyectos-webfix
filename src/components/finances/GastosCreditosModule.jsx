import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiCard, UiText, UiHeading, UiLabel } from '../ui/layout';
import { UiButton, UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiInput, UiSelect } from '../ui/controls';
import { useState, useEffect } from 'react';
import { 
  CreditCard, DollarSign, Landmark, ShoppingBag, Plus, 
  Trash2, X, 
  ArrowUpCircle, History
} from 'lucide-react';
import { doc, setDoc, collection, onSnapshot, deleteDoc } from '../../services/financeStore.js';
import { getEcuadorDateString } from '../../services/sriService';

export default function GastosCreditosModule({ showToast, transactions = [], thirdParties = [], db, appId, initialSubTab }) {
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'pasivos' | 'historial_gastos'

  useEffect(() => {
    if (initialSubTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [liabilities, setLiabilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para modal de agregar Pasivo
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLiability, setNewLiability] = useState({
    type: 'prestamo', // 'prestamo', 'credito_almacen', 'tarjeta_credito'
    entity: '',
    montoInicial: '',
    tasaInteres: '',
    plazoMeses: '',
    cuotaMensual: '',
    saldoPendiente: '',
    limiteCredito: '',
    fechaCorte: '',
    fechaPago: '',
    nextPaymentDate: getEcuadorDateString()
  });

  // Estados para modal de pago de cuota
  const [selectedLiability, setSelectedLiability] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [paymentRef, setPaymentRef] = useState('');

  // Cargar pasivos desde Firestore
  useEffect(() => {
    if (!appId || !db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'finances_liabilities');
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiabilities(list);
      setLoading(false);
    }, (err) => {
      console.error("Error cargando pasivos:", err);
      setLoading(false);
    });
    return unsub;
  }, [appId, db]);

  // Guardar nuevo pasivo
  const handleAddLiability = async (e) => {
    e.preventDefault();
    if (!newLiability.entity.trim()) {
      showToast("Ingrese la entidad financiera u origen del crédito", "error");
      return;
    }

    try {
      const docId = `liability_${new Date().getTime()}`;
      const payload = {
        id: docId,
        type: newLiability.type,
        entity: newLiability.entity,
        montoInicial: Number(newLiability.montoInicial) || 0,
        saldoPendiente: Number(newLiability.saldoPendiente) || Number(newLiability.montoInicial) || 0,
        cuotaMensual: Number(newLiability.cuotaMensual) || 0,
        nextPaymentDate: newLiability.nextPaymentDate || '',
        createdAt: new Date().toISOString(),
        paymentsHistory: []
      };

      if (newLiability.type === 'prestamo') {
        payload.tasaInteres = Number(newLiability.tasaInteres) || 0;
        payload.plazoMeses = Number(newLiability.plazoMeses) || 0;
      } else if (newLiability.type === 'tarjeta_credito') {
        payload.limiteCredito = Number(newLiability.limiteCredito) || 0;
        payload.fechaCorte = newLiability.fechaCorte || '';
        payload.fechaPago = newLiability.fechaPago || '';
      } else if (newLiability.type === 'credito_almacen') {
        payload.limiteCredito = Number(newLiability.limiteCredito) || 0;
      }

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_liabilities', docId), payload);
      showToast("Pasivo financiero registrado correctamente", "success");
      setIsAddModalOpen(false);
      setNewLiability({
        type: 'prestamo', entity: '', montoInicial: '', tasaInteres: '',
        plazoMeses: '', cuotaMensual: '', saldoPendiente: '', limiteCredito: '',
        fechaCorte: '', fechaPago: '', nextPaymentDate: getEcuadorDateString()
      });
    } catch (err) {
      console.error(err);
      showToast("Error al guardar el pasivo", "error");
    }
  };

  // Pagar cuota / abono de pasivo
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedLiability) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Monto de pago inválido", "error");
      return;
    }

    try {
      const currentPending = Number(selectedLiability.saldoPendiente) || 0;
      const nextPending = Math.max(0, currentPending - amount);

      const paymentLog = {
        id: `pay_${new Date().getTime()}`,
        amount,
        method: paymentMethod,
        reference: paymentRef || '',
        date: getEcuadorDateString()
      };

      const updatedHistory = [...(selectedLiability.paymentsHistory || []), paymentLog];

      // 1. Actualizar pasivo
      const liabRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_liabilities', selectedLiability.id);
      await setDoc(liabRef, {
        saldoPendiente: nextPending,
        paymentsHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Registrar en contabilidad automática (Egreso de tipo financiero)
      const txId = `tx_${new Date().getTime()}`;
      const docNum = `FIN-${new Date().getTime().toString().slice(-6)}`;
      const txPayload = {
        id: txId,
        type: 'egreso',
        documentType: 'nota_venta',
        date: getEcuadorDateString(),
        documentNumber: docNum,
        thirdPartyId: '', // Pago financiero interno
        category: 'gastos_administrativos', // Categoría contable
        description: `Pago de pasivo (${selectedLiability.type}): ${selectedLiability.entity} - Ref: ${paymentRef || 'N/A'}`,
        currency: 'USD',
        baseImponible: amount,
        ivaPorcentaje: 0,
        ivaValor: 0,
        total: amount,
        paymentMethod,
        paymentStatus: 'pagado',
        sriStatus: 'no_aplica',
        paymentsBreakdown: {
          efectivo: paymentMethod === 'efectivo' ? amount : 0,
          transferencia: paymentMethod === 'transferencia' ? amount : 0,
          tarjeta: paymentMethod === 'tarjeta' ? amount : 0,
          cruce_cuentas: 0
        },
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', txId), txPayload);

      showToast(`Pago de $${amount.toFixed(2)} registrado e integrado a contabilidad`, "success");
      setSelectedLiability(null);
      setPaymentAmount('');
      setPaymentRef('');
    } catch (err) {
      console.error(err);
      showToast("Error al registrar el pago", "error");
    }
  };

  // Eliminar pasivo
  const handleDeleteLiability = async (id) => {
    if (!await window.confirm("¿Está seguro de eliminar este pasivo financiero? No se borrarán los pagos registrados en la contabilidad.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_liabilities', id));
      showToast("Pasivo financiero eliminado", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al eliminar", "error");
    }
  };

  // Cálculos de Resumen
  const totalPasivos = liabilities.reduce((sum, l) => sum + (Number(l.saldoPendiente) || 0), 0);
  const totalCuotasMes = liabilities.reduce((sum, l) => sum + (Number(l.cuotaMensual) || 0), 0);
  const prestamos = liabilities.filter(l => l.type === 'prestamo');
  const creditosAlmacen = liabilities.filter(l => l.type === 'credito_almacen');
  const tarjetasCredito = liabilities.filter(l => l.type === 'tarjeta_credito');

  // Filtrar todos los egresos (compras/gastos) del ERP para el historial unificado
  const historicalEgresos = transactions.filter(t => t.type === 'egreso');
  const totalExpensesAllTime = historicalEgresos.reduce((sum, t) => sum + (Number(t.total) || 0), 0);

  const getTypeName = (type) => {
    switch (type) {
      case 'prestamo': return 'Préstamo Bancario';
      case 'credito_almacen': return 'Crédito de Almacén';
      case 'tarjeta_credito': return 'Tarjeta de Crédito Corporativa';
      default: return type;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'prestamo': return <Landmark {...{"style":{"color":"var(--green-11)"}}} size={18} />;
      case 'credito_almacen': return <ShoppingBag {...{"style":{"color":"var(--amber-11)"}}} size={18} />;
      case 'tarjeta_credito': return <CreditCard {...{"style":{"color":"var(--pink-11)"}}} size={18} />;
      default: return <DollarSign {...{"style":{"color":"var(--blue-12)"}}} size={18} />;
    }
  };

  

  return (
    <UiBox {...{"className":"flex flex-col h-full w-full animate-in fade-in duration-500 overflow-hidden"}}>
      


      {/* CUERPO DEL MÓDULO */}
      <UiBox {...{"style":{"backgroundColor":"transparent"},"className":"flex flex-1 overflow-hidden min-h-0"}}>
        <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"flex-1 overflow-y-auto px-8 py-6 custom-scrollbar"}}>
          {loading ? (
            <UiBox {...{"className":"flex justify-center items-center h-64"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)"},"className":"animate-spin h-8 w-8"}}></UiBox>
            </UiBox>
          ) : (
            <>
              {/* TAB: RESUMEN */}
              {activeTab === 'resumen' && (
                <UiBox {...{"className":"space-y-6"}}>
                  {/* Tarjetas métricas */}
                  <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-3 gap-6"}}>
                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-5"}}>
                      <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
                        <UiText {...{"size":"1","weight":"bold","color":"gray"}}>Total Endeudamiento</UiText>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","color":"var(--red-11)"},"className":"p-1.5"}}>
                          <ArrowUpCircle size={16} />
                        </UiBox>
                      </UiBox>
                      <UiText as="p" {...{"size":"6","weight":"bold","color":"red"}}>${totalPasivos.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</UiText>
                      <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Saldo pendiente acumulado de todas las obligaciones</UiText>
                    </UiCard>

                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-5"}}>
                      <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
                        <UiText {...{"size":"1","weight":"bold","color":"gray"}}>Pago de Cuotas Mensual</UiText>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--green-3)","color":"var(--green-11)"},"className":"p-1.5"}}>
                          <DollarSign size={16} />
                        </UiBox>
                      </UiBox>
                      <UiText as="p" {...{"size":"6","weight":"bold","color":"green"}}>${totalCuotasMes.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</UiText>
                      <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Suma del pago mensual programado de cuotas</UiText>
                    </UiCard>

                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-5"}}>
                      <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
                        <UiText {...{"size":"1","weight":"bold","color":"gray"}}>Total Gastos ERP</UiText>
                        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--pink-3)","color":"var(--pink-11)"},"className":"p-1.5"}}>
                          <History size={16} />
                        </UiBox>
                      </UiBox>
                      <UiText as="p" {...{"size":"6","weight":"bold"}}>${totalExpensesAllTime.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</UiText>
                      <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>Egresos totales registrados en contabilidad general</UiText>
                    </UiCard>
                  </UiBox>

                  {/* Resumen por tipo de pasivo */}
                  <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 gap-6"}}>
                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"}}>
                      <UiHeading as="h3" {...{"size":"1","weight":"bold","className":"mb-4"}}>Composición de Deuda Financiera</UiHeading>
                      <UiBox {...{"className":"space-y-4"}}>
                        <UiBox {...{"className":"flex justify-between items-center"}}>
                          <UiText {...{"weight":"bold","className":"flex items-center gap-2"}}>
                            <Landmark size={14} {...{"style":{"color":"var(--green-11)"}}} /> Préstamos Bancarios
                          </UiText>
                          <UiText {...{"weight":"bold"}}>${prestamos.reduce((s,l) => s + (l.saldoPendiente || 0), 0).toFixed(2)}</UiText>
                        </UiBox>
                        <UiBox {...{"className":"flex justify-between items-center"}}>
                          <UiText {...{"weight":"bold","className":"flex items-center gap-2"}}>
                            <ShoppingBag size={14} {...{"style":{"color":"var(--amber-11)"}}} /> Créditos de Almacén
                          </UiText>
                          <UiText {...{"weight":"bold"}}>${creditosAlmacen.reduce((s,l) => s + (l.saldoPendiente || 0), 0).toFixed(2)}</UiText>
                        </UiBox>
                        <UiBox {...{"className":"flex justify-between items-center"}}>
                          <UiText {...{"weight":"bold","className":"flex items-center gap-2"}}>
                            <CreditCard size={14} {...{"style":{"color":"var(--pink-11)"}}} /> Tarjetas de Crédito
                          </UiText>
                          <UiText {...{"weight":"bold"}}>${tarjetasCredito.reduce((s,l) => s + (l.saldoPendiente || 0), 0).toFixed(2)}</UiText>
                        </UiBox>
                      </UiBox>
                    </UiCard>

                    <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6 flex flex-col justify-between"}}>
                      <UiBox>
                        <UiHeading as="h3" {...{"size":"1","weight":"bold","className":"mb-2"}}>Salud Crediticia del Negocio</UiHeading>
                        <UiText as="p" {...{"size":"1","color":"gray","className":"leading-normal"}}>
                          Llevar un control ordenado de sus deudas le permite evitar mora, planificar flujos de efectivo futuros y deducir los gastos de interés comercial según la normativa ecuatoriana.
                        </UiText>
                      </UiBox>
                      <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"mt-4 pt-4 flex gap-2"}}>
                        <UiButton
                          onClick={() => setActiveTab('pasivos')}
                          {...{"variant":"solid","color":"pink","size":"2"}}
                        >
                          Ver Mis Créditos
                        </UiButton>
                        <UiButton
                          onClick={() => setIsAddModalOpen(true)}
                          {...{"variant":"surface","color":"blue"}}
                        >
                          <Plus size={14} /> Registrar Deuda
                        </UiButton>
                      </UiBox>
                    </UiCard>
                  </UiBox>
                </UiBox>
              )}

              {/* TAB: PASIVOS */}
              {activeTab === 'pasivos' && (
                <UiBox {...{"className":"space-y-6"}}>
                  <UiBox {...{"className":"flex justify-between items-center"}}>
                    <UiHeading as="h3" {...{"size":"1","weight":"bold"}}>Obligaciones Comerciales y Bancarias</UiHeading>
                    <UiButton
                      onClick={() => setIsAddModalOpen(true)}
                      {...{"variant":"solid","color":"pink","size":"2","className":"flex items-center justify-center gap-1.5"}}
                    >
                      <Plus size={14} /> Registrar Nuevo Pasivo
                    </UiButton>
                  </UiBox>

                  <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}}>
                    {liabilities.map(liab => (
                      <UiCard key={liab.id} {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-5 relative flex flex-col justify-between"}}>
                        <UiBox>
                          <UiBox {...{"className":"flex justify-between items-start mb-3"}}>
                            <UiText {...{"className":"p-2.5"}}>
                              {getIcon(liab.type)}
                            </UiText>
                            <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"px-2 py-0.5"}, {}, (liab.saldoPendiente > 0 ? {"color":"red"} : {"color":"green"}))}>
                              {liab.saldoPendiente > 0 ? 'Con saldo' : 'Liquidado'}
                            </UiText>
                          </UiBox>

                          <UiHeading as="h4" {...{"weight":"bold","size":"2","color":"gray","highContrast":true,"className":"mb-0.5"}}>{liab.entity}</UiHeading>
                          <UiText as="p" {...{"size":"1","color":"gray","className":"mb-4"}}>{getTypeName(liab.type)}</UiText>

                          <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"space-y-2 pt-3"}}>
                            <UiBox {...{"className":"flex justify-between"}}>
                              <UiText {...{"color":"gray"}}>Monto Inicial:</UiText>
                              <UiText {...{"weight":"bold"}}>${Number(liab.montoInicial || 0).toFixed(2)}</UiText>
                            </UiBox>
                            <UiBox {...{"className":"flex justify-between"}}>
                              <UiText {...{"color":"gray"}}>Saldo Pendiente:</UiText>
                              <UiText {...{"weight":"bold","color":"red"}}>${Number(liab.saldoPendiente || 0).toFixed(2)}</UiText>
                            </UiBox>
                            <UiBox {...{"className":"flex justify-between"}}>
                              <UiText {...{"color":"gray"}}>Cuota Mensual:</UiText>
                              <UiText {...{"weight":"bold","color":"green"}}>${Number(liab.cuotaMensual || 0).toFixed(2)}</UiText>
                            </UiBox>
                            {liab.nextPaymentDate && (
                              <UiBox {...{"className":"flex justify-between"}}>
                                <UiText {...{"color":"gray"}}>Próximo Pago:</UiText>
                                <UiText {...{"weight":"regular","color":"gray"}}>{liab.nextPaymentDate}</UiText>
                              </UiBox>
                            )}
                          </UiBox>
                        </UiBox>

                        <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex gap-2 mt-5 pt-3"}}>
                          <UiButton
                            onClick={() => {
                              setSelectedLiability(liab);
                              setPaymentAmount(liab.cuotaMensual || '');
                            }}
                            disabled={liab.saldoPendiente <= 0}
                            {...mergeThemeProps({"size":"2","className":"flex-1 text-center"}, {}, (liab.saldoPendiente > 0 ? {"variant":"solid","color":"pink"} : {"variant":"soft","color":"gray","className":"cursor-not-allowed"}))}
                          >
                            Pagar Cuota
                          </UiButton>
                          <UiButton iconOnly
                            onClick={() => handleDeleteLiability(liab.id)}
                            {...{"variant":"solid","color":"red"}}
                            title="Eliminar registro"
                          >
                            <Trash2 size={14} />
                          </UiButton>
                        </UiBox>
                      </UiCard>
                    ))}

                    {liabilities.length === 0 && (
                      <UiBox {...{"style":{"color":"var(--gray-11)"},"className":"col-span-full py-16 text-center italic"}}>
                        No hay deudas o pasivos registrados. ¡Excelente! Tu negocio está libre de deudas financieras directas.
                      </UiBox>
                    )}
                  </UiBox>
                </UiBox>
              )}

              {/* TAB: HISTORIAL GASTOS */}
              {activeTab === 'historial_gastos' && (
                <UiBox {...{"className":"space-y-6"}}>
                  <UiBox {...{"className":"flex justify-between items-center"}}>
                    <UiHeading as="h3" {...{"size":"1","weight":"bold"}}>Historial de Todos los Egresos / Compras</UiHeading>
                    <UiBox {...{}}>
                      <UiText>Total Egresos Acumulado: </UiText>
                      <UiText {...{"color":"red","size":"2","weight":"bold"}}>${totalExpensesAllTime.toFixed(2)}</UiText>
                    </UiBox>
                  </UiBox>

                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"overflow-hidden"}}>
                    <UiBox {...{"className":"overflow-x-auto custom-scrollbar"}}>
                      <UiTable {...{"className":"w-full text-left whitespace-nowrap"}}>
                        <UiTableHeader {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-12)"}}}>
                          <UiTableRow>
                            <UiTableHead {...{"className":"px-6 py-3.5"}}>Fecha</UiTableHead>
                            <UiTableHead {...{"className":"px-6 py-3.5"}}>Descripción / Comprobante</UiTableHead>
                            <UiTableHead {...{"className":"px-6 py-3.5"}}>Proveedor</UiTableHead>
                            <UiTableHead {...{"className":"px-6 py-3.5"}}>Categoría</UiTableHead>
                            <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Subtotal</UiTableHead>
                            <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>IVA</UiTableHead>
                            <UiTableHead {...{"className":"px-6 py-3.5 text-right"}}>Total</UiTableHead>
                            <UiTableHead {...{"className":"px-6 py-3.5 text-center"}}>Método Pago</UiTableHead>
                          </UiTableRow>
                        </UiTableHeader>
                        <UiTableBody {...{}}>
                          {historicalEgresos.map(tx => {
                            const contact = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                            return (
                              <UiTableRow key={tx.id} {...{}}>
                                <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5"}}>{tx.date}</UiTableCell>
                                <UiTableCell {...{"className":"px-6 py-3.5"}}>
                                  <UiBox>
                                    <UiText as="p" {...{"weight":"bold","color":"gray","highContrast":true,"className":"line-clamp-1"}}>{tx.description || 'Sin descripción'}</UiText>
                                    <UiText as="p" {...{"size":"1","color":"gray","weight":"regular","className":"mt-0.5"}}>{tx.documentNumber || `Sec: ${tx.secuencial || 'N/A'}`}</UiText>
                                  </UiBox>
                                </UiTableCell>
                                <UiTableCell {...{"style":{"color":"var(--gray-12)"},"className":"px-6 py-3.5"}}>
                                  {contact?.name || 'Proveedor Externo (S/N)'}
                                </UiTableCell>
                                <UiTableCell {...{"className":"px-6 py-3.5"}}>
                                  <UiText {...{"size":"1","weight":"bold"}}>
                                    {String(tx.category || 'gastos').replace('_', ' ')}
                                  </UiText>
                                </UiTableCell>
                                <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5 text-right"}}>${(Number(tx.baseImponible) || Number(tx.total) || 0).toFixed(2)}</UiTableCell>
                                <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"px-6 py-3.5 text-right"}}>${(Number(tx.ivaValor) || 0).toFixed(2)}</UiTableCell>
                                <UiTableCell {...{"style":{"color":"var(--red-11)"},"className":"px-6 py-3.5 text-right"}}>${Number(tx.total).toFixed(2)}</UiTableCell>
                                <UiTableCell {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-3.5 text-center"}}>{tx.paymentMethod}</UiTableCell>
                              </UiTableRow>
                            );
                          })}

                          {historicalEgresos.length === 0 && (
                            <UiTableRow>
                              <UiTableCell colSpan="8" {...{"style":{"color":"var(--gray-11)"},"className":"px-6 py-8 text-center italic"}}>
                                No hay compras o egresos registrados en el ERP todavía.
                              </UiTableCell>
                            </UiTableRow>
                          )}
                        </UiTableBody>
                      </UiTable>
                    </UiBox>
                  </UiBox>
                </UiBox>
              )}
            </>
          )}
        </UiBox>
      </UiBox>

      {/* MODAL: REGISTRAR PAGO DE CUOTA */}
      {selectedLiability && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in"}}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-md p-6"}}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-4 pb-2"}}>
              <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Registrar Pago de Cuota / Abono</UiHeading>
              <UiButton iconOnly onClick={() => setSelectedLiability(null)} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
            </UiBox>

            <form onSubmit={handleRecordPayment} {...{"className":"space-y-4"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--black-a7)","border":"1px solid var(--gray-a6)"},"className":"p-3.5 space-y-2"}}>
                <UiBox {...{"className":"flex justify-between"}}>
                  <UiText {...{"color":"gray"}}>Entidad:</UiText>
                  <UiText {...{"weight":"bold"}}>{selectedLiability.entity}</UiText>
                </UiBox>
                <UiBox {...{"className":"flex justify-between"}}>
                  <UiText {...{"color":"gray"}}>Cuota Programada:</UiText>
                  <UiText {...{"weight":"bold","color":"green"}}>${Number(selectedLiability.cuotaMensual || 0).toFixed(2)}</UiText>
                </UiBox>
                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-2"}}>
                  <UiText {...{"color":"gray"}}>Saldo Pendiente Actual:</UiText>
                  <UiText {...{"color":"red"}}>${Number(selectedLiability.saldoPendiente || 0).toFixed(2)}</UiText>
                </UiBox>
              </UiBox>

              <UiBox>
                <UiLabel {...{}}>Monto a Pagar ($)</UiLabel>
                <UiInput
                  type="number"
                  step="0.01"
                  required
                  max={Number(selectedLiability.saldoPendiente || 0).toFixed(2)}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  placeholder="0.00"
                />
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                <UiBox>
                  <UiLabel {...{}}>Forma de Pago</UiLabel>
                  <UiSelect
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  >
                    <option value="transferencia" {...{"style":{"color":"var(--gray-12)"}}}>Transferencia</option>
                    <option value="efectivo" {...{"style":{"color":"var(--gray-12)"}}}>Efectivo</option>
                    <option value="tarjeta" {...{"style":{"color":"var(--gray-12)"}}}>Tarjeta de Crédito</option>
                  </UiSelect>
                </UiBox>
                <UiBox>
                  <UiLabel {...{"weight":"regular"}}>Nro de Referencia / Comprobante</UiLabel>
                  <UiInput
                    type="text"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                    placeholder="Ref. Banco o recibo"
                  />
                </UiBox>
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-2.5 pt-3"}}>
                <UiButton
                  type="button"
                  onClick={() => setSelectedLiability(null)}
                  {...{"variant":"surface","color":"blue"}}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="submit"
                  {...{"size":"2","variant":"solid","color":"pink","className":"flex items-center justify-center gap-1.5"}}
                >
                  Confirmar Pago
                </UiButton>
              </UiBox>
            </form>
          </UiCard>
        </UiBox>
      )}

      {/* MODAL: AGREGAR PASIVO */}
      {isAddModalOpen && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in"}}>
          <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"w-full max-w-md p-6"}}>
            <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex justify-between items-center mb-4 pb-2"}}>
              <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Registrar Nuevo Pasivo</UiHeading>
              <UiButton iconOnly onClick={() => setIsAddModalOpen(false)} {...{"variant":"surface","color":"gray"}}><X size={16} /></UiButton>
            </UiBox>

            <form onSubmit={handleAddLiability} {...{"className":"space-y-4"}}>
              <UiBox>
                <UiLabel {...{}}>Tipo de Obligación</UiLabel>
                <UiSelect
                  value={newLiability.type}
                  onChange={e => setNewLiability({ ...newLiability, type: e.target.value })}
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                >
                  <option value="prestamo" {...{"style":{"color":"var(--gray-12)"}}}>Préstamo Bancario</option>
                  <option value="credito_almacen" {...{"style":{"color":"var(--gray-12)"}}}>Crédito de Almacén (Locales comerciales)</option>
                  <option value="tarjeta_credito" {...{"style":{"color":"var(--gray-12)"}}}>Tarjeta de Crédito Corporativa</option>
                </UiSelect>
              </UiBox>

              <UiBox>
                <UiLabel {...{}}>Entidad / Acreedor</UiLabel>
                <UiInput
                  type="text"
                  required
                  value={newLiability.entity}
                  onChange={e => setNewLiability({ ...newLiability, entity: e.target.value })}
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                  placeholder="Ej. Banco Guayaquil, De Prati, Visa Produbanco"
                />
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                <UiBox>
                  <UiLabel {...{}}>Monto Inicial / Línea</UiLabel>
                  <UiInput
                    type="number"
                    step="0.01"
                    required
                    value={newLiability.montoInicial}
                    onChange={e => setNewLiability({ ...newLiability, montoInicial: e.target.value, saldoPendiente: e.target.value })}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                    placeholder="0.00"
                  />
                </UiBox>
                <UiBox>
                  <UiLabel {...{}}>Cuota Mensual Est.</UiLabel>
                  <UiInput
                    type="number"
                    step="0.01"
                    value={newLiability.cuotaMensual}
                    onChange={e => setNewLiability({ ...newLiability, cuotaMensual: e.target.value })}
                    {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                    placeholder="0.00"
                  />
                </UiBox>
              </UiBox>

              {newLiability.type === 'prestamo' && (
                <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                  <UiBox>
                    <UiLabel {...{}}>Tasa Interés Anual (%)</UiLabel>
                    <UiInput
                      type="number"
                      step="0.01"
                      value={newLiability.tasaInteres}
                      onChange={e => setNewLiability({ ...newLiability, tasaInteres: e.target.value })}
                      {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      placeholder="Ej. 10.5"
                    />
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{"weight":"regular"}}>Plazo (Meses)</UiLabel>
                    <UiInput
                      type="number"
                      value={newLiability.plazoMeses}
                      onChange={e => setNewLiability({ ...newLiability, plazoMeses: e.target.value })}
                      {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      placeholder="Ej. 24"
                    />
                  </UiBox>
                </UiBox>
              )}

              {newLiability.type === 'tarjeta_credito' && (
                <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
                  <UiBox>
                    <UiLabel {...{"weight":"regular"}}>Día de Corte</UiLabel>
                    <UiInput
                      type="text"
                      value={newLiability.fechaCorte}
                      onChange={e => setNewLiability({ ...newLiability, fechaCorte: e.target.value })}
                      {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      placeholder="Ej. 15"
                    />
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{"weight":"regular"}}>Día de Pago</UiLabel>
                    <UiInput
                      type="text"
                      value={newLiability.fechaPago}
                      onChange={e => setNewLiability({ ...newLiability, fechaPago: e.target.value })}
                      {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                      placeholder="Ej. 05"
                    />
                  </UiBox>
                </UiBox>
              )}

              <UiBox>
                <UiLabel {...{}}>Próxima Fecha de Pago</UiLabel>
                <UiInput
                  type="date"
                  value={newLiability.nextPaymentDate}
                  onChange={e => setNewLiability({ ...newLiability, nextPaymentDate: e.target.value })}
                  {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
                />
              </UiBox>

              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-end gap-2.5 pt-3"}}>
                <UiButton
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  {...{"variant":"surface","color":"blue"}}
                >
                  Cancelar
                </UiButton>
                <UiButton
                  type="submit"
                  {...{"size":"2","variant":"solid","color":"pink","className":"flex items-center justify-center gap-1.5"}}
                >
                  Registrar Deuda
                </UiButton>
              </UiBox>
            </form>
          </UiCard>
        </UiBox>
      )}

    </UiBox>
  );
}
