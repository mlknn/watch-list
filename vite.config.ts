import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import {fileURLToPath} from 'node:url';
const hosted=process.env.WATCHLIST_CLOUDFLARE==='true';
// Local Node preview. Account data is stored in Supabase over HTTPS.
export default defineConfig({
  ssr: { external: hosted?[]:['@electric-sql/pglite'] },
  css: { postcss: { plugins: [tailwindcss()] } },
  optimizeDeps: { include: ['@base-ui/react/dialog', '@base-ui/react/alert-dialog', '@base-ui/react/select', '@base-ui/react/tabs'] },
  server: { host: '127.0.0.1', watch: { useFsEvents: false, usePolling: true } },
  plugins: [...(hosted?[{name:'watchlist-hosted-only',enforce:'pre' as const,resolveId(id:string){if(/(?:^|\/)local-(?:db|auth)\.mjs$/.test(id))return fileURLToPath(new URL('./server/hosted/local-disabled.mjs',import.meta.url));}}]:[]),vinext(), ...(hosted?[cloudflare({configPath:'wrangler.staging.jsonc',viteEnvironment:{name:'rsc',childEnvironments:['ssr']}})]:[sites()])],
});
