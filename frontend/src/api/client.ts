import { accessToken } from '../auth/keycloak'
import i18n from '../i18n'
import type { Problem } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly problem: Problem

  constructor(status: number, problem: Problem) {
    super(problem.detail ?? problem.title ?? `Request failed (${status})`)
    this.status = status
    this.problem = problem
  }

  /** Validation messages for one field, matched case-insensitively. */
  fieldErrors(field: string): string[] {
    const errors = this.problem.errors ?? {}
    const key = Object.keys(errors).find((k) => k.toLowerCase() === field.toLowerCase())
    return key ? errors[key] : []
  }
}

type Body = FormData | object | undefined

export async function api<T>(
  path: string,
  options: { method?: string; body?: Body } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = await accessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(`/api${path}`, { method: options.method ?? 'GET', headers, body })
  } catch {
    throw new ApiError(0, { detail: 'Network error' })
  }

  if (!response.ok) {
    const problem: Problem = await response.json().catch(() => ({}))
    throw new ApiError(response.status, problem)
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

/**
 * Any error as a sentence in the user's language. The backend sends a stable code
 * with each problem; its English detail is meant for API users, not shown here.
 */
export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    const { code, params } = error.problem
    if (code && i18n.exists(`errors.${code}`)) {
      const translated = Object.fromEntries(
        Object.entries(params ?? {}).map(([k, v]) => [
          k,
          typeof v === 'string' && i18n.exists(`status.${v}`) ? i18n.t(`status.${v}`) : v,
        ]),
      )
      return i18n.t(`errors.${code}`, translated)
    }
    if (error.status === 0) return i18n.t('errors.network')
    if (error.status === 401) return i18n.t('errors.unauthorized')
    if (error.status === 403) return i18n.t('errors.forbidden')
    if (error.status === 404) return i18n.t('errors.NOT_FOUND')
    if (error.status === 400) return i18n.t('errors.validation')
  }
  return i18n.t('errors.generic')
}
