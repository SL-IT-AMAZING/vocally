import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { FormattedMessage } from "react-intl";

const s: Record<string, CSSProperties> = {
  wrap: {
    padding: "40px 24px",
    background: "#05070c",
    minHeight: 340,
  },
  shell: {
    width: "min(1120px, 100%)",
    margin: "0 auto",
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.22)",
    background:
      "radial-gradient(circle at 84% 16%, rgba(14,165,233,0.16), transparent 44%), linear-gradient(180deg, rgba(17,24,39,0.96), rgba(11,18,32,0.98))",
    boxShadow: "0 20px 56px rgba(2,6,23,0.5)",
    padding: "42px 34px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  title: {
    margin: 0,
    fontSize: "clamp(1.8rem,3vw,2.4rem)",
    lineHeight: 1.1,
    letterSpacing: "-0.025em",
    color: "#f8fafc",
    maxWidth: 560,
  },
  cta: {
    alignSelf: "flex-start",
    border: "1px solid rgba(14,165,233,0.48)",
    borderRadius: 12,
    padding: "12px 18px",
    color: "#fff",
    background: "linear-gradient(90deg, #0284c7, #0ea5e9)",
    fontSize: "0.92rem",
    fontWeight: 700,
  },
  meta: {
    marginTop: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    color: "#94a3b8",
    fontSize: "0.85rem",
    flexWrap: "wrap",
  },
  links: { display: "flex", gap: 14, textDecoration: "underline" },
};

function SiteFooterPOC() {
  return (
    <div style={s.wrap}>
      <footer style={s.shell}>
        <h2 style={s.title}>
          <FormattedMessage defaultMessage="키보드 없이도, 필요한 문장을 바로 완성하세요." />
        </h2>
        <button style={s.cta}>
          <FormattedMessage defaultMessage="무료로 시작하기" />
        </button>
        <div style={s.meta}>
          <span>© 2026 주식회사 슬릿컴퍼니 (SL:IT)</span>
          <small>대표 전도현 · 사업자등록번호 882-81-03956</small>
          <div style={s.links}>
            <span>
              <FormattedMessage defaultMessage="개인정보" />
            </span>
            <span>
              <FormattedMessage defaultMessage="이용약관" />
            </span>
            <span>
              <FormattedMessage defaultMessage="환불정책" />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const meta: Meta = {
  title: "POC Redesign/Site Footer",
  component: SiteFooterPOC,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
