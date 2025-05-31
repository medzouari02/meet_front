import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0', // Écouter sur toutes les interfaces
      port: 5173,
      // Autoriser tous les hôtes, y compris les URL ngrok dynamiques
      allowedHosts: ["d4ad-41-226-50-14.ngrok-free.app"],
 
      proxy: {
        '/api': {
          target: env.VITE_API_URL ,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/socket.io': {
          target: env.VITE_API_URL ,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});