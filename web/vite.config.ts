import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/binance-api': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/binance-api/, ''),
      },
      '/coinbase-api': {
        target: 'https://api.exchange.coinbase.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/coinbase-api/, ''),
      },
      /** Optional same-origin WS proxy if you set `VITE_BINANCE_WS_URL` to `/ws-binance/...`. */
      '/ws-binance': {
        target: 'wss://stream.binance.com:9443',
        changeOrigin: true,
        ws: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ws-binance/, ''),
      },
    },
  },
})
