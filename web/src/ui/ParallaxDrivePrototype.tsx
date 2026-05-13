import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { lateralTranslateRefPx } from './parallaxPrototypeGeometry'
import {
  getParallaxPrototypeLayerPosition,
  PARALLAX_LADDER_STRIP_IDS,
  PARALLAX_PROTOTYPE_LAYER_SIZE_DEFAULT,
  type ParallaxLadderStripId,
} from './parallaxPrototypeLayerLayout'
import { resolveMobileAssetUrl } from './mobileAssetUrls'
import { computeShutterLadderRects } from './parallaxShutterLayout'

/**
 * Scenic-drive prototype — ladder strips `bg-5`…`fg-2` (ascending z-index). Neutral layout matches
 * [`parallaxShutterLayout`](./parallaxShutterLayout.ts) seam band; non-ladder bands use layout defaults + CSS flex.
 * Default x/y per layer: parallaxPrototypeLayerLayout.ts (POSITION_DEFAULT + POSITION_ADJUST).
 * **Pitch / shutter**: ladder strips use `computeShutterLadderRects(pitch)` (constant seam band, blues vs greens share height).
 * Drag **up** → uphill (`pitch < 0`); drag **down** → downhill (`pitch > 0`). **Pointer release** eases `pitch` back to 0 (spring).
 * Drag **left** → positive `lateral`; drag **right** → negative `lateral` → BG1–BG6 `translateX` (differential parallax). Release eases `lateral` to 0 with the same spring as pitch.
 * **FG road art**: all FG layers `fg-1`…`fg-6` are absolutely positioned and show two stretched layers (`road_NNN.png` / `road_NNNa.png`); `opacity` toggles every `FG_ROAD_IMAGE_SET_ALTERNATION_MS` so both bitmaps stay mounted.
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

/** BG5 furthest (layerIndex 0) … FG2 nearest (layerIndex 9); FG1 absolute strip z-index 13. */
const Z_LADDER_BASE = 2
const Z_FG1 = 13
const Z_CAR = 15

/** Interval between swapping FG road PNG sets (`road_XXX.png` vs `road_XXXa.png`) for motion illusion. */
const FG_ROAD_IMAGE_SET_ALTERNATION_MS = 100

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

/** Set 1: `road_NNN.png`; set 2: `road_NNNa.png`. `fgStripIndex` is 1…6 (FG-1 … FG-6 filenames). */
function resolveFgRoadStripUrl(fgStripIndex1To6: number, useAlternateSet: boolean): string {
  const n = String(fgStripIndex1To6).padStart(3, '0')
  const file = useAlternateSet ? `road_${n}a.png` : `road_${n}.png`
  return resolveMobileAssetUrl(file)
}

const stretchedBackgroundFromUrl = (imageSrc: string): Pick<
  CSSProperties,
  'backgroundImage' | 'backgroundSize' | 'backgroundRepeat' | 'backgroundPosition'
> => ({
  backgroundImage: `url(${imageSrc})`,
  backgroundSize: '100% 100%',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
})

type FgRoadUrlPair = { set1: string; set2: string }

/** All FG road strip URLs (set 1 + set 2) for decode preload on mount. */
const FG_ROAD_PRELOAD_URLS = ([1, 2, 3, 4, 5, 6] as const).flatMap((i) => [
  resolveFgRoadStripUrl(i, false),
  resolveFgRoadStripUrl(i, true),
])

const FgRoadDualStretch = ({
  urlSet1,
  urlSet2,
  showSet2,
}: {
  urlSet1: string
  urlSet2: string
  showSet2: boolean
}) => (
  <>
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        opacity: showSet2 ? 0 : 1,
        pointerEvents: 'none',
        ...stretchedBackgroundFromUrl(urlSet1),
      }}
    />
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        opacity: showSet2 ? 1 : 0,
        pointerEvents: 'none',
        ...stretchedBackgroundFromUrl(urlSet2),
      }}
    />
  </>
)

/** 2× stage column width; margin centers strip on parent (see PARALLAX_STRIP_* ref px). */
const overscanFlexStyle = {
  width: '200%',
  marginLeft: '-50%',
} satisfies CSSProperties

