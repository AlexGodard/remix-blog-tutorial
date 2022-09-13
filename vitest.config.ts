/// <reference types="vitest" />
/// <reference types="vite/client" />

// eslint-disable-next-line node/no-unpublished-import,import/no-extraneous-dependencies
import react from '@vitejs/plugin-react';
// eslint-disable-next-line node/no-unpublished-import,import/no-extraneous-dependencies
import { defineConfig } from 'vite';
// eslint-disable-next-line node/no-unpublished-import,import/no-extraneous-dependencies
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup-test-env.ts'],
  },
});
