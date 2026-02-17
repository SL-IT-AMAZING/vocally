import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { FormattedMessage } from "react-intl";

const s: Record<string, CSSProperties> = {
  wrap: {
    minHeight: 180,
    padding: "24px",
    background:
      "radial-gradient(circle at 12% 10%, rgba(14,165,233,0.18), transparent 36%), #05070c",
  },
  bar: {
    width: "min(1120px, 100%)",
    margin: "0 auto",
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.24)",
    background:
      "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(11,18,32,0.96))",
    boxShadow: "0 14px 38px rgba(2,6,23,0.45)",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  brand: {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#f8fafc",
    letterSpacing: "0.02em",
  },
  nav: {
    display: "flex",
    gap: 16,
    marginLeft: 16,
    color: "#cbd5e1",
    fontSize: "0.9rem",
  },
  actions: { marginLeft: "auto", display: "flex", gap: 10 },
  chip: {
    border: "1px solid rgba(148,163,184,0.3)",
    borderRadius: 10,
    padding: "8px 12px",
    color: "#dbeafe",
    fontSize: "0.8rem",
    fontWeight: 700,
    background: "rgba(7,11,20,0.65)",
  },
  cta: {
    border: "1px solid rgba(14,165,233,0.48)",
    borderRadius: 10,
    padding: "8px 14px",
    color: "#fff",
    background: "linear-gradient(90deg, #0284c7, #0ea5e9)",
    fontSize: "0.82rem",
    fontWeight: 800,
  },
};

function SiteHeaderPOC() {
  return (
    <div style={s.wrap}>
      <header style={s.bar}>
        <span style={s.brand}>VOCALLY</span>
        <nav style={s.nav}>
          <span>
            <FormattedMessage defaultMessage="데모" />
          </span>
          <span>
            <FormattedMessage defaultMessage="속도" />
          </span>
          <span>
            <FormattedMessage defaultMessage="프라이버시" />
          </span>
          <span>
            <FormattedMessage defaultMessage="요금" />
          </span>
        </nav>
        <div style={s.actions}>
          <button style={s.chip}>EN</button>
          <button style={s.chip}>
            <FormattedMessage defaultMessage="로그인" />
          </button>
          <button style={s.cta}>
            <FormattedMessage defaultMessage="무료 다운로드" />
          </button>
        </div>
      </header>
    </div>
  );
}

const meta: Meta = {
  title: "POC Redesign/Site Header",
  component: SiteHeaderPOC,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
