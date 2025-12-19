// vite.config.ts (simplified alternative)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build optimizations
  build: {
    // Target modern browsers for smaller bundles
    target: 'esnext',
    
    // Enable minification (uses esbuild by default, which is faster)
    minify: 'esbuild',
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'db-vendor': ['@libsql/client'],
        }
      }
    },
    
    // Source maps for debugging (disable in production for smaller size)
    sourcemap: false,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Report compressed size
    reportCompressedSize: true
  },
  
  // Development server optimizations
  server: {
    hmr: {
      overlay: true
    }
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@libsql/client', 'recharts'],
    exclude: []
  },
  
  // Esbuild options for console removal in production
  esbuild: {
    drop: ['console', 'debugger'],
  }
})
