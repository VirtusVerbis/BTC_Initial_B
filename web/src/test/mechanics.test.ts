import type { FighterState, MarketSnapshot } from '../game/types'
import {
  applyDamage,
  createEmptyLastPunchUsedAt,
  defenseBlocksPunch,
  deriveLizardRingMode,
  deriveSatoshiRingMode,
  getHandRatiosFromHistoricalMax,
  nextAttackIfAvailable,
  pickDefenseType,
  pickPunchType,
  pickPunchTypeFromPercent,
  resolveDefenseTypeWithCooldown,
  selectDualHandPunch,
} from '../game/mechanics'

describe('mechanics thresholds', () => {
  test('maps punch threshold bands correctly', () => {
    expect(pickPunchType(10)).toBe('jab')
    expect(pickPunchType(34)).toBe('body')
    expect(pickPunchType(50)).toBe('hook')
    expect(pickPunchType(79)).toBe('cross')
    expect(pickPunchType(95)).toBe('uppercut')
  })

  test('maps defense thresholds correctly', () => {
    expect(pickDefenseType(0.6, 0.3)).toBe('headBlock')
    expect(pickDefenseType(0.32, 0.2)).toBe('bodyBlock')
    expect(pickDefenseType(0.14, 0.0)).toBe('dodgeLeft')
    expect(pickDefenseType(0.0, 0.17)).toBe('dodgeRight')
  })

  test('returns none when either defense side has invalid ratio', () => {
    expect(pickDefenseType(null, 0.2)).toBe('none')
    expect(pickDefenseType(0.2, null)).toBe('none')
  })

  test('defense rules match attack family', () => {
    expect(defenseBlocksPunch('headBlock', 'uppercut', 'left')).toBe(true)
    expect(defenseBlocksPunch('bodyBlock', 'hook', 'right')).toBe(true)
    expect(defenseBlocksPunch('dodgeRight', 'jab', 'left')).toBe(true)
    expect(defenseBlocksPunch('dodgeLeft', 'body', 'right')).toBe(true)
    expect(defenseBlocksPunch('bodyBlock', 'uppercut', 'left')).toBe(false)
  })

  test('damage accumulation uses expected points', () => {
    expect(applyDamage(0, 'jab')).toBe(1)
    expect(applyDamage(92, 'uppercut')).toBe(100)
  })

  test('selectDualHandPunch prefers priority hand when both ready', () => {
    expect(selectDualHandPunch('jab', 'hook', 'right')).toEqual({ hand: 'right', punchType: 'hook' })
    expect(selectDualHandPunch('jab', 'hook', 'left')).toEqual({ hand: 'left', punchType: 'jab' })
  })

  test('selectDualHandPunch returns single available hand', () => {
    expect(selectDualHandPunch('body', null, 'right')).toEqual({ hand: 'left', punchType: 'body' })
    expect(selectDualHandPunch(null, 'cross', 'right')).toEqual({ hand: 'right', punchType: 'cross' })
    expect(selectDualHandPunch(null, null, 'right')).toBeNull()
  })

  test('pickPunchTypeFromPercent returns null for empty hand', () => {
    expect(pickPunchTypeFromPercent(null)).toBeNull()
    expect(pickPunchTypeFromPercent(0)).toBeNull()
  })

  test('ring modes use Binance imbalance only', () => {
    const m = (bBuy: number, bSell: number): MarketSnapshot => ({
      binance: { exchange: 'binance', price: 1, buyVolume: bBuy, sellVolume: bSell, updatedAt: 0 },
      coinbase: { exchange: 'coinbase', price: 1, buyVolume: 999, sellVolume: 0, updatedAt: 0 },
    })
    expect(deriveSatoshiRingMode(m(10, 5))).toBe('offense')
    expect(deriveSatoshiRingMode(m(3, 20))).toBe('defense')
    expect(deriveLizardRingMode(m(10, 5))).toBe('defense')
    expect(deriveLizardRingMode(m(3, 20))).toBe('offense')
  })

  test('resolveDefenseTypeWithCooldown keeps previous type inside cooldown', () => {
    expect(resolveDefenseTypeWithCooldown('bodyBlock', 'headBlock', 0, 500)).toBe('headBlock')
    expect(resolveDefenseTypeWithCooldown('bodyBlock', 'headBlock', 0, 1200)).toBe('bodyBlock')
  })

  test('historical-max normalization mirrors mobile behavior', () => {
    expect(getHandRatiosFromHistoricalMax(50, 20, 100, 40)).toEqual({ leftRatio: 0.5, rightRatio: 0.5 })
    expect(getHandRatiosFromHistoricalMax(0, 20, 100, 40)).toEqual({ leftRatio: null, rightRatio: 0.5 })
    expect(getHandRatiosFromHistoricalMax(10, 20, 0, 40)).toEqual({ leftRatio: null, rightRatio: 0.5 })
  })

  const fighterBase = (over: Partial<FighterState> = {}): FighterState => ({
    name: 'satoshi',
    mode: 'offense',
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
    ...over,
  })

  test('nextAttackIfAvailable uses per-punch cooldown from lastPunchUsedAt', () => {
    const f = fighterBase({
      lastPunchUsedAt: { ...createEmptyLastPunchUsedAt(), jab: 5000 },
    })
    expect(nextAttackIfAvailable(f, 5800, 0.1)).toBeNull()
    expect(nextAttackIfAvailable(f, 6000, 0.1)).toBe('jab')
  })

  test('nextAttackIfAvailable returns null when hand has no volume', () => {
    const f = fighterBase()
    expect(nextAttackIfAvailable(f, 1000, null)).toBeNull()
  })
})
