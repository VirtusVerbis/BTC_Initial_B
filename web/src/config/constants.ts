export const REFERENCE_WIDTH = 1080
export const REFERENCE_HEIGHT = 1920
export const REFERENCE_ASPECT_RATIO = REFERENCE_WIDTH / REFERENCE_HEIGHT

/** Mobile parity: normalized volume bands (0..1) for punch typing. */
export const VOLUME_PERCENT_JAB_MIN = 0.01
export const VOLUME_PERCENT_JAB_MAX = 0.2
export const VOLUME_PERCENT_BODY_MIN = 0.21
export const VOLUME_PERCENT_BODY_MAX = 0.4
export const VOLUME_PERCENT_HOOK_MIN = 0.41
export const VOLUME_PERCENT_HOOK_MAX = 0.6
export const VOLUME_PERCENT_CROSS_MIN = 0.61
export const VOLUME_PERCENT_CROSS_MAX = 0.8
export const VOLUME_PERCENT_UPPERCUT_MIN = 0.81
export const VOLUME_PERCENT_UPPERCUT_MAX = 1.0

/** Mobile parity: defense trigger bands (0..1). */
export const DEFENSE_HEAD_BLOCK_MIN = 0.57
export const DEFENSE_HEAD_BLOCK_MAX = 1.0
export const DEFENSE_BODY_BLOCK_MIN = 0.24
export const DEFENSE_BODY_BLOCK_MAX = 0.56  
export const DEFENSE_DODGE_LEFT_MIN = 0.01
export const DEFENSE_DODGE_LEFT_MAX = 0.23
export const DEFENSE_DODGE_RIGHT_MIN = 0.01
export const DEFENSE_DODGE_RIGHT_MAX = 0.23

export const MAX_DAMAGE_POINTS = 100

/** Mobile parity: damage points per landed punch. */
export const DAMAGE_POINTS_JAB = 1
export const DAMAGE_POINTS_BODY = 3
export const DAMAGE_POINTS_HOOK = 4
export const DAMAGE_POINTS_CROSS = 5
export const DAMAGE_POINTS_UPPERCUT = 8

export const PUNCH_THRESHOLDS = [
  { maxPercent: Math.round(VOLUME_PERCENT_JAB_MAX * 100), type: 'jab' },
  { maxPercent: Math.round(VOLUME_PERCENT_BODY_MAX * 100), type: 'body' },
  { maxPercent: Math.round(VOLUME_PERCENT_HOOK_MAX * 100), type: 'hook' },
  { maxPercent: Math.round(VOLUME_PERCENT_CROSS_MAX * 100), type: 'cross' },
  { maxPercent: Math.round(VOLUME_PERCENT_UPPERCUT_MAX * 100), type: 'uppercut' },
] as const

export const PUNCH_COOLDOWNS_MS = {
  jab: 1000,
  body: 2000,
  hook: 3000,
  cross: 4000,
  uppercut: 5000,
} as const

export const PUNCH_DAMAGE = {
  jab: DAMAGE_POINTS_JAB,
  body: DAMAGE_POINTS_BODY,
  hook: DAMAGE_POINTS_HOOK,
  cross: DAMAGE_POINTS_CROSS,
  uppercut: DAMAGE_POINTS_UPPERCUT,
} as const

export const KO_SEQUENCE_MS = {
  fall: 400,
  knockedDown: 5000,
  rise: 4600,
} as const

export const BLOCK_HEIGHT_POLL_MS = 60_000
export const STALE_TIMER_MS = 10 * 60 * 1000
export const STALE_FLASH_INTERVAL_MS = 30_000
export const BLOCK_CHANGE_FLASH_COUNT = 10
export const FLASH_HALF_CYCLE_MS = 40
