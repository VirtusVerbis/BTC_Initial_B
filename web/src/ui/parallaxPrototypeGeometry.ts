import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'

/** Ladder / wide-band strip width in ref px (= 2× logical stage width), centered on stage. */
export const PARALLAX_STRIP_WIDTH_REF_PX = 2 * REFERENCE_WIDTH

/** Left offset so strip is centered (symmetric ±REFERENCE_WIDTH/2 overscan at neutral). */
export const PARALLAX_STRIP_LEFT_REF_PX = -REFERENCE_WIDTH / 2

/** Six sky layers: farthest moves least, nearest most (relative depth vs legacy bg-1). */
export type BgParallaxLayerId = 'bg-6' | 'bg-5' | 'bg-4' | 'bg-3' | 'bg-2' | 'bg-1'

const BG_LATERAL_DEPTH_FRAC: Record<BgParallaxLayerId, number> = {
  'bg-6': 0.3,
  'bg-5': 0.42,
  'bg-4': 0.54,
  'bg-3': 0.66,
  'bg-2': 0.78,
  'bg-1': 0.9,
}

/** Historical `bg-1` depth frac; ratios `depthFrac / this` match pre–full-span BG1 behavior. */
const BG_LATERAL_DEPTH_LEGACY_BASE = 0.9

/**
 * At `lateral` = ±1, `bg-1` shift so its center reaches stage left/right (strip is 2× wide, centered).
 */
export const BG1_LATERAL_AT_UNIT_REF_PX = REFERENCE_WIDTH / 2

export function lateralTranslateRefPx(lateral: number, layerId: BgParallaxLayerId): number {
  return (
    lateral * BG1_LATERAL_AT_UNIT_REF_PX * (BG_LATERAL_DEPTH_FRAC[layerId] / BG_LATERAL_DEPTH_LEGACY_BASE)
  )
}

export const FG_ZONE_FRAC = 1 / 3
export const FG1_FRAC_OF_ZONE = 0.6

/** FG1 band thickness in reference px (matches flex inner FG1 slice when zone is ⅓ of stage). */
export const stripHeightPx = Math.round(FG1_FRAC_OF_ZONE * REFERENCE_HEIGHT * FG_ZONE_FRAC)
