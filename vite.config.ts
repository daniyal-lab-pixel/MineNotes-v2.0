import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/.edge-*/**', '**/screenshots/**']
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'textures/*', 'fonts/*', 'icons/*.png'],
      manifest: {
        name: 'MineNotes',
        short_name: 'MineNotes',
        description: 'Authentic Minecraft Book & Quill notes application. Crafted by Daniyal.',
        theme_color: '#191919',
        background_color: '#191919',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ttf,woff,woff2,otf,jpg,jpeg}']
      }
    })
  ]
});
