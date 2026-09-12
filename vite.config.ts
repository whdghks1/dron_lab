import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'build',
    sourcemap: true,
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.includes('osm-snapshot.json')) return 'hongjecheon-data';
        },
      },
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
