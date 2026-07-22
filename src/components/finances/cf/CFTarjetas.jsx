import React, { useState } from 'react';
import { Plus, CreditCard } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { formatMoney } from '../../../services/financialService';

const BLANK_CARD = {
  name: '',
  type: 'credito',
  limit: 0,
  usedAmount: 0,
  closingDay: 20,
  dueDay: 5,
  banco: '',
  currency: 'USD',
  notes: ''
};

/**
 * CFTarjetas — Gestión de tarjetas de crédito/débito y líneas de crédito.
 * Props: { financialCards, db, appId, showToast }
 */
export default function CFTarjetas({ financialCards = [], db, appId, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_CARD);
  const [saving, setSaving] = useState(false);

  const totalDeuda = financialCards.reduce((s, c) => s + Number(c.usedAmount || 0), 0);
  const totalCupo = financialCards.reduce((s, c) => s + Number(c.limit || 0), 0);

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast?.('El nombre es requerido', 'error');
      return;
    }
    setSaving(true);
    try {
      const id = form.id || `card_${Date.now()}`;
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'financial_cards', id),
        { ...form, id, updatedAt: new Date().toISOString() }
      );
      showToast?.('Tarjeta guardada correctamente', 'success');
      setShowForm(false);
      setForm(BLANK_CARD);
    } catch (e) {
      console.error('Error saving card:', e);
      showToast?.('Error al guardar la tarjeta', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botón acción a la izquierda */}
      <div className="flex justify-start">
        <button
          onClick={() => { setForm(BLANK_CARD); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={13} /> Nueva Tarjeta / Crédito
        </button>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-[10px] font-bold text-blue-600 uppercase">Cupo Total Disponible</p>
          <p className="text-xl font-bold text-blue-900 mt-1">{formatMoney(totalCupo)}</p>
        </div>
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
          <p className="text-[10px] font-bold text-rose-700 uppercase">Deuda Total</p>
          <p className="text-xl font-bold text-rose-900 mt-1">{formatMoney(totalDeuda)}</p>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {financialCards.length === 0 ? (
          <div className="col-span-full p-10 text-center text-sm text-slate-400 border border-dashed border-slate-300 rounded-2xl">
            <CreditCard size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold">Sin tarjetas registradas</p>
            <p className="text-xs mt-1">Agrega tus tarjetas empresariales o personales para controlar el cupo.</p>
          </div>
        ) : (
          financialCards.map(c => {
            const pct = c.limit > 0
              ? Math.min(100, Math.round((Number(c.usedAmount || 0) / Number(c.limit)) * 100))
              : 0;
            const barColor = pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div
                key={c.id}
                onClick={() => { setForm(c); setShowForm(true); }}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <CreditCard size={14} className="text-blue-600" />
                  <span className="font-bold text-xs text-slate-800 flex-1 truncate">{c.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase shrink-0">
                    {c.type}
                  </span>
                </div>
                {c.banco && (
                  <p className="text-[11px] text-slate-500">
                    Banco: <span className="font-semibold text-slate-700">{c.banco}</span>
                  </p>
                )}
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Cupo Total:</span>
                    <span className="font-bold text-slate-800">{formatMoney(c.limit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usado:</span>
                    <span className="font-bold text-rose-700">{formatMoney(c.usedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Disponible:</span>
                    <span className="font-bold text-emerald-700">{formatMoney(Math.max(0, Number(c.limit) - Number(c.usedAmount || 0)))}</span>
                  </div>
                </div>
                {/* Barra de uso */}
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{pct}% usado</span>
                  <span>Corte día {c.closingDay} · Pago día {c.dueDay}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {form.id ? 'Editar Tarjeta / Crédito' : 'Nueva Tarjeta / Crédito'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Nombre *</label>
                <input
                  value={form.name}
                  onChange={e => setF('name', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200"
                  placeholder="Ej: Visa Gold Empresa"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setF('type', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                >
                  <option value="credito">Tarjeta de Crédito</option>
                  <option value="debito">Tarjeta de Débito</option>
                  <option value="prestamo">Préstamo</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cupo / Monto ($)</label>
                <input
                  type="number"
                  value={form.limit}
                  onChange={e => setF('limit', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Banco / Institución</label>
                <input
                  value={form.banco}
                  onChange={e => setF('banco', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  placeholder="Ej: Banco Pichincha"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Saldo Usado ($)</label>
                <input
                  type="number"
                  value={form.usedAmount}
                  onChange={e => setF('usedAmount', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Día de Corte</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.closingDay}
                  onChange={e => setF('closingDay', parseInt(e.target.value) || 20)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Día de Pago</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.dueDay}
                  onChange={e => setF('dueDay', parseInt(e.target.value) || 5)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
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
