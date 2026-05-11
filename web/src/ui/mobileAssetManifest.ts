import {
  BG2_CHART_HEIGHT_FRACTION,
  BG2_CHART_TOP_OFFSET_FRACTION,
  LIZARD_SCALE,
  LIZARD_X_POSITION,
  LIZARD_Y_POSITION,
  SATOSHI_SCALE,
  SATOSHI_X_POSITION,
  SATOSHI_Y_POSITION,
} from './androidMirrorConstants'

/**
 * Layout anchors for the 1080×1920 reference frame (same as `REFERENCE_*` in constants).
 * Values are fractions 0–1 for top/left/width/height inside `.scene`.
 *
 * z-index (Android parity, all &lt; overlay z-20):
 * - 0: `.scene-hud-bg` (CSS)
 * - 2: bg5 audience
 * - 3: bg4 buy signs
 * - 4: bg3 flash
 * - 5: bg2 memes
 * - 6: bg1 chart band
 * - 7: bg0 ring (closest background)
 * - 8: fg1 Lizard (behind Satoshi)
 * - 9: fg2 Satoshi
 * - 10: fg3 cat
 */
export const mobileAssetManifest = {
  /** Reserved for PNG-backed HUD; Android uses Compose text/bars instead. */
  hudBackground: null as string | null,

  audience: {
    zIndex: 2,
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    /** Android bg5: `fillMaxSize()` + `ContentScale.Fit` + `Alignment.TopCenter` → `contain` + `center top`. */
    objectFit: 'contain' as const,
    objectPosition: 'center top' as const,
  },

  buySigns: {
    zIndex: 3,
    left: 0.14,
    top: 0.06,
    width: 0.72,
    height: 0.16,
    objectFit: 'contain' as const,
  },

  flash: {
    zIndex: 4,
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    objectFit: 'cover' as const,
  },

  meme: {
    zIndex: 5,
    left: 0.08,
    top: 0.06,
    width: 0.84,
    height: 0.24,
    objectFit: 'contain' as const,
  },

  chartBand: {
    zIndex: 6,
    left: 0,
    width: 1,
    top: BG2_CHART_TOP_OFFSET_FRACTION,
    height: BG2_CHART_HEIGHT_FRACTION,
  },

  /** Android bg0: `fillMaxSize()` + `ContentScale.Fit` + `Alignment.BottomCenter`. */
  ring: {
    zIndex: 7,
    left: 0,
    top: 0.12,  //0.15
    width: 1,
    height: 1,
    objectFit: 'contain' as const,
    objectPosition: 'center bottom' as const,
  },

  lizard: {
    zIndex: 8,
    anchorX: LIZARD_X_POSITION,
    anchorY: LIZARD_Y_POSITION,
    alignDeltaX: 0.08,
    scale: LIZARD_SCALE,
  },

  satoshi: {
    zIndex: 9,
    anchorX: SATOSHI_X_POSITION,
    anchorY: SATOSHI_Y_POSITION,
    alignDeltaX: 0.08,
    scale: SATOSHI_SCALE,
  },

  fg3: {
    zIndex: 10,
    left: 0.18,
    top: 0.58,
    width: 0.64,
    height: 0.2,
    objectFit: 'contain' as const,
  },
}
