import {
  DEFENSE_BODY_BLOCK_MAX,
  DEFENSE_BODY_BLOCK_MIN,
  DEFENSE_DODGE_LEFT_MAX,
  DEFENSE_DODGE_LEFT_MIN,
  DEFENSE_DODGE_RIGHT_MAX,
  DEFENSE_DODGE_RIGHT_MIN,
  DEFENSE_HEAD_BLOCK_MAX,
  DEFENSE_HEAD_BLOCK_MIN,
  KO_SEQUENCE_MS,
  MAX_DAMAGE_POINTS,
  PUNCH_COOLDOWNS_MS,
  PUNCH_DAMAGE,
  VOLUME_PERCENT_BODY_MAX,
  VOLUME_PERCENT_BODY_MIN,
  VOLUME_PERCENT_CROSS_MAX,
  VOLUME_PERCENT_CROSS_MIN,
  VOLUME_PERCENT_HOOK_MAX,
  VOLUME_PERCENT_HOOK_MIN,
  VOLUME_PERCENT_JAB_MAX,
  VOLUME_PERCENT_JAB_MIN,
  VOLUME_PERCENT_UPPERCUT_MAX,
  VOLUME_PERCENT_UPPERCUT_MIN,
} from '../config/constants'
import { MIN_IDLE_AFTER_DEFENSE_MS } from '../ui/androidMirrorConstants'
import type {
  DefenseType,
  FighterState,
  Hand,
  MarketSnapshot,
  Mode,
  PunchType,
} from './types'

/** Initial map for `FighterState.lastPunchUsedAt` (epoch = never used). */
export const createEmptyLastPunchUsedAt = (): Record<PunchType, number> => ({
  jab: 0,
  body: 0,
  hook: 0,
  cross: 0,
  uppercut: 0,
})

/** Android `getPunchTypeFromVolume`: null when no positive volume or max. */
export const pickPunchTypeFromPercent = (percent: number | null): PunchType | null =>
  pickPunchTypeFromRatio(percent === null ? null : percent / 100)

export const pickPunchTypeFromRatio = (ratio: number | null): PunchType | null => {
  if (ratio === null || ratio <= 0) return null
  if (ratio >= VOLUME_PERCENT_UPPERCUT_MIN && ratio <= VOLUME_PERCENT_UPPERCUT_MAX) return 'uppercut'
  if (ratio >= VOLUME_PERCENT_CROSS_MIN && ratio <= VOLUME_PERCENT_CROSS_MAX) return 'cross'
  if (ratio >= VOLUME_PERCENT_HOOK_MIN && ratio <= VOLUME_PERCENT_HOOK_MAX) return 'hook'
  if (ratio >= VOLUME_PERCENT_BODY_MIN && ratio <= VOLUME_PERCENT_BODY_MAX) return 'body'
  if (ratio >= VOLUME_PERCENT_JAB_MIN && ratio <= VOLUME_PERCENT_JAB_MAX) return 'jab'
  return null
}

export const pickPunchType = (percent: number): PunchType => pickPunchTypeFromPercent(percent) ?? 'jab'

export const pickDefenseType = (
  binanceBuyRatio: number | null,
  coinbaseBuyRatio: number | null,
): DefenseType => {
  if (binanceBuyRatio === null || coinbaseBuyRatio === null) return 'none'
  const highest = Math.max(binanceBuyRatio, coinbaseBuyRatio)
  if (highest >= DEFENSE_HEAD_BLOCK_MIN && highest <= DEFENSE_HEAD_BLOCK_MAX) {
    return 'headBlock'
  }
  if (highest >= DEFENSE_BODY_BLOCK_MIN && highest <= DEFENSE_BODY_BLOCK_MAX) {
    return 'bodyBlock'
  }
  if (binanceBuyRatio >= DEFENSE_DODGE_LEFT_MIN && binanceBuyRatio <= DEFENSE_DODGE_LEFT_MAX) {
    return 'dodgeLeft'
  }
  if (coinbaseBuyRatio >= DEFENSE_DODGE_RIGHT_MIN && coinbaseBuyRatio <= DEFENSE_DODGE_RIGHT_MAX) {
    return 'dodgeRight'
  }
  return 'none'
}

const DEFENSE_SWITCH_COOLDOWN_MS: Record<Exclude<DefenseType, 'none'>, number> = {
  headBlock: 1000,
  bodyBlock: 1000,
  dodgeLeft: 1000,
  dodgeRight: 1000,
}

/** Android: keep previous defense type if still inside its cooldown when raw type changes. */
export const resolveDefenseTypeWithCooldown = (
  raw: DefenseType,
  effective: DefenseType,
  defenseCommittedAt: number,
  ts: number,
): DefenseType => {
  if (raw === effective) return effective
  if (effective !== 'none' && ts - defenseCommittedAt < DEFENSE_SWITCH_COOLDOWN_MS[effective]) {
    return effective
  }
  return raw
}

