import type { ReactNode } from 'react'

/**
 * The shared "solve" layout: a flex column that grows to `minHeight` with its
 * `footer` anchored to the bottom (marginTop:auto) — the inner-scroll shell every
 * drill/test runner uses. Pass className="screen" to make it the screen root, or
 * omit it when nesting inside an existing .screen (e.g. the Levels test).
 */
export function SolveScreen({
  minHeight,
  className,
  footer,
  footerPadTop = 24,
  children,
}: {
  minHeight: string
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
