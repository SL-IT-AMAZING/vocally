import { FormattedMessage, useIntl } from "react-intl";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import { DownloadButton } from "../components/download-button";
import styles from "./auth-confirmed.module.css";

function CheckoutSuccessPage() {
  const intl = useIntl();

  return (
    <BaseLayout
      title={intl.formatMessage({
        defaultMessage: "Payment Successful | Vocally",
      })}
      description={intl.formatMessage({
        defaultMessage: "Your Vocally Pro subscription is now active.",
      })}
    >
      <PageLayout>
        <section className={styles.container}>
          <div className={styles.iconWrapper}>
            <svg
              className={styles.checkIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className={styles.title}>
            <FormattedMessage defaultMessage="Payment Successful" />
          </h1>
          <p className={styles.subtitle}>
            <FormattedMessage defaultMessage="Your Pro plan is now active. Download the app to get started." />
          </p>
          <DownloadButton trackingId="checkout-success-download" />
        </section>
      </PageLayout>
    </BaseLayout>
  );
}

export default CheckoutSuccessPage;
