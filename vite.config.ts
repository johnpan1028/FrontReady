import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const manualChunks = (id: string) => {
  if (!id.includes('node_modules')) return undefined;

  if (id.includes('/@xyflow/') || id.includes('/react-grid-layout/') || id.includes('/react-resizable/') || id.includes('/react-draggable/')) {
    return 'vendor-editor';
  }

  if (id.includes('/lucide-react/')) {
    return 'vendor-icons';
  }

  if (id.includes('/@supabase/') || id.includes('/@google/') || id.includes('/dexie/')) {
    return 'vendor-data';
  }

  if (id.includes('/react-day-picker/')) {
    return 'vendor-calendar';
  }

  return undefined;
};

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), checker({ typescript: true })],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
});
