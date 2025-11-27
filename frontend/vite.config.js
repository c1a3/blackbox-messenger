import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // This is critical for simple-peer to find the stream implementation it expects
      'readable-stream': 'vite-compatible-readable-stream',
    },
  },
  define: {
    // Force simple-peer to see 'global' as the window object
    'global': 'window',
  },
})