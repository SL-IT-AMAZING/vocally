import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { FormattedMessage, useIntl } from "react-intl";

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
    textAlign: "center" as const,
    gap: 16,
    maxWidth: 600,
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
    fontSize: "clamp(2rem, 3.5vw, 2.8rem)",
    lineHeight: 1.15,
    letterSpacing: "-0.03em",
    color: "#f5f5f7",
    margin: 0,
  },
  subtitle: {
    fontSize: "1.05rem",
    lineHeight: 1.7,
    color: "#98989d",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 24,
    width: "100%",
    justifyContent: "center",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    padding: 32,
    background: "#000",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    transition: "border-color 0.2s",
    gap: 0,
  },
  cardPopular: {
    borderColor: "rgba(37,99,235,0.4)",
    boxShadow: "0 0 20px rgba(37,99,235,0.1), 0 1px 3px rgba(0,0,0,0.3)",
  },
  planRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  planName: {
    fontSize: "1.25rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#f5f5f7",
    margin: 0,
  },
  bestValue: {
    display: "inline-flex",
    padding: "2px 8px",
    borderRadius: 4,
    background: "#2563eb",
    color: "#fff",
    fontSize: "0.65rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
  planDesc: {
    fontSize: "0.9rem",
    lineHeight: 1.5,
    color: "#98989d",
    margin: "0 0 20px",
  },
  price: {
    fontSize: "2.5rem",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    color: "#f5f5f7",
    lineHeight: 1,
  },
  pricePeriod: {
    fontSize: "1rem",
    fontWeight: 400,
    color: "#98989d",
    marginLeft: 4,
  },
  billingNote: {
    fontSize: "0.85rem",
    color: "#98989d",
    marginTop: 4,
    marginBottom: 24,
  },
  btnOutline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 24px",
    borderRadius: 10,
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    background: "transparent",
    color: "#f5f5f7",
    border: "1px solid rgba(255,255,255,0.08)",
    transition: "background 0.2s, border-color 0.2s",
  },
  btnFilled: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 24px",
    borderRadius: 10,
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    transition: "background 0.2s",
  },
  featuresTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#98989d",
    marginTop: 24,
    marginBottom: 16,
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: "0.9rem",
    lineHeight: 1.5,
    color: "#98989d",
  },
  checkIcon: {
    flexShrink: 0,
    width: 18,
    height: 18,
    color: "#3b82f6",
  },
  deemphasized: {
    opacity: 0.5,
  },
  trust: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: "0.9rem",
    color: "#98989d",
  },
  trustStrong: {
    color: "#f5f5f7",
    fontWeight: 600,
  },
};

function CheckIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg
      style={{ ...s.checkIcon, ...style }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4ade80"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function PricingSectionPOC() {
  const [checkoutError, setCheckoutError] = useState(false);
  const intl = useIntl();

  const personalFeatures = [
    intl.formatMessage({ defaultMessage: "Voice-to-text dictation" }),
    intl.formatMessage({ defaultMessage: "Use your own API key" }),
    intl.formatMessage({ defaultMessage: "Full offline mode" }),
    intl.formatMessage({ defaultMessage: "Auto-correction" }),
    intl.formatMessage({ defaultMessage: "Community forum access" }),
  ];

  const proFeatures = [
    {
      text: intl.formatMessage({ defaultMessage: "Everything in Personal" }),
      deemphasized: true,
    },
    {
      text: intl.formatMessage({
        defaultMessage: "Hosted transcription via Groq",
      }),
    },
    { text: intl.formatMessage({ defaultMessage: "Sync across devices" }) },
    { text: intl.formatMessage({ defaultMessage: "No monthly word cap" }) },
    { text: intl.formatMessage({ defaultMessage: "Direct support channel" }) },
  ];

  return (
    <section style={s.section}>
      <div style={s.header}>
        <span style={s.badge}>
          <FormattedMessage defaultMessage="Plans" />
        </span>
        <h2 style={s.title}>
          <FormattedMessage defaultMessage="Free to start. Upgrade when you're ready." />
        </h2>
        <p style={s.subtitle}>
          <FormattedMessage defaultMessage="The core experience is free forever — local dictation, AI cleanup, offline mode. Go Pro for cloud-powered transcription and cross-device sync." />
        </p>
      </div>

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.planRow}>
            <h3 style={s.planName}>
              <FormattedMessage defaultMessage="Personal" />
            </h3>
          </div>
          <p style={s.planDesc}>
            <FormattedMessage defaultMessage="Local-first dictation for everyday use." />
          </p>
          <span style={s.price}>
            <FormattedMessage defaultMessage="Free" />
          </span>
          <span style={s.billingNote}>
            <FormattedMessage defaultMessage="No credit card needed" />
          </span>
          <button
            type="button"
            style={s.btnOutline}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1c1c1e";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            <FormattedMessage defaultMessage="Get started" />
          </button>
          <p style={s.featuresTitle}>
            <FormattedMessage defaultMessage="Includes" />
          </p>
          <ul style={s.featureList}>
            {personalFeatures.map((f) => (
              <li key={f} style={s.featureItem}>
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={s.card}>
          <div style={s.planRow}>
            <h3 style={s.planName}>
              <FormattedMessage defaultMessage="Pro Monthly" />
            </h3>
          </div>
          <p style={s.planDesc}>
            <FormattedMessage defaultMessage="Cloud transcription, unlimited words, priority support." />
          </p>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={s.price}>₩7,000</span>
            <span style={s.pricePeriod}>
              <FormattedMessage defaultMessage="/ month" />
            </span>
          </div>
          <span style={s.billingNote}>
            <FormattedMessage defaultMessage="Billed each month" />
          </span>
          <button
            type="button"
            style={s.btnFilled}
            onClick={() => setCheckoutError((visible) => !visible)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#3b82f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2563eb";
            }}
          >
            <FormattedMessage defaultMessage="Upgrade to Pro" />
          </button>
          {checkoutError && (
            <p style={{ color: "#fca5a5", fontSize: "0.8rem", lineHeight: 1.4, margin: "10px 0 0" }}>
              <FormattedMessage defaultMessage="Checkout preparation failed. Please try again." />
            </p>
          )}
          <p style={s.featuresTitle}>
            <FormattedMessage defaultMessage="Includes" />
          </p>
          <ul style={s.featureList}>
            {proFeatures.map((f) => {
              const text = typeof f === "string" ? f : f.text;
              const deemphasized = typeof f === "object" && f.deemphasized;
              return (
                <li
                  key={text}
                  style={{
                    ...s.featureItem,
                    ...(deemphasized ? s.deemphasized : {}),
                  }}
                >
                  <CheckIcon
                    style={deemphasized ? { color: "#98989d" } : undefined}
                  />
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div style={{ ...s.card, ...s.cardPopular }}>
          <div style={s.planRow}>
            <h3 style={s.planName}>
              <FormattedMessage defaultMessage="Pro Annual" />
            </h3>
            <span style={s.bestValue}>
              <FormattedMessage defaultMessage="BEST VALUE" />
            </span>
          </div>
          <p style={s.planDesc}>
            <FormattedMessage defaultMessage="Cloud transcription, unlimited words, priority support." />
          </p>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={s.price}>₩70,000</span>
            <span style={s.pricePeriod}>
              <FormattedMessage defaultMessage="/ year" />
            </span>
          </div>
          <span style={s.billingNote}>
            <FormattedMessage defaultMessage="Billed once a year" />
          </span>
          <button
            type="button"
            style={s.btnFilled}
            onClick={() => setCheckoutError((visible) => !visible)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#3b82f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2563eb";
            }}
          >
            <FormattedMessage defaultMessage="Upgrade to Pro" />
          </button>
          {checkoutError && (
            <p style={{ color: "#fca5a5", fontSize: "0.8rem", lineHeight: 1.4, margin: "10px 0 0" }}>
              <FormattedMessage defaultMessage="Checkout preparation failed. Please try again." />
            </p>
          )}
          <p style={s.featuresTitle}>
            <FormattedMessage defaultMessage="Includes" />
          </p>
          <ul style={s.featureList}>
            {proFeatures.map((f) => {
              const text = typeof f === "string" ? f : f.text;
              const deemphasized = typeof f === "object" && f.deemphasized;
              return (
                <li
                  key={text}
                  style={{
                    ...s.featureItem,
                    ...(deemphasized ? s.deemphasized : {}),
                  }}
                >
                  <CheckIcon
                    style={deemphasized ? { color: "#98989d" } : undefined}
                  />
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div style={s.trust}>
        <ShieldIcon />
        <span>
          <span style={s.trustStrong}>
            <FormattedMessage defaultMessage="Transparent pricing" />
          </span>
          {" · "}
          <FormattedMessage defaultMessage="Cancel anytime" />
        </span>
      </div>
    </section>
  );
}

const meta: Meta = {
  title: "POC Redesign/Pricing",
  component: PricingSectionPOC,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
