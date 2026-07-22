import React, { useState } from 'react';
import { Plus, Building2, Wallet } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { formatMoney } from '../../../services/financialService';

const BLANK_BANK = {
  name: '',
  type: 'banco',
  saldo: 0,
  numero: '',
  banco: '',
  currency: 'USD',
  notes: ''
};

/**
 * CFBancosCaja — Gestión de cuentas bancarias y cajas con saldos.
 * Props: { bankAccounts, db, appId, showToast }
 */
export default function CFBancosCaja({ bankAccounts = [], db, appId, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_BANK);
  const [saving, setSaving] = useState(false);

  const totalBancos = bankAccounts
    .filter(b => b.type === 'banco' || b.type === 'ahorro')
    .reduce((s, b) => s + Number(b.saldo || 0), 0);
  const totalCajas = bankAccounts
    .filter(b => b.type === 'caja')
    .reduce((s, b) => s + Number(b.saldo || 0), 0);

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast?.('El nombre es requerido', 'error');
      return;
    }
    setSaving(true);
    try {
      const id = form.id || `bank_${Date.now()}`;
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'financial_banks', id),
        { ...form, id, updatedAt: new Date().toISOString() }
      );
      showToast?.('Cuenta guardada correctamente', 'success');
      setShowForm(false);
      setForm(BLANK_BANK);
    } catch (e) {
      console.error('Error saving bank account:', e);
      showToast?.('Error al guardar la cuenta', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botón acción a la izquierda */}
      <div className="flex justify-start">
        <button
          onClick={() => { setForm(BLANK_BANK); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={13} /> Nueva Cuenta / Caja
        </button>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase">Total Bancos</p>
            <p className="text-lg font-bold text-blue-900">{formatMoney(totalBancos)}</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Wallet size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase">Total Cajas</p>
            <p className="text-lg font-bold text-amber-900">{formatMoney(totalCajas)}</p>
          </div>
        </div>
      </div>

      {/* Lista de cuentas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.length === 0 ? (
          <div className="col-span-full p-10 text-center text-sm text-slate-400 border border-dashed border-slate-300 rounded-2xl">
            <Building2 size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold">Sin cuentas configuradas</p>
            <p className="text-xs mt-1">Agrega tu primera cuenta bancaria o caja para gestionar saldos.</p>
          </div>
        ) : (
          bankAccounts.map(b => (
            <div
              key={b.id}
              onClick={() => { setForm(b); setShowForm(true); }}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                {b.type === 'banco' || b.type === 'ahorro'
                  ? <Building2 size={14} className="text-blue-500" />
                  : <Wallet size={14} className="text-amber-500" />
                }
                <span className="font-bold text-xs text-slate-800 flex-1 truncate">{b.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase shrink-0">
                  {b.type}
                </span>
              </div>
              {b.banco && (
                <p className="text-[11px] text-slate-500">
                  Banco: <span className="font-semibold text-slate-700">{b.banco}</span>
                </p>
              )}
              {b.numero && (
                <p className="text-[11px] text-slate-500">
                  N°: <span className="font-mono text-slate-700">{b.numero}</span>
                </p>
              )}
              <p className="text-base font-bold text-slate-900">{formatMoney(b.saldo || 0)}</p>
            </div>
          ))
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md border border-border-default space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {form.id ? 'Editar Cuenta / Caja' : 'Nueva Cuenta / Caja'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Nombre *</label>
                <input
                  value={form.name}
                  onChange={e => setF('name', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200"
                  placeholder="Ej: Banco Pichincha Corriente"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo *</label>
                <select
                  value={form.type}
                  onChange={e => setF('type', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                >
                  <option value="banco">Banco — Cuenta Corriente</option>
                  <option value="ahorro">Banco — Cuenta Ahorro</option>
                  <option value="caja">Caja Chica / Efectivo</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Saldo Actual</label>
                <input
                  type="number"
                  value={form.saldo}
                  onChange={e => setF('saldo', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Institución Bancaria</label>
                <input
                  value={form.banco}
                  onChange={e => setF('banco', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  placeholder="Ej: Banco Pichincha"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">N° de Cuenta</label>
                <input
                  value={form.numero}
                  onChange={e => setF('numero', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  placeholder="Ej: 2200012345"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Notas</label>
                <input
                  value={form.notes}
                  onChange={e => setF('notes', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  placeholder="Observaciones opcionales"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-60 cursor-pointer"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
