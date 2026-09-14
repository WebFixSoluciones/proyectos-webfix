import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node-forge') || id.includes('xml-crypto') || id.includes('xmldom')) {
              return 'vendor-crypto';
            }
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
          }
        }
      }
    }
  },
  server: {
    proxy: {
      // Proxy para la API de CipherByte (evitar CORS en desarrollo)
      '/api/cipherbyte': {
        target: 'https://aggregator.cipherbyte.ec',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cipherbyte/, ''),
        secure: false,
      },
      // Proxy para el SRI (evitar CORS en desarrollo)
      '/api/sri': {
        target: 'https://srienlinea.sri.gob.ec',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sri/, ''),
        secure: false,
      },
      // Proxy para WebServices de Recepción/Autorización del SRI de Producción
      '/api/sri-ws-prod': {
        target: 'https://cel.sri.gob.ec',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sri-ws-prod/, ''),
        secure: false,
      },
      // Proxy para WebServices de Recepción/Autorización del SRI de Pruebas
      '/api/sri-ws-pruebas': {
        target: 'https://celcer.sri.gob.ec',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sri-ws-pruebas/, ''),
        secure: false,
      }
    }
  }
})
