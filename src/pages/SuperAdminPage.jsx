import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UiButton, UiInput, UiModalCloseButton, UiSelect, UiTextarea } from '../components/ui/controls';
import { UiIconBadge } from '../components/ui/UiIconBadge';
import { UiSegmentedTabs } from '../components/ui/UiSegmentedTabs';
import confirmAction from '../services/confirmDialog';
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
  Zap,
  Sparkles,
  Calendar,
  Layers,
  Users,
  Clock,
  Package,
  AlertTriangle
} from 'lucide-react';
import { query, where, runTransaction, deleteField } from 'firebase/firestore';
import { reconcileSriDocument, batchReconcileSriDocuments, scanAllTenantsPendingSri, getDocumentTypeName } from '../services/sriReconciliation';
import { notifyAuthorizedInvoice } from '../services/invoiceNotification';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, deleteUser, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { addDoc, collection, doc, getDocs, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc, Timestamp, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { db, auth, firebaseConfig } from '../firebase';
import RegistrationAdminView from '../components/admin/RegistrationAdminView';
import TenantAdminPanel from '../components/admin/TenantAdminPanel';
import { getSubscriptionExpiry, isSubscriptionBlocked } from '../services/subscriptionAccess';
import {
  tenantDateInput,
  tenantStatus,
  computeDefaultExpiryDate,
  buildTenantFirestorePatch,
  sanitizePlanForSave
} from '../services/tenantAdminModel';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_BILLING_PLANS } from '../config/billingPlans';
import { validatePlanPayment, isBasePlanCategory, getSubscriptionExpiry as computeNextPlanExpiry } from '../services/subscriptionPlan';
import { obtenerEstadoGemini, guardarConfigGeminiGlobal, probarConexionGemini } from '../services/geminiService';

const CATEGORY_LABELS = {
  all: 'Todos',
  erp: 'ERP',
  facturacion: 'Facturación SRI',
  paginas: 'Páginas Web',
  correos: 'Correos',
  whatsapp: 'WhatsApp CRM'
};

const MODULE_LABELS = {
  dashboard: 'Dashboard',
  ventas: 'Ventas',
  finances: 'Finanzas / Tesorería',
  compras: 'Compras',
  gastos_creditos: 'Gastos y Créditos',
  inventario: 'Inventario',
  personas: 'Personas',
  calendar: 'Calendario',
  team: 'Equipo',
  contabilidad: 'Contabilidad SRI',
  general_settings: 'Ajustes'
};

const STATUS_PILL_STYLES = {
  Activo: 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]',
  Prueba: 'bg-[#F4F4F5] text-[#474747] border-[#E3E3E3]',
  'Por aprobar': 'bg-[#FCFBE7] text-[#866308] border-[#F0DF8A]',
  Suspendido: 'bg-[#FFF0F5] text-[#851B40] border-[#FBC6D9]',
  Vencido: 'bg-[#FFF0F5] text-[#851B40] border-[#FBC6D9]'
};

const TAB_TITLES = {
  dashboard: 'Resumen Ejecutivo SaaS',
  users: 'Usuarios y Altas',
  tenants: 'Empresas (Tenants)',
  sri_monitor: 'Monitor SRI Global',
  transfers: 'Aprobaciones de Pago',
  plans: 'Tarifas y Planes',
  ai_config: 'IA Global (Google Gemini)'
};

