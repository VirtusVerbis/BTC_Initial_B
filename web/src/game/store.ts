import { create } from 'zustand'
import { MAX_DAMAGE_POINTS } from '../config/constants'
import {
  applyDamage,
  computeKoLockUntil,
  createEmptyLastPunchUsedAt,
  gateDefenseAfterLeavingDefense,
  getHandRatiosFromHistoricalMax,
  pickDefenseType,
  resolveDefenseTypeWithCooldown,
  deriveLizardRingMode,
  deriveSatoshiRingMode,
} from './mechanics'
import { damageAnimationDurationMs, DAMAGE_COMPLETION_SAFETY_TIMEOUT_MS } from './damageSprites'
import type { AttackEvent, FighterState, MarketSnapshot, PunchSequence } from './types'

interface GameState {
  satoshi: FighterState
  lizard: FighterState
  lastAttack: AttackEvent | null
  /** At most one punch sequence at a time (wind-up → impact → recovery). */
  activePunchSequence: PunchSequence | null
  alignCharacters: boolean
  /** KOs scored by Satoshi (Lizard knocked out). Mirrors Android `satoshiKOCount`. */
  satoshiKoCount: number
  /** KOs scored by Lizard (Satoshi knocked out). Mirrors Android `lizardKOCount`. */
  lizardKoCount: number
  maxBinanceBuyVolume: number
  maxCoinbaseBuyVolume: number
  maxBinanceSellVolume: number
  maxCoinbaseSellVolume: number
  applyMarketTick: (market: MarketSnapshot, ts?: number) => void
  advanceCombat: (ts?: number) => void
  toggleCharacterAlignment: () => void
  resetDamage: () => void
}

const createFighter = (name: FighterState['name']): FighterState => ({
  name,
  mode: 'defense',
  defenseType: 'none',
  pose: 'idle',
  damagePoints: 0,
  koLockedUntil: 0,
  lastPunchUsedAt: createEmptyLastPunchUsedAt(),
  damageAnim: null,
  defenseStripStartTs: null,
  defenseCommittedAt: 0,
  defenseReenterNotBefore: 0,
  pendingDamageAfterDefense: null,
})

const nextPose = (fighter: FighterState, ts: number): FighterState['pose'] => {
  if (ts >= fighter.koLockedUntil) {
    return fighter.mode === 'offense' ? 'attacking' : fighter.mode === 'defense' ? 'defending' : 'idle'
  }

  const fallEndsAt = fighter.koLockedUntil - (5000 + 4600)
  const knockedDownEndsAt = fighter.koLockedUntil - 4600
  if (ts < fallEndsAt) {
    return 'fall'
  }
  if (ts < knockedDownEndsAt) {
    return 'knockedDown'
  }
  return 'rise'
}

const clearDamageAnimIfDone = (f: FighterState, ts: number): FighterState => {
  if (!f.damageAnim) return f
  const dur = damageAnimationDurationMs(f.name, f.damageAnim.punchType, f.damageAnim.hand)
  const end = f.damageAnim.startTs + dur
  if (ts >= end || ts >= f.damageAnim.startTs + DAMAGE_COMPLETION_SAFETY_TIMEOUT_MS) {
    return { ...f, damageAnim: null }
  }
  return f
}

const stepFighterFromMarket = (
  prev: FighterState,
  mode: FighterState['mode'],
  rawDefenseFromPercents: FighterState['defenseType'],
  ts: number,
): FighterState => {
  const { defense: gated, reenterNotBefore } = gateDefenseAfterLeavingDefense(
    mode,
    rawDefenseFromPercents,
    prev.mode,
    ts,
    prev.defenseReenterNotBefore,
  )
  const effective = resolveDefenseTypeWithCooldown(gated, prev.defenseType, prev.defenseCommittedAt, ts)
  const defenseCommittedAt = effective === prev.defenseType ? prev.defenseCommittedAt : ts

  let defenseStripStartTs = prev.defenseStripStartTs
  if (mode === 'defense' && effective !== 'none') {
    if (prev.mode !== 'defense' || prev.defenseType !== effective || prev.defenseStripStartTs === null) {
      defenseStripStartTs = ts
    }
  } else {
    defenseStripStartTs = null
  }

  return {
    ...prev,
    mode,
    defenseType: effective,
    defenseCommittedAt,
    defenseReenterNotBefore: reenterNotBefore,
    defenseStripStartTs,
    pose: nextPose({ ...prev, mode }, ts),
  }
}

