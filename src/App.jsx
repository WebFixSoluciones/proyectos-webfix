import { resolveThemeProps } from './components/ui/themeProps';
import { mergeThemeProps } from './components/ui/themeProps';
import { UiCard, UiBox, UiText, UiHeading, UiLabel } from './components/ui/layout';
import { UiTextarea, UiButton, UiInput, UiSelect } from './components/ui/controls';
import { normalizeProduct } from './services/productModel';
import { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  Menu,
  Sparkles,
  X,
  Save,
  CheckCircle2,
  Shield,
  UserPlus,
  Pencil,
  Lock,
  Cloud,
  Settings,
  Calculator,
  CloudOff,
  AlertCircle,
  Search,
  HelpCircle,
  Bell,
  ChevronDown,
  LogOut,
  CreditCard
} from 'lucide-react';

import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, getDocs, getDoc } from 'firebase/firestore';

import { auth, db, storage, appId } from './firebase';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Badge } from './components/ui/badge';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LandingLayout from './pages/landing/LandingLayout';
import LandingHome from './pages/landing/LandingHome';
import LandingFeatures from './pages/landing/LandingFeatures';
import LandingPricing from './pages/landing/LandingPricing';
import LandingAbout from './pages/landing/LandingAbout';
import LandingContact from './pages/landing/LandingContact';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SuperAdminPage from './pages/SuperAdminPage';
import BillingPortal from './pages/billing/BillingPortal';
import PublicRideView from './pages/PublicRideView';
import { PLANS } from './config/plans';

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
import IconRenderer from './components/common/IconRenderer';
import { USER_COLORS, MOCK_USERS } from './constants/appData';

// Helper Strings para clases Glassmorphism
// eslint-disable-next-line no-unused-vars
const glassPanelDark = "glass-panel-dark";
const glassPanelLight = "glass-panel-light";
// eslint-disable-next-line no-unused-vars
const glassInputDark = "glass-input-dark";
const glassInputLight = "glass-input-light";


