import { FormattedMessage } from "react-intl";
import styles from "./privacy-showcase.module.css";

function LockIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function PrivacyShowcase() {
  return (
    <section className={styles.section} id="privacy">
      <div className={styles.header}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="Built for privacy" />
        </span>
        <h2 className={styles.title}>
          <FormattedMessage defaultMessage="Your words never leave your machine." />
        </h2>
        <p className={styles.subtitle}>
          <FormattedMessage defaultMessage="Vocally processes speech locally by default. No cloud relay, no third-party listeners. Choose how much — or how little — you share." />
        </p>
      </div>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <LockIcon />
          </div>
          <h3 className={styles.cardTitle}>
            <FormattedMessage defaultMessage="On-device inference" />
          </h3>
          <p className={styles.cardDesc}>
            <FormattedMessage defaultMessage="Whisper runs directly on your CPU or GPU. Audio is transcribed and discarded — nothing is stored or sent." />
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <KeyIcon />
          </div>
          <h3 className={styles.cardTitle}>
            <FormattedMessage defaultMessage="Bring your own key" />
          </h3>
          <p className={styles.cardDesc}>
            <FormattedMessage defaultMessage="Prefer hosted transcription? Use your own API credentials. Traffic goes straight from you to the provider — we never proxy it." />
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <ShieldIcon />
          </div>
          <h3 className={styles.cardTitle}>
            <FormattedMessage defaultMessage="No data collection" />
          </h3>
          <p className={styles.cardDesc}>
            <FormattedMessage defaultMessage="We don't store transcripts, train on your data, or share anything with third parties. Your voice stays yours." />
          </p>
        </div>
      </div>
    </section>
  );
}
