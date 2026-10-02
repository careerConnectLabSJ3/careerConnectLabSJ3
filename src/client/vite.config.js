import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/login': 'http://localhost:3000',
      '/register': 'http://localhost:3000',
      '/logout': 'http://localhost:3000',
      '/dashboard': 'http://localhost:3000',
      '/profile': 'http://localhost:3000',
      '/jobSeeker_dashboard': 'http://localhost:3000',
      '/recruiter_dashboard': 'http://localhost:3000'
    }
  }
});
