import { PLANS } from './plans';

export const PRODUCTS_CATALOG = {
  erp: { title: 'Plan ERP', desc: 'Elige los módulos y límites de tu sistema.', plans: [] },
  facturacion: {
    title: 'Facturación Electrónica SRI',
    desc: 'Sistema de facturación automatizado y autorizado por el SRI del Ecuador.',
    plans: [
      {
        id: 'sri_basico',
        name: 'Plan Básico SRI',
        priceMonthly: 9,
        priceYearly: 7,
        features: ['Hasta 50 facturas/mes', '1 Usuario', 'Firma electrónica compatible', 'Soporte vía email']
      },
      {
        id: 'sri_pyme',
        name: 'Plan Pyme SRI',
        priceMonthly: 19,
        priceYearly: 15,
        features: ['Facturación Ilimitada', '3 Usuarios', 'Inventario básico', 'Soporte prioritario'],
        isPopular: true
      },
      {
        id: 'sri_enterprise',
        name: 'Plan Enterprise SRI',
        priceMonthly: 39,
        priceYearly: 31,
        features: ['Facturación Ilimitada', 'Usuarios Ilimitados', 'Sucursales y Bodegas', 'Soporte 24/7 y Capacitación']
      }
    ]
  },
  paginas: {
    title: 'Sitios y Páginas Web',
    desc: 'Presencia web profesional con hosting de alto rendimiento y SEO optimizado.',
    plans: [
      {
        id: 'web_landing',
        name: 'Landing Page',
        priceMonthly: 15,
        priceYearly: 12,
        features: ['1 Sección de Aterrizaje', 'Hosting incluido', 'Certificado SSL Gratis', 'Formulario de contacto']
      },
      {
        id: 'web_pro',
        name: 'Sitio Web Pro',
        priceMonthly: 35,
        priceYearly: 28,
        features: ['Hasta 5 páginas internas', 'Panel administrable', 'Blog de noticias', 'Diseño responsivo premium'],
        isPopular: true
      },
      {
        id: 'web_ecommerce',
        name: 'Tienda Online',
        priceMonthly: 75,
        priceYearly: 60,
        features: ['Productos ilimitados', 'Carrito de compras', 'Pasarela de pagos integrada', 'Control de pedidos']
      }
    ]
  },
  correos: {
    title: 'Correos Corporativos',
    desc: 'Comunicación profesional y segura con el dominio corporativo de tu empresa.',
    plans: [
      {
        id: 'mail_pro',
        name: 'Plan Mail Pro',
        priceMonthly: 5,
        priceYearly: 4,
        features: ['10 GB de almacenamiento', 'Filtro Antispam premium', 'Webmail WebFix', 'Compatible con Outlook/Mobile']
      },
      {
        id: 'mail_business',
        name: 'Plan Mail Business',
        priceMonthly: 12,
        priceYearly: 10,
        features: ['30 GB de almacenamiento', 'Videollamadas grupales', '100 GB en nube compartida', 'Calendario corporativo'],
        isPopular: true
      },
      {
        id: 'mail_enterprise',
        name: 'Plan Mail Enterprise',
        priceMonthly: 25,
        priceYearly: 20,
        features: ['100 GB de almacenamiento', 'Archivado inteligente de correos', 'Seguridad reforzada', 'Soporte telefónico 24/7']
      }
    ]
  },
  whatsapp: {
    title: 'WhatsApp CRM',
    desc: 'Multiagente, automatización y centralización de conversaciones comerciales.',
    plans: [
      {
        id: 'crm_inbox',
        name: 'Plan CRM Inbox',
        priceMonthly: 20,
        priceYearly: 16,
        features: ['1 Línea Conectada', 'Bandeja compartida', 'Hasta 2 agentes', 'Respuestas rápidas']
      },
      {
        id: 'crm_automation',
        name: 'Plan CRM Automation',
        priceMonthly: 45,
        priceYearly: 36,
        features: ['Línea oficial certificada', 'Chatbots interactivos', 'Hasta 5 agentes', 'Asignación automática de chats'],
        isPopular: true
      },
      {
        id: 'crm_enterprise',
        name: 'Plan CRM Enterprise',
        priceMonthly: 95,
        priceYearly: 76,
        features: ['Campañas oficiales masivas', 'Integración con APIs externas', 'Agentes Ilimitados', 'Reportes de desempeño']
      }
    ]
  }
};


export const DEFAULT_BILLING_PLANS = [
  ...Object.values(PLANS).map(plan => ({ ...plan, category: 'erp', features: [] })),
  ...Object.entries(PRODUCTS_CATALOG).filter(([category]) => category !== 'erp').flatMap(([category, value]) => value.plans.map(plan => ({
    ...plan,
    category,
    maxUsers: category === 'facturacion' ? (plan.id === 'sri_basico' ? 1 : plan.id === 'sri_pyme' ? 3 : 9999) : 0,
    maxProducts: category === 'facturacion' ? (plan.id === 'sri_basico' ? 100 : plan.id === 'sri_pyme' ? 1000 : 99999) : 0,
    modules: category === 'facturacion' ? (plan.id === 'sri_basico' ? ['dashboard', 'ventas', 'personas', 'general_settings'] : plan.id === 'sri_pyme' ? ['dashboard', 'ventas', 'personas', 'inventario', 'general_settings'] : PLANS.enterprise.modules) : []
  })))
];

