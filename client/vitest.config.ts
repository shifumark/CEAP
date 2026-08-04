import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom, not 'node' — PayrollPage.tsx (and anything else importing
    // api.ts) touches localStorage at module-load time, which only
    // exists with a browser-like global environment.
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
});
