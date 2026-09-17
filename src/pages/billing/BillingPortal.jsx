import { mergeThemeProps } from '../../components/ui/themeProps';
import { UiBox, UiHeading, UiText, UiCard, UiLabel } from '../../components/ui/layout';
import { UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiButton, UiSelect, UiInput } from '../../components/ui/controls';
import { useState, useEffect } from 'react';

import {
  Building,
  Check,
  RefreshCw
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const PRODUCTS_CATALOG = {
  facturacion: {
    title: 'Facturación Electrónica',
    desc: 'Sistema de facturación automatizado y autorizado por el SRI.',
    plans: [
      {
        id: 'sri_basico',
        name: 'Plan Básico SRI',
        priceMonthly: 9,
        priceYearly: 7,
        features: ['Hasta 50 facturas/mes', '1 Usuario', 'Firma electrónica compatible', 'Soporte vía email']
      },
      {
        id: 'sri_pyme',
        name: 'Plan Pyme SRI',
        priceMonthly: 19,
        priceYearly: 15,
        features: ['Facturación Ilimitada', '3 Usuarios', 'Inventario básico', 'Soporte prioritario']
      },
      {
        id: 'sri_enterprise',
        name: 'Plan Enterprise SRI',
        priceMonthly: 39,
        priceYearly: 31,
        features: ['Facturación Ilimitada', 'Usuarios Ilimitados', 'Sucursales y Bodegas', 'Soporte 24/7 y Capacitación']
      }
    ]
  },
  paginas: {
    title: 'Sitios y Páginas Web',
    desc: 'Presencia web profesional con hosting premium y SEO optimizado.',
    plans: [
      {
        id: 'web_landing',
        name: 'Landing Page',
        priceMonthly: 15,
        priceYearly: 12,
        features: ['1 Sección de Aterrizaje', 'Hosting incluido', 'Certificado SSL Gratis', 'Formulario de contacto']
      },
      {
        id: 'web_pro',
        name: 'Sitio Web Pro',
        priceMonthly: 35,
        priceYearly: 28,
        features: ['Hasta 5 páginas internas', 'Panel administrable', 'Blog de noticias', 'Diseño responsivo premium']
      },
      {
        id: 'web_ecommerce',
        name: 'Tienda Online',
        priceMonthly: 75,
        priceYearly: 60,
        features: ['Productos ilimitados', 'Carrito de compras', 'Pasarela de pagos integrada', 'Control de pedidos']
      }
    ]
  },
  correos: {
    title: 'Correos Corporativos',
    desc: 'Comunicación profesional con el dominio de tu empresa.',
    plans: [
      {
        id: 'mail_pro',
        name: 'Plan Mail Pro',
        priceMonthly: 5,
        priceYearly: 4,
        features: ['10 GB de almacenamiento', 'Filtro Antispam premium', 'Webmail WebFix', 'Compatible con Outlook/Mobile']
      },
      {
        id: 'mail_business',
        name: 'Plan Mail Business',
        priceMonthly: 12,
        priceYearly: 10,
        features: ['30 GB de almacenamiento', 'Videollamadas grupales', '100 GB en nube compartida', 'Calendario corporativo']
      },
      {
        id: 'mail_enterprise',
        name: 'Plan Mail Enterprise',
        priceMonthly: 25,
        priceYearly: 20,
        features: ['100 GB de almacenamiento', 'Archivado inteligente de correos', 'Seguridad reforzada', 'Soporte telefónico 24/7']
      }
    ]
  },
  whatsapp: {
    title: 'WhatsApp CRM',
    desc: 'Multiagente y automatización de chats de WhatsApp.',
    plans: [
      {
        id: 'crm_inbox',
        name: 'Plan CRM Inbox',
        priceMonthly: 20,
        priceYearly: 16,
        features: ['1 Línea Conectada', 'Bandeja compartida', 'Hasta 2 agentes', 'Respuestas rápidas']
      },
      {
        id: 'crm_automation',
        name: 'Plan CRM Automation',
        priceMonthly: 45,
        priceYearly: 36,
        features: ['Línea oficial certificada', 'Chatbots interactivos', 'Hasta 5 agentes', 'Asignación automática de chats']
      },
      {
        id: 'crm_enterprise',
        name: 'Plan CRM Enterprise',
        priceMonthly: 95,
        priceYearly: 76,
        features: ['Campañas oficiales masivas', 'Integración con APIs externas', 'Agentes Ilimitados', 'Reportes de desempeño']
      }
    ]
  }
};

export default function BillingPortal({ showToast, initialSubTab }) {
  const { tenantInfo, planId, planStatus, tenantId } = useAuth();
  const [activePlan, setActivePlan] = useState('starter');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  
  const [activeCategory, setActiveCategory] = useState('facturacion');
  const [selectedPlanId, setSelectedPlanId] = useState('sri_basico');
  
  // Payment methods
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'transfer'
  
  // Transfer Form
  const [transferData, setTransferData] = useState({
    bankName: 'Banco Pichincha',
    referenceNumber: '',
    amount: '',
    transferDate: new Date().toISOString().split('T')[0],
    receiptUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500' // Mock receipt URL
  });
  
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayPhoneSim, setShowPayPhoneSim] = useState(false);

  // Sync initialSubTab from props
  if (initialSubTab) {
    if (initialSubTab === 'historial' && activeCategory !== 'historial') {
      setActiveCategory('historial');
    } else if (PRODUCTS_CATALOG[initialSubTab] && activeCategory !== initialSubTab) {
      setActiveCategory(initialSubTab);
      setSelectedPlanId(PRODUCTS_CATALOG[initialSubTab].plans[0].id);
    }
  }

  // Sync planId from props
  if (planId && planId !== activePlan) {
    setActivePlan(planId);
  }

  // Sync billingPeriod from tenantInfo
  if (tenantInfo?.billingPeriod && tenantInfo.billingPeriod !== billingPeriod) {
    setBillingPeriod(tenantInfo.billingPeriod);
  }

  // Load billing history (transfers)
  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, 'transfers'), where('tenantId', '==', tenantId));
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setHistory(list);
    }, (error) => {
      console.warn("Billing transfers subscription blocked by security rules:", error);
    });
    return () => unsub();
  }, [tenantId]);

  const getSelectedPlanConfig = () => {
    if (activeCategory === 'historial') return null;
    const cat = PRODUCTS_CATALOG[activeCategory] || PRODUCTS_CATALOG.facturacion;
    return cat.plans.find(p => p.id === selectedPlanId) || cat.plans[0];
  };

  const getPrice = (plan) => {
    if (!plan) return 0;
    return billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  };

  const handlePayPhoneCheckout = () => {
    setShowPayPhoneSim(true);
  };

  const completePayPhoneSim = async () => {
    setIsProcessing(true);
    try {
      const planConfig = getSelectedPlanConfig();
      if (!planConfig) return;
      const amount = billingPeriod === 'monthly' ? planConfig.priceMonthly : planConfig.priceYearly * 12;

      // 1. Extend Tenant Subscription in Firestore
      const newExpiresAt = new Date();
      newExpiresAt.setMonth(newExpiresAt.getMonth() + (billingPeriod === 'yearly' ? 12 : 1));

      await updateDoc(doc(db, 'tenants', tenantId), {
        planId: planConfig.id,
        planStatus: 'active',
        billingPeriod: billingPeriod,
        expiresAt: newExpiresAt.toISOString()
      });

      // 2. Log transaction in transfers
      const transferId = `pay_${new Date().getTime()}`;
      await setDoc(doc(db, 'transfers', transferId), {
        id: transferId,
        tenantId,
        companyName: tenantInfo?.companyName || 'Mi Empresa',
        planId: planConfig.id,
        billingPeriod,
        amount,
        referenceNumber: `PP-${new Date().getTime().toString().substring(6)}`,
        status: 'approved',
        bankName: 'PayPhone (Tarjeta)',
        transferDate: new Date().toISOString(),
        approvedAt: new Date().toISOString()
      });

      showToast("¡Pago procesado con éxito! Suscripción activada.", "success");
      setShowPayPhoneSim(false);
      setActivePlan(planConfig.id);
    } catch (err) {
      showToast("Fallo al actualizar suscripción: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!transferData.referenceNumber || !transferData.amount) {
      showToast("Por favor completa los campos del comprobante", "warning");
      return;
    }
    
    setIsProcessing(true);
    try {
      const planConfig = getSelectedPlanConfig();
      if (!planConfig) return;
      const transferId = `trsf_${new Date().getTime()}`;
      await setDoc(doc(db, 'transfers', transferId), {
        id: transferId,
        tenantId,
        companyName: tenantInfo?.companyName || 'Mi Empresa',
        planId: planConfig.id,
        billingPeriod,
        amount: Number(transferData.amount),
        referenceNumber: transferData.referenceNumber,
        status: 'pending',
        bankName: transferData.bankName,
        transferDate: transferData.transferDate,
        receiptUrl: transferData.receiptUrl,
        createdAt: new Date().toISOString()
      });

      // Update tenant status to pending_approval
      await updateDoc(doc(db, 'tenants', tenantId), {
        planStatus: 'pending_approval'
      });

      showToast("Comprobante enviado. Su plan se activará en cuanto confirmemos el depósito.", "info");
      setTransferData({
        bankName: 'Banco Pichincha',
        referenceNumber: '',
        amount: '',
        transferDate: new Date().toISOString().split('T')[0],
        receiptUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500'
      });
    } catch (err) {
      showToast("Error al registrar reporte: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysRemaining = () => {
    if (!tenantInfo?.expiresAt) return 0;
    const diff = new Date(tenantInfo.expiresAt) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <UiBox {...mergeThemeProps({"style":{"color":"var(--gray-12)"},"className":"p-6 max-w-5xl mx-auto space-y-8 text-left"})}>
      
      {/* Header Info */}
      <UiBox {...{"className":"flex flex-col sm:flex-row sm:items-center justify-between gap-4"}}>
        <UiBox>
          <UiHeading as="h2" {...{"size":"5","weight":"bold"}}>Suscripción y Facturación</UiHeading>
          <UiText as="p" {...{"size":"1","color":"gray","weight":"medium"}}>Administra los módulos de tu negocio y realiza tus pagos.</UiText>
        </UiBox>
        <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4 flex items-center gap-3"})}>
          <UiBox {...{"style":{"backgroundColor":"var(--blue-3)","borderRadius":"var(--radius-3)","color":"var(--blue-12)"},"className":"p-2"}}>
            <Building size={18} />
          </UiBox>
          <UiBox>
            <UiBox {...{"style":{"color":"var(--gray-11)"}}}>Plan Actual</UiBox>
            <UiBox {...{}}>{activePlan} — {planStatus === 'trial' ? `Prueba (${getDaysRemaining()} días)` : 'Suscripción Activa'}</UiBox>
          </UiBox>
        </UiCard>
      </UiBox>

      {/* Grid: Plan Selector & Payment Form */}
      {activeCategory === 'historial' ? (
        <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"})}>
          <UiHeading as="h3" {...{"size":"1","weight":"bold","className":"mb-4"}}>Historial de Transacciones</UiHeading>
          <UiBox {...{"className":"overflow-x-auto"}}>
            <UiTable {...{"className":"w-full text-left"}}>
              <UiTableHeader>
                <UiTableRow {...{"style":{"color":"var(--gray-11)"}}}>
                  <UiTableHead {...{"className":"py-2"}}>Fecha</UiTableHead>
                  <UiTableHead {...{"className":"py-2"}}>Referencia</UiTableHead>
                  <UiTableHead {...{"className":"py-2"}}>Monto</UiTableHead>
                  <UiTableHead {...{"className":"py-2"}}>Estado</UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody {...{}}>
                {history.length === 0 ? (
                  <UiTableRow>
                    <UiTableCell colSpan="4" {...{"style":{"color":"var(--gray-11)"},"className":"py-4 text-center"}}>No se registran transacciones previas.</UiTableCell>
                  </UiTableRow>
                ) : (
                  history.map((tx) => (
                    <UiTableRow key={tx.id}>
                      <UiTableCell {...{"className":"py-3.5"}}>{new Date(tx.transferDate).toLocaleDateString('es-EC')}</UiTableCell>
                      <UiTableCell {...{"style":{"fontFamily":"var(--code-font-family)"},"className":"py-3.5"}}>{tx.referenceNumber}</UiTableCell>
                      <UiTableCell {...{"style":{"color":"var(--green-11)"},"className":"py-3.5"}}>${tx.amount}</UiTableCell>
                      <UiTableCell {...{"className":"py-3.5"}}>
                        <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"px-2 py-0.5"}, {}, (tx.status === 'approved' ? {"color":"green"} : (tx.status === 'pending' ? {"color":"orange","className":"animate-pulse"} : {"color":"red"})))}>
                          {tx.status === 'approved' ? 'Aprobado' :
                           tx.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                        </UiText>
                      </UiTableCell>
                    </UiTableRow>
                  ))
                )}
              </UiTableBody>
            </UiTable>
          </UiBox>
        </UiCard>
      ) : (
        <UiBox {...{"className":"grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"}}>
          
          {/* Left Col: Plan Selector */}
          <UiBox {...{"className":"lg:col-span-2 space-y-6"}}>
            <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"})}>
              <UiBox {...{"className":"flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"}}>
                <UiBox>
                  <UiHeading as="h3" {...{"size":"1","weight":"bold","color":"blue"}}>
                    {PRODUCTS_CATALOG[activeCategory]?.title}
                  </UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray","weight":"medium","className":"mt-0.5"}}>
                    {PRODUCTS_CATALOG[activeCategory]?.desc}
                  </UiText>
                </UiBox>
                
                {/* Billing Cycle Toggle */}
                <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","borderRadius":"var(--radius-3)"},"className":"flex p-1 self-start sm:self-center"}}>
                  <UiButton
                    onClick={() => setBillingPeriod('monthly')}
                    {...mergeThemeProps({}, {}, (billingPeriod === 'monthly' ? {"variant":"surface","color":"blue"} : {"color":"gray"}))}
                  >
                    Mensual
                  </UiButton>
                  <UiButton
                    onClick={() => setBillingPeriod('yearly')}
                    {...mergeThemeProps({}, {}, (billingPeriod === 'yearly' ? {"variant":"surface","color":"blue"} : {"color":"gray"}))}
                  >
                    Anual
                  </UiButton>
                </UiBox>
              </UiBox>

              <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-3 gap-4"}}>
                {(PRODUCTS_CATALOG[activeCategory]?.plans || []).map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <UiBox 
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-5 cursor-pointer flex flex-col justify-between"}, {}, (isSelected ? {"style":{"backgroundColor":"var(--blue-3)"}} : {"style":{"backgroundColor":"var(--gray-2)"}}))}
                    >
                      <UiBox>
                        <UiBox {...{"className":"mb-1"}}>{plan.name}</UiBox>
                        <UiBox {...{"className":"flex items-baseline gap-0.5 mb-4"}}>
                          <UiText {...{"size":"4","weight":"bold"}}>$</UiText>
                          <UiText {...{"size":"6","weight":"bold"}}>{getPrice(plan)}</UiText>
                          <UiText {...{"size":"1","color":"gray"}}>/mes</UiText>
                        </UiBox>
                        <ul {...{"style":{"color":"var(--gray-11)"},"className":"space-y-2"}}>
                          {plan.features.map((feat, idx) => (
                            <li key={idx} {...{"className":"flex items-start gap-1.5 leading-normal"}}>
                              <Check size={10} {...{"style":{"color":"var(--green-11)"},"className":"shrink-0 mt-0.5"}} />
                              <UiText>{feat}</UiText>
                            </li>
                          ))}
                        </ul>
                      </UiBox>
                    </UiBox>
                  );
                })}
              </UiBox>
            </UiCard>
          </UiBox>

          {/* Right Col: Checkout & Payment details */}
          <UiBox {...{"className":"space-y-6"}}>
            <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"})}>
              <UiHeading as="h3" {...{"size":"1","weight":"bold","className":"mb-4"}}>Resumen del Pago</UiHeading>
              
              <UiBox {...{"className":"space-y-3.5 mb-6"}}>
                <UiBox {...{"className":"flex justify-between"}}>
                  <UiText>Plan Seleccionado:</UiText>
                  <strong {...{}}>
                    {getSelectedPlanConfig()?.name || ''}
                  </strong>
                </UiBox>
                <UiBox {...{"className":"flex justify-between"}}>
                  <UiText>Ciclo de Cobro:</UiText>
                  <strong {...{}}>{billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}</strong>
                </UiBox>
                <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-3"}}>
                  <UiText>Total a Pagar:</UiText>
                  <UiText {...{"color":"blue"}}>
                    ${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())}
                  </UiText>
                </UiBox>
              </UiBox>

              {/* Payment Method Selector */}
              <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","borderRadius":"var(--radius-3)"},"className":"grid grid-cols-2 gap-2 p-1 mb-6"}}>
                <UiButton
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  {...mergeThemeProps({}, {}, (paymentMethod === 'card' ? {"variant":"surface","color":"blue"} : {"color":"gray"}))}
                >
                  Tarjeta (PayPhone)
                </UiButton>
                <UiButton
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  {...mergeThemeProps({}, {}, (paymentMethod === 'transfer' ? {"variant":"surface","color":"blue"} : {"color":"gray"}))}
                >
                  Transferencia
                </UiButton>
              </UiBox>

              {/* CARD PAYMENT: PAYPHONE BUTTON */}
              {paymentMethod === 'card' && (
                <UiBox {...{"className":"space-y-4"}}>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"leading-normal"}}>Los pagos con tarjeta se acreditan de manera automática. Aceptamos Visa, MasterCard y todas las tarjetas nacionales.</UiText>
                  <UiButton
                    onClick={handlePayPhoneCheckout}
                    disabled={isProcessing}
                    {...{"size":"2","variant":"solid","color":"amber","className":"w-full flex items-center justify-center gap-2 active:scale-98"}}
                  >
                    Pagar con PayPhone
                  </UiButton>
                </UiBox>
              )}

              {/* BANK TRANSFER: UPLOAD FORM */}
              {paymentMethod === 'transfer' && (
                <form onSubmit={handleSubmitTransfer} {...{"className":"space-y-4 text-left"}}>
                  <UiBox {...{"style":{"backgroundColor":"var(--blue-3)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","color":"var(--gray-11)"},"className":"p-3 leading-relaxed mb-4"}}>
                    <strong>Cuentas Bancarias WebFix:</strong><br />
                    Banco Pichincha - Cta. Corriente: 2201928472<br />
                    A nombre de WebFix Soluciones S.A.S (RUC: 1792847382001)
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{"weight":"bold","className":"block mb-1"}}>Banco emisor</UiLabel>
                    <UiSelect
                      value={transferData.bankName} 
                      onChange={e => setTransferData({ ...transferData, bankName: e.target.value })}
                      {...mergeThemeProps({"className":"w-full"})}
                    >
                      <option value="Banco Pichincha">Banco Pichincha</option>
                      <option value="Banco Guayaquil">Banco Guayaquil</option>
                      <option value="Banco del Pacífico">Banco del Pacífico</option>
                      <option value="Produbanco">Produbanco</option>
                    </UiSelect>
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{"weight":"bold","className":"block mb-1"}}>Número de Referencia / Comprobante</UiLabel>
                    <UiInput
                      type="text" 
                      value={transferData.referenceNumber}
                      onChange={e => setTransferData({ ...transferData, referenceNumber: e.target.value })}
                      placeholder="Referencia de 6-8 dígitos"
                      {...mergeThemeProps({"className":"w-full"})}
                      required
                    />
                  </UiBox>
                  <UiBox>
                    <UiLabel {...{"weight":"bold","className":"block mb-1"}}>Monto Depositado ($ USD)</UiLabel>
                    <UiInput
                      type="number" 
                      value={transferData.amount}
                      onChange={e => setTransferData({ ...transferData, amount: e.target.value })}
                      placeholder={`Total: $${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())}`}
                      {...mergeThemeProps({"className":"w-full"})}
                      required
                    />
                  </UiBox>
                  
                  <UiButton
                    type="submit"
                    disabled={isProcessing}
                    {...{"size":"2","variant":"solid","color":"blue","className":"w-full active:scale-98"}}
                  >
                    {isProcessing ? "Registrando..." : "Reportar Transferencia"}
                  </UiButton>
                </form>
              )}

            </UiCard>
          </UiBox>

        </UiBox>
      )}

      {/* PAYPHONE SIMULATION MODAL */}
      {showPayPhoneSim && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-50 flex items-center justify-center p-4"}}>
          <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full max-w-sm p-6 relative text-center"})}>
            <UiBox {...{"className":"flex justify-between items-center mb-6"}}>
              <UiText {...{"size":"1","weight":"bold","color":"amber"}}>Pasarela PayPhone (Sandbox)</UiText>
              <UiButton onClick={() => setShowPayPhoneSim(false)} {...{"color":"gray"}}>✕</UiButton>
            </UiBox>
            
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)"},"className":"p-4 mb-6 text-left space-y-2"}}>
              <UiBox {...{"className":"flex justify-between"}}>
                <UiText>Empresa receptora:</UiText>
                <strong>WebFix Soluciones S.A.S</strong>
              </UiBox>
              <UiBox {...{"className":"flex justify-between"}}>
                <UiText>Plan solicitado:</UiText>
                <strong {...{}}>{getSelectedPlanConfig()?.name || ''}</strong>
              </UiBox>
              <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex justify-between pt-2"}}>
                <UiText>Total a Cobrar:</UiText>
                <strong {...{"style":{"color":"var(--green-11)"}}}>
                  ${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())}
                </strong>
              </UiBox>
            </UiBox>

            <form onSubmit={(e) => { e.preventDefault(); completePayPhoneSim(); }} {...{"className":"space-y-4 text-left"}}>
              <UiBox>
                <UiLabel {...{"weight":"bold","className":"block mb-1"}}>Número de tarjeta</UiLabel>
                <UiInput type="text" placeholder="4000 1234 5678 9010" {...mergeThemeProps({"className":"w-full"})} required />
              </UiBox>
              <UiBox {...{"className":"grid grid-cols-2 gap-4"}}>
                <UiBox>
                  <UiLabel {...{"weight":"bold","className":"block mb-1"}}>Expiración</UiLabel>
                  <UiInput type="text" placeholder="MM/AA" {...mergeThemeProps({"className":"w-full"})} required />
                </UiBox>
                <UiBox>
                  <UiLabel {...{"weight":"bold","className":"block mb-1"}}>CVV</UiLabel>
                  <UiInput type="password" placeholder="•••" maxLength={3} {...mergeThemeProps({"className":"w-full"})} required />
                </UiBox>
              </UiBox>

              <UiButton
                type="submit"
                disabled={isProcessing}
                {...{"size":"2","variant":"solid","color":"amber","className":"w-full mt-6 flex items-center justify-center gap-2"}}
              >
                {isProcessing ? <RefreshCw size={14} {...{"className":"animate-spin"}} /> : "Confirmar y Autorizar Pago"}
              </UiButton>
            </form>
          </UiCard>
        </UiBox>
      )}

    </UiBox>
  );
}
