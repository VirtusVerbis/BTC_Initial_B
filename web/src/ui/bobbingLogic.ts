import {
  BOBBING_MAX_X_LEFT,
  BOBBING_MAX_X_RIGHT,
  BOBBING_MAX_Y_DOWN,
  BOBBING_MAX_Y_UP,
  BOBBING_STEP_PX,
  BOBBING_TOGETHER_MAX_X_LEFT,
  BOBBING_TOGETHER_MAX_X_RIGHT,
  BOBBING_TOGETHER_STEP_PX,
  BOBBING_Y_STEPS_PER_FULL_X_CYCLE,
  SCALE_LARGER_PERCENT_LIZARD,
  SCALE_LARGER_PERCENT_SATOSHI,
  SCALE_SMALLER_PERCENT_LIZARD,
  SCALE_SMALLER_PERCENT_SATOSHI,
} from './androidMirrorConstants'

export type BobbingDirection = 1 | -1

/** Mutable engine state; one step per Android `BOBBING_INTERVAL_MS` tick. */
export interface BobbingEngineState {
  movementOffsetX: number
  movementDirection: BobbingDirection
  movementOffsetY: number
  movementDirectionY: BobbingDirection
  applyYOnNextCentreCross: boolean
  togetherOffsetX: number
  togetherDirection: BobbingDirection
}

export const createInitialBobbingState = (): BobbingEngineState => ({
  movementOffsetX: 0,
  movementDirection: 1,
  movementOffsetY: 0,
  movementDirectionY: 1,
  applyYOnNextCentreCross: false,
  togetherOffsetX: 0,
  togetherDirection: 1,
})

/** Port of Android `MainActivity` bobbing loop body (one tick). */
export function advanceBobbingEngine(prev: BobbingEngineState, bobScale: number): BobbingEngineState {
  const step = BOBBING_STEP_PX * bobScale
  const maxXL = BOBBING_MAX_X_LEFT * bobScale
  const maxXR = BOBBING_MAX_X_RIGHT * bobScale
  const maxYU = BOBBING_MAX_Y_UP * bobScale
  const maxYD = BOBBING_MAX_Y_DOWN * bobScale
  const tMaxL = BOBBING_TOGETHER_MAX_X_LEFT * bobScale
  const tMaxR = BOBBING_TOGETHER_MAX_X_RIGHT * bobScale
  const tStep = BOBBING_TOGETHER_STEP_PX * bobScale

  const oldOffsetX = prev.movementOffsetX
  let movementOffsetX = prev.movementOffsetX + prev.movementDirection * step
  let movementDirection = prev.movementDirection

  if (movementOffsetX >= maxXR) {
    movementOffsetX = maxXR
    movementDirection = -1
  } else if (movementOffsetX <= maxXL) {
    movementOffsetX = maxXL
    movementDirection = 1
  }

  let movementOffsetY = prev.movementOffsetY
  let movementDirectionY = prev.movementDirectionY
  let applyYOnNextCentreCross = prev.applyYOnNextCentreCross

  const centreCrossed =
    (oldOffsetX > 0 && movementOffsetX <= 0) ||
    (oldOffsetX < 0 && movementOffsetX >= 0) ||
    (oldOffsetX === 0 && movementOffsetX !== 0)

  if (centreCrossed) {
    applyYOnNextCentreCross = !applyYOnNextCentreCross
    if (!applyYOnNextCentreCross) {
      for (let i = 0; i < BOBBING_Y_STEPS_PER_FULL_X_CYCLE; i += 1) {
        movementOffsetY += movementDirectionY * step
        if (movementOffsetY >= maxYD) {
          movementOffsetY = maxYD
          movementDirectionY = -1
        } else if (movementOffsetY <= maxYU) {
          movementOffsetY = maxYU
          movementDirectionY = 1
        }
      }
    }
  }

  let togetherOffsetX = prev.togetherOffsetX + prev.togetherDirection * tStep
  let togetherDirection = prev.togetherDirection
  if (togetherOffsetX >= tMaxR) {
    togetherOffsetX = tMaxR
    togetherDirection = -1
  } else if (togetherOffsetX <= tMaxL) {
    togetherOffsetX = tMaxL
    togetherDirection = 1
  }

  return {
    movementOffsetX,
    movementDirection,
    movementOffsetY,
    movementDirectionY,
    applyYOnNextCentreCross,
    togetherOffsetX,
    togetherDirection,
  }
}

export function bobbingPixelOutputs(s: BobbingEngineState): {
  xBobSatoshiPx: number
  xBobLizardPx: number
  yBobPx: number
} {
  return {
    xBobSatoshiPx: s.movementOffsetX + s.togetherOffsetX,
    xBobLizardPx: -s.movementOffsetX + s.togetherOffsetX,
    yBobPx: s.movementOffsetY,
  }
}

export function depthScaleFromOffsetY(
  movementOffsetY: number,
  bobScale: number,
  smallerPct: number,
  largerPct: number,
): number {
  const maxYU = BOBBING_MAX_Y_UP * bobScale
  const maxYD = BOBBING_MAX_Y_DOWN * bobScale
  const rangeY = maxYD - maxYU
  const tY = rangeY !== 0 ? (movementOffsetY - maxYU) / rangeY : 0.5
  const minS = 1 - smallerPct / 100
  const maxS = 1 + largerPct / 100
  return minS + tY * (maxS - minS)
}

export function depthSatoshi(movementOffsetY: number, bobScale: number): number {
  return depthScaleFromOffsetY(movementOffsetY, bobScale, SCALE_SMALLER_PERCENT_SATOSHI, SCALE_LARGER_PERCENT_SATOSHI)
}

export function depthLizard(movementOffsetY: number, bobScale: number): number {
  return depthScaleFromOffsetY(movementOffsetY, bobScale, SCALE_SMALLER_PERCENT_LIZARD, SCALE_LARGER_PERCENT_LIZARD)
}
