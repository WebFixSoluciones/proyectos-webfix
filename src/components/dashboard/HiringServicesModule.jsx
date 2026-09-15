import { useState } from 'react';
import { Globe, Mail, Megaphone, CheckCircle2, X, MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';

export default function HiringServicesModule({ showToast, db, appId }) {
 const [selectedService, setSelectedService] = useState(null);
 const [formData, setFormData] = useState({
 nombreContacto:'',
 telefonoContacto:'',
 emailContacto:'',
 mensaje:''
 });
 const [isSaving, setIsSaving] = useState(false);
 const [successRequest, setSuccessRequest] = useState(null);

 const services = [
 {
 id:'diseno_web',
 title:'Diseño Web Profesional',
 icon: <Globe className="text-blue-500" size={32} />,
 desc:'Páginas web a la medida y tiendas virtuales diseñadas para vender más.',
 price:'Desde $199.00',
 badge:'Más Solicitado',
 features: [
'Sitio web autoadministrable (React/WordPress)',
'Diseño responsive adaptado a móviles',
'Posicionamiento web básico (SEO)',
'Integración directa con WhatsApp y Redes Sociales',
'Hasta 5 secciones personalizadas',
'Soporte técnico por 3 meses gratis'
 ]
 },
 {
 id:'correos_corporativos',
 title:'Correos Corporativos & SMTP',
 icon: <Mail className="text-emerald-500" size={32} />,
 desc:'Consolida tu imagen profesional con correos personalizados bajo tu propio dominio.',
 price:'Desde $49.00',
 badge:'Esencial',
 features: [
'Cuentas de correo ilimitadas con tu dominio',
'Configuración SMTP segura para este ERP',
'Configuración SPF, DKIM y DMARC (Anti-Spam)',
'Asesoría en migración de cuentas',
'Compatibilidad con Outlook, Gmail y celulares',
'Servidores de alta entregabilidad'
 ]
 },
 {
 id:'marketing_digital',
 title:'Marketing Digital & Redes',
 icon: <Megaphone className="text-purple-500" size={32} />,
 desc:'Atrae prospectos calificados todos los días a través de pauta y redes sociales.',
 price:'Desde $149.00 / mes',
 badge:'Crecimiento',
 features: [
'Gestión profesional de Redes Sociales',
'Campañas pagadas en Google Ads y Meta Ads',
'Creación de contenido y diseño gráfico mensual',
'Reporte de resultados y tráfico web',
'Estrategia de marca personalizada',
'Segmentación de clientes locales'
 ]
 }
 ];

 const handleOpenModal = (service) => {
 setSelectedService(service);
 setSuccessRequest(null);
 setFormData({
 nombreContacto:'',
 telefonoContacto:'',
 emailContacto:'',
 mensaje:''
 });
 };

 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!formData.nombreContacto || !formData.telefonoContacto || !formData.emailContacto) {
 showToast('Por favor completa todos los campos requeridos.','warning');
 return;
 }

 setIsSaving(true);
 try {
 const requestId =`req_${new Date().getTime()}`;
 const requestRef = doc(db,'artifacts', appId,'public','data','service_requests', requestId);
 
 const payload = {
 id: requestId,
 clientName: formData.nombreContacto,
 clientPhone: formData.telefonoContacto,
 clientEmail: formData.emailContacto,
 serviceId: selectedService.id,
 serviceTitle: selectedService.title,
 message: formData.mensaje,
 status:'pendiente',
 createdAt: new Date().toISOString()
 };

 await setDoc(requestRef, payload);
 
 showToast('Solicitud enviada con éxito.','success');
 setSuccessRequest(payload);
 } catch (err) {
 console.error(err);
 showToast('Error al enviar la solicitud en la base de datos.','error');
 } finally {
 setIsSaving(false);
 }
 };

 const handleSendWhatsApp = () => {
 if (!successRequest) return;
 const phone ='593984920626'; // Web Fix WhatsApp oficial
 const text =`Hola Web Fix! He enviado una solicitud desde el ERP para el servicio de *${successRequest.serviceTitle}*.\n\n*Datos de Contacto:*\n- *Nombre:* ${successRequest.clientName}\n- *Teléfono:* ${successRequest.clientPhone}\n- *Correo:* ${successRequest.clientEmail}\n- *Comentarios:* ${successRequest.message ||'Sin comentarios adicionales.'}`;
 window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank');
 };

 const inputClass =`w-full px-3.5 py-2 text-xs rounded-btn border outline-none transition-all focus:ring-1 focus:ring-primary/25 bg-white border-border-default text-black focus:border-primary`;

 return (
 <div className="space-y-6">
 {/* Banner de Presentación */}
 <div className={`p-6 rounded-btn border relative overflow-hidden bg-gradient-to-r from-primary-light via-white to-white border-border-default`}>
 <div className="max-w-2xl space-y-2 relative z-10">
 <span className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
 Servicios Web Fix
 </span>
 <h2 className={`text-xl font-semibold tracking-tight text-text-heading`}>
 Lleva tu negocio al siguiente nivel digital
 </h2>
 <p className="text-xs text-text-secondary leading-relaxed">
 Te ayudamos a digitalizar tu marca. Contrata nuestros servicios profesionales directamente desde tu panel de control y agiliza tu visibilidad, correos corporativos y campañas publicitarias.
 </p>
 </div>
 <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 via-transparent to-transparent hidden md:block"></div>
 </div>

 {/* Grid de Servicios */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {services.map(service => (
 <div key={service.id} className={`rounded-btn border flex flex-col justify-between overflow-hidden transition-all duration-300 bg-white border-border-default hover:border-primary/30`}>
 <div className="p-6 space-y-4">
 {/* Header de Tarjeta */}
 <div className="flex items-center justify-between">
 <div className={`p-2.5 rounded-btn bg-surface-bg`}>
 {service.icon}
 </div>
 <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-card ${
 service.id ==='diseno_web' 
 ?'bg-blue-500/10 text-blue-500' 
 : service.id ==='correos_corporativos' 
 ?'bg-emerald-500/10 text-emerald-500' 
 :'bg-purple-500/10 text-purple-500'
 }`}>
 {service.badge}
 </span>
 </div>

 <div className="space-y-1.5">
 <h3 className={`text-sm font-semibold uppercase tracking-wide text-text-heading`}>
 {service.title}
 </h3>
 <p className="text-xs text-text-secondary leading-normal min-h-[48px]">
 {service.desc}
 </p>
 </div>

 {/* Precio */}
 <div className="pt-2">
 <span className="text-xs text-text-secondary font-bold uppercase block tracking-wider">Inversión</span>
 <span className="text-base font-semibold text-primary">{service.price}</span>
 </div>

 {/* Características */}
 <div className="space-y-2 pt-2 border-t border-border-strong/5">
 <span className="text-xs text-text-secondary font-bold uppercase block tracking-wider">¿Qué incluye?</span>
 <ul className="space-y-2">
 {service.features.map((feat, idx) => (
 <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
 <CheckCircle2 size={12} className="text-primary mt-0.5 shrink-0" />
 <span>{feat}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>

 {/* Acción */}
 <div className={`p-4 border-t bg-surface-bg/50 border-border-default`}>
 <button 
 onClick={() => handleOpenModal(service)}
 className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider rounded-btn bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-1.5 transition-all"
 >
 Solicitar Cotización <ArrowRight size={13} />
 </button>
 </div>
 </div>
 ))}
 </div>

 {/* Modal de Solicitud */}
 {selectedService && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
 <div className={`w-full max-w-md rounded-card border p-6 space-y-4 transition-all scale-100 bg-white border-border-default text-text-heading`}>
 {/* Modal Header */}
 <div className="flex items-center justify-between pb-2 border-b border-border-strong/10">
 <div className="flex items-center gap-3">
 <div className={`p-2 rounded-btn bg-surface-bg`}>
 {selectedService.icon}
 </div>
 <div>
 <h3 className="text-sm font-semibold uppercase tracking-wider">Cotizar Servicio</h3>
 <p className="text-xs text-text-secondary font-medium leading-none mt-1">
 {selectedService.title}
 </p>
 </div>
 </div>
 <button 
 onClick={() => setSelectedService(null)}
 className={`p-1.5 rounded-full hover:bg-surface-sidebar/10 text-text-secondary transition-colors`}
 >
 <X size={16} />
 </button>
 </div>

 {/* Modal Body */}
 {!successRequest ? (
 <form onSubmit={handleSubmit} className="space-y-4">
 <p className="text-xs leading-relaxed text-text-secondary">
 Ingresa tus datos de contacto. Uno de nuestros asesores de **Web Fix** se comunicará contigo en menos de 24 horas para enviarte una propuesta detallada.
 </p>

 <div className="space-y-3">
 <div>
 <label className="block text-xs font-bold uppercase mb-1.5 text-text-secondary">
 Nombre de Contacto *
 </label>
 <input 
 type="text" 
 name="nombreContacto"
 required
 value={formData.nombreContacto} 
 onChange={handleInputChange} 
 placeholder="Tu nombre completo"
 className={inputClass}
 disabled={isSaving}
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-bold uppercase mb-1.5 text-text-secondary">
 Teléfono / Celular *
 </label>
 <input 
 type="tel" 
 name="telefonoContacto"
 required
 value={formData.telefonoContacto} 
 onChange={handleInputChange} 
 placeholder="Ej: 0984920626"
 className={inputClass}
 disabled={isSaving}
 />
 </div>
 <div>
 <label className="block text-xs font-bold uppercase mb-1.5 text-text-secondary">
 Correo de Contacto *
 </label>
 <input 
 type="email" 
 name="emailContacto"
 required
 value={formData.emailContacto} 
 onChange={handleInputChange} 
 placeholder="Ej: nombre@empresa.com"
 className={inputClass}
 disabled={isSaving}
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-bold uppercase mb-1.5 text-text-secondary">
 Mensaje o Requerimientos Adicionales
 </label>
 <textarea 
 name="mensaje"
 rows={3}
 value={formData.mensaje} 
 onChange={handleInputChange} 
 placeholder="Cuéntanos un poco sobre lo que necesitas..."
 className={`${inputClass} resize-none`}
 disabled={isSaving}
 />
 </div>
 </div>

 {/* Modal Footer Actions */}
 <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-strong/5">
 <button 
 type="button" 
 onClick={() => setSelectedService(null)}
 disabled={isSaving}
 className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-btn border transition-colors border-border-default hover:bg-surface-bg text-text-primary`}
 >
 Cancelar
 </button>
 <button 
 type="submit" 
 disabled={isSaving}
 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-btn bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 transition-colors disabled:opacity-60"
 >
 {isSaving ? (
 <>
 <Loader2 size={12} className="animate-spin" />
 Guardando...
 </>
 ) : (
 <>
 Enviar Solicitud
 </>
 )}
 </button>
 </div>
 </form>
 ) : (
 // Success State
 <div className="space-y-4 py-2 text-center">
 <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
 <CheckCircle2 size={24} />
 </div>
 <div className="space-y-1">
 <h4 className="text-xs font-semibold uppercase tracking-wider">¡Solicitud Registrada!</h4>
 <p className="text-xs text-text-secondary leading-normal px-2">
 Hemos guardado tus requerimientos en el sistema de manera segura. Para agilizar y chatear directamente con nosotros, presiona el botón de abajo.
 </p>
 </div>

 <div className="flex flex-col gap-2 pt-4 border-t border-border-strong/5">
 <button 
 type="button" 
 onClick={handleSendWhatsApp}
 className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider rounded-btn bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-1.5 transition-colors"
 >
 <MessageSquare size={13} />
 Chatear por WhatsApp
 </button>
 <button 
 type="button" 
 onClick={() => setSelectedService(null)}
 className={`w-full py-2.5 text-xs font-semibold uppercase tracking-wider rounded-btn border transition-colors border-border-default hover:bg-surface-bg text-text-primary`}
 >
 Cerrar Ventana
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
