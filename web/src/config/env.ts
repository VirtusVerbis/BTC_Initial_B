const BINANCE_STREAMS_PATH = 'stream?streams=btcusdt@trade/btcusdt@ticker/btcusdt@bookTicker'

const resolveBinanceWsUrl = (): string => {
  const override = import.meta.env.VITE_BINANCE_WS_URL as string | undefined
  if (override) return override
  /** Same combined stream as Android `BinanceWebSocketService` (direct WSS, no proxy). */
  return `wss://stream.binance.com:9443/${BINANCE_STREAMS_PATH}`
}

const resolveCoinbaseWsUrl = (): string => {
  const override = import.meta.env.VITE_COINBASE_WS_URL as string | undefined
  if (override) return override
  /** Keep Coinbase direct; Binance proxy is the path currently showing upstream aborts. */
  return 'wss://ws-feed.exchange.coinbase.com'
}

export const env = {
  get binanceWsUrl() {
    return resolveBinanceWsUrl()
  },
  get coinbaseWsUrl() {
    return resolveCoinbaseWsUrl()
  },
  coinbaseProductId: import.meta.env.VITE_COINBASE_PRODUCT_ID ?? 'BTC-USD',
  mempoolTipUrl:
    import.meta.env.VITE_MEMPOOL_TIP_URL ??
    'https://mempool.space/api/blocks/tip/height',
  /**
   * Binance REST origin for klines (Android `WebSocketRepository` / `CryptoApiService` use production API).
   * Dev: prefer Vite proxy `/binance-api`. Prod: may require same-origin proxy if CORS blocks the browser.
   */
  binanceApiOrigin:
    (import.meta.env.VITE_BINANCE_API_ORIGIN as string | undefined) ?? 'https://api.binance.com',
}
