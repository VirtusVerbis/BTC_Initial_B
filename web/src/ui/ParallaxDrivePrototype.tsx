import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { HORIZONTAL_OVERFLOW_PX } from './parallaxPrototypeGeometry'
import {
  getParallaxPrototypeLayerPosition,
  PARALLAX_LADDER_STRIP_IDS,
  PARALLAX_PROTOTYPE_LAYER_SIZE_DEFAULT,
  type ParallaxLadderStripId,
} from './parallaxPrototypeLayerLayout'
import { computeShutterLadderRects } from './parallaxShutterLayout'

/**
 * Scenic-drive prototype — ladder strips `bg-5`…`fg-2` (ascending z-index). Neutral layout matches
 * [`parallaxShutterLayout`](./parallaxShutterLayout.ts) seam band; non-ladder bands use layout defaults + CSS flex.
 * Default x/y per layer: parallaxPrototypeLayerLayout.ts (POSITION_DEFAULT + POSITION_ADJUST).
 * **Pitch / shutter**: ladder strips use `computeShutterLadderRects(pitch)` (constant seam band, blues vs greens share height).
 * Drag **up** → uphill (`pitch < 0`); drag **down** → downhill (`pitch > 0`). **Pointer release** eases `pitch` back to 0 (spring).
 * Spec: web/docs/stage-parallax-driving.md
 */

const mixRgb = (
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  stepIndex: number,
  steps: number,
): string => {
  const t = steps <= 1 ? 0 : stepIndex / (steps - 1)
  const r = Math.round(from[0] + (to[0] - from[0]) * t)
  const g = Math.round(from[1] + (to[1] - from[1]) * t)
  const b = Math.round(from[2] + (to[2] - from[2]) * t)
  return `rgb(${r},${g},${b})`
}

const BG_LIGHT: [number, number, number] = [125, 185, 232]
const BG_DARK: [number, number, number] = [12, 28, 58]

const ROAD_DARK: [number, number, number] = [18, 52, 32]
const ROAD_LIGHT: [number, number, number] = [52, 211, 103]

const BG_STEPS = 6
const FG_STEPS = 6

/** BG5 furthest (layerIndex 0) … FG2 nearest (layerIndex 9); FG1 flex zone z-index 13. */
const Z_LADDER_BASE = 2
const Z_CAR = 15

const bgBlue = (bgIndex1To6: number): string =>
  mixRgb(BG_LIGHT, BG_DARK, 6 - bgIndex1To6, BG_STEPS)

const fgGreen = (fgIndex1To6: number): string =>
  mixRgb(ROAD_DARK, ROAD_LIGHT, 6 - fgIndex1To6, FG_STEPS)

const ladderStripColor = (id: ParallaxLadderStripId): string => {
  const [kind, num] = id.split('-') as ['bg' | 'fg', string]
  const idx = Number(num)
  return kind === 'bg' ? bgBlue(idx) : fgGreen(idx)
}

/** Order matches PARALLAX_LADDER_STRIP_IDS / layout defaults. */
const LADDER_LAYERS: readonly { readonly dataLayer: ParallaxLadderStripId; readonly color: string }[] =
  PARALLAX_LADDER_STRIP_IDS.map((dataLayer) => ({
    dataLayer,
    color: ladderStripColor(dataLayer),
  }))

const overscanFlexStyle = {
  width: `calc(100% + ${HORIZONTAL_OVERFLOW_PX}px)`,
  marginLeft: `${-HORIZONTAL_OVERFLOW_PX / 2}px`,
} satisfies CSSProperties

const WideBand = ({
  color,
  zIndex,
  dataLayer,
}: {
  color: string
  zIndex: number
  dataLayer: string
}) => (
  <div
    className="parallax-prototype-band"
    style={{ ...overscanFlexStyle, backgroundColor: color, zIndex }}
    data-layer={dataLayer}
    aria-hidden
  />
)

/** Set `false` to disable the full-stage vertical drag test layer when design matures. */
const PARALLAX_HORIZON_DRAG_ENABLED = true

/** Reference-px drag distance for full `pitch` sweep from 0 to 1 (or 0 to -1). */
const DRAG_TO_PITCH_REF_PX = 480

/** Spring decay per second (exponent); higher = snappier return to neutral. */
const PITCH_SPRING_DECAY_PER_S = 18

function readStageScaleFromEventTarget(target: EventTarget | null): number {
  const el = target as HTMLElement | null
  const stage = el?.closest('.stage')
  if (!stage) return 1
  const w = stage.getBoundingClientRect().width
  return w > 0 ? w / REFERENCE_WIDTH : 1
}

