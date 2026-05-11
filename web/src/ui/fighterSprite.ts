import type { AttackEvent, DefenseType, FighterName, FighterPose, FighterState, Hand, PunchType } from '../game/types'
import { damageSpriteFile } from '../game/damageSprites'
import { punchFrameCount } from '../game/punchFrames'
import { ANIMATION_FRAME_DELAY_MS } from './androidMirrorConstants'
import { resolveMobileAssetUrl } from './mobileAssetUrls'

const tick = (nowMs: number) => Math.floor(nowMs / ANIMATION_FRAME_DELAY_MS)

const cycle = (nowMs: number, len: number) => (tick(nowMs) % len + len) % len

const punchBase = (fighter: FighterName, hand: Hand, punch: PunchType): string => {
  return `${fighter}_${hand}_${punch}`
}

const punchFile = (fighter: FighterName, hand: Hand, punch: PunchType, frame: number): string => {
  const n = punchFrameCount(fighter, hand, punch)
  const f = Math.min(n - 1, Math.max(0, frame))
  return `${punchBase(fighter, hand, punch)}_${f}.png`
}

const defenseBase = (fighter: FighterName, defense: DefenseType): string | null => {
  if (defense === 'none') return null
  if (defense === 'headBlock') return `${fighter}_block_head`
  if (defense === 'bodyBlock') return `${fighter}_block_body`
  if (defense === 'dodgeLeft') return `${fighter}_left_dodge`
  if (defense === 'dodgeRight') return `${fighter}_right_dodge`
  return null
}

const defenseFile = (
  fighter: FighterName,
  defense: DefenseType,
  defenseStripStartTs: number | null,
  nowMs: number,
): string => {
  const base = defenseBase(fighter, defense)
  if (!base) return idleFile(fighter, nowMs)
  if (defenseStripStartTs === null) {
    const frame = cycle(nowMs, 3)
    return `${base}_${frame}.png`
  }
  const elapsed = Math.max(0, nowMs - defenseStripStartTs)
  const frame = Math.min(2, Math.floor(elapsed / ANIMATION_FRAME_DELAY_MS))
  return `${base}_${frame}.png`
}

const idleFile = (fighter: FighterName, nowMs: number): string => {
  if (fighter === 'satoshi') {
    const i = cycle(nowMs, 6)
    return `satoshi_ready_${i}.png`
  }
  const i = cycle(nowMs, 6)
  return `lizard_idle_${i}.png`
}

const koFile = (fighter: FighterName, pose: FighterPose): string => {
  if (fighter === 'satoshi') {
    if (pose === 'fall') return 'satoshi_falling_0.png'
    if (pose === 'knockedDown') return 'satoshi_knocked_down_0.png'
    return 'satoshi_rising_0.png'
  }
  if (pose === 'fall') return 'lizard_falling_0.png'
  if (pose === 'knockedDown') return 'lizard_knocked_down_0.png'
  return 'lizard_rising_0.png'
}

/**
 * True when `pickFighterSpriteFile` would use the idle loop (no KO, punch mid-frame, or block/dodge frames).
 * Bobbing and depth scaling pause unless both fighters satisfy this at once.
 */
export const fighterSpriteIdleForBobbing = (
  fighter: FighterName,
  pose: FighterPose,
  mode: FighterState['mode'],
  defenseType: DefenseType,
  damageAnim: FighterState['damageAnim'],
  pendingDamageAfterDefense: FighterState['pendingDamageAfterDefense'],
  lastAttack: AttackEvent | null,
): boolean => {
  if (damageAnim !== null || pendingDamageAfterDefense !== null) return false
  if (pose === 'fall' || pose === 'knockedDown' || pose === 'rise') return false
  if (pose === 'attacking' && lastAttack?.attacker === fighter) return false
  if (pose === 'defending' || mode === 'defense') {
    return defenseType === 'none'
  }
  return true
}

