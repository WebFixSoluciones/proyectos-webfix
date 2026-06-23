<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Bell, 
  Check, 
  HelpCircle, 
  Palette, 
  Sliders, 
  Layers, 
  DollarSign, 
  Activity, 
  Info,
  Calendar,
  CheckCircle,
  Menu,
  ChevronDown,
  ShoppingCart,
  Package,
  Printer,
  TrendingUp,
  X
} from 'lucide-vue-next';

// Active menu item
const activeMenu = ref('Dashboard');

// Search queries
const searchQuery = ref('');
const invoiceSearchQuery = ref('');

// Custom Accent Color State
const customColors = reactive({
  primary: '#0029c5',
  primaryContainer: '#1c40f2',
  secondary: '#006b55',
  secondaryContainer: '#3ffbcd',
});

// Preset Color Themes
const presets = [
  {
    name: 'Futuristic Precision Pure',
    primary: '#0029c5',
    primaryContainer: '#1c40f2',
    secondary: '#006b55',
    secondaryContainer: '#3ffbcd'
  },
  {
    name: 'Modern Ocean Indigo',
    primary: '#005f73',
    primaryContainer: '#0a9396',
    secondary: '#94d2bd',
    secondaryContainer: '#e9d8a6'
  },
  {
    name: 'Cyberpunk Emerald',
    primary: '#3a0ca3',
    primaryContainer: '#7209b7',
    secondary: '#4cc9f0',
    secondaryContainer: '#b5e2fa'
  },
  {
    name: 'Steel Crimson',
    primary: '#6b0f1a',
    primaryContainer: '#b91c1c',
    secondary: '#334155',
    secondaryContainer: '#cbd5e1'
  }
];

// Apply custom colors to document root variables
const applyColors = () => {
  document.documentElement.style.setProperty('--primary', customColors.primary);
  document.documentElement.style.setProperty('--primary-container', customColors.primaryContainer);
  document.documentElement.style.setProperty('--secondary', customColors.secondary);
  document.documentElement.style.setProperty('--secondary-container', customColors.secondaryContainer);
};

const selectPreset = (preset) => {
  customColors.primary = preset.primary;
  customColors.primaryContainer = preset.primaryContainer;
  customColors.secondary = preset.secondary;
  customColors.secondaryContainer = preset.secondaryContainer;
  applyColors();
};

// Form values (Client Registration)
const clientForm = reactive({
  clientName: '',
  ruc: '',
  email: '',
  category: 'Frecuente',
  status: 'Activo'
});

// Mock client database
const clients = ref([
  { id: 1, name: 'Importadora Industrial S.A.', ruc: '1792384729001', email: 'contacto@industrial.ec', category: 'Corporativo', status: 'Activo' },
  { id: 2, name: 'Sistemas Médicos Integral', ruc: '0992384918001', email: 'sistemas@medicos.com.ec', category: 'Corporativo', status: 'Activo' },
  { id: 3, name: 'María Augusta Flores', ruc: '1712495861001', email: 'maria.flores@outlook.com', category: 'Frecuente', status: 'Inactivo' },
  { id: 4, name: 'Distribuidora del Austro', ruc: '0103485721001', email: 'austro@distribuidora.ec', category: 'Mayorista', status: 'Activo' },
  { id: 5, name: 'Carlos Alfredo Pérez', ruc: '1802948572001', email: 'carlos.perez@gmail.com', category: 'Frecuente', status: 'Activo' }
]);

const editClientIndex = ref(null);

const saveClient = () => {
  if (!clientForm.clientName || !clientForm.ruc) return;

  if (editClientIndex.value !== null) {
    // Edit existing
    clients.value[editClientIndex.value] = {
      ...clients.value[editClientIndex.value],
      name: clientForm.clientName,
      ruc: clientForm.ruc,
      email: clientForm.email,
      category: clientForm.category,
      status: clientForm.status
    };
    editClientIndex.value = null;
  } else {
    // Add new
    clients.value.push({
      id: Date.now(),
      name: clientForm.clientName,
      ruc: clientForm.ruc,
      email: clientForm.email,
      category: clientForm.category,
      status: clientForm.status
    });
  }

  // Reset form
  clientForm.clientName = '';
  clientForm.ruc = '';
  clientForm.email = '';
  clientForm.category = 'Frecuente';
  clientForm.status = 'Activo';
};

const editClient = (index) => {
  editClientIndex.value = index;
  const client = clients.value[index];
  clientForm.clientName = client.name;
  clientForm.ruc = client.ruc;
  clientForm.email = client.email;
  clientForm.category = client.category;
  clientForm.status = client.status;
};

const deleteClient = (index) => {
  clients.value.splice(index, 1);
};

