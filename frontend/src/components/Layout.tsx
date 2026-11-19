import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/context'
import { HEADER_COMPACT, useMediaQuery } from '../lib/useMediaQuery'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Layout() {
  const { t } = useTranslation()
  const { user, isStaff, login, logout, register } = useAuth()
  const location = useLocation()
  const firstRender = useRef(true)
  const compact = useMediaQuery(HEADER_COMPACT)
  // The page the menu was opened on: following a link closes it without an extra render.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const menuOpen = compact && openOn === location.pathname
  const menuButton = useRef<HTMLButtonElement>(null)

  // A single-page app doesn't announce page changes the way a full page load does.
  // Moving focus to the new page's heading tells screen reader users where they are.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    document.getElementById('page-title')?.focus()
  }, [location.pathname])

  // While the menu is open, Escape closes it and puts focus back on the button.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpenOn(null)
      menuButton.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const menuHidden = compact && !menuOpen

  return (
    <>
      <a href="#main" className="skip-link">
        {t('app.skipToContent')}
      </a>
      <header className={compact ? 'site-header compact' : 'site-header'}>
        <div className="header-inner">
          <Link to="/" className="brand">
            <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="currentColor" />
              <path
                d="M8 22h16M8 22V12l8-4 8 4v10"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path d="M14 22v-5h4v5" fill="none" stroke="#fff" strokeWidth="2.5" />
            </svg>
            Barrierefri
          </Link>

          {compact && (
            <button
              ref={menuButton}
              type="button"
              className="menu-button"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setOpenOn(menuOpen ? null : location.pathname)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                {menuOpen ? (
                  <path d="M4 4l12 12M16 4 4 16" stroke="currentColor" strokeWidth="2.2" />
                ) : (
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2.2" />
                )}
              </svg>
              {t('app.menu')}
            </button>
          )}

          {/* Right after the menu button, so it's next in tab order when open. */}
          <div id="site-menu" className="site-menu" hidden={menuHidden}>
            <nav aria-label={t('app.nav.label')}>
              <ul>
                <li>
                  <NavLink to="/" end>
                    {t('app.nav.map')}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/report">{t('app.nav.report')}</NavLink>
                </li>
                {user && (
                  <li>
                    <NavLink to="/mine">{t('app.nav.mine')}</NavLink>
                  </li>
                )}
                {isStaff && (
                  <li>
                    <NavLink to="/cases">{t('app.nav.cases')}</NavLink>
                  </li>
                )}
              </ul>
            </nav>

            <div className="account">
              {user ? (
                <>
                  <span className="signed-in">{t('app.signedInAs', { name: user.name })}</span>
                  <button type="button" className="button secondary" onClick={() => logout()}>
                    {t('app.signOut')}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="button secondary" onClick={() => register()}>
                    {t('app.createAccount')}
                  </button>
                  <button type="button" className="button" onClick={() => login()}>
                    {t('app.signIn')}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Always last and never inside the menu: the top-right corner at every width. */}
          <LanguageSwitcher />
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>
          {t('app.mapData')}{' '}
          <a href="https://www.openstreetmap.org/copyright">{t('app.osmContributors')}</a>.{' '}
          {t('app.footer')}
        </p>
      </footer>
    </>
  )
}
