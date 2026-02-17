import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { FormattedMessage } from "react-intl";

const s: Record<string, CSSProperties> = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 48,
    padding: "80px 24px",
    maxWidth: 1120,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    maxWidth: "60ch",
  },
  badge: {
    alignSelf: "flex-start",
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
    fontSize: "clamp(1.8rem, 2.5vw, 2.2rem)",
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
    color: "#f5f5f7",
    margin: 0,
  },
  subtitle: {
    fontSize: "1.05rem",
    lineHeight: 1.75,
    color: "#98989d",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 28,
    background: "#1c1c1e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    transition: "transform 0.2s ease, border-color 0.2s ease",
    cursor: "default",
  },
  iconWrap: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#f5f5f7",
    margin: 0,
  },
  cardDesc: {
    fontSize: "0.9rem",
    lineHeight: 1.6,
    color: "#98989d",
    margin: 0,
  },
};

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

function PrivacyShowcasePOC() {
  const hoverIn = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
  };
  const hoverOut = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
  };

  return (
    <section style={s.section}>
      <div style={s.header}>
        <span style={s.badge}>
          <FormattedMessage defaultMessage="Built for privacy" />
        </span>
        <h2 style={s.title}>
          <FormattedMessage defaultMessage="Your words never leave your machine." />
        </h2>
        <p style={s.subtitle}>
          <FormattedMessage defaultMessage="Vocally processes speech locally by default. No cloud relay, no third-party listeners. Choose how much — or how little — you share." />
        </p>
      </div>
      <div style={s.grid}>
        <div style={s.card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
          <div style={s.iconWrap}>
            <LockIcon />
          </div>
          <h3 style={s.cardTitle}>
            <FormattedMessage defaultMessage="On-device inference" />
          </h3>
          <p style={s.cardDesc}>
            <FormattedMessage defaultMessage="Whisper runs directly on your CPU or GPU. Audio is transcribed and discarded — nothing is stored or sent." />
          </p>
        </div>

        <div style={s.card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
          <div style={s.iconWrap}>
            <KeyIcon />
          </div>
          <h3 style={s.cardTitle}>
            <FormattedMessage defaultMessage="Bring your own key" />
          </h3>
          <p style={s.cardDesc}>
            <FormattedMessage defaultMessage="Prefer hosted transcription? Use your own API credentials. Traffic goes straight from you to the provider — we never proxy it." />
          </p>
        </div>

        <div style={s.card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
          <div style={s.iconWrap}>
            <ShieldIcon />
          </div>
          <h3 style={s.cardTitle}>
            <FormattedMessage defaultMessage="No data collection" />
          </h3>
          <p style={s.cardDesc}>
            <FormattedMessage defaultMessage="We don't store transcripts, train on your data, or share anything with third parties. Your voice stays yours." />
          </p>
        </div>
      </div>
    </section>
  );
}

const meta: Meta = {
  title: "POC Redesign/Privacy Showcase",
  component: PrivacyShowcasePOC,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
