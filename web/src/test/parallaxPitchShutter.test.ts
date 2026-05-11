import { describe, expect, it } from 'vitest'
import { PARALLAX_LADDER_STRIP_IDS } from '../ui/parallaxLadderIds'
import {
  BG6_BOTTOM_SEAM_Y_PX,
  buildShutterLadderRectsAtBlueShare,
  computeShutterLadderRects,
  FG1_TOP_SEAM_Y_PX,
  SHUTTER_BAND_HEIGHT_PX,
  SHUTTER_LADDER_NEUTRAL_RECTS,
} from '../ui/parallaxShutterLayout'

describe('parallaxShutterLayout', () => {
  it('computeShutterLadderRects(0) matches neutral table', () => {
    const m = computeShutterLadderRects(0)
    for (const id of PARALLAX_LADDER_STRIP_IDS) {
      const a = m[id]!
      const b = SHUTTER_LADDER_NEUTRAL_RECTS[id]!
      expect(a.xPx).toBeCloseTo(b.xPx, 6)
      expect(a.yPx).toBeCloseTo(b.yPx, 6)
      expect(a.widthPx).toBeCloseTo(b.widthPx, 6)
      expect(a.heightPx).toBeCloseTo(b.heightPx, 6)
    }
  })

  it('total ladder strip heights equal shutter band at any pitch', () => {
    for (const p of [-1, -0.3, 0, 0.3, 1]) {
      const m = computeShutterLadderRects(p)
      let sum = 0
      for (const id of PARALLAX_LADDER_STRIP_IDS) {
        sum += m[id]!.heightPx
        expect(m[id]!.heightPx).toBeGreaterThanOrEqual(0)
      }
      expect(sum).toBeCloseTo(SHUTTER_BAND_HEIGHT_PX, 6)
    }
  })

  it('full downhill: BG1 stack fills to FG1 top seam', () => {
    const m = computeShutterLadderRects(1)
    const bg1 = m['bg-1']!
    expect(bg1.yPx + bg1.heightPx).toBeCloseTo(FG1_TOP_SEAM_Y_PX, 5)
    expect(m['fg-2']!.heightPx).toBeLessThanOrEqual(1e-6)
  })

  it('full uphill: FG6 starts at BG6 bottom seam', () => {
    const m = computeShutterLadderRects(-1)
    const fg6 = m['fg-6']!
    expect(fg6.yPx).toBeCloseTo(BG6_BOTTOM_SEAM_Y_PX, 5)
    expect(m['bg-5']!.heightPx).toBeLessThanOrEqual(1e-6)
  })

  it('buildShutterLadderRectsAtBlueShare(0.5) matches neutral blue share', () => {
    const m = buildShutterLadderRectsAtBlueShare(0.5)
    expect(m['bg-5']!.heightPx).toBeCloseTo(SHUTTER_LADDER_NEUTRAL_RECTS['bg-5']!.heightPx, 5)
  })
})
