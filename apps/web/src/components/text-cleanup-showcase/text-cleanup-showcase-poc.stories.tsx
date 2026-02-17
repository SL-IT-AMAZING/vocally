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
    alignItems: "center",
    textAlign: "center" as const,
    gap: 16,
    maxWidth: "60ch",
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
    maxWidth: 640,
    background: "#1c1c1e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  boxLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#98989d",
    marginBottom: 10,
  },
  beforeBox: {
    background: "#2c2c2e",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 20,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "1rem",
    lineHeight: 1.8,
    color: "#f5f5f7",
  },
  strikeRed: {
    textDecoration: "line-through",
    textDecorationColor: "#ef4444",
    textDecorationThickness: "2px",
    opacity: 0.5,
    color: "#98989d",
  },
  underlineOrange: {
    textDecoration: "underline wavy",
    textDecorationColor: "#f59e0b",
    textDecorationThickness: "2px",
    textUnderlineOffset: "4px",
  },
  arrowWrap: {
    display: "flex",
    justifyContent: "center",
    padding: "16px 0",
    color: "#98989d",
  },
  afterBox: {
    background: "#1c1c1e",
    border: "1px solid rgba(37,99,235,0.3)",
    borderRadius: 10,
    padding: 20,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "1rem",
    lineHeight: 1.8,
    color: "#f5f5f7",
    boxShadow: "0 0 20px rgba(37,99,235,0.08)",
  },
  greenHighlight: {
    color: "#22c55e",
    fontWeight: 500,
  },
  footerNote: {
    textAlign: "center" as const,
    fontSize: "0.9rem",
    color: "#98989d",
    maxWidth: "500px",
    margin: "0 auto",
  },
};

function ArrowDown() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function TextCleanupShowcasePOC() {
  return (
    <section style={s.section}>
      <div style={s.header}>
        <span style={s.badge}>
          <FormattedMessage defaultMessage="Intelligent editing" />
        </span>
        <h2 style={s.title}>
          <FormattedMessage defaultMessage="Talk naturally. Get polished text." />
        </h2>
        <p style={s.subtitle}>
          <FormattedMessage defaultMessage="Vocally's AI silently removes the verbal clutter — filler words, false starts, and misspellings vanish before the text reaches your document." />
        </p>
      </div>

      <div style={s.card}>
        <span style={s.boxLabel}>
          <FormattedMessage defaultMessage="Raw transcript" />
        </span>
        <div style={s.beforeBox}>
          <span style={s.strikeRed}>Let's... </span>Let's sync with{" "}
          <span style={s.strikeRed}>um, </span>
          Minji tomorrow morning at{" "}
          <span style={s.underlineOrange}>10a.m.</span> at the cafe.
        </div>

        <div style={s.arrowWrap}>
          <ArrowDown />
        </div>

        <span style={s.boxLabel}>
          <FormattedMessage defaultMessage="Cleaned output" />
        </span>
        <div style={s.afterBox}>
          Let's sync with Minji tomorrow morning at{" "}
          <span style={s.greenHighlight}>10am</span> at the cafe.
        </div>
      </div>

      <p style={s.footerNote}>
        <FormattedMessage defaultMessage="Corrections happen in real time — no manual review needed." />
      </p>
    </section>
  );
}

const meta: Meta = {
  title: "POC Redesign/Text Cleanup",
  component: TextCleanupShowcasePOC,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
