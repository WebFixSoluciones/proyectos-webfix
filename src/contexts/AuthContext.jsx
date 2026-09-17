import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, setTenantId } from '../firebase';
import { ensureFinanceMigration } from '../services/financeStore.js';


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profileError, setProfileError] = useState('');
  useEffect(() => {
    let stopProfile = () => {};
    let stopTenant = () => {};
    const clear = () => { setCurrentUser(null); setUserProfile(null); setTenantInfo(null); };
    const unsubscribe = onAuthStateChanged(auth, user => {
      stopProfile(); stopTenant(); clear(); setProfileError('');
      if (!user) { setLoading(false); return; }
      setLoading(true);
      stopProfile = onSnapshot(doc(db, 'users', user.uid), snapshot => {
        stopTenant();
        const profile = snapshot.data();
        if (!profile?.tenantId || profile.status !== 'active') {
          clear(); setProfileError(profile ? 'Tu acceso está desactivado. Contacta al administrador.' : 'Tu cuenta todavía no tiene una empresa asignada.'); setLoading(false); return;
        }
        setTenantId(profile.tenantId);
        // Importa una sola vez el histórico financiero del emisor identificado
        // (RUC 1754376901001) hacia el espacio aislado de la empresa.
        ensureFinanceMigration(db, profile.tenantId).catch(error => console.error('Migración financiera pendiente:', error));
        stopTenant = onSnapshot(doc(db, 'tenants', profile.tenantId), tenant => {
          if (!tenant.exists()) { clear(); setProfileError('La empresa asignada no está disponible.'); }
          else { setUserProfile(profile); setTenantInfo(tenant.data()); setCurrentUser(user); setProfileError(''); }
          setLoading(false);
        }, () => { clear(); setProfileError('No se pudo verificar el acceso a la empresa.'); setLoading(false); });
      }, () => { clear(); setProfileError('No se pudo verificar tu perfil de acceso.'); setLoading(false); });
    });
    return () => { unsubscribe(); stopProfile(); stopTenant(); };
  }, []);

  const logout = () => signOut(auth);

  const value = {
    profileError,
    currentUser,
    userProfile,
    tenantInfo,
    loading,
    logout,
    tenantId: userProfile?.tenantId || '',
    planId: tenantInfo?.planId || 'starter',
    planStatus: tenantInfo?.planStatus || 'trial',
    role: userProfile?.role || 'staff'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
