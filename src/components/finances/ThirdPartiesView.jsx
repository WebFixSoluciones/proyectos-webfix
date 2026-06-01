import React, { useState } from 'react';
import { Plus, Users, Search, Trash2, Edit2, Sparkles, RefreshCw, MapPin, Phone } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { consultarRucSri } from '../../services/sriService';

export default function ThirdPartiesView({ thirdParties, isDarkMode, showToast, db, appId, forcedType }) {
  const [searchTerm, setSearchTerm] = useState('');
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
    return matchesSearch && matchesType;
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
      console.error(e);
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

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/25 border-white/10 text-white focus:border-emerald-500/50' 
      : 'bg-white border-gray-250 text-gray-900 focus:border-emerald-500/50'
  }`;

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-96 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
          <Search size={16} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
          <input 
            type="text" 
            placeholder={`Buscar por nombre, RUC o dirección...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
          />
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          <Plus size={15} /> Nuevo {forcedType === 'cliente' ? 'Cliente' : forcedType === 'proveedor' ? 'Proveedor' : 'Contacto'}
        </button>
      </div>

      <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white'}`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? 'bg-black/40 text-gray-400 border-b border-white/5' : 'bg-gray-100 text-gray-800 border-b border-gray-300'}`}>
              <tr>
                <th className="px-6 py-4">Razón Social / Nombres</th>
                <th className="px-6 py-4">Identificación</th>
                <th className="px-6 py-4">Teléfono</th>
                <th className="px-6 py-4">Dirección Domicilio</th>
                <th className="px-6 py-4">Correo Notificación</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-150'}`}>
              {filtered.map(tp => (
                <tr key={tp.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 font-semibold">
                    <div>
                      <p className="font-bold text-xs">{tp.name}</p>
                      {tp.tipoContribuyente && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase inline-block mt-1 ${
                          tp.tipoContribuyente === 'general' ? (isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-200') :
                          tp.tipoContribuyente === 'rimpe_emprendedor' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200') :
                          (isDarkMode ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-yellow-50 text-yellow-700 border border-yellow-250')
                        }`}>
                          Régimen: {tp.tipoContribuyente.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    <span className="text-[9px] text-gray-500 font-bold block uppercase opacity-80">{tp.tipoIdentificacion || 'ruc'}</span>
                    {tp.ruc}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold">{tp.telefono || '-'}</td>
                  <td className="px-6 py-4 text-xs max-w-[220px] truncate" title={tp.direccion}>{tp.direccion || '-'}</td>
                  <td className="px-6 py-4 text-xs font-medium text-blue-500 hover:underline"><a href={`mailto:${tp.email}`}>{tp.email || '-'}</a></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setFormData(tp); setIsModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-500 transition-colors"><Edit2 size={13}/></button>
                      <button onClick={() => handleDelete(tp.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 italic">No se encontraron registros de personas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg p-6 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-[#151517] border border-white/10' : 'bg-white border border-gray-200'}`}>
            <h2 className="text-lg font-black mb-5">
              {formData.id ? 'Editar' : 'Nuevo'} {forcedType === 'cliente' ? 'Cliente' : forcedType === 'proveedor' ? 'Proveedor' : 'Contacto'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Tipo Identificación</label>
                  <select value={formData.tipoIdentificacion || 'ruc'} onChange={e => setFormData({...formData, tipoIdentificacion: e.target.value})} className={inputClass}>
                    <option value="ruc" className="text-black">RUC (13 dígitos)</option>
                    <option value="cedula" className="text-black">Cédula de Identidad (10 dígitos)</option>
                    <option value="pasaporte" className="text-black">Pasaporte</option>
                    <option value="consumidor_final" className="text-black">Consumidor Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">RUC / Cédula / Identificación</label>
                  <div className="flex gap-1.5">
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
                      className={`px-3.5 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                        isDarkMode 
                          ? 'bg-purple-600/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30' 
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
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Razón Social / Nombres Completos</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="Ej. Juan Pérez o WEBFIX S.A." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Teléfono Contacto</label>
                  <input type="text" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} className={inputClass} placeholder="Ej. 0998765432 o 022987654" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Régimen Contribuyente</label>
                  <select value={formData.tipoContribuyente || 'general'} onChange={e => setFormData({...formData, tipoContribuyente: e.target.value})} className={inputClass}>
                    <option value="general" className="text-black">Régimen General</option>
                    <option value="rimpe_popular" className="text-black">RIMPE Popular</option>
                    <option value="rimpe_emprendedor" className="text-black">RIMPE Emprendedor</option>
                    <option value="microempresas" className="text-black">Microempresas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Dirección Matriz / Domicilio</label>
                <input type="text" value={formData.direccion || ''} onChange={e => setFormData({...formData, direccion: e.target.value})} className={inputClass} placeholder="Av. de los Shyris y Holanda, Quito" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Correo Electrónico (Notificación SRI)</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="correo@ejemplo.com" />
              </div>

              {!forcedType && (
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1.5 text-gray-500">Tipo de Relación</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={inputClass}>
                    <option value="cliente" className="text-black">Cliente</option>
                    <option value="proveedor" className="text-black">Proveedor</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 rounded-xl text-xs font-semibold ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-transform hover:-translate-y-0.5">Guardar Persona</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
