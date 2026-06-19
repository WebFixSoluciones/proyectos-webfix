import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  FileText, 
  Calendar, 
  Video, 
  Trash2, 
  Menu, 
  LogIn, 
  LogOut, 
  Clock,
  MoreHorizontal,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Wand2,
  RotateCcw,
  Briefcase,
  Sun,
  Moon,
  X,
  CalendarDays,
  DollarSign,
  ShoppingCart,
  Package,
  AlignLeft,
  Save,
  Maximize2,
  CheckSquare,
  MessageSquare,
  LayoutDashboard,
  Monitor,
  Palette,
  Rocket,
  BarChart3,
  ListTodo,
  CheckCircle2,
  CircleDashed,
  FolderOpen,
  Users,
  User,
  Eye,
  EyeOff,
  Shield,
  UserCircle,
  UserPlus,
  Pencil,
  Download,
  Link as LinkIcon,
  Lock,
  Mail,
  Key,
  ArrowRight,
  ArrowLeft,
  Cloud,
  Settings,
  GripVertical,
  CreditCard,
  ChevronDown,
  ShoppingBag,
  Building,
  Calculator,
  CloudOff,
  LifeBuoy
} from 'lucide-react';

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { onAuthStateChanged, signInAnonymously, signInWithCustomToken, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, updateDoc, deleteDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';

import { auth, db, storage, appId } from './firebase';
import { useAuth } from './contexts/AuthContext';
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
import { PLANS } from './config/plans';

import FinanceModule from './components/finances/FinanceModule';
import ErpDashboard from './components/dashboard/ErpDashboard';
import GeneralSettings from './components/dashboard/GeneralSettings';
import HiringServicesModule from './components/dashboard/HiringServicesModule';
import SupportModule from './components/dashboard/SupportModule';
import FinanceChat from './components/finances/FinanceChat';
import GastosCreditosModule from './components/finances/GastosCreditosModule';
import InventoryModule from './components/inventory/InventoryModule';
import IconRenderer from './components/common/IconRenderer';
import {
  COLUMN_COLORS, DEFAULT_COLUMNS, USER_COLORS,
  MOCK_USERS, MOCK_EVENTS, INITIAL_PAGES
} from './constants/appData';

const apiKey = ""; // API Key para Gemini (configura tu clave aquí si usas IA)

// ⚠️ El GOOGLE_CLIENT_ID ahora se maneja desde la interfaz (Estado)
const GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

// Helper Strings para clases Glassmorphism
const glassPanelDark = "glass-panel-dark";
const glassPanelLight = "glass-panel-light";
const glassInputDark = "glass-input-dark";
const glassInputLight = "glass-input-light";

// Constantes (COLUMN_COLORS, DEFAULT_COLUMNS, USER_COLORS, MOCK_USERS, MOCK_EVENTS,
// INITIAL_PAGES) e IconRenderer fueron extraídos a módulos dedicados (ver imports arriba).


// --- COMPONENTES DND-KIT ---
const SortableTaskItem = ({ 
  task, isDarkMode, users, editingTaskId, editingTaskContent, 
  setEditingTaskContent, handleInlineSave, setEditingTaskId, 
  startEditingTask, setDrawerTask, activePageId 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const assignedUser = task.assigneeId ? users.find(u => u.id === task.assigneeId) : null;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`group p-2 rounded-lg border transition-all duration-300 relative backdrop-blur-xl ${
        isDarkMode 
          ? 'bg-white/[0.05] border-white/10 hover:border-white/20 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] hover:bg-white/[0.08]' 
          : 'bg-white border-gray-200/80 hover:border-primary/45 shadow-sm hover:shadow hover:bg-white'
      } ${isDragging ? 'z-50 shadow-2xl scale-105' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-2 w-full">
          <div 
            {...attributes} 
            {...listeners} 
            className={`cursor-grab active:cursor-grabbing mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <GripVertical size={14} />
          </div>
          
          <div className="flex-1 w-full pr-4">
            {editingTaskId === task.id ? (
              <textarea
                autoFocus
                value={editingTaskContent}
                onChange={(e) => setEditingTaskContent(e.target.value)}
                onBlur={() => { handleInlineSave(task.id, editingTaskContent); setEditingTaskId(null); }}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInlineSave(task.id, editingTaskContent); setEditingTaskId(null); } }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={`w-full text-xs font-light leading-tight px-1.5 py-1 rounded-lg outline-none bg-black/20 backdrop-blur-md border border-white/20 text-white shadow-inner resize-none overflow-hidden`}
                rows={2}
              />
            ) : (
              <p 
                onClick={(e) => startEditingTask(e, task)}
                onPointerDown={(e) => e.stopPropagation()}
                title="Clic para editar título"
                className={`text-xs font-light leading-tight cursor-text transition-colors hover:text-primary ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} w-full`}
              >
                {task.content}
              </p>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => setDrawerTask({ ...task, projectId: activePageId })}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all shrink-0 backdrop-blur-xl shadow-sm ${isDarkMode ? 'bg-white/20 text-white hover:bg-primary border border-white/10' : 'bg-white/90 text-gray-800 hover:text-white hover:bg-primary border border-gray-200'}`}
          title="Editar detalles completos"
        >
          <Pencil size={12} />
        </button>
      </div>

      {task.meetLink && (
        <a href={task.meetLink} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()} className={`inline-flex items-center gap-1.5 px-2 py-1 mb-2 ml-5 rounded-md text-[10px] font-bold transition-all shadow-sm ${isDarkMode ? 'bg-primary/30 text-primary hover:bg-primary/50 border border-primary/20' : 'bg-primary/10 text-primary hover:bg-primary/15 border border-primary/25'}`}>
          <Video size={10} /> Unirse a Meet
        </a>
      )}

      <div className="flex items-center justify-between mt-1 ml-5">
        <div className="flex items-center gap-1.5">
          {task.notes && task.notes.length > 0 && (
            <div className="relative group/tooltip w-max">
              <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-semibold cursor-help transition-all shadow-sm ${
                isDarkMode 
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30' 
                  : 'bg-yellow-100/80 text-yellow-700 border border-yellow-200 hover:bg-yellow-200'
              }`}>
                <MessageSquare size={10} /> {task.notes.length}
              </span>
              <div className={`absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl shadow-[0_5px_20px_-5px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-50 backdrop-blur-3xl border ${isDarkMode ? 'bg-gray-900/90 border-white/10' : 'bg-white/95 border-gray-200'}`}>
                <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-2 pb-1.5 border-b ${isDarkMode ? 'text-gray-400 border-white/10' : 'text-gray-500 border-gray-100'}`}>Notas Históricas</h4>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {task.notes.map(note => (
                    <div key={note.id} className="text-xs">
                      <span className={`block text-[9px] font-medium mb-0.5 ${isDarkMode ? 'text-primary' : 'text-primary'}`}>{note.date}</span>
                      <p className={`leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-semibold transition-all shadow-sm ${
              isDarkMode 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'bg-primary/10/80 text-primary border border-primary/25'
            }`}>
              <ListTodo size={10} /> {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
            </span>
          )}
        </div>

        {assignedUser && (
          <div title={`Asignado a: ${assignedUser.name}`} className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-inner bg-gradient-to-br ${assignedUser.color}`}>
            {assignedUser.initials}
          </div>
        )}
      </div>
    </div>
  );
};

