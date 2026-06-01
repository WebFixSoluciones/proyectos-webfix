import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock, ShieldAlert, Award, FileText, CheckCircle2,
  FolderOpen, CircleDashed, Sparkles, Package, ListTodo, BarChart3, Users, RefreshCw, Play, LayoutDashboard,
  Monitor, Palette, Rocket, Briefcase, CalendarDays, Trash2, CheckCircle, ArrowRight
} from 'lucide-react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { analizarERPContextoConGemini } from '../../services/geminiService';

const COLUMN_COLORS = [
  { id: 'gray', badge: 'bg-gray-200/60 text-gray-700 dark:bg-white/[0.08] dark:text-gray-300', bgDark: 'bg-[#1a1a1a]/40 border-white/[0.08]', bgLight: 'bg-gray-50/50 border-gray-200/80', dot: 'bg-gray-400' },
  { id: 'blue', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', bgDark: 'bg-blue-900/10 border-blue-500/20', bgLight: 'bg-blue-50/60 border-blue-200/50', dot: 'bg-blue-500' },
  { id: 'green', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', bgDark: 'bg-green-900/10 border-green-500/20', bgLight: 'bg-green-50/60 border-green-200/50', dot: 'bg-green-505' },
  { id: 'yellow', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', bgDark: 'bg-yellow-900/10 border-yellow-500/20', bgLight: 'bg-yellow-50/60 border-yellow-200/50', dot: 'bg-yellow-500' },
  { id: 'red', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', bgDark: 'bg-red-900/10 border-red-500/20', bgLight: 'bg-red-50/60 border-red-200/50', dot: 'bg-red-500' },
  { id: 'purple', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', bgDark: 'bg-purple-900/10 border-purple-500/20', bgLight: 'bg-purple-50/60 border-purple-200/50', dot: 'bg-purple-500' },
];

const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'Por hacer', color: 'gray' },
  { id: 'in-progress', title: 'En progreso', color: 'blue' },
  { id: 'done', title: 'Completado', color: 'green' }
];

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

export default function ErpDashboard({ projectsList, allTasksGlobal, isDarkMode, setActivePageId, db, appId }) {
  const [transactions, setTransactions] = useState([]);
  const [thirdParties, setThirdParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  
  // AI Strategic Advisor states
  const [aiReport, setAiReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiError, setAiError] = useState('');

  // Load Firestore Collections
  useEffect(() => {
    if (!appId || !db) return;

    const txCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_transactions');
    const tpCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties');
    const prodCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_products');
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'finances_settings');

    const unsubTx = onSnapshot(txCol, (snap) => {
      const txData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      txData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(txData);
    });

    const unsubTp = onSnapshot(tpCol, (snap) => {
      const tpData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setThirdParties(tpData);
    });

    const unsubProd = onSnapshot(prodCol, (snap) => {
      const prodData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(prodData);
    });

    async function loadSettings() {
      try {
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          setSettings(snap.data());
        }
      } catch (e) {
        console.error("Error loading settings in ERP Dashboard", e);
      }
    }
    loadSettings();

    // Recover AI report from localStorage if exists
    const cachedReport = localStorage.getItem('erp_ai_advisor_report');
    if (cachedReport) {
      setAiReport(cachedReport);
    }

    return () => {
      unsubTx();
      unsubTp();
      unsubProd();
    };
  }, [appId, db]);

  // Calculations for current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthTx = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Ventas y Gastos
  const totalSales = currentMonthTx.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  const totalExpenses = currentMonthTx.filter(t => t.type === 'egreso').reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  
  // Outstanding receivables
  const outstandingCollections = transactions
    .filter(t => t.type === 'ingreso' && t.paymentStatus === 'pendiente')
    .reduce((acc, t) => acc + (Number(t.total) || 0), 0);

  // Bajo Stock items
  const lowStockCount = products.filter(p => p.type === 'producto' && Number(p.stock) <= Number(p.minStock)).length;

  // Digital signature tracking
  let certDaysLeft = null;
  let certStatus = 'none'; // 'none', 'ok', 'warning', 'expired'
  if (settings && settings.certificadoCargado && settings.certificadoVence) {
    const diffTime = new Date(settings.certificadoVence) - new Date();
    certDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (certDaysLeft < 0) certStatus = 'expired';
    else if (certDaysLeft <= 30) certStatus = 'warning';
    else certStatus = 'ok';
  }

  // SRI Status counts
  const sriStatusCounts = transactions.reduce((acc, t) => {
    const status = t.sriStatus || 'pendiente';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const runAiAdvisor = async () => {
    setIsGeneratingReport(true);
    setAiError('');
    try {
      const result = await analizarERPContextoConGemini(projectsList, allTasksGlobal, products, transactions, thirdParties);
      setAiReport(result);
      localStorage.setItem('erp_ai_advisor_report', result);
    } catch (e) {
      console.error(e);
      setAiError(e.message || "Error al conectar con la IA de Gemini");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const cardClass = `p-5 rounded-2xl border transition-all duration-300 ${
    isDarkMode 
      ? 'bg-[#151517] border-white/5 hover:border-white/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]' 
      : 'bg-white border-gray-300/80 hover:border-gray-400 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-gray-900'
  }`;

  const currentGlassPanel = isDarkMode 
    ? 'backdrop-blur-xl bg-white/[0.03] border border-white/[0.08]' 
    : 'backdrop-blur-xl bg-white/40 border border-gray-300/60 shadow-sm';

  const getColorClass = (colorId) => {
    const color = COLUMN_COLORS.find(c => c.id === colorId) || COLUMN_COLORS[0];
    return color.badge;
  };

  // Helper parser for Gemini Markdown Output
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    const parseBoldText = (t) => {
      const parts = t.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-950'}`}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    return text.split('\n').map((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return <div key={index} className="h-2"></div>;

      if (cleanLine.startsWith('###')) {
        return (
          <h4 key={index} className={`text-xs font-bold uppercase tracking-wider mt-4 mb-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-900'}`}>
            {cleanLine.replace('###', '').trim()}
          </h4>
        );
      }
      if (cleanLine.startsWith('##')) {
        return (
          <h3 key={index} className={`text-sm font-bold mt-4 mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-purple-200 border-b border-white/5 pb-1' : 'text-purple-950 border-b border-gray-200 pb-1'}`}>
            <span className="w-1.5 h-3 rounded-full bg-purple-500"></span>
            {cleanLine.replace('##', '').trim()}
          </h3>
        );
      }
      if (cleanLine.startsWith('#')) {
        return (
          <h2 key={index} className={`text-base font-extrabold mt-5 mb-3 ${isDarkMode ? 'text-white' : 'text-gray-950'}`}>
            {cleanLine.replace('#', '').trim()}
          </h2>
        );
      }
      if (cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
        return (
          <li key={index} className={`ml-4 list-disc text-xs leading-relaxed mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {parseBoldText(cleanLine.substring(1).trim())}
          </li>
        );
      }
      return (
        <p key={index} className={`text-xs leading-relaxed mb-2 last:mb-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {parseBoldText(cleanLine)}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-blue-100 text-blue-600 border border-blue-200 shadow-sm'}`}>
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard General ERP</h1>
            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>
              Control holístico de proyectos, inventario, ventas y cumplimiento tributario SRI
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {certStatus !== 'ok' && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border uppercase ${
              certStatus === 'expired' 
                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}>
              <ShieldAlert size={14} />
              {certStatus === 'none' ? 'Sin firma digital' : 'Firma por vencer'}
            </div>
          )}
        </div>
      </div>

      {/* METRICAS ERP GENERALES (4 Tarjetas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* VENTAS / INGRESOS */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-750 font-bold'}`}>Ventas (Mes)</span>
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              <TrendingUp size={15} />
            </div>
          </div>
          <p className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            ${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex justify-between items-center mt-1.5 text-[9px]">
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600 font-semibold'}>Cuentas por cobrar:</span>
            <span className={`font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-850'}`}>
              ${outstandingCollections.toFixed(2)}
            </span>
          </div>
        </div>

        {/* GASTOS / EGRESOS */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-750 font-bold'}`}>Gastos (Mes)</span>
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-700'}`}>
              <TrendingDown size={15} />
            </div>
          </div>
          <p className={`text-2xl font-black ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex justify-between items-center mt-1.5 text-[9px] text-gray-500">
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600 font-semibold'}>Balance neto:</span>
            <span className={`font-bold ${(totalSales - totalExpenses) >= 0 ? (isDarkMode ? 'text-white' : 'text-gray-900') : 'text-red-500'}`}>
              ${(totalSales - totalExpenses).toFixed(2)}
            </span>
          </div>
        </div>

        {/* INVENTARIO / STOCKS */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-750 font-bold'}`}>Inventario y Productos</span>
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
              <Package size={15} />
            </div>
          </div>
          <p className="text-2xl font-black">{products.length}</p>
          <div className="flex justify-between items-center mt-1.5 text-[9px]">
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600 font-semibold'}>Stock Crítico / Alertas:</span>
            <span className={`font-bold flex items-center gap-1 ${lowStockCount > 0 ? 'text-red-500 font-black animate-pulse' : (isDarkMode ? 'text-gray-400' : 'text-gray-700')}`}>
              {lowStockCount > 0 && <AlertCircle size={10} />}
              {lowStockCount} {lowStockCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* GESTIÓN DE PROYECTOS */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-750 font-bold'}`}>Proyectos y Tareas</span>
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
              <FolderOpen size={15} />
            </div>
          </div>
          <p className="text-2xl font-black">{projectsList.length}</p>
          <div className="flex justify-between items-center mt-1.5 text-[9px]">
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-600 font-semibold'}>Tareas pendientes:</span>
            <span className="font-bold text-yellow-550">
              {allTasksGlobal.filter(t => t.status !== 'done').length} activas
            </span>
          </div>
        </div>

      </div>

      {/* DOBLE PANEL: PROYECTOS / SRI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL IZQUIERDO: PROYECTOS Y TAREAS (Col Span 7) */}
        <div className={`${currentGlassPanel} lg:col-span-7 p-6 rounded-2xl`}>
          <div className="flex items-center justify-between mb-5">
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <Briefcase size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
              Progreso de Proyectos Activos
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-850'}`}>
              {projectsList.length} Proyectos
            </span>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
            {projectsList.length > 0 ? (
              projectsList.map(project => {
                const projectTasks = allTasksGlobal.filter(t => t.projectId === project.id);
                const doneTasksCount = projectTasks.filter(t => t.status === 'done').length;
                const totalTasksCount = projectTasks.length;
                const progressPercent = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

                return (
                  <div 
                    key={project.id} 
                    onClick={() => setActivePageId(project.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer hover:scale-[1.01] transition-all group ${
                      isDarkMode 
                        ? 'bg-black/20 border-white/5 hover:bg-white/[0.04]' 
                        : 'bg-white border-gray-250 hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-bold text-xs group-hover:underline">
                        <span className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-black/5 text-gray-705'}`}>
                          <IconRenderer name={project.icon} size={13} />
                        </span>
                        {project.title}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        progressPercent === 100 
                          ? 'bg-emerald-500/20 text-emerald-500' 
                          : (isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-900')
                      }`}>
                        {progressPercent}%
                      </span>
                    </div>

                    <div className={`h-2 w-full rounded-full overflow-hidden backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-200 border-white/50'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          progressPercent === 100 
                            ? 'bg-gradient-to-r from-emerald-400 to-green-500' 
                            : 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                        }`} 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-2.5 text-[10px] font-medium text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-500" />
                        {doneTasksCount} hechas
                      </span>
                      <span className="flex items-center gap-1">
                        <ListTodo size={11} className="text-blue-500" />
                        {totalTasksCount} tareas en total
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-xs italic text-gray-500">No hay proyectos activos registrados.</div>
            )}
          </div>

          {/* DISTRIBUCION DE TAREAS GLOBAL */}
          {allTasksGlobal.length > 0 && (
            <div className={`mt-5 pt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
              <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                <BarChart3 size={12} />
                Estado de Tareas en toda la Empresa
              </h4>
              
              <div className={`h-3 w-full rounded-full overflow-hidden flex border shadow-inner ${isDarkMode ? 'border-white/5 bg-black/25' : 'border-gray-250 bg-gray-150'}`}>
                {Array.from(new Set(projectsList.flatMap(p => (p.columns || DEFAULT_COLUMNS).map(c => c.id)))).map((statusId) => {
                  const count = allTasksGlobal.filter(t => t.status === statusId).length;
                  const percent = Math.round((count / allTasksGlobal.length) * 100);
                  const colDef = projectsList.flatMap(p => (p.columns || DEFAULT_COLUMNS)).find(c => c.id === statusId) || { title: statusId, color: 'gray' };
                  const bgClass = getColorClass(colDef.color || 'gray').split(' ')[0] || 'bg-gray-400';
                  
                  return count > 0 ? (
                    <div 
                      key={statusId} 
                      title={`${colDef.title}: ${count} (${percent}%)`} 
                      className={`h-full ${bgClass} transition-all duration-700`} 
                      style={{ width: `${percent}%` }} 
                    />
                  ) : null;
                })}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3 text-[10px] font-semibold">
                {Array.from(new Set(projectsList.flatMap(p => (p.columns || DEFAULT_COLUMNS).map(c => c.id)))).map((statusId) => {
                  const count = allTasksGlobal.filter(t => t.status === statusId).length;
                  const colDef = projectsList.flatMap(p => (p.columns || DEFAULT_COLUMNS)).find(c => c.id === statusId) || { title: statusId, color: 'gray' };
                  const dotClass = COLUMN_COLORS.find(c => c.id === (colDef.color || 'gray'))?.dot || 'bg-gray-400';
                  
                  return count > 0 ? (
                    <div key={statusId} className="flex items-center gap-1 text-gray-500">
                      <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`}></span>
                      <span>{colDef.title}: <strong className={isDarkMode ? 'text-white' : 'text-gray-900'}>{count}</strong></span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        {/* PANEL DERECHO: FACTURACIÓN Y TRIBUTACIÓN SRI (Col Span 5) */}
        <div className={`${currentGlassPanel} lg:col-span-5 p-6 rounded-2xl flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-850'}`}>
                <FileText size={18} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                Consola Electrónica SRI
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-800'}`}>
                Ecuador SRI
              </span>
            </div>

            {/* ESTADOS SRI PROGRESS */}
            <div className="space-y-4">
              {[
                { key: 'autorizado', label: 'Comprobantes Autorizados', color: 'bg-emerald-500' },
                { key: 'pendiente', label: 'Pendientes de Firma / Envío', color: 'bg-yellow-500' },
                { key: 'rechazado', label: 'Rechazados por SRI', color: 'bg-red-500' },
                { key: 'anulado', label: 'Anulados / Cancelados', color: 'bg-gray-500' }
              ].map(item => {
                const count = sriStatusCounts[item.key] || 0;
                const totalCount = transactions.length || 1;
                const percent = Math.round((count / totalCount) * 100);

                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-650'}>{item.label}</span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{count} ({percent}%)</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-gray-200'}`}>
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DETALLE CERTIFICADO FIRMA */}
            <div className={`mt-6 p-4 rounded-xl border ${
              certStatus === 'none' 
                ? 'bg-blue-500/5 border-blue-500/10 text-gray-500'
                : certStatus === 'expired' 
                ? 'bg-red-500/5 border-red-500/10 text-red-400' 
                : certStatus === 'warning' 
                ? 'bg-yellow-500/5 border-yellow-500/10 text-yellow-500'
                : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
            }`}>
              <div className="flex items-start gap-3">
                <ShieldAlert size={16} className="mt-0.5" />
                <div className="space-y-0.5">
                  <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Firma Electrónica Autorizada</p>
                  <p className="text-[9px] leading-normal opacity-85">
                    {certStatus === 'none' && 'No se ha detectado ninguna firma p12 activa. Cárgala en Configuración para validar comprobantes.'}
                    {certStatus === 'expired' && 'Tu firma electrónica cargada está expirada. Reemplázala inmediatamente.'}
                    {certStatus === 'warning' && `Tu firma digital cargada expira en menos de 30 días (${certDaysLeft} días). Renuévala.`}
                    {certStatus === 'ok' && `Firma electrónica válida. Vence el ${settings?.certificadoVence} (${certDaysLeft} días restantes).`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-5 pt-4 border-t text-[10px] flex justify-between items-center ${isDarkMode ? 'border-white/5 text-gray-500' : 'border-gray-250 text-gray-600'}`}>
            <span>Esquema XML XSD 1.0.0</span>
            <span className="font-bold flex items-center gap-1 text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Conexión SRI Activa
            </span>
          </div>
        </div>

      </div>

      {/* SECCIÓN: AI ERP ADVISOR (DIAGNÓSTICO ESTRATÉGICO CON GEMINI) */}
      <div className={`p-6 rounded-3xl relative overflow-hidden border ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#1c142e] via-[#151517] to-[#151517] border-[#4c2d7a]/20 shadow-[0_4px_30px_rgba(0,0,0,0.4)]' 
          : 'bg-gradient-to-br from-[#f6f2fc] via-white to-white border-purple-200 shadow-md'
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none -z-10"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/5 rounded-full blur-[40px] pointer-events-none -z-10"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-950'}`}>
                AI ERP Advisor - Diagnóstico Inteligente
              </h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-605'}`}>
                Recomendaciones ejecutivas de negocio basadas en finanzas, inventarios y proyectos
              </p>
            </div>
          </div>
          
          <button
            onClick={runAiAdvisor}
            disabled={isGeneratingReport}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/30 border border-purple-500/40' 
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200/50'
            }`}
          >
            {isGeneratingReport ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {aiReport ? 'Recargar Diagnóstico con IA' : 'Generar Diagnóstico Estratégico'}
          </button>
        </div>

        {/* CONTENIDO DEL REPORTE */}
        {isGeneratingReport ? (
          <div className={`flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50/50 border-gray-250'}`}>
            <RefreshCw size={24} className="animate-spin text-purple-500 mb-3" />
            <p className={`text-xs font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-900'}`}>Analizando métricas corporativas...</p>
            <p className="text-[10px] text-gray-500 mt-1">Gemini está procesando stock de inventario, liquidez SRI y tareas pendientes.</p>
          </div>
        ) : aiError ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <strong>Error:</strong> {aiError}
          </div>
        ) : aiReport ? (
          <div className={`p-5 rounded-2xl border backdrop-blur-md transition-all ${
            isDarkMode 
              ? 'bg-black/35 border-white/[0.05] shadow-[inset_0_1px_20px_rgba(255,255,255,0.02)]' 
              : 'bg-white border-gray-250 shadow-sm'
          }`}>
            <div className="prose prose-sm max-w-none prose-invert">
              {renderMarkdown(aiReport)}
            </div>
          </div>
        ) : (
          <div className={`p-6 rounded-2xl border text-center border-dashed ${
            isDarkMode ? 'bg-black/10 border-white/5' : 'bg-gray-50/50 border-gray-250'
          }`}>
            <p className={`text-xs italic ${isDarkMode ? 'text-purple-300/80' : 'text-purple-800/80'} font-medium`}>
              Haz clic en "Generar Diagnóstico Estratégico" para que la Inteligencia Artificial analice tus productos, stock de almacén, cobranzas pendientes, cumplimiento del SRI y estado de proyectos para brindarte un reporte corporativo optimizado.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
