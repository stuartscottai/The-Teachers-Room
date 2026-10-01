
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const hmrHost = process.env.VITE_HMR_HOST;
const outDir = 'dist';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve('.'),
    },
  },
  optimizeDeps: {
    // Scan the app entry only, not saved HTML reports or browser artifacts.
    entries: ['index.html'],
    // Prepare the browser dependencies together before the first page loads.
    // Late discovery can otherwise replace shared React chunks mid-navigation,
    // leaving React and its renderer using different instances on a cold start.
    include: [
      'react', 'react-dom', 'react-dom/client',
      'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-router-dom',
      '@marsidev/react-turnstile', '@react-three/fiber', '@react-three/drei',
      'framer-motion', 'lucide-react', 'qrcode.react',
      '@google/genai', '@supabase/supabase-js', '@remotion/whisper-web',
      'jsonrepair', 'mammoth', 'three',
      'three/examples/jsm/environments/RoomEnvironment.js',
    ],
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  server: {
    host: true,
    allowedHosts: ['local.theteachersroom.test'],
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), geolocation=()',
    },
    ...(hmrHost ? { hmr: { host: hmrHost, protocol: 'ws' } } : {}),
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), geolocation=()',
    },
  },
  build: {
    outDir,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
