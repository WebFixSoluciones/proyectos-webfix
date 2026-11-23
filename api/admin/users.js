import { adminServices } from '../../server/firebaseAdmin.js';

const errorWithStatus = (message, status) => Object.assign(new Error(message), { status });

export function registrationSummary(account, profile, tenant) {
  const missing = [];
  if (!profile) missing.push('Falta crear el perfil de usuario');
  if (!profile?.tenantId || !tenant) missing.push('Falta crear o vincular la empresa');
  if (!account.email) missing.push('No hay correo de contacto');
  if (!account.emailVerified && (!tenant || tenant.requireEmailVerification)) missing.push('Falta verificar el correo');
  if (tenant?.planStatus === 'pending_approval') missing.push('Pendiente de aprobación del administrador');
  if (account.disabled) missing.push('Cuenta de acceso deshabilitada');
  if (profile && profile.status !== 'active') missing.push('Perfil de usuario inactivo');
  return {
    uid: account.uid, email: account.email || '', name: profile?.name || account.displayName || '',
    phone: profile?.phone || account.phoneNumber || '', emailVerified: Boolean(account.emailVerified),
    disabled: Boolean(account.disabled), createdAt: account.metadata?.creationTime || '',
    role: profile?.role || '', status: profile?.status || '', tenantId: profile?.tenantId || '',
    companyName: tenant?.companyName || '', planStatus: tenant?.planStatus || '',
    missing, incomplete: missing.length > 0,
    canComplete: Boolean(account.email && !account.disabled && !profile),
    canEnable: Boolean(tenant && tenant.ownerUid === account.uid && tenant.planStatus === 'pending_approval' && profile?.status === 'active' && !account.disabled)
  };
}

export function createUsersHandler(getServices = adminServices) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Método no permitido.' });
    const token = /^Bearer ([^\s]+)$/.exec(req.headers?.authorization || '')?.[1];
    if (!token) return res.status(401).json({ error: 'Inicia sesión como superadministrador.' });
    try {
      const { auth, db, serverTimestamp, timestamp } = getServices();
      let caller;
      try { caller = await auth.verifyIdToken(token, true); }
      catch { throw errorWithStatus('Tu sesión no es válida. Inicia sesión nuevamente.', 401); }
      const operator = (await db.doc(`users/${caller.uid}`).get()).data();
      if (operator?.role !== 'superadmin' || operator.status !== 'active') throw errorWithStatus('Se requiere un superadministrador activo.', 403);
      if (req.method === 'GET') {
        const pageToken = req.query?.pageToken;
        if (pageToken && (typeof pageToken !== 'string' || pageToken.length > 4096)) throw errorWithStatus('Página inválida.', 400);
        const page = await auth.listUsers(100, pageToken || undefined);
        const profiles = page.users.length ? await db.getAll(...page.users.map(user => db.doc(`users/${user.uid}`))) : [];
        const ids = [...new Set(profiles.map(profile => profile.data()?.tenantId).filter(Boolean))];
        const tenants = ids.length ? await db.getAll(...ids.map(id => db.doc(`tenants/${id}`))) : [];
        const tenantMap = new Map(tenants.map(tenant => [tenant.id, tenant.data()]));
        return res.status(200).json({
          users: page.users.map((user, index) => {
            const profile = profiles[index]?.data();
            return registrationSummary(user, profile, tenantMap.get(profile?.tenantId));
          }).filter(user => user.email),
          withoutEmail: page.users.filter(user => !user.email).length, nextPageToken: page.pageToken || null
        });
      }
      const { uid, action } = req.body || {};
      if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw errorWithStatus('Usuario inválido.', 400);
      if (!['complete', 'enable'].includes(action)) throw errorWithStatus('Acción inválida.', 400);
      const account = await auth.getUser(uid);
      if (!account.email || account.disabled) throw errorWithStatus('La cuenta necesita un correo y acceso habilitado.', 409);
      const name = String(req.body.name || '').trim();
      const companyName = String(req.body.companyName || '').trim();
      if (action === 'complete' && (!name || name.length > 120 || !companyName || companyName.length > 160)) throw errorWithStatus('Confirma el nombre del cliente y de su empresa.', 400);
      const tenantId = await db.runTransaction(async tx => {
        const profileRef = db.doc(`users/${uid}`);
        const profile = await tx.get(profileRef);
        if (action === 'complete') {
          if (profile.exists) throw errorWithStatus('El usuario ya tiene perfil. Actualiza el listado.', 409);
          const companyRef = db.collection('tenants').doc();
          tx.create(companyRef, {
            id: companyRef.id, ownerUid: uid, ownerEmail: account.email, companyName,
            planId: 'starter', planStatus: 'pending_approval', billingPeriod: 'monthly',
            requireEmailVerification: true, createdAt: serverTimestamp(), registrationSource: 'admin_recovery'
          });
          tx.create(profileRef, { uid, name, email: account.email, tenantId: companyRef.id, role: 'admin', status: 'active', createdAt: serverTimestamp() });
          tx.create(db.doc(`artifacts/${companyRef.id}/public/data/finances_settings/config`), { razonSocial: companyName, nombreComercial: companyName, email: account.email });
          tx.create(db.doc(`artifacts/${companyRef.id}/public/data/meta/info`), { users: [{ email: account.email, role: 'admin' }], trash: [] });
          tx.create(companyRef.collection('admin_events').doc(), { action: 'Registro incompleto recuperado', actorUid: caller.uid, targetUid: uid, createdAt: serverTimestamp(), changes: { companyName, planStatus: 'pending_approval' } });
          return companyRef.id;
        }
        const data = profile.data();
        if (!data?.tenantId || data.status !== 'active') throw errorWithStatus('Completa primero el perfil y la empresa.', 409);
        const companyRef = db.doc(`tenants/${data.tenantId}`);
        const company = await tx.get(companyRef);
        if (!company.exists || company.data().planStatus !== 'pending_approval' || company.data().ownerUid !== uid) throw errorWithStatus('La empresa ya fue procesada o el usuario no es su propietario.', 409);
        const expiresAt = new Date(Date.now() + 14 * 86400000);
        tx.update(companyRef, { planStatus: 'trial', trialExpiresAt: timestamp(expiresAt), expiresAt: expiresAt.toISOString(), approvedAt: serverTimestamp(), approvedBy: caller.uid });
        tx.create(companyRef.collection('admin_events').doc(), { action: 'Tenant habilitado por aprobación', actorUid: caller.uid, targetUid: uid, createdAt: serverTimestamp(), changes: { planStatus: 'trial', expiresAt: expiresAt.toISOString() } });
        return companyRef.id;
      });
      return res.status(200).json({ tenantId, message: action === 'complete' ? 'Registro completado. La empresa está pendiente de tu aprobación.' : 'Tenant habilitado con 14 días de prueba. La verificación del correo sigue siendo obligatoria.' });
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error('Error de administración de altas:', error.code || 'unknown');
      return res.status(status).json({ error: error.status ? error.message : 'No se pudieron consultar o actualizar las altas.' });
    }
  };
}
export default createUsersHandler();
