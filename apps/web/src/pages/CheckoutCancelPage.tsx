import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import styles from "./auth-confirmed.module.css";
import pageStyles from "../styles/page.module.css";

function CheckoutCancelPage() {
  const intl = useIntl();

  return (
    <BaseLayout
      title={intl.formatMessage({
        defaultMessage: "Checkout Cancelled | Vocally",
      })}
      description={intl.formatMessage({
        defaultMessage: "Your checkout was cancelled. You can try again.",
      })}
    >
      <PageLayout>
        <section className={styles.container}>
          <h1 className={styles.title}>
            <FormattedMessage defaultMessage="Checkout Cancelled" />
          </h1>
          <p className={styles.subtitle}>
            <FormattedMessage defaultMessage="Your checkout was cancelled. No charges were made." />
          </p>
          <Link to="/pricing" className={pageStyles.primaryButton}>
            <FormattedMessage defaultMessage="Back to Pricing" />
          </Link>
        </section>
      </PageLayout>
    </BaseLayout>
  );
}

export default CheckoutCancelPage;
