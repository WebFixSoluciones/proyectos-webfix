import React, { useState, useEffect } from 'react';
import { 
  DollarSign, PieChart, Users, FileText, Download, Settings, Sparkles
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, storage, appId } from '../../firebase';
import FinanceDashboard from './FinanceDashboard';
import TransactionsView from './TransactionsView';
import ThirdPartiesView from './ThirdPartiesView';
import ReportsView from './ReportsView';
import FinanceSettings from './FinanceSettings';
import FinanceChat from './FinanceChat';

export default function FinanceModule({ isDarkMode, showToast }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [thirdParties, setThirdParties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Cargar datos de Firebase
  useEffect(() => {
    if (!appId) return;

    const txCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_transactions');
    const tpCol = collection(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties');

    const unsubTx = onSnapshot(txCol, (snap) => {
      const txData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar por fecha descendente
      txData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(txData);
      setIsLoading(false);
    });

    const unsubTp = onSnapshot(tpCol, (snap) => {
      const tpData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setThirdParties(tpData);
    });

    return () => {
      unsubTx();
      unsubTp();
    };
  }, [appId]);

  const tabs = [
    { id: 'dashboard', label: 'Resumen', icon: PieChart },
    { id: 'transactions', label: 'Comprobantes', icon: FileText },
    { id: 'third_parties', label: 'Contactos (SRI)', icon: Users },
    { id: 'reports', label: 'Reportes y Cierres', icon: Download },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className={`flex flex-col h-full w-full animate-in fade-in duration-500 overflow-hidden`}>
      {/* HEADER FINANZAS */}
      <div className={`flex items-center justify-between px-8 py-4 border-b shrink-0 ${isDarkMode ? 'border-white/10 bg-[#0f0f11]' : 'border-black/5 bg-white'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl shadow-inner border ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>
            <DollarSign size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Finanzas y Facturación SRI</h1>
            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Emisión de comprobantes electrónicos autorizados y automatización de gastos con IA
            </p>
          </div>
        </div>

        {/* NAVEGACIÓN Y CHAT */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isChatOpen 
                ? 'bg-purple-600 border-purple-600 text-white shadow-md' 
                : (isDarkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100')
            }`}
          >
            <Sparkles size={13} /> Asistente AI
          </button>

          <div className={`flex p-1 rounded-xl border shadow-inner ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-gray-100/50 border-gray-200'}`}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive 
                      ? isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                      : isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-black/5'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CUERPO PRINCIPAL CON DIVISION DE CHAT */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-transparent">
        <div className={`flex-1 overflow-y-auto px-8 py-6 custom-scrollbar ${isDarkMode ? 'bg-[#0f0f11]' : 'bg-[#f8f9fa]'}`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <FinanceDashboard transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} db={db} appId={appId} />}
              {activeTab === 'transactions' && <TransactionsView transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} storage={storage} appId={appId} />}
              {activeTab === 'third_parties' && <ThirdPartiesView thirdParties={thirdParties} isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} />}
              {activeTab === 'reports' && <ReportsView transactions={transactions} isDarkMode={isDarkMode} showToast={showToast} />}
              {activeTab === 'settings' && <FinanceSettings isDarkMode={isDarkMode} showToast={showToast} db={db} appId={appId} />}
            </>
          )}
        </div>
        
        {isChatOpen && (
          <div className={`w-80 border-l shrink-0 flex flex-col p-4 animate-in slide-in-from-right duration-300 ${isDarkMode ? 'border-white/10 bg-[#0f0f11]' : 'border-black/5 bg-gray-50'}`}>
            <FinanceChat transactions={transactions} thirdParties={thirdParties} isDarkMode={isDarkMode} onClose={() => setIsChatOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
