import { resolveThemeProps } from './components/ui/themeProps';
import { mergeThemeProps } from './components/ui/themeProps';
import { UiCard, UiBox, UiText, UiHeading, UiLabel } from './components/ui/layout';
import { UiButton, UiInput, UiSelect } from './components/ui/controls';
import { normalizeProduct } from './services/productModel';
import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Sparkles,
  X,
  Save,
  CheckCircle2,
  Shield,
  UserPlus,
  Lock,
  Cloud,
  Settings,
  Calculator,
  CloudOff,
  AlertCircle,
  HelpCircle,
  Bell,
  ChevronDown,
  LogOut,
  CreditCard
} from 'lucide-react';

import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, getDocs, getDoc, query, where } from 'firebase/firestore';

import { auth, db, storage, appId } from './firebase';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LandingLayout from './pages/landing/LandingLayout';
import LandingHome from './pages/landing/LandingHome';
import LandingFeatures from './pages/landing/LandingFeatures';
import LandingPricing from './pages/landing/LandingPricing';
import LandingAbout from './pages/landing/LandingAbout';
import LandingContact from './pages/landing/LandingContact';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import SuperAdminPage from './pages/SuperAdminPage';
import BillingPortal from './pages/billing/BillingPortal';
import PublicRideView from './pages/PublicRideView';
import { PLANS } from './config/plans';
import { registerConfirmHandler } from './services/confirmDialog';

import FinanceModule from './components/finances/FinanceModule';
import ThirdPartiesView from './components/finances/ThirdPartiesView';

import ErpDashboard from './components/dashboard/ErpDashboard';
import GeneralSettings from './components/dashboard/GeneralSettings';
import HiringServicesModule from './components/dashboard/HiringServicesModule';
import SupportModule from './components/dashboard/SupportModule';
import FinanceChat from './components/finances/FinanceChat';
import GastosCreditosModule from './components/finances/GastosCreditosModule';
import InventoryModule from './components/inventory/InventoryModule';
import Sidebar from './components/Sidebar';
import { USER_COLORS } from './constants/appData';
import { isSubscriptionBlocked } from './services/subscriptionAccess';

// Helper Strings para clases Glassmorphism
// eslint-disable-next-line no-unused-vars
const glassPanelDark = "glass-panel-dark";
// eslint-disable-next-line no-unused-vars
const glassInputDark = "glass-input-dark";
const glassInputLight = "glass-input-light";


