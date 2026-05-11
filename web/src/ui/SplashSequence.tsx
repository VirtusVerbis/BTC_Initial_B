import { useCallback, useEffect, useRef, useState } from 'react'
import { SPLASH_DISPLAY_MS, TITLE_DISPLAY_MS } from './androidMirrorConstants'
import { resolveMobileAssetUrl } from './mobileAssetUrls'

interface SplashSequenceProps {
  onDone: () => void
}

type Phase = 0 | 1 | 2

/**
 * Two full-screen splashes (`vv_splash`, `btc_punchup_cover`) then main scene — mirrors Android `splashPhase`.
 */
export const SplashSequence = ({ onDone }: SplashSequenceProps) => {
  const [phase, setPhase] = useState<Phase>(0)
  const finished = useRef(false)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    onDone()
  }, [onDone])

  useEffect(() => {
    if (phase === 0) {
      const id = window.setTimeout(() => setPhase((p) => (p === 0 ? 1 : p)), SPLASH_DISPLAY_MS)
      return () => window.clearTimeout(id)
    }
    if (phase === 1) {
      const id = window.setTimeout(() => setPhase((p) => (p === 1 ? 2 : p)), TITLE_DISPLAY_MS)
      return () => window.clearTimeout(id)
    }
    return undefined
  }, [phase])

  useEffect(() => {
    if (phase === 2) finish()
  }, [phase, finish])

  if (phase >= 2) return null

  const src =
    phase === 0 ? resolveMobileAssetUrl('vv_splash.png') : resolveMobileAssetUrl('btc_punchup_cover.png')

  return (
    <div
      className="splash-sequence"
      onClick={() => setPhase((p) => (p === 0 ? 1 : 2))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setPhase((p) => (p === 0 ? 1 : 2))
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={phase === 0 ? 'Dismiss splash' : 'Dismiss title'}
    >
      <img src={src} alt="" className="splash-sequence-img" draggable={false} />
    </div>
  )
}
