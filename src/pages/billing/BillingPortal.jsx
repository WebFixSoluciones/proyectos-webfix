import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Building, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  ArrowRight, 
  Upload, 
  Clock, 
  ShieldCheck, 
  DollarSign,
  Briefcase,
  Mail,
  MessageSquare,
  Globe,
  Check,
  RefreshCw
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
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
  const navigate = useNavigate();
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

  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === 'historial') {
        setActiveCategory('historial');
      } else if (PRODUCTS_CATALOG[initialSubTab]) {
        setActiveCategory(initialSubTab);
        setSelectedPlanId(PRODUCTS_CATALOG[initialSubTab].plans[0].id);
      }
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (planId) {
      setActivePlan(planId);
    }
    if (tenantInfo?.billingPeriod) {
      setBillingPeriod(tenantInfo.billingPeriod);
    }
  }, [planId, tenantInfo]);

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
    <div className={`p-6 max-w-5xl mx-auto space-y-8 text-left text-gray-800`}>
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Suscripción y Facturación</h2>
          <p className="text-xs text-gray-500 font-medium">Administra los módulos de tu negocio y realiza tus pagos.</p>
        </div>
        <div className={`p-4 rounded-card border flex items-center gap-3 bg-white border-slate-200`}>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Building size={18} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-500">Plan Actual</div>
            <div className="text-xs font-bold capitalize">{activePlan} — {planStatus === 'trial' ? `Prueba (${getDaysRemaining()} días)` : 'Suscripción Activa'}</div>
          </div>
        </div>
      </div>

      {/* Grid: Plan Selector & Payment Form */}
      {activeCategory === 'historial' ? (
        <div className={`p-6 rounded-card border bg-white border-slate-200`}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Historial de Transacciones</h3>
          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b dark:border-white/5 text-gray-500 font-bold uppercase text-xs">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Referencia</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 font-medium">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-gray-500 font-semibold">No se registran transacciones previas.</td>
                  </tr>
                ) : (
                  history.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-3.5">{new Date(tx.transferDate).toLocaleDateString('es-EC')}</td>
                      <td className="py-3.5 font-mono">{tx.referenceNumber}</td>
                      <td className="py-3.5 font-bold text-emerald-500">${tx.amount}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                          tx.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500' :
                          tx.status === 'pending' ? 'bg-orange-500/15 text-orange-500 animate-pulse' :
                          'bg-red-500/15 text-red-500'
                        }`}>
                          {tx.status === 'approved' ? 'Aprobado' :
                           tx.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Col: Plan Selector */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`p-6 rounded-card border bg-white border-slate-200`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    {PRODUCTS_CATALOG[activeCategory]?.title}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                    {PRODUCTS_CATALOG[activeCategory]?.desc}
                  </p>
                </div>
                
                {/* Billing Cycle Toggle */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-card text-[10px] font-bold self-start sm:self-center">
                  <button 
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-3 py-1.5 rounded-lg ${billingPeriod === 'monthly' ? 'bg-white dark:bg-white/10 text-primary dark:text-white' : 'text-gray-500'}`}
                  >
                    Mensual
                  </button>
                  <button 
                    onClick={() => setBillingPeriod('yearly')}
                    className={`px-3 py-1.5 rounded-lg ${billingPeriod === 'yearly' ? 'bg-white dark:bg-white/10 text-primary dark:text-white' : 'text-gray-500'}`}
                  >
                    Anual
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(PRODUCTS_CATALOG[activeCategory]?.plans || []).map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div 
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-5 rounded-card border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/30' 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs mb-1">{plan.name}</div>
                        <div className="flex items-baseline gap-0.5 mb-4">
                          <span className="text-lg font-black">$</span>
                          <span className="text-2xl font-black">{getPrice(plan)}</span>
                          <span className="text-[10px] text-gray-500">/mes</span>
                        </div>
                        <ul className="space-y-2 text-xs text-gray-500 font-medium">
                          {plan.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 leading-normal">
                              <Check size={10} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Col: Checkout & Payment details */}
          <div className="space-y-6">
            <div className={`p-6 rounded-card border bg-white border-slate-200`}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Resumen del Pago</h3>
              
              <div className="space-y-3.5 text-xs font-medium mb-6">
                <div className="flex justify-between">
                  <span>Plan Seleccionado:</span>
                  <strong className="capitalize">
                    {getSelectedPlanConfig()?.name || ''}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Ciclo de Cobro:</span>
                  <strong className="capitalize">{billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}</strong>
                </div>
                <div className="flex justify-between text-base font-black border-t dark:border-white/5 pt-3">
                  <span>Total a Pagar:</span>
                  <span className="text-primary dark:text-white">
                    ${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-card text-[10px] font-bold mb-6">
                <button 
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 rounded-lg transition-all ${paymentMethod === 'card' ? 'bg-white dark:bg-white/10 text-primary dark:text-white' : 'text-gray-500'}`}
                >
                  Tarjeta (PayPhone)
                </button>
                <button 
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-2 rounded-lg transition-all ${paymentMethod === 'transfer' ? 'bg-white dark:bg-white/10 text-primary dark:text-white' : 'text-gray-500'}`}
                >
                  Transferencia
                </button>
              </div>

              {/* CARD PAYMENT: PAYPHONE BUTTON */}
              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <p className="text-[10px] text-gray-500 leading-normal">Los pagos con tarjeta se acreditan de manera automática. Aceptamos Visa, MasterCard y todas las tarjetas nacionales.</p>
                  <button 
                    onClick={handlePayPhoneCheckout}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-card text-xs font-bold tracking-wider uppercase bg-warning hover:bg-warning text-white transition-all active:scale-98"
                  >
                    Pagar con PayPhone
                  </button>
                </div>
              )}

              {/* BANK TRANSFER: UPLOAD FORM */}
              {paymentMethod === 'transfer' && (
                <form onSubmit={handleSubmitTransfer} className="space-y-4 text-xs font-medium text-left">
                  <div className="p-3 bg-blue-500/5 rounded-card border border-blue-500/10 text-[10px] text-gray-500 leading-relaxed mb-4">
                    <strong>Cuentas Bancarias WebFix:</strong><br />
                    Banco Pichincha - Cta. Corriente: 2201928472<br />
                    A nombre de WebFix Soluciones S.A.S (RUC: 1792847382001)
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Banco emisor</label>
                    <select 
                      value={transferData.bankName} 
                      onChange={e => setTransferData({ ...transferData, bankName: e.target.value })}
                      className={`w-full p-2.5 rounded-lg border outline-none bg-white border-slate-300`}
                    >
                      <option value="Banco Pichincha">Banco Pichincha</option>
                      <option value="Banco Guayaquil">Banco Guayaquil</option>
                      <option value="Banco del Pacífico">Banco del Pacífico</option>
                      <option value="Produbanco">Produbanco</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Número de Referencia / Comprobante</label>
                    <input 
                      type="text" 
                      value={transferData.referenceNumber}
                      onChange={e => setTransferData({ ...transferData, referenceNumber: e.target.value })}
                      placeholder="Referencia de 6-8 dígitos"
                      className={`w-full p-2.5 rounded-lg border outline-none bg-white border-slate-300`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Monto Depositado ($ USD)</label>
                    <input 
                      type="number" 
                      value={transferData.amount}
                      onChange={e => setTransferData({ ...transferData, amount: e.target.value })}
                      placeholder={`Total: $${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())}`}
                      className={`w-full p-2.5 rounded-lg border outline-none bg-white border-slate-300`}
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 rounded-card text-xs font-bold tracking-wider uppercase bg-primary hover:bg-primary-hover text-white transition-all active:scale-98"
                  >
                    {isProcessing ? "Registrando..." : "Reportar Transferencia"}
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>
      )}

      {/* PAYPHONE SIMULATION MODAL */}
      {showPayPhoneSim && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-6 rounded-card border relative text-center bg-white border-slate-200 text-black`}>
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase text-warning tracking-wider">Pasarela PayPhone (Sandbox)</span>
              <button onClick={() => setShowPayPhoneSim(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="p-4 rounded-card bg-slate-500/5 mb-6 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span>Empresa receptora:</span>
                <strong>WebFix Soluciones S.A.S</strong>
              </div>
              <div className="flex justify-between">
                <span>Plan solicitado:</span>
                <strong className="capitalize">{getSelectedPlanConfig()?.name || ''}</strong>
              </div>
              <div className="flex justify-between border-t dark:border-white/5 pt-2">
                <span>Total a Cobrar:</span>
                <strong className="text-emerald-500">
                  ${billingPeriod === 'yearly' ? getPrice(getSelectedPlanConfig()) * 12 : getPrice(getSelectedPlanConfig())}
                </strong>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); completePayPhoneSim(); }} className="space-y-4 text-xs font-medium text-left">
              <div>
                <label className="block font-bold mb-1">Número de tarjeta</label>
                <input type="text" placeholder="4000 1234 5678 9010" className={`w-full p-2.5 rounded-lg border outline-none bg-white border-slate-300`} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Expiración</label>
                  <input type="text" placeholder="MM/AA" className={`w-full p-2.5 rounded-lg border outline-none bg-white border-slate-300`} required />
                </div>
                <div>
                  <label className="block font-bold mb-1">CVV</label>
                  <input type="password" placeholder="•••" maxLength={3} className={`w-full p-2.5 rounded-lg border outline-none bg-white border-slate-300`} required />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full mt-6 py-4 rounded-card text-xs font-bold tracking-wider uppercase bg-warning hover:bg-warning text-white transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : "Confirmar y Autorizar Pago"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
