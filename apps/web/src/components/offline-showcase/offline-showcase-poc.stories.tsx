import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { FormattedMessage } from "react-intl";

const s: Record<string, CSSProperties> = {
  section: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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
  card: {
    width: "100%",
    maxWidth: 600,
    background: "#1c1c1e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "8px 32px",
    display: "flex",
    flexDirection: "column",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "20px 0",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    width: "100%",
  },
  rowIcon: {
    width: 24,
    height: 24,
    flexShrink: 0,
  },
  rowLabel: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#f5f5f7",
    flex: 1,
  },
  rowStatus: {
    fontSize: "0.85rem",
    color: "#98989d",
    marginRight: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
};

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

function OfflineShowcasePOC() {
  return (
    <section style={s.section}>
      <div style={s.header}>
        <span style={s.badge}>
          <FormattedMessage defaultMessage="Offline-first" />
        </span>
        <h2 style={s.title}>
          <FormattedMessage defaultMessage="No Wi-Fi? No problem." />
        </h2>
        <p style={s.subtitle}>
          <FormattedMessage defaultMessage="Conventional speech tools rely on remote servers. Vocally bundles the model locally, so dictation keeps working whether you're on a flight, in a basement, or off the grid entirely." />
        </p>
      </div>
      <div style={s.card}>
        <div style={s.row}>
          <CloudIcon />
          <span style={s.rowLabel}>
            <FormattedMessage defaultMessage="Cloud dictation" />
          </span>
          <span style={s.rowStatus}>
            <FormattedMessage defaultMessage="Internet required" />
          </span>
          <span style={{ ...s.dot, background: "#ef4444" }} />
        </div>
        <div style={s.divider} />
        <div style={s.row}>
          <LaptopIcon />
          <span style={s.rowLabel}>Vocally</span>
          <span style={s.rowStatus}>
            <FormattedMessage defaultMessage="Always available" />
          </span>
          <span style={{ ...s.dot, background: "#22c55e" }} />
        </div>
      </div>
    </section>
  );
}

const meta: Meta = {
  title: "POC Redesign/Offline Showcase",
  component: OfflineShowcasePOC,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
