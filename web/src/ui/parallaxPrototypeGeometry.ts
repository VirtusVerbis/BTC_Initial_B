import { REFERENCE_HEIGHT } from '../config/constants'

/** Horizontal overscan for ladder strips (centered on stage). */
export const HORIZONTAL_OVERFLOW_PX = 480

export const FG_ZONE_FRAC = 1 / 3
export const FG1_FRAC_OF_ZONE = 0.6

export const stripHeightPx = Math.round(FG1_FRAC_OF_ZONE * REFERENCE_HEIGHT * FG_ZONE_FRAC)

/** BG6 zone bottom / BG5 top — matches flex slice boundary (50% + 16% horizon). */
export const horizonTopFromBottomPx = 0.66 * REFERENCE_HEIGHT

/** Top of FG1 flex band above stage bottom (matches stripHeightPx ladder band thickness). */
export const fg1TopFromBottomPx = stripHeightPx

/**
 * Equal visible rungs: solves T − fg1Top = (h − T) / 9 so FG2 band above FG1 matches one ladder step.
 * Algebraically same as `(horizonTopFromBottomPx - fg2StripTopPx) / 9`.
 */
export const ladderTopStepPx = (horizonTopFromBottomPx - fg1TopFromBottomPx) / 10

/** FG2 strip top — ladder endpoint ( equals horizonTopFromBottomPx − 9·ladderTopStepPx ). */
export const fg2StripTopPx = fg1TopFromBottomPx + ladderTopStepPx

export const ladderStripTopPx = (layerIndex: number): number =>
  layerIndex === 9 ? fg2StripTopPx : horizonTopFromBottomPx - layerIndex * ladderTopStepPx

/** Default ladder strip bottom (distance from stage bottom); animation adds `yOffsetPxByLayer` in the component. */
export const ladderBottomPxDefault = (layerIndex: number): number =>
  ladderStripTopPx(layerIndex) - stripHeightPx
