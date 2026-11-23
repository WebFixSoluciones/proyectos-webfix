import { useEffect, useState } from 'react';
import { Dialog } from '@radix-ui/themes';
import { auth } from '../../firebase';
import { UiInput } from '../ui/controls';

export default function RegistrationAdminView({ showToast, onOpenTenant, onSummary }) {
  const [users, setUsers] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [withoutEmail, setWithoutEmail] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyIncomplete, setOnlyIncomplete] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [busy, setBusy] = useState(false);

  async function request(method, body, pageToken) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Inicia sesión nuevamente para consultar las altas.');
    const response = await fetch(`/api/admin/users${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ''}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(data?.error || 'El servicio de altas no está disponible. Comprueba que la aplicación y el servicio estén publicados.');
    return data;
  }
  async function load(pageToken) {
    setLoading(true); setError('');
    try {
      const data = await request('GET', null, pageToken);
      setUsers(previous => pageToken ? [...previous, ...data.users] : data.users);
      setWithoutEmail(previous => pageToken ? previous + data.withoutEmail : data.withoutEmail);
      setNextPageToken(data.nextPageToken);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function save(action, user) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await request('POST', { action, uid: user.uid, name, companyName });
      showToast?.(result.message, 'success'); setSelected(null); await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const filtered = users.filter(user => (!onlyIncomplete || user.incomplete) && `${user.name} ${user.email} ${user.companyName}`.toLowerCase().includes(search.toLowerCase()));
  const incomplete = users.filter(user => user.incomplete).length;
  useEffect(() => { onSummary?.({ loading, incomplete, hasMore: Boolean(nextPageToken), error }); }, [loading, incomplete, nextPageToken, error, onSummary]);
  return <section className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Usuarios y altas</h2><p className="text-sm text-[var(--gray-11)]">Detecta registros incompletos, contacta al cliente y aprueba su empresa.</p></div>
      <button type="button" disabled={loading || busy} onClick={() => load()} className="rounded-md border border-[var(--gray-a6)] px-3 py-2 text-sm disabled:opacity-50">Actualizar</button>
    </div>
    {error && <p role="alert" className="rounded-md p-3 bg-[var(--red-2)] text-[var(--red-11)] text-sm">{error}</p>}
    <div className="flex flex-wrap gap-4 text-sm"><p><strong>{incomplete}</strong> altas incompletas entre {users.length} cuentas con correo consultadas</p><p className="text-[var(--gray-11)]">{withoutEmail} cuentas sin correo, separadas del listado de clientes</p></div>
    {nextPageToken && <p className="text-xs text-[var(--amber-11)]">Hay más cuentas por consultar; estos números corresponden a las páginas cargadas.</p>}
    <div className="flex flex-wrap items-center gap-4"><UiInput aria-label="Buscar registro" placeholder="Buscar por correo, nombre o empresa" value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:max-w-sm" /><label className="flex gap-2 text-sm"><input type="checkbox" checked={onlyIncomplete} onChange={e => setOnlyIncomplete(e.target.checked)} />Solo registros incompletos</label></div>
    {loading && <p role="status" className="text-sm">Consultando cuentas de acceso y empresas…</p>}
    {!loading && !error && !filtered.length && <p className="text-sm">No hay registros que coincidan en las páginas consultadas.</p>}
    <div className="overflow-x-auto rounded-md border border-[var(--gray-a6)]"><table className="w-full text-sm text-left"><thead><tr className="bg-[var(--gray-2)]"><th className="p-3">Cliente y contacto</th><th className="p-3">Empresa</th><th className="p-3">Qué falta</th><th className="p-3">Acciones</th></tr></thead><tbody>
      {filtered.map(user => <tr key={user.uid} className="align-top border-t border-[var(--gray-a4)]"><td className="p-3"><strong>{user.name || 'Nombre por confirmar'}</strong><p>{user.email}</p><p className="text-xs text-[var(--gray-11)]">{user.phone || 'Teléfono no registrado'}</p><p className="text-xs">{user.emailVerified ? 'Correo verificado' : 'Correo sin verificar'}</p><p className="text-xs text-[var(--gray-11)]">Registro: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-EC') : 'Sin fecha'}</p></td><td className="p-3">{user.companyName || 'Empresa no creada'}<p className="text-xs">{{ pending_approval: 'Pendiente de aprobación', trial: 'Prueba', active: 'Activo', suspended: 'Suspendido', expired: 'Vencido' }[user.planStatus] || user.planStatus}</p></td><td className="p-3">{user.missing.length ? <ul className="list-disc pl-4 space-y-1">{user.missing.map(item => <li key={item}>{item}</li>)}</ul> : 'Alta completa'}{user.canComplete && <p className="mt-2 text-xs text-[var(--amber-11)]">Confirma con el cliente su nombre y el de su negocio antes de completar el alta.</p>}</td><td className="p-3"><div className="flex flex-col gap-2 min-w-36">
        <a href={`mailto:${user.email}`} className="rounded-md border border-[var(--gray-a6)] px-3 py-2 text-center">Contactar por correo</a>
        {user.canComplete && <button type="button" disabled={busy} onClick={() => { setSelected(user); setName(user.name); setCompanyName(''); }} className="rounded-md bg-[var(--accent-9)] text-white px-3 py-2">Completar alta</button>}
        {user.canEnable && <button type="button" disabled={busy} onClick={() => setSelected(user)} className="rounded-md bg-[var(--accent-9)] text-white px-3 py-2">Habilitar tenant</button>}
        {user.tenantId && <button type="button" onClick={() => onOpenTenant(user.tenantId)} className="rounded-md border border-[var(--gray-a6)] px-3 py-2">Ver empresa</button>}
      </div></td></tr>)}
    </tbody></table></div>
    {nextPageToken && <button type="button" disabled={loading || busy} onClick={() => load(nextPageToken)} className="rounded-md border border-[var(--gray-a6)] px-3 py-2 text-sm">Consultar más cuentas</button>}
    {selected && <Dialog.Root open onOpenChange={open => { if (!open && !busy) setSelected(null); }}><Dialog.Content maxWidth="480px"><form onSubmit={e => { e.preventDefault(); save(selected.canComplete ? 'complete' : 'enable', selected); }} className="space-y-4">
      <Dialog.Title>{selected.canComplete ? 'Completar registro' : 'Habilitar empresa'}</Dialog.Title><Dialog.Description>{selected.email}</Dialog.Description>
      {error && <p role="alert" className="text-sm text-[var(--red-11)]">{error}</p>}
      {selected.canComplete ? <><label className="block text-sm">Nombre confirmado del cliente<UiInput required maxLength={120} value={name} onChange={e => setName(e.target.value)} className="w-full mt-1" /></label><label className="block text-sm">Nombre confirmado de la empresa<UiInput required maxLength={160} value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full mt-1" /></label><p className="text-xs text-[var(--gray-11)]">Se creará una empresa nueva para esta cuenta, pendiente de aprobación. Después podrás habilitarla.</p></> : <p className="text-sm">Habilitarás {selected.companyName} con 14 días de prueba. El cliente deberá verificar su correo si aún no lo ha hecho.</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setSelected(null)} className="rounded-md border border-[var(--gray-a6)] px-3 py-2">Cancelar</button><button disabled={busy} type="submit" className="rounded-md bg-[var(--accent-9)] text-white px-3 py-2">{busy ? 'Guardando…' : selected.canComplete ? 'Confirmar alta' : 'Confirmar habilitación'}</button></div>
    </form></Dialog.Content></Dialog.Root>}
  </section>;
}
