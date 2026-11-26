import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { CheckCircle2, Clock, History, ShieldCheck, UserCheck, Users, UserX } from 'lucide-react';
import { db } from '../../firebase';
import { tenantSetupChecks } from '../../services/tenantAdminModel';
import { UiButton, UiSelect } from '../ui/controls';
import { UiIconBadge } from '../ui/UiIconBadge';

const CHANGE_LABELS = {
  companyName: 'Empresa',
  planId: 'Plan',
  planStatus: 'Estado',
  billingPeriod: 'Ciclo',
  expiresAt: 'Vencimiento',
  role: 'Rol',
  status: 'Acceso',
  transferId: 'Pago',
  category: 'Categoría'
};

export default function TenantAdminPanel({ tenant, currentUser, onUsersChange, showToast, section = 'all' }) {
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError('');
    setUsers([]);
    setConfig(null);
    setEvents([]);
    const fail = () => setError('No se pudo cargar toda la información. Vuelve a abrir la empresa para reintentar.');
    const stopUsers = onSnapshot(query(collection(db, 'users'), where('tenantId', '==', tenant.id)), snapshot => {
      const rows = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
      setUsers(rows);
      onUsersChange?.(rows);
    }, fail);
    const stopConfig = onSnapshot(doc(db, 'artifacts', tenant.id, 'public', 'data', 'finances_settings', 'config'), snapshot => {
      setConfig(snapshot.data() || {});
    }, fail);
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
          action: 'Acceso de usuario actualizado',
          targetUid: user.id,
          actorUid: currentUser.uid,
          before: { role: existing.role, status: existing.status },
          changes,
          createdAt: serverTimestamp()
        });
      });
      showToast?.('Acceso de usuario actualizado.', 'success');
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const checks = config === null ? [] : tenantSetupChecks(tenant, users, config);
  const readyCount = checks.filter(c => c.ready).length;
  const showSetupAndUsers = section === 'all' || section === 'team';
  const showHistory = section === 'all' || section === 'history';

  return (
    <section className="space-y-4">
      {error && (
        <div role="alert" className="p-3.5 rounded-xl bg-[#FFF0F5] border border-[#FBC6D9] text-xs font-medium text-[#851B40]">
          {error}
        </div>
      )}

      {showSetupAndUsers && (
        <>
          {/* Checklist de preparación */}
          <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <UiIconBadge level="kpi" tone="brand" icon={ShieldCheck} />
                <div>
                  <h3 className="text-sm font-bold text-[#1B1B1B]">Preparación de la empresa</h3>
                  <p className="text-[11px] text-[#696969]">
                    Alta: {tenant.registrationSource === 'public' ? 'Registro público' : tenant.registrationSource === 'admin' ? 'Administrador' : tenant.registrationSource === 'admin_recovery' ? 'Recuperación admin' : 'Sin origen'}
                    {' · '}
                    {tenant.ownerEmail || users.find(u => u.id === tenant.ownerUid)?.email || 'Sin propietario'}
                  </p>
                </div>
              </div>
              {config !== null && (
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  readyCount === checks.length
                    ? 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]'
                    : 'bg-[#FCFBE7] text-[#866308] border-[#F0DF8A]'
                }`}>
                  {readyCount} / {checks.length} listos
                </span>
              )}
            </div>

            {config === null ? (
              <p className="text-xs text-[#696969]">Cargando configuración…</p>
            ) : (
              <div className="divide-y divide-[#EFEFEF]">
                {checks.map(check => (
                  <div key={check.label} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#1B1B1B] font-medium flex items-center gap-2">
                      {check.ready
                        ? <CheckCircle2 size={14} className="text-[#0B996F] shrink-0" />
                        : <Clock size={14} className="text-[#B45309] shrink-0" />}
                      {check.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                      check.ready
                        ? 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]'
                        : 'bg-[#FCFBE7] text-[#866308] border-[#F0DF8A]'
                    }`}>
                      {check.ready ? 'Listo' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-[#696969]">
              La firma y el correo se verifican por su configuración guardada; esta revisión no prueba envíos reales ni confirma el correo del propietario.
            </p>
          </div>

          {/* Usuarios y permisos */}
          <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <UiIconBadge level="kpi" tone="neutral" icon={Users} />
                <div>
                  <h3 className="text-sm font-bold text-[#1B1B1B]">Usuarios y permisos ({users.length})</h3>
                  <p className="text-[11px] text-[#696969]">
                    El propietario se mantiene como administrador. Desactivar un usuario revoca su acceso al ERP.
                  </p>
                </div>
              </div>
            </div>

            {!users.length ? (
              <div className="py-6 text-center text-xs text-[#696969] bg-[#FAFAFA] rounded-xl border border-[#EFEFEF]">
                No hay perfiles vinculados a esta empresa.
              </div>
            ) : (
              <>
                {/* Vista Móvil: Tarjetas */}
                <div className="md:hidden space-y-2.5">
                  {users.map(user => {
                    const protectedUser = user.id === tenant.ownerUid || user.id === currentUser.uid || user.role === 'superadmin';
                    const isActive = user.status === 'active';
                    return (
                      <div key={user.id} className="p-3.5 rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1B1B1B] truncate">
                              {user.name || 'Sin nombre'}
                              {user.id === tenant.ownerUid && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#E8FEDF] text-[#004227] text-[10px] font-bold">Propietario</span>
                              )}
                            </p>
                            <p className="text-[11px] text-[#696969] truncate">{user.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isActive ? 'bg-[#E8FEDF] text-[#004227]' : 'bg-[#FFF0F5] text-[#851B40]'
                          }`}>
                            {isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E3E3E3]">
                          {protectedUser ? (
                            <span className="text-xs font-semibold text-[#474747] capitalize">{user.role}</span>
                          ) : (
                            <UiSelect
                              aria-label={`Rol de ${user.email}`}
                              value={user.role}
                              disabled={busy}
                              onChange={e => changeUser(user, { role: e.target.value })}
                              className="max-w-[150px]"
                            >
                              <option value="admin">Administrador</option>
                              <option value="staff">Colaborador</option>
                            </UiSelect>
                          )}
                          <UiButton
                            type="button"
                            size="sm"
                            variant={isActive ? 'danger' : 'soft'}
                            disabled={busy || protectedUser}
                            onClick={() => changeUser(user, { status: isActive ? 'inactive' : 'active' })}
                          >
                            {isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                            <span>{isActive ? 'Desactivar' : 'Activar'}</span>
                          </UiButton>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vista Desktop: Tabla */}
                <div className="hidden md:block overflow-x-auto border border-[#EFEFEF] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAFA] border-b border-[#E3E3E3] text-[#696969] uppercase text-[11px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3.5">Usuario</th>
                        <th className="py-2.5 px-3.5">Rol</th>
                        <th className="py-2.5 px-3.5">Estado</th>
                        <th className="py-2.5 px-3.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFEFEF]">
                      {users.map(user => {
                        const protectedUser = user.id === tenant.ownerUid || user.id === currentUser.uid || user.role === 'superadmin';
                        const isActive = user.status === 'active';
                        return (
                          <tr key={user.id} className="hover:bg-[#FAFAFA]">
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-[#1B1B1B]">
                                {user.name || 'Sin nombre'}
                                {user.id === tenant.ownerUid && (
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#E8FEDF] text-[#004227] text-[10px] font-bold">Propietario</span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#696969]">{user.email}</div>
                            </td>
                            <td className="py-3 px-3.5">
                              {protectedUser ? (
                                <span className="px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[#474747] font-semibold capitalize">{user.role}</span>
                              ) : (
                                <UiSelect
                                  aria-label={`Rol de ${user.email}`}
                                  value={user.role}
                                  disabled={busy}
                                  onChange={e => changeUser(user, { role: e.target.value })}
                                >
                                  <option value="admin">Administrador</option>
                                  <option value="staff">Colaborador</option>
                                </UiSelect>
                              )}
                            </td>
                            <td className="py-3 px-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                isActive ? 'bg-[#E8FEDF] text-[#004227]' : 'bg-[#FFF0F5] text-[#851B40]'
                              }`}>
                                {isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <UiButton
                                type="button"
                                size="sm"
                                variant={isActive ? 'danger' : 'soft'}
                                disabled={busy || protectedUser}
                                onClick={() => changeUser(user, { status: isActive ? 'inactive' : 'active' })}
                              >
                                {isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                                <span>{isActive ? 'Desactivar' : 'Activar'}</span>
                              </UiButton>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {showHistory && (
        <div className="bg-white border border-[#E3E3E3] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <UiIconBadge level="kpi" tone="neutral" icon={History} />
            <div>
              <h3 className="text-sm font-bold text-[#1B1B1B]">Últimos cambios administrativos</h3>
              <p className="text-[11px] text-[#696969]">Bitácora inmutable de activaciones, cambios de plan y accesos.</p>
            </div>
          </div>

          {!events.length ? (
            <p className="text-xs text-[#696969] bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl p-4 text-center">
              Sin cambios registrados en el historial.
            </p>
          ) : (
            <div className="divide-y divide-[#EFEFEF]">
              {events.map(event => (
                <div key={event.id} className="py-2.5 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-[#1B1B1B]">{event.action}</strong>
                    <span className="text-[11px] text-[#696969] font-mono">
                      {event.createdAt?.toDate?.().toLocaleString('es-EC') || 'Guardando…'}
                    </span>
                  </div>
                  {event.changes && Object.keys(event.changes).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(event.changes).map(([key, value]) => (
                        <span key={key} className="px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-[#E3E3E3] text-[11px] text-[#474747]">
                          <span className="font-semibold text-[#1B1B1B]">{CHANGE_LABELS[key] || key}:</span> {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
