import { FormattedMessage, useIntl } from "react-intl";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import styles from "./auth-confirmed.module.css";

function AuthConfirmedPage() {
  const intl = useIntl();

  return (
    <BaseLayout
      title={intl.formatMessage({
        defaultMessage: "Email Confirmed | Vocally",
      })}
      description={intl.formatMessage({
        defaultMessage:
          "Your email has been confirmed. You can now sign in to the Vocally app.",
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
            <FormattedMessage defaultMessage="Email Confirmed" />
          </h1>
          <p className={styles.subtitle}>
            <FormattedMessage defaultMessage="Your email has been verified successfully. You can now go back to the Vocally app and sign in." />
          </p>
          <div className={styles.hint}>
            <FormattedMessage defaultMessage="You can close this tab." />
          </div>
        </section>
      </PageLayout>
    </BaseLayout>
  );
}

export default AuthConfirmedPage;
