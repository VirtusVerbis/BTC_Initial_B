import { describe, expect, it } from 'vitest'
import { resolveMobileAssetUrl } from '../ui/mobileAssetUrls'

describe('resolveMobileAssetUrl', () => {
  it('joins base URL with mobile folder and file name', () => {
    const u = resolveMobileAssetUrl('ring_0.png')
    expect(u).toContain('mobile/ring_0.png')
  })
})
