import { useEffect, useState } from 'react';
import { Building, CheckCircle2, Mail, RefreshCw, Search, ShieldAlert, Sparkles, UserCheck, UserPlus } from 'lucide-react';
import { auth } from '../../firebase';
import { UiButton, UiInput, UiModalCloseButton, UiSelect } from '../ui/controls';
import { UiIconBadge } from '../ui/UiIconBadge';
import { UiSegmentedTabs } from '../ui/UiSegmentedTabs';
import { computeDefaultExpiryDate } from '../../services/tenantAdminModel';
import { isBasePlanCategory } from '../../services/subscriptionPlan';

const STATUS_BADGE = {
  pending_approval: { label: 'Pendiente', cls: 'bg-[#FCFBE7] text-[#866308] border-[#F0DF8A]' },
  trial: { label: 'Prueba', cls: 'bg-[#F4F4F5] text-[#474747] border-[#E3E3E3]' },
  active: { label: 'Activo', cls: 'bg-[#E8FEDF] text-[#004227] border-[#B3F4CB]' },
  suspended: { label: 'Suspendido', cls: 'bg-[#FFF0F5] text-[#851B40] border-[#FBC6D9]' },
  expired: { label: 'Vencido', cls: 'bg-[#FFF0F5] text-[#851B40] border-[#FBC6D9]' }
};

