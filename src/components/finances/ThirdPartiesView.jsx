import React, { useState } from 'react';
import { Plus, Users, Search, Trash2, Edit2, Sparkles, RefreshCw, MapPin, Phone } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { consultarRucSri } from '../../services/sriService';

export default function ThirdPartiesView({ thirdParties, showToast, db, appId, forcedType }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIdType, setFilterIdType] = useState('all');
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
    tipoContribuyente: 'general',
    ciudad: ''
  });


  const filtered = thirdParties.filter(tp => {
    const matchesSearch = tp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          String(tp.ruc || '').includes(searchTerm) || 
                          (tp.direccion || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !forcedType || (forcedType === 'cliente' ? tp.type !== 'proveedor' : tp.type === forcedType);
    const matchesIdType = filterIdType === 'all' || (tp.tipoIdentificacion || 'ruc').toLowerCase() === filterIdType;
    return matchesSearch && matchesType && matchesIdType;
  });

  const querySRI = async () => {
    if (!formData.ruc) {
      showToast('Por favor, ingresa un número de RUC o Cédula', 'error');
      return;
    }
    setIsQueryingSri(true);
    try {
      const result = await consultarRucSri(formData.ruc);
      const guessCity = (address) => {
        if (!address) return '';
        const cleanAddr = address.toLowerCase();
        if (cleanAddr.includes('quito')) return 'Quito';
        if (cleanAddr.includes('guayaquil')) return 'Guayaquil';
        if (cleanAddr.includes('cuenca')) return 'Cuenca';
        if (cleanAddr.includes('ambato')) return 'Ambato';
        if (cleanAddr.includes('manta')) return 'Manta';
        if (cleanAddr.includes('loja')) return 'Loja';
        if (cleanAddr.includes('ibarra')) return 'Ibarra';
        if (cleanAddr.includes('santo domingo')) return 'Santo Domingo';
        if (cleanAddr.includes('portoviejo')) return 'Portoviejo';
        if (cleanAddr.includes('riobamba')) return 'Riobamba';
        return '';
      };
      setFormData(prev => ({
        ...prev,
        name: result.name,
        tipoIdentificacion: result.tipoIdentificacion,
        direccion: result.direccion,
        telefono: result.telefono,
        email: result.email || prev.email,
        tipoContribuyente: result.tipoContribuyente || 'general',
        ciudad: guessCity(result.direccion) || prev.ciudad || ''
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

    const trimmedRuc = String(formData.ruc || '').trim();
    const isDuplicate = thirdParties.some(tp => String(tp.ruc || '').trim() === trimmedRuc && tp.id !== formData.id);
    if (isDuplicate) {
      showToast('Ya existe un contacto con este RUC/Identificación', 'error');
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
        ciudad: formData.ciudad || '',
        isValidated: true,
        validado: true,
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
      tipoContribuyente: 'general',
      ciudad: ''
    });
  };

  const handleDelete = async (id) => {
    if (await window.confirm('¿Seguro que deseas eliminar este registro?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', id));
        showToast('Registro eliminado', 'success');
      } catch(e) {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  const inputClass = 'w-full text-xs px-3.5 py-3 rounded-card outline-none transition-all border glass-input-light';

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus size={15} /> Nuevo {forcedType === 'cliente' ? 'Cliente' : forcedType === 'proveedor' ? 'Proveedor' : 'Contacto'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-card border-none w-full sm:w-64 transition-all focus-within:ring-1 focus-within:ring-primary/25 bg-surface-bg hover:bg-surface-card focus-within:bg-surface-card">
            <Search size={14} className="text-gray-400" />
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
            className="px-3 py-1.5 rounded-card border-none text-xs font-medium outline-none transition-all cursor-pointer bg-surface-bg hover:bg-surface-card text-slate-700 focus:ring-1 focus:ring-primary/25"
          >
            <option value="all" className="text-black">Identificación: Todos</option>
            <option value="ruc" className="text-black">RUC</option>
            <option value="cedula" className="text-black">Cédula</option>
            <option value="pasaporte" className="text-black">Pasaporte</option>
          </select>
        </div>
      </div>

      <div className="rounded-card border overflow-hidden transition-all border-slate-200/80 bg-white">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="text-xs uppercase font-bold tracking-wider bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Razón Social / Nombres</th>
                <th className="px-6 py-3.5">Identificación</th>
                <th className="px-6 py-3.5 hidden sm:table-cell">Teléfono</th>
                <th className="px-6 py-3.5">Dirección Domicilio</th>
                <th className="px-6 py-3.5">Correo Notificación</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                  <tr key={tp.id} className="transition-colors hover:bg-slate-50/40">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-xs font-bold text-white`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-black">{tp.name}</p>

                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs">
                      <span className="text-xs text-gray-500 font-bold block uppercase opacity-85">{tp.tipoIdentificacion || 'ruc'}</span>
                      <span className="text-black font-semibold">{tp.ruc}</span>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-bold text-black hidden sm:table-cell">{tp.telefono || '-'}</td>
                    <td className="px-6 py-3.5 text-xs max-w-[220px] truncate text-black font-semibold" title={tp.direccion}>
                       {tp.direccion || '-'}
                       {tp.ciudad && <span className="block text-xs text-gray-500 font-bold uppercase mt-0.5">{tp.ciudad}</span>}
                     </td>
                    <td className="px-6 py-3.5 text-xs font-bold text-primary hover:underline"><a href={`mailto:${tp.email}`}>{tp.email || '-'}</a></td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => { setFormData({ id: tp.id || '', name: tp.name || '', ruc: tp.ruc || '', email: tp.email || '', type: tp.type || forcedType || 'cliente', tipoIdentificacion: tp.tipoIdentificacion || 'ruc', direccion: tp.direccion || '', telefono: tp.telefono || '', tipoContribuyente: tp.tipoContribuyente || 'general', ciudad: tp.ciudad || '' }); setIsModalOpen(true); }} 
                          className="btn-icon bg-primary text-white hover:bg-primary-hover" 
                          title="Editar"
                        >
                          <Edit2 size={13}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(tp.id)} 
                          className="btn-icon bg-red-600 text-white hover:bg-red-700" 
                          title="Eliminar"
                        >
                          <Trash2 size={13}/>
                        </button>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-card transition-all duration-300 border glass-panel-light text-gray-900">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
              <h2 className="text-base font-bold font-display uppercase tracking-wider">
                {formData.id ? 'Editar' : 'Nuevo'} {forcedType === 'cliente' ? 'Cliente' : forcedType === 'proveedor' ? 'Proveedor' : 'Contacto'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="btn-icon text-gray-450 hover:text-gray-900"
              >
                <Plus size={16} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-gray-600">Tipo Identificación</label>
                  <select value={formData.tipoIdentificacion || 'ruc'} onChange={e => setFormData({...formData, tipoIdentificacion: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="ruc" className="text-black">RUC (13 dígitos)</option>
                    <option value="cedula" className="text-black">Cédula de Identidad (10 dígitos)</option>
                    <option value="pasaporte" className="text-black">Pasaporte</option>
                    <option value="consumidor_final" className="text-black">Consumidor Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-gray-600">Identificación</label>
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
                      className="btn-icon shrink-0 bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200"
                      title="Consultar base del SRI"
                    >
                      {isQueryingSri ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-gray-600">Razón Social / Nombres Completos</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="Ej. Juan Pérez o WEBFIX S.A." />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-gray-600">Teléfono Contacto</label>
                <input type="text" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} className={inputClass} placeholder="Ej. 0998765432 o 022987654" />
              </div>

              <div className="grid grid-cols-3 gap-4 font-mono">
                 <div className="col-span-2 font-sans">
                   <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-gray-600">Dirección Matriz / Domicilio</label>
                   <input type="text" value={formData.direccion || ''} onChange={e => setFormData({...formData, direccion: e.target.value})} className={inputClass} placeholder="Av. de los Shyris y Holanda, Quito" />
                 </div>
                 <div className="font-sans">
                   <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-gray-600">Ciudad</label>
                   <input type="text" value={formData.ciudad || ''} onChange={e => setFormData({...formData, ciudad: e.target.value})} className={inputClass} placeholder="Ej. Quito" />
                 </div>
               </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-gray-600">Correo Electrónico (Notificación SRI)</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="correo@ejemplo.com" />
              </div>

              {!forcedType && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 text-gray-600">Tipo de Relación</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="cliente" className="text-black">Cliente</option>
                    <option value="proveedor" className="text-black">Proveedor</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                >
                  Guardar Persona
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
