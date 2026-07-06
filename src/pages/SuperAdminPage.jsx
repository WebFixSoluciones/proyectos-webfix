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
  DollarSign,
  Menu,
  LayoutDashboard,
  ChevronLeft,
  Plus,
  ShieldAlert,
  Download,
  RefreshCw
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth, firebaseConfig } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function SuperAdminPage({ showToast }) {
  const navigate = useNavigate();
  const { currentUser, logout, role } = useAuth();
  
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'tenants' | 'transfers' | 'plans'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'edit' | 'create'
  
  // Firestore collections state
  const [tenants, setTenants] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Tenant Details State (for inline editing)
  const [selectedTenantDetails, setSelectedTenantDetails] = useState(null);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [tenantStats, setTenantStats] = useState({ transactionsCount: 0, productsCount: 0 });
  const [loadingTenantDetails, setLoadingTenantDetails] = useState(false);

  // Modals / Edit states
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // New Tenant Creation Form State
  const [newTenantForm, setNewTenantForm] = useState({
    companyName: '',
    tenantId: '',
    email: '',
    planId: 'starter',
    planStatus: 'trial',
    billingPeriod: 'monthly',
    initialPassword: '',
    sendResetEmail: true
  });
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  // God Mode States
  const [godModeCollection, setGodModeCollection] = useState('finances_transactions');
  const [godModeData, setGodModeData] = useState([]);
  const [isLoadingGodMode, setIsLoadingGodMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // Gating check: ensure only superadmins can access this page
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
    }, (error) => {
      console.warn("Superadmin tenants subscription blocked by security rules:", error);
    });

    // 2. Listen to Transfers
    const unsubTransfers = onSnapshot(collection(db, 'transfers'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setTransfers(list);
    }, (error) => {
      console.warn("Superadmin transfers subscription blocked by security rules:", error);
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

  // Set default initial password on form setup
  useEffect(() => {
    if (viewMode === 'create') {
      const randPassword = Math.random().toString(36).slice(-8) + 'A1!';
      setNewTenantForm(prev => ({ ...prev, initialPassword: randPassword }));
    }
  }, [viewMode]);

  // Fetch tenant details under Approach A (accounts list and consumptions metrics)
  const handleSelectTenant = async (tenant) => {
    setSelectedTenantDetails(tenant);
    setLoadingTenantDetails(true);
    setTenantUsers([]);
    setTenantStats({ transactionsCount: 0, productsCount: 0 });
    setViewMode('edit');
    
    try {
      // 1. Fetch user list from tenant artifacts info doc
      const metaDocRef = doc(db, 'artifacts', tenant.id, 'public', 'data', 'meta', 'info');
      const metaSnap = await getDoc(metaDocRef);
      if (metaSnap.exists()) {
        setTenantUsers(metaSnap.data().users || []);
      }
      
      // 2. Fetch counts of invoices/transactions
      const txColRef = collection(db, 'artifacts', tenant.id, 'public', 'data', 'finances_transactions');
      const txSnap = await getDocs(txColRef);
      
      // 3. Fetch count of inventory products
      const prodColRef = collection(db, 'artifacts', tenant.id, 'public', 'data', 'inventory_products');
      const prodSnap = await getDocs(prodColRef);
      
      setTenantStats({
        transactionsCount: txSnap.size,
        productsCount: prodSnap.size
      });
    } catch (error) {
      console.error("Error cargando detalles del inquilino:", error);
      showToast("Error al cargar detalles de consumo de la empresa", "error");
    } finally {
      setLoadingTenantDetails(false);
    }
  };

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

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'tenants', selectedTenantDetails.id), {
        planId: selectedTenantDetails.planId,
        planStatus: selectedTenantDetails.planStatus,
        expiresAt: new Date(selectedTenantDetails.expiresAt).toISOString()
      });
      showToast("Suscripción de inquilino actualizada correctamente", "success");
      setViewMode('list');
      setSelectedTenantDetails(null);
    } catch (err) {
      showToast("Error al actualizar la suscripción", "error");
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

  // --- GOD MODE FUNCTIONS ---
  const handleExportBackup = async () => {
    if (!selectedTenantDetails) return;
    setIsExporting(true);
    try {
      const collections = [
        'finances_transactions',
        'finances_third_parties',
        'inventory_products',
        'finances_liabilities',
        'finances_settings',
        'meta'
      ];
      const backupData = {};
      
      for (const colName of collections) {
        const colRef = collection(db, 'artifacts', selectedTenantDetails.id, 'public', 'data', colName);
        const snap = await getDocs(colRef);
        backupData[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_tenant_${selectedTenantDetails.id}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast("Backup generado y descargado exitosamente", "success");
    } catch (err) {
      console.error("Error exporting backup:", err);
      showToast("Error al generar el backup", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const loadGodModeData = async () => {
    if (!selectedTenantDetails) return;
    setIsLoadingGodMode(true);
    try {
      const colRef = collection(db, 'artifacts', selectedTenantDetails.id, 'public', 'data', godModeCollection);
      const snap = await getDocs(colRef);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        const dateA = a.createdAt || a.date || a.updatedAt || '';
        const dateB = b.createdAt || b.date || b.updatedAt || '';
        return dateB.localeCompare(dateA);
      });
      setGodModeData(data.slice(0, 150));
    } catch (err) {
      console.error("Error loading god mode data:", err);
      showToast("Error al cargar los datos crudos", "error");
    } finally {
      setIsLoadingGodMode(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'edit' && selectedTenantDetails) {
      loadGodModeData();
    }
  }, [viewMode, selectedTenantDetails, godModeCollection]);

  const handleDeleteGodModeDoc = async (docId) => {
    if (!window.confirm(`PELIGRO (God Mode): Estás a punto de borrar permanentemente el documento ${docId}. Esta acción saltará todas las reglas del ERP y no se puede deshacer. ¿Continuar?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', selectedTenantDetails.id, 'public', 'data', godModeCollection, docId));
      showToast(`Documento ${docId} eliminado exitosamente`, "success");
      setGodModeData(prev => prev.filter(d => d.id !== docId));
      
      if (godModeCollection === 'finances_transactions') {
        setTenantStats(prev => ({...prev, transactionsCount: Math.max(0, prev.transactionsCount - 1)}));
      } else if (godModeCollection === 'inventory_products') {
        setTenantStats(prev => ({...prev, productsCount: Math.max(0, prev.productsCount - 1)}));
      }
    } catch (err) {
      console.error("Error deleting doc:", err);
      showToast("Error al eliminar documento", "error");
    }
  };

  const handleWipeSandbox = async () => {
    if (!selectedTenantDetails) return;
    const confirmId = window.prompt(
      `ZONA DE PELIGRO (God Mode):\n` +
      `Estás a punto de ELIMINAR permanentemente TODOS los datos operativos (Gastos, Ventas, Clientes/Proveedores, Productos e Inventario, Créditos/Obligaciones) del inquilino "${selectedTenantDetails.companyName}".\n\n` +
      `Esta acción NO se puede deshacer y desconfigurará temporalmente el ERP del cliente hasta que registre nuevos datos.\n\n` +
      `Para confirmar, escribe exactamente el ID del inquilino ("${selectedTenantDetails.id}") a continuación:`
    );

    if (confirmId !== selectedTenantDetails.id) {
      if (confirmId !== null) {
        showToast("Confirmación incorrecta. Operación cancelada.", "error");
      }
      return;
    }

    setIsWiping(true);
    try {
      const collectionsToWipe = [
        'finances_transactions',
        'finances_third_parties',
        'inventory_products',
        'finances_liabilities'
      ];

      let totalDeleted = 0;
      for (const colName of collectionsToWipe) {
        const colRef = collection(db, 'artifacts', selectedTenantDetails.id, 'public', 'data', colName);
        const snap = await getDocs(colRef);
        
        for (const docObj of snap.docs) {
          await deleteDoc(doc(db, 'artifacts', selectedTenantDetails.id, 'public', 'data', colName, docObj.id));
          totalDeleted++;
        }
      }

      setTenantStats({ transactionsCount: 0, productsCount: 0 });
      setGodModeData([]);
      
      showToast(`Sandbox de inquilino limpiado con éxito. Se eliminaron ${totalDeleted} documentos.`, "success");
    } catch (err) {
      console.error("Error wiping sandbox:", err);
      showToast("Error al limpiar el sandbox del inquilino: " + err.message, "error");
    } finally {
      setIsWiping(false);
    }
  };
  // --------------------------

  // Manual Tenant and Admin creation logic via Temporary Firebase App
  const handleCreateTenant = async (e) => {
    e.preventDefault();
    
    const companyName = newTenantForm.companyName.trim();
    const cleanTenantId = newTenantForm.tenantId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const email = newTenantForm.email.trim();
    const password = newTenantForm.initialPassword;

    if (!companyName || !cleanTenantId || !email || !password) {
      showToast("Por favor complete todos los campos obligatorios.", "warning");
      return;
    }

    if (tenants.some(t => t.id === cleanTenantId)) {
      showToast("El ID de Inquilino ya existe en el sistema.", "error");
      return;
    }

    setIsCreatingTenant(true);

    let tempApp = null;
    try {
      // 1. Create User in Firebase Auth using a secondary temporary Firebase app instance
      const tempAppName = `TempApp_${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);
      
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const user = userCredential.user;
      const uid = user.uid;

      // Clean up the temporary app instance immediately
      await tempApp.delete();
      tempApp = null;

      // 2. Set expiration date (default to +14 days for trial, +30 days for active starter/prof)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (newTenantForm.planStatus === 'trial' ? 14 : 30));

      // 3. Write Tenant doc in Firestore
      const tenantData = {
        id: cleanTenantId,
        companyName: companyName,
        planId: newTenantForm.planId,
        planStatus: newTenantForm.planStatus,
        billingPeriod: newTenantForm.billingPeriod,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      await setDoc(doc(db, 'tenants', cleanTenantId), tenantData);

      // 4. Write User doc in Firestore
      const userData = {
        uid: uid,
        name: `Admin ${companyName}`,
        email: email,
        tenantId: cleanTenantId,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', uid), userData);

      // 5. Initialize Workspace configurations for billing settings
      const configRef = doc(db, 'artifacts', cleanTenantId, 'public', 'data', 'finances_settings', 'config');
      await setDoc(configRef, {
        razonSocial: companyName,
        nombreComercial: companyName,
        ruc: '',
        direccionMatriz: '',
        telefono: '',
        email: email,
        web: '',
        obligadoContabilidad: false,
        agenteRetencion: false,
        contribuyenteEspecial: '',
        contribuyenteRimpe: 'regimen_general',
        smtpHost: '',
        smtpPort: '465',
        smtpUser: '',
        smtpPass: '',
        smtpSecure: true,
        firmaUrl: '',
        firmaPass: '',
        geminiApiKey: ''
      });

      // 6. Initialize Workspace metadata info (Admin account link)
      const metaRef = doc(db, 'artifacts', cleanTenantId, 'public', 'data', 'meta', 'info');
      await setDoc(metaRef, {
        users: [{ email: email, role: 'admin', name: `Admin ${companyName}`, active: true }],
        trash: [],
        googleClientId: ''
      });

      // 7. Trigger Password Reset email for security (so they can reset/confirm login details)
      if (newTenantForm.sendResetEmail) {
        await sendPasswordResetEmail(auth, email);
        showToast("Empresa creada y correo de restablecimiento enviado.", "success");
      } else {
        showToast("Empresa creada manualmente con éxito.", "success");
      }

      // Reset form & go back to list
      setNewTenantForm({
        companyName: '',
        tenantId: '',
        email: '',
        planId: 'starter',
        planStatus: 'trial',
        billingPeriod: 'monthly',
        initialPassword: '',
        sendResetEmail: true
      });
      setViewMode('list');

    } catch (err) {
      console.error("Error creating manual tenant:", err);
      showToast(`Error al crear empresa: ${err.message}`, "error");
      
      // Clean up temp app if it failed midway
      if (tempApp) {
        try {
          await tempApp.delete();
        } catch (_) {}
      }
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.id?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants', label: 'Empresas (Tenants)', icon: Building },
    { id: 'transfers', label: 'Aprobaciones', icon: CreditCard, count: pendingTransfers.length },
    { id: 'plans', label: 'Tarifas y Planes', icon: Sliders }
  ];

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${'bg-[#f4f4f9] text-gray-800'}`}>
      
      {/* Sidebar Overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* COLLAPSIBLE SIDEBAR */}
      <aside 
        className={`flex flex-col border-r shrink-0 transition-all duration-300 z-50 backdrop-blur-3xl absolute md:relative h-full ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-0 hidden md:flex md:w-16'
        } ${'bg-white/95 border-primary/10'}`}
      >
        {/* Header Logo */}
        <div className={`h-16 flex items-center ${isSidebarOpen ? 'justify-between px-5' : 'justify-center'} border-b ${'border-black/5'} shrink-0 overflow-hidden`}>
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center">
                <Settings size={16} className="text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Master Admin</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center">
              <Settings size={16} className="text-white" />
            </div>
          )}
        </div>

        {/* Links Area */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
          {sidebarLinks.map(link => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  setActiveTab(link.id);
                  setViewMode('list'); // Return to list view on tab change
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-3' : 'justify-center'} py-2.5 rounded-lg text-xs transition-all ${
                  isActive 
                    ? 'bg-[#1C40F2] text-white font-bold' 
                    : ('text-gray-600 hover:bg-slate-100 hover:text-black')
                }`}
                title={link.label}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400'} />
                  {isSidebarOpen && <span>{link.label}</span>}
                </div>
                {isSidebarOpen && link.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black">{link.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Settings Area */}
        <div className={`p-4 border-t ${'border-black/5'} space-y-2 shrink-0`}>

          {/* Go to ERP */}
          <button
            onClick={() => navigate('/app')}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 gap-3' : 'justify-center'} py-2 rounded-lg text-xs transition-colors ${
              'text-gray-600 hover:bg-slate-100 hover:text-black'
            }`}
          >
            <Building size={15} className="text-gray-400" />
            {isSidebarOpen && <span>Ir al ERP</span>}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 gap-3' : 'justify-center'} py-2 rounded-lg text-xs text-red-500 hover:bg-red-500/10 transition-colors`}
          >
            <LogOut size={15} />
            {isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* HEADER */}
        <header className={`h-16 flex items-center justify-between px-6 border-b shrink-0 ${'bg-white/95 border-black/5'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 rounded-lg transition-colors ${'hover:bg-white/60 text-gray-600'}`}
              title="Alternar Menú"
            >
              <Menu size={18} />
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-[#1C40F2]">Consola SaaS Master Admin</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Sistemas OK
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          
          {/* TAB 0: DASHBOARD DEDICADO */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`p-6 rounded-2xl border ${'bg-white border-black/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-500">Empresas Activas</span>
                    <Building className="text-blue-500" size={18} />
                  </div>
                  <div className="text-2xl font-black">{activeTenantsCount}</div>
                  <span className="text-[10px] text-gray-500">De {tenants.length} registradas</span>
                </div>

                <div className={`p-6 rounded-2xl border ${'bg-white border-black/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-500">Cobros Pendientes</span>
                    <CreditCard className="text-orange-500" size={18} />
                  </div>
                  <div className="text-2xl font-black text-orange-500">{pendingTransfers.length}</div>
                  <span className="text-[10px] text-gray-500">Por transferencia bancaria</span>
                </div>

                <div className={`p-6 rounded-2xl border ${'bg-white border-black/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-500">MRR Estimado</span>
                    <DollarSign className="text-emerald-500" size={18} />
                  </div>
                  <div className="text-2xl font-black text-emerald-500">${mrr.toFixed(2)}</div>
                  <span className="text-[10px] text-gray-500">Suscripciones activas</span>
                </div>

                <div className={`p-6 rounded-2xl border ${'bg-white border-black/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-500">Estado del Sistema</span>
                    <Activity className="text-indigo-500" size={18} />
                  </div>
                  <div className="text-2xl font-black">Online</div>
                  <span className="text-[10px] text-gray-500">Servidores operativos</span>
                </div>
              </div>

              {/* Dashboard details */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recientes */}
                <div className={`p-6 rounded-2xl border ${'bg-white border-slate-200'} space-y-4`}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Últimos Clientes Registrados</h3>
                  <div className="divide-y divide-slate-200/50 dark:divide-white/5">
                    {tenants.slice(0, 5).map((t, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold">{t.companyName || 'Empresa'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{t.id}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          t.planStatus === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {t.planId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cobros pendientes rápidos */}
                <div className={`p-6 rounded-2xl border ${'bg-white border-slate-200'} space-y-4`}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Transferencias en Espera</h3>
                  {pendingTransfers.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-4">No hay transferencias pendientes de verificación.</p>
                  ) : (
                    <div className="divide-y divide-slate-200/50 dark:divide-white/5">
                      {pendingTransfers.slice(0, 5).map((tr, idx) => (
                        <div key={idx} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold">{tr.companyName}</p>
                            <p className="text-[10px] text-gray-400 font-mono">Ref: {tr.referenceNumber}</p>
                          </div>
                          <span className="font-black text-emerald-500 font-mono">${tr.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: TENANTS TAB */}
          {activeTab === 'tenants' && (
            <div>
              {/* VIEW MODE: LIST */}
              {viewMode === 'list' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar empresa por Razón Social o ID..."
                        className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-xl outline-none border ${'bg-white border-slate-200 text-black'}`}
                      />
                    </div>
                    
                    <button 
                      onClick={() => setViewMode('create')}
                      className="px-4 py-2.5 bg-primary hover:bg-[#1633c1] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors self-end sm:self-auto"
                    >
                      <Plus size={14} /> Agregar Empresa
                    </button>
                  </div>

                  <div className={`overflow-x-auto rounded-2xl border ${'bg-white border-slate-200'}`}>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-[10px] font-bold uppercase tracking-wider text-gray-500 ${'border-slate-100 bg-slate-50'}`}>
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
                                  onClick={() => handleSelectTenant(tenant)} 
                                  className="p-1.5 rounded-lg bg-[#1C40F2]/10 text-primary dark:text-white hover:bg-[#1C40F2] hover:text-white transition-colors"
                                  title="Ver Detalles y Editar"
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

              {/* VIEW MODE: EDIT INLINE (Approach A / No Popups / No Drawers) */}
              {viewMode === 'edit' && selectedTenantDetails && (
                <div className="space-y-6">
                  {/* Inline header navigation */}
                  <div className="flex items-center gap-4 mb-4 border-b border-slate-200/50 dark:border-white/5 pb-4">
                    <button 
                      onClick={() => { setViewMode('list'); setSelectedTenantDetails(null); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                        'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <ChevronLeft size={14} /> Volver al Listado
                    </button>
                    <div>
                      <h2 className="text-base font-black text-black dark:text-white">Empresa: {selectedTenantDetails.companyName}</h2>
                      <p className="text-[10px] font-mono text-gray-500">Inquilino ID: {selectedTenantDetails.id}</p>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Edit subscription form */}
                    <div className={`lg:col-span-5 p-6 rounded-2xl border ${'bg-white border-slate-200'} space-y-4`}>
                      <h3 className="text-xs font-black uppercase tracking-wider text-primary">Configuración de Suscripción</h3>
                      
                      <form onSubmit={handleUpdateSubscription} className="space-y-4 text-xs">
                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Plan SaaS</label>
                          <select 
                            value={selectedTenantDetails.planId || 'starter'} 
                            onChange={e => setSelectedTenantDetails({ ...selectedTenantDetails, planId: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300'}`}
                          >
                            <option value="starter">Starter</option>
                            <option value="professional">Profesional</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Estado de Cuenta</label>
                          <select 
                            value={selectedTenantDetails.planStatus || 'trial'} 
                            onChange={e => setSelectedTenantDetails({ ...selectedTenantDetails, planStatus: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300'}`}
                          >
                            <option value="trial">Prueba (Trial)</option>
                            <option value="active">Activo</option>
                            <option value="suspended">Suspendido</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Fecha de Expiración</label>
                          <input 
                            type="date" 
                            value={selectedTenantDetails.expiresAt ? new Date(selectedTenantDetails.expiresAt).toISOString().split('T')[0] : ''}
                            onChange={e => setSelectedTenantDetails({ ...selectedTenantDetails, expiresAt: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300'}`}
                          />
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                          <button 
                            type="button" 
                            onClick={() => { setViewMode('list'); setSelectedTenantDetails(null); }}
                            className="px-4 py-2.5 rounded-lg border border-slate-200/50 dark:border-white/10 hover:bg-slate-500/10 font-semibold text-gray-500"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="submit" 
                            className="px-4 py-2.5 rounded-lg bg-primary hover:bg-[#1633c1] text-white font-bold transition-colors"
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Right Column: Consumption metrics and team accounts table */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Consumption stats */}
                      <div className={`p-6 rounded-2xl border ${'bg-white border-slate-200'} space-y-4`}>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Métricas de Consumo ERP</h3>
                        
                        {loadingTenantDetails ? (
                          <div className="text-center py-4 text-gray-500 font-semibold">Cargando métricas de consumo...</div>
                        ) : (
                          <div className="space-y-4 text-xs">
                            {/* Users count */}
                            <div>
                              <div className="flex justify-between mb-1.5">
                                <span className="font-bold">Usuarios en Equipo:</span>
                                <span className="font-mono font-bold">
                                  {tenantUsers.length} / {plans.find(p => p.id === selectedTenantDetails.planId)?.maxUsers === 9999 ? 'Ilimitados' : plans.find(p => p.id === selectedTenantDetails.planId)?.maxUsers || 3}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-300" 
                                  style={{ 
                                    width: `${Math.min(100, (tenantUsers.length / (plans.find(p => p.id === selectedTenantDetails.planId)?.maxUsers || 3)) * 100)}%` 
                                  }}
                                />
                              </div>
                            </div>

                            {/* Products count */}
                            <div>
                              <div className="flex justify-between mb-1.5">
                                <span className="font-bold">Productos en Inventario:</span>
                                <span className="font-mono font-bold">
                                  {tenantStats.productsCount} / {plans.find(p => p.id === selectedTenantDetails.planId)?.maxProducts === 99999 ? 'Ilimitados' : plans.find(p => p.id === selectedTenantDetails.planId)?.maxProducts || 100}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                <div 
                                  className="h-full bg-amber-500 transition-all duration-300" 
                                  style={{ 
                                    width: `${Math.min(100, (tenantStats.productsCount / (plans.find(p => p.id === selectedTenantDetails.planId)?.maxProducts || 100)) * 100)}%` 
                                  }}
                                />
                              </div>
                            </div>

                            {/* Transactions count */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200/50 dark:border-white/5 text-xs">
                              <span className="font-bold">Transacciones Emitidas (Facturación / Gastos):</span>
                              <span className="font-mono font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20">{tenantStats.transactionsCount}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accounts table ("Cuentas de cada cliente") */}
                      <div className={`p-6 rounded-2xl border ${'bg-white border-slate-200'} space-y-4`}>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Cuentas de Usuarios Registradas</h3>
                        
                        {loadingTenantDetails ? (
                          <div className="text-center py-4 text-gray-500 font-semibold">Cargando cuentas...</div>
                        ) : tenantUsers.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No hay cuentas de usuario asociadas.</p>
                        ) : (
                          <div className="border border-slate-200/50 dark:border-white/5 rounded-xl overflow-hidden text-xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                                  <th className="px-4 py-3">Nombre / Email</th>
                                  <th className="px-4 py-3">Rol</th>
                                  <th className="px-4 py-3">Acceso</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                                {tenantUsers.map((user, idx) => (
                                  <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="font-bold">{user.name}</div>
                                      <div className="text-[10px] text-gray-400 font-mono">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-3 capitalize font-semibold text-gray-700 dark:text-gray-300">
                                      {user.role || 'Colaborador'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${user.active !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {user.active !== false ? 'Activo' : 'Inactivo'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                  {/* GOD MODE SECTION (Bottom full width) */}
                  <div className={`mt-8 p-6 rounded-2xl border ${'bg-red-50/80 border-red-200'} space-y-6`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                        <ShieldAlert size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-red-500">God Mode: Herramientas Avanzadas y Mitigación</h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Peligro: Estas herramientas modifican directamente la base de datos saltándose las reglas del ERP.</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={handleExportBackup}
                        disabled={isExporting}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Download size={14} /> 
                        {isExporting ? 'Generando JSON...' : 'Generar Backup Completo (JSON)'}
                      </button>

                      <button 
                        onClick={handleWipeSandbox}
                        disabled={isWiping}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors border border-red-500/30"
                      >
                        <XCircle size={14} /> 
                        {isWiping ? 'Limpiando Sandbox...' : 'Resetear Sandbox (Vaciar Data)'}
                      </button>
                    </div>

                    <div className={`p-5 rounded-xl border ${'bg-white/60 border-slate-200'}`}>
                      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Explorador de Datos Crudos</h4>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Colección:</label>
                          <select 
                            value={godModeCollection}
                            onChange={(e) => setGodModeCollection(e.target.value)}
                            className={`p-1.5 text-xs font-mono rounded-lg border outline-none ${'bg-white border-slate-300 text-black'}`}
                          >
                            <option value="finances_transactions">finances_transactions</option>
                            <option value="finances_third_parties">finances_third_parties</option>
                            <option value="inventory_products">inventory_products</option>
                            <option value="finances_liabilities">finances_liabilities</option>
                            <option value="finances_settings">finances_settings</option>
                            <option value="meta">meta</option>
                          </select>
                          <button onClick={loadGodModeData} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Refrescar Datos">
                            <RefreshCw size={14} className={isLoadingGodMode ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </div>

                      {isLoadingGodMode ? (
                        <div className="text-center py-6 text-gray-500 text-xs font-semibold">Cargando datos crudos...</div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200/50 dark:border-white/5">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className={`bg-slate-100 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/5 text-[9px] font-bold uppercase tracking-wider text-gray-500`}>
                              <tr>
                                <th className="px-4 py-3">ID Documento</th>
                                <th className="px-4 py-3">Datos Clave (JSON Extract)</th>
                                <th className="px-4 py-3 text-right">Acción Peligrosa</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                              {godModeData.length === 0 ? (
                                <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-500 font-semibold italic">Colección vacía.</td></tr>
                              ) : (
                                godModeData.map(docData => (
                                  <tr key={docData.id} className="hover:bg-red-500/10 transition-colors">
                                    <td className="px-4 py-3 font-mono text-[10px] text-gray-600 dark:text-gray-300 font-bold">{docData.id}</td>
                                    <td className="px-4 py-3">
                                      <div className="max-w-xl truncate font-mono text-[9px] text-gray-500 bg-black/5 dark:bg-white/5 p-1 rounded">
                                        {JSON.stringify(docData).substring(0, 150)}...
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <button 
                                        onClick={() => handleDeleteGodModeDoc(docData.id)}
                                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded text-[9px] font-black uppercase transition-colors"
                                      >
                                        Forzar Borrado
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                          {godModeData.length === 150 && (
                            <div className="p-2 text-center text-[9px] text-amber-500 font-bold bg-amber-500/10 border-t border-amber-500/20">Mostrando solo los 150 registros más recientes.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW MODE: CREATE INLINE */}
              {viewMode === 'create' && (
                <div className="space-y-6">
                  {/* Inline header */}
                  <div className="flex items-center gap-4 mb-4 border-b border-slate-200/50 dark:border-white/5 pb-4">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                        'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <ChevronLeft size={14} /> Volver al Listado
                    </button>
                    <h2 className="text-base font-black text-black dark:text-white">Agregar Nueva Empresa (Creación Manual)</h2>
                  </div>

                  <div className={`max-w-2xl p-6 rounded-2xl border ${'bg-white border-slate-200'}`}>
                    <form onSubmit={handleCreateTenant} className="space-y-4 text-xs text-left">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Razón Social *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. WebFix Soluciones Cia. Ltda."
                            value={newTenantForm.companyName}
                            onChange={e => setNewTenantForm({ ...newTenantForm, companyName: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-350 text-black'}`}
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Inquilino ID / RUC *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. org_webfix or 1792945281001"
                            value={newTenantForm.tenantId}
                            onChange={e => setNewTenantForm({ ...newTenantForm, tenantId: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-350 text-black'}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Email del Super Administrador *</label>
                          <input 
                            type="email" 
                            required
                            placeholder="Ej. cliente@empresa.com"
                            value={newTenantForm.email}
                            onChange={e => setNewTenantForm({ ...newTenantForm, email: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-350 text-black'}`}
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Contraseña Inicial *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. ContraseñaTemporal"
                            value={newTenantForm.initialPassword}
                            onChange={e => setNewTenantForm({ ...newTenantForm, initialPassword: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none font-mono ${'bg-white border-slate-350 text-black'}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Plan SaaS</label>
                          <select 
                            value={newTenantForm.planId}
                            onChange={e => setNewTenantForm({ ...newTenantForm, planId: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300 text-black'}`}
                          >
                            <option value="starter">Starter</option>
                            <option value="professional">Profesional</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Período</label>
                          <select 
                            value={newTenantForm.billingPeriod}
                            onChange={e => setNewTenantForm({ ...newTenantForm, billingPeriod: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300 text-black'}`}
                          >
                            <option value="monthly">Mensual</option>
                            <option value="yearly">Anual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-gray-500">Estado Inicial</label>
                          <select 
                            value={newTenantForm.planStatus}
                            onChange={e => setNewTenantForm({ ...newTenantForm, planStatus: e.target.value })}
                            className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300 text-black'}`}
                          >
                            <option value="trial">Prueba (14 días)</option>
                            <option value="active">Activo</option>
                            <option value="suspended">Suspendido</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#CAD1F4] dark:border-white/5 bg-slate-50 dark:bg-white/2 flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="sendResetEmail"
                          checked={newTenantForm.sendResetEmail}
                          onChange={e => setNewTenantForm({ ...newTenantForm, sendResetEmail: e.target.checked })}
                          className="w-4 h-4 cursor-pointer accent-primary"
                        />
                        <label htmlFor="sendResetEmail" className="cursor-pointer font-semibold text-gray-750 dark:text-gray-300 select-none">
                          Enviar link de recuperación de contraseña inmediatamente por correo electrónico (Mayor Seguridad)
                        </label>
                      </div>

                      <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-white/5">
                        <button 
                          type="button" 
                          onClick={() => setViewMode('list')}
                          className="px-4 py-2.5 rounded-lg border border-slate-200/50 dark:border-white/10 hover:bg-slate-500/10 font-semibold text-gray-500"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={isCreatingTenant}
                          className="px-5 py-2.5 rounded-lg bg-primary hover:bg-[#1633c1] text-white font-bold flex items-center gap-2"
                        >
                          {isCreatingTenant ? 'Creando Empresa...' : 'Crear Inquilino y Enviar Correo'}
                        </button>
                      </div>

                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRANSFERS APPROVAL */}
          {!loading && activeTab === 'transfers' && (
            <div className="space-y-6">
              <div className={`overflow-x-auto rounded-2xl border ${'bg-white border-slate-200'}`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-bold uppercase tracking-wider text-gray-500 ${'border-slate-100 bg-slate-50'}`}>
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
                  <div key={plan.id} className={`p-6 rounded-2xl border flex flex-col justify-between ${'bg-white border-slate-200'}`}>
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
                      className="w-full mt-6 py-2.5 text-xs font-bold border border-[#1C40F2] text-[#1C40F2] hover:bg-[#1C40F2] hover:text-white rounded-xl transition-all"
                    >
                      Personalizar Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* EDIT PLAN CONFIG MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-xl ${'bg-white border-slate-200 text-black'}`}>
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
                    className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Precio Anual ($ USD/mes)</label>
                  <input 
                    type="number" 
                    value={editingPlan.priceYearly} 
                    onChange={e => setEditingPlan({ ...editingPlan, priceYearly: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300'}`}
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
                    className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Límite de Productos</label>
                  <input 
                    type="number" 
                    value={editingPlan.maxProducts} 
                    onChange={e => setEditingPlan({ ...editingPlan, maxProducts: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${'bg-white border-slate-300'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-2">Módulos Habilitados</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-3 rounded-xl border border-white/5 bg-white/2">
                  {(() => {
                    const moduleLabels = {
                      dashboard: 'Dashboard',
                      ventas: 'Ventas',
                      finances: 'Finanzas/Ingresos',
                      compras: 'Compras',
                      gastos_creditos: 'Gastos y Créditos',
                      inventario: 'Inventario',
                      personas: 'Personas (Contactos)',
                      calendar: 'Calendario',
                      team: 'Equipo',
                      proyectos_general: 'Proyectos',
                      contabilidad: 'Contabilidad SRI'
                    };
                    return Object.keys(moduleLabels).map((mod) => {
                      const isChecked = editingPlan.modules?.includes(mod) || false;
                      return (
                        <label key={mod} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/5 font-semibold text-xs tracking-wide">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              const currentModules = editingPlan.modules || [];
                              const newModules = isChecked 
                                ? currentModules.filter(m => m !== mod)
                                : [...currentModules, mod];
                              setEditingPlan({ ...editingPlan, modules: newModules });
                            }}
                          />
                          {moduleLabels[mod]}
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#1C40F2] text-white font-bold">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
