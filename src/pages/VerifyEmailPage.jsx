import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyEmailPage({ showToast }) {
  const { currentUser, refreshEmailVerification, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const checkVerification = async () => {
    setBusy(true);
    try {
      if (await refreshEmailVerification()) {
        navigate('/app');
      } else {
        showToast?.('Tu correo aún no está verificado.', 'warning');
      }
    } catch {
      showToast?.('No se pudo comprobar la verificación. Intenta de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!currentUser) return;
    setBusy(true);
    try {
      await sendEmailVerification(currentUser);
      showToast?.('Enlace enviado. Revisa también la carpeta de spam.', 'success');
    } catch {
      showToast?.('No se pudo enviar otro enlace. Intenta más tarde.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-5">
      <section className="w-full max-w-md rounded-lg border border-[var(--gray-a6)] p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">Verifica tu correo</h1>
        <p className="text-sm text-[var(--gray-11)]">Enviamos un enlace a <strong>{currentUser?.email}</strong>. Ábrelo para activar el acceso a tu empresa.</p>
        <button type="button" onClick={checkVerification} disabled={busy} className="w-full rounded-md bg-[var(--accent-9)] px-4 py-2 text-white font-semibold disabled:opacity-50">Ya verifiqué mi correo</button>
        <button type="button" onClick={resend} disabled={busy} className="w-full rounded-md border border-[var(--gray-a6)] px-4 py-2 font-semibold disabled:opacity-50">Reenviar enlace</button>
        <button type="button" onClick={() => { logout(); navigate('/login'); }} className="text-sm text-[var(--gray-11)]">Cerrar sesión</button>
      </section>
    </main>
  );
}