export default function App() {
  // eslint-disable-next-line no-unused-vars
  const { currentUser, tenantInfo, planId, planStatus, role: userRole } = useAuth();
  const isAuthenticated = !!currentUser;
  const navigate = useNavigate();
  const location = useLocation();

  const [plansList, setPlansList] = useState(Object.values(PLANS));
  const [trash, setTrash] = useState([]);
  const [users, setUsers] = useState(MOCK_USERS);
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
    if (!isAuthenticated) {
      if (path.startsWith('/app') || path === '/superadmin') {
        navigate('/login');
      }
    } else {
      if (path === '/login' || path === '/register' || path === '/') {
        if (userRole === 'superadmin') {
          navigate('/superadmin');
        } else {
          navigate('/app');
        }
      }
    }
  }, [isAuthenticated, location.pathname, userRole, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const path = location.pathname;
    if (path.startsWith('/app/')) {
      const subpage = path.substring(5);
      if (subpage === 'billing') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActivePageId('billing');
      }
    }
  }, [location.pathname, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const currentPath = location.pathname;
    if (activePageId === 'billing') {
      if (currentPath !== '/app/billing') navigate('/app/billing');
    } else {
      if (currentPath === '/app/billing') {
        navigate('/app');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId, isAuthenticated, navigate]);



  useEffect(() => {
    if (!planId) return;
    const currentPlan = plansList.find(p => p.id === planId) || PLANS[planId];
    if (currentPlan && currentPlan.modules) {
      const isProfessional = currentPlan.id === 'professional';
      const isEnterprise = currentPlan.id === 'enterprise';
      const isStarter = currentPlan.id === 'starter';

      const newModules = {
        dashboard: currentPlan.modules.includes('dashboard'),
        ventas: currentPlan.modules.includes('ventas'),
        finances: currentPlan.modules.includes('finances') || currentPlan.modules.includes('contabilidad') || isEnterprise,
        compras: currentPlan.modules.includes('compras') || currentPlan.modules.includes('contabilidad') || isEnterprise,
        gastos_creditos: currentPlan.modules.includes('gastos_creditos') || currentPlan.modules.includes('contabilidad') || isEnterprise,
        inventario: currentPlan.modules.includes('inventario') || isProfessional || isEnterprise,
        personas: currentPlan.modules.includes('personas') || isStarter || isProfessional || isEnterprise,
        team: currentPlan.modules.includes('team') || isProfessional || isEnterprise
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveModules(newModules);
    }
  }, [planId, plansList]);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    window.confirm = (message) => {
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
    };

    window.alert = (message) => {
      showToast(message, 'error');
    };
  }, []);

  // --- LOGIN CON MINIMALISMO LÍQUIDO PURO (SIN CANVAS) ---

  // Limpiar sincronización de la nube al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  // Al iniciar sesión, sembramos una entrada base y escuchamos el botón atrás.
  // Esto evita que "Atrás" saque al usuario del sistema: navega entre páginas
  // visitadas y, al llegar al piso, aterriza en el Dashboard.
  useEffect(() => {
    if (!isAuthenticated) return;

    // Sembrar la entrada actual del historial con la página activa
    window.history.replaceState({ activePageId }, '');

    const onPopState = (e) => {
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
    // Solo al cambiar el estado de autenticación (no en cada navegación)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Empujar una nueva entrada al historial cada vez que cambia la página activa,
  // salvo que el cambio provenga del propio botón atrás/adelante.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (isPopNavigation.current) {
      isPopNavigation.current = false;
      return;
    }
    // Saltar el primer disparo tras autenticarse: la entrada base ya fue sembrada
    // con replaceState en el efecto anterior, evitando una entrada duplicada.
    if (!navInitialized.current) {
      navInitialized.current = true;
      return;
    }
    window.history.pushState({ activePageId }, '');
  }, [activePageId, isAuthenticated]);

  const [companyProfile, setCompanyProfile] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [isPersonasExpanded, setIsPersonasExpanded] = useState(true);

  // Auto-expand submenus when active page changes
  useEffect(() => {
    if (activePageId === 'personas' || activePageId === 'team') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (!isAuthenticated || !auth.currentUser) return;

    const metaDoc = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');

    // 1. Escuchar Meta (Users, Trash, Settings)
    const unsubMeta = onSnapshot(metaDoc, snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.users) setUsers(data.users);
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
      triggerSyncError();
    });

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
      triggerSyncError();
    });

    // 3. Escuchar Terceros
    const tpCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties');
    const unsubTp = onSnapshot(tpCol, (snap) => {
      const tpData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGlobalThirdParties(tpData);
    }, (err) => {
      console.error("Error subscribing to global third parties:", err);
      triggerSyncError();
    });

    // 4. Escuchar Productos (Centralizado desde inventory_products)
    const prodCol = collection(db, 'artifacts', appId, 'public', 'data', 'inventory_products');
    const unsubProd = onSnapshot(prodCol, (snap) => {
      const prodData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRawProducts(prodData);
    }, (err) => {
      console.error("Error subscribing to global products:", err);
      triggerSyncError();
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
      unsubTx(); 
      unsubTp(); 
      unsubProd(); 
      unsubCat();
      unsubBrand();
      unsubDisc();
      unsubPromo();
    };

    return () => { if (window.__unsubFirestore) window.__unsubFirestore(); };
  }, [isAuthenticated]);

  // Determinar página activa
  let activePage;
  if (activePageId === 'dashboard') {
    activePage = { id: 'dashboard', title: 'Dashboard', icon: 'dashboard', type: 'dashboard' };
  } else if (activePageId === 'finances') {
    activePage = { id: 'finances', title: 'Control Financiero', icon: 'finances', type: 'finances' };
  } else if (activePageId === 'compras') {
    activePage = { id: 'compras', title: 'Compras y Facturas Recibidas', icon: 'compras', type: 'compras' };
  } else if (activePageId === 'gastos_creditos') {
    activePage = { id: 'gastos_creditos', title: 'Finanzas', icon: 'gastos_creditos', type: 'gastos_creditos' };
  } else if (activePageId === 'ventas') {
    activePage = { id: 'ventas', title: 'Ventas y Facturación', icon: 'ventas', type: 'ventas' };
  } else if (activePageId === 'inventario') {
    activePage = { id: 'inventario', title: 'Inventario', icon: 'inventario', type: 'inventario' };
  } else if (activePageId === 'personas') {
    activePage = { id: 'personas', title: 'Personas', icon: 'personas', type: 'personas' };
  } else if (activePageId === 'general_settings') {
    activePage = { id: 'general_settings', title: 'Ajustes', icon: 'settings', type: 'general_settings' };
  } else if (activePageId === 'billing') {
    activePage = { id: 'billing', title: 'Suscripción', icon: 'credit-card', type: 'billing' };
  } else if (activePageId === 'trash') {
    activePage = { id: 'trash', title: 'Papelera', icon: 'trash', type: 'trash' };
  } else if (activePageId === 'contratar_servicios') {
    activePage = { id: 'contratar_servicios', title: 'Servicios Web Fix', icon: 'rocket', type: 'contratar_servicios' };
  } else if (activePageId === 'soporte_tecnico') {
    activePage = { id: 'soporte_tecnico', title: 'Soporte Técnico', icon: 'life-buoy', type: 'soporte_tecnico' };
  } else {
    activePage = { id: 'dashboard', title: 'Dashboard General ERP', icon: 'dashboard', type: 'dashboard' };
  }

  const getModuleHeaderDetails = () => {
    switch (activePageId) {
      case 'dashboard':
        return {
          title: 'Dashboard General ERP',
          desc: 'Control holístico de finanzas, inventario, ventas y cumplimiento tributario SRI',
          icon: 'dashboard'
        };
      case 'finances': {
        const subtabs = {
          dashboard: { title: 'Control Financiero: Resumen', desc: 'Flujo de caja, saldos, cartera y cumplimiento fiscal en tiempo real' },
          resumen_financiero: { title: 'Resumen Financiero', desc: 'Flujo de caja consolidado, liquidez, cartera, deuda y pronóstico' },
          movimientos: { title: 'Movimientos Financieros', desc: 'Registro central de ingresos, egresos, cobros y pagos' },
          cxc: { title: 'Cuentas por Cobrar (CxC)', desc: 'Seguimiento de cartera, vencimientos y abonos de clientes' },
          cxp: { title: 'Cuentas por Pagar (CxP)', desc: 'Control de deudas con proveedores, retenciones y programación de pagos' },
          bancos: { title: 'Bancos y Caja', desc: 'Saldos de cuentas bancarias, arqueos de caja y conciliación inteligente' },
          tarjetas: { title: 'Tarjetas y Créditos', desc: 'Control de tarjetas de crédito corporativas, cortes y consumos diferidos' },
          prestamos: { title: 'Préstamos Bancarios', desc: 'Tablas de amortización francesa/alemana y seguimiento de cuotas' },
          captura: { title: 'Captura Inteligente (OCR)', desc: 'Extracción asistida con IA de comprobantes físicos, XML y PDFs' },
          contabilidad_tab: { title: 'Contabilidad & Plan de Cuentas', desc: 'Plan de cuentas NIIF, asientos contables y libro diario' },
          impuestos: { title: 'Impuestos & SRI', desc: 'Cruce de IVA, retenciones y generación del anexo ATS' },
          reportes: { title: 'Reportes Especializados', desc: 'Reporte de flujo, cartera, deudas, impuestos y exportación' }
        };
        const current = subtabs[contabilidadInitialSubTab] || { title: 'Control Financiero', desc: 'Ingresos, gastos, cartera, tarjetas, créditos, reportes y cumplimiento tributario' };
        return { ...current, icon: 'finances' };
      }
      case 'ventas': {
        const subStr = String(ventasInitialSubTab || '');
        if (subStr.startsWith('pos')) {
          return {
            title: 'Punto de Venta (POS)',
            desc: 'Facturación rápida e intuitiva para tiendas y comercio directo',
            icon: 'ventas'
          };
        }
        if (subStr.startsWith('ventas_nueva') || subStr.startsWith('ventas_preventa')) {
          return {
            title: 'Registrar Venta',
            desc: 'Registro directo de ventas administrativas y facturación electrónica',
            icon: 'ventas'
          };
        }
        const subtabs = {
          resumen_ventas: { title: 'Historial de Ventas', desc: 'Listado y métricas de comprobantes electrónicos de venta autorizados' },
          ventas_nueva: { title: 'Registrar Venta', desc: 'Registro directo de ventas administrativas y facturación electrónica' },
          ventas_preventa: { title: 'Registrar Venta', desc: 'Registro directo de ventas administrativas y facturación electrónica' },
          pos: { title: 'Punto de Venta (POS)', desc: 'Facturación rápida e intuitiva para tiendas y comercio directo' },
          preventas: { title: 'Preventas', desc: 'Gestión y despacho de ventas y pedidos realizados de forma anticipada' },
          quotes: { title: 'Cotizaciones', desc: 'Emisión y gestión de cotizaciones comerciales para clientes' },
          nota_credito: { title: 'Notas de Crédito', desc: 'Anulaciones y devoluciones tributarias autorizadas por el SRI' },
          retencion: { title: 'Retenciones de Venta', desc: 'Registro de retenciones de IVA y Renta recibidas de clientes' },
          discounts: { title: 'Descuentos & Promociones', desc: 'Configuración de descuentos por producto y reglas de promoción' }
        };
        const current = subtabs[ventasInitialSubTab] || { title: 'Descuentos & Promociones', desc: 'Configuración de descuentos y promociones comerciales' };
        return { ...current, icon: 'ventas' };
      }
      case 'inventario': {
        const subtabs = {
          productos: { title: 'Productos', desc: 'Catálogo de artículos en stock, precios, imágenes y parametrización de IVA' },
          servicios: { title: 'Servicios', desc: 'Catálogo de servicios profesionales, consultorías e intangibles facturables' },
          categorias: { title: 'Categorías', desc: 'Clasificación de productos y servicios para reportes y filtros rápidos' }
        };
        const current = subtabs[inventarioInitialSubTab] || { title: 'Inventario', desc: 'Catálogo de productos y servicios con parametrización de IVA del SRI' };
        return { ...current, icon: 'inventario' };
      }
      case 'personas': {
        const subtabs = {
          cliente: { title: 'Clientes', desc: 'Directorio de clientes registrados con validación SRI y base de datos' },
          proveedor: { title: 'Proveedores', desc: 'Directorio de proveedores registrados, RUC y clasificación comercial' }
        };
        const current = subtabs[personasSubTab] || { title: 'Personas', desc: 'Base de datos unificada de clientes y proveedores con validación de datos SRI' };
        return { ...current, icon: 'personas' };
      }
      case 'compras': {
        const subtabs = {
          compras_resumen: { title: 'Historial de Compras', desc: 'Listado y registro de facturas recibidas de tus proveedores' },
          compras_sri: { title: 'Facturas Recibidas SRI', desc: 'Sincroniza y concilia facturas emitidas por tus proveedores en el SRI' },
          compras_gastos: { title: 'Gastos con IA', desc: 'Clasificación y registro automático de gastos mediante inteligencia artificial' },
          compras_nc: { title: 'Notas de Crédito Recibidas', desc: 'Registro de devoluciones y descuentos aplicados por tus proveedores' },
          compras_retencion: { title: 'Retenciones Emitidas', desc: 'Genera y autoriza retenciones a tus proveedores autorizadas por el SRI' }
        };
        const current = subtabs[comprasInitialSubTab] || { title: 'Compras', desc: 'Registro de facturas de proveedores y control de compras electrónicas' };
        return { ...current, icon: 'compras' };
      }
      case 'gastos_creditos': {
        const subtabs = {
          resumen: { title: 'Resumen Financiero', desc: 'Visualización consolidada de flujos de caja y estados financieros' },
          gastos: { title: 'Gastos', desc: 'Registro detallado y control de egresos operacionales de la empresa' },
          creditos: { title: 'Cuentas de Crédito', desc: 'Monitoreo de deudas, plazos de pago y líneas de crédito abiertas' }
        };
        const current = subtabs[gastosInitialSubTab] || { title: 'Finanzas', desc: 'Control y registro de gastos de la empresa y cuentas de crédito por pagar/cobrar' };
        return { ...current, icon: 'gastos_creditos' };
      }
      case 'general_settings':
        return {
          title: 'Ajustes',
          desc: 'Ajustes de empresa, colores del sistema, módulos e integraciones con Gemini y Google',
          icon: 'settings'
        };
      case 'trash':
        return {
          title: 'Papelera de Reciclaje',
          desc: 'Recupera o elimina permanentemente páginas y tareas del espacio',
          icon: 'trash'
        };
      case 'contratar_servicios':
        return {
          title: 'Servicios de Crecimiento',
          desc: 'Adquiere y gestiona servicios de diseño, correo corporativo y marketing digital para potenciar tu marca',
          icon: 'rocket'
        };
      case 'soporte_tecnico':
        return {
          title: 'Soporte Técnico',
          desc: 'Envía tus solicitudes de ayuda técnica y reportes de incidencias directamente a nuestro equipo',
          icon: 'life-buoy'
        };
      case 'billing': {
        const subtabs = {
          facturacion: { title: 'Facturación Electrónica', desc: 'Planes de emisión de comprobantes electrónicos del SRI para tu negocio' },
          paginas: { title: 'Páginas Web', desc: 'Elige o actualiza tu plan de hosting, landing page o tienda en línea' },
          correos: { title: 'Correos Corporativos', desc: 'Administra cuentas de correo empresarial y espacio de almacenamiento' },
          whatsapp: { title: 'WhatsApp CRM', desc: 'Planes de integración para automatización y chat multiagente con WhatsApp' },
          pagos: { title: 'Historial de Pagos', desc: 'Historial de facturas cobradas y estado de tu cuenta SaaS' },
          planes: { title: 'Planes SaaS', desc: 'Catálogo completo de planes y módulos para el crecimiento de tu negocio' }
        };
        const current = subtabs[billingInitialSubTab] || { title: 'Suscripción y Facturación SaaS', desc: 'Gestiona tu plan contratado, revisa tus consumos y reporta tus pagos por transferencia o PayPhone' };
        return { ...current, icon: 'credit-card' };
      }
      default:
        return {
          title: activePage.title || 'Sin título',
          desc: 'Panel general de administración',
          icon: activePage.icon || 'dashboard'
        };
    }
  };
  
  // --- Lógica de Usuarios ---
  const openNewUserDrawer = () => {
    setDrawerUser({
      id: Date.now().toString(),
      name: '',
      role: 'Miembro',
      job: '',
      color: USER_COLORS[0],
      isNew: true
    });
  };

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

  const deleteUser = async (id, e) => {
    if (e) e.stopPropagation();
    const newUsers = users.filter(u => u.id !== id);
    setUsers(newUsers);
    if (drawerUser && drawerUser.id === id) setDrawerUser(null);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info'), { users: newUsers }, { merge: true });
    } catch (e) { console.error('Error deleteUser:', e); }
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

  const currentGlassPanel = glassPanelLight;

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
              {planStatus === 'suspended' && activePageId !== 'billing' ? (
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
                  <FinanceModule mode="ventas" initialSubTab={ventasInitialSubTab} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} products={globalProducts} discounts={globalDiscounts} promotions={globalPromotions} isLoading={isLoadingFinances} />
                </ErrorBoundary>
              )}
              {activePageId === 'inventario' && (
                <ErrorBoundary title="Error en el módulo de Inventario">
                  <InventoryModule initialSubTab={inventarioInitialSubTab} showToast={showToast} />
                </ErrorBoundary>
              )}
              {activePageId === 'finances' && (
                <ErrorBoundary title="Error en el módulo de Control Financiero">
                  <FinanceModule mode="contabilidad" initialSubTab={contabilidadInitialSubTab} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} products={globalProducts} discounts={globalDiscounts} promotions={globalPromotions} isLoading={isLoadingFinances} />
                </ErrorBoundary>
              )}
              {activePageId === 'compras' && (
                <ErrorBoundary title="Error en el módulo de Compras">
                  <FinanceModule mode="compras" initialSubTab={comprasInitialSubTab} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} products={globalProducts} discounts={globalDiscounts} promotions={globalPromotions} isLoading={isLoadingFinances} />
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
