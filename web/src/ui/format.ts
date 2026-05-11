export const formatElapsed = (elapsedMs: number): string => {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':')
}

/** Legacy numeric formatter (positive finite only). */
export const formatPrice = (value: number): string =>
  Number.isFinite(value) && value > 0 ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'

/**
 * Display string for an exchange last price.
 * Android `PriceDisplay` keeps showing the last non-null price even if the feed disconnects.
 */
export const formatExchangePriceLabel = (price: number): string => {
  if (!Number.isFinite(price) || price <= 0) return 'Unavailable'
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
