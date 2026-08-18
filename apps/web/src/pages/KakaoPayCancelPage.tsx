import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import pageStyles from "../styles/page.module.css";
import styles from "./auth-confirmed.module.css";

export default function KakaoPayCancelPage() {
  const intl = useIntl();
  return (
    <BaseLayout
      title={intl.formatMessage({
        defaultMessage: "Kakao Pay Payment Cancelled | Vocally",
      })}
      description={intl.formatMessage({
        defaultMessage: "Your Vocally payment was not completed.",
      })}
    >
      <PageLayout>
        <section className={styles.container}>
          <h1 className={styles.title}>
            <FormattedMessage defaultMessage="Payment not completed" />
          </h1>
          <p className={styles.subtitle}>
            <FormattedMessage defaultMessage="No payment was completed. You can try again whenever you are ready." />
          </p>
          <Link to="/pricing" className={pageStyles.primaryButton}>
            <FormattedMessage defaultMessage="Back to pricing" />
          </Link>
        </section>
      </PageLayout>
    </BaseLayout>
  );
}
