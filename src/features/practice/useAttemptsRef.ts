import { type MutableRefObject, useEffect, useRef } from 'react'
import type { Attempt } from '../../db/db'
import { listAttempts } from '../../db/attempts'

/**
 * Loads the persisted attempt history into a ref on mount (empty until the read
 * lands). Practice runners read it imperatively to feed the adaptive selector and
 * prepend freshly graded attempts. Shared by useDrill, useGuided, and useSpeedrun.
 */
export function useAttemptsRef(): MutableRefObject<Attempt[]> {
  const ref = useRef<Attempt[]>([])
  useEffect(() => {
    let active = true
    void listAttempts().then((a) => {
      if (active) ref.current = a
    })
    return () => {
      active = false
    }
  }, [])
  return ref
}
