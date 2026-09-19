import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function localApiPlugin() {
  return {
    name: 'local-api-endpoints',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/send-email' || url === '/api/send-email/') {
          if (req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  req.body = body ? JSON.parse(body) : {};
                  const { default: handler } = await import('./api/send-email/index.js');
                  if (!res.status) {
                    res.status = (code) => {
                      res.statusCode = code;
                      return res;
                    };
                  }
                  if (!res.json) {
                    res.json = (data) => {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                      return res;
                    };
                  }
                  if (!res.send) {
                    res.send = (text) => {
                      res.end(text);
                      return res;
                    };
                  }
                  await handler(req, res);
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (err) {
              next(err);
            }
            return;
          }
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin()],
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 2500
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