const ParallaxBgCenterGuide = () => (
  <div
    aria-hidden
    style={{
      position: 'absolute',
      left: '50%',
      top: 0,
      bottom: 0,
      width: 2,
      marginLeft: -1,
      background: 'rgba(255, 220, 60, 0.88)',
      boxShadow: '0 0 6px rgba(0, 0, 0, 0.45)',
      pointerEvents: 'none',
      zIndex: 1,
    }}
  />
)

const WideBand = ({
  color,
  zIndex,
  dataLayer,
  translateXPx = 0,
  showCenterGuide = false,
}: {
  color: string
  zIndex: number
  dataLayer: string
  translateXPx?: number
  showCenterGuide?: boolean
}) => (
  <div
    className="parallax-prototype-band"
    style={{
      ...overscanFlexStyle,
      backgroundColor: color,
      zIndex,
      position: 'relative',
      transform: translateXPx !== 0 ? `translateX(${translateXPx}px)` : 'none',
    }}
    data-layer={dataLayer}
    aria-hidden
  >
    {showCenterGuide ? <ParallaxBgCenterGuide /> : null}
  </div>
)

const isBgLadderStrip = (id: ParallaxLadderStripId): id is 'bg-5' | 'bg-4' | 'bg-3' | 'bg-2' | 'bg-1' =>
  id.startsWith('bg-')

/** Set `false` to disable the full-stage vertical drag test layer when design matures. */
const PARALLAX_HORIZON_DRAG_ENABLED = true

/** Reference-px drag distance for full `pitch` sweep from 0 to 1 (or 0 to -1). */
const DRAG_TO_PITCH_REF_PX = 480

