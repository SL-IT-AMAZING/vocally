import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
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
      <div className={styles.pageMeta}>
        <span>© {currentYear} SL:IT</span>
        <div className={styles.pageLinks}>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/refund">Refund Policy</Link>
          <a href="mailto:support@vocally.so">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
