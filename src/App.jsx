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
  Cloud,
  Settings
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, deleteDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';

const apiKey = ""; // API Key para Gemini (configura tu clave aquí si usas IA)

// --- INICIALIZACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBRw4Mi3m6gke6vBNTIaL99ewgGMjwB4ns",
  authDomain: "proyectos-webfix.firebaseapp.com",
  projectId: "proyectos-webfix",
  storageBucket: "proyectos-webfix.firebasestorage.app",
  messagingSenderId: "625295446429",
  appId: "1:625295446429:web:95fa8147488a6ab3a65f74",
  measurementId: "G-YY0ZWZXTDY",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "1:625295446429:web:95fa8147488a6ab3a65f74";

// ⚠️ El GOOGLE_CLIENT_ID ahora se maneja desde la interfaz (Estado)
const GOOGLE_CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

// Helper Strings para clases Glassmorphism
const glassPanelDark = "backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]";
const glassPanelLight = "backdrop-blur-xl bg-white/40 border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]";
const glassInputDark = "bg-black/20 border-white/10 focus:border-white/30 focus:ring-1 focus:ring-blue-500/50 text-white placeholder-gray-500 backdrop-blur-md";
const glassInputLight = "bg-white/50 border-white/50 focus:border-blue-300 focus:ring-1 focus:ring-blue-500/30 text-gray-800 placeholder-gray-400 backdrop-blur-md";

