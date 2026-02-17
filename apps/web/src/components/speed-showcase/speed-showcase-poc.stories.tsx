import { useEffect, useState } from "react";
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
    maxWidth: 980,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    maxWidth: "66ch",
    alignItems: "center",
    textAlign: "center",
  },
  badge: {
    alignSelf: "center",
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#1c1c1e",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#f5f5f7",
  },
  title: {
    fontSize: "clamp(2.2rem, 3.2vw, 3rem)",
    lineHeight: 1.15,
    letterSpacing: "-0.03em",
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
    maxWidth: 860,
    background:
      "linear-gradient(160deg, rgba(28,28,30,0.95), rgba(10,10,12,0.96))",
    border: "1px solid rgba(96,165,250,0.2)",
    borderRadius: 14,
    padding: 40,
    display: "flex",
    flexDirection: "column",
    gap: 28,
    boxShadow: "0 18px 48px rgba(0,0,0,0.34)",
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    width: "100%",
  },
  statCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  statNumber: {
    fontSize: "4rem",
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: "-0.03em",
    fontVariantNumeric: "tabular-nums",
  },
  statLabel: {
    fontSize: "0.8rem",
    color: "#98989d",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
  dividerText: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#98989d",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
  laneTrack: {
    height: 8,
    width: "100%",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  laneFillSlow: {
    height: "100%",
    borderRadius: 999,
    width: "18%",
    background: "linear-gradient(90deg, #6b7280, #9ca3af)",
  },
  laneFillFast: {
    height: "100%",
    borderRadius: 999,
    width: "88%",
    background: "linear-gradient(90deg, #2563eb, #60a5fa)",
    boxShadow: "0 0 24px rgba(37,99,235,0.35)",
  },
  highlight: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#60a5fa",
    textAlign: "left" as const,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: 18,
  },
  metricGroup: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
};

function AnimatedNumber({
  target,
  duration = 1500,
}: {
  target: number;
  duration?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return <>{value}</>;
}

function KeyboardIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#98989d"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SpeedShowcasePOC() {
  return (
    <section style={s.section}>
      <div style={s.header}>
        <span style={s.badge}>
          <FormattedMessage defaultMessage="속도 비교" />
        </span>
        <h2 style={s.title}>
          <FormattedMessage defaultMessage="생각 속도를 손가락에 맞추지 마세요." />
        </h2>
        <p style={s.subtitle}>
          <FormattedMessage defaultMessage="이미지 카드 없이 핵심 수치만 보여주는 버전입니다. 타이핑은 평균 45wpm, 음성 입력은 220wpm까지 올라가며 말한 내용을 바로 문장으로 정리합니다." />
        </p>
      </div>

      <div style={s.card}>
        <div style={s.statsRow}>
          <div style={s.statCol}>
            <div style={s.metricGroup}>
              <KeyboardIcon />
              <span style={{ ...s.statNumber, color: "#98989d" }}>
                <AnimatedNumber target={45} />
              </span>
            </div>
            <span style={s.statLabel}>
              <FormattedMessage defaultMessage="keyboard wpm" />
            </span>
            <div style={s.laneTrack}>
              <div style={s.laneFillSlow} />
            </div>
          </div>

          <span style={s.dividerText}>
            <FormattedMessage defaultMessage="vs" />
          </span>

          <div style={s.statCol}>
            <div style={s.metricGroup}>
              <MicIcon />
              <span
                style={{
                  ...s.statNumber,
                  color: "#2563eb",
                  textShadow: "0 0 40px rgba(37,99,235,0.3)",
                }}
              >
                <AnimatedNumber target={220} />
              </span>
            </div>
            <span style={s.statLabel}>
              <FormattedMessage defaultMessage="vocally voice wpm" />
            </span>
            <div style={s.laneTrack}>
              <div style={s.laneFillFast} />
            </div>
          </div>
        </div>

        <span style={s.highlight}>
          <FormattedMessage defaultMessage="이미지 요소를 제거하고 데이터 중심으로 단순화: 말하면 거의 5배 빠르게 입력됩니다." />
        </span>
      </div>
    </section>
  );
}

const meta: Meta = {
  title: "POC Redesign/Speed Showcase",
  component: SpeedShowcasePOC,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