export const bothFightersIdleForBobbing = (
  satoshi: FighterState,
  lizard: FighterState,
  lastAttack: AttackEvent | null,
): boolean =>
  fighterSpriteIdleForBobbing(
    'satoshi',
    satoshi.pose,
    satoshi.mode,
    satoshi.defenseType,
    satoshi.damageAnim,
    satoshi.pendingDamageAfterDefense,
    lastAttack,
  ) &&
  fighterSpriteIdleForBobbing(
    'lizard',
    lizard.pose,
    lizard.mode,
    lizard.defenseType,
    lizard.damageAnim,
    lizard.pendingDamageAfterDefense,
    lastAttack,
  )

export const pickFighterSpriteFile = (
  fighter: FighterName,
  pose: FighterPose,
  mode: 'offense' | 'defense',
  defenseType: DefenseType,
  damageAnim: FighterState['damageAnim'],
  defenseStripStartTs: FighterState['defenseStripStartTs'],
  lastAttack: AttackEvent | null,
  opponentInKo: boolean,
  nowMs: number,
): string => {
  if (pose === 'fall' || pose === 'knockedDown' || pose === 'rise') {
    return koFile(fighter, pose)
  }

  if (damageAnim !== null) {
    const elapsed = Math.max(0, nowMs - damageAnim.startTs)
    const frame = Math.floor(elapsed / ANIMATION_FRAME_DELAY_MS)
    return damageSpriteFile(fighter, damageAnim.hand, damageAnim.punchType, frame)
  }

  // Mobile parity: if opponent is in KO phase, standing boxer idles.
  if (opponentInKo) {
    return idleFile(fighter, nowMs)
  }

  if (pose === 'attacking' && lastAttack?.attacker === fighter) {
    const n = punchFrameCount(fighter, lastAttack.hand, lastAttack.punchType)
    const started = lastAttack.startedTs ?? lastAttack.ts
    const elapsed = Math.max(0, nowMs - started)
    const frame = Math.min(n - 1, Math.floor(elapsed / ANIMATION_FRAME_DELAY_MS))
    return punchFile(fighter, lastAttack.hand, lastAttack.punchType, frame)
  }

  if (pose === 'defending' || mode === 'defense') {
    if (defenseType === 'none') return idleFile(fighter, nowMs)
    return defenseFile(fighter, defenseType, defenseStripStartTs, nowMs)
  }

  return idleFile(fighter, nowMs)
}

export const fighterSpriteUrl = (
  fighter: FighterName,
  pose: FighterPose,
  mode: 'offense' | 'defense',
  defenseType: DefenseType,
  damageAnim: FighterState['damageAnim'],
  defenseStripStartTs: FighterState['defenseStripStartTs'],
  lastAttack: AttackEvent | null,
  opponentInKo: boolean,
  nowMs: number,
): string =>
  resolveMobileAssetUrl(
    pickFighterSpriteFile(
      fighter,
      pose,
      mode,
      defenseType,
      damageAnim,
      defenseStripStartTs,
      lastAttack,
      opponentInKo,
      nowMs,
    ),
  )

export const audienceFile = (ringIndex: number, subFrame: number): string =>
  `audience_${subFrame}_r${ringIndex}.png`

export const ringFile = (ringIndex: number): string => `ring_${ringIndex}.png`

export const bg4BuySignFile = (frame: number): string => {
  const f = Math.max(0, Math.min(4, frame))
  return `buy_btc_sign_${f}.png`
}

export const bg3FlashFile = (frame: number): string => {
  const f = Math.max(0, Math.min(3, frame))
  return `flash_${f}.png`
}

export const bg3FlashAudienceFile = (): string => 'flash_audience_0.png'

export const bg2MemeFile = (frame: number): string => {
  const f = Math.max(1, Math.min(40, frame))
  return `dancing_chika_brr_${String(f).padStart(3, '0')}.png`
}

export const bg2BdwwFile = (): string => 'buy_dip_with_what.png'

export const bg2NeoFile = (): string => 'neo.png'

export const bg2FirstRuleFile = (): string => 'btc_first_rule.png'

export const bg2ArrowUpFile = (): string => 'arrow_up_0.png'

export const bg2ArrowDownFile = (): string => 'arrow_down_0.png'

export const fg3CatFile = (direction: 'left' | 'right', frame: number): string => {
  const f = frame % 2 === 0 ? 1 : 2
  return `e_cat_${direction}_${f}.png`
}
