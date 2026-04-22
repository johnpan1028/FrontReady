import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const isWindowsDriveWorkspace = /^\/mnt\/[a-z]\//i.test(process.cwd());

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
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: isWindowsDriveWorkspace ? {
        usePolling: true,
        interval: 120,
        binaryInterval: 300,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100,
        },
      } : undefined,
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
