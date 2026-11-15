import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const src = path('./src');

// The Worker reads the SPA shell through the ASSETS binding (for /g/:code).
// Tests don't run a Vite build, so serve the source index.html instead.
const testAssets = path('./.wrangler/test-assets');

export default defineConfig({
  test: {
    projects: [
      // Frontend unit tests (pure TS, run in Node).
      {
        resolve: { alias: { '@': src } },
        test: { name: 'app', include: ['src/**/*.test.ts'], environment: 'node' },
      },
      // Worker integration tests, run inside workerd with local D1 + bindings.
      {
        plugins: [
          cloudflareTest(async () => {
            mkdirSync(testAssets, { recursive: true });
            copyFileSync(path('./index.html'), `${testAssets}/index.html`);
            return {
              wrangler: { configPath: './wrangler.jsonc' },
              miniflare: {
                assets: { directory: testAssets, binding: 'ASSETS' },
                bindings: { TEST_MIGRATIONS: await readD1Migrations(path('./migrations')) },
              },
            };
          }),
        ],
        test: {
          name: 'worker',
          include: ['worker/**/*.test.ts'],
          setupFiles: ['./worker/test/apply-migrations.ts'],
        },
      },
    ],
  },
});