/** Android: after leaving defense mode, suppress non-`none` defense briefly while still in offense. */
export const gateDefenseAfterLeavingDefense = (
  mode: Mode,
  rawDefense: DefenseType,
  prevMode: Mode,
  ts: number,
  prevReenterNotBefore: number,
): { defense: DefenseType; reenterNotBefore: number } => {
  let reenterNotBefore = prevReenterNotBefore
  if (prevMode === 'defense' && mode === 'offense') {
    reenterNotBefore = ts + MIN_IDLE_AFTER_DEFENSE_MS
  }
  if (mode === 'offense' && rawDefense !== 'none' && ts < reenterNotBefore) {
    return { defense: 'none', reenterNotBefore }
  }
  return { defense: rawDefense, reenterNotBefore }
}

export const defenseBlocksPunch = (
  defenseType: DefenseType,
  punchType: PunchType,
  hand: Hand,
): boolean => {
  if (punchType === 'uppercut') {
    return defenseType === 'headBlock'
  }
  if (punchType === 'hook' || punchType === 'cross') {
    return defenseType === 'bodyBlock'
  }
  if (hand === 'left') {
    return defenseType === 'dodgeRight'
  }
  return defenseType === 'dodgeLeft'
}

export const deriveFighterMode = (buyVolume: number, sellVolume: number): Mode =>
  buyVolume > sellVolume ? 'offense' : 'defense'

/** Satoshi ring mode: Binance buy vs sell only (Android `isBinanceDefense` gate). */
export const deriveSatoshiRingMode = (market: MarketSnapshot): Mode =>
  deriveFighterMode(market.binance.buyVolume, market.binance.sellVolume)

/** Lizard ring mode: opposite of Binance imbalance (Android `isLizardDefense = !isBinanceDefense`). */
export const deriveLizardRingMode = (market: MarketSnapshot): Mode =>
  deriveFighterMode(market.binance.sellVolume, market.binance.buyVolume)

export interface HandPercents {
  leftPercent: number | null
  rightPercent: number | null
}

export interface HandRatios {
  leftRatio: number | null
  rightRatio: number | null
}

const toPercent = (value: number, maxValue: number): number => {
  if (maxValue <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((value / maxValue) * 100)))
}

const ratioFromHistoricalMax = (value: number, maxValue: number): number | null => {
  if (value <= 0 || maxValue <= 0) return null
  const ratio = value / maxValue
  return Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : null
}

/**
 * Mobile parity: normalize each hand against its own historical exchange max
 * (not against the current tick's largest hand).
 */
export const getHandRatiosFromHistoricalMax = (
  leftVolume: number,
  rightVolume: number,
  leftHistoricalMax: number,
  rightHistoricalMax: number,
): HandRatios => ({
  leftRatio: ratioFromHistoricalMax(leftVolume, leftHistoricalMax),
  rightRatio: ratioFromHistoricalMax(rightVolume, rightHistoricalMax),
})

export const getHandPercents = (market: MarketSnapshot, volumeType: 'buy' | 'sell'): HandPercents => {
  const binanceVolume = volumeType === 'buy' ? market.binance.buyVolume : market.binance.sellVolume
  const coinbaseVolume =
    volumeType === 'buy' ? market.coinbase.buyVolume : market.coinbase.sellVolume
  const maxVolume = Math.max(binanceVolume, coinbaseVolume)
  if (maxVolume <= 0) {
    return { leftPercent: null, rightPercent: null }
  }
  return {
    leftPercent: binanceVolume > 0 ? toPercent(binanceVolume, maxVolume) : null,
    rightPercent: coinbaseVolume > 0 ? toPercent(coinbaseVolume, maxVolume) : null,
  }
}

/** Pick which hand/punch to execute when left/right exchange percents yield independent types (Satoshi buy-side, Lizard sell-side). */
export const selectDualHandPunch = (
  left: PunchType | null,
  right: PunchType | null,
  priorityHand: Hand,
): { hand: Hand; punchType: PunchType } | null => {
  if (left === null && right === null) return null
  if (left !== null && right !== null) {
    if (priorityHand === 'right') return { hand: 'right', punchType: right }
    return { hand: 'left', punchType: left }
  }
  if (left !== null) return { hand: 'left', punchType: left }
  return { hand: 'right', punchType: right as PunchType }
}

export const nextAttackIfAvailable = (
  fighter: FighterState,
  ts: number,
  handRatio: number | null,
): PunchType | null => {
  if (ts < fighter.koLockedUntil) {
    return null
  }
  const punchType = pickPunchTypeFromRatio(handRatio)
  if (punchType === null) return null
  const cooldown = PUNCH_COOLDOWNS_MS[punchType]
  const lastUsed = fighter.lastPunchUsedAt[punchType]
  if (lastUsed > 0 && ts - lastUsed < cooldown) {
    return null
  }
  return punchType
}

export const applyDamage = (currentDamage: number, punchType: PunchType): number =>
  Math.min(MAX_DAMAGE_POINTS, currentDamage + PUNCH_DAMAGE[punchType])

export const computeKoLockUntil = (ts: number): number =>
  ts + KO_SEQUENCE_MS.fall + KO_SEQUENCE_MS.knockedDown + KO_SEQUENCE_MS.rise
