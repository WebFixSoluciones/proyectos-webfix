import { useState } from 'react';
import { Mail, Phone, MapPin, CheckCircle } from 'lucide-react';

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
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', company: '', message: '' });
    }, 1200);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
      
      <div className="text-center mb-12 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">Ponte en contacto con nuestro equipo</h1>
        <p className="text-sm text-gray-650 max-w-md mx-auto font-medium">¿Tienes dudas sobre los planes o necesitas asesoramiento para registrar tu firma electrónica? Escríbenos.</p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start text-left">
        
        {/* Contact info channels */}
        <div className="md:col-span-5 space-y-6">
          <h2 className="text-lg font-black mb-4">Información de Soporte</h2>
          <p className="text-xs text-gray-650 leading-relaxed font-medium">
            Nuestro equipo de soporte técnico y comercial está disponible de Lunes a Viernes de 8:30 AM a 6:00 PM.
          </p>

          <div className="space-y-4 text-xs font-semibold">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail size={16} />
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Correo Electrónico</p>
                <p className="text-black">soporte@webfixsoluciones.net</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Phone size={16} />
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Teléfono / WhatsApp</p>
                <p className="text-black">+593 99 999 9999</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                <MapPin size={16} />
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Oficina Principal</p>
                <p className="text-black">Quito, Ecuador</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className={`md:col-span-7 p-6 rounded-card border bg-white border-border-default relative overflow-hidden`}>
          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-base font-black">¡Mensaje enviado con éxito!</h3>
              <p className="text-xs text-gray-500 font-medium">Hemos recibido tus datos. Un asesor comercial te contactará en menos de 2 horas laborables.</p>
              <button 
                onClick={() => setSubmitted(false)}
                className="mt-4 px-4 py-2 bg-primary hover:bg-surface-card text-white text-xs font-bold rounded-lg border-none cursor-pointer"
              >
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1 text-gray-500">Nombre Completo *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Juan Pérez"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-border-default bg-white outline-none text-black"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-500">Email Corporativo *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="Ej. juan@empresa.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-border-default bg-white outline-none text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1 text-gray-500">Teléfono móvil</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 0991234567"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-border-default bg-white outline-none text-black"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-500">Nombre de la Empresa</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Importadora S.A."
                    value={form.company}
                    onChange={e => setForm({ ...form, company: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-border-default bg-white outline-none text-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-500">Mensaje / Consulta *</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="Detalla tu consulta aquí..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-border-default bg-white outline-none text-black resize-none font-sans"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-surface-card text-white text-xs font-bold rounded-card uppercase tracking-wider transition-colors border-none cursor-pointer"
              >
                {loading ? 'Enviando...' : 'Enviar Consulta'}
              </button>

            </form>
          )}
        </div>

      </div>

    </div>
  );
}
