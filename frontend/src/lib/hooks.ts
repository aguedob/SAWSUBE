import { useEffect, useRef, useState, useCallback } from 'react'
import { wsClient } from './ws'

export type ThemeMode = 'light' | 'dark' | 'auto'

const THEME_STORAGE_KEY = 'theme'

function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  return 'auto'
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'auto' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

export function useWS(handler: (msg: any) => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const off = wsClient.on((m) => ref.current(m))
    return () => { off() }
  }, [])
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (getStoredTheme() === 'auto') applyTheme('auto')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next)
  }, [])

  const resolvedTheme = theme === 'auto'
    ? (systemPrefersDark() ? 'dark' : 'light')
    : theme

  return { theme, resolvedTheme, setTheme }
}
