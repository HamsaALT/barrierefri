import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * An error message under a field. The "Fejl:" / "Error:" prefix means the message
 * doesn't rely on its red colour alone, and it's in the markup (not CSS content)
 * so it can be translated.
 */
export function FieldError({
  id,
  role,
  children,
}: {
  id?: string
  role?: 'alert'
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <p id={id} className="field-error" role={role}>
      {t('validation.errorPrefix')} {children}
    </p>
  )
}
