import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import { getMeta } from '../../db/meta'
import { clampLevel } from './levels'

/** The single source of truth for reading the clamped unlocked level from meta. */
const loadUnlockedLevel = () => getMeta<number>('unlockedLevel', 0).then(clampLevel)

export interface UnlockedLevel {
  /** Live value for imperative reads (e.g. generating the next problem). */
  ref: MutableRefObject<number>
  /** Resolved level (0 until the DB read lands); re-renders when it resolves. */
  level: number
  /** True once `meta.unlockedLevel` has been read. */
  loaded: boolean
}

/**
 * Loads `meta.unlockedLevel` into a live ref plus resolved state. The ref serves
 * imperative reads (next-problem generation); `level`/`loaded` let a consumer
 * regenerate a problem it seeded at the default level before the read resolved.
 */
export function useUnlockedLevel(): UnlockedLevel {
  const ref = useRef(0)
  const [level, setLevel] = useState(0)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let active = true
    void loadUnlockedLevel().then((l) => {
      if (!active) return
      ref.current = l
      setLevel(l)
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])
  return { ref, level, loaded }
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
