import { type RefObject } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { useStageFitScale } from './useStageFitScale'

const W = REFERENCE_WIDTH
const H = REFERENCE_HEIGHT

interface StageProps {
  children: React.ReactNode
  /** `main.app-shell` (or any flex parent) whose content box defines max fit area. */
  shellRef: RefObject<HTMLElement | null>
}

export const Stage = ({ children, shellRef }: StageProps) => {
  const scale = useStageFitScale(shellRef)

  return (
    <div className="stage-shell">
      <div
        className="stage-scale-outer"
        style={{
          width: W * scale,
          height: H * scale,
        }}
      >
        <div
          className="stage"
          style={{
            width: W,
            height: H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
