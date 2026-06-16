import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  Users, 
  CreditCard, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Search, 
  ChevronRight, 
  Activity, 
  Edit3, 
  Calendar, 
  Check, 
  X, 
  LogOut,
  Sliders,
  DollarSign
} from 'lucide-react';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function SuperAdminPage({ isDarkMode, showToast }) {
  const navigate = useNavigate();
  const { currentUser, logout, role } = useAuth();
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'transfers' | 'plans'
  const [tenants, setTenants] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [plans, setPlans] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals / Edit states
  const [editingTenant, setEditingTenant] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Gating check: ensure only superadmins can access this page
  // We can also check custom claims, but for this simulation we check role
  useEffect(() => {
    if (currentUser && role !== 'superadmin') {
      showToast("Acceso denegado. Se requieren permisos de super-administrador.", "error");
      navigate('/app');
    }
  }, [currentUser, role]);

  // Load Tenants, Transfers, and Plans
  useEffect(() => {
    setLoading(true);
    
    // 1. Listen to Tenants
    const unsubTenants = onSnapshot(collection(db, 'tenants'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setTenants(list);
    });

    // 2. Listen to Transfers
    const unsubTransfers = onSnapshot(collection(db, 'transfers'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setTransfers(list);
    });

    // 3. Load or Initialize Plans in Firestore
    const loadPlans = async () => {
      try {
        const snap = await getDocs(collection(db, 'plans'));
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        
        if (list.length === 0) {
          // Initialize default plans if not created yet
          const defaultPlans = [
            {
              id: 'starter',
              name: 'Starter',
              priceMonthly: 29,
              priceYearly: 23,
              maxUsers: 3,
              maxProducts: 100,
              modules: ['dashboard', 'ventas', 'personas', 'general_settings']
            },
            {
              id: 'professional',
              name: 'Profesional',
              priceMonthly: 79,
              priceYearly: 63,
              maxUsers: 10,
              maxProducts: 1000,
              modules: ['dashboard', 'ventas', 'personas', 'inventario', 'team', 'calendar', 'general_settings']
            },
            {
              id: 'enterprise',
              name: 'Enterprise',
              priceMonthly: 149,
              priceYearly: 119,
              maxUsers: 9999, // Ilimitado
              maxProducts: 99999, // Ilimitado
              modules: ['dashboard', 'ventas', 'personas', 'inventario', 'team', 'calendar', 'finances', 'compras', 'gastos_creditos', 'general_settings']
            }
          ];
          for (const p of defaultPlans) {
            await setDoc(doc(db, 'plans', p.id), p);
          }
          setPlans(defaultPlans);
        } else {
          setPlans(list);
        }
      } catch (err) {
        console.error("Error cargando planes:", err);
      }
    };

    loadPlans();
    setLoading(false);

    return () => {
      unsubTenants();
      unsubTransfers();
    };
  }, []);

  // Actions
  const handleApproveTransfer = async (transfer) => {
    try {
      const newExpiresAt = new Date();
      const monthsToAdd = transfer.billingPeriod === 'yearly' ? 12 : 1;
      newExpiresAt.setMonth(newExpiresAt.getMonth() + monthsToAdd);

      // 1. Update Tenant Subscription
      await updateDoc(doc(db, 'tenants', transfer.tenantId), {
        planStatus: 'active',
        expiresAt: newExpiresAt.toISOString(),
        planId: transfer.planId
      });

      // 2. Update Transfer Status
      await updateDoc(doc(db, 'transfers', transfer.id), {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });

      showToast("Transferencia bancaria aprobada. Suscripción activada.", "success");
      setSelectedTransfer(null);
    } catch (err) {
      showToast("Error al aprobar transferencia: " + err.message, "error");
    }
  };

  const handleRejectTransfer = async (transfer) => {
    try {
      await updateDoc(doc(db, 'transfers', transfer.id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
      showToast("Transferencia bancaria rechazada.", "warning");
      setSelectedTransfer(null);
    } catch (err) {
      showToast("Error al rechazar transferencia", "error");
    }
  };

  const handleSaveTenantEdit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'tenants', editingTenant.id), {
        planId: editingTenant.planId,
        planStatus: editingTenant.planStatus,
        expiresAt: new Date(editingTenant.expiresAt).toISOString()
      });
      showToast("Datos del tenant actualizados con éxito", "success");
      setEditingTenant(null);
    } catch (err) {
      showToast("Error al actualizar tenant", "error");
    }
  };

  const handleSavePlanEdit = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'plans', editingPlan.id), editingPlan, { merge: true });
      showToast(`Configuración del plan ${editingPlan.name} guardada`, "success");
      setEditingPlan(null);
    } catch (err) {
      showToast("Error al guardar plan", "error");
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Dashboard Stats
  const activeTenantsCount = tenants.filter(t => t.planStatus === 'active').length;
  const pendingTransfers = transfers.filter(t => t.status === 'pending');
  const mrr = tenants
    .filter(t => t.planStatus === 'active')
    .reduce((sum, t) => {
      const planPrice = plans.find(p => p.id === t.planId)?.priceMonthly || 0;
      return sum + (t.billingPeriod === 'yearly' ? planPrice * 0.8 : planPrice);
    }, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-[#08080a] text-gray-100' : 'bg-[#f4f4f9] text-gray-800'}`}>
      
      {/* Header */}
      <header className={`h-16 flex items-center justify-between px-6 border-b backdrop-blur-md sticky top-0 z-40 ${isDarkMode ? 'bg-[#0f0f11]/90 border-white/5' : 'bg-white/95 border-black/5'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Settings size={16} className="text-white" />
          </div>
          <span className="text-sm font-black uppercase tracking-wider">WebFix SaaS Master Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
          >
            Ir al ERP
          </button>
          <button 
            onClick={handleLogout} 
            className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0f0f11]/50 border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-gray-500">Empresas Activas</span>
              <Building className="text-blue-500" size={18} />
            </div>
            <div className="text-2xl font-black">{activeTenantsCount}</div>
            <span className="text-[10px] text-gray-500">De {tenants.length} registradas</span>
          </div>

          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0f0f11]/50 border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-gray-500">Cobros Pendientes</span>
              <CreditCard className="text-orange-500" size={18} />
            </div>
            <div className="text-2xl font-black text-orange-500">{pendingTransfers.length}</div>
            <span className="text-[10px] text-gray-500">Por transferencia bancaria</span>
          </div>

          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0f0f11]/50 border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-gray-500">MRR Estimado</span>
              <DollarSign className="text-emerald-500" size={18} />
            </div>
            <div className="text-2xl font-black text-emerald-500">${mrr.toFixed(2)}</div>
            <span className="text-[10px] text-gray-500">Suscripciones activas</span>
          </div>

          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0f0f11]/50 border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-gray-500">Estado del Sistema</span>
              <Activity className="text-indigo-500" size={18} />
            </div>
            <div className="text-2xl font-black">Online</div>
            <span className="text-[10px] text-gray-500">Servidores operativos</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-slate-200/50 dark:border-white/5 mb-8 select-none">
          <button 
            onClick={() => setActiveTab('tenants')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all ${activeTab === 'tenants' ? 'border-[#1C40F2] text-primary dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Empresas (Tenants)
          </button>
          <button 
            onClick={() => setActiveTab('transfers')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'transfers' ? 'border-[#1C40F2] text-primary dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Transferencias Bancarias
            {pendingTransfers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black">{pendingTransfers.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all ${activeTab === 'plans' ? 'border-[#1C40F2] text-primary dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Personalización de Planes
          </button>
        </div>

        {/* LOADING INDICATOR */}
        {loading && <div className="text-center py-10 font-bold text-xs">Cargando datos del panel...</div>}

        {/* TAB 1: TENANTS LIST */}
        {!loading && activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar empresa por Razón Social o ID..."
                  className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl outline-none border ${isDarkMode ? 'bg-[#0f0f11]/60 border-white/5 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-black'}`}
                />
              </div>
            </div>

            <div className={`overflow-x-auto rounded-2xl border ${isDarkMode ? 'bg-[#0f0f11]/30 border-white/5' : 'bg-white border-slate-200'}`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider text-gray-500 ${isDarkMode ? 'border-white/5 bg-white/2' : 'border-slate-100 bg-slate-50'}`}>
                    <th className="px-6 py-4">Empresa</th>
                    <th className="px-6 py-4">Inquilino ID</th>
                    <th className="px-6 py-4">Plan</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Expiración</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/5 text-xs font-medium">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-500 font-semibold">No se encontraron empresas.</td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-slate-100/10 dark:hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4 font-bold">{tenant.companyName}</td>
                        <td className="px-6 py-4 font-mono text-gray-500">{tenant.id}</td>
                        <td className="px-6 py-4 capitalize">{tenant.planId} ({tenant.billingPeriod || 'mensual'})</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                            tenant.planStatus === 'active' ? 'bg-emerald-500/15 text-emerald-500' :
                            tenant.planStatus === 'trial' ? 'bg-blue-500/15 text-blue-500' :
                            tenant.planStatus === 'pending_approval' ? 'bg-orange-500/15 text-orange-500 animate-pulse' :
                            'bg-red-500/15 text-red-500'
                          }`}>
                            {tenant.planStatus === 'active' ? 'Activo' :
                             tenant.planStatus === 'trial' ? 'Prueba' :
                             tenant.planStatus === 'pending_approval' ? 'Por Aprobar' : 'Suspendido'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{new Date(tenant.expiresAt).toLocaleDateString('es-EC')}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setEditingTenant(tenant)} 
                            className="p-1.5 rounded-lg hover:bg-slate-500/20 text-indigo-500"
                            title="Editar Suscripción"
                          >
                            <Edit3 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSFERS APPROVAL */}
        {!loading && activeTab === 'transfers' && (
          <div className="space-y-6">
            <div className={`overflow-x-auto rounded-2xl border ${isDarkMode ? 'bg-[#0f0f11]/30 border-white/5' : 'bg-white border-slate-200'}`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider text-gray-500 ${isDarkMode ? 'border-white/5 bg-white/2' : 'border-slate-100 bg-slate-50'}`}>
                    <th className="px-6 py-4">Empresa (Tenant)</th>
                    <th className="px-6 py-4">Plan solicitado</th>
                    <th className="px-6 py-4">Monto</th>
                    <th className="px-6 py-4">Referencia</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/5 text-xs font-medium">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-500 font-semibold">No hay solicitudes de transferencia.</td>
                    </tr>
                  ) : (
                    transfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-slate-100/10 dark:hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold">{transfer.companyName || 'Empresa'}</div>
                          <div className="text-[10px] font-mono text-gray-500">{transfer.tenantId}</div>
                        </td>
                        <td className="px-6 py-4 capitalize">{transfer.planId} ({transfer.billingPeriod})</td>
                        <td className="px-6 py-4 font-bold text-emerald-500">${transfer.amount || '0.00'}</td>
                        <td className="px-6 py-4 font-mono">{transfer.referenceNumber}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                            transfer.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500' :
                            transfer.status === 'pending' ? 'bg-orange-500/15 text-orange-500 animate-pulse' :
                            'bg-red-500/15 text-red-500'
                          }`}>
                            {transfer.status === 'approved' ? 'Aprobado' :
                             transfer.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {transfer.status === 'pending' ? (
                              <>
                                <button 
                                  onClick={() => handleApproveTransfer(transfer)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                  title="Aprobar Pago"
                                >
                                  <Check size={14} />
                                </button>
                                <button 
                                  onClick={() => handleRejectTransfer(transfer)}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                  title="Rechazar Pago"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-500">Procesado</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PLANS DYNAMIC CONFIG */}
        {!loading && activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="text-left max-w-md">
              <h3 className="text-sm font-extrabold mb-1">Personalización Dinámica de Planes</h3>
              <p className="text-[11px] text-gray-500 leading-normal">Edita los precios, límites y módulos activos para cada plan. Los cambios se guardan en la base de datos Firestore y se propagan instantáneamente a todos los clientes del SaaS.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.id} className={`p-6 rounded-2xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#0f0f11]/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div>
                    <h4 className="text-sm font-bold mb-3">{plan.name}</h4>
                    <div className="space-y-3.5 text-[11px] text-gray-500">
                      <div className="flex justify-between">
                        <span>Precio Mensual:</span>
                        <strong className="text-gray-900 dark:text-white">${plan.priceMonthly}/mes</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Precio Anual (por mes):</span>
                        <strong className="text-gray-900 dark:text-white">${plan.priceYearly}/mes</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Usuarios Permitidos:</span>
                        <strong className="text-gray-900 dark:text-white">{plan.maxUsers === 9999 ? 'Ilimitados' : plan.maxUsers}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Productos en Inventario:</span>
                        <strong className="text-gray-900 dark:text-white">{plan.maxProducts === 99999 ? 'Ilimitados' : plan.maxProducts}</strong>
                      </div>
                      <div>
                        <span className="block mb-1">Módulos Habilitados:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.modules.map(mod => (
                            <span key={mod} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[9px] font-bold text-[#1C40F2] uppercase">{mod}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setEditingPlan(plan)}
                    className="w-full mt-6 py-2.5 text-xs font-bold border border-[#1C40F2] text-primary dark:text-white hover:bg-[#1C40F2] hover:text-white rounded-xl transition-all"
                  >
                    Personalizar Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* EDIT TENANT SUBSCRIPTION MODAL */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-xl ${isDarkMode ? 'bg-[#0f0f11] border-white/10 text-white' : 'bg-white border-slate-200 text-black'}`}>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-bold">Editar Suscripción de Inquilino</h4>
              <button onClick={() => setEditingTenant(null)} className="text-gray-400 hover:text-white"><X size={16}/></button>
            </div>
            <form onSubmit={handleSaveTenantEdit} className="space-y-4 text-left text-xs">
              <div>
                <label className="block font-bold mb-1">Empresa</label>
                <input type="text" value={editingTenant.companyName} disabled className="w-full p-2.5 rounded-lg bg-slate-500/10 text-gray-500 border border-white/5" />
              </div>
              <div>
                <label className="block font-bold mb-1">Plan</label>
                <select 
                  value={editingTenant.planId} 
                  onChange={e => setEditingTenant({ ...editingTenant, planId: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Profesional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Estado de Suscripción</label>
                <select 
                  value={editingTenant.planStatus} 
                  onChange={e => setEditingTenant({ ...editingTenant, planStatus: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
                >
                  <option value="trial">Periodo de Prueba</option>
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Vencimiento del Plan</label>
                <input 
                  type="date" 
                  value={editingTenant.expiresAt ? new Date(editingTenant.expiresAt).toISOString().split('T')[0] : ''}
                  onChange={e => setEditingTenant({ ...editingTenant, expiresAt: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setEditingTenant(null)} className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAN CONFIG MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-xl ${isDarkMode ? 'bg-[#0f0f11] border-white/10 text-white' : 'bg-white border-slate-200 text-black'}`}>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-bold">Personalizar: Plan {editingPlan.name}</h4>
              <button onClick={() => setEditingPlan(null)} className="text-gray-400 hover:text-white"><X size={16}/></button>
            </div>
            <form onSubmit={handleSavePlanEdit} className="space-y-4 text-left text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Precio Mensual ($ USD)</label>
                  <input 
                    type="number" 
                    value={editingPlan.priceMonthly} 
                    onChange={e => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Precio Anual ($ USD/mes)</label>
                  <input 
                    type="number" 
                    value={editingPlan.priceYearly} 
                    onChange={e => setEditingPlan({ ...editingPlan, priceYearly: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Límite de Usuarios</label>
                  <input 
                    type="number" 
                    value={editingPlan.maxUsers} 
                    onChange={e => setEditingPlan({ ...editingPlan, maxUsers: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Límite de Productos</label>
                  <input 
                    type="number" 
                    value={editingPlan.maxProducts} 
                    onChange={e => setEditingPlan({ ...editingPlan, maxProducts: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${isDarkMode ? 'bg-[#151722] border-white/10' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-2">Módulos Habilitados</label>
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl border border-white/5 bg-white/2">
                  {['dashboard', 'ventas', 'finances', 'inventario', 'personas', 'calendar', 'contabilidad'].map((mod) => {
                    const isChecked = editingPlan.modules.includes(mod);
                    return (
                      <label key={mod} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-white/5 uppercase font-bold text-[10px] tracking-wide">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {
                            const newModules = isChecked 
                              ? editingPlan.modules.filter(m => m !== mod)
                              : [...editingPlan.modules, mod];
                            setEditingPlan({ ...editingPlan, modules: newModules });
                          }}
                        />
                        {mod}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
