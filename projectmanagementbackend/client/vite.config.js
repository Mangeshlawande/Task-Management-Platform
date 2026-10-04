import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Backend port comes from the backend's real .env (PORT=8000).
// Override with API_PROXY_TARGET when the backend runs elsewhere.
const backend =
  process.env.API_PROXY_TARGET || 'http://localhost:8000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Same-origin via proxy → httpOnly cookie auth "just works"
      // (no CORS, SameSite=strict passes).
      '/api': { target: backend, changeOrigin: true },
      '/images': { target: backend, changeOrigin: true }, // task attachment files
    },
  },
});
