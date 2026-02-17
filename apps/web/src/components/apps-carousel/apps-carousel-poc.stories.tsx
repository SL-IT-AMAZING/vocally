import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { FormattedMessage } from "react-intl";

const apps = [
  { name: "Notion", slug: "notion" },
  { name: "Discord", slug: "discord" },
  { name: "Chrome", slug: "googlechrome" },
  { name: "Figma", slug: "figma" },
  { name: "Slack", slug: "slack" },
  { name: "Obsidian", slug: "obsidian" },
  { name: "Gmail", slug: "gmail" },
  { name: "WhatsApp", slug: "whatsapp" },
];

const s: Record<string, CSSProperties> = {
  section: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 48,
    padding: "80px 24px",
    maxWidth: 900,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 16,
  },
  badge: {
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#1c1c1e",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#f5f5f7",
  },
  title: {
    fontSize: "clamp(2rem, 3vw, 2.6rem)",
    lineHeight: 1.2,
    letterSpacing: "-0.025em",
    color: "#f5f5f7",
    margin: 0,
  },
  subtitle: {
    fontSize: "1.05rem",
    lineHeight: 1.75,
    color: "#98989d",
    maxWidth: "56ch",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    width: "100%",
    maxWidth: 560,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "20px 12px",
    background: "#1c1c1e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    cursor: "default",
    transition:
      "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
  },
  iconImg: {
    width: 32,
    height: 32,
    objectFit: "contain" as const,
    filter: "brightness(0) invert(1)",
    opacity: 0.75,
  },
  name: {
    fontSize: "0.75rem",
    color: "#98989d",
    fontWeight: 500,
  },
};

function AppsGridPOC() {
  return (
    <section style={s.section}>
      <div style={s.header}>
        <span style={s.badge}>
          <FormattedMessage defaultMessage="Universal compatibility" />
        </span>
        <h2 style={s.title}>
          <FormattedMessage defaultMessage="Your voice, any application." />
        </h2>
        <p style={s.subtitle}>
          <FormattedMessage defaultMessage="Vocally operates at the system level — it injects text into whatever app is in focus. Browsers, editors, messengers, you name it." />
        </p>
      </div>
      <div style={s.grid}>
        {apps.map((app) => (
          <div
            key={app.name}
            style={s.card}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = "translateY(-2px)";
              el.style.borderColor = "rgba(255,255,255,0.15)";
              el.style.boxShadow = "0 0 20px rgba(37,99,235,0.15)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.transform = "translateY(0)";
              el.style.borderColor = "rgba(255,255,255,0.08)";
              el.style.boxShadow = "none";
            }}
          >
            <img
              src={`https://cdn.simpleicons.org/${app.slug}`}
              alt={app.name}
              width={32}
              height={32}
              style={s.iconImg}
              loading="lazy"
              decoding="async"
            />
            <span style={s.name}>{app.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const meta: Meta = {
  title: "POC Redesign/Apps Grid",
  component: AppsGridPOC,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
