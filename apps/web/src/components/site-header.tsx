import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { detectLocale, setStoredLocale } from "../i18n";
import styles from "../styles/page.module.css";
import DownloadButton from "./download-button";
import SignInModal from "./sign-in-modal";

export function SiteHeader() {
  const intl = useIntl();
  const { user, openSignInModal, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [locale, setLocale] = useState(() => detectLocale());

  const handleLocaleToggle = () => {
    const next = locale === "ko" ? "en" : "ko";
    setStoredLocale(next);
    setLocale(next);
    window.location.reload();
  };

  const navLinks = [
    {
      href: "/#demo",
      label: intl.formatMessage({ defaultMessage: "Demo" }),
    },
    {
      href: "/#speed",
      label: intl.formatMessage({ defaultMessage: "Purpose" }),
    },
    {
      href: "/#privacy",
      label: intl.formatMessage({ defaultMessage: "Security" }),
    },
    {
      href: "/#pricing",
      label: intl.formatMessage({ defaultMessage: "Pricing" }),
    },
  ];

  return (
    <div className={styles.headerWrapper}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <img
            src="/vocally-logo.png"
            alt="Vocally"
            className={styles.headerLogo}
            draggable={false}
          />
        </Link>
        <nav
          className={styles.nav}
          aria-label={intl.formatMessage({
            defaultMessage: "Primary navigation",
          })}
        >
          {navLinks.map(({ href, label }) => (
            <Link key={href} to={href} className={styles.navLink}>
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <button
            onClick={handleLocaleToggle}
            className={styles.langToggle}
            aria-label={intl.formatMessage({
              defaultMessage: "Switch language",
            })}
          >
            {locale === "ko" ? "EN" : "한국어"}
          </button>
          {user ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={styles.langToggle}
                aria-label={intl.formatMessage({
                  defaultMessage: "User menu",
                })}
              >
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </button>
              {showUserMenu && (
                <div className={styles.userMenu}>
                  <div className={styles.userMenuEmail}>{user.email}</div>
                  <button
                    className={styles.userMenuItem}
                    onClick={() => {
                      signOut();
                      setShowUserMenu(false);
                    }}
                  >
                    <FormattedMessage defaultMessage="Sign out" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={openSignInModal} className={styles.langToggle}>
              <FormattedMessage defaultMessage="Sign in" />
            </button>
          )}
          <DownloadButton className={styles.headerCta} />
        </div>
        <button
          className={styles.mobileMenuButton}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={
            isMobileMenuOpen
              ? intl.formatMessage({ defaultMessage: "Close menu" })
              : intl.formatMessage({ defaultMessage: "Open menu" })
          }
        >
          <svg
            className={styles.mobileMenuIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </header>
      {isMobileMenuOpen && (
        <div className={styles.header} style={{ marginTop: "8px" }}>
          <nav className={styles.mobileNav}>
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                className={styles.mobileNavLink}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className={styles.mobileMenuActions}>
            <DownloadButton />
          </div>
        </div>
      )}
      <SignInModal />
    </div>
  );
}

export default SiteHeader;
