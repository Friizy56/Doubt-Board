import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, Vite forwards API and WebSocket calls to the Express server,
// so the frontend can always use relative URLs like /api/...
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
