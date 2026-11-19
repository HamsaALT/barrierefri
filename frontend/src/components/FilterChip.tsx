import type { ReactNode } from 'react'

/**
 * A filter as a pill-shaped chip. Underneath it is a real radio button or
 * checkbox, so arrow keys, Space and the "checked" state work as screen reader
 * and keyboard users expect. Checked chips show a tick as well as a colour.
 */
export function FilterChip({
  type = 'radio',
  name,
  checked,
  onChange,
  children,
}: {
  type?: 'radio' | 'checkbox'
  name?: string
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="chip">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  )
}
