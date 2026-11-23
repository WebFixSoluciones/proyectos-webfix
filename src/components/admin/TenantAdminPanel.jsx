import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { tenantSetupChecks } from '../../services/tenantAdminModel';

export default function TenantAdminPanel({ tenant, currentUser, onUsersChange, showToast }) {
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setError(''); setUsers([]); setConfig(null); setEvents([]);
    const fail = () => setError('No se pudo cargar toda la información. Vuelve a abrir la empresa para reintentar.');
    const stopUsers = onSnapshot(query(collection(db, 'users'), where('tenantId', '==', tenant.id)), snapshot => {
      const rows = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
      setUsers(rows); onUsersChange(rows);
    }, fail);
    const stopConfig = onSnapshot(doc(db, 'artifacts', tenant.id, 'public', 'data', 'finances_settings', 'config'), snapshot => setConfig(snapshot.data() || {}), fail);
    const stopEvents = onSnapshot(query(collection(db, 'tenants', tenant.id, 'admin_events'), orderBy('createdAt', 'desc'), limit(20)), snapshot => {
      setEvents(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
    }, fail);
    return () => { stopUsers(); stopConfig(); stopEvents(); };
  }, [tenant.id, onUsersChange]);

  const changeUser = async (user, changes) => {
    if (busy) return;
    setBusy(true);
    try {
      await runTransaction(db, async tx => {
        const ref = doc(db, 'users', user.id);
        const snapshot = await tx.get(ref);
        const company = await tx.get(doc(db, 'tenants', tenant.id));
        const existing = snapshot.data();
        if (!existing || existing.tenantId !== tenant.id) throw new Error('El usuario ya no pertenece a esta empresa.');
        if (user.id === currentUser.uid || existing.role === 'superadmin' || user.id === company.data()?.ownerUid) {
          throw new Error('El propietario y las cuentas de superadministración están protegidos.');
        }
        tx.update(ref, { ...changes, updatedAt: serverTimestamp(), updatedBy: currentUser.uid });
        tx.set(doc(collection(db, 'tenants', tenant.id, 'admin_events')), {
          action: 'Acceso de usuario actualizado', targetUid: user.id, actorUid: currentUser.uid,
          before: { role: existing.role, status: existing.status }, changes, createdAt: serverTimestamp()
        });
      });
      showToast?.('Acceso actualizado.', 'success');
    } catch (err) { showToast?.(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const changeLabels = { companyName: 'Empresa', planId: 'Plan', planStatus: 'Estado', billingPeriod: 'Ciclo', expiresAt: 'Vencimiento', role: 'Rol', status: 'Acceso', transferId: 'Pago' };
  return <section className="space-y-4">
    {error && <p role="alert" className="text-sm text-[var(--red-11)]">{error}</p>}
    <div className="p-5 rounded-md border border-[var(--gray-a6)] space-y-3">
      <h3 className="text-sm font-semibold">Preparación de la empresa</h3>
      <p className="text-xs text-[var(--gray-11)]">Alta: {tenant.registrationSource === 'public' ? 'Registro público' : tenant.registrationSource === 'admin' ? 'Administrador' : 'Sin origen registrado'} · Contacto: {tenant.ownerEmail || users.find(user => user.id === tenant.ownerUid)?.email || 'Sin propietario identificado'}</p>
      {config === null ? <p className="text-sm">Cargando configuración…</p> : tenantSetupChecks(tenant, users, config).map(check => <p key={check.label} className="text-sm flex justify-between gap-3"><span>{check.label}</span><strong className={check.ready ? 'text-[var(--green-11)]' : 'text-[var(--amber-11)]'}>{check.ready ? 'Listo' : 'Pendiente'}</strong></p>)}
      <p className="text-xs text-[var(--gray-11)]">La firma y el correo se comprueban por su configuración guardada; esta revisión no valida su funcionamiento ni confirma la verificación del correo del propietario.</p>
    </div>
    <div className="p-5 rounded-md border border-[var(--gray-a6)] space-y-3">
      <h3 className="text-sm font-semibold">Usuarios y permisos</h3>
      <p className="text-xs text-[var(--gray-11)]">El propietario se mantiene como administrador. Desactivar un usuario revoca su acceso a los datos de la empresa.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Usuario</th><th>Rol</th><th>Acceso</th></tr></thead><tbody>
        {users.map(user => {
          const protectedUser = user.id === tenant.ownerUid || user.id === currentUser.uid || user.role === 'superadmin';
          return <tr key={user.id}><td className="py-3 pr-3"><div>{user.name || 'Sin nombre'}{user.id === tenant.ownerUid ? ' (Propietario)' : ''}</div><div className="text-xs text-[var(--gray-11)]">{user.email}</div></td>
            <td className="pr-3">{protectedUser ? user.role : <select aria-label={`Rol de ${user.email}`} value={user.role} disabled={busy} onChange={e => changeUser(user, { role: e.target.value })} className="rounded-md border border-[var(--gray-a6)] p-1"><option value="admin">Administrador</option><option value="staff">Colaborador</option></select>}</td>
            <td><button type="button" disabled={busy || protectedUser} onClick={() => changeUser(user, { status: user.status === 'active' ? 'inactive' : 'active' })} className="rounded-md border border-[var(--gray-a6)] px-2 py-1 disabled:opacity-60">{user.status === 'active' ? 'Desactivar' : 'Activar'}</button><div className="text-xs">{user.status === 'active' ? 'Activo' : 'Inactivo'}</div></td></tr>;
        })}
      </tbody></table></div>
      {!users.length && <p className="text-sm">No hay perfiles vinculados a esta empresa.</p>}
    </div>
    <div className="p-5 rounded-md border border-[var(--gray-a6)] space-y-3">
      <h3 className="text-sm font-semibold">Últimos cambios administrativos</h3>
      {!events.length && <p className="text-xs text-[var(--gray-11)]">Sin cambios registrados desde la incorporación de este historial.</p>}
      {events.map(event => <div key={event.id} className="text-xs space-y-1"><strong>{event.action}</strong><p>{event.createdAt?.toDate?.().toLocaleString('es-EC') || 'Guardando…'} · {event.actorUid}</p><p>{Object.entries(event.changes || {}).map(([key, value]) => `${changeLabels[key] || key}: ${value}`).join(' · ')}</p></div>)}
    </div>
  </section>;
}
