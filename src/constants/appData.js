// Constantes de datos y paletas del espacio de trabajo (Kanban, usuarios, páginas demo).

export const COLUMN_COLORS = [
  { id: 'gray', badge: 'bg-slate-200/90 text-slate-900 border border-slate-300 font-extrabold uppercase tracking-wider text-[11px]', bgDark: 'bg-slate-900/40 border-slate-700', bgLight: 'bg-slate-50 border-slate-200/90 shadow-sm', dot: 'bg-slate-600' },
  { id: 'blue', badge: 'bg-blue-100 text-blue-950 border border-blue-300/90 font-extrabold uppercase tracking-wider text-[11px]', bgDark: 'bg-blue-950/40 border-blue-800', bgLight: 'bg-slate-50 border-slate-200/90 shadow-sm', dot: 'bg-blue-600' },
  { id: 'green', badge: 'bg-emerald-100 text-emerald-950 border border-emerald-300/90 font-extrabold uppercase tracking-wider text-[11px]', bgDark: 'bg-emerald-950/40 border-emerald-800', bgLight: 'bg-slate-50 border-slate-200/90 shadow-sm', dot: 'bg-emerald-600' },
  { id: 'yellow', badge: 'bg-amber-100 text-amber-950 border border-amber-300/90 font-extrabold uppercase tracking-wider text-[11px]', bgDark: 'bg-amber-950/40 border-amber-800', bgLight: 'bg-slate-50 border-slate-200/90 shadow-sm', dot: 'bg-amber-600' },
  { id: 'red', badge: 'bg-rose-100 text-rose-950 border border-rose-300/90 font-extrabold uppercase tracking-wider text-[11px]', bgDark: 'bg-rose-950/40 border-rose-800', bgLight: 'bg-slate-50 border-slate-200/90 shadow-sm', dot: 'bg-rose-600' },
  { id: 'purple', badge: 'bg-purple-100 text-purple-950 border border-purple-300/90 font-extrabold uppercase tracking-wider text-[11px]', bgDark: 'bg-purple-950/40 border-purple-800', bgLight: 'bg-slate-50 border-slate-200/90 shadow-sm', dot: 'bg-purple-600' },
];

export const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'Por hacer', color: 'gray' },
  { id: 'in-progress', title: 'En progreso', color: 'blue' },
  { id: 'done', title: 'Completado', color: 'green' }
];

export const USER_COLORS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-emerald-400 to-emerald-600',
  'from-red-400 to-red-600',
  'from-yellow-400 to-yellow-600',
  'from-gray-400 to-gray-600'
];

// --- Datos Simulados de Usuarios ---
export const MOCK_USERS = [
  { id: 'u1', name: 'Carlos Ruiz', role: 'Admin', job: 'Product Manager', initials: 'CR', color: 'from-blue-400 to-blue-600' },
  { id: 'u2', name: 'Ana Torres', role: 'Miembro', job: 'UI/UX Lead', initials: 'AT', color: 'from-purple-400 to-purple-600' },
  { id: 'u3', name: 'Luis Gómez', role: 'Miembro', job: 'Fullstack Dev', initials: 'LG', color: 'from-emerald-400 to-emerald-600' },
  { id: 'u4', name: 'Cliente X', role: 'Observador', job: 'Stakeholder', initials: 'CX', color: 'from-gray-400 to-gray-600' }
];

export const MOCK_EVENTS = [
  { id: 1, title: 'Sprint Planning: E-commerce Vercel', time: '10:00 AM', date: 'Hoy', meetLink: 'https://meet.google.com/abc-defg-hij', color: 'bg-blue-500/20 text-blue-300' },
  { id: 2, title: 'Revisión de Wireframes con Cliente', time: '01:30 PM', date: 'Hoy', meetLink: 'https://meet.google.com/xyz-uvwx-yza', color: 'bg-purple-500/20 text-purple-300' },
  { id: 3, title: 'Daily Standup Dev Team', time: '09:00 AM', date: 'Mañana', meetLink: 'https://meet.google.com/qwe-rtyu-iop', color: 'bg-green-500/20 text-green-300' },
];

export const INITIAL_PAGES = [
  { id: '1', title: 'E-commerce ClientX', content: '## Requerimientos del Proyecto\n\n- Migrar base de datos a Supabase.\n- Implementar pasarela de pagos con Stripe.\n- Rediseño de la interfaz usando Tailwind CSS.\n\n**Notas del cliente:** Quieren que la carga sea súper rápida.', icon: 'monitor', type: 'doc' },
  { id: '3', title: 'UI/UX Guidelines', content: 'Colores de la marca:\n- Primario: #4F46E5\n- Secundario: #10B981', icon: 'palette', type: 'doc' },
  { id: '4', title: 'App Móvil Finanzas', content: '', icon: 'rocket', type: 'project', leadId: 'u1',
    columns: [
      { id: 'todo', title: 'Por hacer', color: 'gray' },
      { id: 'in-progress', title: 'En progreso', color: 'blue' },
      { id: 'done', title: 'Completado', color: 'green' }
    ],
    tasks: [
      { id: 't1', projectId: '4', content: 'Investigación de usuarios (UX)', status: 'done', assigneeId: 'u2', meetLink: '', notes: [{ id: 'n1', text: 'Reunión inicial aprobada', date: '26/4/2026, 09:00' }] },
      { id: 't2', projectId: '4', content: 'Diseñar Mockups en Figma', status: 'in-progress', assigneeId: 'u2', meetLink: '', notes: [{ id: 'n2', text: 'Falta confirmar la paleta de colores', date: '26/4/2026, 11:30' }] },
      { id: 't3', projectId: '4', content: 'Configurar entorno React Native', status: 'todo', assigneeId: 'u3', meetLink: '' },
      { id: 't4', projectId: '4', content: 'Reunión de aprobación de diseño', status: 'todo', assigneeId: 'u4', meetLink: 'https://meet.google.com/mock-meet' }
    ]
  }
];
