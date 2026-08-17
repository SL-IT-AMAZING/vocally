import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";
import DownloadButton from "./download-button";
import styles from "../styles/page.module.css";

export function SiteFooter() {
  const intl = useIntl();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} id="cta">
      <div className={styles.footerInner}>
        <h2>
          <FormattedMessage defaultMessage="Your keyboard is optional." />
        </h2>
        <div className={styles.footerActions}>
          <DownloadButton />
        </div>
      </div>
      <nav
        className={styles.pageMeta}
        aria-label={intl.formatMessage({ defaultMessage: "Legal" })}
      >
        <div>
          <span>© {currentYear} 주식회사 슬릿컴퍼니 (SLIT)</span>
          <br />
          <small>
            대표 전도현 · 사업자등록번호 882-81-03956
            <br />
            서울특별시 성동구 왕십리로 222, 한양대학교
            한양종합기술연구원(히트관) 지하2층 비215호 데카콘 아이 5번
            테이블(사근동)(사근동, 한양대학교 한양종합기술연구원)
          </small>
        </div>
        <div className={styles.pageLinks}>
          <Link to="/privacy">
            <FormattedMessage defaultMessage="Privacy Policy" />
          </Link>
          <Link to="/terms">
            <FormattedMessage defaultMessage="Terms of Service" />
          </Link>
          <Link to="/refund">
            <FormattedMessage defaultMessage="Refund Policy" />
          </Link>
          <a href="mailto:slit.amazing@gmail.com">
            <FormattedMessage defaultMessage="Contact" />
          </a>
        </div>
      </nav>
    </footer>
  );
}

export default SiteFooter;
