import { useEffect, useState } from 'react'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (standalone) return null
  if (deferred) {
    return (
      <button
        onClick={() => {
          // The event is single-use; clear it so the button can't fire prompt() twice.
          void deferred.prompt()
          setDeferred(null)
        }}
        style={{ minHeight: 44 }}
      >
        Install Daycipher
      </button>
    )
  }
  if (isIOS) return <p className="muted">To install: tap Share, then “Add to Home Screen”.</p>
  return null
}
