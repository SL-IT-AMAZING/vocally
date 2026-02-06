import { FormattedMessage } from "react-intl";
import styles from "./video-section.module.css";

export default function VideoSection() {
  return (
    <section className={styles.videoSection}>
      <h2 className={styles.heading}>
        <FormattedMessage defaultMessage="What is Vocally?" />
      </h2>
      <div className={styles.videoWrapper}>
        <iframe
          className={styles.videoFrame}
          src="https://www.youtube.com/embed/LOiiocR1xTQ"
          title="Vocally Demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}