// --- BILLING / INVOICING MODULE SYSTEM ---
const invoiceForm = reactive({
  clientId: '',
  items: [
    { name: 'Licencia Cloud ERP Premium', qty: 1, price: 350.00 },
    { name: 'Soporte Técnico Técnico 24/7', qty: 1, price: 90.00 }
  ],
  newItemName: '',
  newItemQty: 1,
  newItemPrice: 0.00
});

// Available product catalog
const productsCatalog = [
  { name: 'Licencia Cloud ERP Premium', price: 350.00 },
  { name: 'Soporte Técnico Técnico 24/7', price: 90.00 },
  { name: 'Módulo de Inventarios Avanzado', price: 180.00 },
  { name: 'Impresora Térmica POS 80mm', price: 125.00 },
  { name: 'Lector de Código de Barras Láser', price: 75.00 }
];

const selectedCatalogProduct = ref('');

const onCatalogProductChange = () => {
  const prod = productsCatalog.find(p => p.name === selectedCatalogProduct.value);
  if (prod) {
    invoiceForm.newItemName = prod.name;
    invoiceForm.newItemPrice = prod.price;
  }
};

const addInvoiceItem = () => {
  if (!invoiceForm.newItemName || invoiceForm.newItemQty <= 0) return;
  invoiceForm.items.push({
    name: invoiceForm.newItemName,
    qty: invoiceForm.newItemQty,
    price: invoiceForm.newItemPrice
  });
  invoiceForm.newItemName = '';
  invoiceForm.newItemQty = 1;
  invoiceForm.newItemPrice = 0.00;
  selectedCatalogProduct.value = '';
};

const removeInvoiceItem = (index) => {
  invoiceForm.items.splice(index, 1);
};

const subtotal = computed(() => {
  return invoiceForm.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
});

const iva = computed(() => {
  return subtotal.value * 0.15; // 15% IVA Ecuador
});

const total = computed(() => {
  return subtotal.value + iva.value;
});

// Generated invoices history
const invoices = ref([
  { id: 'FAC-001-002-00002891', client: 'Importadora Industrial S.A.', ruc: '1792384729001', date: '2026-06-23', total: 506.00, status: 'Autorizado' },
  { id: 'FAC-001-002-00002890', client: 'Carlos Alfredo Pérez', ruc: '1802948572001', date: '2026-06-22', total: 103.50, status: 'Autorizado' },
  { id: 'FAC-001-002-00002889', client: 'Distribuidora del Austro', ruc: '0103485721001', date: '2026-06-21', total: 322.00, status: 'Pendiente' }
]);

const showInvoiceSuccessModal = ref(false);
const emittedInvoiceDetails = ref(null);

const emitInvoice = () => {
  if (!invoiceForm.clientId) {
    alert('Por favor seleccione un cliente.');
    return;
  }
  const clientObj = clients.value.find(c => c.id == invoiceForm.clientId);
  if (!clientObj) return;

  const invoiceNumber = `FAC-001-002-0000${Math.floor(1000 + Math.random() * 9000)}`;
  
  const newInvoice = {
    id: invoiceNumber,
    client: clientObj.name,
    ruc: clientObj.ruc,
    date: new Date().toISOString().split('T')[0],
    total: total.value,
    status: 'Autorizado',
    items: [...invoiceForm.items]
  };

  invoices.value.unshift(newInvoice);
  emittedInvoiceDetails.value = newInvoice;
  showInvoiceSuccessModal.value = true;

  // Reset form
  invoiceForm.clientId = '';
  invoiceForm.items = [
    { name: 'Licencia Cloud ERP Premium', qty: 1, price: 350.00 }
  ];
};

// Modal visible state
const showThemeConfig = ref(false);

