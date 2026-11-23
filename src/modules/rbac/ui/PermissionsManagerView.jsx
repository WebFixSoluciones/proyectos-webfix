import { useState } from 'react';
import { Shield, Edit2, KeyRound, Lock, Save, X, CheckCircle2, UserX, UserCheck } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import {
  MODULE_PERMISSIONS,
  ACTION_PERMISSIONS,
  ROLE_PRESETS,
  createPermissionsFromPreset
} from '../domain/permissions.js';
import {
  resolveEffectivePermissions,
  hashSupervisorPin
} from '../application/rbacService.js';

/**
 * Gestor de Permisos Granulares, Puntos de Emisión, Bodegas y PIN Supervisor por Usuario.
 * Compatible 100% con la colección `/users/{uid}` existente (actualiza campos adicionales sin borrar nada).
 */
export default function PermissionsManagerView({
  db,
  users = [],
  tenantInfo = null,
  warehouses = [],
  emissionPoints = [],
  showToast,
  onToggleUserStatus
}) {
  const [editingUser, setEditingUser] = useState(null);
  const [formState, setFormState] = useState(null);
  const [newPin, setNewPin] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditor = (u) => {
    const perms = resolveEffectivePermissions(u);
    setEditingUser(u);
    setNewPin('');
    setFormState({
      name: u.name || '',
      job: u.job || '',
      role: u.role === 'admin' ? 'admin' : 'staff',
      preset: perms.preset || (u.role === 'admin' ? 'admin' : 'vendedor'),
      modules: { ...perms.modules },
      actions: { ...perms.actions },
      maxDiscountPct: perms.scope?.maxDiscountPct ?? 10,
      assignedWarehouses: [...(perms.scope?.assignedWarehouses || [])],
      assignedEmissionPoint: perms.scope?.assignedEmissionPoint || null
    });
  };

  const applyPreset = (presetId) => {
    const preset = ROLE_PRESETS[presetId];
    if (!preset) return;
    const generated = createPermissionsFromPreset(presetId);
    setFormState((prev) => ({
      ...prev,
      role: preset.baseRole,
      preset: presetId,
      modules: generated.modules,
      actions: generated.actions,
      maxDiscountPct: generated.scope.maxDiscountPct
    }));
  };

  const handleSave = async () => {
    if (!editingUser || !formState) return;
    setSaving(true);
    try {
      const uid = editingUser.uid || editingUser.id;
      const isOwner = tenantInfo?.ownerUid && uid === tenantInfo.ownerUid;

      const payload = {
        name: formState.name.trim() || editingUser.name || '',
        job: formState.job.trim(),
        role: isOwner ? 'admin' : formState.role,
        permissions: {
          preset: formState.preset,
          modules: formState.modules,
          actions: formState.actions,
          scope: {
            maxDiscountPct: Math.max(0, Math.min(100, Number(formState.maxDiscountPct) || 0)),
            assignedWarehouses: formState.assignedWarehouses,
            assignedEmissionPoint: formState.assignedEmissionPoint
          }
        },
        updatedAt: new Date().toISOString()
      };

      if (newPin.trim()) {
        if (newPin.trim().length < 4) {
          showToast?.('El PIN de supervisor POS debe tener al menos 4 dígitos/caracteres.', 'error');
          setSaving(false);
          return;
        }
        payload.posSupervisorPinHash = hashSupervisorPin(newPin.trim());
      }

      await updateDoc(doc(db, 'users', uid), payload);
      showToast?.(`Permisos actualizados para ${payload.name || editingUser.email}`, 'success');
      setEditingUser(null);
      setFormState(null);
    } catch (err) {
      showToast?.(`No se pudo guardar los permisos: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
        <Shield size={16} className="text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <strong>Control de Accesos y Permisos (RBAC):</strong> Asigna perfiles por rol, controla qué módulos y acciones puede ejecutar cada colaborador, fija su <strong>Punto de Emisión SRI</strong>, restringe bodegas y establece el <strong>PIN de supervisor POS</strong>.
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Usuario</th>
              <th className="py-2.5 px-3 font-semibold">Perfil / Rol</th>
              <th className="py-2.5 px-3 font-semibold">Pto. Emisión / Tope Dto.</th>
              <th className="py-2.5 px-3 font-semibold">Estado</th>
              <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const uid = u.uid || u.id;
              const isOwner = Boolean(tenantInfo?.ownerUid && uid === tenantInfo.ownerUid);
              const perms = resolveEffectivePermissions(u);
              const ep = perms.scope?.assignedEmissionPoint;
              const presetLabel = ROLE_PRESETS[perms.preset]?.label || (u.role === 'admin' ? 'Administrador' : 'Operador');

              return (
                <tr key={uid} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{u.name || 'Sin nombre'}</span>
                      {isOwner && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Propietario</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{u.email} {u.job ? `• ${u.job}` : ''}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold text-[11px]">
                      {presetLabel}
                    </span>
                    {u.posSupervisorPinHash && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                        <KeyRound size={10} /> PIN POS
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                    {ep ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                        <Lock size={10} /> {ep.estab}-{ep.ptoEmi}
                      </span>
                    ) : (
                      <span className="text-slate-400">Libre</span>
                    )}
                    <span className="ml-2 text-slate-500">Máx Dto: {perms.scope?.maxDiscountPct ?? 100}%</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      u.status !== 'inactive' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {u.status !== 'inactive' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditor(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 font-semibold cursor-pointer"
                      >
                        <Edit2 size={12} />
                        <span>Permisos</span>
                      </button>
                      {!isOwner && onToggleUserStatus && (
                        <button
                          type="button"
                          onClick={() => onToggleUserStatus(u)}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            u.status !== 'inactive'
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={u.status !== 'inactive' ? 'Desactivar usuario' : 'Reactivar usuario'}
                        >
                          {u.status !== 'inactive' ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Editor de Permisos */}
      {editingUser && formState && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/55 p-3 sm:p-4">
          <div className="w-full max-w-3xl max-h-[90dvh] flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Permisos de {editingUser.name || editingUser.email}</h3>
                <p className="text-xs text-slate-500">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => { setEditingUser(null); setFormState(null); }}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Datos básicos y Preset */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cargo / Puesto</label>
                  <input
                    type="text"
                    value={formState.job}
                    onChange={(e) => setFormState((p) => ({ ...p, job: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plantilla de Rol</label>
                  <select
                    value={formState.preset}
                    onChange={(e) => applyPreset(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white"
                  >
                    {Object.values(ROLE_PRESETS).map((pr) => (
                      <option key={pr.id} value={pr.id}>{pr.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alcance operativo: Punto de emisión, Descuento, PIN POS y Bodegas */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                  Seguridad Operativa: Punto de Emisión SRI, Descuentos y PIN POS
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Punto de Emisión Fijo</label>
                    <select
                      value={formState.assignedEmissionPoint ? `${formState.assignedEmissionPoint.estab}-${formState.assignedEmissionPoint.ptoEmi}` : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setFormState((p) => ({ ...p, assignedEmissionPoint: null }));
                        } else {
                          const [estab, ptoEmi] = val.split('-');
                          setFormState((p) => ({ ...p, assignedEmissionPoint: { estab, ptoEmi, locked: true } }));
                        }
                      }}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white font-mono"
                    >
                      <option value="">Cualquier punto activo</option>
                      {emissionPoints.map((ep) => (
                        <option key={ep.id} value={`${ep.estab}-${ep.ptoEmi}`}>
                          {ep.estab}-{ep.ptoEmi} ({ep.label})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tope de Descuento (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formState.maxDiscountPct}
                      onChange={(e) => setFormState((p) => ({ ...p, maxDiscountPct: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nuevo PIN Supervisor POS</label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder={editingUser.posSupervisorPinHash ? '•••• (ya configurado)' : 'Ej. 4829 (opcional)'}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                {warehouses.length > 0 && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Bodegas Permitidas (vacío = todas las bodegas)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {warehouses.map((w) => {
                        const checked = formState.assignedWarehouses.includes(w.id);
                        return (
                          <label key={w.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer ${
                            checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' : 'bg-white border-slate-200 text-slate-600'
                          }`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setFormState((p) => ({
                                  ...p,
                                  assignedWarehouses: e.target.checked
                                    ? [...p.assignedWarehouses, w.id]
                                    : p.assignedWarehouses.filter((id) => id !== w.id)
                                }));
                              }}
                            />
                            <span>{w.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Matriz de Módulos */}
              <div>
                <div className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2">Acceso a Módulos</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODULE_PERMISSIONS.map((m) => (
                    <label key={m.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-900">{m.label}</div>
                        <div className="text-[10px] text-slate-500">{m.group}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formState.modules[m.id] !== false}
                        onChange={(e) => setFormState((p) => ({
                          ...p,
                          modules: { ...p.modules, [m.id]: e.target.checked }
                        }))}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Matriz de Acciones */}
              <div>
                <div className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2">Permisos por Acción Crítica</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACTION_PERMISSIONS.map((a) => (
                    <label key={a.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <span className="font-medium text-slate-800">{a.label}</span>
                      <input
                        type="checkbox"
                        checked={formState.actions[a.id] === true}
                        onChange={(e) => setFormState((p) => ({
                          ...p,
                          actions: { ...p.actions, [a.id]: e.target.checked }
                        }))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" /> Los cambios aplican de inmediato sin cerrar sesión.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setEditingUser(null); setFormState(null); }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1b1b1b] text-white text-xs font-semibold hover:bg-black cursor-pointer"
                >
                  <Save size={14} />
                  <span>{saving ? 'Guardando...' : 'Guardar Permisos'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
