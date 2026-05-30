/// <reference lib="dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWS, useTheme } from './hooks'
import { wsClient } from './ws'

describe('useWS', () => {
  beforeEach(() => {
    // Replace wsClient.on with controllable spy
    vi.spyOn(wsClient, 'on').mockImplementation((cb: any) => {
      ;(wsClient as any)._cb = cb
      return () => { (wsClient as any)._cb = null }
    })
  })

  it('subscribes once even if handler identity changes', () => {
    const onSpy = wsClient.on as any
    const { rerender } = renderHook(({ h }) => useWS(h), {
      initialProps: { h: () => {} },
    })
    rerender({ h: () => {} })
    rerender({ h: () => {} })
    expect(onSpy).toHaveBeenCalledTimes(1)
  })

  it('routes messages through latest handler', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    const { rerender } = renderHook(({ h }) => useWS(h), {
      initialProps: { h: h1 as any },
    })
    ;(wsClient as any)._cb({ type: 'a' })
    expect(h1).toHaveBeenCalled()
    rerender({ h: h2 as any })
    ;(wsClient as any)._cb({ type: 'b' })
    expect(h2).toHaveBeenCalledWith({ type: 'b' })
  })
})

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
  })

  it('stores and applies explicit theme selection', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('auto')
    expect(result.current.resolvedTheme).toBe('light')

    act(() => result.current.setTheme('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')

    act(() => result.current.setTheme('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
