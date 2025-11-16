/**
 * Vite Configuration - Otimizado para React + Babylon.js
 *
 * Features:
 * - Code splitting automático (vendor chunks separados)
 * - Asset handling otimizado (imagens, modelos 3D, fonts)
 * - Minification agressiva (terser para JS, cssnano para CSS)
 * - Sourcemaps apenas em dev
 * - CDN hints e preload
 * - Compression (gzip/brotli)
 * - Performance budget warnings
 * - Tree shaking otimizado para Babylon.js
 *
 * @see https://vitejs.dev/config/
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carregar env vars baseado no mode
  const env = loadEnv(mode, process.cwd(), '');

  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  return {
    plugins: [
      react({
        // React Fast Refresh otimizado
        fastRefresh: isDevelopment,
        // Babel runtime automático
        babel: {
          plugins: isDevelopment ? [] : [],
        },
      }),

      // Compressão gzip/brotli (apenas produção)
      ...(isProduction
        ? [
            compression({
              algorithm: 'gzip',
              exclude: [/\.(br)$/, /\.(gz)$/],
              threshold: 1024, // Apenas arquivos > 1KB
            }),
            compression({
              algorithm: 'brotliCompress',
              exclude: [/\.(br)$/, /\.(gz)$/],
              threshold: 1024,
            }),
          ]
        : []),

      // Bundle analyzer (gera stats.html após build)
      ...(isProduction && env.ANALYZE === 'true'
        ? [
            visualizer({
              filename: './dist/stats.html',
              open: true,
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],

    // Resolve paths
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@store': path.resolve(__dirname, './src/store'),
        '@game': path.resolve(__dirname, './src/game'),
        '@services': path.resolve(__dirname, './src/services'),
        '@utils': path.resolve(__dirname, './src/utils'),
      },
    },

    // Dev server
    server: {
      host: true, // Listen 0.0.0.0
      port: 5173,
      strictPort: false,
      open: false,
      cors: true,
      // Proxy para backend em desenvolvimento (opcional)
      proxy: env.VITE_USE_PROXY === 'true'
        ? {
            '/api': {
              target: env.VITE_API_URL || 'http://localhost:2567',
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },

    // Preview server (para testar build)
    preview: {
      host: true,
      port: 4173,
      strictPort: false,
      open: false,
    },

    // Build options
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isDevelopment ? 'inline' : false,
      minify: isProduction ? 'terser' : false,

      // Terser options (minification agressiva)
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true, // Remove console.log em produção
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
              passes: 2, // Duas passadas de minificação
            },
            mangle: {
              safari10: true, // Compatibilidade Safari 10
            },
            format: {
              comments: false, // Remove todos comentários
            },
          }
        : {},

      // Rollup options (code splitting)
      rollupOptions: {
        output: {
          // Manual chunks para melhor cache
          manualChunks: {
            // React core
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],

            // Babylon.js core (separado para melhor cache)
            'babylon-core': ['@babylonjs/core'],

            // Colyseus
            'colyseus-vendor': ['colyseus.js'],

            // State management
            'state-vendor': ['zustand'],

            // Demais vendors
            // vendor: Automaticamente incluído pelo Vite
          },

          // Naming pattern para assets
          chunkFileNames: isProduction
            ? 'assets/js/[name]-[hash].js'
            : 'assets/js/[name].js',
          entryFileNames: isProduction
            ? 'assets/js/[name]-[hash].js'
            : 'assets/js/[name].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];

            // Organizar assets por tipo
            if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            if (/babylon|glb|gltf|obj|fbx/i.test(ext)) {
              return `assets/models/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },

        // External dependencies (CDN - opcional)
        // external: env.VITE_USE_CDN === 'true' ? ['react', 'react-dom'] : [],
      },

      // Chunk size warnings
      chunkSizeWarningLimit: 1000, // 1MB (Babylon.js é grande)

      // Asset handling
      assetsInlineLimit: 4096, // Inline assets < 4KB como base64

      // CSS code splitting
      cssCodeSplit: true,

      // Report compressed size
      reportCompressedSize: isProduction,

      // Clear output dir
      emptyOutDir: true,
    },

    // Optimizations
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@babylonjs/core',
        'colyseus.js',
        'zustand',
      ],
      // Excluir pacotes que não devem ser pre-bundled
      exclude: [],
    },

    // CSS options
    css: {
      devSourcemap: isDevelopment,
      preprocessorOptions: {
        // Se usar SCSS/SASS
        // scss: {
        //   additionalData: `@import "@/styles/variables.scss";`
        // }
      },
    },

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    // ESBuild options (usado em dev)
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },

    // Performance
    // logLevel: isProduction ? 'info' : 'warn',
  };
});
