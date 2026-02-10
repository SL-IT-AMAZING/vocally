import { FormattedMessage } from "react-intl";
import DownloadButton from "./download-button";
import styles from "../styles/page.module.css";

export function SiteFooter() {
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
      <nav className={styles.pageMeta} aria-label="Legal">
        <span>© {currentYear} SL:IT</span>
        <div className={styles.pageLinks}>
          <a href="https://vocally-web.vercel.app/privacy">Privacy Policy</a>
          <a href="https://vocally-web.vercel.app/terms">Terms of Service</a>
          <a href="https://vocally-web.vercel.app/refund">Refund Policy</a>
          <a href="mailto:support@vocally.so">Contact</a>
        </div>
      </nav>
    </footer>
  );
}

export default SiteFooter;
