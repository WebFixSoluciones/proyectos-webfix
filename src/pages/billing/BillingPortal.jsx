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
  Briefcase
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS } from '../../config/plans';

export default function BillingPortal({ isDarkMode, showToast }) {
  const navigate = useNavigate();
  const { tenantInfo, planId, planStatus, tenantId } = useAuth();
  const [activePlan, setActivePlan] = useState('starter');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(planId || 'starter');
  
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
    if (planId) {
      setSelectedPlan(planId);
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

  const getPrice = (planKey) => {
    const plan = PLANS[planKey] || PLANS.starter;
    return billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  };

  const handlePayPhoneCheckout = () => {
    setShowPayPhoneSim(true);
  };

  const completePayPhoneSim = async () => {
    setIsProcessing(true);
    try {
      const planConfig = PLANS[selectedPlan];
      const amount = billingPeriod === 'monthly' ? planConfig.priceMonthly : planConfig.priceYearly * 12;

      // 1. Extend Tenant Subscription in Firestore
      const newExpiresAt = new Date();
      newExpiresAt.setMonth(newExpiresAt.getMonth() + (billingPeriod === 'yearly' ? 12 : 1));

      await updateDoc(doc(db, 'tenants', tenantId), {
        planId: selectedPlan,
        planStatus: 'active',
        billingPeriod: billingPeriod,
        expiresAt: newExpiresAt.toISOString()
      });

      // 2. Log transaction in transfers
      const transferId = `pay_${new Date().getTime()}`;
      await setDoc(doc(db, 'transfers', transferId), {
        id: transferId,
        tenantId,
        companyName: tenantInfo.companyName,
        planId: selectedPlan,
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
      setActivePlan(selectedPlan);
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
      const transferId = `trsf_${new Date().getTime()}`;
      await setDoc(doc(db, 'transfers', transferId), {
        id: transferId,
        tenantId,
        companyName: tenantInfo.companyName,
        planId: selectedPlan,
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
    <div className={`p-6 max-w-5xl mx-auto space-y-8 text-left ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Suscripción y Facturación</h2>
          <p className="text-xs text-gray-500">Administra los módulos de tu negocio y realiza tus pagos.</p>
        </div>
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDarkMode ? 'bg-[#0f0f11]/60 border-white/5' : 'bg-white border-slate-200'}`}>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Col: Plan Selector (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0f0f11]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider">Selecciona tu Plan</h3>
              
              {/* Billing Cycle Toggle */}
              <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl text-[10px] font-bold">
                <button 
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-3 py-1.5 rounded-lg ${billingPeriod === 'monthly' ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm' : 'text-gray-500'}`}
                >
                  Mensual
                </button>
                <button 
                  onClick={() => setBillingPeriod('yearly')}
                  className={`px-3 py-1.5 rounded-lg ${billingPeriod === 'yearly' ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm' : 'text-gray-500'}`}
                >
                  Anual
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.keys(PLANS).map((key) => {
                const plan = PLANS[key];
                const isSelected = selectedPlan === key;
                return (
                  <div 
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`p-5 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[#1C40F2] bg-primary/5 ring-1 ring-[#1C40F2]/30' 
                        : (isDarkMode ? 'border-white/5 hover:border-white/10 bg-white/2' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50')
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">{plan.name}</div>
                    <div className="flex items-baseline gap-0.5 mb-3">
                      <span className="text-lg font-black">$</span>
                      <span className="text-2xl font-black">{getPrice(key)}</span>
                      <span className="text-[10px] text-gray-500">/mes</span>
                    </div>
                    <ul className="space-y-1.5 text-[9px] text-gray-500 font-medium">
                      <li>Facturación Ilimitada</li>
                      <li>Max. {plan.maxUsers === 9999 ? 'Ilimitados' : plan.maxUsers} Usuarios</li>
                      <li>Max. {plan.maxProducts === 99999 ? 'Ilimitados' : plan.maxProducts} Prod.</li>
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Card / Billing History */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0f0f11]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Historial de Transacciones</h3>
            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b dark:border-white/5 text-gray-500 font-bold uppercase text-[9px]">
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
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
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
        </div>

        {/* Right Col: Checkout & Payment details */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0f0f11]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Resumen del Pago</h3>
            
            <div className="space-y-3.5 text-xs font-medium mb-6">
              <div className="flex justify-between">
                <span>Plan Seleccionado:</span>
                <strong className="capitalize">{selectedPlan}</strong>
              </div>
              <div className="flex justify-between">
                <span>Ciclo de Cobro:</span>
                <strong className="capitalize">{billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}</strong>
              </div>
              <div className="flex justify-between text-base font-black border-t dark:border-white/5 pt-3">
                <span>Total a Pagar:</span>
                <span className="text-[#1C40F2] dark:text-white">
                  ${billingPeriod === 'yearly' ? getPrice(selectedPlan) * 12 : getPrice(selectedPlan)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-bold mb-6">
              <button 
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 rounded-lg transition-all ${paymentMethod === 'card' ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm' : 'text-gray-500'}`}
              >
                Tarjeta (PayPhone)
              </button>
              <button 
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 rounded-lg transition-all ${paymentMethod === 'transfer' ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm' : 'text-gray-500'}`}
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
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-bold tracking-wider uppercase bg-[#ff6b00] hover:bg-[#e05e00] text-white transition-all shadow-md active:scale-98"
                >
                  Pagar con PayPhone
                </button>
              </div>
            )}

            {/* BANK TRANSFER: UPLOAD FORM */}
            {paymentMethod === 'transfer' && (
              <form onSubmit={handleSubmitTransfer} className="space-y-4 text-xs font-medium text-left">
                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 text-[10px] text-gray-500 leading-relaxed mb-4">
                  <strong>Cuentas Bancarias WebFix:</strong><br />
                  Banco Pichincha - Cta. Corriente: 2201928472<br />
                  A nombre de WebFix Soluciones S.A.S (RUC: 1792847382001)
                </div>
                <div>
                  <label className="block font-bold mb-1">Banco emisor</label>
                  <select 
                    value={transferData.bankName} 
                    onChange={e => setTransferData({ ...transferData, bankName: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
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
                    className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Monto Depositado ($ USD)</label>
                  <input 
                    type="number" 
                    value={transferData.amount}
                    onChange={e => setTransferData({ ...transferData, amount: e.target.value })}
                    placeholder={`Total: $${billingPeriod === 'yearly' ? getPrice(selectedPlan) * 12 : getPrice(selectedPlan)}`}
                    className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
                    required
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 rounded-xl text-xs font-bold tracking-wider uppercase bg-[#1C40F2] hover:bg-[#1633c1] text-white transition-all shadow-md active:scale-98"
                >
                  {isProcessing ? "Registrando..." : "Reportar Transferencia"}
                </button>
              </form>
            )}

          </div>
        </div>

      </div>

      {/* PAYPHONE SIMULATION MODAL */}
      {showPayPhoneSim && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl relative text-center ${isDarkMode ? 'bg-[#0f0f11] border-indigo-500/30 text-white' : 'bg-white border-slate-200 text-black'}`}>
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase text-[#ff6b00] tracking-wider">Pasarela PayPhone (Sandbox)</span>
              <button onClick={() => setShowPayPhoneSim(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-500/5 mb-6 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span>Empresa receptora:</span>
                <strong>WebFix Soluciones S.A.S</strong>
              </div>
              <div className="flex justify-between">
                <span>Plan solicitado:</span>
                <strong className="capitalize">{selectedPlan}</strong>
              </div>
              <div className="flex justify-between border-t dark:border-white/5 pt-2">
                <span>Total a Cobrar:</span>
                <strong className="text-emerald-500">
                  ${billingPeriod === 'yearly' ? getPrice(selectedPlan) * 12 : getPrice(selectedPlan)}
                </strong>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); completePayPhoneSim(); }} className="space-y-4 text-xs font-medium text-left">
              <div>
                <label className="block font-bold mb-1">Número de tarjeta</label>
                <input type="text" placeholder="4000 1234 5678 9010" className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Expiración</label>
                  <input type="text" placeholder="MM/AA" className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`} required />
                </div>
                <div>
                  <label className="block font-bold mb-1">CVV</label>
                  <input type="password" placeholder="•••" maxLength={3} className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`} required />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full mt-6 py-4 rounded-xl text-xs font-bold tracking-wider uppercase bg-[#ff6b00] hover:bg-[#e05e00] text-white transition-all shadow-md flex items-center justify-center gap-2"
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