export const ParallaxDrivePrototype = () => {
  const [pitch, setPitch] = useState(0)
  const pitchRef = useRef(0)
  pitchRef.current = pitch

  const springRafRef = useRef<number | null>(null)

  const cancelSpring = useCallback(() => {
    if (springRafRef.current != null) {
      cancelAnimationFrame(springRafRef.current)
      springRafRef.current = null
    }
  }, [])

  const startSpringToZero = useCallback(() => {
    cancelSpring()
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.045, (now - last) / 1000)
      last = now
      const decay = Math.exp(-PITCH_SPRING_DECAY_PER_S * dt)
      const p = pitchRef.current * decay
      const next = Math.abs(p) < 0.002 ? 0 : p
      pitchRef.current = next
      setPitch(next)
      if (next !== 0) {
        springRafRef.current = requestAnimationFrame(tick)
      } else {
        springRafRef.current = null
      }
    }
    springRafRef.current = requestAnimationFrame(tick)
  }, [cancelSpring])

  useEffect(() => () => cancelSpring(), [cancelSpring])

  const shutterRectsById = useMemo(() => computeShutterLadderRects(pitch), [pitch])

  const dragSessionRef = useRef<{
    pointerId: number
    startClientY: number
    startPitch: number
  } | null>(null)

  const onPitchDragPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!PARALLAX_HORIZON_DRAG_ENABLED) return
    cancelSpring()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragSessionRef.current = {
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startPitch: pitchRef.current,
    }
  }, [cancelSpring])

  const onPitchDragPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const s = dragSessionRef.current
    if (!s || e.pointerId !== s.pointerId) return
    const scale = readStageScaleFromEventTarget(e.currentTarget)
    const deltaRefPx = (e.clientY - s.startClientY) / scale
    // Drag down (positive deltaRefPx) → positive pitch (downhill shutter).
    const next = Math.max(-1, Math.min(1, s.startPitch + deltaRefPx / DRAG_TO_PITCH_REF_PX))
    pitchRef.current = next
    setPitch(next)
  }, [])

  const onPitchDragPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const s = dragSessionRef.current
      if (!s || e.pointerId !== s.pointerId) return
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      dragSessionRef.current = null
      if (Math.abs(pitchRef.current) > 0.002) {
        startSpringToZero()
      }
    },
    [startSpringToZero],
  )

  const rootStyle = {
    ['--stage-w' as string]: `${REFERENCE_WIDTH}px`,
    ['--stage-h' as string]: `${REFERENCE_HEIGHT}px`,
  } as CSSProperties

  const carPos = getParallaxPrototypeLayerPosition('car')
  const carSize = PARALLAX_PROTOTYPE_LAYER_SIZE_DEFAULT.car

  return (
    <div className="parallax-prototype-root scene-placeholder" style={rootStyle}>
      {PARALLAX_HORIZON_DRAG_ENABLED ? (
        <div
          className="parallax-prototype-horizon-drag-layer"
          onPointerDown={onPitchDragPointerDown}
          onPointerMove={onPitchDragPointerMove}
          onPointerUp={onPitchDragPointerUp}
          onPointerCancel={onPitchDragPointerUp}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 14,
            touchAction: 'none',
            cursor: 'ns-resize',
            pointerEvents: 'auto',
          }}
          aria-hidden
        />
      ) : null}
      {/* Before column: opaque BG6 masks ladder intrusion into sky */}
      {LADDER_LAYERS.map((layer, layerIndex) => {
        const r = shutterRectsById[layer.dataLayer]!
        const bottomPx = REFERENCE_HEIGHT - r.yPx - r.heightPx
        return (
          <div
            key={layer.dataLayer}
            className="parallax-prototype-ladder-strip parallax-prototype-band"
            style={{
              position: 'absolute',
              left: `${r.xPx}px`,
              bottom: `${bottomPx}px`,
              width: `${r.widthPx}px`,
              height: `${r.heightPx}px`,
              transform: 'none',
              boxSizing: 'border-box',
              backgroundColor: layer.color,
              zIndex: Z_LADDER_BASE + layerIndex,
            }}
            data-layer={layer.dataLayer}
            aria-hidden
          />
        )
      })}

      <div className="parallax-prototype-column">
        <div className="parallax-prototype-zone-bg6 parallax-prototype-bg-backdrop">
          <WideBand color={bgBlue(6)} zIndex={0} dataLayer="bg-6" />
        </div>

        <div className="parallax-prototype-zone-bg-horizon parallax-prototype-bg-horizon" aria-hidden />

        <div className="parallax-prototype-zone-overlap-reserve" aria-hidden />

        <div className="parallax-prototype-zone-fg parallax-prototype-fg-stack">
          <div className="parallax-prototype-fg-fg1">
            <WideBand color={fgGreen(1)} zIndex={0} dataLayer="fg-1" />
          </div>
        </div>
      </div>

      <div
        className="parallax-prototype-car"
        style={{
          zIndex: Z_CAR,
          left: `${carPos.xPx}px`,
          top: `${carPos.yPx}px`,
          bottom: 'auto',
          width: `${carSize.widthPx}px`,
          height: `${carSize.heightPx}px`,
          marginLeft: 0,
        }}
        aria-label="Prototype car placeholder"
      />
    </div>
  )
}
