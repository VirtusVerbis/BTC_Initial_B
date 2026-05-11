import { env } from '../config/env'
import type { ExchangeSnapshot, MarketSnapshot } from '../game/types'
import { EXCHANGE_EMIT_THROTTLE_MS, VOLUME_RESET_INTERVAL_MS } from './exchangeConstants'
import {
  aggregateCoinbaseTradesVolumes,
  binanceTradeSchema,
  normalizeCoinbaseMatch,
  parseBinanceTickerClosePrice,
  parseCoinbaseLevel2Snapshot,
  parseCoinbaseTickerPrice,
  unwrapBinanceWebSocketPayload,
} from './schemas'
import { SafeWebSocketClient } from './websocketClient'

export type FeedStatus = 'connecting' | 'connected' | 'disconnected'

export interface MarketFeedUpdate {
  market: MarketSnapshot
  status: {
    binance: FeedStatus
    coinbase: FeedStatus
  }
}

/**
 * REST polling fills gaps when WS does not deliver usable fields (e.g. price from ticker/bookTicker but no trades).
 * Per-exchange REST is skipped only when that exchange is WS-connected, has price, and buy+sell volume > 0.
 *
 * Coinbase HUD/boxing volumes are **tape-only** (WS `match` + REST recent trades), not L2 book depth — differs from
 * Android `WebSocketRepository` which seeds volumes from L2 snapshot top 50.
 */
const ENABLE_REST_FALLBACK = true
/** Mirror Android: direct exchange WebSockets from `BinanceWebSocketService` / `CoinbaseWebSocketService`. */
const USE_WEBSOCKET_TRANSPORT = true

const emptySnapshot = (exchange: 'binance' | 'coinbase'): ExchangeSnapshot => ({
  exchange,
  price: 0,
  buyVolume: 0,
  sellVolume: 0,
  updatedAt: 0,
})

export class MarketDataService {
  private market: MarketSnapshot = {
    binance: emptySnapshot('binance'),
    coinbase: emptySnapshot('coinbase'),
  }

  private status: MarketFeedUpdate['status'] = {
    binance: 'disconnected',
    coinbase: 'disconnected',
  }

  private latestBinancePrice = 0
  private latestCoinbasePrice = 0
  private binanceBuyAcc = 0
  private binanceSellAcc = 0
  private coinbaseBuyAcc = 0
  private coinbaseSellAcc = 0

  private emitTimer: number | null = null
  private resetTimer: number | null = null
  private fallbackTimer: number | null = null
  private lastBinancePollSuccessAt = 0
  private lastCoinbasePollSuccessAt = 0

  private readonly binanceClient = new SafeWebSocketClient({
    url: env.binanceWsUrl,
    onJsonMessage: (payload) => {
      this.applyBinancePayload(payload)
    },
    onStatus: (status) => {
      this.status = { ...this.status, binance: status }
    },
  })

  private readonly coinbaseClient = new SafeWebSocketClient({
    url: env.coinbaseWsUrl,
    onJsonMessage: (payload) => {
      this.applyCoinbasePayload(payload)
    },
    onOpen: (socket) => {
      const subscribe = {
        type: 'subscribe',
        product_ids: [env.coinbaseProductId],
        channels: ['ticker', 'level2', 'matches', 'heartbeats'],
      }
      socket.send(JSON.stringify(subscribe))
    },
    onStatus: (status) => {
      this.status = { ...this.status, coinbase: status }
    },
  })

  constructor(private readonly onUpdate: (update: MarketFeedUpdate) => void) {}

  private setStatus(exchange: 'binance' | 'coinbase', status: FeedStatus) {
    this.status = { ...this.status, [exchange]: status }
  }

