import { FormattedMessage } from "react-intl";
import styles from "./apps-carousel.module.css";

type AppIcon = {
  name: string;
  slug: string;
};

const apps: AppIcon[] = [
  { name: "Notion", slug: "notion" },
  { name: "Discord", slug: "discord" },
  { name: "Chrome", slug: "googlechrome" },
  { name: "Figma", slug: "figma" },
  { name: "Slack", slug: "slack" },
  { name: "Obsidian", slug: "obsidian" },
  { name: "Gmail", slug: "gmail" },
  { name: "WhatsApp", slug: "whatsapp" },
];

export default function AppsCarousel() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.badge}>
          <FormattedMessage defaultMessage="Universal compatibility" />
        </span>
        <h2 className={styles.title}>
          <FormattedMessage defaultMessage="Your voice, any application." />
        </h2>
        <p className={styles.subtitle}>
          <FormattedMessage defaultMessage="Vocally operates at the system level — it injects text into whatever app is in focus. Browsers, editors, messengers, you name it." />
        </p>
      </div>
      <div className={styles.grid}>
        {apps.map((app) => (
          <div key={app.name} className={styles.card}>
            <img
              src={`https://cdn.simpleicons.org/${app.slug}`}
              alt={app.name}
              width={32}
              height={32}
              className={styles.iconImg}
              loading="lazy"
              decoding="async"
            />
            <span className={styles.name}>{app.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
