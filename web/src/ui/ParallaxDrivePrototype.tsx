import type { CSSProperties } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { HORIZONTAL_OVERFLOW_PX } from './parallaxPrototypeGeometry'
import {
  getParallaxPrototypeLayerPosition,
  PARALLAX_LADDER_STRIP_IDS,
  PARALLAX_PROTOTYPE_LAYER_SIZE_DEFAULT,
  type ParallaxLadderStripId,
} from './parallaxPrototypeLayerLayout'

/**
 * Scenic-drive prototype — unified BG5→FG2 overlap ladder (ascending z-index so tops stay visible).
 * Top-first geometry: nine equal Δ(top) steps BG5→FG2; visible FG2 rung matches step — FG2 extends under FG1 so FG1 overlaps/occludes lower pixels (thin band like BG4–FG3).
 * Default x/y per layer: parallaxPrototypeLayerLayout.ts (POSITION_DEFAULT + POSITION_ADJUST).
 * FG1 stays flex in bottom zone; BG6 backdrop in column. Future: animate hills via yOffsetPxByLayer.
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

/** Hill / bob offsets per ladder strip — hook for animation (indices align with LADDER_LAYERS). */
const yOffsetPxByLayer: number[] = Array.from({ length: LADDER_LAYERS.length }, () => 0)

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

export const ParallaxDrivePrototype = () => {
  const rootStyle = {
    ['--stage-w' as string]: `${REFERENCE_WIDTH}px`,
    ['--stage-h' as string]: `${REFERENCE_HEIGHT}px`,
  } as CSSProperties

  const carPos = getParallaxPrototypeLayerPosition('car')
  const carSize = PARALLAX_PROTOTYPE_LAYER_SIZE_DEFAULT.car

  return (
    <div className="parallax-prototype-root scene-placeholder" style={rootStyle}>
      {/* Before column: opaque BG6 masks ladder intrusion into sky */}
      {LADDER_LAYERS.map((layer, layerIndex) => {
        const pos = getParallaxPrototypeLayerPosition(layer.dataLayer)
        const size = PARALLAX_PROTOTYPE_LAYER_SIZE_DEFAULT[layer.dataLayer]
        const yTopPx = pos.yPx - yOffsetPxByLayer[layerIndex]!
        const bottomPx = REFERENCE_HEIGHT - yTopPx - size.heightPx
        return (
          <div
            key={layer.dataLayer}
            className="parallax-prototype-ladder-strip parallax-prototype-band"
            style={{
              position: 'absolute',
              left: `${pos.xPx}px`,
              bottom: `${bottomPx}px`,
              width: `${size.widthPx}px`,
              height: `${size.heightPx}px`,
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
