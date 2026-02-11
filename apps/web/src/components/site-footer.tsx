import { FormattedMessage, useIntl } from "react-intl";
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
          <a href="https://vocally-web.vercel.app/privacy">
            <FormattedMessage defaultMessage="Privacy Policy" />
          </a>
          <a href="https://vocally-web.vercel.app/terms">
            <FormattedMessage defaultMessage="Terms of Service" />
          </a>
          <a href="https://vocally-web.vercel.app/refund">
            <FormattedMessage defaultMessage="Refund Policy" />
          </a>
          <a href="mailto:support@vocally.so">
            <FormattedMessage defaultMessage="Contact" />
          </a>
        </div>
      </nav>
    </footer>
  );
}

export default SiteFooter;