/** Reference-px drag distance for full `lateral` sweep from 0 to 1 (or 0 to -1). */
const DRAG_TO_LATERAL_REF_PX = 480

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

  const [lateral, setLateral] = useState(0)
  const lateralRef = useRef(0)
  lateralRef.current = lateral

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
      let p = pitchRef.current * decay
      let l = lateralRef.current * decay
      if (Math.abs(p) < 0.002) p = 0
      if (Math.abs(l) < 0.002) l = 0
      pitchRef.current = p
      lateralRef.current = l
      setPitch(p)
      setLateral(l)
      if (p !== 0 || l !== 0) {
        springRafRef.current = requestAnimationFrame(tick)
      } else {
        springRafRef.current = null
      }
    }
    springRafRef.current = requestAnimationFrame(tick)
  }, [cancelSpring])

  useEffect(() => () => cancelSpring(), [cancelSpring])

  const shutterRectsById = useMemo(() => computeShutterLadderRects(pitch), [pitch])

  const [useAlternateFgRoadSet, setUseAlternateFgRoadSet] = useState(false)

  useEffect(() => {
    for (const src of FG_ROAD_PRELOAD_URLS) {
      const img = new Image()
      img.src = src
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setUseAlternateFgRoadSet((v) => !v)
    }, FG_ROAD_IMAGE_SET_ALTERNATION_MS)
    return () => window.clearInterval(id)
  }, [])

  const fg1RoadUrlPair = useMemo(
    (): FgRoadUrlPair => ({
      set1: resolveFgRoadStripUrl(1, false),
      set2: resolveFgRoadStripUrl(1, true),
    }),
    [],
  )

  const fgLadderRoadUrlPairs = useMemo((): Partial<Record<ParallaxLadderStripId, FgRoadUrlPair>> => {
    return {
      'fg-2': { set1: resolveFgRoadStripUrl(2, false), set2: resolveFgRoadStripUrl(2, true) },
      'fg-3': { set1: resolveFgRoadStripUrl(3, false), set2: resolveFgRoadStripUrl(3, true) },
      'fg-4': { set1: resolveFgRoadStripUrl(4, false), set2: resolveFgRoadStripUrl(4, true) },
      'fg-5': { set1: resolveFgRoadStripUrl(5, false), set2: resolveFgRoadStripUrl(5, true) },
      'fg-6': { set1: resolveFgRoadStripUrl(6, false), set2: resolveFgRoadStripUrl(6, true) },
    }
  }, [])

  const dragSessionRef = useRef<{
    pointerId: number
    startClientY: number
    startClientX: number
    startPitch: number
    startLateral: number
  } | null>(null)

  const onPitchDragPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!PARALLAX_HORIZON_DRAG_ENABLED) return
    cancelSpring()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragSessionRef.current = {
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startClientX: e.clientX,
      startPitch: pitchRef.current,
      startLateral: lateralRef.current,
    }
  }, [cancelSpring])

  const onPitchDragPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const s = dragSessionRef.current
    if (!s || e.pointerId !== s.pointerId) return
    const scale = readStageScaleFromEventTarget(e.currentTarget)
    const deltaYRefPx = (e.clientY - s.startClientY) / scale
    // Drag down (positive deltaYRefPx) → positive pitch (downhill shutter).
    const nextPitch = Math.max(-1, Math.min(1, s.startPitch + deltaYRefPx / DRAG_TO_PITCH_REF_PX))
    pitchRef.current = nextPitch
    setPitch(nextPitch)

    const deltaXRefPx = (e.clientX - s.startClientX) / scale
    // Inverted X: drag left (negative deltaXRefPx) → positive lateral.
    const nextLateral = Math.max(-1, Math.min(1, s.startLateral - deltaXRefPx / DRAG_TO_LATERAL_REF_PX))
    lateralRef.current = nextLateral
    setLateral(nextLateral)
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
      if (Math.abs(pitchRef.current) > 0.002 || Math.abs(lateralRef.current) > 0.002) {
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
  const fg1Pos = getParallaxPrototypeLayerPosition('fg-1')
  const fg1Size = PARALLAX_PROTOTYPE_LAYER_SIZE_DEFAULT['fg-1']

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
            cursor: 'move',
            pointerEvents: 'auto',
          }}
          aria-hidden
        />
      ) : null}
      {/* Before column: opaque BG6 masks ladder intrusion into sky */}
      {LADDER_LAYERS.map((layer, layerIndex) => {
        const r = shutterRectsById[layer.dataLayer]!
        const bottomPx = REFERENCE_HEIGHT - r.yPx - r.heightPx
        const bgLateral = isBgLadderStrip(layer.dataLayer)
        const txPx = bgLateral ? lateralTranslateRefPx(lateral, layer.dataLayer) : 0
        const roadPair = fgLadderRoadUrlPairs[layer.dataLayer]
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
              transform: txPx !== 0 ? `translateX(${txPx}px)` : 'none',
              boxSizing: 'border-box',
              ...(roadPair ? {} : { backgroundColor: layer.color }),
              zIndex: Z_LADDER_BASE + layerIndex,
            }}
            data-layer={layer.dataLayer}
            aria-hidden
          >
            {roadPair ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <FgRoadDualStretch
                  urlSet1={roadPair.set1}
                  urlSet2={roadPair.set2}
                  showSet2={useAlternateFgRoadSet}
                />
              </div>
            ) : null}
            {bgLateral ? <ParallaxBgCenterGuide /> : null}
          </div>
        )
      })}

      <div className="parallax-prototype-column">
        <div className="parallax-prototype-zone-bg6 parallax-prototype-bg-backdrop">
          <WideBand
            color={bgBlue(6)}
            zIndex={0}
            dataLayer="bg-6"
            translateXPx={lateralTranslateRefPx(lateral, 'bg-6')}
            showCenterGuide
          />
        </div>

        <div className="parallax-prototype-zone-bg-horizon parallax-prototype-bg-horizon" aria-hidden />

        <div className="parallax-prototype-zone-overlap-reserve" aria-hidden />
      </div>

      <div
        className="parallax-prototype-band"
        style={{
          position: 'absolute',
          left: `${fg1Pos.xPx}px`,
          bottom: `${REFERENCE_HEIGHT - fg1Pos.yPx - fg1Size.heightPx}px`,
          width: `${fg1Size.widthPx}px`,
          height: `${fg1Size.heightPx}px`,
          boxSizing: 'border-box',
          zIndex: Z_FG1,
        }}
        data-layer="fg-1"
        aria-hidden
      >
        <FgRoadDualStretch
          urlSet1={fg1RoadUrlPair.set1}
          urlSet2={fg1RoadUrlPair.set2}
          showSet2={useAlternateFgRoadSet}
        />
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
