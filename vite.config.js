import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';

function flowTracePlugin() {
  const logFile = path.resolve(__dirname, '.flow-trace.ndjson');
  return {
    name: 'flow-trace',
    configureServer(server) {
      server.middlewares.use('/__flow-trace', (req, res, next) => {
        if (req.method !== 'POST') return next();
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          fs.appendFileSync(logFile, body.endsWith('\n') ? body : `${body}\n`);
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), flowTracePlugin()],
  root: 'frontend',
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, 'backend/src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@strudel/webaudio': path.resolve(__dirname, 'node_modules/@strudel/webaudio/dist/index.mjs'),
      '@strudel/core': path.resolve(__dirname, 'node_modules/@strudel/core'),
      superdough: path.resolve(__dirname, 'node_modules/superdough/dist/index.mjs'),
      soundfont2: path.resolve(__dirname, 'frontend/shims/soundfont2.js'),
    },
    // One sound map — avoid gm_* registering into a duplicate webaudio copy
    dedupe: [
      '@strudel/web',
      '@strudel/webaudio',
      '@strudel/core',
      '@strudel/soundfonts',
      'superdough',
    ],
  },
  optimizeDeps: {
    include: [
      '@strudel/web',
      '@strudel/webaudio',
      '@strudel/core',
      'soundfont2',
    ],
    // soundfonts re-exports webaudio names via export * from superdough.
    // Esbuild cannot see those when prebundling — skip optimize for this pkg.
    // One superdough singleton — prebundling it next to @strudel/web
    // created a second AudioContext (record was silent).
    exclude: ['superdough', '@strudel/soundfonts'],
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
