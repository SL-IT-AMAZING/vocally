import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { DownloadButton } from "../download-button";
import styles from "./speed-showcase.module.css";

function AnimatedNumber({
  target,
  duration = 1500,
}: {
  target: number;
  duration?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return <>{value}</>;
}

function KeyboardIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#98989d"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
export default function SpeedShowcase() {
  return (
    <section className={styles.speedShowcase} id="speed">
      <div className={styles.sectionIntro}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="4× faster" />
        </span>
        <h2>
          <FormattedMessage defaultMessage="Think it. Say it. Done." />
        </h2>
        <p>
          <FormattedMessage defaultMessage="Average typing speed: 45 words per minute. Average speaking speed: 150+. Vocally bridges the gap — you talk, it types, nothing gets lost." />
        </p>
        <DownloadButton />
      </div>
      <div className={styles.compareCard}>
        <article className={styles.metricRow}>
          <div className={styles.metricHead}>
            <div className={styles.metricGroup}>
              <KeyboardIcon />
              <span className={styles.metricValueMuted}>
                <AnimatedNumber target={45} />
              </span>
            </div>
            <span className={styles.metricLabel}>
              <FormattedMessage defaultMessage="Keyboard wpm" />
            </span>
          </div>
          <div className={styles.metricTrack}>
            <div className={styles.metricFillKeyboard} />
          </div>
        </article>

        <article className={styles.metricRow}>
          <div className={styles.metricHead}>
            <div className={styles.metricGroup}>
              <MicIcon />
              <span className={styles.metricValueBrand}>
                <AnimatedNumber target={220} />
              </span>
            </div>
            <span className={styles.metricLabel}>
              <FormattedMessage defaultMessage="Vocally voice wpm" />
            </span>
          </div>
          <div className={styles.metricTrack}>
            <div className={styles.metricFillVoice} />
          </div>
        </article>

        <span className={styles.highlightText}>
          <FormattedMessage defaultMessage="Nearly 5x the throughput — just by talking" />
        </span>
      </div>
    </section>
  );
}
