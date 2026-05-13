/**
 * Reference-stage layout defaults for parallax drive prototype (logical REFERENCE_WIDTH × REFERENCE_HEIGHT).
 * Origin top-left; y increases downward. xPx/yPx are the default top-left of each layer’s axis-aligned box.
 * See PARALLAX_PROTOTYPE_LAYER_POSITION_ADJUST (examples in block comment below).
 */

import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { FG_ZONE_FRAC, stripHeightPx } from './parallaxPrototypeGeometry'
import { FG1_TOP_SEAM_Y_PX, SHUTTER_LADDER_NEUTRAL_RECTS } from './parallaxShutterLayout'
import { PARALLAX_LADDER_STRIP_IDS, type ParallaxLadderStripId } from './parallaxLadderIds'

export { PARALLAX_LADDER_STRIP_IDS, type ParallaxLadderStripId } from './parallaxLadderIds'

export type ParallaxPrototypeLayerId =
  | ParallaxLadderStripId
  | 'bg-6'
  | 'bg-horizon'
  | 'overlap-reserve'
  | 'fg-zone'
  | 'fg-1'
  | 'car'

export type ParallaxPrototypeLayerPosition = {
  xPx: number
  yPx: number
}

export type ParallaxPrototypeLayerSize = {
  widthPx: number
  heightPx: number
}

const bg6HeightPx = REFERENCE_HEIGHT * (1 - 0.5 - 0.16)
const bgHorizonHeightPx = REFERENCE_HEIGHT * 0.16
const overlapReserveHeightPx = REFERENCE_HEIGHT * (0.5 - FG_ZONE_FRAC)
const fgZoneTopPx = bg6HeightPx + bgHorizonHeightPx + overlapReserveHeightPx
const fgZoneHeightPx = REFERENCE_HEIGHT * FG_ZONE_FRAC

const CAR_WIDTH_PX = 256
const CAR_HEIGHT_PX = 256
/** Matches `.parallax-prototype-car { bottom: 3% }`. */
const CAR_BOTTOM_FRAC = 0.03

/** Ladder strip defaults match neutral shutter rects ([`parallaxShutterLayout`](./parallaxShutterLayout.ts)). */
function buildLadderPositionDefaults(): Record<ParallaxLadderStripId, ParallaxPrototypeLayerPosition> {
  const entries = PARALLAX_LADDER_STRIP_IDS.map((id) => {
    const r = SHUTTER_LADDER_NEUTRAL_RECTS[id]
    return [id, { xPx: r.xPx, yPx: r.yPx }] as const
  })
  return Object.fromEntries(entries) as Record<ParallaxLadderStripId, ParallaxPrototypeLayerPosition>
}

function buildLadderSizeDefaults(): Record<ParallaxLadderStripId, ParallaxPrototypeLayerSize> {
  const entries = PARALLAX_LADDER_STRIP_IDS.map((id) => {
    const r = SHUTTER_LADDER_NEUTRAL_RECTS[id]
    return [id, { widthPx: r.widthPx, heightPx: r.heightPx }] as const
  })
  return Object.fromEntries(entries) as Record<ParallaxLadderStripId, ParallaxPrototypeLayerSize>
}

/** Default top-left positions derived from geometry (reference px). */
export const PARALLAX_PROTOTYPE_LAYER_POSITION_DEFAULT = {
  ...buildLadderPositionDefaults(),
  'bg-6': { xPx: 0, yPx: 0 },
  'bg-horizon': { xPx: 0, yPx: bg6HeightPx },
  'overlap-reserve': { xPx: 0, yPx: bg6HeightPx + bgHorizonHeightPx },
  'fg-zone': { xPx: 0, yPx: fgZoneTopPx },
  'fg-1': { xPx: 0, yPx: FG1_TOP_SEAM_Y_PX },
  car: {
    xPx: REFERENCE_WIDTH / 2 - CAR_WIDTH_PX / 2,
    yPx: REFERENCE_HEIGHT * (1 - CAR_BOTTOM_FRAC) - CAR_HEIGHT_PX,
  },
} satisfies Record<ParallaxPrototypeLayerId, ParallaxPrototypeLayerPosition>

/**
 * Per-layer position deltas merged in {@link getParallaxPrototypeLayerPosition}.
 * Positive `dyPx` moves the layer **down** (reference coords: origin top-left, y downward).
 * Keys are {@link ParallaxPrototypeLayerId} (`'bg-5'` … `'fg-2'`, `'bg-6'`, `'bg-horizon'`,
 * `'overlap-reserve'`, `'fg-zone'`, `'fg-1'`, `'car'`). Omit `dxPx` when adjusting only y.
 *
 * Examples:
 *
 * ```ts
 * // Move FG2 down 8px
 * export const PARALLAX_PROTOTYPE_LAYER_POSITION_ADJUST = { 'fg-2': { dyPx: 8 } }
 * ```
 *
 * ```ts
 * // Move BG5 up 12px
 * export const PARALLAX_PROTOTYPE_LAYER_POSITION_ADJUST = { 'bg-5': { dyPx: -12 } }
 * ```
 *
 * ```ts
 * // Shift car right and up in reference px
 * export const PARALLAX_PROTOTYPE_LAYER_POSITION_ADJUST = { car: { dxPx: 10, dyPx: -20 } }
 * ```
 *
 * Rendering note: absolute layers (`bg-5`…`fg-2`, `fg-1`, `car`) read this map in `ParallaxDrivePrototype.tsx`.
 * Only `bg-6` is still positioned by CSS flex (it uses the wide-band 2× overscan for lateral parallax).
 */
export const PARALLAX_PROTOTYPE_LAYER_POSITION_ADJUST: Partial<
  Record<ParallaxPrototypeLayerId, { dxPx?: number; dyPx?: number }>
> = {}

export function getParallaxPrototypeLayerPosition(
  id: ParallaxPrototypeLayerId,
): ParallaxPrototypeLayerPosition {
  const base = PARALLAX_PROTOTYPE_LAYER_POSITION_DEFAULT[id]
  const adj = PARALLAX_PROTOTYPE_LAYER_POSITION_ADJUST[id]
  return {
    xPx: base.xPx + (adj?.dxPx ?? 0),
    yPx: base.yPx + (adj?.dyPx ?? 0),
  }
}

/** Default widths/heights where meaningful (reference px). */
export const PARALLAX_PROTOTYPE_LAYER_SIZE_DEFAULT = {
  ...buildLadderSizeDefaults(),
  'bg-6': { widthPx: REFERENCE_WIDTH, heightPx: bg6HeightPx },
  'bg-horizon': { widthPx: REFERENCE_WIDTH, heightPx: bgHorizonHeightPx },
  'overlap-reserve': { widthPx: REFERENCE_WIDTH, heightPx: overlapReserveHeightPx },
  'fg-zone': { widthPx: REFERENCE_WIDTH, heightPx: fgZoneHeightPx },
  'fg-1': { widthPx: REFERENCE_WIDTH, heightPx: stripHeightPx },
  car: { widthPx: CAR_WIDTH_PX, heightPx: CAR_HEIGHT_PX },
} satisfies Record<ParallaxPrototypeLayerId, ParallaxPrototypeLayerSize>
