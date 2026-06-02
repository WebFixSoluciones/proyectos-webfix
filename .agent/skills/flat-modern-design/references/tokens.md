# Tokens de Diseño Plano y Moderno

Este documento contiene los estándares y variables de diseño CSS recomendados para la interfaz premium de este ERP.

## 1. Paleta de Colores Curada
Evitamos colores planos y de alto contraste en favor de mezclas elegantes basadas en HSL.

### Modo Oscuro (Predeterminado)
- **Fondo General**: `bg-[#0f0f11]`
- **Superficies/Card**: `bg-[#151517] border-white/5`
- **Inputs Glassmorphism**: `bg-black/25 border-white/10 text-white focus:border-blue-500/50`
- **Textos Primarios**: `text-white`
- **Textos Secundarios**: `text-gray-400`

### Modo Claro (Contraste Mejorado)
- **Fondo General**: `bg-[#f8f9fa]`
- **Superficies/Card**: `bg-white border-gray-200 text-gray-700`
- **Inputs**: `bg-white border-gray-300 text-gray-900 focus:border-blue-600`
- **Textos Primarios**: `text-gray-900`
- **Textos Secundarios**: `text-gray-600`

## 2. Micro-animaciones
- **Hover Transitions**: `transition-all duration-300 ease-in-out hover:-translate-y-0.5`
- **Fading / Steppers**: `animate-in fade-in slide-in-from-bottom-4 duration-500`
- **Active States**: Escalado sutil con `hover:scale-[1.02] active:scale-95`
- **Pulse Indicators**: Sutil pulsación para notificaciones o sincronización activa.

## 3. Elementos Premium
- **Bordes redondeados**: Uso de `rounded-2xl` y `rounded-3xl` para paneles interactivos.
- **Glassmorphism**: Efecto translúcido con `backdrop-blur-md bg-white/40 border-white/40 shadow-sm`.