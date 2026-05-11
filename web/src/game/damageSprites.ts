import { ANIMATION_FRAME_DELAY_MS } from '../ui/androidMirrorConstants'
import type { FighterName, Hand, PunchType } from './types'

/** Android `DAMAGE_COMPLETION_SAFETY_TIMEOUT_MS`. */
export const DAMAGE_COMPLETION_SAFETY_TIMEOUT_MS = 3000

export const damageFrameCount = (_fighter: FighterName, punchType: PunchType): number =>
  punchType === 'uppercut' ? 4 : 3

export const damageAnimationDurationMs = (
  fighter: FighterName,
  punchType: PunchType,
  hand: Hand,
): number => {
  void hand
  return damageFrameCount(fighter, punchType) * ANIMATION_FRAME_DELAY_MS
}

const oppositeHand = (hand: Hand): Hand => (hand === 'left' ? 'right' : 'left')

/** One mobile asset filename for a damage strip frame (incoming punch hand + type). */
export const damageSpriteFile = (
  fighter: FighterName,
  incomingHand: Hand,
  punchType: PunchType,
  frame: number,
): string => {
  const n = damageFrameCount(fighter, punchType)
  const f = Math.min(n - 1, Math.max(0, frame))
  const h = incomingHand
  const mirrored = oppositeHand(h)
  if (fighter === 'satoshi') {
    if (punchType === 'uppercut') return `satoshi_dmg_head_${f}.png`
    if (punchType === 'body') return `satoshi_${mirrored}_dmg_body_${f}.png`
    if (punchType === 'jab') return `satoshi_${h}_dmg_head_${f}.png`
    return `satoshi_${mirrored}_dmg_head_${f}.png`
  }
  if (punchType === 'uppercut') return `lizard_damage_center_${f}.png`
  if (punchType === 'jab') return `lizard_${h}_small_head_dmg_${f}.png`
  if (punchType === 'body') return `lizard_${mirrored}_body_dmg_${f}.png`
  return `lizard_${mirrored}_damage_head_${f}.png`
}
