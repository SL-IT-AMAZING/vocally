import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import BaseLayout from "../layouts/BaseLayout";
import PageLayout from "../layouts/PageLayout";
import pageStyles from "../styles/page.module.css";
import styles from "./auth-confirmed.module.css";

function TossBillingSuccessPage() {
  const intl = useIntl();
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    const orderId = params.get("orderId");
    const authKey = params.get("authKey");
    const customerKey = params.get("customerKey");
    if (!orderId || !authKey || !customerKey || !supabase) {
      setState("error");
      return;
    }

    let cancelled = false;
    void supabase.functions
      .invoke("toss-billing-issue", {
        body: { orderId, authKey, customerKey },
      })
      .then(({ error }) => {
        if (!cancelled) setState(error ? "error" : "success");
      });
    return () => {
      cancelled = true;
    };
  }, [params]);

  const title =
    state === "success"
      ? "Payment Successful"
      : state === "error"
        ? "Payment Failed"
        : "Confirming Payment";
  return (
    <BaseLayout
      title={intl.formatMessage({
        defaultMessage: "Vocally Pro Payment Status | Vocally",
      })}
      description={intl.formatMessage({
        defaultMessage: "Vocally Pro payment status.",
      })}
    >
      <PageLayout>
        <section className={styles.container}>
          <h1 className={styles.title}>{title}</h1>
          {state === "loading" && (
            <p className={styles.subtitle}>
              <FormattedMessage defaultMessage="Confirming your payment..." />
            </p>
          )}
          {state === "success" && (
            <>
              <p className={styles.subtitle}>
                <FormattedMessage defaultMessage="Your Pro plan is now active. Download the app to get started." />
              </p>
              <Link to="/download" className={pageStyles.primaryButton}>
                <FormattedMessage defaultMessage="Download Vocally" />
              </Link>
            </>
          )}
          {state === "error" && (
            <p className={styles.subtitle}>
              <FormattedMessage defaultMessage="We could not confirm this payment. Please contact slit.amazing@gmail.com." />
            </p>
          )}
        </section>
      </PageLayout>
    </BaseLayout>
  );
}

export default TossBillingSuccessPage;
