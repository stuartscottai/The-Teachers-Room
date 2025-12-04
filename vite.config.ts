
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
