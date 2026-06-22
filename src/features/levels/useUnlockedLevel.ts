import { useEffect, useRef } from 'react'
import { getMeta } from '../../db/meta'
import { clampLevel } from './levels'

/** Loads `meta.unlockedLevel` into a ref (default 0 until resolved). */
export function useUnlockedLevel() {
  const ref = useRef(0)
  useEffect(() => {
    let active = true
    void getMeta<number>('unlockedLevel', 0).then((l) => {
      if (active) ref.current = clampLevel(l)
    })
    return () => {
      active = false
    }
  }, [])
  return ref
}
