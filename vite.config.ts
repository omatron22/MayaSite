import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config() // fallback to .env
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Plugin that runs Vercel-style API routes during local dev
function apiRoutes(): Plugin {
  return {
    name: 'api-routes',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const query: Record<string, string> = {};
        for (const [key, value] of url.searchParams) {
          query[key] = value;
        }

        // Parse POST body if present
        let body: unknown = undefined;
        if (req.method === 'POST') {
          body = await new Promise<unknown>((resolve) => {
            let data = '';
            req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
            req.on('end', () => {
              try { resolve(JSON.parse(data)); } catch { resolve(data); }
            });
          });
        }

        // Route /api/path/segments to the correct handler file
        const segments = url.pathname.replace('/api/', '').split('/');
        let modulePath: string;

        if (segments[0] === 'map' && segments[1] === 'sites') {
          modulePath = './api/map/sites.ts';
        } else if (segments[0] === 'signs' && segments[1] === 'lookup') {
          modulePath = './api/signs/lookup.ts';
        } else if (segments.length === 2 && segments[1]) {
          // /api/signs/123, /api/blocks/456, /api/graphemes/789
          modulePath = `./api/${segments[0]}/[id].ts`;
          query.id = segments[1];
        } else if (segments.length === 1) {
          // /api/search, /api/stats, /api/concordance, /api/inference
          modulePath = `./api/${segments[0]}.ts`;
        } else {
          return next();
        }

        try {
          const mod = await server.ssrLoadModule(modulePath);
          const handler = mod.default;

          const mockReq = {
            method: req.method,
            query,
            headers: req.headers,
            url: req.url,
            body,
          };

          const mockRes = {
            statusCode: 200,
            _headers: {} as Record<string, string>,
            status(code: number) { this.statusCode = code; return this; },
            setHeader(key: string, value: string) { this._headers[key] = value; return this; },
            json(data: unknown) {
              res.writeHead(this.statusCode, {
                'Content-Type': 'application/json',
                ...this._headers,
              });
              res.end(JSON.stringify(data));
            },
          };

          await handler(mockReq, mockRes);
        } catch (err) {
          console.error('API route error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error', details: String(err) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [apiRoutes(), tailwindcss(), react()],

  build: {
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
        }
      }
    },
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true
  },

  server: {
    hmr: { overlay: true }
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts'],
  },

  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  }
})
