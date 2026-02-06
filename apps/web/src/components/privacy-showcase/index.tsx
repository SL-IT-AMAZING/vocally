import { FormattedMessage } from "react-intl";
import PrivacyLock from "../privacy-lock";
import styles from "../../styles/page.module.css";

export default function PrivacyShowcase() {
  return (
    <section className={styles.splitSection} id="privacy">
      <div className={styles.splitContent}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="Private and secure" />
        </span>
        <h2>
          <FormattedMessage defaultMessage="Your data is yours. Period." />
        </h2>
        <p>
          <FormattedMessage defaultMessage="Process everything locally on your device, bring your own API key, or connect to our cloud. Your voice data stays private." />
        </p>
      </div>
      <div className={`${styles.splitMedia} ${styles.privacyMedia}`}>
        <PrivacyLock />
      </div>
    </section>
  );
}
