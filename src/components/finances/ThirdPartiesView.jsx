import React, { useState } from 'react';
import { Plus, Users, Search, Trash2, Edit2 } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

export default function ThirdPartiesView({ thirdParties, isDarkMode, showToast, db, appId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', ruc: '', email: '', type: 'cliente' });

  const filtered = thirdParties.filter(tp => 
    tp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tp.ruc.includes(searchTerm)
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ruc) {
      showToast('Nombre y RUC son obligatorios', 'error');
      return;
    }

    try {
      const docId = formData.id || `tp_${new Date().getTime()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', docId), {
        name: formData.name,
        ruc: formData.ruc,
        email: formData.email,
        type: formData.type,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast('Contacto guardado exitosamente', 'success');
      setIsModalOpen(false);
      setFormData({ id: '', name: '', ruc: '', email: '', type: 'cliente' });
    } catch (err) {
      console.error(err);
      showToast('Error al guardar contacto', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este contacto?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'finances_third_parties', id));
        showToast('Contacto eliminado', 'success');
      } catch(e) {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  const inputClass = `w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border ${
    isDarkMode 
      ? 'bg-black/20 border-white/10 text-white focus:border-emerald-500/50' 
      : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500/50'
  }`;

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-96 ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
          <Search size={16} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o RUC..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
          />
        </div>
        <button 
          onClick={() => { setFormData({ id: '', name: '', ruc: '', email: '', type: 'cliente' }); setIsModalOpen(true); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-transform shadow-sm hover:-translate-y-0.5 ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          <Plus size={16} /> Nuevo Contacto
        </button>
      </div>

      <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white'}`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className={`text-xs uppercase font-semibold ${isDarkMode ? 'bg-black/40 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
              <tr>
                <th className="px-6 py-4">Nombre / Razón Social</th>
                <th className="px-6 py-4">RUC / CI</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Correo</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
              {filtered.map(tp => (
                <tr key={tp.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 font-medium">{tp.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{tp.ruc}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${tp.type === 'cliente' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                      {tp.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">{tp.email || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setFormData(tp); setIsModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-500 transition-colors"><Edit2 size={14}/></button>
                      <button onClick={() => handleDelete(tp.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic">No se encontraron contactos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#1a1a1c] border border-white/10' : 'bg-white border border-gray-200'}`}>
            <h2 className="text-xl font-bold mb-6">{formData.id ? 'Editar' : 'Nuevo'} Contacto SRI</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase text-gray-500">Razón Social / Nombres</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="Ej. Empresa S.A." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase text-gray-500">RUC / CI</label>
                  <input type="text" required value={formData.ruc} onChange={e => setFormData({...formData, ruc: e.target.value})} className={inputClass} placeholder="1700000000001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase text-gray-500">Tipo</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={inputClass}>
                    <option value="cliente" className="text-black">Cliente</option>
                    <option value="proveedor" className="text-black">Proveedor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase text-gray-500">Correo Electrónico</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="facturacion@empresa.com" />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-transform hover:-translate-y-0.5">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
