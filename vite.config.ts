import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
// Local Node preview. Account data is stored in Supabase over HTTPS.
export default defineConfig({
  ssr: { external: ['@electric-sql/pglite'] },
  css: { postcss: { plugins: [tailwindcss()] } },
  optimizeDeps: { include: ['@base-ui/react/dialog', '@base-ui/react/alert-dialog', '@base-ui/react/select', '@base-ui/react/tabs'] },
  server: { host: '127.0.0.1', watch: { useFsEvents: false, usePolling: true } },
  plugins: [vinext(), sites()],
});
