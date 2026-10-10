'use client'

import { useCallback, useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

/** true in the browser after hydration, false during SSR. No effect needed. */
export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

const LS_EVENT = 'local-storage-change'

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * localStorage value that is null on the server and during hydration, then the
 * stored value. Writes notify every hook instance reading the same key.
 */
export function useLocalStorage(key: string): [string | null, (value: string | null) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const onStorage = (e: Event) => {
        if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent<string>).detail === key) cb()
      }
      window.addEventListener('storage', onStorage)
      window.addEventListener(LS_EVENT, onStorage)
      return () => {
        window.removeEventListener('storage', onStorage)
        window.removeEventListener(LS_EVENT, onStorage)
      }
    },
    [key],
  )
  const value = useSyncExternalStore(
    subscribe,
    () => readLS(key),
    () => null,
  )
  const set = useCallback(
    (v: string | null) => {
      try {
        if (v === null) localStorage.removeItem(key)
        else localStorage.setItem(key, v)
      } catch {}
      window.dispatchEvent(new CustomEvent(LS_EVENT, { detail: key }))
    },
    [key],
  )
  return [value, set]
}

/** The browser's IANA timezone, or the fallback during SSR. */
export function useBrowserTimezone(fallback: string) {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback
      } catch {
        return fallback
      }
    },
    () => fallback,
  )
}
