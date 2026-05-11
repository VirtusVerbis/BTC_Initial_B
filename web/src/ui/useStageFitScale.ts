import { useEffect, useState, type RefObject } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'

const W = REFERENCE_WIDTH
const H = REFERENCE_HEIGHT

function clampScale(availW: number, availH: number): number {
  if (availW <= 0 || availH <= 0) return 0
  const raw = Math.min(availW / W, availH / H)
  return Math.min(1, raw)
}

function readShellContentSize(el: HTMLElement): { cw: number; ch: number } {
  const cs = getComputedStyle(el)
  const pl = parseFloat(cs.paddingLeft) || 0
  const pr = parseFloat(cs.paddingRight) || 0
  const pt = parseFloat(cs.paddingTop) || 0
  const pb = parseFloat(cs.paddingBottom) || 0
  const cw = Math.max(0, el.clientWidth - pl - pr)
  const ch = Math.max(0, el.clientHeight - pt - pb)
  return { cw, ch }
}

/**
 * Uniform scale so a W×H logical stage fits in the shell content area,
 * intersected with `visualViewport` when present. Max scale is 1.
 */
export function useStageFitScale(containerRef: RefObject<HTMLElement | null>): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const vv = window.visualViewport

    let raf = 0
    const apply = (cw: number, ch: number) => {
      let availW = cw
      let availH = ch
      if (vv) {
        availW = Math.min(cw, vv.width)
        availH = Math.min(ch, vv.height)
      }
      setScale(clampScale(availW, availH))
    }

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        raf = 0
        const { cw, ch } = readShellContentSize(el)
        apply(cw, ch)
      })
    }

    schedule()

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (cr) {
        apply(cr.width, cr.height)
      } else {
        schedule()
      }
    })
    try {
      ro.observe(el, { box: 'content-box' })
    } catch {
      ro.observe(el)
    }

    window.addEventListener('resize', schedule)
    vvListeners(vv, schedule)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      vvTeardown(vv, schedule)
    }
  }, [containerRef])

  return scale
}

function vvListeners(vv: VisualViewport | null, fn: () => void) {
  if (!vv) return
  vv.addEventListener('resize', fn)
  vv.addEventListener('scroll', fn)
}

function vvTeardown(vv: VisualViewport | null, fn: () => void) {
  if (!vv) return
  vv.removeEventListener('resize', fn)
  vv.removeEventListener('scroll', fn)
}
