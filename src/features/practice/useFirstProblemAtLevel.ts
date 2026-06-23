import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect, useRef } from 'react'
import type { Attempt } from '../../db/db'
import type { Problem } from './drill'
import { nextProblem } from './selector'

/**
 * Practice runners lazily seed problem #1 in a `useState` initializer, which runs
 * synchronously — before `useUnlockedLevel` resolves — so the seed is drawn at the
 * default level 0. Once the real level lands, redraw the first problem at it, but
 * only when it differs from the seed (skip 0, so default users see no swap) and
 * only while the first problem is still untouched (`isPristine`). Fires at most once.
 * Shared by {@link useDrill} and {@link useGuided} (issue #21).
 */
export function useFirstProblemAtLevel<S extends { problem: Problem }>(
  loaded: boolean,
  level: number,
  attemptsRef: MutableRefObject<Attempt[]>,
  setState: Dispatch<SetStateAction<S>>,
  isPristine: (s: S) => boolean,
) {
  const done = useRef(false)
  useEffect(() => {
    if (!loaded || done.current) return
    done.current = true
    if (level === 0) return
    const fresh = nextProblem(attemptsRef.current, level)
    setState((s) => (isPristine(s) ? { ...s, problem: fresh } : s))
    // attemptsRef/setState are stable; isPristine is re-created per render but the
    // `done` guard makes the redraw fire once, so it's deliberately not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, level])
}
