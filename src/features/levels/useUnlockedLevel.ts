import { useCallback, useEffect, useRef, useState } from 'react'
import { getMeta } from '../../db/meta'
import { clampLevel } from './levels'

/** The single source of truth for reading the clamped unlocked level from meta. */
const loadUnlockedLevel = () => getMeta<number>('unlockedLevel', 0).then(clampLevel)

/** Loads `meta.unlockedLevel` into a ref (default 0 until resolved). */
export function useUnlockedLevel() {
  const ref = useRef(0)
  useEffect(() => {
    let active = true
    void loadUnlockedLevel().then((l) => {
      if (active) ref.current = l
    })
    return () => {
      active = false
    }
  }, [])
  return ref
}

/**
 * Loads `meta.unlockedLevel` into state (re-rendering when it resolves) and
 * returns a `raise(n)` to reflect a just-unlocked level immediately — monotonic,
 * so it never has to round-trip back through a (possibly not-yet-committed) write.
 * For UI that displays the level; runners that read it imperatively use the ref
 * variant above.
 */
export function useUnlockedLevelState(): [number, (n: number) => void] {
  const [level, setLevel] = useState(0)
  const raise = useCallback((n: number) => setLevel((prev) => Math.max(prev, clampLevel(n))), [])
  useEffect(() => {
    let active = true
    void loadUnlockedLevel().then((l) => {
      if (active) raise(l)
    })
    return () => {
      active = false
    }
  }, [raise])
  return [level, raise]
}
