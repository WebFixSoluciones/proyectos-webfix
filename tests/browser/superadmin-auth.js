export function useAuth() {
  return { currentUser: { uid: 'root', email: 'root@example.test' }, role: 'superadmin', logout: async () => {} };
}
