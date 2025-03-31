import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'pwa-512x512.png', // Updated to include the new icon
        'apple-touch-icon.png',
        'masked-icon.svg',
        'apple-splash-640x1136.png',
        'apple-splash-750x1334.png',
        'apple-splash-828x1792.png',
        'apple-splash-1125x2436.png',
        'apple-splash-1242x2208.png',
        'apple-splash-1242x2688.png',
        'apple-splash-1536x2048.png',
        'apple-splash-1668x2224.png',
        'apple-splash-1668x2388.png',
        'apple-splash-2048x2732.png'
      ],
      manifest: {
        name: 'Pedal - Cycling Tracker',
        short_name: 'Pedal',
        description: 'Track your cycling adventures with Pedal',
        theme_color: '#2196F3',
        background_color: '#ffffff',
        display: 'fullscreen',
        display_override: ['standalone', 'fullscreen'],
        orientation: 'Portrait',
        platform: 'ios',
        launch_handler: {
          client_mode: ['focus-existing', 'auto']
        },
        iar: {
          enabled: true,
          resources: ['geolocation']
        },
        handle_links: "preferred",
        scope_extensions: [
          { "origin": "*.openstreetmap.org" }
        ],
        id: "com.pedal.app",
        categories: ['fitness', 'health', 'sports'],
        scope: '/',
        start_url: '/',
        prefer_related_applications: false,
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Updated purpose to include maskable
          },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/screenshot-1.png',
            sizes: '1170x2532',
            type: 'image/png',
            platform: 'narrow',
            label: 'Track your rides in real-time'
          },
          {
            src: '/screenshot-2.png',
            sizes: '1170x2532',
            type: 'image/png',
            platform: 'narrow',
            label: 'View your cycling statistics'
          }
        ],
        shortcuts: [
          {
            name: 'Start Ride',
            short_name: 'Ride',
            description: 'Start tracking a new ride',
            url: '/live',
            icons: [{ src: '/ride-icon-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'View Dashboard',
            short_name: 'Dashboard',
            description: 'View your cycling statistics',
            url: '/',
            icons: [{ src: '/dashboard-icon-192x192.png', sizes: '192x192' }]
          }
        ],
        additional_meta_tags: [
          {
            name: 'apple-mobile-web-app-capable',
            content: 'yes'
          },
          {
            name: 'apple-mobile-web-app-status-bar-style',
            content: 'black-translucent'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/], // Don't serve fallback for API routes
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      experimental: {
        includeAllowLocationAccess: true
      }
    })
  ],
  server: {
    headers: {
      'Feature-Policy': 'geolocation *',
      'Permissions-Policy': 'geolocation=*'
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
});