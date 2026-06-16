import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, setTenantId } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. Obtener datos de usuario
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          
          let profile = null;
          let tempTenantId = '';
          
          if (userSnap.exists()) {
            profile = userSnap.data();
            tempTenantId = profile.tenantId;
          } else {
            // Caso de fallback: si es un usuario existente de antes de la transformación SaaS,
            // le asociamos el tenant default para no romper sus datos.
            const defaultTenantId = "1:625295446429:web:95fa8147488a6ab3a65f74";
            profile = {
              uid: user.uid,
              email: user.email,
              tenantId: defaultTenantId,
              role: user.email === 'admin@webfix.com' ? 'superadmin' : 'admin',
              status: 'active'
            };
            await setDoc(userDocRef, profile, { merge: true });
            tempTenantId = defaultTenantId;
          }

          if (user.email === 'admin@webfix.com' && profile.role !== 'superadmin') {
            profile.role = 'superadmin';
            await setDoc(userDocRef, { role: 'superadmin' }, { merge: true });
          }

          
          // 2. Establecer tenantId de manera dinámica para live-binding en firebase.js
          setTenantId(tempTenantId);
          setUserProfile(profile);
          
          // 3. Obtener info del tenant (suscripción, plan, etc.)
          const tenantDocRef = doc(db, 'tenants', tempTenantId);
          const tenantSnap = await getDoc(tenantDocRef);
          
          if (tenantSnap.exists()) {
            setTenantInfo(tenantSnap.data());
          } else {
            // Crear el tenant si no existe (fallback para usuarios heredados)
            const defaultTenant = {
              id: tempTenantId,
              companyName: 'Mi Empresa (ERP)',
              planId: 'enterprise', // Plan por defecto para heredados
              planStatus: 'active',
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 año
            };
            await setDoc(tenantDocRef, defaultTenant);
            setTenantInfo(defaultTenant);
          }
          
          setCurrentUser(user);
        } catch (err) {
          console.error("Error al cargar perfil de inquilino:", err);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setTenantInfo(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => signOut(auth);

  const value = {
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

export function useAuth() {
  return useContext(AuthContext);
}
