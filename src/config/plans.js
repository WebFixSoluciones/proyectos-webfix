export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 29,
    priceYearly: 23,
    maxUsers: 3,
    maxProducts: 100,
    modules: ['dashboard', 'ventas', 'personas', 'general_settings']
  },
  professional: {
    id: 'professional',
    name: 'Profesional',
    priceMonthly: 79,
    priceYearly: 63,
    maxUsers: 10,
    maxProducts: 1000,
    modules: ['dashboard', 'ventas', 'personas', 'inventario', 'team', 'calendar', 'general_settings']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 149,
    priceYearly: 119,
    maxUsers: 9999, // Ilimitado
    maxProducts: 99999, // Ilimitado
    modules: ['dashboard', 'ventas', 'personas', 'inventario', 'team', 'calendar', 'finances', 'compras', 'gastos_creditos', 'general_settings']
  }
};

