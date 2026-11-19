import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/context'
import { EmptyState } from './EmptyState'

/** Shown on pages that need an account, instead of firing a request that can only fail. */
export function SignInPrompt({ title, text }: { title: string; text: string }) {
  const { t } = useTranslation()
  const { login } = useAuth()
  return (
    <EmptyState
      title={title}
      action={
        <button type="button" className="button" onClick={() => login()}>
          {t('app.signIn')}
        </button>
      }
    >
      {text}
    </EmptyState>
  )
}
