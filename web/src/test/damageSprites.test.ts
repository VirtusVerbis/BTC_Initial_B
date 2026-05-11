import { describe, expect, it } from 'vitest'
import { damageSpriteFile } from '../game/damageSprites'
import type { Hand, PunchType } from '../game/types'

const hands: Hand[] = ['left', 'right']

describe('damageSpriteFile mobile parity mapping', () => {
  it('maps Satoshi damage strips with mirrored body/hook/cross and same-side jab', () => {
    for (const hand of hands) {
      const mirrored = hand === 'left' ? 'right' : 'left'
      expect(damageSpriteFile('satoshi', hand, 'jab', 0)).toBe(`satoshi_${hand}_dmg_head_0.png`)
      expect(damageSpriteFile('satoshi', hand, 'body', 0)).toBe(`satoshi_${mirrored}_dmg_body_0.png`)
      expect(damageSpriteFile('satoshi', hand, 'hook', 0)).toBe(`satoshi_${mirrored}_dmg_head_0.png`)
      expect(damageSpriteFile('satoshi', hand, 'cross', 0)).toBe(`satoshi_${mirrored}_dmg_head_0.png`)
      expect(damageSpriteFile('satoshi', hand, 'uppercut', 0)).toBe('satoshi_dmg_head_0.png')
    }
  })

  it('maps Lizard damage strips with mirrored body/hook/cross and same-side jab', () => {
    for (const hand of hands) {
      const mirrored = hand === 'left' ? 'right' : 'left'
      expect(damageSpriteFile('lizard', hand, 'jab', 0)).toBe(`lizard_${hand}_small_head_dmg_0.png`)
      expect(damageSpriteFile('lizard', hand, 'body', 0)).toBe(`lizard_${mirrored}_body_dmg_0.png`)
      expect(damageSpriteFile('lizard', hand, 'hook', 0)).toBe(`lizard_${mirrored}_damage_head_0.png`)
      expect(damageSpriteFile('lizard', hand, 'cross', 0)).toBe(`lizard_${mirrored}_damage_head_0.png`)
      expect(damageSpriteFile('lizard', hand, 'uppercut', 0)).toBe('lizard_damage_center_0.png')
    }
  })

  it('clamps frame index per punch type frame count', () => {
    const nonUppercut: PunchType = 'cross'
    expect(damageSpriteFile('lizard', 'left', nonUppercut, 999)).toBe('lizard_right_damage_head_2.png')
    expect(damageSpriteFile('satoshi', 'right', 'uppercut', 999)).toBe('satoshi_dmg_head_3.png')
  })
})