function addDaysToToday(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonthsToToday(months) {
  const d = new Date();
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

export default function SuperAdminPage({ showToast }) {
  const navigate = useNavigate();
  const { currentUser, logout, role } = useAuth();

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'edit' | 'create'
  const [tenantEditSubTab, setTenantEditSubTab] = useState('subscription'); // 'subscription' | 'team' | 'advanced'

  // Firestore collections state
  const [tenants, setTenants] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [plans, setPlans] = useState(DEFAULT_BILLING_PLANS);
  const [loading, setLoading] = useState(true);
  const [registrationSummary, setRegistrationSummary] = useState({ loading: true, incomplete: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState('all'); // 'all' | 'pending_approval' | 'active' | 'trial' | 'inactive'
  const [transferFilter, setTransferFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [planCategoryFilter, setPlanCategoryFilter] = useState('all');
  const [loadError, setLoadError] = useState('');
  const [savingTenant, setSavingTenant] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingAddon, setSavingAddon] = useState('');
  const tenantRequest = useRef(0);
  const plansInitialized = useRef(false);

  // Selected Tenant Details State (for inline editing)
  const [selectedTenantDetails, setSelectedTenantDetails] = useState(null);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [tenantStats, setTenantStats] = useState({ transactionsCount: 0, productsCount: 0 });
  const [loadingTenantDetails, setLoadingTenantDetails] = useState(false);

  // Modals / Edit states
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [activationModal, setActivationModal] = useState(null); // { tenant, planId, planStatus, billingPeriod, expiresAt }
  const [isActivating, setIsActivating] = useState(false);

  // New Tenant Creation Form State
  const [newTenantForm, setNewTenantForm] = useState({
    companyName: '',
    tenantId: '',
    email: '',
    planId: 'starter',
    planStatus: 'active',
    billingPeriod: 'monthly',
    expiresAt: computeDefaultExpiryDate('active', 'monthly'),
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

  // IA Global (Gemini Free Tier) States
  const [globalAiState, setGlobalAiState] = useState({
    loading: false,
    configured: false,
    enabled: true,
    source: 'none',
    preferredModel: 'gemini-2.5-flash',
    hasPlatformKey: false,
    hasEnvKey: false,
    maskedKey: '',
    freeModels: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']
  });
  const [globalAiKeyInput, setGlobalAiKeyInput] = useState('');
  const [savingGlobalAi, setSavingGlobalAi] = useState(false);
  const [testingGlobalAi, setTestingGlobalAi] = useState(false);
  const [globalAiFeedback, setGlobalAiFeedback] = useState(null);

  const loadGlobalAiStatus = async () => {
    setGlobalAiState(prev => ({ ...prev, loading: true }));
    try {
      const info = await obtenerEstadoGemini();
      setGlobalAiState(prev => ({ ...prev, loading: false, ...info }));
    } catch (err) {
      setGlobalAiState(prev => ({ ...prev, loading: false }));
      setGlobalAiFeedback({ ok: false, message: err.message || 'No se pudo consultar el estado de IA global.' });
    }
  };

  useEffect(() => {
    if (activeTab === 'ai_config' && currentUser) {
      loadGlobalAiStatus();
    }
  }, [activeTab, currentUser]);

  const handleSaveGlobalAi = async (e, { clearKey = false } = {}) => {
    e?.preventDefault?.();
    if (savingGlobalAi) return;
    setSavingGlobalAi(true);
    setGlobalAiFeedback(null);
    try {
      const result = await guardarConfigGeminiGlobal({
        geminiApiKey: clearKey ? '' : globalAiKeyInput.trim(),
        preferredModel: globalAiState.preferredModel,
        enabled: globalAiState.enabled,
        clearKey
      });
      setGlobalAiState(prev => ({ ...prev, loading: false, ...result }));
      if (globalAiKeyInput.trim() || clearKey) setGlobalAiKeyInput('');
      const msg = clearKey
        ? 'Clave guardada en consola eliminada.'
        : 'Configuración global de IA guardada. Ya está activa para todas las empresas.';
      setGlobalAiFeedback({ ok: true, message: msg });
      showToast?.(msg, 'success');
    } catch (err) {
      const msg = err.message || 'No se pudo guardar la configuración global de IA.';
      setGlobalAiFeedback({ ok: false, message: msg });
      showToast?.(msg, 'error');
    } finally {
      setSavingGlobalAi(false);
    }
  };

  const handleTestGlobalAi = async () => {
    if (testingGlobalAi) return;
    setTestingGlobalAi(true);
    setGlobalAiFeedback(null);
    try {
      const res = await probarConexionGemini(globalAiKeyInput.trim());
      const msg = `Conexión global exitosa con ${res.model || 'Gemini'} (nivel gratuito operativo).`;
      setGlobalAiFeedback({ ok: true, message: msg });
      showToast?.(msg, 'success');
    } catch (err) {
      const msg = err.message || 'Falló la conexión con Gemini IA.';
      setGlobalAiFeedback({ ok: false, message: msg });
      showToast?.(msg, 'error');
    } finally {
      setTestingGlobalAi(false);
    }
  };

  const isSuperAdmin = String(role || '').toLowerCase().trim() === 'superadmin';

  // Derived plan lists
  const basePlans = useMemo(() => {
    const list = plans.filter(p => isBasePlanCategory(p.category || 'erp'));
    return list.length > 0 ? list : DEFAULT_BILLING_PLANS.filter(p => isBasePlanCategory(p.category || 'erp'));
  }, [plans]);

  const addonPlans = useMemo(() => {
    return plans.filter(p => !isBasePlanCategory(p.category || 'erp'));
  }, [plans]);

  const getPlanName = (planId) => {
    const found = plans.find(p => p.id === planId);
    return found?.name || planId || 'Sin plan';
  };

  // Gating check
  useEffect(() => {
    if (currentUser && !isSuperAdmin) {
      showToast?.('Acceso denegado. Se requieren permisos de super-administrador.', 'error');
      navigate('/app');
    }
  }, [currentUser, isSuperAdmin, navigate, showToast]);

  // Real-time listeners for Tenants, Transfers, and Plans
  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setLoadError('');

    const unsubTenants = onSnapshot(collection(db, 'tenants'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id }));
      const created = tenant => tenant.createdAt?.toMillis?.() || Date.parse(tenant.createdAt || '') || 0;
      list.sort((a, b) => created(b) - created(a));
      setTenants(list);
      setLoading(false);
    }, (error) => {
      setLoadError('No se pudieron cargar las empresas. Comprueba los permisos de superadministrador.');
      setLoading(false);
      console.warn('Superadmin tenants subscription blocked by security rules:', error);
    });

    const unsubTransfers = onSnapshot(collection(db, 'transfers'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id }));
      list.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
      setTransfers(list);
    }, (error) => {
      setLoadError('No se pudieron cargar los pagos. Revisa tu conexión y permisos.');
      console.warn('Superadmin transfers subscription blocked by security rules:', error);
    });

    const unsubPlans = onSnapshot(collection(db, 'plans'), async (snap) => {
      const list = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id }));
      const existingIds = new Set(list.map(p => p.id));
      const missing = DEFAULT_BILLING_PLANS.filter(p => !existingIds.has(p.id));
      if (missing.length > 0 && !plansInitialized.current) {
        plansInitialized.current = true;
        for (const plan of missing) {
          try {
            await setDoc(doc(db, 'plans', plan.id), sanitizePlanForSave(plan), { merge: true });
          } catch (err) {
            console.warn('No se pudo inicializar plan por defecto:', plan.id, err);
          }
        }
      }
      const orderMap = new Map(DEFAULT_BILLING_PLANS.map((p, idx) => [p.id, idx]));
      const merged = [...list, ...missing.filter(m => !list.some(l => l.id === m.id))];
      merged.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
      setPlans(merged);
    }, (err) => {
      console.error('Error escuchando planes:', err);
    });

    return () => {
      unsubTenants();
      unsubTransfers();
      unsubPlans();
    };
  }, [isSuperAdmin]);

  // Set default initial password on create form
  useEffect(() => {
    if (viewMode === 'create') {
      const randPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)), value => value.toString(16).padStart(2, '0')).join('') + 'A1!';
      setNewTenantForm(prev => ({
        ...prev,
        initialPassword: randPassword,
        expiresAt: computeDefaultExpiryDate(prev.planStatus, prev.billingPeriod)
      }));
    }
  }, [viewMode]);

  // Select tenant for inline editing
  const handleSelectTenant = async (tenant) => {
    const request = ++tenantRequest.current;
    const expiryInput = tenantDateInput(tenant);
    setSelectedTenantDetails({
      ...tenant,
      planId: tenant.planId || basePlans[0]?.id || 'starter',
      planStatus: tenant.planStatus || 'pending_approval',
      billingPeriod: tenant.billingPeriod || 'monthly',
      expiresAt: expiryInput
    });
    setTenantEditSubTab('subscription');
    setSaveFeedback(null);
    setLoadingTenantDetails(true);
    setTenantUsers([]);
    setTenantStats({ transactionsCount: 0, productsCount: 0 });
    setViewMode('edit');
    try {
      const [txSnap, prodSnap] = await Promise.all([
        getCountFromServer(collection(db, 'artifacts', tenant.id, 'public', 'data', 'finances_transactions')),
        getCountFromServer(collection(db, 'artifacts', tenant.id, 'public', 'data', 'inventory_products'))
      ]);
      if (request === tenantRequest.current) {
        setTenantStats({ transactionsCount: txSnap.data().count, productsCount: prodSnap.data().count });
      }
    } catch (error) {
      console.error('Error cargando consumo:', error);
      showToast?.('No se pudo cargar el consumo de la empresa.', 'error');
    } finally {
      if (request === tenantRequest.current) setLoadingTenantDetails(false);
    }
  };

  // Open explicit Activation Modal (lets SuperAdmin pick Plan + Active/Trial + Billing Period + Expiry)
  const openActivationModal = (tenant) => {
    const initialPlanId = tenant.planId || basePlans[0]?.id || 'starter';
    const initialPeriod = tenant.billingPeriod || 'monthly';
    setActivationModal({
      tenant,
      planStatus: 'active',
      planId: initialPlanId,
      billingPeriod: initialPeriod,
      expiresAt: computeDefaultExpiryDate('active', initialPeriod)
    });
  };

  // Helpers de persistencia segura:
  // 1) Nunca bloquear un guardado por fallo de auditoría (admin_events puede no estar desplegado en reglas)
  const logAdminEventSafe = async (tenantId, eventPayload) => {
    try {
      await addDoc(collection(db, 'tenants', tenantId, 'admin_events'), {
        ...eventPayload,
        actorUid: currentUser?.uid || '',
        createdAt: serverTimestamp()
      });
    } catch (auditErr) {
      console.warn('Evento admin_events omitido:', auditErr?.code || auditErr?.message || auditErr);
    }
  };

  // 2) Fallback autenticado vía Firebase Admin SDK en Vercel si las reglas cliente rechazan la escritura
  const callSuperAdminApi = async (body) => {
    const token = await auth.currentUser?.getIdToken(true);
    if (!token) throw new Error('Sesión expirada. Inicia sesión nuevamente.');
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      throw new Error(data?.error || 'No se pudo guardar mediante el servicio de administración.');
    }
    return data;
  };

  const isPermissionError = (err) => {
    const code = String(err?.code || '').toLowerCase();
    const msg = String(err?.message || '').toLowerCase();
    return code.includes('permission-denied') || msg.includes('permission') || msg.includes('insufficient');
  };

  // Confirm Tenant Activation (Active OR Trial with chosen plan, cycle, expiry)
  const handleConfirmActivation = async (e) => {
    e.preventDefault();
    if (!activationModal || isActivating) return;
    setIsActivating(true);
    try {
      const { tenant, planId, planStatus, billingPeriod, expiresAt } = activationModal;
      const { changes, patch } = buildTenantFirestorePatch(
        {
          companyName: tenant.companyName || tenant.id,
          planId,
          planStatus,
          billingPeriod,
          expiresAt
        },
        {
          previousStatus: tenant.planStatus,
          actorUid: currentUser.uid,
          timestampFactory: (d) => Timestamp.fromDate(d),
          serverTimestampValue: serverTimestamp()
        }
      );

      let savedViaApi = false;
      try {
        await updateDoc(doc(db, 'tenants', tenant.id), patch);
      } catch (clientErr) {
        if (!isPermissionError(clientErr)) throw clientErr;
        await callSuperAdminApi({
          action: 'update_tenant',
          tenantId: tenant.id,
          companyName: tenant.companyName || tenant.id,
          planId,
          planStatus,
          billingPeriod,
          expiresAt
        });
        savedViaApi = true;
      }

      if (!savedViaApi) {
        await logAdminEventSafe(tenant.id, {
          action: planStatus === 'active' ? 'Plan activado por administrador' : 'Prueba habilitada por administrador',
          changes
        });
      }

      if (selectedTenantDetails?.id === tenant.id) {
        setSelectedTenantDetails(prev => prev ? {
          ...prev,
          planId,
          planStatus,
          billingPeriod,
          expiresAt
        } : prev);
      }

      const msg = planStatus === 'active'
        ? `Empresa "${tenant.companyName}" activada con plan ${getPlanName(planId)} hasta ${expiresAt}.`
        : `Empresa "${tenant.companyName}" habilitada en modo prueba hasta ${expiresAt}.`;
      setSaveFeedback({ type: 'success', text: msg });
      showToast?.(msg, 'success');
      setActivationModal(null);
    } catch (error) {
      console.error('Error activando empresa:', error);
      const errMsg = error.message || 'No se pudo activar la empresa.';
      setSaveFeedback({ type: 'error', text: errMsg });
      showToast?.(errMsg, 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleApproveTransfer = async (transfer) => {
    try {
      await runTransaction(db, async transaction => {
        const transferRef = doc(db, 'transfers', transfer.id);
        const transferSnap = await transaction.get(transferRef);
        if (!transferSnap.exists() || transferSnap.data().status !== 'pending') {
          throw new Error('Este pago ya fue procesado. Actualiza el listado.');
        }
        const payment = transferSnap.data();
        const planRef = doc(db, 'plans', payment.planId);
        const planSnap = await transaction.get(planRef);
        if (!planSnap.exists()) throw new Error('El plan no existe en el catálogo del administrador.');
        const plan = planSnap.data();
        const category = validatePlanPayment(plan, payment);
        const tenantRef = doc(db, 'tenants', payment.tenantId);
        const tenantSnap = await transaction.get(tenantRef);
        if (!tenantSnap.exists()) throw new Error('No se encontró la empresa del pago.');

        const isBasePlan = isBasePlanCategory(category);
        const tenant = tenantSnap.data();
        if (tenant.planStatus === 'suspended') {
          throw new Error('La empresa está suspendida. Reactiva su acceso antes de aprobar el pago.');
        }
        const currentExpiryValue = isBasePlan
          ? (tenant.subscriptionExpiresAt || tenant.expiresAt)
          : tenant.serviceSubscriptions?.[category]?.expiresAt;
        const newExpiresAt = computeNextPlanExpiry(currentExpiryValue, payment.billingPeriod);
        if (isBasePlan) {
          transaction.update(tenantRef, {
            planStatus: 'active',
            expiresAt: newExpiresAt.toISOString(),
            subscriptionExpiresAt: Timestamp.fromDate(newExpiresAt),
            planId: payment.planId,
            billingPeriod: payment.billingPeriod,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid,
            ...(tenant.planStatus === 'pending_approval' ? { approvedAt: new Date().toISOString(), approvedBy: currentUser.uid } : {})
          });
        } else {
          transaction.update(tenantRef, {
            [`serviceSubscriptions.${category}`]: {
              planId: payment.planId,
              status: 'active',
              billingPeriod: payment.billingPeriod,
              expiresAt: Timestamp.fromDate(newExpiresAt)
            },
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
          });
        }
        transaction.update(transferRef, {
          status: 'approved',
          approvedAt: new Date().toISOString(),
          approvedBy: currentUser.uid
        });
        return { tenantId: payment.tenantId, planId: payment.planId, category, expiresAt: newExpiresAt.toISOString() };
      }).then(async (auditInfo) => {
        if (auditInfo?.tenantId) {
          await logAdminEventSafe(auditInfo.tenantId, {
            action: 'Pago aprobado',
            changes: { planId: auditInfo.planId, category: auditInfo.category, expiresAt: auditInfo.expiresAt, transferId: transfer.id }
          });
        }
      });

      showToast?.('Transferencia bancaria aprobada. Suscripción activada.', 'success');
      setSelectedTransfer(null);
    } catch (err) {
      showToast?.('Error al aprobar transferencia: ' + err.message, 'error');
    }
  };

  const handleRejectTransfer = async (transfer) => {
    try {
      await runTransaction(db, async transaction => {
        const transferRef = doc(db, 'transfers', transfer.id);
        const transferSnap = await transaction.get(transferRef);
        if (!transferSnap.exists() || transferSnap.data().status !== 'pending') {
          throw new Error('Este pago ya fue procesado. Actualiza el listado.');
        }
        transaction.update(transferRef, {
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: currentUser.uid
        });
      });
      showToast?.('Transferencia bancaria rechazada.', 'warning');
      setSelectedTransfer(null);
    } catch {
      showToast?.('Error al rechazar transferencia.', 'error');
    }
  };

  // Save tenant subscription & plan changes (works even directly from pending_approval -> active/trial!)
  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    if (savingTenant || !selectedTenantDetails) return;
    setSavingTenant(true);
    setSaveFeedback(null);
    try {
      const existingTenant = tenants.find(item => item.id === selectedTenantDetails.id);
      const effectiveExpiry = selectedTenantDetails.expiresAt || (
        ['active', 'trial'].includes(selectedTenantDetails.planStatus)
          ? computeDefaultExpiryDate(selectedTenantDetails.planStatus, selectedTenantDetails.billingPeriod)
          : ''
      );
      const draft = { ...selectedTenantDetails, expiresAt: effectiveExpiry };
      const { changes, patch } = buildTenantFirestorePatch(draft, {
        previousStatus: existingTenant?.planStatus,
        actorUid: currentUser.uid,
        timestampFactory: (d) => Timestamp.fromDate(d),
        serverTimestampValue: serverTimestamp()
      });

      let savedViaApi = false;
      try {
        await updateDoc(doc(db, 'tenants', selectedTenantDetails.id), patch);
      } catch (clientErr) {
        if (!isPermissionError(clientErr)) throw clientErr;
        await callSuperAdminApi({
          action: 'update_tenant',
          tenantId: selectedTenantDetails.id,
          companyName: changes.companyName,
          planId: changes.planId,
          planStatus: changes.planStatus,
          billingPeriod: changes.billingPeriod,
          expiresAt: effectiveExpiry
        });
        savedViaApi = true;
      }

      if (!savedViaApi) {
        await logAdminEventSafe(selectedTenantDetails.id, {
          action: existingTenant?.planStatus === 'pending_approval' && ['active', 'trial'].includes(changes.planStatus)
            ? 'Empresa activada y configurada'
            : 'Empresa y suscripción actualizadas',
          changes
        });
      }

      setSelectedTenantDetails(prev => prev ? {
        ...prev,
        companyName: changes.companyName,
        planId: changes.planId,
        planStatus: changes.planStatus,
        billingPeriod: changes.billingPeriod,
        expiresAt: effectiveExpiry
      } : prev);

      const statusText = {
        active: 'Activo',
        trial: 'Prueba (Trial)',
        pending_approval: 'Pendiente de aprobación',
        suspended: 'Suspendido',
        expired: 'Vencido'
      }[changes.planStatus] || changes.planStatus;

      const successMsg = `Guardado: ${getPlanName(changes.planId)} · ${statusText}${effectiveExpiry ? ` · vence ${effectiveExpiry}` : ''}`;
      setSaveFeedback({ type: 'success', text: successMsg });
      showToast?.(successMsg, 'success');
    } catch (err) {
      console.error('Error actualizando tenant:', err);
      const errMsg = err.message || 'No se pudo actualizar la empresa.';
      setSaveFeedback({ type: 'error', text: errMsg });
      showToast?.(errMsg, 'error');
    } finally {
      setSavingTenant(false);
    }
  };

  // Toggle / assign an add-on service subscription on the selected tenant
  const handleAssignAddonService = async (addonPlan, activate) => {
    if (!selectedTenantDetails || savingAddon) return;
    const category = addonPlan.category;
    setSavingAddon(category);
    try {
      const tenantRef = doc(db, 'tenants', selectedTenantDetails.id);
      if (activate) {
        const expDate = computeNextPlanExpiry(null, selectedTenantDetails.billingPeriod || 'monthly');
        const subObj = {
          planId: addonPlan.id,
          status: 'active',
          billingPeriod: selectedTenantDetails.billingPeriod || 'monthly',
          expiresAt: Timestamp.fromDate(expDate)
        };
        await updateDoc(tenantRef, {
          [`serviceSubscriptions.${category}`]: subObj,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid
        });
        await logAdminEventSafe(selectedTenantDetails.id, {
          action: 'Servicio adicional activado',
          changes: { category, planId: addonPlan.id, expiresAt: expDate.toISOString() }
        });
        setSelectedTenantDetails(prev => prev ? {
          ...prev,
          serviceSubscriptions: { ...(prev.serviceSubscriptions || {}), [category]: subObj }
        } : prev);
        showToast?.(`Servicio "${addonPlan.name}" activado para la empresa.`, 'success');
      } else {
        await updateDoc(tenantRef, {
          [`serviceSubscriptions.${category}`]: deleteField(),
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid
        });
        await logAdminEventSafe(selectedTenantDetails.id, {
          action: 'Servicio adicional desactivado',
          changes: { category, status: 'removed' }
        });
        setSelectedTenantDetails(prev => {
          if (!prev) return prev;
          const nextSubs = { ...(prev.serviceSubscriptions || {}) };
          delete nextSubs[category];
          return { ...prev, serviceSubscriptions: nextSubs };
        });
        showToast?.(`Servicio de ${CATEGORY_LABELS[category] || category} removido.`, 'info');
      }
    } catch (err) {
      console.error('Error actualizando servicio adicional:', err);
      showToast?.(err.message || 'No se pudo actualizar el servicio adicional.', 'error');
    } finally {
      setSavingAddon('');
    }
  };

  // Save Plan Configuration (sanitized, decimal-safe, zero undefined fields)
  const handleSavePlanEdit = async (e) => {
    e.preventDefault();
    if (!editingPlan || savingPlan) return;
    setSavingPlan(true);
    try {
      const cleanPlan = sanitizePlanForSave(editingPlan);
      try {
        await setDoc(doc(db, 'plans', cleanPlan.id), {
          ...cleanPlan,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.uid
        }, { merge: true });
      } catch (clientErr) {
        if (!isPermissionError(clientErr)) throw clientErr;
        await callSuperAdminApi({ action: 'save_plan', plan: cleanPlan });
      }
      setPlans(current => {
        const exists = current.some(p => p.id === cleanPlan.id);
        return exists
          ? current.map(p => p.id === cleanPlan.id ? cleanPlan : p)
          : [...current, cleanPlan];
      });
      showToast?.(`Plan "${cleanPlan.name}" guardado correctamente.`, 'success');
      setEditingPlan(null);
    } catch (err) {
      console.error('Error al guardar plan:', err);
      showToast?.(err.message || 'Error al guardar la configuración del plan.', 'error');
    } finally {
      setSavingPlan(false);
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
        backupData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_tenant_${selectedTenantDetails.id}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast?.('Backup generado y descargado exitosamente.', 'success');
    } catch (err) {
      console.error('Error exporting backup:', err);
      showToast?.('Error al generar el backup.', 'error');
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
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => String(b.createdAt || b.date || b.updatedAt || '').localeCompare(String(a.createdAt || a.date || a.updatedAt || '')));
      setGodModeData(data.slice(0, 150));
    } catch (err) {
      console.error('Error loading god mode data:', err);
      showToast?.('Error al cargar los datos crudos.', 'error');
    } finally {
      setIsLoadingGodMode(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'edit' && tenantEditSubTab === 'advanced' && selectedTenantDetails) {
      loadGodModeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, tenantEditSubTab, selectedTenantDetails?.id, godModeCollection]);

  const handleDeleteGodModeDoc = async (docId) => {
    if (!await confirmAction(`PELIGRO (God Mode): Vas a borrar permanentemente el documento ${docId}. Esta acción no se puede deshacer. ¿Continuar?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', selectedTenantDetails.id, 'public', 'data', godModeCollection, docId));
      showToast?.(`Documento ${docId} eliminado.`, 'success');
      setGodModeData(prev => prev.filter(d => d.id !== docId));
      if (godModeCollection === 'finances_transactions') {
        setTenantStats(prev => ({ ...prev, transactionsCount: Math.max(0, prev.transactionsCount - 1) }));
      } else if (godModeCollection === 'inventory_products') {
        setTenantStats(prev => ({ ...prev, productsCount: Math.max(0, prev.productsCount - 1) }));
      }
    } catch (err) {
      console.error('Error deleting doc:', err);
      showToast?.('Error al eliminar documento.', 'error');
    }
  };

  const handleWipeSandbox = async () => {
    if (!selectedTenantDetails) return;
    const confirmId = window.prompt(
      `ZONA DE PELIGRO (God Mode):\n` +
      `Vas a ELIMINAR permanentemente los datos operativos del inquilino "${selectedTenantDetails.companyName}".\n\n` +
      `Para confirmar, escribe exactamente el ID del inquilino ("${selectedTenantDetails.id}"):`
    );
    if (confirmId !== selectedTenantDetails.id) {
      if (confirmId !== null) showToast?.('Confirmación incorrecta. Operación cancelada.', 'error');
      return;
    }
    setIsWiping(true);
    try {
      const collectionsToWipe = ['finances_transactions', 'finances_third_parties', 'inventory_products', 'finances_liabilities'];
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
      showToast?.(`Sandbox limpiado con éxito (${totalDeleted} documentos eliminados).`, 'success');
    } catch (err) {
      showToast?.('Error al limpiar el sandbox: ' + err.message, 'error');
    } finally {
      setIsWiping(false);
    }
  };

  // Manual Tenant Creation
  const handleCreateTenant = async (e) => {
    e.preventDefault();
    const companyName = newTenantForm.companyName.trim();
    const cleanTenantId = newTenantForm.tenantId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const email = newTenantForm.email.trim();
    const password = newTenantForm.initialPassword;

    if (!companyName || !cleanTenantId || !email || !password) {
      showToast?.('Por favor completa todos los campos obligatorios.', 'warning');
      return;
    }
    if (tenants.some(t => t.id === cleanTenantId)) {
      showToast?.('El ID de inquilino ya existe en el sistema.', 'error');
      return;
    }
    if (isCreatingTenant) return;
    setIsCreatingTenant(true);

    let tempApp = null;
    let createdUser = null;
    let workspaceCreated = false;
    try {
      if ((await getDoc(doc(db, 'tenants', cleanTenantId))).exists()) throw new Error('El ID ya está registrado.');
      const tempAppName = `TempApp_${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);
      await setPersistence(tempAuth, inMemoryPersistence);

      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const user = userCredential.user;
      const uid = user.uid;
      createdUser = user;

      const expiryStr = newTenantForm.expiresAt || computeDefaultExpiryDate(newTenantForm.planStatus, newTenantForm.billingPeriod);
      const expiryDate = new Date(`${expiryStr}T23:59:59.000Z`);

      const tenantData = {
        id: cleanTenantId,
        ownerUid: uid,
        ownerEmail: email,
        registrationSource: 'admin',
        requireEmailVerification: true,
        companyName,
        planId: newTenantForm.planId,
        planStatus: newTenantForm.planStatus,
        billingPeriod: newTenantForm.billingPeriod,
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.uid,
        expiresAt: expiryDate.toISOString(),
        ...(newTenantForm.planStatus === 'trial'
          ? { trialExpiresAt: Timestamp.fromDate(expiryDate) }
          : { subscriptionExpiresAt: Timestamp.fromDate(expiryDate) })
      };

      const userData = {
        uid,
        name: `Admin ${companyName}`,
        email,
        tenantId: cleanTenantId,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      const documents = [
        [doc(db, 'tenants', cleanTenantId), tenantData],
        [doc(db, 'users', uid), userData],
        [doc(db, 'artifacts', cleanTenantId, 'public', 'data', 'finances_settings', 'config'), {
          razonSocial: companyName,
          nombreComercial: companyName,
          ruc: '',
          direccionMatriz: '',
          telefono: '',
          email,
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
        }],
        [doc(db, 'artifacts', cleanTenantId, 'public', 'data', 'meta', 'info'), {
          users: [{ email, role: 'admin', name: `Admin ${companyName}`, active: true }],
          trash: [],
          googleClientId: ''
        }]
      ];

      await runTransaction(db, async tx => {
        const existing = await tx.get(doc(db, 'tenants', cleanTenantId));
        if (existing.exists()) throw new Error('El ID ya está registrado.');
        documents.forEach(([ref, data]) => tx.set(ref, data));
      });
      workspaceCreated = true;

      await logAdminEventSafe(cleanTenantId, {
        action: 'Empresa creada',
        changes: { planId: tenantData.planId, planStatus: tenantData.planStatus, billingPeriod: tenantData.billingPeriod, expiresAt: tenantData.expiresAt }
      });

      if (newTenantForm.sendResetEmail) {
        try {
          await sendPasswordResetEmail(auth, email);
          showToast?.('Empresa creada y correo de acceso enviado.', 'success');
        } catch {
          showToast?.('Empresa creada; no se pudo enviar el correo de restablecimiento.', 'warning');
        }
      } else {
        showToast?.('Empresa creada correctamente.', 'success');
      }

      setNewTenantForm({
        companyName: '',
        tenantId: '',
        email: '',
        planId: basePlans[0]?.id || 'starter',
        planStatus: 'active',
        billingPeriod: 'monthly',
        expiresAt: computeDefaultExpiryDate('active', 'monthly'),
        initialPassword: '',
        sendResetEmail: true
      });
      setViewMode('list');
    } catch (err) {
      console.error('Error creating manual tenant:', err);
      showToast?.(`Error al crear empresa: ${err.message}`, 'error');
      if (createdUser && !workspaceCreated) {
        try { await deleteUser(createdUser); }
        catch { showToast?.('Quedó una cuenta de acceso sin empresa. Requiere revisión en Authentication.', 'warning'); }
      }
    } finally {
      if (tempApp) await deleteApp(tempApp).catch(() => {});
      setIsCreatingTenant(false);
    }
  };

  // Filtered counts & lists
  const pendingRegistrations = useMemo(() => tenants.filter(t => t.planStatus === 'pending_approval'), [tenants]);
  const activeTenantsList = useMemo(() => tenants.filter(t => t.planStatus === 'active' && !isSubscriptionBlocked(t)), [tenants]);
  const trialTenantsList = useMemo(() => tenants.filter(t => t.planStatus === 'trial' && !isSubscriptionBlocked(t)), [tenants]);
  const inactiveTenantsList = useMemo(() => tenants.filter(t => t.planStatus !== 'pending_approval' && isSubscriptionBlocked(t)), [tenants]);

  const filteredTenants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return tenants.filter(t => {
      if (tenantStatusFilter === 'pending_approval' && t.planStatus !== 'pending_approval') return false;
      if (tenantStatusFilter === 'active' && !(t.planStatus === 'active' && !isSubscriptionBlocked(t))) return false;
      if (tenantStatusFilter === 'trial' && !(t.planStatus === 'trial' && !isSubscriptionBlocked(t))) return false;
      if (tenantStatusFilter === 'inactive' && !(t.planStatus !== 'pending_approval' && isSubscriptionBlocked(t))) return false;
      if (!q) return true;
      return (
        t.companyName?.toLowerCase().includes(q) ||
        t.ownerEmail?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.planId?.toLowerCase().includes(q)
      );
    });
  }, [tenants, tenantStatusFilter, searchTerm]);

  const pendingTransfers = useMemo(() => transfers.filter(t => t.status === 'pending'), [transfers]);
  const filteredTransfers = useMemo(() => {
    if (transferFilter === 'all') return transfers;
    return transfers.filter(t => t.status === transferFilter);
  }, [transfers, transferFilter]);

  const filteredPlans = useMemo(() => {
    if (planCategoryFilter === 'all') return plans;
    return plans.filter(p => (p.category || 'erp') === planCategoryFilter);
  }, [plans, planCategoryFilter]);

  const mrr = useMemo(() => activeTenantsList.reduce((sum, t) => {
    const plan = plans.find(p => p.id === t.planId);
    return sum + Number((t.billingPeriod === 'yearly' ? plan?.priceYearly : plan?.priceMonthly) || 0);
  }, 0), [activeTenantsList, plans]);

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
        showToast?.(
          res.totalPendingCount > 0
            ? `Escaneo finalizado: ${res.totalPendingCount} comprobantes pendientes en ${res.affectedTenantCount} empresas.`
            : 'No hay comprobantes pendientes de autorización en ninguna empresa.',
          res.totalPendingCount > 0 ? 'warning' : 'success'
        );
      }
    } catch (err) {
      console.error('Error al escanear comprobantes SRI:', err);
      if (!silent) showToast?.(`Error al escanear comprobantes SRI: ${err.message}`, 'error');
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
      showToast?.(`Consultando ${docLabel} ${item.documentNumber || item.claveAcceso} en el SRI...`, 'info');
      const api = { doc, runTransaction, getDoc, setDoc };
      const res = await reconcileSriDocument({ db, appId: item.tenantId, document: item, api, notify: notifyAuthorizedInvoice });
      if (res.status === 'autorizado') {
        showToast?.(`${docLabel} ${item.documentNumber} AUTORIZADO por el SRI.`, 'success');
        setPendingSriDocs(prev => prev.filter(d => !(d.id === item.id && d.tenantId === item.tenantId)));
        setReconcileStats(prev => ({ ...prev, authorized: prev.authorized + 1 }));
      } else if (res.status === 'no_autorizado' || res.status === 'devuelto') {
        showToast?.(`SRI devolvió comprobante: ${res.message}`, 'error');
        setPendingSriDocs(prev => prev.map(d => (d.id === item.id && d.tenantId === item.tenantId) ? { ...d, sriStatus: res.status, sriLastError: res.message } : d));
        setReconcileStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      } else {
        showToast?.(res.message || 'Continúa en procesamiento en el SRI.', 'warning');
        setReconcileStats(prev => ({ ...prev, stillPending: prev.stillPending + 1 }));
      }
    } catch (err) {
      showToast?.(`Error al reconciliar: ${err.message}`, 'error');
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
      showToast?.(
        `Reconciliación completada: ${stats.authorized} autorizados, ${stats.stillPending} pendientes, ${stats.failed} devueltos.`,
        stats.authorized > 0 ? 'success' : 'info'
      );
      await handleScanAllSri(true);
    } catch (err) {
      showToast?.(`Error en reconciliación en lote: ${err.message}`, 'error');
    } finally {
      setIsReconcilingSri(false);
      setReconcileProgress({ current: 0, total: 0, currentDoc: null });
    }
  };

  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast?.('Clave de acceso copiada.', 'info');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, count: 0 },
    { id: 'tenants', label: 'Empresas (Tenants)', icon: Building, count: pendingRegistrations.length },
    { id: 'users', label: 'Usuarios y altas', icon: Users, count: registrationSummary.incomplete },
    { id: 'transfers', label: 'Aprobaciones', icon: CreditCard, count: pendingTransfers.length },
    { id: 'plans', label: 'Tarifas y Planes', icon: Sliders, count: 0 },
    { id: 'sri_monitor', label: 'Monitor SRI', icon: ShieldAlert, count: pendingSriDocs.length },
    { id: 'ai_config', label: 'IA Global', icon: Sparkles, count: 0 }
  ];

  const handleNavSelect = (tabId) => {
    setActiveTab(tabId);
    setViewMode('list');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const selectedPlanObj = useMemo(
    () => plans.find(p => p.id === selectedTenantDetails?.planId) || basePlans[0],
    [plans, basePlans, selectedTenantDetails?.planId]
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[#FAFAFA] text-[#1B1B1B] font-sans">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR BREVO V2 */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-[#E3E3E3] shrink-0 transition-all duration-200 ${
          isSidebarOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full lg:translate-x-0 lg:w-[72px]'
        }`}
      >
        {/* Brand Header */}
        <div className={`h-16 flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center px-2'} border-b border-[#EFEFEF] shrink-0`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <UiIconBadge level="modal" tone="brand" icon={Settings} />
            {isSidebarOpen && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#1B1B1B] leading-tight truncate">WebFix Admin</div>
                <div className="text-[11px] text-[#696969] leading-tight truncate">Consola SaaS</div>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <div className="lg:hidden">
              <UiModalCloseButton onClick={() => setIsSidebarOpen(false)} aria-label="Cerrar menú" />
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {sidebarLinks.map(link => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavSelect(link.id)}
                title={link.label}
                className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-3' : 'justify-center px-0'} h-10 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]'
                    : 'bg-transparent text-[#474747] border-transparent hover:bg-[#FAFAFA] hover:text-[#1B1B1B]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={16} className={isActive ? 'text-[#004227] shrink-0' : 'text-[#696969] shrink-0'} />
                  {isSidebarOpen && <span className="truncate">{link.label}</span>}
                </div>
                {isSidebarOpen && link.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono shrink-0 ${
                    isActive ? 'bg-[#004227] text-white' : 'bg-[#FFF0F5] text-[#851B40] border border-[#FBC6D9]'
                  }`}>
                    {link.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#EFEFEF] space-y-1.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/app')}
            title="Ir al ERP"
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 gap-2.5' : 'justify-center'} h-9 rounded-[10px] text-xs font-semibold text-[#474747] hover:bg-[#FAFAFA] hover:text-[#1B1B1B] transition-colors cursor-pointer`}
          >
            <Building size={15} className="text-[#696969] shrink-0" />
            {isSidebarOpen && <span>Ir al ERP</span>}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar Sesión"
            className={`w-full flex items-center ${isSidebarOpen ? 'px-3 gap-2.5' : 'justify-center'} h-9 rounded-[10px] text-xs font-semibold text-[#851B40] hover:bg-[#FFF0F5] transition-colors cursor-pointer`}
          >
            <LogOut size={15} className="shrink-0" />
            {isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-[#E3E3E3] px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <UiButton
              type="button"
              iconOnly
              variant="secondary"
              size="md"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              title="Alternar menú"
              aria-label="Alternar menú"
            >
              <Menu size={16} />
            </UiButton>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#1B1B1B] truncate">
                {TAB_TITLES[activeTab] || 'Panel SuperAdmin'}
              </h1>
              <p className="text-[11px] text-[#696969] hidden sm:block truncate">
                Administración multi-tenant, activación de planes y control SRI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              loadError
                ? 'bg-[#FFF0F5] text-[#851B40] border-[#FBC6D9]'
                : 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${loadError ? 'bg-[#D9306B]' : 'bg-[#0B996F] animate-pulse'}`} />
              <span className="hidden sm:inline">{loadError ? 'Sin conexión' : loading ? 'Sincronizando' : `${tenants.length} tenants`}</span>
            </span>
          </div>
        </header>

        {/* SCROLLABLE BODY */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[1440px] mx-auto space-y-5">
            {loadError && (
              <div role="alert" className="p-3.5 rounded-xl bg-[#FFF0F5] border border-[#FBC6D9] text-xs font-semibold text-[#851B40] flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{loadError}</span>
              </div>
            )}

            {/* Hidden/Mounted Users & Registrations view so summary counter stays fresh */}
            {isSuperAdmin && (
              <div className={activeTab === 'users' ? '' : 'hidden'}>
                <RegistrationAdminView
                  plans={plans}
                  onSummary={setRegistrationSummary}
                  showToast={showToast}
                  onOpenTenant={id => {
                    const tenant = tenants.find(item => item.id === id);
                    if (!tenant) {
                      showToast?.('La empresa no está disponible. Actualiza el listado.', 'error');
                      return;
                    }
                    setActiveTab('tenants');
                    handleSelectTenant(tenant);
                  }}
                />
              </div>
            )}

            {/* ==================== TAB: DASHBOARD ==================== */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Actionable alerts */}
                {(pendingRegistrations.length > 0 || registrationSummary.incomplete > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pendingRegistrations.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setTenantStatusFilter('pending_approval'); setActiveTab('tenants'); }}
                        className="p-4 rounded-2xl border border-[#F0DF8A] bg-[#FCFBE7] hover:bg-[#faf6d2] text-left transition-colors cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UiIconBadge level="kpi" tone="warning" icon={Clock} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#866308]">
                              {pendingRegistrations.length} {pendingRegistrations.length === 1 ? 'empresa esperando activación' : 'empresas esperando activación'}
                            </p>
                            <p className="text-[11px] text-[#866308]/85 truncate">Asigna plan y activa en 1 paso</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#866308] shrink-0">Revisar →</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('users')}
                      className="p-4 rounded-2xl border border-[#E3E3E3] bg-white hover:bg-[#FAFAFA] text-left transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UiIconBadge level="kpi" tone="neutral" icon={Users} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1B1B1B]">
                            {registrationSummary.loading
                              ? 'Comprobando registros…'
                              : registrationSummary.error
                                ? 'Revisar servicio de altas'
                                : `${registrationSummary.incomplete} registros incompletos`}
                          </p>
                          <p className="text-[11px] text-[#696969] truncate">Contactos, perfiles huérfanos y verificaciones</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#004227] shrink-0">Abrir →</span>
                    </button>
                  </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#696969] block">Empresas Activas</span>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1B1B1B] mt-1">{activeTenantsList.length}</div>
                      <span className="text-[11px] text-[#0B996F] font-medium">
                        {trialTenantsList.length} en prueba · {tenants.length} total
                      </span>
                    </div>
                    <UiIconBadge level="kpi" tone="brand" icon={Building} />
                  </div>

                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#696969] block">Por Aprobar</span>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#866308] mt-1">{pendingRegistrations.length}</div>
                      <span className="text-[11px] text-[#696969]">Solicitudes pendientes</span>
                    </div>
                    <UiIconBadge level="kpi" tone="warning" icon={Clock} />
                  </div>

                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#696969] block">MRR Estimado</span>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#004227] mt-1">${mrr.toFixed(2)}</div>
                      <span className="text-[11px] text-[#0B996F] font-medium">Suscripciones activas</span>
                    </div>
                    <UiIconBadge level="kpi" tone="success" icon={DollarSign} />
                  </div>

                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#696969] block">Pagos en Espera</span>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1B1B1B] mt-1">{pendingTransfers.length}</div>
                      <span className="text-[11px] text-[#696969]">Transferencias por validar</span>
                    </div>
                    <UiIconBadge level="kpi" tone="neutral" icon={CreditCard} />
                  </div>
                </div>

                {/* Recent Tenants & Pending Transfers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#1B1B1B]">Últimas Empresas Registradas</h3>
                      <UiButton type="button" variant="secondary" size="sm" onClick={() => setActiveTab('tenants')}>
                        Ver todas
                      </UiButton>
                    </div>
                    {tenants.length === 0 ? (
                      <p className="text-xs text-[#696969] py-6 text-center">No hay empresas registradas aún.</p>
                    ) : (
                      <div className="divide-y divide-[#EFEFEF]">
                        {tenants.slice(0, 6).map((t) => {
                          const statusLabel = tenantStatus(t);
                          return (
                            <div key={t.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => { setActiveTab('tenants'); handleSelectTenant(t); }}
                                  className="font-bold text-[#1B1B1B] hover:text-[#004227] truncate block text-left cursor-pointer"
                                >
                                  {t.companyName || 'Empresa sin nombre'}
                                </button>
                                <p className="text-[11px] text-[#696969] truncate">
                                  {getPlanName(t.planId)} · {t.ownerEmail || t.id}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_PILL_STYLES[statusLabel] || STATUS_PILL_STYLES.Prueba}`}>
                                  {statusLabel}
                                </span>
                                {t.planStatus === 'pending_approval' ? (
                                  <UiButton type="button" variant="brand" size="sm" onClick={() => openActivationModal(t)}>
                                    Activar
                                  </UiButton>
                                ) : (
                                  <UiButton
                                    type="button"
                                    iconOnly
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => { setActiveTab('tenants'); handleSelectTenant(t); }}
                                    title="Gestionar empresa"
                                    aria-label="Gestionar empresa"
                                  >
                                    <Edit3 size={14} />
                                  </UiButton>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#1B1B1B]">Transferencias por Validar</h3>
                      <UiButton type="button" variant="secondary" size="sm" onClick={() => setActiveTab('transfers')}>
                        Ver pagos
                      </UiButton>
                    </div>
                    {pendingTransfers.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <div className="flex justify-center">
                          <UiIconBadge level="empty" tone="brand" icon={CheckCircle2} />
                        </div>
                        <p className="text-xs text-[#696969]">No hay transferencias pendientes de verificación.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#EFEFEF]">
                        {pendingTransfers.slice(0, 6).map((tr) => (
                          <div key={tr.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <p className="font-bold text-[#1B1B1B] truncate">{tr.companyName || tr.tenantId}</p>
                              <p className="text-[11px] text-[#696969] font-mono truncate">
                                Ref: {tr.referenceNumber} · {getPlanName(tr.planId)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-[#004227]">${Number(tr.amount || 0).toFixed(2)}</span>
                              <UiButton type="button" variant="soft" size="sm" onClick={() => setSelectedTransfer(tr)}>
                                Revisar
                              </UiButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB: TENANTS ==================== */}
            {activeTab === 'tenants' && (
              <div>
                {/* VIEW: LIST */}
                {viewMode === 'list' && (
                  <div className="space-y-4">
                    {/* Header toolbar */}
                    <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="w-full sm:max-w-sm">
                          <UiInput
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar empresa, correo, ID o plan..."
                            iconPrefix={<Search size={14} className="text-[#696969]" />}
                            size="2"
                            className="w-full"
                          />
                        </div>
                        <UiButton
                          type="button"
                          variant="primary"
                          size="md"
                          onClick={() => setViewMode('create')}
                        >
                          <Plus size={14} />
                          <span>Agregar Empresa</span>
                        </UiButton>
                      </div>

                      <UiSegmentedTabs
                        value={tenantStatusFilter}
                        onChange={setTenantStatusFilter}
                        items={[
                          { value: 'all', label: 'Todos', count: tenants.length },
                          { value: 'pending_approval', label: 'Por aprobar', count: pendingRegistrations.length, dotColor: '#D97706' },
                          { value: 'active', label: 'Activos', count: activeTenantsList.length, dotColor: '#0B996F' },
                          { value: 'trial', label: 'Prueba', count: trialTenantsList.length },
                          { value: 'inactive', label: 'Vencidos / Susp.', count: inactiveTenantsList.length, dotColor: '#D9306B' }
                        ]}
                      />
                    </div>

                    {filteredTenants.length === 0 ? (
                      <div className="bg-white border border-[#E3E3E3] rounded-2xl p-10 text-center space-y-2">
                        <div className="flex justify-center">
                          <UiIconBadge level="empty" tone="neutral" icon={Building} />
                        </div>
                        <p className="text-sm font-bold text-[#1B1B1B]">No se encontraron empresas</p>
                        <p className="text-xs text-[#696969]">Prueba cambiando el filtro de estado o el término de búsqueda.</p>
                      </div>
                    ) : (
                      <>
                        {/* Mobile Cards (< md) */}
                        <div className="md:hidden space-y-3">
                          {filteredTenants.map((tenant) => {
                            const statusLabel = tenantStatus(tenant);
                            const expiry = getSubscriptionExpiry(tenant);
                            return (
                              <div key={tenant.id} className="bg-white border border-[#E3E3E3] rounded-2xl p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-[#1B1B1B] truncate">{tenant.companyName || 'Sin nombre'}</h3>
                                    <p className="text-xs text-[#474747] truncate">{tenant.ownerEmail || 'Sin correo'}</p>
                                    <p className="text-[11px] font-mono text-[#696969] truncate">ID: {tenant.id}</p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_PILL_STYLES[statusLabel] || STATUS_PILL_STYLES.Prueba}`}>
                                    {statusLabel}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#FAFAFA] border border-[#EFEFEF] text-xs">
                                  <div>
                                    <span className="text-[10px] text-[#696969] font-semibold uppercase block">Plan</span>
                                    <span className="font-bold text-[#1B1B1B]">{getPlanName(tenant.planId)}</span>
                                    <span className="text-[10px] text-[#696969] block">{tenant.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#696969] font-semibold uppercase block">Vencimiento</span>
                                    <span className="font-mono font-semibold text-[#1B1B1B]">
                                      {expiry ? expiry.toLocaleDateString('es-EC') : 'Sin activar'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  {(tenant.planStatus === 'pending_approval' || isSubscriptionBlocked(tenant)) && (
                                    <UiButton
                                      type="button"
                                      variant="brand"
                                      size="sm"
                                      onClick={() => openActivationModal(tenant)}
                                      className="flex-1"
                                    >
                                      <Sparkles size={13} />
                                      <span>{tenant.planStatus === 'pending_approval' ? 'Activar Plan' : 'Reactivar'}</span>
                                    </UiButton>
                                  )}
                                  <UiButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleSelectTenant(tenant)}
                                    className="flex-1"
                                  >
                                    <Edit3 size={13} />
                                    <span>Configurar</span>
                                  </UiButton>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block bg-white border border-[#E3E3E3] rounded-2xl overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#FAFAFA] border-b border-[#E3E3E3] text-[#696969] uppercase text-[11px] font-bold">
                                <tr>
                                  <th className="py-3 px-4">Empresa</th>
                                  <th className="py-3 px-4">Contacto / ID</th>
                                  <th className="py-3 px-4">Plan y Ciclo</th>
                                  <th className="py-3 px-4">Estado</th>
                                  <th className="py-3 px-4">Vencimiento</th>
                                  <th className="py-3 px-4 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#EFEFEF]">
                                {filteredTenants.map((tenant) => {
                                  const statusLabel = tenantStatus(tenant);
                                  const expiry = getSubscriptionExpiry(tenant);
                                  return (
                                    <tr key={tenant.id} className="hover:bg-[#FAFAFA] transition-colors">
                                      <td className="py-3.5 px-4 font-bold text-[#1B1B1B]">
                                        {tenant.companyName || 'Sin nombre'}
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <div className="text-[#1B1B1B]">{tenant.ownerEmail || '—'}</div>
                                        <div className="text-[11px] font-mono text-[#696969]">{tenant.id}</div>
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <div className="font-semibold text-[#1B1B1B]">{getPlanName(tenant.planId)}</div>
                                        <div className="text-[11px] text-[#696969]">{tenant.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}</div>
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_PILL_STYLES[statusLabel] || STATUS_PILL_STYLES.Prueba}`}>
                                          {statusLabel}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 font-mono text-[#474747]">
                                        {expiry ? expiry.toLocaleDateString('es-EC') : 'Sin activar'}
                                      </td>
                                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                        <div className="inline-flex items-center justify-end gap-1.5">
                                          {(tenant.planStatus === 'pending_approval' || isSubscriptionBlocked(tenant)) && (
                                            <UiButton
                                              type="button"
                                              variant="brand"
                                              size="sm"
                                              onClick={() => openActivationModal(tenant)}
                                            >
                                              <Sparkles size={13} />
                                              <span>{tenant.planStatus === 'pending_approval' ? 'Activar' : 'Reactivar'}</span>
                                            </UiButton>
                                          )}
                                          <UiButton
                                            type="button"
                                            iconOnly
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleSelectTenant(tenant)}
                                            title="Configurar empresa y plan"
                                            aria-label="Configurar empresa"
                                          >
                                            <Edit3 size={14} />
                                          </UiButton>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* VIEW: EDIT TENANT */}
                {viewMode === 'edit' && selectedTenantDetails && (
                  <div className="space-y-5">
                    {/* Top Tenant Header Card */}
                    <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <UiButton
                          type="button"
                          iconOnly
                          variant="secondary"
                          size="md"
                          onClick={() => { setViewMode('list'); setSelectedTenantDetails(null); }}
                          title="Volver al listado"
                          aria-label="Volver al listado"
                        >
                          <ChevronLeft size={16} />
                        </UiButton>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-[#1B1B1B] truncate">
                              {selectedTenantDetails.companyName || 'Empresa'}
                            </h2>
                            {(() => {
                              const liveTenant = tenants.find(t => t.id === selectedTenantDetails.id) || selectedTenantDetails;
                              const label = tenantStatus(liveTenant);
                              return (
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_PILL_STYLES[label] || STATUS_PILL_STYLES.Prueba}`}>
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs font-mono text-[#696969] truncate">
                            ID: {selectedTenantDetails.id} · {selectedTenantDetails.ownerEmail || 'Sin correo propietario'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {selectedTenantDetails.planStatus === 'pending_approval' && (
                          <UiButton
                            type="button"
                            variant="brand"
                            size="md"
                            onClick={() => openActivationModal(selectedTenantDetails)}
                          >
                            <Sparkles size={14} />
                            <span>Activar Empresa</span>
                          </UiButton>
                        )}
                        <UiButton
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={() => { setViewMode('list'); setSelectedTenantDetails(null); }}
                        >
                          Volver al listado
                        </UiButton>
                      </div>
                    </div>

                    {/* Sub-navigation Tabs */}
                    <UiSegmentedTabs
                      value={tenantEditSubTab}
                      onChange={setTenantEditSubTab}
                      items={[
                        { value: 'subscription', label: 'Suscripción y Plan', icon: CreditCard },
                        { value: 'team', label: 'Equipo y Preparación', icon: Users, count: tenantUsers.length },
                        { value: 'advanced', label: 'Historial y God Mode', icon: ShieldAlert }
                      ]}
                    />

                    {/* SUBTAB 1: SUBSCRIPTION & PLAN */}
                    {tenantEditSubTab === 'subscription' && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        {/* Left: Plan & Activation Form */}
                        <div className="lg:col-span-7 bg-white border border-[#E3E3E3] rounded-2xl p-5 sm:p-6 space-y-5">
                          <div className="flex items-center gap-2.5">
                            <UiIconBadge level="kpi" tone="brand" icon={Sliders} />
                            <div>
                              <h3 className="text-sm font-bold text-[#1B1B1B]">Configuración de Plan y Activación</h3>
                              <p className="text-[11px] text-[#696969]">
                                Puedes activar directamente en modo Activo o Prueba, asignar cualquier plan base y definir vencimiento.
                              </p>
                            </div>
                          </div>

                          <form onSubmit={handleUpdateSubscription} className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                              <label className="block font-bold text-[#1B1B1B]">Nombre de la empresa *</label>
                              <UiInput
                                required
                                value={selectedTenantDetails.companyName || ''}
                                onChange={e => setSelectedTenantDetails({ ...selectedTenantDetails, companyName: e.target.value })}
                                className="w-full"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="block font-bold text-[#1B1B1B]">Plan SaaS asignado</label>
                                <UiSelect
                                  value={selectedTenantDetails.planId || 'starter'}
                                  onChange={e => setSelectedTenantDetails({ ...selectedTenantDetails, planId: e.target.value })}
                                  className="w-full"
                                >
                                  {basePlans.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} (${Number(p.priceMonthly || 0).toFixed(2)}/mes · {(p.category || 'erp').toUpperCase()})
                                    </option>
                                  ))}
                                  {!basePlans.some(p => p.id === selectedTenantDetails.planId) && selectedTenantDetails.planId && (
                                    <option value={selectedTenantDetails.planId}>{selectedTenantDetails.planId} (Personalizado)</option>
                                  )}
                                </UiSelect>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block font-bold text-[#1B1B1B]">Ciclo de facturación</label>
                                <UiSelect
                                  value={selectedTenantDetails.billingPeriod || 'monthly'}
                                  onChange={e => {
                                    const nextPeriod = e.target.value;
                                    setSelectedTenantDetails(prev => ({
                                      ...prev,
                                      billingPeriod: nextPeriod,
                                      expiresAt: prev.planStatus === 'active'
                                        ? computeDefaultExpiryDate('active', nextPeriod)
                                        : prev.expiresAt
                                    }));
                                  }}
                                  className="w-full"
                                >
                                  <option value="monthly">Mensual</option>
                                  <option value="yearly">Anual</option>
                                </UiSelect>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="block font-bold text-[#1B1B1B]">Estado de la suscripción</label>
                                <UiSelect
                                  value={selectedTenantDetails.planStatus || 'pending_approval'}
                                  onChange={e => {
                                    const nextStatus = e.target.value;
                                    setSelectedTenantDetails(prev => ({
                                      ...prev,
                                      planStatus: nextStatus,
                                      expiresAt: ['active', 'trial'].includes(nextStatus) && !prev.expiresAt
                                        ? computeDefaultExpiryDate(nextStatus, prev.billingPeriod)
                                        : prev.expiresAt
                                    }));
                                  }}
                                  className="w-full"
                                >
                                  <option value="active">Activo (Plan habilitado)</option>
                                  <option value="trial">Prueba (Trial)</option>
                                  <option value="pending_approval">Pendiente de aprobación</option>
                                  <option value="suspended">Suspendido</option>
                                  <option value="expired">Vencido</option>
                                </UiSelect>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block font-bold text-[#1B1B1B]">Fecha de expiración</label>
                                <UiInput
                                  type="date"
                                  required={selectedTenantDetails.planStatus !== 'pending_approval'}
                                  value={selectedTenantDetails.expiresAt || ''}
                                  onChange={e => setSelectedTenantDetails({ ...selectedTenantDetails, expiresAt: e.target.value })}
                                  className="w-full"
                                />
                              </div>
                            </div>

                            {/* Quick Expiry Presets */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[11px] font-semibold text-[#696969] mr-1 flex items-center gap-1">
                                <Calendar size={12} /> Atajos:
                              </span>
                              {[
                                { label: '+14 días (Trial)', action: () => setSelectedTenantDetails(p => ({ ...p, planStatus: 'trial', expiresAt: addDaysToToday(14) })) },
                                { label: '+1 mes (Activo)', action: () => setSelectedTenantDetails(p => ({ ...p, planStatus: 'active', billingPeriod: 'monthly', expiresAt: addMonthsToToday(1) })) },
                                { label: '+3 meses', action: () => setSelectedTenantDetails(p => ({ ...p, planStatus: 'active', expiresAt: addMonthsToToday(3) })) },
                                { label: '+1 año (Anual)', action: () => setSelectedTenantDetails(p => ({ ...p, planStatus: 'active', billingPeriod: 'yearly', expiresAt: addMonthsToToday(12) })) }
                              ].map(preset => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={preset.action}
                                  className="px-2.5 py-1 rounded-[8px] border border-[#E3E3E3] bg-[#FAFAFA] hover:bg-[#E8FEDF] hover:border-[#B3F4CB] hover:text-[#004227] text-[11px] font-semibold text-[#474747] transition-colors cursor-pointer"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>

                            {saveFeedback && (
                              <div
                                role="status"
                                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                                  saveFeedback.type === 'success'
                                    ? 'bg-[#E8FEDF] border-[#B3F4CB] text-[#004227]'
                                    : 'bg-[#FFF0F5] border-[#FBC6D9] text-[#851B40]'
                                }`}
                              >
                                {saveFeedback.type === 'success'
                                  ? <CheckCircle2 size={14} className="shrink-0 text-[#0B996F]" />
                                  : <AlertTriangle size={14} className="shrink-0 text-[#D9306B]" />}
                                <span>{saveFeedback.text}</span>
                              </div>
                            )}

                            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-[#EFEFEF]">
                              <UiButton
                                type="button"
                                variant="secondary"
                                size="md"
                                onClick={() => { setViewMode('list'); setSelectedTenantDetails(null); }}
                              >
                                Cancelar
                              </UiButton>
                              <UiButton
                                type="submit"
                                variant={selectedTenantDetails.planStatus === 'active' ? 'brand' : 'primary'}
                                size="md"
                                disabled={savingTenant}
                              >
                                <CheckCircle2 size={14} />
                                <span>{savingTenant ? 'Guardando…' : 'Guardar Configuración'}</span>
                              </UiButton>
                            </div>
                          </form>
                        </div>

                        {/* Right: Consumption + Add-ons */}
                        <div className="lg:col-span-5 space-y-5">
                          {/* Consumption Metrics */}
                          <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-2.5">
                              <UiIconBadge level="kpi" tone="neutral" icon={Activity} />
                              <div>
                                <h3 className="text-sm font-bold text-[#1B1B1B]">Consumo del Plan</h3>
                                <p className="text-[11px] text-[#696969]">Límites según {selectedPlanObj?.name || 'Plan actual'}</p>
                              </div>
                            </div>

                            {loadingTenantDetails ? (
                              <p className="text-xs text-[#696969] py-4 text-center">Cargando métricas de consumo…</p>
                            ) : (
                              <div className="space-y-4 text-xs">
                                <div>
                                  <div className="flex justify-between mb-1.5">
                                    <span className="font-semibold text-[#474747]">Usuarios en equipo</span>
                                    <span className="font-mono font-bold text-[#1B1B1B]">
                                      {tenantUsers.length} / {selectedPlanObj?.maxUsers >= 9999 ? 'Ilimitados' : (selectedPlanObj?.maxUsers || 3)}
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-[#F4F4F5] overflow-hidden">
                                    <div
                                      className="h-full bg-[#0B996F] rounded-full transition-all"
                                      style={{ width: `${Math.min(100, (tenantUsers.length / Math.max(1, selectedPlanObj?.maxUsers || 3)) * 100)}%` }}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between mb-1.5">
                                    <span className="font-semibold text-[#474747]">Productos en inventario</span>
                                    <span className="font-mono font-bold text-[#1B1B1B]">
                                      {tenantStats.productsCount} / {selectedPlanObj?.maxProducts >= 99999 ? 'Ilimitados' : (selectedPlanObj?.maxProducts || 100)}
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-[#F4F4F5] overflow-hidden">
                                    <div
                                      className="h-full bg-[#1B1B1B] rounded-full transition-all"
                                      style={{ width: `${Math.min(100, (tenantStats.productsCount / Math.max(1, selectedPlanObj?.maxProducts || 100)) * 100)}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-[#EFEFEF]">
                                  <span className="font-semibold text-[#474747]">Comprobantes emitidos</span>
                                  <span className="font-mono font-bold text-[#004227] bg-[#E8FEDF] border border-[#B3F4CB] px-2.5 py-0.5 rounded-full">
                                    {tenantStats.transactionsCount}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Add-on Services */}
                          <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-2.5">
                              <UiIconBadge level="kpi" tone="success" icon={Layers} />
                              <div>
                                <h3 className="text-sm font-bold text-[#1B1B1B]">Servicios Adicionales (Add-ons)</h3>
                                <p className="text-[11px] text-[#696969]">Páginas Web, Correos y WhatsApp CRM por empresa.</p>
                              </div>
                            </div>

                            <div className="divide-y divide-[#EFEFEF]">
                              {['paginas', 'correos', 'whatsapp'].map(cat => {
                                const activeSub = selectedTenantDetails.serviceSubscriptions?.[cat];
                                const catPlans = addonPlans.filter(p => p.category === cat);
                                const currentAddonPlan = catPlans.find(p => p.id === activeSub?.planId) || catPlans[0];
                                const isActive = activeSub?.status === 'active';
                                return (
                                  <div key={cat} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                                    <div className="min-w-0">
                                      <div className="font-bold text-[#1B1B1B]">{CATEGORY_LABELS[cat]}</div>
                                      <div className="text-[11px] text-[#696969] truncate">
                                        {isActive
                                          ? `${currentAddonPlan?.name || activeSub.planId} · vence ${getSubscriptionExpiry({ planStatus: 'active', subscriptionExpiresAt: activeSub.expiresAt })?.toLocaleDateString('es-EC') || '—'}`
                                          : 'No contratado'}
                                      </div>
                                    </div>
                                    {currentAddonPlan && (
                                      <UiButton
                                        type="button"
                                        size="sm"
                                        variant={isActive ? 'danger' : 'soft'}
                                        disabled={savingAddon === cat}
                                        onClick={() => handleAssignAddonService(currentAddonPlan, !isActive)}
                                      >
                                        {savingAddon === cat ? '…' : isActive ? 'Quitar' : 'Activar'}
                                      </UiButton>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB 2: TEAM & SETUP */}
                    {tenantEditSubTab === 'team' && (
                      <TenantAdminPanel
                        key={`team_${selectedTenantDetails.id}`}
                        tenant={selectedTenantDetails}
                        currentUser={currentUser}
                        onUsersChange={setTenantUsers}
                        showToast={showToast}
                        section="team"
                      />
                    )}

                    {/* SUBTAB 3: HISTORY & GOD MODE */}
                    {tenantEditSubTab === 'advanced' && (
                      <div className="space-y-5">
                        <TenantAdminPanel
                          key={`hist_${selectedTenantDetails.id}`}
                          tenant={selectedTenantDetails}
                          currentUser={currentUser}
                          onUsersChange={setTenantUsers}
                          showToast={showToast}
                          section="history"
                        />

                        {/* God Mode */}
                        <div className="bg-white border border-[#FBC6D9] rounded-2xl p-5 space-y-5">
                          <div className="flex items-start gap-3">
                            <UiIconBadge level="modal" tone="danger" icon={ShieldAlert} />
                            <div>
                              <h3 className="text-sm font-bold text-[#851B40]">God Mode: Respaldo y Datos Crudos</h3>
                              <p className="text-xs text-[#696969]">
                                Herramientas avanzadas de soporte. Modifican directamente las colecciones del inquilino en Firestore.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2.5">
                            <UiButton type="button" variant="primary" size="md" onClick={handleExportBackup} disabled={isExporting}>
                              <Download size={14} />
                              <span>{isExporting ? 'Generando JSON…' : 'Descargar Backup (JSON)'}</span>
                            </UiButton>
                            <UiButton type="button" variant="danger" size="md" onClick={handleWipeSandbox} disabled={isWiping}>
                              <XCircle size={14} />
                              <span>{isWiping ? 'Limpiando…' : 'Resetear Sandbox'}</span>
                            </UiButton>
                          </div>

                          <div className="border border-[#E3E3E3] rounded-xl p-4 space-y-3 bg-[#FAFAFA]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <h4 className="text-xs font-bold text-[#1B1B1B] uppercase tracking-wider">Explorador de Colecciones</h4>
                              <div className="flex items-center gap-2">
                                <UiSelect value={godModeCollection} onChange={(e) => setGodModeCollection(e.target.value)}>
                                  <option value="finances_transactions">finances_transactions</option>
                                  <option value="finances_third_parties">finances_third_parties</option>
                                  <option value="inventory_products">inventory_products</option>
                                  <option value="finances_liabilities">finances_liabilities</option>
                                  <option value="finances_settings">finances_settings</option>
                                  <option value="meta">meta</option>
                                </UiSelect>
                                <UiButton type="button" iconOnly variant="secondary" size="md" onClick={loadGodModeData} title="Refrescar datos" aria-label="Refrescar datos">
                                  <RefreshCw size={14} className={isLoadingGodMode ? 'animate-spin' : ''} />
                                </UiButton>
                              </div>
                            </div>

                            {isLoadingGodMode ? (
                              <p className="text-center py-6 text-xs text-[#696969]">Cargando documentos…</p>
                            ) : (
                              <div className="overflow-x-auto bg-white rounded-xl border border-[#E3E3E3]">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-[#FAFAFA] border-b border-[#E3E3E3] text-[#696969] uppercase text-[11px] font-bold">
                                    <tr>
                                      <th className="py-2.5 px-3">ID</th>
                                      <th className="py-2.5 px-3">Extracto JSON</th>
                                      <th className="py-2.5 px-3 text-right">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#EFEFEF]">
                                    {godModeData.length === 0 ? (
                                      <tr><td colSpan="3" className="py-6 text-center text-[#696969]">Colección vacía.</td></tr>
                                    ) : (
                                      godModeData.map(docData => (
                                        <tr key={docData.id} className="hover:bg-[#FFF0F5]/40">
                                          <td className="py-2.5 px-3 font-mono font-bold text-[#1B1B1B] whitespace-nowrap">{docData.id}</td>
                                          <td className="py-2.5 px-3">
                                            <div className="max-w-md truncate font-mono text-[11px] text-[#696969]">
                                              {JSON.stringify(docData).substring(0, 130)}…
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                            <UiButton type="button" variant="danger" size="sm" onClick={() => handleDeleteGodModeDoc(docData.id)}>
                                              Eliminar
                                            </UiButton>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW: CREATE TENANT */}
                {viewMode === 'create' && (
                  <div className="space-y-5 max-w-2xl">
                    <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 sm:p-5 flex items-center gap-3">
                      <UiButton
                        type="button"
                        iconOnly
                        variant="secondary"
                        size="md"
                        onClick={() => setViewMode('list')}
                        title="Volver al listado"
                        aria-label="Volver al listado"
                      >
                        <ChevronLeft size={16} />
                      </UiButton>
                      <div>
                        <h2 className="text-base font-bold text-[#1B1B1B]">Agregar Nueva Empresa</h2>
                        <p className="text-xs text-[#696969]">Crea el tenant, el propietario en Firebase Auth y asigna su plan inicial.</p>
                      </div>
                    </div>

                    <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 sm:p-6">
                      <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block font-bold text-[#1B1B1B]">Razón Social *</label>
                            <UiInput
                              type="text"
                              required
                              placeholder="Ej. WebFix Soluciones Cía. Ltda."
                              value={newTenantForm.companyName}
                              onChange={e => setNewTenantForm({ ...newTenantForm, companyName: e.target.value })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block font-bold text-[#1B1B1B]">Inquilino ID / RUC *</label>
                            <UiInput
                              type="text"
                              required
                              placeholder="Ej. org_webfix o 1792945281001"
                              value={newTenantForm.tenantId}
                              onChange={e => setNewTenantForm({ ...newTenantForm, tenantId: e.target.value })}
                              className="w-full font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block font-bold text-[#1B1B1B]">Correo del propietario *</label>
                            <UiInput
                              type="email"
                              required
                              placeholder="cliente@empresa.com"
                              value={newTenantForm.email}
                              onChange={e => setNewTenantForm({ ...newTenantForm, email: e.target.value })}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block font-bold text-[#1B1B1B]">Contraseña inicial *</label>
                            <UiInput
                              type="text"
                              required
                              value={newTenantForm.initialPassword}
                              onChange={e => setNewTenantForm({ ...newTenantForm, initialPassword: e.target.value })}
                              className="w-full font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block font-bold text-[#1B1B1B]">Plan SaaS</label>
                            <UiSelect
                              value={newTenantForm.planId}
                              onChange={e => setNewTenantForm({ ...newTenantForm, planId: e.target.value })}
                              className="w-full"
                            >
                              {basePlans.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (${Number(p.priceMonthly || 0).toFixed(2)}/mes)
                                </option>
                              ))}
                            </UiSelect>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block font-bold text-[#1B1B1B]">Ciclo</label>
                            <UiSelect
                              value={newTenantForm.billingPeriod}
                              onChange={e => {
                                const nextPeriod = e.target.value;
                                setNewTenantForm(prev => ({
                                  ...prev,
                                  billingPeriod: nextPeriod,
                                  expiresAt: computeDefaultExpiryDate(prev.planStatus, nextPeriod)
                                }));
                              }}
                              className="w-full"
                            >
                              <option value="monthly">Mensual</option>
                              <option value="yearly">Anual</option>
                            </UiSelect>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block font-bold text-[#1B1B1B]">Estado inicial</label>
                            <UiSelect
                              value={newTenantForm.planStatus}
                              onChange={e => {
                                const nextStatus = e.target.value;
                                setNewTenantForm(prev => ({
                                  ...prev,
                                  planStatus: nextStatus,
                                  expiresAt: computeDefaultExpiryDate(nextStatus, prev.billingPeriod)
                                }));
                              }}
                              className="w-full"
                            >
                              <option value="active">Activo (Plan habilitado)</option>
                              <option value="trial">Prueba (14 días)</option>
                              <option value="suspended">Suspendido</option>
                            </UiSelect>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block font-bold text-[#1B1B1B]">Fecha de vencimiento</label>
                            <UiInput
                              type="date"
                              required
                              value={newTenantForm.expiresAt}
                              onChange={e => setNewTenantForm({ ...newTenantForm, expiresAt: e.target.value })}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newTenantForm.sendResetEmail}
                            onChange={e => setNewTenantForm({ ...newTenantForm, sendResetEmail: e.target.checked })}
                            className="w-4 h-4 accent-[#0B996F]"
                          />
                          <span className="font-semibold text-[#1B1B1B]">
                            Enviar enlace de restablecimiento de contraseña por correo
                          </span>
                        </label>

                        <div className="flex justify-end gap-2 pt-4 border-t border-[#EFEFEF]">
                          <UiButton type="button" variant="secondary" size="md" onClick={() => setViewMode('list')}>
                            Cancelar
                          </UiButton>
                          <UiButton type="submit" variant="brand" size="md" disabled={isCreatingTenant}>
                            <Plus size={14} />
                            <span>{isCreatingTenant ? 'Creando empresa…' : 'Crear Empresa'}</span>
                          </UiButton>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB: TRANSFERS ==================== */}
            {!loading && activeTab === 'transfers' && (
              <div className="space-y-4">
                <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <UiSegmentedTabs
                    value={transferFilter}
                    onChange={setTransferFilter}
                    items={[
                      { value: 'pending', label: 'Pendientes', count: pendingTransfers.length, dotColor: '#D97706' },
                      { value: 'approved', label: 'Aprobadas', count: transfers.filter(t => t.status === 'approved').length, dotColor: '#0B996F' },
                      { value: 'rejected', label: 'Rechazadas', count: transfers.filter(t => t.status === 'rejected').length, dotColor: '#D9306B' },
                      { value: 'all', label: 'Todas', count: transfers.length }
                    ]}
                  />
                </div>

                {filteredTransfers.length === 0 ? (
                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-10 text-center space-y-2">
                    <div className="flex justify-center">
                      <UiIconBadge level="empty" tone="neutral" icon={CreditCard} />
                    </div>
                    <p className="text-sm font-bold text-[#1B1B1B]">Sin transferencias en esta vista</p>
                    <p className="text-xs text-[#696969]">Cuando un cliente reporte un pago por transferencia aparecerá aquí.</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {filteredTransfers.map((tr) => (
                        <div key={tr.id} className="bg-white border border-[#E3E3E3] rounded-2xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#1B1B1B] truncate">{tr.companyName || 'Empresa'}</p>
                              <p className="text-[11px] font-mono text-[#696969] truncate">Ref: {tr.referenceNumber}</p>
                            </div>
                            <span className="font-mono text-sm font-extrabold text-[#004227]">${Number(tr.amount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[#474747]">
                            <span>{getPlanName(tr.planId)} ({tr.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'})</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              tr.status === 'approved' ? 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]' :
                              tr.status === 'pending' ? 'bg-[#FCFBE7] text-[#866308] border-[#F0DF8A]' :
                              'bg-[#FFF0F5] text-[#851B40] border-[#FBC6D9]'
                            }`}>
                              {tr.status === 'approved' ? 'Aprobado' : tr.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <UiButton type="button" variant="secondary" size="sm" onClick={() => setSelectedTransfer(tr)} className="flex-1">
                              <Eye size={13} />
                              <span>Ver comprobante</span>
                            </UiButton>
                            {tr.status === 'pending' && (
                              <UiButton type="button" variant="brand" size="sm" onClick={() => handleApproveTransfer(tr)} className="flex-1">
                                <Check size={13} />
                                <span>Aprobar</span>
                              </UiButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white border border-[#E3E3E3] rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#FAFAFA] border-b border-[#E3E3E3] text-[#696969] uppercase text-[11px] font-bold">
                            <tr>
                              <th className="py-3 px-4">Empresa</th>
                              <th className="py-3 px-4">Plan solicitado</th>
                              <th className="py-3 px-4">Monto</th>
                              <th className="py-3 px-4">Referencia</th>
                              <th className="py-3 px-4">Estado</th>
                              <th className="py-3 px-4 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFEFEF]">
                            {filteredTransfers.map((tr) => (
                              <tr key={tr.id} className="hover:bg-[#FAFAFA]">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-[#1B1B1B]">{tr.companyName || 'Empresa'}</div>
                                  <div className="text-[11px] font-mono text-[#696969]">{tr.tenantId}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="font-semibold text-[#1B1B1B]">{getPlanName(tr.planId)}</span>
                                  <span className="text-[#696969] ml-1">({tr.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'})</span>
                                </td>
                                <td className="py-3.5 px-4 font-mono font-bold text-[#004227]">${Number(tr.amount || 0).toFixed(2)}</td>
                                <td className="py-3.5 px-4 font-mono text-[#474747]">{tr.referenceNumber}</td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                    tr.status === 'approved' ? 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]' :
                                    tr.status === 'pending' ? 'bg-[#FCFBE7] text-[#866308] border-[#F0DF8A]' :
                                    'bg-[#FFF0F5] text-[#851B40] border-[#FBC6D9]'
                                  }`}>
                                    {tr.status === 'approved' ? 'Aprobado' : tr.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    <UiButton type="button" iconOnly variant="secondary" size="sm" onClick={() => setSelectedTransfer(tr)} title="Ver comprobante" aria-label="Ver comprobante">
                                      <Eye size={14} />
                                    </UiButton>
                                    {tr.status === 'pending' && (
                                      <>
                                        <UiButton type="button" iconOnly variant="soft" size="sm" onClick={() => handleApproveTransfer(tr)} title="Aprobar pago" aria-label="Aprobar pago">
                                          <Check size={14} />
                                        </UiButton>
                                        <UiButton type="button" iconOnly variant="danger" size="sm" onClick={() => handleRejectTransfer(tr)} title="Rechazar pago" aria-label="Rechazar pago">
                                          <X size={14} />
                                        </UiButton>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ==================== TAB: PLANS ==================== */}
            {!loading && activeTab === 'plans' && (
              <div className="space-y-5">
                <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UiIconBadge level="header" tone="brand" icon={Sliders} />
                      <div>
                        <h2 className="text-base font-bold text-[#1B1B1B]">Catálogo de Tarifas y Planes</h2>
                        <p className="text-xs text-[#696969]">
                          Personaliza precios (incluyendo decimales), límites, módulos y beneficios. Los cambios se sincronizan al instante con todos los tenants.
                        </p>
                      </div>
                    </div>
                  </div>

                  <UiSegmentedTabs
                    value={planCategoryFilter}
                    onChange={setPlanCategoryFilter}
                    items={[
                      { value: 'all', label: 'Todos', count: plans.length },
                      { value: 'erp', label: 'ERP', count: plans.filter(p => (p.category || 'erp') === 'erp').length },
                      { value: 'facturacion', label: 'Facturación SRI', count: plans.filter(p => p.category === 'facturacion').length },
                      { value: 'paginas', label: 'Páginas Web', count: plans.filter(p => p.category === 'paginas').length },
                      { value: 'correos', label: 'Correos', count: plans.filter(p => p.category === 'correos').length },
                      { value: 'whatsapp', label: 'WhatsApp CRM', count: plans.filter(p => p.category === 'whatsapp').length }
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlans.map((plan) => {
                    const cat = plan.category || 'erp';
                    const isBase = isBasePlanCategory(cat);
                    return (
                      <div key={plan.id} className="bg-white border border-[#E3E3E3] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#B3F4CB] transition-colors">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-bold text-[#1B1B1B]">{plan.name}</h3>
                                {plan.isPopular && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8FEDF] text-[#004227] border border-[#B3F4CB]">
                                    Popular
                                  </span>
                                )}
                                {plan.active === false && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF0F5] text-[#851B40] border border-[#FBC6D9]">
                                    Oculto
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#696969] font-mono mt-0.5">
                                {CATEGORY_LABELS[cat] || cat} · {plan.id}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#FAFAFA] border border-[#EFEFEF]">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-[#696969] block">Mensual</span>
                              <span className="text-lg font-extrabold font-mono text-[#1B1B1B]">${Number(plan.priceMonthly || 0).toFixed(2)}</span>
                              <span className="text-[10px] text-[#696969]">/mes</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-[#696969] block">Anual</span>
                              <span className="text-lg font-extrabold font-mono text-[#004227]">${Number(plan.priceYearly || 0).toFixed(2)}</span>
                              <span className="text-[10px] text-[#696969]">/mes</span>
                            </div>
                          </div>

                          {isBase && (
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between text-[#474747]">
                                <span className="flex items-center gap-1.5"><Users size={13} className="text-[#696969]" /> Usuarios</span>
                                <strong className="font-mono text-[#1B1B1B]">{plan.maxUsers >= 9999 ? 'Ilimitados' : (plan.maxUsers ?? 0)}</strong>
                              </div>
                              <div className="flex items-center justify-between text-[#474747]">
                                <span className="flex items-center gap-1.5"><Package size={13} className="text-[#696969]" /> Productos</span>
                                <strong className="font-mono text-[#1B1B1B]">{plan.maxProducts >= 99999 ? 'Ilimitados' : (plan.maxProducts ?? 0)}</strong>
                              </div>
                            </div>
                          )}

                          {(plan.modules || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {plan.modules.map(mod => (
                                <span key={mod} className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-[#E3E3E3] text-[10px] font-semibold text-[#474747]">
                                  {MODULE_LABELS[mod] || mod}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <UiButton
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={() => setEditingPlan({
                            ...plan,
                            category: plan.category || 'erp',
                            priceMonthly: Number(plan.priceMonthly || 0),
                            priceYearly: Number(plan.priceYearly || 0),
                            maxUsers: Number.isFinite(Number(plan.maxUsers)) ? Number(plan.maxUsers) : 0,
                            maxProducts: Number.isFinite(Number(plan.maxProducts)) ? Number(plan.maxProducts) : 0,
                            modules: Array.isArray(plan.modules) ? plan.modules : [],
                            active: plan.active !== false,
                            featuresText: (plan.features || []).join('\n')
                          })}
                          className="w-full"
                        >
                          <Edit3 size={14} />
                          <span>Personalizar Plan</span>
                        </UiButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================== TAB: SRI MONITOR ==================== */}
            {activeTab === 'sri_monitor' && (
              <div className="space-y-5">
                <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <UiIconBadge level="header" tone="warning" icon={ShieldAlert} />
                    <div>
                      <h2 className="text-base font-bold text-[#1B1B1B]">Monitor SRI Global Multi-Tenant</h2>
                      <p className="text-xs text-[#696969]">
                        Supervisa comprobantes pendientes en todos los inquilinos sin pérdida de secuencial fiscal.
                        {lastScanDate && (
                          <span className="ml-1.5 font-mono">
                            (Último escaneo: {lastScanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <UiButton
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => handleScanAllSri(false)}
                      disabled={isScanningSri || isReconcilingSri}
                    >
                      <RefreshCw size={14} className={isScanningSri ? 'animate-spin' : ''} />
                      <span>{isScanningSri ? 'Escaneando…' : 'Escanear'}</span>
                    </UiButton>
                    <UiButton
                      type="button"
                      variant="brand"
                      size="md"
                      onClick={handleBatchReconcileSri}
                      disabled={isReconcilingSri || pendingSriDocs.length === 0}
                    >
                      <Zap size={14} />
                      <span>{isReconcilingSri ? 'Sincronizando…' : `Sincronizar (${pendingSriDocs.length})`}</span>
                    </UiButton>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-[#696969] block">Pendientes</span>
                      <div className="text-2xl font-extrabold font-mono text-[#866308]">{pendingSriDocs.length}</div>
                    </div>
                    <UiIconBadge level="kpi" tone="warning" icon={ShieldAlert} />
                  </div>
                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-[#696969] block">Empresas</span>
                      <div className="text-2xl font-extrabold font-mono text-[#1B1B1B]">{new Set(pendingSriDocs.map(d => d.tenantId)).size}</div>
                    </div>
                    <UiIconBadge level="kpi" tone="neutral" icon={Building} />
                  </div>
                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-[#696969] block">Reconciliados</span>
                      <div className="text-2xl font-extrabold font-mono text-[#004227]">{reconcileStats.authorized}</div>
                    </div>
                    <UiIconBadge level="kpi" tone="success" icon={CheckCircle2} />
                  </div>
                  <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-[#696969] block">Pasarela SRI</span>
                      <div className="text-sm font-bold text-[#004227] flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-[#0B996F] animate-pulse" />
                        Online
                      </div>
                    </div>
                    <UiIconBadge level="kpi" tone="brand" icon={Globe} />
                  </div>
                </div>

                {isReconcilingSri && (
                  <div className="bg-[#1B1B1B] text-white rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#B3F4CB]" />
                        Reconciliando {reconcileProgress.current} de {reconcileProgress.total}
                      </span>
                      <span className="font-mono font-bold text-[#B3F4CB]">
                        {reconcileProgress.total > 0 ? Math.round((reconcileProgress.current / reconcileProgress.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full bg-[#0B996F] transition-all"
                        style={{ width: `${reconcileProgress.total > 0 ? (reconcileProgress.current / reconcileProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Toolbar */}
                <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="w-full md:w-72">
                    <UiInput
                      placeholder="Buscar empresa, secuencial o clave..."
                      value={sriSearchTerm}
                      onChange={(e) => setSriSearchTerm(e.target.value)}
                      iconPrefix={<Search size={14} className="text-[#696969]" />}
                      size="2"
                      className="w-full"
                    />
                  </div>
                  <UiSegmentedTabs
                    value={sriDocTypeFilter}
                    onChange={setSriDocTypeFilter}
                    items={[
                      { value: 'all', label: 'Todos' },
                      { value: 'factura', label: 'Facturas' },
                      { value: 'retencion', label: 'Retenciones' },
                      { value: 'nota_credito', label: 'N. Crédito' },
                      { value: 'guia_remision', label: 'Guías' }
                    ]}
                  />
                </div>

                {(() => {
                  const term = sriSearchTerm.toLowerCase();
                  const filtered = pendingSriDocs.filter(d => {
                    const matchType = sriDocTypeFilter === 'all' || d.documentType === sriDocTypeFilter;
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
                      <div className="bg-white border border-[#E3E3E3] rounded-2xl p-10 text-center space-y-2">
                        <div className="flex justify-center">
                          <UiIconBadge level="empty" tone="brand" icon={CheckCircle2} />
                        </div>
                        <p className="text-sm font-bold text-[#1B1B1B]">Comprobantes al día en todos los tenants</p>
                        <p className="text-xs text-[#696969]">No hay documentos pendientes de autorización en esta vista.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Mobile Cards */}
                      <div className="md:hidden space-y-3">
                        {filtered.map((item) => {
                          const isVerifying = verifyingDocId === item.id;
                          return (
                            <div key={`${item.tenantId}_${item.id}`} className="bg-white border border-[#E3E3E3] rounded-2xl p-4 space-y-2.5 text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-[#1B1B1B] truncate">{item.tenantName}</p>
                                  <p className="font-mono text-[11px] text-[#696969]">{item.documentNumber || 'Sin número'}</p>
                                </div>
                                <span className="font-mono font-bold text-[#1B1B1B]">${Number(item.total || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <UiButton
                                  type="button"
                                  variant="soft-amber"
                                  size="sm"
                                  disabled={isVerifying || isReconcilingSri}
                                  onClick={() => handleReconcileSingle(item)}
                                  className="flex-1"
                                >
                                  <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
                                  <span>{isVerifying ? 'Consultando…' : 'Consultar SRI'}</span>
                                </UiButton>
                                {item.claveAcceso && (
                                  <UiButton type="button" iconOnly variant="secondary" size="sm" onClick={() => copyToClipboard(item.claveAcceso, item.id)} aria-label="Copiar clave">
                                    <Copy size={14} className={copiedKey === item.id ? 'text-[#0B996F]' : ''} />
                                  </UiButton>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden md:block bg-white border border-[#E3E3E3] rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#FAFAFA] border-b border-[#E3E3E3] text-[#696969] uppercase text-[11px] font-bold">
                              <tr>
                                <th className="py-3 px-4">Empresa</th>
                                <th className="py-3 px-4">Tipo / Secuencial</th>
                                <th className="py-3 px-4">Clave de Acceso</th>
                                <th className="py-3 px-4">Receptor</th>
                                <th className="py-3 px-4 text-right">Total</th>
                                <th className="py-3 px-4 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFEFEF]">
                              {filtered.map((item) => {
                                const isVerifying = verifyingDocId === item.id;
                                return (
                                  <tr key={`${item.tenantId}_${item.id}`} className="hover:bg-[#FAFAFA]">
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-[#1B1B1B]">{item.tenantName}</div>
                                      <div className="font-mono text-[11px] text-[#696969]">{item.tenantId}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-mono font-bold text-[#1B1B1B]">{item.documentNumber || 'Sin número'}</div>
                                      <div className="text-[11px] text-[#696969]">{getDocumentTypeName(item.documentType)}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#474747]">
                                        <span>{item.claveAcceso ? `${item.claveAcceso.slice(0, 10)}…${item.claveAcceso.slice(-10)}` : 'Sin clave'}</span>
                                        {item.claveAcceso && (
                                          <UiButton type="button" iconOnly variant="secondary" size="sm" onClick={() => copyToClipboard(item.claveAcceso, item.id)} title="Copiar clave" aria-label="Copiar clave">
                                            <Copy size={13} className={copiedKey === item.id ? 'text-[#0B996F]' : ''} />
                                          </UiButton>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 max-w-[180px] truncate">
                                      <div className="font-semibold text-[#1B1B1B] truncate">{item.thirdParty?.name || 'Consumidor Final'}</div>
                                      <div className="text-[11px] font-mono text-[#696969]">{item.thirdParty?.ruc || ''}</div>
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-bold text-[#1B1B1B]">
                                      ${Number(item.total || 0).toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                      <div className="inline-flex items-center justify-end gap-1.5">
                                        <UiButton
                                          type="button"
                                          variant="soft-amber"
                                          size="sm"
                                          disabled={isVerifying || isReconcilingSri}
                                          onClick={() => handleReconcileSingle(item)}
                                        >
                                          <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
                                          <span>{isVerifying ? 'Consultando…' : 'Consultar SRI'}</span>
                                        </UiButton>
                                        <a
                                          href={`/#/public/ride?txId=${encodeURIComponent(item.id)}&claveAcceso=${encodeURIComponent(item.claveAcceso || '')}&tenantId=${encodeURIComponent(item.tenantId)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border border-[#E3E3E3] bg-white hover:bg-[#F0FDF4] hover:border-[#B3F4CB] text-[#474747] hover:text-[#004227]"
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
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ==================== TAB: IA GLOBAL (GOOGLE GEMINI FREE TIER) ==================== */}
            {activeTab === 'ai_config' && (
              <div className="space-y-4 max-w-4xl">
                <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EFEFEF]">
                    <div className="flex items-center gap-3">
                      <UiIconBadge level="modal" tone="brand" icon={Sparkles} />
                      <div>
                        <h3 className="text-sm font-bold text-[#1B1B1B]">Google Gemini Global (Nivel Gratuito SaaS)</h3>
                        <p className="text-xs text-[#696969]">
                          Configura una sola API Key gratuita de Google AI Studio para todos tus clientes. Ningún tenant necesita crear cuentas ni configurar claves.
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                      globalAiState.loading
                        ? 'bg-[#F4F4F5] text-[#474747] border-[#E3E3E3]'
                        : globalAiState.configured && globalAiState.enabled
                          ? 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]'
                          : 'bg-[#FCFBE7] text-[#866308] border-[#F0DF8A]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        globalAiState.loading
                          ? 'bg-[#94A3B8]'
                          : globalAiState.configured && globalAiState.enabled
                            ? 'bg-[#0B996F]'
                            : 'bg-[#D97706]'
                      }`} />
                      {globalAiState.loading
                        ? 'Verificando…'
                        : globalAiState.configured && globalAiState.enabled
                          ? `Operativa (${globalAiState.source === 'platform' ? 'Consola Global' : globalAiState.source === 'env' ? 'Variable Vercel' : 'Activa'})`
                          : !globalAiState.enabled
                            ? 'Pausada globalmente'
                            : 'Sin clave global'}
                    </span>
                  </div>

                  {/* Estado actual */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E3E3E3]">
                      <span className="text-[11px] font-semibold text-[#696969] block">Clave actual</span>
                      <span className="font-mono font-bold text-[#1B1B1B] mt-0.5 block">
                        {globalAiState.maskedKey || 'No configurada'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E3E3E3]">
                      <span className="text-[11px] font-semibold text-[#696969] block">Modelo gratuito principal</span>
                      <span className="font-mono font-bold text-[#004227] mt-0.5 block">
                        {globalAiState.preferredModel || 'gemini-2.5-flash'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E3E3E3]">
                      <span className="text-[11px] font-semibold text-[#696969] block">Respaldo automático (cuota)</span>
                      <span className="font-medium text-[#474747] mt-0.5 block">
                        Rotación entre 4 modelos Free Tier
                      </span>
                    </div>
                  </div>

                  {/* Formulario de configuración */}
                  <form onSubmit={handleSaveGlobalAi} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1B1B1B] mb-1.5">
                          API Key gratuita de Google AI Studio
                        </label>
                        <UiInput
                          type="password"
                          value={globalAiKeyInput}
                          onChange={e => setGlobalAiKeyInput(e.target.value)}
                          placeholder={globalAiState.hasPlatformKey ? 'Dejar vacío para conservar la clave actual' : 'Pega tu clave AIzaSy...'}
                          className="w-full font-mono"
                        />
                        <p className="text-[11px] text-[#696969] mt-1">
                          Se guarda cifrada en servidor (solo Admin SDK). Nunca se envía al navegador de los clientes.{' '}
                          <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0B996F] font-semibold hover:underline"
                          >
                            Crear clave gratuita aquí
                          </a>
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1B1B1B] mb-1.5">
                          Modelo gratuito principal
                        </label>
                        <UiSelect
                          value={globalAiState.preferredModel}
                          onChange={e => setGlobalAiState(prev => ({ ...prev, preferredModel: e.target.value }))}
                          className="w-full"
                        >
                          <option value="gemini-2.5-flash">gemini-2.5-flash — Mejor precisión OCR PDF (Free Tier)</option>
                          <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite — Máxima cuota gratuita diaria (Free Tier)</option>
                          <option value="gemini-2.0-flash">gemini-2.0-flash — Rápido multimodal (Free Tier)</option>
                          <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite — Ultraligero respaldo (Free Tier)</option>
                        </UiSelect>
                        <p className="text-[11px] text-[#696969] mt-1">
                          Si un modelo alcanza el límite gratuito por minuto (429), el servidor cambia automáticamente al siguiente modelo gratuito.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 text-xs font-semibold text-[#1B1B1B] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalAiState.enabled !== false}
                        onChange={e => setGlobalAiState(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="accent-[#0B996F] w-4 h-4"
                      />
                      <span>Habilitar IA Global para todos los tenants activos (lectura de compras PDF/imagen y asistente contable)</span>
                    </label>

                    {globalAiFeedback && (
                      <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                        globalAiFeedback.ok
                          ? 'bg-[#E8FEDF] border-[#B3F4CB] text-[#004227]'
                          : 'bg-[#FFF0F5] border-[#FBC6D9] text-[#851B40]'
                      }`}>
                        {globalAiFeedback.ok ? <CheckCircle2 size={14} className="shrink-0 text-[#0B996F]" /> : <AlertTriangle size={14} className="shrink-0 text-[#D9306B]" />}
                        <span>{globalAiFeedback.message}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#EFEFEF]">
                      <div>
                        {globalAiState.hasPlatformKey && (
                          <UiButton
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={savingGlobalAi}
                            onClick={() => handleSaveGlobalAi(null, { clearKey: true })}
                          >
                            <span>Eliminar clave de consola</span>
                          </UiButton>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <UiButton
                          type="button"
                          variant="secondary"
                          size="md"
                          disabled={testingGlobalAi}
                          onClick={handleTestGlobalAi}
                        >
                          <RefreshCw size={14} className={testingGlobalAi ? 'animate-spin' : ''} />
                          <span>{testingGlobalAi ? 'Probando…' : 'Probar IA Global'}</span>
                        </UiButton>
                        <UiButton
                          type="submit"
                          variant="primary"
                          size="md"
                          disabled={savingGlobalAi}
                        >
                          <CheckCircle2 size={14} />
                          <span>{savingGlobalAi ? 'Guardando…' : 'Guardar Configuración Global'}</span>
                        </UiButton>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ==================== MODAL: ACTIVAR EMPRESA (PLAN + ACTIVO/TRIAL) ==================== */}
      {activationModal && (
        <div
          className="fixed inset-0 z-[270] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => { if (!isActivating) setActivationModal(null); }}
        >
          <div
            className="w-full max-w-md bg-white border border-[#E3E3E3] rounded-2xl overflow-hidden max-h-[92dvh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#EFEFEF] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <UiIconBadge level="modal" tone="brand" icon={Sparkles} />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#1B1B1B] truncate">
                    Activar {activationModal.tenant.companyName || 'Empresa'}
                  </h3>
                  <p className="text-xs text-[#696969] truncate">
                    {activationModal.tenant.ownerEmail || activationModal.tenant.id}
                  </p>
                </div>
              </div>
              <UiModalCloseButton disabled={isActivating} onClick={() => setActivationModal(null)} />
            </div>

            <form onSubmit={handleConfirmActivation} className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Modo de Activación */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1B1B1B]">Tipo de activación</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'active', title: 'Plan Activo', desc: 'Suscripción completa' },
                    { id: 'trial', title: 'Prueba (Trial)', desc: 'Evaluación temporal' }
                  ].map(opt => {
                    const active = activationModal.planStatus === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setActivationModal(prev => ({
                          ...prev,
                          planStatus: opt.id,
                          expiresAt: computeDefaultExpiryDate(opt.id, prev.billingPeriod)
                        }))}
                        className={`p-3 rounded-[10px] border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[#E8FEDF] border-[#0B996F] text-[#004227]'
                            : 'bg-white border-[#E3E3E3] text-[#474747] hover:bg-[#FAFAFA]'
                        }`}
                      >
                        <div className="font-bold text-xs">{opt.title}</div>
                        <div className="text-[11px] opacity-80">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1B1B1B]">Plan asignado</label>
                <UiSelect
                  value={activationModal.planId}
                  onChange={e => setActivationModal(prev => ({ ...prev, planId: e.target.value }))}
                  className="w-full"
                >
                  {basePlans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${Number(p.priceMonthly || 0).toFixed(2)}/mes ({(p.category || 'erp').toUpperCase()})
                    </option>
                  ))}
                </UiSelect>
              </div>

              {/* Ciclo y Vencimiento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#1B1B1B]">Ciclo</label>
                  <UiSelect
                    value={activationModal.billingPeriod}
                    onChange={e => {
                      const nextPeriod = e.target.value;
                      setActivationModal(prev => ({
                        ...prev,
                        billingPeriod: nextPeriod,
                        expiresAt: computeDefaultExpiryDate(prev.planStatus, nextPeriod)
                      }));
                    }}
                    className="w-full"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </UiSelect>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#1B1B1B]">Válido hasta</label>
                  <UiInput
                    type="date"
                    required
                    value={activationModal.expiresAt}
                    onChange={e => setActivationModal(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Atajos rápidos */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '+14 días', date: addDaysToToday(14), status: 'trial' },
                  { label: '+1 mes', date: addMonthsToToday(1), status: 'active', period: 'monthly' },
                  { label: '+3 meses', date: addMonthsToToday(3), status: 'active' },
                  { label: '+1 año', date: addMonthsToToday(12), status: 'active', period: 'yearly' }
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActivationModal(prev => ({
                      ...prev,
                      planStatus: item.status,
                      billingPeriod: item.period || prev.billingPeriod,
                      expiresAt: item.date
                    }))}
                    className="px-2.5 py-1 rounded-[8px] border border-[#E3E3E3] bg-[#FAFAFA] hover:bg-[#E8FEDF] hover:border-[#B3F4CB] text-[11px] font-semibold text-[#474747] cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
                <UiButton type="button" variant="secondary" size="md" disabled={isActivating} onClick={() => setActivationModal(null)}>
                  Cancelar
                </UiButton>
                <UiButton type="submit" variant="brand" size="md" disabled={isActivating}>
                  <CheckCircle2 size={14} />
                  <span>{isActivating ? 'Activando…' : activationModal.planStatus === 'active' ? 'Confirmar Activación' : 'Habilitar Prueba'}</span>
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDITAR PLAN ==================== */}
      {editingPlan && (
        <div
          className="fixed inset-0 z-[260] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => { if (!savingPlan) setEditingPlan(null); }}
        >
          <div
            className="w-full max-w-lg bg-white border border-[#E3E3E3] rounded-2xl overflow-hidden max-h-[92dvh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#EFEFEF] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <UiIconBadge level="modal" tone="brand" icon={Sliders} />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[#1B1B1B] truncate">Personalizar: {editingPlan.name}</h4>
                  <p className="text-[11px] font-mono text-[#696969] truncate">
                    {CATEGORY_LABELS[editingPlan.category || 'erp'] || editingPlan.category} · {editingPlan.id}
                  </p>
                </div>
              </div>
              <UiModalCloseButton disabled={savingPlan} onClick={() => setEditingPlan(null)} />
            </div>

            <form onSubmit={handleSavePlanEdit} className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-[#1B1B1B]">Nombre del plan *</label>
                <UiInput
                  type="text"
                  maxLength={100}
                  required
                  value={editingPlan.name || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#1B1B1B]">Precio Mensual ($ USD) *</label>
                  <UiInput
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editingPlan.priceMonthly}
                    onChange={e => setEditingPlan({ ...editingPlan, priceMonthly: e.target.value })}
                    className="w-full font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#1B1B1B]">Precio Anual ($ USD/mes) *</label>
                  <UiInput
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editingPlan.priceYearly}
                    onChange={e => setEditingPlan({ ...editingPlan, priceYearly: e.target.value })}
                    className="w-full font-mono"
                  />
                </div>
              </div>

              {isBasePlanCategory(editingPlan.category || 'erp') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-[#1B1B1B]">Límite de Usuarios (9999 = ilimitado)</label>
                    <UiInput
                      type="number"
                      step="1"
                      min="0"
                      value={editingPlan.maxUsers}
                      onChange={e => setEditingPlan({ ...editingPlan, maxUsers: e.target.value })}
                      className="w-full font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-bold text-[#1B1B1B]">Límite de Productos (99999 = ilimitado)</label>
                    <UiInput
                      type="number"
                      step="1"
                      min="0"
                      value={editingPlan.maxProducts}
                      onChange={e => setEditingPlan({ ...editingPlan, maxProducts: e.target.value })}
                      className="w-full font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block font-bold text-[#1B1B1B]">Beneficios visibles (uno por línea)</label>
                <UiTextarea
                  rows={4}
                  value={editingPlan.featuresText || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, featuresText: e.target.value })}
                  className="w-full"
                />
              </div>

              {isBasePlanCategory(editingPlan.category || 'erp') && (
                <div className="space-y-2">
                  <label className="block font-bold text-[#1B1B1B]">Módulos habilitados en el ERP</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl border border-[#E3E3E3] bg-[#FAFAFA]">
                    {Object.entries(MODULE_LABELS).map(([mod, label]) => {
                      const isChecked = (editingPlan.modules || []).includes(mod);
                      return (
                        <label key={mod} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-white text-[11px] font-semibold text-[#1B1B1B]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            className="accent-[#0B996F]"
                            onChange={() => {
                              const currentModules = editingPlan.modules || [];
                              const newModules = isChecked
                                ? currentModules.filter(m => m !== mod)
                                : [...currentModules, mod];
                              setEditingPlan({ ...editingPlan, modules: newModules });
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#1B1B1B]">
                  <input
                    type="checkbox"
                    checked={editingPlan.active !== false}
                    onChange={e => setEditingPlan({ ...editingPlan, active: e.target.checked })}
                    className="accent-[#0B996F]"
                  />
                  Plan visible y contratable
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#1B1B1B]">
                  <input
                    type="checkbox"
                    checked={Boolean(editingPlan.isPopular)}
                    onChange={e => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                    className="accent-[#0B996F]"
                  />
                  Destacar como Popular
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
                <UiButton type="button" variant="secondary" size="md" disabled={savingPlan} onClick={() => setEditingPlan(null)}>
                  Cancelar
                </UiButton>
                <UiButton type="submit" variant="primary" size="md" disabled={savingPlan}>
                  <CheckCircle2 size={14} />
                  <span>{savingPlan ? 'Guardando…' : 'Guardar Plan'}</span>
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DETALLE TRANSFERENCIA ==================== */}
      {selectedTransfer && (
        <div
          className="fixed inset-0 z-[260] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedTransfer(null)}
        >
          <div
            className="w-full max-w-lg bg-white border border-[#E3E3E3] rounded-2xl overflow-hidden max-h-[92dvh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#EFEFEF] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <UiIconBadge level="modal" tone="brand" icon={CreditCard} />
                <div>
                  <h4 className="text-sm font-bold text-[#1B1B1B]">Detalle de Transferencia</h4>
                  <p className="text-xs text-[#696969]">{selectedTransfer.companyName || selectedTransfer.tenantId}</p>
                </div>
              </div>
              <UiModalCloseButton onClick={() => setSelectedTransfer(null)} />
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E3E3E3]">
                  <span className="text-[11px] font-semibold text-[#696969] block">Empresa / Inquilino</span>
                  <span className="font-bold text-[#1B1B1B] block">{selectedTransfer.companyName || 'Empresa'}</span>
                  <span className="font-mono text-[11px] text-[#696969]">ID: {selectedTransfer.tenantId}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E3E3E3]">
                  <span className="text-[11px] font-semibold text-[#696969] block">Plan Solicitado</span>
                  <span className="font-bold text-[#1B1B1B] block">
                    {getPlanName(selectedTransfer.planId)} ({selectedTransfer.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'})
                  </span>
                  <span className="font-mono font-extrabold text-[#004227] text-sm">${Number(selectedTransfer.amount || 0).toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E3E3E3]">
                  <span className="text-[11px] font-semibold text-[#696969] block">Nro. Referencia</span>
                  <span className="font-mono font-bold text-[#1B1B1B]">{selectedTransfer.referenceNumber || 'S/N'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E3E3E3]">
                  <span className="text-[11px] font-semibold text-[#696969] block">Fecha de Solicitud</span>
                  <span className="font-medium text-[#1B1B1B]">
                    {selectedTransfer.createdAt ? new Date(selectedTransfer.createdAt).toLocaleString('es-EC') : '—'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-[#1B1B1B] block">Comprobante de Pago</span>
                {selectedTransfer.proofUrl ? (
                  <div className="max-h-60 overflow-hidden flex items-center justify-center p-2 bg-[#FAFAFA] border border-[#E3E3E3] rounded-xl">
                    <img src={selectedTransfer.proofUrl} alt="Comprobante de pago" className="max-h-56 object-contain rounded-lg" />
                  </div>
                ) : (
                  <div className="p-4 text-center text-[#696969] bg-[#FAFAFA] border border-[#E3E3E3] rounded-xl">
                    No se adjuntó imagen de comprobante (solo número de referencia).
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
                <UiButton type="button" variant="secondary" size="md" onClick={() => setSelectedTransfer(null)}>
                  Cerrar
                </UiButton>
                {selectedTransfer.status === 'pending' && (
                  <>
                    <UiButton type="button" variant="danger" size="md" onClick={() => handleRejectTransfer(selectedTransfer)}>
                      Rechazar
                    </UiButton>
                    <UiButton type="button" variant="brand" size="md" onClick={() => handleApproveTransfer(selectedTransfer)}>
                      <CheckCircle2 size={14} />
                      <span>Aprobar y Activar Plan</span>
                    </UiButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
