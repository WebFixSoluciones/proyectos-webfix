import React, { useState } from'react';
import { LifeBuoy, CheckCircle2, MessageSquare, Loader2, ArrowRight } from'lucide-react';
import { doc, setDoc } from'firebase/firestore';

export default function SupportModule({ showToast, db, appId }) {
 const [formData, setFormData] = useState({
 nombreContacto:'',
 telefonoContacto:'',
 emailContacto:'',
 modulo:'Facturación Electrónica',
 prioridad:'Media',
 descripcion:''
 });
 const [isSaving, setIsSaving] = useState(false);
 const [successTicket, setSuccessTicket] = useState(null);

 const modulosERP = [
'Facturación Electrónica',
'Inventario y Stock',
'Ventas y Facturas',
'Compras y Proveedores',
'Finanzas y Cuentas',
'Gestión de Proyectos',
'Ajustes del Sistema',
'Otro Asunto'
 ];

 const prioridades = ['Baja','Media','Alta'];

 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!formData.nombreContacto || !formData.telefonoContacto || !formData.emailContacto || !formData.descripcion) {
 showToast('Por favor completa todos los campos requeridos.','warning');
 return;
 }

 setIsSaving(true);
 try {
 const ticketId =`tk_${new Date().getTime()}`;
 const ticketRef = doc(db,'artifacts', appId,'public','data','support_tickets', ticketId);

 const payload = {
 id: ticketId,
 clientName: formData.nombreContacto,
 clientPhone: formData.telefonoContacto,
 clientEmail: formData.emailContacto,
 module: formData.modulo,
 priority: formData.prioridad,
 description: formData.descripcion,
 status:'pendiente',
 createdAt: new Date().toISOString()
 };

 await setDoc(ticketRef, payload);

 showToast('Ticket de soporte registrado con éxito.','success');
 setSuccessTicket(payload);
 } catch (err) {
 console.error('Error al registrar ticket:', err);
 showToast('Error al registrar la solicitud en la base de datos.','error');
 } finally {
 setIsSaving(false);
 }
 };

 const handleSendWhatsApp = () => {
 if (!successTicket) return;
 const phone ='593984920626'; // Número oficial de Soporte Web Fix
 const text =`Hola Web Fix! Solicito *Soporte Técnico* para el ERP.\n\n*Detalles del Ticket:*\n- *Ticket ID:* ${successTicket.id}\n- *Nombre:* ${successTicket.clientName}\n- *Teléfono:* ${successTicket.clientPhone}\n- *Correo:* ${successTicket.clientEmail}\n- *Módulo:* ${successTicket.module}\n- *Prioridad:* ${successTicket.priority}\n- *Descripción:* ${successTicket.description}`;
 window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank');
 };

 const handleResetForm = () => {
 setSuccessTicket(null);
 setFormData({
 nombreContacto:'',
 telefonoContacto:'',
 emailContacto:'',
 modulo:'Facturación Electrónica',
 prioridad:'Media',
 descripcion:''
 });
 };

 const inputClass ="w-full px-3.5 py-2 text-xs rounded-btn border outline-none transition-all focus:ring-1 focus:ring-primary/25 bg-white border-slate-200 text-black focus:border-primary";

 return (
 <div className="space-y-6">
 {/* Banner de Soporte */}
 <div className="p-6 rounded-btn border relative overflow-hidden bg-gradient-to-r from-primary-light via-white to-white border-slate-200">
 <div className="max-w-2xl space-y-2 relative z-10">
 <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
 Soporte Técnico
 </span>
 <h2 className="text-xl font-black tracking-tight text-slate-900">
 ¿Cómo podemos ayudarte hoy?
 </h2>
 <p className="text-xs text-gray-500 leading-relaxed">
 Reporta incidentes, solicita asistencia técnica o haz consultas sobre el funcionamiento del ERP. Las solicitudes se registran en nuestra cola de soporte para darles seguimiento inmediato.
 </p>
 </div>
 <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent hidden md:block"></div>
 </div>

 {/* Flujo de ticket exitoso */}
 {successTicket ? (
 <div className="p-8 rounded-btn border text-center max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 bg-white border-slate-200">
 <div className="flex justify-center">
 <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
 <CheckCircle2 size={48} />
 </div>
 </div>
 <div className="space-y-2">
 <h3 className="text-base font-extrabold uppercase tracking-wider text-slate-900">
 ¡Ticket Registrado con Éxito!
 </h3>
 <p className="text-xs text-gray-500">
 Se ha creado el ticket <span className="font-bold text-primary">{successTicket.id}</span> en nuestra base de datos.
 </p>
 </div>
 
 <div className="p-4 rounded-btn text-left text-xs space-y-1.5 bg-slate-50 border border-slate-100 text-slate-600">
 <p><span className="font-bold">Módulo afectado:</span> {successTicket.module}</p>
 <p><span className="font-bold">Prioridad:</span> {successTicket.priority}</p>
 <p><span className="font-bold">Contacto:</span> {successTicket.clientName} ({successTicket.clientPhone})</p>
 <p className="border-t border-gray-500/10 pt-1.5 mt-1.5"><span className="font-bold">Detalle:</span> {successTicket.description}</p>
 </div>

 <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
 <button 
 onClick={handleSendWhatsApp} 
 className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-btn text-xs font-bold transition-all"
 >
 <MessageSquare size={16} />
 Enviar a WhatsApp
 </button>
 <button 
 onClick={handleResetForm} 
 className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-btn text-xs font-bold transition-all border bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
 >
 Nuevo Reporte
 </button>
 </div>
 </div>
 ) : (
 /* Formulario */
 <div className="p-6 rounded-btn border max-w-2xl mx-auto bg-white border-slate-200">
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Nombre de contacto */}
 <div className="space-y-1.5">
 <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">
 Nombre de Contacto *
 </label>
 <input 
 type="text" 
 name="nombreContacto" 
 value={formData.nombreContacto} 
 onChange={handleInputChange} 
 required
 placeholder="Ej. Juan Pérez" 
 className={inputClass}
 />
 </div>

 {/* Teléfono de contacto */}
 <div className="space-y-1.5">
 <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">
 Teléfono de Contacto *
 </label>
 <input 
 type="text" 
 name="telefonoContacto" 
 value={formData.telefonoContacto} 
 onChange={handleInputChange} 
 required
 placeholder="Ej. 0987654321" 
 className={inputClass}
 />
 </div>
 </div>

 {/* Correo electrónico */}
 <div className="space-y-1.5">
 <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">
 Correo Electrónico *
 </label>
 <input 
 type="email" 
 name="emailContacto" 
 value={formData.emailContacto} 
 onChange={handleInputChange} 
 required
 placeholder="Ej. correo@empresa.com" 
 className={inputClass}
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Módulo afectado */}
 <div className="space-y-1.5">
 <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">
 Módulo / Área Afectada *
 </label>
 <select 
 name="modulo" 
 value={formData.modulo} 
 onChange={handleInputChange} 
 className={inputClass}
 >
 {modulosERP.map((mod, idx) => (
 <option key={idx} value={mod} className="bg-white text-black">
 {mod}
 </option>
 ))}
 </select>
 </div>

 {/* Prioridad */}
 <div className="space-y-1.5">
 <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">
 Prioridad *
 </label>
 <select 
 name="prioridad" 
 value={formData.prioridad} 
 onChange={handleInputChange} 
 className={inputClass}
 >
 {prioridades.map((pri, idx) => (
 <option key={idx} value={pri} className="bg-white text-black">
 {pri}
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Descripción */}
 <div className="space-y-1.5">
 <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">
 Descripción detallada de la incidencia / solicitud *
 </label>
 <textarea 
 name="descripcion" 
 value={formData.descripcion} 
 onChange={handleInputChange} 
 required
 rows={5}
 placeholder="Describe el problema, mensaje de error o ayuda técnica que necesitas con la mayor cantidad de detalles posible..." 
 className={`${inputClass} resize-none min-h-[100px] py-2.5`}
 />
 </div>

 {/* Botón de envío */}
 <div className="pt-2">
 <button 
 type="submit" 
 disabled={isSaving}
 className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-btn text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSaving ? (
 <>
 <Loader2 size={16} className="animate-spin" />
 Registrando Ticket...
 </>
 ) : (
 <>
 <LifeBuoy size={16} />
 Crear Ticket de Soporte
 <ArrowRight size={14} className="ml-1" />
 </>
 )}
 </button>
 </div>
 </form>
 </div>
 )}
 </div>
 );
}