const SortableColumn = ({ 
  col, isDarkMode, children, cycleColumnColor, editingColumnId, 
  editingColumnTitle, setEditingColumnTitle, saveColumnTitle, 
  startEditingColumn, activePageTasks, openNewTaskDrawer, handleDeleteColumn,
  getColumnBgClass, getColorClass
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: col.id, data: { type: 'Column', column: col } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`snap-center shrink-0 w-[200px] rounded-xl p-2.5 flex flex-col backdrop-blur-2xl transition-all border shadow-lg ${getColumnBgClass(col.color, isDarkMode)} ${isDragging ? 'z-40 shadow-2xl scale-105' : ''}`}
    >
      {/* HEADER COLUMNA */}
      <div className="flex items-center justify-between mb-4 group/col px-1">
        <div className="flex items-center gap-2">
          <div 
            {...attributes} 
            {...listeners} 
            className={`cursor-grab active:cursor-grabbing ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <GripVertical size={14} />
          </div>

          <button 
             onClick={(e) => { e.stopPropagation(); cycleColumnColor(col.id); }}
             onPointerDown={(e) => e.stopPropagation()}
             title="Cambiar color de fondo"
             className={`w-3 h-3 rounded-full transition-transform hover:scale-125 shadow-inner ${COLUMN_COLORS.find(c => c.id === (col.color || 'gray'))?.dot || 'bg-gray-400'}`}
          />
          
          {editingColumnId === col.id ? (
            <input
              type="text"
              autoFocus
              value={editingColumnTitle}
              onChange={(e) => setEditingColumnTitle(e.target.value)}
              onBlur={saveColumnTitle}
              onKeyDown={(e) => { if(e.key === 'Enter') saveColumnTitle(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`font-light text-xs px-2 py-0.5 rounded-md outline-none bg-black/20 backdrop-blur-md border border-white/20 w-28 text-white shadow-inner`}
            />
          ) : (
            <button 
               onClick={(e) => { e.stopPropagation(); startEditingColumn(col); }}
               onPointerDown={(e) => e.stopPropagation()}
               title="Clic para editar nombre"
               className={`font-light text-xs px-2 py-0.5 rounded-md transition-all truncate max-w-[130px] hover:scale-105 shadow-sm ${getColorClass(col.color)} cursor-text`}
            >
              {col.title}
            </button>
          )}
          
          <span className={`opacity-0 group-hover/col:opacity-100 transition-opacity text-[8px] font-medium w-4 h-4 flex items-center justify-center rounded-full shadow-sm border ${isDarkMode ? 'bg-white/10 text-white border-white/20' : 'bg-white/80 text-gray-800 border-white/50'}`}>
            {activePageTasks.filter(t => t.status === col.id).length}
          </span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition-opacity">
          <button onClick={() => openNewTaskDrawer(col.id)} onPointerDown={(e) => e.stopPropagation()} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-white text-gray-800'}`} title="Añadir tarea aquí">
            <Plus size={14} />
          </button>
          <button onClick={() => handleDeleteColumn(col.id)} onPointerDown={(e) => e.stopPropagation()} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-red-500/10 hover:bg-red-500/40 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-600'}`} title="Eliminar columna">
            <X size={12} />
          </button>
        </div>
      </div>
      
      {/* CONTENIDO (TAREAS Y BOTÓN) */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default function App() {
  const { currentUser, tenantInfo, planId, planStatus, role: userRole } = useAuth();
  const isAuthenticated = !!currentUser;
  const navigate = useNavigate();
  const location = useLocation();

  const [plansList, setPlansList] = useState(Object.values(PLANS));
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [trash, setTrash] = useState([]);
  const [users, setUsers] = useState(MOCK_USERS);
  const [activePageId, setActivePageId] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeModules, setActiveModules] = useState({
    dashboard: true,
    ventas: true,
    finances: true,
    compras: true,
    gastos_creditos: true,
    inventario: true,
    personas: true,
    calendar: true,
    team: true,
    proyectos_general: true
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
  }, [activePageId, isAuthenticated, navigate]);



  useEffect(() => {
    if (!planId) return;
    const currentPlan = plansList.find(p => p.id === planId) || PLANS[planId];
    if (currentPlan && currentPlan.modules) {
      const newModules = {
        dashboard: currentPlan.modules.includes('dashboard'),
        ventas: currentPlan.modules.includes('ventas'),
        finances: currentPlan.modules.includes('finances') || currentPlan.modules.includes('contabilidad') || currentPlan.modules.includes('enterprise'),
        compras: currentPlan.modules.includes('compras') || currentPlan.modules.includes('contabilidad') || currentPlan.modules.includes('enterprise'),
        gastos_creditos: currentPlan.modules.includes('gastos_creditos') || currentPlan.modules.includes('contabilidad') || currentPlan.modules.includes('enterprise'),
        inventario: currentPlan.modules.includes('inventario') || currentPlan.modules.includes('professional') || currentPlan.modules.includes('enterprise'),
        personas: currentPlan.modules.includes('personas') || currentPlan.modules.includes('starter') || currentPlan.modules.includes('professional') || currentPlan.modules.includes('enterprise'),
        calendar: currentPlan.modules.includes('calendar') || currentPlan.modules.includes('professional') || currentPlan.modules.includes('enterprise'),
        team: currentPlan.modules.includes('team') || currentPlan.modules.includes('professional') || currentPlan.modules.includes('enterprise'),
        proyectos_general: currentPlan.modules.includes('proyectos_general') || currentPlan.modules.includes('professional') || currentPlan.modules.includes('enterprise')
      };
      setActiveModules(newModules);
    }
  }, [planId, plansList]);
  const [ventasInitialSubTab, setVentasInitialSubTab] = useState('resumen_ventas');
  const [comprasInitialSubTab, setComprasInitialSubTab] = useState('compras_resumen');
  const [contabilidadInitialSubTab, setContabilidadInitialSubTab] = useState('dashboard');
  const [billingInitialSubTab, setBillingInitialSubTab] = useState('facturacion');
  const [gastosInitialSubTab, setGastosInitialSubTab] = useState('resumen');
  const [inventarioInitialSubTab, setInventarioInitialSubTab] = useState('productos');
  const [expandedSidebarMenu, setExpandedSidebarMenu] = useState(null);
  const [personasSubTab, setPersonasSubTab] = useState('cliente');

  useEffect(() => {
    if (['ventas', 'compras', 'finances', 'billing', 'gastos_creditos', 'inventario'].includes(activePageId)) {
      setExpandedSidebarMenu(activePageId);
    } else if (activePageId === 'personas' || activePageId === 'team') {
      setExpandedSidebarMenu('personas_menu');
    } else if (activePageId === 'proyectos_general' || activePageId === 'paginas_general' || activePageId === 'calendar' || activePage?.type === 'project' || activePage?.type === 'doc') {
      setExpandedSidebarMenu('proyectos_menu');
    }
  }, [activePageId, activePage]);

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
  
  // --- ESTADOS DE GOOGLE CALENDAR REAL ---
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [events, setEvents] = useState([]);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#1C40F2');

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
  }, [primaryColor]);

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

  const [newColumnName, setNewColumnName] = useState('');
  const [currentProjectView, setCurrentProjectView] = useState('board'); // 'board' o 'list'
  
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskContent, setEditingTaskContent] = useState('');

  const [drawerTask, setDrawerTask] = useState(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeTimerTaskId, setActiveTimerTaskId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [drawerUser, setDrawerUser] = useState(null);

  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);
  const [reportFilters, setReportFilters] = useState({ projectId: 'all', status: 'all', assigneeId: 'all' });

  const [googleClientId, setGoogleClientId] = useState('');

  // --- SISTEMA DE LOGIN ---
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [dashboardReport, setDashboardReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // --- ESTADOS GLOBALIZADOS DE FINANZAS ---
  const [globalTransactions, setGlobalTransactions] = useState([]);
  const [globalThirdParties, setGlobalThirdParties] = useState([]);
  const [globalProducts, setGlobalProducts] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [globalCategories, setGlobalCategories] = useState([]);
  const [globalBrands, setGlobalBrands] = useState([]);
  const [isLoadingFinances, setIsLoadingFinances] = useState(true);

  // Mapear rawProducts de inventario a globalProducts financieros con soporte reactivo de categorias y marcas
  useEffect(() => {
    const mapped = rawProducts.map(p => {
      const catName = globalCategories.find(c => c.id === p.categoryId)?.name || "";
      const brandName = globalBrands.find(b => b.id === p.brandId)?.name || "";
      return {
        ...p,
        price: Number(p.salePrice) || 0,
        cost: Number(p.baseCost) || 0,
        ivaCategory: Number(p.taxRate) || 15,
        type: p.type === 'SERVICE' ? 'servicio' : 'producto',
        stock: Number(p.stock) || 0,
        minStock: 5,
        categoria: catName,
        marca: brandName,
        bodega: "Bodega Central",
        codigoBarras: ""
      };
    });
    setGlobalProducts(mapped);
  }, [rawProducts, globalCategories, globalBrands]);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);

  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialMount = useRef(true);
  const isRemoteUpdate = useRef(false);
  // Marca para no re-empujar al historial cuando el cambio de página viene del botón atrás/adelante
  const isPopNavigation = useRef(false);
  // Marca para saltar el primer push tras sembrar la entrada base del historial
  const navInitialized = useRef(false);

  // --- SISTEMA DE TOASTS MINIMALISTAS ---
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000); // Se oculta después de 3 segundos
  };

  // --- LOGIN CON MINIMALISMO LÍQUIDO PURO (SIN CANVAS) ---

  // --- CARGAR LIBRERÍA DE GOOGLE (GIS) ---
  useEffect(() => {
    // 1. Cargar API de Google
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

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

  // Temporizador del cronómetro de sesión/tarea
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // 2. Cargar datos de Firestore (Opción B: Colecciones separadas)
  const [globalTasks, setGlobalTasks] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [isPersonasExpanded, setIsPersonasExpanded] = useState(true);
  const [isProyectosExpanded, setIsProyectosExpanded] = useState(true);

  // Auto-expand submenus when active page changes
  useEffect(() => {
    if (activePageId === 'personas' || activePageId === 'team') {
      setIsPersonasExpanded(true);
    }
  }, [activePageId]);

  useEffect(() => {
    const page = pages.find(p => p.id === activePageId);
    if (activePageId === 'calendar' || (page && (page.type === 'project' || page.type === 'doc'))) {
      setIsProyectosExpanded(true);
    }
  }, [activePageId, pages]);

  // Bloquear de forma reactiva cualquier intento de scroll en la ventana del navegador (evita que el layout se desplace)
  useEffect(() => {
    const preventWindowScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', preventWindowScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', preventWindowScroll);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser) return;

    // Referencias a colecciones
    const pagesCol = collection(db, 'artifacts', appId, 'public', 'data', 'pages');
    const tasksCol = collection(db, 'artifacts', appId, 'public', 'data', 'tasks');
    const metaDoc = doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info');

    // Función de Migración (Solo corre si la colección pages está vacía pero existe el doc antiguo)
    const runMigrationIfNeeded = async () => {
      try {
        const pSnap = await getDocs(pagesCol);
        if (pSnap.empty) {
          const oldDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'appState', 'main');
          const oldDocSnap = await getDoc(oldDocRef);
          if (oldDocSnap.exists() && oldDocSnap.data().pages) {
            console.log("Migrando datos de un solo documento a colecciones...");
            const batch = writeBatch(db);
            const data = oldDocSnap.data();
            
            // Migrar páginas
            data.pages.forEach(p => {
              const pRef = doc(pagesCol, p.id);
              const pCopy = { ...p };
              delete pCopy.tasks; // No guardamos tareas dentro del documento del proyecto
              batch.set(pRef, pCopy);
              
              // Migrar tareas del proyecto
              if (p.tasks && p.tasks.length > 0) {
                p.tasks.forEach(t => {
                  const tRef = doc(tasksCol, t.id);
                  batch.set(tRef, { ...t, projectId: p.id });
                });
              }
            });

            // Migrar meta info
            batch.set(metaDoc, { 
              users: data.users || MOCK_USERS, 
              trash: data.trash || [],
              googleClientId: data.googleClientId || ''
            });

            await batch.commit();
            console.log("Migración exitosa.");
          } else {
            // Inicialización limpia
            const batch = writeBatch(db);
            INITIAL_PAGES.forEach(p => {
              const pRef = doc(pagesCol, p.id);
              const pCopy = { ...p };
              delete pCopy.tasks;
              batch.set(pRef, pCopy);
              if (p.tasks) {
                p.tasks.forEach(t => {
                  batch.set(doc(tasksCol, t.id), { ...t, projectId: p.id });
                });
              }
            });
            batch.set(metaDoc, { users: MOCK_USERS, trash: [], googleClientId: '' });
            await batch.commit();
          }
        }
      } catch (e) { console.error("Error en migración/inicialización:", e); }
    };

    runMigrationIfNeeded().then(() => {
      // 1. Escuchar Páginas (spread con doc.id para garantizar ID)
      const unsubPages = onSnapshot(pagesCol, snap => {
        const pData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPages(pData);
      }, err => {
        console.error("Error subscribing to pages:", err);
        triggerSyncError();
      });
      // 2. Escuchar Tareas (spread con doc.id)
      const unsubTasks = onSnapshot(tasksCol, snap => {
        const tData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        tData.sort((a, b) => (a.order || 0) - (b.order || 0));
        setGlobalTasks(tData);
      }, err => {
        console.error("Error subscribing to tasks:", err);
        triggerSyncError();
      });
      // 3. Escuchar Meta (Users, Trash, Settings)
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
          if (data.primaryColor !== undefined) {
            setPrimaryColor(data.primaryColor);
            document.documentElement.style.setProperty('--primary-color', data.primaryColor);
          }
        }
      }, err => {
        console.error("Error subscribing to meta:", err);
        triggerSyncError();
      });

      // 4. Escuchar Transacciones de Finanzas
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

      // 5. Escuchar Terceros
      const tpCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties');
      const unsubTp = onSnapshot(tpCol, (snap) => {
        const tpData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setGlobalThirdParties(tpData);
      }, (err) => {
        console.error("Error subscribing to global third parties:", err);
        triggerSyncError();
      });

      // 6. Escuchar Productos (Centralizado desde inventory_products)
      const prodCol = collection(db, 'artifacts', appId, 'public', 'data', 'inventory_products');
      const unsubProd = onSnapshot(prodCol, (snap) => {
        const prodData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRawProducts(prodData);
      }, (err) => {
        console.error("Error subscribing to global products:", err);
        triggerSyncError();
      });

      // 7. Escuchar Categorías de Inventario
      const catCol = collection(db, 'artifacts', appId, 'public', 'data', 'inventory_categories');
      const unsubCat = onSnapshot(catCol, (snap) => {
        const catData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setGlobalCategories(catData);
      }, (err) => {
        console.error("Error subscribing to global categories:", err);
      });

      // 8. Escuchar Marcas de Inventario
      const brandCol = collection(db, 'artifacts', appId, 'public', 'data', 'inventory_brands');
      const unsubBrand = onSnapshot(brandCol, (snap) => {
        const brandData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setGlobalBrands(brandData);
      }, (err) => {
        console.error("Error subscribing to global brands:", err);
      });

      setIsCloudSynced(true);

      window.__unsubFirestore = () => { 
        unsubPages(); 
        unsubTasks(); 
        unsubMeta(); 
        unsubTx(); 
        unsubTp(); 
        unsubProd(); 
        unsubCat();
        unsubBrand();
      };
    });

    return () => { if (window.__unsubFirestore) window.__unsubFirestore(); };
  }, [isAuthenticated]);

  // Determinar página activa
  let activePage;
  if (activePageId === 'dashboard') {
    activePage = { id: 'dashboard', title: 'Dashboard', icon: 'dashboard', type: 'dashboard' };
  } else if (activePageId === 'finances') {
    activePage = { id: 'finances', title: 'Contabilidad', icon: 'finances', type: 'finances' };
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
  } else if (activePageId === 'calendar') {
    activePage = { id: 'calendar', title: 'Calendario y Reuniones', icon: 'calendar', type: 'calendar' };
  } else if (activePageId === 'team') {
    activePage = { id: 'team', title: 'Equipo y Roles', icon: 'team', type: 'team' };
  } else if (activePageId === 'general_settings') {
    activePage = { id: 'general_settings', title: 'Ajustes', icon: 'settings', type: 'general_settings' };
  } else if (activePageId === 'billing') {
    activePage = { id: 'billing', title: 'Suscripción', icon: 'credit-card', type: 'billing' };
  } else if (activePageId === 'trash') {
    activePage = { id: 'trash', title: 'Papelera', icon: 'trash', type: 'trash' };
  } else if (activePageId === 'proyectos_general') {
    activePage = { id: 'proyectos_general', title: 'Gestión de Proyectos', icon: 'project', type: 'proyectos_general' };
  } else if (activePageId === 'paginas_general') {
    activePage = { id: 'paginas_general', title: 'Páginas del Espacio', icon: 'file-text', type: 'paginas_general' };
  } else if (activePageId === 'contratar_servicios') {
    activePage = { id: 'contratar_servicios', title: 'Servicios Web Fix', icon: 'rocket', type: 'contratar_servicios' };
  } else if (activePageId === 'soporte_tecnico') {
    activePage = { id: 'soporte_tecnico', title: 'Soporte Técnico', icon: 'life-buoy', type: 'soporte_tecnico' };
  } else {
    activePage = pages.find(p => p.id === activePageId) || { id: 'empty', title: 'Sin páginas', type: 'empty' };
    if (activePage.type === 'project') {
      activePage = { ...activePage, tasks: globalTasks.filter(t => t.projectId === activePage.id) };
    }
  }

  const getModuleHeaderDetails = () => {
    switch (activePageId) {
      case 'dashboard':
        return {
          title: 'Dashboard General ERP',
          desc: 'Control holístico de proyectos, inventario, ventas y cumplimiento tributario SRI',
          icon: 'dashboard'
        };
      case 'finances': {
        const subtabs = {
          dashboard: { title: 'Contabilidad: Dashboard', desc: 'Balance, estado financiero y cumplimiento fiscal en tiempo real' },
          sri: { title: 'Documentos Electrónicos SRI', desc: 'Historial y consulta de validez de comprobantes con el SRI' },
          cobrables: { title: 'Cuentas por Cobrar', desc: 'Seguimiento de cartera y saldos pendientes de clientes' },
          pagables: { title: 'Cuentas por Pagar', desc: 'Control de compromisos de pago y obligaciones con proveedores' },
          gastos: { title: 'Gastos y Créditos', desc: 'Clasificación contable de egresos y líneas de crédito abiertas' },
          reportes: { title: 'Reportes Contables', desc: 'Libro diario, estados de pérdidas y ganancias, y exportación fiscal' }
        };
        const current = subtabs[contabilidadInitialSubTab] || { title: 'ERP Contabilidad y Tributación', desc: 'Control de ingresos/egresos, reportes contables y documentos electrónicos autorizados' };
        return { ...current, icon: 'finances' };
      }
      case 'ventas': {
        if (ventasInitialSubTab.startsWith('pos')) {
          return {
            title: 'Punto de Venta (POS)',
            desc: 'Facturación rápida e intuitiva para tiendas y comercio directo',
            icon: 'ventas'
          };
        }
        const subtabs = {
          resumen_ventas: { title: 'Ventas: Resumen', desc: 'Panel informativo y métricas clave de facturación electrónica' },
          ventas_preventa: { title: 'Facturación / Registrar Venta', desc: 'Genera facturas, notas de venta y comprobantes electrónicos SRI' },
          quotes: { title: 'Cotizaciones y Proformas', desc: 'Emisión y gestión de proformas comerciales para clientes' },
          nota_credito: { title: 'Notas de Crédito', desc: 'Anulaciones y devoluciones tributarias autorizadas por el SRI' },
          retencion: { title: 'Retenciones Recibidas', desc: 'Registro de retenciones de IVA y Renta recibidas de clientes' }
        };
        const current = subtabs[ventasInitialSubTab] || { title: 'Módulo de Ventas y Proformas', desc: 'Punto de Venta (POS), cotizaciones comerciales y facturas de venta autorizadas' };
        return { ...current, icon: 'ventas' };
      }
      case 'inventario': {
        const subtabs = {
          productos: { title: 'Inventario: Productos', desc: 'Catálogo de artículos en stock, precios, imágenes y parametrización de IVA' },
          servicios: { title: 'Inventario: Servicios', desc: 'Catálogo de servicios profesionales, consultorías e intangibles facturables' },
          categorias: { title: 'Inventario: Categorías', desc: 'Clasificación de productos y servicios para reportes y filtros rápidos' }
        };
        const current = subtabs[inventarioInitialSubTab] || { title: 'Módulo de Inventario', desc: 'Catálogo de productos y servicios con parametrización de IVA del SRI' };
        return { ...current, icon: 'inventario' };
      }
      case 'personas': {
        const subtabs = {
          cliente: { title: 'Personas: Clientes', desc: 'Directorio de clientes registrados con validación SRI y base de datos' },
          proveedor: { title: 'Personas: Proveedores', desc: 'Directorio de proveedores registrados, RUC y clasificación comercial' }
        };
        const current = subtabs[personasSubTab] || { title: 'Gestión de Personas', desc: 'Base de datos unificada de clientes y proveedores con validación de datos SRI' };
        return { ...current, icon: 'personas' };
      }
      case 'calendar':
        return {
          title: 'Calendario de Equipo',
          desc: 'Tus reuniones sincronizadas y generación de agendas en la nube',
          icon: 'calendar'
        };
      case 'team':
        return {
          title: 'Directorio del Equipo',
          desc: 'Gestiona roles y cargos para asignarlos a proyectos del espacio',
          icon: 'team'
        };
      case 'compras': {
        const subtabs = {
          compras_resumen: { title: 'Compras: Resumen', desc: 'Análisis y métricas clave de tus egresos y proveedores' },
          compras_sri: { title: 'Facturas Recibidas SRI', desc: 'Sincroniza y concilia facturas emitidas por tus proveedores en el SRI' },
          compras_gastos: { title: 'Gastos con IA', desc: 'Clasificación y registro automático de gastos mediante inteligencia artificial' },
          compras_nc: { title: 'Notas de Crédito Recibidas', desc: 'Registro de devoluciones y descuentos aplicados por tus proveedores' },
          compras_retencion: { title: 'Retenciones Emitidas', desc: 'Genera y autoriza retenciones a tus proveedores autorizadas por el SRI' }
        };
        const current = subtabs[comprasInitialSubTab] || { title: 'Compras y Facturas Recibidas', desc: 'Registro de facturas de proveedores y control de compras electrónicas' };
        return { ...current, icon: 'compras' };
      }
      case 'gastos_creditos': {
        const subtabs = {
          resumen: { title: 'Finanzas: Resumen', desc: 'Visualización consolidada de flujos de caja y estados financieros' },
          gastos: { title: 'Finanzas: Gastos', desc: 'Registro detallado y control de egresos operacionales de la empresa' },
          creditos: { title: 'Finanzas: Cuentas de Crédito', desc: 'Monitoreo de deudas, plazos de pago y líneas de crédito abiertas' }
        };
        const current = subtabs[gastosInitialSubTab] || { title: 'Módulo de Finanzas', desc: 'Control y registro de gastos de la empresa y cuentas de crédito por pagar/cobrar' };
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
      case 'proyectos_general':
        return {
          title: 'Proyectos: Mis Proyectos',
          desc: 'Tableros Kanban, planificación de metas y tareas de tu equipo',
          icon: 'project'
        };
      case 'paginas_general':
        return {
          title: 'Proyectos: Páginas',
          desc: 'Crea, organiza y mejora textos y notas rápidas con inteligencia artificial',
          icon: 'file-text'
        };
      case 'contratar_servicios':
        return {
          title: 'Servicios de Crecimiento Web Fix',
          desc: 'Adquiere y gestiona servicios de diseño, correo corporativo y marketing digital para potenciar tu marca',
          icon: 'rocket'
        };
      case 'soporte_tecnico':
        return {
          title: 'Soporte Técnico Especializado',
          desc: 'Envía tus solicitudes de ayuda técnica y reportes de incidencias directamente a nuestro equipo',
          icon: 'life-buoy'
        };
      case 'billing': {
        const subtabs = {
          facturacion: { title: 'Suscripción: Facturación Electrónica', desc: 'Planes de emisión de comprobantes electrónicos del SRI para tu negocio' },
          paginas: { title: 'Suscripción: Páginas Web', desc: 'Elige o actualiza tu plan de hosting, landing page o tienda en línea' },
          correos: { title: 'Suscripción: Correos Corporativos', desc: 'Administra cuentas de correo empresarial y espacio de almacenamiento' },
          whatsapp: { title: 'Suscripción: WhatsApp CRM', desc: 'Planes de integración para automatización y chat multiagente con WhatsApp' },
          pagos: { title: 'Historial de Pagos', desc: 'Historial de facturas cobradas y estado de tu cuenta SaaS' },
          planes: { title: 'Suscripción: Planes SaaS', desc: 'Catálogo completo de planes y módulos para el crecimiento de tu negocio' }
        };
        const current = subtabs[billingInitialSubTab] || { title: 'Suscripción y Facturación SaaS', desc: 'Gestiona tu plan contratado, revisa tus consumos y reporta tus pagos por transferencia o PayPhone' };
        return { ...current, icon: 'credit-card' };
      }
      default:
        return {
          title: activePage.title || 'Sin título',
          desc: activePage.type === 'project' ? 'Tablero y lista de tareas colaborativas' : 'Documento de texto y notas rápidas',
          icon: activePage.icon || 'file-text'
        };
    }
  };

  const headerDetails = getModuleHeaderDetails();
  
    
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current && activePage.type === 'doc') {
      const scrollPos = window.scrollY;
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = contentRef.current.scrollHeight + 'px';
      window.scrollTo(0, scrollPos);
    }
  }, [activePage?.content, activePageId]);

  const addPage = async () => {
    const newPage = { id: Date.now().toString(), title: 'Nueva página', content: '', icon: 'file-text', type: 'doc' };
    setPages([...pages, newPage]);
    setActivePageId(newPage.id);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pages', newPage.id), newPage);
      showToast('Guardado', 'success');
    } catch (e) { showToast('Error', 'error'); }
  };

  const addProject = async () => {
    const newProject = { id: Date.now().toString(), title: 'Nuevo Proyecto', content: '', icon: 'project', type: 'project', leadId: '', columns: [...DEFAULT_COLUMNS] };
    setPages([...pages, newProject]);
    setActivePageId(newProject.id);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pages', newProject.id), newProject);
      showToast('Guardado', 'success');
    } catch (e) { showToast('Error', 'error'); }
  };

  // --- Lógica de Columnas ---
  const handleAddColumn = async () => {
    if (!newColumnName.trim() || activePage.type !== 'project') return;
    const newCol = { id: `col-${Date.now()}`, title: newColumnName.trim(), color: 'gray' };
    const updatedColumns = [...(activePage.columns || DEFAULT_COLUMNS), newCol];
    updateActivePage({ columns: updatedColumns });
    setNewColumnName('');
  };

  const handleDeleteColumn = async (colId) => {
    if (activePage.type !== 'project') return;
    const updatedColumns = (activePage.columns || []).filter(c => c.id !== colId);
    updateActivePage({ columns: updatedColumns });
    
    // Tareas que estaban en la columna se borran
    const tasksToDelete = globalTasks.filter(t => t.projectId === activePageId && t.status === colId);
    if (tasksToDelete.length > 0) {
      const batch = writeBatch(db);
      tasksToDelete.forEach(t => {
        batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', t.id));
      });
      await batch.commit();
    }
  };

  const cycleColumnColor = (colId) => {
    if (activePage.type !== 'project') return;
    const updatedColumns = (activePage.columns || DEFAULT_COLUMNS).map(col => {
      if (col.id === colId) {
        const currentColorIndex = COLUMN_COLORS.findIndex(c => c.id === (col.color || 'gray'));
        const nextColorIndex = (currentColorIndex + 1) % COLUMN_COLORS.length;
        return { ...col, color: COLUMN_COLORS[nextColorIndex].id };
      }
      return col;
    });
    updateActivePage({ columns: updatedColumns });
  };

  const getColorClass = (colorId) => {
    const color = COLUMN_COLORS.find(c => c.id === colorId) || COLUMN_COLORS[0];
    return color.badge;
  };

  const getColumnBgClass = (colorId, isDark) => {
    const color = COLUMN_COLORS.find(c => c.id === colorId) || COLUMN_COLORS[0];
    return isDark ? color.bgDark : color.bgLight;
  };

  const startEditingColumn = (col) => {
    setEditingColumnId(col.id);
    setEditingColumnTitle(col.title);
  };

  const saveColumnTitle = () => {
    if (editingColumnId && editingColumnTitle.trim()) {
      const updatedColumns = (activePage.columns || DEFAULT_COLUMNS).map(col =>
        col.id === editingColumnId ? { ...col, title: editingColumnTitle.trim() } : col
      );
      updateActivePage({ columns: updatedColumns });
    }
    setEditingColumnId(null);
  };

  const startEditingTask = (e, task) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditingTaskContent(task.content);
  };

  const saveTaskContent = async () => {
    if (editingTaskId && editingTaskContent.trim()) {
      setGlobalTasks(globalTasks.map(t =>
        t.id === editingTaskId ? { ...t, content: editingTaskContent.trim() } : t
      ));
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', editingTaskId), { content: editingTaskContent.trim() }, { merge: true });
      } catch (e) { console.error('Error saveTaskContent:', e); showToast('Error al guardar', 'error'); }
    }
    setEditingTaskId(null);
  };

  // --- Lógica de Drag & Drop (@dnd-kit) ---
  const [activeDragTask, setActiveDragTask] = useState(null);
  const [activeDragCol, setActiveDragCol] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'Column') {
      setActiveDragCol(active.data.current.column);
      return;
    }
    if (active.data.current?.type === 'Task') {
      setActiveDragTask(active.data.current.task);
      return;
    }
  };

  const onDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    // Actualización local para la transición suave de UI
    setGlobalTasks((prevTasks) => {
      const activeIndex = prevTasks.findIndex(t => t.id === activeId);
      if (activeIndex === -1) return prevTasks;
      
      let newStatus = prevTasks[activeIndex].status;
      let overIndex = -1;
      
      if (isOverColumn) {
        newStatus = overId;
      } else if (isOverTask) {
        const overTask = over.data.current.task;
        newStatus = overTask.status;
        overIndex = prevTasks.findIndex(t => t.id === overId);
      }
      
      if (prevTasks[activeIndex].status === newStatus) {
        return prevTasks; // Mismo status, onDragEnd lo maneja
      }

      // Si cambia de status, movemos el elemento en el array local optimísticamente
      const newTasks = [...prevTasks];
      const activeTask = { ...newTasks[activeIndex], status: newStatus };
      newTasks.splice(activeIndex, 1);
      
      if (overIndex >= 0) {
        const insertIndex = newTasks.findIndex(t => t.id === overId);
        newTasks.splice(insertIndex, 0, activeTask);
      } else {
        newTasks.push(activeTask);
      }
      
      return newTasks;
    });
  };

  const onDragEnd = async (event) => {
    setActiveDragTask(null);
    setActiveDragCol(null);
    
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const isActiveColumn = active.data.current?.type === 'Column';
    const isActiveTask = active.data.current?.type === 'Task';

    if (isActiveColumn) {
      if (activeId === overId) return;
      const newCols = [...(activePage.columns || DEFAULT_COLUMNS)];
      const draggedIdx = newCols.findIndex(c => c.id === activeId);
      const targetIdx = newCols.findIndex(c => c.id === overId);
      if (draggedIdx > -1 && targetIdx > -1) {
        updateActivePage({ columns: arrayMove(newCols, draggedIdx, targetIdx) });
      }
    } else if (isActiveTask) {
      // Reordenamiento y asignación final de status
      const task = globalTasks.find(t => t.id === activeId);
      if (!task) return;
      
      const currentStatus = task.status;
      // IMPORTANTE: Asegurar que columnTasks esté bien ordenado localmente antes de reordenar
      const columnTasks = globalTasks.filter(t => t.status === currentStatus && t.projectId === activePage.id).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const oldIndex = columnTasks.findIndex(t => t.id === activeId);
      const newIndex = columnTasks.findIndex(t => t.id === overId);
      
      let reordered = columnTasks;
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reordered = arrayMove(columnTasks, oldIndex, newIndex);
      }
      
      // Asignar nuevos valores de 'order'
      const updatedTasks = reordered.map((t, i) => ({ ...t, order: i }));
      
      // Actualizar estado local definitivamente con el orden correcto
      setGlobalTasks(prevTasks => {
        const otherTasks = prevTasks.filter(t => t.status !== currentStatus || t.projectId !== activePage.id);
        return [...otherTasks, ...updatedTasks];
      });

      // Guardar en Firebase una sola vez por lote
      try {
        const batch = writeBatch(db);
        updatedTasks.forEach((t) => {
          batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', t.id), { status: t.status, order: t.order }, { merge: true });
        });
        await batch.commit();
      } catch(e) { console.error("Error persistiendo orden:", e); }
    }
  };

  // --- Lógica de Tareas y Calendario (Corregida) ---
  const openNewTaskDrawer = (defaultStatus = 'todo') => {
    const projects = pages.filter(p => p.type === 'project');
    const defaultProjectId = activePage.type === 'project' ? activePage.id : (projects.length > 0 ? projects[0].id : null);
    
    if (!defaultProjectId) {
      alert("Crea un proyecto primero para poder asignar tareas.");
      return;
    }

    setDrawerTask({
      id: Date.now().toString(),
      content: '',
      status: defaultStatus,
      projectId: defaultProjectId,
      assigneeId: '',
      description: '',
      meetLink: '',
      notes: [],
      subtasks: [],
      timeSpent: 0
    });
  };

  const saveDrawerTask = async () => {
    if (!drawerTask || !drawerTask.content.trim()) return;
    const isNew = !globalTasks.some(t => t.id === drawerTask.id);
    
    // Optimistic Update
    if (isNew) {
      setGlobalTasks([...globalTasks, drawerTask]);
    } else {
      setGlobalTasks(globalTasks.map(t => t.id === drawerTask.id ? drawerTask : t));
    }
    
    setDrawerTask(null);

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', drawerTask.id), drawerTask);
      showToast('Tarea guardada', 'success');
    } catch (e) { showToast('Error', 'error'); }
  };

  const convertEventToTask = async (event) => {
    const projects = pages.filter(p => p.type === 'project');
    if (projects.length === 0) {
      alert("Crea un proyecto primero para poder convertir el evento en tarea.");
      return;
    }
    const targetProject = projects[0];
    const newTask = {
      id: Date.now().toString(),
      content: `Reunión: ${event.title}`,
      status: 'todo',
      projectId: targetProject.id,
      assigneeId: '',
      description: `Tarea generada desde el evento del calendario.\nHora: ${event.time} - ${event.date}`,
      meetLink: event.meetLink,
      notes: [],
      subtasks: [],
      timeSpent: 0
    };
    
    setGlobalTasks([...globalTasks, newTask]);
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', newTask.id), newTask);
      alert(`¡Evento convertido! Tarea añadida al proyecto: "${targetProject.title}"`);
    } catch (e) { showToast('Error al guardar', 'error'); }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    setGlobalTasks(globalTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), { status: newStatus }, { merge: true });
    } catch (e) { console.error('Error updateTaskStatus:', e); showToast('Error', 'error'); }
  };

  const handleDeleteTask = async (taskId) => {
    setGlobalTasks(globalTasks.filter(t => t.id !== taskId));
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId));
      showToast('Tarea eliminada', 'success');
    } catch (e) { showToast('Error', 'error'); }
  };

  const handleDeleteTaskFromDrawer = () => {
    if (drawerTask && drawerTask.id) {
      handleDeleteTask(drawerTask.id);
      setDrawerTask(null);
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

  const addQuickNote = () => {
    if (!quickNoteText.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      text: quickNoteText.trim(),
      date: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
    };
    setDrawerTask(prev => ({ ...prev, notes: [...(prev.notes || []), newNote] }));
    setQuickNoteText('');
  };

  const addSubtask = () => {
    if (!newSubtaskText.trim()) return;
    setDrawerTask(prev => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), { id: Date.now().toString(), text: newSubtaskText.trim(), completed: false }]
    }));
    setNewSubtaskText('');
  };

  const toggleSubtask = (id) => {
    setDrawerTask(prev => ({
      ...prev,
      subtasks: (prev.subtasks || []).map(st => st.id === id ? { ...st, completed: !st.completed } : st)
    }));
  };

  const removeSubtask = (id) => {
    setDrawerTask(prev => ({
      ...prev,
      subtasks: (prev.subtasks || []).filter(st => st.id !== id)
    }));
  };

  const toggleTimer = () => {
    if (isTimerRunning && activeTimerTaskId === drawerTask.id) {
      setIsTimerRunning(false);
      setDrawerTask(prev => ({ ...prev, timeSpent: (prev.timeSpent || 0) + elapsedTime }));
      setActiveTimerTaskId(null);
      setElapsedTime(0);
    } else {
      if (isTimerRunning) {
        alert("Ya hay un temporizador corriendo en otra tarea. Detenlo primero.");
        return;
      }
      setIsTimerRunning(true);
      setActiveTimerTaskId(drawerTask.id);
      setElapsedTime(0);
    }
  };


  // --- Lógica del Sistema Base ---
  
  const deletePage = async (id, e) => {
    if (e) e.stopPropagation();
    const pageToDelete = pages.find(p => p.id === id);
    if (!pageToDelete) return;
    
    const newTrash = [...trash, pageToDelete];
    setTrash(newTrash);
    setPages(pages.filter(p => p.id !== id));
    
    if (activePageId === id) {
      if (pageToDelete.type === 'project') {
        setActivePageId('proyectos_general');
      } else if (pageToDelete.type === 'doc') {
        setActivePageId('paginas_general');
      } else {
        setActivePageId(pages.filter(p => p.id !== id).length > 0 ? pages.filter(p => p.id !== id)[0].id : 'trash');
      }
    }
    
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'pages', id));
      batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info'), { trash: newTrash }, { merge: true });
      await batch.commit();
      showToast('Enviado a papelera', 'success');
    } catch (e) { console.error('Error deletePage:', e); showToast('Error', 'error'); }
  };

  const restorePage = async (id) => {
    const pageToRestore = trash.find(p => p.id === id);
    if (!pageToRestore) return;
    const newPages = [...pages, pageToRestore];
    const newTrash = trash.filter(p => p.id !== id);
    setPages(newPages);
    setTrash(newTrash);
    setActivePageId(id);
    
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'pages', id), pageToRestore);
      batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info'), { trash: newTrash }, { merge: true });
      await batch.commit();
      showToast('Restaurado', 'success');
    } catch (e) { console.error('Error restorePage:', e); showToast('Error', 'error'); }
  };

  const permanentlyDeletePage = async (id) => {
    const newTrash = trash.filter(p => p.id !== id);
    setTrash(newTrash);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info'), { trash: newTrash }, { merge: true });
      showToast('Eliminado', 'success');
    } catch (e) { console.error('Error permanentlyDelete:', e); showToast('Error', 'error'); }
  };
  
  const updateActivePage = async (updates, silent = true) => {
    setPages(pages.map(p => p.id === activePageId ? { ...p, ...updates } : p));
    try {
      if (!silent) setIsSaving(true);
      // Usamos setDoc con merge para que funcione incluso si el doc no existe aún
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pages', activePageId), updates, { merge: true });
      if (!silent) { setIsSaving(false); showToast('Guardado', 'success'); }
    } catch (e) { 
      console.error('Error updateActivePage:', e);
      setIsSaving(false);
      showToast('Error al guardar', 'error');
    }
  };

  // --- FUNCIONES REALES DE GOOGLE CALENDAR & MEET ---

  const fetchRealEvents = async (token) => {
    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 7); // Traer próximos 7 días

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.items) {
        const formattedEvents = data.items.map(item => ({
          id: item.id,
          title: item.summary || 'Reunión sin título',
          time: new Date(item.start.dateTime || item.start.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          date: new Date(item.start.dateTime || item.start.date).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }),
          meetLink: item.hangoutLink || (item.conferenceData?.entryPoints?.[0]?.uri) || '',
          color: 'bg-primary/20 text-primary'
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error("Error al obtener eventos de Google:", error);
    }
  };

  const handleConnectGoogle = () => {
    if (!googleClientId || googleClientId.trim() === '') {
      setActivePageId('general_settings');
      return;
    }

    setIsConnecting(true);
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId.trim(),
        scope: GOOGLE_CALENDAR_SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            setGoogleAccessToken(tokenResponse.access_token);
            setIsGoogleConnected(true);
            fetchRealEvents(tokenResponse.access_token);
          }
          setIsConnecting(false);
        },
        error_callback: (error) => {
          console.error("Error OAuth Google:", error);
          alert("Cancelado o error al conectar con Google.");
          setIsConnecting(false);
        }
      });
      client.requestAccessToken();
    } catch (error) {
      console.error(error);
      setIsConnecting(false);
      alert("Error al cargar la librería de Google.");
    }
  };

  const handleDisconnectGoogle = () => { 
    setIsGoogleConnected(false); 
    setGoogleAccessToken(null);
    setEvents([]); 
  };

  const createRealInstantMeet = async () => {
    if (!googleAccessToken) {
      alert("Primero debes conectar tu cuenta de Google Calendar.");
      return null;
    }

    try {
      const eventInfo = {
        summary: 'Reunión Instantánea (Desde App Agencia)',
        description: 'Reunión generada automáticamente desde el gestor de tareas.',
        start: { dateTime: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        conferenceData: {
          createRequest: {
            requestId: Math.random().toString(36).substring(7),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventInfo)
      });

      const data = await response.json();
      
      if (data.hangoutLink) {
        fetchRealEvents(googleAccessToken); // Actualizar lista
        return data.hangoutLink;
      }
    } catch (error) {
      console.error("Error creando Meet:", error);
      alert("Error al intentar crear el enlace de Google Meet.");
    }
    return null;
  };

  const handleGenerateMeetForTask = async () => {
    const meetLink = await createRealInstantMeet();
    if (meetLink) {
      setDrawerTask(p => ({...p, meetLink: meetLink}));
    }
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
      pages,
      tasks: globalTasks,
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

  const exportToCSV = () => {
    const pList = pages.filter(p => p.type === 'project');
    let tasksToExport = globalTasks;
    
    if (reportFilters.projectId !== 'all') tasksToExport = tasksToExport.filter(t => t.projectId === reportFilters.projectId);
    if (reportFilters.status !== 'all') tasksToExport = tasksToExport.filter(t => t.status === reportFilters.status);
    if (reportFilters.assigneeId !== 'all') tasksToExport = tasksToExport.filter(t => t.assigneeId === reportFilters.assigneeId);

    const csvHeader = "ID,Tarea,Estado,Proyecto,Asignado,Fecha Inicio,Fecha Limite,Meet\n";
    const csvRows = tasksToExport.map(t => {
      const project = pList.find(p => p.id === t.projectId)?.title || 'N/A';
      const user = users.find(u => u.id === t.assigneeId)?.name || 'Sin asignar';
      const statusTitle = DEFAULT_COLUMNS.find(c => c.id === t.status)?.title || t.status;
      return `"${t.id}","${t.content.replace(/"/g, '""')}","${statusTitle}","${project}","${user}","${t.startDate||''}","${t.dueDate||''}","${t.meetLink||''}"`;
    }).join("\n");

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Tareas_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsReportDrawerOpen(false);
  };

  // --- Funciones IA ---
  const callGeminiAPI = async (prompt) => {
    setIsGeneratingAI(true);
    let retries = 5; let delay = 1000;
    while (retries > 0) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        setIsGeneratingAI(false); return text;
      } catch (error) {
        retries--;
        if (retries === 0) { setIsGeneratingAI(false); return "❌ Error: No se pudo conectar con la IA después de varios intentos."; }
        await new Promise(res => setTimeout(res, delay)); delay *= 2;
      }
    }
  };

  const handleAiAction = async (actionType) => {
    if (!activePage.content?.trim()) return;
    let prompt = "";
    if (actionType === 'summarize') prompt = `Resume el siguiente texto en viñetas de forma concisa y clara:\n\n${activePage.content}`;
    if (actionType === 'improve') prompt = `Mejora la redacción, claridad, tono y ortografía del siguiente texto. Devuelve ÚNICAMENTE el texto mejorado, sin introducciones:\n\n${activePage.content}`;
    if (actionType === 'continue') prompt = `Continúa escribiendo el siguiente texto de forma coherente, manteniendo el mismo contexto y tono:\n\n${activePage.content}`;

    const result = await callGeminiAPI(prompt);
    if (result && !result.includes("❌ Error")) {
      if (actionType === 'continue') updateActivePage({ content: activePage.content + '\n' + result });
      else updateActivePage({ content: activePage.content + '\n\n---\n✨ ' + (actionType === 'summarize' ? '**Resumen IA:**\n' : '**Mejora IA:**\n') + result });
    } else if (result) updateActivePage({ content: activePage.content + '\n\n' + result });
  };

  const generateMeetingAgenda = async (event) => {
    const prompt = `Actúa como un asistente ejecutivo. Genera una agenda de reunión bien estructurada para un evento titulado "${event.title}". Incluye: 1. Objetivos de la reunión, 2. Puntos clave a discutir, 3. Espacio en blanco para notas y 4. Siguientes pasos (Action items). Mantenlo profesional y en español. Devuelve el resultado en formato de texto claro.`;
    const result = await callGeminiAPI(prompt);
    if (result) {
      const newPage = { id: Date.now().toString(), title: `Agenda: ${event.title}`, content: result, icon: 'file-text', type: 'doc' };
      setPages([...pages, newPage]); setActivePageId(newPage.id);
    }
  };

  const generateDashboardReport = async () => {
    setIsGeneratingReport(true);
    const projectData = projectsList.map(p => ({
      title: p.title,
      tasks: globalTasks.filter(t => t.projectId === p.id).map(t => `[${t.status}] ${t.content}`).join(', ')
    }));
    const prompt = `Actúa como un Director de Operaciones de una agencia de diseño y desarrollo web. Analiza el siguiente estado de los proyectos y tareas del equipo: ${JSON.stringify(projectData)}. Escribe un resumen ejecutivo y motivacional de máximo 3 párrafos en español destacando: 1. El progreso general. 2. Posibles riesgos o cuellos de botella. 3. Una recomendación clave para el equipo.`;
    const result = await callGeminiAPI(prompt);
    if (result && !result.includes("❌ Error")) {
      setDashboardReport(result);
    }
    setIsGeneratingReport(false);
  };

  const generateTaskPlan = async () => {
    if (!drawerTask || !drawerTask.content) return;
    const prompt = `Actúa como un Tech Lead o Senior Designer. Crea un checklist paso a paso para resolver de forma experta la siguiente tarea: "${drawerTask.content}". Devuelve solo los pasos, como una lista simple (cada línea empezando con un guión o asterisco). Máximo 5 pasos concisos. No agregues introducciones ni conclusiones.`;
    const result = await callGeminiAPI(prompt);
    if (result && !result.includes("❌ Error")) {
       const newSubtasks = result
         .split('\n')
         .map(line => line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
         .filter(line => line.length > 0)
         .map(text => ({
           id: Math.random().toString(36).substring(2, 11),
           text: text.replace(/\*\*/g, ''), // quitar negritas de markdown si hay
           completed: false
         }));
       
       setDrawerTask(prev => ({
         ...prev,
         subtasks: [...(prev.subtasks || []), ...newSubtasks]
       }));
    }
  };

  const handleCreateInstantMeetUI = async () => {
    const link = await createRealInstantMeet();
    if (link) window.open(link, '_blank');
  };

  const projectsList = pages.filter(p => p.type === 'project');
  const allTasksGlobal = globalTasks;

  const currentGlassPanel = isDarkMode ? glassPanelDark : glassPanelLight;

  const currentGlassInput = isDarkMode ? glassInputDark : glassInputLight;

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
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#08080a] text-gray-100 font-sans p-6 z-[9999] relative overflow-hidden">
        {/* Background decorative blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-red-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-orange-600/10 rounded-full blur-3xl animate-pulse"></div>

        <div className="w-full max-w-md p-8 rounded-[2.5rem] bg-[#1a1a1a]/80 border border-red-500/20 shadow-[0_20px_50px_rgba(239,68,68,0.15)] flex flex-col text-center backdrop-blur-md">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <CloudOff size={32} className="animate-bounce" />
            </div>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight mb-3 text-white">Error de Sincronización</h2>
          <p className="text-sm font-medium text-gray-400 mb-6 leading-relaxed">
            Se ha perdido la sincronización con la base de datos centralizada. Por seguridad y para evitar pérdida de información, se cerró el sistema.
          </p>
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-xs font-semibold text-red-400 mb-8 leading-normal">
            Por favor, verifica tu conexión a internet o comunícate con tu soporte técnico oficial.
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('db_sync_error');
              setDbSyncError(false);
              window.location.reload();
            }}
            className="w-full py-3.5 rounded-xl text-xs font-bold tracking-wider uppercase bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-950/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  // --- DETECTAR MÓDULOS BLOQUEADOS O SUSPENDIDOS ---
  const isPageGated = ['finances', 'compras', 'gastos_creditos', 'inventario', 'calendar', 'team', 'proyectos_general', 'paginas_general'].includes(activePageId) || activePage?.type === 'project' || activePage?.type === 'doc';
  
  const isModuleLocked = (() => {
    if (!isPageGated) return false;
    if (activePageId === 'proyectos_general' || activePage?.type === 'project' || activePage?.type === 'doc') {
      return !activeModules.proyectos_general;
    }
    if (activePageId === 'team') {
      return !activeModules.team;
    }
    return !activeModules[activePageId];
  })();

  const isPersonasActive = activePageId === 'personas' || activePageId === 'team';
  const isProyectosActive = activePageId === 'proyectos_general' || activePageId === 'paginas_general' || activePageId === 'calendar' || activePage?.type === 'project' || activePage?.type === 'doc';

  return (
    <Routes>
      <Route element={<LandingLayout />}>
        <Route path="/" element={<LandingHome />} />
        <Route path="/soluciones" element={<LandingFeatures />} />
        <Route path="/precios" element={<LandingPricing />} />
        <Route path="/nosotros" element={<LandingAbout />} />
        <Route path="/contacto" element={<LandingContact />} />
      </Route>
      <Route path="/login" element={<LoginPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} showToast={showToast} companyProfile={companyProfile} />} />
      <Route path="/register" element={<RegisterPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} showToast={showToast} />} />
      <Route path="/superadmin" element={<SuperAdminPage showToast={showToast} />} />
      <Route path="/app/*" element={
        <div className={`flex h-screen w-full font-sans overflow-hidden transition-colors duration-500 relative z-0 ${isDarkMode ? 'bg-[#08080a] text-gray-100' : 'bg-[#f4f4f9] text-gray-800'}`}>
      
      {/* GLOBAL BACKGROUND BLOBS (Glassmorphism Core) */}
      <div className={`absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full mix-blend-screen filter blur-[120px] opacity-40 pointer-events-none -z-10 ${isDarkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
      <div className={`absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none -z-10 ${isDarkMode ? 'bg-primary' : 'bg-primary'}`}></div>
      <div className={`absolute bottom-[-10%] left-[20%] w-[40rem] h-[40rem] rounded-full mix-blend-screen filter blur-[120px] opacity-30 pointer-events-none -z-10 ${isDarkMode ? 'bg-emerald-900' : 'bg-emerald-300'}`}></div>

      {/* Sidebar Overlay on Mobile */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <div className={`flex flex-col border-r transition-all duration-300 z-50 backdrop-blur-3xl absolute md:relative h-full ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-0 hidden md:flex md:w-16'} ${isDarkMode ? 'bg-[#0f0f11]/95 border-white/5' : 'bg-white/95 border-primary/10'}`}>
        
        {/* Logo Header */}
        <div className={`h-16 flex items-center ${isSidebarOpen ? 'justify-between px-5' : 'justify-center'} border-b ${isDarkMode ? 'border-white/5' : 'border-black/5'} mb-2 shrink-0 overflow-hidden`}>
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              {companyProfile?.logoUrl ? (
                <img src={companyProfile.logoUrl} alt="Logo" className="max-h-9 object-contain" />
              ) : (
                <span className="text-sm font-black uppercase tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                  {companyProfile?.nombreComercial || companyProfile?.razonSocial || 'WebFix ERP'}
                </span>
              )}
            </div>
          ) : (
            companyProfile?.logoUrl ? (
              <img src={companyProfile.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isDarkMode ? 'bg-white/10 text-white' : 'bg-primary text-white shadow-sm'}`}>
                {String(companyProfile?.nombreComercial || companyProfile?.razonSocial || 'W').charAt(0).toUpperCase()}
              </div>
            )
          )}
        </div>

        {/* Main Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1.5 py-2 custom-scrollbar text-xs md:text-sm">
          {/* 1. Mi espacio */}
          <button 
            onClick={() => { setActivePageId('dashboard'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} 
            className={`group flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
              activePageId === 'dashboard'
                ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
                : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
            }`}
          >
            <LayoutDashboard 
              size={18} 
              className={`transition-colors ${
                activePageId === 'dashboard' 
                  ? 'text-primary' 
                  : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
              }`} 
            />
            {isSidebarOpen && <span>Mi espacio</span>}
          </button>

          {/* 2. Ventas */}
          {activeModules.ventas && (
            <div className="space-y-1">
              <button 
                onClick={() => {
                  setExpandedSidebarMenu(expandedSidebarMenu === 'ventas' ? null : 'ventas');
                  setVentasInitialSubTab('resumen_ventas');
                  setActivePageId('ventas');
                }} 
                className={`group flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
                  activePageId === 'ventas'
                    ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
                    : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart 
                    size={18} 
                    className={`transition-colors ${
                      activePageId === 'ventas' 
                        ? 'text-primary' 
                        : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
                    }`} 
                  />
                  {isSidebarOpen && <span>Ventas</span>}
                </div>
                {isSidebarOpen && (
                  <ChevronDown 
                    size={14} 
                    className={`transition-transform duration-250 ${expandedSidebarMenu === 'ventas' ? 'rotate-180' : ''}`} 
                  />
                )}
              </button>
              
              {isSidebarOpen && expandedSidebarMenu === 'ventas' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[
                    { id: 'resumen_ventas', label: 'Resumen' },
                    { id: 'ventas_preventa', label: 'Facturación / Vender' },
                    { id: 'pos', label: 'Punto de Venta (POS)' },
                    { id: 'quotes', label: 'Cotizaciones / Proformas' },
                    { id: 'nota_credito', label: 'Notas de Crédito' },
                    { id: 'retencion', label: 'Retenciones Recibidas' }
                  ].map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => { 
                        setVentasInitialSubTab(sub.id); 
                        setActivePageId('ventas'); 
                        if(window.innerWidth < 768) setIsSidebarOpen(false); 
                      }}
                      className="block w-full text-left py-1.5 px-2 text-xs font-bold text-black dark:text-white bg-transparent"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Compras */}
          {activeModules.compras && (
            <div className="space-y-1">
              <button 
                onClick={() => {
                  setExpandedSidebarMenu(expandedSidebarMenu === 'compras' ? null : 'compras');
                  setComprasInitialSubTab('compras_resumen');
                  setActivePageId('compras');
                }} 
                className={`group flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
                  activePageId === 'compras'
                    ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
                    : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag 
                    size={18} 
                    className={`transition-colors ${
                      activePageId === 'compras' 
                        ? 'text-primary' 
                        : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
                    }`} 
                  />
                  {isSidebarOpen && <span>Compras</span>}
                </div>
                {isSidebarOpen && (
                  <ChevronDown 
                    size={14} 
                    className={`transition-transform duration-250 ${expandedSidebarMenu === 'compras' ? 'rotate-180' : ''}`} 
                  />
                )}
              </button>
              
              {isSidebarOpen && expandedSidebarMenu === 'compras' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[
                    { id: 'compras_resumen', label: 'Resumen' },
                    { id: 'compras_sri', label: 'Facturas Recibidas SRI' },
                    { id: 'compras_gastos', label: 'Gastos con IA' },
                    { id: 'compras_nc', label: 'Notas de Crédito' },
                    { id: 'compras_retencion', label: 'Retenciones Emitidas' }
                  ].map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => { 
                        setComprasInitialSubTab(sub.id); 
                        setActivePageId('compras'); 
                        if(window.innerWidth < 768) setIsSidebarOpen(false); 
                      }}
                      className="block w-full text-left py-1.5 px-2 text-xs font-bold text-black dark:text-white bg-transparent"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Finanzas (Gastos y Créditos) */}
          {activeModules.gastos_creditos && (
            <div className="space-y-1">
              <button 
                onClick={() => {
                  setExpandedSidebarMenu(expandedSidebarMenu === 'gastos_creditos' ? null : 'gastos_creditos');
                  setGastosInitialSubTab('resumen');
                  setActivePageId('gastos_creditos');
                }} 
                className={`group flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
                  activePageId === 'gastos_creditos'
                    ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
                    : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard 
                    size={18} 
                    className={`transition-colors ${
                      activePageId === 'gastos_creditos' 
                        ? 'text-primary' 
                        : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
                    }`} 
                  />
                  {isSidebarOpen && <span>Finanzas</span>}
                </div>
                {isSidebarOpen && (
                  <ChevronDown 
                    size={14} 
                    className={`transition-transform duration-250 ${expandedSidebarMenu === 'gastos_creditos' ? 'rotate-180' : ''}`} 
                  />
                )}
              </button>
              
              {isSidebarOpen && expandedSidebarMenu === 'gastos_creditos' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[
                    { id: 'resumen', label: 'Resumen Financiero' },
                    { id: 'pasivos', label: 'Pasivos y Financiamiento' },
                    { id: 'historial_gastos', label: 'Historial de Egresos' }
                  ].map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => { 
                        setGastosInitialSubTab(sub.id); 
                        setActivePageId('gastos_creditos'); 
                        if(window.innerWidth < 768) setIsSidebarOpen(false); 
                      }}
                      className="block w-full text-left py-1.5 px-2 text-xs font-bold text-black dark:text-white bg-transparent"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. Inventarios */}
          {activeModules.inventario && (
            <div className="space-y-1">
              <button 
                onClick={() => {
                  setExpandedSidebarMenu(expandedSidebarMenu === 'inventario' ? null : 'inventario');
                  setInventarioInitialSubTab('productos');
                  setActivePageId('inventario');
                }} 
                className={`group flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
                  activePageId === 'inventario'
                    ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
                    : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package 
                    size={18} 
                    className={`transition-colors ${
                      activePageId === 'inventario' 
                        ? 'text-primary' 
                        : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
                    }`} 
                  />
                  {isSidebarOpen && <span>Inventarios</span>}
                </div>
                {isSidebarOpen && (
                  <ChevronDown 
                    size={14} 
                    className={`transition-transform duration-250 ${expandedSidebarMenu === 'inventario' ? 'rotate-180' : ''}`} 
                  />
                )}
              </button>
              
              {isSidebarOpen && expandedSidebarMenu === 'inventario' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[
                    { id: 'productos', label: 'Catálogo de Productos' },
                    { id: 'categorias', label: 'Categorías y Marcas' },
                    { id: 'kardex', label: 'Movimientos Kardex' },
                    { id: 'transferencias', label: 'Transferencias' },
                    { id: 'ajustes', label: 'Ajustes de Inventario' }
                  ].map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => { 
                        setInventarioInitialSubTab(sub.id); 
                        setActivePageId('inventario'); 
                        if(window.innerWidth < 768) setIsSidebarOpen(false); 
                      }}
                      className="block w-full text-left py-1.5 px-2 text-xs font-bold text-black dark:text-white bg-transparent"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. Contabilidad */}
          {activeModules.finances && (
            <div className="space-y-1">
              <button 
                onClick={() => {
                  setExpandedSidebarMenu(expandedSidebarMenu === 'finances' ? null : 'finances');
                  setContabilidadInitialSubTab('dashboard');
                  setActivePageId('finances');
                }} 
                className={`group flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
                  activePageId === 'finances'
                    ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
                    : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
                }`}
              >
                <div className="flex items-center gap-3">
                  <DollarSign 
                    size={18} 
                    className={`transition-colors ${
                      activePageId === 'finances' 
                        ? 'text-primary' 
                        : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
                    }`} 
                  />
                  {isSidebarOpen && <span>Contabilidad</span>}
                </div>
                {isSidebarOpen && (
                  <ChevronDown 
                    size={14} 
                    className={`transition-transform duration-250 ${expandedSidebarMenu === 'finances' ? 'rotate-180' : ''}`} 
                  />
                )}
              </button>
              
              {isSidebarOpen && expandedSidebarMenu === 'finances' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[
                    { id: 'dashboard', label: 'Resumen' },
                    { id: 'sri_docs', label: 'Documentos SRI' },
                    { id: 'cxc', label: 'Cuentas por Cobrar' },
                    { id: 'cxp', label: 'Cuentas por Pagar' },
                    { id: 'gastos_creditos_sub', label: 'Gastos y Créditos' },
                    { id: 'reports', label: 'Reportes Financieros' }
                  ].map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => { 
                        setContabilidadInitialSubTab(sub.id); 
                        setActivePageId('finances'); 
                        if(window.innerWidth < 768) setIsSidebarOpen(false); 
                      }}
                      className="block w-full text-left py-1.5 px-2 text-xs font-bold text-black dark:text-white bg-transparent"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. Personas */}
          {activeModules.personas && (
            <div className="space-y-1">
              <button 
                onClick={() => {
                  setExpandedSidebarMenu(expandedSidebarMenu === 'personas_menu' ? null : 'personas_menu');
                  setPersonasSubTab('cliente');
                  setActivePageId('personas');
                }} 
                className={`group flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
                  activePageId === 'personas' || activePageId === 'team'
                    ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
                    : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users 
                    size={18} 
                    className={`transition-colors ${
                      activePageId === 'personas' || activePageId === 'team'
                        ? 'text-primary' 
                        : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
                    }`} 
                  />
                  {isSidebarOpen && <span>Personas</span>}
                </div>
                {isSidebarOpen && (
                  <ChevronDown 
                    size={14} 
                    className={`transition-transform duration-250 ${expandedSidebarMenu === 'personas_menu' ? 'rotate-180' : ''}`} 
                  />
                )}
              </button>
              
              {isSidebarOpen && expandedSidebarMenu === 'personas_menu' && (
                <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                  {[
                    { id: 'cliente', label: 'Clientes' },
                    { id: 'proveedor', label: 'Proveedores' },
                    { id: 'team', label: 'Equipo' }
                  ].map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => { 
                        if (sub.id === 'team') {
                          setActivePageId('team');
                        } else {
                          setActivePageId('personas');
                          setPersonasSubTab(sub.id);
                        }
                        if(window.innerWidth < 768) setIsSidebarOpen(false); 
                      }}
                      className="block w-full text-left py-1.5 px-2 text-xs font-bold text-black dark:text-white bg-transparent"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 8. Proyectos */}
          <div className="space-y-1">
            <button 
              onClick={() => {
                setExpandedSidebarMenu(expandedSidebarMenu === 'proyectos_menu' ? null : 'proyectos_menu');
                setActivePageId('proyectos_general');
              }} 
              className={`group flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
                isProyectosActive
                  ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
                  : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase 
                  size={18} 
                  className={`transition-colors ${
                    isProyectosActive 
                      ? 'text-primary' 
                      : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
                  }`} 
                />
                {isSidebarOpen && <span>Proyectos</span>}
              </div>
              {isSidebarOpen && (
                <ChevronDown 
                  size={14} 
                  className={`transition-transform duration-250 ${expandedSidebarMenu === 'proyectos_menu' ? 'rotate-180' : ''}`} 
                />
              )}
            </button>
            
            {isSidebarOpen && expandedSidebarMenu === 'proyectos_menu' && (
              <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                {[
                  { id: 'proyectos_general', label: 'Mis Proyectos' },
                  { id: 'paginas_general', label: 'Paginas' },
                  { id: 'calendar', label: 'Calendario' }
                ].map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => { 
                      setActivePageId(sub.id); 
                      if(window.innerWidth < 768) setIsSidebarOpen(false); 
                    }}
                    className="block w-full text-left py-1.5 px-2 text-xs font-bold text-black dark:text-white bg-transparent"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 9. Ajustes */}
          <button 
            onClick={() => { setActivePageId('general_settings'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} 
            className={`group flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
              activePageId === 'general_settings'
                ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-950')
                : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
            }`}
          >
            <Settings 
              size={18} 
              className={`transition-colors ${
                activePageId === 'general_settings' 
                  ? 'text-primary' 
                  : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
              }`} 
            />
            {isSidebarOpen && <span>Ajustes</span>}
          </button>

          {/* 10. Suscripción y Pago */}
          <div className="space-y-1">
            <button 
              onClick={() => {
                setExpandedSidebarMenu(expandedSidebarMenu === 'billing' ? null : 'billing');
                setBillingInitialSubTab('planes');
                setActivePageId('billing');
              }} 
              className={`group flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl transition-all font-medium ${
                activePageId === 'billing'
                  ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm' : 'bg-primary-light text-gray-900')
                  : (isDarkMode ? 'text-gray-400 hover:bg-primary/15 hover:text-white' : 'text-black hover:bg-primary-light hover:text-black')
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard 
                  size={18} 
                  className={`transition-colors ${
                    activePageId === 'billing' 
                      ? 'text-primary' 
                      : (isDarkMode ? 'text-gray-500 group-hover:text-primary' : 'text-black group-hover:text-primary')
                  }`} 
                />
                {isSidebarOpen && <span>Suscripción</span>}
              </div>
              {isSidebarOpen && (
                <ChevronDown 
                  size={14} 
                  className={`transition-transform duration-250 ${expandedSidebarMenu === 'billing' ? 'rotate-180' : ''}`} 
                />
              )}
            </button>
            
            {isSidebarOpen && expandedSidebarMenu === 'billing' && (
              <div className="pl-9 pr-2 space-y-1 border-l border-gray-200 dark:border-white/5 ml-5 mt-1 select-none animate-in slide-in-from-top-1 duration-200">
                {[
                  { id: 'facturacion', label: 'Facturación Electrónica' },
                  { id: 'paginas', label: 'Páginas Web' },
                  { id: 'correos', label: 'Correos Corporativos' },
                  { id: 'whatsapp', label: 'WhatsApp CRM' },
                  { id: 'historial', label: 'Historial de Pagos' }
                ].map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => { 
                      setBillingInitialSubTab(sub.id); 
                      setActivePageId('billing'); 
                      if(window.innerWidth < 768) setIsSidebarOpen(false); 
                    }}
                    className="block w-full text-left py-1.5 px-2 text-xs font-bold text-black dark:text-white bg-transparent"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Area */}
        <div className={`p-3 border-t ${isDarkMode ? 'border-white/5' : 'border-black/5'} space-y-1`}>
          {/* Soporte Técnico */}
          <button 
            onClick={() => { setActivePageId('soporte_tecnico'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} 
            className={`flex items-center gap-3 w-full px-3 py-2 text-xs rounded-xl transition-all ${
              activePageId === 'soporte_tecnico'
                ? (isDarkMode ? 'bg-primary/15 text-white shadow-sm font-semibold' : 'bg-primary-light text-gray-900 border border-primary/15 font-semibold')
                : (isDarkMode ? 'text-gray-400 hover:bg-white/5 font-light' : 'text-black hover:bg-[#f3f8ff] font-light')
            }`}
          >
            <LifeBuoy 
              size={14} 
              className={activePageId === 'soporte_tecnico' ? 'text-primary' : (isDarkMode ? 'text-gray-500' : 'text-black')} 
            />
            {isSidebarOpen && <span>Soporte Técnico</span>}
          </button>

          {/* Papelera */}
          <button onClick={() => { setActivePageId('trash'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl transition-all ${activePageId === 'trash' ? (isDarkMode ? 'bg-red-500/10 text-red-400 font-medium' : 'bg-red-50 text-red-700 border border-red-200 font-semibold') : (isDarkMode ? 'text-gray-400 hover:bg-white/5 font-light' : 'text-black hover:bg-[#f3f8ff] font-light')}`}>
            <div className="flex items-center gap-3">
              <Trash2 size={14} className={activePageId === 'trash' ? (isDarkMode ? 'text-red-400' : 'text-red-600') : 'text-gray-500'} />
              {isSidebarOpen && <span>Papelera</span>}
            </div>
            {isSidebarOpen && trash.length > 0 && <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-black/10 text-gray-600'}`}>{trash.length}</span>}
          </button>
          
          {/* Cerrar Sesion */}
          <button onClick={() => { handleLogout(); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`mt-2 flex items-center gap-3 w-full px-3 py-2 text-xs rounded-xl transition-colors font-light ${isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-black hover:bg-[#f3f8ff] hover:text-black'}`}>
            <LogOut size={14} />{isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 md:z-[60]">
        
        {/* Floating Topbar */}
        <div className={`mt-0 mx-0 mb-3 rounded-none flex flex-col md:flex-row md:items-center px-4 py-2.5 justify-between gap-4 shrink-0 border-b border-t-0 border-x-0 ${isDarkMode ? 'bg-[#151517] border-white/5 shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-white/60 text-gray-600'}`}><Menu size={18} /></button>
            <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-primary/25 text-primary border-primary/20 shadow-sm' : 'bg-primary/10 text-primary border border-primary/15 shadow-sm'}`}>
              <IconRenderer name={headerDetails.icon} size={16} />
            </div>
            <div className="flex flex-col">
              <h1 className={`text-sm md:text-base font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{headerDetails.title}</h1>
              <p className={`text-[9px] md:text-[10px] font-medium hidden sm:inline-block ${isDarkMode ? 'text-gray-400' : 'text-gray-550'}`}>{headerDetails.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            
            {/* BOTÓN RÁPIDO POS */}
            {activeModules.ventas && (
              <button 
                onClick={() => {
                  setVentasInitialSubTab(`pos_${Date.now()}`);
                  setActivePageId('ventas');
                }} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm shrink-0 border ${
                  isDarkMode 
                    ? 'bg-orange-500/15 border-orange-500/30 text-orange-400 hover:bg-orange-500/25' 
                    : 'bg-orange-50 border border-orange-200 text-orange-950 hover:bg-orange-100'
                }`}
                title="Abrir Punto de Venta (POS)"
              >
                <Calculator size={14} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                <span className="hidden sm:inline">Punto de venta</span>
              </button>
            )}

            {/* BOTÓN ASISTENTE AI GLOBAL */}
            <button 
              onClick={() => setIsGlobalChatOpen(!isGlobalChatOpen)} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border shrink-0 ${
                isGlobalChatOpen 
                  ? 'bg-purple-650 border-purple-650 text-white shadow-md' 
                  : (isDarkMode ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25' : 'bg-purple-50 border-purple-200 text-purple-950 hover:bg-purple-100')
              }`}
              title="Abrir Asistente AI"
            >
              <Sparkles size={14} className={isGlobalChatOpen ? 'text-white' : 'text-purple-600 dark:text-purple-450'} />
              <span className="hidden sm:inline">Asistente AI</span>
            </button>

            <button onClick={() => setActivePageId('general_settings')} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-[#f3f8ff] text-black'}`} title="Ajustes"><Settings size={16} /></button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-[#f3f8ff] text-black'}`} title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>{isDarkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
            
            {/* Eliminar Proyecto desde el Header */}
            {(activePage.type === 'project' || activePage.type === 'doc') ? (
              <button onClick={(e) => deletePage(activePageId, e)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-red-700 hover:text-red-700'}`} title="Eliminar"><Trash2 size={16} /></button>
            ) : (
              <div className="w-8"></div> /* Spacer para mantener alineación */
            )}
          </div>
        </div>

        {/* Content Wrapper with AI Chat sidebar */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">

          {/* Editor Area */}
          <div className={`flex-1 overflow-y-auto scroll-smooth custom-scrollbar ${(isPersonasActive || isProyectosActive) ? 'pb-0 pt-0' : 'pb-12 pt-2 px-6 md:px-8'}`}>
            <div className={(isPersonasActive || isProyectosActive) ? 'w-full h-full' : 'max-w-[1600px] w-full mx-auto'}>
              {planStatus === 'suspended' && activePageId !== 'billing' ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh] w-full select-none animate-in fade-in duration-300">
                  <div className="p-5 rounded-2xl bg-red-500/10 text-red-500 mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                    <Lock size={36} />
                  </div>
                  <h2 className="text-lg font-black tracking-tight mb-2 text-red-500">Servicio Suspendido</h2>
                  <p className="text-xs font-semibold text-gray-500 max-w-sm mb-6 leading-relaxed">
                    Tu acceso al ERP ha sido temporalmente suspendido debido al vencimiento o falta de pago de tu suscripción.
                  </p>
                  <button
                    onClick={() => setActivePageId('billing')}
                    className="px-5 py-3 rounded-xl bg-[#1C40F2] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Registrar Pago / Suscripción
                  </button>
                </div>
              ) : isModuleLocked ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh] w-full select-none animate-in fade-in duration-300">
                  <div className="p-5 rounded-2xl bg-[#1C40F2]/10 text-primary mb-6 border border-[#1C40F2]/20 shadow-[0_0_30px_rgba(28,64,242,0.1)]">
                    <Lock size={36} className="text-[#1C40F2]" />
                  </div>
                  <h2 className="text-lg font-black tracking-tight mb-2">Módulo Premium Reservado</h2>
                  <p className="text-xs font-semibold text-gray-500 max-w-sm mb-6 leading-relaxed">
                    Este módulo no está incluido en tu plan actual. Actualiza tu cuenta para habilitarlo de forma inmediata.
                  </p>
                  <button
                    onClick={() => setActivePageId('billing')}
                    className="px-5 py-3 rounded-xl bg-[#1C40F2] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Ver Planes y Precios
                  </button>
                </div>
              ) : (
                <>
                  {/* VISTA: PORTAL DE SUSCRIPCIÓN Y PAGOS */}
                  {activePageId === 'billing' && (
                    <BillingPortal isDarkMode={isDarkMode} showToast={showToast} initialSubTab={billingInitialSubTab} />
                  )}

                  {/* VISTAS FINANCIERAS MODULARES */}
                  {activePageId === 'finances' && (
                    <FinanceModule mode="contabilidad" initialSubTab={contabilidadInitialSubTab} isDarkMode={isDarkMode} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} products={globalProducts} isLoading={isLoadingFinances} />
                  )}
              {activePageId === 'ventas' && (
                <FinanceModule mode="ventas" initialSubTab={ventasInitialSubTab} isDarkMode={isDarkMode} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} products={globalProducts} isLoading={isLoadingFinances} />
              )}
              {activePageId === 'inventario' && (
                <InventoryModule isDarkMode={isDarkMode} />
              )}
              {activePageId === 'compras' && (
                <FinanceModule mode="compras" initialSubTab={comprasInitialSubTab} isDarkMode={isDarkMode} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} products={globalProducts} isLoading={isLoadingFinances} />
              )}
              {activePageId === 'gastos_creditos' && (
                <GastosCreditosModule isDarkMode={isDarkMode} showToast={showToast} transactions={globalTransactions} thirdParties={globalThirdParties} db={db} appId={appId} />
              )}

              {/* VISTA: CONFIGURACIÓN GENERAL */}
              {activePageId === 'general_settings' && (
                <GeneralSettings 
                  isDarkMode={isDarkMode} 
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
                  primaryColor={primaryColor}
                  setPrimaryColor={setPrimaryColor}
                />
              )}

              {/* VISTA: CONTRATACIÓN DE SERVICIOS */}
              {activePageId === 'contratar_servicios' && (
                <HiringServicesModule 
                  isDarkMode={isDarkMode} 
                  showToast={showToast} 
                  db={db} 
                  appId={appId} 
                />
              )}

              {/* VISTA: SOPORTE TÉCNICO */}
              {activePageId === 'soporte_tecnico' && (
                <SupportModule 
                  isDarkMode={isDarkMode} 
                  showToast={showToast} 
                  db={db} 
                  appId={appId} 
                />
              )}

              {/* VISTA: DASHBOARD */}
              {activePageId === 'dashboard' && (
                <ErpDashboard 
                  projectsList={projectsList} 
                  allTasksGlobal={allTasksGlobal} 
                  isDarkMode={isDarkMode} 
                  setActivePageId={setActivePageId} 
                  setVentasInitialSubTab={setVentasInitialSubTab}
                  db={db} 
                  appId={appId} 
                />
              )}

              {/* MÓDULO UNIFICADO: PERSONAS */}
              {isPersonasActive && (
                <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
                  {/* Contenido de Personas */}
                  <div className="flex flex-1 overflow-hidden min-h-0 bg-transparent">
                    <div className={`flex-1 overflow-y-auto px-0 py-0 custom-scrollbar ${isDarkMode ? 'bg-[#0f0f11]' : 'bg-white'}`}>
                      {activePageId === 'personas' && (
                        <FinanceModule 
                          mode="personas" 
                          initialSubTab={personasSubTab} 
                          isDarkMode={isDarkMode} 
                          showToast={showToast} 
                          transactions={globalTransactions} 
                          thirdParties={globalThirdParties} 
                          products={globalProducts} 
                          isLoading={isLoadingFinances} 
                        />
                      )}
                      {activePageId === 'team' && (
                        <div className="animate-in fade-in duration-500 px-8 py-6">
                          <div className="flex justify-end mb-6">
                            <button onClick={openNewUserDrawer} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-primary text-white shadow-primary/40' : 'bg-primary text-white hover:bg-primary-hover'}`}>
                              <UserPlus size={16} /> Invitar Miembro
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {users.map(user => (
                              <div key={user.id} className={`p-5 rounded-2xl flex flex-col justify-between ${currentGlassPanel} hover:-translate-y-1 transition-transform duration-300`}>
                                <div className="flex items-start gap-4 mb-4">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-inner bg-gradient-to-br ${user.color}`}>
                                    {user.initials}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-base">{user.name}</h3>
                                    <p className={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-550'}`}>{user.job}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-auto border-t pt-3 border-white/10">
                                  <div className="flex items-center gap-1.5">
                                    <Shield size={14} className={user.role === 'Admin' ? 'text-red-400' : (user.role === 'Miembro' ? 'text-primary' : 'text-gray-500')} />
                                    <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.role}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => setDrawerUser(user)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400 hover:text-primary' : 'hover:bg-black/5 text-gray-500 hover:text-primary'}`} title="Editar Usuario"><Pencil size={14} /></button>
                                    <button onClick={(e) => deleteUser(user.id, e)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-100 text-gray-500 hover:text-red-650'}`} title="Eliminar Usuario"><Trash2 size={14} /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MÓDULO UNIFICADO: PROYECTOS */}
              {isProyectosActive && (
                <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
                  {/* Cuerpo de Proyectos */}
                  <div className="flex flex-1 overflow-hidden min-h-0 bg-transparent">
                    <div className={`flex-1 overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#0f0f11]' : 'bg-white'} ${
                      (activePage.type === 'project' || activePage.type === 'doc') ? 'px-0 py-0' : 'px-8 py-6'
                    }`}>
                      
                      {/* TAB: MIS PROYECTOS */}
                      {(activePageId === 'proyectos_general' || activePage?.type === 'project') && (
                        <>
                          {activePageId === 'proyectos_general' ? (
                            <div className="animate-in fade-in duration-500 space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Listado de Proyectos</h3>
                                <button 
                                  onClick={addProject} 
                                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-primary text-white' : 'bg-primary text-white hover:bg-primary-hover'}`}
                                >
                                  <Plus size={14} /> Nuevo Proyecto
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {pages.filter(p => p.type === 'project').map(proj => {
                                  const projTasks = globalTasks.filter(t => t.projectId === proj.id);
                                  const completedTasksCount = projTasks.filter(t => t.status === 'done').length;
                                  const totalTasksCount = projTasks.length;
                                  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

                                  return (
                                    <div 
                                      key={proj.id} 
                                      onClick={() => setActivePageId(proj.id)}
                                      className={`p-5 rounded-2xl flex flex-col justify-between cursor-pointer border transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                                        isDarkMode 
                                          ? 'bg-[#151517] border-white/5 hover:bg-[#1a1a1c] hover:border-white/10' 
                                          : 'bg-white border-gray-150 hover:bg-[#fbfcfd] hover:border-gray-300 shadow-sm'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary-light text-primary'}`}>
                                              <Briefcase size={20} />
                                            </div>
                                            <div>
                                              <h4 className="font-bold text-base truncate max-w-[180px]">{proj.title || 'Sin título'}</h4>
                                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-550'}`}>
                                                {totalTasksCount} tareas • {completedTasksCount} completadas
                                              </p>
                                            </div>
                                          </div>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); deletePage(proj.id, e); }}
                                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-100 text-gray-500 hover:text-red-650'}`}
                                            title="Eliminar Proyecto"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>

                                        <div className="mt-4">
                                          <div className="flex justify-between items-center text-xs font-semibold mb-1">
                                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Progreso</span>
                                            <span className={isDarkMode ? 'text-primary' : 'text-primary'}>{progressPercent}%</span>
                                          </div>
                                          <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                                            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                {pages.filter(p => p.type === 'project').length === 0 && (
                                  <div className={`col-span-full text-center py-12 rounded-2xl border border-dashed ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                    No hay proyectos creados aún.
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="animate-in fade-in duration-500">
                              <div className="px-8 py-6">
                                <div className="mt-2 animate-in fade-in duration-500 relative z-0">
                                  <div className={`flex items-center justify-between mb-6 border-b pb-3 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-5">
                                      {/* Pequeño botón de volver al listado de proyectos */}
                                      <button 
                                        onClick={() => setActivePageId('proyectos_general')}
                                        className={`p-1.5 rounded-xl transition-all border shadow-sm ${
                                          isDarkMode 
                                            ? 'border-white/10 hover:bg-white/5 text-gray-400 hover:text-white' 
                                            : 'border-gray-200 hover:bg-black/5 text-black hover:text-black bg-white'
                                        }`}
                                        title="Volver a la lista de proyectos"
                                      >
                                        <ArrowLeft size={14} />
                                      </button>

                                      {/* Título del proyecto editable inline */}
                                      <input 
                                        type="text" 
                                        value={activePage.title || ''} 
                                        onChange={(e) => updateActivePage({ title: e.target.value })} 
                                        placeholder="Título del proyecto" 
                                        className={`text-base font-bold bg-transparent border-none outline-none focus:ring-0 p-0.5 rounded w-52 transition-colors ${
                                          isDarkMode 
                                            ? 'text-white hover:bg-white/5 focus:bg-white/5' 
                                            : 'text-gray-900 hover:bg-black/5 focus:bg-black/5'
                                        }`} 
                                      />
                                      
                                      {/* Selector de Líder */}
                                      <div className="flex items-center gap-1.5 text-xs border-l pl-5 border-gray-200 dark:border-white/15">
                                        <UserCircle size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-450'} />
                                        <span className={`font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-450'}`}>Líder:</span>
                                        <select 
                                          value={activePage.leadId || ''} 
                                          onChange={(e) => updateActivePage({ leadId: e.target.value })} 
                                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg outline-none cursor-pointer transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10' : 'bg-white/60 border-gray-200 text-gray-700 hover:bg-white'}`}
                                        >
                                          <option value="">Sin Asignar</option>
                                          {users.map(u => <option key={u.id} value={u.id} className="text-black">{u.name}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    
                                    <div className={`flex p-1 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                                      <button onClick={() => setCurrentProjectView('board')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentProjectView === 'board' ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-950 shadow-sm') : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-750')}`}>Tablero</button>
                                      <button onClick={() => setCurrentProjectView('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentProjectView === 'list' ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}>Lista</button>
                                    </div>
                                  </div>

                                  {currentProjectView === 'board' ? (
                                    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
                                      <div className="flex flex-row gap-4 overflow-x-auto pb-6 items-start min-h-[50vh] snap-x custom-scrollbar w-full">
                                        <SortableContext items={(activePage.columns || DEFAULT_COLUMNS).map(c => c.id)} strategy={horizontalListSortingStrategy}>
                                          {(activePage.columns || DEFAULT_COLUMNS).map(col => {
                                            const colTasks = (activePage.tasks || []).filter(t => t.status === col.id).sort((a, b) => (a.order || 0) - (b.order || 0));
                                            return (
                                              <SortableColumn 
                                                key={col.id} 
                                                col={col} 
                                                isDarkMode={isDarkMode}
                                                cycleColumnColor={cycleColumnColor}
                                                editingColumnId={editingColumnId}
                                                editingColumnTitle={editingColumnTitle}
                                                setEditingColumnTitle={setEditingColumnTitle}
                                                saveColumnTitle={saveColumnTitle}
                                                startEditingColumn={startEditingColumn}
                                                activePageTasks={activePage.tasks || []}
                                                openNewTaskDrawer={openNewTaskDrawer}
                                                handleDeleteColumn={handleDeleteColumn}
                                                getColumnBgClass={getColumnBgClass}
                                                getColorClass={getColorClass}
                                              >
                                                <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                                  <div className="space-y-2 flex-1 min-h-[40px]">
                                                    {colTasks.map(task => (
                                                      <SortableTaskItem 
                                                        key={task.id} 
                                                        task={task} 
                                                        isDarkMode={isDarkMode} 
                                                        users={users}
                                                        editingTaskId={editingTaskId}
                                                        editingTaskContent={editingTaskContent}
                                                        setEditingTaskContent={(val) => {
                                                          setEditingTaskContent(val);
                                                          setGlobalTasks(globalTasks.map(t => t.id === task.id ? { ...t, content: val } : t));
                                                          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { content: val }, { merge: true }).catch((err) => console.error('inline save err:', err));
                                                        }}
                                                        handleInlineSave={() => setEditingTaskId(null)}
                                                        setEditingTaskId={setEditingTaskId}
                                                        startEditingTask={startEditingTask}
                                                        setDrawerTask={setDrawerTask}
                                                        activePageId={activePage.id}
                                                      />
                                                    ))}
                                                  </div>
                                                </SortableContext>
                                              </SortableColumn>
                                            );
                                          })}
                                        </SortableContext>
                                        
                                        <div className={`w-[200px] shrink-0 p-3 rounded-xl flex flex-col gap-2.5 border border-dashed transition-all duration-300 hover:border-solid ${isDarkMode ? 'border-white/10 hover:border-white/30 bg-white/[0.01]' : 'border-gray-300 hover:border-gray-400 bg-black/[0.01]'}`}>
                                          <input 
                                            type="text" 
                                            value={newColumnName} 
                                            onChange={(e) => setNewColumnName(e.target.value)} 
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()} 
                                            placeholder="Nueva columna..." 
                                            className={`w-full text-xs px-2.5 py-2 rounded-lg outline-none transition-shadow shadow-inner ${currentGlassInput}`} 
                                          />
                                          <button 
                                            onClick={handleAddColumn} 
                                            className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-lg transition-all text-xs font-bold shadow-sm ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                          >
                                            <Plus size={14} /> Crear Columna
                                          </button>
                                        </div>
                                      </div>
                                    </DndContext>
                                  ) : (
                                    <div className="space-y-6">
                                      {(activePage.columns || DEFAULT_COLUMNS).map(col => {
                                        const colTasks = (activePage.tasks || []).filter(t => t.status === col.id).sort((a, b) => (a.order || 0) - (b.order || 0));
                                        return (
                                          <div key={col.id} className={`p-5 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-[#151517] border-white/5' : 'bg-white border-gray-150'}`}>
                                            <div className="flex items-center justify-between mb-4">
                                              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${getColumnColorClass(col.color)}`}>{col.title} ({colTasks.length})</span>
                                            </div>
                                            <div className="divide-y divide-white/5">
                                              {colTasks.length === 0 ? (
                                                <div className="py-4 text-xs italic text-gray-500">Sin tareas en esta lista</div>
                                              ) : (
                                                colTasks.map(task => {
                                                  const assignedUser = users.find(u => u.id === task.assigneeId);
                                                  return (
                                                    <div key={task.id} className="group py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer" onClick={() => setDrawerTask(task)}>
                                                      <div className="flex items-center gap-3 md:w-1/2">
                                                        <div className={`p-1.5 rounded-lg shrink-0 ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-black/5 text-gray-650'}`}>
                                                          <CheckSquare size={14} />
                                                        </div>
                                                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-black'}`}>{task.content}</span>
                                                      </div>
                                                      <div className="flex items-center gap-4 md:w-1/2 md:justify-end ml-7 md:ml-0">
                                                        {task.meetLink && <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md opacity-70 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-primary/10 text-primary border border-primary/25'}`}><Video size={10} /> Videollamada</span>}
                                                        {assignedUser ? (
                                                          <div className={`flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity min-w-[120px] justify-end`}>
                                                            <span className={`text-xs font-semibold truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{assignedUser.name}</span>
                                                            <div className={`w-6 h-6 rounded-full flex shrink-0 items-center justify-center text-[10px] font-bold text-white shadow-inner bg-gradient-to-br ${assignedUser.color}`}>{assignedUser.initials}</div>
                                                          </div>
                                                        ) : (
                                                          <div className={`min-w-[120px]`}></div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                              <div className={`px-4 py-3 transition-colors cursor-pointer rounded-b-xl flex items-center gap-2 ${isDarkMode ? 'hover:bg-white/[0.03] text-gray-500 hover:text-gray-300' : 'hover:bg-black/[0.03] text-gray-500 hover:text-gray-700'}`} onClick={() => openNewTaskDrawer(col.id)}>
                                                <Plus size={14} />
                                                <span className="text-xs font-semibold tracking-wide">Añadir nueva tarea</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* TAB: PAGINAS */}
                      {(activePageId === 'paginas_general' || activePage?.type === 'doc') && (
                        <>
                          {activePageId === 'paginas_general' ? (
                            <div className="animate-in fade-in duration-500 space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Listado de Páginas</h3>
                                <button 
                                  onClick={addPage} 
                                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-primary text-white' : 'bg-primary text-white hover:bg-primary-hover'}`}
                                >
                                  <Plus size={14} /> Nueva Página
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {pages.filter(p => p.type === 'doc').map(docPage => (
                                  <div 
                                    key={docPage.id} 
                                    onClick={() => setActivePageId(docPage.id)}
                                    className={`p-5 rounded-2xl flex flex-col justify-between cursor-pointer border transition-all duration-350 hover:-translate-y-1 hover:shadow-md ${
                                      isDarkMode 
                                        ? 'bg-[#151517] border-white/5 hover:bg-[#1a1a1c] hover:border-white/10' 
                                        : 'bg-white border-gray-150 hover:bg-[#fbfcfd] hover:border-gray-300 shadow-sm'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                            <FileText size={20} />
                                          </div>
                                          <div>
                                            <h4 className="font-bold text-base truncate max-w-[180px]">{docPage.title || 'Sin título'}</h4>
                                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-550'}`}>
                                              {docPage.content ? `${Math.round(docPage.content.split(' ').length)} palabras` : 'Vacía'}
                                            </p>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); deletePage(docPage.id, e); }}
                                          className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-100 text-gray-500 hover:text-red-650'}`}
                                          title="Eliminar Página"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {pages.filter(p => p.type === 'doc').length === 0 && (
                                  <div className={`col-span-full text-center py-12 rounded-2xl border border-dashed ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                    No hay páginas creadas aún.
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="animate-in fade-in duration-500">
                              <div className={`flex items-center gap-3 px-8 py-3.5 border-b shrink-0 ${isDarkMode ? 'border-white/5 bg-[#121214]/40' : 'border-primary/10 bg-primary-light/40'}`}>
                                <button 
                                  onClick={() => setActivePageId('paginas_general')}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                    isDarkMode 
                                      ? 'border-white/10 hover:bg-white/5 text-gray-300 hover:text-white' 
                                      : 'border-gray-200 hover:bg-black/5 text-black hover:text-black'
                                  }`}
                                >
                                  <ArrowLeft size={12} /> Volver a Páginas
                                </button>
                                <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Página activa: <span className="text-primary font-extrabold">{activePage.title}</span>
                                </span>
                              </div>
                              <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-24 py-8">
                                <div className="mb-8">
                                  <div className="group relative flex items-center gap-3">
                                     <div className={`p-2.5 rounded-xl transition-colors backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-200 shadow-sm' : 'bg-white/60 border-gray-200 text-gray-700 shadow-sm'}`}>
                                       <IconRenderer name={activePage.icon} size={24} />
                                     </div>
                                     <input type="text" value={activePage.title} onChange={(e) => updateActivePage({ title: e.target.value })} placeholder="Título del documento" className={`w-full text-3xl font-bold border-none outline-none bg-transparent resize-none focus:ring-0 tracking-tight ${isDarkMode ? 'text-white placeholder-gray-700' : 'text-gray-900 placeholder-gray-400'}`} />
                                  </div>
                                </div>

                                <div className={`flex flex-wrap gap-2 mb-6 p-2 rounded-xl animate-in fade-in duration-300 ${isDarkMode ? 'bg-white/5 border border-white/5 backdrop-blur-md' : 'bg-white/40 border border-white/40 backdrop-blur-md shadow-sm'}`}>
                                  <span className={`flex items-center px-2 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Herramientas IA</span>
                                  <button onClick={() => handleAiAction('improve')} disabled={isGeneratingAI || !activePage.content.trim()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>{isGeneratingAI ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />} Mejorar</button>
                                  <button onClick={() => handleAiAction('summarize')} disabled={isGeneratingAI || !activePage.content.trim()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>{isGeneratingAI ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} Resumir</button>
                                  <button onClick={() => handleAiAction('continue')} disabled={isGeneratingAI || !activePage.content.trim()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>{isGeneratingAI ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} Continuar</button>
                                </div>
                                <textarea ref={contentRef} value={activePage.content} onChange={(e) => updateActivePage({ content: e.target.value })} placeholder="Presiona '/' para comandos o empieza a escribir..." className={`w-full text-[13px] leading-tight border-none outline-none bg-transparent resize-none focus:ring-0 min-h-[300px] font-medium ${isDarkMode ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'}`} />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* TAB: CALENDARIO */}
                      {activePageId === 'calendar' && (
                        <div className="space-y-8 animate-in fade-in duration-500 px-8 py-6">
                          <div className={`p-6 rounded-2xl ${currentGlassPanel}`}>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                              <div>
                                <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar size={20} className={isDarkMode ? 'text-primary' : 'text-primary'} /> Google Workspace (API Real)</h2>
                                <p className={`text-sm mt-1 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lee tus eventos reales y genera enlaces oficiales de Google Meet.</p>
                              </div>
                              
                              {!googleClientId ? (
                                <button onClick={() => setActivePageId('general_settings')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-white/10 text-white shadow-white/5 hover:bg-white/20 border border-white/10' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                                  <Settings size={16} /> Configurar Integración
                                </button>
                              ) : !isGoogleConnected ? (
                                <button onClick={handleConnectGoogle} disabled={isConnecting} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 ${isDarkMode ? 'bg-primary text-white shadow-primary/40' : 'bg-primary text-white'}`}>
                                  {isConnecting ? <RefreshCw className="animate-spin" size={16} /> : <LogIn size={16} />} {isConnecting ? 'Conectando...' : 'Conectar Google'}
                                </button>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold shadow-inner ${isDarkMode ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100/60 text-green-700 border-green-200'}`}><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Sincronizado</span>
                                  <button onClick={handleDisconnectGoogle} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/20' : 'bg-black/5 text-gray-600 hover:text-red-650'}`}><LogOut size={14} /> Desconectar</button>
                                </div>
                              )}
                            </div>
                          </div>

                          {isGoogleConnected && (
                            <div className="space-y-5">
                              <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                                <h3 className="text-lg font-semibold">Próximos Eventos Reales (7 días)</h3>
                                <button onClick={handleCreateInstantMeetUI} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold shadow-sm ${isDarkMode ? 'bg-primary/20 text-primary hover:bg-primary/40 border border-primary/20' : 'bg-primary/10 text-primary hover:bg-primary/15 border border-primary/25'}`}><Video size={14} /> Crear Meet Real</button>
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                {events.length > 0 ? events.map(event => (
                                  <div key={event.id} className={`group flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl transition-all hover:-translate-y-0.5 ${currentGlassPanel}`}>
                                    <div className="flex items-start gap-4">
                                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border backdrop-blur-md shadow-inner ${event.color} border-current/20`}>{event.date}</div>
                                      <div>
                                        <h4 className="text-base font-semibold mb-0.5 max-w-[250px] truncate">{event.title}</h4>
                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-550'}`}><Clock size={14} />{event.time}</div>
                                      </div>
                                    </div>
                                    <div className="mt-4 md:mt-0 w-full md:w-auto flex flex-wrap gap-2 justify-start md:justify-end">
                                      <button onClick={() => convertEventToTask(event)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                                          <CheckSquare size={14} /> Convertir en Tarea
                                      </button>
                                      <button onClick={() => generateMeetingAgenda(event)} disabled={isGeneratingAI} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-sm ${isDarkMode ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                                          {isGeneratingAI ? <RefreshCw className="animate-spin" size={14} /> : <Wand2 size={14} />} Agenda con IA
                                      </button>
                                      {event.meetLink && (
                                        <a href={event.meetLink} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${isDarkMode ? 'bg-primary/20 text-primary hover:bg-primary/40 border border-primary/20' : 'bg-primary/10 text-primary hover:bg-primary/15 border border-primary/25'}`}>
                                          <Video size={14} /> Unirse a Meet
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )) : (
                                  <div className={`col-span-full text-center py-12 rounded-2xl border border-dashed ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                    No hay eventos para los próximos 7 días.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
                </>
              )}

            </div> {/* Closes mx-auto */}
          </div> {/* Closes Editor Area */}

        {/* Chat Lateral de IA Global */}
        {isGlobalChatOpen && (
          <div className={`w-80 border-l shrink-0 flex flex-col p-4 animate-in slide-in-from-right duration-300 ${isDarkMode ? 'border-white/10 bg-[#0f0f11]' : 'border-primary/10 bg-primary-light'}`}>
            <FinanceChat 
              transactions={globalTransactions} 
              thirdParties={globalThirdParties} 
              isDarkMode={isDarkMode} 
              onClose={() => setIsGlobalChatOpen(false)} 
            />
          </div>
        )}

        </div> {/* Closes Content Wrapper */}
      </div> {/* Closes Main Content Area */}

      {/* Drawer Overlay (Task) */}
      {drawerTask && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] transition-opacity" onClick={() => setDrawerTask(null)} />}

      {/* Drawer (Task) */}
      <div className={`fixed inset-y-0 right-0 z-[80] w-full sm:w-[400px] shadow-[0_0_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 flex flex-col backdrop-blur-2xl ${drawerTask ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-[#0f0f11]/90 border-l border-white/10' : 'bg-white/90 border-l border-white/50'}`}>
        {drawerTask && (
          <>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-inner ${isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-primary/10 text-primary border border-white/50'}`}><Briefcase size={18} /></div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{drawerTask.id && globalTasks.some(t => t.id === drawerTask.id) ? 'Detalles de Tarea' : 'Crear Tarea'}</h2>
              </div>
              <div className="flex items-center gap-1">
                {drawerTask.id && globalTasks.some(t => t.id === drawerTask.id) && (
                  <button onClick={handleDeleteTaskFromDrawer} className={`p-2 rounded-lg transition-all shadow-sm ${isDarkMode ? 'bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/20' : 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-100'}`} title="Eliminar tarea">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => setDrawerTask(null)} className={`p-2 rounded-lg transition-all shadow-sm ${isDarkMode ? 'bg-white/5 hover:bg-white/20 text-gray-300 border border-white/5' : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'}`}><X size={16} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 mb-2 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isTimerRunning && activeTimerTaskId === drawerTask.id ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-primary/20 text-primary'}`}>
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tiempo Invertido</p>
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {Math.floor(((drawerTask.timeSpent || 0) + (isTimerRunning && activeTimerTaskId === drawerTask.id ? elapsedTime : 0)) / 60)} min {((drawerTask.timeSpent || 0) + (isTimerRunning && activeTimerTaskId === drawerTask.id ? elapsedTime : 0)) % 60} seg
                    </p>
                  </div>
                </div>
                <button 
                  onClick={toggleTimer}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${isTimerRunning && activeTimerTaskId === drawerTask.id ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' : 'bg-primary hover:bg-primary-hover text-white shadow-primary/30'}`}
                >
                  {isTimerRunning && activeTimerTaskId === drawerTask.id ? 'Detener' : 'Iniciar'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>¿Qué hay que hacer?</label>
                  <input type="text" value={drawerTask.content} onChange={(e) => setDrawerTask(prev => ({ ...prev, content: e.target.value }))} className={`w-full text-sm font-semibold px-3 py-2 rounded-xl outline-none transition-all shadow-inner ${currentGlassInput}`} placeholder="Ej. Implementar Auth con Firebase..." />
                </div>
                
                {/* Nuevo Selector de Asignación */}
                <div>
                  <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}><UserCircle size={14} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}/> Asignado a</label>
                  <select value={drawerTask.assigneeId || ''} onChange={(e) => setDrawerTask(prev => ({ ...prev, assigneeId: e.target.value }))} className={`w-full px-3 py-2 text-sm font-medium rounded-lg outline-none cursor-pointer transition-all shadow-inner ${currentGlassInput}`}>
                    <option value="" className="text-black">Sin asignar</option>
                    {users.map(u => <option key={u.id} value={u.id} className="text-black">{u.name} - {u.job}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Proyecto Maestro</label>
                    <select value={drawerTask.projectId || ''} onChange={(e) => setDrawerTask(prev => ({ ...prev, projectId: e.target.value }))} className={`w-full px-3 py-2 text-sm font-medium rounded-lg outline-none cursor-pointer transition-all shadow-inner ${currentGlassInput}`}>
                      {projectsList.map(p => <option key={p.id} value={p.id} className="text-black">{p.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fase actual</label>
                    <select value={drawerTask.status} onChange={(e) => setDrawerTask(prev => ({ ...prev, status: e.target.value }))} className={`w-full px-3 py-2 text-sm font-medium rounded-lg outline-none cursor-pointer transition-all shadow-inner ${currentGlassInput}`}>
                      {((projectsList.find(p => p.id === drawerTask.projectId)?.columns) || DEFAULT_COLUMNS).map(c => <option key={c.id} value={c.id} className="text-black">{c.title}</option>)}
                    </select>
                  </div>
                </div>

                {/* --- NUEVO: Integración Google Workspace en Drawer --- */}
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-primary-light border-primary/15'}`}>
                  <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-400' : 'text-primary'}`}>
                    <Calendar size={14} className={isDarkMode ? 'text-primary' : 'text-primary'} /> Google Workspace (API Real)
                  </label>
                  {!isGoogleConnected ? (
                     <div className="flex items-start gap-2 text-xs italic opacity-80">
                        <span className="w-2 h-2 mt-1 rounded-full bg-gray-500 shrink-0"></span>
                        <p>Desconectado. Ve a la pestaña Calendario para vincular tu cuenta y generar un enlace oficial de Google Meet para esta tarea.</p>
                     </div>
                  ) : (
                     <div className="flex flex-col gap-2">
                       {drawerTask.meetLink ? (
                         <div className="flex items-center gap-2">
                           <div className="flex-1 px-3 py-2 text-xs rounded-lg truncate bg-black/10 border border-white/10 opacity-70">
                             {drawerTask.meetLink}
                           </div>
                           <a href={drawerTask.meetLink} target="_blank" rel="noopener noreferrer" className={`px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0 ${isDarkMode ? 'bg-primary/80 text-white hover:bg-primary' : 'bg-primary text-white hover:bg-primary-hover'}`}>Entrar</a>
                           <button onClick={() => setDrawerTask(p => ({...p, meetLink: ''}))} className="p-2 rounded-lg transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/30 border border-red-500/20 shrink-0" title="Quitar enlace"><X size={14}/></button>
                         </div>
                       ) : (
                         <button onClick={handleGenerateMeetForTask} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border shadow-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-white border-gray-200 text-primary hover:bg-gray-50'}`}>
                            <Video size={14} /> Crear Evento y Generar Meet
                         </button>
                       )}
                     </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}><CalendarDays size={14} className={isDarkMode ? 'text-primary' : 'text-primary'} /> Arranca el</label>
                    <input type="date" value={drawerTask.startDate || ''} onChange={(e) => setDrawerTask(prev => ({ ...prev, startDate: e.target.value }))} className={`w-full px-3 py-2 text-xs font-medium rounded-lg outline-none transition-all shadow-inner ${isDarkMode ? '[color-scheme:dark]' : ''} ${currentGlassInput}`} />
                  </div>
                  <div>
                    <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}><CalendarDays size={14} className={isDarkMode ? 'text-red-400' : 'text-red-500'} /> Fecha Límite</label>
                    <input type="date" value={drawerTask.dueDate || ''} onChange={(e) => setDrawerTask(prev => ({ ...prev, dueDate: e.target.value }))} className={`w-full px-3 py-2 text-xs font-medium rounded-lg outline-none transition-all shadow-inner ${isDarkMode ? '[color-scheme:dark]' : ''} ${currentGlassInput}`} />
                  </div>
                </div>
                <div>
                  <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}><DollarSign size={14} className={isDarkMode ? 'text-green-400' : 'text-green-500'} /> Presupuesto Asignado (USD)</label>
                  <input type="number" value={drawerTask.budget || ''} onChange={(e) => setDrawerTask(prev => ({ ...prev, budget: e.target.value }))} placeholder="Ej. 1200" className={`w-full px-3 py-2 text-sm font-medium rounded-lg outline-none transition-all shadow-inner ${currentGlassInput}`} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}><AlignLeft size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-500'} /> Descripción</label>
                    <button 
                      onClick={generateTaskPlan}
                      disabled={isGeneratingAI || !drawerTask.content}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all shadow-sm disabled:opacity-50 hover:scale-105 ${isDarkMode ? 'bg-gradient-to-r from-purple-600/50 to-primary-hover/50 text-white border border-purple-500/30' : 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200'}`}
                    >
                      {isGeneratingAI ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} ✨ Plan IA
                    </button>
                  </div>
                  <textarea value={drawerTask.description || ''} onChange={(e) => setDrawerTask(prev => ({ ...prev, description: e.target.value }))} placeholder="Escribe enlaces importantes, notas de clientes..." rows={4} className={`w-full px-3 py-2 text-sm font-medium rounded-xl outline-none resize-none transition-all shadow-inner ${currentGlassInput}`} />
                </div>
              </div>

              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}></div>

              {/* CHECKLIST / SUBTAREAS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}><ListTodo size={14} className={isDarkMode ? 'text-primary' : 'text-primary'} /> Subtareas (Checklist)</label>
                  {drawerTask.subtasks && drawerTask.subtasks.length > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                      {drawerTask.subtasks.filter(s => s.completed).length} / {drawerTask.subtasks.length}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 mb-3">
                  {(drawerTask.subtasks || []).map(st => (
                    <div key={st.id} className={`flex items-center gap-2 p-2 rounded-lg border ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-200'} group`}>
                      <button onClick={() => toggleSubtask(st.id)} className={`w-4 h-4 rounded flex shrink-0 items-center justify-center border transition-all ${st.completed ? 'bg-primary border-primary text-white' : (isDarkMode ? 'border-gray-500 hover:border-gray-300' : 'border-gray-400 hover:border-gray-600')}`}>
                         {st.completed && <CheckSquare size={10} />}
                      </button>
                      <span className={`flex-1 text-xs font-medium ${st.completed ? 'line-through opacity-50' : ''} ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{st.text}</span>
                      <button onClick={() => removeSubtask(st.id)} className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-500/20' : 'text-red-500 hover:bg-red-100'}`}><X size={12} /></button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input type="text" value={newSubtaskText} onChange={(e) => setNewSubtaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSubtask()} placeholder="Agregar un paso o subtarea..." className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg outline-none transition-all shadow-inner ${currentGlassInput}`} />
                  <button onClick={addSubtask} disabled={!newSubtaskText.trim()} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${isDarkMode ? 'bg-primary/20 text-primary hover:bg-primary/40 border border-primary/30' : 'bg-primary/10 text-primary hover:bg-primary/15'}`}><Plus size={14}/></button>
                </div>
              </div>
              
              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}></div>

              <div>
                <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}><MessageSquare size={14} /> Historial de Avances</label>
                <div className="flex items-start gap-2 mb-4">
                  <textarea value={quickNoteText} onChange={(e) => setQuickNoteText(e.target.value)} placeholder="Agrega un update rápido..." rows={2} className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg outline-none resize-none transition-all shadow-inner ${currentGlassInput}`} />
                  <button onClick={addQuickNote} disabled={!quickNoteText.trim()} className={`px-3 py-2 rounded-lg transition-all font-semibold text-xs shadow-sm disabled:opacity-50 ${isDarkMode ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200'}`}>Subir</button>
                </div>
                <div className="space-y-3">
                  {drawerTask.notes && drawerTask.notes.length > 0 ? (
                    drawerTask.notes.map((note) => (
                      <div key={note.id} className={`p-3 rounded-xl border shadow-sm backdrop-blur-md ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/50'}`}>
                        <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}><Clock size={12} /> {note.date}</div>
                        <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{note.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-5 text-xs font-medium italic rounded-xl border border-dashed ${isDarkMode ? 'text-gray-500 border-white/10 bg-white/5' : 'text-gray-400 border-black/10 bg-black/5'}`}>No hay avances documentados aún.</div>
                  )}
                </div>
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20 backdrop-blur-md' : 'border-black/5 bg-white/40 backdrop-blur-md'}`}>
              <button onClick={saveDrawerTask} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-transform hover:scale-105 shadow-sm ${isDarkMode ? 'bg-primary text-white shadow-primary/40' : 'bg-primary text-white'}`}><Save size={16} /> Guardar Tarea</button>
            </div>
          </>
        )}
      </div>

      {/* Drawer Overlay (User) */}
      {drawerUser && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] transition-opacity" onClick={() => setDrawerUser(null)} />}

      {/* Drawer (User) */}
      <div className={`fixed inset-y-0 right-0 z-[80] w-full sm:w-[400px] shadow-[0_0_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 flex flex-col backdrop-blur-2xl ${drawerUser ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-[#0f0f11]/90 border-l border-white/10' : 'bg-white/90 border-l border-white/50'}`}>
        {drawerUser && (
          <>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-inner ${isDarkMode ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-primary/10 text-primary border border-primary/25'}`}><UserPlus size={18} /></div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{drawerUser.isNew ? 'Invitar Miembro' : 'Editar Usuario'}</h2>
              </div>
              <button onClick={() => setDrawerUser(null)} className={`p-2 rounded-lg transition-all shadow-sm ${isDarkMode ? 'bg-white/5 hover:bg-white/20 text-gray-300 border border-white/5' : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'}`}><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                {/* Preview Avatar */}
                <div className="flex justify-center mb-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg bg-gradient-to-br ${drawerUser.color}`}>
                    {drawerUser.name ? drawerUser.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'U'}
                  </div>
                </div>

                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nombre Completo</label>
                  <input type="text" value={drawerUser.name} onChange={(e) => setDrawerUser(prev => ({ ...prev, name: e.target.value }))} className={`w-full text-sm font-semibold px-3 py-2 rounded-xl outline-none transition-all shadow-inner ${currentGlassInput}`} placeholder="Ej. Jane Doe" />
                </div>
                
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cargo / Puesto</label>
                  <input type="text" value={drawerUser.job} onChange={(e) => setDrawerUser(prev => ({ ...prev, job: e.target.value }))} className={`w-full text-sm font-semibold px-3 py-2 rounded-xl outline-none transition-all shadow-inner ${currentGlassInput}`} placeholder="Ej. Frontend Developer" />
                </div>

                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rol en el Sistema</label>
                  <select value={drawerUser.role} onChange={(e) => setDrawerUser(prev => ({ ...prev, role: e.target.value }))} className={`w-full px-3 py-2 text-sm font-medium rounded-lg outline-none cursor-pointer transition-all shadow-inner ${currentGlassInput}`}>
                    <option value="Admin" className="text-black">Admin</option>
                    <option value="Miembro" className="text-black">Miembro</option>
                    <option value="Observador" className="text-black">Observador</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-3 mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Color del Avatar</label>
                  <div className="flex gap-3 flex-wrap">
                    {USER_COLORS.map(colorClass => (
                      <button 
                        key={colorClass}
                        onClick={() => setDrawerUser(prev => ({ ...prev, color: colorClass }))}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} transition-transform hover:scale-110 ${drawerUser.color === colorClass ? 'ring-2 ring-offset-2 ring-primary ring-offset-[#0f0f11]' : 'opacity-70'}`}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>
            
            <div className={`px-6 py-4 border-t flex justify-end shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20 backdrop-blur-md' : 'border-black/5 bg-white/40 backdrop-blur-md'}`}>
              <button onClick={() => setDrawerUser(null)} className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>Cancelar</button>
              <button onClick={saveDrawerUser} disabled={!drawerUser.name.trim()} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-transform shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105 ${isDarkMode ? 'bg-primary text-white shadow-primary/40' : 'bg-primary text-white hover:bg-primary-hover'}`}><Save size={16} /> Guardar Usuario</button>
            </div>
          </>
        )}
      </div>

      {/* Drawer Overlay (Report) */}
      {isReportDrawerOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] transition-opacity" onClick={() => setIsReportDrawerOpen(false)} />}

      {/* Drawer (Report) */}
      <div className={`fixed inset-y-0 right-0 z-[80] w-full sm:w-[400px] shadow-[0_0_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 flex flex-col backdrop-blur-2xl ${isReportDrawerOpen ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-[#0f0f11]/90 border-l border-white/10' : 'bg-white/90 border-l border-white/50'}`}>
        {isReportDrawerOpen && (
          <>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-inner ${isDarkMode ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-primary/10 text-primary border border-primary/25'}`}><Download size={18} /></div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Exportar Informes</h2>
              </div>
              <button onClick={() => setIsReportDrawerOpen(false)} className={`p-2 rounded-lg transition-all shadow-sm ${isDarkMode ? 'bg-white/5 hover:bg-white/20 text-gray-300 border border-white/5' : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'}`}><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
              <div className="space-y-4">
                <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Selecciona los filtros para descargar un reporte detallado en formato CSV compatible con Excel y Google Sheets.</p>
                
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filtrar por Proyecto</label>
                  <select value={reportFilters.projectId} onChange={(e) => setReportFilters(prev => ({ ...prev, projectId: e.target.value }))} className={`w-full px-3 py-2 text-sm font-medium rounded-lg outline-none cursor-pointer transition-all shadow-inner ${currentGlassInput}`}>
                    <option value="all" className="text-black">Todos los proyectos</option>
                    {projectsList.map(p => <option key={p.id} value={p.id} className="text-black">{p.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filtrar por Estado</label>
                  <select value={reportFilters.status} onChange={(e) => setReportFilters(prev => ({ ...prev, status: e.target.value }))} className={`w-full px-3 py-2 text-sm font-medium rounded-lg outline-none cursor-pointer transition-all shadow-inner ${currentGlassInput}`}>
                    <option value="all" className="text-black">Todos los estados</option>
                    {DEFAULT_COLUMNS.map(c => <option key={c.id} value={c.id} className="text-black">{c.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filtrar por Asignado</label>
                  <select value={reportFilters.assigneeId} onChange={(e) => setReportFilters(prev => ({ ...prev, assigneeId: e.target.value }))} className={`w-full px-3 py-2 text-sm font-medium rounded-lg outline-none cursor-pointer transition-all shadow-inner ${currentGlassInput}`}>
                    <option value="all" className="text-black">Todo el equipo</option>
                    {users.map(u => <option key={u.id} value={u.id} className="text-black">{u.name}</option>)}
                  </select>
                </div>
                
              </div>
            </div>
            
            <div className={`px-6 py-4 border-t flex justify-end shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20 backdrop-blur-md' : 'border-black/5 bg-white/40 backdrop-blur-md'}`}>
              <button onClick={exportToCSV} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-transform shadow-sm hover:scale-105 ${isDarkMode ? 'bg-primary text-white shadow-primary/40' : 'bg-primary text-white hover:bg-primary-hover'}`}><Download size={16} /> Descargar CSV</button>
            </div>
          </>
        )}
      </div>

      {/* Contenedor de Toasts (Notificaciones Flotantes Minimalistas) */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg pointer-events-auto backdrop-blur-md border ${isDarkMode ? 'bg-[#1a1a1a]/90 border-white/10 text-white' : 'bg-white/90 border-gray-200 text-gray-800'}`}>
            {toast.type === 'success' && <CheckCircle2 size={16} className="text-emerald-500" />}
            {toast.type === 'error' && <X size={16} className="text-red-500" />}
            {toast.type === 'sync' && <Cloud size={16} className="text-primary animate-pulse" />}
            <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
          </div>
        ))}
      </div>

        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
