/** Timings and tuning mirrored from Android `MainActivity.kt` (VirtusVerbis/BTC_Punch_Up). */

export const SPLASH_DISPLAY_MS = 2500
export const SPLASH_FADE_OUT_MS = 300
export const TITLE_DISPLAY_MS = 3500
export const TITLE_FADE_OUT_MS = 300

export const ANIMATION_FRAME_DELAY_MS = 80

/** Android `MIN_IDLE_AFTER_DEFENSE_MS`. */
export const MIN_IDLE_AFTER_DEFENSE_MS = 100

export const AUDIENCE_FRAME_DELAY_MS = 4000

export const RING_ROTATE_FREQUENCY_MS = 2 * 60 * 1000
export const RING_ROTATION_FRAME_DELAY_MS = 8000

export const BG2_SHOW_INTERVAL_MS = 3 * 60 * 1000
export const BG2_VISIBLE_DURATION_MS = 30_000
export const BG2_CHART_TOP_OFFSET_FRACTION = 0.13
/** Android parity: chart occupies ~49.5% screen height from 15% top offset. */
export const BG2_CHART_HEIGHT_FRACTION = 0.495
/** Android `BG2_MAX_CANDLES`: max 1m candles kept / requested for BG1 chart. */
export const BG2_MAX_CANDLES = 200

export const BG2_MEME_PRICE_WINDOW_MS = 60_000  //this controls the look back into history window (you can decrease for testing say 1000ms))

//export const BG2_MEME_FRAME_DELAY_MS = 120   //not being used here or in mobile app
export const BG2_MEME_CYCLE_FRAMES = 40
export const BG2_DCB_MIN_FRAME_INTERVAL_MS = 80
export const BG2_DCB_FRAME_DELAY_MS = 250
/** Tuned with aspect-based box height so body stays near chart band (see BG2_CHART_*). */
export const BG2_DCB_TOP_OFFSET_FRACTION = 0.15
export const BG2_DCB_PRICE_INCREASE_PERCENT = 2.0001
export const BG2_DCB_PRICE_INCREASE_PERCENT_MAX = 3.0
export const BG2_DCB_ASPECT_HEIGHT_PER_WIDTH = 176 / 320

export const BG2_BDWW_DISPLAY_MS = 30_000
export const BG2_BDWW_PRICE_DROP_PERCENT = 2.0001
export const BG2_BDWW_PRICE_DROP_PERCENT_MAX = 3.0
/** ~square meme at full width: keep bottom near chart band end (BG2_CHART_TOP + BG2_CHART_HEIGHT). */
export const BG2_BDWW_TOP_OFFSET_FRACTION = 0.06
export const BG2_BDWW_ASPECT_HEIGHT_PER_WIDTH = 1.0

export const BG2_NEO_DISPLAY_MS = 30_000
export const BG2_NEO_PRICE_INCREASE_PERCENT = 1.0
export const BG2_NEO_PRICE_INCREASE_PERCENT_MAX = 2.0
export const BG2_NEO_TOP_OFFSET_FRACTION = 0.06
/** MainActivity `NEO_ASPECT_HEIGHT_PER_WIDTH = 1f` (same formula as other 1:1 memes). */
export const BG2_NEO_ASPECT_HEIGHT_PER_WIDTH = 1

export const BG2_FR_DISPLAY_MS = 30_000
export const BG2_FR_PRICE_DROP_PERCENT = 1.0
export const BG2_FR_PRICE_DROP_PERCENT_MAX = 2.0
export const BG2_FR_TOP_OFFSET_FRACTION = 0.065
export const BG2_FR_ASPECT_HEIGHT_PER_WIDTH = 1.0

export const BG2_ARROW_UP_DISPLAY_MS = 10_000
export const BG2_ARROW_UP_PRICE_INCREASE_PERCENT = 0.1
export const BG2_ARROW_UP_PRICE_INCREASE_PERCENT_MAX = 0.9999
/** Align with candle chart band top (`BG2_CHART_TOP_OFFSET_FRACTION`); tall aspect fills downward. */
export const BG2_ARROW_UP_TOP_OFFSET_FRACTION = 0.06//0.13
export const BG2_ARROW_UP_ASPECT_HEIGHT_PER_WIDTH = 1 //3.5

export const BG2_ARROW_DOWN_DISPLAY_MS = 10_000
export const BG2_ARROW_DOWN_PRICE_DROP_PERCENT = 0.1
export const BG2_ARROW_DOWN_PRICE_DROP_PERCENT_MAX = 0.9999
/** Same vertical anchor as arrow up + chart band. */
export const BG2_ARROW_DOWN_TOP_OFFSET_FRACTION = 0.06//0.13
export const BG2_ARROW_DOWN_ASPECT_HEIGHT_PER_WIDTH = 1 //3.5

export const BG4_SIGN_FRAME_DELAY_MS = 600
export const BG4_SIGN_SPAWN_INTERVAL_MS = 60_000
export const BG4_SIGN_SIZE_DP = 82
export const BG4_SIGN_MARGIN_X_FRACTION = 0.05
export const BG4_SIGN_ROW_Y_FRACTIONS = [0.25, 0.37, 0.49] as const
export const BG4_SIGN_FRAMES = 5