  start() {
    if (USE_WEBSOCKET_TRANSPORT) {
      this.binanceClient.connect()
      this.coinbaseClient.connect()
    }
    if (this.emitTimer === null) {
      this.emitTimer = window.setInterval(() => this.pushSnapshot(), EXCHANGE_EMIT_THROTTLE_MS)
    }
    if (this.resetTimer === null) {
      this.resetTimer = window.setInterval(() => this.resetVolumeAccumulators(), VOLUME_RESET_INTERVAL_MS)
    }
    if (ENABLE_REST_FALLBACK && this.fallbackTimer === null) {
      this.fallbackTimer = window.setInterval(() => {
        void this.pollRestFallback()
      }, VOLUME_RESET_INTERVAL_MS)
      void this.pollRestFallback()
    }
  }

  stop() {
    if (this.emitTimer !== null) {
      window.clearInterval(this.emitTimer)
      this.emitTimer = null
    }
    if (this.resetTimer !== null) {
      window.clearInterval(this.resetTimer)
      this.resetTimer = null
    }
    if (this.fallbackTimer !== null) {
      window.clearInterval(this.fallbackTimer)
      this.fallbackTimer = null
    }
    if (USE_WEBSOCKET_TRANSPORT) {
      this.binanceClient.disconnect()
      this.coinbaseClient.disconnect()
    }
  }

  private resetVolumeAccumulators() {
    this.binanceBuyAcc = 0
    this.binanceSellAcc = 0
    this.coinbaseBuyAcc = 0
    this.coinbaseSellAcc = 0
  }