export default function RegistrationAdminView({ showToast, onOpenTenant, onSummary, plans = [] }) {
  const [users, setUsers] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [withoutEmail, setWithoutEmail] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMode, setFilterMode] = useState('incomplete'); // 'incomplete' | 'all'
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [enableForm, setEnableForm] = useState({
    planStatus: 'active',
    planId: 'starter',
    billingPeriod: 'monthly',
    expiresAt: computeDefaultExpiryDate('active', 'monthly')
  });
  const [busy, setBusy] = useState(false);

  const basePlans = plans.filter(p => isBasePlanCategory(p.category || 'erp'));
  const selectablePlans = basePlans.length > 0
    ? basePlans
    : [
        { id: 'starter', name: 'Starter', category: 'erp', priceMonthly: 29 },
        { id: 'professional', name: 'Profesional', category: 'erp', priceMonthly: 79 },
        { id: 'enterprise', name: 'Enterprise', category: 'erp', priceMonthly: 149 }
      ];

  async function request(method, body, pageToken) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Inicia sesión nuevamente para consultar las altas.');
    const response = await fetch(`/api/admin/users${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ''}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      throw new Error(data?.error || 'El servicio de altas no está disponible. Comprueba que la aplicación y la API estén publicadas.');
    }
    return data;
  }

  async function load(pageToken) {
    setLoading(true);
    setError('');
    try {
      const data = await request('GET', null, pageToken);
      setUsers(previous => pageToken ? [...previous, ...data.users] : data.users);
      setWithoutEmail(previous => pageToken ? previous + data.withoutEmail : data.withoutEmail);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openEnableModal(user) {
    const initialPlanId = user.planId || selectablePlans[0]?.id || 'starter';
    const initialPeriod = user.billingPeriod || 'monthly';
    setEnableForm({
      planStatus: 'active',
      planId: initialPlanId,
      billingPeriod: initialPeriod,
      expiresAt: computeDefaultExpiryDate('active', initialPeriod)
    });
    setSelected(user);
    setError('');
  }

  async function save(action, user) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = action === 'complete'
        ? { action, uid: user.uid, name, companyName }
        : {
            action,
            uid: user.uid,
            planStatus: enableForm.planStatus,
            planId: enableForm.planId,
            billingPeriod: enableForm.billingPeriod,
            expiresAt: enableForm.expiresAt
          };
      const result = await request('POST', payload);
      showToast?.(result.message, 'success');
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.message);
      showToast?.(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const incomplete = users.filter(user => user.incomplete).length;
  const filtered = users.filter(user =>
    (filterMode === 'all' || user.incomplete) &&
    `${user.name} ${user.email} ${user.companyName}`.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    onSummary?.({ loading, incomplete, hasMore: Boolean(nextPageToken), error });
  }, [loading, incomplete, nextPageToken, error, onSummary]);

  return (
    <section className="space-y-5">
      {/* Cabecera */}
      <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UiIconBadge level="header" tone="brand" icon={UserCheck} />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#1B1B1B] truncate">Usuarios y altas de clientes</h2>
            <p className="text-xs text-[#696969]">
              Detecta registros incompletos, completa perfiles huérfanos y activa tenants eligiendo plan y ciclo.
            </p>
          </div>
        </div>
        <UiButton
          type="button"
          variant="secondary"
          size="md"
          disabled={loading || busy}
          onClick={() => load()}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </UiButton>
      </div>

      {error && (
        <div role="alert" className="rounded-xl p-3.5 bg-[#FFF0F5] border border-[#FBC6D9] text-[#851B40] text-xs font-medium">
          {error}
        </div>
      )}

      {/* Resumen + Filtros */}
      <div className="bg-white border border-[#E3E3E3] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <UiSegmentedTabs
            value={filterMode}
            onChange={setFilterMode}
            items={[
              { value: 'incomplete', label: 'Incompletos / Pendientes', count: incomplete },
              { value: 'all', label: 'Todas las cuentas', count: users.length }
            ]}
          />
          <div className="w-full md:w-72">
            <UiInput
              aria-label="Buscar registro"
              placeholder="Buscar por correo, nombre o empresa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              iconPrefix={<Search size={14} className="text-[#696969]" />}
              size="2"
              className="w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#696969]">
          <span><strong className="text-[#1B1B1B]">{incomplete}</strong> altas pendientes o incompletas</span>
          {withoutEmail > 0 && <span>· {withoutEmail} cuentas sin correo separadas</span>}
          {nextPageToken && <span className="text-[#866308] font-semibold">· Hay más cuentas disponibles</span>}
        </div>
      </div>

      {loading && (
        <div role="status" className="bg-white border border-[#E3E3E3] rounded-2xl p-8 text-center text-xs text-[#696969]">
          Consultando cuentas de acceso y empresas…
        </div>
      )}

      {!loading && !error && !filtered.length && (
        <div className="bg-white border border-[#E3E3E3] rounded-2xl p-10 text-center space-y-2">
          <div className="flex justify-center">
            <UiIconBadge level="empty" tone="brand" icon={CheckCircle2} />
          </div>
          <p className="text-sm font-bold text-[#1B1B1B]">Sin registros pendientes</p>
          <p className="text-xs text-[#696969]">No hay cuentas que coincidan con el filtro seleccionado.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {/* Vista Smartphone: Tarjetas */}
          <div className="md:hidden space-y-3">
            {filtered.map(user => {
              const badge = STATUS_BADGE[user.planStatus] || { label: user.planStatus || 'Sin empresa', cls: 'bg-[#F4F4F5] text-[#474747] border-[#E3E3E3]' };
              return (
                <div key={user.uid} className="bg-white border border-[#E3E3E3] rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1B1B1B] truncate">{user.name || 'Nombre por confirmar'}</p>
                      <p className="text-xs text-[#474747] truncate">{user.email}</p>
                      <p className="text-[11px] text-[#696969] mt-0.5">
                        {user.companyName || 'Empresa no creada'} · {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-EC') : 'Sin fecha'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {user.missing.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#FCFBE7] border border-[#F0DF8A] text-[11px] text-[#866308] space-y-1">
                      <p className="font-bold flex items-center gap-1"><ShieldAlert size={12} /> Pendiente:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {user.missing.map(item => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {user.canComplete && (
                      <UiButton
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={busy}
                        onClick={() => { setSelected(user); setName(user.name); setCompanyName(''); setError(''); }}
                        className="flex-1"
                      >
                        <UserPlus size={13} />
                        <span>Completar alta</span>
                      </UiButton>
                    )}
                    {user.canEnable && (
                      <UiButton
                        type="button"
                        variant="brand"
                        size="sm"
                        disabled={busy}
                        onClick={() => openEnableModal(user)}
                        className="flex-1"
                      >
                        <Sparkles size={13} />
                        <span>Activar tenant</span>
                      </UiButton>
                    )}
                    {user.tenantId && (
                      <UiButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenTenant(user.tenantId)}
                      >
                        <Building size={13} />
                        <span>Ver empresa</span>
                      </UiButton>
                    )}
                    <a
                      href={`mailto:${user.email}`}
                      className="inline-flex items-center justify-center gap-1.5 h-[30px] px-2.5 rounded-[10px] border border-[#E3E3E3] bg-white hover:bg-[#FAFAFA] text-[#1B1B1B] text-xs font-semibold"
                    >
                      <Mail size={13} />
                      <span>Correo</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista Escritorio: Tabla */}
          <div className="hidden md:block bg-white border border-[#E3E3E3] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E3E3E3] text-[#696969] uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Cliente y contacto</th>
                    <th className="py-3 px-4">Empresa y plan</th>
                    <th className="py-3 px-4">Estado del alta</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEFEF]">
                  {filtered.map(user => {
                    const badge = STATUS_BADGE[user.planStatus] || { label: user.planStatus || 'Sin empresa', cls: 'bg-[#F4F4F5] text-[#474747] border-[#E3E3E3]' };
                    return (
                      <tr key={user.uid} className="align-top hover:bg-[#FAFAFA]">
                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="font-bold text-[#1B1B1B]">{user.name || 'Nombre por confirmar'}</div>
                          <div className="text-[#474747]">{user.email}</div>
                          <div className="text-[11px] text-[#696969]">
                            {user.phone || 'Sin teléfono'} · {user.emailVerified ? 'Correo verificado' : 'Sin verificar'}
                          </div>
                          <div className="text-[11px] text-[#696969]">
                            Registro: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-EC') : 'Sin fecha'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 space-y-1">
                          <div className="font-semibold text-[#1B1B1B]">{user.companyName || 'Empresa no creada'}</div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>{badge.label}</span>
                            {user.tenantId && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAFAFA] border border-[#E3E3E3] text-[#474747] capitalize">
                                {user.planId} ({user.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {user.missing.length ? (
                            <ul className="list-disc pl-4 space-y-0.5 text-[#866308]">
                              {user.missing.map(item => <li key={item}>{item}</li>)}
                            </ul>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#004227] font-semibold">
                              <CheckCircle2 size={13} className="text-[#0B996F]" /> Alta completa
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1.5">
                            {user.canComplete && (
                              <UiButton
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={busy}
                                onClick={() => { setSelected(user); setName(user.name); setCompanyName(''); setError(''); }}
                              >
                                <UserPlus size={13} />
                                <span>Completar alta</span>
                              </UiButton>
                            )}
                            {user.canEnable && (
                              <UiButton
                                type="button"
                                variant="brand"
                                size="sm"
                                disabled={busy}
                                onClick={() => openEnableModal(user)}
                              >
                                <Sparkles size={13} />
                                <span>Activar tenant</span>
                              </UiButton>
                            )}
                            {user.tenantId && (
                              <UiButton
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => onOpenTenant(user.tenantId)}
                              >
                                <Building size={13} />
                                <span>Ver empresa</span>
                              </UiButton>
                            )}
                            <a
                              href={`mailto:${user.email}`}
                              className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] border border-[#E3E3E3] bg-white hover:bg-[#F0FDF4] hover:border-[#B3F4CB] text-[#474747] hover:text-[#004227] transition-colors"
                              title={`Escribir a ${user.email}`}
                              aria-label="Contactar por correo"
                            >
                              <Mail size={14} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {nextPageToken && (
        <div className="flex justify-center">
          <UiButton type="button" variant="secondary" size="md" disabled={loading || busy} onClick={() => load(nextPageToken)}>
            Consultar más cuentas
          </UiButton>
        </div>
      )}

      {/* Modal Completar Alta / Activar Tenant */}
      {selected && (
        <div
          className="fixed inset-0 z-[280] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => { if (!busy) setSelected(null); }}
        >
          <div
            className="w-full max-w-md bg-white border border-[#E3E3E3] rounded-2xl overflow-hidden max-h-[92dvh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#EFEFEF] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <UiIconBadge level="modal" tone="brand" icon={selected.canComplete ? UserPlus : Sparkles} />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#1B1B1B] truncate">
                    {selected.canComplete ? 'Completar registro de cliente' : `Activar ${selected.companyName || 'empresa'}`}
                  </h3>
                  <p className="text-xs text-[#696969] truncate">{selected.email}</p>
                </div>
              </div>
              <UiModalCloseButton disabled={busy} onClick={() => setSelected(null)} />
            </div>

            <form
              onSubmit={e => { e.preventDefault(); save(selected.canComplete ? 'complete' : 'enable', selected); }}
              className="p-5 space-y-4 overflow-y-auto text-xs"
            >
              {error && (
                <div role="alert" className="p-3 rounded-xl bg-[#FFF0F5] border border-[#FBC6D9] text-[#851B40] font-medium">
                  {error}
                </div>
              )}

              {selected.canComplete ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block font-bold text-[#1B1B1B]">Nombre confirmado del cliente *</label>
                    <UiInput required maxLength={120} value={name} onChange={e => setName(e.target.value)} className="w-full" placeholder="Ej. Carlos Mendoza" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-bold text-[#1B1B1B]">Nombre confirmado de la empresa *</label>
                    <UiInput required maxLength={160} value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full" placeholder="Ej. Comercial Mendoza S.A.S." />
                  </div>
                  <p className="text-[11px] text-[#696969] bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl p-3">
                    Se creará la empresa en estado pendiente de aprobación para que luego elijas su plan y fecha de activación.
                  </p>
                </>
              ) : (
                <>
                  {/* Tipo de activación */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-[#1B1B1B]">Modo de activación</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'active', title: 'Plan Activo', desc: 'Suscripción habilitada' },
                        { id: 'trial', title: 'Prueba (Trial)', desc: '14 días de evaluación' }
                      ].map(opt => {
                        const active = enableForm.planStatus === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setEnableForm(prev => ({
                              ...prev,
                              planStatus: opt.id,
                              expiresAt: computeDefaultExpiryDate(opt.id, prev.billingPeriod)
                            }))}
                            className={`p-3 rounded-[10px] border text-left transition-all cursor-pointer ${
                              active
                                ? 'bg-[#E8FEDF] border-[#0B996F] text-[#004227]'
                                : 'bg-white border-[#E3E3E3] text-[#474747] hover:bg-[#FAFAFA]'
                            }`}
                          >
                            <div className="font-bold text-xs">{opt.title}</div>
                            <div className="text-[11px] opacity-80">{opt.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Plan asignado */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-[#1B1B1B]">Plan asignado</label>
                    <UiSelect
                      value={enableForm.planId}
                      onChange={e => setEnableForm(prev => ({ ...prev, planId: e.target.value }))}
                      className="w-full"
                    >
                      {selectablePlans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ${Number(p.priceMonthly || 0).toFixed(2)}/mes ({(p.category || 'erp').toUpperCase()})
                        </option>
                      ))}
                    </UiSelect>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-[#1B1B1B]">Ciclo</label>
                      <UiSelect
                        value={enableForm.billingPeriod}
                        onChange={e => {
                          const nextPeriod = e.target.value;
                          setEnableForm(prev => ({
                            ...prev,
                            billingPeriod: nextPeriod,
                            expiresAt: computeDefaultExpiryDate(prev.planStatus, nextPeriod)
                          }));
                        }}
                        className="w-full"
                      >
                        <option value="monthly">Mensual</option>
                        <option value="yearly">Anual</option>
                      </UiSelect>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-bold text-[#1B1B1B]">Válido hasta</label>
                      <UiInput
                        type="date"
                        required
                        value={enableForm.expiresAt}
                        onChange={e => setEnableForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
                <UiButton type="button" variant="secondary" size="md" disabled={busy} onClick={() => setSelected(null)}>
                  Cancelar
                </UiButton>
                <UiButton
                  type="submit"
                  variant={selected.canComplete ? 'primary' : 'brand'}
                  size="md"
                  disabled={busy}
                >
                  {busy ? 'Guardando…' : selected.canComplete ? 'Confirmar alta' : enableForm.planStatus === 'active' ? 'Activar Plan' : 'Habilitar Prueba'}
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
