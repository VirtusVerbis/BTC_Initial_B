import { useEffect, useRef, useState } from 'react'
import type { BlockState } from '../data/blockHeight'
import type { FeedStatus } from '../data/marketData'
import type { MarketSnapshot, Mode } from '../game/types'
import { mobileAssetManifest } from './mobileAssetManifest'
import { resolveMobileAssetUrl } from './mobileAssetUrls'
import { formatElapsed, formatExchangePriceLabel } from './format'

interface OverlayProps {
  market: MarketSnapshot
  block: BlockState
  satoshiDamage: number
  lizardDamage: number
  satoshiMode: Mode
  lizardMode: Mode
  satoshiKoCount: number
  lizardKoCount: number
  onTimeClick: () => void
  status: {
    binance: FeedStatus
    coinbase: FeedStatus
  }
}

const exchangeMaxVolume = (buyVolume: number, sellVolume: number): number =>
  Math.max(buyVolume, sellVolume, 1)

const modeLabel = (mode: Mode): string => (mode === 'offense' ? 'Offense' : 'Defense')
const PRICE_GRAY = '#757575'
const PRICE_WHITE = '#ffffff'
const PRICE_GREEN = '#4caf50'
const PRICE_RED = '#f44336'
const PRICE_COLOR_HOLD_MS = 500

const isDirectionalPriceColor = (color: string): boolean => color === PRICE_GREEN || color === PRICE_RED

const priceColorFromMobileRule = (
  unavailable: boolean,
  currentPrice: number,
  previousPrice: number | undefined,
): string => {
  if (unavailable) return PRICE_GRAY
  if (previousPrice === undefined) return PRICE_WHITE
  if (currentPrice > previousPrice) return PRICE_GREEN
  if (currentPrice < previousPrice) return PRICE_RED
  return PRICE_WHITE
}

const deriveEffectiveStatus = (
  raw: FeedStatus,
  price: number,
  buyVolume: number,
  sellVolume: number,
): FeedStatus => {
  if (raw === 'connected' || raw === 'connecting') return raw
  const hasLiveData = (Number.isFinite(price) && price > 0) || buyVolume > 0 || sellVolume > 0
  return hasLiveData ? 'connected' : 'disconnected'
}

const FeedGlyph = ({ status }: { status: FeedStatus }) => {
  const on = status === 'connected'
  const color = on ? '#4caf50' : status === 'connecting' ? '#ffc107' : '#757575'
  return (
    <span className="feed-glyph" style={{ color }} title={status} aria-hidden>
      <svg className="feed-glyph-svg" viewBox="0 0 24 24" role="img" aria-label="wifi status">
        <path
          fill="currentColor"
          d="M12 18.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm0-2.8a5.9 5.9 0 0 1 4.2 1.8l1.3-1.4a7.8 7.8 0 0 0-11 0l1.3 1.4A5.9 5.9 0 0 1 12 15.7Zm0-4.4a10.2 10.2 0 0 1 7.3 3l1.3-1.4a12.1 12.1 0 0 0-17.2 0l1.3 1.4a10.2 10.2 0 0 1 7.3-3Zm0-4.4c-4 0-7.8 1.6-10.6 4.4L2.7 8.7a14.9 14.9 0 0 1 18.6 0l1.3-1.4A14.8 14.8 0 0 0 12 6.9Z"
        />
      </svg>
    </span>
  )
}

const VolumeBar = ({
  volume,
  maxVolume,
  color,
  alignEnd,
  animate,
}: {
  volume: number
  maxVolume: number
  color: string
  alignEnd: boolean
  animate: boolean
}) => {
  const p = maxVolume > 0 ? Math.min(1, volume / maxVolume) : 0
  const [pulse, setPulse] = useState(1)
  useEffect(() => {
    if (!animate) return
    setPulse(1.15)
    const t = window.setTimeout(() => setPulse(1), 300)
    return () => window.clearTimeout(t)
  }, [animate, volume])
  const w = Math.min(1, p * pulse)
  return (
    <div className={`volume-bar-track ${alignEnd ? 'volume-bar-track-end' : ''}`}>
      <div
        className="volume-bar-fill"
        style={{
          width: `${w * 100}%`,
          backgroundColor: color,
          marginLeft: alignEnd ? 'auto' : 0,
        }}
      />
    </div>
  )
}

const DamageBar = ({
  points,
  alignEnd,
}: {
  points: number
  alignEnd: boolean
}) => {
  const w = Math.min(1, points / 100)
  return (
    <div className={`volume-bar-track damage-bar-track ${alignEnd ? 'volume-bar-track-end' : ''}`}>
      <div
        className="volume-bar-fill damage-bar-fill"
        style={{ width: `${w * 100}%`, marginLeft: alignEnd ? 'auto' : 0 }}
      />
    </div>
  )
}