const COLUMN_COLORS = [
  { id: 'gray', badge: 'bg-gray-200/60 text-gray-700 dark:bg-white/[0.08] dark:text-gray-300', bgDark: 'bg-[#1a1a1a]/40 border-white/[0.08]', bgLight: 'bg-gray-50/50 border-gray-200/80', dot: 'bg-gray-400' },
  { id: 'blue', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', bgDark: 'bg-blue-900/10 border-blue-500/20', bgLight: 'bg-blue-50/60 border-blue-200/50', dot: 'bg-blue-500' },
  { id: 'green', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', bgDark: 'bg-green-900/10 border-green-500/20', bgLight: 'bg-green-50/60 border-green-200/50', dot: 'bg-green-500' },
  { id: 'yellow', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', bgDark: 'bg-yellow-900/10 border-yellow-500/20', bgLight: 'bg-yellow-50/60 border-yellow-200/50', dot: 'bg-yellow-500' },
  { id: 'red', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', bgDark: 'bg-red-900/10 border-red-500/20', bgLight: 'bg-red-50/60 border-red-200/50', dot: 'bg-red-500' },
  { id: 'purple', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', bgDark: 'bg-purple-900/10 border-purple-500/20', bgLight: 'bg-purple-50/60 border-purple-200/50', dot: 'bg-purple-500' },
];

const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'Por hacer', color: 'gray' },
  { id: 'in-progress', title: 'En progreso', color: 'blue' },
  { id: 'done', title: 'Completado', color: 'green' }
];

const USER_COLORS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-emerald-400 to-emerald-600',
  'from-red-400 to-red-600',
  'from-yellow-400 to-yellow-600',
  'from-gray-400 to-gray-600'
];

// --- Datos Simulados de Usuarios ---
const MOCK_USERS = [
  { id: 'u1', name: 'Carlos Ruiz', role: 'Admin', job: 'Product Manager', initials: 'CR', color: 'from-blue-400 to-blue-600' },
  { id: 'u2', name: 'Ana Torres', role: 'Miembro', job: 'UI/UX Lead', initials: 'AT', color: 'from-purple-400 to-purple-600' },
  { id: 'u3', name: 'Luis Gómez', role: 'Miembro', job: 'Fullstack Dev', initials: 'LG', color: 'from-emerald-400 to-emerald-600' },
  { id: 'u4', name: 'Cliente X', role: 'Observador', job: 'Stakeholder', initials: 'CX', color: 'from-gray-400 to-gray-600' }
];

const MOCK_EVENTS = [
  { id: 1, title: 'Sprint Planning: E-commerce Vercel', time: '10:00 AM', date: 'Hoy', meetLink: 'https://meet.google.com/abc-defg-hij', color: 'bg-blue-500/20 text-blue-300' },
  { id: 2, title: 'Revisión de Wireframes con Cliente', time: '01:30 PM', date: 'Hoy', meetLink: 'https://meet.google.com/xyz-uvwx-yza', color: 'bg-purple-500/20 text-purple-300' },
  { id: 3, title: 'Daily Standup Dev Team', time: '09:00 AM', date: 'Mañana', meetLink: 'https://meet.google.com/qwe-rtyu-iop', color: 'bg-green-500/20 text-green-300' },
];

const INITIAL_PAGES = [
  { id: '1', title: 'E-commerce ClientX', content: '## Requerimientos del Proyecto\n\n- Migrar base de datos a Supabase.\n- Implementar pasarela de pagos con Stripe.\n- Rediseño de la interfaz usando Tailwind CSS.\n\n**Notas del cliente:** Quieren que la carga sea súper rápida.', icon: 'monitor', type: 'doc' },
  { id: '3', title: 'UI/UX Guidelines', content: 'Colores de la marca:\n- Primario: #4F46E5\n- Secundario: #10B981', icon: 'palette', type: 'doc' },
  { id: '4', title: 'App Móvil Finanzas', content: '', icon: 'rocket', type: 'project', leadId: 'u1',
    columns: [
      { id: 'todo', title: 'Por hacer', color: 'gray' },
      { id: 'in-progress', title: 'En progreso', color: 'blue' },
      { id: 'done', title: 'Completado', color: 'green' }
    ],
    tasks: [
      { id: 't1', projectId: '4', content: 'Investigación de usuarios (UX)', status: 'done', assigneeId: 'u2', meetLink: '', notes: [{ id: 'n1', text: 'Reunión inicial aprobada', date: '26/4/2026, 09:00' }] },
      { id: 't2', projectId: '4', content: 'Diseñar Mockups en Figma', status: 'in-progress', assigneeId: 'u2', meetLink: '', notes: [{ id: 'n2', text: 'Falta confirmar la paleta de colores', date: '26/4/2026, 11:30' }] },
      { id: 't3', projectId: '4', content: 'Configurar entorno React Native', status: 'todo', assigneeId: 'u3', meetLink: '' },
      { id: 't4', projectId: '4', content: 'Reunión de aprobación de diseño', status: 'todo', assigneeId: 'u4', meetLink: 'https://meet.google.com/mock-meet' }
    ] 
  }
];

// Helper para renderizar iconos
const IconRenderer = ({ name, size = 18, className = "" }) => {
  switch (name) {
    case 'monitor': return <Monitor size={size} className={className} />;
    case 'palette': return <Palette size={size} className={className} />;
    case 'rocket': return <Rocket size={size} className={className} />;
    case 'project': return <Briefcase size={size} className={className} />;
    case 'dashboard': return <LayoutDashboard size={size} className={className} />;
    case 'calendar': return <CalendarDays size={size} className={className} />;
    case 'team': return <Users size={size} className={className} />;
    case 'trash': return <Trash2 size={size} className={className} />;
    default: return <FileText size={size} className={className} />;
  }
};

export default function App() {
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [trash, setTrash] = useState([]);
  const [users, setUsers] = useState(MOCK_USERS);
  const [activePageId, setActivePageId] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // --- ESTADOS DE GOOGLE CALENDAR REAL ---
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [events, setEvents] = useState([]);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [newColumnName, setNewColumnName] = useState('');
  const [currentProjectView, setCurrentProjectView] = useState('board'); // 'board' o 'list'
  
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskContent, setEditingTaskContent] = useState('');

  const [drawerTask, setDrawerTask] = useState(null);
  const [quickNoteText, setQuickNoteText] = useState('');

  const [drawerUser, setDrawerUser] = useState(null);

  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);
  const [reportFilters, setReportFilters] = useState({ projectId: 'all', status: 'all', assigneeId: 'all' });

  // --- CONFIGURACIONES E INTEGRACIONES ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');

  // --- SISTEMA DE LOGIN ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [dashboardReport, setDashboardReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialMount = useRef(true);
  const isRemoteUpdate = useRef(false);

  // --- SISTEMA DE TOASTS MINIMALISTAS ---
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000); // Se oculta después de 3 segundos
  };

  // --- CARGAR LIBRERÍA DE GOOGLE (GIS) Y FUENTE INTER ---
  useEffect(() => {
    // 1. Cargar API de Google
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    // 2. Cargar tipografía Inter
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // 3. Aplicar Inter globalmente
    const style = document.createElement('style');
    style.innerHTML = `
      body, .font-sans, input, textarea, select, button {
        font-family: 'Inter', sans-serif !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // 1. Escuchador de Autenticación de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        if (user) {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
            setIsCloudSynced(false);
        }
    });
    return () => unsubscribe();
  }, []);

  // 2. Cargar datos de Firestore (Opción B: Colecciones separadas)
  const [globalTasks, setGlobalTasks] = useState([]);

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
      // 1. Escuchar Páginas
      const unsubPages = onSnapshot(pagesCol, snap => {
        const pData = snap.docs.map(d => d.data());
        setPages(pData);
      });
      // 2. Escuchar Tareas
      const unsubTasks = onSnapshot(tasksCol, snap => {
        const tData = snap.docs.map(d => d.data());
        setGlobalTasks(tData);
      });
      // 3. Escuchar Meta (Users, Trash, Settings)
      const unsubMeta = onSnapshot(metaDoc, snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.users) setUsers(data.users);
          if (data.trash) setTrash(data.trash);
          if (data.googleClientId) setGoogleClientId(data.googleClientId);
        }
      });

      setIsCloudSynced(true);

      // Guardamos referencias para desmontar si es necesario (useEffect cleanup no puede manejar promesas de forma limpia aquí)
      window.__unsubFirestore = () => { unsubPages(); unsubTasks(); unsubMeta(); };
    });

    return () => { if (window.__unsubFirestore) window.__unsubFirestore(); };
  }, [isAuthenticated]);


  // (El useEffect de auto-guardado con debounce ha sido eliminado para la Opción A - Sincronización explícita)  // Determinar página activa
  let activePage;
  if (activePageId === 'dashboard') {
    activePage = { id: 'dashboard', title: 'Dashboard', icon: 'dashboard', type: 'dashboard' };
  } else if (activePageId === 'calendar') {
    activePage = { id: 'calendar', title: 'Calendario y Reuniones', icon: 'calendar', type: 'calendar' };
  } else if (activePageId === 'team') {
    activePage = { id: 'team', title: 'Equipo y Roles', icon: 'team', type: 'team' };
  } else if (activePageId === 'trash') {
    activePage = { id: 'trash', title: 'Papelera', icon: 'trash', type: 'trash' };
  } else {
    activePage = pages.find(p => p.id === activePageId) || { id: 'empty', title: 'Sin páginas', type: 'empty' };
    if (activePage.type === 'project') {
      activePage = { ...activePage, tasks: globalTasks.filter(t => t.projectId === activePage.id) };
    }
  }
    
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current && activePage.type === 'doc') {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = contentRef.current.scrollHeight + 'px';
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
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', editingTaskId), { content: editingTaskContent.trim() });
      } catch (e) { showToast('Error al guardar', 'error'); }
    }
    setEditingTaskId(null);
  };

  // --- Lógica de Drag & Drop ---
  const handleDragStart = (e, taskId) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    const payload = JSON.stringify({ type: 'task', id: taskId });
    e.dataTransfer.setData('text/plain', payload);
  };

  const handleColumnDragStart = (e, colId) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    const payload = JSON.stringify({ type: 'column', id: colId });
    e.dataTransfer.setData('text/plain', payload);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const payloadStr = e.dataTransfer.getData('text/plain');
      if (!payloadStr) return;
      
      const payload = JSON.parse(payloadStr);
      
      if (payload.type === 'task') {
        handleUpdateTaskStatus(payload.id, newStatus);
      } else if (payload.type === 'column') {
        const draggedColId = payload.id;
        if (draggedColId && draggedColId !== newStatus) {
          const newCols = [...(activePage.columns || DEFAULT_COLUMNS)];
          const draggedIdx = newCols.findIndex(c => c.id === draggedColId);
          const targetIdx = newCols.findIndex(c => c.id === newStatus);
          if (draggedIdx > -1 && targetIdx > -1) {
            const [removed] = newCols.splice(draggedIdx, 1);
            newCols.splice(targetIdx, 0, removed);
            updateActivePage({ columns: newCols });
          }
        }
      }
    } catch (err) {
      console.error("Error en Drag and Drop:", err);
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
      notes: []
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
      notes: []
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
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), { status: newStatus });
    } catch (e) { showToast('Error', 'error'); }
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

  const saveDrawerUser = () => {
    if (!drawerUser || !drawerUser.name.trim()) return;
    const initials = drawerUser.name.trim().split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'U';
    const userToSave = { ...drawerUser, initials, name: drawerUser.name.trim() };
    
    if (drawerUser.isNew) {
      delete userToSave.isNew;
      setUsers([...users, userToSave]);
    } else {
      setUsers(users.map(u => u.id === userToSave.id ? userToSave : u));
    }
    setDrawerUser(null);
  };

  const deleteUser = (id, e) => {
    if (e) e.stopPropagation();
    setUsers(users.filter(u => u.id !== id));
    if (drawerUser && drawerUser.id === id) setDrawerUser(null);
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

  // --- Lógica del Sistema Base ---
  
  const deletePage = async (id, e) => {
    if (e) e.stopPropagation();
    const pageToDelete = pages.find(p => p.id === id);
    if (!pageToDelete) return;
    
    const newTrash = [...trash, pageToDelete];
    setTrash(newTrash);
    setPages(pages.filter(p => p.id !== id));
    
    if (activePageId === id) {
      setActivePageId(pages.filter(p => p.id !== id).length > 0 ? pages.filter(p => p.id !== id)[0].id : 'trash');
    }
    
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'pages', id));
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info'), { trash: newTrash });
      await batch.commit();
      showToast('Enviado a papelera', 'success');
    } catch (e) { showToast('Error', 'error'); }
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
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info'), { trash: newTrash });
      await batch.commit();
      showToast('Restaurado', 'success');
    } catch (e) { showToast('Error', 'error'); }
  };

  const permanentlyDeletePage = async (id) => {
    const newTrash = trash.filter(p => p.id !== id);
    setTrash(newTrash);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'meta', 'info'), { trash: newTrash });
      showToast('Eliminado', 'success');
    } catch (e) { showToast('Error', 'error'); }
  };
  
  const updateActivePage = async (updates, silent = true) => {
    setPages(pages.map(p => p.id === activePageId ? { ...p, ...updates } : p));
    try {
      if (!silent) setIsSaving(true);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pages', activePageId), updates);
      if (!silent) { setIsSaving(false); showToast('Guardado', 'success'); }
    } catch (e) { 
      if (!silent) { setIsSaving(false); showToast('Error', 'error'); }
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
          color: 'bg-blue-500/20 text-blue-300'
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error("Error al obtener eventos de Google:", error);
    }
  };

  const handleConnectGoogle = () => {
    if (!googleClientId || googleClientId.trim() === '') {
      setIsSettingsOpen(true);
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
    const prompt = `Actúa como un Tech Lead o Senior Designer. Crea un checklist paso a paso para resolver de forma experta la siguiente tarea: "${drawerTask.content}". Devuelve solo los pasos, como una lista en viñetas. Máximo 5 pasos concisos.`;
    const result = await callGeminiAPI(prompt);
    if (result && !result.includes("❌ Error")) {
       setDrawerTask(prev => ({
         ...prev,
         description: (prev.description ? prev.description + '\n\n' : '') + '✨ **Plan de Acción sugerido por IA:**\n' + result
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
      // --- LÓGICA DE LOGIN ---
      // Usa autenticación anónima para acceso rápido.
      // Para producción con usuarios reales, habilita signInWithEmailAndPassword.
      await signInAnonymously(auth);
    } catch (error) {
      console.error(error);
      setLoginError('Error de conexión. Verifica que la autenticación anónima esté habilitada en Firebase Console → Authentication → Sign-in method → Anonymous.');
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

  // --- PANTALLA DE LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className={`flex items-center justify-center min-h-screen w-full font-sans overflow-hidden transition-colors duration-500 relative z-0 ${isDarkMode ? 'bg-[#08080a] text-gray-100' : 'bg-[#f4f4f9] text-gray-800'}`}>
        {/* GLOBAL BACKGROUND BLOBS */}
        <div className={`absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full mix-blend-screen filter blur-[120px] opacity-40 pointer-events-none -z-10 ${isDarkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none -z-10 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-300'}`}></div>
        <div className={`absolute bottom-[-10%] left-[20%] w-[40rem] h-[40rem] rounded-full mix-blend-screen filter blur-[120px] opacity-30 pointer-events-none -z-10 ${isDarkMode ? 'bg-emerald-900' : 'bg-emerald-300'}`}></div>

        <div className="absolute top-6 right-6">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-white/60 text-gray-600'} backdrop-blur-md border ${isDarkMode ? 'border-white/10' : 'border-gray-200 bg-white/40'}`} title="Cambiar tema">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className={`w-full max-w-sm p-6 sm:p-8 rounded-[2rem] flex flex-col backdrop-blur-2xl transition-all border shadow-[0_0_50px_rgba(0,0,0,0.3)] ${isDarkMode ? 'bg-[#1a1a1a]/40 border-white/10' : 'bg-white/60 border-white/40'}`}>
          <div className="flex justify-center mb-5">
            <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'bg-blue-100 text-blue-600 border border-white/50'}`}>
              <Lock size={24} />
            </div>
          </div>
          
          <h2 className={`text-2xl font-light text-center tracking-wide mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Acceso al Sistema</h2>
          <p className={`text-center text-xs font-light tracking-wide mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ingresa tus credenciales para continuar al panel de control.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block text-[9px] font-light uppercase tracking-[0.2em] mb-1.5 ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Correo Electrónico</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Mail size={16} />
                </div>
                <input 
                  type="email" 
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className={`w-full text-sm font-light tracking-wide pl-10 pr-3 py-2.5 rounded-xl outline-none transition-all shadow-inner ${currentGlassInput}`} 
                  placeholder="admin@agencia.com" 
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-[9px] font-light uppercase tracking-[0.2em] mb-1.5 ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contraseña</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Key size={16} />
                </div>
                <input 
                  type="password" 
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className={`w-full text-sm font-light tracking-wide pl-10 pr-3 py-2.5 rounded-xl outline-none transition-all shadow-inner ${currentGlassInput}`} 
                  placeholder="••••••••" 
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className={`p-2 rounded-lg text-xs font-light tracking-wide flex items-center justify-center text-center animate-in fade-in zoom-in duration-300 ${isDarkMode ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isAuthenticating}
              className={`w-full flex items-center justify-center gap-2 mt-2 py-3 rounded-xl text-sm font-light tracking-wide transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 ${isDarkMode ? 'bg-blue-600/90 text-white border border-blue-500/50 hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  Iniciar Sesión <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className={`text-[10px] font-light tracking-widest uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Sistema Centralizado
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full font-sans overflow-hidden transition-colors duration-500 relative z-0 ${isDarkMode ? 'bg-[#08080a] text-gray-100' : 'bg-[#f4f4f9] text-gray-800'}`}>
      
      {/* GLOBAL BACKGROUND BLOBS (Glassmorphism Core) */}
      <div className={`absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] rounded-full mix-blend-screen filter blur-[120px] opacity-40 pointer-events-none -z-10 ${isDarkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
      <div className={`absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none -z-10 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-300'}`}></div>
      <div className={`absolute bottom-[-10%] left-[20%] w-[40rem] h-[40rem] rounded-full mix-blend-screen filter blur-[120px] opacity-30 pointer-events-none -z-10 ${isDarkMode ? 'bg-emerald-900' : 'bg-emerald-300'}`}></div>

      {/* Sidebar Overlay on Mobile */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <div className={`flex flex-col border-r transition-all duration-300 z-50 backdrop-blur-3xl absolute md:relative h-full ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 w-0 hidden md:flex md:w-16'} ${isDarkMode ? 'bg-[#0f0f11]/95 border-white/5' : 'bg-[#f8f9fa]/95 border-black/5'}`}>
        
        {/* Main Navigation Area */}
        <div className="pt-5 pb-4 px-3 border-b border-white/5 space-y-1">
          <button 
            onClick={() => { setActivePageId('dashboard'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} 
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all tracking-wide ${activePageId === 'dashboard' ? (isDarkMode ? 'bg-white/10 text-white font-medium' : 'bg-black/5 text-gray-900 font-medium') : (isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white font-light' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900 font-light')}`}
          >
            <LayoutDashboard size={18} className={activePageId === 'dashboard' ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : ''} />
            {isSidebarOpen && <span>Mi Espacio</span>}
          </button>
          
          <button 
            onClick={() => { setActivePageId('calendar'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} 
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all tracking-wide ${activePageId === 'calendar' ? (isDarkMode ? 'bg-white/10 text-white font-medium' : 'bg-black/5 text-gray-900 font-medium') : (isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white font-light' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900 font-light')}`}
          >
            <CalendarDays size={18} className={activePageId === 'calendar' ? (isDarkMode ? 'text-purple-400' : 'text-purple-600') : ''} />
            {isSidebarOpen && <span>Calendario</span>}
          </button>

          <button 
            onClick={() => { setActivePageId('team'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} 
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all tracking-wide ${activePageId === 'team' ? (isDarkMode ? 'bg-white/10 text-white font-medium' : 'bg-black/5 text-gray-900 font-medium') : (isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white font-light' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900 font-light')}`}
          >
            <Users size={18} className={activePageId === 'team' ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : ''} />
            {isSidebarOpen && <span>Equipo</span>}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-3 pb-3 mb-1 border-b border-white/5 space-y-1 mt-3">
          <button onClick={() => { addPage(); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-3 py-2 text-xs rounded-xl transition-colors tracking-wide font-light ${isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`}>
            <Plus size={16} />{isSidebarOpen && <span>Nueva página</span>}
          </button>
          <button onClick={() => { addProject(); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-3 py-2 text-xs rounded-xl transition-colors tracking-wide font-light ${isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`}>
            <Briefcase size={16} />{isSidebarOpen && <span>Nuevo proyecto</span>}
          </button>
          <button onClick={() => { openNewTaskDrawer('todo'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-3 py-2 text-xs rounded-xl transition-colors tracking-wide font-medium ${isDarkMode ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}>
            <CheckSquare size={16} />{isSidebarOpen && <span>Nueva tarea</span>}
          </button>
        </div>

        {/* Pages List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5 custom-scrollbar">
          {isSidebarOpen && <div className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-3 mt-1 mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Proyectos y Docs</div>}
          {pages.map(page => (
            <div key={page.id} onClick={() => { setActivePageId(page.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs tracking-wide transition-all ${activePageId === page.id ? (isDarkMode ? 'bg-white/10 font-medium text-white' : 'bg-black/5 font-medium text-gray-900') : (isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white font-light' : 'hover:bg-black/5 text-gray-500 hover:text-gray-900 font-light')}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <span className={`shrink-0 ${activePageId === page.id ? (isDarkMode ? 'text-gray-200' : 'text-gray-700') : (isDarkMode ? 'text-gray-500 group-hover:text-gray-300' : 'text-gray-400 group-hover:text-gray-600')}`}>
                  <IconRenderer name={page.icon} size={14} />
                </span>
                {isSidebarOpen && <span className="truncate">{page.title || 'Sin título'}</span>}
              </div>
              {isSidebarOpen && <button onClick={(e) => { e.stopPropagation(); deletePage(page.id, e); }} className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-gray-500 hover:bg-white/10 hover:text-red-400' : 'text-gray-400 hover:bg-black/10 hover:text-red-500'}`}><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>

        <div className={`p-3 border-t ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
          <button onClick={() => { setActivePageId('trash'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl tracking-wide transition-all ${activePageId === 'trash' ? (isDarkMode ? 'bg-red-500/10 text-red-400 font-medium' : 'bg-red-50 text-red-600 font-medium') : (isDarkMode ? 'text-gray-400 hover:bg-white/5 font-light' : 'text-gray-500 hover:bg-black/5 font-light')}`}>
            <div className="flex items-center gap-3">
              <Trash2 size={14} className={activePageId === 'trash' ? (isDarkMode ? 'text-red-400' : 'text-red-600') : ''} />
              {isSidebarOpen && <span>Papelera</span>}
            </div>
            {isSidebarOpen && trash.length > 0 && <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-black/10 text-gray-600'}`}>{trash.length}</span>}
          </button>
          
          {/* BOTON DE CERRAR SESION */}
          <button onClick={() => { handleLogout(); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`mt-2 flex items-center gap-3 w-full px-3 py-2 text-xs rounded-xl tracking-wide transition-colors font-light ${isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`}>
            <LogOut size={14} />{isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* Floating Topbar */}
        <div className={`h-12 m-4 rounded-xl flex items-center px-4 justify-between shrink-0 border ${isDarkMode ? 'bg-[#1a1a1a]/40 backdrop-blur-md border-white/5 shadow-sm' : 'bg-white/40 backdrop-blur-md border-white/40 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-white/60 text-gray-600'}`}><Menu size={18} /></button>
            <div className={`text-sm flex items-center gap-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <IconRenderer name={activePage.icon} size={14} />
              <span className="truncate max-w-[200px]">{activePage.title || 'Sin título'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            
            {/* ESTADO DE SINCRONIZACIÓN NUBE */}
            <div className={`hidden md:flex text-[9px] px-2.5 py-1 rounded-md font-bold tracking-[0.1em] uppercase items-center gap-1.5 transition-all ${isDarkMode ? 'bg-white/5 text-gray-400 border border-white/5' : 'bg-black/5 text-gray-500 border border-black/5'}`}>
              {isSaving ? (
                <><RefreshCw size={10} className="animate-spin text-blue-400" /> Guardando</>
              ) : (
                <><Cloud size={10} className={isDarkMode ? "text-emerald-400" : "text-emerald-600"} /> Sincronizado</>
              )}
            </div>

            <button onClick={() => setIsSettingsOpen(true)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'}`} title="Ajustes e Integraciones"><Settings size={16} /></button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-gray-600'}`} title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>{isDarkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
            
            {/* Eliminar Proyecto desde el Header */}
            {(activePage.type === 'project' || activePage.type === 'doc') ? (
              <button onClick={(e) => deletePage(activePageId, e)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-600 hover:text-red-600'}`} title="Eliminar"><Trash2 size={16} /></button>
            ) : (
              <div className="w-8"></div> /* Spacer para mantener alineación */
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className={`flex-1 overflow-y-auto pb-12 pt-4 scroll-smooth custom-scrollbar ${activePage.type === 'project' ? 'px-4 md:px-8 lg:px-10' : 'px-6 md:px-12 lg:px-24'}`}>
          <div className={`mx-auto ${activePage.type === 'project' ? 'max-w-[1800px]' : 'max-w-4xl'}`}>
            
            {/* VISTA: DASHBOARD */}
            {activePage.type === 'dashboard' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-blue-100 text-blue-600 border border-white/50'}`}>
                      <LayoutDashboard size={24} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Resumen del Espacio</h1>
                      <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Métricas y progreso en tiempo real.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsReportDrawerOpen(true)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-white/10 text-white shadow-white/5 hover:bg-white/20 border border-white/10' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                    <Download size={16} /> Exportar Informes
                  </button>
                </div>

                {/* Tarjetas de Métricas Generales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className={`p-5 rounded-2xl ${currentGlassPanel} hover:-translate-y-0.5 transition-transform duration-300`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Proyectos</h3>
                      <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}><FolderOpen size={16} /></div>
                    </div>
                    <p className="text-3xl font-bold">{projectsList.length}</p>
                  </div>
                  
                  <div className={`p-5 rounded-2xl ${currentGlassPanel} hover:-translate-y-0.5 transition-transform duration-300`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pendientes</h3>
                      <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}><CircleDashed size={16} /></div>
                    </div>
                    <p className="text-3xl font-bold">{allTasksGlobal.filter(t => t.status !== 'done').length}</p>
                  </div>

                  <div className={`p-5 rounded-2xl ${currentGlassPanel} hover:-translate-y-0.5 transition-transform duration-300`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completadas</h3>
                      <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}><CheckCircle2 size={16} /></div>
                    </div>
                    <p className="text-3xl font-bold">{allTasksGlobal.filter(t => t.status === 'done').length}</p>
                  </div>
                </div>

                {/* Lista de Proyectos con Progreso */}
                <div className={`p-6 rounded-2xl mb-6 ${currentGlassPanel}`}>
                  <h3 className={`text-lg font-semibold mb-5 flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    <BarChart3 size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-500'} /> 
                    Progreso por Proyecto
                  </h3>
                  
                  <div className="space-y-5">
                    {projectsList.length > 0 ? projectsList.map(project => {
                      const pTasks = project.tasks || [];
                      const pDone = pTasks.filter(t => t.status === 'done').length;
                      const pTotal = pTasks.length;
                      const progressPercent = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;
                      
                      return (
                        <div key={project.id} className="group">
                          <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setActivePageId(project.id)}>
                            <div className="flex items-center gap-2 font-medium text-sm hover:underline decoration-white/30 underline-offset-4">
                              <span className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                                <IconRenderer name={project.icon} size={14} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                              </span>
                              {project.title}
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10 text-gray-200' : 'bg-black/10 text-gray-800'}`}>{progressPercent}%</span>
                          </div>
                          <div className={`h-2 w-full rounded-full overflow-hidden backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-white/50'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${progressPercent === 100 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} 
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className={`text-xs mt-2 flex justify-end gap-3 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="flex items-center gap-1"><CheckCircle2 size={12} className={isDarkMode ? 'text-green-400' : 'text-green-600'} /> {pDone} hechas</span>
                            <span className="flex items-center gap-1"><ListTodo size={12} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} /> {pTotal} total</span>
                          </div>
                        </div>
                      )
                    }) : (
                      <div className={`text-center py-6 text-sm italic ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>No tienes proyectos activos para mostrar métricas.</div>
                    )}
                  </div>
                </div>

                {/* AI Dashboard Report */}
                <div className={`p-6 rounded-2xl ${glassPanelDark} relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 rounded-full blur-[40px] pointer-events-none -z-10"></div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
                    <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-100'}`}>
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        <Sparkles size={16} />
                      </div>
                      Análisis Estratégico de IA
                    </h3>
                    <button 
                      onClick={generateDashboardReport}
                      disabled={isGeneratingReport}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50 hover:-translate-y-0.5 ${isDarkMode ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/20 border border-purple-500/50' : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border border-purple-400'}`}
                    >
                      {isGeneratingReport ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />} 
                      {dashboardReport ? 'Actualizar Reporte' : 'Generar Reporte'}
                    </button>
                  </div>
                  {dashboardReport ? (
                    <div className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-100'} p-4 rounded-xl bg-black/20 backdrop-blur-md border border-white/5`}>
                      {dashboardReport.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0">{line.replace(/\*\*/g, '')}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-black/10 border border-white/5 backdrop-blur-sm text-center">
                      <p className={`text-xs italic ${isDarkMode ? 'text-purple-300/70' : 'text-purple-200/90'}`}>
                        Haz clic en "Generar Reporte" para que Gemini analice el estado actual y te dé un resumen ejecutivo detallado.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VISTA: EQUIPO Y ROLES */}
            {activePage.type === 'team' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-emerald-100 text-emerald-600 border border-white/50'}`}>
                  <Users size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Directorio del Equipo</h1>
                  <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestiona roles y cargos para asignarlos a proyectos.</p>
                </div>
              </div>
              <button onClick={openNewUserDrawer} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-emerald-600 text-white shadow-emerald-900/50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
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
                      <p className={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.job}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto border-t pt-3 border-white/10">
                    <div className="flex items-center gap-1.5">
                      <Shield size={14} className={user.role === 'Admin' ? 'text-red-400' : (user.role === 'Miembro' ? 'text-blue-400' : 'text-gray-400')} />
                      <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.role}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDrawerUser(user)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400 hover:text-blue-400' : 'hover:bg-black/5 text-gray-500 hover:text-blue-600'}`} title="Editar Usuario"><Pencil size={14} /></button>
                      <button onClick={(e) => deleteUser(user.id, e)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-100 text-gray-500 hover:text-red-600'}`} title="Eliminar Usuario"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

            {/* Cabecera común para Doc y Project (Minimalista e Inline) */}
            {activePage.type !== 'trash' && activePage.type !== 'empty' && activePage.type !== 'dashboard' && activePage.type !== 'calendar' && activePage.type !== 'team' && (
              <div className="mb-8">
                <div className="group relative flex items-center gap-3">
                   <div className={`p-2.5 rounded-xl transition-colors backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-200 shadow-sm' : 'bg-white/60 border-gray-200 text-gray-700 shadow-sm'}`}>
                     <IconRenderer name={activePage.icon} size={24} />
                   </div>
                   <input type="text" value={activePage.title} onChange={(e) => updateActivePage({ title: e.target.value })} placeholder="Título de la página" className={`w-full text-3xl font-bold border-none outline-none bg-transparent resize-none focus:ring-0 tracking-tight ${isDarkMode ? 'text-white placeholder-gray-700' : 'text-gray-900 placeholder-gray-400'}`} />
                </div>
                
                {/* Control de Project Lead si es proyecto */}
                {activePage.type === 'project' && (
                  <div className="flex items-center gap-2 mt-4 ml-14">
                    <UserCircle size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Líder:</span>
                    <select 
                      value={activePage.leadId || ''} 
                      onChange={(e) => updateActivePage({ leadId: e.target.value })} 
                      className={`px-2 py-1 text-xs font-semibold rounded-lg outline-none cursor-pointer transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10' : 'bg-white/60 border-gray-200 text-gray-700 hover:bg-white'}`}
                    >
                      <option value="">Sin Asignar</option>
                      {users.map(u => <option key={u.id} value={u.id} className="text-black">{u.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Vista de Papelera */}
            {activePage.type === 'trash' && (
              <div className="animate-in fade-in duration-300">
                <div className={`flex items-center gap-3 mb-8 pb-4 border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
                  <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-red-500/20 text-red-400 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-red-100 text-red-600 border border-white/50'}`}>
                    <Trash2 size={24} />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Papelera</h1>
                </div>
                {trash.length === 0 ? (
                  <div className={`text-center py-16 rounded-2xl ${currentGlassPanel}`}><Trash2 size={40} className={`mx-auto mb-4 opacity-50 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} /><p className="text-sm font-medium opacity-70">La papelera está vacía.</p></div>
                ) : (
                  <div className="space-y-3">
                    {trash.map(page => (
                      <div key={page.id} className={`flex items-center justify-between p-4 rounded-xl transition-all hover:-translate-y-0.5 ${currentGlassPanel}`}>
                        <div className="flex items-center gap-3">
                          <span className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-black/5 text-gray-600'}`}><IconRenderer name={page.icon} size={16} /></span>
                          <span className="font-semibold text-sm">{page.title || 'Sin título'}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => restorePage(page.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDarkMode ? 'bg-white/10 text-gray-200 hover:bg-white/20' : 'bg-white/80 text-gray-800 hover:bg-white'}`}><RotateCcw size={14} /> Restaurar</button>
                          <button onClick={() => permanentlyDeletePage(page.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDarkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/20' : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'}`}><Trash2 size={14} /> Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activePage.type === 'empty' && (
               <div className={`text-center py-24 rounded-2xl ${currentGlassPanel}`}><p className="mb-4 text-base opacity-70 font-medium">No tienes páginas activas.</p><button onClick={addPage} className={`px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition-transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Crear tu primera página</button></div>
            )}

            {/* VISTA DE DOCUMENTO */}
            {activePage.type === 'doc' && (
              <>
                <div className={`flex flex-wrap gap-2 mb-6 p-2 rounded-xl animate-in fade-in duration-300 ${isDarkMode ? 'bg-white/5 border border-white/5 backdrop-blur-md' : 'bg-white/40 border border-white/40 backdrop-blur-md shadow-sm'}`}>
                  <span className={`flex items-center px-2 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Herramientas IA</span>
                  <button onClick={() => handleAiAction('improve')} disabled={isGeneratingAI || !activePage.content.trim()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>{isGeneratingAI ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />} Mejorar</button>
                  <button onClick={() => handleAiAction('summarize')} disabled={isGeneratingAI || !activePage.content.trim()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>{isGeneratingAI ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} Resumir</button>
                  <button onClick={() => handleAiAction('continue')} disabled={isGeneratingAI || !activePage.content.trim()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>{isGeneratingAI ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} Continuar</button>
                </div>
                <textarea ref={contentRef} value={activePage.content} onChange={(e) => updateActivePage({ content: e.target.value })} placeholder="Presiona '/' para comandos o empieza a escribir..." className={`w-full text-base leading-relaxed border-none outline-none bg-transparent resize-none focus:ring-0 min-h-[300px] font-medium ${isDarkMode ? 'text-gray-300 placeholder-gray-600' : 'text-gray-700 placeholder-gray-400'}`} />
              </>
            )}

            {/* KANBAN BOARD & LIST (Proyectos) */}
            {activePage.type === 'project' && (
              <div className="mt-6 animate-in fade-in duration-500 relative z-0">
                <div className={`flex items-center justify-between mb-6 border-b pb-3 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {currentProjectView === 'board' ? <ListTodo size={16} /> : <AlignLeft size={16} />}
                    <span>{currentProjectView === 'board' ? 'Tablero de Tareas' : 'Lista de Tareas'}</span>
                  </div>
                  <div className={`flex p-1 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                    <button onClick={() => setCurrentProjectView('board')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentProjectView === 'board' ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}>Tablero</button>
                    <button onClick={() => setCurrentProjectView('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentProjectView === 'list' ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}>Lista</button>
                  </div>
                </div>

                {currentProjectView === 'board' ? (
                /* REDUJE EL GAP-5 A GAP-4 PARA MAS ESPACIO */
                <div className="flex flex-row gap-4 overflow-x-auto pb-6 items-start min-h-[50vh] snap-x custom-scrollbar w-full">
                  {(activePage.columns || DEFAULT_COLUMNS).map(col => (
                    <div 
                      key={col.id} 
                      draggable
                      onDragStart={(e) => handleColumnDragStart(e, col.id)}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={(e) => handleDrop(e, col.id)}
                      className={`snap-center shrink-0 w-[210px] rounded-2xl p-3 flex flex-col backdrop-blur-2xl transition-all border shadow-lg ${getColumnBgClass(col.color, isDarkMode)}`}
                    >
                      {/* HEADER COLUMNA */}
                      <div className="flex items-center justify-between mb-4 group/col px-1">
                        <div className="flex items-center gap-2">
                          <button 
                             onClick={(e) => { e.stopPropagation(); cycleColumnColor(col.id); }}
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
                              className={`font-light text-xs px-2 py-0.5 rounded-md outline-none bg-black/20 backdrop-blur-md border border-white/20 w-28 text-white shadow-inner`}
                            />
                          ) : (
                            <button 
                               onClick={(e) => { e.stopPropagation(); startEditingColumn(col); }}
                               title="Clic para editar nombre"
                               className={`font-light text-xs px-2 py-0.5 rounded-md transition-all truncate max-w-[130px] hover:scale-105 shadow-sm ${getColorClass(col.color)} cursor-text`}
                            >
                              {col.title}
                            </button>
                          )}
                          
                          <span className={`opacity-0 group-hover/col:opacity-100 transition-opacity text-[8px] font-medium w-4 h-4 flex items-center justify-center rounded-full shadow-sm border ${isDarkMode ? 'bg-white/10 text-white border-white/20' : 'bg-white/80 text-gray-800 border-white/50'}`}>
                            {(activePage.tasks || []).filter(t => t.status === col.id).length}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition-opacity">
                          <button onClick={() => openNewTaskDrawer(col.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-white text-gray-800'}`} title="Añadir tarea aquí">
                            <Plus size={14} />
                          </button>
                          <button onClick={() => handleDeleteColumn(col.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-red-500/10 hover:bg-red-500/40 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-600'}`} title="Eliminar columna">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      
                      {/* LISTA DE TAREAS (DRAGGABLE) */}
                      <div className="space-y-2 flex-1 min-h-[40px]">
                        {(activePage.tasks || []).filter(t => t.status === col.id).map(task => {
                          const assignedUser = task.assigneeId ? users.find(u => u.id === task.assigneeId) : null;
                          
                          return (
                            <div 
                              key={task.id} 
                              draggable={editingTaskId !== task.id}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              className={`group p-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-300 ${editingTaskId !== task.id ? 'hover:-translate-y-0.5 hover:shadow-md' : ''} relative backdrop-blur-xl ${
                                isDarkMode 
                                  ? 'bg-white/[0.05] border-white/10 hover:border-white/20 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)] hover:bg-white/[0.08]' 
                                  : 'bg-white/80 border-white hover:border-blue-200 shadow-sm hover:bg-white'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                {editingTaskId === task.id ? (
                                  <textarea
                                    autoFocus
                                    value={editingTaskContent}
                                    onChange={(e) => {
                                      setEditingTaskContent(e.target.value);
                                      // Actualización en tiempo real para UI
                                      setGlobalTasks(globalTasks.map(t =>
                                        t.id === task.id ? { ...t, content: e.target.value } : t
                                      ));
                                      // Guardado síncrono en Firebase (sin await para no bloquear UI)
                                      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { content: e.target.value }).catch(() => {});
                                    }}
                                    onBlur={() => setEditingTaskId(null)}
                                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setEditingTaskId(null); } }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`w-full text-xs font-light leading-tight px-1.5 py-1 rounded-lg outline-none bg-black/20 backdrop-blur-md border border-white/20 text-white shadow-inner resize-none overflow-hidden pr-6 mr-2`}
                                    rows={2}
                                  />
                                ) : (
                                  <p 
                                    onClick={(e) => startEditingTask(e, task)}
                                    title="Clic para editar título"
                                    className={`text-xs font-light leading-tight cursor-text transition-colors hover:text-blue-400 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} pr-6 w-full`}
                                  >
                                    {task.content}
                                  </p>
                                )}
                                <button 
                                  onClick={() => setDrawerTask({ ...task, projectId: activePage.id })}
                                  className={`absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all shrink-0 backdrop-blur-xl shadow-sm ${isDarkMode ? 'bg-white/20 text-white hover:bg-blue-500 border border-white/10' : 'bg-white/90 text-gray-800 hover:text-white hover:bg-blue-500 border border-gray-200'}`}
                                  title="Editar detalles completos"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>

                              {/* Accesos rápidos a Meet en la Tarjeta */}
                              {task.meetLink && (
                                <a href={task.meetLink} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-2 py-1 mb-2 rounded-md text-[10px] font-bold transition-all shadow-sm ${isDarkMode ? 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 border border-blue-500/20' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'}`}>
                                  <Video size={10} /> Unirse a Meet
                                </a>
                              )}

                              <div className="flex items-center justify-between mt-1">
                                {/* Badge flotante de Notas */}
                                {task.notes && task.notes.length > 0 ? (
                                  <div className="relative group/tooltip w-max">
                                    <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-semibold cursor-help transition-all shadow-sm ${
                                      isDarkMode 
                                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30' 
                                        : 'bg-yellow-100/80 text-yellow-700 border border-yellow-200 hover:bg-yellow-200'
                                    }`}>
                                      <MessageSquare size={10} /> {task.notes.length}
                                    </span>
                                    
                                    {/* Tooltip flotante */}
                                    <div className={`absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl shadow-[0_5px_20px_-5px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-50 backdrop-blur-3xl border ${isDarkMode ? 'bg-gray-900/90 border-white/10' : 'bg-white/95 border-gray-200'}`}>
                                      <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-2 pb-1.5 border-b ${isDarkMode ? 'text-gray-400 border-white/10' : 'text-gray-500 border-gray-100'}`}>Notas Históricas</h4>
                                      <div className="space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                        {task.notes.map(note => (
                                          <div key={note.id} className="text-xs">
                                            <span className={`block text-[9px] font-medium mb-0.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{note.date}</span>
                                            <p className={`leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{note.text}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : <div />}

                                {/* Avatar Assignee */}
                                {assignedUser && (
                                  <div title={`Asignado a: ${assignedUser.name}`} className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-inner bg-gradient-to-br ${assignedUser.color}`}>
                                    {assignedUser.initials}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Botón "+ Nuevo" al final estilo Glass */}
                      <button 
                        onClick={() => openNewTaskDrawer(col.id)}
                        className={`mt-4 flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${isDarkMode ? 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-white/40 border-transparent text-gray-600 hover:bg-white/60 hover:text-gray-900'}`}
                      >
                        <Plus size={14} /> Añadir tarea
                      </button>
                    </div>
                  ))}

                  {/* Nueva Columna */}
                  <div className={`shrink-0 w-[210px] rounded-2xl p-3 border border-dashed flex items-start backdrop-blur-2xl transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/20 hover:bg-white/[0.05]' : 'bg-white/30 border-gray-400 hover:bg-white/50'}`}>
                    <div className="w-full flex flex-col gap-3">
                      <input type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()} placeholder="Nombre nueva columna..." className={`w-full text-sm font-medium rounded-xl px-3 py-2 outline-none transition-shadow shadow-inner ${isDarkMode ? glassInputDark : glassInputLight}`} />
                      <button onClick={handleAddColumn} className={`flex items-center justify-center gap-2 w-full p-2 rounded-xl transition-all text-xs font-semibold shadow-sm ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-gray-800 hover:bg-black/10'}`}><Plus size={14} /> Crear Columna</button>
                    </div>
                  </div>

                </div>
                ) : (
                  /* VISTA DE LISTA (LIST VIEW) */
                  <div className="space-y-6 pb-12">
                    {(activePage.columns || DEFAULT_COLUMNS).map(col => {
                      const colTasks = (activePage.tasks || []).filter(t => t.status === col.id);
                      return (
                        <div key={col.id} className={`rounded-xl border backdrop-blur-sm shadow-sm ${isDarkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white/50 border-gray-200'}`}>
                          {/* Encabezado del Grupo */}
                          <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'} rounded-t-xl`}>
                            <div className={`w-2.5 h-2.5 rounded-full shadow-inner ${COLUMN_COLORS.find(c => c.id === (col.color || 'gray'))?.dot || 'bg-gray-400'}`} />
                            <span className={`text-sm font-semibold tracking-wide ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{col.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-black/5 text-gray-600'}`}>{colTasks.length}</span>
                          </div>
                          {/* Lista de Tareas */}
                          <div className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                            {colTasks.length === 0 ? (
                              <div className={`px-4 py-3 text-xs italic font-light ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Sin tareas en esta sección.</div>
                            ) : (
                              colTasks.map(task => {
                                const assignedUser = task.assigneeId ? users.find(u => u.id === task.assigneeId) : null;
                                return (
                                  <div key={task.id} className={`group flex flex-col md:flex-row md:items-center justify-between px-4 py-3 transition-colors cursor-pointer gap-3 ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.03]'}`} onClick={() => setDrawerTask({ ...task, projectId: activePage.id })}>
                                    <div className="flex items-center gap-3 md:w-1/2">
                                      <div className={`p-0.5 rounded-md border flex shrink-0 items-center justify-center transition-colors ${isDarkMode ? 'border-gray-600 text-transparent group-hover:border-gray-400' : 'border-gray-400 text-transparent group-hover:border-gray-600'}`}>
                                        <CheckSquare size={14} className="opacity-0 group-hover:opacity-100" />
                                      </div>
                                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-black'}`}>{task.content}</span>
                                    </div>
                                    <div className="flex items-center gap-4 md:w-1/2 md:justify-end ml-7 md:ml-0">
                                      {task.meetLink && <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md opacity-70 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'bg-blue-500/20 text-blue-300 border border-blue-500/20' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}><Video size={10} /> Videollamada</span>}
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
                            {/* Añadir nueva tarea a esta lista */}
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
            )}

            {/* Vista Calendario */}
            {activePage.type === 'calendar' && (
              <div className="mt-8 space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
                  <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-purple-100 text-purple-600 border border-white/50'}`}>
                    <CalendarDays size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Calendario de Equipo</h1>
                    <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tus reuniones sincronizadas y generación de agendas.</p>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl ${currentGlassPanel}`}>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} /> Google Workspace (API Real)</h2>
                      <p className={`text-sm mt-1 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lee tus eventos reales y genera enlaces oficiales de Google Meet.</p>
                    </div>
                    
                    {!googleClientId ? (
                      <button onClick={() => setIsSettingsOpen(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-white/10 text-white shadow-white/5 hover:bg-white/20 border border-white/10' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                        <Settings size={16} /> Configurar Integración
                      </button>
                    ) : !isGoogleConnected ? (
                      <button onClick={handleConnectGoogle} disabled={isConnecting} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 ${isDarkMode ? 'bg-blue-600 text-white shadow-blue-900/50' : 'bg-blue-600 text-white'}`}>
                        {isConnecting ? <RefreshCw className="animate-spin" size={16} /> : <LogIn size={16} />} {isConnecting ? 'Conectando...' : 'Conectar Google'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold shadow-inner ${isDarkMode ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100/60 text-green-700 border-green-200'}`}><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Sincronizado</span>
                        <button onClick={handleDisconnectGoogle} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/20' : 'bg-black/5 text-gray-600 hover:text-red-600 hover:bg-red-100'}`}><LogOut size={14} /> Desconectar</button>
                      </div>
                    )}
                  </div>
                </div>

                {isGoogleConnected && (
                  <div className="space-y-5">
                    <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                      <h3 className="text-lg font-semibold">Próximos Eventos Reales (7 días)</h3>
                      <button onClick={handleCreateInstantMeetUI} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold shadow-sm ${isDarkMode ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 border border-blue-500/20' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'}`}><Video size={14} /> Crear Meet Real</button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {events.length > 0 ? events.map(event => (
                        <div key={event.id} className={`group flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl transition-all hover:-translate-y-0.5 ${currentGlassPanel}`}>
                          <div className="flex items-start gap-4">
                            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border backdrop-blur-md shadow-inner ${event.color} border-current/20`}>{event.date}</div>
                            <div>
                              <h4 className="text-base font-semibold mb-0.5 max-w-[250px] truncate">{event.title}</h4>
                              <div className={`flex items-center gap-1.5 text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}><Clock size={14} />{event.time}</div>
                            </div>
                          </div>
                          <div className="mt-4 md:mt-0 w-full md:w-auto flex flex-wrap gap-2 justify-start md:justify-end">
                            <button onClick={() => convertEventToTask(event)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                                <CheckSquare size={14} /> Convertir en Tarea
                            </button>
                            <button onClick={() => generateMeetingAgenda(event)} disabled={isGeneratingAI} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-sm ${isDarkMode ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                                {isGeneratingAI ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />} ✨ Agenda IA
                            </button>
                            {event.meetLink && (
                              <a href={event.meetLink} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${isDarkMode ? 'bg-blue-600/80 text-white hover:bg-blue-500 border border-blue-500/50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                <Video size={14} /> Unirse al Meet
                              </a>
                            )}
                          </div>
                        </div>
                      )) : (
                        <div className={`text-center py-10 text-sm font-medium italic rounded-2xl ${currentGlassPanel}`}>No tienes eventos agendados para los próximos días.</div>
                      )}
                    </div>
                  </div>
                )}
                {!isGoogleConnected && (
                  <div className={`rounded-2xl p-12 text-center border border-dashed ${isDarkMode ? 'border-white/10 bg-white/[0.02] backdrop-blur-xl' : 'border-gray-300 bg-white/40 backdrop-blur-xl'}`}>
                    <CalendarDays className={`mx-auto mb-4 opacity-40 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} size={40} />
                    <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Sincronización de API de Google</h3>
                    <p className={`text-sm font-medium max-w-lg mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {googleClientId 
                        ? "Haz clic en 'Conectar Google' arriba para autorizar el acceso y ver tus reuniones." 
                        : "Primero debes configurar tu ID de Cliente en los ajustes para poder conectar tu cuenta real de Google de forma segura."}
                    </p>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* Drawer Overlay (Task) */}
      {drawerTask && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setDrawerTask(null)} />}

      {/* Drawer (Task) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] shadow-[0_0_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 flex flex-col backdrop-blur-2xl ${drawerTask ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-[#0f0f11]/90 border-l border-white/10' : 'bg-white/90 border-l border-white/50'}`}>
        {drawerTask && (
          <>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-inner ${isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-blue-100 text-blue-600 border border-white/50'}`}><Briefcase size={18} /></div>
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
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-blue-50/50 border-blue-100'}`}>
                  <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-400' : 'text-blue-600'}`}>
                    <Calendar size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-500'} /> Google Workspace (API Real)
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
                           <a href={drawerTask.meetLink} target="_blank" rel="noopener noreferrer" className={`px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0 ${isDarkMode ? 'bg-blue-600/80 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Entrar</a>
                           <button onClick={() => setDrawerTask(p => ({...p, meetLink: ''}))} className="p-2 rounded-lg transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/30 border border-red-500/20 shrink-0" title="Quitar enlace"><X size={14}/></button>
                         </div>
                       ) : (
                         <button onClick={handleGenerateMeetForTask} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border shadow-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-white border-gray-200 text-blue-600 hover:bg-gray-50'}`}>
                            <Video size={14} /> Crear Evento y Generar Meet
                         </button>
                       )}
                     </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}><CalendarDays size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-500'} /> Arranca el</label>
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
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all shadow-sm disabled:opacity-50 hover:scale-105 ${isDarkMode ? 'bg-gradient-to-r from-purple-600/50 to-indigo-600/50 text-white border border-purple-500/30' : 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200'}`}
                    >
                      {isGeneratingAI ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} ✨ Plan IA
                    </button>
                  </div>
                  <textarea value={drawerTask.description || ''} onChange={(e) => setDrawerTask(prev => ({ ...prev, description: e.target.value }))} placeholder="Escribe enlaces importantes, notas de clientes..." rows={4} className={`w-full px-3 py-2 text-sm font-medium rounded-xl outline-none resize-none transition-all shadow-inner ${currentGlassInput}`} />
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
              <button onClick={saveDrawerTask} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-transform hover:scale-105 shadow-sm ${isDarkMode ? 'bg-blue-600 text-white shadow-blue-900/50' : 'bg-blue-600 text-white'}`}><Save size={16} /> Guardar Tarea</button>
            </div>
          </>
        )}
      </div>

      {/* Drawer Overlay (User) */}
      {drawerUser && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setDrawerUser(null)} />}

      {/* Drawer (User) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] shadow-[0_0_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 flex flex-col backdrop-blur-2xl ${drawerUser ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-[#0f0f11]/90 border-l border-white/10' : 'bg-white/90 border-l border-white/50'}`}>
        {drawerUser && (
          <>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-inner ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}><UserPlus size={18} /></div>
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
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} transition-transform hover:scale-110 ${drawerUser.color === colorClass ? 'ring-2 ring-offset-2 ring-blue-500 ring-offset-[#0f0f11]' : 'opacity-70'}`}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>
            
            <div className={`px-6 py-4 border-t flex justify-end shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20 backdrop-blur-md' : 'border-black/5 bg-white/40 backdrop-blur-md'}`}>
              <button onClick={saveDrawerUser} disabled={!drawerUser.name.trim()} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-transform shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105 ${isDarkMode ? 'bg-emerald-600 text-white shadow-emerald-900/50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}><Save size={16} /> Guardar Usuario</button>
            </div>
          </>
        )}
      </div>

      {/* Drawer Overlay (Report) */}
      {isReportDrawerOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsReportDrawerOpen(false)} />}

      {/* Drawer (Report) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] shadow-[0_0_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 flex flex-col backdrop-blur-2xl ${isReportDrawerOpen ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-[#0f0f11]/90 border-l border-white/10' : 'bg-white/90 border-l border-white/50'}`}>
        {isReportDrawerOpen && (
          <>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-inner ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}><Download size={18} /></div>
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
              <button onClick={exportToCSV} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-transform shadow-sm hover:scale-105 ${isDarkMode ? 'bg-blue-600 text-white shadow-blue-900/50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}><Download size={16} /> Descargar CSV</button>
            </div>
          </>
        )}
      </div>

      {/* Drawer Overlay (Settings) */}
      {isSettingsOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSettingsOpen(false)} />}

      {/* Drawer (Settings) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] shadow-[0_0_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 flex flex-col backdrop-blur-2xl ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-[#0f0f11]/90 border-l border-white/10' : 'bg-white/90 border-l border-white/50'}`}>
        {isSettingsOpen && (
          <>
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-inner ${isDarkMode ? 'bg-gray-500/20 text-gray-400 border border-gray-500/20' : 'bg-gray-200 text-gray-700 border border-gray-300'}`}><Settings size={18} /></div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ajustes del Sistema</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className={`p-2 rounded-lg transition-all shadow-sm ${isDarkMode ? 'bg-white/5 hover:bg-white/20 text-gray-300 border border-white/5' : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'}`}><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
              
              {/* Sección Integraciones */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                  <LinkIcon size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                  <h3 className="font-semibold text-sm">Integraciones (Google)</h3>
                </div>

                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Para poder leer tu calendario y crear reuniones de Google Meet oficiales, pega aquí el <strong>ID de Cliente OAuth</strong> que generaste en la consola de Google Cloud.
                </p>
                
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Google Client ID</label>
                  <input 
                    type="text" 
                    value={googleClientId} 
                    onChange={(e) => setGoogleClientId(e.target.value)} 
                    className={`w-full text-xs font-mono px-3 py-2.5 rounded-xl outline-none transition-all shadow-inner ${currentGlassInput}`} 
                    placeholder="ej. 123456789-abcdefg.apps.googleusercontent.com" 
                  />
                </div>
                
                <div className={`p-3 rounded-xl border border-dashed text-[11px] font-medium mt-2 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                  <p><strong>¿Cómo obtenerlo?</strong></p>
                  <ol className="list-decimal pl-4 mt-1 space-y-1">
                    <li>Ve a <a href="https://console.cloud.google.com" target="_blank" className="underline font-bold">Google Cloud Console</a>.</li>
                    <li>Crea un proyecto y activa la "Google Calendar API".</li>
                    <li>En "Credenciales", crea un "ID de cliente OAuth" para "Aplicación Web".</li>
                    <li>Añade el enlace de tu cPanel o dominio en "Orígenes de JavaScript autorizados".</li>
                  </ol>
                </div>
              </div>

            </div>
            
            <div className={`px-6 py-4 border-t flex justify-end shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20 backdrop-blur-md' : 'border-black/5 bg-white/40 backdrop-blur-md'}`}>
              <button onClick={() => setIsSettingsOpen(false)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-transform shadow-sm hover:scale-105 ${isDarkMode ? 'bg-blue-600 text-white shadow-blue-900/50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}><Save size={16} /> Listo</button>
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
            {toast.type === 'sync' && <Cloud size={16} className="text-blue-500 animate-pulse" />}
            <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
