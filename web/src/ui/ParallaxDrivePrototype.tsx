import type { CSSProperties } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'

/**
 * Scenic-drive placeholder stack — BG horizon 50–66%, FG overlaps stacked from bottom with FG6 top at mid-screen.
 * FG bottom spacing: `(midScreen - stripHeight) / 5` so FG1 stays flush bottom (flex) and FG6 top = 50% stage height.
 * Spec: web/docs/stage-parallax-driving.md
 */

const HORIZONTAL_OVERFLOW_PX = 480

/** FG1 height = 60% of bottom third → shared by FG2–FG6 overlap strips */
const FG_ZONE_FRAC = 1 / 3
const FG1_FRAC_OF_ZONE = 0.6
const stripHeightPx = Math.round(FG1_FRAC_OF_ZONE * REFERENCE_HEIGHT * FG_ZONE_FRAC)

/** FG6 top pinned at mid-screen; equal spacing between bottoms FG1→FG6 is `(mid - H) / 5`. */
const midScreenFromBottomPx = 0.5 * REFERENCE_HEIGHT

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

/** BG6 … BG1 */
const Z_BG6 = 0

/** FG6 … FG2 absolute overlaps (above BG horizon z-index) */
const Z_FG6_ABS = 6

const Z_CAR = 15

const bgBlue = (bgIndex1To6: number): string =>
  mixRgb(BG_LIGHT, BG_DARK, 6 - bgIndex1To6, BG_STEPS)

const fgGreen = (fgIndex1To6: number): string =>
  mixRgb(ROAD_DARK, ROAD_LIGHT, 6 - fgIndex1To6, FG_STEPS)

const overscanFlexStyle = {
  width: `calc(100% + ${HORIZONTAL_OVERFLOW_PX}px)`,
  marginLeft: `${-HORIZONTAL_OVERFLOW_PX / 2}px`,
} satisfies CSSProperties

const fgAbsBaseStyle = {
  position: 'absolute' as const,
  left: '50%',
  transform: 'translateX(-50%)',
  width: `calc(100% + ${HORIZONTAL_OVERFLOW_PX}px)`,
  boxSizing: 'border-box' as const,
}

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

/** Bottom edge from stage bottom: FG1 at 0; FG2..FG6 at `(idx)*step` so FG6 top hits mid-screen. */
const fgBottomStepPx = (midScreenFromBottomPx - stripHeightPx) / 5

const fgOverlapBottomPx = (fgIndex: number): number =>
  Math.round((fgIndex - 1) * fgBottomStepPx)

export const ParallaxDrivePrototype = () => {
  const rootStyle = {
    ['--stage-w' as string]: `${REFERENCE_WIDTH}px`,
    ['--stage-h' as string]: `${REFERENCE_HEIGHT}px`,
  } as CSSProperties

  return (
    <div className="parallax-prototype-root scene-placeholder" style={rootStyle}>
      <div className="parallax-prototype-column">
        <div className="parallax-prototype-zone-bg6 parallax-prototype-bg-backdrop">
          <WideBand color={bgBlue(6)} zIndex={Z_BG6} dataLayer="bg-6" />
        </div>

        <div className="parallax-prototype-zone-bg-horizon parallax-prototype-bg-horizon">
          {[5, 4, 3, 2, 1].map((n) => (
            <WideBand
              key={`bg-${n}`}
              color={bgBlue(n)}
              zIndex={Z_BG6 + (6 - n)}
              dataLayer={`bg-${n}`}
            />
          ))}
        </div>

        {/* In-flow spacer for 33–50% from bottom (absolute FG2–FG6 paint here); keeps column height sum = 100% */}
        <div className="parallax-prototype-zone-overlap-reserve" aria-hidden />

        <div className="parallax-prototype-zone-fg parallax-prototype-fg-stack">
          <div className="parallax-prototype-fg-fg1">
            <WideBand color={fgGreen(1)} zIndex={0} dataLayer="fg-1" />
          </div>
        </div>
      </div>

      {[6, 5, 4, 3, 2].map((n) => (
        <div
          key={`fg-abs-${n}`}
          className="parallax-prototype-fg-abs parallax-prototype-band"
          style={{
            ...fgAbsBaseStyle,
            backgroundColor: fgGreen(n),
            zIndex: Z_FG6_ABS + (6 - n),
            bottom: `${fgOverlapBottomPx(n)}px`,
            height: `${stripHeightPx}px`,
          }}
          data-layer={`fg-${n}`}
          aria-hidden
        />
      ))}

      <div className="parallax-prototype-car" style={{ zIndex: Z_CAR }} aria-label="Prototype car placeholder" />
    </div>
  )
}
