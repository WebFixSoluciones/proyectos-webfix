import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UiInput } from '../components/ui/controls';
import { 
  Building, 
  CreditCard, 
  Settings, 
  XCircle, 
  Search, 
  Activity, 
  Edit3, 
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
  RefreshCw,
  Eye,
  Globe,
  Copy,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { query, where, runTransaction } from 'firebase/firestore';
import { reconcileSriDocument, batchReconcileSriDocuments, scanAllTenantsPendingSri, getDocumentTypeName } from '../services/sriReconciliation';
import { notifyAuthorizedInvoice } from '../services/invoiceNotification';
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

  // Monitor SRI Global States
  const [pendingSriDocs, setPendingSriDocs] = useState([]);
  const [isScanningSri, setIsScanningSri] = useState(false);
  const [isReconcilingSri, setIsReconcilingSri] = useState(false);
  const [reconcileProgress, setReconcileProgress] = useState({ current: 0, total: 0, currentDoc: null });
  const [reconcileStats, setReconcileStats] = useState({ authorized: 0, stillPending: 0, failed: 0 });
  const [sriSearchTerm, setSriSearchTerm] = useState('');
  const [sriDocTypeFilter, setSriDocTypeFilter] = useState('all');
  const [verifyingDocId, setVerifyingDocId] = useState(null);
  const [lastScanDate, setLastScanDate] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, role]);

  // Load Tenants, Transfers, and Plans
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    } catch {
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
    } catch {
      showToast("Error al actualizar la suscripción", "error");
    }
  };

  const handleSavePlanEdit = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'plans', editingPlan.id), editingPlan, { merge: true });
      showToast(`Configuración del plan ${editingPlan.name} guardada`, "success");
      setEditingPlan(null);
    } catch {
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadGodModeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedTenantDetails, godModeCollection]);

  const handleDeleteGodModeDoc = async (docId) => {
    if (!await window.confirm(`PELIGRO (God Mode): Estás a punto de borrar permanentemente el documento ${docId}. Esta acción saltará todas las reglas del ERP y no se puede deshacer. ¿Continuar?`)) {
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
        } catch (cleanupErr) {
          console.warn("Error al limpiar app temporal después de error de creación:", cleanupErr);
        }
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

  // Monitor SRI Global Handlers
  const handleScanAllSri = async (silent = false) => {
    if (!tenants || tenants.length === 0) return;
    setIsScanningSri(true);
    try {
      const api = { collection, query, where, getDocs };
      const res = await scanAllTenantsPendingSri({ db, tenants, api });
      setPendingSriDocs(res.pendingDocs);
      setLastScanDate(new Date());
      if (!silent) {
        showToast(
          res.totalPendingCount > 0
            ? `Escaneo finalizado: ${res.totalPendingCount} comprobantes pendientes en ${res.affectedTenantCount} empresas.`
            : "¡Excelente! No hay comprobantes pendientes de autorización en ninguna empresa.",
          res.totalPendingCount > 0 ? "warning" : "success"
        );
      }
    } catch (err) {
      console.error("Error al escanear comprobantes SRI:", err);
      if (!silent) showToast(`Error al escanear comprobantes SRI: ${err.message}`, "error");
    } finally {
      setIsScanningSri(false);
    }
  };

  useEffect(() => {
    if (tenants.length > 0 && pendingSriDocs.length === 0 && !isScanningSri && !lastScanDate) {
      handleScanAllSri(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenants]);

  const handleReconcileSingle = async (item) => {
    setVerifyingDocId(item.id);
    try {
      const docLabel = getDocumentTypeName(item.documentType);
      showToast(`Consultando ${docLabel} ${item.documentNumber || item.claveAcceso} en el SRI...`, "info");
      const api = { doc, runTransaction, getDoc, setDoc };
      const res = await reconcileSriDocument({
        db,
        appId: item.tenantId,
        document: item,
        api,
        notify: notifyAuthorizedInvoice
      });

      if (res.status === 'autorizado') {
        showToast(`¡${docLabel} ${item.documentNumber} AUTORIZADO por el SRI!`, "success");
        setPendingSriDocs(prev => prev.filter(d => !(d.id === item.id && d.tenantId === item.tenantId)));
        setReconcileStats(prev => ({ ...prev, authorized: prev.authorized + 1 }));
      } else if (res.status === 'no_autorizado' || res.status === 'devuelto') {
        showToast(`SRI devolvió comprobante: ${res.message}`, "error");
        setPendingSriDocs(prev => prev.map(d => (d.id === item.id && d.tenantId === item.tenantId) ? { ...d, sriStatus: res.status, sriLastError: res.message } : d));
        setReconcileStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      } else {
        showToast(res.message || "Continúa en procesamiento en el SRI. Vuelve a consultar en unos minutos.", "warning");
        setReconcileStats(prev => ({ ...prev, stillPending: prev.stillPending + 1 }));
      }
    } catch (err) {
      showToast(`Error al reconciliar: ${err.message}`, "error");
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleBatchReconcileSri = async () => {
    if (pendingSriDocs.length === 0) return;
    setIsReconcilingSri(true);
    setReconcileProgress({ current: 0, total: pendingSriDocs.length, currentDoc: null });

    try {
      const api = { doc, runTransaction, getDoc, setDoc };
      const stats = await batchReconcileSriDocuments({
        db,
        documents: pendingSriDocs,
        api,
        notify: notifyAuthorizedInvoice,
        onProgress: (p) => setReconcileProgress(p),
        delayMs: 350
      });

      setReconcileStats(prev => ({
        authorized: prev.authorized + stats.authorized,
        stillPending: prev.stillPending + stats.stillPending,
        failed: prev.failed + stats.failed
      }));

      showToast(
        `Reconciliación en lote completada: ${stats.authorized} autorizados, ${stats.stillPending} pendientes, ${stats.failed} devueltos.`,
        stats.authorized > 0 ? "success" : "info"
      );

      await handleScanAllSri(true);
    } catch (err) {
      showToast(`Error en reconciliación en lote: ${err.message}`, "error");
    } finally {
      setIsReconcilingSri(false);
      setReconcileProgress({ current: 0, total: 0, currentDoc: null });
    }
  };

  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast("Clave de acceso copiada al portapapeles", "info");
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants', label: 'Empresas (Tenants)', icon: Building },
    { id: 'sri_monitor', label: 'Monitor SRI Global', icon: ShieldAlert, count: pendingSriDocs.length },
    { id: 'transfers', label: 'Aprobaciones', icon: CreditCard, count: pendingTransfers.length },
    { id: 'plans', label: 'Tarifas y Planes', icon: Sliders }
  ];

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${'bg-surface-card text-text-heading'}`}>
      
      {/* Sidebar Overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* COLLAPSIBLE SIDEBAR */}
      <aside 
        className={`flex flex-col border-r shrink-0 transition-all duration-300 z-50 absolute md:relative h-full ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-0 hidden md:flex md:w-16'
        } ${'bg-white/95 border-primary/10'}`}
      >
        {/* Header Logo */}
        <div className={`h-16 flex items-center ${isSidebarOpen ? 'justify-between px-5' : 'justify-center'} border-b ${'border-black/5'} shrink-0 overflow-hidden`}>
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-card bg-primary flex items-center justify-center">
                <Settings size={16} className="text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-black ">Master Admin</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-card bg-primary flex items-center justify-center">
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
                className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-3' : 'justify-center'} py-2.5 rounded-md text-xs transition-all ${
                  isActive 
                    ? 'bg-surface-card text-white font-bold' 
                    : ('text-text-primary hover:bg-surface-muted hover:text-black')
                }`}
                title={link.label}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-text-secondary'} />
                  {isSidebarOpen && <span>{link.label}</span>}
                </div>
                {isSidebarOpen && link.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold">{link.count}</span>
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
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 gap-3' : 'justify-center'} py-2 rounded-md text-xs transition-colors ${
              'text-text-primary hover:bg-surface-muted hover:text-black'
            }`}
          >
            <Building size={15} className="text-text-secondary" />
            {isSidebarOpen && <span>Ir al ERP</span>}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 gap-3' : 'justify-center'} py-2 rounded-md text-xs text-red-500 hover:bg-red-500/10 transition-colors`}
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
              className={`p-1.5 rounded-md transition-colors ${'hover:bg-white/60 text-text-primary'}`}
              title="Alternar Menú"
            >
              <Menu size={18} />
            </button>
            <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Consola SaaS Master Admin</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase">
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
                <div className={`p-6 rounded-card border ${'bg-white border-black/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-text-secondary">Empresas Activas</span>
                    <Building className="text-blue-500" size={18} />
                  </div>
                  <div className="text-2xl font-semibold">{activeTenantsCount}</div>
                  <span className="text-xs text-text-secondary">De {tenants.length} registradas</span>
                </div>

                <div className={`p-6 rounded-card border ${'bg-white border-black/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-text-secondary">Cobros Pendientes</span>
                    <CreditCard className="text-orange-500" size={18} />
                  </div>
                  <div className="text-2xl font-semibold text-orange-500">{pendingTransfers.length}</div>
                  <span className="text-xs text-text-secondary">Por transferencia bancaria</span>
                </div>

                <div className={`p-6 rounded-card border ${'bg-white border-black/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-text-secondary">MRR Estimado</span>
                    <DollarSign className="text-emerald-500" size={18} />
                  </div>
                  <div className="text-2xl font-semibold text-emerald-500">${mrr.toFixed(2)}</div>
                  <span className="text-xs text-text-secondary">Suscripciones activas</span>
                </div>

                <div className={`p-6 rounded-card border ${'bg-white border-black/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-text-secondary">Estado del Sistema</span>
                    <Activity className="text-indigo-500" size={18} />
                  </div>
                  <div className="text-2xl font-semibold">Online</div>
                  <span className="text-xs text-text-secondary">Servidores operativos</span>
                </div>
              </div>

              {/* Dashboard details */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recientes */}
                <div className={`p-6 rounded-card border ${'bg-white border-border-default'} space-y-4`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Últimos Clientes Registrados</h3>
                  <div className="divide-y divide-slate-200/50 ">
                    {tenants.slice(0, 5).map((t, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold">{t.companyName || 'Empresa'}</p>
                          <p className="text-xs text-text-secondary font-mono">{t.id}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          t.planStatus === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {t.planId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cobros pendientes rápidos */}
                <div className={`p-6 rounded-card border ${'bg-white border-border-default'} space-y-4`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Transferencias en Espera</h3>
                  {pendingTransfers.length === 0 ? (
                    <p className="text-xs text-text-secondary italic py-4">No hay transferencias pendientes de verificación.</p>
                  ) : (
                    <div className="divide-y divide-slate-200/50 ">
                      {pendingTransfers.slice(0, 5).map((tr, idx) => (
                        <div key={idx} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold">{tr.companyName}</p>
                            <p className="text-xs text-text-secondary font-mono">Ref: {tr.referenceNumber}</p>
                          </div>
                          <span className="font-semibold text-emerald-500 font-mono">${tr.amount}</span>
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
                    <div className="w-full sm:max-w-md">
                      <UiInput 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar empresa por Razón Social o ID..."
                        iconPrefix={<Search size={14} className="text-[var(--gray-10)]" />}
                        size="2"
                        className="w-full"
                      />
                    </div>
                    
                    <button 
                      onClick={() => setViewMode('create')}
                      className="px-4 py-2.5 bg-primary hover:bg-surface-card text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors self-end sm:self-auto"
                    >
                      <Plus size={14} /> Agregar Empresa
                    </button>
                  </div>

                  <div className={`overflow-x-auto rounded-card border ${'bg-white border-border-default'}`}>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-xs font-bold uppercase tracking-wider text-text-secondary ${'border-border-default bg-surface-bg'}`}>
                          <th className="px-6 py-4">Empresa</th>
                          <th className="px-6 py-4">Inquilino ID</th>
                          <th className="px-6 py-4">Plan</th>
                          <th className="px-6 py-4">Estado</th>
                          <th className="px-6 py-4">Expiración</th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50  text-xs font-medium">
                        {filteredTenants.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-10 text-text-secondary font-semibold">No se encontraron empresas.</td>
                          </tr>
                        ) : (
                          filteredTenants.map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-surface-muted/10  transition-colors">
                              <td className="px-6 py-4 font-bold">{tenant.companyName}</td>
                              <td className="px-6 py-4 font-mono text-text-secondary">{tenant.id}</td>
                              <td className="px-6 py-4 capitalize">{tenant.planId} ({tenant.billingPeriod || 'mensual'})</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
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
                                  className="p-1.5 rounded-md bg-surface-card/10 text-primary  hover:bg-surface-card hover:text-white transition-colors"
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
                  <div className="flex items-center gap-4 mb-4 border-b border-border-default/50  pb-4">
                    <button 
                      onClick={() => { setViewMode('list'); setSelectedTenantDetails(null); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 ${
                        'border-border-default hover:bg-surface-bg text-text-primary'
                      }`}
                    >
                      <ChevronLeft size={14} /> Volver al Listado
                    </button>
                    <div>
                      <h2 className="text-base font-semibold text-black ">Empresa: {selectedTenantDetails.companyName}</h2>
                      <p className="text-xs font-mono text-text-secondary">Inquilino ID: {selectedTenantDetails.id}</p>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Edit subscription form */}
                    <div className={`lg:col-span-5 p-6 rounded-card border ${'bg-white border-border-default'} space-y-4`}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Configuración de Suscripción</h3>
                      
                      <form onSubmit={handleUpdateSubscription} className="space-y-4 text-xs">
                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Plan SaaS</label>
                          <select 
                            value={selectedTenantDetails.planId || 'starter'} 
                            onChange={e => setSelectedTenantDetails({ ...selectedTenantDetails, planId: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong'}`}
                          >
                            <option value="starter">Starter</option>
                            <option value="professional">Profesional</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Estado de Cuenta</label>
                          <select 
                            value={selectedTenantDetails.planStatus || 'trial'} 
                            onChange={e => setSelectedTenantDetails({ ...selectedTenantDetails, planStatus: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong'}`}
                          >
                            <option value="trial">Prueba (Trial)</option>
                            <option value="active">Activo</option>
                            <option value="suspended">Suspendido</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Fecha de Expiración</label>
                          <input 
                            type="date" 
                            value={selectedTenantDetails.expiresAt ? new Date(selectedTenantDetails.expiresAt).toISOString().split('T')[0] : ''}
                            onChange={e => setSelectedTenantDetails({ ...selectedTenantDetails, expiresAt: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong'}`}
                          />
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                          <button 
                            type="button" 
                            onClick={() => { setViewMode('list'); setSelectedTenantDetails(null); }}
                            className="px-4 py-2.5 rounded-md border border-border-default/50  hover:bg-surface-sidebar/10 font-semibold text-text-secondary"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="submit" 
                            className="px-4 py-2.5 rounded-md bg-primary hover:bg-surface-card text-white font-bold transition-colors"
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Right Column: Consumption metrics and team accounts table */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Consumption stats */}
                      <div className={`p-6 rounded-card border ${'bg-white border-border-default'} space-y-4`}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Métricas de Consumo ERP</h3>
                        
                        {loadingTenantDetails ? (
                          <div className="text-center py-4 text-text-secondary font-semibold">Cargando métricas de consumo...</div>
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
                              <div className="w-full h-2 rounded-full bg-surface-muted  overflow-hidden">
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
                              <div className="w-full h-2 rounded-full bg-surface-muted  overflow-hidden">
                                <div 
                                  className="h-full bg-amber-500 transition-all duration-300" 
                                  style={{ 
                                    width: `${Math.min(100, (tenantStats.productsCount / (plans.find(p => p.id === selectedTenantDetails.planId)?.maxProducts || 100)) * 100)}%` 
                                  }}
                                />
                              </div>
                            </div>

                            {/* Transactions count */}
                            <div className="flex justify-between items-center pt-3 border-t border-border-default/50  text-xs">
                              <span className="font-bold">Transacciones Emitidas (Facturación / Gastos):</span>
                              <span className="font-mono font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20">{tenantStats.transactionsCount}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accounts table ("Cuentas de cada cliente") */}
                      <div className={`p-6 rounded-card border ${'bg-white border-border-default'} space-y-4`}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Cuentas de Usuarios Registradas</h3>
                        
                        {loadingTenantDetails ? (
                          <div className="text-center py-4 text-text-secondary font-semibold">Cargando cuentas...</div>
                        ) : tenantUsers.length === 0 ? (
                          <p className="text-xs text-text-secondary italic">No hay cuentas de usuario asociadas.</p>
                        ) : (
                          <div className="border border-border-default/50  rounded-card overflow-hidden text-xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-surface-muted  border-b border-border-default/50  text-xs font-bold uppercase tracking-wider text-text-secondary">
                                  <th className="px-4 py-3">Nombre / Email</th>
                                  <th className="px-4 py-3">Rol</th>
                                  <th className="px-4 py-3">Acceso</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/50 ">
                                {tenantUsers.map((user, idx) => (
                                  <tr key={idx} className="hover:bg-surface-sidebar/5 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="font-bold">{user.name}</div>
                                      <div className="text-xs text-text-secondary font-mono">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-3 capitalize font-semibold text-text-primary ">
                                      {user.role || 'Colaborador'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${user.active !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
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
                  <div className={`mt-8 p-6 rounded-card border ${'bg-red-50/80 border-red-200'} space-y-6`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-red-500/10 text-red-500">
                        <ShieldAlert size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500">God Mode: Herramientas Avanzadas y Mitigación</h3>
                        <p className="text-xs text-text-secondary ">Peligro: Estas herramientas modifican directamente la base de datos saltándose las reglas del ERP.</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={handleExportBackup}
                        disabled={isExporting}
                        className="px-4 py-2 bg-text-heading hover:bg-surface-sidebar text-white text-xs font-bold rounded-md flex items-center gap-2 transition-colors"
                      >
                        <Download size={14} /> 
                        {isExporting ? 'Generando JSON...' : 'Generar Backup Completo (JSON)'}
                      </button>

                      <button 
                        onClick={handleWipeSandbox}
                        disabled={isWiping}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white text-xs font-bold rounded-md flex items-center gap-2 transition-colors border border-red-500/30"
                      >
                        <XCircle size={14} /> 
                        {isWiping ? 'Limpiando Sandbox...' : 'Resetear Sandbox (Vaciar Data)'}
                      </button>
                    </div>

                    <div className={`p-5 rounded-card border ${'bg-white/60 border-border-default'}`}>
                      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase text-text-primary ">Explorador de Datos Crudos</h4>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-text-secondary uppercase">Colección:</label>
                          <select 
                            value={godModeCollection}
                            onChange={(e) => setGodModeCollection(e.target.value)}
                            className={`p-1.5 text-xs font-mono rounded-md border outline-none ${'bg-white border-border-strong text-black'}`}
                          >
                            <option value="finances_transactions">finances_transactions</option>
                            <option value="finances_third_parties">finances_third_parties</option>
                            <option value="inventory_products">inventory_products</option>
                            <option value="finances_liabilities">finances_liabilities</option>
                            <option value="finances_settings">finances_settings</option>
                            <option value="meta">meta</option>
                          </select>
                          <button onClick={loadGodModeData} className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Refrescar Datos">
                            <RefreshCw size={14} className={isLoadingGodMode ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </div>

                      {isLoadingGodMode ? (
                        <div className="text-center py-6 text-text-secondary text-xs font-semibold">Cargando datos crudos...</div>
                      ) : (
                        <div className="overflow-x-auto rounded-md border border-border-default/50 ">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className={`bg-surface-muted  border-b border-border-default/50  text-xs font-bold uppercase tracking-wider text-text-secondary`}>
                              <tr>
                                <th className="px-4 py-3">ID Documento</th>
                                <th className="px-4 py-3">Datos Clave (JSON Extract)</th>
                                <th className="px-4 py-3 text-right">Acción Peligrosa</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50 ">
                              {godModeData.length === 0 ? (
                                <tr><td colSpan="3" className="px-4 py-8 text-center text-text-secondary font-semibold italic">Colección vacía.</td></tr>
                              ) : (
                                godModeData.map(docData => (
                                  <tr key={docData.id} className="hover:bg-red-500/10 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-text-primary  font-bold">{docData.id}</td>
                                    <td className="px-4 py-3">
                                      <div className="max-w-xl truncate font-mono text-xs text-text-secondary bg-black/5  p-1 rounded">
                                        {JSON.stringify(docData).substring(0, 150)}...
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <button 
                                        onClick={() => handleDeleteGodModeDoc(docData.id)}
                                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded text-xs font-semibold uppercase transition-colors"
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
                            <div className="p-2 text-center text-xs text-amber-500 font-bold bg-amber-500/10 border-t border-amber-500/20">Mostrando solo los 150 registros más recientes.</div>
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
                  <div className="flex items-center gap-4 mb-4 border-b border-border-default/50  pb-4">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 ${
                        'border-border-default hover:bg-surface-bg text-text-primary'
                      }`}
                    >
                      <ChevronLeft size={14} /> Volver al Listado
                    </button>
                    <h2 className="text-base font-semibold text-black ">Agregar Nueva Empresa (Creación Manual)</h2>
                  </div>

                  <div className={`max-w-2xl p-6 rounded-card border ${'bg-white border-border-default'}`}>
                    <form onSubmit={handleCreateTenant} className="space-y-4 text-xs text-left">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Razón Social *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. WebFix Soluciones Cia. Ltda."
                            value={newTenantForm.companyName}
                            onChange={e => setNewTenantForm({ ...newTenantForm, companyName: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-slate-350 text-black'}`}
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Inquilino ID / RUC *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. org_webfix or 1792945281001"
                            value={newTenantForm.tenantId}
                            onChange={e => setNewTenantForm({ ...newTenantForm, tenantId: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-slate-350 text-black'}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Email del Super Administrador *</label>
                          <input 
                            type="email" 
                            required
                            placeholder="Ej. cliente@empresa.com"
                            value={newTenantForm.email}
                            onChange={e => setNewTenantForm({ ...newTenantForm, email: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-slate-350 text-black'}`}
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Contraseña Inicial *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. ContraseñaTemporal"
                            value={newTenantForm.initialPassword}
                            onChange={e => setNewTenantForm({ ...newTenantForm, initialPassword: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none font-mono ${'bg-white border-slate-350 text-black'}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Plan SaaS</label>
                          <select 
                            value={newTenantForm.planId}
                            onChange={e => setNewTenantForm({ ...newTenantForm, planId: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong text-black'}`}
                          >
                            <option value="starter">Starter</option>
                            <option value="professional">Profesional</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Período</label>
                          <select 
                            value={newTenantForm.billingPeriod}
                            onChange={e => setNewTenantForm({ ...newTenantForm, billingPeriod: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong text-black'}`}
                          >
                            <option value="monthly">Mensual</option>
                            <option value="yearly">Anual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-text-secondary">Estado Inicial</label>
                          <select 
                            value={newTenantForm.planStatus}
                            onChange={e => setNewTenantForm({ ...newTenantForm, planStatus: e.target.value })}
                            className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong text-black'}`}
                          >
                            <option value="trial">Prueba (14 días)</option>
                            <option value="active">Activo</option>
                            <option value="suspended">Suspendido</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-card border border-border-default  bg-surface-bg  flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="sendResetEmail"
                          checked={newTenantForm.sendResetEmail}
                          onChange={e => setNewTenantForm({ ...newTenantForm, sendResetEmail: e.target.checked })}
                          className="w-4 h-4 cursor-pointer accent-primary"
                        />
                        <label htmlFor="sendResetEmail" className="cursor-pointer font-semibold text-gray-750  select-none">
                          Enviar link de recuperación de contraseña inmediatamente por correo electrónico (Mayor Seguridad)
                        </label>
                      </div>

                      <div className="flex gap-3 justify-end pt-4 border-t border-border-default ">
                        <button 
                          type="button" 
                          onClick={() => setViewMode('list')}
                          className="px-4 py-2.5 rounded-md border border-border-default/50  hover:bg-surface-sidebar/10 font-semibold text-text-secondary"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={isCreatingTenant}
                          className="px-5 py-2.5 rounded-md bg-primary hover:bg-surface-card text-white font-bold flex items-center gap-2"
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
              <div className={`overflow-x-auto rounded-card border ${'bg-white border-border-default'}`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs font-bold uppercase tracking-wider text-text-secondary ${'border-border-default bg-surface-bg'}`}>
                      <th className="px-6 py-4">Empresa (Tenant)</th>
                      <th className="px-6 py-4">Plan solicitado</th>
                      <th className="px-6 py-4">Monto</th>
                      <th className="px-6 py-4">Referencia</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50  text-xs font-medium">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-10 text-text-secondary font-semibold">No hay solicitudes de transferencia.</td>
                      </tr>
                    ) : (
                      transfers.map((transfer) => (
                        <tr key={transfer.id} className="hover:bg-surface-muted/10  transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold">{transfer.companyName || 'Empresa'}</div>
                            <div className="text-xs font-mono text-text-secondary">{transfer.tenantId}</div>
                          </td>
                          <td className="px-6 py-4 capitalize">{transfer.planId} ({transfer.billingPeriod})</td>
                          <td className="px-6 py-4 font-bold text-emerald-500">${transfer.amount || '0.00'}</td>
                          <td className="px-6 py-4 font-mono">{transfer.referenceNumber}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
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
                              <button 
                                onClick={() => setSelectedTransfer(transfer)}
                                className="p-1.5 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 cursor-pointer"
                                title="Ver Comprobante y Detalles"
                              >
                                <Eye size={14} />
                              </button>
                              {transfer.status === 'pending' ? (
                                <>
                                  <button 
                                    onClick={() => handleApproveTransfer(transfer)}
                                    className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 cursor-pointer"
                                    title="Aprobar Pago"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleRejectTransfer(transfer)}
                                    className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer"
                                    title="Rechazar Pago"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-text-secondary">Procesado</span>
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
                <h3 className="text-sm font-semibold mb-1">Personalización Dinámica de Planes</h3>
                <p className="text-xs text-text-secondary leading-normal">Edita los precios, límites y módulos activos para cada plan. Los cambios se guardan en la base de datos Firestore y se propagan instantáneamente a todos los clientes del SaaS.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div key={plan.id} className={`p-6 rounded-card border flex flex-col justify-between ${'bg-white border-border-default'}`}>
                    <div>
                      <h4 className="text-sm font-bold mb-3">{plan.name}</h4>
                      <div className="space-y-3.5 text-xs text-text-secondary">
                        <div className="flex justify-between">
                          <span>Precio Mensual:</span>
                          <strong className="text-text-heading ">${plan.priceMonthly}/mes</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Precio Anual (por mes):</span>
                          <strong className="text-text-heading ">${plan.priceYearly}/mes</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Usuarios Permitidos:</span>
                          <strong className="text-text-heading ">{plan.maxUsers === 9999 ? 'Ilimitados' : plan.maxUsers}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Productos en Inventario:</span>
                          <strong className="text-text-heading ">{plan.maxProducts === 99999 ? 'Ilimitados' : plan.maxProducts}</strong>
                        </div>
                        <div>
                          <span className="block mb-1">Módulos Habilitados:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {plan.modules.map(mod => (
                              <span key={mod} className="px-2 py-0.5 rounded bg-surface-muted  text-xs font-bold text-text-secondary uppercase">{mod}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setEditingPlan(plan)}
                      className="w-full mt-6 py-2.5 text-xs font-bold border border-border-default text-text-secondary hover:bg-surface-card hover:text-white rounded-card transition-all"
                    >
                      Personalizar Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: MONITOR SRI GLOBAL MULTI-TENANT */}
          {activeTab === 'sri_monitor' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-card border border-border-default">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      <ShieldAlert size={18} />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">Monitor SRI Global Multi-Tenant</h3>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Supervisa y mitiga en tiempo real contingencias del SRI en todos los inquilinos sin pérdida de secuencial fiscal.
                    {lastScanDate && (
                      <span className="ml-2 text-slate-400">
                        Último escaneo: {lastScanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleScanAllSri(false)}
                    disabled={isScanningSri || isReconcilingSri}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isScanningSri ? "animate-spin" : ""} />
                    <span>{isScanningSri ? "Escaneando inquilinos..." : "Escanear Inquilinos"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchReconcileSri}
                    disabled={isReconcilingSri || pendingSriDocs.length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-all shadow-none disabled:opacity-50"
                  >
                    <Zap size={14} className={isReconcilingSri ? "animate-bounce text-amber-400" : "text-emerald-400"} />
                    <span>{isReconcilingSri ? "Sincronizando lote..." : `Sincronizar Todos con SRI (${pendingSriDocs.length})`}</span>
                  </button>
                </div>
              </div>

              {/* KPIs Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-card border bg-white border-border-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-secondary">Documentos Pendientes</span>
                    <span className="p-1 rounded bg-amber-50 text-amber-700"><ShieldAlert size={16}/></span>
                  </div>
                  <div className="text-2xl font-extrabold text-amber-700">{pendingSriDocs.length}</div>
                  <span className="text-[11px] text-text-secondary">En cola de confirmación SRI</span>
                </div>

                <div className="p-5 rounded-card border bg-white border-border-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-secondary">Empresas Afectadas</span>
                    <span className="p-1 rounded bg-blue-50 text-blue-700"><Building size={16}/></span>
                  </div>
                  <div className="text-2xl font-extrabold text-blue-700">
                    {new Set(pendingSriDocs.map(d => d.tenantId)).size}
                  </div>
                  <span className="text-[11px] text-text-secondary">De {tenants.length} registradas</span>
                </div>

                <div className="p-5 rounded-card border bg-white border-border-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-secondary">Reconciliados en Sesión</span>
                    <span className="p-1 rounded bg-emerald-50 text-emerald-700"><CheckCircle2 size={16}/></span>
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700">{reconcileStats.authorized}</div>
                  <span className="text-[11px] text-text-secondary">Autorizados y notificados</span>
                </div>

                <div className="p-5 rounded-card border bg-white border-border-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-secondary">Pasarela SRI WebServices</span>
                    <span className="p-1 rounded bg-emerald-50 text-emerald-700"><Globe size={16}/></span>
                  </div>
                  <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 pt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    SOAP Online
                  </div>
                  <span className="text-[11px] text-text-secondary">Producción (cel.sri.gob.ec)</span>
                </div>
              </div>

              {/* Batch Reconciliation Progress Bar */}
              {isReconcilingSri && (
                <div className="p-5 rounded-card border bg-slate-900 text-white space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-amber-400" />
                      Reconciliando en lote: {reconcileProgress.current} de {reconcileProgress.total}
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {reconcileProgress.total > 0 ? Math.round((reconcileProgress.current / reconcileProgress.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${reconcileProgress.total > 0 ? (reconcileProgress.current / reconcileProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  {reconcileProgress.currentDoc && (
                    <div className="text-[11px] text-slate-400 truncate">
                      Procesando: <strong className="text-white">{reconcileProgress.currentDoc.tenantName}</strong> - {reconcileProgress.currentDoc.documentNumber || reconcileProgress.currentDoc.claveAcceso}
                    </div>
                  )}
                </div>
              )}

              {/* Toolbar: Search and Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-card border border-border-default">
                <div className="w-full sm:w-72">
                  <UiInput
                    placeholder="Buscar empresa, secuencial o clave..."
                    value={sriSearchTerm}
                    onChange={(e) => setSriSearchTerm(e.target.value)}
                    iconPrefix={<Search size={14} className="text-slate-400" />}
                    size="2"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'factura', label: 'Facturas' },
                    { id: 'retencion', label: 'Retenciones' },
                    { id: 'nota_credito', label: 'N. Crédito' },
                    { id: 'guia_remision', label: 'Guías' },
                    { id: 'liquidacion_compra', label: 'Liquidaciones' }
                  ].map(tab => {
                    const isTabActive = sriDocTypeFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSriDocTypeFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${isTabActive ? 'bg-[#0F172A] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table of Pending Documents */}
              <div className="bg-white rounded-card border border-border-default overflow-hidden">
                {(() => {
                  const filtered = pendingSriDocs.filter(d => {
                    const matchType = sriDocTypeFilter === 'all' || d.documentType === sriDocTypeFilter;
                    const term = sriSearchTerm.toLowerCase();
                    const matchSearch = !term ||
                      d.documentNumber?.toLowerCase().includes(term) ||
                      d.claveAcceso?.includes(term) ||
                      d.tenantName?.toLowerCase().includes(term) ||
                      d.tenantId?.toLowerCase().includes(term) ||
                      d.thirdParty?.name?.toLowerCase().includes(term);
                    return matchType && matchSearch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle2 size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">Comprobantes al día en todos los tenants</h4>
                        <p className="text-xs text-text-secondary max-w-md mx-auto">
                          {pendingSriDocs.length === 0
                            ? "No existen documentos pendientes de autorización en ninguna empresa. La continuidad de secuenciales está 100% garantizada."
                            : "No hay documentos que coincidan con los filtros aplicados."}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-border-default text-text-secondary uppercase text-[11px] font-bold tracking-wider">
                          <tr>
                            <th className="p-3.5 pl-5">Empresa / Inquilino</th>
                            <th className="p-3.5">Tipo</th>
                            <th className="p-3.5">Secuencial</th>
                            <th className="p-3.5">Clave de Acceso (49 dígitos)</th>
                            <th className="p-3.5">Receptor</th>
                            <th className="p-3.5 text-right">Total</th>
                            <th className="p-3.5 text-center">Estado SRI</th>
                            <th className="p-3.5 text-right pr-5">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default text-slate-800">
                          {filtered.map((item) => {
                            const isVerifying = verifyingDocId === item.id;
                            const docTypeLabel = getDocumentTypeName(item.documentType);
                            return (
                              <tr key={`${item.tenantId}_${item.id}`} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3.5 pl-5">
                                  <div className="font-bold text-slate-900">{item.tenantName}</div>
                                  <div className="font-mono text-[11px] text-text-secondary">{item.tenantId}</div>
                                </td>
                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">
                                    {docTypeLabel}
                                  </span>
                                </td>
                                <td className="p-3.5 font-mono font-bold text-slate-900">
                                  {item.documentNumber || 'Sin número'}
                                </td>
                                <td className="p-3.5">
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                                    <span>{item.claveAcceso ? `${item.claveAcceso.slice(0, 10)}...${item.claveAcceso.slice(-10)}` : 'Sin clave'}</span>
                                    {item.claveAcceso && (
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(item.claveAcceso, item.id)}
                                        title="Copiar clave completa"
                                        className="p-1 text-slate-400 hover:text-slate-800 rounded cursor-pointer"
                                      >
                                        <Copy size={12} className={copiedKey === item.id ? "text-emerald-600" : ""} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3.5 max-w-[180px] truncate">
                                  <div className="font-semibold truncate">{item.thirdParty?.name || item.thirdParty?.razonSocial || 'Consumidor Final'}</div>
                                  <div className="text-[11px] text-text-secondary font-mono">{item.thirdParty?.ruc || ''}</div>
                                </td>
                                <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                                  ${Number(item.total || 0).toFixed(2)}
                                </td>
                                <td className="p-3.5 text-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                    {item.sriStatus === 'pendiente_sri' ? 'Pendiente SRI' : item.sriStatus}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right pr-5">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleReconcileSingle(item)}
                                      disabled={isVerifying || isReconcilingSri}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                                      title="Consultar autorización en el SRI ahora"
                                    >
                                      <RefreshCw size={12} className={isVerifying ? "animate-spin text-amber-600" : ""} />
                                      <span>{isVerifying ? "Consultando..." : "Consultar SRI"}</span>
                                    </button>
                                    <a
                                      href={`/#/public/ride?txId=${encodeURIComponent(item.id)}&claveAcceso=${encodeURIComponent(item.claveAcceso || '')}&tenantId=${encodeURIComponent(item.tenantId)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                      title="Ver visor RIDE público"
                                    >
                                      <ExternalLink size={14} />
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* EDIT PLAN CONFIG MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-card border ${'bg-white border-border-default text-black'}`}>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-bold">Personalizar: Plan {editingPlan.name}</h4>
              <button onClick={() => setEditingPlan(null)} className="text-text-secondary hover:text-white"><X size={16}/></button>
            </div>
            <form onSubmit={handleSavePlanEdit} className="space-y-4 text-left text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Precio Mensual ($ USD)</label>
                  <input 
                    type="number" 
                    value={editingPlan.priceMonthly} 
                    onChange={e => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Precio Anual ($ USD/mes)</label>
                  <input 
                    type="number" 
                    value={editingPlan.priceYearly} 
                    onChange={e => setEditingPlan({ ...editingPlan, priceYearly: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong'}`}
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
                    className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Límite de Productos</label>
                  <input 
                    type="number" 
                    value={editingPlan.maxProducts} 
                    onChange={e => setEditingPlan({ ...editingPlan, maxProducts: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-md border outline-none ${'bg-white border-border-strong'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-2">Módulos Habilitados</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-3 rounded-card border border-white/5 bg-white/2">
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
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2.5 rounded-card border border-white/10 hover:bg-white/5 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2.5 rounded-card bg-surface-card text-white font-bold">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW TRANSFER DETAILS MODAL */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="bg-surface-card rounded-card border border-border-default w-full max-w-lg p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-primary" />
                <h4 className="text-sm font-bold text-text-primary">Detalle de Transferencia Bancaria</h4>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedTransfer(null)} 
                className="text-text-secondary hover:text-text-primary cursor-pointer p-1 rounded hover:bg-surface-bg"
              >
                <X size={16}/>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-surface-bg p-2.5 rounded-md border border-border-default">
                <span className="text-text-secondary font-semibold block mb-0.5">Empresa / Inquilino:</span>
                <span className="font-bold text-text-primary block">{selectedTransfer.companyName || 'Empresa'}</span>
                <span className="font-mono text-text-secondary text-[11px]">ID: {selectedTransfer.tenantId}</span>
              </div>
              <div className="bg-surface-bg p-2.5 rounded-md border border-border-default">
                <span className="text-text-secondary font-semibold block mb-0.5">Plan Solicitado:</span>
                <span className="font-bold text-text-primary block uppercase">{selectedTransfer.planId} ({selectedTransfer.billingPeriod || 'mensual'})</span>
                <span className="font-bold text-emerald-500 text-sm">${selectedTransfer.amount || '0.00'}</span>
              </div>
              <div className="bg-surface-bg p-2.5 rounded-md border border-border-default">
                <span className="text-text-secondary font-semibold block mb-0.5">Nro. Referencia:</span>
                <span className="font-mono font-bold text-primary block">{selectedTransfer.referenceNumber || 'S/N'}</span>
              </div>
              <div className="bg-surface-bg p-2.5 rounded-md border border-border-default">
                <span className="text-text-secondary font-semibold block mb-0.5">Estado:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold inline-block ${
                  selectedTransfer.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500' :
                  selectedTransfer.status === 'pending' ? 'bg-amber-500/15 text-amber-500 animate-pulse' :
                  'bg-red-500/15 text-red-500'
                }`}>
                  {selectedTransfer.status === 'approved' ? 'Aprobado' : selectedTransfer.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                </span>
              </div>
              {selectedTransfer.createdAt && (
                <div className="col-span-2 bg-surface-bg p-2 rounded-md border border-border-default">
                  <span className="text-text-secondary font-semibold">Fecha de Solicitud: </span>
                  <span className="text-text-primary font-medium">{new Date(selectedTransfer.createdAt).toLocaleString('es-EC')}</span>
                </div>
              )}
            </div>

            {/* Comprobante / Voucher Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-text-secondary block">Archivo / Comprobante de Pago</span>
              {selectedTransfer.proofUrl ? (
                <div className="max-h-60 overflow-hidden flex items-center justify-center p-2 bg-surface-bg border border-border-default rounded-md">
                  <img src={selectedTransfer.proofUrl} alt="Comprobante de pago" className="max-h-56 object-contain rounded" />
                </div>
              ) : (
                <div className="p-4 text-center italic text-xs text-text-secondary bg-surface-bg border border-border-default rounded-md">
                  No se adjuntó archivo de imagen (solo número de referencia proporcionado por el cliente).
                </div>
              )}
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t border-border-default">
              <button 
                type="button" 
                onClick={() => setSelectedTransfer(null)} 
                className="px-4 py-2 rounded-card border border-border-default hover:bg-surface-bg text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              {selectedTransfer.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRejectTransfer(selectedTransfer)}
                    className="px-4 py-2 rounded-card bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold cursor-pointer"
                  >
                    Rechazar Transferencia
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveTransfer(selectedTransfer)}
                    className="px-4 py-2 rounded-card bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Aprobar y Activar Plan
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
