/** Ordered ladder strip ids (indices align with scenic-drive ladder rendering). */
export const PARALLAX_LADDER_STRIP_IDS = [
  'bg-5',
  'bg-4',
  'bg-3',
  'bg-2',
  'bg-1',
  'fg-6',
  'fg-5',
  'fg-4',
  'fg-3',
  'fg-2',
] as const

export type ParallaxLadderStripId = (typeof PARALLAX_LADDER_STRIP_IDS)[number]
