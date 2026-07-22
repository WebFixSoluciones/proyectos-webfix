import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark, ReceiptText, ArrowDownCircle, ArrowUpCircle, CreditCard,
  Sparkles, BookOpen, FileSpreadsheet, Banknote, Building2
} from 'lucide-react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../firebase';

// ─── Sub-módulos del Control Financiero ───────────────────────────────────────
import CFDashboard from './cf/CFDashboard';
import CFMovimientos from './cf/CFMovimientos';
import CFCXC from './cf/CFCXC';
import CFCXP from './cf/CFCXP';
import CFBancosCaja from './cf/CFBancosCaja';
import CFTarjetas from './cf/CFTarjetas';
import CFCapturaIA from './cf/CFCapturaIA';
import CFContabilidad from './cf/CFContabilidad';
import CFImpuestosSRI from './cf/CFImpuestosSRI';
import CFReportes from './cf/CFReportes';

// ─── ÁREAS DEL MÓDULO ─────────────────────────────────────────────────────────
const AREAS = [
  { id: 'dashboard',           label: 'Resumen',          icon: Landmark },
  { id: 'movimientos',         label: 'Movimientos',      icon: ReceiptText },
  { id: 'cxc',                 label: 'Por Cobrar',       icon: ArrowDownCircle },
  { id: 'cxp',                 label: 'Por Pagar',        icon: ArrowUpCircle },
  { id: 'bancos_caja',         label: 'Bancos y Caja',   icon: Building2 },
  { id: 'tarjetas_creditos',   label: 'Tarjetas',         icon: CreditCard },
  { id: 'captura_inteligente', label: 'Captura IA',       icon: Sparkles },
  { id: 'contabilidad',        label: 'Contabilidad',     icon: BookOpen },
  { id: 'impuestos_sri',       label: 'Impuestos SRI',    icon: FileSpreadsheet },
  { id: 'reports',             label: 'Reportes',         icon: Banknote },
];

const AREA_IDS = AREAS.map(a => a.id);

// Mapeo de alias legacy para no romper navegación desde otros módulos
const ALIAS_MAP = {
  sri_docs: 'impuestos_sri',
  compras_resumen: 'movimientos',
  gastos_creditos_sub: 'tarjetas_creditos',
  gastos_ia: 'captura_inteligente',
  compras_retencion: 'impuestos_sri',
  bancos: 'bancos_caja',
  bancosCaja: 'bancos_caja'
};

function resolveAreaKey(key) {
  if (!key) return 'dashboard';
  const resolved = ALIAS_MAP[key] || key;
  return AREA_IDS.includes(resolved) ? resolved : 'dashboard';
}

/**
 * FinancialControlModule — Orquestador principal del módulo de Control Financiero.
 *
 * Props recibidos de App.jsx:
 *   - initialSubTab: string — sub-área activa inicial
 *   - showToast: function — mostrar notificación
 *   - transactions: Array — globalTransactions desde Firestore (fuente única de verdad)
 *   - thirdParties: Array — globalThirdParties
 *   - products: Array — globalProducts
 *   - companyProfile: Object — datos de la empresa
 */
export default function FinancialControlModule({
  initialSubTab = 'dashboard',
  showToast,
  transactions = [],
  thirdParties = [],
  products = [],
  companyProfile = {}
}) {
  const [activeArea, setActiveArea] = useState(() => resolveAreaKey(initialSubTab));

  // Actualizar área activa cuando cambia initialSubTab (navegación desde Sidebar)
  useEffect(() => {
    setActiveArea(resolveAreaKey(initialSubTab));
  }, [initialSubTab]);

  // ─── Colecciones adicionales de tesorería ──────────────────────────────────
  const [financialCards, setFinancialCards] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  useEffect(() => {
    const unsubCards = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'financial_cards'),
      snap => setFinancialCards(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.warn('financial_cards snapshot error:', err)
    );
    const unsubBanks = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'financial_banks'),
      snap => setBankAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.warn('financial_banks snapshot error:', err)
    );
    return () => { unsubCards(); unsubBanks(); };
  }, []);

  // ─── Handlers compartidos ──────────────────────────────────────────────────

  // Registrar abono a CXC o pago a CXP
  const handleRegisterAbono = async (tx) => {
    const saldo = Math.max(0, Number(tx.total || 0) - Number(tx.paidAmount || 0));
    const monto = parseFloat(window.prompt(`Monto a abonar para ${tx.thirdPartyName} (saldo: $${saldo.toFixed(2)}):`, saldo.toFixed(2)));
    if (isNaN(monto) || monto <= 0) return;

    const newPaid = Number(tx.paidAmount || 0) + monto;
    const newStatus = newPaid >= Number(tx.total) - 0.01 ? 'pagado' : 'parcial';

    try {
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'finances_transactions', tx.id),
        { paidAmount: newPaid, paymentStatus: newStatus, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      showToast?.(`Abono de $${monto.toFixed(2)} registrado correctamente.`, 'success');
    } catch (e) {
      console.error('Error registering abono:', e);
      showToast?.('Error al registrar el abono.', 'error');
    }
  };

  // Navegar a módulo de movimientos para nuevo registro
  const handleNewMovement = () => setActiveArea('movimientos');

  // ─── Render del subcomponente activo ──────────────────────────────────────
  const renderContent = () => {
    switch (activeArea) {
      case 'dashboard':
        return (
          <CFDashboard
            transactions={transactions}
            bankAccounts={bankAccounts}
            financialCards={financialCards}
            onNewMovement={handleNewMovement}
          />
        );
      case 'movimientos':
        return (
          <CFMovimientos
            transactions={transactions}
            onNewMovement={handleNewMovement}
          />
        );
      case 'cxc':
        return (
          <CFCXC
            transactions={transactions}
            db={db}
            appId={appId}
            showToast={showToast}
            onRegisterAbono={handleRegisterAbono}
          />
        );
      case 'cxp':
        return (
          <CFCXP
            transactions={transactions}
            onRegisterPago={handleRegisterAbono}
          />
        );
      case 'bancos_caja':
        return (
          <CFBancosCaja
            bankAccounts={bankAccounts}
            db={db}
            appId={appId}
            showToast={showToast}
          />
        );
      case 'tarjetas_creditos':
        return (
          <CFTarjetas
            financialCards={financialCards}
            db={db}
            appId={appId}
            showToast={showToast}
          />
        );
      case 'captura_inteligente':
        return (
          <CFCapturaIA
            db={db}
            appId={appId}
            showToast={showToast}
          />
        );
      case 'contabilidad':
        return (
          <CFContabilidad
            transactions={transactions}
          />
        );
      case 'impuestos_sri':
        return (
          <CFImpuestosSRI
            transactions={transactions}
            companyProfile={companyProfile}
          />
        );
      case 'reports':
        return (
          <CFReportes
            transactions={transactions}
          />
        );
      default:
        return (
          <CFDashboard
            transactions={transactions}
            bankAccounts={bankAccounts}
            financialCards={financialCards}
            onNewMovement={handleNewMovement}
          />
        );
    }
  };

  const currentArea = AREAS.find(a => a.id === activeArea) || AREAS[0];

  return (
    <div className="min-h-full bg-white p-5 md:p-7 rounded-xl space-y-5">


      {/* Contenido del sub-módulo activo */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
}
