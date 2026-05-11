import { describe, expect, test } from 'vitest'
import {
  advanceBobbingEngine,
  bobbingPixelOutputs,
  createInitialBobbingState,
  depthLizard,
  depthSatoshi,
} from '../ui/bobbingLogic'

describe('bobbingLogic', () => {
  test('advance stays finite and within scaled bounds over many ticks', () => {
    const bobScale = 0.5
    let s = createInitialBobbingState()
    for (let i = 0; i < 500; i += 1) {
      s = advanceBobbingEngine(s, bobScale)
      const { xBobSatoshiPx, xBobLizardPx, yBobPx } = bobbingPixelOutputs(s)
      expect(Number.isFinite(xBobSatoshiPx)).toBe(true)
      expect(Number.isFinite(xBobLizardPx)).toBe(true)
      expect(Number.isFinite(yBobPx)).toBe(true)
      const ds = depthSatoshi(s.movementOffsetY, bobScale)
      const dl = depthLizard(s.movementOffsetY, bobScale)
      expect(ds).toBeGreaterThan(0)
      expect(dl).toBeGreaterThan(0)
    }
  })
})
