import { z } from 'zod'
import type { ExchangeSnapshot } from '../game/types'

const numberFromUnknown = z.preprocess((value) => {
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return value
}, z.number().finite())

/** Binance `m` / isBuyerMaker: treat common wire variants as boolean. */
const binanceIsBuyerMaker = z.preprocess((value) => {
  if (value === true || value === 1 || value === 'true') return true
  if (value === false || value === 0 || value === 'false') return false
  return value
}, z.boolean().optional())

export const binanceTradeSchema = z.object({
  e: z.literal('trade').optional(),
  p: numberFromUnknown,
  q: numberFromUnknown,
  m: binanceIsBuyerMaker,
})

export const binanceTickerCloseSchema = z.object({
  e: z.literal('24hrTicker').optional(),
  c: numberFromUnknown,
})

export const coinbaseTickerSchema = z.object({
  type: z.literal('ticker'),
  product_id: z.string().optional(),
  sequence: z.number().optional(),
  price: numberFromUnknown,
  last_size: numberFromUnknown.optional(),
  side: z.enum(['buy', 'sell']).optional(),
})

export const coinbaseMatchSchema = z.object({
  type: z.literal('match'),
  price: numberFromUnknown,
  size: numberFromUnknown,
  side: z.enum(['buy', 'sell']),
  product_id: z.string().optional(),
})

const l2PriceSizeRow = z
  .array(z.union([z.string(), z.number()]))
  .refine((row) => row.length >= 2, 'level2 row')
  .transform((row) => [String(row[0]), String(row[1])] as [string, string])

export const coinbaseLevel2SnapshotSchema = z.object({
  type: z.literal('snapshot'),
  product_id: z.string(),
  bids: z.array(l2PriceSizeRow),
  asks: z.array(l2PriceSizeRow),
})

export const normalizedExchangeSchema = z.object({
  exchange: z.enum(['binance', 'coinbase']),
  price: z.number().finite(),
  buyVolume: z.number().nonnegative(),
  sellVolume: z.number().nonnegative(),
  updatedAt: z.number().int(),
})

export type NormalizedExchange = z.infer<typeof normalizedExchangeSchema>

/**
 * Combined-stream envelopes (`stream` + `data`) from
 * `.../stream?streams=btcusdt@trade/...` — same shape as Android `BinanceWebSocketService`.
 * Single-stream `/ws/btcusdt@trade` sends a flat object; return it unchanged.
 */
export const unwrapBinanceWebSocketPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object') return payload
  const root = payload as Record<string, unknown>
  const data = root.data
  if (!data || typeof data !== 'object') return payload
  const inner = data as Record<string, unknown>
  const et = inner.e
  if (et === 'trade' || et === '24hrTicker' || et === 'bookTicker') return data
  return payload
}

export const normalizeBinanceTrade = (payload: unknown): ExchangeSnapshot | null => {
  const parsed = binanceTradeSchema.safeParse(unwrapBinanceWebSocketPayload(payload))
  if (!parsed.success) {
    return null
  }
  const isSell = parsed.data.m ?? false
  const tradeVolume = parsed.data.q
  return {
    exchange: 'binance',
    price: parsed.data.p,
    buyVolume: isSell ? 0 : tradeVolume,
    sellVolume: isSell ? tradeVolume : 0,
    updatedAt: Date.now(),
  }
}

/** Last price from 24hr ticker close `c` (Android `BinanceTickerStream`). */
export const parseBinanceTickerClosePrice = (payload: unknown): number | null => {
  const inner = unwrapBinanceWebSocketPayload(payload)
  const parsed = binanceTickerCloseSchema.safeParse(inner)
  if (!parsed.success || parsed.data.c <= 0) return null
  return parsed.data.c
}

/** Coinbase ticker updates **price only** (HUD volumes: WS `match` + REST trades aggregate; not order-book depth). */
export const parseCoinbaseTickerPrice = (payload: unknown): number | null => {
  const parsed = coinbaseTickerSchema.safeParse(payload)
  if (!parsed.success || parsed.data.price <= 0) return null
  return parsed.data.price
}

export const normalizeCoinbaseTicker = (payload: unknown): ExchangeSnapshot | null => {
  const parsed = coinbaseTickerSchema.safeParse(payload)
  if (!parsed.success) {
    return null
  }
  return {
    exchange: 'coinbase',
    price: parsed.data.price,
    buyVolume: 0,
    sellVolume: 0,
    updatedAt: Date.now(),
  }
}

export const normalizeCoinbaseMatch = (payload: unknown): ExchangeSnapshot | null => {
  const parsed = coinbaseMatchSchema.safeParse(payload)
  if (!parsed.success) {
    return null
  }
  const volume = parsed.data.size
  const buyVolume = parsed.data.side === 'buy' ? volume : 0
  const sellVolume = parsed.data.side === 'sell' ? volume : 0
  return {
    exchange: 'coinbase',
    price: parsed.data.price,
    buyVolume,
    sellVolume,
    updatedAt: Date.now(),
  }
}

export const normalizeCoinbaseFeedMessage = (payload: unknown): ExchangeSnapshot | null =>
  normalizeCoinbaseMatch(payload) ?? normalizeCoinbaseTicker(payload)

const TOP_LEVELS = 50

/** Sum base-asset size on top `limit` bid (buy) or ask (sell) levels — matches Android `WebSocketRepository` snapshot seeding. */
export const sumCoinbaseBookSide = (levels: [string, string][], limit: number): number => {
  let sum = 0
  for (let i = 0; i < Math.min(limit, levels.length); i += 1) {
    const sz = Number(levels[i]?.[1])
    if (Number.isFinite(sz) && sz > 0) sum += sz
  }
  return sum
}

export const coinbaseSnapshotTop50Volumes = (
  bids: [string, string][],
  asks: [string, string][],
): { buyVolume: number; sellVolume: number } => ({
  buyVolume: sumCoinbaseBookSide(bids, TOP_LEVELS),
  sellVolume: sumCoinbaseBookSide(asks, TOP_LEVELS),
})

export const parseCoinbaseLevel2Snapshot = (payload: unknown) => coinbaseLevel2SnapshotSchema.safeParse(payload)

/** One row from `GET /products/{id}/trades` (Coinbase Exchange REST). */
const coinbaseRestTradeRowSchema = z
  .object({
    side: z.enum(['buy', 'sell']),
    size: z.union([z.string(), z.number()]),
  })
  .passthrough()

export const coinbaseTradesResponseSchema = z.array(coinbaseRestTradeRowSchema)

/**
 * Sum executed size by taker `side` over a Coinbase Exchange `trades` JSON array.
 * Used for REST fallback tape volumes (mirrors Binance recent-trades replacement pattern).
 */
export const aggregateCoinbaseTradesVolumes = (raw: unknown): { buyVolume: number; sellVolume: number } => {
  const parsed = coinbaseTradesResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return { buyVolume: 0, sellVolume: 0 }
  }
  let buyVolume = 0
  let sellVolume = 0
  for (const row of parsed.data) {
    const q = typeof row.size === 'string' ? Number(row.size) : row.size
    if (!Number.isFinite(q) || q <= 0) continue
    if (row.side === 'buy') buyVolume += q
    else sellVolume += q
  }
  return { buyVolume, sellVolume }
}
