<script setup>
import { ref, reactive, onMounted } from 'vue';
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
  ChevronDown
} from 'lucide-vue-next';

// Active menu item
const activeMenu = ref('Dashboard');

// Search query
const searchQuery = ref('');

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

// Form values
const form = reactive({
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
  { id: 4, name: 'Distribuidora del Austro', ruc: '0103485721001', email: ' Austro@distribuidora.ec', category: 'Mayorista', status: 'Activo' },
  { id: 5, name: 'Carlos Alfredo Pérez', ruc: '1802948572001', email: 'carlos.perez@gmail.com', category: 'Frecuente', status: 'Activo' }
]);

const editClientIndex = ref(null);

const saveClient = () => {
  if (!form.clientName || !form.ruc) return;

  if (editClientIndex.value !== null) {
    // Edit existing
    clients.value[editClientIndex.value] = {
      ...clients.value[editClientIndex.value],
      name: form.clientName,
      ruc: form.ruc,
      email: form.email,
      category: form.category,
      status: form.status
    };
    editClientIndex.value = null;
  } else {
    // Add new
    clients.value.push({
      id: Date.now(),
      name: form.clientName,
      ruc: form.ruc,
      email: form.email,
      category: form.category,
      status: form.status
    });
  }

  // Reset form
  form.clientName = '';
  form.ruc = '';
  form.email = '';
  form.category = 'Frecuente';
  form.status = 'Activo';
};

const editClient = (index) => {
  editClientIndex.value = index;
  const client = clients.value[index];
  form.clientName = client.name;
  form.ruc = client.ruc;
  form.email = client.email;
  form.category = client.category;
  form.status = client.status;
};

const deleteClient = (index) => {
  clients.value.splice(index, 1);
};

// Modal visible state
const showThemeConfig = ref(false);