export const Overlay = ({
  market,
  block,
  satoshiDamage,
  lizardDamage,
  satoshiMode,
  lizardMode,
  satoshiKoCount,
  lizardKoCount,
  onTimeClick,
  status,
}: OverlayProps) => {
  const binanceMaxV = exchangeMaxVolume(market.binance.buyVolume, market.binance.sellVolume)
  const coinbaseMaxV = exchangeMaxVolume(market.coinbase.buyVolume, market.coinbase.sellVolume)
  const prevBinance = useRef<number | undefined>(undefined)
  const prevCoinbase = useRef<number | undefined>(undefined)
  const prevBinBuy = useRef<number | undefined>(undefined)
  const prevBinSell = useRef<number | undefined>(undefined)
  const prevCbBuy = useRef<number | undefined>(undefined)
  const prevCbSell = useRef<number | undefined>(undefined)

  const [binPulse, setBinPulse] = useState(false)
  const [cbPulse, setCbPulse] = useState(false)
  const [binanceDisplayColor, setBinanceDisplayColor] = useState<string>(PRICE_WHITE)
  const [coinbaseDisplayColor, setCoinbaseDisplayColor] = useState<string>(PRICE_WHITE)
  const binanceHoldUntilRef = useRef(0)
  const coinbaseHoldUntilRef = useRef(0)
  const binanceHoldTimerRef = useRef<number | null>(null)
  const coinbaseHoldTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const bBuy = market.binance.buyVolume
    const bSell = market.binance.sellVolume
    if (bBuy !== prevBinBuy.current || bSell !== prevBinSell.current) {
      setBinPulse(true)
      const t = window.setTimeout(() => setBinPulse(false), 320)
      prevBinBuy.current = bBuy
      prevBinSell.current = bSell
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [market.binance.buyVolume, market.binance.sellVolume])

  useEffect(() => {
    const cBuy = market.coinbase.buyVolume
    const cSell = market.coinbase.sellVolume
    if (cBuy !== prevCbBuy.current || cSell !== prevCbSell.current) {
      setCbPulse(true)
      const t = window.setTimeout(() => setCbPulse(false), 320)
      prevCbBuy.current = cBuy
      prevCbSell.current = cSell
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [market.coinbase.buyVolume, market.coinbase.sellVolume])

  const binPriceLabel = formatExchangePriceLabel(market.binance.price)
  const cbPriceLabel = formatExchangePriceLabel(market.coinbase.price)

  const effectiveBinStatus = deriveEffectiveStatus(
    status.binance,
    market.binance.price,
    market.binance.buyVolume,
    market.binance.sellVolume,
  )
  const effectiveCbStatus = deriveEffectiveStatus(
    status.coinbase,
    market.coinbase.price,
    market.coinbase.buyVolume,
    market.coinbase.sellVolume,
  )

  const pBin = market.binance.price
  const prevBin = prevBinance.current
  const binanceUnavailable = binPriceLabel === 'Unavailable'
  const binanceColor = priceColorFromMobileRule(binanceUnavailable, pBin, prevBin)

  const pCb = market.coinbase.price
  const prevCb = prevCoinbase.current
  const coinbaseUnavailable = cbPriceLabel === 'Unavailable'
  const coinbaseColor = priceColorFromMobileRule(coinbaseUnavailable, pCb, prevCb)

  useEffect(() => {
    if (binanceHoldTimerRef.current !== null) {
      window.clearTimeout(binanceHoldTimerRef.current)
      binanceHoldTimerRef.current = null
    }

    const now = Date.now()
    if (binanceColor === PRICE_GRAY) {
      binanceHoldUntilRef.current = 0
      setBinanceDisplayColor(PRICE_GRAY)
      return
    }

    if (isDirectionalPriceColor(binanceColor)) {
      binanceHoldUntilRef.current = now + PRICE_COLOR_HOLD_MS
      setBinanceDisplayColor(binanceColor)
      return
    }

    const remaining = binanceHoldUntilRef.current - now
    setBinanceDisplayColor((current) => {
      if (isDirectionalPriceColor(current) && remaining > 0) {
        binanceHoldTimerRef.current = window.setTimeout(() => {
          setBinanceDisplayColor((activeColor) => {
            if (isDirectionalPriceColor(activeColor) && Date.now() >= binanceHoldUntilRef.current) {
              return PRICE_WHITE
            }
            return activeColor
          })
          binanceHoldTimerRef.current = null
        }, remaining)
        return current
      }
      binanceHoldUntilRef.current = 0
      return binanceColor
    })
  }, [binanceColor])

  useEffect(() => {
    if (coinbaseHoldTimerRef.current !== null) {
      window.clearTimeout(coinbaseHoldTimerRef.current)
      coinbaseHoldTimerRef.current = null
    }

    const now = Date.now()
    if (coinbaseColor === PRICE_GRAY) {
      coinbaseHoldUntilRef.current = 0
      setCoinbaseDisplayColor(PRICE_GRAY)
      return
    }

    if (isDirectionalPriceColor(coinbaseColor)) {
      coinbaseHoldUntilRef.current = now + PRICE_COLOR_HOLD_MS
      setCoinbaseDisplayColor(coinbaseColor)
      return
    }

    const remaining = coinbaseHoldUntilRef.current - now
    setCoinbaseDisplayColor((current) => {
      if (isDirectionalPriceColor(current) && remaining > 0) {
        coinbaseHoldTimerRef.current = window.setTimeout(() => {
          setCoinbaseDisplayColor((activeColor) => {
            if (isDirectionalPriceColor(activeColor) && Date.now() >= coinbaseHoldUntilRef.current) {
              return PRICE_WHITE
            }
            return activeColor
          })
          coinbaseHoldTimerRef.current = null
        }, remaining)
        return current
      }
      coinbaseHoldUntilRef.current = 0
      return coinbaseColor
    })
  }, [coinbaseColor])

  useEffect(() => {
    if (!binanceUnavailable && Number.isFinite(pBin) && pBin > 0) {
      prevBinance.current = pBin
    }
  }, [binanceUnavailable, pBin])

  useEffect(() => {
    if (!coinbaseUnavailable && Number.isFinite(pCb) && pCb > 0) {
      prevCoinbase.current = pCb
    }
  }, [coinbaseUnavailable, pCb])

  useEffect(
    () => () => {
      if (binanceHoldTimerRef.current !== null) {
        window.clearTimeout(binanceHoldTimerRef.current)
      }
      if (coinbaseHoldTimerRef.current !== null) {
        window.clearTimeout(coinbaseHoldTimerRef.current)
      }
    },
    [],
  )

  const hudBg = mobileAssetManifest.hudBackground

  return (
    <div className="overlay">
      {hudBg ? (
        <img className="overlay-hud-bg" src={resolveMobileAssetUrl(hudBg)} alt="" draggable={false} />
      ) : null}
      <div className="overlay-row">
        <div className="overlay-column overlay-column-start">
          <p className="overlay-label">
            Binance <span className="overlay-ticker">(BTC-USDT)</span> <FeedGlyph status={effectiveBinStatus} />
          </p>
          <p className="overlay-price" style={{ color: binanceDisplayColor }}>
            {binanceUnavailable ? binPriceLabel : `$${binPriceLabel}`}
          </p>
          <VolumeBar
            volume={market.binance.buyVolume}
            maxVolume={binanceMaxV}
            color="#4caf50"
            alignEnd={false}
            animate={binPulse}
          />
          <VolumeBar
            volume={market.binance.sellVolume}
            maxVolume={binanceMaxV}
            color="#f44336"
            alignEnd={false}
            animate={binPulse}
          />
          <p className={`overlay-mode ${satoshiMode === 'defense' ? 'overlay-mode-defense' : 'overlay-mode-offense'}`}>
            {modeLabel(satoshiMode)}
          </p>
          <DamageBar points={satoshiDamage} alignEnd={false} />
          <p className="overlay-ko-count">{satoshiKoCount}</p>
        </div>
        <button className="time-button" type="button" onClick={onTimeClick}>
          <span className="overlay-label time-label">Time</span>
          <span className={`time-block-height ${block.blockFlashOn ? 'flash' : ''}`}>
            {block.blockHeight === null ? '—' : block.blockHeight}
          </span>
          <span className={`time-elapsed ${block.staleFlashOn ? 'flash' : 'subtle'}`}>{formatElapsed(block.elapsedMs)}</span>
        </button>
        <div className="overlay-column overlay-column-end">
          <p className="overlay-label overlay-label-end">
            Coinbase <span className="overlay-ticker">(BTC-USD)</span> <FeedGlyph status={effectiveCbStatus} />
          </p>
          <p className="overlay-price" style={{ color: coinbaseDisplayColor }}>
            {coinbaseUnavailable ? cbPriceLabel : `$${cbPriceLabel}`}
          </p>
          <VolumeBar
            volume={market.coinbase.buyVolume}
            maxVolume={coinbaseMaxV}
            color="#4caf50"
            alignEnd
            animate={cbPulse}
          />
          <VolumeBar
            volume={market.coinbase.sellVolume}
            maxVolume={coinbaseMaxV}
            color="#f44336"
            alignEnd
            animate={cbPulse}
          />
          <p className={`overlay-mode ${lizardMode === 'defense' ? 'overlay-mode-defense' : 'overlay-mode-offense'}`}>
            {modeLabel(lizardMode)}
          </p>
          <DamageBar points={lizardDamage} alignEnd />
          <p className="overlay-ko-count">{lizardKoCount}</p>
        </div>
      </div>
    </div>
  )
}