  private applyBinancePayload(payload: unknown) {
    const inner = unwrapBinanceWebSocketPayload(payload) as Record<string, unknown> | null
    if (!inner || typeof inner !== 'object') return
    const et = inner.e

    if (et === 'trade') {
      const parsed = binanceTradeSchema.safeParse(inner)
      if (!parsed.success) return
      const qty = parsed.data.q
      const isSell = parsed.data.m ?? false
      if (isSell) this.binanceSellAcc += qty
      else this.binanceBuyAcc += qty
      if (parsed.data.p > 0) this.latestBinancePrice = parsed.data.p
      return
    }

    if (et === '24hrTicker') {
      const px = parseBinanceTickerClosePrice(payload)
      if (px !== null) this.latestBinancePrice = px
      return
    }

    /** Android `BinanceBookTickerStream`: best bid `b` / best ask `a` (strings). */
    if (et === 'bookTicker') {
      const bid = Number(inner.b)
      const ask = Number(inner.a)
      if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0 && ask >= bid) {
        this.latestBinancePrice = (bid + ask) / 2
      }
    }
  }

  private applyCoinbasePayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') return
    const root = payload as Record<string, unknown>
    const type = root.type
    if (type === 'ticker') {
      const px = parseCoinbaseTickerPrice(payload)
      if (px !== null) this.latestCoinbasePrice = px
      return
    }
    if (type === 'snapshot') {
      const parsed = parseCoinbaseLevel2Snapshot(payload)
      if (!parsed.success) return
      if (parsed.data.product_id !== env.coinbaseProductId) return
      return
    }
    if (type === 'match') {
      const snap = normalizeCoinbaseMatch(payload)
      if (!snap) return
      if (root.product_id && root.product_id !== env.coinbaseProductId) return
      this.coinbaseBuyAcc += snap.buyVolume
      this.coinbaseSellAcc += snap.sellVolume
    }
  }

  private async pollRestFallback() {
    const binanceBase = import.meta.env.DEV ? '/binance-api' : env.binanceApiOrigin
    const coinbaseBase = import.meta.env.DEV ? '/coinbase-api' : 'https://api.exchange.coinbase.com'
    const now = Date.now()

    const skipBinanceRest =
      USE_WEBSOCKET_TRANSPORT &&
      ENABLE_REST_FALLBACK &&
      this.status.binance === 'connected' &&
      this.latestBinancePrice > 0 &&
      this.binanceBuyAcc + this.binanceSellAcc > 0

    const skipCoinbaseRest =
      USE_WEBSOCKET_TRANSPORT &&
      ENABLE_REST_FALLBACK &&
      this.status.coinbase === 'connected' &&
      this.latestCoinbasePrice > 0 &&
      this.coinbaseBuyAcc + this.coinbaseSellAcc > 0

    if (!skipBinanceRest) {
      if (this.status.binance === 'disconnected') this.setStatus('binance', 'connecting')
      try {
        const priceRes = await fetch(`${binanceBase}/api/v3/ticker/price?symbol=BTCUSDT`)
        if (priceRes.ok) {
          const body = (await priceRes.json()) as { price?: unknown }
          const p = Number(body?.price)
          if (Number.isFinite(p) && p > 0) this.latestBinancePrice = p
        }
        const tradesRes = await fetch(`${binanceBase}/api/v3/trades?symbol=BTCUSDT&limit=80`)
        if (tradesRes.ok) {
          const trades = (await tradesRes.json()) as Array<{ qty?: unknown; isBuyerMaker?: unknown }>
          let buy = 0
          let sell = 0
          for (const t of trades) {
            const q = Number(t?.qty)
            if (!Number.isFinite(q) || q <= 0) continue
            const isSell = t?.isBuyerMaker === true
            if (isSell) sell += q
            else buy += q
          }
          if (buy + sell > 0) {
            this.binanceBuyAcc = buy
            this.binanceSellAcc = sell
          }
        }
        if (this.latestBinancePrice > 0) {
          this.lastBinancePollSuccessAt = now
          this.setStatus('binance', 'connected')
        } else if (now - this.lastBinancePollSuccessAt > VOLUME_RESET_INTERVAL_MS * 3) {
          this.setStatus('binance', 'disconnected')
        }
      } catch {
        if (now - this.lastBinancePollSuccessAt > VOLUME_RESET_INTERVAL_MS * 3) {
          this.setStatus('binance', 'disconnected')
        }
      }
    }

    if (!skipCoinbaseRest) {
      if (this.status.coinbase === 'disconnected') this.setStatus('coinbase', 'connecting')
      try {
        const tickerRes = await fetch(`${coinbaseBase}/products/${encodeURIComponent(env.coinbaseProductId)}/ticker`)
        if (tickerRes.ok) {
          const body = (await tickerRes.json()) as { price?: unknown }
          const p = Number(body?.price)
          if (Number.isFinite(p) && p > 0) this.latestCoinbasePrice = p
        }
        const tradesRes = await fetch(
          `${coinbaseBase}/products/${encodeURIComponent(env.coinbaseProductId)}/trades?limit=80`,
        )
        if (tradesRes.ok) {
          const tradesJson: unknown = await tradesRes.json()
          const { buyVolume, sellVolume } = aggregateCoinbaseTradesVolumes(tradesJson)
          if (buyVolume + sellVolume > 0) {
            this.coinbaseBuyAcc = buyVolume
            this.coinbaseSellAcc = sellVolume
          }
        }
        if (this.latestCoinbasePrice > 0) {
          this.lastCoinbasePollSuccessAt = now
          this.setStatus('coinbase', 'connected')
        } else if (now - this.lastCoinbasePollSuccessAt > VOLUME_RESET_INTERVAL_MS * 3) {
          this.setStatus('coinbase', 'disconnected')
        }
      } catch {
        if (now - this.lastCoinbasePollSuccessAt > VOLUME_RESET_INTERVAL_MS * 3) {
          this.setStatus('coinbase', 'disconnected')
        }
      }
    }
  }

  private pushSnapshot() {
    const now = Date.now()
    this.market = {
      binance: {
        exchange: 'binance',
        price: this.latestBinancePrice,
        buyVolume: this.binanceBuyAcc,
        sellVolume: this.binanceSellAcc,
        updatedAt: now,
      },
      coinbase: {
        exchange: 'coinbase',
        price: this.latestCoinbasePrice,
        buyVolume: this.coinbaseBuyAcc,
        sellVolume: this.coinbaseSellAcc,
        updatedAt: now,
      },
    }
    this.onUpdate({ market: this.market, status: this.status })
  }
}