export const BG3_FLASH_FRAME_DELAY_MS = 80
export const BG3_FLASH_FRAME_COUNT = 4
export const BG3_FLASH_MAX_Y_FRACTION = 0.6
export const BG3_FLASH_SPAWN_COUNT_DEFAULT = 20
export const BG3_FLASH_MAX_SPAWN_TOGETHER = 2
export const BG3_FLASH_AUDIENCE_DISPLAY_MS = 150
export const BG3_FLASH_SPAWN_WAVE_DELAY_MS = 550
export const BG3_FLASH_AUDIENCE_MIN_INTERVAL_MS = 334
export const BG3_FLASH_SIZE_DP = 64

/** Android `VIDEO_OVERLAY_OFFSET_FROM_TOP_DP`. */
export const VIDEO_OVERLAY_OFFSET_FROM_TOP_DP = 260//100
/** Web: fixed stage-coordinate top anchor so Y stays stable during resize. */
export const VIDEO_OVERLAY_TOP_PX_WEB = VIDEO_OVERLAY_OFFSET_FROM_TOP_DP
/** Android `VIDEO_OVERLAY_AUTO_SPAWN_DELAY_MS`. */
export const VIDEO_OVERLAY_AUTO_SPAWN_DELAY_MS = 15 * 60 * 1000
/** Android `VIDEO_OVERLAY_SPAWN_INTERVAL_MS`. */
export const VIDEO_OVERLAY_SPAWN_INTERVAL_MS = 15 * 60 * 1000
/** Android video box height: ~40% of screen. */
export const VIDEO_OVERLAY_VISIBLE_HEIGHT_FRACTION = 0.835//0.4
/** Mobile defaults to muted until user enables sound. */
export const VIDEO_OVERLAY_DEFAULT_MUTED = true

/** Android parity: one cat at a time, spawn roughly every 15 minutes. */
export const FG3_CAT_SPAWN_INTERVAL_MS = 15 * 60 * 1000
/** Android parity: cat movement step applied on each animation tick. */
export const FG3_CAT_SPEED_PX_PER_TICK = 8
/** Android parity: spawn lane near bottom of scene (fraction of scene height). */
export const FG3_CAT_SPAWN_Y_FACTOR = 1.01
/** Android parity source size in dp (`CAT_SIZE_DP`). */
export const FG3_CAT_SIZE_DP = 64
/** Extra margin beyond scene bounds before spawn/despawn. */
export const FG3_CAT_OFFSCREEN_MARGIN_PX = 50
/** Cat walk alternates two frames using the same animation cadence. */
export const FG3_CAT_FRAME_DELAY_MS = ANIMATION_FRAME_DELAY_MS

/** Android `Sprite`: boxers use 128dp art × `sizeScale` (see `Sprite` composable `baseSizeDp`). */
export const FIGHTER_BASE_ART_DP = 128

/**
 * Web-only: Compose also clips/scales the full game; raw 128×scale px can dominate the ring on web.
 * Applied as an extra multiplier in `fighterStyle` (see FightScene).
 */
export const FIGHTER_WEB_DISPLAY_FACTOR = 1.35

/** Web-only: shift both boxer anchor centers (positive = down); fraction of scene height (see FightScene). */
export const FIGHTER_ANCHOR_Y_OFFSET_FRACTION = 0.05

/** Android `Sprite` horizontal center correction in dp (sprite-space), applied in `fighterStyle`. */
export const SATOSHI_CENTER_BIAS_DP = 0 // 20
export const LIZARD_CENTER_BIAS_DP = 0 //115

/** Android `PUNCH_PRIORITY_HAND` when both hands have a punch ready (`HandSide.RIGHT` in MainActivity). */
export const PUNCH_PRIORITY_HAND = 'right' as const

/** Android `MainActivity` boxer bobbing (pixels on 1080×1920 reference; scaled in `useBoxerBobbing`). */
export const BOBBING_MAX_X_LEFT = -20
export const BOBBING_MAX_X_RIGHT = 20
export const BOBBING_MAX_Y_UP = -15
export const BOBBING_MAX_Y_DOWN = 15
export const BOBBING_STEP_PX = 1
export const BOBBING_INTERVAL_MS = 40
export const BOBBING_Y_STEPS_PER_FULL_X_CYCLE = 3
export const BOBBING_TOGETHER_MAX_X_LEFT = -200
export const BOBBING_TOGETHER_MAX_X_RIGHT = 200
export const BOBBING_TOGETHER_STEP_PX = 5
export const BOBBING_START_DELAY_MS = 150

/** Android depth scale percents (`SCALE_*` in MainActivity). */
export const SCALE_SMALLER_PERCENT_SATOSHI = 5
export const SCALE_LARGER_PERCENT_SATOSHI = 20
export const SCALE_SMALLER_PERCENT_LIZARD = 5
export const SCALE_LARGER_PERCENT_LIZARD = 20

/** Sprite placement (fractions of stage height/width), from Android constants. */
export const SATOSHI_Y_POSITION = 0.68//0.7
export const SATOSHI_X_POSITION = 0.5
export const LIZARD_Y_POSITION = 0.64//0.66
export const LIZARD_X_POSITION = 0.5

export const SATOSHI_SCALE = 5//4.8//4.5
export const LIZARD_SCALE = 5.5//5.3//5