onMounted(() => {
  applyColors();
  if (clients.value.length > 0) {
    invoiceForm.clientId = clients.value[0].id;
  }
});
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-surface relative select-none">
    
    <!-- Organic blobs in background (Liquid Design Concept) -->
    <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-neutral-tint opacity-35 filter blur-3xl pointer-events-none"></div>
    <div class="absolute top-[40%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-primary-container opacity-[0.06] filter blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 left-[20%] w-[30rem] h-[30rem] rounded-full bg-neutral-tint opacity-20 filter blur-3xl pointer-events-none"></div>

    <!-- SIDEBAR (WHITE #FFFFFF - AS REQUESTED) -->
    <aside class="w-64 bg-white border-r border-surface-high text-on-surface flex flex-col z-10 shrink-0 select-none">
      <!-- Logo area -->
      <div class="h-16 flex items-center px-6 border-b border-surface-high gap-3">
        <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
          WF
        </div>
        <div>
          <h1 class="font-extrabold text-sm tracking-wider uppercase text-on-surface">WebFix Suite</h1>
          <span class="text-[10px] text-primary font-bold font-mono uppercase">Interactive</span>
        </div>
      </div>

      <!-- Navigation links (FUNCTIONAL) -->
      <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        <button 
          @click="activeMenu = 'Dashboard'"
          :class="[
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-4',
            activeMenu === 'Dashboard' 
              ? 'bg-primary/10 text-primary border-primary' 
              : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface border-transparent'
          ]"
        >
          <LayoutDashboard class="w-4.5 h-4.5" />
          Dashboard
        </button>

        <button 
          @click="activeMenu = 'Clientes'"
          :class="[
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-4',
            activeMenu === 'Clientes' 
              ? 'bg-primary/10 text-primary border-primary' 
              : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface border-transparent'
          ]"
        >
          <Users class="w-4.5 h-4.5" />
          Clientes
        </button>

        <button 
          @click="activeMenu = 'Facturación'"
          :class="[
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-4',
            activeMenu === 'Facturación' 
              ? 'bg-primary/10 text-primary border-primary' 
              : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface border-transparent'
          ]"
        >
          <ShoppingCart class="w-4.5 h-4.5" />
          Facturación
        </button>
      </nav>

      <!-- Bottom actions -->
      <div class="p-4 border-t border-surface-high space-y-3">
        <div class="flex items-center gap-3 px-2 py-1">
          <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            AD
          </div>
          <div class="overflow-hidden">
            <p class="text-xs font-semibold truncate text-on-surface">Administrador</p>
            <p class="text-[10px] text-on-surface-variant truncate">admin@webfix.com.ec</p>
          </div>
        </div>
        
        <button class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-rose-50 hover:text-rose-600 transition-colors">
          <LogOut class="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>

    <!-- MAIN BODY -->
    <main class="flex-1 flex flex-col overflow-hidden relative z-10">
      
      <!-- TOP HEADER -->
      <header class="h-16 border-b border-surface-high bg-white/70 backdrop-blur-md flex items-center justify-between px-8 z-10">
        <div class="flex items-center gap-4">
          <h2 class="text-lg font-bold text-on-surface tracking-tight">{{ activeMenu }}</h2>
          <div class="h-4 w-px bg-surface-high"></div>
          <p class="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">Futuristic Precision Pure Theme</p>
        </div>

        <div class="flex items-center gap-4">
          <!-- Notification Circle -->
          <button class="w-9 h-9 rounded-lg bg-surface-low text-on-surface hover:bg-surface-high flex items-center justify-center transition-colors">
            <Bell class="w-4 h-4" />
          </button>

          <!-- Theme customizer button -->
          <button 
            @click="showThemeConfig = true"
            class="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-button text-xs font-semibold transition-colors hover:bg-primary-container"
          >
            <Palette class="w-3.5 h-3.5" />
            Configurar Paleta
          </button>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        
        <!-- ======================= TAB 1: DASHBOARD ======================= -->
        <div v-if="activeMenu === 'Dashboard'" class="space-y-8 animate-fade-in">
          
          <!-- STATS CARDS -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-white border border-surface-high rounded-card p-6 flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Clientes Activos</p>
                <h3 class="text-2xl font-extrabold text-on-surface mt-1">{{ clients.length }}</h3>
                <span class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">+12% este mes</span>
              </div>
            </div>

            <div class="bg-white border border-surface-high rounded-card p-6 flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <DollarSign class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Facturado</p>
                <h3 class="text-2xl font-extrabold text-on-surface mt-1">$45,280</h3>
                <span class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">+8.4% vs prev</span>
              </div>
            </div>

            <div class="bg-white border border-surface-high rounded-card p-6 flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <FileText class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Facturas Emitidas</p>
                <h3 class="text-2xl font-extrabold text-on-surface mt-1">{{ invoices.length }}</h3>
                <span class="text-[10px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded-full mt-1 inline-block">SRI Autorizado</span>
              </div>
            </div>

            <div class="bg-white border border-surface-high rounded-card p-6 flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                <Activity class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Rendimiento API</p>
                <h3 class="text-2xl font-extrabold text-on-surface mt-1">99.98%</h3>
                <span class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">Óptimo (SRI)</span>
              </div>
            </div>
          </div>

          <!-- TWO COLUMN GRID -->
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            <!-- LEFT PANEL: SVG Graphic & Status Dashboard (Column Span 2) -->
            <div class="bg-white border border-surface-high rounded-card p-6 lg:col-span-2 space-y-6">
              <div>
                <h4 class="font-bold text-on-surface text-base">Rendimiento Mensual</h4>
                <p class="text-xs text-on-surface-variant mt-0.5">Ventas facturadas del año en curso</p>
              </div>

              <!-- SVG Interactive Line/Area Chart -->
              <div class="w-full h-48 bg-surface-low rounded-lg p-2 flex flex-col justify-between">
                <svg viewBox="0 0 400 120" class="w-full h-full">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3"/>
                      <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  
                  <!-- Area path -->
                  <path d="M 20,100 C 60,80 80,95 120,60 C 160,30 200,85 240,40 C 280,10 320,50 380,20 L 380,100 Z" fill="url(#chartGradient)"></path>
                  
                  <!-- Line path -->
                  <path d="M 20,100 C 60,80 80,95 120,60 C 160,30 200,85 240,40 C 280,10 320,50 380,20" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round"></path>
                  
                  <!-- Grid Lines -->
                  <line x1="20" y1="100" x2="380" y2="100" stroke="#c4c5d9" stroke-dasharray="3,3" stroke-width="0.5" />
                  <line x1="20" y1="60" x2="380" y2="60" stroke="#c4c5d9" stroke-dasharray="3,3" stroke-width="0.5" />
                  <line x1="20" y1="20" x2="380" y2="20" stroke="#c4c5d9" stroke-dasharray="3,3" stroke-width="0.5" />

                  <!-- Dots -->
                  <circle cx="120" cy="60" r="3.5" fill="var(--primary)" stroke="white" stroke-width="1"></circle>
                  <circle cx="240" cy="40" r="3.5" fill="var(--primary)" stroke="white" stroke-width="1"></circle>
                  <circle cx="380" cy="20" r="3.5" fill="var(--primary)" stroke="white" stroke-width="1"></circle>
                </svg>

                <div class="flex justify-between text-[10px] font-semibold text-on-surface-variant px-2">
                  <span>Ene</span>
                  <span>Mar</span>
                  <span>May</span>
                  <span>Jul</span>
                  <span>Sep</span>
                  <span>Dic</span>
                </div>
              </div>

              <!-- System Load Statuses -->
              <div class="space-y-3.5">
                <h5 class="text-xs font-bold text-on-surface">Servicios Conectados</h5>
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs p-2 bg-surface-low rounded border border-surface-high">
                    <span class="font-semibold text-on-surface">Firma Electrónica SRI</span>
                    <span class="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-100/50 px-2 py-0.5 rounded">
                      <CheckCircle class="w-3 h-3" /> Conectado
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-xs p-2 bg-surface-low rounded border border-surface-high">
                    <span class="font-semibold text-on-surface">Base de Datos Principal</span>
                    <span class="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-100/50 px-2 py-0.5 rounded">
                      <CheckCircle class="w-3 h-3" /> Activo (12ms)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT PANEL: Recent Invoices List (Column Span 3) -->
            <div class="bg-white border border-surface-high rounded-card p-6 lg:col-span-3 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="font-bold text-on-surface text-base">Últimas Facturas Emitidas</h4>
                    <p class="text-xs text-on-surface-variant mt-0.5">Control de emisión electrónica autorizada</p>
                  </div>
                  
                  <button 
                    @click="activeMenu = 'Facturación'"
                    class="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    Emitir Nueva <Plus class="w-3.5 h-3.5" />
                  </button>
                </div>

                <div class="overflow-x-auto border border-surface-high rounded-lg">
                  <table class="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr class="bg-deep-navy text-white font-semibold uppercase tracking-wider text-[10px]">
                        <th class="py-3 px-4">Factura</th>
                        <th class="py-3 px-4">Cliente</th>
                        <th class="py-3 px-4">Fecha</th>
                        <th class="py-3 px-4 text-right">Monto</th>
                        <th class="py-3 px-4 text-center">SRI</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-high">
                      <tr 
                        v-for="inv in invoices.slice(0, 3)" 
                        :key="inv.id" 
                        class="hover:bg-primary/5 odd:bg-white even:bg-surface-low transition-colors"
                      >
                        <td class="py-3 px-4 font-mono font-semibold text-on-surface">{{ inv.id }}</td>
                        <td class="py-3 px-4 text-on-surface">{{ inv.client }}</td>
                        <td class="py-3 px-4 text-on-surface-variant">{{ inv.date }}</td>
                        <td class="py-3 px-4 text-right font-bold text-on-surface">${{ inv.total.toFixed(2) }}</td>
                        <td class="py-3 px-4 text-center">
                          <span 
                            :class="[
                              'px-2 py-0.5 rounded text-[10px] font-bold border',
                              inv.status === 'Autorizado' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            ]"
                          >
                            {{ inv.status }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="text-right pt-4">
                <button 
                  @click="activeMenu = 'Facturación'" 
                  class="px-4 py-2 border border-surface-high rounded-button text-xs font-bold text-on-surface-variant hover:bg-surface-low transition-colors"
                >
                  Ver Todo en Facturación
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- ======================= TAB 2: CLIENTES ======================= -->
        <div v-if="activeMenu === 'Clientes'" class="space-y-8 animate-fade-in">
          
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            <!-- CLIENT FORM -->
            <div class="bg-white border border-surface-high rounded-card p-6 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h4 class="font-bold text-on-surface text-base">Registrar / Editar Cliente</h4>
                    <p class="text-xs text-on-surface-variant mt-0.5">Gestión de datos comerciales del cliente</p>
                  </div>
                  <Info class="w-4.5 h-4.5 text-outline" />
                </div>

                <form @submit.prevent="saveClient" class="space-y-4">
                  <div>
                    <label class="block text-xs font-semibold text-on-surface mb-1.5">Nombre / Razón Social</label>
                    <input 
                      v-model="clientForm.clientName"
                      type="text" 
                      placeholder="Ej. Importadora Industrial S.A." 
                      class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-on-surface mb-1.5">RUC / Cédula</label>
                    <input 
                      v-model="clientForm.ruc"
                      type="text" 
                      placeholder="Ej. 1792384729001" 
                      class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-on-surface mb-1.5">Correo Electrónico</label>
                    <input 
                      v-model="clientForm.email"
                      type="email" 
                      placeholder="correo@empresa.com" 
                      class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-on-surface mb-1.5">Categoría</label>
                      <select 
                        v-model="clientForm.category"
                        class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                      >
                        <option>Corporativo</option>
                        <option>Frecuente</option>
                        <option>Mayorista</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-on-surface mb-1.5">Estado</label>
                      <select 
                        v-model="clientForm.status"
                        class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                      >
                        <option>Activo</option>
                        <option>Inactivo</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              <div class="pt-6 mt-6 border-t border-surface-high flex gap-3 justify-end">
                <button 
                  v-if="editClientIndex !== null"
                  @click="editClientIndex = null; clientForm.clientName = ''; clientForm.ruc = ''; clientForm.email = '';"
                  class="px-4 h-10 border border-outline rounded-button text-xs font-bold text-on-surface-variant hover:bg-surface-low transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  @click="saveClient"
                  class="px-6 h-10 bg-primary text-white rounded-button text-xs font-bold hover:bg-primary-container transition-colors shadow-none"
                >
                  {{ editClientIndex !== null ? 'Actualizar Cliente' : 'Guardar Cliente' }}
                </button>
              </div>
            </div>

            <!-- CLIENT TABLE -->
            <div class="bg-white border border-surface-high rounded-card p-6 lg:col-span-3 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h4 class="font-bold text-on-surface text-base">Clientes Registrados</h4>
                    <p class="text-xs text-on-surface-variant mt-0.5">Listado general de clientes en el ERP</p>
                  </div>
                  
                  <div class="relative w-48">
                    <input 
                      v-model="searchQuery"
                      type="text" 
                      placeholder="Buscar por nombre o RUC..." 
                      class="w-full h-8 pl-8 pr-3 bg-input-bg border border-transparent rounded-input text-xs text-on-surface focus:outline-none focus:border-primary transition-all"
                    />
                    <Search class="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div class="overflow-x-auto border border-surface-high rounded-lg">
                  <table class="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr class="bg-deep-navy text-white font-semibold uppercase tracking-wider text-[10px]">
                        <th class="py-3 px-4">Contribuyente</th>
                        <th class="py-3 px-4">RUC / Cédula</th>
                        <th class="py-3 px-4">Categoría</th>
                        <th class="py-3 px-4 text-center">Estado</th>
                        <th class="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-high">
                      <tr 
                        v-for="(client, index) in clients" 
                        :key="client.id"
                        v-show="client.name.toLowerCase().includes(searchQuery.toLowerCase()) || client.ruc.includes(searchQuery)"
                        class="hover:bg-primary/5 odd:bg-white even:bg-surface-low transition-colors"
                      >
                        <td class="py-3 px-4">
                          <div class="font-semibold text-on-surface">{{ client.name }}</div>
                          <div class="text-[10px] text-on-surface-variant font-mono">{{ client.email }}</div>
                        </td>
                        <td class="py-3 px-4 font-mono text-on-surface">{{ client.ruc }}</td>
                        <td class="py-3 px-4">
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-primary">
                            {{ client.category }}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span 
                            :class="[
                              'px-2 py-0.5 rounded text-[10px] font-bold border inline-block',
                              client.status === 'Activo' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            ]"
                          >
                            {{ client.status }}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <button 
                              @click="editClient(index)"
                              class="w-7 h-7 rounded-lg hover:bg-primary/10 text-primary flex items-center justify-center transition-colors"
                            >
                              <Edit class="w-3.5 h-3.5" />
                            </button>
                            <button 
                              @click="deleteClient(index)"
                              class="w-7 h-7 rounded-lg hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                            >
                              <Trash2 class="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="flex items-center justify-between text-xs text-on-surface-variant pt-6 border-t border-surface-high mt-4">
                <p>Mostrando {{ clients.length }} contribuyentes</p>
                <div class="flex items-center gap-1.5">
                  <button class="px-2.5 py-1 rounded bg-surface-low border border-surface-high hover:bg-surface-high transition-colors font-medium">Anterior</button>
                  <button class="px-2.5 py-1 rounded bg-surface-low border border-surface-high hover:bg-surface-high transition-colors font-medium">Siguiente</button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ======================= TAB 3: FACTURACIÓN ======================= -->
        <div v-if="activeMenu === 'Facturación'" class="space-y-8 animate-fade-in">
          
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            <!-- INVOICE CREATION FORM (Column Span 3) -->
            <div class="bg-white border border-surface-high rounded-card p-6 lg:col-span-3 flex flex-col justify-between space-y-6">
              
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-surface-high pb-4">
                  <div>
                    <h4 class="font-bold text-on-surface text-base">Crear Factura Electrónica</h4>
                    <p class="text-xs text-on-surface-variant mt-0.5">Estándar SRI Ecuador - IVA 15%</p>
                  </div>
                  <ShoppingCart class="w-5 h-5 text-primary" />
                </div>

                <!-- Client Selector -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-on-surface mb-1.5">Seleccionar Cliente</label>
                    <select 
                      v-model="invoiceForm.clientId"
                      class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer"
                    >
                      <option v-for="c in clients" :key="c.id" :value="c.id">
                        {{ c.name }} ({{ c.ruc }})
                      </option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-on-surface mb-1.5">Catálogo de Productos Rápidos</label>
                    <select 
                      v-model="selectedCatalogProduct"
                      @change="onCatalogProductChange"
                      class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer"
                    >
                      <option value="" disabled selected>-- Seleccione un item comercial --</option>
                      <option v-for="prod in productsCatalog" :key="prod.name" :value="prod.name">
                        {{ prod.name }} (${{ prod.price.toFixed(2) }})
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Add Custom Item Form -->
                <div class="bg-surface-low p-4 rounded-lg border border-surface-high space-y-3">
                  <h5 class="text-xs font-bold text-on-surface">Agregar Item Personalizado</h5>
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div class="md:col-span-6">
                      <label class="block text-[10px] font-bold text-on-surface mb-1 uppercase">Descripción / Producto</label>
                      <input 
                        v-model="invoiceForm.newItemName"
                        type="text" 
                        placeholder="Nombre del servicio o producto" 
                        class="w-full h-9 px-3 bg-white border border-surface-high rounded-input text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-[10px] font-bold text-on-surface mb-1 uppercase">Cant.</label>
                      <input 
                        v-model.number="invoiceForm.newItemQty"
                        type="number" 
                        min="1"
                        class="w-full h-9 px-2 bg-white border border-surface-high rounded-input text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-[10px] font-bold text-on-surface mb-1 uppercase">P. Unitario</label>
                      <input 
                        v-model.number="invoiceForm.newItemPrice"
                        type="number" 
                        step="0.01"
                        class="w-full h-9 px-2 bg-white border border-surface-high rounded-input text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div class="md:col-span-2">
                      <button 
                        @click="addInvoiceItem"
                        type="button"
                        class="w-full h-9 bg-primary text-white text-xs font-bold rounded-button flex items-center justify-center gap-1 hover:bg-primary-container"
                      >
                        <Plus class="w-3.5 h-3.5" /> Añadir
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Active Items Table -->
                <div class="border border-surface-high rounded-lg overflow-hidden">
                  <table class="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr class="bg-surface-low border-b border-surface-high text-on-surface font-semibold text-[10px] uppercase">
                        <th class="py-2.5 px-4 w-12 text-center">#</th>
                        <th class="py-2.5 px-4">Descripción</th>
                        <th class="py-2.5 px-4 w-20 text-center">Cant</th>
                        <th class="py-2.5 px-4 w-24 text-right">P. Unit</th>
                        <th class="py-2.5 px-4 w-24 text-right">Total</th>
                        <th class="py-2.5 px-4 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, idx) in invoiceForm.items" :key="idx" class="border-b border-surface-high last:border-0">
                        <td class="py-2 px-4 text-center text-on-surface-variant font-mono">{{ idx + 1 }}</td>
                        <td class="py-2 px-4 font-medium text-on-surface">{{ item.name }}</td>
                        <td class="py-2 px-4 text-center font-mono text-on-surface">{{ item.qty }}</td>
                        <td class="py-2 px-4 text-right font-mono text-on-surface">${{ item.price.toFixed(2) }}</td>
                        <td class="py-2 px-4 text-right font-mono font-bold text-on-surface">${{ (item.qty * item.price).toFixed(2) }}</td>
                        <td class="py-2 px-4 text-center">
                          <button 
                            @click="removeInvoiceItem(idx)"
                            class="w-6 h-6 rounded hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                          >
                            <X class="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                      <tr v-if="invoiceForm.items.length === 0">
                        <td colspan="6" class="py-6 px-4 text-center text-on-surface-variant italic">No hay productos agregados a la factura.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>

              <!-- Footer with summary and button -->
              <div class="border-t border-surface-high pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="flex gap-6 text-sm">
                  <div>
                    <span class="text-[10px] text-on-surface-variant uppercase font-bold">Subtotal</span>
                    <p class="font-mono font-bold text-on-surface">${{ subtotal.toFixed(2) }}</p>
                  </div>
                  <div>
                    <span class="text-[10px] text-on-surface-variant uppercase font-bold">IVA 15%</span>
                    <p class="font-mono font-bold text-on-surface">${{ iva.toFixed(2) }}</p>
                  </div>
                  <div class="border-l border-surface-high pl-6">
                    <span class="text-[10px] text-primary uppercase font-bold">Total Factura</span>
                    <p class="font-mono text-lg font-extrabold text-primary">${{ total.toFixed(2) }}</p>
                  </div>
                </div>

                <button 
                  @click="emitInvoice"
                  class="w-full md:w-auto px-8 h-11 bg-primary text-white rounded-button text-xs font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-2"
                >
                  <FileText class="w-4 h-4" /> Emitir y Enviar al SRI
                </button>
              </div>

            </div>

            <!-- INVOICE LIST HISTORY (Column Span 2) -->
            <div class="bg-white border border-surface-high rounded-card p-6 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h4 class="font-bold text-on-surface text-base">Historial de Facturas</h4>
                    <p class="text-xs text-on-surface-variant mt-0.5">Comprobantes autorizados por el SRI</p>
                  </div>
                  
                  <div class="relative w-36">
                    <input 
                      v-model="invoiceSearchQuery"
                      type="text" 
                      placeholder="Buscar RUC o No..." 
                      class="w-full h-8 pl-8 pr-3 bg-input-bg border border-transparent rounded-input text-xs text-on-surface focus:outline-none focus:border-primary transition-all"
                    />
                    <Search class="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div class="space-y-3 overflow-y-auto max-h-[30rem] pr-2 custom-scrollbar">
                  <div 
                    v-for="inv in invoices" 
                    :key="inv.id"
                    v-show="inv.id.includes(invoiceSearchQuery) || inv.client.toLowerCase().includes(invoiceSearchQuery.toLowerCase())"
                    class="p-4 rounded-lg border border-surface-high bg-surface-low flex justify-between items-center hover:border-primary transition-all"
                  >
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-xs font-bold text-on-surface">{{ inv.id }}</span>
                        <span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.25 rounded">
                          {{ inv.status }}
                        </span>
                      </div>
                      <p class="text-xs font-semibold text-on-surface">{{ inv.client }}</p>
                      <p class="text-[10px] text-on-surface-variant">{{ inv.date }}</p>
                    </div>

                    <div class="text-right">
                      <span class="text-[10px] text-on-surface-variant block uppercase font-bold">Monto</span>
                      <span class="font-mono text-sm font-extrabold text-on-surface">${{ inv.total.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-6 border-t border-surface-high mt-4">
                <button class="w-full py-2 bg-surface-low border border-surface-high rounded-button text-xs font-bold text-on-surface hover:bg-surface-high transition-colors flex items-center justify-center gap-1.5">
                  <Printer class="w-3.5 h-3.5" /> Imprimir Reporte Diario
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </main>

    <!-- INVOICE SUCCESS DIALOG / MODAL (HIGH INTERACTIVITY) -->
    <div 
      v-if="showInvoiceSuccessModal && emittedInvoiceDetails" 
      class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        class="bg-white border border-surface-high rounded-card w-full max-w-md overflow-hidden flex flex-col shadow-none animate-slide-up"
      >
        <div class="p-6 text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle class="w-7 h-7" />
          </div>
          
          <div>
            <h3 class="font-extrabold text-on-surface text-lg">¡Factura Emitida Exitosamente!</h3>
            <p class="text-xs text-on-surface-variant mt-1">Autorizada y firmada por el SRI (Pruebas)</p>
          </div>

          <div class="bg-surface-low border border-surface-high rounded-lg p-4 text-left space-y-3 font-mono text-xs text-on-surface">
            <div class="flex justify-between border-b border-surface-high pb-2">
              <span class="text-on-surface-variant font-bold">NÚMERO:</span>
              <span class="font-bold">{{ emittedInvoiceDetails.id }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">CLIENTE:</span>
              <span class="truncate max-w-[200px] text-right">{{ emittedInvoiceDetails.client }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">RUC:</span>
              <span>{{ emittedInvoiceDetails.ruc }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">FECHA:</span>
              <span>{{ emittedInvoiceDetails.date }}</span>
            </div>
            <div class="flex justify-between border-t border-surface-high pt-2 text-sm font-bold">
              <span class="text-primary font-bold">TOTAL:</span>
              <span class="text-primary font-extrabold">${{ emittedInvoiceDetails.total.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-surface-low border-t border-surface-high flex gap-3 justify-end">
          <button 
            @click="showInvoiceSuccessModal = false"
            class="px-4 py-2 border border-outline rounded-button text-xs font-bold text-on-surface hover:bg-white transition-colors"
          >
            Cerrar
          </button>
          <button 
            @click="showInvoiceSuccessModal = false"
            class="px-5 py-2 bg-primary text-white rounded-button text-xs font-bold hover:bg-primary-container transition-colors"
          >
            Imprimir RIDE
          </button>
        </div>
      </div>
    </div>

    <!-- PALETTE CONFIGURATION MODAL -->
    <div 
      v-if="showThemeConfig" 
      class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        class="bg-white border border-surface-high rounded-card w-full max-w-lg overflow-hidden flex flex-col shadow-none animate-slide-up"
      >
        <div class="px-6 py-4 border-b border-surface-high flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Palette class="w-5 h-5 text-primary" />
            <h3 class="font-bold text-on-surface text-base">Configuración de Paleta</h3>
          </div>
          <button 
            @click="showThemeConfig = false"
            class="w-8 h-8 rounded-full hover:bg-surface-low flex items-center justify-center transition-colors text-on-surface"
          >
            <Check class="w-4 h-4" />
          </button>
        </div>

        <div class="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          
          <!-- Default Presets -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Presets de Tema</h4>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="p in presets"
                :key="p.name"
                @click="selectPreset(p)"
                class="p-3 border border-surface-high hover:border-primary rounded-lg text-left bg-surface hover:bg-surface-low transition-all space-y-2.5 flex flex-col justify-between h-20"
              >
                <span class="text-xs font-bold text-on-surface truncate block w-full">{{ p.name }}</span>
                <div class="flex gap-1.5 items-center">
                  <span class="w-4 h-4 rounded-full border border-white" :style="{ backgroundColor: p.primary }"></span>
                  <span class="w-4 h-4 rounded-full border border-white" :style="{ backgroundColor: p.primaryContainer }"></span>
                  <span class="w-4 h-4 rounded-full border border-white" :style="{ backgroundColor: p.secondary }"></span>
                  <span class="w-4 h-4 rounded-full border border-white" :style="{ backgroundColor: p.secondaryContainer }"></span>
                </div>
              </button>
            </div>
          </div>

          <div class="h-px bg-surface-high"></div>

          <!-- Color Customizer -->
          <div class="space-y-4">
            <h4 class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ajuste Manual de Colores</h4>
            
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-on-surface">Color Primario</p>
                  <p class="text-[10px] text-on-surface-variant font-mono">{{ customColors.primary }}</p>
                </div>
                <input 
                  type="color" 
                  v-model="customColors.primary" 
                  @input="applyColors"
                  class="w-10 h-8 rounded border border-surface-high cursor-pointer bg-transparent"
                />
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-on-surface">Primario Contenedor (Electric)</p>
                  <p class="text-[10px] text-on-surface-variant font-mono">{{ customColors.primaryContainer }}</p>
                </div>
                <input 
                  type="color" 
                  v-model="customColors.primaryContainer" 
                  @input="applyColors"
                  class="w-10 h-8 rounded border border-surface-high cursor-pointer bg-transparent"
                />
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-on-surface">Color Secundario</p>
                  <p class="text-[10px] text-on-surface-variant font-mono">{{ customColors.secondary }}</p>
                </div>
                <input 
                  type="color" 
                  v-model="customColors.secondary" 
                  @input="applyColors"
                  class="w-10 h-8 rounded border border-surface-high cursor-pointer bg-transparent"
                />
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-on-surface">Secundario Contenedor</p>
                  <p class="text-[10px] text-on-surface-variant font-mono">{{ customColors.secondaryContainer }}</p>
                </div>
                <input 
                  type="color" 
                  v-model="customColors.secondaryContainer" 
                  @input="applyColors"
                  class="w-10 h-8 rounded border border-surface-high cursor-pointer bg-transparent"
                />
              </div>
            </div>
          </div>

        </div>

        <div class="px-6 py-4 bg-surface-low border-t border-surface-high flex justify-end">
          <button 
            @click="showThemeConfig = false"
            class="px-5 py-2 bg-primary text-white rounded-button text-xs font-bold hover:bg-primary-container transition-colors"
          >
            Listo, Aplicar
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style>
/* Clean transition and animation classes */
.animate-fade-in {
  animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(20px) scale(0.96);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
</style>
