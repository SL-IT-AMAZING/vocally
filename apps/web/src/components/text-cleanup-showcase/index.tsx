import { FormattedMessage } from "react-intl";
import TextCleanupAnimation from "./text-cleanup-animation";
import styles from "./text-cleanup-showcase.module.css";

export default function TextCleanupShowcase() {
  return (
    <section className={styles.section} id="demo">
      <div className={styles.header}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="Intelligent editing" />
        </span>
        <h2 className={styles.title}>
          <FormattedMessage defaultMessage="Talk naturally. Get polished text." />
        </h2>
        <p className={styles.subtitle}>
          <FormattedMessage defaultMessage="Vocally's AI silently removes the verbal clutter — filler words, false starts, and misspellings vanish before the text reaches your document." />
        </p>
      </div>
      <div className={styles.animationWrap}>
        <TextCleanupAnimation />
      </div>
    </section>
  );
}
