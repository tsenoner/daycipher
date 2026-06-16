let ctx: AudioContext | null = null

/** Create/resume the AudioContext on a user gesture (autoplay policy). */
export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') return
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

export function chime(ok: boolean): void {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.value = ok ? 880 : 220
  g.gain.setValueAtTime(0.0001, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
  o.connect(g).connect(ctx.destination)
  o.start()
  o.stop(ctx.currentTime + 0.18)
}

export function haptic(ok: boolean): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(ok ? 15 : [10, 60, 10])
  }
}

export function playFeedback(ok: boolean, opts: { sound: boolean }): void {
  if (opts.sound) chime(ok)
  haptic(ok)
}
