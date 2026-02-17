import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";
import DownloadButton from "./download-button";
import styles from "../styles/page.module.css";

export function SiteFooter() {
  const intl = useIntl();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} id="cta">
      <div className={styles.footerInner}>
        <h2>
          <FormattedMessage defaultMessage="Ready to stop typing?" />
        </h2>
        <div className={styles.footerActions}>
          <DownloadButton />
        </div>
      </div>
      <nav
        className={styles.pageMeta}
        aria-label={intl.formatMessage({ defaultMessage: "Legal" })}
      >
        <span>© {currentYear} SL:IT</span>
        <div className={styles.pageLinks}>
          <Link to="/privacy">
            <FormattedMessage defaultMessage="Privacy Policy" />
          </Link>
          <Link to="/terms">
            <FormattedMessage defaultMessage="Terms of Service" />
          </Link>
          <Link to="/refund">
            <FormattedMessage defaultMessage="Refund Policy" />
          </Link>
          <a href="mailto:slit.amazing@gmail.com">
            <FormattedMessage defaultMessage="Contact" />
          </a>
        </div>
      </nav>
    </footer>
  );
}

export default SiteFooter;
