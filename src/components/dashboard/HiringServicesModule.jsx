import { mergeThemeProps } from '../ui/themeProps';
import { UiBox, UiText, UiHeading, UiCard, UiLabel } from '../ui/layout';
import { UiButton, UiInput, UiTextarea } from '../ui/controls';
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
 icon: <Globe {...{"style":{"color":"var(--blue-11)"}}} size={32} />,
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
 icon: <Mail {...{"style":{"color":"var(--green-11)"}}} size={32} />,
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
 icon: <Megaphone {...{"style":{"color":"var(--purple-11)"}}} size={32} />,
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

 

 return (
 <UiBox {...{"className":"space-y-6"}}>
 {/* Banner de Presentación */}
 <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-6 relative overflow-hidden"})}>
 <UiBox {...{"className":"max-w-2xl space-y-2 relative z-10"}}>
 <UiText {...{"size":"1","weight":"bold","color":"blue","className":"px-2 py-0.5"}}>
 Servicios Web Fix
 </UiText>
 <UiHeading as="h2" {...mergeThemeProps({"size":"5","weight":"bold","color":"gray","highContrast":true})}>
 Lleva tu negocio al siguiente nivel digital
 </UiHeading>
 <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
 Te ayudamos a digitalizar tu marca. Contrata nuestros servicios profesionales directamente desde tu panel de control y agiliza tu visibilidad, correos corporativos y campañas publicitarias.
 </UiText>
 </UiBox>
 <UiBox {...{"style":{"backgroundColor":"var(--gray-2)"},"className":"absolute right-0 top-0 bottom-0 w-1/3 hidden md:block"}}></UiBox>
 </UiBox>

 {/* Grid de Servicios */}
 <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-6"}}>
 {services.map(service => (
 <UiBox key={service.id} {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"flex flex-col justify-between overflow-hidden duration-300"})}>
 <UiBox {...{"className":"p-6 space-y-4"}}>
 {/* Header de Tarjeta */}
 <UiBox {...{"className":"flex items-center justify-between"}}>
 <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"p-2.5"})}>
 {service.icon}
 </UiBox>
 <UiText {...mergeThemeProps({"size":"1","weight":"bold","className":"px-2 py-0.5"}, {}, (service.id ==='diseno_web' ? {"color":"blue"} : (service.id ==='correos_corporativos' ? {"color":"green"} : {"color":"purple"})))}>
 {service.badge}
 </UiText>
 </UiBox>

 <UiBox {...{"className":"space-y-1.5"}}>
 <UiHeading as="h3" {...mergeThemeProps({"size":"2","weight":"bold","color":"gray","highContrast":true})}>
 {service.title}
 </UiHeading>
 <UiText as="p" {...{"size":"1","color":"gray","className":"leading-normal min-h-[48px]"}}>
 {service.desc}
 </UiText>
 </UiBox>

 {/* Precio */}
 <UiBox {...{"className":"pt-2"}}>
 <UiText {...{"size":"1","color":"gray","weight":"bold","className":"block"}}>Inversión</UiText>
 <UiText {...{"size":"3","weight":"bold","color":"blue"}}>{service.price}</UiText>
 </UiBox>

 {/* Características */}
 <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"space-y-2 pt-2"}}>
 <UiText {...{"size":"1","color":"gray","weight":"bold","className":"block"}}>¿Qué incluye?</UiText>
 <ul {...{"className":"space-y-2"}}>
 {service.features.map((feat, idx) => (
 <li key={idx} {...{"style":{"color":"var(--gray-11)"},"className":"flex items-start gap-2"}}>
 <CheckCircle2 size={12} {...{"style":{"color":"var(--blue-12)"},"className":"mt-0.5 shrink-0"}} />
 <UiText>{feat}</UiText>
 </li>
 ))}
 </ul>
 </UiBox>
 </UiBox>

 {/* Acción */}
 <UiBox {...mergeThemeProps({"style":{"borderTop":"1px solid var(--gray-a6)","backgroundColor":"var(--gray-2)"},"className":"p-4"})}>
 <UiButton
 onClick={() => handleOpenModal(service)}
 {...{"size":"2","variant":"solid","color":"blue","className":"w-full flex items-center justify-center gap-1.5"}}
 >
 Solicitar Cotización <ArrowRight size={13} />
 </UiButton>
 </UiBox>
 </UiBox>
 ))}
 </UiBox>

 {/* Modal de Solicitud */}
 {selectedService && (
 <UiBox {...{"style":{"backgroundColor":"var(--black-a7)"},"className":"fixed inset-0 z-50 flex items-center justify-center p-4"}}>
 <UiCard {...mergeThemeProps({"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full max-w-md p-6 space-y-4 scale-100"})}>
 {/* Modal Header */}
 <UiBox {...{"style":{"borderBottom":"1px solid var(--gray-a6)"},"className":"flex items-center justify-between pb-2"}}>
 <UiBox {...{"className":"flex items-center gap-3"}}>
 <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--gray-2)"},"className":"p-2"})}>
 {selectedService.icon}
 </UiBox>
 <UiBox>
 <UiHeading as="h3" {...{"size":"2","weight":"bold"}}>Cotizar Servicio</UiHeading>
 <UiText as="p" {...{"size":"1","color":"gray","weight":"medium","className":"leading-none mt-1"}}>
 {selectedService.title}
 </UiText>
 </UiBox>
 </UiBox>
 <UiButton iconOnly
 onClick={() => setSelectedService(null)}
 {...mergeThemeProps({"color":"gray"})}
 >
 <X size={16} />
 </UiButton>
 </UiBox>

 {/* Modal Body */}
 {!successRequest ? (
 <form onSubmit={handleSubmit} {...{"className":"space-y-4"}}>
 <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
 Ingresa tus datos de contacto. Uno de nuestros asesores de **Web Fix** se comunicará contigo en menos de 24 horas para enviarte una propuesta detallada.
 </UiText>

 <UiBox {...{"className":"space-y-3"}}>
 <UiBox>
 <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>
 Nombre de Contacto *
 </UiLabel>
 <UiInput
 type="text" 
 name="nombreContacto"
 required
 value={formData.nombreContacto} 
 onChange={handleInputChange} 
 placeholder="Tu nombre completo"
 {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
 disabled={isSaving}
 />
 </UiBox>

 <UiBox {...{"className":"grid grid-cols-2 gap-3"}}>
 <UiBox>
 <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>
 Teléfono / Celular *
 </UiLabel>
 <UiInput
 type="tel" 
 name="telefonoContacto"
 required
 value={formData.telefonoContacto} 
 onChange={handleInputChange} 
 placeholder="Ej: 0984920626"
 {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
 disabled={isSaving}
 />
 </UiBox>
 <UiBox>
 <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>
 Correo de Contacto *
 </UiLabel>
 <UiInput
 type="email" 
 name="emailContacto"
 required
 value={formData.emailContacto} 
 onChange={handleInputChange} 
 placeholder="Ej: nombre@empresa.com"
 {...mergeThemeProps({"size":"2","color":"gray","className":"w-full"})}
 disabled={isSaving}
 />
 </UiBox>
 </UiBox>

 <UiBox>
 <UiLabel {...{"size":"1","weight":"bold","color":"gray","className":"block mb-1.5"}}>
 Mensaje o Requerimientos Adicionales
 </UiLabel>
 <UiTextarea
 name="mensaje"
 rows={3}
 value={formData.mensaje} 
 onChange={handleInputChange} 
 placeholder="Cuéntanos un poco sobre lo que necesitas..."
 {...mergeThemeProps({}, {"className":"resize-none"}, mergeThemeProps({"size":"2","color":"gray","className":"w-full"}))}
 disabled={isSaving}
 />
 </UiBox>
 </UiBox>

 {/* Modal Footer Actions */}
 <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex items-center justify-end gap-2 pt-2"}}>
 <UiButton
 type="button" 
 onClick={() => setSelectedService(null)}
 disabled={isSaving}
 {...mergeThemeProps({"size":"2","variant":"outline","color":"gray"})}
 >
 Cancelar
 </UiButton>
 <UiButton
 type="submit" 
 disabled={isSaving}
 {...{"size":"2","variant":"solid","color":"blue","className":"flex items-center gap-1.5 disabled:opacity-60"}}
 >
 {isSaving ? (
 <>
 <Loader2 size={12} {...{"className":"animate-spin"}} />
 Guardando...
 </>
 ) : (
 <>
 Enviar Solicitud
 </>
 )}
 </UiButton>
 </UiBox>
 </form>
 ) : (
 // Success State
 <UiBox {...{"className":"space-y-4 py-2 text-center"}}>
 <UiBox {...{"style":{"backgroundColor":"var(--green-3)","color":"var(--green-11)","borderRadius":"var(--radius-3)"},"className":"w-12 h-12 flex items-center justify-center mx-auto"}}>
 <CheckCircle2 size={24} />
 </UiBox>
 <UiBox {...{"className":"space-y-1"}}>
 <UiHeading as="h4" {...{"size":"1","weight":"bold"}}>¡Solicitud Registrada!</UiHeading>
 <UiText as="p" {...{"size":"1","color":"gray","className":"leading-normal px-2"}}>
 Hemos guardado tus requerimientos en el sistema de manera segura. Para agilizar y chatear directamente con nosotros, presiona el botón de abajo.
 </UiText>
 </UiBox>

 <UiBox {...{"style":{"borderTop":"1px solid var(--gray-a6)"},"className":"flex flex-col gap-2 pt-4"}}>
 <UiButton
 type="button" 
 onClick={handleSendWhatsApp}
 {...{"size":"2","variant":"solid","color":"green","className":"w-full flex items-center justify-center gap-1.5"}}
 >
 <MessageSquare size={13} />
 Chatear por WhatsApp
 </UiButton>
 <UiButton
 type="button" 
 onClick={() => setSelectedService(null)}
 {...mergeThemeProps({"size":"2","variant":"outline","color":"gray","className":"w-full"})}
 >
 Cerrar Ventana
 </UiButton>
 </UiBox>
 </UiBox>
 )}
 </UiCard>
 </UiBox>
 )}
 </UiBox>
 );
}
