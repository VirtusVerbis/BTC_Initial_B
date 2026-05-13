/**
 * Constant-based shutter band for scenic-drive ladder strips (`bg-5` … `fg-2`).
 * Seams match [`index.css`](../index.css) flex column fractions and [`parallaxPrototypeLayerLayout`](./parallaxPrototypeLayerLayout.ts).
 * `pitch > 0` = downhill (blues expand, greens collapse); `pitch < 0` = uphill (inverse).
 */

import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { FG_ZONE_FRAC, PARALLAX_STRIP_LEFT_REF_PX, PARALLAX_STRIP_WIDTH_REF_PX } from './parallaxPrototypeGeometry'
import { type ParallaxLadderStripId } from './parallaxLadderIds'

/** Match `.parallax-prototype-zone-bg6 { flex: 0 0 calc(100% - 50% - 16%); }` */
const BG6_ZONE_FRAC = 1 - 0.5 - 0.16

/** Match `.parallax-prototype-zone-bg-horizon { flex: 0 0 16%; }` */
const BG_HORIZON_FRAC = 0.16

/** Match `.parallax-prototype-zone-overlap-reserve { flex: 0 0 calc(50% - 33.333333%); }` */
const OVERLAP_RESERVE_FRAC = 0.5 - FG_ZONE_FRAC

/** Match `.parallax-prototype-fg-fg1 { flex: 0 0 60%; }` inside FG zone with `justify-content: flex-end`. */
const FG1_BAND_FRAC_OF_FG_ZONE = 0.6

/** Lower edge of BG6 backdrop (y from top, px). */
export const BG6_BOTTOM_SEAM_Y_PX = REFERENCE_HEIGHT * BG6_ZONE_FRAC

const fgZoneTopYpx =
  BG6_BOTTOM_SEAM_Y_PX + REFERENCE_HEIGHT * BG_HORIZON_FRAC + REFERENCE_HEIGHT * OVERLAP_RESERVE_FRAC

const fgZoneHeightPx = REFERENCE_HEIGHT * FG_ZONE_FRAC

/** Upper edge of FG1 flex band (top of shutter band bottom seam). */
export const FG1_TOP_SEAM_Y_PX = fgZoneTopYpx + fgZoneHeightPx * (1 - FG1_BAND_FRAC_OF_FG_ZONE)

/** Integer ref Y for FG1 band top; matches ladder snap `yEnd` and `fg-2` bottom. */
export const FG1_TOP_SEAM_SNAPPED_Y_PX = Math.round(FG1_TOP_SEAM_Y_PX)

/** Vertical span in which ladder strips are laid (reference px). */
export const SHUTTER_BAND_HEIGHT_PX = FG1_TOP_SEAM_Y_PX - BG6_BOTTOM_SEAM_Y_PX

/** Blues receive this fraction of `SHUTTER_BAND_HEIGHT_PX` at `pitch === 0` (greens get `1 − this`). */
export const NEUTRAL_BLUE_HEIGHT_SHARE = 0.5

export type ShutterLadderRect = {
  xPx: number
  yPx: number
  widthPx: number
  heightPx: number
}

/** BG ladder strips keep 2× overscan so `lateralTranslateRefPx` can shift them without exposing seams. */
const BLUE_STRIP_WIDTH_PX = PARALLAX_STRIP_WIDTH_REF_PX
const BLUE_STRIP_X_PX = PARALLAX_STRIP_LEFT_REF_PX
/** FG ladder strips match FG1's logical width (no lateral parallax → no overscan needed). */
const GREEN_STRIP_WIDTH_PX = REFERENCE_WIDTH
const GREEN_STRIP_X_PX = 0

const BLUE_IDS: readonly ParallaxLadderStripId[] = ['bg-5', 'bg-4', 'bg-3', 'bg-2', 'bg-1']
const GREEN_IDS: readonly ParallaxLadderStripId[] = ['fg-6', 'fg-5', 'fg-4', 'fg-3', 'fg-2']

/** Top-to-bottom order for cumulative vertical snapping (must match ladder draw order). */
const SHUTTER_LADDER_STRIP_ORDER: readonly ParallaxLadderStripId[] = [...BLUE_IDS, ...GREEN_IDS]

