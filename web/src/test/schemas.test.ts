import {
  aggregateCoinbaseTradesVolumes,
  coinbaseSnapshotTop50Volumes,
  normalizeBinanceTrade,
  normalizeCoinbaseFeedMessage,
  normalizeCoinbaseTicker,
  parseBinanceTickerClosePrice,
  parseCoinbaseLevel2Snapshot,
  parseCoinbaseTickerPrice,
  sumCoinbaseBookSide,
  unwrapBinanceWebSocketPayload,
} from '../data/schemas'
import { formatExchangePriceLabel } from '../ui/format'

describe('socket payload parsing', () => {
  test('normalizes binance trade payload', () => {
    const parsed = normalizeBinanceTrade({ p: '102000.50', q: '0.42', m: false })
    expect(parsed?.exchange).toBe('binance')
    expect(parsed?.price).toBe(102000.5)
    expect(parsed?.buyVolume).toBe(0.42)
    expect(parsed?.sellVolume).toBe(0)
  })

  test('normalizes binance combined-stream trade wrapper', () => {
    const wrapped = {
      stream: 'btcusdt@trade',
      data: {
        e: 'trade',
        E: 1,
        s: 'BTCUSDT',
        t: 1,
        p: '102000.50',
        q: '0.42',
        b: 1,
        a: 1,
        T: 1,
        m: false,
        M: true,
      },
    }
    expect(unwrapBinanceWebSocketPayload(wrapped)).toEqual(wrapped.data)
    const parsed = normalizeBinanceTrade(wrapped)
    expect(parsed?.exchange).toBe('binance')
    expect(parsed?.price).toBe(102000.5)
    expect(parsed?.buyVolume).toBe(0.42)
    expect(parsed?.sellVolume).toBe(0)
  })

  test('parses binance 24hrTicker close from combined stream', () => {
    const wrapped = {
      stream: 'btcusdt@ticker',
      data: {
        e: '24hrTicker',
        c: '99000.12',
        s: 'BTCUSDT',
      },
    }
    expect(unwrapBinanceWebSocketPayload(wrapped)).toEqual(wrapped.data)
    expect(parseBinanceTickerClosePrice(wrapped)).toBe(99000.12)
  })

  test('parses binance 24hrTicker close from flat payload', () => {
    const flat = { e: '24hrTicker', c: '100001' }
    expect(parseBinanceTickerClosePrice(flat)).toBe(100001)
  })

  test('coinbase ticker exposes price only (volumes zero in snapshot)', () => {
    const parsed = normalizeCoinbaseTicker({
      type: 'ticker',
      sequence: 1,
      product_id: 'BTC-USD',
      price: '101999.1',
      side: 'sell',
      last_size: '0.18',
    })
    expect(parsed?.exchange).toBe('coinbase')
    expect(parsed?.price).toBe(101999.1)
    expect(parsed?.buyVolume).toBe(0)
    expect(parsed?.sellVolume).toBe(0)
    expect(parseCoinbaseTickerPrice({ type: 'ticker', price: '101999.1' })).toBe(101999.1)
  })

  test('normalizes coinbase match payload', () => {
    const parsed = normalizeCoinbaseFeedMessage({
      type: 'match',
      trade_id: 1,
      maker_order_id: 'm',
      taker_order_id: 't',
      side: 'buy',
      size: '0.05',
      price: '102000',
      product_id: 'BTC-USD',
      sequence: 1,
      time: '2026-01-01T00:00:00.000000Z',
    })
    expect(parsed?.exchange).toBe('coinbase')
    expect(parsed?.buyVolume).toBe(0.05)
    expect(parsed?.sellVolume).toBe(0)
    expect(parsed?.price).toBe(102000)
  })

  test('sums coinbase level2 top of book like Android snapshot seeding', () => {
    const bids: [string, string][] = [
      ['100', '1'],
      ['99', '2'],
    ]
    const asks: [string, string][] = [['101', '3']]
    expect(sumCoinbaseBookSide(bids, 50)).toBe(3)
    expect(sumCoinbaseBookSide(asks, 50)).toBe(3)
    expect(coinbaseSnapshotTop50Volumes(bids, asks)).toEqual({ buyVolume: 3, sellVolume: 3 })
  })

  test('parses coinbase level2 snapshot', () => {
    const body = {
      type: 'snapshot',
      product_id: 'BTC-USD',
      bids: [
        ['100', '1.5'],
        ['99', '2'],
      ],
      asks: [['101', '0.5']],
    }
    const parsed = parseCoinbaseLevel2Snapshot(body)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      const v = coinbaseSnapshotTop50Volumes(parsed.data.bids, parsed.data.asks)
      expect(v.buyVolume).toBeCloseTo(3.5)
      expect(v.sellVolume).toBeCloseTo(0.5)
    }
  })

  test('aggregates Coinbase REST trades by side for tape fallback', () => {
    expect(
      aggregateCoinbaseTradesVolumes([
        { trade_id: 1, side: 'buy', size: '0.1', price: '100' },
        { trade_id: 2, side: 'sell', size: 0.2, price: '101' },
        { trade_id: 3, side: 'buy', size: 'not-a-number', price: '102' },
      ]),
    ).toEqual({ buyVolume: 0.1, sellVolume: 0.2 })
    expect(aggregateCoinbaseTradesVolumes(null)).toEqual({ buyVolume: 0, sellVolume: 0 })
    expect(aggregateCoinbaseTradesVolumes({})).toEqual({ buyVolume: 0, sellVolume: 0 })
  })
})

describe('formatExchangePriceLabel', () => {
  test('shows Unavailable when price is invalid', () => {
    expect(formatExchangePriceLabel(0)).toBe('Unavailable')
    expect(formatExchangePriceLabel(-1)).toBe('Unavailable')
  })

  test('formats last known positive price regardless of connection status', () => {
    expect(formatExchangePriceLabel(102000.5)).toBe('102,000.50')
  })
})
