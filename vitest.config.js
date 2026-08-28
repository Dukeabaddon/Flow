import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, 'backend/src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
});
