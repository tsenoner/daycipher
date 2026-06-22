import type { CSSProperties, ReactNode } from 'react'

const base: CSSProperties = {
  marginTop: 16,
  width: '100%',
  minHeight: 'var(--tap)',
  border: 0,
  borderRadius: 12,
  background: 'var(--burg)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 16,
}

/** Pass to PrimaryButton's `style` for the muted, outlined secondary variant. */
export const secondaryButtonStyle: CSSProperties = {
  background: 'var(--card)',
  color: 'var(--ink)',
  border: '1px solid var(--line)',
}

/** The full-width burgundy call-to-action shared by the drill/test runners. */
export function PrimaryButton({
  onClick,
  children,
  style,
}: {
  onClick: () => void
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <button type="button" onClick={onClick} style={style ? { ...base, ...style } : base}>
      {children}
    </button>
  )
}
