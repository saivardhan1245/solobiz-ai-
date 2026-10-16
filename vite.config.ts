import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const projectRoot = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Detect hosted preview proxy or production mode
  const isHostedPreview = Boolean(process.env.APP_URL || process.env.DISABLE_HMR === 'true');
  const isProduction = mode === 'production' || process.env.NODE_ENV === 'production';
  const shouldDisableHmr = isHostedPreview || isProduction || process.env.DISABLE_HMR === 'true';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, '.'),
      },
    },
    server: {
      // Keep HMR enabled for local development. Disable when hosted in preview proxy without WebSocket support.
      hmr: shouldDisableHmr ? false : true,
      watch: shouldDisableHmr ? null : {},
    },
  };
});

