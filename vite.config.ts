
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import os from 'os';

const getLocalNetworkHost = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return undefined;
};

const hmrHost = process.env.VITE_HMR_HOST || getLocalNetworkHost();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve('.'),
    },
  },
  server: {
    host: true,
    ...(hmrHost ? { hmr: { host: hmrHost, protocol: 'ws' } } : {}),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
