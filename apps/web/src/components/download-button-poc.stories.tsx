import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { FormattedMessage } from "react-intl";

const s: Record<string, CSSProperties> = {
  wrap: {
    minHeight: 220,
    background: "#05070c",
    padding: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: "12px 18px",
    fontWeight: 700,
    fontSize: "0.92rem",
    border: "1px solid rgba(148,163,184,0.3)",
  },
  primary: {
    background: "linear-gradient(90deg, #0284c7, #0ea5e9)",
    color: "#fff",
    border: "1px solid rgba(14,165,233,0.55)",
    boxShadow: "0 12px 30px rgba(2,132,199,0.34)",
  },
  ghost: {
    background: "rgba(17,24,39,0.85)",
    color: "#dbeafe",
  },
  disabled: {
    opacity: 0.6,
    background: "rgba(15,23,42,0.82)",
    color: "#94a3b8",
  },
  icon: {
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "rgba(255,255,255,0.22)",
    display: "inline-block",
  },
};

function DownloadButtonPOC() {
  return (
    <div style={s.wrap}>
      <button style={{ ...s.base, ...s.primary }}>
        <span style={s.icon} />
        <FormattedMessage defaultMessage="mac 무료 다운로드" />
      </button>
      <button style={{ ...s.base, ...s.ghost }}>
        <span style={s.icon} />
        <FormattedMessage defaultMessage="윈도우 다운로드" />
      </button>
      <button style={{ ...s.base, ...s.disabled }} disabled>
        <FormattedMessage defaultMessage="iOS/Android 곧 지원" />
      </button>
    </div>
  );
}

const meta: Meta = {
  title: "POC Redesign/Download Button",
  component: DownloadButtonPOC,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
