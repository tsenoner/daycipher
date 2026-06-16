import { registerSW } from 'virtual:pwa-register'

type Listener = () => void
const needRefresh = new Set<Listener>()
let doUpdate: (reload?: boolean) => Promise<void> = async () => {}

export function initPWA(): void {
  doUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh.forEach((l) => l())
    },
    onOfflineReady() {
      /* app cached for offline use */
    },
  })
}

export function onNeedRefresh(l: Listener): () => void {
  needRefresh.add(l)
  return () => needRefresh.delete(l)
}

export function applyUpdate(): void {
  void doUpdate(true)
}
