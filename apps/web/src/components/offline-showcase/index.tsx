import { FormattedMessage } from "react-intl";
import styles from "./offline-showcase.module.css";

function CloudIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#98989d"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

function LaptopIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" ry="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

export default function OfflineShowcase() {
  return (
    <section className={styles.section} id="offline">
      <div className={styles.header}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="Offline-first" />
        </span>
        <h2 className={styles.title}>
          <FormattedMessage defaultMessage="No Wi-Fi? No problem." />
        </h2>
        <p className={styles.subtitle}>
          <FormattedMessage defaultMessage="Conventional speech tools rely on remote servers. Vocally bundles the model locally, so dictation keeps working whether you're on a flight, in a basement, or off the grid entirely." />
        </p>
      </div>
      <div className={styles.card}>
        <div className={styles.row}>
          <CloudIcon />
          <span className={styles.rowLabel}>
            <FormattedMessage defaultMessage="Cloud dictation" />
          </span>
          <span className={styles.rowStatus}>
            <FormattedMessage defaultMessage="Internet required" />
          </span>
          <span className={`${styles.dot} ${styles.dotRed}`} />
        </div>
        <div className={styles.divider} />
        <div className={styles.row}>
          <LaptopIcon />
          <span className={styles.rowLabel}>Vocally</span>
          <span className={styles.rowStatus}>
            <FormattedMessage defaultMessage="Always available" />
          </span>
          <span className={`${styles.dot} ${styles.dotGreen}`} />
        </div>
      </div>
    </section>
  );
}
