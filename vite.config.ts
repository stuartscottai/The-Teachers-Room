
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './', // Ensures assets are loaded relatively, fixing sandbox path issues
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve('.'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'lucide-react',
        '@google/genai',
        '@supabase/supabase-js',
        'three',
        'three-stdlib',
        '@react-three/fiber',
        '@react-three/drei',
        'maath'
      ]
    }
  },
});
