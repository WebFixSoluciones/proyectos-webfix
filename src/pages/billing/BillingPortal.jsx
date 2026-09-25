import { UiBox, UiHeading, UiText, UiCard, UiLabel } from '../../components/ui/layout';
import { UiTable, UiTableHeader, UiTableRow, UiTableHead, UiTableBody, UiTableCell, UiButton, UiSelect, UiInput } from '../../components/ui/controls';
import { useState, useEffect } from 'react';
import {
  Building,
  Check,
  RefreshCw,
  CreditCard,
  FileText,
  Globe,
  Mail,
  MessageSquare,
  History,
  ShieldCheck,
  X
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const PRODUCTS_CATALOG = {
  facturacion: {
    title: 'Facturación Electrónica SRI',
    desc: 'Sistema de facturación automatizado y autorizado por el SRI del Ecuador.',
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
        features: ['Facturación Ilimitada', '3 Usuarios', 'Inventario básico', 'Soporte prioritario'],
        isPopular: true
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
    desc: 'Presencia web profesional con hosting de alto rendimiento y SEO optimizado.',
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
        features: ['Hasta 5 páginas internas', 'Panel administrable', 'Blog de noticias', 'Diseño responsivo premium'],
        isPopular: true
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
    desc: 'Comunicación profesional y segura con el dominio corporativo de tu empresa.',
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
        features: ['30 GB de almacenamiento', 'Videollamadas grupales', '100 GB en nube compartida', 'Calendario corporativo'],
        isPopular: true
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
    desc: 'Multiagente, automatización y centralización de conversaciones comerciales.',
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
        features: ['Línea oficial certificada', 'Chatbots interactivos', 'Hasta 5 agentes', 'Asignación automática de chats'],
        isPopular: true
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

const SUBMODULES = [
  { id: 'facturacion', label: 'Facturación Electrónica', icon: FileText },
  { id: 'paginas', label: 'Páginas Web', icon: Globe },
  { id: 'correos', label: 'Correos Corporativos', icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp CRM', icon: MessageSquare },
  { id: 'historial', label: 'Historial de Pagos', icon: History }
];

export default function BillingPortal({ showToast, initialSubTab, onSubTabChange }) {
  const { tenantInfo, planId, planStatus, tenantId } = useAuth();
  const [activePlan, setActivePlan] = useState('starter');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  
  const getInitialCategory = () => {
    if (initialSubTab === 'historial' || initialSubTab === 'pagos') return 'historial';
    if (initialSubTab && PRODUCTS_CATALOG[initialSubTab]) return initialSubTab;
    return 'facturacion';
  };

  const [activeCategory, setActiveCategory] = useState(getInitialCategory);
  const [selectedPlanId, setSelectedPlanId] = useState('sri_basico');
  
  // Payment methods
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'transfer'
  
  // Transfer Form
  const [transferData, setTransferData] = useState({
    bankName: 'Banco Pichincha',
    referenceNumber: '',
    amount: '',
    transferDate: new Date().toISOString().split('T')[0],
    receiptUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500'
  });
  
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayPhoneSim, setShowPayPhoneSim] = useState(false);

  // Sync initialSubTab from props
  useEffect(() => {
    if (!initialSubTab) return;
    if (initialSubTab === 'historial' || initialSubTab === 'pagos') {
      if (activeCategory !== 'historial') {
        setActiveCategory('historial');
      }
    } else if (PRODUCTS_CATALOG[initialSubTab]) {
      if (activeCategory !== initialSubTab) {
        setActiveCategory(initialSubTab);
        setSelectedPlanId(PRODUCTS_CATALOG[initialSubTab].plans[0].id);
      }
    } else if (initialSubTab === 'planes') {
      if (activeCategory !== 'facturacion') {
        setActiveCategory('facturacion');
        setSelectedPlanId(PRODUCTS_CATALOG.facturacion.plans[0].id);
      }
    }
  }, [initialSubTab]);

  // Sync planId from props
  useEffect(() => {
    if (planId && planId !== activePlan) {
      setActivePlan(planId);
    }
  }, [planId, activePlan]);

  // Sync billingPeriod from tenantInfo
  useEffect(() => {
    if (tenantInfo?.billingPeriod && tenantInfo.billingPeriod !== billingPeriod) {
      setBillingPeriod(tenantInfo.billingPeriod);
    }
  }, [tenantInfo?.billingPeriod, billingPeriod]);

  // Load billing history (transfers)
  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, 'transfers'), where('tenantId', '==', tenantId));
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      setHistory(list);
    }, (error) => {
      console.warn("Billing transfers subscription blocked by security rules:", error);
    });
    return () => unsub();
  }, [tenantId]);

  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    if (catId !== 'historial') {
      const defaultPlan = PRODUCTS_CATALOG[catId]?.plans[0]?.id;
      if (defaultPlan) setSelectedPlanId(defaultPlan);
    }
    if (onSubTabChange) {
      onSubTabChange(catId === 'historial' ? 'pagos' : catId);
    }
  };

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
    <UiBox className="space-y-4 w-full text-left">
      
      {/* Top Header Card */}
      <UiCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-[var(--color-panel-solid)] border border-[var(--gray-a6)] rounded-lg">
        <UiBox className="flex items-center gap-3">
          <UiBox className="p-2 rounded-md bg-[var(--accent-3)] text-[var(--accent-11)] shrink-0">
            <CreditCard size={18} />
          </UiBox>
          <UiBox>
            <UiHeading as="h2" size="4" weight="bold" color="gray" highContrast>
              {activeCategory === 'historial'
                ? 'Historial de Pagos y Transferencias'
                : (PRODUCTS_CATALOG[activeCategory]?.title || 'Suscripción y Facturación SaaS')}
            </UiHeading>
            <UiText as="p" size="1" color="gray" className="text-xs">
              {activeCategory === 'historial'
                ? 'Registro de pagos realizados y transferencias bancarias reportadas'
                : (PRODUCTS_CATALOG[activeCategory]?.desc || 'Administra los módulos de tu negocio y realiza tus pagos.')}
            </UiText>
          </UiBox>
        </UiBox>

        {/* Right side: Plan actual badge & status */}
        <UiBox className="flex items-center gap-2 self-start sm:self-center">
          <UiBox className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--gray-2)] border border-[var(--gray-a4)] text-xs">
            <span className="text-[var(--gray-11)] font-medium">Plan Actual:</span>
            <span className="font-semibold uppercase tracking-wider text-[var(--accent-11)]">{activePlan}</span>
            <span className="text-[var(--gray-6)]">•</span>
            <span className={planStatus === 'trial' ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
              {planStatus === 'trial' ? `Prueba (${getDaysRemaining()} días)` : 'Suscripción Activa'}
            </span>
          </UiBox>
        </UiBox>
      </UiCard>

      {/* Submodule Tabs Bar */}
      <UiBox className="flex items-center gap-1.5 p-1 bg-[var(--color-panel-solid)] border border-[var(--gray-a5)] rounded-lg overflow-x-auto custom-scrollbar">
        {SUBMODULES.map((sub) => {
          const isActive = activeCategory === sub.id;
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => handleSelectCategory(sub.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-9)] text-white shadow-none'
                  : 'text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)]'
              }`}
            >
              <Icon size={14} />
              <span>{sub.label}</span>
            </button>
          );
        })}
      </UiBox>

      {/* Main View: Historial vs Plan Selector & Payment Form */}
      {activeCategory === 'historial' ? (
        <UiCard className="p-5 bg-[var(--color-panel-solid)] border border-[var(--gray-a6)] rounded-lg">
          <UiBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--gray-a4)]">
            <UiBox>
              <UiHeading as="h3" size="3" weight="bold" color="gray" highContrast>
                Historial de Pagos y Transacciones
              </UiHeading>
              <UiText as="p" size="1" color="gray" className="text-xs mt-0.5">
                Consulta el estado de tus transferencias y renovaciones de suscripción registradas en la plataforma.
              </UiText>
            </UiBox>
            <UiBox className="text-xs text-[var(--gray-11)]">
              Total de transacciones: <span className="font-semibold text-[var(--gray-12)]">{history.length}</span>
            </UiBox>
          </UiBox>

          <UiBox className="overflow-x-auto custom-scrollbar">
            <UiTable className="w-full text-left text-xs">
              <UiTableHeader>
                <UiTableRow className="border-b border-[var(--gray-a4)]">
                  <UiTableHead className="py-2.5 font-semibold text-[var(--gray-11)]">Fecha</UiTableHead>
                  <UiTableHead className="py-2.5 font-semibold text-[var(--gray-11)]">Referencia</UiTableHead>
                  <UiTableHead className="py-2.5 font-semibold text-[var(--gray-11)]">Método / Banco</UiTableHead>
                  <UiTableHead className="py-2.5 font-semibold text-[var(--gray-11)]">Monto</UiTableHead>
                  <UiTableHead className="py-2.5 font-semibold text-[var(--gray-11)]">Estado</UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                {history.length === 0 ? (
                  <UiTableRow>
                    <UiTableCell colSpan="5" className="py-12 text-center text-[var(--gray-11)]">
                      <UiBox className="flex flex-col items-center justify-center gap-2">
                        <History size={28} className="text-[var(--gray-9)]" />
                        <span className="font-medium text-sm">No se registran transacciones previas en tu cuenta.</span>
                        <span className="text-[11px] text-[var(--gray-10)]">Los pagos y reportes de transferencias aparecerán aquí automáticamente.</span>
                      </UiBox>
                    </UiTableCell>
                  </UiTableRow>
                ) : (
                  history.map((tx) => (
                    <UiTableRow key={tx.id} className="border-b border-[var(--gray-a3)] hover:bg-[var(--gray-2)]">
                      <UiTableCell className="py-3 font-medium text-[var(--gray-12)]">
                        {new Date(tx.transferDate).toLocaleDateString('es-EC')}
                      </UiTableCell>
                      <UiTableCell className="py-3 font-mono text-[var(--gray-12)]">
                        {tx.referenceNumber}
                      </UiTableCell>
                      <UiTableCell className="py-3 text-[var(--gray-11)]">
                        {tx.bankName || 'PayPhone (Tarjeta)'}
                      </UiTableCell>
                      <UiTableCell className="py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ${Number(tx.amount || 0).toFixed(2)}
                      </UiTableCell>
                      <UiTableCell className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          tx.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : tx.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 animate-pulse'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                        }`}>
                          {tx.status === 'approved' ? '✓ Aprobado' : tx.status === 'pending' ? '⏳ Pendiente' : '✕ Rechazado'}
                        </span>
                      </UiTableCell>
                    </UiTableRow>
                  ))
                )}
              </UiTableBody>
            </UiTable>
          </UiBox>
        </UiCard>
      ) : (
        <UiBox className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          
          {/* Left Col: Plan Selector (8 columns) */}
          <UiBox className="xl:col-span-8 space-y-4">
            <UiCard className="p-5 bg-[var(--color-panel-solid)] border border-[var(--gray-a6)] rounded-lg">
              
              {/* Card Subheader: Module details + Billing cycle switcher */}
              <UiBox className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-[var(--gray-a4)]">
                <UiBox>
                  <UiHeading as="h3" size="3" weight="bold" color="gray" highContrast>
                    {PRODUCTS_CATALOG[activeCategory]?.title}
                  </UiHeading>
                  <UiText as="p" size="1" color="gray" className="text-xs mt-0.5">
                    {PRODUCTS_CATALOG[activeCategory]?.desc}
                  </UiText>
                </UiBox>

                {/* Billing Cycle Switcher */}
                <UiBox className="flex items-center gap-1 p-1 bg-[var(--gray-3)] border border-[var(--gray-a4)] rounded-md self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer ${
                      billingPeriod === 'monthly'
                        ? 'bg-[var(--color-panel-solid)] text-[var(--gray-12)] border border-[var(--gray-a4)]'
                        : 'text-[var(--gray-11)] hover:text-[var(--gray-12)]'
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('yearly')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                      billingPeriod === 'yearly'
                        ? 'bg-[var(--color-panel-solid)] text-[var(--gray-12)] border border-[var(--gray-a4)]'
                        : 'text-[var(--gray-11)] hover:text-[var(--gray-12)]'
                    }`}
                  >
                    <span>Anual</span>
                    <span className="text-[10px] px-1 py-0.2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold">-20%</span>
                  </button>
                </UiBox>
              </UiBox>

              {/* 3 Plans Grid */}
              <UiBox className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(PRODUCTS_CATALOG[activeCategory]?.plans || []).map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const price = getPrice(plan);
                  return (
                    <UiBox
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-5 rounded-lg cursor-pointer transition-all flex flex-col justify-between relative border ${
                        isSelected
                          ? 'border-[var(--accent-9)] bg-[var(--accent-2)] ring-1 ring-[var(--accent-9)]'
                          : 'border-[var(--gray-a6)] bg-[var(--color-panel-solid)] hover:border-[var(--gray-a8)] hover:bg-[var(--gray-2)]'
                      }`}
                    >
                      {plan.isPopular && (
                        <span className="absolute -top-2.5 right-4 px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full bg-[var(--accent-9)] text-white uppercase">
                          Recomendado
                        </span>
                      )}

                      <UiBox>
                        <UiHeading as="h4" size="2" weight="bold" color="gray" highContrast className="mb-1">
                          {plan.name}
                        </UiHeading>
                        <UiBox className="flex items-baseline gap-1 my-3">
                          <span className="text-sm font-semibold text-[var(--gray-11)]">$</span>
                          <span className="text-3xl font-extrabold tracking-tight text-[var(--gray-12)] font-mono">
                            {price}
                          </span>
                          <span className="text-xs text-[var(--gray-11)] font-medium">/mes</span>
                        </UiBox>
                        {billingPeriod === 'yearly' && (
                          <UiText as="p" size="1" color="gray" className="text-[11px] mb-3 -mt-2">
                            ${price * 12}/año facturado anualmente
                          </UiText>
                        )}

                        <div className="border-t border-[var(--gray-a4)] my-3" />

                        <ul className="space-y-2 text-xs">
                          {plan.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2 leading-relaxed text-[var(--gray-11)]">
                              <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </UiBox>

                      <UiBox className="mt-5 pt-3 border-t border-[var(--gray-a4)]">
                        <UiButton
                          type="button"
                          size="2"
                          variant={isSelected ? 'solid' : 'soft'}
                          color={isSelected ? 'blue' : 'gray'}
                          className="w-full text-xs font-semibold cursor-pointer"
                        >
                          {isSelected ? '✓ Seleccionado' : 'Elegir Plan'}
                        </UiButton>
                      </UiBox>
                    </UiBox>
                  );
                })}
              </UiBox>
            </UiCard>
          </UiBox>

          {/* Right Col: Checkout & Payment details (4 columns) */}
          <UiBox className="xl:col-span-4 space-y-4">
            <UiCard className="p-5 bg-[var(--color-panel-solid)] border border-[var(--gray-a6)] rounded-lg">
              <UiHeading as="h3" size="3" weight="bold" color="gray" highContrast className="mb-4">
                Resumen del Pago
              </UiHeading>

              <UiBox className="space-y-3 p-3.5 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-a4)] mb-4 text-xs">
                <UiBox className="flex justify-between items-center">
                  <span className="text-[var(--gray-11)]">Módulo:</span>
                  <span className="font-semibold text-[var(--gray-12)]">{PRODUCTS_CATALOG[activeCategory]?.title}</span>
                </UiBox>
                <UiBox className="flex justify-between items-center">
                  <span className="text-[var(--gray-11)]">Plan:</span>
                  <span className="font-bold text-[var(--accent-11)]">{getSelectedPlanConfig()?.name || ''}</span>
                </UiBox>
                <UiBox className="flex justify-between items-center">
                  <span className="text-[var(--gray-11)]">Frecuencia:</span>
                  <span className="font-semibold text-[var(--gray-12)]">{billingPeriod === 'yearly' ? 'Anual (12 meses)' : 'Mensual'}</span>
                </UiBox>
                <div className="border-t border-[var(--gray-a5)] pt-2 flex justify-between items-baseline">
                  <span className="font-semibold text-[var(--gray-12)] text-sm">Total a Pagar:</span>
                  <span className="font-extrabold text-lg text-[var(--accent-11)] font-mono">
                    ${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())}
                  </span>
                </div>
              </UiBox>

              {/* Payment Method Selector */}
              <UiBox className="grid grid-cols-2 gap-2 p-1 bg-[var(--gray-3)] border border-[var(--gray-a4)] rounded-md mb-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'card'
                      ? 'bg-[var(--color-panel-solid)] text-[var(--gray-12)] border border-[var(--gray-a4)]'
                      : 'text-[var(--gray-11)] hover:text-[var(--gray-12)]'
                  }`}
                >
                  <CreditCard size={14} />
                  <span>Tarjeta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'transfer'
                      ? 'bg-[var(--color-panel-solid)] text-[var(--gray-12)] border border-[var(--gray-a4)]'
                      : 'text-[var(--gray-11)] hover:text-[var(--gray-12)]'
                  }`}
                >
                  <Building size={14} />
                  <span>Transferencia</span>
                </button>
              </UiBox>

              {/* Card / PayPhone */}
              {paymentMethod === 'card' && (
                <UiBox className="space-y-4">
                  <UiBox className="p-3 rounded-md bg-[var(--blue-2)] border border-[var(--blue-4)] text-[var(--blue-11)] text-xs leading-relaxed flex items-start gap-2">
                    <ShieldCheck size={16} className="shrink-0 mt-0.5 text-[var(--blue-10)]" />
                    <span>Los pagos con tarjeta se acreditan de manera automática. Aceptamos Visa, MasterCard y tarjetas nacionales a través de PayPhone.</span>
                  </UiBox>
                  <UiButton
                    type="button"
                    onClick={handlePayPhoneCheckout}
                    disabled={isProcessing}
                    size="3"
                    variant="solid"
                    color="amber"
                    className="w-full flex items-center justify-center gap-2 font-bold cursor-pointer"
                  >
                    Pagar con PayPhone (${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())})
                  </UiButton>
                </UiBox>
              )}

              {/* Transfer Form */}
              {paymentMethod === 'transfer' && (
                <form onSubmit={handleSubmitTransfer} className="space-y-3 text-xs">
                  <UiBox className="p-3 rounded-md bg-[var(--blue-2)] border border-[var(--blue-4)] text-[var(--blue-11)] leading-relaxed">
                    <strong className="block mb-1 text-[var(--blue-12)]">Cuentas Bancarias WebFix:</strong>
                    Banco Pichincha - Cta. Corriente: <span className="font-mono font-semibold">2201928472</span><br />
                    Titular: <span className="font-semibold">WebFix Soluciones S.A.S</span><br />
                    RUC: <span className="font-mono font-semibold">1792847382001</span>
                  </UiBox>

                  <UiBox>
                    <UiLabel weight="bold" className="block mb-1 text-[var(--gray-11)]">Banco emisor</UiLabel>
                    <UiSelect
                      value={transferData.bankName} 
                      onChange={e => setTransferData({ ...transferData, bankName: e.target.value })}
                      size="2"
                      className="w-full cursor-pointer"
                    >
                      <option value="Banco Pichincha">Banco Pichincha</option>
                      <option value="Banco Guayaquil">Banco Guayaquil</option>
                      <option value="Banco del Pacífico">Banco del Pacífico</option>
                      <option value="Produbanco">Produbanco</option>
                      <option value="Cooperativa JEP">Cooperativa JEP</option>
                      <option value="Otro">Otro Banco / Cooperativa</option>
                    </UiSelect>
                  </UiBox>

                  <UiBox>
                    <UiLabel weight="bold" className="block mb-1 text-[var(--gray-11)]">Número de Referencia / Comprobante</UiLabel>
                    <UiInput
                      type="text" 
                      value={transferData.referenceNumber}
                      onChange={e => setTransferData({ ...transferData, referenceNumber: e.target.value })}
                      placeholder="Referencia de 6-8 dígitos"
                      size="2"
                      className="w-full"
                      required
                    />
                  </UiBox>

                  <UiBox>
                    <UiLabel weight="bold" className="block mb-1 text-[var(--gray-11)]">Monto Depositado ($ USD)</UiLabel>
                    <UiInput
                      type="number" 
                      value={transferData.amount}
                      onChange={e => setTransferData({ ...transferData, amount: e.target.value })}
                      placeholder={`Total: $${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())}`}
                      size="2"
                      className="w-full"
                      required
                    />
                  </UiBox>

                  <UiButton
                    type="submit"
                    disabled={isProcessing}
                    size="2"
                    variant="solid"
                    color="blue"
                    className="w-full font-semibold cursor-pointer"
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
        <UiBox className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <UiCard className="w-full max-w-sm p-6 relative bg-[var(--color-panel-solid)] text-[var(--gray-12)] border border-[var(--gray-a6)] rounded-lg">
            <UiBox className="flex justify-between items-center mb-6">
              <UiText size="2" weight="bold" color="amber">Pasarela PayPhone (Sandbox)</UiText>
              <button 
                type="button"
                onClick={() => setShowPayPhoneSim(false)} 
                className="p-1 rounded-md text-[var(--gray-10)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </UiBox>
            
            <UiBox className="p-4 mb-6 text-left space-y-2 rounded-md bg-[var(--gray-2)] border border-[var(--gray-a4)] text-xs">
              <UiBox className="flex justify-between">
                <span className="text-[var(--gray-11)]">Empresa receptora:</span>
                <strong>WebFix Soluciones S.A.S</strong>
              </UiBox>
              <UiBox className="flex justify-between">
                <span className="text-[var(--gray-11)]">Plan solicitado:</span>
                <strong>{getSelectedPlanConfig()?.name || ''}</strong>
              </UiBox>
              <div className="border-t border-[var(--gray-a5)] pt-2 flex justify-between">
                <span className="text-[var(--gray-11)]">Total a Cobrar:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  ${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())}
                </strong>
              </div>
            </UiBox>

            <form onSubmit={(e) => { e.preventDefault(); completePayPhoneSim(); }} className="space-y-4 text-left text-xs">
              <UiBox>
                <UiLabel weight="bold" className="block mb-1 text-[var(--gray-11)]">Número de tarjeta</UiLabel>
                <UiInput type="text" placeholder="4000 1234 5678 9010" size="2" className="w-full font-mono" required />
              </UiBox>
              <UiBox className="grid grid-cols-2 gap-4">
                <UiBox>
                  <UiLabel weight="bold" className="block mb-1 text-[var(--gray-11)]">Expiración</UiLabel>
                  <UiInput type="text" placeholder="MM/AA" size="2" className="w-full font-mono" required />
                </UiBox>
                <UiBox>
                  <UiLabel weight="bold" className="block mb-1 text-[var(--gray-11)]">CVV</UiLabel>
                  <UiInput type="password" placeholder="•••" maxLength={3} size="2" className="w-full font-mono" required />
                </UiBox>
              </UiBox>

              <UiButton
                type="submit"
                disabled={isProcessing}
                size="3"
                variant="solid"
                color="amber"
                className="w-full mt-6 flex items-center justify-center gap-2 font-bold cursor-pointer"
              >
                {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : "Confirmar y Autorizar Pago"}
              </UiButton>
            </form>
          </UiCard>
        </UiBox>
      )}

    </UiBox>
  );
}