export default function App() {
  const { currentUser, tenantInfo, planId, role: userRole, emailVerificationRequired } = useAuth();
  const isAuthenticated = !!currentUser;
  const navigate = useNavigate();
  const location = useLocation();

  const [plansList, setPlansList] = useState(Object.values(PLANS));
  const [trash, setTrash] = useState([]);
  const [users, setUsers] = useState([]);
  const [activePageId, setActivePageId] = useState(() => {
    try {
      const savedPage = localStorage.getItem('activePageId');
      if (savedPage && !['proyectos_general', 'paginas_general', 'calendar'].includes(savedPage)) return savedPage;
    } catch (e) {
      console.error(e);
    }
    return 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const mainContentRef = useRef(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsProfileMenuOpen(false);
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  // Scroll reset al cambiar de pagina/módulo
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activePageId]);
  const [activeModules, setActiveModules] = useState({
    dashboard: true,
    ventas: true,
    finances: true,
    compras: true,
    gastos_creditos: true,
    inventario: true,
    personas: true,
    team: true
  });

  useEffect(() => {
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      if (list.length > 0) {
        setPlansList(list);
      }
    }, (error) => {
      console.warn("Firestore plans subscription blocked by security rules:", error);
    });
    return () => unsubPlans();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const isSuperAdmin = String(userRole || '').toLowerCase().trim() === 'superadmin';

    if (!isAuthenticated) {
      if (path.startsWith('/app') || path === '/superadmin' || path === '/verify-email') {
        navigate('/login', { state: { from: path } });
      }
    } else {
      if (emailVerificationRequired && path !== '/verify-email') {
        navigate('/verify-email');
        return;
      }
      if (!emailVerificationRequired && path === '/verify-email') {
        navigate(isSuperAdmin ? '/superadmin' : '/app');
        return;
      }
      if (path === '/login' || path === '/register' || path === '/') {
        if (isSuperAdmin) {
          navigate('/superadmin');
        } else {
          navigate('/app');
        }
      }
    }
  }, [isAuthenticated, location.pathname, userRole, emailVerificationRequired, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const path = location.pathname;
    if (path.startsWith('/app/')) {
      const subpage = path.substring(5);
      if (subpage === 'billing') {
        setActivePageId('billing');
      }
    }
  }, [location.pathname, isAuthenticated]);

  const prevActivePageIdRef = useRef(activePageId);

  useEffect(() => {
    const prevPageId = prevActivePageIdRef.current;
    prevActivePageIdRef.current = activePageId;
    if (!isAuthenticated) return;
    const currentPath = location.pathname;
    // Solo sincronizar rutas de billing si el usuario se encuentra dentro del ERP (/app)
    if (!currentPath.startsWith('/app')) return;

    if (activePageId === 'billing') {
      if (currentPath !== '/app/billing') navigate('/app/billing');
    } else if (prevPageId === 'billing' && currentPath === '/app/billing') {
      navigate('/app');
    }
  }, [activePageId, isAuthenticated, navigate, location.pathname]);



  useEffect(() => {
    if (!planId) return;
    const currentPlan = plansList.find(p => p.id === planId) || PLANS[planId];
    if (currentPlan && currentPlan.modules) {
      const serviceModules = Object.values(tenantInfo?.serviceSubscriptions || {}).flatMap(subscription => {
        const expiry = subscription.expiresAt?.toDate?.() || new Date(subscription.expiresAt || 0);
        if (subscription.status !== 'active' || expiry <= new Date()) return [];
        return plansList.find(plan => plan.id === subscription.planId)?.modules || [];
      });
      const hasModule = moduleId => currentPlan.modules.includes(moduleId) || serviceModules.includes(moduleId);
      const newModules = {
        dashboard: hasModule('dashboard'),
        ventas: hasModule('ventas'),
        finances: hasModule('finances') || hasModule('contabilidad'),
        compras: hasModule('compras') || hasModule('contabilidad'),
        gastos_creditos: hasModule('gastos_creditos') || hasModule('contabilidad'),
        inventario: hasModule('inventario'),
        personas: hasModule('personas'),
        team: hasModule('team')
      };
      setActiveModules(newModules);
    }
  }, [planId, plansList, tenantInfo?.serviceSubscriptions]);
  const [ventasInitialSubTab, setVentasInitialSubTab] = useState(() => localStorage.getItem('ventasInitialSubTab') || 'resumen_ventas');
  const [comprasInitialSubTab, setComprasInitialSubTab] = useState(() => localStorage.getItem('comprasInitialSubTab') || 'compras_resumen');
  const [contabilidadInitialSubTab, setContabilidadInitialSubTab] = useState(() => localStorage.getItem('contabilidadInitialSubTab') || 'dashboard');
  const [billingInitialSubTab, setBillingInitialSubTab] = useState(() => localStorage.getItem('billingInitialSubTab') || 'facturacion');
  const [gastosInitialSubTab, setGastosInitialSubTab] = useState(() => localStorage.getItem('gastosInitialSubTab') || 'resumen');
  const [inventarioInitialSubTab, setInventarioInitialSubTab] = useState(() => localStorage.getItem('inventarioInitialSubTab') || 'productos');
  const [expandedSidebarMenu, setExpandedSidebarMenu] = useState(null);
  const [personasSubTab, setPersonasSubTab] = useState(() => localStorage.getItem('personasSubTab') || 'cliente');

  useEffect(() => {
    if (activePageId) {
      try {
        localStorage.setItem('activePageId', activePageId);
      } catch (e) { console.error(e); }
    }
  }, [activePageId]);

  useEffect(() => { try { localStorage.setItem('ventasInitialSubTab', ventasInitialSubTab); } catch { /* empty */ } }, [ventasInitialSubTab]);
  useEffect(() => { try { localStorage.setItem('comprasInitialSubTab', comprasInitialSubTab); } catch { /* empty */ } }, [comprasInitialSubTab]);
  useEffect(() => { try { localStorage.setItem('contabilidadInitialSubTab', contabilidadInitialSubTab); } catch { /* empty */ } }, [contabilidadInitialSubTab]);
  useEffect(() => { try { localStorage.setItem('inventarioInitialSubTab', inventarioInitialSubTab); } catch { /* empty */ } }, [inventarioInitialSubTab]);
  useEffect(() => { try { localStorage.setItem('personasSubTab', personasSubTab); } catch { /* empty */ } }, [personasSubTab]);

  useEffect(() => {
    if (['ventas', 'compras', 'finances', 'billing', 'gastos_creditos', 'inventario'].includes(activePageId)) {
      setExpandedSidebarMenu(activePageId);
    } else if (activePageId === 'personas' || activePageId === 'team') {
      setExpandedSidebarMenu('personas_menu');
    }
  }, [activePageId]);

  const [dbSyncError, setDbSyncError] = useState(() => sessionStorage.getItem('db_sync_error') === 'true');

  const triggerSyncError = async () => {
    try {
      sessionStorage.setItem('db_sync_error', 'true');
      setDbSyncError(true);
      await signOut(auth);
    } catch (e) {
      console.error("Error signing out during sync error:", e);
    }
    window.location.reload();
  };
  
  // eslint-disable-next-line no-unused-vars
  const isDarkMode = false;
  // eslint-disable-next-line no-unused-vars
  const setIsDarkMode = () => {};


  // --- CARGAR HOUDINI PAINT WORKLET (Antigravity Particles) ---
  useEffect(() => {
    if ('paintWorklet' in CSS) {
      CSS.paintWorklet.addModule('/ringparticles.js')
        .then(() => {
          console.log('Houdini paintWorklet ringparticles loaded successfully');
        })
        .catch((err) => {
          console.error('Failed to load Houdini paintWorklet:', err);
        });
    }
  }, []);

  const [drawerUser, setDrawerUser] = useState(null);
  const [googleClientId, setGoogleClientId] = useState('');

  // --- SISTEMA DE LOGIN ---
  // eslint-disable-next-line no-unused-vars
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  // eslint-disable-next-line no-unused-vars
  const [loginError, setLoginError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showPassword, setShowPassword] = useState(false);

  // --- ESTADOS GLOBALIZADOS DE FINANZAS ---
  const [globalTransactions, setGlobalTransactions] = useState([]);
  const [globalThirdParties, setGlobalThirdParties] = useState([]);
  const [globalProducts, setGlobalProducts] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [globalCategories, setGlobalCategories] = useState([]);
  const [globalBrands, setGlobalBrands] = useState([]);
  const [globalDiscounts, setGlobalDiscounts] = useState([]);
  const [globalPromotions, setGlobalPromotions] = useState([]);
  const [isLoadingFinances, setIsLoadingFinances] = useState(true);

  // Mapear rawProducts de inventario a globalProducts financieros con soporte reactivo de categorias y marcas
  useEffect(() => {
    const seenIds = new Set();
    const seenSkus = new Set();
    const uniqueRaw = rawProducts.filter(p => {
      if (!p || !p.id) return false;
      const skuKey = p.sku ? p.sku.trim().toUpperCase() : '';
      if (seenIds.has(p.id)) return false;
      if (skuKey && seenSkus.has(skuKey)) return false;

      seenIds.add(p.id);
      if (skuKey) seenSkus.add(skuKey);
      return true;
    });

    const mapped = uniqueRaw.map(p => normalizeProduct(p, globalCategories, globalBrands));
    setGlobalProducts(mapped);
  }, [rawProducts, globalCategories, globalBrands]);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isSaving, setIsSaving] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const isInitialMount = useRef(true);
  // eslint-disable-next-line no-unused-vars
  const isRemoteUpdate = useRef(false);
  // Marca para no re-empujar al historial cuando el cambio de página viene del botón atrás/adelante
  const isPopNavigation = useRef(false);
  // Marca para saltar el primer push tras sembrar la entrada base del historial
  const navInitialized = useRef(false);

  // --- SISTEMA DE TOASTS MINIMALISTAS ---
  const [toasts, setToasts] = useState([]);
  const [globalConfirmDialog, setGlobalConfirmDialog] = useState(null);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const unregisterConfirm = registerConfirmHandler((message) => {
      return new Promise((resolve) => {
        setGlobalConfirmDialog({
          message,
          onConfirm: () => {
            setGlobalConfirmDialog(null);
            resolve(true);
          },
          onCancel: () => {
            setGlobalConfirmDialog(null);
            resolve(false);
          }
        });
      });
    });

    window.alert = (message) => {
      showToast(message, 'error');
    };

    return unregisterConfirm;
  }, []);

  // --- LOGIN CON MINIMALISMO LÍQUIDO PURO (SIN CANVAS) ---

  // Limpiar sincronización de la nube al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) {
      setIsCloudSynced(false);
    }
  }, [isAuthenticated]);

  // 1.5 Escuchador de estado Offline (pérdida de conexión)
  useEffect(() => {
    const handleOffline = () => {
      console.warn("Dispositivo sin conexión a internet.");
      triggerSyncError();
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);

  // --- INTEGRACIÓN CON EL HISTORIAL DEL NAVEGADOR (botón Atrás/Adelante) ---
  // Al iniciar sesión, sembramos una entrada base y escuchamos el botón atrás SOLO en el ERP (/app).
  // Esto evita que "Atrás" saque al usuario del sistema: navega entre páginas
  // visitadas y, al llegar al piso, aterriza en el Dashboard.
  const isInAppRoute = location.pathname.startsWith('/app');
  const activePageIdRef = useRef(activePageId);
  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  useEffect(() => {
    if (!isAuthenticated || !isInAppRoute) {
      navInitialized.current = false;
      return;
    }

    // Sembrar la entrada actual del historial con la página activa
    window.history.replaceState({ activePageId: activePageIdRef.current }, '');

    const onPopState = (e) => {
      if (!window.location.pathname.startsWith('/app')) return;
      isPopNavigation.current = true;
      if (e.state && e.state.activePageId) {
        setActivePageId(e.state.activePageId);
      } else {
        // Se intentó retroceder más allá de nuestra entrada base:
        // re-afirmamos el Dashboard para mantener al usuario dentro del sistema.
        setActivePageId('dashboard');
        window.history.pushState({ activePageId: 'dashboard' }, '');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isAuthenticated, isInAppRoute]);

  // Empujar una nueva entrada al historial cada vez que cambia la página activa dentro del ERP,
  // salvo que el cambio provenga del propio botón atrás/adelante.
  useEffect(() => {
    if (!isAuthenticated || !isInAppRoute) return;
    if (isPopNavigation.current) {
      isPopNavigation.current = false;
      return;
    }
    // Saltar el primer disparo tras autenticarse o entrar a /app: la entrada base ya fue
    // sembrada con replaceState en el efecto anterior, evitando una entrada duplicada.
    if (!navInitialized.current) {
      navInitialized.current = true;
      return;
    }
    window.history.pushState({ activePageId }, '');
  }, [activePageId, isAuthenticated, isInAppRoute]);

  const [companyProfile, setCompanyProfile] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [isPersonasExpanded, setIsPersonasExpanded] = useState(true);

  // Auto-expand submenus when active page changes
  useEffect(() => {
    if (activePageId === 'personas' || activePageId === 'team') {
      setIsPersonasExpanded(true);
    }
  }, [activePageId]);

  // Bloquear de forma reactiva el scroll en la ventana SOLO dentro del panel /app (evita desajustes del viewport en el ERP)
  useEffect(() => {
    if (!location.pathname.startsWith('/app')) return;

    const preventWindowScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', preventWindowScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', preventWindowScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser || emailVerificationRequired) return;
    const isSuperAdmin = String(userRole || '').toLowerCase().trim() === 'superadmin';

    // Si estamos en /superadmin o somos superadmin fuera del ERP (/app), no suscribir al sandbox de empresa
    if (location.pathname.startsWith('/superadmin') || (isSuperAdmin && !location.pathname.startsWith('/app'))) {
      setIsLoadingFinances(false);
      return;
    }

    const metaDoc = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');

    // 1. Escuchar Meta (Users, Trash, Settings)
    const unsubMeta = onSnapshot(metaDoc, snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.trash) setTrash(data.trash);
        if (data.googleClientId !== undefined) setGoogleClientId(data.googleClientId);
        if (data.activeModules !== undefined) {
          setActiveModules(prev => ({ ...prev, ...data.activeModules }));
        }
        if (data.companyProfile !== undefined) {
          setCompanyProfile(data.companyProfile);
        }
      }
    }, err => {
      console.error("Error subscribing to meta:", err);
      if (!isSuperAdmin) triggerSyncError();
    });

    const usersRef = userRole === 'admin' || isSuperAdmin
      ? query(collection(db, 'users'), where('tenantId', '==', appId))
      : doc(db, 'users', currentUser.uid);
    const unsubUsers = onSnapshot(usersRef, snap => {
      setUsers('docs' in snap
        ? snap.docs.map(userDoc => ({ id: userDoc.id, ...userDoc.data() }))
        : snap.exists() ? [{ id: snap.id, ...snap.data() }] : []);
    }, err => console.error('Error subscribing to tenant users:', err));

    // 2. Escuchar Transacciones de Finanzas
    const txCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_transactions');
    const unsubTx = onSnapshot(txCol, (snap) => {
      const txData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      txData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setGlobalTransactions(txData);
      setIsLoadingFinances(false);
    }, (err) => {
      console.error("Error subscribing to global transactions:", err);
      setIsLoadingFinances(false);
      if (!isSuperAdmin) triggerSyncError();
    });

    // 3. Escuchar Terceros
    const tpCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties');
    const unsubTp = onSnapshot(tpCol, (snap) => {
      const tpData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGlobalThirdParties(tpData);
    }, (err) => {
      console.error("Error subscribing to global third parties:", err);
      if (!isSuperAdmin) triggerSyncError();
    });

    // 4. Escuchar Productos (Centralizado desde inventory_products)
    const prodCol = collection(db, 'artifacts', appId, 'public', 'data', 'inventory_products');
    const unsubProd = onSnapshot(prodCol, (snap) => {
      const prodData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRawProducts(prodData);
    }, (err) => {
      console.error("Error subscribing to global products:", err);
      if (!isSuperAdmin) triggerSyncError();
    });

    // 5. Escuchar Categorías de Inventario
    const catCol = collection(db, 'artifacts', appId, 'public', 'data', 'inventory_categories');
    const unsubCat = onSnapshot(catCol, (snap) => {
      const catData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGlobalCategories(catData);
    }, (err) => {
      console.error("Error subscribing to global categories:", err);
    });

    // 6. Escuchar Marcas de Inventario
    const brandCol = collection(db, 'artifacts', appId, 'public', 'data', 'inventory_brands');
    const unsubBrand = onSnapshot(brandCol, (snap) => {
      const brandData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGlobalBrands(brandData);
    }, (err) => {
      console.error("Error subscribing to global brands:", err);
    });

    // 7. Escuchar Descuentos
    const discCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_discounts');
    const unsubDisc = onSnapshot(discCol, (snap) => {
      const discData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGlobalDiscounts(discData);
    }, (err) => {
      console.error("Error subscribing to global discounts:", err);
    });

    // 8. Escuchar Promociones
    const promoCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_promotions');
    const unsubPromo = onSnapshot(promoCol, (snap) => {
      const promoData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGlobalPromotions(promoData);
    }, (err) => {
      console.error("Error subscribing to global promotions:", err);
    });

    setIsCloudSynced(true);

    window.__unsubFirestore = () => { 
      unsubMeta(); 
      unsubUsers();
      unsubTx(); 
      unsubTp(); 
      unsubProd(); 
      unsubCat();
      unsubBrand();
      unsubDisc();
      unsubPromo();
    };

    return () => { if (window.__unsubFirestore) window.__unsubFirestore(); };
  }, [isAuthenticated, currentUser, userRole, emailVerificationRequired, location.pathname]);

  // Determinar página activa
  // --- Lógica de Usuarios ---


  const saveDrawerUser = async () => {
    if (!drawerUser || !drawerUser.name.trim()) return;
    const trimmedName = drawerUser.name.trim().toLowerCase();
    const isDuplicate = users.some(u => u.name.trim().toLowerCase() === trimmedName && u.id !== drawerUser.id);
    if (isDuplicate) {
      showToast('Ya existe un usuario con este nombre', 'error');
      return;
    }
    const initials = drawerUser.name.trim().split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'U';
    const userToSave = { ...drawerUser, initials, name: drawerUser.name.trim() };
    
    let newUsers;
    if (drawerUser.isNew) {
      delete userToSave.isNew;
      newUsers = [...users, userToSave];
    } else {
      newUsers = users.map(u => u.id === userToSave.id ? userToSave : u);
    }
    setUsers(newUsers);
    setDrawerUser(null);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info'), { users: newUsers }, { merge: true });
      showToast('Usuario guardado', 'success');
    } catch (e) { console.error('Error saveDrawerUser:', e); showToast('Error', 'error'); }
  };






  const handleDownloadBackup = async () => {
    let financeTx = [];
    let financeTp = [];
    let financeSettings = null;
    try {
      const txSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'finances_transactions'));
      financeTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const tpSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties'));
      financeTp = tpSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const settingsSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings', 'config'));
      if (settingsSnap.exists()) {
        financeSettings = settingsSnap.data();
      }
    } catch (err) {
      console.warn("Could not fetch finance data for backup", err);
    }

    const backupData = {
      users,
      trash,
      finances: {
        transactions: financeTx,
        thirdParties: financeTp,
        settings: financeSettings
      },
      timestamp: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `backup_webfix_${new Date().getTime()}.json`);
    dlAnchorElem.click();
    showToast('Copia de seguridad descargada', 'success');
  };



  const currentGlassInput = glassInputLight;

  // eslint-disable-next-line no-unused-vars
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');
    
    try {
      await signInWithEmailAndPassword(auth, loginForm.email.trim(), loginForm.password);
    } catch (error) {
      console.error('Login error:', error.code);
      const errorMessages = {
        'auth/invalid-email': 'El correo electrónico no es válido.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/user-not-found': 'No existe una cuenta con ese correo.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
        'auth/network-request-failed': 'Error de red. Verifica tu conexión a internet.',
      };
      setLoginError(errorMessages[error.code] || 'Error al iniciar sesión. Intenta de nuevo.');
    }
    setIsAuthenticating(false);
  };

  const handleLogout = async () => {
    try {
      // Limpiar cachés locales y de sesión
      localStorage.clear();
      sessionStorage.clear();
      
      // Limpiar cachés del navegador (Service Workers, etc.) si está disponible
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } catch (error) {
      console.error("Error limpiando las cachés:", error);
    }
    
    // Cerrar sesión en Firebase
    await signOut(auth);
    
    // Recargar la página para limpiar toda la memoria y estados de React
    window.location.reload();
  };

  // --- PANTALLA DE ERROR DE CONEXIÓN / SINCRONIZACIÓN ---
  if (dbSyncError) {
    return (
      <UiBox {...{"style":{"backgroundColor":"var(--gray-2)","color":"var(--gray-11)"},"className":"flex flex-col items-center justify-center min-h-screen w-full p-6 z-[9999] relative overflow-hidden"}}>
        {/* Background decorative blobs */}
        <UiBox {...{"style":{"backgroundColor":"var(--red-3)","borderRadius":"var(--radius-3)"},"className":"absolute top-1/4 left-1/4 w-72 h-72 animate-pulse"}}></UiBox>
        <UiBox {...{"style":{"backgroundColor":"var(--orange-3)","borderRadius":"var(--radius-3)"},"className":"absolute bottom-1/4 right-1/4 w-72 h-72 animate-pulse"}}></UiBox>

        <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)","border":"1px solid var(--gray-a6)"},"className":"w-full max-w-md p-8 flex flex-col text-center"}}>
          <UiBox {...{"className":"flex justify-center mb-6"}}>
            <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","color":"var(--red-11)","border":"1px solid var(--gray-a6)"},"className":"p-4"}}>
              <CloudOff size={32} {...{"className":"animate-bounce"}} />
            </UiBox>
          </UiBox>
          <UiHeading as="h2" {...{"size":"5","weight":"bold","className":"mb-3"}}>Error de Sincronización</UiHeading>
          <UiText as="p" {...{"size":"2","weight":"medium","color":"gray","className":"mb-6 leading-relaxed"}}>
            Se ha perdido la sincronización con la base de datos centralizada. Por seguridad y para evitar pérdida de información, se cerró el sistema.
          </UiText>
          <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","border":"1px solid var(--gray-a6)","color":"var(--red-11)"},"className":"p-4 mb-8 leading-normal"}}>
            Por favor, verifica tu conexión a internet o comunícate con tu soporte técnico oficial.
          </UiBox>
          <UiButton
            onClick={() => {
              sessionStorage.removeItem('db_sync_error');
              setDbSyncError(false);
              window.location.reload();
            }}
            {...{"size":"2","variant":"solid","color":"red","className":"w-full hover:scale-[1.02] active:scale-[0.98]"}}
          >
            Reintentar Conexión
          </UiButton>
        </UiBox>
      </UiBox>
    );
  }

  // --- DETECTAR MÓDULOS BLOQUEADOS O SUSPENDIDOS ---
  const isPageGated = ['finances', 'compras', 'gastos_creditos', 'inventario', 'team'].includes(activePageId);
  
  const isModuleLocked = (() => {
    if (!isPageGated) return false;
    if (activePageId === 'team') {
      return !activeModules.team;
    }
    return !activeModules[activePageId];
  })();
  return (
    <Routes>
      <Route element={<LandingLayout />}>
        <Route path="/" element={<LandingHome />} />
        <Route path="/soluciones" element={<LandingFeatures />} />
        <Route path="/precios" element={<LandingPricing />} />
        <Route path="/nosotros" element={<LandingAbout />} />
        <Route path="/contacto" element={<LandingContact />} />
      </Route>
      <Route path="/login" element={<LoginPage showToast={showToast} companyProfile={companyProfile} />} />
      <Route path="/register" element={<RegisterPage showToast={showToast} />} />
      <Route path="/verify-email" element={<VerifyEmailPage showToast={showToast} />} />
      <Route path="/superadmin" element={<SuperAdminPage showToast={showToast} />} />
      <Route path="/public/ride" element={<PublicRideView />} />
      <Route path="/app/*" element={
        <div className="flex h-screen w-full overflow-hidden relative z-0 bg-white text-[#1b1b1b]">

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activePageId={activePageId}
        setActivePageId={setActivePageId}
        companyProfile={companyProfile}
        activeModules={activeModules}
        expandedSidebarMenu={expandedSidebarMenu}
        setExpandedSidebarMenu={setExpandedSidebarMenu}
        ventasInitialSubTab={ventasInitialSubTab}
        setVentasInitialSubTab={setVentasInitialSubTab}
        comprasInitialSubTab={comprasInitialSubTab}
        setComprasInitialSubTab={setComprasInitialSubTab}
        gastosInitialSubTab={gastosInitialSubTab}
        setGastosInitialSubTab={setGastosInitialSubTab}
        inventarioInitialSubTab={inventarioInitialSubTab}
        setInventarioInitialSubTab={setInventarioInitialSubTab}
        contabilidadInitialSubTab={contabilidadInitialSubTab}
        setContabilidadInitialSubTab={setContabilidadInitialSubTab}
        billingInitialSubTab={billingInitialSubTab}
        setBillingInitialSubTab={setBillingInitialSubTab}
        personasSubTab={personasSubTab}
        setPersonasSubTab={setPersonasSubTab}
        trash={trash}
        handleLogout={handleLogout}
        userRole={userRole}
      />

      {/* Main Content Area */}
      <UiBox {...{"className":"flex-1 flex flex-col h-full overflow-hidden relative z-10 md:z-[60]"}}>
        
        {/* Topbar Stripe (Brevo Design System Header) */}
        <header className="flex items-center px-4 sm:px-6 justify-between gap-4 shrink-0 h-14 bg-white select-none z-30">
          {/* Left: Sidebar Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Alternar Menú Lateral"
            >
              <Menu size={18} />
            </button>
          </div>

          {/* Right: Brevo Action Icons & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Direct POS button if ventas module is active */}
            {activeModules.ventas && (
              <button
                type="button"
                onClick={() => { setVentasInitialSubTab(`pos_${Date.now()}`); setActivePageId('ventas'); }}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors cursor-pointer mr-1"
                title="Abrir Punto de Venta (POS)"
              >
                <Calculator size={13} />
                <span>Punto de Venta</span>
              </button>
            )}

            {/* "Uso y plan" button */}
            <button
              type="button"
              onClick={() => { setBillingInitialSubTab('planes'); setActivePageId('billing'); }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Ver consumo y planes"
            >
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Uso y plan</span>
            </button>

            {/* Help Icon */}
            <button
              type="button"
              onClick={() => setActivePageId('soporte_tecnico')}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Ayuda y Soporte"
            >
              <HelpCircle size={16} />
            </button>

            {/* Settings Icon */}
            <button
              type="button"
              onClick={() => setActivePageId('general_settings')}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Configuración"
            >
              <Settings size={16} />
            </button>

            {/* Notifications Icon */}
            <button
              type="button"
              onClick={() => showToast('Sin notificaciones nuevas', 'info')}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer relative"
              title="Notificaciones"
            >
              <Bell size={16} />
            </button>

            {/* User Profile Pill & Dropdown (Brevo Style) */}
            <div className="relative ml-1" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer select-none"
                title="Opciones de cuenta"
              >
                <div className="w-7 h-7 rounded-full bg-[#1b1b1b] text-white flex items-center justify-center text-xs font-bold tracking-tight shrink-0 shadow-xs">
                  {((companyProfile?.nombreComercial || companyProfile?.razonSocial || currentUser?.displayName || 'WF').replace(/[^a-zA-Z0-9]/g, '').substring(0, 2) || 'WF').toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-800 hidden md:inline max-w-[130px] truncate uppercase tracking-tight">
                  {companyProfile?.nombreComercial || companyProfile?.razonSocial || currentUser?.displayName || 'WebFix'}
                </span>
                <ChevronDown size={13} className={`text-slate-500 shrink-0 transition-transform duration-150 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200/90 shadow-xl py-2 z-50 animate-in fade-in duration-150">
                  <div className="px-4 py-2.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1b1b1b] text-white flex items-center justify-center text-xs font-bold tracking-tight shrink-0">
                      {((companyProfile?.nombreComercial || companyProfile?.razonSocial || currentUser?.displayName || 'WF').replace(/[^a-zA-Z0-9]/g, '').substring(0, 2) || 'WF').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">Mi perfil</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || 'admin@webfix.ec'}</p>
                    </div>
                  </div>
                  <div className="h-[1px] bg-slate-100 my-1" />
                  
                  <button
                    type="button"
                    onClick={() => { setIsProfileMenuOpen(false); setBillingInitialSubTab('planes'); setActivePageId('billing'); }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <CreditCard size={15} className="text-slate-500" />
                    <span>Mi plan</span>
                  </button>

                  {userRole === 'superadmin' && (
                    <button
                      type="button"
                      onClick={() => { setIsProfileMenuOpen(false); navigate('/superadmin'); }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Shield size={15} className="text-amber-600 shrink-0" />
                      <span>Panel SuperAdmin</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setIsProfileMenuOpen(false); setIsGlobalChatOpen(true); }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Sparkles size={15} className="text-indigo-600" />
                    <span>Centro de control de IA</span>
                  </button>

                  <div className="h-[1px] bg-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={() => { setIsProfileMenuOpen(false); setActivePageId('general_settings'); }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Settings size={15} className="text-slate-500" />
                    <span>Configuración</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsProfileMenuOpen(false); setActivePageId('soporte_tecnico'); }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <HelpCircle size={15} className="text-slate-500" />
                    <span>Soporte técnico</span>
                  </button>

                  <div className="h-[1px] bg-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut size={15} className="text-red-500" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Wrapper with AI Chat sidebar */}
        <UiBox {...{"className":"flex-1 flex overflow-hidden min-h-0 relative bg-white"}}>

          {/* Editor Area */}
          <UiBox ref={mainContentRef} className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar pb-8 pt-4 px-4 md:px-6 bg-white">
            <UiBox className="max-w-[1600px] w-full mx-auto">
              {isSubscriptionBlocked(tenantInfo) && activePageId !== 'billing' ? (
                <UiBox {...{"className":"flex flex-col items-center justify-center p-12 text-center h-[70vh] w-full select-none animate-in fade-in duration-300"}}>
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","color":"var(--red-11)","border":"1px solid var(--gray-a6)"},"className":"p-5 mb-6"}}>
                    <Lock size={36} />
                  </UiBox>
                  <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"red","className":"mb-2"}}>Servicio Suspendido</UiHeading>
                  <UiText as="p" {...{"size":"1","weight":"bold","color":"gray","className":"max-w-sm mb-6 leading-relaxed"}}>
                    Tu acceso al ERP ha sido temporalmente suspendido debido al vencimiento o falta de pago de tu suscripción.
                  </UiText>
                  <UiButton
                    onClick={() => setActivePageId('billing')}
                    {...{"variant":"solid","color":"blue","size":"2","className":"hover:scale-[1.02] active:scale-[0.98]"}}
                  >
                    Registrar Pago / Suscripción
                  </UiButton>
                </UiBox>
              ) : isModuleLocked ? (
                <UiBox {...{"className":"flex flex-col items-center justify-center p-12 text-center h-[70vh] w-full select-none animate-in fade-in duration-300"}}>
                  <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"},"className":"p-5 mb-6"}}>
                    <Lock size={36} {...{"style":{"color":"var(--blue-12)"}}} />
                  </UiBox>
                  <UiHeading as="h2" {...{"size":"4","weight":"bold","className":"mb-2"}}>Módulo Premium Reservado</UiHeading>
                  <UiText as="p" {...{"size":"1","weight":"bold","color":"gray","className":"max-w-sm mb-6 leading-relaxed"}}>
                    Este módulo no está incluido en tu plan actual. Actualiza tu cuenta para habilitarlo de forma inmediata.
                  </UiText>
                  <UiButton
                    onClick={() => setActivePageId('billing')}
                    {...{"variant":"solid","color":"blue","size":"2","className":"hover:scale-[1.02] active:scale-[0.98]"}}
                  >
                    Ver Planes y Precios
                  </UiButton>
                </UiBox>
              ) : (
                <>
                  {/* VISTA: PORTAL DE SUSCRIPCIÓN Y PAGOS */}
                  {activePageId === 'billing' && (
                    <BillingPortal 
                      showToast={showToast} 
                      initialSubTab={billingInitialSubTab} 
                      onSubTabChange={(tab) => setBillingInitialSubTab(tab)}
                    />
                  )}


              {activePageId === 'ventas' && (
                <ErrorBoundary title="Error en el módulo de Ventas">
                  <FinanceModule mode="ventas" initialSubTab={ventasInitialSubTab} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} products={globalProducts} discounts={globalDiscounts} promotions={globalPromotions} categories={globalCategories} isLoading={isLoadingFinances} />
                </ErrorBoundary>
              )}
              {activePageId === 'inventario' && (
                <ErrorBoundary title="Error en el módulo de Inventario">
                  <InventoryModule initialSubTab={inventarioInitialSubTab} showToast={showToast} />
                </ErrorBoundary>
              )}
              {activePageId === 'finances' && (
                <ErrorBoundary title="Error en el módulo de Control Financiero">
                  <FinanceModule mode="contabilidad" initialSubTab={contabilidadInitialSubTab} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} products={globalProducts} discounts={globalDiscounts} promotions={globalPromotions} categories={globalCategories} isLoading={isLoadingFinances} />
                </ErrorBoundary>
              )}
              {activePageId === 'compras' && (
                <ErrorBoundary title="Error en el módulo de Compras">
                  <FinanceModule mode="compras" initialSubTab={comprasInitialSubTab} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} products={globalProducts} discounts={globalDiscounts} promotions={globalPromotions} categories={globalCategories} isLoading={isLoadingFinances} />
                </ErrorBoundary>
              )}
              {activePageId === 'gastos_creditos' && (
                <ErrorBoundary title="Error en el módulo de Gastos y Créditos">
                  <GastosCreditosModule showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} db={db} appId={appId} initialSubTab={gastosInitialSubTab} />
                </ErrorBoundary>
              )}

              {/* VISTA: CONFIGURACIÓN GENERAL */}
              {activePageId === 'general_settings' && (
                <GeneralSettings 
                  showToast={showToast} 
                  db={db} 
                  appId={appId} 
                  storage={storage}
                  users={users} 
                  trash={trash} 
                  handleDownloadBackup={handleDownloadBackup} 
                  googleClientId={googleClientId} 
                  setGoogleClientId={setGoogleClientId} 
                  activeModules={activeModules} 
                  setActiveModules={setActiveModules} 
                />
              )}

              {/* VISTA: CONTRATACIÓN DE SERVICIOS */}
              {activePageId === 'contratar_servicios' && (
                <HiringServicesModule 
                  showToast={showToast} 
                  db={db} 
                  appId={appId} 
                />
              )}

              {/* VISTA: SOPORTE TÉCNICO */}
              {activePageId === 'soporte_tecnico' && (
                <SupportModule 
                  showToast={showToast} 
                  db={db} 
                  appId={appId} 
                />
              )}

              {/* VISTA: DASHBOARD */}
              {activePageId === 'dashboard' && (
                <ErpDashboard 
                  setActivePageId={setActivePageId} 
                  setVentasInitialSubTab={setVentasInitialSubTab}
                  setComprasInitialSubTab={setComprasInitialSubTab}
                  setInventarioInitialSubTab={setInventarioInitialSubTab}
                  setContabilidadInitialSubTab={setContabilidadInitialSubTab}
                  setPersonasSubTab={setPersonasSubTab}
                  showToast={showToast}
                  transactions={globalTransactions}
                  thirdParties={globalThirdParties}
                  products={globalProducts}
                  companyProfile={companyProfile}
                  usuario={currentUser}
                  db={db} 
                  appId={appId} 
                />
              )}

              {/* MÓDULO PERSONAS (CLIENTES Y PROVEEDORES) */}
              {activePageId === 'personas' && (
                <ErrorBoundary title="Error en el módulo de Personas">
                  <ThirdPartiesView 
                    thirdParties={globalThirdParties} 
                    transactions={globalTransactions} 
                    showToast={showToast} 
                    db={db} 
                    appId={appId} 
                    forcedType={personasSubTab} 
                  />
                </ErrorBoundary>
              )}
                </>
              )}
            </UiBox>
          </UiBox> {/* Closes Editor Area */}

        {/* Chat Lateral de IA Global */}
        {isGlobalChatOpen && (
          <UiBox {...mergeThemeProps({"style":{"borderLeft":"1px solid var(--gray-a6)"},"className":"w-80 shrink-0 flex flex-col p-4 animate-in slide-in-from-right duration-300"}, {}, {"style":{"backgroundColor":"var(--blue-3)"}})}>
            <FinanceChat
              transactions={globalTransactions}
              onClose={() => setIsGlobalChatOpen(false)}
            />
          </UiBox>
        )}

        </UiBox> {/* Closes Content Wrapper */}
      </UiBox> {/* Closes Main Content Area */}


      {/* Drawer Overlay (User) */}
      {drawerUser && <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[70] transition-opacity"}} onClick={() => setDrawerUser(null)} />}

      {/* Drawer (User) */}
      <UiBox {...mergeThemeProps({"className":"fixed inset-y-0 right-0 z-[80] w-full sm:w-[400px]"}, {"className":"transform transition-transform duration-300 flex flex-col"}, {}, (drawerUser ? {"className":"translate-x-0"} : {"className":"translate-x-full"}), {"style":{"backgroundColor":"var(--color-panel-solid)","borderLeft":"1px solid var(--gray-a6)"}})}>
        {drawerUser && (
          <>
            <UiBox {...mergeThemeProps({"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between px-6 py-4 shrink-0"}, {}, {})}>
              <UiBox {...{"className":"flex items-center gap-3"}}>
                <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)"},"className":"p-2"}, {}, {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-12)","border":"1px solid var(--gray-a6)"}})}><UserPlus size={18} /></UiBox>
                <UiHeading as="h2" {...mergeThemeProps({"size":"4","weight":"bold"}, {}, {"color":"gray","highContrast":true})}>{drawerUser.isNew ? 'Invitar Miembro' : 'Editar Usuario'}</UiHeading>
              </UiBox>
              <UiButton iconOnly onClick={() => setDrawerUser(null)} {...mergeThemeProps({}, {}, {"variant":"surface","color":"gray"})}><X size={16} /></UiButton>
            </UiBox>

            <UiBox {...{"className":"flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar"}}>
              <UiBox {...{"className":"space-y-4"}}>
                {/* Preview Avatar */}
                <UiBox {...{"className":"flex justify-center mb-6"}}>
                  <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","color":"var(--color-background)","backgroundColor":"var(--gray-2)"},"className":"w-20 h-20 flex items-center justify-center"}, {}, resolveThemeProps(drawerUser.color))}>
                    {drawerUser.name ? drawerUser.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'U'}
                  </UiBox>
                </UiBox>

                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-2"}, {}, {"color":"gray"})}>Nombre Completo</UiLabel>
                  <UiInput type="text" value={drawerUser.name} onChange={(e) => setDrawerUser(prev => ({ ...prev, name: e.target.value }))} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, resolveThemeProps(currentGlassInput))} placeholder="Ej. Jane Doe" />
                </UiBox>
                
                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-2"}, {}, {"color":"gray"})}>Cargo / Puesto</UiLabel>
                  <UiInput type="text" value={drawerUser.job} onChange={(e) => setDrawerUser(prev => ({ ...prev, job: e.target.value }))} {...mergeThemeProps({"size":"2","className":"w-full"}, {}, resolveThemeProps(currentGlassInput))} placeholder="Ej. Frontend Developer" />
                </UiBox>

                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-2"}, {}, {"color":"gray"})}>Rol en el Sistema</UiLabel>
                  <UiSelect value={drawerUser.role} onChange={(e) => setDrawerUser(prev => ({ ...prev, role: e.target.value }))} {...mergeThemeProps({"size":"2","className":"w-full cursor-pointer"}, {}, resolveThemeProps(currentGlassInput))}>
                    <option value="Admin" {...{"style":{"color":"var(--gray-12)"}}}>Admin</option>
                    <option value="Miembro" {...{"style":{"color":"var(--gray-12)"}}}>Miembro</option>
                    <option value="Observador" {...{"style":{"color":"var(--gray-12)"}}}>Observador</option>
                  </UiSelect>
                </UiBox>

                <UiBox>
                  <UiLabel {...mergeThemeProps({"size":"1","weight":"bold","className":"block mb-3 mt-4"}, {}, {"color":"gray"})}>Color del Avatar</UiLabel>
                  <UiBox {...{"className":"flex gap-3 flex-wrap"}}>
                    {USER_COLORS.map(colorClass => (
                      <UiButton
                        key={colorClass}
                        onClick={() => setDrawerUser(prev => ({ ...prev, color: colorClass }))}
                        {...mergeThemeProps({"variant":"solid","color":"gray","className":"w-8"}, {"className":"transition-transform hover:scale-110"}, {}, resolveThemeProps(colorClass), (drawerUser.color === colorClass ? {} : {"className":"opacity-70"}))}
                      />
                    ))}
                  </UiBox>
                </UiBox>

              </UiBox>
            </UiBox>
            
            <UiCard {...mergeThemeProps({"className":"px-6 py-4 flex justify-end shrink-0"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)"}})}>
              <UiButton onClick={() => setDrawerUser(null)} {...mergeThemeProps({"size":"2"}, {}, {"color":"gray"})}>Cancelar</UiButton>
              <UiButton onClick={saveDrawerUser} disabled={!drawerUser.name.trim()} {...mergeThemeProps({"size":"2","className":"flex items-center gap-2 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105"}, {}, {"variant":"solid","color":"blue"})}><Save size={16} /> Guardar Usuario</UiButton>
            </UiCard>
          </>
        )}
      </UiBox>



      {/* Contenedor de Toasts (Notificaciones Flotantes Minimalistas) */}
      <UiBox {...{"className":"fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none"}}>
        {toasts.map(toast => (
          <UiCard key={toast.id} {...mergeThemeProps({"className":"animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-2.5 px-4 py-3 pointer-events-auto"}, {}, {"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"}})}>
            {toast.type === 'success' && <CheckCircle2 size={16} {...{"style":{"color":"var(--green-11)"}}} />}
            {toast.type === 'error' && <X size={16} {...{"style":{"color":"var(--red-11)"}}} />}
            {toast.type === 'sync' && <Cloud size={16} {...{"style":{"color":"var(--blue-12)"},"className":"animate-pulse"}} />}
            <UiText {...{"size":"1","weight":"bold"}}>{toast.message}</UiText>
          </UiCard>
        ))}
      </UiBox>

      {/* Confirmación Global Personalizada */}
      {globalConfirmDialog && (
        <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"}}>
          <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"max-w-sm w-full overflow-hidden p-6 animate-in zoom-in-95 duration-200"}}>
            <UiBox {...{"className":"flex flex-col items-center text-center"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--amber-3)","border":"1px solid var(--gray-a6)"},"className":"w-12 h-12 flex items-center justify-center shrink-0 mb-4 animate-bounce"}}>
                <AlertCircle {...{"style":{"color":"var(--amber-11)"}}} size={24} />
              </UiBox>
              <UiHeading as="h3" {...{"size":"3","weight":"bold","color":"gray","highContrast":true,"className":"leading-tight"}}>¿Estás seguro?</UiHeading>
              <UiText as="p" {...{"size":"1","weight":"bold","color":"gray","className":"mt-2.5 leading-relaxed whitespace-pre-wrap"}}>{globalConfirmDialog.message}</UiText>
            </UiBox>
            <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex items-center gap-3 mt-6 pt-4"}}>
              <UiButton
                type="button"
                onClick={globalConfirmDialog.onCancel}
                {...{"size":"2","variant":"outline","color":"gray","className":"flex-1 active:scale-95"}}
              >
                Cancelar
              </UiButton>
              <UiButton
                type="button"
                onClick={globalConfirmDialog.onConfirm}
                {...{"size":"2","variant":"solid","color":"blue","className":"flex-1 active:scale-95"}}
              >
                Aceptar
              </UiButton>
            </UiBox>
          </UiBox>
        </UiBox>
      )}

        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
