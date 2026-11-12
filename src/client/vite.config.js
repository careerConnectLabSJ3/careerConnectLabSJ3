import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  test: {
    include: ['tests/**/*.acceptance.test.{js,jsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setupTests.js',
  },
});
