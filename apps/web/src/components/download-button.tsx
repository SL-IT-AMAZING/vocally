import { useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { trackButtonClick } from "../utils/analytics.utils";
import {
  DEFAULT_PLATFORM,
  detectPlatform,
  isMobileDevice,
  PLATFORM_CONFIG,
  type Platform,
} from "../lib/downloads";
import styles from "../styles/page.module.css";

type DownloadButtonProps = {
  href?: string;
  className?: string;
  trackingId?: string;
  label?: string;
};

const BUTTON_ICON_SIZE = 20;
const COMPACT_LABEL_BREAKPOINT = 640;

export function DownloadButton({
  href,
  className,
  trackingId,
  label,
}: DownloadButtonProps) {
  const classes = [styles.primaryButton, className].filter(Boolean).join(" ");
  const [platform, setPlatform] = useState<Platform>(DEFAULT_PLATFORM);
  const [isCompact, setIsCompact] = useState(false);
  const { label: platformLabel, shortLabel, Icon } = PLATFORM_CONFIG[platform];
  const isMobile = useMemo(() => isMobileDevice(), []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateCompactState = () => {
      setIsCompact(window.innerWidth < COMPACT_LABEL_BREAKPOINT);
    };

    updateCompactState();
    window.addEventListener("resize", updateCompactState);

    return () => {
      window.removeEventListener("resize", updateCompactState);
    };
  }, []);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const buttonLabel = isMobile
    ? "iOS/Android coming soon"
    : isCompact
      ? shortLabel
      : platformLabel;

  if (isMobile) {
    return (
      <button type="button" className={classes} disabled>
        <FormattedMessage defaultMessage="iOS/Android coming soon" />
      </button>
    );
  }

  const handleClick = () => {
    if (trackingId) {
      trackButtonClick(trackingId);
    }
  };

  // When href is provided (e.g. download page's own button), use <a> tag
  if (href) {
    return (
      <a href={href} className={classes} onClick={handleClick}>
        <Icon className={styles.buttonIcon} size={BUTTON_ICON_SIZE} />
        <span>{label ?? buttonLabel}</span>
      </a>
    );
  }

  // Default: navigate to /download page
  return (
    <Link to="/download" className={classes} onClick={handleClick}>
      <Icon className={styles.buttonIcon} size={BUTTON_ICON_SIZE} />
      <span>{label ?? buttonLabel}</span>
    </Link>
  );
}

export default DownloadButton;
