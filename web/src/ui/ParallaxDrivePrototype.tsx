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
 * **FG road art**: all FG layers `fg-1`…`fg-6` show vertical slices of two full atlases (`road_straight_a_full.png` / `road_straight_b_full.png`); `opacity` toggles every `FG_ROAD_STRAIGHT_ALTERNATION_MS` so both bitmaps stay mounted and decoded.
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

/** Interval between swapping FG road atlases (`road_straight_a` vs `road_straight_b`) for motion illusion. */
const FG_ROAD_STRAIGHT_ALTERNATION_MS = 100

/** Extra ref px height on nearer FG strips (grow upward, same bottom) to hide CSS background seams. */
const FG_ROAD_STRIP_OVERLAP_PX = 2

/** Full-bleed straight road PNG pixel size (see `public/mobile/road_straight_*_full.png`). */
const ROAD_STRAIGHT_ATLAS_HEIGHT_PX = 1268

const ROAD_STRAIGHT_A_URL = resolveMobileAssetUrl('road_straight_a_full.png')
const ROAD_STRAIGHT_B_URL = resolveMobileAssetUrl('road_straight_b_full.png')

/**
 * Source slice (top-left origin) for each FG strip index: 1 = fg-1 (nearest) … 6 = fg-6 (farthest).
 * Each slice spans the full atlas width (1080px). Heights sum to {@link ROAD_STRAIGHT_ATLAS_HEIGHT_PX}.
 */
const FG_STRAIGHT_ATLAS_SLICE_BY_STRIP_INDEX: Record<
  1 | 2 | 3 | 4 | 5 | 6,
  { readonly srcY: number; readonly srcH: number }
> = {
  1: { srcY: 885, srcH: 383 },
  2: { srcY: 708, srcH: 177 },
  3: { srcY: 531, srcH: 177 },
  4: { srcY: 354, srcH: 177 },
  5: { srcY: 177, srcH: 177 },
  6: { srcY: 0, srcH: 177 },
}

function fgStripIndexFromLadderId(id: ParallaxLadderStripId): 1 | 2 | 3 | 4 | 5 | 6 | null {
  if (!id.startsWith('fg-')) return null
  const n = Number(id.slice(3))
  if (n < 1 || n > 6 || !Number.isInteger(n)) return null
  return n as 1 | 2 | 3 | 4 | 5 | 6
}

function roadStraightAtlasBackgroundStyles(
  imageSrc: string,
  slice: { srcY: number; srcH: number },
  layoutWidthPx: number,
  layoutHeightPx: number,
): Pick<
  CSSProperties,
  'backgroundImage' | 'backgroundSize' | 'backgroundRepeat' | 'backgroundPosition'
> {
  const { srcY, srcH } = slice
  if (srcH <= 0 || layoutHeightPx <= 0) {
    return {
      backgroundImage: `url(${imageSrc})`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    }
  }
  const bgH = (ROAD_STRAIGHT_ATLAS_HEIGHT_PX * layoutHeightPx) / srcH
  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${layoutWidthPx}px ${bgH}px`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `center ${-(srcY * layoutHeightPx) / srcH}px`,
  }
}

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

/** Both atlas URLs for decode preload on mount. */
const FG_ROAD_PRELOAD_URLS: readonly string[] = [ROAD_STRAIGHT_A_URL, ROAD_STRAIGHT_B_URL]

const FgRoadStraightAtlasDual = ({
  urlStraightA,
  urlStraightB,
  showStraightB,
  slice,
  layoutWidthPx,
  layoutHeightPx,
}: {
  urlStraightA: string
  urlStraightB: string
  showStraightB: boolean
  slice: { srcY: number; srcH: number }
  layoutWidthPx: number
  layoutHeightPx: number
}) => {
  const a = roadStraightAtlasBackgroundStyles(urlStraightA, slice, layoutWidthPx, layoutHeightPx)
  const b = roadStraightAtlasBackgroundStyles(urlStraightB, slice, layoutWidthPx, layoutHeightPx)
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: showStraightB ? 0 : 1,
          pointerEvents: 'none',
          ...a,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: showStraightB ? 1 : 0,
          pointerEvents: 'none',
          ...b,
        }}
      />
    </>
  )
}

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

  const [showStraightBRoad, setShowStraightBRoad] = useState(false)

  useEffect(() => {
    for (const src of FG_ROAD_PRELOAD_URLS) {
      const img = new Image()
      img.src = src
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setShowStraightBRoad((v) => !v)
    }, FG_ROAD_STRAIGHT_ALTERNATION_MS)
    return () => window.clearInterval(id)
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
  const fg1OverlapPx = fg1Size.heightPx > 0 ? FG_ROAD_STRIP_OVERLAP_PX : 0
  const fg1DisplayHeightPx = fg1Size.heightPx + fg1OverlapPx

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
        const fgStripIdx = fgStripIndexFromLadderId(layer.dataLayer)
        const fgAtlasSlice =
          fgStripIdx !== null && fgStripIdx >= 2 ? FG_STRAIGHT_ATLAS_SLICE_BY_STRIP_INDEX[fgStripIdx] : null
        const fgRoadOverlapPx =
          fgStripIdx != null && fgStripIdx >= 2 && fgStripIdx <= 5 && r.heightPx > 0
            ? FG_ROAD_STRIP_OVERLAP_PX
            : 0
        const fgRoadDisplayHeightPx = r.heightPx + fgRoadOverlapPx
        return (
          <div
            key={layer.dataLayer}
            className="parallax-prototype-ladder-strip parallax-prototype-band"
            style={{
              position: 'absolute',
              left: `${r.xPx}px`,
              bottom: `${bottomPx}px`,
              width: `${r.widthPx}px`,
              height: `${fgAtlasSlice ? fgRoadDisplayHeightPx : r.heightPx}px`,
              transform: txPx !== 0 ? `translateX(${txPx}px)` : 'none',
              boxSizing: 'border-box',
              ...(fgAtlasSlice ? {} : { backgroundColor: layer.color }),
              zIndex: Z_LADDER_BASE + layerIndex,
            }}
            data-layer={layer.dataLayer}
            aria-hidden
          >
            {fgAtlasSlice ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <FgRoadStraightAtlasDual
                  urlStraightA={ROAD_STRAIGHT_A_URL}
                  urlStraightB={ROAD_STRAIGHT_B_URL}
                  showStraightB={showStraightBRoad}
                  slice={fgAtlasSlice}
                  layoutWidthPx={r.widthPx}
                  layoutHeightPx={fgRoadDisplayHeightPx}
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
          height: `${fg1DisplayHeightPx}px`,
          boxSizing: 'border-box',
          zIndex: Z_FG1,
        }}
        data-layer="fg-1"
        aria-hidden
      >
        <FgRoadStraightAtlasDual
          urlStraightA={ROAD_STRAIGHT_A_URL}
          urlStraightB={ROAD_STRAIGHT_B_URL}
          showStraightB={showStraightBRoad}
          slice={FG_STRAIGHT_ATLAS_SLICE_BY_STRIP_INDEX[1]}
          layoutWidthPx={fg1Size.widthPx}
          layoutHeightPx={fg1DisplayHeightPx}
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
