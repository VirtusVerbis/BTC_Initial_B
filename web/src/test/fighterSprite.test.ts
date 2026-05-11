import { describe, expect, it } from 'vitest'
import { createEmptyLastPunchUsedAt } from '../game/mechanics'
import type { AttackEvent, FighterState } from '../game/types'
import {
  audienceFile,
  bothFightersIdleForBobbing,
  pickFighterSpriteFile,
  ringFile,
} from '../ui/fighterSprite'

const fighter = (over: Partial<FighterState>): FighterState => ({
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

describe('fighterSprite', () => {
  it('picks idle Satoshi frame', () => {
    const f = pickFighterSpriteFile('satoshi', 'idle', 'offense', 'none', null, null, null, false, 0)
    expect(f).toMatch(/^satoshi_ready_\d\.png$/)
  })

  it('resolves audience and ring assets', () => {
    expect(audienceFile(3, 1)).toBe('audience_1_r3.png')
    expect(ringFile(0)).toBe('ring_0.png')
  })

  it('bothFightersIdleForBobbing is false when either shows punch sprite', () => {
    const last: AttackEvent = {
      attacker: 'satoshi',
      hand: 'left',
      punchType: 'jab',
      landed: true,
      ts: 1,
    }
    const sat = fighter({ name: 'satoshi', pose: 'attacking' })
    const liz = fighter({ name: 'lizard', pose: 'idle' })
    expect(bothFightersIdleForBobbing(sat, liz, last)).toBe(false)
  })

  it('bothFightersIdleForBobbing is false when either shows block/dodge', () => {
    const sat = fighter({ name: 'satoshi', mode: 'defense', defenseType: 'headBlock', pose: 'defending' })
    const liz = fighter({ name: 'lizard', pose: 'idle' })
    expect(bothFightersIdleForBobbing(sat, liz, null)).toBe(false)
  })

  it('bothFightersIdleForBobbing is true when both on idle loop', () => {
    const sat = fighter({ name: 'satoshi', mode: 'offense', pose: 'attacking', defenseType: 'none' })
    const liz = fighter({ name: 'lizard', mode: 'offense', pose: 'attacking', defenseType: 'none' })
    expect(bothFightersIdleForBobbing(sat, liz, null)).toBe(true)
  })

  it('pickFighterSpriteFile shows damage strip when damageAnim set', () => {
    const f = pickFighterSpriteFile(
      'lizard',
      'defending',
      'defense',
      'bodyBlock',
      { hand: 'left', punchType: 'jab', startTs: 0 },
      0,
      null,
      false,
      40,
    )
    expect(f).toBe('lizard_left_small_head_dmg_0.png')
  })

  it('forces idle when opponent is in KO even if fighter is attacking', () => {
    const last: AttackEvent = {
      attacker: 'satoshi',
      hand: 'left',
      punchType: 'cross',
      landed: false,
      ts: 0,
      startedTs: 0,
    }
    const f = pickFighterSpriteFile(
      'satoshi',
      'attacking',
      'offense',
      'none',
      null,
      null,
      last,
      true,
      80,
    )
    expect(f).toMatch(/^satoshi_ready_\d\.png$/)
  })

  it('forces idle when opponent is in KO even if fighter is defending', () => {
    const f = pickFighterSpriteFile(
      'lizard',
      'defending',
      'defense',
      'headBlock',
      null,
      0,
      null,
      true,
      80,
    )
    expect(f).toMatch(/^lizard_idle_\d\.png$/)
  })

  it('keeps self KO sprite precedence over opponent KO idle gate', () => {
    const f = pickFighterSpriteFile(
      'lizard',
      'knockedDown',
      'offense',
      'none',
      null,
      null,
      null,
      true,
      0,
    )
    expect(f).toBe('lizard_knocked_down_0.png')
  })
})
