import React, { useState } from 'react';
import { Plus, Users, Search, Trash2, Edit2, Sparkles, RefreshCw, MapPin, Phone } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { consultarRucSri } from '../../services/sriService';

export default function ThirdPartiesView({ thirdParties, isDarkMode, showToast, db, appId, forcedType }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIdType, setFilterIdType] = useState('all');
  const [filterRegimen, setFilterRegimen] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQueryingSri, setIsQueryingSri] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    ruc: '', 
    email: '', 
    type: forcedType || 'cliente',
    tipoIdentificacion: 'ruc',
    direccion: '',
    telefono: '',
    tipoContribuyente: 'general'
  });

  const filtered = thirdParties.filter(tp => {
    const matchesSearch = tp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tp.ruc.includes(searchTerm) || 
                          (tp.direccion || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !forcedType || tp.type === forcedType;
    const matchesIdType = filterIdType === 'all' || (tp.tipoIdentificacion || 'ruc').toLowerCase() === filterIdType;
    const matchesRegimen = filterRegimen === 'all' || tp.tipoContribuyente === filterRegimen;
    return matchesSearch && matchesType && matchesIdType && matchesRegimen;
  });

  const querySRI = async () => {
    if (!formData.ruc) {
      showToast('Por favor, ingresa un número de RUC o Cédula', 'error');
      return;
    }
    setIsQueryingSri(true);
    try {
      const result = await consultarRucSri(formData.ruc);
      setFormData(prev => ({
        ...prev,
        name: result.name,
        tipoIdentificacion: result.tipoIdentificacion,
        direccion: result.direccion,
        telefono: result.telefono,
        email: result.email || prev.email,
        tipoContribuyente: result.tipoContribuyente || 'general'
      }));
      showToast('Datos fiscales cargados exitosamente desde el SRI', 'success');
    } catch (e) {
      console.error("Error al consultar RUC en ThirdParties:", e);
      showToast(e.message || 'Error al consultar datos en el SRI', 'error');
    } finally {
      setIsQueryingSri(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ruc) {
      showToast('Nombre y RUC/Identificación son obligatorios', 'error');
      return;
    }

    try {
      const docId = formData.id || `tp_${new Date().getTime()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', docId), {
        name: formData.name,
        ruc: formData.ruc,
        email: formData.email,
        type: formData.type || forcedType || 'cliente',
        tipoIdentificacion: formData.tipoIdentificacion || 'ruc',
        direccion: formData.direccion || '',
        telefono: formData.telefono || '',
        tipoContribuyente: formData.tipoContribuyente || 'general',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast('Persona guardada exitosamente', 'success');
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar contacto', 'error');
    }
  };

  const resetForm = () => {
    setFormData({ 
      id: '', 
      name: '', 
      ruc: '', 
      email: '', 
      type: forcedType || 'cliente',
      tipoIdentificacion: 'ruc',
      direccion: '',
      telefono: '',
      tipoContribuyente: 'general'
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', id));
        showToast('Registro eliminado', 'success');
      } catch(e) {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  const inputClass = `w-full text-xs px-3.5 py-3 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'glass-input-dark' 
      : 'glass-input-light'
  }`;

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-xs font-bold transition-all hover-lift shadow-md ${
              isDarkMode 
                ? 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-primary/20 border border-primary/30' 
                : 'bg-primary text-white hover:bg-primary-hover shadow-primary/10'
            }`}
          >
            <Plus size={15} /> Nuevo {forcedType === 'cliente' ? 'Cliente' : forcedType === 'proveedor' ? 'Proveedor' : 'Contacto'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] border w-full sm:w-64 transition-all focus-within:ring-1 focus-within:ring-primary/25 ${
            isDarkMode 
              ? 'bg-[#151722]/80 border-white/10 focus-within:border-primary/50' 
              : 'bg-white border-slate-200 focus-within:border-primary'
          }`}>
            <Search size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
            <input 
              type="text" 
              placeholder={`Buscar por nombre, RUC o dirección...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-current placeholder-gray-500 focus:ring-0"
            />
          </div>

          <select 
            value={filterIdType} 
            onChange={e => setFilterIdType(e.target.value)} 
            className={`px-3 py-2 rounded-[10px] border text-xs font-medium outline-none transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-[#151722]/80 border-white/10 text-gray-300 focus:border-primary/50' 
                : 'bg-white border-slate-200 text-slate-700 focus:border-primary'
            }`}
          >
            <option value="all" className="text-black">Identificación: Todos</option>
            <option value="ruc" className="text-black">RUC</option>
            <option value="cedula" className="text-black">Cédula</option>
            <option value="pasaporte" className="text-black">Pasaporte</option>
          </select>

          <select 
            value={filterRegimen} 
            onChange={e => setFilterRegimen(e.target.value)} 
            className={`px-3 py-2 rounded-[10px] border text-xs font-medium outline-none transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-[#151722]/80 border-white/10 text-gray-300 focus:border-primary/50' 
                : 'bg-white border-slate-200 text-slate-700 focus:border-primary'
            }`}
          >
            <option value="all" className="text-black">Régimen: Todos</option>
            <option value="general" className="text-black">General</option>
            <option value="rimpe_emprendedor" className="text-black">RIMPE Emprendedor</option>
            <option value="rimpe_popular" className="text-black">RIMPE Popular</option>
          </select>
        </div>
      </div>

      <div className={`rounded-[10px] border overflow-hidden backdrop-blur-xl transition-all shadow-sm ${
        isDarkMode 
          ? 'border-white/5 bg-[#0f111a]/85 shadow-lg shadow-black/40' 
          : 'border-slate-200/80 bg-white'
      }`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className={`text-[10px] uppercase font-bold tracking-wider ${
              isDarkMode 
                ? 'bg-black/35 text-slate-400 border-b border-white/5' 
                : 'bg-slate-50 text-slate-600 border-b border-slate-100'
            }`}>
              <tr>
                <th className="px-6 py-3.5">Razón Social / Nombres</th>
                <th className="px-6 py-3.5">Identificación</th>
                <th className="px-6 py-3.5">Teléfono</th>
                <th className="px-6 py-3.5">Dirección Domicilio</th>
                <th className="px-6 py-3.5">Correo Notificación</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
              {filtered.map(tp => {
                const initials = tp.name ? tp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'C';
                const colors = [
                  'from-blue-400 to-indigo-500',
                  'from-purple-400 to-violet-600',
                  'from-emerald-400 to-teal-500',
                  'from-orange-400 to-amber-500',
                  'from-sky-400 to-blue-500'
                ];
                // simple hash to choose color consistently
                const charCodeSum = tp.name ? tp.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
                const colorClass = colors[charCodeSum % colors.length];

                return (
                  <tr key={tp.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50/40'}`}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                          {initials}
                        </div>
                        <div>
                          <p className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-black'}`}>{tp.name}</p>
                          {tp.tipoContribuyente && (
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase inline-flex items-center gap-1 mt-1 border ${
                              tp.tipoContribuyente === 'general' ? (isDarkMode ? 'bg-primary/10 text-primary border-primary/20' : 'bg-primary-light text-primary border-primary/20') :
                              tp.tipoContribuyente === 'rimpe_emprendedor' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200') :
                              (isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-800 border-amber-250')
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${
                                tp.tipoContribuyente === 'general' ? 'bg-primary' :
                                tp.tipoContribuyente === 'rimpe_emprendedor' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                              }`}></span>
                              Régimen: {tp.tipoContribuyente.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs">
                      <span className="text-[9px] text-gray-500 font-bold block uppercase opacity-85">{tp.tipoIdentificacion || 'ruc'}</span>
                      <span className={isDarkMode ? 'text-gray-300' : 'text-black font-semibold'}>{tp.ruc}</span>
                    </td>
                    <td className={`px-6 py-3.5 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-black'}`}>{tp.telefono || '-'}</td>
                    <td className={`px-6 py-3.5 text-xs max-w-[220px] truncate ${isDarkMode ? 'text-gray-400' : 'text-black font-semibold'}`} title={tp.direccion}>{tp.direccion || '-'}</td>
                    <td className="px-6 py-3.5 text-xs font-bold text-primary hover:underline"><a href={`mailto:${tp.email}`}>{tp.email || '-'}</a></td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setFormData(tp); setIsModalOpen(true); }} className={`p-2 rounded-[10px] transition-colors ${isDarkMode ? 'hover:bg-primary/15 text-primary border border-transparent' : 'hover:bg-primary-light text-primary border border-gray-100'}`} title="Editar"><Edit2 size={13}/></button>
                        <button onClick={() => handleDelete(tp.id)} className={`p-2 rounded-[10px] transition-colors ${isDarkMode ? 'hover:bg-red-500/15 text-red-400 border border-transparent' : 'hover:bg-red-50 text-red-650 border border-gray-200'}`} title="Eliminar"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">No se encontraron registros de personas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg p-6 sm:p-8 rounded-[2rem] shadow-2xl transition-all duration-300 border ${isDarkMode ? 'glass-panel-dark text-white' : 'glass-panel-light text-gray-900'}`}>
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
              <h2 className="text-base font-bold font-display uppercase tracking-wider">
                {formData.id ? 'Editar' : 'Nuevo'} {forcedType === 'cliente' ? 'Cliente' : forcedType === 'proveedor' ? 'Proveedor' : 'Contacto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-black/5 text-gray-550 hover:text-gray-900'}`}>
                <Plus size={16} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tipo Identificación</label>
                  <select value={formData.tipoIdentificacion || 'ruc'} onChange={e => setFormData({...formData, tipoIdentificacion: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="ruc" className="text-black">RUC (13 dígitos)</option>
                    <option value="cedula" className="text-black">Cédula de Identidad (10 dígitos)</option>
                    <option value="pasaporte" className="text-black">Pasaporte</option>
                    <option value="consumidor_final" className="text-black">Consumidor Final</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Identificación</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      required 
                      value={formData.ruc} 
                      onChange={e => setFormData({...formData, ruc: e.target.value})} 
                      className={inputClass} 
                      placeholder="1790000000001" 
                    />
                    <button
                      type="button"
                      disabled={isQueryingSri}
                      onClick={querySRI}
                      className={`px-4 rounded-xl border flex items-center justify-center transition-all shrink-0 hover-lift ${
                        isDarkMode 
                          ? 'bg-purple-600/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                          : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 shadow-sm'
                      }`}
                      title="Consultar base del SRI"
                    >
                      {isQueryingSri ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Razón Social / Nombres Completos</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="Ej. Juan Pérez o WEBFIX S.A." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Teléfono Contacto</label>
                  <input type="text" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} className={inputClass} placeholder="Ej. 0998765432 o 022987654" />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Régimen Contribuyente</label>
                  <select value={formData.tipoContribuyente || 'general'} onChange={e => setFormData({...formData, tipoContribuyente: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="general" className="text-black">Régimen General</option>
                    <option value="rimpe_popular" className="text-black">RIMPE Popular</option>
                    <option value="rimpe_emprendedor" className="text-black">RIMPE Emprendedor</option>
                    <option value="microempresas" className="text-black">Microempresas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Dirección Matriz / Domicilio</label>
                <input type="text" value={formData.direccion || ''} onChange={e => setFormData({...formData, direccion: e.target.value})} className={inputClass} placeholder="Av. de los Shyris y Holanda, Quito" />
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Correo Electrónico (Notificación SRI)</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="correo@ejemplo.com" />
              </div>

              {!forcedType && (
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tipo de Relación</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="cliente" className="text-black">Cliente</option>
                    <option value="proveedor" className="text-black">Proveedor</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>Cancelar</button>
                <button type="submit" className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover-lift shadow-md ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-primary to-primary-hover text-white hover:from-primary hover:to-primary-hover' 
                    : 'bg-primary text-white hover:bg-primary-hover'
                }`}>Guardar Persona</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