/**
 * Snap strip `yPx` / `heightPx` to integers so adjacent strips share exact edges in CSS px space
 * (avoids subpixel hairlines). Invariant: first `yPx === round(BG6 bottom)`; last bottom `=== round(FG1 top)`;
 * each strip's bottom equals the next strip's top.
 */
function snapShutterLadderRectsVertical(
  raw: Record<ParallaxLadderStripId, ShutterLadderRect>,
): Record<ParallaxLadderStripId, ShutterLadderRect> {
  const yStart = Math.round(BG6_BOTTOM_SEAM_Y_PX)
  const yEnd = FG1_TOP_SEAM_SNAPPED_Y_PX
  const snapped = { ...raw }
  let yCursor = yStart
  let acc = BG6_BOTTOM_SEAM_Y_PX

  for (let i = 0; i < SHUTTER_LADDER_STRIP_ORDER.length - 1; i++) {
    const id = SHUTTER_LADDER_STRIP_ORDER[i]!
    const r = raw[id]!
    acc += r.heightPx
    const nextY = Math.round(acc)
    const heightPx = Math.max(0, nextY - yCursor)
    snapped[id] = { ...r, yPx: yCursor, heightPx }
    yCursor = nextY
  }

  const lastId = SHUTTER_LADDER_STRIP_ORDER[SHUTTER_LADDER_STRIP_ORDER.length - 1]!
  const lastRaw = raw[lastId]!
  snapped[lastId] = {
    ...lastRaw,
    yPx: yCursor,
    heightPx: Math.max(0, yEnd - yCursor),
  }
  return snapped
}

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/**
 * `blueHeightShare` in [0, 1]: fraction of the shutter band height allocated to the blue stack;
 * greens get the remainder. Strips tile contiguously top-to-bottom with equal split within each group.
 */
export function buildShutterLadderRectsAtBlueShare(blueHeightShare: number): Record<ParallaxLadderStripId, ShutterLadderRect> {
  const b = Math.max(0, Math.min(1, blueHeightShare))
  const blueTotal = SHUTTER_BAND_HEIGHT_PX * b
  const greenTotal = SHUTTER_BAND_HEIGHT_PX * (1 - b)
  const blueH = blueTotal / 5
  const greenH = greenTotal / 5

  const out = {} as Record<ParallaxLadderStripId, ShutterLadderRect>
  let y = BG6_BOTTOM_SEAM_Y_PX
  for (const id of BLUE_IDS) {
    out[id] = { xPx: BLUE_STRIP_X_PX, yPx: y, widthPx: BLUE_STRIP_WIDTH_PX, heightPx: blueH }
    y += blueH
  }
  for (const id of GREEN_IDS) {
    out[id] = { xPx: GREEN_STRIP_X_PX, yPx: y, widthPx: GREEN_STRIP_WIDTH_PX, heightPx: greenH }
    y += greenH
  }
  return snapShutterLadderRectsVertical(out)
}

/** Neutral layout (`pitch === 0`), same as `computeShutterLadderRects(0)`. */
export const SHUTTER_LADDER_NEUTRAL_RECTS: Record<ParallaxLadderStripId, ShutterLadderRect> =
  buildShutterLadderRectsAtBlueShare(NEUTRAL_BLUE_HEIGHT_SHARE)

/**
 * Full shutter sweep: `pitch ∈ [-1, 1]`, clamped. Drag convention matches prototype (pointer down → positive pitch).
 */
export function computeShutterLadderRects(pitch: number): Record<ParallaxLadderStripId, ShutterLadderRect> {
  const p = Math.max(-1, Math.min(1, pitch))
  if (p === 0) return { ...SHUTTER_LADDER_NEUTRAL_RECTS }

  const n = NEUTRAL_BLUE_HEIGHT_SHARE
  let blueShare: number
  if (p > 0) {
    blueShare = n + (1 - n) * smoothstep01(p)
  } else {
    blueShare = n * (1 - smoothstep01(-p))
  }
  return buildShutterLadderRectsAtBlueShare(blueShare)
}
