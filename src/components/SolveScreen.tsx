import type { ReactNode } from 'react'

/**
 * The shared "solve" layout: a flex column that grows to `minHeight` with its
 * `footer` anchored to the bottom (marginTop:auto) — the inner-scroll shell every
 * drill/test runner uses. `minHeight` defaults to `100%` so the screen fills its
 * scroll container (`.app-main`), not the viewport (a `vh` floor over-measures —
 * see #18). Pass className="screen" to make it the screen root, or omit it when
 * nesting inside an existing .screen (e.g. the Levels test).
 */
export function SolveScreen({
  minHeight = '100%',
  className,
  footer,
  footerPadTop = 24,
  children,
}: {
  minHeight?: string
  className?: string
  footer: ReactNode
  footerPadTop?: number
  children: ReactNode
}) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', minHeight }}>
      {children}
      <div style={{ marginTop: 'auto', paddingTop: footerPadTop }}>{footer}</div>
    </div>
  )
}
