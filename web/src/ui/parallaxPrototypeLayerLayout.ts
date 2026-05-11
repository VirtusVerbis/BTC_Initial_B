/**
 * Reference-stage layout defaults for parallax drive prototype (logical REFERENCE_WIDTH × REFERENCE_HEIGHT).
 * Origin top-left; y increases downward. xPx/yPx are the default top-left of each layer’s axis-aligned box.
 * See PARALLAX_PROTOTYPE_LAYER_POSITION_ADJUST (examples in block comment below).
 */

import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import {
  FG_ZONE_FRAC,
  HORIZONTAL_OVERFLOW_PX,
  ladderStripTopPx,
  stripHeightPx,
} from './parallaxPrototypeGeometry'

/** Ordered ladder strip ids (indices align with ladder rendering). */
export const PARALLAX_LADDER_STRIP_IDS = [
  'bg-5',
  'bg-4',
  'bg-3',
  'bg-2',
  'bg-1',
  'fg-6',
  'fg-5',
  'fg-4',
  'fg-3',
  'fg-2',
] as const

export type ParallaxLadderStripId = (typeof PARALLAX_LADDER_STRIP_IDS)[number]

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

function ladderStripRect(layerIndex: number): ParallaxPrototypeLayerPosition & ParallaxPrototypeLayerSize {
  return {
    xPx: -HORIZONTAL_OVERFLOW_PX / 2,
    yPx: REFERENCE_HEIGHT - ladderStripTopPx(layerIndex),
    widthPx: REFERENCE_WIDTH + HORIZONTAL_OVERFLOW_PX,
    heightPx: stripHeightPx,
  }
}

function buildLadderPositionDefaults(): Record<ParallaxLadderStripId, ParallaxPrototypeLayerPosition> {
  const entries = PARALLAX_LADDER_STRIP_IDS.map((id, layerIndex) => {
    const { xPx, yPx } = ladderStripRect(layerIndex)
    return [id, { xPx, yPx }] as const
  })
  return Object.fromEntries(entries) as Record<ParallaxLadderStripId, ParallaxPrototypeLayerPosition>
}

function buildLadderSizeDefaults(): Record<ParallaxLadderStripId, ParallaxPrototypeLayerSize> {
  const entries = PARALLAX_LADDER_STRIP_IDS.map((id, layerIndex) => {
    const { widthPx, heightPx } = ladderStripRect(layerIndex)
    return [id, { widthPx, heightPx }] as const
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
  'fg-1': { xPx: 0, yPx: REFERENCE_HEIGHT - stripHeightPx },
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
 * Rendering note: ladder strips and the car read this map in `ParallaxDrivePrototype.tsx`.
 * WideBand layers (`bg-6`, `fg-1`) are still positioned by CSS flex unless wired to layout later.
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