const applyKoFromDamage = (
  fighter: FighterState,
  ts: number,
  damageAfter: number,
): { fighter: FighterState; scoredKo: 'satoshi' | 'lizard' | null } => {
  if (damageAfter < MAX_DAMAGE_POINTS) {
    return { fighter: { ...fighter, damagePoints: damageAfter }, scoredKo: null }
  }
  const koFighter: FighterState = {
    ...fighter,
    damagePoints: 0,
    koLockedUntil: computeKoLockUntil(ts),
    pose: 'fall',
    damageAnim: null,
    pendingDamageAfterDefense: null,
  }
  return {
    fighter: koFighter,
    scoredKo: fighter.name === 'lizard' ? 'satoshi' : 'lizard',
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  satoshi: createFighter('satoshi'),
  lizard: createFighter('lizard'),
  lastAttack: null,
  activePunchSequence: null,
  alignCharacters: false,
  satoshiKoCount: 0,
  lizardKoCount: 0,
  maxBinanceBuyVolume: 0,
  maxCoinbaseBuyVolume: 0,
  maxBinanceSellVolume: 0,
  maxCoinbaseSellVolume: 0,

  /** Bull Run port: combat simulation disabled; overlay uses market-driven modes only. */
  advanceCombat: () => {},

  applyMarketTick: (market, ts = Date.now()) => {
    const current = get()
    const maxBinanceBuyVolume =
      market.binance.buyVolume > 0
        ? Math.max(current.maxBinanceBuyVolume, market.binance.buyVolume)
        : current.maxBinanceBuyVolume
    const maxCoinbaseBuyVolume =
      market.coinbase.buyVolume > 0
        ? Math.max(current.maxCoinbaseBuyVolume, market.coinbase.buyVolume)
        : current.maxCoinbaseBuyVolume
    const maxBinanceSellVolume =
      market.binance.sellVolume > 0
        ? Math.max(current.maxBinanceSellVolume, market.binance.sellVolume)
        : current.maxBinanceSellVolume
    const maxCoinbaseSellVolume =
      market.coinbase.sellVolume > 0
        ? Math.max(current.maxCoinbaseSellVolume, market.coinbase.sellVolume)
        : current.maxCoinbaseSellVolume

    const buyRatios = getHandRatiosFromHistoricalMax(
      market.binance.buyVolume,
      market.coinbase.buyVolume,
      maxBinanceBuyVolume,
      maxCoinbaseBuyVolume,
    )
    const sellRatios = getHandRatiosFromHistoricalMax(
      market.binance.sellVolume,
      market.coinbase.sellVolume,
      maxBinanceSellVolume,
      maxCoinbaseSellVolume,
    )

    let satoshi = clearDamageAnimIfDone(current.satoshi, ts)
    let lizard = clearDamageAnimIfDone(current.lizard, ts)
    let satoshiKoCount = current.satoshiKoCount
    let lizardKoCount = current.lizardKoCount

    const applyPendingOpen = (def: FighterState): FighterState => {
      const p = def.pendingDamageAfterDefense
      if (!p || ts < p.applyAt) return def
      const without = { ...def, pendingDamageAfterDefense: null }
      const nextPts = applyDamage(without.damagePoints, p.punchType)
      const { fighter: after, scoredKo } = applyKoFromDamage(without, ts, nextPts)
      if (scoredKo === 'satoshi') satoshiKoCount += 1
      if (scoredKo === 'lizard') lizardKoCount += 1
      if (scoredKo) return after
      return {
        ...after,
        damageAnim: { hand: p.hand, punchType: p.punchType, startTs: ts },
      }
    }

    satoshi = applyPendingOpen(satoshi)
    lizard = applyPendingOpen(lizard)

    satoshi = stepFighterFromMarket(
      satoshi,
      deriveSatoshiRingMode(market),
      pickDefenseType(buyRatios.leftRatio, buyRatios.rightRatio),
      ts,
    )

    lizard = stepFighterFromMarket(
      lizard,
      deriveLizardRingMode(market),
      pickDefenseType(sellRatios.leftRatio, sellRatios.rightRatio),
      ts,
    )

    const lastAttack: AttackEvent | null = null
    const activePunchSequence: PunchSequence | null = null

    set({
      satoshi,
      lizard,
      lastAttack,
      activePunchSequence,
      satoshiKoCount,
      lizardKoCount,
      maxBinanceBuyVolume,
      maxCoinbaseBuyVolume,
      maxBinanceSellVolume,
      maxCoinbaseSellVolume,
    })
  },

  toggleCharacterAlignment: () => {
    set((state) => ({ alignCharacters: !state.alignCharacters }))
  },

  resetDamage: () => {
    set((state) => ({
      satoshi: {
        ...state.satoshi,
        damagePoints: 0,
        damageAnim: null,
        pendingDamageAfterDefense: null,
      },
      lizard: {
        ...state.lizard,
        damagePoints: 0,
        damageAnim: null,
        pendingDamageAfterDefense: null,
      },
    }))
  },
}))
