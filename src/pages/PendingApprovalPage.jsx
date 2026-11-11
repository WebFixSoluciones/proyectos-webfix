import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PendingApprovalPage() {
  const { currentUser, tenantInfo, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-5">
      <section className="w-full max-w-md rounded-lg border border-[var(--gray-a6)] p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">Solicitud pendiente de aprobación</h1>
        <p className="text-sm text-[var(--gray-11)]">
          Recibimos el registro de <strong>{tenantInfo?.companyName || 'tu empresa'}</strong> con el correo <strong>{currentUser?.email}</strong>.
          El acceso al ERP se habilitará cuando SuperAdmin apruebe la solicitud.
        </p>
        <p className="text-sm text-[var(--gray-11)]">Esta pantalla se actualizará automáticamente al aprobarse.</p>
        <button type="button" onClick={async () => { await logout(); navigate('/login'); }}
          className="rounded-md border border-[var(--gray-a6)] px-4 py-2 text-sm font-semibold">
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}
