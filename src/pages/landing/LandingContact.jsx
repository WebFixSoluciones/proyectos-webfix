import { UiBox, UiHeading, UiText, UiCard, UiLabel } from '../../components/ui/layout';
import { UiTextarea } from '../../components/ui/controls';
import { useState } from 'react';
import { Mail, Phone, MapPin, CheckCircle2, Send, MessageSquare } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function LandingContact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const WHATSAPP_NUMBER = '593984920626';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg('Por favor complete los campos obligatorios (*).');
      return;
    }
    setLoading(true);
    try {
      if (db) {
        await addDoc(collection(db, 'landing_leads'), {
          nombre: form.name.trim(),
          email: form.email.trim(),
          telefono: form.phone.trim(),
          empresa: form.company.trim(),
          mensaje: form.message.trim(),
          fecha: serverTimestamp(),
          estado: 'nuevo'
        });
      }
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', company: '', message: '' });
    } catch (err) {
      console.error('Error guardando lead:', err);
      // Even if Firestore write fails, allow contact via WhatsApp
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UiBox {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"w-full"}}>
      
      {/* Header */}
      <section {...{"style":{"borderBottom":"1px solid var(--gray-a6)","backgroundColor":"var(--color-panel-solid)"},"className":"pt-16 pb-12 text-center"}}>
        <UiBox {...{"className":"max-w-4xl mx-auto px-4 sm:px-6 space-y-3"}}>
          <Badge variant="outline" {...{"className":"py-0.5 px-2.5"}}>
            Contacto & Soporte
          </Badge>
          <UiHeading as="h1" {...{"size":"7","weight":"bold","color":"gray","highContrast":true}}>
            Estamos listos para ayudarte.
          </UiHeading>
          <UiText as="p" {...{"size":"1","color":"gray","className":"max-w-xl mx-auto leading-relaxed"}}>
            ¿Tienes preguntas sobre los planes, configuración de firma .p12 o migración de datos? Escríbenos y un asesor te responderá de inmediato.
          </UiText>
        </UiBox>
      </section>

      {/* Main Content */}
      <section {...{"className":"py-16 w-[80%] max-w-5xl mx-auto px-4 sm:px-6"}}>
        <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-left"}}>
          
          {/* Contact Details */}
          <UiBox {...{"className":"md:col-span-5 space-y-6"}}>
            <UiBox>
              <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"gray","highContrast":true,"className":"mb-2"}}>Canales de Atención</UiHeading>
              <UiText as="p" {...{"size":"1","color":"gray","className":"leading-relaxed"}}>
                Nuestro equipo de soporte técnico y comercial está disponible de Lunes a Viernes de 8:30 AM a 6:00 PM (Hora Ecuador).
              </UiText>
            </UiBox>

            <UiBox {...{"className":"space-y-3"}}>
              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"flex items-center gap-3 p-3"}}>
                <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-2"}}>
                  <Mail size={15} />
                </UiCard>
                <UiBox>
                  <UiText {...{"size":"1","color":"gray","weight":"bold","className":"block"}}>Correo Electrónico</UiText>
                  <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>soporte@webfixsoluciones.net</UiText>
                </UiBox>
              </UiBox>

              <a 
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola WebFix, deseo información sobre el ERP y facturación electrónica.')}`}
                target="_blank" 
                rel="noreferrer"
                {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"flex items-center gap-3 p-3 cursor-pointer group"}}
              >
                <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-2"}}>
                  <Phone size={15} />
                </UiCard>
                <UiBox>
                  <UiText {...{"size":"1","color":"gray","weight":"bold","className":"block"}}>WhatsApp Directo</UiText>
                  <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>+593 98 492 0626</UiText>
                </UiBox>
              </a>

              <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--color-panel-solid)","border":"1px solid var(--gray-a6)"},"className":"flex items-center gap-3 p-3"}}>
                <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)","color":"var(--gray-12)"},"className":"p-2"}}>
                  <MapPin size={15} />
                </UiCard>
                <UiBox>
                  <UiText {...{"size":"1","color":"gray","weight":"bold","className":"block"}}>Ubicación</UiText>
                  <UiText {...{"weight":"bold","color":"gray","highContrast":true}}>Quito / Guayaquil, Ecuador</UiText>
                </UiBox>
              </UiBox>
            </UiBox>
          </UiBox>

          {/* Contact Form */}
          <UiBox {...{"className":"md:col-span-7"}}>
            <Card {...{"className":"p-6"}}>
              {submitted ? (
                <UiBox {...{"className":"text-center py-10 space-y-3"}}>
                  <CheckCircle2 size={36} {...{"style":{"color":"var(--green-12)"},"className":"mx-auto"}} />
                  <UiHeading as="h3" {...{"size":"3","weight":"bold","color":"gray","highContrast":true}}>¡Mensaje Enviado con Éxito!</UiHeading>
                  <UiText as="p" {...{"size":"1","color":"gray","className":"max-w-sm mx-auto"}}>
                    Hemos registrado tu consulta. Uno de nuestros asesores técnicos se comunicará contigo en breve o puedes escribirnos directamente por WhatsApp.
                  </UiText>
                  <UiBox {...{"className":"pt-2 flex flex-col sm:flex-row items-center justify-center gap-2"}}>
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola WebFix, acabo de enviar una consulta desde la web y deseo asesoría rápida.')}`}
                      target="_blank"
                      rel="noreferrer"
                      {...{"variant":"solid","color":"blue","className":"h-9 px-4 inline-flex items-center gap-1.5"}}
                    >
                      <MessageSquare size={13} />
                      <UiText>Chatear por WhatsApp</UiText>
                    </a>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSubmitted(false)}
                      {...{"size":"2"}}
                    >
                      Enviar otro mensaje
                    </Button>
                  </UiBox>
                </UiBox>
              ) : (
                <form onSubmit={handleSubmit} {...{"className":"space-y-4"}}>
                  {errorMsg && (
                    <UiBox {...{"style":{"borderRadius":"var(--radius-3)","backgroundColor":"var(--red-3)","border":"1px solid var(--gray-a6)","color":"var(--red-11)"},"className":"p-2.5"}}>
                      {errorMsg}
                    </UiBox>
                  )}
                  <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 gap-4"}}>
                    <UiBox {...{"className":"space-y-1.5"}}>
                      <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Nombre Completo *</UiLabel>
                      <Input 
                        type="text" 
                        required 
                        placeholder="Ej. Carlos Morales"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </UiBox>
                    <UiBox {...{"className":"space-y-1.5"}}>
                      <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Correo Electrónico *</UiLabel>
                      <Input 
                        type="email" 
                        required 
                        placeholder="tu@empresa.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </UiBox>
                  </UiBox>

                  <UiBox {...{"className":"grid grid-cols-1 sm:grid-cols-2 gap-4"}}>
                    <UiBox {...{"className":"space-y-1.5"}}>
                      <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Teléfono / WhatsApp</UiLabel>
                      <Input 
                        type="tel" 
                        placeholder="0991234567"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </UiBox>
                    <UiBox {...{"className":"space-y-1.5"}}>
                      <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Nombre de Empresa</UiLabel>
                      <Input 
                        type="text" 
                        placeholder="Mi Negocio S.A."
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                      />
                    </UiBox>
                  </UiBox>

                  <UiBox {...{"className":"space-y-1.5"}}>
                    <UiLabel {...{"size":"1","weight":"bold","color":"gray","highContrast":true}}>Mensaje o Consulta *</UiLabel>
                    <UiTextarea
                      required 
                      rows={4} 
                      placeholder="Cuéntanos cómo podemos ayudarte..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      {...{"size":"2","color":"gray","className":"flex w-full"}}
                    />
                  </UiBox>

                  <Button 
                    type="submit" 
                    variant="default"
                    size="sm"
                    disabled={loading}
                    {...{"size":"2","className":"w-full gap-1.5"}}
                  >
                    <Send size={13} />
                    <UiText>{loading ? 'Enviando...' : 'Enviar Mensaje'}</UiText>
                  </Button>
                </form>
              )}
            </Card>
          </UiBox>

        </UiBox>
      </section>

    </UiBox>
  );
}