onMounted(() => {
  applyColors();
});
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-surface relative select-none">
    
    <!-- Organic blobs in background (Liquid Design Concept) -->
    <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-neutral-tint opacity-35 filter blur-3xl pointer-events-none"></div>
    <div class="absolute top-[40%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-primary-container opacity-[0.06] filter blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 left-[20%] w-[30rem] h-[30rem] rounded-full bg-neutral-tint opacity-20 filter blur-3xl pointer-events-none"></div>

    <!-- SIDEBAR (Deep Navy #070B18) -->
    <aside class="w-64 bg-deep-navy text-white flex flex-col z-10 shrink-0 select-none">
      <!-- Logo area -->
      <div class="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div class="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white font-bold text-lg">
          WF
        </div>
        <div>
          <h1 class="font-extrabold text-sm tracking-wider uppercase text-slate-100">WebFix Suite</h1>
          <span class="text-[10px] text-slate-400 font-mono">VUE PROTOTYPE</span>
        </div>
      </div>

      <!-- Navigation links -->
      <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        <button 
          @click="activeMenu = 'Dashboard'"
          :class="[
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-4',
            activeMenu === 'Dashboard' 
              ? 'bg-primary-container text-white border-primary' 
              : 'text-slate-400 hover:bg-slate-900 hover:text-white border-transparent'
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
              ? 'bg-primary-container text-white border-primary' 
              : 'text-slate-400 hover:bg-slate-900 hover:text-white border-transparent'
          ]"
        >
          <Users class="w-4.5 h-4.5" />
          Clientes
        </button>

        <button 
          @click="activeMenu = 'Documentos'"
          :class="[
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-4',
            activeMenu === 'Documentos' 
              ? 'bg-primary-container text-white border-primary' 
              : 'text-slate-400 hover:bg-slate-900 hover:text-white border-transparent'
          ]"
        >
          <FileText class="w-4.5 h-4.5" />
          Facturación
        </button>
      </nav>

      <!-- Bottom actions -->
      <div class="p-4 border-t border-slate-800 space-y-3">
        <div class="flex items-center gap-3 px-2 py-1">
          <div class="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm">
            US
          </div>
          <div class="overflow-hidden">
            <p class="text-xs font-semibold truncate text-slate-200">Administrador</p>
            <p class="text-[10px] text-slate-400 truncate">admin@webfix.com.ec</p>
          </div>
        </div>
        
        <button class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-red-950/30 hover:text-red-400 transition-colors">
          <LogOut class="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>

    <!-- MAIN BODY -->
    <main class="flex-1 flex flex-col overflow-hidden relative z-10">
      
      <!-- TOP HEADER -->
      <header class="h-16 border-b border-surface-high bg-surface-lowest/70 backdrop-blur-md flex items-center justify-between px-8 z-10">
        <div class="flex items-center gap-4">
          <h2 class="text-lg font-bold text-on-surface tracking-tight">{{ activeMenu }}</h2>
          <div class="h-4 w-px bg-slate-200"></div>
          <p class="text-xs text-on-surface-variant font-medium">Futuristic Precision Pure Theme</p>
        </div>

        <div class="flex items-center gap-4">
          <!-- Notification Circle -->
          <button class="w-9 h-9 rounded-lg bg-surface-low text-on-surface hover:bg-surface-high flex items-center justify-center transition-colors">
            <Bell class="w-4 h-4" />
          </button>

          <!-- Theme customizer button -->
          <button 
            @click="showThemeConfig = true"
            class="flex items-center gap-2 px-4 py-1.5 bg-primary-container text-white rounded-button text-xs font-semibold transition-colors hover:bg-primary"
          >
            <Palette class="w-3.5 h-3.5" />
            Configurar Paleta
          </button>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        
        <!-- DASHBOARD TAB CONTENT -->
        <div v-if="activeMenu === 'Dashboard'" class="space-y-8">
          <!-- STATS CARDS -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div class="bg-surface-lowest border border-surface-high rounded-card p-6 flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Clientes Activos</p>
                <h3 class="text-2xl font-extrabold text-on-surface mt-1">1,248</h3>
                <span class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">+12% este mes</span>
              </div>
            </div>

            <div class="bg-surface-lowest border border-surface-high rounded-card p-6 flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <DollarSign class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Facturado</p>
                <h3 class="text-2xl font-extrabold text-on-surface mt-1">$45,280</h3>
                <span class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">+8.4% vs prev</span>
              </div>
            </div>

            <div class="bg-surface-lowest border border-surface-high rounded-card p-6 flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <FileText class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Doc. Pendientes</p>
                <h3 class="text-2xl font-extrabold text-on-surface mt-1">18</h3>
                <span class="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full mt-1 inline-block">Requiere atención</span>
              </div>
            </div>

            <div class="bg-surface-lowest border border-surface-high rounded-card p-6 flex items-center gap-4">
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
            
            <!-- FORM CARD (Column Span 2) -->
            <div class="bg-surface-lowest border border-surface-high rounded-card p-6 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h4 class="font-bold text-on-surface text-base">Registrar Nuevo Cliente</h4>
                    <p class="text-xs text-on-surface-variant mt-0.5">Gestión de identidad fiscal y contacto</p>
                  </div>
                  <Info class="w-4.5 h-4.5 text-outline" />
                </div>

                <form @submit.prevent="saveClient" class="space-y-4">
                  <!-- Name Input -->
                  <div>
                    <label class="block text-xs font-semibold text-on-surface mb-1.5">Nombre / Razón Social</label>
                    <input 
                      v-model="form.clientName"
                      type="text" 
                      placeholder="Ej. Importadora S.A." 
                      class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                      required
                    />
                  </div>

                  <!-- RUC Input -->
                  <div>
                    <label class="block text-xs font-semibold text-on-surface mb-1.5">RUC / Cédula</label>
                    <input 
                      v-model="form.ruc"
                      type="text" 
                      placeholder="Ej. 1792837482001" 
                      class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                      required
                    />
                  </div>

                  <!-- Email Input -->
                  <div>
                    <label class="block text-xs font-semibold text-on-surface mb-1.5">Correo Electrónico</label>
                    <input 
                      v-model="form.email"
                      type="email" 
                      placeholder="correo@empresa.com" 
                      class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                    />
                  </div>

                  <!-- Row for Category & Status -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-on-surface mb-1.5">Categoría</label>
                      <select 
                        v-model="form.category"
                        class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all appearance-none cursor-pointer"
                      >
                        <option>Corporativo</option>
                        <option>Frecuente</option>
                        <option>Mayorista</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-on-surface mb-1.5">Estado</label>
                      <select 
                        v-model="form.status"
                        class="w-full h-10 px-3 bg-input-bg border border-transparent rounded-input text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all appearance-none cursor-pointer"
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
                  @click="editClientIndex = null; form.clientName = ''; form.ruc = ''; form.email = '';"
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

            <!-- TABLE CARD (Column Span 3) -->
            <div class="bg-surface-lowest border border-surface-high rounded-card p-6 lg:col-span-3 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h4 class="font-bold text-on-surface text-base">Clientes Registrados</h4>
                    <p class="text-xs text-on-surface-variant mt-0.5">Listado de contribuyentes ingresados</p>
                  </div>
                  
                  <!-- Small Search Input -->
                  <div class="relative w-48">
                    <input 
                      v-model="searchQuery"
                      type="text" 
                      placeholder="Buscar RUC o Nombre..." 
                      class="w-full h-8 pl-8 pr-3 bg-input-bg border border-transparent rounded-input text-xs text-on-surface focus:outline-none focus:border-primary-container transition-all"
                    />
                    <Search class="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <!-- HIGH-DENSITY ZEBRA TABLE -->
                <div class="overflow-x-auto border border-surface-high rounded-lg">
                  <table class="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr class="bg-deep-navy text-white font-semibold uppercase tracking-wider text-[10px]">
                        <th class="py-3 px-4">Contribuyente</th>
                        <th class="py-3 px-4">RUC</th>
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
                        class="hover:bg-primary/5 odd:bg-surface-lowest even:bg-surface-low transition-colors"
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
                              'px-2 py-0.5 rounded text-[10px] font-bold inline-block',
                              client.status === 'Activo' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
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
                              title="Editar"
                            >
                              <Edit class="w-3.5 h-3.5" />
                            </button>
                            <button 
                              @click="deleteClient(index)"
                              class="w-7 h-7 rounded-lg hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                              title="Eliminar"
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

              <!-- Pagination / Stats -->
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

        <!-- OTHER TABS (Fallback) -->
        <div v-else class="bg-surface-lowest border border-surface-high rounded-card p-12 text-center max-w-xl mx-auto space-y-4">
          <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Layers class="w-8 h-8" />
          </div>
          <h3 class="text-xl font-bold text-on-surface">Pestaña {{ activeMenu }} en Construcción</h3>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            Este prototipo está enfocado en la aplicación del sistema de diseño y la paleta de colores. El módulo seleccionado se encuentra configurado para interactuar con la misma base visual.
          </p>
          <button 
            @click="activeMenu = 'Dashboard'"
            class="px-5 py-2 bg-primary text-white rounded-button text-xs font-bold hover:bg-primary-container transition-colors"
          >
            Regresar al Dashboard
          </button>
        </div>

      </div>
    </main>

    <!-- PALETTE CONFIGURATION MODAL -->
    <div 
      v-if="showThemeConfig" 
      class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        class="bg-surface-lowest border border-surface-high rounded-card w-full max-w-lg overflow-hidden flex flex-col animate-slide-up"
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
