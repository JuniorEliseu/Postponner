import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      manifest: {
        name: 'Postponer',
        short_name: 'Postponer',
        description: 'Gerenciador de Tarefas Offline e Local-First',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 10485760
      }
    })
  ]
});
