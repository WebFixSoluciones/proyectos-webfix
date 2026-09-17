import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiHeading, UiCard } from '../ui/layout';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, ShieldAlert, Award, FileText, CheckCircle2 } from 'lucide-react';
import { doc, getDoc } from '../../services/financeStore.js';

export default function FinanceDashboard({ transactions, thirdParties, db, appId }) {
  const [settings, setSettings] = useState(null);
  
  useEffect(() => {
    if (!appId || !db) return;
    async function loadSettings() {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings(snap.data());
        }
      } catch (e) {
        console.error("Error cargando settings en Dashboard", e);
      }
    }
    loadSettings();
  }, [appId, db]);

  // Filtros de fecha
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthTx = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Totales e IVA de ingresos y egresos
  const totalIncome = currentMonthTx.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  const totalExpense = currentMonthTx.filter(t => t.type === 'egreso').reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  const netMargin = totalIncome - totalExpense;

  const ivaVentas = currentMonthTx.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + (Number(t.ivaValor) || 0), 0);
  const ivaCompras = currentMonthTx.filter(t => t.type === 'egreso').reduce((acc, t) => acc + (Number(t.ivaValor) || 0), 0);
  const ivaEstimado = ivaVentas - ivaCompras;

  // Estados SRI globales
  const statusCounts = transactions.reduce((acc, t) => {
    const status = t.sriStatus || 'borrador';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pendingPayments = transactions.filter(t => t.paymentStatus === 'pendiente');
  // eslint-disable-next-line no-unused-vars
  const missingFiles = transactions.filter(t => !t.xmlUrl || !t.pdfUrl);

  // Calcular días restantes de firma digital
  let certDaysLeft = null;
  let certStatus = 'none'; // 'none', 'ok', 'warning', 'expired'
  if (settings && settings.certificadoCargado && settings.certificadoVence) {
    const diffTime = new Date(settings.certificadoVence) - new Date();
    certDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (certDaysLeft < 0) certStatus = 'expired';
    else if (certDaysLeft <= 30) certStatus = 'warning';
    else certStatus = 'ok';
  }

  

  return (
    <UiBox {...{"className":"space-y-6 animate-in slide-in-from-bottom-4 duration-500"}}>
      
      {/* SECCION ALERTA FIRMA ELECTRONICA */}
      {certStatus !== 'ok' && (
        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4 flex items-center justify-between gap-4"}, {}, (certStatus === 'expired' ? {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}} : (certStatus === 'warning' ? {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}} : {"style":{"backgroundColor":"var(--blue-3)","color":"var(--gray-12)"}})))}>
          <UiBox {...{"className":"flex items-center gap-3"}}>
            <ShieldAlert size={20} {...{"style":{"color":"var(--blue-12)"}}} />
            <UiBox>
              <UiText as="p" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>
                {certStatus === 'expired' && "Firma Electrónica Expirada"}
                {certStatus === 'warning' && `La Firma Electrónica expira pronto (en ${certDaysLeft} días)`}
                {certStatus === 'none' && "Falta cargar Firma Electrónica (.p12) en Configuración"}
              </UiText>
              <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"opacity-90"}}>
                {certStatus === 'none'
                  ? "Para poder emitir XML autorizados por el SRI, sube tu certificado digital en la pestaña de Configuración."
                  : "Por favor renueva o verifica tu certificado de firma para evitar rechazos en las facturas."}
              </UiText>
            </UiBox>
          </UiBox>
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"px-3 py-1 shrink-0"}}>
            {certStatus === 'none' ? 'Incompleto' : certStatus === 'expired' ? 'Expirado' : 'Urgente'}
          </UiBox>
        </UiBox>
      )}

      {/* METRICAS PRINCIPALES */}
      <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-4 gap-4"}}>
        
        {/* INGRESOS */}
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"p-4 sm:p-6"}}>
          <UiBox {...{"className":"flex items-center justify-between mb-3"}}>
            <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Ventas (Mes)</UiText>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--green-3)","color":"var(--green-12)"},"className":"p-1.5"}}>
              <TrendingUp size={16} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold","color":"green"}}>${totalIncome.toFixed(2)}</UiText>
          <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-1"}}>IVA Cobrado: ${ivaVentas.toFixed(2)}</UiText>
        </UiBox>

        {/* EGRESOS */}
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"p-4 sm:p-6"}}>
          <UiBox {...{"className":"flex items-center justify-between mb-3"}}>
            <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Gastos (Mes)</UiText>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","color":"var(--red-12)"},"className":"p-1.5"}}>
              <TrendingDown size={16} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold","color":"red"}}>${totalExpense.toFixed(2)}</UiText>
          <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-1"}}>IVA Pagado: ${ivaCompras.toFixed(2)}</UiText>
        </UiBox>

        {/* MARGEN */}
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"p-4 sm:p-6"}}>
          <UiBox {...{"className":"flex items-center justify-between mb-3"}}>
            <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Flujo Neto</UiText>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)"},"className":"p-1.5"}}>
              <DollarSign size={16} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...mergeThemeProps({"size":"6","weight":"bold"}, {}, (netMargin >= 0 ? {"color":"gray","highContrast":true} : {"color":"red"}))}>
            ${netMargin.toFixed(2)}
          </UiText>
          <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-1"}}>Rendimiento mensual</UiText>
        </UiBox>

        {/* BALANCE IVA */}
        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"p-4 sm:p-6"}}>
          <UiBox {...{"className":"flex items-center justify-between mb-3"}}>
            <UiText {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>IVA por Declarar</UiText>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--purple-3)","color":"var(--purple-12)"},"className":"p-1.5"}}>
              <Award size={16} />
            </UiBox>
          </UiBox>
          <UiText as="p" {...mergeThemeProps({"size":"6","weight":"bold"}, {}, (ivaEstimado >= 0 ? {"color":"purple"} : {"color":"blue"}))}>
            ${Math.abs(ivaEstimado).toFixed(2)}
          </UiText>
          <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-1"}}>
            {ivaEstimado >= 0 ? "A pagar al SRI" : "Saldo a favor (Crédito)"}
          </UiText>
        </UiBox>

      </UiBox>

      {/* DETALLES DE CUMPLIMIENTO TRIBUTARIO */}
      <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6"}}>
        
        {/* ESTADOS SRI */}
        <UiBox {...mergeThemeProps({}, {"className":"md:col-span-1"}, {"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"p-4 sm:p-6"})}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-5 pb-3"}}>
            <FileText size={16} {...{"style":{"color":"var(--blue-12)"}}} />
            <UiHeading as="h3" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Estados de Emisión SRI</UiHeading>
          </UiBox>
          
          <UiBox {...{"className":"space-y-3.5"}}>
            {[
              {key: 'autorizado', label: 'Autorizados / Registrados', color: {"style":{"backgroundColor":"var(--green-9)"}} },
              { key: 'pendiente', label: 'Pendientes', color: {"style":{"backgroundColor":"var(--amber-9)"}} },
              { key: 'rechazado', label: 'Rechazados', color: {"style":{"backgroundColor":"var(--red-9)"}} },
              { key: 'anulado', label: 'Anulados', color: {"style":{"backgroundColor":"var(--gray-3)"}} }
            ].map(item => {
              const count = statusCounts[item.key] || 0;
              const pct = transactions.length > 0 ? (count / transactions.length) * 100 : 0;
              return (
                <UiBox key={item.key}>
                  <UiBox {...{"style":{"color":"var(--gray-12)"},"className":"flex justify-between items-center mb-1"}}>
                    <UiText>{item.label}</UiText>
                    <UiText>{count} ({pct.toFixed(0)}%)</UiText>
                  </UiBox>
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)"},"className":"w-full h-1.5 overflow-hidden"}}>
                    <UiBox {...mergeThemeProps({"className":"h-full"}, {}, resolveThemeProps(item.color))} style={{ width: `${pct}%` }}></UiBox>
                  </UiBox>
                </UiBox>
              );
            })}
          </UiBox>
        </UiBox>

        {/* CUENTAS Y PAGOS */}
        <UiBox {...mergeThemeProps({}, {"className":"md:col-span-2"}, {"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"p-4 sm:p-6"})}>
          <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center gap-2 mb-5 pb-3"}}>
            <Clock size={16} {...{"style":{"color":"var(--amber-11)"}}} />
            <UiHeading as="h3" {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Comprobantes por Cobrar / Pagar</UiHeading>
          </UiBox>

          {pendingPayments.length > 0 ? (
            <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar"}}>
              {pendingPayments.map(tx => {
                const thirdParty = thirdParties.find(tp => tp.id === tx.thirdPartyId);
                return (
                  <UiCard key={tx.id} {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-3 flex justify-between items-center"}}>
                    <UiBox {...{"className":"truncate pr-2"}}>
                      <UiText as="p" {...{"size":"1","weight":"bold","color":"gray","highContrast":true,"className":"truncate"}}>{thirdParty?.name || 'Desconocido'}</UiText>
                      <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"className":"mt-0.5"}}>{tx.documentNumber || 'Factura S/N'} - {tx.date}</UiText>
                    </UiBox>
                    <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"shrink-0"}, {}, (tx.type === 'ingreso' ? {"color":"green"} : {"color":"red"}))}>
                      ${Number(tx.total || 0).toFixed(2)}
                    </UiText>
                  </UiCard>
                );
              })}
            </UiBox>
          ) : (
            <UiBox {...{"className":"flex flex-col items-center justify-center py-10"}}>
              <CheckCircle2 size={32} {...{"style":{"color":"var(--green-11)"},"className":"opacity-60 mb-2"}} />
              <UiText as="p" {...{"size":"1","color":"gray","highContrast":true,"weight":"medium","className":"italic"}}>No hay cobros ni pagos pendientes.</UiText>
            </UiBox>
          )}
        </UiBox>

      </UiBox>

    </UiBox>
  );
}
