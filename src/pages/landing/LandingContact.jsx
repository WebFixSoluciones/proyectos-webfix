import { useState } from 'react';
import { Mail, Phone, MapPin, CheckCircle2, Send } from 'lucide-react';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', company: '', message: '' });
    }, 1000);
  };

  return (
    <div className="w-full bg-white text-text-primary">
      
      {/* Header */}
      <section className="pt-16 pb-12 border-b border-border-default bg-surface-sidebar/30 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-3">
          <Badge variant="outline" className="text-xs py-0.5 px-2.5">
            Contacto & Soporte
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-heading">
            Estamos listos para ayudarte.
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            ¿Tienes preguntas sobre los planes, configuración de firma .p12 o migración de datos? Escríbenos y un asesor te responderá de inmediato.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-left">
          
          {/* Contact Details */}
          <div className="md:col-span-5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-text-heading mb-2">Canales de Atención</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Nuestro equipo de soporte técnico y comercial está disponible de Lunes a Viernes de 8:30 AM a 6:00 PM (Hora Ecuador).
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-md bg-surface-sidebar border border-border-default">
                <div className="p-2 rounded bg-white text-text-heading border border-border-default">
                  <Mail size={15} />
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-semibold block">Correo Electrónico</span>
                  <span className="font-semibold text-text-heading">soporte@webfixsoluciones.net</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md bg-surface-sidebar border border-border-default">
                <div className="p-2 rounded bg-white text-text-heading border border-border-default">
                  <Phone size={15} />
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-semibold block">WhatsApp Directo</span>
                  <span className="font-semibold text-text-heading">+593 99 999 9999</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md bg-surface-sidebar border border-border-default">
                <div className="p-2 rounded bg-white text-text-heading border border-border-default">
                  <MapPin size={15} />
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-semibold block">Ubicación</span>
                  <span className="font-semibold text-text-heading">Quito / Guayaquil, Ecuador</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-7">
            <Card className="p-6">
              {submitted ? (
                <div className="text-center py-10 space-y-3">
                  <CheckCircle2 size={36} className="text-[#00E4B8] mx-auto" />
                  <h3 className="text-base font-bold text-text-heading">¡Mensaje Enviado con Éxito!</h3>
                  <p className="text-xs text-text-secondary max-w-sm mx-auto">
                    Hemos recibido tu consulta. Uno de nuestros asesores técnicos se comunicará contigo en breve.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSubmitted(false)}
                    className="text-xs mt-4"
                  >
                    Enviar otro mensaje
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-heading">Nombre Completo *</label>
                      <Input 
                        type="text" 
                        required 
                        placeholder="Ej. Carlos Morales"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-heading">Correo Electrónico *</label>
                      <Input 
                        type="email" 
                        required 
                        placeholder="tu@empresa.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-heading">Teléfono / WhatsApp</label>
                      <Input 
                        type="tel" 
                        placeholder="0991234567"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-heading">Nombre de Empresa</label>
                      <Input 
                        type="text" 
                        placeholder="Mi Negocio S.A."
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-heading">Mensaje o Consulta *</label>
                    <textarea 
                      required 
                      rows={4} 
                      placeholder="Cuéntanos cómo podemos ayudarte..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="flex w-full rounded-md border border-border-default bg-white px-3 py-2 text-xs text-text-primary shadow-none transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="default"
                    size="sm"
                    disabled={loading}
                    className="w-full text-xs gap-1.5 h-9"
                  >
                    <Send size={13} />
                    <span>{loading ? 'Enviando...' : 'Enviar Mensaje'}</span>
                  </Button>
                </form>
              )}
            </Card>
          </div>

        </div>
      </section>

    </div>
  );
}
