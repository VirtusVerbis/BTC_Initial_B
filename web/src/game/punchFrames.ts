import { ANIMATION_FRAME_DELAY_MS } from '../ui/androidMirrorConstants'
import type { FighterName, Hand, PunchType } from './types'

/** Number of sprite frames in a punch strip (matches mobile asset naming). */
export const punchFrameCount = (fighter: FighterName, hand: Hand, punch: PunchType): number => {
  const uppercuts = 4
  const hooksLizardLeft = 4
  const hooksLizardRight = 4
  if (punch === 'uppercut') return uppercuts
  if (punch === 'hook' && fighter === 'lizard') return hand === 'left' ? hooksLizardLeft : hooksLizardRight
  return 3
}

/** Impact occurs on this frame index (0-based); default aligns last meaningful frame before recovery. */
export const punchImpactFrameIndex = (frameCount: number): number => Math.max(0, frameCount - 2)

export const computePunchImpactAt = (
  startTs: number,
  fighter: FighterName,
  hand: Hand,
  punchType: PunchType,
): number => {
  const n = punchFrameCount(fighter, hand, punchType)
  const idx = punchImpactFrameIndex(n)
  return startTs + idx * ANIMATION_FRAME_DELAY_MS
}

/** Wall-clock time when punch sequence ends (after last frame slot). */
export const computePunchSequenceEndAt = (
  startTs: number,
  fighter: FighterName,
  hand: Hand,
  punchType: PunchType,
): number => {
  const n = punchFrameCount(fighter, hand, punchType)
  return startTs + n * ANIMATION_FRAME_DELAY_MS
}
