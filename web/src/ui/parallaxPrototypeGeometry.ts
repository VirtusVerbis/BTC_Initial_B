import { REFERENCE_HEIGHT } from '../config/constants'

/** Horizontal overscan for ladder strips (centered on stage). */
export const HORIZONTAL_OVERFLOW_PX = 480

export const FG_ZONE_FRAC = 1 / 3
export const FG1_FRAC_OF_ZONE = 0.6

/** FG1 band thickness in reference px (matches flex inner FG1 slice when zone is ⅓ of stage). */
export const stripHeightPx = Math.round(FG1_FRAC_OF_ZONE * REFERENCE_HEIGHT * FG_ZONE_FRAC)
