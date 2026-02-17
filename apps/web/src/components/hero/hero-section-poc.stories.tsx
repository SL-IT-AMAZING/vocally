import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { FormattedMessage } from "react-intl";

const s: Record<string, CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 20% 20%, rgba(14,165,233,0.2), transparent 38%), radial-gradient(circle at 82% 22%, rgba(249,115,22,0.2), transparent 34%), #05070c",
    padding: "96px 24px",
  },
  card: {
    width: "min(980px, 100%)",
    borderRadius: 20,
    border: "1px solid rgba(148,163,184,0.22)",
    background:
      "linear-gradient(180deg, rgba(17,24,39,0.95), rgba(11,18,32,0.98))",
    boxShadow: "0 24px 70px rgba(2,6,23,0.55)",
    padding: "56px 48px",
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 28,
  },
  left: { display: "flex", flexDirection: "column", gap: 18 },
  badge: {
    alignSelf: "flex-start",
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid rgba(125,211,252,0.4)",
    color: "#bae6fd",
    fontSize: "0.76rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: "clamp(2.2rem,4vw,3.4rem)",
    lineHeight: 1.03,
    color: "#f6f8ff",
    letterSpacing: "-0.03em",
  },
  subtitle: {
    margin: 0,
    color: "#a7b0c2",
    fontSize: "1.05rem",
    lineHeight: 1.7,
    maxWidth: "58ch",
  },
  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  primary: {
    background: "linear-gradient(90deg, #0284c7, #0ea5e9)",
    color: "#fff",
    border: "1px solid rgba(14,165,233,0.5)",
    borderRadius: 12,
    padding: "12px 18px",
    fontWeight: 700,
  },
  ghost: {
    background: "transparent",
    color: "#dbeafe",
    border: "1px solid rgba(148,163,184,0.3)",
    borderRadius: 12,
    padding: "12px 18px",
    fontWeight: 600,
  },
  right: {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(7,11,20,0.92)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  kpi: {
    fontSize: "2.4rem",
    fontWeight: 800,
    color: "#7dd3fc",
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  kpiLabel: { color: "#94a3b8", fontSize: "0.84rem", letterSpacing: "0.06em" },
};

function HeroSectionPOC() {
  return (
    <section style={s.wrap}>
      <div style={s.card}>
        <div style={s.left}>
          <span style={s.badge}>
            <FormattedMessage defaultMessage="korean-first" />
          </span>
          <h1 style={s.title}>
            <FormattedMessage defaultMessage="타이핑 대신 말하기로 작업 속도를 올리세요." />
          </h1>
          <p style={s.subtitle}>
            <FormattedMessage defaultMessage="Vocally는 음성을 즉시 텍스트로 변환하고 문장을 정리합니다. 한국어 기본 환경에서 빠르게 시작하고, 영어에서는 영어 톤으로 동일하게 동작합니다." />
          </p>
          <div style={s.row}>
            <button style={s.primary}>
              <FormattedMessage defaultMessage="무료로 시작하기" />
            </button>
            <button style={s.ghost}>
              <FormattedMessage defaultMessage="플랫폼 보기" />
            </button>
          </div>
        </div>
        <div style={s.right}>
          <span style={s.kpi}>4x</span>
          <span style={s.kpiLabel}>
            <FormattedMessage defaultMessage="타이핑 대비 입력 속도" />
          </span>
          <span style={s.kpi}>220 wpm</span>
          <span style={s.kpiLabel}>
            <FormattedMessage defaultMessage="음성 입력 기준" />
          </span>
        </div>
      </div>
    </section>
  );
}

const meta: Meta = {
  title: "POC Redesign/Hero",
  component: HeroSectionPOC,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
